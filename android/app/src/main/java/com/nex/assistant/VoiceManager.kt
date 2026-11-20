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
import java.util.Locale

/**
 * Handles Android SpeechRecognizer (STT) and TextToSpeech (TTS) with male (Nex) / female (Nexi) tuning.
 */
class VoiceManager(private val ctx: Context) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    init {
        tts = TextToSpeech(ctx.applicationContext) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
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
            if (!SpeechRecognizer.isRecognitionAvailable(ctx)) {
                onError(if (lang == "en") "Speech recognition is not available on this device." else "Распознавание речи недоступно на устройстве.")
                return@post
            }
            val sr = SpeechRecognizer.createSpeechRecognizer(ctx)
            recognizer = sr
            sr.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onError(error: Int) {
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
                    val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull().orEmpty().trim()
                    if (text.isNotEmpty()) onResult(text)
                    else onError(if (lang == "en") "Empty speech result" else "Пустой результат")
                }
                override fun onPartialResults(partialResults: Bundle?) {
                    val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull().orEmpty().trim()
                    if (text.isNotEmpty()) onPartial(text)
                }
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
            val localeTag = if (lang == "en") "en-US" else "ru-RU"
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            }
            sr.startListening(intent)
        }
    }

    fun stopListening() {
        mainHandler.post { stopListeningInternal() }
    }

    private fun stopListeningInternal() {
        runCatching { recognizer?.stopListening() }
        runCatching { recognizer?.destroy() }
        recognizer = null
    }

    fun speak(text: String, lang: String, voiceMode: String, speed: Float) {
        if (!ttsReady || text.isBlank()) return
        val engine = tts ?: return
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
        val clean = text.replace(Regex("[#*_`]+"), " ").take(1500)
        engine.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "nex_${System.currentTimeMillis()}")
    }

    fun stopSpeaking() {
        runCatching { tts?.stop() }
    }
}
