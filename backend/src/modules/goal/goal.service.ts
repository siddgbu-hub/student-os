import { GoalRepository } from '../../db/goal.repository.js';
import {
  GoalProgressDTO,
  CreateGoalInput,
  UpdateGoalInput,
  GoalBadgeStatus,
} from '@student-os/shared';

export class GoalService {
  constructor(private repo: GoalRepository) {}

  async getActiveGoalProgress(accountId: string, now: Date = new Date()): Promise<GoalProgressDTO | null> {
    const goal = await this.repo.getActiveGoal(accountId);
    if (!goal) return null;

    const todayStr = now.toISOString().split('T')[0];
    const examDateTs = new Date(`${goal.examDate}T23:59:59.999Z`).getTime();
    const todayTs = new Date(`${todayStr}T00:00:00.000Z`).getTime();

    const diffMs = Math.max(0, examDateTs - todayTs);
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const weeksRemaining = Math.ceil(daysRemaining / 7);
    const monthsRemaining = Math.ceil(daysRemaining / 30);

    const createdDateStr = goal.createdAt ? goal.createdAt.split('T')[0] : todayStr;
    const createdDateTs = new Date(`${createdDateStr}T00:00:00.000Z`).getTime();
    const daysElapsed = Math.max(0, Math.floor((todayTs - createdDateTs) / (1000 * 60 * 60 * 24)));

    const [studyMinutesCompleted, todayStudyMinutesCompleted] = await Promise.all([
      this.repo.getCompletedStudyMinutesTotal(accountId),
      this.repo.getTodayCompletedStudyMinutes(accountId, todayStr),
    ]);

    const totalPlannedDays = Math.max(1, daysElapsed + daysRemaining);
    const totalRequiredStudyMins = totalPlannedDays * goal.targetDailyMinutes;
    const studyMinutesRemaining = Math.max(0, totalRequiredStudyMins - studyMinutesCompleted);

    const targetChapters = goal.targetTotalChapters || 0;
    const completedChapters = goal.completedChapters || 0;
    const remainingChapters = Math.max(0, targetChapters - completedChapters);

    const requiredMinutesPerDay = Math.max(
      0,
      Math.ceil(studyMinutesRemaining / daysRemaining)
    );
    const requiredChaptersPerDay =
      remainingChapters > 0 ? Number((remainingChapters / daysRemaining).toFixed(2)) : 0;

    // Calculate Projected Completion Date based on current daily study rate
    const currentDailyPaceMins = Math.max(1, todayStudyMinutesCompleted > 0 ? todayStudyMinutesCompleted : goal.targetDailyMinutes);
    const daysNeededForRemaining = Math.ceil(studyMinutesRemaining / currentDailyPaceMins);
    const projectedDate = new Date(now);
    projectedDate.setDate(projectedDate.getDate() + daysNeededForRemaining);
    const projectedCompletionDate = projectedDate.toISOString().split('T')[0];

    // Status Badge Calculation: NOT_STARTED, ON_TRACK, AT_RISK, BEHIND, COMPLETED
    let statusBadge: GoalBadgeStatus = 'NOT_STARTED';

    const isCompleted =
      goal.status === 'completed' ||
      (targetChapters > 0 && completedChapters >= targetChapters);

    if (isCompleted) {
      statusBadge = 'COMPLETED';
    } else if (studyMinutesCompleted === 0 && completedChapters === 0) {
      // 1. NOT_STARTED: No study activity or chapter progress yet
      statusBadge = 'NOT_STARTED';
    } else if (daysElapsed < 2) {
      // 2. Newly created goal grace period (Day 0 & Day 1)
      if (studyMinutesCompleted >= 15 || completedChapters > 0 || todayStudyMinutesCompleted > 0) {
        statusBadge = 'ON_TRACK';
      } else {
        statusBadge = 'NOT_STARTED';
      }
    } else {
      // 3. Multi-day established goal (daysElapsed >= 2): evaluate pace against expected progress
      const expectedStudyMinutes = daysElapsed * goal.targetDailyMinutes;
      const minuteRatio = expectedStudyMinutes > 0 ? studyMinutesCompleted / expectedStudyMinutes : 1.0;

      const expectedChapters = totalPlannedDays > 0 ? (daysElapsed / totalPlannedDays) * targetChapters : 0;
      const chapterRatio = expectedChapters > 0 ? completedChapters / expectedChapters : 1.0;

      const effectivePace = targetChapters > 0 ? Math.max(minuteRatio, chapterRatio) : minuteRatio;

      if (
        todayStudyMinutesCompleted >= goal.targetDailyMinutes ||
        effectivePace >= 0.80
      ) {
        statusBadge = 'ON_TRACK';
      } else if (effectivePace >= 0.50) {
        statusBadge = 'AT_RISK';
      } else {
        statusBadge = 'BEHIND';
      }
    }

    return {
      goal,
      daysRemaining,
      weeksRemaining,
      monthsRemaining,
      studyMinutesCompleted,
      studyMinutesRemaining,
      completedChapters,
      remainingChapters,
      requiredMinutesPerDay,
      requiredChaptersPerDay,
      projectedCompletionDate,
      todayStudyMinutesCompleted,
      statusBadge,
    };
  }

  async createGoal(accountId: string, input: CreateGoalInput): Promise<GoalProgressDTO> {
    await this.repo.createGoal(accountId, input);
    const progress = await this.getActiveGoalProgress(accountId);
    return progress!;
  }

  async updateGoal(accountId: string, input: UpdateGoalInput): Promise<GoalProgressDTO | null> {
    const active = await this.repo.getActiveGoal(accountId);
    if (!active) return null;

    await this.repo.updateGoal(active.id, accountId, input);
    return await this.getActiveGoalProgress(accountId);
  }

  async deleteActiveGoal(accountId: string): Promise<void> {
    const active = await this.repo.getActiveGoal(accountId);
    if (active) {
      await this.repo.deleteGoal(active.id, accountId);
    }
  }
}
