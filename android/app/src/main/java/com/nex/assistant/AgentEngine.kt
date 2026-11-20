package com.nex.assistant

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class AgentRunResult(
    val finalText: String,
    val createdArtifacts: List<ArtifactItem> = emptyList(),
    val savedMemories: List<String> = emptyList()
)

/**
 * Multi-step ReAct agent loop that connects the active LLM to real Android tools,
 * MailClient, Messengers, Accessibility Screen Control, SAF Project Folder, and Artifacts,
 * with non-bypassable purchase confirmation via SafetyGuard.
 */
class AgentEngine(private val ctx: Context, private val store: Store) {

    fun toolSpecs(webSearchEnabled: Boolean, hasProjectFolder: Boolean): List<ToolSpec> = buildList {
        add(
            ToolSpec(
                name = "read_calendar_events",
                description = "Read upcoming calendar events from the user's Android calendar.",
                parameters = schema(
                    mapOf("days_ahead" to prop("integer", "Number of days ahead to read (1-30, default 7)"))
                )
            )
        )
        add(
            ToolSpec(
                name = "create_calendar_event",
                description = "Create a new event in the user's Android calendar.",
                parameters = schema(
                    mapOf(
                        "title" to prop("string", "Event title"),
                        "start_iso" to prop("string", "Start date/time in format yyyy-MM-dd HH:mm (local time)"),
                        "duration_minutes" to prop("integer", "Duration in minutes (default 60)"),
                        "description" to prop("string", "Optional notes")
                    ),
                    required = listOf("title", "start_iso")
                )
            )
        )
        add(
            ToolSpec(
                name = "search_contacts",
                description = "Search Android contacts by name to find phone numbers.",
                parameters = schema(
                    mapOf("query" to prop("string", "Contact name or partial name")),
                    required = listOf("query")
                )
            )
        )
        add(
            ToolSpec(
                name = "read_recent_sms",
                description = "Read recent incoming SMS messages.",
                parameters = schema(
                    mapOf("limit" to prop("integer", "Number of SMS messages to return (default 10)"))
                )
            )
        )
        add(
            ToolSpec(
                name = "send_sms",
                description = "Send an SMS text message to a phone number.",
                parameters = schema(
                    mapOf(
                        "phone_number" to prop("string", "Recipient phone number"),
                        "message" to prop("string", "Message body")
                    ),
                    required = listOf("phone_number", "message")
                )
            )
        )
        add(
            ToolSpec(
                name = "make_phone_call",
                description = "Place a phone call to a phone number.",
                parameters = schema(
                    mapOf(
                        "phone_number" to prop("string", "Phone number to call"),
                        "contact_name" to prop("string", "Optional display name for confirmation")
                    ),
                    required = listOf("phone_number")
                )
            )
        )
        add(
            ToolSpec(
                name = "set_alarm_or_reminder",
                description = "Set an Android alarm/reminder at a specific hour and minute.",
                parameters = schema(
                    mapOf(
                        "hour" to prop("integer", "Hour 0-23"),
                        "minute" to prop("integer", "Minute 0-59"),
                        "label" to prop("string", "Reminder text")
                    ),
                    required = listOf("hour", "minute", "label")
                )
            )
        )
        add(
            ToolSpec(
                name = "open_route",
                description = "Open turn-by-turn navigation route to a destination address or place.",
                parameters = schema(
                    mapOf("destination" to prop("string", "Destination address or place name")),
                    required = listOf("destination")
                )
            )
        )
        add(
            ToolSpec(
                name = "read_messenger_messages",
                description = "Read recent incoming messages captured from Telegram, WhatsApp and other messengers.",
                parameters = schema(
                    mapOf("app_or_sender" to prop("string", "Optional filter by app name or sender"))
                )
            )
        )
        add(
            ToolSpec(
                name = "reply_messenger_message",
                description = "Reply directly to a captured messenger notification using its message_id.",
                parameters = schema(
                    mapOf(
                        "message_id" to prop("string", "The message_id returned by read_messenger_messages"),
                        "reply_text" to prop("string", "Reply text to send")
                    ),
                    required = listOf("message_id", "reply_text")
                )
            )
        )
        add(
            ToolSpec(
                name = "open_app",
                description = "Launch an installed Android app by name (e.g. Telegram, WhatsApp, Chrome, Maps).",
                parameters = schema(
                    mapOf("app_name" to prop("string", "Name of the app to launch")),
                    required = listOf("app_name")
                )
            )
        )
        add(
            ToolSpec(
                name = "read_screen",
                description = "Read the visible UI elements on the current Android screen via Accessibility Service.",
                parameters = schema(emptyMap())
            )
        )
        add(
            ToolSpec(
                name = "tap_screen_element",
                description = "Tap a UI element on screen by its visible text or #index from read_screen. Purchase/pay buttons automatically require user confirmation.",
                parameters = schema(
                    mapOf("target" to prop("string", "Element text or #index from read_screen")),
                    required = listOf("target")
                )
            )
        )
        add(
            ToolSpec(
                name = "type_text_on_screen",
                description = "Type text into an editable field on the current screen via Accessibility Service.",
                parameters = schema(
                    mapOf(
                        "text" to prop("string", "Text to enter"),
                        "field_hint" to prop("string", "Optional hint text of the input field")
                    ),
                    required = listOf("text")
                )
            )
        )
        add(
            ToolSpec(
                name = "screen_navigation_action",
                description = "Perform back, home, recents, scroll_down, or scroll_up.",
                parameters = schema(
                    mapOf("action" to prop("string", "One of: back, home, recents, scroll_down, scroll_up")),
                    required = listOf("action")
                )
            )
        )
        add(
            ToolSpec(
                name = "read_emails",
                description = "Read recent emails from the user's configured mailbox (IMAP or Gmail OAuth).",
                parameters = schema(
                    mapOf("limit" to prop("integer", "Number of emails to fetch (1-15, default 5)"))
                )
            )
        )
        add(
            ToolSpec(
                name = "send_email",
                description = "Send an email via configured SMTP or Gmail API.",
                parameters = schema(
                    mapOf(
                        "to" to prop("string", "Recipient email address"),
                        "subject" to prop("string", "Email subject"),
                        "body" to prop("string", "Plain text body")
                    ),
                    required = listOf("to", "subject", "body")
                )
            )
        )
        add(
            ToolSpec(
                name = "request_purchase_confirmation",
                description = "MUST be called before any purchase, order, checkout, subscription, or payment.",
                parameters = schema(
                    mapOf(
                        "item_summary" to prop("string", "Item/service description"),
                        "amount" to prop("string", "Price and currency")
                    ),
                    required = listOf("item_summary", "amount")
                )
            )
        )
        add(
            ToolSpec(
                name = "create_artifact",
                description = "Create a rich viewable artifact inside Nex: presentation (JSON slides array [{\"title\":\"...\",\"subtitle\":\"...\",\"bullets\":[...]}]), table (CSV with header row), document (Markdown), or html (complete standalone HTML).",
                parameters = schema(
                    mapOf(
                        "type" to prop("string", "One of: presentation, table, document, html"),
                        "title" to prop("string", "Artifact title"),
                        "content" to prop("string", "Full artifact content")
                    ),
                    required = listOf("type", "title", "content")
                )
            )
        )
        add(
            ToolSpec(
                name = "get_morning_briefing",
                description = "Collect a morning briefing combining today's calendar events, recent SMS, recent messenger notifications, and recent emails (only from permitted sources).",
                parameters = schema(emptyMap())
            )
        )
        add(
            ToolSpec(
                name = "save_memory",
                description = "Save an important personal fact or preference into Nex local memory.",
                parameters = schema(
                    mapOf("fact" to prop("string", "Concise fact to remember")),
                    required = listOf("fact")
                )
            )
        )
        if (webSearchEnabled) {
            add(
                ToolSpec(
                    name = "web_search",
                    description = "Search the web for up-to-date information.",
                    parameters = schema(
                        mapOf("query" to prop("string", "Search query")),
                        required = listOf("query")
                    )
                )
            )
        }
        if (hasProjectFolder) {
            add(
                ToolSpec(
                    name = "list_project_files",
                    description = "List files inside the active project working folder.",
                    parameters = schema(emptyMap())
                )
            )
            add(
                ToolSpec(
                    name = "read_project_file",
                    description = "Read a text file inside the active project working folder.",
                    parameters = schema(
                        mapOf("file_name" to prop("string", "Exact file name in project folder")),
                        required = listOf("file_name")
                    )
                )
            )
            add(
                ToolSpec(
                    name = "write_project_file",
                    description = "Create or overwrite a text file inside the active project working folder.",
                    parameters = schema(
                        mapOf(
                            "file_name" to prop("string", "File name to write"),
                            "content" to prop("string", "Full file content")
                        ),
                        required = listOf("file_name", "content")
                    )
                )
            )
        }
    }

