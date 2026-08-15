import { z } from 'zod';

export const ManualGrantEntitlementSchema = z.object({
  accountId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  planId: z.enum(['free_trial', 'free', 'monthly', 'yearly']),
  durationDays: z.number().int().positive().optional(),
  expiryDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/)).optional(),
  reason: z.string().max(500).optional(),
}).refine((data) => data.accountId || data.email, {
  message: 'Either accountId or email must be provided',
  path: ['email'],
});

export type ManualGrantEntitlementInput = z.infer<typeof ManualGrantEntitlementSchema>;

export const RevokeEntitlementSchema = z.object({
  accountId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  reason: z.string().max(500).optional(),
}).refine((data) => data.accountId || data.email, {
  message: 'Either accountId or email must be provided',
  path: ['email'],
});

export type RevokeEntitlementInput = z.infer<typeof RevokeEntitlementSchema>;

export const UpdatePaymentConfigSchema = z.object({
  isLive: z.boolean(),
});

export type UpdatePaymentConfigInput = z.infer<typeof UpdatePaymentConfigSchema>;

export const CreateCheckoutSchema = z.object({
  planId: z.enum(['monthly', 'yearly']),
  provider: z.string().default('generic'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>;

export const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().optional(),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
