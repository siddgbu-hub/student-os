package com.studentos.app.data.repository

import android.content.Context
import com.studentos.app.data.api.ApiClient
import com.studentos.app.data.local.SessionManager
import com.studentos.app.data.model.AccountOverviewDto
import com.studentos.app.data.model.AnalyticsDashboardDto
import com.studentos.app.data.model.AuthResponseDto
import com.studentos.app.data.model.ChapterDto
import com.studentos.app.data.model.CreateChapterInputDto
import com.studentos.app.data.model.DeviceSessionDto
import com.studentos.app.data.model.CreateGoalInputDto
import com.studentos.app.data.model.CreatePlannerTaskInputDto
import com.studentos.app.data.model.CreateRevisionItemInputDto
import com.studentos.app.data.model.CreateSubjectInputDto
import com.studentos.app.data.model.DailyPlanSummaryDto
import com.studentos.app.data.model.DailyRevisionSummaryDto
import com.studentos.app.data.model.EndRevisionSessionInputDto
import com.studentos.app.data.model.EndRevisionSessionResultDto
import com.studentos.app.data.model.EntitlementDto
import com.studentos.app.data.model.GoalProgressDto
import com.studentos.app.data.model.GoogleAuthRequestDto
import com.studentos.app.data.model.MonthlyPlanSummaryDto
import com.studentos.app.data.model.PaymentConfigDto
import com.studentos.app.data.model.PlanDto
import com.studentos.app.data.model.PlannerTaskDto
import com.studentos.app.data.model.ReschedulePlannerTaskInputDto
import com.studentos.app.data.model.RescheduleRevisionItemInputDto
import com.studentos.app.data.model.RevisionItemDto
import com.studentos.app.data.model.RevisionSessionDto
import com.studentos.app.data.model.SendOtpRequestDto
import com.studentos.app.data.model.StartRevisionSessionInputDto
import com.studentos.app.data.model.StartStudySessionInputDto
import com.studentos.app.data.model.StopStudySessionInputDto
import com.studentos.app.data.model.UpdateRevisionItemInputDto
import com.studentos.app.data.model.StudySessionDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.data.model.TodaySessionsSummaryDto
import com.studentos.app.data.model.UpdateChapterInputDto
import com.studentos.app.data.model.UpdateGoalInputDto
import com.studentos.app.data.model.UpdatePlannerTaskInputDto
import com.studentos.app.data.model.UpdatePlannerTaskStatusInputDto
import com.studentos.app.data.model.UpdatePreferencesInputDto
import com.studentos.app.data.model.UpdateProfileInputDto
import com.studentos.app.data.model.UpdateSubjectInputDto
import com.studentos.app.data.model.UserPreferencesDto
import com.studentos.app.data.model.UserProfileDto
import com.studentos.app.data.model.VerifyOtpRequestDto
import com.studentos.app.data.model.WeeklyPlanSummaryDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class StudentOsRepository(
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager,
    private val context: Context? = null
) {
    private val repoScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _entitlementState = MutableStateFlow<EntitlementDto?>(null)
    val entitlementState: StateFlow<EntitlementDto?> = _entitlementState.asStateFlow()

    init {
        context?.let { ctx ->
            try {
                val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
                cm?.registerDefaultNetworkCallback(object : android.net.ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(network: android.net.Network) {
                        repoScope.launch {
                            getEntitlementStatus()
                        }
                    }
                })
            } catch (e: Exception) {
                android.util.Log.w("StudentOS", "NetworkCallback registration failed: ${e.message}")
            }
        }
    }

    val tokenFlow: Flow<String?> = sessionManager.tokenFlow
    val themeFlow: Flow<String> = sessionManager.themeFlow

    fun markEntitlementExpired() {
        _entitlementState.value = _entitlementState.value?.copy(status = "expired") ?: EntitlementDto(
            entitlementId = "",
            accountId = "",
            currentPlanId = "free_trial",
            status = "expired",
            isPaid = false,
            features = emptyList(),
            expiresAt = null,
            lastVerifiedAt = java.time.Instant.now().toString(),
            createdAt = "",
            updatedAt = ""
        )
    }

    suspend fun getDeviceId(): String = sessionManager.getOrCreateDeviceId()

    suspend fun setLocalTheme(theme: String) {
        sessionManager.setTheme(theme)
    }

    // --- Authentication Operations ---
    suspend fun sendEmailOtp(email: String): Result<String> {
        val normalizedEmail = email.trim().lowercase(java.util.Locale.US)
        return try {
            val res = apiClient.authApi.sendEmailOtp(SendOtpRequestDto(normalizedEmail))
            if (res.success) {
                Result.success(res.message ?: "Verification code sent")
            } else {
                Result.failure(Exception(res.error?.message ?: "Failed to send OTP"))
            }
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            android.util.Log.e("StudentOsAuth", "sendEmailOtp HTTP ${e.code()}: $errorBody", e)
            val friendlyMsg = when (e.code()) {
                400 -> "Please enter a valid email address."
                429 -> "Too many verification attempts. Please wait a moment before trying again."
                else -> parseHttpErrorMessage(e.code(), errorBody)
            }
            Result.failure(Exception(friendlyMsg))
        } catch (e: Exception) {
            android.util.Log.e("StudentOsAuth", "sendEmailOtp failed", e)
            Result.failure(e)
        }
    }

    suspend fun verifyEmailOtp(email: String, otp: String): Result<AuthResponseDto> {
        val normalizedEmail = email.trim().lowercase(java.util.Locale.US)
        val cleanOtp = otp.trim()
        return try {
            val deviceId = getDeviceId()
            val res = apiClient.authApi.verifyEmailOtp(deviceId, VerifyOtpRequestDto(normalizedEmail, cleanOtp, deviceId))
            if (res.success && res.token != null && res.account != null) {
                sessionManager.saveSession(res.token, res.account.accountId, res.account.email)
                Result.success(res)
            } else {
                Result.failure(Exception(res.error?.message ?: "OTP verification failed"))
            }
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            android.util.Log.e("StudentOsAuth", "verifyEmailOtp HTTP ${e.code()}: $errorBody", e)
            val friendlyMsg = when (e.code()) {
                400 -> "That verification code isn't valid or has expired. Please request a new code."
                429 -> "Too many verification attempts. Please wait a moment before trying again."
                else -> parseHttpErrorMessage(e.code(), errorBody)
            }
            Result.failure(Exception(friendlyMsg))
        } catch (e: Exception) {
            android.util.Log.e("StudentOsAuth", "verifyEmailOtp failed", e)
            Result.failure(e)
        }
    }

    suspend fun loginWithGoogle(idToken: String): Result<AuthResponseDto> {
        return try {
            val deviceId = getDeviceId()
            val res = apiClient.authApi.authenticateGoogle(deviceId, GoogleAuthRequestDto(idToken, deviceId))
            if (res.success && res.token != null && res.account != null) {
                sessionManager.saveSession(res.token, res.account.accountId, res.account.email)
                Result.success(res)
            } else {
                Result.failure(Exception(res.error?.message ?: "Google authentication failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        val token = sessionManager.getToken()
        val deviceId = getDeviceId()
        if (!token.isNullOrEmpty()) {
            try {
                apiClient.authApi.logout("Bearer $token", deviceId)
            } catch (_: Exception) {
                // Ignore remote logout failure
            }
        }
        context?.let { ctx ->
            com.studentos.app.notifications.SubscriptionExpiryScheduler.cancelSubscriptionExpiryReminders(ctx)
        }
        sessionManager.clearSession()
    }

    // --- Account Operations ---
    suspend fun getAccountOverview(): Result<AccountOverviewDto> {
        return try {
            val res = apiClient.accountApi.getOverview()
            val payload = res.getPayload()
            if (res.success && payload != null) {
                Result.success(payload)
            } else {
                Result.failure(Exception(res.error ?: "Failed to fetch account overview"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUserPreferences(): Result<UserPreferencesDto> {
        return getAccountOverview().map { it.preferences }
    }

    fun getApplicationContext(): Context? = context

    suspend fun updateProfile(input: UpdateProfileInputDto): Result<UserProfileDto> {
        return try {
            val res = apiClient.accountApi.updateProfile(input)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to update profile"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updatePreferences(input: UpdatePreferencesInputDto): Result<Unit> {
        return try {
            val res = apiClient.accountApi.updatePreferences(input)
            if (res.success) {
                input.theme?.let { sessionManager.setTheme(it) }
                Result.success(Unit)
            } else Result.failure(Exception(res.error))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getDevices(): Result<List<DeviceSessionDto>> {
        return try {
            val res = apiClient.accountApi.getDevices()
            val payload = res.getPayload()
            if (res.success && payload != null) {
                Result.success(payload)
            } else {
                Result.failure(Exception(res.error ?: "Failed to fetch device sessions"))
            }
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun revokeDevice(deviceId: String): Result<String> {
        return try {
            val res = apiClient.accountApi.revokeDevice(deviceId)
            if (res.success) {
                Result.success(res.message ?: "Device revoked")
            } else {
                Result.failure(Exception(res.error ?: "Failed to revoke device"))
            }
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteAccount(): Result<String> {
        return try {
            val res = apiClient.accountApi.deleteAccount()
            if (res.success) {
                Result.success(res.message ?: "Account permanently deleted")
            } else {
                Result.failure(Exception(res.error ?: "Failed to delete account"))
            }
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Study Engine Operations ---
    suspend fun getSubjects(): Result<List<SubjectDto>> {
        return try {
            val res = apiClient.studyApi.getSubjects()
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch subjects"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createSubject(name: String): Result<SubjectDto> {
        return try {
            val res = apiClient.studyApi.createSubject(CreateSubjectInputDto(name))
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to create subject"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateSubject(subjectId: String, name: String): Result<SubjectDto> {
        return try {
            val res = apiClient.studyApi.updateSubject(subjectId, UpdateSubjectInputDto(name))
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to update subject"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteSubject(subjectId: String): Result<Unit> {
        return try {
            val res = apiClient.studyApi.deleteSubject(subjectId)
            if (res.success) Result.success(Unit)
            else Result.failure(Exception(res.error ?: "Failed to delete subject"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getChaptersBySubject(subjectId: String): Result<List<ChapterDto>> {
        return try {
            val res = apiClient.studyApi.getChaptersBySubject(subjectId)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch chapters"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createChapter(subjectId: String, name: String): Result<ChapterDto> {
        return try {
            val res = apiClient.studyApi.createChapter(CreateChapterInputDto(subjectId, name))
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to create chapter"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateChapter(
        chapterId: String,
        name: String? = null,
        orderIndex: Int? = null,
        isCompleted: Boolean? = null
    ): Result<ChapterDto> {
        return try {
            val res = apiClient.studyApi.updateChapter(chapterId, UpdateChapterInputDto(name = name, orderIndex = orderIndex, isCompleted = isCompleted))
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to update chapter"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteChapter(chapterId: String): Result<Unit> {
        return try {
            val res = apiClient.studyApi.deleteChapter(chapterId)
            if (res.success) Result.success(Unit)
            else Result.failure(Exception(res.error ?: "Failed to delete chapter"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startStudySession(subjectId: String, chapterId: String?): Result<StudySessionDto> {
        return try {
            val res = apiClient.studyApi.startSession(StartStudySessionInputDto(subjectId, chapterId))
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to start study session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun pauseStudySession(sessionId: String): Result<StudySessionDto> {
        return try {
            val res = apiClient.studyApi.pauseSession(sessionId)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to pause study session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resumeStudySession(sessionId: String): Result<StudySessionDto> {
        return try {
            val res = apiClient.studyApi.resumeSession(sessionId)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to resume study session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun stopStudySession(sessionId: String, durationSeconds: Int): Result<StudySessionDto> {
        return try {
            val res = apiClient.studyApi.stopSession(sessionId, StopStudySessionInputDto(durationSeconds))
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to stop study session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cancelStudySession(sessionId: String): Result<StudySessionDto> {
        return try {
            val res = apiClient.studyApi.cancelSession(sessionId)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to cancel study session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getActiveStudySession(): Result<StudySessionDto?> {
        return try {
            val res = apiClient.studyApi.getActiveSession()
            val payload = res.getPayload()
            if (res.success) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch active session"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTodaySessionsSummary(): Result<TodaySessionsSummaryDto> {
        return try {
            val res = apiClient.studyApi.getTodaySummary()
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch today summary"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Planner Operations ---
    suspend fun getDailyPlan(date: String): Result<DailyPlanSummaryDto> {
        return try {
            val res = apiClient.plannerApi.getDailyPlan(date)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch daily plan"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getWeeklyPlan(startDate: String? = null): Result<WeeklyPlanSummaryDto> {
        return try {
            val res = apiClient.plannerApi.getWeeklyPlan(startDate)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch weekly plan"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMonthlyPlan(year: Int, month: Int): Result<MonthlyPlanSummaryDto> {
        return try {
            val res = apiClient.plannerApi.getMonthlyPlan(year, month)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch monthly plan"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createPlannerTask(input: CreatePlannerTaskInputDto): Result<PlannerTaskDto> {
        return try {
            android.util.Log.d("StudentOsRepository", "createPlannerTask input payload: $input")
            val res = apiClient.plannerApi.createTask(input)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to create planner task"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            android.util.Log.e("StudentOsRepository", "createPlannerTask HTTP ${e.code()} Error Body: $errorBody")
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            android.util.Log.e("StudentOsRepository", "createPlannerTask Exception", e)
            Result.failure(e)
        }
    }

    private fun parseHttpErrorMessage(statusCode: Int, errorBody: String?): String {
        if (!errorBody.isNullOrBlank()) {
            try {
                val jsonObj = org.json.JSONObject(errorBody)
                if (jsonObj.has("error")) {
                    val errObj = jsonObj.optJSONObject("error")
                    if (errObj != null) {
                        val msg = errObj.optString("message")
                        val details = errObj.optJSONArray("details")
                        if (details != null && details.length() > 0) {
                            val firstDetail = details.getJSONObject(0)
                            val detailMsg = firstDetail.optString("message")
                            val path = firstDetail.optJSONArray("path")
                            val fieldName = if (path != null && path.length() > 0) path.getString(0) else ""
                            if (detailMsg.isNotBlank()) {
                                return if (fieldName.isNotBlank()) "$fieldName: $detailMsg" else detailMsg
                            }
                        }
                        if (msg.isNotBlank()) return msg
                    } else {
                        val errStr = jsonObj.optString("error")
                        if (errStr.isNotBlank()) return errStr
                    }
                }
            } catch (_: Exception) {}
        }
        return "Unable to create task (HTTP $statusCode). Please check task details and try again."
    }

    suspend fun updateTaskStatus(taskId: String, status: String): Result<PlannerTaskDto> {
        return try {
            val res = apiClient.plannerApi.updateTaskStatus(taskId, UpdatePlannerTaskStatusInputDto(status))
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to update task status"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updatePlannerTask(taskId: String, input: UpdatePlannerTaskInputDto): Result<PlannerTaskDto> {
        return try {
            val res = apiClient.plannerApi.updateTask(taskId, input)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to update planner task"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun reschedulePlannerTask(taskId: String, input: ReschedulePlannerTaskInputDto): Result<PlannerTaskDto> {
        return try {
            val res = apiClient.plannerApi.rescheduleTask(taskId, input)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to reschedule task"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deletePlannerTask(taskId: String): Result<Unit> {
        return try {
            val res = apiClient.plannerApi.deleteTask(taskId)
            if (res.success) Result.success(Unit)
            else Result.failure(Exception(res.error ?: "Failed to delete planner task"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val parsedMsg = parseHttpErrorMessage(e.code(), errorBody)
            Result.failure(Exception(parsedMsg))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Revision Operations ---
    suspend fun getRevisionDueToday(date: String? = null): Result<DailyRevisionSummaryDto> {
        return try {
            val res = apiClient.revisionApi.getDueTodaySummary(date)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch revision due items"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRevisionItems(date: String? = null): Result<List<RevisionItemDto>> {
        return try {
            val res = apiClient.revisionApi.getRevisionItems(date)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch revision items"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createRevisionItem(input: CreateRevisionItemInputDto): Result<RevisionItemDto> {
        return try {
            val res = apiClient.revisionApi.createRevisionItem(input)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to create revision item"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateRevisionItem(id: String, input: UpdateRevisionItemInputDto): Result<RevisionItemDto> {
        return try {
            val res = apiClient.revisionApi.updateRevisionItem(id, input)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to update revision item"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun rescheduleRevisionItem(id: String, scheduledDate: String): Result<RevisionItemDto> {
        return try {
            val res = apiClient.revisionApi.rescheduleRevisionItem(id, RescheduleRevisionItemInputDto(scheduledDate))
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to reschedule revision item"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun archiveRevisionItem(id: String): Result<RevisionItemDto> {
        return try {
            val res = apiClient.revisionApi.archiveRevisionItem(id)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to archive revision item"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startRevisionSession(revisionItemId: String): Result<RevisionSessionDto> {
        return try {
            val res = apiClient.revisionApi.startRevisionSession(StartRevisionSessionInputDto(revisionItemId))
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to start revision session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getActiveRevisionSession(): Result<RevisionSessionDto?> {
        return try {
            val res = apiClient.revisionApi.getActiveRevisionSession()
            val payload = res.getPayload()
            if (res.success) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch active revision session"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun pauseRevisionSession(sessionId: String): Result<RevisionSessionDto> {
        return try {
            val res = apiClient.revisionApi.pauseRevisionSession(sessionId)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to pause revision session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resumeRevisionSession(sessionId: String): Result<RevisionSessionDto> {
        return try {
            val res = apiClient.revisionApi.resumeRevisionSession(sessionId)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to resume revision session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun endRevisionSession(sessionId: String, rating: String = "good", notes: String? = null): Result<EndRevisionSessionResultDto> {
        return try {
            val res = apiClient.revisionApi.endRevisionSession(sessionId, EndRevisionSessionInputDto(rating = rating, notes = notes))
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to end revision session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cancelRevisionSession(sessionId: String): Result<RevisionSessionDto> {
        return try {
            val res = apiClient.revisionApi.cancelRevisionSession(sessionId)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to cancel revision session"))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            Result.failure(Exception(parseHttpErrorMessage(e.code(), errorBody)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Analytics Operations ---
    suspend fun getAnalyticsDashboard(period: String): Result<AnalyticsDashboardDto> {
        return try {
            val res = apiClient.analyticsApi.getAnalyticsDashboard(period)
            val payload = res.getPayload()
            if (res.success && payload != null) Result.success(payload)
            else Result.failure(Exception(res.error ?: "Failed to fetch analytics dashboard"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Goal / Countdown Operations ---
    suspend fun getGoalProgress(): Result<GoalProgressDto?> {
        return try {
            val res = apiClient.goalApi.getGoalProgress()
            if (res.success) Result.success(res.getPayload())
            else Result.failure(Exception(res.error ?: "Failed to fetch goal countdown"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createGoal(input: CreateGoalInputDto): Result<GoalProgressDto> {
        return try {
            val res = apiClient.goalApi.createGoal(input)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to create goal"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateGoal(input: UpdateGoalInputDto): Result<GoalProgressDto> {
        return try {
            val res = apiClient.goalApi.updateGoal(input)
            val payload = res.getPayload()
            if (res.success && payload != null) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(payload)
            } else Result.failure(Exception(res.error ?: "Failed to update goal"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteGoal(): Result<Unit> {
        return try {
            val res = apiClient.goalApi.deleteGoal()
            if (res.success) {
                context?.let { com.studentos.app.widget.StudentOsWidgetProvider.updateAllWidgets(it) }
                Result.success(Unit)
            } else Result.failure(Exception(res.error ?: "Failed to delete goal"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ----------------------------------------------------
    // Entitlement & Commercial Plans
    // ----------------------------------------------------

    suspend fun getPlans(): Result<List<PlanDto>> {
        return try {
            val response = apiClient.entitlementApi.getPlans()
            if (response.success && response.data != null) {
                android.util.Log.d("StudentOS", "getPlans SUCCESS: ${response.data.size} plans loaded")
                Result.success(response.data)
            } else {
                val err = response.error?.message ?: "Failed to fetch plans"
                android.util.Log.e("StudentOS", "getPlans ERROR: $err")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            android.util.Log.e("StudentOS", "getPlans EXCEPTION", e)
            Result.failure(e)
        }
    }

    suspend fun getEntitlementStatus(): Result<EntitlementDto> {
        return try {
            val response = apiClient.entitlementApi.getEntitlementStatus()
            if (response.success && response.data != null) {
                val entitlement = response.data
                _entitlementState.value = entitlement
                context?.let { ctx ->
                    com.studentos.app.notifications.SubscriptionExpiryScheduler.scheduleSubscriptionExpiryReminders(ctx, entitlement)
                }

                // Schedule authoritative revalidation right at known expiry boundary
                entitlement.expiresAt?.let { expStr ->
                    try {
                        val expiryEpochMs = java.time.Instant.parse(expStr).toEpochMilli()
                        val nowMs = System.currentTimeMillis()
                        val diffMs = expiryEpochMs - nowMs
                        if (diffMs in 1..86400000L) {
                            repoScope.launch {
                                kotlinx.coroutines.delay(diffMs + 1000L)
                                getEntitlementStatus()
                            }
                        }
                    } catch (e: Exception) {
                        // ignore parse errors
                    }
                }

                Result.success(entitlement)
            } else {
                val err = response.error?.message ?: "Failed to fetch entitlement status"
                val code = response.error?.code
                if (code == "TRIAL_EXPIRED" || code == "SUBSCRIPTION_REQUIRED") {
                    markEntitlementExpired()
                }
                android.util.Log.e("StudentOS", "getEntitlementStatus ERROR: $err")
                Result.failure(Exception(err))
            }
        } catch (e: retrofit2.HttpException) {
            if (e.code() == 403) {
                markEntitlementExpired()
            }
            android.util.Log.e("StudentOS", "getEntitlementStatus HTTP ${e.code()}", e)
            Result.failure(e)
        } catch (e: Exception) {
            android.util.Log.e("StudentOS", "getEntitlementStatus EXCEPTION", e)
            Result.failure(e)
        }
    }

    suspend fun getPaymentConfig(): Result<PaymentConfigDto> {
        return try {
            val response = apiClient.entitlementApi.getPaymentConfig()
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                val err = response.error?.message ?: "Failed to fetch payment config"
                android.util.Log.e("StudentOS", "getPaymentConfig ERROR: $err")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            android.util.Log.e("StudentOS", "getPaymentConfig EXCEPTION", e)
            Result.failure(e)
        }
    }
}
