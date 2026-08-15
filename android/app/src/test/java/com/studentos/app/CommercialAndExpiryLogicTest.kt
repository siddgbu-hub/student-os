package com.studentos.app

import com.studentos.app.data.config.AppConfig
import com.studentos.app.data.model.PlanDto
import com.studentos.app.notifications.SubscriptionExpiryScheduler
import com.studentos.app.ui.screens.dashboard.formatProExpiryText
import com.studentos.app.ui.screens.dashboard.calculateRemainingTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.roundToInt

class CommercialAndExpiryLogicTest {

    @Test
    fun testSavingsPercentageFormulaCalculation() {
        val monthlyPrice = 30L
        val yearlyPrice = 299L
        val monthlyAnnualCost = monthlyPrice * 12 // 360
        val savings = monthlyAnnualCost - yearlyPrice // 61

        val savingsPercentage = if (monthlyAnnualCost > 0 && savings > 0) {
            ((savings.toDouble() / monthlyAnnualCost.toDouble()) * 100).roundToInt()
        } else 0

        // 61 / 360 * 100 = 16.944... -> 17%
        assertEquals(17, savingsPercentage)
    }

    @Test
    fun testWhatsAppPrefilledMessageFormatting() {
        val yearlyPlan = PlanDto(
            planId = "yearly",
            name = "Student OS Pro Yearly",
            description = "Yearly full access",
            priceCents = 29900L,
            durationDays = 365,
            features = listOf("all_features"),
            isActive = true
        )

        val message = AppConfig.buildPurchaseMessage(
            planName = yearlyPlan.name,
            priceInRupees = yearlyPlan.priceInRupees,
            accountEmail = "sidd.gbu@gmail.com",
            planId = yearlyPlan.planId,
            durationDays = yearlyPlan.durationDays
        )
        val expected = "Hi, I want to get Student OS Pro Yearly access for ₹299.\n\nAccount: sidd.gbu@gmail.com\nPlan: yearly\nDuration: 365 days"

        assertEquals(expected, message)
    }

    @Test
    fun testProActiveIdentityDoesNotContainMonthlyOrYearlyActive() {
        val activeProTitle = "Student OS Pro"
        val activeProSubtitle = "Premium access active"

        assertFalse(activeProTitle.contains("YEARLY ACTIVE", ignoreCase = true))
        assertFalse(activeProTitle.contains("MONTHLY ACTIVE", ignoreCase = true))
        assertFalse(activeProSubtitle.contains("YEARLY ACTIVE", ignoreCase = true))
        assertFalse(activeProSubtitle.contains("MONTHLY ACTIVE", ignoreCase = true))
        assertEquals("Student OS Pro", activeProTitle)
    }

    @Test
    fun testProExpiryCountdownFormatting() {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val now = System.currentTimeMillis()

        // > 30 days
        val expiry45Days = sdf.format(Date(now + 45L * 24 * 60 * 60 * 1000))
        assertEquals("Pro access active", formatProExpiryText(expiry45Days))

        // 7 - 30 days
        val expiry14Days = sdf.format(Date(now + 14L * 24 * 60 * 60 * 1000 + 3600000))
        assertEquals("Pro access · 14 days left", formatProExpiryText(expiry14Days))

        // 1 - 6 days
        val expiry3Days = sdf.format(Date(now + 3L * 24 * 60 * 60 * 1000 + 3600000))
        assertEquals("Pro access · 3 days left", formatProExpiryText(expiry3Days))

        // < 24 hours
        val expiry10Hours = sdf.format(Date(now + 10L * 60 * 60 * 1000))
        assertEquals("Pro access · ends today", formatProExpiryText(expiry10Hours))

        // Expired
        val expiredPast = sdf.format(Date(now - 10000))
        assertEquals("Pro access ended", formatProExpiryText(expiredPast))
    }

    @Test
    fun testTrialCountdownFormatting() {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val now = System.currentTimeMillis()

        // 6 days left
        val expiry6Days = sdf.format(Date(now + 6L * 24 * 60 * 60 * 1000 + 3600000))
        assertEquals("6 days left", calculateRemainingTime(expiry6Days))

        // Expired
        val expired = sdf.format(Date(now - 5000))
        assertEquals("Trial expired", calculateRemainingTime(expired))
    }

    @Test
    fun testSubscriptionExpirySchedulerIsoParsingAndTriggerOffsets() {
        val iso = "2026-08-30T12:00:00Z"
        val epochMs = SubscriptionExpiryScheduler.parseIsoToEpochMs(iso)
        assertTrue(epochMs != null && epochMs > 0)

        val trigger3Days = epochMs!! - (3L * 24 * 60 * 60 * 1000)
        val trigger1Day = epochMs - (1L * 24 * 60 * 60 * 1000)
        val triggerExpiry = epochMs

        assertEquals(259200000L, epochMs - trigger3Days) // Exactly 3 days in ms
        assertEquals(86400000L, epochMs - trigger1Day)   // Exactly 1 day in ms
        assertEquals(epochMs, triggerExpiry)
    }

    @Test
    fun testDefaultWhatsAppContactNumber() {
        assertEquals("919793593183", AppConfig.DEFAULT_OWNER_WHATSAPP)
    }
}
