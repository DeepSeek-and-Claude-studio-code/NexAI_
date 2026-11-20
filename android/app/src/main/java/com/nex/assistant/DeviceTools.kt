package com.nex.assistant

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.AlarmClock
import android.provider.CalendarContract
import android.provider.ContactsContract
import android.provider.DocumentsContract
import android.provider.Telephony
import android.telephony.SmsManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Native Android tool implementations strictly gated by runtime permissions.
 */
object DeviceTools {
    private fun formatDate(ms: Long): String = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date(ms))

    suspend fun readCalendarEvents(ctx: Context, daysAhead: Int = 7): String = withContext(Dispatchers.IO) {
        if (!Perms.has(ctx, Manifest.permission.READ_CALENDAR)) {
            return@withContext "Permission denied: Calendar read permission is not granted."
        }
        val now = System.currentTimeMillis()
        val end = now + daysAhead.coerceIn(1, 30) * 86_400_000L
        val uri = CalendarContract.Instances.CONTENT_URI.buildUpon()
            .appendPath(now.toString())
            .appendPath(end.toString())
            .build()
        val proj = arrayOf(
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.EVENT_LOCATION
        )
        val lines = mutableListOf<String>()
        runCatching {
            ctx.contentResolver.query(uri, proj, null, null, "${CalendarContract.Instances.BEGIN} ASC")?.use { c ->
                while (c.moveToNext() && lines.size < 25) {
                    val title = c.getString(0) ?: "(untitled)"
                    val begin = formatDate(c.getLong(1))
                    val loc = c.getString(3)?.takeIf { it.isNotBlank() }?.let { " @ $it" } ?: ""
                    lines.add("- $begin: $title$loc")
                }
            }
        }.onFailure { return@withContext "Calendar query error: ${it.message}" }
        if (lines.isEmpty()) "No calendar events found in the next $daysAhead days."
        else lines.joinToString("\n")
    }

    suspend fun createCalendarEvent(
        ctx: Context,
        title: String,
        startEpochMs: Long,
        durationMinutes: Int = 60,
        description: String = ""
    ): String = withContext(Dispatchers.IO) {
        if (!Perms.has(ctx, Manifest.permission.WRITE_CALENDAR)) {
            return@withContext "Permission denied: Calendar write permission is not granted."
        }
        val calId = findWritableCalendarId(ctx) ?: return@withContext "No writable calendar found on device."
        val endMs = startEpochMs + durationMinutes.coerceIn(5, 720) * 60_000L
        val values = ContentValues().apply {
            put(CalendarContract.Events.CALENDAR_ID, calId)
            put(CalendarContract.Events.TITLE, title)
            put(CalendarContract.Events.DESCRIPTION, description)
            put(CalendarContract.Events.DTSTART, startEpochMs)
            put(CalendarContract.Events.DTEND, endMs)
            put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
        }
        return@withContext runCatching {
            val inserted = ctx.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
            val eventId = inserted?.lastPathSegment?.toLongOrNull()
            if (eventId != null) {
                val rem = ContentValues().apply {
                    put(CalendarContract.Reminders.EVENT_ID, eventId)
                    put(CalendarContract.Reminders.MINUTES, 15)
                    put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT)
                }
                runCatching { ctx.contentResolver.insert(CalendarContract.Reminders.CONTENT_URI, rem) }
            }
            "Calendar event '$title' created for ${formatDate(startEpochMs)}."
        }.getOrElse { "Failed to create calendar event: ${it.message}" }
    }

    private fun findWritableCalendarId(ctx: Context): Long? {
        val proj = arrayOf(CalendarContract.Calendars._ID, CalendarContract.Calendars.IS_PRIMARY)
        val sel = "${CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL} >= ${CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR}"
        var fallback: Long? = null
        ctx.contentResolver.query(CalendarContract.Calendars.CONTENT_URI, proj, sel, null, null)?.use { c ->
            while (c.moveToNext()) {
                val id = c.getLong(0)
                if (fallback == null) fallback = id
                if (c.getInt(1) == 1) return id
            }
        }
        return fallback
    }

    suspend fun searchContacts(ctx: Context, query: String): String = withContext(Dispatchers.IO) {
        if (!Perms.has(ctx, Manifest.permission.READ_CONTACTS)) {
            return@withContext "Permission denied: Contacts permission is not granted."
        }
        val results = mutableListOf<String>()
        val proj = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        )
        val sel = "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?"
        val args = arrayOf("%$query%")
        runCatching {
            ctx.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                proj, sel, args, null
            )?.use { c ->
                while (c.moveToNext() && results.size < 15) {
                    val name = c.getString(0) ?: ""
                    val num = c.getString(1) ?: ""
                    results.add("- $name: $num")
                }
            }
        }.onFailure { return@withContext "Contacts error: ${it.message}" }
        if (results.isEmpty()) "No contacts found matching '$query'."
        else results.distinct().joinToString("\n")
    }

    suspend fun readRecentSms(ctx: Context, limit: Int = 10): String = withContext(Dispatchers.IO) {
        if (!Perms.has(ctx, Manifest.permission.READ_SMS)) {
            return@withContext "Permission denied: SMS read permission is not granted."
        }
        val lines = mutableListOf<String>()
        val proj = arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE)
        runCatching {
            ctx.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                proj, null, null, "${Telephony.Sms.DATE} DESC"
            )?.use { c ->
                while (c.moveToNext() && lines.size < limit.coerceIn(1, 25)) {
                    val addr = c.getString(0) ?: "unknown"
                    val body = c.getString(1)?.replace("\n", " ") ?: ""
                    val dt = formatDate(c.getLong(2))
                    lines.add("- [$dt] $addr: $body")
                }
            }
        }.onFailure { return@withContext "SMS read error: ${it.message}" }
        if (lines.isEmpty()) "No incoming SMS messages found."
        else lines.joinToString("\n")
    }

    suspend fun sendSms(ctx: Context, phoneNumber: String, message: String): String = withContext(Dispatchers.IO) {
        if (!Perms.has(ctx, Manifest.permission.SEND_SMS)) {
            return@withContext "Permission denied: SMS send permission is not granted."
        }
        return@withContext runCatching {
            val smsManager = if (Build.VERSION.SDK_INT >= 31) {
                ctx.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            } ?: error("SmsManager unavailable")
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            }
            "SMS sent to $phoneNumber."
        }.getOrElse { "SMS send failed: ${it.message}" }
    }

    fun makePhoneCall(ctx: Context, phoneNumber: String): String {
        val clean = phoneNumber.trim()
        val hasCall = Perms.has(ctx, Manifest.permission.CALL_PHONE)
        val action = if (hasCall) Intent.ACTION_CALL else Intent.ACTION_DIAL
        val intent = Intent(action, Uri.parse("tel:$clean")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return runCatching {
            ctx.startActivity(intent)
            if (hasCall) "Calling $clean." else "Opened dialer for $clean (CALL_PHONE not granted)."
        }.getOrElse { "Call failed: ${it.message}" }
    }

    fun setAlarm(ctx: Context, hour: Int, minute: Int, message: String): String {
        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
            putExtra(AlarmClock.EXTRA_HOUR, hour.coerceIn(0, 23))
            putExtra(AlarmClock.EXTRA_MINUTES, minute.coerceIn(0, 59))
            putExtra(AlarmClock.EXTRA_MESSAGE, message)
            putExtra(AlarmClock.EXTRA_SKIP_UI, false)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return runCatching {
            ctx.startActivity(intent)
            "Alarm/reminder set for %02d:%02d (%s).".format(hour, minute, message)
        }.getOrElse { "Failed to set alarm: ${it.message}" }
    }

    fun openRoute(ctx: Context, destination: String): String {
        val encoded = URLEncoder.encode(destination, "UTF-8")
        val navIntent = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$encoded"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (runCatching { ctx.startActivity(navIntent) }.isSuccess) {
            return "Opened navigation route to '$destination'."
        }
        val geoIntent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$encoded"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return runCatching {
            ctx.startActivity(geoIntent)
            "Opened map search for '$destination'."
        }.getOrElse { "No maps app available: ${it.message}" }
    }

    fun openAppByName(ctx: Context, appName: String): String {
        val pm = ctx.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = if (Build.VERSION.SDK_INT >= 33) {
            pm.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(mainIntent, 0)
        }
        val target = apps.firstOrNull {
            it.loadLabel(pm).toString().equals(appName, ignoreCase = true)
        } ?: apps.firstOrNull {
            it.loadLabel(pm).toString().contains(appName, ignoreCase = true) ||
                it.activityInfo.packageName.contains(appName, ignoreCase = true)
        } ?: return "Installed app matching '$appName' not found."

        val launch = pm.getLaunchIntentForPackage(target.activityInfo.packageName)
            ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ?: return "Cannot launch ${target.activityInfo.packageName}."
        return runCatching {
            ctx.startActivity(launch)
            "Launched ${target.loadLabel(pm)}."
        }.getOrElse { "Launch failed: ${it.message}" }
    }

    // --- SAF Project Folder Operations ---

    suspend fun listProjectFiles(ctx: Context, treeUriStr: String?): String = withContext(Dispatchers.IO) {
        if (treeUriStr.isNullOrBlank()) return@withContext "No project working folder is selected."
        val treeUri = Uri.parse(treeUriStr)
        val rootDocId = runCatching { DocumentsContract.getTreeDocumentId(treeUri) }
            .getOrElse { return@withContext "Invalid folder URI." }
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, rootDocId)
        val proj = arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE
        )
        val lines = mutableListOf<String>()
        runCatching {
            ctx.contentResolver.query(childrenUri, proj, null, null, null)?.use { c ->
                while (c.moveToNext() && lines.size < 80) {
                    val name = c.getString(1) ?: ""
                    val mime = c.getString(2) ?: ""
                    val size = c.getLong(3)
                    val kind = if (mime == DocumentsContract.Document.MIME_TYPE_DIR) "[DIR]" else "${size}B"
                    lines.add("- $name ($kind)")
                }
            }
        }.onFailure { return@withContext "Folder read error: ${it.message}" }
        if (lines.isEmpty()) "Working folder is empty."
        else lines.joinToString("\n")
    }

    suspend fun readProjectFile(ctx: Context, treeUriStr: String?, fileName: String): String = withContext(Dispatchers.IO) {
        if (treeUriStr.isNullOrBlank()) return@withContext "No project working folder is selected."
        val treeUri = Uri.parse(treeUriStr)
        val docUri = findChildDocumentUri(ctx, treeUri, fileName)
            ?: return@withContext "File '$fileName' not found in project folder."
        return@withContext runCatching {
            ctx.contentResolver.openInputStream(docUri)?.bufferedReader(Charsets.UTF_8)?.use {
                val text = it.readText()
                if (text.length > 16000) text.take(16000) + "\n... (truncated)" else text
            } ?: "Could not open '$fileName'."
        }.getOrElse { "Read error: ${it.message}" }
    }

    suspend fun writeProjectFile(
        ctx: Context,
        treeUriStr: String?,
        fileName: String,
        content: String
    ): String = withContext(Dispatchers.IO) {
        if (treeUriStr.isNullOrBlank()) return@withContext "No project working folder is selected."
        val treeUri = Uri.parse(treeUriStr)
        val existing = findChildDocumentUri(ctx, treeUri, fileName)
        val targetUri = existing ?: runCatching {
            val rootDocId = DocumentsContract.getTreeDocumentId(treeUri)
            val parentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, rootDocId)
            DocumentsContract.createDocument(ctx.contentResolver, parentUri, "text/plain", fileName)
        }.getOrNull() ?: return@withContext "Could not create file '$fileName'."

        return@withContext runCatching {
            ctx.contentResolver.openOutputStream(targetUri, "wt")?.use { out ->
                out.write(content.toByteArray(Charsets.UTF_8))
            } ?: error("OutputStream null")
            "Saved '$fileName' (${content.length} chars) in project folder."
        }.getOrElse { "Write error: ${it.message}" }
    }

    private fun findChildDocumentUri(ctx: Context, treeUri: Uri, fileName: String): Uri? {
        val rootDocId = runCatching { DocumentsContract.getTreeDocumentId(treeUri) }.getOrNull() ?: return null
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, rootDocId)
        val proj = arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME
        )
        ctx.contentResolver.query(childrenUri, proj, null, null, null)?.use { c ->
            while (c.moveToNext()) {
                val id = c.getString(0) ?: continue
                val name = c.getString(1) ?: continue
                if (name.equals(fileName, ignoreCase = true)) {
                    return DocumentsContract.buildDocumentUriUsingTree(treeUri, id)
                }
            }
        }
        return null
    }

    // --- Real Web Search (DuckDuckGo Lite HTML) ---

    suspend fun webSearch(query: String): String = withContext(Dispatchers.IO) {
        val encoded = URLEncoder.encode(query, "UTF-8")
        val res = runCatching {
            LlmClient.getRaw(
                "https://lite.duckduckgo.com/lite/?q=$encoded",
                mapOf("User-Agent" to "Mozilla/5.0 (Linux; Android 14) NexAssistant/1.0")
            )
        }.getOrElse { return@withContext "Web search failed: ${it.message}" }
        if (!res.ok) return@withContext "Web search HTTP ${res.code}"

        val snippets = Regex("class=['\"]result-snippet['\"][^>]*>(.*?)</td>", setOf(RegexOption.DOT_MATCHES_ALL, RegexOption.IGNORE_CASE))
            .findAll(res.body)
            .map { stripHtml(it.groupValues[1]) }
            .filter { it.isNotBlank() }
            .take(6)
            .toList()
        val titles = Regex("class=['\"]result-link['\"][^>]*>(.*?)</a>", setOf(RegexOption.DOT_MATCHES_ALL, RegexOption.IGNORE_CASE))
            .findAll(res.body)
            .map { stripHtml(it.groupValues[1]) }
            .filter { it.isNotBlank() }
            .take(6)
            .toList()

        if (titles.isEmpty() && snippets.isEmpty()) {
            return@withContext "Web search returned no extractable results for '$query'."
        }
        buildString {
            appendLine("Web search results for: $query")
            val count = maxOf(titles.size, snippets.size)
            for (i in 0 until count) {
                val t = titles.getOrNull(i) ?: "Result ${i + 1}"
                val s = snippets.getOrNull(i) ?: ""
                appendLine("${i + 1}. $t")
                if (s.isNotEmpty()) appendLine("   $s")
            }
        }
    }

    private fun stripHtml(raw: String): String =
        raw.replace(Regex("<[^>]+>"), " ")
            .replace("&amp;", "&")
            .replace("&quot;", "\"")
            .replace("&#x27;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace(Regex("\\s+"), " ")
            .trim()
}
