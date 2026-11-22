package com.nex.assistant

import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class UnifiedSyncReport(
    val uploadedFiles: Int = 0,
    val downloadedFiles: Int = 0,
    val skippedFiles: Int = 0,
    val backend: String = "webdav"
)

object UnifiedStorage {
    private const val VAULT_NAME = GoogleDriveStorage.VAULT_NAME

    fun computeStats(store: Store, state: Store.PersistedState): StorageStats {
        val mediaFiles = store.mediaDir().listFiles()?.filter { it.isFile && !it.name.endsWith(".dl") }.orEmpty()
        val attFiles = store.attachmentsDir().listFiles()?.filter { it.isFile && !it.name.endsWith(".dl") }.orEmpty()
        val artBytes = state.artifacts.sumOf { it.content.toByteArray(Charsets.UTF_8).size.toLong() }
        return StorageStats(
            mediaCount = mediaFiles.size, mediaBytes = mediaFiles.sumOf { it.length() },
            artifactCount = state.artifacts.size, artifactBytes = artBytes,
            attachmentCount = attFiles.size, attachmentBytes = attFiles.sumOf { it.length() },
            chatCount = state.chats.size, keysCount = store.getAllApiKeys().values.count { it.isNotBlank() }
        )
    }

    fun isConfigured(store: Store): Boolean {
        val cfg = store.loadStorageConfig()
        return when (cfg.backend) {
            "webdav" -> cfg.webdavUrl.isNotBlank() && cfg.webdavUser.isNotBlank() && cfg.webdavPassword.isNotBlank()
            "s3" -> cfg.s3Endpoint.isNotBlank() && cfg.s3Bucket.isNotBlank() && cfg.s3AccessKeyId.isNotBlank() && cfg.s3SecretAccessKey.isNotBlank()
            else -> store.googleAccessToken.isNotBlank() || store.googleRefreshToken.isNotBlank()
        }
    }

