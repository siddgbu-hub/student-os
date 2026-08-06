import React, { useState, useEffect } from 'react';
import { Button } from '@student-os/ui';
import { ExamGoalDTO, CreateGoalInput } from '@student-os/shared';

interface GoalModalProps {
  isOpen: boolean;
  goalToEdit?: ExamGoalDTO | null;
  onClose: () => void;
  onSave: (input: CreateGoalInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, goalToEdit, onClose, onSave, onDelete }) => {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(120);
  const [targetTotalChapters, setTargetTotalChapters] = useState<number | ''>(50);
  const [completedChapters, setCompletedChapters] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goalToEdit) {
      setExamName(goalToEdit.examName);
      setExamDate(goalToEdit.examDate);
      setTargetScore(goalToEdit.targetScore || '');
      setTargetDailyMinutes(goalToEdit.targetDailyMinutes || 120);
      setTargetTotalChapters(goalToEdit.targetTotalChapters || '');
      setCompletedChapters(goalToEdit.completedChapters || 0);
    } else {
      setExamName('');
      setExamDate(new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]);
      setTargetScore('');
      setTargetDailyMinutes(120);
      setTargetTotalChapters(50);
      setCompletedChapters(0);
    }
  }, [goalToEdit, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim() || !examDate) {
      setError('Exam name and date are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        examName: examName.trim(),
        examDate,
        targetScore: targetScore.trim() || null,
        targetDailyMinutes: Number(targetDailyMinutes),
        targetTotalChapters: targetTotalChapters ? Number(targetTotalChapters) : null,
        completedChapters: Number(completedChapters),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
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
          maxWidth: '460px',
          backgroundColor: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
        }}
      >
        <h3 id="goal-modal-title" style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--color-text-primary)' }}>
          {goalToEdit ? 'Edit Exam Goal' : 'Create Exam Goal'}
        </h3>

        {error && (
          <div style={{ color: '#991b1b', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Exam Name</label>
            <input
              type="text"
              required
              placeholder="e.g. JEE Main 2027, SAT, Final Board Exam"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Target Exam Date</label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Target Score / Grade</label>
              <input
                type="text"
                placeholder="e.g. 95%, 1500, Grade A"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Target Daily Study (mins)</label>
              <input
                type="number"
                min="15"
                max="1440"
                value={targetDailyMinutes}
                onChange={(e) => setTargetDailyMinutes(Number(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Total Target Chapters</label>
              <input
                type="number"
                min="1"
                max="500"
                value={targetTotalChapters}
                onChange={(e) => setTargetTotalChapters(e.target.value ? Number(e.target.value) : '')}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Completed Chapters</label>
            <input
              type="number"
              min="0"
              value={completedChapters}
              onChange={(e) => setCompletedChapters(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-xs)' }}>
            {goalToEdit && onDelete ? (
              <Button type="button" variant="secondary" onClick={onDelete} style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8rem' }}>
                Delete Goal
              </Button>
            ) : <div />}

            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {goalToEdit ? 'Update Goal' : 'Save Goal'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
