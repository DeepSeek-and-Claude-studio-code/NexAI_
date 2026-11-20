package com.nex.assistant

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Single source of truth for Nex UI state, per-account storage & encrypted cloud/vault sync,
 * voice I/O, Nex Atom/Quark/Sel/Foton routing, real artifacts, media editing, and agent execution.
 */
class NexController(private val ctx: Context) {
    val store = Store(ctx)
    val voiceManager = VoiceManager(ctx)
    private val agent = AgentEngine(ctx, store)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var activeTurnJob: Job? = null
    private var autoSyncJob: Job? = null

    var screen by mutableStateOf(if (store.onboarded) AppScreen.CHAT else AppScreen.ONBOARDING)
    var previousScreen by mutableStateOf(AppScreen.CHAT)
    var settingsTab by mutableStateOf(SettingsTab.AI)

    var account by mutableStateOf(store.loadAccountProfile())
    var authStatusMessage by mutableStateOf("")
    var driveSyncStatus by mutableStateOf("")
    var drivePassphrase by mutableStateOf(store.drivePassphrase)

    var lang by mutableStateOf(store.lang)
    var voice by mutableStateOf(store.voice)
    var speechRate by mutableFloatStateOf(store.speechRate)
    var autoSpeak by mutableStateOf(store.autoSpeak)
    var userName by mutableStateOf(store.userName)

    var selectedProfileId by mutableStateOf(store.selectedProfileId)
    var manualProvider by mutableStateOf(store.manualProvider)
    var manualModel by mutableStateOf(store.manualModel)
    var imageModel by mutableStateOf(store.imageModel)
    var videoModel by mutableStateOf(store.videoModel)
    var effort by mutableStateOf(store.effort)
    var genMode by mutableStateOf(store.lastGenMode)

    var webSearchEnabled by mutableStateOf(false)
    var memoryEnabled by mutableStateOf(store.memoryEnabled)
    var memoryAutoSave by mutableStateOf(store.memoryAutoSave)
    var confirmSensitiveActions by mutableStateOf(store.confirmSensitiveActions)

    var sphereState by mutableStateOf(NexState.IDLE)
    var statusLabel by mutableStateOf("")
    var isBusy by mutableStateOf(false)
    var isListening by mutableStateOf(false)
    var permTick by mutableIntStateOf(0)

    var apiKeys by mutableStateOf(store.getAllApiKeys())
    var mailConfig by mutableStateOf(store.loadMailConfig())
    var modelCatalog by mutableStateOf(LlmClient.DEFAULT_MODELS)

    val chats = mutableStateListOf<ChatSession>()
    val projects = mutableStateListOf<ProjectItem>()
    val artifacts = mutableStateListOf<ArtifactItem>()
    val mediaItems = mutableStateListOf<MediaItem>()
    val memories = mutableStateListOf<String>()
    val pendingAttachments = mutableStateListOf<LocalAttachment>()

    var activeChatId by mutableStateOf<String?>(null)
    var activeArtifactId by mutableStateOf<String?>(null)
    var artifactFilter by mutableStateOf<ArtifactType?>(null)
    var editingMedia by mutableStateOf<MediaItem?>(null)

    var assistTranscript by mutableStateOf("")
    var assistReply by mutableStateOf("")

    val female: Boolean get() = voice == "f"
    val agentName: String get() = Strings.agentName(lang, female)

    init {
        reloadFromActiveAccount()
    }

    fun reloadFromActiveAccount() {
        account = store.loadAccountProfile()
        drivePassphrase = store.drivePassphrase
        lang = store.lang
        voice = store.voice
        speechRate = store.speechRate
        autoSpeak = store.autoSpeak
        userName = store.userName.ifBlank { account.displayName }

        selectedProfileId = store.selectedProfileId
        manualProvider = store.manualProvider
        manualModel = store.manualModel
        imageModel = store.imageModel
        videoModel = store.videoModel
        effort = store.effort
        genMode = store.lastGenMode

        memoryEnabled = store.memoryEnabled
        memoryAutoSave = store.memoryAutoSave
        confirmSensitiveActions = store.confirmSensitiveActions

        apiKeys = store.getAllApiKeys()
        mailConfig = store.loadMailConfig()

        val loaded = store.loadState()
        chats.clear(); chats.addAll(loaded.chats)
        projects.clear(); projects.addAll(loaded.projects)
        artifacts.clear(); artifacts.addAll(loaded.artifacts)
        mediaItems.clear(); mediaItems.addAll(loaded.mediaItems)
        memories.clear(); memories.addAll(loaded.memories)

        val merged = LlmClient.DEFAULT_MODELS.toMutableMap()
        loaded.customModels.forEach { (k, v) -> if (v.isNotEmpty()) merged[k] = v }
        modelCatalog = merged

        if (projects.isEmpty()) {
            projects.add(ProjectItem(name = if (lang == "en") "Everyday" else "Повседневное", description = if (lang == "en") "Messages, calls & calendar" else "Сообщения, звонки и календарь"))
            projects.add(ProjectItem(name = if (lang == "en") "Work" else "Работа", description = if (lang == "en") "Work chats & files" else "Рабочие задачи и файлы"))
        }
        if (chats.isEmpty()) {
            startNewChat(projectId = null)
        } else {
            activeChatId = loaded.activeChatId?.takeIf { id -> chats.any { it.id == id } } ?: chats.first().id
        }
        statusLabel = Strings.t("ready", lang, female)
    }

