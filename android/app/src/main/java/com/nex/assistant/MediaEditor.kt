package com.nex.assistant

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import kotlin.math.min

enum class PhotoFilter(val id: String, val labelRu: String, val labelEn: String) {
    NONE("none", "Оригинал", "Original"),
    GRAYSCALE("gray", "Ч/Б", "B&W"),
    SEPIA("sepia", "Сепия", "Sepia"),
    WARM("warm", "Тёплый", "Warm"),
    COOL("cool", "Холодный", "Cool");

    fun label(lang: String): String = if (lang == "en") labelEn else labelRu
}

enum class CropAspect(val id: String, val label: String) {
    ORIGINAL("orig", "Original"),
    SQUARE("1:1", "1:1"),
    WIDE("16:9", "16:9"),
    PORTRAIT("4:5", "4:5")
}

data class PhotoEditParams(
    val brightness: Float = 0f,     // -100..+100
    val contrast: Float = 1f,       // 0.5..2.0
    val saturation: Float = 1f,     // 0.0..2.0
    val rotationDeg: Int = 0,       // 0, 90, 180, 270
    val flipHorizontal: Boolean = false,
    val filter: PhotoFilter = PhotoFilter.NONE,
    val cropAspect: CropAspect = CropAspect.ORIGINAL,
    val overlayText: String = ""
)

object MediaEditor {

