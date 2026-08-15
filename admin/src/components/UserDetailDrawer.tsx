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
import { GrantSubscriptionModal } from './GrantSubscriptionModal.js';
import { ExtendSubscriptionModal } from './ExtendSubscriptionModal.js';
import { ChangePlanModal } from './ChangePlanModal.js';
import { RevokeSubscriptionModal } from './RevokeSubscriptionModal.js';

export interface UserDetailDrawerProps {
  accountId: string | null;
  onClose: () => void;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ accountId, onClose }) => {
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
    }
  }, [accountId, fetchDetail]);

  // Keyboard accessibility: ESC to close drawer when no modals are open
  useEffect(() => {
    const isAnyModalOpen = grantModalOpen || extendModalOpen || changePlanModalOpen || revokeModalOpen;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && accountId && !isAnyModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accountId, onClose, grantModalOpen, extendModalOpen, changePlanModalOpen, revokeModalOpen]);

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

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
                {getEntitlementBadge()}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                <Mail className="w-3 h-3 text-slate-500" />
                {studentEmail || 'Loading...'}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  ID: {detail?.account?.accountId || accountId}
                </span>
                <span>Registered: {formatDate(detail?.account?.createdAt)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">Plan</span>
                    <span className="text-slate-200 font-medium text-sm mt-0.5 block">
                      {detail.entitlement?.planName || detail.entitlement?.currentPlanId || 'Free Trial'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">Access Tier</span>
                    <span className="text-slate-200 font-medium text-sm mt-0.5 block">
                      {detail.entitlement?.isPaid ? 'Paid Subscriber' : 'Trial Access'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">Expiry Date</span>
                    <span className="text-slate-200 font-medium text-sm mt-0.5 block">
                      {detail.entitlement?.expiresAt ? formatDate(detail.entitlement.expiresAt) : 'Lifetime / None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-semibold">Status</span>
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
                    variant="primary"
                    size="sm"
                    onClick={() => setGrantModalOpen(true)}
                    className="w-full justify-center text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Grant Pro
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setExtendModalOpen(true)}
                    className="w-full justify-center text-xs"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                    Extend
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setChangePlanModalOpen(true)}
                    className="w-full justify-center text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Change Plan
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRevokeModalOpen(true)}
                    className="w-full justify-center text-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                    Revoke
                  </Button>
                </div>
              </div>

              {/* SECTION 3: SUBSCRIPTION HISTORY */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Subscription History</h3>
                  <span className="text-xs text-slate-500 ml-auto">
                    {detail.subscriptions?.length || 0} Records
                  </span>
                </div>

                {(!detail.subscriptions || detail.subscriptions.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center">No subscription history recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.subscriptions.map((sub) => (
                      <div
                        key={sub.subscriptionId}
                        className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2 font-medium text-slate-200">
                            <span>Plan: {sub.planId.toUpperCase()}</span>
                            <span className="text-slate-500">•</span>
                            <span className="capitalize text-slate-400">{sub.status}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-[11px] text-slate-400">Source: {sub.source}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {formatDate(sub.startDate)} → {formatDate(sub.expiryDate)}
                          </p>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono sm:text-right">
                          Granted: {sub.grantedBy ? `${sub.grantedBy.substring(0, 8)}...` : 'System'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: PAYMENT HISTORY */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Payment Ledger</h3>
                  <span className="text-xs text-slate-500 ml-auto">
                    {detail.payments?.length || 0} Transactions
                  </span>
                </div>

                {(!detail.payments || detail.payments.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center">No payment history.</p>
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
                          <p className="text-[11px] text-slate-500 font-mono mt-1">
                            Ref / UTR: {pmt.transactionReference || '—'}
                          </p>
                        </div>
                        <div className="text-[11px] text-slate-400 sm:text-right">
                          <span>{formatDate(pmt.createdAt)}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Recorded: {pmt.recordedBy}</p>
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
                  <span className="text-xs text-slate-500 ml-auto">
                    {detail.devices?.length || 0} Registered
                  </span>
                </div>

                {(!detail.devices || detail.devices.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center">No device activity recorded yet.</p>
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
                                : 'text-slate-500'
                              }`} />
                              <div>
                                <span className="font-semibold text-slate-200">
                                  {device.deviceModel || platformLabel}
                                </span>
                                {device.osVersion && (
                                  <span className="text-slate-500 ml-1.5">({device.osVersion})</span>
                                )}
                              </div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                              isActive
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : 'bg-slate-800/80 text-slate-500 border border-slate-700'
                            }`}>
                              {isActive ? 'Active' : isRevoked ? 'Revoked' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            <span>Platform: <span className="text-slate-400">{platformLabel}</span></span>
                            <span className="font-mono truncate" title={device.deviceId}>ID: {device.deviceId}</span>
                            <span>First seen: <span className="text-slate-400">{formatDate(device.registeredAt)}</span></span>
                            <span>Last active: <span className="text-slate-400">{formatDate(device.lastActiveAt)}</span></span>
                            {device.expiresAt && (
                              <span>Session expires: <span className="text-slate-400">{formatDate(device.expiresAt)}</span></span>
                            )}
                            {device.revokedAt && (
                              <span className="text-red-400/80">Revoked: {formatDate(device.revokedAt)}</span>
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
                  <span className="text-xs text-slate-500 ml-auto">
                    {detail.auditLogs?.length || 0} Events
                  </span>
                </div>

                {(!detail.auditLogs || detail.auditLogs.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center">No administrative activity recorded.</p>
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
                          <span className="text-[11px] text-slate-500">{formatDate(log.createdAt)}</span>
                        </div>
                        <p className="text-slate-300 mt-1">
                          Reason:{' '}
                          {log.details && typeof log.details === 'object' && 'reason' in log.details
                            ? String(log.details.reason)
                            : 'Manual Administrative Action'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 font-mono">
                          <span>Actor: {log.grantedBy || 'System'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* PHASE 6 MUTATION MODALS */}
      <GrantSubscriptionModal
        isOpen={grantModalOpen}
        accountId={accountId}
        studentName={studentName}
        studentEmail={studentEmail}
        currentStatus={currentStatus}
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
    </div>
  );
};
