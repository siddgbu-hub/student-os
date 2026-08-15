import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Button } from './ui/Button.js';

export interface ChangePlanModalProps {
  isOpen: boolean;
  accountId: string;
  studentName: string;
  studentEmail: string;
  currentPlanId: string;
  currentPlanName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  isOpen,
  accountId,
  studentName,
  studentEmail,
  currentPlanId,
  currentPlanName,
  onClose,
  onSuccess,
}) => {
  const initialNewPlan: 'monthly' | 'yearly' = currentPlanId === 'yearly' ? 'monthly' : 'yearly';
  const [newPlanId, setNewPlanId] = useState<'monthly' | 'yearly'>(initialNewPlan);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewPlanId(currentPlanId === 'yearly' ? 'monthly' : 'yearly');
      setReason('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen, currentPlanId]);

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

    if (newPlanId === currentPlanId) {
      setError('Selected plan is already the student\'s active plan.');
      return;
    }
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
      await adminApiClient.changePlan({
        accountId,
        newPlanId,
        reason: reason.trim(),
      });
      onSuccess(`Plan changed to ${newPlanId === 'yearly' ? 'Yearly Pro' : 'Monthly Pro'} successfully.`);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to modify subscription plans.');
        } else if (err.status === 404) {
          setError('The student account or target plan could not be found.');
        } else if (err.status === 409) {
          setError('Another subscription operation modified this account. Please refresh and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to change plan.');
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
      aria-labelledby="change-plan-modal-title"
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
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 id="change-plan-modal-title" className="text-base font-semibold text-white">
                Change Subscription Plan
              </h3>
              <p className="text-xs text-slate-400">Switch billing tier (Monthly ↔ Yearly)</p>
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
            </div>
            <div>
              <span className="text-slate-500 mr-1.5">Current Plan:</span>
              <span className="font-semibold text-white">{currentPlanName}</span>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">Immediate Plan Transition</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Changing the plan immediately supersedes the active subscription and starts the new billing tier according to server rules.
              </p>
            </div>
          </div>

          {/* New Plan Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select New Plan Tier
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading || currentPlanId === 'monthly'}
                onClick={() => setNewPlanId('monthly')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  newPlanId === 'monthly'
                    ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm'
                    : currentPlanId === 'monthly'
                    ? 'border-slate-800/50 bg-slate-950/30 text-slate-600 cursor-not-allowed'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>Monthly Pro</span>
                  {currentPlanId === 'monthly' && (
                    <span className="text-[10px] text-slate-500 uppercase font-mono">(Current)</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">30-day duration</div>
              </button>

              <button
                type="button"
                disabled={loading || currentPlanId === 'yearly'}
                onClick={() => setNewPlanId('yearly')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  newPlanId === 'yearly'
                    ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm'
                    : currentPlanId === 'yearly'
                    ? 'border-slate-800/50 bg-slate-950/30 text-slate-600 cursor-not-allowed'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>Yearly Pro</span>
                  {currentPlanId === 'yearly' && (
                    <span className="text-[10px] text-slate-500 uppercase font-mono">(Current)</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">365-day annual cycle</div>
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="change-plan-reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Administrative Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="change-plan-reason"
              rows={3}
              disabled={loading}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., User upgraded to annual plan offline, adjustment per customer request..."
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
              disabled={loading || newPlanId === currentPlanId}
            >
              Confirm Plan Switch
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
