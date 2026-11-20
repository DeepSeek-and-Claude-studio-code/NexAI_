package com.nex.assistant

import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.InetSocketAddress
import java.net.Socket
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory

data class EmailSummary(
    val from: String,
    val subject: String,
    val date: String,
    val snippet: String
)

/**
 * Zero-dependency Email client supporting:
 * 1) Gmail REST API v1 via OAuth2 Bearer access token
 * 2) Standard IMAP4rev1 over TLS (port 993) + SMTP over TLS (465) / STARTTLS (587)
 */
object MailClient {
    suspend fun readInbox(cfg: MailConfig, limit: Int = 5): List<EmailSummary> = withContext(Dispatchers.IO) {
        if (!cfg.isConfigured) error("Mail is not configured in Settings -> Access -> Email.")
        if (cfg.mode == "gmail_oauth") {
            readGmailApi(cfg.oauthAccessToken, limit)
        } else {
            readImapInbox(cfg, limit)
        }
    }

    suspend fun sendEmail(cfg: MailConfig, to: String, subject: String, body: String): String = withContext(Dispatchers.IO) {
        if (!cfg.isConfigured) error("Mail is not configured in Settings -> Access -> Email.")
        if (cfg.mode == "gmail_oauth") {
            sendGmailApi(cfg.oauthAccessToken, to, subject, body)
        } else {
            sendSmtp(cfg, to, subject, body)
        }
        "Email sent to $to"
    }

    private fun readGmailApi(token: String, limit: Int): List<EmailSummary> {
        val headers = mapOf("Authorization" to "Bearer $token")
        val listRes = LlmClient.getRaw(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=$limit",
            headers
        )
        if (!listRes.ok) error("Gmail API HTTP ${listRes.code}: ${listRes.body.take(200)}")
        val msgs = JSONObject(listRes.body).optJSONArray("messages") ?: return emptyList()
        val out = mutableListOf<EmailSummary>()
        for (i in 0 until msgs.length()) {
            val id = msgs.getJSONObject(i).getString("id")
            val detail = LlmClient.getRaw(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/$id?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date",
                headers
            )
            if (!detail.ok) continue
            val obj = JSONObject(detail.body)
            val snippet = obj.optString("snippet", "")
            val hArr = obj.optJSONObject("payload")?.optJSONArray("headers")
            var from = ""
            var subject = "(no subject)"
            var date = ""
            if (hArr != null) {
                for (h in 0 until hArr.length()) {
                    val ho = hArr.getJSONObject(h)
                    when (ho.optString("name").lowercase()) {
                        "from" -> from = ho.optString("value")
                        "subject" -> subject = ho.optString("value")
                        "date" -> date = ho.optString("value")
                    }
                }
            }
            out.add(EmailSummary(from, subject, date, snippet))
        }
        return out
    }

    private fun sendGmailApi(token: String, to: String, subject: String, body: String) {
        val encodedSubject = "=?UTF-8?B?" + Base64.encodeToString(subject.toByteArray(Charsets.UTF_8), Base64.NO_WRAP) + "?="
        val mime = "To: $to\r\nSubject: $encodedSubject\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n$body"
        val raw = Base64.encodeToString(
            mime.toByteArray(Charsets.UTF_8),
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
        )
        val res = LlmClient.postRaw(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            mapOf("Authorization" to "Bearer $token"),
            JSONObject().put("raw", raw).toString()
        )
        if (!res.ok) error("Gmail Send HTTP ${res.code}: ${res.body.take(250)}")
    }

