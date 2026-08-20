package com.studentos.app

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.studentos.app.notifications.NotificationChannels
import com.studentos.app.notifications.RevisionReminderWorker
import java.util.concurrent.TimeUnit

class StudentOsApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        com.studentos.app.config.AppConfigManager.initialize(this)
        NotificationChannels.createChannels(this)
        schedulePeriodicRevisionWorker()
    }

    private fun schedulePeriodicRevisionWorker() {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<RevisionReminderWorker>(12, TimeUnit.HOURS)
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                WORK_NAME_REVISION_REMINDER,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )
        } catch (e: Exception) {
            android.util.Log.e("StudentOsApp", "Failed to enqueue RevisionReminderWorker", e)
        }
    }

    companion object {
        const val WORK_NAME_REVISION_REMINDER = "revision_reminder_periodic_work"
    }
}
