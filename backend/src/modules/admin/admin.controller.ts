import { Hono, type Context } from 'hono';
import type { Env } from '../../index.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { requireAdminPermission, type AdminContextVariables } from '../../middleware/admin-auth.js';
import { AdminRepository } from '../../db/admin.repository.js';
import { EntitlementRepository } from '../../db/entitlement.repository.js';
import { EntitlementService } from '../entitlement/entitlement.service.js';
import {
  SubscriptionManagementService,
  SubscriptionDomainError,
  SUBSCRIPTION_ERRORS,
} from './subscription-management.service.js';
import {
  AccountLifecycleService,
  AccountLifecycleError,
} from './account-lifecycle.service.js';
import {
  AdminUsersQuerySchema,
  GrantSubscriptionRequestSchema,
  ExtendSubscriptionRequestSchema,
  ChangePlanRequestSchema,
  RevokeSubscriptionRequestSchema,
  RecordPaymentRequestSchema,
  AdminPaymentsQuerySchema,
  AdminAuditLogsQuerySchema,
  UpdatePaymentConfigSchema,
  DeactivateAccountRequestSchema,
  ReactivateAccountRequestSchema,
  RevokeAllSessionsRequestSchema,
  DeleteAccountRequestSchema,
} from '@student-os/shared';

export const adminRouter = new Hono<{
  Bindings: Env;
  Variables: AdminContextVariables;
}>();

// All admin routes require session authentication first
adminRouter.use('*', createAuthMiddleware);

function handleAdminError(err: unknown, c: Context): Response {
  if (err instanceof AccountLifecycleError) {
    let statusCode = 400;
    if (err.code === 'ACCOUNT_NOT_FOUND') {
      statusCode = 404;
    } else if (err.code === 'CANNOT_DELETE_ADMIN_ACCOUNT') {
      statusCode = 403;
    } else if (err.code === 'CANNOT_DELETE_CURRENT_ACCOUNT') {
      statusCode = 400;
    }
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message.includes(': ') ? err.message.split(': ').slice(1).join(': ') : err.message,
        },
        timestamp: new Date().toISOString(),
      },
      statusCode as any
    );
  }

  if (err instanceof SubscriptionDomainError) {
    let statusCode = 400;
    if (err.code === SUBSCRIPTION_ERRORS.ACCOUNT_NOT_FOUND) {
      statusCode = 404;
    } else if (err.code === SUBSCRIPTION_ERRORS.DUPLICATE_PAYMENT_REFERENCE) {
      statusCode = 409;
    }
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message.includes(': ') ? err.message.split(': ').slice(1).join(': ') : err.message,
        },
        timestamp: new Date().toISOString(),
      },
      statusCode as any
    );
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  return c.json(
    {
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message },
      timestamp: new Date().toISOString(),
    },
    500
  );
}

// ----------------------------------------------------
// A. Overview Metrics
// ----------------------------------------------------
adminRouter.get('/overview', requireAdminPermission('user.view'), async (c) => {
  const repo = new AdminRepository(c.env.DB);
  const metrics = await repo.getOverviewMetrics();
  return c.json({ success: true, data: metrics }, 200);
});

// ----------------------------------------------------
// B. Student Directory
// ----------------------------------------------------
adminRouter.get('/users', requireAdminPermission('user.view'), async (c) => {
  const queryResult = AdminUsersQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: queryResult.error.errors[0]?.message || 'Invalid query parameters' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new AdminRepository(c.env.DB);
  const result = await repo.getUsers(queryResult.data);
  return c.json({ success: true, data: result.data, pagination: result.pagination }, 200);
});

// ----------------------------------------------------
// C. Student Detail
// ----------------------------------------------------
adminRouter.get('/users/:accountId', requireAdminPermission('user.view'), async (c) => {
  const accountId = c.req.param('accountId');
  if (!accountId) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'accountId path parameter is required' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new AdminRepository(c.env.DB);
  const detail = await repo.getUserDetail(accountId);

  if (!detail) {
    return c.json(
      {
        success: false,
        error: { code: 'ACCOUNT_NOT_FOUND', message: 'Student account not found.' },
        timestamp: new Date().toISOString(),
      },
      404
    );
  }

  return c.json({ success: true, data: detail }, 200);
});

