package com.nex.assistant

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Per-account local storage:
 * - API keys, mail secrets, OAuth tokens, and email password hashes are encrypted with Android Keystore (AES-256-GCM).
 * - Each signed-in account (Email or Google) has its own isolated state file and settings namespace,
 *   saving API keys, chats, generated/edited images & videos, artifacts, settings, and last selected model.
 */
class Store(private val ctx: Context) {
    private val metaSp = ctx.getSharedPreferences("nex_accounts_meta_v3", Context.MODE_PRIVATE)

    var activeAccountId: String
        get() = metaSp.getString("active_account_id", "guest") ?: "guest"
        set(v) { metaSp.edit().putString("active_account_id", v).apply() }

    private fun accountSp() =
        ctx.getSharedPreferences("nex_acc_${safeId(activeAccountId)}", Context.MODE_PRIVATE)

    private fun stateFile(): File =
        File(ctx.filesDir, "nex_state_${safeId(activeAccountId)}.json")

    fun mediaDir(): File = File(ctx.filesDir, "media").apply { mkdirs() }
    fun attachmentsDir(): File = File(ctx.filesDir, "attachments").apply { mkdirs() }

    private fun safeId(raw: String): String {
        if (raw == "guest") return "guest"
        val digest = MessageDigest.getInstance("SHA-256").digest(raw.lowercase().toByteArray(Charsets.UTF_8))
        return digest.take(12).joinToString("") { "%02x".format(it) }
    }

    // --- Account Registry (Email / Google) ---

    fun loadAccountProfile(): AccountProfile {
        val sp = accountSp()
        return AccountProfile(
            id = activeAccountId,
            authType = sp.getString("acc_auth_type", if (activeAccountId == "guest") "guest" else "email") ?: "guest",
            email = sp.getString("acc_email", "") ?: "",
            displayName = sp.getString("acc_display_name", "") ?: "",
            googleClientId = metaSp.getString("google_client_id", "") ?: "",
            syncPassphraseHint = sp.getString("acc_sync_hint", "") ?: "",
            lastSyncAt = sp.getLong("acc_last_sync", 0L),
            driveConnected = googleAccessToken.isNotBlank() || googleRefreshToken.isNotBlank(),
            driveAutoSync = sp.getBoolean("drive_auto_sync", true),
            driveFolderMode = sp.getString("drive_folder_mode", "visible") ?: "visible"
        )
    }

    fun saveAccountProfile(profile: AccountProfile) {
        activeAccountId = profile.id
        metaSp.edit().putString("google_client_id", profile.googleClientId.trim()).apply()
        accountSp().edit()
            .putString("acc_auth_type", profile.authType)
            .putString("acc_email", profile.email.trim())
            .putString("acc_display_name", profile.displayName.trim())
            .putString("acc_sync_hint", profile.syncPassphraseHint.trim())
            .putLong("acc_last_sync", profile.lastSyncAt)
            .putBoolean("drive_auto_sync", profile.driveAutoSync)
            .putString("drive_folder_mode", profile.driveFolderMode)
            .apply()
    }

    fun getEmailPasswordRecord(email: String): String =
        decrypt(metaSp.getString("email_pwd_${safeId(email.trim().lowercase())}", null))

    fun setEmailPasswordRecord(email: String, record: String) {
        metaSp.edit().putString("email_pwd_${safeId(email.trim().lowercase())}", encrypt(record)).apply()
    }

    var googleAccessToken: String
        get() = decrypt(accountSp().getString("google_access_token", null))
        set(v) {
            if (v.isBlank()) accountSp().edit().remove("google_access_token").apply()
            else accountSp().edit().putString("google_access_token", encrypt(v)).apply()
        }

    var googleRefreshToken: String
        get() = decrypt(accountSp().getString("google_refresh_token", null))
        set(v) {
            if (v.isBlank()) accountSp().edit().remove("google_refresh_token").apply()
            else accountSp().edit().putString("google_refresh_token", encrypt(v)).apply()
        }

    var googleClientId: String
        get() = metaSp.getString("google_client_id", "") ?: ""
        set(v) { metaSp.edit().putString("google_client_id", v.trim()).apply() }

    var drivePassphrase: String
        get() = decrypt(accountSp().getString("drive_passphrase", null))
        set(v) {
            if (v.isBlank()) accountSp().edit().remove("drive_passphrase").apply()
            else accountSp().edit().putString("drive_passphrase", encrypt(v.trim())).apply()
        }

    var driveAutoSync: Boolean
        get() = accountSp().getBoolean("drive_auto_sync", true)
        set(v) { accountSp().edit().putBoolean("drive_auto_sync", v).apply() }

