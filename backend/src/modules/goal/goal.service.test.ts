import { describe, it, expect, vi } from 'vitest';
import { GoalService } from './goal.service.js';
import { GoalRepository } from '../../db/goal.repository.js';
import { ExamGoalDTO } from '@student-os/shared';

describe('GoalService — 5-State Goal Status UX & Progress Calculations', () => {
  const accountId = 'acc-test-123';

  function createMockRepo(goal: ExamGoalDTO | null, totalMinutes: number, todayMinutes: number) {
    return {
      getActiveGoal: vi.fn().mockResolvedValue(goal),
      getCompletedStudyMinutesTotal: vi.fn().mockResolvedValue(totalMinutes),
      getTodayCompletedStudyMinutes: vi.fn().mockResolvedValue(todayMinutes),
      createGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn(),
    } as unknown as GoalRepository;
  }

  it('1. Newly created goal with 0% progress is NOT_STARTED (not BEHIND)', async () => {
    const today = new Date('2026-08-14T12:00:00.000Z');
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-12-02', // ~110 days remaining
      targetDailyMinutes: 120,
      targetTotalChapters: 50,
      completedChapters: 0,
      status: 'active',
      createdAt: '2026-08-14T10:00:00.000Z', // created today
      updatedAt: '2026-08-14T10:00:00.000Z',
    };

    const repo = createMockRepo(goal, 0, 0);
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress).not.toBeNull();
    expect(progress?.statusBadge).toBe('NOT_STARTED');
    expect(progress?.completedChapters).toBe(0);
    expect(progress?.remainingChapters).toBe(50);
    expect(progress?.daysRemaining).toBeGreaterThanOrEqual(110);
  });

  it('2. Newly created goal with initial activity on Day 0 is ON_TRACK', async () => {
    const today = new Date('2026-08-14T12:00:00.000Z');
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-12-02',
      targetDailyMinutes: 120,
      targetTotalChapters: 50,
      completedChapters: 1, // 1 chapter done
      status: 'active',
      createdAt: '2026-08-14T10:00:00.000Z',
      updatedAt: '2026-08-14T10:00:00.000Z',
    };

    const repo = createMockRepo(goal, 45, 45); // 45 mins studied today
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress?.statusBadge).toBe('ON_TRACK');
  });

  it('3. Established goal (10 days elapsed) aligned with expected pace is ON_TRACK', async () => {
    const today = new Date('2026-08-24T12:00:00.000Z'); // 10 days after creation
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-12-02',
      targetDailyMinutes: 120,
      targetTotalChapters: 50,
      completedChapters: 5,
      status: 'active',
      createdAt: '2026-08-14T10:00:00.000Z',
      updatedAt: '2026-08-14T10:00:00.000Z',
    };

    // Expected minutes in 10 days = 1200 mins. User studied 1100 mins (>80%).
    const repo = createMockRepo(goal, 1100, 60);
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress?.statusBadge).toBe('ON_TRACK');
  });

  it('4. Established goal (10 days elapsed) moderately below expected pace is AT_RISK', async () => {
    const today = new Date('2026-08-24T12:00:00.000Z'); // 10 days after creation
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-12-02',
      targetDailyMinutes: 120,
      targetTotalChapters: 50,
      completedChapters: 2,
      status: 'active',
      createdAt: '2026-08-14T10:00:00.000Z',
      updatedAt: '2026-08-14T10:00:00.000Z',
    };

    // Expected minutes = 1200 mins. User studied 700 mins (58% of expected, between 50% and 80%).
    const repo = createMockRepo(goal, 700, 20);
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress?.statusBadge).toBe('AT_RISK');
  });

  it('5. Established goal (10 days elapsed) with significant sustained deficit is BEHIND', async () => {
    const today = new Date('2026-08-24T12:00:00.000Z'); // 10 days after creation
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-12-02',
      targetDailyMinutes: 120,
      targetTotalChapters: 50,
      completedChapters: 0,
      status: 'active',
      createdAt: '2026-08-14T10:00:00.000Z',
      updatedAt: '2026-08-14T10:00:00.000Z',
    };

    // Expected minutes = 1200 mins. User studied only 150 mins (<50%).
    const repo = createMockRepo(goal, 150, 0);
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress?.statusBadge).toBe('BEHIND');
  });

  it('6. Completed goal when chapters reached is COMPLETED', async () => {
    const today = new Date('2026-08-24T12:00:00.000Z');
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-12-02',
      targetDailyMinutes: 120,
      targetTotalChapters: 50,
      completedChapters: 50, // All 50 completed!
      status: 'active',
      createdAt: '2026-08-14T10:00:00.000Z',
      updatedAt: '2026-08-14T10:00:00.000Z',
    };

    const repo = createMockRepo(goal, 6000, 0);
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress?.statusBadge).toBe('COMPLETED');
    expect(progress?.remainingChapters).toBe(0);
  });

  it('7. Completed goal when status is "completed" is COMPLETED', async () => {
    const today = new Date('2026-08-24T12:00:00.000Z');
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-12-02',
      targetDailyMinutes: 120,
      targetTotalChapters: 50,
      completedChapters: 30,
      status: 'completed',
      createdAt: '2026-08-14T10:00:00.000Z',
      updatedAt: '2026-08-14T10:00:00.000Z',
    };

    const repo = createMockRepo(goal, 4000, 0);
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress?.statusBadge).toBe('COMPLETED');
  });

  it('8. Target-date and remaining metrics calculations remain accurate', async () => {
    const today = new Date('2026-08-14T00:00:00.000Z');
    const goal: ExamGoalDTO = {
      id: 'goal-1',
      accountId,
      examName: 'NET JRF',
      examDate: '2026-08-24', // 10 days remaining
      targetDailyMinutes: 100,
      targetTotalChapters: 20,
      completedChapters: 5,
      status: 'active',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    };

    const repo = createMockRepo(goal, 0, 0);
    const service = new GoalService(repo);

    const progress = await service.getActiveGoalProgress(accountId, today);

    expect(progress?.daysRemaining).toBe(11);
    expect(progress?.remainingChapters).toBe(15);
    expect(progress?.studyMinutesRemaining).toBe(1100);
    expect(progress?.requiredMinutesPerDay).toBe(100);
    expect(progress?.requiredChaptersPerDay).toBe(1.36);
    expect(progress?.projectedCompletionDate).toBeDefined();
  });
});
