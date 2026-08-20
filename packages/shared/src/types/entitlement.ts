export type PlanTier = 'free_trial' | 'monthly' | 'yearly' | 'free';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'revoked' | 'grace_period';
export type SubscriptionSource = 'manual' | 'payment' | 'trial';
export type EntitlementStatus = 'active' | 'expired' | 'revoked';

export const ALL_STUDENT_OS_FEATURES: string[] = [
  'dashboard',
  'goals',
  'study',
  'planner',
  'revision',
  'analytics',
  'account',
  'cloud_sync',
];

/**
 * Authoritative Student OS Plan Configuration & Pricing (in integer paise)
 * Monthly: ₹30 for 30 days (3000 paise)
 * Yearly: ₹299 for 365 days (29900 paise)
 */
export const STUDENT_OS_PLANS = {
  monthly: {
    planId: 'monthly' as const,
    name: 'Student OS Pro Monthly',
    durationDays: 30,
    listPricePaise: 3000,
    currency: 'INR',
  },
  yearly: {
    planId: 'yearly' as const,
    name: 'Student OS Pro Yearly',
    durationDays: 365,
    listPricePaise: 29900,
    currency: 'INR',
  },
  free_trial: {
    planId: 'free_trial' as const,
    name: '7-Day Free Trial',
    durationDays: 7,
    listPricePaise: 0,
    currency: 'INR',
  },
} as const;

export const PLAN_PRICING_PAISE = {
  monthly: 3000,
  yearly: 29900,
} as const;

export interface PlanDto {
  planId: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  durationDays: number | null;
  features: string[];
  isActive: boolean;
  paymentProviderProductId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDto {
  subscriptionId: string;
  accountId: string;
  planId: string;
  planName?: string;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  grantedBy: string | null;
  startDate: string;
  expiryDate: string | null;
  cancelledAt: string | null;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementDto {
  entitlementId: string;
  accountId: string;
  currentPlanId: string;
  planName: string;
  status: EntitlementStatus;
  isPaid: boolean;
  features: string[];
  expiresAt: string | null;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementAuditLogDto {
  id: string;
  accountId: string;
  eventType: string;
  planId: string;
  grantedBy: string;
  source: string;
  startDate: string;
  expiryDate: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaymentConfigDto {
  isLive: boolean;
  supportedProviders: string[];
  activeProvider: string | null;
  contactWhatsApp?: string | null;
  contactUpi?: string | null;
  updatedAt: string;
}

export interface CheckoutSessionDto {
  checkoutId: string;
  planId: string;
  amountCents: number;
  currency: string;
  provider: string;
  checkoutUrl?: string;
  clientSecret?: string;
}

export interface PaymentVerificationResultDto {
  success: boolean;
  subscriptionId?: string;
  entitlement?: EntitlementDto;
  error?: string;
}
