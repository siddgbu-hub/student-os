package com.studentos.app.data.api

import com.studentos.app.data.model.CreateRevisionItemInputDto
import com.studentos.app.data.model.DailyRevisionSummaryDto
import com.studentos.app.data.model.DataWrapper
import com.studentos.app.data.model.EndRevisionSessionInputDto
import com.studentos.app.data.model.EndRevisionSessionResultDto
import com.studentos.app.data.model.RescheduleRevisionItemInputDto
import com.studentos.app.data.model.RevisionItemDto
import com.studentos.app.data.model.RevisionSessionDto
import com.studentos.app.data.model.StartRevisionSessionInputDto
import com.studentos.app.data.model.UpdateRevisionItemInputDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface RevisionApi {

    @GET("api/v1/revision/items")
    suspend fun getRevisionItems(
        @Query("date") date: String? = null
    ): DataWrapper<List<RevisionItemDto>>

    @GET("api/v1/revision/summary")
    suspend fun getDueTodaySummary(
        @Query("date") date: String? = null
    ): DataWrapper<DailyRevisionSummaryDto>

    @POST("api/v1/revision/items")
    suspend fun createRevisionItem(
        @Body input: CreateRevisionItemInputDto
    ): DataWrapper<RevisionItemDto>

    @PUT("api/v1/revision/items/{id}")
    suspend fun updateRevisionItem(
        @Path("id") id: String,
        @Body input: UpdateRevisionItemInputDto
    ): DataWrapper<RevisionItemDto>

    @POST("api/v1/revision/items/{id}/reschedule")
    suspend fun rescheduleRevisionItem(
        @Path("id") id: String,
        @Body input: RescheduleRevisionItemInputDto
    ): DataWrapper<RevisionItemDto>

    @POST("api/v1/revision/items/{id}/archive")
    suspend fun archiveRevisionItem(
        @Path("id") id: String
    ): DataWrapper<RevisionItemDto>

    @POST("api/v1/revision/sessions/start")
    suspend fun startRevisionSession(
        @Body input: StartRevisionSessionInputDto
    ): DataWrapper<RevisionSessionDto>

    @GET("api/v1/revision/sessions/active")
    suspend fun getActiveRevisionSession(): DataWrapper<RevisionSessionDto?>

    @POST("api/v1/revision/sessions/{id}/pause")
    suspend fun pauseRevisionSession(
        @Path("id") id: String
    ): DataWrapper<RevisionSessionDto>

    @POST("api/v1/revision/sessions/{id}/resume")
    suspend fun resumeRevisionSession(
        @Path("id") id: String
    ): DataWrapper<RevisionSessionDto>

    @POST("api/v1/revision/sessions/{id}/end")
    suspend fun endRevisionSession(
        @Path("id") id: String,
        @Body input: EndRevisionSessionInputDto? = null
    ): DataWrapper<EndRevisionSessionResultDto>

    @POST("api/v1/revision/sessions/{id}/cancel")
    suspend fun cancelRevisionSession(
        @Path("id") id: String
    ): DataWrapper<RevisionSessionDto>
}

