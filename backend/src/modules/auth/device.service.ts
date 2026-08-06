import { AuthRepository } from '../../db/auth.repository.js';

export class DeviceService {
  constructor(private repo: AuthRepository) {}

  /**
   * Enforces One Device Per Account policy.
   * Invalidates existing device registration and registers the new device as active.
   */
  async registerDevice(
    accountId: string,
    deviceId: string,
    deviceModel?: string,
    osVersion?: string,
    now: Date = new Date()
  ): Promise<void> {
    const timestamp = now.toISOString();

    // Revoke previous active devices for this account
    await this.repo.revokeDevicesForAccount(accountId, timestamp);

    // Register or reactivate the target device
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
