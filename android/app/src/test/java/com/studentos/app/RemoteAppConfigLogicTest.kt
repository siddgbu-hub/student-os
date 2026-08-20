package com.studentos.app

import com.studentos.app.config.AppConfigManager
import com.studentos.app.config.AppUpdateState
import com.studentos.app.config.CANONICAL_GITHUB_LATEST_APK_URL
import com.studentos.app.config.CANONICAL_GITHUB_LATEST_RELEASE_URL
import com.studentos.app.config.CANONICAL_GITHUB_RELEASE_URL
import com.studentos.app.config.CANONICAL_WEB_URL
import com.studentos.app.config.Feature
import com.studentos.app.config.FeatureFlags
import com.studentos.app.config.RemoteAppConfigDto
import com.studentos.app.config.SemanticVersion
import com.studentos.app.config.isValidGitHubDownloadUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RemoteAppConfigLogicTest {

    // =======================================================================
    // 1. Semantic Version Parsing & Comparison
    // =======================================================================

    @Test
    fun testSemanticVersionParsing() {
        assertEquals(SemanticVersion(1, 0, 5), SemanticVersion.parse("1.0.5"))
        assertEquals(SemanticVersion(1, 2, 0), SemanticVersion.parse("1.2"))
        assertEquals(SemanticVersion(2, 0, 0), SemanticVersion.parse("2"))
        assertEquals(SemanticVersion(1, 3, 5), SemanticVersion.parse("v1.3.5"))
        assertEquals(SemanticVersion(0, 0, 0), SemanticVersion.parse("invalid"))
        assertEquals(SemanticVersion(0, 0, 0), SemanticVersion.parse(""))
        assertEquals(SemanticVersion(0, 0, 0), SemanticVersion.parse(null))
    }

    @Test
    fun testSemanticVersionComparison() {
        val v1_0_0 = SemanticVersion(1, 0, 0)
        val v1_1_0 = SemanticVersion(1, 1, 0)
        val v1_1_1 = SemanticVersion(1, 1, 1)
        val v1_2_0 = SemanticVersion(1, 2, 0)
        val v2_0_0 = SemanticVersion(2, 0, 0)

        assertTrue(v1_0_0 < v1_1_0)
        assertEquals(0, v1_1_0.compareTo(SemanticVersion(1, 1, 0)))
        assertTrue(v1_2_0 > v1_1_0)
        assertTrue(v1_1_1 > v1_1_0)
        assertTrue(v2_0_0 > v1_2_0)
    }

    // =======================================================================
    // 2. Version Governance: Mandatory / Force Update (GitHub Releases)
    // =======================================================================

    @Test
    fun testMandatoryUpdateWhenBelowMinimumSupportedVersionName() {
        val config = RemoteAppConfigDto(
            minimumSupportedVersion = "1.2.0",
            minimumSupportedVersionCode = 10,
            latestVersion = "1.3.0",
            latestVersionCode = 15,
            forceUpdate = false,
            githubLatestApkUrl = "https://github.com/siddgbu-hub/student-os/releases/download/v1.3.0/student-os-v1.3.0.apk"
        )

        // Installed version 1.1.0 is below minimum supported 1.2.0
        val state = AppConfigManager.determineUpdateState(
            installedVersionName = "1.1.0",
            installedVersionCode = 12,
            config = config
        )

        assertTrue(state is AppUpdateState.MandatoryUpdate)
        val mandatory = state as AppUpdateState.MandatoryUpdate
        assertEquals("1.2.0", mandatory.minimumSupportedVersion)
        assertEquals(10, mandatory.minimumSupportedVersionCode)
        assertEquals("1.3.0", mandatory.latestVersionName)
        assertEquals("https://github.com/siddgbu-hub/student-os/releases/download/v1.3.0/student-os-v1.3.0.apk", mandatory.apkUrl)
    }

    @Test
    fun testMandatoryUpdateWhenBelowMinimumSupportedVersionCode() {
        val config = RemoteAppConfigDto(
            minimumSupportedVersion = "1.0.0",
            minimumSupportedVersionCode = 10,
            latestVersion = "1.3.0",
            latestVersionCode = 15,
            forceUpdate = false
        )

        // Installed versionCode 8 is below minimum 10
        val state = AppConfigManager.determineUpdateState(
            installedVersionName = "1.0.0",
            installedVersionCode = 8,
            config = config
        )

        assertTrue(state is AppUpdateState.MandatoryUpdate)
    }

    @Test
    fun testMandatoryUpdateWhenServerDeclaresForceUpdateTrue() {
        val config = RemoteAppConfigDto(
            minimumSupportedVersion = "1.0.0",
            minimumSupportedVersionCode = 1,
            latestVersion = "1.0.5",
            latestVersionCode = 6,
            forceUpdate = true
        )

        // Even though installed version matches latest, forceUpdate=true requires update
        val state = AppConfigManager.determineUpdateState(
            installedVersionName = "1.0.5",
            installedVersionCode = 6,
            config = config
        )

        assertTrue(state is AppUpdateState.MandatoryUpdate)
    }

    // =======================================================================
    // 3. Version Governance: Optional Update (GitHub Releases)
    // =======================================================================

    @Test
    fun testOptionalUpdateWhenSupportedButBelowLatest() {
        val config = RemoteAppConfigDto(
            minimumSupportedVersion = "1.0.0",
            minimumSupportedVersionCode = 1,
            latestVersion = "1.3.0",
            latestVersionCode = 15,
            forceUpdate = false,
            githubLatestApkUrl = "https://github.com/siddgbu-hub/student-os/releases/download/v1.3.0/student-os-v1.3.0.apk"
        )

        val state = AppConfigManager.determineUpdateState(
            installedVersionName = "1.2.0",
            installedVersionCode = 10,
            config = config
        )

        assertTrue(state is AppUpdateState.OptionalUpdate)
        val optional = state as AppUpdateState.OptionalUpdate
        assertEquals("1.3.0", optional.latestVersionName)
        assertEquals(15, optional.latestVersionCode)
        assertEquals("https://github.com/siddgbu-hub/student-os/releases/download/v1.3.0/student-os-v1.3.0.apk", optional.apkUrl)
    }

    // =======================================================================
    // 4. Version Governance: Up To Date
    // =======================================================================

    @Test
    fun testUpToDateWhenMatchingOrHigherThanLatest() {
        val config = RemoteAppConfigDto(
            minimumSupportedVersion = "1.0.0",
            minimumSupportedVersionCode = 1,
            latestVersion = "1.0.5",
            latestVersionCode = 6,
            forceUpdate = false
        )

        val stateExact = AppConfigManager.determineUpdateState(
            installedVersionName = "1.0.5",
            installedVersionCode = 6,
            config = config
        )
        assertEquals(AppUpdateState.UpToDate, stateExact)

        val stateHigher = AppConfigManager.determineUpdateState(
            installedVersionName = "1.1.0",
            installedVersionCode = 7,
            config = config
        )
        assertEquals(AppUpdateState.UpToDate, stateHigher)
    }

    // =======================================================================
    // 5. GitHub Release Download URL Security Validation
    // =======================================================================

    @Test
    fun testGitHubDownloadUrlValidation() {
        // Valid GitHub release asset URLs
        assertTrue(isValidGitHubDownloadUrl("https://github.com/siddgbu-hub/student-os/releases/download/v1.0.5/StudentOS-v1.0.5.apk"))
        assertTrue(isValidGitHubDownloadUrl("https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345/app.apk"))
        assertTrue(isValidGitHubDownloadUrl("https://github-releases.githubusercontent.com/123456/student-os.apk"))

        // Insecure HTTP URLs rejected
        assertFalse(isValidGitHubDownloadUrl("http://github.com/siddgbu-hub/student-os/releases/download/v1.0.5/app.apk"))

        // Malicious external domains rejected
        assertFalse(isValidGitHubDownloadUrl("https://malicious-external-site.com/app.apk"))
        assertFalse(isValidGitHubDownloadUrl("https://github.com.evil.com/app.apk"))

        // Localhost / IP addresses rejected
        assertFalse(isValidGitHubDownloadUrl("http://127.0.0.1:8080/app.apk"))
        assertFalse(isValidGitHubDownloadUrl("https://192.168.1.1/app.apk"))

        // Null / Empty
        assertFalse(isValidGitHubDownloadUrl(null))
        assertFalse(isValidGitHubDownloadUrl(""))
        assertFalse(isValidGitHubDownloadUrl("   "))
    }

    // =======================================================================
    // 6. Feature Flags Evaluation
    // =======================================================================

    @Test
    fun testFeatureFlagsTypeSafeEvaluation() {
        val flagsAllEnabled = FeatureFlags()
        assertTrue(flagsAllEnabled.isEnabled(Feature.ANALYTICS))
        assertTrue(flagsAllEnabled.isEnabled(Feature.PLANNER))
        assertTrue(flagsAllEnabled.isEnabled(Feature.REVISION))
        assertTrue(flagsAllEnabled.isEnabled(Feature.STUDY))
        assertTrue(flagsAllEnabled.isEnabled(Feature.PAYMENTS))
        assertTrue(flagsAllEnabled.isEnabled(Feature.WEB_VERSION))
        assertTrue(flagsAllEnabled.isEnabled(Feature.NEW_DASHBOARD))

        val flagsCustom = FeatureFlags(
            analytics = false,
            payments = false,
            webVersion = true
        )
        assertFalse(flagsCustom.isEnabled(Feature.ANALYTICS))
        assertFalse(flagsCustom.isEnabled(Feature.PAYMENTS))
        assertTrue(flagsCustom.isEnabled(Feature.PLANNER))
        assertTrue(flagsCustom.isEnabled(Feature.REVISION))
        assertTrue(flagsCustom.isEnabled(Feature.STUDY))
        assertTrue(flagsCustom.isEnabled(Feature.WEB_VERSION))
    }

    // =======================================================================
    // 7. Safe Defaults & Canonical GitHub URLs
    // =======================================================================

    @Test
    fun testCanonicalDefaultUrls() {
        val defaultConfig = RemoteAppConfigDto()
        assertEquals(CANONICAL_WEB_URL, defaultConfig.webUrl)
        assertEquals(CANONICAL_GITHUB_RELEASE_URL, defaultConfig.githubReleaseUrl)
        assertEquals(CANONICAL_GITHUB_LATEST_RELEASE_URL, defaultConfig.githubLatestReleaseUrl)
        assertEquals(CANONICAL_GITHUB_LATEST_APK_URL, defaultConfig.githubLatestApkUrl)
        assertEquals("https://studentos.kryvlance.in", CANONICAL_WEB_URL)
        assertEquals("https://studentos.kryvlance.in/help", defaultConfig.helpUrl)
        assertNull(defaultConfig.supportEmail)
        assertFalse(defaultConfig.maintenanceMode)
        assertFalse(defaultConfig.forceUpdate)

        val customConfig = RemoteAppConfigDto(supportEmail = "support@kryvlance.in")
        assertEquals("support@kryvlance.in", customConfig.supportEmail)
    }
}
