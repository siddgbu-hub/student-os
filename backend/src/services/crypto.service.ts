import * as jose from 'jose';

export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateNumericOtp(length: number = 6): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += (array[i] % 10).toString();
  }
  return otp;
}

export async function signJwt(
  payload: { accountId: string; sessionId: string; deviceId: string },
  secret: string,
  expirationInDays: number = 30
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirationInDays}d`)
    .sign(secretKey);
}

export async function createHmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyJwt(
  token: string,
  secret: string
): Promise<{ accountId: string; sessionId: string; deviceId: string } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return {
      accountId: payload.accountId as string,
      sessionId: payload.sessionId as string,
      deviceId: payload.deviceId as string,
    };
  } catch {
    return null;
  }
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
