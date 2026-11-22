package com.nex.assistant

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

data class ScreenElement(
    val index: Int,
    val text: String,
    val className: String,
    val clickable: Boolean,
    val editable: Boolean
)

class NexAccessibilityService : AccessibilityService() {
    fun readCurrentScreenText(): String {
        val root = rootInActiveWindow ?: return ""
        val sb = StringBuilder()
        fun walk(node: android.view.accessibility.AccessibilityNodeInfo?, depth: Int) {
            if (node == null || depth > 12 || sb.length > 3500) return
            val t = node.text?.toString()?.trim().orEmpty()
            val d = node.contentDescription?.toString()?.trim().orEmpty()
            if (t.isNotEmpty()) sb.appendLine(t) else if (d.isNotEmpty()) sb.appendLine(d)
            for (i in 0 until node.childCount) walk(node.getChild(i), depth + 1)
        }
        walk(root, 0)
        return sb.toString().trim()
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Screen tree is queried on-demand via rootInActiveWindow when requested by the user.
    }

    override fun onInterrupt() {
        // No continuous feedback stream to interrupt.
    }

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    fun readCurrentScreen(): String {
        val root = rootInActiveWindow ?: return "No active window available to read."
        val pkg = root.packageName?.toString() ?: "unknown"
        val items = mutableListOf<ScreenElement>()
        collectNodes(root, items, maxCount = 80)
        if (items.isEmpty()) return "Screen ($pkg) has no readable text elements."
        return buildString {
            appendLine("Active app: $pkg")
            items.forEach { el ->
                val flags = buildList {
                    if (el.clickable) add("clickable")
                    if (el.editable) add("editable")
                }.joinToString(",")
                val suffix = if (flags.isNotEmpty()) " [$flags]" else ""
                appendLine("#${el.index}: ${el.text}$suffix")
            }
        }
    }

    fun tapByTextOrIndex(query: String): String {
        val root = rootInActiveWindow ?: return "No active window available."
        val nodes = mutableListOf<Pair<ScreenElement, AccessibilityNodeInfo>>()
        collectNodesWithRefs(root, nodes, maxCount = 100)

        val targetIndex = query.removePrefix("#").toIntOrNull()
        val match = if (targetIndex != null) {
            nodes.firstOrNull { it.first.index == targetIndex }
        } else {
            nodes.firstOrNull { it.first.text.equals(query, ignoreCase = true) }
                ?: nodes.firstOrNull { it.first.text.contains(query, ignoreCase = true) }
        } ?: return "Could not find UI element matching '$query' on current screen."

        var clickableNode: AccessibilityNodeInfo? = match.second
        while (clickableNode != null && !clickableNode.isClickable) {
            clickableNode = clickableNode.parent
        }
        val clicked = clickableNode?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true
        return if (clicked) {
            "Tapped '${match.first.text}'."
        } else {
            "Found '${match.first.text}', but it could not be clicked."
        }
    }

    fun typeIntoFocusedOrHint(text: String, fieldHint: String?): String {
        val root = rootInActiveWindow ?: return "No active window available."
        val nodes = mutableListOf<Pair<ScreenElement, AccessibilityNodeInfo>>()
        collectNodesWithRefs(root, nodes, maxCount = 100)

        val editableNodes = nodes.filter { it.first.editable }
        val target = when {
            !fieldHint.isNullOrBlank() -> editableNodes.firstOrNull {
                it.first.text.contains(fieldHint, ignoreCase = true)
            } ?: editableNodes.firstOrNull()
            else -> editableNodes.firstOrNull { it.second.isFocused } ?: editableNodes.firstOrNull()
        } ?: return "No editable text field found on the current screen."

        target.second.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }
        val ok = target.second.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        return if (ok) "Typed text into '${target.first.text.ifBlank { "input field" }}'." else "Failed to enter text."
    }

    fun performSystemAction(actionName: String): String {
        val root = rootInActiveWindow
        return when (actionName.lowercase()) {
            "back" -> if (performGlobalAction(GLOBAL_ACTION_BACK)) "Pressed Back." else "Failed Back."
            "home" -> if (performGlobalAction(GLOBAL_ACTION_HOME)) "Went Home." else "Failed Home."
            "recents" -> if (performGlobalAction(GLOBAL_ACTION_RECENTS)) "Opened Recents." else "Failed Recents."
            "scroll_down" -> {
                val scrollable = root?.let { findScrollable(it) }
                if (scrollable?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD) == true) "Scrolled down."
                else "No scrollable view found."
            }
            "scroll_up" -> {
                val scrollable = root?.let { findScrollable(it) }
                if (scrollable?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD) == true) "Scrolled up."
                else "No scrollable view found."
            }
            else -> "Unsupported action: $actionName"
        }
    }

    private fun findScrollable(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.isScrollable) return node
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findScrollable(child)
            if (found != null) return found
        }
        return null
    }

    private fun collectNodes(
        node: AccessibilityNodeInfo,
        out: MutableList<ScreenElement>,
        maxCount: Int
    ) {
        if (out.size >= maxCount) return
        val label = listOfNotNull(
            node.text?.toString()?.trim()?.takeIf { it.isNotEmpty() },
            node.contentDescription?.toString()?.trim()?.takeIf { it.isNotEmpty() }
        ).distinct().joinToString(" | ")

        if (label.isNotEmpty() || node.isEditable) {
            out.add(
                ScreenElement(
                    index = out.size + 1,
                    text = label.ifEmpty { "(text field)" }.take(120),
                    className = node.className?.toString()?.substringAfterLast('.') ?: "View",
                    clickable = node.isClickable,
                    editable = node.isEditable
                )
            )
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectNodes(child, out, maxCount)
            if (out.size >= maxCount) break
        }
    }

    private fun collectNodesWithRefs(
        node: AccessibilityNodeInfo,
        out: MutableList<Pair<ScreenElement, AccessibilityNodeInfo>>,
        maxCount: Int
    ) {
        if (out.size >= maxCount) return
        val label = listOfNotNull(
            node.text?.toString()?.trim()?.takeIf { it.isNotEmpty() },
            node.contentDescription?.toString()?.trim()?.takeIf { it.isNotEmpty() }
        ).distinct().joinToString(" | ")

        if (label.isNotEmpty() || node.isEditable) {
            out.add(
                ScreenElement(
                    index = out.size + 1,
                    text = label.ifEmpty { "(text field)" }.take(120),
                    className = node.className?.toString()?.substringAfterLast('.') ?: "View",
                    clickable = node.isClickable,
                    editable = node.isEditable
                ) to node
            )
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectNodesWithRefs(child, out, maxCount)
            if (out.size >= maxCount) break
        }
    }

    companion object {
        @Volatile
        var instance: NexAccessibilityService? = null
    }
}
