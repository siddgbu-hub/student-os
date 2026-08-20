import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  RotateCcw,
  BarChart3,
  UserCircle,
  RefreshCw,
  AlertTriangle,
  Lock,
  Crown,
  Timer,
  LogOut,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { StudyProvider, useStudy } from './context/StudyContext.js';
import { PlannerProvider } from './context/PlannerContext.js';
import { RevisionProvider } from './context/RevisionContext.js';
import { AnalyticsProvider, useAnalytics } from './context/AnalyticsContext.js';
import { AccountProvider, useAccount } from './context/AccountContext.js';
import { ToastProvider, useToast } from './context/ToastContext.js';
import { GoalProvider, useGoal } from './context/GoalContext.js';
import { ProtectedRoute } from './router/ProtectedRoute.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { StudyPage } from './pages/study/StudyPage.js';
import { PlannerPage } from './pages/planner/PlannerPage.js';
import { RevisionPage } from './pages/revision/RevisionPage.js';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage.js';
import { AccountPage } from './pages/account/AccountPage.js';
import { Button } from '@student-os/ui';
import { EntitlementDto, PlanDto, PaymentConfigDto } from '@student-os/shared';
import { EntitlementService } from './services/entitlementService.js';
import { UpgradeModal } from './components/entitlement/UpgradeModal.js';

