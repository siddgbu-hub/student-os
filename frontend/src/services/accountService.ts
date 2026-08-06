import {
  AccountOverviewDTO,
  UserProfileDTO,
  UserPreferencesDTO,
  DeviceSessionDTO,
  UpdateProfileInput,
  UpdatePreferencesInput,
} from '@student-os/shared';

const API_BASE_URL = '/api/v1/account';

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

export class AccountService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('student_os_session_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async getOverview(): Promise<AccountOverviewDTO> {
    try {
      const res = await fetch(`${API_BASE_URL}/overview`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch account overview');
      const json = await res.json();
      if (json.success && json.data) {
        storage.setItem('account_overview', json.data);
        return json.data;
      }
      throw new Error(json.error || 'Failed to fetch account overview');
    } catch (err) {
      console.warn('Network request failed, retrieving cached account overview offline', err);
      const cached = storage.getItem<AccountOverviewDTO>('account_overview');
      if (cached) return cached;

      const now = new Date().toISOString();
      return {
        accountId: 'acc-offline',
        email: 'student@example.com',
        createdAt: now,
        lastLoginAt: now,
        profile: {
          accountId: 'acc-offline',
          fullName: 'Student',
          preferredDailyStudyTargetMinutes: 120,
          preferredSessionDurationMinutes: 45,
          preferredStudyTime: 'morning',
          preferredRevisionStrategy: 'spaced',
          preferredPlannerView: 'day',
          createdAt: now,
          updatedAt: now,
        },
        preferences: {
          accountId: 'acc-offline',
          theme: 'system',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          firstDayOfWeek: 'monday',
          timeZone: 'UTC',
          showCompletedBlocks: true,
          breakReminderIntervalMinutes: 50,
          updatedAt: now,
        },
        devices: [],
      };
    }
  }

  static async updateProfile(input: UpdateProfileInput): Promise<UserProfileDTO> {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    throw new Error(json.error || 'Failed to update profile');
  }

  static async updatePreferences(input: UpdatePreferencesInput): Promise<UserPreferencesDTO> {
    const res = await fetch(`${API_BASE_URL}/preferences`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
    const json = await res.json();
    if (json.success && json.data) {
      const cached = storage.getItem<AccountOverviewDTO>('account_overview');
      if (cached) {
        cached.preferences = json.data;
        storage.setItem('account_overview', cached);
      }
      return json.data;
    }
    throw new Error(json.error || 'Failed to update preferences');
  }

  static async getDevices(): Promise<DeviceSessionDTO[]> {
    const res = await fetch(`${API_BASE_URL}/devices`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch devices');
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    throw new Error(json.error || 'Failed to fetch devices');
  }

  static async revokeDevice(deviceId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to revoke device');
  }

  static async deleteAccount(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete account');
  }
}
