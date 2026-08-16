package com.studentos.app.ui.update

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.FileProvider
import com.studentos.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.security.MessageDigest

private const val TAG = "AppUpdateManager"
private const val APK_SUBDIR = "apk_updates"

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

@Serializable
data class AndroidReleaseMetadata(
    val platform: String = "android",
    val latestVersionCode: Int,
    val latestVersionName: String,
    val minimumSupportedVersionCode: Int,
    val updateRequired: Boolean,
    val releaseTitle: String,
    val releaseNotes: List<String>,
    val apkUrl: String,
    val apkSha256: String,
    val apkSizeBytes: Long,
    val publishedAt: String
)

@Serializable
data class VersionApiResponse(
    val success: Boolean,
    val data: AndroidReleaseMetadata
)

// ---------------------------------------------------------------------------
// Download state
// ---------------------------------------------------------------------------

sealed class DownloadState {
    object Idle : DownloadState()
    data class Progress(val percent: Int) : DownloadState()
    data class Success(val apkFile: File) : DownloadState()
    data class Failed(val message: String) : DownloadState()
}

// ---------------------------------------------------------------------------
// Update check result
// ---------------------------------------------------------------------------

sealed class UpdateCheckResult {
    object NoUpdate : UpdateCheckResult()
    data class OptionalUpdate(val metadata: AndroidReleaseMetadata) : UpdateCheckResult()
    data class MandatoryUpdate(val metadata: AndroidReleaseMetadata) : UpdateCheckResult()
}

// ---------------------------------------------------------------------------
// AppUpdateManager singleton
// ---------------------------------------------------------------------------

object AppUpdateManager {

    private val _downloadState = MutableStateFlow<DownloadState>(DownloadState.Idle)
    val downloadState: StateFlow<DownloadState> = _downloadState.asStateFlow()