    var driveFolderMode: String
        get() = accountSp().getString("drive_folder_mode", "visible") ?: "visible"
        set(v) { accountSp().edit().putString("drive_folder_mode", v).apply() }

    // --- Per-Account Settings & Last Selected Model ---

    var onboarded: Boolean
        get() = metaSp.getBoolean("onboarded", false)
        set(v) { metaSp.edit().putBoolean("onboarded", v).apply() }

    var lang: String
        get() = accountSp().getString("lang", "ru") ?: "ru"
        set(v) { accountSp().edit().putString("lang", v).apply() }

    var voice: String
        get() = accountSp().getString("voice", "m") ?: "m"
        set(v) { accountSp().edit().putString("voice", v).apply() }

    var speechRate: Float
        get() = accountSp().getFloat("speech_rate", 1.0f)
        set(v) { accountSp().edit().putFloat("speech_rate", v.coerceIn(0.7f, 1.4f)).apply() }

    var autoSpeak: Boolean
        get() = accountSp().getBoolean("auto_speak", false)
        set(v) { accountSp().edit().putBoolean("auto_speak", v).apply() }

    var wakeWordEnabled: Boolean
        get() = accountSp().getBoolean("wake_word_enabled", false)
        set(v) { accountSp().edit().putBoolean("wake_word_enabled", v).apply() }

    var userName: String
        get() = accountSp().getString("user_name", "") ?: ""
        set(v) { accountSp().edit().putString("user_name", v).apply() }

    var selectedProfileId: String?
        get() {
            val raw = accountSp().getString("nex_profile", NexProfile.QUARK.id)
            return if (raw.isNullOrEmpty()) null else NexProfile.fromId(raw)?.id
        }
        set(v) {
            if (v == null) accountSp().edit().putString("nex_profile", "").apply()
            else accountSp().edit().putString("nex_profile", v).apply()
        }

    var manualProvider: String
        get() = accountSp().getString("provider", "Gemini") ?: "Gemini"
        set(v) { accountSp().edit().putString("provider", v).apply() }

    var manualModel: String
        get() = accountSp().getString("model", null) ?: LlmClient.DEFAULT_MODELS.getValue("Gemini").first()
        set(v) { accountSp().edit().putString("model", v).apply() }

    var imageModel: String
        get() = accountSp().getString("image_model", "gemini-nano-banana-2.1") ?: "gemini-nano-banana-2.1"
        set(v) { accountSp().edit().putString("image_model", v).apply() }

    var videoModel: String
        get() = accountSp().getString("video_model", "gemini-omni-1.1-flash") ?: "gemini-omni-1.1-flash"
        set(v) { accountSp().edit().putString("video_model", v).apply() }

    var lastGenMode: GenMode?
        get() = GenMode.fromId(accountSp().getString("last_gen_mode", null))
        set(v) {
            if (v == null) accountSp().edit().remove("last_gen_mode").apply()
            else accountSp().edit().putString("last_gen_mode", v.id).apply()
        }

    var effort: Effort
        get() = Effort.fromId(accountSp().getString("effort", Effort.MEDIUM.id))
        set(v) { accountSp().edit().putString("effort", v.id).apply() }

    var memoryEnabled: Boolean
        get() = accountSp().getBoolean("mem_enabled", true)
        set(v) { accountSp().edit().putBoolean("mem_enabled", v).apply() }

    var memoryAutoSave: Boolean
        get() = accountSp().getBoolean("mem_auto", true)
        set(v) { accountSp().edit().putBoolean("mem_auto", v).apply() }

    var confirmSensitiveActions: Boolean
        get() = accountSp().getBoolean("confirm_sensitive", true)
        set(v) { accountSp().edit().putBoolean("confirm_sensitive", v).apply() }

    fun getApiKey(provider: String): String = decrypt(accountSp().getString("key_$provider", null))

