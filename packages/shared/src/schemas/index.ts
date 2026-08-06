import { z } from 'zod';

export const BaseResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string(),
});
