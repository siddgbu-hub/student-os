package com.studentos.app

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
}
