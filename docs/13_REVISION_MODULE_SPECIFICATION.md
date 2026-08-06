# 13\_REVISION\_MODULE\_SPECIFICATION.md

**Project Name:** Student OS *(Working Title)*

**Document Version:** 1.0

**Status:** Approved

**Last Updated:** August 2026


# 13.1 Revision Module Overview

## Purpose

The Revision Module ensures that knowledge acquired during study is retained over time through structured and consistent revision.

Unlike the Study Module, which focuses on learning new material, the Revision Module focuses on strengthening long-term memory.

The module shall transform completed study into lasting understanding.


# Objectives

The Revision Module shall:

- Schedule meaningful revisions. 

- Prevent forgotten topics. 

- Maintain revision consistency. 

- Help users identify overdue revisions. 

- Integrate naturally with daily planning. 

- Measure revision effectiveness. 


# Responsibilities

The Revision Module owns:

- Revision Plans 

- Revision Schedule 

- Revision Sessions 

- Revision History 

- Revision Status 

- Revision Statistics 


# Non-Responsibilities

The Revision Module shall not:

- Create Study Sessions. 

- Manage Goals. 

- Manage Study Blocks. 

- Generate detailed Analytics. 

- Handle Notifications. 

- Manage Authentication. 

Those responsibilities belong to their respective modules.


# Core Philosophy

Learning is incomplete until it is revised.

The Revision Module exists to transform short-term learning into long-term retention.

Revision should become a natural continuation of studying rather than a separate activity.


# User Questions

The Revision Module answers:

- What should I revise today? 

- Which revisions are overdue? 

- Which topics are becoming weak? 

- What has already been revised? 

- What should be revised next? 


# Primary Workflow

The Revision workflow shall follow:

```
`Study Session Completed`


`↓`


`Revision Schedule Generated`


`↓`


`Revision Appears`


`↓`


`Revision Session`


`↓`


`Revision Completed`


`↓`


`Next Revision Scheduled`
```

The user should rarely need to create revisions manually.


# Integration with Other Modules

### Study Module

Completed Study Sessions may generate future Revision items according to revision rules.


### Planner

Today's Planner shall include scheduled revisions alongside Study Blocks.

Users should not need to manage revisions separately.


### Dashboard

Provides:

- Revisions Due Today 

- Overdue Revisions 

- Next Revision 

- Revision Progress 


### Analytics

Consumes:

- Revision completion 

- Revision consistency 

- Retention trends 

- Overdue statistics 


### Widget

May display:

- Revision Due Today 

- Overdue Count 

- Next Revision 


# Guiding Principles

The Revision Module shall:

- Encourage consistency. 

- Minimize manual work. 

- Schedule intelligently. 

- Remain predictable. 

- Integrate seamlessly into daily planning. 


# Definition of Success

The Revision Module is successful when users consistently complete scheduled revisions without needing to manually remember what should be revised.


# Product Philosophy

The Revision Module is not a notes application.

It is not a flashcard application.

It is not a bookmarking system.

It is a structured revision engine that continuously reminds users to revisit previously studied material.


# Revision Hierarchy

```
`Study Session`


`↓`


`Revision Item`


`↓`


`Revision Session`


`↓`


`Revision History`


`↓`


`Analytics`
```

Every revision originates from real study.

No revision should exist without an underlying learning event.


# Product Principle

## Learning Requires Reinforcement

Completing a Study Session is not the end of learning.

Meaningful understanding develops through timely and repeated revision.

Student OS shall treat revision as an essential part of the learning process rather than an optional activity.


# Architecture Principle

## Study Creates Revision

The Study Module produces learning.

The Revision Module preserves learning.

Revision data shall always originate from completed Study Sessions rather than being created independently.

This maintains a clear relationship between learning and retention.


# Engineering Constraint

A Revision Item shall always reference the originating Study Session (or its associated Study Block).

This traceability ensures that every revision can be linked back to the original learning event, enabling accurate analytics, future AI recommendations, and reliable historical records.


# Module Summary

The Revision Module extends the productivity loop beyond execution.

Its purpose is to ensure that the effort invested in studying continues to provide value over time by transforming completed study into retained knowledge.

# 13.2 Revision Planning & Scheduling Specification

## Purpose

The Revision Planning System is responsible for determining **when**, **what**, and **how** previously studied content should be revised.

Its objective is to ensure that revision becomes a structured and predictable part of the learning process rather than relying on memory or user discipline.

The system shall generate a manageable revision workload that integrates naturally with the user's daily study plan.


# Objectives

The Revision Planning System shall:

- Generate revision schedules automatically. 

- Minimize manual planning. 

- Prevent forgotten topics. 

- Balance revision workload. 

- Integrate revisions with daily planning. 

- Support future intelligent scheduling. 


# Core Philosophy

Revision planning should happen automatically.

Users should not spend time deciding what needs revision.

The application should continuously answer:

> **"What should I revise today?"**


# Revision Creation

A Revision Item shall normally be created after a Study Session is successfully completed.

The system shall determine whether a revision is required based on configurable revision rules.

Manual creation of Revision Items shall remain optional.


# Revision Scheduling

Each Revision Item shall contain a scheduled revision date.

