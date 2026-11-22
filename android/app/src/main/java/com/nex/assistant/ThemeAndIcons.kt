package com.nex.assistant

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

private fun nexLightColors(female: Boolean) = lightColorScheme(
    primary = if (female) Color(0xFFD65E6E) else Color(0xFFD97757),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = if (female) Color(0xFFFCE4E7) else Color(0xFFFBE7DF),
    onPrimaryContainer = Color(0xFF1C1B19),
    secondary = Color(0xFF6BA292),
    onSecondary = Color(0xFFFFFFFF),
    background = Color(0xFFF5F3EE),
    onBackground = Color(0xFF1C1B19),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1C1B19),
    surfaceVariant = Color(0xFFECE8DF),
    onSurfaceVariant = Color(0xFF625E56),
    outline = Color(0xFFDDD8CC),
    error = Color(0xFFB54132)
)

private fun nexAmoledDarkColors(female: Boolean) = darkColorScheme(
    primary = if (female) Color(0xFFE06D7A) else Color(0xFFD97757),
    onPrimary = Color(0xFF120B08),
    primaryContainer = if (female) Color(0xFF3A1D22) else Color(0xFF361F17),
    onPrimaryContainer = Color(0xFFF3EFEA),
    secondary = Color(0xFF6BA292),
    onSecondary = Color(0xFF0A1411),
    background = Color(0xFF000000),
    onBackground = Color(0xFFF0EFEA),
    surface = Color(0xFF0E1015),
    onSurface = Color(0xFFF0EFEA),
    surfaceVariant = Color(0xFF181B22),
    onSurfaceVariant = Color(0xFF9AA0AC),
    outline = Color(0xFF262A34),
    error = Color(0xFFE07A6A)
)

val NexOkColor = Color(0xFF2F8F5B)
val NexWarnColor = Color(0xFFB5651D)

@Composable
fun NexTheme(themeMode: String = "system", femaleAccent: Boolean = false, content: @Composable () -> Unit) {
    val dark = when (themeMode) { "dark" -> true; "light" -> false; else -> isSystemInDarkTheme() }
    MaterialTheme(colorScheme = if (dark) nexAmoledDarkColors(femaleAccent) else nexLightColors(femaleAccent), content = content)
}

/**
 * Custom crisp vector icons so the app never depends on material-icons-extended.
 */
object NexIcons {
    private fun strokeIcon(name: String, block: ImageVector.Builder.() -> Unit): ImageVector =
        ImageVector.Builder(
            name = name,
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).apply(block).build()

    val MicWave: ImageVector by lazy {
        strokeIcon("MicWave") {
            val s = SolidColor(Color.Black)
            path(stroke = s, strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
                moveTo(4f, 10f); lineTo(4f, 14f)
                moveTo(8f, 7f); lineTo(8f, 17f)
                moveTo(12f, 4f); lineTo(12f, 20f)
                moveTo(16f, 8f); lineTo(16f, 16f)
                moveTo(20f, 11f); lineTo(20f, 13f)
            }
        }
    }

    val Folder: ImageVector by lazy {
        strokeIcon("Folder") {
            val s = SolidColor(Color.Black)
            path(stroke = s, strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round) {
                moveTo(3f, 7f)
                lineTo(3f, 18f)
                lineTo(21f, 18f)
                lineTo(21f, 8f)
                lineTo(11f, 8f)
                lineTo(9f, 5f)
                lineTo(5f, 5f)
                close()
            }
        }
    }

    val Artifacts: ImageVector by lazy {
        strokeIcon("Artifacts") {
            val s = SolidColor(Color.Black)
            path(stroke = s, strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round) {
                moveTo(12f, 3f); lineTo(21f, 8f); lineTo(12f, 13f); lineTo(3f, 8f); close()
                moveTo(3f, 13f); lineTo(12f, 18f); lineTo(21f, 13f)
            }
        }
    }

    val NewChatPen: ImageVector by lazy {
        strokeIcon("NewChatPen") {
            val s = SolidColor(Color.Black)
            path(stroke = s, strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round) {
                moveTo(12f, 5f); lineTo(5f, 5f); lineTo(5f, 19f); lineTo(19f, 19f); lineTo(19f, 12f)
                moveTo(17f, 3f); lineTo(21f, 7f); lineTo(12f, 16f); lineTo(8f, 16f); lineTo(8f, 12f); close()
            }
        }
    }

    val MediaEdit: ImageVector by lazy {
        strokeIcon("MediaEdit") {
            val s = SolidColor(Color.Black)
            path(stroke = s, strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round) {
                moveTo(3f, 5f); lineTo(21f, 5f); lineTo(21f, 19f); lineTo(3f, 19f); close()
                moveTo(3f, 15f); lineTo(8f, 10f); lineTo(13f, 15f); lineTo(16f, 12f); lineTo(21f, 17f)
            }
        }
    }

    val Copy: ImageVector by lazy {
        strokeIcon("Copy") {
            val s = SolidColor(Color.Black)
            path(stroke = s, strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round) {
                moveTo(9f, 9f); lineTo(20f, 9f); lineTo(20f, 20f); lineTo(9f, 20f); close()
                moveTo(5f, 15f); lineTo(4f, 15f); lineTo(4f, 4f); lineTo(15f, 4f); lineTo(15f, 5f)
            }
        }
    }
}
