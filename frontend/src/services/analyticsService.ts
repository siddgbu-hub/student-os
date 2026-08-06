import { AnalyticsDashboardDTO, TimePeriod, SubjectAnalyticsDTO, TrendDataPointDTO } from '@student-os/shared';
import { API_BASE_URL as API_HOST } from '@/config/api';

const API_BASE_URL = `${API_HOST}/api/v1/analytics`;

class LocalStorageAdapter {
  private getStorageKey(key: string): string {
    return `student_os_offline_${key}`;
  }

  getItem<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(key));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(value));
    } catch {
      // Storage quota exceeded or disabled
    }
  }
}

const storage = new LocalStorageAdapter();

export class AnalyticsService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('student_os_session_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async getDashboardAnalytics(period: TimePeriod = 'this_week'): Promise<AnalyticsDashboardDTO> {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard?period=${encodeURIComponent(period)}`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch analytics dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        storage.setItem(`analytics_dashboard_${period}`, json.data);
        return json.data;
      }
      throw new Error(json.error || 'Failed to fetch analytics dashboard');
    } catch (err) {
      console.warn('Network request failed, retrieving cached analytics offline', err);
      const cached = storage.getItem<AnalyticsDashboardDTO>(`analytics_dashboard_${period}`);
      if (cached) return cached;

      // Return clean empty structure fallback if un-cached
      const nowStr = new Date().toISOString().split('T')[0];
      return {
        period,
        startDate: nowStr,
        endDate: nowStr,
        learningSummary: {
          totalStudyTimeMinutes: 0,
          totalRevisionTimeMinutes: 0,
          totalFocusTimeMinutes: 0,
          studySessionsCompleted: 0,
          revisionSessionsCompleted: 0,
          tasksCompleted: 0,
        },
        productivitySummary: {
          dailyAverageStudyMinutes: 0,
          weeklyAverageStudyMinutes: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          plannerCompletionRate: 100,
          revisionCompletionRate: 100,
        },
        subjectAnalytics: [],
        trends: [],
        revisionAnalytics: {
          dueTodayCount: 0,
          overdueCount: 0,
          completedCount: 0,
          revisionCompletionRate: 100,
          averageRevisionDelayDays: 0,
          retentionScoreAverage: 100,
        },
        plannerAnalytics: {
          plannedDurationMinutes: 0,
          completedDurationMinutes: 0,
          accuracyPercentage: 100,
          deferredTasksCount: 0,
          cancelledTasksCount: 0,
        },
      };
    }
  }

  static async getSubjectAnalytics(period: TimePeriod = 'this_week'): Promise<SubjectAnalyticsDTO[]> {
    const dashboard = await this.getDashboardAnalytics(period);
    return dashboard.subjectAnalytics;
  }

  static async getTrendAnalytics(period: TimePeriod = 'this_week'): Promise<TrendDataPointDTO[]> {
    const dashboard = await this.getDashboardAnalytics(period);
    return dashboard.trends;
  }
}
