import { PlannerRepository, PlannerTaskRecord } from '../../db/planner.repository.js';
import { StudyRepository } from '../../db/study.repository.js';
import {
  PlannerTaskDTO,
  DailyPlanSummaryDTO,
  WeeklyPlanSummaryDTO,
  MonthlyPlanSummaryDTO,
  MonthlyCalendarDayDTO,
  CreatePlannerTaskInput,
  UpdatePlannerTaskInput,
  ReschedulePlannerTaskInput,
} from '@student-os/shared';

export class PlannerService {
  constructor(
    private repo: PlannerRepository,
    private studyRepo: StudyRepository
  ) {}

  async createTask(accountId: string, input: CreatePlannerTaskInput, now: Date = new Date()): Promise<PlannerTaskDTO> {
    // 1. Validate Subject existence
    const subject = await this.studyRepo.findSubjectById(input.subjectId, accountId);
    if (!subject) {
      throw new Error('SUBJECT_NOT_FOUND');
    }

    // 2. Validate Chapter if specified
    if (input.chapterId) {
      const chapter = await this.studyRepo.findChapterById(input.chapterId, accountId);
      if (!chapter || chapter.subject_id !== input.subjectId) {
        throw new Error('CHAPTER_NOT_FOUND');
      }
    }

    // 3. Duplicate check warning/log (if identical title, subject, and date exist)
    const existingDateTasks = await this.repo.getTasksByAccountAndDate(accountId, input.plannedDate);
    const duplicate = existingDateTasks.find(
      (t) => t.subject_id === input.subjectId && t.title.toLowerCase() === input.title.trim().toLowerCase()
    );
    if (duplicate && duplicate.status === 'planned') {
      // Allow creation, but record flag/notice in log if needed
    }

    const id = crypto.randomUUID();
    const timestamp = now.toISOString();

    const record = await this.repo.createTask(
      id,
      accountId,
      input.subjectId,
      input.chapterId || null,
      input.title.trim(),
      input.plannedDate,
      input.plannedStartTime || null,
      input.estimatedDurationMinutes,
      input.priority || 'medium',
      input.notes || null,
      timestamp
    );

    return this.mapTaskToDTO(record);
  }

  async getTaskById(accountId: string, taskId: string): Promise<PlannerTaskDTO> {
    const record = await this.repo.findTaskById(taskId, accountId);
    if (!record) {
      throw new Error('TASK_NOT_FOUND');
    }
    return this.mapTaskToDTO(record);
  }

  async getDailyPlan(accountId: string, dateStr?: string, now: Date = new Date()): Promise<DailyPlanSummaryDTO> {
    const targetDate = dateStr || now.toISOString().split('T')[0];
    const records = await this.repo.getTasksByAccountAndDate(accountId, targetDate);
    const tasks = records.map((r) => this.mapTaskToDTO(r));

    const totalPlannedDurationMinutes = tasks.reduce((sum, t) => sum + t.estimatedDurationMinutes, 0);
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const completedDurationMinutes = completedTasks.reduce((sum, t) => sum + t.estimatedDurationMinutes, 0);

    return {
      date: targetDate,
      totalPlannedDurationMinutes,
      completedDurationMinutes,
      totalTasksCount: tasks.length,
      completedTasksCount: completedTasks.length,
      tasks,
    };
  }

