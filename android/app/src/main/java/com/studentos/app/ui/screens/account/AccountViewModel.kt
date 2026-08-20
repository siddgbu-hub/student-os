package com.studentos.app.ui.screens.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studentos.app.data.model.AccountOverviewDto
import com.studentos.app.data.model.DeviceSessionDto
import com.studentos.app.data.model.UpdatePreferencesInputDto
import com.studentos.app.data.model.UpdateProfileInputDto
import com.studentos.app.data.repository.StudentOsRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AccountUiState(
    val isLoading: Boolean = true,
    val overview: AccountOverviewDto? = null,
    val entitlement: com.studentos.app.data.model.EntitlementDto? = null,
    val plans: List<com.studentos.app.data.model.PlanDto> = emptyList(),
    val paymentConfig: com.studentos.app.data.model.PaymentConfigDto? = null,
    val isUpgradeSheetOpen: Boolean = false,
    val isEditProfileDialogOpen: Boolean = false,
    val isSavingProfile: Boolean = false,
    val editProfileError: String? = null,
    val revokingDevice: DeviceSessionDto? = null,
    val isRevokingDevice: Boolean = false,
    val revokeDeviceError: String? = null,
    val isDeleteAccountStep1Open: Boolean = false,
    val isDeleteAccountStep2Open: Boolean = false,
    val isDeletingAccount: Boolean = false,
    val deleteAccountError: String? = null,
    val isRefreshing: Boolean = false,
    val refreshMessage: String? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class AccountViewModel(private val repository: StudentOsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    fun loadAccountData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            coroutineScope {
                val overviewDeferred = async { repository.getAccountOverview() }
                val entitlementDeferred = async { repository.getEntitlementStatus() }
                val plansDeferred = async { repository.getPlans() }
                val paymentConfigDeferred = async { repository.getPaymentConfig() }

                val res = overviewDeferred.await()
                val entitlementRes = entitlementDeferred.await()
                val plansRes = plansDeferred.await()
                val paymentConfigRes = paymentConfigDeferred.await()

                res.onSuccess { data ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        overview = data,
                        entitlement = entitlementRes.getOrNull(),
                        plans = plansRes.getOrNull() ?: emptyList(),
                        paymentConfig = paymentConfigRes.getOrNull()
                    )
                }.onFailure { err ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        entitlement = entitlementRes.getOrNull(),
                        plans = plansRes.getOrNull() ?: emptyList(),
                        paymentConfig = paymentConfigRes.getOrNull(),
                        errorMessage = err.message
                    )
                }
            }
        }
    }

    private var isRefreshInProgress = false

    fun refreshAccount(onComplete: (() -> Unit)? = null) {
        if (_uiState.value.isRefreshing || isRefreshInProgress) return
        isRefreshInProgress = true
        _uiState.value = _uiState.value.copy(isRefreshing = true)

        viewModelScope.launch {
            try {
                coroutineScope {
                    val resDeferred = async { repository.getAccountOverview() }
                    val entitlementDeferred = async { repository.getEntitlementStatus() }
                    val plansDeferred = async { repository.getPlans() }
                    val paymentConfigDeferred = async { repository.getPaymentConfig() }

                    val res = resDeferred.await()
                    val entitlementRes = entitlementDeferred.await()
                    val plansRes = plansDeferred.await()
                    val paymentConfigRes = paymentConfigDeferred.await()

                    val isFailure = res.isFailure && entitlementRes.isFailure

                    _uiState.value = _uiState.value.copy(
                        overview = res.getOrNull() ?: _uiState.value.overview,
                        entitlement = entitlementRes.getOrNull() ?: _uiState.value.entitlement,
                        plans = plansRes.getOrNull() ?: _uiState.value.plans,
                        paymentConfig = paymentConfigRes.getOrNull() ?: _uiState.value.paymentConfig,
                        refreshMessage = if (isFailure) "Couldn't refresh. Check your connection and try again." else "Updated just now"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    refreshMessage = "Couldn't refresh. Check your connection and try again."
                )
            } finally {
                isRefreshInProgress = false
                _uiState.value = _uiState.value.copy(isRefreshing = false)
                onComplete?.invoke()
            }
        }
    }

    fun clearRefreshMessage() {
        _uiState.value = _uiState.value.copy(refreshMessage = null)
    }

    fun openUpgradeSheet() {
        _uiState.value = _uiState.value.copy(isUpgradeSheetOpen = true)
        viewModelScope.launch {
            val plansRes = repository.getPlans()
            val paymentConfigRes = repository.getPaymentConfig()
            val entitlementRes = repository.getEntitlementStatus()

            _uiState.value = _uiState.value.copy(
                plans = plansRes.getOrNull() ?: _uiState.value.plans,
                paymentConfig = paymentConfigRes.getOrNull() ?: _uiState.value.paymentConfig,
                entitlement = entitlementRes.getOrNull() ?: _uiState.value.entitlement
            )
        }
    }

    fun closeUpgradeSheet() {
        _uiState.value = _uiState.value.copy(isUpgradeSheetOpen = false)
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(errorMessage = null, successMessage = null)
    }

    fun openEditProfileDialog() {
        _uiState.value = _uiState.value.copy(
            isEditProfileDialogOpen = true,
            editProfileError = null
        )
    }

    fun closeEditProfileDialog() {
        _uiState.value = _uiState.value.copy(
            isEditProfileDialogOpen = false,
            editProfileError = null
        )
    }

    fun saveProfile(
        fullName: String,
        course: String?,
        institutionName: String?,
        classYear: String?,
        stream: String?,
        preferredDailyStudyTargetMinutes: Int,
        preferredSessionDurationMinutes: Int,
        preferredStudyTime: String,
        preferredRevisionStrategy: String
    ) {
        if (fullName.isBlank()) {
            _uiState.value = _uiState.value.copy(editProfileError = "Full Name is required")
            return
        }

        if (preferredDailyStudyTargetMinutes < 15 || preferredDailyStudyTargetMinutes > 1440) {
            _uiState.value = _uiState.value.copy(editProfileError = "Daily target must be between 15 and 1440 minutes")
            return
        }

        if (preferredSessionDurationMinutes < 10 || preferredSessionDurationMinutes > 300) {
            _uiState.value = _uiState.value.copy(editProfileError = "Session duration must be between 10 and 300 minutes")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingProfile = true, editProfileError = null)
            val input = UpdateProfileInputDto(
                fullName = fullName.trim(),
                course = course?.ifBlank { null },
                institutionName = institutionName?.ifBlank { null },
                classYear = classYear?.ifBlank { null },
                stream = stream?.ifBlank { null },
                preferredDailyStudyTargetMinutes = preferredDailyStudyTargetMinutes,
                preferredSessionDurationMinutes = preferredSessionDurationMinutes,
                preferredStudyTime = preferredStudyTime,
                preferredRevisionStrategy = preferredRevisionStrategy
            )
            val res = repository.updateProfile(input)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isSavingProfile = false,
                    isEditProfileDialogOpen = false,
                    editProfileError = null,
                    successMessage = "Profile updated successfully"
                )
                loadAccountData()
            }.onFailure { err: Throwable ->
                _uiState.value = _uiState.value.copy(
                    isSavingProfile = false,
                    editProfileError = err.message ?: "Failed to save profile"
                )
            }
        }
    }

    fun setThemePreference(theme: String) {
        viewModelScope.launch {
            repository.setLocalTheme(theme)
            repository.updatePreferences(UpdatePreferencesInputDto(theme = theme))
            loadAccountData()
        }
    }

    fun updateNotificationPreferences(
        notificationsEnabled: Boolean? = null,
        plannerRemindersEnabled: Boolean? = null,
        revisionRemindersEnabled: Boolean? = null,
        quietHoursEnabled: Boolean? = null,
        quietHoursStart: String? = null,
        quietHoursEnd: String? = null,
        reminderLeadTimeMinutes: Int? = null,
        showPrivateDetailsInNotifications: Boolean? = null
    ) {
        viewModelScope.launch {
            val input = UpdatePreferencesInputDto(
                notificationsEnabled = notificationsEnabled,
                plannerRemindersEnabled = plannerRemindersEnabled,
                revisionRemindersEnabled = revisionRemindersEnabled,
                quietHoursEnabled = quietHoursEnabled,
                quietHoursStart = quietHoursStart,
                quietHoursEnd = quietHoursEnd,
                reminderLeadTimeMinutes = reminderLeadTimeMinutes,
                showPrivateDetailsInNotifications = showPrivateDetailsInNotifications
            )
            repository.updatePreferences(input)
            loadAccountData()
        }
    }

    // --- DEVICE MANAGEMENT ---

    fun openRevokeDialog(device: DeviceSessionDto) {
        _uiState.value = _uiState.value.copy(
            revokingDevice = device,
            revokeDeviceError = null
        )
    }

    fun closeRevokeDialog() {
        _uiState.value = _uiState.value.copy(
            revokingDevice = null,
            revokeDeviceError = null
        )
    }

    fun revokeDevice(device: DeviceSessionDto, onCurrentDeviceRevoked: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRevokingDevice = true, revokeDeviceError = null)
            val res = repository.revokeDevice(device.deviceId)
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isRevokingDevice = false,
                    revokingDevice = null,
                    revokeDeviceError = null
                )
                if (device.isCurrentDevice) {
                    // Revoked current device: clear session locally and redirect to Login
                    repository.logout()
                    onCurrentDeviceRevoked()
                } else {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Device ${device.deviceModel ?: "Session"} revoked"
                    )
                    loadAccountData()
                }
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isRevokingDevice = false,
                    revokeDeviceError = err.message ?: "Failed to revoke device"
                )
            }
        }
    }

    // --- ACCOUNT DELETION (DANGER ZONE) ---

    fun openDeleteAccountStep1() {
        _uiState.value = _uiState.value.copy(
            isDeleteAccountStep1Open = true,
            isDeleteAccountStep2Open = false,
            deleteAccountError = null
        )
    }

    fun closeDeleteAccountDialogs() {
        _uiState.value = _uiState.value.copy(
            isDeleteAccountStep1Open = false,
            isDeleteAccountStep2Open = false,
            deleteAccountError = null
        )
    }

    fun proceedToDeleteAccountStep2() {
        _uiState.value = _uiState.value.copy(
            isDeleteAccountStep1Open = false,
            isDeleteAccountStep2Open = true,
            deleteAccountError = null
        )
    }

    fun deleteAccount(onAccountDeleted: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isDeletingAccount = true,
                deleteAccountError = null
            )
            val res = repository.deleteAccount()
            res.onSuccess {
                _uiState.value = _uiState.value.copy(
                    isDeletingAccount = false,
                    isDeleteAccountStep1Open = false,
                    isDeleteAccountStep2Open = false,
                    deleteAccountError = null
                )
                repository.logout()
                onAccountDeleted()
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    isDeletingAccount = false,
                    deleteAccountError = err.message ?: "Failed to delete account"
                )
            }
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            repository.logout()
            onLoggedOut()
        }
    }
}
