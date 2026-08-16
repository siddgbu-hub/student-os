import { Hono } from 'hono';
import type { Env } from '../../index.js';
import { ANDROID_RELEASE_METADATA } from './app.config.js';

export const appRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/app/version/android - Public, unauthenticated endpoint
appRouter.get('/version/android', (c) => {
  return c.json({
    success: true,
    data: ANDROID_RELEASE_METADATA,
    timestamp: new Date().toISOString(),
  });
});
