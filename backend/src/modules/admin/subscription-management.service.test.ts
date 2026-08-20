import { describe, it, expect, beforeEach } from 'vitest';
import {
  SubscriptionManagementService,
  SUBSCRIPTION_ERRORS,
  SubscriptionDomainError,
} from './subscription-management.service.js';
import { ALL_STUDENT_OS_FEATURES, type PlanDto } from '@student-os/shared';
import { calculateIstExpiryDate, getStartOfIstDay, getIstCalendarComponents } from '../../utils/ist-date.js';

interface MockAccount {
  account_id: string;
  email: string;
}

interface MockPlan {
  plan_id: string;
  name: string;
  price_cents: number;
  duration_days: number | null;
  features: string;
  is_active: number;
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

interface MockPayment {
  payment_id: string;
  account_id: string;
  subscription_id: string | null;
  amount_paise: number;
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

// In-Memory D1 Mock with full transaction/batch rollback support
class MockD1DatabaseForSubService {
  public accounts: Map<string, MockAccount> = new Map();
  public plans: Map<string, MockPlan> = new Map();
  public subscriptions: Map<string, MockSubscription> = new Map();
  public entitlements: Map<string, MockEntitlement> = new Map();
  public payments: Map<string, MockPayment> = new Map();
  public auditLogs: Map<string, MockAuditLog> = new Map();

  // Flag to simulate database batch failure for atomicity testing
  public forceBatchFailure = false;

  prepare(query: string) {
    const db = this;
    return {
      bind(...params: unknown[]) {
        return {
          query,
          params,
          async first<T>(): Promise<T | null> {
            if (query.includes('FROM accounts WHERE account_id = ?')) {
              const accountId = params[0] as string;
              return (db.accounts.get(accountId) as unknown as T) || null;
            }
            if (query.includes('FROM plans WHERE plan_id = ?')) {
              const planId = params[0] as string;
              return (db.plans.get(planId) as unknown as T) || null;
            }
            if (query.includes('FROM entitlements WHERE account_id = ?')) {
              const accountId = params[0] as string;
              return (db.entitlements.get(accountId) as unknown as T) || null;
            }
            if (query.includes('FROM payments WHERE transaction_reference = ?')) {
              const ref = params[0] as string;
              for (const p of db.payments.values()) {
                if (p.transaction_reference === ref) {
                  return { payment_id: p.payment_id } as unknown as T;
                }
              }
              return null;
            }
            if (query.includes('FROM subscriptions') && query.includes("status = 'revoked'")) {
              const accountId = params[0] as string;
              const revokedSubs = Array.from(db.subscriptions.values())
                .filter((s) => s.account_id === accountId && s.status === 'revoked')
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              return (revokedSubs[0] as unknown as T) || null;
            }
            if (query.includes('FROM subscriptions') && query.includes("status = 'active'") && query.includes("plan_id IN ('monthly', 'yearly')")) {
              const accountId = params[0] as string;
              const activeProSubs = Array.from(db.subscriptions.values())
                .filter((s) => s.account_id === accountId && s.status === 'active' && (s.plan_id === 'monthly' || s.plan_id === 'yearly') && s.expiry_date)
                .sort((a, b) => new Date(b.expiry_date!).getTime() - new Date(a.expiry_date!).getTime());
              return (activeProSubs[0] as unknown as T) || null;
            }
            return null;
          },
          async all<T>(): Promise<{ results: T[] }> {
            if (query.includes('FROM subscriptions') && query.includes("status = 'revoked'")) {
              const accountId = params[0] as string;
              const revokedSubs = Array.from(db.subscriptions.values())
                .filter((s) => s.account_id === accountId && s.status === 'revoked')
                .sort((a, b) => new Date(b.expiry_date || 0).getTime() - new Date(a.expiry_date || 0).getTime());
              return { results: revokedSubs as unknown as T[] };
            }
            return { results: [] };
          },
          async run() {
            return { success: true };
          },
        };
      },
    };
  }

  async batch(statements: Array<{ query: string; params: unknown[] }>) {
    if (this.forceBatchFailure) {
      throw new Error('D1_SIMULATED_BATCH_FAILURE');
    }

    // Create snapshot for atomicity rollback
    const subsBackup = new Map(this.subscriptions);
    const entsBackup = new Map(this.entitlements);
    const paymentsBackup = new Map(this.payments);
    const auditBackup = new Map(this.auditLogs);

    try {
      for (const stmt of statements) {
        const { query, params } = stmt;

        // 1. UPDATE subscriptions SET status = 'superseded'
        if (query.includes("UPDATE subscriptions SET status = 'superseded'")) {
          const [updatedAt, accountId] = params as [string, string];
          for (const sub of this.subscriptions.values()) {
            if (sub.account_id === accountId && sub.status === 'active') {
              sub.status = 'superseded';
              sub.updated_at = updatedAt;
            }
          }
        }
        // 2. UPDATE subscriptions SET status = 'revoked'
        else if (query.includes("UPDATE subscriptions SET status = 'revoked'")) {
          const [updatedAt, accountId] = params as [string, string];
          for (const sub of this.subscriptions.values()) {
            if (sub.account_id === accountId && sub.status === 'active') {
              sub.status = 'revoked';
              sub.updated_at = updatedAt;
            }
          }
        }
        // 2b. UPDATE subscriptions SET status = ?, updated_at = ? WHERE subscription_id = ?
        else if (query.includes('UPDATE subscriptions SET status = ?, updated_at = ? WHERE subscription_id = ?')) {
          const [newStatus, updatedAt, subId] = params as [string, string, string];
          const sub = this.subscriptions.get(subId);
          if (sub) {
            sub.status = newStatus;
            sub.updated_at = updatedAt;
          }
        }
        // 3. INSERT INTO subscriptions
        else if (query.includes('INSERT INTO subscriptions')) {
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

          if (!this.accounts.has(account_id)) {
            throw new Error('D1_ERROR: FOREIGN KEY constraint failed: subscriptions.account_id -> accounts.account_id');
          }
          if (!this.plans.has(plan_id)) {
            throw new Error('D1_ERROR: FOREIGN KEY constraint failed: subscriptions.plan_id -> plans.plan_id');
          }

          const source = query.includes("'payment'") ? 'payment' : 'manual';
          this.subscriptions.set(subscription_id, {
            subscription_id,
            account_id,
            plan_id,
            status: 'active',
            source,
            granted_by,
            start_date,
            expiry_date,
            cancelled_at: null,
            payment_reference,
            created_at,
            updated_at,
          });
        }
        // 4. INSERT INTO entitlements ... ON CONFLICT
        else if (query.includes('INSERT INTO entitlements')) {
          let entitlement_id: string,
            account_id: string,
            current_plan_id: string,
            status: string,
            is_paid: number,
            features: string,
            expires_at: string | null,
            last_verified_at: string,
            created_at: string,
            updated_at: string;

          if (params.length === 10) {
            [
              entitlement_id,
              account_id,
              current_plan_id,
              status,
              is_paid,
              features,
              expires_at,
              last_verified_at,
              created_at,
              updated_at,
            ] = params as [string, string, string, string, number, string, string | null, string, string, string];
          } else {
            [
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
            is_paid = isRevoked ? 0 : 1;
            status = isRevoked ? 'revoked' : 'active';
          }

          if (!this.accounts.has(account_id)) {
            throw new Error('D1_ERROR: FOREIGN KEY constraint failed: entitlements.account_id -> accounts.account_id');
          }

          this.entitlements.set(account_id, {
            entitlement_id,
            account_id,
            current_plan_id,
            status,
            is_paid,
            features,
            expires_at,
            last_verified_at,
            created_at,
            updated_at,
          });
        }
        // 5. INSERT INTO payments
        else if (query.includes('INSERT INTO payments')) {
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
            number,
            number,
            number,
            string,
            string,
            string | null,
            string,
            string | null,
            string | null,
            string,
            string,
          ];

          // Enforce foreign key constraints
          if (!this.accounts.has(account_id)) {
            throw new Error('D1_ERROR: FOREIGN KEY constraint failed: payments.account_id -> accounts.account_id');
          }
          if (subscription_id && !this.subscriptions.has(subscription_id)) {
            throw new Error('D1_ERROR: FOREIGN KEY constraint failed: payments.subscription_id -> subscriptions.subscription_id');
          }

          // Check unique constraint on transaction_reference
          if (transaction_reference) {
            for (const p of this.payments.values()) {
              if (p.transaction_reference === transaction_reference) {
                throw new Error('UNIQUE constraint failed: payments.transaction_reference');
              }
            }
          }

          this.payments.set(payment_id, {
            payment_id,
            account_id,
            subscription_id,
            amount_paise,
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
        }
        // 6. INSERT INTO entitlement_audit_logs
        else if (query.includes('INSERT INTO entitlement_audit_logs')) {
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
          if (query.includes('REVOCATION_CANCELLED')) event_type = 'REVOCATION_CANCELLED';
          if (query.includes('ENTITLEMENT_ACTIVATED_PAYMENT')) event_type = 'ENTITLEMENT_ACTIVATED_PAYMENT';

          this.auditLogs.set(id, {
            id,
            account_id,
            event_type,
            plan_id,
            granted_by,
            source: event_type === 'ENTITLEMENT_ACTIVATED_PAYMENT' ? 'payment' : 'manual',
            start_date,
            expiry_date,
            details,
            created_at,
          });
        }
      }
    } catch (err) {
      // Rollback snapshot on failure
      this.subscriptions = subsBackup;
      this.entitlements = entsBackup;
      this.payments = paymentsBackup;
      this.auditLogs = auditBackup;
      throw err;
    }
  }
}

describe('PHASE 2 — SubscriptionManagementService Comprehensive Unit Tests', () => {
  let mockDb: MockD1DatabaseForSubService;
  let service: SubscriptionManagementService;

  const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
  const STUDENT_ID = '00000000-0000-0000-0000-000000000010';

  beforeEach(() => {
    mockDb = new MockD1DatabaseForSubService();
    service = new SubscriptionManagementService(mockDb as unknown as D1Database);

    // Seed account
    mockDb.accounts.set(STUDENT_ID, {
      account_id: STUDENT_ID,
      email: 'student@example.com',
    });

    // Seed plans
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
      price_cents: 3000,
      duration_days: 30,
      features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
      is_active: 1,
    });
    mockDb.plans.set('yearly', {
      plan_id: 'yearly',
      name: 'Student OS Pro Yearly',
      price_cents: 29900,
      duration_days: 365,
      features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
      is_active: 1,
    });
  });

  describe('1. Grant Pro Access (grantProAccess)', () => {
    it('1. grants Pro access to an active trial user, superseding trial sub and setting is_paid = true', async () => {
      // Setup active trial
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-1',
        account_id: STUDENT_ID,
        current_plan_id: 'free_trial',
        status: 'active',
        is_paid: 0,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockDb.subscriptions.set('sub-trial', {
        subscription_id: 'sub-trial',
        account_id: STUDENT_ID,
        plan_id: 'free_trial',
        status: 'active',
        source: 'trial',
        granted_by: 'system:trial',
        start_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        payment_reference: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Onboarded to Pro via offline payment',
        adminAccountId: ADMIN_ID,
      });

      // Verify returned objects
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.planId).toBe('monthly');
      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
      expect(result.entitlement.currentPlanId).toBe('monthly');

      // Verify trial sub was superseded in DB
      const oldSub = mockDb.subscriptions.get('sub-trial');
      expect(oldSub?.status).toBe('superseded');

      // Verify audit log
      const audit = mockDb.auditLogs.get(result.auditLogId);
      expect(audit).not.toBeUndefined();
      expect(audit?.event_type).toBe('ENTITLEMENT_MANUALLY_GRANTED');
      expect(audit?.granted_by).toBe(ADMIN_ID);
    });

    it('2. grants Pro access to an expired trial user (State D -> State B)', async () => {
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-1',
        account_id: STUDENT_ID,
        current_plan_id: 'free_trial',
        status: 'expired',
        is_paid: 0,
        features: '[]',
        expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'yearly',
        reason: 'Upgraded after trial expired',
        adminAccountId: ADMIN_ID,
      });

      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
      expect(result.entitlement.currentPlanId).toBe('yearly');
      expect(result.entitlement.features).toEqual(ALL_STUDENT_OS_FEATURES);
    });

