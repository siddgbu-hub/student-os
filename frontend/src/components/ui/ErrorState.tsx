import React from 'react';
import { Button } from '@student-os/ui';
import { AlertCircle } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'An error occurred while loading or processing data. Please try again.',
  onRetry,
}) => {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        textAlign: 'center',
        minHeight: '180px',
        margin: 'var(--spacing-xs) 0',
      }}
    >
      <div style={{ color: 'var(--color-error)', marginBottom: '8px' }}>
        <AlertCircle size={28} />
      </div>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.82rem',
          margin: '0 0 var(--spacing-sm) 0',
          maxWidth: '420px',
          lineHeight: '1.4',
        }}
      >
        {description}
      </p>
      {onRetry && (
        <Button
          type="button"
          onClick={onRetry}
          style={{ backgroundColor: 'var(--color-error)', color: '#ffffff', fontSize: '0.78rem', border: 'none' }}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
