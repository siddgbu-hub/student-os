import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAuthProvider } from '../context/AdminAuthContext.js';
import { StudentsPage } from './StudentsPage.js';
import { UserDetailDrawer } from '../components/UserDetailDrawer.js';
import type { AdminUserSummaryDto, AdminUserDetailDto } from '@student-os/shared';

const mockStudents: AdminUserSummaryDto[] = [
  {
    accountId: 'acc-1',
    email: 'rahul.sharma@example.com',
    fullName: 'Rahul Sharma',
    accountStatus: 'active',
    currentPlanId: 'monthly',
    entitlementStatus: 'active',
    isPaid: true,
    expiresAt: '2026-09-15T00:00:00.000Z',
    daysRemaining: 31,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-08-14T10:00:00.000Z',
    deviceCount: 2,
  },
  {
    accountId: 'acc-2',
    email: 'priya.patel@example.com',
    fullName: 'Priya Patel',
    accountStatus: 'active',
    currentPlanId: 'free_trial',
    entitlementStatus: 'active',
    isPaid: false,
    expiresAt: '2026-08-20T00:00:00.000Z',
    daysRemaining: 5,
    createdAt: '2026-08-01T00:00:00.000Z',
    lastLoginAt: '2026-08-15T08:00:00.000Z',
    deviceCount: 1,
  },
  {
    accountId: 'acc-3',
    email: 'amit.verma@example.com',
    fullName: 'Amit Verma',
    accountStatus: 'active',
    currentPlanId: 'monthly',
    entitlementStatus: 'expired',
    isPaid: true,
    expiresAt: '2026-07-01T00:00:00.000Z',
    daysRemaining: 0,
    createdAt: '2025-12-01T00:00:00.000Z',
    lastLoginAt: '2026-07-01T12:00:00.000Z',
    deviceCount: 0,
  },
];

const mockUserDetail: AdminUserDetailDto = {
  account: {
    accountId: 'acc-1',
    email: 'rahul.sharma@example.com',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-08-14T10:00:00.000Z',
  },
  profile: {
    fullName: 'Rahul Sharma',
    avatarUrl: null,
    institutionName: 'IIT Delhi',
    course: 'B.Tech',
    classYear: '3rd Year',
    stream: 'CSE',
    examinationType: 'GATE',
  },
  entitlement: {
    entitlementId: 'ent-1',
    accountId: 'acc-1',
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
      subscriptionId: 'sub-1',
      accountId: 'acc-1',
      planId: 'monthly',
      status: 'active',
      source: 'manual',
      grantedBy: 'owner-uuid-1',
      startDate: '2026-08-15T00:00:00.000Z',
      expiryDate: '2026-09-15T00:00:00.000Z',
      cancelledAt: null,
      paymentReference: 'UPI-REF-998877',
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    },
  ],
  payments: [
    {
      paymentId: 'pmt-1',
      accountId: 'acc-1',
      subscriptionId: 'sub-1',
      amountPaise: 29900,
      currency: 'INR',
      paymentMethod: 'upi',
      transactionReference: 'UPI-REF-998877',
      status: 'captured',
      source: 'manual_admin',
      recordedBy: 'owner-uuid-1',
      notes: 'Paid via Google Pay UPI',
      receiptUrl: null,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    },
  ],
  devices: [
    {
      deviceId: 'dev-1',
      deviceModel: 'Pixel 8',
      osVersion: 'Android 14',
      platform: 'android',
      isActive: true,
      registeredAt: '2026-01-01T00:00:00.000Z',
      lastActiveAt: '2026-08-15T00:00:00.000Z',
      expiresAt: '2026-09-15T00:00:00.000Z',
      revokedAt: null,
    },
  ],
  auditLogs: [
    {
      id: 'log-1',
      accountId: 'acc-1',
      eventType: 'PRO_ACCESS_GRANTED',
      planId: 'monthly',
      grantedBy: 'owner-uuid-1',
      source: 'manual_admin',
      startDate: '2026-08-15T00:00:00.000Z',
      expiryDate: '2026-09-15T00:00:00.000Z',
      details: { reason: 'Offline UPI verification confirmed' },
      createdAt: '2026-08-15T00:00:00.000Z',
    },
  ],
};

function renderStudentsPage() {
  return render(
    <AdminAuthProvider initialStatus="authenticated" initialToken="test-token">
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>
    </AdminAuthProvider>
  );
}

