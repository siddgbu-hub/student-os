/**
 * DashboardPage — Student OS Home Dashboard (SaaS Redesign & Visual Polish)
 *
 * Information Hierarchy:
 * 1. Greeting & Identity Header: Contextual greeting, date, and active session / streak summary.
 * 2. Subscription / Trial Access Card: Clean, non-intrusive status with direct upgrade trigger.
 * 3. Primary 4-Metric Strip: Focus Time, Revision Time, Tasks Done, Planner Accuracy.
 * 4. Structured Exam Goal Progress: Exam target, countdown, progress bar, 4-stat pace strip.
 * 5. Two-Column Workspace:
 *    - Left: Today's Study Plan (priority tasks, progress bar, completion state).
 *    - Right: Upcoming Revisions (spaced repetition stages, retention score) + Achievements.
 * 6. Weekly Activity & Insights:
 *    - Left: 16-Week Activity Heatmap with interactive tooltips.
 *    - Right: Quick Actions + Recent Activity timeline.
 * 7. Sticky Session Banner (active non-expired sessions).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Flame,
  Timer,
  BookOpen,
  Calendar,
  RotateCcw,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  Clock,
  AlertTriangle,
  Lock,
  Play,
  Pause,
  ArrowRight,
  Plus,
  Zap,
  Award,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAccount } from '../../context/AccountContext.js';
import { useStudy } from '../../context/StudyContext.js';
import { usePlanner } from '../../context/PlannerContext.js';
import { useRevision } from '../../context/RevisionContext.js';
import { useAnalytics } from '../../context/AnalyticsContext.js';
import { useGoal } from '../../context/GoalContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '@student-os/ui';
import { DailyPlanSummaryDTO, GoalBadgeStatus, PlanDto, EntitlementDto, PaymentConfigDto } from '@student-os/shared';
import { API_BASE_URL } from '@/config/api';
import { EntitlementService } from '../../services/entitlementService.js';
import { UpgradeModal } from '../../components/entitlement/UpgradeModal.js';

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
  if (badge === 'COMPLETED') return { label: 'COMPLETED', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
  if (badge === 'ON_TRACK' || badge === 'AHEAD') return { label: 'ON TRACK', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.3)', text: 'var(--color-accent)' };
  if (badge === 'AT_RISK') return { label: 'AT RISK', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' };
  if (badge === 'BEHIND') return { label: 'BEHIND', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: 'var(--color-error)' };
  return { label: 'NOT STARTED', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)', text: 'var(--color-text-secondary)' };
}

// ─── Design Tokens & CSS Helpers ──────────────────────────────────────────────

const BASE_CARD: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-sm)',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

// ─── Badge ────────────────────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; bg: string; border: string; text: string; size?: 'sm' | 'md' }> = ({ label, bg, border, text, size = 'sm' }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: size === 'md' ? '0.72rem' : '0.65rem',
      fontWeight: '600',
      padding: size === 'md' ? '2px 8px' : '1px 6px',
      borderRadius: 'var(--radius-xs)',
      backgroundColor: bg,
      border: `1px solid ${border}`,
      color: text,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

// ─── CompactStat ──────────────────────────────────────────────────────────────

const CompactStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
}> = ({ icon, label, value, sub, accentColor }) => (
  <div
    style={{
      ...BASE_CARD,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '12px 14px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ color: accentColor || 'var(--color-text-muted)' }}>{icon}</span>
    </div>
    <span
      style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        color: accentColor || 'var(--color-text-primary)',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      }}
    >
      {value}
    </span>
    {sub && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>{sub}</span>}
  </div>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string; action?: string; onAction?: () => void }> = ({
  icon,
  title,
  desc,
  action,
  onAction,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px', gap: '6px', textAlign: 'center' }}>
    <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>{icon}</div>
    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{title}</span>
    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', maxWidth: '240px', lineHeight: 1.4 }}>{desc}</span>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        style={{
          marginTop: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--color-accent)',
          fontWeight: '600',
          fontSize: '0.78rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        <span>{action}</span>
        <ChevronRight size={13} />
      </button>
    )}
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({ width = '100%', height = '12px' }) => (
  <div style={{ width, height, borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-border)', opacity: 0.6, animation: 'pulse 1.6s ease-in-out infinite' }} />
);

const SkeletonBlock: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonLine key={i} width={i === 0 ? '70%' : i === rows - 1 ? '50%' : '100%'} height={i === 0 ? '16px' : '12px'} />
    ))}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SH: React.FC<{ icon: React.ReactNode; title: string; action?: string; onAction?: () => void }> = ({ icon, title, action, onAction }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <h3 style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
    </div>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-accent)',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: '500',
          padding: '2px 4px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        <span>{action}</span>
        <ChevronRight size={13} />
      </button>
    )}
  </div>
);

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

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
        borderRadius: 'var(--radius-sm)',
        padding: '6px 10px',
        boxShadow: 'var(--shadow-md)',
        zIndex: 200,
        minWidth: '130px',
        pointerEvents: 'none',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '3px', whiteSpace: 'nowrap' }}>{formatted}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span>• {fmtMins(data.studyMinutes)} studied</span>
        {data.revisionCount > 0 && <span>• {data.revisionCount} revision{data.revisionCount > 1 ? 's' : ''}</span>}
        {data.tasksTotal > 0 && <span>• {data.tasksDone}/{data.tasksTotal} tasks done</span>}
        {data.studyMinutes === 0 && data.revisionCount === 0 && data.tasksTotal === 0 && (
          <span style={{ color: 'var(--color-text-muted)' }}>No study activity</span>
        )}
      </div>
    </div>
  );
};

const ActivityHeatmap: React.FC<{ onOpenPlanner: () => void }> = ({ onOpenPlanner }) => {
  const { token, deviceId } = useAuth();
  const [activityMap, setActivityMap] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

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
        const res = await fetch(`${API_BASE_URL}/api/v1/planner/monthly?year=${y}&month=${m}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-device-id': deviceId },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.days)) {
          return json.data.days as Array<{
            date: string;
            studyMinutes: number;
            plannedTasksCount: number;
            completedTasksCount: number;
            revisionCount: number;
          }>;
        }
      } catch {
        /* offline */
      }
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
    if (mins <= 0) return 'var(--color-border)';
    if (mins < 30) return 'rgba(37,99,235,0.25)';
    if (mins < 60) return 'rgba(37,99,235,0.5)';
    if (mins < 120) return 'rgba(37,99,235,0.75)';
    return 'var(--color-accent)';
  };

  const firstDow = (new Date(days[0]).getDay() + 6) % 7;
  const padded: (string | null)[] = [...Array(firstDow).fill(null), ...days];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

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
      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px', paddingLeft: '16px', fontSize: '0.65rem', fontWeight: '500', color: 'var(--color-text-muted)' }}>
        {monthLabels.map((m, idx) => (
          <span key={idx} style={{ position: 'relative', left: `${m.colIndex * 14}px`, marginRight: '10px' }}>
            {m.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'space-between' }}>
          {weekdays.map((d, i) => (
            <div key={i} style={{ width: '12px', height: '13px', fontSize: '0.55rem', color: 'var(--color-text-muted)', textAlign: 'center', fontWeight: '500' }}>
              {d}
            </div>
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
                        borderRadius: '2px',
                        backgroundColor: getColor(data.studyMinutes),
                        boxShadow: isToday ? '0 0 0 2px var(--color-accent)' : 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'transform 0.12s ease',
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)',
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '8px' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Less</span>
        {[0, 30, 60, 120, 180].map((v) => (
          <div key={v} title={`≥ ${fmtMins(v)}`} style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: getColor(v), flexShrink: 0 }} />
        ))}
        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>More</span>
      </div>
    </div>
  );
};

