package com.nex.assistant

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.webkit.WebView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import org.json.JSONArray
import java.io.File

@Composable
fun ArtifactsLibraryScreen(ctrl: NexController) {
    val filtered = ctrl.artifacts.filter { ctrl.artifactFilter == null || it.type == ctrl.artifactFilter }
    var showCreate by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var newType by remember { mutableStateOf(ArtifactType.DOCUMENT) }

    Column(Modifier.fillMaxSize()) {
        SubScreenTopBar(title = ctrl.t("artifacts"), onBack = { ctrl.goBack() })
        Column(Modifier.fillMaxSize().padding(16.dp)) {
            Text(
                ctrl.t("artifacts_desc"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))

            Button(
                onClick = { showCreate = !showCreate },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, null)
                Spacer(Modifier.width(6.dp))
                Text(ctrl.t("create_artifact_btn"))
            }

            if (showCreate) {
                Spacer(Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = newTitle,
                            onValueChange = { newTitle = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text(if (ctrl.lang == "en") "Title" else "Название") },
                            singleLine = true
                        )
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            ArtifactType.entries.forEach { t ->
                                FilterChip(
                                    selected = newType == t,
                                    onClick = { newType = t },
                                    label = { Text(t.label(ctrl.lang)) }
                                )
                            }
                        }
                        Button(
                            onClick = {
                                val created = ctrl.createArtifactManually(newType, newTitle)
                                newTitle = ""
                                showCreate = false
                                ctrl.openArtifact(created.id)
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(ctrl.t("done")) }
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = ctrl.artifactFilter == null,
                    onClick = { ctrl.artifactFilter = null },
                    label = { Text(ctrl.t("all")) }
                )
                ArtifactType.entries.forEach { type ->
                    FilterChip(
                        selected = ctrl.artifactFilter == type,
                        onClick = { ctrl.artifactFilter = type },
                        label = { Text(type.label(ctrl.lang)) }
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            if (filtered.isEmpty()) {
                Text(ctrl.t("nothing_yet"), color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(filtered, key = { it.id }) { art ->
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { ctrl.openArtifact(art.id) }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(NexIcons.Artifacts, null, modifier = Modifier.size(20.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(art.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(
                                        art.type.label(ctrl.lang),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                IconButton(onClick = { ctrl.deleteArtifact(art.id) }) {
                                    Icon(Icons.Default.Delete, contentDescription = ctrl.t("delete_btn"), modifier = Modifier.size(18.dp))
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
fun ArtifactViewScreen(ctrl: NexController) {
    val ctx = LocalContext.current
    val art = ctrl.activeArtifact()
    if (art == null) {
        ctrl.goBack()
        return
    }
    var mode by remember(art.id) { mutableStateOf("view") } // "view" | "edit"
    var copied by remember(art.id) { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        SubScreenTopBar(title = art.title, onBack = { ctrl.goBack() })

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = mode == "view",
                onClick = { mode = "view" },
                label = { Text(ctrl.t("view")) }
            )
            FilterChip(
                selected = mode == "edit",
                onClick = { mode = "edit" },
                label = { Text("${ctrl.t("edit")} / ${ctrl.t("code")}") }
            )
            OutlinedButton(onClick = {
                val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText(art.title, art.content))
                copied = true
            }) {
                Text(if (copied) ctrl.t("copied") else ctrl.t("copy"), style = MaterialTheme.typography.labelSmall)
            }
            IconButton(onClick = {
                val ext = when (art.type) {
                    ArtifactType.PRESENTATION -> "json"
                    ArtifactType.TABLE -> "csv"
                    ArtifactType.HTML -> "html"
                    ArtifactType.DOCUMENT -> "md"
                }
                val safeName = art.title.replace(Regex("[^a-zA-Z0-9а-яА-ЯёЁ_-]+"), "_").take(40).ifBlank { "artifact" }
                val out = File(ctx.cacheDir, "$safeName.$ext")
                out.writeText(art.content, Charsets.UTF_8)
                runCatching {
                    val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", out)
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = if (art.type == ArtifactType.HTML) "text/html" else "text/plain"
                        putExtra(Intent.EXTRA_SUBJECT, art.title)
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    ctx.startActivity(Intent.createChooser(intent, ctrl.t("share")))
                }
            }) {
                Icon(Icons.Default.Share, contentDescription = ctrl.t("share"))
            }
            IconButton(onClick = { ctrl.deleteArtifact(art.id) }) {
                Icon(Icons.Default.Delete, contentDescription = ctrl.t("delete_btn"))
            }
        }
        HorizontalDivider()

        Box(Modifier.weight(1f).fillMaxWidth().padding(12.dp)) {
            if (mode == "edit") {
                Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = art.title,
                        onValueChange = { ctrl.updateArtifactTitle(art.id, it) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(if (ctrl.lang == "en") "Title" else "Название") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = art.content,
                        onValueChange = { ctrl.updateArtifactContent(art.id, it) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 13.sp)
                    )
                }
            } else {
                when (art.type) {
                    ArtifactType.PRESENTATION -> PresentationViewer(art.content)
                    ArtifactType.TABLE -> EditableTableViewer(
                        csv = art.content,
                        lang = ctrl.lang,
                        onUpdated = { updatedCsv -> ctrl.updateArtifactContent(art.id, updatedCsv) }
                    )
                    ArtifactType.DOCUMENT -> DocumentViewer(art.content)
                    ArtifactType.HTML -> HtmlArtifactViewer(art.content)
                }
            }
        }
    }
}

private data class SlideModel(val title: String, val subtitle: String, val bullets: List<String>)

@Composable
private fun PresentationViewer(raw: String) {
    val slides = remember(raw) { parseSlides(raw) }
    var idx by remember(raw) { mutableIntStateOf(0) }
    val safeIdx = idx.coerceIn(0, (slides.size - 1).coerceAtLeast(0))
    val slide = slides.getOrNull(safeIdx) ?: SlideModel("Slide", raw, emptyList())

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Text(slide.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                if (slide.subtitle.isNotBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Text(slide.subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (slide.bullets.isNotEmpty()) {
                    Spacer(Modifier.height(10.dp))
                    slide.bullets.forEach { b ->
                        Text("• $b", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 2.dp))
                    }
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            OutlinedButton(onClick = { idx = (safeIdx - 1 + slides.size) % slides.size }) { Text("‹") }
            Text("${safeIdx + 1} / ${slides.size}", fontWeight = FontWeight.SemiBold)
            OutlinedButton(onClick = { idx = (safeIdx + 1) % slides.size }) { Text("›") }
        }
    }
}

private fun parseSlides(raw: String): List<SlideModel> {
    val fromJson = runCatching {
        val arr = JSONArray(raw.trim())
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val bullets = mutableListOf<String>()
                val bArr = o.optJSONArray("bullets") ?: o.optJSONArray("items")
                if (bArr != null) {
                    for (j in 0 until bArr.length()) bullets.add(bArr.getString(j))
                }
                add(SlideModel(o.optString("title", "Slide ${i + 1}"), o.optString("subtitle", o.optString("body", "")), bullets))
            }
        }
    }.getOrNull()
    if (!fromJson.isNullOrEmpty()) return fromJson

    val chunks = raw.split(Regex("\\n---\\n|\\n\\n(?=#)")).map { it.trim() }.filter { it.isNotEmpty() }
    if (chunks.isEmpty()) return listOf(SlideModel("Presentation", raw, emptyList()))
    return chunks.mapIndexed { i, chunk ->
        val lines = chunk.lines().map { it.trim() }.filter { it.isNotEmpty() }
        val title = lines.firstOrNull()?.removePrefix("#")?.trim() ?: "Slide ${i + 1}"
        val bullets = lines.drop(1).filter { it.startsWith("-") || it.startsWith("*") }.map { it.drop(1).trim() }
        val sub = lines.drop(1).filterNot { it.startsWith("-") || it.startsWith("*") }.joinToString("\n")
        SlideModel(title, sub, bullets)
    }
}

@Composable
private fun EditableTableViewer(csv: String, lang: String, onUpdated: (String) -> Unit) {
    val parsed = remember(csv) {
        csv.trim().lines().filter { it.isNotBlank() }.map { line ->
            line.split(',').map { it.trim() }
        }
    }
    if (parsed.isEmpty()) {
        Text(csv)
        return
    }
    val headers = remember(csv) { mutableStateListOf<String>().apply { addAll(parsed.first()) } }
    val dataRows = remember(csv) {
        mutableStateListOf<MutableList<String>>().apply {
            parsed.drop(1).forEach { row ->
                add(MutableList(headers.size) { c -> row.getOrElse(c) { "" } })
            }
        }
    }

    fun emitCsv() {
        val rebuilt = buildString {
            appendLine(headers.joinToString(","))
            dataRows.forEach { appendLine(it.joinToString(",")) }
        }.trim()
        onUpdated(rebuilt)
    }

    Column(Modifier.fillMaxSize()) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
            OutlinedButton(onClick = {
                dataRows.add(MutableList(headers.size) { "" })
                emitCsv()
            }) { Text(if (lang == "en") "+ Row" else "+ Строка") }
            OutlinedButton(onClick = {
                headers.add("Col ${headers.size + 1}")
                for (i in dataRows.indices) {
                    val copy = dataRows[i].toMutableList()
                    copy.add("")
                    dataRows[i] = copy
                }
                emitCsv()
            }) { Text(if (lang == "en") "+ Column" else "+ Колонка") }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .horizontalScroll(rememberScrollState())
        ) {
            Row(Modifier.background(MaterialTheme.colorScheme.surfaceVariant).padding(vertical = 8.dp)) {
                headers.forEach { h ->
                    Text(
                        text = h,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.width(105.dp).padding(horizontal = 8.dp)
                    )
                }
            }
            HorizontalDivider()

            dataRows.forEachIndexed { rIdx, row ->
                Row(Modifier.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    row.forEachIndexed { cIdx, cellVal ->
                        BasicTextField(
                            value = cellVal,
                            onValueChange = { nv ->
                                val copy = row.toMutableList()
                                copy[cIdx] = nv
                                dataRows[rIdx] = copy
                                emitCsv()
                            },
                            textStyle = TextStyle(color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp),
                            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                            modifier = Modifier
                                .width(105.dp)
                                .padding(horizontal = 6.dp)
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f), RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 6.dp)
                        )
                    }
                }
                HorizontalDivider()
            }

            val sums = headers.indices.map { col ->
                if (col == 0) "Σ"
                else {
                    val nums = dataRows.mapNotNull { it.getOrNull(col)?.replace(',', '.')?.toDoubleOrNull() }
                    if (nums.isEmpty()) "" else {
                        val sum = nums.sum()
                        if (sum % 1.0 == 0.0) sum.toLong().toString() else "%.2f".format(sum)
                    }
                }
            }
            Row(Modifier.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)).padding(vertical = 8.dp)) {
                sums.forEach { s ->
                    Text(
                        text = s,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.width(105.dp).padding(horizontal = 8.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun DocumentViewer(markdown: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        markdown.lines().forEach { line ->
            val trimmed = line.trim()
            when {
                trimmed.startsWith("# ") -> Text(
                    trimmed.removePrefix("# "),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                trimmed.startsWith("## ") -> Text(
                    trimmed.removePrefix("## "),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 6.dp)
                )
                trimmed.startsWith("### ") -> Text(
                    trimmed.removePrefix("### "),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 4.dp)
                )
                trimmed.startsWith("- ") || trimmed.startsWith("* ") -> Text(
                    "• " + trimmed.drop(2),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(start = 8.dp)
                )
                trimmed.isEmpty() -> Spacer(Modifier.height(4.dp))
                else -> Text(trimmed, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun HtmlArtifactViewer(html: String) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                settings.domStorageEnabled = false
                loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
            }
        },
        update = { wv ->
            wv.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
        }
    )
}

@Composable
fun SubScreenTopBar(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
        }
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
    }
    HorizontalDivider()
}
