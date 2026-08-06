import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AccountOverviewDTO,
  UserProfileDTO,
  UserPreferencesDTO,
  DeviceSessionDTO,
  UpdateProfileInput,
  UpdatePreferencesInput,
} from '@student-os/shared';
import { AccountService } from '../services/accountService.js';

interface AccountContextType {
  overview: AccountOverviewDTO | null;
  profile: UserProfileDTO | null;
  preferences: UserPreferencesDTO | null;
  devices: DeviceSessionDTO[];
  loading: boolean;
  error: string | null;
  refreshAccount: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  updatePreferences: (input: UpdatePreferencesInput) => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [overview, setOverview] = useState<AccountOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AccountService.getOverview();
      setOverview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Read and apply theme preference immediately to root document
  useEffect(() => {
    const activeTheme = overview?.preferences?.theme || 'system';
    document.documentElement.dataset.theme = activeTheme;
  }, [overview?.preferences?.theme]);

  const updateProfile = async (input: UpdateProfileInput) => {
    try {
      setError(null);
      const updated = await AccountService.updateProfile(input);
      setOverview((prev) => (prev ? { ...prev, profile: updated } : null));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    }
  };

  const updatePreferences = async (input: UpdatePreferencesInput) => {
    try {
      setError(null);
      const updated = await AccountService.updatePreferences(input);
      setOverview((prev) => (prev ? { ...prev, preferences: updated } : null));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    }
  };

  const revokeDevice = async (deviceId: string) => {
    try {
      setError(null);
      await AccountService.revokeDevice(deviceId);
      await fetchOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke device session');
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      setError(null);
      await AccountService.deleteAccount();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      throw err;
    }
  };

  return (
    <AccountContext.Provider
      value={{
        overview,
        profile: overview?.profile || null,
        preferences: overview?.preferences || null,
        devices: overview?.devices || [],
        loading,
        error,
        refreshAccount: fetchOverview,
        updateProfile,
        updatePreferences,
        revokeDevice,
        deleteAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
