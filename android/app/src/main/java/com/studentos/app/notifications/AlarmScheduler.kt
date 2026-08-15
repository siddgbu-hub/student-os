package com.studentos.app.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.studentos.app.data.model.PlannerTaskDto
import com.studentos.app.data.model.UserPreferencesDto
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object AlarmScheduler {

    fun scheduleTaskReminder(
        context: Context,
        task: PlannerTaskDto,
        preferences: UserPreferencesDto?
    ) {
        val notificationsEnabled = preferences?.notificationsEnabled ?: true
        val plannerEnabled = preferences?.plannerRemindersEnabled ?: true
        if (!notificationsEnabled || !plannerEnabled) {
            cancelTaskReminder(context, task.id)
            return
        }

        if (task.status == "completed" || task.status == "cancelled" || task.plannedStartTime == null) {
            cancelTaskReminder(context, task.id)
            return
        }

        try {
            val dateParts = task.plannedDate.split("-")
            val timeParts = task.plannedStartTime.split(":")
            if (dateParts.size < 3 || timeParts.size < 2) return

            val localDate = LocalDate.of(dateParts[0].toInt(), dateParts[1].toInt(), dateParts[2].toInt())
            val localTime = LocalTime.of(timeParts[0].toInt(), timeParts[1].toInt())
            val eventDateTime = LocalDateTime.of(localDate, localTime)

            val zoneId = ZoneId.systemDefault()
            val eventEpochMs = eventDateTime.atZone(zoneId).toInstant().toEpochMilli()

            val leadTimeMins = preferences?.reminderLeadTimeMinutes ?: 15
            val triggerDateTime = eventDateTime.minusMinutes(leadTimeMins.toLong())
            var triggerEpochMs = triggerDateTime.atZone(zoneId).toInstant().toEpochMilli()

            val nowMs = System.currentTimeMillis()

            // Quiet Hours Deferral Check
            val quietEnabled = preferences?.quietHoursEnabled ?: false
            val quietStart = preferences?.quietHoursStart ?: "22:00"
            val quietEnd = preferences?.quietHoursEnd ?: "07:00"

            if (quietEnabled) {
                val adjustedTrigger = adjustForQuietHours(
                    triggerEpochMs = triggerEpochMs,
                    eventEpochMs = eventEpochMs,
                    quietStartStr = quietStart,
                    quietEndStr = quietEnd,
                    zoneId = zoneId
                ) ?: return // Suppressed if no longer actionable at quiet hours end

                triggerEpochMs = adjustedTrigger
            }

            if (triggerEpochMs <= nowMs) {
                // Event or lead trigger already in the past
                return
            }

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra(AlarmReceiver.EXTRA_TYPE, "planner")
                putExtra(AlarmReceiver.EXTRA_ENTITY_ID, task.id)
                putExtra(AlarmReceiver.EXTRA_TITLE, task.title)
                putExtra(AlarmReceiver.EXTRA_SUBJECT_NAME, task.subjectId)
                putExtra(AlarmReceiver.EXTRA_DATE_STR, task.plannedDate)
                putExtra(AlarmReceiver.EXTRA_SHOW_PRIVATE, preferences?.showPrivateDetailsInNotifications ?: false)
            }

            val requestCode = NotificationHelper.generateNotificationId("planner", task.id)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
            }
        } catch (e: Exception) {
            android.util.Log.e("AlarmScheduler", "Failed to schedule task reminder", e)
        }
    }

    fun cancelTaskReminder(context: Context, taskId: String) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java)
            val requestCode = NotificationHelper.generateNotificationId("planner", taskId)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            NotificationHelper.cancelNotification(context, "planner", taskId)
        } catch (e: Exception) {
            android.util.Log.e("AlarmScheduler", "Failed to cancel task reminder", e)
        }
    }

    fun scheduleStudyBreakReminder(
        context: Context,
        sessionId: String,
        intervalMinutes: Int,
        preferences: UserPreferencesDto?
    ) {
        val notificationsEnabled = preferences?.notificationsEnabled ?: true
        if (!notificationsEnabled || intervalMinutes <= 0) {
            cancelStudyBreakReminder(context, sessionId)
            return
        }

        try {
            val triggerEpochMs = System.currentTimeMillis() + (intervalMinutes * 60 * 1000L)

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra(AlarmReceiver.EXTRA_TYPE, "study_break")
                putExtra(AlarmReceiver.EXTRA_ENTITY_ID, sessionId)
                putExtra(AlarmReceiver.EXTRA_INTERVAL_MINS, intervalMinutes)
            }

            val requestCode = NotificationHelper.generateNotificationId("study_break", sessionId)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
            }
        } catch (e: Exception) {
            android.util.Log.e("AlarmScheduler", "Failed to schedule study break reminder", e)
        }
    }

    fun cancelStudyBreakReminder(context: Context, sessionId: String) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java)
            val requestCode = NotificationHelper.generateNotificationId("study_break", sessionId)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            NotificationHelper.cancelNotification(context, "study_break", sessionId)
        } catch (e: Exception) {
            android.util.Log.e("AlarmScheduler", "Failed to cancel study break reminder", e)
        }
    }

    fun adjustForQuietHours(
        triggerEpochMs: Long,
        eventEpochMs: Long,
        quietStartStr: String,
        quietEndStr: String,
        zoneId: ZoneId
    ): Long? {
        val triggerZdt = LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(triggerEpochMs), zoneId)
        val triggerTime = triggerZdt.toLocalTime()

        val startParts = quietStartStr.split(":")
        val endParts = quietEndStr.split(":")
        if (startParts.size < 2 || endParts.size < 2) return triggerEpochMs

        val qStart = LocalTime.of(startParts[0].toInt(), startParts[1].toInt())
        val qEnd = LocalTime.of(endParts[0].toInt(), endParts[1].toInt())

        val inQuietHours = if (qStart.isAfter(qEnd)) {
            // Overnight Quiet Hours e.g. 22:00 -> 07:00
            triggerTime.isAfter(qStart) || triggerTime.isBefore(qEnd) || triggerTime == qStart
        } else {
            // Same day Quiet Hours e.g. 13:00 -> 15:00
            (triggerTime.isAfter(qStart) || triggerTime == qStart) && triggerTime.isBefore(qEnd)
        }

        if (!inQuietHours) return triggerEpochMs

        // Defer trigger to quiet hours end time
        val deferredDate = if (qStart.isAfter(qEnd) && (triggerTime.isAfter(qStart) || triggerTime == qStart)) {
            triggerZdt.toLocalDate().plusDays(1)
        } else {
            triggerZdt.toLocalDate()
        }

        val deferredDateTime = LocalDateTime.of(deferredDate, qEnd)
        val deferredEpochMs = deferredDateTime.atZone(zoneId).toInstant().toEpochMilli()

        // Suppress if the task start time has already passed at quiet hours end
        if (deferredEpochMs >= eventEpochMs) {
            return null
        }

        return deferredEpochMs
    }
}
