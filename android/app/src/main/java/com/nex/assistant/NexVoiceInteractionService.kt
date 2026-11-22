package com.nex.assistant

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.service.voice.VoiceInteractionService
import android.service.voice.VoiceInteractionSession
import android.service.voice.VoiceInteractionSessionService
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

class NexVoiceInteractionService : VoiceInteractionService()

class NexVoiceInteractionSessionService : VoiceInteractionSessionService() {
    override fun onNewSession(args: Bundle?): VoiceInteractionSession = NexVoiceSession(this)
}

class NexVoiceSession(private val ctx: Context) : VoiceInteractionSession(ctx) {
    override fun onShow(args: Bundle?, showFlags: Int) {
        super.onShow(args, showFlags)
        val intent = Intent(ctx, AssistActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        runCatching { ctx.startActivity(intent) }
        hide()
    }
}

/**
 * Overlay voice assistant sheet triggered by system Assist / Voice Command / Default Assistant.
 */
class AssistActivity : ComponentActivity() {
    companion object {
        const val EXTRA_ALREADY_LISTENING = "already_listening"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val ctrl = (application as NexApp).controller
        val alreadyListening = intent?.getBooleanExtra(EXTRA_ALREADY_LISTENING, false) == true
        setContent {
            NexTheme {
                var input by remember { mutableStateOf("") }
                val pending = SafetyGuard.activeConfirmation

                LaunchedEffect(Unit) {
                    if (!alreadyListening && !ctrl.isBusy && !ctrl.isListening) {
                        ctrl.startVoiceInput(fromAssistOverlay = true)
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.35f))
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() }
                        ) {
                            ctrl.stopVoiceInput()
                            SafetyGuard.cancelActive()
                            finish()
                        },
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(
                                indication = null,
                                interactionSource = remember { MutableInteractionSource() }
                            ) {}
                            .navigationBarsPadding()
                            .imePadding(),
                        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                        tonalElevation = 8.dp
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    ctrl.agentName,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                IconButton(onClick = {
                                    ctrl.stopVoiceInput()
                                    ctrl.stopSpeaking()
                                    SafetyGuard.cancelActive()
                                    finish()
                                }) {
                                    Icon(Icons.Default.Close, contentDescription = "Close")
                                }
                            }

                            NexSphere(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp)
                                    .clickable {
                                        if (ctrl.isListening) ctrl.stopVoiceInput()
                                        else ctrl.startVoiceInput(fromAssistOverlay = true)
                                    },
                                state = ctrl.sphereState,
                                female = ctrl.female
                            )

                            VoiceWaveIndicator(active = ctrl.sphereState == NexState.LISTENING || ctrl.sphereState == NexState.SPEAKING)

                            Spacer(Modifier.height(8.dp))
                            Text(
                                text = ctrl.statusLabel,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )

                            if (ctrl.assistTranscript.isNotBlank()) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    text = "“${ctrl.assistTranscript}”",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    textAlign = TextAlign.Center
                                )
                            }

                            if (ctrl.assistReply.isNotBlank()) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    text = ctrl.assistReply,
                                    style = MaterialTheme.typography.bodyMedium,
                                    textAlign = TextAlign.Center
                                )
                            }

                            if (pending != null) {
                                Spacer(Modifier.height(12.dp))
                                ConfirmationBanner(pending = pending, ctrl = ctrl)
                            }

                            Spacer(Modifier.height(12.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = input,
                                    onValueChange = { input = it },
                                    modifier = Modifier.weight(1f),
                                    placeholder = { Text(ctrl.t("write_placeholder")) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(24.dp)
                                )
                                if (input.isBlank()) {
                                    OutlinedButton(onClick = {
                                        if (ctrl.isListening) ctrl.stopVoiceInput()
                                        else ctrl.startVoiceInput(fromAssistOverlay = true)
                                    }) {
                                        Icon(NexIcons.MicWave, contentDescription = "Voice")
                                    }
                                } else {
                                    Button(onClick = {
                                        val q = input
                                        input = ""
                                        ctrl.sendUserMessage(q, fromAssistOverlay = true)
                                    }) {
                                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
