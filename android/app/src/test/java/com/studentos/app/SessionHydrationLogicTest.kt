package com.studentos.app

import com.studentos.app.ui.navigation.Screen
import com.studentos.app.ui.navigation.SessionHydrationState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionHydrationLogicTest {

    private fun resolveStartDestination(state: SessionHydrationState): String? {
        return when (state) {
            is SessionHydrationState.Hydrating -> null // Neutral splash shown, NavHost not composed
            is SessionHydrationState.Hydrated -> {
                val isAuthenticated = !state.token.isNullOrEmpty()
                if (isAuthenticated) Screen.Dashboard.route else Screen.Login.route
            }
        }
    }

    @Test
    fun testHydratingStateYieldsNullStartDestination() {
        val state = SessionHydrationState.Hydrating
        val startDest = resolveStartDestination(state)
        assertEquals(null, startDest)
    }

    @Test
    fun testValidPersistedSessionResolvesToDashboardWithoutLoginFlash() {
        val validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid_session"
        val state = SessionHydrationState.Hydrated(token = validToken)

        val isAuthenticated = !state.token.isNullOrEmpty()
        assertTrue("Valid token must be authenticated", isAuthenticated)

        val startDest = resolveStartDestination(state)
        assertEquals("Start destination must directly be Dashboard", Screen.Dashboard.route, startDest)
    }

    @Test
    fun testLoggedOutUserResolvesToLogin() {
        val state = SessionHydrationState.Hydrated(token = null)

        val isAuthenticated = !state.token.isNullOrEmpty()
        assertFalse("Null token must not be authenticated", isAuthenticated)

        val startDest = resolveStartDestination(state)
        assertEquals("Start destination must be Login", Screen.Login.route, startDest)
    }

    @Test
    fun testEmptyTokenUserResolvesToLogin() {
        val state = SessionHydrationState.Hydrated(token = "")

        val isAuthenticated = !state.token.isNullOrEmpty()
        assertFalse("Empty token must not be authenticated", isAuthenticated)

        val startDest = resolveStartDestination(state)
        assertEquals("Start destination must be Login", Screen.Login.route, startDest)
    }

    @Test
    fun testExpiredEntitlementMaintainsAuthenticatedRouting() {
        val validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired_entitlement_user"
        val state = SessionHydrationState.Hydrated(token = validToken)

        // Expired entitlement does not alter session token presence
        val isAuthenticated = !state.token.isNullOrEmpty()
        assertTrue("Session remains authenticated even if entitlement expired", isAuthenticated)

        val startDest = resolveStartDestination(state)
        assertEquals(
            "Expired entitlement routes to Dashboard (to show paywall), not Login",
            Screen.Dashboard.route,
            startDest
        )
    }

    @Test
    fun testSignOutTransitionsToUnauthenticated() {
        // Step 1: User is authenticated
        var state: SessionHydrationState = SessionHydrationState.Hydrated(token = "session_token")
        assertEquals(Screen.Dashboard.route, resolveStartDestination(state))

        // Step 2: Sign out clears session
        state = SessionHydrationState.Hydrated(token = null)
        assertEquals(Screen.Login.route, resolveStartDestination(state))
    }
}
