import {
  PlannerTaskDTO,
  DailyPlanSummaryDTO,
  WeeklyPlanSummaryDTO,
  CreatePlannerTaskInput,
  UpdatePlannerTaskInput,
  ReschedulePlannerTaskInput,
} from '@student-os/shared';
import { defaultStorage } from '../offline/localStorageAdapter.js';
import { API_BASE_URL } from '@/config/api';

const API_BASE = `${API_BASE_URL}/api/v1/planner`;

function getAuthHeaders(token: string, deviceId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-device-id': deviceId,
  };
}

// --- TASKS / STUDY BLOCKS ---

export async function fetchTodayPlanApi(token: string, deviceId: string, dateStr?: string): Promise<DailyPlanSummaryDTO> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const cacheKey = `offline_planner_today_${targetDate}`;
  try {
    const url = dateStr ? `${API_BASE}/tasks/today?date=${encodeURIComponent(dateStr)}` : `${API_BASE}/tasks/today`;
    const res = await fetch(url, {
      headers: getAuthHeaders(token, deviceId),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await defaultStorage.setItem(cacheKey, data.data);
      return data.data;
    }
  } catch {
    // Offline fallback
  }

  const cached = await defaultStorage.getItem<DailyPlanSummaryDTO>(cacheKey);
  if (cached) return cached;

  return {
    date: targetDate,
    totalPlannedDurationMinutes: 0,
    completedDurationMinutes: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
    tasks: [],
  };
}

export async function fetchWeeklyPlanApi(token: string, deviceId: string, startDateStr?: string): Promise<WeeklyPlanSummaryDTO> {
  const cacheKey = `offline_planner_weekly_${startDateStr || 'current'}`;
  try {
    const url = startDateStr ? `${API_BASE}/tasks/weekly?startDate=${encodeURIComponent(startDateStr)}` : `${API_BASE}/tasks/weekly`;
    const res = await fetch(url, {
      headers: getAuthHeaders(token, deviceId),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await defaultStorage.setItem(cacheKey, data.data);
      return data.data;
    }
  } catch {
    // Offline fallback
  }

  const cached = await defaultStorage.getItem<WeeklyPlanSummaryDTO>(cacheKey);
  if (cached) return cached;

  const startIso = startDateStr || new Date().toISOString().split('T')[0];
  return {
    startDate: startIso,
    endDate: startIso,
    totalPlannedDurationMinutes: 0,
    completedDurationMinutes: 0,
    dailySummaries: [],
  };
}

export async function createPlannerTaskApi(token: string, deviceId: string, input: CreatePlannerTaskInput): Promise<PlannerTaskDTO> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to create planned task');
  }
  return data.data;
}

export async function updatePlannerTaskApi(
  token: string,
  deviceId: string,
  id: string,
  input: UpdatePlannerTaskInput
): Promise<PlannerTaskDTO> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to update task');
  }
  return data.data;
}

export async function updatePlannerTaskStatusApi(
  token: string,
  deviceId: string,
  id: string,
  status: PlannerTaskDTO['status']
): Promise<PlannerTaskDTO> {
  const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to update task status');
  }
  return data.data;
}

export async function reschedulePlannerTaskApi(
  token: string,
  deviceId: string,
  id: string,
  input: ReschedulePlannerTaskInput
): Promise<PlannerTaskDTO> {
  const res = await fetch(`${API_BASE}/tasks/${id}/reschedule`, {
    method: 'POST',
    headers: getAuthHeaders(token, deviceId),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to reschedule task');
  }
  return data.data;
}

export async function deletePlannerTaskApi(token: string, deviceId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, deviceId),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to delete task');
  }
}
