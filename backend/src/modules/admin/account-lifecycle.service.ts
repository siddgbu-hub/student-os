export class AccountLifecycleError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(`${code}: ${message}`);
    this.name = 'AccountLifecycleError';
  }
}

export interface DeactivateAccountParams {
  accountId: string;
  adminAccountId: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ReactivateAccountParams {
  accountId: string;
  adminAccountId: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevokeAllSessionsParams {
  accountId: string;
  adminAccountId: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeleteAccountParams {
  accountId: string;
  adminAccountId: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeletedRecordsSummary {
  sessions: number;
  devices: number;
  plannerTasks: number;
  plannerTaskLogs: number;
  revisionItems: number;
  revisionSessions: number;
  revisionItemLogs: number;
  studySessions: number;
  chapters: number;
  subjects: number;
  examGoals: number;
  userProfiles: number;
  userPreferences: number;
  accountIdentities: number;
  verificationRequests: number;
  payments: number;
  paymentsAmountPaise: number;
  subscriptions: number;
  entitlements: number;
  entitlementAuditLogs: number;
}

export interface LifecycleActionResult {
  success: boolean;
  message: string;
  accountId: string;
  revokedSessionsCount?: number;
  deactivatedDevicesCount?: number;
  deletedRecordsSummary?: DeletedRecordsSummary;
}

export class AccountLifecycleService {
  constructor(private db: D1Database) {}

  /**
   * Deactivates a student account.
   * - Sets account status to 'suspended'
   * - Revokes all active sessions
   * - Deactivates all active devices
   * - Preserves all study, planner, revision, payment, subscription, and audit history
   * - Logs ACCOUNT_DEACTIVATED audit event
   * - Idempotent
   */
  async deactivateAccount(params: DeactivateAccountParams): Promise<LifecycleActionResult> {
    const { accountId, adminAccountId, reason, ipAddress, userAgent } = params;
    const now = new Date();
    const timestamp = now.toISOString();

    // 1. Validate target account exists
    const accountStmt = this.db.prepare('SELECT account_id, email, status FROM accounts WHERE account_id = ?').bind(accountId);
    const account = await accountStmt.first<{ account_id: string; email: string; status: string }>();

    if (!account) {
      throw new AccountLifecycleError('ACCOUNT_NOT_FOUND', 'Target student account does not exist.');
    }

    // Idempotency check: if already suspended, return safe response without redundant destructive mutations
    if (account.status === 'suspended') {
      return {
        success: true,
        message: 'Account is already suspended.',
        accountId,
        revokedSessionsCount: 0,
        deactivatedDevicesCount: 0,
      };
    }

    // 2. Count active sessions & devices for audit accounting
    const sessionCountStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE account_id = ? AND revoked_at IS NULL').bind(accountId);
    const deviceCountStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM devices WHERE account_id = ? AND is_active = 1').bind(accountId);

    const [sessionCountRow, deviceCountRow] = await Promise.all([
      sessionCountStmt.first<{ cnt: number }>(),
      deviceCountStmt.first<{ cnt: number }>(),
    ]);

    const revokedSessionsCount = sessionCountRow?.cnt || 0;
    const deactivatedDevicesCount = deviceCountRow?.cnt || 0;

    // 3. Execute atomic state change and session invalidation
    const updateAccountStmt = this.db.prepare(
      'UPDATE accounts SET status = ? WHERE account_id = ?'
    ).bind('suspended', accountId);

    const revokeSessionsStmt = this.db.prepare(
      'UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL'
    ).bind(timestamp, accountId);

    const deactivateDevicesStmt = this.db.prepare(
      'UPDATE devices SET is_active = 0 WHERE account_id = ? AND is_active = 1'
    ).bind(accountId);

    const auditId = crypto.randomUUID();
    const auditDetails = JSON.stringify({
      targetAccountId: accountId,
      targetEmail: account.email,
      operator: adminAccountId,
      action: 'ACCOUNT_DEACTIVATED',
      reason: reason?.trim() || 'Administrative deactivation',
      revokedSessionsCount,
      deactivatedDevicesCount,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    const auditLogStmt = this.db.prepare(
      'INSERT INTO audit_logs (id, account_id, event_type, details, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(auditId, accountId, 'ACCOUNT_DEACTIVATED', auditDetails, timestamp);

    await this.db.batch([
      updateAccountStmt,
      revokeSessionsStmt,
      deactivateDevicesStmt,
      auditLogStmt,
    ]);

    return {
      success: true,
      message: `Account ${account.email} has been deactivated. ${revokedSessionsCount} session(s) revoked.`,
      accountId,
      revokedSessionsCount,
      deactivatedDevicesCount,
    };
  }

  /**
   * Reactivates a suspended student account.
   * - Sets account status to 'active'
   * - Does NOT automatically restore old sessions (student must authenticate anew)
   * - Logs ACCOUNT_REACTIVATED audit event
   * - Idempotent
   */
  async reactivateAccount(params: ReactivateAccountParams): Promise<LifecycleActionResult> {
    const { accountId, adminAccountId, reason, ipAddress, userAgent } = params;
    const now = new Date();
    const timestamp = now.toISOString();

    // 1. Validate target account exists
    const accountStmt = this.db.prepare('SELECT account_id, email, status FROM accounts WHERE account_id = ?').bind(accountId);
    const account = await accountStmt.first<{ account_id: string; email: string; status: string }>();

    if (!account) {
      throw new AccountLifecycleError('ACCOUNT_NOT_FOUND', 'Target student account does not exist.');
    }

    // Idempotency check
    if (account.status === 'active') {
      return {
        success: true,
        message: 'Account is already active.',
        accountId,
      };
    }

    // 2. Update status to active
    const updateAccountStmt = this.db.prepare(
      'UPDATE accounts SET status = ? WHERE account_id = ?'
    ).bind('active', accountId);

    const auditId = crypto.randomUUID();
    const auditDetails = JSON.stringify({
      targetAccountId: accountId,
      targetEmail: account.email,
      operator: adminAccountId,
      action: 'ACCOUNT_REACTIVATED',
      reason: reason?.trim() || 'Administrative reactivation',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    const auditLogStmt = this.db.prepare(
      'INSERT INTO audit_logs (id, account_id, event_type, details, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(auditId, accountId, 'ACCOUNT_REACTIVATED', auditDetails, timestamp);

    await this.db.batch([
      updateAccountStmt,
      auditLogStmt,
    ]);

    return {
      success: true,
      message: `Account ${account.email} has been reactivated.`,
      accountId,
    };
  }

  /**
   * Revokes all active sessions for an account without changing account status.
   * - Revokes all active sessions
   * - Deactivates all active devices
   * - Logs ALL_SESSIONS_REVOKED audit event
   * - Never exposes token hashes or secrets
   */
  async revokeAllSessions(params: RevokeAllSessionsParams): Promise<LifecycleActionResult> {
    const { accountId, adminAccountId, reason, ipAddress, userAgent } = params;
    const now = new Date();
    const timestamp = now.toISOString();

    // 1. Validate target account exists
    const accountStmt = this.db.prepare('SELECT account_id, email, status FROM accounts WHERE account_id = ?').bind(accountId);
    const account = await accountStmt.first<{ account_id: string; email: string; status: string }>();

    if (!account) {
      throw new AccountLifecycleError('ACCOUNT_NOT_FOUND', 'Target student account does not exist.');
    }

    // 2. Count active sessions & devices
    const sessionCountStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE account_id = ? AND revoked_at IS NULL').bind(accountId);
    const deviceCountStmt = this.db.prepare('SELECT COUNT(*) as cnt FROM devices WHERE account_id = ? AND is_active = 1').bind(accountId);

    const [sessionCountRow, deviceCountRow] = await Promise.all([
      sessionCountStmt.first<{ cnt: number }>(),
      deviceCountStmt.first<{ cnt: number }>(),
    ]);

    const revokedSessionsCount = sessionCountRow?.cnt || 0;
    const deactivatedDevicesCount = deviceCountRow?.cnt || 0;

    // 3. Invalidate active sessions & devices
    const revokeSessionsStmt = this.db.prepare(
      'UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL'
    ).bind(timestamp, accountId);

    const deactivateDevicesStmt = this.db.prepare(
      'UPDATE devices SET is_active = 0 WHERE account_id = ? AND is_active = 1'
    ).bind(accountId);

    const auditId = crypto.randomUUID();
    const auditDetails = JSON.stringify({
      targetAccountId: accountId,
      targetEmail: account.email,
      operator: adminAccountId,
      action: 'ALL_SESSIONS_REVOKED',
      reason: reason?.trim() || 'Administrative mass session revocation',
      revokedSessionsCount,
      deactivatedDevicesCount,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    const auditLogStmt = this.db.prepare(
      'INSERT INTO audit_logs (id, account_id, event_type, details, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(auditId, accountId, 'ALL_SESSIONS_REVOKED', auditDetails, timestamp);

    await this.db.batch([
      revokeSessionsStmt,
      deactivateDevicesStmt,
      auditLogStmt,
    ]);

    return {
      success: true,
      message: `All active sessions for ${account.email} have been revoked (${revokedSessionsCount} sessions).`,
      accountId,
      revokedSessionsCount,
      deactivatedDevicesCount,
    };
  }

  /**
   * Permanently hard-deletes a student account and all account-owned data.
   * - Enforces self-deletion protection (operator cannot delete own account)
   * - Enforces privileged account protection (admin/owner accounts cannot be deleted)
   * - Computes child record counts and payment totals for audit logging
   * - Creates immutable ACCOUNT_PERMANENTLY_DELETED audit event
   * - Executes atomic batch deletion in reverse topological foreign-key order
   */
  async deleteAccount(params: DeleteAccountParams): Promise<LifecycleActionResult> {
    const { accountId, adminAccountId, reason, ipAddress, userAgent } = params;
    const now = new Date();
    const timestamp = now.toISOString();

    // 1. Safety Rule 1: Prevent operator from deleting own account
    if (accountId === adminAccountId) {
      throw new AccountLifecycleError('CANNOT_DELETE_CURRENT_ACCOUNT', 'Cannot delete the currently authenticated administrator account.');
    }

    // 2. Validate target account exists
    const accountStmt = this.db.prepare('SELECT account_id, email, status FROM accounts WHERE account_id = ?').bind(accountId);
    const account = await accountStmt.first<{ account_id: string; email: string; status: string }>();

    if (!account) {
      throw new AccountLifecycleError('ACCOUNT_NOT_FOUND', 'Target student account does not exist.');
    }

    // 3. Safety Rule 2: Prevent deletion of privileged admin/owner accounts
    const adminRoleStmt = this.db.prepare('SELECT account_id, role FROM admin_roles WHERE account_id = ?').bind(accountId);
    const adminRole = await adminRoleStmt.first<{ account_id: string; role: string }>();

    if (adminRole) {
      throw new AccountLifecycleError('CANNOT_DELETE_ADMIN_ACCOUNT', 'Cannot delete an administrator or owner account via student deletion.');
    }

    // 4. Collect record statistics across all child tables for audit preservation
    const [
      sessionsRow,
      devicesRow,
      plannerTasksRow,
      plannerLogsRow,
      revItemsRow,
      revSessionsRow,
      revLogsRow,
      studySessionsRow,
      chaptersRow,
      subjectsRow,
      goalsRow,
      profilesRow,
      preferencesRow,
      identitiesRow,
      verificationsRow,
      paymentsRow,
      subscriptionsRow,
      entitlementsRow,
      entAuditRow,
    ] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as cnt FROM sessions WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM devices WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM planner_tasks WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM planner_task_logs WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM revision_items WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM revision_sessions WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM revision_item_logs WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM study_sessions WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM chapters WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM subjects WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM exam_goals WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM user_profiles WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM user_preferences WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM account_identities WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM verification_requests WHERE target = ?').bind(account.email).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(amount_paise), 0) as total_amount FROM payments WHERE account_id = ?').bind(accountId).first<{ cnt: number; total_amount: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM subscriptions WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM entitlements WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
      this.db.prepare('SELECT COUNT(*) as cnt FROM entitlement_audit_logs WHERE account_id = ?').bind(accountId).first<{ cnt: number }>(),
    ]);

    const recordsSummary: DeletedRecordsSummary = {
      sessions: sessionsRow?.cnt || 0,
      devices: devicesRow?.cnt || 0,
      plannerTasks: plannerTasksRow?.cnt || 0,
      plannerTaskLogs: plannerLogsRow?.cnt || 0,
      revisionItems: revItemsRow?.cnt || 0,
      revisionSessions: revSessionsRow?.cnt || 0,
      revisionItemLogs: revLogsRow?.cnt || 0,
      studySessions: studySessionsRow?.cnt || 0,
      chapters: chaptersRow?.cnt || 0,
      subjects: subjectsRow?.cnt || 0,
      examGoals: goalsRow?.cnt || 0,
      userProfiles: profilesRow?.cnt || 0,
      userPreferences: preferencesRow?.cnt || 0,
      accountIdentities: identitiesRow?.cnt || 0,
      verificationRequests: verificationsRow?.cnt || 0,
      payments: paymentsRow?.cnt || 0,
      paymentsAmountPaise: paymentsRow?.total_amount || 0,
      subscriptions: subscriptionsRow?.cnt || 0,
      entitlements: entitlementsRow?.cnt || 0,
      entitlementAuditLogs: entAuditRow?.cnt || 0,
    };

    // 5. Create authoritative ACCOUNT_PERMANENTLY_DELETED audit record (survives account deletion)
    const auditId = crypto.randomUUID();
    const auditDetails = JSON.stringify({
      deletedAccountId: accountId,
      deletedEmail: account.email,
      operatorAdminId: adminAccountId,
      action: 'ACCOUNT_PERMANENTLY_DELETED',
      reason: reason?.trim() || 'Administrative hard deletion',
      recordsSummary,
      paymentCount: recordsSummary.payments,
      paymentTotalPaise: recordsSummary.paymentsAmountPaise,
      timestamp,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    const auditLogStmt = this.db.prepare(
      'INSERT INTO audit_logs (id, account_id, event_type, details, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(auditId, accountId, 'ACCOUNT_PERMANENTLY_DELETED', auditDetails, timestamp);

    // 6. Formulate deletion statements in reverse-topological order
    const deletionStatements = [
      // Sessions & devices
      this.db.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM devices WHERE account_id = ?').bind(accountId),
      // Planner tasks & logs
      this.db.prepare('DELETE FROM planner_task_logs WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM planner_tasks WHERE account_id = ?').bind(accountId),
      // Revision items, sessions, & logs
      this.db.prepare('DELETE FROM revision_item_logs WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM revision_sessions WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM revision_items WHERE account_id = ?').bind(accountId),
      // Study sessions, chapters, subjects
      this.db.prepare('DELETE FROM study_sessions WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM chapters WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM subjects WHERE account_id = ?').bind(accountId),
      // Goals, preferences, profile, identities, verifications
      this.db.prepare('DELETE FROM exam_goals WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM user_preferences WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM user_profiles WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM account_identities WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM verification_requests WHERE target = ?').bind(account.email),
      // Payments, subscriptions, entitlements
      this.db.prepare('DELETE FROM payments WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM subscriptions WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM entitlements WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM entitlement_audit_logs WHERE account_id = ?').bind(accountId),
      // Root account
      this.db.prepare('DELETE FROM accounts WHERE account_id = ?').bind(accountId),
    ];

    // Execute atomic batch
    await this.db.batch([
      auditLogStmt,
      ...deletionStatements,
    ]);

    return {
      success: true,
      message: `Account ${account.email} and all associated records have been permanently deleted.`,
      accountId,
      deletedRecordsSummary: recordsSummary,
    };
  }
}
