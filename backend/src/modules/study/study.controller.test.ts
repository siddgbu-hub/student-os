import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../index.js';
import { ALL_STUDENT_OS_FEATURES } from '@student-os/shared';
import { signJwt, hashString } from '../../services/crypto.service.js';

interface MockAccount {
  account_id: string;
  email: string;
  created_at: string;
  last_login_at: string;
}

interface MockEntitlement {
  entitlement_id: string;
  account_id: string;
  current_plan_id: string;
  status: string;
  is_paid: number;
  features: string;
  expires_at: string | null;
  last_verified_at: string;
  created_at: string;
  updated_at: string;
}

interface MockSession {
  session_id: string;
  account_id: string;
  device_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

interface MockDevice {
  device_id: string;
  account_id: string;
  device_model: string | null;
  os_version: string | null;
  is_active: number;
  registered_at: string;
  last_active_at: string;
  session_expires_at?: string | null;
  session_revoked_at?: string | null;
}

interface MockSubject {
  id: string;
  account_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface MockStudySession {
  id: string;
  account_id: string;
  subject_id: string;
  chapter_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  pause_duration_seconds: number;
  status: string;
  created_at: string;
  updated_at: string;
}

class MockD1Database {
  public accounts: Map<string, MockAccount> = new Map();
  public entitlements: Map<string, MockEntitlement> = new Map();
  public sessions: Map<string, MockSession> = new Map();
  public devices: Map<string, MockDevice> = new Map();
  public subjects: Map<string, MockSubject> = new Map();
  public studySessions: Map<string, MockStudySession> = new Map();

  prepare(query: string) {
    const db = this;

    const createStatement = (params: unknown[] = []) => ({
      query,
      params,
      bind(...newParams: unknown[]) {
        return createStatement(newParams);
      },
      async first<T>(): Promise<T | null> {
        if (query.includes('FROM sessions') && query.includes('session_id = ?')) {
          const sessId = params[0] as string;
          const s = db.sessions.get(sessId);
          if (s && s.revoked_at === null) {
            return s as T;
          }
          return null;
        }

        if (query.includes('FROM devices') && query.includes('device_id = ?')) {
          const deviceId = params[0] as string;
          const dev = db.devices.get(deviceId);
          return (dev || null) as T;
        }

        if (query.includes('FROM entitlements') && query.includes('account_id = ?')) {
          const accountId = params[0] as string;
          const ent = db.entitlements.get(accountId);
          return (ent || null) as T;
        }

        if (query.includes('FROM study_sessions') && query.includes("status IN ('running', 'paused')")) {
          const accountId = params[0] as string;
          for (const sess of db.studySessions.values()) {
            if (sess.account_id === accountId && (sess.status === 'running' || sess.status === 'paused')) {
              return sess as T;
            }
          }
          return null;
        }

        if (query.includes('FROM study_sessions') && query.includes('id = ?')) {
          const sessId = params[0] as string;
          const accountId = params[1] as string;
          const sess = db.studySessions.get(sessId);
          if (sess && sess.account_id === accountId) {
            return sess as T;
          }
          return null;
        }

        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        if (query.includes('FROM subjects') && query.includes('account_id = ?')) {
          const accountId = params[0] as string;
          const list: MockSubject[] = [];
          for (const s of db.subjects.values()) {
            if (s.account_id === accountId) {
              list.push(s);
            }
          }
          return { results: list as T[] };
        }

        return { results: [] };
      },
      async run(): Promise<{ success: boolean; meta?: unknown }> {
        if (query.includes('UPDATE devices') && query.includes('last_active_at = ?')) {
          const deviceId = params[1] as string;
          const dev = db.devices.get(deviceId);
          if (dev) {
            dev.last_active_at = params[0] as string;
          }
          return { success: true };
        }

        if (query.includes('INSERT INTO subjects')) {
          const [id, accountId, name, createdAt, updatedAt] = params as string[];
          db.subjects.set(id, {
            id,
            account_id: accountId,
            name,
            created_at: createdAt,
            updated_at: updatedAt,
          });
          return { success: true };
        }

        if (query.includes('UPDATE study_sessions') && query.includes('status = ?')) {
          const sessId = params[params.length - 2] as string;
          const sess = db.studySessions.get(sessId);
          if (sess) {
            sess.status = params[0] as string;
            sess.duration_seconds = params[1] as number;
            sess.pause_duration_seconds = params[2] as number;
            sess.end_time = params[3] as string | null;
            sess.updated_at = params[4] as string;
          }
          return { success: true };
        }

        return { success: true };
      },
    });

    return createStatement();
  }
}

describe('Study Controller — End-to-End Route Protection via requireActiveSubscription()', () => {
  let mockDb: MockD1Database;
  const jwtSecret = 'test-jwt-secret-key-for-unit-tests-12345';
  const deviceId = 'test-device-uuid-1';

  beforeEach(() => {
    mockDb = new MockD1Database();
  });

  async function createTestUserWithToken(
    accountId: string,
    email: string,
    entitlementConfig: {
      status: 'active' | 'expired' | 'revoked';
      currentPlanId: string;
      isPaid: boolean;
      expiresAt: string | null;
      features?: string[];
    }
  ) {
    const nowIso = new Date().toISOString();

    mockDb.accounts.set(accountId, {
      account_id: accountId,
      email,
      created_at: nowIso,
      last_login_at: nowIso,
    });

    mockDb.entitlements.set(accountId, {
      entitlement_id: `ent-${accountId}`,
      account_id: accountId,
      current_plan_id: entitlementConfig.currentPlanId,
      status: entitlementConfig.status,
      is_paid: entitlementConfig.isPaid ? 1 : 0,
      features: JSON.stringify(entitlementConfig.features || (entitlementConfig.status === 'active' ? ALL_STUDENT_OS_FEATURES : [])),
      expires_at: entitlementConfig.expiresAt,
      last_verified_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });

    mockDb.devices.set(deviceId, {
      device_id: deviceId,
      account_id: accountId,
      device_model: 'Test Device',
      os_version: 'Android 14',
      is_active: 1,
      registered_at: nowIso,
      last_active_at: nowIso,
    });

    const sessionId = `sess-${accountId}`;
    const token = await signJwt({ accountId, sessionId, deviceId }, jwtSecret);
    const tokenHash = await hashString(token);

    mockDb.sessions.set(sessionId, {
      session_id: sessionId,
      account_id: accountId,
      device_id: deviceId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: nowIso,
      revoked_at: null,
    });

    return { token, accountId, sessionId, deviceId };
  }

  it('1. GET /api/v1/study/sessions/active returns 403 TRIAL_EXPIRED when trial is expired despite valid JWT', async () => {
    const user = await createTestUserWithToken('acc-expired-trial', 'student@example.com', {
      status: 'expired',
      currentPlanId: 'free_trial',
      isPaid: false,
      expiresAt: '2026-08-15T18:05:06.367Z',
    });

    const res = await app.request(
      '/api/v1/study/sessions/active',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'x-device-id': user.deviceId,
        },
      },
      {
        DB: mockDb as unknown as D1Database,
        ENVIRONMENT: 'development',
        JWT_SECRET: jwtSecret,
      }
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('TRIAL_EXPIRED');
  });

  it('2. POST /api/v1/study/sessions/start returns 403 TRIAL_EXPIRED when trial is expired', async () => {
    const user = await createTestUserWithToken('acc-expired-trial-2', 'student2@example.com', {
      status: 'expired',
      currentPlanId: 'free_trial',
      isPaid: false,
      expiresAt: '2026-08-15T18:05:06.367Z',
    });

    const res = await app.request(
      '/api/v1/study/sessions/start',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'x-device-id': user.deviceId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId: 'sub-1',
        }),
      },
      {
        DB: mockDb as unknown as D1Database,
        ENVIRONMENT: 'development',
        JWT_SECRET: jwtSecret,
      }
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('TRIAL_EXPIRED');
  });

