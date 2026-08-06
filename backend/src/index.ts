import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './modules/auth/auth.controller.js';

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
