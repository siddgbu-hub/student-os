package com.studentos.app.notifications

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import com.studentos.app.MainActivity
import com.studentos.app.R

object NotificationHelper {

    fun generateNotificationId(type: String, entityId: String): Int {
        return "$type:$entityId".hashCode()
    }

    fun showPlannerTaskNotification(
        context: Context,
        taskId: String,
        taskTitle: String,
        subjectName: String?,
        dateStr: String,
        showPrivateDetails: Boolean
    ) {
        NotificationChannels.createChannels(context)

        val title = if (showPrivateDetails) "Task Reminder: $taskTitle" else "Study Task Reminder"
        val text = if (showPrivateDetails && !subjectName.isNullOrEmpty()) {
            "$subjectName • Scheduled Study Task"
        } else {
            "You have a scheduled study task."
        }

        val deepLinkIntent = Intent(Intent.ACTION_VIEW, Uri.parse("studentos://planner?date=$dateStr"), context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            generateNotificationId("planner", taskId),
            deepLinkIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotificationChannels.CHANNEL_PLANNER)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(generateNotificationId("planner", taskId), notification)
    }

    fun showRevisionDueNotification(
        context: Context,
        dueCount: Int,
        showPrivateDetails: Boolean
    ) {
        NotificationChannels.createChannels(context)

        val title = "Revision Queue Due Today"
        val text = if (showPrivateDetails) {
            "You have $dueCount revision item${if (dueCount > 1) "s" else ""} ready for review."
        } else {
            "You have revision items due for review today."
        }

        val deepLinkIntent = Intent(Intent.ACTION_VIEW, Uri.parse("studentos://revision"), context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            generateNotificationId("revision", "daily_due"),
            deepLinkIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotificationChannels.CHANNEL_REVISION)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(generateNotificationId("revision", "daily_due"), notification)
    }

    fun showStudyBreakNotification(
        context: Context,
        intervalMins: Int
    ) {
        NotificationChannels.createChannels(context)

        val title = "Study Break Reminder"
        val text = "You have been studying for $intervalMins minutes. Take a short break to recharge!"

        val deepLinkIntent = Intent(Intent.ACTION_VIEW, Uri.parse("studentos://study"), context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            generateNotificationId("study", "break_reminder"),
            deepLinkIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotificationChannels.CHANNEL_STUDY)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(generateNotificationId("study", "break_reminder"), notification)
    }

    fun showSubscriptionExpiryNotification(
        context: Context,
        expiryType: String,
        title: String,
        text: String
    ) {
        NotificationChannels.createChannels(context)

        val deepLinkIntent = Intent(Intent.ACTION_VIEW, Uri.parse("studentos://dashboard?action=upgrade"), context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            generateNotificationId("subscription", expiryType),
            deepLinkIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotificationChannels.CHANNEL_SUBSCRIPTION)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(generateNotificationId("subscription", expiryType), notification)
    }

    fun cancelNotification(context: Context, type: String, entityId: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(generateNotificationId(type, entityId))
    }
}