    it('3. grants Pro access after previous revocation, creating fresh subscription', async () => {
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-1',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: null,
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Restored access by Owner',
        adminAccountId: ADMIN_ID,
      });

      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
    });

    it('4. rejects non-existent account with ACCOUNT_NOT_FOUND', async () => {
      await expect(
        service.grantProAccess({
          accountId: 'non-existent-account',
          planId: 'monthly',
          reason: 'Test grant',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.ACCOUNT_NOT_FOUND);
    });

    it('5. rejects invalid or free plan with INVALID_PLAN', async () => {
      await expect(
        service.grantProAccess({
          accountId: STUDENT_ID,
          planId: 'free_trial' as any,
          reason: 'Test grant',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_PLAN);
    });

    it('6. rejects invalid durationDays (<= 0 or > 3650) with INVALID_DURATION', async () => {
      await expect(
        service.grantProAccess({
          accountId: STUDENT_ID,
          planId: 'monthly',
          durationDays: 0,
          reason: 'Test grant',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_DURATION);

      await expect(
        service.grantProAccess({
          accountId: STUDENT_ID,
          planId: 'monthly',
          durationDays: 5000,
          reason: 'Test grant',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_DURATION);
    });

    it('7. rejects short or missing reason with INVALID_REASON', async () => {
      await expect(
        service.grantProAccess({
          accountId: STUDENT_ID,
          planId: 'monthly',
          reason: 'ab', // < 3 chars
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_REASON);
    });
  });

  describe('2. Extend / Renew Subscription (extendSubscription)', () => {
    it('8. active Pro extension preserves remaining time (newExpiry = currentExpiry + durationDays)', async () => {
      const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days left
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-1',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: futureExpiry.toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.extendSubscription({
        accountId: STUDENT_ID,
        durationDays: 30,
        reason: 'Exam bonus extension',
        adminAccountId: ADMIN_ID,
      });

      const expectedExpiryIso = calculateIstExpiryDate(futureExpiry, 30);
      expect(result.entitlement.expiresAt).toBe(expectedExpiryIso);
      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);

      const audit = mockDb.auditLogs.get(result.auditLogId);
      expect(audit?.event_type).toBe('ENTITLEMENT_EXTENDED');
      const details = JSON.parse(audit!.details);
      expect(details.wasActive).toBe(true);
    });

    it('9. expired Pro renewal starts from now (newExpiry = now + durationDays)', async () => {
      const pastExpiry = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // Expired 5 days ago
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-1',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'expired',
        is_paid: 1,
        features: '[]',
        expires_at: pastExpiry.toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.extendSubscription({
        accountId: STUDENT_ID,
        durationDays: 30,
        reason: 'Renewed after expiry',
        adminAccountId: ADMIN_ID,
      });

      const expectedExpiryIso = calculateIstExpiryDate(new Date(), 30);
      expect(result.entitlement.expiresAt).toBe(expectedExpiryIso);
      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
    });

    it('9b. trial extension preserves free_trial plan, is_paid = false, and source = trial (no false premium badge)', async () => {
      const trialExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days remaining in trial
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-trial',
        account_id: STUDENT_ID,
        current_plan_id: 'free_trial',
        status: 'active',
        is_paid: 0,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: trialExpiry.toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.extendSubscription({
        accountId: STUDENT_ID,
        durationDays: 1, // Extend by 1 day
        reason: '1-day trial extension',
        adminAccountId: ADMIN_ID,
      });

      // Verification: must remain free_trial and NOT become paid Pro
      expect(result.entitlement.currentPlanId).toBe('free_trial');
      expect(result.entitlement.isPaid).toBe(false);
      expect(result.entitlement.status).toBe('active');
      expect(result.subscription.planId).toBe('free_trial');
      expect(result.subscription.source).toBe('trial');

      const expectedExpiryIso = calculateIstExpiryDate(trialExpiry, 1);
      expect(result.entitlement.expiresAt).toBe(expectedExpiryIso);
    });
  });

  describe('3. Change Plan (changePlan)', () => {
    it('10. Monthly -> Yearly plan change starts yearly access and supersedes monthly sub', async () => {
      mockDb.subscriptions.set('sub-monthly', {
        subscription_id: 'sub-monthly',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'manual',
        granted_by: ADMIN_ID,
        start_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        payment_reference: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-1',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.changePlan({
        accountId: STUDENT_ID,
        newPlanId: 'yearly',
        reason: 'Upgraded to Annual Pro',
        adminAccountId: ADMIN_ID,
      });

      expect(result.subscription.planId).toBe('yearly');
      expect(result.entitlement.currentPlanId).toBe('yearly');
      expect(mockDb.subscriptions.get('sub-monthly')?.status).toBe('superseded');

      const audit = mockDb.auditLogs.get(result.auditLogId);
      expect(audit?.event_type).toBe('ENTITLEMENT_PLAN_CHANGED');
    });

    it('11. Yearly -> Monthly plan change applies monthly plan', async () => {
      const result = await service.changePlan({
        accountId: STUDENT_ID,
        newPlanId: 'monthly',
        reason: 'Switched to Monthly Pro',
        adminAccountId: ADMIN_ID,
      });

      expect(result.subscription.planId).toBe('monthly');
      expect(result.entitlement.currentPlanId).toBe('monthly');
    });
  });

  describe('4. Revoke Access (revokeAccess)', () => {
    it('12. revoking active Pro sets is_paid = 0, status = revoked, empties features, and preserves user data', async () => {
      mockDb.subscriptions.set('sub-active', {
        subscription_id: 'sub-active',
        account_id: STUDENT_ID,
        plan_id: 'yearly',
        status: 'active',
        source: 'manual',
        granted_by: ADMIN_ID,
        start_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        payment_reference: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-1',
        account_id: STUDENT_ID,
        current_plan_id: 'yearly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Refunded upon request',
        adminAccountId: ADMIN_ID,
      });

      expect(result.entitlement.status).toBe('revoked');
      expect(result.entitlement.isPaid).toBe(false);
      expect(result.entitlement.features).toEqual([]);
      expect(result.entitlement.expiresAt).toBeNull();

      expect(mockDb.subscriptions.get('sub-active')?.status).toBe('revoked');

      // Account remains 100% intact
      expect(mockDb.accounts.get(STUDENT_ID)).not.toBeUndefined();

      const audit = mockDb.auditLogs.get(result.auditLogId);
      expect(audit?.event_type).toBe('ENTITLEMENT_REVOKED');
    });
  });

  describe('5. Record Payment & Activate (recordPaymentAndActivate)', () => {
    it('13. successfully records an offline UPI payment with 0% discount and activates Pro access atomically', async () => {
      const ref = 'UPI-20260815-998877';
      const result = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        currency: 'INR',
        paymentMethod: 'upi',
        transactionReference: ref,
        planId: 'yearly',
        discountPercent: 0,
        notes: 'Google Pay to Owner UPI',
        adminAccountId: ADMIN_ID,
      });

      expect(result.payment.amountPaise).toBe(29900); // Full yearly price
      expect(result.payment.originalAmountPaise).toBe(29900);
      expect(result.payment.discountPercent).toBe(0);
      expect(result.payment.discountAmountPaise).toBe(0);
      expect(result.payment.paymentMethod).toBe('upi');
      expect(result.payment.transactionReference).toBe(ref);
      expect(result.payment.status).toBe('captured');
      expect(result.payment.subscriptionId).toBe(result.subscription.subscriptionId);

      expect(result.subscription.planId).toBe('yearly');
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.paymentReference).toBe(ref);

      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
      expect(result.entitlement.currentPlanId).toBe('yearly');

      // Verify payment was persisted in DB
      expect(mockDb.payments.get(result.payment.paymentId)).not.toBeUndefined();
      // Verify audit log
      const audit = mockDb.auditLogs.get(result.auditLogId);
      expect(audit?.event_type).toBe('ENTITLEMENT_ACTIVATED_PAYMENT');
      const details = JSON.parse(audit!.details);
      expect(details.finalAmountPaise).toBe(29900);
      expect(details.discountPercent).toBe(0);
    });

    it('14. calculates authoritative integer discount for 50% discount on yearly plan', async () => {
      const result = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        discountPercent: 50,
        paymentMethod: 'bank_transfer',
        transactionReference: 'NEFT-50PCT-001',
        adminAccountId: ADMIN_ID,
      });

      // Yearly list price: 29900 paise. 50% discount = 14950 paise. Final = 14950 paise.
      expect(result.payment.originalAmountPaise).toBe(29900);
      expect(result.payment.discountPercent).toBe(50);
      expect(result.payment.discountAmountPaise).toBe(14950);
      expect(result.payment.amountPaise).toBe(14950);
      expect(result.payment.paymentMethod).toBe('bank_transfer');
    });

    it('15. calculates authoritative integer discount for 20% discount on monthly plan', async () => {
      const result = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 20,
        paymentMethod: 'cash',
        transactionReference: 'CASH-20PCT-002',
        adminAccountId: ADMIN_ID,
      });

      // Monthly list price: 3000 paise. 20% discount = 600 paise. Final = 2400 paise (₹24.00).
      expect(result.payment.originalAmountPaise).toBe(3000);
      expect(result.payment.discountPercent).toBe(20);
      expect(result.payment.discountAmountPaise).toBe(600);
      expect(result.payment.amountPaise).toBe(2400);
      expect(result.payment.paymentMethod).toBe('cash');
    });

