**14\_ANALYTICS\_MODULE\_SPECIFICATION.md**

# **14.1 Analytics Module Overview**

## Purpose

The Analytics Module transforms user activity into meaningful insights that help users understand, evaluate, and improve their learning habits.

Rather than simply displaying raw statistics, the module shall provide actionable information derived from Study Sessions, Revision Sessions, Goals, and Planner activity.

The Analytics Module shall serve as the intelligence layer of Student OS.


# Objectives

The Analytics Module shall:

- Measure study behaviour. 

- Measure revision consistency. 

- Measure planning effectiveness. 

- Present meaningful productivity insights. 

- Support long-term academic improvement. 

- Enable future AI-driven recommendations. 


# Responsibilities

The Analytics Module owns:

- Learning Statistics 

- Study Analytics 

- Revision Analytics 

- Goal Analytics 

- Productivity Trends 

- Historical Reports 

- Performance Metrics 

- Retention Insights 


# Non-Responsibilities

The Analytics Module shall not:

- Create Study Sessions. 

- Schedule Revisions. 

- Manage Goals. 

- Modify Planner data. 

- Generate Notifications. 

- Control Dashboard behaviour. 

It consumes data but does not own operational workflows.


# Core Philosophy

Data should explain behaviour rather than merely record activity.

Analytics shall answer meaningful questions that help users improve their learning process.

The objective is continuous improvement rather than numerical achievement.


# User Questions

The Analytics Module shall answer questions such as:

- How much did I study this week? 

- Am I studying consistently? 

- Which subjects receive the most attention? 

- Which subjects are neglected? 

- How effective is my revision habit? 

- How often do I complete planned work? 

- How has my productivity changed over time? 


# Data Sources

The Analytics Module shall consume information from:

### Study Module

- Study Sessions 

- Study Duration 

- Subjects 

- Chapters 

- Session History 


### Planner Module

- Goals 

- Study Blocks 

- Planned Hours 

- Completion Status 

- Planning Accuracy 


### Revision Module

- Revision Sessions 

- Revision Items 

- Revision Completion 

- Retention Tracking 

- Revision History 


### Dashboard

Dashboard interactions may contribute usage analytics where appropriate.


# Analytics Categories

Version 1 shall organize analytics into:

- Study Analytics 

- Planner Analytics 

- Revision Analytics 

- Goal Analytics 

- Productivity Analytics 

- Retention Analytics 

Each category shall remain independent while contributing to overall learning insights.


# Time Periods

Users shall be able to view analytics for:

- Today 

- This Week 

- This Month 

- This Year 

- Custom Range (Future) 

All calculations shall be derived from recorded historical data.


# Data Integrity

Analytics shall never modify operational data.

Study Sessions, Goals, Revision Items, and Planner records remain the single source of truth.

The Analytics Module shall perform read-only calculations.


# Offline Behaviour

Previously synchronized analytics shall remain viewable offline.

New calculations based on locally available data shall continue functioning until synchronization occurs.


# Future Expansion

The Analytics architecture shall support:

- AI-powered insights. 

- Predictive performance analysis. 

- Exam readiness indicators. 

- Personalized learning recommendations. 

- Comparative trend analysis. 

- Cross-device analytics. 

These enhancements shall build upon the existing analytics architecture without altering historical data.


# Success Criteria

The Analytics Module is successful when users can quickly understand their learning behaviour and identify opportunities for improvement without manually interpreting raw data.


# Summary

The Analytics Module converts learning history into actionable insights.

Its responsibility is to help users learn more effectively by presenting clear, reliable, and meaningful information derived from their recorded academic activity.


# Product Decision

Analytics shall prioritize meaningful insights over raw numbers.

The application shall emphasize learning quality, consistency, and progress rather than encouraging users to maximize statistics without educational value.


# Architecture Decision

The Analytics Module shall operate as a read-only consumer of application data.

All calculations shall be derived from canonical entities such as Study Sessions, Study Blocks, Goals, and Revision Items.

Analytics shall never directly modify operational records.


# Engineering Decision

Analytics calculations shall remain modular.

