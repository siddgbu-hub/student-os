package com.studentos.app.config

import android.content.Context
import android.util.Log
import com.studentos.app.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private const val TAG = "AppConfigManager"

object AppConfigManager {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var repository: AppConfigRepository? = null

    private val _configState = MutableStateFlow(AppConfigState())
    val configState: StateFlow<AppConfigState> = _configState.asStateFlow()

    private var isInitialized = false

    fun initialize(context: Context) {
        if (isInitialized) return
        isInitialized = true

        val repo = AppConfigRepository(context.applicationContext)
        repository = repo

        // Seed with cached/default state immediately
        val cached = repo.getCachedConfig()
        val updateState = determineUpdateState(
            installedVersionName = BuildConfig.VERSION_NAME,
            installedVersionCode = BuildConfig.VERSION_CODE,
            config = cached
        )

        _configState.value = AppConfigState(
            isLoading = false,
            isMaintenanceMode = cached.maintenanceMode,
            maintenanceMessage = cached.maintenanceMessage,
            updateState = updateState,
            featureFlags = cached.features,
            webUrl = cached.webUrl.ifBlank { CANONICAL_WEB_URL },
            githubReleaseUrl = cached.githubReleaseUrl.ifBlank { CANONICAL_GITHUB_RELEASE_URL },
            githubLatestReleaseUrl = cached.githubLatestReleaseUrl.ifBlank { CANONICAL_GITHUB_LATEST_RELEASE_URL },
            githubLatestApkUrl = cached.githubLatestApkUrl.ifBlank { CANONICAL_GITHUB_LATEST_APK_URL },
            latestApkSha256 = cached.latestApkSha256,
            helpUrl = cached.helpUrl.ifBlank { CANONICAL_HELP_URL },
            supportEmail = cached.supportEmail?.ifBlank { null },
            announcements = cached.announcements,
            isUsingCachedConfig = true,
            lastFetchedTimestamp = repo.getLastFetchTimestamp()
        )

        // Asynchronously fetch fresh remote config without blocking startup
        scope.launch {
            fetchRemoteConfig()
        }
    }

    suspend fun fetchRemoteConfig() {
        val repo = repository ?: return

        val (remoteConfig, isCachedFallback) = repo.fetchRemoteConfig()
        val updateState = determineUpdateState(
            installedVersionName = BuildConfig.VERSION_NAME,
            installedVersionCode = BuildConfig.VERSION_CODE,
            config = remoteConfig
        )

        _configState.value = _configState.value.copy(
            isLoading = false,
            isMaintenanceMode = remoteConfig.maintenanceMode,
            maintenanceMessage = remoteConfig.maintenanceMessage,
            updateState = updateState,
            featureFlags = remoteConfig.features,
            webUrl = remoteConfig.webUrl.ifBlank { CANONICAL_WEB_URL },
            githubReleaseUrl = remoteConfig.githubReleaseUrl.ifBlank { CANONICAL_GITHUB_RELEASE_URL },
            githubLatestReleaseUrl = remoteConfig.githubLatestReleaseUrl.ifBlank { CANONICAL_GITHUB_LATEST_RELEASE_URL },
            githubLatestApkUrl = remoteConfig.githubLatestApkUrl.ifBlank { CANONICAL_GITHUB_LATEST_APK_URL },
            latestApkSha256 = remoteConfig.latestApkSha256,
            helpUrl = remoteConfig.helpUrl.ifBlank { CANONICAL_HELP_URL },
            supportEmail = remoteConfig.supportEmail?.ifBlank { null },
            announcements = remoteConfig.announcements,
            isUsingCachedConfig = isCachedFallback,
            lastFetchedTimestamp = System.currentTimeMillis()
        )

        Log.d(TAG, "AppConfigState updated. Maintenance=${remoteConfig.maintenanceMode}, Update=${updateState.javaClass.simpleName}")
    }

    /**
     * Deterministic version governance calculation.
     * VersionCode is authoritative for Android updates; Semantic Version is human-readable.
     */
    fun determineUpdateState(
        installedVersionName: String,
        installedVersionCode: Int,
        config: RemoteAppConfigDto
    ): AppUpdateState {
        val installedSemVer = SemanticVersion.parse(installedVersionName)
        val minSemVer = SemanticVersion.parse(config.minimumSupportedVersion)
        val latestSemVer = SemanticVersion.parse(config.latestVersion)

        // 1. Mandatory / Force Update:
        // Triggered if server sets forceUpdate=true, or if installed version is below minimum supported.
        val isBelowMinSemVer = installedSemVer < minSemVer
        val isBelowMinCode = installedVersionCode < config.minimumSupportedVersionCode
        val isForced = config.forceUpdate

        if (isForced || isBelowMinSemVer || isBelowMinCode) {
            return AppUpdateState.MandatoryUpdate(
                minimumSupportedVersion = config.minimumSupportedVersion,
                minimumSupportedVersionCode = config.minimumSupportedVersionCode,
                latestVersionName = config.latestVersion,
                apkUrl = config.githubLatestApkUrl.ifBlank { CANONICAL_GITHUB_LATEST_APK_URL },
                releaseUrl = config.githubLatestReleaseUrl.ifBlank { CANONICAL_GITHUB_LATEST_RELEASE_URL },
                apkSha256 = config.latestApkSha256,
                reason = if (isForced) "A critical update is required to continue using Student OS." else null
            )
        }

        // 2. Optional Update:
        // Triggered if a newer version exists but current version is still supported.
        val isBelowLatestSemVer = installedSemVer < latestSemVer
        val isBelowLatestCode = installedVersionCode < config.latestVersionCode

        if (isBelowLatestSemVer || isBelowLatestCode) {
            return AppUpdateState.OptionalUpdate(
                latestVersionName = config.latestVersion,
                latestVersionCode = config.latestVersionCode,
                apkUrl = config.githubLatestApkUrl.ifBlank { CANONICAL_GITHUB_LATEST_APK_URL },
                releaseUrl = config.githubLatestReleaseUrl.ifBlank { CANONICAL_GITHUB_LATEST_RELEASE_URL },
                apkSha256 = config.latestApkSha256
            )
        }

        // 3. Current client is completely up to date
        return AppUpdateState.UpToDate
    }

    fun isFeatureEnabled(feature: Feature): Boolean {
        return _configState.value.featureFlags.isEnabled(feature)
    }

    fun dismissOptionalUpdate() {
        if (_configState.value.updateState is AppUpdateState.OptionalUpdate) {
            _configState.value = _configState.value.copy(updateState = AppUpdateState.UpToDate)
        }
    }
}
