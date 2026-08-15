package com.studentos.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val pendingEmail: String? = null,
    val errorMessage: String? = null,
    val infoMessage: String? = null,
    val isAuthenticated: Boolean = false,
    val resendCooldownSeconds: Int = 0
)

class AuthViewModel(private val repository: StudentOsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    val tokenFlow = repository.tokenFlow

    fun requestOtp(email: String, onSuccess: () -> Unit) {
        val cleanEmail = email.trim().lowercase(java.util.Locale.US)
        if (cleanEmail.isBlank() || !cleanEmail.contains("@")) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please enter a valid email address.")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = repository.sendEmailOtp(cleanEmail)
            _uiState.value = _uiState.value.copy(isLoading = false)
            result.onSuccess {
                _uiState.value = _uiState.value.copy(pendingEmail = cleanEmail, infoMessage = "Verification code sent to $cleanEmail")
                startResendCooldownTimer()
                onSuccess()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(errorMessage = err.message ?: "Failed to send verification code")
            }
        }
    }

    fun resendOtp() {
        val email = _uiState.value.pendingEmail ?: return
        if (_uiState.value.resendCooldownSeconds > 0) return
        requestOtp(email) {}
    }

    private fun startResendCooldownTimer() {
        viewModelScope.launch {
            for (sec in 30 downTo 0) {
                _uiState.value = _uiState.value.copy(resendCooldownSeconds = sec)
                kotlinx.coroutines.delay(1000L)
            }
        }
    }

    fun verifyOtp(otp: String, onSuccess: () -> Unit) {
        val email = _uiState.value.pendingEmail ?: return
        if (otp.isBlank() || otp.length < 6) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please enter the 6-digit code.")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = repository.verifyEmailOtp(email, otp)
            _uiState.value = _uiState.value.copy(isLoading = false)
            result.onSuccess {
                _uiState.value = _uiState.value.copy(isAuthenticated = true)
                onSuccess()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(errorMessage = err.message ?: "Invalid verification code")
            }
        }
    }

    fun loginWithGoogleToken(idToken: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            android.util.Log.d("StudentOS", "GOOGLE_AUTH_STAGE=BACKEND_REQUEST tokenLength=${idToken.length}")
            val result = repository.loginWithGoogle(idToken)
            _uiState.value = _uiState.value.copy(isLoading = false)
            result.onSuccess { res ->
                android.util.Log.d("StudentOS", "GOOGLE_AUTH_STAGE=BACKEND_RESPONSE success=${res.success} accountId=${res.account?.accountId}")
                android.util.Log.d("StudentOS", "GOOGLE_AUTH_STAGE=AUTH_SUCCESS")
                _uiState.value = _uiState.value.copy(isAuthenticated = true)
                onSuccess()
            }.onFailure { err ->
                android.util.Log.e("StudentOS", "GOOGLE_AUTH_STAGE=BACKEND_ERROR message=${err.message}", err)
                _uiState.value = _uiState.value.copy(errorMessage = err.message ?: "Google Sign-In failed")
            }
        }
    }

    fun setLoading(loading: Boolean) {
        _uiState.value = _uiState.value.copy(isLoading = loading, errorMessage = null)
    }

    fun onGoogleSignInFailed(error: String?) {
        _uiState.value = _uiState.value.copy(
            isLoading = false,
            errorMessage = error ?: "Google Sign-In failed. Please try again."
        )
    }

    fun onGoogleSignInCancelled() {
        _uiState.value = _uiState.value.copy(isLoading = false)
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
