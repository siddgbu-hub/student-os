export type TimePeriod = 'today' | 'this_week' | 'this_month' | 'this_year';

export interface LearningSummaryDTO {
  totalStudyTimeMinutes: number;
  totalRevisionTimeMinutes: number;
  totalFocusTimeMinutes: number;
  studySessionsCompleted: number;
  revisionSessionsCompleted: number;
  tasksCompleted: number;
}

export interface ProductivitySummaryDTO {
  dailyAverageStudyMinutes: number;
  weeklyAverageStudyMinutes: number;
  currentStreakDays: number;
  longestStreakDays: number;
  plannerCompletionRate: number; // 0-100%
  revisionCompletionRate: number; // 0-100%
}

export interface SubjectAnalyticsDTO {
  subjectId: string;
  subjectName: string;
  studyTimeMinutes: number;
  revisionTimeMinutes: number;
  totalTimeMinutes: number;
  sharePercentage: number; // 0-100%
  completedTasksCount: number;
  pendingTasksCount: number;
  retentionScore: number;
}

export interface TrendDataPointDTO {
  date: string; // YYYY-MM-DD
  label: string; // e.g. Mon, Tue, Jan 15
  studyMinutes: number;
  revisionMinutes: number;
  tasksCompleted: number;
}

export interface RevisionAnalyticsDTO {
  dueTodayCount: number;
  overdueCount: number;
  completedCount: number;
  revisionCompletionRate: number;
  averageRevisionDelayDays: number;
  retentionScoreAverage: number;
}

export interface PlannerAnalyticsDTO {
  plannedDurationMinutes: number;
  completedDurationMinutes: number;
  accuracyPercentage: number;
  deferredTasksCount: number;
  cancelledTasksCount: number;
}

export interface AnalyticsDashboardDTO {
  period: TimePeriod;
  startDate: string;
  endDate: string;
  learningSummary: LearningSummaryDTO;
  productivitySummary: ProductivitySummaryDTO;
  subjectAnalytics: SubjectAnalyticsDTO[];
  trends: TrendDataPointDTO[];
  revisionAnalytics: RevisionAnalyticsDTO;
  plannerAnalytics: PlannerAnalyticsDTO;
}
