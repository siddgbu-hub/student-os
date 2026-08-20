import React, { useState, useEffect } from 'react';
import { MonthlyPlanSummaryDTO } from '@student-os/shared';
import { Button } from '@student-os/ui';
import { API_BASE_URL } from '@/config/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyCalendarProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ selectedDate, onSelectDate }) => {
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return d.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return d.getMonth() + 1;
  });

  const [summary, setSummary] = useState<MonthlyPlanSummaryDTO | null>(null);

  useEffect(() => {
    const fetchMonthlySummary = async () => {
      try {
        const token = localStorage.getItem('student_os_session_token');
        const res = await fetch(`${API_BASE_URL}/api/v1/planner/monthly?year=${currentYear}&month=${currentMonth}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setSummary(json.data);
          }
        }
      } catch (err) {
        console.warn('Failed to load monthly summary', err);
      }
    };
    fetchMonthlySummary();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', { month: 'long' });
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate day-of-week offset for 1st day of month
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun
  const calDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const emptyLeadingDays = Array.from({ length: firstDayOfWeek });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Month Summary Card Top Banner */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--spacing-xs)',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>Planned Hours</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{summary.plannedHours}h</div>
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>Completed Hours</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-accent)' }}>{summary.completedHours}h</div>
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>Completion Rate</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: summary.completionPercentage >= 75 ? 'var(--color-success)' : '#f59e0b' }}>{summary.completionPercentage}%</div>
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>Active Study Days</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{summary.studyStreakDays} days</div>
          </div>
        </div>
      )}

      {/* Calendar Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
          {monthName} {currentYear}
        </h3>

        <div style={{ display: 'flex', gap: '6px' }}>
          <Button type="button" variant="secondary" onClick={handlePrevMonth} style={{ fontSize: '0.78rem', padding: '4px 10px', height: '30px', gap: '3px' }}>
            <ChevronLeft size={13} />
            <span>Prev</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const now = new Date();
              setCurrentYear(now.getFullYear());
              setCurrentMonth(now.getMonth() + 1);
            }}
            style={{ fontSize: '0.78rem', padding: '4px 10px', height: '30px' }}
          >
            Today
          </Button>
          <Button type="button" variant="secondary" onClick={handleNextMonth} style={{ fontSize: '0.78rem', padding: '4px 10px', height: '30px', gap: '3px' }}>
            <span>Next</span>
            <ChevronRight size={13} />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--color-text-secondary)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {emptyLeadingDays.map((_, idx) => (
          <div key={`empty-${idx}`} style={{ minHeight: '80px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent' }} />
        ))}

        {Array.from({ length: calDaysInMonth }, (_, i) => {
          const day = summary?.days[i] || null;
          const dateNum = i + 1;
          const datePad = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
          const isToday = datePad === todayStr;
          const isSelected = datePad === selectedDate;

          return (
            <div
              key={datePad}
              onClick={() => onSelectDate(datePad)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectDate(datePad);
              }}
              style={{
                minHeight: '80px',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isToday
                  ? 'rgba(37, 99, 235, 0.08)'
                  : day?.hasActivity
                  ? 'var(--color-bg-secondary)'
                  : 'var(--color-bg-primary)',
                border: isSelected
                  ? '2px solid var(--color-accent)'
                  : isToday
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                opacity: day?.hasActivity ? 1 : 0.75,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: isToday || isSelected ? '700' : '600',
                    color: isToday ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  }}
                >
                  {dateNum}
                </span>

                {day?.studyMinutes != null && day.studyMinutes > 0 && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--color-accent)' }}>
                    {Math.round(day.studyMinutes / 60)}h {day.studyMinutes % 60}m
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                {day != null && day.plannedTasksCount > 0 && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tasks</span>
                    <span>{day.completedTasksCount}/{day.plannedTasksCount}</span>
                  </div>
                )}

                {day != null && day.revisionCount > 0 && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-revision)', fontWeight: '600' }}>
                    {day.revisionCount} revisions
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
