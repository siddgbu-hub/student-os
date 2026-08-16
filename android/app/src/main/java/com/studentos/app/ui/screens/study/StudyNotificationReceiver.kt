package com.studentos.app.ui.screens.study

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.studentos.app.data.api.ApiClient
import com.studentos.app.data.local.SessionManager
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class StudyNotificationReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        StudyDebugLogger.logServiceLifecycle("NotificationActionReceived", "action=$action")

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val manager = getOrInitSessionManager(context)
                when (action) {
                    ACTION_STUDY_PAUSE -> {
                        manager.pauseSession()
                    }
                    ACTION_STUDY_RESUME -> {
                        manager.resumeSession()
                    }
                    ACTION_STUDY_STOP -> {
                        manager.stopSession()
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("StudyNotifReceiver", "Error processing study notification action: $action", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun getOrInitSessionManager(context: Context): StudySessionManager {
        val existing = StudySessionManager.getInstanceOrNull()
        if (existing != null) return existing

        val sessionManager = SessionManager(context)
        val apiClient = ApiClient(sessionManager)
        val repository = StudentOsRepository(apiClient, sessionManager, context)
        return StudySessionManager.getInstance(context, repository)
    }

    companion object {
        const val ACTION_STUDY_PAUSE = "com.studentos.app.action.STUDY_PAUSE"
        const val ACTION_STUDY_RESUME = "com.studentos.app.action.STUDY_RESUME"
        const val ACTION_STUDY_STOP = "com.studentos.app.action.STUDY_STOP"
    }
}
