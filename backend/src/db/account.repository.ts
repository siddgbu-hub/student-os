import { UserProfileDTO, UserPreferencesDTO, DeviceSessionDTO } from '@student-os/shared';

export interface RawAccountRecord {
  account_id: string;
  email: string;
  created_at: string;
  last_login_at: string;
}

export interface RawProfileRecord {
  account_id: string;
  full_name: string;
  avatar_url: string | null;
  institution_name: string | null;
  course: string | null;
  class_year: string | null;
  stream: string | null;
  examination_type: string | null;
  preferred_daily_study_target_minutes: number;
  preferred_session_duration_minutes: number;
  preferred_study_time: string;
  preferred_revision_strategy: string;
  preferred_planner_view: string;
  created_at: string;
  updated_at: string;
}

export interface RawPreferencesRecord {
  account_id: string;
  theme: string;
  date_format: string;
  time_format: string;
  first_day_of_week: string;
  time_zone: string;
  show_completed_blocks: number;
  break_reminder_interval_minutes: number;
  notifications_enabled?: number;
  planner_reminders_enabled?: number;
  revision_reminders_enabled?: number;
  quiet_hours_enabled?: number;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  reminder_lead_time_minutes?: number;
  show_private_details_in_notifications?: number;
  updated_at: string;
}

export interface RawDeviceRecord {
  device_id: string;
  account_id: string;
  device_model: string | null;
  os_version: string | null;
  is_active: number;
  registered_at: string;
  last_active_at: string;
}

export class AccountRepository {
  constructor(private db: D1Database) {}

  async getAccountById(accountId: string): Promise<RawAccountRecord | null> {
    const res = await this.db
      .prepare(`SELECT account_id, email, created_at, last_login_at FROM accounts WHERE account_id = ?`)
      .bind(accountId)
      .first<RawAccountRecord>();
    return res || null;
  }

  async getProfileByAccountId(accountId: string): Promise<UserProfileDTO | null> {
    const res = await this.db
      .prepare(
        `SELECT account_id, full_name, avatar_url, institution_name, course, class_year, stream, examination_type,
                preferred_daily_study_target_minutes, preferred_session_duration_minutes, preferred_study_time,
                preferred_revision_strategy, preferred_planner_view, created_at, updated_at
         FROM user_profiles WHERE account_id = ?`
      )
      .bind(accountId)
      .first<RawProfileRecord>();

    if (!res) return null;

    return {
      accountId: res.account_id,
      fullName: res.full_name,
      avatarUrl: res.avatar_url,
      institutionName: res.institution_name,
      course: res.course,
      classYear: res.class_year,
      stream: res.stream,
      examinationType: res.examination_type,
      preferredDailyStudyTargetMinutes: res.preferred_daily_study_target_minutes,
      preferredSessionDurationMinutes: res.preferred_session_duration_minutes,
      preferredStudyTime: res.preferred_study_time as UserProfileDTO['preferredStudyTime'],
      preferredRevisionStrategy: res.preferred_revision_strategy as UserProfileDTO['preferredRevisionStrategy'],
      preferredPlannerView: res.preferred_planner_view as UserProfileDTO['preferredPlannerView'],
      createdAt: res.created_at,
      updatedAt: res.updated_at,
    };
  }

