package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class PlannerTaskDto(
    val id: String,
    val accountId: String,
    val subjectId: String,
    val chapterId: String? = null,
    val title: String,
    val plannedDate: String, // YYYY-MM-DD
    val plannedStartTime: String? = null, // HH:mm
    val estimatedDurationMinutes: Int = 30,
    val priority: String = "medium", // 'high' | 'medium' | 'low'
    val status: String = "planned", // 'planned' | 'in_progress' | 'paused' | 'completed' | 'skipped' | 'deferred' | 'archived'
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val completedAt: String? = null
)

@Serializable
data class DailyPlanSummaryDto(
    val date: String,
    val totalPlannedDurationMinutes: Int,
    val completedDurationMinutes: Int,
    val totalTasksCount: Int,
    val completedTasksCount: Int,
    val tasks: List<PlannerTaskDto> = emptyList()
)

@Serializable
data class WeeklyPlanSummaryDto(
    val startDate: String,
    val endDate: String,
    val totalPlannedDurationMinutes: Int = 0,
    val completedDurationMinutes: Int = 0,
    val dailySummaries: List<DailyPlanSummaryDto> = emptyList()
)

@Serializable
data class MonthlyCalendarDayDto(
    val date: String,
    val studyMinutes: Int = 0,
    val plannedTasksCount: Int = 0,
    val completedTasksCount: Int = 0,
    val revisionCount: Int = 0,
    val completionPercentage: Double = 0.0,
    val hasActivity: Boolean = false
)

@Serializable
data class MonthlyPlanSummaryDto(
    val year: Int,
    val month: Int,
    val plannedHours: Double = 0.0,
    val completedHours: Double = 0.0,
    val remainingHours: Double = 0.0,
    val completionPercentage: Double = 0.0,
    val completedTasksCount: Int = 0,
    val missedTasksCount: Int = 0,
    val studyStreakDays: Int = 0,
    val revisionSessionsCount: Int = 0,
    val days: List<MonthlyCalendarDayDto> = emptyList()
)

@Serializable
data class CreatePlannerTaskInputDto(
    val subjectId: String,
    val chapterId: String? = null,
    val title: String,
    val plannedDate: String,
    val plannedStartTime: String? = null,
    val estimatedDurationMinutes: Int,
    val priority: String,
    val notes: String? = null
)

@Serializable
data class UpdatePlannerTaskInputDto(
    val title: String? = null,
    val plannedDate: String? = null,
    val plannedStartTime: String? = null,
    val estimatedDurationMinutes: Int? = null,
    val priority: String? = null,
    val status: String? = null,
    val notes: String? = null
)

@Serializable
data class ReschedulePlannerTaskInputDto(
    val plannedDate: String,
    val action: String = "reschedule" // 'move_tomorrow' | 'move_this_week' | 'reschedule'
)

@Serializable
data class UpdatePlannerTaskStatusInputDto(
    val status: String
)
