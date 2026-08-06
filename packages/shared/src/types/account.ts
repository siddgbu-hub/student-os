export interface UserProfileDTO {
  accountId: string;
  fullName: string;
  avatarUrl?: string | null;
  institutionName?: string | null;
  course?: string | null;
  classYear?: string | null;
  stream?: string | null;
  examinationType?: string | null;
  preferredDailyStudyTargetMinutes: number;
  preferredSessionDurationMinutes: number;
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night';
  preferredRevisionStrategy: 'spaced' | 'daily' | 'weekly';
  preferredPlannerView: 'day' | 'week' | 'month';
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferencesDTO {
  accountId: string;
  theme: 'system' | 'light' | 'dark';
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 'monday' | 'sunday';
  timeZone: string;
  showCompletedBlocks: boolean;
  breakReminderIntervalMinutes: number;
  updatedAt: string;
}

export interface DeviceSessionDTO {
  deviceId: string;
  deviceModel?: string | null;
  osVersion?: string | null;
  registeredAt: string;
  lastActiveAt: string;
  isCurrentDevice: boolean;
}

export interface AccountOverviewDTO {
  accountId: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  profile: UserProfileDTO;
  preferences: UserPreferencesDTO;
  devices: DeviceSessionDTO[];
}
