export type GoalStatus = 'active' | 'completed' | 'archived';
export type GoalBadgeStatus = 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'COMPLETED' | 'AHEAD';

export interface ExamGoalDTO {
  id: string;
  accountId: string;
  examName: string;
  examDate: string; // YYYY-MM-DD
  targetScore?: string | null;
  targetDailyMinutes: number;
  targetTotalChapters?: number | null;
  completedChapters: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgressDTO {
  goal: ExamGoalDTO;
  daysRemaining: number;
  weeksRemaining: number;
  monthsRemaining: number;
  studyMinutesCompleted: number;
  studyMinutesRemaining: number;
  completedChapters: number;
  remainingChapters: number;
  requiredMinutesPerDay: number;
  requiredChaptersPerDay: number;
  projectedCompletionDate: string;
  todayStudyMinutesCompleted: number;
  statusBadge: GoalBadgeStatus;
}
