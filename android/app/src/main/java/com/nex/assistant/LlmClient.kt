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
    val arguments: JSONObject,
    val thoughtSignature: String? = null
)

data class LlmTurnMessage(
    val role: String, // "user", "assistant", "tool"
    val text: String = "",
    val imageAttachments: List<Pair<String, String>> = emptyList(),
    val toolCalls: List<LlmToolCall> = emptyList(),
    val toolCallId: String? = null,
    val toolName: String? = null,
    val rawGeminiParts: JSONArray? = null
)

data class LlmResponse(
    val text: String,
    val toolCalls: List<LlmToolCall> = emptyList(),
    val rawGeminiParts: JSONArray? = null,
    val usedProvider: String = "",
    val usedModel: String = "",
    val switchedFrom: String? = null
)

object LlmClient {
    val PROVIDERS: List<String> = listOf(
        "Gemini", "OpenAI", "Claude", "OpenRouter", "Mistral", "DeepSeek",
        "Qwen", "Groq", "Cerebras", "GitHub", "xAI", "NVIDIA", "Custom"
    )

    val PROVIDER_NOTES: Map<String, String> = mapOf(
        "Gemini" to "Google AI Studio · большой контекст",
        "OpenAI" to "GPT-4.1 / o3-mini",
        "Claude" to "Топ для сложного кода и архитектуры",
        "OpenRouter" to "1 ключ = сотни моделей + бесплатные :free",
        "Mistral" to "Devstral & Codestral специально под код",
        "DeepSeek" to "Сильный и дешёвый кодинг + reasoning",
        "Qwen" to "Alibaba DashScope · Qwen3 Coder",
        "Groq" to "Сверхвысокая скорость + бесплатный лимит",
        "Cerebras" to "Рекордная скорость генерации кода",
        "GitHub" to "Бесплатно по GitHub Token (PAT)",
        "xAI" to "Grok Code & Grok 3",
        "NVIDIA" to "DeepSeek, Qwen Coder, Kimi, Gemma",
        "Custom" to "Свой OpenAI Base URL / локальная Ollama"
    )

