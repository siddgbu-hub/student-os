import * as jose from 'jose';
import { AUTH_ERRORS } from '@student-os/shared';

const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export interface VerifiedGoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

export class GoogleJwksService {
  private jwksRemote: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

  private getGoogleJWKS() {
    if (!this.jwksRemote) {
      this.jwksRemote = jose.createRemoteJWKSet(GOOGLE_JWKS_URL);
    }
    return this.jwksRemote;
  }

  async verifyIdToken(idToken: string, expectedClientId?: string): Promise<VerifiedGoogleTokenPayload> {
    if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
      console.error('[GoogleJwksService] Verification failed: Empty or invalid idToken parameter');
      throw new Error(AUTH_ERRORS.INVALID_GOOGLE_TOKEN);
    }

    try {
      const JWKS = this.getGoogleJWKS();
      const options: jose.JWTVerifyOptions = {
        issuer: GOOGLE_ISSUERS,
      };

      if (expectedClientId && expectedClientId.trim() !== '') {
        options.audience = expectedClientId;
      }

      const { payload } = await jose.jwtVerify(idToken, JWKS, options);

      const sub = payload.sub;
      const email = payload.email as string | undefined;
      const emailVerified = payload.email_verified;
      const name = typeof payload.name === 'string' && payload.name.trim() !== '' ? payload.name.trim() : undefined;

      if (!sub || typeof sub !== 'string' || sub.trim() === '') {
        console.error('[GoogleJwksService] Verification failed: Missing or invalid sub in payload');
        throw new Error(AUTH_ERRORS.INVALID_GOOGLE_TOKEN);
      }

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        console.error('[GoogleJwksService] Verification failed: Missing or invalid email in payload');
        throw new Error(AUTH_ERRORS.INVALID_GOOGLE_TOKEN);
      }

      const isEmailVerified = emailVerified === true || (emailVerified as unknown) === 'true';
      if (!isEmailVerified) {
        console.error('[GoogleJwksService] Verification failed: email_verified is not true');
        throw new Error(AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED);
      }

      return {
        sub,
        email: email.toLowerCase(),
        email_verified: true,
        name,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === AUTH_ERRORS.GOOGLE_EMAIL_NOT_VERIFIED) {
        throw err;
      }

      // Safe Diagnostic Logging (NO sensitive tokens, emails, or secrets logged)
      try {
        const header = jose.decodeProtectedHeader(idToken);
        const unverifiedPayload = jose.decodeJwt(idToken);
        console.error('[GoogleJwksService] Verification failure details:', {
          errorName: err instanceof Error ? err.name : 'UnknownError',
          errorMessage: err instanceof Error ? err.message : String(err),
          errorCode: (err as Record<string, unknown>)?.code,
          expectedClientId,
          tokenHeader: {
            alg: header.alg,
            kid: header.kid,
            typ: header.typ,
          },
          tokenSafeClaims: {
            iss: unverifiedPayload.iss,
            aud: unverifiedPayload.aud,
            azp: unverifiedPayload.azp,
            exp: unverifiedPayload.exp,
            iat: unverifiedPayload.iat,
            email_verified: unverifiedPayload.email_verified,
          },
        });
      } catch {
        console.error('[GoogleJwksService] Verification failed & token unparseable:', err);
      }

      throw new Error(AUTH_ERRORS.INVALID_GOOGLE_TOKEN);
    }
  }
}
