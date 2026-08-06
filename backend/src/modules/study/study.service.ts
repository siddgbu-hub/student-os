import { StudyRepository, SubjectRecord, ChapterRecord, StudySessionRecord } from '../../db/study.repository.js';
import { RevisionRepository } from '../../db/revision.repository.js';
import { RevisionService } from '../revision/revision.service.js';
import { SubjectDTO, ChapterDTO, StudySessionDTO, TodaySessionsSummaryDTO } from '@student-os/shared';

export class StudyService {
  constructor(private repo: StudyRepository, private revisionRepo?: RevisionRepository) {}

  // --- SUBJECT SERVICE ---

  async createSubject(accountId: string, name: string, now: Date = new Date()): Promise<SubjectDTO> {
    const id = crypto.randomUUID();
    const timestamp = now.toISOString();
    const record = await this.repo.createSubject(id, accountId, name, timestamp);
    return this.mapSubjectToDTO(record);
  }

  async getSubjects(accountId: string): Promise<SubjectDTO[]> {
    const records = await this.repo.getSubjectsByAccount(accountId);
    return records.map((r) => this.mapSubjectToDTO(r));
  }

  async updateSubject(accountId: string, subjectId: string, name: string, now: Date = new Date()): Promise<SubjectDTO> {
    const existing = await this.repo.findSubjectById(subjectId, accountId);
    if (!existing) {
      throw new Error('SUBJECT_NOT_FOUND');
    }
    const updated = await this.repo.updateSubject(subjectId, accountId, name, now.toISOString());
    if (!updated) {
      throw new Error('SUBJECT_NOT_FOUND');
    }
    return this.mapSubjectToDTO(updated);
  }

  async deleteSubject(accountId: string, subjectId: string): Promise<void> {
    const existing = await this.repo.findSubjectById(subjectId, accountId);
    if (!existing) {
      throw new Error('SUBJECT_NOT_FOUND');
    }
    await this.repo.deleteSubject(subjectId, accountId);
  }

  // --- CHAPTER SERVICE ---

  async createChapter(
    accountId: string,
    subjectId: string,
    name: string,
    orderIndex: number = 0,
    now: Date = new Date()
  ): Promise<ChapterDTO> {
    const subject = await this.repo.findSubjectById(subjectId, accountId);
    if (!subject) {
      throw new Error('SUBJECT_NOT_FOUND');
    }
    const id = crypto.randomUUID();
    const timestamp = now.toISOString();
    const record = await this.repo.createChapter(id, subjectId, accountId, name, orderIndex, timestamp);
    return this.mapChapterToDTO(record);
  }

  async getChapters(accountId: string, subjectId: string): Promise<ChapterDTO[]> {
    const subject = await this.repo.findSubjectById(subjectId, accountId);
    if (!subject) {
      throw new Error('SUBJECT_NOT_FOUND');
    }
    const records = await this.repo.getChaptersBySubject(subjectId, accountId);
    return records.map((r) => this.mapChapterToDTO(r));
  }

  async updateChapter(
    accountId: string,
    chapterId: string,
    name?: string,
    orderIndex?: number,
    isCompleted?: boolean,
    now: Date = new Date()
  ): Promise<ChapterDTO> {
    const existing = await this.repo.findChapterById(chapterId, accountId);
    if (!existing) {
      throw new Error('CHAPTER_NOT_FOUND');
    }
    const updated = await this.repo.updateChapter(chapterId, accountId, name, orderIndex, isCompleted, now.toISOString());
    if (!updated) {
      throw new Error('CHAPTER_NOT_FOUND');
    }
    return this.mapChapterToDTO(updated);
  }

  async deleteChapter(accountId: string, chapterId: string): Promise<void> {
    const existing = await this.repo.findChapterById(chapterId, accountId);
    if (!existing) {
      throw new Error('CHAPTER_NOT_FOUND');
    }
    await this.repo.deleteChapter(chapterId, accountId);
  }

  // --- STUDY SESSION SERVICE ---

  async startSession(
    accountId: string,
    subjectId: string,
    chapterId?: string | null,
    now: Date = new Date()
  ): Promise<StudySessionDTO> {
    // 1. Validate Subject existence
    const subject = await this.repo.findSubjectById(subjectId, accountId);
    if (!subject) {
      throw new Error('SUBJECT_NOT_FOUND');
    }

    // 2. Validate Chapter if specified
    if (chapterId) {
      const chapter = await this.repo.findChapterById(chapterId, accountId);
      if (!chapter || chapter.subject_id !== subjectId) {
        throw new Error('CHAPTER_NOT_FOUND');
      }
    }

    // 3. Enforce single active session rule
    const active = await this.repo.findActiveSessionByAccount(accountId);
    if (active) {
      throw new Error('STUDY_ACTIVE_SESSION_EXISTS');
    }

    const id = crypto.randomUUID();
    const timestamp = now.toISOString();
    const record = await this.repo.createSession(id, accountId, subjectId, chapterId || null, timestamp, timestamp);
    return this.mapSessionToDTO(record);
  }

