import type {
  AdminRoleDto,
  AdminRoleType,
  PaymentDto,
  AdminOverviewDto,
  AdminUserSummaryDto,
  AdminUserDetailDto,
  PaginatedResult,
  UserStatusFilter,
  EntitlementAuditLogDto,
  SubscriptionDto,
  EntitlementDto,
} from '@student-os/shared';

/**
 * Infers device platform from deviceId prefix and deviceModel.
 * Uses existing authoritative data — no extra column required.
 */
export function inferDevicePlatform(
  deviceId: string,
  deviceModel: string | null
): 'android' | 'web' | 'admin' | 'unknown' {
  if (deviceId === 'admin-web-console') return 'admin';
  if (
    deviceId.startsWith('android-native-') ||
    deviceId.startsWith('android-') ||
    (deviceModel && deviceModel.toLowerCase().includes('samsung')) ||
    (deviceModel && deviceModel.toLowerCase().includes('xiaomi')) ||
    (deviceModel && deviceModel.toLowerCase().includes('pixel'))
  ) {
    // Exclude known web/admin patterns
    if (
      !deviceId.startsWith('web-') &&
      deviceModel !== 'Web Browser' &&
      deviceModel !== 'SOCC Web Console' &&
      deviceModel !== 'SOCC Admin Command Center'
    ) {
      return 'android';
    }
  }
  if (
    deviceId.startsWith('web-') ||
    deviceModel === 'Web Browser' ||
    deviceModel === 'SOCC Web Console'
  ) {
    return 'web';
  }
  return 'unknown';
}

export interface AdminRoleRow {
  account_id: string;
  role: string;
  permissions: string;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  payment_id: string;
  account_id: string;
  subscription_id: string | null;
  amount_paise: number;
  original_amount_paise?: number | null;
  discount_percent?: number | null;
  discount_amount_paise?: number | null;
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
  student_email?: string;
  student_name?: string;
}

interface UserSummaryRow {
  account_id: string;
  email: string;
  full_name: string | null;
  current_plan_id: string | null;
  entitlement_status: string | null;
  is_paid: number | null;
  expires_at: string | null;
  created_at: string;
  last_login_at: string;
  device_count: number;
}

export class AdminRepository {
  constructor(private db: D1Database) {}

