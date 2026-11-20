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
            ModelTarget("Gemini", "gemini-3.1-flash-lite"),
            ModelTarget("OpenAI", "gpt-6-luna"),
            ModelTarget("Claude", "claude-haiku-5-5"),
            ModelTarget("DeepSeek", "deepseek-flash"),
            ModelTarget("NVIDIA", "google/gemma-4-31b-it")
        )
    ),
    QUARK(
        id = "quark",
        title = "Nex Quark",
        descRu = "Золотая середина: ум и скорость",
        descEn = "The sweet spot: smart and fast",
        textRoutes = listOf(
            ModelTarget("Claude", "claude-sonnet-5-5"),
            ModelTarget("Gemini", "gemini-3.8-flash"),
            ModelTarget("OpenAI", "gpt-6.1-terra"),
            ModelTarget("DeepSeek", "deepseek-v4-pro"),
            ModelTarget("NVIDIA", "deepseek-ai/deepseek-v4.1-flash")
        )
    ),
    SEL(
        id = "sel",
        title = "Nex Sel",
        descRu = "Самый сильный для сложных задач",
        descEn = "The strongest for complex tasks",
        textRoutes = listOf(
            ModelTarget("Claude", "claude-opus-5-5"),
            ModelTarget("OpenAI", "gpt-6.2-astra"),
            ModelTarget("Gemini", "gemini-4-argon"),
            ModelTarget("DeepSeek", "deepseek-v4-pro"),
            ModelTarget("NVIDIA", "moonshotai/kimi-k2.6")
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

    fun resolveText(keys: Map<String, String>): ModelTarget? =
        textRoutes.firstOrNull { !keys[it.provider].isNullOrBlank() }

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
