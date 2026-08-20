import React from 'react';
import { GoalProgressDTO } from '@student-os/shared';
import { Button } from '@student-os/ui';
import { Target } from 'lucide-react';

interface GoalSummaryCardProps {
  progress: GoalProgressDTO | null;
  onEdit?: () => void;
  onCreate?: () => void;
}

export const GoalSummaryCard: React.FC<GoalSummaryCardProps> = ({ progress, onEdit, onCreate }) => {
  if (!progress || !progress.goal) {
    return (
      <div
        style={{
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px dashed var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
            No Active Academic Goal
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Set your target exam date and daily study goals to stay on track.
          </p>
        </div>
        {onCreate && (
          <Button type="button" onClick={onCreate} style={{ fontSize: '0.8rem', height: '32px' }}>
            + Set Exam Goal
          </Button>
        )}
      </div>
    );
  }

  const { goal, daysRemaining, weeksRemaining, requiredMinutesPerDay, projectedCompletionDate, todayStudyMinutesCompleted, statusBadge } = progress;

  const targetChapters = goal.targetTotalChapters || 1;
  const progressPct = Math.min(100, Math.round((goal.completedChapters / targetChapters) * 100));

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'COMPLETED':
        return { bg: '#f0fdf4', border: '#86efac', text: '#166534', label: 'COMPLETED' };
      case 'ON_TRACK':
      case 'AHEAD':
        return { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', label: 'ON TRACK' };
      case 'AT_RISK':
        return { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', label: 'AT RISK' };
      case 'BEHIND':
        return { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: 'BEHIND' };
      case 'NOT_STARTED':
      default:
        return { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', label: 'NOT STARTED' };
    }
  };

  const badgeColor = getBadgeColor(statusBadge);

  return (
    <div
      style={{
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-xs)',
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={16} color="var(--color-accent)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
              {goal.examName}
            </h3>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: badgeColor.bg,
                border: `1px solid ${badgeColor.border}`,
                color: badgeColor.text,
              }}
            >
              {badgeColor.label}
            </span>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
            Exam Date: <strong>{goal.examDate}</strong> ({daysRemaining} days / {weeksRemaining} weeks left)
          </p>
        </div>

        {onEdit && (
          <Button type="button" variant="secondary" onClick={onEdit} style={{ fontSize: '0.75rem', height: '28px', padding: '0 10px' }}>
            Edit Goal
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
          <span>Chapter Progress: {goal.completedChapters} / {goal.targetTotalChapters || 0} ({progressPct}%)</span>
          <span>Target Score: {goal.targetScore || 'N/A'}</span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              backgroundColor: 'var(--color-accent)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Stats Sub-grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '6px' }}>
        <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Today Done</span>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{todayStudyMinutesCompleted}m</div>
        </div>

        <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Required Daily</span>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-accent)' }}>{requiredMinutesPerDay}m / day</div>
        </div>

        <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Projected Finish</span>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{projectedCompletionDate}</div>
        </div>
      </div>
    </div>
  );
};
