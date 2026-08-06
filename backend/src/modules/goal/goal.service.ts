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

    const [studyMinutesCompleted, todayStudyMinutesCompleted] = await Promise.all([
      this.repo.getCompletedStudyMinutesTotal(accountId),
      this.repo.getTodayCompletedStudyMinutes(accountId, todayStr),
    ]);

    const totalRequiredStudyMins = daysRemaining * goal.targetDailyMinutes;
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

    // Status Badge Calculation (ON_TRACK, BEHIND, AHEAD)
    let statusBadge: GoalBadgeStatus = 'ON_TRACK';
    if (todayStudyMinutesCompleted >= goal.targetDailyMinutes) {
      statusBadge = 'AHEAD';
    } else if (todayStudyMinutesCompleted >= goal.targetDailyMinutes * 0.7) {
      statusBadge = 'ON_TRACK';
    } else {
      statusBadge = 'BEHIND';
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