Each analytics category shall calculate its own metrics independently while sharing common historical data sources.

This modular design simplifies maintenance, improves scalability, and allows future analytics features to be added without affecting existing calculations.


## 🚀 Module Direction (Final)

The Analytics Module will not become a collection of graphs.

Its primary purpose is to answer **"How am I learning?"**, not merely **"How many hours did I study?"**

That philosophy should guide every analytics screen we design from this point onward.

# **14.2 Analytics Dashboard Specification**

## Purpose

The Analytics Dashboard is the primary interface for visualizing learning progress, productivity trends, revision performance, and academic consistency.

It shall consolidate data from multiple modules into a unified analytics experience that enables users to understand their learning behaviour at a glance.

The Analytics Dashboard is intended for analysis rather than daily task execution.


# Objectives

The Analytics Dashboard shall:

- Present meaningful academic insights. 

- Highlight learning trends. 

- Visualize consistency. 

- Surface actionable information. 

- Support informed learning decisions. 

- Minimize unnecessary complexity. 


# Product Philosophy

The Analytics Dashboard should answer questions, not simply display numbers.

Every metric presented shall help the user understand, evaluate, or improve their learning behaviour.

Charts and statistics that do not support meaningful decisions shall not be included.


# Dashboard Layout

The Analytics Dashboard shall consist of the following sections.


## Learning Summary

Displays high-level metrics for the selected time period.

Examples:

- Total Study Time 

- Total Revision Time 

- Study Sessions Completed 

- Revision Sessions Completed 

- Goals Completed 

- Study Blocks Completed 

This section provides an overview of academic activity.


## Productivity Summary

Displays:

- Daily Average Study Time 

- Weekly Average Study Time 

- Longest Study Streak 

- Current Study Streak 

- Planning Completion Rate 

- Revision Completion Rate 

These metrics emphasize consistency rather than isolated performance.


## Subject Performance

Displays performance grouped by subject.

Each subject shall include:

- Total Study Time 

- Total Revision Time 

- Completed Study Blocks 

- Pending Study Blocks 

- Goal Progress 

- Retention Score (where applicable) 

Subjects shall be sortable according to the selected metric.


## Learning Trends

Displays learning behaviour over time.

Version 1 shall support:

- Daily Trends 

- Weekly Trends 

- Monthly Trends 

Trend visualizations shall prioritize readability over excessive detail.


## Revision Insights

Displays:

- Revisions Due 

- Revisions Completed 

- Overdue Revisions 

- Average Revision Delay 

- Revision Consistency 

- Retention Trends 

This section focuses exclusively on long-term learning reinforcement.


## Goal Progress

Displays:

- Active Goals 

- Completed Goals 

- Completion Percentage 

- Average Completion Time 

Goals shall be evaluated using objective completion data.


## Planner Performance

Displays:

- Planned Study Hours 

- Completed Study Hours 

- Planning Accuracy 

- Deferred Study Blocks 

- Cancelled Study Blocks 

This section helps users evaluate planning quality.


## Achievement Timeline

Displays a chronological history of significant academic events.

Examples:

- Goal Completed 

- Study Milestone Achieved 

- Revision Milestone Achieved 

- Study Streak Milestone 

The timeline serves as a historical record rather than a gamification feature.


# Time Filters

Users shall be able to switch between:

- Today 

- This Week 

- This Month 

- This Year 

Changing the selected period shall update all dashboard metrics simultaneously.


# Drill Down

Every analytics card shall support navigation to more detailed information where applicable.

Example:

Subject Performance

↓

Physics

↓

Detailed Physics Analytics

Users shall never lose context when navigating between summary and detail views.


# Dynamic Behaviour

The Analytics Dashboard shall update automatically when:

- A Study Session is completed. 

- A Revision Session is completed. 

- A Goal is completed. 

- A Study Block changes state. 

- Synchronization completes. 

Manual refresh shall not normally be required.


# Empty State

If insufficient learning data exists:

Display:

> **Analytics will appear as you continue learning.**

Supporting message:

> Complete Study Sessions and Revision Sessions to build meaningful insights.

