package com.studentos.app.ui.screens.planner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.model.CreatePlannerTaskInputDto
import com.studentos.app.data.model.DailyPlanSummaryDto
import com.studentos.app.data.model.MonthlyPlanSummaryDto
import com.studentos.app.data.model.PlannerTaskDto
import com.studentos.app.data.model.ReschedulePlannerTaskInputDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.data.model.UpdatePlannerTaskInputDto
import com.studentos.app.data.model.WeeklyPlanSummaryDto
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

enum class PlannerViewMode {
    DAILY,
    WEEKLY,
    MONTHLY
}

data class PlannerUiState(
    val plannerViewMode: PlannerViewMode = PlannerViewMode.DAILY,
    val isLoading: Boolean = true,
    val selectedDate: String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()),
    val dailyPlan: DailyPlanSummaryDto? = null,
    val subjects: List<SubjectDto> = emptyList(),
    val selectedSubjectIdFilter: String? = null,
    val selectedPriorityFilter: String? = null,
    val selectedStatusFilter: String = "all",

    // Weekly View State
    val selectedWeekStartDate: String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()),
    val weeklyPlan: WeeklyPlanSummaryDto? = null,
    val isWeeklyLoading: Boolean = false,
    val weeklyErrorMessage: String? = null,

    // Monthly View State
    val selectedYear: Int = Calendar.getInstance().get(Calendar.YEAR),
    val selectedMonth: Int = Calendar.getInstance().get(Calendar.MONTH) + 1, // 1-indexed
    val monthlyPlan: MonthlyPlanSummaryDto? = null,
    val isMonthlyLoading: Boolean = false,
    val monthlyErrorMessage: String? = null,

    // Dialogs & Actions
    val isAddTaskDialogOpen: Boolean = false,
    val isEditTaskDialogOpen: Boolean = false,
    val editingTask: PlannerTaskDto? = null,
    val isRescheduleDialogOpen: Boolean = false,
    val reschedulingTask: PlannerTaskDto? = null,
    val isDeleteTaskDialogOpen: Boolean = false,
    val deletingTask: PlannerTaskDto? = null,
    val isSubmittingTask: Boolean = false,
    val taskActionError: String? = null,
    val createTaskError: String? = null,
    val errorMessage: String? = null
)

