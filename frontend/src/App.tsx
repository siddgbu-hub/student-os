import React, { useState, useEffect } from 'react';
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* SaaS Style Application Header */}
      <header
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.5rem 1.25rem',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-accent)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                }}
              >
                S
              </div>
              <h1
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Student OS
              </h1>
            </div>

            {/* Centered / Natural Module Navigation (Desktop) */}
            <nav
              className="desktop-nav-container"
              style={{
                gap: '4px',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '3px',
                marginLeft: 'var(--spacing-md)',
              }}
            >
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'study', label: 'Study' },
                { id: 'planner', label: 'Planner' },
                { id: 'revision', label: 'Revision' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'account', label: 'Account' },
              ].map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id as typeof activeModule)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: isActive ? 'var(--color-bg-secondary)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontWeight: isActive ? '700' : '500',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08), inset 0 -2px 0 var(--color-accent)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            {/* Entitlement Badges */}
            {isActuallyExpired && (
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⚠️ Trial Expired
              </button>
            )}
            {isTrialActive && (
              <span
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                Trial
              </span>
            )}
            {isPaidActive && (
              <span
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                ⭐ Pro
              </span>
            )}

            {/* In-App Refresh Action */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh"
              aria-label="Refresh"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.85rem',
                  lineHeight: 1,
                  animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
                }}
              >
                🔄
              </span>
            </button>

            {account?.email && (
              <button
                type="button"
                onClick={() => setActiveModule('account')}
                title={isPaidActive ? `${account.email} • Student OS Pro Active` : account.email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 8px 2px 3px',
                  borderRadius: '16px',
                  backgroundColor: isPaidActive ? 'rgba(15, 23, 42, 0.6)' : 'var(--color-bg-primary)',
                  border: isPaidActive ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  boxShadow: isPaidActive ? '0 0 8px rgba(245, 158, 11, 0.15)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isPaidActive
                      ? 'linear-gradient(135deg, #ffd700, #f59e0b)'
                      : 'var(--color-accent)',
                    padding: isPaidActive ? '1.5px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: isPaidActive ? '#0f172a' : 'var(--color-accent)',
                      color: isPaidActive ? '#ffd700' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: isPaidActive ? '800' : '600',
                      fontSize: '0.72rem',
                    }}
                  >
                    {initial}
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: isPaidActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: isPaidActive ? '600' : '500' }}>
                  {displayName}
                </span>
              </button>
            )}
            <Button
              variant="secondary"
              onClick={logout}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', height: '30px' }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Persistent Warning Banner for Expired Entitlement */}
      {isActuallyExpired && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '0.65rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#991b1b',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span>
              <strong>Your 7-day free trial has ended.</strong> Study timer, Planner, Revision, and Analytics require an active Pro subscription.
            </span>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowUpgradeModal(true)}
            style={{
              fontSize: '0.8rem',
              padding: '4px 12px',
              height: '28px',
              backgroundColor: '#dc2626',
              color: '#fff',
              borderColor: '#dc2626',
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
              maxWidth: '680px',
              margin: '40px auto',
              padding: '48px 32px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '12px', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Your 7-day free trial has ended
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 28px' }}>
              Upgrade to Student OS Pro to unlock full access to the Study Engine, Planner, Revision Tracker, and Analytics. Choose a plan to continue your progress.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <Button
                variant="primary"
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  padding: '0.75rem 2rem',
                  fontWeight: '700',
                  fontSize: '1rem',
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                }}
              >
                View Pro Plans & Upgrade →
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

      {/* Fixed Mobile Bottom Navigation Bar (Parity with Android) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {[
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            ),
          },
          {
            id: 'study',
            label: 'Study',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ),
          },
          {
            id: 'planner',
            label: 'Planner',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ),
          },
          {
            id: 'revision',
            label: 'Revision',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            ),
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            ),
          },
          {
            id: 'account',
            label: 'Account',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ),
          },
        ].map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveModule(item.id as typeof activeModule)}
              aria-label={item.label}
            >
              {item.icon}
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
