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
