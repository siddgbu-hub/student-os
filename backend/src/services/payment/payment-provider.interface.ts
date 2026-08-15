import type { CheckoutSessionDto, PaymentVerificationResultDto } from '@student-os/shared';

export interface CreateCheckoutParams {
  accountId: string;
  planId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface PaymentDetails {
  paymentId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  status: 'captured' | 'failed' | 'pending' | 'refunded';
  customerEmail: string;
  createdAt: string;
}

export interface RefundPaymentParams {
  paymentId: string;
  amountCents?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amountRefundedCents: number;
  status: string;
}

export interface WebhookEvent {
  event: string;
  payload: Record<string, unknown>;
  rawBody: string;
  signature: string;
}

export interface WebhookHandlingResult {
  handled: boolean;
  eventType: string;
  accountId?: string;
  planId?: string;
  paymentId?: string;
  actionTaken?: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSessionDto>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResultDto>;
  getPayment(paymentId: string): Promise<PaymentDetails>;
  refundPayment(params: RefundPaymentParams): Promise<RefundResult>;
  verifyWebhook(payload: string, signature: string, secret: string): Promise<boolean>;
  handleWebhook(event: WebhookEvent): Promise<WebhookHandlingResult>;
}

/**
 * Placeholder / Generic Provider implementation when live merchant keys are not configured.
 */
export class GenericPaymentProvider implements PaymentProvider {
  readonly name = 'generic';
  readonly isConfigured = false;

  async createCheckout(_params: CreateCheckoutParams): Promise<CheckoutSessionDto> {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED: Live merchant credentials (Razorpay/Stripe) are not yet configured on this environment.');
  }

  async verifyPayment(_params: VerifyPaymentParams): Promise<PaymentVerificationResultDto> {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED: Payment verification requires configured merchant webhook/API secret.');
  }

  async getPayment(_paymentId: string): Promise<PaymentDetails> {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }

  async refundPayment(_params: RefundPaymentParams): Promise<RefundResult> {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }

  async verifyWebhook(_payload: string, _signature: string, _secret: string): Promise<boolean> {
    return false;
  }

  async handleWebhook(_event: WebhookEvent): Promise<WebhookHandlingResult> {
    return { handled: false, eventType: 'unknown' };
  }
}
