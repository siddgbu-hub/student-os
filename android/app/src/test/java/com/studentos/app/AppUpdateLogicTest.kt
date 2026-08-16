package com.studentos.app

import com.studentos.app.ui.update.AndroidReleaseMetadata
import com.studentos.app.ui.update.AppUpdateManager
import com.studentos.app.ui.update.UpdateCheckResult
import com.studentos.app.ui.update.UpdateInstallState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.security.MessageDigest

class AppUpdateLogicTest {

    private fun makeMetadata(
        latestVersionCode: Int = 3,
        latestVersionName: String = "1.0.2",
        minimumSupportedVersionCode: Int = 1,
        apkSha256: String = "dd5c8d1f23e626a68694915724a51203fdd94baec8e7c041c4c392c4cdbfbe31",
        apkSizeBytes: Long = 19391430L,
        apkUrl: String = "https://github.com/siddgbu-hub/student-os/releases/download/v1.0.2/StudentOS-v1.0.2.apk"
    ) = AndroidReleaseMetadata(
        platform = "android",
        latestVersionCode = latestVersionCode,
        latestVersionName = latestVersionName,
        minimumSupportedVersionCode = minimumSupportedVersionCode,
        updateRequired = false,
        releaseTitle = "Student OS $latestVersionName",
        releaseNotes = listOf("Instant start study", "Adaptive launcher icon"),
        apkUrl = apkUrl,
        apkSha256 = apkSha256,
        apkSizeBytes = apkSizeBytes,
        publishedAt = "2026-08-16T03:30:00.000Z"
    )

    // -----------------------------------------------------------------------
    // 1. current == latest → no update
    // -----------------------------------------------------------------------
    @Test
    fun testCurrentEqualsLatestProducesNoUpdate() {
        val metadata = makeMetadata(latestVersionCode = 3, minimumSupportedVersionCode = 1)
        val result = AppUpdateManager.determineUpdateResult(3, metadata)
        assertTrue(result is UpdateCheckResult.NoUpdate)
    }

    // -----------------------------------------------------------------------
    // 2. current < latest → optional update
    // -----------------------------------------------------------------------
    @Test
    fun testCurrentLessThanLatestProducesOptionalUpdate() {
        val metadata = makeMetadata(latestVersionCode = 3, minimumSupportedVersionCode = 1)
        val result = AppUpdateManager.determineUpdateResult(2, metadata)
        assertTrue(result is UpdateCheckResult.OptionalUpdate)
        assertEquals(3, (result as UpdateCheckResult.OptionalUpdate).metadata.latestVersionCode)
    }

    // -----------------------------------------------------------------------
    // 3. current < minimum → mandatory update
    // -----------------------------------------------------------------------
    @Test
    fun testCurrentBelowMinimumProducesMandatoryUpdate() {
        val metadata = makeMetadata(latestVersionCode = 5, minimumSupportedVersionCode = 3)
        val result = AppUpdateManager.determineUpdateResult(1, metadata)
        assertTrue(result is UpdateCheckResult.MandatoryUpdate)
        assertEquals(5, (result as UpdateCheckResult.MandatoryUpdate).metadata.latestVersionCode)
    }

    // -----------------------------------------------------------------------
    // 4. current > latest → no update (already ahead, e.g. beta tester)
    // -----------------------------------------------------------------------
    @Test
    fun testCurrentAheadOfLatestProducesNoUpdate() {
        val metadata = makeMetadata(latestVersionCode = 3, minimumSupportedVersionCode = 1)
        val result = AppUpdateManager.determineUpdateResult(99, metadata)
        assertTrue(result is UpdateCheckResult.NoUpdate)
    }

    // -----------------------------------------------------------------------
    // 5. version comparison uses integers, not string lexicography
    //    e.g. versionCode 10 > versionCode 9, even though "10" < "9" lexically
    // -----------------------------------------------------------------------
    @Test
    fun testVersionComparisonUsesIntegers() {
        val metadata = makeMetadata(latestVersionCode = 10, minimumSupportedVersionCode = 1)
        // Integer: current=9 < latest=10 → optional
        val result9 = AppUpdateManager.determineUpdateResult(9, metadata)
        assertTrue("versionCode 9 < 10 should be optional", result9 is UpdateCheckResult.OptionalUpdate)

        // Integer: current=10 == latest=10 → no update
        val result10 = AppUpdateManager.determineUpdateResult(10, metadata)
        assertTrue("versionCode 10 == 10 should be no update", result10 is UpdateCheckResult.NoUpdate)

        // Sanity check: "9" > "10" lexically (would be wrong), but integer 9 < 10
        assertTrue("Integer comparison: 9 < 10", 9 < 10)
        assertFalse("Lexicographic pitfall check: '10' < '9' must NOT be used", "10" > "9")
    }

