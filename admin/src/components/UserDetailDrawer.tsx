import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Shield,
  CreditCard,
  History,
  Calendar,
  Clock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  CalendarPlus,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Monitor,
  Globe,
  HelpCircle,
} from 'lucide-react';
import type { AdminUserDetailDto } from '@student-os/shared';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { Badge } from './ui/Badge.js';
import { Button } from './ui/Button.js';
import { LoadingState } from './ui/LoadingState.js';
import { ErrorState } from './ui/ErrorState.js';
import { RecordPaymentModal } from './RecordPaymentModal.js';
import { ExtendSubscriptionModal } from './ExtendSubscriptionModal.js';
import { ChangePlanModal } from './ChangePlanModal.js';
import { RevokeSubscriptionModal } from './RevokeSubscriptionModal.js';
import { CancelRevokeModal } from './CancelRevokeModal.js';
import { DeactivateAccountModal } from './DeactivateAccountModal.js';
import { ReactivateAccountModal } from './ReactivateAccountModal.js';
import { RevokeAllSessionsModal } from './RevokeAllSessionsModal.js';
import { DeleteAccountModal } from './DeleteAccountModal.js';
import { UserX, UserCheck, LogOut, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';

export interface UserDetailDrawerProps {
  accountId: string | null;
  onClose: () => void;
  onDeleteSuccess?: (deletedAccountId: string, message: string) => void;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ accountId, onClose, onDeleteSuccess }) => {
  const [detail, setDetail] = useState<AdminUserDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refetchError, setRefetchError] = useState<string | null>(null);

  // Modal visibility states
  const [grantModalOpen, setGrantModalOpen] = useState<boolean>(false);
  const [extendModalOpen, setExtendModalOpen] = useState<boolean>(false);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState<boolean>(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState<boolean>(false);
  const [cancelRevokeModalOpen, setCancelRevokeModalOpen] = useState<boolean>(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState<boolean>(false);
  const [reactivateModalOpen, setReactivateModalOpen] = useState<boolean>(false);
  const [revokeSessionsModalOpen, setRevokeSessionsModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  const fetchDetail = useCallback(async (id: string, isPostMutation = false) => {
    if (!isPostMutation) {
      setLoading(true);
      setError(null);
    }
    setRefetchError(null);

    try {
      const res = await adminApiClient.get<{ data: AdminUserDetailDto }>(`/api/v1/admin/users/${id}`);
      setDetail(res.data);
    } catch (err: unknown) {
      if (isPostMutation) {
        setRefetchError('Subscription updated, but the latest student details could not be refreshed. Please retry.');
      } else {
        if (err instanceof AdminApiError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load student details.');
        }
      }
    } finally {
      if (!isPostMutation) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (accountId) {
      setSuccessMessage(null);
      setRefetchError(null);
      fetchDetail(accountId);
    } else {
      setDetail(null);
      setError(null);
      setSuccessMessage(null);
      setRefetchError(null);
      setGrantModalOpen(false);
      setExtendModalOpen(false);
      setChangePlanModalOpen(false);
      setRevokeModalOpen(false);
      setCancelRevokeModalOpen(false);
      setDeactivateModalOpen(false);
      setReactivateModalOpen(false);
      setRevokeSessionsModalOpen(false);
      setDeleteModalOpen(false);
    }
  }, [accountId, fetchDetail]);

  // Keyboard accessibility: ESC to close drawer when no modals are open
  const isAnyModalOpen =
    grantModalOpen ||
    extendModalOpen ||
    changePlanModalOpen ||
    revokeModalOpen ||
    cancelRevokeModalOpen ||
    deactivateModalOpen ||
    reactivateModalOpen ||
    revokeSessionsModalOpen ||
    deleteModalOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && accountId && !isAnyModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    accountId,
    onClose,
    isAnyModalOpen,
  ]);

  if (!accountId) return null;

  const handleMutationSuccess = (message: string) => {
    setSuccessMessage(message);
    // Refetch latest authoritative state from backend
    fetchDetail(accountId, true);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatCurrency = (amountPaise: number) => {
    if (amountPaise === 0) return 'Complimentary / ₹0.00';
    return `₹${(amountPaise / 100).toFixed(2)}`;
  };

  const getEntitlementBadge = () => {
    if (!detail?.entitlement) {
      return <Badge variant="neutral">No Entitlement</Badge>;
    }
    const { status, isPaid } = detail.entitlement;
    if (status === 'revoked') {
      return <Badge variant="danger">REVOKED</Badge>;
    }
    if (status === 'expired') {
      return <Badge variant="warning">EXPIRED</Badge>;
    }
    if (status === 'active') {
      return isPaid ? <Badge variant="pro">PRO ACTIVE</Badge> : <Badge variant="trial">TRIAL ACTIVE</Badge>;
    }
    return <Badge variant="neutral">{String(status).toUpperCase()}</Badge>;
  };

  const studentName = detail?.profile?.fullName || detail?.account?.email || 'Student';
  const studentEmail = detail?.account?.email || '';
  const currentStatus = detail?.entitlement?.status || 'inactive';
  const currentPlanId = detail?.entitlement?.currentPlanId || 'free_trial';
  const currentPlanName = detail?.entitlement?.planName || currentPlanId;
  const currentExpiresAt = detail?.entitlement?.expiresAt || null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop — hidden when a mutation modal is layered on top (avoids double-dim) */}
      {!isAnyModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/80">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              {detail?.profile?.fullName ? detail.profile.fullName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="drawer-title" className="text-lg font-bold text-white tracking-tight">
                  {studentName}
                </h2>
                {detail?.account?.status === 'suspended' && (
                  <Badge variant="danger">SUSPENDED</Badge>
                )}
                {getEntitlementBadge()}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                <Mail className="w-3 h-3 text-slate-500" />
                {studentEmail || 'Loading...'}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                  ID: {detail?.account?.accountId || accountId}
                </span>
                <span>Registered: {formatDate(detail?.account?.createdAt)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                aria-label="Dismiss success message"
                className="text-emerald-400 hover:text-emerald-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Refetch Error Banner */}
          {refetchError && (
            <div className="flex items-center justify-between p-3.5 bg-amber-950/50 border border-amber-800/80 rounded-xl text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{refetchError}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchDetail(accountId)}
                className="text-xs"
              >
                Retry
              </Button>
            </div>
          )}

          {loading && (
            <div className="py-20">
              <LoadingState message="Loading student profile, entitlement, and ledger audit..." />
            </div>
          )}

          {error && (
            <div className="py-10">
              <ErrorState
                title="Failed to load student details"
                message={error}
                onRetry={() => fetchDetail(accountId)}
              />
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {/* SECTION 1: CURRENT ENTITLEMENT */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Current Entitlement Status</h3>
                  </div>
                  {getEntitlementBadge()}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-semibold">Plan</span>
                    <span className="text-slate-200 font-medium text-sm mt-0.5 block">
                      {detail.entitlement?.planName || detail.entitlement?.currentPlanId || 'Free Trial'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-semibold">Access Tier</span>
                    <span className="text-slate-200 font-medium text-sm mt-0.5 block">
                      {detail.entitlement?.isPaid ? 'Paid Subscriber' : 'Trial Access'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-semibold">Expiry Date</span>
                    <span className="text-slate-200 font-medium text-sm mt-0.5 block">
                      {detail.entitlement?.expiresAt ? formatDate(detail.entitlement.expiresAt) : 'Lifetime / None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-semibold">Status</span>
                    <span className="text-slate-200 font-medium text-sm mt-0.5 block capitalize">
                      {detail.entitlement?.status || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: FUNCTIONAL SUBSCRIPTION MUTATION ACTIONS */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">Subscription Management Actions</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">SOCC Operations</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setGrantModalOpen(true)}
                    className="w-full justify-center text-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Grant Pro
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setExtendModalOpen(true)}
                    className="w-full justify-center text-xs cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                    Extend
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setChangePlanModalOpen(true)}
                    className="w-full justify-center text-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Change Plan
                  </Button>
                  {detail.entitlement?.status === 'revoked' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setCancelRevokeModalOpen(true)}
                      className="w-full justify-center text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-950/80"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Cancel Revoke
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setRevokeModalOpen(true)}
                      className="w-full justify-center text-xs cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              </div>

              {/* SECTION 3: SUBSCRIPTION HISTORY */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Subscription History</h3>
                  <span className="text-xs text-slate-400 ml-auto">
                    {detail.subscriptions?.length || 0} Records
                  </span>
                </div>

                {(!detail.subscriptions || detail.subscriptions.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">No subscription history recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.subscriptions.map((sub) => {
                      const isQueued = sub.status === 'active' && sub.startDate && new Date(sub.startDate).getTime() > Date.now();
                      return (
                        <div
                          key={sub.subscriptionId}
                          className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 font-medium text-slate-200">
                              <span>Plan: {sub.planName || (
                                sub.planId === 'monthly' ? 'Monthly Pro' :
                                sub.planId === 'yearly' ? 'Yearly Pro' :
                                sub.planId === 'free_trial' ? 'Free Trial' :
                                sub.planId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                              )}</span>
                              <span className="text-slate-400">•</span>
                              <span className="capitalize text-slate-300">{sub.status}</span>
                              {isQueued && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Queued Stack
                                </span>
                              )}
                              <span className="text-slate-400">•</span>
                              <span className="text-[11px] text-slate-400">Source: {sub.source}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {formatDate(sub.startDate)} → {formatDate(sub.expiryDate)}
                            </p>
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono sm:text-right">
                            Granted: {sub.grantedBy ? `${sub.grantedBy.substring(0, 8)}...` : 'System'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 4: PAYMENT HISTORY */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Payment Ledger</h3>
                  <span className="text-xs text-slate-400 ml-auto">
                    {detail.payments?.length || 0} Transactions
                  </span>
                </div>

                {(!detail.payments || detail.payments.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">No payment history.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.payments.map((pmt) => (
                      <div
                        key={pmt.paymentId}
                        className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-emerald-400 text-sm">
                              {formatCurrency(pmt.amountPaise)}
                            </span>
                            {pmt.discountPercent && pmt.discountPercent > 0 ? (
                              <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1 py-0.2 rounded font-semibold">
                                {pmt.discountPercent}% OFF
                              </span>
                            ) : null}
                            <Badge variant={pmt.status === 'captured' ? 'success' : 'neutral'} size="sm">
                              {String(pmt.status).toUpperCase()}
                            </Badge>
                            <span className="text-slate-400 capitalize">• {pmt.paymentMethod}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-1">
                            Ref / UTR: {pmt.transactionReference || '—'}
                          </p>
                        </div>
                        <div className="text-[11px] text-slate-300 sm:text-right">
                          <span>{formatDate(pmt.createdAt)}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Recorded: {pmt.recordedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 5: DEVICES */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Devices</h3>
                  <span className="text-xs text-slate-400 ml-auto">
                    {detail.devices?.length || 0} Registered
                  </span>
                </div>

                {(!detail.devices || detail.devices.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">No device activity recorded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.devices.map((device) => {
                      const isRevoked = !!device.revokedAt;
                      const isActive = device.isActive && !isRevoked;
                      const PlatformIcon =
                        device.platform === 'android' ? Smartphone
                        : device.platform === 'web' ? Globe
                        : device.platform === 'admin' ? Monitor
                        : HelpCircle;
                      const platformLabel =
                        device.platform === 'android' ? 'Android'
                        : device.platform === 'web' ? 'Web'
                        : device.platform === 'admin' ? 'Admin Console'
                        : 'Unknown';
                      return (
                        <div
                          key={device.deviceId}
                          className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <PlatformIcon className={`w-4 h-4 flex-shrink-0 ${
                                device.platform === 'android' ? 'text-emerald-400'
                                : device.platform === 'web' ? 'text-blue-400'
                                : device.platform === 'admin' ? 'text-amber-400'
                                : 'text-slate-400'
                              }`} />
                              <div>
                                <span className="font-semibold text-slate-200">
                                  {device.deviceModel || platformLabel}
                                </span>
                                {device.osVersion && (
                                  <span className="text-slate-400 ml-1.5">({device.osVersion})</span>
                                )}
                              </div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                              isActive
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                            }`}>
                              {isActive ? 'Active' : isRevoked ? 'Revoked' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-400">
                            <span>Platform: <span className="text-slate-200">{platformLabel}</span></span>
                            <span className="font-mono truncate text-slate-300" title={device.deviceId}>ID: {device.deviceId}</span>
                            <span>First seen: <span className="text-slate-200">{formatDate(device.registeredAt)}</span></span>
                            <span>Last active: <span className="text-slate-200">{formatDate(device.lastActiveAt)}</span></span>
                            {device.expiresAt && (
                              <span>Session expires: <span className="text-slate-200">{formatDate(device.expiresAt)}</span></span>
                            )}
                            {device.revokedAt && (
                              <span className="text-rose-400 font-semibold">Revoked: {formatDate(device.revokedAt)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 6: AUDIT HISTORY */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Administrative Audit Log</h3>
                  <span className="text-xs text-slate-400 ml-auto">
                    {detail.auditLogs?.length || 0} Events
                  </span>
                </div>

                {(!detail.auditLogs || detail.auditLogs.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">No administrative activity recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-400 font-mono text-[11px]">
                            {log.eventType}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDate(log.createdAt)}</span>
                        </div>
                        <p className="text-slate-200 mt-1">
                          Reason:{' '}
                          {log.details && typeof log.details === 'object' && 'reason' in log.details
                            ? String(log.details.reason)
                            : 'Manual Administrative Action'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                          <span>Actor: {log.grantedBy || 'System'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 7: DANGER ZONE & ACCOUNT LIFECYCLE */}
              <div className="bg-slate-950 border border-red-950/70 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-semibold text-white">Danger Zone</h3>
                  </div>
                  <span className="text-[11px] text-red-400/80 font-medium">Account Lifecycle</span>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-slate-400 text-xs">
                    Administrative lifecycle actions for this student. Deactivation revokes active sessions and disables sign-in while safely preserving all historical data.
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setRevokeSessionsModalOpen(true)}
                      className="text-xs border-amber-800/50 hover:bg-amber-950/30 text-amber-300 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      Revoke All Sessions
                    </Button>

                    {detail.account?.status === 'suspended' ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setReactivateModalOpen(true)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                        Reactivate Account
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setDeactivateModalOpen(true)}
                        className="text-xs bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1.5" />
                        Deactivate Account
                      </Button>
                    )}

                    {detail.adminRole ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Privileged {detail.adminRole.role.toUpperCase()} account — permanent deletion is disabled.</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteModalOpen(true)}
                        className="text-xs bg-red-800 hover:bg-red-700 text-white border border-red-600/60 shadow-lg shadow-red-950/80 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete Account Permanently
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RECORD PAYMENT / GRANT PRO MODAL */}
      <RecordPaymentModal
        isOpen={grantModalOpen}
        initialAccountId={accountId || undefined}
        initialStudentName={studentName}
        initialStudentEmail={studentEmail}
        currentPlanName={currentPlanName}
        currentExpiresAt={currentExpiresAt}
        onClose={() => setGrantModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <ExtendSubscriptionModal
        isOpen={extendModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        currentPlanName={currentPlanName}
        currentExpiresAt={currentExpiresAt}
        onClose={() => setExtendModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <ChangePlanModal
        isOpen={changePlanModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        currentPlanId={currentPlanId}
        currentPlanName={currentPlanName}
        onClose={() => setChangePlanModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <RevokeSubscriptionModal
        isOpen={revokeModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        currentPlanName={currentPlanName}
        currentStatus={currentStatus}
        currentExpiresAt={currentExpiresAt}
        onClose={() => setRevokeModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <CancelRevokeModal
        isOpen={cancelRevokeModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        originalPlanName={
          detail?.subscriptions?.filter((s) => s.status === 'revoked')
            .sort((a, b) => new Date(b.expiryDate || 0).getTime() - new Date(a.expiryDate || 0).getTime())[0]?.planName ||
          detail?.entitlement?.planName ||
          currentPlanName
        }
        originalExpiryDate={
          detail?.subscriptions?.filter((s) => s.status === 'revoked')
            .sort((a, b) => new Date(b.expiryDate || 0).getTime() - new Date(a.expiryDate || 0).getTime())[0]?.expiryDate ||
          detail?.entitlement?.expiresAt ||
          null
        }
        onClose={() => setCancelRevokeModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      {/* ACCOUNT LIFECYCLE MODALS */}
      <DeactivateAccountModal
        isOpen={deactivateModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        onClose={() => setDeactivateModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <ReactivateAccountModal
        isOpen={reactivateModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        onClose={() => setReactivateModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <RevokeAllSessionsModal
        isOpen={revokeSessionsModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        onClose={() => setRevokeSessionsModalOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={(id, msg) => {
          if (onDeleteSuccess) {
            onDeleteSuccess(id, msg);
          } else {
            onClose();
          }
        }}
      />
    </div>
  );
};
