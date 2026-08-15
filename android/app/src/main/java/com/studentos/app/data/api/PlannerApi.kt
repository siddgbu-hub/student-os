package com.studentos.app.data.api

import com.studentos.app.data.model.CreatePlannerTaskInputDto
import com.studentos.app.data.model.DataWrapper
import com.studentos.app.data.model.DailyPlanSummaryDto
import com.studentos.app.data.model.MonthlyPlanSummaryDto
import com.studentos.app.data.model.PlannerTaskDto
import com.studentos.app.data.model.UpdatePlannerTaskStatusInputDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

import retrofit2.http.PATCH

import com.studentos.app.data.model.ReschedulePlannerTaskInputDto
import com.studentos.app.data.model.UpdatePlannerTaskInputDto
import retrofit2.http.DELETE

import com.studentos.app.data.model.WeeklyPlanSummaryDto

interface PlannerApi {

    @GET("api/v1/planner/tasks/today")
    suspend fun getDailyPlan(@Query("date") date: String): DataWrapper<DailyPlanSummaryDto>

    @GET("api/v1/planner/tasks/weekly")
    suspend fun getWeeklyPlan(
        @Query("startDate") startDate: String? = null
    ): DataWrapper<WeeklyPlanSummaryDto>

    @GET("api/v1/planner/monthly")
    suspend fun getMonthlyPlan(
        @Query("year") year: Int,
        @Query("month") month: Int
    ): DataWrapper<MonthlyPlanSummaryDto>

    @POST("api/v1/planner/tasks")
    suspend fun createTask(@Body input: CreatePlannerTaskInputDto): DataWrapper<PlannerTaskDto>

    @PUT("api/v1/planner/tasks/{id}")
    suspend fun updateTask(
        @Path("id") taskId: String,
        @Body input: UpdatePlannerTaskInputDto
    ): DataWrapper<PlannerTaskDto>

    @POST("api/v1/planner/tasks/{id}/reschedule")
    suspend fun rescheduleTask(
        @Path("id") taskId: String,
        @Body input: ReschedulePlannerTaskInputDto
    ): DataWrapper<PlannerTaskDto>

    @DELETE("api/v1/planner/tasks/{id}")
    suspend fun deleteTask(@Path("id") taskId: String): DataWrapper<Map<String, String>>

    @PATCH("api/v1/planner/tasks/{id}/status")
    suspend fun updateTaskStatus(
        @Path("id") taskId: String,
        @Body input: UpdatePlannerTaskStatusInputDto
    ): DataWrapper<PlannerTaskDto>
}
