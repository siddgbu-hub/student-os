import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAuthProvider } from '../context/AdminAuthContext.js';
import { PaymentsPage } from './PaymentsPage.js';
import type { PaymentDto, AdminUserSummaryDto } from '@student-os/shared';

const mockPayments: PaymentDto[] = [
  {
    paymentId: 'pmt-1',
    accountId: 'acc-1',
    subscriptionId: 'sub-1',
    amountPaise: 29900,
    currency: 'INR',
    paymentMethod: 'upi',
    transactionReference: 'UPI-REF-112233',
    status: 'captured',
    source: 'manual_admin',
    recordedBy: 'owner-uuid-1',
    notes: 'Paid via Google Pay UPI',
    receiptUrl: null,
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-08-15T10:00:00.000Z',
    studentEmail: 'rahul.sharma@example.com',
    studentName: 'Rahul Sharma',
  },
  {
    paymentId: 'pmt-2',
    accountId: 'acc-2',
    subscriptionId: 'sub-2',
    amountPaise: 249900,
    currency: 'INR',
    paymentMethod: 'bank_transfer',
    transactionReference: 'NEFT-AXIS-998877',
    status: 'captured',
    source: 'manual_admin',
    recordedBy: 'owner-uuid-1',
    notes: 'Axis Bank IMPS transfer',
    receiptUrl: null,
    createdAt: '2026-08-14T12:00:00.000Z',
    updatedAt: '2026-08-14T12:00:00.000Z',
    studentEmail: 'priya.patel@example.com',
    studentName: 'Priya Patel',
  },
  {
    paymentId: 'pmt-3',
    accountId: 'acc-3',
    subscriptionId: 'sub-3',
    amountPaise: 0,
    currency: 'INR',
    paymentMethod: 'complimentary',
    transactionReference: null,
    status: 'captured',
    source: 'manual_admin',
    recordedBy: 'owner-uuid-1',
    notes: 'Scholarship grant for top performer',
    receiptUrl: null,
    createdAt: '2026-08-13T09:00:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
    studentEmail: 'amit.verma@example.com',
    studentName: 'Amit Verma',
  },
  {
    paymentId: 'pmt-4',
    accountId: 'acc-4',
    subscriptionId: null,
    amountPaise: 29900,
    currency: 'INR',
    paymentMethod: 'cash',
    transactionReference: 'CASH-REC-004',
    status: 'pending',
    source: 'manual_admin',
    recordedBy: 'owner-uuid-1',
    notes: 'Cash received at front desk',
    receiptUrl: null,
    createdAt: '2026-08-12T14:00:00.000Z',
    updatedAt: '2026-08-12T14:00:00.000Z',
    studentEmail: 'neha.singh@example.com',
    studentName: 'Neha Singh',
  },
  {
    paymentId: 'pmt-5',
    accountId: 'acc-5',
    subscriptionId: null,
    amountPaise: 29900,
    currency: 'INR',
    paymentMethod: 'razorpay',
    transactionReference: 'pay_ABC123XYZ',
    status: 'failed',
    source: 'gateway',
    recordedBy: 'system',
    notes: 'Bank declined transaction',
    receiptUrl: null,
    createdAt: '2026-08-11T16:00:00.000Z',
    updatedAt: '2026-08-11T16:00:00.000Z',
    studentEmail: 'vikram.das@example.com',
    studentName: 'Vikram Das',
  },
];

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
    deviceCount: 1,
  },
];

function renderPaymentsPage() {
  return render(
    <AdminAuthProvider initialStatus="authenticated" initialToken="test-token">
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>
    </AdminAuthProvider>
  );
}

