package com.studentos.app.ui.screens.study

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.RadioButtonUnchecked
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
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.studentos.app.data.model.ChapterDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.ui.components.ErrorBanner
import com.studentos.app.ui.components.LoadingState

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun StudyScreen(viewModel: StudyViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    androidx.compose.runtime.LaunchedEffect(Unit) {
        viewModel.refreshActiveSession()
    }

    if (uiState.isLoading && uiState.subjects.isEmpty()) {
        LoadingState("Loading Study Engine...")
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 96.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "Study Engine",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Track your active focused study sessions and deep work.",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (uiState.errorMessage != null) {
            ErrorBanner(message = uiState.errorMessage!!)
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Subject Header with Actions
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Subjects",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                uiState.selectedSubject?.let { subject ->
                    IconButton(
                        onClick = { viewModel.openEditSubjectDialog(subject) },
                        enabled = !uiState.isTimerRunning && !uiState.isTimerPaused,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Edit Subject",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    IconButton(
                        onClick = { viewModel.openDeleteSubjectDialog(subject) },
                        enabled = !uiState.isTimerRunning && !uiState.isTimerPaused,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Delete Subject",
                            tint = Color(0xFFEF4444),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                TextButton(
                    onClick = { viewModel.openCreateSubjectDialog() },
                    enabled = !uiState.isTimerRunning && !uiState.isTimerPaused
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add Subject", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))

        if (uiState.subjects.isEmpty()) {
            Text("No subjects found. Click '+ Add Subject' to get started.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                uiState.subjects.forEach { subject ->
                    val isSelected = uiState.selectedSubject?.id == subject.id
                    FilterChip(
                        selected = isSelected,
                        onClick = { viewModel.selectSubject(subject) },
                        label = { Text(subject.name, fontSize = 13.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = Color.White,
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            }
        }

        // Chapter Section & Subject Mastery
        if (uiState.selectedSubject != null) {
            Spacer(modifier = Modifier.height(16.dp))

            val totalChapters = uiState.chapters.size
            val completedChapters = uiState.chapters.count { it.isCompleted }
            val progress = if (totalChapters > 0) completedChapters.toFloat() / totalChapters.toFloat() else 0f
            val percentage = (progress * 100).toInt().coerceIn(0, 100)

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Subject Mastery Progress",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "$completedChapters of $totalChapters Chapters Completed ($percentage%)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Topics / Chapters",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                TextButton(
                    onClick = { viewModel.openCreateChapterDialog() },
                    enabled = !uiState.isTimerRunning && !uiState.isTimerPaused
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text("Add Chapter", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(modifier = Modifier.height(6.dp))

            if (uiState.chapters.isEmpty()) {
                Text("No chapters added for this subject yet.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    uiState.chapters.forEach { chapter ->
                        val isSel = uiState.selectedChapter?.id == chapter.id
                        val isCompleted = chapter.isCompleted
                        val isToggling = uiState.togglingChapterId == chapter.id

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    if (isCompleted) Color(0xFFDCFCE7)
                                    else if (isSel) MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                )
                                .border(
                                    1.dp,
                                    if (isCompleted) Color(0xFF16A34A).copy(alpha = 0.4f)
                                    else if (isSel) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                    RoundedCornerShape(8.dp)
                                )
                                .clickable { viewModel.selectChapter(chapter) }
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .clickable(enabled = !isToggling) { viewModel.toggleChapterCompletion(chapter) },
                                contentAlignment = Alignment.Center
                            ) {
                                if (isToggling) {
                                    CircularProgressIndicator(modifier = Modifier.size(12.dp), strokeWidth = 1.5.dp)
                                } else if (isCompleted) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = "Completed",
                                        tint = Color(0xFF16A34A),
                                        modifier = Modifier.size(16.dp)
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.RadioButtonUnchecked,
                                        contentDescription = "Mark Complete",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(6.dp))

                            Text(
                                text = chapter.name,
                                fontSize = 12.sp,
                                fontWeight = if (isSel || isCompleted) FontWeight.Bold else FontWeight.Normal,
                                color = if (isCompleted) Color(0xFF15803D)
                                else if (isSel) MaterialTheme.colorScheme.onPrimaryContainer
                                else MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            if (isSel && !uiState.isTimerRunning && !uiState.isTimerPaused) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Edit Chapter",
                                    tint = if (isCompleted) Color(0xFF15803D) else MaterialTheme.colorScheme.primary,
                                    modifier = Modifier
                                        .size(14.dp)
                                        .clickable { viewModel.openEditChapterDialog(chapter) }
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete Chapter",
                                    tint = Color(0xFFEF4444),
                                    modifier = Modifier
                                        .size(14.dp)
                                        .clickable { viewModel.openDeleteChapterDialog(chapter) }
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Timer Hero Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp)),
            colors = CardDefaults.cardColors(
                containerColor = when {
                    uiState.isTimerRunning -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                    uiState.isTimerPaused -> MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
                    else -> MaterialTheme.colorScheme.surface
                }
            ),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier.padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Status Badge
                val (statusText, statusBg, statusColor) = when {
                    uiState.isTimerRunning -> Triple("ACTIVE • RUNNING", Color(0xFF10B981), Color.White)
                    uiState.isTimerPaused -> Triple("PAUSED • TIMER STOPPED", Color(0xFFF59E0B), Color.White)
                    else -> Triple("IDLE • READY TO STUDY", MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(statusBg)
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(text = statusText, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = statusColor)
                }

                Spacer(modifier = Modifier.height(20.dp))

                val minutes = uiState.elapsedSeconds / 60
                val seconds = uiState.elapsedSeconds % 60
                val timeFormatted = String.format("%02d:%02d", minutes, seconds)

                Text(
                    text = timeFormatted,
                    fontSize = 58.sp,
                    fontWeight = FontWeight.Black,
                    color = when {
                        uiState.isTimerPaused -> Color(0xFFF59E0B)
                        uiState.isTimerRunning -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.onSurface
                    }
                )

                if (uiState.isTimerRunning || uiState.isTimerPaused) {
                    val remMins = uiState.remainingSeconds / 60
                    val remSecs = uiState.remainingSeconds % 60
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "⏳ Countdown: ${remMins}m ${remSecs}s remaining (${uiState.targetSessionDurationMinutes}m target)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "${uiState.selectedSubject?.name ?: "Select a subject above"}${uiState.selectedChapter?.let { " • ${it.name}" } ?: ""}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Control Buttons Matrix (START, PAUSE, RESUME, COMPLETE)
                when {
                    uiState.isTimerRunning -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedButton(
                                onClick = { viewModel.pauseTimer() },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFF59E0B))
                            ) {
                                Icon(Icons.Default.Pause, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Pause", fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B), fontSize = 14.sp)
                            }
                            Button(
                                onClick = { viewModel.stopTimer() },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Complete", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                            }
                        }
                    }

                    uiState.isTimerPaused -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = { viewModel.resumeTimer() },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Resume", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                            }
                            Button(
                                onClick = { viewModel.stopTimer() },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Complete", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = { viewModel.openCancelSessionDialog() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444))
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Cancel Session", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444), fontSize = 13.sp)
                        }
                    }

                    else -> {
                        Button(
                            onClick = { viewModel.startTimer() },
                            enabled = uiState.selectedSubject != null,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Start Study Session", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                        }
                    }
                }
            }
        }
    }

    // --- Dialogs ---

    if (uiState.isCreateSubjectDialogOpen) {
        CreateSubjectDialog(
            onDismiss = { viewModel.closeCreateSubjectDialog() },
            onConfirm = { name -> viewModel.createSubject(name) },
            isSubmitting = uiState.isSubmittingAction,
            error = uiState.actionErrorMessage
        )
    }

    if (uiState.isEditSubjectDialogOpen && uiState.editingSubject != null) {
        EditSubjectDialog(
            subject = uiState.editingSubject!!,
            onDismiss = { viewModel.closeEditSubjectDialog() },
            onConfirm = { name -> viewModel.updateSubject(name) },
            isSubmitting = uiState.isSubmittingAction,
            error = uiState.actionErrorMessage
        )
    }

    if (uiState.isDeleteSubjectDialogOpen && uiState.deletingSubject != null) {
        DeleteSubjectConfirmationDialog(
            subject = uiState.deletingSubject!!,
            onDismiss = { viewModel.closeDeleteSubjectDialog() },
            onConfirm = { viewModel.deleteSubject() },
            isSubmitting = uiState.isSubmittingAction,
            error = uiState.actionErrorMessage
        )
    }

    if (uiState.isCreateChapterDialogOpen) {
        CreateChapterDialog(
            subjectName = uiState.selectedSubject?.name ?: "",
            onDismiss = { viewModel.closeCreateChapterDialog() },
            onConfirm = { name -> viewModel.createChapter(name) },
            isSubmitting = uiState.isSubmittingAction,
            error = uiState.actionErrorMessage
        )
    }

    if (uiState.isEditChapterDialogOpen && uiState.editingChapter != null) {
        EditChapterDialog(
            chapter = uiState.editingChapter!!,
            onDismiss = { viewModel.closeEditChapterDialog() },
            onConfirm = { name -> viewModel.updateChapter(name) },
            isSubmitting = uiState.isSubmittingAction,
            error = uiState.actionErrorMessage
        )
    }

    if (uiState.isDeleteChapterDialogOpen && uiState.deletingChapter != null) {
        DeleteChapterConfirmationDialog(
            chapter = uiState.deletingChapter!!,
            onDismiss = { viewModel.closeDeleteChapterDialog() },
            onConfirm = { viewModel.deleteChapter() },
            isSubmitting = uiState.isSubmittingAction,
            error = uiState.actionErrorMessage
        )
    }

    if (uiState.isCancelSessionDialogOpen) {
        CancelSessionConfirmationDialog(
            onDismiss = { viewModel.closeCancelSessionDialog() },
            onConfirm = { viewModel.cancelSession() },
            isSubmitting = uiState.isSubmittingAction,
            error = uiState.actionErrorMessage
        )
    }
}

@Composable
private fun CancelSessionConfirmationDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    isSubmitting: Boolean,
    error: String?
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancel Study Session?", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444)) },
        text = {
            Column {
                if (error != null) {
                    ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                Text("Warning: Cancelling will discard this active study session. Your study time for this session will not be recorded and no revision items will be created.")
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                else Text("Discard Session", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Keep Session")
            }
        }
    )
}

@Composable
private fun CreateSubjectDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
    isSubmitting: Boolean,
    error: String?
) {
    var name by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create New Subject", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                if (error != null) {
                    ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Subject Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name) },
                enabled = name.isNotBlank() && !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                else Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun EditSubjectDialog(
    subject: SubjectDto,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
    isSubmitting: Boolean,
    error: String?
) {
    var name by remember { mutableStateOf(subject.name) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename Subject", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                if (error != null) {
                    ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Subject Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name) },
                enabled = name.isNotBlank() && !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                else Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun DeleteSubjectConfirmationDialog(
    subject: SubjectDto,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    isSubmitting: Boolean,
    error: String?
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete Subject?", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444)) },
        text = {
            Column {
                if (error != null) {
                    ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                Text("Are you sure you want to delete '${subject.name}'? This will permanently remove all chapters associated with this subject.")
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                else Text("Delete", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun CreateChapterDialog(
    subjectName: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
    isSubmitting: Boolean,
    error: String?
) {
    var name by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Chapter / Topic", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Adding chapter under: $subjectName", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(8.dp))
                if (error != null) {
                    ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Chapter Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name) },
                enabled = name.isNotBlank() && !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                else Text("Add")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun EditChapterDialog(
    chapter: ChapterDto,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
    isSubmitting: Boolean,
    error: String?
) {
    var name by remember { mutableStateOf(chapter.name) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename Chapter", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                if (error != null) {
                    ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Chapter Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name) },
                enabled = name.isNotBlank() && !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                else Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun DeleteChapterConfirmationDialog(
    chapter: ChapterDto,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    isSubmitting: Boolean,
    error: String?
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete Chapter?", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444)) },
        text = {
            Column {
                if (error != null) {
                    ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                Text("Are you sure you want to delete '${chapter.name}'?")
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White)
                else Text("Delete", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}
