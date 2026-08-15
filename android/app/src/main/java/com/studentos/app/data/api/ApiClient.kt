package com.studentos.app.data.api

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.studentos.app.BuildConfig
import com.studentos.app.data.local.SessionManager
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit

class ApiClient(private val sessionManager: SessionManager) {

    @OptIn(ExperimentalSerializationApi::class)
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
        encodeDefaults = true
        explicitNulls = false
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = runBlocking { sessionManager.getToken() }
        val deviceId = runBlocking { sessionManager.getOrCreateDeviceId() }

        val requestBuilder = original.newBuilder()
            .header("x-device-id", deviceId)

        if (!token.isNullOrEmpty()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        chain.proceed(requestBuilder.build())
    }

    private val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
        }
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()
    }

    private val retrofit: Retrofit by lazy {
        val contentType = "application/json".toMediaType()
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL + "/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    val authApi: AuthApi by lazy { retrofit.create(AuthApi::class.java) }
    val accountApi: AccountApi by lazy { retrofit.create(AccountApi::class.java) }
    val studyApi: StudyApi by lazy { retrofit.create(StudyApi::class.java) }
    val plannerApi: PlannerApi by lazy { retrofit.create(PlannerApi::class.java) }
    val revisionApi: RevisionApi by lazy { retrofit.create(RevisionApi::class.java) }
    val analyticsApi: AnalyticsApi by lazy { retrofit.create(AnalyticsApi::class.java) }
    val goalApi: GoalApi by lazy { retrofit.create(GoalApi::class.java) }
    val entitlementApi: EntitlementApi by lazy { retrofit.create(EntitlementApi::class.java) }
}
