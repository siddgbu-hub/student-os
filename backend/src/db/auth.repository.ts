export interface AccountRecord {
  account_id: string;
  email: string;
  created_at: string;
  last_login_at: string;
}

export interface VerificationRecord {
  id: string;
  target: string;
  purpose: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  verified_at: string | null;
}

export interface DeviceRecord {
  device_id: string;
  account_id: string;
  device_model: string | null;
  os_version: string | null;
  is_active: number;
  registered_at: string;
  last_active_at: string;
}

export interface SessionRecord {
  session_id: string;
  account_id: string;
  device_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

export interface AccountIdentityRecord {
  identity_id: string;
  account_id: string;
  provider: string;
  provider_subject: string;
  created_at: string;
  updated_at: string;
}

export class AuthRepository {
  constructor(private db: D1Database) {}

  async findAccountByIdentity(provider: string, providerSubject: string): Promise<AccountRecord | null> {
    const result = await this.db
      .prepare(
        `SELECT a.* FROM accounts a
         JOIN account_identities i ON a.account_id = i.account_id
         WHERE i.provider = ? AND i.provider_subject = ?
         LIMIT 1`
      )
      .bind(provider, providerSubject)
      .first<AccountRecord>();
    return result || null;
  }

  async createAccountIdentity(
    identityId: string,
    accountId: string,
    provider: string,
    providerSubject: string,
    timestamp: string
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO account_identities (identity_id, account_id, provider, provider_subject, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(identityId, accountId, provider, providerSubject, timestamp, timestamp)
      .run();
  }

  async findAccountByEmail(email: string): Promise<AccountRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM accounts WHERE email = ? LIMIT 1')
      .bind(email.toLowerCase())
      .first<AccountRecord>();
    return result || null;
  }

  async findAccountById(accountId: string): Promise<AccountRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM accounts WHERE account_id = ? LIMIT 1')
      .bind(accountId)
      .first<AccountRecord>();
    return result || null;
  }

  async createAccount(accountId: string, email: string, timestamp: string): Promise<AccountRecord> {
    await this.db
      .prepare('INSERT INTO accounts (account_id, email, created_at, last_login_at) VALUES (?, ?, ?, ?)')
      .bind(accountId, email.toLowerCase(), timestamp, timestamp)
      .run();
    return { account_id: accountId, email: email.toLowerCase(), created_at: timestamp, last_login_at: timestamp };
  }

  async updateAccountLastLogin(accountId: string, timestamp: string): Promise<void> {
    await this.db
      .prepare('UPDATE accounts SET last_login_at = ? WHERE account_id = ?')
      .bind(timestamp, accountId)
      .run();
  }

  async ensureUserProfile(accountId: string, googleName: string | undefined, timestamp: string): Promise<void> {
    const existing = await this.db
      .prepare('SELECT full_name FROM user_profiles WHERE account_id = ? LIMIT 1')
      .bind(accountId)
      .first<{ full_name: string | null }>();

    const nameToSet = googleName && googleName.trim() !== '' ? googleName.trim() : 'Student';

    if (!existing) {
      // Profile does not exist -> Create profile with Google's name or fallback 'Student'
      await this.db
        .prepare(
          `INSERT INTO user_profiles (account_id, full_name, created_at, updated_at)
           VALUES (?, ?, ?, ?)`
        )
        .bind(accountId, nameToSet, timestamp, timestamp)
        .run();
    } else {
      // Profile exists -> Populate with Google's name ONLY if current full_name is NULL, empty, or default 'Student'
      const currentName = existing.full_name ? existing.full_name.trim() : '';
      if ((currentName === '' || currentName.toLowerCase() === 'student') && googleName && googleName.trim() !== '') {
        await this.db
          .prepare('UPDATE user_profiles SET full_name = ?, updated_at = ? WHERE account_id = ?')
          .bind(googleName.trim(), timestamp, accountId)
          .run();
      }
      // If user has a custom non-default name (e.g. "Alex Dev"), PRESERVE IT!
    }
  }

