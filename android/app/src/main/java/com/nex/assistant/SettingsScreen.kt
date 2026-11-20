package com.nex.assistant

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun SettingsScreen(
    ctrl: NexController,
    onRequestPerms: (Array<String>) -> Unit
) {
    val ctx = LocalContext.current

    Column(Modifier.fillMaxSize()) {
        SubScreenTopBar(title = ctrl.t("settings"), onBack = { ctrl.goBack() })

        // 6 Settings tabs matching prototype
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val tabs = listOf(
                SettingsTab.AI to "tab_ai",
                SettingsTab.VOICE to "tab_voice",
                SettingsTab.MEMORY to "tab_memory",
                SettingsTab.ACCESS to "tab_access",
                SettingsTab.SAFETY to "tab_safety",
                SettingsTab.LANGUAGE to "tab_lang"
            )
            tabs.forEach { (tab, key) ->
                FilterChip(
                    selected = ctrl.settingsTab == tab,
                    onClick = { ctrl.settingsTab = tab },
                    label = { Text(ctrl.t(key)) }
                )
            }
        }
        HorizontalDivider()

        AnimatedContent(
            targetState = ctrl.settingsTab,
            transitionSpec = { fadeIn(tween(180)) togetherWith fadeOut(tween(120)) },
            modifier = Modifier.weight(1f),
            label = "settings_tab"
        ) { tab ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                when (tab) {
                    SettingsTab.AI -> AiSettingsTab(ctrl)
                    SettingsTab.VOICE -> VoiceSettingsTab(ctrl)
                    SettingsTab.MEMORY -> MemorySettingsTab(ctrl)
                    SettingsTab.ACCESS -> AccessSettingsTab(ctrl, ctx, onRequestPerms)
                    SettingsTab.SAFETY -> SafetySettingsTab(ctrl)
                    SettingsTab.LANGUAGE -> LanguageSettingsTab(ctrl)
                }
            }
        }
    }
}

