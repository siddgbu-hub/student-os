# Student OS — Known Issues & Post-V1 Roadmap

## Overview
This document tracks non-blocking limitations, technical debt items, and post-V1 feature freezes strictly adhering to `00_V1_FEATURE_FREEZE.md`.

---

## 1. Frozen Post-V1 Enhancements (per `00_V1_FEATURE_FREEZE.md`)

| Feature Area | Description | Target Release |
| :--- | :--- | :--- |
| **AI Adaptive Spaced Repetition** | Machine-learning interval adjustment based on item difficulty rating | Post-V1 |
| **Institution Multi-Tenancy** | Teacher accounts, institution dashboards, and class group management | Post-V1 |
| **Cloud Payment Processing** | In-app subscription billing via Stripe/Paddle | Post-V1 |
| **Custom Theme Creator** | Custom color palette generator beyond System/Light/Dark presets | Post-V1 |
| **Native Mobile Applications** | iOS Swift and Android Kotlin native builds | Post-V1 |

---

## 2. Technical Debt & Non-Blocking Items

### 2.1 Analytics Time Windows
- **Current Behavior**: Time period filters (`today`, `this_week`, `this_month`, `this_year`) compute metrics against active historical windows. Custom date range selection is planned for post-V1.
- **Impact**: Low. The 4 standard presets cover 98% of student reporting workflows.

### 2.2 Offline Sync Conflict Resolution
- **Current Behavior**: `LocalStorageAdapter` caches reads and writes while offline. In case of concurrent multi-device updates while offline, the most recent timestamp wins.
- **Impact**: Low for single-user offline workflows.

---

## 3. Workarounds & Operating Procedures
- **Clearing Local Cache**: If local offline storage becomes corrupted, users can clear local cache via Account > Data & Storage or browser local storage reset.
