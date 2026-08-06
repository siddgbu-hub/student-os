import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GoalProgressDTO, CreateGoalInput, UpdateGoalInput } from '@student-os/shared';
import { GoalService } from '../services/goalService.js';

interface GoalContextType {
  goalProgress: GoalProgressDTO | null;
  loading: boolean;
  error: string | null;
  refreshGoal: () => Promise<void>;
  saveGoal: (input: CreateGoalInput) => Promise<void>;
  updateGoal: (input: UpdateGoalInput) => Promise<void>;
  deleteGoal: () => Promise<void>;
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export const GoalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [goalProgress, setGoalProgress] = useState<GoalProgressDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await GoalService.getActiveGoalProgress();
      setGoalProgress(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load goal progress');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  const saveGoal = async (input: CreateGoalInput) => {
    try {
      setError(null);
      const updated = await GoalService.createGoal(input);
      setGoalProgress(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save exam goal');
      throw err;
    }
  };

  const updateGoal = async (input: UpdateGoalInput) => {
    try {
      setError(null);
      const updated = await GoalService.updateGoal(input);
      setGoalProgress(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update exam goal');
      throw err;
    }
  };

  const deleteGoal = async () => {
    try {
      setError(null);
      await GoalService.deleteGoal();
      setGoalProgress(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete exam goal');
      throw err;
    }
  };

  return (
    <GoalContext.Provider
      value={{
        goalProgress,
        loading,
        error,
        refreshGoal: fetchGoal,
        saveGoal,
        updateGoal,
        deleteGoal,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
};

export const useGoal = (): GoalContextType => {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoal must be used within a GoalProvider');
  }
  return context;
};
