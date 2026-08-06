export type AuthProvider = 'email_otp' | 'google';

export type AuthState = 'unauthenticated' | 'otp_pending' | 'authenticated' | 'session_expired';

export interface UserAccount {
  accountId: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserSession {
  sessionId: string;
  accountId: string;
  deviceId: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserDevice {
  deviceId: string;
  accountId: string;
  deviceModel: string;
  osVersion: string;
  isActive: boolean;
  registeredAt: string;
  lastActiveAt: string;
}

export interface VerificationRequest {
  id: string;
  target: string;
  purpose: 'email_otp' | 'device_verification' | 'email_change';
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  verifiedAt: string | null;
}

export interface SendOtpRequestDTO {
  email: string;
}

export interface VerifyOtpRequestDTO {
  email: string;
  otp: string;
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
}

export interface GoogleAuthRequestDTO {
  idToken: string;
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
}

export interface AuthResponseDTO {
  success: boolean;
  token?: string;
  sessionId?: string;
  account?: UserAccount;
  deviceStatus?: {
    deviceId: string;
    isActive: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
