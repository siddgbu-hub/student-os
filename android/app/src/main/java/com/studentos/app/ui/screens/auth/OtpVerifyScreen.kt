package com.studentos.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.studentos.app.ui.components.ErrorBanner

@Composable
fun OtpVerifyScreen(
    viewModel: AuthViewModel,
    onSuccess: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var otpInput by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(48.dp))

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp)),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Verify Code",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Enter the 6-digit code sent to ${uiState.pendingEmail ?: "your email"}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )

                if (uiState.errorMessage != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    ErrorBanner(message = uiState.errorMessage!!, onDismiss = { viewModel.clearError() })
                }

                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = otpInput,
                    onValueChange = { if (it.length <= 6) otpInput = it },
                    placeholder = { Text("123456", style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        viewModel.verifyOtp(otpInput, onSuccess = onSuccess)
                    },
                    enabled = !uiState.isLoading && otpInput.length == 6,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
                    } else {
                        Text("Verify & Continue", style = MaterialTheme.typography.labelLarge, color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                val isCooldown = uiState.resendCooldownSeconds > 0
                androidx.compose.material3.TextButton(
                    onClick = { viewModel.resendOtp() },
                    enabled = !uiState.isLoading && !isCooldown
                ) {
                    Text(
                        text = if (isCooldown) "Resend code in ${uiState.resendCooldownSeconds}s" else "Didn't receive code? Resend OTP",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (isCooldown) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}