    suspend fun testConnection(store: Store): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val cfg = store.loadStorageConfig()
            when (cfg.backend) {
                "webdav" -> {
                    require(cfg.webdavUrl.isNotBlank() && cfg.webdavUser.isNotBlank() && cfg.webdavPassword.isNotBlank()) { "Fill WebDAV URL, login and app password" }
                    val root = cfg.webdavRoot.ifBlank { "Nex" }
                    listOf(root, "$root/Vault", "$root/Media", "$root/Artifacts", "$root/Attachments").forEach { webdavEnsureDir(cfg, it) }
                    "WebDAV connected (${cfg.webdavUrl.trimEnd('/')}/$root)"
                }
                "s3" -> {
                    require(cfg.s3Endpoint.isNotBlank() && cfg.s3Bucket.isNotBlank() && cfg.s3AccessKeyId.isNotBlank() && cfg.s3SecretAccessKey.isNotBlank()) { "Fill S3 Endpoint, Bucket, Access Key ID and Secret" }
                    s3ListPrefix(cfg, "${cfg.s3Prefix.ifBlank { "Nex" }}/")
                    "S3 connected (${cfg.s3Bucket})"
                }
                else -> { AccountSync.ensureFreshGoogleToken(store); "Google Drive connected" }
            }
        }
    }

    suspend fun uploadStateVaultOnly(store: Store, state: Store.PersistedState, passphrase: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            if (!isConfigured(store)) return@runCatching
            val cfg = store.loadStorageConfig()
            if (cfg.backend == "google_drive") { GoogleDriveStorage.uploadStateVaultOnly(store, state, passphrase).getOrThrow(); return@runCatching }
            val vaultBytes = AccountSync.buildEncryptedVaultBytes(store, state, passphrase, includeMediaFiles = false)
            when (cfg.backend) {
                "webdav" -> { val r = cfg.webdavRoot.ifBlank { "Nex" }; webdavEnsureDir(cfg, "$r/Vault"); webdavPutBytes(cfg, "$r/Vault/$VAULT_NAME", vaultBytes, "application/octet-stream") }
                "s3" -> s3PutBytes(cfg, "${cfg.s3Prefix.trim('/').ifBlank { "Nex" }}/Vault/$VAULT_NAME", vaultBytes, "application/octet-stream")
            }
        }
    }

    suspend fun uploadSingleLocalFile(store: Store, file: File, category: String, mimeType: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            if (!file.exists() || !file.isFile || !isConfigured(store)) return@runCatching
            val cfg = store.loadStorageConfig()
            if (cfg.backend == "google_drive") { GoogleDriveStorage.uploadSingleLocalFile(store, file, category, mimeType).getOrThrow(); return@runCatching }
            val sub = if (category == "attachments") "Attachments" else "Media"
            when (cfg.backend) {
                "webdav" -> { val r = cfg.webdavRoot.ifBlank { "Nex" }; webdavEnsureDir(cfg, "$r/$sub"); webdavPutBytes(cfg, "$r/$sub/${file.name}", file.readBytes(), mimeType) }
                "s3" -> s3PutBytes(cfg, "${cfg.s3Prefix.trim('/').ifBlank { "Nex" }}/$sub/${file.name}", file.readBytes(), mimeType)
            }
        }
    }

    suspend fun uploadSingleArtifact(store: Store, artifact: ArtifactItem): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            if (!isConfigured(store)) return@runCatching
            val cfg = store.loadStorageConfig()
            if (cfg.backend == "google_drive") { GoogleDriveStorage.uploadSingleArtifact(store, artifact).getOrThrow(); return@runCatching }
            val (rName, mime) = artifactRemoteMeta(artifact)
            val bytes = artifact.content.toByteArray(Charsets.UTF_8)
            when (cfg.backend) {
                "webdav" -> { val r = cfg.webdavRoot.ifBlank { "Nex" }; webdavEnsureDir(cfg, "$r/Artifacts"); webdavPutBytes(cfg, "$r/Artifacts/$rName", bytes, mime) }
                "s3" -> s3PutBytes(cfg, "${cfg.s3Prefix.trim('/').ifBlank { "Nex" }}/Artifacts/$rName", bytes, mime)
            }
        }
    }

    suspend fun pushAll(store: Store, state: Store.PersistedState, passphrase: String, onProgress: (String) -> Unit = {}): Result<UnifiedSyncReport> = withContext(Dispatchers.IO) {
        runCatching {
            val cfg = store.loadStorageConfig()
            if (cfg.backend == "google_drive") {
                val r = GoogleDriveStorage.pushAllToDrive(store, state, passphrase, onProgress).getOrThrow()
                return@runCatching UnifiedSyncReport(uploadedFiles = r.uploadedFiles, skippedFiles = r.skippedFiles, backend = "google_drive")
            }
            val vaultBytes = AccountSync.buildEncryptedVaultBytes(store, state, passphrase, includeMediaFiles = false)
            var uploaded = 0; var skipped = 0
            val localMedia = store.mediaDir().listFiles()?.filter { it.isFile && !it.name.endsWith(".dl") }.orEmpty()
            val localAtts = store.attachmentsDir().listFiles()?.filter { it.isFile && !it.name.endsWith(".dl") }.orEmpty()
            if (cfg.backend == "webdav") {
                val root = cfg.webdavRoot.ifBlank { "Nex" }
                listOf(root, "$root/Vault", "$root/Media", "$root/Artifacts", "$root/Attachments").forEach { webdavEnsureDir(cfg, it) }
                onProgress("Vault…"); webdavPutBytes(cfg, "$root/Vault/$VAULT_NAME", vaultBytes, "application/octet-stream"); uploaded++
                val remMedia = webdavListDir(cfg, "$root/Media").associateBy { it.first }
                localMedia.forEach { f -> if (remMedia[f.name]?.second == f.length() && f.length() > 0L) skipped++ else { webdavPutBytes(cfg, "$root/Media/${f.name}", f.readBytes(), GoogleDriveStorage.guessMime(f.name)); uploaded++ } }
                val remArts = webdavListDir(cfg, "$root/Artifacts").associateBy { it.first }
                state.artifacts.forEach { art -> val (rn, mime) = artifactRemoteMeta(art); val b = art.content.toByteArray(Charsets.UTF_8); if (remArts[rn]?.second == b.size.toLong() && b.isNotEmpty()) skipped++ else { webdavPutBytes(cfg, "$root/Artifacts/$rn", b, mime); uploaded++ } }
                val remAtts = webdavListDir(cfg, "$root/Attachments").associateBy { it.first }
                localAtts.forEach { f -> if (remAtts[f.name]?.second == f.length() && f.length() > 0L) skipped++ else { webdavPutBytes(cfg, "$root/Attachments/${f.name}", f.readBytes(), GoogleDriveStorage.guessMime(f.name)); uploaded++ } }
            } else {
                val pfx = cfg.s3Prefix.trim('/').ifBlank { "Nex" }
                onProgress("Vault…"); s3PutBytes(cfg, "$pfx/Vault/$VAULT_NAME", vaultBytes, "application/octet-stream"); uploaded++
                val remMedia = s3ListPrefix(cfg, "$pfx/Media/").associateBy { it.first }
                localMedia.forEach { f -> if (remMedia[f.name]?.second == f.length() && f.length() > 0L) skipped++ else { s3PutBytes(cfg, "$pfx/Media/${f.name}", f.readBytes(), GoogleDriveStorage.guessMime(f.name)); uploaded++ } }
                val remArts = s3ListPrefix(cfg, "$pfx/Artifacts/").associateBy { it.first }
                state.artifacts.forEach { art -> val (rn, mime) = artifactRemoteMeta(art); val b = art.content.toByteArray(Charsets.UTF_8); if (remArts[rn]?.second == b.size.toLong() && b.isNotEmpty()) skipped++ else { s3PutBytes(cfg, "$pfx/Artifacts/$rn", b, mime); uploaded++ } }
                val remAtts = s3ListPrefix(cfg, "$pfx/Attachments/").associateBy { it.first }
                localAtts.forEach { f -> if (remAtts[f.name]?.second == f.length() && f.length() > 0L) skipped++ else { s3PutBytes(cfg, "$pfx/Attachments/${f.name}", f.readBytes(), GoogleDriveStorage.guessMime(f.name)); uploaded++ } }
            }
            store.saveAccountProfile(store.loadAccountProfile().copy(lastSyncAt = System.currentTimeMillis()))
            UnifiedSyncReport(uploadedFiles = uploaded, skippedFiles = skipped, backend = cfg.backend)
        }
    }

    suspend fun pullAll(store: Store, passphrase: String, onProgress: (String) -> Unit = {}): Result<Pair<Store.PersistedState, UnifiedSyncReport>> = withContext(Dispatchers.IO) {
        runCatching {
            val cfg = store.loadStorageConfig()
            if (cfg.backend == "google_drive") {
                val (st, rep) = GoogleDriveStorage.pullAllFromDrive(store, passphrase, onProgress).getOrThrow()
                return@runCatching st to UnifiedSyncReport(downloadedFiles = rep.downloadedFiles, skippedFiles = rep.skippedFiles, backend = "google_drive")
            }
            var downloaded = 0; var skipped = 0
            val restoredPaths = mutableMapOf<String, String>()
            val restoredState: Store.PersistedState
            if (cfg.backend == "webdav") {
                val root = cfg.webdavRoot.ifBlank { "Nex" }
                val vBytes = webdavGetBytes(cfg, "$root/Vault/$VAULT_NAME") ?: error("No backup found at $root/Vault/$VAULT_NAME")
                restoredState = AccountSync.restoreFromEncryptedVaultBytes(store, vBytes, passphrase); downloaded++
                webdavListDir(cfg, "$root/Media").forEach { (name, sz) -> val s = File(name).name; val d = File(store.mediaDir(), s); if (d.exists() && d.length() == sz && sz > 0L) skipped++ else webdavGetBytes(cfg, "$root/Media/$s")?.let { d.writeBytes(it); downloaded++ }; restoredPaths[s] = d.absolutePath }
                webdavListDir(cfg, "$root/Attachments").forEach { (name, sz) -> val s = File(name).name; val d = File(store.attachmentsDir(), s); if (d.exists() && d.length() == sz && sz > 0L) skipped++ else webdavGetBytes(cfg, "$root/Attachments/$s")?.let { d.writeBytes(it); downloaded++ } }
            } else {
                val pfx = cfg.s3Prefix.trim('/').ifBlank { "Nex" }
                val vBytes = s3GetBytes(cfg, "$pfx/Vault/$VAULT_NAME") ?: error("No backup found at s3://${cfg.s3Bucket}/$pfx/Vault/$VAULT_NAME")
                restoredState = AccountSync.restoreFromEncryptedVaultBytes(store, vBytes, passphrase); downloaded++
                s3ListPrefix(cfg, "$pfx/Media/").forEach { (name, sz) -> val s = File(name).name; val d = File(store.mediaDir(), s); if (d.exists() && d.length() == sz && sz > 0L) skipped++ else s3GetBytes(cfg, "$pfx/Media/$s")?.let { d.writeBytes(it); downloaded++ }; restoredPaths[s] = d.absolutePath }
                s3ListPrefix(cfg, "$pfx/Attachments/").forEach { (name, sz) -> val s = File(name).name; val d = File(store.attachmentsDir(), s); if (d.exists() && d.length() == sz && sz > 0L) skipped++ else s3GetBytes(cfg, "$pfx/Attachments/$s")?.let { d.writeBytes(it); downloaded++ } }
            }
            val mediaDir = store.mediaDir()
            val finalState = restoredState.copy(
                chats = restoredState.chats.map { c -> c.copy(messages = c.messages.map { m -> m.media?.let { med -> val fn = File(med.filePath).name; m.copy(media = med.copy(filePath = restoredPaths[fn] ?: File(mediaDir, fn).absolutePath)) } ?: m }) },
                mediaItems = restoredState.mediaItems.map { med -> val fn = File(med.filePath).name; med.copy(filePath = restoredPaths[fn] ?: File(mediaDir, fn).absolutePath) }
            )
            store.saveState(finalState)
            store.saveAccountProfile(store.loadAccountProfile().copy(lastSyncAt = System.currentTimeMillis()))
            finalState to UnifiedSyncReport(downloadedFiles = downloaded, skippedFiles = skipped, backend = cfg.backend)
        }
    }

    private fun webdavAuth(cfg: StorageConfig): String = "Basic " + Base64.encodeToString("${cfg.webdavUser}:${cfg.webdavPassword}".toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
    private fun webdavUrl(base: String, rel: String): String { val b = base.trimEnd('/'); val e = rel.split('/').filter { it.isNotEmpty() }.joinToString("/") { URLEncoder.encode(it, "UTF-8").replace("+", "%20") }; return if (e.isEmpty()) b else "$b/$e" }

    private fun webdavEnsureDir(cfg: StorageConfig, relDir: String) {
        var cur = ""
        for (p in relDir.split('/').filter { it.isNotEmpty() }) {
            cur = if (cur.isEmpty()) p else "$cur/$p"
            val conn = URI.create(webdavUrl(cfg.webdavUrl, cur) + "/").toURL().openConnection() as HttpURLConnection
            try { conn.requestMethod = "MKCOL"; conn.connectTimeout = 15000; conn.readTimeout = 20000; conn.setRequestProperty("Authorization", webdavAuth(cfg)); if (conn.responseCode !in setOf(200, 201, 204, 301, 405, 409)) error("WebDAV MKCOL $cur HTTP ${conn.responseCode}") } finally { conn.disconnect() }
        }
    }

    private fun webdavListDir(cfg: StorageConfig, relDir: String): List<Pair<String, Long>> {
        val conn = URI.create(webdavUrl(cfg.webdavUrl, relDir) + "/").toURL().openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "PROPFIND"; conn.doOutput = true; conn.connectTimeout = 15000; conn.readTimeout = 30000
            conn.setRequestProperty("Authorization", webdavAuth(cfg)); conn.setRequestProperty("Depth", "1"); conn.setRequestProperty("Content-Type", "application/xml; charset=utf-8")
            conn.outputStream.use { it.write("""<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>""".toByteArray(Charsets.UTF_8)) }
            if (conn.responseCode == 404) return emptyList()
            if (conn.responseCode !in 200..299 && conn.responseCode != 207) error("WebDAV PROPFIND HTTP ${conn.responseCode}")
            val xml = conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            val out = mutableListOf<Pair<String, Long>>()
            val respRx = Regex("<(?:[a-zA-Z0-9_-]+:)?response\\b[^>]*>([\\s\\S]*?)</(?:[a-zA-Z0-9_-]+:)?response>", RegexOption.IGNORE_CASE)
            val hrefRx = Regex("<(?:[a-zA-Z0-9_-]+:)?href\\b[^>]*>([^<]+)</(?:[a-zA-Z0-9_-]+:)?href>", RegexOption.IGNORE_CASE)
            val lenRx = Regex("<(?:[a-zA-Z0-9_-]+:)?getcontentlength\\b[^>]*>(\\d+)</(?:[a-zA-Z0-9_-]+:)?getcontentlength>", RegexOption.IGNORE_CASE)
            val colRx = Regex("<(?:[a-zA-Z0-9_-]+:)?collection\\s*/?>", RegexOption.IGNORE_CASE)
            var first = true
            for (m in respRx.findAll(xml)) {
                if (first) { first = false; continue }
                val block = m.groupValues[1]; if (colRx.containsMatchIn(block)) continue
                val seg = hrefRx.find(block)?.groupValues?.getOrNull(1)?.trimEnd('/')?.substringAfterLast('/') ?: continue
                val decoded = runCatching { java.net.URLDecoder.decode(seg, "UTF-8") }.getOrDefault(seg)
                val size = lenRx.find(block)?.groupValues?.getOrNull(1)?.toLongOrNull() ?: 0L
                if (decoded.isNotBlank()) out.add(decoded to size)
            }
            out
        } finally { conn.disconnect() }
    }

    private fun webdavPutBytes(cfg: StorageConfig, relPath: String, data: ByteArray, mimeType: String) {
        val conn = URI.create(webdavUrl(cfg.webdavUrl, relPath)).toURL().openConnection() as HttpURLConnection
        try { conn.requestMethod = "PUT"; conn.doOutput = true; conn.connectTimeout = 20000; conn.readTimeout = 120000; conn.setRequestProperty("Authorization", webdavAuth(cfg)); conn.setRequestProperty("Content-Type", mimeType); conn.setFixedLengthStreamingMode(data.size); conn.outputStream.use { it.write(data) }; if (conn.responseCode !in 200..299) error("WebDAV PUT $relPath HTTP ${conn.responseCode}") } finally { conn.disconnect() }
    }

    private fun webdavGetBytes(cfg: StorageConfig, relPath: String): ByteArray? {
        val conn = URI.create(webdavUrl(cfg.webdavUrl, relPath)).toURL().openConnection() as HttpURLConnection
        return try { conn.requestMethod = "GET"; conn.connectTimeout = 20000; conn.readTimeout = 120000; conn.setRequestProperty("Authorization", webdavAuth(cfg)); if (conn.responseCode == 404) return null; if (conn.responseCode !in 200..299) error("WebDAV GET $relPath HTTP ${conn.responseCode}"); conn.inputStream.use { it.readBytes() } } finally { conn.disconnect() }
    }

    private fun sha256Hex(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    private fun hmac(key: ByteArray, data: String): ByteArray { val mac = Mac.getInstance("HmacSHA256"); mac.init(SecretKeySpec(key, "HmacSHA256")); return mac.doFinal(data.toByteArray(Charsets.UTF_8)) }
    private fun s3EncodeKey(key: String): String = key.split('/').joinToString("/") { URLEncoder.encode(it, "UTF-8").replace("+", "%20") }

    private fun openSignedS3(cfg: StorageConfig, method: String, key: String, query: Map<String, String> = emptyMap(), payload: ByteArray = ByteArray(0), contentType: String? = null): HttpURLConnection {
        val ep = URI.create(cfg.s3Endpoint.trimEnd('/'))
        val host = if (ep.port > 0) "${ep.host}:${ep.port}" else ep.host
        val basePath = ep.path.orEmpty().trimEnd('/')
        val keyPart = if (key.isNotEmpty()) "/${s3EncodeKey(key)}" else ""
        val canonicalUri = "$basePath/${URLEncoder.encode(cfg.s3Bucket, "UTF-8").replace("+", "%20")}$keyPart".replace(Regex("/{2,}"), "/")
        val canonicalQuery = query.keys.sorted().joinToString("&") { k -> "${URLEncoder.encode(k, "UTF-8")}=${URLEncoder.encode(query[k].orEmpty(), "UTF-8").replace("+", "%20")}" }
        val amzDate = SimpleDateFormat("yyyyMMdd'T'HHmmss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date())
        val dateStamp = amzDate.substring(0, 8); val region = cfg.s3Region.ifBlank { "auto" }; val payloadHash = sha256Hex(payload)
        val headers = sortedMapOf("host" to host, "x-amz-content-sha256" to payloadHash, "x-amz-date" to amzDate)
        if (!contentType.isNullOrBlank()) headers["content-type"] = contentType
        val canonicalHeaders = headers.entries.joinToString("") { "${it.key}:${it.value}\n" }
        val signedHeaders = headers.keys.joinToString(";")
        val canonicalRequest = listOf(method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash).joinToString("\n")
        val scope = "$dateStamp/$region/s3/aws4_request"
        val stringToSign = listOf("AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest.toByteArray(Charsets.UTF_8))).joinToString("\n")
        val kSigning = hmac(hmac(hmac(hmac("AWS4${cfg.s3SecretAccessKey}".toByteArray(Charsets.UTF_8), dateStamp), region), "s3"), "aws4_request")
        val sig = hmac(kSigning, stringToSign).joinToString("") { "%02x".format(it) }
        val fullUrl = "${ep.scheme}://$host$canonicalUri${if (canonicalQuery.isNotEmpty()) "?$canonicalQuery" else ""}"
        val conn = URI.create(fullUrl).toURL().openConnection() as HttpURLConnection
        conn.requestMethod = method; conn.connectTimeout = 20000; conn.readTimeout = 120000
        headers.forEach { (k, v) -> if (k != "host") conn.setRequestProperty(k, v) }
        conn.setRequestProperty("Authorization", "AWS4-HMAC-SHA256 Credential=${cfg.s3AccessKeyId}/$scope, SignedHeaders=$signedHeaders, Signature=$sig")
        return conn
    }

    private fun s3ListPrefix(cfg: StorageConfig, prefix: String): List<Pair<String, Long>> {
        val conn = openSignedS3(cfg, "GET", "", mapOf("list-type" to "2", "prefix" to prefix))
        return try {
            if (conn.responseCode !in 200..299) error("S3 List HTTP ${conn.responseCode}")
            val xml = conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            val out = mutableListOf<Pair<String, Long>>()
            val cRx = Regex("<Contents>([\\s\\S]*?)</Contents>", RegexOption.IGNORE_CASE)
            val kRx = Regex("<Key>([^<]+)</Key>", RegexOption.IGNORE_CASE)
            val sRx = Regex("<Size>(\\d+)</Size>", RegexOption.IGNORE_CASE)
            for (m in cRx.findAll(xml)) {
                val blk = m.groupValues[1]; val fullKey = kRx.find(blk)?.groupValues?.getOrNull(1)?.replace("&amp;", "&") ?: continue
                val name = fullKey.removePrefix(prefix)
                if (name.isNotBlank() && !name.contains('/')) out.add(name to (sRx.find(blk)?.groupValues?.getOrNull(1)?.toLongOrNull() ?: 0L))
            }
            out
        } finally { conn.disconnect() }
    }

    private fun s3PutBytes(cfg: StorageConfig, key: String, data: ByteArray, mimeType: String) {
        val conn = openSignedS3(cfg, "PUT", key, payload = data, contentType = mimeType)
        try { conn.doOutput = true; conn.setFixedLengthStreamingMode(data.size); conn.outputStream.use { it.write(data) }; if (conn.responseCode !in 200..299) error("S3 PUT $key HTTP ${conn.responseCode}") } finally { conn.disconnect() }
    }

    private fun s3GetBytes(cfg: StorageConfig, key: String): ByteArray? {
        val conn = openSignedS3(cfg, "GET", key)
        return try { if (conn.responseCode == 404) return null; if (conn.responseCode !in 200..299) error("S3 GET $key HTTP ${conn.responseCode}"); conn.inputStream.use { it.readBytes() } } finally { conn.disconnect() }
    }

    private fun artifactRemoteMeta(art: ArtifactItem): Pair<String, String> {
        val (ext, mime) = when (art.type) { ArtifactType.PRESENTATION -> "json" to "application/json"; ArtifactType.TABLE -> "csv" to "text/csv"; ArtifactType.HTML -> "html" to "text/html"; ArtifactType.DOCUMENT -> "md" to "text/markdown" }
        return "${art.title.replace(Regex("[^a-zA-Z0-9а-яА-ЯёЁ _-]+"), "_").trim().take(48).ifBlank { "artifact" }}_${art.id.take(8)}.$ext" to mime
    }
}
