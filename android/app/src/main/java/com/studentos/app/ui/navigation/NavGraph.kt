package com.studentos.app.ui.navigation

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.studentos.app.data.api.ApiClient
import com.studentos.app.data.local.SessionManager
import com.studentos.app.data.repository.StudentOsRepository
import com.studentos.app.ui.components.StudentOsBottomBar
import com.studentos.app.ui.components.StudentOsTopAppBar
import com.studentos.app.ui.screens.account.AccountScreen
import com.studentos.app.ui.screens.account.AccountViewModel
import com.studentos.app.ui.screens.analytics.AnalyticsScreen
import com.studentos.app.ui.screens.analytics.AnalyticsViewModel
import com.studentos.app.ui.screens.auth.AuthViewModel
import com.studentos.app.ui.screens.auth.LoginScreen
import com.studentos.app.ui.screens.auth.OtpVerifyScreen
import com.studentos.app.ui.screens.dashboard.DashboardScreen
import com.studentos.app.ui.screens.dashboard.DashboardViewModel
import com.studentos.app.ui.screens.planner.PlannerScreen
import com.studentos.app.ui.screens.planner.PlannerViewModel
import com.studentos.app.ui.screens.revision.RevisionScreen
import com.studentos.app.ui.screens.revision.RevisionViewModel
import com.studentos.app.ui.screens.study.StudyScreen
import com.studentos.app.ui.screens.study.StudyViewModel
import com.studentos.app.ui.theme.StudentOsTheme

@Composable
fun StudentOsApp(
    onGoogleSignInLaunch: (
        onTokenReceived: (String) -> Unit,
        onError: (String) -> Unit,
        onCancel: () -> Unit
    ) -> Unit
) {
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }
    val apiClient = remember { ApiClient(sessionManager) }
    val repository = remember { StudentOsRepository(apiClient, sessionManager, context) }

    val tokenState by repository.tokenFlow.collectAsState(initial = null)
    val themeState by repository.themeFlow.collectAsState(initial = "system")

    val authViewModel = remember { AuthViewModel(repository) }
    val dashboardViewModel = remember { DashboardViewModel(repository) }
    val studyViewModel = remember { StudyViewModel(repository) }
    val plannerViewModel = remember { PlannerViewModel(repository) }
    val revisionViewModel = remember { RevisionViewModel(repository) }
    val analyticsViewModel = remember { AnalyticsViewModel(repository) }
    val accountViewModel = remember { AccountViewModel(repository) }

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val isAuthenticated = !tokenState.isNullOrEmpty()

    val authenticatedRoutes = setOf(
        Screen.Dashboard.route,
        Screen.Study.route,
        Screen.Planner.route,
        Screen.Revision.route,
        Screen.Analytics.route,
        Screen.Account.route
    )
    val showBars = isAuthenticated && currentRoute in authenticatedRoutes

    LaunchedEffect(isAuthenticated) {
        if (isAuthenticated) {
            dashboardViewModel.loadDashboardData()
            accountViewModel.loadAccountData()
            if (currentRoute == Screen.Login.route || currentRoute == Screen.OtpVerify.route || currentRoute == null) {
                navController.navigate(Screen.Dashboard.route) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                }
            }
        } else if (currentRoute != Screen.Login.route && currentRoute != Screen.OtpVerify.route) {
            navController.navigate(Screen.Login.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    // Derive premium avatar state from DashboardViewModel entitlement (server-authoritative)
    val dashboardUiState by dashboardViewModel.uiState.collectAsState()
    val entitlement = dashboardUiState.entitlement
    val isPaidActive = entitlement?.status == "active" && entitlement.isPaid == true
    // User initial from account overview profile (falls back to "S")
    val profileName = dashboardUiState.accountOverview?.profile?.fullName ?: ""
    val userInitial = if (profileName.isNotBlank()) profileName.first().uppercaseChar().toString() else "S"

    StudentOsTheme(appTheme = themeState) {
        Scaffold(
            topBar = {
                if (showBars) {
                    StudentOsTopAppBar(
                        userInitial = userInitial,
                        isPaidActive = isPaidActive,
                        onAccountClick = { navController.navigate(Screen.Account.route) }
                    )
                }
            },
            bottomBar = {
                if (showBars) {
                    StudentOsBottomBar(
                        currentRoute = currentRoute,
                        onNavigate = { route ->
                            if (currentRoute != route) {
                                navController.navigate(route) {
                                    popUpTo(navController.graph.startDestinationId) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        }
                    )
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Login.route,
                modifier = Modifier.padding(if (showBars) innerPadding else PaddingValues())
            ) {
                composable(Screen.Login.route) {
                    LoginScreen(
                        viewModel = authViewModel,
                        onNavigateToOtp = { navController.navigate(Screen.OtpVerify.route) },
                        onGoogleSignInClick = {
                            authViewModel.setLoading(true)
                            onGoogleSignInLaunch(
                                { idToken ->
                                    authViewModel.loginWithGoogleToken(idToken) {
                                        navController.navigate(Screen.Dashboard.route) {
                                            popUpTo(Screen.Login.route) { inclusive = true }
                                        }
                                    }
                                },
                                { errorMsg ->
                                    authViewModel.onGoogleSignInFailed(errorMsg)
                                },
                                {
                                    authViewModel.onGoogleSignInCancelled()
                                }
                            )
                        }
                    )
                }
                composable(Screen.OtpVerify.route) {
                    OtpVerifyScreen(
                        viewModel = authViewModel,
                        onSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        }
                    )
                }
                composable(Screen.Dashboard.route) {
                    DashboardScreen(
                        viewModel = dashboardViewModel,
                        onNavigateToPlanner = { openAddTask ->
                            navController.navigate(Screen.Planner.route) {
                                popUpTo(Screen.Dashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                            if (openAddTask) {
                                plannerViewModel.openAddTaskDialog()
                            }
                        },
                        onNavigateToStudy = {
                            navController.navigate(Screen.Study.route) {
                                popUpTo(Screen.Dashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        onNavigateToRevision = {
                            navController.navigate(Screen.Revision.route) {
                                popUpTo(Screen.Dashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
                composable(
                    Screen.Study.route,
                    deepLinks = listOf(androidx.navigation.navDeepLink { uriPattern = "studentos://study" })
                ) { StudyScreen(studyViewModel) }
                composable(
                    Screen.Planner.route,
                    deepLinks = listOf(androidx.navigation.navDeepLink { uriPattern = "studentos://planner?date={date}" })
                ) { backStackEntry ->
                    val dateArg = backStackEntry.arguments?.getString("date")
                    if (!dateArg.isNullOrEmpty()) {
                        plannerViewModel.selectDateFromCalendar(dateArg)
                    }
                    PlannerScreen(plannerViewModel)
                }
                composable(
                    Screen.Revision.route,
                    deepLinks = listOf(androidx.navigation.navDeepLink { uriPattern = "studentos://revision" })
                ) { RevisionScreen(revisionViewModel) }
                composable(Screen.Analytics.route) { AnalyticsScreen(analyticsViewModel) }
                composable(Screen.Account.route) {
                    AccountScreen(
                        viewModel = accountViewModel,
                        onSignOut = {
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    )
                }
            }
        }
    }
}
