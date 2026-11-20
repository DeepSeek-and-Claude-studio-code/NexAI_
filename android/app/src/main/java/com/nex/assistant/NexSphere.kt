package com.nex.assistant

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

/** k: integer speed multiplier so the periodic loop wraps seamlessly */
enum class NexState(val k: Int) {
    IDLE(1),
    LISTENING(2),
    THINKING(6),
    WORKING(3),
    SPEAKING(2)
}

/**
 * Grey 3D sphere with grey gradient ribbons for Nex.
 * When female == true (Nexi), ribbons shift to pink and a pink bow sits on top.
 */
@Composable
fun NexSphere(
    modifier: Modifier = Modifier,
    state: NexState = NexState.IDLE,
    female: Boolean = false
) {
    val t by rememberInfiniteTransition(label = "sphere").animateFloat(
        initialValue = 0f,
        targetValue = (2 * PI).toFloat(),
        animationSpec = infiniteRepeatable(tween(8000, easing = LinearEasing)),
        label = "phase"
    )
    Canvas(modifier) {
        val c = center
        val pulse = when (state) {
            NexState.SPEAKING -> 0.08f
            NexState.LISTENING -> 0.04f
            else -> 0.015f
        }
        val r = size.minDimension * 0.30f * (1f + pulse * sin(t * 8f))
        val phase = t * state.k
        val hue = if (female) 335f else 220f
        val sat = if (female) 0.78f else 0.04f

        if (state == NexState.LISTENING) {
            for (q in 0 until 3) {
                val u = ((t / (2f * PI.toFloat()) * 2f + q / 3f) % 1f)
                drawCircle(
                    color = if (female) Color(0xFFE0538F).copy(alpha = 0.45f * (1f - u))
                    else Color(0xFF8C929E).copy(alpha = 0.45f * (1f - u)),
                    radius = r * (1.05f + u * 0.55f),
                    center = c,
                    style = Stroke(width = 3f)
                )
            }
        }

        // Ground shadow
        drawOval(
            color = Color.Black.copy(alpha = 0.16f),
            topLeft = Offset(c.x - r * 0.7f, c.y + r * 1.03f),
            size = Size(r * 1.4f, r * 0.18f)
        )

        val circle = Path().apply { addOval(Rect(c, r)) }
        clipPath(circle) {
            drawCircle(
                brush = Brush.radialGradient(
                    listOf(Color(0xFFE3E6EB), Color(0xFF9AA0AB), Color(0xFF50545D)),
                    center = Offset(c.x - r * 0.3f, c.y - r * 0.35f),
                    radius = r * 1.6f
                ),
                radius = r,
                center = c
            )

            for (i in 0 until 7) {
                val a = phase + i * 0.9f
                val y = sin(a) * r * 0.9f
                val w = r * 0.13f * (0.45f + 0.55f * abs(cos(a)))
                val l = 0.62f + 0.18f * sin(t + i * 1.1f)
                val dark = (if (female) l - 0.10f else l - 0.26f).coerceIn(0f, 1f)
                val mid = (if (female) l + 0.06f else l + 0.16f).coerceIn(0f, 1f)
                val brush = Brush.horizontalGradient(
                    listOf(
                        Color.hsl(hue, sat, dark, 0.2f),
                        Color.hsl(hue, sat, mid, 0.8f),
                        Color.hsl(hue, sat, dark, 0.2f)
                    ),
                    startX = c.x - r,
                    endX = c.x + r
                )
                val p = Path().apply {
                    moveTo(c.x - r * 1.1f, c.y + y * 0.55f)
                    quadraticTo(c.x, c.y + y + cos(a) * r * 0.55f, c.x + r * 1.1f, c.y + y * 0.55f)
                }
                drawPath(p, brush, style = Stroke(width = w, cap = StrokeCap.Round))
            }

            // Specular highlight & edge shading for 3D depth
            drawCircle(
                brush = Brush.radialGradient(
                    listOf(Color.White.copy(alpha = 0.65f), Color.Transparent),
                    center = Offset(c.x - r * 0.35f, c.y - r * 0.42f),
                    radius = r * 0.6f
                ),
                radius = r,
                center = c
            )
            drawCircle(
                brush = Brush.radialGradient(
                    0f to Color.Transparent,
                    0.55f to Color.Transparent,
                    1f to Color.Black.copy(alpha = 0.42f),
                    center = c,
                    radius = r
                ),
                radius = r,
                center = c
            )
        }

        if (state == NexState.WORKING) {
            for (d in 0 until 3) {
                val an = t * 2f + d * 2.09f
                drawCircle(
                    color = Color.hsl(hue, sat, 0.7f),
                    radius = size.minDimension * 0.016f,
                    center = Offset(c.x + cos(an) * r * 1.32f, c.y + sin(an) * r * 0.65f)
                )
            }
        }

        if (female) drawBow(c.x, c.y - r * 0.88f, r)
    }
}

private fun DrawScope.drawBow(x: Float, y: Float, r: Float) {
    val s = r * 0.40f
    translate(x, y) {
        for (d in listOf(-1f, 1f)) {
            val p = Path().apply {
                moveTo(0f, 0f)
                cubicTo(s * 0.5f * d, -s * 1.1f, s * 1.7f * d, -s * 1.0f, s * 1.55f * d, s * 0.1f)
                cubicTo(s * 1.4f * d, s * 0.8f, s * 0.5f * d, s * 0.6f, 0f, 0f)
                close()
            }
            drawPath(p, Brush.linearGradient(listOf(Color(0xFFFFB3CF), Color(0xFFE0538F))))
            drawPath(p, Color(0x59781E3C), style = Stroke(r * 0.02f))
        }
        drawCircle(Color(0xFFD6407F), s * 0.36f)
        drawCircle(Color.White.copy(alpha = 0.55f), s * 0.12f, Offset(-s * 0.1f, -s * 0.1f))
    }
}

@Composable
fun VoiceWaveIndicator(active: Boolean) {
    val t by rememberInfiniteTransition(label = "wave").animateFloat(
        initialValue = 0f,
        targetValue = (2 * PI).toFloat(),
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing)),
        label = "wave_phase"
    )
    Row(
        modifier = Modifier.height(26.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (i in 0 until 7) {
            val h = if (active) (6f + abs(sin(t * 2f + i * 0.9f)) * 18f) else 6f
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(h.dp)
                    .background(
                        MaterialTheme.colorScheme.onSurfaceVariant,
                        RoundedCornerShape(2.dp)
                    )
            )
        }
    }
}
