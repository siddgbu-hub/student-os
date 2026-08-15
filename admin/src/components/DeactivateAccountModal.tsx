import React, { useState, useEffect } from 'react';
import { X, UserX, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface DeactivateAccountModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const DeactivateAccountModal: React.FC<DeactivateAccountModalProps> = ({
  isOpen,
  accountId,
  studentName,
  studentEmail,
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

  const isConfirmed = confirmText.trim() === 'DEACTIVATE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !isConfirmed) return;

    if (reason && reason.trim().length > 500) {
      setError('Reason must not exceed 500 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminApiClient.deactivateAccount(accountId, reason.trim() || undefined);
      onSuccess(res.data?.message || `Account for ${studentEmail} deactivated successfully.`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have administrative permission to deactivate accounts.');
        } else if (err.status === 404) {
          setError('The student account could not be found.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to deactivate account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-slate-900 border border-red-900/60 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-red-950/20 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 id="deactivate-modal-title" className="text-base font-bold text-white tracking-tight">
                Deactivate Account?
              </h3>
              <p className="text-xs text-red-300/80 mt-0.5 font-medium">
                Suspend login access and revoke active sessions
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
              <span className="font-mono text-slate-300">{studentEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Account ID:</span>
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]">{accountId}</span>
            </div>
          </div>

          {/* Critical Impact Details */}
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>What happens upon deactivation:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-amber-200/80 text-[11px]">
              <li>Student login and access will be disabled immediately.</li>
              <li>All active sessions and registered device tokens will be revoked.</li>
              <li>Existing data (study history, planner tasks, notes, goals, payments, and subscriptions) remains safely retained.</li>
              <li>This action can be reversed at any time by an administrator.</li>
            </ul>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for Deactivation (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Student request, terms violation, or security investigation..."
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Explicit Confirmation Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Type <span className="font-mono text-red-400 font-bold">DEACTIVATE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DEACTIVATE"
              autoComplete="off"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Footer Actions */}
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
              variant="danger"
              size="sm"
              disabled={loading || !isConfirmed}
              className="text-xs font-semibold shadow-lg shadow-red-950/50"
            >
              {loading ? 'Deactivating...' : 'Deactivate Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
