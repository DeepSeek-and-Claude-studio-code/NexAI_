package com.nex.assistant

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat

/**
 * Background Foreground Service that continuously listens for the wake word
 * ("Некс" / "Некси" / "Nex" / "Nexi") using on-device SpeechRecognizer (prefer offline)
 * and triggers Nex voice command capture when heard.
 */
class NexWakeWordService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var running = false
    private var restartRunnable: Runnable? = null

    private val wakeRegex = Regex(
        pattern = "(?:^|[\\s,.!?])(некс[ауеи]?|нэкс[ауеи]?|nexi?|next)(?:[\\s,.!?]+(.*))?$",
        option = RegexOption.IGNORE_CASE
    )

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            (application as? NexApp)?.controller?.updateWakeWordEnabled(false)
            stopSelf()
            return START_NOT_STICKY
        }
        if (!Perms.has(this, Manifest.permission.RECORD_AUDIO)) {
            stopSelf()
            return START_NOT_STICKY
        }

        ensureChannel()
        val notif = buildNotification()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIF_ID, notif)
        }

        running = true
        scheduleListen(300L)
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        restartRunnable?.let { handler.removeCallbacks(it) }
        destroyRecognizer()
        super.onDestroy()
    }

    private fun scheduleListen(delayMs: Long) {
        if (!running) return
        restartRunnable?.let { handler.removeCallbacks(it) }
        val r = Runnable { startListeningCycle() }
        restartRunnable = r
        handler.postDelayed(r, delayMs)
    }

    private fun startListeningCycle() {
        if (!running) return
        val ctrl = (application as? NexApp)?.controller
        if (ctrl == null || !ctrl.wakeWordEnabled) {
            stopSelf()
            return
        }
        // Pause wake-word loop while user is actively talking or agent is busy
        if (ctrl.isBusy || ctrl.isListening) {
            scheduleListen(1500L)
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            scheduleListen(5000L)
            return
        }

        destroyRecognizer()
        val sr = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer = sr
        sr.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}

            override fun onError(error: Int) {
                val backoff = if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) 1200L else 600L
                scheduleListen(backoff)
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull().orEmpty().trim()
                if (text.isNotEmpty() && wakeRegex.containsMatchIn(text)) {
                    // Wait for final result so we capture any inline command spoken right after "Некс"
                }
            }

            override fun onResults(results: Bundle?) {
                val candidates = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
                val matched = candidates.firstNotNullOfOrNull { phrase ->
                    val m = wakeRegex.find(phrase.trim())
                    if (m != null) m.groupValues.getOrNull(2)?.trim().orEmpty() else null
                }

                if (matched != null) {
                    onWakeWordDetected(ctrl, matched)
                } else {
                    scheduleListen(350L)
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        val localeTag = if (ctrl.lang == "en") "en-US" else "ru-RU"
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 900L)
        }
        runCatching { sr.startListening(intent) }.onFailure { scheduleListen(1500L) }
    }

    private fun onWakeWordDetected(ctrl: NexController, inlineCommand: String) {
        destroyRecognizer()
        playChime()

        if (inlineCommand.isNotBlank()) {
            // User said e.g. "Некс, запиши встречу на 10 утра"
            ctrl.sendUserMessage(inlineCommand, fromAssistOverlay = true)
            launchAssistOverlay()
            scheduleListen(3000L)
        } else {
            // User said just "Некс" -> open overlay and actively listen for the request
            launchAssistOverlay()
            handler.postDelayed({
                ctrl.startVoiceInput(fromAssistOverlay = true)
            }, 300L)
            scheduleListen(3500L)
        }
    }

    private fun launchAssistOverlay() {
        val intent = Intent(this, AssistActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        runCatching { startActivity(intent) }
    }

    private fun playChime() {
        runCatching {
            val tg = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 70)
            tg.startTone(ToneGenerator.TONE_PROP_BEEP, 130)
            handler.postDelayed({ runCatching { tg.release() } }, 250L)
        }
    }

    private fun destroyRecognizer() {
        runCatching { recognizer?.stopListening() }
        runCatching { recognizer?.destroy() }
        recognizer = null
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val nm = getSystemService(NotificationManager::class.java) ?: return
            val ch = NotificationChannel(CHANNEL_ID, "Nex Wake Word", NotificationManager.IMPORTANCE_LOW)
            ch.setShowBadge(false)
            nm.createNotificationChannel(ch)
        }
    }

    private fun buildNotification(): Notification {
        val ctrl = (application as? NexApp)?.controller
        val isEn = ctrl?.lang == "en"
        val name = ctrl?.agentName ?: "Nex"
        val title = if (isEn) "$name is listening" else "$name слушает"
        val text = if (isEn) "Say \"$name\" to ask anything" else "Скажи «$name», чтобы дать задачу"

        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE
        )
        val stopIntent = PendingIntent.getService(
            this, 1,
            Intent(this, NexWakeWordService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(openIntent)
            .addAction(0, if (isEn) "Stop" else "Выключить", stopIntent)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "nex_wake_word_channel"
        private const val NOTIF_ID = 47801
        const val ACTION_STOP = "com.nex.assistant.STOP_WAKE_WORD"

        fun start(ctx: Context) {
            val intent = Intent(ctx, NexWakeWordService::class.java)
            if (Build.VERSION.SDK_INT >= 26) {
                runCatching { ctx.startForegroundService(intent) }
            } else {
                runCatching { ctx.startService(intent) }
            }
        }

        fun stop(ctx: Context) {
            runCatching { ctx.stopService(Intent(ctx, NexWakeWordService::class.java)) }
        }
    }
}
