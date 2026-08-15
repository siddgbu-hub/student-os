package com.studentos.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.studentos.app.data.api.ApiClient
import com.studentos.app.data.local.SessionManager
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == Intent.ACTION_TIMEZONE_CHANGED ||
            action == Intent.ACTION_TIME_CHANGED
        ) {
            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val sessionManager = SessionManager(context)
                    val apiClient = ApiClient(sessionManager)
                    val repository = StudentOsRepository(apiClient, sessionManager, context)

                    if (!sessionManager.getToken().isNullOrEmpty()) {
                        val preferences = repository.getUserPreferences().getOrNull()
                        val todayStr = LocalDate.now().toString()
                        val tasks = repository.getDailyPlan(todayStr).getOrNull()?.tasks ?: emptyList()

                        for (task in tasks) {
                            AlarmScheduler.scheduleTaskReminder(context, task, preferences)
                        }

                        val entitlement = repository.getEntitlementStatus().getOrNull()
                        SubscriptionExpiryScheduler.scheduleSubscriptionExpiryReminders(context, entitlement)
                    }
                } catch (e: Exception) {
                    android.util.Log.e("BootReceiver", "Error rescheduling notifications on boot", e)
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}
