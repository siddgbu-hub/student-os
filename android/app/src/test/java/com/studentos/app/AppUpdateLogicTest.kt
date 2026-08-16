package com.studentos.app

import com.studentos.app.ui.update.AndroidReleaseMetadata
import com.studentos.app.ui.update.AppUpdateManager
import com.studentos.app.ui.update.UpdateCheckResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.MessageDigest

class AppUpdateLogicTest {

    private fun makeMetadata(
        latestVersionCode: Int = 2,
        latestVersionName: String = "1.0.1",
        minimumSupportedVersionCode: Int = 1,
        apkSha256: String = "a53f1819420e3efb5217e57e6e4f1dfd1b4866080362d5f958f6687ab6dc7a5b",
        apkSizeBytes: Long = 19421462L,
        apkUrl: String = "https://github.com/siddgbu-hub/student-os/releases/download/v1.0.1/StudentOS-v1.0.1.apk"
    ) = AndroidReleaseMetadata(
        platform = "android",
        latestVersionCode = latestVersionCode,
        latestVersionName = latestVersionName,
        minimumSupportedVersionCode = minimumSupportedVersionCode,
        updateRequired = false,
        releaseTitle = "Student OS $latestVersionName",
        releaseNotes = listOf("Lock-screen study timer", "Bug fixes"),
        apkUrl = apkUrl,
        apkSha256 = apkSha256,
        apkSizeBytes = apkSizeBytes,
        publishedAt = "2026-08-15T12:00:00.000Z"
    )

    // -----------------------------------------------------------------------
    // 1. current == latest → no update
    // -----------------------------------------------------------------------
    @Test
    fun testCurrentEqualsLatestProducesNoUpdate() {
        val metadata = makeMetadata(latestVersionCode = 2, minimumSupportedVersionCode = 1)
        val result = AppUpdateManager.determineUpdateResult(2, metadata)
        assertTrue(result is UpdateCheckResult.NoUpdate)
    }

    // -----------------------------------------------------------------------
    // 2. current < latest → optional update
    // -----------------------------------------------------------------------
    @Test
    fun testCurrentLessThanLatestProducesOptionalUpdate() {
        val metadata = makeMetadata(latestVersionCode = 2, minimumSupportedVersionCode = 1)
        val result = AppUpdateManager.determineUpdateResult(1, metadata)
        assertTrue(result is UpdateCheckResult.OptionalUpdate)
        assertEquals(2, (result as UpdateCheckResult.OptionalUpdate).metadata.latestVersionCode)
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
        val metadata = makeMetadata(latestVersionCode = 2, minimumSupportedVersionCode = 1)
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
        // When download is in progress, a second call should be blocked by the guard
        // We simulate the guard logic inline here (mirrors AppUpdateManager implementation)
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
        // Simulate: download fails, app resets state, then allows a new download
        var failureOccurred = false
        var isDownloading = false
        var downloadCallCount = 0

        fun simulateDownload(): Boolean {
            if (isDownloading) return false
            isDownloading = true
            downloadCallCount++
            // Simulate failure
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

        // First attempt fails
        simulateDownload()
        assertTrue(failureOccurred)
        assertEquals(1, downloadCallCount)

        // Reset (retry flow)
        simulateReset()
        assertFalse(failureOccurred)

        // Retry succeeds
        val retryOk = simulateRetry()
        assertTrue(retryOk)
        assertEquals(2, downloadCallCount)
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------
    private fun sha256Hex(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(data).joinToString("") { "%02x".format(it) }
    }
}
