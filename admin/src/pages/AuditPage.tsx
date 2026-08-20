import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Calendar,
  AlertOctagon,
  ArrowRightLeft,
  User,
  Info,
  X,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import type { EntitlementAuditLogDto, PaginationMeta } from '@student-os/shared';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { EmptyState } from '../components/ui/EmptyState.js';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<EntitlementAuditLogDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [accountIdInput, setAccountIdInput] = useState<string>('');
  const [activeAccountIdFilter, setActiveAccountIdFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState<EntitlementAuditLogDto | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, string | number | undefined> = {
        page,
        limit: 25,
      };

      if (selectedEventType !== 'all') {
        queryParams.eventType = selectedEventType;
      }

      if (activeAccountIdFilter.trim()) {
        queryParams.accountId = activeAccountIdFilter.trim();
      }

      const res = await adminApiClient.getAuditLogs(queryParams);
      setLogs(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to view audit logs.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load audit trail.');
      }
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedEventType, activeAccountIdFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Handle ESC key to close Details Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedLog) {
        setSelectedLog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLog]);

  const handleEventTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventType(e.target.value);
    setPage(1);
  };

  const handleAccountIdFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveAccountIdFilter(accountIdInput.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedEventType('all');
    setAccountIdInput('');
    setActiveAccountIdFilter('');
    setPage(1);
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
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

  const renderEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'ENTITLEMENT_MANUALLY_GRANTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" /> Grant Pro
          </span>
        );
      case 'ENTITLEMENT_EXTENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Calendar className="w-3 h-3" /> Extended
          </span>
        );
      case 'ENTITLEMENT_PLAN_CHANGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ArrowRightLeft className="w-3 h-3" /> Plan Changed
          </span>
        );
      case 'ENTITLEMENT_REVOKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertOctagon className="w-3 h-3" /> Revoked
          </span>
        );
      case 'FREE_TRIAL_STARTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Clock className="w-3 h-3" /> Free Trial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {eventType.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const isFiltering = selectedEventType !== 'all' || activeAccountIdFilter.length > 0;

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Immutable administrative activity and operator provenance. Administrative actions are recorded server-side for accountability and traceability."
      />

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="event-type-filter" className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Event Action:
            </label>
            <select
              id="event-type-filter"
              value={selectedEventType}
              onChange={handleEventTypeChange}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Events</option>
              <option value="ENTITLEMENT_MANUALLY_GRANTED">Grant Pro (ENTITLEMENT_MANUALLY_GRANTED)</option>
              <option value="ENTITLEMENT_EXTENDED">Extend (ENTITLEMENT_EXTENDED)</option>
              <option value="ENTITLEMENT_PLAN_CHANGED">Change Plan (ENTITLEMENT_PLAN_CHANGED)</option>
              <option value="ENTITLEMENT_REVOKED">Revoke (ENTITLEMENT_REVOKED)</option>
              <option value="FREE_TRIAL_STARTED">Free Trial (FREE_TRIAL_STARTED)</option>
            </select>
          </div>

          {/* Account ID Filter */}
          <form onSubmit={handleAccountIdFilterSubmit} className="flex items-center gap-2">
            <label htmlFor="account-id-filter" className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Account ID:
            </label>
            <div className="relative">
              <input
                id="account-id-filter"
                type="text"
                value={accountIdInput}
                onChange={(e) => setAccountIdInput(e.target.value)}
                placeholder="Paste full UUID account ID..."
                title="Enter the exact UUID account ID to filter by"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              <Search className="w-3.5 h-3.5 mr-1" /> Filter
            </Button>
          </form>
        </div>

        {isFiltering && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs text-slate-400 hover:text-white self-end md:self-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16">
          <LoadingState message="Fetching audit trail records..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load audit trail"
          message={error}
          onRetry={fetchAuditLogs}
        />
      ) : logs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12">
          {isFiltering ? (
            <EmptyState
              icon={Filter}
              title="No matching audit logs"
              description="No audit records match your selected event action or account ID filters."
              action={
                <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No audit records found"
              description="There are currently no administrative audit records logged in the database."
            />
          )}
        </div>
      ) : (
        <>
          {/* Audit Table */}
          <div className="table-container shadow-sm">
            <table>
              <thead>
                <tr>
                  <th>Event / Action</th>
                  <th>Target Account</th>
                  <th>Plan & Horizon</th>
                  <th>Actor / Source</th>
                  <th>Reason / Details</th>
                  <th>Timestamp</th>
                  <th>Inspection</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const reason =
                    (log.details?.reason as string) ||
                    (log.details?.notes as string) ||
                    null;

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td>{renderEventBadge(log.eventType)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-200" title={log.accountId}>
                            {log.accountId.substring(0, 8)}...{log.accountId.substring(log.accountId.length - 4)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(log.accountId, `row-${log.id}`)}
                            className="text-slate-400 hover:text-white p-0.5"
                            title="Copy Account ID"
                          >
                            {copiedField === `row-${log.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-200 capitalize font-medium">
                          {log.planId}
                        </span>
                        {log.expiryDate && (
                          <span className="text-[11px] text-slate-400 block">
                            Exp: {formatDate(log.expiryDate).split(',')[0]}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-300">
                          {log.grantedBy ? (log.grantedBy === 'system' ? 'System' : `${log.grantedBy.substring(0, 8)}...`) : 'System'}
                        </span>
                        <span className="text-[10px] text-slate-400 block capitalize">
                          {log.source ? log.source.replace(/_/g, ' ') : 'manual admin'}
                        </span>
                      </td>
                      <td>
                        <div className="max-w-xs text-xs text-slate-300">
                          {reason ? (
                            <span className="truncate block" title={reason}>
                              {reason}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No notes provided</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-300 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="text-xs py-1 px-2.5 h-auto"
                        >
                          <Info className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 px-2 text-xs text-slate-400">
            <div>
              Showing {logs.length} of {pagination.total} events • Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* METADATA INSPECTION DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="audit-detail-title" className="text-base font-semibold text-white">
                    Audit Record Inspection
                  </h3>
                  <p className="text-xs text-slate-400">
                    Immutable event provenance record
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details List */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-medium">Audit Record ID</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-200">{selectedLog.id}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedLog.id, 'id')}
                    className="text-slate-400 hover:text-white p-1"
                    title="Copy ID"
                  >
                    {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-medium">Target Account ID</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-200">{selectedLog.accountId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedLog.accountId, 'accountId')}
                    className="text-slate-400 hover:text-white p-1"
                    title="Copy Account ID"
                  >
                    {copiedField === 'accountId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-medium">Event Action</span>
                <div>{renderEventBadge(selectedLog.eventType)}</div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-medium">Plan Tier & Source</span>
                <span className="text-slate-200 font-mono capitalize">
                  {selectedLog.planId} ({selectedLog.source})
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-medium">Granted By (Operator)</span>
                <span className="text-slate-200 font-mono">{selectedLog.grantedBy}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-medium">Timestamp</span>
                <span className="text-slate-200">{formatDate(selectedLog.createdAt)}</span>
              </div>

              {/* Metadata Details Object */}
              <div className="space-y-1.5 pt-1">
                <span className="text-slate-400 font-medium block">Structured Payload Details</span>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
                  {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : 'No additional structured metadata.'}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
