import type {
  PlanDto,
  SubscriptionDto,
  EntitlementDto,
  EntitlementAuditLogDto,
  SubscriptionStatus,
} from '@student-os/shared';

interface PlanRow {
  plan_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_days: number | null;
  features: string;
  is_active: number;
  payment_provider_product_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionRow {
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
  plan_name?: string;
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
  plan_name?: string;
}

interface AuditLogRow {
  id: string;
  account_id: string;
  event_type: string;
  plan_id: string;
  granted_by: string;
  source: string;
  start_date: string;
  expiry_date: string | null;
  details: string | null;
  created_at: string;
}

export interface TrialClaimRecord {
  claim_id: string;
  email_hash: string;
  first_claimed_at: string;
  trial_expires_at: string;
}

interface AccountRow {
  account_id: string;
  email: string;
  created_at: string;
  last_login_at: string;
}

export class EntitlementRepository {
  constructor(private db: D1Database) {}

  async getAllPlans(activeOnly = true): Promise<PlanDto[]> {
    const query = activeOnly
      ? 'SELECT * FROM plans WHERE is_active = 1 ORDER BY price_cents ASC'
      : 'SELECT * FROM plans ORDER BY price_cents ASC';
    const stmt = this.db.prepare(query);
    const result = await stmt.all<PlanRow>();

    return (result.results || []).map((row) => ({
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      priceCents: row.price_cents,
      currency: row.currency,
      durationDays: row.duration_days,
      features: JSON.parse(row.features || '[]'),
      isActive: row.is_active === 1,
      paymentProviderProductId: row.payment_provider_product_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getPlanById(planId: string): Promise<PlanDto | null> {
    const stmt = this.db.prepare('SELECT * FROM plans WHERE plan_id = ?').bind(planId);
    const row = await stmt.first<PlanRow>();
    if (!row) return null;

    return {
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      priceCents: row.price_cents,
      currency: row.currency,
      durationDays: row.duration_days,
      features: JSON.parse(row.features || '[]'),
      isActive: row.is_active === 1,
      paymentProviderProductId: row.payment_provider_product_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAccountByEmail(email: string): Promise<AccountRow | null> {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE LOWER(email) = LOWER(?)').bind(email.trim());
    return await stmt.first<AccountRow>();
  }

  async getAccountById(accountId: string): Promise<AccountRow | null> {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE account_id = ?').bind(accountId);
    return await stmt.first<AccountRow>();
  }

  async getEntitlementByAccountId(accountId: string): Promise<EntitlementDto | null> {
    const stmt = this.db.prepare(`
      SELECT e.*, p.name as plan_name
      FROM entitlements e
      LEFT JOIN plans p ON e.current_plan_id = p.plan_id
      WHERE e.account_id = ?
    `).bind(accountId);
    const row = await stmt.first<EntitlementRow>();
    if (!row) return null;

    return {
      entitlementId: row.entitlement_id,
      accountId: row.account_id,
      currentPlanId: row.current_plan_id,
      planName: row.plan_name || row.current_plan_id,
      status: row.status as any,
      isPaid: row.is_paid === 1,
      features: JSON.parse(row.features || '[]'),
      expiresAt: row.expires_at,
      lastVerifiedAt: row.last_verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async upsertEntitlement(entitlement: {
    entitlementId: string;
    accountId: string;
    currentPlanId: string;
    status: string;
    isPaid: boolean;
    features: string[];
    expiresAt: string | null;
    lastVerifiedAt: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO entitlements (
        entitlement_id, account_id, current_plan_id, status, is_paid,
        features, expires_at, last_verified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        current_plan_id = excluded.current_plan_id,
        status = excluded.status,
        is_paid = excluded.is_paid,
        features = excluded.features,
        expires_at = excluded.expires_at,
        last_verified_at = excluded.last_verified_at,
        updated_at = excluded.updated_at
    `).bind(
      entitlement.entitlementId,
      entitlement.accountId,
      entitlement.currentPlanId,
      entitlement.status,
      entitlement.isPaid ? 1 : 0,
      JSON.stringify(entitlement.features),
      entitlement.expiresAt,
      entitlement.lastVerifiedAt,
      entitlement.createdAt,
      entitlement.updatedAt
    );
    await stmt.run();
  }

  async createInitialTrialSubscription(sub: {
    subscriptionId: string;
    accountId: string;
    planId: string;
    status: SubscriptionStatus;
    source: string;
    grantedBy: string | null;
    startDate: string;
    expiryDate: string | null;
    cancelledAt?: string | null;
    paymentReference: string | null;
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO subscriptions (
        subscription_id, account_id, plan_id, status, source,
        granted_by, start_date, expiry_date, cancelled_at,
        payment_reference, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM subscriptions WHERE account_id = ? AND source = 'trial'
      )
    `).bind(
      sub.subscriptionId,
      sub.accountId,
      sub.planId,
      sub.status,
      sub.source,
      sub.grantedBy,
      sub.startDate,
      sub.expiryDate,
      sub.cancelledAt || null,
      sub.paymentReference,
      sub.createdAt,
      sub.updatedAt,
      sub.accountId
    );
    await stmt.run();
  }

  async createSubscription(sub: {
    subscriptionId: string;
    accountId: string;
    planId: string;
    status: SubscriptionStatus;
    source: string;
    grantedBy: string | null;
    startDate: string;
    expiryDate: string | null;
    cancelledAt?: string | null;
    paymentReference: string | null;
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO subscriptions (
        subscription_id, account_id, plan_id, status, source,
        granted_by, start_date, expiry_date, cancelled_at,
        payment_reference, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sub.subscriptionId,
      sub.accountId,
      sub.planId,
      sub.status,
      sub.source,
      sub.grantedBy,
      sub.startDate,
      sub.expiryDate,
      sub.cancelledAt || null,
      sub.paymentReference,
      sub.createdAt,
      sub.updatedAt
    );
    await stmt.run();
  }

  async updatePreviousActiveSubscriptions(accountId: string, newStatus: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE subscriptions
      SET status = ?, updated_at = ?
      WHERE account_id = ? AND status = 'active'
    `).bind(newStatus, new Date().toISOString(), accountId);
    await stmt.run();
  }

  async getAllSubscriptionsForAccount(accountId: string): Promise<SubscriptionDto[]> {
    const stmt = this.db.prepare(`
      SELECT s.*, p.name as plan_name
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.account_id = ?
      ORDER BY s.created_at DESC
    `).bind(accountId);
    const result = await stmt.all<SubscriptionRow>();

    return (result.results || []).map((row) => ({
      subscriptionId: row.subscription_id,
      accountId: row.account_id,
      planId: row.plan_id,
      planName: row.plan_name || row.plan_id,
      status: row.status as any,
      source: row.source as any,
      grantedBy: row.granted_by,
      startDate: row.start_date,
      expiryDate: row.expiry_date,
      cancelledAt: row.cancelled_at,
      paymentReference: row.payment_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getSubscriptionByPaymentReference(paymentReference: string): Promise<SubscriptionDto | null> {
    const stmt = this.db.prepare(`
      SELECT s.*, p.name as plan_name
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.payment_reference = ?
      ORDER BY s.created_at DESC
      LIMIT 1
    `).bind(paymentReference);
    const row = await stmt.first<SubscriptionRow>();
    if (!row) return null;

    return {
      subscriptionId: row.subscription_id,
      accountId: row.account_id,
      planId: row.plan_id,
      planName: row.plan_name || row.plan_id,
      status: row.status as any,
      source: row.source as any,
      grantedBy: row.granted_by,
      startDate: row.start_date,
      expiryDate: row.expiry_date,
      cancelledAt: row.cancelled_at,
      paymentReference: row.payment_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createAuditLog(log: {
    id: string;
    accountId: string;
    eventType: string;
    planId: string;
    grantedBy: string;
    source: string;
    startDate: string;
    expiryDate: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
  }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO entitlement_audit_logs (
        id, account_id, event_type, plan_id, granted_by,
        source, start_date, expiry_date, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log.id,
      log.accountId,
      log.eventType,
      log.planId,
      log.grantedBy,
      log.source,
      log.startDate,
      log.expiryDate,
      log.details ? JSON.stringify(log.details) : null,
      log.createdAt
    );
    await stmt.run();
  }

  async getAuditLogsForAccount(accountId: string): Promise<EntitlementAuditLogDto[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM entitlement_audit_logs
      WHERE account_id = ?
      ORDER BY created_at DESC
    `).bind(accountId);
    const result = await stmt.all<AuditLogRow>();

    return (result.results || []).map((row) => ({
      id: row.id,
      accountId: row.account_id,
      eventType: row.event_type,
      planId: row.plan_id,
      grantedBy: row.granted_by,
      source: row.source,
      startDate: row.start_date,
      expiryDate: row.expiry_date,
      details: row.details ? JSON.parse(row.details) : null,
      createdAt: row.created_at,
    }));
  }

  async getAppConfig(key: string): Promise<string | null> {
    const stmt = this.db.prepare('SELECT value FROM app_config WHERE key = ?').bind(key);
    const row = await stmt.first<{ value: string }>();
    return row ? row.value : null;
  }

  async setAppConfig(key: string, value: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO app_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).bind(key, value, new Date().toISOString());
    await stmt.run();
  }

  async getTrialClaimByEmailHash(emailHash: string): Promise<TrialClaimRecord | null> {
    const stmt = this.db.prepare('SELECT * FROM trial_claims WHERE email_hash = ? LIMIT 1').bind(emailHash);
    const row = await stmt.first<TrialClaimRecord>();
    return row || null;
  }

  async createTrialClaim(claim: {
    claimId: string;
    emailHash: string;
    firstClaimedAt: string;
    trialExpiresAt: string;
  }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO trial_claims (claim_id, email_hash, first_claimed_at, trial_expires_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email_hash) DO NOTHING
    `).bind(claim.claimId, claim.emailHash, claim.firstClaimedAt, claim.trialExpiresAt);
    await stmt.run();
  }
}
