import { generateOtpEmailContent } from './otp-email.template.js';

export interface EmailService {
  sendOtpEmail(email: string, otp: string): Promise<void>;
}

export class BrevoEmailService implements EmailService {
  private apiKey?: string;
  private senderEmail: string;
  private senderName: string;

  constructor(apiKey?: string, senderEmail?: string, senderName?: string) {
    this.apiKey = apiKey;
    this.senderEmail = senderEmail || 'studentos.apk@gmail.com';
    this.senderName = senderName || 'Student OS';
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    if (!this.apiKey) {
      console.error('[BrevoEmailService] Missing BREVO_API_KEY configuration');
      throw new Error('Email service configuration missing');
    }

    const template = generateOtpEmailContent(otp);

    const payload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [
        {
          email: email.toLowerCase(),
        },
      ],
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
    };

    let response: Response;
    try {
      response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      console.error(`[BrevoEmailService] Network failure sending email: ${message}`);
      throw new Error('Email delivery network failure');
    }

    if (!response.ok) {
      console.error(
        `[BrevoEmailService] Brevo API error status: ${response.status} ${response.statusText}`
      );
      throw new Error(`Email provider error (status ${response.status})`);
    }
  }
}
