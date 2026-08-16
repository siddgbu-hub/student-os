import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LogOut, AlertCircle, AlertTriangle } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface RevokeAllSessionsModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RevokeAllSessionsModal: React.FC<RevokeAllSessionsModalProps> = ({
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
      const res = await adminApiClient.revokeAllSessions(accountId, reason.trim() || undefined);
      onSuccess(res.data?.message || `All active sessions for ${studentEmail} have been revoked.`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have administrative permission to revoke sessions.');
        } else if (err.status === 404) {
          setError('The student account could not be found.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to revoke sessions.');
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
      aria-labelledby="revoke-sessions-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-800/60 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-amber-950/20 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 id="revoke-sessions-modal-title" className="text-base font-bold text-white tracking-tight">
                Revoke All Sessions?
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5 font-medium">
                Log out student from all active devices
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
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Session Invalidation:</span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              All active device sessions and JWT tokens for this account will be invalidated immediately. The student's account status and entitlements remain unchanged.
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for Session Revocation (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Security device reset, lost phone, suspicious activity..."
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
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
              variant="secondary"
              size="sm"
              disabled={loading}
              className="text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-lg"
            >
              {loading ? 'Revoking...' : 'Revoke All Sessions'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
