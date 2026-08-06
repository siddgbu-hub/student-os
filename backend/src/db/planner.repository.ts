export interface PlannerTaskRecord {
  id: string;
  account_id: string;
  subject_id: string;
  chapter_id: string | null;
  title: string;
  planned_date: string;
  planned_start_time: string | null;
  estimated_duration_minutes: number;
  priority: 'high' | 'medium' | 'low';
  status: 'planned' | 'in_progress' | 'paused' | 'completed' | 'skipped' | 'deferred' | 'archived';
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface PlannerTaskLogRecord {
  id: string;
  task_id: string;
  account_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
}

export class PlannerRepository {
  constructor(private db: D1Database) {}

  async createTask(
    id: string,
    accountId: string,
    subjectId: string,
    chapterId: string | null,
    title: string,
    plannedDate: string,
    plannedStartTime: string | null,
    estimatedDurationMinutes: number,
    priority: 'high' | 'medium' | 'low',
    notes: string | null,
    timestamp: string
  ): Promise<PlannerTaskRecord> {
    await this.db
      .prepare(
        `INSERT INTO planner_tasks (
          id, account_id, subject_id, chapter_id, title, planned_date, planned_start_time,
          estimated_duration_minutes, priority, status, notes, created_at, updated_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, NULL)`
      )
      .bind(
        id,
        accountId,
        subjectId,
        chapterId || null,
        title,
        plannedDate,
        plannedStartTime || null,
        estimatedDurationMinutes,
        priority,
        notes || null,
        timestamp,
        timestamp
      )
      .run();

    await this.logTaskAction(crypto.randomUUID(), id, accountId, 'created', null, 'planned', timestamp);

    return {
      id,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: chapterId || null,
      title,
      planned_date: plannedDate,
      planned_start_time: plannedStartTime || null,
      estimated_duration_minutes: estimatedDurationMinutes,
      priority,
      status: 'planned',
      notes: notes || null,
      created_at: timestamp,
      updated_at: timestamp,
      completed_at: null,
    };
  }

  async findTaskById(id: string, accountId: string): Promise<PlannerTaskRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM planner_tasks WHERE id = ? AND account_id = ? LIMIT 1')
      .bind(id, accountId)
      .first<PlannerTaskRecord>();
    return result || null;
  }

  async getTasksByAccountAndDate(accountId: string, plannedDate: string): Promise<PlannerTaskRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM planner_tasks WHERE account_id = ? AND planned_date = ? ORDER BY CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END ASC, planned_start_time ASC, created_at ASC')
      .bind(accountId, plannedDate)
      .all<PlannerTaskRecord>();
    return result.results || [];
  }

  async getTasksByAccountAndDateRange(accountId: string, startDate: string, endDate: string): Promise<PlannerTaskRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM planner_tasks WHERE account_id = ? AND planned_date >= ? AND planned_date <= ? ORDER BY planned_date ASC, CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END ASC')
      .bind(accountId, startDate, endDate)
      .all<PlannerTaskRecord>();
    return result.results || [];
  }

  async updateTask(
    id: string,
    accountId: string,
    title?: string,
    plannedDate?: string,
    plannedStartTime?: string | null,
    estimatedDurationMinutes?: number,
    priority?: 'high' | 'medium' | 'low',
    notes?: string | null,
    timestamp?: string
  ): Promise<PlannerTaskRecord | null> {
    const existing = await this.findTaskById(id, accountId);
    if (!existing) return null;

    const newTitle = title !== undefined ? title : existing.title;
    const newDate = plannedDate !== undefined ? plannedDate : existing.planned_date;
    const newTime = plannedStartTime !== undefined ? plannedStartTime : existing.planned_start_time;
    const newDuration = estimatedDurationMinutes !== undefined ? estimatedDurationMinutes : existing.estimated_duration_minutes;
    const newPriority = priority !== undefined ? priority : existing.priority;
    const newNotes = notes !== undefined ? notes : existing.notes;
    const now = timestamp || new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE planner_tasks SET
          title = ?, planned_date = ?, planned_start_time = ?, estimated_duration_minutes = ?,
          priority = ?, notes = ?, updated_at = ?
        WHERE id = ? AND account_id = ?`
      )
      .bind(newTitle, newDate, newTime, newDuration, newPriority, newNotes, now, id, accountId)
      .run();

    await this.logTaskAction(crypto.randomUUID(), id, accountId, 'edited', existing.status, existing.status, now);

    return this.findTaskById(id, accountId);
  }

  async updateTaskStatus(
    id: string,
    accountId: string,
    newStatus: 'planned' | 'in_progress' | 'paused' | 'completed' | 'skipped' | 'deferred' | 'archived',
    timestamp: string
  ): Promise<PlannerTaskRecord | null> {
    const existing = await this.findTaskById(id, accountId);
    if (!existing) return null;

    const completedAt = newStatus === 'completed' ? timestamp : existing.completed_at;

    await this.db
      .prepare('UPDATE planner_tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND account_id = ?')
      .bind(newStatus, completedAt, timestamp, id, accountId)
      .run();

    await this.logTaskAction(crypto.randomUUID(), id, accountId, 'status_change', existing.status, newStatus, timestamp);

    return this.findTaskById(id, accountId);
  }

  async rescheduleTask(
    id: string,
    accountId: string,
    newDate: string,
    action: string,
    timestamp: string
  ): Promise<PlannerTaskRecord | null> {
    const existing = await this.findTaskById(id, accountId);
    if (!existing) return null;

    const newStatus = action === 'move_tomorrow' || action === 'move_this_week' ? 'deferred' : existing.status;

    await this.db
      .prepare('UPDATE planner_tasks SET planned_date = ?, status = ?, updated_at = ? WHERE id = ? AND account_id = ?')
      .bind(newDate, newStatus, timestamp, id, accountId)
      .run();

    await this.logTaskAction(crypto.randomUUID(), id, accountId, `rescheduled_${action}`, existing.status, newStatus, timestamp);

    return this.findTaskById(id, accountId);
  }

  async deleteTask(id: string, accountId: string): Promise<boolean> {
    const existing = await this.findTaskById(id, accountId);
    if (!existing) return false;

    // Business Rule: In Progress or Completed tasks deletion rules
    if (existing.status === 'in_progress') {
      throw new Error('PLANNER_CANNOT_DELETE_IN_PROGRESS_TASK');
    }
    if (existing.status === 'completed') {
      throw new Error('PLANNER_CANNOT_DELETE_COMPLETED_TASK');
    }

    const result = await this.db
      .prepare('DELETE FROM planner_tasks WHERE id = ? AND account_id = ?')
      .bind(id, accountId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  async logTaskAction(
    id: string,
    taskId: string,
    accountId: string,
    action: string,
    previousStatus: string | null,
    newStatus: string | null,
    timestamp: string
  ): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO planner_task_logs (id, task_id, account_id, action, previous_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, taskId, accountId, action, previousStatus, newStatus, timestamp)
      .run();
  }
}
