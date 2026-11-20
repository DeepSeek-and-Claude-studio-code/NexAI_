package com.nex.assistant

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder

data class DriveSyncReport(
    val uploadedFiles: Int = 0,
    val downloadedFiles: Int = 0,
    val skippedFiles: Int = 0,
    val folderMode: String = "visible"
)

/**
 * Real Google Drive API v3 storage engine for Nex:
 * - Stores ALL user files directly on the user's Google Drive (15 GB+ free user quota):
 *   Visible mode (default): My Drive / Nex / {Vault, Media, Artifacts, Attachments}
 *   Hidden mode: appDataFolder (app-private space)
 * - Uses Resumable Chunked Uploads (4 MB chunks) so large videos & photos never OOM.
 * - Deduplicates via filename + size metadata so unchanged files are never re-uploaded.
 */
object GoogleDriveStorage {
    private const val CHUNK_SIZE = 4 * 1024 * 1024 // 4 MB (multiple of 256 KB required by Drive API)
    const val VAULT_NAME = "nex_state_vault.nexvault"

    data class DriveFileEntry(
        val id: String,
        val name: String,
        val size: Long,
        val mimeType: String,
        val category: String
    )

    private data class FolderSet(
        val space: String, // "drive" or "appDataFolder"
        val vaultParentId: String,
        val mediaParentId: String,
        val artifactsParentId: String,
        val attachmentsParentId: String
    )

    private fun resolveFolders(token: String, folderMode: String): FolderSet {
        if (folderMode == "hidden") {
            return FolderSet(
                space = "appDataFolder",
                vaultParentId = "appDataFolder",
                mediaParentId = "appDataFolder",
                artifactsParentId = "appDataFolder",
                attachmentsParentId = "appDataFolder"
            )
        }
        val rootId = ensureVisibleFolder(token, "Nex", parentId = null)
        val vaultId = ensureVisibleFolder(token, "Vault", parentId = rootId)
        val mediaId = ensureVisibleFolder(token, "Media", parentId = rootId)
        val artId = ensureVisibleFolder(token, "Artifacts", parentId = rootId)
        val attId = ensureVisibleFolder(token, "Attachments", parentId = rootId)
        return FolderSet(
            space = "drive",
            vaultParentId = vaultId,
            mediaParentId = mediaId,
            artifactsParentId = artId,
            attachmentsParentId = attId
        )
    }

    private fun ensureVisibleFolder(token: String, name: String, parentId: String?): String {
        val parentClause = if (parentId != null) " and '$parentId' in parents" else " and 'root' in parents"
        val q = enc("name = '${escQ(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false$parentClause")
        val res = LlmClient.getRaw(
            "https://www.googleapis.com/drive/v3/files?spaces=drive&q=$q&fields=files(id,name)",
            mapOf("Authorization" to "Bearer $token")
        )
        if (res.ok) {
            val files = JSONObject(res.body).optJSONArray("files")
            if (files != null && files.length() > 0) {
                return files.getJSONObject(0).getString("id")
            }
        }

        val meta = JSONObject()
            .put("name", name)
            .put("mimeType", "application/vnd.google-apps.folder")
        if (parentId != null) meta.put("parents", JSONArray().put(parentId))

        val created = LlmClient.postRaw(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            mapOf("Authorization" to "Bearer $token"),
            meta.toString()
        )
        if (!created.ok) error("Cannot create Drive folder '$name': HTTP ${created.code} ${created.body.take(180)}")
        return JSONObject(created.body).getString("id")
    }