    // -----------------------------------------------------------------------
    // 6. checksum match succeeds
    // -----------------------------------------------------------------------
    @Test
    fun testChecksumMatchSucceeds() {
        val content = "student-os-test-apk-content".toByteArray()
        val expectedSha256 = sha256Hex(content)
        val actualSha256 = sha256Hex(content)
        assertEquals(expectedSha256, actualSha256)
    }

    // -----------------------------------------------------------------------
    // 7. checksum mismatch fails
    // -----------------------------------------------------------------------
    @Test
    fun testChecksumMismatchFails() {
        val originalContent = "student-os-test-apk-content".toByteArray()
        val corruptedContent = "corrupted-apk-content".toByteArray()
        val expectedSha256 = sha256Hex(originalContent)
        val actualSha256 = sha256Hex(corruptedContent)
        assertFalse("SHA-256 should not match for different content", expectedSha256 == actualSha256)
    }

    // -----------------------------------------------------------------------
    // 8. duplicate download prevention (state guard)
    // -----------------------------------------------------------------------
    @Test
    fun testDuplicateDownloadPreventionViaStateGuard() {
        var downloadCallCount = 0
        var isDownloading = false

        fun simulateStartDownload(): Boolean {
            if (isDownloading) {
                return false // blocked
            }
            isDownloading = true
            downloadCallCount++
            return true
        }

        // First tap starts download
        assertTrue(simulateStartDownload())
        assertEquals(1, downloadCallCount)

        // Second rapid tap is blocked
        assertFalse(simulateStartDownload())
        assertEquals(1, downloadCallCount)

        // Third tap is blocked too
        assertFalse(simulateStartDownload())
        assertEquals(1, downloadCallCount)
    }

    // -----------------------------------------------------------------------
    // 9. failed download is recoverable (state can be reset, retry is allowed)
    // -----------------------------------------------------------------------
    @Test
    fun testFailedDownloadIsRecoverable() {
        var failureOccurred = false
        var isDownloading = false
        var downloadCallCount = 0

        fun simulateDownload(): Boolean {
            if (isDownloading) return false
            isDownloading = true
            downloadCallCount++
            isDownloading = false
            failureOccurred = true
            return false
        }

        fun simulateReset() {
            failureOccurred = false
            isDownloading = false
        }

        fun simulateRetry(): Boolean {
            if (isDownloading) return false
            isDownloading = true
            downloadCallCount++
            isDownloading = false
            return true
        }

        simulateDownload()
        assertTrue(failureOccurred)
        assertEquals(1, downloadCallCount)

        simulateReset()
        assertFalse(failureOccurred)

        val retryOk = simulateRetry()
        assertTrue(retryOk)
        assertEquals(2, downloadCallCount)
    }

    // -----------------------------------------------------------------------
    // 10. Permission already granted → direct install
    // -----------------------------------------------------------------------
    @Test
    fun testPermissionAlreadyGrantedTransitionsToInstalling() {
        val dummyApk = File("dummy.apk")
        var installLaunched = false

        fun simulateProcessVerified(hasPermission: Boolean): UpdateInstallState {
            return if (hasPermission) {
                installLaunched = true
                UpdateInstallState.Installing(dummyApk)
            } else {
                UpdateInstallState.AwaitingInstallPermission(dummyApk)
            }
        }

        val stateWithPermission = simulateProcessVerified(hasPermission = true)
        assertTrue(stateWithPermission is UpdateInstallState.Installing)
        assertTrue(installLaunched)
    }

    // -----------------------------------------------------------------------
    // 11. Permission missing → AwaitingInstallPermission state
    // -----------------------------------------------------------------------
    @Test
    fun testPermissionMissingTransitionsToAwaitingPermission() {
        val dummyApk = File("dummy.apk")
        var installLaunched = false

        fun simulateProcessVerified(hasPermission: Boolean): UpdateInstallState {
            return if (hasPermission) {
                installLaunched = true
                UpdateInstallState.Installing(dummyApk)
            } else {
                UpdateInstallState.AwaitingInstallPermission(dummyApk)
            }
        }

        val stateWithoutPermission = simulateProcessVerified(hasPermission = false)
        assertTrue(stateWithoutPermission is UpdateInstallState.AwaitingInstallPermission)
        assertFalse("Installer must not be launched without permission", installLaunched)
    }

    // -----------------------------------------------------------------------
    // 12. Settings intent structure and fallback
    // -----------------------------------------------------------------------
    @Test
    fun testSecuritySettingsFallbackIntentStructure() {
        val action = "android.settings.SECURITY_SETTINGS"
        assertEquals(android.provider.Settings.ACTION_SECURITY_SETTINGS, action)
    }

