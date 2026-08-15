import { describe, it, expect } from 'vitest';
import { inferDevicePlatform } from './admin.repository.js';

describe('inferDevicePlatform — Phase 13 Device Platform Inference', () => {
  it('1. identifies android-native- prefix as android platform', () => {
    expect(inferDevicePlatform('android-native-abc123', 'Samsung Galaxy A56')).toBe('android');
  });

  it('2. identifies android- prefix as android platform', () => {
    expect(inferDevicePlatform('android-device-xyz', null)).toBe('android');
  });

  it('3. identifies web- prefix as web platform', () => {
    expect(inferDevicePlatform('web-browser-session', 'Web Browser')).toBe('web');
  });

  it('4. identifies web- prefix even without matching model', () => {
    expect(inferDevicePlatform('web-chrome-desktop', null)).toBe('web');
  });

  it('5. identifies admin-web-console device ID as admin platform', () => {
    expect(inferDevicePlatform('admin-web-console', 'SOCC Web Console')).toBe('admin');
  });

  it('6. web- prefix maps to web even with SOCC Web Console model', () => {
    expect(inferDevicePlatform('web-socc-session', 'SOCC Web Console')).toBe('web');
  });

  it('7. returns unknown for unrecognized device IDs with no model', () => {
    expect(inferDevicePlatform('device-unknown-type', null)).toBe('unknown');
  });

  it('8. returns unknown for empty device ID', () => {
    expect(inferDevicePlatform('', null)).toBe('unknown');
  });

  it('9. identifies Samsung device model as android even without android- prefix', () => {
    expect(inferDevicePlatform('legacy-device-1', 'Samsung Galaxy M52')).toBe('android');
  });

  it('10. SOCC Web Console model on web- device is classified as web, not admin', () => {
    expect(inferDevicePlatform('web-admin-session', 'SOCC Web Console')).toBe('web');
  });
});
