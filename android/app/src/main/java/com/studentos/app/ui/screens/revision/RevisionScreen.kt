package com.studentos.app.ui.screens.revision

import android.app.DatePickerDialog
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.FlipToBack
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.studentos.app.data.model.RevisionItemDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.ui.components.ErrorBanner
import com.studentos.app.ui.components.LoadingState
import com.studentos.app.ui.components.StatCard
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RevisionScreen(viewModel: RevisionViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    androidx.compose.runtime.LaunchedEffect(Unit) {
        viewModel.loadRevisionData()
    }

    if (uiState.isLoading && uiState.revisionSummary == null) {
        LoadingState("Loading Spaced Repetition Workspace...")
        return
    }

    val summary = uiState.revisionSummary
    val activeSession = uiState.activeSession
    val allItems = summary?.items ?: emptyList()
    val subjects = uiState.subjects

    val filteredItems = remember(allItems, uiState.selectedQueueFilter) {
        allItems.filter { item ->
            when (uiState.selectedQueueFilter) {
                RevisionQueueFilter.DUE_TODAY -> item.status == "due_today"
                RevisionQueueFilter.OVERDUE -> item.status == "overdue"
                RevisionQueueFilter.UPCOMING -> item.status == "scheduled"
                RevisionQueueFilter.COMPLETED -> item.status == "completed"
            }
        }
    }

    val activeItem = remember(activeSession, allItems) {
        if (activeSession != null) allItems.find { it.id == activeSession.revisionItemId } else null
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Spaced Repetition Engine",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Interactive revision workspace for long-term memory retention.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Button(
                    onClick = { viewModel.openAddDialog() },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add Revision", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Banners
        if (uiState.errorMessage != null) {
            item {
                ErrorBanner(
                    message = uiState.errorMessage!!,
                    onDismiss = { viewModel.clearMessages() }
                )
            }
        }

        if (uiState.successMessage != null) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFDCFCE7))
                        .border(1.dp, Color(0xFF16A34A).copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = uiState.successMessage!!,
                            color = Color(0xFF15803D),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = "✕",
                            color = Color(0xFF15803D),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable { viewModel.clearMessages() }
                                .padding(4.dp)
                        )
                    }
                }
            }
        }

        // ACTIVE REVISION SESSION & INTERACTIVE FLASHCARD STUDY CARD
        if (activeSession != null) {
            item {
                val isRunning = activeSession.status == "running" || activeSession.status == "in_progress"
                val subjectName = subjects.find { it.id == activeSession.subjectId }?.name ?: "Revision Session"
                val timerText = String.format(
                    Locale.US,
                    "%02d:%02d",
                    uiState.elapsedSeconds / 60,
                    uiState.elapsedSeconds % 60
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(if (isRunning) Color(0xFF16A34A) else Color(0xFFEAB308))
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = if (isRunning) "ACTIVE REVISION SESSION" else "SESSION PAUSED",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = subjectName,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                                Text(
                                    text = "Stage ${activeSession.revisionStage} Revision",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                )
                            }
                            Text(
                                text = timerText,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Interactive Flashcard Flip Section
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { viewModel.toggleCardFlip() },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f))
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                if (!uiState.isCardFlipped) {
                                    Icon(Icons.Default.Psychology, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(32.dp))
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "RECALL PROMPT",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = activeItem?.notes?.ifBlank { null } ?: "Recall your study notes and key concepts for $subjectName (Stage ${activeSession.revisionStage}).",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        textAlign = TextAlign.Center,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    OutlinedButton(
                                        onClick = { viewModel.toggleCardFlip() },
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Reveal Answer / Notes", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                } else {
                                    Icon(Icons.Default.Lightbulb, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(32.dp))
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "REVISION CONTENT / NOTES",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFD97706)
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = activeItem?.notes?.ifBlank { null } ?: "Rate your recall performance below to set the authoritative next revision schedule.",
                                        fontSize = 13.sp,
                                        textAlign = TextAlign.Center,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Spacer(modifier = Modifier.height(14.dp))
                                    Text(
                                        text = "SELECT RECALL RATING:",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))

                                    val currStg = activeSession.revisionStage
                                    val nextGoodStg = Math.min(5, currStg + 1)
                                    val nextEasyStg = Math.min(5, currStg + 2)

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        // AGAIN
                                        Card(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable(enabled = !uiState.isSubmitting) {
                                                    viewModel.endActiveSession("again", activeItem?.notes)
                                                },
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCA5A5)),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text("AGAIN", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text("Stage 1\nTomorrow", fontSize = 9.sp, textAlign = TextAlign.Center, color = Color(0xFF991B1B))
                                            }
                                        }

                                        // HARD
                                        Card(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable(enabled = !uiState.isSubmitting) {
                                                    viewModel.endActiveSession("hard", activeItem?.notes)
                                                },
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A)),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text("HARD", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD97706))
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text("Stage $currStg\nShorter", fontSize = 9.sp, textAlign = TextAlign.Center, color = Color(0xFF92400E))
                                            }
                                        }

                                        // GOOD
                                        Card(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable(enabled = !uiState.isSubmitting) {
                                                    viewModel.endActiveSession("good", activeItem?.notes)
                                                },
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFFDCFCE7)),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC)),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text("GOOD", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text("Stage $nextGoodStg\nNormal", fontSize = 9.sp, textAlign = TextAlign.Center, color = Color(0xFF15803D))
                                            }
                                        }

                                        // EASY
                                        Card(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable(enabled = !uiState.isSubmitting) {
                                                    viewModel.endActiveSession("easy", activeItem?.notes)
                                                },
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFFDBEAFE)),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF93C5FD)),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(8.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Text("EASY", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB))
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text("Stage $nextEasyStg\nLonger", fontSize = 9.sp, textAlign = TextAlign.Center, color = Color(0xFF1E40AF))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Controls Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (isRunning) {
                                Button(
                                    onClick = { viewModel.pauseActiveSession() },
                                    enabled = !uiState.isSubmitting,
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAB308)),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.Pause, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Pause", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            } else {
                                Button(
                                    onClick = { viewModel.resumeActiveSession() },
                                    enabled = !uiState.isSubmitting,
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Resume", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }

                            Button(
                                onClick = { viewModel.openEndSessionDialog() },
                                enabled = !uiState.isSubmitting,
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("End Review", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = { viewModel.openCancelSessionDialog() },
                                enabled = !uiState.isSubmitting,
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                            ) {
                                Text("Cancel", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // Summary Stats Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                StatCard(
                    title = "Due Today",
                    value = "${summary?.dueTodayCount ?: 0}",
                    subtitle = "Pending Review",
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Overdue",
                    value = "${summary?.overdueCount ?: 0}",
                    subtitle = "Action Needed",
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Completed Today",
                    value = "${summary?.completedTodayCount ?: 0}",
                    subtitle = "Today",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // QUEUE FILTER TABS
        item {
            val selectedTabIdx = when (uiState.selectedQueueFilter) {
                RevisionQueueFilter.DUE_TODAY -> 0
                RevisionQueueFilter.OVERDUE -> 1
                RevisionQueueFilter.UPCOMING -> 2
                RevisionQueueFilter.COMPLETED -> 3
            }

            TabRow(
                selectedTabIndex = selectedTabIdx,
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                contentColor = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
            ) {
                Tab(
                    selected = uiState.selectedQueueFilter == RevisionQueueFilter.DUE_TODAY,
                    onClick = { viewModel.setQueueFilter(RevisionQueueFilter.DUE_TODAY) },
                    text = { Text("Due Today (${summary?.dueTodayCount ?: 0})", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
                )
                Tab(
                    selected = uiState.selectedQueueFilter == RevisionQueueFilter.OVERDUE,
                    onClick = { viewModel.setQueueFilter(RevisionQueueFilter.OVERDUE) },
                    text = { Text("Overdue (${summary?.overdueCount ?: 0})", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
                )
                Tab(
                    selected = uiState.selectedQueueFilter == RevisionQueueFilter.UPCOMING,
                    onClick = { viewModel.setQueueFilter(RevisionQueueFilter.UPCOMING) },
                    text = { Text("Upcoming", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
                )
                Tab(
                    selected = uiState.selectedQueueFilter == RevisionQueueFilter.COMPLETED,
                    onClick = { viewModel.setQueueFilter(RevisionQueueFilter.COMPLETED) },
                    text = { Text("Completed", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
                )
            }
        }

        // Items List Header
        item {
            Text(
                text = when (uiState.selectedQueueFilter) {
                    RevisionQueueFilter.DUE_TODAY -> "Due Today Queue (${filteredItems.size})"
                    RevisionQueueFilter.OVERDUE -> "Overdue Revision Queue (${filteredItems.size})"
                    RevisionQueueFilter.UPCOMING -> "Upcoming Revisions (${filteredItems.size})"
                    RevisionQueueFilter.COMPLETED -> "Completed Revisions (${filteredItems.size})"
                },
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        // Items List
        if (filteredItems.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = when (uiState.selectedQueueFilter) {
                            RevisionQueueFilter.DUE_TODAY -> "No revisions scheduled for today. Great job!"
                            RevisionQueueFilter.OVERDUE -> "No overdue revisions. Excellent consistency!"
                            RevisionQueueFilter.UPCOMING -> "No upcoming scheduled revisions."
                            RevisionQueueFilter.COMPLETED -> "No completed revisions recorded yet."
                        },
                        modifier = Modifier.padding(20.dp),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            items(filteredItems) { item ->
                RevisionItemCard(
                    item = item,
                    subjects = subjects,
                    isActiveSessionRunning = activeSession != null,
                    onStartReview = { viewModel.startRevisionSession(item) },
                    onEdit = { viewModel.openEditDialog(item) },
                    onReschedule = { viewModel.openRescheduleDialog(item) },
                    onArchive = { viewModel.openArchiveDialog(item) }
                )
            }
        }
    }

    // Dialogs
    if (uiState.isAddDialogOpen) {
        AddRevisionDialog(
            subjects = subjects,
            isSubmitting = uiState.isSubmitting,
            onDismiss = { viewModel.closeAddDialog() },
            onSubmit = { subjectId, chapterId, date, prio, notes ->
                viewModel.createRevisionItem(subjectId, chapterId, date, prio, notes)
            }
        )
    }

    if (uiState.editingItem != null) {
        EditRevisionDialog(
            item = uiState.editingItem!!,
            isSubmitting = uiState.isSubmitting,
            onDismiss = { viewModel.closeEditDialog() },
            onSubmit = { date, prio, notes ->
                viewModel.updateRevisionItem(uiState.editingItem!!.id, date, prio, notes)
            }
        )
    }

    if (uiState.reschedulingItem != null) {
        RescheduleRevisionDialog(
            item = uiState.reschedulingItem!!,
            isSubmitting = uiState.isSubmitting,
            onDismiss = { viewModel.closeRescheduleDialog() },
            onSubmit = { newDate ->
                viewModel.rescheduleRevisionItem(uiState.reschedulingItem!!.id, newDate)
            }
        )
    }

    if (uiState.archivingItem != null) {
        ArchiveRevisionConfirmationDialog(
            item = uiState.archivingItem!!,
            isSubmitting = uiState.isSubmitting,
            onDismiss = { viewModel.closeArchiveDialog() },
            onConfirm = { viewModel.archiveRevisionItem(uiState.archivingItem!!.id) }
        )
    }

    if (uiState.isEndingSessionDialogOpen) {
        EndSessionDialog(
            elapsedSeconds = uiState.elapsedSeconds,
            activeSession = activeSession,
            isSubmitting = uiState.isSubmitting,
            onDismiss = { viewModel.closeEndSessionDialog() },
            onSubmit = { rating, notes -> viewModel.endActiveSession(rating, notes) }
        )
    }

    if (uiState.isCancellingSessionDialogOpen) {
        CancelSessionConfirmationDialog(
            isSubmitting = uiState.isSubmitting,
            onDismiss = { viewModel.closeCancelSessionDialog() },
            onConfirm = { viewModel.cancelActiveSession() }
        )
    }
}

@Composable
fun RevisionItemCard(
    item: RevisionItemDto,
    subjects: List<SubjectDto>,
    isActiveSessionRunning: Boolean,
    onStartReview: () -> Unit,
    onEdit: () -> Unit,
    onReschedule: () -> Unit,
    onArchive: () -> Unit
) {
    val subjectName = subjects.find { it.id == item.subjectId }?.name ?: "Subject"
    val isOverdue = item.status == "overdue"
    val isCompleted = item.status == "completed"

    val stageText = "Stage ${item.revisionStage}"

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isOverdue) Color(0xFFFEF2F2) else MaterialTheme.colorScheme.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isOverdue) Color(0xFFFCA5A5) else MaterialTheme.colorScheme.outline
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = subjectName,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.secondaryContainer)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = stageText,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                    if (isOverdue) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(Color(0xFFFEF2F2))
                                .border(1.dp, Color(0xFFEF4444), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("OVERDUE", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF4444))
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onEdit, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(15.dp))
                    }
                    IconButton(onClick = onReschedule, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Event, contentDescription = "Reschedule", tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(15.dp))
                    }
                    IconButton(onClick = onArchive, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Archive, contentDescription = "Archive", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(15.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            if (!item.notes.isNullOrBlank()) {
                Text(
                    text = item.notes,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Scheduled: ${item.scheduledDate}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (!isCompleted) {
                    Button(
                        onClick = onStartReview,
                        enabled = !isActiveSessionRunning,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Start Review", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddRevisionDialog(
    subjects: List<SubjectDto>,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (subjectId: String, chapterId: String?, scheduledDate: String, priority: String, notes: String?) -> Unit
) {
    val context = LocalContext.current
    var selectedSubjectId by remember { mutableStateOf(subjects.firstOrNull()?.id ?: "") }
    val cal = Calendar.getInstance()
    cal.add(Calendar.DAY_OF_MONTH, 1)
    var scheduledDate by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)) }
    var selectedPriority by remember { mutableStateOf("medium") }
    var notes by remember { mutableStateOf("") }

    val datePickerDialog = remember(scheduledDate) {
        DatePickerDialog(
            context,
            { _, y, m, d ->
                scheduledDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
            },
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH),
            cal.get(Calendar.DAY_OF_MONTH)
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Revision Item", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                if (subjects.isNotEmpty()) {
                    Text("Subject*", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    Spacer(modifier = Modifier.height(4.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        subjects.forEach { sub ->
                            FilterChip(
                                selected = selectedSubjectId == sub.id,
                                onClick = { selectedSubjectId = sub.id },
                                label = { Text(sub.name, fontSize = 12.sp) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }

                Text("Scheduled Date*", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = scheduledDate,
                        onValueChange = { scheduledDate = it },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    IconButton(onClick = { datePickerDialog.show() }) {
                        Icon(Icons.Default.DateRange, contentDescription = "Pick Date")
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text("Notes / Topics", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = { Text("e.g. Chapter 4 Key Formulas") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(selectedSubjectId, null, scheduledDate, selectedPriority, notes) },
                enabled = !isSubmitting && selectedSubjectId.isNotBlank()
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                Text("Create")
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun EditRevisionDialog(
    item: RevisionItemDto,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (scheduledDate: String?, priority: String?, notes: String?) -> Unit
) {
    var scheduledDate by remember { mutableStateOf(item.scheduledDate) }
    var notes by remember { mutableStateOf(item.notes ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Revision Item", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Scheduled Date", fontSize = 12.sp)
                OutlinedTextField(value = scheduledDate, onValueChange = { scheduledDate = it }, modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Text("Notes", fontSize = 12.sp)
                OutlinedTextField(value = notes, onValueChange = { notes = it }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(scheduledDate, null, notes) },
                enabled = !isSubmitting
            ) {
                Text("Save")
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun RescheduleRevisionDialog(
    item: RevisionItemDto,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (newDate: String) -> Unit
) {
    var newDate by remember { mutableStateOf(item.scheduledDate) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Reschedule Revision", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Target Date (YYYY-MM-DD)", fontSize = 12.sp)
                OutlinedTextField(value = newDate, onValueChange = { newDate = it }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(newDate) },
                enabled = !isSubmitting && newDate.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))
            ) {
                Text("Reschedule")
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun ArchiveRevisionConfirmationDialog(
    item: RevisionItemDto,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Archive Revision Item?") },
        text = { Text("Archived revision items scheduled for ${item.scheduledDate} are removed from your active queue.") },
        confirmButton = {
            Button(onClick = onConfirm, enabled = !isSubmitting, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) {
                Text("Archive")
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun EndSessionDialog(
    elapsedSeconds: Int,
    activeSession: com.studentos.app.data.model.RevisionSessionDto?,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (rating: String, notes: String?) -> Unit
) {
    var notes by remember { mutableStateOf("") }
    val formattedTime = String.format(Locale.US, "%02d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
    val currentStage = activeSession?.revisionStage ?: 1

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Complete Revision Session", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Session Duration: $formattedTime", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Current Stage: Stage $currentStage", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(10.dp))
                Text("Session Reflections / Notes (Optional)", fontSize = 12.sp)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = { Text("Add notes about your revision recall...") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text("Select Recall Rating to Complete:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(modifier = Modifier.height(8.dp))

                if (isSubmitting) {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                } else {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Button(
                            onClick = { onSubmit("again", notes) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(2.dp)
                        ) {
                            Text("AGAIN", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Button(
                            onClick = { onSubmit("hard", notes) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(2.dp)
                        ) {
                            Text("HARD", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Button(
                            onClick = { onSubmit("good", notes) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(2.dp)
                        ) {
                            Text("GOOD", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Button(
                            onClick = { onSubmit("easy", notes) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(2.dp)
                        ) {
                            Text("EASY", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { OutlinedButton(onClick = onDismiss, enabled = !isSubmitting) { Text("Cancel") } }
    )
}

@Composable
fun CancelSessionConfirmationDialog(
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancel Revision Session?") },
        text = { Text("Cancelling will discard elapsed session time without advancing the revision stage.") },
        confirmButton = {
            Button(onClick = onConfirm, enabled = !isSubmitting, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) {
                Text("Cancel Session")
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