    suspend fun runTurn(
        provider: String,
        model: String,
        apiKey: String,
        effort: Effort,
        lang: String,
        female: Boolean,
        userName: String,
        memories: List<String>,
        useMemory: Boolean,
        webSearchEnabled: Boolean,
        projectFolderUri: String?,
        history: List<LlmTurnMessage>,
        onStatus: (NexState, String) -> Unit
    ): AgentRunResult {
        val agentName = Strings.agentName(lang, female)
        val nowStr = SimpleDateFormat("yyyy-MM-dd HH:mm (EEEE)", Locale.getDefault()).format(Date())
        val sys = buildString {
            appendLine("You are $agentName, a helpful, concise AI assistant and Android device agent.")
            appendLine("Current local date/time: $nowStr.")
            appendLine("Respond in ${if (lang == "en") "English" else "Russian"} unless the user asks for another language.")
            if (userName.isNotBlank()) appendLine("User's name: $userName.")
            appendLine("Strict rules:")
            appendLine("1. Never claim you performed an action unless a tool actually returned success.")
            appendLine("2. If a permission is missing, tell the user clearly which permission to enable in Settings -> Access.")
            appendLine("3. NEVER pay, place an order, subscribe, or complete a purchase without calling request_purchase_confirmation first.")
            appendLine("4. When the user asks for a presentation, spreadsheet/table, structured document, or interactive HTML page, call create_artifact.")
            if (useMemory && memories.isNotEmpty()) {
                appendLine("Saved user memory:")
                memories.forEach { appendLine("- $it") }
            }
            if (!projectFolderUri.isNullOrBlank()) {
                appendLine("A project working folder is attached. You can use list_project_files, read_project_file, and write_project_file.")
            }
        }

        val tools = toolSpecs(webSearchEnabled, !projectFolderUri.isNullOrBlank())
        val workingHistory = history.toMutableList()
        val createdArtifacts = mutableListOf<ArtifactItem>()
        val savedMemories = mutableListOf<String>()

        for (step in 0 until 8) {
            onStatus(NexState.THINKING, Strings.t("thinking", lang, female))
            val response = LlmClient.complete(
                provider = provider,
                model = model,
                apiKey = apiKey,
                systemPrompt = sys,
                messages = workingHistory,
                tools = tools,
                effort = effort,
                webSearchEnabled = webSearchEnabled
            )

            if (response.toolCalls.isEmpty()) {
                return AgentRunResult(
                    finalText = response.text.ifBlank {
                        if (createdArtifacts.isNotEmpty()) {
                            if (lang == "en") "Artifact created." else "Артефакт готов."
                        } else ""
                    },
                    createdArtifacts = createdArtifacts,
                    savedMemories = savedMemories
                )
            }

            workingHistory.add(
                LlmTurnMessage(
                    role = "assistant",
                    text = response.text,
                    toolCalls = response.toolCalls
                )
            )

            for (call in response.toolCalls) {
                val resultText = executeTool(
                    call = call,
                    lang = lang,
                    female = female,
                    projectFolderUri = projectFolderUri,
                    createdArtifacts = createdArtifacts,
                    savedMemories = savedMemories,
                    onStatus = onStatus
                )
                workingHistory.add(
                    LlmTurnMessage(
                        role = "tool",
                        text = resultText,
                        toolCallId = call.id,
                        toolName = call.name
                    )
                )
            }
        }

        return AgentRunResult(
            finalText = if (lang == "en") "Reached maximum agent steps for this turn." else "Достигнут лимит шагов агента за один запрос.",
            createdArtifacts = createdArtifacts,
            savedMemories = savedMemories
        )
    }

