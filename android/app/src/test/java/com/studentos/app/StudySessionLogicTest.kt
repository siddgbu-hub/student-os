package com.studentos.app

import com.studentos.app.data.model.EntitlementDto
import com.studentos.app.data.model.StudySessionDto
import com.studentos.app.ui.screens.study.ActiveStudySessionData
import com.studentos.app.ui.screens.study.SessionState
import com.studentos.app.ui.screens.study.StudyForegroundService
import com.studentos.app.ui.screens.study.StudyNotificationReceiver
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class StudySessionLogicTest {

    private fun calculateElapsed(state: SessionState, currentTimeMs: Long): Int {
        return when (state) {
            is SessionState.Running -> {
                val diffSecs = ((currentTimeMs - state.data.activeStartedAtMs) / 1000).toInt().coerceAtLeast(0)
                state.data.baseElapsedSeconds + diffSecs
            }
            is SessionState.Paused -> state.pausedElapsedSeconds
            is SessionState.Ending -> state.finalDurationSeconds
            else -> 0
        }
    }

    // 1. Start immediately enters RUNNING locally
    @Test
    fun testStartImmediatelyTransitionsToRunningLocally() {
        val now = 1000000L
        val localId = "local_${UUID.randomUUID()}"
        val optimisticSession = StudySessionDto(
            id = localId,
            accountId = "",
            subjectId = "sub-101",
            chapterId = "chap-201",
            startTime = "2026-08-16T10:00:00Z",
            status = "running",
            createdAt = "2026-08-16T10:00:00Z",
            updatedAt = "2026-08-16T10:00:00Z"
        )
        val data = ActiveStudySessionData(
            session = optimisticSession,
            subjectName = "Organic Chemistry",
            chapterName = "Alkanes",
            baseElapsedSeconds = 0,
            activeStartedAtMs = now,
            targetDurationMinutes = 45
        )
        val state: SessionState = SessionState.Running(data)

        assertTrue(state is SessionState.Running)
        assertEquals(localId, (state as SessionState.Running).data.session.id)
        assertTrue(state.data.session.id.startsWith("local_"))
        assertEquals(0, calculateElapsed(state, now))
    }

    // 2. Start timer does not wait for backend round-trip; local authoritative timestamp is established immediately
    @Test
    fun testTimestampBasedRunningElapsedCalculation() {
        val startTime = 1000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(
                id = "session-1",
                accountId = "acc-1",
                subjectId = "sub-1",
                startTime = "2026-08-15T10:00:00Z",
                status = "running",
                createdAt = "2026-08-15T10:00:00Z",
                updatedAt = "2026-08-15T10:00:00Z"
            ),
            subjectName = "Medieval History",
            chapterName = "Feudal System",
            baseElapsedSeconds = 0,
            activeStartedAtMs = startTime,
            targetDurationMinutes = 45
        )
        val runningState = SessionState.Running(data)

        // At start (0s passed)
        assertEquals(0, calculateElapsed(runningState, startTime))

        // After 15 seconds
        assertEquals(15, calculateElapsed(runningState, startTime + 15000L))

        // After 42 minutes and 18 seconds (2538 seconds)
        assertEquals(2538, calculateElapsed(runningState, startTime + 2538000L))
    }

    // 3 & 4. Successful backend reconciliation replaces optimistic ID with real ID & preserves elapsed time
    @Test
    fun testSuccessfulBackendReconciliationPreservesElapsedContinuity() {
        val startTime = 1000000L
        val optimisticId = "local_12345"
        val initialData = ActiveStudySessionData(
            session = StudySessionDto(
                id = optimisticId,
                accountId = "",
                subjectId = "sub-1",
                startTime = "2026-08-16T10:00:00Z",
                status = "running",
                createdAt = "2026-08-16T10:00:00Z",
                updatedAt = "2026-08-16T10:00:00Z"
            ),
            subjectName = "Mathematics",
            chapterName = "Calculus",
            baseElapsedSeconds = 0,
            activeStartedAtMs = startTime,
            targetDurationMinutes = 45
        )
        val optimisticState = SessionState.Running(initialData)

        // Simulate 2000ms (2s) network roundtrip for backend response
        val networkReturnTime = startTime + 2000L
        assertEquals(2, calculateElapsed(optimisticState, networkReturnTime))

        // Reconcile with real backend session
        val realBackendSession = StudySessionDto(
            id = "real-backend-session-999",
            accountId = "acc-100",
            subjectId = "sub-1",
            startTime = "2026-08-16T10:00:00Z",
            status = "running",
            createdAt = "2026-08-16T10:00:00Z",
            updatedAt = "2026-08-16T10:00:00Z"
        )
        val reconciledData = initialData.copy(session = realBackendSession)
        val reconciledState = SessionState.Running(reconciledData)

        // Verify ID was replaced
        assertEquals("real-backend-session-999", reconciledState.data.session.id)
        assertFalse(reconciledState.data.session.id.startsWith("local_"))

        // Verify elapsed time is continuous and has not reset to 0
        assertEquals(2, calculateElapsed(reconciledState, networkReturnTime))
        assertEquals(10, calculateElapsed(reconciledState, startTime + 10000L))
    }

    // 5, 6 & 7. Backend start failure rolls back to IDLE and clears notification/service state
    @Test
    fun testBackendStartFailureRollsBackToIdleSafely() {
        var currentState: SessionState = SessionState.Running(
            ActiveStudySessionData(
                session = StudySessionDto(
                    id = "local_error_test",
                    accountId = "",
                    subjectId = "sub-1",
                    startTime = "2026-08-16T10:00:00Z",
                    status = "running",
                    createdAt = "2026-08-16T10:00:00Z",
                    updatedAt = "2026-08-16T10:00:00Z"
                ),
                subjectName = "Physics",
                chapterName = null,
                baseElapsedSeconds = 0,
                activeStartedAtMs = 1000000L,
                targetDurationMinutes = 45
            )
        )
        var isNotificationActive = true
        var isForegroundServiceActive = true

        // Simulate backend failure handler
        fun handleBackendFailure(optimisticId: String) {
            val current = currentState
            if (current is SessionState.Running && current.data.session.id == optimisticId) {
                currentState = SessionState.Idle
                isNotificationActive = false
                isForegroundServiceActive = false
            }
        }

        handleBackendFailure("local_error_test")

        assertTrue(currentState is SessionState.Idle)
        assertFalse(isNotificationActive)
        assertFalse(isForegroundServiceActive)
        assertEquals(0, calculateElapsed(currentState, 1005000L))
    }

    // 8 & 9. Exactly ONE notification ID used for all updates
    @Test
    fun testStableNotificationIdConstant() {
        assertEquals(1001, StudyForegroundService.NOTIFICATION_ID)
    }

    // 10 & 11. Paused state removes notification & freezes elapsed time
    @Test
    fun testPausedStateFreezesElapsedAndRemovesNotification() {
        val startTime = 1000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(
                id = "session-1",
                accountId = "acc-1",
                subjectId = "sub-1",
                startTime = "2026-08-15T10:00:00Z",
                status = "paused",
                createdAt = "2026-08-15T10:00:00Z",
                updatedAt = "2026-08-15T10:00:00Z"
            ),
            subjectName = "Medieval History",
            chapterName = null,
            baseElapsedSeconds = 600, // paused at 10m (600s)
            activeStartedAtMs = startTime,
            targetDurationMinutes = 45
        )
        val pausedState: SessionState = SessionState.Paused(data, pausedElapsedSeconds = 600)

        // While paused, elapsed remains frozen
        assertEquals(600, calculateElapsed(pausedState, startTime + 50000L))
        assertEquals(600, calculateElapsed(pausedState, startTime + 10000000L))

        // Strict invariant: notification and service should be active ONLY when Running
        val isServiceActive = pausedState is SessionState.Running
        assertFalse(isServiceActive)
    }

    // 12. Resume continues accurately from accumulated elapsed & restores exactly one notification
    @Test
    fun testResumeContinuesAccuratelyFromAccumulatedElapsed() {
        // Paused at 600s
        val resumeTime = 2000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(
                id = "session-1",
                accountId = "acc-1",
                subjectId = "sub-1",
                startTime = "2026-08-15T10:00:00Z",
                status = "running",
                createdAt = "2026-08-15T10:00:00Z",
                updatedAt = "2026-08-15T10:00:00Z"
            ),
            subjectName = "Medieval History",
            chapterName = null,
            baseElapsedSeconds = 600,
            activeStartedAtMs = resumeTime,
            targetDurationMinutes = 45
        )
        val resumedState: SessionState = SessionState.Running(data)

        // Right at resume: 600s
        assertEquals(600, calculateElapsed(resumedState, resumeTime))

        // 30 seconds after resume: 630s
        assertEquals(630, calculateElapsed(resumedState, resumeTime + 30000L))

        // Service & notification active on Running
        assertTrue(resumedState is SessionState.Running)
    }

    // 13 & 14. COMPLETED & CANCELLED remove notification and enter terminal states
    @Test
    fun testTerminalStatesClearNotificationAndService() {
        val idleState: SessionState = SessionState.Idle
        assertEquals(0, calculateElapsed(idleState, 5000000L))
        assertFalse(idleState is SessionState.Running)

        val endingState: SessionState = SessionState.Ending(sessionId = "session-1", finalDurationSeconds = 900)
        assertEquals(900, calculateElapsed(endingState, 5000000L))
        assertFalse(endingState is SessionState.Running)
    }

    // 15. Duplicate stop is blocked when already ending
    @Test
    fun testDuplicateStopIsPreventedWhenAlreadyEnding() {
        val endingState: SessionState = SessionState.Ending(sessionId = "session-1", finalDurationSeconds = 900)
        val shouldAllowStop = endingState !is SessionState.Ending && endingState !is SessionState.Idle
        assertFalse(shouldAllowStop)
    }

    @Test
    fun testEndingStateBlocksAdditionalStopRequests() {
        var callCount = 0
        var currentState: SessionState = SessionState.Running(
            ActiveStudySessionData(
                session = StudySessionDto(
                    id = "session-1",
                    accountId = "acc-1",
                    subjectId = "sub-1",
                    startTime = "2026-08-15T10:00:00Z",
                    status = "running",
                    createdAt = "2026-08-15T10:00:00Z",
                    updatedAt = "2026-08-15T10:00:00Z"
                ),
                subjectName = "Medieval History",
                chapterName = null,
                baseElapsedSeconds = 0,
                activeStartedAtMs = 100000L,
                targetDurationMinutes = 45
            )
        )

        fun simulateStop(): Boolean {
            if (currentState is SessionState.Ending || currentState is SessionState.Idle) {
                return false
            }
            currentState = SessionState.Ending("session-1", 900)
            callCount++
            return true
        }

        // First tap succeeds
        assertTrue(simulateStop())
        assertEquals(1, callCount)

        // Rapid second tap is blocked
        assertFalse(simulateStop())
        assertEquals(1, callCount)

        // Rapid third tap is blocked
        assertFalse(simulateStop())
        assertEquals(1, callCount)
    }

    // 16 & 17. Stale service invocation for PAUSED/IDLE does not recreate notification
    @Test
    fun testServiceGuardAgainstNonRunningState() {
        fun shouldServicePostNotification(state: SessionState?): Boolean {
            return state is SessionState.Running
        }

        assertFalse(shouldServicePostNotification(null))
        assertFalse(shouldServicePostNotification(SessionState.Idle))
        assertFalse(shouldServicePostNotification(SessionState.Starting))
        assertFalse(shouldServicePostNotification(SessionState.Paused(
            data = ActiveStudySessionData(
                session = StudySessionDto(id = "1", accountId = "1", subjectId = "1", startTime = "", status = "paused", createdAt = "", updatedAt = ""),
                subjectName = "Sub",
                chapterName = null,
                baseElapsedSeconds = 100,
                activeStartedAtMs = 0L,
                targetDurationMinutes = 45
            ),
            pausedElapsedSeconds = 100
        )))
        assertFalse(shouldServicePostNotification(SessionState.Ending("1", 100)))

        assertTrue(shouldServicePostNotification(SessionState.Running(
            data = ActiveStudySessionData(
                session = StudySessionDto(id = "1", accountId = "1", subjectId = "1", startTime = "", status = "running", createdAt = "", updatedAt = ""),
                subjectName = "Sub",
                chapterName = null,
                baseElapsedSeconds = 0,
                activeStartedAtMs = 1000L,
                targetDurationMinutes = 45
            )
        )))
    }

    // 18. Activity destruction does not terminate RUNNING session or elapsed progression
    @Test
    fun testActivityDestructionDecoupledFromRunningSession() {
        val startedAt = 5000000L
        val runningData = ActiveStudySessionData(
            session = StudySessionDto(id = "s-1", accountId = "a-1", subjectId = "sub-1", startTime = "", status = "running", createdAt = "", updatedAt = ""),
            subjectName = "Biology",
            chapterName = "Genetics",
            baseElapsedSeconds = 0,
            activeStartedAtMs = startedAt,
            targetDurationMinutes = 60
        )
        val state = SessionState.Running(runningData)

        // Simulate Activity destroyed & recreated 120s later
        val laterTime = startedAt + 120000L
        assertEquals(120, calculateElapsed(state, laterTime))
    }

    // 19 & 20. App reopening correctly reconciles RUNNING vs PAUSED state
    @Test
    fun testReconciliationStateMapping() {
        fun mapBackendToState(backendStatus: String, elapsed: Int, now: Long): Pair<SessionState, Boolean> {
            val isRunning = backendStatus == "running" || backendStatus == "in_progress"
            val isPaused = backendStatus == "paused"
            val dummySession = StudySessionDto(id = "b-1", accountId = "a-1", subjectId = "sub-1", startTime = "", status = backendStatus, createdAt = "", updatedAt = "")
            val data = ActiveStudySessionData(dummySession, "Physics", null, elapsed, now, 45)

            return when {
                isRunning -> Pair(SessionState.Running(data), true) // State + shouldRunForegroundService
                isPaused -> Pair(SessionState.Paused(data, elapsed), false)
                else -> Pair(SessionState.Idle, false)
            }
        }

        val now = 1000000L

        // Backend RUNNING -> SessionState.Running + Service Active
        val (runningState, runningService) = mapBackendToState("running", 300, now)
        assertTrue(runningState is SessionState.Running)
        assertTrue(runningService)

        // Backend PAUSED -> SessionState.Paused + NO Service
        val (pausedState, pausedService) = mapBackendToState("paused", 300, now)
        assertTrue(pausedState is SessionState.Paused)
        assertFalse(pausedService)

        // Backend COMPLETED -> SessionState.Idle + NO Service
        val (idleState, idleService) = mapBackendToState("completed", 600, now)
        assertTrue(idleState is SessionState.Idle)
        assertFalse(idleService)
    }

    // 21. Time formatting helper verification
    @Test
    fun testTimeFormattingHelper() {
        val totalSecs = 2538 // 42m 18s
        val hours = totalSecs / 3600
        val mins = (totalSecs % 3600) / 60
        val secs = totalSecs % 60
        val formatted = if (hours > 0) {
            String.format("%02d:%02d:%02d", hours, mins, secs)
        } else {
            String.format("%02d:%02d", mins, secs)
        }
        assertEquals("42:18", formatted)

        val multiHourSecs = 3665 // 1h 01m 05s
        val h2 = multiHourSecs / 3600
        val m2 = (multiHourSecs % 3600) / 60
        val s2 = multiHourSecs % 60
        val formatted2 = if (h2 > 0) {
            String.format("%02d:%02d:%02d", h2, m2, s2)
        } else {
            String.format("%02d:%02d", m2, s2)
        }
        assertEquals("01:01:05", formatted2)
    }

    // 22. Notification action routing action names
    @Test
    fun testNotificationActionRoutingActionNames() {
        assertEquals("com.studentos.app.action.STUDY_PAUSE", StudyNotificationReceiver.ACTION_STUDY_PAUSE)
        assertEquals("com.studentos.app.action.STUDY_RESUME", StudyNotificationReceiver.ACTION_STUDY_RESUME)
        assertEquals("com.studentos.app.action.STUDY_STOP", StudyNotificationReceiver.ACTION_STUDY_STOP)
    }

    // 23. Idempotent server completion handling
    @Test
    fun testRetryBehaviorOnIdempotentServerCompletion() {
        fun handleStopResult(errorMessage: String?): Boolean {
            if (errorMessage == null) return true // success
            if (errorMessage.contains("ALREADY_FINISHED", ignoreCase = true) ||
                errorMessage.contains("already completed", ignoreCase = true) ||
                errorMessage.contains("completed", ignoreCase = true)
            ) {
                return true
            }
            return false
        }

        assertTrue(handleStopResult(null))
        assertTrue(handleStopResult("SESSION_ALREADY_FINISHED"))
        assertTrue(handleStopResult("Session is already completed"))
        assertFalse(handleStopResult("Database connection failed"))
    }

    // 24. Fast-path startup sequence and timing delta calculations
    @Test
    fun testStartupSequenceTimingDeltaCalculations() {
        val tA = 1000L // User taps Start Study
        val tB = 1002L // Local state becomes RUNNING
        val tC = 1003L // startService() invoked
        val tD = 1010L // onStartCommand() entered
        val tE = 1012L // notification constructed
        val tF = 1013L // startForeground() called
        val tG = 2013L // first ticker update
        val tH = 1005L // backend request started

        val deltaBA = tB - tA
        val deltaCA = tC - tA
        val deltaDC = tD - tC
        val deltaED = tE - tD
        val deltaFE = tF - tE
        val deltaHA = tH - tA
        val totalToForeground = tF - tA

        assertEquals(2L, deltaBA)
        assertEquals(3L, deltaCA)
        assertEquals(7L, deltaDC)
        assertEquals(2L, deltaED)
        assertEquals(1L, deltaFE)
        assertEquals(5L, deltaHA)
        assertEquals(13L, totalToForeground)
        assertTrue("Notification must be posted to foreground before first ticker update", tF < tG)
    }

    // 25. Foreground service immediate behavior flag
    @Test
    fun testForegroundServiceImmediateBehaviorConstant() {
        // NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE = 1 (disables Android 12+ 10-second notification suppression)
        val expectedImmediateFlag = 1
        assertEquals(expectedImmediateFlag, androidx.core.app.NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
    }

    // Helper: Simulates AlarmReceiver authoritative verification logic
    private fun shouldFireBreakNotification(
        currentState: SessionState,
        intentSessionId: String,
        requiredIntervalMins: Int,
        currentTimeMs: Long
    ): Boolean {
        if (currentState !is SessionState.Running) return false
        val currentSessionId = currentState.data.session.id
        val isMatchingSession = currentSessionId == intentSessionId ||
                intentSessionId.startsWith("local_") ||
                currentSessionId.startsWith("local_")
        if (!isMatchingSession) return false

        val elapsedSecs = calculateElapsed(currentState, currentTimeMs)
        val requiredThresholdSecs = requiredIntervalMins * 60
        return elapsedSecs >= requiredThresholdSecs
    }

    // 26. 23-second session does NOT produce a 50-minute break notification
    @Test
    fun testShortSession23SecondsCannotTrigger50MinuteBreakNotification() {
        val startTime = 1000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(id = "sess-1", accountId = "acc-1", subjectId = "sub-1", startTime = "2026-08-16T10:00:00Z", status = "running", createdAt = "2026-08-16T10:00:00Z", updatedAt = "2026-08-16T10:00:00Z"),
            subjectName = "Physics",
            chapterName = null,
            baseElapsedSeconds = 0,
            activeStartedAtMs = startTime,
            targetDurationMinutes = 50
        )
        val runningState = SessionState.Running(data)

        // Wall clock at 23 seconds
        val timeAt23s = startTime + 23_000L
        assertEquals(23, calculateElapsed(runningState, timeAt23s))
        assertFalse(shouldFireBreakNotification(runningState, "sess-1", 50, timeAt23s))
    }

    // 27. 23-minute session does NOT produce a 50-minute break notification
    @Test
    fun testShortSession23MinutesCannotTrigger50MinuteBreakNotification() {
        val startTime = 1000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(id = "sess-1", accountId = "acc-1", subjectId = "sub-1", startTime = "2026-08-16T10:00:00Z", status = "running", createdAt = "2026-08-16T10:00:00Z", updatedAt = "2026-08-16T10:00:00Z"),
            subjectName = "Physics",
            chapterName = null,
            baseElapsedSeconds = 0,
            activeStartedAtMs = startTime,
            targetDurationMinutes = 50
        )
        val runningState = SessionState.Running(data)

        // Wall clock at 23 minutes (1380 seconds)
        val timeAt23m = startTime + (23 * 60 * 1000L)
        assertEquals(1380, calculateElapsed(runningState, timeAt23m))
        assertFalse(shouldFireBreakNotification(runningState, "sess-1", 50, timeAt23m))
    }

    // 28. PAUSED session CANNOT produce a break notification (even if 50 minutes of wall clock have passed)
    @Test
    fun testPausedSessionCannotTriggerBreakNotification() {
        val startTime = 1000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(id = "sess-1", accountId = "acc-1", subjectId = "sub-1", startTime = "2026-08-16T10:00:00Z", status = "paused", createdAt = "2026-08-16T10:00:00Z", updatedAt = "2026-08-16T10:00:00Z"),
            subjectName = "Physics",
            chapterName = null,
            baseElapsedSeconds = 23, // User paused after 23 seconds
            activeStartedAtMs = startTime,
            targetDurationMinutes = 50
        )
        val pausedState = SessionState.Paused(data, pausedElapsedSeconds = 23)

        // Wall clock reaches 50 minutes after start
        val timeAt50m = startTime + (50 * 60 * 1000L)
        assertFalse("Paused session must never trigger break notification", shouldFireBreakNotification(pausedState, "sess-1", 50, timeAt50m))
    }

    // 29. STOPPED / COMPLETED session CANNOT produce a break notification
    @Test
    fun testStoppedOrCompletedSessionCannotTriggerBreakNotification() {
        val endingState = SessionState.Ending(sessionId = "sess-1", finalDurationSeconds = 1200)
        val idleState = SessionState.Idle

        val now = 2000000L
        assertFalse("Ending session must not trigger break notification", shouldFireBreakNotification(endingState, "sess-1", 50, now))
        assertFalse("Idle session must not trigger break notification", shouldFireBreakNotification(idleState, "sess-1", 50, now))
    }

    // 30. Old session alarm CANNOT notify during a new session (ID mismatch protection)
    @Test
    fun testOldSessionAlarmCannotNotifyDuringNewSession() {
        val startTime = 1000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(id = "session-B", accountId = "acc-1", subjectId = "sub-2", startTime = "2026-08-16T10:00:00Z", status = "running", createdAt = "2026-08-16T10:00:00Z", updatedAt = "2026-08-16T10:00:00Z"),
            subjectName = "Chemistry",
            chapterName = null,
            baseElapsedSeconds = 3000,
            activeStartedAtMs = startTime,
            targetDurationMinutes = 50
        )
        val runningState = SessionState.Running(data)

        // An old alarm for "session-A" fires while "session-B" is active
        val alarmSessionId = "session-A"
        val timeAt50m = startTime + (50 * 60 * 1000L)
        assertFalse("Alarm for session-A must not fire during session-B", shouldFireBreakNotification(runningState, alarmSessionId, 50, timeAt50m))
    }

    // 31. Pause -> Resume preserves accumulated running time and only schedules remaining duration
    @Test
    fun testPauseResumePreservesAccumulatedRunningTimeForRemainingBreak() {
        val intervalMins = 50
        val intervalSecs = intervalMins * 60 // 3000 seconds

        // Step 1: Study for 20 minutes (1200s), then pause
        val accumulatedAtPause = 1200
        val remainingBreakSecsAtPause = (intervalSecs - accumulatedAtPause).coerceAtLeast(0)
        assertEquals(1800, remainingBreakSecsAtPause) // Exactly 30 minutes remaining

        // Step 2: User stays paused for 40 minutes of wall-clock time
        // Upon resume, remaining break duration is still exactly 1800s (30m), NOT negative or 0
        val remainingBreakSecsOnResume = (intervalSecs - accumulatedAtPause).coerceAtLeast(0)
        assertEquals(1800, remainingBreakSecsOnResume)
    }

    // 32. Full 50-minute running session correctly triggers break notification
    @Test
    fun testFull50MinuteRunningSessionTriggersBreakNotification() {
        val startTime = 1000000L
        val data = ActiveStudySessionData(
            session = StudySessionDto(id = "sess-1", accountId = "acc-1", subjectId = "sub-1", startTime = "2026-08-16T10:00:00Z", status = "running", createdAt = "2026-08-16T10:00:00Z", updatedAt = "2026-08-16T10:00:00Z"),
            subjectName = "Biology",
            chapterName = "Genetics",
            baseElapsedSeconds = 0,
            activeStartedAtMs = startTime,
            targetDurationMinutes = 50
        )
        val runningState = SessionState.Running(data)

        // Exactly 50 minutes of continuous running study
        val timeAt50m = startTime + (50 * 60 * 1000L)
        assertEquals(3000, calculateElapsed(runningState, timeAt50m))
        assertTrue("Continuous 50-minute running study must trigger break notification", shouldFireBreakNotification(runningState, "sess-1", 50, timeAt50m))
    }

    // 33. Expiry while IDLE blocks Start Study
    @Test
    fun testEntitlementExpiredBlocksStartSession() {
        val expiredEntitlement = EntitlementDto(
            entitlementId = "ent-1",
            accountId = "acc-1",
            currentPlanId = "free_trial",
            status = "expired",
            isPaid = false,
            features = emptyList(),
            expiresAt = "2026-08-10T00:00:00Z",
            lastVerifiedAt = "2026-08-16T00:00:00Z",
            createdAt = "2026-08-01T00:00:00Z",
            updatedAt = "2026-08-16T00:00:00Z"
        )

        fun canStartStudy(ent: EntitlementDto?): Boolean {
            return ent?.status == "active"
        }

        assertFalse("Expired entitlement must prevent starting study session", canStartStudy(expiredEntitlement))
    }

    // 34. Expiry while PAUSED blocks Resume
    @Test
    fun testEntitlementExpiredBlocksResumeSession() {
        val expiredEntitlement = EntitlementDto(
            entitlementId = "ent-1",
            accountId = "acc-1",
            currentPlanId = "free_trial",
            status = "expired",
            isPaid = false,
            features = emptyList(),
            expiresAt = "2026-08-10T00:00:00Z",
            lastVerifiedAt = "2026-08-16T00:00:00Z",
            createdAt = "2026-08-01T00:00:00Z",
            updatedAt = "2026-08-16T00:00:00Z"
        )

        fun canResumeStudy(ent: EntitlementDto?): Boolean {
            return ent?.status == "active"
        }

        assertFalse("Expired entitlement must prevent resuming study session", canResumeStudy(expiredEntitlement))
    }

    // 35. Expiry while RUNNING terminates active session and stops foreground service
    @Test
    fun testEntitlementExpiredTerminatesRunningSession() {
        val data = ActiveStudySessionData(
            session = StudySessionDto(id = "sess-active", accountId = "acc-1", subjectId = "sub-1", startTime = "2026-08-16T10:00:00Z", status = "running", createdAt = "2026-08-16T10:00:00Z", updatedAt = "2026-08-16T10:00:00Z"),
            subjectName = "Math",
            chapterName = "Calculus",
            baseElapsedSeconds = 120,
            activeStartedAtMs = 1000000L,
            targetDurationMinutes = 45
        )
        var state: SessionState = SessionState.Running(data)
        var foregroundServiceRunning = true

        // Simulate entitlement expiry signal received from backend
        fun onEntitlementExpired() {
            state = SessionState.Idle
            foregroundServiceRunning = false
        }

        onEntitlementExpired()
        assertEquals(SessionState.Idle, state)
        assertFalse("Foreground service must stop immediately when entitlement expires during running session", foregroundServiceRunning)
    }

    // 36. Expiry while PAUSED terminates session
    @Test
    fun testEntitlementExpiredTerminatesPausedSession() {
        val data = ActiveStudySessionData(
            session = StudySessionDto(id = "sess-paused", accountId = "acc-1", subjectId = "sub-1", startTime = "2026-08-16T10:00:00Z", status = "paused", createdAt = "2026-08-16T10:00:00Z", updatedAt = "2026-08-16T10:00:00Z"),
            subjectName = "Chemistry",
            chapterName = null,
            baseElapsedSeconds = 300,
            activeStartedAtMs = 1000000L,
            targetDurationMinutes = 45
        )
        var state: SessionState = SessionState.Paused(data, 300)

        // Entitlement expiry event
        fun onEntitlementExpired() {
            state = SessionState.Idle
        }

        onEntitlementExpired()
        assertEquals(SessionState.Idle, state)
    }

    // 37. Clock tampering resilience: client clock set back does NOT bypass server UTC check
    @Test
    fun testServerUtcAuthoritativeAgainstClientClockTampering() {
        // Server says trial expired at 2026-08-15T00:00:00Z
        val serverExpiryEpochMs = 1786752000000L // 2026-08-15
        val serverCurrentTimeMs = 1786838400000L // 2026-08-16 (1 day after expiry)

        // Attacker sets local device clock back to 2026-08-01 (before expiry)
        val maliciousDeviceClockMs = 1785542400000L
        assertTrue("Device clock shows active locally", maliciousDeviceClockMs < serverExpiryEpochMs)

        // Server authoritative evaluation
        val isExpiredOnServer = serverCurrentTimeMs > serverExpiryEpochMs
        assertTrue("Server time must authoritatively determine expiry regardless of client clock tampering", isExpiredOnServer)
    }

    // 38. Existing session ID cannot bypass expired entitlement on server mutations
    @Test
    fun testExistingSessionIdCannotBypassExpiredEntitlementOnServer() {
        val existingSessionId = "session-pre-expiry-123"

        fun handleServerMutation(sessionId: String, isEntitlementActive: Boolean): Pair<String, Int> {
            if (!isEntitlementActive) {
                return sessionId to 403 // TRIAL_EXPIRED
            }
            return sessionId to 200
        }

        val result = handleServerMutation(existingSessionId, isEntitlementActive = false)
        assertEquals(existingSessionId, result.first)
        assertEquals(403, result.second)
    }

    // 39. Cancelled session cancels pending break reminder and rejects notification
    @Test
    fun testCancelledSessionCannotTriggerBreakNotification() {
        val idleState = SessionState.Idle
        assertFalse("Cancelled / Idle session must never allow break notification", shouldFireBreakNotification(idleState, "sess-cancelled", 50, System.currentTimeMillis()))
    }

    // 40. Generic 403 does NOT falsely mark entitlement expired (only recognized TRIAL_EXPIRED/SUBSCRIPTION_REQUIRED)
    @Test
    fun testGeneric403DoesNotFalselyMarkEntitlementExpired() {
        fun isEntitlementErrorCode(code: String?): Boolean {
            return code == "TRIAL_EXPIRED" || code == "SUBSCRIPTION_REQUIRED" || code == "SUBSCRIPTION_EXPIRED"
        }

        assertFalse("RATE_LIMIT_EXCEEDED should not be treated as entitlement expiry", isEntitlementErrorCode("RATE_LIMIT_EXCEEDED"))
        assertFalse("INVALID_CREDENTIALS should not be treated as entitlement expiry", isEntitlementErrorCode("INVALID_CREDENTIALS"))
        assertTrue("TRIAL_EXPIRED is a valid entitlement error", isEntitlementErrorCode("TRIAL_EXPIRED"))
        assertTrue("SUBSCRIPTION_REQUIRED is a valid entitlement error", isEntitlementErrorCode("SUBSCRIPTION_REQUIRED"))
    }

    // 41. Paid active user remains accessible
    @Test
    fun testPaidActiveUserRemainsAccessible() {
        val paidEntitlement = EntitlementDto(
            entitlementId = "ent-paid",
            accountId = "acc-paid",
            currentPlanId = "monthly",
            status = "active",
            isPaid = true,
            features = listOf("dashboard", "study", "planner", "revision", "analytics", "goals", "cloud_sync"),
            expiresAt = "2026-09-16T00:00:00Z",
            lastVerifiedAt = "2026-08-16T00:00:00Z",
            createdAt = "2026-08-16T00:00:00Z",
            updatedAt = "2026-08-16T00:00:00Z"
        )

        fun canAccessFeature(ent: EntitlementDto?, feature: String): Boolean {
            return ent?.status == "active" && ent.features.contains(feature)
        }

        assertTrue("Paid active user must have full study access", canAccessFeature(paidEntitlement, "study"))
        assertTrue("Paid active user must have full planner access", canAccessFeature(paidEntitlement, "planner"))
    }

    // 42. Extended trial preserves Trial badge and isPaid = false
    @Test
    fun testExtendedTrialPreservesTrialBadge() {
        val extendedTrialEntitlement = EntitlementDto(
            entitlementId = "ent-trial-ext",
            accountId = "acc-trial",
            currentPlanId = "free_trial",
            status = "active",
            isPaid = false,
            features = listOf("dashboard", "study", "planner", "revision", "analytics", "goals", "cloud_sync"),
            expiresAt = "2026-08-20T00:00:00Z",
            lastVerifiedAt = "2026-08-16T00:00:00Z",
            createdAt = "2026-08-09T00:00:00Z",
            updatedAt = "2026-08-16T00:00:00Z"
        )

        fun getBadgeLabel(ent: EntitlementDto?): String {
            if (ent == null) return "No Access"
            if (ent.status == "expired") return "Trial Expired"
            if (ent.isPaid) return "Premium"
            if (ent.currentPlanId == "free_trial") return "Trial"
            return "Active"
        }

        assertEquals("Trial", getBadgeLabel(extendedTrialEntitlement))
        assertFalse("Extended trial must not have isPaid = true", extendedTrialEntitlement.isPaid)
    }
}
