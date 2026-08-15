import {
  ALL_STUDENT_OS_FEATURES,
  type EntitlementDto,
  type SubscriptionDto,
  type PaymentDto,
  type PlanDto,
} from '@student-os/shared';

export const SUBSCRIPTION_ERRORS = {
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  INVALID_PLAN: 'INVALID_PLAN',
  INVALID_DURATION: 'INVALID_DURATION',
  NO_ACTIVE_SUBSCRIPTION: 'NO_ACTIVE_SUBSCRIPTION',
  DUPLICATE_PAYMENT_REFERENCE: 'DUPLICATE_PAYMENT_REFERENCE',
  SUBSCRIPTION_CONFLICT: 'SUBSCRIPTION_CONFLICT',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  INVALID_PAYMENT_DATA: 'INVALID_PAYMENT_DATA',
  INVALID_REASON: 'INVALID_REASON',
} as const;

export class SubscriptionDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(`${code}: ${message}`);
    this.name = 'SubscriptionDomainError';
  }
}

export interface GrantProParams {
  accountId: string;
  planId: 'monthly' | 'yearly';
  durationDays?: number;
  reason: string;
  adminAccountId: string;
  paymentId?: string | null;
}

export interface ExtendSubscriptionParams {
  accountId: string;
  durationDays: number;
  reason: string;
  adminAccountId: string;
}

export interface ChangePlanParams {
  accountId: string;
  newPlanId: 'monthly' | 'yearly';
  reason: string;
  adminAccountId: string;
}

export interface RevokeAccessParams {
  accountId: string;
  reason: string;
  adminAccountId: string;
}

export interface RecordPaymentAndActivateParams {
  accountId: string;
  amountPaise?: number;
  discountPercent?: number;
  currency?: string;
  paymentMethod: 'upi' | 'bank_transfer' | 'cash' | 'razorpay' | 'complimentary';
  transactionReference?: string | null;
  planId: 'monthly' | 'yearly';
  durationDays?: number;
  notes?: string | null;
  receiptUrl?: string | null;
  adminAccountId: string;
}

interface AccountRow {
  account_id: string;
  email: string;
}

interface PlanRow {
  plan_id: string;
  name: string;
  price_cents: number;
  duration_days: number | null;
  features: string;
  is_active: number;
}

interface EntitlementRow {
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

export class SubscriptionManagementService {
  constructor(private readonly db: D1Database) {}