const WorkspaceShell: React.FC = () => {
  const { account, logout, token } = useAuth();
  const { profile, refreshAccount } = useAccount();
  const { refreshGoal } = useGoal();
  const { refreshTodaySessions } = useStudy();
  const { refreshAnalytics } = useAnalytics();
  const { showToast } = useToast();
  const [activeModule, setActiveModule] = useState<'dashboard' | 'study' | 'planner' | 'revision' | 'analytics' | 'account'>('dashboard');
  const [entitlement, setEntitlement] = useState<EntitlementDto | null>(null);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigDto | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!token || !account?.accountId) {
      setEntitlement(null);
      return;
    }
    const refresh = () => {
      EntitlementService.getEntitlement().then((res) => {
        if (res) setEntitlement(res);
      }).catch(() => {});
    };

    refresh();
    EntitlementService.getPlans().then(setPlans).catch(() => {});
    EntitlementService.getPaymentConfig().then(setPaymentConfig).catch(() => {});

    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    const handleOnline = () => refresh();
    const handleExpiredEvent = () => {
      setEntitlement((prev) => prev ? { ...prev, status: 'expired' } : null);
      setShowUpgradeModal(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('entitlement:expired', handleExpiredEvent);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('entitlement:expired', handleExpiredEvent);
    };
  }, [token, account?.accountId]);

  // Near-expiry boundary authoritative check
  useEffect(() => {
    if (!entitlement?.expiresAt) return;
    try {
      const expiryMs = new Date(entitlement.expiresAt).getTime();
      const diff = expiryMs - Date.now();
      if (diff > 0 && diff < 86400000) {
        const timer = setTimeout(() => {
          EntitlementService.getEntitlement().then((res) => {
            if (res) setEntitlement(res);
          }).catch(() => {});
        }, diff + 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [entitlement?.expiresAt]);

  const handleRefresh = async () => {
    if (isRefreshing || !token) return;
    setIsRefreshing(true);
    try {
      const [entitlementRes] = await Promise.allSettled([
        EntitlementService.getEntitlement(),
        refreshAccount(),
        refreshGoal?.(),
        refreshTodaySessions?.(),
        refreshAnalytics?.(),
      ]);

      if (entitlementRes.status === 'fulfilled' && entitlementRes.value) {
        setEntitlement(entitlementRes.value);
      }
      showToast('Updated just now', 'success');
    } catch {
      showToast("Couldn't refresh. Check your connection and try again.", 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isActuallyExpired = entitlement?.status === 'expired';
  const isTrialActive = entitlement?.status === 'active' && !entitlement?.isPaid;
  const isPaidActive = entitlement?.status === 'active' && entitlement?.isPaid === true;
  const displayName = profile?.fullName || 'Student';
  const initial = displayName.charAt(0).toUpperCase();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'revision', label: 'Revision', icon: RotateCcw },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'account', label: 'Account', icon: UserCircle },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* SaaS Style Application Header */}
      <header
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.45rem 1.25rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={() => setActiveModule('dashboard')}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-accent)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GraduationCap size={17} />
              </div>
              <h1
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Student OS
              </h1>
            </div>

            {/* Centered Module Navigation (Desktop) */}
            <nav
              className="desktop-nav-container"
              style={{
                gap: '2px',
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '3px',
                marginLeft: 'var(--spacing-sm)',
              }}
            >
              {navItems.map((item) => {
                const isActive = activeModule === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: isActive ? 'var(--color-bg-secondary)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontWeight: isActive ? '600' : '500',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <IconComponent size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Entitlement Badges */}
            {isActuallyExpired && (
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--color-error)',
                  border: '1px solid rgba(239, 68, 68, 0.28)',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AlertTriangle size={13} />
                <span>Trial Expired</span>
              </button>
            )}
            {isTrialActive && (
              <span
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--color-accent)',
                  border: '1px solid rgba(59, 130, 246, 0.22)',
                  fontSize: '0.72rem',
                  fontWeight: '500',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Timer size={13} />
                <span>Trial</span>
              </span>
            )}
            {isPaidActive && (
              <span
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Crown size={13} />
                <span>Pro</span>
              </span>
            )}

            {/* In-App Refresh Action */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh data"
              aria-label="Refresh data"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>

            {account?.email && (
              <button
                type="button"
                onClick={() => setActiveModule('account')}
                title={account.email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 8px 2px 3px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: isPaidActive ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-accent)',
                    color: isPaidActive ? '#f59e0b' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                  }}
                >
                  {initial}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: '500', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </span>
              </button>
            )}
            <Button
              variant="secondary"
              onClick={logout}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', height: '30px', gap: '4px' }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Persistent Warning Banner for Expired Entitlement */}
      {isActuallyExpired && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: 'var(--color-text-primary)',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="var(--color-error)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Your 7-day free trial has ended.</strong> Study timer, Planner, Revision, and Analytics require an active Pro subscription.
            </span>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowUpgradeModal(true)}
            style={{
              fontSize: '0.78rem',
              padding: '3px 12px',
              height: '28px',
              backgroundColor: 'var(--color-error)',
              color: '#fff',
              border: 'none',
              flexShrink: 0,
            }}
          >
            Upgrade to Pro
          </Button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="main-content-container" style={{ maxWidth: '1180px', margin: '0 auto', padding: 'var(--spacing-md)' }}>
        {isActuallyExpired && (activeModule === 'study' || activeModule === 'planner' || activeModule === 'revision' || activeModule === 'analytics') ? (
          <div
            style={{
              maxWidth: '560px',
              margin: '48px auto',
              padding: '36px 28px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-error)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Lock size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Your 7-day free trial has ended
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5, maxWidth: '440px', margin: '0 auto 24px' }}>
              Upgrade to Student OS Pro to unlock full access to the Study Engine, Planner, Revision Tracker, and Analytics. Choose a plan to continue your progress.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="primary"
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  padding: '0.5rem 1.5rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  gap: '6px',
                }}
              >
                <span>View Pro Plans & Upgrade</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        ) : activeModule === 'dashboard' ? (
          <DashboardPage onNavigate={setActiveModule} />
        ) : activeModule === 'study' ? (
          <StudyPage />
        ) : activeModule === 'planner' ? (
          <PlannerPage />
        ) : activeModule === 'revision' ? (
          <RevisionPage />
        ) : activeModule === 'analytics' ? (
          <AnalyticsPage />
        ) : (
          <AccountPage />
        )}
      </main>

      {/* Upgrade / Commercial Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        plans={plans}
        contactWhatsApp={paymentConfig?.contactWhatsApp}
        accountEmail={account?.email || ''}
        entitlement={entitlement}
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveModule(item.id)}
              aria-label={item.label}
            >
              <IconComponent size={18} />
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProtectedRoute>
          <StudyProvider>
            <PlannerProvider>
              <RevisionProvider>
                <AnalyticsProvider>
                  <AccountProvider>
                    <GoalProvider>
                      <WorkspaceShell />
                    </GoalProvider>
                  </AccountProvider>
                </AnalyticsProvider>
              </RevisionProvider>
            </PlannerProvider>
          </StudyProvider>
        </ProtectedRoute>
      </AuthProvider>
    </ToastProvider>
  );
};
