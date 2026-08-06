import { ExamGoalDTO, GoalStatus } from '@student-os/shared';

export interface RawGoalRecord {
  id: string;
  account_id: string;
  exam_name: string;
  exam_date: string;
  target_score: string | null;
  target_daily_minutes: number;
  target_total_chapters: number | null;
  completed_chapters: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export class GoalRepository {
  constructor(private db: D1Database) {}

  async getActiveGoal(accountId: string): Promise<ExamGoalDTO | null> {
    const res = await this.db
      .prepare(
        `SELECT id, account_id, exam_name, exam_date, target_score, target_daily_minutes,
                target_total_chapters, completed_chapters, status, created_at, updated_at
         FROM exam_goals WHERE account_id = ? AND status = 'active' LIMIT 1`
      )
      .bind(accountId)
      .first<RawGoalRecord>();

    if (!res) return null;
    return this.mapRecordToDTO(res);
  }

  async createGoal(accountId: string, input: Omit<ExamGoalDTO, 'id' | 'accountId' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ExamGoalDTO> {
    // Archive previous active goals
    await this.db
      .prepare(`UPDATE exam_goals SET status = 'archived', updated_at = ? WHERE account_id = ? AND status = 'active'`)
      .bind(new Date().toISOString(), accountId)
      .run();

    const id = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO exam_goals (
          id, account_id, exam_name, exam_date, target_score, target_daily_minutes,
          target_total_chapters, completed_chapters, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(
        id,
        accountId,
        input.examName,
        input.examDate,
        input.targetScore || null,
        input.targetDailyMinutes || 120,
        input.targetTotalChapters || null,
        input.completedChapters || 0,
        now,
        now
      )
      .run();

    return (await this.getActiveGoal(accountId))!;
  }

  async updateGoal(id: string, accountId: string, input: Partial<ExamGoalDTO>): Promise<ExamGoalDTO | null> {
    const existing = await this.db
      .prepare(`SELECT * FROM exam_goals WHERE id = ? AND account_id = ?`)
      .bind(id, accountId)
      .first<RawGoalRecord>();

    if (!existing) return null;

    const now = new Date().toISOString();
    const examName = input.examName ?? existing.exam_name;
    const examDate = input.examDate ?? existing.exam_date;
    const targetScore = input.targetScore !== undefined ? input.targetScore : existing.target_score;
    const targetDailyMins = input.targetDailyMinutes ?? existing.target_daily_minutes;
    const targetChapters = input.targetTotalChapters !== undefined ? input.targetTotalChapters : existing.target_total_chapters;
    const completedChapters = input.completedChapters ?? existing.completed_chapters;
    const status = input.status ?? existing.status;

    await this.db
      .prepare(
        `UPDATE exam_goals SET
          exam_name = ?, exam_date = ?, target_score = ?, target_daily_minutes = ?,
          target_total_chapters = ?, completed_chapters = ?, status = ?, updated_at = ?
         WHERE id = ? AND account_id = ?`
      )
      .bind(examName, examDate, targetScore, targetDailyMins, targetChapters, completedChapters, status, now, id, accountId)
      .run();

    const updated = await this.db
      .prepare(`SELECT * FROM exam_goals WHERE id = ? AND account_id = ?`)
      .bind(id, accountId)
      .first<RawGoalRecord>();

    return updated ? this.mapRecordToDTO(updated) : null;
  }

  async deleteGoal(id: string, accountId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM exam_goals WHERE id = ? AND account_id = ?`).bind(id, accountId).run();
  }

  async getCompletedStudyMinutesTotal(accountId: string): Promise<number> {
    const res = await this.db
      .prepare(`SELECT SUM(duration_seconds) as total_sec FROM study_sessions WHERE account_id = ? AND status = 'completed'`)
      .bind(accountId)
      .first<{ total_sec: number | null }>();
    return Math.round((res?.total_sec || 0) / 60);
  }

  async getTodayCompletedStudyMinutes(accountId: string, todayStr: string): Promise<number> {
    const res = await this.db
      .prepare(
        `SELECT SUM(duration_seconds) as total_sec FROM study_sessions
         WHERE account_id = ? AND status = 'completed' AND start_time >= ? AND start_time <= ?`
      )
      .bind(accountId, `${todayStr}T00:00:00.000Z`, `${todayStr}T23:59:59.999Z`)
      .first<{ total_sec: number | null }>();
    return Math.round((res?.total_sec || 0) / 60);
  }

  private mapRecordToDTO(r: RawGoalRecord): ExamGoalDTO {
    return {
      id: r.id,
      accountId: r.account_id,
      examName: r.exam_name,
      examDate: r.exam_date,
      targetScore: r.target_score,
      targetDailyMinutes: r.target_daily_minutes,
      targetTotalChapters: r.target_total_chapters,
      completedChapters: r.completed_chapters,
      status: r.status as GoalStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
