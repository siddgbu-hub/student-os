import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DeactivateAccountModal } from './DeactivateAccountModal.js';
import { ReactivateAccountModal } from './ReactivateAccountModal.js';
import { RevokeAllSessionsModal } from './RevokeAllSessionsModal.js';
import { DeleteAccountModal } from './DeleteAccountModal.js';
import { UserDetailDrawer } from './UserDetailDrawer.js';
import type { AdminUserDetailDto } from '@student-os/shared';

const mockActiveDetail: AdminUserDetailDto = {
  account: {
    accountId: 'student-acc-123',
    email: 'student@example.com',
    status: 'active',
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
  subscriptions: [],
  payments: [],
  devices: [],
  auditLogs: [],
};

const mockSuspendedDetail: AdminUserDetailDto = {
  ...mockActiveDetail,
  account: {
    ...mockActiveDetail.account,
    status: 'suspended',
  },
};

describe('Student Account Lifecycle Modals & Danger Zone Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('1. DeactivateAccountModal', () => {
    it('renders target student info and requires typing DEACTIVATE to submit', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { message: 'Account deactivated successfully.' },
        }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <DeactivateAccountModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Deactivate Account?')).toBeDefined();
      expect(screen.getByText('Aarav Patel')).toBeDefined();
      expect(screen.getByText('student@example.com')).toBeDefined();

      // Submit button is disabled before entering DEACTIVATE
      const submitBtn = screen.getByRole('button', { name: /deactivate account/i }) as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      // Type confirmation
      const confirmInput = screen.getByPlaceholderText('DEACTIVATE');
      fireEvent.change(confirmInput, { target: { value: 'DEACTIVATE' } });
      expect(submitBtn.disabled).toBe(false);

      // Enter optional reason
      const reasonInput = screen.getByPlaceholderText(/e\.g\., Student request/i);
      fireEvent.change(reasonInput, { target: { value: 'Suspended for policy violation' } });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/admin/accounts/student-acc-123/deactivate');
        expect(onSuccess).toHaveBeenCalledWith('Account deactivated successfully.');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('dismisses modal on Escape key', () => {
      const onClose = vi.fn();
      render(
        <DeactivateAccountModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('2. ReactivateAccountModal', () => {
    it('renders reactivation details and submits reactivation payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { message: 'Account reactivated successfully.' },
        }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ReactivateAccountModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Reactivate Account?')).toBeDefined();
      expect(screen.getByText('Aarav Patel')).toBeDefined();

      const submitBtn = screen.getByRole('button', { name: /reactivate account/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/admin/accounts/student-acc-123/reactivate');
        expect(onSuccess).toHaveBeenCalledWith('Account reactivated successfully.');
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('3. RevokeAllSessionsModal', () => {
    it('renders session invalidation notice and submits request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { message: 'All active sessions revoked.', revokedSessionsCount: 2 },
        }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <RevokeAllSessionsModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Revoke All Sessions?')).toBeDefined();

      const submitBtn = screen.getByRole('button', { name: /revoke all sessions/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/admin/accounts/student-acc-123/revoke-sessions');
        expect(onSuccess).toHaveBeenCalledWith('All active sessions revoked.');
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('4. DeleteAccountModal', () => {
    it('renders irreversible warning, target student info, and requires typing DELETE to submit', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { message: 'Account permanently deleted.' },
        }),
      });
      globalThis.fetch = mockFetch as any;

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <DeleteAccountModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('DELETE ACCOUNT PERMANENTLY?')).toBeDefined();
      expect(screen.getByText('Aarav Patel')).toBeDefined();
      expect(screen.getByText('student@example.com')).toBeDefined();
      expect(screen.getByText(/Irreversible destructive operation/i)).toBeDefined();

      // Submit button is disabled before typing DELETE
      const submitBtn = screen.getByRole('button', { name: /delete account permanently/i }) as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      // Typing wrong text keeps submit button disabled
      const confirmInput = screen.getByPlaceholderText('DELETE');
      fireEvent.change(confirmInput, { target: { value: 'del' } });
      expect(submitBtn.disabled).toBe(true);

      // Typing exact word DELETE enables submit button
      fireEvent.change(confirmInput, { target: { value: 'DELETE' } });
      expect(submitBtn.disabled).toBe(false);

      // Add reason
      const reasonInput = screen.getByPlaceholderText(/GDPR Right-to-be-forgotten request/i);
      fireEvent.change(reasonInput, { target: { value: 'Student requested account purge' } });

      // Click submit
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/admin/accounts/student-acc-123');
        expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
        const reqBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(reqBody.reason).toBe('Student requested account purge');
        expect(onSuccess).toHaveBeenCalledWith('student-acc-123', 'Account permanently deleted.');
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('5. UserDetailDrawer Danger Zone & Badges', () => {
    it('renders Danger Zone with Revoke Sessions, Deactivate Account, and Delete Account Permanently for active user', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockActiveDetail }),
      });
      globalThis.fetch = mockFetch as any;

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeDefined();
        expect(screen.getByRole('button', { name: /revoke all sessions/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /deactivate account/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /delete account permanently/i })).toBeDefined();
      });
    });

    it('renders Reactivate Account, Delete Account Permanently, and SUSPENDED badge when account is suspended', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockSuspendedDetail }),
      });
      globalThis.fetch = mockFetch as any;

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('SUSPENDED')).toBeDefined();
        expect(screen.getByRole('button', { name: /reactivate account/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /delete account permanently/i })).toBeDefined();
        // Deactivate account button should not be rendered when already suspended
        expect(screen.queryByRole('button', { name: /deactivate account/i })).toBeNull();
      });
    });

    it('renders privileged account banner and NEVER renders Delete button for admin/owner accounts', async () => {
      const mockAdminDetail: AdminUserDetailDto = {
        ...mockActiveDetail,
        adminRole: {
          accountId: 'admin-acc-999',
          role: 'owner',
          permissions: ['*'],
          grantedBy: 'system',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockAdminDetail }),
      });
      globalThis.fetch = mockFetch as any;

      render(<UserDetailDrawer accountId="admin-acc-999" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Privileged OWNER account — permanent deletion is disabled/i)).toBeDefined();
        expect(screen.queryByRole('button', { name: /delete account permanently/i })).toBeNull();
      });
    });
  });

  describe('6. Lifecycle Modal Portal Layering', () => {
    it('DeleteAccountModal renders into document.body via portal with z-60 class', () => {
      render(
        <DeleteAccountModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      // Portal renders into document.body
      expect(dialog.parentElement).toBe(document.body);
      // Has z-60 class for layering above the z-50 drawer
      expect(dialog.className).toContain('z-60');
    });

    it('DeactivateAccountModal renders into document.body via portal with z-60 class', () => {
      render(
        <DeactivateAccountModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.parentElement).toBe(document.body);
      expect(dialog.className).toContain('z-60');
    });

    it('ReactivateAccountModal renders into document.body via portal with z-60 class', () => {
      render(
        <ReactivateAccountModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.parentElement).toBe(document.body);
      expect(dialog.className).toContain('z-60');
    });

    it('RevokeAllSessionsModal renders into document.body via portal with z-60 class', () => {
      render(
        <RevokeAllSessionsModal
          isOpen={true}
          accountId="student-acc-123"
          studentName="Aarav Patel"
          studentEmail="student@example.com"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.parentElement).toBe(document.body);
      expect(dialog.className).toContain('z-60');
    });
  });

  describe('7. Danger Zone Button Opens Corresponding Modal', () => {
    it('clicking Delete Account Permanently opens DeleteAccountModal', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockActiveDetail }),
      });
      globalThis.fetch = mockFetch as any;

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete account permanently/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /delete account permanently/i }));

      await waitFor(() => {
        expect(screen.getByText('DELETE ACCOUNT PERMANENTLY?')).toBeDefined();
      });
    });

    it('clicking Deactivate Account opens DeactivateAccountModal', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockActiveDetail }),
      });
      globalThis.fetch = mockFetch as any;

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deactivate account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /deactivate account/i }));

      await waitFor(() => {
        expect(screen.getByText('Deactivate Account?')).toBeDefined();
      });
    });

    it('clicking Revoke All Sessions opens RevokeAllSessionsModal', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockActiveDetail }),
      });
      globalThis.fetch = mockFetch as any;

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /revoke all sessions/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /revoke all sessions/i }));

      await waitFor(() => {
        expect(screen.getByText('Revoke All Sessions?')).toBeDefined();
      });
    });

    it('clicking Reactivate Account on suspended account opens ReactivateAccountModal', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockSuspendedDetail }),
      });
      globalThis.fetch = mockFetch as any;

      render(<UserDetailDrawer accountId="student-acc-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reactivate account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /reactivate account/i }));

      await waitFor(() => {
        expect(screen.getByText('Reactivate Account?')).toBeDefined();
      });
    });
  });

  describe('8. Delete Account Modal End-to-End Trigger & Portal Verification', () => {
    it('opens DeleteAccountModal from UserDetailDrawer, renders via portal to document.body with z-60, validates DELETE challenge, and submits successfully', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, options?: { method?: string }) => {
        if (options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { message: 'Account for student@example.com permanently deleted.' },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: mockActiveDetail }),
        });
      });
      globalThis.fetch = mockFetch as any;

      const onDeleteSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <UserDetailDrawer
          accountId="student-acc-123"
          onClose={onClose}
          onDeleteSuccess={onDeleteSuccess}
        />
      );

      // 1. Verify Delete button is rendered for eligible student in Danger Zone
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete account permanently/i })).toBeDefined();
      });

      // 2. Click Delete Account Permanently
      const deleteBtn = screen.getByRole('button', { name: /delete account permanently/i });
      fireEvent.click(deleteBtn);

      // 3. Verify DeleteAccountModal mounts into document.body with z-60
      await waitFor(() => {
        expect(screen.getByText('DELETE ACCOUNT PERMANENTLY?')).toBeDefined();
      });

      const dialogs = screen.getAllByRole('dialog');
      // The DeleteAccountModal dialog is portaled to document.body and has z-60 class
      const modalDialog = dialogs.find((d) => d.getAttribute('aria-labelledby') === 'delete-account-modal-title');
      expect(modalDialog).toBeDefined();
      expect(modalDialog?.parentElement).toBe(document.body);
      expect(modalDialog?.className).toContain('z-60');

      // 4. Submit button inside the modal is initially disabled before challenge text is entered
      const modalScope = within(modalDialog!);
      const submitDeleteBtn = modalScope.getByRole('button', { name: /^Delete Account Permanently$/i });
      expect((submitDeleteBtn as HTMLButtonElement).disabled).toBe(true);

      // 5. Typing partial/incorrect text leaves submit button disabled
      const challengeInput = modalScope.getByPlaceholderText('DELETE');
      fireEvent.change(challengeInput, { target: { value: 'del' } });
      expect((submitDeleteBtn as HTMLButtonElement).disabled).toBe(true);

      // 6. Typing exact 'DELETE' enables submit button
      fireEvent.change(challengeInput, { target: { value: 'DELETE' } });
      expect((submitDeleteBtn as HTMLButtonElement).disabled).toBe(false);

      // 7. Click Confirm Delete
      fireEvent.click(submitDeleteBtn);

      // 8. Verify API called and success handler notified
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/admin/accounts/student-acc-123'),
          expect.objectContaining({ method: 'DELETE' })
        );
        expect(onDeleteSuccess).toHaveBeenCalledWith(
          'student-acc-123',
          'Account for student@example.com permanently deleted.'
        );
      });
    });
  });
});
