import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LoginPage } from '../pages/auth/LoginPage.js';
import { OtpVerifyPage } from '../pages/auth/OtpVerifyPage.js';

export const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--color-text-secondary)' }}>
        Loading Student OS Session...
      </div>
    );
  }

  if (authState === 'otp_pending') {
    return <OtpVerifyPage />;
  }

  if (authState !== 'authenticated') {
    return <LoginPage />;
  }

  return <>{children}</>;
};
