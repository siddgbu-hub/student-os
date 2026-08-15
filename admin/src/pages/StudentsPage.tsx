import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
} from 'lucide-react';
import type { AdminUserSummaryDto, PaginationMeta, UserStatusFilter } from '@student-os/shared';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { UserDetailDrawer } from '../components/UserDetailDrawer.js';

type TabStatus = 'all' | UserStatusFilter;

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<AdminUserSummaryDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<TabStatus>('all');
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer selection
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Search debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, string | number | undefined> = {
        page,
        limit: 20,
      };

      if (debouncedQuery.trim()) {
        queryParams.query = debouncedQuery.trim();
      }

      if (selectedStatus !== 'all') {
        queryParams.status = selectedStatus;
      }

      const res = await adminApiClient.get<{
        data: AdminUserSummaryDto[];
        pagination: PaginationMeta;
      }>('/api/v1/admin/users', queryParams);

      setStudents(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load students list.');
      }
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, selectedStatus]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleStatusChange = (status: TabStatus) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (student: AdminUserSummaryDto) => {
    const { entitlementStatus, isPaid } = student;
    if (entitlementStatus === 'revoked') {
      return <Badge variant="danger">REVOKED</Badge>;
    }
    if (entitlementStatus === 'expired') {
      return <Badge variant="warning">EXPIRED</Badge>;
    }
    if (entitlementStatus === 'active') {
      return isPaid ? <Badge variant="pro">PRO</Badge> : <Badge variant="trial">TRIAL</Badge>;
    }
    return <Badge variant="neutral">{entitlementStatus.toUpperCase()}</Badge>;
  };

  const getPlanLabel = (planId?: string) => {
    if (!planId || planId === 'free_trial') return 'Free Trial';
    if (planId === 'monthly') return 'Monthly Pro';
    if (planId === 'yearly') return 'Yearly Pro';
    return planId;
  };

  const getDaysRemainingDisplay = (student: AdminUserSummaryDto) => {
    if (student.entitlementStatus === 'revoked') return '—';
    if (student.entitlementStatus === 'expired') return <span className="text-amber-400">Expired</span>;
    if (student.daysRemaining !== null && student.daysRemaining !== undefined) {
      return (
        <span className={student.daysRemaining <= 7 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
          {student.daysRemaining} {student.daysRemaining === 1 ? 'day' : 'days'}
        </span>
      );
    }
    return '—';
  };

  const isFiltering = debouncedQuery.trim().length > 0 || selectedStatus !== 'all';

  return (
    <div>
      <PageHeader
        title="Students"
        description="Search and manage Student OS accounts."
      />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="student-search-input"
            aria-label="Search students"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or account ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="filter-tabs-container">
          <button
            onClick={() => handleStatusChange('all')}
            className={`filter-tab-btn ${selectedStatus === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => handleStatusChange('pro_active')}
            className={`filter-tab-btn ${selectedStatus === 'pro_active' ? 'active' : ''}`}
          >
            Active Pro
          </button>
          <button
            onClick={() => handleStatusChange('trial_active')}
            className={`filter-tab-btn ${selectedStatus === 'trial_active' ? 'active' : ''}`}
          >
            Active Trial
          </button>
          <button
            onClick={() => handleStatusChange('expired')}
            className={`filter-tab-btn ${selectedStatus === 'expired' ? 'active' : ''}`}
          >
            Expired
          </button>
          <button
            onClick={() => handleStatusChange('revoked')}
            className={`filter-tab-btn ${selectedStatus === 'revoked' ? 'active' : ''}`}
          >
            Revoked
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-16">
          <LoadingState message="Querying student directory..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load students directory"
          message={error}
          onRetry={fetchStudents}
        />
      ) : students.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12">
          {isFiltering ? (
            <EmptyState
              icon={Filter}
              title="No matching students"
              description="No students match your search query or status filter. Try clearing your search or switching filter tabs."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('all');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No students found"
              description="There are currently no student accounts registered in the system."
            />
          )}
        </div>
      ) : (
        <>
          {/* Students Table */}
          <div className="table-container shadow-sm">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Days Remaining</th>
                  <th>Expiry Date</th>
                  <th>Last Active</th>
                  <th>Devices</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.accountId}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAccountId(student.accountId)}
                  >
                    <td>
                      <div>
                        <div className="font-semibold text-slate-100">
                          {student.fullName || student.email}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {student.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-slate-300">
                        {getPlanLabel(student.currentPlanId)}
                      </span>
                    </td>
                    <td>{getStatusBadge(student)}</td>
                    <td>{getDaysRemainingDisplay(student)}</td>
                    <td>
                      <span className="text-xs text-slate-400">
                        {formatDate(student.expiresAt)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-400">
                        {formatDate(student.lastLoginAt)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-300 font-medium">
                        {student.deviceCount ?? 0}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAccountId(student.accountId);
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 px-2 text-xs text-slate-400">
            <div>
              Showing {students.length} of {pagination.total} students • Page {pagination.page} of {pagination.totalPages}
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

      {/* Student Detail Drawer */}
      <UserDetailDrawer
        accountId={selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
      />
    </div>
  );
};
