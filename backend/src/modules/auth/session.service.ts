import { AuthRepository } from '../../db/auth.repository.js';
import { hashString, signJwt, verifyJwt } from '../../services/crypto.service.js';
import { SESSION_CONFIG } from '@student-os/shared';

export class SessionService {
  constructor(private repo: AuthRepository) {}

  async createSession(
    accountId: string,
    deviceId: string,
    jwtSecret: string,
    now: Date = new Date()
  ): Promise<{ token: string; sessionId: string; expiresAt: string }> {
    const timestamp = now.toISOString();
    const sessionId = crypto.randomUUID();

    // Revoke previous sessions for this account (enforce 1 active session per account)
    await this.repo.revokeSessionsForAccount(accountId, timestamp);

    // Calculate expiration
    const expiresDate = new Date(now.getTime() + SESSION_CONFIG.TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    const expiresAt = expiresDate.toISOString();

    // Sign JWT
    const token = await signJwt({ accountId, sessionId, deviceId }, jwtSecret, SESSION_CONFIG.TOKEN_EXPIRATION_DAYS);
    const tokenHash = await hashString(token);

    // Insert session into DB
    await this.repo.createSession(sessionId, accountId, deviceId, tokenHash, expiresAt, timestamp);

    // Log audit
    await this.repo.logAuditEvent(
      crypto.randomUUID(),
      accountId,
      'SESSION_CREATED',
      JSON.stringify({ sessionId, deviceId }),
      timestamp
    );

    return { token, sessionId, expiresAt };
  }

  async validateSession(
    token: string,
    jwtSecret: string,
    now: Date = new Date()
  ): Promise<{ accountId: string; sessionId: string; deviceId: string } | null> {
    // Step 1: JWT Verification
    const payload = await verifyJwt(token, jwtSecret);
    if (!payload) return null;

    // Step 2: Database Session Validation
    const session = await this.repo.findSessionById(payload.sessionId);
    if (!session) return null;
    if (session.revoked_at !== null) return null;

    const expiresAtDate = new Date(session.expires_at);
    if (expiresAtDate <= now) return null;

    return {
      accountId: session.account_id,
      sessionId: session.session_id,
      deviceId: session.device_id,
    };
  }

  async logout(sessionId: string, accountId: string, now: Date = new Date()): Promise<void> {
    const timestamp = now.toISOString();
    await this.repo.revokeSessionById(sessionId, timestamp);

    await this.repo.logAuditEvent(
      crypto.randomUUID(),
      accountId,
      'LOGOUT',
      JSON.stringify({ sessionId }),
      timestamp
    );
  }
}