@Composable
private fun AiSettingsTab(ctrl: NexController) {
    var refreshStatus by remember { mutableStateOf("") }

    Text(ctrl.t("keys_stored_local"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    LlmClient.PROVIDERS.forEach { provider ->
        OutlinedTextField(
            value = ctrl.apiKeys[provider].orEmpty(),
            onValueChange = { ctrl.updateApiKey(provider, it) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("$provider API Key") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true
        )
    }
    Text(ctrl.t("keys_hint"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    OutlinedButton(
        onClick = {
            refreshStatus = "…"
            ctrl.refreshModelsFromApis { refreshStatus = it }
        },
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(Icons.Default.Refresh, null)
        Spacer(Modifier.width(8.dp))
        Text(ctrl.t("refresh_models"))
    }
    if (refreshStatus.isNotEmpty()) {
        Text(refreshStatus, style = MaterialTheme.typography.bodySmall, color = NexOkColor)
    }
}

@Composable
private fun VoiceSettingsTab(ctrl: NexController) {
    val ctx = LocalContext.current
    Text(ctrl.t("voice_label"), fontWeight = FontWeight.SemiBold)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = ctrl.voice == "m", onClick = { ctrl.updateVoice("m") }, label = { Text(ctrl.t("male_nex")) })
        FilterChip(selected = ctrl.voice == "f", onClick = { ctrl.updateVoice("f") }, label = { Text(ctrl.t("female_nexi")) })
        FilterChip(selected = ctrl.voice == "n", onClick = { ctrl.updateVoice("n") }, label = { Text(ctrl.t("neutral_voice")) })
    }

    Text("${ctrl.t("speech_speed")}: ${"%.1f".format(ctrl.speechRate)}x")
    Slider(
        value = ctrl.speechRate,
        onValueChange = { ctrl.updateSpeechRate(it) },
        valueRange = 0.7f..1.4f
    )

    SettingSwitchRow(
        title = ctrl.t("auto_speak"),
        desc = ctrl.t("auto_speak_desc"),
        checked = ctrl.autoSpeak,
        onCheckedChange = { ctrl.updateAutoSpeak(it) }
    )

    SettingSwitchRow(
        title = ctrl.t("wake_word_title"),
        desc = ctrl.t("wake_word_desc"),
        checked = ctrl.wakeWordEnabled,
        onCheckedChange = { ctrl.updateWakeWordEnabled(it) }
    )

    HorizontalDivider()
    OutlinedButton(
        onClick = { Perms.openDefaultAssistantSettings(ctx) },
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(ctrl.t("default_assist_btn"))
    }
}

@Composable
private fun MemorySettingsTab(ctrl: NexController) {
    var newFact by remember { mutableStateOf("") }

    SettingSwitchRow(
        title = ctrl.t("remember_from_chats"),
        desc = ctrl.t("remember_desc"),
        checked = ctrl.memoryAutoSave,
        onCheckedChange = { ctrl.toggleMemoryAutoSave(it) }
    )
    HorizontalDivider()
    Text(
        if (ctrl.memories.isEmpty()) ctrl.t("memory_empty") else ctrl.t("saved_memories"),
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    ctrl.memories.forEachIndexed { idx, fact ->
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(fact, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
            IconButton(onClick = { ctrl.removeMemory(idx) }) {
                Icon(Icons.Default.Close, contentDescription = "Delete")
            }
        }
        HorizontalDivider()
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = newFact,
            onValueChange = { newFact = it },
            modifier = Modifier.weight(1f),
            placeholder = { Text(ctrl.t("add_memory_hint")) },
            singleLine = true
        )
        Button(onClick = {
            ctrl.addMemory(newFact)
            newFact = ""
        }) { Text(ctrl.t("add_btn")) }
    }
    if (ctrl.memories.isNotEmpty()) {
        TextButton(onClick = { ctrl.clearMemories() }) {
            Text(ctrl.t("clear_memory"), color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun AccessSettingsTab(
    ctrl: NexController,
    ctx: android.content.Context,
    onRequestPerms: (Array<String>) -> Unit
) {
    Text(ctrl.t("access_desc"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

    Perms.groups.forEach { g ->
        val ok = ctrl.permTick >= 0 && Perms.granted(ctx, g)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(g.title(ctrl.lang), fontWeight = FontWeight.SemiBold)
                Text(g.desc(ctrl.lang), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (ok) {
                Text(ctrl.t("allowed"), color = NexOkColor, fontWeight = FontWeight.SemiBold)
            } else {
                OutlinedButton(onClick = { onRequestPerms(g.perms.toTypedArray()) }) {
                    Text(ctrl.t("allow"))
                }
            }
        }
        HorizontalDivider()
    }

    Spacer(Modifier.height(4.dp))
    Text(ctrl.t("special_access"), fontWeight = FontWeight.Bold)

    val notifOk = ctrl.permTick >= 0 && Perms.isNotificationListenerEnabled(ctx)
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(ctrl.t("notif_access"), fontWeight = FontWeight.SemiBold)
            Text(ctrl.t("notif_access_desc"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        OutlinedButton(onClick = { Perms.openNotificationListenerSettings(ctx) }) {
            Text(if (notifOk) ctrl.t("allowed") else ctrl.t("open_settings"), color = if (notifOk) NexOkColor else MaterialTheme.colorScheme.primary)
        }
    }
    HorizontalDivider()

    val accOk = ctrl.permTick >= 0 && Perms.isAccessibilityEnabled(ctx)
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(ctrl.t("acc_access"), fontWeight = FontWeight.SemiBold)
            Text(ctrl.t("acc_access_desc"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        OutlinedButton(onClick = { Perms.openAccessibilitySettings(ctx) }) {
            Text(if (accOk) ctrl.t("allowed") else ctrl.t("open_settings"), color = if (accOk) NexOkColor else MaterialTheme.colorScheme.primary)
        }
    }
    HorizontalDivider()

    // Email (IMAP/SMTP or Gmail OAuth)
    Spacer(Modifier.height(4.dp))
    Text(ctrl.t("mail_section"), fontWeight = FontWeight.Bold)
    var cfg by remember(ctrl.mailConfig) { mutableStateOf(ctrl.mailConfig) }
    var mailStatus by remember { mutableStateOf("") }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = cfg.mode == "imap", onClick = { cfg = cfg.copy(mode = "imap") }, label = { Text("IMAP / SMTP") })
        FilterChip(selected = cfg.mode == "gmail_oauth", onClick = { cfg = cfg.copy(mode = "gmail_oauth") }, label = { Text("Gmail OAuth") })
    }

    if (cfg.mode == "imap") {
        OutlinedTextField(cfg.email, { cfg = cfg.copy(email = it) }, Modifier.fillMaxWidth(), label = { Text("Email") }, singleLine = true)
        OutlinedTextField(cfg.password, { cfg = cfg.copy(password = it) }, Modifier.fillMaxWidth(), label = { Text("App Password") }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(cfg.imapHost, { cfg = cfg.copy(imapHost = it) }, Modifier.weight(2f), label = { Text("IMAP host") }, singleLine = true)
            OutlinedTextField(cfg.imapPort.toString(), { cfg = cfg.copy(imapPort = it.toIntOrNull() ?: 993) }, Modifier.weight(1f), label = { Text("Port") }, singleLine = true)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(cfg.smtpHost, { cfg = cfg.copy(smtpHost = it) }, Modifier.weight(2f), label = { Text("SMTP host") }, singleLine = true)
            OutlinedTextField(cfg.smtpPort.toString(), { cfg = cfg.copy(smtpPort = it.toIntOrNull() ?: 465) }, Modifier.weight(1f), label = { Text("Port") }, singleLine = true)
        }
        SettingSwitchRow(
            title = "STARTTLS (port 587)",
            desc = "Enable if your SMTP server uses STARTTLS instead of SSL/TLS 465",
            checked = cfg.useStartTls,
            onCheckedChange = { cfg = cfg.copy(useStartTls = it) }
        )
    } else {
        OutlinedTextField(
            cfg.oauthAccessToken,
            { cfg = cfg.copy(oauthAccessToken = it) },
            Modifier.fillMaxWidth(),
            label = { Text("Gmail OAuth2 Access Token") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true
        )
        OutlinedTextField(
            cfg.oauthClientId,
            { cfg = cfg.copy(oauthClientId = it) },
            Modifier.fillMaxWidth(),
            label = { Text("OAuth Client ID (Google Cloud)") },
            singleLine = true
        )
        OutlinedButton(
            onClick = {
                val url = if (cfg.oauthClientId.isNotBlank()) {
                    "https://accounts.google.com/o/oauth2/v2/auth?client_id=${Uri.encode(cfg.oauthClientId.trim())}&response_type=token&redirect_uri=https://developers.google.com/oauthplayground&scope=${Uri.encode("https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send")}"
                } else {
                    "https://developers.google.com/oauthplayground/"
                }
                runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (ctrl.lang == "en") "Get Gmail OAuth Token in Browser" else "Получить токен Gmail OAuth в браузере")
        }
    }

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(
            onClick = {
                ctrl.updateMailConfig(cfg)
                mailStatus = if (ctrl.lang == "en") "Saved." else "Сохранено."
            },
            modifier = Modifier.weight(1f)
        ) { Text(ctrl.t("mail_save")) }
        OutlinedButton(
            onClick = {
                ctrl.updateMailConfig(cfg)
                mailStatus = "…"
                ctrl.testMailConnection { mailStatus = it }
            },
            modifier = Modifier.weight(1f)
        ) { Text(ctrl.t("mail_test")) }
    }
    if (mailStatus.isNotEmpty()) {
        Text(mailStatus, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SafetySettingsTab(ctrl: NexController) {
    // Hard-locked purchase confirmation (cannot be turned off)
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Lock, null, tint = NexWarnColor)
                Spacer(Modifier.width(6.dp))
                Text(ctrl.t("confirm_purchases"), fontWeight = FontWeight.Bold)
            }
            Text(
                ctrl.t("confirm_purchases_desc"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Switch(
            checked = SafetyGuard.ALWAYS_CONFIRM_PURCHASES,
            onCheckedChange = null,
            enabled = false
        )
    }
    HorizontalDivider()

    SettingSwitchRow(
        title = ctrl.t("confirm_actions"),
        desc = ctrl.t("confirm_actions_desc"),
        checked = ctrl.confirmSensitiveActions,
        onCheckedChange = { ctrl.toggleConfirmSensitive(it) }
    )
}

@Composable
private fun LanguageSettingsTab(ctrl: NexController) {
    Text(ctrl.t("interface_lang"), fontWeight = FontWeight.SemiBold)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = ctrl.lang == "ru", onClick = { ctrl.updateLang("ru") }, label = { Text("Русский") })
        FilterChip(selected = ctrl.lang == "en", onClick = { ctrl.updateLang("en") }, label = { Text("English") })
    }
    Spacer(Modifier.height(8.dp))
    OutlinedButton(onClick = { ctrl.screen = AppScreen.ONBOARDING }) {
        Text(ctrl.t("show_welcome_again"))
    }
}

@Composable
private fun SettingSwitchRow(
    title: String,
    desc: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
