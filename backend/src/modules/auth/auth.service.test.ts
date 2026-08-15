import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { AuthRepository, AccountRecord, VerificationRecord, AccountIdentityRecord } from '../../db/auth.repository.js';
import { EmailService } from '../../services/email.service.js';
import { GoogleJwksService, VerifiedGoogleTokenPayload } from '../../services/google-jwks.service.js';
import { hashString } from '../../services/crypto.service.js';
import { AUTH_ERRORS } from '@student-os/shared';

class MockAuthRepository {
  public accounts: AccountRecord[] = [];
  public verifications: VerificationRecord[] = [];
  public identities: AccountIdentityRecord[] = [];
  public profiles: Array<{ account_id: string; full_name: string }> = [];
  public auditLogs: Array<{ id: string; accountId: string | null; eventType: string; details: string; createdAt: string }> = [];

  async ensureUserProfile(accountId: string, googleName: string | undefined): Promise<void> {
    const existing = this.profiles.find((p) => p.account_id === accountId);
    const nameToSet = googleName && googleName.trim() !== '' ? googleName.trim() : 'Student';

    if (!existing) {
      this.profiles.push({ account_id: accountId, full_name: nameToSet });
    } else {
      const currentName = existing.full_name.trim();
      if ((currentName === '' || currentName.toLowerCase() === 'student') && googleName && googleName.trim() !== '') {
        existing.full_name = googleName.trim();
      }
    }
  }

  async findAccountByIdentity(provider: string, providerSubject: string): Promise<AccountRecord | null> {
    const ident = this.identities.find((i) => i.provider === provider && i.provider_subject === providerSubject);
    if (!ident) return null;
    return this.accounts.find((a) => a.account_id === ident.account_id) || null;
  }

