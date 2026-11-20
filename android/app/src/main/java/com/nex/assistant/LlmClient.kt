package com.nex.assistant

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI

data class ToolSpec(
    val name: String,
    val description: String,
    val parameters: JSONObject
)

data class LlmToolCall(
    val id: String,
    val name: String,
    val arguments: JSONObject
)

data class LlmTurnMessage(
    val role: String, // "user", "assistant", "tool"
    val text: String = "",
    val imageAttachments: List<Pair<String, String>> = emptyList(),
    val toolCalls: List<LlmToolCall> = emptyList(),
    val toolCallId: String? = null,
    val toolName: String? = null
)

data class LlmResponse(
    val text: String,
    val toolCalls: List<LlmToolCall> = emptyList()
)

object LlmClient {
    val PROVIDERS: List<String> = listOf("Gemini", "OpenAI", "Claude", "DeepSeek", "NVIDIA")

    val DEFAULT_MODELS: Map<String, List<String>> = linkedMapOf(
        "Gemini" to listOf(
            "gemini-4-argon",
            "gemini-3.8-flash",
            "gemini-3.1-pro-preview",
            "gemini-3.6-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite"
        ),
        "OpenAI" to listOf(
            "gpt-6.2-astra",
            "gpt-6.2-sol",
            "gpt-6.1-terra",
            "gpt-6-luna"
        ),
        "Claude" to listOf(
            "claude-fable-5-2",
            "claude-opus-5-5",
            "claude-sonnet-5-5",
            "claude-haiku-5-5"
        ),
        "DeepSeek" to listOf(
            "deepseek-v4-pro",
            "deepseek-flash"
        ),
        "NVIDIA" to listOf(
            "deepseek-ai/deepseek-v4.1-flash",
            "deepseek-ai/deepseek-v4-pro",
            "deepseek-ai/deepseek-v4-flash",
            "moonshotai/kimi-k2.6",
            "minimaxai/minimax-m2.7",
            "google/gemma-4-31b-it"
        )
    )

    val IMAGE_MODELS: Map<String, List<String>> = linkedMapOf(
        "Gemini" to listOf(
            "gemini-nano-banana-2.1",
            "gemini-3.1-flash-image",
            "gemini-3.1-flash-lite-image",
            "gemini-3-pro-image"
        ),
        "OpenAI" to listOf(
            "gpt-image-2.6-sunburst",
            "gpt-image-2.6-flare",
            "gpt-image-2.5-sunburst",
            "gpt-image-2.5-flare"
        )
    )

    val VIDEO_MODELS: Map<String, List<String>> = linkedMapOf(
        "Gemini" to listOf("gemini-omni-1.1-flash")
    )

    private val OPENAI_ENDPOINTS = mapOf(
        "OpenAI" to "https://api.openai.com/v1/chat/completions",
        "DeepSeek" to "https://api.deepseek.com/chat/completions",
        "NVIDIA" to "https://integrate.api.nvidia.com/v1/chat/completions"
    )

    suspend fun complete(
        provider: String,
        model: String,
        apiKey: String,
        systemPrompt: String,
        messages: List<LlmTurnMessage>,
        tools: List<ToolSpec>,
        effort: Effort,
        webSearchEnabled: Boolean
    ): LlmResponse = withContext(Dispatchers.IO) {
        when (provider) {
            "Gemini" -> callGemini(model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort = true)
            "Claude" -> callClaude(model, apiKey, systemPrompt, messages, tools, effort, includeEffort = true)
            else -> callOpenAiCompatible(provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort = true)
        }
    }

