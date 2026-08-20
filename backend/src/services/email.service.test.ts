import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrevoEmailService } from './email.service.js';
import { generateOtpEmailContent } from './otp-email.template.js';

describe('OtpEmailTemplate', () => {
  it('generates email subject, HTML, and text content with Student OS branding and OTP', () => {
    const otp = '123456';
    const content = generateOtpEmailContent(otp);

    expect(content.subject).toBe('Your Student OS verification code');
    expect(content.textContent).toContain('Student OS');
    expect(content.textContent).toContain('123456');
    expect(content.textContent).toContain('5 minutes');

    expect(content.htmlContent).toContain('Student OS');
    expect(content.htmlContent).toContain('123456');
    expect(content.htmlContent).toContain('5 minutes');
    expect(content.htmlContent).not.toContain('undefined');
  });
});

describe('BrevoEmailService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends email using native fetch with correct Brevo headers and body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ messageId: '<test-message-id>' }),
    });
    globalThis.fetch = mockFetch;

    const emailService = new BrevoEmailService('test-api-key', 'noreply@studentos.kryvlance.in', 'Student OS');
    await emailService.sendOtpEmail('test@example.com', '654321');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': 'test-api-key',
    });

    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.sender).toEqual({ name: 'Student OS', email: 'noreply@studentos.kryvlance.in' });
    expect(parsedBody.to).toEqual([{ email: 'test@example.com' }]);
    expect(parsedBody.subject).toBe('Your Student OS verification code');
    expect(parsedBody.htmlContent).toContain('654321');
    expect(parsedBody.textContent).toContain('654321');
  });

  it('throws an error if BREVO_API_KEY is missing', async () => {
    const emailService = new BrevoEmailService(undefined, 'noreply@studentos.kryvlance.in', 'Student OS');
    await expect(emailService.sendOtpEmail('test@example.com', '123456')).rejects.toThrow(
      'Email service configuration missing'
    );
  });

  it('throws an error if BREVO_FROM_EMAIL or BREVO_FROM_NAME is missing', async () => {
    const emailService = new BrevoEmailService('test-api-key', undefined, undefined);
    await expect(emailService.sendOtpEmail('test@example.com', '123456')).rejects.toThrow(
      'Email service sender configuration missing'
    );
  });

  it('throws an error if Brevo API returns non-OK status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const emailService = new BrevoEmailService('bad-key', 'noreply@studentos.kryvlance.in', 'Student OS');
    await expect(emailService.sendOtpEmail('test@example.com', '123456')).rejects.toThrow(
      'Email provider error (status 401)'
    );
  });
});