    fun setApiKey(provider: String, value: String) {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) accountSp().edit().remove("key_$provider").apply()
        else accountSp().edit().putString("key_$provider", encrypt(trimmed)).apply()
    }

    fun getAllApiKeys(): Map<String, String> =
        LlmClient.PROVIDERS.associateWith { getApiKey(it) }

    fun loadMailConfig(): MailConfig {
        val sp = accountSp()
        return MailConfig(
            mode = sp.getString("mail_mode", "imap") ?: "imap",
            email = sp.getString("mail_email", "") ?: "",
            imapHost = sp.getString("mail_imap_host", "imap.gmail.com") ?: "imap.gmail.com",
            imapPort = sp.getInt("mail_imap_port", 993),
            smtpHost = sp.getString("mail_smtp_host", "smtp.gmail.com") ?: "smtp.gmail.com",
            smtpPort = sp.getInt("mail_smtp_port", 465),
            useStartTls = sp.getBoolean("mail_starttls", false),
            password = decrypt(sp.getString("mail_password", null)),
            oauthAccessToken = decrypt(sp.getString("mail_oauth_token", null)),
            oauthClientId = sp.getString("mail_oauth_client_id", "") ?: ""
        )
    }

    fun saveMailConfig(cfg: MailConfig) {
        accountSp().edit()
            .putString("mail_mode", cfg.mode)
            .putString("mail_email", cfg.email.trim())
            .putString("mail_imap_host", cfg.imapHost.trim())
            .putInt("mail_imap_port", cfg.imapPort)
            .putString("mail_smtp_host", cfg.smtpHost.trim())
            .putInt("mail_smtp_port", cfg.smtpPort)
            .putBoolean("mail_starttls", cfg.useStartTls)
            .putString("mail_password", if (cfg.password.isEmpty()) null else encrypt(cfg.password))
            .putString("mail_oauth_token", if (cfg.oauthAccessToken.isEmpty()) null else encrypt(cfg.oauthAccessToken))
            .putString("mail_oauth_client_id", cfg.oauthClientId.trim())
            .apply()
    }

    data class PersistedState(
        val chats: List<ChatSession> = emptyList(),
        val projects: List<ProjectItem> = emptyList(),
        val artifacts: List<ArtifactItem> = emptyList(),
        val mediaItems: List<MediaItem> = emptyList(),
        val memories: List<String> = emptyList(),
        val customModels: Map<String, List<String>> = emptyMap(),
        val activeChatId: String? = null
    )

    fun loadState(): PersistedState {
        val f = stateFile()
        if (!f.exists()) return PersistedState()
        return runCatching { parseStateJson(JSONObject(f.readText(Charsets.UTF_8))) }
            .getOrElse { PersistedState() }
    }

    fun parseStateJson(root: JSONObject): PersistedState {
        val chats = mutableListOf<ChatSession>()
        val cArr = root.optJSONArray("chats") ?: JSONArray()
        for (i in 0 until cArr.length()) {
            val co = cArr.getJSONObject(i)
            val msgs = mutableListOf<ChatMessage>()
            val mArr = co.optJSONArray("messages") ?: JSONArray()
            for (j in 0 until mArr.length()) {
                val mo = mArr.getJSONObject(j)
                val atts = mutableListOf<String>()
                val aArr = mo.optJSONArray("attachmentNames") ?: JSONArray()
                for (k in 0 until aArr.length()) atts.add(aArr.getString(k))
                val media = mo.optJSONObject("media")?.let { parseMediaObj(it) }
                msgs.add(
                    ChatMessage(
                        id = mo.optString("id"),
                        role = mo.optString("role"),
                        text = mo.optString("text"),
                        timestamp = mo.optLong("timestamp"),
                        attachmentNames = atts,
                        artifactId = mo.optString("artifactId").takeIf { it.isNotEmpty() },
                        media = media
                    )
                )
            }
            chats.add(
                ChatSession(
                    id = co.optString("id"),
                    title = co.optString("title"),
                    projectId = co.optString("projectId").takeIf { it.isNotEmpty() },
                    updatedAt = co.optLong("updatedAt"),
                    messages = msgs
                )
            )
        }

        val projects = mutableListOf<ProjectItem>()
        val pArr = root.optJSONArray("projects") ?: JSONArray()
        for (i in 0 until pArr.length()) {
            val po = pArr.getJSONObject(i)
            projects.add(
                ProjectItem(
                    id = po.optString("id"),
                    name = po.optString("name"),
                    description = po.optString("description"),
                    folderUri = po.optString("folderUri").takeIf { it.isNotEmpty() },
                    folderName = po.optString("folderName").takeIf { it.isNotEmpty() }
                )
            )
        }

        val artifacts = mutableListOf<ArtifactItem>()
        val arArr = root.optJSONArray("artifacts") ?: JSONArray()
        for (i in 0 until arArr.length()) {
            val ao = arArr.getJSONObject(i)
            artifacts.add(
                ArtifactItem(
                    id = ao.optString("id"),
                    type = ArtifactType.fromId(ao.optString("type")),
                    title = ao.optString("title"),
                    content = ao.optString("content"),
                    createdAt = ao.optLong("createdAt")
                )
            )
        }

        val mediaItems = mutableListOf<MediaItem>()
        val medArr = root.optJSONArray("mediaItems") ?: JSONArray()
        for (i in 0 until medArr.length()) {
            mediaItems.add(parseMediaObj(medArr.getJSONObject(i)))
        }

        val memories = mutableListOf<String>()
        val memArr = root.optJSONArray("memories") ?: JSONArray()
        for (i in 0 until memArr.length()) memories.add(memArr.getString(i))

        val customModels = mutableMapOf<String, List<String>>()
        val cmObj = root.optJSONObject("customModels")
        if (cmObj != null) {
            val keys = cmObj.keys()
            while (keys.hasNext()) {
                val p = keys.next()
                val arr = cmObj.optJSONArray(p) ?: continue
                val list = mutableListOf<String>()
                for (i in 0 until arr.length()) list.add(arr.getString(i))
                if (list.isNotEmpty()) customModels[p] = list
            }
        }

        val activeChatId = root.optString("activeChatId").takeIf { it.isNotEmpty() }
        return PersistedState(chats, projects, artifacts, mediaItems, memories, customModels, activeChatId)
    }

    fun serializeStateJson(state: PersistedState): JSONObject {
        val root = JSONObject()
        val cArr = JSONArray()
        state.chats.take(100).forEach { c ->
            val co = JSONObject()
                .put("id", c.id)
                .put("title", c.title)
                .put("projectId", c.projectId ?: "")
                .put("updatedAt", c.updatedAt)
            val mArr = JSONArray()
            c.messages.takeLast(200).forEach { m ->
                val mo = JSONObject()
                    .put("id", m.id)
                    .put("role", m.role)
                    .put("text", m.text)
                    .put("timestamp", m.timestamp)
                    .put("artifactId", m.artifactId ?: "")
                val aArr = JSONArray()
                m.attachmentNames.forEach { aArr.put(it) }
                mo.put("attachmentNames", aArr)
                m.media?.let { mo.put("media", serializeMediaObj(it)) }
                mArr.put(mo)
            }
            co.put("messages", mArr)
            cArr.put(co)
        }
        root.put("chats", cArr)

        val pArr = JSONArray()
        state.projects.forEach { p ->
            pArr.put(
                JSONObject()
                    .put("id", p.id)
                    .put("name", p.name)
                    .put("description", p.description)
                    .put("folderUri", p.folderUri ?: "")
                    .put("folderName", p.folderName ?: "")
            )
        }
        root.put("projects", pArr)

        val arArr = JSONArray()
        state.artifacts.take(100).forEach { a ->
            arArr.put(
                JSONObject()
                    .put("id", a.id)
                    .put("type", a.type.id)
                    .put("title", a.title)
                    .put("content", a.content)
                    .put("createdAt", a.createdAt)
            )
        }
        root.put("artifacts", arArr)

        val medArr = JSONArray()
        state.mediaItems.take(120).forEach { medArr.put(serializeMediaObj(it)) }
        root.put("mediaItems", medArr)

        val memArr = JSONArray()
        state.memories.forEach { memArr.put(it) }
        root.put("memories", memArr)

        val cmObj = JSONObject()
        state.customModels.forEach { (p, list) ->
            val arr = JSONArray()
            list.forEach { arr.put(it) }
            cmObj.put(p, arr)
        }
        root.put("customModels", cmObj)
        root.put("activeChatId", state.activeChatId ?: "")
        return root
    }

    private fun parseMediaObj(it: JSONObject): MediaItem = MediaItem(
        id = it.optString("id"),
        isVideo = it.optBoolean("isVideo"),
        filePath = it.optString("filePath"),
        modelName = it.optString("modelName"),
        prompt = it.optString("prompt"),
        createdAt = it.optLong("createdAt", System.currentTimeMillis())
    )

    private fun serializeMediaObj(med: MediaItem): JSONObject = JSONObject()
        .put("id", med.id)
        .put("isVideo", med.isVideo)
        .put("filePath", med.filePath)
        .put("modelName", med.modelName)
        .put("prompt", med.prompt)
        .put("createdAt", med.createdAt)

    @Synchronized
    fun saveState(state: PersistedState) {
        runCatching {
            val f = stateFile()
            val tmp = File(ctx.filesDir, "${f.name}.tmp")
            val json = serializeStateJson(state).toString()
            tmp.writeText(json, Charsets.UTF_8)
            if (!tmp.renameTo(f)) {
                f.writeText(json, Charsets.UTF_8)
                tmp.delete()
            }
        }
    }

    private fun secretKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey("nex_master_aes_key", null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(
                "nex_master_aes_key",
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return gen.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val bytes = cipher.iv + cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun decrypt(encoded: String?): String {
        if (encoded.isNullOrEmpty()) return ""
        return runCatching {
            val bytes = Base64.decode(encoded, Base64.NO_WRAP)
            if (bytes.size < 13) return ""
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, bytes, 0, 12))
            String(cipher.doFinal(bytes, 12, bytes.size - 12), Charsets.UTF_8)
        }.getOrDefault("")
    }
}
