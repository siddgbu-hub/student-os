import { RevisionRepository, RevisionItemRecord, RevisionSessionRecord } from '../../db/revision.repository.js';
import { StudyRepository } from '../../db/study.repository.js';
import {
  RevisionItemDTO,
  RevisionSessionDTO,
  DailyRevisionSummaryDTO,
  CreateRevisionItemInput,
  UpdateRevisionItemInput,
  RescheduleRevisionItemInput,
  StartRevisionSessionInput,
} from '@student-os/shared';

// Spaced repetition stage intervals in days
const STAGE_INTERVALS_DAYS = [1, 3, 7, 14, 30];

export class RevisionService {
  constructor(
    private repo: RevisionRepository,
    private studyRepo: StudyRepository
  ) {}

  // Automatically create Revision Item from completed Study Session
  async createRevisionFromCompletedSession(
    accountId: string,
    studySessionId: string,
    subjectId: string,
    chapterId: string | null,
    now: Date = new Date()
  ): Promise<RevisionItemDTO | null> {
    // Check for duplicate active revision item
    const existing = await this.repo.findActiveRevisionItemBySession(studySessionId, accountId);
    if (existing) {
      return this.mapItemToDTO(existing);
    }

    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + STAGE_INTERVALS_DAYS[0]);
    const dateStr = scheduledDate.toISOString().split('T')[0];

    const id = crypto.randomUUID();
    const item = await this.repo.createRevisionItem(
      id,
      accountId,
      subjectId,
      chapterId,
      studySessionId,
      dateStr,
      1,
      'medium',
      null,
      now.toISOString()
    );