  it('3. POST /api/v1/study/sessions/:id/resume returns 403 TRIAL_EXPIRED when trial is expired', async () => {
    const user = await createTestUserWithToken('acc-expired-trial-3', 'student3@example.com', {
      status: 'expired',
      currentPlanId: 'free_trial',
      isPaid: false,
      expiresAt: '2026-08-15T18:05:06.367Z',
    });

    const res = await app.request(
      '/api/v1/study/sessions/2cffa077-82c4-4aac-8bec-4d91b9e4b0c8/resume',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'x-device-id': user.deviceId,
        },
      },
      {
        DB: mockDb as unknown as D1Database,
        ENVIRONMENT: 'development',
        JWT_SECRET: jwtSecret,
      }
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('TRIAL_EXPIRED');
  });

  it('4. GET /api/v1/study/subjects returns 403 TRIAL_EXPIRED when trial is expired', async () => {
    const user = await createTestUserWithToken('acc-expired-trial-4', 'student4@example.com', {
      status: 'expired',
      currentPlanId: 'free_trial',
      isPaid: false,
      expiresAt: '2026-08-15T18:05:06.367Z',
    });

    const res = await app.request(
      '/api/v1/study/subjects',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'x-device-id': user.deviceId,
        },
      },
      {
        DB: mockDb as unknown as D1Database,
        ENVIRONMENT: 'development',
        JWT_SECRET: jwtSecret,
      }
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('TRIAL_EXPIRED');
  });

  it('5. GET /api/v1/study/subjects returns 403 SUBSCRIPTION_REQUIRED when paid plan is expired', async () => {
    const user = await createTestUserWithToken('acc-expired-paid', 'student-paid@example.com', {
      status: 'expired',
      currentPlanId: 'monthly',
      isPaid: true,
      expiresAt: '2026-08-15T18:05:06.367Z',
    });

    const res = await app.request(
      '/api/v1/study/subjects',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'x-device-id': user.deviceId,
        },
      },
      {
        DB: mockDb as unknown as D1Database,
        ENVIRONMENT: 'development',
        JWT_SECRET: jwtSecret,
      }
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('6. GET /api/v1/study/subjects succeeds with 200 for active trial user', async () => {
    const user = await createTestUserWithToken('acc-active-trial', 'active-trial@example.com', {
      status: 'active',
      currentPlanId: 'free_trial',
      isPaid: false,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    const res = await app.request(
      '/api/v1/study/subjects',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'x-device-id': user.deviceId,
        },
      },
      {
        DB: mockDb as unknown as D1Database,
        ENVIRONMENT: 'development',
        JWT_SECRET: jwtSecret,
      }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.subjects)).toBe(true);
  });

  it('7. GET /api/v1/study/subjects succeeds with 200 for active paid user', async () => {
    const user = await createTestUserWithToken('acc-active-paid', 'active-paid@example.com', {
      status: 'active',
      currentPlanId: 'monthly',
      isPaid: true,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    const res = await app.request(
      '/api/v1/study/subjects',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'x-device-id': user.deviceId,
        },
      },
      {
        DB: mockDb as unknown as D1Database,
        ENVIRONMENT: 'development',
        JWT_SECRET: jwtSecret,
      }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.subjects)).toBe(true);
  });
});