    private fun callGemini(
        model: String,
        apiKey: String,
        systemPrompt: String,
        messages: List<LlmTurnMessage>,
        tools: List<ToolSpec>,
        effort: Effort,
        webSearchEnabled: Boolean,
        includeEffort: Boolean
    ): LlmResponse {
        val contents = JSONArray()
        messages.forEach { msg ->
            when (msg.role) {
                "user" -> {
                    val parts = JSONArray()
                    if (msg.text.isNotEmpty()) parts.put(JSONObject().put("text", msg.text))
                    msg.imageAttachments.forEach { (mime, b64) ->
                        parts.put(
                            JSONObject().put(
                                "inlineData",
                                JSONObject().put("mimeType", mime).put("data", b64)
                            )
                        )
                    }
                    if (parts.length() > 0) {
                        contents.put(JSONObject().put("role", "user").put("parts", parts))
                    }
                }
                "assistant" -> {
                    val parts = JSONArray()
                    if (msg.text.isNotEmpty()) parts.put(JSONObject().put("text", msg.text))
                    msg.toolCalls.forEach { tc ->
                        parts.put(
                            JSONObject().put(
                                "functionCall",
                                JSONObject().put("name", tc.name).put("args", tc.arguments)
                            )
                        )
                    }
                    if (parts.length() > 0) {
                        contents.put(JSONObject().put("role", "model").put("parts", parts))
                    }
                }
                "tool" -> {
                    val parts = JSONArray().put(
                        JSONObject().put(
                            "functionResponse",
                            JSONObject()
                                .put("name", msg.toolName ?: "tool")
                                .put("response", JSONObject().put("result", msg.text))
                        )
                    )
                    contents.put(JSONObject().put("role", "user").put("parts", parts))
                }
            }
        }

        val body = JSONObject().put("contents", contents)
        if (systemPrompt.isNotBlank()) {
            body.put(
                "systemInstruction",
                JSONObject().put("parts", JSONArray().put(JSONObject().put("text", systemPrompt)))
            )
        }

        val genCfg = JSONObject().put("maxOutputTokens", 4096)
        if (includeEffort) {
            val budget = when (effort) {
                Effort.LOW -> 0
                Effort.MEDIUM -> 1024
                Effort.HIGH -> 4096
                Effort.MAX -> 8192
            }
            if (budget > 0) {
                genCfg.put("thinkingConfig", JSONObject().put("thinkingBudget", budget))
            }
        }
        body.put("generationConfig", genCfg)

        val toolsArr = JSONArray()
        if (tools.isNotEmpty()) {
            val decls = JSONArray()
            tools.forEach { t ->
                decls.put(
                    JSONObject()
                        .put("name", t.name)
                        .put("description", t.description)
                        .put("parameters", t.parameters)
                )
            }
            toolsArr.put(JSONObject().put("functionDeclarations", decls))
        }
        if (webSearchEnabled && tools.isEmpty()) {
            toolsArr.put(JSONObject().put("google_search", JSONObject()))
        }
        if (toolsArr.length() > 0) body.put("tools", toolsArr)

        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent"
        val res = postRaw(url, mapOf("x-goog-api-key" to apiKey), body.toString())
        if (!res.ok) {
            if (includeEffort && res.code == 400 && res.body.contains("thinking", ignoreCase = true)) {
                return callGemini(model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort = false)
            }
            error("Gemini HTTP ${res.code}: ${res.body.take(300)}")
        }

        val root = JSONObject(res.body)
        val candidates = root.optJSONArray("candidates")?.takeIf { it.length() > 0 } ?: error("Empty Gemini response")
        val content = candidates.getJSONObject(0).optJSONObject("content") ?: return LlmResponse("")
        val parts = content.optJSONArray("parts") ?: return LlmResponse("")
        val sb = StringBuilder()
        val calls = mutableListOf<LlmToolCall>()
        for (i in 0 until parts.length()) {
            val part = parts.getJSONObject(i)
            if (part.optBoolean("thought", false)) continue
            if (part.has("text")) {
                if (sb.isNotEmpty()) sb.append("\n")
                sb.append(part.getString("text"))
            }
            val fc = part.optJSONObject("functionCall")
            if (fc != null) {
                calls.add(
                    LlmToolCall(
                        id = "gem_${System.nanoTime()}_$i",
                        name = fc.getString("name"),
                        arguments = fc.optJSONObject("args") ?: JSONObject()
                    )
                )
            }
        }
        return LlmResponse(sb.toString().trim(), calls)
    }