  /**
   * Helper to fetch account by ID and verify existence.
   */
  private async getAccount(accountId: string): Promise<AccountRow> {
    if (!accountId || typeof accountId !== 'string') {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.ACCOUNT_NOT_FOUND,
        'Valid accountId is required.'
      );
    }
    const stmt = this.db.prepare('SELECT account_id, email FROM accounts WHERE account_id = ?').bind(accountId);
    const row = await stmt.first<AccountRow>();
    if (!row) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.ACCOUNT_NOT_FOUND,
        `Account not found for accountId: ${accountId}`
      );
    }
    return row;
  }

  /**
   * Helper to fetch plan by ID and verify validity for paid subscription.
   */
  private async getPlan(planId: string): Promise<PlanRow> {
    if (planId !== 'monthly' && planId !== 'yearly') {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_PLAN,
        `Invalid paid plan ID: ${planId}. Only 'monthly' and 'yearly' are valid for Pro subscriptions.`
      );
    }
    const stmt = this.db.prepare('SELECT * FROM plans WHERE plan_id = ?').bind(planId);
    const row = await stmt.first<PlanRow>();
    if (!row || row.is_active !== 1) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.PLAN_NOT_FOUND,
        `Plan not found or inactive: ${planId}`
      );
    }
    return row;
  }

  /**
   * Helper to fetch current entitlement record for account.
   */
  private async getEntitlement(accountId: string): Promise<EntitlementRow | null> {
    const stmt = this.db.prepare('SELECT * FROM entitlements WHERE account_id = ?').bind(accountId);
    return await stmt.first<EntitlementRow>();
  }

  /**
   * 1. Grant Pro Access (State A / State D / Revoked -> State B)
   * Atomically supersedes previous active subscription, writes new subscription,
   * updates authoritative entitlement, and records immutable audit log.
   */
  async grantProAccess(params: GrantProParams): Promise<{
    subscription: SubscriptionDto;
    entitlement: EntitlementDto;
    auditLogId: string;
  }> {
    const { accountId, planId, reason, adminAccountId, paymentId } = params;

    if (!reason || reason.trim().length < 3) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_REASON,
        'A valid reason (minimum 3 characters) is required for granting access.'
      );
    }

    if (!adminAccountId) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.ACCOUNT_NOT_FOUND,
        'Authoritative adminAccountId is required.'
      );
    }

    await this.getAccount(accountId);
    const plan = await this.getPlan(planId);

    let durationDays = params.durationDays;
    if (durationDays !== undefined) {
      if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 3650) {
        throw new SubscriptionDomainError(
          SUBSCRIPTION_ERRORS.INVALID_DURATION,
          'durationDays must be an integer between 1 and 3650.'
        );
      }
    } else {
      durationDays = plan.duration_days || (planId === 'yearly' ? 365 : 30);
    }

    const currentEnt = await this.getEntitlement(accountId);
    const now = new Date();
    const startDate = now.toISOString();
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const subscriptionId = crypto.randomUUID();
    const auditLogId = crypto.randomUUID();

    const planFeatures: string[] = plan.features ? JSON.parse(plan.features) : ALL_STUDENT_OS_FEATURES;
    const finalFeatures = planFeatures.length > 0 ? planFeatures : ALL_STUDENT_OS_FEATURES;

    // 1. Supersede previous active subscriptions
    const stmt1 = this.db
      .prepare(`UPDATE subscriptions SET status = 'superseded', updated_at = ? WHERE account_id = ? AND status = 'active'`)
      .bind(startDate, accountId);

    // 2. Insert new active subscription
    const stmt2 = this.db
      .prepare(
        `INSERT INTO subscriptions (
          subscription_id, account_id, plan_id, status, source,
          granted_by, start_date, expiry_date, cancelled_at,
          payment_reference, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 'manual', ?, ?, ?, NULL, ?, ?, ?)`
      )
      .bind(
        subscriptionId,
        accountId,
        plan.plan_id,
        adminAccountId,
        startDate,
        expiryDate,
        paymentId || null,
        startDate,
        startDate
      );

    // 3. Upsert authoritative entitlement
    const entitlementId = currentEnt ? currentEnt.entitlement_id : crypto.randomUUID();
    const stmt3 = this.db
      .prepare(
        `INSERT INTO entitlements (
          entitlement_id, account_id, current_plan_id, status, is_paid,
          features, expires_at, last_verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 1, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          current_plan_id = excluded.current_plan_id,
          status = 'active',
          is_paid = 1,
          features = excluded.features,
          expires_at = excluded.expires_at,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at`
      )
      .bind(
        entitlementId,
        accountId,
        plan.plan_id,
        JSON.stringify(finalFeatures),
        expiryDate,
        startDate,
        currentEnt ? currentEnt.created_at : startDate,
        startDate
      );

    // 4. Record audit log
    const auditDetails = {
      action: 'GRANT_PRO',
      reason: reason.trim(),
      durationDays,
      previousPlanId: currentEnt?.current_plan_id || null,
      previousStatus: currentEnt?.status || null,
      previousExpiry: currentEnt?.expires_at || null,
      newExpiry: expiryDate,
      paymentId: paymentId || null,
      adminAccountId,
    };

    const stmt4 = this.db
      .prepare(
        `INSERT INTO entitlement_audit_logs (
          id, account_id, event_type, plan_id, granted_by,
          source, start_date, expiry_date, details, created_at
        ) VALUES (?, ?, 'ENTITLEMENT_MANUALLY_GRANTED', ?, ?, 'manual', ?, ?, ?, ?)`
      )
      .bind(
        auditLogId,
        accountId,
        plan.plan_id,
        adminAccountId,
        startDate,
        expiryDate,
        JSON.stringify(auditDetails),
        startDate
      );

    // Execute multi-table transaction atomically
    await this.db.batch([stmt1, stmt2, stmt3, stmt4]);

    const subscription: SubscriptionDto = {
      subscriptionId,
      accountId,
      planId: plan.plan_id,
      planName: plan.name,
      status: 'active',
      source: 'manual',
      grantedBy: adminAccountId,
      startDate,
      expiryDate,
      cancelledAt: null,
      paymentReference: paymentId || null,
      createdAt: startDate,
      updatedAt: startDate,
    };

    const entitlement: EntitlementDto = {
      entitlementId,
      accountId,
      currentPlanId: plan.plan_id,
      planName: plan.name,
      status: 'active',
      isPaid: true,
      features: finalFeatures,
      expiresAt: expiryDate,
      lastVerifiedAt: startDate,
      createdAt: currentEnt ? currentEnt.created_at : startDate,
      updatedAt: startDate,
    };

    return { subscription, entitlement, auditLogId };
  }

  /**
   * 2. Extend / Renew Subscription
   * If currently active: newExpiry = currentExpiry + durationDays (preserves remaining days).
   * If expired: newExpiry = now + durationDays.
   */
  async extendSubscription(params: ExtendSubscriptionParams): Promise<{
    subscription: SubscriptionDto;
    entitlement: EntitlementDto;
    auditLogId: string;
  }> {
    const { accountId, durationDays, reason, adminAccountId } = params;

    if (!reason || reason.trim().length < 3) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_REASON,
        'A valid reason (minimum 3 characters) is required for extending access.'
      );
    }

    if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 3650) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_DURATION,
        'durationDays must be an integer between 1 and 3650.'
      );
    }

    await this.getAccount(accountId);
    const currentEnt = await this.getEntitlement(accountId);

    const now = new Date();
    const startDate = now.toISOString();

    // Determine target plan
    let planId = currentEnt?.current_plan_id;
    if (planId !== 'yearly') {
      planId = 'monthly';
    }
    const plan = await this.getPlan(planId);

    // Calculate extension expiry
    let newExpiryDate: string;
    const isCurrentlyActive = currentEnt && currentEnt.status === 'active' && currentEnt.expires_at;
    const hasRemainingTime = isCurrentlyActive && new Date(currentEnt.expires_at!).getTime() > now.getTime();

    if (hasRemainingTime) {
      // Active Extension Rule: extend from existing expiry date
      const existingExpiryMs = new Date(currentEnt.expires_at!).getTime();
      newExpiryDate = new Date(existingExpiryMs + durationDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Expired / New Term Rule: extend from now
      newExpiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const subscriptionId = crypto.randomUUID();
    const auditLogId = crypto.randomUUID();
    const planFeatures: string[] = plan.features ? JSON.parse(plan.features) : ALL_STUDENT_OS_FEATURES;
    const finalFeatures = planFeatures.length > 0 ? planFeatures : ALL_STUDENT_OS_FEATURES;

    // 1. Supersede previous active subscriptions
    const stmt1 = this.db
      .prepare(`UPDATE subscriptions SET status = 'superseded', updated_at = ? WHERE account_id = ? AND status = 'active'`)
      .bind(startDate, accountId);

    // 2. Insert new extension subscription
    const stmt2 = this.db
      .prepare(
        `INSERT INTO subscriptions (
          subscription_id, account_id, plan_id, status, source,
          granted_by, start_date, expiry_date, cancelled_at,
          payment_reference, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 'manual', ?, ?, ?, NULL, NULL, ?, ?)`
      )
      .bind(
        subscriptionId,
        accountId,
        plan.plan_id,
        adminAccountId,
        startDate,
        newExpiryDate,
        startDate,
        startDate
      );

    // 3. Upsert authoritative entitlement
    const entitlementId = currentEnt ? currentEnt.entitlement_id : crypto.randomUUID();
    const stmt3 = this.db
      .prepare(
        `INSERT INTO entitlements (
          entitlement_id, account_id, current_plan_id, status, is_paid,
          features, expires_at, last_verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 1, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          current_plan_id = excluded.current_plan_id,
          status = 'active',
          is_paid = 1,
          features = excluded.features,
          expires_at = excluded.expires_at,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at`
      )
      .bind(
        entitlementId,
        accountId,
        plan.plan_id,
        JSON.stringify(finalFeatures),
        newExpiryDate,
        startDate,
        currentEnt ? currentEnt.created_at : startDate,
        startDate
      );

    // 4. Record audit log
    const auditDetails = {
      action: 'EXTEND_SUBSCRIPTION',
      reason: reason.trim(),
      durationDays,
      wasActive: Boolean(hasRemainingTime),
      previousExpiry: currentEnt?.expires_at || null,
      newExpiry: newExpiryDate,
      adminAccountId,
    };

    const stmt4 = this.db
      .prepare(
        `INSERT INTO entitlement_audit_logs (
          id, account_id, event_type, plan_id, granted_by,
          source, start_date, expiry_date, details, created_at
        ) VALUES (?, ?, 'ENTITLEMENT_EXTENDED', ?, ?, 'manual', ?, ?, ?, ?)`
      )
      .bind(
        auditLogId,
        accountId,
        plan.plan_id,
        adminAccountId,
        startDate,
        newExpiryDate,
        JSON.stringify(auditDetails),
        startDate
      );

    await this.db.batch([stmt1, stmt2, stmt3, stmt4]);

    const subscription: SubscriptionDto = {
      subscriptionId,
      accountId,
      planId: plan.plan_id,
      planName: plan.name,
      status: 'active',
      source: 'manual',
      grantedBy: adminAccountId,
      startDate,
      expiryDate: newExpiryDate,
      cancelledAt: null,
      paymentReference: null,
      createdAt: startDate,
      updatedAt: startDate,
    };

    const entitlement: EntitlementDto = {
      entitlementId,
      accountId,
      currentPlanId: plan.plan_id,
      planName: plan.name,
      status: 'active',
      isPaid: true,
      features: finalFeatures,
      expiresAt: newExpiryDate,
      lastVerifiedAt: startDate,
      createdAt: currentEnt ? currentEnt.created_at : startDate,
      updatedAt: startDate,
    };

    return { subscription, entitlement, auditLogId };
  }

  /**
   * 3. Change Plan (Monthly <-> Yearly)
   * Supersedes previous subscription and begins the new plan immediately.
   */
  async changePlan(params: ChangePlanParams): Promise<{
    subscription: SubscriptionDto;
    entitlement: EntitlementDto;
    auditLogId: string;
  }> {
    const { accountId, newPlanId, reason, adminAccountId } = params;

    if (!reason || reason.trim().length < 3) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_REASON,
        'A valid reason (minimum 3 characters) is required for changing plan.'
      );
    }

    await this.getAccount(accountId);
    const newPlan = await this.getPlan(newPlanId);
    const currentEnt = await this.getEntitlement(accountId);

    const now = new Date();
    const startDate = now.toISOString();
    const durationDays = newPlan.duration_days || (newPlanId === 'yearly' ? 365 : 30);
    const newExpiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const subscriptionId = crypto.randomUUID();
    const auditLogId = crypto.randomUUID();
    const planFeatures: string[] = newPlan.features ? JSON.parse(newPlan.features) : ALL_STUDENT_OS_FEATURES;
    const finalFeatures = planFeatures.length > 0 ? planFeatures : ALL_STUDENT_OS_FEATURES;

    // 1. Supersede previous active subscriptions
    const stmt1 = this.db
      .prepare(`UPDATE subscriptions SET status = 'superseded', updated_at = ? WHERE account_id = ? AND status = 'active'`)
      .bind(startDate, accountId);

    // 2. Insert new subscription
    const stmt2 = this.db
      .prepare(
        `INSERT INTO subscriptions (
          subscription_id, account_id, plan_id, status, source,
          granted_by, start_date, expiry_date, cancelled_at,
          payment_reference, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 'manual', ?, ?, ?, NULL, NULL, ?, ?)`
      )
      .bind(
        subscriptionId,
        accountId,
        newPlan.plan_id,
        adminAccountId,
        startDate,
        newExpiryDate,
        startDate,
        startDate
      );

    // 3. Upsert entitlement
    const entitlementId = currentEnt ? currentEnt.entitlement_id : crypto.randomUUID();
    const stmt3 = this.db
      .prepare(
        `INSERT INTO entitlements (
          entitlement_id, account_id, current_plan_id, status, is_paid,
          features, expires_at, last_verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 1, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          current_plan_id = excluded.current_plan_id,
          status = 'active',
          is_paid = 1,
          features = excluded.features,
          expires_at = excluded.expires_at,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at`
      )
      .bind(
        entitlementId,
        accountId,
        newPlan.plan_id,
        JSON.stringify(finalFeatures),
        newExpiryDate,
        startDate,
        currentEnt ? currentEnt.created_at : startDate,
        startDate
      );

    // 4. Record audit log
    const auditDetails = {
      action: 'CHANGE_PLAN',
      reason: reason.trim(),
      previousPlanId: currentEnt?.current_plan_id || null,
      newPlanId: newPlan.plan_id,
      previousExpiry: currentEnt?.expires_at || null,
      newExpiry: newExpiryDate,
      adminAccountId,
    };

    const stmt4 = this.db
      .prepare(
        `INSERT INTO entitlement_audit_logs (
          id, account_id, event_type, plan_id, granted_by,
          source, start_date, expiry_date, details, created_at
        ) VALUES (?, ?, 'ENTITLEMENT_PLAN_CHANGED', ?, ?, 'manual', ?, ?, ?, ?)`
      )
      .bind(
        auditLogId,
        accountId,
        newPlan.plan_id,
        adminAccountId,
        startDate,
        newExpiryDate,
        JSON.stringify(auditDetails),
        startDate
      );

    await this.db.batch([stmt1, stmt2, stmt3, stmt4]);

    const subscription: SubscriptionDto = {
      subscriptionId,
      accountId,
      planId: newPlan.plan_id,
      planName: newPlan.name,
      status: 'active',
      source: 'manual',
      grantedBy: adminAccountId,
      startDate,
      expiryDate: newExpiryDate,
      cancelledAt: null,
      paymentReference: null,
      createdAt: startDate,
      updatedAt: startDate,
    };

    const entitlement: EntitlementDto = {
      entitlementId,
      accountId,
      currentPlanId: newPlan.plan_id,
      planName: newPlan.name,
      status: 'active',
      isPaid: true,
      features: finalFeatures,
      expiresAt: newExpiryDate,
      lastVerifiedAt: startDate,
      createdAt: currentEnt ? currentEnt.created_at : startDate,
      updatedAt: startDate,
    };

    return { subscription, entitlement, auditLogId };
  }

  /**
   * 4. Revoke Access
   * Sets active subscription(s) to 'revoked', resets entitlement to status: 'revoked',
   * is_paid: 0, features: [], and preserves 100% of student academic data.
   */
  async revokeAccess(params: RevokeAccessParams): Promise<{
    entitlement: EntitlementDto;
    auditLogId: string;
  }> {
    const { accountId, reason, adminAccountId } = params;

    if (!reason || reason.trim().length < 3) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_REASON,
        'A valid reason (minimum 3 characters) is required for revoking access.'
      );
    }

    await this.getAccount(accountId);
    const currentEnt = await this.getEntitlement(accountId);

    const now = new Date().toISOString();
    const auditLogId = crypto.randomUUID();

    // 1. Mark active subscriptions as revoked
    const stmt1 = this.db
      .prepare(`UPDATE subscriptions SET status = 'revoked', updated_at = ? WHERE account_id = ? AND status = 'active'`)
      .bind(now, accountId);

    // 2. Revert entitlement to revoked state with no features
    const entitlementId = currentEnt ? currentEnt.entitlement_id : crypto.randomUUID();
    const fallbackPlanId = currentEnt?.current_plan_id || 'free_trial';

    const stmt2 = this.db
      .prepare(
        `INSERT INTO entitlements (
          entitlement_id, account_id, current_plan_id, status, is_paid,
          features, expires_at, last_verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'revoked', 0, '[]', NULL, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          status = 'revoked',
          is_paid = 0,
          features = '[]',
          expires_at = NULL,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at`
      )
      .bind(
        entitlementId,
        accountId,
        fallbackPlanId,
        now,
        currentEnt ? currentEnt.created_at : now,
        now
      );

    // 3. Log audit event
    const auditDetails = {
      action: 'REVOKE_ACCESS',
      reason: reason.trim(),
      previousPlanId: currentEnt?.current_plan_id || null,
      previousStatus: currentEnt?.status || null,
      previousExpiry: currentEnt?.expires_at || null,
      adminAccountId,
    };

    const stmt3 = this.db
      .prepare(
        `INSERT INTO entitlement_audit_logs (
          id, account_id, event_type, plan_id, granted_by,
          source, start_date, expiry_date, details, created_at
        ) VALUES (?, ?, 'ENTITLEMENT_REVOKED', ?, ?, 'manual', ?, NULL, ?, ?)`
      )
      .bind(
        auditLogId,
        accountId,
        fallbackPlanId,
        adminAccountId,
        now,
        JSON.stringify(auditDetails),
        now
      );

    await this.db.batch([stmt1, stmt2, stmt3]);

    const entitlement: EntitlementDto = {
      entitlementId,
      accountId,
      currentPlanId: fallbackPlanId,
      planName: fallbackPlanId,
      status: 'revoked',
      isPaid: false,
      features: [],
      expiresAt: null,
      lastVerifiedAt: now,
      createdAt: currentEnt ? currentEnt.created_at : now,
      updatedAt: now,
    };

    return { entitlement, auditLogId };
  }

  /**
   * 5. Record Payment & Activate Pro Access
   * Atomically records offline or gateway payment, updates subscriptions,
   * activates paid entitlement, and writes audit trail in a single batch.
   */
  async recordPaymentAndActivate(params: RecordPaymentAndActivateParams): Promise<{
    payment: PaymentDto;
    subscription: SubscriptionDto;
    entitlement: EntitlementDto;
    auditLogId: string;
  }> {
    const {
      accountId,
      amountPaise,
      currency = 'INR',
      paymentMethod,
      transactionReference,
      planId,
      notes,
      receiptUrl,
      adminAccountId,
    } = params;

    // Validate payment method
    const validMethods = ['upi', 'bank_transfer', 'cash', 'razorpay', 'complimentary'];
    if (!validMethods.includes(paymentMethod)) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_PAYMENT_METHOD,
        `Invalid payment method: ${paymentMethod}. Supported: ${validMethods.join(', ')}`
      );
    }

    // Validate discount percentage (authoritative)
    const discountPercent = params.discountPercent ?? 0;
    if (
      typeof discountPercent !== 'number' ||
      !Number.isInteger(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.INVALID_PAYMENT_DATA,
        'discountPercent must be an integer between 0 and 100.'
      );
    }

    if (!adminAccountId) {
      throw new SubscriptionDomainError(
        SUBSCRIPTION_ERRORS.ACCOUNT_NOT_FOUND,
        'Authoritative adminAccountId is required.'
      );
    }

    // Verify account and plan
    await this.getAccount(accountId);
    const plan = await this.getPlan(planId);

    // Calculate authoritative monetary amounts in integer paise
    const listPricePaise = plan.price_cents ?? (planId === 'yearly' ? 249900 : 29900);
    const discountAmountPaise = Math.round((listPricePaise * discountPercent) / 100);
    const finalAmountPaise = Math.max(0, listPricePaise - discountAmountPaise);

    // Semantic validations for 100% discount vs paid purchases
    if (finalAmountPaise === 0) {
      if (!notes || notes.trim().length < 3) {
        throw new SubscriptionDomainError(
          SUBSCRIPTION_ERRORS.INVALID_REASON,
          'A valid note or reason (minimum 3 characters) is required for 100% discounted purchases.'
        );
      }
    } else {
      if (paymentMethod === 'complimentary') {
        throw new SubscriptionDomainError(
          SUBSCRIPTION_ERRORS.INVALID_PAYMENT_DATA,
          'Complimentary payment method is only valid for ₹0 transactions.'
        );
      }
    }

    // Duplicate transaction reference check (if reference supplied)
    const rawRef = transactionReference?.trim() || null;
    // For 100% discount without explicit reference, allow null without conflict
    const cleanRef = rawRef || null;
    if (cleanRef) {
      const checkStmt = this.db
        .prepare('SELECT payment_id FROM payments WHERE transaction_reference = ?')
        .bind(cleanRef);
      const existingPayment = await checkStmt.first<{ payment_id: string }>();
      if (existingPayment) {
        throw new SubscriptionDomainError(
          SUBSCRIPTION_ERRORS.DUPLICATE_PAYMENT_REFERENCE,
          `Duplicate transaction reference: '${cleanRef}' has already been recorded in payment ${existingPayment.payment_id}.`
        );
      }
    }

    // Determine duration
    let durationDays = params.durationDays;
    if (durationDays !== undefined) {
      if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 3650) {
        throw new SubscriptionDomainError(
          SUBSCRIPTION_ERRORS.INVALID_DURATION,
          'durationDays must be an integer between 1 and 3650.'
        );
      }
    } else {
      durationDays = plan.duration_days || (planId === 'yearly' ? 365 : 30);
    }

    const currentEnt = await this.getEntitlement(accountId);
    const now = new Date();
    const startDate = now.toISOString();

    // Calculate expiry (if active pro with future expiry, extend from current expiry)
    let expiryDate: string;
    const isCurrentlyActive = currentEnt && currentEnt.status === 'active' && currentEnt.expires_at;
    const hasRemainingTime = isCurrentlyActive && new Date(currentEnt.expires_at!).getTime() > now.getTime();

    if (hasRemainingTime) {
      const existingExpiryMs = new Date(currentEnt.expires_at!).getTime();
      expiryDate = new Date(existingExpiryMs + durationDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const paymentId = crypto.randomUUID();
    const subscriptionId = crypto.randomUUID();
    const auditLogId = crypto.randomUUID();
    const planFeatures: string[] = plan.features ? JSON.parse(plan.features) : ALL_STUDENT_OS_FEATURES;
    const finalFeatures = planFeatures.length > 0 ? planFeatures : ALL_STUDENT_OS_FEATURES;

    // Statement 1: Insert Payment row with discount provenance
    const stmt1 = this.db
      .prepare(
        `INSERT INTO payments (
          payment_id, account_id, subscription_id, amount_paise,
          original_amount_paise, discount_percent, discount_amount_paise,
          currency, payment_method, transaction_reference, status, source, recorded_by,
          notes, receipt_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'captured', 'manual_admin', ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentId,
        accountId,
        subscriptionId,
        finalAmountPaise,
        listPricePaise,
        discountPercent,
        discountAmountPaise,
        currency,
        paymentMethod,
        cleanRef,
        adminAccountId,
        notes?.trim() || null,
        receiptUrl || null,
        startDate,
        startDate
      );

    // Statement 2: Supersede previous active subscriptions
    const stmt2 = this.db
      .prepare(`UPDATE subscriptions SET status = 'superseded', updated_at = ? WHERE account_id = ? AND status = 'active'`)
      .bind(startDate, accountId);

    // Statement 3: Insert new payment subscription
    const stmt3 = this.db
      .prepare(
        `INSERT INTO subscriptions (
          subscription_id, account_id, plan_id, status, source,
          granted_by, start_date, expiry_date, cancelled_at,
          payment_reference, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 'payment', ?, ?, ?, NULL, ?, ?, ?)`
      )
      .bind(
        subscriptionId,
        accountId,
        plan.plan_id,
        adminAccountId,
        startDate,
        expiryDate,
        cleanRef || paymentId,
        startDate,
        startDate
      );

    // Statement 4: Upsert authoritative entitlement
    const entitlementId = currentEnt ? currentEnt.entitlement_id : crypto.randomUUID();
    const stmt4 = this.db
      .prepare(
        `INSERT INTO entitlements (
          entitlement_id, account_id, current_plan_id, status, is_paid,
          features, expires_at, last_verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', 1, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          current_plan_id = excluded.current_plan_id,
          status = 'active',
          is_paid = 1,
          features = excluded.features,
          expires_at = excluded.expires_at,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at`
      )
      .bind(
        entitlementId,
        accountId,
        plan.plan_id,
        JSON.stringify(finalFeatures),
        expiryDate,
        startDate,
        currentEnt ? currentEnt.created_at : startDate,
        startDate
      );

    // Statement 5: Insert audit log with discount metadata
    const auditDetails = {
      action: 'PAYMENT_ACTIVATED',
      paymentId,
      listPricePaise,
      discountPercent,
      discountAmountPaise,
      finalAmountPaise,
      amountPaise: finalAmountPaise,
      currency,
      paymentMethod,
      transactionReference: cleanRef,
      planId: plan.plan_id,
      durationDays,
      previousExpiry: currentEnt?.expires_at || null,
      newExpiry: expiryDate,
      notes: notes?.trim() || null,
      adminAccountId,
    };

    const stmt5 = this.db
      .prepare(
        `INSERT INTO entitlement_audit_logs (
          id, account_id, event_type, plan_id, granted_by,
          source, start_date, expiry_date, details, created_at
        ) VALUES (?, ?, 'ENTITLEMENT_ACTIVATED_PAYMENT', ?, ?, 'payment', ?, ?, ?, ?)`
      )
      .bind(
        auditLogId,
        accountId,
        plan.plan_id,
        adminAccountId,
        startDate,
        expiryDate,
        JSON.stringify(auditDetails),
        startDate
      );

    // Execute all 5 statements atomically
    await this.db.batch([stmt1, stmt2, stmt3, stmt4, stmt5]);

    const payment: PaymentDto = {
      paymentId,
      accountId,
      subscriptionId,
      amountPaise: finalAmountPaise,
      originalAmountPaise: listPricePaise,
      discountPercent,
      discountAmountPaise,
      currency,
      paymentMethod,
      transactionReference: cleanRef,
      status: 'captured',
      source: 'manual_admin',
      recordedBy: adminAccountId,
      notes: notes?.trim() || null,
      receiptUrl: receiptUrl || null,
      createdAt: startDate,
      updatedAt: startDate,
    };

    const subscription: SubscriptionDto = {
      subscriptionId,
      accountId,
      planId: plan.plan_id,
      planName: plan.name,
      status: 'active',
      source: 'payment',
      grantedBy: adminAccountId,
      startDate,
      expiryDate,
      cancelledAt: null,
      paymentReference: cleanRef || paymentId,
      createdAt: startDate,
      updatedAt: startDate,
    };

    const entitlement: EntitlementDto = {
      entitlementId,
      accountId,
      currentPlanId: plan.plan_id,
      planName: plan.name,
      status: 'active',
      isPaid: true,
      features: finalFeatures,
      expiresAt: expiryDate,
      lastVerifiedAt: startDate,
      createdAt: currentEnt ? currentEnt.created_at : startDate,
      updatedAt: startDate,
    };

    return { payment, subscription, entitlement, auditLogId };
  }
}