    return this.mapItemToDTO(item);
  }

  async createManualRevisionItem(accountId: string, input: CreateRevisionItemInput, now: Date = new Date()): Promise<RevisionItemDTO> {
    const subject = await this.studyRepo.findSubjectById(input.subjectId, accountId);
    if (!subject) {
      throw new Error('SUBJECT_NOT_FOUND');
    }

    if (input.chapterId) {
      const chapter = await this.studyRepo.findChapterById(input.chapterId, accountId);
      if (!chapter || chapter.subject_id !== input.subjectId) {
        throw new Error('CHAPTER_NOT_FOUND');
      }
    }

    const id = crypto.randomUUID();
    const item = await this.repo.createRevisionItem(
      id,
      accountId,
      input.subjectId,
      input.chapterId || null,
      input.originatingStudySessionId || null,
      input.scheduledDate,
      1,
      input.priority || 'medium',
      input.notes || null,
      now.toISOString()
    );

    return this.mapItemToDTO(item);
  }

  async getRevisionItems(accountId: string, dateStr?: string, now: Date = new Date()): Promise<RevisionItemDTO[]> {
    const todayStr = dateStr || now.toISOString().split('T')[0];
    const records = await this.repo.getRevisionItemsByAccount(accountId);

    // Update dynamically calculated statuses (e.g. overdue vs due_today vs scheduled)
    const items = records.map((r) => {
      let currentStatus = r.status;
      if (currentStatus === 'scheduled' || currentStatus === 'due_today' || currentStatus === 'overdue') {
        if (r.scheduled_date === todayStr) {
          currentStatus = 'due_today';
        } else if (r.scheduled_date < todayStr) {
          currentStatus = 'overdue';
        } else {
          currentStatus = 'scheduled';
        }
      }
      return {
        ...r,
        status: currentStatus,
      };
    });

    return items.map((r) => this.mapItemToDTO(r));
  }

  async getDailySummary(accountId: string, dateStr?: string, now: Date = new Date()): Promise<DailyRevisionSummaryDTO> {
    const targetDate = dateStr || now.toISOString().split('T')[0];
    const items = await this.getRevisionItems(accountId, targetDate, now);

    const dueTodayCount = items.filter((i) => i.status === 'due_today').length;
    const overdueCount = items.filter((i) => i.status === 'overdue').length;
    const completedTodayCount = items.filter((i) => i.completedAt && i.completedAt.startsWith(targetDate)).length;

    // Calculate average retention score
    const scores = items.map((i) => i.retentionScore);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;

    return {
      date: targetDate,
      dueTodayCount,
      overdueCount,
      completedTodayCount,
      totalRevisionSecondsToday: 0,
      averageRetentionScore: avgScore,
      items,
    };
  }

  async updateRevisionItem(
    accountId: string,
    itemId: string,
    input: UpdateRevisionItemInput,
    now: Date = new Date()
  ): Promise<RevisionItemDTO> {
    const existing = await this.repo.findRevisionItemById(itemId, accountId);
    if (!existing) {
      throw new Error('REVISION_ITEM_NOT_FOUND');
    }

    const updated = await this.repo.updateRevisionItem(
      itemId,
      accountId,
      input.scheduledDate,
      input.priority,
      input.notes,
      undefined,
      now.toISOString()
    );

    return this.mapItemToDTO(updated!);
  }

  async rescheduleRevisionItem(
    accountId: string,
    itemId: string,
    input: RescheduleRevisionItemInput,
    now: Date = new Date()
  ): Promise<RevisionItemDTO> {
    const existing = await this.repo.findRevisionItemById(itemId, accountId);
    if (!existing) {
      throw new Error('REVISION_ITEM_NOT_FOUND');
    }

    const updated = await this.repo.updateRevisionItem(
      itemId,
      accountId,
      input.scheduledDate,
      undefined,
      undefined,
      'deferred',
      now.toISOString()
    );

    return this.mapItemToDTO(updated!);
  }

  async archiveRevisionItem(accountId: string, itemId: string, now: Date = new Date()): Promise<RevisionItemDTO> {
    await this.findItemOrThrow(itemId, accountId);
    const archived = await this.repo.archiveRevisionItem(itemId, accountId, now.toISOString());
    return this.mapItemToDTO(archived!);
  }

  // --- REVISION SESSION LIFECYCLE ---

  async startRevisionSession(
    accountId: string,
    input: StartRevisionSessionInput,
    now: Date = new Date()
  ): Promise<RevisionSessionDTO> {
    // 1. Validate Revision Item exists
    const item = await this.findItemOrThrow(input.revisionItemId, accountId);

    // 2. Check for active study session (MUTUAL EXCLUSION)
    const activeStudySession = await this.studyRepo.findActiveSessionByAccount(accountId);
    if (activeStudySession) {
      throw new Error('ACTIVE_STUDY_SESSION_EXISTS');
    }

    // 3. Check for active revision session (MUTUAL EXCLUSION)
    const activeRevSession = await this.repo.findActiveRevisionSession(accountId);
    if (activeRevSession) {
      throw new Error('ACTIVE_REVISION_SESSION_EXISTS');
    }

    const id = crypto.randomUUID();
    const timestamp = now.toISOString();

    const sessionRecord = await this.repo.createRevisionSession(
      id,
      accountId,
      item.id,
      item.subject_id,
      item.chapter_id,
      item.revision_stage,
      timestamp
    );

    // Mark item as in_progress
    await this.repo.updateRevisionItem(item.id, accountId, undefined, undefined, undefined, 'in_progress', timestamp);

    return this.mapSessionToDTO(sessionRecord);
  }

  async getActiveRevisionSession(accountId: string): Promise<RevisionSessionDTO | null> {
    const session = await this.repo.findActiveRevisionSession(accountId);
    return session ? this.mapSessionToDTO(session) : null;
  }

  async pauseRevisionSession(accountId: string, sessionId: string, now: Date = new Date()): Promise<RevisionSessionDTO> {
    const session = await this.findSessionOrThrow(sessionId, accountId);
    if (session.status !== 'running') {
      throw new Error('SESSION_NOT_RUNNING');
    }

    const elapsed = Math.floor((now.getTime() - new Date(session.start_time).getTime()) / 1000);
    const updated = await this.repo.updateRevisionSession(
      sessionId,
      accountId,
      'paused',
      Math.max(session.duration_seconds, elapsed),
      session.pause_duration_seconds,
      null,
      session.notes,
      now.toISOString()
    );

    return this.mapSessionToDTO(updated!);
  }

  async resumeRevisionSession(accountId: string, sessionId: string, now: Date = new Date()): Promise<RevisionSessionDTO> {
    const session = await this.findSessionOrThrow(sessionId, accountId);
    if (session.status !== 'paused') {
      throw new Error('SESSION_NOT_PAUSED');
    }

    const updated = await this.repo.updateRevisionSession(
      sessionId,
      accountId,
      'running',
      session.duration_seconds,
      session.pause_duration_seconds,
      null,
      session.notes,
      now.toISOString()
    );

    return this.mapSessionToDTO(updated!);
  }

  async endRevisionSession(
    accountId: string,
    sessionId: string,
    notes?: string | null,
    now: Date = new Date()
  ): Promise<{ session: RevisionSessionDTO; item: RevisionItemDTO }> {
    const session = await this.findSessionOrThrow(sessionId, accountId);
    const timestamp = now.toISOString();

    let durationSeconds = session.duration_seconds;
    if (session.status === 'running') {
      const elapsed = Math.floor((now.getTime() - new Date(session.start_time).getTime()) / 1000);
      durationSeconds = Math.max(durationSeconds, elapsed);
    }

    const completedSession = await this.repo.updateRevisionSession(
      sessionId,
      accountId,
      'completed',
      durationSeconds,
      session.pause_duration_seconds,
      timestamp,
      notes || session.notes,
      timestamp
    );

    // Update parent Revision Item
    const item = await this.findItemOrThrow(session.revision_item_id, accountId);
    const nextStage = item.revision_stage + 1;

    // Calculate next scheduled date
    const intervalDays = STAGE_INTERVALS_DAYS[Math.min(nextStage - 1, STAGE_INTERVALS_DAYS.length - 1)];
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + intervalDays);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const isFinalStage = nextStage > STAGE_INTERVALS_DAYS.length;
    const newStatus = isFinalStage ? 'completed' : 'scheduled';

    await this.repo.updateRevisionItem(
      item.id,
      accountId,
      nextDateStr,
      undefined,
      undefined,
      newStatus,
      timestamp
    );

    // Additional update fields: stage, count, last_revision_at
    await this.repo.logItemAction(crypto.randomUUID(), item.id, accountId, 'session_completed', item.status, newStatus, timestamp);

    return {
      session: this.mapSessionToDTO(completedSession!),
      item: this.mapItemToDTO((await this.repo.findRevisionItemById(item.id, accountId))!),
    };
  }

  async cancelRevisionSession(accountId: string, sessionId: string, now: Date = new Date()): Promise<RevisionSessionDTO> {
    const session = await this.findSessionOrThrow(sessionId, accountId);
    const timestamp = now.toISOString();

    const cancelledSession = await this.repo.updateRevisionSession(
      sessionId,
      accountId,
      'cancelled',
      session.duration_seconds,
      session.pause_duration_seconds,
      timestamp,
      session.notes,
      timestamp
    );

    // Revert parent item status back to scheduled
    const item = await this.repo.findRevisionItemById(session.revision_item_id, accountId);
    if (item && item.status === 'in_progress') {
      await this.repo.updateRevisionItem(item.id, accountId, undefined, undefined, undefined, 'scheduled', timestamp);
    }

    return this.mapSessionToDTO(cancelledSession!);
  }

  private async findItemOrThrow(id: string, accountId: string): Promise<RevisionItemRecord> {
    const item = await this.repo.findRevisionItemById(id, accountId);
    if (!item) {
      throw new Error('REVISION_ITEM_NOT_FOUND');
    }
    return item;
  }

  private async findSessionOrThrow(id: string, accountId: string): Promise<RevisionSessionRecord> {
    const sess = await this.repo.findRevisionSessionById(id, accountId);
    if (!sess) {
      throw new Error('REVISION_SESSION_NOT_FOUND');
    }
    return sess;
  }

  private mapItemToDTO(record: RevisionItemRecord): RevisionItemDTO {
    return {
      id: record.id,
      accountId: record.account_id,
      subjectId: record.subject_id,
      chapterId: record.chapter_id,
      originatingStudySessionId: record.originating_study_session_id,
      scheduledDate: record.scheduled_date,
      revisionStage: record.revision_stage,
      status: record.status,
      priority: record.priority,
      notes: record.notes,
      totalRevisionCount: record.total_revision_count,
      retentionScore: record.retention_score,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      lastRevisionAt: record.last_revision_at,
      completedAt: record.completed_at,
    };
  }

  private mapSessionToDTO(record: RevisionSessionRecord): RevisionSessionDTO {
    return {
      id: record.id,
      accountId: record.account_id,
      revisionItemId: record.revision_item_id,
      subjectId: record.subject_id,
      chapterId: record.chapter_id,
      startTime: record.start_time,
      endTime: record.end_time,
      durationSeconds: record.duration_seconds,
      pauseDurationSeconds: record.pause_duration_seconds,
      revisionStage: record.revision_stage,
      status: record.status,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
