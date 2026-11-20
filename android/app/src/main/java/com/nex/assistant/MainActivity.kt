package com.nex.assistant

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val ctrl = (application as NexApp).controller
        handleAuthIntent(intent, ctrl)
        setContent {
            NexTheme {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .systemBarsPadding()
                ) {
                    NexRoot(ctrl)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleAuthIntent(intent, (application as NexApp).controller)
    }

    private fun handleAuthIntent(intent: Intent?, ctrl: NexController) {
        val uri = intent?.data ?: return
        if (uri.scheme == "com.nex.assistant" && uri.host == "oauth2redirect") {
            ctrl.handleGoogleOAuthUri(uri)
        }
    }

    override fun onResume() {
        super.onResume()
        (application as NexApp).controller.permTick++
    }
}

@Composable
private fun NexRoot(ctrl: NexController) {
    val ctx = LocalContext.current
    var folderTargetProjectId by remember { mutableStateOf<String?>(null) }
    var pendingVaultPassphrase by remember { mutableStateOf("") }

    BackHandler(enabled = ctrl.screen != AppScreen.CHAT && ctrl.screen != AppScreen.ONBOARDING) {
        ctrl.goBack()
    }

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { ctrl.permTick++ }

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
        if (uris.isNotEmpty()) ctrl.attachDocuments(uris)
    }

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) ctrl.importMediaUriToStudio(uri, isVideo = false)
    }

    val videoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) ctrl.importMediaUriToStudio(uri, isVideo = true)
    }

    val vaultExportPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/octet-stream")
    ) { uri ->
        if (uri != null) {
            ctrl.exportEncryptedVaultToUri(uri, pendingVaultPassphrase) { msg ->
                ctrl.authStatusMessage = msg
            }
        }
    }

    val vaultImportPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            ctrl.importEncryptedVaultFromUri(uri, pendingVaultPassphrase) { msg ->
                ctrl.authStatusMessage = msg
            }
        }
    }

    val folderPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { uri ->
        val pid = folderTargetProjectId
        if (uri != null && pid != null) {
            val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            runCatching { ctx.contentResolver.takePersistableUriPermission(uri, flags) }
            ctrl.assignProjectFolder(pid, uri)
        }
        folderTargetProjectId = null
    }

    AnimatedContent(
        targetState = ctrl.screen,
        transitionSpec = {
            (fadeIn(tween(220)) + slideInVertically(tween(220)) { it / 28 }) togetherWith fadeOut(tween(150))
        },
        label = "screen_transition"
    ) { target ->
        when (target) {
            AppScreen.ONBOARDING -> OnboardingScreen(
                ctrl = ctrl,
                onRequestPerms = { perms -> permLauncher.launch(perms) }
            )
            AppScreen.CHAT -> ChatScreen(
                ctrl = ctrl,
                onPickFiles = { filePicker.launch(arrayOf("*/*")) },
                onPickProjectFolder = { pid ->
                    folderTargetProjectId = pid
                    folderPicker.launch(null)
                }
            )
            AppScreen.PROJECTS -> ProjectsScreen(
                ctrl = ctrl,
                onPickProjectFolder = { pid ->
                    folderTargetProjectId = pid
                    folderPicker.launch(null)
                }
            )
            AppScreen.ARTIFACTS -> ArtifactsLibraryScreen(ctrl)
            AppScreen.ARTIFACT_VIEW -> ArtifactViewScreen(ctrl)
            AppScreen.MEDIA_STUDIO -> MediaStudioScreen(
                ctrl = ctrl,
                onPickPhoto = { photoPicker.launch(arrayOf("image/*")) },
                onPickVideo = { videoPicker.launch(arrayOf("video/*")) }
            )
            AppScreen.SETTINGS -> SettingsScreen(
                ctrl = ctrl,
                onRequestPerms = { perms -> permLauncher.launch(perms) }
            )
            AppScreen.ACCOUNT -> AccountScreen(
                ctrl = ctrl,
                onExportVault = { pass ->
                    pendingVaultPassphrase = pass
                    vaultExportPicker.launch("nex-backup.nexvault")
                },
                onImportVault = { pass ->
                    pendingVaultPassphrase = pass
                    vaultImportPicker.launch(arrayOf("*/*"))
                }
            )
        }
    }
}
