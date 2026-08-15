import {
  type PlanDto,
  type SubscriptionDto,
  type EntitlementDto,
  type EntitlementAuditLogDto,
  type PaymentConfigDto,
  type EntitlementStatus,
  ALL_STUDENT_OS_FEATURES,
} from '@student-os/shared';
import { EntitlementRepository } from '../../db/entitlement.repository.js';
import { PaymentProvider, GenericPaymentProvider } from '../../services/payment/payment-provider.interface.js';

export interface ManualGrantParams {
  accountId?: string;
  email?: string;
  planId: 'free_trial' | 'free' | 'monthly' | 'yearly';
  durationDays?: number;
  expiryDate?: string;
  grantedBy: string;
  reason?: string;
}

export interface RevokeParams {
  accountId?: string;
  email?: string;
  revokedBy: string;
  reason?: string;
}

export class EntitlementService {
  private paymentProvider: PaymentProvider;

  constructor(
    private readonly repo: EntitlementRepository,
    paymentProvider?: PaymentProvider
  ) {
    this.paymentProvider = paymentProvider || new GenericPaymentProvider();
  }

  async getPlans(): Promise<PlanDto[]> {
    return await this.repo.getAllPlans();
  }

  async getPaymentConfig(): Promise<PaymentConfigDto> {
    const isLiveStr = await this.repo.getAppConfig('payment_live');
    const isLive = isLiveStr === 'true';
    const contactWhatsApp = (await this.repo.getAppConfig('owner_whatsapp')) || '+919793593183';
    const contactUpi = await this.repo.getAppConfig('owner_upi');

    return {
      isLive,
      supportedProviders: ['generic', 'razorpay'],
      activeProvider: isLive && this.paymentProvider.isConfigured ? this.paymentProvider.name : null,
      contactWhatsApp,
      contactUpi: contactUpi || null,
      updatedAt: new Date().toISOString(),
    };
  }

  async setPaymentLive(isLive: boolean, updatedBy: string): Promise<PaymentConfigDto> {
    await this.repo.setAppConfig('payment_live', isLive ? 'true' : 'false');

    // Audit log
    const account = await this.repo.getAccountById(updatedBy);
    if (account) {
      await this.repo.createAuditLog({
        id: crypto.randomUUID(),
        accountId: updatedBy,
        eventType: isLive ? 'PAYMENT_LIVE_ENABLED' : 'PAYMENT_LIVE_DISABLED',
        planId: 'system',
        grantedBy: updatedBy,
        source: 'manual',
        startDate: new Date().toISOString(),
        expiryDate: null,
        details: { isLive, updatedByEmail: account.email },
        createdAt: new Date().toISOString(),
      });
    }

    return await this.getPaymentConfig();
  }

