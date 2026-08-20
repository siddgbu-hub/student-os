import { Hono } from 'hono';
import type { Env } from '../../index.js';
import { ANDROID_RELEASE_METADATA, DEFAULT_REMOTE_APP_CONFIG, type RemoteAppConfig } from './app.config.js';

export const appRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/app/config - Public, unauthenticated lightweight configuration & feature flags
appRouter.get('/config', async (c) => {
  let config: RemoteAppConfig = { ...DEFAULT_REMOTE_APP_CONFIG };

  // Attempt D1 override if remote_app_config table exists
  if (c.env?.DB) {
    try {
      const row = await c.env.DB.prepare(
        'SELECT config_json FROM remote_app_config WHERE id = ? LIMIT 1'
      )
        .bind('default')
        .first<{ config_json: string }>();

      if (row?.config_json) {
        const parsed = JSON.parse(row.config_json);
        config = {
          ...DEFAULT_REMOTE_APP_CONFIG,
          ...parsed,
          features: {
            ...DEFAULT_REMOTE_APP_CONFIG.features,
            ...(parsed.features || {}),
          },
        };
      }
    } catch {
      // Table doesn't exist yet or query failed — safely fallback to static default
    }
  }

  // Set edge caching headers (60s browser, 300s edge CDN)
  c.header('Cache-Control', 'public, max-age=60, s-maxage=300');

  return c.json({
    success: true,
    data: config,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/app/version/android - Public, unauthenticated endpoint (legacy compatibility)
appRouter.get('/version/android', (c) => {
  return c.json({
    success: true,
    data: ANDROID_RELEASE_METADATA,
    timestamp: new Date().toISOString(),
  });
});