    fun importUriToMediaFile(ctx: Context, uri: Uri, isVideo: Boolean): File {
        val dir = File(ctx.filesDir, "media").apply { mkdirs() }
        val ext = if (isVideo) "mp4" else "png"
        val out = File(dir, "${if (isVideo) "vid" else "img"}_import_${System.currentTimeMillis()}.$ext")
        ctx.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(out).use { output -> input.copyTo(output) }
        } ?: error("Cannot read selected media file.")
        return out
    }

    fun applyPhotoEdits(source: Bitmap, params: PhotoEditParams): Bitmap {
        // 1. Rotate / Flip
        val matrix = Matrix()
        if (params.rotationDeg % 360 != 0) matrix.postRotate((params.rotationDeg % 360).toFloat())
        if (params.flipHorizontal) matrix.postScale(-1f, 1f)
        val transformed = Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)

        // 2. Center Crop by aspect ratio
        val cropped = cropByAspect(transformed, params.cropAspect)

        // 3. Apply ColorMatrix (filter + saturation + contrast + brightness)
        val result = Bitmap.createBitmap(cropped.width, cropped.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(result)
        val cm = ColorMatrix()

        val satMatrix = ColorMatrix().apply { setSaturation(params.saturation) }
        cm.postConcat(satMatrix)

        when (params.filter) {
            PhotoFilter.GRAYSCALE -> cm.postConcat(ColorMatrix().apply { setSaturation(0f) })
            PhotoFilter.SEPIA -> cm.postConcat(
                ColorMatrix(
                    floatArrayOf(
                        0.393f, 0.769f, 0.189f, 0f, 0f,
                        0.349f, 0.686f, 0.168f, 0f, 0f,
                        0.272f, 0.534f, 0.131f, 0f, 0f,
                        0f, 0f, 0f, 1f, 0f
                    )
                )
            )
            PhotoFilter.WARM -> cm.postConcat(
                ColorMatrix(
                    floatArrayOf(
                        1.14f, 0f, 0f, 0f, 8f,
                        0f, 1.03f, 0f, 0f, 2f,
                        0f, 0f, 0.88f, 0f, -6f,
                        0f, 0f, 0f, 1f, 0f
                    )
                )
            )
            PhotoFilter.COOL -> cm.postConcat(
                ColorMatrix(
                    floatArrayOf(
                        0.88f, 0f, 0f, 0f, -6f,
                        0f, 1.02f, 0f, 0f, 2f,
                        0f, 0f, 1.16f, 0f, 10f,
                        0f, 0f, 0f, 1f, 0f
                    )
                )
            )
            PhotoFilter.NONE -> {}
        }

        val c = params.contrast
        val t = (-0.5f * c + 0.5f) * 255f + params.brightness
        cm.postConcat(
            ColorMatrix(
                floatArrayOf(
                    c, 0f, 0f, 0f, t,
                    0f, c, 0f, 0f, t,
                    0f, 0f, c, 0f, t,
                    0f, 0f, 0f, 1f, 0f
                )
            )
        )

        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
            colorFilter = ColorMatrixColorFilter(cm)
        }
        canvas.drawBitmap(cropped, 0f, 0f, paint)

        // 4. Optional Text Overlay
        val caption = params.overlayText.trim()
        if (caption.isNotEmpty()) {
            val textSize = (min(result.width, result.height) * 0.075f).coerceIn(24f, 120f)
            val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                this.textSize = textSize
                textAlign = Paint.Align.CENTER
                setShadowLayer(textSize * 0.14f, 0f, 2f, Color.BLACK)
                isFakeBoldText = true
            }
            val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(120, 0, 0, 0)
            }
            val y = result.height - textSize * 1.1f
            val textWidth = textPaint.measureText(caption)
            canvas.drawRoundRect(
                result.width / 2f - textWidth / 2f - 24f,
                y - textSize,
                result.width / 2f + textWidth / 2f + 24f,
                y + textSize * 0.35f,
                16f, 16f, bgPaint
            )
            canvas.drawText(caption, result.width / 2f, y, textPaint)
        }

        if (transformed !== source && transformed !== cropped) transformed.recycle()
        if (cropped !== source && cropped !== transformed) cropped.recycle()
        return result
    }

    private fun cropByAspect(src: Bitmap, aspect: CropAspect): Bitmap {
        val ratio = when (aspect) {
            CropAspect.ORIGINAL -> return src
            CropAspect.SQUARE -> 1f
            CropAspect.WIDE -> 16f / 9f
            CropAspect.PORTRAIT -> 4f / 5f
        }
        val curRatio = src.width.toFloat() / src.height.toFloat()
        val (w, h) = if (curRatio > ratio) {
            (src.height * ratio).toInt().coerceAtLeast(1) to src.height
        } else {
            src.width to (src.width / ratio).toInt().coerceAtLeast(1)
        }
        val x = ((src.width - w) / 2).coerceAtLeast(0)
        val y = ((src.height - h) / 2).coerceAtLeast(0)
        return Bitmap.createBitmap(src, x, y, w.coerceAtMost(src.width), h.coerceAtMost(src.height))
    }

    suspend fun saveEditedPhoto(ctx: Context, sourcePath: String, params: PhotoEditParams): MediaItem =
        withContext(Dispatchers.IO) {
            val bmp = BitmapFactory.decodeFile(sourcePath) ?: error("Could not decode photo")
            val edited = applyPhotoEdits(bmp, params)
            val dir = File(ctx.filesDir, "media").apply { mkdirs() }
            val out = File(dir, "img_edit_${System.currentTimeMillis()}.png")
            FileOutputStream(out).use { edited.compress(Bitmap.CompressFormat.PNG, 95, it) }
            bmp.recycle()
            edited.recycle()
            MediaItem(
                isVideo = false,
                filePath = out.absolutePath,
                modelName = "Nex Photo Editor",
                prompt = params.overlayText.ifBlank { "Edited photo" }
            )
        }

    fun getVideoDurationMs(videoPath: String): Long {
        val mmr = MediaMetadataRetriever()
        return try {
            mmr.setDataSource(videoPath)
            mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
        } catch (_: Exception) {
            0L
        } finally {
            runCatching { mmr.release() }
        }
    }

    suspend fun extractVideoFrame(ctx: Context, videoPath: String, timeMs: Long): MediaItem =
        withContext(Dispatchers.IO) {
            val mmr = MediaMetadataRetriever()
            val frame = try {
                mmr.setDataSource(videoPath)
                mmr.getFrameAtTime(timeMs.coerceAtLeast(0L) * 1000L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                    ?: error("Could not extract frame at ${timeMs}ms")
            } finally {
                runCatching { mmr.release() }
            }
            val dir = File(ctx.filesDir, "media").apply { mkdirs() }
            val out = File(dir, "img_frame_${System.currentTimeMillis()}.png")
            FileOutputStream(out).use { frame.compress(Bitmap.CompressFormat.PNG, 95, it) }
            frame.recycle()
            MediaItem(
                isVideo = false,
                filePath = out.absolutePath,
                modelName = "Video Frame (${timeMs / 1000}s)",
                prompt = "Extracted frame"
            )
        }

    /**
     * Real lossless native Android video trim + optional audio removal using MediaExtractor + MediaMuxer.
     */
    suspend fun trimVideo(
        ctx: Context,
        sourcePath: String,
        startMs: Long,
        endMs: Long,
        removeAudio: Boolean
    ): MediaItem = withContext(Dispatchers.IO) {
        val startUs = startMs.coerceAtLeast(0L) * 1000L
        val endUs = endMs.coerceAtLeast(startMs + 500L) * 1000L
        val dir = File(ctx.filesDir, "media").apply { mkdirs() }
        val outFile = File(dir, "vid_edit_${System.currentTimeMillis()}.mp4")

        val extractor = MediaExtractor()
        extractor.setDataSource(sourcePath)
        val muxer = MediaMuxer(outFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

        val trackMap = mutableMapOf<Int, Int>()
        var maxBufferSize = 1024 * 1024

        try {
            val mmr = MediaMetadataRetriever()
            runCatching {
                mmr.setDataSource(sourcePath)
                mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull()?.let { rot ->
                    muxer.setOrientationHint(rot)
                }
            }
            runCatching { mmr.release() }

            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
                val isVideo = mime.startsWith("video/")
                val isAudio = mime.startsWith("audio/")
                if (!isVideo && !(isAudio && !removeAudio)) continue
                extractor.selectTrack(i)
                val dstIdx = muxer.addTrack(format)
                trackMap[i] = dstIdx
                if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                    maxBufferSize = maxOf(maxBufferSize, format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE))
                }
            }
            if (trackMap.isEmpty()) error("No compatible tracks found in video.")

            muxer.start()
            val buffer = ByteBuffer.allocate(maxBufferSize)
            val info = MediaCodec.BufferInfo()
            extractor.seekTo(startUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

            val firstPtsByTrack = mutableMapOf<Int, Long>()
            while (true) {
                val sampleSize = extractor.readSampleData(buffer, 0)
                if (sampleSize < 0) break
                val srcTrack = extractor.sampleTrackIndex
                val dstTrack = trackMap[srcTrack]
                val pts = extractor.sampleTime
                if (pts > endUs) break
                if (dstTrack != null && pts >= 0L) {
                    val basePts = firstPtsByTrack.getOrPut(srcTrack) { pts }
                    info.offset = 0
                    info.size = sampleSize
                    info.presentationTimeUs = (pts - basePts).coerceAtLeast(0L)
                    info.flags = extractor.sampleFlags
                    muxer.writeSampleData(dstTrack, buffer, info)
                }
                extractor.advance()
            }
            muxer.stop()
        } catch (e: Exception) {
            outFile.delete()
            throw e
        } finally {
            runCatching { muxer.release() }
            runCatching { extractor.release() }
        }

        MediaItem(
            isVideo = true,
            filePath = outFile.absolutePath,
            modelName = "Nex Video Editor${if (removeAudio) " (Muted)" else ""}",
            prompt = "Trimmed ${startMs / 1000}s–${endMs / 1000}s"
        )
    }
}
