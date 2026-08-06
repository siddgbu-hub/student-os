export interface SubjectRecord {
  id: string;
  account_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ChapterRecord {
  id: string;
  subject_id: string;
  account_id: string;
  name: string;
  order_index: number;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

export interface StudySessionRecord {
  id: string;
  account_id: string;
  subject_id: string;
  chapter_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  pause_duration_seconds: number;
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export class StudyRepository {
  constructor(private db: D1Database) {}

  // --- SUBJECTS ---

  async createSubject(id: string, accountId: string, name: string, timestamp: string): Promise<SubjectRecord> {
    await this.db
      .prepare('INSERT INTO subjects (id, account_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, accountId, name, timestamp, timestamp)
      .run();
    return { id, account_id: accountId, name, created_at: timestamp, updated_at: timestamp };
  }

  async findSubjectById(id: string, accountId: string): Promise<SubjectRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM subjects WHERE id = ? AND account_id = ? LIMIT 1')
      .bind(id, accountId)
      .first<SubjectRecord>();
    return result || null;
  }

  async getSubjectsByAccount(accountId: string): Promise<SubjectRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM subjects WHERE account_id = ? ORDER BY name ASC')
      .bind(accountId)
      .all<SubjectRecord>();
    return result.results || [];
  }

  async updateSubject(id: string, accountId: string, name: string, timestamp: string): Promise<SubjectRecord | null> {
    await this.db
      .prepare('UPDATE subjects SET name = ?, updated_at = ? WHERE id = ? AND account_id = ?')
      .bind(name, timestamp, id, accountId)
      .run();
    return this.findSubjectById(id, accountId);
  }

  async deleteSubject(id: string, accountId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM subjects WHERE id = ? AND account_id = ?')
      .bind(id, accountId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  // --- CHAPTERS ---

  async createChapter(
    id: string,
    subjectId: string,
    accountId: string,
    name: string,
    orderIndex: number,
    timestamp: string
  ): Promise<ChapterRecord> {
    await this.db
      .prepare(
        'INSERT INTO chapters (id, subject_id, account_id, name, order_index, is_completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
      )
      .bind(id, subjectId, accountId, name, orderIndex, timestamp, timestamp)
      .run();
    return {
      id,
      subject_id: subjectId,
      account_id: accountId,
      name,
      order_index: orderIndex,
      is_completed: 0,
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  async findChapterById(id: string, accountId: string): Promise<ChapterRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM chapters WHERE id = ? AND account_id = ? LIMIT 1')
      .bind(id, accountId)
      .first<ChapterRecord>();
    return result || null;
  }

  async getChaptersBySubject(subjectId: string, accountId: string): Promise<ChapterRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM chapters WHERE subject_id = ? AND account_id = ? ORDER BY order_index ASC, created_at ASC')
      .bind(subjectId, accountId)
      .all<ChapterRecord>();
    return result.results || [];
  }

  async updateChapter(
    id: string,
    accountId: string,
    name?: string,
    orderIndex?: number,
    isCompleted?: boolean,
    timestamp?: string
  ): Promise<ChapterRecord | null> {
    const existing = await this.findChapterById(id, accountId);
    if (!existing) return null;

    const newName = name !== undefined ? name : existing.name;
    const newOrder = orderIndex !== undefined ? orderIndex : existing.order_index;
    const newCompleted = isCompleted !== undefined ? (isCompleted ? 1 : 0) : existing.is_completed;
    const now = timestamp || new Date().toISOString();

    await this.db
      .prepare('UPDATE chapters SET name = ?, order_index = ?, is_completed = ?, updated_at = ? WHERE id = ? AND account_id = ?')
      .bind(newName, newOrder, newCompleted, now, id, accountId)
      .run();

    return this.findChapterById(id, accountId);
  }

  async deleteChapter(id: string, accountId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM chapters WHERE id = ? AND account_id = ?')
      .bind(id, accountId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  // --- STUDY SESSIONS ---

  async createSession(
    id: string,
    accountId: string,
    subjectId: string,
    chapterId: string | null,
    startTime: string,
    timestamp: string
  ): Promise<StudySessionRecord> {
    await this.db
      .prepare(
        'INSERT INTO study_sessions (id, account_id, subject_id, chapter_id, start_time, end_time, duration_seconds, pause_duration_seconds, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, 0, 0, "running", ?, ?)'
      )
      .bind(id, accountId, subjectId, chapterId || null, startTime, timestamp, timestamp)
      .run();

    return {
      id,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: chapterId || null,
      start_time: startTime,
      end_time: null,
      duration_seconds: 0,
      pause_duration_seconds: 0,
      status: 'running',
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  async findSessionById(id: string, accountId: string): Promise<StudySessionRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM study_sessions WHERE id = ? AND account_id = ? LIMIT 1')
      .bind(id, accountId)
      .first<StudySessionRecord>();
    return result || null;
  }

  async findActiveSessionByAccount(accountId: string): Promise<StudySessionRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM study_sessions WHERE account_id = ? AND status IN ("running", "paused") ORDER BY start_time DESC LIMIT 1')
      .bind(accountId)
      .first<StudySessionRecord>();
    return result || null;
  }

  async updateSessionState(
    id: string,
    accountId: string,
    status: 'running' | 'paused' | 'completed' | 'cancelled',
    durationSeconds: number,
    pauseDurationSeconds: number,
    endTime: string | null,
    timestamp: string
  ): Promise<StudySessionRecord | null> {
    await this.db
      .prepare(
        'UPDATE study_sessions SET status = ?, duration_seconds = ?, pause_duration_seconds = ?, end_time = ?, updated_at = ? WHERE id = ? AND account_id = ?'
      )
      .bind(status, durationSeconds, pauseDurationSeconds, endTime, timestamp, id, accountId)
      .run();

    return this.findSessionById(id, accountId);
  }

  async getSessionsByAccountAndDate(accountId: string, startDateISO: string, endDateISO: string): Promise<StudySessionRecord[]> {
    const result = await this.db
      .prepare(
        'SELECT * FROM study_sessions WHERE account_id = ? AND start_time >= ? AND start_time <= ? ORDER BY start_time DESC'
      )
      .bind(accountId, startDateISO, endDateISO)
      .all<StudySessionRecord>();
    return result.results || [];
  }
}
