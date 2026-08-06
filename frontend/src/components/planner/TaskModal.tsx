import React, { useState, useEffect } from 'react';
import { Button } from '@student-os/ui';
import { PlannerTaskDTO, CreatePlannerTaskInput } from '@student-os/shared';
import { useStudy } from '../../context/StudyContext.js';

interface TaskModalProps {
  isOpen: boolean;
  taskToEdit?: PlannerTaskDTO | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (input: CreatePlannerTaskInput) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, taskToEdit, defaultDate, onClose, onSave }) => {
  const { subjects, chapters } = useStudy();

  const [subjectId, setSubjectId] = useState<string>('');
  const [chapterId, setChapterId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [plannedStartTime, setPlannedStartTime] = useState<string>('');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number>(30);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (taskToEdit) {
      setSubjectId(taskToEdit.subjectId);
      setChapterId(taskToEdit.chapterId || '');
      setTitle(taskToEdit.title);
      setPlannedDate(taskToEdit.plannedDate);
      setPlannedStartTime(taskToEdit.plannedStartTime || '');
      setEstimatedDurationMinutes(taskToEdit.estimatedDurationMinutes);
      setPriority(taskToEdit.priority);
      setNotes(taskToEdit.notes || '');
    } else {
      setSubjectId(subjects.length > 0 ? subjects[0].id : '');
      setChapterId('');
      setTitle('');
      setPlannedDate(defaultDate || new Date().toISOString().split('T')[0]);
      setPlannedStartTime('');
      setEstimatedDurationMinutes(30);
      setPriority('medium');
      setNotes('');
    }
  }, [taskToEdit, isOpen, defaultDate, subjects]);

  if (!isOpen) return null;

  const availableChapters = chapters.filter((c) => c.subjectId === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !title.trim() || !plannedDate) return;

    try {
      setIsSubmitting(true);
      await onSave({
        subjectId,
        chapterId: chapterId || null,
        title: title.trim(),
        plannedDate,
        plannedStartTime: plannedStartTime ? plannedStartTime : null,
        estimatedDurationMinutes: Number(estimatedDurationMinutes),
        priority,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      // Handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--spacing-md)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h3
          id="task-modal-title"
          style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)' }}
        >
          {taskToEdit ? 'Edit Study Block' : 'Create Study Block'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Subject Selector */}
          <div>
            <label htmlFor="task-subject" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Subject *
            </label>
            <select
              id="task-subject"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setChapterId('');
              }}
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
                boxSizing: 'border-box',
              }}
            >
              {subjects.length === 0 ? (
                <option value="">-- No Subjects Available (Create one in Study Module) --</option>
              ) : (
                subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Chapter Selector */}
          {subjectId && availableChapters.length > 0 && (
            <div>
              <label htmlFor="task-chapter" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                Chapter (Optional)
              </label>
              <select
                id="task-chapter"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-base)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">-- No Specific Chapter --</option>
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isCompleted ? '(Completed)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label htmlFor="task-title" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Study Objective / Title *
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Electrostatics Practice Questions"
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Date & Time */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label htmlFor="task-date" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                Planned Date *
              </label>
              <input
                id="task-date"
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-base)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '140px' }}>
              <label htmlFor="task-time" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                Start Time (Optional)
              </label>
              <input
                id="task-time"
                type="time"
                value={plannedStartTime}
                onChange={(e) => setPlannedStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-base)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Duration & Priority */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label htmlFor="task-duration" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                Estimated Duration (Minutes) *
              </label>
              <select
                id="task-duration"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-base)',
                  boxSizing: 'border-box',
                }}
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={90}>1.5 Hours</option>
                <option value={120}>2 Hours</option>
                <option value={180}>3 Hours</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '140px' }}>
              <label htmlFor="task-priority" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                Priority Level *
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-base)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="high">🔥 High (Must Complete Today)</option>
                <option value="medium">⚡ Medium (Should Complete)</option>
                <option value="low">🌱 Low (Can Postpone)</option>
              </select>
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label htmlFor="task-notes" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              Personal Notes (Optional)
            </label>
            <textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key formulas, references, or specific chapter problems..."
              rows={3}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} style={{ height: '36px', fontSize: '0.85rem' }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !title.trim() || !subjectId} style={{ height: '36px', fontSize: '0.85rem' }}>
              {isSubmitting ? 'Saving...' : taskToEdit ? 'Update Study Block' : 'Save Study Block'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