    val DEFAULT_MODELS: Map<String, List<String>> = linkedMapOf(
        "Gemini" to listOf("gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite", "gemini-2.0-flash"),
        "OpenAI" to listOf("gpt-4.1", "gpt-4.1-mini", "o3-mini", "gpt-4o"),
        "Claude" to listOf("claude-sonnet-4-5", "claude-opus-4-1", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"),
        "OpenRouter" to listOf("anthropic/claude-sonnet-4", "deepseek/deepseek-chat-v3-0324:free", "qwen/qwen3-coder:free", "mistralai/devstral-small:free"),
        "Mistral" to listOf("devstral-medium-latest", "devstral-small-latest", "codestral-latest", "mistral-large-latest"),
        "DeepSeek" to listOf("deepseek-chat", "deepseek-reasoner"),
        "Qwen" to listOf("qwen3-coder-plus", "qwen-plus", "qwen-turbo"),
        "Groq" to listOf("qwen/qwen3-32b", "llama-3.3-70b-versatile", "moonshotai/kimi-k2-instruct"),
        "Cerebras" to listOf("qwen-3-coder-480b", "qwen-3-32b", "llama-3.3-70b"),
        "GitHub" to listOf("gpt-4o", "DeepSeek-R1", "Codestral-2501", "Meta-Llama-3.3-70B-Instruct"),
        "xAI" to listOf("grok-code-fast-1", "grok-3", "grok-3-mini"),
        "NVIDIA" to listOf("deepseek-ai/deepseek-r1", "qwen/qwen2.5-coder-32b-instruct", "moonshotai/kimi-k2-instruct", "google/gemma-3-27b-it"),
        "Custom" to listOf("qwen2.5-coder:14b", "deepseek-r1:14b", "devstral:latest")
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
        "OpenRouter" to "https://openrouter.ai/api/v1/chat/completions",
        "Mistral" to "https://api.mistral.ai/v1/chat/completions",
        "DeepSeek" to "https://api.deepseek.com/chat/completions",
        "Qwen" to "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
        "Groq" to "https://api.groq.com/openai/v1/chat/completions",
        "Cerebras" to "https://api.cerebras.ai/v1/chat/completions",
        "GitHub" to "https://models.inference.ai.azure.com/chat/completions",
        "xAI" to "https://api.x.ai/v1/chat/completions",
        "NVIDIA" to "https://integrate.api.nvidia.com/v1/chat/completions"
    )

    private val MODELS_ENDPOINTS = mapOf(
        "OpenAI" to "https://api.openai.com/v1/models",
        "OpenRouter" to "https://openrouter.ai/api/v1/models",
        "Mistral" to "https://api.mistral.ai/v1/models",
        "DeepSeek" to "https://api.deepseek.com/models",
        "Qwen" to "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
        "Groq" to "https://api.groq.com/openai/v1/models",
        "Cerebras" to "https://api.cerebras.ai/v1/models",
        "GitHub" to "https://models.inference.ai.azure.com/models",
        "xAI" to "https://api.x.ai/v1/models",
        "NVIDIA" to "https://integrate.api.nvidia.com/v1/models"
    )

    private val providerCooldowns = java.util.concurrent.ConcurrentHashMap<String, Long>()
    fun clearCooldown(provider: String) { providerCooldowns.remove(provider) }
    fun isProviderReady(provider: String, keys: Map<String, String>, customBaseUrl: String = ""): Boolean =
        if (provider == "Custom") customBaseUrl.trim().isNotEmpty() else !keys[provider].isNullOrBlank()

    fun pickBestModelForProvider(provider: String, preferred: String?, catalog: Map<String, List<String>>): String {
        val cat = catalog[provider].orEmpty()
        if (!preferred.isNullOrBlank()) {
            if (cat.isEmpty() || cat.contains(preferred)) return preferred
            val base = preferred.substringBefore(":").split("-").take(2).joinToString("-").lowercase()
            val similar = cat.firstOrNull { it.lowercase().contains(base) }
            if (similar != null) return similar
        }
        return cat.firstOrNull() ?: DEFAULT_MODELS[provider]?.firstOrNull() ?: preferred.orEmpty()
    }

    private fun isQuotaOrFailoverError(msg: String): Pair<Boolean, Boolean> {
        val code = Regex("HTTP\s+(\d{3})", RegexOption.IGNORE_CASE).find(msg)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
        val hardRx = Regex("(insufficient[_\s-]?(balance|quota|funds|credit)|credit[s]?\s*(exhausted|depleted)|billing|payment\s*required|daily\s+limit|monthly\s+limit)", RegexOption.IGNORE_CASE)
        val softRx = Regex("(rate[_\s-]?limit|too\s+many\s+requests|resource[_\s-]?exhausted|quota|overloaded|high\s+demand|temporarily\s+unavailable|limit\s+exceeded)", RegexOption.IGNORE_CASE)
        if (code == 402 || hardRx.containsMatchIn(msg)) return true to true
        if (code == 429 || code == 503 || code == 529 || softRx.containsMatchIn(msg)) return true to false
        if (code == 403 && Regex("(quota|limit|credit|billing|exhausted|balance)", RegexOption.IGNORE_CASE).containsMatchIn(msg)) return true to true
        if (code == 404 && Regex("(model|not\s+found)", RegexOption.IGNORE_CASE).containsMatchIn(msg)) return true to false
        return false to false
    }

    suspend fun complete(
        provider: String, model: String, apiKey: String, systemPrompt: String,
        messages: List<LlmTurnMessage>, tools: List<ToolSpec>, effort: Effort,
        webSearchEnabled: Boolean, customBaseUrl: String = ""
    ): LlmResponse = withContext(Dispatchers.IO) {
        when (provider) {
            "Gemini" -> callGemini(model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort = true)
            "Claude" -> callClaude(model, apiKey, systemPrompt, messages, tools, effort, includeEffort = true)
            else -> callOpenAiCompatible(provider, model, apiKey, customBaseUrl, systemPrompt, messages, tools, effort, includeEffort = true)
        }
    }

    suspend fun completeWithFailover(
        primaryProvider: String, primaryModel: String, profileId: String?, allKeys: Map<String, String>,
        catalog: Map<String, List<String>>, customBaseUrl: String, autoFailover: Boolean,
        systemPrompt: String, messages: List<LlmTurnMessage>, tools: List<ToolSpec>, effort: Effort,
        webSearchEnabled: Boolean, onSwitch: (String, String, String) -> Unit = { _, _, _ -> }
    ): LlmResponse = withContext(Dispatchers.IO) {
        val candidates = mutableListOf<ModelTarget>()
        val seen = mutableSetOf<String>()
        fun push(p: String, m: String?) {
            if (p.isBlank() || seen.contains(p) || !isProviderReady(p, allKeys, customBaseUrl)) return
            val chosen = pickBestModelForProvider(p, m, catalog)
            if (chosen.isBlank()) return
            seen.add(p)
            candidates.add(ModelTarget(p, chosen))
        }
        push(primaryProvider, primaryModel)
        if (autoFailover) {
            (NexProfile.fromId(profileId) ?: NexProfile.QUARK).textRoutes.forEach { push(it.provider, it.model) }
            PROVIDERS.forEach { push(it, null) }
        }
        if (candidates.isEmpty()) error("No API key configured.")

        val now = System.currentTimeMillis()
        val ordered = candidates.filter { (providerCooldowns[it.provider] ?: 0L) <= now } +
            candidates.filter { (providerCooldowns[it.provider] ?: 0L) > now }.sortedBy { providerCooldowns[it.provider] ?: Long.MAX_VALUE }

        var lastErr: Exception? = null
        var switchedFrom: String? = null
        for (i in ordered.indices) {
            val cand = ordered[i]
            if (i > 0 || cand.provider != primaryProvider) {
                val fromP = switchedFrom ?: primaryProvider
                switchedFrom = fromP
                onSwitch(fromP, cand.provider, cand.model)
            }
            val safeMsgs = if (cand.provider == "Gemini") messages else messages.map { it.copy(rawGeminiParts = null) }
            val key = allKeys[cand.provider].orEmpty().ifBlank { if (cand.provider == "Custom") "local" else "" }
            try {
                val resp = when (cand.provider) {
                    "Gemini" -> callGemini(cand.model, key, systemPrompt, safeMsgs, tools, effort, webSearchEnabled, includeEffort = true)
                    "Claude" -> callClaude(cand.model, key, systemPrompt, safeMsgs, tools, effort, includeEffort = true)
                    else -> callOpenAiCompatible(cand.provider, cand.model, key, customBaseUrl, systemPrompt, safeMsgs, tools, effort, includeEffort = true)
                }
                providerCooldowns.remove(cand.provider)
                return@withContext resp.copy(usedProvider = cand.provider, usedModel = cand.model, switchedFrom = if (cand.provider != primaryProvider) primaryProvider else switchedFrom)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                lastErr = e
                val (shouldFailover, isHard) = isQuotaOrFailoverError(e.message.orEmpty())
                if (autoFailover && shouldFailover && i < ordered.lastIndex) {
                    providerCooldowns[cand.provider] = System.currentTimeMillis() + (if (isHard) 30L else 5L) * 60_000L
                    switchedFrom = switchedFrom ?: cand.provider
                    continue
                }
                throw e
            }
        }
        throw (lastErr ?: IllegalStateException("All connected AI providers failed."))
    }

    private val GEMINI_FALLBACK_MODELS = listOf("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash")

    private fun callGemini(
        model: String,
        apiKey: String,
        systemPrompt: String,
        messages: List<LlmTurnMessage>,
        tools: List<ToolSpec>,
        effort: Effort,
        webSearchEnabled: Boolean,
        includeEffort: Boolean,
        retryIndex: Int = 0,
        usedFallback: Boolean = false
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
                    if (msg.rawGeminiParts != null && msg.rawGeminiParts.length() > 0) {
                        // Preserve exact raw parts from Gemini (including thoughtSignature / thought parts)
                        contents.put(JSONObject().put("role", "model").put("parts", msg.rawGeminiParts))
                    } else {
                        val parts = JSONArray()
                        if (msg.text.isNotEmpty()) parts.put(JSONObject().put("text", msg.text))
                        msg.toolCalls.forEach { tc ->
                            val part = JSONObject().put(
                                "functionCall",
                                JSONObject().put("name", tc.name).put("args", tc.arguments)
                            )
                            if (!tc.thoughtSignature.isNullOrEmpty()) {
                                part.put("thoughtSignature", tc.thoughtSignature)
                            }
                            parts.put(part)
                        }
                        if (parts.length() > 0) {
                            contents.put(JSONObject().put("role", "model").put("parts", parts))
                        }
                    }
                }
                "tool" -> {
                    val fnRespPart = JSONObject().put(
                        "functionResponse",
                        JSONObject()
                            .put("name", msg.toolName ?: "tool")
                            .put("response", JSONObject().put("result", msg.text))
                    )
                    // Group consecutive tool responses into one user block for parallel tool calls
                    val lastObj = if (contents.length() > 0) contents.optJSONObject(contents.length() - 1) else null
                    val lastParts = lastObj?.optJSONArray("parts")
                    var allFnResp = lastObj?.optString("role") == "user" && lastParts != null && lastParts.length() > 0
                    if (allFnResp && lastParts != null) {
                        for (k in 0 until lastParts.length()) {
                            if (!lastParts.getJSONObject(k).has("functionResponse")) {
                                allFnResp = false
                                break
                            }
                        }
                    }
                    if (allFnResp && lastParts != null) {
                        lastParts.put(fnRespPart)
                    } else {
                        contents.put(JSONObject().put("role", "user").put("parts", JSONArray().put(fnRespPart)))
                    }
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
            if (includeEffort && res.code == 400 &&
                res.body.contains("thinking", ignoreCase = true) &&
                !res.body.contains("thought_signature", ignoreCase = true)
            ) {
                return callGemini(model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort = false, retryIndex = retryIndex, usedFallback = usedFallback)
            }
            if (res.code == 503 || res.code == 429) {
                if (retryIndex < 2) {
                    Thread.sleep(1200L * (retryIndex + 1))
                    return callGemini(model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort, retryIndex = retryIndex + 1, usedFallback = usedFallback)
                }
                if (!usedFallback) {
                    val fb = GEMINI_FALLBACK_MODELS.firstOrNull { it != model }
                    if (fb != null) {
                        return callGemini(fb, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort, retryIndex = 0, usedFallback = true)
                    }
                }
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
                val sig = part.optString("thoughtSignature", "")
                    .ifEmpty { part.optString("thought_signature", "") }
                    .ifEmpty { null }
                calls.add(
                    LlmToolCall(
                        id = "gem_${System.nanoTime()}_$i",
                        name = fc.getString("name"),
                        arguments = fc.optJSONObject("args") ?: JSONObject(),
                        thoughtSignature = sig
                    )
                )
            }
        }
        return LlmResponse(sb.toString().trim(), calls, rawGeminiParts = parts)
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
        provider: String, model: String, apiKey: String, customBaseUrl: String, systemPrompt: String,
        messages: List<LlmTurnMessage>, tools: List<ToolSpec>, effort: Effort, includeEffort: Boolean
    ): LlmResponse {
        val url = if (provider == "Custom") {
            val clean = customBaseUrl.trim().trimEnd('/')
            if (clean.isEmpty()) error("Custom Base URL is not configured in Settings -> AI")
            if (clean.endsWith("/chat/completions")) clean else "$clean/chat/completions"
        } else OPENAI_ENDPOINTS[provider] ?: error("Unknown provider: $provider")
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

        val hdrs = mutableMapOf("Authorization" to "Bearer ${apiKey.ifBlank { "local" }}")
        if (provider == "OpenRouter") { hdrs["HTTP-Referer"] = "https://nex.assistant.local"; hdrs["X-Title"] = "Nex Assistant" }
        val res = postRaw(url, hdrs, body.toString())
        if (!res.ok) {
            if (includeEffort && res.code == 400 && res.body.contains("reasoning_effort", ignoreCase = true)) {
                return callOpenAiCompatible(provider, model, apiKey, customBaseUrl, systemPrompt, messages, tools, effort, includeEffort = false)
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

    suspend fun fetchModels(provider: String, apiKey: String, customBaseUrl: String = ""): List<String> = withContext(Dispatchers.IO) {
        if (!isProviderReady(provider, mapOf(provider to apiKey), customBaseUrl)) return@withContext emptyList()
        val skipRx = Regex("(embed|embedding|whisper|tts|audio|speech|moderation|dall-e|imagen|veo|realtime|transcribe|rerank)", RegexOption.IGNORE_CASE)
        fun cleanList(raw: List<String>): List<String> {
            val base = raw.distinct().filter { it.isNotBlank() && !skipRx.containsMatchIn(it) }
            return when (provider) {
                "Gemini" -> base.filter { it.startsWith("gemini") }.take(60)
                "NVIDIA" -> base.filter { Regex("(deepseek|qwen|gemma|kimi|minimax|llama|mistral|codestral|devstral)", RegexOption.IGNORE_CASE).containsMatchIn(it) }.take(60)
                "OpenRouter" -> {
                    val prio = base.filter { Regex("(claude|gpt-4|gpt-5|o3|o4|gemini|deepseek|qwen|codestral|devstral|mistral|grok|kimi|llama-3\\.3|:free)", RegexOption.IGNORE_CASE).containsMatchIn(it) }
                    (if (prio.isNotEmpty()) prio else base).take(80)
                }
                else -> base.take(80)
            }
        }
        when (provider) {
            "Gemini" -> {
                val res = getRaw("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", mapOf("x-goog-api-key" to apiKey))
                if (!res.ok) return@withContext emptyList()
                val arr = JSONObject(res.body).optJSONArray("models") ?: return@withContext emptyList()
                cleanList((0 until arr.length()).map { arr.getJSONObject(it).optString("name").removePrefix("models/") })
            }
            "Claude" -> {
                val res = getRaw("https://api.anthropic.com/v1/models", mapOf("x-api-key" to apiKey, "anthropic-version" to "2023-06-01"))
                if (!res.ok) return@withContext emptyList()
                val arr = JSONObject(res.body).optJSONArray("data") ?: return@withContext emptyList()
                cleanList((0 until arr.length()).map { arr.getJSONObject(it).optString("id") })
            }
            else -> {
                val url = if (provider == "Custom") {
                    val c = customBaseUrl.trim().trimEnd('/').removeSuffix("/chat/completions")
                    if (c.endsWith("/models")) c else "$c/models"
                } else MODELS_ENDPOINTS[provider] ?: return@withContext emptyList()
                val res = getRaw(url, mapOf("Authorization" to "Bearer ${apiKey.ifBlank { "local" }}"))
                if (!res.ok) return@withContext emptyList()
                val trimmed = res.body.trim()
                val arr = if (trimmed.startsWith("[")) JSONArray(trimmed)
                else JSONObject(trimmed).optJSONArray("data") ?: JSONObject(trimmed).optJSONArray("models") ?: return@withContext emptyList()
                cleanList((0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let { o -> o.optString("id").ifBlank { o.optString("name") } } })
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
