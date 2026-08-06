import { z } from 'zod';

export const CreatePlannerTaskSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  chapterId: z.string().uuid('Invalid chapter ID').optional().nullable(),
  title: z.string().trim().min(1, 'Task title is required').max(200, 'Title is too long'),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned date must be YYYY-MM-DD'),
  plannedStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm format')
    .optional()
    .nullable(),
  estimatedDurationMinutes: z
    .number()
    .int('Duration must be an integer')
    .positive('Duration must be greater than 0')
    .max(720, 'Duration cannot exceed 12 hours'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const UpdatePlannerTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200, 'Title is too long').optional(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned date must be YYYY-MM-DD').optional(),
  plannedStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm format')
    .optional()
    .nullable(),
  estimatedDurationMinutes: z
    .number()
    .int()
    .positive()
    .max(720)
    .optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z
    .enum(['planned', 'in_progress', 'paused', 'completed', 'skipped', 'deferred', 'archived'])
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const ReschedulePlannerTaskSchema = z.object({
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  action: z.enum(['move_tomorrow', 'move_this_week', 'reschedule']),
});

export type CreatePlannerTaskInput = z.infer<typeof CreatePlannerTaskSchema>;
export type UpdatePlannerTaskInput = z.infer<typeof UpdatePlannerTaskSchema>;
export type ReschedulePlannerTaskInput = z.infer<typeof ReschedulePlannerTaskSchema>;
