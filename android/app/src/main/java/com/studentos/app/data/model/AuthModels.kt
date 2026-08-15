package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserAccountDto(
    val accountId: String,
    val email: String,
    val createdAt: String? = null,
    val lastLoginAt: String? = null
)

@Serializable
data class DeviceStatusDto(
    val deviceId: String,
    val isActive: Boolean? = true
)

@Serializable
data class ApiErrorDto(
    val code: String? = null,
    val message: String? = null
)

@Serializable
data class AuthResponseDto(
    val success: Boolean,
    val token: String? = null,
    val sessionId: String? = null,
    val account: UserAccountDto? = null,
    val deviceStatus: DeviceStatusDto? = null,
    val error: ApiErrorDto? = null,
    val timestamp: String? = null
)

@Serializable
data class SendOtpRequestDto(
    val email: String
)

@Serializable
data class VerifyOtpRequestDto(
    val email: String,
    val otp: String,
    val deviceId: String,
    val deviceModel: String? = null,
    val osVersion: String? = null
)

@Serializable
data class GoogleAuthRequestDto(
    val idToken: String,
    val deviceId: String,
    val deviceModel: String? = null,
    val osVersion: String? = null
)