    private val _updateCheckResult = MutableStateFlow<UpdateCheckResult>(UpdateCheckResult.NoUpdate)
    val updateCheckResult: StateFlow<UpdateCheckResult> = _updateCheckResult.asStateFlow()

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    // Reuse a single OkHttp client for all update network calls
    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder().build()
    }

    // -----------------------------------------------------------------------
    // 1. Version check — call once on app launch (lifecycle-aware callers
    //    should launch from LaunchedEffect(Unit) to avoid repeat calls)
    // -----------------------------------------------------------------------

    suspend fun checkForUpdate() {
        val currentVersionCode = BuildConfig.VERSION_CODE
        val url = "${BuildConfig.API_BASE_URL}/api/v1/app/version/android"

        Log.d(TAG, "[Update:CHECK] currentVersionCode=$currentVersionCode endpoint=$url")

        val metadata = try {
            withContext(Dispatchers.IO) {
                val request = Request.Builder().url(url).get().build()
                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        Log.d(TAG, "[Update:CHECK] endpoint returned ${response.code}, skipping")
                        return@withContext null
                    }
                    val body = response.body?.string() ?: return@withContext null
                    val apiResponse = json.decodeFromString<VersionApiResponse>(body)
                    apiResponse.data
                }
            }
        } catch (e: Exception) {
            // Silent fail — never block app startup
            Log.d(TAG, "[Update:CHECK] failed silently: ${e.message}")
            return
        } ?: return

        val result = determineUpdateResult(currentVersionCode, metadata)
        _updateCheckResult.value = result

        Log.d(TAG, "[Update:CHECK] result=${result.javaClass.simpleName} " +
                "latest=${metadata.latestVersionCode} " +
                "minimum=${metadata.minimumSupportedVersionCode} " +
                "current=$currentVersionCode")
    }

    // -----------------------------------------------------------------------
    // 2. Version comparison logic (integer comparison only, never lexicographic)
    // -----------------------------------------------------------------------

    fun determineUpdateResult(
        currentVersionCode: Int,
        metadata: AndroidReleaseMetadata
    ): UpdateCheckResult {
        return when {
            currentVersionCode < metadata.minimumSupportedVersionCode ->
                UpdateCheckResult.MandatoryUpdate(metadata)
            currentVersionCode < metadata.latestVersionCode ->
                UpdateCheckResult.OptionalUpdate(metadata)
            else ->
                UpdateCheckResult.NoUpdate
        }
    }

    // -----------------------------------------------------------------------
    // 3. Download APK with progress reporting
    //    Prevents duplicate parallel downloads by checking DownloadState.
    // -----------------------------------------------------------------------

    suspend fun downloadApk(context: Context, metadata: AndroidReleaseMetadata) {
        // Prevent duplicate downloads
        if (_downloadState.value is DownloadState.Progress) {
            Log.d(TAG, "[Update:DOWNLOAD] already in progress, ignoring duplicate request")
            return
        }

        _downloadState.value = DownloadState.Progress(0)
        Log.d(TAG, "[Update:DOWNLOAD] starting url=${metadata.apkUrl}")

        val apkFile: File
        try {
            apkFile = withContext(Dispatchers.IO) {
                val updateDir = File(context.filesDir, APK_SUBDIR).also { it.mkdirs() }
                val file = File(updateDir, "StudentOS-v${metadata.latestVersionName}.apk")

                val request = Request.Builder()
                    .url(metadata.apkUrl)   // server-supplied URL, always HTTPS
                    .get()
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        throw Exception("Server responded ${response.code}")
                    }
                    val body = response.body ?: throw Exception("Empty response body")
                    val totalBytes = body.contentLength().takeIf { it > 0 } ?: metadata.apkSizeBytes

                    body.byteStream().use { input ->
                        file.outputStream().use { output ->
                            val buffer = ByteArray(8192)
                            var bytesWritten = 0L
                            var lastReportedPercent = -1

                            var read: Int
                            while (input.read(buffer).also { read = it } != -1) {
                                output.write(buffer, 0, read)
                                bytesWritten += read
                                val percent = if (totalBytes > 0) {
                                    ((bytesWritten * 100) / totalBytes).toInt().coerceIn(0, 100)
                                } else 0

                                if (percent != lastReportedPercent) {
                                    _downloadState.value = DownloadState.Progress(percent)
                                    lastReportedPercent = percent
                                }
                            }
                        }
                    }
                }

                file
            }
        } catch (e: Exception) {
            Log.e(TAG, "[Update:DOWNLOAD_FAILED] ${e.message}")
            _downloadState.value = DownloadState.Failed("Download failed: ${e.message ?: "Unknown error"}")
            return
        }

        // -----------------------------------------------------------------------
        // 4. SHA-256 integrity verification — never install on mismatch
        // -----------------------------------------------------------------------
        val downloadedSha256 = withContext(Dispatchers.IO) { sha256Hex(apkFile) }
        val expectedSha256 = metadata.apkSha256.lowercase()

        Log.d(TAG, "[Update:SHA256] expected=$expectedSha256 actual=$downloadedSha256")

        if (downloadedSha256 != expectedSha256) {
            Log.e(TAG, "[Update:SHA256_MISMATCH] deleting corrupted file")
            apkFile.delete()
            _downloadState.value = DownloadState.Failed(
                "Update verification failed. The downloaded file appears corrupted. Please try again."
            )
            return
        }

        Log.d(TAG, "[Update:SHA256_OK] file verified, proceeding to install")
        _downloadState.value = DownloadState.Success(apkFile)
    }

    // -----------------------------------------------------------------------
    // 5. Launch Android Package Installer via FileProvider (content:// URI)
    // -----------------------------------------------------------------------

    fun launchInstaller(context: Context, apkFile: File) {
        val authority = "${context.packageName}.fileprovider"
        val contentUri = FileProvider.getUriForFile(context, authority, apkFile)

        Log.d(TAG, "[Update:INSTALL] launching Android package installer")

        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(contentUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        context.startActivity(installIntent)

        // Reset state after handing off to system installer
        _downloadState.value = DownloadState.Idle
    }

    // -----------------------------------------------------------------------
    // 6. Allow retry after failure
    // -----------------------------------------------------------------------

    fun resetDownloadState() {
        _downloadState.value = DownloadState.Idle
    }

    fun resetUpdateState() {
        _updateCheckResult.value = UpdateCheckResult.NoUpdate
        _downloadState.value = DownloadState.Idle
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private fun sha256Hex(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8192)
            var read: Int
            while (input.read(buffer).also { read = it } != -1) {
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}
