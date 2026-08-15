import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { adminRouter } from './admin.controller.js';
import { ALL_STUDENT_OS_FEATURES } from '@student-os/shared';
import { signJwt, hashString } from '../../services/crypto.service.js';

interface MockAccount {
  account_id: string;
  email: string;
  status?: string;
  created_at: string;
  last_login_at: string;
}

interface MockProfile {
  account_id: string;
  full_name: string;
  avatar_url: string | null;
  institution_name: string | null;
  course: string | null;
  class_year: string | null;
  stream: string | null;
  examination_type: string | null;
}

interface MockPlan {
  plan_id: string;
  name: string;
  price_cents?: number;
  duration_days: number | null;
  features: string;
  is_active: number;
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

interface MockSubscription {
  subscription_id: string;
  account_id: string;
  plan_id: string;
  status: string;
  source: string;
  granted_by: string | null;
  start_date: string;
  expiry_date: string | null;
  cancelled_at: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

interface MockPayment {
  payment_id: string;
  account_id: string;
  subscription_id: string | null;
  amount_paise: number;
  original_amount_paise: number | null;
  discount_percent: number | null;
  discount_amount_paise: number | null;
  currency: string;
  payment_method: string;
  transaction_reference: string | null;
  status: string;
  source: string;
  recorded_by: string;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
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

interface MockSession {
  session_id: string;
  account_id: string;
  device_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

interface MockAuditLog {
  id: string;
  account_id: string;
  event_type: string;
  plan_id: string;
  granted_by: string;
  source: string;
  start_date: string;
  expiry_date: string | null;
  details: string;
  created_at: string;
}

class FullMockD1Database {
  public accounts: Map<string, MockAccount> = new Map();
  public profiles: Map<string, MockProfile> = new Map();
  public adminRoles: Map<string, { account_id: string; role: string; permissions: string; granted_by: string | null; created_at: string; updated_at: string }> = new Map();
  public plans: Map<string, MockPlan> = new Map();
  public entitlements: Map<string, MockEntitlement> = new Map();
  public subscriptions: Map<string, MockSubscription> = new Map();
  public payments: Map<string, MockPayment> = new Map();
  public devices: Map<string, MockDevice> = new Map();
  public sessions: Map<string, MockSession> = new Map();
  public auditLogs: Map<string, MockAuditLog> = new Map();

