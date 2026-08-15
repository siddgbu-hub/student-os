import type { CheckoutSessionDto, PaymentVerificationResultDto } from '@student-os/shared';
import {
  PaymentProvider,
  CreateCheckoutParams,
  VerifyPaymentParams,
  PaymentDetails,
  RefundPaymentParams,
  RefundResult,
  WebhookEvent,
  WebhookHandlingResult,
} from './payment-provider.interface.js';
import { createHmacSha256, timingSafeEqual } from '../crypto.service.js';

export interface RazorpayConfig {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
}

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay';
  readonly isConfigured: boolean;
  private readonly keyId?: string;
  private readonly keySecret?: string;
  private readonly webhookSecret?: string;

  constructor(config: RazorpayConfig = {}) {
    this.keyId = config.keyId?.trim();
    this.keySecret = config.keySecret?.trim();
    this.webhookSecret = config.webhookSecret?.trim();
    this.isConfigured = Boolean(this.keyId && this.keySecret);
  }

  private getAuthHeader(): string {
    if (!this.keyId || !this.keySecret) {
      throw new Error('RAZORPAY_CONFIG_ERROR: Key ID and Key Secret must be configured.');
    }
    const token = btoa(`${this.keyId}:${this.keySecret}`);
    return `Basic ${token}`;
  }

  /**
   * 1. Create Razorpay Order
   * Amount is strictly passed in integer paise (e.g. 29900 for ₹299).
   */
  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSessionDto> {
    if (!this.isConfigured) {
      throw new Error('RAZORPAY_NOT_CONFIGURED: Razorpay credentials are not configured on this environment.');
    }

    const payload = {
      amount: params.amountCents, // Amount in paise
      currency: params.currency || 'INR',
      receipt: `rcpt_${params.accountId.substring(0, 8)}_${Date.now()}`,
      notes: {
        accountId: params.accountId,
        planId: params.planId,
        customerEmail: params.customerEmail,
        ...(params.metadata || {}),
      },
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`RAZORPAY_ORDER_CREATION_FAILED: ${response.status} - ${errorBody}`);
    }

    const orderData = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
      status: string;
      receipt: string;
    };

    return {
      checkoutId: orderData.id,
      provider: 'razorpay',
      planId: params.planId,
      amountCents: orderData.amount,
      currency: orderData.currency,
      checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js?order_id=${orderData.id}`,
    };
  }

  /**
   * 2. Verify Payment Signature
   * Signature is HMAC-SHA256 of `${orderId}|${paymentId}` generated using key_secret.
   */
  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResultDto> {
    if (!this.isConfigured || !this.keySecret) {
      throw new Error('RAZORPAY_NOT_CONFIGURED: Key secret required for payment signature verification.');
    }

    if (!params.signature) {
      return {
        success: false,
        error: 'Missing payment signature for verification',
      };
    }

    const message = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = await createHmacSha256(message, this.keySecret);

    const isMatch = timingSafeEqual(params.signature, expectedSignature);
    if (!isMatch) {
      return {
        success: false,
        error: 'Payment signature mismatch / tampered payment',
      };
    }

    return {
      success: true,
    };
  }

  /**
   * 3. Fetch Payment Details from Razorpay API
   */
  async getPayment(paymentId: string): Promise<PaymentDetails> {
    if (!this.isConfigured) {
      throw new Error('RAZORPAY_NOT_CONFIGURED');
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`RAZORPAY_GET_PAYMENT_FAILED: ${response.status}`);
    }

    const data = (await response.json()) as {
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
      email: string;
      created_at: number;
    };

    let status: PaymentDetails['status'] = 'pending';
    if (data.status === 'captured') status = 'captured';
    else if (data.status === 'failed') status = 'failed';
    else if (data.status === 'refunded') status = 'refunded';

    return {
      paymentId: data.id,
      orderId: data.order_id,
      amountCents: data.amount,
      currency: data.currency,
      status,
      customerEmail: data.email || '',
      createdAt: new Date(data.created_at * 1000).toISOString(),
    };
  }

  /**
   * 4. Refund Payment via Razorpay API
   */
  async refundPayment(params: RefundPaymentParams): Promise<RefundResult> {
    if (!this.isConfigured) {
      throw new Error('RAZORPAY_NOT_CONFIGURED');
    }

    const body: Record<string, unknown> = {};
    if (params.amountCents) body.amount = params.amountCents;
    if (params.reason) body.notes = { reason: params.reason };

    const response = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RAZORPAY_REFUND_FAILED: ${response.status}`);
    }

    const data = (await response.json()) as {
      id: string;
      amount: number;
      status: string;
    };

    return {
      success: true,
      refundId: data.id,
      amountRefundedCents: data.amount,
      status: data.status,
    };
  }

  /**
   * 5. Verify Webhook Signature
   * Signature is HMAC-SHA256 of raw webhook body computed with webhook_secret.
   */
  async verifyWebhook(payload: string, signature: string, secret?: string): Promise<boolean> {
    const activeSecret = secret?.trim() || this.webhookSecret;
    if (!activeSecret) {
      return false;
    }

    const expectedSignature = await createHmacSha256(payload, activeSecret);
    return timingSafeEqual(signature, expectedSignature);
  }

  /**
   * 6. Handle Parsed Webhook Event
   */
  async handleWebhook(event: WebhookEvent): Promise<WebhookHandlingResult> {
    const eventType = event.event;
    const payload = (event.payload?.payload as Record<string, any>) || (event.payload as Record<string, any>) || {};

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payment?.entity || payload.order?.entity || payload.entity || payload;
      const notes = paymentEntity.notes || {};
      const accountId = notes.accountId || notes.account_id;
      const planId = notes.planId || notes.plan_id;
      const paymentId = paymentEntity.id;

      return {
        handled: true,
        eventType,
        accountId,
        planId,
        paymentId,
        actionTaken: 'activate_entitlement',
      };
    }

    if (eventType === 'payment.failed') {
      const paymentEntity = payload.payment?.entity || {};
      return {
        handled: true,
        eventType,
        paymentId: paymentEntity.id,
        actionTaken: 'payment_failed',
      };
    }

    if (eventType === 'refund.processed') {
      const refundEntity = payload.refund?.entity || {};
      return {
        handled: true,
        eventType,
        paymentId: refundEntity.payment_id,
        actionTaken: 'refund_processed',
      };
    }

    return {
      handled: true,
      eventType,
      actionTaken: 'ignored',
    };
  }
}
