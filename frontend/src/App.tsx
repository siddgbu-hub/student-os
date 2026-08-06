import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { StudyProvider } from './context/StudyContext.js';
import { PlannerProvider } from './context/PlannerContext.js';
import { RevisionProvider } from './context/RevisionContext.js';
import { AnalyticsProvider } from './context/AnalyticsContext.js';
import { AccountProvider, useAccount } from './context/AccountContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { GoalProvider } from './context/GoalContext.js';
import { ProtectedRoute } from './router/ProtectedRoute.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { StudyPage } from './pages/study/StudyPage.js';
import { PlannerPage } from './pages/planner/PlannerPage.js';
import { RevisionPage } from './pages/revision/RevisionPage.js';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage.js';
import { AccountPage } from './pages/account/AccountPage.js';
import { Button } from '@student-os/ui';

const WorkspaceShell: React.FC = () => {
  const { account, logout } = useAuth();
  const { profile } = useAccount();
  const [activeModule, setActiveModule] = useState<'dashboard' | 'study' | 'planner' | 'revision' | 'analytics' | 'account'>('dashboard');

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

            {/* Centered / Natural Module Navigation */}
            <nav
              style={{
                display: 'flex',
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
                { id: 'study', label: 'Study Engine' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
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
                  borderRadius: '16px',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-accent)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '0.72rem',
                  }}
                >
                  {initial}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
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

      {/* Main Content Container */}
      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: 'var(--spacing-md)' }}>
        {activeModule === 'dashboard' ? (
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