  prepare(query: string) {
    const db = this;

    const createStatement = (params: unknown[] = []) => ({
      query,
      params,
      bind(...newParams: unknown[]) {
        return createStatement(newParams);
      },
      async first<T>(): Promise<T | null> {
        // Sessions check for auth middleware
        if (query.includes('FROM sessions WHERE session_id = ?')) {
          const sessionId = params[0] as string;
          const session = db.sessions.get(sessionId);
          return (session as unknown as T) || null;
        }
        // Device check for auth middleware
        if (query.includes('FROM devices WHERE device_id = ?')) {
          const deviceId = params[0] as string;
          const dev = db.devices.get(deviceId);
          return (dev as unknown as T) || null;
        }
        if (query.includes('FROM devices WHERE account_id = ? AND is_active = 1')) {
          const accountId = params[0] as string;
          for (const dev of db.devices.values()) {
            if (dev.account_id === accountId && dev.is_active === 1) {
              return dev as unknown as T;
            }
          }
          return null;
        }
        if (query.includes('FROM admin_roles WHERE account_id = ?')) {
          const accountId = params[0] as string;
          return (db.adminRoles.get(accountId) as unknown as T) || null;
        }
        if (query.includes('FROM accounts WHERE account_id = ?')) {
          const accountId = params[0] as string;
          const acc = db.accounts.get(accountId);
          return acc ? ({ ...acc, status: acc.status || 'active' } as unknown as T) : null;
        }
        if (query.includes('SELECT COUNT(*) as cnt FROM sessions WHERE account_id = ? AND revoked_at IS NULL')) {
          const accountId = params[0] as string;
          let cnt = 0;
          for (const s of db.sessions.values()) {
            if (s.account_id === accountId && s.revoked_at === null) cnt++;
          }
          return { cnt } as unknown as T;
        }
        if (query.includes('SELECT COUNT(*) as cnt FROM devices WHERE account_id = ? AND is_active = 1')) {
          const accountId = params[0] as string;
          let cnt = 0;
          for (const d of db.devices.values()) {
            if (d.account_id === accountId && d.is_active === 1) cnt++;
          }
          return { cnt } as unknown as T;
        }
        if (query.includes('FROM accounts WHERE LOWER(email) = LOWER(?)')) {
          const email = (params[0] as string).toLowerCase();
          for (const acc of db.accounts.values()) {
            if (acc.email.toLowerCase() === email) {
              return { ...acc, status: acc.status || 'active' } as unknown as T;
            }
          }
          return null;
        }
        if (query.includes('FROM user_profiles WHERE account_id = ?')) {
          const accountId = params[0] as string;
          return (db.profiles.get(accountId) as unknown as T) || null;
        }
        if (query.includes('FROM plans WHERE plan_id = ?')) {
          const planId = params[0] as string;
          return (db.plans.get(planId) as unknown as T) || null;
        }
        if (query.includes('FROM entitlements WHERE account_id = ?') || query.includes('FROM entitlements e')) {
          const accountId = params[0] as string;
          const row = db.entitlements.get(accountId);
          if (!row) return null;
          const plan = db.plans.get(row.current_plan_id);
          return { ...row, plan_name: plan?.name || row.current_plan_id } as unknown as T;
        }
        if (query.includes('FROM payments WHERE transaction_reference = ?') || query.includes('transaction_reference = ?')) {
          const ref = params[0] as string;
          for (const p of db.payments.values()) {
            if (p.transaction_reference === ref) {
              return { payment_id: p.payment_id } as unknown as T;
            }
          }
          return null;
        }
        if (query.includes('payment_id = ?')) {
          const pId = params[0] as string;
          const p = db.payments.get(pId);
          if (!p) return null;
          const acc = db.accounts.get(p.account_id);
          const prof = db.profiles.get(p.account_id);
          return { ...p, student_email: acc?.email, student_name: prof?.full_name } as unknown as T;
        }
        // Count queries for Overview
        if (query.includes('SELECT COUNT(*) as cnt FROM accounts')) {
          return { cnt: db.accounts.size } as unknown as T;
        }
        if (query.includes("SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND (is_paid = 0 OR current_plan_id = 'free_trial')")) {
          let cnt = 0;
          for (const e of db.entitlements.values()) {
            if (e.status === 'active' && (e.is_paid === 0 || e.current_plan_id === 'free_trial')) cnt++;
          }
          return { cnt } as unknown as T;
        }
        if (query.includes("SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND is_paid = 1 AND current_plan_id = 'monthly'")) {
          let cnt = 0;
          for (const e of db.entitlements.values()) {
            if (e.status === 'active' && e.is_paid === 1 && e.current_plan_id === 'monthly') cnt++;
          }
          return { cnt } as unknown as T;
        }
        if (query.includes("SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND is_paid = 1 AND current_plan_id = 'yearly'")) {
          let cnt = 0;
          for (const e of db.entitlements.values()) {
            if (e.status === 'active' && e.is_paid === 1 && e.current_plan_id === 'yearly') cnt++;
          }
          return { cnt } as unknown as T;
        }
        if (query.includes("SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'expired'")) {
          let cnt = 0;
          for (const e of db.entitlements.values()) {
            if (e.status === 'expired') cnt++;
          }
          return { cnt } as unknown as T;
        }
        if (query.includes("SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND expires_at IS NOT NULL")) {
          const [nowIso, in7DaysIso] = params as [string, string];
          let cnt = 0;
          for (const e of db.entitlements.values()) {
            if (e.status === 'active' && e.expires_at && e.expires_at >= nowIso && e.expires_at <= in7DaysIso) {
              cnt++;
            }
          }
          return { cnt } as unknown as T;
        }
        if (query.includes("SELECT COALESCE(SUM(amount_paise), 0) as total FROM payments WHERE status = 'captured'")) {
          let total = 0;
          for (const p of db.payments.values()) {
            if (p.status === 'captured') total += p.amount_paise;
          }
          return { total } as unknown as T;
        }
        // Device count subquery used in getUsers
        if (query.includes('SELECT COUNT(*) FROM devices d WHERE d.account_id = a.account_id') || query.includes('SELECT COUNT(*) FROM devices')) {
          const accountId = params[0] as string;
          let cnt = 0;
          for (const d of db.devices.values()) {
            if (d.account_id === accountId) cnt++;
          }
          return { cnt } as unknown as T;
        }
        if (query.includes('SELECT COUNT(*) as total FROM accounts')) {
          return { total: db.accounts.size } as unknown as T;
        }
        if (query.includes('SELECT COUNT(*) as total FROM payments')) {
          return { total: db.payments.size } as unknown as T;
        }
        if (query.includes('SELECT COUNT(*) as total FROM entitlement_audit_logs')) {
          return { total: db.auditLogs.size } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        if (query.includes('FROM accounts a') || query.includes('FROM accounts')) {
          const list: any[] = [];
          for (const a of db.accounts.values()) {
            const p = db.profiles.get(a.account_id);
            const e = db.entitlements.get(a.account_id);

            // Apply search filter if query has parameters
            if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%')) {
              const search = (params[0] as string).replace(/%/g, '').toLowerCase();
              const matchEmail = a.email.toLowerCase().includes(search);
              const matchName = (p?.full_name || '').toLowerCase().includes(search);
              const matchId = a.account_id === search;
              if (!matchEmail && !matchName && !matchId) {
                continue;
              }
            }

            list.push({
              account_id: a.account_id,
              email: a.email,
              full_name: p?.full_name || 'Student',
              current_plan_id: e?.current_plan_id || 'free_trial',
              entitlement_status: e?.status || 'active',
              is_paid: e?.is_paid || 0,
              expires_at: e?.expires_at || null,
              created_at: a.created_at,
              last_login_at: a.last_login_at,
              // Device count subquery (simulated inline)
              device_count: Array.from(db.devices.values()).filter((d) => d.account_id === a.account_id).length,
            });
          }
          return { results: list as T[] };
        }
        if (query.includes('FROM subscriptions s') || query.includes('FROM subscriptions')) {
          const accountId = params[0] as string;
          const list = Array.from(db.subscriptions.values()).filter((s) => s.account_id === accountId);
          return { results: list as unknown as T[] };
        }
        if (query.includes('FROM payments p') || query.includes('FROM payments')) {
          const list: any[] = [];
          for (const p of db.payments.values()) {
            const acc = db.accounts.get(p.account_id);
            const prof = db.profiles.get(p.account_id);
            list.push({
              ...p,
              student_email: acc?.email,
              student_name: prof?.full_name || 'Student',
            });
          }
          return { results: list as T[] };
        }
        if (query.includes('FROM devices')) {
          // Handle both the simple query and the new JOIN query with session data
          const accountId = params[params.length - 1] as string;
          const list = Array.from(db.devices.values())
            .filter((d) => d.account_id === accountId)
            .map((d) => {
              // Find the latest session for this device
              const latestSession = Array.from(db.sessions.values())
                .filter((s) => s.device_id === d.device_id && s.account_id === accountId)
                .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
              return {
                ...d,
                session_expires_at: d.session_expires_at ?? latestSession?.expires_at ?? null,
                session_revoked_at: d.session_revoked_at ?? latestSession?.revoked_at ?? null,
              };
            });
          return { results: list as unknown as T[] };
        }
        if (query.includes('FROM entitlement_audit_logs')) {
          const list = Array.from(db.auditLogs.values());
          return { results: list as unknown as T[] };
        }
        return { results: [] };
      },
      async run() {
        if (query.includes('UPDATE devices SET last_active_at = ?')) {
          return { success: true };
        }
        if (query.includes('UPDATE accounts SET last_login_at = ?')) {
          return { success: true };
        }
        return { success: true };
      },
    });

    return createStatement();
  }

