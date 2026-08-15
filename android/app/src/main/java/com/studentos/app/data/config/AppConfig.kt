package com.studentos.app.data.config

import android.content.Context
import android.content.Intent
import android.net.Uri
import java.net.URLEncoder

object AppConfig {
    /**
     * Centralized Default Fallback Owner WhatsApp Number.
     * Overridden dynamically by server GET /api/v1/payment/config when available.
     */
    const val DEFAULT_OWNER_WHATSAPP: String = "919793593183"

    /**
     * Clean phone number for WhatsApp deep-linking (removes +, spaces, dashes)
     */
    fun sanitizeWhatsAppNumber(number: String?): String {
        if (number.isNullOrBlank()) return DEFAULT_OWNER_WHATSAPP
        return number.replace("+", "").replace(" ", "").replace("-", "")
    }

    /**
     * Build prefilled WhatsApp message for manual purchase/contact flow.
     */
    fun buildPurchaseMessage(
        planName: String,
        priceInRupees: Long,
        accountEmail: String,
        planId: String,
        durationDays: Int?
    ): String {
        val durationText = durationDays?.let { "$it days" } ?: if (planId == "yearly") "365 days" else "30 days"
        val formattedPlanName = if (planName.startsWith("Student OS", ignoreCase = true)) planName else "Student OS $planName"
        return "Hi, I want to get $formattedPlanName access for ₹$priceInRupees.\n\nAccount: $accountEmail\nPlan: $planId\nDuration: $durationText"
    }

    /**
     * Launch WhatsApp with prefilled message
     */
    fun openWhatsAppPurchase(
        context: Context,
        rawWhatsAppNumber: String?,
        planName: String,
        priceInRupees: Long,
        accountEmail: String,
        planId: String,
        durationDays: Int?
    ): Boolean {
        return try {
            val phone = sanitizeWhatsAppNumber(rawWhatsAppNumber)
            val message = buildPurchaseMessage(planName, priceInRupees, accountEmail, planId, durationDays)
            val encodedMessage = URLEncoder.encode(message, "UTF-8")
            val url = "https://wa.me/$phone?text=$encodedMessage"

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
