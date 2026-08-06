import React, { useState, useEffect } from 'react';
import { Button } from '@student-os/ui';
import { ChapterDTO } from '@student-os/shared';

interface ChapterModalProps {
  isOpen: boolean;
  chapterToEdit?: ChapterDTO | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export const ChapterModal: React.FC<ChapterModalProps> = ({ isOpen, chapterToEdit, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (chapterToEdit) {
      setName(chapterToEdit.name);
    } else {
      setName('');
    }
  }, [chapterToEdit, isOpen]);

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
      aria-labelledby="chapter-modal-title"
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
          id="chapter-modal-title"
          style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)' }}
        >
          {chapterToEdit ? 'Edit Chapter' : 'Create New Chapter'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label
              htmlFor="chapter-name-input"
              style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}
            >
              Chapter Name
            </label>
            <input
              id="chapter-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chapter 1: Calculus Fundamentals"
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
              {isSubmitting ? 'Saving...' : chapterToEdit ? 'Update Chapter' : 'Create Chapter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
