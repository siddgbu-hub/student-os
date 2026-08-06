import { Hono, Context } from 'hono';
import type { Env } from '../../index.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { AccountRepository } from '../../db/account.repository.js';
import { AccountService } from './account.service.js';
import { UpdateProfileSchema, UpdatePreferencesSchema } from '@student-os/shared';

export const accountRouter = new Hono<{
  Bindings: Env;
  Variables: {
    accountId: string;
    sessionId: string;
    deviceId: string;
  };
}>();

accountRouter.use('*', createAuthMiddleware);

type AccountContext = Context<{
  Bindings: Env;
  Variables: { accountId: string; sessionId: string; deviceId: string };
}>;

function getAccountService(c: AccountContext): AccountService {
  const repo = new AccountRepository(c.env.DB);
  return new AccountService(repo);
}

// 1. GET /api/v1/account/overview
accountRouter.get('/overview', async (c) => {
  const accountId = c.get('accountId');
  const deviceId = c.get('deviceId');
  const service = getAccountService(c);

  try {
    const overview = await service.getAccountOverview(accountId, deviceId);
    return c.json({ success: true, data: overview }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'FAILED_TO_GET_OVERVIEW';
    return c.json({ success: false, error: message }, 400);
  }
});

// 2. GET /api/v1/account/profile
accountRouter.get('/profile', async (c) => {
  const accountId = c.get('accountId');
  const deviceId = c.get('deviceId');
  const service = getAccountService(c);

  try {
    const overview = await service.getAccountOverview(accountId, deviceId);
    return c.json({ success: true, data: overview.profile }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'FAILED_TO_GET_PROFILE';
    return c.json({ success: false, error: message }, 400);
  }
});

// 3. PUT /api/v1/account/profile
accountRouter.put('/profile', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json();
  const parseRes = UpdateProfileSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'INVALID_PROFILE_DATA', details: parseRes.error.format() }, 400);
  }

  const service = getAccountService(c);
  try {
    const updated = await service.updateProfile(accountId, parseRes.data);
    return c.json({ success: true, data: updated }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UPDATE_PROFILE_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 4. GET /api/v1/account/preferences
accountRouter.get('/preferences', async (c) => {
  const accountId = c.get('accountId');
  const deviceId = c.get('deviceId');
  const service = getAccountService(c);

  try {
    const overview = await service.getAccountOverview(accountId, deviceId);
    return c.json({ success: true, data: overview.preferences }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'FAILED_TO_GET_PREFERENCES';
    return c.json({ success: false, error: message }, 400);
  }
});

// 5. PUT /api/v1/account/preferences
accountRouter.put('/preferences', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json();
  const parseRes = UpdatePreferencesSchema.safeParse(body);

  if (!parseRes.success) {
    return c.json({ success: false, error: 'INVALID_PREFERENCES_DATA', details: parseRes.error.format() }, 400);
  }

  const service = getAccountService(c);
  try {
    const updated = await service.updatePreferences(accountId, parseRes.data);
    return c.json({ success: true, data: updated }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UPDATE_PREFERENCES_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 6. GET /api/v1/account/devices
accountRouter.get('/devices', async (c) => {
  const accountId = c.get('accountId');
  const deviceId = c.get('deviceId');
  const service = getAccountService(c);

  try {
    const devices = await service.getDevices(accountId, deviceId);
    return c.json({ success: true, data: devices }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'FAILED_TO_GET_DEVICES';
    return c.json({ success: false, error: message }, 400);
  }
});

// 7. DELETE /api/v1/account/devices/:id
accountRouter.delete('/devices/:id', async (c) => {
  const accountId = c.get('accountId');
  const targetDeviceId = c.req.param('id');
  const service = getAccountService(c);

  try {
    await service.revokeDevice(accountId, targetDeviceId);
    return c.json({ success: true, message: 'DEVICE_REVOKED' }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'REVOKE_DEVICE_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});

// 8. POST /api/v1/account/delete
accountRouter.post('/delete', async (c) => {
  const accountId = c.get('accountId');
  const service = getAccountService(c);

  try {
    await service.deleteAccount(accountId);
    return c.json({ success: true, message: 'ACCOUNT_PERMANENTLY_DELETED' }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DELETE_ACCOUNT_FAILED';
    return c.json({ success: false, error: message }, 400);
  }
});
