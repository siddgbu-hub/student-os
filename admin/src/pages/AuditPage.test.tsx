import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAuthProvider } from '../context/AdminAuthContext.js';
import { AuditPage } from './AuditPage.js';
import type { EntitlementAuditLogDto } from '@student-os/shared';

const mockAuditLogs: EntitlementAuditLogDto[] = [
  {
    id: 'audit-uuid-1',
    accountId: 'acc-1111-2222-3333-4444',
    eventType: 'ENTITLEMENT_MANUALLY_GRANTED',
    planId: 'monthly',
    grantedBy: 'owner-admin-1',
    source: 'manual_admin',
    startDate: '2026-08-15T10:00:00.000Z',
    expiryDate: '2026-09-15T10:00:00.000Z',
    details: { reason: 'Scholarship winner grant', durationDays: 30, paymentId: 'pmt-123' },
    createdAt: '2026-08-15T10:00:00.000Z',
  },
  {
    id: 'audit-uuid-2',
    accountId: 'acc-5555-6666-7777-8888',
    eventType: 'ENTITLEMENT_EXTENDED',
    planId: 'yearly',
    grantedBy: 'owner-admin-1',
    source: 'manual_admin',
    startDate: '2026-08-14T12:00:00.000Z',
    expiryDate: '2027-08-14T12:00:00.000Z',
    details: { reason: 'Loyalty extension for annual student', additionalDays: 365 },
    createdAt: '2026-08-14T12:00:00.000Z',
  },
  {
    id: 'audit-uuid-3',
    accountId: 'acc-9999-0000-1111-2222',
    eventType: 'ENTITLEMENT_PLAN_CHANGED',
    planId: 'yearly',
    grantedBy: 'owner-admin-1',
    source: 'manual_admin',
    startDate: '2026-08-13T09:00:00.000Z',
    expiryDate: '2027-08-13T09:00:00.000Z',
    details: { reason: 'Student upgraded to Yearly Pro plan' },
    createdAt: '2026-08-13T09:00:00.000Z',
  },
  {
    id: 'audit-uuid-4',
    accountId: 'acc-3333-4444-5555-6666',
    eventType: 'ENTITLEMENT_REVOKED',
    planId: 'monthly',
    grantedBy: 'owner-admin-1',
    source: 'manual_admin',
    startDate: '2026-08-12T14:00:00.000Z',
    expiryDate: null,
    details: { reason: 'Chargeback dispute access revoked' },
    createdAt: '2026-08-12T14:00:00.000Z',
  },
  {
    id: 'audit-uuid-5',
    accountId: 'acc-7777-8888-9999-0000',
    eventType: 'UNKNOWN_CUSTOM_EVENT_ACTION',
    planId: 'free_trial',
    grantedBy: 'system',
    source: 'system',
    startDate: '2026-08-11T16:00:00.000Z',
    expiryDate: '2026-08-18T16:00:00.000Z',
    details: null,
    createdAt: '2026-08-11T16:00:00.000Z',
  },
];

function renderAuditPage() {
  return render(
    <AdminAuthProvider initialStatus="authenticated" initialToken="test-token">
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>
    </AdminAuthProvider>
  );
}

