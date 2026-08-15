import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { requireAdminPermission } from '../../middleware/admin-auth.js';
import { AdminRepository, type AdminRoleRow, type PaymentRow } from '../../db/admin.repository.js';
import type { Env } from '../../index.js';
import type { AdminContextVariables } from '../../middleware/admin-auth.js';

// In-Memory mock D1 database for testing AdminRepository & RBAC middleware
class MockD1Database {
  public adminRoles: Map<string, AdminRoleRow> = new Map();
  public payments: Map<string, PaymentRow> = new Map();

  prepare(query: string) {
    const db = this;
    return {
      bind(...params: unknown[]) {
        return {
          async first<T>(): Promise<T | null> {
            if (query.includes('FROM admin_roles WHERE account_id = ?')) {
              const accountId = params[0] as string;
              const row = db.adminRoles.get(accountId) || null;
              return row as unknown as T;
            }
            if (query.includes('payment_id = ?')) {
              const paymentId = params[0] as string;
              const row = db.payments.get(paymentId) || null;
              return row as unknown as T;
            }
            if (query.includes('transaction_reference = ?')) {
              const ref = params[0] as string;
              for (const row of db.payments.values()) {
                if (row.transaction_reference === ref) {
                  return row as unknown as T;
                }
              }
              return null;
            }
            return null;
          },
          async all<T>(): Promise<{ results: T[] }> {
            return { results: [] };
          },
          async run(): Promise<{ success: boolean; meta?: unknown }> {
            if (query.includes('INSERT INTO admin_roles')) {
              const [account_id, role, permissions, granted_by, created_at, updated_at] = params as [
                string,
                string,
                string,
                string | null,
                string,
                string,
              ];
              db.adminRoles.set(account_id, {
                account_id,
                role,
                permissions,
                granted_by,
                created_at,
                updated_at,
              });
              return { success: true };
            }
            if (query.includes('DELETE FROM admin_roles WHERE account_id = ?')) {
              const accountId = params[0] as string;
              db.adminRoles.delete(accountId);
              return { success: true };
            }
            if (query.includes('INSERT INTO payments')) {
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
                status,
                source,
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
                string,
                string,
                string | null,
                string | null,
                string,
                string,
              ];

              // Enforce UNIQUE constraint on transaction_reference
              if (transaction_reference) {
                for (const existing of db.payments.values()) {
                  if (existing.transaction_reference === transaction_reference) {
                    throw new Error('UNIQUE constraint failed: payments.transaction_reference');
                  }
                }
              }

              db.payments.set(payment_id, {
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
                status,
                source,
                recorded_by,
                notes,
                receipt_url,
                created_at,
                updated_at,
              });
              return { success: true };
            }
            return { success: true };
          },
        };
      },
    };
  }
}

