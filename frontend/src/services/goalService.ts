import { GoalProgressDTO, CreateGoalInput, UpdateGoalInput } from '@student-os/shared';
import { API_BASE_URL as API_HOST } from '@/config/api';

const API_BASE_URL = `${API_HOST}/api/v1/goal`;

class LocalStorageAdapter {
  private getStorageKey(key: string): string {
    return `student_os_offline_${key}`;
  }

  getItem<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(key));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(value));
    } catch {
      // Storage quota exceeded or disabled
    }
  }
}

const storage = new LocalStorageAdapter();

export class GoalService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('student_os_session_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async getActiveGoalProgress(): Promise<GoalProgressDTO | null> {
    try {
      const res = await fetch(API_BASE_URL, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch active goal');
      const json = await res.json();
      if (json.success) {
        if (json.data) {
          storage.setItem('active_goal_progress', json.data);
        }
        return json.data || null;
      }
      throw new Error(json.error || 'Failed to fetch active goal');
    } catch (err) {
      console.warn('Network request failed, retrieving cached goal progress offline', err);
      return storage.getItem<GoalProgressDTO>('active_goal_progress');
    }
  }

  static async createGoal(input: CreateGoalInput): Promise<GoalProgressDTO> {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to create exam goal');
    const json = await res.json();
    if (json.success && json.data) {
      storage.setItem('active_goal_progress', json.data);
      return json.data;
    }
    throw new Error(json.error || 'Failed to create exam goal');
  }

  static async updateGoal(input: UpdateGoalInput): Promise<GoalProgressDTO | null> {
    const res = await fetch(API_BASE_URL, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to update exam goal');
    const json = await res.json();
    if (json.success && json.data) {
      storage.setItem('active_goal_progress', json.data);
      return json.data;
    }
    throw new Error(json.error || 'Failed to update exam goal');
  }

  static async deleteGoal(): Promise<void> {
    const res = await fetch(API_BASE_URL, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete exam goal');
    localStorage.removeItem('student_os_offline_active_goal_progress');
  }
}
