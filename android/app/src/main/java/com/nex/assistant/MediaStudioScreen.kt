package com.nex.assistant

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.widget.MediaController
import android.widget.VideoView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun MediaStudioScreen(
    ctrl: NexController,
    onPickPhoto: () -> Unit,
    onPickVideo: () -> Unit
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val current = ctrl.editingMedia
    var statusMsg by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize()) {
        SubScreenTopBar(title = ctrl.t("media_studio"), onBack = { ctrl.goBack() })

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onPickPhoto, modifier = Modifier.weight(1f)) {
                    Text(ctrl.t("pick_photo"))
                }
                OutlinedButton(onClick = onPickVideo, modifier = Modifier.weight(1f)) {
                    Text(ctrl.t("pick_video"))
                }
            }

            if (statusMsg.isNotBlank()) {
                Text(statusMsg, style = MaterialTheme.typography.bodySmall, color = NexOkColor)
            }

            if (current != null && File(current.filePath).exists()) {
                if (!current.isVideo) {
                    PhotoEditorPanel(
                        ctrl = ctrl,
                        item = current,
                        onStatus = { statusMsg = it }
                    )
                } else {
                    VideoEditorPanel(
                        ctrl = ctrl,
                        item = current,
                        onStatus = { statusMsg = it },
                        onTrimSaved = { trimmed ->
                            ctrl.registerMediaItem(trimmed, postToChat = true)
                            statusMsg = if (ctrl.lang == "en") "Trimmed video saved!" else "Обрезанное видео сохранено!"
                        },
                        onFrameExtracted = { frame ->
                            ctrl.registerMediaItem(frame, postToChat = false)
                            statusMsg = if (ctrl.lang == "en") "Frame extracted to photo editor!" else "Кадр извлечён в редактор фото!"
                        }
                    )
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (ctrl.lang == "en") "Pick a photo or video above, or tap Edit on any image/video in chat." else "Выбери фото или видео сверху, либо нажми «Редактировать» у любой картинки/видео в чате.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(18.dp)
                    )
                }
            }

            // Saved Media Gallery
            if (ctrl.mediaItems.isNotEmpty()) {
                HorizontalDivider()
                Text(
                    text = if (ctrl.lang == "en") "Saved Photos & Videos (${ctrl.mediaItems.size})" else "Сохранённые фото и видео (${ctrl.mediaItems.size})",
                    fontWeight = FontWeight.Bold
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ctrl.mediaItems.forEach { item ->
                        val selected = item.id == current?.id
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(
                                if (selected) 2.dp else 1.dp,
                                if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                            ),
                            modifier = Modifier
                                .width(116.dp)
                                .clickable { ctrl.editingMedia = item }
                        ) {
                            Column(Modifier.padding(8.dp)) {
                                Text(
                                    if (item.isVideo) "VIDEO" else "PHOTO",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (item.isVideo) NexWarnColor else NexOkColor
                                )
                                Text(
                                    item.prompt.ifBlank { item.modelName },
                                    style = MaterialTheme.typography.labelSmall,
                                    maxLines = 2
                                )
                                IconButton(
                                    onClick = {
                                        val f = File(item.filePath)
                                        if (f.exists()) {
                                            runCatching {
                                                val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", f)
                                                val share = Intent(Intent.ACTION_SEND).apply {
                                                    type = if (item.isVideo) "video/mp4" else "image/png"
                                                    putExtra(Intent.EXTRA_STREAM, uri)
                                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                                }
                                                ctx.startActivity(Intent.createChooser(share, ctrl.t("share")))
                                            }
                                        }
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.Share, contentDescription = ctrl.t("share"), modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PhotoEditorPanel(
    ctrl: NexController,
    item: MediaItem,
    onStatus: (String) -> Unit
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()

    var brightness by remember(item.id) { mutableFloatStateOf(0f) }
    var contrast by remember(item.id) { mutableFloatStateOf(1f) }
    var saturation by remember(item.id) { mutableFloatStateOf(1f) }
    var rotation by remember(item.id) { mutableIntStateOf(0) }
    var flipH by remember(item.id) { mutableStateOf(false) }
    var filter by remember(item.id) { mutableStateOf(PhotoFilter.NONE) }
    var crop by remember(item.id) { mutableStateOf(CropAspect.ORIGINAL) }
    var overlayText by remember(item.id) { mutableStateOf("") }
    var aiPrompt by remember(item.id) { mutableStateOf("") }

    val params = PhotoEditParams(brightness, contrast, saturation, rotation, flipH, filter, crop, overlayText)

    val sourcePreview: Bitmap? = remember(item.filePath) {
        val opts = BitmapFactory.Options().apply { inSampleSize = 2 }
        BitmapFactory.decodeFile(item.filePath, opts) ?: BitmapFactory.decodeFile(item.filePath)
    }

    val livePreview: Bitmap? = remember(sourcePreview, params) {
        sourcePreview?.let { runCatching { MediaEditor.applyPhotoEdits(it, params) }.getOrNull() }
    }

    if (livePreview != null) {
        Image(
            bitmap = livePreview.asImageBitmap(),
            contentDescription = item.prompt,
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .clip(RoundedCornerShape(14.dp))
        )
    }

    // Filters
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        PhotoFilter.entries.forEach { f ->
            FilterChip(
                selected = filter == f,
                onClick = { filter = f },
                label = { Text(f.label(ctrl.lang)) }
            )
        }
    }

    // Crop & Transform
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        CropAspect.entries.forEach { c ->
            FilterChip(selected = crop == c, onClick = { crop = c }, label = { Text(c.label) })
        }
        OutlinedButton(onClick = { rotation = (rotation + 90) % 360 }) { Text("↻ 90°") }
        OutlinedButton(onClick = { flipH = !flipH }) { Text("⇄") }
    }

    // Sliders
    Text("${if (ctrl.lang == "en") "Brightness" else "Яркость"}: ${brightness.toInt()}")
    Slider(value = brightness, onValueChange = { brightness = it }, valueRange = -100f..100f)

    Text("${if (ctrl.lang == "en") "Contrast" else "Контраст"}: ${"%.2f".format(contrast)}")
    Slider(value = contrast, onValueChange = { contrast = it }, valueRange = 0.5f..2.0f)

    Text("${if (ctrl.lang == "en") "Saturation" else "Насыщенность"}: ${"%.2f".format(saturation)}")
    Slider(value = saturation, onValueChange = { saturation = it }, valueRange = 0f..2.0f)

    OutlinedTextField(
        value = overlayText,
        onValueChange = { overlayText = it },
        modifier = Modifier.fillMaxWidth(),
        label = { Text(if (ctrl.lang == "en") "Caption / Text overlay" else "Подпись на фото") },
        singleLine = true
    )

    Button(
        onClick = {
            scope.launch {
                val res = runCatching { MediaEditor.saveEditedPhoto(ctx, item.filePath, params) }
                res.onSuccess { saved ->
                    ctrl.registerMediaItem(saved, postToChat = true)
                    onStatus(if (ctrl.lang == "en") "Edited photo saved & added to chat!" else "Отредактированное фото сохранено!")
                }.onFailure { onStatus("Error: ${it.message}") }
            }
        },
        modifier = Modifier.fillMaxWidth()
    ) { Text(ctrl.t("save_copy")) }

    HorizontalDivider()

    // AI Photo Edit & Image-to-Video (Nex Foton)
    Text(ctrl.t("ai_edit_btn"), fontWeight = FontWeight.Bold)
    OutlinedTextField(
        value = aiPrompt,
        onValueChange = { aiPrompt = it },
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text(ctrl.t("ai_edit_hint")) },
        maxLines = 3
    )
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(
            enabled = !ctrl.isBusy && aiPrompt.isNotBlank(),
            onClick = { ctrl.runAiPhotoEdit(item.filePath, aiPrompt, onStatus) },
            modifier = Modifier.weight(1f)
        ) { Text(ctrl.t("ai_edit_btn")) }
        OutlinedButton(
            enabled = !ctrl.isBusy && aiPrompt.isNotBlank(),
            onClick = { ctrl.runAiImageToVideo(item.filePath, aiPrompt, onStatus) },
            modifier = Modifier.weight(1f)
        ) { Text(if (ctrl.lang == "en") "Animate → Video" else "Оживить → Видео") }
    }
}

@Composable
private fun VideoEditorPanel(
    ctrl: NexController,
    item: MediaItem,
    onStatus: (String) -> Unit,
    onTrimSaved: (MediaItem) -> Unit,
    onFrameExtracted: (MediaItem) -> Unit
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val durationMs = remember(item.filePath) { MediaEditor.getVideoDurationMs(item.filePath).coerceAtLeast(1000L) }
    var startSec by remember(item.filePath) { mutableFloatStateOf(0f) }
    var endSec by remember(item.filePath) { mutableFloatStateOf(durationMs / 1000f) }
    var muteAudio by remember(item.filePath) { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }

    LaunchedEffect(durationMs) {
        if (endSec > durationMs / 1000f) endSec = durationMs / 1000f
    }

    AndroidView(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
            .clip(RoundedCornerShape(14.dp)),
        factory = { c ->
            VideoView(c).apply {
                val mc = MediaController(c)
                mc.setAnchorView(this)
                setMediaController(mc)
                setVideoURI(Uri.fromFile(File(item.filePath)))
                setOnPreparedListener { mp ->
                    mp.isLooping = true
                    start()
                }
            }
        },
        update = { vv ->
            val target = Uri.fromFile(File(item.filePath))
            if (vv.tag != item.filePath) {
                vv.tag = item.filePath
                vv.setVideoURI(target)
                vv.start()
            }
        },
        onRelease = { it.stopPlayback() }
    )

    val maxSec = (durationMs / 1000f).coerceAtLeast(1f)
    Text("${if (ctrl.lang == "en") "Start" else "Начало"}: ${"%.1f".format(startSec)}s")
    Slider(
        value = startSec,
        onValueChange = {
            startSec = it.coerceAtMost((endSec - 0.5f).coerceAtLeast(0f))
        },
        valueRange = 0f..maxSec
    )

    Text("${if (ctrl.lang == "en") "End" else "Конец"}: ${"%.1f".format(endSec)}s / ${"%.1f".format(maxSec)}s")
    Slider(
        value = endSec,
        onValueChange = {
            endSec = it.coerceAtLeast((startSec + 0.5f).coerceAtMost(maxSec))
        },
        valueRange = 0f..maxSec
    )

    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            if (ctrl.lang == "en") "Remove audio track (Mute)" else "Убрать звук из видео",
            modifier = Modifier.weight(1f)
        )
        Switch(checked = muteAudio, onCheckedChange = { muteAudio = it })
    }

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(
            enabled = !busy,
            onClick = {
                busy = true
                onStatus(ctrl.t("editing_video"))
                scope.launch {
                    val res = runCatching {
                        MediaEditor.trimVideo(ctx, item.filePath, (startSec * 1000).toLong(), (endSec * 1000).toLong(), muteAudio)
                    }
                    busy = false
                    res.onSuccess(onTrimSaved).onFailure { onStatus("Error: ${it.message}") }
                }
            },
            modifier = Modifier.weight(1f)
        ) { Text(ctrl.t("trim_video")) }

        OutlinedButton(
            enabled = !busy,
            onClick = {
                busy = true
                scope.launch {
                    val res = runCatching { MediaEditor.extractVideoFrame(ctx, item.filePath, (startSec * 1000).toLong()) }
                    busy = false
                    res.onSuccess(onFrameExtracted).onFailure { onStatus("Error: ${it.message}") }
                }
            },
            modifier = Modifier.weight(1f)
        ) { Text(ctrl.t("extract_frame")) }
    }
}