No empty charts shall be displayed.


# Offline Behaviour

Previously calculated analytics shall remain viewable offline.

Any new locally available data shall update analytics immediately.

Synchronization shall reconcile analytics automatically after connectivity is restored.


# Business Rules

The Analytics Dashboard shall:

- Display only derived information. 

- Never modify learning records. 

- Maintain consistency across all analytics sections. 

- Present data using the currently selected time period. 


# Future Expansion

Future versions may support:

- AI-generated insights. 

- Comparative performance analysis. 

- Exam readiness indicators. 

- Learning predictions. 

- Institution benchmarking. 

- Personalized academic reports. 

These enhancements shall extend the Analytics Dashboard without altering its core architecture.


# Success Criteria

The Analytics Dashboard is successful when users can understand their academic performance, identify improvement opportunities, and monitor long-term progress within a few minutes.


# Summary

The Analytics Dashboard transforms historical learning data into a structured, interactive, and meaningful overview of academic progress.

It serves as the central destination for understanding learning behaviour while remaining independent of operational learning workflows.


# Product Decision

The Analytics Dashboard shall emphasize meaningful learning behaviour over isolated statistics.

Metrics shall be selected based on their ability to improve learning decisions rather than simply increasing the amount of information displayed.


# Architecture Decision

The Analytics Dashboard shall consume processed analytics generated by the Analytics Module rather than performing calculations directly within the presentation layer.

This separation ensures consistent metrics across the application and simplifies future enhancements.


# Engineering Decision

The Analytics Dashboard shall be component-driven.

Each analytics section shall function as an independent component with its own data source, allowing future additions, removals, or redesigns without affecting the rest of the dashboard architecture.

# **14.3 Analytics Engine Specification**

## Purpose

The Analytics Engine is responsible for processing historical application data into structured metrics, trends, and insights.

It acts as the computational layer of the Analytics Module by transforming raw learning events into meaningful academic information without modifying operational records.

The Analytics Engine shall remain independent of the user interface.


# Objectives

The Analytics Engine shall:

- Process learning history. 

- Generate academic metrics. 

- Calculate productivity trends. 

- Measure consistency. 

- Support future predictive analytics. 

- Provide a single source of analytical calculations. 


# Core Philosophy

Operational modules record events.

The Analytics Engine interprets those events.

The engine shall never create, modify, or delete learning records.

Its sole responsibility is to transform historical data into meaningful information.


# Data Sources

The Analytics Engine shall consume data from:

### Study Module

- Study Sessions 

- Study Duration 

- Subjects 

- Chapters 

- Session History 


### Planner Module

- Goals 

- Study Blocks 

- Completion Status 

- Planning History 


### Revision Module

- Revision Items 

- Revision Sessions 

- Retention Tracking 

- Revision History 


### User Profile

- Academic Preferences 

- Study Targets 

- User-defined Goals 

Only data required for calculations shall be consumed.


# Processing Categories

The Analytics Engine shall calculate:

### Study Metrics

Examples:

- Total Study Time 

- Average Session Duration 

- Sessions Completed 

- Subject Distribution 


### Planning Metrics

Examples:

- Planning Accuracy 

- Goal Completion Rate 

- Study Block Completion 

- Deferred Work 


### Revision Metrics

Examples:

- Revision Completion Rate 

- Missed Revisions 

- Average Revision Delay 

- Revision Consistency 


### Retention Metrics

Examples:

- Retention Score 

- Revision Cycle Progress 

- Weak Knowledge Areas 


### Productivity Metrics

Examples:

- Daily Productivity 

- Weekly Productivity 

- Monthly Productivity 

- Study Consistency 

- Learning Trends 


# Calculation Principles

All calculations shall:

- Be deterministic. 

- Be reproducible. 

- Use canonical learning records. 

- Avoid duplicated calculations. 

- Preserve historical consistency. 

Analytics results shall remain identical regardless of where they are viewed.


# Calculation Frequency

The Analytics Engine shall update when:

- A Study Session completes. 

- A Revision Session completes. 

- A Goal changes status. 

- A Study Block changes state. 

- Historical data changes. 

