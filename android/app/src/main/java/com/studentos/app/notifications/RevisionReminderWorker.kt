package com.studentos.app.notifications

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.studentos.app.data.api.ApiClient
import com.studentos.app.data.local.SessionManager
import com.studentos.app.data.repository.StudentOsRepository

class RevisionReminderWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val sessionManager = SessionManager(applicationContext)
            val apiClient = ApiClient(sessionManager)
            val repository = StudentOsRepository(apiClient, sessionManager, applicationContext)

            if (sessionManager.getToken().isNullOrEmpty()) {
                return Result.success()
            }

            val preferences = repository.getUserPreferences().getOrNull()
            val notificationsEnabled = preferences?.notificationsEnabled ?: true
            val revisionEnabled = preferences?.revisionRemindersEnabled ?: true

            if (!notificationsEnabled || !revisionEnabled) {
                return Result.success()
            }

            val summary = repository.getRevisionDueToday().getOrNull()
            val dueCount = summary?.dueTodayCount ?: 0

            if (dueCount > 0) {
                NotificationHelper.showRevisionDueNotification(
                    context = applicationContext,
                    dueCount = dueCount,
                    showPrivateDetails = preferences?.showPrivateDetailsInNotifications ?: false
                )
            }

            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("RevisionWorker", "Error checking revision queue", e)
            Result.retry()
        }
    }
}
