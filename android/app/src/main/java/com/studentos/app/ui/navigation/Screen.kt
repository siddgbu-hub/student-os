package com.studentos.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object OtpVerify : Screen("otp_verify")
    object Dashboard : Screen("dashboard")
    object Study : Screen("study")
    object Planner : Screen("planner")
    object Revision : Screen("revision")
    object Analytics : Screen("analytics")
    object Account : Screen("account")
}
