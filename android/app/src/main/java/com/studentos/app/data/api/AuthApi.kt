package com.studentos.app.data.api

import com.studentos.app.data.model.ApiResponseWrapper
import com.studentos.app.data.model.AuthResponseDto
import com.studentos.app.data.model.GoogleAuthRequestDto
import com.studentos.app.data.model.SendOtpRequestDto
import com.studentos.app.data.model.VerifyOtpRequestDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApi {

    @POST("api/v1/auth/email/send-otp")
    suspend fun sendEmailOtp(
        @Body request: SendOtpRequestDto
    ): ApiResponseWrapper<String>

    @POST("api/v1/auth/email/verify-otp")
    suspend fun verifyEmailOtp(
        @Header("x-device-id") deviceId: String,
        @Body request: VerifyOtpRequestDto
    ): AuthResponseDto

    @POST("api/v1/auth/google")
    suspend fun authenticateGoogle(
        @Header("x-device-id") deviceId: String,
        @Body request: GoogleAuthRequestDto
    ): AuthResponseDto

    @GET("api/v1/auth/session/validate")
    suspend fun validateSession(
        @Header("Authorization") authorization: String,
        @Header("x-device-id") deviceId: String
    ): AuthResponseDto

    @POST("api/v1/auth/session/logout")
    suspend fun logout(
        @Header("Authorization") authorization: String,
        @Header("x-device-id") deviceId: String
    ): AuthResponseDto
}
