package com.studentos.app

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialCustomException
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.lifecycleScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.studentos.app.ui.navigation.StudentOsApp
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            StudentOsApp(
                onGoogleSignInLaunch = { onTokenReceived, onError, onCancel ->
                    launchNativeGoogleSignIn(onTokenReceived, onError, onCancel)
                }
            )
        }
    }

    private fun launchNativeGoogleSignIn(
        onTokenReceived: (String) -> Unit,
        onError: (String) -> Unit,
        onCancel: () -> Unit
    ) {
        val credentialManager = CredentialManager.create(this)

        Log.d("StudentOS", "GOOGLE_AUTH_STAGE=BUTTON_CLICK package=$packageName serverClientId=${BuildConfig.GOOGLE_CLIENT_ID}")

        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(BuildConfig.GOOGLE_CLIENT_ID)
            .setAutoSelectEnabled(false)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        Log.d("StudentOS", "GOOGLE_AUTH_STAGE=CREDENTIAL_REQUEST option=GetGoogleIdOption filterByAuthorized=false")
        Log.d("StudentOS", "GOOGLE_AUTH_STAGE=ACCOUNT_PICKER launching credential manager dialog")

        lifecycleScope.launch {
            try {
                val result = credentialManager.getCredential(
                    request = request,
                    context = this@MainActivity
                )
                val credential = result.credential
                Log.d("StudentOS", "GOOGLE_AUTH_STAGE=CREDENTIAL_RETURNED class=${credential.javaClass.name} type=${(credential as? CustomCredential)?.type}")

                if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken
                    Log.d("StudentOS", "GOOGLE_AUTH_STAGE=ID_TOKEN_EXTRACTED tokenLength=${idToken.length} email=${googleIdTokenCredential.id} displayName=${googleIdTokenCredential.displayName ?: "null"}")
                    onTokenReceived(idToken)
                } else if (credential is CustomCredential) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken
                    Log.d("StudentOS", "GOOGLE_AUTH_STAGE=ID_TOKEN_EXTRACTED from CustomCredential tokenLength=${idToken.length} email=${googleIdTokenCredential.id}")
                    onTokenReceived(idToken)
                } else {
                    Log.e("StudentOS", "GOOGLE_AUTH_DIAGNOSTIC stage=credential_parsing EXCEPTION_CLASS=UnrecognizedCredentialType EXCEPTION_MESSAGE=class=${credential.javaClass.name}")
                    onError("Google Sign-In failed. Please try again.")
                }
            } catch (e: GetCredentialCancellationException) {
                Log.d("StudentOS", "GOOGLE_AUTH_STAGE=CANCELLED EXCEPTION_CLASS=${e.javaClass.name} EXCEPTION_MESSAGE=${e.message}")
                onCancel()
            } catch (e: GetCredentialCustomException) {
                Log.e("StudentOS", "GOOGLE_AUTH_DIAGNOSTIC stage=credential_manager option=GetSignInWithGoogleOption EXCEPTION_CLASS=${e.javaClass.name} type=${e.type} EXCEPTION_MESSAGE=${e.message} cause=${e.cause}")
                onError("Google Sign-In failed. Please try again.")
            } catch (e: GetCredentialException) {
                Log.e("StudentOS", "GOOGLE_AUTH_DIAGNOSTIC stage=credential_manager option=GetSignInWithGoogleOption EXCEPTION_CLASS=${e.javaClass.name} EXCEPTION_MESSAGE=${e.message} cause=${e.cause}")
                onError("Google Sign-In failed. Please try again.")
            } catch (e: Exception) {
                Log.e("StudentOS", "GOOGLE_AUTH_DIAGNOSTIC stage=credential_manager option=GetSignInWithGoogleOption EXCEPTION_CLASS=${e.javaClass.name} EXCEPTION_MESSAGE=${e.message} cause=${e.cause}")
                onError("Google Sign-In failed. Please try again.")
            }
        }
    }
}