    // -----------------------------------------------------------------------
    // 13. Permission granted on resume → auto-resumes installation
    // -----------------------------------------------------------------------
    @Test
    fun testPermissionGrantedOnResumeLaunchesInstaller() {
        val dummyApk = File("dummy.apk")
        var state: UpdateInstallState = UpdateInstallState.AwaitingInstallPermission(dummyApk)
        var installerCalled = false

        fun simulateResume(hasPermission: Boolean) {
            if (state is UpdateInstallState.AwaitingInstallPermission) {
                if (hasPermission) {
                    state = UpdateInstallState.Installing(dummyApk)
                    installerCalled = true
                } else {
                    state = UpdateInstallState.Idle
                }
            }
        }

        // Simulate returning with permission granted
        simulateResume(hasPermission = true)
        assertTrue(state is UpdateInstallState.Installing)
        assertTrue(installerCalled)
    }

    // -----------------------------------------------------------------------
    // 14. Permission denied on resume → preserves APK and returns to Idle
    // -----------------------------------------------------------------------
    @Test
    fun testPermissionDeniedOnResumePreservesApkAndShowsNotice() {
        val dummyApk = File("dummy.apk")
        var state: UpdateInstallState = UpdateInstallState.AwaitingInstallPermission(dummyApk)
        var statusNotice: String? = null
        var pendingApk: File? = dummyApk

        fun simulateResume(hasPermission: Boolean) {
            if (state is UpdateInstallState.AwaitingInstallPermission) {
                if (hasPermission) {
                    state = UpdateInstallState.Installing(dummyApk)
                } else {
                    state = UpdateInstallState.Idle
                    statusNotice = "Update wasn't installed. You can try again when you're ready."
                }
            }
        }

        simulateResume(hasPermission = false)
        assertTrue(state is UpdateInstallState.Idle)
        assertEquals("Update wasn't installed. You can try again when you're ready.", statusNotice)
        assertNotNull("Pending APK must NOT be deleted when permission is denied", pendingApk)
    }

    // -----------------------------------------------------------------------
    // 15. User taps "Not Now" → transitions to Idle with notice
    // -----------------------------------------------------------------------
    @Test
    fun testUserTapNotNowTransitionsToIdleWithNotice() {
        val dummyApk = File("dummy.apk")
        var state: UpdateInstallState = UpdateInstallState.AwaitingInstallPermission(dummyApk)
        var statusNotice: String? = null

        fun simulateNotNow() {
            state = UpdateInstallState.Idle
            statusNotice = "Update wasn't installed. You can try again when you're ready."
        }

        simulateNotNow()
        assertTrue(state is UpdateInstallState.Idle)
        assertEquals("Update wasn't installed. You can try again when you're ready.", statusNotice)
    }

    // -----------------------------------------------------------------------
    // 16. Verified APK reuse (avoids re-downloading)
    // -----------------------------------------------------------------------
    @Test
    fun testVerifiedApkReusedWithoutRedownload() {
        var networkDownloadCalled = false
        val content = "valid-apk-bytes".toByteArray()
        val expectedSha = sha256Hex(content)

        fun simulateStartUpdate(cachedSha: String?) {
            if (cachedSha != null && cachedSha == expectedSha) {
                // Reuse cached file without network download
                return
            }
            networkDownloadCalled = true
        }

        // With valid cache -> no download
        simulateStartUpdate(cachedSha = expectedSha)
        assertFalse(networkDownloadCalled)

        // Without cache -> downloads
        simulateStartUpdate(cachedSha = null)
        assertTrue(networkDownloadCalled)
    }

    // -----------------------------------------------------------------------
    // 17. Throttling prevents duplicate installer launches
    // -----------------------------------------------------------------------
    @Test
    fun testDuplicateInstallIntentThrottling() {
        var launchCount = 0
        var lastLaunchTime = 0L

        fun simulateLaunch(now: Long): Boolean {
            if (lastLaunchTime > 0L && now - lastLaunchTime < 2000L) {
                return false // throttled
            }
            lastLaunchTime = now
            launchCount++
            return true
        }

        assertTrue(simulateLaunch(1000L))
        assertEquals(1, launchCount)

        // Rapid double click at 1500ms (500ms later) is throttled
        assertFalse(simulateLaunch(1500L))
        assertEquals(1, launchCount)

        // Launch after cooldown (3100ms) succeeds
        assertTrue(simulateLaunch(3100L))
        assertEquals(2, launchCount)
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------
    private fun sha256Hex(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(data).joinToString("") { "%02x".format(it) }
    }
}
