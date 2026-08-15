import { z } from 'zod';

export const AdminRoleTypeSchema = z.enum(['owner', 'support', 'finance']);

export const AdminPermissionSchema = z.enum([
  '*',
  'user.view',
  'subscription.view',
  'subscription.create',
  'subscription.update',
  'subscription.revoke',
  'payment.view',
  'payment.create',
  'audit.view',
  'config.update',
]);

export const AdminRoleDtoSchema = z.object({
  accountId: z.string().uuid(),
  role: AdminRoleTypeSchema,
  permissions: z.array(z.string()),
  grantedBy: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaymentMethodSchema = z.enum(['upi', 'bank_transfer', 'cash', 'razorpay', 'complimentary']);
export const PaymentStatusSchema = z.enum(['captured', 'pending', 'failed', 'refunded']);
export const PaymentSourceSchema = z.enum(['manual_admin', 'gateway']);

export const PaymentDtoSchema = z.object({
  paymentId: z.string().uuid(),
  accountId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable().optional(),
  amountPaise: z.number().int().nonnegative(),
  originalAmountPaise: z.number().int().nonnegative().nullable().optional(),
  discountPercent: z.number().int().min(0).max(100).default(0).optional(),
  discountAmountPaise: z.number().int().nonnegative().default(0).optional(),
  currency: z.string().default('INR'),
  paymentMethod: PaymentMethodSchema,
  transactionReference: z.string().nullable().optional(),
  status: PaymentStatusSchema,
  source: PaymentSourceSchema,
  recordedBy: z.string(),
  notes: z.string().max(1000).nullable().optional(),
  receiptUrl: z.string().url().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  studentEmail: z.string().email().optional(),
  studentName: z.string().optional(),
});

export const AdminOverviewSchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  activeTrials: z.number().int().nonnegative(),
  activeProMonthly: z.number().int().nonnegative(),
  activeProYearly: z.number().int().nonnegative(),
  expiredAccounts: z.number().int().nonnegative(),
  expiringNext7Days: z.number().int().nonnegative(),
  totalRevenuePaise: z.number().int().nonnegative(),
});

export const UserStatusFilterSchema = z.enum(['trial_active', 'pro_active', 'expired', 'revoked']);

export const AdminUsersQuerySchema = z.object({
  query: z.string().max(100).optional(),
  status: UserStatusFilterSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const AdminUserSummarySchema = z.object({
  accountId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  currentPlanId: z.string(),
  entitlementStatus: z.string(),
  isPaid: z.boolean(),
  expiresAt: z.string().nullable(),
  daysRemaining: z.number().nullable(),
  createdAt: z.string(),
  lastLoginAt: z.string(),
});

export const GrantSubscriptionRequestSchema = z.object({
  accountId: z.string().uuid('Valid accountId UUID is required'),
  planId: z.enum(['monthly', 'yearly']),
  durationDays: z.number().int().min(1).max(3650).optional(),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500, 'Reason cannot exceed 500 characters'),
  paymentId: z.string().uuid().optional(),
});

export const ExtendSubscriptionRequestSchema = z.object({
  accountId: z.string().uuid('Valid accountId UUID is required'),
  durationDays: z.number().int().min(1, 'durationDays must be at least 1').max(3650, 'durationDays cannot exceed 3650'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500, 'Reason cannot exceed 500 characters'),
});

export const ChangePlanRequestSchema = z.object({
  accountId: z.string().uuid('Valid accountId UUID is required'),
  newPlanId: z.enum(['monthly', 'yearly']),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500, 'Reason cannot exceed 500 characters'),
});

export const RevokeSubscriptionRequestSchema = z.object({
  accountId: z.string().uuid('Valid accountId UUID is required'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500, 'Reason cannot exceed 500 characters'),
});

export const RecordPaymentRequestSchema = z.object({
  accountId: z.string().uuid('Valid accountId UUID is required'),
  planId: z.enum(['monthly', 'yearly']),
  discountPercent: z.number().int('discountPercent must be an integer').min(0, 'discountPercent cannot be negative').max(100, 'discountPercent cannot exceed 100').default(0),
  amountPaise: z.number().int().nonnegative('amountPaise must be non-negative integer').optional(),
  currency: z.string().default('INR'),
  paymentMethod: PaymentMethodSchema,
  transactionReference: z.string().trim().nullable().optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  notes: z.string().max(1000).optional(),
  activatePro: z.boolean().default(true),
});

export const AdminPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: PaymentStatusSchema.optional(),
  method: PaymentMethodSchema.optional(),
  accountId: z.string().uuid().optional(),
});

export const AdminAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  eventType: z.string().optional(),
  accountId: z.string().uuid().optional(),
});
