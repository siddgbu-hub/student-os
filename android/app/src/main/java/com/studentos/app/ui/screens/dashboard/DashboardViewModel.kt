package com.studentos.app.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.model.AccountOverviewDto
import com.studentos.app.data.model.AnalyticsDashboardDto
import com.studentos.app.data.model.DailyPlanSummaryDto
import com.studentos.app.data.model.DailyRevisionSummaryDto
import com.studentos.app.data.model.GoalProgressDto
import com.studentos.app.data.model.StudySessionDto
import com.studentos.app.data.model.TodaySessionsSummaryDto
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

import com.studentos.app.data.model.CreateGoalInputDto
import com.studentos.app.data.model.EntitlementDto
import com.studentos.app.data.model.PaymentConfigDto
import com.studentos.app.data.model.PlanDto
import com.studentos.app.data.model.UpdateGoalInputDto

data class DashboardUiState(
    val isLoading: Boolean = true,
    val accountOverview: AccountOverviewDto? = null,
    val todaySummary: TodaySessionsSummaryDto? = null,
    val dailyPlan: DailyPlanSummaryDto? = null,
    val revisionSummary: DailyRevisionSummaryDto? = null,
    val analyticsDashboard: AnalyticsDashboardDto? = null,
    val activeSession: StudySessionDto? = null,
    val goalProgress: GoalProgressDto? = null,
    val entitlement: EntitlementDto? = null,
    val plans: List<PlanDto> = emptyList(),
    val paymentConfig: PaymentConfigDto? = null,
    val isUpgradeSheetOpen: Boolean = false,
    val isGoalDialogOpen: Boolean = false,
    val isEditingGoal: Boolean = false,
    val isDeleteGoalDialogOpen: Boolean = false,
    val isSubmittingGoal: Boolean = false,
    val goalError: String? = null,
    val isCancelSessionDialogOpen: Boolean = false,
    val isCancellingSession: Boolean = false,
    val cancelSessionError: String? = null,
    val isRefreshing: Boolean = false,
    val refreshMessage: String? = null,
    val errorMessage: String? = null
)

