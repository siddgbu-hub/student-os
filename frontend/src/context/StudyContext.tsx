import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SubjectDTO, ChapterDTO, StudySessionDTO, TodaySessionsSummaryDTO } from '@student-os/shared';
import { useAuth } from './AuthContext.js';
import * as studyApi from '../services/studyService.js';

interface StudyContextType {
  subjects: SubjectDTO[];
  selectedSubjectId: string | null;
  chapters: ChapterDTO[];
  activeSession: StudySessionDTO | null;
  todaySummary: TodaySessionsSummaryDTO | null;
  elapsedSeconds: number;
  isLoading: boolean;
  errorMessage: string | null;
  setSelectedSubjectId: (subjectId: string | null) => void;
  loadSubjects: () => Promise<void>;
  createSubject: (name: string) => Promise<void>;
  updateSubject: (id: string, name: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  loadChapters: (subjectId: string) => Promise<void>;
  createChapter: (subjectId: string, name: string, orderIndex?: number) => Promise<void>;
  updateChapter: (id: string, name?: string, orderIndex?: number, isCompleted?: boolean) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  startSession: (subjectId: string, chapterId?: string | null) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: () => Promise<void>;
  cancelSession: () => Promise<void>;
  refreshTodaySessions: () => Promise<void>;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token: sessionToken, deviceId, authState } = useAuth();
  const isAuthenticated = authState === 'authenticated';
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterDTO[]>>({});
  const [activeSession, setActiveSession] = useState<StudySessionDTO | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySessionsSummaryDTO | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial data when authenticated
  const loadSubjects = useCallback(async () => {
    if (!sessionToken || !deviceId) return;
    try {
      setIsLoading(true);
      const list = await studyApi.fetchSubjectsApi(sessionToken, deviceId);
      setSubjects(list);
      if (list.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(list[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load subjects';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, deviceId, selectedSubjectId]);

  const loadChapters = useCallback(
    async (subjectId: string) => {
      if (!sessionToken || !deviceId) return;
      try {
        const list = await studyApi.fetchChaptersApi(sessionToken, deviceId, subjectId);
        setChaptersMap((prev) => ({ ...prev, [subjectId]: list }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load chapters';
        setErrorMessage(msg);
      }
    },
    [sessionToken, deviceId]
  );

  const refreshTodaySessions = useCallback(async () => {
    if (!sessionToken || !deviceId) return;
    const summary = await studyApi.fetchTodaySessionsApi(sessionToken, deviceId);
    if (summary) {
      setTodaySummary(summary);
    }
  }, [sessionToken, deviceId]);

  const loadActiveSession = useCallback(async () => {
    if (!sessionToken || !deviceId) return;
    try {
      const session = await studyApi.fetchActiveSessionApi(sessionToken, deviceId);
      setActiveSession(session);
    } catch {
      setActiveSession(null);
      setElapsedSeconds(0);
    }
  }, [sessionToken, deviceId]);

  useEffect(() => {
    const handleExpired = () => {
      setActiveSession(null);
      setElapsedSeconds(0);
    };
    window.addEventListener('entitlement:expired', handleExpired);
    return () => window.removeEventListener('entitlement:expired', handleExpired);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubjects();
      loadActiveSession();
      refreshTodaySessions();
    }
  }, [isAuthenticated, loadSubjects, loadActiveSession, refreshTodaySessions]);

  useEffect(() => {
    if (selectedSubjectId) {
      loadChapters(selectedSubjectId);
    }
  }, [selectedSubjectId, loadChapters]);

  // Live Timer Ticker for Active Session
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const calcElapsed = () => {
      if (activeSession.status === 'paused') {
        setElapsedSeconds(activeSession.durationSeconds);
        return;
      }
      if (activeSession.status === 'running') {
        const lastUpdate = new Date(activeSession.updatedAt).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - lastUpdate) / 1000));
        setElapsedSeconds(activeSession.durationSeconds + diff);
      }
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Subject Actions
  const createSubject = async (name: string) => {
    if (!sessionToken || !deviceId) return;
    try {
      setErrorMessage(null);
      const newSubject = await studyApi.createSubjectApi(sessionToken, deviceId, { name });
      setSubjects((prev) => [...prev, newSubject]);
      setSelectedSubjectId(newSubject.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create subject';
      setErrorMessage(msg);
      throw err;
    }
  };

  const updateSubject = async (id: string, name: string) => {
    if (!sessionToken || !deviceId) return;
    try {
      setErrorMessage(null);
      const updated = await studyApi.updateSubjectApi(sessionToken, deviceId, id, { name });
      setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update subject';
      setErrorMessage(msg);
      throw err;
    }
  };

  const deleteSubject = async (id: string) => {
    if (!sessionToken || !deviceId) return;
    try {
      setErrorMessage(null);
      await studyApi.deleteSubjectApi(sessionToken, deviceId, id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      if (selectedSubjectId === id) {
        const remaining = subjects.filter((s) => s.id !== id);
        setSelectedSubjectId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete subject';
      setErrorMessage(msg);
      throw err;
    }
  };

  // Chapter Actions
  const createChapter = async (subjectId: string, name: string, orderIndex: number = 0) => {
    if (!sessionToken || !deviceId) return;
    try {
      setErrorMessage(null);
      const newChapter = await studyApi.createChapterApi(sessionToken, deviceId, { subjectId, name, orderIndex });
      setChaptersMap((prev) => ({
        ...prev,
        [subjectId]: [...(prev[subjectId] || []), newChapter],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create chapter';
      setErrorMessage(msg);
      throw err;
    }
  };

  const updateChapter = async (id: string, name?: string, orderIndex?: number, isCompleted?: boolean) => {
    if (!sessionToken || !deviceId) return;
    try {
      setErrorMessage(null);
      const updated = await studyApi.updateChapterApi(sessionToken, deviceId, id, { name, orderIndex, isCompleted });
      setChaptersMap((prev) => {
        const subjectId = updated.subjectId;
        const list = prev[subjectId] || [];
        return {
          ...prev,
          [subjectId]: list.map((c) => (c.id === id ? updated : c)),
        };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update chapter';
      setErrorMessage(msg);
      throw err;
    }
  };

  const deleteChapter = async (id: string) => {
    if (!sessionToken || !deviceId) return;
    try {
      setErrorMessage(null);
      await studyApi.deleteChapterApi(sessionToken, deviceId, id);
      setChaptersMap((prev) => {
        const newMap = { ...prev };
        for (const subjId in newMap) {
          newMap[subjId] = newMap[subjId].filter((c) => c.id !== id);
        }
        return newMap;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete chapter';
      setErrorMessage(msg);
      throw err;
    }
  };

  // Session Actions
  const startSession = async (subjectId: string, chapterId?: string | null) => {
    if (!sessionToken || !deviceId) return;
    try {
      setErrorMessage(null);
      const session = await studyApi.startSessionApi(sessionToken, deviceId, { subjectId, chapterId });
      setActiveSession(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setErrorMessage(msg);
      throw err;
    }
  };

  const pauseSession = async () => {
    if (!sessionToken || !deviceId || !activeSession) return;
    try {
      setErrorMessage(null);
      const updated = await studyApi.pauseSessionApi(sessionToken, deviceId, activeSession.id);
      setActiveSession(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pause session';
      setErrorMessage(msg);
      throw err;
    }
  };

  const resumeSession = async () => {
    if (!sessionToken || !deviceId || !activeSession) return;
    try {
      setErrorMessage(null);
      const updated = await studyApi.resumeSessionApi(sessionToken, deviceId, activeSession.id);
      setActiveSession(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resume session';
      setErrorMessage(msg);
      throw err;
    }
  };

  const endSession = async () => {
    if (!sessionToken || !deviceId || !activeSession) return;
    try {
      setErrorMessage(null);
      await studyApi.endSessionApi(sessionToken, deviceId, activeSession.id);
      setActiveSession(null);
      refreshTodaySessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to end session';
      setErrorMessage(msg);
      throw err;
    }
  };

  const cancelSession = async () => {
    if (!sessionToken || !deviceId || !activeSession) return;
    try {
      setErrorMessage(null);
      await studyApi.cancelSessionApi(sessionToken, deviceId, activeSession.id);
      setActiveSession(null);
      refreshTodaySessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel session';
      setErrorMessage(msg);
      throw err;
    }
  };

  const currentChapters = selectedSubjectId ? chaptersMap[selectedSubjectId] || [] : [];

  return (
    <StudyContext.Provider
      value={{
        subjects,
        selectedSubjectId,
        chapters: currentChapters,
        activeSession,
        todaySummary,
        elapsedSeconds,
        isLoading,
        errorMessage,
        setSelectedSubjectId,
        loadSubjects,
        createSubject,
        updateSubject,
        deleteSubject,
        loadChapters,
        createChapter,
        updateChapter,
        deleteChapter,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        cancelSession,
        refreshTodaySessions,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = (): StudyContextType => {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return ctx;
};
