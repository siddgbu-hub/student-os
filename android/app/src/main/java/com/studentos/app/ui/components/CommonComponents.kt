package com.studentos.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.studentos.app.ui.navigation.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PullToRefreshLayout(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val pullToRefreshState = rememberPullToRefreshState()

    // Trigger onRefresh ONLY when user pulls down past threshold
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            onRefresh()
        }
    }

    // Dismiss the pull indicator when ViewModel finishes refreshing
    LaunchedEffect(isRefreshing) {
        if (!isRefreshing) {
            pullToRefreshState.endRefresh()
        }
    }

    Box(modifier = modifier.nestedScroll(pullToRefreshState.nestedScrollConnection)) {
        content()
        PullToRefreshContainer(
            state = pullToRefreshState,
            modifier = Modifier.align(Alignment.TopCenter),
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.primary
        )
    }
}


@Composable
fun StudentOsTopAppBar(
    userInitial: String = "S",
    isPaidActive: Boolean = false,
    onAccountClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .statusBarsPadding()
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "S",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = "Student OS",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
        }

        // ── Top-right avatar with optional Pro premium treatment ──────────────
        Box(
            modifier = Modifier
                .size(38.dp)
                .clickable { onAccountClick() },
            contentAlignment = Alignment.Center
        ) {
            if (isPaidActive) {
                // Golden gradient ring — indicates active paid Pro subscription
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.sweepGradient(
                                colors = listOf(
                                    Color(0xFFFFD700),
                                    Color(0xFFFFA500),
                                    Color(0xFFFFD700)
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    // Inner circle with user initial
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF0F172A)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = userInitial.uppercase(),
                            color = Color(0xFFFFD700),
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
                // Small crown badge pinned to bottom-right
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFFD700))
                        .align(Alignment.BottomEnd)
                        .offset(x = 2.dp, y = 2.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "⭐",
                        fontSize = 7.sp
                    )
                }
            } else {
                // Normal avatar — free trial / expired
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer)
                        .border(1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.6f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = userInitial.uppercase(),
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun StudentOsBottomBar(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    featureFlags: com.studentos.app.config.FeatureFlags = com.studentos.app.config.FeatureFlags()
) {
    val allItems = listOf(
        NavigationItem("Dashboard", Screen.Dashboard.route, Icons.Default.GridView, true),
        NavigationItem("Study", Screen.Study.route, Icons.Default.Timer, featureFlags.study),
        NavigationItem("Planner", Screen.Planner.route, Icons.Default.CalendarToday, featureFlags.planner),
        NavigationItem("Revision", Screen.Revision.route, Icons.Default.Refresh, featureFlags.revision),
        NavigationItem("Analytics", Screen.Analytics.route, Icons.Default.BarChart, featureFlags.analytics),
        NavigationItem("Account", Screen.Account.route, Icons.Default.Person, true)
    )

    val items = remember(featureFlags) {
        allItems.filter { it.isEnabled }
    }

    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = { Icon(item.icon, contentDescription = item.label, modifier = Modifier.size(20.dp)) },
                label = {
                    Text(
                        text = item.label,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 10.sp,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium
                        )
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
        }
    }
}

private data class NavigationItem(
    val label: String,
    val route: String,
    val icon: ImageVector,
    val isEnabled: Boolean = true
)

@Composable
fun StatCard(
    title: String,
    value: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurface
            )
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun LoadingState(message: String = "Loading...") {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary, modifier = Modifier.size(36.dp))
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = message, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun ErrorBanner(message: String, onDismiss: (() -> Unit)? = null) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.errorContainer)
            .border(1.dp, MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = message,
                color = MaterialTheme.colorScheme.onErrorContainer,
                fontSize = 13.sp,
                modifier = Modifier.weight(1f)
            )
            if (onDismiss != null) {
                Text(
                    text = "✕",
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clickable { onDismiss() }
                        .padding(4.dp)
                )
            }
        }
    }
}
