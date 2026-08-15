package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class SubjectDto(
    val id: String,
    val accountId: String,
    val name: String,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class ChapterDto(
    val id: String,
    val subjectId: String,
    val accountId: String,
    val name: String,
    val orderIndex: Int,
    val isCompleted: Boolean,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class StudySessionDto(
    val id: String,
    val accountId: String,
    val subjectId: String,
    val chapterId: String? = null,
    val startTime: String,
    val endTime: String? = null,
    val durationSeconds: Int = 0,
    val pauseDurationSeconds: Int = 0,
    val status: String, // 'running' | 'paused' | 'completed' | 'cancelled'
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class TodaySessionsSummaryDto(
    val date: String,
    val totalDurationSeconds: Int,
    val completedSessionsCount: Int,
    val sessions: List<StudySessionDto> = emptyList()
)

@Serializable
data class StartStudySessionInputDto(
    val subjectId: String,
    val chapterId: String? = null
)

@Serializable
data class StopStudySessionInputDto(
    val durationSeconds: Int,
    val pauseDurationSeconds: Int = 0
)

@Serializable
data class CreateSubjectInputDto(
    val name: String
)

@Serializable
data class UpdateSubjectInputDto(
    val name: String
)

@Serializable
data class CreateChapterInputDto(
    val subjectId: String,
    val name: String
)

@Serializable
data class UpdateChapterInputDto(
    val name: String? = null,
    val orderIndex: Int? = null,
    val isCompleted: Boolean? = null
)

fun StudySessionDto.calculateElapsedSeconds(): Int {
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
