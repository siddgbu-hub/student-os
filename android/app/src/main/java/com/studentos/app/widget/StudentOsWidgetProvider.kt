package com.studentos.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.studentos.app.MainActivity
import com.studentos.app.R
import com.studentos.app.data.api.ApiClient
import com.studentos.app.data.local.SessionManager
import com.studentos.app.data.model.calculateElapsedSeconds
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class StudentOsWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_START_STUDY = "com.studentos.app.action.START_STUDY"
        const val ACTION_PAUSE_STUDY = "com.studentos.app.action.PAUSE_STUDY"
        const val ACTION_RESUME_STUDY = "com.studentos.app.action.RESUME_STUDY"
        const val ACTION_COMPLETE_STUDY = "com.studentos.app.action.COMPLETE_STUDY"
        const val ACTION_UPDATE_WIDGET = "com.studentos.app.action.UPDATE_WIDGET"
        const val ACTION_PIN_WIDGET = "com.studentos.app.action.PIN_WIDGET"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, StudentOsWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isNotEmpty()) {
                val intent = Intent(context, StudentOsWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(intent)
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                for (appWidgetId in appWidgetIds) {
                    renderWidget(context, appWidgetManager, appWidgetId)
                }
            } catch (e: Exception) {
                android.util.Log.e("StudentOsWidget", "Error in onUpdate", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val action = intent.action ?: return

        when (action) {
            ACTION_START_STUDY -> handleStartStudy(context)
            ACTION_PAUSE_STUDY -> handlePauseStudy(context)
            ACTION_RESUME_STUDY -> handleResumeStudy(context)
            ACTION_COMPLETE_STUDY -> handleCompleteStudy(context)
            ACTION_UPDATE_WIDGET -> updateAllWidgets(context)
            ACTION_PIN_WIDGET -> handlePinWidget(context)
        }
    }

    private fun handlePinWidget(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val myProvider = ComponentName(context, StudentOsWidgetProvider::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && appWidgetManager.isRequestPinAppWidgetSupported) {
            appWidgetManager.requestPinAppWidget(myProvider, null, null)
        }
    }

    private fun handleStartStudy(context: Context) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val sessionManager = SessionManager(context)
                val apiClient = ApiClient(sessionManager)
                val repository = StudentOsRepository(apiClient, sessionManager, context)

                if (sessionManager.getToken().isNullOrEmpty()) {
                    openApp(context)
                    return@launch
                }

                val activeSession = repository.getActiveStudySession().getOrNull()
                if (activeSession == null) {
                    val subjects = repository.getSubjects().getOrNull() ?: emptyList()
                    val defaultSub = subjects.firstOrNull()
                    if (defaultSub != null) {
                        repository.startStudySession(defaultSub.id, null)
                    } else {
                        openApp(context)
                        return@launch
                    }
                }
                updateAllWidgets(context)
            } catch (e: Exception) {
                android.util.Log.e("StudentOsWidget", "Error starting study", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun handlePauseStudy(context: Context) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val sessionManager = SessionManager(context)
                val apiClient = ApiClient(sessionManager)
                val repository = StudentOsRepository(apiClient, sessionManager, context)

                val activeSession = repository.getActiveStudySession().getOrNull()
                if (activeSession != null) {
                    repository.pauseStudySession(activeSession.id)
                }
                updateAllWidgets(context)
            } catch (e: Exception) {
                android.util.Log.e("StudentOsWidget", "Error pausing study", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun handleResumeStudy(context: Context) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val sessionManager = SessionManager(context)
                val apiClient = ApiClient(sessionManager)
                val repository = StudentOsRepository(apiClient, sessionManager, context)

                val activeSession = repository.getActiveStudySession().getOrNull()
                if (activeSession != null) {
                    repository.resumeStudySession(activeSession.id)
                }
                updateAllWidgets(context)
            } catch (e: Exception) {
                android.util.Log.e("StudentOsWidget", "Error resuming study", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun handleCompleteStudy(context: Context) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val sessionManager = SessionManager(context)
                val apiClient = ApiClient(sessionManager)
                val repository = StudentOsRepository(apiClient, sessionManager, context)

                val activeSession = repository.getActiveStudySession().getOrNull()
                if (activeSession != null) {
                    repository.stopStudySession(activeSession.id, activeSession.durationSeconds)
                }
                updateAllWidgets(context)
            } catch (e: Exception) {
                android.util.Log.e("StudentOsWidget", "Error completing study", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private suspend fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

        val layoutId = when {
            minWidth >= 250 && minHeight >= 250 -> R.layout.widget_large
            minWidth >= 220 -> R.layout.widget_medium
            else -> R.layout.widget_small
        }

        val views = RemoteViews(context.packageName, layoutId)
        val sessionManager = SessionManager(context)
        val apiClient = ApiClient(sessionManager)
        val repository = StudentOsRepository(apiClient, sessionManager, context)

        val token = try { sessionManager.getToken() } catch (e: Exception) { null }
        if (token.isNullOrEmpty()) {
            views.setTextViewText(R.id.widget_title, "Student OS")
            views.setTextViewText(R.id.widget_subject_text, "Sign in to continue")
            views.setTextViewText(R.id.widget_study_time, "Session Inactive")
            views.setTextViewText(R.id.widget_remaining_goal, "Tap to authenticate")
            views.setViewVisibility(R.id.widget_btn_start, View.VISIBLE)
            views.setTextViewText(R.id.widget_btn_start, "Open Student OS")
            views.setViewVisibility(R.id.widget_active_controls, View.GONE)
            views.setOnClickPendingIntent(R.id.widget_btn_start, getOpenAppPendingIntent(context))
            appWidgetManager.updateAppWidget(appWidgetId, views)
            return
        }

        val activeSession = try { repository.getActiveStudySession().getOrNull() } catch (e: Exception) { null }
        val todaySummary = try { repository.getTodaySessionsSummary().getOrNull() } catch (e: Exception) { null }

        val totalMinutes = (todaySummary?.totalDurationSeconds ?: 0) / 60
        val targetMinutes = 120
        val remainingMinutes = (targetMinutes - totalMinutes).coerceAtLeast(0)

        val isRunning = activeSession != null && (activeSession.status == "running" || activeSession.status == "in_progress")
        val isPaused = activeSession != null && activeSession.status == "paused"

        if (activeSession != null) {
            val subjects = try { repository.getSubjects().getOrNull() ?: emptyList() } catch (e: Exception) { emptyList() }
            val subjectName = subjects.find { it.id == activeSession.subjectId }?.name ?: "Focused Study"
            val durationSecs = activeSession.calculateElapsedSeconds()
            val elapsedFormatted = String.format("%02d:%02d", durationSecs / 60, durationSecs % 60)
            val remSecs = ((45 * 60) - durationSecs).coerceAtLeast(0)
            val remFormatted = String.format("%02d:%02d", remSecs / 60, remSecs % 60)

            views.setTextViewText(R.id.widget_subject_text, subjectName)

            if (isRunning) {
                views.setTextViewText(R.id.widget_title, "Student OS")
                
                val baseTimeMs = android.os.SystemClock.elapsedRealtime() - (durationSecs * 1000L)
                val targetEndTimeMs = android.os.SystemClock.elapsedRealtime() + (remSecs * 1000L)

                views.setViewVisibility(R.id.widget_study_time, View.GONE)
                views.setViewVisibility(R.id.widget_chronometer, View.VISIBLE)
                views.setChronometer(R.id.widget_chronometer, baseTimeMs, "⏱ %s elapsed", true)

                if (remSecs > 0 && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                    views.setViewVisibility(R.id.widget_remaining_goal, View.GONE)
                    views.setViewVisibility(R.id.widget_countdown_chronometer, View.VISIBLE)
                    views.setChronometerCountDown(R.id.widget_countdown_chronometer, true)
                    views.setChronometer(R.id.widget_countdown_chronometer, targetEndTimeMs, "⏳ %s remaining", true)
                } else {
                    views.setViewVisibility(R.id.widget_remaining_goal, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_countdown_chronometer, View.GONE)
                    views.setTextViewText(R.id.widget_remaining_goal, if (remSecs <= 0) "⏳ Target Reached!" else "⏳ $remFormatted remaining")
                }

                views.setViewVisibility(R.id.widget_btn_start, View.GONE)
                views.setViewVisibility(R.id.widget_active_controls, View.VISIBLE)
                views.setViewVisibility(R.id.widget_btn_pause, View.VISIBLE)
                views.setViewVisibility(R.id.widget_btn_resume, View.GONE)

                views.setOnClickPendingIntent(R.id.widget_btn_pause, getPendingIntent(context, ACTION_PAUSE_STUDY))
                views.setOnClickPendingIntent(R.id.widget_btn_complete, getPendingIntent(context, ACTION_COMPLETE_STUDY))

            } else if (isPaused) {
                views.setTextViewText(R.id.widget_title, "Student OS")
                views.setViewVisibility(R.id.widget_chronometer, View.GONE)
                views.setViewVisibility(R.id.widget_countdown_chronometer, View.GONE)
                views.setViewVisibility(R.id.widget_study_time, View.VISIBLE)
                views.setViewVisibility(R.id.widget_remaining_goal, View.VISIBLE)

                views.setTextViewText(R.id.widget_study_time, "⏱ $elapsedFormatted (Paused)")
                views.setTextViewText(R.id.widget_remaining_goal, "⏳ $remFormatted remaining")

                views.setViewVisibility(R.id.widget_btn_start, View.GONE)
                views.setViewVisibility(R.id.widget_active_controls, View.VISIBLE)
                views.setViewVisibility(R.id.widget_btn_pause, View.GONE)
                views.setViewVisibility(R.id.widget_btn_resume, View.VISIBLE)

                views.setOnClickPendingIntent(R.id.widget_btn_resume, getPendingIntent(context, ACTION_RESUME_STUDY))
                views.setOnClickPendingIntent(R.id.widget_btn_complete, getPendingIntent(context, ACTION_COMPLETE_STUDY))
            }
        } else {
            // IDLE State
            views.setTextViewText(R.id.widget_title, "Student OS")
            views.setTextViewText(R.id.widget_subject_text, "Today's Progress")
            views.setViewVisibility(R.id.widget_chronometer, View.GONE)
            views.setViewVisibility(R.id.widget_countdown_chronometer, View.GONE)
            views.setViewVisibility(R.id.widget_study_time, View.VISIBLE)
            views.setViewVisibility(R.id.widget_remaining_goal, View.VISIBLE)

            views.setTextViewText(R.id.widget_study_time, "${totalMinutes}m studied today")
            views.setTextViewText(R.id.widget_remaining_goal, "${remainingMinutes}m remaining")

            views.setViewVisibility(R.id.widget_btn_start, View.VISIBLE)
            views.setTextViewText(R.id.widget_btn_start, "▶ Start Study")
            views.setViewVisibility(R.id.widget_active_controls, View.GONE)

            views.setOnClickPendingIntent(R.id.widget_btn_start, getPendingIntent(context, ACTION_START_STUDY))
        }

        val appIntent = getOpenAppPendingIntent(context)
        views.setOnClickPendingIntent(R.id.widget_small_root, appIntent)
        if (layoutId == R.layout.widget_medium) {
            views.setOnClickPendingIntent(R.id.widget_medium_root, appIntent)
        } else if (layoutId == R.layout.widget_large) {
            views.setOnClickPendingIntent(R.id.widget_large_root, appIntent)
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun getPendingIntent(context: Context, action: String): PendingIntent {
        val intent = Intent(context, StudentOsWidgetProvider::class.java).apply {
            this.action = action
        }
        return PendingIntent.getBroadcast(
            context,
            action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun getOpenAppPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun openApp(context: Context) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        context.startActivity(intent)
    }
}
