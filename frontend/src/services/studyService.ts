import {
  SubjectDTO,
  ChapterDTO,
  StudySessionDTO,
  TodaySessionsSummaryDTO,
  CreateSubjectInput,
  UpdateSubjectInput,
  CreateChapterInput,
  UpdateChapterInput,
  StartSessionInput,
} from '@student-os/shared';
import { defaultStorage } from '../offline/localStorageAdapter.js';

const API_BASE = '/api/v1/study';

function getAuthHeaders(token: string, deviceId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-device-id': deviceId,
  };
}

// --- SUBJECTS ---

export async function fetchSubjectsApi(token: string, deviceId: string): Promise<SubjectDTO[]> {
  const cacheKey = 'offline_study_subjects';
  try {
    const res = await fetch(`${API_BASE}/subjects`, {
      headers: getAuthHeaders(token, deviceId),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await defaultStorage.setItem(cacheKey, data.subjects);
      return data.subjects;
    }
  } catch {
    // Offline fallback
  }
  const cached = await defaultStorage.getItem<SubjectDTO[]>(cacheKey);
  return cached || [];
}

export async function createSubjectApi(token: string, deviceId: string, input: CreateSubjectInput): Promise<SubjectDTO> {
  const res = await fetch(`${API_BASE}/subjects`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to create subject');
  }
  return data.subject;
}

export async function updateSubjectApi(
  token: string,
  deviceId: string,
  id: string,
  input: UpdateSubjectInput
): Promise<SubjectDTO> {
  const res = await fetch(`${API_BASE}/subjects/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to update subject');
  }
  return data.subject;
}

export async function deleteSubjectApi(token: string, deviceId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/subjects/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, deviceId),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to delete subject');
  }
}

// --- CHAPTERS ---

export async function fetchChaptersApi(token: string, deviceId: string, subjectId: string): Promise<ChapterDTO[]> {
  const cacheKey = `offline_study_chapters_${subjectId}`;
  try {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/chapters`, {
      headers: getAuthHeaders(token, deviceId),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await defaultStorage.setItem(cacheKey, data.chapters);
      return data.chapters;
    }
  } catch {
    // Offline fallback
  }
  const cached = await defaultStorage.getItem<ChapterDTO[]>(cacheKey);
  return cached || [];
}

export async function createChapterApi(token: string, deviceId: string, input: CreateChapterInput): Promise<ChapterDTO> {
  const res = await fetch(`${API_BASE}/chapters`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to create chapter');
  }
  return data.chapter;
}

export async function updateChapterApi(
  token: string,
  deviceId: string,
  id: string,
  input: UpdateChapterInput
): Promise<ChapterDTO> {
  const res = await fetch(`${API_BASE}/chapters/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to update chapter');
  }
  return data.chapter;
}

export async function deleteChapterApi(token: string, deviceId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chapters/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, deviceId),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to delete chapter');
  }
}

// --- SESSIONS ---

export async function startSessionApi(token: string, deviceId: string, input: StartSessionInput): Promise<StudySessionDTO> {
  const res = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to start session');
  }
  return data.session;
}

export async function pauseSessionApi(token: string, deviceId: string, sessionId: string): Promise<StudySessionDTO> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/pause`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to pause session');
  }
  return data.session;
}

export async function resumeSessionApi(token: string, deviceId: string, sessionId: string): Promise<StudySessionDTO> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/resume`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to resume session');
  }
  return data.session;
}

export async function endSessionApi(token: string, deviceId: string, sessionId: string): Promise<StudySessionDTO> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to end session');
  }
  return data.session;
}

export async function cancelSessionApi(token: string, deviceId: string, sessionId: string): Promise<StudySessionDTO> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to cancel session');
  }
  return data.session;
}

export async function fetchActiveSessionApi(token: string, deviceId: string): Promise<StudySessionDTO | null> {
  try {
    const res = await fetch(`${API_BASE}/sessions/active`, {
      headers: getAuthHeaders(token, deviceId),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.session;
    }
  } catch {
    // Ignore network failures for background check
  }
  return null;
}

export async function fetchTodaySessionsApi(token: string, deviceId: string): Promise<TodaySessionsSummaryDTO | null> {
  try {
    const res = await fetch(`${API_BASE}/sessions/today`, {
      headers: getAuthHeaders(token, deviceId),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.summary;
    }
  } catch {
    // Ignore network failures for background check
  }
  return null;
}
