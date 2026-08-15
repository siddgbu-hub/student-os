import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './modules/auth/auth.controller.js';
import { studyRouter } from './modules/study/study.controller.js';
import { plannerRouter } from './modules/planner/planner.controller.js';
import { revisionRouter } from './modules/revision/revision.controller.js';
import { analyticsRouter } from './modules/analytics/analytics.controller.js';
import { accountRouter } from './modules/account/account.controller.js';
import { goalRouter } from './modules/goal/goal.controller.js';
import { entitlementRouter, paymentRouter } from './modules/entitlement/entitlement.controller.js';
import { adminRouter } from './modules/admin/admin.controller.js';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN?: string;
  JWT_SECRET?: string;
  BREVO_API_KEY?: string;
  BREVO_FROM_EMAIL?: string;
  BREVO_FROM_NAME?: string;
  GOOGLE_CLIENT_ID?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  PAYMENT_WEBHOOK_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const allowedOrigin = c.env.ALLOWED_ORIGIN;

  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin) return allowedOrigin || '*';
      if (allowedOrigin && origin === allowedOrigin) return origin;
      if (/^https:\/\/([a-zA-Z0-9-]+\.)?(student-os-19f|student-os-admin)\.pages\.dev$/.test(origin)) {
        return origin;
      }
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return origin;
      }
      return allowedOrigin || origin;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  });

  return corsMiddleware(c, next);
});

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
app.route('/api/v1/entitlement', entitlementRouter);
app.route('/api/v1/payment', paymentRouter);
app.route('/api/v1/admin', adminRouter);

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
