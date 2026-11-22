package com.nex.assistant

import java.util.UUID

enum class Effort(val id: String, val ru: String, val en: String) {
    LOW("low", "Низкое", "Low"),
    MEDIUM("medium", "Среднее", "Medium"),
    HIGH("high", "Высокое", "High"),
    MAX("max", "Максимальное", "Maximum");

    fun label(lang: String): String = if (lang == "en") en else ru

    companion object {
        fun fromId(id: String?): Effort = entries.firstOrNull { it.id == id } ?: MEDIUM
    }
}

enum class GenMode(val id: String) {
    IMAGE("image"),
    VIDEO("video");

    companion object {
        fun fromId(id: String?): GenMode? = entries.firstOrNull { it.id == id }
    }
}

enum class ArtifactType(val id: String, val ru: String, val en: String) {
    PRESENTATION("presentation", "Презентация", "Presentation"),
    TABLE("table", "Таблица", "Table"),
    DOCUMENT("document", "Документ", "Document"),
    HTML("html", "HTML-страница", "HTML page");

    fun label(lang: String): String = if (lang == "en") en else ru

    companion object {
        fun fromId(id: String?): ArtifactType = when (id?.lowercase()) {
            "presentation", "ppt", "slides" -> PRESENTATION
            "table", "tbl", "csv", "spreadsheet" -> TABLE
            "html", "htm", "web" -> HTML
            else -> DOCUMENT
        }
    }
}

data class ModelTarget(val provider: String, val model: String)

