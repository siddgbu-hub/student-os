package com.studentos.app.ui.screens.planner

import android.app.DatePickerDialog
import android.app.TimePickerDialog
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
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.EventRepeat
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Today
import androidx.compose.material.icons.filled.ViewWeek
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.studentos.app.data.model.DailyPlanSummaryDto
import com.studentos.app.data.model.MonthlyCalendarDayDto
import com.studentos.app.data.model.MonthlyPlanSummaryDto
import com.studentos.app.data.model.PlannerTaskDto
import com.studentos.app.data.model.SubjectDto
import com.studentos.app.ui.components.ErrorBanner
import com.studentos.app.ui.components.LoadingState
import com.studentos.app.ui.components.StatCard
import java.text.DateFormatSymbols
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PlannerScreen(
    viewModel: PlannerViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val todayStr = remember { viewModel.getTodayDateString() }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        viewModel.loadDailyPlan()
    }

    if (uiState.isLoading && uiState.dailyPlan == null && uiState.plannerViewMode == PlannerViewMode.DAILY) {
        LoadingState("Loading Planner Tasks...")
        return
    }

    val allTasks = uiState.dailyPlan?.tasks ?: emptyList()
    val hasActiveFilters = uiState.selectedSubjectIdFilter != null || uiState.selectedPriorityFilter != null || uiState.selectedStatusFilter != "all"

    val filteredTasks = remember(allTasks, uiState.selectedSubjectIdFilter, uiState.selectedPriorityFilter, uiState.selectedStatusFilter, todayStr) {
        val baseFiltered = allTasks.filter { task ->
            val matchSubject = uiState.selectedSubjectIdFilter == null || task.subjectId == uiState.selectedSubjectIdFilter
            val matchPriority = uiState.selectedPriorityFilter == null || task.priority.equals(uiState.selectedPriorityFilter, ignoreCase = true)
            val matchStatus = when (uiState.selectedStatusFilter) {
                "pending" -> task.status != "completed"
                "completed" -> task.status == "completed"
                else -> true
            }
            matchSubject && matchPriority && matchStatus
        }
        sortPlannerTasks(baseFiltered, todayStr)
    }

    val conflictingTaskIds = remember(allTasks) {
        getConflictingTaskIds(allTasks)
    }

    Scaffold(
        floatingActionButton = {
            if (uiState.plannerViewMode == PlannerViewMode.DAILY) {
                ExtendedFloatingActionButton(
                    onClick = { viewModel.openAddTaskDialog() },
                    icon = { Icon(Icons.Default.Add, contentDescription = "Add Task") },
                    text = { Text("Add Task", fontWeight = FontWeight.Bold) },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(12.dp)
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
        ) {
            // Screen Header & 3-Way View Mode Selector
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Planner Engine",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Manage daily tasks, weekly targets, and monthly capacity.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (uiState.plannerViewMode == PlannerViewMode.DAILY) {
                        Button(
                            onClick = { viewModel.openAddTaskDialog() },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Task", fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // View Mode Tabs (Daily | Weekly | Monthly)
                val selectedTabIdx = when (uiState.plannerViewMode) {
                    PlannerViewMode.DAILY -> 0
                    PlannerViewMode.WEEKLY -> 1
                    PlannerViewMode.MONTHLY -> 2
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
                        selected = uiState.plannerViewMode == PlannerViewMode.DAILY,
                        onClick = { viewModel.setPlannerViewMode(PlannerViewMode.DAILY) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.ListAlt, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Daily Tasks", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    )
                    Tab(
                        selected = uiState.plannerViewMode == PlannerViewMode.WEEKLY,
                        onClick = { viewModel.setPlannerViewMode(PlannerViewMode.WEEKLY) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.ViewWeek, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Weekly Planner", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    )
                    Tab(
                        selected = uiState.plannerViewMode == PlannerViewMode.MONTHLY,
                        onClick = { viewModel.setPlannerViewMode(PlannerViewMode.MONTHLY) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Monthly Calendar", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    )
                }
            }

            // View Content Router
            when (uiState.plannerViewMode) {
                PlannerViewMode.WEEKLY -> {
                    WeeklyPlannerView(
                        uiState = uiState,
                        todayStr = todayStr,
                        onPreviousWeek = { viewModel.previousWeek() },
                        onNextWeek = { viewModel.nextWeek() },
                        onGoToTodayWeek = { viewModel.goToTodayWeek() },
                        onSelectDate = { dateStr -> viewModel.selectDateFromWeeklyDay(dateStr) }
                    )
                }
                PlannerViewMode.MONTHLY -> {
                    MonthlyPlannerView(
                        uiState = uiState,
                        todayStr = todayStr,
                        onPreviousMonth = { viewModel.previousMonth() },
                        onNextMonth = { viewModel.nextMonth() },
                        onGoToTodayMonth = { viewModel.goToTodayMonth() },
                        onSelectDate = { dateStr -> viewModel.selectDateFromCalendar(dateStr) }
                    )
                }
                PlannerViewMode.DAILY -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        contentPadding = PaddingValues(top = 8.dp, bottom = 96.dp)
                    ) {
                        item {
                            // Date Navigation Header
                            DateNavigationHeader(
                                selectedDate = uiState.selectedDate,
                                todayDate = todayStr,
                                onPreviousDay = { viewModel.previousDay() },
                                onNextDay = { viewModel.nextDay() },
                                onGoToToday = { viewModel.goToToday() },
                                onSelectDate = { dateStr -> viewModel.selectDate(dateStr) }
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            if (uiState.errorMessage != null) {
                                ErrorBanner(message = uiState.errorMessage!!)
                                Spacer(modifier = Modifier.height(16.dp))
                            }

                            val totalTasks = uiState.dailyPlan?.totalTasksCount ?: 0
                            val completedTasks = uiState.dailyPlan?.completedTasksCount ?: 0
                            val totalPlanned = uiState.dailyPlan?.totalPlannedDurationMinutes ?: 0

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                StatCard(
                                    title = "Tasks Completed",
                                    value = "$completedTasks / $totalTasks",
                                    subtitle = "Daily Progress",
                                    modifier = Modifier.weight(1f)
                                )
                                StatCard(
                                    title = "Planned Duration",
                                    value = "${totalPlanned}m",
                                    subtitle = "Allocated Time",
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            Spacer(modifier = Modifier.height(16.dp))

                            // --- TASK FILTERS ---
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.surface)
                                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.FilterList, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Filter Tasks",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                    if (hasActiveFilters) {
                                        TextButton(
                                            onClick = { viewModel.clearFilters() },
                                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(14.dp))
                                            Spacer(modifier = Modifier.width(2.dp))
                                            Text("Clear Filters", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Priority Filters
                                Text("Priority:", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.height(4.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    listOf(null to "All Priority", "high" to "High", "medium" to "Med", "low" to "Low").forEach { (prioKey, label) ->
                                        val isSel = uiState.selectedPriorityFilter == prioKey
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { viewModel.setPriorityFilter(prioKey) },
                                            label = { Text(label, fontSize = 11.sp) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = when (prioKey) {
                                                    "high" -> Color(0xFFEF4444)
                                                    "medium" -> Color(0xFFF59E0B)
                                                    "low" -> Color(0xFF6B7280)
                                                    else -> MaterialTheme.colorScheme.primary
                                                },
                                                selectedLabelColor = Color.White,
                                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Status Filters
                                Text("Status:", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.height(4.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    listOf("all" to "All Status", "pending" to "Pending", "completed" to "Completed").forEach { (statKey, label) ->
                                        val isSel = uiState.selectedStatusFilter == statKey
                                        FilterChip(
                                            selected = isSel,
                                            onClick = { viewModel.setStatusFilter(statKey) },
                                            label = { Text(label, fontSize = 11.sp) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                selectedLabelColor = Color.White,
                                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        )
                                    }
                                }

                                if (uiState.subjects.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text("Subject:", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        item {
                                            val isSel = uiState.selectedSubjectIdFilter == null
                                            FilterChip(
                                                selected = isSel,
                                                onClick = { viewModel.setSubjectFilter(null) },
                                                label = { Text("All Subjects", fontSize = 11.sp) },
                                                colors = FilterChipDefaults.filterChipColors(
                                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                    selectedLabelColor = Color.White,
                                                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                                    labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            )
                                        }
                                        items(uiState.subjects) { sub ->
                                            val isSel = uiState.selectedSubjectIdFilter == sub.id
                                            FilterChip(
                                                selected = isSel,
                                                onClick = { viewModel.setSubjectFilter(sub.id) },
                                                label = { Text(sub.name, fontSize = 11.sp) },
                                                colors = FilterChipDefaults.filterChipColors(
                                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                    selectedLabelColor = Color.White,
                                                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                                    labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (uiState.selectedDate == todayStr) "Today's Tasks (${filteredTasks.size})" else "Tasks for ${uiState.selectedDate} (${filteredTasks.size})",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        if (allTasks.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(24.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = if (uiState.selectedDate == todayStr) "No tasks planned for today" else "No tasks planned for ${uiState.selectedDate}",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Create a study task to schedule your learning targets.",
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Button(
                                            onClick = { viewModel.openAddTaskDialog() },
                                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Add Study Task", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        } else if (filteredTasks.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(24.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = "No tasks match the selected filters",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Try clearing priority or subject filters to view all tasks.",
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Spacer(modifier = Modifier.height(12.dp))
                                        OutlinedButton(
                                            onClick = { viewModel.clearFilters() },
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("Clear Filters")
                                        }
                                    }
                                }
                            }
                        } else {
                            items(filteredTasks) { task ->
                                val isDone = task.status == "completed"
                                val isOverdue = task.status != "completed" && task.plannedDate < todayStr
                                val hasConflict = conflictingTaskIds.contains(task.id)

                                val subjectName = uiState.subjects.find { it.id == task.subjectId }?.name ?: "General Study"
                                val prio = task.priority.lowercase()

                                val prioColor = when (prio) {
                                    "high" -> Color(0xFFEF4444)
                                    "medium" -> Color(0xFFF59E0B)
                                    else -> Color(0xFF6B7280)
                                }
                                val prioBg = when (prio) {
                                    "high" -> Color(0xFFFEF2F2)
                                    "medium" -> Color(0xFFFFFBEB)
                                    else -> Color(0xFFF3F4F6)
                                }
                                val prioLabel = when (prio) {
                                    "high" -> "HIGH"
                                    "medium" -> "MED"
                                    else -> "LOW"
                                }

                                val durationStr = formatTaskDuration(task.estimatedDurationMinutes ?: 0)
                                val startTimeFormatted = formatDisplayTime(task.plannedStartTime)

                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isOverdue) Color(0xFFFEF2F2) else MaterialTheme.colorScheme.surface
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isOverdue) Color(0xFFFCA5A5) else MaterialTheme.colorScheme.outline
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(22.dp)
                                                    .clip(CircleShape)
                                                    .background(if (isDone) MaterialTheme.colorScheme.primary else Color.Transparent)
                                                    .border(1.5.dp, MaterialTheme.colorScheme.primary, CircleShape)
                                                    .clickable { viewModel.toggleTaskStatus(task) },
                                                contentAlignment = Alignment.Center
                                            ) {
                                                if (isDone) {
                                                    Icon(Icons.Default.Check, contentDescription = "Done", tint = Color.White, modifier = Modifier.size(14.dp))
                                                }
                                            }

                                            Spacer(modifier = Modifier.width(10.dp))

                                            Column(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .clickable { viewModel.toggleTaskStatus(task) }
                                            ) {
                                                FlowRow(
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    if (isOverdue) {
                                                        Box(
                                                            modifier = Modifier
                                                                .clip(RoundedCornerShape(4.dp))
                                                                .background(Color(0xFFFEF2F2))
                                                                .border(1.dp, Color(0xFFEF4444), RoundedCornerShape(4.dp))
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Text(
                                                                text = "OVERDUE",
                                                                fontSize = 9.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = Color(0xFFEF4444)
                                                            )
                                                        }
                                                    }

                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(4.dp))
                                                            .background(prioBg)
                                                            .border(1.dp, prioColor.copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = prioLabel,
                                                            fontSize = 9.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = prioColor
                                                        )
                                                    }

                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(4.dp))
                                                            .background(MaterialTheme.colorScheme.primaryContainer)
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = subjectName,
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.SemiBold,
                                                            color = MaterialTheme.colorScheme.onPrimaryContainer
                                                        )
                                                    }

                                                    if (startTimeFormatted.isNotBlank()) {
                                                        Box(
                                                            modifier = Modifier
                                                                .clip(RoundedCornerShape(4.dp))
                                                                .background(MaterialTheme.colorScheme.secondaryContainer)
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                                Icon(Icons.Default.Schedule, contentDescription = null, tint = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.size(10.dp))
                                                                Spacer(modifier = Modifier.width(2.dp))
                                                                Text(
                                                                    text = startTimeFormatted,
                                                                    fontSize = 10.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = MaterialTheme.colorScheme.onSecondaryContainer
                                                                )
                                                            }
                                                        }
                                                    }

                                                    if (durationStr.isNotBlank()) {
                                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                                            Icon(Icons.Default.Schedule, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(11.dp))
                                                            Spacer(modifier = Modifier.width(2.dp))
                                                            Text(
                                                                text = durationStr,
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.Medium,
                                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                                            )
                                                        }
                                                    }

                                                    if (hasConflict) {
                                                        Box(
                                                            modifier = Modifier
                                                                .clip(RoundedCornerShape(4.dp))
                                                                .background(Color(0xFFFFFBEB))
                                                                .border(1.dp, Color(0xFFF59E0B), RoundedCornerShape(4.dp))
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                                Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(10.dp))
                                                                Spacer(modifier = Modifier.width(2.dp))
                                                                Text(
                                                                    text = "Time Conflict",
                                                                    fontSize = 9.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = Color(0xFFD97706)
                                                                )
                                                            }
                                                        }
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(4.dp))

                                                Text(
                                                    text = task.title,
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = if (isDone) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                                    textDecoration = if (isDone) TextDecoration.LineThrough else TextDecoration.None
                                                )

                                                if (!task.notes.isNullOrBlank()) {
                                                    Spacer(modifier = Modifier.height(2.dp))
                                                    Text(
                                                        text = task.notes,
                                                        fontSize = 11.sp,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                        maxLines = 2
                                                    )
                                                }
                                            }

                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                IconButton(
                                                    onClick = { viewModel.openEditTaskDialog(task) },
                                                    modifier = Modifier.size(30.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Edit,
                                                        contentDescription = "Edit Task",
                                                        tint = MaterialTheme.colorScheme.primary,
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                }
                                                IconButton(
                                                    onClick = { viewModel.openRescheduleTaskDialog(task) },
                                                    modifier = Modifier.size(30.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.EventRepeat,
                                                        contentDescription = "Reschedule Task",
                                                        tint = MaterialTheme.colorScheme.secondary,
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                }
                                                IconButton(
                                                    onClick = { viewModel.openDeleteTaskDialog(task) },
                                                    modifier = Modifier.size(30.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Delete,
                                                        contentDescription = "Delete Task",
                                                        tint = MaterialTheme.colorScheme.error,
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (uiState.isAddTaskDialogOpen) {
        AddTaskDialog(
            subjects = uiState.subjects,
            isSubmitting = uiState.isSubmittingTask,
            errorMessage = uiState.createTaskError,
            onDismiss = { viewModel.closeAddTaskDialog() },
            onSubmit = { subjectInput, title, plannedStartTime, duration, priority, notes ->
                viewModel.createTask(subjectInput, title, plannedStartTime, duration, priority, notes)
            }
        )
    }

    if (uiState.isEditTaskDialogOpen && uiState.editingTask != null) {
        EditTaskDialog(
            task = uiState.editingTask!!,
            subjects = uiState.subjects,
            isSubmitting = uiState.isSubmittingTask,
            errorMessage = uiState.taskActionError,
            onDismiss = { viewModel.closeEditTaskDialog() },
            onSubmit = { title, plannedStartTime, duration, priority, notes ->
                viewModel.updateTask(title, plannedStartTime, duration, priority, notes)
            }
        )
    }

    if (uiState.isRescheduleDialogOpen && uiState.reschedulingTask != null) {
        RescheduleTaskDialog(
            task = uiState.reschedulingTask!!,
            isSubmitting = uiState.isSubmittingTask,
            errorMessage = uiState.taskActionError,
            onDismiss = { viewModel.closeRescheduleTaskDialog() },
            onRescheduleTomorrow = {
                viewModel.rescheduleTaskToTomorrow()
            },
            onSubmit = { newDate ->
                viewModel.rescheduleTask(newDate)
            }
        )
    }

    if (uiState.isDeleteTaskDialogOpen && uiState.deletingTask != null) {
        DeleteTaskConfirmationDialog(
            taskTitle = uiState.deletingTask!!.title,
            isSubmitting = uiState.isSubmittingTask,
            onDismiss = { viewModel.closeDeleteTaskDialog() },
            onConfirmDelete = { viewModel.deleteTask() }
        )
    }
}

@Composable
fun WeeklyPlannerView(
    uiState: PlannerUiState,
    todayStr: String,
    onPreviousWeek: () -> Unit,
    onNextWeek: () -> Unit,
    onGoToTodayWeek: () -> Unit,
    onSelectDate: (String) -> Unit
) {
    val weekly = uiState.weeklyPlan

    val dateRangeLabel = remember(uiState.selectedWeekStartDate, weekly) {
        val start = weekly?.startDate ?: uiState.selectedWeekStartDate
        val end = weekly?.endDate ?: ""
        if (end.isNotBlank()) formatWeekRangeLabel(start, end) else "Week of $start"
    }

    val todayMonday = remember(todayStr) {
        val cal = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        cal.time = sdf.parse(todayStr) ?: Date()
        cal.firstDayOfWeek = Calendar.MONDAY
        val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        val diff = if (dayOfWeek == Calendar.SUNDAY) -6 else Calendar.MONDAY - dayOfWeek
        cal.add(Calendar.DAY_OF_MONTH, diff)
        sdf.format(cal.time)
    }

    val isCurrentWeekSelected = uiState.selectedWeekStartDate == todayMonday

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
    ) {
        // Week Navigation Header
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onPreviousWeek) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Week", tint = MaterialTheme.colorScheme.primary)
                    }

                    Text(
                        text = dateRangeLabel,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    IconButton(onClick = onNextWeek) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Next Week", tint = MaterialTheme.colorScheme.primary)
                    }
                }

                if (!isCurrentWeekSelected) {
                    OutlinedButton(
                        onClick = onGoToTodayWeek,
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Today, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Current Week", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (uiState.isWeeklyLoading && weekly == null) {
            LoadingState("Loading Weekly Planner...")
            return
        }

        if (uiState.weeklyErrorMessage != null) {
            ErrorBanner(message = uiState.weeklyErrorMessage)
            Spacer(modifier = Modifier.height(14.dp))
        }

        val totalPlannedMins = weekly?.totalPlannedDurationMinutes ?: 0
        val completedMins = weekly?.completedDurationMinutes ?: 0

        val totalPlannedHrs = totalPlannedMins / 60.0
        val completedHrs = completedMins / 60.0

        val compPercentage = if (totalPlannedMins > 0) {
            ((completedMins.toDouble() / totalPlannedMins.toDouble()) * 100.0).toInt().coerceIn(0, 100)
        } else 0

        val totalTasks = weekly?.dailySummaries?.sumOf { it.totalTasksCount } ?: 0

        // Weekly Stat Cards (2x2)
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                StatCard(
                    title = "⏱ Planned Duration",
                    value = String.format(Locale.US, "%.1fh", totalPlannedHrs),
                    subtitle = "Allocated Week Time",
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "✅ Completed Duration",
                    value = String.format(Locale.US, "%.1fh", completedHrs),
                    subtitle = "Finished Study Time",
                    modifier = Modifier.weight(1f)
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                StatCard(
                    title = "📈 Completion Rate",
                    value = "$compPercentage%",
                    subtitle = "Weekly Target Rate",
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "📋 Total Tasks",
                    value = "$totalTasks Tasks",
                    subtitle = "Across 7 Days",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Weekly Capacity Progress Bar
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Weekly Capacity Execution",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "$compPercentage% Complete",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { compPercentage.toFloat() / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // --- 7-DAY DAY-BY-DAY CARDS ---
        Text(
            text = "7-Day Target Breakdown",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))

        val daysList = remember(uiState.selectedWeekStartDate, weekly) {
            get7DaysForWeek(weekly?.startDate ?: uiState.selectedWeekStartDate, weekly?.dailySummaries ?: emptyList())
        }

        daysList.forEach { (dayDate, daySummary) ->
            val isToday = dayDate == todayStr
            val plannedDuration = daySummary?.totalPlannedDurationMinutes ?: 0
            val compDuration = daySummary?.completedDurationMinutes ?: 0
            val plannedTasksCount = daySummary?.totalTasksCount ?: 0
            val compTasksCount = daySummary?.completedTasksCount ?: 0
            val dayTasks = daySummary?.tasks ?: emptyList()

            val dayProgress = if (plannedDuration > 0) (compDuration.toFloat() / plannedDuration.toFloat()).coerceIn(0f, 1f) else 0f
            val formattedDayHeader = formatDayHeader(dayDate)

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clickable { onSelectDate(dayDate) },
                colors = CardDefaults.cardColors(
                    containerColor = if (isToday) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface
                ),
                border = androidx.compose.foundation.BorderStroke(
                    if (isToday) 1.5.dp else 1.dp,
                    if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
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
                            Text(
                                text = formattedDayHeader,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (isToday) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(MaterialTheme.colorScheme.primary)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text("TODAY", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = "$compTasksCount / $plannedTasksCount Tasks",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (plannedDuration > 0) "${formatTaskDuration(compDuration)} done • ${formatTaskDuration(plannedDuration)} planned" else "No duration allocated",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { dayProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )

                    if (dayTasks.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            dayTasks.take(3).forEach { t ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(if (t.status == "completed") Color(0xFF16A34A) else MaterialTheme.colorScheme.primary)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = t.title,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (t.status == "completed") MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                        textDecoration = if (t.status == "completed") TextDecoration.LineThrough else TextDecoration.None,
                                        maxLines = 1,
                                        modifier = Modifier.weight(1f)
                                    )
                                    if (!t.plannedStartTime.isNullOrBlank()) {
                                        Text(
                                            text = formatDisplayTime(t.plannedStartTime),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("No tasks planned", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
fun MonthlyPlannerView(
    uiState: PlannerUiState,
    todayStr: String,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onGoToTodayMonth: () -> Unit,
    onSelectDate: (String) -> Unit
) {
    val monthName = remember(uiState.selectedMonth) {
        DateFormatSymbols(Locale.US).months[uiState.selectedMonth - 1]
    }

    val cal = remember(uiState.selectedYear, uiState.selectedMonth) {
        Calendar.getInstance().apply {
            set(Calendar.YEAR, uiState.selectedYear)
            set(Calendar.MONTH, uiState.selectedMonth - 1)
            set(Calendar.DAY_OF_MONTH, 1)
        }
    }

    val daysInMonth = remember(cal) { cal.getActualMaximum(Calendar.DAY_OF_MONTH) }
    val firstDayOfWeek = remember(cal) {
        val day = cal.get(Calendar.DAY_OF_WEEK)
        if (day == Calendar.SUNDAY) 6 else day - 2
    }

    val currentYear = remember { Calendar.getInstance().get(Calendar.YEAR) }
    val currentMonth = remember { Calendar.getInstance().get(Calendar.MONTH) + 1 }
    val isCurrentMonthSelected = uiState.selectedYear == currentYear && uiState.selectedMonth == currentMonth

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
    ) {
        // Month Navigation Bar
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onPreviousMonth) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Month", tint = MaterialTheme.colorScheme.primary)
                    }

                    Text(
                        text = "$monthName ${uiState.selectedYear}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    IconButton(onClick = onNextMonth) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Next Month", tint = MaterialTheme.colorScheme.primary)
                    }
                }

                if (!isCurrentMonthSelected) {
                    OutlinedButton(
                        onClick = onGoToTodayMonth,
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Today, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Current Month", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (uiState.isMonthlyLoading && uiState.monthlyPlan == null) {
            LoadingState("Loading Monthly Planner...")
            return
        }

        if (uiState.monthlyErrorMessage != null) {
            ErrorBanner(message = uiState.monthlyErrorMessage)
            Spacer(modifier = Modifier.height(14.dp))
        }

        val summary = uiState.monthlyPlan

        // Monthly Summary Stat Cards (2x2 grid)
        val streak = summary?.studyStreakDays ?: 0
        val plannedHrs = summary?.plannedHours ?: 0.0
        val completedHrs = summary?.completedHours ?: 0.0
        val compPercentage = (summary?.completionPercentage ?: 0.0).toInt().coerceIn(0, 100)
        val missedTasks = summary?.missedTasksCount ?: 0

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                StatCard(
                    title = "🔥 Study Streak",
                    value = "$streak Days",
                    subtitle = "Active Learning",
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "⏱ Study Hours",
                    value = String.format(Locale.US, "%.1fh / %.1fh", completedHrs, plannedHrs),
                    subtitle = "Completed / Target",
                    modifier = Modifier.weight(1f)
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                StatCard(
                    title = "📈 Completion Rate",
                    value = "$compPercentage%",
                    subtitle = "Monthly Progress",
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "⚠️ Missed Targets",
                    value = "$missedTasks Tasks",
                    subtitle = "Overdue / Incomplete",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Monthly Capacity Progress Bar
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Monthly Capacity Execution",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "$compPercentage% Complete",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { compPercentage.toFloat() / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // --- 7-COLUMN MONTHLY CALENDAR GRID ---
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = "$monthName ${uiState.selectedYear} Calendar",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Tap any date to jump directly to Daily Tasks.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Weekday Header (MON TUE WED THU FRI SAT SUN)
                Row(modifier = Modifier.fillMaxWidth()) {
                    listOf("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN").forEach { dayHeader ->
                        Text(
                            text = dayHeader,
                            modifier = Modifier.weight(1f),
                            textAlign = TextAlign.Center,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Build Calendar Cells
                val daysMap = summary?.days?.associateBy { it.date } ?: emptyMap()

                val totalGridCells = firstDayOfWeek + daysInMonth
                val totalRows = (totalGridCells + 6) / 7

                for (row in 0 until totalRows) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        for (col in 0 until 7) {
                            val cellIndex = row * 7 + col
                            val dayNum = cellIndex - firstDayOfWeek + 1

                            if (dayNum in 1..daysInMonth) {
                                val dateStr = String.format(Locale.US, "%04d-%02d-%02d", uiState.selectedYear, uiState.selectedMonth, dayNum)
                                val dayDto = daysMap[dateStr]
                                val isToday = dateStr == todayStr

                                val hasAct = dayDto?.hasActivity == true || (dayDto?.studyMinutes ?: 0) > 0 || (dayDto?.plannedTasksCount ?: 0) > 0

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(0.9f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(
                                            when {
                                                isToday -> MaterialTheme.colorScheme.primaryContainer
                                                hasAct -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                                else -> Color.Transparent
                                            }
                                        )
                                        .border(
                                            width = if (isToday) 1.5.dp else 0.5.dp,
                                            color = when {
                                                isToday -> MaterialTheme.colorScheme.primary
                                                hasAct -> MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                                                else -> Color.Transparent
                                            },
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                        .clickable { onSelectDate(dateStr) }
                                        .padding(2.dp),
                                    contentAlignment = Alignment.TopCenter
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center,
                                        modifier = Modifier.fillMaxSize()
                                    ) {
                                        Text(
                                            text = "$dayNum",
                                            fontSize = 12.sp,
                                            fontWeight = if (isToday || hasAct) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isToday) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                                        )

                                        if (hasAct) {
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Box(
                                                modifier = Modifier
                                                    .size(5.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.primary)
                                            )
                                            if ((dayDto?.plannedTasksCount ?: 0) > 0) {
                                                Text(
                                                    text = "${dayDto?.completedTasksCount ?: 0}/${dayDto?.plannedTasksCount ?: 0}",
                                                    fontSize = 8.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                    }
                                }
                            } else {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

private fun formatWeekRangeLabel(startDateStr: String, endDateStr: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val d1 = sdf.parse(startDateStr) ?: Date()
        val d2 = sdf.parse(endDateStr) ?: Date()
        val month1 = SimpleDateFormat("MMM d", Locale.US).format(d1)
        val month2 = SimpleDateFormat("MMM d, yyyy", Locale.US).format(d2)
        "$month1 - $month2"
    } catch (_: Exception) {
        "$startDateStr to $endDateStr"
    }
}

private fun formatDayHeader(dateStr: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val d = sdf.parse(dateStr) ?: Date()
        SimpleDateFormat("EEEE, MMM d", Locale.US).format(d)
    } catch (_: Exception) {
        dateStr
    }
}

private fun get7DaysForWeek(mondayDateStr: String, summaries: List<DailyPlanSummaryDto>): List<Pair<String, DailyPlanSummaryDto?>> {
    val summaryMap = summaries.associateBy { it.date }
    val result = mutableListOf<Pair<String, DailyPlanSummaryDto?>>()
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    try {
        val cal = Calendar.getInstance()
        cal.time = sdf.parse(mondayDateStr) ?: Date()
        for (i in 0 until 7) {
            val dateStr = sdf.format(cal.time)
            result.add(Pair(dateStr, summaryMap[dateStr]))
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }
    } catch (_: Exception) {
        // Fallback
    }
    return result
}

private fun formatTaskDuration(minutes: Int): String {
    if (minutes <= 0) return ""
    if (minutes < 60) return "${minutes}m"
    val hrs = minutes / 60
    val remMins = minutes % 60
    return if (remMins == 0) "${hrs}h" else "${hrs}h ${remMins}m"
}

private fun formatDisplayTime(timeStr: String?): String {
    if (timeStr.isNullOrBlank()) return ""
    return try {
        val parts = timeStr.trim().split(":")
        val hrs = parts[0].toInt()
        val mins = parts[1].toInt()
        val amPm = if (hrs >= 12) "PM" else "AM"
        val displayHrs = when {
            hrs == 0 -> 12
            hrs > 12 -> hrs - 12
            else -> hrs
        }
        String.format(Locale.US, "%02d:%02d %s", displayHrs, mins, amPm)
    } catch (_: Exception) {
        timeStr
    }
}

private fun sortPlannerTasks(tasks: List<PlannerTaskDto>, todayStr: String): List<PlannerTaskDto> {
    return tasks.sortedWith(
        Comparator { t1, t2 ->
            val o1 = t1.status != "completed" && t1.plannedDate < todayStr
            val o2 = t2.status != "completed" && t2.plannedDate < todayStr
            if (o1 != o2) return@Comparator if (o1) -1 else 1

            val hasTime1 = !t1.plannedStartTime.isNullOrBlank()
            val hasTime2 = !t2.plannedStartTime.isNullOrBlank()
            if (hasTime1 != hasTime2) return@Comparator if (hasTime1) -1 else 1
            if (hasTime1 && hasTime2) {
                val cmpTime = (t1.plannedStartTime ?: "").compareTo(t2.plannedStartTime ?: "")
                if (cmpTime != 0) return@Comparator cmpTime
            }

            val prioWeight = mapOf("high" to 1, "medium" to 2, "low" to 3)
            val p1 = prioWeight[t1.priority.lowercase()] ?: 2
            val p2 = prioWeight[t2.priority.lowercase()] ?: 2
            if (p1 != p2) return@Comparator p1.compareTo(p2)

            t1.title.compareTo(t2.title, ignoreCase = true)
        }
    )
}

private fun getConflictingTaskIds(tasks: List<PlannerTaskDto>): Set<String> {
    val conflictingIds = mutableSetOf<String>()
    val tasksByDate = tasks.groupBy { it.plannedDate }
    for ((_, dateTasks) in tasksByDate) {
        val timedTasks = dateTasks.filter { 
            it.status != "cancelled" && !it.plannedStartTime.isNullOrBlank() && (it.estimatedDurationMinutes ?: 0) > 0 
        }
        for (i in timedTasks.indices) {
            val t1 = timedTasks[i]
            val s1 = parseTimeToMinutes(t1.plannedStartTime) ?: continue
            val e1 = s1 + (t1.estimatedDurationMinutes ?: 0)
            
            for (j in i + 1 until timedTasks.size) {
                val t2 = timedTasks[j]
                val s2 = parseTimeToMinutes(t2.plannedStartTime) ?: continue
                val e2 = s2 + (t2.estimatedDurationMinutes ?: 0)
                
                if (maxOf(s1, s2) < minOf(e1, e2)) {
                    conflictingIds.add(t1.id)
                    conflictingIds.add(t2.id)
                }
            }
        }
    }
    return conflictingIds
}

private fun parseTimeToMinutes(timeStr: String?): Int? {
    if (timeStr.isNullOrBlank()) return null
    return try {
        val parts = timeStr.trim().split(":")
        if (parts.size >= 2) parts[0].toInt() * 60 + parts[1].toInt() else null
    } catch (_: Exception) {
        null
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddTaskDialog(
    subjects: List<SubjectDto>,
    isSubmitting: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onSubmit: (subjectInput: String, title: String, plannedStartTime: String?, durationMinutes: Int, priority: String, notes: String?) -> Unit
) {
    val context = LocalContext.current
    var title by remember { mutableStateOf("") }
    var selectedSubjectId by remember { mutableStateOf(subjects.firstOrNull()?.id ?: "") }
    var plannedStartTime by remember { mutableStateOf<String?>(null) }
    var selectedDuration by remember { mutableIntStateOf(45) }
    var selectedPriority by remember { mutableStateOf("medium") }
    var notes by remember { mutableStateOf("") }

    val timePickerDialog = remember(plannedStartTime) {
        val initialHrs = plannedStartTime?.let { parseTimeToMinutes(it)?.div(60) } ?: 9
        val initialMins = plannedStartTime?.let { parseTimeToMinutes(it)?.rem(60) } ?: 0
        TimePickerDialog(
            context,
            { _, h, m ->
                plannedStartTime = String.format(Locale.US, "%02d:%02d", h, m)
            },
            initialHrs,
            initialMins,
            false
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Add Study Task",
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

                Text("Task Title*", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("e.g. Solve 10 Calculus problems", fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                if (subjects.isNotEmpty()) {
                    Text("Subject*", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        subjects.forEach { sub ->
                            val isSel = selectedSubjectId == sub.id
                            FilterChip(
                                selected = isSel,
                                onClick = { selectedSubjectId = sub.id },
                                label = { Text(sub.name, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = Color.White,
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                    labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                Text("Target Start Time (Optional)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { timePickerDialog.show() },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (!plannedStartTime.isNullOrBlank()) formatDisplayTime(plannedStartTime) else "Select Start Time",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    if (!plannedStartTime.isNullOrBlank()) {
                        Spacer(modifier = Modifier.width(6.dp))
                        IconButton(
                            onClick = { plannedStartTime = null },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear Start Time", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text("Planned Duration (Minutes)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    listOf(15, 30, 45, 60, 90, 120).forEach { mins ->
                        val isSel = selectedDuration == mins
                        FilterChip(
                            selected = isSel,
                            onClick = { selectedDuration = mins },
                            label = { Text("${mins}m", fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = Color.White,
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text("Priority", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    listOf("low" to "Low", "medium" to "Medium", "high" to "High").forEach { (key, label) ->
                        val isSel = selectedPriority == key
                        FilterChip(
                            selected = isSel,
                            onClick = { selectedPriority = key },
                            label = { Text(label, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = when (key) {
                                    "high" -> Color(0xFFEF4444)
                                    "medium" -> Color(0xFFF59E0B)
                                    else -> Color(0xFF6B7280)
                                },
                                selectedLabelColor = Color.White,
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text("Notes (Optional)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = { Text("Add study notes or references...", fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(selectedSubjectId, title, plannedStartTime, selectedDuration, selectedPriority, notes) },
                enabled = !isSubmitting && title.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text("Create Task", fontWeight = FontWeight.Bold, color = Color.White)
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EditTaskDialog(
    task: PlannerTaskDto,
    subjects: List<SubjectDto>,
    isSubmitting: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onSubmit: (title: String, plannedStartTime: String?, durationMinutes: Int, priority: String, notes: String?) -> Unit
) {
    val context = LocalContext.current
    var title by remember { mutableStateOf(task.title) }
    var plannedStartTime by remember { mutableStateOf(task.plannedStartTime) }
    var selectedDuration by remember { mutableIntStateOf(task.estimatedDurationMinutes ?: 45) }
    var selectedPriority by remember { mutableStateOf(task.priority.lowercase()) }
    var notes by remember { mutableStateOf(task.notes ?: "") }

    val timePickerDialog = remember(plannedStartTime) {
        val initialHrs = plannedStartTime?.let { parseTimeToMinutes(it)?.div(60) } ?: 9
        val initialMins = plannedStartTime?.let { parseTimeToMinutes(it)?.rem(60) } ?: 0
        TimePickerDialog(
            context,
            { _, h, m ->
                plannedStartTime = String.format(Locale.US, "%02d:%02d", h, m)
            },
            initialHrs,
            initialMins,
            false
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Edit Study Task",
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

                Text("Task Title*", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text("Target Start Time (Optional)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { timePickerDialog.show() },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (!plannedStartTime.isNullOrBlank()) formatDisplayTime(plannedStartTime) else "Select Start Time",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    if (!plannedStartTime.isNullOrBlank()) {
                        Spacer(modifier = Modifier.width(6.dp))
                        IconButton(
                            onClick = { plannedStartTime = null },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear Start Time", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text("Planned Duration (Minutes)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    listOf(15, 30, 45, 60, 90, 120).forEach { mins ->
                        val isSel = selectedDuration == mins
                        FilterChip(
                            selected = isSel,
                            onClick = { selectedDuration = mins },
                            label = { Text("${mins}m", fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = Color.White,
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text("Priority", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    listOf("low" to "Low", "medium" to "Medium", "high" to "High").forEach { (key, label) ->
                        val isSel = selectedPriority == key
                        FilterChip(
                            selected = isSel,
                            onClick = { selectedPriority = key },
                            label = { Text(label, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = when (key) {
                                    "high" -> Color(0xFFEF4444)
                                    "medium" -> Color(0xFFF59E0B)
                                    else -> Color(0xFF6B7280)
                                },
                                selectedLabelColor = Color.White,
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text("Notes (Optional)", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = { Text("Add study notes or references...", fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(title, plannedStartTime, selectedDuration, selectedPriority, notes) },
                enabled = !isSubmitting && title.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text("Save Changes", fontWeight = FontWeight.Bold, color = Color.White)
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
fun RescheduleTaskDialog(
    task: PlannerTaskDto,
    isSubmitting: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onRescheduleTomorrow: () -> Unit,
    onSubmit: (newDate: String) -> Unit
) {
    val context = LocalContext.current
    var newDate by remember { mutableStateOf(task.plannedDate) }

    val datePickerDate = remember(newDate) {
        try {
            val parts = newDate.split("-").map { it.toInt() }
            Triple(parts[0], parts[1] - 1, parts[2])
        } catch (e: Exception) {
            val cal = Calendar.getInstance()
            Triple(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH))
        }
    }

    val datePickerDialog = remember(newDate) {
        DatePickerDialog(
            context,
            { _, y, m, d ->
                val formattedDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                newDate = formattedDate
            },
            datePickerDate.first,
            datePickerDate.second,
            datePickerDate.third
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Reschedule Task",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                if (errorMessage != null) {
                    ErrorBanner(message = errorMessage)
                    Spacer(modifier = Modifier.height(12.dp))
                }

                Text(
                    text = "Rescheduling task '${task.title}'",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onRescheduleTomorrow,
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.EventRepeat, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Reschedule to Tomorrow", fontWeight = FontWeight.Bold, color = Color.White)
                }

                Spacer(modifier = Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Spacer(modifier = Modifier.weight(1f).height(1.dp).background(MaterialTheme.colorScheme.outline))
                    Text("  or pick date  ", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.weight(1f).height(1.dp).background(MaterialTheme.colorScheme.outline))
                }
                Spacer(modifier = Modifier.height(14.dp))

                Text("Target Planned Date (YYYY-MM-DD)*", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = newDate,
                        onValueChange = { newDate = it },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = { datePickerDialog.show() },
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer)
                    ) {
                        Icon(
                            imageVector = Icons.Default.DateRange,
                            contentDescription = "Pick Date",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        },
        confirmButton = {
            val isFormValid = newDate.trim().matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))
            Button(
                onClick = { onSubmit(newDate.trim()) },
                enabled = !isSubmitting && isFormValid,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text("Reschedule Date", fontWeight = FontWeight.Bold, color = Color.White)
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
fun DeleteTaskConfirmationDialog(
    taskTitle: String,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirmDelete: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Delete Study Task?",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        },
        text = {
            Text(
                text = "Are you sure you want to delete '$taskTitle'? This action cannot be undone.",
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
                Text("Delete Task", fontWeight = FontWeight.Bold, color = Color.White)
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
fun DateNavigationHeader(
    selectedDate: String,
    todayDate: String,
    onPreviousDay: () -> Unit,
    onNextDay: () -> Unit,
    onGoToToday: () -> Unit,
    onSelectDate: (String) -> Unit
) {
    val context = LocalContext.current

    val datePickerDate = remember(selectedDate) {
        try {
            val parts = selectedDate.split("-").map { it.toInt() }
            Triple(parts[0], parts[1] - 1, parts[2])
        } catch (e: Exception) {
            val cal = Calendar.getInstance()
            Triple(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH))
        }
    }

    val datePickerDialog = remember(selectedDate) {
        DatePickerDialog(
            context,
            { _, y, m, d ->
                val formattedDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                onSelectDate(formattedDate)
            },
            datePickerDate.first,
            datePickerDate.second,
            datePickerDate.third
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onPreviousDay) {
                    Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Day", tint = MaterialTheme.colorScheme.primary)
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { datePickerDialog.show() }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.DateRange, contentDescription = "Select Date", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = selectedDate,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                IconButton(onClick = onNextDay) {
                    Icon(Icons.Default.ChevronRight, contentDescription = "Next Day", tint = MaterialTheme.colorScheme.primary)
                }
            }

            if (selectedDate != todayDate) {
                OutlinedButton(
                    onClick = onGoToToday,
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Today, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Today", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