  async createVerificationRequest(
    id: string,
    target: string,
    purpose: string,
    tokenHash: string,
    expiresAt: string,
    createdAt: string
  ): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO verification_requests (id, target, purpose, token_hash, expires_at, created_at, verified_at) VALUES (?, ?, ?, ?, ?, ?, NULL)'
      )
      .bind(id, target.toLowerCase(), purpose, tokenHash, expiresAt, createdAt)
      .run();
  }

  async invalidatePendingOtps(target: string, purpose: string, timestamp: string): Promise<void> {
    await this.db
      .prepare(
        'UPDATE verification_requests SET verified_at = ? WHERE target = ? AND purpose = ? AND verified_at IS NULL'
      )
      .bind(`SUPERSEDED_${timestamp}`, target.toLowerCase(), purpose)
      .run();
  }

  async findLatestUnverifiedRequest(target: string, purpose: string): Promise<VerificationRecord | null> {
    const result = await this.db
      .prepare(
        'SELECT * FROM verification_requests WHERE target = ? AND purpose = ? AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1'
      )
      .bind(target.toLowerCase(), purpose)
      .first<VerificationRecord>();
    return result || null;
  }

  async markVerificationAsVerified(id: string, verifiedAt: string): Promise<void> {
    await this.db
      .prepare('UPDATE verification_requests SET verified_at = ? WHERE id = ?')
      .bind(verifiedAt, id)
      .run();
  }

  async getRecentOtpCount(target: string, windowStart: string): Promise<number> {
    const result = await this.db
      .prepare(
        'SELECT COUNT(*) as count FROM verification_requests WHERE target = ? AND purpose = "email_otp" AND created_at >= ?'
      )
      .bind(target.toLowerCase(), windowStart)
      .first<{ count: number }>();
    return result?.count || 0;
  }

  async findDeviceById(deviceId: string): Promise<DeviceRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM devices WHERE device_id = ? LIMIT 1')
      .bind(deviceId)
      .first<DeviceRecord>();
    return result || null;
  }

  async findActiveDeviceForAccount(accountId: string): Promise<DeviceRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM devices WHERE account_id = ? AND is_active = 1 LIMIT 1')
      .bind(accountId)
      .first<DeviceRecord>();
    return result || null;
  }

  async revokeDevicesForAccount(accountId: string, timestamp: string): Promise<void> {
    await this.db
      .prepare('UPDATE devices SET is_active = 0, last_active_at = ? WHERE account_id = ?')
      .bind(timestamp, accountId)
      .run();
  }

  async findActiveAndroidDevicesForAccount(accountId: string): Promise<DeviceRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM devices 
         WHERE account_id = ? 
           AND is_active = 1 
           AND (device_id LIKE 'android-%' OR device_id LIKE 'android-native-%')
           AND (device_model IS NULL OR device_model != 'Web Browser')
           AND (device_id NOT LIKE 'web-%' AND device_id NOT LIKE 'dev-mobile-%')`
      )
      .bind(accountId)
      .all<DeviceRecord>();
    return result.results || [];
  }

  async revokeAndroidDevicesForAccount(accountId: string, timestamp: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE devices 
         SET is_active = 0, last_active_at = ? 
         WHERE account_id = ? 
           AND is_active = 1 
           AND (device_id LIKE 'android-%' OR device_id LIKE 'android-native-%')
           AND (device_model IS NULL OR device_model != 'Web Browser')
           AND (device_id NOT LIKE 'web-%' AND device_id NOT LIKE 'dev-mobile-%')`
      )
      .bind(timestamp, accountId)
      .run();
  }

  async upsertDevice(
    deviceId: string,
    accountId: string,
    deviceModel: string | null,
    osVersion: string | null,
    timestamp: string
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO devices (device_id, account_id, device_model, os_version, is_active, registered_at, last_active_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(device_id) DO UPDATE SET
           account_id = excluded.account_id,
           device_model = COALESCE(excluded.device_model, devices.device_model),
           os_version = COALESCE(excluded.os_version, devices.os_version),
           is_active = 1,
           last_active_at = excluded.last_active_at`
      )
      .bind(deviceId, accountId, deviceModel || null, osVersion || null, timestamp, timestamp)
      .run();
  }

  async createSession(
    sessionId: string,
    accountId: string,
    deviceId: string,
    tokenHash: string,
    expiresAt: string,
    createdAt: string
  ): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO sessions (session_id, account_id, device_id, token_hash, expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, NULL)'
      )
      .bind(sessionId, accountId, deviceId, tokenHash, expiresAt, createdAt)
      .run();
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM sessions WHERE session_id = ? LIMIT 1')
      .bind(sessionId)
      .first<SessionRecord>();
    return result || null;
  }

  async revokeSessionsForAccount(accountId: string, timestamp: string): Promise<void> {
    await this.db
      .prepare('UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL')
      .bind(timestamp, accountId)
      .run();
  }

  async revokeSessionsForDevice(deviceId: string, timestamp: string): Promise<void> {
    await this.db
      .prepare('UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL')
      .bind(timestamp, deviceId)
      .run();
  }

  async revokeSessionById(sessionId: string, timestamp: string): Promise<void> {
    await this.db
      .prepare('UPDATE sessions SET revoked_at = ? WHERE session_id = ?')
      .bind(timestamp, sessionId)
      .run();
  }

  async logAuditEvent(id: string, accountId: string | null, eventType: string, details: string, timestamp: string): Promise<void> {
    await this.db
      .prepare('INSERT INTO audit_logs (id, account_id, event_type, details, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, accountId || null, eventType, details, timestamp)
      .run();
  }
}
