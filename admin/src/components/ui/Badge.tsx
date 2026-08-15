import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'pro' | 'trial';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  }[size];

  const variantStyles = {
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/80',
    warning: 'bg-amber-950/70 text-amber-400 border border-amber-800/80',
    danger: 'bg-rose-950/70 text-rose-400 border border-rose-800/80',
    pro: 'bg-amber-500/10 text-amber-300 border border-amber-500/40 shadow-sm font-semibold',
    trial: 'bg-blue-950/70 text-blue-400 border border-blue-800/80',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeStyles} ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
