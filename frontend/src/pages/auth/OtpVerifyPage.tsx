import React, { useState } from 'react';
import { Button } from '@student-os/ui';
import { useAuth } from '../../context/AuthContext.js';

export const OtpVerifyPage: React.FC = () => {
  const { verifyOtp, requestOtp, pendingEmail, errorMessage, isLoading } = useAuth();
  const [otp, setOtp] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    await verifyOtp(otp);
  };

  const handleResend = async () => {
    if (pendingEmail) {
      await requestOtp(pendingEmail);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-sm)' }}>Enter Verification Code</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
        We sent a 6-digit code to <strong>{pendingEmail}</strong>.
      </p>

      {errorMessage && (
        <div style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', fontSize: 'var(--font-size-sm)' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>6-Digit OTP</label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            required
            style={{ width: '100%', textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <Button type="submit" variant="primary" disabled={isLoading || otp.length !== 6} style={{ width: '100%' }}>
          {isLoading ? 'Verifying...' : 'Verify Code & Continue'}
        </Button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
        <button
          type="button"
          onClick={handleResend}
          disabled={isLoading}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
        >
          Didn't receive code? Resend
        </button>
      </div>
    </div>
  );
};