  async getWeeklyPlan(accountId: string, startDateStr?: string, now: Date = new Date()): Promise<WeeklyPlanSummaryDTO> {
    let start: Date;
    if (startDateStr) {
      start = new Date(`${startDateStr}T00:00:00.000Z`);
    } else {
      // Default to current week's Monday or today
      start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      start.setDate(diff);
    }

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startIso = start.toISOString().split('T')[0];
    const endIso = end.toISOString().split('T')[0];

    const records = await this.repo.getTasksByAccountAndDateRange(accountId, startIso, endIso);

    // Group records by date
    const dateMap = new Map<string, PlannerTaskRecord[]>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, []);
    }

    for (const rec of records) {
      const list = dateMap.get(rec.planned_date);
      if (list) {
        list.push(rec);
      }
    }

    const dailySummaries: DailyPlanSummaryDTO[] = [];
    let totalPlannedDurationMinutes = 0;
    let completedDurationMinutes = 0;

    dateMap.forEach((dayRecords, dateKey) => {
      const tasks = dayRecords.map((r) => this.mapTaskToDTO(r));
      const plannedMin = tasks.reduce((sum, t) => sum + t.estimatedDurationMinutes, 0);
      const compTasks = tasks.filter((t) => t.status === 'completed');
      const compMin = compTasks.reduce((sum, t) => sum + t.estimatedDurationMinutes, 0);

      totalPlannedDurationMinutes += plannedMin;
      completedDurationMinutes += compMin;

      dailySummaries.push({
        date: dateKey,
        totalPlannedDurationMinutes: plannedMin,
        completedDurationMinutes: compMin,
        totalTasksCount: tasks.length,
        completedTasksCount: compTasks.length,
        tasks,
      });
    });

    return {
      startDate: startIso,
      endDate: endIso,
      totalPlannedDurationMinutes,
      completedDurationMinutes,
      dailySummaries,
    };
  }

  async updateTask(accountId: string, taskId: string, input: UpdatePlannerTaskInput, now: Date = new Date()): Promise<PlannerTaskDTO> {
    const existing = await this.repo.findTaskById(taskId, accountId);
    if (!existing) {
      throw new Error('TASK_NOT_FOUND');
    }

    // Prohibit editing Completed task core fields per spec
    if (existing.status === 'completed') {
      if (input.title || input.plannedDate || input.estimatedDurationMinutes) {
        throw new Error('PLANNER_CANNOT_EDIT_COMPLETED_TASK');
      }
    }

    const updated = await this.repo.updateTask(
      taskId,
      accountId,
      input.title,
      input.plannedDate,
      input.plannedStartTime,
      input.estimatedDurationMinutes,
      input.priority,
      input.notes,
      now.toISOString()
    );

    return this.mapTaskToDTO(updated!);
  }

  async updateTaskStatus(
    accountId: string,
    taskId: string,
    status: 'planned' | 'in_progress' | 'paused' | 'completed' | 'skipped' | 'deferred' | 'archived',
    now: Date = new Date()
  ): Promise<PlannerTaskDTO> {
    const existing = await this.repo.findTaskById(taskId, accountId);
    if (!existing) {
      throw new Error('TASK_NOT_FOUND');
    }

    const updated = await this.repo.updateTaskStatus(taskId, accountId, status, now.toISOString());
    return this.mapTaskToDTO(updated!);
  }

  async rescheduleTask(
    accountId: string,
    taskId: string,
    input: ReschedulePlannerTaskInput,
    now: Date = new Date()
  ): Promise<PlannerTaskDTO> {
    const existing = await this.repo.findTaskById(taskId, accountId);
    if (!existing) {
      throw new Error('TASK_NOT_FOUND');
    }

    let targetDate = input.plannedDate;
    if (input.action === 'move_tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      targetDate = d.toISOString().split('T')[0];
    } else if (input.action === 'move_this_week') {
      const d = new Date(now);
      d.setDate(d.getDate() + 3); // Shift to mid-week
      targetDate = d.toISOString().split('T')[0];
    }

    const updated = await this.repo.rescheduleTask(taskId, accountId, targetDate, input.action, now.toISOString());
    return this.mapTaskToDTO(updated!);
  }

  async deleteTask(accountId: string, taskId: string): Promise<void> {
    const existing = await this.repo.findTaskById(taskId, accountId);
    if (!existing) {
      throw new Error('TASK_NOT_FOUND');
    }
    await this.repo.deleteTask(taskId, accountId);
  }

  async getMonthlySummary(
    accountId: string,
    year: number,
    month: number,
    db: D1Database
  ): Promise<MonthlyPlanSummaryDTO> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const [tasksRes, studyRes, revRes] = await Promise.all([
      db
        .prepare(`SELECT planned_date, status, estimated_duration_minutes FROM planner_tasks WHERE account_id = ? AND planned_date >= ? AND planned_date <= ?`)
        .bind(accountId, startDateStr, endDateStr)
        .all<{ planned_date: string; status: string; estimated_duration_minutes: number }>(),
      db
        .prepare(`SELECT substr(start_time, 1, 10) as date_str, duration_seconds FROM study_sessions WHERE account_id = ? AND status = 'completed' AND start_time >= ? AND start_time <= ?`)
        .bind(accountId, `${startDateStr}T00:00:00.000Z`, `${endDateStr}T23:59:59.999Z`)
        .all<{ date_str: string; duration_seconds: number }>(),
      db
        .prepare(`SELECT substr(start_time, 1, 10) as date_str FROM revision_sessions WHERE account_id = ? AND status = 'completed' AND start_time >= ? AND start_time <= ?`)
        .bind(accountId, `${startDateStr}T00:00:00.000Z`, `${endDateStr}T23:59:59.999Z`)
        .all<{ date_str: string }>(),
    ]);

    const tasks = tasksRes.results || [];
    const studySessions = studyRes.results || [];
    const revisionSessions = revRes.results || [];

    const days: MonthlyCalendarDayDTO[] = [];
    let totalPlannedMins = 0;
    let totalCompletedMins = 0;
    let totalCompletedTasks = 0;
    let totalMissedTasks = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const dayTasks = tasks.filter((t) => t.planned_date === dateStr);
      const dayStudy = studySessions.filter((s) => s.date_str === dateStr);
      const dayRevs = revisionSessions.filter((r) => r.date_str === dateStr);

      const dayStudyMins = Math.round(dayStudy.reduce((acc, s) => acc + s.duration_seconds, 0) / 60);
      const dayPlannedTasks = dayTasks.length;
      const dayCompletedTasks = dayTasks.filter((t) => t.status === 'completed').length;
      const dayMissedTasks = dayTasks.filter((t) => t.status === 'deferred' || t.status === 'skipped').length;
      const dayPlannedMins = dayTasks.reduce((acc, t) => acc + t.estimated_duration_minutes, 0);

      totalPlannedMins += dayPlannedMins;
      totalCompletedMins += dayStudyMins;
      totalCompletedTasks += dayCompletedTasks;
      totalMissedTasks += dayMissedTasks;

      const completionPct = dayPlannedTasks > 0 ? Math.round((dayCompletedTasks / dayPlannedTasks) * 100) : 100;
      const hasActivity = dayStudyMins > 0 || dayPlannedTasks > 0 || dayRevs.length > 0;

      days.push({
        date: dateStr,
        studyMinutes: dayStudyMins,
        plannedTasksCount: dayPlannedTasks,
        completedTasksCount: dayCompletedTasks,
        revisionCount: dayRevs.length,
        completionPercentage: completionPct,
        hasActivity,
      });
    }

    const plannedHours = Number((totalPlannedMins / 60).toFixed(1));
    const completedHours = Number((totalCompletedMins / 60).toFixed(1));
    const remainingHours = Math.max(0, Number((plannedHours - completedHours).toFixed(1)));
    const totalMonthTasks = totalCompletedTasks + totalMissedTasks;
    const completionPercentage = totalMonthTasks > 0 ? Math.round((totalCompletedTasks / totalMonthTasks) * 100) : 100;

    return {
      year,
      month,
      plannedHours,
      completedHours,
      remainingHours,
      completionPercentage,
      completedTasksCount: totalCompletedTasks,
      missedTasksCount: totalMissedTasks,
      studyStreakDays: days.filter((d) => d.hasActivity).length,
      revisionSessionsCount: revisionSessions.length,
      days,
    };
  }

  private mapTaskToDTO(record: PlannerTaskRecord): PlannerTaskDTO {
    return {
      id: record.id,
      accountId: record.account_id,
      subjectId: record.subject_id,
      chapterId: record.chapter_id,
      title: record.title,
      plannedDate: record.planned_date,
      plannedStartTime: record.planned_start_time,
      estimatedDurationMinutes: record.estimated_duration_minutes,
      priority: record.priority,
      status: record.status,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      completedAt: record.completed_at,
    };
  }
}
