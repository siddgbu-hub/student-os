import { AnalyticsRepository } from '../../db/analytics.repository.js';
import {
  TimePeriod,
  AnalyticsDashboardDTO,
  LearningSummaryDTO,
  ProductivitySummaryDTO,
  SubjectAnalyticsDTO,
  TrendDataPointDTO,
  RevisionAnalyticsDTO,
  PlannerAnalyticsDTO,
} from '@student-os/shared';

export class AnalyticsService {
  constructor(private repo: AnalyticsRepository) {}

  async getDashboardAnalytics(accountId: string, period: TimePeriod = 'this_week', now: Date = new Date()): Promise<AnalyticsDashboardDTO> {
    const { startDateStr, endDateStr, daysCount } = this.calculateDateRange(period, now);

    const [studySessions, revisionSessions, plannerTasks, revisionItems, activeDates] = await Promise.all([
      this.repo.getStudySessions(accountId, startDateStr, endDateStr),
      this.repo.getRevisionSessions(accountId, startDateStr, endDateStr),
      this.repo.getPlannerTasks(accountId, startDateStr, endDateStr),
      this.repo.getRevisionItems(accountId),
      this.repo.getAllActiveDates(accountId),
    ]);

    // 1. Learning Summary
    const totalStudyTimeMinutes = Math.round(
      studySessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60
    );
    const totalRevisionTimeMinutes = Math.round(
      revisionSessions.reduce((acc, r) => acc + r.duration_seconds, 0) / 60
    );
    const totalFocusTimeMinutes = totalStudyTimeMinutes + totalRevisionTimeMinutes;
    const studySessionsCompleted = studySessions.length;
    const revisionSessionsCompleted = revisionSessions.length;
    const tasksCompleted = plannerTasks.filter((t) => t.status === 'completed').length;

    const learningSummary: LearningSummaryDTO = {
      totalStudyTimeMinutes,
      totalRevisionTimeMinutes,
      totalFocusTimeMinutes,
      studySessionsCompleted,
      revisionSessionsCompleted,
      tasksCompleted,
    };

    // 2. Productivity Summary & Streaks
    const { currentStreakDays, longestStreakDays } = this.calculateStreaks(activeDates, now);
    const dailyAverageStudyMinutes = Math.round(totalFocusTimeMinutes / (daysCount || 1));
    const weeklyAverageStudyMinutes = Math.round((totalFocusTimeMinutes / (daysCount || 1)) * 7);

    const totalPlannedTasks = plannerTasks.length;
    const plannerCompletionRate = totalPlannedTasks > 0 ? Math.round((tasksCompleted / totalPlannedTasks) * 100) : 100;

    const totalRevItemsDue = revisionItems.filter((r) => r.status === 'due_today' || r.status === 'overdue' || r.status === 'completed').length;
    const completedRevItems = revisionItems.filter((r) => r.status === 'completed').length;
    const revisionCompletionRate = totalRevItemsDue > 0 ? Math.round((completedRevItems / totalRevItemsDue) * 100) : 100;

    const productivitySummary: ProductivitySummaryDTO = {
      dailyAverageStudyMinutes,
      weeklyAverageStudyMinutes,
      currentStreakDays,
      longestStreakDays,
      plannerCompletionRate,
      revisionCompletionRate,
    };

    // 3. Subject Performance Breakdown
    const subjectMap = new Map<
      string,
      {
        id: string;
        name: string;
        studyMins: number;
        revisionMins: number;
        completedTasks: number;
        pendingTasks: number;
        scores: number[];
      }
    >();

    studySessions.forEach((s) => {
      const entry = subjectMap.get(s.subject_id) || {
        id: s.subject_id,
        name: s.subject_name,
        studyMins: 0,
        revisionMins: 0,
        completedTasks: 0,
        pendingTasks: 0,
        scores: [],
      };
      entry.studyMins += Math.round(s.duration_seconds / 60);
      subjectMap.set(s.subject_id, entry);
    });

    revisionSessions.forEach((r) => {
      const entry = subjectMap.get(r.subject_id) || {
        id: r.subject_id,
        name: r.subject_name,
        studyMins: 0,
        revisionMins: 0,
        completedTasks: 0,
        pendingTasks: 0,
        scores: [],
      };
      entry.revisionMins += Math.round(r.duration_seconds / 60);
      subjectMap.set(r.subject_id, entry);
    });

    plannerTasks.forEach((t) => {
      const entry = subjectMap.get(t.subject_id) || {
        id: t.subject_id,
        name: t.subject_name,
        studyMins: 0,
        revisionMins: 0,
        completedTasks: 0,
        pendingTasks: 0,
        scores: [],
      };
      if (t.status === 'completed') entry.completedTasks++;
      else entry.pendingTasks++;
      subjectMap.set(t.subject_id, entry);
    });

    revisionItems.forEach((ri) => {
      const entry = subjectMap.get(ri.subject_id);
      if (entry) {
        entry.scores.push(ri.retention_score);
      }
    });

    const subjectAnalytics: SubjectAnalyticsDTO[] = Array.from(subjectMap.values()).map((s) => {
      const totalMins = s.studyMins + s.revisionMins;
      const sharePercentage = totalFocusTimeMinutes > 0 ? Math.round((totalMins / totalFocusTimeMinutes) * 100) : 0;
      const avgScore = s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 100;

      return {
        subjectId: s.id,
        subjectName: s.name,
        studyTimeMinutes: s.studyMins,
        revisionTimeMinutes: s.revisionMins,
        totalTimeMinutes: totalMins,
        sharePercentage,
        completedTasksCount: s.completedTasks,
        pendingTasksCount: s.pendingTasks,
        retentionScore: avgScore,
      };
    });

    subjectAnalytics.sort((a, b) => b.totalTimeMinutes - a.totalTimeMinutes);

    // 4. Learning Trends
    const trends = this.generateTrendPoints(startDateStr, daysCount, studySessions, revisionSessions, plannerTasks);

    // 5. Revision Analytics
    const dueTodayCount = revisionItems.filter((r) => r.status === 'due_today').length;
    const overdueCount = revisionItems.filter((r) => r.status === 'overdue').length;
    const completedCount = revisionItems.filter((r) => r.status === 'completed').length;
    const retentionScores = revisionItems.map((r) => r.retention_score);
    const retentionScoreAverage =
      retentionScores.length > 0 ? Math.round(retentionScores.reduce((a, b) => a + b, 0) / retentionScores.length) : 100;

    const revisionAnalytics: RevisionAnalyticsDTO = {
      dueTodayCount,
      overdueCount,
      completedCount,
      revisionCompletionRate,
      averageRevisionDelayDays: 0,
      retentionScoreAverage,
    };

    // 6. Planner Analytics
    const plannedDurationMinutes = plannerTasks.reduce((acc, t) => acc + t.estimated_duration_minutes, 0);
    const completedDurationMinutes = plannerTasks
      .filter((t) => t.status === 'completed')
      .reduce((acc, t) => acc + t.estimated_duration_minutes, 0);

    const accuracyPercentage =
      plannedDurationMinutes > 0 ? Math.round((completedDurationMinutes / plannedDurationMinutes) * 100) : 100;

    const plannerAnalytics: PlannerAnalyticsDTO = {
      plannedDurationMinutes,
      completedDurationMinutes,
      accuracyPercentage,
      deferredTasksCount: plannerTasks.filter((t) => t.status === 'deferred').length,
      cancelledTasksCount: plannerTasks.filter((t) => t.status === 'cancelled').length,
    };

    return {
      period,
      startDate: startDateStr,
      endDate: endDateStr,
      learningSummary,
      productivitySummary,
      subjectAnalytics,
      trends,
      revisionAnalytics,
      plannerAnalytics,
    };
  }

