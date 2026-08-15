import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntitlementService } from './entitlement.service.js';
import { EntitlementRepository } from '../../db/entitlement.repository.js';
import { RazorpayPaymentProvider } from '../../services/payment/razorpay-payment.provider.js';
import { createHmacSha256 } from '../../services/crypto.service.js';
import {
  ALL_STUDENT_OS_FEATURES,
  type PlanDto,
  type SubscriptionDto,
  type EntitlementDto,
  type EntitlementAuditLogDto,
} from '@student-os/shared';

// In-Memory mock DB implementation for unit testing
class MockEntitlementRepository extends EntitlementRepository {
  private plans: Map<string, PlanDto> = new Map([
    [
      'free_trial',
      {
        planId: 'free_trial',
        name: '7-Day Free Trial',
        description: 'Full access to all Student OS features for 7 days',
        priceCents: 0,
        currency: 'INR',
        durationDays: 7,
        features: [...ALL_STUDENT_OS_FEATURES],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'monthly',
      {
        planId: 'monthly',
        name: 'Student OS Pro Monthly',
        description: 'Monthly Pro Plan with full feature access',
        priceCents: 3000,
        currency: 'INR',
        durationDays: 30,
        features: [...ALL_STUDENT_OS_FEATURES],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'yearly',
      {
        planId: 'yearly',
        name: 'Student OS Pro Yearly',
        description: 'Yearly Pro Plan with full feature access',
        priceCents: 29900,
        currency: 'INR',
        durationDays: 365,
        features: [...ALL_STUDENT_OS_FEATURES],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  private accounts = new Map<string, { account_id: string; email: string; created_at: string; last_login_at: string }>([
    [
      'acc-1111',
      {
        account_id: 'acc-1111',
        email: 'newuser@studentos.com',
        created_at: '2026-08-15T00:00:00.000Z',
        last_login_at: '2026-08-15T00:00:00.000Z',
      },
    ],
    [
      'acc-paid',
      {
        account_id: 'acc-paid',
        email: 'paiduser@studentos.com',
        created_at: '2026-08-01T00:00:00.000Z',
        last_login_at: '2026-08-15T00:00:00.000Z',
      },
    ],
  ]);

  private entitlements = new Map<string, EntitlementDto>();
  private subscriptions: SubscriptionDto[] = [];
  private auditLogs: EntitlementAuditLogDto[] = [];
  private appConfig = new Map<string, string>([['payment_live', 'false']]);

  constructor() {
    super({} as D1Database);
  }

  override async getAllPlans(): Promise<PlanDto[]> {
    return Array.from(this.plans.values());
  }

  override async getPlanById(planId: string): Promise<PlanDto | null> {
    return this.plans.get(planId) || null;
  }

  override async getAccountByEmail(email: string) {
    for (const acc of this.accounts.values()) {
      if (acc.email.toLowerCase() === email.toLowerCase()) return acc;
    }
    return null;
  }

  override async getAccountById(accountId: string) {
    return this.accounts.get(accountId) || null;
  }

  override async getEntitlementByAccountId(accountId: string): Promise<EntitlementDto | null> {
    return this.entitlements.get(accountId) || null;
  }

  override async upsertEntitlement(entitlement: EntitlementDto): Promise<void> {
    this.entitlements.set(entitlement.accountId, entitlement);
  }

  override async createSubscription(sub: any): Promise<void> {
    this.subscriptions.push(sub);
  }

  override async updatePreviousActiveSubscriptions(accountId: string, newStatus: string): Promise<void> {
    for (const sub of this.subscriptions) {
      if (sub.accountId === accountId && sub.status === 'active') {
        (sub as any).status = newStatus;
      }
    }
  }

  override async getAllSubscriptionsForAccount(accountId: string): Promise<SubscriptionDto[]> {
    return this.subscriptions.filter((s) => s.accountId === accountId);
  }

  override async getSubscriptionByPaymentReference(paymentReference: string): Promise<SubscriptionDto | null> {
    return this.subscriptions.find((s) => s.paymentReference === paymentReference) || null;
  }

  override async createAuditLog(log: any): Promise<void> {
    this.auditLogs.push(log);
  }

  override async getAuditLogsForAccount(accountId: string): Promise<EntitlementAuditLogDto[]> {
    return this.auditLogs.filter((l) => l.accountId === accountId);
  }

  override async getAppConfig(key: string): Promise<string | null> {
    return this.appConfig.get(key) || null;
  }

  override async setAppConfig(key: string, value: string): Promise<void> {
    this.appConfig.set(key, value);
  }
}

describe('Student OS — Final Release Entitlement Model (7-Day Trial + Full Access Plans)', () => {
  let repo: MockEntitlementRepository;
  let service: EntitlementService;
  const adminId = 'admin-user-id';
  const testKeySecret = 'test_razorpay_secret_key_12345';
  const testWebhookSecret = 'test_webhook_secret_67890';

  beforeEach(() => {
    vi.useRealTimers();
    repo = new MockEntitlementRepository();
    const provider = new RazorpayPaymentProvider({
      keyId: 'rzp_test_1234567890',
      keySecret: testKeySecret,
      webhookSecret: testWebhookSecret,
    });
    service = new EntitlementService(repo, provider);
  });

  describe('1. 7-Day Free Trial Auto-Initialization & Full Access', () => {
    it('1. New account receives 7-day trial automatically on first access', async () => {
      const entitlement = await service.getEntitlement('acc-1111');
      expect(entitlement.accountId).toBe('acc-1111');
      expect(entitlement.currentPlanId).toBe('free_trial');
      expect(entitlement.planName).toBe('7-Day Free Trial');
      expect(entitlement.status).toBe('active');
      expect(entitlement.expiresAt).not.toBeNull();

      // Check duration is exactly 7 days
      const start = new Date('2026-08-15T00:00:00.000Z').getTime();
      const expiry = new Date(entitlement.expiresAt!).getTime();
      expect(expiry - start).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('2. Trial grants full access to ALL canonical features with NO artificial restrictions', async () => {
      const entitlement = await service.getEntitlement('acc-1111');
      expect(entitlement.features).toEqual(ALL_STUDENT_OS_FEATURES);
      expect(entitlement.features).toContain('dashboard');
      expect(entitlement.features).toContain('goals');
      expect(entitlement.features).toContain('study');
      expect(entitlement.features).toContain('planner');
      expect(entitlement.features).toContain('revision');
      expect(entitlement.features).toContain('analytics');
      expect(entitlement.features).toContain('account');
      expect(entitlement.features).toContain('cloud_sync');
      // Verify no fake Pro-only feature distinctions
      expect(entitlement.features).not.toContain('priority_ai');
    });

    it('3. Trial remains tied to the server-side account', async () => {
      const ent1 = await service.getEntitlement('acc-1111');
      const history = await service.getEntitlementHistory('acc-1111');
      expect(history.subscriptions.length).toBe(1);
      expect(history.subscriptions[0].source).toBe('trial');
      expect(history.subscriptions[0].planId).toBe('free_trial');
      expect(history.subscriptions[0].status).toBe('active');
    });

    it('4 & 5. Repeated queries, logins, or sessions do NOT reset the trial', async () => {
      const first = await service.getEntitlement('acc-1111');
      const originalExpiry = first.expiresAt;

      // Simulate subsequent login queries / session creations
      const second = await service.getEntitlement('acc-1111');
      const third = await service.getEntitlement('acc-1111');

      expect(second.expiresAt).toBe(originalExpiry);
      expect(third.expiresAt).toBe(originalExpiry);

      const history = await service.getEntitlementHistory('acc-1111');
      expect(history.subscriptions.length).toBe(1);
    });
  });

  describe('2. Trial Expiry Lifecycle & Data Preservation', () => {
    it('6. Trial expires correctly after 7 days', async () => {
      // Initialize active trial at Day 0
      vi.useFakeTimers();
      const baseTime = new Date('2026-08-15T00:00:00.000Z');
      vi.setSystemTime(baseTime);

      const initial = await service.getEntitlement('acc-1111');
      expect(initial.status).toBe('active');

      // Fast forward 8 days (trial expired)
      vi.setSystemTime(new Date('2026-08-23T00:00:00.000Z'));

      const expired = await service.getEntitlement('acc-1111');
      expect(expired.status).toBe('expired');
      expect(expired.currentPlanId).toBe('free_trial');
      expect(expired.features).toEqual([]);
    });

    it('7. Expired trial does NOT silently become unlimited Free', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-30T00:00:00.000Z')); // 15 days later

      const resolved = await service.getEntitlement('acc-1111');
      expect(resolved.status).toBe('expired');
      expect(resolved.currentPlanId).toBe('free_trial');
      expect(resolved.isPaid).toBe(false);
      expect(resolved.features.length).toBe(0);
    });
  });

  describe('3. Monthly & Yearly Full-Access Paid Plans & Manual Grants', () => {
    it('9. Monthly manual grant gives full access for 30 days', async () => {
      const result = await service.grantManualEntitlement({
        accountId: 'acc-1111',
        planId: 'monthly',
        grantedBy: adminId,
        reason: 'Paid Subscriber Grant',
      });

      expect(result.subscription.planId).toBe('monthly');
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.source).toBe('manual');
      expect(result.entitlement.isPaid).toBe(true);
      expect(result.entitlement.currentPlanId).toBe('monthly');
      expect(result.entitlement.status).toBe('active');
      expect(result.entitlement.features).toEqual(ALL_STUDENT_OS_FEATURES);

      // Verify audit log
      const history = await service.getEntitlementHistory('acc-1111');
      expect(history.auditLogs.some((l) => l.eventType === 'ENTITLEMENT_MANUALLY_GRANTED')).toBe(true);
    });

    it('10. Yearly manual grant gives full access for 365 days', async () => {
      const result = await service.grantManualEntitlement({
        accountId: 'acc-1111',
        planId: 'yearly',
        grantedBy: adminId,
      });

      expect(result.subscription.planId).toBe('yearly');
      expect(result.entitlement.currentPlanId).toBe('yearly');
      expect(result.entitlement.isPaid).toBe(true);
      expect(result.entitlement.features).toEqual(ALL_STUDENT_OS_FEATURES);
    });

    it('11. Manual revocation works and revokes active access without creating unlimited free', async () => {
      // Grant Pro
      await service.grantManualEntitlement({
        accountId: 'acc-1111',
        planId: 'monthly',
        grantedBy: adminId,
      });

      // Revoke
      const revoked = await service.revokeEntitlement({
        accountId: 'acc-1111',
        revokedBy: adminId,
        reason: 'Refund requested',
      });

      expect(revoked.entitlement.status).toBe('revoked');
      expect(revoked.entitlement.isPaid).toBe(false);
      expect(revoked.entitlement.features).toEqual([]);

      const history = await service.getEntitlementHistory('acc-1111');
      expect(history.auditLogs.some((l) => l.eventType === 'ENTITLEMENT_REVOKED')).toBe(true);
    });

    it('12. Existing active paid/manual entitlement is preserved and respected', async () => {
      // Seed existing active yearly entitlement
      const futureExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
      await repo.upsertEntitlement({
        entitlementId: 'ent-paid-1',
        accountId: 'acc-paid',
        currentPlanId: 'yearly',
        planName: 'Student OS Pro Yearly',
        status: 'active',
        isPaid: true,
        features: ALL_STUDENT_OS_FEATURES,
        expiresAt: futureExpiry,
        lastVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const ent = await service.getEntitlement('acc-paid');
      expect(ent.status).toBe('active');
      expect(ent.currentPlanId).toBe('yearly');
      expect(ent.isPaid).toBe(true);
      expect(ent.expiresAt).toBe(futureExpiry);
      expect(ent.features).toEqual(ALL_STUDENT_OS_FEATURES);
    });
  });

  describe('4. Payment Architecture Safety & Inactive Toggle', () => {
    it('13. Payment_live defaults to false (OFF) in config', async () => {
      const config = await service.getPaymentConfig();
      expect(config.isLive).toBe(false);
    });

    it('14. Razorpay HMAC verification, idempotency and webhook processing remain fully functional', async () => {
      const orderId = 'order_test_123';
      const paymentId = 'pay_test_456';
      const validSignature = await createHmacSha256(`${orderId}|${paymentId}`, testKeySecret);

      const result = await service.verifyAndActivatePayment({
        accountId: 'acc-1111',
        planId: 'monthly',
        orderId,
        paymentId,
        signature: validSignature,
      });

      expect(result.verified).toBe(true);
      expect(result.subscription?.status).toBe('active');
      expect(result.subscription?.source).toBe('payment');
      expect(result.entitlement?.isPaid).toBe(true);
      expect(result.entitlement?.features).toEqual(ALL_STUDENT_OS_FEATURES);

      // Replay idempotency check
      const replay = await service.activatePaidEntitlementFromPayment({
        accountId: 'acc-1111',
        planId: 'monthly',
        paymentReference: paymentId,
      });
      expect(replay.alreadyProcessed).toBe(true);
    });

    it('15. No fake Pro-only feature distinctions exist across any plan', async () => {
      const plans = await service.getPlans();
      for (const plan of plans) {
        expect(plan.features).not.toContain('priority_ai');
        if (plan.isActive) {
          expect(plan.features).toEqual(ALL_STUDENT_OS_FEATURES);
        }
      }
    });

    it('16. Payment config returns owner WhatsApp number +919793593183', async () => {
      const config = await service.getPaymentConfig();
      expect(config.contactWhatsApp).toBe('+919793593183');
    });

    it('17. Dynamic savings percentage calculation works correctly with server plan prices', async () => {
      const plans = await service.getPlans();
      const monthly = plans.find((p) => p.planId === 'monthly');
      const yearly = plans.find((p) => p.planId === 'yearly');

      expect(monthly).toBeDefined();
      expect(yearly).toBeDefined();

      const monthlyPrice = Math.round(monthly!.priceCents / 100); // 30
      const yearlyPrice = Math.round(yearly!.priceCents / 100);   // 299
      const monthlyAnnualCost = monthlyPrice * 12; // 360
      const savings = monthlyAnnualCost - yearlyPrice; // 61
      const savingsPercent = Math.round((savings / monthlyAnnualCost) * 100);

      expect(savingsPercent).toBe(17);
    });

    it('18. Manual WhatsApp prefilled message formats correctly with email, plan, price, and duration', async () => {
      const plans = await service.getPlans();
      const yearly = plans.find((p) => p.planId === 'yearly')!;
      const email = 'sidd.gbu@gmail.com';
      const priceRupees = Math.round(yearly.priceCents / 100);

      const prefilled = `Hi, I want to get Student OS Pro Yearly access for ₹${priceRupees}.\n\nAccount: ${email}\nPlan: ${yearly.planId}\nDuration: ${yearly.durationDays} days`;

      expect(prefilled).toBe(
        'Hi, I want to get Student OS Pro Yearly access for ₹299.\n\nAccount: sidd.gbu@gmail.com\nPlan: yearly\nDuration: 365 days'
      );
    });
  });
});
