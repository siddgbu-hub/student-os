import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Sparkles,
  UserCheck,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  History,
} from 'lucide-react';
import type { AdminOverviewDto } from '@student-os/shared';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { ErrorState } from '../components/ui/ErrorState.js';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminOverviewDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await adminApiClient.getOverview();
      setMetrics(res.data);
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        if (err.status === 403) {
          setError('You do not have permission to view overview metrics.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load platform overview metrics.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatCurrency = (amountPaise: number) => {
    if (amountPaise === 0) return '₹0.00';
    return `₹${(amountPaise / 100).toFixed(2)}`;
  };

  const totalProSubscribers = metrics
    ? metrics.activeProMonthly + metrics.activeProYearly
    : 0;

  /** Navigate to Students with a pre-applied filter via router state. */
  const goStudents = (filter?: string) =>
    navigate('/students', { state: filter ? { filter } : undefined });

  /** Shared classes for interactive KPI cards — look like cards, feel clickable. */
  const kpiCardBase =
    'bg-slate-900 border-slate-800 shadow-sm cursor-pointer ' +
    'hover:border-blue-500/40 hover:bg-slate-800/60 ' +
    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

  /** Shared classes for subscription distribution sub-cards. */
  const distCardBase =
    'p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-lg cursor-pointer ' +
    'hover:border-blue-500/40 hover:bg-slate-800/40 ' +
    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Current platform status and subscription activity."
        actions={
          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchMetrics(true)}
            disabled={loading || refreshing}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        }
      />

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16">
          <LoadingState message="Fetching operational metrics from server..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load overview metrics"
          message={error}
          onRetry={() => fetchMetrics(false)}
        />
      ) : metrics ? (
        <div className="space-y-6">
          {/* SECTION 1: PRIMARY OPERATIONAL KPI METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" role="list">

            {/* 1. Total Students → /students (all) */}
            <Card
              role="listitem"
              tabIndex={0}
              aria-label={`Total Students: ${metrics.totalStudents.toLocaleString('en-IN')}. Click to view all students.`}
              className={kpiCardBase}
              onClick={() => goStudents()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goStudents()}
            >
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                  Total Students
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-mono">
                  {metrics.totalStudents.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  Registered student accounts
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-50" />
                </p>
              </CardContent>
            </Card>

            {/* 2. Active Pro → /students?filter=pro_active */}
            <Card
              role="listitem"
              tabIndex={0}
              aria-label={`Active Pro: ${totalProSubscribers.toLocaleString('en-IN')}. Click to view active Pro subscribers.`}
              className={kpiCardBase}
              onClick={() => goStudents('pro_active')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goStudents('pro_active')}
            >
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                  Active Pro
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-amber-600/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {totalProSubscribers.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  {metrics.activeProMonthly} Monthly • {metrics.activeProYearly} Yearly
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-50" />
                </p>
              </CardContent>
            </Card>

            {/* 3. Active Trials → /students?filter=trial_active */}
            <Card
              role="listitem"
              tabIndex={0}
              aria-label={`Active Trials: ${metrics.activeTrials.toLocaleString('en-IN')}. Click to view active trial users.`}
              className={kpiCardBase}
              onClick={() => goStudents('trial_active')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goStudents('trial_active')}
            >
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                  Active Trials
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400 font-mono">
                  {metrics.activeTrials.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  Active free trial users
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-50" />
                </p>
              </CardContent>
            </Card>

            {/* 4. Expiring (7D) → /students (student directory) */}
            <Card
              role="listitem"
              tabIndex={0}
              aria-label={`Expiring in 7 days: ${metrics.expiringNext7Days.toLocaleString('en-IN')}. Click to view student directory.`}
              className={kpiCardBase}
              onClick={() => goStudents()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goStudents()}
            >
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                  Expiring (7d)
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Clock className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-400 font-mono">
                  {metrics.expiringNext7Days.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  Renewal horizon
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-50" />
                </p>
              </CardContent>
            </Card>

            {/* 5. Captured Revenue → /payments */}
            <Card
              role="listitem"
              tabIndex={0}
              aria-label={`Captured Revenue: ${formatCurrency(metrics.totalRevenuePaise)}. Click to view payments ledger.`}
              className={kpiCardBase}
              onClick={() => navigate('/payments')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/payments')}
            >
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                  Captured Revenue
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {formatCurrency(metrics.totalRevenuePaise)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  All-time ledger total
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-50" />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: SUBSCRIPTION SNAPSHOT & PLATFORM CONSOLE STATUS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subscription Snapshot Breakdown */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Subscription Distribution Snapshot</h3>
                </div>
                <Badge variant="neutral" size="sm">
                  Authoritative Server State
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Monthly Pro */}
                <button
                  type="button"
                  className={distCardBase}
                  onClick={() => goStudents('pro_active')}
                  aria-label="View active monthly Pro subscribers"
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block text-left">Monthly Pro</span>
                  <span className="text-lg font-bold text-white font-mono mt-0.5 block text-left">
                    {metrics.activeProMonthly}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    ₹30 plan tier <ArrowRight className="w-2.5 h-2.5 opacity-40" />
                  </span>
                </button>

                {/* Yearly Pro */}
                <button
                  type="button"
                  className={distCardBase}
                  onClick={() => goStudents('pro_active')}
                  aria-label="View active yearly Pro subscribers"
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block text-left">Yearly Pro</span>
                  <span className="text-lg font-bold text-white font-mono mt-0.5 block text-left">
                    {metrics.activeProYearly}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    ₹299 annual tier <ArrowRight className="w-2.5 h-2.5 opacity-40" />
                  </span>
                </button>

                {/* Active Trials */}
                <button
                  type="button"
                  className={distCardBase}
                  onClick={() => goStudents('trial_active')}
                  aria-label="View active trial users"
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block text-left">Active Trials</span>
                  <span className="text-lg font-bold text-purple-400 font-mono mt-0.5 block text-left">
                    {metrics.activeTrials}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    Free trial users <ArrowRight className="w-2.5 h-2.5 opacity-40" />
                  </span>
                </button>

                {/* Expired / Inactive */}
                <button
                  type="button"
                  className={distCardBase}
                  onClick={() => goStudents('expired')}
                  aria-label="View expired or inactive accounts"
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block text-left">Expired / Inactive</span>
                  <span className="text-lg font-bold text-slate-300 font-mono mt-0.5 block text-left">
                    {metrics.expiredAccounts}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    Expired accounts <ArrowRight className="w-2.5 h-2.5 opacity-40" />
                  </span>
                </button>
              </div>
            </div>

            {/* Platform Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">System Status</h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400">SOCC Control Center</span>
                  <span className="text-slate-200 font-mono font-medium">v1.0 Operational</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400">Access Control</span>
                  <span className="text-slate-200 font-mono font-medium">RBAC Enforced</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400">Database Engine</span>
                  <span className="text-slate-200 font-mono font-medium">Cloudflare D1</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: QUICK NAVIGATION SHORTCUTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Administrative Navigation Shortcuts</h3>
              <span className="text-xs text-slate-400">Quick Access</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => navigate('/students')}
                aria-label="Navigate to Student Directory"
                className="p-4 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-blue-500/40 rounded-xl text-left transition-all duration-150 flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div>
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Student Directory
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Search students, inspect plans, and grant or extend subscriptions.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-150 ml-3 flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/payments')}
                aria-label="Navigate to Payments Ledger"
                className="p-4 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition-all duration-150 flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div>
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Payments Ledger
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    View transactions and record offline UPI, cash, or bank transfers.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-150 ml-3 flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/audit')}
                aria-label="Navigate to Audit Trail"
                className="p-4 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition-all duration-150 flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div>
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    Audit Trail
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Inspect immutable administrative logs and operator provenance.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-150 ml-3 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