  async createAccountIdentity(
    identityId: string,
    accountId: string,
    provider: string,
    providerSubject: string,
    timestamp: string
  ): Promise<void> {
    this.identities.push({
      identity_id: identityId,
      account_id: accountId,
      provider,
      provider_subject: providerSubject,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  async findAccountByEmail(email: string): Promise<AccountRecord | null> {
    const acc = this.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    return acc || null;
  }

  async findAccountById(accountId: string): Promise<AccountRecord | null> {
    const acc = this.accounts.find((a) => a.account_id === accountId);
    return acc || null;
  }

  async createAccount(accountId: string, email: string, timestamp: string): Promise<AccountRecord> {
    const acc: AccountRecord = {
      account_id: accountId,
      email: email.toLowerCase(),
      created_at: timestamp,
      last_login_at: timestamp,
    };
    this.accounts.push(acc);
    return acc;
  }

  async updateAccountLastLogin(accountId: string, timestamp: string): Promise<void> {
    const acc = this.accounts.find((a) => a.account_id === accountId);
    if (acc) acc.last_login_at = timestamp;
  }

  async createVerificationRequest(
    id: string,
    target: string,
    purpose: string,
    tokenHash: string,
    expiresAt: string,
    createdAt: string
  ): Promise<void> {
    this.verifications.push({
      id,
      target: target.toLowerCase(),
      purpose,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: createdAt,
      verified_at: null,
    });
  }

  async invalidatePendingOtps(target: string, purpose: string, timestamp: string): Promise<void> {
    for (const v of this.verifications) {
      if (v.target.toLowerCase() === target.toLowerCase() && v.purpose === purpose && v.verified_at === null) {
        v.verified_at = `SUPERSEDED_${timestamp}`;
      }
    }
  }

  async findLatestUnverifiedRequest(target: string, purpose: string): Promise<VerificationRecord | null> {
    const matches = this.verifications
      .filter((v) => v.target.toLowerCase() === target.toLowerCase() && v.purpose === purpose && v.verified_at === null)
      .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    return matches[0] || null;
  }

  async markVerificationAsVerified(id: string, verifiedAt: string): Promise<void> {
    const v = this.verifications.find((req) => req.id === id);
    if (v) v.verified_at = verifiedAt;
  }

  async getRecentOtpCount(target: string, windowStart: string): Promise<number> {
    return this.verifications.filter(
      (v) => v.target.toLowerCase() === target.toLowerCase() && v.purpose === 'email_otp' && v.created_at >= windowStart
    ).length;
  }

  async logAuditEvent(id: string, accountId: string | null, eventType: string, details: string, timestamp: string): Promise<void> {
    this.auditLogs.push({ id, accountId, eventType, details, createdAt: timestamp });
  }
}

describe('AuthService — Production Email OTP Delivery', () => {
  let mockRepo: MockAuthRepository;
  let mockEmailService: EmailService;
  let authService: AuthService;
  let sentEmails: Array<{ email: string; otp: string }>;

  beforeEach(() => {
    mockRepo = new MockAuthRepository();
    sentEmails = [];
    mockEmailService = {
      sendOtpEmail: vi.fn(async (email: string, otp: string) => {
        sentEmails.push({ email, otp });
      }),
    };
    authService = new AuthService(mockRepo as unknown as AuthRepository, mockEmailService);
  });

  it('1. Successful OTP request: generates OTP, stores hash in D1, calls emailService once, and never stores plaintext OTP', async () => {
    const email = 'student@example.com';
    const now = new Date('2026-08-08T12:00:00Z');

    const result = await authService.sendOtp(email, now);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Verification code sent if email is valid');
    expect(result).not.toHaveProperty('otp');

    expect(mockEmailService.sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].email).toBe(email);
    expect(sentEmails[0].otp).toMatch(/^\d{6}$/);

    expect(mockRepo.verifications).toHaveLength(1);
    const record = mockRepo.verifications[0];
    expect(record.target).toBe(email);
    expect(record.token_hash).not.toBe(sentEmails[0].otp);
    expect(record.token_hash).toBe(await hashString(sentEmails[0].otp));
    expect(record.verified_at).toBeNull();
  });

  it('2. Email provider failure: sendOtpEmail throws -> invalidates pending request, throws AUTH_EMAIL_DELIVERY_FAILED, and does not leak OTP', async () => {
    const failingEmailService: EmailService = {
      sendOtpEmail: vi.fn(async () => {
        throw new Error('Brevo API Connection Timeout');
      }),
    };
    const failingAuthService = new AuthService(mockRepo as unknown as AuthRepository, failingEmailService);

    const email = 'fail@example.com';
    const now = new Date('2026-08-08T12:00:00Z');

    await expect(failingAuthService.sendOtp(email, now)).rejects.toThrow(AUTH_ERRORS.EMAIL_DELIVERY_FAILED);

    expect(mockRepo.verifications).toHaveLength(1);
    expect(mockRepo.verifications[0].verified_at).toContain('SUPERSEDED');
  });

  it('3. Rate limiting: 4th request within 15-minute window throws TOO_MANY_REQUESTS', async () => {
    const email = 'rate@example.com';
    const baseTime = new Date('2026-08-08T12:00:00Z');

    await authService.sendOtp(email, new Date(baseTime.getTime() + 1000));
    await authService.sendOtp(email, new Date(baseTime.getTime() + 2000));
    await authService.sendOtp(email, new Date(baseTime.getTime() + 3000));

    await expect(authService.sendOtp(email, new Date(baseTime.getTime() + 4000))).rejects.toThrow(
      AUTH_ERRORS.TOO_MANY_REQUESTS
    );
  });

  it('4. Previous OTP invalidation: requesting a new OTP invalidates previous pending OTP', async () => {
    const email = 'invalidate@example.com';
    const now1 = new Date('2026-08-08T12:00:00Z');
    const now2 = new Date('2026-08-08T12:01:00Z');

    await authService.sendOtp(email, now1);
    const firstOtp = sentEmails[0].otp;
    const firstRecord = mockRepo.verifications[0];
    expect(firstRecord.verified_at).toBeNull();

    await authService.sendOtp(email, now2);
    expect(firstRecord.verified_at).toContain('SUPERSEDED');
    expect(mockRepo.verifications[1].verified_at).toBeNull();

    await expect(authService.verifyOtp(email, firstOtp, now2)).rejects.toThrow('AUTH_INVALID_OTP');
  });

  it('5. Successful OTP verification: authenticates correctly and provisions account', async () => {
    const email = 'user@example.com';
    const now = new Date('2026-08-08T12:00:00Z');

    await authService.sendOtp(email, now);
    const otp = sentEmails[0].otp;

    const verifyResult = await authService.verifyOtp(email, otp, new Date('2026-08-08T12:02:00Z'));
    expect(verifyResult.email).toBe(email);
    expect(verifyResult.accountId).toBeDefined();

    const account = await mockRepo.findAccountByEmail(email);
    expect(account).not.toBeNull();
    expect(account?.account_id).toBe(verifyResult.accountId);
  });

  it('6. Expired OTP: OTP past 5-minute expiration window is rejected', async () => {
    const email = 'expired@example.com';
    const sendTime = new Date('2026-08-08T12:00:00Z');
    const verifyTime = new Date('2026-08-08T12:06:00Z');

    await authService.sendOtp(email, sendTime);
    const otp = sentEmails[0].otp;

    await expect(authService.verifyOtp(email, otp, verifyTime)).rejects.toThrow('AUTH_OTP_EXPIRED');
  });

  it('7. Invalid OTP: wrong OTP code is rejected', async () => {
    const email = 'wrong@example.com';
    const now = new Date('2026-08-08T12:00:00Z');

    await authService.sendOtp(email, now);

    await expect(authService.verifyOtp(email, '000000', now)).rejects.toThrow('AUTH_INVALID_OTP');
  });
});

describe('AuthService — Cryptographic Google Sign-In', () => {
  let mockRepo: MockAuthRepository;
  let mockJwksService: GoogleJwksService;
  let authService: AuthService;

  beforeEach(() => {
    mockRepo = new MockAuthRepository();
    mockJwksService = {
      verifyIdToken: vi.fn(),
    } as unknown as GoogleJwksService;

    authService = new AuthService(mockRepo as unknown as AuthRepository, undefined, mockJwksService);
  });

  it('1. Valid Google ID token -> authentication succeeds and creates new account + google identity', async () => {
    const validPayload: VerifiedGoogleTokenPayload = {
      sub: 'google-sub-12345',
      email: 'newuser@example.com',
      email_verified: true,
    };
    vi.spyOn(mockJwksService, 'verifyIdToken').mockResolvedValue(validPayload);

    const result = await authService.authenticateGoogle('valid.google.idtoken', 'test-client-id');

    expect(result.email).toBe('newuser@example.com');
    expect(result.accountId).toBeDefined();

    // Check account identity created
    expect(mockRepo.identities).toHaveLength(1);
    expect(mockRepo.identities[0].provider).toBe('google');
    expect(mockRepo.identities[0].provider_subject).toBe('google-sub-12345');
    expect(mockRepo.identities[0].account_id).toBe(result.accountId);
  });

  it('2. Invalid JWT signature / format / expired token -> rejected with AUTH_INVALID_GOOGLE_TOKEN', async () => {
    vi.spyOn(mockJwksService, 'verifyIdToken').mockRejectedValue(new Error(AUTH_ERRORS.INVALID_GOOGLE_TOKEN));

    await expect(authService.authenticateGoogle('invalid-signature-token')).rejects.toThrow(
      AUTH_ERRORS.INVALID_GOOGLE_TOKEN
    );

    expect(mockRepo.accounts).toHaveLength(0);
    expect(mockRepo.identities).toHaveLength(0);
  });

  it('3. Unverified email (email_verified: false) -> rejected with AUTH_GOOGLE_EMAIL_NOT_VERIFIED', async () => {
    vi.spyOn(mockJwksService, 'verifyIdToken').mockRejectedValue(
      new Error(AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED)
    );

    await expect(authService.authenticateGoogle('unverified-email-token')).rejects.toThrow(
      AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED
    );

    expect(mockRepo.accounts).toHaveLength(0);
    expect(mockRepo.identities).toHaveLength(0);
  });

  it('4. Attempting to use arbitrary email string / fake mock token -> MUST fail', async () => {
    vi.spyOn(mockJwksService, 'verifyIdToken').mockRejectedValue(new Error(AUTH_ERRORS.INVALID_GOOGLE_TOKEN));

    const fakeMockToken = 'google-id-token.eyJlbWFpbCI6InZpY3RpbUBleGFtcGxlLmNvbSJ9.signature';

    await expect(authService.authenticateGoogle(fakeMockToken)).rejects.toThrow(AUTH_ERRORS.INVALID_GOOGLE_TOKEN);

    expect(mockRepo.accounts).toHaveLength(0);
    expect(mockRepo.identities).toHaveLength(0);
  });

  it('5. Account Takeover attempt via raw email string -> MUST fail', async () => {
    // Setup existing victim account
    await mockRepo.createAccount('victim-acc-id', 'victim@example.com', new Date().toISOString());

    vi.spyOn(mockJwksService, 'verifyIdToken').mockRejectedValue(new Error(AUTH_ERRORS.INVALID_GOOGLE_TOKEN));

    await expect(authService.authenticateGoogle('victim@example.com')).rejects.toThrow(
      AUTH_ERRORS.INVALID_GOOGLE_TOKEN
    );
  });

  it('6. Existing Google identity -> authenticates existing linked account', async () => {
    const timestamp = new Date().toISOString();
    const existingAcc = await mockRepo.createAccount('existing-acc-123', 'existing@example.com', timestamp);
    await mockRepo.createAccountIdentity('ident-1', existingAcc.account_id, 'google', 'google-sub-999', timestamp);

    vi.spyOn(mockJwksService, 'verifyIdToken').mockResolvedValue({
      sub: 'google-sub-999',
      email: 'existing@example.com',
      email_verified: true,
    });

    const result = await authService.authenticateGoogle('valid-token-existing');

    expect(result.accountId).toBe(existingAcc.account_id);
    expect(result.email).toBe('existing@example.com');
    expect(mockRepo.identities).toHaveLength(1); // No duplicate identities created
  });

  it('7. Safe account linking: New Google identity + existing verified email -> links to existing account', async () => {
    const timestamp = new Date().toISOString();
    const existingOtpAccount = await mockRepo.createAccount('otp-acc-456', 'user@university.edu', timestamp);

    vi.spyOn(mockJwksService, 'verifyIdToken').mockResolvedValue({
      sub: 'new-google-sub-777',
      email: 'user@university.edu',
      email_verified: true,
    });

    const result = await authService.authenticateGoogle('valid-token-new-sub');

    expect(result.accountId).toBe(existingOtpAccount.account_id);
    expect(result.email).toBe('user@university.edu');

    // New Google identity linked to existing account
    expect(mockRepo.identities).toHaveLength(1);
    expect(mockRepo.identities[0].account_id).toBe(existingOtpAccount.account_id);
    expect(mockRepo.identities[0].provider_subject).toBe('new-google-sub-777');
  });

  it('8. New Google user with name -> user_profiles.full_name initialized with Google name', async () => {
    vi.spyOn(mockJwksService, 'verifyIdToken').mockResolvedValue({
      sub: 'google-sub-name-1',
      email: 'siddhant@example.com',
      email_verified: true,
      name: 'Siddhant Singh',
    });

    const result = await authService.authenticateGoogle('valid-token-with-name');
    const profile = mockRepo.profiles.find((p) => p.account_id === result.accountId);

    expect(profile).toBeDefined();
    expect(profile?.full_name).toBe('Siddhant Singh');
  });

  it('9. Existing Google user with full_name = "Student" -> full_name populated with Google name', async () => {
    const timestamp = new Date().toISOString();
    const acc = await mockRepo.createAccount('acc-student-default', 'student@example.com', timestamp);
    await mockRepo.createAccountIdentity('ident-sub-2', acc.account_id, 'google', 'google-sub-student-2', timestamp);
    mockRepo.profiles.push({ account_id: acc.account_id, full_name: 'Student' });

    vi.spyOn(mockJwksService, 'verifyIdToken').mockResolvedValue({
      sub: 'google-sub-student-2',
      email: 'student@example.com',
      email_verified: true,
      name: 'Siddhant Singh',
    });

    await authService.authenticateGoogle('valid-token-student-update');
    const profile = mockRepo.profiles.find((p) => p.account_id === acc.account_id);

    expect(profile?.full_name).toBe('Siddhant Singh');
  });

  it('10. Existing user with custom full_name -> custom name preserved', async () => {
    const timestamp = new Date().toISOString();
    const acc = await mockRepo.createAccount('acc-custom-name', 'custom@example.com', timestamp);
    await mockRepo.createAccountIdentity('ident-sub-3', acc.account_id, 'google', 'google-sub-custom-3', timestamp);
    mockRepo.profiles.push({ account_id: acc.account_id, full_name: 'Alex Custom Dev' });

    vi.spyOn(mockJwksService, 'verifyIdToken').mockResolvedValue({
      sub: 'google-sub-custom-3',
      email: 'custom@example.com',
      email_verified: true,
      name: 'Google Name Ignored',
    });

    await authService.authenticateGoogle('valid-token-custom');
    const profile = mockRepo.profiles.find((p) => p.account_id === acc.account_id);

    expect(profile?.full_name).toBe('Alex Custom Dev');
  });

  it('11. Google token without name -> auth succeeds and falls back to default "Student"', async () => {
    vi.spyOn(mockJwksService, 'verifyIdToken').mockResolvedValue({
      sub: 'google-sub-no-name',
      email: 'noname@example.com',
      email_verified: true,
    });

    const result = await authService.authenticateGoogle('valid-token-no-name');
    const profile = mockRepo.profiles.find((p) => p.account_id === result.accountId);

    expect(profile).toBeDefined();
    expect(profile?.full_name).toBe('Student');
  });
});