    private fun readImapInbox(cfg: MailConfig, limit: Int): List<EmailSummary> {
        val factory = SSLSocketFactory.getDefault() as SSLSocketFactory
        val socket = factory.createSocket() as SSLSocket
        socket.connect(InetSocketAddress(cfg.imapHost, cfg.imapPort), 15000)
        socket.soTimeout = 20000
        return socket.use { s ->
            val reader = BufferedReader(InputStreamReader(s.inputStream, Charsets.UTF_8))
            val writer = BufferedWriter(OutputStreamWriter(s.outputStream, Charsets.UTF_8))
            reader.readLine()

            fun cmd(tag: String, line: String): List<String> {
                writer.write("$tag $line\r\n")
                writer.flush()
                val lines = mutableListOf<String>()
                while (true) {
                    val l = reader.readLine() ?: break
                    lines.add(l)
                    if (l.startsWith("$tag ")) break
                }
                return lines
            }

            val loginRes = cmd("A1", "LOGIN \"${esc(cfg.email)}\" \"${esc(cfg.password)}\"")
            if (loginRes.lastOrNull()?.startsWith("A1 OK") != true) {
                error("IMAP login failed: ${loginRes.lastOrNull().orEmpty()}")
            }

            val selRes = cmd("A2", "SELECT INBOX")
            var total = 0
            val existsRegex = Regex("\\* (\\d+) EXISTS")
            selRes.forEach { l ->
                val m = existsRegex.find(l)
                if (m != null) total = m.groupValues[1].toInt()
            }
            if (total == 0) {
                cmd("A9", "LOGOUT")
                return@use emptyList()
            }

            val safeLimit = limit.coerceIn(1, 20)
            val start = (total - safeLimit + 1).coerceAtLeast(1)
            val fetchRes = cmd(
                "A3",
                "FETCH $start:$total (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)] BODY.PEEK[TEXT]<0.500>)"
            )
            cmd("A9", "LOGOUT")
            parseImapFetch(fetchRes).reversed()
        }
    }

    private fun parseImapFetch(lines: List<String>): List<EmailSummary> {
        val results = mutableListOf<EmailSummary>()
        var from = ""
        var subject = ""
        var date = ""
        val snippet = StringBuilder()
        var inBody = false
        val wsRegex = Regex("\\s+")

        fun flush() {
            if (from.isNotEmpty() || subject.isNotEmpty()) {
                results.add(
                    EmailSummary(
                        from = decodeMimeHeader(from),
                        subject = decodeMimeHeader(subject.ifBlank { "(no subject)" }),
                        date = date.trim(),
                        snippet = snippet.toString().replace(wsRegex, " ").trim().take(240)
                    )
                )
            }
            from = ""
            subject = ""
            date = ""
            snippet.clear()
            inBody = false
        }

        for (raw in lines) {
            when {
                raw.startsWith("* ") && raw.contains("FETCH") -> flush()
                raw.startsWith("A3 ") -> flush()
                raw.contains("BODY[TEXT]") -> inBody = true
                !inBody && raw.startsWith("From:", ignoreCase = true) -> from = raw.substringAfter(":").trim()
                !inBody && raw.startsWith("Subject:", ignoreCase = true) -> subject = raw.substringAfter(":").trim()
                !inBody && raw.startsWith("Date:", ignoreCase = true) -> date = raw.substringAfter(":").trim()
                inBody && raw != ")" && !raw.startsWith("--") && !raw.startsWith("Content-") -> {
                    if (snippet.length < 300) snippet.append(raw).append(' ')
                }
            }
        }
        flush()
        return results
    }

