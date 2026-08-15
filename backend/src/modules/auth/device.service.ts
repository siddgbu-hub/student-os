import { AuthRepository } from '../../db/auth.repository.js';

export class DeviceService {
  constructor(private repo: AuthRepository) {}

  /**
   * Enforces One Active Android Device per Account policy,
   * while allowing independent Web sessions to coexist simultaneously.
   */
  async registerDevice(
    accountId: string,
    deviceId: string,
    deviceModel?: string,
    osVersion?: string,
    now: Date = new Date()
  ): Promise<void> {
    const timestamp = now.toISOString();
    const isAndroid =
      (deviceId.startsWith('android-native-') || deviceId.startsWith('android-')) &&
      deviceModel !== 'Web Browser' &&
      !deviceId.startsWith('web-') &&
      !deviceId.startsWith('dev-mobile-');

    if (isAndroid) {
      // 1. Find currently active Android devices for this account
      const activeAndroidDevices = await this.repo.findActiveAndroidDevicesForAccount(accountId);
      // 2. Revoke sessions for other active Android devices
      for (const d of activeAndroidDevices) {
        if (d.device_id !== deviceId) {
          await this.repo.revokeSessionsForDevice(d.device_id, timestamp);
        }
      }
      // 3. Revoke all active Android devices for this account
      await this.repo.revokeAndroidDevicesForAccount(accountId, timestamp);
    }

    // Revoke any previous stale sessions for the current deviceId (both Android & Web)
    await this.repo.revokeSessionsForDevice(deviceId, timestamp);

    // Register or reactivate the current device
    await this.repo.upsertDevice(deviceId, accountId, deviceModel || null, osVersion || null, timestamp);

    // Audit log
    await this.repo.logAuditEvent(
      crypto.randomUUID(),
      accountId,
      'DEVICE_REGISTERED',
      JSON.stringify({ deviceId, deviceModel, osVersion }),
      timestamp
    );
  }

  async isDeviceAuthorized(accountId: string, deviceId: string): Promise<boolean> {
    const device = await this.repo.findDeviceById(deviceId);
    if (!device) return false;
    return device.account_id === accountId && device.is_active === 1;
  }
}
