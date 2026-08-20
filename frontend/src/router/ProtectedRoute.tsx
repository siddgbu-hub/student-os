import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LoginPage } from '../pages/auth/LoginPage.js';
import { OtpVerifyPage } from '../pages/auth/OtpVerifyPage.js';
import { GraduationCap } from 'lucide-react';

const InitialAuthShellSkeleton: React.FC = () => (
  <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
    {/* Skeleton Header */}
    <header
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.45rem 1.25rem',
      }}
    >
      <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-accent)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={17} />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: '600', letterSpacing: '-0.02em' }}>Student OS</span>
        </div>
        <div style={{ width: '80px', height: '24px', backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-sm)', opacity: 0.5 }} />
      </div>
    </header>

    {/* Skeleton Dashboard Body */}
    <main style={{ maxWidth: '1180px', margin: '0 auto', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '45%', height: '28px', backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-xs)', opacity: 0.5 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: '76px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', opacity: 0.6 }} />
        ))}
      </div>
      <div style={{ width: '100%', height: '140px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', opacity: 0.5 }} />
    </main>
  </div>
);

export const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState, isLoading } = useAuth();

  if (isLoading) {
    return <InitialAuthShellSkeleton />;
  }

  if (authState === 'otp_pending') {
    return <OtpVerifyPage />;
  }

  if (authState !== 'authenticated') {
    return <LoginPage />;
  }

  return <>{children}</>;
};
