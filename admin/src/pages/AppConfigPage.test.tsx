import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAuthProvider } from '../context/AdminAuthContext.js';
import { AppConfigPage } from './AppConfigPage.js';
import type { RemoteAppConfig } from '@student-os/shared';

const mockAppConfig: RemoteAppConfig = {
  minimumSupportedVersion: '1.0.0',
  minimumSupportedVersionCode: 1,
  latestVersion: '1.0.5',
  latestVersionCode: 6,
  recommendedUpdateVersion: '1.0.5',
  forceUpdate: false,
  maintenanceMode: false,
  maintenanceMessage: null,
  features: {
    analytics: true,
    planner: true,
    revision: true,
    study: true,
    payments: true,
    webVersion: true,
    newDashboard: true,
  },
  webUrl: 'https://studentos.kryvlance.in',
  githubReleaseUrl: 'https://github.com/siddgbu-hub/student-os/releases',
  githubLatestReleaseUrl: 'https://github.com/siddgbu-hub/student-os/releases/tag/v1.0.5',
  githubLatestApkUrl: 'https://github.com/siddgbu-hub/student-os/releases/download/v1.0.5/student-os-v1.0.5.apk',
  latestApkSha256: '9bc3fa63b36d0a2f028da8ab8a9568670f1cece5eca6404aff6b401f7642b984',
  helpUrl: 'https://studentos.kryvlance.in/help',
  supportEmail: 'support@kryvlance.in',
  announcements: [],
};

function renderAppConfigPage() {
  return render(
    <AdminAuthProvider initialStatus="authenticated" initialToken="test-token">
      <MemoryRouter>
        <AppConfigPage />
      </MemoryRouter>
    </AdminAuthProvider>
  );
}

describe('Admin Console — App Configuration Page Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. renders loading state while fetching app config', () => {
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    renderAppConfigPage();

    expect(screen.getByText(/Loading remote app configuration/i)).toBeDefined();
  });

  it('2. renders version governance and feature flags after fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockAppConfig,
      }),
    });

    renderAppConfigPage();

    await waitFor(() => {
      expect(screen.getByText('Version Governance (Android)')).toBeDefined();
      expect(screen.getByText('GitHub Release Distribution Channel')).toBeDefined();
      expect(screen.getByText('Remote Feature Flags (Instant UI Gating Without APK)')).toBeDefined();
    });

    // Check input values
    const latestVersionInputs = screen.getAllByDisplayValue('1.0.5');
    expect(latestVersionInputs.length).toBeGreaterThan(0);
  });

  it('3. allows toggling feature flags and submits updated payload', async () => {
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        capturedBody = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              ...mockAppConfig,
              features: {
                ...mockAppConfig.features,
                analytics: false,
              },
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockAppConfig,
        }),
      });
    });

    renderAppConfigPage();

    await waitFor(() => {
      expect(screen.getByText('analytics')).toBeDefined();
    });

    // Click to toggle analytics feature flag
    fireEvent.click(screen.getByText('analytics'));

    // Click Save Changes
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(capturedBody).toBeDefined();
      expect(capturedBody.features.analytics).toBe(false);
      expect(screen.getByText(/successfully updated and synced/i)).toBeDefined();
    });
  });
});
