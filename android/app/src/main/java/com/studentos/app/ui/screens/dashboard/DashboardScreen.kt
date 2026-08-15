package com.studentos.app.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.studentos.app.data.config.AppConfig
import com.studentos.app.data.model.EntitlementDto
import com.studentos.app.data.model.ExamGoalDto
import com.studentos.app.data.model.PlanDto
import com.studentos.app.ui.components.ErrorBanner
import com.studentos.app.ui.components.LoadingState
import com.studentos.app.ui.components.PullToRefreshLayout
import com.studentos.app.ui.components.StatCard
import com.studentos.app.ui.screens.paywall.PaywallScreen
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onNavigateToPlanner: (openAddTask: Boolean) -> Unit,
    onNavigateToStudy: () -> Unit = {},
    onNavigateToRevision: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()

    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                viewModel.loadDashboardData()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }


    androidx.compose.runtime.LaunchedEffect(uiState.refreshMessage) {
        if (uiState.refreshMessage != null) {
            kotlinx.coroutines.delay(2500)
            viewModel.clearRefreshMessage()
        }
    }

    if (uiState.isLoading && uiState.accountOverview == null) {
        LoadingState("Loading Study Overview...")
        return
    }

    val profile = uiState.accountOverview?.profile
    val fullName = profile?.fullName ?: "Student"
    val targetMinutes = profile?.preferredDailyStudyTargetMinutes ?: 120
    val totalSeconds = uiState.todaySummary?.totalDurationSeconds ?: 0
    val studiedMinutes = totalSeconds / 60
    val completedSessions = uiState.todaySummary?.completedSessionsCount ?: 0

    val dailyTasks = uiState.dailyPlan?.tasks ?: emptyList()
    val totalTasks = dailyTasks.size
    val completedTasks = dailyTasks.count { it.status == "completed" }
    val pendingTasks = totalTasks - completedTasks

    val dueRevisionCount = uiState.revisionSummary?.dueTodayCount ?: 0
    val streakDays = uiState.analyticsDashboard?.productivitySummary?.currentStreakDays ?: 1
    val activeSession = uiState.activeSession
    val goalProgress = uiState.goalProgress
    val activeGoal = goalProgress?.goal

    PullToRefreshLayout(
        isRefreshing = uiState.isRefreshing,
        onRefresh = { viewModel.refreshDashboard() },
        modifier = Modifier.fillMaxSize()
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 12.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Transient Refresh Feedback Banner
            if (uiState.refreshMessage != null) {
                item {
                    val isErrMsg = uiState.refreshMessage!!.startsWith("Could")
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isErrMsg)
                                    MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.9f)
                                else
                                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.85f)
                            )
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = uiState.refreshMessage!!,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isErrMsg)
                                MaterialTheme.colorScheme.onErrorContainer
                            else
                                MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            // 1. Greeting
            item {
                Column {
                    Text(
                        text = "Welcome back, $fullName 👋",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Here is your study overview for today.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // 2. Trial Status & Live Countdown Card
        item {
            TrialCountdownCard(
                entitlement = uiState.entitlement,
                onUpgradeClick = { viewModel.openUpgradeSheet() }
            )
        }

        if (uiState.errorMessage != null) {
            item {
                ErrorBanner(message = uiState.errorMessage!!)
            }
        }

        // 3. Academic Target Exam Goal Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Flag,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Academic Goal",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        if (activeGoal != null) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { viewModel.openEditGoalDialog() },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Edit,
                                        contentDescription = "Edit Goal",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                IconButton(
                                    onClick = { viewModel.openDeleteGoalDialog() },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete Goal",
                                        tint = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    if (activeGoal != null) {
                        val badge = goalProgress?.statusBadge ?: "NOT_STARTED"
                        val badgeBg = when (badge) {
                            "COMPLETED" -> Color(0xFFDCFCE7)
                            "ON_TRACK", "AHEAD" -> Color(0xFFDBEAFE)
                            "AT_RISK" -> Color(0xFFFEF3C7)
                            "BEHIND" -> Color(0xFFFEE2E2)
                            else -> Color(0xFFF1F5F9)
                        }
                        val badgeColor = when (badge) {
                            "COMPLETED" -> Color(0xFF15803D)
                            "ON_TRACK", "AHEAD" -> Color(0xFF1D4ED8)
                            "AT_RISK" -> Color(0xFFB45309)
                            "BEHIND" -> Color(0xFFB91C1C)
                            else -> Color(0xFF475569)
                        }

                        val targetChapters = activeGoal.targetTotalChapters ?: 0
                        val completedChapters = goalProgress?.completedChapters ?: 0
                        val chapterPct = if (targetChapters > 0) ((completedChapters.toFloat() / targetChapters.toFloat()) * 100).toInt().coerceIn(0, 100) else 0

                        // Line 1: Exam Name (left) & Status Badge (right)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = activeGoal.examName,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(badgeBg)
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = badge.replace("_", " "),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = badgeColor,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Line 2: Target Date (left) & Days Left Pill (right)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Target Exam Date: ${activeGoal.examDate}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MaterialTheme.colorScheme.primaryContainer)
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "${goalProgress?.daysRemaining ?: 0} Days Left",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }

                        if (targetChapters > 0) {
                            Spacer(modifier = Modifier.height(14.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Overall Progress: $completedChapters / $targetChapters Chapters",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    text = "$chapterPct% Complete",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            LinearProgressIndicator(
                                progress = { (completedChapters.toFloat() / targetChapters.toFloat()).coerceIn(0f, 1f) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = MaterialTheme.colorScheme.primary,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "No Target Exam Set",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Set an exam target date to calculate countdown and daily targets.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = { viewModel.openCreateGoalDialog() },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Set Goal", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // 3. Single Hero Study Progress Section
        item {
            val progressFraction = (studiedMinutes.toFloat() / targetMinutes.toFloat()).coerceIn(0f, 1f)
            val remainingMinutes = (targetMinutes - studiedMinutes).coerceAtLeast(0)
            val percentageInt = (progressFraction * 100).toInt()

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Timer,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Today's Progress",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Text(
                            text = "$percentageInt%",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(
                                text = "$studiedMinutes min",
                                fontSize = 30.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = " / $targetMinutes min",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 3.dp, start = 4.dp)
                            )
                        }
                        Text(
                            text = if (remainingMinutes > 0) "$remainingMinutes min remaining" else "Target Reached!",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (remainingMinutes > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    LinearProgressIndicator(
                        progress = { progressFraction },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                    )
                }
            }
        }

        // 4. Primary Dynamic Action CTA Card
        item {
            val (actionTitle, actionSubtitle, buttonLabel) = when {
                activeSession != null && activeSession.status == "running" -> Triple(
                    "Study Session in Progress",
                    "Session is active • Track your focus time",
                    "Continue Study"
                )
                activeSession != null && activeSession.status == "paused" -> Triple(
                    "Study Session Paused",
                    "Session is paused • Ready to resume?",
                    "Resume Study"
                )
                else -> Triple(
                    "Start a Study Session",
                    if (pendingTasks > 0) "$pendingTasks tasks pending • $dueRevisionCount review(s) due" else "Launch your next focused study block",
                    "Start Session"
                )
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = actionTitle,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = actionSubtitle,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (activeSession != null) {
                            OutlinedButton(
                                onClick = { viewModel.openCancelSessionDialog() },
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444)),
                                modifier = Modifier.height(40.dp)
                            ) {
                                Text("Cancel", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444), fontSize = 12.sp)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Button(
                            onClick = { onNavigateToStudy() },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(buttonLabel, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // 5. Quick Stats Grid
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Today's Tasks
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateToPlanner(false) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "Today's Tasks", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(text = "$completedTasks / $totalTasks", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    }
                }

                // Revision Queue
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNavigateToRevision() },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(18.dp))
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "Revision Queue", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(text = "$dueRevisionCount Due", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    title = "Current Streak",
                    value = "$streakDays Day",
                    subtitle = null,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Sessions Done",
                    value = "$completedSessions",
                    subtitle = null,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

    if (uiState.isGoalDialogOpen) {
        GoalDialog(
            isEditing = uiState.isEditingGoal,
            currentGoal = activeGoal,
            isSubmitting = uiState.isSubmittingGoal,
            errorMessage = uiState.goalError,
            onDismiss = { viewModel.closeGoalDialog() },
            onSubmit = { examName, examDate, targetMins, targetTotalChapters, completedChapters, targetScore ->
                viewModel.saveGoal(examName, examDate, targetMins, targetTotalChapters, completedChapters, targetScore)
            }
        )
    }

    if (uiState.isDeleteGoalDialogOpen && activeGoal != null) {
        DeleteGoalConfirmationDialog(
            examName = activeGoal.examName,
            isSubmitting = uiState.isSubmittingGoal,
            onDismiss = { viewModel.closeDeleteGoalDialog() },
            onConfirmDelete = { viewModel.deleteGoal() }
        )
    }

    if (uiState.isCancelSessionDialogOpen) {
        CancelDashboardSessionConfirmationDialog(
            isSubmitting = uiState.isCancellingSession,
            error = uiState.cancelSessionError,
            onDismiss = { viewModel.closeCancelSessionDialog() },
            onConfirmCancel = { viewModel.cancelActiveSession() }
        )
    }

    if (uiState.isUpgradeSheetOpen) {
        val email = uiState.accountOverview?.email ?: "sidd.gbu@gmail.com"

        UpgradePlansDialog(
            plans = uiState.plans,
            contactWhatsApp = uiState.paymentConfig?.contactWhatsApp,
            accountEmail = email,
            entitlement = uiState.entitlement,
            onDismiss = { viewModel.closeUpgradeSheet() }
        )
    }
}

@Composable
private fun CancelDashboardSessionConfirmationDialog(
    isSubmitting: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onConfirmCancel: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancel Study Session?", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFFEF4444)) },
        text = {
            Column {
                if (error != null) {
                    com.studentos.app.ui.components.ErrorBanner(message = error)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                Text("Warning: Cancelling will discard this active study session. Your study time for this session will not be recorded and no revision items will be created.")
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirmCancel,
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text("Discard Session", fontWeight = FontWeight.Bold, color = Color.White)
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                enabled = !isSubmitting,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Keep Session")
            }
        },
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(16.dp)
    )
}

@Composable
fun GoalDialog(
    isEditing: Boolean,
    currentGoal: ExamGoalDto?,
    isSubmitting: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onSubmit: (
        examName: String,
        examDate: String,
        targetDailyMinutes: Int,
        targetTotalChapters: Int?,
        completedChapters: Int,
        targetScore: String?
    ) -> Unit
) {
    var examName by remember { mutableStateOf(if (isEditing) currentGoal?.examName ?: "" else "") }
    var examDate by remember { mutableStateOf(if (isEditing) currentGoal?.examDate ?: "" else "") }
    var targetDailyMinutesStr by remember { mutableStateOf(if (isEditing) (currentGoal?.targetDailyMinutes ?: 120).toString() else "120") }
    var targetTotalChaptersStr by remember { mutableStateOf(if (isEditing) currentGoal?.targetTotalChapters?.toString() ?: "50" else "50") }
    var completedChaptersStr by remember { mutableStateOf(if (isEditing) (currentGoal?.completedChapters ?: 0).toString() else "0") }
    var targetScore by remember { mutableStateOf(if (isEditing) currentGoal?.targetScore ?: "" else "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (isEditing) "Edit Academic Goal" else "Set Target Exam Goal",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                if (errorMessage != null) {
                    ErrorBanner(message = errorMessage)
                    Spacer(modifier = Modifier.height(12.dp))
                }

                Text("Exam / Target Name*", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = examName,
                    onValueChange = { examName = it },
                    placeholder = { Text("e.g. SAT Exam, Final Exams") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text("Exam Date (YYYY-MM-DD)*", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = examDate,
                    onValueChange = { examDate = it },
                    placeholder = { Text("2026-12-01") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Total Chapters", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = targetTotalChaptersStr,
                            onValueChange = { targetTotalChaptersStr = it.filter { ch -> ch.isDigit() } },
                            placeholder = { Text("50") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outline
                            )
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text("Completed Ch.", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = completedChaptersStr,
                            onValueChange = { completedChaptersStr = it.filter { ch -> ch.isDigit() } },
                            placeholder = { Text("0") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outline
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Daily Target (mins)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = targetDailyMinutesStr,
                            onValueChange = { targetDailyMinutesStr = it.filter { ch -> ch.isDigit() } },
                            placeholder = { Text("120") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outline
                            )
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text("Target Score / Grade", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = targetScore,
                            onValueChange = { targetScore = it },
                            placeholder = { Text("e.g. 99th / A+") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outline
                            )
                        )
                    }
                }
            }
        },
        confirmButton = {
            val isFormValid = examName.isNotBlank() && examDate.trim().matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))
            val targetMins = targetDailyMinutesStr.toIntOrNull() ?: 120
            val targetChapters = targetTotalChaptersStr.toIntOrNull()
            val completedChapters = completedChaptersStr.toIntOrNull() ?: 0

            Button(
                onClick = { onSubmit(examName, examDate, targetMins, targetChapters, completedChapters, targetScore.ifBlank { null }) },
                enabled = !isSubmitting && isFormValid,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text(if (isEditing) "Save Changes" else "Set Goal", fontWeight = FontWeight.Bold, color = Color.White)
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(16.dp)
    )
}

@Composable
fun DeleteGoalConfirmationDialog(
    examName: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirmDelete: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Delete Academic Goal?",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        },
        text = {
            Text(
                text = "Are you sure you want to delete your goal target for '$examName'? This will clear your exam countdown.",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirmDelete,
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text("Delete Goal", fontWeight = FontWeight.Bold, color = Color.White)
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(16.dp)
    )
}

@Composable
fun TrialCountdownCard(
    entitlement: EntitlementDto?,
    onUpgradeClick: () -> Unit
) {
    val isExpired = entitlement?.isExpired == true
    val isPaid = entitlement?.isPaid == true
    val remainingTimeText = rememberTimeRemaining(entitlement?.expiresAt)

    // STATE A — ACTIVE PAID PRO: No dashboard card. Premium identity is communicated
    // via the top-bar avatar golden ring + crown. Account page has the full details.
    if (isPaid && !isExpired) {
        return
    }

    if (isExpired) {
        val isPaidExpired = entitlement?.isPaid == true || entitlement?.currentPlanId == "monthly" || entitlement?.currentPlanId == "yearly"
        val expiredTitle = if (isPaidExpired) "Student OS Pro Ended" else "7-Day Free Trial Ended"
        val expiredSubtitle = if (isPaidExpired) "Your study data is safe. Renew to continue full access." else "Upgrade to continue using Student OS."

        // Expired Trial / Subscription Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onUpgradeClick() },
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
            ),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.error.copy(alpha = 0.4f)
            )
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.error),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = expiredTitle,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = expiredSubtitle,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = onUpgradeClick,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Text("Upgrade", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    } else {
        // STATE B — ACTIVE 7-DAY FREE TRIAL
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onUpgradeClick() },
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
            )
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "7-Day Free Trial",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = remainingTimeText,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Enjoy full access to Student OS",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = onUpgradeClick,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Text("Upgrade", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun UpgradePlansDialog(
    plans: List<PlanDto>,
    contactWhatsApp: String?,
    accountEmail: String,
    entitlement: EntitlementDto? = null,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        PaywallScreen(
            plans = plans,
            contactWhatsApp = contactWhatsApp,
            accountEmail = accountEmail,
            entitlement = entitlement,
            onDismiss = onDismiss
        )
    }
}

@Composable
fun rememberTimeRemaining(expiresAtIso: String?): String {
    if (expiresAtIso.isNullOrBlank()) return "Active"

    var timeRemaining by remember(expiresAtIso) {
        mutableStateOf(calculateRemainingTime(expiresAtIso))
    }

    androidx.compose.runtime.LaunchedEffect(expiresAtIso) {
        while (true) {
            timeRemaining = calculateRemainingTime(expiresAtIso)
            kotlinx.coroutines.delay(1000L)
        }
    }

    return timeRemaining
}

@Composable
fun rememberProExpiryText(expiresAtIso: String?): String {
    if (expiresAtIso.isNullOrBlank()) return "Pro access active"

    var proText by remember(expiresAtIso) {
        mutableStateOf(formatProExpiryText(expiresAtIso))
    }

    androidx.compose.runtime.LaunchedEffect(expiresAtIso) {
        while (true) {
            proText = formatProExpiryText(expiresAtIso)
            kotlinx.coroutines.delay(1000L)
        }
    }

    return proText
}

fun formatProExpiryText(expiresAtIso: String?): String {
    if (expiresAtIso.isNullOrBlank()) return "Pro access active"
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val cleanIso = expiresAtIso.replace("Z", "").substringBefore(".")
        val expiry = sdf.parse(cleanIso)?.time ?: return "Pro access active"
        val now = System.currentTimeMillis()
        val diff = expiry - now

        if (diff <= 0) {
            "Pro access ended"
        } else {
            val days = diff / (1000 * 60 * 60 * 24)
            val hours = (diff / (1000 * 60 * 60)) % 24
            when {
                days > 30 -> "Pro access active"
                days in 7..30 -> "Pro access · $days days left"
                days in 1..6 -> "Pro access · $days ${if (days == 1L) "day" else "days"} left"
                hours > 0 -> "Pro access · ends today"
                else -> "Pro access · ends today"
            }
        }
    } catch (e: Exception) {
        "Pro access active"
    }
}

fun calculateRemainingTime(expiresAtIso: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val cleanIso = expiresAtIso.replace("Z", "").substringBefore(".")
        val expiry = sdf.parse(cleanIso)?.time ?: return "Active"
        val now = System.currentTimeMillis()
        val diff = expiry - now

        if (diff <= 0) {
            "Trial expired"
        } else {
            val days = diff / (1000 * 60 * 60 * 24)
            val hours = (diff / (1000 * 60 * 60)) % 24
            val minutes = (diff / (1000 * 60)) % 60
            val seconds = (diff / 1000) % 60

            when {
                days > 1 -> "$days days left"
                days == 1L -> "1 day, $hours hrs left"
                hours > 0 -> "$hours hrs, $minutes mins left"
                minutes > 0 -> "$minutes mins left"
                else -> "$seconds seconds left"
            }
        }
    } catch (e: Exception) {
        "Active"
    }
}
