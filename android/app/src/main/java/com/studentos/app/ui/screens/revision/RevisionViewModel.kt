package com.studentos.app.ui.screens.revision

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.model.CreateRevisionItemInputDto
import com.studentos.app.data.model.DailyRevisionSummaryDto
import com.studentos.app.data.model.RevisionItemDto
import com.studentos.app.data.model.RevisionSessionDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.data.model.UpdateRevisionItemInputDto
import com.studentos.app.data.model.calculateElapsedSeconds
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class RevisionQueueFilter {
    DUE_TODAY,
    OVERDUE,
    UPCOMING,
    COMPLETED
}

data class RevisionUiState(
    val isLoading: Boolean = true,
    val selectedQueueFilter: RevisionQueueFilter = RevisionQueueFilter.DUE_TODAY,
    val revisionSummary: DailyRevisionSummaryDto? = null,
    val activeSession: RevisionSessionDto? = null,
    val elapsedSeconds: Int = 0,
    val isCardFlipped: Boolean = false,
    val subjects: List<SubjectDto> = emptyList(),
    val isAddDialogOpen: Boolean = false,
    val editingItem: RevisionItemDto? = null,
    val reschedulingItem: RevisionItemDto? = null,
    val archivingItem: RevisionItemDto? = null,
    val isEndingSessionDialogOpen: Boolean = false,
    val isCancellingSessionDialogOpen: Boolean = false,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class RevisionViewModel(private val repository: StudentOsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(RevisionUiState())
    val uiState: StateFlow<RevisionUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null

    fun loadRevisionData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            // Load subjects for display/mapping
            repository.getSubjects().onSuccess { subs ->
                _uiState.value = _uiState.value.copy(subjects = subs)
            }

            // Load due items summary
            val summaryRes = repository.getRevisionDueToday()
            summaryRes.onSuccess { summary ->
                _uiState.value = _uiState.value.copy(revisionSummary = summary)
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(errorMessage = err.message)
            }

            // Restore active revision session if exists
            val activeRes = repository.getActiveRevisionSession()
            activeRes.onSuccess { session ->
                if (session != null) {
                    setSessionAndStartTimer(session)
                } else {
                    stopTimer()
                    _uiState.value = _uiState.value.copy(activeSession = null, elapsedSeconds = 0, isCardFlipped = false)
                }
            }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun setQueueFilter(filter: RevisionQueueFilter) {
        _uiState.value = _uiState.value.copy(selectedQueueFilter = filter)
    }

    fun toggleCardFlip() {
        _uiState.value = _uiState.value.copy(isCardFlipped = !_uiState.value.isCardFlipped)
    }

    fun resetCardFlip() {
        _uiState.value = _uiState.value.copy(isCardFlipped = false)
    }

    private fun setSessionAndStartTimer(session: RevisionSessionDto) {
        val elapsed = session.calculateElapsedSeconds()
        _uiState.value = _uiState.value.copy(activeSession = session, elapsedSeconds = elapsed)

        stopTimer()
        val isRunning = session.status == "running" || session.status == "in_progress"
        if (isRunning) {
            timerJob = viewModelScope.launch {
                while (true) {
                    delay(1000L)
                    val currentSecs = _uiState.value.activeSession?.calculateElapsedSeconds()
                        ?: (_uiState.value.elapsedSeconds + 1)
                    _uiState.value = _uiState.value.copy(elapsedSeconds = currentSecs)
                }
            }
        }
    }

    private fun stopTimer() {
        timerJob?.cancel()
        timerJob = null
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(errorMessage = null, successMessage = null)
    }

    // --- ITEM CRUD ---

    fun openAddDialog() {
        _uiState.value = _uiState.value.copy(isAddDialogOpen = true, errorMessage = null)
    }

    fun closeAddDialog() {
        _uiState.value = _uiState.value.copy(isAddDialogOpen = false)
    }

    fun createRevisionItem(
        subjectId: String,
        chapterId: String?,
        scheduledDate: String,
        priority: String,
        notes: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val input = CreateRevisionItemInputDto(
                subjectId = subjectId,
                chapterId = chapterId?.ifBlank { null },
                scheduledDate = scheduledDate,
                priority = priority,
                notes = notes?.ifBlank { null }
            )
            val res = repository.createRevisionItem(input)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    isAddDialogOpen = false,
                    successMessage = "Revision item created"
                )
                loadRevisionData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to create revision item"
                )
            }
        }
    }

    fun openEditDialog(item: RevisionItemDto) {
        _uiState.value = _uiState.value.copy(editingItem = item, errorMessage = null)
    }

    fun closeEditDialog() {
        _uiState.value = _uiState.value.copy(editingItem = null)
    }

    fun updateRevisionItem(
        itemId: String,
        scheduledDate: String?,
        priority: String?,
        notes: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val input = UpdateRevisionItemInputDto(
                scheduledDate = scheduledDate,
                priority = priority,
                notes = notes
            )
            val res = repository.updateRevisionItem(itemId, input)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    editingItem = null,
                    successMessage = "Revision item updated"
                )
                loadRevisionData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to update revision item"
                )
            }
        }
    }

    fun openRescheduleDialog(item: RevisionItemDto) {
        _uiState.value = _uiState.value.copy(reschedulingItem = item, errorMessage = null)
    }

    fun closeRescheduleDialog() {
        _uiState.value = _uiState.value.copy(reschedulingItem = null)
    }

    fun rescheduleRevisionItem(itemId: String, scheduledDate: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val res = repository.rescheduleRevisionItem(itemId, scheduledDate)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    reschedulingItem = null,
                    successMessage = "Revision item rescheduled"
                )
                loadRevisionData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to reschedule revision item"
                )
            }
        }
    }

    fun openArchiveDialog(item: RevisionItemDto) {
        _uiState.value = _uiState.value.copy(archivingItem = item, errorMessage = null)
    }

    fun closeArchiveDialog() {
        _uiState.value = _uiState.value.copy(archivingItem = null)
    }

    fun archiveRevisionItem(itemId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val res = repository.archiveRevisionItem(itemId)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    archivingItem = null,
                    successMessage = "Revision item archived"
                )
                loadRevisionData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to archive revision item"
                )
            }
        }
    }

    // --- SESSION LIFECYCLE ---

    fun startRevisionSession(item: RevisionItemDto) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val res = repository.startRevisionSession(item.id)
            res.onSuccess { session ->
                _uiState.value = _uiState.value.copy(isSubmitting = false, isCardFlipped = false)
                setSessionAndStartTimer(session)
                loadRevisionData()
            }.onFailure { err ->
                val userMsg = if (err.message?.contains("ACTIVE_STUDY_SESSION_EXISTS", ignoreCase = true) == true) {
                    "Cannot start revision: an active study session is already running. Please pause or end your study session first."
                } else if (err.message?.contains("ACTIVE_REVISION_SESSION_EXISTS", ignoreCase = true) == true) {
                    "A revision session is already active."
                } else {
                    err.message ?: "Failed to start revision session"
                }
                _uiState.value = _uiState.value.copy(isSubmitting = false, errorMessage = userMsg)
            }
        }
    }

    fun pauseActiveSession() {
        val session = _uiState.value.activeSession ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val res = repository.pauseRevisionSession(session.id)
            res.onSuccess { updatedSession ->
                _uiState.value = _uiState.value.copy(isSubmitting = false)
                setSessionAndStartTimer(updatedSession)
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to pause revision session"
                )
            }
        }
    }

    fun resumeActiveSession() {
        val session = _uiState.value.activeSession ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val res = repository.resumeRevisionSession(session.id)
            res.onSuccess { updatedSession ->
                _uiState.value = _uiState.value.copy(isSubmitting = false)
                setSessionAndStartTimer(updatedSession)
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to resume revision session"
                )
            }
        }
    }

    fun openEndSessionDialog() {
        _uiState.value = _uiState.value.copy(isEndingSessionDialogOpen = true, errorMessage = null)
    }

    fun closeEndSessionDialog() {
        _uiState.value = _uiState.value.copy(isEndingSessionDialogOpen = false)
    }

    fun endActiveSession(rating: String = "good", notes: String? = null) {
        val session = _uiState.value.activeSession ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val res = repository.endRevisionSession(session.id, rating = rating, notes = notes?.ifBlank { null })
            res.onSuccess { result ->
                stopTimer()
                val statusMsg = if (result.item.status == "completed") {
                    "Revision completed! Mastered subject material."
                } else {
                    "Revision saved (${rating.uppercase()}). Next review: ${result.item.scheduledDate} (Stage ${result.item.revisionStage})."
                }
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    isEndingSessionDialogOpen = false,
                    activeSession = null,
                    elapsedSeconds = 0,
                    isCardFlipped = false,
                    successMessage = statusMsg
                )
                loadRevisionData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to end revision session"
                )
            }
        }
    }

    fun openCancelSessionDialog() {
        _uiState.value = _uiState.value.copy(isCancellingSessionDialogOpen = true, errorMessage = null)
    }

    fun closeCancelSessionDialog() {
        _uiState.value = _uiState.value.copy(isCancellingSessionDialogOpen = false)
    }

    fun cancelActiveSession() {
        val session = _uiState.value.activeSession ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            val res = repository.cancelRevisionSession(session.id)
            res.onSuccess {
                stopTimer()
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    isCancellingSessionDialogOpen = false,
                    activeSession = null,
                    elapsedSeconds = 0,
                    isCardFlipped = false,
                    successMessage = "Revision session cancelled"
                )
                loadRevisionData()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = err.message ?: "Failed to cancel revision session"
                )
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopTimer()
    }
}