    private fun sendSmtp(cfg: MailConfig, to: String, subject: String, body: String) {
        val baseSocket: Socket = if (cfg.useStartTls) {
            Socket().apply {
                connect(InetSocketAddress(cfg.smtpHost, cfg.smtpPort), 15000)
                soTimeout = 20000
            }
        } else {
            (SSLSocketFactory.getDefault().createSocket() as SSLSocket).apply {
                connect(InetSocketAddress(cfg.smtpHost, cfg.smtpPort), 15000)
                soTimeout = 20000
            }
        }

        var activeSocket = baseSocket
        try {
            var reader = BufferedReader(InputStreamReader(activeSocket.inputStream, Charsets.UTF_8))
            var writer = BufferedWriter(OutputStreamWriter(activeSocket.outputStream, Charsets.UTF_8))

            fun readReply(): String {
                val sb = StringBuilder()
                while (true) {
                    val l = reader.readLine() ?: break
                    sb.appendLine(l)
                    if (l.length >= 4 && l[3] == ' ') break
                }
                return sb.toString().trim()
            }

            fun sendCmd(line: String, expectedPrefix: String) {
                writer.write("$line\r\n")
                writer.flush()
                val reply = readReply()
                if (!reply.startsWith(expectedPrefix)) {
                    error("SMTP error on '${line.substringBefore(' ')}': $reply")
                }
            }

            readReply()
            sendCmd("EHLO nex.local", "250")

            if (cfg.useStartTls) {
                sendCmd("STARTTLS", "220")
                val tls = (SSLSocketFactory.getDefault() as SSLSocketFactory)
                    .createSocket(activeSocket, cfg.smtpHost, cfg.smtpPort, true) as SSLSocket
                tls.startHandshake()
                activeSocket = tls
                reader = BufferedReader(InputStreamReader(activeSocket.inputStream, Charsets.UTF_8))
                writer = BufferedWriter(OutputStreamWriter(activeSocket.outputStream, Charsets.UTF_8))
                sendCmd("EHLO nex.local", "250")
            }

            sendCmd("AUTH LOGIN", "334")
            sendCmd(Base64.encodeToString(cfg.email.toByteArray(Charsets.UTF_8), Base64.NO_WRAP), "334")
            sendCmd(Base64.encodeToString(cfg.password.toByteArray(Charsets.UTF_8), Base64.NO_WRAP), "235")

            sendCmd("MAIL FROM:<${cfg.email}>", "250")
            sendCmd("RCPT TO:<${to.trim()}>", "250")
            sendCmd("DATA", "354")

            val encSubj = "=?UTF-8?B?" + Base64.encodeToString(subject.toByteArray(Charsets.UTF_8), Base64.NO_WRAP) + "?="
            val safeBody = body.replace("\r\n", "\n").replace("\n.", "\n..").replace("\n", "\r\n")
            val msg = buildString {
                append("From: <${cfg.email}>\r\n")
                append("To: <${to.trim()}>\r\n")
                append("Subject: $encSubj\r\n")
                append("MIME-Version: 1.0\r\n")
                append("Content-Type: text/plain; charset=UTF-8\r\n")
                append("\r\n")
                append(safeBody)
                append("\r\n.")
            }
            sendCmd(msg, "250")
            runCatching { sendCmd("QUIT", "221") }
        } finally {
            runCatching { activeSocket.close() }
        }
    }

    private fun esc(s: String): String = s.replace("\\", "\\\\").replace("\"", "\\\"")

    private fun decodeMimeHeader(raw: String): String {
        val pattern = Regex("=\\?([^?]+)\\?([BbQq])\\?([^?]+)\\?=")
        return pattern.replace(raw) { m ->
            val enc = m.groupValues[2].uppercase()
            val payload = m.groupValues[3]
            runCatching {
                when (enc) {
                    "B" -> String(Base64.decode(payload, Base64.DEFAULT), Charsets.UTF_8)
                    "Q" -> {
                        val spaced = payload.replace("_", " ")
                        val bytes = mutableListOf<Byte>()
                        var i = 0
                        while (i < spaced.length) {
                            if (spaced[i] == '=' && i + 2 < spaced.length) {
                                val v = spaced.substring(i + 1, i + 3).toIntOrNull(16)
                                if (v != null) {
                                    bytes.add(v.toByte())
                                    i += 3
                                    continue
                                }
                            }
                            bytes.add(spaced[i].code.toByte())
                            i++
                        }
                        String(bytes.toByteArray(), Charsets.UTF_8)
                    }
                    else -> m.value
                }
            }.getOrDefault(m.value)
        }
    }
}
