export interface OtpEmailContent {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export function generateOtpEmailContent(otp: string): OtpEmailContent {
  const subject = 'Your Student OS verification code';

  const textContent = `Student OS

Your verification code is: ${otp}

This code will expire in 5 minutes.

If you did not request this code, you can safely ignore this email.`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student OS Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); padding: 32px; text-align: left;">
          <tr>
            <td style="padding-bottom: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #09090b; letter-spacing: -0.5px;">Student OS</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #27272a;">Your verification code</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">
                Use the verification code below to complete your authentication.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="background-color: #f4f4f5; border: 1px dashed #d4d4d8; border-radius: 8px; padding: 16px 24px; display: inline-block;">
                <span style="font-family: 'SF Mono', 'Roboto Mono', Monaco, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #09090b;">${otp}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 18px;">
                This code will expire in <strong>5 minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #f4f4f5; padding-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 16px;">
                If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, htmlContent, textContent };
}
