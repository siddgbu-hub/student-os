import { AuthRepository } from '../../db/auth.repository.js';
import { generateNumericOtp, hashString } from '../../services/crypto.service.js';
import { EmailService } from '../../services/email.service.js';
import { GoogleJwksService } from '../../services/google-jwks.service.js';
import { OTP_CONFIG, AUTH_ERRORS } from '@student-os/shared';

export class AuthService {
  constructor(
    private repo: AuthRepository,
    private emailService?: EmailService,
    private googleJwksService: GoogleJwksService = new GoogleJwksService()
  ) {}

  /**
   * Generates and stores a hashed verification request for Email OTP, and delivers it via EmailService.
   */
  async sendOtp(email: string, now: Date = new Date()): Promise<{ success: boolean; message: string }> {
    const timestamp = now.toISOString();

    // Check rate limit: max 3 requests per 15 mins per target email
    const windowStart = new Date(now.getTime() - OTP_CONFIG.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const recentCount = await this.repo.getRecentOtpCount(email, windowStart);
    if (recentCount >= OTP_CONFIG.MAX_ATTEMPTS_PER_WINDOW) {
      throw new Error(AUTH_ERRORS.TOO_MANY_REQUESTS);
    }

    // Check if existing student account is suspended
    const existingAccount = await this.repo.findAccountByEmail(email);
    if (existingAccount && existingAccount.status === 'suspended') {
      throw new Error(AUTH_ERRORS.ACCOUNT_SUSPENDED);
    }

    // Invalidate previous unverified OTP requests for this email immediately
    await this.repo.invalidatePendingOtps(email, 'email_otp', timestamp);

    // Generate 6-digit numeric OTP & hash it
    const otp = generateNumericOtp(OTP_CONFIG.LENGTH);
    const tokenHash = await hashString(otp);

    // Calculate expiration (5 mins)
    const expiresAt = new Date(now.getTime() + OTP_CONFIG.EXPIRATION_MINUTES * 60 * 1000).toISOString();
    const id = crypto.randomUUID();

    // Store in generic verification_requests table (never plain text)
    await this.repo.createVerificationRequest(id, email, 'email_otp', tokenHash, expiresAt, timestamp);

    // Deliver OTP via EmailService
    if (this.emailService) {
      try {
        await this.emailService.sendOtpEmail(email, otp);
      } catch (err: unknown) {
        // If email delivery fails, invalidate stored OTP to prevent redemption of undelivered code
        await this.repo.invalidatePendingOtps(email, 'email_otp', timestamp);
        const safeReason = err instanceof Error ? err.message : 'Unknown email error';
        console.error(`[AuthService] OTP email delivery failed for recipient: ${safeReason}`);
        throw new Error(AUTH_ERRORS.EMAIL_DELIVERY_FAILED);
      }
    }

    // Audit log
    await this.repo.logAuditEvent(
      crypto.randomUUID(),
      null,
      'OTP_REQUESTED',
      JSON.stringify({ email: email.toLowerCase() }),
      timestamp
    );

    return { success: true, message: 'Verification code sent if email is valid' };
  }

  /**
   * Verifies OTP and resolves user account (creating a new account if first time).
   * Same email always resolves to the SAME account.
   */
  async verifyOtp(email: string, otp: string, now: Date = new Date()): Promise<{ accountId: string; email: string }> {
    const timestamp = now.toISOString();
    const tokenHash = await hashString(otp);

    // Find latest unverified request for this email
    const request = await this.repo.findLatestUnverifiedRequest(email, 'email_otp');
    if (!request) {
      throw new Error('AUTH_INVALID_OTP');
    }

    // Check expiration
    if (new Date(request.expires_at) <= now) {
      throw new Error('AUTH_OTP_EXPIRED');
    }

    // Verify hash
    if (request.token_hash !== tokenHash) {
      throw new Error('AUTH_INVALID_OTP');
    }

    // Mark verified
    await this.repo.markVerificationAsVerified(request.id, timestamp);

    // Resolve or provision user account (Unified Account Resolution)
    let account = await this.repo.findAccountByEmail(email);
    if (!account) {
      const accountId = crypto.randomUUID();
      account = await this.repo.createAccount(accountId, email, timestamp);
    } else {
      if (account.status === 'suspended') {
        throw new Error(AUTH_ERRORS.ACCOUNT_SUSPENDED);
      }
      await this.repo.updateAccountLastLogin(account.account_id, timestamp);
    }

    return { accountId: account.account_id, email: account.email };
  }

  /**
   * Cryptographically verifies Google ID token and resolves/links user account safely.
   */
  async authenticateGoogle(
    idToken: string,
    expectedClientId?: string,
    now: Date = new Date()
  ): Promise<{ accountId: string; email: string }> {
    const timestamp = now.toISOString();

    // 1. Cryptographically verify Google ID Token (signature, iss, aud, exp, sub, email, email_verified)
    const verifiedPayload = await this.googleJwksService.verifyIdToken(idToken, expectedClientId);
    const { sub, email, name } = verifiedPayload;

    // 2. Safe Identity Lookup: Check if Google identity (provider='google', provider_subject=sub) already exists
    let account = await this.repo.findAccountByIdentity('google', sub);

    if (account) {
      // Existing Google-linked account found
      if (account.status === 'suspended') {
        throw new Error(AUTH_ERRORS.ACCOUNT_SUSPENDED);
      }
      await this.repo.updateAccountLastLogin(account.account_id, timestamp);
    } else {
      // Identity not linked yet. Check if account with verified email already exists
      const existingAccount = await this.repo.findAccountByEmail(email);

      if (existingAccount) {
        // Safe Account Linking: Link existing verified email account to Google identity
        account = existingAccount;
        if (account.status === 'suspended') {
          throw new Error(AUTH_ERRORS.ACCOUNT_SUSPENDED);
        }
        await this.repo.createAccountIdentity(crypto.randomUUID(), account.account_id, 'google', sub, timestamp);
        await this.repo.updateAccountLastLogin(account.account_id, timestamp);
      } else {
        // New user: Create new account and link Google identity
        const accountId = crypto.randomUUID();
        account = await this.repo.createAccount(accountId, email, timestamp);
        await this.repo.createAccountIdentity(crypto.randomUUID(), account.account_id, 'google', sub, timestamp);
      }
    }

    // 3. Ensure User Profile: Initialize or update user_profiles with Google name if profile is missing/default
    await this.repo.ensureUserProfile(account.account_id, name, timestamp);

    await this.repo.logAuditEvent(
      crypto.randomUUID(),
      account.account_id,
      'GOOGLE_AUTH',
      JSON.stringify({ email: account.email, sub }),
      timestamp
    );

    return { accountId: account.account_id, email: account.email };
  }
}
