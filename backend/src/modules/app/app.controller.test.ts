import { describe, it, expect } from 'vitest';
import { appRouter } from './app.controller.js';
import { adminRouter } from '../admin/admin.controller.js';
import app from '../../index.js';

describe('App Controller — GET /api/v1/app/config & version', () => {
  it('1. GET /api/v1/app/config is public, unauthenticated, and returns 200 with full RemoteAppConfig schema', async () => {
    const res = await appRouter.request('/config', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('public');
    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');

    const body = (await res.json()) as any;

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    // Version configuration
    expect(typeof body.data.minimumSupportedVersion).toBe('string');
    expect(typeof body.data.minimumSupportedVersionCode).toBe('number');
    expect(typeof body.data.latestVersion).toBe('string');
    expect(typeof body.data.latestVersionCode).toBe('number');
    expect(typeof body.data.recommendedUpdateVersion).toBe('string');
    expect(typeof body.data.forceUpdate).toBe('boolean');

    // Maintenance configuration
    expect(typeof body.data.maintenanceMode).toBe('boolean');
    expect(body.data.maintenanceMode).toBe(false);

    // Feature flags
    expect(body.data.features).toBeDefined();
    expect(typeof body.data.features.analytics).toBe('boolean');
    expect(typeof body.data.features.planner).toBe('boolean');
    expect(typeof body.data.features.revision).toBe('boolean');
    expect(typeof body.data.features.study).toBe('boolean');
    expect(typeof body.data.features.payments).toBe('boolean');
    expect(typeof body.data.features.webVersion).toBe('boolean');
    expect(typeof body.data.features.newDashboard).toBe('boolean');

    // URLs & GitHub Releases
    expect(body.data.webUrl).toBe('https://studentos.kryvlance.in');
    expect(body.data.githubReleaseUrl).toBe('https://github.com/siddgbu-hub/student-os/releases');
    expect(body.data.githubLatestReleaseUrl).toBe('https://github.com/siddgbu-hub/student-os/releases/tag/v1.0.5');
    expect(body.data.githubLatestApkUrl).toBe('https://github.com/siddgbu-hub/student-os/releases/download/v1.0.5/student-os-v1.0.5.apk');
    expect(body.data.helpUrl).toBe('https://studentos.kryvlance.in/help');
    expect(body.data.supportEmail).toBeNull();

    // Announcements
    expect(Array.isArray(body.data.announcements)).toBe(true);

    // Security check: Zero secrets in payload
    expect(body.data.JWT_SECRET).toBeUndefined();
    expect(body.data.DB).toBeUndefined();
    expect(body.data.BREVO_API_KEY).toBeUndefined();
    expect(body.data.RAZORPAY_KEY_SECRET).toBeUndefined();
  });

  it('2. Legacy GET /api/v1/app/version/android endpoint continues to return AndroidReleaseMetadata', async () => {
    const res = await appRouter.request('/version/android', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.platform).toBe('android');
    expect(body.data.latestVersionCode).toBe(6);
    expect(body.data.latestVersionName).toBe('1.0.5');
    expect(body.data.minimumSupportedVersionCode).toBe(1);
    expect(typeof body.data.updateRequired).toBe('boolean');
    expect(typeof body.data.releaseTitle).toBe('string');
    expect(Array.isArray(body.data.releaseNotes)).toBe(true);
    expect(body.data.releaseNotes.length).toBeGreaterThan(0);
    expect(body.data.apkUrl).toMatch(/^https:\/\/github\.com/);
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
