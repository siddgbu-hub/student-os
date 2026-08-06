import { PlannerRepository, PlannerTaskRecord } from '../../db/planner.repository.js';
import { StudyRepository } from '../../db/study.repository.js';
import {
  PlannerTaskDTO,
  DailyPlanSummaryDTO,
  WeeklyPlanSummaryDTO,
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
