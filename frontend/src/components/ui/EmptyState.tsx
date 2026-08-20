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
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        textAlign: 'center',
        minHeight: '180px',
        margin: 'var(--spacing-xs) 0',
      }}
    >
      {icon && (
        <div style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>
          {icon}
        </div>
      )}
      <h3
        style={{
          margin: '0 0 4px 0',
          fontSize: '0.95rem',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.8125rem',
          margin: '0 0 var(--spacing-md) 0',
          maxWidth: '380px',
          lineHeight: '1.45',
        }}
      >
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {primaryAction && (
            <Button type="button" onClick={primaryAction.onClick} style={{ fontSize: '0.78rem', height: '32px' }}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button type="button" variant="secondary" onClick={secondaryAction.onClick} style={{ fontSize: '0.78rem', height: '32px' }}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
