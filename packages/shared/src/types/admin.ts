import type { EntitlementDto, SubscriptionDto, EntitlementAuditLogDto } from './entitlement.js';

export type AdminRoleType = 'owner' | 'support' | 'finance';

export type AdminPermission =
  | '*'
  | 'user.view'
  | 'user.update'
  | 'user.delete'
  | 'subscription.view'
  | 'subscription.create'
  | 'subscription.update'
  | 'subscription.revoke'
  | 'payment.view'
  | 'payment.create'
  | 'audit.view'
  | 'config.update';

export interface AdminRoleDto {
  accountId: string;
  role: AdminRoleType;
  permissions: string[];
  grantedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'razorpay' | 'complimentary';
export type PaymentStatus = 'captured' | 'pending' | 'failed' | 'refunded';
export type PaymentSource = 'manual_admin' | 'gateway';

export interface PaymentDto {
  paymentId: string;
  accountId: string;
  subscriptionId: string | null;
  amountPaise: number;
  originalAmountPaise?: number | null;
  discountPercent?: number | null;
  discountAmountPaise?: number | null;
  currency: string;
  paymentMethod: PaymentMethod | string;
  transactionReference: string | null;
  status: PaymentStatus | string;
  source: PaymentSource | string;
  recordedBy: string;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  studentEmail?: string;
  studentName?: string;
}

export interface AdminOverviewDto {
  totalStudents: number;
  activeTrials: number;
  activeProMonthly: number;
  activeProYearly: number;
  expiredAccounts: number;
  expiringNext7Days: number;
  totalRevenuePaise: number;
}

export type UserStatusFilter = 'trial_active' | 'pro_active' | 'expired' | 'revoked' | 'active' | 'suspended';

export interface AdminUserSummaryDto {
  accountId: string;
  email: string;
  fullName: string;
  accountStatus: 'active' | 'suspended' | 'deleted' | string;
  currentPlanId: string;
  entitlementStatus: string;
  isPaid: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  createdAt: string;
  lastLoginAt: string;
  deviceCount: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface AdminUserDetailDto {
  account: {
    accountId: string;
    email: string;
    status: 'active' | 'suspended' | 'deleted' | string;
    createdAt: string;
    lastLoginAt: string;
    deletedAt?: string | null;
    deletedBy?: string | null;
  };
  profile: {
    fullName: string;
    avatarUrl: string | null;
    institutionName: string | null;
    course: string | null;
    classYear: string | null;
    stream: string | null;
    examinationType: string | null;
  } | null;
  entitlement: EntitlementDto | null;
  subscriptions: SubscriptionDto[];
  payments: PaymentDto[];
  devices: Array<{
    deviceId: string;
    deviceModel: string | null;
    osVersion: string | null;
    platform: 'android' | 'web' | 'admin' | 'unknown';
    isActive: boolean;
    registeredAt: string;
    lastActiveAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
  }>;
  auditLogs: EntitlementAuditLogDto[];
  adminRole?: AdminRoleDto | null;
}

export interface GrantSubscriptionRequest {
  accountId: string;
  planId: 'monthly' | 'yearly';
  durationDays?: number;
  reason: string;
  paymentId?: string;
}

export interface ExtendSubscriptionRequest {
  accountId: string;
  durationDays: number;
  reason: string;
}

export interface ChangePlanRequest {
  accountId: string;
  newPlanId: 'monthly' | 'yearly';
  reason: string;
}

export interface RevokeSubscriptionRequest {
  accountId: string;
  reason: string;
}

export interface CancelRevokeSubscriptionRequest {
  accountId: string;
  reason: string;
}

export interface DeactivateAccountRequest {
  reason?: string;
}

export interface ReactivateAccountRequest {
  reason?: string;
}

export interface RevokeAllSessionsRequest {
  reason?: string;
}

export interface DeleteAccountRequest {
  reason?: string;
}

export interface RecordPaymentRequest {
  accountId: string;
  planId: 'monthly' | 'yearly';
  discountPercent?: number;
  amountPaise?: number;
  currency?: string;
  paymentMethod: PaymentMethod | string;
  transactionReference?: string | null;
  durationDays?: number;
  notes?: string;
  activatePro?: boolean;
}