// ─── 1. Hero & Identity Section ───────────────────────────────────────────────

const HeroSection: React.FC<{ displayName: string; onNavigate: (m: NavModule) => void; isExpired?: boolean }> = ({ displayName, onNavigate, isExpired }) => {
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

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      style={{
        ...BASE_CARD,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px 20px',
      }}
    >
      {/* Left: Greeting & Goal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            {getGreeting()} • {todayFormatted}
          </span>
        </div>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '600', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          {displayName}
        </h2>

        {goal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              <Target size={14} color="var(--color-accent)" />
              <span>{goal.examName}</span>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '600',
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Timer size={12} />
              <span>{goalProgress?.daysRemaining} days left</span>
            </span>
            <Badge label={bc.label} bg={bc.bg} border={bc.border} text={bc.text} size="sm" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            style={{
              marginTop: '4px',
              background: 'none',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-accent)',
              fontSize: '0.78rem',
              padding: '3px 10px',
              cursor: 'pointer',
              fontWeight: '500',
              width: 'fit-content',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={13} />
            <span>Set Exam Goal</span>
          </button>
        )}
      </div>

      {/* Right: Active Session Tracker OR Quick Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeSession && !isExpired ? (
          <div
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '180px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {activeSession.status === 'paused' ? 'Session Paused' : 'Active Session'}
              </span>
            </div>
            {activeSubject && <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{activeSubject.name}</span>}
            <span style={{ fontSize: '1.25rem', fontWeight: '600', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
              {fmtSecs(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={handleResume}
              style={{
                marginTop: '2px',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                borderRadius: 'var(--radius-xs)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {activeSession.status === 'paused' ? <Play size={12} /> : <ArrowRight size={12} />}
              <span>{activeSession.status === 'paused' ? 'Resume Session' : 'Continue Study'}</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {streak > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                  <Flame size={12} color="#f59e0b" />
                  <span>Streak</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-text-primary)', lineHeight: 1.1, marginTop: '2px' }}>
                  {streak}d
                </div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                <Timer size={12} color="var(--color-accent)" />
                <span>Today</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-text-primary)', lineHeight: 1.1, marginTop: '2px' }}>
                {fmtMins(todayMins)}
              </div>
            </div>
            {goal?.targetTotalChapters && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                  <BookOpen size={12} color="var(--color-revision)" />
                  <span>Goal</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-text-primary)', lineHeight: 1.1, marginTop: '2px' }}>
                  {progressPct}%
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 2. Goal Progress Card ────────────────────────────────────────────────────

const GoalDetailCard: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { goalProgress, loading } = useGoal();

  if (loading) return <div style={BASE_CARD}><SkeletonBlock rows={3} /></div>;

  if (!goalProgress?.goal) {
    return (
      <div style={{ ...BASE_CARD, border: '1px dashed var(--color-border)' }}>
        <EmptyState
          icon={<Target size={28} />}
          title="No Active Exam Goal"
          desc="Set a target exam date to calculate daily chapter pace and stay on track."
          action="Set Exam Goal"
          onAction={() => onNavigate('planner')}
        />
      </div>
    );
  }

  const { goal, daysRemaining, weeksRemaining, requiredMinutesPerDay, requiredChaptersPerDay, projectedCompletionDate, completedChapters, remainingChapters, statusBadge } = goalProgress;
  const targetCh = goal.targetTotalChapters ?? 0;
  const pct = targetCh > 0 ? Math.min(100, Math.round((completedChapters / targetCh) * 100)) : 0;
  const bc = badgeCfg(statusBadge);

  return (
    <div style={BASE_CARD}>
      {/* Header: Goal title & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} color="var(--color-accent)" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{goal.examName}</h3>
          <Badge label={bc.label} bg={bc.bg} border={bc.border} text={bc.text} size="sm" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Target: <strong>{projectedCompletionDate}</strong> ({daysRemaining}d / {weeksRemaining}wks left)
          </span>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.72rem',
              padding: '2px 8px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Edit Goal
          </button>
        </div>
      </div>

      {/* Progress Bar & Details */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          <span>
            Overall Progress: <strong style={{ color: 'var(--color-text-primary)' }}>{completedChapters} / {targetCh} Chapters</strong>
          </span>
          <span style={{ fontWeight: '600', color: 'var(--color-accent)' }}>{pct}% Complete</span>
        </div>
        <div style={{ height: '6px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-accent)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Connected 4-Stat Metric Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'Completed', value: `${completedChapters} ch`, accent: false },
          { label: 'Remaining', value: `${remainingChapters} ch`, accent: false },
          { label: 'Daily Pace', value: `${requiredMinutesPerDay}m/day`, accent: true },
          { label: 'Chapters/Day', value: requiredChaptersPerDay.toFixed(1), accent: false },
        ].map((s) => (
          <div key={s.label} style={{ padding: '8px 10px', backgroundColor: 'var(--color-bg-primary)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: s.accent ? 'var(--color-accent)' : 'var(--color-text-primary)', marginTop: '2px' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── 3. Planner Widget ────────────────────────────────────────────────────────

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

  const priorityBadge = (p: string) => {
    if (p === 'high') return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: 'rgba(239, 68, 68, 0.25)' };
    if (p === 'medium') return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' };
    return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: 'rgba(16, 185, 129, 0.25)' };
  };

  if (isLoading) return <SkeletonBlock rows={3} />;

  const visiblePlanned = planned.slice(0, 3);
  const visibleCompleted = visiblePlanned.length < 2 ? completedTasks.slice(0, 2 - visiblePlanned.length) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Yesterday pending banner */}
      {yesterdayPending.length > 0 && (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b' }}>
            <Clock size={13} />
            <span>Yesterday's Pending ({yesterdayPending.length})</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Reschedule
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round((completedCount / total) * 100)}%`,
                height: '100%',
                backgroundColor: 'var(--color-success)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            {completedCount}/{total} done
          </span>
        </div>
      )}

      {/* In Progress Task */}
      {inProgress.length > 0 && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(37,99,235,0.06)',
            border: '1px solid var(--color-accent)',
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Play size={10} />
            <span>In Progress</span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)', marginTop: '2px' }}>{inProgress[0].title}</div>
        </div>
      )}

      {/* Planned Tasks */}
      {visiblePlanned.map((t) => {
        const subj = subjects.find((s) => s.id === t.subjectId);
        const pb = priorityBadge(t.priority);
        return (
          <div
            key={t.id}
            style={{
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                {subj?.name}
                {t.estimatedDurationMinutes ? ` • ${t.estimatedDurationMinutes}m` : ''}
              </div>
            </div>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: '600',
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: pb.bg,
                color: pb.color,
                border: `1px solid ${pb.border}`,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {t.priority}
            </span>
          </div>
        );
      })}

      {/* Completed Tasks Filler */}
      {visibleCompleted.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            opacity: 0.6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>{t.title}</div>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={12} />
            <span>Done</span>
          </span>
        </div>
      ))}

      {tasks.length === 0 && (
        <EmptyState
          icon={<Calendar size={24} />}
          title="No Tasks Planned Today"
          desc="Organize study blocks to maximize learning efficiency."
          action="Add Task"
          onAction={() => onNavigate('planner')}
        />
      )}

      {planned.length > 3 && (
        <button
          type="button"
          onClick={() => onNavigate('planner')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-accent)',
            fontSize: '0.75rem',
            fontWeight: '500',
            cursor: 'pointer',
            textAlign: 'left',
            marginTop: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <span>+{planned.length - 3} more tasks</span>
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
};

// ─── 4. Revision Widget ───────────────────────────────────────────────────────

const RevisionWidget: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { items, loading } = useRevision();
  const { subjects } = useStudy();

  const overdue = items.filter((r) => r.status === 'overdue');
  const dueToday = items.filter((r) => r.status === 'due_today');
  const upcoming = items.filter((r) => r.status === 'scheduled').slice(0, 2);
  const visible = [...overdue.slice(0, 2), ...dueToday.slice(0, 2), ...upcoming];

  if (loading) return <SkeletonBlock rows={3} />;

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<RotateCcw size={24} />}
        title="All Caught Up!"
        desc="No revisions due. Completed study sessions generate revision schedules automatically."
        action="Start Study"
        onAction={() => onNavigate('study')}
      />
    );
  }

  const stLabel = (s: string) => {
    if (s === 'overdue') return { label: 'Overdue', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)', text: 'var(--color-error)' };
    if (s === 'due_today') return { label: 'Due Today', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.25)', text: 'var(--color-revision)' };
    return { label: 'Upcoming', bg: 'var(--color-bg-primary)', border: 'var(--color-border)', text: 'var(--color-text-muted)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {overdue.length > 0 && (
        <div
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontSize: '0.72rem',
            color: 'var(--color-error)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <AlertTriangle size={13} />
          <span>
            {overdue.length} overdue revision{overdue.length > 1 ? 's' : ''} — action required
          </span>
        </div>
      )}

      {visible.map((r) => {
        const subj = subjects.find((s) => s.id === r.subjectId);
        const st = stLabel(r.status);
        const isOverdue = r.status === 'overdue';

        return (
          <div
            key={r.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg-primary)',
              border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'var(--color-border)'}`,
              gap: '8px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '500', color: isOverdue ? 'var(--color-error)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subj?.name ?? 'Subject'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                Stage {r.revisionStage}
                {r.retentionScore > 0 ? ` • ${r.retentionScore}% retention` : ''}
              </div>
            </div>
            <Badge label={st.label} bg={st.bg} border={st.border} text={st.text} />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onNavigate('revision')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-accent)',
          fontSize: '0.75rem',
          fontWeight: '500',
          cursor: 'pointer',
          textAlign: 'left',
          marginTop: '2px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        <span>View all revisions</span>
        <ChevronRight size={13} />
      </button>
    </div>
  );
};

// ─── 5. Achievements Summary ──────────────────────────────────────────────────

const AchievementWidget: React.FC = () => {
  const { dashboard } = useAnalytics();
  const { items: revItems } = useRevision();

  const prod = dashboard?.productivitySummary;
  const learn = dashboard?.learningSummary;
  const streak = prod?.currentStreakDays ?? 0;
  const totalHours = Math.round((learn?.totalFocusTimeMinutes ?? 0) / 60);
  const doneRevisions = revItems.filter((r) => r.status === 'completed').length;

  const cells = [
    { icon: <Flame size={16} color="#f59e0b" />, value: `${streak}d`, label: 'Streak' },
    { icon: <Timer size={16} color="var(--color-accent)" />, value: `${totalHours}h`, label: 'Focus' },
    { icon: <CheckCircle2 size={16} color="var(--color-success)" />, value: `${doneRevisions}`, label: 'Revised' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        backgroundColor: 'var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          style={{
            padding: '8px 10px',
            backgroundColor: 'var(--color-bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {c.icon}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{c.value}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── 6. Quick Actions ─────────────────────────────────────────────────────────

const QuickActions: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const actions = [
    { icon: <Play size={16} />, label: 'Start Study', nav: 'study' as NavModule, primary: true },
    { icon: <Calendar size={16} />, label: 'Planner', nav: 'planner' as NavModule },
    { icon: <RotateCcw size={16} />, label: 'Revision', nav: 'revision' as NavModule },
    { icon: <BarChart3 size={16} />, label: 'Analytics', nav: 'analytics' as NavModule },
    { icon: <Target size={16} />, label: 'Set Goal', nav: 'planner' as NavModule },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px' }}>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onNavigate(a.nav)}
          aria-label={a.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 8px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${a.primary ? 'var(--color-accent)' : 'var(--color-border)'}`,
            backgroundColor: a.primary ? 'rgba(37,99,235,0.06)' : 'var(--color-bg-primary)',
            color: a.primary ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {a.icon}
          <span style={{ fontSize: '0.72rem', fontWeight: '500', whiteSpace: 'nowrap' }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── 7. Recent Activity ───────────────────────────────────────────────────────

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
      icon: <BookOpen size={14} color="var(--color-accent)" />,
      label: `Study — ${fmtMins(Math.round(lastSession.durationSeconds / 60))}`,
      sub: smartTime(lastSession.startTime),
      badge: { label: 'Done', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', text: 'var(--color-success)' },
    },
    lastTask && {
      icon: <CheckCircle2 size={14} color="var(--color-success)" />,
      label: lastTask.title,
      sub: smartTime(lastTask.completedAt),
      badge: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', text: 'var(--color-success)' },
    },
    lastRev && {
      icon: <RotateCcw size={14} color="var(--color-revision)" />,
      label: `${subjects.find((s) => s.id === lastRev.subjectId)?.name ?? 'Revision'} • Stage ${lastRev.revisionStage}`,
      sub: smartTime(lastRev.lastRevisionAt),
      badge: { label: 'Revised', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.25)', text: 'var(--color-revision)' },
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string; sub: string; badge: { label: string; bg: string; border: string; text: string } }>;

  if (entries.length === 0) {
    return <EmptyState icon={<Clock size={22} />} title="No Recent Activity" desc="Complete a study session or task to build your timeline." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {entries.map((e, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {e.icon}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.label}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{e.sub}</div>
            </div>
          </div>
          <Badge label={e.badge.label} bg={e.badge.bg} border={e.badge.border} text={e.badge.text} />
        </div>
      ))}
    </div>
  );
};

// ─── 8. Sticky Session Banner ─────────────────────────────────────────────────

const SessionBanner: React.FC<{ onNavigate: (m: NavModule) => void; isExpired?: boolean }> = ({ onNavigate, isExpired }) => {
  const { activeSession } = useStudy();

  if (!activeSession || isExpired) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        bottom: '16px',
        zIndex: 50,
        padding: '10px 18px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-accent)',
        color: 'var(--color-text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>
          {activeSession.status === 'paused' ? 'Study session paused' : 'Study session in progress'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('study')}
        style={{
          backgroundColor: 'var(--color-accent)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-xs)',
          padding: '4px 12px',
          fontSize: '0.78rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span>Open Study</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
};

// ─── Trial / Subscription Status Card ─────────────────────────────────────────

function formatRemainingTime(expiresAtIso?: string | null): string {
  if (!expiresAtIso) return 'Active';
  try {
    const diff = new Date(expiresAtIso).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    if (days > 1) return `${days} days left`;
    if (days === 1) return `1 day, ${hours} hrs left`;
    if (hours > 0) return `${hours} hrs, ${minutes} mins left`;
    return `${minutes} mins left`;
  } catch {
    return 'Active';
  }
}

const TrialCountdownBanner: React.FC<{
  entitlement: EntitlementDto | null;
  onUpgrade: () => void;
}> = ({ entitlement, onUpgrade }) => {
  const isPaid = entitlement?.isPaid === true;
  const isExpired = entitlement?.status === 'expired';
  const isActivePaid = isPaid && !isExpired;
  const remainingTime = formatRemainingTime(entitlement?.expiresAt);

  if (isActivePaid) {
    return null;
  }

  if (isExpired) {
    const isPaidExpired = entitlement?.isPaid === true || entitlement?.currentPlanId === 'monthly' || entitlement?.currentPlanId === 'yearly';
    const expiredTitle = isPaidExpired ? 'Student OS Pro Ended' : '7-Day Free Trial Ended';
    const expiredSubtitle = isPaidExpired
      ? 'Your study data is safely preserved. Renew to continue full access.'
      : 'Upgrade to continue using Student OS. Your notes and study logs are safely saved.';

    return (
      <div
        style={{
          ...BASE_CARD,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(239, 68, 68, 0.06)',
          borderColor: 'rgba(239, 68, 68, 0.25)',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: 'var(--color-error)' }}><AlertTriangle size={20} /></div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-error)' }}>{expiredTitle}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{expiredSubtitle}</div>
          </div>
        </div>
        <Button
          type="button"
          onClick={onUpgrade}
          style={{
            backgroundColor: 'var(--color-error)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: '600',
            height: '30px',
            padding: '0 14px',
            flexShrink: 0,
          }}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  // ACTIVE FREE TRIAL
  return (
    <div
      style={{
        ...BASE_CARD,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'rgba(37, 99, 235, 0.25)',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color: 'var(--color-accent)' }}><Timer size={20} /></div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>7-Day Free Trial</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--color-accent)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {remainingTime}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Enjoy full access to all Student OS modules</div>
        </div>
      </div>
      <Button
        type="button"
        onClick={onUpgrade}
        style={{
          backgroundColor: 'var(--color-accent)',
          color: '#ffffff',
          border: 'none',
          fontSize: '0.78rem',
          fontWeight: '600',
          height: '30px',
          padding: '0 14px',
          flexShrink: 0,
        }}
      >
        Upgrade
      </Button>
    </div>
  );
};

// ─── DashboardPage Root Component ─────────────────────────────────────────────

export interface DashboardPageProps {
  onNavigate: (module: NavModule) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { profile } = useAccount();
  const { token, deviceId, account } = useAuth();
  const { todaySummary } = useStudy();
  const { todaySummary: plannerToday, isLoading: plannerLoading } = usePlanner();
  const { summary: revSummary } = useRevision();

  const displayName = profile?.fullName || 'Student';
  const accountEmail = account?.email || 'student@digicomfy.com';

  const [entitlement, setEntitlement] = useState<EntitlementDto | null>(null);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigDto | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  useEffect(() => {
    EntitlementService.getEntitlement().then(setEntitlement);
    EntitlementService.getPlans().then(setPlans);
    EntitlementService.getPaymentConfig().then(setPaymentConfig);
  }, []);

  const [yesterdayPlan, setYesterdayPlan] = useState<DailyPlanSummaryDTO | null>(null);

  const fetchYesterday = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/tasks/today?date=${isoDateOffset(-1)}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-device-id': deviceId },
      });
      const json = await res.json();
      if (json.success && json.data) setYesterdayPlan(json.data);
    } catch {
      /* offline */
    }
  }, [token, deviceId]);

  useEffect(() => {
    fetchYesterday();
  }, [fetchYesterday]);

  const studyMins = todaySummary ? Math.round(todaySummary.totalDurationSeconds / 60) : 0;
  const studySessions = todaySummary?.completedSessionsCount ?? 0;
  const revMins = revSummary ? Math.round((revSummary.totalRevisionSecondsToday ?? 0) / 60) : 0;
  const tasksDone = plannerToday?.completedTasksCount ?? 0;
  const tasksTotal = plannerToday?.totalTasksCount ?? 0;
  const plannerPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const isExpired = entitlement?.status === 'expired';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'var(--font-family-base)', maxWidth: '100%' }}>
      {/* 1. Greeting & Identity Header */}
      <HeroSection displayName={displayName} onNavigate={onNavigate} isExpired={isExpired} />

      {/* 2. Free Trial / Expired Access Card */}
      <TrialCountdownBanner entitlement={entitlement} onUpgrade={() => setShowUpgradeModal(true)} />

      {/* 3. Primary 4 Study Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        <CompactStat icon={<Timer size={16} />} label="Focus Time" value={fmtMins(studyMins)} sub={`${studySessions} session${studySessions !== 1 ? 's' : ''} today`} accentColor="var(--color-study)" />
        <CompactStat icon={<RotateCcw size={16} />} label="Rev. Time" value={fmtMins(revMins)} sub="today's review" accentColor="var(--color-revision)" />
        <CompactStat icon={<CheckCircle2 size={16} />} label="Tasks Done" value={`${tasksDone}/${tasksTotal}`} sub="completed" accentColor="var(--color-success)" />
        <CompactStat icon={<BarChart3 size={16} />} label="Planner" value={plannerLoading ? '…' : `${plannerPct}%`} sub="accuracy" accentColor="var(--color-success)" />
      </div>

      {/* 4. Structured Exam Goal Progress */}
      <GoalDetailCard onNavigate={onNavigate} />

      {/* 5. Two-Column Workspace: Planner + Revisions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        <div style={{ ...BASE_CARD, display: 'flex', flexDirection: 'column' }}>
          <SH icon={<Calendar size={16} />} title="Today's Study Plan" action="Open Planner" onAction={() => onNavigate('planner')} />
          <PlannerWidget onNavigate={onNavigate} yesterdayPlan={yesterdayPlan} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={BASE_CARD}>
            <SH icon={<RotateCcw size={16} />} title="Upcoming Revisions" action="View All" onAction={() => onNavigate('revision')} />
            <RevisionWidget onNavigate={onNavigate} />
          </div>
          <div style={BASE_CARD}>
            <SH icon={<Award size={16} />} title="Achievements" action="Analytics" onAction={() => onNavigate('analytics')} />
            <AchievementWidget />
          </div>
        </div>
      </div>

      {/* 6. Activity Heatmap + Quick Actions + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        <div style={BASE_CARD}>
          <SH icon={<Calendar size={16} />} title="Activity Heatmap" action="Monthly View" onAction={() => onNavigate('planner')} />
          <ActivityHeatmap onOpenPlanner={() => onNavigate('planner')} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={BASE_CARD}>
            <SH icon={<Zap size={16} />} title="Quick Actions" />
            <QuickActions onNavigate={onNavigate} />
          </div>
          <div style={BASE_CARD}>
            <SH icon={<Clock size={16} />} title="Recent Activity" />
            <RecentActivity />
          </div>
        </div>
      </div>

      {/* 7. Sticky Session Banner */}
      <SessionBanner onNavigate={onNavigate} isExpired={isExpired} />

      {/* 8. Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        plans={plans}
        contactWhatsApp={paymentConfig?.contactWhatsApp}
        accountEmail={accountEmail}
        entitlement={entitlement}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};
