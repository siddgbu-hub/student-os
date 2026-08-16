package com.studentos.app.ui.screens.study

import android.util.Log
import com.studentos.app.BuildConfig

object StudyDebugLogger {
    private const val TAG = "StudyEngine"

    fun logStart(sessionId: String, subjectName: String, targetMins: Int) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "[StudySession:START] sessionId=$sessionId subject='$subjectName' targetMins=$targetMins timestamp=${System.currentTimeMillis()}")
        }
    }

    fun logPause(sessionId: String, elapsedSeconds: Int) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "[StudySession:PAUSE] sessionId=$sessionId elapsedSeconds=$elapsedSeconds timestamp=${System.currentTimeMillis()}")
        }
    }

    fun logResume(sessionId: String, totalPausedSeconds: Int) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "[StudySession:RESUME] sessionId=$sessionId totalPausedSeconds=$totalPausedSeconds timestamp=${System.currentTimeMillis()}")
        }
    }

    fun logStopRequest(sessionId: String, durationSeconds: Int, isRetry: Boolean = false) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "[StudySession:STOP_REQUEST] sessionId=$sessionId durationSeconds=$durationSeconds isRetry=$isRetry timestamp=${System.currentTimeMillis()}")
        }
    }

    fun logStopSuccess(sessionId: String, finalDuration: Int, wasIdempotent: Boolean = false) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "[StudySession:STOP_SUCCESS] sessionId=$sessionId finalDuration=$finalDuration wasIdempotent=$wasIdempotent timestamp=${System.currentTimeMillis()}")
        }
    }

    fun logStopRetry(sessionId: String, attempt: Int, reason: String) {
        if (BuildConfig.DEBUG) {
            Log.w(TAG, "[StudySession:STOP_RETRY] sessionId=$sessionId attempt=$attempt reason='$reason' timestamp=${System.currentTimeMillis()}")
        }
    }

    fun logStopFailure(sessionId: String, errorCode: String?, errorMessage: String?) {
        if (BuildConfig.DEBUG) {
            Log.e(TAG, "[StudySession:STOP_FAILURE] sessionId=$sessionId errorCode=$errorCode error='$errorMessage' timestamp=${System.currentTimeMillis()}")
        }
    }

    fun logServiceLifecycle(event: String, details: String = "") {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "[StudyService:$event] $details timestamp=${System.currentTimeMillis()}")
        }
    }
}
