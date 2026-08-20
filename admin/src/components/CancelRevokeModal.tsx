import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, AlertTriangle, AlertCircle, Sparkles, Clock } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface CancelRevokeModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  originalPlanName?: string;
  originalExpiryDate?: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const CancelRevokeModal: React.FC<CancelRevokeModalProps> = ({
  isOpen,
  accountId,
  studentName,
  studentEmail,
  originalPlanName,
  originalExpiryDate,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [confirmText, setConfirmText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setConfirmText('');
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

  const isConfirmed = confirmText.trim() === 'RESTORE';
  const now = new Date();
  const isPastExpiry = originalExpiryDate ? new Date(originalExpiryDate).getTime() <= now.getTime() : false;

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'No expiry date';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getDaysRemaining = (isoString?: string | null) => {
    if (!isoString) return 0;
    try {
      const diffMs = new Date(isoString).getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !isConfirmed) return;

    if (!reason || reason.trim().length < 3) {
      setError('Reason is required and must be at least 3 characters.');
      return;
    }
    if (reason.trim().length > 500) {
      setError('Reason must not exceed 500 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminApiClient.cancelRevokeSubscription({
        accountId,
        reason: reason.trim(),
      });
      const outcome = res.data?.outcome;
      const msg =
        outcome === 'expired'
          ? 'Subscription un-revoked: original term has already elapsed, account resolved to Expired state.'
          : 'Subscription un-revoked: active access restored on original terms.';
      onSuccess(msg);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to modify subscriptions.');
        } else if (err.status === 404) {
          setError('No revoked subscription found for this student.');
        } else if (err.status === 409) {
          setError('Another operation modified this account. Please refresh and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to cancel subscription revocation.');
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-revoke-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-emerald-950/30 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cancel-revoke-modal-title" className="text-base font-bold text-white tracking-tight">
                Cancel Subscription Revoke
              </h3>
              <p className="text-xs text-emerald-300/90 mt-0.5 font-medium">
                Restore access using original subscription terms. No new subscription will be created.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Student Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target Student:</span>
              <span className="font-semibold text-white">{studentName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="font-mono text-slate-300 break-all">{studentEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Original Plan:</span>
              <span className="font-semibold text-blue-400">{originalPlanName || 'Original Subscription Plan'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Original Expiry:</span>
              <span className="font-mono text-slate-300">{formatDate(originalExpiryDate)}</span>
            </div>
          </div>

          {/* Outcome Status Preview Banner */}
          {isPastExpiry ? (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Original Period Has Elapsed:</span>
              </div>
              <p className="text-amber-200/90 text-[11px] leading-relaxed">
                The original expiry date ({formatDate(originalExpiryDate)}) has already passed.
                Cancelling revocation will resolve this account directly to <strong className="text-white">EXPIRED</strong> state. No additional free time will be granted.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Restores Active Access:</span>
              </div>
              <p className="text-emerald-200/90 text-[11px] leading-relaxed">
                Restoration will resume the remaining <strong className="text-white">{getDaysRemaining(originalExpiryDate)} day(s)</strong> on the original subscription clock until <strong className="text-white">{formatDate(originalExpiryDate)}</strong>.
              </p>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for Restoring Access <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Temporary suspension resolved, student provided verification..."
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              required
            />
          </div>

          {/* Confirmation Challenge Input */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-emerald-400 mb-1.5">
              Type <span className="font-mono underline font-extrabold text-white">RESTORE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESTORE"
              className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider bg-slate-950 border border-emerald-800/80 rounded-lg text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors uppercase"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || !isConfirmed || reason.trim().length < 3}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Restoring Access...' : 'Restore Original Subscription'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
