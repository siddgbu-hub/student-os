package com.studentos.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Student OS Central Typography System.
 *
 * Designed specifically for clean legibility, precise hierarchy, and optimal vertical rhythm
 * on mobile screens across light and dark themes.
 *
 * Weight Distribution Philosophy:
 * - Display / Hero: Bold (700) with optical tight tracking for numeric impact without visual noise.
 * - Screen & Section Titles: SemiBold (600) for crisp, modern editorial hierarchy.
 * - Card Titles & Accents: SemiBold (600) / Medium (500).
 * - Body: Regular (400) for comfortable, fatigue-free reading during long study sessions.
 * - Buttons & Actions: SemiBold (600) for clear call-to-action definition.
 * - Labels & Status Badges: SemiBold (600) / Medium (500) with slight letter-spacing expansion.
 * - Captions & Helper Text: Regular (400) / Medium (500) with generous line heights to prevent clipping.
 */
val Typography = Typography(
    // -----------------------------------------------------------------------
    // Display — Primary Large Numbers, Timers, and Hero Statistics
    // -----------------------------------------------------------------------
    displayLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 52.sp,
        lineHeight = 58.sp,
        letterSpacing = (-1.0).sp
    ),
    displayMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 34.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.5).sp
    ),
    displaySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.25).sp
    ),

    // -----------------------------------------------------------------------
    // Headline — Screen Titles and Major Surface Headers
    // -----------------------------------------------------------------------
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 26.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.2).sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.15).sp
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        letterSpacing = (-0.1).sp
    ),

    // -----------------------------------------------------------------------
    // Title — Card Headers, List Section Titles, Dialog Titles
    // -----------------------------------------------------------------------
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
        letterSpacing = 0.1.sp
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),

    // -----------------------------------------------------------------------
    // Body — Primary Content, Subtitles, Paragraphs, Explanations
    // -----------------------------------------------------------------------
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.2.sp
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.25.sp
    ),

    // -----------------------------------------------------------------------
    // Label — Buttons, Chips, Badges, Tabs, Navigation Items
    // -----------------------------------------------------------------------
    labelLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.2.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.3.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.4.sp
    )
)

/**
 * Specialized typography styles for key Student OS components.
 */
object AppTypography {
    /** Prominent numeric stat values (e.g. "120 min", "14 Days", "85%") */
    val StatHero = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        lineHeight = 36.sp,
        letterSpacing = (-0.5).sp
    )

    /** Medium numeric stat values (e.g. Card KPI numbers) */
    val StatValue = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        letterSpacing = (-0.2).sp
    )

    /** Session countdown timer clock ("25:00") */
    val TimerClock = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 52.sp,
        lineHeight = 58.sp,
        letterSpacing = (-1.0).sp
    )

    /** Small badge & status pill text ("ACTIVE", "PRO", "ON TRACK") */
    val BadgeText = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp
    )
}