    fun t(key: String): String = Strings.t(key, lang, female)

    fun activeChat(): ChatSession? = chats.firstOrNull { it.id == activeChatId }

    fun activeProject(): ProjectItem? {
        val pid = activeChat()?.projectId ?: return null
        return projects.firstOrNull { it.id == pid }
    }

    fun activeArtifact(): ArtifactItem? = artifacts.firstOrNull { it.id == activeArtifactId }

    fun navigate(target: AppScreen) {
        if (screen != target) {
            previousScreen = screen
            screen = target
        }
    }

    fun goBack() {
        screen = when (screen) {
            AppScreen.ARTIFACT_VIEW -> if (previousScreen == AppScreen.ARTIFACTS) AppScreen.ARTIFACTS else AppScreen.CHAT
            else -> AppScreen.CHAT
        }
    }

    fun finishOnboarding() {
        store.onboarded = true
        screen = AppScreen.CHAT
        sphereState = NexState.IDLE
        statusLabel = t("ready")
        persist()
    }

    // --- Account Auth & Sync ---

    fun registerWithEmail(email: String, password: String, name: String): Result<AccountProfile> {
        val res = AccountSync.registerEmail(store, email, password, name)
        res.onSuccess { prof ->
            store.userName = prof.displayName
            reloadFromActiveAccount()
            authStatusMessage = if (lang == "en") "Account created: ${prof.email}" else "Аккаунт создан: ${prof.email}"
        }.onFailure {
            authStatusMessage = it.message ?: "Error"
        }
        return res
    }

    fun signInWithEmail(email: String, password: String): Result<AccountProfile> {
        val res = AccountSync.signInEmail(store, email, password)
        res.onSuccess { prof ->
            reloadFromActiveAccount()
            authStatusMessage = if (lang == "en") "Signed in: ${prof.email}" else "Вход выполнен: ${prof.email}"
        }.onFailure {
            authStatusMessage = it.message ?: "Error"
        }
        return res
    }

    fun updateGoogleClientId(clientId: String) {
        store.googleClientId = clientId
        account = store.loadAccountProfile()
        drivePassphrase = store.drivePassphrase
    }

    fun startGoogleSignIn(clientId: String, linkDriveOnly: Boolean = false): Result<Unit> {
        store.googleClientId = clientId
        val res = AccountSync.launchGoogleSignIn(ctx, clientId, linkDriveOnly)
        res.onFailure { authStatusMessage = it.message ?: "Google OAuth launch failed" }
        return res
    }

    fun updateDriveAutoSync(enabled: Boolean) {
        store.driveAutoSync = enabled
        account = store.loadAccountProfile()
    }

    fun updateDriveFolderMode(mode: String) {
        store.driveFolderMode = mode
        account = store.loadAccountProfile()
    }

    fun updateDrivePassphrase(pass: String) {
        drivePassphrase = pass
        store.drivePassphrase = pass
    }

    private fun canAutoSyncDrive(): Boolean =
        account.driveConnected && store.driveAutoSync

    private fun scheduleDriveStateSync() {
        if (!canAutoSyncDrive()) return
        autoSyncJob?.cancel()
        autoSyncJob = scope.launch {
            delay(3500)
            driveSyncStatus = if (lang == "en") "Syncing to Google Drive…" else "Сохраняю на Google Диск…"
            val res = GoogleDriveStorage.uploadStateVaultOnly(store, currentPersistedState(), drivePassphrase)
            driveSyncStatus = res.fold(
                onSuccess = {
                    account = store.loadAccountProfile()
                    if (lang == "en") "Synced to Google Drive" else "Сохранено на Google Диск"
                },
                onFailure = { "Drive: ${it.message}" }
            )
        }
    }

    private fun autoUploadFileToDrive(file: File, category: String, mimeType: String) {
        if (!canAutoSyncDrive() || !file.exists()) return
        scope.launch {
            driveSyncStatus = if (lang == "en") "Uploading ${file.name} to Google Drive…" else "Загружаю ${file.name} на Google Диск…"
            val res = GoogleDriveStorage.uploadSingleLocalFile(store, file, category, mimeType)
            driveSyncStatus = res.fold(
                onSuccess = { if (lang == "en") "Saved ${file.name} to Google Drive" else "Файл ${file.name} сохранён на Google Диск" },
                onFailure = { "Drive upload: ${it.message}" }
            )
        }
    }

    private fun autoUploadArtifactToDrive(art: ArtifactItem) {
        if (!canAutoSyncDrive()) return
        scope.launch {
            val res = GoogleDriveStorage.uploadSingleArtifact(store, art)
            res.onFailure { driveSyncStatus = "Drive artifact: ${it.message}" }
        }
    }