enum class NexProfile(
    val id: String,
    val title: String,
    val descRu: String,
    val descEn: String,
    val isMedia: Boolean = false,
    val textRoutes: List<ModelTarget> = emptyList(),
    val imageRoutes: List<ModelTarget> = emptyList(),
    val videoRoutes: List<ModelTarget> = emptyList()
) {
    ATOM(
        id = "atom",
        title = "Nex Atom",
        descRu = "Быстрые ответы и простые задачи",
        descEn = "Fast answers and simple tasks",
        textRoutes = listOf(
            ModelTarget("Groq", "qwen/qwen3-32b"),
            ModelTarget("Cerebras", "qwen-3-32b"),
            ModelTarget("Gemini", "gemini-2.5-flash-lite"),
            ModelTarget("OpenRouter", "qwen/qwen3-coder:free"),
            ModelTarget("Mistral", "devstral-small-latest"),
            ModelTarget("DeepSeek", "deepseek-chat"),
            ModelTarget("Qwen", "qwen-turbo"),
            ModelTarget("OpenAI", "gpt-4.1-mini"),
            ModelTarget("Claude", "claude-3-5-haiku-latest"),
            ModelTarget("GitHub", "gpt-4o"),
            ModelTarget("xAI", "grok-3-mini"),
            ModelTarget("NVIDIA", "google/gemma-3-27b-it"),
            ModelTarget("Custom", "qwen2.5-coder:14b")
        )
    ),
    QUARK(
        id = "quark",
        title = "Nex Quark",
        descRu = "Золотая середина: ум и скорость",
        descEn = "The sweet spot: smart and fast",
        textRoutes = listOf(
            ModelTarget("Claude", "claude-sonnet-4-5"),
            ModelTarget("OpenRouter", "anthropic/claude-sonnet-4"),
            ModelTarget("Gemini", "gemini-2.5-flash"),
            ModelTarget("Mistral", "devstral-medium-latest"),
            ModelTarget("DeepSeek", "deepseek-chat"),
            ModelTarget("Qwen", "qwen3-coder-plus"),
            ModelTarget("OpenAI", "gpt-4.1"),
            ModelTarget("Cerebras", "qwen-3-coder-480b"),
            ModelTarget("Groq", "qwen/qwen3-32b"),
            ModelTarget("GitHub", "Codestral-2501"),
            ModelTarget("xAI", "grok-code-fast-1"),
            ModelTarget("NVIDIA", "qwen/qwen2.5-coder-32b-instruct"),
            ModelTarget("Custom", "qwen2.5-coder:14b")
        )
    ),
    SEL(
        id = "sel",
        title = "Nex Sel",
        descRu = "Самый сильный для сложных задач",
        descEn = "The strongest for complex tasks",
        textRoutes = listOf(
            ModelTarget("Claude", "claude-opus-4-1"),
            ModelTarget("OpenAI", "gpt-4.1"),
            ModelTarget("OpenRouter", "anthropic/claude-sonnet-4"),
            ModelTarget("Gemini", "gemini-2.5-pro"),
            ModelTarget("DeepSeek", "deepseek-reasoner"),
            ModelTarget("Qwen", "qwen3-coder-plus"),
            ModelTarget("Mistral", "codestral-latest"),
            ModelTarget("xAI", "grok-3"),
            ModelTarget("Cerebras", "qwen-3-coder-480b"),
            ModelTarget("GitHub", "DeepSeek-R1"),
            ModelTarget("Groq", "moonshotai/kimi-k2-instruct"),
            ModelTarget("NVIDIA", "deepseek-ai/deepseek-r1"),
            ModelTarget("Custom", "deepseek-r1:14b")
        )
    ),
    FOTON(
        id = "foton",
        title = "Nex Foton",
        descRu = "Картинки, фото и видео",
        descEn = "Images, photo & video",
        isMedia = true,
        imageRoutes = listOf(
            ModelTarget("Gemini", "gemini-nano-banana-2.1"),
            ModelTarget("OpenAI", "gpt-image-2.6-sunburst")
        ),
        videoRoutes = listOf(
            ModelTarget("Gemini", "gemini-omni-1.1-flash")
        )
    );

    fun desc(lang: String): String = if (lang == "en") descEn else descRu

    fun resolveText(
        keys: Map<String, String>,
        customBaseUrl: String = "",
        catalog: Map<String, List<String>> = emptyMap()
    ): ModelTarget? {
        val hit = textRoutes.firstOrNull { LlmClient.isProviderReady(it.provider, keys, customBaseUrl) } ?: return null
        return ModelTarget(hit.provider, LlmClient.pickBestModelForProvider(hit.provider, hit.model, catalog))
    }

    fun resolveMedia(mode: GenMode, keys: Map<String, String>): ModelTarget? {
        val routes = if (mode == GenMode.VIDEO) videoRoutes else imageRoutes
        return routes.firstOrNull { !keys[it.provider].isNullOrBlank() }
    }

    companion object {
        fun fromId(id: String?): NexProfile? = when (id?.lowercase()) {
            "atom", "etude", "lite" -> ATOM
            "quark", "ballad", "bal" -> QUARK
            "sel", "symphony", "max" -> SEL
            "foton", "canvas", "studio" -> FOTON
            else -> null
        }
    }
}

data class AccountProfile(
    val id: String = "guest",
    val authType: String = "guest", // "guest", "email", "google"
    val email: String = "",
    val displayName: String = "",
    val googleClientId: String = "",
    val syncPassphraseHint: String = "",
    val lastSyncAt: Long = 0L,
    val driveConnected: Boolean = false,
    val driveAutoSync: Boolean = true,
    val driveFolderMode: String = "visible" // "visible" (My Drive/Nex) | "hidden" (appDataFolder)
) {
    val isSignedIn: Boolean get() = authType == "email" || authType == "google"
}

data class LocalAttachment(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val mimeType: String,
    val uriString: String,
    val localPath: String? = null,
    val textPreview: String? = null,
    val base64Image: String? = null
)

data class MediaItem(
    val id: String = UUID.randomUUID().toString(),
    val isVideo: Boolean,
    val filePath: String,
    val modelName: String,
    val prompt: String,
    val createdAt: Long = System.currentTimeMillis()
)

data class ArtifactItem(
    val id: String = UUID.randomUUID().toString(),
    val type: ArtifactType,
    val title: String,
    val content: String,
    val createdAt: Long = System.currentTimeMillis()
)

data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String, // "user", "assistant", "system"
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val attachmentNames: List<String> = emptyList(),
    val artifactId: String? = null,
    val media: MediaItem? = null
)

