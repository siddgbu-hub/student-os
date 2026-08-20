import type { EntitlementAuditLogDto, PaginationMeta } from '@student-os/shared';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export class AdminApiClient {
  private baseUrl: string;
  private tokenGetter: () => string | null;
  private onUnauthorized?: () => void;

  constructor(options?: {
    baseUrl?: string;
    tokenGetter?: () => string | null;
    onUnauthorized?: () => void;
  }) {
    this.baseUrl =
      options?.baseUrl ||
      import.meta.env.VITE_API_BASE_URL ||
      'https://student-os-backend-production.sidd-gbu.workers.dev';
    this.tokenGetter = options?.tokenGetter || (() => localStorage.getItem('student_os_admin_token'));
    this.onUnauthorized = options?.onUnauthorized;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-id': 'admin-web-console',
    };

    const token = this.tokenGetter();
    if (token) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      ...this.getHeaders(),
      ...(options.headers as Record<string, string>),
    };

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err: unknown) {
      throw new AdminApiError(
        'NETWORK_ERROR',
        err instanceof Error ? err.message : 'Failed to connect to Student OS API.',
        0
      );
    }

    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new AdminApiError(
        'INVALID_RESPONSE',
        `Server returned non-JSON response (HTTP ${res.status}).`,
        res.status
      );
    }

    if (!res.ok || !json.success) {
      const code = json.error?.code || `HTTP_${res.status}`;
      const message = json.error?.message || `Request failed with status ${res.status}`;

      if (res.status === 401 && this.onUnauthorized) {
        this.onUnauthorized();
      }

      throw new AdminApiError(code, message, res.status);
    }

    return json;
  }

  async get<T>(endpoint: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let fullEndpoint = endpoint;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(query)) {
        if (val !== undefined && val !== null && val !== '') {
          params.append(key, String(val));
        }
      }
      const qs = params.toString();
      if (qs) {
        fullEndpoint += (fullEndpoint.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(fullEndpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  // Auth OTP Endpoints
  async sendEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
    return this.post('/api/v1/auth/email/send-otp', { email });
  }

  async verifyEmailOtp(
    email: string,
    otp: string
  ): Promise<{
    success: boolean;
    token: string;
    sessionId: string;
    account: { accountId: string; email: string };
  }> {
    return this.post('/api/v1/auth/email/verify-otp', {
      email,
      otp,
      deviceId: 'admin-web-console',
      deviceModel: 'SOCC Web Console',
      osVersion: 'Web',
    });
  }

  // Phase 6 Subscription Mutation Endpoints
  async grantSubscription(payload: {
    accountId: string;
    planId: 'monthly' | 'yearly';
    durationDays?: number;
    reason: string;
    paymentId?: string;
  }): Promise<{ success: boolean; data: unknown }> {
    return this.post('/api/v1/admin/subscriptions/grant', payload);
  }

  async extendSubscription(payload: {
    accountId: string;
    durationDays: number;
    reason: string;
  }): Promise<{ success: boolean; data: unknown }> {
    return this.post('/api/v1/admin/subscriptions/extend', payload);
  }

  async changePlan(payload: {
    accountId: string;
    newPlanId: 'monthly' | 'yearly';
    reason: string;
  }): Promise<{ success: boolean; data: unknown }> {
    return this.post('/api/v1/admin/subscriptions/change-plan', payload);
  }

  async revokeSubscription(payload: {
    accountId: string;
    reason: string;
  }): Promise<{ success: boolean; data: unknown }> {
    return this.post('/api/v1/admin/subscriptions/revoke', payload);
  }

  async cancelRevokeSubscription(payload: {
    accountId: string;
    reason: string;
  }): Promise<{ success: boolean; data: { entitlement: any; outcome: 'active' | 'expired'; auditLogId: string } }> {
    return this.post('/api/v1/admin/subscriptions/cancel-revoke', payload);
  }

  // Phase 7 Payment Endpoints
  async getPayments(query?: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    accountId?: string;
  }): Promise<{ success: boolean; data: any[]; pagination: any }> {
    return this.get('/api/v1/admin/payments', query);
  }

  async recordPayment(payload: {
    accountId: string;
    planId: 'monthly' | 'yearly';
    discountPercent?: number;
    amountPaise?: number;
    currency?: string;
    paymentMethod: 'upi' | 'bank_transfer' | 'cash' | 'razorpay' | 'complimentary' | string;
    transactionReference?: string | null;
    durationDays?: number;
    notes?: string;
    activatePro?: boolean;
  }): Promise<{ success: boolean; data: unknown }> {
    return this.post('/api/v1/admin/payments/record', payload);
  }

  // Phase 8 Overview Endpoint
  async getOverview(): Promise<{ success: boolean; data: any }> {
    return this.get('/api/v1/admin/overview');
  }

  // Phase 9 Audit Log Endpoints
  async getAuditLogs(query?: {
    page?: number;
    limit?: number;
    eventType?: string;
    accountId?: string;
  }): Promise<{ success: boolean; data: EntitlementAuditLogDto[]; pagination: PaginationMeta }> {
    return this.get('/api/v1/admin/audit-logs', query);
  }

  // Account Lifecycle Management Endpoints
  async deactivateAccount(
    accountId: string,
    reason?: string
  ): Promise<{ success: boolean; data: { message: string; accountId: string; revokedSessionsCount?: number } }> {
    return this.post(`/api/v1/admin/accounts/${accountId}/deactivate`, { reason });
  }

  async reactivateAccount(
    accountId: string,
    reason?: string
  ): Promise<{ success: boolean; data: { message: string; accountId: string } }> {
    return this.post(`/api/v1/admin/accounts/${accountId}/reactivate`, { reason });
  }

  async revokeAllSessions(
    accountId: string,
    reason?: string
  ): Promise<{ success: boolean; data: { message: string; accountId: string; revokedSessionsCount?: number } }> {
    return this.post(`/api/v1/admin/accounts/${accountId}/revoke-sessions`, { reason });
  }

  async deleteAccount(
    accountId: string,
    reason?: string
  ): Promise<{ success: boolean; data: { message: string; accountId: string } }> {
    return this.delete(`/api/v1/admin/accounts/${accountId}`, { reason });
  }
}

export const adminApiClient = new AdminApiClient();


