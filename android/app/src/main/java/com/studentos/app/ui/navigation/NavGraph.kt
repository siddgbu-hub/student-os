package com.studentos.app.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
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
import com.studentos.app.config.AppConfigManager
import com.studentos.app.config.AppUpdateState
import com.studentos.app.ui.config.ForceUpdateScreen
import com.studentos.app.ui.config.MaintenanceScreen
import com.studentos.app.ui.config.OptionalUpdateDialog
import com.studentos.app.ui.theme.StudentOsTheme
import com.studentos.app.ui.update.AppUpdateDialog
import com.studentos.app.ui.update.AppUpdateManager
import kotlinx.coroutines.launch

sealed interface SessionHydrationState {
    object Hydrating : SessionHydrationState
    data class Hydrated(val token: String?) : SessionHydrationState
}

@Composable
fun StudentOsSplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "S",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 28.sp
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Student OS",
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(24.dp))
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(28.dp),
                strokeWidth = 2.5.dp
            )
        }
    }
}

@Composable
fun StudentOsApp(
    onGoogleSignInLaunch: (
        onSuccess: (idToken: String) -> Unit,
        onError: (errorMessage: String) -> Unit,
        onCancelled: () -> Unit
    ) -> Unit
) {
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }
    val apiClient = remember { ApiClient(sessionManager) }
    val repository = remember { StudentOsRepository(apiClient, sessionManager, context) }

    val sessionHydrationState by produceState<SessionHydrationState>(initialValue = SessionHydrationState.Hydrating) {
        repository.tokenFlow.collect { token ->
            value = SessionHydrationState.Hydrated(token)
        }
    }
    val themeState by repository.themeFlow.collectAsState(initial = "system")

    val authViewModel = remember { AuthViewModel(repository) }
    val dashboardViewModel = remember { DashboardViewModel(repository) }
    val studyViewModel = remember { StudyViewModel(repository) }
    val plannerViewModel = remember { PlannerViewModel(repository) }
    val revisionViewModel = remember { RevisionViewModel(repository) }
    val analyticsViewModel = remember { AnalyticsViewModel(repository) }
    val accountViewModel = remember { AccountViewModel(repository) }

    val appConfigState by AppConfigManager.configState.collectAsState()

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val authenticatedRoutes = setOf(
        Screen.Dashboard.route,
        Screen.Study.route,
        Screen.Planner.route,
        Screen.Revision.route,
        Screen.Analytics.route,
        Screen.Account.route
    )

    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()

    // Derive premium avatar state from DashboardViewModel entitlement (server-authoritative)
    val dashboardUiState by dashboardViewModel.uiState.collectAsState()
    val entitlement = dashboardUiState.entitlement
    val isPaidActive = entitlement?.status == "active" && entitlement.isPaid == true
    // User initial from account overview profile (falls back to "S")
    val profileName = dashboardUiState.accountOverview?.profile?.fullName ?: ""
    val userInitial = if (profileName.isNotBlank()) profileName.first().uppercaseChar().toString() else "S"

    // Check for updates exactly once when the composable enters the composition.
    // Fails silently — never blocks app startup.
    LaunchedEffect(Unit) {
        AppUpdateManager.checkForUpdate()
        AppConfigManager.fetchRemoteConfig()
    }

    StudentOsTheme(appTheme = themeState) {
        // App update and maintenance governance overlays
        if (appConfigState.isMaintenanceMode) {
            MaintenanceScreen(configState = appConfigState)
            return@StudentOsTheme
        }

        when (val updateState = appConfigState.updateState) {
            is AppUpdateState.MandatoryUpdate -> {
                ForceUpdateScreen(updateState = updateState)
                return@StudentOsTheme
            }
            is AppUpdateState.OptionalUpdate -> {
                OptionalUpdateDialog(updateState = updateState)
            }
            is AppUpdateState.UpToDate -> {
                // Fallback to legacy direct APK update dialog if active
                AppUpdateDialog()
            }
        }

        when (val state = sessionHydrationState) {
            is SessionHydrationState.Hydrating -> {
                StudentOsSplashScreen()
            }
            is SessionHydrationState.Hydrated -> {
                val isAuthenticated = !state.token.isNullOrEmpty()
                val initialStartDestination = remember {
                    if (isAuthenticated) Screen.Dashboard.route else Screen.Login.route
                }
                val showBars = isAuthenticated && currentRoute in authenticatedRoutes

                DisposableEffect(lifecycleOwner, isAuthenticated) {
                    val observer = LifecycleEventObserver { _, event ->
                        if (event == Lifecycle.Event.ON_RESUME || event == Lifecycle.Event.ON_START) {
                            if (isAuthenticated) {
                                coroutineScope.launch {
                                    repository.getEntitlementStatus()
                                }
                            }
                        }
                    }
                    lifecycleOwner.lifecycle.addObserver(observer)
                    onDispose {
                        lifecycleOwner.lifecycle.removeObserver(observer)
                    }
                }

                LaunchedEffect(isAuthenticated) {
                    if (isAuthenticated) {
                        repository.getEntitlementStatus()
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
                                },
                                featureFlags = appConfigState.featureFlags
                            )
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = initialStartDestination,
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
}
}

