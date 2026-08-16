package com.studentos.app.ui.update

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch

/**
 * AppUpdateDialog — shows update available / update required dialog.
 *
 * Integrates with [AppUpdateManager] for download + SHA-256 verification + install.
 *
 * Usage: add to NavGraph.kt or any top-level composable after login.
 */
@Composable
fun AppUpdateDialog() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val updateResult by AppUpdateManager.updateCheckResult.collectAsState()
    val downloadState by AppUpdateManager.downloadState.collectAsState()

    // Extract metadata from update result
    val metadata = when (val r = updateResult) {
        is UpdateCheckResult.OptionalUpdate -> r.metadata
        is UpdateCheckResult.MandatoryUpdate -> r.metadata
        is UpdateCheckResult.NoUpdate -> null
    }
    val isMandatory = updateResult is UpdateCheckResult.MandatoryUpdate

    // Local dismissed state for optional updates
    var dismissed by remember { mutableStateOf(false) }

    // When download succeeds, automatically launch the installer
    LaunchedEffect(downloadState) {
        if (downloadState is DownloadState.Success) {
            AppUpdateManager.launchInstaller(context, (downloadState as DownloadState.Success).apkFile)
        }
    }

    val showDialog = metadata != null && (!dismissed || isMandatory)
    AnimatedVisibility(visible = showDialog, enter = fadeIn(), exit = fadeOut()) {
        if (metadata != null) {
            Dialog(
                onDismissRequest = { if (!isMandatory) dismissed = true },
                properties = DialogProperties(dismissOnBackPress = !isMandatory, dismissOnClickOutside = !isMandatory)
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Title row
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.SystemUpdate,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(28.dp)
                            )
                            Column {
                                Text(
                                    text = if (isMandatory) "Update Required" else "Update Available",
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 20.sp
                                    ),
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Version ${metadata.latestVersionName}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        // Mandatory description
                        if (isMandatory) {
                            Text(
                                text = "A newer version of Student OS is required to continue using the app.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        // What's new
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "What's new",
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            metadata.releaseNotes.forEach { note ->
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(start = 4.dp)
                                ) {
                                    Text(
                                        text = "•",
                                        color = MaterialTheme.colorScheme.primary,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                    Text(
                                        text = note,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        // Download progress bar
                        when (val ds = downloadState) {
                            is DownloadState.Progress -> {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        text = "Downloading update...",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    LinearProgressIndicator(
                                        progress = { ds.percent / 100f },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(8.dp)
                                            .clip(RoundedCornerShape(4.dp)),
                                        strokeCap = StrokeCap.Round,
                                        color = MaterialTheme.colorScheme.primary,
                                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                                    )
                                    Text(
                                        text = "${ds.percent}%",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.fillMaxWidth(),
                                        textAlign = TextAlign.End
                                    )
                                }
                            }
                            is DownloadState.Failed -> {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(MaterialTheme.colorScheme.errorContainer)
                                        .padding(10.dp)
                                ) {
                                    Text(
                                        text = ds.message,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                            else -> {}
                        }

                        // Action buttons
                        val isDownloading = downloadState is DownloadState.Progress
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isMandatory) Arrangement.Center else Arrangement.spacedBy(12.dp)
                        ) {
                            // Later button — only for optional updates, never for mandatory
                            if (!isMandatory && downloadState !is DownloadState.Progress) {
                                OutlinedButton(
                                    onClick = { dismissed = true },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Later")
                                }
                            }

                            Button(
                                onClick = {
                                    AppUpdateManager.resetDownloadState()
                                    scope.launch {
                                        AppUpdateManager.downloadApk(context, metadata)
                                    }
                                },
                                enabled = !isDownloading,
                                modifier = if (isMandatory) Modifier.fillMaxWidth() else Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary
                                )
                            ) {
                                if (isDownloading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        strokeWidth = 2.dp,
                                        color = MaterialTheme.colorScheme.onPrimary
                                    )
                                } else {
                                    Text(
                                        text = if (downloadState is DownloadState.Failed) "Retry" else "Update Now"
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
