package com.nex.assistant

import android.content.Context
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URI

/**
 * Real AI Media Engine:
 * - Image generation (Gemini & OpenAI)
 * - AI Photo Editing (image + instruction -> edited image via Gemini or OpenAI /v1/images/edits)
 * - Video generation & Image-to-Video (Gemini)
 */
object MediaGenerator {
    suspend fun generateImage(
        ctx: Context,
        provider: String,
        model: String,
        apiKey: String,
        prompt: String
    ): MediaItem = withContext(Dispatchers.IO) {
        val dir = File(ctx.filesDir, "media").apply { mkdirs() }
        val bytes: ByteArray = when (provider) {
            "OpenAI" -> generateOpenAiImage(model, apiKey, prompt)
            else -> generateGeminiImage(model, apiKey, prompt, sourceImage = null)
        }
        val out = File(dir, "img_${System.currentTimeMillis()}.png")
        out.writeBytes(bytes)
        MediaItem(
            isVideo = false,
            filePath = out.absolutePath,
            modelName = "$provider · $model",
            prompt = prompt
        )
    }

    suspend fun editImageWithAi(
        ctx: Context,
        provider: String,
        model: String,
        apiKey: String,
        sourceFile: File,
        instruction: String
    ): MediaItem = withContext(Dispatchers.IO) {
        if (!sourceFile.exists()) error("Source photo not found.")
        val dir = File(ctx.filesDir, "media").apply { mkdirs() }
        val sourceBytes = sourceFile.readBytes()
        val bytes: ByteArray = when (provider) {
            "OpenAI" -> editOpenAiImage(model, apiKey, sourceBytes, instruction)
            else -> generateGeminiImage(model, apiKey, instruction, sourceImage = sourceBytes)
        }
        val out = File(dir, "img_ai_edit_${System.currentTimeMillis()}.png")
        out.writeBytes(bytes)
        MediaItem(
            isVideo = false,
            filePath = out.absolutePath,
            modelName = "$provider · $model (AI Edit)",
            prompt = instruction
        )
    }

    suspend fun generateVideo(
        ctx: Context,
        provider: String,
        model: String,
        apiKey: String,
        prompt: String,
        referencePhoto: File? = null
    ): MediaItem = withContext(Dispatchers.IO) {
        if (provider != "Gemini") error("Video generation is currently supported via Gemini API.")
        val dir = File(ctx.filesDir, "media").apply { mkdirs() }
        val refBytes = referencePhoto?.takeIf { it.exists() }?.readBytes()
        val bytes = generateGeminiVideo(model, apiKey, prompt, refBytes)
        val out = File(dir, "vid_${System.currentTimeMillis()}.mp4")
        out.writeBytes(bytes)
        MediaItem(
            isVideo = true,
            filePath = out.absolutePath,
            modelName = "$provider · $model",
            prompt = prompt
        )
    }

    private fun generateGeminiImage(
        model: String,
        apiKey: String,
        prompt: String,
        sourceImage: ByteArray?
    ): ByteArray {
        val parts = JSONArray()
        if (sourceImage != null) {
            parts.put(
                JSONObject().put(
                    "inlineData",
                    JSONObject()
                        .put("mimeType", "image/png")
                        .put("data", Base64.encodeToString(sourceImage, Base64.NO_WRAP))
                )
            )
        }
        parts.put(JSONObject().put("text", prompt))

        val body = JSONObject()
            .put("contents", JSONArray().put(JSONObject().put("parts", parts)))
            .put(
                "generationConfig",
                JSONObject().put("responseModalities", JSONArray().put("TEXT").put("IMAGE"))
            )
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent"
        val res = LlmClient.postRaw(url, mapOf("x-goog-api-key" to apiKey), body.toString(), 120000)
        if (!res.ok) error("Gemini Image HTTP ${res.code}: ${res.body.take(300)}")
        val root = JSONObject(res.body)
        val outParts = root.getJSONArray("candidates")
            .getJSONObject(0)
            .getJSONObject("content")
            .getJSONArray("parts")
        for (i in 0 until outParts.length()) {
            val inline = outParts.getJSONObject(i).optJSONObject("inlineData")
            if (inline != null && inline.optString("data").isNotEmpty()) {
                return Base64.decode(inline.getString("data"), Base64.DEFAULT)
            }
        }
        error("Gemini did not return image bytes for $model")
    }

    private fun generateOpenAiImage(model: String, apiKey: String, prompt: String): ByteArray {
        val body = JSONObject()
            .put("model", model)
            .put("prompt", prompt)
            .put("size", "1024x1024")
        val res = LlmClient.postRaw(
            "https://api.openai.com/v1/images/generations",
            mapOf("Authorization" to "Bearer $apiKey"),
            body.toString(),
            120000
        )
        if (!res.ok) error("OpenAI Image HTTP ${res.code}: ${res.body.take(300)}")
        return parseOpenAiImageResponse(res.body)
    }

