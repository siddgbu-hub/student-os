package com.studentos.app.data.api

import com.studentos.app.data.model.AccountOverviewDto
import com.studentos.app.data.model.DataWrapper
import com.studentos.app.data.model.DeviceSessionDto
import com.studentos.app.data.model.UpdatePreferencesInputDto
import com.studentos.app.data.model.UpdateProfileInputDto
import com.studentos.app.data.model.UserPreferencesDto
import com.studentos.app.data.model.UserProfileDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface AccountApi {

    @GET("api/v1/account/overview")
    suspend fun getOverview(): DataWrapper<AccountOverviewDto>

    @PUT("api/v1/account/profile")
    suspend fun updateProfile(
        @Body input: UpdateProfileInputDto
    ): DataWrapper<UserProfileDto>

    @PUT("api/v1/account/preferences")
    suspend fun updatePreferences(
        @Body input: UpdatePreferencesInputDto
    ): DataWrapper<UserPreferencesDto>

    @GET("api/v1/account/devices")
    suspend fun getDevices(): DataWrapper<List<DeviceSessionDto>>

    @DELETE("api/v1/account/devices/{deviceId}")
    suspend fun revokeDevice(
        @Path("deviceId") deviceId: String
    ): DataWrapper<String>

    @POST("api/v1/account/delete")
    suspend fun deleteAccount(): DataWrapper<String>
}
