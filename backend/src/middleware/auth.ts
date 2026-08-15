import { Context, Next } from 'hono';
import { AuthRepository } from '../db/auth.repository.js';
import { SessionService } from '../modules/auth/session.service.js';
import { DeviceService } from '../modules/auth/device.service.js';

export interface AuthContextVariables {
  accountId: string;
  sessionId: string;
  deviceId: string;
}

export async function createAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        timestamp: new Date().toISOString(),
      },
      401
    );
  }

  const token = authHeader.substring(7);
  const isProd = c.env.ENVIRONMENT === 'production';
  const rawJwtSecret = c.env.JWT_SECRET;

  if (isProd && (!rawJwtSecret || rawJwtSecret === 'dev-secret-key-change-in-production')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'JWT_SECRET environment variable must be configured with a production secret.',
        },
        timestamp: new Date().toISOString(),
      },
      500
    );
  }

  const jwtSecret = rawJwtSecret || 'dev-secret-key-change-in-production';
  const repo = new AuthRepository(c.env.DB);
  const sessionService = new SessionService(repo);

  // Step 1 & 2: JWT Verification + Database Session Validation
  const sessionPayload = await sessionService.validateSession(token, jwtSecret);
  if (!sessionPayload) {
    return c.json(
      {
        success: false,
        error: { code: 'AUTH_SESSION_EXPIRED', message: 'Session expired or invalidated' },
        timestamp: new Date().toISOString(),
      },
      401
    );
  }

  // Step 3: Device Validation (One Device Policy)
  const reqDeviceId = c.req.header('x-device-id') || sessionPayload.deviceId;
  const deviceService = new DeviceService(repo);
  const isAuthorized = await deviceService.isDeviceAuthorized(sessionPayload.accountId, reqDeviceId);

  if (!isAuthorized) {
    return c.json(
      {
        success: false,
        error: {
          code: 'AUTH_DEVICE_REVOKED',
          message: 'Your account is currently active on another authorized device.',
        },
        timestamp: new Date().toISOString(),
      },
      403
    );
  }

  // Attach variables to Hono context
  c.set('accountId', sessionPayload.accountId);
  c.set('sessionId', sessionPayload.sessionId);
  c.set('deviceId', sessionPayload.deviceId);

  await next();
}