describe('PHASE 1 — Admin RBAC & Database Repository Unit Tests', () => {
  let mockDb: MockD1Database;
  let adminRepo: AdminRepository;

  const OWNER_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
  const SUPPORT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000002';
  const STUDENT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000003';
  const CORRUPTED_ACCOUNT_ID = '00000000-0000-0000-0000-000000000004';

  beforeEach(() => {
    mockDb = new MockD1Database();
    adminRepo = new AdminRepository(mockDb as unknown as D1Database);

    // 1. Seed Owner with Wildcard permission
    mockDb.adminRoles.set(OWNER_ACCOUNT_ID, {
      account_id: OWNER_ACCOUNT_ID,
      role: 'owner',
      permissions: JSON.stringify(['*']),
      granted_by: 'system:init',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 2. Seed Support with explicit granular permissions
    mockDb.adminRoles.set(SUPPORT_ACCOUNT_ID, {
      account_id: SUPPORT_ACCOUNT_ID,
      role: 'support',
      permissions: JSON.stringify(['user.view', 'subscription.view']),
      granted_by: OWNER_ACCOUNT_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 3. Seed Corrupted account with invalid non-array JSON
    mockDb.adminRoles.set(CORRUPTED_ACCOUNT_ID, {
      account_id: CORRUPTED_ACCOUNT_ID,
      role: 'support',
      permissions: '{ "notAnArray": true }',
      granted_by: OWNER_ACCOUNT_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  describe('1. Admin Repository Unit Tests', () => {
    it('returns AdminRoleDto for valid account with parsed permissions array', async () => {
      const role = await adminRepo.getAdminRole(OWNER_ACCOUNT_ID);
      expect(role).not.toBeNull();
      expect(role?.accountId).toBe(OWNER_ACCOUNT_ID);
      expect(role?.role).toBe('owner');
      expect(role?.permissions).toEqual(['*']);
    });

    it('returns null for non-admin student account', async () => {
      const role = await adminRepo.getAdminRole(STUDENT_ACCOUNT_ID);
      expect(role).toBeNull();
    });

    it('hasPermission returns true for wildcard owner across all permissions', async () => {
      expect(await adminRepo.hasPermission(OWNER_ACCOUNT_ID, 'user.view')).toBe(true);
      expect(await adminRepo.hasPermission(OWNER_ACCOUNT_ID, 'subscription.create')).toBe(true);
      expect(await adminRepo.hasPermission(OWNER_ACCOUNT_ID, 'subscription.revoke')).toBe(true);
      expect(await adminRepo.hasPermission(OWNER_ACCOUNT_ID, 'payment.create')).toBe(true);
      expect(await adminRepo.hasPermission(OWNER_ACCOUNT_ID, 'config.update')).toBe(true);
    });

    it('hasPermission returns true only for explicitly granted permissions on granular role', async () => {
      expect(await adminRepo.hasPermission(SUPPORT_ACCOUNT_ID, 'user.view')).toBe(true);
      expect(await adminRepo.hasPermission(SUPPORT_ACCOUNT_ID, 'subscription.view')).toBe(true);
      expect(await adminRepo.hasPermission(SUPPORT_ACCOUNT_ID, 'subscription.create')).toBe(false);
      expect(await adminRepo.hasPermission(SUPPORT_ACCOUNT_ID, 'subscription.revoke')).toBe(false);
      expect(await adminRepo.hasPermission(SUPPORT_ACCOUNT_ID, 'payment.create')).toBe(false);
    });

    it('assignAdminRole and removeAdminRole updates D1 correctly', async () => {
      const NEW_ADMIN_ID = '00000000-0000-0000-0000-000000000099';
      await adminRepo.assignAdminRole({
        accountId: NEW_ADMIN_ID,
        role: 'finance',
        permissions: ['payment.view', 'payment.create'],
        grantedBy: OWNER_ACCOUNT_ID,
      });

      const role = await adminRepo.getAdminRole(NEW_ADMIN_ID);
      expect(role).not.toBeNull();
      expect(role?.role).toBe('finance');
      expect(role?.permissions).toEqual(['payment.view', 'payment.create']);

      await adminRepo.removeAdminRole(NEW_ADMIN_ID);
      const deletedRole = await adminRepo.getAdminRole(NEW_ADMIN_ID);
      expect(deletedRole).toBeNull();
    });

    it('fails closed to empty array when permissions JSON is malformed', async () => {
      const role = await adminRepo.getAdminRole(CORRUPTED_ACCOUNT_ID);
      expect(role).not.toBeNull();
      expect(role?.permissions).toEqual([]);
      expect(await adminRepo.hasPermission(CORRUPTED_ACCOUNT_ID, 'user.view')).toBe(false);
    });
  });

  describe('2. Payments Repository & Constraint Unit Tests', () => {
    it('successfully records an offline UPI payment and retrieves it by ID and reference', async () => {
      const paymentId = 'pay-0000-0000-0000-000000000001';
      const ref = 'UPI-20260815-112233';

      await adminRepo.recordPayment({
        paymentId,
        accountId: STUDENT_ACCOUNT_ID,
        subscriptionId: 'sub-1',
        amountPaise: 29900,
        currency: 'INR',
        paymentMethod: 'upi',
        transactionReference: ref,
        status: 'captured',
        source: 'manual_admin',
        recordedBy: OWNER_ACCOUNT_ID,
        notes: 'Verified direct Google Pay payment',
      });

      const byId = await adminRepo.getPaymentById(paymentId);
      expect(byId).not.toBeNull();
      expect(byId?.amountPaise).toBe(29900);
      expect(byId?.paymentMethod).toBe('upi');
      expect(byId?.transactionReference).toBe(ref);
      expect(byId?.status).toBe('captured');

      const byRef = await adminRepo.getPaymentByReference(ref);
      expect(byRef).not.toBeNull();
      expect(byRef?.paymentId).toBe(paymentId);
    });

    it('rejects duplicate transaction reference with unique constraint violation', async () => {
      const ref = 'UPI-DUPLICATE-REF-99';

      await adminRepo.recordPayment({
        paymentId: 'pay-1',
        accountId: STUDENT_ACCOUNT_ID,
        amountPaise: 3000,
        paymentMethod: 'upi',
        transactionReference: ref,
        status: 'captured',
        source: 'manual_admin',
        recordedBy: OWNER_ACCOUNT_ID,
      });

      await expect(
        adminRepo.recordPayment({
          paymentId: 'pay-2',
          accountId: STUDENT_ACCOUNT_ID,
          amountPaise: 3000,
          paymentMethod: 'upi',
          transactionReference: ref,
          status: 'captured',
          source: 'manual_admin',
          recordedBy: OWNER_ACCOUNT_ID,
        })
      ).rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('3. requireAdminPermission Middleware Integration Tests', () => {
    function createTestApp() {
      const app = new Hono<{
        Bindings: { DB: D1Database };
        Variables: AdminContextVariables;
      }>();

      // Middleware simulator: Attaches accountId if present in header
      app.use('*', async (c, next) => {
        const testAccountId = c.req.header('x-test-account-id');
        if (testAccountId) {
          c.set('accountId', testAccountId);
          c.set('sessionId', 'mock-session');
          c.set('deviceId', 'mock-device');
        }
        await next();
      });

      app.get('/test/user-view', requireAdminPermission('user.view'), (c) => {
        return c.json({ success: true, role: c.get('adminRole'), permissions: c.get('adminPermissions') });
      });

      app.post('/test/sub-create', requireAdminPermission('subscription.create'), (c) => {
        return c.json({ success: true, role: c.get('adminRole') });
      });

      return app;
    }

    const testEnv = () => ({ DB: mockDb as unknown as D1Database });

    it('returns 401 UNAUTHORIZED if no accountId is present on context', async () => {
      const app = createTestApp();
      const res = await app.request('/test/user-view', {}, testEnv());
      expect(res.status).toBe(401);

      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 FORBIDDEN if authenticated user has no admin_roles record', async () => {
      const app = createTestApp();
      const res = await app.request(
        '/test/user-view',
        {
          headers: { 'x-test-account-id': STUDENT_ACCOUNT_ID },
        },
        testEnv()
      );
      expect(res.status).toBe(403);

      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.message).toContain('Admin privileges required');
    });

    it('allows access and attaches role/permissions to context when user has wildcard *', async () => {
      const app = createTestApp();
      const res = await app.request(
        '/test/user-view',
        {
          headers: { 'x-test-account-id': OWNER_ACCOUNT_ID },
        },
        testEnv()
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.role).toBe('owner');
      expect(json.permissions).toEqual(['*']);
    });

    it('allows access when user has explicit required permission', async () => {
      const app = createTestApp();
      const res = await app.request(
        '/test/user-view',
        {
          headers: { 'x-test-account-id': SUPPORT_ACCOUNT_ID },
        },
        testEnv()
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.role).toBe('support');
    });

    it('rejects with 403 FORBIDDEN when user has admin role but lacks specific permission', async () => {
      const app = createTestApp();
      const res = await app.request(
        '/test/sub-create',
        {
          method: 'POST',
          headers: { 'x-test-account-id': SUPPORT_ACCOUNT_ID },
        },
        testEnv()
      );
      expect(res.status).toBe(403);

      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.message).toContain('Required permission not granted: subscription.create');
    });

    it('rejects with 403 FORBIDDEN when permissions JSON is corrupted/non-array', async () => {
      const app = createTestApp();
      const res = await app.request(
        '/test/user-view',
        {
          headers: { 'x-test-account-id': CORRUPTED_ACCOUNT_ID },
        },
        testEnv()
      );
      expect(res.status).toBe(403);

      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });
});
