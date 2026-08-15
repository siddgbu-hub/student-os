import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { StudentsPage } from './pages/StudentsPage.js';
import { PaymentsPage } from './pages/PaymentsPage.js';
import { AuditPage } from './pages/AuditPage.js';
import { LoginPage } from './pages/LoginPage.js';

function renderTestApp(initialEntries: string[] = ['/'], authStatus?: 'authenticated' | 'unauthenticated' | 'loading') {
  return render(
    <AdminAuthProvider initialStatus={authStatus} initialToken={authStatus === 'authenticated' ? 'valid-mock-token' : null}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AdminAuthProvider>
  );
}

// Polyfill localStorage in test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });

describe('PHASE 4 — SOCC App Shell & Routing Unit Tests', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
  });

  it('1. unauthenticated user is redirected to the login page', async () => {
    renderTestApp(['/overview'], 'unauthenticated');

    await waitFor(() => {
      expect(screen.getByText('Student OS Command Center')).toBeDefined();
      expect(screen.getByRole('button', { name: /Send Verification Code/i })).toBeDefined();
    });
  });

  it('2. authenticated admin sees the SOCC shell and Overview page', async () => {
    renderTestApp(['/overview'], 'authenticated');

    await waitFor(() => {
      expect(screen.getAllByText('Student OS').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    });

    // Check all primary navigation items are present
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getByText('Students')).toBeDefined();
    expect(screen.getByText('Payments')).toBeDefined();
    expect(screen.getByText('Audit Log')).toBeDefined();
  });

  it('3. routes render the correct placeholder pages (Students, Payments, Audit)', async () => {
    // Students Page
    const { unmount: unmountStudents } = renderTestApp(['/students'], 'authenticated');
    await waitFor(() => {
      expect(screen.getAllByText('Students').length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText('Search by name, email, or account ID...')).toBeDefined();
    });
    unmountStudents();

    // Payments Page
    const { unmount: unmountPayments } = renderTestApp(['/payments'], 'authenticated');
    await waitFor(() => {
      expect(screen.getAllByText('Payments Ledger').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Record Payment/i })).toBeDefined();
    });
    unmountPayments();

    // Audit Page
    const { unmount: unmountAudit } = renderTestApp(['/audit'], 'authenticated');
    await waitFor(() => {
      expect(screen.getAllByText('Audit Trail').length).toBeGreaterThan(0);
      expect(screen.getByLabelText('Event Action:')).toBeDefined();
    });
    unmountAudit();
  });

  it('4. mobile menu toggles navigation drawer cleanly without breaking layout', async () => {
    renderTestApp(['/overview'], 'authenticated');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Toggle navigation menu/i })).toBeDefined();
    });

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(toggleBtn);

    // Nav items should still be in DOM and accessible
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Students').length).toBeGreaterThan(0);
  });

  it('5. sign out button clears credentials and returns to login screen', async () => {
    renderTestApp(['/overview'], 'authenticated');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeDefined();
    });

    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Verification Code/i })).toBeDefined();
    });
  });
});
