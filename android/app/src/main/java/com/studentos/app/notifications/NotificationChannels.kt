package com.studentos.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object NotificationChannels {
    const val CHANNEL_PLANNER = "planner_task_reminders"
    const val CHANNEL_REVISION = "revision_schedule_reminders"
    const val CHANNEL_STUDY = "study_session_reminders"
    const val CHANNEL_SUBSCRIPTION = "subscription_expiry_reminders"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val plannerChannel = NotificationChannel(
                CHANNEL_PLANNER,
                "Planner Task Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reminders for scheduled planner study tasks"
                enableVibration(true)
            }

            val revisionChannel = NotificationChannel(
                CHANNEL_REVISION,
                "Revision Schedule Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Daily spaced repetition revision queue reminders"
            }

            val studyChannel = NotificationChannel(
                CHANNEL_STUDY,
                "Study Session & Break Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Interval reminders during active study sessions"
                enableVibration(true)
            }

            val subscriptionChannel = NotificationChannel(
                CHANNEL_SUBSCRIPTION,
                "Subscription & Expiry Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Expiry and renewal alerts for Student OS Pro subscriptions"
                enableVibration(true)
            }

            notificationManager.createNotificationChannels(
                listOf(plannerChannel, revisionChannel, studyChannel, subscriptionChannel)
            )
        }
    }
}