    private fun callClaude(
        model: String,
        apiKey: String,
        systemPrompt: String,
        messages: List<LlmTurnMessage>,
        tools: List<ToolSpec>,
        effort: Effort,
        includeEffort: Boolean
    ): LlmResponse {
        val arr = JSONArray()
        messages.forEach { msg ->
            when (msg.role) {
                "user" -> {
                    val blocks = JSONArray()
                    msg.imageAttachments.forEach { (mime, b64) ->
                        blocks.put(
                            JSONObject()
                                .put("type", "image")
                                .put(
                                    "source",
                                    JSONObject()
                                        .put("type", "base64")
                                        .put("media_type", mime)
                                        .put("data", b64)
                                )
                        )
                    }
                    if (msg.text.isNotEmpty()) {
                        blocks.put(JSONObject().put("type", "text").put("text", msg.text))
                    }
                    arr.put(JSONObject().put("role", "user").put("content", blocks))
                }
                "assistant" -> {
                    val blocks = JSONArray()
                    if (msg.text.isNotEmpty()) {
                        blocks.put(JSONObject().put("type", "text").put("text", msg.text))
                    }
                    msg.toolCalls.forEach { tc ->
                        blocks.put(
                            JSONObject()
                                .put("type", "tool_use")
                                .put("id", tc.id)
                                .put("name", tc.name)
                                .put("input", tc.arguments)
                        )
                    }
                    arr.put(JSONObject().put("role", "assistant").put("content", blocks))
                }
                "tool" -> {
                    val blocks = JSONArray().put(
                        JSONObject()
                            .put("type", "tool_result")
                            .put("tool_use_id", msg.toolCallId ?: "tool")
                            .put("content", msg.text)
                    )
                    arr.put(JSONObject().put("role", "user").put("content", blocks))
                }
            }
        }

        val maxTokens = when (effort) {
            Effort.LOW -> 2048
            Effort.MEDIUM -> 4096
            Effort.HIGH -> 8192
            Effort.MAX -> 12288
        }
        val body = JSONObject()
            .put("model", model)
            .put("max_tokens", maxTokens)
            .put("messages", arr)

        if (systemPrompt.isNotBlank()) body.put("system", systemPrompt)
        if (includeEffort && (effort == Effort.HIGH || effort == Effort.MAX)) {
            val budget = if (effort == Effort.MAX) 6000 else 2500
            body.put("thinking", JSONObject().put("type", "enabled").put("budget_tokens", budget))
        }
        if (tools.isNotEmpty()) {
            val tArr = JSONArray()
            tools.forEach { t ->
                tArr.put(
                    JSONObject()
                        .put("name", t.name)
                        .put("description", t.description)
                        .put("input_schema", t.parameters)
                )
            }
            body.put("tools", tArr)
        }

        val res = postRaw(
            "https://api.anthropic.com/v1/messages",
            mapOf("x-api-key" to apiKey, "anthropic-version" to "2023-06-01"),
            body.toString()
        )
        if (!res.ok) {
            if (includeEffort && res.code == 400 && res.body.contains("thinking", ignoreCase = true)) {
                return callClaude(model, apiKey, systemPrompt, messages, tools, effort, includeEffort = false)
            }
            error("Claude HTTP ${res.code}: ${res.body.take(300)}")
        }

        val root = JSONObject(res.body)
        val content = root.optJSONArray("content") ?: return LlmResponse("")
        val sb = StringBuilder()
        val calls = mutableListOf<LlmToolCall>()
        for (i in 0 until content.length()) {
            val block = content.getJSONObject(i)
            when (block.optString("type")) {
                "text" -> {
                    if (sb.isNotEmpty()) sb.append("\n")
                    sb.append(block.optString("text"))
                }
                "tool_use" -> {
                    calls.add(
                        LlmToolCall(
                            id = block.optString("id", "cl_$i"),
                            name = block.getString("name"),
                            arguments = block.optJSONObject("input") ?: JSONObject()
                        )
                    )
                }
            }
        }
        return LlmResponse(sb.toString().trim(), calls)
    }

