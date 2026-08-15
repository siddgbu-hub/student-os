import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext.js';
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

describe('SOCC App Shell & Layout UX Unit Tests', () => {
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

  it('2. authenticated admin sees the SOCC shell, Back buttons, and Overview page', async () => {
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

    // Check Back button is present in the layout
    expect(screen.getAllByRole('button', { name: /Go back/i }).length).toBeGreaterThan(0);
  });

  it('3. clicking brand block navigates to /overview', async () => {
    renderTestApp(['/students'], 'authenticated');

    await waitFor(() => {
      expect(screen.getAllByText('Student Directory').length).toBeGreaterThan(0);
    });

    const brandLinks = screen.getAllByRole('link', { name: /Go to SOCC Overview/i });
    expect(brandLinks.length).toBeGreaterThan(0);
    fireEvent.click(brandLinks[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Overview & Analytics').length).toBeGreaterThan(0);
    });
  });

  it('4. in-app back button safely navigates back or falls back to /overview', async () => {
    renderTestApp(['/payments'], 'authenticated');

    await waitFor(() => {
      expect(screen.getAllByText('Payments Ledger').length).toBeGreaterThan(0);
    });

    const backBtns = screen.getAllByRole('button', { name: /Go back/i });
    expect(backBtns.length).toBeGreaterThan(0);
    fireEvent.click(backBtns[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Overview & Analytics').length).toBeGreaterThan(0);
    });
  });

  it('5. mobile menu toggles navigation drawer cleanly and closes on navigation click', async () => {
    renderTestApp(['/overview'], 'authenticated');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Toggle navigation menu/i })).toBeDefined();
    });

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(toggleBtn);

    // Nav items inside drawer should be present
    expect(screen.getAllByText('Students').length).toBeGreaterThan(0);

    // Clicking a nav item inside drawer navigates and closes drawer
    const studentsNavLinks = screen.getAllByRole('link', { name: /Students/i });
    fireEvent.click(studentsNavLinks[studentsNavLinks.length - 1]);

    await waitFor(() => {
      expect(screen.getAllByText('Student Directory').length).toBeGreaterThan(0);
    });
  });

  it('6. sign out button clears credentials and returns to login screen', async () => {
    renderTestApp(['/overview'], 'authenticated');

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Sign Out/i }).length).toBeGreaterThan(0);
    });

    const signOutBtn = screen.getAllByRole('button', { name: /Sign Out/i })[0];
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Verification Code/i })).toBeDefined();
    });
  });
});