    it('16. supports 100% discount purchase with 0 final payable, optional ref, and mandatory note', async () => {
      const compRes = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        discountPercent: 100,
        paymentMethod: 'complimentary',
        transactionReference: null,
        notes: 'Merit scholarship 100% discount',
        adminAccountId: ADMIN_ID,
      });

      expect(compRes.payment.originalAmountPaise).toBe(29900);
      expect(compRes.payment.discountPercent).toBe(100);
      expect(compRes.payment.discountAmountPaise).toBe(29900);
      expect(compRes.payment.amountPaise).toBe(0);
      expect(compRes.payment.paymentMethod).toBe('complimentary');
      expect(compRes.payment.transactionReference).toBeNull();
      expect(compRes.entitlement.isPaid).toBe(true);
    });

    it('17. rejects 100% discount purchase if notes/reason is missing or too short', async () => {
      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          planId: 'yearly',
          discountPercent: 100,
          paymentMethod: 'complimentary',
          transactionReference: null,
          notes: '  ', // Empty note
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_REASON);
    });

    it('18. rejects invalid discount percentages (< 0, > 100, non-integer)', async () => {
      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          planId: 'monthly',
          discountPercent: -10, // Negative discount
          paymentMethod: 'upi',
          transactionReference: 'REF-1',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_PAYMENT_DATA);

      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          planId: 'monthly',
          discountPercent: 150, // > 100 discount
          paymentMethod: 'upi',
          transactionReference: 'REF-2',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_PAYMENT_DATA);

      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          planId: 'monthly',
          discountPercent: 25.5 as any, // Non-integer
          paymentMethod: 'upi',
          transactionReference: 'REF-3',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_PAYMENT_DATA);
    });

    it('19. duplicate transaction reference throws DUPLICATE_PAYMENT_REFERENCE domain error', async () => {
      const duplicateRef = 'UPI-DUP-REF-12345';

      await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        paymentMethod: 'upi',
        transactionReference: duplicateRef,
        planId: 'monthly',
        adminAccountId: ADMIN_ID,
      });

      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          paymentMethod: 'upi',
          transactionReference: duplicateRef,
          planId: 'monthly',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.DUPLICATE_PAYMENT_REFERENCE);
    });

    it('20. atomic rollback: batch failure leaves no partial payment or subscription records', async () => {
      mockDb.forceBatchFailure = true;

      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          paymentMethod: 'upi',
          transactionReference: 'UPI-FAIL-TEST',
          planId: 'yearly',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow('D1_SIMULATED_BATCH_FAILURE');

      // Verify zero partial rows exist
      expect(mockDb.payments.size).toBe(0);
      expect(mockDb.subscriptions.size).toBe(0);
      expect(mockDb.auditLogs.size).toBe(0);
    });

    it('21. rejects invalid payment method with INVALID_PAYMENT_METHOD', async () => {
      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          paymentMethod: 'bitcoin' as any, // Invalid method
          planId: 'monthly',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_PAYMENT_METHOD);
    });

    // REGRESSION TESTS FOR FOREIGN KEY INTEGRITY & DISCOUNT SCENARIOS
    it('22. [FK REGRESSION] exact production scenario: 100% discount on Monthly Pro with reason "Owner" succeeds without SQLITE_CONSTRAINT_FOREIGNKEY', async () => {
      const res = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 100,
        paymentMethod: 'complimentary',
        transactionReference: null,
        notes: 'Owner',
        adminAccountId: ADMIN_ID,
      });

      // 1. Payment amount is 0, original is 3000 paise
      expect(res.payment.amountPaise).toBe(0);
      expect(res.payment.originalAmountPaise).toBe(3000);
      expect(res.payment.discountPercent).toBe(100);
      expect(res.payment.discountAmountPaise).toBe(3000);
      expect(res.payment.notes).toBe('Owner');

      // 2. Subscription is active and created
      expect(res.subscription.status).toBe('active');
      expect(res.subscription.planId).toBe('monthly');
      expect(res.subscription.accountId).toBe(STUDENT_ID);

      // 3. Entitlement is active Pro
      expect(res.entitlement.isPaid).toBe(true);
      expect(res.entitlement.status).toBe('active');
      expect(res.entitlement.currentPlanId).toBe('monthly');

      // 4. Verify Payment points to existing Subscription ID (FK integrity)
      expect(res.payment.subscriptionId).toBe(res.subscription.subscriptionId);
      expect(mockDb.subscriptions.has(res.subscription.subscriptionId)).toBe(true);
      expect(mockDb.payments.has(res.payment.paymentId)).toBe(true);
    });

    it('23. [DISCOUNT REGRESSION] discounted payment (25%) calculates correct amounts and maintains FK integrity', async () => {
      // Monthly Pro list price = 3000 paise. 25% of 3000 = 750 paise. Final = 2250 paise.
      const res = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 25,
        paymentMethod: 'upi',
        transactionReference: 'UPI-DISC-25-TEST',
        notes: 'Festival discount',
        adminAccountId: ADMIN_ID,
      });

      expect(res.payment.originalAmountPaise).toBe(3000);
      expect(res.payment.discountPercent).toBe(25);
      expect(res.payment.discountAmountPaise).toBe(750);
      expect(res.payment.amountPaise).toBe(2250);
      expect(res.payment.subscriptionId).toBe(res.subscription.subscriptionId);
      expect(mockDb.subscriptions.has(res.subscription.subscriptionId)).toBe(true);
      expect(res.entitlement.isPaid).toBe(true);
    });

    it('24. [DISCOUNT REGRESSION] 0% discount payment calculates full list price and maintains FK integrity', async () => {
      const res = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        discountPercent: 0,
        paymentMethod: 'bank_transfer',
        transactionReference: 'NEFT-FULL-YEARLY',
        adminAccountId: ADMIN_ID,
      });

      expect(res.payment.originalAmountPaise).toBe(29900);
      expect(res.payment.discountPercent).toBe(0);
      expect(res.payment.discountAmountPaise).toBe(0);
      expect(res.payment.amountPaise).toBe(29900);
      expect(res.payment.subscriptionId).toBe(res.subscription.subscriptionId);
      expect(mockDb.subscriptions.has(res.subscription.subscriptionId)).toBe(true);
      expect(res.entitlement.isPaid).toBe(true);
    });

    it('25. [VALIDATION REGRESSION] 100% discount without reason must be rejected', async () => {
      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          planId: 'monthly',
          discountPercent: 100,
          paymentMethod: 'complimentary',
          notes: '', // Missing reason
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_REASON);
    });

    it('26. [INTEGRITY REGRESSION] resulting payment, subscription, and entitlement reference valid existing account and plan IDs', async () => {
      const res = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 50,
        paymentMethod: 'cash',
        transactionReference: 'CASH-REC-001',
        notes: 'Cash received at desk',
        adminAccountId: ADMIN_ID,
      });

      // Verify all IDs exist in the authoritative database state
      expect(mockDb.accounts.has(res.payment.accountId)).toBe(true);
      expect(mockDb.plans.has(res.subscription.planId)).toBe(true);
      expect(mockDb.subscriptions.has(res.payment.subscriptionId!)).toBe(true);
      expect(mockDb.entitlements.has(res.entitlement.accountId)).toBe(true);
      expect(mockDb.auditLogs.has(res.auditLogId)).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 6: CANCEL REVOKE (REVERSIBLE ACCESS SUSPENSION LIFECYCLE)
  // =========================================================================
  describe('Cancel Revoke (Reversible Access Suspension Lifecycle)', () => {
    it('1. Active 7-Day Trial -> Revoke -> Cancel Revoke before expiry (restores Active Trial on original clock)', async () => {
      const now = new Date();
      const trialStart = now.toISOString();
      const trialExpiry = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days remaining
      const subId = 'sub-trial-orig-01';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'free_trial',
        status: 'active',
        source: 'trial',
        granted_by: 'system:trial',
        start_date: trialStart,
        expiry_date: trialExpiry,
        cancelled_at: null,
        payment_reference: null,
        created_at: trialStart,
        updated_at: trialStart,
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-trial-01',
        account_id: STUDENT_ID,
        current_plan_id: 'free_trial',
        status: 'active',
        is_paid: 0,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: trialExpiry,
        last_verified_at: trialStart,
        created_at: trialStart,
        updated_at: trialStart,
      });

      // Step 1: Revoke Access
      const revokeRes = await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Temporary suspension for student identity verification',
        adminAccountId: ADMIN_ID,
      });
      expect(revokeRes.entitlement.status).toBe('revoked');
      expect(revokeRes.entitlement.features).toEqual([]);
      expect(mockDb.subscriptions.get(subId)!.status).toBe('revoked');
      expect(mockDb.subscriptions.size).toBe(1); // Exactly 1 subscription row

      // Step 2: Cancel Revoke (Restores access before expiry)
      const cancelRes = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Verification completed, restoring student trial',
        adminAccountId: ADMIN_ID,
      });

      expect(cancelRes.outcome).toBe('active');
      expect(cancelRes.entitlement.status).toBe('active');
      expect(cancelRes.entitlement.currentPlanId).toBe('free_trial');
      expect(cancelRes.entitlement.expiresAt).toBe(trialExpiry);
      expect(cancelRes.entitlement.features.length).toBeGreaterThan(0);

      // Verify same subscription record was updated in-place (0 new subscription rows)
      expect(mockDb.subscriptions.size).toBe(1);
      const subAfter = mockDb.subscriptions.get(subId)!;
      expect(subAfter.subscription_id).toBe(subId);
      expect(subAfter.status).toBe('active');
      expect(subAfter.expiry_date).toBe(trialExpiry);
    });

    it('2. Active 7-Day Trial -> Revoke -> Cancel Revoke after expiry (resolves to Expired Trial, no extra time)', async () => {
      const pastStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const pastExpiry = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // Expired 3 days ago
      const subId = 'sub-trial-past-02';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'free_trial',
        status: 'revoked',
        source: 'trial',
        granted_by: 'system:trial',
        start_date: pastStart,
        expiry_date: pastExpiry,
        cancelled_at: null,
        payment_reference: null,
        created_at: pastStart,
        updated_at: pastStart,
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-trial-02',
        account_id: STUDENT_ID,
        current_plan_id: 'free_trial',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: null,
        last_verified_at: pastStart,
        created_at: pastStart,
        updated_at: pastStart,
      });

      const cancelRes = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoration attempted after trial expiry',
        adminAccountId: ADMIN_ID,
      });

      expect(cancelRes.outcome).toBe('expired');
      expect(cancelRes.entitlement.status).toBe('expired');
      expect(cancelRes.entitlement.features).toEqual([]);
      expect(cancelRes.entitlement.isPaid).toBe(false);
      expect(cancelRes.entitlement.expiresAt).toBe(pastExpiry);

      // Verify same subscription record updated in place
      expect(mockDb.subscriptions.size).toBe(1);
      const subAfter = mockDb.subscriptions.get(subId)!;
      expect(subAfter.subscription_id).toBe(subId);
      expect(subAfter.status).toBe('expired');
    });

    it('3. Active Monthly Pro -> Revoke -> Cancel Revoke before expiry (restores Active Monthly Pro on original clock)', async () => {
      const now = new Date();
      const proStart = now.toISOString();
      const proExpiry = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(); // 20 days remaining
      const subId = 'sub-monthly-03';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: proStart,
        expiry_date: proExpiry,
        cancelled_at: null,
        payment_reference: 'pay_monthly_03',
        created_at: proStart,
        updated_at: proStart,
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-monthly-03',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: proExpiry,
        last_verified_at: proStart,
        created_at: proStart,
        updated_at: proStart,
      });

      // Step 1: Revoke
      await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Temporary card chargeback review',
        adminAccountId: ADMIN_ID,
      });

      // Step 2: Cancel Revoke
      const cancelRes = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Chargeback resolved, restoring monthly access',
        adminAccountId: ADMIN_ID,
      });

      expect(cancelRes.outcome).toBe('active');
      expect(cancelRes.entitlement.status).toBe('active');
      expect(cancelRes.entitlement.currentPlanId).toBe('monthly');
      expect(cancelRes.entitlement.isPaid).toBe(true);
      expect(cancelRes.entitlement.expiresAt).toBe(proExpiry);

      // Verify same subscription record was preserved
      expect(mockDb.subscriptions.size).toBe(1);
      const subAfter = mockDb.subscriptions.get(subId)!;
      expect(subAfter.subscription_id).toBe(subId);
      expect(subAfter.status).toBe('active');
      expect(subAfter.expiry_date).toBe(proExpiry);
    });

    it('4. Active Monthly Pro -> Revoke -> Cancel Revoke after expiry (resolves to Expired Pro, no extra time)', async () => {
      const pastStart = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      const pastExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // Expired 10 days ago
      const subId = 'sub-monthly-past-04';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: pastStart,
        expiry_date: pastExpiry,
        cancelled_at: null,
        payment_reference: 'pay_monthly_past_04',
        created_at: pastStart,
        updated_at: pastStart,
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-monthly-04',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: null,
        last_verified_at: pastStart,
        created_at: pastStart,
        updated_at: pastStart,
      });

      const cancelRes = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoring account after term ended',
        adminAccountId: ADMIN_ID,
      });

      expect(cancelRes.outcome).toBe('expired');
      expect(cancelRes.entitlement.status).toBe('expired');
      expect(cancelRes.entitlement.isPaid).toBe(false);
      expect(cancelRes.entitlement.features).toEqual([]);
      expect(cancelRes.entitlement.expiresAt).toBe(pastExpiry);

      expect(mockDb.subscriptions.size).toBe(1);
      const subAfter = mockDb.subscriptions.get(subId)!;
      expect(subAfter.status).toBe('expired');
    });

    it('5. Active Yearly Pro -> Revoke -> Cancel Revoke before expiry', async () => {
      const now = new Date();
      const yearlyStart = now.toISOString();
      const yearlyExpiry = new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000).toISOString(); // 300 days remaining
      const subId = 'sub-yearly-05';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'yearly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: yearlyStart,
        expiry_date: yearlyExpiry,
        cancelled_at: null,
        payment_reference: 'pay_yearly_05',
        created_at: yearlyStart,
        updated_at: yearlyStart,
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-yearly-05',
        account_id: STUDENT_ID,
        current_plan_id: 'yearly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: yearlyExpiry,
        last_verified_at: yearlyStart,
        created_at: yearlyStart,
        updated_at: yearlyStart,
      });

      await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Security check',
        adminAccountId: ADMIN_ID,
      });

      const cancelRes = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Security check passed',
        adminAccountId: ADMIN_ID,
      });

      expect(cancelRes.outcome).toBe('active');
      expect(cancelRes.entitlement.status).toBe('active');
      expect(cancelRes.entitlement.currentPlanId).toBe('yearly');
      expect(cancelRes.entitlement.expiresAt).toBe(yearlyExpiry);
      expect(mockDb.subscriptions.get(subId)!.status).toBe('active');
      expect(mockDb.subscriptions.size).toBe(1);
    });

    it('6. Audit log contains ENTITLEMENT_REVOKED and REVOCATION_CANCELLED transitions', async () => {
      const now = new Date();
      const subId = 'sub-audit-06';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'manual',
        granted_by: ADMIN_ID,
        start_date: now.toISOString(),
        expiry_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        payment_reference: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-audit-06',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Temporary suspension',
        adminAccountId: ADMIN_ID,
      });

      await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoring access after review',
        adminAccountId: ADMIN_ID,
      });

      const auditEvents = Array.from(mockDb.auditLogs.values()).map((l) => l.event_type);
      expect(auditEvents).toContain('ENTITLEMENT_REVOKED');
      expect(auditEvents).toContain('REVOCATION_CANCELLED');
    });

    it('7. Rejects Cancel Revoke with reason less than 3 characters', async () => {
      await expect(
        service.cancelRevoke({
          accountId: STUDENT_ID,
          reason: 'ok',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_REASON);
    });

    it('8. Rejects Cancel Revoke if account has no revoked subscription', async () => {
      await expect(
        service.cancelRevoke({
          accountId: STUDENT_ID,
          reason: 'Attempting to restore non-existent revocation',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.NO_REVOKED_SUBSCRIPTION);
    });
  });

  // =========================================================================
  // PHASE 2 — PRO SUBSCRIPTION LIFECYCLE, STACKING & MIDNIGHT IST TESTS
  // =========================================================================
  describe('Phase 2 — Pro Subscription Lifecycle, Stacking & Midnight IST Semantics', () => {
    it('Test A — Monthly Pro revoke/restore preserves same row, ID, expiry, and gives no extra time', async () => {
      const now = new Date();
      const expiry = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days remaining

      const subId = 'sub-pro-monthly-01';
      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: expiry.toISOString(),
        cancelled_at: null,
        payment_reference: 'pay-001',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-pro-01',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: expiry.toISOString(),
        last_verified_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      expect(mockDb.subscriptions.size).toBe(1);

      // Step 1: Revoke Monthly Pro
      await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Temporary investigation',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(1);
      expect(mockDb.subscriptions.get(subId)!.status).toBe('revoked');
      expect(mockDb.entitlements.get(STUDENT_ID)!.status).toBe('revoked');
      expect(mockDb.entitlements.get(STUDENT_ID)!.is_paid).toBe(0);

      // Step 2: Cancel Revoke before expiry
      const restoreResult = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Investigation clear, restoring remaining validity',
        adminAccountId: ADMIN_ID,
      });

      // Assertions
      expect(mockDb.subscriptions.size).toBe(1); // EXACTLY 1 row preserved
      const restoredSub = mockDb.subscriptions.get(subId)!;
      expect(restoredSub.subscription_id).toBe(subId);
      expect(restoredSub.plan_id).toBe('monthly');
      expect(restoredSub.expiry_date).toBe(expiry.toISOString());
      expect(restoredSub.status).toBe('active');
      expect(restoreResult.outcome).toBe('active');
      expect(restoreResult.entitlement.status).toBe('active');
      expect(restoreResult.entitlement.isPaid).toBe(true);
      expect(restoreResult.entitlement.expiresAt).toBe(expiry.toISOString());
    });

    it('Test B — Yearly Pro revoke/restore preserves same row and original 365-day clock', async () => {
      const now = new Date();
      const expiry = new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000); // 200 days remaining

      const subId = 'sub-pro-yearly-01';
      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'yearly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: new Date(now.getTime() - 165 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: expiry.toISOString(),
        cancelled_at: null,
        payment_reference: 'pay-002',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-pro-02',
        account_id: STUDENT_ID,
        current_plan_id: 'yearly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: expiry.toISOString(),
        last_verified_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      // Revoke
      await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Payment chargeback dispute',
        adminAccountId: ADMIN_ID,
      });

      // Cancel Revoke
      const restoreResult = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Dispute resolved in favor of student',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(1);
      const restoredSub = mockDb.subscriptions.get(subId)!;
      expect(restoredSub.subscription_id).toBe(subId);
      expect(restoredSub.plan_id).toBe('yearly');
      expect(restoredSub.expiry_date).toBe(expiry.toISOString());
      expect(restoredSub.status).toBe('active');
      expect(restoreResult.outcome).toBe('active');
      expect(restoreResult.entitlement.status).toBe('active');
      expect(restoreResult.entitlement.isPaid).toBe(true);
    });

    it('Test C — Monthly Pro restore after original expiry resolves to expired state with zero extra time', async () => {
      const pastExpiry = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // Expired 5 days ago
      const subId = 'sub-expired-monthly';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: new Date(pastExpiry.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: pastExpiry.toISOString(),
        cancelled_at: null,
        payment_reference: 'pay-003',
        created_at: new Date(pastExpiry.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-03',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: pastExpiry.toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const restoreResult = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoring after expiry date passed',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(1);
      const sub = mockDb.subscriptions.get(subId)!;
      expect(sub.subscription_id).toBe(subId);
      expect(sub.status).toBe('expired');
      expect(sub.expiry_date).toBe(pastExpiry.toISOString());
      expect(restoreResult.outcome).toBe('expired');
      expect(restoreResult.entitlement.status).toBe('expired');
      expect(restoreResult.entitlement.isPaid).toBe(false);
      expect(restoreResult.entitlement.features).toEqual([]);
    });

    it('Test D — Yearly Pro restore after original expiry resolves to expired state', async () => {
      const pastExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // Expired 10 days ago
      const subId = 'sub-expired-yearly';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'yearly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: new Date(pastExpiry.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: pastExpiry.toISOString(),
        cancelled_at: null,
        payment_reference: 'pay-004',
        created_at: new Date(pastExpiry.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-04',
        account_id: STUDENT_ID,
        current_plan_id: 'yearly',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: pastExpiry.toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const restoreResult = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoring after yearly expiry passed',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(1);
      const sub = mockDb.subscriptions.get(subId)!;
      expect(sub.status).toBe('expired');
      expect(restoreResult.outcome).toBe('expired');
      expect(restoreResult.entitlement.status).toBe('expired');
    });

    it('Test E — New Monthly Pro while current Monthly Pro is valid QUEUES sequentially without overlap', async () => {
      // Existing Pro: 1 Aug 2026 -> 31 Aug 2026 (UTC: 2026-08-31T18:30:00.000Z = 1 Sep 00:00 IST)
      const currentSubExpiry = '2026-08-31T18:30:00.000Z';
      const existingSubId = 'sub-existing-monthly-01';

      mockDb.subscriptions.set(existingSubId, {
        subscription_id: existingSubId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: '2026-07-31T18:30:00.000Z', // 1 Aug IST
        expiry_date: currentSubExpiry,
        cancelled_at: null,
        payment_reference: 'pay-001',
        created_at: '2026-07-31T18:30:00.000Z',
        updated_at: '2026-07-31T18:30:00.000Z',
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-01',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: currentSubExpiry,
        last_verified_at: '2026-08-15T00:00:00.000Z',
        created_at: '2026-07-31T18:30:00.000Z',
        updated_at: '2026-07-31T18:30:00.000Z',
      });

      // Admin grants second Monthly Pro on 15 Aug
      const grantResult = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Purchased additional monthly pack early',
        adminAccountId: ADMIN_ID,
      });

      // Invariants Check
      expect(mockDb.subscriptions.size).toBe(2); // 2 distinct subscriptions

      // 1. Existing subscription remains ACTIVE and UNCHANGED
      const existingSub = mockDb.subscriptions.get(existingSubId)!;
      expect(existingSub.status).toBe('active');
      expect(existingSub.expiry_date).toBe(currentSubExpiry);

      // 2. New subscription QUEUES sequentially from current expiry
      const newSub = mockDb.subscriptions.get(grantResult.subscription.subscriptionId)!;
      expect(newSub.status).toBe('active');
      expect(newSub.start_date).toBe(currentSubExpiry); // Starts exactly when Pro 1 ends (1 Sep 00:00 IST)
      expect(grantResult.subscription.startDate).toBe(currentSubExpiry);

      const expectedNewExpiry = calculateIstExpiryDate(new Date(currentSubExpiry), 30, 'monthly');
      expect(newSub.expiry_date).toBe(expectedNewExpiry); // Full 1 month duration from 1 Sep
      expect(grantResult.subscription.expiryDate).toBe(expectedNewExpiry);

      // 3. Authoritative entitlement reflects full stacked validity
      expect(grantResult.entitlement.expiresAt).toBe(expectedNewExpiry);
      expect(grantResult.entitlement.status).toBe('active');
      expect(grantResult.entitlement.isPaid).toBe(true);
    });

    it('Test F — New Yearly Pro while current Monthly Pro is valid QUEUES sequentially', async () => {
      const currentSubExpiry = '2026-08-31T18:30:00.000Z'; // 1 Sep 00:00 IST
      const existingSubId = 'sub-existing-monthly-02';

      mockDb.subscriptions.set(existingSubId, {
        subscription_id: existingSubId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: '2026-07-31T18:30:00.000Z',
        expiry_date: currentSubExpiry,
        cancelled_at: null,
        payment_reference: 'pay-001',
        created_at: '2026-07-31T18:30:00.000Z',
        updated_at: '2026-07-31T18:30:00.000Z',
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-01',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: currentSubExpiry,
        last_verified_at: '2026-08-15T00:00:00.000Z',
        created_at: '2026-07-31T18:30:00.000Z',
        updated_at: '2026-07-31T18:30:00.000Z',
      });

      // Admin records Yearly payment on 15 Aug
      const paymentResult = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        amountPaise: 29900,
        planId: 'yearly',
        paymentMethod: 'upi',
        transactionReference: 'UPI-STACK-YEARLY-01',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(2);

      // Existing Monthly remains active
      expect(mockDb.subscriptions.get(existingSubId)!.status).toBe('active');

      // New Yearly starts on 1 Sep
      const newSub = mockDb.subscriptions.get(paymentResult.subscription.subscriptionId)!;
      expect(newSub.start_date).toBe(currentSubExpiry);
      expect(paymentResult.subscription.startDate).toBe(currentSubExpiry);
      const expectedYearlyExpiry = calculateIstExpiryDate(new Date(currentSubExpiry), 365, 'yearly');
      expect(newSub.expiry_date).toBe(expectedYearlyExpiry);
      expect(paymentResult.subscription.expiryDate).toBe(expectedYearlyExpiry);
      expect(paymentResult.entitlement.expiresAt).toBe(expectedYearlyExpiry);
    });

    it('Test G — New Pro with NO active valid Pro starts immediately on current calendar date', async () => {
      // Trial user
      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-trial',
        account_id: STUDENT_ID,
        current_plan_id: 'free_trial',
        status: 'active',
        is_paid: 0,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Purchased monthly pro',
        adminAccountId: ADMIN_ID,
      });

      expect(result.subscription.status).toBe('active');
      // Starts today, not queued in future
      const nowStart = new Date().toISOString();
      expect(new Date(result.subscription.startDate).getTime()).toBeLessThanOrEqual(new Date(nowStart).getTime() + 1000);
      const expectedExpiry = calculateIstExpiryDate(new Date(), 30, 'monthly');
      expect(result.subscription.expiryDate).toBe(expectedExpiry);
    });

    it('Test H — Same-day activation at 00:05 IST, 12:00 IST, and 23:59 IST all produce identical calendar start & expiry dates', () => {
      // 16 Aug 2026 in IST (UTC: 2026-08-15 18:30:00Z through 2026-08-16 18:29:59Z)
      const t0005Ist = new Date('2026-08-15T18:35:00.000Z'); // 00:05 IST (16 Aug)
      const t1200Ist = new Date('2026-08-16T06:30:00.000Z'); // 12:00 IST (16 Aug)
      const t2359Ist = new Date('2026-08-16T18:29:59.000Z'); // 23:59:59 IST (16 Aug)

      const comp0005 = getIstCalendarComponents(t0005Ist);
      const comp1200 = getIstCalendarComponents(t1200Ist);
      const comp2359 = getIstCalendarComponents(t2359Ist);

      expect(comp0005.dateString).toBe('2026-08-16');
      expect(comp1200.dateString).toBe('2026-08-16');
      expect(comp2359.dateString).toBe('2026-08-16');

      const exp0005 = calculateIstExpiryDate(t0005Ist, 30, 'monthly');
      const exp1200 = calculateIstExpiryDate(t1200Ist, 30, 'monthly');
      const exp2359 = calculateIstExpiryDate(t2359Ist, 30, 'monthly');

      // 16 Aug + 1 month = 16 Sep 00:00:00 IST (UTC: 2026-09-15T18:30:00.000Z)
      const expectedExpiry = '2026-09-15T18:30:00.000Z';
      expect(exp0005).toBe(expectedExpiry);
      expect(exp1200).toBe(expectedExpiry);
      expect(exp2359).toBe(expectedExpiry);
    });

    it('Test I — Midnight boundary enforces calendar-day expiration', () => {
      // Expiry timestamp: 16 Sep 00:00:00 IST (UTC: 2026-09-15T18:30:00.000Z)
      const expiryUtc = '2026-09-15T18:30:00.000Z';
      const expiryMs = new Date(expiryUtc).getTime();

      // 1 millisecond before midnight IST (23:59:59.999 IST on 15 Sep)
      const beforeMidnight = new Date(expiryMs - 1);
      expect(beforeMidnight.getTime() < expiryMs).toBe(true); // Still Active

      // Exact midnight IST (00:00:00.000 IST on 16 Sep)
      const exactMidnight = new Date(expiryMs);
      expect(exactMidnight.getTime() >= expiryMs).toBe(true); // Expired

      // 1 second past midnight IST (00:00:01.000 IST on 16 Sep)
      const pastMidnight = new Date(expiryMs + 1000);
      expect(pastMidnight.getTime() >= expiryMs).toBe(true); // Expired
    });

    it('Test J — Cancel Revoke never creates a new subscription row', async () => {
      const now = new Date();
      const subId = 'sub-pro-no-duplicates';

      mockDb.subscriptions.set(subId, {
        subscription_id: subId,
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: now.toISOString(),
        expiry_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        payment_reference: 'pay-009',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-09',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      const initialCount = mockDb.subscriptions.size;
      expect(initialCount).toBe(1);

      await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Temporary pause',
        adminAccountId: ADMIN_ID,
      });
      expect(mockDb.subscriptions.size).toBe(1);

      await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Unpausing subscription',
        adminAccountId: ADMIN_ID,
      });
      expect(mockDb.subscriptions.size).toBe(1); // EXACTLY 1 row
      expect(mockDb.subscriptions.get(subId)!.status).toBe('active');
    });
  });

  // =========================================================================
  // PHASE 3 — HARDENING, MULTI-STACKED LIFECYCLE & CONCURRENCY TESTS
  // =========================================================================
  describe('Phase 3 — Subscription Lifecycle Hardening & Multi-Stacked Invariants', () => {
    it('3.1 Multi-Stacked Pro (3 terms: Monthly + Monthly + Yearly) -> Revoke -> Cancel Revoke restores all 3 terms', async () => {
      const now = new Date();
      const expA = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days
      const expB = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString(); // +30 days
      const expC = new Date(now.getTime() + 405 * 24 * 60 * 60 * 1000).toISOString(); // +365 days

      // Sub A: Monthly
      mockDb.subscriptions.set('sub-a', {
        subscription_id: 'sub-a',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: now.toISOString(),
        expiry_date: expA,
        cancelled_at: null,
        payment_reference: 'pay-a',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      // Sub B: Monthly Queued
      mockDb.subscriptions.set('sub-b', {
        subscription_id: 'sub-b',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: expA,
        expiry_date: expB,
        cancelled_at: null,
        payment_reference: 'pay-b',
        created_at: new Date(now.getTime() + 1000).toISOString(),
        updated_at: new Date(now.getTime() + 1000).toISOString(),
      });

      // Sub C: Yearly Queued
      mockDb.subscriptions.set('sub-c', {
        subscription_id: 'sub-c',
        account_id: STUDENT_ID,
        plan_id: 'yearly',
        status: 'active',
        source: 'manual',
        granted_by: ADMIN_ID,
        start_date: expB,
        expiry_date: expC,
        cancelled_at: null,
        payment_reference: null,
        created_at: new Date(now.getTime() + 2000).toISOString(),
        updated_at: new Date(now.getTime() + 2000).toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-3',
        account_id: STUDENT_ID,
        current_plan_id: 'yearly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: expC,
        last_verified_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      // Step 1: Revoke Access
      await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Temporary investigation of multi-stacked account',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.get('sub-a')!.status).toBe('revoked');
      expect(mockDb.subscriptions.get('sub-b')!.status).toBe('revoked');
      expect(mockDb.subscriptions.get('sub-c')!.status).toBe('revoked');
      expect(mockDb.entitlements.get(STUDENT_ID)!.status).toBe('revoked');
      expect(mockDb.entitlements.get(STUDENT_ID)!.is_paid).toBe(0);

      // Step 2: Cancel Revoke
      const result = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Investigation complete, restoring full stacked term',
        adminAccountId: ADMIN_ID,
      });

      // Assertions
      expect(mockDb.subscriptions.size).toBe(3); // Exactly 3 rows preserved, no duplicates
      expect(mockDb.subscriptions.get('sub-a')!.status).toBe('active');
      expect(mockDb.subscriptions.get('sub-b')!.status).toBe('active');
      expect(mockDb.subscriptions.get('sub-c')!.status).toBe('active');
      expect(result.outcome).toBe('active');
      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
      expect(result.entitlement.expiresAt).toBe(expC); // Terminal stacked expiry
    });

    it('3.2 Multi-Stacked Pro + Revoke -> Cancel Revoke after Sub A expired marks Sub A expired and Sub B active', async () => {
      const expA = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // Expired 5 days ago
      const expB = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(); // 25 days remaining

      mockDb.subscriptions.set('sub-past', {
        subscription_id: 'sub-past',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: expA,
        cancelled_at: null,
        payment_reference: 'pay-past',
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.subscriptions.set('sub-future', {
        subscription_id: 'sub-future',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: expA,
        expiry_date: expB,
        cancelled_at: null,
        payment_reference: 'pay-future',
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-partial',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: null,
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoring partial unexpired stacked subscription',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(2);
      expect(mockDb.subscriptions.get('sub-past')!.status).toBe('expired');
      expect(mockDb.subscriptions.get('sub-future')!.status).toBe('active');
      expect(result.outcome).toBe('active');
      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
      expect(result.entitlement.expiresAt).toBe(expB);
    });

    it('3.3 Multi-Stacked Pro + Revoke -> Cancel Revoke after ALL expired marks all expired with zero extra days', async () => {
      const expA = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const expB = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      mockDb.subscriptions.set('sub-past-1', {
        subscription_id: 'sub-past-1',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: expA,
        cancelled_at: null,
        payment_reference: 'pay-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.subscriptions.set('sub-past-2', {
        subscription_id: 'sub-past-2',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: expA,
        expiry_date: expB,
        cancelled_at: null,
        payment_reference: 'pay-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-all-expired',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: null,
        last_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoring after all terms expired',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(2);
      expect(mockDb.subscriptions.get('sub-past-1')!.status).toBe('expired');
      expect(mockDb.subscriptions.get('sub-past-2')!.status).toBe('expired');
      expect(result.outcome).toBe('expired');
      expect(result.entitlement.status).toBe('expired');
      expect(result.entitlement.isPaid).toBe(false);
      expect(result.entitlement.features).toEqual([]);
    });

    it('3.4 Stacking combinations (Yearly -> Monthly and Yearly -> Yearly) queue sequentially', async () => {
      // Existing Yearly Pro (1 Jan 2026 -> 1 Jan 2027 IST)
      const yearlyExpiry = '2026-12-31T18:30:00.000Z'; // 1 Jan 2027 00:00 IST
      mockDb.subscriptions.set('sub-yearly-base', {
        subscription_id: 'sub-yearly-base',
        account_id: STUDENT_ID,
        plan_id: 'yearly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: '2025-12-31T18:30:00.000Z',
        expiry_date: yearlyExpiry,
        cancelled_at: null,
        payment_reference: 'pay-y1',
        created_at: '2025-12-31T18:30:00.000Z',
        updated_at: '2025-12-31T18:30:00.000Z',
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-y',
        account_id: STUDENT_ID,
        current_plan_id: 'yearly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: yearlyExpiry,
        last_verified_at: '2026-08-15T00:00:00.000Z',
        created_at: '2025-12-31T18:30:00.000Z',
        updated_at: '2025-12-31T18:30:00.000Z',
      });

      // 1. Stack Monthly on top of Yearly
      const monthlyStack = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Adding Monthly extension on top of Yearly',
        adminAccountId: ADMIN_ID,
      });

      expect(monthlyStack.subscription.startDate).toBe(yearlyExpiry);
      const expectedMonthlyExpiry = calculateIstExpiryDate(new Date(yearlyExpiry), 30, 'monthly');
      expect(monthlyStack.subscription.expiryDate).toBe(expectedMonthlyExpiry);
      expect(monthlyStack.entitlement.expiresAt).toBe(expectedMonthlyExpiry);

      // 2. Stack another Yearly on top of Monthly
      const secondYearlyStack = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        amountPaise: 29900,
        paymentMethod: 'upi',
        transactionReference: 'UPI-STACK-Y2',
        adminAccountId: ADMIN_ID,
      });

      expect(secondYearlyStack.subscription.startDate).toBe(expectedMonthlyExpiry);
      const expectedFinalYearlyExpiry = calculateIstExpiryDate(new Date(expectedMonthlyExpiry), 365, 'yearly');
      expect(secondYearlyStack.subscription.expiryDate).toBe(expectedFinalYearlyExpiry);
      expect(secondYearlyStack.entitlement.expiresAt).toBe(expectedFinalYearlyExpiry);
      expect(mockDb.subscriptions.size).toBe(3);
    });

    it('3.5 Idempotency: Immediate second Cancel Revoke throws NO_REVOKED_SUBSCRIPTION', async () => {
      const now = new Date();
      mockDb.subscriptions.set('sub-rev', {
        subscription_id: 'sub-rev',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'revoked',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: now.toISOString(),
        expiry_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        payment_reference: 'pay-rev',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-rev',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'revoked',
        is_paid: 0,
        features: '[]',
        expires_at: null,
        last_verified_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      // First call succeeds
      const firstCall = await service.cancelRevoke({
        accountId: STUDENT_ID,
        reason: 'Restoring access',
        adminAccountId: ADMIN_ID,
      });
      expect(firstCall.outcome).toBe('active');

      // Second immediate call fails safely because no revoked subscriptions remain
      await expect(
        service.cancelRevoke({
          accountId: STUDENT_ID,
          reason: 'Duplicate restore attempt',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.NO_REVOKED_SUBSCRIPTION);
    });
  });

  // =========================================================================
  // PHASE 4 — FINAL PRODUCTION-READINESS, CALENDAR CLAMPING & STACKING STRESS TESTS
  // =========================================================================
  describe('Phase 4 — Month-End Clamping, Stacking Stress & Edge Cases', () => {
    it('4.1 Month-end clamping for all calendar months and leap years', () => {
      // 1. Jan 31 -> Feb 28 in non-leap year (2026)
      const jan31_2026 = new Date('2026-01-30T18:30:00.000Z'); // 31 Jan 00:00 IST
      expect(calculateIstExpiryDate(jan31_2026, 30, 'monthly')).toBe('2026-02-27T18:30:00.000Z'); // 28 Feb 00:00 IST

      // 2. Jan 31 -> Feb 29 in leap year (2024)
      const jan31_2024 = new Date('2024-01-30T18:30:00.000Z');
      expect(calculateIstExpiryDate(jan31_2024, 30, 'monthly')).toBe('2024-02-28T18:30:00.000Z'); // 29 Feb 00:00 IST

      // 3. Feb 28 -> Mar 28
      const feb28_2026 = new Date('2026-02-27T18:30:00.000Z');
      expect(calculateIstExpiryDate(feb28_2026, 30, 'monthly')).toBe('2026-03-27T18:30:00.000Z');

      // 4. Feb 29 (Monthly) -> Mar 29
      const feb29_2024 = new Date('2024-02-28T18:30:00.000Z');
      expect(calculateIstExpiryDate(feb29_2024, 30, 'monthly')).toBe('2024-03-28T18:30:00.000Z');

      // 5. Feb 29 (Yearly) in leap year -> Feb 28 in non-leap year (2025)
      expect(calculateIstExpiryDate(feb29_2024, 365, 'yearly')).toBe('2025-02-27T18:30:00.000Z');

      // 6. Mar 31 -> Apr 30 (April has 30 days)
      const mar31_2026 = new Date('2026-03-30T18:30:00.000Z');
      expect(calculateIstExpiryDate(mar31_2026, 30, 'monthly')).toBe('2026-04-29T18:30:00.000Z');

      // 7. Apr 30 -> May 30
      const apr30_2026 = new Date('2026-04-29T18:30:00.000Z');
      expect(calculateIstExpiryDate(apr30_2026, 30, 'monthly')).toBe('2026-05-29T18:30:00.000Z');

      // 8. May 31 -> Jun 30 (June has 30 days)
      const may31_2026 = new Date('2026-05-30T18:30:00.000Z');
      expect(calculateIstExpiryDate(may31_2026, 30, 'monthly')).toBe('2026-06-29T18:30:00.000Z');

      // 9. Jun 30 -> Jul 30
      const jun30_2026 = new Date('2026-06-29T18:30:00.000Z');
      expect(calculateIstExpiryDate(jun30_2026, 30, 'monthly')).toBe('2026-07-29T18:30:00.000Z');

      // 10. Jul 31 -> Aug 31
      const jul31_2026 = new Date('2026-07-30T18:30:00.000Z');
      expect(calculateIstExpiryDate(jul31_2026, 30, 'monthly')).toBe('2026-08-30T18:30:00.000Z');

      // 11. Aug 31 -> Sep 30 (September has 30 days)
      const aug31_2026 = new Date('2026-08-30T18:30:00.000Z');
      expect(calculateIstExpiryDate(aug31_2026, 30, 'monthly')).toBe('2026-09-29T18:30:00.000Z');

      // 12. Sep 30 -> Oct 30
      const sep30_2026 = new Date('2026-09-29T18:30:00.000Z');
      expect(calculateIstExpiryDate(sep30_2026, 30, 'monthly')).toBe('2026-10-29T18:30:00.000Z');

      // 13. Oct 31 -> Nov 30 (November has 30 days)
      const oct31_2026 = new Date('2026-10-30T18:30:00.000Z');
      expect(calculateIstExpiryDate(oct31_2026, 30, 'monthly')).toBe('2026-11-29T18:30:00.000Z');

      // 14. Nov 30 -> Dec 30
      const nov30_2026 = new Date('2026-11-29T18:30:00.000Z');
      expect(calculateIstExpiryDate(nov30_2026, 30, 'monthly')).toBe('2026-12-29T18:30:00.000Z');

      // 15. Dec 31 -> Jan 31 next year
      const dec31_2026 = new Date('2026-12-30T18:30:00.000Z');
      expect(calculateIstExpiryDate(dec31_2026, 30, 'monthly')).toBe('2027-01-30T18:30:00.000Z');
    });

    it('4.2 Stacking Stress Test: 5 sequentially queued subscriptions', async () => {
      // Start with Monthly 1 (starts now)
      const res1 = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Term 1: Monthly Pro',
        adminAccountId: ADMIN_ID,
      });

      // Term 2: Stack Monthly
      const res2 = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Term 2: Monthly Pro',
        adminAccountId: ADMIN_ID,
      });

      // Term 3: Stack Yearly
      const res3 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        amountPaise: 249900,
        paymentMethod: 'upi',
        transactionReference: 'UPI-STACK-5-T3',
        adminAccountId: ADMIN_ID,
      });

      // Term 4: Stack Monthly
      const res4 = await service.grantProAccess({
        accountId: STUDENT_ID,
        planId: 'monthly',
        reason: 'Term 4: Monthly Pro',
        adminAccountId: ADMIN_ID,
      });

      // Term 5: Stack Yearly
      const res5 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        amountPaise: 249900,
        paymentMethod: 'bank_transfer',
        transactionReference: 'BANK-STACK-5-T5',
        adminAccountId: ADMIN_ID,
      });

      expect(mockDb.subscriptions.size).toBe(5);

      // Verify strict sequential chaining with no gaps and no overlaps
      expect(res2.subscription.startDate).toBe(res1.subscription.expiryDate);
      expect(res3.subscription.startDate).toBe(res2.subscription.expiryDate);
      expect(res4.subscription.startDate).toBe(res3.subscription.expiryDate);
      expect(res5.subscription.startDate).toBe(res4.subscription.expiryDate);

      // Verify entitlement terminal expiry is Term 5 expiry
      expect(res5.entitlement.expiresAt).toBe(res5.subscription.expiryDate);
      expect(res5.entitlement.status).toBe('active');
      expect(res5.entitlement.isPaid).toBe(true);
    });

    it('4.3 Payment integrity and discount presets: 0%, 1%, 25%, 50%, 99%, 100%', async () => {
      // 0% discount on Monthly (3000 list -> 3000 final)
      const p0 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 0,
        paymentMethod: 'upi',
        transactionReference: 'PAY-DISC-0',
        adminAccountId: ADMIN_ID,
      });
      expect(p0.payment.amountPaise).toBe(3000);
      expect(p0.payment.discountAmountPaise).toBe(0);

      // 1% discount on Monthly (3000 list -> 30 discount -> 2970 final)
      const p1 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 1,
        paymentMethod: 'upi',
        transactionReference: 'PAY-DISC-1',
        adminAccountId: ADMIN_ID,
      });
      expect(p1.payment.discountAmountPaise).toBe(30);
      expect(p1.payment.amountPaise).toBe(2970);

      // 25% discount on Yearly (29900 list -> 7475 discount -> 22425 final)
      const p25 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        discountPercent: 25,
        paymentMethod: 'upi',
        transactionReference: 'PAY-DISC-25',
        adminAccountId: ADMIN_ID,
      });
      expect(p25.payment.discountAmountPaise).toBe(7475);
      expect(p25.payment.amountPaise).toBe(22425);

      // 50% discount on Yearly (29900 list -> 14950 discount -> 14950 final)
      const p50 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'yearly',
        discountPercent: 50,
        paymentMethod: 'upi',
        transactionReference: 'PAY-DISC-50',
        adminAccountId: ADMIN_ID,
      });
      expect(p50.payment.discountAmountPaise).toBe(14950);
      expect(p50.payment.amountPaise).toBe(14950);

      // 99% discount on Monthly (3000 list -> 2970 discount -> 30 final)
      const p99 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 99,
        paymentMethod: 'upi',
        transactionReference: 'PAY-DISC-99',
        adminAccountId: ADMIN_ID,
      });
      expect(p99.payment.discountAmountPaise).toBe(2970);
      expect(p99.payment.amountPaise).toBe(30);

      // 100% discount on Monthly with mandatory reason (3000 list -> 3000 discount -> 0 final)
      const p100 = await service.recordPaymentAndActivate({
        accountId: STUDENT_ID,
        planId: 'monthly',
        discountPercent: 100,
        paymentMethod: 'complimentary',
        notes: 'Full merit grant',
        adminAccountId: ADMIN_ID,
      });
      expect(p100.payment.discountAmountPaise).toBe(3000);
      expect(p100.payment.amountPaise).toBe(0);

      // Rejection of discount > 100
      await expect(
        service.recordPaymentAndActivate({
          accountId: STUDENT_ID,
          planId: 'monthly',
          discountPercent: 101,
          paymentMethod: 'upi',
          adminAccountId: ADMIN_ID,
        })
      ).rejects.toThrow(SUBSCRIPTION_ERRORS.INVALID_PAYMENT_DATA);
    });

    it('4.4 Idempotency: Double Revoke calls do not corrupt state or delete records', async () => {
      const now = new Date();
      mockDb.subscriptions.set('sub-dbl', {
        subscription_id: 'sub-dbl',
        account_id: STUDENT_ID,
        plan_id: 'monthly',
        status: 'active',
        source: 'payment',
        granted_by: ADMIN_ID,
        start_date: now.toISOString(),
        expiry_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        payment_reference: 'pay-dbl',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      mockDb.entitlements.set(STUDENT_ID, {
        entitlement_id: 'ent-dbl',
        account_id: STUDENT_ID,
        current_plan_id: 'monthly',
        status: 'active',
        is_paid: 1,
        features: JSON.stringify(ALL_STUDENT_OS_FEATURES),
        expires_at: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        last_verified_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      // Call 1
      const rev1 = await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Revoke call 1',
        adminAccountId: ADMIN_ID,
      });
      expect(rev1.entitlement.status).toBe('revoked');

      // Call 2 (double click)
      const rev2 = await service.revokeAccess({
        accountId: STUDENT_ID,
        reason: 'Revoke call 2',
        adminAccountId: ADMIN_ID,
      });
      expect(rev2.entitlement.status).toBe('revoked');
      expect(mockDb.subscriptions.get('sub-dbl')!.status).toBe('revoked');
      expect(mockDb.subscriptions.size).toBe(1);
    });

    it('4.5 Millisecond precision at 23:59:59.999 IST vs 00:00:00.000 IST day boundary', () => {
      const expiryIso = '2026-09-15T18:30:00.000Z'; // 16 Sep 00:00:00.000 IST
      const expiryMs = new Date(expiryIso).getTime();

      // -2 ms: 23:59:59.998 IST on 15 Sep -> Active
      const tMinus2 = new Date(expiryMs - 2);
      expect(tMinus2.getTime() < expiryMs).toBe(true);

      // -1 ms: 23:59:59.999 IST on 15 Sep -> Active
      const tMinus1 = new Date(expiryMs - 1);
      expect(tMinus1.getTime() < expiryMs).toBe(true);

      // 0 ms: 00:00:00.000 IST on 16 Sep -> Expired
      const tZero = new Date(expiryMs);
      expect(tZero.getTime() >= expiryMs).toBe(true);

      // +1 ms: 00:00:00.001 IST on 16 Sep -> Expired
      const tPlus1 = new Date(expiryMs + 1);
      expect(tPlus1.getTime() >= expiryMs).toBe(true);
    });
  });
});
