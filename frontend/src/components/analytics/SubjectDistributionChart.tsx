import React from 'react';
import { SubjectAnalyticsDTO } from '@student-os/shared';

interface SubjectDistributionChartProps {
  subjects: SubjectAnalyticsDTO[];
}

export const SubjectDistributionChart: React.FC<SubjectDistributionChartProps> = ({ subjects }) => {
  if (!subjects || subjects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
        No subject activity recorded for this period.
      </div>
    );
  }

  const COLORS = ['#2563eb', '#8b5cf6', '#059669', '#d97706', '#dc2626', '#0284c7'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {subjects.map((sub, idx) => {
        const color = COLORS[idx % COLORS.length];
        return (
          <div key={sub.subjectId} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                <strong style={{ color: 'var(--color-text-primary)' }}>{sub.subjectName}</strong>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                <span>{sub.studyTimeMinutes + sub.revisionTimeMinutes}m ({sub.sharePercentage}%)</span>
                <span style={{ fontWeight: '600', color: sub.retentionScore >= 90 ? '#166534' : 'var(--color-text-primary)' }}>
                  {sub.retentionScore}% Retention
                </span>
              </div>
            </div>

            {/* Horizontal Stacked Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-primary)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div
                style={{
                  width: `${sub.sharePercentage}%`,
                  height: '100%',
                  backgroundColor: color,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Breakdown Subtitle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>
              <span>Study: {sub.studyTimeMinutes}m • Revision: {sub.revisionTimeMinutes}m</span>
              <span>{sub.completedTasksCount} tasks done</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
