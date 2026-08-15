import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, AlertTriangle, AlertCircle } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface RevokeSubscriptionModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  currentPlanName: string;
  currentStatus: string;
  currentExpiresAt: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RevokeSubscriptionModal: React.FC<RevokeSubscriptionModalProps> = ({
  isOpen,
  accountId,
  studentName,
  studentEmail,
  currentPlanName,
  currentStatus,
  currentExpiresAt,
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

  const isConfirmed = confirmText.trim() === 'REVOKE';

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
      await adminApiClient.revokeSubscription({
        accountId,
        reason: reason.trim(),
      });
      onSuccess('Pro access revoked successfully.');
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to revoke subscriptions.');
        } else if (err.status === 404) {
          setError('The student account could not be found.');
        } else if (err.status === 409) {
          setError('Another subscription operation modified this account. Please refresh and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to revoke subscription.');
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
      aria-labelledby="revoke-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-900/60 rounded-xl shadow-2xl overflow-hidden z-50">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-rose-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 id="revoke-modal-title" className="text-base font-semibold text-white">
                Revoke Pro Access
              </h3>
              <p className="text-xs text-rose-300/80">Destructive entitlement revocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          {/* Target Student Preview */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-slate-400">Student: </span>
                <span className="text-white font-medium">{studentName || studentEmail}</span>
              </div>
              <span className="font-semibold text-rose-400 capitalize">{currentStatus}</span>
            </div>
            <div className="text-slate-500 text-[11px]">
              Active Plan: {currentPlanName} {currentExpiresAt ? `(Expires: ${new Date(currentExpiresAt).toLocaleDateString()})` : ''}
            </div>
          </div>

          {/* Warning Notice */}
          <div className="flex items-start gap-2.5 p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Destructive Operation</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5 leading-relaxed">
                Revoking access immediately terminates the student's active Pro entitlement and resets access status. The student's academic study data and account records will remain intact.
              </p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="revoke-reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Reason for Revocation <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="revoke-reason"
              rows={3}
              disabled={loading}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Payment chargeback, refunded purchase, policy violation, customer cancellation..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Required for the immutable audit trail (min 3 characters).
            </p>
          </div>

          {/* Explicit Confirmation Input */}
          <div>
            <label htmlFor="revoke-confirmation-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Type <span className="text-rose-400 font-mono font-bold">REVOKE</span> to Confirm
            </label>
            <input
              id="revoke-confirmation-input"
              type="text"
              disabled={loading}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type REVOKE"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              autoComplete="off"
            />
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
              variant="danger"
              size="sm"
              loading={loading}
              disabled={loading || !isConfirmed}
            >
              Revoke Pro Entitlement
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
