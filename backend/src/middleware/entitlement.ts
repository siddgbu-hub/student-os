import { Context, Next } from 'hono';
import type { Env } from '../index.js';
import { EntitlementRepository } from '../db/entitlement.repository.js';
import { EntitlementService } from '../modules/entitlement/entitlement.service.js';

export function requireEntitlement(requiredFeature: string) {
  return async (c: Context<{ Bindings: Env; Variables: { accountId: string } }>, next: Next) => {
    const accountId = c.get('accountId');
    if (!accountId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const repo = new EntitlementRepository(c.env.DB);
    const service = new EntitlementService(repo);
    const entitlement = await service.getEntitlement(accountId);

    if (entitlement.status !== 'active' || !entitlement.features.includes(requiredFeature)) {
      return c.json(
        {
          success: false,
          error: {
            code: entitlement.status === 'expired' ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_REQUIRED',
            message:
              entitlement.status === 'expired'
                ? 'Your 7-day free trial has ended. Upgrade to Student OS Pro to continue full access.'
                : `Feature '${requiredFeature}' requires active subscription access.`,
            requiredFeature,
            currentPlan: entitlement.currentPlanId,
            status: entitlement.status,
          },
          timestamp: new Date().toISOString(),
        },
        403
      );
    }

    return next();
  };
}

export function requireActiveSubscription() {
  return async (c: Context<{ Bindings: Env; Variables: { accountId: string } }>, next: Next) => {
    const accountId = c.get('accountId');
    if (!accountId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const repo = new EntitlementRepository(c.env.DB);
    const service = new EntitlementService(repo);
    const entitlement = await service.getEntitlement(accountId);

    if (entitlement.status !== 'active') {
      return c.json(
        {
          success: false,
          error: {
            code: entitlement.status === 'expired' ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_REQUIRED',
            message:
              entitlement.status === 'expired'
                ? 'Your 7-day free trial has ended. Upgrade to Student OS Pro to continue full access.'
                : 'Active subscription or trial required to access this resource.',
            currentPlan: entitlement.currentPlanId,
            status: entitlement.status,
          },
          timestamp: new Date().toISOString(),
        },
        403
      );
    }

    return next();
  };
}

export function requirePlan(allowedPlans: string[]) {
  return async (c: Context<{ Bindings: Env; Variables: { accountId: string } }>, next: Next) => {
    const accountId = c.get('accountId');
    if (!accountId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const repo = new EntitlementRepository(c.env.DB);
    const service = new EntitlementService(repo);
    const entitlement = await service.getEntitlement(accountId);

    if (!allowedPlans.includes(entitlement.currentPlanId)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'PLAN_REQUIRED',
            message: `This action requires one of the following plans: ${allowedPlans.join(', ')}`,
            currentPlan: entitlement.currentPlanId,
          },
          timestamp: new Date().toISOString(),
        },
        403
      );
    }

    return next();
  };
}
