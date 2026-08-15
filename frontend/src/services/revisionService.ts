import {
  RevisionItemDTO,
  RevisionSessionDTO,
  DailyRevisionSummaryDTO,
  CreateRevisionItemInput,
  UpdateRevisionItemInput,
  RescheduleRevisionItemInput,
} from '@student-os/shared';
import { API_BASE_URL as API_HOST } from '@/config/api';

const API_BASE_URL = `${API_HOST}/api/v1/revision`;

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

export class RevisionService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('student_os_session_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async getRevisionItems(dateStr?: string): Promise<RevisionItemDTO[]> {
    try {
      const url = dateStr ? `${API_BASE_URL}/items?date=${encodeURIComponent(dateStr)}` : `${API_BASE_URL}/items`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch revision items');
      const json = await res.json();
      if (json.success && json.data) {
        storage.setItem('revision_items', json.data);
        return json.data;
      }
      throw new Error(json.error || 'Failed to fetch revision items');
    } catch (err) {
      console.warn('Network request failed, retrieving cached revision items offline', err);
      return storage.getItem<RevisionItemDTO[]>('revision_items') || [];
    }
  }

  static async getDailySummary(dateStr?: string): Promise<DailyRevisionSummaryDTO> {
    try {
      const url = dateStr ? `${API_BASE_URL}/summary?date=${encodeURIComponent(dateStr)}` : `${API_BASE_URL}/summary`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch daily summary');
      const json = await res.json();
      if (json.success && json.data) {
        storage.setItem('revision_summary', json.data);
        return json.data;
      }
      throw new Error(json.error || 'Failed to fetch daily summary');
    } catch (err) {
      console.warn('Network request failed, retrieving cached revision summary offline', err);
      const cachedItems = storage.getItem<RevisionItemDTO[]>('revision_items') || [];
      const todayStr = dateStr || new Date().toISOString().split('T')[0];
      return {
        date: todayStr,
        dueTodayCount: cachedItems.filter((i) => i.status === 'due_today').length,
        overdueCount: cachedItems.filter((i) => i.status === 'overdue').length,
        completedTodayCount: cachedItems.filter((i) => i.completedAt && i.completedAt.startsWith(todayStr)).length,
        totalRevisionSecondsToday: 0,
        averageRetentionScore: 100,
        items: cachedItems,
      };
    }
  }

  static async createRevisionItem(input: CreateRevisionItemInput): Promise<RevisionItemDTO> {
    const res = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to create revision item');
    }
    return json.data;
  }

  static async updateRevisionItem(id: string, input: UpdateRevisionItemInput): Promise<RevisionItemDTO> {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to update revision item');
    }
    return json.data;
  }

  static async rescheduleRevisionItem(id: string, input: RescheduleRevisionItemInput): Promise<RevisionItemDTO> {
    const res = await fetch(`${API_BASE_URL}/items/${id}/reschedule`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to reschedule revision item');
    }
    return json.data;
  }

  static async archiveRevisionItem(id: string): Promise<RevisionItemDTO> {
    const res = await fetch(`${API_BASE_URL}/items/${id}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to archive revision item');
    }
    return json.data;
  }

  // --- REVISION SESSION APIs ---

  static async startRevisionSession(revisionItemId: string): Promise<RevisionSessionDTO> {
    const res = await fetch(`${API_BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ revisionItemId }),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to start revision session');
    }
    storage.setItem('active_revision_session', json.data);
    return json.data;
  }

  static async getActiveRevisionSession(): Promise<RevisionSessionDTO | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/active`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch active revision session');
      const json = await res.json();
      if (json.success) {
        storage.setItem('active_revision_session', json.data);
        return json.data;
      }
      return null;
    } catch {
      return storage.getItem<RevisionSessionDTO>('active_revision_session');
    }
  }

  static async pauseRevisionSession(id: string): Promise<RevisionSessionDTO> {
    const res = await fetch(`${API_BASE_URL}/sessions/${id}/pause`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to pause revision session');
    }
    storage.setItem('active_revision_session', json.data);
    return json.data;
  }

  static async resumeRevisionSession(id: string): Promise<RevisionSessionDTO> {
    const res = await fetch(`${API_BASE_URL}/sessions/${id}/resume`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to resume revision session');
    }
    storage.setItem('active_revision_session', json.data);
    return json.data;
  }

  static async endRevisionSession(id: string, rating: 'again' | 'hard' | 'good' | 'easy' = 'good', notes?: string): Promise<{ session: RevisionSessionDTO; item: RevisionItemDTO }> {
    const res = await fetch(`${API_BASE_URL}/sessions/${id}/end`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ rating, notes }),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to end revision session');
    }
    storage.setItem('active_revision_session', null);
    return json.data;
  }

  static async cancelRevisionSession(id: string): Promise<RevisionSessionDTO> {
    const res = await fetch(`${API_BASE_URL}/sessions/${id}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to cancel revision session');
    }
    storage.setItem('active_revision_session', null);
    return json.data;
  }
}
