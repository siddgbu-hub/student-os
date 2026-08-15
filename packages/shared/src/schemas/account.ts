import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name required').max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  institutionName: z.string().max(100).optional().nullable(),
  course: z.string().max(100).optional().nullable(),
  classYear: z.string().max(50).optional().nullable(),
  stream: z.string().max(50).optional().nullable(),
  examinationType: z.string().max(50).optional().nullable(),
  preferredDailyStudyTargetMinutes: z.number().min(15).max(1440).optional(),
  preferredSessionDurationMinutes: z.number().min(10).max(300).optional(),
  preferredStudyTime: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
  preferredRevisionStrategy: z.enum(['spaced', 'daily', 'weekly']).optional(),
  preferredPlannerView: z.enum(['day', 'week', 'month']).optional(),
});

export const UpdatePreferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  dateFormat: z.string().max(20).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  firstDayOfWeek: z.enum(['monday', 'sunday']).optional(),
  timeZone: z.string().max(50).optional(),
  showCompletedBlocks: z.boolean().optional(),
  breakReminderIntervalMinutes: z.number().min(10).max(180).optional(),
  notificationsEnabled: z.boolean().optional(),
  plannerRemindersEnabled: z.boolean().optional(),
  revisionRemindersEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid HH:mm time format').optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid HH:mm time format').optional(),
  reminderLeadTimeMinutes: z.number().refine((val) => [0, 5, 10, 15, 30].includes(val), {
    message: 'Lead time must be 0, 5, 10, 15, or 30 minutes',
  }).optional(),
  showPrivateDetailsInNotifications: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
