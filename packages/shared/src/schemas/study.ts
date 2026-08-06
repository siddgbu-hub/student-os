import { z } from 'zod';

export const CreateSubjectSchema = z.object({
  name: z.string().trim().min(1, 'Subject name is required').max(100, 'Subject name is too long'),
});

export const UpdateSubjectSchema = z.object({
  name: z.string().trim().min(1, 'Subject name is required').max(100, 'Subject name is too long'),
});

export const CreateChapterSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  name: z.string().trim().min(1, 'Chapter name is required').max(150, 'Chapter name is too long'),
  orderIndex: z.number().int().nonnegative().optional(),
});

export const UpdateChapterSchema = z.object({
  name: z.string().trim().min(1, 'Chapter name is required').max(150, 'Chapter name is too long').optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  isCompleted: z.boolean().optional(),
});

export const StartSessionSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  chapterId: z.string().uuid('Invalid chapter ID').optional().nullable(),
});

export const EndSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
export type CreateChapterInput = z.infer<typeof CreateChapterSchema>;
export type UpdateChapterInput = z.infer<typeof UpdateChapterSchema>;
export type StartSessionInput = z.infer<typeof StartSessionSchema>;
export type EndSessionInput = z.infer<typeof EndSessionSchema>;
