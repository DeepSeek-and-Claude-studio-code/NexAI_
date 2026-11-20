package com.nex.assistant

import android.app.Notification
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.CopyOnWriteArrayList

data class CapturedMessage(
    val id: String,
    val appPackage: String,
    val appName: String,
    val sender: String,
    val text: String,
    val timestamp: Long,
    val replyAction: Notification.Action?
)

object MessengerBridge {
    private val messages = CopyOnWriteArrayList<CapturedMessage>()

    private val knownMessengerPackages = mapOf(
        "org.telegram.messenger" to "Telegram",
        "org.telegram.messenger.web" to "Telegram",
        "org.thunderdog.challegram" to "Telegram X",
        "com.whatsapp" to "WhatsApp",
        "com.whatsapp.w4b" to "WhatsApp Business",
        "com.viber.voip" to "Viber",
        "org.thoughtcrime.securesms" to "Signal",
        "com.instagram.android" to "Instagram",
        "com.vkontakte.android" to "VK",
        "com.discord" to "Discord",
        "com.facebook.orca" to "Messenger",
        "com.google.android.apps.messaging" to "Messages",
        "com.samsung.android.messaging" to "Messages"
    )

    fun isRelevantPackage(pkg: String): Boolean =
        knownMessengerPackages.containsKey(pkg) || pkg.contains("messag", ignoreCase = true)

    fun appLabel(pkg: String): String = knownMessengerPackages[pkg] ?: pkg.substringAfterLast('.')

    fun record(msg: CapturedMessage) {
        messages.removeAll { it.id == msg.id }
        messages.add(0, msg)
        while (messages.size > 60) {
            messages.removeAt(messages.lastIndex)
        }
    }

    fun recent(limit: Int = 15, appFilter: String? = null): List<CapturedMessage> {
        val filtered = if (appFilter.isNullOrBlank()) {
            messages.toList()
        } else {
            messages.filter {
                it.appName.contains(appFilter, ignoreCase = true) ||
                    it.sender.contains(appFilter, ignoreCase = true)
            }
        }
        return filtered.take(limit)
    }

    fun replyTo(ctx: Context, messageId: String, replyText: String): String {
        val target = messages.firstOrNull { it.id == messageId }
            ?: return "Message with id '$messageId' was not found in recent notifications."
        val action = target.replyAction
            ?: return "Notification from ${target.sender} (${target.appName}) does not expose a direct reply action."
        val remoteInputs = action.remoteInputs
        if (remoteInputs.isNullOrEmpty()) {
            return "Direct reply input is unavailable for ${target.appName}."
        }
        val intent = Intent()
        val bundle = Bundle()
        remoteInputs.forEach { ri ->
            bundle.putCharSequence(ri.resultKey, replyText)
        }
        RemoteInput.addResultsToIntent(remoteInputs, intent, bundle)
        val pending: PendingIntent = action.actionIntent
            ?: return "PendingIntent missing for direct reply."
        return runCatching {
            pending.send(ctx, 0, intent)
            "Replied to ${target.sender} in ${target.appName}: \"$replyText\""
        }.getOrElse {
            "Failed to send reply via notification: ${it.message}"
        }
    }
}

class NexNotificationService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        if (sbn.packageName == packageName) return
        val notif = sbn.notification ?: return
        val extras = notif.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim().orEmpty()
        if (title.isEmpty() && text.isEmpty()) return

        val replyAction = notif.actions?.firstOrNull { act ->
            !act.remoteInputs.isNullOrEmpty()
        }
        if (!MessengerBridge.isRelevantPackage(sbn.packageName) && replyAction == null) return

        val id = "${sbn.packageName}:${sbn.id}:${title.hashCode()}"
        MessengerBridge.record(
            CapturedMessage(
                id = id,
                appPackage = sbn.packageName,
                appName = MessengerBridge.appLabel(sbn.packageName),
                sender = title.ifEmpty { MessengerBridge.appLabel(sbn.packageName) },
                text = text,
                timestamp = sbn.postTime,
                replyAction = replyAction
            )
        )
    }
}
