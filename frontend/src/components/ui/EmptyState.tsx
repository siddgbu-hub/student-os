import React from 'react';
import { Button } from '@student-os/ui';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        textAlign: 'center',
        minHeight: '200px',
        margin: 'var(--spacing-xs) 0',
      }}
    >
      {icon && (
        <div style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
          {icon}
        </div>
      )}
      <h3
        style={{
          margin: '0 0 6px 0',
          fontSize: '1.05rem',
          fontWeight: '700',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.85rem',
          margin: '0 0 var(--spacing-md) 0',
          maxWidth: '420px',
          lineHeight: '1.4',
        }}
      >
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {primaryAction && (
            <Button type="button" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button type="button" variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
