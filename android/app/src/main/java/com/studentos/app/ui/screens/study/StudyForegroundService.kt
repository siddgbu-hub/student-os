package com.studentos.app.ui.screens.study

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.studentos.app.MainActivity
import com.studentos.app.R
import com.studentos.app.notifications.NotificationChannels
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class StudyForegroundService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var tickerJob: Job? = null
    private var notificationManager: NotificationManager? = null

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        NotificationChannels.createChannels(this)
        StudyDebugLogger.logServiceLifecycle("onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        StudyDebugLogger.logTimestampD()
        val action = intent?.action
        StudyDebugLogger.logServiceLifecycle("onStartCommand", "action=$action")

        if (action == ACTION_STOP_SERVICE) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        val manager = StudySessionManager.getInstanceOrNull()
        val sessionState = manager?.sessionState?.value

        // STRICT INVARIANT: Study foreground service & lock-screen notification may exist ONLY while RUNNING
        if (sessionState !is SessionState.Running) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        startForegroundWithNotification(sessionState)
        startTickerLoop()

        return START_NOT_STICKY
    }

    private fun startForegroundWithNotification(state: SessionState.Running) {
        val notification = buildStudyNotification(state)
        StudyDebugLogger.logTimestampE()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            android.util.Log.e("StudyService", "Failed to start foreground service with type", e)
            startForeground(NOTIFICATION_ID, notification)
        }
        StudyDebugLogger.logTimestampF()
    }

    private fun startTickerLoop() {
        tickerJob?.cancel()
        tickerJob = serviceScope.launch {
            // First tick delay: startForeground() already posted initial notification with elapsed=0
            delay(1000L)
            var isFirstUpdate = true
            while (isActive) {
                val manager = StudySessionManager.getInstanceOrNull()
                val state = manager?.sessionState?.value

                // If no longer running, immediately tear down service and remove notification
                if (state !is SessionState.Running) {
                    stopForegroundService()
                    break
                }

                try {
                    val updatedNotification = buildStudyNotification(state)
                    notificationManager?.notify(NOTIFICATION_ID, updatedNotification)
                    if (isFirstUpdate) {
                        StudyDebugLogger.logTimestampG()
                        isFirstUpdate = false
                    }
                } catch (e: Exception) {
                    android.util.Log.e("StudyService", "Failed to update notification ticker", e)
                }

                delay(1000L)
            }
        }
    }

    private fun buildStudyNotification(state: SessionState.Running): Notification {
        val manager = StudySessionManager.getInstanceOrNull()
        val subjectName = state.data.subjectName
        val chapterName = state.data.chapterName

        val elapsedSeconds = manager?.calculateCurrentElapsed(state) ?: 0
        val hours = elapsedSeconds / 3600
        val mins = (elapsedSeconds % 3600) / 60
        val secs = elapsedSeconds % 60
        val timeFormatted = if (hours > 0) {
            String.format("%02d:%02d:%02d", hours, mins, secs)
        } else {
            String.format("%02d:%02d", mins, secs)
        }

        val topicText = if (!chapterName.isNullOrBlank()) "$subjectName • $chapterName" else subjectName
        val statusText = "⏱ $timeFormatted • Studying"

        // Tapping notification opens Study Screen via deep link
        val deepLinkIntent = Intent(Intent.ACTION_VIEW, Uri.parse("studentos://study"), this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            2001,
            deepLinkIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action PendingIntents for Lock Screen Controls (Pause & Stop only while RUNNING)
        val pauseIntent = Intent(this, StudyNotificationReceiver::class.java).apply {
            action = StudyNotificationReceiver.ACTION_STUDY_PAUSE
        }
        val pausePendingIntent = PendingIntent.getBroadcast(
            this,
            2002,
            pauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, StudyNotificationReceiver::class.java).apply {
            action = StudyNotificationReceiver.ACTION_STUDY_STOP
        }
        val stopPendingIntent = PendingIntent.getBroadcast(
            this,
            2004,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, NotificationChannels.CHANNEL_STUDY)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Student OS • Study Session")
            .setContentText("$topicText\n$statusText")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$topicText\n$statusText")
            )
            .setContentIntent(contentPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .addAction(android.R.drawable.ic_media_pause, "Pause", pausePendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)

        return builder.build()
    }

    private fun stopForegroundService() {
        StudyDebugLogger.logServiceLifecycle("stopForegroundService")
        tickerJob?.cancel()
        tickerJob = null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        notificationManager?.cancel(NOTIFICATION_ID)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        StudyDebugLogger.logServiceLifecycle("onDestroy")
        tickerJob?.cancel()
        tickerJob = null
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_OR_UPDATE = "com.studentos.app.action.STUDY_SERVICE_START_OR_UPDATE"
        const val ACTION_STOP_SERVICE = "com.studentos.app.action.STUDY_SERVICE_STOP"

        fun startService(
            context: Context,
            sessionId: String,
            subjectName: String,
            chapterName: String?,
            targetDurationMinutes: Int
        ) {
            val intent = Intent(context, StudyForegroundService::class.java).apply {
                action = ACTION_START_OR_UPDATE
                putExtra("sessionId", sessionId)
                putExtra("subjectName", subjectName)
                putExtra("chapterName", chapterName)
                putExtra("targetDurationMinutes", targetDurationMinutes)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                android.util.Log.e("StudyService", "Failed to startForegroundService", e)
            }
        }

        fun updateServiceState(context: Context) {
            val intent = Intent(context, StudyForegroundService::class.java).apply {
                action = ACTION_START_OR_UPDATE
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                android.util.Log.e("StudyService", "Failed to updateServiceState", e)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, StudyForegroundService::class.java).apply {
                action = ACTION_STOP_SERVICE
            }
            try {
                context.startService(intent)
            } catch (e: Exception) {
                android.util.Log.e("StudyService", "Failed to stopService", e)
            }
        }
    }
}
