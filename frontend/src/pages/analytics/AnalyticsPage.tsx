import React from 'react';
import { useAnalytics } from '../../context/AnalyticsContext.js';
import { useGoal } from '../../context/GoalContext.js';
import { TimePeriod } from '@student-os/shared';
import { TrendBarChart } from '../../components/analytics/TrendBarChart.js';
import { SubjectDistributionChart } from '../../components/analytics/SubjectDistributionChart.js';
import { GoalSummaryCard } from '../../components/goal/GoalSummaryCard.js';
import { AlertCircle, Flame, Timer, RotateCcw, CheckCircle2, BarChart3 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { dashboard, period, setPeriod, loading, error } = useAnalytics();
  const { goalProgress } = useGoal();

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
  };

  const formatMinutesToHoursMins = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours === 0) return `${m}m`;
    return m > 0 ? `${hours}h ${m}m` : `${hours}h`;
  };

  if (loading && !dashboard) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
        Loading learning analytics...
      </div>
    );
  }

  const summary = dashboard?.learningSummary;
  const prod = dashboard?.productivitySummary;
  const rev = dashboard?.revisionAnalytics;
  const plan = dashboard?.plannerAnalytics;
  const isEmpty = !summary || summary.totalFocusTimeMinutes === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', fontFamily: 'var(--font-family-base)' }}>
      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--color-error)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* EXAM GOAL SUMMARY CARD */}
      <GoalSummaryCard progress={goalProgress} />

      {/* DASHBOARD HEADER & PERIOD TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
            Learning Analytics
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
            Actionable insights derived from study, planner, and revision activity
          </p>
        </div>

        {/* TIME PERIOD SELECTOR */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
          }}
        >
          {(['today', 'this_week', 'this_month', 'this_year'] as TimePeriod[]).map((p) => {
            const labelMap: Record<TimePeriod, string> = {
              today: 'Today',
              this_week: 'This Week',
              this_month: 'This Month',
              this_year: 'This Year',
            };
            const isActive = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--color-bg-primary)' : 'transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {labelMap[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* EMPTY STATE */}
      {isEmpty ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            textAlign: 'center',
            minHeight: '220px',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginBottom: '12px' }}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
            Analytics will appear as you continue learning.
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0, maxWidth: '420px' }}>
            Complete Study Sessions and Revision Sessions to build meaningful insights.
          </p>
        </div>
      ) : (
        <>
          {/* HIGH LEVEL METRICS CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-sm)' }}>
            <div
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Total Focus Time
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--color-accent)', marginTop: '2px' }}>
                {formatMinutesToHoursMins(summary.totalFocusTimeMinutes)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Study: {formatMinutesToHoursMins(summary.totalStudyTimeMinutes)} • Rev: {formatMinutesToHoursMins(summary.totalRevisionTimeMinutes)}
              </span>
            </div>

            <div
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Study Streak
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={18} color="#f59e0b" />
                <span>{prod?.currentStreakDays || 0} Days</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Longest: {prod?.longestStreakDays || 0} days
              </span>
            </div>

            <div
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Daily Avg Study
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {formatMinutesToHoursMins(prod?.dailyAverageStudyMinutes || 0)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {summary.studySessionsCompleted + summary.revisionSessionsCompleted} total sessions
              </span>
            </div>

            <div
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Planner Accuracy
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#166534', marginTop: '2px' }}>
                {plan?.accuracyPercentage || 100}%
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {summary.tasksCompleted} tasks completed
              </span>
            </div>
          </div>

          {/* MAIN CHARTS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--spacing-md)' }}>
            {/* LEARNING TRENDS BAR CHART */}
            <section
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                Learning Trends
              </h3>
              <TrendBarChart trends={dashboard?.trends || []} />
            </section>

            {/* SUBJECT PERFORMANCE DISTRIBUTION */}
            <section
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                Subject Performance & Focus Share
              </h3>
              <SubjectDistributionChart subjects={dashboard?.subjectAnalytics || []} />
            </section>
          </div>

          {/* REVISION & PLANNING PERFORMANCE DETAILS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
            {/* REVISION INSIGHTS CARD */}
            <section
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                Revision Performance Insights
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Completion Rate</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-accent)' }}>{rev?.revisionCompletionRate || 100}%</div>
                </div>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Retention Score</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#166534' }}>{rev?.retentionScoreAverage || 100}%</div>
                </div>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Due Today</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{rev?.dueTodayCount || 0}</div>
                </div>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Overdue Revisions</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: (rev?.overdueCount || 0) > 0 ? '#dc2626' : 'var(--color-text-primary)' }}>{rev?.overdueCount || 0}</div>
                </div>
              </div>
            </section>

            {/* PLANNER PERFORMANCE CARD */}
            <section
              style={{
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                Planner Execution Performance
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Planned Time</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{formatMinutesToHoursMins(plan?.plannedDurationMinutes || 0)}</div>
                </div>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Completed Time</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-accent)' }}>{formatMinutesToHoursMins(plan?.completedDurationMinutes || 0)}</div>
                </div>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Deferred Tasks</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{plan?.deferredTasksCount || 0}</div>
                </div>
                <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Cancelled Tasks</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-muted)' }}>{plan?.cancelledTasksCount || 0}</div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
