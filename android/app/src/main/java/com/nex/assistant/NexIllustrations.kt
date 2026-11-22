package com.nex.assistant

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

enum class EditorialArtKind { WELCOME, PROJECTS, ARTIFACTS, STORAGE }

@Composable
fun NexEditorialArt(
    kind: EditorialArtKind,
    modifier: Modifier = Modifier,
    width: Dp = 190.dp,
    height: Dp = 112.dp
) {
    val terracotta = Color(0xFFD97757)
    val sage = Color(0xFF6BA292)
    val ink = Color(0xFF8A909E)

    Canvas(modifier = modifier.size(width, height)) {
        val w = size.width
        val h = size.height
        val cx = w * 0.5f
        val cy = h * 0.5f

        drawCircle(
            brush = Brush.radialGradient(colors = listOf(terracotta.copy(alpha = 0.24f), Color.Transparent), center = Offset(cx, cy), radius = h * 0.55f),
            radius = h * 0.55f, center = Offset(cx, cy)
        )
        when (kind) {
            EditorialArtKind.WELCOME -> {
                drawRoundRect(ink.copy(alpha = 0.14f), Offset(w * 0.30f, h * 0.28f), Size(w * 0.40f, h * 0.48f), CornerRadius(18f, 18f))
                drawRoundRect(ink.copy(alpha = 0.42f), Offset(w * 0.30f, h * 0.28f), Size(w * 0.40f, h * 0.48f), CornerRadius(18f, 18f), style = Stroke(3f))
                drawLine(ink.copy(alpha = 0.48f), Offset(w * 0.36f, h * 0.42f), Offset(w * 0.56f, h * 0.42f), 4f, StrokeCap.Round)
                drawLine(ink.copy(alpha = 0.38f), Offset(w * 0.36f, h * 0.53f), Offset(w * 0.63f, h * 0.53f), 4f, StrokeCap.Round)
                drawLine(ink.copy(alpha = 0.32f), Offset(w * 0.36f, h * 0.64f), Offset(w * 0.52f, h * 0.64f), 4f, StrokeCap.Round)
                val sx = w * 0.72f; val sy = h * 0.30f
                drawCircle(terracotta.copy(alpha = 0.18f), h * 0.16f, Offset(sx, sy))
                drawCircle(terracotta, h * 0.16f, Offset(sx, sy), style = Stroke(3f))
                val spark = Path().apply {
                    val r = h * 0.09f
                    moveTo(sx, sy - r); lineTo(sx + r * 0.28f, sy - r * 0.28f); lineTo(sx + r, sy); lineTo(sx + r * 0.28f, sy + r * 0.28f)
                    lineTo(sx, sy + r); lineTo(sx - r * 0.28f, sy + r * 0.28f); lineTo(sx - r, sy); lineTo(sx - r * 0.28f, sy - r * 0.28f); close()
                }
                drawPath(spark, color = terracotta)
                drawCircle(sage.copy(alpha = 0.7f), h * 0.055f, Offset(w * 0.24f, h * 0.38f))
            }
            EditorialArtKind.PROJECTS -> {
                val folder = Path().apply {
                    moveTo(w * 0.26f, h * 0.32f); lineTo(w * 0.42f, h * 0.32f); lineTo(w * 0.48f, h * 0.40f)
                    lineTo(w * 0.74f, h * 0.40f); lineTo(w * 0.74f, h * 0.78f); lineTo(w * 0.26f, h * 0.78f); close()
                }
                drawPath(folder, ink.copy(alpha = 0.14f))
                drawPath(folder, ink.copy(alpha = 0.46f), style = Stroke(3f, join = StrokeJoin.Round))
                drawLine(ink.copy(alpha = 0.4f), Offset(w * 0.33f, h * 0.54f), Offset(w * 0.66f, h * 0.54f), 4f, StrokeCap.Round)
                drawLine(ink.copy(alpha = 0.32f), Offset(w * 0.33f, h * 0.65f), Offset(w * 0.55f, h * 0.65f), 4f, StrokeCap.Round)
                drawCircle(terracotta.copy(alpha = 0.22f), h * 0.13f, Offset(w * 0.72f, h * 0.32f))
                drawCircle(terracotta, h * 0.13f, Offset(w * 0.72f, h * 0.32f), style = Stroke(3f))
            }
            EditorialArtKind.ARTIFACTS -> {
                drawRoundRect(ink.copy(alpha = 0.10f), Offset(w * 0.26f, h * 0.26f), Size(w * 0.30f, h * 0.56f), CornerRadius(14f, 14f))
                drawRoundRect(ink.copy(alpha = 0.18f), Offset(w * 0.40f, h * 0.20f), Size(w * 0.34f, h * 0.62f), CornerRadius(16f, 16f))
                drawRoundRect(ink.copy(alpha = 0.46f), Offset(w * 0.40f, h * 0.20f), Size(w * 0.34f, h * 0.62f), CornerRadius(16f, 16f), style = Stroke(3f))
                drawRoundRect(terracotta.copy(alpha = 0.24f), Offset(w * 0.45f, h * 0.30f), Size(w * 0.24f, h * 0.16f), CornerRadius(8f, 8f))
                drawLine(ink.copy(alpha = 0.4f), Offset(w * 0.45f, h * 0.57f), Offset(w * 0.68f, h * 0.57f), 4f, StrokeCap.Round)
                drawLine(ink.copy(alpha = 0.34f), Offset(w * 0.45f, h * 0.68f), Offset(w * 0.60f, h * 0.68f), 4f, StrokeCap.Round)
                drawCircle(sage.copy(alpha = 0.8f), h * 0.06f, Offset(w * 0.76f, h * 0.30f))
            }
            EditorialArtKind.STORAGE -> {
                drawCircle(ink.copy(alpha = 0.16f), h * 0.22f, Offset(w * 0.48f, h * 0.46f))
                drawCircle(ink.copy(alpha = 0.16f), h * 0.16f, Offset(w * 0.34f, h * 0.56f))
                drawCircle(ink.copy(alpha = 0.16f), h * 0.16f, Offset(w * 0.64f, h * 0.56f))
                drawRoundRect(ink.copy(alpha = 0.16f), Offset(w * 0.28f, h * 0.52f), Size(w * 0.44f, h * 0.20f), CornerRadius(24f, 24f))
                val shield = Path().apply {
                    moveTo(cx, h * 0.34f); lineTo(cx + w * 0.09f, h * 0.41f); lineTo(cx + w * 0.09f, h * 0.56f)
                    lineTo(cx, h * 0.68f); lineTo(cx - w * 0.09f, h * 0.56f); lineTo(cx - w * 0.09f, h * 0.41f); close()
                }
                drawPath(shield, terracotta.copy(alpha = 0.22f))
                drawPath(shield, terracotta, style = Stroke(3f, join = StrokeJoin.Round))
                drawCircle(sage.copy(alpha = 0.7f), h * 0.045f, Offset(w * 0.22f, h * 0.42f))
                drawCircle(terracotta.copy(alpha = 0.7f), h * 0.04f, Offset(w * 0.78f, h * 0.38f))
            }
        }
    }
}
