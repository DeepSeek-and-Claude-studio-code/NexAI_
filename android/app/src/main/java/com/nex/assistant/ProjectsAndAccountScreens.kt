package com.nex.assistant

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun ProjectsScreen(
    ctrl: NexController,
    onPickProjectFolder: (String) -> Unit
) {
    var newName by remember { mutableStateOf("") }
    var newDesc by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize()) {
        SubScreenTopBar(title = ctrl.t("projects"), onBack = { ctrl.goBack() })
        Column(Modifier.fillMaxSize().padding(16.dp)) {
            Text(
                ctrl.t("projects_desc"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = newName,
                    onValueChange = { newName = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text(ctrl.t("new_project")) },
                    singleLine = true
                )
                Button(onClick = {
                    ctrl.createProject(newName, newDesc)
                    newName = ""
                    newDesc = ""
                }) {
                    Text(ctrl.t("add_btn"))
                }
            }

            Spacer(Modifier.height(14.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(ctrl.projects, key = { it.id }) { proj ->
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                ctrl.startNewChat(projectId = proj.id)
                                ctrl.screen = AppScreen.CHAT
                            }
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text(proj.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            if (proj.description.isNotBlank()) {
                                Text(
                                    proj.description,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            OutlinedButton(onClick = { onPickProjectFolder(proj.id) }) {
                                Text(
                                    if (proj.folderName != null) "${ctrl.t("folder_label")}: ${proj.folderName}"
                                    else ctrl.t("choose_folder")
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AccountScreen(
    ctrl: NexController,
    onExportVault: (String) -> Unit,
    onImportVault: (String) -> Unit
) {
    var authTab by remember { mutableStateOf("email") }
    var email by remember { mutableStateOf(ctrl.account.email) }
    var password by remember { mutableStateOf("") }
    var googleClientId by remember { mutableStateOf(ctrl.account.googleClientId) }
    var syncPass by remember(ctrl.drivePassphrase) { mutableStateOf(ctrl.drivePassphrase) }
    var syncMsg by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize()) {
        SubScreenTopBar(title = ctrl.t("account"), onBack = { ctrl.goBack() })
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                val initial = (ctrl.userName.ifBlank { ctrl.account.email }).trim().firstOrNull()?.uppercase() ?: "Я"
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initial,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column {
                    Text(
                        text = ctrl.userName.ifBlank { ctrl.account.displayName.ifBlank { ctrl.t("account") } },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (ctrl.account.isSignedIn) "${ctrl.account.authType.uppercase()} · ${ctrl.account.email}"
                        else ctrl.t("account_desc"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            OutlinedTextField(
                value = ctrl.userName,
                onValueChange = { ctrl.updateUserName(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(ctrl.t("your_name")) },
                placeholder = { Text(ctrl.t("your_name_hint")) },
                singleLine = true
            )

            // Stored summary
            Surface(
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(ctrl.t("connected_model"), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(ctrl.currentModelPillText(), fontWeight = FontWeight.SemiBold)
                    val activeKeysCount = ctrl.apiKeys.values.count { it.isNotBlank() }
                    Text(
                        text = if (ctrl.lang == "en") {
                            "Saved: $activeKeysCount keys · ${ctrl.chats.size} chats · ${ctrl.mediaItems.size} media · ${ctrl.artifacts.size} artifacts"
                        } else {
                            "Сохранено: ключей $activeKeysCount · чатов ${ctrl.chats.size} · фото/видео ${ctrl.mediaItems.size} · артефактов ${ctrl.artifacts.size}"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            HorizontalDivider()

            // Sign In / Sign Out block
            if (!ctrl.account.isSignedIn) {
                Text(ctrl.t("sign_in_title"), fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = authTab == "email", onClick = { authTab = "email" }, label = { Text(ctrl.t("email_tab")) })
                    FilterChip(selected = authTab == "google", onClick = { authTab = "google" }, label = { Text(ctrl.t("google_tab")) })
                }
                if (authTab == "email") {
                    OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("Email") }, singleLine = true)
                    OutlinedTextField(
                        password, { password = it }, Modifier.fillMaxWidth(),
                        label = { Text(if (ctrl.lang == "en") "Password" else "Пароль") },
                        visualTransformation = PasswordVisualTransformation(), singleLine = true
                    )
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { ctrl.signInWithEmail(email, password) }, modifier = Modifier.weight(1f)) {
                            Text(ctrl.t("sign_in_btn"))
                        }
                        OutlinedButton(onClick = { ctrl.registerWithEmail(email, password, ctrl.userName) }, modifier = Modifier.weight(1f)) {
                            Text(ctrl.t("register_btn"))
                        }
                    }
                } else {
                    OutlinedTextField(
                        value = googleClientId,
                        onValueChange = { googleClientId = it; ctrl.updateGoogleClientId(it) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Google Cloud OAuth Client ID") },
                        singleLine = true
                    )
                    Button(
                        onClick = { ctrl.startGoogleSignIn(googleClientId) },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text(ctrl.t("sign_in_google_btn")) }
                }
            } else {
                OutlinedButton(onClick = { ctrl.signOut() }, modifier = Modifier.fillMaxWidth()) {
                    Text(ctrl.t("sign_out_btn"))
                }
            }

            if (ctrl.authStatusMessage.isNotBlank()) {
                Text(ctrl.authStatusMessage, style = MaterialTheme.typography.bodySmall, color = NexOkColor)
            }

            HorizontalDivider()

            // Google Drive Full File Storage & Auto-Sync
            Text(
                if (ctrl.lang == "en") "Google Drive File Storage (All Files)" else "Хранение всех файлов на Google Диске",
                fontWeight = FontWeight.Bold
            )
            Text(
                text = if (ctrl.lang == "en") {
                    "Saves chats, encrypted API keys, settings, last model, all photos, videos, artifacts and attachments to your Google Drive (Nex/ folder)."
                } else {
                    "Сохраняет на твой Google Диск чаты, зашифрованные ключи, настройки, последнюю модель, все фото, видео, артефакты и прикреплённые файлы (папка Nex/)."
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            OutlinedTextField(
                value = syncPass,
                onValueChange = {
                    syncPass = it
                    ctrl.updateDrivePassphrase(it)
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(ctrl.t("sync_pass_hint")) },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true
            )

            if (ctrl.account.driveConnected) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(ctrl.t("drive_auto_sync"), fontWeight = FontWeight.SemiBold)
                        Text(
                            ctrl.t("drive_auto_sync_desc"),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = ctrl.account.driveAutoSync,
                        onCheckedChange = { ctrl.updateDriveAutoSync(it) }
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = ctrl.account.driveFolderMode == "visible",
                        onClick = { ctrl.updateDriveFolderMode("visible") },
                        label = { Text(ctrl.t("drive_folder_visible")) }
                    )
                    FilterChip(
                        selected = ctrl.account.driveFolderMode == "hidden",
                        onClick = { ctrl.updateDriveFolderMode("hidden") },
                        label = { Text(ctrl.t("drive_folder_hidden")) }
                    )
                }

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            syncMsg = "…"
                            ctrl.syncToGoogleDrive(syncPass) { syncMsg = it }
                        },
                        modifier = Modifier.weight(1f)
                    ) { Text(ctrl.t("sync_drive_up")) }
                    OutlinedButton(
                        onClick = {
                            syncMsg = "…"
                            ctrl.restoreFromGoogleDrive(syncPass) { syncMsg = it }
                        },
                        modifier = Modifier.weight(1f)
                    ) { Text(ctrl.t("sync_drive_down")) }
                }
            } else {
                OutlinedTextField(
                    value = googleClientId,
                    onValueChange = { googleClientId = it; ctrl.updateGoogleClientId(it) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Google Cloud OAuth Client ID") },
                    singleLine = true
                )
                Button(
                    onClick = { ctrl.startGoogleSignIn(googleClientId, linkDriveOnly = ctrl.account.isSignedIn) },
                    modifier = Modifier.fillMaxWidth()
                ) { Text(ctrl.t("link_drive_btn")) }
            }

            if (ctrl.driveSyncStatus.isNotBlank()) {
                Text(ctrl.driveSyncStatus, style = MaterialTheme.typography.bodySmall, color = NexOkColor)
            }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { onExportVault(syncPass) }, modifier = Modifier.weight(1f)) {
                    Text(ctrl.t("export_vault"))
                }
                OutlinedButton(onClick = { onImportVault(syncPass) }, modifier = Modifier.weight(1f)) {
                    Text(ctrl.t("import_vault"))
                }
            }

            if (syncMsg.isNotBlank()) {
                Text(syncMsg, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