    private fun listInParent(token: String, space: String, parentId: String, categoryFilter: String? = null): List<DriveFileEntry> {
        val qParts = mutableListOf("trashed = false", "mimeType != 'application/vnd.google-apps.folder'")
        if (space == "drive") qParts.add("'$parentId' in parents")
        if (categoryFilter != null) qParts.add("appProperties has { key='nexCategory' and value='$categoryFilter' }")
        val q = enc(qParts.joinToString(" and "))
        val out = mutableListOf<DriveFileEntry>()
        var pageToken = ""
        do {
            val pt = if (pageToken.isNotEmpty()) "&pageToken=${enc(pageToken)}" else ""
            val url = "https://www.googleapis.com/drive/v3/files?spaces=$space&q=$q&pageSize=100&fields=nextPageToken,files(id,name,size,mimeType,appProperties)$pt"
            val res = LlmClient.getRaw(url, mapOf("Authorization" to "Bearer $token"))
            if (!res.ok) break
            val obj = JSONObject(res.body)
            val arr = obj.optJSONArray("files")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val f = arr.getJSONObject(i)
                    val props = f.optJSONObject("appProperties")
                    out.add(
                        DriveFileEntry(
                            id = f.getString("id"),
                            name = f.optString("name"),
                            size = f.optString("size", "0").toLongOrNull() ?: 0L,
                            mimeType = f.optString("mimeType", "application/octet-stream"),
                            category = props?.optString("nexCategory") ?: ""
                        )
                    )
                }
            }
            pageToken = obj.optString("nextPageToken", "")
        } while (pageToken.isNotEmpty())
        return out
    }

    private fun findFileByName(token: String, space: String, parentId: String, name: String, category: String): DriveFileEntry? {
        val parentClause = if (space == "drive") " and '$parentId' in parents" else ""
        val q = enc("name = '${escQ(name)}' and trashed = false$parentClause")
        val res = LlmClient.getRaw(
            "https://www.googleapis.com/drive/v3/files?spaces=$space&q=$q&fields=files(id,name,size,mimeType,appProperties)",
            mapOf("Authorization" to "Bearer $token")
        )
        if (!res.ok) return null
        val arr = JSONObject(res.body).optJSONArray("files") ?: return null
        for (i in 0 until arr.length()) {
            val f = arr.getJSONObject(i)
            val cat = f.optJSONObject("appProperties")?.optString("nexCategory").orEmpty()
            if (space == "drive" || cat.isEmpty() || cat == category) {
                return DriveFileEntry(
                    id = f.getString("id"),
                    name = f.optString("name"),
                    size = f.optString("size", "0").toLongOrNull() ?: 0L,
                    mimeType = f.optString("mimeType", "application/octet-stream"),
                    category = cat
                )
            }
        }
        return null
    }

    /**
     * Resumable chunked upload of any local file (small or gigabyte-sized video) to Google Drive.
     */
    private fun uploadFileResumable(
        token: String,
        parentId: String,
        existingId: String?,
        remoteName: String,
        mimeType: String,
        category: String,
        file: File
    ) {
        val totalLen = file.length()
        val meta = JSONObject()
            .put("name", remoteName)
            .put("mimeType", mimeType)
            .put(
                "appProperties",
                JSONObject()
                    .put("nexCategory", category)
                    .put("nexSize", totalLen.toString())
            )
        if (existingId == null) meta.put("parents", JSONArray().put(parentId))

        val initUrl = if (existingId == null) {
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"
        } else {
            "https://www.googleapis.com/upload/drive/v3/files/$existingId?uploadType=resumable"
        }

        val sessionUri = initiateResumableSession(token, if (existingId == null) "POST" else "PATCH", initUrl, meta.toString(), mimeType, totalLen)
        if (totalLen == 0L) {
            putChunk(sessionUri, ByteArray(0), 0, 0L, 0L, mimeType)
            return
        }

        val buf = ByteArray(CHUNK_SIZE)
        var offset = 0L
        FileInputStream(file).use { fis ->
            while (offset < totalLen) {
                val read = readFully(fis, buf)
                if (read <= 0) break
                putChunk(sessionUri, buf, read, offset, totalLen, mimeType)
                offset += read
            }
        }
    }

    private fun uploadBytesResumable(
        token: String,
        parentId: String,
        existingId: String?,
        remoteName: String,
        mimeType: String,
        category: String,
        bytes: ByteArray
    ) {
        val totalLen = bytes.size.toLong()
        val meta = JSONObject()
            .put("name", remoteName)
            .put("mimeType", mimeType)
            .put(
                "appProperties",
                JSONObject()
                    .put("nexCategory", category)
                    .put("nexSize", totalLen.toString())
            )
        if (existingId == null) meta.put("parents", JSONArray().put(parentId))

        val initUrl = if (existingId == null) {
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"
        } else {
            "https://www.googleapis.com/upload/drive/v3/files/$existingId?uploadType=resumable"
        }
        val sessionUri = initiateResumableSession(token, if (existingId == null) "POST" else "PATCH", initUrl, meta.toString(), mimeType, totalLen)
        putChunk(sessionUri, bytes, bytes.size, 0L, totalLen, mimeType)
    }

    private fun initiateResumableSession(
        token: String,
        method: String,
        url: String,
        metaJson: String,
        mimeType: String,
        totalLen: Long
    ): String {
        val conn = URI.create(url).toURL().openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = method
            conn.doOutput = true
            conn.connectTimeout = 20000
            conn.readTimeout = 30000
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.setRequestProperty("X-Upload-Content-Type", mimeType)
            conn.setRequestProperty("X-Upload-Content-Length", totalLen.toString())
            conn.outputStream.use { it.write(metaJson.toByteArray(Charsets.UTF_8)) }
            if (conn.responseCode !in 200..299) {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                error("Drive init HTTP ${conn.responseCode}: ${err.take(200)}")
            }
            conn.getHeaderField("Location") ?: error("Drive did not return resumable Location header")
        } finally {
            conn.disconnect()
        }
    }

    private fun putChunk(sessionUri: String, data: ByteArray, len: Int, offset: Long, totalLen: Long, mimeType: String) {
        val conn = URI.create(sessionUri).toURL().openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "PUT"
            conn.doOutput = true
            conn.connectTimeout = 20000
            conn.readTimeout = 120000
            conn.setRequestProperty("Content-Type", mimeType)
            if (totalLen > 0L) {
                conn.setRequestProperty("Content-Range", "bytes $offset-${offset + len - 1}/$totalLen")
            }
            conn.setFixedLengthStreamingMode(len)
            conn.outputStream.use { it.write(data, 0, len) }
            val code = conn.responseCode
            if (code !in 200..299 && code != 308) {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                error("Drive chunk HTTP $code: ${err.take(200)}")
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun downloadFileToLocal(token: String, fileId: String, destFile: File) {
        val url = "https://www.googleapis.com/drive/v3/files/$fileId?alt=media"
        val conn = URI.create(url).toURL().openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "GET"
            conn.connectTimeout = 20000
            conn.readTimeout = 120000
            conn.setRequestProperty("Authorization", "Bearer $token")
            if (conn.responseCode !in 200..299) {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                error("Drive download HTTP ${conn.responseCode}: ${err.take(180)}")
            }
            destFile.parentFile?.mkdirs()
            val tmp = File(destFile.parentFile, "${destFile.name}.dl")
            conn.inputStream.use { input ->
                FileOutputStream(tmp).use { output -> input.copyTo(output, 64 * 1024) }
            }
            if (!tmp.renameTo(destFile)) {
                tmp.copyTo(destFile, overwrite = true)
                tmp.delete()
            }
        } finally {
            conn.disconnect()
        }
    }

    // --- High-level Sync Operations ---

    suspend fun uploadSingleLocalFile(
        store: Store,
        file: File,
        category: String, // "media" | "attachments"
        mimeType: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            if (!file.exists() || !file.isFile) return@runCatching
            val token = AccountSync.ensureFreshGoogleToken(store)
            val folders = resolveFolders(token, store.driveFolderMode)
            val parentId = if (category == "attachments") folders.attachmentsParentId else folders.mediaParentId
            val existing = findFileByName(token, folders.space, parentId, file.name, category)
            if (existing != null && existing.size == file.length()) return@runCatching
            uploadFileResumable(token, parentId, existing?.id, file.name, mimeType, category, file)
        }
    }

    suspend fun uploadSingleArtifact(store: Store, artifact: ArtifactItem): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val token = AccountSync.ensureFreshGoogleToken(store)
            val folders = resolveFolders(token, store.driveFolderMode)
            val (remoteName, mime) = artifactRemoteMeta(artifact)
            val bytes = artifact.content.toByteArray(Charsets.UTF_8)
            val existing = findFileByName(token, folders.space, folders.artifactsParentId, remoteName, "artifacts")
            uploadBytesResumable(token, folders.artifactsParentId, existing?.id, remoteName, mime, "artifacts", bytes)
        }
    }

    suspend fun uploadStateVaultOnly(
        store: Store,
        state: Store.PersistedState,
        passphrase: String
    ): Result<Long> = withContext(Dispatchers.IO) {
        runCatching {
            val token = AccountSync.ensureFreshGoogleToken(store)
            val folders = resolveFolders(token, store.driveFolderMode)
            val vaultBytes = AccountSync.buildEncryptedVaultBytes(store, state, passphrase, includeMediaFiles = false)
            val existing = findFileByName(token, folders.space, folders.vaultParentId, VAULT_NAME, "vault")
            uploadBytesResumable(
                token, folders.vaultParentId, existing?.id,
                VAULT_NAME, "application/octet-stream", "vault", vaultBytes
            )
            val now = System.currentTimeMillis()
            val prof = store.loadAccountProfile().copy(lastSyncAt = now)
            store.saveAccountProfile(prof)
            now
        }
    }

    /**
     * Full push: uploads encrypted state vault + ALL media files (photos & videos of any size),
     * ALL readable artifact files, and ALL local chat attachments individually to the user's Google Drive.
     */
    suspend fun pushAllToDrive(
        store: Store,
        state: Store.PersistedState,
        passphrase: String,
        onProgress: (String) -> Unit = {}
    ): Result<DriveSyncReport> = withContext(Dispatchers.IO) {
        runCatching {
            val token = AccountSync.ensureFreshGoogleToken(store)
            val mode = store.driveFolderMode
            val folders = resolveFolders(token, mode)
            var uploaded = 0
            var skipped = 0

            // 1. State Vault (keys, chats, settings, last model, metadata)
            onProgress("Vault…")
            val vaultBytes = AccountSync.buildEncryptedVaultBytes(store, state, passphrase, includeMediaFiles = false)
            val existingVault = findFileByName(token, folders.space, folders.vaultParentId, VAULT_NAME, "vault")
            uploadBytesResumable(token, folders.vaultParentId, existingVault?.id, VAULT_NAME, "application/octet-stream", "vault", vaultBytes)
            uploaded++

            // 2. All Media files (photos & videos)
            val remoteMedia = listInParent(token, folders.space, folders.mediaParentId, if (mode == "hidden") "media" else null)
                .associateBy { it.name }
            val localMediaFiles = store.mediaDir().listFiles()?.filter { it.isFile && !it.name.endsWith(".dl") }.orEmpty()
            localMediaFiles.forEachIndexed { idx, file ->
                val rem = remoteMedia[file.name]
                if (rem != null && rem.size == file.length()) {
                    skipped++
                } else {
                    onProgress("Media ${idx + 1}/${localMediaFiles.size}: ${file.name}")
                    uploadFileResumable(token, folders.mediaParentId, rem?.id, file.name, guessMime(file.name), "media", file)
                    uploaded++
                }
            }

            // 3. All Artifacts as readable files in Nex/Artifacts
            val remoteArts = listInParent(token, folders.space, folders.artifactsParentId, if (mode == "hidden") "artifacts" else null)
                .associateBy { it.name }
            state.artifacts.forEachIndexed { idx, art ->
                val (rName, mime) = artifactRemoteMeta(art)
                val bytes = art.content.toByteArray(Charsets.UTF_8)
                val rem = remoteArts[rName]
                if (rem != null && rem.size == bytes.size.toLong()) {
                    skipped++
                } else {
                    onProgress("Artifact ${idx + 1}/${state.artifacts.size}: ${art.title}")
                    uploadBytesResumable(token, folders.artifactsParentId, rem?.id, rName, mime, "artifacts", bytes)
                    uploaded++
                }
            }

            // 4. All Chat Attachments in Nex/Attachments
            val remoteAtts = listInParent(token, folders.space, folders.attachmentsParentId, if (mode == "hidden") "attachments" else null)
                .associateBy { it.name }
            val localAttFiles = store.attachmentsDir().listFiles()?.filter { it.isFile && !it.name.endsWith(".dl") }.orEmpty()
            localAttFiles.forEachIndexed { idx, file ->
                val rem = remoteAtts[file.name]
                if (rem != null && rem.size == file.length()) {
                    skipped++
                } else {
                    onProgress("Attachment ${idx + 1}/${localAttFiles.size}: ${file.name}")
                    uploadFileResumable(token, folders.attachmentsParentId, rem?.id, file.name, guessMime(file.name), "attachments", file)
                    uploaded++
                }
            }

            val now = System.currentTimeMillis()
            store.saveAccountProfile(store.loadAccountProfile().copy(lastSyncAt = now))
            DriveSyncReport(uploadedFiles = uploaded, skippedFiles = skipped, folderMode = mode)
        }
    }

    /**
     * Full pull: downloads encrypted state vault from user's Google Drive, restores keys/chats/settings/artifacts/last model,
     * and downloads ALL missing photos, videos, and attachments directly into local storage.
     */
    suspend fun pullAllFromDrive(
        store: Store,
        passphrase: String,
        onProgress: (String) -> Unit = {}
    ): Result<Pair<Store.PersistedState, DriveSyncReport>> = withContext(Dispatchers.IO) {
        runCatching {
            val token = AccountSync.ensureFreshGoogleToken(store)
            val mode = store.driveFolderMode
            val folders = resolveFolders(token, mode)

            // 1. Download & restore vault (with fallback to legacy v1 vault filename in appDataFolder)
            onProgress("Vault…")
            var vaultEntry = findFileByName(token, folders.space, folders.vaultParentId, VAULT_NAME, "vault")
            if (vaultEntry == null) {
                vaultEntry = findFileByName(token, "appDataFolder", "appDataFolder", "nex_account_vault_v1.nexvault", "vault")
            }
            val vEntry = vaultEntry ?: error("No Nex backup found on Google Drive yet.")
            val tmpVault = File(store.mediaDir().parentFile, "vault_pull.tmp")
            downloadFileToLocal(token, vEntry.id, tmpVault)
            val vaultBytes = tmpVault.readBytes()
            tmpVault.delete()

            val restoredState = AccountSync.restoreFromEncryptedVaultBytes(store, vaultBytes, passphrase)

            var downloaded = 1
            var skipped = 0

            // 2. Download all missing Media files (photos & videos)
            val remoteMedia = listInParent(token, folders.space, folders.mediaParentId, if (mode == "hidden") "media" else null)
            val mediaDir = store.mediaDir()
            val restoredPaths = mutableMapOf<String, String>()
            remoteMedia.forEachIndexed { idx, entry ->
                val safeName = File(entry.name).name
                val dest = File(mediaDir, safeName)
                if (dest.exists() && dest.length() == entry.size && entry.size > 0L) {
                    skipped++
                } else {
                    onProgress("Media ${idx + 1}/${remoteMedia.size}: $safeName")
                    downloadFileToLocal(token, entry.id, dest)
                    downloaded++
                }
                restoredPaths[safeName] = dest.absolutePath
            }

            // 3. Download all missing Chat Attachments
            val remoteAtts = listInParent(token, folders.space, folders.attachmentsParentId, if (mode == "hidden") "attachments" else null)
            val attDir = store.attachmentsDir()
            remoteAtts.forEachIndexed { idx, entry ->
                val safeName = File(entry.name).name
                val dest = File(attDir, safeName)
                if (dest.exists() && dest.length() == entry.size && entry.size > 0L) {
                    skipped++
                } else {
                    onProgress("File ${idx + 1}/${remoteAtts.size}: $safeName")
                    downloadFileToLocal(token, entry.id, dest)
                    downloaded++
                }
            }

            // Remap all MediaItem file paths to local mediaDir
            val remappedChats = restoredState.chats.map { c ->
                c.copy(messages = c.messages.map { m ->
                    val med = m.media
                    if (med != null) {
                        val fn = File(med.filePath).name
                        m.copy(media = med.copy(filePath = restoredPaths[fn] ?: File(mediaDir, fn).absolutePath))
                    } else m
                })
            }
            val remappedMedia = restoredState.mediaItems.map { med ->
                val fn = File(med.filePath).name
                med.copy(filePath = restoredPaths[fn] ?: File(mediaDir, fn).absolutePath)
            }
            val finalState = restoredState.copy(chats = remappedChats, mediaItems = remappedMedia)
            store.saveState(finalState)
            store.saveAccountProfile(store.loadAccountProfile().copy(lastSyncAt = System.currentTimeMillis()))

            finalState to DriveSyncReport(downloadedFiles = downloaded, skippedFiles = skipped, folderMode = mode)
        }
    }

    private fun artifactRemoteMeta(art: ArtifactItem): Pair<String, String> {
        val (ext, mime) = when (art.type) {
            ArtifactType.PRESENTATION -> "json" to "application/json"
            ArtifactType.TABLE -> "csv" to "text/csv"
            ArtifactType.HTML -> "html" to "text/html"
            ArtifactType.DOCUMENT -> "md" to "text/markdown"
        }
        val cleanTitle = art.title.replace(Regex("[^a-zA-Z0-9а-яА-ЯёЁ _-]+"), "_").trim().take(48).ifBlank { "artifact" }
        val shortId = art.id.take(8)
        return "${cleanTitle}_$shortId.$ext" to mime
    }

    fun guessMime(name: String): String = when (name.substringAfterLast('.', "").lowercase()) {
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "webp" -> "image/webp"
        "gif" -> "image/gif"
        "mp4" -> "video/mp4"
        "webm" -> "video/webm"
        "mov" -> "video/quicktime"
        "pdf" -> "application/pdf"
        "html", "htm" -> "text/html"
        "csv" -> "text/csv"
        "json" -> "application/json"
        "md" -> "text/markdown"
        "txt" -> "text/plain"
        else -> "application/octet-stream"
    }

    private fun readFully(fis: FileInputStream, buf: ByteArray): Int {
        var total = 0
        while (total < buf.size) {
            val r = fis.read(buf, total, buf.size - total)
            if (r < 0) break
            total += r
        }
        return total
    }

    private fun escQ(s: String): String = s.replace("\\", "\\\\").replace("'", "\\'")
    private fun enc(s: String): String = URLEncoder.encode(s, "UTF-8")
}
