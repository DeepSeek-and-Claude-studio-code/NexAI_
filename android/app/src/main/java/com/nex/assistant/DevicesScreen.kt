package com.nex.assistant

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.speech.SpeechRecognizer
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevicesScreen(ctrl: NexController, onRequestPerms: (Array<String>) -> Unit) {
    val ctx = LocalContext.current
    val isEn = ctrl.lang == "en"
    var activeCat by remember { mutableStateOf("all") }

    var pcHost by remember(ctrl.pairedPcHost) { mutableStateOf(ctrl.pairedPcHost) }
    var pcPort by remember(ctrl.pairedPcPort) { mutableStateOf(ctrl.pairedPcPort.toString()) }
    var pcToken by remember(ctrl.pairedPcToken) { mutableStateOf(ctrl.pairedPcToken) }
    var pcStatus by remember { mutableStateOf(ctrl.pairedPcStatus) }
    var clipStatus by remember { mutableStateOf("") }
    var remoteCmd by remember { mutableStateOf("") }
    var remoteReply by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }

    var newHubModel by remember { mutableStateOf("Nex Hub Ultra") }
    var newHubName by remember { mutableStateOf("") }
    var newHubSsid by remember { mutableStateOf("") }

    val eco = ctrl.ecosystemDevices
    val show: (String) -> Boolean = { cat -> activeCat == "all" || activeCat == cat }

    val micOk = ctrl.permTick >= 0 && Perms.has(ctx, Manifest.permission.RECORD_AUDIO)
    val speechAvail = SpeechRecognizer.isRecognitionAvailable(ctx)
    val ttsOk = ctrl.voiceManager.isTtsReady()
    val accOk = ctrl.permTick >= 0 && Perms.isAccessibilityEnabled(ctx)
    val notifOk = ctrl.permTick >= 0 && Perms.isNotificationListenerEnabled(ctx)

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(ctrl.t("devices")) },
            navigationIcon = { IconButton(onClick = { ctrl.goBack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } }
        )
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                "all" to (if (isEn) "All (5)" else "Все (5)"),
                "hubs" to (if (isEn) "HUBs" else "HUBы"),
                "clip" to (if (isEn) "AI Clip" else "Клипса"),
                "watch" to (if (isEn) "Watch" else "Часы"),
                "glasses" to (if (isEn) "AR Glasses" else "Очки"),
                "pc" to (if (isEn) "PC (Nex Core)" else "ПК (Nex Core)")
            ).forEach { (id, lbl) -> FilterChip(selected = activeCat == id, onClick = { activeCat = id }, label = { Text(lbl) }) }
        }

        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (show("hubs")) {
                Surface(shape = RoundedCornerShape(16.dp), tonalElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(if (isEn) "HUBs (Nex Hub / Nex Hub Ultra)" else "HUBы (Nex Hub / Nex Hub Ultra)", fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(selected = newHubModel == "Nex Hub Ultra", onClick = { newHubModel = "Nex Hub Ultra" }, label = { Text("Nex Hub Ultra") })
                            FilterChip(selected = newHubModel == "Nex Hub", onClick = { newHubModel = "Nex Hub" }, label = { Text("Nex Hub") })
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = newHubName, onValueChange = { newHubName = it }, modifier = Modifier.weight(1f), label = { Text(if (isEn) "Room" else "Комната") }, singleLine = true)
                            OutlinedTextField(value = newHubSsid, onValueChange = { newHubSsid = it }, modifier = Modifier.weight(1f), label = { Text("Wi-Fi SSID") }, singleLine = true)
                        }
                        Button(
                            onClick = {
                                val added = NexHubDevice(id = "hub_${System.currentTimeMillis()}", model = newHubModel, name = newHubName.ifBlank { newHubModel }, connected = true, wifiSsid = newHubSsid.trim(), activity = if (isEn) "Ready" else "Готов к работе", character = if (ctrl.voice == "f") "f" else "m", keysSyncedAt = System.currentTimeMillis())
                                ctrl.updateEcosystemDevices(eco.copy(hubs = listOf(added) + eco.hubs.filter { it.connected }))
                                newHubName = ""; newHubSsid = ""
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(if (isEn) "Pair Hub (Bluetooth → Wi-Fi)" else "Привязать HUB (Bluetooth → Wi-Fi)") }

                        eco.hubs.forEachIndexed { idx, hub ->
                            HorizontalDivider()
                            var intercomTxt by remember(hub.id) { mutableStateOf("") }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("🔊 ${hub.name}", fontWeight = FontWeight.SemiBold)
                                    Text("${hub.model} · ${hub.activity}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(if (hub.connected) "Wi-Fi" else (if (isEn) "Standby" else "Ожидает"), color = if (hub.connected) NexOkColor else MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(selected = hub.character == "m", onClick = { val l = eco.hubs.toMutableList(); l[idx] = hub.copy(character = "m"); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) }, label = { Text(if (isEn) "Nex" else "Некс") })
                                FilterChip(selected = hub.character == "f", onClick = { val l = eco.hubs.toMutableList(); l[idx] = hub.copy(character = "f"); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) }, label = { Text(if (isEn) "Nexi" else "Некси") })
                            }
                            Text(if (isEn) "Screen: ${hub.brightness}%" else "Яркость: ${hub.brightness}%", style = MaterialTheme.typography.bodySmall)
                            Slider(value = hub.brightness.toFloat(), valueRange = 0f..100f, onValueChange = { val l = eco.hubs.toMutableList(); l[idx] = hub.copy(brightness = it.toInt()); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) })
                            Text(if (isEn) "Volume: ${hub.volume}%" else "Громкость: ${hub.volume}%", style = MaterialTheme.typography.bodySmall)
                            Slider(value = hub.volume.toFloat(), valueRange = 0f..100f, onValueChange = { val l = eco.hubs.toMutableList(); l[idx] = hub.copy(volume = it.toInt()); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) })
                            ToggleDeviceRow(if (isEn) "Camera tracking" else "Слежение камеры", hub.cameraTracking) { v -> val l = eco.hubs.toMutableList(); l[idx] = hub.copy(cameraTracking = v); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) }
                            ToggleDeviceRow(if (isEn) "Night / DND" else "Ночной режим / Не беспокоить", hub.nightDnd) { v -> val l = eco.hubs.toMutableList(); l[idx] = hub.copy(nightDnd = v); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) }
                            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("Яндекс Музыка", "Spotify", "YouTube Music").forEach { srv ->
                                    FilterChip(selected = hub.audioService == srv, onClick = { val l = eco.hubs.toMutableList(); l[idx] = hub.copy(audioService = srv); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) }, label = { Text(srv) })
                                }
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                OutlinedTextField(value = intercomTxt, onValueChange = { intercomTxt = it }, modifier = Modifier.weight(1f), label = { Text(if (isEn) "Intercom…" else "Интерком…") }, singleLine = true)
                                OutlinedButton(onClick = { if (intercomTxt.isNotBlank()) { val l = eco.hubs.toMutableList(); l[idx] = hub.copy(lastIntercom = intercomTxt.trim(), activity = "Интерком: ${intercomTxt.trim().take(28)}"); ctrl.updateEcosystemDevices(eco.copy(hubs = l)); intercomTxt = "" } }) { Text("📢") }
                            }
                            OutlinedButton(onClick = { val l = eco.hubs.toMutableList(); l[idx] = hub.copy(keysSyncedAt = System.currentTimeMillis(), activity = if (isEn) "AI keys synced" else "Ключи ИИ синхронизированы"); ctrl.updateEcosystemDevices(eco.copy(hubs = l)) }, modifier = Modifier.fillMaxWidth()) {
                                Text(if (isEn) "Sync AI Keys to Hub" else "Синхронизировать ключи ИИ в HUB")
                            }
                        }
                    }
                }
            }

            if (show("clip")) {
                Surface(shape = RoundedCornerShape(16.dp), tonalElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("🎙 ${eco.clip.name}", fontWeight = FontWeight.Bold)
                        Text(if (isEn) "Battery ${eco.clip.battery}% · Memory ${eco.clip.freeStoragePct}%" else "Заряд ${eco.clip.battery}% · Память ${eco.clip.freeStoragePct}%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        ToggleDeviceRow(if (isEn) "Connected (Bluetooth)" else "Подключена (Bluetooth)", eco.clip.connected) { ctrl.updateEcosystemDevices(eco.copy(clip = eco.clip.copy(connected = it))) }
                        ToggleDeviceRow(if (isEn) "Continuous meeting notes" else "Постоянный конспект встреч", eco.clip.continuousNotes) { ctrl.updateEcosystemDevices(eco.copy(clip = eco.clip.copy(continuousNotes = it))) }
                        ToggleDeviceRow(if (isEn) "Privacy mute (mic/cam off)" else "Приватность (выкл. мик/камера)", eco.clip.privacyMute) { ctrl.updateEcosystemDevices(eco.copy(clip = eco.clip.copy(privacyMute = it))) }
                    }
                }
            }

            if (show("watch")) {
                Surface(shape = RoundedCornerShape(16.dp), tonalElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("⌚ ${eco.watch.name}", fontWeight = FontWeight.Bold)
                        Text(if (isEn) "Battery ${eco.watch.battery}% · Pulse ${eco.watch.lastPulse} · Sleep ${eco.watch.lastSleepHours}h" else "Заряд ${eco.watch.battery}% · Пульс ${eco.watch.lastPulse} · Сон ${eco.watch.lastSleepHours} ч", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        ToggleDeviceRow(if (isEn) "Connected (Bluetooth)" else "Подключены (Bluetooth)", eco.watch.connected) { ctrl.updateEcosystemDevices(eco.copy(watch = eco.watch.copy(connected = it))) }
                        ToggleDeviceRow(if (isEn) "Quick voice commands" else "Быстрые голосовые команды", eco.watch.quickVoice) { ctrl.updateEcosystemDevices(eco.copy(watch = eco.watch.copy(quickVoice = it))) }
                        ToggleDeviceRow(if (isEn) "Silent hints" else "Тихие подсказки", eco.watch.silentHints) { ctrl.updateEcosystemDevices(eco.copy(watch = eco.watch.copy(silentHints = it))) }
                        ToggleDeviceRow(if (isEn) "Health context (pulse/sleep)" else "Контекст здоровья", eco.watch.shareHealthContext) { ctrl.updateEcosystemDevices(eco.copy(watch = eco.watch.copy(shareHealthContext = it))) }
                        ToggleDeviceRow(if (isEn) "Hub & music remote" else "Пульт для хаба и музыки", eco.watch.hubMediaRemote) { ctrl.updateEcosystemDevices(eco.copy(watch = eco.watch.copy(hubMediaRemote = it))) }
                    }
                }
            }

            if (show("glasses")) {
                Surface(shape = RoundedCornerShape(16.dp), tonalElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("👓 ${eco.glasses.name}", fontWeight = FontWeight.Bold)
                        Text(if (isEn) "Battery ${eco.glasses.battery}% · HUD ${eco.glasses.hudBrightness}%" else "Заряд ${eco.glasses.battery}% · Яркость HUD ${eco.glasses.hudBrightness}%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Slider(value = eco.glasses.hudBrightness.toFloat(), valueRange = 10f..100f, onValueChange = { ctrl.updateEcosystemDevices(eco.copy(glasses = eco.glasses.copy(hudBrightness = it.toInt()))) })
                        ToggleDeviceRow(if (isEn) "Connected" else "Подключены", eco.glasses.connected) { ctrl.updateEcosystemDevices(eco.copy(glasses = eco.glasses.copy(connected = it))) }
                        ToggleDeviceRow(if (isEn) "Live subtitles & translation" else "Субтитры и синхронный перевод", eco.glasses.liveSubtitles) { ctrl.updateEcosystemDevices(eco.copy(glasses = eco.glasses.copy(liveSubtitles = it))) }
                        ToggleDeviceRow(if (isEn) "HUD cards & navigation" else "Карточки-подсказки и навигация", eco.glasses.navHints) { ctrl.updateEcosystemDevices(eco.copy(glasses = eco.glasses.copy(navHints = it))) }
                        OutlinedButton(onClick = { ctrl.navigate(AppScreen.CHAT); ctrl.askWithScreenVision() }, modifier = Modifier.fillMaxWidth()) {
                            Text(if (isEn) "👁 Ask \"What do I see?\"" else "👁 Спросить «Что я вижу?»")
                        }
                    }
                }
            }

            if (show("pc")) {
                Surface(shape = RoundedCornerShape(16.dp), tonalElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(if (isEn) "💻 PC (Nex Core / Fedora)" else "💻 ПК (Nex Core / Fedora)", fontWeight = FontWeight.Bold)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = pcHost, onValueChange = { pcHost = it }, modifier = Modifier.weight(2f), label = { Text("IP ПК") }, singleLine = true)
                            OutlinedTextField(value = pcPort, onValueChange = { pcPort = it.filter { ch -> ch.isDigit() } }, modifier = Modifier.weight(1f), label = { Text(if (isEn) "Port" else "Порт") }, singleLine = true)
                        }
                        OutlinedTextField(value = pcToken, onValueChange = { pcToken = it.uppercase() }, modifier = Modifier.fillMaxWidth(), label = { Text(if (isEn) "Pairing Code" else "Код сопряжения") }, singleLine = true)
                        Button(onClick = { ctrl.savePairedPc(pcHost.trim(), pcPort.toIntOrNull() ?: 47800, pcToken.trim()); pcStatus = "…"; ctrl.pingPairedPc { pcStatus = it } }, modifier = Modifier.fillMaxWidth()) {
                            Text(if (isEn) "Save & Test PC Connection" else "Сохранить и проверить связь с ПК")
                        }
                        if (pcStatus.isNotBlank()) Text(pcStatus, style = MaterialTheme.typography.bodySmall, color = if (pcStatus.startsWith("✓")) NexOkColor else MaterialTheme.colorScheme.error)
                        if (ctrl.pairedPcTelemetry.isNotBlank()) Text(ctrl.pairedPcTelemetry, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = {
                                val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                                val txt = cm?.primaryClip?.getItemAt(0)?.coerceToText(ctx)?.toString().orEmpty()
                                ctrl.syncClipboardToPc(txt) { clipStatus = it }
                            }, modifier = Modifier.weight(1f)) { Text(if (isEn) "Clip → PC" else "Буфер → ПК") }
                            OutlinedButton(onClick = {
                                ctrl.pullClipboardFromPc { st, txt ->
                                    clipStatus = st
                                    if (txt != null) (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager)?.setPrimaryClip(ClipData.newPlainText("Nex PC", txt))
                                }
                            }, modifier = Modifier.weight(1f)) { Text(if (isEn) "PC → Clip" else "ПК → Буфер") }
                        }
                        if (clipStatus.isNotBlank()) Text(clipStatus, style = MaterialTheme.typography.bodySmall, color = NexOkColor)
                        HorizontalDivider()
                        OutlinedTextField(value = remoteCmd, onValueChange = { remoteCmd = it }, modifier = Modifier.fillMaxWidth(), placeholder = { Text(if (isEn) "Remote task for PC…" else "Удалённая задача для ПК…") }, maxLines = 3)
                        Button(enabled = !sending && remoteCmd.isNotBlank(), onClick = { sending = true; remoteReply = "…"; ctrl.sendRemoteCommandToPc(remoteCmd.trim()) { r -> sending = false; remoteReply = r } }, modifier = Modifier.fillMaxWidth()) {
                            Text(if (isEn) "Run on PC →" else "Выполнить на ПК →")
                        }
                        if (remoteReply.isNotBlank()) Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) { Text(remoteReply, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(12.dp)) }
                    }
                }
                Surface(shape = RoundedCornerShape(16.dp), tonalElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(if (isEn) "This Phone: ${Build.MANUFACTURER} ${Build.MODEL}" else "Этот телефон: ${Build.MANUFACTURER} ${Build.MODEL}", fontWeight = FontWeight.Bold)
                        DeviceStatusRow(if (isEn) "Microphone" else "Микрофон", micOk, if (isEn) "Allow" else "Разрешить") { onRequestPerms(arrayOf(Manifest.permission.RECORD_AUDIO)) }
                        DeviceStatusRow(if (isEn) "Speech Recognition" else "Распознавание речи", speechAvail || !ctrl.apiKeys["Gemini"].isNullOrBlank(), if (isEn) "Keys" else "Ключи") { ctrl.openSettings(SettingsTab.AI) }
                        DeviceStatusRow(if (isEn) "Voice Output (TTS)" else "Озвучка (TTS)", ttsOk || !ctrl.apiKeys["OpenAI"].isNullOrBlank() || !ctrl.apiKeys["Gemini"].isNullOrBlank(), if (isEn) "Test" else "Тест") { ctrl.testVoice() }
                        DeviceStatusRow(if (isEn) "Screen Control" else "Управление экраном", accOk, if (isEn) "Open" else "Открыть") { Perms.openAccessibilitySettings(ctx) }
                        DeviceStatusRow(if (isEn) "Notifications" else "Уведомления", notifOk, if (isEn) "Open" else "Открыть") { Perms.openNotificationListenerSettings(ctx) }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ToggleDeviceRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun DeviceStatusRow(label: String, ok: Boolean, actionLabel: String, onAction: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Text("${if (ok) "●" else "○"} $label", style = MaterialTheme.typography.bodyMedium, color = if (ok) NexOkColor else MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        if (!ok) OutlinedButton(onClick = onAction) { Text(actionLabel) }
    }
}