  /**
   * Resolve Entitlement for Account.
   * Auto-initializes 7-Day Full Free Trial on first access.
   * If trial or paid plan has expired, resolves to status: 'expired' with no active features.
   */
  async getEntitlement(accountId: string): Promise<EntitlementDto> {
    const existing = await this.repo.getEntitlementByAccountId(accountId);
    const now = new Date();

    if (existing) {
      // Check if entitlement has an expiry date and it has passed
      if (existing.expiresAt && new Date(existing.expiresAt) < now) {
        // Expired -> mark as expired without creating an unlimited free plan
        const updated: EntitlementDto = {
          ...existing,
          status: 'expired',
          isPaid: false,
          features: [],
          lastVerifiedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        await this.repo.upsertEntitlement(updated);
        await this.repo.updatePreviousActiveSubscriptions(accountId, 'expired');
        return updated;
      }
      return existing;
    }

    // No existing entitlement record -> Auto-initialize 7-Day Free Trial based on account creation date
    const account = await this.repo.getAccountById(accountId);
    const accountCreatedAt = account ? new Date(account.created_at) : now;
    const trialExpiry = new Date(accountCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isTrialActive = now < trialExpiry;

    const trialPlan = (await this.repo.getPlanById('free_trial')) || {
      planId: 'free_trial',
      name: '7-Day Free Trial',
      features: ALL_STUDENT_OS_FEATURES,
    };

    const status: EntitlementStatus = isTrialActive ? 'active' : 'expired';
    const features = isTrialActive ? (trialPlan.features || ALL_STUDENT_OS_FEATURES) : [];

    // Create initial trial subscription record
    await this.repo.createSubscription({
      subscriptionId: crypto.randomUUID(),
      accountId,
      planId: 'free_trial',
      status: isTrialActive ? 'active' : 'expired',
      source: 'trial',
      grantedBy: 'system:trial',
      startDate: accountCreatedAt.toISOString(),
      expiryDate: trialExpiry.toISOString(),
      cancelledAt: null,
      paymentReference: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    const newEntitlement: EntitlementDto = {
      entitlementId: crypto.randomUUID(),
      accountId,
      currentPlanId: 'free_trial',
      planName: trialPlan.name || '7-Day Free Trial',
      status,
      isPaid: false,
      features,
      expiresAt: trialExpiry.toISOString(),
      lastVerifiedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await this.repo.upsertEntitlement(newEntitlement);
    return newEntitlement;
  }

  /**
   * Owner Manual Grant for Monthly, Yearly, or Custom duration.
   */
  async grantManualEntitlement(params: ManualGrantParams): Promise<{
    subscription: SubscriptionDto;
    entitlement: EntitlementDto;
    auditLogId: string;
  }> {
    let accountId = params.accountId;
    if (!accountId && params.email) {
      const account = await this.repo.getAccountByEmail(params.email);
      if (!account) {
        throw new Error(`Account not found for email: ${params.email}`);
      }
      accountId = account.account_id;
    }

    if (!accountId) {
      throw new Error('Either accountId or valid email must be provided');
    }

    const plan = (await this.repo.getPlanById(params.planId)) || {
      planId: params.planId,
      name: params.planId === 'yearly' ? 'Student OS Pro Yearly' : 'Student OS Pro Monthly',
      durationDays: params.planId === 'yearly' ? 365 : params.planId === 'free_trial' ? 7 : 30,
      features: ALL_STUDENT_OS_FEATURES,
    };

    const now = new Date();
    const startDate = now.toISOString();
    let expiryDate: string | null = null;

    if (params.expiryDate) {
      expiryDate = new Date(params.expiryDate).toISOString();
    } else if (params.durationDays) {
      const exp = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
      expiryDate = exp.toISOString();
    } else if (plan.durationDays) {
      const exp = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      expiryDate = exp.toISOString();
    } else {
      const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      expiryDate = exp.toISOString();
    }

    // 1. Mark previous active subscriptions as superseded
    await this.repo.updatePreviousActiveSubscriptions(accountId, 'superseded');

    // 2. Create new active subscription
    const subscriptionId = crypto.randomUUID();
    const sub = {
      subscriptionId,
      accountId,
      planId: plan.planId,
      status: 'active' as const,
      source: 'manual' as const,
      grantedBy: params.grantedBy,
      startDate,
      expiryDate,
      cancelledAt: null,
      paymentReference: null,
      createdAt: startDate,
      updatedAt: startDate,
    };
    await this.repo.createSubscription(sub);

    // 3. Upsert Entitlement record with canonical full access features
    const isPaid = plan.planId !== 'free_trial' && plan.planId !== 'free';
    const entitlement: EntitlementDto = {
      entitlementId: crypto.randomUUID(),
      accountId,
      currentPlanId: plan.planId,
      planName: plan.name,
      status: 'active',
      isPaid,
      features: plan.features && plan.features.length > 0 ? plan.features : ALL_STUDENT_OS_FEATURES,
      expiresAt: expiryDate,
      lastVerifiedAt: startDate,
      createdAt: startDate,
      updatedAt: startDate,
    };
    await this.repo.upsertEntitlement(entitlement);

    // 4. Create immutable audit log
    const auditLogId = crypto.randomUUID();
    await this.repo.createAuditLog({
      id: auditLogId,
      accountId,
      eventType: 'ENTITLEMENT_MANUALLY_GRANTED',
      planId: plan.planId,
      grantedBy: params.grantedBy,
      source: 'manual',
      startDate,
      expiryDate,
      details: {
        reason: params.reason || 'Admin manual grant',
        durationDays: params.durationDays,
        customExpiry: params.expiryDate,
      },
      createdAt: startDate,
    });

    return {
      subscription: { ...sub, planName: plan.name, cancelledAt: null },
      entitlement,
      auditLogId,
    };
  }

  /**
   * Owner Revocation of Paid / Trial Access.
   */
  async revokeEntitlement(params: RevokeParams): Promise<{
    entitlement: EntitlementDto;
    auditLogId: string;
  }> {
    let accountId = params.accountId;
    if (!accountId && params.email) {
      const account = await this.repo.getAccountByEmail(params.email);
      if (!account) {
        throw new Error(`Account not found for email: ${params.email}`);
      }
      accountId = account.account_id;
    }

    if (!accountId) {
      throw new Error('Either accountId or valid email must be provided');
    }

    const now = new Date().toISOString();

    // 1. Mark active subscriptions as revoked
    await this.repo.updatePreviousActiveSubscriptions(accountId, 'revoked');

    // 2. Revert entitlement to Revoked state with NO active features
    const entitlement: EntitlementDto = {
      entitlementId: crypto.randomUUID(),
      accountId,
      currentPlanId: 'free_trial',
      planName: '7-Day Free Trial',
      status: 'revoked',
      isPaid: false,
      features: [],
      expiresAt: null,
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.upsertEntitlement(entitlement);

    // 3. Log audit event
    const auditLogId = crypto.randomUUID();
    await this.repo.createAuditLog({
      id: auditLogId,
      accountId,
      eventType: 'ENTITLEMENT_REVOKED',
      planId: 'free_trial',
      grantedBy: params.revokedBy,
      source: 'manual',
      startDate: now,
      expiryDate: null,
      details: { reason: params.reason || 'Admin revoked access' },
      createdAt: now,
    });

    return { entitlement, auditLogId };
  }

  async getEntitlementHistory(accountId: string): Promise<{
    entitlement: EntitlementDto;
    subscriptions: SubscriptionDto[];
    auditLogs: EntitlementAuditLogDto[];
  }> {
    const entitlement = await this.getEntitlement(accountId);
    const subscriptions = await this.repo.getAllSubscriptionsForAccount(accountId);
    const auditLogs = await this.repo.getAuditLogsForAccount(accountId);

    return {
      entitlement,
      subscriptions,
      auditLogs,
    };
  }

  /**
   * Create Checkout Session for user payment.
   * Strictly resolves plan price from server-side plan definition.
   */
  async createCheckoutSession(params: {
    accountId: string;
    planId: string;
    customerEmail: string;
    currency?: string;
  }): Promise<{ checkout: import('@student-os/shared').CheckoutSessionDto }> {
    const config = await this.getPaymentConfig();
    if (!config.isLive) {
      throw new Error('PAYMENTS_DISABLED: Customer checkout is currently disabled.');
    }

    if (!this.paymentProvider.isConfigured) {
      throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED: Live payment gateway is not configured.');
    }

    const plan = await this.repo.getPlanById(params.planId);
    if (!plan || !plan.isActive || plan.planId === 'free' || plan.planId === 'free_trial') {
      throw new Error(`INVALID_PLAN: Plan ${params.planId} is not available for purchase.`);
    }

    const checkout = await this.paymentProvider.createCheckout({
      accountId: params.accountId,
      planId: plan.planId,
      amountCents: plan.priceCents, // Server-authoritative integer paise
      currency: params.currency || plan.currency,
      customerEmail: params.customerEmail,
    });

    return { checkout };
  }

  /**
   * Idempotently activate paid entitlement upon verified payment.
   */
  async activatePaidEntitlementFromPayment(params: {
    accountId: string;
    planId: string;
    paymentReference: string;
    providerName?: string;
    amountCents?: number;
  }): Promise<{
    subscription: SubscriptionDto;
    entitlement: EntitlementDto;
    alreadyProcessed: boolean;
  }> {
    const { accountId, planId, paymentReference } = params;

    // 1. Idempotency Check: check if paymentReference is already processed
    const existingSub = await this.repo.getSubscriptionByPaymentReference(paymentReference);
    if (existingSub && existingSub.status === 'active') {
      const currentEnt = await this.getEntitlement(accountId);
      return {
        subscription: existingSub,
        entitlement: currentEnt,
        alreadyProcessed: true,
      };
    }

    const plan = (await this.repo.getPlanById(planId)) || {
      planId,
      name: planId === 'yearly' ? 'Student OS Pro Yearly' : 'Student OS Pro Monthly',
      durationDays: planId === 'yearly' ? 365 : 30,
      priceCents: planId === 'yearly' ? 29900 : 3000,
      currency: 'INR',
      features: ALL_STUDENT_OS_FEATURES,
    };

    const now = new Date();
    const startDate = now.toISOString();
    let expiryDate: string | null = null;

    if (plan.durationDays) {
      const exp = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      expiryDate = exp.toISOString();
    }

    // 2. Mark previous active subscriptions as superseded
    await this.repo.updatePreviousActiveSubscriptions(accountId, 'superseded');

    // 3. Create new payment subscription
    const subscriptionId = crypto.randomUUID();
    const sub: SubscriptionDto = {
      subscriptionId,
      accountId,
      planId: plan.planId,
      planName: plan.name,
      status: 'active',
      source: 'payment',
      grantedBy: null,
      startDate,
      expiryDate,
      cancelledAt: null,
      paymentReference,
      createdAt: startDate,
      updatedAt: startDate,
    };
    await this.repo.createSubscription(sub);

    // 4. Upsert Entitlement with canonical features
    const entitlement: EntitlementDto = {
      entitlementId: crypto.randomUUID(),
      accountId,
      currentPlanId: plan.planId,
      planName: plan.name,
      status: 'active',
      isPaid: true,
      features: plan.features && plan.features.length > 0 ? plan.features : ALL_STUDENT_OS_FEATURES,
      expiresAt: expiryDate,
      lastVerifiedAt: startDate,
      createdAt: startDate,
      updatedAt: startDate,
    };
    await this.repo.upsertEntitlement(entitlement);

    // 5. Create immutable audit log
    await this.repo.createAuditLog({
      id: crypto.randomUUID(),
      accountId,
      eventType: 'ENTITLEMENT_ACTIVATED_PAYMENT',
      planId: plan.planId,
      grantedBy: 'system:payment',
      source: 'payment',
      startDate,
      expiryDate,
      details: {
        paymentReference,
        provider: params.providerName || this.paymentProvider.name,
        amountCents: params.amountCents || plan.priceCents,
      },
      createdAt: startDate,
    });

    return {
      subscription: sub,
      entitlement,
      alreadyProcessed: false,
    };
  }

  /**
   * Verify client-submitted payment completion and activate entitlement.
   */
  async verifyAndActivatePayment(params: {
    accountId: string;
    planId: string;
    orderId: string;
    paymentId: string;
    signature?: string;
  }): Promise<{
    verified: boolean;
    subscription?: SubscriptionDto;
    entitlement?: EntitlementDto;
    error?: string;
  }> {
    const verification = await this.paymentProvider.verifyPayment({
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
    });

    if (!verification.success) {
      return {
        verified: false,
        error: verification.error || 'Payment signature verification failed.',
      };
    }

    const activation = await this.activatePaidEntitlementFromPayment({
      accountId: params.accountId,
      planId: params.planId,
      paymentReference: params.paymentId,
      providerName: this.paymentProvider.name,
    });

    return {
      verified: true,
      subscription: activation.subscription,
      entitlement: activation.entitlement,
    };
  }

  /**
   * Process incoming Webhook event from Payment Provider.
   */
  async processWebhook(params: {
    rawBody: string;
    signature: string;
    secret?: string;
  }): Promise<{ handled: boolean; actionTaken?: string }> {
    const isVerified = await this.paymentProvider.verifyWebhook(
      params.rawBody,
      params.signature,
      params.secret || ''
    );

    if (!isVerified) {
      throw new Error('INVALID_WEBHOOK_SIGNATURE: Webhook signature verification failed.');
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(params.rawBody);
    } catch {
      throw new Error('INVALID_WEBHOOK_PAYLOAD: Failed to parse JSON payload.');
    }

    const event = (payload.event as string) || 'unknown';
    const result = await this.paymentProvider.handleWebhook({
      event,
      payload,
      rawBody: params.rawBody,
      signature: params.signature,
    });

    if (result.actionTaken === 'activate_entitlement' && result.accountId && result.planId && result.paymentId) {
      await this.activatePaidEntitlementFromPayment({
        accountId: result.accountId,
        planId: result.planId,
        paymentReference: result.paymentId,
      });
    }

    return { handled: result.handled, actionTaken: result.actionTaken };
  }
}
