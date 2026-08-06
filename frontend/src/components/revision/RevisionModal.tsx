import React, { useState } from 'react';
import { Button } from '@student-os/ui';
import { RevisionItemDTO, SubjectDTO, ChapterDTO } from '@student-os/shared';

interface RevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { subjectId: string; chapterId?: string; scheduledDate: string; priority: 'high' | 'medium' | 'low'; notes?: string }) => Promise<void>;
  subjects: SubjectDTO[];
  chapters: ChapterDTO[];
  itemToReschedule?: RevisionItemDTO | null;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjects,
  chapters,
  itemToReschedule,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(itemToReschedule?.subjectId || subjects[0]?.id || '');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(itemToReschedule?.chapterId || '');
  const [scheduledDate, setScheduledDate] = useState<string>(
    itemToReschedule?.scheduledDate || new Date().toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(itemToReschedule?.priority || 'medium');
  const [notes, setNotes] = useState<string>(itemToReschedule?.notes || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredChapters = chapters.filter((c) => c.subjectId === selectedSubjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId && !itemToReschedule) {
      setError('Please select a subject');
      return;
    }
    if (!scheduledDate) {
      setError('Please select a scheduled date');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId || undefined,
        scheduledDate,
        priority,
        notes: notes || undefined,
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
            {itemToReschedule ? 'Reschedule Revision' : 'Schedule Revision Item'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              fontSize: '0.82rem',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {!itemToReschedule && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Subject *
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedChapterId('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Chapter (Optional)
                </label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="">-- Entire Subject --</option>
                  {filteredChapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Scheduled Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="high">🔥 High</option>
              <option value="medium">⚡ Medium</option>
              <option value="low">🌱 Low</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key concepts to focus on during revision..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} style={{ height: '36px' }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} style={{ height: '36px' }}>
              {submitting ? 'Saving...' : itemToReschedule ? 'Reschedule' : 'Create Revision'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
