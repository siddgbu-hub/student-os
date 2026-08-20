import { z } from 'zod';

export const AdminRoleTypeSchema = z.enum(['owner', 'support', 'finance']);

export const AdminPermissionSchema = z.enum([
  '*',
  'user.view',
  'user.update',
  'user.manage',
  'user.delete',
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

export const UserStatusFilterSchema = z.enum([
  'trial_active',
  'pro_active',
  'expired',
  'revoked',
  'active',
  'suspended',
]);

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
  accountStatus: z.string().default('active'),
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

export const CancelRevokeSubscriptionRequestSchema = z.object({
  accountId: z.string().uuid('Valid accountId UUID is required'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500, 'Reason cannot exceed 500 characters'),
});

export const DeactivateAccountRequestSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const ReactivateAccountRequestSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const RevokeAllSessionsRequestSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const DeleteAccountRequestSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
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

export const AppFeatureFlagsSchema = z.object({
  analytics: z.boolean().default(true),
  planner: z.boolean().default(true),
  revision: z.boolean().default(true),
  study: z.boolean().default(true),
  payments: z.boolean().default(true),
  webVersion: z.boolean().default(true),
  newDashboard: z.boolean().default(true),
});

export const AppAnnouncementSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  actionUrl: z.string().url('Action URL must be a valid URL').optional().nullable(),
  actionText: z.string().max(50).optional().nullable(),
  dismissible: z.boolean().default(true),
  createdAt: z.string(),
});

export const RemoteAppConfigSchema = z.object({
  minimumSupportedVersion: z.string().regex(/^\d+(\.\d+)*$/, 'Invalid semantic version'),
  minimumSupportedVersionCode: z.number().int().positive('Minimum version code must be positive'),
  latestVersion: z.string().regex(/^\d+(\.\d+)*$/, 'Invalid semantic version'),
  latestVersionCode: z.number().int().positive('Latest version code must be positive'),
  recommendedUpdateVersion: z.string().regex(/^\d+(\.\d+)*$/, 'Invalid semantic version'),
  forceUpdate: z.boolean().default(false),
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().max(500).nullable().optional(),
  features: AppFeatureFlagsSchema.default({}),
  webUrl: z.string().url('Web URL must be valid'),
  githubReleaseUrl: z.string().url('GitHub release URL must be valid'),
  githubLatestReleaseUrl: z.string().url('GitHub latest release URL must be valid'),
  githubLatestApkUrl: z.string().url('GitHub latest APK URL must be valid'),
  latestApkSha256: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Checksum must be 64-char hex').nullable().optional().or(z.literal('')),
  helpUrl: z.string().url('Help URL must be valid'),
  supportEmail: z.string().email('Support email must be valid').nullable().optional().or(z.literal('')),
  announcements: z.array(AppAnnouncementSchema).default([]),
});

export const UpdateRemoteAppConfigSchema = RemoteAppConfigSchema.partial();

export type AppFeatureFlags = z.infer<typeof AppFeatureFlagsSchema>;
export type AppAnnouncement = z.infer<typeof AppAnnouncementSchema>;
export type RemoteAppConfig = z.infer<typeof RemoteAppConfigSchema>;
export type UpdateRemoteAppConfig = z.infer<typeof UpdateRemoteAppConfigSchema>;