class DashboardViewModel(private val repository: StudentOsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.tokenFlow.collect { token ->
                if (!token.isNullOrEmpty()) {
                    loadDashboardData()
                }
            }
        }
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

            coroutineScope {
                val overviewDeferred = async { repository.getAccountOverview() }
                val todaySummaryDeferred = async { repository.getTodaySessionsSummary() }
                val dailyPlanDeferred = async { repository.getDailyPlan(todayStr) }
                val revisionDeferred = async { repository.getRevisionDueToday() }
                val analyticsDeferred = async { repository.getAnalyticsDashboard("this_week") }
                val activeSessionDeferred = async { repository.getActiveStudySession() }
                val goalDeferred = async { repository.getGoalProgress() }
                val entitlementDeferred = async { repository.getEntitlementStatus() }
                val plansDeferred = async { repository.getPlans() }
                val paymentConfigDeferred = async { repository.getPaymentConfig() }

                val overviewResult = overviewDeferred.await()
                val todaySummaryResult = todaySummaryDeferred.await()
                val dailyPlanResult = dailyPlanDeferred.await()
                val revisionResult = revisionDeferred.await()
                val analyticsResult = analyticsDeferred.await()
                val activeSessionResult = activeSessionDeferred.await()
                val goalResult = goalDeferred.await()
                val entitlementResult = entitlementDeferred.await()
                val plansResult = plansDeferred.await()
                val paymentConfigResult = paymentConfigDeferred.await()

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    accountOverview = overviewResult.getOrNull(),
                    todaySummary = todaySummaryResult.getOrNull(),
                    dailyPlan = dailyPlanResult.getOrNull(),
                    revisionSummary = revisionResult.getOrNull(),
                    analyticsDashboard = analyticsResult.getOrNull(),
                    activeSession = activeSessionResult.getOrNull(),
                    goalProgress = goalResult.getOrNull(),
                    entitlement = entitlementResult.getOrNull(),
                    plans = plansResult.getOrNull() ?: emptyList(),
                    paymentConfig = paymentConfigResult.getOrNull(),
                    errorMessage = overviewResult.exceptionOrNull()?.message
                        ?: todaySummaryResult.exceptionOrNull()?.message
                )
            }
        }
    }

    private var isRefreshInProgress = false

    fun refreshDashboard(onComplete: (() -> Unit)? = null) {
        if (_uiState.value.isRefreshing || isRefreshInProgress) return
        isRefreshInProgress = true
        _uiState.value = _uiState.value.copy(isRefreshing = true)

        viewModelScope.launch {
            try {
                val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

                coroutineScope {
                    val overviewDeferred = async { repository.getAccountOverview() }
                    val todaySummaryDeferred = async { repository.getTodaySessionsSummary() }
                    val dailyPlanDeferred = async { repository.getDailyPlan(todayStr) }
                    val revisionDeferred = async { repository.getRevisionDueToday() }
                    val analyticsDeferred = async { repository.getAnalyticsDashboard("this_week") }
                    val activeSessionDeferred = async { repository.getActiveStudySession() }
                    val goalDeferred = async { repository.getGoalProgress() }
                    val entitlementDeferred = async { repository.getEntitlementStatus() }
                    val plansDeferred = async { repository.getPlans() }
                    val paymentConfigDeferred = async { repository.getPaymentConfig() }

                    val overviewResult = overviewDeferred.await()
                    val todaySummaryResult = todaySummaryDeferred.await()
                    val dailyPlanResult = dailyPlanDeferred.await()
                    val revisionResult = revisionDeferred.await()
                    val analyticsResult = analyticsDeferred.await()
                    val activeSessionResult = activeSessionDeferred.await()
                    val goalResult = goalDeferred.await()
                    val entitlementResult = entitlementDeferred.await()
                    val plansResult = plansDeferred.await()
                    val paymentConfigResult = paymentConfigDeferred.await()

                    val isFailure = overviewResult.isFailure && todaySummaryResult.isFailure && entitlementResult.isFailure

                    _uiState.value = _uiState.value.copy(
                        accountOverview = overviewResult.getOrNull() ?: _uiState.value.accountOverview,
                        todaySummary = todaySummaryResult.getOrNull() ?: _uiState.value.todaySummary,
                        dailyPlan = dailyPlanResult.getOrNull() ?: _uiState.value.dailyPlan,
                        revisionSummary = revisionResult.getOrNull() ?: _uiState.value.revisionSummary,
                        analyticsDashboard = analyticsResult.getOrNull() ?: _uiState.value.analyticsDashboard,
                        activeSession = activeSessionResult.getOrNull() ?: _uiState.value.activeSession,
                        goalProgress = goalResult.getOrNull() ?: _uiState.value.goalProgress,
                        entitlement = entitlementResult.getOrNull() ?: _uiState.value.entitlement,
                        plans = plansResult.getOrNull() ?: _uiState.value.plans,
                        paymentConfig = paymentConfigResult.getOrNull() ?: _uiState.value.paymentConfig,
                        refreshMessage = if (isFailure) "Couldn't refresh. Check your connection and try again." else "Updated just now"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    refreshMessage = "Couldn't refresh. Check your connection and try again."
                )
            } finally {
                isRefreshInProgress = false
                _uiState.value = _uiState.value.copy(isRefreshing = false)
                onComplete?.invoke()
            }
        }
    }

    fun clearRefreshMessage() {
        _uiState.value = _uiState.value.copy(refreshMessage = null)
    }

    fun openUpgradeSheet() {
        _uiState.value = _uiState.value.copy(isUpgradeSheetOpen = true)
        viewModelScope.launch {
            val plansResult = repository.getPlans()
            val paymentConfigResult = repository.getPaymentConfig()
            val entitlementResult = repository.getEntitlementStatus()

            _uiState.value = _uiState.value.copy(
                plans = plansResult.getOrNull() ?: _uiState.value.plans,
                paymentConfig = paymentConfigResult.getOrNull() ?: _uiState.value.paymentConfig,
                entitlement = entitlementResult.getOrNull() ?: _uiState.value.entitlement
            )
        }
    }

    fun closeUpgradeSheet() {
        _uiState.value = _uiState.value.copy(isUpgradeSheetOpen = false)
    }

    fun openCreateGoalDialog() {
        _uiState.value = _uiState.value.copy(
            isGoalDialogOpen = true,
            isEditingGoal = false,
            goalError = null
        )
    }

    fun openEditGoalDialog() {
        _uiState.value = _uiState.value.copy(
            isGoalDialogOpen = true,
            isEditingGoal = true,
            goalError = null
        )
    }

    fun closeGoalDialog() {
        _uiState.value = _uiState.value.copy(
            isGoalDialogOpen = false,
            goalError = null
        )
    }

    fun openDeleteGoalDialog() {
        _uiState.value = _uiState.value.copy(isDeleteGoalDialogOpen = true)
    }

    fun closeDeleteGoalDialog() {
        _uiState.value = _uiState.value.copy(isDeleteGoalDialogOpen = false)
    }

    fun saveGoal(
        examName: String,
        examDate: String,
        targetDailyMinutes: Int = 120,
        targetTotalChapters: Int? = null,
        completedChapters: Int = 0,
        targetScore: String? = null
    ) {
        if (examName.isBlank() || examDate.isBlank()) {
            _uiState.value = _uiState.value.copy(goalError = "Exam name and date (YYYY-MM-DD) are required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingGoal = true, goalError = null)
            val isEdit = _uiState.value.isEditingGoal
            val res = if (isEdit) {
                repository.updateGoal(
                    UpdateGoalInputDto(
                        examName = examName.trim(),
                        examDate = examDate.trim(),
                        targetDailyMinutes = targetDailyMinutes,
                        targetTotalChapters = targetTotalChapters,
                        completedChapters = completedChapters,
                        targetScore = targetScore?.trim()?.ifBlank { null }
                    )
                )
            } else {
                repository.createGoal(
                    CreateGoalInputDto(
                        examName = examName.trim(),
                        examDate = examDate.trim(),
                        targetDailyMinutes = targetDailyMinutes,
                        targetTotalChapters = targetTotalChapters,
                        completedChapters = completedChapters,
                        targetScore = targetScore?.trim()?.ifBlank { null }
                    )
                )
            }
            res.onSuccess { freshGoal ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingGoal = false,
                    isGoalDialogOpen = false,
                    goalProgress = freshGoal
                )
                loadDashboardData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingGoal = false,
                    goalError = err.message ?: "Failed to save academic goal"
                )
            }
        }
    }

    fun deleteGoal() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingGoal = true)
            val res = repository.deleteGoal()
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isSubmittingGoal = false,
                    isDeleteGoalDialogOpen = false,
                    goalProgress = null
                )
                loadDashboardData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingGoal = false,
                    isDeleteGoalDialogOpen = false,
                    errorMessage = err.message ?: "Failed to delete academic goal"
                )
            }
        }
    }

    fun openCancelSessionDialog() {
        if (_uiState.value.activeSession == null) return
        _uiState.value = _uiState.value.copy(isCancelSessionDialogOpen = true, cancelSessionError = null)
    }

    fun closeCancelSessionDialog() {
        _uiState.value = _uiState.value.copy(isCancelSessionDialogOpen = false, cancelSessionError = null)
    }

    fun cancelActiveSession() {
        val session = _uiState.value.activeSession ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCancellingSession = true, cancelSessionError = null)
            val res = repository.cancelStudySession(session.id)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isCancellingSession = false,
                    isCancelSessionDialogOpen = false,
                    activeSession = null
                )
                loadDashboardData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isCancellingSession = false,
                    cancelSessionError = err.message ?: "Failed to cancel study session"
                )
            }
        }
    }
}
