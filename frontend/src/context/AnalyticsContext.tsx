import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AnalyticsDashboardDTO, TimePeriod } from '@student-os/shared';
import { AnalyticsService } from '../services/analyticsService.js';

interface AnalyticsContextType {
  dashboard: AnalyticsDashboardDTO | null;
  period: TimePeriod;
  setPeriod: (period: TimePeriod) => void;
  loading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dashboard, setDashboard] = useState<AnalyticsDashboardDTO | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('this_week');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (selectedPeriod: TimePeriod) => {
    try {
      setLoading(true);
      setError(null);
      const data = await AnalyticsService.getDashboardAnalytics(selectedPeriod);
      setDashboard(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const refreshAnalytics = async () => {
    await fetchAnalytics(period);
  };

  return (
    <AnalyticsContext.Provider
      value={{
        dashboard,
        period,
        setPeriod,
        loading,
        error,
        refreshAnalytics,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
