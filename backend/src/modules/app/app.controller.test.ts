import { describe, it, expect } from 'vitest';
import { appRouter } from './app.controller.js';
import app from '../../index.js';

describe('App Version Controller — GET /api/v1/app/version/android', () => {
  it('1. Endpoint is public, unauthenticated, and returns 200 with complete release metadata schema via appRouter', async () => {
    const res = await appRouter.request('/version/android', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.platform).toBe('android');
    expect(body.data.latestVersionCode).toBe(3);
    expect(body.data.latestVersionName).toBe('1.0.2');
    expect(body.data.minimumSupportedVersionCode).toBe(1);
    expect(typeof body.data.updateRequired).toBe('boolean');
    expect(typeof body.data.releaseTitle).toBe('string');
    expect(Array.isArray(body.data.releaseNotes)).toBe(true);
    expect(body.data.releaseNotes.length).toBeGreaterThan(0);
    expect(body.data.apkUrl).toMatch(/^https:\/\//);
    expect(body.data.apkSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(typeof body.data.apkSizeBytes).toBe('number');
    expect(body.data.apkSizeBytes).toBeGreaterThan(0);
    expect(body.data.publishedAt).toBeDefined();
  });

  it('2. Endpoint works through root app middleware without auth requirement', async () => {
    const res = await app.request(
      '/api/v1/app/version/android',
      { method: 'GET' },
      { ALLOWED_ORIGIN: '*' }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.latestVersionCode).toBe(3);
  });
});