  private calculateDateRange(period: TimePeriod, now: Date): { startDateStr: string; endDateStr: string; daysCount: number } {
    const end = new Date(now);
    const start = new Date(now);
    let daysCount = 7;

    if (period === 'today') {
      daysCount = 1;
    } else if (period === 'this_week') {
      daysCount = 7;
      start.setDate(start.getDate() - 6);
    } else if (period === 'this_month') {
      daysCount = 30;
      start.setDate(start.getDate() - 29);
    } else if (period === 'this_year') {
      daysCount = 365;
      start.setDate(start.getDate() - 364);
    }

    return {
      startDateStr: start.toISOString().split('T')[0],
      endDateStr: end.toISOString().split('T')[0],
      daysCount,
    };
  }

  private calculateStreaks(activeDates: string[], now: Date): { currentStreakDays: number; longestStreakDays: number } {
    if (activeDates.length === 0) {
      return { currentStreakDays: 0, longestStreakDays: 0 };
    }

    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const activeSet = new Set(activeDates);

    let currentStreakDays = 0;
    let checkDate = new Date(now);
    if (!activeSet.has(todayStr) && activeSet.has(yesterdayStr)) {
      checkDate = yesterday;
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (activeSet.has(dStr)) {
        currentStreakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    const sortedDates = [...activeDates].sort();
    let longestStreakDays = 0;
    let tempStreak = 0;
    let prevTimestamp: number | null = null;

    sortedDates.forEach((dStr) => {
      const ts = new Date(dStr).getTime();
      if (prevTimestamp === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((ts - prevTimestamp) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTimestamp = ts;
      if (tempStreak > longestStreakDays) {
        longestStreakDays = tempStreak;
      }
    });

    return { currentStreakDays, longestStreakDays: Math.max(longestStreakDays, currentStreakDays) };
  }

  private generateTrendPoints(
    startDateStr: string,
    daysCount: number,
    studySessions: Array<{ start_time: string; duration_seconds: number }>,
    revisionSessions: Array<{ start_time: string; duration_seconds: number }>,
    plannerTasks: Array<{ planned_date: string; status: string }>
  ): TrendDataPointDTO[] {
    const points: TrendDataPointDTO[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < Math.min(daysCount, 30); i++) {
      const d = new Date(startDateStr);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const label = daysCount <= 7 ? dayNames[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`;

      const dayStudyMins = Math.round(
        studySessions
          .filter((s) => s.start_time.startsWith(dStr))
          .reduce((acc, s) => acc + s.duration_seconds, 0) / 60
      );

      const dayRevMins = Math.round(
        revisionSessions
          .filter((r) => r.start_time.startsWith(dStr))
          .reduce((acc, r) => acc + r.duration_seconds, 0) / 60
      );

      const dayTasks = plannerTasks.filter((t) => t.planned_date === dStr && t.status === 'completed').length;

      points.push({
        date: dStr,
        label,
        studyMinutes: dayStudyMins,
        revisionMinutes: dayRevMins,
        tasksCompleted: dayTasks,
      });
    }

    return points;
  }
}