    private fun editOpenAiImage(model: String, apiKey: String, pngBytes: ByteArray, instruction: String): ByteArray {
        val boundary = "----NexMultipart${System.currentTimeMillis()}"
        val bos = ByteArrayOutputStream()
        fun writeField(name: String, value: String) {
            bos.write("--$boundary\r\n".toByteArray())
            bos.write("Content-Disposition: form-data; name=\"$name\"\r\n\r\n".toByteArray())
            bos.write(value.toByteArray(Charsets.UTF_8))
            bos.write("\r\n".toByteArray())
        }
        writeField("model", model)
        writeField("prompt", instruction)
        bos.write("--$boundary\r\n".toByteArray())
        bos.write("Content-Disposition: form-data; name=\"image\"; filename=\"source.png\"\r\n".toByteArray())
        bos.write("Content-Type: image/png\r\n\r\n".toByteArray())
        bos.write(pngBytes)
        bos.write("\r\n--$boundary--\r\n".toByteArray())

        val conn = URI.create("https://api.openai.com/v1/images/edits").toURL().openConnection() as HttpURLConnection
        val text = try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = 120000
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            conn.outputStream.use { it.write(bos.toByteArray()) }
            val ok = conn.responseCode in 200..299
            val stream = if (ok) conn.inputStream else conn.errorStream
            val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (!ok) error("OpenAI Edit HTTP ${conn.responseCode}: ${body.take(300)}")
            body
        } finally {
            conn.disconnect()
        }
        return parseOpenAiImageResponse(text)
    }

    private fun parseOpenAiImageResponse(body: String): ByteArray {
        val item = JSONObject(body).getJSONArray("data").getJSONObject(0)
        val b64 = item.optString("b64_json")
        if (b64.isNotEmpty()) return Base64.decode(b64, Base64.DEFAULT)
        val imgUrl = item.optString("url")
        if (imgUrl.isNotEmpty()) return downloadBytes(imgUrl, emptyMap())
        error("OpenAI image response contained neither b64_json nor url")
    }

    private suspend fun generateGeminiVideo(
        model: String,
        apiKey: String,
        prompt: String,
        referenceImage: ByteArray?
    ): ByteArray {
        val inst = JSONObject().put("prompt", prompt)
        if (referenceImage != null) {
            inst.put(
                "image",
                JSONObject()
                    .put("bytesBase64Encoded", Base64.encodeToString(referenceImage, Base64.NO_WRAP))
                    .put("mimeType", "image/png")
            )
        }
        val lrBody = JSONObject()
            .put("instances", JSONArray().put(inst))
            .put("parameters", JSONObject().put("aspectRatio", "16:9"))
        val lrUrl = "https://generativelanguage.googleapis.com/v1beta/models/$model:predictLongRunning"
        val lrRes = LlmClient.postRaw(lrUrl, mapOf("x-goog-api-key" to apiKey), lrBody.toString(), 60000)

        if (lrRes.ok) {
            val opName = JSONObject(lrRes.body).optString("name")
            if (opName.isNotEmpty()) {
                repeat(40) {
                    delay(3500)
                    val poll = LlmClient.getRaw(
                        "https://generativelanguage.googleapis.com/v1beta/$opName",
                        mapOf("x-goog-api-key" to apiKey)
                    )
                    if (!poll.ok) error("Video poll HTTP ${poll.code}: ${poll.body.take(250)}")
                    val obj = JSONObject(poll.body)
                    if (obj.optBoolean("done", false)) {
                        val err = obj.optJSONObject("error")
                        if (err != null) error(err.optString("message", "Video generation failed"))
                        val resp = obj.optJSONObject("response")
                        val samples = resp?.optJSONObject("generateVideoResponse")
                            ?.optJSONArray("generatedSamples")
                        if (samples != null && samples.length() > 0) {
                            val videoObj = samples.getJSONObject(0).optJSONObject("video")
                            val uri = videoObj?.optString("uri").orEmpty()
                            if (uri.isNotEmpty()) {
                                return downloadBytes(uri, mapOf("x-goog-api-key" to apiKey))
                            }
                            val b64 = videoObj?.optString("bytesBase64Encoded").orEmpty()
                            if (b64.isNotEmpty()) return Base64.decode(b64, Base64.DEFAULT)
                        }
                        error("Video operation finished without playable media URI")
                    }
                }
                error("Video generation timed out")
            }
        }

        val syncParts = JSONArray()
        if (referenceImage != null) {
            syncParts.put(
                JSONObject().put(
                    "inlineData",
                    JSONObject()
                        .put("mimeType", "image/png")
                        .put("data", Base64.encodeToString(referenceImage, Base64.NO_WRAP))
                )
            )
        }
        syncParts.put(JSONObject().put("text", prompt))
        val syncBody = JSONObject()
            .put("contents", JSONArray().put(JSONObject().put("parts", syncParts)))
            .put("generationConfig", JSONObject().put("responseModalities", JSONArray().put("VIDEO")))
        val syncRes = LlmClient.postRaw(
            "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent",
            mapOf("x-goog-api-key" to apiKey),
            syncBody.toString(),
            120000
        )
        if (!syncRes.ok) error("Gemini Video HTTP ${syncRes.code}: ${syncRes.body.take(300)}")
        val parts = JSONObject(syncRes.body).getJSONArray("candidates")
            .getJSONObject(0).getJSONObject("content").getJSONArray("parts")
        for (i in 0 until parts.length()) {
            val inline = parts.getJSONObject(i).optJSONObject("inlineData")
            if (inline != null && inline.optString("data").isNotEmpty()) {
                return Base64.decode(inline.getString("data"), Base64.DEFAULT)
            }
        }
        error("Gemini did not return video data for $model")
    }

    private fun downloadBytes(url: String, headers: Map<String, String>): ByteArray {
        val conn = URI.create(url).toURL().openConnection() as HttpURLConnection
        return try {
            conn.connectTimeout = 15000
            conn.readTimeout = 90000
            conn.instanceFollowRedirects = true
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            if (conn.responseCode !in 200..299) error("Download HTTP ${conn.responseCode}")
            conn.inputStream.use { it.readBytes() }
        } finally {
            conn.disconnect()
        }
    }
}
