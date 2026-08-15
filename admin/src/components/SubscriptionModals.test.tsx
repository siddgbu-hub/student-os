import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GrantSubscriptionModal } from './GrantSubscriptionModal.js';
import { ExtendSubscriptionModal } from './ExtendSubscriptionModal.js';
import { ChangePlanModal } from './ChangePlanModal.js';
import { RevokeSubscriptionModal } from './RevokeSubscriptionModal.js';
import { UserDetailDrawer } from './UserDetailDrawer.js';
import type { AdminUserDetailDto } from '@student-os/shared';

const mockDetail: AdminUserDetailDto = {
  account: {
    accountId: 'student-acc-123',
    email: 'student@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-08-15T00:00:00.000Z',
  },
  profile: {
    fullName: 'Aarav Patel',
    avatarUrl: null,
    institutionName: 'IIT Bombay',
    course: 'B.Tech',
    classYear: '4th Year',
    stream: 'EE',
    examinationType: 'GATE',
  },
  entitlement: {
    entitlementId: 'ent-123',
    accountId: 'student-acc-123',
    currentPlanId: 'monthly',
    planName: 'Monthly Pro',
    status: 'active',
    isPaid: true,
    features: ['dashboard', 'goals', 'revision'],
    expiresAt: '2026-09-15T00:00:00.000Z',
    lastVerifiedAt: '2026-08-15T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
  },
  subscriptions: [
    {
      subscriptionId: 'sub-123',
      accountId: 'student-acc-123',
      planId: 'monthly',
      status: 'active',
      source: 'manual',
      grantedBy: 'admin-owner-uuid',
      startDate: '2026-08-15T00:00:00.000Z',
      expiryDate: '2026-09-15T00:00:00.000Z',
      cancelledAt: null,
      paymentReference: null,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    },
  ],
  payments: [],
  devices: [],
  auditLogs: [],
};

