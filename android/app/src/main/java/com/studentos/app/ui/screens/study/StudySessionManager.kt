package com.studentos.app.ui.screens.study

import android.content.Context
import com.studentos.app.data.model.ChapterDto
import com.studentos.app.data.model.StudySessionDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.data.model.calculateElapsedSeconds
import com.studentos.app.data.repository.StudentOsRepository
import com.studentos.app.notifications.AlarmScheduler
import com.studentos.app.widget.StudentOsWidgetProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.Instant
import java.util.UUID

data class ActiveStudySessionData(
    val session: StudySessionDto,
    val subjectName: String,
    val chapterName: String?,
    val baseElapsedSeconds: Int,
    val activeStartedAtMs: Long,
    val targetDurationMinutes: Int
)

sealed class SessionState {
    data object Idle : SessionState()
    data object Starting : SessionState()
    data class Running(val data: ActiveStudySessionData) : SessionState()
    data class Paused(val data: ActiveStudySessionData, val pausedElapsedSeconds: Int) : SessionState()
    data class Ending(val sessionId: String, val finalDurationSeconds: Int) : SessionState()
}

class StudySessionManager private constructor(
    private val context: Context,
    private val repository: StudentOsRepository
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val stateMutex = Mutex()

    private val _sessionState = MutableStateFlow<SessionState>(SessionState.Idle)
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    private val _sessionErrors = MutableSharedFlow<Throwable>(extraBufferCapacity = 8)
    val sessionErrors: SharedFlow<Throwable> = _sessionErrors.asSharedFlow()

    init {
        scope.launch {
            repository.entitlementState.collect { ent ->
                if (ent?.status == "expired") {
                    terminateSessionOnExpiry()
                }
            }
        }
    }

    suspend fun terminateSessionOnExpiry() = stateMutex.withLock {
        val current = _sessionState.value
        if (current is SessionState.Running || current is SessionState.Paused) {
            val elapsed = calculateCurrentElapsed(current)
            val sessionId = when (current) {
                is SessionState.Running -> current.data.session.id
                is SessionState.Paused -> current.data.session.id
                else -> null
            }
            finalizeSessionStop()
            if (sessionId != null && !sessionId.startsWith("local_")) {
                scope.launch {
                    repository.stopStudySession(sessionId, elapsed)
                }
            }
            StudyDebugLogger.logStopFailure(sessionId ?: "active_session", "TRIAL_EXPIRED", "Entitlement expired during active session")
            _sessionErrors.tryEmit(IllegalStateException("TRIAL_EXPIRED: Access expired. Please upgrade to continue."))
        }
    }

    fun calculateCurrentElapsed(state: SessionState = _sessionState.value): Int {
        return when (state) {
            is SessionState.Running -> {
                val diffSecs = ((System.currentTimeMillis() - state.data.activeStartedAtMs) / 1000).toInt().coerceAtLeast(0)
                state.data.baseElapsedSeconds + diffSecs
            }
            is SessionState.Paused -> state.pausedElapsedSeconds
            is SessionState.Ending -> state.finalDurationSeconds
            else -> 0
        }
    }

    suspend fun startSession(
        subject: SubjectDto,
        chapter: ChapterDto?,
        targetMinutes: Int
    ): Result<StudySessionDto> = stateMutex.withLock {
        val currentEntitlement = repository.entitlementState.value
        if (currentEntitlement?.status == "expired") {
            return Result.failure(IllegalStateException("TRIAL_EXPIRED: Your trial or subscription has expired. Please upgrade to continue."))
        }

        val currentState = _sessionState.value
        if (currentState is SessionState.Running || currentState is SessionState.Paused || currentState is SessionState.Starting) {
            return Result.failure(IllegalStateException("A study session is already active or starting"))
        }

        // 1. Immediately establish local authoritative start timestamp & optimistic session
        val now = System.currentTimeMillis()
        val optimisticId = "local_${UUID.randomUUID()}"
        val nowIso = Instant.ofEpochMilli(now).toString()
        val optimisticSession = StudySessionDto(
            id = optimisticId,
            accountId = "",
            subjectId = subject.id,
            chapterId = chapter?.id,
            startTime = nowIso,
            status = "running",
            createdAt = nowIso,
            updatedAt = nowIso
        )

        val runningData = ActiveStudySessionData(
            session = optimisticSession,
            subjectName = subject.name,
            chapterName = chapter?.name,
            baseElapsedSeconds = 0,
            activeStartedAtMs = now,
            targetDurationMinutes = targetMinutes
        )

        // 2. Immediately transition local state to RUNNING (Fast-path UX)
        _sessionState.value = SessionState.Running(runningData)
        StudyDebugLogger.logTimestampB()
        StudyDebugLogger.logStart(optimisticId, subject.name, targetMinutes)

        // 3. Immediately launch foreground service & lock-screen notification FIRST
        StudyDebugLogger.logTimestampC()
        StudyForegroundService.startService(
            context = context,
            sessionId = optimisticId,
            subjectName = subject.name,
            chapterName = chapter?.name,
            targetDurationMinutes = targetMinutes
        )

        // Schedule initial break reminder for optimistic session
        scope.launch {
            scheduleBreakReminderForRunningSession(optimisticId, 0)
        }

        // 4. Update widgets (non-blocking)
        StudentOsWidgetProvider.updateAllWidgets(context)

        // 5. Asynchronously synchronize with backend in background
        scope.launch {
            StudyDebugLogger.logTimestampH()
            val result = repository.startStudySession(subject.id, chapter?.id)
            stateMutex.withLock {
                val stateAfterNetwork = _sessionState.value
                result.fold(
                    onSuccess = { realSession ->
                        cancelBreakReminderForSession(optimisticId)
                        when (stateAfterNetwork) {
                            is SessionState.Running -> {
                                if (stateAfterNetwork.data.session.id == optimisticId) {
                                    // Preserve elapsed-time continuity (do NOT reset activeStartedAtMs)
                                    val updatedData = stateAfterNetwork.data.copy(session = realSession)
                                    _sessionState.value = SessionState.Running(updatedData)
                                    StudyDebugLogger.logStart(realSession.id, subject.name, targetMinutes)
                                    StudentOsWidgetProvider.updateAllWidgets(context)
                                    val runningElapsed = calculateCurrentElapsed(SessionState.Running(updatedData))
                                    scope.launch {
                                        scheduleBreakReminderForRunningSession(realSession.id, runningElapsed)
                                    }
                                }
                            }
                            is SessionState.Paused -> {
                                if (stateAfterNetwork.data.session.id == optimisticId) {
                                    val updatedData = stateAfterNetwork.data.copy(session = realSession)
                                    _sessionState.value = SessionState.Paused(updatedData, stateAfterNetwork.pausedElapsedSeconds)
                                    StudentOsWidgetProvider.updateAllWidgets(context)
                                    scope.launch {
                                        repository.pauseStudySession(realSession.id)
                                    }
                                }
                            }
                            is SessionState.Ending -> {
                                if (stateAfterNetwork.sessionId == optimisticId) {
                                    _sessionState.value = SessionState.Ending(realSession.id, stateAfterNetwork.finalDurationSeconds)
                                    scope.launch {
                                        repository.stopStudySession(realSession.id, stateAfterNetwork.finalDurationSeconds)
                                    }
                                }
                            }
                            is SessionState.Idle -> {
                                scope.launch {
                                    repository.cancelStudySession(realSession.id)
                                }
                            }
                            else -> {}
                        }
                    },
                    onFailure = { err ->
                        cancelBreakReminderForSession(optimisticId)
                        // Safely rollback to Idle if still on the optimistic session
                        val current = _sessionState.value
                        val isStillOptimistic = when (current) {
                            is SessionState.Running -> current.data.session.id == optimisticId
                            is SessionState.Paused -> current.data.session.id == optimisticId
                            is SessionState.Ending -> current.sessionId == optimisticId
                            else -> false
                        }
                        if (isStillOptimistic) {
                            _sessionState.value = SessionState.Idle
                            StudyForegroundService.stopService(context)
                            StudentOsWidgetProvider.updateAllWidgets(context)
                            StudyDebugLogger.logStopFailure("optimistic_start", "START_ERROR", err.message)
                            _sessionErrors.tryEmit(err)
                        }
                    }
                )
            }
        }

        return Result.success(optimisticSession)
    }

    suspend fun pauseSession(): Result<StudySessionDto> = stateMutex.withLock {
        val currentState = _sessionState.value
        // Idempotency: If already paused, return success immediately
        if (currentState is SessionState.Paused) {
            return Result.success(currentState.data.session)
        }
        if (currentState !is SessionState.Running) {
            return Result.failure(IllegalStateException("Cannot pause when no session is running"))
        }

        val elapsed = calculateCurrentElapsed(currentState)
        val data = currentState.data
        val sessionId = data.session.id

        // Cancel pending break alarm on pause
        cancelBreakReminderForSession(sessionId)

        // Optimistically set paused in state holder
        val pausedData = data.copy(baseElapsedSeconds = elapsed)
        _sessionState.value = SessionState.Paused(pausedData, elapsed)
        StudyDebugLogger.logPause(sessionId, elapsed)

        // STRICT INVARIANT: Remove notification and stop foreground service when paused
        StudyForegroundService.stopService(context)
        StudentOsWidgetProvider.updateAllWidgets(context)

        if (sessionId.startsWith("local_")) {
            return Result.success(data.session)
        }

        val result = repository.pauseStudySession(sessionId)
        return result.fold(
            onSuccess = { updatedSession ->
                _sessionState.value = SessionState.Paused(pausedData.copy(session = updatedSession), elapsed)
                Result.success(updatedSession)
            },
            onFailure = { err ->
                // If the error was because the session was already finished/paused, accept gracefully
                if (err.message?.contains("already", ignoreCase = true) == true) {
                    Result.success(data.session)
                } else {
                    // Revert to running if server rejected pause
                    val now = System.currentTimeMillis()
                    val resumedData = data.copy(baseElapsedSeconds = elapsed, activeStartedAtMs = now)
                    _sessionState.value = SessionState.Running(resumedData)
                    StudyForegroundService.startService(
                        context = context,
                        sessionId = sessionId,
                        subjectName = data.subjectName,
                        chapterName = data.chapterName,
                        targetDurationMinutes = data.targetDurationMinutes
                    )
                    scope.launch {
                        scheduleBreakReminderForRunningSession(sessionId, elapsed)
                    }
                    Result.failure(err)
                }
            }
        )
    }

    suspend fun resumeSession(): Result<StudySessionDto> = stateMutex.withLock {
        val currentEntitlement = repository.entitlementState.value
        if (currentEntitlement?.status == "expired") {
            terminateSessionOnExpiry()
            return Result.failure(IllegalStateException("TRIAL_EXPIRED: Your trial or subscription has expired. Please upgrade to continue."))
        }

        val currentState = _sessionState.value
        // Idempotency: If already running, return success immediately
        if (currentState is SessionState.Running) {
            return Result.success(currentState.data.session)
        }
        if (currentState !is SessionState.Paused) {
            return Result.failure(IllegalStateException("Cannot resume when session is not paused"))
        }

        val now = System.currentTimeMillis()
        val data = currentState.data
        val sessionId = data.session.id
        val elapsed = currentState.pausedElapsedSeconds

        val runningData = data.copy(
            baseElapsedSeconds = elapsed,
            activeStartedAtMs = now
        )
        _sessionState.value = SessionState.Running(runningData)
        StudyDebugLogger.logResume(sessionId, data.session.pauseDurationSeconds)

        // Reschedule break reminder for remaining running duration
        scope.launch {
            scheduleBreakReminderForRunningSession(sessionId, elapsed)
        }

        // STRICT INVARIANT: Start foreground service and create exactly ONE notification on resume
        StudyForegroundService.startService(
            context = context,
            sessionId = sessionId,
            subjectName = data.subjectName,
            chapterName = data.chapterName,
            targetDurationMinutes = data.targetDurationMinutes
        )
        StudentOsWidgetProvider.updateAllWidgets(context)

        if (sessionId.startsWith("local_")) {
            return Result.success(runningData.session)
        }

        val result = repository.resumeStudySession(sessionId)
        return result.fold(
            onSuccess = { updatedSession ->
                _sessionState.value = SessionState.Running(runningData.copy(session = updatedSession))
                Result.success(updatedSession)
            },
            onFailure = { err ->
                val msg = err.message ?: ""
                if (msg.contains("TRIAL_EXPIRED", ignoreCase = true) ||
                    msg.contains("SUBSCRIPTION_REQUIRED", ignoreCase = true) ||
                    msg.contains("403")
                ) {
                    repository.markEntitlementExpired()
                    terminateSessionOnExpiry()
                    Result.failure(err)
                } else if (msg.contains("already", ignoreCase = true)) {
                    Result.success(data.session)
                } else {
                    // Revert to paused if resume rejected
                    cancelBreakReminderForSession(sessionId)
                    _sessionState.value = SessionState.Paused(data, elapsed)
                    StudyForegroundService.stopService(context)
                    Result.failure(err)
                }
            }
        )
    }

    suspend fun stopSession(): Result<StudySessionDto> = stateMutex.withLock {
        val currentState = _sessionState.value
        if (currentState is SessionState.Ending) {
            // Already ending; ignore duplicate calls
            return Result.success(StudySessionDto(
                id = currentState.sessionId,
                accountId = "",
                subjectId = "",
                startTime = "",
                status = "completed",
                createdAt = "",
                updatedAt = ""
            ))
        }
        if (currentState !is SessionState.Running && currentState !is SessionState.Paused) {
            return Result.failure(IllegalStateException("No active study session to complete"))
        }

        val elapsed = calculateCurrentElapsed(currentState)
        val data = when (currentState) {
            is SessionState.Running -> currentState.data
            is SessionState.Paused -> currentState.data
            else -> return Result.failure(IllegalStateException("Invalid state for completion"))
        }
        val sessionId = data.session.id

        // Cancel pending break alarm on stop
        cancelBreakReminderForSession(sessionId)

        // Enter ENDING state to guard against duplicate clicks or parallel requests
        _sessionState.value = SessionState.Ending(sessionId, elapsed)
        StudyDebugLogger.logStopRequest(sessionId, elapsed)

        if (sessionId.startsWith("local_")) {
            finalizeSessionStop()
            return Result.success(data.session.copy(status = "completed", durationSeconds = elapsed))
        }

        var lastError: Throwable? = null
        for (attempt in 1..2) {
            val res = repository.stopStudySession(sessionId, elapsed)
            if (res.isSuccess) {
                val completed = res.getOrThrow()
                StudyDebugLogger.logStopSuccess(sessionId, completed.durationSeconds)
                finalizeSessionStop()
                return Result.success(completed)
            } else {
                val err = res.exceptionOrNull() ?: Exception("Failed to end session")
                val msg = err.message ?: ""
                // If backend already completed it or reports already finished, treat as IDEMPOTENT SUCCESS
                if (msg.contains("ALREADY_FINISHED", ignoreCase = true) ||
                    msg.contains("already completed", ignoreCase = true) ||
                    msg.contains("completed", ignoreCase = true)
                ) {
                    StudyDebugLogger.logStopSuccess(sessionId, elapsed, wasIdempotent = true)
                    finalizeSessionStop()
                    return Result.success(data.session.copy(status = "completed", durationSeconds = elapsed))
                }
                lastError = err
                if (attempt < 2) {
                    StudyDebugLogger.logStopRetry(sessionId, attempt, msg)
                    delay(300L)
                }
            }
        }

        // If network failed after retries, finalize locally so user is not trapped, but log error
        StudyDebugLogger.logStopFailure(sessionId, "NETWORK_OR_SERVER", lastError?.message)
        finalizeSessionStop()
        return Result.failure(lastError ?: Exception("Failed to end session"))
    }

    suspend fun cancelSession(): Result<StudySessionDto> = stateMutex.withLock {
        val currentState = _sessionState.value
        val sessionId = when (currentState) {
            is SessionState.Running -> currentState.data.session.id
            is SessionState.Paused -> currentState.data.session.id
            is SessionState.Ending -> currentState.sessionId
            else -> return Result.failure(IllegalStateException("No active session to cancel"))
        }

        cancelBreakReminderForSession(sessionId)

        val result = if (sessionId.startsWith("local_")) {
            Result.success(StudySessionDto(
                id = sessionId,
                accountId = "",
                subjectId = "",
                startTime = "",
                status = "cancelled",
                createdAt = "",
                updatedAt = ""
            ))
        } else {
            repository.cancelStudySession(sessionId)
        }

        finalizeSessionStop()
        return result
    }

    private fun finalizeSessionStop() {
        val current = _sessionState.value
        val sid = when (current) {
            is SessionState.Running -> current.data.session.id
            is SessionState.Paused -> current.data.session.id
            is SessionState.Ending -> current.sessionId
            else -> null
        }
        if (sid != null) {
            cancelBreakReminderForSession(sid)
        }
        _sessionState.value = SessionState.Idle
        StudyForegroundService.stopService(context)
        StudentOsWidgetProvider.updateAllWidgets(context)
    }

    private suspend fun scheduleBreakReminderForRunningSession(sessionId: String, accumulatedRunningSecs: Int) {
        try {
            val prefs = repository.getUserPreferences().getOrNull()
            val intervalMins = prefs?.breakReminderIntervalMinutes ?: 50
            val intervalSecs = intervalMins * 60
            val remainingSecs = (intervalSecs - accumulatedRunningSecs).coerceAtLeast(0)
            if (remainingSecs > 0) {
                AlarmScheduler.scheduleStudyBreakReminder(context, sessionId, remainingSecs, intervalMins, prefs)
            } else {
                AlarmScheduler.cancelStudyBreakReminder(context, sessionId)
            }
        } catch (e: Exception) {
            android.util.Log.e("StudySessionManager", "Failed to schedule break reminder", e)
        }
    }

    private fun cancelBreakReminderForSession(sessionId: String) {
        try {
            AlarmScheduler.cancelStudyBreakReminder(context, sessionId)
        } catch (e: Exception) {
            android.util.Log.e("StudySessionManager", "Failed to cancel break reminder", e)
        }
    }

    suspend fun reconcileBackendSession(
        backendSession: StudySessionDto?,
        subjects: List<SubjectDto>,
        chapters: List<ChapterDto>,
        targetMinutes: Int = 45
    ) {
        stateMutex.withLock {
            val current = _sessionState.value
            // If an optimistic local session is actively starting, do not discard it before backend response returns
            if (current is SessionState.Running && current.data.session.id.startsWith("local_")) {
                return@withLock
            }

            if (backendSession == null || backendSession.status == "completed" || backendSession.status == "cancelled") {
                if (_sessionState.value !is SessionState.Idle && _sessionState.value !is SessionState.Ending) {
                    finalizeSessionStop()
                }
                return@withLock
            }

            val subject = subjects.find { it.id == backendSession.subjectId }
            val chapter = chapters.find { it.id == backendSession.chapterId }
            val subjectName = subject?.name ?: "Study Session"
            val chapterName = chapter?.name

            val elapsed = backendSession.calculateElapsedSeconds()
            val isRunning = backendSession.status == "running" || backendSession.status == "in_progress"
            val isPaused = backendSession.status == "paused"

            val now = System.currentTimeMillis()
            val data = ActiveStudySessionData(
                session = backendSession,
                subjectName = subjectName,
                chapterName = chapterName,
                baseElapsedSeconds = elapsed,
                activeStartedAtMs = now,
                targetDurationMinutes = targetMinutes
            )

            if (isRunning) {
                _sessionState.value = SessionState.Running(data)
                // Ensure foreground service is active with exactly ONE notification
                StudyForegroundService.startService(context, backendSession.id, subjectName, chapterName, targetMinutes)
                scope.launch {
                    scheduleBreakReminderForRunningSession(backendSession.id, elapsed)
                }
            } else if (isPaused) {
                _sessionState.value = SessionState.Paused(data, elapsed)
                // STRICT INVARIANT: Ensure NO foreground service and NO notification exists when PAUSED
                StudyForegroundService.stopService(context)
                cancelBreakReminderForSession(backendSession.id)
            }
        }
    }

    companion object {
        @Volatile
        private var INSTANCE: StudySessionManager? = null

        fun getInstance(context: Context, repository: StudentOsRepository): StudySessionManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: StudySessionManager(context.applicationContext, repository).also {
                    INSTANCE = it
                }
            }
        }

        fun getInstanceOrNull(): StudySessionManager? = INSTANCE
    }
}
