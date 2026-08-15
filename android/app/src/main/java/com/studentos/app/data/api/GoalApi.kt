package com.studentos.app.data.api

import com.studentos.app.data.model.CreateGoalInputDto
import com.studentos.app.data.model.DataWrapper
import com.studentos.app.data.model.GoalProgressDto
import com.studentos.app.data.model.UpdateGoalInputDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT

interface GoalApi {

    @GET("api/v1/goal")
    suspend fun getGoalProgress(): DataWrapper<GoalProgressDto>

    @POST("api/v1/goal")
    suspend fun createGoal(@Body input: CreateGoalInputDto): DataWrapper<GoalProgressDto>

    @PUT("api/v1/goal")
    suspend fun updateGoal(@Body input: UpdateGoalInputDto): DataWrapper<GoalProgressDto>

    @DELETE("api/v1/goal")
    suspend fun deleteGoal(): DataWrapper<Map<String, String>>
}
