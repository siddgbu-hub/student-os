import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AdminProfile {
  accountId?: string;
  email?: string;
  role?: string;
}

export interface AdminAuthContextValue {
  status: AuthStatus;
  token: string | null;
  adminProfile: AdminProfile | null;
  error: string | null;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginWithOtp: (email: string, otp: string) => Promise<boolean>;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const STORAGE_KEY = 'student_os_admin_token';
const EMAIL_KEY = 'student_os_admin_email';

export const AdminAuthProvider: React.FC<{
  children: React.ReactNode;
  initialStatus?: AuthStatus;
  initialToken?: string | null;
}> = ({ children, initialStatus, initialToken }) => {
  const [token, setToken] = useState<string | null>(() =>
    initialToken !== undefined ? initialToken : localStorage.getItem(STORAGE_KEY)
  );
  const [status, setStatus] = useState<AuthStatus>(() =>
    initialStatus !== undefined ? initialStatus : 'loading'
  );
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(() => {
    if (initialStatus === 'authenticated') {
      const email = localStorage.getItem(EMAIL_KEY) || undefined;
      return { role: 'admin', email };
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setAdminProfile(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  const verifySession = useCallback(async (tokenToVerify: string, emailHint?: string) => {
    setStatus('loading');
    setError(null);
    try {
      // Test the token against the overview endpoint (server-side RBAC check)
      await adminApiClient.get('/api/v1/admin/overview');
      setToken(tokenToVerify);
      setAdminProfile({ role: 'admin', email: emailHint || localStorage.getItem(EMAIL_KEY) || undefined });
      setStatus('authenticated');
      return true;
    } catch (err: unknown) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EMAIL_KEY);
      setToken(null);
      setAdminProfile(null);
      setStatus('unauthenticated');
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError(
            err.message || 'Access Denied: Your account does not have Admin or Owner privileges.'
          );
        } else if (err.status === 401) {
          setError(err.message || 'Session expired or invalidated. Please sign in again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Authentication verification failed.');
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (initialStatus && initialStatus !== 'loading') {
      return;
    }
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken && storedToken.trim()) {
      verifySession(storedToken.trim());
    } else {
      setStatus('unauthenticated');
    }
  }, [verifySession, initialStatus]);

  const sendOtp = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!email || !email.trim()) {
      const err = 'Please enter a valid email address.';
      setError(err);
      return { success: false, error: err };
    }
    setError(null);
    try {
      const res = await adminApiClient.sendEmailOtp(email.trim());
      return { success: true, message: res.message || 'Verification code sent if email is valid' };
    } catch (err: unknown) {
      const msg = err instanceof AdminApiError ? err.message : 'Failed to send verification code. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const loginWithOtp = async (email: string, otp: string): Promise<boolean> => {
    if (!email || !email.trim()) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!otp || !otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return false;
    }

    setError(null);
    try {
      const res = await adminApiClient.verifyEmailOtp(email.trim(), otp.trim());
      if (!res.token) {
        setError('Authentication response did not contain a valid session token.');
        return false;
      }
      const cleanToken = res.token.trim();
      localStorage.setItem(STORAGE_KEY, cleanToken);
      if (res.account?.email) {
        localStorage.setItem(EMAIL_KEY, res.account.email);
      }
      return await verifySession(cleanToken, res.account?.email);
    } catch (err: unknown) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EMAIL_KEY);
      setToken(null);
      setAdminProfile(null);
      setStatus('unauthenticated');
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError(
            err.message || 'Access Denied: Your account does not have Admin or Owner privileges.'
          );
        } else if (err.status === 401 || err.code === 'AUTH_INVALID_OTP') {
          setError('Invalid or expired verification code. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed. Please check your code.');
      }
      return false;
    }
  };

  const login = async (newToken: string): Promise<boolean> => {
    if (!newToken || !newToken.trim()) {
      setError('Admin token cannot be empty.');
      return false;
    }
    const cleanToken = newToken.trim();
    localStorage.setItem(STORAGE_KEY, cleanToken);
    return await verifySession(cleanToken);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        status,
        token,
        adminProfile,
        error,
        sendOtp,
        loginWithOtp,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
}
