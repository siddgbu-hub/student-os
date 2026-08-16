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
      const isPaidPlan = entitlement.isPaid || (entitlement.currentPlanId !== 'free_trial' && entitlement.currentPlanId !== 'free');
      const errorCode = !isPaidPlan && entitlement.status === 'expired' ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_REQUIRED';
      const errorMessage =
        !isPaidPlan && entitlement.status === 'expired'
          ? 'Your 7-day free trial has ended. Upgrade to Student OS Pro to continue full access.'
          : `Feature '${requiredFeature}' requires active subscription access.`;

      return c.json(
        {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
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
      const isPaidPlan = entitlement.isPaid || (entitlement.currentPlanId !== 'free_trial' && entitlement.currentPlanId !== 'free');
      const errorCode = isPaidPlan ? 'SUBSCRIPTION_REQUIRED' : 'TRIAL_EXPIRED';
      const errorMessage = isPaidPlan
        ? 'Your subscription has ended. Renew your Student OS subscription to continue full access.'
        : 'Your 7-day free trial has ended. Upgrade to Student OS Pro to continue full access.';

      return c.json(
        {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
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
