import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', style, ...props }) => {
  const baseStyle: React.CSSProperties = {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-family-base)',
    fontSize: 'var(--font-size-base)',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: variant === 'primary' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
    color: variant === 'primary' ? '#ffffff' : 'var(--color-text-primary)',
    ...style,
  };

  return (
    <button style={baseStyle} {...props}>
      {children}
    </button>
  );
};
