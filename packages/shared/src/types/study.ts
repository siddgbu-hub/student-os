export interface SubjectDTO {
  id: string;
  accountId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterDTO {
  id: string;
  subjectId: string;
  accountId: string;
  name: string;
  orderIndex: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StudySessionStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export interface StudySessionDTO {
  id: string;
  accountId: string;
  subjectId: string;
  chapterId?: string | null;
  startTime: string;
  endTime?: string | null;
  durationSeconds: number;
  pauseDurationSeconds: number;
  status: StudySessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TodaySessionsSummaryDTO {
  date: string;
  totalDurationSeconds: number;
  completedSessionsCount: number;
  sessions: StudySessionDTO[];
}
