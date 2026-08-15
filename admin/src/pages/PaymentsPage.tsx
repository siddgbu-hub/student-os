import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  X,
  Smartphone,
  Building2,
  Banknote,
  Gift,
  DollarSign,
} from 'lucide-react';
import type { PaymentDto, PaginationMeta, PaymentMethod, PaymentStatus } from '@student-os/shared';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { RecordPaymentModal } from '../components/RecordPaymentModal.js';

type TabStatus = 'all' | PaymentStatus;
type MethodFilter = 'all' | PaymentMethod;

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [selectedStatus, setSelectedStatus] = useState<TabStatus>('all');
  const [selectedMethod, setSelectedMethod] = useState<MethodFilter>('all');
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal visibility state
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, string | number | undefined> = {
        page,
        limit: 20,
      };

      if (selectedStatus !== 'all') {
        queryParams.status = selectedStatus;
      }

      if (selectedMethod !== 'all') {
        queryParams.method = selectedMethod;
      }

      const res = await adminApiClient.getPayments(queryParams);
      setPayments(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load payments ledger.');
      }
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedMethod]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleStatusChange = (status: TabStatus) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMethod(e.target.value as MethodFilter);
    setPage(1);
  };

  const handleRecordSuccess = (message: string) => {
    setSuccessMessage(message);
    setPage(1);
    fetchPayments();
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
    if (amountPaise === 0) return '₹0.00';
    return `₹${(amountPaise / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'captured':
        return <Badge variant="success">CAPTURED</Badge>;
      case 'pending':
        return <Badge variant="warning">PENDING</Badge>;
      case 'failed':
        return <Badge variant="danger">FAILED</Badge>;
      case 'refunded':
        return <Badge variant="neutral">REFUNDED</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Smartphone className="w-3 h-3" /> UPI
          </span>
        );
      case 'bank_transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <Building2 className="w-3 h-3" /> Bank Transfer
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Banknote className="w-3 h-3" /> Cash
          </span>
        );
      case 'complimentary':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Gift className="w-3 h-3" /> Complimentary
          </span>
        );
      case 'razorpay':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            <CreditCard className="w-3 h-3" /> Razorpay
          </span>
        );
      default:
        return <span className="text-slate-400 capitalize">{method}</span>;
    }
  };

  const isFiltering = selectedStatus !== 'all' || selectedMethod !== 'all';

  return (
    <div>
      <PageHeader
        title="Payments Ledger"
        description="View all recorded offline and gateway transactions. Record manual UPI, bank transfer, and cash payments with instant subscription activation."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setRecordModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        }
      />

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center justify-between p-3.5 mb-6 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs shadow-sm">
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

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Status Filter Tabs */}
        <div className="filter-tabs-container">
          <button
            onClick={() => handleStatusChange('all')}
            className={`filter-tab-btn ${selectedStatus === 'all' ? 'active' : ''}`}
          >
            All Statuses
          </button>
          <button
            onClick={() => handleStatusChange('captured')}
            className={`filter-tab-btn ${selectedStatus === 'captured' ? 'active' : ''}`}
          >
            Captured
          </button>
          <button
            onClick={() => handleStatusChange('pending')}
            className={`filter-tab-btn ${selectedStatus === 'pending' ? 'active' : ''}`}
          >
            Pending
          </button>
          <button
            onClick={() => handleStatusChange('failed')}
            className={`filter-tab-btn ${selectedStatus === 'failed' ? 'active' : ''}`}
          >
            Failed
          </button>
          <button
            onClick={() => handleStatusChange('refunded')}
            className={`filter-tab-btn ${selectedStatus === 'refunded' ? 'active' : ''}`}
          >
            Refunded
          </button>
        </div>

        {/* Method Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="method-filter-select" className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Method:
          </label>
          <select
            id="method-filter-select"
            value={selectedMethod}
            onChange={handleMethodChange}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Methods</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="complimentary">Complimentary</option>
            <option value="razorpay">Razorpay</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Content */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-16">
          <LoadingState message="Fetching payments ledger..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load payments ledger"
          message={error}
          onRetry={fetchPayments}
        />
      ) : payments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12">
          {isFiltering ? (
            <EmptyState
              icon={Filter}
              title="No matching payments"
              description="No payment records match your status or method filters. Try switching filters or resetting them."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedMethod('all');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No payment records found"
              description="There are currently no recorded payments in the ledger. Record offline UPI, cash, or bank transfers using the button above."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setRecordModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Record First Payment
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <>
          {/* Payments Table */}
          <div className="table-container shadow-sm">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Reference / UTR</th>
                  <th>Recorded By</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.paymentId} className="hover:bg-slate-800/40 transition-colors">
                    <td>
                      <div>
                        <div className="font-semibold text-slate-100">
                          {payment.studentName || payment.studentEmail || payment.accountId}
                        </div>
                        {payment.studentEmail && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {payment.studentEmail}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        {payment.discountPercent && payment.discountPercent > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-400 font-mono">
                                {formatCurrency(payment.amountPaise)}
                              </span>
                              <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1 py-0.2 rounded font-semibold">
                                {payment.discountPercent}% OFF
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 line-through font-mono">
                              {formatCurrency(payment.originalAmountPaise || (payment.amountPaise + (payment.discountAmountPaise || 0)))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-emerald-400 font-mono">
                              {formatCurrency(payment.amountPaise)}
                            </span>
                            <span className="text-[10px] text-slate-400 block uppercase font-mono">
                              {payment.currency}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>{getMethodBadge(payment.paymentMethod)}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                    <td>
                      <span className="font-mono text-xs text-slate-300">
                        {payment.transactionReference || <span className="text-slate-400 italic">None</span>}
                      </span>
                      {payment.notes && (
                        <p className="text-[11px] text-slate-300 italic mt-0.5 max-w-xs truncate" title={payment.notes}>
                          {payment.notes}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-300">
                        {payment.recordedBy ? `${payment.recordedBy.substring(0, 8)}...` : 'System'}
                      </span>
                      <span className="text-[10px] text-slate-400 block capitalize">
                        {payment.source === 'manual_admin' ? 'Manual Admin' : payment.source}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-300">
                        {formatDate(payment.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 px-2 text-xs text-slate-400">
            <div>
              Showing {payments.length} of {pagination.total} payments • Page {pagination.page} of {pagination.totalPages}
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

      {/* Manual Payment Recording Modal */}
      <RecordPaymentModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSuccess={handleRecordSuccess}
      />
    </div>
  );
};
