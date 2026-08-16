import { Hono, Context } from 'hono';
import type { Env } from '../../index.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { requireActiveSubscription } from '../../middleware/entitlement.js';
import { GoalRepository } from '../../db/goal.repository.js';
import { GoalService } from './goal.service.js';
import { CreateGoalSchema, UpdateGoalSchema } from '@student-os/shared';

export const goalRouter = new Hono<{
  Bindings: Env;
  Variables: {
    accountId: string;
    sessionId: string;
    deviceId: string;
  };
}>();

goalRouter.use('*', createAuthMiddleware, requireActiveSubscription());

type GoalContext = Context<{
  Bindings: Env;
  Variables: { accountId: string; sessionId: string; deviceId: string };
}>;

function getGoalService(c: GoalContext): GoalService {
  const repo = new GoalRepository(c.env.DB);
  return new GoalService(repo);
}

// 1. GET /api/v1/goal
goalRouter.get('/', async (c) => {
  const accountId = c.get('accountId');
  const service = getGoalService(c);

  try {
    const progress = await service.getActiveGoalProgress(accountId);
    return c.json({ success: true, data: progress }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'FAILED_TO_GET_GOAL';
    return c.json({ success: false, error: message }, 400);
  }
});

// 2. POST /api/v1/goal
goalRouter.post('/', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json();
  const parseRes = CreateGoalSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'INVALID_GOAL_DATA', details: parseRes.error.format() }, 400);
  }

  const service = getGoalService(c);
  try {
    const progress = await service.createGoal(accountId, parseRes.data);
    return c.json({ success: true, data: progress }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CREATE_GOAL_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 3. PUT /api/v1/goal
goalRouter.put('/', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json();
  const parseRes = UpdateGoalSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'INVALID_GOAL_UPDATE_DATA', details: parseRes.error.format() }, 400);
  }

  const service = getGoalService(c);
  try {
    const progress = await service.updateGoal(accountId, parseRes.data);
    return c.json({ success: true, data: progress }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UPDATE_GOAL_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 4. DELETE /api/v1/goal
goalRouter.delete('/', async (c) => {
  const accountId = c.get('accountId');
  const service = getGoalService(c);

  try {
    await service.deleteActiveGoal(accountId);
    return c.json({ success: true, message: 'GOAL_DELETED' }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DELETE_GOAL_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});
