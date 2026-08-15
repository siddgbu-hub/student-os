package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ExamGoalDto(
    val id: String,
    val accountId: String,
    val examName: String,
    val examDate: String, // YYYY-MM-DD
    val targetScore: String? = null,
    val targetDailyMinutes: Int = 120,
    val targetTotalChapters: Int? = null,
    val completedChapters: Int = 0,
    val status: String = "active", // 'active' | 'completed' | 'archived'
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class GoalProgressDto(
    val goal: ExamGoalDto? = null,
    val daysRemaining: Int = 0,
    val weeksRemaining: Int = 0,
    val monthsRemaining: Int = 0,
    val studyMinutesCompleted: Int = 0,
    val studyMinutesRemaining: Int = 0,
    val completedChapters: Int = 0,
    val remainingChapters: Int = 0,
    val requiredMinutesPerDay: Double = 0.0,
    val requiredChaptersPerDay: Double = 0.0,
    val projectedCompletionDate: String? = null,
    val todayStudyMinutesCompleted: Int = 0,
    val statusBadge: String = "NOT_STARTED" // 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'COMPLETED' | 'AHEAD'
)

@Serializable
data class CreateGoalInputDto(
    val examName: String,
    val examDate: String,
    val targetScore: String? = null,
    val targetDailyMinutes: Int = 120,
    val targetTotalChapters: Int? = null,
    val completedChapters: Int = 0
)

@Serializable
data class UpdateGoalInputDto(
    val examName: String? = null,
    val examDate: String? = null,
    val targetScore: String? = null,
    val targetDailyMinutes: Int? = null,
    val targetTotalChapters: Int? = null,
    val completedChapters: Int? = null,
    val status: String? = null
)