    private suspend fun executeTool(
        call: LlmToolCall,
        lang: String,
        female: Boolean,
        projectFolderUri: String?,
        createdArtifacts: MutableList<ArtifactItem>,
        savedMemories: MutableList<String>,
        onStatus: (NexState, String) -> Unit
    ): String {
        val args = call.arguments
        return when (call.name) {
            "read_calendar_events" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Reading calendar…" else "Читаю календарь…")
                DeviceTools.readCalendarEvents(ctx, args.optInt("days_ahead", 7))
            }
            "create_calendar_event" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Creating event…" else "Создаю событие…")
                val title = args.optString("title", "Event")
                val iso = args.optString("start_iso")
                val parsed = runCatching {
                    SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).parse(iso)?.time
                }.getOrNull() ?: (System.currentTimeMillis() + 3_600_000L)
                DeviceTools.createCalendarEvent(
                    ctx, title, parsed, args.optInt("duration_minutes", 60), args.optString("description", "")
                )
            }
            "search_contacts" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Searching contacts…" else "Ищу в контактах…")
                DeviceTools.searchContacts(ctx, args.optString("query"))
            }
            "read_recent_sms" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Reading SMS…" else "Читаю SMS…")
                DeviceTools.readRecentSms(ctx, args.optInt("limit", 10))
            }
            "send_sms" -> {
                val phone = args.optString("phone_number")
                val msg = args.optString("message")
                val isPurchase = SafetyGuard.looksLikePurchase(msg)
                if (isPurchase || store.confirmSensitiveActions) {
                    onStatus(NexState.LISTENING, Strings.t("waiting_confirm", lang, female))
                    val title = Strings.t(if (isPurchase) "purchase_confirm_title" else "action_confirm_title", lang, female)
                    val details = if (lang == "en") "Send SMS to $phone:\n\"$msg\"" else "Отправить SMS на $phone:\n«$msg»"
                    if (!SafetyGuard.requestConfirmation(title, details, isPurchase)) {
                        return "User declined sending SMS."
                    }
                }
                onStatus(NexState.WORKING, if (lang == "en") "Sending SMS…" else "Отправляю SMS…")
                DeviceTools.sendSms(ctx, phone, msg)
            }
            "make_phone_call" -> {
                val phone = args.optString("phone_number")
                val cname = args.optString("contact_name").takeIf { it.isNotBlank() }
                if (store.confirmSensitiveActions) {
                    onStatus(NexState.LISTENING, Strings.t("waiting_confirm", lang, female))
                    val who = if (cname != null) "$cname ($phone)" else phone
                    val details = if (lang == "en") "Place a phone call to $who?" else "Позвонить: $who?"
                    if (!SafetyGuard.requestConfirmation(Strings.t("action_confirm_title", lang, female), details, false)) {
                        return "User cancelled phone call."
                    }
                }
                onStatus(NexState.WORKING, if (lang == "en") "Dialing…" else "Набираю номер…")
                DeviceTools.makePhoneCall(ctx, phone)
            }
            "set_alarm_or_reminder" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Setting reminder…" else "Ставлю напоминание…")
                DeviceTools.setAlarm(ctx, args.optInt("hour", 9), args.optInt("minute", 0), args.optString("label", "Nex"))
            }
            "open_route" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Building route…" else "Строю маршрут…")
                DeviceTools.openRoute(ctx, args.optString("destination"))
            }
            "read_messenger_messages" -> {
                if (!Perms.isNotificationListenerEnabled(ctx)) {
                    return "Notification listener access is not enabled. Ask the user to enable 'Messenger notifications' in Settings -> Access."
                }
                onStatus(NexState.WORKING, if (lang == "en") "Reading messenger notifications…" else "Читаю сообщения мессенджеров…")
                val list = MessengerBridge.recent(15, args.optString("app_or_sender").takeIf { it.isNotBlank() })
                if (list.isEmpty()) "No recent messenger notifications captured yet."
                else list.joinToString("\n") { m ->
                    val canReply = if (m.replyAction != null) " [can_reply, id=${m.id}]" else ""
                    "- [${m.appName}] ${m.sender}: ${m.text}$canReply"
                }
            }
            "reply_messenger_message" -> {
                val mid = args.optString("message_id")
                val text = args.optString("reply_text")
                val isPurchase = SafetyGuard.looksLikePurchase(text)
                if (isPurchase || store.confirmSensitiveActions) {
                    onStatus(NexState.LISTENING, Strings.t("waiting_confirm", lang, female))
                    val title = Strings.t(if (isPurchase) "purchase_confirm_title" else "action_confirm_title", lang, female)
                    val details = if (lang == "en") "Send messenger reply:\n\"$text\"" else "Отправить ответ в мессенджер:\n«$text»"
                    if (!SafetyGuard.requestConfirmation(title, details, isPurchase)) {
                        return "User cancelled messenger reply."
                    }
                }
                onStatus(NexState.WORKING, if (lang == "en") "Sending reply…" else "Отправляю ответ…")
                MessengerBridge.replyTo(ctx, mid, text)
            }
            "open_app" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Opening app…" else "Открываю приложение…")
                DeviceTools.openAppByName(ctx, args.optString("app_name"))
            }
            "read_screen" -> {
                val svc = NexAccessibilityService.instance
                    ?: return "Accessibility Service is not enabled. Ask the user to enable 'Screen control' in Settings -> Access."
                onStatus(NexState.WORKING, if (lang == "en") "Reading screen…" else "Читаю экран…")
                svc.readCurrentScreen()
            }
            "tap_screen_element" -> {
                val svc = NexAccessibilityService.instance
                    ?: return "Accessibility Service is not enabled. Ask the user to enable 'Screen control' in Settings -> Access."
                val target = args.optString("target")
                val screenSnapshot = svc.readCurrentScreen()
                if (SafetyGuard.looksLikePurchase(target) || SafetyGuard.looksLikePurchase(screenSnapshot)) {
                    onStatus(NexState.LISTENING, Strings.t("waiting_confirm", lang, female))
                    val details = if (lang == "en") {
                        "Tap \"$target\" on a screen that appears to involve payment or ordering?"
                    } else {
                        "Нажать «$target» на экране, связанном с покупкой или оплатой?"
                    }
                    if (!SafetyGuard.requestConfirmation(Strings.t("purchase_confirm_title", lang, female), details, isPurchase = true)) {
                        return "BLOCKED: User declined tapping purchase/checkout element '$target'."
                    }
                }
                onStatus(NexState.WORKING, if (lang == "en") "Tapping '$target'…" else "Нажимаю «$target»…")
                svc.tapByTextOrIndex(target)
            }
            "type_text_on_screen" -> {
                val svc = NexAccessibilityService.instance
                    ?: return "Accessibility Service is not enabled."
                onStatus(NexState.WORKING, if (lang == "en") "Typing on screen…" else "Ввожу текст…")
                svc.typeIntoFocusedOrHint(args.optString("text"), args.optString("field_hint").takeIf { it.isNotBlank() })
            }
            "screen_navigation_action" -> {
                val svc = NexAccessibilityService.instance
                    ?: return "Accessibility Service is not enabled."
                svc.performSystemAction(args.optString("action"))
            }
            "read_emails" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Reading inbox…" else "Читаю почту…")
                runCatching {
                    val list = MailClient.readInbox(store.loadMailConfig(), args.optInt("limit", 5))
                    if (list.isEmpty()) "Inbox is empty."
                    else list.joinToString("\n\n") { e ->
                        "From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nPreview: ${e.snippet}"
                    }
                }.getOrElse { "Email read failed: ${it.message}" }
            }
            "send_email" -> {
                val to = args.optString("to")
                val subj = args.optString("subject")
                val body = args.optString("body")
                val isPurchase = SafetyGuard.looksLikePurchase("$subj $body")
                if (isPurchase || store.confirmSensitiveActions) {
                    onStatus(NexState.LISTENING, Strings.t("waiting_confirm", lang, female))
                    val title = Strings.t(if (isPurchase) "purchase_confirm_title" else "action_confirm_title", lang, female)
                    val details = if (lang == "en") "Send email to $to\nSubject: $subj\n\n$body" else "Отправить письмо на $to\nТема: $subj\n\n$body"
                    if (!SafetyGuard.requestConfirmation(title, details, isPurchase)) {
                        return "User cancelled sending email."
                    }
                }
                onStatus(NexState.WORKING, if (lang == "en") "Sending email…" else "Отправляю письмо…")
                runCatching { MailClient.sendEmail(store.loadMailConfig(), to, subj, body) }
                    .getOrElse { "Email send failed: ${it.message}" }
            }
            "request_purchase_confirmation" -> {
                val item = args.optString("item_summary")
                val amount = args.optString("amount")
                onStatus(NexState.LISTENING, Strings.t("waiting_confirm", lang, female))
                val details = if (lang == "en") "$item — $amount. Proceed with payment?" else "$item — $amount. Подтвердить оплату?"
                val approved = SafetyGuard.requestConfirmation(
                    title = Strings.t("purchase_confirm_title", lang, female),
                    details = details,
                    isPurchase = true
                )
                if (approved) "CONFIRMED: User explicitly approved this purchase ($item, $amount)."
                else "CANCELLED: User declined the purchase. Do not proceed with payment or ordering."
            }
            "create_artifact" -> {
                val art = ArtifactItem(
                    type = ArtifactType.fromId(args.optString("type")),
                    title = args.optString("title", "Artifact"),
                    content = args.optString("content", "")
                )
                createdArtifacts.add(art)
                "Artifact '${art.title}' (${art.type.id}) created and attached to the chat."
            }
            "get_morning_briefing" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Building morning briefing…" else "Собираю утренний отчёт…")
                buildString {
                    appendLine("=== Calendar (24h) ===")
                    appendLine(DeviceTools.readCalendarEvents(ctx, 1))
                    appendLine()
                    appendLine("=== Recent SMS ===")
                    appendLine(DeviceTools.readRecentSms(ctx, 5))
                    appendLine()
                    appendLine("=== Messengers ===")
                    if (Perms.isNotificationListenerEnabled(ctx)) {
                        val msgs = MessengerBridge.recent(5)
                        if (msgs.isEmpty()) appendLine("No recent messenger notifications.")
                        else msgs.forEach { appendLine("- [${it.appName}] ${it.sender}: ${it.text}") }
                    } else {
                        appendLine("Messenger notifications access not enabled.")
                    }
                    appendLine()
                    appendLine("=== Email ===")
                    val mCfg = store.loadMailConfig()
                    if (mCfg.isConfigured) {
                     val mailText = runCatching {
    MailClient.readInbox(mCfg, 5).joinToString("\n") { "- ${it.from}: ${it.subject}" }
}.getOrElse { "Mail error: ${it.message}" }
                        appendLine(mailText.ifBlank { "Inbox is empty." })
                    } else {
                        appendLine("Email not configured.")
                    }
                }
            }
            "save_memory" -> {
                val fact = args.optString("fact").trim()
                if (fact.isNotEmpty() && store.memoryAutoSave) {
                    savedMemories.add(fact)
                    "Saved to local memory: $fact"
                } else {
                    "Auto-save memory is disabled or fact is empty."
                }
            }
            "web_search" -> {
                onStatus(NexState.WORKING, Strings.t("searching", lang, female))
                DeviceTools.webSearch(args.optString("query"))
            }
            "list_project_files" -> {
                onStatus(NexState.WORKING, if (lang == "en") "Listing folder…" else "Читаю папку проекта…")
                DeviceTools.listProjectFiles(ctx, projectFolderUri)
            }
            "read_project_file" -> {
                val fn = args.optString("file_name")
                onStatus(NexState.WORKING, if (lang == "en") "Reading $fn…" else "Читаю $fn…")
                DeviceTools.readProjectFile(ctx, projectFolderUri, fn)
            }
            "write_project_file" -> {
                val fn = args.optString("file_name")
                val content = args.optString("content")
                onStatus(NexState.LISTENING, Strings.t("waiting_confirm", lang, female))
                val details = if (lang == "en") "Write file '$fn' (${content.length} chars) in project folder?" else "Записать файл «$fn» (${content.length} симв.) в папку проекта?"
                if (!SafetyGuard.requestConfirmation(Strings.t("action_confirm_title", lang, female), details, false)) {
                    return "User declined writing '$fn'."
                }
                onStatus(NexState.WORKING, if (lang == "en") "Writing $fn…" else "Записываю $fn…")
                DeviceTools.writeProjectFile(ctx, projectFolderUri, fn, content)
            }
            else -> "Unknown tool: ${call.name}"
        }
    }

    private fun prop(type: String, description: String): JSONObject =
        JSONObject().put("type", type).put("description", description)

    private fun schema(props: Map<String, JSONObject>, required: List<String> = emptyList()): JSONObject {
        val properties = JSONObject()
        props.forEach { (k, v) -> properties.put(k, v) }
        val obj = JSONObject()
            .put("type", "object")
            .put("properties", properties)
        if (required.isNotEmpty()) {
            val req = JSONArray()
            required.forEach { req.put(it) }
            obj.put("required", req)
        }
        return obj
    }
}