    fun handleGoogleOAuthUri(uri: Uri) {
        scope.launch {
            authStatusMessage = if (lang == "en") "Completing Google sign-in…" else "Завершаю вход через Google…"
            val res = AccountSync.handleGoogleRedirect(store, uri)
            res.onSuccess { prof ->
                if (store.userName.isBlank()) store.userName = prof.displayName
                reloadFromActiveAccount()
                authStatusMessage = if (lang == "en") "Signed in with Google: ${prof.email}" else "Вход через Google: ${prof.email}"
            }.onFailure {
                authStatusMessage = "Google OAuth: ${it.message}"
            }
        }
    }

    fun signOut() {
        persist()
        store.activeAccountId = "guest"
        reloadFromActiveAccount()
        authStatusMessage = if (lang == "en") "Signed out." else "Выход выполнен."
    }

    fun syncToGoogleDrive(passphrase: String, onDone: (String) -> Unit) {
        scope.launch {
            val res = AccountSync.uploadToGoogleDrive(store, currentPersistedState(), passphrase)
            res.fold(
                onSuccess = {
                    account = store.loadAccountProfile()
        drivePassphrase = store.drivePassphrase
                    onDone(if (lang == "en") "Backed up keys, chats, media, artifacts & settings to Google Drive." else "Ключи, чаты, медиа, артефакты и настройки сохранены в Google Drive.")
                },
                onFailure = { onDone("Error: ${it.message}") }
            )
        }
    }

    fun restoreFromGoogleDrive(passphrase: String, onDone: (String) -> Unit) {
        scope.launch {
            val res = AccountSync.downloadFromGoogleDrive(store, passphrase)
            res.fold(
                onSuccess = {
                    reloadFromActiveAccount()
                    onDone(if (lang == "en") "Restored account data from Google Drive." else "Данные аккаунта восстановлены из Google Drive.")
                },
                onFailure = { onDone("Error: ${it.message}") }
            )
        }
    }