// ----------------------------------------------------
// D. Grant Subscription
// ----------------------------------------------------
adminRouter.post('/subscriptions/grant', requireAdminPermission('subscription.create'), async (c) => {
  const adminAccountId = c.get('accountId');

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON payload' }, timestamp: new Date().toISOString() },
      400
    );
  }

  const parseResult = GrantSubscriptionRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid grant payload' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const subService = new SubscriptionManagementService(c.env.DB);
  try {
    const result = await subService.grantProAccess({
      ...parseResult.data,
      adminAccountId,
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

// ----------------------------------------------------
// E. Extend Subscription
// ----------------------------------------------------
adminRouter.post('/subscriptions/extend', requireAdminPermission('subscription.update'), async (c) => {
  const adminAccountId = c.get('accountId');

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON payload' }, timestamp: new Date().toISOString() },
      400
    );
  }

  const parseResult = ExtendSubscriptionRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid extend payload' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const subService = new SubscriptionManagementService(c.env.DB);
  try {
    const result = await subService.extendSubscription({
      ...parseResult.data,
      adminAccountId,
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

// ----------------------------------------------------
// F. Change Plan
// ----------------------------------------------------
adminRouter.post('/subscriptions/change-plan', requireAdminPermission('subscription.update'), async (c) => {
  const adminAccountId = c.get('accountId');

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON payload' }, timestamp: new Date().toISOString() },
      400
    );
  }

  const parseResult = ChangePlanRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid change plan payload' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const subService = new SubscriptionManagementService(c.env.DB);
  try {
    const result = await subService.changePlan({
      ...parseResult.data,
      adminAccountId,
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

// ----------------------------------------------------
// G. Revoke Subscription
// ----------------------------------------------------
adminRouter.post('/subscriptions/revoke', requireAdminPermission('subscription.revoke'), async (c) => {
  const adminAccountId = c.get('accountId');

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON payload' }, timestamp: new Date().toISOString() },
      400
    );
  }

  const parseResult = RevokeSubscriptionRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid revoke payload' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const subService = new SubscriptionManagementService(c.env.DB);
  try {
    const result = await subService.revokeAccess({
      ...parseResult.data,
      adminAccountId,
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

// ----------------------------------------------------
// H. Payments List
// ----------------------------------------------------
adminRouter.get('/payments', requireAdminPermission('payment.view'), async (c) => {
  const queryResult = AdminPaymentsQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: queryResult.error.errors[0]?.message || 'Invalid query parameters' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new AdminRepository(c.env.DB);
  const result = await repo.getPaymentsList(queryResult.data);
  return c.json({ success: true, data: result.data, pagination: result.pagination }, 200);
});

// ----------------------------------------------------
// I. Record Payment + Activate Pro
// ----------------------------------------------------
adminRouter.post('/payments/record', requireAdminPermission('payment.create'), async (c) => {
  const adminAccountId = c.get('accountId');

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON payload' }, timestamp: new Date().toISOString() },
      400
    );
  }

  const parseResult = RecordPaymentRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid payment record payload' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const subService = new SubscriptionManagementService(c.env.DB);
  try {
    const result = await subService.recordPaymentAndActivate({
      ...parseResult.data,
      adminAccountId,
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

// ----------------------------------------------------
// J. Audit Logs List
// ----------------------------------------------------
adminRouter.get('/audit-logs', requireAdminPermission('audit.view'), async (c) => {
  const queryResult = AdminAuditLogsQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: queryResult.error.errors[0]?.message || 'Invalid query parameters' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new AdminRepository(c.env.DB);
  const result = await repo.getAuditLogsList(queryResult.data);
  return c.json({ success: true, data: result.data, pagination: result.pagination }, 200);
});

// ----------------------------------------------------
// Legacy / Compatibility Endpoints
// ----------------------------------------------------
adminRouter.get('/entitlements/search', requireAdminPermission('user.view'), async (c) => {
  const email = c.req.query('email');
  if (!email) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email query parameter is required' } }, 400);
  }

  const repo = new EntitlementRepository(c.env.DB);
  const service = new EntitlementService(repo);
  const account = await repo.getAccountByEmail(email);

  if (!account) {
    return c.json({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: `No account found with email ${email}` } }, 404);
  }

  const history = await service.getEntitlementHistory(account.account_id);

  return c.json(
    {
      success: true,
      data: {
        account: {
          accountId: account.account_id,
          email: account.email,
          createdAt: account.created_at,
          lastLoginAt: account.last_login_at,
        },
        ...history,
      },
    },
    200
  );
});

adminRouter.post('/entitlements/grant', requireAdminPermission('subscription.create'), async (c) => {
  const adminAccountId = c.get('accountId');
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON' } }, 400);
  }

  const parseResult = GrantSubscriptionRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid grant' } }, 400);
  }

  const subService = new SubscriptionManagementService(c.env.DB);
  try {
    const result = await subService.grantProAccess({ ...parseResult.data, adminAccountId });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

adminRouter.post('/entitlements/revoke', requireAdminPermission('subscription.revoke'), async (c) => {
  const adminAccountId = c.get('accountId');
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON' } }, 400);
  }

  const parseResult = RevokeSubscriptionRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid revoke' } }, 400);
  }

  const subService = new SubscriptionManagementService(c.env.DB);
  try {
    const result = await subService.revokeAccess({ ...parseResult.data, adminAccountId });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

adminRouter.get('/entitlements/:accountId/history', requireAdminPermission('subscription.view'), async (c) => {
  const accountId = c.req.param('accountId');
  if (!accountId) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'accountId parameter is required' } }, 400);
  }

  const repo = new EntitlementRepository(c.env.DB);
  const service = new EntitlementService(repo);

  try {
    const history = await service.getEntitlementHistory(accountId);
    return c.json({ success: true, data: history }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
});

adminRouter.get('/payment/config', requireAdminPermission('config.update'), async (c) => {
  const repo = new EntitlementRepository(c.env.DB);
  const service = new EntitlementService(repo);
  const config = await service.getPaymentConfig();
  return c.json({ success: true, data: config }, 200);
});

adminRouter.post('/payment/config', requireAdminPermission('config.update'), async (c) => {
  const adminAccountId = c.get('accountId');
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON' } }, 400);
  }

  const parseResult = UpdatePaymentConfigSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid payload' } }, 400);
  }

  const repo = new EntitlementRepository(c.env.DB);
  const service = new EntitlementService(repo);
  const updated = await service.setPaymentLive(parseResult.data.isLive, adminAccountId);

  return c.json({ success: true, data: updated }, 200);
});

// ----------------------------------------------------
// I. Account Lifecycle Management
// ----------------------------------------------------

async function handleDeactivateAccount(c: Context<{ Bindings: Env; Variables: AdminContextVariables }>) {
  const accountId = c.req.param('accountId') || c.req.param('id');
  if (!accountId) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'accountId parameter is required' } }, 400);
  }

  const adminAccountId = c.get('accountId');
  let reason: string | undefined;
  try {
    const raw = await c.req.json();
    const parsed = DeactivateAccountRequestSchema.safeParse(raw);
    if (parsed.success) reason = parsed.data.reason;
  } catch {
    // empty or non-JSON body is acceptable
  }

  const service = new AccountLifecycleService(c.env.DB);
  try {
    const result = await service.deactivateAccount({
      accountId,
      adminAccountId,
      reason,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
}

async function handleReactivateAccount(c: Context<{ Bindings: Env; Variables: AdminContextVariables }>) {
  const accountId = c.req.param('accountId') || c.req.param('id');
  if (!accountId) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'accountId parameter is required' } }, 400);
  }

  const adminAccountId = c.get('accountId');
  let reason: string | undefined;
  try {
    const raw = await c.req.json();
    const parsed = ReactivateAccountRequestSchema.safeParse(raw);
    if (parsed.success) reason = parsed.data.reason;
  } catch {
    // empty or non-JSON body is acceptable
  }

  const service = new AccountLifecycleService(c.env.DB);
  try {
    const result = await service.reactivateAccount({
      accountId,
      adminAccountId,
      reason,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
}

async function handleRevokeAllSessions(c: Context<{ Bindings: Env; Variables: AdminContextVariables }>) {
  const accountId = c.req.param('accountId') || c.req.param('id');
  if (!accountId) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'accountId parameter is required' } }, 400);
  }

  const adminAccountId = c.get('accountId');
  let reason: string | undefined;
  try {
    const raw = await c.req.json();
    const parsed = RevokeAllSessionsRequestSchema.safeParse(raw);
    if (parsed.success) reason = parsed.data.reason;
  } catch {
    // empty or non-JSON body is acceptable
  }

  const service = new AccountLifecycleService(c.env.DB);
  try {
    const result = await service.revokeAllSessions({
      accountId,
      adminAccountId,
      reason,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
}

async function handleDeleteAccount(c: Context<{ Bindings: Env; Variables: AdminContextVariables }>) {
  const accountId = c.req.param('accountId') || c.req.param('id');
  if (!accountId) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'accountId parameter is required' } }, 400);
  }

  const adminAccountId = c.get('accountId');
  let reason: string | undefined;
  try {
    const raw = await c.req.json();
    const parsed = DeleteAccountRequestSchema.safeParse(raw);
    if (parsed.success) reason = parsed.data.reason;
  } catch {
    // empty or non-JSON body is acceptable
  }

  const service = new AccountLifecycleService(c.env.DB);
  try {
    const result = await service.deleteAccount({
      accountId,
      adminAccountId,
      reason,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    return handleAdminError(err, c);
  }
}

// Routes registered with both /accounts/:accountId and /users/:accountId path structures
adminRouter.post('/accounts/:accountId/deactivate', requireAdminPermission('user.update'), handleDeactivateAccount);
adminRouter.post('/accounts/:accountId/reactivate', requireAdminPermission('user.update'), handleReactivateAccount);
adminRouter.post('/accounts/:accountId/revoke-sessions', requireAdminPermission('user.update'), handleRevokeAllSessions);
adminRouter.delete('/accounts/:accountId', requireAdminPermission('user.delete'), handleDeleteAccount);

adminRouter.post('/users/:accountId/deactivate', requireAdminPermission('user.update'), handleDeactivateAccount);
adminRouter.post('/users/:accountId/reactivate', requireAdminPermission('user.update'), handleReactivateAccount);
adminRouter.post('/users/:accountId/revoke-sessions', requireAdminPermission('user.update'), handleRevokeAllSessions);
adminRouter.delete('/users/:accountId', requireAdminPermission('user.delete'), handleDeleteAccount);


