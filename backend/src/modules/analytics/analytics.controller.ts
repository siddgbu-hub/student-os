import { Hono, Context } from 'hono';
import type { Env } from '../../index.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { requireActiveSubscription } from '../../middleware/entitlement.js';
import { AnalyticsRepository } from '../../db/analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQuerySchema, TimePeriod } from '@student-os/shared';

export const analyticsRouter = new Hono<{
  Bindings: Env;
  Variables: {
    accountId: string;
    sessionId: string;
    deviceId: string;
  };
}>();

analyticsRouter.use('*', createAuthMiddleware, requireActiveSubscription());

type AnalyticsContext = Context<{
  Bindings: Env;
  Variables: { accountId: string; sessionId: string; deviceId: string };
}>;

function getAnalyticsService(c: AnalyticsContext): AnalyticsService {
  const repo = new AnalyticsRepository(c.env.DB);
  return new AnalyticsService(repo);
}

// 1. GET /api/v1/analytics/dashboard?period=this_week
analyticsRouter.get('/dashboard', async (c) => {
  const accountId = c.get('accountId');
  const periodParam = c.req.query('period') || 'this_week';
  const parseRes = AnalyticsQuerySchema.safeParse({ period: periodParam });

  const period: TimePeriod = parseRes.success ? parseRes.data.period : 'this_week';
  const service = getAnalyticsService(c);

  try {
    const dashboard = await service.getDashboardAnalytics(accountId, period);
    return c.json({ success: true, data: dashboard }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ANALYTICS_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 2. GET /api/v1/analytics/subjects?period=this_week
analyticsRouter.get('/subjects', async (c) => {
  const accountId = c.get('accountId');
  const periodParam = c.req.query('period') || 'this_week';
  const parseRes = AnalyticsQuerySchema.safeParse({ period: periodParam });

  const period: TimePeriod = parseRes.success ? parseRes.data.period : 'this_week';
  const service = getAnalyticsService(c);

  try {
    const dashboard = await service.getDashboardAnalytics(accountId, period);
    return c.json({ success: true, data: dashboard.subjectAnalytics }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ANALYTICS_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 3. GET /api/v1/analytics/trends?period=this_week
analyticsRouter.get('/trends', async (c) => {
  const accountId = c.get('accountId');
  const periodParam = c.req.query('period') || 'this_week';
  const parseRes = AnalyticsQuerySchema.safeParse({ period: periodParam });

  const period: TimePeriod = parseRes.success ? parseRes.data.period : 'this_week';
  const service = getAnalyticsService(c);

  try {
    const dashboard = await service.getDashboardAnalytics(accountId, period);
    return c.json({ success: true, data: dashboard.trends }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ANALYTICS_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});
