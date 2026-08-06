import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ProtectedRoute } from './router/ProtectedRoute.js';
import { Button } from '@student-os/ui';

const WorkspaceShell: React.FC = () => {
  const { account, logout, deviceId } = useAuth();

  return (
    <div style={{ padding: 'var(--spacing-xl)', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Student OS</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Authenticated as <strong>{account?.email}</strong>
          </p>
        </div>
        <Button variant="secondary" onClick={logout}>
          Sign Out
        </Button>
      </header>

      <main style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>Authenticated Workspace Active</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-md)' }}>
          Identity & Device Authorization (Milestone 2 Foundation) verified successfully.
        </p>

        <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>
          <div><strong>Account ID:</strong> {account?.accountId}</div>
          <div style={{ marginTop: '0.25rem' }}><strong>Active Device ID:</strong> {deviceId}</div>
          <div style={{ marginTop: '0.25rem' }}><strong>Device Authorization:</strong> Active (1 Device Policy Enforced)</div>
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <WorkspaceShell />
      </ProtectedRoute>
    </AuthProvider>
  );
};
