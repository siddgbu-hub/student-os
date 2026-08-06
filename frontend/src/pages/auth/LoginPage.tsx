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
    // Demo ID Token for verification testing in Milestone 2
    const mockIdToken = `google-id-token.${btoa(JSON.stringify({ email: email || 'student@example.com' }))}.signature`;
    await loginWithGoogle(mockIdToken);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-sm)' }}>Student OS Login</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
        Sign in to access your offline academic workspace.
      </p>

      {deviceMessage && (
        <div style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: 'var(--font-size-sm)' }}>
          {deviceMessage}
          <button onClick={clearDeviceMessage} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', fontSize: 'var(--font-size-sm)' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            required
            style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}
          />
        </div>
        <Button type="submit" variant="primary" disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? 'Sending Code...' : 'Send Verification Code'}
        </Button>
      </form>

      <div style={{ textAlign: 'center', margin: 'var(--spacing-lg) 0', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>OR</div>

      <Button type="button" variant="secondary" onClick={handleGoogleClick} disabled={isLoading} style={{ width: '100%' }}>
        Sign In with Google
      </Button>
    </div>
  );
};
