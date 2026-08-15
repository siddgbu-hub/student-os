import { Hono } from 'hono';
import { AuthRepository } from '../../db/auth.repository.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { DeviceService } from './device.service.js';
import { BrevoEmailService } from '../../services/email.service.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { SendOtpSchema, VerifyOtpSchema, GoogleAuthSchema, AUTH_ERRORS } from '@student-os/shared';
import type { Env } from '../../index.js';

export const authRouter = new Hono<{ Bindings: Env; Variables: { accountId: string; sessionId: string; deviceId: string } }>();

// 1. POST /api/v1/auth/email/send-otp
authRouter.post('/email/send-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = SendOtpSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: AUTH_ERRORS.INVALID_EMAIL, message: 'Invalid email address format' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new AuthRepository(c.env.DB);
  const emailService = new BrevoEmailService(
    c.env.BREVO_API_KEY,
    c.env.BREVO_FROM_EMAIL,
    c.env.BREVO_FROM_NAME
  );
  const authService = new AuthService(repo, emailService);

  try {
    const result = await authService.sendOtp(parseResult.data.email);
    return c.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'AUTH_SERVER_ERROR';
    if (errorMessage === AUTH_ERRORS.TOO_MANY_REQUESTS) {
      return c.json(
        {
          success: false,
          error: {
            code: AUTH_ERRORS.TOO_MANY_REQUESTS,
            message: 'Too many OTP requests. Please wait before trying again.',
          },
          timestamp: new Date().toISOString(),
        },
        429
      );
    }
    if (errorMessage === AUTH_ERRORS.EMAIL_DELIVERY_FAILED) {
      return c.json(
        {
          success: false,
          error: {
            code: AUTH_ERRORS.EMAIL_DELIVERY_FAILED,
            message: 'Failed to deliver verification code email. Please try again.',
          },
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
    return c.json(
      {
        success: false,
        error: { code: 'AUTH_SERVER_ERROR', message: 'Failed to send OTP' },
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// 2. POST /api/v1/auth/email/verify-otp
authRouter.post('/email/verify-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = VerifyOtpSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'AUTH_INVALID_OTP', message: parseResult.error.issues[0]?.message || 'Invalid input' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new AuthRepository(c.env.DB);
  const authService = new AuthService(repo);
  const deviceService = new DeviceService(repo);
  const sessionService = new SessionService(repo);

  try {
    const account = await authService.verifyOtp(parseResult.data.email, parseResult.data.otp);
    
    // Register device (enforces 1-device policy)
    await deviceService.registerDevice(
      account.accountId,
      parseResult.data.deviceId,
      parseResult.data.deviceModel,
      parseResult.data.osVersion
    );

    // Issue JWT & session record
    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const session = await sessionService.createSession(account.accountId, parseResult.data.deviceId, jwtSecret);

    return c.json({
      success: true,
      token: session.token,
      sessionId: session.sessionId,
      account: {
        accountId: account.accountId,
        email: account.email,
      },
      deviceStatus: {
        deviceId: parseResult.data.deviceId,
        isActive: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'AUTH_INVALID_OTP';
    return c.json(
      {
        success: false,
        error: { code: errorMessage, message: 'Invalid or expired verification code' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// 3. POST /api/v1/auth/google
authRouter.post('/google', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = GoogleAuthSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'AUTH_INVALID_GOOGLE_TOKEN', message: 'Google ID token and device ID are required' },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }

  const repo = new AuthRepository(c.env.DB);
  const authService = new AuthService(repo);
  const deviceService = new DeviceService(repo);
  const sessionService = new SessionService(repo);

  try {
    const account = await authService.authenticateGoogle(parseResult.data.idToken, c.env.GOOGLE_CLIENT_ID);

    // Register device (enforces 1-device policy)
    await deviceService.registerDevice(
      account.accountId,
      parseResult.data.deviceId,
      parseResult.data.deviceModel,
      parseResult.data.osVersion
    );

    // Issue JWT & session record
    const jwtSecret = c.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const session = await sessionService.createSession(account.accountId, parseResult.data.deviceId, jwtSecret);

    return c.json({
      success: true,
      token: session.token,
      sessionId: session.sessionId,
      account: {
        accountId: account.accountId,
        email: account.email,
      },
      deviceStatus: {
        deviceId: parseResult.data.deviceId,
        isActive: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : AUTH_ERRORS.INVALID_GOOGLE_TOKEN;
    console.error('[GoogleAuthController] Auth processing failure:', err instanceof Error ? err.stack || err.message : String(err));
    const errorCode =
      rawError === AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED
        ? AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED
        : AUTH_ERRORS.INVALID_GOOGLE_TOKEN;
    const message =
      rawError === AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED
        ? 'Google email is not verified'
        : 'Google authentication failed. Invalid or expired token.';

    return c.json(
      {
        success: false,
        error: { code: errorCode, message },
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// Protected routes below
authRouter.use('/session/*', createAuthMiddleware);
authRouter.use('/device/*', createAuthMiddleware);

// 4. GET /api/v1/auth/session/validate
authRouter.get('/session/validate', async (c) => {
  const accountId = c.get('accountId');
  const sessionId = c.get('sessionId');
  const deviceId = c.get('deviceId');
  const repo = new AuthRepository(c.env.DB);
  const account = await repo.findAccountById(accountId);

  return c.json({
    success: true,
    sessionId,
    account: account
      ? {
          accountId: account.account_id,
          email: account.email,
          createdAt: account.created_at,
          lastLoginAt: account.last_login_at,
        }
      : null,
    deviceStatus: {
      deviceId,
      isActive: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// 5. POST /api/v1/auth/session/logout
authRouter.post('/session/logout', async (c) => {
  const accountId = c.get('accountId');
  const sessionId = c.get('sessionId');
  const repo = new AuthRepository(c.env.DB);
  const sessionService = new SessionService(repo);

  await sessionService.logout(sessionId, accountId);

  return c.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString(),
  });
});

// 6. GET /api/v1/auth/device/status
authRouter.get('/device/status', async (c) => {
  const accountId = c.get('accountId');
  const deviceId = c.get('deviceId');
  const repo = new AuthRepository(c.env.DB);
  const deviceService = new DeviceService(repo);

  const isAuthorized = await deviceService.isDeviceAuthorized(accountId, deviceId);

  return c.json({
    success: true,
    deviceStatus: {
      deviceId,
      isActive: isAuthorized,
    },
    timestamp: new Date().toISOString(),
  });
});
