import React from 'react';
import { Button } from '@student-os/ui';

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
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #fca5a5',
        backgroundColor: '#fef2f2',
        textAlign: 'center',
        minHeight: '180px',
        margin: 'var(--spacing-xs) 0',
      }}
    >
      <div style={{ color: '#dc2626', marginBottom: '8px', fontSize: '1.5rem' }}>⚠️</div>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: '700', color: '#991b1b' }}>
        {title}
      </h3>
      <p
        style={{
          color: '#7f1d1d',
          fontSize: '0.85rem',
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
          style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '0.8rem' }}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