  async pauseSession(accountId: string, sessionId: string, now: Date = new Date()): Promise<StudySessionDTO> {
    const session = await this.repo.findSessionById(sessionId, accountId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }
    if (session.status !== 'running') {
      throw new Error('SESSION_NOT_RUNNING');
    }

    const timestamp = now.toISOString();
    const lastUpdate = new Date(session.updated_at).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - lastUpdate) / 1000));
    const newDuration = session.duration_seconds + elapsedSeconds;

    const updated = await this.repo.updateSessionState(
      sessionId,
      accountId,
      'paused',
      newDuration,
      session.pause_duration_seconds,
      null,
      timestamp
    );

    return this.mapSessionToDTO(updated!);
  }

  async resumeSession(accountId: string, sessionId: string, now: Date = new Date()): Promise<StudySessionDTO> {
    const session = await this.repo.findSessionById(sessionId, accountId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }
    if (session.status !== 'paused') {
      throw new Error('SESSION_NOT_PAUSED');
    }

    const timestamp = now.toISOString();
    const lastUpdate = new Date(session.updated_at).getTime();
    const pauseElapsed = Math.max(0, Math.floor((now.getTime() - lastUpdate) / 1000));
    const newPauseDuration = session.pause_duration_seconds + pauseElapsed;

    const updated = await this.repo.updateSessionState(
      sessionId,
      accountId,
      'running',
      session.duration_seconds,
      newPauseDuration,
      null,
      timestamp
    );

    return this.mapSessionToDTO(updated!);
  }

  async endSession(accountId: string, sessionId: string, now: Date = new Date()): Promise<StudySessionDTO> {
    const session = await this.repo.findSessionById(sessionId, accountId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }
    if (session.status !== 'running' && session.status !== 'paused') {
      throw new Error('SESSION_ALREADY_FINISHED');
    }

    const timestamp = now.toISOString();
    let finalDuration = session.duration_seconds;
    let finalPauseDuration = session.pause_duration_seconds;

    const lastUpdate = new Date(session.updated_at).getTime();
    const elapsed = Math.max(0, Math.floor((now.getTime() - lastUpdate) / 1000));

    if (session.status === 'running') {
      finalDuration += elapsed;
    } else {
      finalPauseDuration += elapsed;
    }

    const updated = await this.repo.updateSessionState(
      sessionId,
      accountId,
      'completed',
      finalDuration,
      finalPauseDuration,
      timestamp,
      timestamp
    );

    if (this.revisionRepo && updated) {
      try {
        const revService = new RevisionService(this.revisionRepo, this.repo);
        await revService.createRevisionFromCompletedSession(accountId, updated.id, updated.subject_id, updated.chapter_id, now);
      } catch (e) {
        console.error('Failed to auto-create revision item:', e);
      }
    }

    return this.mapSessionToDTO(updated!);
  }

  async cancelSession(accountId: string, sessionId: string, now: Date = new Date()): Promise<StudySessionDTO> {
    const session = await this.repo.findSessionById(sessionId, accountId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const timestamp = now.toISOString();
    const updated = await this.repo.updateSessionState(
      sessionId,
      accountId,
      'cancelled',
      session.duration_seconds,
      session.pause_duration_seconds,
      timestamp,
      timestamp
    );

    return this.mapSessionToDTO(updated!);
  }

  async getActiveSession(accountId: string): Promise<StudySessionDTO | null> {
    const record = await this.repo.findActiveSessionByAccount(accountId);
    return record ? this.mapSessionToDTO(record) : null;
  }

  async getTodaySessions(accountId: string, now: Date = new Date()): Promise<TodaySessionsSummaryDTO> {
    const dateStr = now.toISOString().split('T')[0];
    const startDate = new Date(`${dateStr}T00:00:00.000Z`).toISOString();
    const endDate = new Date(`${dateStr}T23:59:59.999Z`).toISOString();

    const records = await this.repo.getSessionsByAccountAndDate(accountId, startDate, endDate);
    const dtos = records.map((r) => this.mapSessionToDTO(r));
    const completed = dtos.filter((s) => s.status === 'completed');
    const totalDurationSeconds = completed.reduce((sum, s) => sum + s.durationSeconds, 0);

    return {
      date: dateStr,
      totalDurationSeconds,
      completedSessionsCount: completed.length,
      sessions: dtos,
    };
  }

  // --- PRIVATE MAPPERS ---

  private mapSubjectToDTO(record: SubjectRecord): SubjectDTO {
    return {
      id: record.id,
      accountId: record.account_id,
      name: record.name,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private mapChapterToDTO(record: ChapterRecord): ChapterDTO {
    return {
      id: record.id,
      subjectId: record.subject_id,
      accountId: record.account_id,
      name: record.name,
      orderIndex: record.order_index,
      isCompleted: record.is_completed === 1,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private mapSessionToDTO(record: StudySessionRecord): StudySessionDTO {
    return {
      id: record.id,
      accountId: record.account_id,
      subjectId: record.subject_id,
      chapterId: record.chapter_id,
      startTime: record.start_time,
      endTime: record.end_time,
      durationSeconds: record.duration_seconds,
      pauseDurationSeconds: record.pause_duration_seconds,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
