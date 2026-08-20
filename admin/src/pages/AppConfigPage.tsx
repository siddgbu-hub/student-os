import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Shield,
  Radio,
  DownloadCloud,
  Layers,
  Globe,
  Bell,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { RemoteAppConfig, AppAnnouncement } from '@student-os/shared';
import { adminApiClient, AdminApiError } from '../services/adminApiClient.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { ErrorState } from '../components/ui/ErrorState.js';

export const AppConfigPage: React.FC = () => {
  const [config, setConfig] = useState<RemoteAppConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiClient.getAppConfig();
      setConfig(res.data);
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load app configuration');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await adminApiClient.updateAppConfig(config);
      setConfig(res.data);
      setSuccessMessage('App configuration and feature flags successfully updated and synced.');
    } catch (err: unknown) {
      if (err instanceof AdminApiError) {
        setError(`Failed to save: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred while saving.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureToggle = (featureKey: keyof RemoteAppConfig['features']) => {
    if (!config) return;
    setConfig({
      ...config,
      features: {
        ...config.features,
        [featureKey]: !config.features[featureKey],
      },
    });
  };

  const handleAddAnnouncement = () => {
    if (!config) return;
    const newAnnouncement: AppAnnouncement = {
      id: crypto.randomUUID(),
      title: 'Important Update',
      message: 'A new version of Student OS is now available.',
      actionUrl: config.githubLatestReleaseUrl || null,
      actionText: 'Learn More',
      dismissible: true,
      createdAt: new Date().toISOString(),
    };
    setConfig({
      ...config,
      announcements: [...config.announcements, newAnnouncement],
    });
  };

  const handleRemoveAnnouncement = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      announcements: config.announcements.filter((a) => a.id !== id),
    });
  };

  if (loading) {
    return <LoadingState message="Loading remote app configuration..." />;
  }

  if (error && !config) {
    return (
      <ErrorState
        title="Configuration Unavailable"
        message={error}
        onRetry={fetchConfig}
      />
    );
  }

  if (!config) return null;

  return (
    <div className="socc-page-container space-y-6">
      <PageHeader
        title="App Configuration & Governance"
        description="Manage Android version governance, GitHub release distribution, emergency maintenance mode, and live feature flags."
        actions={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={fetchConfig}
              disabled={saving}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        }
      />

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: VERSION GOVERNANCE */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <CardTitle>Version Governance (Android)</CardTitle>
              </div>
              <Badge variant={config.forceUpdate ? 'danger' : 'success'}>
                {config.forceUpdate ? 'Force Update Active' : 'Normal Lifecycle'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Minimum Supported Version
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.minimumSupportedVersion}
                  onChange={(e) => setConfig({ ...config, minimumSupportedVersion: e.target.value })}
                  placeholder="1.0.0"
                />
                <p className="text-xs text-slate-500 mt-1">Clients below this version will be hard-blocked.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Min Version Code
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.minimumSupportedVersionCode}
                  onChange={(e) => setConfig({ ...config, minimumSupportedVersionCode: parseInt(e.target.value, 10) || 1 })}
                />
                <p className="text-xs text-slate-500 mt-1">Authoritative version code for mandatory update.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Latest Version Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.latestVersion}
                  onChange={(e) => setConfig({ ...config, latestVersion: e.target.value })}
                  placeholder="1.0.5"
                />
                <p className="text-xs text-slate-500 mt-1">Current production release version.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Latest Version Code
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.latestVersionCode}
                  onChange={(e) => setConfig({ ...config, latestVersionCode: parseInt(e.target.value, 10) || 1 })}
                />
                <p className="text-xs text-slate-500 mt-1">Authoritative version code for optional update.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Recommended Update Version
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.recommendedUpdateVersion}
                  onChange={(e) => setConfig({ ...config, recommendedUpdateVersion: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="forceUpdateToggle"
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={config.forceUpdate}
                  onChange={(e) => setConfig({ ...config, forceUpdate: e.target.checked })}
                />
                <label htmlFor="forceUpdateToggle" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Emergency Force Update (Block all older builds)
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: GITHUB RELEASES DISTRIBUTION */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-indigo-400" />
              <CardTitle>GitHub Release Distribution Channel</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  GitHub Releases Page URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.githubReleaseUrl}
                  onChange={(e) => setConfig({ ...config, githubReleaseUrl: e.target.value })}
                  placeholder="https://github.com/OWNER/REPO/releases"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Latest Tag Release URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.githubLatestReleaseUrl}
                  onChange={(e) => setConfig({ ...config, githubLatestReleaseUrl: e.target.value })}
                  placeholder="https://github.com/OWNER/REPO/releases/tag/v1.0.5"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Direct GitHub APK Download URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  value={config.githubLatestApkUrl}
                  onChange={(e) => setConfig({ ...config, githubLatestApkUrl: e.target.value })}
                  placeholder="https://github.com/OWNER/REPO/releases/download/v1.0.5/student-os-v1.0.5.apk"
                />
                <p className="text-xs text-slate-500 mt-1">Direct APK download link served to mobile clients on update prompt.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Latest APK SHA-256 Checksum (Optional for automated verification)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  value={config.latestApkSha256 || ''}
                  onChange={(e) => setConfig({ ...config, latestApkSha256: e.target.value.trim() || null })}
                  placeholder="64-character SHA-256 hash (leave blank if not yet computed)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: MAINTENANCE MODE */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <CardTitle>Emergency Maintenance Mode</CardTitle>
              </div>
              <Badge variant={config.maintenanceMode ? 'danger' : 'neutral'}>
                {config.maintenanceMode ? 'Maintenance Enabled' : 'Operational'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="maintenanceToggle"
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-amber-600 focus:ring-amber-500 cursor-pointer"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
              />
              <label htmlFor="maintenanceToggle" className="text-sm font-medium text-slate-300 cursor-pointer">
                Enable Global Maintenance Mode (Presents full-screen maintenance overlay on app launch)
              </label>
            </div>

            {config.maintenanceMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Maintenance Message to Users
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.maintenanceMessage || ''}
                  onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value || null })}
                  placeholder="We are currently upgrading server infrastructure. Please check back shortly."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4: REAL-TIME FEATURE FLAGS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <CardTitle>Remote Feature Flags (Instant UI Gating Without APK)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 mb-4">
              Toggle specific modules on or off remotely. Gated features will be safely removed from Android navigation and UI without requiring an APK update.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(config.features).map(([key, enabled]) => (
                <div
                  key={key}
                  onClick={() => handleFeatureToggle(key as keyof RemoteAppConfig['features'])}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    enabled
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize">{key}</span>
                    <Badge variant={enabled ? 'success' : 'neutral'}>
                      {enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: SUPPORT & CANONICAL URLS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              <CardTitle>Canonical Platform URLs & Contact</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Canonical Web App URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.webUrl}
                  onChange={(e) => setConfig({ ...config, webUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Help / Documentation URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.helpUrl}
                  onChange={(e) => setConfig({ ...config, helpUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Support Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  value={config.supportEmail || ''}
                  placeholder="e.g. support@kryvlance.in"
                  onChange={(e) => setConfig({ ...config, supportEmail: e.target.value.trim() ? e.target.value : null })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: ANNOUNCEMENTS */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                <CardTitle>In-App Announcements</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAnnouncement}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Announcement
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.announcements.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No active broadcast announcements.</p>
            ) : (
              config.announcements.map((ann, idx) => (
                <div key={ann.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      Announcement #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAnnouncement(ann.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Remove announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                        value={ann.title}
                        onChange={(e) => {
                          const updated = [...config.announcements];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setConfig({ ...config, announcements: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Action URL (Optional)</label>
                      <input
                        type="url"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                        value={ann.actionUrl || ''}
                        onChange={(e) => {
                          const updated = [...config.announcements];
                          updated[idx] = { ...updated[idx], actionUrl: e.target.value || null };
                          setConfig({ ...config, announcements: updated });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Message</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                      value={ann.message}
                      onChange={(e) => {
                        const updated = [...config.announcements];
                        updated[idx] = { ...updated[idx], message: e.target.value };
                        setConfig({ ...config, announcements: updated });
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
export default AppConfigPage;
