package com.studentos.app.ui.screens.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.model.AnalyticsDashboardDto
import com.studentos.app.data.model.GoalProgressDto
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AnalyticsUiState(
    val isLoading: Boolean = true,
    val selectedPeriod: String = "this_week", // 'today' | 'this_week' | 'this_month' | 'this_year'
    val analyticsData: AnalyticsDashboardDto? = null,
    val goalProgress: GoalProgressDto? = null,
    val errorMessage: String? = null
)

class AnalyticsViewModel(private val repository: StudentOsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(AnalyticsUiState())
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    private var fetchJob: Job? = null

    init {
        loadAnalytics("this_week")
    }

    fun loadAnalytics(period: String) {
        fetchJob?.cancel()
        fetchJob = viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                selectedPeriod = period,
                errorMessage = null
            )

            val analyticsResult = repository.getAnalyticsDashboard(period)
            val goalResult = repository.getGoalProgress()
            val goalData = goalResult.getOrNull()

            analyticsResult.onSuccess { data ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    analyticsData = data,
                    goalProgress = goalData,
                    errorMessage = null
                )
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    goalProgress = goalData,
                    errorMessage = err.message ?: "Failed to load learning analytics"
                )
            }
        }
    }
}
