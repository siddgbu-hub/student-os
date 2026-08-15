package com.studentos.app.ui.screens.study

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.model.ChapterDto
import com.studentos.app.data.model.StudySessionDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.data.model.calculateElapsedSeconds
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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

    private var timerJob: Job? = null
    private var sessionStartTimeMs: Long = 0L
    private var baseElapsedSeconds: Int = 0

    init {
        loadSubjects()
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
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = err.message)
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
                if (session != null) {
                    val matchingSubject = _uiState.value.subjects.find { it.id == session.subjectId }
                    baseElapsedSeconds = session.calculateElapsedSeconds()
                    val isRunning = session.status == "running" || session.status == "in_progress"
                    val isPaused = session.status == "paused"
                    
                    val targetMins = _uiState.value.targetSessionDurationMinutes
                    val initialRemaining = ((targetMins * 60) - baseElapsedSeconds).coerceAtLeast(0)

                    _uiState.value = _uiState.value.copy(
                        activeSession = session,
                        selectedSubject = matchingSubject ?: _uiState.value.selectedSubject,
                        isTimerRunning = isRunning,
                        isTimerPaused = isPaused,
                        elapsedSeconds = baseElapsedSeconds,
                        remainingSeconds = initialRemaining
                    )
                    if (isRunning) {
                        sessionStartTimeMs = System.currentTimeMillis()
                        startLocalTimerCount()
                    }
                }
            }
        }
    }

    fun selectSubject(subject: SubjectDto) {
        if (_uiState.value.isTimerRunning || _uiState.value.isTimerPaused) {
            _uiState.value = _uiState.value.copy(errorMessage = "Cannot change subject during an active session")
            return
        }
        _uiState.value = _uiState.value.copy(selectedSubject = subject, selectedChapter = null, errorMessage = null)
        loadChaptersForSubject(subject.id)
    }

    fun selectChapter(chapter: ChapterDto?) {
        if (_uiState.value.isTimerRunning || _uiState.value.isTimerPaused) return
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
            res.onSuccess { newSub ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isCreateSubjectDialogOpen = false,
                    selectedSubject = newSub
                )
                loadSubjects()
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
            res.onSuccess { updatedSub ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isEditSubjectDialogOpen = false,
                    editingSubject = null,
                    selectedSubject = updatedSub
                )
                loadSubjects()
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
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isDeleteSubjectDialogOpen = false,
                    deletingSubject = null,
                    selectedSubject = null
                )
                loadSubjects()
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
        if (_uiState.value.isTimerRunning || _uiState.value.isTimerPaused) return
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
            val result = repository.startStudySession(subject.id, _uiState.value.selectedChapter?.id)
            result.onSuccess { session ->
                sessionStartTimeMs = System.currentTimeMillis()
                baseElapsedSeconds = 0
                val targetSecs = _uiState.value.targetSessionDurationMinutes * 60
                
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        val intervalMins = prefs?.breakReminderIntervalMinutes ?: 50
                        com.studentos.app.notifications.AlarmScheduler.scheduleStudyBreakReminder(ctx, session.id, intervalMins, prefs)
                    }
                }

                _uiState.value = _uiState.value.copy(
                    activeSession = session,
                    isTimerRunning = true,
                    isTimerPaused = false,
                    elapsedSeconds = 0,
                    remainingSeconds = targetSecs
                )
                startLocalTimerCount()
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(errorMessage = err.message ?: "Failed to start study session")
            }
        }
    }

    fun pauseTimer() {
        if (!_uiState.value.isTimerRunning || _uiState.value.isTimerPaused) {
            _uiState.value = _uiState.value.copy(errorMessage = "Session cannot be paused in current state")
            return
        }
        val session = _uiState.value.activeSession ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(errorMessage = null)
            timerJob?.cancel()
            baseElapsedSeconds = _uiState.value.elapsedSeconds
            
            val res = repository.pauseStudySession(session.id)
            res.onSuccess { updatedSession ->
                repository.getApplicationContext()?.let { ctx ->
                    com.studentos.app.notifications.AlarmScheduler.cancelStudyBreakReminder(ctx, session.id)
                }
                _uiState.value = _uiState.value.copy(
                    activeSession = updatedSession,
                    isTimerRunning = false,
                    isTimerPaused = true,
                    elapsedSeconds = baseElapsedSeconds
                )
            }.onFailure { err: Throwable ->
                startLocalTimerCount()
                _uiState.value = _uiState.value.copy(errorMessage = err.message ?: "Failed to pause session")
            }
        }
    }

    fun resumeTimer() {
        if (_uiState.value.isTimerRunning) {
            return
        }
        val session = _uiState.value.activeSession ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(errorMessage = null)
            val res = repository.resumeStudySession(session.id)
            res.onSuccess { updatedSession ->
                sessionStartTimeMs = System.currentTimeMillis()
                repository.getApplicationContext()?.let { ctx ->
                    viewModelScope.launch {
                        val prefs = repository.getUserPreferences().getOrNull()
                        val intervalMins = prefs?.breakReminderIntervalMinutes ?: 50
                        com.studentos.app.notifications.AlarmScheduler.scheduleStudyBreakReminder(ctx, updatedSession.id, intervalMins, prefs)
                    }
                }
                _uiState.value = _uiState.value.copy(
                    activeSession = updatedSession,
                    isTimerRunning = true,
                    isTimerPaused = false
                )
                startLocalTimerCount()
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(errorMessage = err.message ?: "Failed to resume session")
            }
        }
    }

    fun openCancelSessionDialog() {
        if (_uiState.value.activeSession == null) {
            _uiState.value = _uiState.value.copy(errorMessage = "No active session to cancel")
            return
        }
        _uiState.value = _uiState.value.copy(isCancelSessionDialogOpen = true, actionErrorMessage = null)
    }

    fun closeCancelSessionDialog() {
        _uiState.value = _uiState.value.copy(isCancelSessionDialogOpen = false, actionErrorMessage = null)
    }

    fun cancelSession() {
        val session = _uiState.value.activeSession ?: run {
            _uiState.value = _uiState.value.copy(isCancelSessionDialogOpen = false, errorMessage = "No active session to cancel")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true, actionErrorMessage = null)
            val res = repository.cancelStudySession(session.id)
            res.onSuccess {
                timerJob?.cancel()
                baseElapsedSeconds = 0
                val defaultTargetSecs = _uiState.value.targetSessionDurationMinutes * 60
                repository.getApplicationContext()?.let { ctx ->
                    com.studentos.app.notifications.AlarmScheduler.cancelStudyBreakReminder(ctx, session.id)
                }
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    isCancelSessionDialogOpen = false,
                    activeSession = null,
                    isTimerRunning = false,
                    isTimerPaused = false,
                    elapsedSeconds = 0,
                    remainingSeconds = defaultTargetSecs
                )
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSubmittingAction = false,
                    actionErrorMessage = err.message ?: "Failed to cancel study session"
                )
            }
        }
    }

    fun stopTimer() {
        val session = _uiState.value.activeSession ?: run {
            _uiState.value = _uiState.value.copy(errorMessage = "No active session to complete")
            return
        }
        val duration = _uiState.value.elapsedSeconds

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(errorMessage = null)
            timerJob?.cancel()
            val res = repository.stopStudySession(session.id, duration)
            res.onSuccess {
                baseElapsedSeconds = 0
                val defaultTargetSecs = _uiState.value.targetSessionDurationMinutes * 60
                repository.getApplicationContext()?.let { ctx ->
                    com.studentos.app.notifications.AlarmScheduler.cancelStudyBreakReminder(ctx, session.id)
                }
                _uiState.value = _uiState.value.copy(
                    activeSession = null,
                    isTimerRunning = false,
                    isTimerPaused = false,
                    elapsedSeconds = 0,
                    remainingSeconds = defaultTargetSecs
                )
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(errorMessage = err.message ?: "Failed to complete session")
            }
        }
    }

    private fun startLocalTimerCount() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (_uiState.value.isTimerRunning) {
                delay(500L)
                val diffSecs = ((System.currentTimeMillis() - sessionStartTimeMs) / 1000).toInt()
                val currentElapsed = baseElapsedSeconds + diffSecs
                val targetSecs = _uiState.value.targetSessionDurationMinutes * 60
                val currentRemaining = (targetSecs - currentElapsed).coerceAtLeast(0)

                _uiState.value = _uiState.value.copy(
                    elapsedSeconds = currentElapsed,
                    remainingSeconds = currentRemaining
                )
            }
        }
    }
}
