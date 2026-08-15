package com.studentos.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ErrorDetail(
    val code: String? = null,
    val message: String? = null
)

@Serializable
data class ApiResponseWrapper<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null,
    val error: ErrorDetail? = null,
    val timestamp: String? = null
)

@Serializable
data class DataWrapper<T>(
    val success: Boolean,
    val data: T? = null,
    val subjects: T? = null,
    val subject: T? = null,
    val chapters: T? = null,
    val chapter: T? = null,
    val session: T? = null,
    val summary: T? = null,
    val overview: T? = null,
    val profile: T? = null,
    val preferences: T? = null,
    val devices: T? = null,
    val message: String? = null,
    val error: String? = null,
    val timestamp: String? = null
) {
    fun getPayload(): T? = data ?: subjects ?: subject ?: chapters ?: chapter ?: session ?: summary ?: overview ?: profile ?: preferences ?: devices
}
