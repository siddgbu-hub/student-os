import { z } from 'zod';

export const CreateRevisionItemSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  chapterId: z.string().uuid('Invalid chapter ID').optional().nullable(),
  originatingStudySessionId: z.string().uuid('Invalid study session ID').optional().nullable(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be YYYY-MM-DD'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const UpdateRevisionItemSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be YYYY-MM-DD').optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const RescheduleRevisionItemSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be YYYY-MM-DD'),
});

export const StartRevisionSessionSchema = z.object({
  revisionItemId: z.string().uuid('Invalid revision item ID'),
});

export type CreateRevisionItemInput = z.infer<typeof CreateRevisionItemSchema>;
export type UpdateRevisionItemInput = z.infer<typeof UpdateRevisionItemSchema>;
export type RescheduleRevisionItemInput = z.infer<typeof RescheduleRevisionItemSchema>;
export type StartRevisionSessionInput = z.infer<typeof StartRevisionSessionSchema>;
