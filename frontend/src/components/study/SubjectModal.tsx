import React, { useState, useEffect } from 'react';
import { Button } from '@student-os/ui';
import { SubjectDTO } from '@student-os/shared';

interface SubjectModalProps {
  isOpen: boolean;
  subjectToEdit?: SubjectDTO | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({ isOpen, subjectToEdit, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
    } else {
      setName('');
    }
  }, [subjectToEdit, isOpen]);

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
    if (!name.trim()) return;
    try {
      setIsSubmitting(true);
      await onSave(name.trim());
      onClose();
    } catch {
      // Error handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-modal-title"
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
          maxWidth: '420px',
          backgroundColor: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        }}
      >
        <h3
          id="subject-modal-title"
          style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)' }}
        >
          {subjectToEdit ? 'Edit Subject' : 'Create New Subject'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label
              htmlFor="subject-name-input"
              style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}
            >
              Subject Name
            </label>
            <input
              id="subject-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics, Physics, Computer Science"
              required
              autoFocus
              style={{
                width: '100%',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} style={{ height: '36px', fontSize: '0.85rem' }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !name.trim()} style={{ height: '36px', fontSize: '0.85rem' }}>
              {isSubmitting ? 'Saving...' : subjectToEdit ? 'Update Subject' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
