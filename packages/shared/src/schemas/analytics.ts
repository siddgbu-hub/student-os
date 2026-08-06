import { z } from 'zod';

export const AnalyticsQuerySchema = z.object({
  period: z.enum(['today', 'this_week', 'this_month', 'this_year']).default('this_week'),
});

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;
