import { AccountRepository } from '../../db/account.repository.js';
import { UserProfileDTO, UserPreferencesDTO, AccountOverviewDTO, DeviceSessionDTO } from '@student-os/shared';

export class AccountService {
  constructor(private repo: AccountRepository) {}

  async getAccountOverview(accountId: string, currentDeviceId: string): Promise<AccountOverviewDTO> {
    const account = await this.repo.getAccountById(accountId);
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');

    let profile = await this.repo.getProfileByAccountId(accountId);
    if (!profile) {
      profile = await this.repo.upsertProfile(accountId, { fullName: 'Student' });
    }

    let preferences = await this.repo.getPreferencesByAccountId(accountId);
    if (!preferences) {
      preferences = await this.repo.upsertPreferences(accountId, {});
    }

    const devices = await this.repo.getDevicesByAccountId(accountId, currentDeviceId);

    return {
      accountId: account.account_id,
      email: account.email,
      createdAt: account.created_at,
      lastLoginAt: account.last_login_at,
      profile,
      preferences,
      devices,
    };
  }

  async updateProfile(accountId: string, input: Partial<UserProfileDTO>): Promise<UserProfileDTO> {
    return await this.repo.upsertProfile(accountId, input);
  }

  async updatePreferences(accountId: string, input: Partial<UserPreferencesDTO>): Promise<UserPreferencesDTO> {
    return await this.repo.upsertPreferences(accountId, input);
  }

  async getDevices(accountId: string, currentDeviceId: string): Promise<DeviceSessionDTO[]> {
    return await this.repo.getDevicesByAccountId(accountId, currentDeviceId);
  }

  async revokeDevice(accountId: string, deviceId: string): Promise<void> {
    await this.repo.revokeDevice(accountId, deviceId);
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.repo.deleteAccountData(accountId);
  }
}