class PlannerViewModel(private val repository: StudentOsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(PlannerUiState())
    val uiState: StateFlow<PlannerUiState> = _uiState.asStateFlow()

    private var weeklyRequestId: Long = 0L
    private var monthlyRequestId: Long = 0L

    init {
        val initialMonday = getMondayOfWeekString(getTodayDateString())
        _uiState.value = _uiState.value.copy(selectedWeekStartDate = initialMonday)
        loadDailyPlan()
        loadSubjects()
    }

    fun getTodayDateString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    fun getMondayOfWeekString(dateStr: String): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val cal = Calendar.getInstance()
            cal.time = sdf.parse(dateStr) ?: Date()
            cal.firstDayOfWeek = Calendar.MONDAY
            val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
            val diff = if (dayOfWeek == Calendar.SUNDAY) -6 else Calendar.MONDAY - dayOfWeek
            cal.add(Calendar.DAY_OF_MONTH, diff)
            sdf.format(cal.time)
        } catch (e: Exception) {
            dateStr
        }
    }

    fun setPlannerViewMode(mode: PlannerViewMode) {
        _uiState.value = _uiState.value.copy(plannerViewMode = mode)
        if (mode == PlannerViewMode.WEEKLY && _uiState.value.weeklyPlan == null) {
            loadWeeklyPlan()
        } else if (mode == PlannerViewMode.MONTHLY && _uiState.value.monthlyPlan == null) {
            loadMonthlyPlan()
        }
    }

    fun loadDailyPlan(date: String = _uiState.value.selectedDate) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, selectedDate = date, errorMessage = null)
            val res = repository.getDailyPlan(date)
            res.onSuccess { summary: DailyPlanSummaryDto ->
                _uiState.value = _uiState.value.copy(isLoading = false, dailyPlan = summary)
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = err.message)
            }
        }
    }

    fun loadWeeklyPlan(startDate: String = _uiState.value.selectedWeekStartDate) {
        val targetMonday = getMondayOfWeekString(startDate)
        val currentReqId = ++weeklyRequestId
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isWeeklyLoading = true,
                selectedWeekStartDate = targetMonday,
                weeklyErrorMessage = null
            )
            val res = repository.getWeeklyPlan(targetMonday)
            if (currentReqId != weeklyRequestId) return@launch // Drop stale async response

            res.onSuccess { summary: WeeklyPlanSummaryDto ->
                _uiState.value = _uiState.value.copy(
                    isWeeklyLoading = false,
                    weeklyPlan = summary
                )
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isWeeklyLoading = false,
                    weeklyErrorMessage = err.message ?: "Failed to fetch weekly plan"
                )
            }
        }
    }

    fun previousWeek() {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        try {
            val cal = Calendar.getInstance()
            cal.time = sdf.parse(_uiState.value.selectedWeekStartDate) ?: Date()
            cal.add(Calendar.DAY_OF_MONTH, -7)
            val newMonday = getMondayOfWeekString(sdf.format(cal.time))
            loadWeeklyPlan(newMonday)
        } catch (e: Exception) {
            // Ignore parse failure
        }
    }

    fun nextWeek() {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        try {
            val cal = Calendar.getInstance()
            cal.time = sdf.parse(_uiState.value.selectedWeekStartDate) ?: Date()
            cal.add(Calendar.DAY_OF_MONTH, 7)
            val newMonday = getMondayOfWeekString(sdf.format(cal.time))
            loadWeeklyPlan(newMonday)
        } catch (e: Exception) {
            // Ignore parse failure
        }
    }

    fun goToTodayWeek() {
        val todayMonday = getMondayOfWeekString(getTodayDateString())
        loadWeeklyPlan(todayMonday)
    }

    fun selectDateFromWeeklyDay(dateStr: String) {
        if (dateStr.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))) {
            _uiState.value = _uiState.value.copy(
                selectedDate = dateStr,
                plannerViewMode = PlannerViewMode.DAILY
            )
            loadDailyPlan(dateStr)
        }
    }

    fun loadMonthlyPlan(
        year: Int = _uiState.value.selectedYear,
        month: Int = _uiState.value.selectedMonth
    ) {
        val currentReqId = ++monthlyRequestId
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isMonthlyLoading = true,
                selectedYear = year,
                selectedMonth = month,
                monthlyErrorMessage = null
            )
            val res = repository.getMonthlyPlan(year, month)
            if (currentReqId != monthlyRequestId) return@launch // Drop stale response
            
            res.onSuccess { summary: MonthlyPlanSummaryDto ->
                _uiState.value = _uiState.value.copy(
                    isMonthlyLoading = false,
                    monthlyPlan = summary
                )
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isMonthlyLoading = false,
                    monthlyErrorMessage = err.message ?: "Failed to fetch monthly plan"
                )
            }
        }
    }

    fun previousMonth() {
        var y = _uiState.value.selectedYear
        var m = _uiState.value.selectedMonth - 1
        if (m < 1) {
            m = 12
            y -= 1
        }
        loadMonthlyPlan(y, m)
    }

    fun nextMonth() {
        var y = _uiState.value.selectedYear
        var m = _uiState.value.selectedMonth + 1
        if (m > 12) {
            m = 1
            y += 1
        }
        loadMonthlyPlan(y, m)
    }

    fun goToTodayMonth() {
        val cal = Calendar.getInstance()
        val y = cal.get(Calendar.YEAR)
        val m = cal.get(Calendar.MONTH) + 1
        loadMonthlyPlan(y, m)
    }

    fun selectDateFromCalendar(dateStr: String) {
        if (dateStr.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))) {
            _uiState.value = _uiState.value.copy(
                selectedDate = dateStr,
                plannerViewMode = PlannerViewMode.DAILY
            )
            loadDailyPlan(dateStr)
        }
    }

    fun previousDay() {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        try {
            val cal = Calendar.getInstance()
            cal.time = sdf.parse(_uiState.value.selectedDate) ?: Date()
            cal.add(Calendar.DAY_OF_MONTH, -1)
            val newDate = sdf.format(cal.time)
            loadDailyPlan(newDate)
        } catch (e: Exception) {
            // Ignore parse failure
        }
    }

    fun nextDay() {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        try {
            val cal = Calendar.getInstance()
            cal.time = sdf.parse(_uiState.value.selectedDate) ?: Date()
            cal.add(Calendar.DAY_OF_MONTH, 1)
            val newDate = sdf.format(cal.time)
            loadDailyPlan(newDate)
        } catch (e: Exception) {
            // Ignore parse failure
        }
    }

    fun goToToday() {
        loadDailyPlan(getTodayDateString())
    }

    fun selectDate(dateStr: String) {
        if (dateStr.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))) {
            loadDailyPlan(dateStr)
        }
    }

    fun loadSubjects() {
        viewModelScope.launch {
            val res = repository.getSubjects()
            res.onSuccess { list ->
                _uiState.value = _uiState.value.copy(subjects = list)
            }
        }
    }

    fun setSubjectFilter(subjectId: String?) {
        _uiState.value = _uiState.value.copy(selectedSubjectIdFilter = subjectId)
    }

    fun setPriorityFilter(priority: String?) {
        _uiState.value = _uiState.value.copy(selectedPriorityFilter = priority)
    }

    fun setStatusFilter(status: String) {
        _uiState.value = _uiState.value.copy(selectedStatusFilter = status)
    }

    fun clearFilters() {
        _uiState.value = _uiState.value.copy(
            selectedSubjectIdFilter = null,
            selectedPriorityFilter = null,
            selectedStatusFilter = "all"
        )
    }

    fun openAddTaskDialog() {
        loadSubjects()
        _uiState.value = _uiState.value.copy(isAddTaskDialogOpen = true, createTaskError = null)
    }

    fun closeAddTaskDialog() {
        _uiState.value = _uiState.value.copy(isAddTaskDialogOpen = false, createTaskError = null)
    }

    fun openEditTaskDialog(task: PlannerTaskDto) {
        loadSubjects()
        _uiState.value = _uiState.value.copy(
            isEditTaskDialogOpen = true,
            editingTask = task,
            taskActionError = null
        )
    }

    fun closeEditTaskDialog() {
        _uiState.value = _uiState.value.copy(
            isEditTaskDialogOpen = false,
            editingTask = null,
            taskActionError = null
        )
    }

    fun openRescheduleTaskDialog(task: PlannerTaskDto) {
        _uiState.value = _uiState.value.copy(
            isRescheduleDialogOpen = true,
            reschedulingTask = task,
            taskActionError = null
        )
    }

    fun closeRescheduleTaskDialog() {
        _uiState.value = _uiState.value.copy(
            isRescheduleDialogOpen = false,
            reschedulingTask = null,
            taskActionError = null
        )
    }

    fun openDeleteTaskDialog(task: PlannerTaskDto) {
        _uiState.value = _uiState.value.copy(
            isDeleteTaskDialogOpen = true,
            deletingTask = task,
            taskActionError = null
        )
    }

    fun closeDeleteTaskDialog() {
        _uiState.value = _uiState.value.copy(
            isDeleteTaskDialogOpen = false,
            deletingTask = null,
            taskActionError = null
        )
    }

    fun createTask(
        subjectNameOrId: String,
        title: String,
        plannedStartTime: String?,
        estimatedDurationMinutes: Int,
        priority: String,
        notes: String?,
        onSuccess: () -> Unit = {}
    ) {
        if (title.isBlank()) {
            _uiState.value = _uiState.value.copy(createTaskError = "Task title is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingTask = true, createTaskError = null)
            
            val targetSubjectName = subjectNameOrId.trim()
            var subjectId: String? = null

            if (targetSubjectName.isNotBlank()) {
                val matchingSub = _uiState.value.subjects.find { 
                    it.id == targetSubjectName || it.name.equals(targetSubjectName, ignoreCase = true) 
                }
                if (matchingSub != null) {
                    subjectId = matchingSub.id
                } else {
                    val createSubjectRes = repository.createSubject(targetSubjectName)
                    if (createSubjectRes.isSuccess) {
                        subjectId = createSubjectRes.getOrNull()?.id
                    }
                }
            }

            val input = CreatePlannerTaskInputDto(
                subjectId = subjectId ?: _uiState.value.subjects.firstOrNull()?.id ?: "",
                title = title.trim(),
                plannedDate = _uiState.value.selectedDate,
                plannedStartTime = plannedStartTime?.ifBlank { null },
                estimatedDurationMinutes = if (estimatedDurationMinutes > 0) estimatedDurationMinutes else 45,
                priority = priority.lowercase(),
                notes = notes?.ifBlank { null }
            )
            val res = repository.createPlannerTask(input)
            res.onSuccess { createdTask ->
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        com.studentos.app.notifications.AlarmScheduler.scheduleTaskReminder(ctx, createdTask, prefs)
                    }
                }
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    isAddTaskDialogOpen = false,
                    createTaskError = null
                )
                loadDailyPlan()
                if (_uiState.value.weeklyPlan != null) {
                    loadWeeklyPlan()
                }
                if (_uiState.value.monthlyPlan != null) {
                    loadMonthlyPlan()
                }
                loadSubjects()
                onSuccess()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    createTaskError = err.message ?: "Failed to create planner task"
                )
            }
        }
    }

    fun updateTask(
        title: String,
        plannedStartTime: String?,
        estimatedDurationMinutes: Int,
        priority: String,
        notes: String?
    ) {
        val task = _uiState.value.editingTask ?: return
        if (title.isBlank()) {
            _uiState.value = _uiState.value.copy(taskActionError = "Task title is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingTask = true, taskActionError = null)
            val input = UpdatePlannerTaskInputDto(
                title = title.trim(),
                plannedStartTime = plannedStartTime?.ifBlank { null },
                estimatedDurationMinutes = if (estimatedDurationMinutes > 0) estimatedDurationMinutes else null,
                priority = priority.lowercase(),
                notes = notes?.ifBlank { null }
            )
            val res = repository.updatePlannerTask(task.id, input)
            res.onSuccess { updatedTask ->
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        com.studentos.app.notifications.AlarmScheduler.scheduleTaskReminder(ctx, updatedTask, prefs)
                    }
                }
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    isEditTaskDialogOpen = false,
                    editingTask = null
                )
                loadDailyPlan()
                if (_uiState.value.weeklyPlan != null) {
                    loadWeeklyPlan()
                }
                if (_uiState.value.monthlyPlan != null) {
                    loadMonthlyPlan()
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    taskActionError = err.message ?: "Failed to update task"
                )
            }
        }
    }

    fun rescheduleTask(newDate: String) {
        val task = _uiState.value.reschedulingTask ?: return
        if (!newDate.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))) {
            _uiState.value = _uiState.value.copy(taskActionError = "Invalid date format (YYYY-MM-DD required)")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingTask = true, taskActionError = null)
            val input = ReschedulePlannerTaskInputDto(plannedDate = newDate, action = "reschedule")
            val res = repository.reschedulePlannerTask(task.id, input)
            res.onSuccess { rescheduledTask ->
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        com.studentos.app.notifications.AlarmScheduler.scheduleTaskReminder(ctx, rescheduledTask, prefs)
                    }
                }
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    isRescheduleDialogOpen = false,
                    reschedulingTask = null
                )
                loadDailyPlan()
                if (_uiState.value.weeklyPlan != null) {
                    loadWeeklyPlan()
                }
                if (_uiState.value.monthlyPlan != null) {
                    loadMonthlyPlan()
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    taskActionError = err.message ?: "Failed to reschedule task"
                )
            }
        }
    }

    fun rescheduleTaskToTomorrow(task: PlannerTaskDto? = _uiState.value.reschedulingTask) {
        val targetTask = task ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingTask = true, taskActionError = null)
            val cal = Calendar.getInstance()
            cal.add(Calendar.DAY_OF_MONTH, 1)
            val tomorrowStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
            
            val input = ReschedulePlannerTaskInputDto(plannedDate = tomorrowStr, action = "move_tomorrow")
            val res = repository.reschedulePlannerTask(targetTask.id, input)
            res.onSuccess { rescheduledTask ->
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        com.studentos.app.notifications.AlarmScheduler.scheduleTaskReminder(ctx, rescheduledTask, prefs)
                    }
                }
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    isRescheduleDialogOpen = false,
                    reschedulingTask = null
                )
                loadDailyPlan()
                if (_uiState.value.weeklyPlan != null) {
                    loadWeeklyPlan()
                }
                if (_uiState.value.monthlyPlan != null) {
                    loadMonthlyPlan()
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    taskActionError = err.message ?: "Failed to reschedule task to tomorrow"
                )
            }
        }
    }

    fun deleteTask() {
        val task = _uiState.value.deletingTask ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingTask = true, taskActionError = null)
            val res = repository.deletePlannerTask(task.id)
            res.onSuccess {
                repository.getApplicationContext()?.let { ctx ->
                    com.studentos.app.notifications.AlarmScheduler.cancelTaskReminder(ctx, task.id)
                }
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    isDeleteTaskDialogOpen = false,
                    deletingTask = null
                )
                loadDailyPlan()
                if (_uiState.value.weeklyPlan != null) {
                    loadWeeklyPlan()
                }
                if (_uiState.value.monthlyPlan != null) {
                    loadMonthlyPlan()
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingTask = false,
                    taskActionError = err.message ?: "Failed to delete task"
                )
            }
        }
    }

    fun toggleTaskStatus(task: PlannerTaskDto) {
        val newStatus = if (task.status == "completed") "planned" else "completed"
        viewModelScope.launch {
            val res = repository.updateTaskStatus(task.id, newStatus)
            repository.getApplicationContext()?.let { ctx ->
                if (newStatus == "completed") {
                    com.studentos.app.notifications.AlarmScheduler.cancelTaskReminder(ctx, task.id)
                } else {
                    val prefs = repository.getUserPreferences().getOrNull()
                    res.getOrNull()?.let { updatedTask ->
                        com.studentos.app.notifications.AlarmScheduler.scheduleTaskReminder(ctx, updatedTask, prefs)
                    }
                }
            }
            loadDailyPlan()
            if (_uiState.value.weeklyPlan != null) {
                loadWeeklyPlan()
            }
            if (_uiState.value.monthlyPlan != null) {
                loadMonthlyPlan()
            }
        }
    }
}
