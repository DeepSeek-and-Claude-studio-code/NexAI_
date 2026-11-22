package com.nex.assistant

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

/**
 * Handles Android SpeechRecognizer (STT) with automatic silence endpointing
 * and TextToSpeech (TTS) with male (Nex) / female (Nexi) tuning + speaking lifecycle callbacks.
 */
class VoiceManager(private val ctx: Context) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var silenceTimer: Runnable? = null
    private var lastPartialText: String = ""
    private var deliveredResult: Boolean = false

    @Volatile
    private var onSpeakDoneCallback: (() -> Unit)? = null

    init {
        tts = TextToSpeech(ctx.applicationContext) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
                        mainHandler.post {
                            val cb = onSpeakDoneCallback
                            onSpeakDoneCallback = null
                            cb?.invoke()
                        }
                    }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        mainHandler.post {
                            val cb = onSpeakDoneCallback
                            onSpeakDoneCallback = null
                            cb?.invoke()
                        }
                    }
                    override fun onError(utteranceId: String?, errorCode: Int) {
                        mainHandler.post {
                            val cb = onSpeakDoneCallback
                            onSpeakDoneCallback = null
                            cb?.invoke()
                        }
                    }
                })
            }
        }
    }

    fun startListening(
        lang: String,
        onPartial: (String) -> Unit,
        onResult: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        mainHandler.post {
            stopListeningInternal()
            lastPartialText = ""
            deliveredResult = false

            if (!SpeechRecognizer.isRecognitionAvailable(ctx)) {
                onError(if (lang == "en") "Speech recognition is not available on this device." else "Распознавание речи недоступно на устройстве.")
                return@post
            }

            val sr = SpeechRecognizer.createSpeechRecognizer(ctx)
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
                    if (!deliveredResult && captured.isNotEmpty()) {
                        deliverOnce(captured)
                    }
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
                    stopListeningInternal()
                    val msg = when (error) {
                        SpeechRecognizer.ERROR_AUDIO -> "Audio error"
                        SpeechRecognizer.ERROR_NO_MATCH -> if (lang == "en") "Didn't catch that" else "Речь не распознана"
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> if (lang == "en") "No speech detected" else "Ничего не услышал"
                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> if (lang == "en") "Microphone permission needed" else "Нет разрешения на микрофон"
                        else -> "Speech error ($error)"
                    }
                    onError(msg)
                }

                override fun onResults(results: Bundle?) {
                    if (deliveredResult) return
                    val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull().orEmpty().trim()
                        .ifEmpty { lastPartialText.trim() }
                    if (text.isNotEmpty()) {
                        deliverOnce(text)
                    } else {
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
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1400L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1100L)
            }
            runCatching { sr.startListening(intent) }.onFailure { e ->
                stopListeningInternal()
                onError(e.message ?: "Speech error")
            }
        }
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

    private fun stopListeningInternal() {
        runCatching { recognizer?.stopListening() }
        runCatching { recognizer?.destroy() }
        recognizer = null
    }

    fun speak(
        text: String,
        lang: String,
        voiceMode: String,
        speed: Float,
        onDone: (() -> Unit)? = null
    ): Boolean {
        val clean = cleanForSpeech(text, lang)
        if (!ttsReady || clean.isBlank()) {
            onDone?.invoke()
            return false
        }
        val engine = tts ?: run {
            onDone?.invoke()
            return false
        }
        val locale = if (lang == "en") Locale.US else Locale.forLanguageTag("ru-RU")
        engine.language = locale
        engine.setSpeechRate(speed.coerceIn(0.7f, 1.4f))
        val pitch = when (voiceMode) {
            "f" -> 1.15f
            "n" -> 1.0f
            else -> 0.88f
        }
        engine.setPitch(pitch)
        runCatching {
            val voices = engine.voices.orEmpty().filter { it.locale.language == locale.language }
            val preferred = when (voiceMode) {
                "f" -> voices.firstOrNull { it.name.contains("female", true) || it.name.contains("sfg", true) || it.name.contains("dfc", true) }
                "m" -> voices.firstOrNull { it.name.contains("male", true) || it.name.contains("sfb", true) || it.name.contains("dmb", true) }
                else -> null
            }
            if (preferred != null) engine.voice = preferred
        }
        onSpeakDoneCallback = onDone
        val utteranceId = "nex_${System.currentTimeMillis()}"
        val res = engine.speak(clean, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
        if (res != TextToSpeech.SUCCESS) {
            onSpeakDoneCallback = null
            onDone?.invoke()
            return false
        }
        return true
    }

    fun stopSpeaking() {
        onSpeakDoneCallback = null
        runCatching { tts?.stop() }
    }

    private fun cleanForSpeech(raw: String, lang: String): String {
        val noCode = raw.replace(Regex("```[\\s\\S]*?```"), if (lang == "en") " (code in chat). " else " (код в чате). ")
        val noLinks = noCode.replace(Regex("\\[([^\\]]+)]\\(https?://[^)]+\\)"), "$1")
            .replace(Regex("https?://\\S+"), "")
        val plain = noLinks.replace(Regex("[#*_`~>|]+"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
        return plain.take(1500)
    }
}
