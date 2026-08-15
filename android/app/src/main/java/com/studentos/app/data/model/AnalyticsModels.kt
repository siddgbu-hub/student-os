package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LearningSummaryDto(
    val totalStudyTimeMinutes: Int = 0,
    val totalRevisionTimeMinutes: Int = 0,
    val totalFocusTimeMinutes: Int = 0,
    val studySessionsCompleted: Int = 0,
    val revisionSessionsCompleted: Int = 0,
    val tasksCompleted: Int = 0
)

@Serializable
data class ProductivitySummaryDto(
    val dailyAverageStudyMinutes: Int = 0,
    val weeklyAverageStudyMinutes: Int = 0,
    val currentStreakDays: Int = 0,
    val longestStreakDays: Int = 0,
    val plannerCompletionRate: Double = 0.0,
    val revisionCompletionRate: Double = 0.0
)

@Serializable
data class SubjectAnalyticsDto(
    val subjectId: String,
    val subjectName: String,
    val studyTimeMinutes: Int = 0,
    val revisionTimeMinutes: Int = 0,
    val totalTimeMinutes: Int = 0,
    val sharePercentage: Double = 0.0,
    val completedTasksCount: Int = 0,
    val pendingTasksCount: Int = 0,
    val retentionScore: Int = 80
)

@Serializable
data class TrendDataPointDto(
    val date: String,
    val label: String,
    val studyMinutes: Int = 0,
    val revisionMinutes: Int = 0,
    val tasksCompleted: Int = 0
)

@Serializable
data class RevisionAnalyticsDto(
    val dueTodayCount: Int = 0,
    val overdueCount: Int = 0,
    val completedCount: Int = 0,
    val revisionCompletionRate: Double = 0.0,
    val averageRevisionDelayDays: Double = 0.0,
    val retentionScoreAverage: Double = 0.0
)

@Serializable
data class PlannerAnalyticsDto(
    val plannedDurationMinutes: Int = 0,
    val completedDurationMinutes: Int = 0,
    val accuracyPercentage: Double = 0.0,
    val deferredTasksCount: Int = 0,
    val cancelledTasksCount: Int = 0
)

@Serializable
data class AnalyticsDashboardDto(
    val period: String = "this_week",
    val startDate: String,
    val endDate: String,
    val learningSummary: LearningSummaryDto,
    val productivitySummary: ProductivitySummaryDto,
    val subjectAnalytics: List<SubjectAnalyticsDto> = emptyList(),
    val trends: List<TrendDataPointDto> = emptyList(),
    val revisionAnalytics: RevisionAnalyticsDto,
    val plannerAnalytics: PlannerAnalyticsDto
)
