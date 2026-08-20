export interface AndroidReleaseMetadata {
  platform: 'android';
  latestVersionCode: number;
  latestVersionName: string;
  minimumSupportedVersionCode: number;
  updateRequired: boolean;
  releaseTitle: string;
  releaseNotes: string[];
  apkUrl: string;
  apkSha256: string;
  apkSizeBytes: number;
  publishedAt: string;
}

export const ANDROID_RELEASE_METADATA: AndroidReleaseMetadata = {
  platform: 'android',
  latestVersionCode: 6,
  latestVersionName: '1.0.5',
  minimumSupportedVersionCode: 1,
  updateRequired: false,
  releaseTitle: 'Student OS 1.0.5',
  releaseNotes: [
    'GitHub Releases direct APK installation engine',
    'Remote app configuration and real-time feature flag governance',
    'Automated SHA-256 integrity verification and system package installer support',
    'Polished native typography system with enhanced legibility and vertical rhythm',
  ],
  apkUrl: 'https://github.com/siddgbu-hub/student-os/releases/download/v1.0.5/student-os-v1.0.5.apk',
  apkSha256: '2c551ed52e295458b1e0a9399140c3e47374c31533d5d13647dcd178589fd457',
  apkSizeBytes: 2817377,
  publishedAt: '2026-08-20T17:58:00.000Z',
};

export interface AppFeatureFlags {
  analytics: boolean;
  planner: boolean;
  revision: boolean;
  study: boolean;
  payments: boolean;
  webVersion: boolean;
  newDashboard: boolean;
}

export interface AppAnnouncement {
  id: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  actionText?: string | null;
  dismissible: boolean;
  createdAt: string;
}

export interface RemoteAppConfig {
  minimumSupportedVersion: string;
  minimumSupportedVersionCode: number;
  latestVersion: string;
  latestVersionCode: number;
  recommendedUpdateVersion: string;
  forceUpdate: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  features: AppFeatureFlags;
  webUrl: string;
  githubReleaseUrl: string;
  githubLatestReleaseUrl: string;
  githubLatestApkUrl: string;
  latestApkSha256: string | null;
  helpUrl: string;
  supportEmail: string | null;
  announcements: AppAnnouncement[];
}

export const DEFAULT_REMOTE_APP_CONFIG: RemoteAppConfig = {
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
  latestApkSha256: '2c551ed52e295458b1e0a9399140c3e47374c31533d5d13647dcd178589fd457',
  helpUrl: 'https://studentos.kryvlance.in/help',
  supportEmail: null,
  announcements: [],
};
