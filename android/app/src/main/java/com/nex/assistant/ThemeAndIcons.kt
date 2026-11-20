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

private val NexLightColors = lightColorScheme(
    primary = Color(0xFF1A1D22),
    onPrimary = Color(0xFFF6F7F9),
    primaryContainer = Color(0xFF2A2D34),
    onPrimaryContainer = Color(0xFFF2F3F5),
    secondary = Color(0xFF4F5561),
    onSecondary = Color(0xFFFFFFFF),
    background = Color(0xFFECEEF1),
    onBackground = Color(0xFF14161A),
    surface = Color(0xFFF8F9FB),
    onSurface = Color(0xFF14161A),
    surfaceVariant = Color(0xFFE4E7EC),
    onSurfaceVariant = Color(0xFF5A606B),
    outline = Color(0xFFD0D4DC),
    error = Color(0xFFB54132)
)

private val NexDarkColors = darkColorScheme(
    primary = Color(0xFFECEEF2),
    onPrimary = Color(0xFF14161A),
    primaryContainer = Color(0xFFD9DCE3),
    onPrimaryContainer = Color(0xFF14161A),
    secondary = Color(0xFFA0A6B2),
    onSecondary = Color(0xFF14161A),
    background = Color(0xFF0C0D10),
    onBackground = Color(0xFFECEEF2),
    surface = Color(0xFF16181D),
    onSurface = Color(0xFFECEEF2),
    surfaceVariant = Color(0xFF22252C),
    onSurfaceVariant = Color(0xFF9AA0AC),
    outline = Color(0xFF2C303A),
    error = Color(0xFFE07A6A)
)

val NexOkColor = Color(0xFF2F8F5B)
val NexWarnColor = Color(0xFFB5651D)

@Composable
fun NexTheme(content: @Composable () -> Unit) {
    val scheme = if (isSystemInDarkTheme()) NexDarkColors else NexLightColors
    MaterialTheme(colorScheme = scheme, content = content)
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
