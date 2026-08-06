import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './modules/auth/auth.controller.js';
import { studyRouter } from './modules/study/study.controller.js';
import { plannerRouter } from './modules/planner/planner.controller.js';
import { revisionRouter } from './modules/revision/revision.controller.js';
import { analyticsRouter } from './modules/analytics/analytics.controller.js';
import { accountRouter } from './modules/account/account.controller.js';
import { goalRouter } from './modules/goal/goal.controller.js';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ENVIRONMENT: string;
  JWT_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/api/v1/health', (c) => {
  return c.json({
    success: true,
    service: 'student-os-api',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.route('/api/v1/auth', authRouter);
app.route('/api/v1/study', studyRouter);
app.route('/api/v1/planner', plannerRouter);
app.route('/api/v1/revision', revisionRouter);
app.route('/api/v1/analytics', analyticsRouter);
app.route('/api/v1/account', accountRouter);
app.route('/api/v1/goal', goalRouter);

app.onError((err, c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    },
    500
  );
});

export default app;
