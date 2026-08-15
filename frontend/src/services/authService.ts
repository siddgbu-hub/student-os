import { AuthResponseDTO } from '@student-os/shared';
import { API_BASE_URL } from '@/config/api';

export interface DeviceInfo {
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
}

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('student_os_device_id');
  if (!deviceId || !deviceId.startsWith('web-client-')) {
    deviceId = 'web-client-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('student_os_device_id', deviceId);
  }
  return deviceId;
}

export function getWebDeviceMetadata(): { deviceModel: string; osVersion: string } {
  let platform = 'Web';
  if (typeof navigator !== 'undefined') {
    const nav = navigator as { userAgentData?: { platform?: string }; platform?: string };
    platform = nav.userAgentData?.platform || nav.platform || 'Web';
  }
  return {
    deviceModel: 'Web Browser',
    osVersion: platform,
  };
}

const API_BASE = `${API_BASE_URL}/api/v1/auth`;

export async function sendEmailOtp(email: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/email/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: '', error: data.error?.message || 'Failed to send OTP' };
    }
    return { success: true, message: data.message || 'OTP sent' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, message: '', error: msg };
  }
}

export async function verifyEmailOtp(email: string, otp: string, device: DeviceInfo): Promise<AuthResponseDTO> {
  try {
    const meta = getWebDeviceMetadata();
    const res = await fetch(`${API_BASE}/email/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': device.deviceId,
      },
      body: JSON.stringify({
        email,
        otp,
        deviceId: device.deviceId,
        deviceModel: device.deviceModel || meta.deviceModel,
        osVersion: device.osVersion || meta.osVersion,
      }),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network request failed';
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: msg },
      timestamp: new Date().toISOString(),
    };
  }
}

export async function authenticateGoogle(idToken: string, device: DeviceInfo): Promise<AuthResponseDTO> {
  try {
    const meta = getWebDeviceMetadata();
    const res = await fetch(`${API_BASE}/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': device.deviceId,
      },
      body: JSON.stringify({
        idToken,
        deviceId: device.deviceId,
        deviceModel: device.deviceModel || meta.deviceModel,
        osVersion: device.osVersion || meta.osVersion,
      }),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network request failed';
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: msg },
      timestamp: new Date().toISOString(),
    };
  }
}

export async function validateSessionApi(token: string, deviceId: string): Promise<AuthResponseDTO> {
  try {
    const res = await fetch(`${API_BASE}/session/validate`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-device-id': deviceId,
      },
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: msg },
      timestamp: new Date().toISOString(),
    };
  }
}

export async function logoutApi(token: string, deviceId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/session/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-device-id': deviceId,
      },
    });
  } catch {
    // Ignore network failures on logout
  }
}
