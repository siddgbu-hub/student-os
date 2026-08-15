export interface RevisionItemRecord {
  id: string;
  account_id: string;
  subject_id: string;
  chapter_id: string | null;
  originating_study_session_id: string | null;
  scheduled_date: string;
  revision_stage: number;
  status: 'scheduled' | 'due_today' | 'in_progress' | 'completed' | 'overdue' | 'deferred' | 'archived';
  priority: 'high' | 'medium' | 'low';
  notes: string | null;
  total_revision_count: number;
  retention_score: number;
  last_rating: 'again' | 'hard' | 'good' | 'easy' | null;
  lapse_count: number;
  created_at: string;
  updated_at: string;
  last_revision_at: string | null;
  completed_at: string | null;
}

export interface RevisionSessionRecord {
  id: string;
  account_id: string;
  revision_item_id: string;
  subject_id: string;
  chapter_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  pause_duration_seconds: number;
  revision_stage: number;
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  notes: string | null;
  rating: 'again' | 'hard' | 'good' | 'easy' | null;
  created_at: string;
  updated_at: string;
}

export class RevisionRepository {
  constructor(private db: D1Database) {}

  async createRevisionItem(
    id: string,
    accountId: string,
    subjectId: string,
    chapterId: string | null,
    originatingStudySessionId: string | null,
    scheduledDate: string,
    revisionStage: number = 1,
    priority: 'high' | 'medium' | 'low' = 'medium',
    notes: string | null = null,
    timestamp: string = new Date().toISOString()
  ): Promise<RevisionItemRecord> {
    await this.db
      .prepare(
        `INSERT INTO revision_items (
          id, account_id, subject_id, chapter_id, originating_study_session_id, scheduled_date,
          revision_stage, status, priority, notes, total_revision_count, retention_score,
          last_rating, lapse_count, created_at, updated_at, last_revision_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, 0, 100, NULL, 0, ?, ?, NULL, NULL)`
      )
      .bind(
        id,
        accountId,
        subjectId,
        chapterId || null,
        originatingStudySessionId || null,
        scheduledDate,
        revisionStage,
        priority,
        notes || null,
        timestamp,
        timestamp
      )
      .run();

    await this.logItemAction(crypto.randomUUID(), id, accountId, 'created', null, 'scheduled', timestamp);

    return (await this.findRevisionItemById(id, accountId))!;
  }

  async findRevisionItemById(id: string, accountId: string): Promise<RevisionItemRecord | null> {
    const res = await this.db
      .prepare('SELECT * FROM revision_items WHERE id = ? AND account_id = ? LIMIT 1')
      .bind(id, accountId)
      .first<RevisionItemRecord>();
    return res || null;
  }

  async findActiveRevisionItemBySession(originatingStudySessionId: string, accountId: string): Promise<RevisionItemRecord | null> {
    const res = await this.db
      .prepare('SELECT * FROM revision_items WHERE originating_study_session_id = ? AND account_id = ? AND status NOT IN ("completed", "archived") LIMIT 1')
      .bind(originatingStudySessionId, accountId)
      .first<RevisionItemRecord>();
    return res || null;
  }

  async getRevisionItemsByAccount(accountId: string): Promise<RevisionItemRecord[]> {
    const res = await this.db
      .prepare('SELECT * FROM revision_items WHERE account_id = ? ORDER BY scheduled_date ASC, CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END ASC')
      .bind(accountId)
      .all<RevisionItemRecord>();
    return res.results || [];
  }

  async getRevisionItemsByDate(accountId: string, dateStr: string): Promise<RevisionItemRecord[]> {
    const res = await this.db
      .prepare('SELECT * FROM revision_items WHERE account_id = ? AND scheduled_date = ? ORDER BY CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END ASC')
      .bind(accountId, dateStr)
      .all<RevisionItemRecord>();
    return res.results || [];
  }

  async updateRevisionItem(
    id: string,
    accountId: string,
    scheduledDate?: string,
    priority?: 'high' | 'medium' | 'low',
    notes?: string | null,
    status?: RevisionItemRecord['status'],
    timestamp: string = new Date().toISOString()
  ): Promise<RevisionItemRecord | null> {
    const existing = await this.findRevisionItemById(id, accountId);
    if (!existing) return null;

    const newDate = scheduledDate !== undefined ? scheduledDate : existing.scheduled_date;
    const newPriority = priority !== undefined ? priority : existing.priority;
    const newNotes = notes !== undefined ? notes : existing.notes;
    const newStatus = status !== undefined ? status : existing.status;

    await this.db
      .prepare('UPDATE revision_items SET scheduled_date = ?, priority = ?, notes = ?, status = ?, updated_at = ? WHERE id = ? AND account_id = ?')
      .bind(newDate, newPriority, newNotes, newStatus, timestamp, id, accountId)
      .run();

    if (newStatus !== existing.status) {
      await this.logItemAction(crypto.randomUUID(), id, accountId, 'status_change', existing.status, newStatus, timestamp);
    }

    return this.findRevisionItemById(id, accountId);
  }

