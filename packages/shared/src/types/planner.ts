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
