package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class RevisionItemDto(
    val id: String,
    val accountId: String,
    val subjectId: String,
    val chapterId: String? = null,
    val originatingStudySessionId: String? = null,
    val scheduledDate: String, // YYYY-MM-DD
    val revisionStage: Int = 1,
    val status: String = "scheduled", // 'scheduled' | 'due_today' | 'in_progress' | 'completed' | 'overdue' | 'deferred' | 'archived'
    val priority: String = "medium", // 'high' | 'medium' | 'low'
    val notes: String? = null,
    val totalRevisionCount: Int = 0,
    val retentionScore: Int = 80,
    val lastRating: String? = null,
    val lapseCount: Int = 0,
    val createdAt: String,
    val updatedAt: String,
    val lastRevisionAt: String? = null,
    val completedAt: String? = null
)

@Serializable
data class RevisionSessionDto(
    val id: String,
    val accountId: String,
    val revisionItemId: String,
    val subjectId: String,
    val chapterId: String? = null,
    val startTime: String,
    val endTime: String? = null,
    val durationSeconds: Int = 0,
    val pauseDurationSeconds: Int = 0,
    val revisionStage: Int = 1,
    val status: String = "completed",
    val notes: String? = null,
    val rating: String? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class DailyRevisionSummaryDto(
    val date: String,
    val dueTodayCount: Int = 0,
    val overdueCount: Int = 0,
    val completedTodayCount: Int = 0,
    val totalRevisionSecondsToday: Int = 0,
    val averageRetentionScore: Double = 0.0,
    val items: List<RevisionItemDto> = emptyList()
)

@Serializable
data class CreateRevisionItemInputDto(
    val subjectId: String,
    val chapterId: String? = null,
    val originatingStudySessionId: String? = null,
    val scheduledDate: String,
    val priority: String = "medium",
    val notes: String? = null
)

@Serializable
data class UpdateRevisionItemInputDto(
    val scheduledDate: String? = null,
    val priority: String? = null,
    val notes: String? = null
)

@Serializable
data class RescheduleRevisionItemInputDto(
    val scheduledDate: String
)

@Serializable
data class StartRevisionSessionInputDto(
    val revisionItemId: String
)

@Serializable
data class EndRevisionSessionInputDto(
    val rating: String = "good",
    val notes: String? = null
)

@Serializable
data class EndRevisionSessionResultDto(
    val session: RevisionSessionDto,
    val item: RevisionItemDto
)

fun RevisionSessionDto.calculateElapsedSeconds(): Int {
    if (status != "running" && status != "in_progress") {
        return durationSeconds
    }
    val refTimeStr = if (updatedAt.isNotBlank()) updatedAt else startTime
    val refTimeMs = parseIsoToMillis(refTimeStr)
    val nowMs = System.currentTimeMillis()
    val deltaSecs = ((nowMs - refTimeMs) / 1000).toInt().coerceAtLeast(0)
    return durationSeconds + deltaSecs
}

private fun parseIsoToMillis(isoStr: String): Long {
    if (isoStr.isBlank()) return System.currentTimeMillis()
    return try {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            java.time.Instant.parse(isoStr).toEpochMilli()
        } else {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
            sdf.parse(isoStr)?.time ?: System.currentTimeMillis()
        }
    } catch (e: Exception) {
        try {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
            sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
            sdf.parse(isoStr)?.time ?: System.currentTimeMillis()
        } catch (e2: Exception) {
            System.currentTimeMillis()
        }
    }
}

