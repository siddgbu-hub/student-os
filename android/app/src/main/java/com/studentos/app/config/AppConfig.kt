package com.studentos.app.config

import android.net.Uri
import kotlinx.serialization.Serializable

const val CANONICAL_WEB_URL = "https://studentos.kryvlance.in"
const val CANONICAL_GITHUB_RELEASE_URL = "https://github.com/siddgbu-hub/student-os/releases"
const val CANONICAL_GITHUB_LATEST_RELEASE_URL = "https://github.com/siddgbu-hub/student-os/releases/tag/v1.0.5"
const val CANONICAL_GITHUB_LATEST_APK_URL = "https://github.com/siddgbu-hub/student-os/releases/download/v1.0.5/student-os-v1.0.5.apk"
const val CANONICAL_HELP_URL = "https://studentos.kryvlance.in/help"

/**
 * Validates that an update/release URL uses HTTPS and points to an authorized GitHub domain.
 */
fun isValidGitHubDownloadUrl(url: String?): Boolean {
    if (url.isNullOrBlank() || !url.startsWith("https://", ignoreCase = true)) {
        return false
    }
    return try {
        val uri = java.net.URI(url)
        val host = uri.host?.lowercase() ?: return false
        host == "github.com" ||
            host.endsWith(".github.com") ||
            host == "objects.githubusercontent.com" ||
            host.endsWith(".githubusercontent.com") ||
            host == "github-releases.githubusercontent.com"
    } catch (_: Exception) {
        false
    }
}

@Serializable
data class AppAnnouncementDto(
    val id: String = "",
    val title: String = "",
    val message: String = "",
    val actionUrl: String? = null,
    val actionText: String? = null,
    val dismissible: Boolean = true,
    val createdAt: String = ""
)

@Serializable
data class RemoteAppConfigDto(
    val minimumSupportedVersion: String = "1.0.0",
    val minimumSupportedVersionCode: Int = 1,
    val latestVersion: String = "1.0.5",
    val latestVersionCode: Int = 6,
    val recommendedUpdateVersion: String = "1.0.5",
    val forceUpdate: Boolean = false,
    val maintenanceMode: Boolean = false,
    val maintenanceMessage: String? = null,
    val features: FeatureFlags = FeatureFlags(),
    val webUrl: String = CANONICAL_WEB_URL,
    val githubReleaseUrl: String = CANONICAL_GITHUB_RELEASE_URL,
    val githubLatestReleaseUrl: String = CANONICAL_GITHUB_LATEST_RELEASE_URL,
    val githubLatestApkUrl: String = CANONICAL_GITHUB_LATEST_APK_URL,
    val latestApkSha256: String? = "2c551ed52e295458b1e0a9399140c3e47374c31533d5d13647dcd178589fd457",
    val helpUrl: String = CANONICAL_HELP_URL,
    val supportEmail: String? = null,
    val announcements: List<AppAnnouncementDto> = emptyList()
)

@Serializable
data class RemoteAppConfigResponse(
    val success: Boolean,
    val data: RemoteAppConfigDto? = null,
    val timestamp: String? = null
)

/**
 * State representing the client update status for GitHub Releases distribution.
 */
sealed class AppUpdateState {
    object UpToDate : AppUpdateState()

    data class OptionalUpdate(
        val latestVersionName: String,
        val latestVersionCode: Int,
        val apkUrl: String,
        val releaseUrl: String,
        val apkSha256: String? = null,
        val releaseNotes: List<String> = emptyList()
    ) : AppUpdateState()

    data class MandatoryUpdate(
        val minimumSupportedVersion: String,
        val minimumSupportedVersionCode: Int,
        val latestVersionName: String,
        val apkUrl: String,
        val releaseUrl: String,
        val apkSha256: String? = null,
        val reason: String? = null
    ) : AppUpdateState()
}

/**
 * Full reactive state consumed by application UI and navigation layers.
 */
data class AppConfigState(
    val isLoading: Boolean = false,
    val isMaintenanceMode: Boolean = false,
    val maintenanceMessage: String? = null,
    val updateState: AppUpdateState = AppUpdateState.UpToDate,
    val featureFlags: FeatureFlags = FeatureFlags(),
    val webUrl: String = CANONICAL_WEB_URL,
    val githubReleaseUrl: String = CANONICAL_GITHUB_RELEASE_URL,
    val githubLatestReleaseUrl: String = CANONICAL_GITHUB_LATEST_RELEASE_URL,
    val githubLatestApkUrl: String = CANONICAL_GITHUB_LATEST_APK_URL,
    val latestApkSha256: String? = null,
    val helpUrl: String = CANONICAL_HELP_URL,
    val supportEmail: String? = null,
    val announcements: List<AppAnnouncementDto> = emptyList(),
    val isUsingCachedConfig: Boolean = false,
    val lastFetchedTimestamp: Long = 0L
)
