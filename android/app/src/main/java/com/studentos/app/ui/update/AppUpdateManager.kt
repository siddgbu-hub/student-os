package com.studentos.app.ui.update

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
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
// State machines
// ---------------------------------------------------------------------------

sealed class UpdateInstallState {
    object Idle : UpdateInstallState()
    data class Downloading(val percent: Int) : UpdateInstallState()
    object Verifying : UpdateInstallState()
    data class AwaitingInstallPermission(val apkFile: File) : UpdateInstallState()
    data class Installing(val apkFile: File) : UpdateInstallState()
    data class Failed(val message: String) : UpdateInstallState()
    object Completed : UpdateInstallState()
}

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

    private val _installState = MutableStateFlow<UpdateInstallState>(UpdateInstallState.Idle)
    val installState: StateFlow<UpdateInstallState> = _installState.asStateFlow()

    private val _downloadState = MutableStateFlow<DownloadState>(DownloadState.Idle)
    val downloadState: StateFlow<DownloadState> = _downloadState.asStateFlow()

    private val _updateCheckResult = MutableStateFlow<UpdateCheckResult>(UpdateCheckResult.NoUpdate)
    val updateCheckResult: StateFlow<UpdateCheckResult> = _updateCheckResult.asStateFlow()

    private val _statusNotice = MutableStateFlow<String?>(null)
    val statusNotice: StateFlow<String?> = _statusNotice.asStateFlow()

    var pendingApkFile: File? = null
        private set

    private var lastInstallLaunchTimestamp: Long = 0L

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    // Reuse a single OkHttp client for all update network calls
    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder().build()
    }

    // -----------------------------------------------------------------------
    // 1. Version check — call once on app launch
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
    // 3. Permission checks & Settings Intents
    // -----------------------------------------------------------------------

    fun canRequestPackageInstalls(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    fun buildUnknownAppSourcesIntent(context: Context): Intent {
        return Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    fun buildSecuritySettingsFallbackIntent(): Intent {
        return Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    fun openInstallPermissionSettings(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appSettingsIntent = buildUnknownAppSourcesIntent(context)
            try {
                context.startActivity(appSettingsIntent)
                return true
            } catch (e: ActivityNotFoundException) {
                Log.w(TAG, "ACTION_MANAGE_UNKNOWN_APP_SOURCES not found, trying security settings fallback", e)
                val fallbackIntent = buildSecuritySettingsFallbackIntent()
                try {
                    context.startActivity(fallbackIntent)
                    return true
                } catch (e2: Exception) {
                    Log.e(TAG, "Failed to open fallback security settings", e2)
                    val errorMsg = "Unable to open Android Settings. Please allow 'Install unknown apps' for Student OS in your device Settings."
                    _installState.value = UpdateInstallState.Failed(errorMsg)
                    _downloadState.value = DownloadState.Failed(errorMsg)
                    return false
                }
            }
        }
        return false
    }

    // -----------------------------------------------------------------------
    // 4. Start / Resume update flow (Reuses verified local APK if present)
    // -----------------------------------------------------------------------

    suspend fun startOrResumeUpdate(context: Context, metadata: AndroidReleaseMetadata) {
        val current = _installState.value
        if (current is UpdateInstallState.Downloading ||
            current is UpdateInstallState.Verifying ||
            current is UpdateInstallState.Installing
        ) {
            Log.d(TAG, "[Update:START] already in active state $current, ignoring duplicate request")
            return
        }

        _statusNotice.value = null

        // Check if verified APK already exists locally on disk
        val updateDir = File(context.filesDir, APK_SUBDIR).also { it.mkdirs() }
        val localFile = File(updateDir, "StudentOS-v${metadata.latestVersionName}.apk")

        if (localFile.exists() && localFile.length() > 0) {
            val existingSha256 = withContext(Dispatchers.IO) { sha256Hex(localFile) }
            if (existingSha256.equals(metadata.apkSha256, ignoreCase = true)) {
                Log.d(TAG, "[Update:REUSE] verified local APK exists, reusing without redownload")
                pendingApkFile = localFile
                processVerifiedApk(context, localFile)
                return
            } else {
                Log.d(TAG, "[Update:REUSE] local file checksum mismatch, re-downloading")
                localFile.delete()
            }
        }

        downloadApk(context, metadata)
    }

    // -----------------------------------------------------------------------
    // 5. Download APK with progress reporting & SHA-256 verification
    // -----------------------------------------------------------------------

    suspend fun downloadApk(context: Context, metadata: AndroidReleaseMetadata) {
        if (_installState.value is UpdateInstallState.Downloading) {
            Log.d(TAG, "[Update:DOWNLOAD] already in progress, ignoring duplicate request")
            return
        }

        _installState.value = UpdateInstallState.Downloading(0)
        _downloadState.value = DownloadState.Progress(0)
        Log.d(TAG, "[Update:DOWNLOAD] starting url=${metadata.apkUrl}")

        val apkFile: File
        try {
            apkFile = withContext(Dispatchers.IO) {
                val updateDir = File(context.filesDir, APK_SUBDIR).also { it.mkdirs() }
                val file = File(updateDir, "StudentOS-v${metadata.latestVersionName}.apk")

                val request = Request.Builder()
                    .url(metadata.apkUrl)
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
                                    _installState.value = UpdateInstallState.Downloading(percent)
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
            val errorMsg = "Download failed: ${e.message ?: "Unknown error"}"
            _installState.value = UpdateInstallState.Failed(errorMsg)
            _downloadState.value = DownloadState.Failed(errorMsg)
            return
        }

        // SHA-256 integrity verification
        _installState.value = UpdateInstallState.Verifying
        val downloadedSha256 = withContext(Dispatchers.IO) { sha256Hex(apkFile) }
        val expectedSha256 = metadata.apkSha256.lowercase()

        Log.d(TAG, "[Update:SHA256] expected=$expectedSha256 actual=$downloadedSha256")

        if (downloadedSha256 != expectedSha256) {
            Log.e(TAG, "[Update:SHA256_MISMATCH] deleting corrupted file")
            apkFile.delete()
            val errorMsg = "Update verification failed. The downloaded file appears corrupted. Please try again."
            _installState.value = UpdateInstallState.Failed(errorMsg)
            _downloadState.value = DownloadState.Failed(errorMsg)
            return
        }

        Log.d(TAG, "[Update:SHA256_OK] file verified, proceeding")
        pendingApkFile = apkFile
        processVerifiedApk(context, apkFile)
    }

    suspend fun startDirectApkDownload(
        context: Context,
        versionName: String,
        apkUrl: String,
        expectedSha256: String? = null
    ) {
        if (_installState.value is UpdateInstallState.Downloading) {
            Log.d(TAG, "[Update:DOWNLOAD] already in progress, ignoring duplicate request")
            return
        }

        if (!com.studentos.app.config.isValidGitHubDownloadUrl(apkUrl)) {
            Log.e(TAG, "[Update:URL_INVALID] Insecure or non-GitHub URL: $apkUrl")
            val errorMsg = "Update blocked: APK download URL must be a secure GitHub Release URL."
            _installState.value = UpdateInstallState.Failed(errorMsg)
            _downloadState.value = DownloadState.Failed(errorMsg)
            return
        }

        _installState.value = UpdateInstallState.Downloading(0)
        _downloadState.value = DownloadState.Progress(0)
        Log.d(TAG, "[Update:DOWNLOAD] starting url=$apkUrl")

        val apkFile: File
        try {
            apkFile = withContext(Dispatchers.IO) {
                val updateDir = File(context.filesDir, APK_SUBDIR).also { it.mkdirs() }
                val file = File(updateDir, "StudentOS-v${versionName}.apk")

                val request = Request.Builder()
                    .url(apkUrl)
                    .get()
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        throw Exception("Server responded ${response.code}")
                    }
                    val body = response.body ?: throw Exception("Empty response body")
                    val totalBytes = body.contentLength()

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
                                    _installState.value = UpdateInstallState.Downloading(percent)
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
            val errorMsg = "Download failed: ${e.message ?: "Unknown error"}"
            _installState.value = UpdateInstallState.Failed(errorMsg)
            _downloadState.value = DownloadState.Failed(errorMsg)
            return
        }

        // SHA-256 integrity verification if provided
        if (!expectedSha256.isNullOrBlank()) {
            _installState.value = UpdateInstallState.Verifying
            val downloadedSha256 = withContext(Dispatchers.IO) { sha256Hex(apkFile) }
            val targetSha256 = expectedSha256.trim().lowercase()

            Log.d(TAG, "[Update:SHA256] expected=$targetSha256 actual=$downloadedSha256")

            if (downloadedSha256 != targetSha256) {
                Log.e(TAG, "[Update:SHA256_MISMATCH] deleting corrupted file")
                apkFile.delete()
                val errorMsg = "Update verification failed. The downloaded APK checksum did not match the release checksum."
                _installState.value = UpdateInstallState.Failed(errorMsg)
                _downloadState.value = DownloadState.Failed(errorMsg)
                return
            }
        }

        Log.d(TAG, "[Update:VERIFIED] file verified, proceeding to installation")
        pendingApkFile = apkFile
        processVerifiedApk(context, apkFile)
    }

    // -----------------------------------------------------------------------
    // 6. Process verified APK & evaluate install permission
    // -----------------------------------------------------------------------

    fun processVerifiedApk(context: Context, apkFile: File) {
        if (canRequestPackageInstalls(context)) {
            Log.d(TAG, "[Update:INSTALL] install permission granted, launching installer")
            _installState.value = UpdateInstallState.Installing(apkFile)
            _downloadState.value = DownloadState.Success(apkFile)
            launchInstaller(context, apkFile)
        } else {
            Log.d(TAG, "[Update:PERMISSION_REQUIRED] awaiting user install permission")
            _installState.value = UpdateInstallState.AwaitingInstallPermission(apkFile)
            _downloadState.value = DownloadState.Success(apkFile)
        }
    }

    // -----------------------------------------------------------------------
    // 7. Lifecycle resume & user action handlers
    // -----------------------------------------------------------------------

    fun onResume(context: Context) {
        val pending = pendingApkFile ?: return
        if (!pending.exists()) {
            pendingApkFile = null
            return
        }

        val currentState = _installState.value
        if (currentState is UpdateInstallState.AwaitingInstallPermission) {
            if (canRequestPackageInstalls(context)) {
                Log.d(TAG, "[Update:RESUME] permission granted in settings, auto-launching installer")
                _statusNotice.value = null
                _installState.value = UpdateInstallState.Installing(pending)
                _downloadState.value = DownloadState.Success(pending)
                launchInstaller(context, pending)
            } else {
                Log.d(TAG, "[Update:RESUME] permission still not granted, preserving APK for retry")
                _installState.value = UpdateInstallState.Idle
                _downloadState.value = DownloadState.Idle
                _statusNotice.value = "Update wasn't installed. You can try again when you're ready."
            }
        }
    }

    fun onPermissionDeniedByUser() {
        Log.d(TAG, "[Update:PERMISSION_DENIED] user tapped Not Now")
        _installState.value = UpdateInstallState.Idle
        _downloadState.value = DownloadState.Idle
        _statusNotice.value = "Update wasn't installed. You can try again when you're ready."
    }

    // -----------------------------------------------------------------------
    // 8. Launch Android Package Installer via FileProvider
    // -----------------------------------------------------------------------

    fun launchInstaller(context: Context, apkFile: File) {
        val now = System.currentTimeMillis()
        if (lastInstallLaunchTimestamp > 0L && now - lastInstallLaunchTimestamp < 2000L) {
            Log.d(TAG, "[Update:INSTALL] throttled duplicate install launch")
            return
        }
        lastInstallLaunchTimestamp = now

        try {
            val authority = "${context.packageName}.fileprovider"
            val contentUri = FileProvider.getUriForFile(context, authority, apkFile)

            Log.d(TAG, "[Update:INSTALL] launching Android package installer for $contentUri")

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(installIntent)
            _installState.value = UpdateInstallState.Completed
            _downloadState.value = DownloadState.Idle
        } catch (e: Exception) {
            Log.e(TAG, "[Update:INSTALL_FAILED] ${e.message}", e)
            val errorMsg = "Unable to launch installer: ${e.message ?: "Unknown error"}"
            _installState.value = UpdateInstallState.Failed(errorMsg)
            _downloadState.value = DownloadState.Failed(errorMsg)
        }
    }

    // -----------------------------------------------------------------------
    // 9. State reset helpers
    // -----------------------------------------------------------------------

    fun resetDownloadState() {
        _installState.value = UpdateInstallState.Idle
        _downloadState.value = DownloadState.Idle
        _statusNotice.value = null
    }

    fun resetUpdateState() {
        _updateCheckResult.value = UpdateCheckResult.NoUpdate
        _installState.value = UpdateInstallState.Idle
        _downloadState.value = DownloadState.Idle
        _statusNotice.value = null
        pendingApkFile = null
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    fun sha256Hex(file: File): String {
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