  async updateRevisionItemAfterReview(
    id: string,
    accountId: string,
    params: {
      scheduledDate: string;
      revisionStage: number;
      status: RevisionItemRecord['status'];
      retentionScore: number;
      lastRating: 'again' | 'hard' | 'good' | 'easy';
      lapseCount: number;
      completedAt: string | null;
      timestamp: string;
    }
  ): Promise<RevisionItemRecord | null> {
    const existing = await this.findRevisionItemById(id, accountId);
    if (!existing) return null;

    await this.db
      .prepare(
        `UPDATE revision_items SET
          scheduled_date = ?,
          revision_stage = ?,
          status = ?,
          retention_score = ?,
          last_rating = ?,
          lapse_count = ?,
          total_revision_count = total_revision_count + 1,
          last_revision_at = ?,
          completed_at = ?,
          updated_at = ?
        WHERE id = ? AND account_id = ?`
      )
      .bind(
        params.scheduledDate,
        params.revisionStage,
        params.status,
        params.retentionScore,
        params.lastRating,
        params.lapseCount,
        params.timestamp,
        params.completedAt || null,
        params.timestamp,
        id,
        accountId
      )
      .run();

    if (params.status !== existing.status) {
      await this.logItemAction(crypto.randomUUID(), id, accountId, 'status_change', existing.status, params.status, params.timestamp);
    }

    return this.findRevisionItemById(id, accountId);
  }

  async archiveRevisionItem(id: string, accountId: string, timestamp: string = new Date().toISOString()): Promise<RevisionItemRecord | null> {
    return this.updateRevisionItem(id, accountId, undefined, undefined, undefined, 'archived', timestamp);
  }

  async deleteRevisionItem(id: string, accountId: string): Promise<boolean> {
    const existing = await this.findRevisionItemById(id, accountId);
    if (!existing) return false;

    if (existing.total_revision_count > 0 || existing.status === 'completed') {
      throw new Error('REVISION_CANNOT_DELETE_WITH_HISTORY');
    }

    const res = await this.db
      .prepare('DELETE FROM revision_items WHERE id = ? AND account_id = ?')
      .bind(id, accountId)
      .run();

    return (res.meta?.changes ?? 0) > 0;
  }

  // --- REVISION SESSIONS ---

  async createRevisionSession(
    id: string,
    accountId: string,
    revisionItemId: string,
    subjectId: string,
    chapterId: string | null,
    revisionStage: number,
    startTime: string
  ): Promise<RevisionSessionRecord> {
    await this.db
      .prepare(
        `INSERT INTO revision_sessions (
          id, account_id, revision_item_id, subject_id, chapter_id, start_time,
          duration_seconds, pause_duration_seconds, revision_stage, status, notes, rating, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'running', NULL, NULL, ?, ?)`
      )
      .bind(id, accountId, revisionItemId, subjectId, chapterId || null, startTime, revisionStage, startTime, startTime)
      .run();

    return (await this.findRevisionSessionById(id, accountId))!;
  }

  async findActiveRevisionSession(accountId: string): Promise<RevisionSessionRecord | null> {
    const res = await this.db
      .prepare('SELECT * FROM revision_sessions WHERE account_id = ? AND status IN ("running", "paused") LIMIT 1')
      .bind(accountId)
      .first<RevisionSessionRecord>();
    return res || null;
  }

  async findRevisionSessionById(id: string, accountId: string): Promise<RevisionSessionRecord | null> {
    const res = await this.db
      .prepare('SELECT * FROM revision_sessions WHERE id = ? AND account_id = ? LIMIT 1')
      .bind(id, accountId)
      .first<RevisionSessionRecord>();
    return res || null;
  }

  async updateRevisionSession(
    id: string,
    accountId: string,
    status: 'running' | 'paused' | 'completed' | 'cancelled',
    durationSeconds: number,
    pauseDurationSeconds: number,
    endTime: string | null,
    notes: string | null,
    timestamp: string,
    rating?: 'again' | 'hard' | 'good' | 'easy' | null
  ): Promise<RevisionSessionRecord | null> {
    await this.db
      .prepare(
        `UPDATE revision_sessions SET
          status = ?, duration_seconds = ?, pause_duration_seconds = ?, end_time = ?, notes = ?, rating = ?, updated_at = ?
        WHERE id = ? AND account_id = ?`
      )
      .bind(status, durationSeconds, pauseDurationSeconds, endTime || null, notes || null, rating || null, timestamp, id, accountId)
      .run();

    return this.findRevisionSessionById(id, accountId);
  }

  async logItemAction(
    id: string,
    revisionItemId: string,
    accountId: string,
    action: string,
    previousStatus: string | null,
    newStatus: string | null,
    timestamp: string
  ): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO revision_item_logs (id, revision_item_id, account_id, action, previous_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, revisionItemId, accountId, action, previousStatus, newStatus, timestamp)
      .run();
  }
}
