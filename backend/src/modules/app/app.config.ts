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
  latestVersionCode: 4,
  latestVersionName: '1.0.3',
  minimumSupportedVersionCode: 1,
  updateRequired: false,
  releaseTitle: 'Student OS 1.0.3',
  releaseNotes: [
    'Server-authoritative trial expiry and entitlement enforcement',
    'Expired-session protection and background reconciliation',
    'Trial and paid entitlement state preservation',
    'Prominent expired-state web paywall and UX upgrade flows',
    'Seamless Web and Android cross-platform access CTAs',
    'Break reminder stale-alarm protection and lifecycle stabilization',
  ],
  apkUrl: 'https://github.com/siddgbu-hub/student-os/releases/download/v1.0.3/StudentOS-v1.0.3.apk',
  apkSha256: '2d832781f9661b79d8472774f3bee20b55b6c2c7bc9a3f2bf3a453cdca9ab4c9',
  apkSizeBytes: 19965358,
  publishedAt: '2026-08-16T06:45:00.000Z',
};
