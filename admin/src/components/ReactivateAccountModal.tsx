import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCheck, AlertCircle, ShieldCheck } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface ReactivateAccountModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ReactivateAccountModal: React.FC<ReactivateAccountModalProps> = ({
  isOpen,
  accountId,
  studentName,
  studentEmail,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
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

    if (reason && reason.trim().length > 500) {
      setError('Reason must not exceed 500 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminApiClient.reactivateAccount(accountId, reason.trim() || undefined);
      onSuccess(res.data?.message || `Account for ${studentEmail} reactivated successfully.`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have administrative permission to reactivate accounts.');
        } else if (err.status === 404) {
          setError('The student account could not be found.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to reactivate account.');
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
      aria-labelledby="reactivate-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-emerald-950/20 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reactivate-modal-title" className="text-base font-bold text-white tracking-tight">
                Reactivate Account?
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5 font-medium">
                Restore student account to active status
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Target Summary */}
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
              <span className="text-slate-400">Account ID:</span>
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]">{accountId}</span>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200/90 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Reactivation Process:</span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              Account status will be restored to <span className="font-semibold text-white">ACTIVE</span>. The student will be able to log in normally using email OTP or Google authentication. Old sessions are not automatically revived.
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for Reactivation (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Investigation concluded, account reinstated..."
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
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
              disabled={loading}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50"
            >
              {loading ? 'Reactivating...' : 'Reactivate Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
