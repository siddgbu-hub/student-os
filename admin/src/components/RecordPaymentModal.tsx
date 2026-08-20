import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CreditCard,
  Search,
  AlertCircle,
  Gift,
  Building2,
  Smartphone,
  Banknote,
  Percent,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { AdminUserSummaryDto, PaymentMethod } from '@student-os/shared';
import { PLAN_PRICING_PAISE } from '@student-os/shared';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialAccountId?: string;
  initialStudentName?: string;
  initialStudentEmail?: string;
  currentPlanName?: string | null;
  currentExpiresAt?: string | null;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAccountId,
  initialStudentName,
  initialStudentEmail,
  currentPlanName,
  currentExpiresAt,
}) => {
  // Student selection state
  const [selectedStudent, setSelectedStudent] = useState<{
    accountId: string;
    name: string;
    email: string;
  } | null>(null);

  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentSearchResults, setStudentSearchResults] = useState<AdminUserSummaryDto[]>([]);
  const [searchingStudents, setSearchingStudents] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

  // Form states
  const [planId, setPlanId] = useState<'monthly' | 'yearly'>('monthly');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');
  const [activatePro, setActivatePro] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Detect active Pro for stacking preview
  const isProActive = Boolean(
    currentExpiresAt &&
    new Date(currentExpiresAt).getTime() > Date.now() &&
    currentPlanName &&
    (currentPlanName.toLowerCase().includes('monthly') ||
      currentPlanName.toLowerCase().includes('yearly') ||
      currentPlanName.toLowerCase().includes('pro'))
  );

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'None';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialAccountId) {
        setSelectedStudent({
          accountId: initialAccountId,
          name: initialStudentName || initialStudentEmail || 'Student',
          email: initialStudentEmail || '',
        });
      } else {
        setSelectedStudent(null);
      }
      setStudentSearchQuery('');
      setStudentSearchResults([]);
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      setPlanId('monthly');
      setDiscountPercent(0);
      setPaymentMethod('upi');
      setTransactionReference('');
      setDurationDays(30);
      setNotes('');
      setActivatePro(true);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialAccountId, initialStudentName, initialStudentEmail]);

  // Click outside listener to dismiss autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteContainerRef.current &&
        !autocompleteContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derived pricing calculations in paise using shared canonical pricing
  const listPricePaise = planId === 'yearly' ? PLAN_PRICING_PAISE.yearly : PLAN_PRICING_PAISE.monthly;
  const discountAmountPaise = Math.round((listPricePaise * discountPercent) / 100);
  const finalAmountPaise = Math.max(0, listPricePaise - discountAmountPaise);

  const formatINR = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(paise / 100);
  };

  // Handle plan change default durations
  const handlePlanChange = (newPlan: 'monthly' | 'yearly') => {
    setPlanId(newPlan);
    setDurationDays(newPlan === 'yearly' ? 365 : 30);
  };

  const handleDiscountPreset = (preset: number) => {
    setDiscountPercent(preset);
    if (preset === 100) {
      setPaymentMethod('complimentary');
    } else if (paymentMethod === 'complimentary') {
      setPaymentMethod('upi');
    }
  };

  // Search students when user types
  useEffect(() => {
    if (!isOpen || selectedStudent || !studentSearchQuery.trim()) {
      setStudentSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await adminApiClient.get<{ data: AdminUserSummaryDto[] }>('/api/v1/admin/users', {
          query: studentSearchQuery.trim(),
          limit: 5,
        });
        const results = res.data || [];
        setStudentSearchResults(results);
        setIsDropdownOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch {
        setStudentSearchResults([]);
        setIsDropdownOpen(false);
      } finally {
        setSearchingStudents(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [isOpen, studentSearchQuery, selectedStudent]);

  // Keyboard accessibility: ESC closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading && !isDropdownOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, isDropdownOpen, onClose]);

  const selectStudent = (student: AdminUserSummaryDto) => {
    setSelectedStudent({
      accountId: student.accountId,
      name: student.fullName || student.email,
      email: student.email,
    });
    setStudentSearchQuery('');
    setStudentSearchResults([]);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || studentSearchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % studentSearchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + studentSearchResults.length) % studentSearchResults.length);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < studentSearchResults.length) {
        e.preventDefault();
        selectStudent(studentSearchResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Client-side validations
    if (!selectedStudent) {
      setError('Please select a student account to record this payment for.');
      return;
    }

    if (discountPercent < 0 || discountPercent > 100 || !Number.isInteger(discountPercent)) {
      setError('Discount must be an integer percentage between 0% and 100%.');
      return;
    }

    // 100% discount semantic validation
    if (finalAmountPaise === 0) {
      if (!notes.trim() || notes.trim().length < 3) {
        setError('A reason/note (minimum 3 characters) is required for 100% discounted purchases.');
        return;
      }
    } else {
      if (paymentMethod === 'complimentary') {
        setError('Complimentary payment method is only valid for ₹0 transactions. Use 100% discount or select another payment method.');
        return;
      }
      if (!transactionReference.trim()) {
        setError('Transaction reference (UTR/Ref/Receipt #) is required for paid payments.');
        return;
      }
    }

    if (notes && notes.length > 1000) {
      setError('Notes cannot exceed 1000 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminApiClient.recordPayment({
        accountId: selectedStudent.accountId,
        planId,
        discountPercent,
        paymentMethod,
        transactionReference: transactionReference.trim() ? transactionReference.trim() : null,
        durationDays: durationDays > 0 ? durationDays : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        activatePro,
      });

      const amountFormatted = formatINR(finalAmountPaise);
      const discountLabel = discountPercent > 0 ? ` (${discountPercent}% Discount)` : '';
      onSuccess(
        `Payment of ${amountFormatted}${discountLabel} (${paymentMethod.toUpperCase()}) recorded successfully for ${selectedStudent.name}.`
      );
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to record payments.');
        } else if (err.status === 404) {
          setError('The selected student account could not be found.');
        } else if (err.status === 409 || err.code === 'DUPLICATE_PAYMENT_REFERENCE') {
          setError('A payment with this transaction reference already exists. Please verify the reference and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to record payment.');
      }
    } finally {
      setLoading(false);
    }
  };  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-60 my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 id="record-payment-modal-title" className="text-base font-semibold text-white">
                Record Manual Payment
              </h3>
              <p className="text-xs text-slate-400">Record offline/direct transaction with discount support and activate Pro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: STUDENT SELECTION */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Target Student <span className="text-rose-400">*</span>
            </label>

            {selectedStudent ? (
              <div className="p-3 bg-slate-950 border border-blue-500/40 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">{selectedStudent.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{selectedStudent.email}</div>
                  </div>
                </div>
                {!initialAccountId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentSearchQuery('');
                    }}
                    className="text-xs cursor-pointer"
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative" ref={autocompleteContainerRef}>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    role="combobox"
                    aria-expanded={isDropdownOpen}
                    aria-autocomplete="list"
                    aria-controls="student-autocomplete-list"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={loading}
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (studentSearchResults.length > 0) setIsDropdownOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search by student name or email..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  {searchingStudents && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs animate-pulse">
                      Searching...
                    </div>
                  )}
                </div>

                {isDropdownOpen && studentSearchResults.length > 0 && (
                  <div
                    id="student-autocomplete-list"
                    role="listbox"
                    className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-800/60"
                  >
                    {studentSearchResults.map((student, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      return (
                        <div
                          key={student.accountId}
                          role="option"
                          aria-selected={isHighlighted}
                          onClick={() => selectStudent(student)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isHighlighted ? 'bg-blue-600/20 text-white' : 'hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs text-white">{student.fullName || 'Student'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{student.email}</div>
                          </div>
                          <Badge
                            variant={student.isPaid ? 'pro' : student.currentPlanId === 'free_trial' ? 'trial' : 'neutral'}
                            size="sm"
                          >
                            {student.currentPlanId ? student.currentPlanId.toUpperCase() : 'NO PLAN'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEQUENTIAL STACKING PREVIEW BANNER (IF ACTIVE PRO EXISTS) */}
          {isProActive && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Sequential Stacking Active</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 pt-0.5">
                <span>Current Pro valid until:</span>
                <span className="font-semibold text-white">{formatDate(currentExpiresAt)}</span>
              </div>
              <div className="flex items-center justify-between text-blue-300 font-medium">
                <span>New {planId === 'yearly' ? 'Yearly Pro' : 'Monthly Pro'} starts:</span>
                <span className="font-semibold text-blue-200">{formatDate(currentExpiresAt)} (Queued)</span>
              </div>
              <p className="text-[11px] text-blue-300/80 pt-0.5">
                New plan starts automatically after current Pro ends with zero overlap.
              </p>
            </div>
          )}

          {/* SECTION 2: PLAN TIER SELECTION */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Subscription Plan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePlanChange('monthly')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  planId === 'monthly'
                    ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-semibold text-xs">Monthly Pro</div>
                <div className="text-[11px] text-slate-400 mt-0.5">30 Days • List: ₹30.00</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handlePlanChange('yearly')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  planId === 'yearly'
                    ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-semibold text-xs">Yearly Pro</div>
                <div className="text-[11px] text-slate-400 mt-0.5">365 Days • List: ₹299.00</div>
              </button>
            </div>
          </div>

          {/* SECTION 3: DISCOUNT PERCENTAGE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="discount-percent" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Discount Percentage (0–100%)
              </label>
              <div className="flex items-center gap-1">
                {[0, 10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={loading}
                    onClick={() => handleDiscountPreset(preset)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      discountPercent === preset
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Percent className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="discount-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                disabled={loading}
                value={discountPercent}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const newDisc = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
                  setDiscountPercent(newDisc);
                  if (newDisc === 100) {
                    setPaymentMethod('complimentary');
                  } else if (paymentMethod === 'complimentary') {
                    setPaymentMethod('upi');
                  }
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* SECTION 4: LIVE CALCULATION PREVIEW */}
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Pricing Calculation Preview (Server-Authoritative)
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">List Price</span>
                <span className="font-mono text-slate-300">{formatINR(listPricePaise)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Discount</span>
                <span className={`font-mono ${discountPercent > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {discountPercent > 0 ? `- ${formatINR(discountAmountPaise)} (${discountPercent}%)` : '0%'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Final Payable</span>
                <span className="font-mono font-bold text-white text-sm">
                  {formatINR(finalAmountPaise)}
                </span>
              </div>
            </div>

            {/* 100% discount warning banner */}
            {discountPercent === 100 && (
              <div className="flex items-center gap-2 p-2 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-xs mt-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>100% discount — this creates a ₹0 subscription purchase. Reason/note is required.</span>
              </div>
            )}
          </div>

          {/* SECTION 5: PAYMENT METHOD */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Payment Method <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'upi', label: 'UPI', icon: Smartphone },
                { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'complimentary', label: 'Complimentary', icon: Gift },
                { id: 'razorpay', label: 'Razorpay', icon: CreditCard },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={loading}
                  onClick={() => setPaymentMethod(id as PaymentMethod)}
                  className={`p-2.5 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === id
                      ? 'border-emerald-500 bg-emerald-600/15 text-emerald-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-semibold leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 6: TRANSACTION REFERENCE */}
          <div>
            <label htmlFor="payment-ref" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Transaction Reference / UTR {finalAmountPaise > 0 ? <span className="text-rose-400">*</span> : <span className="text-slate-400 text-[11px] font-normal">(Optional for ₹0 purchase)</span>}
            </label>
            <input
              id="payment-ref"
              type="text"
              disabled={loading}
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder={finalAmountPaise === 0 ? 'Optional (e.g., PROMO-100-FESTIVAL)' : 'E.g., UPI Ref 9988771122 or Bank UTR'}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* SECTION 7: NOTES / ADMINISTRATIVE REASON */}
          <div>
            <label htmlFor="payment-notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Notes / Administrative Reason {finalAmountPaise === 0 ? <span className="text-rose-400">* (Required for 100% discount)</span> : <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>}
            </label>
            <textarea
              id="payment-notes"
              rows={2}
              maxLength={1000}
              disabled={loading}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={finalAmountPaise === 0 ? 'State justification for 100% grant (e.g. Merit scholarship, influencer promo...)' : 'Optional transaction notes or remarks...'}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={onClose}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              disabled={loading}
              className="cursor-pointer"
            >
              Confirm & Record Payment
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
