import { describe, it, expect, beforeEach } from 'vitest';
import {
  SubscriptionManagementService,
  SUBSCRIPTION_ERRORS,
  SubscriptionDomainError,
} from './subscription-management.service.js';
import { ALL_STUDENT_OS_FEATURES, type PlanDto } from '@student-os/shared';

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
            return null;
          },
          async all<T>(): Promise<{ results: T[] }> {
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
          const is_paid = isRevoked ? 0 : 1;
          const status = isRevoked ? 'revoked' : 'active';

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

      const expectedExpiryMs = futureExpiry.getTime() + 30 * 24 * 60 * 60 * 1000;
      const actualExpiryMs = new Date(result.entitlement.expiresAt!).getTime();

      // Allow 2-second tolerance for execution time
      expect(Math.abs(actualExpiryMs - expectedExpiryMs)).toBeLessThan(2000);
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

      const nowBefore = Date.now();
      const result = await service.extendSubscription({
        accountId: STUDENT_ID,
        durationDays: 30,
        reason: 'Renewed after expiry',
        adminAccountId: ADMIN_ID,
      });

      const expectedExpiryMs = nowBefore + 30 * 24 * 60 * 60 * 1000;
      const actualExpiryMs = new Date(result.entitlement.expiresAt!).getTime();

      expect(Math.abs(actualExpiryMs - expectedExpiryMs)).toBeLessThan(2000);
      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.isPaid).toBe(true);
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

      expect(result.payment.amountPaise).toBe(249900); // Full yearly price
      expect(result.payment.originalAmountPaise).toBe(249900);
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
      expect(details.finalAmountPaise).toBe(249900);
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

      // Yearly list price: 249900 paise. 50% discount = 124950 paise. Final = 124950 paise.
      expect(result.payment.originalAmountPaise).toBe(249900);
      expect(result.payment.discountPercent).toBe(50);
      expect(result.payment.discountAmountPaise).toBe(124950);
      expect(result.payment.amountPaise).toBe(124950);
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

      // Monthly list price: 29900 paise. 20% discount = 5980 paise. Final = 23920 paise (₹239.20).
      expect(result.payment.originalAmountPaise).toBe(29900);
      expect(result.payment.discountPercent).toBe(20);
      expect(result.payment.discountAmountPaise).toBe(5980);
      expect(result.payment.amountPaise).toBe(23920);
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

      expect(compRes.payment.originalAmountPaise).toBe(249900);
      expect(compRes.payment.discountPercent).toBe(100);
      expect(compRes.payment.discountAmountPaise).toBe(249900);
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
  });
});
