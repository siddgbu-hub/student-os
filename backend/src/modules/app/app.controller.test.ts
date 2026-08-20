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
    expect(body.data.latestVersionCode).toBe(5);
    expect(body.data.latestVersionName).toBe('1.0.4');
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

  it('3. CORS accepts explicit production origins from ALLOWED_ORIGIN allowlist', async () => {
    const env = { ALLOWED_ORIGIN: 'https://studentos.kryvlance.in, https://admin.studentos.kryvlance.in' };

    // Test main user app origin
    const resUser = await app.request(
      '/api/v1/health',
      { method: 'OPTIONS', headers: { Origin: 'https://studentos.kryvlance.in' } },
      env
    );
    expect(resUser.headers.get('Access-Control-Allow-Origin')).toBe('https://studentos.kryvlance.in');

    // Test admin console origin
    const resAdmin = await app.request(
      '/api/v1/health',
      { method: 'OPTIONS', headers: { Origin: 'https://admin.studentos.kryvlance.in' } },
      env
    );
    expect(resAdmin.headers.get('Access-Control-Allow-Origin')).toBe('https://admin.studentos.kryvlance.in');

    // Test pages.dev origin
    const resPages = await app.request(
      '/api/v1/health',
      { method: 'OPTIONS', headers: { Origin: 'https://student-os-admin.pages.dev' } },
      env
    );
    expect(resPages.headers.get('Access-Control-Allow-Origin')).toBe('https://student-os-admin.pages.dev');

    // Test localhost origin
    const resLocal = await app.request(
      '/api/v1/health',
      { method: 'OPTIONS', headers: { Origin: 'http://localhost:5176' } },
      env
    );
    expect(resLocal.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5176');

    // Test unauthorized origin is rejected (no Access-Control-Allow-Origin header)
    const resUnauthorized = await app.request(
      '/api/v1/health',
      { method: 'OPTIONS', headers: { Origin: 'https://unauthorized-domain.com' } },
      env
    );
    expect(resUnauthorized.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
