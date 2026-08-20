import React, { useState } from 'react';
import { Button } from '@student-os/ui';
import { Flame, Zap, CheckCircle2, Clock, Calendar, FileText, AlertCircle, Plus } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext.js';
import { useStudy } from '../../context/StudyContext.js';
import { TaskModal } from '../../components/planner/TaskModal.js';
import { PlannerTaskDTO, SubjectDTO, ChapterDTO, ReschedulePlannerTaskInput } from '@student-os/shared';

import { MonthlyCalendar } from '../../components/planner/MonthlyCalendar.js';
import { GoalSummaryCard } from '../../components/goal/GoalSummaryCard.js';
import { GoalModal } from '../../components/goal/GoalModal.js';
import { useGoal } from '../../context/GoalContext.js';

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const PlannerPage: React.FC = () => {
  const {
    todaySummary,
    weeklySummary,
    selectedDate,
    errorMessage,
    setSelectedDate,
    createTask,
    updateTask,
    updateTaskStatus,
    rescheduleTask,
    deleteTask,
  } = usePlanner();

  const { subjects, chapters } = useStudy();
  const { goalProgress, saveGoal, updateGoal, deleteGoal } = useGoal();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<PlannerTaskDTO | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);

  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: PlannerTaskDTO) => {
    setTaskToEdit(t);
    setIsModalOpen(true);
  };

  const tasks = todaySummary?.tasks || [];
  const highPriorityTasks = tasks.filter((t) => t.priority === 'high' && t.status !== 'completed');
  const mediumPriorityTasks = tasks.filter((t) => t.priority === 'medium' && t.status !== 'completed');
  const lowPriorityTasks = tasks.filter((t) => t.priority === 'low' && t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const completionPercentage =
    todaySummary && todaySummary.totalTasksCount > 0
      ? Math.round((todaySummary.completedTasksCount / todaySummary.totalTasksCount) * 100)
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', fontFamily: 'var(--font-family-base)' }}>
      {/* Error Alert */}
      {errorMessage && (
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
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PLANNER PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
            Academic Planner
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
            Transform intentions into structured, executable study blocks
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {/* TAB TOGGLE BUTTONS */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'daily' ? 'var(--color-bg-primary)' : 'transparent',
                color: activeTab === 'daily' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'daily' ? '600' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Daily Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'weekly' ? 'var(--color-bg-primary)' : 'transparent',
                color: activeTab === 'weekly' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'weekly' ? '600' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'weekly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Weekly Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'monthly' ? 'var(--color-bg-primary)' : 'transparent',
                color: activeTab === 'monthly' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'monthly' ? '600' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Monthly Calendar
            </button>
          </div>

          <Button type="button" variant="primary" onClick={handleOpenCreateModal} style={{ height: '36px', fontSize: '0.85rem' }}>
            + New Study Block
          </Button>
        </div>
      </div>

      {/* DASHBOARD GOAL CARD */}
      <GoalSummaryCard
        progress={goalProgress}
        onEdit={() => setIsGoalModalOpen(true)}
        onCreate={() => setIsGoalModalOpen(true)}
      />

      {/* VIEW CONTENT */}
      {activeTab === 'monthly' ? (
        <MonthlyCalendar
          selectedDate={selectedDate}
          onSelectDate={(dateStr) => {
            setSelectedDate(dateStr);
            setActiveTab('daily');
          }}
        />
      ) : activeTab === 'daily' ? (
        /* DAILY PLANNER VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* DAILY PLAN DATE PICKER & METRIC CARDS */}
          <div
            style={{
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Selected Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* 4 COMPACT METRIC CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--spacing-sm)' }}>
              <div
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                  Total Planned
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {formatMinutes(todaySummary?.totalPlannedDurationMinutes || 0)}
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                  Completed
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-accent)', marginTop: '2px' }}>
                  {formatMinutes(todaySummary?.completedDurationMinutes || 0)}
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                  Remaining
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {formatMinutes(Math.max(0, (todaySummary?.totalPlannedDurationMinutes || 0) - (todaySummary?.completedDurationMinutes || 0)))}
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                  Completion Rate
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: completionPercentage === 100 ? '#166534' : 'var(--color-text-primary)', marginTop: '2px' }}>
                  {completionPercentage}%
                </div>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${completionPercentage}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-accent)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* TASKS LIST / EMPTY STATE */}
          {tasks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl) var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginBottom: '8px' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
                Nothing planned for today.
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0 0 var(--spacing-md) 0' }}>
                Create your first Study Block to begin organizing your day.
              </p>
              <Button type="button" variant="primary" onClick={handleOpenCreateModal} style={{ height: '36px', fontSize: '0.85rem' }}>
                + Create Study Block
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {/* HIGH PRIORITY SECTION */}
              {highPriorityTasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-error)', marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={14} />
                    <span>High Priority Tasks</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {highPriorityTasks.map((t) => (
                      <TaskItemCard
                        key={t.id}
                        task={t}
                        subjects={subjects}
                        chapters={chapters}
                        onStatusChange={updateTaskStatus}
                        onReschedule={rescheduleTask}
                        onEdit={handleOpenEditModal}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* MEDIUM PRIORITY SECTION */}
              {mediumPriorityTasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f59e0b', marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} />
                    <span>Medium Priority Tasks</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {mediumPriorityTasks.map((t) => (
                      <TaskItemCard
                        key={t.id}
                        task={t}
                        subjects={subjects}
                        chapters={chapters}
                        onStatusChange={updateTaskStatus}
                        onReschedule={rescheduleTask}
                        onEdit={handleOpenEditModal}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* LOW PRIORITY SECTION */}
              {lowPriorityTasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-success)', marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} />
                    <span>Low Priority Tasks</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {lowPriorityTasks.map((t) => (
                      <TaskItemCard
                        key={t.id}
                        task={t}
                        subjects={subjects}
                        chapters={chapters}
                        onStatusChange={updateTaskStatus}
                        onReschedule={rescheduleTask}
                        onEdit={handleOpenEditModal}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* COMPLETED TASKS SECTION */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} />
                    <span>Completed Tasks ({completedTasks.length})</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {completedTasks.map((t) => (
                      <TaskItemCard
                        key={t.id}
                        task={t}
                        subjects={subjects}
                        chapters={chapters}
                        onStatusChange={updateTaskStatus}
                        onReschedule={rescheduleTask}
                        onEdit={handleOpenEditModal}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* WEEKLY OVERVIEW VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Week of {weeklySummary?.startDate || selectedDate} to {weeklySummary?.endDate || selectedDate}
            </span>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Weekly Workload: <strong>{formatMinutes(weeklySummary?.totalPlannedDurationMinutes || 0)} Planned</strong> •{' '}
              <strong style={{ color: 'var(--color-accent)' }}>{formatMinutes(weeklySummary?.completedDurationMinutes || 0)} Completed</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-sm)' }}>
            {(weeklySummary?.dailySummaries || []).map((daySummary) => {
              const dayDate = new Date(`${daySummary.date}T00:00:00.000Z`);
              const dayName = dayDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
              const isSelectedDay = daySummary.date === selectedDate;

              return (
                <div
                  key={daySummary.date}
                  onClick={() => {
                    setSelectedDate(daySummary.date);
                    setActiveTab('daily');
                  }}
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: isSelectedDay ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '160px',
                  }}
                >
                  <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '6px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>{dayName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                      {formatMinutes(daySummary.totalPlannedDurationMinutes)} • {daySummary.tasks.length} block(s)
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                    {daySummary.tasks.length === 0 ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 'auto 0' }}>
                        No plan
                      </span>
                    ) : (
                      daySummary.tasks.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            padding: '3px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: t.status === 'completed' ? '#dcfce7' : 'var(--color-bg-primary)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: '600',
                              color: t.status === 'completed' ? '#166534' : 'var(--color-text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{t.estimatedDurationMinutes}m</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TASK CREATE / EDIT MODAL */}
      <TaskModal
        isOpen={isModalOpen}
        taskToEdit={taskToEdit}
        defaultDate={selectedDate}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={async (input) => {
          if (taskToEdit) {
            await updateTask(taskToEdit.id, input);
          } else {
            await createTask(input);
          }
        }}
      />

      {/* GOAL CREATION & EDIT MODAL */}
      <GoalModal
        isOpen={isGoalModalOpen}
        goalToEdit={goalProgress?.goal || null}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={async (input) => {
          if (goalProgress?.goal) {
            await updateGoal(input);
          } else {
            await saveGoal(input);
          }
        }}
        onDelete={goalProgress?.goal ? async () => {
          if (confirm(`Delete exam goal "${goalProgress.goal.examName}"?`)) {
            await deleteGoal();
            setIsGoalModalOpen(false);
          }
        } : undefined}
      />
    </div>
  );
};

/* INDIVIDUAL TASK ITEM CARD COMPONENT */
interface TaskItemCardProps {
  task: PlannerTaskDTO;
  subjects: SubjectDTO[];
  chapters: ChapterDTO[];
  onStatusChange: (id: string, status: PlannerTaskDTO['status']) => Promise<PlannerTaskDTO>;
  onReschedule: (id: string, input: ReschedulePlannerTaskInput) => Promise<PlannerTaskDTO>;
  onEdit: (task: PlannerTaskDTO) => void;
  onDelete: (id: string) => Promise<void>;
}

const TaskItemCard: React.FC<TaskItemCardProps> = ({
  task,
  subjects,
  chapters,
  onStatusChange,
  onReschedule,
  onEdit,
  onDelete,
}) => {
  const subject = subjects.find((s) => s.id === task.subjectId);
  const chapter = chapters.find((c) => c.id === task.chapterId);

  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';

  return (
    <div
      style={{
        padding: 'var(--spacing-xs) var(--spacing-sm)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        backgroundColor: isCompleted ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, overflow: 'hidden' }}>
        {/* COMPLETION CHECKBOX */}
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={(e) => onStatusChange(task.id, e.target.checked ? 'completed' : 'planned')}
          style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
        />

        <div style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: isCompleted ? '400' : '600',
                fontSize: '0.88rem',
                color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </span>

            {/* SUBJECT & CHAPTER TAG */}
            <span
              style={{
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {subject?.name || 'Subject'} {chapter ? `• ${chapter.name}` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Clock size={12} /> {task.estimatedDurationMinutes} mins</span>
            {task.plannedStartTime && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Calendar size={12} /> {task.plannedStartTime}</span>}
            {task.notes && <span style={{ fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><FileText size={12} /> {task.notes}</span>}
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {!isCompleted && (
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'move_tomorrow') {
                onReschedule(task.id, { plannedDate: task.plannedDate, action: 'move_tomorrow' });
              } else if (val === 'move_this_week') {
                onReschedule(task.id, { plannedDate: task.plannedDate, action: 'move_this_week' });
              } else if (val === 'skipped') {
                onStatusChange(task.id, 'skipped');
              }
            }}
            style={{
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>
              Reschedule...
            </option>
            <option value="move_tomorrow">Move to Tomorrow</option>
            <option value="move_this_week">Move to This Week</option>
            <option value="skipped">Mark Skipped</option>
          </select>
        )}

        {!isCompleted && (
          <button
            type="button"
            onClick={() => onEdit(task)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '0.78rem', padding: '2px 4px' }}
          >
            Edit
          </button>
        )}

        {!isCompleted && !isInProgress && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete study block "${task.title}"?`)) {
                onDelete(task.id);
              }
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.78rem', padding: '2px 4px' }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
