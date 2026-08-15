package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProfileDto(
    val accountId: String,
    val fullName: String,
    val avatarUrl: String? = null,
    val institutionName: String? = null,
    val course: String? = null,
    val classYear: String? = null,
    val stream: String? = null,
    val examinationType: String? = null,
    val preferredDailyStudyTargetMinutes: Int = 120,
    val preferredSessionDurationMinutes: Int = 45,
    val preferredStudyTime: String = "morning",
    val preferredRevisionStrategy: String = "spaced",
    val preferredPlannerView: String = "day",
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class UserPreferencesDto(
    val accountId: String,
    val theme: String = "system",
    val dateFormat: String = "YYYY-MM-DD",
    val timeFormat: String = "24h",
    val firstDayOfWeek: String = "monday",
    val timeZone: String = "UTC",
    val showCompletedBlocks: Boolean = true,
    val breakReminderIntervalMinutes: Int = 50,
    val notificationsEnabled: Boolean = true,
    val plannerRemindersEnabled: Boolean = true,
    val revisionRemindersEnabled: Boolean = true,
    val quietHoursEnabled: Boolean = false,
    val quietHoursStart: String = "22:00",
    val quietHoursEnd: String = "07:00",
    val reminderLeadTimeMinutes: Int = 15,
    val showPrivateDetailsInNotifications: Boolean = false,
    val updatedAt: String
)

@Serializable
data class DeviceSessionDto(
    val deviceId: String,
    val deviceModel: String? = null,
    val osVersion: String? = null,
    val registeredAt: String,
    val lastActiveAt: String,
    val isCurrentDevice: Boolean = false
)

@Serializable
data class AccountOverviewDto(
    val accountId: String,
    val email: String,
    val createdAt: String,
    val lastLoginAt: String,
    val profile: UserProfileDto,
    val preferences: UserPreferencesDto,
    val devices: List<DeviceSessionDto> = emptyList()
)

@Serializable
data class UpdateProfileInputDto(
    val fullName: String? = null,
    val avatarUrl: String? = null,
    val institutionName: String? = null,
    val course: String? = null,
    val classYear: String? = null,
    val stream: String? = null,
    val examinationType: String? = null,
    val preferredDailyStudyTargetMinutes: Int? = null,
    val preferredSessionDurationMinutes: Int? = null,
    val preferredStudyTime: String? = null,
    val preferredRevisionStrategy: String? = null,
    val preferredPlannerView: String? = null
)

@Serializable
data class UpdatePreferencesInputDto(
    val theme: String? = null,
    val dateFormat: String? = null,
    val timeFormat: String? = null,
    val firstDayOfWeek: String? = null,
    val timeZone: String? = null,
    val showCompletedBlocks: Boolean? = null,
    val breakReminderIntervalMinutes: Int? = null,
    val notificationsEnabled: Boolean? = null,
    val plannerRemindersEnabled: Boolean? = null,
    val revisionRemindersEnabled: Boolean? = null,
    val quietHoursEnabled: Boolean? = null,
    val quietHoursStart: String? = null,
    val quietHoursEnd: String? = null,
    val reminderLeadTimeMinutes: Int? = null,
    val showPrivateDetailsInNotifications: Boolean? = null
)
