package com.studentos.app.config

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.studentos.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

private const val TAG = "AppConfigRepository"
private const val PREFS_NAME = "studentos_app_config"
private const val KEY_CACHED_CONFIG = "cached_remote_app_config"
private const val KEY_LAST_FETCH_TIME = "cached_config_timestamp"

class AppConfigRepository(private val context: Context) {

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(3500, TimeUnit.MILLISECONDS)
            .readTimeout(3500, TimeUnit.MILLISECONDS)
            .writeTimeout(3500, TimeUnit.MILLISECONDS)
            .build()
    }

    /**
     * Reads last known configuration from persistent storage.
     * Returns safe defaults if no prior cache exists.
     */
    fun getCachedConfig(): RemoteAppConfigDto {
        val cachedJson = prefs.getString(KEY_CACHED_CONFIG, null) ?: return RemoteAppConfigDto()
        return try {
            json.decodeFromString<RemoteAppConfigDto>(cachedJson)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to decode cached config, using safe defaults: ${e.message}")
            RemoteAppConfigDto()
        }
    }

    fun getLastFetchTimestamp(): Long {
        return prefs.getLong(KEY_LAST_FETCH_TIME, 0L)
    }

    /**
     * Fetches fresh configuration from backend.
     * Guaranteed non-blocking and fail-safe: always resolves without crashing.
     */
    suspend fun fetchRemoteConfig(): Pair<RemoteAppConfigDto, Boolean> {
        val url = "${BuildConfig.API_BASE_URL}/api/v1/app/config"

        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url(url)
                    .get()
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        Log.d(TAG, "Config endpoint returned HTTP ${response.code}, falling back to cache")
                        return@withContext Pair(getCachedConfig(), true)
                    }

                    val body = response.body?.string()
                    if (body.isNullOrBlank()) {
                        return@withContext Pair(getCachedConfig(), true)
                    }

                    val apiResponse = json.decodeFromString<RemoteAppConfigResponse>(body)
                    val remoteData = apiResponse.data ?: return@withContext Pair(getCachedConfig(), true)

                    // Persist to SharedPreferences cache
                    saveConfigToCache(remoteData)

                    Log.d(TAG, "Successfully fetched and cached remote app config (v${remoteData.latestVersion})")
                    Pair(remoteData, false)
                }
            } catch (e: Exception) {
                Log.d(TAG, "Failed to fetch remote config (${e.message}), using cached/default config")
                Pair(getCachedConfig(), true)
            }
        }
    }

    private fun saveConfigToCache(config: RemoteAppConfigDto) {
        try {
            val serialized = json.encodeToString(RemoteAppConfigDto.serializer(), config)
            prefs.edit()
                .putString(KEY_CACHED_CONFIG, serialized)
                .putLong(KEY_LAST_FETCH_TIME, System.currentTimeMillis())
                .apply()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to persist remote config cache: ${e.message}")
        }
    }
}
