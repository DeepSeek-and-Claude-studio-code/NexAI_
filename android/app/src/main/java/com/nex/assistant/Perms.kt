package com.nex.assistant

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat

data class PermGroup(
    val id: String,
    val titleRu: String,
    val titleEn: String,
    val descRu: String,
    val descEn: String,
    val perms: List<String>
) {
    fun title(lang: String): String = if (lang == "en") titleEn else titleRu
    fun desc(lang: String): String = if (lang == "en") descEn else descRu
}

object Perms {
    val groups: List<PermGroup> = buildList {
        add(
            PermGroup(
                id = "calendar",
                titleRu = "Календарь",
                titleEn = "Calendar",
                descRu = "создавать и читать события",
                descEn = "create and read events",
                perms = listOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR)
            )
        )
        add(
            PermGroup(
                id = "sms",
                titleRu = "SMS",
                titleEn = "SMS",
                descRu = "читать и отправлять сообщения",
                descEn = "read and send SMS",
                perms = listOf(Manifest.permission.READ_SMS, Manifest.permission.SEND_SMS)
            )
        )
        add(
            PermGroup(
                id = "calls",
                titleRu = "Звонки",
                titleEn = "Calls",
                descRu = "набирать номера",
                descEn = "dial phone numbers",
                perms = listOf(Manifest.permission.CALL_PHONE)
            )
        )
        add(
            PermGroup(
                id = "contacts",
                titleRu = "Контакты",
                titleEn = "Contacts",
                descRu = "находить людей по имени",
                descEn = "find people by name",
                perms = listOf(Manifest.permission.READ_CONTACTS)
            )
        )
        add(
            PermGroup(
                id = "mic",
                titleRu = "Микрофон",
                titleEn = "Microphone",
                descRu = "голосовое управление",
                descEn = "voice control",
                perms = listOf(Manifest.permission.RECORD_AUDIO)
            )
        )
        if (Build.VERSION.SDK_INT >= 33) {
            add(
                PermGroup(
                    id = "notif",
                    titleRu = "Уведомления",
                    titleEn = "Notifications",
                    descRu = "показывать статус и напоминания",
                    descEn = "show status and reminders",
                    perms = listOf(Manifest.permission.POST_NOTIFICATIONS)
                )
            )
        }
    }

    fun allRuntimePermissions(): Array<String> =
        groups.flatMap { it.perms }.distinct().toTypedArray()

    fun granted(ctx: Context, g: PermGroup): Boolean =
        g.perms.all { has(ctx, it) }

    fun has(ctx: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(ctx, permission) == PackageManager.PERMISSION_GRANTED

    fun isNotificationListenerEnabled(ctx: Context): Boolean {
        val enabled = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners") ?: return false
        val target = ComponentName(ctx, NexNotificationService::class.java).flattenToString()
        return enabled.split(':').any { it.equals(target, ignoreCase = true) || it.contains(ctx.packageName) }
    }

    fun isAccessibilityEnabled(ctx: Context): Boolean {
        if (NexAccessibilityService.instance != null) return true
        val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
            ?: return false
        return enabled.contains(ctx.packageName)
    }

    fun openNotificationListenerSettings(ctx: Context) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { ctx.startActivity(intent) }
    }

    fun openAccessibilitySettings(ctx: Context) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { ctx.startActivity(intent) }
    }

    fun openDefaultAssistantSettings(ctx: Context) {
        val intent = Intent(Settings.ACTION_VOICE_INPUT_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (runCatching { ctx.startActivity(intent) }.isFailure) {
            runCatching {
                ctx.startActivity(
                    Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        }
    }
}
