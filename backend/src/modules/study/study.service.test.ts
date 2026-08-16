import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyService } from './study.service.js';
import type { StudyRepository } from '../../db/study.repository.js';

describe('StudyService — Idempotency & Lifecycle Tests', () => {
  let service: StudyService;
  let mockRepo: Partial<StudyRepository>;

  const accountId = 'test-account-123';
  const sessionId = 'test-session-456';
  const subjectId = 'test-subject-789';

  beforeEach(() => {
    mockRepo = {
      findSubjectById: vi.fn(),
      findChapterById: vi.fn(),
      createSession: vi.fn(),
      findSessionById: vi.fn(),
      updateSessionState: vi.fn(),
      findActiveSessionByAccount: vi.fn(),
    };
    service = new StudyService(mockRepo as StudyRepository);
  });

  it('1. endSession completes a running session normally', async () => {
    const runningSession = {
      id: sessionId,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: null,
      start_time: '2026-08-15T10:00:00.000Z',
      end_time: null,
      duration_seconds: 600,
      pause_duration_seconds: 0,
      status: 'running',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:10:00.000Z',
    };

    const completedSession = {
      ...runningSession,
      status: 'completed',
      duration_seconds: 900,
      end_time: '2026-08-15T10:15:00.000Z',
      updated_at: '2026-08-15T10:15:00.000Z',
    };

    mockRepo.findSessionById = vi.fn().mockResolvedValue(runningSession);
    mockRepo.updateSessionState = vi.fn().mockResolvedValue(completedSession);

    const now = new Date('2026-08-15T10:15:00.000Z');
    const result = await service.endSession(accountId, sessionId, now);

    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('completed');
    expect(result.durationSeconds).toBe(900);
    expect(mockRepo.updateSessionState).toHaveBeenCalledWith(
      sessionId,
      accountId,
      'completed',
      900,
      0,
      now.toISOString(),
      now.toISOString()
    );
  });

  it('2. endSession is IDEMPOTENT: repeated/retried call on already completed session returns 200/success without error', async () => {
    const completedSession = {
      id: sessionId,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: null,
      start_time: '2026-08-15T10:00:00.000Z',
      end_time: '2026-08-15T10:15:00.000Z',
      duration_seconds: 900,
      pause_duration_seconds: 0,
      status: 'completed',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:15:00.000Z',
    };

    mockRepo.findSessionById = vi.fn().mockResolvedValue(completedSession);

    const now = new Date('2026-08-15T10:20:00.000Z');
    const result = await service.endSession(accountId, sessionId, now);

    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('completed');
    expect(result.durationSeconds).toBe(900);
    // Did NOT call updateSessionState again
    expect(mockRepo.updateSessionState).not.toHaveBeenCalled();
  });

  it('3. pauseSession is IDEMPOTENT: repeated call on already paused session returns success', async () => {
    const pausedSession = {
      id: sessionId,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: null,
      start_time: '2026-08-15T10:00:00.000Z',
      end_time: null,
      duration_seconds: 600,
      pause_duration_seconds: 60,
      status: 'paused',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:10:00.000Z',
    };

    mockRepo.findSessionById = vi.fn().mockResolvedValue(pausedSession);

    const result = await service.pauseSession(accountId, sessionId);
    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('paused');
    expect(mockRepo.updateSessionState).not.toHaveBeenCalled();
  });

  it('4. resumeSession is IDEMPOTENT: repeated call on already running session returns success', async () => {
    const runningSession = {
      id: sessionId,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: null,
      start_time: '2026-08-15T10:00:00.000Z',
      end_time: null,
      duration_seconds: 600,
      pause_duration_seconds: 60,
      status: 'running',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:10:00.000Z',
    };

    mockRepo.findSessionById = vi.fn().mockResolvedValue(runningSession);

    const result = await service.resumeSession(accountId, sessionId);
    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('running');
    expect(mockRepo.updateSessionState).not.toHaveBeenCalled();
  });

  it('5. cancelSession is IDEMPOTENT: repeated call on already cancelled session returns success', async () => {
    const cancelledSession = {
      id: sessionId,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: null,
      start_time: '2026-08-15T10:00:00.000Z',
      end_time: null,
      duration_seconds: 600,
      pause_duration_seconds: 0,
      status: 'cancelled',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:10:00.000Z',
    };

    mockRepo.findSessionById = vi.fn().mockResolvedValue(cancelledSession);

    const result = await service.cancelSession(accountId, sessionId);
    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('cancelled');
    expect(mockRepo.updateSessionState).not.toHaveBeenCalled();
  });

  it('6. endSession completes a paused session normally', async () => {
    const pausedSession = {
      id: sessionId,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: null,
      start_time: '2026-08-15T10:00:00.000Z',
      end_time: null,
      duration_seconds: 600,
      pause_duration_seconds: 60,
      status: 'paused',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:10:00.000Z',
    };

    const completedSession = {
      ...pausedSession,
      status: 'completed',
      end_time: '2026-08-15T10:12:00.000Z',
      updated_at: '2026-08-15T10:12:00.000Z',
    };

    mockRepo.findSessionById = vi.fn().mockResolvedValue(pausedSession);
    mockRepo.updateSessionState = vi.fn().mockResolvedValue(completedSession);

    const now = new Date('2026-08-15T10:12:00.000Z');
    const result = await service.endSession(accountId, sessionId, now);

    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('completed');
    expect(mockRepo.updateSessionState).toHaveBeenCalled();
  });

  it('7. retry after successful completion returns completed session idempotently', async () => {
    const completedSession = {
      id: sessionId,
      account_id: accountId,
      subject_id: subjectId,
      chapter_id: null,
      start_time: '2026-08-15T10:00:00.000Z',
      end_time: '2026-08-15T10:15:00.000Z',
      duration_seconds: 900,
      pause_duration_seconds: 0,
      status: 'completed',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:15:00.000Z',
    };

    // Client timed out on first response, retrying 5 seconds later
    mockRepo.findSessionById = vi.fn().mockResolvedValue(completedSession);

    const retryNow = new Date('2026-08-15T10:15:05.000Z');
    const result = await service.endSession(accountId, sessionId, retryNow);

    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('completed');
    expect(mockRepo.updateSessionState).not.toHaveBeenCalled();
  });

  it('8. endSession throws SESSION_NOT_FOUND when session does not exist or belongs to another user (tenant isolation)', async () => {
    mockRepo.findSessionById = vi.fn().mockResolvedValue(null);

    await expect(service.endSession(accountId, 'foreign-or-nonexistent-session')).rejects.toThrow('SESSION_NOT_FOUND');
  });
});
