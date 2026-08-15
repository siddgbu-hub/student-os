package com.studentos.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val type = intent.getStringExtra(EXTRA_TYPE) ?: return
        val entityId = intent.getStringExtra(EXTRA_ENTITY_ID) ?: return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: ""
        val subjectName = intent.getStringExtra(EXTRA_SUBJECT_NAME)
        val dateStr = intent.getStringExtra(EXTRA_DATE_STR) ?: ""
        val showPrivate = intent.getBooleanExtra(EXTRA_SHOW_PRIVATE, false)

        when (type) {
            "planner" -> {
                NotificationHelper.showPlannerTaskNotification(
                    context,
                    taskId = entityId,
                    taskTitle = title,
                    subjectName = subjectName,
                    dateStr = dateStr,
                    showPrivateDetails = showPrivate
                )
            }
            "study_break" -> {
                val intervalMins = intent.getIntExtra(EXTRA_INTERVAL_MINS, 50)
                NotificationHelper.showStudyBreakNotification(context, intervalMins)
            }
            "subscription" -> {
                val text = intent.getStringExtra(EXTRA_TEXT) ?: ""
                NotificationHelper.showSubscriptionExpiryNotification(
                    context,
                    expiryType = entityId,
                    title = title,
                    text = text
                )
            }
        }
    }

    companion object {
        const val EXTRA_TYPE = "extra_type"
        const val EXTRA_ENTITY_ID = "extra_entity_id"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_TEXT = "extra_text"
        const val EXTRA_SUBJECT_NAME = "extra_subject_name"
        const val EXTRA_DATE_STR = "extra_date_str"
        const val EXTRA_SHOW_PRIVATE = "extra_show_private"
        const val EXTRA_INTERVAL_MINS = "extra_interval_mins"
    }
}