    private fun callOpenAiCompatible(
        provider: String,
        model: String,
        apiKey: String,
        systemPrompt: String,
        messages: List<LlmTurnMessage>,
        tools: List<ToolSpec>,
        effort: Effort,
        includeEffort: Boolean
    ): LlmResponse {
        val url = OPENAI_ENDPOINTS[provider] ?: error("Unknown provider: $provider")
        val arr = JSONArray()
        if (systemPrompt.isNotBlank()) {
            arr.put(JSONObject().put("role", "system").put("content", systemPrompt))
        }
        messages.forEach { msg ->
            when (msg.role) {
                "user" -> {
                    if (msg.imageAttachments.isEmpty()) {
                        arr.put(JSONObject().put("role", "user").put("content", msg.text))
                    } else {
                        val contentArr = JSONArray()
                        if (msg.text.isNotEmpty()) {
                            contentArr.put(JSONObject().put("type", "text").put("text", msg.text))
                        }
                        msg.imageAttachments.forEach { (mime, b64) ->
                            contentArr.put(
                                JSONObject()
                                    .put("type", "image_url")
                                    .put("image_url", JSONObject().put("url", "data:$mime;base64,$b64"))
                            )
                        }
                        arr.put(JSONObject().put("role", "user").put("content", contentArr))
                    }
                }
                "assistant" -> {
                    val obj = JSONObject().put("role", "assistant")
                    if (msg.text.isNotEmpty()) obj.put("content", msg.text) else obj.put("content", JSONObject.NULL)
                    if (msg.toolCalls.isNotEmpty()) {
                        val tcArr = JSONArray()
                        msg.toolCalls.forEach { tc ->
                            tcArr.put(
                                JSONObject()
                                    .put("id", tc.id)
                                    .put("type", "function")
                                    .put(
                                        "function",
                                        JSONObject()
                                            .put("name", tc.name)
                                            .put("arguments", tc.arguments.toString())
                                    )
                            )
                        }
                        obj.put("tool_calls", tcArr)
                    }
                    arr.put(obj)
                }
                "tool" -> {
                    arr.put(
                        JSONObject()
                            .put("role", "tool")
                            .put("tool_call_id", msg.toolCallId ?: "tool")
                            .put("content", msg.text)
                    )
                }
            }
        }

        val body = JSONObject()
            .put("model", model)
            .put("messages", arr)

        if (includeEffort && provider == "OpenAI") {
            val mapped = when (effort) {
                Effort.LOW -> "low"
                Effort.MEDIUM -> "medium"
                Effort.HIGH -> "high"
                Effort.MAX -> "high"
            }
            body.put("reasoning_effort", mapped)
        }

        if (tools.isNotEmpty()) {
            val tArr = JSONArray()
            tools.forEach { t ->
                tArr.put(
                    JSONObject()
                        .put("type", "function")
                        .put(
                            "function",
                            JSONObject()
                                .put("name", t.name)
                                .put("description", t.description)
                                .put("parameters", t.parameters)
                        )
                )
            }
            body.put("tools", tArr)
        }

        val res = postRaw(url, mapOf("Authorization" to "Bearer $apiKey"), body.toString())
        if (!res.ok) {
            if (includeEffort && res.code == 400 && res.body.contains("reasoning_effort", ignoreCase = true)) {
                return callOpenAiCompatible(provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort = false)
            }
            error("$provider HTTP ${res.code}: ${res.body.take(300)}")
        }

        val root = JSONObject(res.body)
        val choices = root.optJSONArray("choices")?.takeIf { it.length() > 0 } ?: error("Empty $provider response")
        val message = choices.getJSONObject(0).getJSONObject("message")
        val text = if (message.isNull("content")) "" else message.optString("content", "")
        val calls = mutableListOf<LlmToolCall>()
        val tcArr = message.optJSONArray("tool_calls")
        if (tcArr != null) {
            for (i in 0 until tcArr.length()) {
                val tc = tcArr.getJSONObject(i)
                val fn = tc.getJSONObject("function")
                val rawArgs = fn.optString("arguments", "{}")
                val parsedArgs = runCatching { JSONObject(rawArgs) }.getOrElse { JSONObject() }
                calls.add(
                    LlmToolCall(
                        id = tc.optString("id", "oa_$i"),
                        name = fn.getString("name"),
                        arguments = parsedArgs
                    )
                )
            }
        }
        return LlmResponse(text.trim(), calls)
    }

