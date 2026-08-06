import React from 'react';
import { TrendDataPointDTO } from '@student-os/shared';

interface TrendBarChartProps {
  trends: TrendDataPointDTO[];
}

export const TrendBarChart: React.FC<TrendBarChartProps> = ({ trends }) => {
  if (!trends || trends.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
        No trend data available for this period.
      </div>
    );
  }

  const maxMins = Math.max(1, ...trends.map((t) => t.studyMinutes + t.revisionMinutes));
  const chartHeight = 160;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
      {/* Legend Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: '500' }}>Study Time</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#8b5cf6' }} />
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: '500' }}>Revision Time</span>
        </div>
      </div>

      {/* SVG Responsive Stacked Bar Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ minWidth: trends.length * 40, display: 'flex', alignItems: 'flex-end', height: `${chartHeight}px`, gap: '8px', padding: '10px 0 0 0' }}>
          {trends.map((t, idx) => {
            const studyH = (t.studyMinutes / maxMins) * (chartHeight - 30);
            const revH = (t.revisionMinutes / maxMins) * (chartHeight - 30);
            const totalMins = t.studyMinutes + t.revisionMinutes;

            return (
              <div
                key={t.date || idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative',
                }}
                title={`${t.label}: ${t.studyMinutes}m study, ${t.revisionMinutes}m revision (${t.tasksCompleted} tasks completed)`}
              >
                {/* Total time label atop bar */}
                {totalMins > 0 && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {totalMins}m
                  </span>
                )}

                {/* Stacked bar container */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    borderRadius: '4px 4px 0 0',
                    overflow: 'hidden',
                    backgroundColor: 'var(--color-bg-primary)',
                  }}
                >
                  {/* Revision portion (top stack) */}
                  {revH > 0 && (
                    <div
                      style={{
                        height: `${Math.max(4, revH)}px`,
                        backgroundColor: '#8b5cf6',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  )}
                  {/* Study portion (bottom stack) */}
                  {studyH > 0 && (
                    <div
                      style={{
                        height: `${Math.max(4, studyH)}px`,
                        backgroundColor: 'var(--color-accent)',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  )}
                </div>

                {/* Day label */}
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '6px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
