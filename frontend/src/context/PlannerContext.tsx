import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.js';
import {
  PlannerTaskDTO,
  DailyPlanSummaryDTO,
  WeeklyPlanSummaryDTO,
  CreatePlannerTaskInput,
  UpdatePlannerTaskInput,
  ReschedulePlannerTaskInput,
} from '@student-os/shared';
import {
  fetchTodayPlanApi,
  fetchWeeklyPlanApi,
  createPlannerTaskApi,
  updatePlannerTaskApi,
  updatePlannerTaskStatusApi,
  reschedulePlannerTaskApi,
  deletePlannerTaskApi,
} from '../services/plannerService.js';

interface PlannerContextType {
  todaySummary: DailyPlanSummaryDTO | null;
  weeklySummary: WeeklyPlanSummaryDTO | null;
  selectedDate: string;
  isLoading: boolean;
  errorMessage: string | null;
  setSelectedDate: (dateStr: string) => void;
  loadTodayPlan: (dateStr?: string) => Promise<void>;
  loadWeeklyPlan: (startDateStr?: string) => Promise<void>;
  createTask: (input: CreatePlannerTaskInput) => Promise<PlannerTaskDTO>;
  updateTask: (id: string, input: UpdatePlannerTaskInput) => Promise<PlannerTaskDTO>;
  updateTaskStatus: (id: string, status: PlannerTaskDTO['status']) => Promise<PlannerTaskDTO>;
  rescheduleTask: (id: string, input: ReschedulePlannerTaskInput) => Promise<PlannerTaskDTO>;
  deleteTask: (id: string) => Promise<void>;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, deviceId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [todaySummary, setTodaySummary] = useState<DailyPlanSummaryDTO | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyPlanSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTodayPlan = useCallback(
    async (dateStr?: string) => {
      if (!token || !deviceId) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await fetchTodayPlanApi(token, deviceId, dateStr || selectedDate);
        setTodaySummary(data);
      } catch (err: unknown) {
        setErrorMessage((err as Error).message || 'Failed to load daily plan');
      } finally {
        setIsLoading(false);
      }
    },
    [token, deviceId, selectedDate]
  );

  const loadWeeklyPlan = useCallback(
    async (startDateStr?: string) => {
      if (!token || !deviceId) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await fetchWeeklyPlanApi(token, deviceId, startDateStr);
        setWeeklySummary(data);
      } catch (err: unknown) {
        setErrorMessage((err as Error).message || 'Failed to load weekly plan');
      } finally {
        setIsLoading(false);
      }
    },
    [token, deviceId]
  );

  useEffect(() => {
    if (token && deviceId) {
      loadTodayPlan(selectedDate);
    }
  }, [token, deviceId, selectedDate, loadTodayPlan]);

  const createTask = async (input: CreatePlannerTaskInput): Promise<PlannerTaskDTO> => {
    if (!token || !deviceId) throw new Error('Unauthenticated');
    try {
      setErrorMessage(null);
      const newTask = await createPlannerTaskApi(token, deviceId, input);
      await loadTodayPlan(selectedDate);
      await loadWeeklyPlan();
      return newTask;
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to create task';
      setErrorMessage(msg);
      throw err;
    }
  };

  const updateTask = async (id: string, input: UpdatePlannerTaskInput): Promise<PlannerTaskDTO> => {
    if (!token || !deviceId) throw new Error('Unauthenticated');
    try {
      setErrorMessage(null);
      const updated = await updatePlannerTaskApi(token, deviceId, id, input);
      await loadTodayPlan(selectedDate);
      await loadWeeklyPlan();
      return updated;
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to update task';
      setErrorMessage(msg);
      throw err;
    }
  };

  const updateTaskStatus = async (id: string, status: PlannerTaskDTO['status']): Promise<PlannerTaskDTO> => {
    if (!token || !deviceId) throw new Error('Unauthenticated');
    try {
      setErrorMessage(null);
      const updated = await updatePlannerTaskStatusApi(token, deviceId, id, status);
      await loadTodayPlan(selectedDate);
      await loadWeeklyPlan();
      return updated;
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to update task status';
      setErrorMessage(msg);
      throw err;
    }
  };

  const rescheduleTask = async (id: string, input: ReschedulePlannerTaskInput): Promise<PlannerTaskDTO> => {
    if (!token || !deviceId) throw new Error('Unauthenticated');
    try {
      setErrorMessage(null);
      const updated = await reschedulePlannerTaskApi(token, deviceId, id, input);
      await loadTodayPlan(selectedDate);
      await loadWeeklyPlan();
      return updated;
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to reschedule task';
      setErrorMessage(msg);
      throw err;
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    if (!token || !deviceId) throw new Error('Unauthenticated');
    try {
      setErrorMessage(null);
      await deletePlannerTaskApi(token, deviceId, id);
      await loadTodayPlan(selectedDate);
      await loadWeeklyPlan();
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to delete task';
      setErrorMessage(msg);
      throw err;
    }
  };

  return (
    <PlannerContext.Provider
      value={{
        todaySummary,
        weeklySummary,
        selectedDate,
        isLoading,
        errorMessage,
        setSelectedDate,
        loadTodayPlan,
        loadWeeklyPlan,
        createTask,
        updateTask,
        updateTaskStatus,
        rescheduleTask,
        deleteTask,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export const usePlanner = (): PlannerContextType => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};
