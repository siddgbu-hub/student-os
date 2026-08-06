export interface RawSessionAnalyticsRecord {
  id: string;
  subject_id: string;
  subject_name: string;
  chapter_id: string | null;
  start_time: string;
  duration_seconds: number;
  status: string;
}

export interface RawTaskAnalyticsRecord {
  id: string;
  subject_id: string;
  subject_name: string;
  chapter_id: string | null;
  planned_date: string;
  estimated_duration_minutes: number;
  status: string;
}

export interface RawRevisionItemAnalyticsRecord {
  id: string;
  subject_id: string;
  subject_name: string;
  scheduled_date: string;
  revision_stage: number;
  status: string;
  total_revision_count: number;
  retention_score: number;
}

export class AnalyticsRepository {
  constructor(private db: D1Database) {}

  async getStudySessions(accountId: string, startDateStr: string, endDateStr: string): Promise<RawSessionAnalyticsRecord[]> {
    const res = await this.db
      .prepare(
        `SELECT s.id, s.subject_id, sub.name as subject_name, s.chapter_id, s.start_time, s.duration_seconds, s.status
         FROM study_sessions s
         JOIN subjects sub ON sub.id = s.subject_id
         WHERE s.account_id = ? AND s.status = 'completed' AND s.start_time >= ? AND s.start_time <= ?
         ORDER BY s.start_time ASC`
      )
      .bind(accountId, `${startDateStr}T00:00:00.000Z`, `${endDateStr}T23:59:59.999Z`)
      .all<RawSessionAnalyticsRecord>();

    return res.results || [];
  }

  async getRevisionSessions(accountId: string, startDateStr: string, endDateStr: string): Promise<RawSessionAnalyticsRecord[]> {
    const res = await this.db
      .prepare(
        `SELECT r.id, r.subject_id, sub.name as subject_name, r.chapter_id, r.start_time, r.duration_seconds, r.status
         FROM revision_sessions r
         JOIN subjects sub ON sub.id = r.subject_id
         WHERE r.account_id = ? AND r.status = 'completed' AND r.start_time >= ? AND r.start_time <= ?
         ORDER BY r.start_time ASC`
      )
      .bind(accountId, `${startDateStr}T00:00:00.000Z`, `${endDateStr}T23:59:59.999Z`)
      .all<RawSessionAnalyticsRecord>();

    return res.results || [];
  }

  async getPlannerTasks(accountId: string, startDateStr: string, endDateStr: string): Promise<RawTaskAnalyticsRecord[]> {
    const res = await this.db
      .prepare(
        `SELECT t.id, t.subject_id, sub.name as subject_name, t.chapter_id, t.planned_date, t.estimated_duration_minutes, t.status
         FROM planner_tasks t
         JOIN subjects sub ON sub.id = t.subject_id
         WHERE t.account_id = ? AND t.planned_date >= ? AND t.planned_date <= ?
         ORDER BY t.planned_date ASC`
      )
      .bind(accountId, startDateStr, endDateStr)
      .all<RawTaskAnalyticsRecord>();

    return res.results || [];
  }

  async getRevisionItems(accountId: string): Promise<RawRevisionItemAnalyticsRecord[]> {
    const res = await this.db
      .prepare(
        `SELECT ri.id, ri.subject_id, sub.name as subject_name, ri.scheduled_date, ri.revision_stage, ri.status, ri.total_revision_count, ri.retention_score
         FROM revision_items ri
         JOIN subjects sub ON sub.id = ri.subject_id
         WHERE ri.account_id = ?`
      )
      .bind(accountId)
      .all<RawRevisionItemAnalyticsRecord>();

    return res.results || [];
  }

  async getAllActiveDates(accountId: string): Promise<string[]> {
    const res = await this.db
      .prepare(
        `SELECT DISTINCT substr(start_time, 1, 10) as date_str FROM (
           SELECT start_time FROM study_sessions WHERE account_id = ? AND status = 'completed'
           UNION
           SELECT start_time FROM revision_sessions WHERE account_id = ? AND status = 'completed'
         ) ORDER BY date_str DESC`
      )
      .bind(accountId, accountId)
      .all<{ date_str: string }>();

    return (res.results || []).map((r) => r.date_str);
  }
}
