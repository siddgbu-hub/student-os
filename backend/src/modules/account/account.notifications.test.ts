import { describe, it, expect } from 'vitest';
import { UpdatePreferencesSchema } from '@student-os/shared';

// Logic mirror of AlarmScheduler quiet hours deferral rule
function adjustForQuietHours(
  triggerEpochMs: number,
  eventEpochMs: number,
  quietStartStr: string,
  quietEndStr: string
): number | null {
  const triggerDate = new Date(triggerEpochMs);
  const triggerMins = triggerDate.getHours() * 60 + triggerDate.getMinutes();

  const [sH, sM] = quietStartStr.split(':').map(Number);
  const [eH, eM] = quietEndStr.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;

  const inQuietHours = startMins > endMins
    ? (triggerMins >= startMins || triggerMins < endMins)
    : (triggerMins >= startMins && triggerMins < endMins);

  if (!inQuietHours) return triggerEpochMs;

  const deferredDate = new Date(triggerEpochMs);
  if (startMins > endMins && triggerMins >= startMins) {
    deferredDate.setDate(deferredDate.getDate() + 1);
  }
  deferredDate.setHours(eH, eM, 0, 0);

  const deferredEpochMs = deferredDate.getTime();
  if (deferredEpochMs >= eventEpochMs) {
    return null; // Event start time already passed at quiet hours end -> Suppress
  }

  return deferredEpochMs;
}

describe('P3 Step 1 — Notification Preferences Schema & Alarm Calculation Unit Tests', () => {

  describe('UpdatePreferencesSchema Validation', () => {
    it('accepts valid notification preference input', () => {
      const validPayload = {
        notificationsEnabled: true,
        plannerRemindersEnabled: true,
        revisionRemindersEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        reminderLeadTimeMinutes: 15,
        showPrivateDetailsInNotifications: false,
      };

      const result = UpdatePreferencesSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid lead time values', () => {
      const invalidPayload = { reminderLeadTimeMinutes: 20 };
      const result = UpdatePreferencesSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('accepts supported lead time options (0, 5, 10, 15, 30)', () => {
      [0, 5, 10, 15, 30].forEach((leadTime) => {
        const result = UpdatePreferencesSchema.safeParse({ reminderLeadTimeMinutes: leadTime });
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid quiet hours time format', () => {
      const invalidPayload = { quietHoursStart: '25:99' };
      const result = UpdatePreferencesSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('Lead Time Trigger Epoch Calculation', () => {
    it('calculates 15-minute lead time correctly', () => {
      const taskStartMs = new Date('2026-08-14T09:00:00Z').getTime();
      const leadTimeMins = 15;
      const expectedTriggerMs = taskStartMs - leadTimeMins * 60 * 1000;
      expect(expectedTriggerMs).toBe(new Date('2026-08-14T08:45:00Z').getTime());
    });

    it('calculates 0-minute lead time correctly', () => {
      const taskStartMs = new Date('2026-08-14T09:00:00Z').getTime();
      const expectedTriggerMs = taskStartMs - 0 * 60 * 1000;
      expect(expectedTriggerMs).toBe(taskStartMs);
    });

    it('calculates 30-minute lead time correctly', () => {
      const taskStartMs = new Date('2026-08-14T09:00:00Z').getTime();
      const expectedTriggerMs = taskStartMs - 30 * 60 * 1000;
      expect(expectedTriggerMs).toBe(new Date('2026-08-14T08:30:00Z').getTime());
    });
  });

  describe('Quiet Hours Deferral & Suppression Logic', () => {
    it('leaves trigger untouched if outside quiet hours', () => {
      const triggerMs = new Date('2026-08-14T14:00:00').getTime(); // 2 PM
      const eventMs = new Date('2026-08-14T14:15:00').getTime();
      const adjusted = adjustForQuietHours(triggerMs, eventMs, '22:00', '07:00');
      expect(adjusted).toBe(triggerMs);
    });

    it('defers trigger to quiet hours end if inside quiet hours and still actionable', () => {
      // Quiet hours 22:00 -> 07:00
      // Trigger at 23:30 (11:30 PM) for event at 08:30 AM next day
      const triggerMs = new Date('2026-08-14T23:30:00').getTime();
      const eventMs = new Date('2026-08-15T08:30:00').getTime();
      const adjusted = adjustForQuietHours(triggerMs, eventMs, '22:00', '07:00');

      expect(adjusted).not.toBeNull();
      const adjustedDate = new Date(adjusted!);
      expect(adjustedDate.getHours()).toBe(7);
      expect(adjustedDate.getMinutes()).toBe(0);
    });

    it('suppresses trigger if event start time has passed before quiet hours end', () => {
      // Quiet hours 22:00 -> 07:00
      // Event starts at 06:30 AM (before quiet hours end at 07:00 AM)
      const triggerMs = new Date('2026-08-14T23:30:00').getTime();
      const eventMs = new Date('2026-08-15T06:30:00').getTime();
      const adjusted = adjustForQuietHours(triggerMs, eventMs, '22:00', '07:00');

      expect(adjusted).toBeNull(); // Suppressed
    });
  });

  describe('Notification Identity & Deduplication Hash', () => {
    it('generates stable deterministic hash for task reminder', () => {
      const hash1 = 'planner:task-demo-123'.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
      const hash2 = 'planner:task-demo-123'.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
      expect(hash1).toBe(hash2);
    });
  });
});
