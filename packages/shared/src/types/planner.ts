export type PlannerTaskPriority = 'high' | 'medium' | 'low';

export type PlannerTaskStatus =
  | 'planned'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'skipped'
  | 'deferred'
  | 'archived';

export interface PlannerTaskDTO {
  id: string;
  accountId: string;
  subjectId: string;
  chapterId?: string | null;
  title: string;
  plannedDate: string; // YYYY-MM-DD
  plannedStartTime?: string | null; // HH:mm
  estimatedDurationMinutes: number;
  priority: PlannerTaskPriority;
  status: PlannerTaskStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface DailyPlanSummaryDTO {
  date: string;
  totalPlannedDurationMinutes: number;
  completedDurationMinutes: number;
  totalTasksCount: number;
  completedTasksCount: number;
  tasks: PlannerTaskDTO[];
}

export interface WeeklyPlanSummaryDTO {
  startDate: string;
  endDate: string;
  totalPlannedDurationMinutes: number;
  completedDurationMinutes: number;
  dailySummaries: DailyPlanSummaryDTO[];
}

export interface MonthlyCalendarDayDTO {
  date: string; // YYYY-MM-DD
  studyMinutes: number;
  plannedTasksCount: number;
  completedTasksCount: number;
  revisionCount: number;
  completionPercentage: number;
  hasActivity: boolean;
}

export interface MonthlyPlanSummaryDTO {
  year: number;
  month: number;
  plannedHours: number;
  completedHours: number;
  remainingHours: number;
  completionPercentage: number;
  completedTasksCount: number;
  missedTasksCount: number;
  studyStreakDays: number;
  revisionSessionsCount: number;
  days: MonthlyCalendarDayDTO[];
}
