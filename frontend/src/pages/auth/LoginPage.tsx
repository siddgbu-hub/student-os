import React, { useState } from 'react';
import { Button } from '@student-os/ui';
import { useAuth } from '../../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const { requestOtp, loginWithGoogle, errorMessage, deviceMessage, clearDeviceMessage, isLoading } = useAuth();
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await requestOtp(email);
  };

  const handleGoogleClick = async () => {
    // Demo ID Token for verification testing
    const mockIdToken = `google-id-token.${btoa(JSON.stringify({ email: email || 'student@example.com' }))}.signature`;
    await loginWithGoogle(mockIdToken);
  };

  return (
    <div
      style={{
        maxWidth: '420px',
        margin: '4rem auto',
        padding: 'var(--spacing-xl)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        fontFamily: 'var(--font-family-base)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
            display: 'block',
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          Student OS
        </span>
        <h2
          style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: '700',
            marginBottom: 'var(--spacing-xs)',
            color: 'var(--color-text-primary)',
          }}
        >
          Welcome Back
        </h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: '1.4',
            margin: 0,
          }}
        >
          Continue with your Google account for the fastest sign in.
        </p>
      </div>

      {deviceMessage && (
        <div
          style={{
            padding: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{deviceMessage}</span>
          <button
            onClick={clearDeviceMessage}
            aria-label="Close notification"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#991b1b',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#9a3412',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Primary CTA: Google Sign-In */}
      <Button
        type="button"
        variant="primary"
        onClick={handleGoogleClick}
        disabled={isLoading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          fontWeight: '600',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path
            fill="#ffffff"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#ffffff"
            opacity="0.9"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#ffffff"
            opacity="0.8"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#ffffff"
            opacity="0.95"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Continue with Google
      </Button>

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          margin: 'var(--spacing-lg) 0',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
        <span style={{ padding: '0 var(--spacing-md)', fontWeight: '500' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
      </div>

      {/* Secondary Option: Email OTP */}
      <div>
        <h3
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: '600',
            marginBottom: 'var(--spacing-md)',
            color: 'var(--color-text-primary)',
          }}
        >
          Continue with Email
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="email-input"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--spacing-xs)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500',
              }}
            >
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? 'Sending Code...' : 'Send Verification Code'}
          </Button>
        </form>
      </div>

      {/* Footer / Terms */}
      <p
        style={{
          marginTop: 'var(--spacing-xl)',
          marginBottom: 0,
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          lineHeight: '1.4',
        }}
      >
        By continuing you agree to the Terms of Service and Privacy Policy.
      </p>
    </div>
  );
};
