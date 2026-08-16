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
  latestVersionCode: 3,
  latestVersionName: '1.0.2',
  minimumSupportedVersionCode: 1,
  updateRequired: false,
  releaseTitle: 'Student OS 1.0.2',
  releaseNotes: [
    'Instant Start Study response with parallel backend synchronization',
    'Strict RUNNING-only lock-screen study notification lifecycle',
    'Immediate notification removal on session pause',
    'Anti-stacking and single stable notification ID',
    'Continuous timestamp-based elapsed calculation across backgrounding',
    'Production adaptive launcher icon and Android 12+ splash branding',
  ],
  apkUrl: 'https://github.com/siddgbu-hub/student-os/releases/download/v1.0.2/StudentOS-v1.0.2.apk',
  apkSha256: 'dd5c8d1f23e626a68694915724a51203fdd94baec8e7c041c4c392c4cdbfbe31',
  apkSizeBytes: 19391430,
  publishedAt: '2026-08-16T03:30:00.000Z',
};
