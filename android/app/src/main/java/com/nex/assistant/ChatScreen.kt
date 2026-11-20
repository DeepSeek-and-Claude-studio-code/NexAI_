package com.nex.assistant

import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.widget.MediaController
import android.widget.VideoView
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    ctrl: NexController,
    onPickFiles: () -> Unit,
    onPickProjectFolder: (String) -> Unit
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var inputText by remember { mutableStateOf("") }
    var showModelSheet by remember { mutableStateOf(false) }
    var showPlusMenu by remember { mutableStateOf(false) }

    val activeChat = ctrl.activeChat()
    val messages = activeChat?.messages.orEmpty()
    val activeProject = ctrl.activeProject()
    val pendingConfirm = SafetyGuard.activeConfirmation

    BackHandler(enabled = drawerState.isOpen) {
        scope.launch { drawerState.close() }
    }

    LaunchedEffect(messages.size, pendingConfirm, ctrl.isBusy) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(modifier = Modifier.width(300.dp)) {
                Column(modifier = Modifier.fillMaxHeight().padding(12.dp)) {
                    NavigationDrawerItem(
                        label = { Text(ctrl.t("new_chat")) },
                        selected = false,
                        icon = { Icon(NexIcons.NewChatPen, null) },
                        onClick = {
                            ctrl.startNewChat(projectId = null)
                            scope.launch { drawerState.close() }
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text(ctrl.t("projects")) },
                        selected = false,
                        icon = { Icon(NexIcons.Folder, null) },
                        onClick = {
                            ctrl.navigate(AppScreen.PROJECTS)
                            scope.launch { drawerState.close() }
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text(ctrl.t("artifacts")) },
                        selected = false,
                        icon = { Icon(NexIcons.Artifacts, null) },
                        onClick = {
                            ctrl.navigate(AppScreen.ARTIFACTS)
                            scope.launch { drawerState.close() }
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text(ctrl.t("media_studio")) },
                        selected = false,
                        icon = { Icon(NexIcons.MediaEdit, null) },
                        onClick = {
                            ctrl.navigate(AppScreen.MEDIA_STUDIO)
                            scope.launch { drawerState.close() }
                        }
                    )

                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    Text(
                        text = ctrl.t("chats"),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )

                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(ctrl.chats, key = { it.id }) { session ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(
                                        if (session.id == ctrl.activeChatId) MaterialTheme.colorScheme.surfaceVariant
                                        else Color.Transparent
                                    )
                                    .clickable {
                                        ctrl.openChat(session.id)
                                        scope.launch { drawerState.close() }
                                    }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = session.title,
                                    modifier = Modifier.weight(1f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                IconButton(
                                    onClick = { ctrl.deleteChat(session.id) },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "Delete",
                                        modifier = Modifier.size(16.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    HorizontalDivider(Modifier.padding(vertical = 6.dp))
                    NavigationDrawerItem(
                        label = { Text(ctrl.t("settings")) },
                        selected = false,
                        icon = { Icon(Icons.Default.Settings, null) },
                        onClick = {
                            ctrl.navigate(AppScreen.SETTINGS)
                            scope.launch { drawerState.close() }
                        }
                    )
                    NavigationDrawerItem(
                        label = {
                            Text(ctrl.userName.ifBlank { ctrl.t("account") })
                        },
                        selected = false,
                        icon = {
                            val initial = ctrl.userName.trim().firstOrNull()?.uppercase() ?: "Я"
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = initial,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        },
                        onClick = {
                            ctrl.navigate(AppScreen.ACCOUNT)
                            scope.launch { drawerState.close() }
                        }
                    )
                }
            }
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
        ) {
            // Top bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { scope.launch { drawerState.open() } }) {
                    Icon(Icons.Default.Menu, contentDescription = "Menu")
                }
                Text(
                    text = activeChat?.title?.takeIf { it != ctrl.t("new_chat") } ?: ctrl.agentName,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                IconButton(onClick = { ctrl.startNewChat(projectId = null) }) {
                    Icon(NexIcons.NewChatPen, contentDescription = ctrl.t("new_chat"))
                }
            }

            // Model / Profile / Effort pill button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    color = MaterialTheme.colorScheme.background,
                    modifier = Modifier.clickable { showModelSheet = true }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = ctrl.currentModelPillText(),
                            style = MaterialTheme.typography.labelMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.widthIn(max = 280.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.KeyboardArrowDown, null, modifier = Modifier.size(16.dp))
                    }
                }
            }

            // Animated Sphere + Status
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                NexSphere(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(112.dp)
                        .clickable {
                            if (ctrl.isListening) ctrl.stopVoiceInput()
                            else ctrl.startVoiceInput(fromAssistOverlay = false)
                        },
                    state = ctrl.sphereState,
                    female = ctrl.female
                )
                Text(
                    text = ctrl.statusLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(bottom = 6.dp)
                )
            }
            HorizontalDivider()

            // Active project working folder bar
            if (activeProject != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = if (activeProject.folderName != null) {
                            "${ctrl.t("folder_label")}: ${activeProject.folderName}"
                        } else {
                            ctrl.t("no_folder")
                        },
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    TextButton(onClick = { onPickProjectFolder(activeProject.id) }) {
                        Text(
                            if (activeProject.folderName != null) ctrl.t("change_folder") else ctrl.t("choose_folder"),
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
                HorizontalDivider()
            }

            // Message log
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                state = listState,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item { Spacer(Modifier.height(4.dp)) }
                items(messages, key = { it.id }) { msg ->
                    Box(Modifier.animateItem()) {
                        ChatBubble(msg = msg, ctrl = ctrl)
                    }
                }
                if (ctrl.isBusy && pendingConfirm == null) {
                    item(key = "typing_indicator") {
                        TypingIndicatorBubble()
                    }
                }
                if (pendingConfirm != null) {
                    item(key = "confirm_${pendingConfirm.id}") {
                        ConfirmationBanner(pending = pendingConfirm, ctrl = ctrl)
                    }
                }
                item { Spacer(Modifier.height(6.dp)) }
            }

            // Active mode & attachment chips
            val hasChips = ctrl.genMode != null || ctrl.webSearchEnabled || ctrl.pendingAttachments.isNotEmpty()
            if (hasChips) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    ctrl.genMode?.let { mode ->
                        val label = if (mode == GenMode.IMAGE) {
                            "${ctrl.t("create_image")} · ${ctrl.imageModel}"
                        } else {
                            "${ctrl.t("create_video")} · ${ctrl.videoModel}"
                        }
                        InputChip(
                            selected = true,
                            onClick = { showModelSheet = true },
                            label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                            trailingIcon = {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Off",
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clickable { ctrl.updateGenMode(null) }
                                )
                            }
                        )
                    }
                    if (ctrl.webSearchEnabled) {
                        InputChip(
                            selected = true,
                            onClick = { ctrl.webSearchEnabled = false },
                            label = { Text(ctrl.t("web_search"), style = MaterialTheme.typography.labelSmall) },
                            trailingIcon = { Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp)) }
                        )
                    }
                    ctrl.pendingAttachments.forEach { att ->
                        InputChip(
                            selected = false,
                            onClick = { ctrl.removeAttachment(att.id) },
                            label = { Text(att.name, maxLines = 1, style = MaterialTheme.typography.labelSmall) },
                            trailingIcon = { Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp)) }
                        )
                    }
                }
            }

            HorizontalDivider()

            // Composer bar (+ menu, input, voice/send)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box {
                    IconButton(onClick = { showPlusMenu = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Plus")
                    }
                    DropdownMenu(
                        expanded = showPlusMenu,
                        onDismissRequest = { showPlusMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text(ctrl.t("add_files")) },
                            onClick = {
                                showPlusMenu = false
                                onPickFiles()
                            }
                        )
                        DropdownMenuItem(
                            text = {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(ctrl.t("create_image"))
                                    Spacer(Modifier.width(12.dp))
                                    Text(
                                        if (ctrl.genMode == GenMode.IMAGE) ctrl.t("on") else ctrl.t("off"),
                                        color = if (ctrl.genMode == GenMode.IMAGE) NexOkColor else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            onClick = {
                                ctrl.updateGenMode(if (ctrl.genMode == GenMode.IMAGE) null else GenMode.IMAGE)
                                showPlusMenu = false
                            }
                        )
                        DropdownMenuItem(
                            text = {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(ctrl.t("create_video"))
                                    Spacer(Modifier.width(12.dp))
                                    Text(
                                        if (ctrl.genMode == GenMode.VIDEO) ctrl.t("on") else ctrl.t("off"),
                                        color = if (ctrl.genMode == GenMode.VIDEO) NexOkColor else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            onClick = {
                                ctrl.updateGenMode(if (ctrl.genMode == GenMode.VIDEO) null else GenMode.VIDEO)
                                showPlusMenu = false
                            }
                        )
                        DropdownMenuItem(
                            text = {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(ctrl.t("web_search"))
                                    Spacer(Modifier.width(12.dp))
                                    Text(
                                        if (ctrl.webSearchEnabled) ctrl.t("on") else ctrl.t("off"),
                                        color = if (ctrl.webSearchEnabled) NexOkColor else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            onClick = {
                                ctrl.webSearchEnabled = !ctrl.webSearchEnabled
                                showPlusMenu = false
                            }
                        )
                        DropdownMenuItem(
                            text = {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(ctrl.t("memory"))
                                    Spacer(Modifier.width(12.dp))
                                    Text(
                                        if (ctrl.memoryEnabled) ctrl.t("on") else ctrl.t("off"),
                                        color = if (ctrl.memoryEnabled) NexOkColor else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            onClick = {
                                ctrl.toggleMemory(!ctrl.memoryEnabled)
                                showPlusMenu = false
                            }
                        )
                    }
                }

                val placeholder = when (ctrl.genMode) {
                    GenMode.IMAGE -> ctrl.t("describe_image")
                    GenMode.VIDEO -> ctrl.t("describe_video")
                    null -> ctrl.t("write_placeholder")
                }

                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text(placeholder, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    shape = RoundedCornerShape(24.dp),
                    maxLines = 4
                )

                val canSend = inputText.isNotBlank() || ctrl.pendingAttachments.isNotEmpty()
                val actionMode = when {
                    ctrl.isBusy -> "stop"
                    canSend -> "send"
                    else -> "voice"
                }
                AnimatedContent(
                    targetState = actionMode,
                    transitionSpec = { (fadeIn(tween(150)) + scaleIn(tween(150), initialScale = 0.85f)) togetherWith fadeOut(tween(120)) },
                    label = "composer_action"
                ) { mode ->
                    when (mode) {
                        "stop" -> Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(44.dp)
                        ) {
                            IconButton(onClick = { ctrl.cancelActiveGeneration() }) {
                                Icon(Icons.Default.Close, contentDescription = "Stop", tint = Color.White)
                            }
                        }
                        "send" -> Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(44.dp)
                        ) {
                            IconButton(
                                onClick = {
                                    val text = inputText
                                    inputText = ""
                                    ctrl.sendUserMessage(text)
                                }
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.Send,
                                    contentDescription = "Send",
                                    tint = MaterialTheme.colorScheme.onPrimary
                                )
                            }
                        }
                        else -> Surface(
                            shape = CircleShape,
                            color = if (ctrl.isListening) MaterialTheme.colorScheme.primary else Color.Transparent,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.size(44.dp)
                        ) {
                            IconButton(
                                onClick = {
                                    if (ctrl.isListening) ctrl.stopVoiceInput()
                                    else ctrl.startVoiceInput(fromAssistOverlay = false)
                                }
                            ) {
                                Icon(
                                    NexIcons.MicWave,
                                    contentDescription = "Voice",
                                    tint = if (ctrl.isListening) MaterialTheme.colorScheme.onPrimary
                                    else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showModelSheet) {
        ModalBottomSheet(
            onDismissRequest = { showModelSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            ModelPickerSheetContent(ctrl = ctrl, onClose = { showModelSheet = false })
        }
    }
}

@Composable
fun ConfirmationBanner(pending: PendingConfirmation, ctrl: NexController) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.5.dp, if (pending.isPurchase) NexWarnColor else MaterialTheme.colorScheme.primary),
        color = MaterialTheme.colorScheme.surface
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    tint = if (pending.isPurchase) NexWarnColor else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = pending.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(text = pending.details, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { SafetyGuard.resolve(true) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) { Text(ctrl.t("confirm_btn")) }
                OutlinedButton(
                    onClick = { SafetyGuard.resolve(false) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) { Text(ctrl.t("cancel_btn")) }
            }
        }
    }
}

@Composable
private fun ChatBubble(msg: ChatMessage, ctrl: NexController) {
    val ctx = LocalContext.current
    if (msg.role == "system") {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Text(
                text = msg.text,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 2.dp)
            )
        }
        return
    }

    val isUser = msg.role == "user"
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
    ) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = if (isUser) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.widthIn(max = 310.dp)
        ) {
            Column(Modifier.padding(12.dp)) {
                if (msg.text.isNotBlank()) {
                    Text(
                        text = msg.text,
                        color = if (isUser) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                if (msg.attachmentNames.isNotEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "📎 " + msg.attachmentNames.joinToString(", "),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isUser) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Inline generated image or video
                msg.media?.let { media ->
                    Spacer(Modifier.height(8.dp))
                    val file = File(media.filePath)
                    if (file.exists()) {
                        if (!media.isVideo) {
                            val bmp = remember(media.filePath) { BitmapFactory.decodeFile(media.filePath) }
                            if (bmp != null) {
                                Image(
                                    bitmap = bmp.asImageBitmap(),
                                    contentDescription = media.prompt,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(210.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                )
                            }
                        } else {
                            AndroidView(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(210.dp)
                                    .clip(RoundedCornerShape(12.dp)),
                                factory = { c ->
                                    VideoView(c).apply {
                                        val mc = MediaController(c)
                                        mc.setAnchorView(this)
                                        setMediaController(mc)
                                        setVideoURI(Uri.fromFile(file))
                                        setOnPreparedListener { mp ->
                                            mp.isLooping = true
                                            start()
                                        }
                                    }
                                },
                                onRelease = { it.stopPlayback() }
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = media.modelName,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                            TextButton(onClick = { ctrl.openMediaInStudio(media) }) {
                                Text(ctrl.t("edit_media_btn"), style = MaterialTheme.typography.labelSmall)
                            }
                            IconButton(
                                onClick = {
                                    runCatching {
                                        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", file)
                                        val share = Intent(Intent.ACTION_SEND).apply {
                                            type = if (media.isVideo) "video/mp4" else "image/png"
                                            putExtra(Intent.EXTRA_STREAM, uri)
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                        }
                                        ctx.startActivity(Intent.createChooser(share, ctrl.t("share")))
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

        // Inline Artifact card
        msg.artifactId?.let { aid ->
            val art = ctrl.artifacts.firstOrNull { it.id == aid }
            if (art != null) {
                Spacer(Modifier.height(6.dp))
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
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
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(art.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "${art.type.label(ctrl.lang)} · ${ctrl.t("tap_to_open")}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ModelPickerSheetContent(ctrl: NexController, onClose: () -> Unit) {
    val expanded = remember { mutableStateMapOf("nex" to true) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // Effort selector
        Text(
            text = ctrl.t("effort"),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(6.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Effort.entries.forEach { e ->
                val sel = ctrl.effort == e
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = if (sel) MaterialTheme.colorScheme.primary else Color.Transparent,
                    border = BorderStroke(1.dp, if (sel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { ctrl.updateEffort(e) }
                ) {
                    Box(Modifier.padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                        Text(
                            text = e.label(ctrl.lang),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (sel) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                            maxLines = 1
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text = ctrl.t("effort_desc"),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(Modifier.height(10.dp))

        // Collapsible Nex Profiles
        AccordionHeader(
            title = "Nex",
            count = NexProfile.entries.size,
            isOpen = expanded["nex"] == true,
            onToggle = { expanded["nex"] = !(expanded["nex"] == true) }
        )
        if (expanded["nex"] == true) {
            NexProfile.entries.forEach { prof ->
                val isSelected = ctrl.selectedProfileId == prof.id
                val statusText = if (prof.isMedia) {
                    val img = prof.resolveMedia(GenMode.IMAGE, ctrl.apiKeys)
                    val vid = prof.resolveMedia(GenMode.VIDEO, ctrl.apiKeys)
                    if (img != null || vid != null) {
                        listOfNotNull(
                            img?.let { "img: ${it.model}" },
                            vid?.let { "vid: ${it.model}" }
                        ).joinToString(" · ")
                    } else "${ctrl.t("key_needed")}: Gemini, OpenAI"
                } else {
                    val r = prof.resolveText(ctrl.apiKeys)
                    if (r != null) "${ctrl.t("now_using")}: ${r.provider} · ${r.model}"
                    else "${ctrl.t("key_needed")}: ${prof.textRoutes.map { it.provider }.distinct().joinToString(", ")}"
                }
                val hasKey = if (prof.isMedia) {
                    prof.resolveMedia(GenMode.IMAGE, ctrl.apiKeys) != null || prof.resolveMedia(GenMode.VIDEO, ctrl.apiKeys) != null
                } else {
                    prof.resolveText(ctrl.apiKeys) != null
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isSelected) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            ctrl.selectProfile(prof)
                            onClose()
                        }
                ) {
                    Column(Modifier.padding(10.dp)) {
                        Text(prof.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                        Text(prof.desc(ctrl.lang), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            statusText,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (hasKey) NexOkColor else NexWarnColor
                        )
                    }
                }
            }
        }

        // Collapsible Providers
        LlmClient.PROVIDERS.forEach { prov ->
            val models = ctrl.modelCatalog[prov].orEmpty()
            val key = "p_$prov"
            AccordionHeader(
                title = prov,
                count = models.size,
                isOpen = expanded[key] == true,
                onToggle = { expanded[key] = !(expanded[key] == true) }
            )
            if (expanded[key] == true) {
                models.forEach { m ->
                    val sel = ctrl.selectedProfileId == null && ctrl.genMode == null && ctrl.manualProvider == prov && ctrl.manualModel == m
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (sel) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent)
                            .clickable {
                                ctrl.selectManualModel(prov, m)
                                onClose()
                            }
                            .padding(horizontal = 10.dp, vertical = 9.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(m, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                        if (sel) Icon(Icons.Default.Check, null, tint = NexOkColor, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // Collapsible Image Models
        val imgCount = LlmClient.IMAGE_MODELS.values.sumOf { it.size }
        AccordionHeader(
            title = ctrl.t("images_section"),
            count = imgCount,
            isOpen = expanded["img"] == true,
            onToggle = { expanded["img"] = !(expanded["img"] == true) }
        )
        if (expanded["img"] == true) {
            LlmClient.IMAGE_MODELS.forEach { (prov, list) ->
                Text(
                    prov,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 8.dp, top = 6.dp)
                )
                list.forEach { m ->
                    val sel = ctrl.selectedProfileId == null && ctrl.genMode == GenMode.IMAGE && ctrl.imageModel == m
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (sel) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent)
                            .clickable {
                                ctrl.selectImageModel(m)
                                onClose()
                            }
                            .padding(horizontal = 10.dp, vertical = 9.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(m, style = MaterialTheme.typography.bodyMedium)
                        if (sel) Icon(Icons.Default.Check, null, tint = NexOkColor, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // Collapsible Video Models
        val vidCount = LlmClient.VIDEO_MODELS.values.sumOf { it.size }
        AccordionHeader(
            title = ctrl.t("videos_section"),
            count = vidCount,
            isOpen = expanded["vid"] == true,
            onToggle = { expanded["vid"] = !(expanded["vid"] == true) }
        )
        if (expanded["vid"] == true) {
            LlmClient.VIDEO_MODELS.forEach { (prov, list) ->
                Text(
                    prov,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 8.dp, top = 6.dp)
                )
                list.forEach { m ->
                    val sel = ctrl.selectedProfileId == null && ctrl.genMode == GenMode.VIDEO && ctrl.videoModel == m
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (sel) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent)
                            .clickable {
                                ctrl.selectVideoModel(m)
                                onClose()
                            }
                            .padding(horizontal = 10.dp, vertical = 9.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(m, style = MaterialTheme.typography.bodyMedium)
                        if (sel) Icon(Icons.Default.Check, null, tint = NexOkColor, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun AccordionHeader(
    title: String,
    count: Int,
    isOpen: Boolean,
    onToggle: () -> Unit
) {
    HorizontalDivider(Modifier.padding(top = 6.dp))
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggle() }
            .padding(vertical = 10.dp, horizontal = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("$count", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(4.dp))
            Icon(
                if (isOpen) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}


@Composable
private fun TypingIndicatorBubble() {
    val transition = rememberInfiniteTransition(label = "typing_dots")
    val p0 by transition.animateFloat(
        initialValue = 0.25f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(500, easing = LinearEasing), RepeatMode.Reverse),
        label = "d0"
    )
    val p1 by transition.animateFloat(
        initialValue = 0.25f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(500, delayMillis = 150, easing = LinearEasing), RepeatMode.Reverse),
        label = "d1"
    )
    val p2 by transition.animateFloat(
        initialValue = 0.25f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(500, delayMillis = 300, easing = LinearEasing), RepeatMode.Reverse),
        label = "d2"
    )
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf(p0, p1, p2).forEach { alpha ->
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .background(
                                MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = alpha),
                                CircleShape
                            )
                    )
                }
            }
        }
    }
}
