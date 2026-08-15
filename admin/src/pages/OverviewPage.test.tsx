import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAuthProvider } from '../context/AdminAuthContext.js';
import { OverviewPage } from './OverviewPage.js';
import type { AdminOverviewDto } from '@student-os/shared';

const mockOverview: AdminOverviewDto = {
  totalStudents: 150,
  activeTrials: 45,
  activeProMonthly: 20,
  activeProYearly: 10,
  expiredAccounts: 75,
  expiringNext7Days: 8,
  totalRevenuePaise: 2499000, // ₹24,990.00
};

function renderOverviewPage() {
  return render(
    <AdminAuthProvider initialStatus="authenticated" initialToken="test-token">
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    </AdminAuthProvider>
  );
}

describe('PHASE 8 — Overview Dashboard & KPI Metrics Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. renders loading state while fetching overview metrics', () => {
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    renderOverviewPage();

    expect(screen.getByText(/Fetching operational metrics from server/i)).toBeDefined();
  });

  it('2. renders all authoritative KPI values and formats revenue in INR correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockOverview,
      }),
    });

    renderOverviewPage();

    await waitFor(() => {
      // 1. Total Students
      expect(screen.getByText('150')).toBeDefined();
      expect(screen.getByText('Total Students')).toBeDefined();

      // 2. Active Pro (20 + 10 = 30)
      expect(screen.getByText('30')).toBeDefined();
      expect(screen.getByText('Active Pro')).toBeDefined();
      expect(screen.getByText('20 Monthly • 10 Yearly')).toBeDefined();

      // 3. Active Trials (45)
      expect(screen.getAllByText('45').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Active Trials').length).toBeGreaterThanOrEqual(1);

      // 4. Upcoming Renewals (8)
      expect(screen.getByText('8')).toBeDefined();
      expect(screen.getByText('Expiring (7d)')).toBeDefined();

      // 5. Captured Revenue (2499000 paise -> ₹24990.00)
      expect(screen.getByText('₹24990.00')).toBeDefined();
      expect(screen.getByText('Captured Revenue')).toBeDefined();
    });

    // Verify Subscription Snapshot Breakdown
    expect(screen.getByText('Subscription Distribution Snapshot')).toBeDefined();
    expect(screen.getByText('Expired / Inactive')).toBeDefined();
    expect(screen.getByText('75')).toBeDefined();

    // Verify System Status section
    expect(screen.getByText('System Status')).toBeDefined();
    expect(screen.getByText('Connected')).toBeDefined();
    expect(screen.getByText('v1.0 Operational')).toBeDefined();
  });

  it('3. handles API error state and allows retry', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to aggregate overview metrics.' },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockOverview,
        }),
      });
    });

    renderOverviewPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load overview metrics')).toBeDefined();
      expect(screen.getByText('Failed to aggregate overview metrics.')).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeDefined();
      expect(screen.getByText('₹24990.00')).toBeDefined();
    });
  });

  it('4. handles 403 Forbidden error safely', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized permission' },
      }),
    });

    renderOverviewPage();

    await waitFor(() => {
      expect(screen.getByText('You do not have permission to view overview metrics.')).toBeDefined();
    });
  });

  it('5. allows manual data refresh via Refresh Data button', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockOverview,
      }),
    });
    globalThis.fetch = mockFetch as any;

    renderOverviewPage();

    await waitFor(() => {
      expect(screen.getByText('150')).toBeDefined();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh Data/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('6. navigation shortcuts render for Student Directory, Payments Ledger, and Audit Trail', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockOverview,
      }),
    });

    renderOverviewPage();

    await waitFor(() => {
      expect(screen.getByText('Student Directory')).toBeDefined();
      expect(screen.getByText('Payments Ledger')).toBeDefined();
      expect(screen.getByText('Audit Trail')).toBeDefined();
    });
  });
});
