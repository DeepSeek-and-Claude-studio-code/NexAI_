package com.nex.assistant

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Handles:
 * 1) Email + Password local registration/sign-in (PBKDF2-HMAC-SHA256, 100k iterations, random salt).
 * 2) Real Google Account OAuth 2.0 + PKCE sign-in (fetches Google profile & Drive appDataFolder scope).
 * 3) Full AES-256-GCM encrypted backup & sync of ALL API keys, chats, photos/videos, artifacts,
 *    settings, and last selected model (cross-compatible with Desktop .nexvault & Google Drive).
 */
object AccountSync {
    const val REDIRECT_URI = "com.nex.assistant:/oauth2redirect"
    private const val VAULT_FILENAME = "nex_account_vault_v1.nexvault"
    private const val PBKDF2_ITERATIONS = 100_000

    @Volatile
    private var pendingCodeVerifier: String? = null

    @Volatile
    private var pendingClientId: String? = null

    @Volatile
    private var pendingLinkDriveOnly: Boolean = false

    // --- Email Auth (PBKDF2-HMAC-SHA256) ---

    fun registerEmail(store: Store, email: String, password: String, displayName: String): Result<AccountProfile> {
        val cleanEmail = email.trim().lowercase()
        if (!cleanEmail.contains("@") || !cleanEmail.contains(".")) {
            return Result.failure(IllegalArgumentException("Invalid email address"))
        }
        if (password.length < 6) {
            return Result.failure(IllegalArgumentException("Password must be at least 6 characters"))
        }
        if (store.getEmailPasswordRecord(cleanEmail).isNotEmpty()) {
            return Result.failure(IllegalArgumentException("Account already exists. Tap Sign in."))
        }
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val hash = pbkdf2(password, salt)
        val record = Base64.encodeToString(salt, Base64.NO_WRAP) + ":" + Base64.encodeToString(hash, Base64.NO_WRAP)
        store.setEmailPasswordRecord(cleanEmail, record)

        val profile = AccountProfile(
            id = "email:$cleanEmail",
            authType = "email",
            email = cleanEmail,
            displayName = displayName.trim().ifBlank { cleanEmail.substringBefore("@") },
            googleClientId = store.googleClientId
        )
        store.saveAccountProfile(profile)
        return Result.success(profile)
    }

    fun signInEmail(store: Store, email: String, password: String): Result<AccountProfile> {
        val cleanEmail = email.trim().lowercase()
        val stored = store.getEmailPasswordRecord(cleanEmail)
        if (stored.isEmpty()) {
            return Result.failure(IllegalArgumentException("Account not found. Create an account first."))
        }
        val parts = stored.split(":")
        if (parts.size != 2) return Result.failure(IllegalStateException("Corrupted credential record"))
        val salt = Base64.decode(parts[0], Base64.NO_WRAP)
        val expected = Base64.decode(parts[1], Base64.NO_WRAP)
        val actual = pbkdf2(password, salt)
        if (!MessageDigest.isEqual(expected, actual)) {
            return Result.failure(IllegalArgumentException("Incorrect password"))
        }
        store.activeAccountId = "email:$cleanEmail"
        val existing = store.loadAccountProfile()
        val profile = existing.copy(
            id = "email:$cleanEmail",
            authType = "email",
            email = cleanEmail,
            displayName = existing.displayName.ifBlank { cleanEmail.substringBefore("@") }
        )
        store.saveAccountProfile(profile)
        return Result.success(profile)
    }

    // --- Google Account OAuth 2.0 + PKCE ---