data class ChatSession(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val projectId: String? = null,
    val updatedAt: Long = System.currentTimeMillis(),
    val messages: List<ChatMessage> = emptyList()
)

data class ProjectItem(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val description: String = "",
    val folderUri: String? = null,
    val instructions: String = "",
    val folderName: String? = null
)

data class MailConfig(
    val mode: String = "imap", // "imap" or "gmail_oauth"
    val email: String = "",
    val imapHost: String = "imap.gmail.com",
    val imapPort: Int = 993,
    val smtpHost: String = "smtp.gmail.com",
    val smtpPort: Int = 465,
    val useStartTls: Boolean = false,
    val password: String = "",
    val oauthAccessToken: String = "",
    val oauthClientId: String = ""
) {
    val isConfigured: Boolean
        get() = when (mode) {
            "gmail_oauth" -> oauthAccessToken.isNotBlank()
            else -> email.isNotBlank() && password.isNotBlank() && imapHost.isNotBlank()
        }
}

data class PendingConfirmation(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val details: String,
    val isPurchase: Boolean
)

enum class AppScreen {
    ONBOARDING, CHAT, PROJECTS, ARTIFACTS, ARTIFACT_VIEW, MEDIA_STUDIO, SETTINGS, ACCOUNT
}

enum class SettingsTab(val id: String) {
    AI("ai"), VOICE("voice"), MEMORY("memory"), ACCESS("access"), SAFETY("safety"), LANGUAGE("lang")
}


data class StorageConfig(
    val backend: String = "webdav",
    val webdavUrl: String = "",
    val webdavUser: String = "",
    val webdavPassword: String = "",
    val webdavRoot: String = "Nex",
    val s3Endpoint: String = "",
    val s3Region: String = "auto",
    val s3Bucket: String = "",
    val s3AccessKeyId: String = "",
    val s3SecretAccessKey: String = "",
    val s3Prefix: String = "Nex"
)

data class StorageStats(
    val mediaCount: Int = 0,
    val mediaBytes: Long = 0L,
    val artifactCount: Int = 0,
    val artifactBytes: Long = 0L,
    val attachmentCount: Int = 0,
    val attachmentBytes: Long = 0L,
    val chatCount: Int = 0,
    val keysCount: Int = 0
)


data class ProviderQuotaRow(
    val provider: String, val ready: Boolean, val priority: Int?,
    val cooldownSec: Int, val requestsToday: Int, val errorsToday: Int, val estTokensToday: Int
)

data class NexHubDevice(
    val id: String = "hub_living", val model: String = "Nex Hub Ultra", val name: String = "Nex Hub Ultra · Гостиная",
    val connected: Boolean = false, val wifiSsid: String = "", val activity: String = "Ожидает подключения",
    val character: String = "m", val brightness: Int = 75, val cameraTracking: Boolean = true,
    val volume: Int = 65, val audioService: String = "Яндекс Музыка", val nightDnd: Boolean = false,
    val keysSyncedAt: Long = 0L, val lastIntercom: String = ""
)

data class NexClipDevice(
    val name: String = "Nex AI Clip", val connected: Boolean = false, val battery: Int = 88,
    val freeStoragePct: Int = 74, val continuousNotes: Boolean = false, val privacyMute: Boolean = false
)

data class NexWatchDevice(
    val name: String = "Nex Watch", val connected: Boolean = false, val battery: Int = 82,
    val quickVoice: Boolean = true, val silentHints: Boolean = true, val shareHealthContext: Boolean = false,
    val hubMediaRemote: Boolean = true, val lastPulse: Int = 72, val lastSleepHours: Float = 7.4f
)

data class NexGlassesDevice(
    val name: String = "Nex AR Glasses", val connected: Boolean = false, val battery: Int = 69,
    val hudBrightness: Int = 60, val liveSubtitles: Boolean = false, val navHints: Boolean = true
)

data class EcosystemDevicesState(
    val hubs: List<NexHubDevice> = listOf(NexHubDevice()),
    val clip: NexClipDevice = NexClipDevice(),
    val watch: NexWatchDevice = NexWatchDevice(),
    val glasses: NexGlassesDevice = NexGlassesDevice()
)
