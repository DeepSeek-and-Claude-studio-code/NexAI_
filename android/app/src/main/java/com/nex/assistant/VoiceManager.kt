package com.nex.assistant

import android.Manifest
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Base64
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale

/**
 * Dual-engine Android VoiceManager:
 * 1) STT: Uses system SpeechRecognizer first; if Google Speech Services rejects with
 *    ERROR_INSUFFICIENT_PERMISSIONS (9) / unavailable while OUR app holds RECORD_AUDIO,
 *    automatically falls back to direct in-app MediaRecorder + Gemini/Groq/OpenAI STT!
 * 2) TTS: Uses Android TextToSpeech (offline installed voices + MEDIA AudioAttributes);
 *    if system TTS is not ready or lacks the language, falls back to OpenAI/Gemini Neural TTS via MediaPlayer!
 */
class VoiceManager(private val ctx: Context) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var recognizer: SpeechRecognizer? = null
    private var mediaRecorder: MediaRecorder? = null
    private var mediaRecorderFile: File? = null
    private var mediaPollRunnable: Runnable? = null

    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var mediaPlayer: MediaPlayer? = null
    private var silenceTimer: Runnable? = null
    private var lastPartialText: String = ""
    private var deliveredResult: Boolean = false

    @Volatile
    private var onSpeakDoneCallback: (() -> Unit)? = null

    init {
        initTts()
    }

    private fun initTts() {
        runCatching { tts?.shutdown() }
        tts = TextToSpeech(ctx.applicationContext) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                runCatching {
                    tts?.setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                }
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) { fireSpeakDone() }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) { fireSpeakDone() }
                    override fun onError(utteranceId: String?, errorCode: Int) { fireSpeakDone() }
                })
            }
        }
    }

    private fun fireSpeakDone() {
        mainHandler.post {
            val cb = onSpeakDoneCallback
            onSpeakDoneCallback = null
            cb?.invoke()
        }
    }

    fun isTtsReady(): Boolean = ttsReady

    fun startListening(
        lang: String,
        apiKeys: Map<String, String> = emptyMap(),
        onPartial: (String) -> Unit,
        onResult: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        mainHandler.post {
            stopListeningInternal()
            lastPartialText = ""
            deliveredResult = false

            if (!Perms.has(ctx, Manifest.permission.RECORD_AUDIO)) {
                onError(if (lang == "en") "Microphone permission needed" else "Нет разрешения на микрофон")
                return@post
            }

            // If system SpeechRecognizer is unavailable, go straight to direct in-app recording + Cloud STT
            if (!SpeechRecognizer.isRecognitionAvailable(ctx)) {
                startDirectRecorderFallback(lang, apiKeys, onPartial, onResult, onError)
                return@post
            }

            val sr = runCatching { SpeechRecognizer.createSpeechRecognizer(ctx) }.getOrNull()
            if (sr == null) {
                startDirectRecorderFallback(lang, apiKeys, onPartial, onResult, onError)
                return@post
            }
            recognizer = sr

            fun deliverOnce(text: String) {
                if (deliveredResult) return
                deliveredResult = true
                cancelSilenceTimer()
                stopListeningInternal()
                onResult(text)
            }

            fun resetSilenceEndpointTimer() {
                cancelSilenceTimer()
                val r = Runnable {
                    val captured = lastPartialText.trim()
                    if (!deliveredResult && captured.isNotEmpty()) deliverOnce(captured)
                }
                silenceTimer = r
                mainHandler.postDelayed(r, 1500L)
            }

            sr.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}

                override fun onError(error: Int) {
                    if (deliveredResult) return
                    val captured = lastPartialText.trim()
                    if (captured.isNotEmpty() && (error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT || error == SpeechRecognizer.ERROR_NO_MATCH)) {
                        deliverOnce(captured)
                        return
                    }
                    cancelSilenceTimer()
                    stopSpeechRecognizerOnly()

                    // CRITICAL FIX: Android SpeechRecognizer often returns ERROR_INSUFFICIENT_PERMISSIONS (9)
                    // when Google App lacks mic access even though OUR app has RECORD_AUDIO.
                    // Seamlessly switch to direct in-app MediaRecorder + Gemini/Groq/OpenAI STT!
                    val canCloudStt = !apiKeys["Gemini"].isNullOrBlank() || !apiKeys["Groq"].isNullOrBlank() || !apiKeys["OpenAI"].isNullOrBlank()
                    val isSystemServiceFailure = error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ||
                        error == SpeechRecognizer.ERROR_CLIENT ||
                        error == SpeechRecognizer.ERROR_AUDIO ||
                        error == SpeechRecognizer.ERROR_SERVER ||
                        error == SpeechRecognizer.ERROR_NETWORK

                    if (isSystemServiceFailure && canCloudStt) {
                        onPartial(if (lang == "en") "Recording via Nex Mic…" else "Запись через микрофон Некса…")
                        startDirectRecorderFallback(lang, apiKeys, onPartial, onResult, onError)
                        return
                    }

                    val msg = when (error) {
                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                            if (lang == "en") "System speech service blocked mic. Add a Gemini/Groq/OpenAI key for built-in voice or grant mic to Google App."
                            else "Системный сервис речи Google заблокировал микрофон. Добавь ключ Gemini/Groq/OpenAI для встроенного распознавания или дай микрофон приложению Google."
                        SpeechRecognizer.ERROR_AUDIO -> "Audio error"
                        SpeechRecognizer.ERROR_NO_MATCH -> if (lang == "en") "Didn't catch that" else "Речь не распознана"
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> if (lang == "en") "No speech detected" else "Ничего не услышал"
                        else -> "Speech error ($error)"
                    }
                    onError(msg)
                }

                override fun onResults(results: Bundle?) {
                    if (deliveredResult) return
                    val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull().orEmpty().trim()
                        .ifEmpty { lastPartialText.trim() }
                    if (text.isNotEmpty()) deliverOnce(text)
                    else {
                        cancelSilenceTimer()
                        stopListeningInternal()
                        onError(if (lang == "en") "Empty speech result" else "Пустой результат")
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    if (deliveredResult) return
                    val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull().orEmpty().trim()
                    if (text.isNotEmpty()) {
                        lastPartialText = text
                        onPartial(text)
                        resetSilenceEndpointTimer()
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            val localeTag = if (lang == "en") "en-US" else "ru-RU"
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, ctx.packageName)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1400L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1100L)
            }
            runCatching { sr.startListening(intent) }.onFailure {
                stopSpeechRecognizerOnly()
                startDirectRecorderFallback(lang, apiKeys, onPartial, onResult, onError)
            }
        }
    }

    private fun startDirectRecorderFallback(
        lang: String,
        apiKeys: Map<String, String>,
        onPartial: (String) -> Unit,
        onResult: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val hasKey = !apiKeys["Gemini"].isNullOrBlank() || !apiKeys["Groq"].isNullOrBlank() || !apiKeys["OpenAI"].isNullOrBlank()
        if (!hasKey) {
            onError(if (lang == "en") "Add a Gemini, Groq, or OpenAI key in Settings -> AI for built-in voice input." else "Добавь ключ Gemini, Groq или OpenAI в Настройках → ИИ для встроенного голосового ввода.")
            return
        }

        val outFile = File(ctx.cacheDir, "nex_voice_${System.currentTimeMillis()}.m4a")
        mediaRecorderFile = outFile
        val mr = try {
            if (Build.VERSION.SDK_INT >= 31) MediaRecorder(ctx) else @Suppress("DEPRECATION") MediaRecorder()
        } catch (e: Exception) {
            onError("Mic init error: ${e.message}")
            return
        }

        try {
            mr.setAudioSource(MediaRecorder.AudioSource.MIC)
            mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            mr.setAudioSamplingRate(16000)
            mr.setAudioEncodingBitRate(48000)
            mr.setOutputFile(outFile.absolutePath)
            mr.prepare()
            mr.start()
            mediaRecorder = mr
        } catch (e: Exception) {
            runCatching { mr.release() }
            runCatching { outFile.delete() }
            onError("Mic record error: ${e.message}")
            return
        }

        val startedAt = System.currentTimeMillis()
        var lastLoudAt = startedAt
        var heardSpeech = false

        val poll = object : Runnable {
            override fun run() {
                val activeMr = mediaRecorder ?: return
                val now = System.currentTimeMillis()
                val amp = runCatching { activeMr.maxAmplitude }.getOrDefault(0)
                if (amp > 1400) {
                    lastLoudAt = now
                    if (now - startedAt > 250L) heardSpeech = true
                }
                val elapsed = now - startedAt
                val silence = now - lastLoudAt

                val shouldFinish = (heardSpeech && elapsed > 1000L && silence > 1450L) ||
                    (!heardSpeech && elapsed > 6500L) ||
                    elapsed > 15000L

                if (shouldFinish) {
                    finishDirectRecording(lang, apiKeys, onPartial, onResult, onError)
                } else {
                    mainHandler.postDelayed(this, 120L)
                }
            }
        }
        mediaPollRunnable = poll
        mainHandler.postDelayed(poll, 160L)
    }

    private fun finishDirectRecording(
        lang: String,
        apiKeys: Map<String, String>,
        onPartial: (String) -> Unit,
        onResult: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        mediaPollRunnable?.let { mainHandler.removeCallbacks(it) }
        mediaPollRunnable = null
        val mr = mediaRecorder
        mediaRecorder = null
        runCatching { mr?.stop() }
        runCatching { mr?.release() }

        val file = mediaRecorderFile
        mediaRecorderFile = null
        if (file == null || !file.exists() || file.length() < 800L) {
            runCatching { file?.delete() }
            onError(if (lang == "en") "No speech detected" else "Ничего не услышал")
            return
        }

        onPartial(if (lang == "en") "Recognizing…" else "Распознаю речь…")
        ioScope.launch {
            val bytes = runCatching { file.readBytes() }.getOrNull()
            runCatching { file.delete() }
            val text = if (bytes != null) transcribeCloudAudio(bytes, "audio/mp4", lang, apiKeys) else null
            withContext(Dispatchers.Main) {
                if (!text.isNullOrBlank()) onResult(text)
                else onError(if (lang == "en") "Could not recognize speech" else "Речь не распознана")
            }
        }
    }

    private fun transcribeCloudAudio(audioBytes: ByteArray, mimeType: String, lang: String, apiKeys: Map<String, String>): String? {
        val geminiKey = apiKeys["Gemini"].orEmpty().trim()
        if (geminiKey.isNotEmpty()) {
            val b64 = Base64.encodeToString(audioBytes, Base64.NO_WRAP)
            val langName = if (lang == "en") "English" else "Russian"
            val prompt = "Transcribe this $langName voice request verbatim. Return ONLY the spoken words, no quotes or commentary. If silent, return empty string."
            val body = JSONObject().put(
                "contents", JSONArray().put(
                    JSONObject().put("role", "user").put(
                        "parts", JSONArray()
                            .put(JSONObject().put("inlineData", JSONObject().put("mimeType", mimeType).put("data", b64)))
                            .put(JSONObject().put("text", prompt))
                    )
                )
            ).put("generationConfig", JSONObject().put("maxOutputTokens", 512).put("temperature", 0))

            for (model in listOf("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash")) {
                val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent"
                val res = runCatching { LlmClient.postRaw(url, mapOf("x-goog-api-key" to geminiKey), body.toString(), 30000) }.getOrNull()
                if (res != null && res.ok) {
                    val parts = runCatching { JSONObject(res.body).getJSONArray("candidates").getJSONObject(0).getJSONObject("content").getJSONArray("parts") }.getOrNull()
                    if (parts != null) {
                        val sb = StringBuilder()
                        for (i in 0 until parts.length()) {
                            val p = parts.getJSONObject(i)
                            if (!p.optBoolean("thought", false) && p.has("text")) sb.append(p.getString("text")).append(" ")
                        }
                        val out = sb.toString().trim().trim('"', '«', '»', '\'')
                        if (out.isNotEmpty()) return out
                    }
                }
            }
        }
        return null
    }

    fun stopListening() {
        mainHandler.post {
            deliveredResult = true
            cancelSilenceTimer()
            stopListeningInternal()
        }
    }

    private fun cancelSilenceTimer() {
        silenceTimer?.let { mainHandler.removeCallbacks(it) }
        silenceTimer = null
    }

    private fun stopSpeechRecognizerOnly() {
        runCatching { recognizer?.stopListening() }
        runCatching { recognizer?.destroy() }
        recognizer = null
    }

    private fun stopListeningInternal() {
        stopSpeechRecognizerOnly()
        mediaPollRunnable?.let { mainHandler.removeCallbacks(it) }
        mediaPollRunnable = null
        runCatching { mediaRecorder?.stop() }
        runCatching { mediaRecorder?.release() }
        mediaRecorder = null
        runCatching { mediaRecorderFile?.delete() }
        mediaRecorderFile = null
    }

    fun speak(
        text: String,
        lang: String,
        voiceMode: String,
        speed: Float,
        apiKeys: Map<String, String> = emptyMap(),
        onDone: (() -> Unit)? = null
    ): Boolean {
        val clean = cleanForSpeech(text, lang)
        if (clean.isBlank()) {
            onDone?.invoke()
            return false
        }
        stopSpeaking()
        onSpeakDoneCallback = onDone

        // Try Android System TTS first if ready and language is supported
        val engine = tts
        if (ttsReady && engine != null) {
            val locale = if (lang == "en") Locale.US else Locale.forLanguageTag("ru-RU")
            val avail = runCatching { engine.isLanguageAvailable(locale) }.getOrDefault(TextToSpeech.LANG_NOT_SUPPORTED)
            if (avail >= TextToSpeech.LANG_AVAILABLE) {
                engine.language = locale
                engine.setSpeechRate(speed.coerceIn(0.7f, 1.4f))
                engine.setPitch(when (voiceMode) { "f" -> 1.15f; "n" -> 1.0f; else -> 0.88f })
                runCatching {
                    val voices = engine.voices.orEmpty().filter {
                        it.locale.language == locale.language &&
                            !it.isNetworkConnectionRequired &&
                            !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
                    }
                    val preferred = when (voiceMode) {
                        "f" -> voices.firstOrNull { it.name.contains("female", true) || it.name.contains("sfg", true) || it.name.contains("dfc", true) }
                        "m" -> voices.firstOrNull { it.name.contains("male", true) || it.name.contains("sfb", true) || it.name.contains("dmb", true) }
                        else -> null
                    } ?: voices.firstOrNull()
                    if (preferred != null) engine.voice = preferred
                }
                val utteranceId = "nex_${System.currentTimeMillis()}"
                val res = runCatching { engine.speak(clean, TextToSpeech.QUEUE_FLUSH, null, utteranceId) }.getOrDefault(TextToSpeech.ERROR)
                if (res == TextToSpeech.SUCCESS) return true
            }
        } else {
            initTts()
        }

        // Fallback: Cloud Neural TTS (OpenAI TTS -> Gemini TTS) played through MediaPlayer!
        val hasCloudTts = !apiKeys["OpenAI"].isNullOrBlank() || !apiKeys["Gemini"].isNullOrBlank()
        if (hasCloudTts) {
            ioScope.launch {
                val audioFile = synthesizeCloudTtsToFile(clean, voiceMode, speed, apiKeys)
                withContext(Dispatchers.Main) {
                    if (audioFile != null) playAudioFile(audioFile)
                    else fireSpeakDone()
                }
            }
            return true
        }

        fireSpeakDone()
        return false
    }

    private fun synthesizeCloudTtsToFile(text: String, voiceMode: String, speed: Float, apiKeys: Map<String, String>): File? {
        val openaiKey = apiKeys["OpenAI"].orEmpty().trim()
        if (openaiKey.isNotEmpty()) {
            val vName = when (voiceMode) { "f" -> "nova"; "n" -> "alloy"; else -> "onyx" }
            val body = JSONObject().put("model", "tts-1").put("voice", vName).put("input", text).put("response_format", "mp3").put("speed", speed.coerceIn(0.7f, 1.4f))
            val bytes = postBinary("https://api.openai.com/v1/audio/speech", mapOf("Authorization" to "Bearer $openaiKey"), body.toString())
            if (bytes != null && bytes.size > 200) {
                val f = File(ctx.cacheDir, "nex_tts_${System.currentTimeMillis()}.mp3")
                f.writeBytes(bytes)
                return f
            }
        }
        val geminiKey = apiKeys["Gemini"].orEmpty().trim()
        if (geminiKey.isNotEmpty()) {
            val vName = when (voiceMode) { "f" -> "Aoede"; "n" -> "Puck"; else -> "Charon" }
            val body = JSONObject()
                .put("contents", JSONArray().put(JSONObject().put("role", "user").put("parts", JSONArray().put(JSONObject().put("text", text)))))
                .put(
                    "generationConfig", JSONObject()
                        .put("responseModalities", JSONArray().put("AUDIO"))
                        .put("speechConfig", JSONObject().put("voiceConfig", JSONObject().put("prebuiltVoiceConfig", JSONObject().put("voiceName", vName))))
                )
            val res = runCatching {
                LlmClient.postRaw("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent", mapOf("x-goog-api-key" to geminiKey), body.toString(), 20000)
            }.getOrNull()
            if (res != null && res.ok) {
                val parts = runCatching { JSONObject(res.body).getJSONArray("candidates").getJSONObject(0).getJSONObject("content").getJSONArray("parts") }.getOrNull()
                if (parts != null) {
                    for (i in 0 until parts.length()) {
                        val inline = parts.getJSONObject(i).optJSONObject("inlineData") ?: continue
                        val b64 = inline.optString("data")
                        if (b64.isNotBlank()) {
                            val raw = Base64.decode(b64, Base64.DEFAULT)
                            val mime = inline.optString("mimeType", "audio/L16;rate=24000")
                            val rate = Regex("""rate=(\d+)""").find(mime)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 24000
                            val wav = pcm16ToWav(raw, rate)
                            val f = File(ctx.cacheDir, "nex_tts_${System.currentTimeMillis()}.wav")
                            f.writeBytes(wav)
                            return f
                        }
                    }
                }
            }
        }
        return null
    }

    private fun postBinary(url: String, headers: Map<String, String>, jsonBody: String): ByteArray? {
        return runCatching {
            val conn = URI.create(url).toURL().openConnection() as HttpURLConnection
            try {
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 20000
                conn.setRequestProperty("Content-Type", "application/json")
                headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
                conn.outputStream.use { it.write(jsonBody.toByteArray(Charsets.UTF_8)) }
                if (conn.responseCode in 200..299) conn.inputStream.use { it.readBytes() } else null
            } finally {
                conn.disconnect()
            }
        }.getOrNull()
    }

    private fun pcm16ToWav(pcm: ByteArray, sampleRate: Int): ByteArray {
        val out = ByteArrayOutputStream(44 + pcm.size)
        val hdr = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
        hdr.put("RIFF".toByteArray(Charsets.US_ASCII))
        hdr.putInt(36 + pcm.size)
        hdr.put("WAVE".toByteArray(Charsets.US_ASCII))
        hdr.put("fmt ".toByteArray(Charsets.US_ASCII))
        hdr.putInt(16)
        hdr.putShort(1)
        hdr.putShort(1)
        hdr.putInt(sampleRate)
        hdr.putInt(sampleRate * 2)
        hdr.putShort(2)
        hdr.putShort(16)
        hdr.put("data".toByteArray(Charsets.US_ASCII))
        hdr.putInt(pcm.size)
        out.write(hdr.array())
        out.write(pcm)
        return out.toByteArray()
    }

    private fun playAudioFile(file: File) {
        stopMediaPlayerOnly()
        val mp = MediaPlayer()
        mediaPlayer = mp
        try {
            mp.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            mp.setDataSource(file.absolutePath)
            mp.setOnCompletionListener {
                stopMediaPlayerOnly()
                runCatching { file.delete() }
                fireSpeakDone()
            }
            mp.setOnErrorListener { _, _, _ ->
                stopMediaPlayerOnly()
                runCatching { file.delete() }
                fireSpeakDone()
                true
            }
            mp.prepare()
            mp.start()
        } catch (_: Exception) {
            stopMediaPlayerOnly()
            runCatching { file.delete() }
            fireSpeakDone()
        }
    }

    private fun stopMediaPlayerOnly() {
        runCatching { mediaPlayer?.stop() }
        runCatching { mediaPlayer?.release() }
        mediaPlayer = null
    }

    fun stopSpeaking() {
        onSpeakDoneCallback = null
        runCatching { tts?.stop() }
        stopMediaPlayerOnly()
    }

    private fun cleanForSpeech(raw: String, lang: String): String {
        val noCode = raw.replace(Regex("""```[\s\S]*?```"""), if (lang == "en") " (code in chat). " else " (код в чате). ")
        val noLinks = noCode.replace(Regex("""\[([^\]]+)]\(https?://[^)]+\)"""), "$1")
            .replace(Regex("""https?://\S+"""), "")
        return noLinks.replace(Regex("""[#*_`~>|⚡]+"""), " ")
            .replace(Regex("""\s+"""), " ")
            .trim()
            .take(1500)
    }
}