describe('PHASE 6 — Subscription Mutation Modals & Workflows Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------
  // 1. GRANT PRO MODAL
  // ----------------------------------------------------
  describe('GrantSubscriptionModal', () => {
    it('1. renders modal fields, handles plan switching, validates duration/reason, and submits payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'active' } }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <GrantSubscriptionModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentStatus="trial"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Grant Pro Access')).toBeDefined();
      expect(screen.getByText('Aarav Patel')).toBeDefined();

      // Switch plan to Yearly Pro -> duration changes to 365
      const yearlyBtn = screen.getByRole('button', { name: /Yearly Pro/i });
      fireEvent.click(yearlyBtn);
      const durationInput = screen.getByLabelText(/Duration \(Days\)/i) as HTMLInputElement;
      expect(durationInput.value).toBe('365');

      // Attempt submit with short reason (< 3 chars)
      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'ab' } });
      const submitBtn = screen.getByRole('button', { name: /Confirm & Grant Pro/i });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Reason is required and must be at least 3 characters/i)).toBeDefined();

      // Enter invalid duration
      fireEvent.change(durationInput, { target: { value: '0' } });
      fireEvent.change(reasonInput, { target: { value: 'Valid reason' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Duration must be a positive integer/i)).toBeDefined();

      // Fix duration and submit
      fireEvent.change(durationInput, { target: { value: '365' } });
      fireEvent.change(reasonInput, { target: { value: 'Annual offline fee payment verified' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/admin/subscriptions/grant'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              accountId: 'student-acc-123',
              planId: 'yearly',
              durationDays: 365,
              reason: 'Annual offline fee payment verified',
            }),
          })
        );
        expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('Yearly'));
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('2. handles 403 Forbidden error safely', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient privileges' },
        }),
      });

      render(
        <GrantSubscriptionModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentStatus="trial"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Granting test access' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm & Grant Pro/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('You do not have permission to grant subscriptions.')).toBeDefined();
      });
    });

    it('3. closes modal on Escape key press', () => {
      const onClose = vi.fn();
      render(
        <GrantSubscriptionModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentStatus="trial"
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------
  // 2. EXTEND SUBSCRIPTION MODAL
  // ----------------------------------------------------
  describe('ExtendSubscriptionModal', () => {
    it('4. renders expiry preview, preset chips, validates reason, and submits extend request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'active' } }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ExtendSubscriptionModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentPlanName="Monthly Pro"
          currentExpiresAt="2026-09-15T00:00:00.000Z"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Extend Pro Subscription')).toBeDefined();
      expect(screen.getByText('15 Sept 2026')).toBeDefined();

      // Click +90d preset
      const preset90d = screen.getByRole('button', { name: '+90d' });
      fireEvent.click(preset90d);
      const durationInput = screen.getByLabelText(/Extension Days/i) as HTMLInputElement;
      expect(durationInput.value).toBe('90');

      // Enter reason and submit
      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Goodwill extension granted by Owner' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm & Extend Expiry/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/admin/subscriptions/extend'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              accountId: 'student-acc-123',
              durationDays: 90,
              reason: 'Goodwill extension granted by Owner',
            }),
          })
        );
        expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('90 days'));
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('5. handles 409 Conflict error safely', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: { code: 'CONFLICT', message: 'Concurrent modification' },
        }),
      });

      render(
        <ExtendSubscriptionModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentPlanName="Monthly Pro"
          currentExpiresAt="2026-09-15T00:00:00.000Z"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Test extension' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm & Extend Expiry/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Another subscription operation modified this account/i)).toBeDefined();
      });
    });
  });

  // ----------------------------------------------------
  // 3. CHANGE PLAN MODAL
  // ----------------------------------------------------
  describe('ChangePlanModal', () => {
    it('6. disables current plan, validates new plan selection and reason, and submits plan switch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'active' } }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ChangePlanModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentPlanId="monthly"
          currentPlanName="Monthly Pro"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Change Subscription Plan')).toBeDefined();
      expect(screen.getByText('Immediate Plan Transition')).toBeDefined();

      // Monthly Pro is current plan -> disabled
      const monthlyBtn = screen.getByRole('button', { name: /Monthly Pro/i });
      expect(monthlyBtn.hasAttribute('disabled')).toBe(true);

      // Enter reason and submit
      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Upgraded to annual plan offline' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm Plan Switch/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/admin/subscriptions/change-plan'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              accountId: 'student-acc-123',
              newPlanId: 'yearly',
              reason: 'Upgraded to annual plan offline',
            }),
          })
        );
        expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('Yearly Pro'));
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('7. handles 404 Not Found error safely', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Target plan not found' },
        }),
      });

      render(
        <ChangePlanModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentPlanId="monthly"
          currentPlanName="Monthly Pro"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Upgrading plan' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm Plan Switch/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/The student account or target plan could not be found/i)).toBeDefined();
      });
    });
  });

  // ----------------------------------------------------
  // 4. REVOKE SUBSCRIPTION MODAL
  // ----------------------------------------------------
  describe('RevokeSubscriptionModal', () => {
    it('8. requires typing exact word REVOKE to enable button and submits revocation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'revoked' } }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <RevokeSubscriptionModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentPlanName="Monthly Pro"
          currentStatus="active"
          currentExpiresAt="2026-09-15T00:00:00.000Z"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Revoke Pro Access')).toBeDefined();
      expect(screen.getByText('Destructive Operation')).toBeDefined();

      const submitBtn = screen.getByRole('button', { name: /Revoke Pro Entitlement/i });
      // Button disabled initially
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Enter reason
      const reasonInput = screen.getByLabelText(/Reason for Revocation/i);
      fireEvent.change(reasonInput, { target: { value: 'Payment refunded per customer request' } });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Type wrong word -> button still disabled
      const confirmInput = screen.getByPlaceholderText('Type REVOKE');
      fireEvent.change(confirmInput, { target: { value: 'revoke' } }); // lowercase
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Type exact uppercase REVOKE -> button enabled
      fireEvent.change(confirmInput, { target: { value: 'REVOKE' } });
      expect(submitBtn.hasAttribute('disabled')).toBe(false);

      // Submit
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/admin/subscriptions/revoke'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              accountId: 'student-acc-123',
              reason: 'Payment refunded per customer request',
            }),
          })
        );
        expect(onSuccess).toHaveBeenCalledWith('Pro access revoked successfully.');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('9. handles network failure error safely', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out.'));

      render(
        <RevokeSubscriptionModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          currentPlanName="Monthly Pro"
          currentStatus="active"
          currentExpiresAt="2026-09-15T00:00:00.000Z"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const reasonInput = screen.getByLabelText(/Reason for Revocation/i);
      fireEvent.change(reasonInput, { target: { value: 'Chargeback dispute' } });

      const confirmInput = screen.getByPlaceholderText('Type REVOKE');
      fireEvent.change(confirmInput, { target: { value: 'REVOKE' } });

      const submitBtn = screen.getByRole('button', { name: /Revoke Pro Entitlement/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Connection timed out/i)).toBeDefined();
      });
    });
  });

  // ----------------------------------------------------
  // 5. USER DETAIL DRAWER MUTATION INTEGRATION & REFETCH
  // ----------------------------------------------------
  describe('UserDetailDrawer Mutation Integration', () => {
    it('10. triggers mutation modal from drawer button, refetches state upon success, and displays success banner', async () => {
      let isMutated = false;
      globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
        if (opts?.method === 'POST' && url.includes('/api/v1/admin/subscriptions/extend')) {
          isMutated = true;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: {} }),
          });
        }
        // GET detail response
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: isMutated
              ? {
                  ...mockDetail,
                  entitlement: {
                    ...mockDetail.entitlement,
                    expiresAt: '2026-10-15T00:00:00.000Z',
                  },
                }
              : mockDetail,
          }),
        });
      });

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Aarav Patel')).toBeDefined();
        expect(screen.getAllByText(/15 Sept 2026/i).length).toBeGreaterThan(0);
      });

      // Click Extend action button in drawer
      const extendBtn = screen.getByRole('button', { name: /Extend/i });
      fireEvent.click(extendBtn);

      // Modal opens
      expect(screen.getByText('Extend Pro Subscription')).toBeDefined();

      // Submit extension
      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Extended by 30 days' } });
      const confirmBtn = screen.getByRole('button', { name: /Confirm & Extend Expiry/i });
      fireEvent.click(confirmBtn);

      // Success feedback appears in drawer and updated expiry is rendered
      await waitFor(() => {
        expect(screen.getByText(/Subscription extended by 30 days successfully\./i)).toBeDefined();
        expect(screen.getAllByText(/15 Oct 2026/i).length).toBeGreaterThan(0);
      });
    });

    it('11. displays retry banner when post-mutation refetch fails', async () => {
      let isFirstGet = true;
      globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
        if (opts?.method === 'POST' && url.includes('/api/v1/admin/subscriptions/grant')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: {} }),
          });
        }
        if (isFirstGet) {
          isFirstGet = false;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: mockDetail }),
          });
        }
        // Second GET (post-mutation refetch) fails
        return Promise.reject(new Error('Network error on refetch'));
      });

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Aarav Patel')).toBeDefined();
      });

      // Open Grant modal and submit
      const grantBtn = screen.getByRole('button', { name: /Grant Pro/i });
      fireEvent.click(grantBtn);

      const reasonInput = screen.getByLabelText(/Administrative Reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Granting scholarship access' } });

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Grant Pro/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Subscription updated, but the latest student details could not be refreshed\. Please retry\./i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Retry/i })).toBeDefined();
      });
    });
  });
});