    fun exportEncryptedVaultToUri(uri: Uri, passphrase: String, onDone: (String) -> Unit) {
        scope.launch {
            val res = withContext(Dispatchers.IO) {
                runCatching {
                    val bytes = AccountSync.buildEncryptedVaultBytes(store, currentPersistedState(), passphrase)
                    ctx.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } ?: error("Cannot open output file")
                }
            }
            onDone(
                res.fold(
                    onSuccess = { if (lang == "en") "Encrypted backup saved." else "Зашифрованная копия сохранена." },
                    onFailure = { "Error: ${it.message}" }
                )
            )
        }
    }

    fun importEncryptedVaultFromUri(uri: Uri, passphrase: String, onDone: (String) -> Unit) {
        scope.launch {
            val res = withContext(Dispatchers.IO) {
                runCatching {
                    val bytes = ctx.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: error("Cannot read file")
                    AccountSync.restoreFromEncryptedVaultBytes(store, bytes, passphrase)
                }
            }
            res.fold(
                onSuccess = {
                    reloadFromActiveAccount()
                    onDone(if (lang == "en") "Backup restored successfully." else "Резервная копия успешно восстановлена.")
                },
                onFailure = { onDone("Error: ${it.message}") }
            )
        }
    }

    // --- Settings & Model Selection (all persisted immediately) ---

    fun updateLang(newLang: String) {
        lang = newLang
        store.lang = newLang
        if (!isBusy) statusLabel = t("ready")
    }

    fun updateVoice(newVoice: String) {
        voice = newVoice
        store.voice = newVoice
        if (!isBusy) statusLabel = t("ready")
    }

    fun updateSpeechRate(rate: Float) {
        speechRate = rate
        store.speechRate = rate
    }

    fun updateAutoSpeak(enabled: Boolean) {
        autoSpeak = enabled
        store.autoSpeak = enabled
    }

    fun updateUserName(name: String) {
        userName = name
        store.userName = name
    }

    fun updateApiKey(provider: String, value: String) {
        store.setApiKey(provider, value)
        apiKeys = store.getAllApiKeys()
        scheduleDriveStateSync()
    }

    fun updateMailConfig(cfg: MailConfig) {
        mailConfig = cfg
        store.saveMailConfig(cfg)
    }

    fun updateGenMode(mode: GenMode?) {
        genMode = mode
        store.lastGenMode = mode
    }

    fun selectProfile(profile: NexProfile) {
        selectedProfileId = profile.id
        store.selectedProfileId = profile.id
        if (profile.isMedia && genMode == null) updateGenMode(GenMode.IMAGE)
        if (!profile.isMedia && genMode != null) updateGenMode(null)
        scheduleDriveStateSync()
    }

    fun selectManualModel(provider: String, model: String) {
        selectedProfileId = null
        store.selectedProfileId = null
        manualProvider = provider
        manualModel = model
        store.manualProvider = provider
        store.manualModel = model
        updateGenMode(null)
        scheduleDriveStateSync()
    }

    fun selectImageModel(model: String) {
        selectedProfileId = null
        store.selectedProfileId = null
        imageModel = model
        store.imageModel = model
        updateGenMode(GenMode.IMAGE)
    }

    fun selectVideoModel(model: String) {
        selectedProfileId = null
        store.selectedProfileId = null
        videoModel = model
        store.videoModel = model
        updateGenMode(GenMode.VIDEO)
    }

    fun updateEffort(e: Effort) {
        effort = e
        store.effort = e
    }

    fun toggleMemory(enabled: Boolean) {
        memoryEnabled = enabled
        store.memoryEnabled = enabled
    }

    fun toggleMemoryAutoSave(enabled: Boolean) {
        memoryAutoSave = enabled
        store.memoryAutoSave = enabled
    }

    fun toggleConfirmSensitive(enabled: Boolean) {
        confirmSensitiveActions = enabled
        store.confirmSensitiveActions = enabled
    }

    fun addMemory(fact: String) {
        val clean = fact.trim()
        if (clean.isNotEmpty() && !memories.contains(clean)) {
            memories.add(0, clean)
            persist()
        }
    }

    fun removeMemory(index: Int) {
        if (index in memories.indices) {
            memories.removeAt(index)
            persist()
        }
    }

    fun clearMemories() {
        memories.clear()
        persist()
    }

    fun currentModelPillText(): String {
        val prof = NexProfile.fromId(selectedProfileId)
        val main = if (prof != null) {
            if (prof.isMedia) {
                val mode = genMode ?: GenMode.IMAGE
                val res = prof.resolveMedia(mode, apiKeys)
                "${prof.title} · ${res?.model ?: t("key_needed")}"
            } else {
                val res = prof.resolveText(apiKeys)
                "${prof.title} · ${res?.model ?: t("key_needed")}"
            }
        } else if (genMode == GenMode.IMAGE) {
            "${t("create_image")} · $imageModel"
        } else if (genMode == GenMode.VIDEO) {
            "${t("create_video")} · $videoModel"
        } else {
            "$manualProvider · $manualModel"
        }
        return "$main · ${effort.label(lang)}"
    }

    fun resolveActiveTextTarget(): ModelTarget? {
        val prof = NexProfile.fromId(selectedProfileId)
        if (prof != null && !prof.isMedia) return prof.resolveText(apiKeys)
        if (prof != null && prof.isMedia) return NexProfile.QUARK.resolveText(apiKeys)
        if (!apiKeys[manualProvider].isNullOrBlank()) return ModelTarget(manualProvider, manualModel)
        return null
    }

    fun resolveActiveMediaTarget(mode: GenMode): ModelTarget? {
        val prof = NexProfile.fromId(selectedProfileId)
        if (prof == NexProfile.FOTON) return prof.resolveMedia(mode, apiKeys)
        val model = if (mode == GenMode.VIDEO) videoModel else imageModel
        val prov = if (mode == GenMode.VIDEO) {
            "Gemini"
        } else {
            LlmClient.IMAGE_MODELS.entries.firstOrNull { model in it.value }?.key ?: "Gemini"
        }
        return if (!apiKeys[prov].isNullOrBlank()) ModelTarget(prov, model) else null
    }

    // --- Chats, Projects, Artifacts & Media Studio ---

    fun startNewChat(projectId: String? = null) {
        val proj = projectId?.let { id -> projects.firstOrNull { it.id == id } }
        val greeting = if (proj != null) {
            val fInfo = if (proj.folderName != null) {
                if (lang == "en") "Working folder: ${proj.folderName}." else "Рабочая папка: ${proj.folderName}."
            } else {
                t("no_folder")
            }
            if (lang == "en") "Project \"${proj.name}\" opened. $fInfo" else "Проект «${proj.name}» открыт. $fInfo"
        } else {
            t("greeting")
        }
        val session = ChatSession(
            title = proj?.name ?: t("new_chat"),
            projectId = projectId,
            messages = listOf(ChatMessage(role = "assistant", text = greeting))
        )
        chats.add(0, session)
        activeChatId = session.id
        persist()
    }

    fun openChat(chatId: String) {
        activeChatId = chatId
        screen = AppScreen.CHAT
        persist()
    }

    fun deleteChat(chatId: String) {
        chats.removeAll { it.id == chatId }
        if (activeChatId == chatId) {
            if (chats.isEmpty()) startNewChat()
            else activeChatId = chats.first().id
        }
        persist()
    }

    fun cancelActiveGeneration() {
        activeTurnJob?.cancel()
        activeTurnJob = null
        SafetyGuard.cancelActive()
        voiceManager.stopSpeaking()
        isBusy = false
        sphereState = NexState.IDLE
        statusLabel = t("ready")
    }

    fun createProject(name: String, description: String) {
        val clean = name.trim().ifEmpty { "${t("new_project")} ${projects.size + 1}" }
        projects.add(0, ProjectItem(name = clean, description = description.trim()))
        persist()
    }

    fun assignProjectFolder(projectId: String, uri: Uri) {
        val idx = projects.indexOfFirst { it.id == projectId }
        if (idx < 0) return
        val folderName = uri.lastPathSegment?.substringAfterLast(':')?.substringAfterLast('/') ?: "Folder"
        projects[idx] = projects[idx].copy(folderUri = uri.toString(), folderName = folderName)
        persist()
    }

    fun createArtifactManually(type: ArtifactType, title: String): ArtifactItem {
        val defaultContent = when (type) {
            ArtifactType.PRESENTATION -> "[{\"title\":\"$title\",\"subtitle\":\"Created in Nex\",\"bullets\":[\"Point 1\",\"Point 2\"]}]"
            ArtifactType.TABLE -> "Item,Plan,Actual\nTask A,100,120\nTask B,50,45"
            ArtifactType.HTML -> "<!doctype html><meta charset=\"utf-8\"><body style=\"font-family:sans-serif;padding:24px\"><h2>$title</h2><p>Interactive HTML artifact</p></body>"
            ArtifactType.DOCUMENT -> "# $title\n\nWrite your notes here.\n\n- Key item 1\n- Key item 2"
        }
        val art = ArtifactItem(type = type, title = title.ifBlank { type.label(lang) }, content = defaultContent)
        artifacts.add(0, art)
        autoUploadArtifactToDrive(art)
        persist()
        return art
    }

    fun openArtifact(artifactId: String) {
        activeArtifactId = artifactId
        navigate(AppScreen.ARTIFACT_VIEW)
    }

    fun updateArtifactContent(artifactId: String, newContent: String) {
        val idx = artifacts.indexOfFirst { it.id == artifactId }
        if (idx >= 0) {
            val updated = artifacts[idx].copy(content = newContent)
            artifacts[idx] = updated
            autoUploadArtifactToDrive(updated)
            persist()
        }
    }

    fun updateArtifactTitle(artifactId: String, newTitle: String) {
        val clean = newTitle.trim()
        if (clean.isEmpty()) return
        val idx = artifacts.indexOfFirst { it.id == artifactId }
        if (idx >= 0) {
            artifacts[idx] = artifacts[idx].copy(title = clean)
            persist()
        }
    }

    fun deleteArtifact(artifactId: String) {
        artifacts.removeAll { it.id == artifactId }
        if (activeArtifactId == artifactId) {
            activeArtifactId = null
            goBack()
        }
        persist()
    }

    fun openMediaInStudio(item: MediaItem) {
        editingMedia = item
        if (mediaItems.none { it.id == item.id }) {
            mediaItems.add(0, item)
            persist()
        }
        navigate(AppScreen.MEDIA_STUDIO)
    }

    fun registerMediaItem(item: MediaItem, postToChat: Boolean = false) {
        mediaItems.add(0, item)
        editingMedia = item
        autoUploadFileToDrive(File(item.filePath), "media", if (item.isVideo) "video/mp4" else "image/png")
        if (postToChat) {
            val cid = activeChatId ?: chats.firstOrNull()?.id
            if (cid != null) {
                appendMessage(
                    cid,
                    ChatMessage(role = "assistant", text = item.prompt.ifBlank { item.modelName }, media = item)
                )
            }
        }
        persist()
    }

    fun importMediaUriToStudio(uri: Uri, isVideo: Boolean) {
        scope.launch {
            val res = withContext(Dispatchers.IO) {
                runCatching {
                    val file = MediaEditor.importUriToMediaFile(ctx, uri, isVideo)
                    MediaItem(
                        isVideo = isVideo,
                        filePath = file.absolutePath,
                        modelName = if (isVideo) "Imported Video" else "Imported Photo",
                        prompt = queryDisplayName(uri) ?: file.name
                    )
                }
            }
            res.onSuccess { item ->
                registerMediaItem(item, postToChat = false)
            }
        }
    }

    fun runAiPhotoEdit(sourcePath: String, instruction: String, onDone: (String) -> Unit) {
        val target = resolveActiveMediaTarget(GenMode.IMAGE)
            ?: NexProfile.FOTON.resolveMedia(GenMode.IMAGE, apiKeys)
        if (target == null) {
            onDone(if (lang == "en") "Add a Gemini or OpenAI API key in Settings -> AI." else "Добавь API-ключ Gemini или OpenAI в Настройках → ИИ.")
            return
        }
        scope.launch {
            isBusy = true
            sphereState = NexState.WORKING
            statusLabel = t("editing_photo")
            try {
                val edited = MediaGenerator.editImageWithAi(
                    ctx = ctx,
                    provider = target.provider,
                    model = target.model,
                    apiKey = apiKeys[target.provider].orEmpty(),
                    sourceFile = File(sourcePath),
                    instruction = instruction
                )
                registerMediaItem(edited, postToChat = true)
                onDone(if (lang == "en") "AI edit saved!" else "ИИ-редактирование готово!")
            } catch (e: Exception) {
                onDone("Error: ${e.message}")
            } finally {
                isBusy = false
                sphereState = NexState.IDLE
                statusLabel = t("ready")
            }
        }
    }

    fun runAiImageToVideo(sourcePath: String, instruction: String, onDone: (String) -> Unit) {
        val target = resolveActiveMediaTarget(GenMode.VIDEO)
            ?: NexProfile.FOTON.resolveMedia(GenMode.VIDEO, apiKeys)
        if (target == null) {
            onDone(if (lang == "en") "Add a Gemini API key in Settings -> AI." else "Добавь API-ключ Gemini в Настройках → ИИ.")
            return
        }
        scope.launch {
            isBusy = true
            sphereState = NexState.WORKING
            statusLabel = t("shooting")
            try {
                val vid = MediaGenerator.generateVideo(
                    ctx = ctx,
                    provider = target.provider,
                    model = target.model,
                    apiKey = apiKeys[target.provider].orEmpty(),
                    prompt = instruction,
                    referencePhoto = File(sourcePath)
                )
                registerMediaItem(vid, postToChat = true)
                onDone(if (lang == "en") "Video created from photo!" else "Видео по фото готово!")
            } catch (e: Exception) {
                onDone("Error: ${e.message}")
            } finally {
                isBusy = false
                sphereState = NexState.IDLE
                statusLabel = t("ready")
            }
        }
    }

    fun attachDocuments(uris: List<Uri>) {
        scope.launch {
            withContext(Dispatchers.IO) {
                uris.forEach { uri ->
                    val mime = ctx.contentResolver.getType(uri) ?: "application/octet-stream"
                    val name = queryDisplayName(uri) ?: uri.lastPathSegment ?: "file"
                    val safeName = "${System.currentTimeMillis()}_${name.replace(Regex("[^a-zA-Z0-9а-яА-ЯёЁ._-]+"), "_")}"
                    val savedFile = File(store.attachmentsDir(), safeName)
                    val copied = runCatching {
                        ctx.contentResolver.openInputStream(uri)?.use { input ->
                            savedFile.outputStream().use { out -> input.copyTo(out) }
                        }
                        savedFile.exists()
                    }.getOrDefault(false)

                    if (copied) {
                        autoUploadFileToDrive(savedFile, "attachments", mime)
                    }

                    if (mime.startsWith("image/")) {
                        val bytes = if (copied && savedFile.length() <= 4_500_000L) savedFile.readBytes() else null
                        val b64 = bytes?.let { Base64.encodeToString(it, Base64.NO_WRAP) }
                        withContext(Dispatchers.Main) {
                            pendingAttachments.add(
                                LocalAttachment(
                                    name = name,
                                    mimeType = mime,
                                    uriString = uri.toString(),
                                    localPath = if (copied) savedFile.absolutePath else null,
                                    base64Image = b64
                                )
                            )
                        }
                    } else {
                        val preview = if (copied && savedFile.length() <= 512_000L) {
                            runCatching { savedFile.readText(Charsets.UTF_8).take(12000) }.getOrNull()
                        } else null
                        withContext(Dispatchers.Main) {
                            pendingAttachments.add(
                                LocalAttachment(
                                    name = name,
                                    mimeType = mime,
                                    uriString = uri.toString(),
                                    localPath = if (copied) savedFile.absolutePath else null,
                                    textPreview = preview
                                )
                            )
                        }
                    }
                }
            }
        }
    }

    private fun queryDisplayName(uri: Uri): String? {
        return runCatching {
            ctx.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) c.getString(0) else null
            }
        }.getOrNull()
    }

    fun removeAttachment(id: String) {
        pendingAttachments.removeAll { it.id == id }
    }

    fun refreshModelsFromApis(onDone: (String) -> Unit) {
        scope.launch {
            val updated = modelCatalog.toMutableMap()
            var count = 0
            for (p in LlmClient.PROVIDERS) {
                val key = apiKeys[p].orEmpty()
                if (key.isBlank()) continue
                val list = runCatching { LlmClient.fetchModels(p, key) }.getOrDefault(emptyList())
                if (list.isNotEmpty()) {
                    updated[p] = (LlmClient.DEFAULT_MODELS[p].orEmpty() + list).distinct()
                    count++
                }
            }
            modelCatalog = updated
            persist()
            val msg = if (count > 0) {
                if (lang == "en") "Updated models for $count provider(s)." else "Обновлены модели для $count провайдеров."
            } else {
                if (lang == "en") "Add at least one valid API key first." else "Сначала добавь хотя бы один рабочий API-ключ."
            }
            onDone(msg)
        }
    }

    fun testMailConnection(onDone: (String) -> Unit) {
        scope.launch {
            val res = runCatching { MailClient.readInbox(mailConfig, limit = 3) }
            val msg = res.fold(
                onSuccess = { list ->
                    if (lang == "en") "Connected! Found ${list.size} recent email(s)." else "Подключено! Получено писем: ${list.size}."
                },
                onFailure = { err -> "Error: ${err.message}" }
            )
            onDone(msg)
        }
    }

    fun sendUserMessage(rawText: String, fromAssistOverlay: Boolean = false) {
        val text = rawText.trim()
        val atts = pendingAttachments.toList()
        if ((text.isEmpty() && atts.isEmpty()) || isBusy) return
        pendingAttachments.clear()

        if (activeChat() == null) startNewChat()
        val chatId = activeChatId ?: return

        appendMessage(
            chatId,
            ChatMessage(role = "user", text = text, attachmentNames = atts.map { it.name })
        )
        if (fromAssistOverlay) {
            assistTranscript = text
            assistReply = ""
        }

        val chatIdx = chats.indexOfFirst { it.id == chatId }
        if (chatIdx >= 0 && (chats[chatIdx].title == t("new_chat") || chats[chatIdx].messages.count { it.role == "user" } == 1)) {
            if (chats[chatIdx].projectId == null && text.isNotBlank()) {
                chats[chatIdx] = chats[chatIdx].copy(title = text.take(36))
            }
        }

        isBusy = true
        activeTurnJob = scope.launch {
            try {
                val activeGen = genMode
                if (activeGen != null) {
                    val target = resolveActiveMediaTarget(activeGen)
                    if (target == null) {
                        val err = if (lang == "en") {
                            "Add a Gemini${if (activeGen == GenMode.IMAGE) " or OpenAI" else ""} API key in Settings -> AI."
                        } else {
                            "Добавь API-ключ Gemini${if (activeGen == GenMode.IMAGE) " или OpenAI" else ""} в Настройках → ИИ."
                        }
                        appendMessage(chatId, ChatMessage(role = "assistant", text = err))
                        if (fromAssistOverlay) assistReply = err
                        return@launch
                    }
                    val apiKey = apiKeys[target.provider].orEmpty()
                    val attachedImg = atts.firstOrNull { !it.base64Image.isNullOrBlank() }

                    sphereState = NexState.WORKING
                    statusLabel = t(if (activeGen == GenMode.IMAGE) (if (attachedImg != null) "editing_photo" else "drawing") else "shooting")

                    val media = if (activeGen == GenMode.IMAGE) {
                        if (attachedImg != null) {
                            val tmp = File(store.mediaDir(), "src_${System.currentTimeMillis()}.png")
                            tmp.writeBytes(Base64.decode(attachedImg.base64Image, Base64.DEFAULT))
                            MediaGenerator.editImageWithAi(ctx, target.provider, target.model, apiKey, tmp, text)
                        } else {
                            MediaGenerator.generateImage(ctx, target.provider, target.model, apiKey, text)
                        }
                    } else {
                        val refFile = attachedImg?.let {
                            File(store.mediaDir(), "ref_${System.currentTimeMillis()}.png").apply {
                                writeBytes(Base64.decode(it.base64Image, Base64.DEFAULT))
                            }
                        }
                        MediaGenerator.generateVideo(ctx, target.provider, target.model, apiKey, text, refFile)
                    }
                    mediaItems.add(0, media)
                    autoUploadFileToDrive(File(media.filePath), "media", if (media.isVideo) "video/mp4" else "image/png")
                    val doneTxt = if (activeGen == GenMode.IMAGE) {
                        if (lang == "en") "Image ready (${media.modelName})." else "Картинка готова (${media.modelName})."
                    } else {
                        if (lang == "en") "Video ready (${media.modelName})." else "Видео готово (${media.modelName})."
                    }
                    appendMessage(chatId, ChatMessage(role = "assistant", text = doneTxt, media = media))
                    if (fromAssistOverlay) assistReply = doneTxt
                    return@launch
                }

                val memMatch = Regex("^(?:запомни|remember)[\\s:,-]+(.+)", RegexOption.IGNORE_CASE).find(text)
                if (memMatch != null && memoryAutoSave && memoryEnabled) {
                    val fact = memMatch.groupValues[1].trim()
                    addMemory(fact)
                    val ack = if (lang == "en") "Remembered: \"$fact\"." else "Запомнил: «$fact»."
                    val adapted = Strings.adaptName(ack, lang, female)
                    appendMessage(chatId, ChatMessage(role = "assistant", text = adapted))
                    if (fromAssistOverlay) assistReply = adapted
                    if (autoSpeak || fromAssistOverlay) voiceManager.speak(adapted, lang, voice, speechRate)
                    return@launch
                }

                val target = resolveActiveTextTarget()
                if (target == null) {
                    val err = if (lang == "en") {
                        "No API key configured for the selected model/profile. Add a key in Settings -> AI."
                    } else {
                        "Для выбранной модели или профиля не добавлен API-ключ. Добавь ключ в Настройках → ИИ."
                    }
                    appendMessage(chatId, ChatMessage(role = "assistant", text = err))
                    if (fromAssistOverlay) assistReply = err
                    return@launch
                }

                val apiKey = apiKeys[target.provider].orEmpty()
                val chatMessages = activeChat()?.messages.orEmpty()
                val llmHistory = buildLlmHistory(chatMessages, atts)

                val result = agent.runTurn(
                    provider = target.provider,
                    model = target.model,
                    apiKey = apiKey,
                    effort = effort,
                    lang = lang,
                    female = female,
                    userName = userName,
                    memories = memories.toList(),
                    useMemory = memoryEnabled,
                    webSearchEnabled = webSearchEnabled,
                    projectFolderUri = activeProject()?.folderUri,
                    history = llmHistory,
                    onStatus = { st, lbl ->
                        sphereState = st
                        statusLabel = lbl
                    }
                )

                result.savedMemories.forEach { addMemory(it) }
                result.createdArtifacts.forEach { art ->
                    artifacts.add(0, art)
                    autoUploadArtifactToDrive(art)
                }

                val firstArtId = result.createdArtifacts.firstOrNull()?.id
                val reply = result.finalText.ifBlank {
                    if (lang == "en") "Done." else "Готово."
                }
                appendMessage(chatId, ChatMessage(role = "assistant", text = reply, artifactId = firstArtId))
                result.createdArtifacts.drop(1).forEach { extraArt ->
                    appendMessage(
                        chatId,
                        ChatMessage(role = "assistant", text = extraArt.title, artifactId = extraArt.id)
                    )
                }
                if (fromAssistOverlay) assistReply = reply

                sphereState = NexState.SPEAKING
                statusLabel = t("speaking")
                if (autoSpeak || fromAssistOverlay) {
                    voiceManager.speak(reply, lang, voice, speechRate)
                }
            } catch (_: CancellationException) {
                val cancelled = if (lang == "en") "Stopped." else "Остановлено."
                appendMessage(chatId, ChatMessage(role = "system", text = cancelled))
                if (fromAssistOverlay) assistReply = cancelled
            } catch (e: Exception) {
                val errMsg = "${if (lang == "en") "Error" else "Ошибка"}: ${e.message ?: "unknown"}"
                appendMessage(chatId, ChatMessage(role = "assistant", text = errMsg))
                if (fromAssistOverlay) assistReply = errMsg
            } finally {
                activeTurnJob = null
                isBusy = false
                sphereState = NexState.IDLE
                statusLabel = t("ready")
                persist()
            }
        }
    }

    private fun buildLlmHistory(
        messages: List<ChatMessage>,
        latestAttachments: List<LocalAttachment>
    ): List<LlmTurnMessage> {
        val recent = messages.filter { it.role == "user" || it.role == "assistant" }.takeLast(24)
        return recent.mapIndexed { idx, m ->
            val isLastUser = idx == recent.lastIndex && m.role == "user"
            if (isLastUser && latestAttachments.isNotEmpty()) {
                val extraText = latestAttachments
                    .filter { !it.textPreview.isNullOrBlank() }
                    .joinToString("\n\n") { "[File: ${it.name}]\n${it.textPreview}" }
                val combinedText = listOf(m.text, extraText).filter { it.isNotBlank() }.joinToString("\n\n")
                val images = latestAttachments.mapNotNull { att ->
                    att.base64Image?.let { b64 -> att.mimeType to b64 }
                }
                LlmTurnMessage(role = "user", text = combinedText, imageAttachments = images)
            } else {
                LlmTurnMessage(role = m.role, text = m.text)
            }
        }
    }

    fun startVoiceInput(fromAssistOverlay: Boolean = false) {
        if (isBusy) return
        if (!Perms.has(ctx, android.Manifest.permission.RECORD_AUDIO)) {
            val msg = if (lang == "en") "Microphone permission is required in Settings -> Access." else "Нужно разрешение на микрофон в Настройках → Доступ."
            activeChatId?.let { appendMessage(it, ChatMessage(role = "system", text = msg)) }
            if (fromAssistOverlay) assistReply = msg
            return
        }
        voiceManager.stopSpeaking()
        isListening = true
        sphereState = NexState.LISTENING
        statusLabel = t("listening")
        if (fromAssistOverlay) assistTranscript = ""
        voiceManager.startListening(
            lang = lang,
            onPartial = { partial ->
                statusLabel = partial
                if (fromAssistOverlay) assistTranscript = partial
            },
            onResult = { recognized ->
                isListening = false
                sendUserMessage(recognized, fromAssistOverlay = fromAssistOverlay)
            },
            onError = { err ->
                isListening = false
                sphereState = NexState.IDLE
                statusLabel = err
                if (fromAssistOverlay) assistReply = err
            }
        )
    }

    fun stopVoiceInput() {
        isListening = false
        voiceManager.stopListening()
        if (!isBusy) {
            sphereState = NexState.IDLE
            statusLabel = t("ready")
        }
    }

    private fun appendMessage(chatId: String, msg: ChatMessage) {
        val idx = chats.indexOfFirst { it.id == chatId }
        if (idx >= 0) {
            val old = chats[idx]
            chats[idx] = old.copy(
                updatedAt = System.currentTimeMillis(),
                messages = old.messages + msg
            )
            persist()
        }
    }

    private fun currentPersistedState(): Store.PersistedState = Store.PersistedState(
        chats = chats.toList(),
        projects = projects.toList(),
        artifacts = artifacts.toList(),
        mediaItems = mediaItems.toList(),
        memories = memories.toList(),
        customModels = modelCatalog,
        activeChatId = activeChatId
    )

    fun persist() {
        val state = currentPersistedState()
        scope.launch(Dispatchers.IO) {
            store.saveState(state)
        }
        scheduleDriveStateSync()
    }
}
