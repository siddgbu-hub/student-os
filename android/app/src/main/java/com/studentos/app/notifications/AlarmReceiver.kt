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
                val sessionId = entityId
                val intervalMins = intent.getIntExtra(EXTRA_INTERVAL_MINS, 50)
                val expectedRunningSecs = intent.getIntExtra(EXTRA_EXPECTED_RUNNING_SECS, intervalMins * 60)

                // Authoritative Invariant Validation:
                // 1. Session must exist
                // 2. Session ID must match
                // 3. State must be strictly RUNNING
                // 4. Accumulated running duration must reach the required break threshold
                val manager = com.studentos.app.ui.screens.study.StudySessionManager.getInstanceOrNull()
                val currentState = manager?.sessionState?.value

                if (currentState is com.studentos.app.ui.screens.study.SessionState.Running) {
                    val currentSessionId = currentState.data.session.id
                    val isMatchingSession = currentSessionId == sessionId ||
                            sessionId.startsWith("local_") ||
                            currentSessionId.startsWith("local_")

                    if (isMatchingSession) {
                        val currentElapsed = manager.calculateCurrentElapsed(currentState)
                        if (currentElapsed >= expectedRunningSecs) {
                            NotificationHelper.showStudyBreakNotification(context, intervalMins)
                        } else {
                            android.util.Log.d(
                                "AlarmReceiver",
                                "Break alarm dropped: accumulated running time ($currentElapsed s) < required threshold ($expectedRunningSecs s)"
                            )
                        }
                    } else {
                        android.util.Log.d(
                            "AlarmReceiver",
                            "Break alarm dropped: session ID mismatch (intent=$sessionId, current=$currentSessionId)"
                        )
                    }
                } else {
                    android.util.Log.d(
                        "AlarmReceiver",
                        "Break alarm dropped: session is not in RUNNING state (state=$currentState)"
                    )
                }
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
        const val EXTRA_EXPECTED_RUNNING_SECS = "extra_expected_running_secs"
    }
}
