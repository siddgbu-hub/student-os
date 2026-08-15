package com.studentos.app.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import com.studentos.app.data.model.EntitlementDto
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

object SubscriptionExpiryScheduler {

    private const val PREFS_NAME = "studentos_subscription_reminders"
    private const val KEY_LAST_SCHEDULED_EXPIRES_AT = "last_scheduled_expires_at"

    const val ENTITY_3_DAYS = "3_days"
    const val ENTITY_1_DAY = "1_day"
    const val ENTITY_EXPIRED = "expired"

    /**
     * Schedules 3-day, 1-day, and on-expiry reminder notifications based on server-provided expiresAt.
     * Prevents duplicate scheduling and automatically replaces old alarms if expiresAt changes.
     */
    fun scheduleSubscriptionExpiryReminders(
        context: Context,
        entitlement: EntitlementDto?
    ) {
        val prefs = getPrefs(context)

        // Only active paid subscriptions (monthly or yearly) receive Pro expiry reminders
        if (entitlement == null || !entitlement.isPaid || !entitlement.isActive || entitlement.expiresAt.isNullOrBlank()) {
            cancelSubscriptionExpiryReminders(context)
            return
        }

        val expiresAt = entitlement.expiresAt
        val lastScheduled = prefs.getString(KEY_LAST_SCHEDULED_EXPIRES_AT, null)

        // Avoid re-scheduling if already scheduled for the exact same expiry date
        if (lastScheduled == expiresAt) {
            return
        }

        // Cancel previous reminders if expiry date has changed
        cancelSubscriptionExpiryReminders(context)

        val expiryEpochMs = parseIsoToEpochMs(expiresAt) ?: return
        val nowMs = System.currentTimeMillis()

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        // A. 3 Days Before Expiry
        val trigger3DaysMs = expiryEpochMs - (3L * 24 * 60 * 60 * 1000)
        if (trigger3DaysMs > nowMs) {
            scheduleAlarm(
                context = context,
                alarmManager = alarmManager,
                triggerEpochMs = trigger3DaysMs,
                entityId = ENTITY_3_DAYS,
                title = "Your Student OS Pro access ends soon",
                text = "Your Pro access ends in 3 days. Renew to keep your study workspace fully unlocked."
            )
        }

        // B. 1 Day Before Expiry
        val trigger1DayMs = expiryEpochMs - (1L * 24 * 60 * 60 * 1000)
        if (trigger1DayMs > nowMs) {
            scheduleAlarm(
                context = context,
                alarmManager = alarmManager,
                triggerEpochMs = trigger1DayMs,
                entityId = ENTITY_1_DAY,
                title = "Student OS Pro ends tomorrow",
                text = "Your Pro access ends tomorrow. Renew to continue using Student OS without interruption."
            )
        }

        // C. On Expiry
        val triggerExpiryMs = expiryEpochMs
        if (triggerExpiryMs > nowMs) {
            scheduleAlarm(
                context = context,
                alarmManager = alarmManager,
                triggerEpochMs = triggerExpiryMs,
                entityId = ENTITY_EXPIRED,
                title = "Your Student OS Pro access has ended",
                text = "Your study data is safe. Upgrade again to continue full access."
            )
        }

        // Save last scheduled expiry timestamp
        prefs.edit().putString(KEY_LAST_SCHEDULED_EXPIRES_AT, expiresAt).apply()
    }

    /**
     * Cancels all pending subscription expiry reminder alarms.
     */
    fun cancelSubscriptionExpiryReminders(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val entities = listOf(ENTITY_3_DAYS, ENTITY_1_DAY, ENTITY_EXPIRED)
        for (entity in entities) {
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra(AlarmReceiver.EXTRA_TYPE, "subscription")
                putExtra(AlarmReceiver.EXTRA_ENTITY_ID, entity)
            }
            val requestCode = NotificationHelper.generateNotificationId("subscription", entity)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }

        getPrefs(context).edit().remove(KEY_LAST_SCHEDULED_EXPIRES_AT).apply()
    }

    private fun scheduleAlarm(
        context: Context,
        alarmManager: AlarmManager,
        triggerEpochMs: Long,
        entityId: String,
        title: String,
        text: String
    ) {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra(AlarmReceiver.EXTRA_TYPE, "subscription")
            putExtra(AlarmReceiver.EXTRA_ENTITY_ID, entityId)
            putExtra(AlarmReceiver.EXTRA_TITLE, title)
            putExtra(AlarmReceiver.EXTRA_TEXT, text)
        }
        val requestCode = NotificationHelper.generateNotificationId("subscription", entityId)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
            }
        } catch (e: SecurityException) {
            // Handle devices where exact alarms permission might be restricted
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerEpochMs, pendingIntent)
        }
    }

    fun parseIsoToEpochMs(isoStr: String): Long? {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val cleanIso = isoStr.replace("Z", "").substringBefore(".")
            sdf.parse(cleanIso)?.time
        } catch (e: Exception) {
            null
        }
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
}
