# 07\_INFORMATION\_ARCHITECTURE.md

**Project Name:** Student OS *(Working Title)*

**Document Version:** **1.0**

**Status:** **Approved**

**Last Updated:** August 2026


# 1. Purpose

This document defines the structural organization of Student OS.

It specifies how modules, screens, navigation, and user flows are organized throughout the application.

It does **not** define UI layouts or visual design. Those are covered separately in the Screen Specifications document.


# 2. Information Architecture Philosophy

The application shall be organized around user workflows rather than features.

Users should always think in terms of:

- What they want to accomplish 

- Not where a feature is located 

Navigation should feel natural and predictable.


# 3. Navigation Principles

Navigation must satisfy the following:

- Maximum three interactions to reach any major feature whenever reasonably possible. 

- No hidden navigation for essential functionality. 

- The current location should always be obvious. 

- Navigation must remain consistent throughout the application. 


# 4. Primary Navigation

Version 1 shall use **Bottom Navigation** as the primary navigation method.

Primary destinations:

- Dashboard 

- Study 

- Planner 

- Analytics 

- Profile 

These destinations shall remain accessible from anywhere within the application.


# 5. Dashboard

The Dashboard is the default landing screen after login.

It acts as the command center of Student OS.

Its purpose is to provide awareness, not complete management.

Users should be able to understand their current status within a few seconds.


# 6. Module Hierarchy

The application shall be organized into independent modules.

Version 1 modules:

- Dashboard 

- Study 

- Planner 

- Revision 

- Goals 

- Analytics 

- Profile 

- Settings 

Each module shall maintain clear boundaries.


# 7. Screen Hierarchy

Screens shall follow a hierarchical structure.

Example:

Dashboard

↓

Study

↓

Subject

↓

Chapter

↓

Study Session

Each level should represent a logical increase in detail.


# 8. Entry Points

Users may enter the application through:

- App icon 

- Home screen widget 

- Notification 

- Deep link (future) 

Regardless of entry point, navigation should remain predictable.


# 9. Home Screen Widget Architecture

The home screen widget is considered an extension of the Dashboard.

It shall provide high-level awareness only.

The widget shall display summary information such as:

- Today's study duration 

- Remaining study target 

- Pending tasks 

- Revision due 

- Current streak 

The widget shall never replace the application.

Complex interactions shall always occur inside the application.


# 10. Information Priority

Every screen should display information in the following order:

1. Action Required 

2. Current Progress 

3. Remaining Work 

4. Insights 

5. Historical Information 

Historical data should never distract from immediate actions.


# 11. User Flow Principles

Users should naturally move from:

Plan

↓

Execute

↓

Review

↓

Improve

Every major workflow should follow this lifecycle.


# 12. Module Independence

Each module should function independently.

Examples:

Study module should not depend directly upon Analytics.

Analytics should consume Study data rather than control Study behavior.

Loose coupling shall be maintained.


# 13. Cross-Module Communication

Modules shall communicate through shared services and documented interfaces.

Direct dependencies between modules should be minimized.


# 14. Future Expansion

Future modules should integrate without changing the existing navigation hierarchy.

Examples:

- Work OS 

- Life OS 

- Finance OS 

The architecture should remain scalable.


# 15. Navigation Consistency

Navigation behavior must remain identical throughout the application.

Examples:

- Back always behaves predictably. 

- Similar screens use similar actions. 

- Users should never relearn navigation. 


# 16. Search

Search shall remain contextual.

Version 1 may introduce search only where it provides meaningful value.

Global search is outside the scope of Version 1.


# 17. Notifications

Notifications act as shortcuts into specific workflows.

Opening a notification should take the user directly to the relevant screen whenever possible.


# 18. Offline Navigation

Navigation shall remain fully functional without internet connectivity.

Unavailable online functionality should fail gracefully without breaking navigation.


# 19. Product Architecture Summary

Student OS follows a **Dashboard-Centered Modular Architecture**.

Users always begin with awareness.

They then move into focused execution.

Finally, they review progress through analytics.

This cycle repeats daily.


# 20. Summary

This document establishes the structural blueprint of Student OS.

All future screen specifications, navigation flows, and module implementations must follow the information architecture defined here.


