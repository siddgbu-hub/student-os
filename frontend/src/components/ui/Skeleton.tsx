import React from 'react';

export interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-md)',
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--color-bg-tertiary)',
        opacity: 0.6,
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div
      style={{
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
      }}
    >
      <Skeleton width="40%" height="16px" />
      <Skeleton width="100%" height="32px" />
      <Skeleton width="70%" height="14px" />
    </div>
  );
};