    suspend fun fetchModels(provider: String, apiKey: String): List<String> = withContext(Dispatchers.IO) {
        if (apiKey.isBlank()) return@withContext emptyList()
        when (provider) {
            "Gemini" -> {
                val res = getRaw(
                    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
                    mapOf("x-goog-api-key" to apiKey)
                )
                if (!res.ok) return@withContext emptyList()
                val arr = JSONObject(res.body).optJSONArray("models") ?: return@withContext emptyList()
                buildList {
                    for (i in 0 until arr.length()) {
                        val m = arr.getJSONObject(i)
                        val name = m.optString("name").removePrefix("models/")
                        if (name.startsWith("gemini")) add(name)
                    }
                }
            }
            "Claude" -> {
                val res = getRaw(
                    "https://api.anthropic.com/v1/models",
                    mapOf("x-api-key" to apiKey, "anthropic-version" to "2023-06-01")
                )
                if (!res.ok) return@withContext emptyList()
                val arr = JSONObject(res.body).optJSONArray("data") ?: return@withContext emptyList()
                buildList {
                    for (i in 0 until arr.length()) {
                        val id = arr.getJSONObject(i).optString("id")
                        if (id.isNotBlank()) add(id)
                    }
                }
            }
            else -> {
                val base = when (provider) {
                    "OpenAI" -> "https://api.openai.com/v1/models"
                    "DeepSeek" -> "https://api.deepseek.com/models"
                    "NVIDIA" -> "https://integrate.api.nvidia.com/v1/models"
                    else -> return@withContext emptyList()
                }
                val res = getRaw(base, mapOf("Authorization" to "Bearer $apiKey"))
                if (!res.ok) return@withContext emptyList()
                val arr = JSONObject(res.body).optJSONArray("data") ?: return@withContext emptyList()
                buildList {
                    for (i in 0 until arr.length()) {
                        val id = arr.getJSONObject(i).optString("id")
                        if (provider == "NVIDIA") {
                            val keep = id.contains("deepseek", true) ||
                                id.contains("gemma", true) ||
                                id.contains("kimi", true) ||
                                id.contains("minimax", true)
                            if (keep) add(id)
                        } else if (id.isNotBlank()) {
                            add(id)
                        }
                    }
                }
            }
        }
    }

    data class HttpResult(val ok: Boolean, val code: Int, val body: String)

    fun postRaw(url: String, headers: Map<String, String>, body: String, readTimeoutMs: Int = 90000): HttpResult {
        val conn = URI.create(url).toURL().openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = readTimeoutMs
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val ok = code in 200..299
            val stream = if (ok) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            HttpResult(ok, code, text)
        } finally {
            conn.disconnect()
        }
    }

    fun getRaw(url: String, headers: Map<String, String>, readTimeoutMs: Int = 30000): HttpResult {
        val conn = URI.create(url).toURL().openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "GET"
            conn.connectTimeout = 15000
            conn.readTimeout = readTimeoutMs
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            val code = conn.responseCode
            val ok = code in 200..299
            val stream = if (ok) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            HttpResult(ok, code, text)
        } finally {
            conn.disconnect()
        }
    }
}
