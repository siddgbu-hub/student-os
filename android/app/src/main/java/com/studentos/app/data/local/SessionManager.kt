package com.studentos.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "student_os_preferences")

class SessionManager(private val context: Context) {

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("student_os_session_token")
        private val DEVICE_ID_KEY = stringPreferencesKey("student_os_device_id")
        private val USER_EMAIL_KEY = stringPreferencesKey("student_os_user_email")
        private val USER_ID_KEY = stringPreferencesKey("student_os_user_id")
        private val THEME_KEY = stringPreferencesKey("student_os_app_theme")
    }

    val tokenFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[TOKEN_KEY]
    }

    val themeFlow: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[THEME_KEY] ?: "system"
    }

    suspend fun getToken(): String? {
        return context.dataStore.data.map { it[TOKEN_KEY] }.first()
    }

    suspend fun saveSession(token: String, accountId: String, email: String) {
        context.dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = token
            preferences[USER_ID_KEY] = accountId
            preferences[USER_EMAIL_KEY] = email
        }
    }

    suspend fun getOrCreateDeviceId(): String {
        val existing = context.dataStore.data.map { it[DEVICE_ID_KEY] }.first()
        if (!existing.isNullOrBlank()) {
            return existing
        }
        val newDeviceId = "android-native-" + UUID.randomUUID().toString().substring(0, 12)
        context.dataStore.edit { preferences ->
            preferences[DEVICE_ID_KEY] = newDeviceId
        }
        return newDeviceId
    }

    suspend fun setTheme(theme: String) {
        context.dataStore.edit { preferences ->
            preferences[THEME_KEY] = theme
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            preferences.remove(TOKEN_KEY)
            preferences.remove(USER_ID_KEY)
            preferences.remove(USER_EMAIL_KEY)
        }
    }
}