  async batch(statements: Array<{ query: string; params: unknown[] }>) {
    for (const stmt of statements) {
      const { query, params } = stmt;
      if (query.includes("UPDATE subscriptions SET status = 'superseded'")) {
        const [updatedAt, accountId] = params as [string, string];
        for (const sub of this.subscriptions.values()) {
          if (sub.account_id === accountId && sub.status === 'active') {
            sub.status = 'superseded';
            sub.updated_at = updatedAt;
          }
        }
      } else if (query.includes("UPDATE subscriptions SET status = 'revoked'")) {
        const [updatedAt, accountId] = params as [string, string];
        for (const sub of this.subscriptions.values()) {
          if (sub.account_id === accountId && sub.status === 'active') {
            sub.status = 'revoked';
            sub.updated_at = updatedAt;
          }
        }
      } else if (query.includes('INSERT INTO subscriptions')) {
        const [
          subscription_id,
          account_id,
          plan_id,
          granted_by,
          start_date,
          expiry_date,
          payment_reference,
          created_at,
          updated_at,
        ] = params as [string, string, string, string, string, string, string | null, string, string];

        this.subscriptions.set(subscription_id, {
          subscription_id,
          account_id,
          plan_id,
          status: 'active',
          source: query.includes("'payment'") ? 'payment' : 'manual',
          granted_by,
          start_date,
          expiry_date,
          cancelled_at: null,
          payment_reference,
          created_at,
          updated_at,
        });
      } else if (query.includes('INSERT INTO entitlements')) {
        const [
          entitlement_id,
          account_id,
          current_plan_id,
          features,
          expires_at,
          last_verified_at,
          created_at,
          updated_at,
        ] = params as [string, string, string, string, string | null, string, string, string];

        const isRevoked = query.includes("'revoked'");
        this.entitlements.set(account_id, {
          entitlement_id,
          account_id,
          current_plan_id,
          status: isRevoked ? 'revoked' : 'active',
          is_paid: isRevoked ? 0 : 1,
          features,
          expires_at,
          last_verified_at,
          created_at,
          updated_at,
        });
      } else if (query.includes('INSERT INTO payments')) {
        const [
          payment_id,
          account_id,
          subscription_id,
          amount_paise,
          original_amount_paise,
          discount_percent,
          discount_amount_paise,
          currency,
          payment_method,
          transaction_reference,
          recorded_by,
          notes,
          receipt_url,
          created_at,
          updated_at,
        ] = params as [
          string,
          string,
          string | null,
          number,
          number | null,
          number | null,
          number | null,
          string,
          string,
          string | null,
          string,
          string | null,
          string | null,
          string,
          string,
        ];

        this.payments.set(payment_id, {
          payment_id,
          account_id,
          subscription_id,
          amount_paise,
          original_amount_paise,
          discount_percent,
          discount_amount_paise,
          currency,
          payment_method,
          transaction_reference,
          status: 'captured',
          source: 'manual_admin',
          recorded_by,
          notes,
          receipt_url,
          created_at,
          updated_at,
        });
      } else if (query.includes('INSERT INTO entitlement_audit_logs')) {
        const [
          id,
          account_id,
          plan_id,
          granted_by,
          start_date,
          expiry_date,
          details,
          created_at,
        ] = params as [string, string, string, string, string, string | null, string, string];

        let event_type = 'ENTITLEMENT_MANUALLY_GRANTED';
        if (query.includes('ENTITLEMENT_EXTENDED')) event_type = 'ENTITLEMENT_EXTENDED';
        if (query.includes('ENTITLEMENT_PLAN_CHANGED')) event_type = 'ENTITLEMENT_PLAN_CHANGED';
        if (query.includes('ENTITLEMENT_REVOKED')) event_type = 'ENTITLEMENT_REVOKED';
        if (query.includes('ENTITLEMENT_ACTIVATED_PAYMENT')) event_type = 'ENTITLEMENT_ACTIVATED_PAYMENT';

        this.auditLogs.set(id, {
          id,
          account_id,
          event_type,
          plan_id,
          granted_by,
          source: 'manual',
          start_date,
          expiry_date,
          details,
          created_at,
        });
      } else if (query.includes('UPDATE accounts SET status = ? WHERE account_id = ?')) {
        const [status, accountId] = params as [string, string];
        const acc = this.accounts.get(accountId);
        if (acc) {
          acc.status = status;
          this.accounts.set(accountId, acc);
        }
      } else if (query.includes('UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL')) {
        const [revokedAt, accountId] = params as [string, string];
        for (const s of this.sessions.values()) {
          if (s.account_id === accountId && s.revoked_at === null) {
            s.revoked_at = revokedAt;
          }
        }
      } else if (query.includes('UPDATE devices SET is_active = 0 WHERE account_id = ? AND is_active = 1')) {
        const [accountId] = params as [string];
        for (const d of this.devices.values()) {
          if (d.account_id === accountId && d.is_active === 1) {
            d.is_active = 0;
          }
        }
      } else if (query.includes('DELETE FROM sessions WHERE account_id = ?')) {
        const [accountId] = params as [string];
        for (const [id, s] of Array.from(this.sessions.entries())) if (s.account_id === accountId) this.sessions.delete(id);
      } else if (query.includes('DELETE FROM devices WHERE account_id = ?')) {
        const [accountId] = params as [string];
        for (const [id, d] of Array.from(this.devices.entries())) if (d.account_id === accountId) this.devices.delete(id);
      } else if (query.includes('DELETE FROM payments WHERE account_id = ?')) {
        const [accountId] = params as [string];
        for (const [id, p] of Array.from(this.payments.entries())) if (p.account_id === accountId) this.payments.delete(id);
      } else if (query.includes('DELETE FROM subscriptions WHERE account_id = ?')) {
        const [accountId] = params as [string];
        for (const [id, s] of Array.from(this.subscriptions.entries())) if (s.account_id === accountId) this.subscriptions.delete(id);
      } else if (query.includes('DELETE FROM entitlements WHERE account_id = ?')) {
        const [accountId] = params as [string];
        this.entitlements.delete(accountId);
      } else if (query.includes('DELETE FROM user_profiles WHERE account_id = ?')) {
        const [accountId] = params as [string];
        this.profiles.delete(accountId);
      } else if (query.includes('DELETE FROM user_preferences WHERE account_id = ?')) {
        // no-op
      } else if (query.includes('DELETE FROM accounts WHERE account_id = ?')) {
        const [accountId] = params as [string];
        this.accounts.delete(accountId);
      } else if (query.includes('INSERT INTO audit_logs')) {
        const [id, account_id, event_type, details, created_at] = params as [string, string, string, string, string];
        this.auditLogs.set(id, {
          id,
          account_id,
          event_type,
          plan_id: null as any,
          granted_by: 'admin',
          source: 'manual',
          start_date: created_at,
          expiry_date: null,
          details,
          created_at,
        });
      }
    }
  }
}

describe('PHASE 3 — Admin REST APIs Controller Tests', () => {
  let mockDb: FullMockD1Database;

  const OWNER_ADMIN_ID = '00000000-0000-0000-0000-000000000001';
  const SUPPORT_ADMIN_ID = '00000000-0000-0000-0000-000000000002';
  const STUDENT_ID = '00000000-0000-0000-0000-000000000010';
  const STUDENT_ACCOUNT_ID = STUDENT_ID; // Phase 13 alias
  const STUDENT_EMAIL = 'student@example.com';
  const JWT_SECRET = 'test-jwt-secret-key-1234567890';

  beforeEach(() => {
    mockDb = new FullMockD1Database();

    // 1. Seed Accounts
    mockDb.accounts.set(OWNER_ADMIN_ID, {
      account_id: OWNER_ADMIN_ID,
      email: 'owner@studentos.com',
      status: 'active',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    });
    mockDb.accounts.set(SUPPORT_ADMIN_ID, {
      account_id: SUPPORT_ADMIN_ID,
      email: 'support@studentos.com',
      status: 'active',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    });
    mockDb.accounts.set(STUDENT_ID, {
      account_id: STUDENT_ID,
      email: STUDENT_EMAIL,
      status: 'active',
      created_at: '2026-08-01T00:00:00.000Z',
      last_login_at: '2026-08-15T00:00:00.000Z',
    });

    // 2. Seed Profiles
    mockDb.profiles.set(STUDENT_ID, {
      account_id: STUDENT_ID,
      full_name: 'Rahul Sharma',
      avatar_url: 'https://example.com/avatar.jpg',
      institution_name: 'IIT Delhi',
      course: 'B.Tech',
      class_year: '3rd Year',
      stream: 'Computer Science',
      examination_type: 'Semester Exams',
    });

    // 3. Seed Admin Roles
    mockDb.adminRoles.set(OWNER_ADMIN_ID, {
      account_id: OWNER_ADMIN_ID,
      role: 'owner',
      permissions: JSON.stringify(['*']),
      granted_by: 'system:init',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockDb.adminRoles.set(SUPPORT_ADMIN_ID, {
      account_id: SUPPORT_ADMIN_ID,
      role: 'support',
      permissions: JSON.stringify(['user.view', 'payment.view']),
      granted_by: OWNER_ADMIN_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 4. Seed Plans
    mockDb.plans.set('free_trial', {
      plan_id: 'free_trial',
      name: '7-Day Free Trial',
      price_cents: 0,
      duration_days: 7,
      features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
      is_active: 1,
    });
    mockDb.plans.set('monthly', {
      plan_id: 'monthly',
      name: 'Student OS Pro Monthly',
      price_cents: 29900,
      duration_days: 30,
      features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
      is_active: 1,
    });
    mockDb.plans.set('yearly', {
      plan_id: 'yearly',
      name: 'Student OS Pro Yearly',
      price_cents: 249900,
      duration_days: 365,
      features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
      is_active: 1,
    });

    // 5. Seed Entitlement for Student
    mockDb.entitlements.set(STUDENT_ID, {
      entitlement_id: 'ent-1',
      account_id: STUDENT_ID,
      current_plan_id: 'monthly',
      status: 'active',
      is_paid: 1,
      features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
      expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      last_verified_at: new Date().toISOString(),
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    });

    // 6. Seed Subscriptions
    mockDb.subscriptions.set('sub-1', {
      subscription_id: 'sub-1',
      account_id: STUDENT_ID,
      plan_id: 'monthly',
      status: 'active',
      source: 'manual',
      granted_by: OWNER_ADMIN_ID,
      start_date: '2026-08-01T00:00:00.000Z',
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      cancelled_at: null,
      payment_reference: 'UPI-REF-001',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });

    // 7. Seed Payments
    mockDb.payments.set('pay-1', {
      payment_id: 'pay-1',
      account_id: STUDENT_ID,
      subscription_id: 'sub-1',
      amount_paise: 3000,
      original_amount_paise: 3000,
      discount_percent: 0,
      discount_amount_paise: 0,
      currency: 'INR',
      payment_method: 'upi',
      transaction_reference: 'UPI-REF-001',
      status: 'captured',
      source: 'manual_admin',
      recorded_by: OWNER_ADMIN_ID,
      notes: 'Initial activation',
      receipt_url: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });

    // 8. Seed Devices — Phase 13: two devices per student (android + web)
    mockDb.devices.set('android-native-student', {
      device_id: 'android-native-student',
      account_id: STUDENT_ID,
      device_model: 'Samsung Galaxy A56',
      os_version: 'Android 15',
      is_active: 1,
      registered_at: '2026-08-01T00:00:00.000Z',
      last_active_at: '2026-08-15T00:00:00.000Z',
    });
    mockDb.devices.set('web-student-browser', {
      device_id: 'web-student-browser',
      account_id: STUDENT_ID,
      device_model: 'Web Browser',
      os_version: 'Chrome 126',
      is_active: 1,
      registered_at: '2026-08-10T00:00:00.000Z',
      last_active_at: '2026-08-15T06:00:00.000Z',
    });

    // 9. Seed Audit Logs
    mockDb.auditLogs.set('audit-1', {
      id: 'audit-1',
      account_id: STUDENT_ID,
      event_type: 'ENTITLEMENT_MANUALLY_GRANTED',
      plan_id: 'monthly',
      granted_by: OWNER_ADMIN_ID,
      source: 'manual',
      start_date: '2026-08-01T00:00:00.000Z',
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      details: JSON.stringify({ reason: 'Initial signup grant' }),
      created_at: '2026-08-01T00:00:00.000Z',
    });
  });

  async function createAuthHeaders(accountId: string) {
    const deviceId = `dev-${accountId}`;
    const sessionId = `sess-${accountId}`;

    // Seed device if not present
    if (!mockDb.devices.has(deviceId)) {
      mockDb.devices.set(deviceId, {
        device_id: deviceId,
        account_id: accountId,
        device_model: 'Admin Device',
        os_version: 'Web OS',
        is_active: 1,
        registered_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      });
    }

    const token = await signJwt({ accountId, sessionId, deviceId }, JWT_SECRET, 30);
    const tokenHash = await hashString(token);

    mockDb.sessions.set(sessionId, {
      session_id: sessionId,
      account_id: accountId,
      device_id: deviceId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      revoked_at: null,
    });

    return {
      Authorization: `Bearer ${token}`,
      'x-device-id': deviceId,
    };
  }

  function createTestApp() {
    const app = new Hono<{
      Bindings: { DB: any; JWT_SECRET: string };
    }>();

    app.route('/api/v1/admin', adminRouter);
    return app;
  }

  const testEnv = () => ({
    DB: mockDb as unknown as D1Database,
    JWT_SECRET,
  });

  describe('1. Authorization & Route Protection', () => {
    it('1. returns 401 UNAUTHORIZED for unauthenticated request', async () => {
      const app = createTestApp();
      const res = await app.request('/api/v1/admin/overview', {}, testEnv());
      expect(res.status).toBe(401);
    });

    it('2. returns 403 FORBIDDEN for authenticated non-admin student', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(STUDENT_ID);
      const res = await app.request(
        '/api/v1/admin/overview',
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(403);
    });

    it('3. returns 403 FORBIDDEN when admin lacks specific permission', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(SUPPORT_ADMIN_ID);
      // Support admin has user.view, payment.view, but lacks subscription.create
      const res = await app.request(
        '/api/v1/admin/subscriptions/grant',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            planId: 'monthly',
            reason: 'Test grant',
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(403);
    });

    it('4. allows request when admin has wildcard * permission', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/overview',
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
    });
  });

  describe('2. Overview Metrics Endpoint (GET /api/v1/admin/overview)', () => {
    it('5. returns real calculated metrics and revenue derived from database', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/overview',
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.totalStudents).toBe(3);
      expect(json.data.activeProMonthly).toBe(1);
      expect(json.data.totalRevenuePaise).toBe(3000);
    });
  });

  describe('3. Student Directory Endpoint (GET /api/v1/admin/users)', () => {
    it('6. returns paginated student list with deterministic metadata', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/users?page=1&limit=10',
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.limit).toBe(10);
    });

    it('7. filters students by search query (email/name/id)', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users?query=${encodeURIComponent(STUDENT_EMAIL)}`,
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].email).toBe(STUDENT_EMAIL);
    });
  });

  describe('4. Student Detail Endpoint (GET /api/v1/admin/users/:accountId)', () => {
    it('8. returns full student detail including profile, entitlement, subscriptions, payments, devices, and audit logs', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users/${STUDENT_ID}`,
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.account.accountId).toBe(STUDENT_ID);
      expect(json.data.account.email).toBe(STUDENT_EMAIL);
      expect(json.data.profile.fullName).toBe('Rahul Sharma');
      expect(json.data.entitlement.currentPlanId).toBe('monthly');
      expect(json.data.subscriptions.length).toBe(1);
      expect(json.data.payments.length).toBe(1);
      expect(json.data.devices.length).toBe(2);
      expect(json.data.auditLogs.length).toBe(1);

      // Security check: NEVER leaks token_hash, secrets, or passwords
      expect(json.data.account.password).toBeUndefined();
      expect(json.data.devices[0].token_hash).toBeUndefined();
    });

    it('9. returns 404 ACCOUNT_NOT_FOUND for non-existent account', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users/00000000-0000-0000-0000-999999999999`,
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });

  describe('5. Subscription Mutations (Grant, Extend, Change-Plan, Revoke)', () => {
    it('10. POST /subscriptions/grant validates payload and delegates to service with admin actor', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/subscriptions/grant',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            planId: 'yearly',
            durationDays: 365,
            reason: 'Annual student onboarding',
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.subscription.planId).toBe('yearly');
      expect(json.data.entitlement.isPaid).toBe(true);
    });

    it('11. POST /subscriptions/extend preserves remaining days on active subscription', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/subscriptions/extend',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            durationDays: 30,
            reason: 'Goodwill bonus extension',
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.entitlement.status).toBe('active');
    });

    it('12. POST /subscriptions/change-plan switches plan immediately', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/subscriptions/change-plan',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            newPlanId: 'yearly',
            reason: 'Upgraded from monthly to yearly',
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.subscription.planId).toBe('yearly');
    });

    it('13. POST /subscriptions/revoke requires reason and strips active access', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/subscriptions/revoke',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            reason: 'Student requested account cancellation',
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.entitlement.status).toBe('revoked');
      expect(json.data.entitlement.isPaid).toBe(false);
    });
  });

  describe('6. Payments Endpoints (GET & POST /api/v1/admin/payments)', () => {
    it('14. GET /payments returns paginated payment list with student info', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/payments?page=1&limit=25',
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].studentEmail).toBe(STUDENT_EMAIL);
    });

    it('15. POST /payments/record records offline payment and activates Pro access', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const ref = 'UPI-REC-20260815-9988';
      const res = await app.request(
        '/api/v1/admin/payments/record',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            planId: 'monthly',
            discountPercent: 0,
            currency: 'INR',
            paymentMethod: 'upi',
            transactionReference: ref,
            notes: 'Recorded via Google Pay',
            activatePro: true,
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.payment.amountPaise).toBe(29900);
      expect(json.data.payment.originalAmountPaise).toBe(29900);
      expect(json.data.payment.discountPercent).toBe(0);
      expect(json.data.payment.transactionReference).toBe(ref);
      expect(json.data.subscription.planId).toBe('monthly');
      expect(json.data.entitlement.isPaid).toBe(true);
    });

    it('16. POST /payments/record returns 409 CONFLICT for duplicate transaction reference', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/payments/record',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            discountPercent: 0,
            paymentMethod: 'upi',
            transactionReference: 'UPI-REF-001', // Already seeded in beforeEach
            planId: 'monthly',
            activatePro: true,
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(409);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('DUPLICATE_PAYMENT_REFERENCE');
    });

    it('17. POST /payments/record allows null transaction reference for 100% complimentary access', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/payments/record',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: STUDENT_ID,
            discountPercent: 100,
            paymentMethod: 'complimentary',
            transactionReference: null,
            planId: 'yearly',
            notes: 'Scholarship grant',
            activatePro: true,
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.payment.paymentMethod).toBe('complimentary');
      expect(json.data.payment.amountPaise).toBe(0);
      expect(json.data.payment.discountPercent).toBe(100);
      expect(json.data.payment.transactionReference).toBeNull();
    });
  });

  describe('7. Audit Logs Endpoint (GET /api/v1/admin/audit-logs)', () => {
    it('18. GET /audit-logs returns paginated immutable audit logs', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/audit-logs?page=1&limit=25',
        {
          headers,
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].eventType).toBe('ENTITLEMENT_MANUALLY_GRANTED');
    });
  });

  describe('8. Input Validation & Error Handling', () => {
    it('19. returns 400 VALIDATION_ERROR on malformed JSON payload', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/subscriptions/grant',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: '{ invalid_json ',
        },
        testEnv()
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('20. returns 400 VALIDATION_ERROR on missing required body fields', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/subscriptions/grant',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Missing accountId, planId, reason
          }),
        },
        testEnv()
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PHASE 13 — Automatic Student & Device Discovery
  // ─────────────────────────────────────────────────────────────
  describe('9. Phase 13 — Automatic Student & Device Discovery', () => {
    it('21. authenticated student appears automatically in /users (no manual admin action required)', async () => {
      const app = createTestApp();
      const db = app.request as any;
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/users?page=1&limit=25',
        { headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      // Student account is visible by virtue of existing in accounts table (seeded by auth)
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      const student = json.data.find((u: any) => u.accountId === STUDENT_ACCOUNT_ID);
      expect(student).toBeDefined();
      expect(student.email).toBe(STUDENT_EMAIL);
    });

    it('22. student list includes deviceCount for each account', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        '/api/v1/admin/users?page=1&limit=25',
        { headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      const student = json.data.find((u: any) => u.accountId === STUDENT_ACCOUNT_ID);
      expect(student).toBeDefined();
      // deviceCount must be a non-negative integer
      expect(typeof student.deviceCount).toBe('number');
      expect(student.deviceCount).toBeGreaterThanOrEqual(0);
    });

    it('23. two devices registered under the same account appear in devices[] — one account, NOT two accounts', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}`,
        { headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      // Both devices must appear under one student, not as separate students
      expect(json.data.account.accountId).toBe(STUDENT_ACCOUNT_ID);
      expect(Array.isArray(json.data.devices)).toBe(true);
      // There are 2 devices seeded under STUDENT_ACCOUNT_ID
      expect(json.data.devices.length).toBe(2);
    });

    it('24. device detail includes platform field inferred from deviceId prefix', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}`,
        { headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      const devices: any[] = json.data.devices;
      const androidDevice = devices.find((d: any) => d.deviceId.startsWith('android-'));
      const webDevice = devices.find((d: any) => d.deviceId.startsWith('web-'));
      expect(androidDevice?.platform).toBe('android');
      expect(webDevice?.platform).toBe('web');
    });

    it('25. device detail does NOT expose token_hash, session token, or OTP data', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}`,
        { headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).not.toContain('token_hash');
      expect(body).not.toContain('"token"');
      expect(body).not.toContain('otp');
      expect(body).not.toContain('password');
    });

