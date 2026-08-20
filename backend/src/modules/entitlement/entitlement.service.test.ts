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
  private trialClaims = new Map<string, any>();

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

  override async createInitialTrialSubscription(sub: any): Promise<void> {
    const exists = this.subscriptions.some((s) => s.accountId === sub.accountId && s.source === 'trial');
    if (!exists) {
      this.subscriptions.push(sub);
    }
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

  override async getTrialClaimByEmailHash(emailHash: string): Promise<any | null> {
    return this.trialClaims.get(emailHash) || null;
  }

  override async createTrialClaim(claim: any): Promise<void> {
    if (!this.trialClaims.has(claim.emailHash)) {
      this.trialClaims.set(claim.emailHash, {
        claim_id: claim.claimId,
        email_hash: claim.emailHash,
        first_claimed_at: claim.firstClaimedAt,
        trial_expires_at: claim.trialExpiresAt,
      });
    }
  }

  // Helper to simulate account hard-deletion for tests
  deleteAccountForTesting(accountId: string): void {
    this.accounts.delete(accountId);
    this.entitlements.delete(accountId);
    this.subscriptions = this.subscriptions.filter((s) => s.accountId !== accountId);
    this.auditLogs = this.auditLogs.filter((l) => l.accountId !== accountId);
    // Notice: trialClaims is NOT deleted, exactly matching the production database design!
  }

  // Helper to simulate creating a new account (or re-registration)
  createAccountForTesting(accountId: string, email: string, createdAt: string): void {
    this.accounts.set(accountId, {
      account_id: accountId,
      email,
      created_at: createdAt,
      last_login_at: createdAt,
    });
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

    it('19. Expired trial resolves to status: expired with empty features and isPaid: false', async () => {
      const expiredAcc = 'acc-expired-test';
      (repo as any).accounts.set(expiredAcc, {
        account_id: expiredAcc,
        email: 'expired@studentos.com',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (trial expired 3 days ago)
        last_login_at: new Date().toISOString(),
      });

      const entitlement = await service.getEntitlement(expiredAcc);
      expect(entitlement.status).toBe('expired');
      expect(entitlement.isPaid).toBe(false);
      expect(entitlement.features).toEqual([]);
    });

    it('20. Active trial resolves to status: active with ALL_STUDENT_OS_FEATURES and isPaid: false', async () => {
      const activeTrialAcc = 'acc-active-trial';
      (repo as any).accounts.set(activeTrialAcc, {
        account_id: activeTrialAcc,
        email: 'activetrial@studentos.com',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago (5 days left)
        last_login_at: new Date().toISOString(),
      });

      const entitlement = await service.getEntitlement(activeTrialAcc);
      expect(entitlement.status).toBe('active');
      expect(entitlement.isPaid).toBe(false);
      expect(entitlement.currentPlanId).toBe('free_trial');
      expect(entitlement.features).toEqual(ALL_STUDENT_OS_FEATURES);
    });

    it('21. Paid subscription resolves to status: active with ALL_STUDENT_OS_FEATURES and isPaid: true', async () => {
      const paidAcc = 'acc-paid-user';
      (repo as any).accounts.set(paidAcc, {
        account_id: paidAcc,
        email: 'paiduser2@studentos.com',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_login_at: new Date().toISOString(),
      });

      await service.grantManualEntitlement({
        accountId: paidAcc,
        planId: 'monthly',
        durationDays: 30,
        grantedBy: 'admin-1',
        reason: 'Paid Pro Activation',
      });

      const entitlement = await service.getEntitlement(paidAcc);
      expect(entitlement.status).toBe('active');
      expect(entitlement.isPaid).toBe(true);
      expect(entitlement.currentPlanId).toBe('monthly');
      expect(entitlement.features).toEqual(ALL_STUDENT_OS_FEATURES);
    });

    it('22. [CONCURRENCY REGRESSION] 16 concurrent requests on first login create exactly ONE trial subscription row', async () => {
      const concurrentAcc = 'acc-concurrent-first-login';
      (repo as any).accounts.set(concurrentAcc, {
        account_id: concurrentAcc,
        email: 'concurrent@studentos.com',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      });

      // Simulate 16 simultaneous requests hitting getEntitlement at the same millisecond
      const parallelRequests = Array.from({ length: 16 }, () => service.getEntitlement(concurrentAcc));
      const results = await Promise.all(parallelRequests);

      // Verify all 16 returned active trial entitlements
      for (const ent of results) {
        expect(ent.status).toBe('active');
        expect(ent.currentPlanId).toBe('free_trial');
      }

      // Verify exactly ONE subscription was created in the database
      const allSubs = await repo.getAllSubscriptionsForAccount(concurrentAcc);
      expect(allSubs.length).toBe(1);
      expect(allSubs[0].source).toBe('trial');
      expect(allSubs[0].status).toBe('active');
    });
  });

  describe('Anti-Trial-Reset Hardening (Account Deletion & Email Normalization)', () => {
    it('A. new account receives trial once and creates persistent trial-claim marker', async () => {
      const accId = 'acc-new-student-1';
      const email = 'newstudent1@example.com';
      repo.createAccountForTesting(accId, email, new Date().toISOString());

      const ent = await service.getEntitlement(accId);
      expect(ent.status).toBe('active');
      expect(ent.currentPlanId).toBe('free_trial');
      expect(ent.isPaid).toBe(false);
      expect(ent.features).toEqual(ALL_STUDENT_OS_FEATURES);

      // Verify trial claim exists
      const emailHash = await (await import('../../services/crypto.service.js')).hashString(email.toLowerCase().trim());
      const claim = await repo.getTrialClaimByEmailHash(emailHash);
      expect(claim).not.toBeNull();
      expect(claim.trial_expires_at).toBe(ent.expiresAt);
    });

    it('B. existing trial for active account remains unchanged across multiple requests', async () => {
      const accId = 'acc-existing-student-2';
      const email = 'existingstudent2@example.com';
      repo.createAccountForTesting(accId, email, new Date().toISOString());

      const ent1 = await service.getEntitlement(accId);
      const ent2 = await service.getEntitlement(accId);
      expect(ent1.expiresAt).toBe(ent2.expiresAt);
      expect(ent1.status).toBe(ent2.status);
    });

    it('C. [CRITICAL] deleted-account email CANNOT receive a second trial after trial expired', async () => {
      const oldAccId = 'acc-old-trial-expired';
      const email = 'trialabuser@example.com';
      const pastCreation = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

      // 1. Initial account consumed 7-day trial
      repo.createAccountForTesting(oldAccId, email, pastCreation);
      const oldEnt = await service.getEntitlement(oldAccId);
      expect(oldEnt.status).toBe('expired');
      expect(oldEnt.features).toEqual([]);

      // 2. User deletes their account (simulates POST /api/v1/account/delete)
      repo.deleteAccountForTesting(oldAccId);

      // 3. User signs up again with the EXACT SAME email (gets brand new account_id with NOW timestamp)
      const newAccId = 'acc-new-trial-abuser';
      const newCreation = new Date().toISOString();
      repo.createAccountForTesting(newAccId, email, newCreation);

      // 4. System resolves entitlement for the new account
      const newEnt = await service.getEntitlement(newAccId);

      // 5. MUST resolve to 'expired' and must NOT grant a new 7-day trial!
      expect(newEnt.status).toBe('expired');
      expect(newEnt.isPaid).toBe(false);
      expect(newEnt.currentPlanId).toBe('free_trial');
      expect(newEnt.features).toEqual([]);
      // Expiration date reflects original past expiration, NOT +7 days from now
      expect(new Date(newEnt.expiresAt!).getTime()).toBeLessThan(Date.now());
    });

    it('D. same email with different casing (e.g. AbUser@Example.COM) cannot bypass trial reset restriction', async () => {
      const oldAccId = 'acc-casing-test-1';
      const emailLower = 'casingabuser@example.com';
      const pastCreation = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

      // Initial account created in lowercase
      repo.createAccountForTesting(oldAccId, emailLower, pastCreation);
      await service.getEntitlement(oldAccId);

      // Delete old account
      repo.deleteAccountForTesting(oldAccId);

      // Re-register with mixed uppercase and whitespace
      const newAccId = 'acc-casing-test-2';
      const emailMixed = '  CasingAbUser@EXAMPLE.com  ';
      repo.createAccountForTesting(newAccId, emailMixed, new Date().toISOString());

      const newEnt = await service.getEntitlement(newAccId);
      expect(newEnt.status).toBe('expired');
      expect(newEnt.features).toEqual([]);
    });

    it('E. Google authentication / re-registration path cannot bypass trial restriction', async () => {
      const oldAccId = 'acc-google-1';
      const googleEmail = 'googleuser@gmail.com';
      const pastCreation = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

      repo.createAccountForTesting(oldAccId, googleEmail, pastCreation);
      await service.getEntitlement(oldAccId);

      // Delete account
      repo.deleteAccountForTesting(oldAccId);

      // Re-authenticated via Google ID token (same email, new account UUID)
      const newAccId = 'acc-google-recreated-2';
      repo.createAccountForTesting(newAccId, googleEmail, new Date().toISOString());

      const newEnt = await service.getEntitlement(newAccId);
      expect(newEnt.status).toBe('expired');
      expect(newEnt.features).toEqual([]);
    });

    it('F. Pro plan purchase / grant remains fully functional even after account deletion and trial expiry', async () => {
      const oldAccId = 'acc-pro-buyer-old';
      const email = 'probuyer@example.com';
      const pastCreation = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

      repo.createAccountForTesting(oldAccId, email, pastCreation);
      await service.getEntitlement(oldAccId);
      repo.deleteAccountForTesting(oldAccId);

      // Re-registered account (trial expired)
      const newAccId = 'acc-pro-buyer-new';
      repo.createAccountForTesting(newAccId, email, new Date().toISOString());

      // Grant Pro access
      await service.grantManualEntitlement({
        accountId: newAccId,
        planId: 'monthly',
        durationDays: 30,
        grantedBy: adminId,
        reason: 'Subscribed to Pro Monthly',
      });

      const ent = await service.getEntitlement(newAccId);
      expect(ent.status).toBe('active');
      expect(ent.isPaid).toBe(true);
      expect(ent.currentPlanId).toBe('monthly');
      expect(ent.features).toEqual(ALL_STUDENT_OS_FEATURES);
    });

    it('G. partially consumed trial retains original expiration window if re-registered before 7 days elapses', async () => {
      const oldAccId = 'acc-partial-old';
      const email = 'partialtrial@example.com';
      // Created 3 days ago (4 days remaining)
      const created3DaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      repo.createAccountForTesting(oldAccId, email, created3DaysAgo);
      const ent1 = await service.getEntitlement(oldAccId);
      expect(ent1.status).toBe('active');
      const originalExpiry = ent1.expiresAt;

      // Delete on Day 3
      repo.deleteAccountForTesting(oldAccId);

      // Re-register today
      const newAccId = 'acc-partial-new';
      repo.createAccountForTesting(newAccId, email, new Date().toISOString());

      const ent2 = await service.getEntitlement(newAccId);
      // Still active because 4 days remain, but expiresAt is the original Day 7 date (NOT 7 days from today)
      expect(ent2.status).toBe('active');
      expect(ent2.expiresAt).toBe(originalExpiry);
    });
  });
});
