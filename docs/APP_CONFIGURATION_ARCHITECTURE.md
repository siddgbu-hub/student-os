# Student OS — Remote Configuration, Feature Flags & App Version Governance Architecture

## 1. Executive Summary

This document defines the architecture for Remote App Configuration, Feature Flags, Maintenance Mode, and Version Governance for Student OS Android and backend platforms.

### Goals
1. **Minimize Native APK Releases**: Routine feature toggles, maintenance states, announcement banners, URL changes, and backend contract updates must be remotely configurable from the server without requiring an APK compilation and release.
2. **Deterministic Version Governance**: Ensure older clients can be gracefully guided (optional update) or strictly gated (mandatory update) when backward-incompatible native platform changes or security fixes occur.
3. **Fail-Safe Startup Performance**: Remote configuration retrieval must be non-blocking, lightweight, cached locally, and fully isolated from user authentication and feature waterfalls.

---

## 2. Existing Architecture Audit

### 2.1 Android Client Architecture
- **Networking**: `ApiClient.kt` wraps OkHttp and handles `Authorization: Bearer <token>` and `x-device-id` injection.
- **Session & Token Management**: `SessionManager.kt` uses Android `SharedPreferences` to persist JWT tokens, theme preferences, and device IDs, exposing `tokenFlow`.
- **Repository Layer**: `StudentOsRepository.kt` centralizes domain entity operations.
- **Application Startup Flow**:
  1. `StudentOsApplication.kt` initializes application context.
  2. `MainActivity.kt` sets Compose content with `NavGraph.kt`.
  3. `NavGraph.kt` reads `SessionHydrationState` from `repository.tokenFlow`.
  4. App update checking currently uses `AppUpdateManager.kt` hitting `GET /api/v1/app/version/android`.
- **Existing Limitation**: The existing update check is tailored for binary APK direct-downloads, lacks typed feature flags, does not handle maintenance mode, and does not provide general remote configuration.

### 2.2 Backend Architecture (Cloudflare Workers + Hono + D1)
- **Framework**: Hono routing running on Cloudflare Workers edge environment.
- **Database**: Cloudflare D1 SQL relational database.
- **Module Structure**: `src/modules/app/` handles application-level endpoints (`app.controller.ts`, `app.config.ts`).
- **Endpoint Structure**: Routes mounted under `/api/v1/app`.

---

## 3. Proposed Target Architecture

```
                    Cloudflare Worker / D1
                  [GET /api/v1/app/config]
                              │
                    JSON Config Payload
                    (Public, Fast, Edge)
                              │
                              ▼
            ┌───────────────────────────────────┐
            │   Android Native Client (APK)     │
            │                                   │
            │   ┌───────────────────────────┐   │
            │   │   AppConfigRepository     │   │
            │   │   - OkHttp / Retrofit     │   │
            │   │   - SharedPreferences Cache│  │
            │   │   - Safe Default Fallback │   │
            │   └─────────────┬─────────────┘   │
            │                 ▼                 │
            │   ┌───────────────────────────┐   │
            │   │    AppConfigManager       │   │
            │   │   - SemVer Engine         │   │
            │   │   - FeatureFlag Asserter  │   │
            │   │   - StateFlow<ConfigState>│   │
            │   └─────────────┬─────────────┘   │
            │                 │                 │
            ├─────────────────┼─────────────────┤
            │ UI Layer        ▼                 │
            │ ┌───────────────────────────────┐ │
            │ │ MaintenanceModeScreen         │ │
            │ ├───────────────────────────────┤ │
            │ │ ForceUpdateDialog             │ │
            │ ├───────────────────────────────┤ │
            │ │ OptionalUpdateNotice          │ │
            │ ├───────────────────────────────┤ │
            │ │ Dynamic Feature Navigation    │ │
            │ └───────────────────────────────┘ │
            └───────────────────────────────────┘
```

---

## 4. API Contract: `GET /api/v1/app/config`

- **HTTP Method**: `GET`
- **Path**: `/api/v1/app/config`
- **Authentication**: None (Public)
- **Cache-Control**: `public, max-age=60, s-maxage=300`

### 4.1 Response Payload Schema
```json
{
  "success": true,
  "data": {
    "version": {
      "minimumSupportedVersion": "1.0.0",
      "minimumSupportedVersionCode": 1,
      "latestVersion": "1.0.4",
      "latestVersionCode": 5,
      "recommendedUpdateVersion": "1.0.4",
      "forceUpdate": false
    },
    "maintenance": {
      "maintenanceMode": false,
      "maintenanceMessage": null
    },
    "features": {
      "analytics": true,
      "planner": true,
      "revision": true,
      "study": true,
      "payments": true,
      "webVersion": true,
      "newDashboard": true
    },
    "urls": {
      "webUrl": "https://studentos.kryvlance.in",
      "playStoreUrl": "https://play.google.com/store/apps/details?id=com.studentos.app",
      "helpUrl": "https://studentos.kryvlance.in/help",
      "supportEmail": "support@kryvlance.in"
    },
    "announcements": []
  },
  "timestamp": "2026-08-20T16:30:00.000Z"
}
```

---

## 5. Android Configuration Engine

### 5.1 Package Layout: `com.studentos.app.config`
- `AppConfig.kt`: Data contracts for remote response and UI states.
- `AppVersion.kt`: Deterministic Semantic Versioning parser and comparator (`major.minor.patch` + `versionCode`).
- `FeatureFlags.kt`: Type-safe enum representation (`Feature.ANALYTICS`, `Feature.PLANNER`, etc.).
- `AppConfigRepository.kt`: Handles network retrieval, local SharedPreferences JSON cache, and immutable defaults.
- `AppConfigManager.kt`: Singleton/Manager exposing reactive Kotlin `StateFlow<AppConfigState>`.

### 5.2 Version Comparison Rules
Given `installedVersion = "1.1.0"` (versionCode: 4):
1. **Force Update**: `installedVersion < minimumSupportedVersion` OR `installedVersionCode < minimumSupportedVersionCode` OR `forceUpdate == true`.
   - Action: Renders non-dismissable Force Update screen pointing to Play Store package URL.
2. **Optional Update**: `installedVersion < latestVersion` AND `installedVersion >= minimumSupportedVersion`.
   - Action: Renders dismissable banner/dialog informing the user of the new release.
3. **No Update**: `installedVersion >= latestVersion`.
   - Action: User proceeds normally without interruption.

### 5.3 Offline & Failure Strategy
- If network call fails or times out (3s timeout):
  - Check local SharedPreferences for last known cached configuration.
  - If no cache exists, use hardcoded safe application defaults.
  - **Never** trigger maintenance mode or force update solely because the network request failed.

---

## 6. Security Considerations
- **No Remote Code Execution**: The configuration contains only static primitives, strings, booleans, and URLs. No dynamic JavaScript, Dex classloading, or eval code.
- **Backend RBAC Authority**: UI feature flags only hide or disable views. All backend endpoints enforce database-level authentication, authorization, and subscription entitlement checks independently.
- **Zero Secrets**: No API keys, JWT secrets, database connection strings, or user credentials are exposed via `/api/v1/app/config`.
- **Sanitized Links**: Store links strictly point to official package `com.studentos.app` on Google Play.

---

## 7. Migration & Compatibility
- Existing APK clients that query `/api/v1/app/version/android` continue to be served without breakage.
- New and updated clients query `/api/v1/app/config`.
- Both endpoints are tested and co-exist safely in `app.controller.ts`.