  async upsertProfile(accountId: string, input: Partial<UserProfileDTO>): Promise<UserProfileDTO> {
    const now = new Date().toISOString();
    const existing = await this.getProfileByAccountId(accountId);

    const full_name = input.fullName ?? existing?.fullName ?? 'Student';
    const avatar_url = input.avatarUrl !== undefined ? input.avatarUrl : existing?.avatarUrl ?? null;
    const institution_name = input.institutionName !== undefined ? input.institutionName : existing?.institutionName ?? null;
    const course = input.course !== undefined ? input.course : existing?.course ?? null;
    const class_year = input.classYear !== undefined ? input.classYear : existing?.classYear ?? null;
    const stream = input.stream !== undefined ? input.stream : existing?.stream ?? null;
    const examination_type = input.examinationType !== undefined ? input.examinationType : existing?.examinationType ?? null;
    const target_mins = input.preferredDailyStudyTargetMinutes ?? existing?.preferredDailyStudyTargetMinutes ?? 120;
    const session_mins = input.preferredSessionDurationMinutes ?? existing?.preferredSessionDurationMinutes ?? 45;
    const study_time = input.preferredStudyTime ?? existing?.preferredStudyTime ?? 'morning';
    const rev_strategy = input.preferredRevisionStrategy ?? existing?.preferredRevisionStrategy ?? 'spaced';
    const planner_view = input.preferredPlannerView ?? existing?.preferredPlannerView ?? 'day';
    const created_at = existing?.createdAt ?? now;

    await this.db
      .prepare(
        `INSERT INTO user_profiles (
          account_id, full_name, avatar_url, institution_name, course, class_year, stream, examination_type,
          preferred_daily_study_target_minutes, preferred_session_duration_minutes, preferred_study_time,
          preferred_revision_strategy, preferred_planner_view, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          full_name = excluded.full_name,
          avatar_url = excluded.avatar_url,
          institution_name = excluded.institution_name,
          course = excluded.course,
          class_year = excluded.class_year,
          stream = excluded.stream,
          examination_type = excluded.examination_type,
          preferred_daily_study_target_minutes = excluded.preferred_daily_study_target_minutes,
          preferred_session_duration_minutes = excluded.preferred_session_duration_minutes,
          preferred_study_time = excluded.preferred_study_time,
          preferred_revision_strategy = excluded.preferred_revision_strategy,
          preferred_planner_view = excluded.preferred_planner_view,
          updated_at = excluded.updated_at`
      )
      .bind(
        accountId, full_name, avatar_url, institution_name, course, class_year, stream, examination_type,
        target_mins, session_mins, study_time, rev_strategy, planner_view, created_at, now
      )
      .run();

    return (await this.getProfileByAccountId(accountId))!;
  }

  async getPreferencesByAccountId(accountId: string): Promise<UserPreferencesDTO | null> {
    const res = await this.db
      .prepare(
        `SELECT account_id, theme, date_format, time_format, first_day_of_week, time_zone,
                show_completed_blocks, break_reminder_interval_minutes,
                notifications_enabled, planner_reminders_enabled, revision_reminders_enabled,
                quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                reminder_lead_time_minutes, show_private_details_in_notifications, updated_at
         FROM user_preferences WHERE account_id = ?`
      )
      .bind(accountId)
      .first<RawPreferencesRecord>();

    if (!res) return null;

    return {
      accountId: res.account_id,
      theme: res.theme as UserPreferencesDTO['theme'],
      dateFormat: res.date_format,
      timeFormat: res.time_format as UserPreferencesDTO['timeFormat'],
      firstDayOfWeek: res.first_day_of_week as UserPreferencesDTO['firstDayOfWeek'],
      timeZone: res.time_zone,
      showCompletedBlocks: Boolean(res.show_completed_blocks),
      breakReminderIntervalMinutes: res.break_reminder_interval_minutes,
      notificationsEnabled: res.notifications_enabled !== undefined ? Boolean(res.notifications_enabled) : true,
      plannerRemindersEnabled: res.planner_reminders_enabled !== undefined ? Boolean(res.planner_reminders_enabled) : true,
      revisionRemindersEnabled: res.revision_reminders_enabled !== undefined ? Boolean(res.revision_reminders_enabled) : true,
      quietHoursEnabled: res.quiet_hours_enabled !== undefined ? Boolean(res.quiet_hours_enabled) : false,
      quietHoursStart: res.quiet_hours_start || '22:00',
      quietHoursEnd: res.quiet_hours_end || '07:00',
      reminderLeadTimeMinutes: res.reminder_lead_time_minutes !== undefined ? res.reminder_lead_time_minutes : 15,
      showPrivateDetailsInNotifications: res.show_private_details_in_notifications !== undefined ? Boolean(res.show_private_details_in_notifications) : false,
      updatedAt: res.updated_at,
    };
  }

