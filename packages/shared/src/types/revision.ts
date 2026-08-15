export type RevisionItemStatus =
  | 'scheduled'
  | 'due_today'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'deferred'
  | 'archived';

export type RevisionItemPriority = 'high' | 'medium' | 'low';

export type RevisionSessionStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export type RevisionRating = 'again' | 'hard' | 'good' | 'easy';

export interface RevisionItemDTO {
  id: string;
  accountId: string;
  subjectId: string;
  chapterId?: string | null;
  originatingStudySessionId?: string | null;
  scheduledDate: string; // YYYY-MM-DD
  revisionStage: number; // e.g. 1, 2, 3, 4, 5
  status: RevisionItemStatus;
  priority: RevisionItemPriority;
  notes?: string | null;
  totalRevisionCount: number;
  retentionScore: number; // 0-100 reserved concept
  lastRating?: RevisionRating | null;
  lapseCount?: number;
  createdAt: string;
  updatedAt: string;
  lastRevisionAt?: string | null;
  completedAt?: string | null;
}

export interface RevisionSessionDTO {
  id: string;
  accountId: string;
  revisionItemId: string;
  subjectId: string;
  chapterId?: string | null;
  startTime: string;
  endTime?: string | null;
  durationSeconds: number;
  pauseDurationSeconds: number;
  revisionStage: number;
  status: RevisionSessionStatus;
  notes?: string | null;
  rating?: RevisionRating | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyRevisionSummaryDTO {
  date: string;
  dueTodayCount: number;
  overdueCount: number;
  completedTodayCount: number;
  totalRevisionSecondsToday: number;
  averageRetentionScore: number;
  items: RevisionItemDTO[];
}
