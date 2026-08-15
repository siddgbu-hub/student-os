import { describe, it, expect, beforeEach } from 'vitest';
import { AccountLifecycleService, AccountLifecycleError } from './account-lifecycle.service.js';

interface AccountRecord {
  account_id: string;
  email: string;
  status: string;
  created_at: string;
  last_login_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface SessionRecord {
  session_id: string;
  account_id: string;
  device_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

interface DeviceRecord {
  device_id: string;
  account_id: string;
  device_model: string | null;
  os_version: string | null;
  is_active: number;
  registered_at: string;
  last_active_at: string;
}

interface AuditLogRecord {
  id: string;
  account_id: string;
  event_type: string;
  details: string;
  created_at: string;
}

class MockD1Database {
  public accounts: Map<string, AccountRecord> = new Map();
  public adminRoles: Map<string, { account_id: string; role: string }> = new Map();
  public sessions: Map<string, SessionRecord> = new Map();
  public devices: Map<string, DeviceRecord> = new Map();
  public auditLogs: AuditLogRecord[] = [];
  public studySessions: Map<string, { id: string; account_id: string; title: string }> = new Map();
  public chapters: Map<string, { id: string; account_id: string }> = new Map();
  public subjects: Map<string, { id: string; account_id: string }> = new Map();
  public plannerTasks: Map<string, { id: string; account_id: string }> = new Map();
  public plannerLogs: Map<string, { id: string; account_id: string }> = new Map();
  public revisionItems: Map<string, { id: string; account_id: string }> = new Map();
  public revisionSessions: Map<string, { id: string; account_id: string }> = new Map();
  public revisionLogs: Map<string, { id: string; account_id: string }> = new Map();
  public examGoals: Map<string, { id: string; account_id: string }> = new Map();
  public profiles: Map<string, { account_id: string }> = new Map();
  public preferences: Map<string, { account_id: string }> = new Map();
  public identities: Map<string, { id: string; account_id: string }> = new Map();
  public verifications: Map<string, { id: string; target: string }> = new Map();
  public payments: Map<string, { id: string; account_id: string; amount_paise: number }> = new Map();
  public subscriptions: Map<string, { id: string; account_id: string }> = new Map();
  public entitlements: Map<string, { id: string; account_id: string }> = new Map();
  public entitlementAuditLogs: Map<string, { id: string; account_id: string }> = new Map();

  prepare(query: string) {
    const db = this;
    return {
      bind(...params: unknown[]) {
        return {
          async first<T>(): Promise<T | null> {
            if (query.includes('FROM accounts WHERE account_id = ?')) {
              const accountId = params[0] as string;
              const acc = db.accounts.get(accountId);
              return acc ? (acc as unknown as T) : null;
            }
            if (query.includes('FROM admin_roles WHERE account_id = ?')) {
              const accountId = params[0] as string;
              const role = db.adminRoles.get(accountId);
              return role ? (role as unknown as T) : null;
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
            if (query.includes('SELECT COUNT(*) as cnt FROM sessions WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const s of db.sessions.values()) if (s.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM devices WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const d of db.devices.values()) if (d.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM planner_tasks WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const t of db.plannerTasks.values()) if (t.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM planner_task_logs WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const l of db.plannerLogs.values()) if (l.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM revision_items WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const r of db.revisionItems.values()) if (r.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM revision_sessions WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const r of db.revisionSessions.values()) if (r.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM revision_item_logs WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const r of db.revisionLogs.values()) if (r.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM study_sessions WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const s of db.studySessions.values()) if (s.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM chapters WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const c of db.chapters.values()) if (c.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM subjects WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const s of db.subjects.values()) if (s.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM exam_goals WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const g of db.examGoals.values()) if (g.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM user_profiles WHERE account_id = ?')) {
              const accountId = params[0] as string;
              return { cnt: db.profiles.has(accountId) ? 1 : 0 } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM user_preferences WHERE account_id = ?')) {
              const accountId = params[0] as string;
              return { cnt: db.preferences.has(accountId) ? 1 : 0 } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM account_identities WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const i of db.identities.values()) if (i.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM verification_requests WHERE target = ?')) {
              const target = params[0] as string;
              let cnt = 0;
              for (const v of db.verifications.values()) if (v.target === target) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt, COALESCE(SUM(amount_paise), 0) as total_amount FROM payments WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              let total_amount = 0;
              for (const p of db.payments.values()) {
                if (p.account_id === accountId) {
                  cnt++;
                  total_amount += p.amount_paise;
                }
              }
              return { cnt, total_amount } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM subscriptions WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const s of db.subscriptions.values()) if (s.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM entitlements WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const e of db.entitlements.values()) if (e.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            if (query.includes('SELECT COUNT(*) as cnt FROM entitlement_audit_logs WHERE account_id = ?')) {
              const accountId = params[0] as string;
              let cnt = 0;
              for (const a of db.entitlementAuditLogs.values()) if (a.account_id === accountId) cnt++;
              return { cnt } as unknown as T;
            }
            return null;
          },
          async all<T>(): Promise<{ results: T[] }> {
            return { results: [] };
          },
          async run(): Promise<{ success: boolean }> {
            return { success: true };
          },
          _query: query,
          _params: params,
        };
      },
    };
  }

  async batch(statements: Array<{ _query: string; _params: unknown[] }>) {
    for (const stmt of statements) {
      const q = stmt._query;
      const p = stmt._params;

      if (q.includes('UPDATE accounts SET status = ? WHERE account_id = ?')) {
        const [status, accountId] = p as [string, string];
        const acc = this.accounts.get(accountId);
        if (acc) {
          acc.status = status;
          this.accounts.set(accountId, acc);
        }
      } else if (q.includes('UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL')) {
        const [revokedAt, accountId] = p as [string, string];
        for (const s of this.sessions.values()) {
          if (s.account_id === accountId && s.revoked_at === null) {
            s.revoked_at = revokedAt;
          }
        }
      } else if (q.includes('UPDATE devices SET is_active = 0 WHERE account_id = ? AND is_active = 1')) {
        const [accountId] = p as [string];
        for (const d of this.devices.values()) {
          if (d.account_id === accountId && d.is_active === 1) {
            d.is_active = 0;
          }
        }
      } else if (q.includes('INSERT INTO audit_logs')) {
        const [id, account_id, event_type, details, created_at] = p as [string, string, string, string, string];
        this.auditLogs.push({ id, account_id, event_type, details, created_at });
      } else if (q.includes('DELETE FROM sessions WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, s] of Array.from(this.sessions.entries())) if (s.account_id === accountId) this.sessions.delete(id);
      } else if (q.includes('DELETE FROM devices WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, d] of Array.from(this.devices.entries())) if (d.account_id === accountId) this.devices.delete(id);
      } else if (q.includes('DELETE FROM planner_task_logs WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, l] of Array.from(this.plannerLogs.entries())) if (l.account_id === accountId) this.plannerLogs.delete(id);
      } else if (q.includes('DELETE FROM planner_tasks WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, t] of Array.from(this.plannerTasks.entries())) if (t.account_id === accountId) this.plannerTasks.delete(id);
      } else if (q.includes('DELETE FROM revision_item_logs WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, l] of Array.from(this.revisionLogs.entries())) if (l.account_id === accountId) this.revisionLogs.delete(id);
      } else if (q.includes('DELETE FROM revision_sessions WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, s] of Array.from(this.revisionSessions.entries())) if (s.account_id === accountId) this.revisionSessions.delete(id);
      } else if (q.includes('DELETE FROM revision_items WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, r] of Array.from(this.revisionItems.entries())) if (r.account_id === accountId) this.revisionItems.delete(id);
      } else if (q.includes('DELETE FROM study_sessions WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, s] of Array.from(this.studySessions.entries())) if (s.account_id === accountId) this.studySessions.delete(id);
      } else if (q.includes('DELETE FROM chapters WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, c] of Array.from(this.chapters.entries())) if (c.account_id === accountId) this.chapters.delete(id);
      } else if (q.includes('DELETE FROM subjects WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, s] of Array.from(this.subjects.entries())) if (s.account_id === accountId) this.subjects.delete(id);
      } else if (q.includes('DELETE FROM exam_goals WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, g] of Array.from(this.examGoals.entries())) if (g.account_id === accountId) this.examGoals.delete(id);
      } else if (q.includes('DELETE FROM user_preferences WHERE account_id = ?')) {
        const [accountId] = p as [string];
        this.preferences.delete(accountId);
      } else if (q.includes('DELETE FROM user_profiles WHERE account_id = ?')) {
        const [accountId] = p as [string];
        this.profiles.delete(accountId);
      } else if (q.includes('DELETE FROM account_identities WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, i] of Array.from(this.identities.entries())) if (i.account_id === accountId) this.identities.delete(id);
      } else if (q.includes('DELETE FROM verification_requests WHERE target = ?')) {
        const [target] = p as [string];
        for (const [id, v] of Array.from(this.verifications.entries())) if (v.target === target) this.verifications.delete(id);
      } else if (q.includes('DELETE FROM payments WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, py] of Array.from(this.payments.entries())) if (py.account_id === accountId) this.payments.delete(id);
      } else if (q.includes('DELETE FROM subscriptions WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, s] of Array.from(this.subscriptions.entries())) if (s.account_id === accountId) this.subscriptions.delete(id);
      } else if (q.includes('DELETE FROM entitlements WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, e] of Array.from(this.entitlements.entries())) if (e.account_id === accountId) this.entitlements.delete(id);
      } else if (q.includes('DELETE FROM entitlement_audit_logs WHERE account_id = ?')) {
        const [accountId] = p as [string];
        for (const [id, a] of Array.from(this.entitlementAuditLogs.entries())) if (a.account_id === accountId) this.entitlementAuditLogs.delete(id);
      } else if (q.includes('DELETE FROM accounts WHERE account_id = ?')) {
        const [accountId] = p as [string];
        this.accounts.delete(accountId);
      }
    }
    return [];
  }
}

describe('AccountLifecycleService', () => {
  let db: MockD1Database;
  let service: AccountLifecycleService;
  const adminAccountId = 'admin-uuid-1111-2222';
  const studentAccountId = 'student-uuid-3333-4444';

  beforeEach(() => {
    db = new MockD1Database();
    service = new AccountLifecycleService(db as unknown as D1Database);

    // Seed test account
    db.accounts.set(studentAccountId, {
      account_id: studentAccountId,
      email: 'student@example.com',
      status: 'active',
      created_at: '2026-08-01T00:00:00.000Z',
      last_login_at: '2026-08-15T00:00:00.000Z',
    });

    // Seed active sessions
    db.sessions.set('sess-1', {
      session_id: 'sess-1',
      account_id: studentAccountId,
      device_id: 'dev-1',
      token_hash: 'secret-hash-1',
      expires_at: '2026-09-01T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      revoked_at: null,
    });
    db.sessions.set('sess-2', {
      session_id: 'sess-2',
      account_id: studentAccountId,
      device_id: 'dev-2',
      token_hash: 'secret-hash-2',
      expires_at: '2026-09-01T00:00:00.000Z',
      created_at: '2026-08-05T00:00:00.000Z',
      revoked_at: null,
    });

    // Seed devices
    db.devices.set('dev-1', {
      device_id: 'dev-1',
      account_id: studentAccountId,
      device_model: 'Pixel 8',
      os_version: '14',
      is_active: 1,
      registered_at: '2026-08-01T00:00:00.000Z',
      last_active_at: '2026-08-15T00:00:00.000Z',
    });

    // Seed historical study and payment data
    db.studySessions.set('study-1', { id: 'study-1', account_id: studentAccountId, title: 'Calculus Ch 3' });
    db.payments.set('pay-1', { id: 'pay-1', account_id: studentAccountId, amount_paise: 29900 });
  });

  describe('1. Deactivate Account', () => {
    it('successfully suspends active account, revokes sessions, deactivates devices, and logs audit', async () => {
      const res = await service.deactivateAccount({
        accountId: studentAccountId,
        adminAccountId,
        reason: 'Violated terms of service',
      });

      expect(res.success).toBe(true);
      expect(res.revokedSessionsCount).toBe(2);
      expect(res.deactivatedDevicesCount).toBe(1);

      // Account status changed to suspended
      const acc = db.accounts.get(studentAccountId);
      expect(acc?.status).toBe('suspended');

      // Sessions revoked
      for (const s of db.sessions.values()) {
        expect(s.revoked_at).not.toBeNull();
      }

      // Devices deactivated
      const dev = db.devices.get('dev-1');
      expect(dev?.is_active).toBe(0);

      // Historical data preserved
      expect(db.studySessions.has('study-1')).toBe(true);
      expect(db.payments.has('pay-1')).toBe(true);

      // Audit log created
      expect(db.auditLogs.length).toBe(1);
      const audit = db.auditLogs[0];
      expect(audit.event_type).toBe('ACCOUNT_DEACTIVATED');
      expect(audit.account_id).toBe(studentAccountId);
      const details = JSON.parse(audit.details);
      expect(details.operator).toBe(adminAccountId);
      expect(details.reason).toBe('Violated terms of service');
      expect(details.revokedSessionsCount).toBe(2);
      // Secrets must never be logged
      expect(audit.details).not.toContain('secret-hash');
    });

    it('is idempotent when deactivating an already suspended account', async () => {
      // First deactivation
      await service.deactivateAccount({
        accountId: studentAccountId,
        adminAccountId,
        reason: 'First deactivation',
      });

      // Second deactivation
      const secondRes = await service.deactivateAccount({
        accountId: studentAccountId,
        adminAccountId,
        reason: 'Second deactivation attempt',
      });

      expect(secondRes.success).toBe(true);
      expect(secondRes.message).toContain('already suspended');
      // No duplicate audit log created
      expect(db.auditLogs.length).toBe(1);
    });

    it('throws ACCOUNT_NOT_FOUND when target account does not exist', async () => {
      await expect(
        service.deactivateAccount({
          accountId: 'nonexistent-uuid',
          adminAccountId,
        })
      ).rejects.toThrow(AccountLifecycleError);
    });
  });

  describe('2. Reactivate Account', () => {
    beforeEach(async () => {
      await service.deactivateAccount({
        accountId: studentAccountId,
        adminAccountId,
        reason: 'Initial deactivation',
      });
    });

    it('successfully restores suspended account to active and logs audit without restoring old sessions', async () => {
      const res = await service.reactivateAccount({
        accountId: studentAccountId,
        adminAccountId,
        reason: 'Resolved terms inquiry',
      });

      expect(res.success).toBe(true);

      const acc = db.accounts.get(studentAccountId);
      expect(acc?.status).toBe('active');

      // Old sessions must remain revoked (student re-authenticates anew)
      for (const s of db.sessions.values()) {
        expect(s.revoked_at).not.toBeNull();
      }

      // Audit log created
      const reactivateAudit = db.auditLogs.find((l) => l.event_type === 'ACCOUNT_REACTIVATED');
      expect(reactivateAudit).toBeDefined();
      const details = JSON.parse(reactivateAudit!.details);
      expect(details.operator).toBe(adminAccountId);
      expect(details.reason).toBe('Resolved terms inquiry');
    });

    it('is idempotent when reactivating an already active account', async () => {
      await service.reactivateAccount({
        accountId: studentAccountId,
        adminAccountId,
      });

      const secondRes = await service.reactivateAccount({
        accountId: studentAccountId,
        adminAccountId,
      });

      expect(secondRes.success).toBe(true);
      expect(secondRes.message).toContain('already active');
    });
  });

  describe('3. Revoke All Sessions', () => {
    it('revokes active sessions and devices without altering account status', async () => {
      const res = await service.revokeAllSessions({
        accountId: studentAccountId,
        adminAccountId,
        reason: 'Security device reset',
      });

      expect(res.success).toBe(true);
      expect(res.revokedSessionsCount).toBe(2);
      expect(res.deactivatedDevicesCount).toBe(1);

      // Account status must remain active
      const acc = db.accounts.get(studentAccountId);
      expect(acc?.status).toBe('active');

      // Sessions revoked
      for (const s of db.sessions.values()) {
        expect(s.revoked_at).not.toBeNull();
      }

      // Devices deactivated
      const dev = db.devices.get('dev-1');
      expect(dev?.is_active).toBe(0);

      // Audit log created
      const audit = db.auditLogs[0];
      expect(audit.event_type).toBe('ALL_SESSIONS_REVOKED');
      const details = JSON.parse(audit.details);
      expect(details.operator).toBe(adminAccountId);
      expect(details.reason).toBe('Security device reset');
      expect(audit.details).not.toContain('secret-hash');
    });
  });

  describe('4. Delete Account Permanently', () => {
    beforeEach(() => {
      // Seed child records across multiple domains
      db.plannerTasks.set('task-1', { id: 'task-1', account_id: studentAccountId });
      db.plannerLogs.set('log-1', { id: 'log-1', account_id: studentAccountId });
      db.revisionItems.set('rev-1', { id: 'rev-1', account_id: studentAccountId });
      db.revisionSessions.set('rev-sess-1', { id: 'rev-sess-1', account_id: studentAccountId });
      db.revisionLogs.set('rev-log-1', { id: 'rev-log-1', account_id: studentAccountId });
      db.chapters.set('chap-1', { id: 'chap-1', account_id: studentAccountId });
      db.subjects.set('subj-1', { id: 'subj-1', account_id: studentAccountId });
      db.examGoals.set('goal-1', { id: 'goal-1', account_id: studentAccountId });
      db.profiles.set(studentAccountId, { account_id: studentAccountId });
      db.preferences.set(studentAccountId, { account_id: studentAccountId });
      db.identities.set('id-1', { id: 'id-1', account_id: studentAccountId });
      db.verifications.set('ver-1', { id: 'ver-1', target: 'student@example.com' });
      db.payments.set('pay-1', { id: 'pay-1', account_id: studentAccountId, amount_paise: 29900 });
      db.subscriptions.set('sub-1', { id: 'sub-1', account_id: studentAccountId });
      db.entitlements.set('ent-1', { id: 'ent-1', account_id: studentAccountId });
      db.entitlementAuditLogs.set('ent-audit-1', { id: 'ent-audit-1', account_id: studentAccountId });
    });

    it('successfully hard-deletes student account and all child records, while preserving permanent deletion audit record', async () => {
      const res = await service.deleteAccount({
        accountId: studentAccountId,
        adminAccountId,
        reason: 'Student GDPR / Right-to-be-forgotten deletion request',
      });

      expect(res.success).toBe(true);
      expect(res.deletedRecordsSummary).toBeDefined();
      expect(res.deletedRecordsSummary?.sessions).toBe(2);
      expect(res.deletedRecordsSummary?.devices).toBe(1);
      expect(res.deletedRecordsSummary?.studySessions).toBe(1);
      expect(res.deletedRecordsSummary?.plannerTasks).toBe(1);
      expect(res.deletedRecordsSummary?.payments).toBe(1);
      expect(res.deletedRecordsSummary?.paymentsAmountPaise).toBe(29900);

      // Account itself is deleted
      expect(db.accounts.has(studentAccountId)).toBe(false);

      // All child records are wiped
      expect(db.sessions.size).toBe(0);
      expect(db.devices.size).toBe(0);
      expect(db.studySessions.size).toBe(0);
      expect(db.chapters.size).toBe(0);
      expect(db.subjects.size).toBe(0);
      expect(db.plannerTasks.size).toBe(0);
      expect(db.plannerLogs.size).toBe(0);
      expect(db.revisionItems.size).toBe(0);
      expect(db.revisionSessions.size).toBe(0);
      expect(db.revisionLogs.size).toBe(0);
      expect(db.examGoals.size).toBe(0);
      expect(db.profiles.size).toBe(0);
      expect(db.preferences.size).toBe(0);
      expect(db.identities.size).toBe(0);
      expect(db.verifications.size).toBe(0);
      expect(db.payments.size).toBe(0);
      expect(db.subscriptions.size).toBe(0);
      expect(db.entitlements.size).toBe(0);
      expect(db.entitlementAuditLogs.size).toBe(0);

      // Audit log is created and persists
      expect(db.auditLogs.length).toBe(1);
      const audit = db.auditLogs[0];
      expect(audit.event_type).toBe('ACCOUNT_PERMANENTLY_DELETED');
      expect(audit.account_id).toBe(studentAccountId);

      const details = JSON.parse(audit.details);
      expect(details.operatorAdminId).toBe(adminAccountId);
      expect(details.deletedEmail).toBe('student@example.com');
      expect(details.paymentCount).toBe(1);
      expect(details.paymentTotalPaise).toBe(29900);
      expect(details.reason).toBe('Student GDPR / Right-to-be-forgotten deletion request');
      // No secrets in audit
      expect(audit.details).not.toContain('secret-hash');
    });

    it('blocks operator from deleting their own account with CANNOT_DELETE_CURRENT_ACCOUNT', async () => {
      await expect(
        service.deleteAccount({
          accountId: adminAccountId,
          adminAccountId: adminAccountId, // Same account
          reason: 'Attempt self-deletion',
        })
      ).rejects.toThrow(AccountLifecycleError);

      try {
        await service.deleteAccount({
          accountId: adminAccountId,
          adminAccountId: adminAccountId,
        });
      } catch (err: any) {
        expect(err.code).toBe('CANNOT_DELETE_CURRENT_ACCOUNT');
      }
    });

    it('blocks deletion of privileged accounts present in admin_roles with CANNOT_DELETE_ADMIN_ACCOUNT', async () => {
      const privilegedAdminId = 'admin-owner-uuid-9999';
      db.accounts.set(privilegedAdminId, {
        account_id: privilegedAdminId,
        email: 'owner@example.com',
        status: 'active',
        created_at: '2026-01-01T00:00:00.000Z',
        last_login_at: '2026-08-15T00:00:00.000Z',
      });
      db.adminRoles.set(privilegedAdminId, { account_id: privilegedAdminId, role: 'owner' });

      try {
        await service.deleteAccount({
          accountId: privilegedAdminId,
          adminAccountId,
          reason: 'Attempt admin deletion',
        });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err instanceof AccountLifecycleError).toBe(true);
        expect(err.code).toBe('CANNOT_DELETE_ADMIN_ACCOUNT');
      }

      // Privileged account was not deleted
      expect(db.accounts.has(privilegedAdminId)).toBe(true);
    });

    it('throws ACCOUNT_NOT_FOUND when attempting to delete nonexistent account', async () => {
      await expect(
        service.deleteAccount({
          accountId: 'nonexistent-uuid-0000',
          adminAccountId,
        })
      ).rejects.toThrow(AccountLifecycleError);
    });
  });
});
