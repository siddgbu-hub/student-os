package com.studentos.app.config

import kotlinx.serialization.Serializable

/**
 * Type-safe enumeration of remotely controllable application features.
 */
enum class Feature {
    ANALYTICS,
    PLANNER,
    REVISION,
    STUDY,
    PAYMENTS,
    WEB_VERSION,
    NEW_DASHBOARD
}

/**
 * Feature flag payload with safe default states (all enabled).
 */
@Serializable
data class FeatureFlags(
    val analytics: Boolean = true,
    val planner: Boolean = true,
    val revision: Boolean = true,
    val study: Boolean = true,
    val payments: Boolean = true,
    val webVersion: Boolean = true,
    val newDashboard: Boolean = true
) {
    fun isEnabled(feature: Feature): Boolean {
        return when (feature) {
            Feature.ANALYTICS -> analytics
            Feature.PLANNER -> planner
            Feature.REVISION -> revision
            Feature.STUDY -> study
            Feature.PAYMENTS -> payments
            Feature.WEB_VERSION -> webVersion
            Feature.NEW_DASHBOARD -> newDashboard
        }
    }
}