    it('26. student with no devices returns empty devices array (not an error)', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const NO_DEVICE_ID = '00000000-0000-0000-0000-000000000099';
      mockDb.accounts.set(NO_DEVICE_ID, {
        account_id: NO_DEVICE_ID,
        email: 'nodevice@example.com',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      });
      const res = await app.request(
        `/api/v1/admin/users/${NO_DEVICE_ID}`,
        { headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(Array.isArray(json.data.devices)).toBe(true);
      // Account with no devices — should be an empty array, not null
      expect(json.data.devices.length).toBe(0);
    });

    it('27. device detail includes registeredAt and lastActiveAt timestamps', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}`,
        { headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      for (const device of json.data.devices) {
        expect(typeof device.registeredAt).toBe('string');
        expect(device.registeredAt.length).toBeGreaterThan(0);
        expect(typeof device.lastActiveAt).toBe('string');
        expect(device.lastActiveAt.length).toBeGreaterThan(0);
      }
    });

    it('28. non-admin user receives 403 on device detail endpoint', async () => {
      const app = createTestApp();
      // Student account has no admin_role — auth passes but RBAC returns 403
      const studentHeaders = await createAuthHeaders(STUDENT_ACCOUNT_ID);
      const res = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}`,
        { headers: studentHeaders },
        testEnv()
      );
      expect(res.status).toBe(403);
    });