- Synchronization completes. 

Calculations shall occur automatically.


# Data Integrity

The Analytics Engine shall operate as a read-only consumer.

Operational records remain immutable during analytics processing.

Any correction to operational data shall automatically be reflected in future analytics calculations.


# Metric Versioning

Analytics calculations shall support versioning.

If calculation methodologies change in future versions:

- Historical learning data shall remain unchanged. 

- Updated metrics shall be recalculated using the active analytics engine. 

- Previous calculation versions may be preserved where required. 

This architecture ensures long-term compatibility.


# Performance Strategy

The Analytics Engine shall:

- Minimize unnecessary recalculations. 

- Recalculate only affected metrics. 

- Support incremental updates where possible. 

- Maintain responsive application performance. 


# Offline Behaviour

The Analytics Engine shall process locally available data while offline.

Synchronization shall reconcile calculations after connectivity is restored.

No learning event shall be excluded because of temporary connectivity loss.


# Relationship with Other Modules

### Dashboard

Consumes summarized analytics.


### Planner

Consumes planning insights.


### Revision

Consumes retention insights.


### Notifications (Future)

May consume productivity trends to generate intelligent reminders.


### AI Services (Future)

May consume analytics to generate personalized recommendations.


# Future Expansion

The Analytics Engine architecture shall support:

- Predictive analytics. 

- AI-generated study recommendations. 

- Personalized productivity models. 

- Academic forecasting. 

- Adaptive learning insights. 

- Cross-device analytics. 

Future enhancements shall not require redesign of existing learning entities.


# Success Criteria

The Analytics Engine is successful when every metric presented within Student OS is calculated consistently, accurately, and independently of the user interface.


# Summary

The Analytics Engine is the computational foundation of Student OS.

It transforms immutable learning history into reliable academic insights while remaining modular, deterministic, and extensible.


# Product Decision

Every metric presented to the user shall have a clear educational purpose.

Metrics that do not improve learning decisions, planning quality, or revision effectiveness shall not be included in the application.


# Architecture Decision

The Analytics Engine shall function as a centralized calculation service.

All modules requiring analytical information shall consume results generated by the Analytics Engine instead of implementing independent calculations.

This guarantees consistency throughout the application.


# Engineering Decision

The Analytics Engine shall expose standardized analytics services grouped by category.

Each category shall remain independently maintainable while sharing common historical data sources.

This modular architecture enables future expansion without introducing duplicated calculations or inconsistent business logic.







# **14.4 Learning Insights Specification**

## Purpose

The Learning Insights system transforms analytical metrics into meaningful academic observations that help users understand and improve their learning behaviour.

Instead of presenting isolated statistics, the system shall explain patterns, strengths, weaknesses, and opportunities for improvement.

The objective is to support better learning decisions through contextual insights.


# Objectives

The Learning Insights system shall:

- Explain learning behaviour. 

- Highlight meaningful trends. 

- Identify improvement opportunities. 

- Surface significant academic events. 

- Encourage consistent study habits. 

- Support future AI-generated insights. 


# Core Philosophy

Numbers describe activity.

Insights explain activity.

The Learning Insights system shall convert historical learning data into understandable observations that users can immediately act upon.


# Insight Categories

Version 1 shall support the following categories.


## Study Insights

Examples:

- Total Study Time 

- Average Daily Study Time 

- Longest Study Session 

- Average Session Duration 

- Most Studied Subject 

- Least Studied Subject 

These insights summarize study behaviour.


## Planning Insights

Examples:

- Planning Accuracy 

- Completed Study Blocks 

- Deferred Study Blocks 

- Cancelled Study Blocks 

- Goal Completion Rate 

These insights evaluate planning effectiveness.


## Revision Insights

Examples:

- Revision Completion Rate 

- Pending Revisions 

- Overdue Revisions 

- Average Revision Delay 

- Most Revised Topic 

- Least Revised Topic 

These insights evaluate learning reinforcement.


## Productivity Insights

Examples:

- Current Study Streak 

- Longest Study Streak 

- Most Productive Day 

- Most Productive Week 

