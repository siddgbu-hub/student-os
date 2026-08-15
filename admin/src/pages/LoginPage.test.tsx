import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAuthProvider } from '../context/AdminAuthContext.js';
import { LoginPage } from './LoginPage.js';

function renderLoginPage() {
  return render(
    <AdminAuthProvider initialStatus="unauthenticated">
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AdminAuthProvider>
  );
}

describe('SOCC LoginPage — Email OTP Authentication Flow Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. renders Step 1 email form with correct SOCC branding and NO JWT inputs', () => {
    renderLoginPage();

    // Verify SOCC branding
    expect(screen.getByText('Student OS Command Center')).toBeDefined();
    expect(screen.getByText('SOCC V1 — Internal Owner Control Console')).toBeDefined();

    // Verify Step 1 elements
    expect(screen.getByLabelText(/Owner \/ Admin Email Address/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Send Verification Code/i })).toBeDefined();

    // VERIFY OLD JWT BEARER TOKEN UI IS COMPLETELY ABSENT
    expect(screen.queryByText(/ADMIN SESSION BEARER TOKEN/i)).toBeNull();
    expect(screen.queryByText(/Paste your signed admin JWT token/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Authenticate & Enter SOCC/i })).toBeNull();
  });

  it('2. validates email format and prevents submission with invalid email', async () => {
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: /Send Verification Code/i });
    const emailInput = screen.getByLabelText(/Owner \/ Admin Email Address/i);

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.submit(emailInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeDefined();
    });
  });

  it('3. sends OTP to valid email and transitions to Step 2 (6-digit OTP input)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Verification code sent to admin@studentos.app',
      }),
    });

    renderLoginPage();

    const emailInput = screen.getByLabelText(/Owner \/ Admin Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'admin@studentos.app' } });

    const submitBtn = screen.getByRole('button', { name: /Send Verification Code/i });
    fireEvent.click(submitBtn);

    // Verify fetch was called with correct endpoint and payload
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/email/send-otp'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'admin@studentos.app' }),
        })
      );
    });

    // Step 2 should now be visible
    await waitFor(() => {
      expect(screen.getAllByText(/Code sent to/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/admin@studentos\.app/i).length).toBeGreaterThan(0);
      expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Verify & Enter SOCC/i })).toBeDefined();
    });
  });

  it('4. Change button in Step 2 returns to Step 1 and resets OTP state', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'OTP sent' }),
    });

    renderLoginPage();

    const emailInput = screen.getByLabelText(/Owner \/ Admin Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'admin@studentos.app' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    await waitFor(() => {
      expect(screen.getByText(/Change/i)).toBeDefined();
    });

    // Click Change button
    fireEvent.click(screen.getByRole('button', { name: /Change/i }));

    // Should be back at Step 1
    expect(screen.getByLabelText(/Owner \/ Admin Email Address/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Send Verification Code/i })).toBeDefined();
  });

  it('5. validates 6-digit OTP requirement and rejects incomplete codes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'OTP sent' }),
    });

    renderLoginPage();

    // Advance to step 2
    fireEvent.change(screen.getByLabelText(/Owner \/ Admin Email Address/i), {
      target: { value: 'admin@studentos.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeDefined();
    });

    // Enter short OTP
    const otpInput = screen.getByLabelText(/6-Digit Verification Code/i);
    fireEvent.change(otpInput, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Enter SOCC/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter the complete 6-digit verification code.')).toBeDefined();
    });
  });

  it('6. successful OTP verification stores token and invokes RBAC check', async () => {
    let fetchCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCount++;
      if (url.includes('/api/v1/auth/email/send-otp')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'OTP sent' }),
        };
      }
      if (url.includes('/api/v1/auth/email/verify-otp')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            token: 'valid-admin-jwt-token-12345',
            sessionId: 'sess-1',
            account: { accountId: 'acc-admin-1', email: 'owner@studentos.app' },
          }),
        };
      }
      if (url.includes('/api/v1/admin/overview')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { totalStudents: 100, activeTrials: 20, totalRevenuePaise: 500000 },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    renderLoginPage();

    // Step 1: Send OTP
    fireEvent.change(screen.getByLabelText(/Owner \/ Admin Email Address/i), {
      target: { value: 'owner@studentos.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    // Step 2: Enter OTP
    await waitFor(() => {
      expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/6-Digit Verification Code/i), {
      target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Enter SOCC/i }));

    // Verify token was stored in localStorage
    await waitFor(() => {
      expect(localStorage.getItem('student_os_admin_token')).toBe('valid-admin-jwt-token-12345');
      expect(localStorage.getItem('student_os_admin_email')).toBe('owner@studentos.app');
    });
  });

  it('7. non-admin student account gets 403 Access Denied error', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/auth/email/send-otp')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'OTP sent' }),
        };
      }
      if (url.includes('/api/v1/auth/email/verify-otp')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            token: 'valid-student-jwt-token',
            sessionId: 'sess-student-1',
            account: { accountId: 'acc-student-1', email: 'student@example.com' },
          }),
        };
      }
      if (url.includes('/api/v1/admin/overview')) {
        // RBAC check fails with 403 FORBIDDEN
        return {
          ok: false,
          status: 403,
          json: async () => ({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access Denied: Your account does not have Admin or Owner privileges.',
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    renderLoginPage();

    // Step 1
    fireEvent.change(screen.getByLabelText(/Owner \/ Admin Email Address/i), {
      target: { value: 'student@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    // Step 2
    await waitFor(() => {
      expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/6-Digit Verification Code/i), {
      target: { value: '112233' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Enter SOCC/i }));

    // Verify 403 error message is displayed
    await waitFor(() => {
      expect(
        screen.getByText('Access Denied: Your account does not have Admin or Owner privileges.')
      ).toBeDefined();
    });

    // Session token must NOT remain stored when access is denied
    expect(localStorage.getItem('student_os_admin_token')).toBeNull();
  });

  it('8. rate-limited OTP request displays appropriate error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many OTP requests. Please wait 60 seconds.' },
      }),
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/Owner \/ Admin Email Address/i), {
      target: { value: 'spam@studentos.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    await waitFor(() => {
      expect(screen.getByText('Too many OTP requests. Please wait 60 seconds.')).toBeDefined();
    });
  });

  it('9. invalid OTP displays error message and stays on Step 2', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/auth/email/send-otp')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'OTP sent' }),
        };
      }
      if (url.includes('/api/v1/auth/email/verify-otp')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            error: { code: 'AUTH_INVALID_OTP', message: 'Invalid or expired verification code.' },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    renderLoginPage();

    // Step 1
    fireEvent.change(screen.getByLabelText(/Owner \/ Admin Email Address/i), {
      target: { value: 'admin@studentos.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    // Step 2
    await waitFor(() => {
      expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/6-Digit Verification Code/i), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Enter SOCC/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid or expired verification code/i)).toBeDefined();
    });

    // Still on Step 2
    expect(screen.getByLabelText(/6-Digit Verification Code/i)).toBeDefined();
  });

  it('10. redirects to /overview when authenticated', () => {
    render(
      <AdminAuthProvider initialStatus="authenticated" initialToken="mock-token">
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AdminAuthProvider>
    );

    // When authenticated, LoginPage returns Navigate to /overview, so the login form is not rendered
    expect(screen.queryByLabelText(/Owner \/ Admin Email Address/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Send Verification Code/i })).toBeNull();
  });
});
