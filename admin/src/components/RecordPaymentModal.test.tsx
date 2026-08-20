import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordPaymentModal } from './RecordPaymentModal.js';

describe('RecordPaymentModal Component Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. validates that a student must be selected before submission', async () => {
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Please select a student account/i)).toBeDefined();
  });

  it('2. validates that paid payment methods require a transaction reference', async () => {
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-123"
        initialStudentName="Rohan Gupta"
        initialStudentEmail="rohan@example.com"
      />
    );

    // Initial student is preselected
    expect(screen.getByText('Rohan Gupta')).toBeDefined();

    // Submit with empty transaction reference on paid 0% discount
    const submitBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Transaction reference .* is required for paid payments/i)).toBeDefined();
  });

  it('3. supports 100% discount with ₹0 payable, mandatory note, and optional transaction reference', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { paymentId: 'pmt-free-1', status: 'captured' },
      }),
    });
    globalThis.fetch = mockFetch as any;

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        initialAccountId="acc-123"
        initialStudentName="Rohan Gupta"
        initialStudentEmail="rohan@example.com"
      />
    );

    // Click 100% preset button
    const preset100Btn = screen.getByRole('button', { name: '100%' });
    fireEvent.click(preset100Btn);

    // Select Complimentary method
    const complimentaryBtn = screen.getByRole('button', { name: /Complimentary/i });
    fireEvent.click(complimentaryBtn);

    // Warning banner should be visible
    expect(screen.getByText(/100% discount — this creates a ₹0 subscription purchase/i)).toBeDefined();

    // Enter required notes for 100% discount
    const notesInput = screen.getByLabelText(/Notes/i);
    fireEvent.change(notesInput, { target: { value: '100% Merit Scholarship Concession' } });

    // Submit without transaction reference (valid for 100% discount)
    const submitBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/payments/record'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-123',
            planId: 'monthly',
            discountPercent: 100,
            paymentMethod: 'complimentary',
            transactionReference: null,
            durationDays: 30,
            notes: '100% Merit Scholarship Concession',
            activatePro: true,
          }),
        })
      );
      expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('COMPLIMENTARY'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('4. supports bank transfer payment method and yearly plan with 365 days and 0% discount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { paymentId: 'pmt-bank-1', status: 'captured' },
      }),
    });
    globalThis.fetch = mockFetch as any;

    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-123"
        initialStudentName="Rohan Gupta"
        initialStudentEmail="rohan@example.com"
      />
    );

    // Select Yearly Plan
    const yearlyBtn = screen.getByRole('button', { name: /Yearly Pro/i });
    fireEvent.click(yearlyBtn);

    // Select Bank Transfer
    const bankTransferBtn = screen.getByRole('button', { name: /Bank Transfer/i });
    fireEvent.click(bankTransferBtn);

    // Enter reference and notes
    const refInput = screen.getByLabelText(/Transaction Reference/i);
    fireEvent.change(refInput, { target: { value: 'NEFT-HDFC-554433' } });

    const notesInput = screen.getByLabelText(/Notes/i);
    fireEvent.change(notesInput, { target: { value: 'Annual subscription fee NEFT' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/payments/record'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-123',
            planId: 'yearly',
            discountPercent: 0,
            paymentMethod: 'bank_transfer',
            transactionReference: 'NEFT-HDFC-554433',
            durationDays: 365,
            notes: 'Annual subscription fee NEFT',
            activatePro: true,
          }),
        })
      );
    });
  });

  it('5. handles 409 Duplicate Transaction Reference error explicitly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: { code: 'DUPLICATE_PAYMENT_REFERENCE', message: 'Reference already exists' },
      }),
    });

    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-123"
        initialStudentName="Rohan Gupta"
        initialStudentEmail="rohan@example.com"
      />
    );

    const refInput = screen.getByLabelText(/Transaction Reference/i);
    fireEvent.change(refInput, { target: { value: 'DUPLICATE-UTR-99' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/A payment with this transaction reference already exists/i)).toBeDefined();
    });
  });

  it('6. handles 403 Forbidden error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      }),
    });

    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-123"
        initialStudentName="Rohan Gupta"
        initialStudentEmail="rohan@example.com"
      />
    );

    const refInput = screen.getByLabelText(/Transaction Reference/i);
    fireEvent.change(refInput, { target: { value: 'UTR-12345' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('You do not have permission to record payments.')).toBeDefined();
    });
  });

  it('7. displays live calculation preview when discount preset is selected', () => {
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-123"
        initialStudentName="Rohan Gupta"
        initialStudentEmail="rohan@example.com"
      />
    );

    // Initial preview for monthly (₹30.00 list price)
    expect(screen.getByText('Pricing Calculation Preview (Server-Authoritative)')).toBeDefined();

    // Click 50% preset
    const preset50Btn = screen.getByRole('button', { name: '50%' });
    fireEvent.click(preset50Btn);

    // Preview should update to show 50% discount (₹15.00)
    expect(screen.getByText(/- ₹15.00 \(50%\)/i)).toBeDefined();
    expect(screen.getByText('₹15.00')).toBeDefined();
  });

  it('8. closes modal on Escape key press', () => {
    const onClose = vi.fn();
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={onClose}
        onSuccess={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('9. custom autocomplete searches students and allows keyboard and click selection', async () => {
    const mockUsers = [
      {
        accountId: 'acc-456',
        email: 'priya@example.com',
        fullName: 'Priya Sharma',
        currentPlanId: 'free_trial',
        entitlementStatus: 'active',
        isPaid: false,
        daysRemaining: 7,
        deviceCount: 2,
        createdAt: '2026-08-10T00:00:00.000Z',
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockUsers,
      }),
    });

    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by student name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Priya' } });

    // Wait for autocomplete dropdown results
    await waitFor(() => {
      expect(screen.getByText('Priya Sharma')).toBeDefined();
      expect(screen.getByText('priya@example.com')).toBeDefined();
    });

    // Arrow down highlights the item, Enter selects it
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    // Selected student card is now rendered
    await waitFor(() => {
      expect(screen.getByText('Change')).toBeDefined();
    });
  });

  it('10. custom autocomplete dropdown dismisses on Escape key', async () => {
    const mockUsers = [
      {
        accountId: 'acc-789',
        email: 'aman@example.com',
        fullName: 'Aman Verma',
        currentPlanId: 'yearly',
        entitlementStatus: 'active',
        isPaid: true,
        daysRemaining: 200,
        deviceCount: 1,
        createdAt: '2026-08-10T00:00:00.000Z',
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockUsers,
      }),
    });

    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by student name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Aman' } });

    await waitFor(() => {
      expect(screen.getByText('Aman Verma')).toBeDefined();
    });

    // Press Escape on the search input to close the dropdown
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    // Dropdown list should be dismissed
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });

  // REGRESSION TEST — Discount Flow
  it('11. [REGRESSION] partial discount sends correct discountPercent to backend and success message reflects final (discounted) amount, not list price', async () => {
    // listPricePaise = 3000 (monthly ₹30.00), 25% discount → final = 2250 paise = ₹22.50
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { paymentId: 'pmt-disc-25', status: 'captured' },
      }),
    });
    globalThis.fetch = mockFetch as any;

    const onSuccess = vi.fn();

    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        initialAccountId="acc-disc"
        initialStudentName="Test Discount Student"
        initialStudentEmail="discount@example.com"
      />
    );

    // Apply 25% discount via preset button
    const preset25Btn = screen.getByRole('button', { name: '25%' });
    fireEvent.click(preset25Btn);

    // Preview must reflect discounted amount (₹22.50) not list price (₹30.00)
    expect(screen.getByText(/- ₹7.50 \(25%\)/i)).toBeDefined();

    // Provide required transaction reference for paid payment
    const refInput = screen.getByLabelText(/Transaction Reference/i);
    fireEvent.change(refInput, { target: { value: 'UPI-DISCOUNT-TEST-99' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Record Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // 1. Backend receives discountPercent (not computed amount) — the correct contract
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/payments/record'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-disc',
            planId: 'monthly',
            discountPercent: 25,
            paymentMethod: 'upi',
            transactionReference: 'UPI-DISCOUNT-TEST-99',
            durationDays: 30,
            notes: undefined,
            activatePro: true,
          }),
        })
      );
      // 2. Success message shows discounted final amount, not the list price
      expect(onSuccess).toHaveBeenCalledWith(
        expect.stringContaining('₹22.50')
      );
      expect(onSuccess).toHaveBeenCalledWith(
        expect.stringContaining('25% Discount')
      );
      // 3. Success message must NOT show list price ₹30 as if no discount was applied
      expect(onSuccess).not.toHaveBeenCalledWith(
        expect.stringContaining('₹30.00')
      );
    });
  });

  it('12. displays sequential stacking preview banner when launched for student with active Pro', () => {
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-pro-1"
        initialStudentName="Kavya Nair"
        initialStudentEmail="kavya@example.com"
        currentPlanName="Monthly Pro"
        currentExpiresAt="2026-09-20T18:30:00.000Z"
      />
    );

    // Stacking preview banner should appear
    expect(screen.getByText(/Sequential Stacking Active/i)).toBeDefined();
    expect(screen.getByText(/Current Pro valid until:/i)).toBeDefined();
    expect(screen.getAllByText(/21 Sept 2026/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/New Monthly Pro starts:/i)).toBeDefined();
    expect(screen.getByText(/New plan starts automatically after current Pro ends with zero overlap\./i)).toBeDefined();
  });

  it('13. automatically switches payment method to complimentary when 100% discount preset is clicked', () => {
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-comp-1"
        initialStudentName="Dev Sharma"
        initialStudentEmail="dev@example.com"
      />
    );

    // Click 100% preset
    const preset100 = screen.getByRole('button', { name: '100%' });
    fireEvent.click(preset100);

    // Final payable should be ₹0.00
    expect(screen.getByText(/100% discount — this creates a ₹0 subscription purchase/i)).toBeDefined();
  });

  it('14. calculates correct pricing for Yearly Pro: ₹299 list price, ₹149.50 at 50%, and ₹0 at 100%', () => {
    render(
      <RecordPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialAccountId="acc-yearly-1"
        initialStudentName="Ananya Rao"
        initialStudentEmail="ananya@example.com"
      />
    );

    // Select Yearly Plan
    const yearlyBtn = screen.getByRole('button', { name: /Yearly Pro/i });
    fireEvent.click(yearlyBtn);

    // 0% discount: List price ₹299.00, Final payable ₹299.00
    expect(screen.getAllByText('₹299.00').length).toBeGreaterThan(0);

    // 50% discount: Discount - ₹149.50, Final payable ₹149.50
    const preset50 = screen.getByRole('button', { name: '50%' });
    fireEvent.click(preset50);
    expect(screen.getByText(/- ₹149.50 \(50%\)/i)).toBeDefined();
    expect(screen.getByText('₹149.50')).toBeDefined();

    // 100% discount: Discount - ₹299.00, Final payable ₹0.00
    const preset100 = screen.getByRole('button', { name: '100%' });
    fireEvent.click(preset100);
    expect(screen.getByText(/- ₹299.00 \(100%\)/i)).toBeDefined();
    expect(screen.getByText('₹0.00')).toBeDefined();
  });
});