describe('PHASE 7 — Payments Ledger & Manual Payment Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. loads and displays payments ledger with INR formatted amounts, methods, statuses, and student info', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockPayments,
        pagination: { page: 1, limit: 20, total: 5, totalPages: 1 },
      }),
    });

    renderPaymentsPage();

    // Verify loading state
    expect(screen.getByText('Fetching payments ledger...')).toBeDefined();

    // Wait for table to render
    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
      expect(screen.getByText('rahul.sharma@example.com')).toBeDefined();
      expect(screen.getByText('Priya Patel')).toBeDefined();
      expect(screen.getByText('Amit Verma')).toBeDefined();
    });

    // Check INR formatted amounts
    expect(screen.getAllByText('₹299.00').length).toBeGreaterThan(0);
    expect(screen.getByText('₹2499.00')).toBeDefined();
    expect(screen.getByText('₹0.00')).toBeDefined();

    // Check payment method badges (options + table badges)
    expect(screen.getAllByText('UPI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bank Transfer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cash').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Complimentary').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Razorpay').length).toBeGreaterThanOrEqual(1);

    // Check status badges (tab button + rows)
    expect(screen.getAllByText(/CAPTURED/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('PENDING')).toBeDefined();
    expect(screen.getByText('FAILED')).toBeDefined();

    // Check transaction references
    expect(screen.getByText('UPI-REF-112233')).toBeDefined();
    expect(screen.getByText('NEFT-AXIS-998877')).toBeDefined();
  });

  it('2. handles error state on API failure and provides retry', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payments database.' },
      }),
    });

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load payments ledger')).toBeDefined();
      expect(screen.getByText('Failed to fetch payments database.')).toBeDefined();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeDefined();
    });
  });

  it('3. handles empty state when no payments are recorded', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      }),
    });

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText('No payment records found')).toBeDefined();
      expect(screen.getByRole('button', { name: /Record First Payment/i })).toBeDefined();
    });
  });

  it('4. status tab filter triggers backend query with status parameter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [mockPayments[0]],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderPaymentsPage();

    const capturedTab = screen.getByRole('button', { name: 'Captured' });
    fireEvent.click(capturedTab);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=captured'),
        expect.anything()
      );
    });
  });

  it('5. method dropdown filter triggers backend query with method parameter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [mockPayments[0]],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderPaymentsPage();

    const methodSelect = screen.getByLabelText(/Method:/i);
    fireEvent.change(methodSelect, { target: { value: 'upi' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('method=upi'),
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
        data: mockPayments,
        pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderPaymentsPage();

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

  it('7. opens RecordPaymentModal, records manual UPI payment, and refetches payment ledger', async () => {
    let hasRecorded = false;
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (opts?.method === 'POST' && url.includes('/api/v1/admin/payments/record')) {
        hasRecorded = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { paymentId: 'new-pmt-1', status: 'captured' },
          }),
        });
      }
      if (url.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: [
              {
                accountId: 'acc-new-99',
                email: 'deepak.kumar@example.com',
                fullName: 'Deepak Kumar',
                currentPlanId: 'monthly',
                entitlementStatus: 'active',
                isPaid: true,
                expiresAt: '2026-09-15T00:00:00.000Z',
                daysRemaining: 31,
                createdAt: '2026-01-01T00:00:00.000Z',
                lastLoginAt: '2026-08-14T10:00:00.000Z',
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: hasRecorded
            ? [
                {
                  paymentId: 'new-pmt-1',
                  accountId: 'acc-new-99',
                  amountPaise: 3000,
                  currency: 'INR',
                  paymentMethod: 'upi',
                  transactionReference: 'UPI-NEW-778899',
                  status: 'captured',
                  source: 'manual_admin',
                  recordedBy: 'owner-uuid-1',
                  notes: 'Recorded test payment',
                  receiptUrl: null,
                  createdAt: '2026-08-15T11:00:00.000Z',
                  updatedAt: '2026-08-15T11:00:00.000Z',
                  studentEmail: 'deepak.kumar@example.com',
                  studentName: 'Deepak Kumar',
                },
                ...mockPayments,
              ]
            : mockPayments,
          pagination: { page: 1, limit: 20, total: hasRecorded ? 6 : 5, totalPages: 1 },
        }),
      });
    });

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
    });

    // Click Record Payment button
    const recordBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(recordBtn);

    // Modal should be open
    expect(screen.getByText('Record Manual Payment')).toBeDefined();

    // Search and select student
    const studentSearchInput = screen.getByPlaceholderText('Search by student name or email...');
    fireEvent.change(studentSearchInput, { target: { value: 'deepak' } });

    await waitFor(() => {
      const selectStudentBtn = screen.getByText('deepak.kumar@example.com');
      fireEvent.click(selectStudentBtn);
    });

    // Enter transaction reference
    const refInput = screen.getByLabelText(/Transaction Reference/i);
    fireEvent.change(refInput, { target: { value: 'UPI-NEW-778899' } });

    // Submit payment
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(confirmBtn);

    // Verify success banner appears and ledger refetches with new item
    await waitFor(() => {
      expect(screen.getByText(/Payment of ₹30\.00 \(UPI\) recorded successfully/i)).toBeDefined();
      expect(screen.getByText('UPI-NEW-778899')).toBeDefined();
    });
  });
});
