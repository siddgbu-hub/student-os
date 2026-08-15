import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { RevisionItemDTO, RevisionSessionDTO, DailyRevisionSummaryDTO, RescheduleRevisionItemInput, RevisionRating } from '@student-os/shared';
import { RevisionService } from '../services/revisionService.js';

interface RevisionContextType {
  items: RevisionItemDTO[];
  summary: DailyRevisionSummaryDTO | null;
  activeSession: RevisionSessionDTO | null;
  elapsedSeconds: number;
  isPaused: boolean;
  loading: boolean;
  error: string | null;
  fetchRevisionData: (dateStr?: string) => Promise<void>;
  startSession: (revisionItemId: string) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: (rating?: RevisionRating, notes?: string) => Promise<void>;
  cancelSession: () => Promise<void>;
  rescheduleItem: (id: string, input: RescheduleRevisionItemInput) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
}

const RevisionContext = createContext<RevisionContextType | undefined>(undefined);

export const RevisionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<RevisionItemDTO[]>([]);
  const [summary, setSummary] = useState<DailyRevisionSummaryDTO | null>(null);
  const [activeSession, setActiveSession] = useState<RevisionSessionDTO | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevisionData = useCallback(async (dateStr?: string) => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedItems, fetchedSummary, fetchedActiveSession] = await Promise.all([
        RevisionService.getRevisionItems(dateStr),
        RevisionService.getDailySummary(dateStr),
        RevisionService.getActiveRevisionSession(),
      ]);
      setItems(fetchedItems);
      setSummary(fetchedSummary);
      setActiveSession(fetchedActiveSession);

      if (fetchedActiveSession) {
        setIsPaused(fetchedActiveSession.status === 'paused');
        const start = new Date(fetchedActiveSession.startTime).getTime();
        const now = new Date().getTime();
        const baseElapsed = fetchedActiveSession.durationSeconds || Math.max(0, Math.floor((now - start) / 1000));
        setElapsedSeconds(baseElapsed);
      } else {
        setElapsedSeconds(0);
        setIsPaused(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load revision data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevisionData();
  }, [fetchRevisionData]);

  // Live timer tick for active running revision session
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (activeSession && activeSession.status === 'running' && !isPaused) {
      intervalId = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeSession, isPaused]);

  const startSession = async (revisionItemId: string) => {
    try {
      setError(null);
      const session = await RevisionService.startRevisionSession(revisionItemId);
      setActiveSession(session);
      setIsPaused(false);
      setElapsedSeconds(0);
      await fetchRevisionData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start revision session';
      setError(msg);
      throw err;
    }
  };

  const pauseSession = async () => {
    if (!activeSession) return;
    try {
      setError(null);
      const updated = await RevisionService.pauseRevisionSession(activeSession.id);
      setActiveSession(updated);
      setIsPaused(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to pause revision session');
    }
  };

  const resumeSession = async () => {
    if (!activeSession) return;
    try {
      setError(null);
      const updated = await RevisionService.resumeRevisionSession(activeSession.id);
      setActiveSession(updated);
      setIsPaused(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resume revision session');
    }
  };

  const endSession = async (rating: RevisionRating = 'good', notes?: string) => {
    if (!activeSession) return;
    try {
      setError(null);
      await RevisionService.endRevisionSession(activeSession.id, rating, notes);
      setActiveSession(null);
      setElapsedSeconds(0);
      setIsPaused(false);
      await fetchRevisionData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete revision session');
    }
  };

  const cancelSession = async () => {
    if (!activeSession) return;
    try {
      setError(null);
      await RevisionService.cancelRevisionSession(activeSession.id);
      setActiveSession(null);
      setElapsedSeconds(0);
      setIsPaused(false);
      await fetchRevisionData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel revision session');
    }
  };

  const rescheduleItem = async (id: string, input: RescheduleRevisionItemInput) => {
    try {
      setError(null);
      await RevisionService.rescheduleRevisionItem(id, input);
      await fetchRevisionData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule revision item');
    }
  };

  const archiveItem = async (id: string) => {
    try {
      setError(null);
      await RevisionService.archiveRevisionItem(id);
      await fetchRevisionData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive revision item');
    }
  };

  return (
    <RevisionContext.Provider
      value={{
        items,
        summary,
        activeSession,
        elapsedSeconds,
        isPaused,
        loading,
        error,
        fetchRevisionData,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        cancelSession,
        rescheduleItem,
        archiveItem,
      }}
    >
      {children}
    </RevisionContext.Provider>
  );
};

export const useRevision = (): RevisionContextType => {
  const context = useContext(RevisionContext);
  if (!context) {
    throw new Error('useRevision must be used within a RevisionProvider');
  }
  return context;
};
