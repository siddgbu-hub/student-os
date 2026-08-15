package com.studentos.app.data.api

import com.studentos.app.data.model.AnalyticsDashboardDto
import com.studentos.app.data.model.DataWrapper
import retrofit2.http.GET
import retrofit2.http.Query

interface AnalyticsApi {

    @GET("api/v1/analytics/dashboard")
    suspend fun getAnalyticsDashboard(
        @Query("period") period: String = "this_week"
    ): DataWrapper<AnalyticsDashboardDto>
}
