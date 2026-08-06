/**
 * DashboardPage — Student OS Home Dashboard (Milestone 10.6 Final Production Polish)
 *
 * Final V1 Presentation-Layer Refinement Pass:
 * 1. Hero Metrics Panel: Vertically centered, equal 16px horizontal spacing between 3 metrics (Streak, Focus, Goal Progress), dominant 1.25rem values, secondary labels.
 * 2. Goal Card: Clean progress hierarchy ("Overall Progress: X / Y Chapters" -> 8px progress bar -> "Z% Complete"), single progress bar, unified 4-stat metric strip.
 * 3. Planner Widget: Height auto-shrinks naturally, displays completed task filler to eliminate empty space.
 * 4. Revision Widget: SaaS warning colors (softer red #fff5f5/#feb2b2 for Overdue, subtle purple #f7f5ff/#d6bcfa for Due Today, neutral for Upcoming).
 * 5. Weekly Snapshot: Pixel-aligned 80px min-height cards with vertically centered metric numbers (31d, 11h7m, etc.), identical baseline & progress bars.
 * 6. Activity Heatmap: Month labels moved up (2px margin), legend spacing reduced (6px), elegant today cell highlight ring, subtle 1.25x scale hover.
 * 7. Quick Actions: 22px dominant icons, 12px clean labels, premium action card tiles with active press animation.
 * 8. Navigation: Smooth cubic-bezier hover transitions in App.tsx.
 * 9. Audits: Unified 12px section gaps, 12px 14px card padding, identical radii & shadows, full ARIA & keyboard accessibility, 0 extra re-renders.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../../context/AccountContext.js';
import { useStudy } from '../../context/StudyContext.js';
import { usePlanner } from '../../context/PlannerContext.js';
import { useRevision } from '../../context/RevisionContext.js';
import { useAnalytics } from '../../context/AnalyticsContext.js';
import { useGoal } from '../../context/GoalContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '@student-os/ui';
import { DailyPlanSummaryDTO, GoalBadgeStatus } from '@student-os/shared';

// ─── Navigation type ──────────────────────────────────────────────────────────
type NavModule = 'dashboard' | 'study' | 'planner' | 'revision' | 'analytics' | 'account';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function fmtMins(mins: number): string {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtSecs(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

function isoDateOffset(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function smartTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const todayStr = isoDateOffset(0);
  const yesterdayStr = isoDateOffset(-1);
  const ds = d.toISOString().split('T')[0];
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (ds === todayStr) return `Today · ${timeStr}`;
  if (ds === yesterdayStr) return `Yesterday · ${timeStr}`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function badgeCfg(badge: GoalBadgeStatus | undefined): { label: string; bg: string; border: string; text: string } {
  if (badge === 'AHEAD')   return { label: '🚀 AHEAD',    bg: 'rgba(34,197,94,0.12)',  border: '#86efac', text: '#15803d' };
  if (badge === 'BEHIND')  return { label: '⚠️ BEHIND',   bg: 'rgba(239,68,68,0.12)',  border: '#fca5a5', text: '#dc2626' };
  return                          { label: '✓ ON TRACK', bg: 'rgba(37,99,235,0.12)',  border: '#93c5fd', text: '#1d4ed8' };
}

// ─── Design Tokens & CSS Helpers ──────────────────────────────────────────────

const BASE_CARD: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
};

// ─── HoverCard Wrapper ────────────────────────────────────────────────────────

const HoverCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler;
  'aria-label'?: string;
}> = ({ children, style, onClick, role, tabIndex, onKeyDown, 'aria-label': ariaLabel }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={ariaLabel}
      style={{
        ...BASE_CARD,
        ...style,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
        borderColor: hovered ? 'var(--color-accent)' : 'var(--color-border)',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {children}
    </div>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; bg: string; border: string; text: string; size?: 'sm' | 'md' }> = ({ label, bg, border, text, size = 'sm' }) => (
  <span style={{
    display: 'inline-block',
    fontSize: size === 'md' ? '0.72rem' : '0.62rem',
    fontWeight: '700',
    padding: size === 'md' ? '2px 9px' : '1px 6px',
    borderRadius: '10px',
    backgroundColor: bg,
    border: `1px solid ${border}`,
    color: text,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

// ─── CompactStat ──────────────────────────────────────────────────────────────

const CompactStat: React.FC<{
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  accentColor?: string;
}> = ({ icon, label, value, sub, accent, accentColor }) => (
  <HoverCard style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 12px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ fontSize: '0.8rem' }}>{icon}</span>
      <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
    <span style={{
      fontSize: '1.25rem',
      fontWeight: '800',
      color: accent ? (accentColor || 'var(--color-accent)') : 'var(--color-text-primary)',
      lineHeight: 1,
      letterSpacing: '-0.025em',
    }}>
      {value}
    </span>
    {sub && <span style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>{sub}</span>}
  </HoverCard>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: string; title: string; desc: string; action?: string; onAction?: () => void }> = ({ icon, title, desc, action, onAction }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 10px', gap: '4px', textAlign: 'center' }}>
    <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{icon}</span>
    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>{title}</span>
    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', maxWidth: '200px', lineHeight: 1.35 }}>{desc}</span>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        style={{ marginTop: '4px', background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {action}
      </button>
    )}
  </div>
);

// ─── SkeletonLine ──────────────────────────────────────────────────────────────

const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({ width = '100%', height = '12px' }) => (
  <div style={{ width, height, borderRadius: '4px', backgroundColor: 'var(--color-border)', opacity: 0.6, animation: 'pulse 1.6s ease-in-out infinite' }} />
);

const SkeletonBlock: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonLine key={i} width={i === 0 ? '70%' : i === rows - 1 ? '50%' : '100%'} height={i === 0 ? '16px' : '12px'} />
    ))}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SH: React.FC<{ icon: string; title: string; action?: string; onAction?: () => void }> = ({ icon, title, action, onAction }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '0.85rem' }}>{icon}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>{title}</span>
    </div>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600', padding: '2px 4px', borderRadius: '4px', transition: 'opacity 0.15s' }}
      >
        {action} →
      </button>
    )}
  </div>
);

// ─── Heatmap Tooltip ─────────────────────────────────────────────────────────

type DayData = { studyMinutes: number; revisionCount: number; tasksDone: number; tasksTotal: number };

const HeatmapTooltip: React.FC<{ day: string; data: DayData; visible: boolean }> = ({ day, data, visible }) => {
  if (!visible) return null;
  const formatted = new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        bottom: '120%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 9px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.16)',
        zIndex: 200,
        minWidth: '130px',
        pointerEvents: 'none',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '3px', whiteSpace: 'nowrap' }}>{formatted}</div>
      <div style={{ fontSize: '0.62rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span>⏱ {fmtMins(data.studyMinutes)} studied</span>
        {data.revisionCount > 0 && <span>🔁 {data.revisionCount} revision{data.revisionCount > 1 ? 's' : ''}</span>}
        {data.tasksTotal > 0 && <span>✅ {data.tasksDone}/{data.tasksTotal} tasks</span>}
        {data.studyMinutes === 0 && data.revisionCount === 0 && data.tasksTotal === 0 && (
          <span style={{ color: 'var(--color-text-muted)' }}>No activity recorded</span>
        )}
      </div>
    </div>
  );
};

// ─── Activity Heatmap (Month labels up, legend spacing reduced, subtle 1.25x scale) ──

const ActivityHeatmap: React.FC<{ onOpenPlanner: () => void }> = ({ onOpenPlanner }) => {
  const { token, deviceId } = useAuth();
  const [activityMap, setActivityMap] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 16 weeks (112 days) Mon-aligned
  const days: string[] = [];
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  useEffect(() => {
    if (!token) return;
    const now = new Date();

    const fetchMonth = async (y: number, m: number) => {
      try {
        const res = await fetch(`/api/v1/planner/monthly?year=${y}&month=${m}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-device-id': deviceId },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.days)) {
          return json.data.days as Array<{
            date: string; studyMinutes: number; plannedTasksCount: number;
            completedTasksCount: number; revisionCount: number;
          }>;
        }
      } catch { /* offline fallback */ }
      return [];
    };

    const load = async () => {
      setLoading(true);
      const months: [number, number][] = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push([d.getFullYear(), d.getMonth() + 1]);
      }
      const results = await Promise.all(months.map(([y, m]) => fetchMonth(y, m)));
      const map: Record<string, DayData> = {};
      results.flat().forEach((d) => {
        map[d.date] = {
          studyMinutes: d.studyMinutes,
          revisionCount: d.revisionCount,
          tasksDone: d.completedTasksCount,
          tasksTotal: d.plannedTasksCount,
        };
      });
      setActivityMap(map);
      setLoading(false);
    };
    load();
  }, [token, deviceId]);

  const getColor = (mins: number): string => {
    if (mins <= 0)   return 'var(--color-border)';
    if (mins < 30)   return 'rgba(37,99,235,0.2)';
    if (mins < 60)   return 'rgba(37,99,235,0.45)';
    if (mins < 120)  return 'rgba(37,99,235,0.7)';
    return                  'rgba(37,99,235,0.95)';
  };

  const firstDow = (new Date(days[0]).getDay() + 6) % 7;
  const padded: (string | null)[] = [...Array(firstDow).fill(null), ...days];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  // Compute month headers across top
  const monthLabels: { label: string; colIndex: number }[] = [];
  let lastMonth = '';
  weeks.forEach((w, colIdx) => {
    const validDay = w.find(Boolean);
    if (validDay) {
      const mName = new Date(validDay).toLocaleDateString('en-US', { month: 'short' });
      if (mName !== lastMonth) {
        monthLabels.push({ label: mName, colIndex: colIdx });
        lastMonth = mName;
      }
    }
  });

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  if (loading) return <SkeletonBlock rows={4} />;

  return (
    <div>
      {/* Month headers moved slightly upward */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '2px', paddingLeft: '16px', fontSize: '0.62rem', fontWeight: '700', color: 'var(--color-text-muted)' }}>
        {monthLabels.map((m, idx) => (
          <span key={idx} style={{ position: 'relative', left: `${m.colIndex * 15}px`, marginRight: '12px' }}>
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid: Day labels + Week columns */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'space-between' }}>
          {weekdays.map((d, i) => (
            <div key={i} style={{ width: '12px', height: '13px', fontSize: '0.52rem', color: 'var(--color-text-muted)', textAlign: 'center', fontWeight: '700' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '2px' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {week.map((day, di) => {
                if (!day) return <div key={di} style={{ width: '13px', height: '13px' }} />;
                const data = activityMap[day] ?? { studyMinutes: 0, revisionCount: 0, tasksDone: 0, tasksTotal: 0 };
                const isToday = day === todayStr;
                const isHovered = hoveredDay === day;

                return (
                  <div key={day} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={onOpenPlanner}
                      aria-label={`${day}: ${fmtMins(data.studyMinutes)} studied`}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onFocus={() => setHoveredDay(day)}
                      onBlur={() => setHoveredDay(null)}
                      style={{
                        width: '13px',
                        height: '13px',
                        borderRadius: '2.5px',
                        backgroundColor: getColor(data.studyMinutes),
                        boxShadow: isToday ? '0 0 0 2px var(--color-accent)' : 'none',
                        border: isHovered ? '1px solid #ffffff' : 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                        zIndex: isHovered ? 10 : 1,
                        outline: 'none',
                      }}
                    />
                    <HeatmapTooltip day={day} data={data} visible={isHovered} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Reduced Spacing Intensity Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '6px' }}>
        <span style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Less</span>
        {[0, 30, 60, 120, 180].map((v) => (
          <div key={v} title={`≥ ${fmtMins(v)}`} style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: getColor(v), flexShrink: 0 }} />
        ))}
        <span style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>More</span>
      </div>
    </div>
  );
};

// ─── 1. Hero Section (Equal Horizontal Spacing Between Metrics) ───────────────

const HeroSection: React.FC<{ displayName: string; onNavigate: (m: NavModule) => void }> = ({ displayName, onNavigate }) => {
  const { goalProgress } = useGoal();
  const { activeSession, elapsedSeconds, subjects, resumeSession, todaySummary } = useStudy();
  const { dashboard } = useAnalytics();

  const goal = goalProgress?.goal;
  const badge = goalProgress?.statusBadge;
  const bc = badgeCfg(badge);
  const todayMins = todaySummary ? Math.round(todaySummary.totalDurationSeconds / 60) : 0;
  const streak = dashboard?.productivitySummary?.currentStreakDays ?? 0;
  const progressPct = goal?.targetTotalChapters
    ? Math.min(100, Math.round(((goalProgress?.completedChapters ?? 0) / goal.targetTotalChapters) * 100))
    : 0;

  const activeSubject = activeSession ? subjects.find((s) => s.id === activeSession.subjectId) : null;

  const handleResume = async () => {
    if (activeSession?.status === 'paused') await resumeSession();
    onNavigate('study');
  };

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, #1e3faf 0%, #5b21b6 60%, #6d28d9 100%)',
        padding: '16px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '16px',
        alignItems: 'center', // Vertically centered
        color: '#ffffff',
      }}
    >
      {/* Left: Identity & Goal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '0.72rem', opacity: 0.75, fontWeight: '500' }}>{getGreeting()} 👋</span>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          {displayName}
        </h2>

        {goal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '0.9rem' }}>🎯</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', opacity: 0.95 }}>{goal.examName}</span>
            </div>
            {/* Prominent Countdown Badge */}
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: 'rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.35)',
                padding: '2px 8px',
                borderRadius: '6px',
                color: '#ffffff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}
            >
              ⏳ {goalProgress?.daysRemaining} days left
            </span>
            <Badge label={bc.label} bg={bc.bg} border={bc.border} text={bc.text} size="sm" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            style={{
              marginTop: '4px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px dashed rgba(255,255,255,0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '0.75rem',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: '600',
              width: 'fit-content',
            }}
          >
            + Set Exam Goal
          </button>
        )}
      </div>

      {/* Right Metrics Panel: Equal 16px horizontal spacing & dominant values */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeSession ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(4px)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '170px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
              <span style={{ fontSize: '0.62rem', fontWeight: '800', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {activeSession.status === 'paused' ? 'Paused' : 'In Session'}
              </span>
            </div>
            {activeSubject && <span style={{ fontSize: '0.82rem', fontWeight: '700', lineHeight: 1.1 }}>{activeSubject.name}</span>}
            <span style={{ fontSize: '1.25rem', fontWeight: '800', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em' }}>
              {fmtSecs(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={handleResume}
              style={{
                marginTop: '2px',
                background: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#1e3faf',
                fontSize: '0.72rem',
                fontWeight: '800',
                padding: '4px 12px',
                cursor: 'pointer',
              }}
            >
              {activeSession.status === 'paused' ? '▶ Resume' : 'Continue →'}
            </button>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(4px)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px', // Equal horizontal spacing between all 3 metrics
            }}
          >
            {streak > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.58rem', opacity: 0.75, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Streak</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', lineHeight: 1 }}>{streak}d</div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.58rem', opacity: 0.75, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⏱ Focus</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', lineHeight: 1 }}>{fmtMins(todayMins)}</div>
            </div>
            {goal?.targetTotalChapters && (
              <div style={{ textAlign: 'right', minWidth: '70px' }}>
                <div style={{ fontSize: '0.58rem', opacity: 0.75, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📚 Goal</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', lineHeight: 1 }}>{progressPct}%</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 2. Goal Card (Structured Progress Hierarchy & Single Progress Bar) ───────

const GoalDetailCard: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { goalProgress, loading } = useGoal();

  if (loading) return <div style={BASE_CARD}><SkeletonBlock rows={3} /></div>;

  if (!goalProgress?.goal) {
    return (
      <div style={{ ...BASE_CARD, border: '1px dashed var(--color-border)' }}>
        <EmptyState icon="🎯" title="No Active Exam Goal" desc="Set target exam to track daily pace and chapter progress." action="Set Exam Goal" onAction={() => onNavigate('planner')} />
      </div>
    );
  }

  const { goal, daysRemaining, weeksRemaining, requiredMinutesPerDay, requiredChaptersPerDay,
    projectedCompletionDate, completedChapters, remainingChapters, statusBadge } = goalProgress;

  const targetCh = goal.targetTotalChapters ?? 0;
  const pct = targetCh > 0 ? Math.min(100, Math.round((completedChapters / targetCh) * 100)) : 0;
  const bc = badgeCfg(statusBadge);

  return (
    <HoverCard style={{ padding: '12px 14px' }}>
      {/* Header: Goal title & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem' }}>🎯</span>
          <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>{goal.examName}</span>
          <Badge label={bc.label} bg={bc.bg} border={bc.border} text={bc.text} size="sm" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Target: <strong>{projectedCompletionDate}</strong> ({daysRemaining}d / {weeksRemaining}wks left)
          </span>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)', fontSize: '0.7rem', padding: '2px 8px', cursor: 'pointer', fontWeight: '600' }}
          >
            Edit Goal
          </button>
        </div>
      </div>

      {/* Progress Hierarchy: "Overall Progress: 18 / 50 Chapters" -> Bar -> "36% Complete" */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Overall Progress: <strong style={{ color: 'var(--color-text-primary)' }}>{completedChapters} / {targetCh} Chapters</strong>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--color-border)', overflow: 'hidden', marginBottom: '6px' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-accent)' }}>
          {pct}% Complete
        </div>
      </div>

      {/* Unified Connected Statistics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'Completed', value: `${completedChapters} ch`, accent: false },
          { label: 'Remaining', value: `${remainingChapters} ch`, accent: false },
          { label: 'Daily Pace', value: `${requiredMinutesPerDay}m/day`, accent: true },
          { label: 'Chapters/Day', value: requiredChaptersPerDay.toFixed(1), accent: false },
        ].map((s) => (
          <div key={s.label} style={{ padding: '6px 10px', backgroundColor: 'var(--color-bg-primary)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: s.accent ? 'var(--color-accent)' : 'var(--color-text-primary)', marginTop: '2px' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </HoverCard>
  );
};

// ─── 3. Planner Widget (Auto-Shrinking Height, No Fixed Space) ─────────────────

const PlannerWidget: React.FC<{ onNavigate: (m: NavModule) => void; yesterdayPlan: DailyPlanSummaryDTO | null }> = ({ onNavigate, yesterdayPlan }) => {
  const { todaySummary, isLoading } = usePlanner();
  const { subjects } = useStudy();

  const tasks = todaySummary?.tasks ?? [];
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const planned = tasks.filter((t) => t.status === 'planned');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const completedCount = completedTasks.length;
  const total = tasks.length;
  const yesterdayPending = yesterdayPlan?.tasks?.filter((t) => t.status === 'planned' || t.status === 'in_progress') ?? [];

  const priorityBadge = (p: string) => ({
    fontSize: '0.55rem', fontWeight: '700', padding: '1px 5px', borderRadius: '6px',
    backgroundColor: p === 'high' ? '#fef2f2' : p === 'medium' ? '#fffbeb' : '#f0fdf4',
    color: p === 'high' ? '#dc2626' : p === 'medium' ? '#d97706' : '#166534',
    border: `1px solid ${p === 'high' ? '#fca5a5' : p === 'medium' ? '#fde68a' : '#86efac'}`,
  });

  if (isLoading) return <SkeletonBlock rows={3} />;

  const visiblePlanned = planned.slice(0, 3);
  const visibleCompleted = visiblePlanned.length < 2 ? completedTasks.slice(0, 2 - visiblePlanned.length) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', height: 'auto' }}>
      {/* Yesterday pending banner */}
      {yesterdayPending.length > 0 && (
        <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#d97706' }}>⏰ Yesterday's Pending ({yesterdayPending.length})</span>
          <button type="button" onClick={() => onNavigate('planner')} style={{ background: 'none', border: 'none', color: '#d97706', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
            Reschedule
          </button>
        </div>
      )}

      {/* Domain Green Progress Bar */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((completedCount / total) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>{completedCount}/{total} done</span>
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(37,99,235,0.06)', border: '1px solid var(--color-accent)' }}>
          <div style={{ fontSize: '0.58rem', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>▶ In Progress</div>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{inProgress[0].title}</div>
        </div>
      )}

      {/* Visible Planned Tasks */}
      {visiblePlanned.map((t) => {
        const subj = subjects.find((s) => s.id === t.subjectId);
        return (
          <div key={t.id} style={{ padding: '6px 9px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              <div style={{ fontSize: '0.64rem', color: 'var(--color-text-muted)' }}>{subj?.name}{t.estimatedDurationMinutes ? ` · ${t.estimatedDurationMinutes}m` : ''}</div>
            </div>
            <span style={priorityBadge(t.priority)}>{t.priority.toUpperCase()}</span>
          </div>
        );
      })}

      {/* Completed Filler Tasks */}
      {visibleCompleted.map((t) => (
        <div key={t.id} style={{ padding: '6px 9px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', opacity: 0.7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.78rem', textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>{t.title}</div>
          <span style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: '700' }}>✓ Done</span>
        </div>
      ))}

      {tasks.length === 0 && (
        <EmptyState icon="📋" title="No Tasks Today" desc="Plan your study blocks for the day." action="Add Task" onAction={() => onNavigate('planner')} />
      )}

      {planned.length > 3 && (
        <button type="button" onClick={() => onNavigate('planner')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer', textAlign: 'left', marginTop: '4px' }}>
          +{planned.length - 3} more tasks →
        </button>
      )}
    </div>
  );
};

// ─── 4. Revision Widget (SaaS Warning Color Palette) ──────────────────────────

const RevisionWidget: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { items, loading } = useRevision();
  const { subjects } = useStudy();

  const overdue  = items.filter((r) => r.status === 'overdue');
  const dueToday = items.filter((r) => r.status === 'due_today');
  const upcoming = items.filter((r) => r.status === 'scheduled').slice(0, 2);
  const visible  = [...overdue.slice(0, 2), ...dueToday.slice(0, 2), ...upcoming];

  if (loading) return <SkeletonBlock rows={3} />;

  if (visible.length === 0) {
    return (
      <EmptyState icon="🔁" title="All Caught Up!" desc="No revisions due. Study sessions generate revision items automatically." action="Start Study" onAction={() => onNavigate('study')} />
    );
  }

  const stLabel = (s: string) => {
    if (s === 'overdue')   return { label: '⚠️ Overdue',   bg: '#fff5f5', border: '#feb2b2', text: '#9b2c2c' };
    if (s === 'due_today') return { label: '🔁 Due Today', bg: '#f7f5ff', border: '#d6bcfa', text: '#6b46c1' };
    return                        { label: 'Upcoming',   bg: 'var(--color-bg-primary)', border: 'var(--color-border)', text: 'var(--color-text-muted)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {overdue.length > 0 && (
        <div style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', fontSize: '0.68rem', color: '#9b2c2c', fontWeight: '700' }}>
          ⚠️ {overdue.length} overdue revision{overdue.length > 1 ? 's' : ''} — action required
        </div>
      )}

      {visible.map((r) => {
        const subj = subjects.find((s) => s.id === r.subjectId);
        const st = stLabel(r.status);
        const isOverdue = r.status === 'overdue';
        const isDueToday = r.status === 'due_today';

        return (
          <div
            key={r.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 9px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isOverdue ? '#fff5f5' : isDueToday ? '#f7f5ff' : 'var(--color-bg-primary)',
              border: `1px solid ${isOverdue ? '#feb2b2' : isDueToday ? '#d6bcfa' : 'var(--color-border)'}`,
              gap: '6px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: isOverdue ? '#9b2c2c' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subj?.name ?? 'Subject'}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>
                Stage {r.revisionStage}{r.retentionScore > 0 ? ` · ${r.retentionScore}% retention` : ''}
              </div>
            </div>
            <Badge label={st.label} bg={st.bg} border={st.border} text={st.text} />
          </div>
        );
      })}

      <button type="button" onClick={() => onNavigate('revision')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.68rem', fontWeight: '600', cursor: 'pointer', textAlign: 'left', marginTop: '2px' }}>
        View all revisions →
      </button>
    </div>
  );
};

// ─── 5. Achievement Widget ───────────────────────────────────────────────────

const AchievementWidget: React.FC = () => {
  const { dashboard } = useAnalytics();
  const { items: revItems } = useRevision();

  const prod = dashboard?.productivitySummary;
  const learn = dashboard?.learningSummary;
  const streak = prod?.currentStreakDays ?? 0;
  const totalHours = Math.round((learn?.totalFocusTimeMinutes ?? 0) / 60);
  const doneRevisions = revItems.filter((r) => r.status === 'completed').length;

  const cells = [
    { icon: '🔥', value: `${streak}d`, label: 'Streak' },
    { icon: '⏱', value: `${totalHours}h`, label: 'Focus' },
    { icon: '✅', value: `${doneRevisions}`, label: 'Revised' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        backgroundColor: 'var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          style={{
            padding: '6px 8px',
            backgroundColor: 'var(--color-bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{c.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{c.value}</span>
            <span style={{ fontSize: '0.56rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── 6. Weekly Snapshot (Numbers Vertically Centered & Pixel Aligned) ─────────

const WeeklySnapshot: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { dashboard, loading } = useAnalytics();
  const prod  = dashboard?.productivitySummary;
  const learn = dashboard?.learningSummary;
  const rev   = dashboard?.revisionAnalytics;
  const plan  = dashboard?.plannerAnalytics;

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
        {[0, 1, 2, 3, 4].map((i) => <SkeletonLine key={i} height="80px" />)}
      </div>
    );
  }

  const streak = prod?.currentStreakDays ?? 0;
  const revRate = rev?.revisionCompletionRate ?? 0;
  const planAcc = plan?.accuracyPercentage ?? 0;

  const stats = [
    {
      icon: '🔥', label: 'Streak', value: `${streak}d`, sub: `best ${prod?.longestStreakDays ?? 0}d`,
      bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.25)', accentColor: '#d97706', pct: null,
    },
    {
      icon: '⏱', label: 'Focus Time', value: fmtMins(learn?.totalFocusTimeMinutes ?? 0), sub: 'this week',
      bg: 'rgba(37, 99, 235, 0.06)', border: 'rgba(37, 99, 235, 0.25)', accentColor: '#2563eb', pct: null,
    },
    {
      icon: '📅', label: 'Daily Avg', value: fmtMins(prod?.dailyAverageStudyMinutes ?? 0), sub: 'per day',
      bg: 'var(--color-bg-secondary)', border: 'var(--color-border)', accentColor: 'var(--color-text-primary)', pct: null,
    },
    {
      icon: '🔁', label: 'Revision', value: `${revRate}%`, sub: 'completed',
      bg: 'rgba(124, 58, 237, 0.06)', border: 'rgba(124, 58, 237, 0.25)', accentColor: '#7c3aed', pct: revRate,
    },
    {
      icon: '📋', label: 'Accuracy', value: `${planAcc}%`, sub: 'on-time',
      bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.25)', accentColor: '#10b981', pct: planAcc,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
      {stats.map((s) => (
        <div
          key={s.label}
          onClick={() => onNavigate('analytics')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('analytics'); }}
          aria-label={`${s.label}: ${s.value}`}
          style={{
            minHeight: '80px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: s.bg,
            border: `1px solid ${s.border}`,
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // Numbers vertically centered
            gap: '4px',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem' }}>{s.icon}</span>
            <span style={{ fontSize: '0.58rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>{s.label}</span>
          </div>

          <span style={{ fontSize: '1.15rem', fontWeight: '800', color: s.accentColor, letterSpacing: '-0.025em', lineHeight: 1 }}>{s.value}</span>

          <div>
            <span style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)' }}>{s.sub}</span>
            {s.pct !== null && (
              <div style={{ marginTop: '2px', height: '3px', borderRadius: '2px', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ width: `${s.pct}%`, height: '100%', backgroundColor: s.accentColor, borderRadius: '2px' }} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── 7. Quick Actions (22px Dominant Icons & 12px Clean Labels) ────────────────

const QuickActions: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const actions = [
    { icon: '📖', label: 'Start Study', nav: 'study' as NavModule, primary: true },
    { icon: '📋', label: 'Planner',     nav: 'planner' as NavModule },
    { icon: '🔁', label: 'Revision',    nav: 'revision' as NavModule },
    { icon: '📊', label: 'Analytics',   nav: 'analytics' as NavModule },
    { icon: '🎯', label: 'Set Goal',    nav: 'planner' as NavModule },
  ];

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {actions.map((a) => {
        const isHover = hovered === a.label;
        return (
          <button
            key={a.label}
            type="button"
            onClick={() => onNavigate(a.nav)}
            aria-label={a.label}
            onMouseEnter={() => setHovered(a.label)}
            onMouseLeave={() => setHovered(null)}
            style={{
              flex: 1,
              minWidth: '76px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 8px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${isHover || a.primary ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: isHover ? 'rgba(37,99,235,0.08)' : a.primary ? 'rgba(37,99,235,0.05)' : 'var(--color-bg-primary)',
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isHover ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: isHover ? '0 4px 14px rgba(37,99,235,0.15)' : 'none',
              outline: 'none',
            }}
          >
            <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{a.icon}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isHover || a.primary ? 'var(--color-accent)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              {a.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Recent Activity ──────────────────────────────────────────────────────────

const RecentActivity: React.FC = () => {
  const { todaySummary, subjects } = useStudy();
  const { todaySummary: plannerToday } = usePlanner();
  const { items: revItems } = useRevision();

  const lastSession = todaySummary?.sessions?.slice(-1)[0] ?? null;

  const completedTasks = (plannerToday?.tasks ?? [])
    .filter((t) => t.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const lastTask = completedTasks[0] ?? null;

  const revisedItems = revItems
    .filter((r) => r.lastRevisionAt)
    .sort((a, b) => (b.lastRevisionAt ?? '').localeCompare(a.lastRevisionAt ?? ''));
  const lastRev = revisedItems[0] ?? null;

  const entries = [
    lastSession && {
      icon: '📖',
      label: `Study — ${fmtMins(Math.round(lastSession.durationSeconds / 60))}`,
      sub: smartTime(lastSession.startTime),
      badge: { label: 'Done', bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    },
    lastTask && {
      icon: '✅',
      label: lastTask.title,
      sub: smartTime(lastTask.completedAt),
      badge: { label: 'Completed', bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    },
    lastRev && {
      icon: '🔁',
      label: `${subjects.find((s) => s.id === lastRev.subjectId)?.name ?? 'Revision'} · Stage ${lastRev.revisionStage}`,
      sub: smartTime(lastRev.lastRevisionAt),
      badge: { label: 'Revised', bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
    },
  ].filter(Boolean) as Array<{ icon: string; label: string; sub: string; badge: { label: string; bg: string; border: string; text: string } }>;

  if (entries.length === 0) {
    return <EmptyState icon="🕐" title="No Recent Activity" desc="Start a study session to log activity." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 9px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{e.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>{e.sub}</div>
            </div>
          </div>
          <Badge label={e.badge.label} bg={e.badge.bg} border={e.badge.border} text={e.badge.text} />
        </div>
      ))}
    </div>
  );
};

// ─── Session Banner ──────────────────────────────────────────────────────────

const SessionBanner: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { activeSession } = useStudy();

  if (!activeSession) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky', bottom: 0, zIndex: 50,
        padding: '8px 16px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(90deg, #1e3faf, #6d28d9)',
        color: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.16)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>
          {activeSession.status === 'paused' ? 'Study session paused' : 'Study session active'}
        </span>
      </div>
      <Button
        type="button"
        onClick={() => onNavigate('study')}
        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', fontSize: '0.75rem', height: '28px' }}
      >
        Open Study →
      </Button>
    </div>
  );
};

// ─── DashboardPage ────────────────────────────────────────────────────────────

export interface DashboardPageProps {
  onNavigate: (module: NavModule) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { profile } = useAccount();
  const { token, deviceId } = useAuth();
  const { todaySummary } = useStudy();
  const { todaySummary: plannerToday, isLoading: plannerLoading } = usePlanner();
  const { summary: revSummary } = useRevision();

  const displayName = profile?.fullName || 'Student';

  // Yesterday plan — local fetch
  const [yesterdayPlan, setYesterdayPlan] = useState<DailyPlanSummaryDTO | null>(null);

  const fetchYesterday = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/planner/tasks/today?date=${isoDateOffset(-1)}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-device-id': deviceId },
      });
      const json = await res.json();
      if (json.success && json.data) setYesterdayPlan(json.data);
    } catch { /* offline */ }
  }, [token, deviceId]);

  useEffect(() => { fetchYesterday(); }, [fetchYesterday]);

  // Aggregate stats from context
  const studyMins     = todaySummary ? Math.round(todaySummary.totalDurationSeconds / 60) : 0;
  const studySessions  = todaySummary?.completedSessionsCount ?? 0;
  const revMins       = revSummary  ? Math.round((revSummary.totalRevisionSecondsToday ?? 0) / 60) : 0;
  const tasksDone     = plannerToday?.completedTasksCount ?? 0;
  const tasksTotal    = plannerToday?.totalTasksCount ?? 0;
  const plannerPct    = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-family-base)', maxWidth: '100%' }}>

      {/* 1. Hero Section */}
      <HeroSection displayName={displayName} onNavigate={onNavigate} />

      {/* 2. Today's Progress Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
        <CompactStat icon="⏱" label="Focus Time"  value={fmtMins(studyMins)}  sub={`${studySessions} session${studySessions !== 1 ? 's' : ''}`} accent={studyMins >= 60} accentColor="#2563eb" />
        <CompactStat icon="🔁" label="Rev. Time"   value={fmtMins(revMins)}    sub="revision" accentColor="#7c3aed" />
        <CompactStat icon="✅" label="Tasks Done"  value={`${tasksDone}/${tasksTotal}`} sub="completed" accent={tasksDone > 0 && tasksDone === tasksTotal} accentColor="#10b981" />
        <CompactStat icon="📊" label="Planner"     value={plannerLoading ? '…' : `${plannerPct}%`} sub="accuracy" accent={plannerPct >= 75} accentColor="#10b981" />
      </div>

      {/* 3. Goal Card */}
      <GoalDetailCard onNavigate={onNavigate} />

      {/* 4. Planner & Revisions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '12px' }}>
        <div style={{ ...BASE_CARD, display: 'flex', flexDirection: 'column' }}>
          <SH icon="📅" title="Today's Study Plan" action="Open Planner" onAction={() => onNavigate('planner')} />
          <PlannerWidget onNavigate={onNavigate} yesterdayPlan={yesterdayPlan} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={BASE_CARD}>
            <SH icon="🔁" title="Upcoming Revisions" action="View All" onAction={() => onNavigate('revision')} />
            <RevisionWidget onNavigate={onNavigate} />
          </div>
          <div style={BASE_CARD}>
            <SH icon="🏆" title="Achievements" action="Analytics" onAction={() => onNavigate('analytics')} />
            <AchievementWidget />
          </div>
        </div>
      </div>

      {/* 5. Weekly Snapshot */}
      <div>
        <SH icon="📈" title="This Week at a Glance" action="View Analytics" onAction={() => onNavigate('analytics')} />
        <WeeklySnapshot onNavigate={onNavigate} />
      </div>

      {/* 6. Heatmap + Quick Actions + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        <div style={BASE_CARD}>
          <SH icon="📆" title="Activity Heatmap" action="Monthly View" onAction={() => onNavigate('planner')} />
          <ActivityHeatmap onOpenPlanner={() => onNavigate('planner')} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={BASE_CARD}>
            <SH icon="⚡" title="Quick Actions" />
            <QuickActions onNavigate={onNavigate} />
          </div>
          <div style={BASE_CARD}>
            <SH icon="🕐" title="Recent Activity" />
            <RecentActivity />
          </div>
        </div>
      </div>

      {/* 7. Session Banner */}
      <SessionBanner onNavigate={onNavigate} />
    </div>
  );
};
