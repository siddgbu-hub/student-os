import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, UserAccount } from '@student-os/shared';
import { defaultStorage } from '../offline/localStorageAdapter.js';
import {
  getOrCreateDeviceId,
  sendEmailOtp,
  verifyEmailOtp,
  authenticateGoogle,
  validateSessionApi,
  logoutApi,
} from '../services/authService.js';

interface AuthContextType {
  authState: AuthState;
  account: UserAccount | null;
  token: string | null;
  pendingEmail: string | null;
  deviceId: string;
  deviceMessage: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  requestOtp: (email: string) => Promise<boolean>;
  verifyOtp: (otp: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearDeviceMessage: () => void;
}

const TOKEN_KEY = 'student_os_session_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('unauthenticated');
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate stored session on app mount
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      const storedToken = await defaultStorage.getItem<string>(TOKEN_KEY);
      if (storedToken) {
        const response = await validateSessionApi(storedToken, deviceId);
        if (response.success && response.account) {
          setToken(storedToken);
          setAccount(response.account as UserAccount);
          setAuthState('authenticated');
        } else if (response.error?.code === 'AUTH_DEVICE_REVOKED') {
          await handleDeviceRevoked();
        } else {
          await handleSessionExpired();
        }
      } else {
        setAuthState('unauthenticated');
      }
      setIsLoading(false);
    }
    initAuth();
  }, [deviceId]);

  const handleDeviceRevoked = async () => {
    await defaultStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAccount(null);
    setAuthState('unauthenticated');
    setDeviceMessage('Your account is currently active on another authorized device.');
  };

  const handleSessionExpired = async () => {
    await defaultStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAccount(null);
    setAuthState('session_expired');
  };

  const requestOtp = async (email: string): Promise<boolean> => {
    setErrorMessage(null);
    setIsLoading(true);
    const res = await sendEmailOtp(email);
    setIsLoading(false);
    if (res.success) {
      setPendingEmail(email);
      setAuthState('otp_pending');
      return true;
    } else {
      setErrorMessage(res.error || 'Failed to send OTP');
      return false;
    }
  };

  const verifyOtp = async (otp: string): Promise<boolean> => {
    if (!pendingEmail) return false;
    setErrorMessage(null);
    setIsLoading(true);
    const res = await verifyEmailOtp(pendingEmail, otp, { deviceId });
    setIsLoading(false);

    if (res.success && res.token && res.account) {
      await defaultStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setAccount(res.account as UserAccount);
      setAuthState('authenticated');
      setPendingEmail(null);
      return true;
    } else {
      if (res.error?.code === 'AUTH_DEVICE_REVOKED') {
        await handleDeviceRevoked();
      } else {
        setErrorMessage(res.error?.message || 'Invalid verification code');
      }
      return false;
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    setErrorMessage(null);
    setIsLoading(true);
    const res = await authenticateGoogle(idToken, { deviceId });
    setIsLoading(false);

    if (res.success && res.token && res.account) {
      await defaultStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setAccount(res.account as UserAccount);
      setAuthState('authenticated');
      return true;
    } else {
      if (res.error?.code === 'AUTH_DEVICE_REVOKED') {
        await handleDeviceRevoked();
      } else {
        setErrorMessage(res.error?.message || 'Google Sign-In failed');
      }
      return false;
    }
  };

  const logout = async () => {
    if (token) {
      await logoutApi(token, deviceId);
    }
    await defaultStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAccount(null);
    setAuthState('unauthenticated');
  };

  const clearDeviceMessage = () => setDeviceMessage(null);

  return (
    <AuthContext.Provider
      value={{
        authState,
        account,
        token,
        pendingEmail,
        deviceId,
        deviceMessage,
        errorMessage,
        isLoading,
        requestOtp,
        verifyOtp,
        loginWithGoogle,
        logout,
        clearDeviceMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