    fun launchGoogleSignIn(ctx: Context, clientId: String, linkDriveOnly: Boolean = false): Result<Unit> {
        val cleanId = clientId.trim()
        if (cleanId.isEmpty()) {
            return Result.failure(IllegalArgumentException("Enter your Google Cloud Android OAuth Client ID first"))
        }
        val verifierBytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val verifier = Base64.encodeToString(verifierBytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        val challengeBytes = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII))
        val challenge = Base64.encodeToString(challengeBytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

        pendingCodeVerifier = verifier
        pendingClientId = cleanId
        pendingLinkDriveOnly = linkDriveOnly

        val scope = "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata"
        val authUrl = "https://accounts.google.com/o/oauth2/v2/auth" +
            "?client_id=${enc(cleanId)}" +
            "&redirect_uri=${enc(REDIRECT_URI)}" +
            "&response_type=code" +
            "&scope=${enc(scope)}" +
            "&code_challenge=${enc(challenge)}" +
            "&code_challenge_method=S256" +
            "&access_type=offline" +
            "&prompt=consent"

        return runCatching {
            ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(authUrl)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    suspend fun handleGoogleRedirect(store: Store, uri: Uri): Result<AccountProfile> = withContext(Dispatchers.IO) {
        val error = uri.getQueryParameter("error")
        if (!error.isNullOrBlank()) return@withContext Result.failure(IllegalStateException("Google OAuth error: $error"))
        val code = uri.getQueryParameter("code")
            ?: return@withContext Result.failure(IllegalStateException("Missing OAuth code"))
        val verifier = pendingCodeVerifier
            ?: return@withContext Result.failure(IllegalStateException("Missing PKCE verifier"))
        val clientId = pendingClientId ?: store.googleClientId

        val form = "code=${enc(code)}&client_id=${enc(clientId)}&redirect_uri=${enc(REDIRECT_URI)}&grant_type=authorization_code&code_verifier=${enc(verifier)}"
        val tokRes = postForm("https://oauth2.googleapis.com/token", form)
        if (!tokRes.ok) return@withContext Result.failure(IllegalStateException("Token exchange HTTP ${tokRes.code}: ${tokRes.body.take(200)}"))
        val tokObj = JSONObject(tokRes.body)
        val accessToken = tokObj.optString("access_token")
        val refreshToken = tokObj.optString("refresh_token")
        if (accessToken.isBlank()) return@withContext Result.failure(IllegalStateException("No access_token returned"))

        val userRes = LlmClient.getRaw("https://www.googleapis.com/oauth2/v3/userinfo", mapOf("Authorization" to "Bearer $accessToken"))
        if (!userRes.ok) return@withContext Result.failure(IllegalStateException("UserInfo HTTP ${userRes.code}"))
        val uObj = JSONObject(userRes.body)
        val email = uObj.optString("email", "")
        val name = uObj.optString("name", email.substringBefore("@"))
        val sub = uObj.optString("sub", email)

        val profile = if (pendingLinkDriveOnly && store.activeAccountId != "guest") {
            store.loadAccountProfile().copy(
                googleClientId = clientId,
                driveConnected = true
            )
        } else {
            AccountProfile(
                id = "google:$sub",
                authType = "google",
                email = email,
                displayName = name,
                googleClientId = clientId,
                driveConnected = true
            )
        }
        store.saveAccountProfile(profile)
        store.googleAccessToken = accessToken
        if (refreshToken.isNotBlank()) store.googleRefreshToken = refreshToken
        pendingCodeVerifier = null
        pendingLinkDriveOnly = false
        Result.success(profile)
    }

    suspend fun ensureFreshGoogleToken(store: Store): String = withContext(Dispatchers.IO) {
        val current = store.googleAccessToken
        val refresh = store.googleRefreshToken
        val clientId = store.googleClientId
        if (refresh.isBlank() || clientId.isBlank()) {
            if (current.isBlank()) error("Google session expired. Sign in with Google again.")
            return@withContext current
        }
        val form = "client_id=${enc(clientId)}&refresh_token=${enc(refresh)}&grant_type=refresh_token"
        val res = postForm("https://oauth2.googleapis.com/token", form)
        if (res.ok) {
            val fresh = JSONObject(res.body).optString("access_token")
            if (fresh.isNotBlank()) {
                store.googleAccessToken = fresh
                return@withContext fresh
            }
        }
        if (current.isNotBlank()) current else error("Failed to refresh Google access token")
    }

    // --- Full Encrypted Vault Build & Restore (Keys + Chats + Photos/Videos + Artifacts + Settings + Last Model) ---

    fun buildEncryptedVaultBytes(
        store: Store,
        state: Store.PersistedState,
        passphrase: String,
        includeMediaFiles: Boolean = true
    ): ByteArray {
        val pass = passphrase.trim().ifEmpty { store.activeAccountId + "|nex-vault" }
        val bundle = JSONObject()
        bundle.put("version", 1)
        bundle.put("exportedAt", System.currentTimeMillis())

        val settings = JSONObject()
            .put("lang", store.lang)
            .put("voice", store.voice)
            .put("speechRate", store.speechRate.toDouble())
            .put("autoSpeak", store.autoSpeak)
            .put("userName", store.userName)
            .put("selectedProfileId", store.selectedProfileId ?: "")
            .put("manualProvider", store.manualProvider)
            .put("manualModel", store.manualModel)
            .put("imageModel", store.imageModel)
            .put("videoModel", store.videoModel)
            .put("lastGenMode", store.lastGenMode?.id ?: "")
            .put("effort", store.effort.id)
            .put("memoryEnabled", store.memoryEnabled)
            .put("memoryAutoSave", store.memoryAutoSave)
            .put("confirmSensitiveActions", store.confirmSensitiveActions)
        bundle.put("settings", settings)

        val keysObj = JSONObject()
        store.getAllApiKeys().forEach { (p, k) -> if (k.isNotBlank()) keysObj.put(p, k) }
        bundle.put("apiKeys", keysObj)

        val mc = store.loadMailConfig()
        bundle.put(
            "mailConfig",
            JSONObject()
                .put("mode", mc.mode)
                .put("email", mc.email)
                .put("imapHost", mc.imapHost)
                .put("imapPort", mc.imapPort)
                .put("smtpHost", mc.smtpHost)
                .put("smtpPort", mc.smtpPort)
                .put("useStartTls", mc.useStartTls)
                .put("password", mc.password)
                .put("oauthAccessToken", mc.oauthAccessToken)
                .put("oauthClientId", mc.oauthClientId)
        )

        bundle.put("state", store.serializeStateJson(state))

        // Pack media bytes only for standalone offline .nexvault file exports;
        // Google Drive sync uploads every photo/video/attachment individually with no size cap.
        val mediaPayloads = JSONObject()
        if (includeMediaFiles) {
            var totalBytes = 0L
            val allMediaPaths = buildSet {
                state.mediaItems.forEach { add(it.filePath) }
                state.chats.forEach { c -> c.messages.forEach { m -> m.media?.filePath?.let { add(it) } } }
            }
            for (fp in allMediaPaths) {
                val file = File(fp)
                if (!file.exists() || !file.isFile) continue
                val len = file.length()
                if (len > 15_000_000L || totalBytes + len > 40_000_000L) continue
                val b64 = Base64.encodeToString(file.readBytes(), Base64.NO_WRAP)
                mediaPayloads.put(file.name, b64)
                totalBytes += len
            }
        }
        bundle.put("mediaFiles", mediaPayloads)

        val plainBytes = bundle.toString().toByteArray(Charsets.UTF_8)
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val keyBytes = pbkdf2(pass, salt)
        val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        val cipherText = cipher.doFinal(plainBytes)

        val envelope = JSONObject()
            .put("format", "nexvault-aes256gcm-v1")
            .put("salt", Base64.encodeToString(salt, Base64.NO_WRAP))
            .put("iv", Base64.encodeToString(iv, Base64.NO_WRAP))
            .put("data", Base64.encodeToString(cipherText, Base64.NO_WRAP))
        return envelope.toString().toByteArray(Charsets.UTF_8)
    }

    fun restoreFromEncryptedVaultBytes(
        store: Store,
        vaultBytes: ByteArray,
        passphrase: String
    ): Store.PersistedState {
        val pass = passphrase.trim().ifEmpty { store.activeAccountId + "|nex-vault" }
        val env = JSONObject(String(vaultBytes, Charsets.UTF_8))
        val salt = Base64.decode(env.getString("salt"), Base64.NO_WRAP)
        val iv = Base64.decode(env.getString("iv"), Base64.NO_WRAP)
        val cipherText = Base64.decode(env.getString("data"), Base64.NO_WRAP)
        val keyBytes = pbkdf2(pass, salt)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        val plain = String(cipher.doFinal(cipherText), Charsets.UTF_8)
        val bundle = JSONObject(plain)

        // Restore media files locally and remap paths
        val mediaDir = store.mediaDir()
        val restoredMap = mutableMapOf<String, String>()
        val mediaObj = bundle.optJSONObject("mediaFiles")
        if (mediaObj != null) {
            val names = mediaObj.keys()
            while (names.hasNext()) {
                val fname = names.next()
                val safeName = File(fname).name
                val target = File(mediaDir, safeName)
                val raw = Base64.decode(mediaObj.getString(fname), Base64.NO_WRAP)
                target.writeBytes(raw)
                restoredMap[safeName] = target.absolutePath
            }
        }

        // Restore settings & last selected model
        bundle.optJSONObject("settings")?.let { s ->
            store.lang = s.optString("lang", "ru")
            store.voice = s.optString("voice", "m")
            store.speechRate = s.optDouble("speechRate", 1.0).toFloat()
            store.autoSpeak = s.optBoolean("autoSpeak", false)
            store.userName = s.optString("userName", "")
            val pid = s.optString("selectedProfileId", "")
            store.selectedProfileId = pid.takeIf { it.isNotEmpty() }
            store.manualProvider = s.optString("manualProvider", "Gemini")
            store.manualModel = s.optString("manualModel", LlmClient.DEFAULT_MODELS.getValue("Gemini").first())
            store.imageModel = s.optString("imageModel", "gemini-nano-banana-2.1")
            store.videoModel = s.optString("videoModel", "gemini-omni-1.1-flash")
            store.lastGenMode = GenMode.fromId(s.optString("lastGenMode", ""))
            store.effort = Effort.fromId(s.optString("effort", "medium"))
            store.memoryEnabled = s.optBoolean("memoryEnabled", true)
            store.memoryAutoSave = s.optBoolean("memoryAutoSave", true)
            store.confirmSensitiveActions = s.optBoolean("confirmSensitiveActions", true)
        }

        // Restore API keys
        bundle.optJSONObject("apiKeys")?.let { ko ->
            val keys = ko.keys()
            while (keys.hasNext()) {
                val p = keys.next()
                store.setApiKey(p, ko.optString(p, ""))
            }
        }

        // Restore mail config
        bundle.optJSONObject("mailConfig")?.let { mo ->
            store.saveMailConfig(
                MailConfig(
                    mode = mo.optString("mode", "imap"),
                    email = mo.optString("email", ""),
                    imapHost = mo.optString("imapHost", "imap.gmail.com"),
                    imapPort = mo.optInt("imapPort", 993),
                    smtpHost = mo.optString("smtpHost", "smtp.gmail.com"),
                    smtpPort = mo.optInt("smtpPort", 465),
                    useStartTls = mo.optBoolean("useStartTls", false),
                    password = mo.optString("password", ""),
                    oauthAccessToken = mo.optString("oauthAccessToken", ""),
                    oauthClientId = mo.optString("oauthClientId", "")
                )
            )
        }

        val parsed = store.parseStateJson(bundle.getJSONObject("state"))
        // Remap restored media file paths to this device's mediaDir
        val remappedChats = parsed.chats.map { c ->
            c.copy(messages = c.messages.map { m ->
                val med = m.media
                if (med != null) {
                    val fn = File(med.filePath).name
                    val newPath = restoredMap[fn] ?: med.filePath
                    m.copy(media = med.copy(filePath = newPath))
                } else m
            })
        }
        val remappedMedia = parsed.mediaItems.map { med ->
            val fn = File(med.filePath).name
            med.copy(filePath = restoredMap[fn] ?: med.filePath)
        }
        val finalState = parsed.copy(chats = remappedChats, mediaItems = remappedMedia)
        store.saveState(finalState)
        return finalState
    }

    // --- Google Drive Full Storage Delegation ---

    suspend fun uploadToGoogleDrive(
        store: Store,
        state: Store.PersistedState,
        passphrase: String,
        onProgress: (String) -> Unit = {}
    ): Result<DriveSyncReport> = GoogleDriveStorage.pushAllToDrive(store, state, passphrase, onProgress)

    suspend fun downloadFromGoogleDrive(
        store: Store,
        passphrase: String,
        onProgress: (String) -> Unit = {}
    ): Result<Pair<Store.PersistedState, DriveSyncReport>> = GoogleDriveStorage.pullAllFromDrive(store, passphrase, onProgress)

    private fun pbkdf2(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, 256)
        return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    }

    private fun enc(s: String): String = URLEncoder.encode(s, "UTF-8")

    private fun postForm(url: String, formBody: String): LlmClient.HttpResult {
        val conn = URI.create(url).toURL().openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = 30000
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            conn.outputStream.use { it.write(formBody.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val ok = code in 200..299
            val text = (if (ok) conn.inputStream else conn.errorStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            LlmClient.HttpResult(ok, code, text)
        } finally {
            conn.disconnect()
        }
    }
}