The scheduling engine shall determine this date automatically.

Version 1 shall support configurable scheduling intervals.

The exact scheduling algorithm is defined separately from this specification to allow future improvements without changing the product workflow.


# Revision Queue

The system shall maintain a Revision Queue.

The queue represents all pending Revision Items awaiting completion.

The queue shall support:

- Due Today 

- Upcoming 

- Overdue 

- Completed 

The queue shall always be sorted to encourage timely revision.


# Daily Revision Plan

Each day, the application shall prepare a revision plan consisting of:

- Revisions due today. 

- Overdue revisions. 

- Optional upcoming revisions (if today's workload permits). 

The Daily Planner may merge Study Blocks and Revision Items into a single actionable plan while preserving their identities.


# Overdue Revisions

If a scheduled revision is missed:

The Revision Item shall move to the Overdue category.

The system shall recommend completing overdue revisions before scheduling additional optional work.

Revision history shall preserve the original scheduled date.


# Rescheduling

Users may reschedule Revision Items.

Rescheduling shall:

- Preserve historical information. 

- Record the updated revision date. 

- Never modify completed revision history. 

Automatic rescheduling shall not occur without a defined scheduling rule.


# Revision Prioritization

When multiple revisions are due, the system shall prioritize them using:

1. Overdue revisions. 

2. Due today. 

3. Earlier scheduled revisions. 

4. User-defined priority (if applicable). 

The prioritization rules should remain predictable and transparent.


# Workload Balancing

The system should avoid concentrating excessive revisions on a single day.

Where possible, the scheduling engine should distribute revision workload across available days while respecting revision rules.

Version 1 shall prefer simplicity over aggressive optimization.


# Relationship with Planner

Revision Items are not Study Blocks.

However, the Planner shall display both in a unified daily workspace.

This enables users to plan their day without switching between modules.


# Relationship with Dashboard

The Dashboard shall summarize:

- Revisions Due Today. 

- Overdue Revisions. 

- Next Revision. 

- Revision Completion Progress. 

The Dashboard shall never expose scheduling complexity.


# Offline Behaviour

Revision schedules shall remain fully available offline.

Completing or rescheduling revisions shall synchronize automatically once connectivity is restored.


# Business Rules

The Revision Planning System shall:

- Preserve revision history. 

- Prevent duplicate pending Revision Items for the same revision cycle. 

- Maintain scheduling consistency. 

- Separate planning from execution. 


# Future Expansion

The scheduling engine may later support:

- Adaptive spaced repetition. 

- AI-assisted revision intervals. 

- Difficulty-based scheduling. 

- Performance-based prioritization. 

- Exam-aware revision planning. 

These enhancements shall replace only the scheduling algorithm while preserving the overall workflow.


# Success Criteria

The Revision Planning System is successful when users always know:

- What requires revision today. 

- Which revisions are overdue. 

- What should be revised next. 

without manually organizing revision schedules.


# Summary

The Revision Planning System transforms completed study into a structured sequence of future revision opportunities.

Its responsibility is not to evaluate learning, but to ensure that previously learned material is revisited at appropriate times.


# Product Principle

## Revision Should Be Invisible to Plan

Users should not need to remember when to revise.

Student OS should handle revision planning automatically, allowing users to focus entirely on learning and execution.


# Architecture Principle

## Scheduling Is Separate from Learning

Learning creates knowledge.

Revision reinforces knowledge.

Scheduling determines **when** reinforcement occurs.

These responsibilities shall remain independent, allowing the scheduling engine to evolve without affecting the Study or Planner modules.

# 13.3 Revision Item Management

## Purpose

A Revision Item represents a specific learning unit that requires future reinforcement through one or more revision sessions.

It serves as the central entity of the Revision Module, connecting completed Study Sessions with scheduled revisions and long-term retention tracking.

Every Revision Item shall represent a clear and measurable revision objective.


# Objectives

The Revision Item system shall:

- Represent individual revision requirements. 

- Track revision progress independently. 

- Support multiple revision cycles. 

- Maintain historical continuity. 

- Enable intelligent scheduling. 

- Provide reliable data for analytics. 


# Revision Philosophy

A Revision Item represents **knowledge that requires reinforcement**.

It is not the revision itself.

It is a persistent record that survives across multiple revision sessions until its lifecycle is complete.


# Relationship Model

```
`Goal (Optional)`


`↓`


`Study Block`


`↓`


`Study Session`


`↓`


`Revision Item`


`↓`


`Revision Sessions (1...N)`


`↓`


`Retention History`


`↓`


`Analytics`
```

A Revision Item is created only after meaningful learning has occurred.


# Revision Item Components

Each Revision Item shall contain:

### Required

- Subject 

- Chapter / Topic 

- Originating Study Session 

- Scheduled Revision Date 

- Revision Stage 

- Current Status 


### Optional

- Notes 

- Priority 

- Difficulty Rating (Future) 


### System Generated

- Revision Item ID 

- Creation Timestamp 

- Last Revision Timestamp 

- Next Revision Timestamp 

- Total Revision Count 

- Completion History 

- Synchronization Status 

These values shall remain system-controlled.


# Revision Item Status

A Revision Item shall always exist in one of the following states:

- Scheduled 

- Due Today 

- In Progress 

- Completed 

- Overdue 

- Deferred 

- Archived 

Only one state may exist at any given time.


# Lifecycle

```
`Study Session Completed`


`↓`


`Revision Item Created`


`↓`


`Scheduled`


`↓`


`Due Today`


`↓`


`Revision Session Started`


`↓`


`Revision Session Completed`


`↓`


`Next Revision Scheduled`


`↓`


`Archived (Final)`
```

Every transition shall preserve historical data.


# Revision Stages

Each Revision Item progresses through successive stages.

Examples:

- Revision 1 

- Revision 2 

- Revision 3 

- Revision 4 

The scheduling strategy determines when each stage becomes due.

The Revision Module shall not hardcode specific intervals.


# Multiple Revision Sessions

A single Revision Item may generate multiple Revision Sessions over time.

Example:

```
`Organic Chemistry`


`↓`


`Revision Item`


`↓`


`Revision Session 1`


`↓`


`Revision Session 2`


`↓`


`Revision Session 3`


`↓`


`Archived`
```

The Revision Item remains the parent entity.


# Editing Rules

Users may edit:

- Notes 

- Priority 

- Scheduled Date (where permitted) 

Users shall not edit:

- Revision Count 

- Historical Sessions 

- Completion History 

- System Identifiers 

Historical accuracy shall always take precedence.


# Deletion Rules

Scheduled Revision Items may be deleted only if no Revision Session has been completed.

Once revision history exists:

Deletion shall not be permitted.

Archiving should be used instead.


# Duplicate Prevention

The system shall prevent multiple active Revision Items from being created for the same Study Session and revision stage.

Duplicate prevention ensures accurate scheduling and analytics.


# Planner Integration

Revision Items shall appear within the Planner as executable work.

However, they shall remain visually distinguishable from Study Blocks.

Users should always understand whether they are:

- Learning new material, or 

- Revising existing material. 


# Dashboard Integration

Revision Items contribute to:

- Revisions Due Today 

- Overdue Revisions 

- Upcoming Revisions 

- Revision Completion Progress 

Dashboard summaries shall derive data directly from Revision Items.


# Analytics Integration

Revision Items shall provide:

- Total Revisions 

- Revision Consistency 

- Missed Revisions 

- Average Completion Delay 

- Retention Trends (Future) 

Analytics shall consume Revision Item history without modifying it.


# Offline Behaviour

Revision Items shall remain fully available offline.

Completion, rescheduling, and updates shall synchronize automatically when connectivity returns.


# Business Rules

The Revision Item system shall:

- Preserve complete revision history. 

- Prevent duplicate active items. 

- Maintain parent-child relationships. 

- Keep scheduling independent from execution. 


# Future Expansion

Future versions may support:

- AI-generated revision priorities. 

- Subject-specific revision models. 

- Difficulty-based scheduling. 

- Exam mode. 

- Collaborative revision. 

The Revision Item architecture shall remain stable while scheduling algorithms evolve.


# Success Criteria

The Revision Item system is successful when every completed Study Session can be tracked through its complete revision lifecycle without ambiguity or loss of historical information.


# Summary

The Revision Item is the permanent record of a learning objective that requires reinforcement.

It connects learning, scheduling, revision, retention, and analytics into a single coherent lifecycle.


# Product Principle

## Preserve Learning History

Knowledge grows over time.

Student OS shall preserve every meaningful revision event so that learning progress reflects the user's actual journey rather than only the most recent activity.


# Architecture Principle

## One Learning Unit, Many Revisions

A Study Session creates one Revision Item.

A Revision Item may generate many Revision Sessions.

This one-to-many relationship keeps scheduling flexible, analytics accurate, and historical records consistent.


### **etention Score**

Don't implement the algorithm yet.

Just reserve the concept.

Every Revision Item should eventually have a **Retention Score (0–100)** calculated from factors such as:

- Revision consistency. 

- Missed revisions. 

- Completion delay. 

- Number of successful revision cycles. 

- Future quiz performance (if added). 

This score should **never be entered manually**.

It should always be derived from user behavior.

# 13.4 Revision Session Specification

## Purpose

A Revision Session represents the active process of revisiting previously studied material.

Unlike a Study Session, which introduces or practices new content, a Revision Session reinforces existing knowledge to improve long-term retention.

The Revision Session serves as the execution component of the Revision Module.


# Objectives

The Revision Session shall:

- Execute scheduled revisions. 

- Record revision activity. 

- Update Revision Items. 

- Measure revision consistency. 

- Generate reliable historical records. 

- Support future retention analysis. 


# Core Philosophy

Revision is reinforcement, not repetition.

The purpose of a Revision Session is to strengthen existing knowledge rather than simply re-reading content.

Users should actively engage with previously learned material.


# Relationship Model

```
`Study Session`


`↓`


`Revision Item`


`↓`


`Revision Session`


`↓`


`Retention History`


`↓`


`Analytics`
```

A Revision Session cannot exist without an associated Revision Item.


# Revision Session Components

Each Revision Session shall contain:

### Required

- Linked Revision Item 

- Subject 

- Chapter / Topic 

- Start Time 

- End Time 

- Active Duration 


### Optional

- Personal Notes 

- Self Confidence Rating (Future) 

- Revision Method (Future) 


### System Generated

- Revision Session ID 

- Completion Timestamp 

- Total Pause Duration 

- Synchronization Status 

System-generated values shall not be editable.


# Session Lifecycle

```
`Scheduled`


`↓`


`Start Revision`


`↓`


`Pause (Optional)`


`↓`


`Resume (Optional)`


`↓`


`Complete`


`↓`


`Save`


`↓`


`Update Revision Item`


`↓`


`Update Dashboard`


`↓`


`Update Analytics`
```

The lifecycle shall remain consistent with the Study Module wherever appropriate.


# Session Rules

A Revision Session shall:

- Have one start time. 

- Have one end time. 

- Measure only active revision time. 

- Exclude paused duration. 

- Be linked to exactly one Revision Item. 

- Preserve historical accuracy. 

Only one active Revision Session may exist at a time.


# Interaction with Study Sessions

A user shall not have both:

- an active Study Session, and 

- an active Revision Session 

at the same time.

Starting one while the other is active shall require the current session to be completed or ended first.

This prevents conflicting timers and inconsistent productivity data.


# Completion Behaviour

Completing a Revision Session shall:

- Mark the current revision stage as completed. 

- Update the Revision Item. 

- Generate the next scheduled revision if applicable. 

- Update Dashboard summaries. 

- Update Analytics. 

The user should not perform these updates manually.


# Pause & Resume

Users may pause and resume a Revision Session.

Paused time shall never contribute to active revision duration.

The application shall preserve the session state if interrupted.


# Cancellation

Users may cancel a Revision Session before completion.

Cancellation shall:

- Preserve the Revision Item. 

- Record the cancellation event. 

- Avoid incrementing the completed revision count. 

Historical logs shall record the cancellation for future analysis.


# Offline Behaviour

Revision Sessions shall operate fully offline.

Starting, pausing, resuming, and completing a session shall not require internet connectivity.

Synchronization shall occur automatically when connectivity returns.


# Background Behaviour

The Revision timer shall continue accurately while:

- The application is minimized. 

- The device is locked. 

- The application runs in the background. 

Behaviour remains subject to Android operating system limitations.


# Dashboard Integration

Completing a Revision Session shall update:

- Revisions Completed Today 

- Pending Revisions 

- Overdue Revisions 

- Recent Activity 

- Daily Progress 

Dashboard updates should occur automatically.


# Analytics Integration

Revision Sessions contribute to:

- Total Revision Time 

- Revision Frequency 

- Completion Rate 

- Missed Revision Analysis 

- Retention Trends 

Analytics shall consume revision history without modifying it.


# Business Rules

The Revision Session system shall:

- Maintain historical integrity. 

- Prevent duplicate completion events. 

- Preserve accurate timing. 

- Keep execution separate from scheduling. 


# Future Expansion

Future versions may support:

- Voice-based revision. 

- Flashcard integration. 

- Quiz-assisted revision. 

- AI-generated revision questions. 

- Confidence-based revision scoring. 

- Adaptive revision modes. 

These enhancements shall extend the Revision Session without changing its core workflow.


# Success Criteria

The Revision Session system is successful when users can efficiently complete scheduled revisions while the application accurately records every meaningful revision event.


# Summary

The Revision Session is the execution layer of the Revision Module.

It transforms scheduled revision opportunities into measurable learning reinforcement while preserving complete historical records.


# Product Principle

## Active Recall Over Passive Review

Student OS should encourage users to actively reconstruct knowledge rather than merely rereading previously studied material.

Future revision tools should prioritize learning effectiveness over time spent.


# Architecture Principle

## Scheduling and Execution Are Independent

The Revision Planning System determines **when** a revision should occur.

The Revision Session records **how** the revision was completed.

Keeping these responsibilities separate allows the scheduling engine to evolve independently of the execution engine.

# Product Decision

The Revision Session shall use a dedicated interface distinct from the Study Session.

Although both session types share common execution mechanics, they serve different purposes and shall remain visually distinguishable throughout the user experience.

The Revision Session interface shall display:

- Revision Stage (e.g., Revision 2 of 4) 

- Original Study Date 

- Current Revision Date 

- Next Scheduled Revision (if applicable) 

- Linked Revision Item 

The user shall immediately recognize whether they are performing a Study Session or a Revision Session without relying solely on color or icons.

This distinction reinforces the learning lifecycle and preserves contextual awareness during long-term revision.

# 13.5 Revision Workspace Specification

## Purpose

The Revision Workspace is the primary interface for managing, reviewing, and completing scheduled revisions.

It provides a unified environment where users can view all pending, due, overdue, and completed Revision Items without manually organizing their revision schedule.

Unlike the Dashboard, which summarizes revision status, the Revision Workspace exists to help users execute revisions efficiently.


# Objectives

The Revision Workspace shall:

- Present all revision work clearly. 

- Prioritize revisions automatically. 

- Minimize manual organization. 

- Support quick execution. 

- Provide complete visibility into revision progress. 

- Encourage consistent revision habits. 


# Product Philosophy

The Revision Workspace should eliminate uncertainty.

Users should never ask:

> **"What should I revise today?"**

The answer should always be immediately visible.

Revision planning shall remain largely automatic.


# Workspace Layout

The Revision Workspace shall consist of the following sections.


## Revision Summary

Displays:

- Due Today 

- Overdue 

- Upcoming 

- Completed Today 

- Current Revision Streak 

- Overall Completion Rate 

This summary provides an immediate overview of revision status.


## Revision Categories

Revision Items shall be grouped into:

### Due Today

Highest priority.

These items should be completed today.


### Overdue

Scheduled revisions that were not completed on time.

These remain visible until completed.


### Upcoming

Future revisions that are not yet due.

These are informational and normally not prioritized.


### Completed Today

Revision Items successfully completed during the current day.


# Revision Item Card

Each Revision Item shall display:

- Subject 

- Chapter / Topic 

- Revision Stage 

- Original Study Date 

- Scheduled Revision Date 

- Current Status 

- Estimated Revision Duration 

Optional information may include:

- Personal Notes 

- Difficulty Indicator (Future) 

The design shall remain compact while providing sufficient context.


# Primary Actions

Each Revision Item shall support:

- Start Revision 

- View Details 

- Reschedule (where permitted) 

Completed Revision Items shall not expose execution actions.


# Search

Version 1 shall support searching by:

- Subject 

- Chapter 

- Goal 

Search results shall update dynamically as the user types.


# Filtering

Users may filter Revision Items by:

- Status 

- Subject 

- Revision Stage 

Filters shall apply instantly without requiring page reloads.


# Sorting

Default sorting order:

1. Overdue 

2. Due Today 

3. Earlier Scheduled Date 

4. Higher Revision Stage 

5. Creation Date 

Users may apply alternative sorting without affecting stored revision data.


# Revision Execution

Selecting **Start Revision** shall immediately launch the associated Revision Session.

No intermediate confirmation shall be required unless unsaved work exists elsewhere in the application.


# Dynamic Behaviour

The Revision Workspace shall update automatically whenever:

- A Revision Session starts. 

- A Revision Session completes. 

- A Revision Item is rescheduled. 

- Synchronization completes. 

- The current date changes. 

Manual refresh shall not normally be required.


# Empty State

If no Revision Items exist:

Display:

> **No revisions scheduled.**

Supporting message:

> Complete Study Sessions to automatically build your revision schedule.

Primary Action:

**Start Studying**


# Offline Behaviour

The Revision Workspace shall remain fully functional while offline.

Users shall continue to:

- View Revision Items. 

- Start Revision Sessions. 

- Complete revisions. 

- Reschedule revisions. 

Changes shall synchronize automatically when connectivity is restored.


# Business Rules

The Revision Workspace shall:

- Display only active Revision Items. 

- Preserve completed revision history. 

- Prevent duplicate active Revision Items. 

- Maintain a single source of truth for revision data. 


# Future Expansion

Future versions may introduce:

- Calendar View. 

- AI Revision Queue. 

- Difficulty-based grouping. 

- Adaptive Revision Priority. 

- Smart Focus Mode. 

- Subject Heatmaps. 

These enhancements shall extend the existing Revision Workspace without altering its fundamental structure.


# Success Criteria

The Revision Workspace is successful when users can immediately identify:

- What requires revision. 

- What is overdue. 

- What should be revised next. 

without manually organizing or searching for revision material.


# Summary

The Revision Workspace transforms automated revision scheduling into a clear and actionable interface.

Its purpose is to remove planning effort from the revision process and allow users to focus entirely on reinforcing previously learned knowledge.


# Product Decision

The Revision Workspace shall remain separate from the Planner Workspace.

Although both modules present executable work, they serve different purposes.

- The Planner Workspace organizes **future learning**. 

- The Revision Workspace manages **knowledge reinforcement**. 

Both modules may surface items on the Dashboard, but each shall maintain its own dedicated workspace and independent workflow.


# Architecture Decision

Revision Items shall be displayed according to **revision urgency**, not creation order.

The application shall always prioritize overdue and due revisions before future revisions.

This prioritization strategy shall remain consistent across the Dashboard, Revision Workspace, widgets, and future notification systems.


# Engineering Decision

The Revision Workspace shall consume data exclusively from the **Revision Item** entity.

No separate UI-specific revision list shall exist.

Every Revision Item displayed in the workspace shall be rendered directly from the canonical Revision data model, ensuring consistency across the application and eliminating duplicate business logic.

# 13.6 Retention Tracking Specification

## Purpose

The Retention Tracking System measures how effectively users preserve previously learned knowledge through consistent revision.

Its objective is not to measure study time, but to measure knowledge retention over time.

Retention Tracking transforms revision history into meaningful learning insights without requiring additional effort from the user.


# Objectives

The Retention Tracking System shall:

- Monitor revision consistency. 

- Measure long-term retention. 

- Identify weak learning areas. 

- Track revision completion. 

- Generate meaningful retention analytics. 

- Support future adaptive revision strategies. 


# Core Philosophy

Learning should not be measured by the number of hours studied.

Learning should be measured by the ability to retain knowledge over time.

The Retention Tracking System therefore evaluates learning continuity rather than isolated study events.


# Retention Model

Every completed Study Session creates the opportunity for long-term retention.

Retention is strengthened through successful Revision Sessions.

```
`Study Session`

`        ↓`

`Revision Item`

`        ↓`

`Revision Sessions`

`        ↓`

`Retention History`

`        ↓`

`Retention Score`
```

Retention shall evolve continuously throughout the lifecycle of a Revision Item.


# Retention Metrics

Version 1 shall calculate and maintain the following metrics.

### Total Revision Count

The total number of completed Revision Sessions for a Revision Item.


### Revision Completion Rate

The percentage of scheduled revisions successfully completed.


### Missed Revision Count

The total number of revisions not completed before their scheduled date.


### Overdue Revision Count

The number of Revision Items currently overdue.


### Average Revision Delay

The average time between the scheduled revision date and the actual completion time.


### Retention Score

Each Revision Item shall maintain a system-generated Retention Score.

The score shall be derived automatically from revision behaviour.

Users shall never edit this value manually.

The scoring algorithm remains implementation-defined and may evolve without changing this specification.


# Retention History

The system shall preserve every completed Revision Session associated with a Revision Item.

Historical revision records shall never be overwritten.

Retention History shall support future analytics without requiring recalculation from incomplete data.


# Weak Knowledge Detection

The system shall identify Revision Items requiring additional attention.

Examples include:

- Frequently overdue revisions. 

- Repeatedly deferred revisions. 

- Low Retention Scores. 

- Missed revision cycles. 

These indicators shall support future recommendation systems.


# Dashboard Integration

Retention Tracking shall contribute to:

- Revision Progress 

- Retention Summary 

- Learning Consistency 

- Weak Topic Highlights (Future) 

Dashboard components shall present summaries rather than detailed retention calculations.


# Planner Integration

The Planner may use Retention Tracking to recommend higher-priority revision work.

Planning decisions shall never directly modify retention data.


# Analytics Integration

The Analytics Module shall consume:

- Retention Scores. 

- Completion Rates. 

- Revision Delays. 

- Weak Topic Indicators. 

- Historical Retention Trends. 

Analytics shall never modify retention records.


# Offline Behaviour

Retention calculations shall remain available while offline using locally stored data.

Any pending synchronization shall update retention metrics automatically after successful synchronization.


# Business Rules

The Retention Tracking System shall:

- Preserve complete revision history. 

- Prevent manual manipulation of retention metrics. 

- Derive all scores from recorded user behaviour. 

- Maintain a single source of truth for retention data. 


# Future Expansion

Future versions may introduce:

- Quiz-assisted retention validation. 

- Confidence-based retention adjustment. 

- AI-generated retention predictions. 

- Subject-specific retention models. 

- Personalized revision intervals. 

- Memory decay modelling. 

These enhancements shall extend the existing retention architecture while preserving compatibility with historical data.


# Success Criteria

The Retention Tracking System is successful when it accurately reflects long-term learning behaviour using objective revision history rather than subjective user input.


# Summary

The Retention Tracking System transforms revision activity into measurable indicators of long-term learning.

Its responsibility is to preserve an accurate representation of learning continuity while providing a stable foundation for future adaptive learning features.


# Product Decision

Retention shall always be inferred from recorded behaviour rather than manually reported by the user.

Student OS shall evaluate learning through completed Study Sessions and Revision Sessions instead of relying on self-assessment.


# Architecture Decision

Retention data shall remain independent of scheduling logic.

Changes to revision scheduling algorithms shall never invalidate historical retention records.

This separation ensures that future improvements to scheduling can be introduced without compromising long-term learning analytics.


# Engineering Decision

Retention metrics shall be derived from immutable historical events.

The system shall calculate retention using Study Sessions and Revision Sessions as the canonical data sources.

No duplicate retention records shall be maintained, ensuring consistency, auditability, and simplified future analytics.

# Product Decision

Student OS shall support **Add Learning Record**.

This feature shall enable users to register learning activity that occurred outside the application.

The feature exists to ensure that users can maintain an accurate learning history even when a Study Session was not recorded within Student OS.


# Supported Record Types

The Add Learning Record screen shall support:

### Record Past Study Session

Used when the user completed a study session without using Student OS.

The system shall create:

- Study Session 

- Associated Study History 

- Automatic Revision Item 

- Revision Schedule 

The recorded session shall behave identically to a Study Session completed through the normal workflow.


### Create Revision Item

Used when the user wishes to begin revision for material that was studied outside Student OS.

Examples include:

- Classroom lectures 

- Coaching classes 

- Previously completed syllabus 

- Self-study performed before installing Student OS 

The system shall create a Revision Item directly without creating a Study Session.


# Origin Tracking

Every learning record shall contain an immutable **Origin Type**.

Supported values:

- Application 

- Manual 

- Imported (Future) 

Origin Type exists for historical tracking and analytics only.

It shall not alter application behaviour.


# Analytics Behaviour

### Manual Study Sessions

Shall contribute to:

- Study History 

- Study Hours 

- Study Analytics 

- Dashboard 

- Revision Scheduling 


### Manual Revision Items

Shall contribute to:

- Revision History 

- Revision Analytics 

- Retention Tracking 

They shall not modify historical Study Session statistics.


# Architecture Decision

Student OS shall support two valid learning workflows.

### Workflow 1

```
`Study Session`


`↓`


`Study Completed`


`↓`


`Revision Item Created`


`↓`


`Revision Schedule Generated`
```


### Workflow 2

```
`Add Learning Record`


`↓`


`Past Study Session`

`or`

`Manual Revision Item`


`↓`


`Revision Schedule Generated`
```

After creation, both workflows shall produce identical system entities.

Subsequent application behaviour shall remain identical regardless of the origin of the learning record.

# 13.7 Revision Strategy & Lifecycle Specification

## Purpose

The Revision Strategy defines how Revision Items progress from initial creation to long-term knowledge retention.

Its objective is to establish a structured, adaptable, and scalable revision lifecycle while allowing the scheduling algorithm to evolve independently.

The strategy shall ensure that every Revision Item follows a predictable progression until its lifecycle is complete.


# Objectives

The Revision Strategy shall:

- Define the complete revision lifecycle. 

- Support multiple revision stages. 

- Allow configurable scheduling intervals. 

- Preserve revision history. 

- Support future adaptive revision algorithms. 

- Maintain long-term data consistency. 


# Core Philosophy

Revision is a continuous process rather than a single event.

Knowledge should be reinforced repeatedly until the learning objective reaches satisfactory long-term retention.

The application shall treat every completed revision as one step within an ongoing learning journey.


# Revision Lifecycle

Every Revision Item shall progress through the following lifecycle.

```
`Study Completed`

`        ↓`

`Revision Item Created`

`        ↓`

`Revision Stage 1`

`        ↓`

`Revision Stage 2`

`        ↓`

`Revision Stage 3`

`        ↓`

`...`

`        ↓`

`Revision Completed`

`        ↓`

`Archived`
```

Each completed stage shall automatically prepare the next stage when applicable.


# Revision Stages

Each Revision Item shall maintain a Revision Stage.

Examples:

- Stage 1 

- Stage 2 

- Stage 3 

- Stage 4 

The stage number represents the number of successfully completed revision cycles.

Stage numbering shall increase automatically after successful completion of each Revision Session.


# Scheduling Strategy

The scheduling engine shall determine when the next revision becomes due.

The Revision Module shall not hardcode revision intervals.

Scheduling intervals shall remain configurable through the scheduling engine.

Future versions may replace the scheduling algorithm without modifying the Revision Module.


# Revision Completion

Completing a Revision Session shall automatically:

- Mark the current revision stage as completed. 

- Record completion history. 

- Increase Revision Stage. 

- Generate the next scheduled revision (if applicable). 

- Update Dashboard. 

- Update Planner. 

- Update Analytics. 

- Update Retention Tracking. 

No manual intervention shall be required.


# Revision Completion Criteria

A Revision Item shall be considered fully completed when:

- All required revision stages have been completed according to the active revision strategy. 

After completion:

- No further revisions shall be scheduled. 

- Historical records shall remain available. 

- The Revision Item shall transition to the Archived state. 


# Revision Restart

Users may restart a completed Revision Item.

Restarting shall:

- Preserve previous revision history. 

- Create a new revision cycle. 

- Reset the active revision stage. 

- Maintain historical analytics. 

Historical data shall never be deleted during restart.


# Missed Revisions

Missing a scheduled revision shall not terminate the Revision Item.

Instead:

- The item becomes Overdue. 

- Dashboard reflects the overdue status. 

- Planner includes the overdue revision. 

- Revision history records the delay. 

The learning record shall remain intact.


# Manual Rescheduling

Users may reschedule pending Revision Items.

Rescheduling shall:

- Preserve revision history. 

- Update the scheduled date. 

- Record the rescheduling event. 

Completed Revision Sessions shall never be modified.


# Revision Consistency

The system shall continuously monitor:

- Consecutive completed revisions. 

- Missed revisions. 

- Delayed revisions. 

- Completed revision cycles. 

These metrics shall support Analytics and Retention Tracking.


# Data Preservation

Every Revision Session shall remain permanently associated with its parent Revision Item.

Historical revision events shall never be deleted automatically.

Archived Revision Items shall remain available for historical analysis.


# Relationship with Other Modules

### Planner

Displays pending revisions.


### Dashboard

Displays revision summaries.


### Analytics

Measures revision behaviour.


### Retention Tracking

Calculates long-term learning retention.


### Notifications (Future)

Schedules reminders using the current Revision Stage and due date.


# Future Expansion

The Revision Strategy architecture shall support:

- Spaced repetition algorithms. 

- AI-generated revision intervals. 

- Difficulty-aware scheduling. 

- Confidence-based scheduling. 

- Subject-specific revision models. 

- Exam preparation mode. 

- Adaptive memory models. 

These enhancements shall replace only the scheduling strategy while preserving the underlying Revision lifecycle.


# Success Criteria

The Revision Strategy is successful when every Revision Item progresses through a complete, traceable, and configurable lifecycle without compromising historical accuracy or requiring unnecessary user intervention.


# Summary

The Revision Strategy provides the operational framework governing how learning is reinforced over time.

It separates revision scheduling from revision execution, ensuring that Student OS remains flexible enough to adopt future learning methodologies while preserving a stable data model.


# Product Decision

Revision shall be treated as a multi-stage learning process rather than a single follow-up activity.

Each completed revision shall contribute to the long-term progression of a Revision Item until the defined revision lifecycle is complete.


# Architecture Decision

The Revision Module shall separate:

- **Revision Strategy** (defines *when* revisions occur), 

- **Revision Item** (defines *what* requires revision), and 

- **Revision Session** (records *how* the revision was completed). 

These three entities shall remain independent to ensure scalability, maintainability, and compatibility with future scheduling algorithms.


# Engineering Decision

The scheduling algorithm shall function as a replaceable engine.

The Revision Module shall interact only with scheduling results (scheduled dates and stages) rather than embedding interval calculations directly into business logic.

This separation guarantees that future changes to revision methodology do not require redesigning the Revision Module or migrating historical revision data.

# 13.8 Revision Scheduling Engine Specification

## Purpose

The Revision Scheduling Engine is responsible for determining when each Revision Item should be presented to the user for reinforcement.

The engine operates independently of the Revision Module, allowing scheduling strategies to evolve without affecting the underlying learning history.

The Scheduling Engine shall generate predictable, configurable, and extensible revision schedules.


# Objectives

The Scheduling Engine shall:

- Generate revision schedules automatically. 

- Support multiple scheduling strategies. 

- Prevent duplicate scheduling. 

- Adapt to future enhancements. 

- Preserve scheduling consistency. 

- Remain independent from revision execution. 


# Core Philosophy

Scheduling determines **when** a revision should occur.

It does not determine:

- How the revision is performed. 

- Whether learning occurred. 

- Whether knowledge was retained. 

Its responsibility ends after assigning the next revision date.


# Scheduling Trigger

The Scheduling Engine shall execute when:

- A Study Session is completed. 

- A Manual Revision Item is created. 

- A Revision Session is completed. 

- A Revision Item is restarted. 

- The active scheduling strategy changes (where supported). 


# Scheduling Inputs

The engine may use:

- Revision Stage 

- Previous Revision Date 

- Completion Timestamp 

- User Preferences 

- Active Scheduling Strategy 

Future versions may include:

- Retention Score 

- Difficulty Level 

- Exam Date 

- Subject Priority 

- AI Recommendations 


# Scheduling Outputs

Each scheduling operation shall produce:

- Next Revision Date 

- Next Revision Stage 

- Scheduling Timestamp 

- Scheduling Strategy Identifier 

The output shall become part of the Revision Item.


# Supported Strategies

Version 1 shall support one active scheduling strategy.

The architecture shall allow additional strategies to be introduced without modifying Revision Items or Revision Sessions.

Examples of future strategies include:

- Fixed Interval 

- Spaced Repetition 

- Adaptive Learning 

- AI Personalization 

- Exam Preparation 


# Scheduling Integrity

The Scheduling Engine shall:

- Generate exactly one active future revision for each Revision Item. 

- Prevent duplicate pending schedules. 

- Preserve historical scheduling records. 

- Avoid orphaned Revision Items. 


# Failure Handling

If scheduling fails:

- The completed Revision Session shall remain valid. 

- Historical records shall be preserved. 

- The Revision Item shall be marked for scheduling retry. 

- Users shall not lose completed learning data. 

Scheduling failures shall never invalidate completed revision work.


# Relationship with Other Modules

### Revision Module

Consumes generated schedules.


### Planner

Displays scheduled revisions.


### Dashboard

Displays due and upcoming revisions.


### Notifications

Uses generated dates to prepare reminders.


### Analytics

Measures scheduling effectiveness but does not modify schedules.


# Offline Behaviour

Scheduling operations shall function offline whenever sufficient local data is available.

Any pending synchronization shall reconcile scheduling information once connectivity is restored.


# Future Expansion

The Scheduling Engine architecture shall support:

- AI-generated schedules. 

- Personalized memory models. 

- Subject-specific scheduling. 

- Examination-aware scheduling. 

- Collaborative learning schedules. 

Future enhancements shall not require modification of Revision Items or historical Revision Sessions.


# Success Criteria

The Scheduling Engine is successful when every Revision Item always has a valid and traceable next revision while maintaining complete scheduling consistency.


# Summary

The Revision Scheduling Engine separates scheduling logic from learning data.

This separation allows Student OS to continuously improve revision methodologies without altering historical learning records or disrupting existing user data.


# Product Decision

Revision scheduling shall be fully automated during the normal workflow.

Users shall not be required to calculate or manage revision intervals manually.


# Architecture Decision

The Scheduling Engine shall function as an independent service consumed by the Revision Module.

Revision Items shall store scheduling results, while the scheduling logic itself shall remain isolated from revision execution and historical learning data.


# Engineering Decision

The Scheduling Engine shall expose a single scheduling interface.

All revision scheduling requests shall pass through this interface regardless of the underlying scheduling strategy.

This abstraction ensures that future scheduling algorithms can be introduced without affecting application modules or requiring database redesign.


