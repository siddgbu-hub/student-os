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
  latestVersionCode: 5,
  latestVersionName: '1.0.4',
  minimumSupportedVersionCode: 1,
  updateRequired: false,
  releaseTitle: 'Student OS 1.0.4',
  releaseNotes: [
    'Eliminated visible login screen flash on startup for authenticated users',
    'Direct and instant routing to dashboard with neutral splash hydration state',
    'Robust session restoration lifecycle stabilization',
  ],
  apkUrl: 'https://github.com/siddgbu-hub/student-os/releases/download/v1.0.4/StudentOS-v1.0.4.apk',
  apkSha256: '9bc3fa63b36d0a2f028da8ab8a9568670f1cece5eca6404aff6b401f7642b984',
  apkSizeBytes: 19629033,
  publishedAt: '2026-08-19T14:55:00.000Z',
};