  async upsertPreferences(accountId: string, input: Partial<UserPreferencesDTO>): Promise<UserPreferencesDTO> {
    const now = new Date().toISOString();
    const existing = await this.getPreferencesByAccountId(accountId);

    const theme = input.theme ?? existing?.theme ?? 'system';
    const date_format = input.dateFormat ?? existing?.dateFormat ?? 'YYYY-MM-DD';
    const time_format = input.timeFormat ?? existing?.timeFormat ?? '24h';
    const first_day = input.firstDayOfWeek ?? existing?.firstDayOfWeek ?? 'monday';
    const time_zone = input.timeZone ?? existing?.timeZone ?? 'UTC';
    const show_completed = input.showCompletedBlocks !== undefined ? (input.showCompletedBlocks ? 1 : 0) : existing?.showCompletedBlocks ? 1 : 1;
    const break_interval = input.breakReminderIntervalMinutes ?? existing?.breakReminderIntervalMinutes ?? 50;

    const notif_enabled = input.notificationsEnabled !== undefined ? (input.notificationsEnabled ? 1 : 0) : existing?.notificationsEnabled ? 1 : 1;
    const planner_notif = input.plannerRemindersEnabled !== undefined ? (input.plannerRemindersEnabled ? 1 : 0) : existing?.plannerRemindersEnabled ? 1 : 1;
    const rev_notif = input.revisionRemindersEnabled !== undefined ? (input.revisionRemindersEnabled ? 1 : 0) : existing?.revisionRemindersEnabled ? 1 : 1;
    const quiet_enabled = input.quietHoursEnabled !== undefined ? (input.quietHoursEnabled ? 1 : 0) : existing?.quietHoursEnabled ? 1 : 0;
    const quiet_start = input.quietHoursStart ?? existing?.quietHoursStart ?? '22:00';
    const quiet_end = input.quietHoursEnd ?? existing?.quietHoursEnd ?? '07:00';
    const lead_time = input.reminderLeadTimeMinutes ?? existing?.reminderLeadTimeMinutes ?? 15;
    const show_private = input.showPrivateDetailsInNotifications !== undefined ? (input.showPrivateDetailsInNotifications ? 1 : 0) : existing?.showPrivateDetailsInNotifications ? 1 : 0;

    await this.db
      .prepare(
        `INSERT INTO user_preferences (
          account_id, theme, date_format, time_format, first_day_of_week, time_zone,
          show_completed_blocks, break_reminder_interval_minutes,
          notifications_enabled, planner_reminders_enabled, revision_reminders_enabled,
          quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
          reminder_lead_time_minutes, show_private_details_in_notifications, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          theme = excluded.theme,
          date_format = excluded.date_format,
          time_format = excluded.time_format,
          first_day_of_week = excluded.first_day_of_week,
          time_zone = excluded.time_zone,
          show_completed_blocks = excluded.show_completed_blocks,
          break_reminder_interval_minutes = excluded.break_reminder_interval_minutes,
          notifications_enabled = excluded.notifications_enabled,
          planner_reminders_enabled = excluded.planner_reminders_enabled,
          revision_reminders_enabled = excluded.revision_reminders_enabled,
          quiet_hours_enabled = excluded.quiet_hours_enabled,
          quiet_hours_start = excluded.quiet_hours_start,
          quiet_hours_end = excluded.quiet_hours_end,
          reminder_lead_time_minutes = excluded.reminder_lead_time_minutes,
          show_private_details_in_notifications = excluded.show_private_details_in_notifications,
          updated_at = excluded.updated_at`
      )
      .bind(
        accountId, theme, date_format, time_format, first_day, time_zone, show_completed, break_interval,
        notif_enabled, planner_notif, rev_notif, quiet_enabled, quiet_start, quiet_end, lead_time, show_private, now
      )
      .run();

    return (await this.getPreferencesByAccountId(accountId))!;
  }

  async getDevicesByAccountId(accountId: string, currentDeviceId: string): Promise<DeviceSessionDTO[]> {
    const res = await this.db
      .prepare(
        `SELECT device_id, account_id, device_model, os_version, is_active, registered_at, last_active_at
         FROM devices WHERE account_id = ? AND is_active = 1 ORDER BY last_active_at DESC`
      )
      .bind(accountId)
      .all<RawDeviceRecord>();

    return (res.results || []).map((d) => ({
      deviceId: d.device_id,
      deviceModel: d.device_model,
      osVersion: d.os_version,
      registeredAt: d.registered_at,
      lastActiveAt: d.last_active_at,
      isCurrentDevice: d.device_id === currentDeviceId,
    }));
  }

  async revokeDevice(accountId: string, deviceId: string): Promise<void> {
    await this.db
      .prepare(`UPDATE devices SET is_active = 0 WHERE account_id = ? AND device_id = ?`)
      .bind(accountId, deviceId)
      .run();
    await this.db
      .prepare(`DELETE FROM sessions WHERE account_id = ? AND device_id = ?`)
      .bind(accountId, deviceId)
      .run();
  }

  async deleteAccountData(accountId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM revision_item_logs WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM revision_sessions WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM revision_items WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM planner_task_logs WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM planner_tasks WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM study_sessions WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM chapters WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM subjects WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM user_preferences WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM user_profiles WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM sessions WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM devices WHERE account_id = ?`).bind(accountId).run();
    await this.db.prepare(`DELETE FROM accounts WHERE account_id = ?`).bind(accountId).run();
  }
}
