import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface GrantSubscriptionModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  currentStatus: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const GrantSubscriptionModal: React.FC<GrantSubscriptionModalProps> = ({
  isOpen,
  accountId,
  studentName,
  studentEmail,
  currentStatus,
  onClose,
  onSuccess,
}) => {
  const [planId, setPlanId] = useState<'monthly' | 'yearly'>('monthly');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Update default duration when plan changes
  const handlePlanChange = (newPlan: 'monthly' | 'yearly') => {
    setPlanId(newPlan);
    setDurationDays(newPlan === 'yearly' ? 365 : 30);
  };

  useEffect(() => {
    if (isOpen) {
      setPlanId('monthly');
      setDurationDays(30);
      setReason('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Client-side validations
    if (!reason || reason.trim().length < 3) {
      setError('Reason is required and must be at least 3 characters.');
      return;
    }
    if (reason.trim().length > 500) {
      setError('Reason must not exceed 500 characters.');
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 3650) {
      setError('Duration must be a positive integer between 1 and 3650 days.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminApiClient.grantSubscription({
        accountId,
        planId,
        durationDays,
        reason: reason.trim(),
      });
      onSuccess(`Pro access (${planId === 'yearly' ? 'Yearly' : 'Monthly'}) granted successfully.`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to grant subscriptions.');
        } else if (err.status === 404) {
          setError('The student account could not be found.');
        } else if (err.status === 409) {
          setError('Another subscription operation changed this account. Please refresh and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to grant subscription.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="grant-modal-title" className="text-base font-semibold text-white">
                Grant Pro Access
              </h3>
              <p className="text-xs text-slate-400">Manual administrative entitlement grant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          {/* Target Student Preview */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-400">Student: </span>
              <span className="text-white font-medium">{studentName || studentEmail}</span>
              <span className="text-slate-500 block font-mono text-[11px] mt-0.5">{studentEmail}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current</span>
              <span className="text-amber-400 font-medium capitalize">{currentStatus}</span>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Plan Tier
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePlanChange('monthly')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  planId === 'monthly'
                    ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-semibold text-xs">Monthly Pro</div>
                <div className="text-[11px] text-slate-400 mt-0.5">30-day billing cycle</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handlePlanChange('yearly')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  planId === 'yearly'
                    ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-semibold text-xs">Yearly Pro</div>
                <div className="text-[11px] text-slate-400 mt-0.5">365-day annual cycle</div>
              </button>
            </div>
          </div>

          {/* Duration Override */}
          <div>
            <label htmlFor="grant-duration" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Duration (Days)
            </label>
            <input
              id="grant-duration"
              type="number"
              min={1}
              max={3650}
              disabled={loading}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="grant-reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Administrative Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="grant-reason"
              rows={3}
              disabled={loading}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Offline payment verified via UPI, scholarship grant, complimentary access..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Required for the immutable audit trail (min 3 characters).
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              disabled={loading}
            >
              Confirm & Grant Pro
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