describe('PHASE 5 — Students Module & Detail Drawer Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. loads and renders student directory table with correct data and badges', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockStudents,
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
      }),
    });

    renderStudentsPage();

    // Verify loading state first
    expect(screen.getByText('Querying student directory...')).toBeDefined();

    // Wait for table rows to render
    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
      expect(screen.getByText('rahul.sharma@example.com')).toBeDefined();
      expect(screen.getByText('Priya Patel')).toBeDefined();
      expect(screen.getByText('Amit Verma')).toBeDefined();
    });

    // Check status badges
    expect(screen.getByText('PRO')).toBeDefined();
    expect(screen.getByText('TRIAL')).toBeDefined();
    expect(screen.getByText('EXPIRED')).toBeDefined();

    // Check days remaining
    expect(screen.getByText('31 days')).toBeDefined();
    expect(screen.getByText('5 days')).toBeDefined();
  });

  it('2. renders ErrorState when API request fails and provides retry', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to connect to database.' },
      }),
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load students directory')).toBeDefined();
      expect(screen.getByText('Failed to connect to database.')).toBeDefined();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeDefined();
    });
  });

  it('3. renders EmptyState when no students match the query/filter', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      }),
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByText('No students found')).toBeDefined();
    });
  });

  it('4. search input triggers debounced backend query', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [mockStudents[0]],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderStudentsPage();

    const searchInput = screen.getByPlaceholderText('Search by name, email, or account ID...');
    fireEvent.change(searchInput, { target: { value: 'rahul' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=rahul'),
        expect.anything()
      );
    });
  });

  it('5. status filter tab switches trigger backend query with status param', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [mockStudents[0]],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderStudentsPage();

    const proTab = screen.getByRole('button', { name: 'Active Pro' });
    fireEvent.click(proTab);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pro_active'),
        expect.anything()
      );
    });
  });

  it('6. pagination controls request next page from backend', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockStudents,
        pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/i)).toBeDefined();
    });

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
    });
  });

  it('7. clicking View button opens UserDetailDrawer and fetches student details', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/admin/users/acc-1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: mockUserDetail }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockStudents,
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
        }),
      });
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
    });

    // Click View button on first row
    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButtons[0]);

    // Drawer should open and display student details
    await waitFor(() => {
      expect(screen.getByText('Current Entitlement Status')).toBeDefined();
      expect(screen.getAllByText('Monthly Pro').length).toBeGreaterThan(0);
      expect(screen.getByText('Paid Subscriber')).toBeDefined();
      expect(screen.getByText('Subscription History')).toBeDefined();
      expect(screen.getByText('Payment Ledger')).toBeDefined();
      expect(screen.getByText('Administrative Audit Log')).toBeDefined();
    });

    // Check payment formatting
    expect(screen.getByText('₹299.00')).toBeDefined();
    expect(screen.getByText(/UPI-REF-998877/i)).toBeDefined();

    // Check audit event
    expect(screen.getByText('PRO_ACCESS_GRANTED')).toBeDefined();
    expect(screen.getByText(/Offline UPI verification confirmed/i)).toBeDefined();

    // Check Phase 6 action buttons exist
    expect(screen.getByText('Subscription Management Actions')).toBeDefined();
    expect(screen.getByRole('button', { name: /Grant Pro/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Extend/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Change Plan/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Revoke$/i })).toBeDefined();
  });

  it('8. UserDetailDrawer closes when close button or Escape key is pressed', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockUserDetail }),
    });

    const onClose = vi.fn();
    const { rerender } = render(<UserDetailDrawer accountId="acc-1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Close drawer/i })).toBeDefined();
    });

    // Click close button
    const closeBtn = screen.getByRole('button', { name: /Close drawer/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    // If accountId is null, drawer renders nothing
    rerender(<UserDetailDrawer accountId={null} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('9. renders Devices column header and device count for each student', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockStudents,
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
      }),
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
    });

    // Check Devices table header
    expect(screen.getByText('Devices')).toBeDefined();
    // Device counts rendered
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('10. UserDetailDrawer renders Devices section with device metadata', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          ...mockUserDetail,
          devices: [
            {
              deviceId: 'android-pixel8-xyz',
              deviceModel: 'Pixel 8',
              osVersion: 'Android 14',
              platform: 'android',
              isActive: true,
              registeredAt: '2026-01-01T00:00:00.000Z',
              lastActiveAt: '2026-08-15T00:00:00.000Z',
              sessionExpiresAt: '2026-09-15T00:00:00.000Z',
              sessionRevokedAt: null,
            },
            {
              deviceId: 'web-chrome-desktop',
              deviceModel: 'Web Browser',
              osVersion: 'Chrome 126',
              platform: 'web',
              isActive: true,
              registeredAt: '2026-08-10T00:00:00.000Z',
              lastActiveAt: '2026-08-15T06:00:00.000Z',
              sessionExpiresAt: null,
              sessionRevokedAt: null,
            },
          ],
        },
      }),
    });

    render(<UserDetailDrawer accountId="acc-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Devices')).toBeDefined();
      expect(screen.getByText('Pixel 8')).toBeDefined();
      expect(screen.getByText('Web Browser')).toBeDefined();
      expect(screen.getByText(/android-pixel8-xyz/i)).toBeDefined();
      expect(screen.getByText(/web-chrome-desktop/i)).toBeDefined();
    });
  });
});
