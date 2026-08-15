package com.studentos.app.data.api

import com.studentos.app.data.model.ApiResponseWrapper
import com.studentos.app.data.model.EntitlementDto
import com.studentos.app.data.model.PaymentConfigDto
import com.studentos.app.data.model.PlanDto
import retrofit2.http.GET

interface EntitlementApi {

    @GET("api/v1/entitlement/plans")
    suspend fun getPlans(): ApiResponseWrapper<List<PlanDto>>

    @GET("api/v1/entitlement/status")
    suspend fun getEntitlementStatus(): ApiResponseWrapper<EntitlementDto>

    @GET("api/v1/payment/config")
    suspend fun getPaymentConfig(): ApiResponseWrapper<PaymentConfigDto>
}