- Average Weekly Productivity 

These insights identify productivity patterns.


## Retention Insights

Examples:

- Highest Retention Score 

- Lowest Retention Score 

- Strongest Subject 

- Weakest Subject 

- Topics Requiring Additional Revision 

These insights evaluate long-term learning quality.


# Insight Behaviour

Insights shall:

- Update automatically. 

- Reflect the selected analytics period. 

- Remain consistent across the application. 

- Be generated from historical data. 

Users shall not manually edit insights.


# Insight Prioritization

Higher-priority insights shall appear before general statistics.

Priority order:

1. Critical learning issues. 

2. Overdue revision insights. 

3. Goal progress insights. 

4. Productivity insights. 

5. General learning summaries. 

This ordering ensures users first see information requiring immediate attention.


# Time Scope

Insights shall support:

- Today 

- This Week 

- This Month 

- This Year 

Each insight shall clearly indicate the active reporting period.


# Relationship with Other Modules

### Dashboard

Displays selected high-priority insights.


### Planner

May consume planning-related insights.


### Revision

May consume retention-related insights.


### Notifications (Future)

May use important insights to generate learning reminders.


### AI Services (Future)

May generate personalized recommendations using existing insights.


# Offline Behaviour

Previously generated insights shall remain available offline.

New insights based on locally available data shall update automatically.

Synchronization shall reconcile insight calculations when connectivity is restored.


# Business Rules

The Learning Insights system shall:

- Use only verified application data. 

- Avoid speculative conclusions. 

- Present objective observations. 

- Preserve consistency across all reporting periods. 


# Future Expansion

The Learning Insights architecture shall support:

- AI-generated coaching. 

- Personalized learning recommendations. 

- Predictive academic insights. 

- Subject-specific improvement guidance. 

- Exam readiness evaluation. 

- Adaptive productivity analysis. 

Future enhancements shall build upon the existing insight framework without modifying historical learning records.


# Success Criteria

The Learning Insights system is successful when users can immediately understand what their learning data means and identify practical opportunities for improvement without manually interpreting statistics.


# Summary

The Learning Insights system bridges the gap between analytics and decision-making.

It converts historical learning data into meaningful academic observations that support continuous improvement while maintaining complete objectivity.


# Product Decision

Learning Insights shall present objective observations derived from recorded behaviour.

The system shall not generate motivational statements, subjective judgments, or unsupported conclusions.

Every insight shall be traceable to measurable learning data.


# Architecture Decision

Learning Insights shall consume processed metrics generated by the Analytics Engine.

The system shall not perform independent calculations, ensuring that all insights remain consistent with the analytics displayed throughout Student OS.


# Engineering Decision

Each insight shall be generated through a dedicated insight provider that consumes standardized analytics metrics.

This modular architecture allows new insight categories to be introduced independently without affecting existing analytics calculations or user interface components.

# **14.5 Reports & History Specification**

## Purpose

The Reports & History system provides structured historical records of learning activity over selected time periods.

Its objective is to enable users to review past academic performance, identify long-term trends, and maintain a permanent record of their learning journey.

Unlike the Analytics Dashboard, which emphasizes current insights, Reports focus on historical documentation and detailed review.


# Objectives

The Reports & History system shall:

- Preserve historical learning records. 

- Generate structured academic reports. 

- Support long-term performance review. 

- Enable historical comparisons. 

- Provide export-ready summaries. 

- Maintain complete reporting integrity. 


# Core Philosophy

Learning is a long-term journey.

Reports should help users understand how their learning has evolved over weeks, months, and years rather than focusing solely on recent performance.

Historical reports shall prioritize accuracy, clarity, and continuity.


# Report Categories

Version 1 shall support:

### Study Reports

Includes:

- Study Hours 

- Study Sessions 

- Subject Distribution 

- Session Duration 

- Study Streaks 


### Planner Reports

Includes:

- Planned Study Hours 

- Completed Study Blocks 

- Planning Accuracy 

- Deferred Work 

- Goal Completion 


### Revision Reports

Includes:

- Revision Sessions 

- Revision Completion Rate 

- Missed Revisions 

