# AI\_DEVELOPMENT\_RULES.md

# AI Development Rules

## Purpose

This document defines the mandatory engineering rules that every AI-assisted implementation must follow while developing Student OS.

Its objective is to ensure that all generated code remains consistent with the documented architecture, business rules, security standards, and long-term maintainability goals of the project.

These rules are mandatory unless explicitly overridden by the Product Owner.


# Core Philosophy

AI shall implement the documented architecture.

AI shall not redesign the product.

AI shall not introduce undocumented behaviour.

When documentation conflicts with implementation assumptions, documentation shall take precedence.


# Rule 1 — Documentation First

Before implementing any feature, AI shall review the relevant specification documents.

Implementation shall always be based on documented requirements.

AI shall never invent undocumented features.


# Rule 2 — Version 1 Scope

AI shall implement only Version 1 functionality.

Features outside Version 1 shall not be added unless explicitly requested by the Product Owner.

Examples of prohibited additions include:

- AI Tutor 

- Gamification 

- Chat 

- Social Features 

- Notes 

- Calendar Sync 

- Widgets not documented 

- Experimental features 


# Rule 3 — Respect Module Boundaries

Each module owns its own business logic.

Examples:

Study Module owns:

- Study Sessions 

- Subjects 

- Chapters 

Planner owns:

- Goals 

- Study Planning 

Revision owns:

- Revision Schedule 

- Revision History 

Analytics owns:

- Learning Insights 

User Account owns:

- Profile 

- Preferences 

Modules shall not directly modify another module's owned entities.


# Rule 4 — Backend as Source of Truth

Business rules shall execute on the backend.

The frontend shall:

- Display information. 

- Collect user input. 

- Render user interfaces. 

The frontend shall never become the authoritative source of business logic.


# Rule 5 — Offline First

Every feature shall be evaluated for offline compatibility.

Whenever practical:

- Save locally first. 

- Synchronize later. 

The application shall remain usable without internet connectivity.


# Rule 6 — Do Not Duplicate Logic

Business logic shall exist only once.

Shared behaviour shall be extracted into reusable services.

Duplicate implementations shall not be introduced.


# Rule 7 — Standardized APIs

All communication between frontend and backend shall occur through documented REST APIs.

The frontend shall never access the database directly.


# Rule 8 — Database Integrity

Database schema changes shall occur only through migrations.

AI shall never:

- Modify production schema manually. 

- Break foreign keys. 

- Duplicate entities. 


# Rule 9 — Security

Every protected operation shall validate:

- Authentication 

- Session 

- Authorized Device 

- Authorization 

Client-side validation shall never replace backend validation.


# Rule 10 — Error Handling

All failures shall:

- Return standardized error responses. 

- Preserve application stability. 

- Avoid exposing implementation details. 

Unhandled exceptions shall not reach end users.


# Rule 11 — Logging

Unexpected failures shall generate structured logs.

Security-sensitive events shall generate audit records.

Sensitive information shall never appear in logs.


# Rule 12 — Consistent Naming

Naming conventions shall remain consistent throughout the project.

Examples:

- Services 

- Components 

- APIs 

- Database Tables 

- DTOs 

- Interfaces 

Ambiguous or inconsistent naming shall be avoided.


# Rule 13 — Reusable Components

UI components shall be reusable.

Duplicate interface implementations shall not be created unless justified.


# Rule 14 — No Hardcoded Business Values

Business values shall remain configurable.

Examples:

- Subscription Price 

- OTP Expiration 

- Study Duration Defaults 

- Notification Timing 

- Grace Period 

Configuration shall originate from centralized configuration services.


# Rule 15 — Maintain Backward Compatibility

New implementations shall not break existing documented behaviour.

Version 1 functionality shall remain stable throughout development.


# Rule 16 — Keep Code Simple

Prefer:

- Readability 

- Maintainability 

- Explicitness 

Avoid unnecessary abstraction and premature optimization.


# Rule 17 — Self-Review Before Completion

Before considering any task complete, AI shall verify:

- Documentation compliance. 

- Type safety. 

- Error handling. 

- Security. 

- Edge cases. 

- Code quality. 


# Rule 18 — Testing Requirement

Every completed feature shall include:

- Appropriate validation. 

- Basic test coverage where applicable. 

- Successful verification against documented requirements. 

Implementation without verification shall not be considered complete.


# Rule 19 — Documentation Synchronization

If implementation requires an approved architectural change:

AI shall:

- Notify the Product Owner. 

- Recommend documentation updates. 

AI shall never silently diverge from the documented architecture.


# Rule 20 — Product Owner Authority

When ambiguity exists:

Priority order shall be:

```
`Product Owner Instructions`

`        ↓`

`Project Documentation`

`        ↓`

`Architecture Principles`

`        ↓`

`Engineering Best Practices`
```

AI shall not override explicit Product Owner decisions.


# Rule 21 — Code Quality Standards

Every implementation shall aim to be:

- Readable 

- Modular 

- Testable 

- Secure 

- Maintainable 

- Well-documented 

Temporary or experimental code shall not remain in production.


# Rule 22 — Git Discipline

Every meaningful implementation shall:

- Preserve build stability. 

- Use descriptive commit messages. 

- Avoid unrelated changes in the same commit. 

Large changes should be divided into logical commits where practical.


# Rule 23 — Production Readiness

A feature shall be considered complete only when:

- Requirements are implemented. 

- Edge cases are handled. 

- Errors are handled. 

- Security is verified. 

- Documentation remains accurate. 

- Tests pass. 

- No known critical defects remain. 


# Rule 24 — Communication Rules

When assisting during development, AI shall:

- Explain architectural trade-offs when relevant. 

- Highlight risks before implementation. 

- Ask for clarification only when requirements are genuinely ambiguous. 

- Avoid making assumptions that change documented behaviour. 

### Rule 25 — No Silent Assumptions

> If a requirement is missing or genuinely ambiguous, AI shall explicitly identify the gap instead of inventing behaviour. Any implementation choice not covered by the documentation shall require Product Owner approval before becoming part of the codebase.


# Success Criteria

AI development is successful when every implementation aligns with the documented architecture, preserves long-term maintainability, and delivers production-quality code without introducing undocumented functionality.


# Final Principle

Student OS is a documentation-driven project.

The purpose of AI is to implement the documented product faithfully, not to redesign it.

Every implementation should make the architecture stronger, simpler, and easier to maintain for future development.

