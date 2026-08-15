import { Hono } from 'hono';
import type { Env } from '../../index.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { EntitlementRepository } from '../../db/entitlement.repository.js';
import { EntitlementService } from './entitlement.service.js';
import { CreateCheckoutSchema, VerifyPaymentSchema } from '@student-os/shared';
import { GenericPaymentProvider } from '../../services/payment/payment-provider.interface.js';
import { RazorpayPaymentProvider } from '../../services/payment/razorpay-payment.provider.js';

function resolvePaymentProvider(env: Env) {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    return new RazorpayPaymentProvider({
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.PAYMENT_WEBHOOK_SECRET,
    });
  }
  return new GenericPaymentProvider();
}

export const entitlementRouter = new Hono<{
  Bindings: Env;
  Variables: {
    accountId: string;
    sessionId: string;
    deviceId: string;
  };
}>();

// 1. GET /api/v1/entitlement/plans (Public)
entitlementRouter.get('/plans', async (c) => {
  const repo = new EntitlementRepository(c.env.DB);
  const provider = resolvePaymentProvider(c.env);
  const service = new EntitlementService(repo, provider);
  const plans = await service.getPlans();
  return c.json({ success: true, data: plans }, 200);
});

// Authenticated Entitlement Routes
entitlementRouter.use('/status', createAuthMiddleware);

// 2. GET /api/v1/entitlement/status (User's Entitlement)
entitlementRouter.get('/status', async (c) => {
  const accountId = c.get('accountId');
  const repo = new EntitlementRepository(c.env.DB);
  const provider = resolvePaymentProvider(c.env);
  const service = new EntitlementService(repo, provider);

  try {
    const entitlement = await service.getEntitlement(accountId);
    return c.json({ success: true, data: entitlement }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'FAILED_TO_GET_ENTITLEMENT';
    return c.json({ success: false, error: { code: 'ENTITLEMENT_ERROR', message } }, 400);
  }
});

export const paymentRouter = new Hono<{
  Bindings: Env;
  Variables: {
    accountId: string;
    sessionId: string;
    deviceId: string;
  };
}>();

// 3. GET /api/v1/payment/config (Public)
paymentRouter.get('/config', async (c) => {
  const repo = new EntitlementRepository(c.env.DB);
  const provider = resolvePaymentProvider(c.env);
  const service = new EntitlementService(repo, provider);
  const config = await service.getPaymentConfig();
  return c.json({ success: true, data: config }, 200);
});

// 4. POST /api/v1/payment/checkout (Authenticated, Gated by Live toggle)
paymentRouter.post('/checkout', createAuthMiddleware, async (c) => {
  const accountId = c.get('accountId');
  const repo = new EntitlementRepository(c.env.DB);
  const provider = resolvePaymentProvider(c.env);
  const service = new EntitlementService(repo, provider);

  const config = await service.getPaymentConfig();
  if (!config.isLive) {
    return c.json(
      {
        success: false,
        error: {
          code: 'PAYMENTS_DISABLED',
          message: 'Direct customer payments are currently disabled. Contact the administrator for manual access.',
        },
        timestamp: new Date().toISOString(),
      },
      403
    );
  }

  if (!provider.isConfigured) {
    return c.json(
      {
        success: false,
        error: {
          code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
          message: 'Payment gateway credentials (Razorpay) are not configured on this environment.',
        },
      },
      503
    );
  }

  const rawBody = await c.req.json();
  const parseResult = CreateCheckoutSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid checkout payload' },
      },
      400
    );
  }

  // Retrieve account email
  const account = await repo.getAccountById(accountId);
  if (!account) {
    return c.json({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'User account not found' } }, 404);
  }

  try {
    const result = await service.createCheckoutSession({
      accountId,
      planId: parseResult.data.planId,
      customerEmail: account.email,
    });

    return c.json({ success: true, data: result.checkout }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CHECKOUT_CREATION_FAILED';
    return c.json({ success: false, error: { code: 'CHECKOUT_ERROR', message } }, 400);
  }
});

// 5. POST /api/v1/payment/verify (Authenticated)
paymentRouter.post('/verify', createAuthMiddleware, async (c) => {
  const accountId = c.get('accountId');
  const repo = new EntitlementRepository(c.env.DB);
  const provider = resolvePaymentProvider(c.env);
  const service = new EntitlementService(repo, provider);

  const rawBody = await c.req.json();
  const parseResult = VerifyPaymentSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid verification payload' },
      },
      400
    );
  }

  const planId = (rawBody.planId as string) || 'monthly';

  try {
    const result = await service.verifyAndActivatePayment({
      accountId,
      planId,
      orderId: parseResult.data.orderId,
      paymentId: parseResult.data.paymentId,
      signature: parseResult.data.signature,
    });

    if (!result.verified) {
      return c.json(
        {
          success: false,
          error: { code: 'PAYMENT_VERIFICATION_FAILED', message: result.error || 'Signature verification failed' },
        },
        400
      );
    }

    return c.json({ success: true, data: { subscription: result.subscription, entitlement: result.entitlement } }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PAYMENT_VERIFICATION_ERROR';
    return c.json({ success: false, error: { code: 'PAYMENT_VERIFICATION_ERROR', message } }, 400);
  }
});

// 6. POST /api/v1/payment/webhook (Public, HMAC-Protected)
paymentRouter.post('/webhook', async (c) => {
  const signature = c.req.header('x-razorpay-signature') || '';
  if (!signature) {
    return c.json({ success: false, error: { code: 'MISSING_SIGNATURE', message: 'Webhook signature header missing' } }, 401);
  }

  const rawBody = await c.req.text();
  const repo = new EntitlementRepository(c.env.DB);
  const provider = resolvePaymentProvider(c.env);
  const service = new EntitlementService(repo, provider);

  try {
    const result = await service.processWebhook({
      rawBody,
      signature,
      secret: c.env.PAYMENT_WEBHOOK_SECRET,
    });

    return c.json({ success: true, data: result }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'WEBHOOK_PROCESSING_FAILED';
    return c.json({ success: false, error: { code: 'WEBHOOK_ERROR', message } }, 400);
  }
});
