package com.studentos.app.data.api

import com.studentos.app.data.model.ChapterDto
import com.studentos.app.data.model.CreateChapterInputDto
import com.studentos.app.data.model.DataWrapper
import com.studentos.app.data.model.CreateSubjectInputDto
import com.studentos.app.data.model.StartStudySessionInputDto
import com.studentos.app.data.model.StopStudySessionInputDto
import com.studentos.app.data.model.StudySessionDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.data.model.TodaySessionsSummaryDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

import com.studentos.app.data.model.UpdateChapterInputDto
import com.studentos.app.data.model.UpdateSubjectInputDto
import retrofit2.http.DELETE
import retrofit2.http.PUT

interface StudyApi {

    @GET("api/v1/study/subjects")
    suspend fun getSubjects(): DataWrapper<List<SubjectDto>>

    @POST("api/v1/study/subjects")
    suspend fun createSubject(@Body input: CreateSubjectInputDto): DataWrapper<SubjectDto>

    @PUT("api/v1/study/subjects/{id}")
    suspend fun updateSubject(
        @Path("id") subjectId: String,
        @Body input: UpdateSubjectInputDto
    ): DataWrapper<SubjectDto>

    @DELETE("api/v1/study/subjects/{id}")
    suspend fun deleteSubject(@Path("id") subjectId: String): DataWrapper<Map<String, String>>

    @GET("api/v1/study/subjects/{subjectId}/chapters")
    suspend fun getChaptersBySubject(@Path("subjectId") subjectId: String): DataWrapper<List<ChapterDto>>

    @POST("api/v1/study/chapters")
    suspend fun createChapter(@Body input: CreateChapterInputDto): DataWrapper<ChapterDto>

    @PUT("api/v1/study/chapters/{id}")
    suspend fun updateChapter(
        @Path("id") chapterId: String,
        @Body input: UpdateChapterInputDto
    ): DataWrapper<ChapterDto>

    @DELETE("api/v1/study/chapters/{id}")
    suspend fun deleteChapter(@Path("id") chapterId: String): DataWrapper<Map<String, String>>

    @POST("api/v1/study/sessions/start")
    suspend fun startSession(@Body input: StartStudySessionInputDto): DataWrapper<StudySessionDto>

    @POST("api/v1/study/sessions/{sessionId}/pause")
    suspend fun pauseSession(@Path("sessionId") sessionId: String): DataWrapper<StudySessionDto>

    @POST("api/v1/study/sessions/{sessionId}/resume")
    suspend fun resumeSession(@Path("sessionId") sessionId: String): DataWrapper<StudySessionDto>

    @POST("api/v1/study/sessions/{sessionId}/end")
    suspend fun stopSession(
        @Path("sessionId") sessionId: String,
        @Body input: StopStudySessionInputDto? = null
    ): DataWrapper<StudySessionDto>

    @POST("api/v1/study/sessions/{sessionId}/cancel")
    suspend fun cancelSession(@Path("sessionId") sessionId: String): DataWrapper<StudySessionDto>

    @GET("api/v1/study/sessions/active")
    suspend fun getActiveSession(): DataWrapper<StudySessionDto?>

    @GET("api/v1/study/sessions/today")
    suspend fun getTodaySummary(): DataWrapper<TodaySessionsSummaryDto>
}
