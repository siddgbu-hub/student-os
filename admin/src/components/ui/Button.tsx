import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/**
 * Variant style map — all critical colors are set via inline styles on the
 * data attribute so they cannot be lost even if a CSS utility class is missing
 * from the production bundle. The CSS classes handle hover/focus/transitions.
 */
const variantInlineStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: '#334155',
    color: '#f1f5f9',
    borderColor: '#475569',
  },
  danger: {
    backgroundColor: '#e11d48',
    color: '#ffffff',
    borderColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    borderColor: '#334155',
  },
};


export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const baseClass =
    'socc-btn inline-flex items-center justify-center font-medium transition-colors focus:outline-none rounded-md border';

  const sizeClass = {
    sm: 'socc-btn-sm',
    md: 'socc-btn-md',
    lg: 'socc-btn-lg',
  }[size];

  const variantClass = `socc-btn-${variant}`;

  const computedStyle: React.CSSProperties = {
    ...variantInlineStyles[variant],
    ...(disabled || loading ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
    ...style,
  };

  return (
    <button
      className={`${baseClass} ${sizeClass} ${variantClass} ${className}`}
      disabled={disabled || loading}
      style={computedStyle}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            style={{ opacity: 0.25 }}
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.75 }}
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