- Overdue Revisions 

- Revision History 


### Retention Reports

Includes:

- Retention Scores 

- Revision Stage Progress 

- Strong Subjects 

- Weak Subjects 

- Learning Continuity 


### Productivity Reports

Includes:

- Daily Productivity 

- Weekly Productivity 

- Monthly Productivity 

- Learning Trends 

- Academic Consistency 


# Report Periods

Users shall generate reports for:

- Today 

- This Week 

- This Month 

- This Year 

Future versions may support:

- Custom Date Range 

- Semester 

- Academic Year 


# Historical Timeline

The application shall maintain a chronological timeline of significant learning events.

Examples:

- Study Session Completed 

- Goal Completed 

- Revision Completed 

- Learning Milestones 

- Streak Achievements 

The timeline shall function as an immutable historical record.


# Report Navigation

Users shall browse historical reports chronologically.

Navigation shall preserve the selected reporting period until changed by the user.


# Report Comparison

Future versions may allow comparison between reporting periods.

Examples:

- This Week vs Last Week 

- This Month vs Previous Month 

- Current Year vs Previous Year 

Version 1 shall focus on individual reporting periods.


# Export Support

The reporting architecture shall support future export capabilities.

Supported export formats may include:

- PDF 

- CSV 

- Excel 

Version 1 is not required to implement report exporting.

The architecture shall remain compatible with future export services.


# Dashboard Integration

The Analytics Dashboard may display summarized report data.

Detailed reports shall remain available within the Reports section.


# Offline Behaviour

Previously generated reports shall remain viewable while offline.

New reports shall be generated from locally available synchronized data.


# Business Rules

The Reports & History system shall:

- Preserve historical accuracy. 

- Never modify learning records. 

- Maintain chronological ordering. 

- Generate reports only from verified historical data. 


# Future Expansion

The reporting architecture shall support:

- AI-generated academic summaries. 

- Institution reports. 

- Parent reports. 

- Teacher reports. 

- Academic certificates. 

- Learning portfolios. 

Future enhancements shall extend reporting without altering historical records.


# Success Criteria

The Reports & History system is successful when users can accurately review their historical learning activity and identify long-term progress through structured reporting.


# Summary

The Reports & History system preserves the academic journey of every user.

It transforms historical learning data into organized records that support reflection, evaluation, and long-term academic growth.


# Product Decision

Reports shall prioritize historical accuracy over visual complexity.

Every report shall represent verifiable learning data without modification or interpretation.


# Architecture Decision

Reports shall consume processed metrics from the Analytics Engine while preserving references to the original learning history.

The reporting layer shall remain independent of operational modules and shall function exclusively as a historical presentation service.


# Engineering Decision

The reporting system shall generate reports dynamically from canonical historical data rather than storing separate report records.

This approach eliminates data duplication, guarantees consistency, and ensures that future reporting enhancements remain compatible with the existing analytics architecture.







# **14.6 Analytics Metrics & KPI Specification**

## Purpose

The Analytics Metrics & KPI System defines the official academic metrics used throughout Student OS.

Its objective is to establish a standardized measurement framework so that every dashboard, report, insight, widget, and future AI service interprets learning data consistently.

The Analytics Metrics & KPI System shall serve as the single source of truth for all measurable academic indicators.


# Objectives

The Analytics Metrics & KPI System shall:

- Standardize all analytics calculations. 

- Eliminate duplicate metric definitions. 

- Maintain consistency across the application. 

- Support future analytics expansion. 

- Enable reliable historical comparisons. 

- Provide reusable metrics for all application modules. 


# Core Philosophy

Every metric shall represent meaningful academic behaviour.

Metrics shall never exist solely because they are easy to calculate.

Each KPI shall help users understand or improve their learning process.


# Study KPIs

The application shall maintain:

### Total Study Time

The cumulative active duration of all completed Study Sessions within the selected reporting period.


### Study Sessions Completed

The total number of successfully completed Study Sessions.


### Average Study Session Duration

Average active duration of completed Study Sessions.


### Longest Study Session

The maximum duration among completed Study Sessions.