  async getAdminRole(accountId: string): Promise<AdminRoleDto | null> {
    const stmt = this.db.prepare('SELECT * FROM admin_roles WHERE account_id = ?').bind(accountId);
    const row = await stmt.first<AdminRoleRow>();
    if (!row) return null;

    let permissions: string[] = [];
    try {
      const parsed = JSON.parse(row.permissions);
      if (Array.isArray(parsed)) {
        permissions = parsed;
      }
    } catch {
      permissions = [];
    }

    return {
      accountId: row.account_id,
      role: row.role as AdminRoleType,
      permissions,
      grantedBy: row.granted_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async hasPermission(accountId: string, permission: string): Promise<boolean> {
    const role = await this.getAdminRole(accountId);
    if (!role) return false;
    if (role.permissions.includes('*')) return true;
    return role.permissions.includes(permission);
  }

  async assignAdminRole(role: {
    accountId: string;
    role: AdminRoleType;
    permissions: string[];
    grantedBy?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO admin_roles (account_id, role, permissions, granted_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        role = excluded.role,
        permissions = excluded.permissions,
        granted_by = excluded.granted_by,
        updated_at = excluded.updated_at
    `).bind(
      role.accountId,
      role.role,
      JSON.stringify(role.permissions),
      role.grantedBy || null,
      now,
      now
    );
    await stmt.run();
  }

  async removeAdminRole(accountId: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM admin_roles WHERE account_id = ?').bind(accountId);
    await stmt.run();
  }

  async getPaymentById(paymentId: string): Promise<PaymentDto | null> {
    const stmt = this.db.prepare(`
      SELECT p.*, a.email as student_email, pr.full_name as student_name
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.account_id
      LEFT JOIN user_profiles pr ON p.account_id = pr.account_id
      WHERE p.payment_id = ?
    `).bind(paymentId);
    const row = await stmt.first<PaymentRow>();
    if (!row) return null;

    return {
      paymentId: row.payment_id,
      accountId: row.account_id,
      subscriptionId: row.subscription_id,
      amountPaise: row.amount_paise,
      currency: row.currency,
      paymentMethod: row.payment_method,
      transactionReference: row.transaction_reference,
      status: row.status as any,
      source: row.source as any,
      recordedBy: row.recorded_by,
      notes: row.notes,
      receiptUrl: row.receipt_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      studentEmail: row.student_email,
      studentName: row.student_name || undefined,
    };
  }

  async getPaymentByReference(transactionReference: string): Promise<PaymentDto | null> {
    const stmt = this.db.prepare(`
      SELECT p.*, a.email as student_email, pr.full_name as student_name
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.account_id
      LEFT JOIN user_profiles pr ON p.account_id = pr.account_id
      WHERE p.transaction_reference = ?
    `).bind(transactionReference);
    const row = await stmt.first<PaymentRow>();
    if (!row) return null;

    return {
      paymentId: row.payment_id,
      accountId: row.account_id,
      subscriptionId: row.subscription_id,
      amountPaise: row.amount_paise,
      currency: row.currency,
      paymentMethod: row.payment_method,
      transactionReference: row.transaction_reference,
      status: row.status as any,
      source: row.source as any,
      recordedBy: row.recorded_by,
      notes: row.notes,
      receiptUrl: row.receipt_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      studentEmail: row.student_email,
      studentName: row.student_name || undefined,
    };
  }

  async recordPayment(payment: {
    paymentId: string;
    accountId: string;
    subscriptionId?: string | null;
    amountPaise: number;
    originalAmountPaise?: number | null;
    discountPercent?: number | null;
    discountAmountPaise?: number | null;
    currency?: string;
    paymentMethod: string;
    transactionReference?: string | null;
    status: string;
    source: string;
    recordedBy: string;
    notes?: string | null;
    receiptUrl?: string | null;
    createdAt?: string;
  }): Promise<void> {
    const now = payment.createdAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO payments (
        payment_id, account_id, subscription_id, amount_paise,
        original_amount_paise, discount_percent, discount_amount_paise,
        currency, payment_method, transaction_reference, status, source, recorded_by,
        notes, receipt_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payment.paymentId,
      payment.accountId,
      payment.subscriptionId || null,
      payment.amountPaise,
      payment.originalAmountPaise ?? payment.amountPaise,
      payment.discountPercent ?? 0,
      payment.discountAmountPaise ?? 0,
      payment.currency || 'INR',
      payment.paymentMethod,
      payment.transactionReference || null,
      payment.status,
      payment.source,
      payment.recordedBy,
      payment.notes || null,
      payment.receiptUrl || null,
      now,
      now
    );
    await stmt.run();
  }

  /**
   * 1. Overview Metrics Query (Derived from authoritative database state)
   */
  async getOverviewMetrics(): Promise<AdminOverviewDto> {
    const now = new Date();
    const nowIso = now.toISOString();
    const in7DaysIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const totalStudentsStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM accounts');
    const activeTrialsStmt = this.db.prepare(
      `SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND (is_paid = 0 OR current_plan_id = 'free_trial')`
    );
    const activeProMonthlyStmt = this.db.prepare(
      `SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND is_paid = 1 AND current_plan_id = 'monthly'`
    );
    const activeProYearlyStmt = this.db.prepare(
      `SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND is_paid = 1 AND current_plan_id = 'yearly'`
    );
    const expiredStmt = this.db.prepare(`SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'expired'`);
    const expiringSoonStmt = this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM entitlements WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at >= ? AND expires_at <= ?`
      )
      .bind(nowIso, in7DaysIso);
    const revenueStmt = this.db.prepare(`SELECT COALESCE(SUM(amount_paise), 0) as total FROM payments WHERE status = 'captured'`);

    const [
      totalStudentsRow,
      activeTrialsRow,
      activeProMonthlyRow,
      activeProYearlyRow,
      expiredRow,
      expiringSoonRow,
      revenueRow,
    ] = await Promise.all([
      totalStudentsStmt.first<{ cnt: number }>(),
      activeTrialsStmt.first<{ cnt: number }>(),
      activeProMonthlyStmt.first<{ cnt: number }>(),
      activeProYearlyStmt.first<{ cnt: number }>(),
      expiredStmt.first<{ cnt: number }>(),
      expiringSoonStmt.first<{ cnt: number }>(),
      revenueStmt.first<{ total: number }>(),
    ]);

    return {
      totalStudents: totalStudentsRow?.cnt || 0,
      activeTrials: activeTrialsRow?.cnt || 0,
      activeProMonthly: activeProMonthlyRow?.cnt || 0,
      activeProYearly: activeProYearlyRow?.cnt || 0,
      expiredAccounts: expiredRow?.cnt || 0,
      expiringNext7Days: expiringSoonRow?.cnt || 0,
      totalRevenuePaise: revenueRow?.total || 0,
    };
  }

  /**
   * 2. Paginated User Directory with Search & Status Filters
   */
  async getUsers(params: {
    query?: string;
    status?: UserStatusFilter;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<AdminUserSummaryDto>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const bindings: unknown[] = [];

    if (params.query && params.query.trim()) {
      const q = `%${params.query.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(a.email) LIKE ? OR LOWER(COALESCE(p.full_name, \'\')) LIKE ? OR a.account_id = ?)');
      bindings.push(q, q, params.query.trim());
    }

    if (params.status) {
      if (params.status === 'trial_active') {
        whereClauses.push("(e.status = 'active' AND (e.is_paid = 0 OR e.current_plan_id = 'free_trial'))");
      } else if (params.status === 'pro_active') {
        whereClauses.push("(e.status = 'active' AND e.is_paid = 1 AND e.current_plan_id IN ('monthly', 'yearly'))");
      } else if (params.status === 'expired') {
        whereClauses.push("(e.status = 'expired')");
      } else if (params.status === 'revoked') {
        whereClauses.push("(e.status = 'revoked')");
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Total Count Query
    const countSql = `
      SELECT COUNT(*) as total
      FROM accounts a
      LEFT JOIN user_profiles p ON a.account_id = p.account_id
      LEFT JOIN entitlements e ON a.account_id = e.account_id
      ${whereSql}
    `;
    const countStmt = this.db.prepare(countSql).bind(...bindings);
    const countRow = await countStmt.first<{ total: number }>();
    const total = countRow?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Data Query — includes device count subquery
    const dataSql = `
      SELECT
        a.account_id,
        a.email,
        p.full_name,
        e.current_plan_id,
        e.status as entitlement_status,
        e.is_paid,
        e.expires_at,
        a.created_at,
        a.last_login_at,
        COALESCE((SELECT COUNT(*) FROM devices d WHERE d.account_id = a.account_id), 0) as device_count
      FROM accounts a
      LEFT JOIN user_profiles p ON a.account_id = p.account_id
      LEFT JOIN entitlements e ON a.account_id = e.account_id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const dataBindings = [...bindings, limit, offset];
    const dataStmt = this.db.prepare(dataSql).bind(...dataBindings);
    const result = await dataStmt.all<UserSummaryRow>();

    const nowMs = Date.now();
    const data: AdminUserSummaryDto[] = (result.results || []).map((row) => {
      let daysRemaining: number | null = null;
      if (row.expires_at) {
        const expMs = new Date(row.expires_at).getTime();
        daysRemaining = Math.max(0, Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24)));
      }

      return {
        accountId: row.account_id,
        email: row.email,
        fullName: row.full_name || 'Student',
        currentPlanId: row.current_plan_id || 'free_trial',
        entitlementStatus: row.entitlement_status || 'active',
        isPaid: row.is_paid === 1,
        expiresAt: row.expires_at,
        daysRemaining,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        deviceCount: row.device_count || 0,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 3. Complete User Detail Query
   */
  async getUserDetail(accountId: string): Promise<AdminUserDetailDto | null> {
    const accountStmt = this.db.prepare('SELECT account_id, email, created_at, last_login_at FROM accounts WHERE account_id = ?').bind(accountId);
    const account = await accountStmt.first<{ account_id: string; email: string; created_at: string; last_login_at: string }>();
    if (!account) return null;

    const profileStmt = this.db.prepare('SELECT full_name, avatar_url, institution_name, course, class_year, stream, examination_type FROM user_profiles WHERE account_id = ?').bind(accountId);
    const entitlementStmt = this.db.prepare(`
      SELECT e.*, p.name as plan_name
      FROM entitlements e
      LEFT JOIN plans p ON e.current_plan_id = p.plan_id
      WHERE e.account_id = ?
    `).bind(accountId);
    const subscriptionsStmt = this.db.prepare(`
      SELECT s.*, p.name as plan_name
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.account_id = ?
      ORDER BY s.created_at DESC
    `).bind(accountId);
    const paymentsStmt = this.db.prepare('SELECT * FROM payments WHERE account_id = ? ORDER BY created_at DESC').bind(accountId);
    // Devices with latest session info per device (JOIN to get expiresAt and revokedAt)
    const devicesStmt = this.db.prepare(`
      SELECT
        d.device_id,
        d.device_model,
        d.os_version,
        d.is_active,
        d.registered_at,
        d.last_active_at,
        s.expires_at as session_expires_at,
        s.revoked_at as session_revoked_at
      FROM devices d
      LEFT JOIN (
        SELECT device_id, expires_at, revoked_at
        FROM sessions
        WHERE account_id = ?
        GROUP BY device_id
        HAVING created_at = MAX(created_at)
      ) s ON s.device_id = d.device_id
      WHERE d.account_id = ?
      ORDER BY d.last_active_at DESC
    `).bind(accountId, accountId);
    const auditStmt = this.db.prepare('SELECT * FROM entitlement_audit_logs WHERE account_id = ? ORDER BY created_at DESC').bind(accountId);

    const [profile, entRow, subsResult, paymentsResult, devicesResult, auditResult] = await Promise.all([
      profileStmt.first<{
        full_name: string;
        avatar_url: string | null;
        institution_name: string | null;
        course: string | null;
        class_year: string | null;
        stream: string | null;
        examination_type: string | null;
      }>(),
      entitlementStmt.first<any>(),
      subscriptionsStmt.all<any>(),
      paymentsStmt.all<PaymentRow>(),
      devicesStmt.all<{
        device_id: string;
        device_model: string | null;
        os_version: string | null;
        is_active: number;
        registered_at: string;
        last_active_at: string;
        session_expires_at: string | null;
        session_revoked_at: string | null;
      }>(),
      auditStmt.all<any>(),
    ]);

    let entitlement: EntitlementDto | null = null;
    if (entRow) {
      entitlement = {
        entitlementId: entRow.entitlement_id,
        accountId: entRow.account_id,
        currentPlanId: entRow.current_plan_id,
        planName: entRow.plan_name || entRow.current_plan_id,
        status: entRow.status,
        isPaid: entRow.is_paid === 1,
        features: JSON.parse(entRow.features || '[]'),
        expiresAt: entRow.expires_at,
        lastVerifiedAt: entRow.last_verified_at,
        createdAt: entRow.created_at,
        updatedAt: entRow.updated_at,
      };
    }

    const subscriptions: SubscriptionDto[] = (subsResult.results || []).map((s) => ({
      subscriptionId: s.subscription_id,
      accountId: s.account_id,
      planId: s.plan_id,
      planName: s.plan_name || s.plan_id,
      status: s.status,
      source: s.source,
      grantedBy: s.granted_by,
      startDate: s.start_date,
      expiryDate: s.expiry_date,
      cancelledAt: s.cancelled_at,
      paymentReference: s.payment_reference,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    const payments: PaymentDto[] = (paymentsResult.results || []).map((p) => ({
      paymentId: p.payment_id,
      accountId: p.account_id,
      subscriptionId: p.subscription_id,
      amountPaise: p.amount_paise,
      originalAmountPaise: p.original_amount_paise ?? p.amount_paise,
      discountPercent: p.discount_percent ?? 0,
      discountAmountPaise: p.discount_amount_paise ?? 0,
      currency: p.currency,
      paymentMethod: p.payment_method,
      transactionReference: p.transaction_reference,
      status: p.status as any,
      source: p.source as any,
      recordedBy: p.recorded_by,
      notes: p.notes,
      receiptUrl: p.receipt_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      studentEmail: account.email,
      studentName: profile?.full_name || 'Student',
    }));

    const devices = (devicesResult.results || []).map((d) => ({
      deviceId: d.device_id,
      deviceModel: d.device_model,
      osVersion: d.os_version,
      platform: inferDevicePlatform(d.device_id, d.device_model),
      isActive: d.is_active === 1,
      registeredAt: d.registered_at,
      lastActiveAt: d.last_active_at,
      expiresAt: d.session_expires_at || null,
      revokedAt: d.session_revoked_at || null,
    }));

    const auditLogs: EntitlementAuditLogDto[] = (auditResult.results || []).map((a) => ({
      id: a.id,
      accountId: a.account_id,
      eventType: a.event_type,
      planId: a.plan_id,
      grantedBy: a.granted_by,
      source: a.source,
      startDate: a.start_date,
      expiryDate: a.expiry_date,
      details: a.details ? JSON.parse(a.details) : null,
      createdAt: a.created_at,
    }));

    return {
      account: {
        accountId: account.account_id,
        email: account.email,
        createdAt: account.created_at,
        lastLoginAt: account.last_login_at,
      },
      profile: profile
        ? {
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            institutionName: profile.institution_name,
            course: profile.course,
            classYear: profile.class_year,
            stream: profile.stream,
            examinationType: profile.examination_type,
          }
        : null,
      entitlement,
      subscriptions,
      payments,
      devices,
      auditLogs,
    };
  }

  /**
   * 4. Paginated Payments Ledger Query
   */
  async getPaymentsList(params: {
    page: number;
    limit: number;
    status?: string;
    method?: string;
    accountId?: string;
  }): Promise<PaginatedResult<PaymentDto>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const bindings: unknown[] = [];

    if (params.status) {
      whereClauses.push('p.status = ?');
      bindings.push(params.status);
    }
    if (params.method) {
      whereClauses.push('p.payment_method = ?');
      bindings.push(params.method);
    }
    if (params.accountId) {
      whereClauses.push('p.account_id = ?');
      bindings.push(params.accountId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count
    const countSql = `SELECT COUNT(*) as total FROM payments p ${whereSql}`;
    const countStmt = this.db.prepare(countSql).bind(...bindings);
    const countRow = await countStmt.first<{ total: number }>();
    const total = countRow?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Data
    const dataSql = `
      SELECT
        p.*,
        a.email as student_email,
        pr.full_name as student_name
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.account_id
      LEFT JOIN user_profiles pr ON p.account_id = pr.account_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataBindings = [...bindings, limit, offset];
    const dataStmt = this.db.prepare(dataSql).bind(...dataBindings);
    const result = await dataStmt.all<PaymentRow>();

    const data: PaymentDto[] = (result.results || []).map((row) => ({
      paymentId: row.payment_id,
      accountId: row.account_id,
      subscriptionId: row.subscription_id,
      amountPaise: row.amount_paise,
      originalAmountPaise: row.original_amount_paise ?? row.amount_paise,
      discountPercent: row.discount_percent ?? 0,
      discountAmountPaise: row.discount_amount_paise ?? 0,
      currency: row.currency,
      paymentMethod: row.payment_method,
      transactionReference: row.transaction_reference,
      status: row.status as any,
      source: row.source as any,
      recordedBy: row.recorded_by,
      notes: row.notes,
      receiptUrl: row.receipt_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      studentEmail: row.student_email,
      studentName: row.student_name || undefined,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 5. Paginated Audit Logs Query
   */
  async getAuditLogsList(params: {
    page: number;
    limit: number;
    eventType?: string;
    accountId?: string;
  }): Promise<PaginatedResult<EntitlementAuditLogDto>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const bindings: unknown[] = [];

    if (params.eventType) {
      whereClauses.push('event_type = ?');
      bindings.push(params.eventType);
    }
    if (params.accountId) {
      whereClauses.push('account_id = ?');
      bindings.push(params.accountId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count
    const countSql = `SELECT COUNT(*) as total FROM entitlement_audit_logs ${whereSql}`;
    const countStmt = this.db.prepare(countSql).bind(...bindings);
    const countRow = await countStmt.first<{ total: number }>();
    const total = countRow?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Data
    const dataSql = `
      SELECT *
      FROM entitlement_audit_logs
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataBindings = [...bindings, limit, offset];
    const dataStmt = this.db.prepare(dataSql).bind(...dataBindings);
    const result = await dataStmt.all<any>();

    const data: EntitlementAuditLogDto[] = (result.results || []).map((a) => ({
      id: a.id,
      accountId: a.account_id,
      eventType: a.event_type,
      planId: a.plan_id,
      grantedBy: a.granted_by,
      source: a.source,
      startDate: a.start_date,
      expiryDate: a.expiry_date,
      details: a.details ? JSON.parse(a.details) : null,
      createdAt: a.created_at,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
