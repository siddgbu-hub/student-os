import React, { useState, useEffect } from 'react';
import { X, CalendarPlus, AlertCircle } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface ExtendSubscriptionModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  currentPlanName: string;
  currentExpiresAt: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ExtendSubscriptionModal: React.FC<ExtendSubscriptionModalProps> = ({
  isOpen,
  accountId,
  studentName,
  studentEmail,
  currentPlanName,
  currentExpiresAt,
  onClose,
  onSuccess,
}) => {
  const [durationDays, setDurationDays] = useState<number>(30);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
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

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Now / Expired';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const calculatePreviewExpiry = () => {
    const baseDate = currentExpiresAt && new Date(currentExpiresAt) > new Date()
      ? new Date(currentExpiresAt)
      : new Date();
    const newDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    return formatDate(newDate.toISOString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!reason || reason.trim().length < 3) {
      setError('Reason is required and must be at least 3 characters.');
      return;
    }
    if (reason.trim().length > 500) {
      setError('Reason must not exceed 500 characters.');
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 3650) {
      setError('Extension duration must be a positive integer between 1 and 3650 days.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminApiClient.extendSubscription({
        accountId,
        durationDays,
        reason: reason.trim(),
      });
      onSuccess(`Subscription extended by ${durationDays} days successfully.`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to extend subscriptions.');
        } else if (err.status === 404) {
          setError('The student account or active subscription could not be found.');
        } else if (err.status === 409) {
          setError('Another subscription operation modified this account. Please refresh and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to extend subscription.');
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
      aria-labelledby="extend-modal-title"
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 id="extend-modal-title" className="text-base font-semibold text-white">
                Extend Pro Subscription
              </h3>
              <p className="text-xs text-slate-400">Preserves remaining days and extends expiry</p>
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
          {/* Target Student & Expiry Preview */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-slate-400">Student: </span>
                <span className="text-white font-medium">{studentName || studentEmail}</span>
              </div>
              <span className="font-medium text-slate-300">{currentPlanName}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Expiry</span>
                <span className="text-slate-300 font-medium">{formatDate(currentExpiresAt)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Estimated New Expiry</span>
                <span className="text-emerald-400 font-medium">{calculatePreviewExpiry()}</span>
              </div>
            </div>
          </div>

          {/* Duration with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="extend-duration" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Extension Days
              </label>
              <div className="flex items-center gap-1.5">
                {[7, 30, 90, 365].map((days) => (
                  <button
                    key={days}
                    type="button"
                    disabled={loading}
                    onClick={() => setDurationDays(days)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      durationDays === days
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    +{days}d
                  </button>
                ))}
              </div>
            </div>
            <input
              id="extend-duration"
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
            <label htmlFor="extend-reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Administrative Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="extend-reason"
              rows={3}
              disabled={loading}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Renewal payment received offline, customer goodwill bonus, retention incentive..."
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
              Confirm & Extend Expiry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
