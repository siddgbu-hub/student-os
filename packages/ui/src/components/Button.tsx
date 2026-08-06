import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', loading = false, disabled, style, ...props }) => {
  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-family-base)',
    fontSize: 'var(--font-size-base)',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.65 : 1,
    backgroundColor: variant === 'primary' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
    color: variant === 'primary' ? '#ffffff' : 'var(--color-text-primary)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
    ...style,
  };

  return (
    <button style={baseStyle} disabled={isDisabled} {...props}>
      {loading && (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255,255,255,0.4)',
            borderTopColor: variant === 'primary' ? '#ffffff' : 'var(--color-text-primary)',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </button>
  );
};
