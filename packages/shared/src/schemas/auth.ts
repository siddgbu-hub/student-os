import { z } from 'zod';

export const SendOtpSchema = z.object({
  email: z.string().email('Invalid email address format'),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email('Invalid email address format'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain numbers only'),
  deviceId: z.string().min(1, 'Device ID is required'),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
});

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID Token is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
});
