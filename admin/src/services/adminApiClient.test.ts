import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminApiClient, AdminApiError } from './adminApiClient.js';

describe('PHASE 4 — AdminApiClient Unit Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. includes Authorization Bearer header when token is available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { status: 'healthy' } }),
    });
    globalThis.fetch = mockFetch as any;

    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => 'my-test-jwt-token',
    });

    const res = await client.get<{ status: string }>('/api/v1/health');
    expect(res).toEqual({ success: true, data: { status: 'healthy' } });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/api/v1/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-test-jwt-token',
          'x-device-id': 'admin-web-console',
        }),
      })
    );
  });

  it('2. throws AdminApiError on 401 Unauthorized and calls onUnauthorized callback', async () => {
    const onUnauthorized = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Admin session expired' },
      }),
    });
    globalThis.fetch = mockFetch as any;

    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => 'expired-token',
      onUnauthorized,
    });

    await expect(client.get('/api/v1/admin/overview')).rejects.toThrow('Admin session expired');
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('3. throws AdminApiError on 403 Forbidden with proper code and status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin privileges required' },
      }),
    });
    globalThis.fetch = mockFetch as any;

    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => 'non-admin-token',
    });

    try {
      await client.get('/api/v1/admin/overview');
      expect.unreachable();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AdminApiError);
      const apiErr = err as AdminApiError;
      expect(apiErr.code).toBe('FORBIDDEN');
      expect(apiErr.status).toBe(403);
      expect(apiErr.message).toBe('Admin privileges required');
    }
  });

  it('4. serializes query parameters accurately in GET requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    });
    globalThis.fetch = mockFetch as any;

    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => 'token-123',
    });

    await client.get('/api/v1/admin/users', { page: 2, limit: 50, query: 'rahul' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/api/v1/admin/users?page=2&limit=50&query=rahul',
      expect.anything()
    );
  });

  it('5. handles network connection errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (Network unreachable)'));

    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => 'token',
    });

    await expect(client.get('/api/v1/admin/overview')).rejects.toThrow(
      'Failed to fetch (Network unreachable)'
    );
  });

  it('6. sendEmailOtp() sends POST to /auth/email/send-otp with correct body and NO Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'OTP sent if email is registered' }),
    });
    globalThis.fetch = mockFetch as any;

    // Client has NO token — simulates unauthenticated pre-login state
    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => null,
    });

    const result = await client.sendEmailOtp('admin@studentos.app');

    expect(result.success).toBe(true);
    expect(result.message).toBe('OTP sent if email is registered');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/auth/email/send-otp');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: 'admin@studentos.app' });

    // Authorization header must NOT be present for an unauthenticated OTP send
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('7. verifyEmailOtp() sends POST to /auth/email/verify-otp with deviceId/deviceModel/osVersion and NO Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        token: 'jwt-abc-123',
        sessionId: 'sess-xyz',
        account: { accountId: 'acc-001', email: 'admin@studentos.app' },
      }),
    });
    globalThis.fetch = mockFetch as any;

    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => null,
    });

    const result = await client.verifyEmailOtp('admin@studentos.app', '847261');

    expect(result.success).toBe(true);
    expect(result.token).toBe('jwt-abc-123');
    expect(result.sessionId).toBe('sess-xyz');
    expect(result.account.accountId).toBe('acc-001');
    expect(result.account.email).toBe('admin@studentos.app');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/auth/email/verify-otp');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      email: 'admin@studentos.app',
      otp: '847261',
      deviceId: 'admin-web-console',
      deviceModel: 'SOCC Web Console',
      osVersion: 'Web',
    });

    // Authorization header must NOT be present for an unauthenticated OTP verify
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('8. sendEmailOtp() and verifyEmailOtp() surface API errors through AdminApiError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many OTP requests. Please wait.' },
      }),
    });

    const client = new AdminApiClient({
      baseUrl: 'https://api.test',
      tokenGetter: () => null,
    });

    // sendEmailOtp rate-limited
    try {
      await client.sendEmailOtp('flood@example.com');
      expect.unreachable('should have thrown');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AdminApiError);
      const apiErr = err as AdminApiError;
      expect(apiErr.status).toBe(429);
      expect(apiErr.code).toBe('RATE_LIMITED');
      expect(apiErr.message).toBe('Too many OTP requests. Please wait.');
    }

    // verifyEmailOtp invalid OTP — reuse the same mock pattern
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: 'AUTH_INVALID_OTP', message: 'Invalid or expired OTP.' },
      }),
    });

    try {
      await client.verifyEmailOtp('flood@example.com', '000000');
      expect.unreachable('should have thrown');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AdminApiError);
      const apiErr = err as AdminApiError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.code).toBe('AUTH_INVALID_OTP');
      expect(apiErr.message).toBe('Invalid or expired OTP.');
    }
  });
});