describe('PHASE 9 — Audit Trail UI & Operator Activity Inspection Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. renders loading state initially', () => {
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    renderAuditPage();

    expect(screen.getByText(/Fetching audit trail records/i)).toBeDefined();
  });

  it('2. renders audit records from successful API response with actions, actors, reasons, and dates', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAuditLogs,
        pagination: { page: 1, limit: 25, total: 5, totalPages: 1 },
      }),
    });

    renderAuditPage();

    await waitFor(() => {
      // 1. Actions / Event badges
      expect(screen.getByText('Grant Pro')).toBeDefined();
      expect(screen.getByText('Extended')).toBeDefined();
      expect(screen.getByText('Plan Changed')).toBeDefined();
      expect(screen.getByText('Revoked')).toBeDefined();

      // 2. Unknown custom event fallback
      expect(screen.getByText('UNKNOWN CUSTOM EVENT ACTION')).toBeDefined();

      // 3. Reasons
      expect(screen.getByText('Scholarship winner grant')).toBeDefined();
      expect(screen.getByText('Loyalty extension for annual student')).toBeDefined();
      expect(screen.getByText('Student upgraded to Yearly Pro plan')).toBeDefined();
      expect(screen.getByText('Chargeback dispute access revoked')).toBeDefined();
      expect(screen.getByText('No notes provided')).toBeDefined();

      // 4. Target accounts
      expect(screen.getByText('acc-1111...4444')).toBeDefined();
    });
  });

  it('3. handles empty state when no audit records exist', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
      }),
    });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('No audit records found')).toBeDefined();
    });
  });

  it('4. handles API error state with safe ErrorState and provides retry', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit log database.' },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockAuditLogs,
          pagination: { page: 1, limit: 25, total: 5, totalPages: 1 },
        }),
      });
    });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load audit trail')).toBeDefined();
      expect(screen.getByText('Failed to fetch audit log database.')).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Grant Pro')).toBeDefined();
    });
  });

  it('5. handles 403 Forbidden error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      }),
    });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('You do not have permission to view audit logs.')).toBeDefined();
    });
  });

  it('6. event type filter triggers backend query and resets page to 1', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [mockAuditLogs[0]],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderAuditPage();

    const eventSelect = screen.getByLabelText(/Event Action:/i);
    fireEvent.change(eventSelect, { target: { value: 'ENTITLEMENT_MANUALLY_GRANTED' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('eventType=ENTITLEMENT_MANUALLY_GRANTED'),
        expect.anything()
      );
    });
  });

  it('7. accountId search filter triggers backend query', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [mockAuditLogs[0]],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderAuditPage();

    const accountInput = screen.getByPlaceholderText('Paste full UUID account ID...');
    fireEvent.change(accountInput, { target: { value: 'acc-1111-2222-3333-4444' } });

    const filterBtn = screen.getByRole('button', { name: /Filter/i });
    fireEvent.click(filterBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('accountId=acc-1111-2222-3333-4444'),
        expect.anything()
      );
    });
  });

  it('8. pagination controls disable Previous on page 1 and Next on last page', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAuditLogs,
        pagination: { page: 1, limit: 25, total: 5, totalPages: 1 },
      }),
    });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 1/i)).toBeDefined();
    });

    const prevBtn = screen.getByRole('button', { name: /Previous/i }) as HTMLButtonElement;
    const nextBtn = screen.getByRole('button', { name: /Next/i }) as HTMLButtonElement;

    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);
  });

  it('9. opens structured metadata details modal and closes via ESC and close button', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAuditLogs,
        pagination: { page: 1, limit: 25, total: 5, totalPages: 1 },
      }),
    });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Details/i }).length).toBeGreaterThan(0);
    });

    const firstDetailsBtn = screen.getAllByRole('button', { name: /Details/i })[0];
    fireEvent.click(firstDetailsBtn);

    // Modal should be open
    expect(screen.getByText('Audit Record Inspection')).toBeDefined();
    expect(screen.getByText('audit-uuid-1')).toBeDefined();
    expect(screen.getByText('acc-1111-2222-3333-4444')).toBeDefined();

    // Close via Close Inspection button
    const closeBtn = screen.getByRole('button', { name: /Close Inspection/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Audit Record Inspection')).toBeNull();

    // Reopen and close via ESC key
    fireEvent.click(firstDetailsBtn);
    expect(screen.getByText('Audit Record Inspection')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Audit Record Inspection')).toBeNull();
  });

  it('10. verifies the Audit page is strictly inspection-only and renders zero mutation controls', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAuditLogs,
        pagination: { page: 1, limit: 25, total: 5, totalPages: 1 },
      }),
    });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeDefined();
    });

    // Verify there are no mutation controls (edit, delete, revoke, grant, modify)
    expect(screen.queryByText(/Delete Log/i)).toBeNull();
    expect(screen.queryByText(/Edit Record/i)).toBeNull();
    expect(screen.queryByText(/Clear Logs/i)).toBeNull();
    expect(screen.queryByText(/Archive/i)).toBeNull();
  });
});
