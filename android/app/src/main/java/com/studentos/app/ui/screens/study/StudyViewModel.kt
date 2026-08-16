package com.studentos.app.ui.screens.study

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.model.ChapterDto
import com.studentos.app.data.model.StudySessionDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class StudyUiState(
    val isLoading: Boolean = true,
    val subjects: List<SubjectDto> = emptyList(),
    val selectedSubject: SubjectDto? = null,
    val chapters: List<ChapterDto> = emptyList(),
    val selectedChapter: ChapterDto? = null,
    val activeSession: StudySessionDto? = null,
    val elapsedSeconds: Int = 0,
    val targetSessionDurationMinutes: Int = 45,
    val remainingSeconds: Int = 2700,
    val isTimerRunning: Boolean = false,
    val isTimerPaused: Boolean = false,
    val isEndingSession: Boolean = false,
    val isCreateSubjectDialogOpen: Boolean = false,
    val isEditSubjectDialogOpen: Boolean = false,
    val editingSubject: SubjectDto? = null,
    val isDeleteSubjectDialogOpen: Boolean = false,
    val deletingSubject: SubjectDto? = null,
    val isCreateChapterDialogOpen: Boolean = false,
    val isEditChapterDialogOpen: Boolean = false,
    val editingChapter: ChapterDto? = null,
    val isDeleteChapterDialogOpen: Boolean = false,
    val deletingChapter: ChapterDto? = null,
    val isCancelSessionDialogOpen: Boolean = false,
    val isSubmittingAction: Boolean = false,
    val togglingChapterId: String? = null,
    val actionErrorMessage: String? = null,
    val errorMessage: String? = null
)

