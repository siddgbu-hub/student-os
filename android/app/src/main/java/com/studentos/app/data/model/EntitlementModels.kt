package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class PlanDto(
    val planId: String,
    val name: String,
    val description: String? = null,
    val priceCents: Long = 0,
    val currency: String = "INR",
    val durationDays: Int? = null,
    val features: List<String> = emptyList(),
    val isActive: Boolean = true,
    val paymentProviderProductId: String? = null,
    val paymentProviderPlanId: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val priceInRupees: Long get() = priceCents / 100
}

@Serializable
data class EntitlementDto(
    val entitlementId: String? = null,
    val accountId: String? = null,
    val currentPlanId: String = "free_trial",
    val planName: String = "7-Day Free Trial",
    val status: String = "active",
    val isPaid: Boolean = false,
    val features: List<String> = emptyList(),
    val expiresAt: String? = null,
    val lastVerifiedAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val isExpired: Boolean get() = status == "expired"
    val isTrial: Boolean get() = currentPlanId == "free_trial"
    val isActive: Boolean get() = status == "active"
}

@Serializable
data class PaymentConfigDto(
    val isLive: Boolean = false,
    val supportedProviders: List<String> = emptyList(),
    val activeProvider: String? = null,
    val contactWhatsApp: String? = null,
    val contactUpi: String? = null,
    val updatedAt: String? = null
)
