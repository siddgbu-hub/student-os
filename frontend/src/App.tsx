import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { StudyProvider } from './context/StudyContext.js';
import { PlannerProvider } from './context/PlannerContext.js';
import { RevisionProvider } from './context/RevisionContext.js';
import { ProtectedRoute } from './router/ProtectedRoute.js';
import { StudyPage } from './pages/study/StudyPage.js';
import { PlannerPage } from './pages/planner/PlannerPage.js';
import { RevisionPage } from './pages/revision/RevisionPage.js';
import { Button } from '@student-os/ui';

const WorkspaceShell: React.FC = () => {
  const { account, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<'study' | 'planner' | 'revision'>('study');

  const initial = account?.email ? account.email.charAt(0).toUpperCase() : 'S';

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
              <button
                type="button"
                onClick={() => setActiveModule('study')}
                style={{
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: activeModule === 'study' ? 'var(--color-bg-secondary)' : 'transparent',
                  color: activeModule === 'study' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: activeModule === 'study' ? '600' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: activeModule === 'study' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Study Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('planner')}
                style={{
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: activeModule === 'planner' ? 'var(--color-bg-secondary)' : 'transparent',
                  color: activeModule === 'planner' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: activeModule === 'planner' ? '600' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: activeModule === 'planner' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Planner
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('revision')}
                style={{
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: activeModule === 'revision' ? 'var(--color-bg-secondary)' : 'transparent',
                  color: activeModule === 'revision' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: activeModule === 'revision' ? '600' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: activeModule === 'revision' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Revision
              </button>
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            {account?.email && (
              <div
                title={account.email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 8px 2px 3px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
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
                  Student
                </span>
              </div>
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
        {activeModule === 'study' ? <StudyPage /> : activeModule === 'planner' ? <PlannerPage /> : <RevisionPage />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <StudyProvider>
          <PlannerProvider>
            <RevisionProvider>
              <WorkspaceShell />
            </RevisionProvider>
          </PlannerProvider>
        </StudyProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
};