class StudyViewModel(private val repository: StudentOsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(StudyUiState())
    val uiState: StateFlow<StudyUiState> = _uiState.asStateFlow()

    private var timerTickerJob: Job? = null
    private val sessionManager: StudySessionManager by lazy {
        val ctx = repository.getApplicationContext()
            ?: throw IllegalStateException("Application context is required for StudySessionManager")
        StudySessionManager.getInstance(ctx, repository)
    }

    init {
        loadSubjects()
        observeSessionManager()
    }

    private fun observeSessionManager() {
        viewModelScope.launch {
            sessionManager.sessionErrors.collect { err ->
                _uiState.value = _uiState.value.copy(
                    errorMessage = categorizeError(err),
                    isSubmittingAction = false
                )
            }
        }
        viewModelScope.launch {
            sessionManager.sessionState.collect { sessionState ->
                when (sessionState) {
                    is SessionState.Idle -> {
                        stopUiTimerTicker()
                        val targetMins = _uiState.value.targetSessionDurationMinutes
                        _uiState.value = _uiState.value.copy(
                            activeSession = null,
                            isTimerRunning = false,
                            isTimerPaused = false,
                            isEndingSession = false,
                            elapsedSeconds = 0,
                            remainingSeconds = targetMins * 60
                        )
                    }
                    is SessionState.Starting -> {
                        _uiState.value = _uiState.value.copy(
                            isSubmittingAction = true,
                            errorMessage = null
                        )
                    }
                    is SessionState.Running -> {
                        val data = sessionState.data
                        val currentElapsed = sessionManager.calculateCurrentElapsed(sessionState)
                        val targetSecs = data.targetDurationMinutes * 60
                        val remaining = (targetSecs - currentElapsed).coerceAtLeast(0)

                        val matchingSubject = _uiState.value.subjects.find { it.id == data.session.subjectId }
                        val matchingChapter = _uiState.value.chapters.find { it.id == data.session.chapterId }

                        _uiState.value = _uiState.value.copy(
                            activeSession = data.session,
                            selectedSubject = matchingSubject ?: _uiState.value.selectedSubject,
                            selectedChapter = matchingChapter ?: _uiState.value.selectedChapter,
                            targetSessionDurationMinutes = data.targetDurationMinutes,
                            isTimerRunning = true,
                            isTimerPaused = false,
                            isEndingSession = false,
                            isSubmittingAction = false,
                            elapsedSeconds = currentElapsed,
                            remainingSeconds = remaining
                        )
                        startUiTimerTicker()
                    }
                    is SessionState.Paused -> {
                        stopUiTimerTicker()
                        val data = sessionState.data
                        val elapsed = sessionState.pausedElapsedSeconds
                        val targetSecs = data.targetDurationMinutes * 60
                        val remaining = (targetSecs - elapsed).coerceAtLeast(0)

                        _uiState.value = _uiState.value.copy(
                            activeSession = data.session,
                            isTimerRunning = false,
                            isTimerPaused = true,
                            isEndingSession = false,
                            isSubmittingAction = false,
                            elapsedSeconds = elapsed,
                            remainingSeconds = remaining
                        )
                    }
                    is SessionState.Ending -> {
                        stopUiTimerTicker()
                        _uiState.value = _uiState.value.copy(
                            isEndingSession = true,
                            isSubmittingAction = true,
                            isTimerRunning = false,
                            isTimerPaused = false,
                            elapsedSeconds = sessionState.finalDurationSeconds
                        )
                    }
                }
            }
        }
    }

    private fun startUiTimerTicker() {
        if (timerTickerJob?.isActive == true) return
        timerTickerJob = viewModelScope.launch {
            while (isActive && _uiState.value.isTimerRunning) {
                delay(500L)
                val currentElapsed = sessionManager.calculateCurrentElapsed()
                val targetSecs = _uiState.value.targetSessionDurationMinutes * 60
                val remaining = (targetSecs - currentElapsed).coerceAtLeast(0)

                _uiState.value = _uiState.value.copy(
                    elapsedSeconds = currentElapsed,
                    remainingSeconds = remaining
                )
            }
        }
    }

    private fun stopUiTimerTicker() {
        timerTickerJob?.cancel()
        timerTickerJob = null
    }

    fun loadSubjects() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = repository.getSubjects()
            res.onSuccess { list ->
                val currentSel = _uiState.value.selectedSubject
                val nextSel = list.find { it.id == currentSel?.id } ?: list.firstOrNull()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    subjects = list,
                    selectedSubject = nextSel
                )
                if (nextSel != null) {
                    loadChaptersForSubject(nextSel.id)
                } else {
                    _uiState.value = _uiState.value.copy(chapters = emptyList(), selectedChapter = null)
                }
                checkActiveBackendSession()
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = categorizeError(err))
            }
        }
    }

    fun refreshActiveSession() {
        checkActiveBackendSession()
    }

    fun checkActiveBackendSession() {
        viewModelScope.launch {
            val activeRes = repository.getActiveStudySession()
            activeRes.onSuccess { session ->
                sessionManager.reconcileBackendSession(
                    backendSession = session,
                    subjects = _uiState.value.subjects,
                    chapters = _uiState.value.chapters,
                    targetMinutes = _uiState.value.targetSessionDurationMinutes
                )
            }
        }
    }

    fun selectSubject(subject: SubjectDto) {
        if (_uiState.value.isTimerRunning || _uiState.value.isTimerPaused || _uiState.value.isEndingSession) {
            _uiState.value = _uiState.value.copy(errorMessage = "Cannot change subject during an active session")
            return
        }
        _uiState.value = _uiState.value.copy(selectedSubject = subject, selectedChapter = null, errorMessage = null)
        loadChaptersForSubject(subject.id)
    }

    fun selectChapter(chapter: ChapterDto?) {
        if (_uiState.value.isTimerRunning || _uiState.value.isTimerPaused || _uiState.value.isEndingSession) return
        _uiState.value = _uiState.value.copy(selectedChapter = chapter)
    }

    private fun loadChaptersForSubject(subjectId: String) {
        viewModelScope.launch {
            val res = repository.getChaptersBySubject(subjectId)
            res.onSuccess { chapterList ->
                val currentChap = _uiState.value.selectedChapter
                val nextChap = chapterList.find { it.id == currentChap?.id } ?: chapterList.firstOrNull()
                _uiState.value = _uiState.value.copy(chapters = chapterList, selectedChapter = nextChap)
            }
        }
    }

    // --- Subject Dialog Actions ---
    fun openCreateSubjectDialog() {
        _uiState.value = _uiState.value.copy(isCreateSubjectDialogOpen = true, actionErrorMessage = null)
    }

    fun closeCreateSubjectDialog() {
        _uiState.value = _uiState.value.copy(isCreateSubjectDialogOpen = false, actionErrorMessage = null)
    }

    fun createSubject(name: String) {
        if (name.isBlank()) {
            _uiState.value = _uiState.value.copy(actionErrorMessage = "Subject name is required")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val res = repository.createSubject(name.trim())
            res.onSuccess { newSubj ->
                val updatedList = _uiState.value.subjects + newSubj
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isCreateSubjectDialogOpen = false,
                    subjects = updatedList,
                    selectedSubject = newSubj
                )
                loadChaptersForSubject(newSubj.id)
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = err.message ?: "Failed to create subject"
                )
            }
        }
    }

    fun openEditSubjectDialog(subject: SubjectDto) {
        _uiState.value = _uiState.value.copy(
            isEditSubjectDialogOpen = true,
            editingSubject = subject,
            actionErrorMessage = null
        )
    }

    fun closeEditSubjectDialog() {
        _uiState.value = _uiState.value.copy(
            isEditSubjectDialogOpen = false,
            editingSubject = null,
            actionErrorMessage = null
        )
    }

    fun updateSubject(name: String) {
        val subject = _uiState.value.editingSubject ?: return
        if (name.isBlank()) {
            _uiState.value = _uiState.value.copy(actionErrorMessage = "Subject name is required")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val res = repository.updateSubject(subject.id, name.trim())
            res.onSuccess { updatedSubj ->
                val updatedList = _uiState.value.subjects.map { if (it.id == updatedSubj.id) updatedSubj else it }
                val updatedSelected = if (_uiState.value.selectedSubject?.id == updatedSubj.id) updatedSubj else _uiState.value.selectedSubject
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isEditSubjectDialogOpen = false,
                    editingSubject = null,
                    subjects = updatedList,
                    selectedSubject = updatedSelected
                )
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = err.message ?: "Failed to update subject"
                )
            }
        }
    }

    fun openDeleteSubjectDialog(subject: SubjectDto) {
        _uiState.value = _uiState.value.copy(
            isDeleteSubjectDialogOpen = true,
            deletingSubject = subject,
            actionErrorMessage = null
        )
    }

    fun closeDeleteSubjectDialog() {
        _uiState.value = _uiState.value.copy(
            isDeleteSubjectDialogOpen = false,
            deletingSubject = null,
            actionErrorMessage = null
        )
    }

    fun deleteSubject() {
        val subject = _uiState.value.deletingSubject ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val res = repository.deleteSubject(subject.id)
            res.onSuccess {
                val updatedList = _uiState.value.subjects.filter { it.id != subject.id }
                val nextSel = updatedList.firstOrNull()
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isDeleteSubjectDialogOpen = false,
                    deletingSubject = null,
                    subjects = updatedList,
                    selectedSubject = nextSel
                )
                if (nextSel != null) {
                    loadChaptersForSubject(nextSel.id)
                } else {
                    _uiState.value = _uiState.value.copy(chapters = emptyList(), selectedChapter = null)
                }
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = err.message ?: "Failed to delete subject"
                )
            }
        }
    }

    // --- Chapter Dialog Actions ---
    fun openCreateChapterDialog() {
        if (_uiState.value.selectedSubject == null) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please select a subject first")
            return
        }
        _uiState.value = _uiState.value.copy(isCreateChapterDialogOpen = true, actionErrorMessage = null)
    }

    fun closeCreateChapterDialog() {
        _uiState.value = _uiState.value.copy(isCreateChapterDialogOpen = false, actionErrorMessage = null)
    }

    fun createChapter(name: String) {
        val subject = _uiState.value.selectedSubject ?: return
        if (name.isBlank()) {
            _uiState.value = _uiState.value.copy(actionErrorMessage = "Chapter name is required")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val res = repository.createChapter(subject.id, name.trim())
            res.onSuccess { newChap ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isCreateChapterDialogOpen = false,
                    selectedChapter = newChap
                )
                loadChaptersForSubject(subject.id)
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = err.message ?: "Failed to create chapter"
                )
            }
        }
    }

    fun openEditChapterDialog(chapter: ChapterDto) {
        _uiState.value = _uiState.value.copy(
            isEditChapterDialogOpen = true,
            editingChapter = chapter,
            actionErrorMessage = null
        )
    }

    fun closeEditChapterDialog() {
        _uiState.value = _uiState.value.copy(
            isEditChapterDialogOpen = false,
            editingChapter = null,
            actionErrorMessage = null
        )
    }

    fun updateChapter(name: String) {
        val chapter = _uiState.value.editingChapter ?: return
        if (name.isBlank()) {
            _uiState.value = _uiState.value.copy(actionErrorMessage = "Chapter name is required")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val res = repository.updateChapter(chapter.id, name = name.trim())
            res.onSuccess { updatedChap ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isEditChapterDialogOpen = false,
                    editingChapter = null,
                    selectedChapter = updatedChap
                )
                _uiState.value.selectedSubject?.let { loadChaptersForSubject(it.id) }
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = err.message ?: "Failed to update chapter"
                )
            }
        }
    }

    fun toggleChapterCompletion(chapter: ChapterDto) {
        if (_uiState.value.togglingChapterId == chapter.id) return
        if (_uiState.value.selectedSubject == null) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(togglingChapterId = chapter.id, errorMessage = null)
            val nextCompleted = !chapter.isCompleted
            val res = repository.updateChapter(chapter.id, isCompleted = nextCompleted)
            res.onSuccess { updatedChapter ->
                val updatedList = _uiState.value.chapters.map {
                    if (it.id == updatedChapter.id) updatedChapter else it
                }
                val updatedSelected = if (_uiState.value.selectedChapter?.id == updatedChapter.id) updatedChapter else _uiState.value.selectedChapter
                _uiState.value = _uiState.value.copy(
                    togglingChapterId = null,
                    chapters = updatedList,
                    selectedChapter = updatedSelected
                )
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    togglingChapterId = null,
                    errorMessage = err.message ?: "Failed to update chapter completion"
                )
            }
        }
    }

    fun openDeleteChapterDialog(chapter: ChapterDto) {
        _uiState.value = _uiState.value.copy(
            isDeleteChapterDialogOpen = true,
            deletingChapter = chapter,
            actionErrorMessage = null
        )
    }

    fun closeDeleteChapterDialog() {
        _uiState.value = _uiState.value.copy(
            isDeleteChapterDialogOpen = false,
            deletingChapter = null,
            actionErrorMessage = null
        )
    }

    fun deleteChapter() {
        val chapter = _uiState.value.deletingChapter ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val res = repository.deleteChapter(chapter.id)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isDeleteChapterDialogOpen = false,
                    deletingChapter = null,
                    selectedChapter = null
                )
                _uiState.value.selectedSubject?.let { loadChaptersForSubject(it.id) }
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = err.message ?: "Failed to delete chapter"
                )
            }
        }
    }

    fun setTargetDuration(minutes: Int) {
        if (_uiState.value.isTimerRunning || _uiState.value.isTimerPaused || _uiState.value.isEndingSession) return
        val targetSecs = minutes * 60
        _uiState.value = _uiState.value.copy(
            targetSessionDurationMinutes = minutes,
            remainingSeconds = targetSecs
        )
    }

    fun startTimer() {
        if (_uiState.value.activeSession != null && (_uiState.value.isTimerRunning || _uiState.value.isTimerPaused)) {
            _uiState.value = _uiState.value.copy(errorMessage = "A study session is already active or paused")
            return
        }

        val subject = _uiState.value.selectedSubject ?: run {
            _uiState.value = _uiState.value.copy(errorMessage = "Please select a subject first")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(errorMessage = null)
            val result = sessionManager.startSession(
                subject = subject,
                chapter = _uiState.value.selectedChapter,
                targetMinutes = _uiState.value.targetSessionDurationMinutes
            )

            result.onSuccess { session ->
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        val intervalMins = prefs?.breakReminderIntervalMinutes ?: 50
                        com.studentos.app.notifications.AlarmScheduler.scheduleStudyBreakReminder(ctx, session.id, intervalMins, prefs)
                    }
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(errorMessage = categorizeError(err))
            }
        }
    }

    fun pauseTimer() {
        if (!_uiState.value.isTimerRunning || _uiState.value.isTimerPaused || _uiState.value.isEndingSession) {
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(errorMessage = null)
            val res = sessionManager.pauseSession()
            res.onSuccess { session ->
                repository.getApplicationContext()?.let { ctx ->
                    com.studentos.app.notifications.AlarmScheduler.cancelStudyBreakReminder(ctx, session.id)
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(errorMessage = categorizeError(err))
            }
        }
    }

    fun resumeTimer() {
        if (_uiState.value.isTimerRunning || _uiState.value.isEndingSession) {
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(errorMessage = null)
            val res = sessionManager.resumeSession()
            res.onSuccess { session ->
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        val intervalMins = prefs?.breakReminderIntervalMinutes ?: 50
                        com.studentos.app.notifications.AlarmScheduler.scheduleStudyBreakReminder(ctx, session.id, intervalMins, prefs)
                    }
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(errorMessage = categorizeError(err))
            }
        }
    }

    fun openCancelSessionDialog() {
        if (_uiState.value.activeSession == null || _uiState.value.isEndingSession) {
            _uiState.value = _uiState.value.copy(errorMessage = "No active session to cancel")
            return
        }
        _uiState.value = _uiState.value.copy(isCancelSessionDialogOpen = true, actionErrorMessage = null)
    }

    fun closeCancelSessionDialog() {
        _uiState.value = _uiState.value.copy(isCancelSessionDialogOpen = false, actionErrorMessage = null)
    }

    fun cancelSession() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val activeSessionId = _uiState.value.activeSession?.id
            val res = sessionManager.cancelSession()
            res.onSuccess {
                if (activeSessionId != null) {
                    repository.getApplicationContext()?.let { ctx ->
                        com.studentos.app.notifications.AlarmScheduler.cancelStudyBreakReminder(ctx, activeSessionId)
                    }
                }
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isCancelSessionDialogOpen = false
                )
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = categorizeError(err)
                )
            }
        }
    }

    fun stopTimer() {
        // Explicit guard against multiple/rapid Stop clicks
        if (_uiState.value.isEndingSession || _uiState.value.isSubmittingAction) {
            return
        }
        val session = _uiState.value.activeSession ?: run {
            _uiState.value = _uiState.value.copy(errorMessage = "No active session to complete")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isEndingSession = true,
                isSubmittingAction = true,
                errorMessage = null
            )

            repository.getApplicationContext()?.let { ctx ->
                com.studentos.app.notifications.AlarmScheduler.cancelStudyBreakReminder(ctx, session.id)
            }

            val res = sessionManager.stopSession()
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isEndingSession = false,
                    isSubmittingAction = false
                )
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isEndingSession = false,
                    isSubmittingAction = false,
                    errorMessage = categorizeError(err)
                )
            }
        }
    }

    private fun categorizeError(err: Throwable): String {
        val msg = err.message ?: ""
        return when {
            msg.contains("401", ignoreCase = true) ||
            msg.contains("unauthorized", ignoreCase = true) ||
            msg.contains("expired", ignoreCase = true) ||
            msg.contains("AUTH_", ignoreCase = true) -> {
                "Your session has expired. Please sign in again."
            }
            msg.contains("Unable to resolve host", ignoreCase = true) ||
            msg.contains("ConnectException", ignoreCase = true) ||
            msg.contains("timeout", ignoreCase = true) ||
            msg.contains("Failed to connect", ignoreCase = true) ||
            msg.contains("No address associated", ignoreCase = true) ||
            msg.contains("SocketTimeout", ignoreCase = true) -> {
                "Couldn't reach Student OS. Check your connection and try again."
            }
            msg.contains("SESSION_NOT_FOUND", ignoreCase = true) -> {
                "Study session could not be found or was already ended."
            }
            else -> {
                "Something went wrong while saving your study session."
            }
        }
    }
}