### Current Study Streak

Number of consecutive days containing at least one completed Study Session.


### Longest Study Streak

Highest historical Study Streak achieved by the user.


# Planner KPIs

The application shall maintain:

### Planned Study Hours

Total estimated study duration from Study Blocks.


### Completed Study Blocks

Number of successfully completed Study Blocks.


### Planning Accuracy

Percentage of planned Study Blocks completed within the selected reporting period.


### Deferred Study Blocks

Total Study Blocks rescheduled after their planned execution date.


### Cancelled Study Blocks

Total Study Blocks intentionally cancelled.


# Goal KPIs

The application shall maintain:

### Goals Created

Number of Goals created.


### Goals Completed

Number of Goals successfully completed.


### Goal Completion Rate

Percentage of completed Goals.


### Average Goal Completion Time

Average duration required to complete a Goal.


# Revision KPIs

The application shall maintain:

### Revision Sessions Completed

Total completed Revision Sessions.


### Revision Completion Rate

Percentage of scheduled revisions successfully completed.


### Missed Revisions

Scheduled revisions not completed before the due date.


### Overdue Revisions

Revision Items currently awaiting completion beyond their scheduled date.


### Average Revision Delay

Average delay between scheduled and actual revision completion.


# Retention KPIs

The application shall maintain:

### Retention Score

System-generated indicator representing long-term knowledge retention.


### Revision Stage Progress

Current stage reached by each Revision Item.


### Weak Topics

Topics identified through consistently poor revision performance.


### Strong Topics

Topics demonstrating consistently successful revision behaviour.


# Productivity KPIs

The application shall maintain:

### Daily Productivity

Total completed learning activity for a day.


### Weekly Productivity

Total completed learning activity for a week.


### Monthly Productivity

Total completed learning activity for a month.


### Learning Consistency

Measurement of sustained academic activity across multiple reporting periods.


# Calculation Rules

Every KPI shall:

- Use canonical learning records. 

- Produce deterministic results. 

- Be reproducible. 

- Remain independent of presentation. 

- Support historical recalculation when required. 


# KPI Versioning

Calculation methodologies may evolve.

Historical learning records shall remain unchanged.

Updated KPI definitions shall recalculate metrics using the active analytics engine.


# KPI Availability

KPIs shall be reusable by:

- Dashboard 

- Analytics Dashboard 

- Reports 

- Learning Insights 

- Widgets 

- AI Services (Future) 

- Notification Services (Future) 

Every module shall consume the same KPI definitions.


# Offline Behaviour

KPI calculations shall remain available using locally synchronized data.

Synchronization shall update KPI values automatically when additional learning events become available.


# Business Rules

The KPI System shall:

- Prevent duplicate calculations. 

- Preserve historical consistency. 

- Maintain standardized metric definitions. 

- Expose identical KPI values throughout the application. 


# Future Expansion

The KPI architecture shall support:

- AI Performance Score. 

- Exam Readiness Score. 

- Focus Score. 

- Learning Efficiency Index. 

- Subject Mastery Score. 

- Personalized Academic Health Score. 

Future KPIs shall extend the existing framework without modifying existing metric definitions.


# Success Criteria

The KPI System is successful when every measurable value presented anywhere within Student OS is calculated consistently, accurately, and from the same canonical learning history.


# Summary

The Analytics Metrics & KPI System establishes a unified measurement framework for Student OS.

It ensures that every feature relying on academic metrics operates using standardized definitions, enabling reliable analytics, historical consistency, and future extensibility.


# Product Decision

Every KPI shall represent a meaningful educational outcome.

Metrics that do not improve planning, learning, revision, or academic decision-making shall not be included in Student OS.


# Architecture Decision

All application modules shall consume KPIs exclusively through the Analytics Engine.

No module shall independently calculate or redefine official application metrics.

This guarantees consistency across dashboards, reports, insights, widgets, and future AI services.


# Engineering Decision

Each KPI shall have a single implementation within the Analytics Engine.

Shared KPI services shall be reused throughout the application to eliminate duplicated business logic and ensure maintainable, testable analytics calculations.

