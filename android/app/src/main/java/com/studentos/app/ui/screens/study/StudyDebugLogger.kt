package com.studentos.app.ui.screens.study

import android.util.Log
import com.studentos.app.BuildConfig

object StudyDebugLogger {
    private const val TAG = "StudyEngine"

    @Volatile var timestampA: Long = 0L // User taps Start Study
    @Volatile var timestampB: Long = 0L // Local state becomes RUNNING
    @Volatile var timestampC: Long = 0L // startService() invoked
    @Volatile var timestampD: Long = 0L // onStartCommand() entered
    @Volatile var timestampE: Long = 0L // notification constructed
    @Volatile var timestampF: Long = 0L // startForeground() called
    @Volatile var timestampG: Long = 0L // first notification update
    @Volatile var timestampH: Long = 0L // backend request started

    fun logTimestampA() {
        timestampA = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "[StudyPerf:A] User tapped Start Study at tA=$timestampA")
        }
    }

    fun logTimestampB() {
        timestampB = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            val deltaBA = if (timestampA > 0) timestampB - timestampA else 0
            Log.d(TAG, "[StudyPerf:B] State changed to RUNNING at tB=$timestampB (B-A=${deltaBA}ms)")
        }
    }

    fun logTimestampC() {
        timestampC = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            val deltaCA = if (timestampA > 0) timestampC - timestampA else 0
            Log.d(TAG, "[StudyPerf:C] startService() invoked at tC=$timestampC (C-A=${deltaCA}ms)")
        }
    }

    fun logTimestampD() {
        timestampD = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            val deltaDC = if (timestampC > 0) timestampD - timestampC else 0
            Log.d(TAG, "[StudyPerf:D] onStartCommand() entered at tD=$timestampD (D-C=${deltaDC}ms)")
        }
    }

    fun logTimestampE() {
        timestampE = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            val deltaED = if (timestampD > 0) timestampE - timestampD else 0
            Log.d(TAG, "[StudyPerf:E] Notification constructed at tE=$timestampE (E-D=${deltaED}ms)")
        }
    }

    fun logTimestampF() {
        timestampF = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            val deltaFE = if (timestampE > 0) timestampF - timestampE else 0
            val totalLatency = if (timestampA > 0) timestampF - timestampA else 0
            Log.d(TAG, "[StudyPerf:F] startForeground() called at tF=$timestampF (F-E=${deltaFE}ms, Total F-A=${totalLatency}ms)")
        }
    }

    fun logTimestampG() {
        timestampG = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            val deltaGF = if (timestampF > 0) timestampG - timestampF else 0
            Log.d(TAG, "[StudyPerf:G] First notification update posted at tG=$timestampG (G-F=${deltaGF}ms)")
        }
    }

    fun logTimestampH() {
        timestampH = System.currentTimeMillis()
        if (BuildConfig.DEBUG) {
            val deltaHA = if (timestampA > 0) timestampH - timestampA else 0
            Log.d(TAG, "[StudyPerf:H] Backend request started at tH=$timestampH (H-A=${deltaHA}ms)")
        }
    }

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