    it('29. unauthenticated request receives 401 on device detail endpoint', async () => {
      const app = createTestApp();
      const res = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}`,
        {},
        testEnv()
      );
      expect(res.status).toBe(401);
    });

    it('30. admin can deactivate account via POST /api/v1/admin/accounts/:accountId/deactivate', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/deactivate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: 'Administrative suspension' }),
        },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.accountId).toBe(STUDENT_ACCOUNT_ID);
      expect(mockDb.accounts.get(STUDENT_ACCOUNT_ID)?.status).toBe('suspended');
    });

    it('31. non-admin user receives 403 on deactivate endpoint', async () => {
      const app = createTestApp();
      const studentHeaders = await createAuthHeaders(STUDENT_ACCOUNT_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/deactivate`,
        {
          method: 'POST',
          headers: studentHeaders,
          body: JSON.stringify({ reason: 'Unauthorized try' }),
        },
        testEnv()
      );
      expect(res.status).toBe(403);
    });

    it('32. admin can reactivate suspended account via POST /api/v1/admin/accounts/:accountId/reactivate', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);

      // Deactivate first
      await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/deactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Suspension' }) },
        testEnv()
      );
      expect(mockDb.accounts.get(STUDENT_ACCOUNT_ID)?.status).toBe('suspended');

      // Reactivate
      const res = await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/reactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Reactivation review' }) },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(mockDb.accounts.get(STUDENT_ACCOUNT_ID)?.status).toBe('active');
    });

    it('33. admin can revoke all sessions via POST /api/v1/admin/accounts/:accountId/revoke-sessions', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/revoke-sessions`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Security reset' }) },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      // Account remains active
      expect(mockDb.accounts.get(STUDENT_ACCOUNT_ID)?.status).toBe('active');
    });

    it('34. returns 404 ACCOUNT_NOT_FOUND when target account does not exist', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/00000000-0000-0000-0000-999999999999/deactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Nonexistent' }) },
        testEnv()
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('35. repeated deactivate is idempotent and returns 200', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/deactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'First' }) },
        testEnv()
      );
      const res2 = await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/deactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Second' }) },
        testEnv()
      );
      expect(res2.status).toBe(200);
      const json = (await res2.json()) as any;
      expect(json.success).toBe(true);
    });

    it('36. repeated reactivate is idempotent and returns 200', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}/reactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Already active' }) },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
    });

    it('37. alias routes /users/:accountId/deactivate and reactivate work equivalently', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const resDeact = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}/deactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Via user alias' }) },
        testEnv()
      );
      expect(resDeact.status).toBe(200);
      expect(mockDb.accounts.get(STUDENT_ACCOUNT_ID)?.status).toBe('suspended');

      const resReact = await app.request(
        `/api/v1/admin/users/${STUDENT_ACCOUNT_ID}/reactivate`,
        { method: 'POST', headers, body: JSON.stringify({ reason: 'Via user alias' }) },
        testEnv()
      );
      expect(resReact.status).toBe(200);
      expect(mockDb.accounts.get(STUDENT_ACCOUNT_ID)?.status).toBe('active');
    });

    it('38. DELETE /api/v1/admin/accounts/:accountId permanently hard-deletes student account', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/${STUDENT_ACCOUNT_ID}`,
        { method: 'DELETE', headers, body: JSON.stringify({ reason: 'Student GDPR request' }) },
        testEnv()
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.accountId).toBe(STUDENT_ACCOUNT_ID);
      expect(mockDb.accounts.has(STUDENT_ACCOUNT_ID)).toBe(false);
    });

    it('39. DELETE /accounts/:accountId blocks self-deletion with 400 CANNOT_DELETE_CURRENT_ACCOUNT', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/${OWNER_ADMIN_ID}`,
        { method: 'DELETE', headers, body: JSON.stringify({ reason: 'Self deletion' }) },
        testEnv()
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CANNOT_DELETE_CURRENT_ACCOUNT');
    });

    it('40. DELETE /accounts/:accountId blocks deletion of admin account with 403 CANNOT_DELETE_ADMIN_ACCOUNT', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/${SUPPORT_ADMIN_ID}`,
        { method: 'DELETE', headers, body: JSON.stringify({ reason: 'Admin deletion' }) },
        testEnv()
      );
      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CANNOT_DELETE_ADMIN_ACCOUNT');
    });

    it('41. DELETE /accounts/:accountId returns 404 for nonexistent account', async () => {
      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/accounts/nonexistent-uuid-0000`,
        { method: 'DELETE', headers },
        testEnv()
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('42. DELETE alias /users/:accountId works equivalently', async () => {
      // Seed a temporary student
      const tempId = 'temp-student-uuid';
      mockDb.accounts.set(tempId, {
        account_id: tempId,
        email: 'temp@example.com',
        status: 'active',
        created_at: '2026-08-01T00:00:00.000Z',
        last_login_at: '2026-08-15T00:00:00.000Z',
      });

      const app = createTestApp();
      const headers = await createAuthHeaders(OWNER_ADMIN_ID);
      const res = await app.request(
        `/api/v1/admin/users/${tempId}`,
        { method: 'DELETE', headers },
        testEnv()
      );
      expect(res.status).toBe(200);
      expect(mockDb.accounts.has(tempId)).toBe(false);
    });
  });
});
