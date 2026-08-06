import { z } from 'zod';

export const CreateGoalSchema = z.object({
  examName: z.string().min(1, 'Exam name required').max(100),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  targetScore: z.string().max(50).optional().nullable(),
  targetDailyMinutes: z.number().min(15).max(1440).default(120),
  targetTotalChapters: z.number().min(1).max(500).optional().nullable(),
  completedChapters: z.number().min(0).default(0),
});

export const UpdateGoalSchema = CreateGoalSchema.partial().extend({
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;
