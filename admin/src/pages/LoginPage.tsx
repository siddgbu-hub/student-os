import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shield, Mail, KeyRound, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { Button } from '../components/ui/Button.js';

export const LoginPage: React.FC = () => {
  const { status, sendOtp, loginWithOtp, error: authError } = useAdminAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // If already authenticated, redirect to SOCC dashboard
  if (status === 'authenticated') {
    return <Navigate to="/overview" replace />;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setLocalError(null);
    setInfoMessage(null);

    const result = await sendOtp(email.trim().toLowerCase());
    setLoading(false);

    if (result.success) {
      setStep('otp');
      setCountdown(30);
      setInfoMessage(result.message || `Verification code sent to ${email.trim().toLowerCase()}`);
    } else {
      setLocalError(result.error || 'Failed to send verification code. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setLocalError(null);

    const result = await sendOtp(email.trim().toLowerCase());
    setLoading(false);

    if (result.success) {
      setCountdown(30);
      setInfoMessage('New verification code sent to your email.');
    } else {
      setLocalError(result.error || 'Failed to resend code.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setLocalError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setLocalError(null);

    const success = await loginWithOtp(email.trim().toLowerCase(), cleanOtp);
    setLoading(false);

    if (success) {
      navigate('/overview', { replace: true });
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/40 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Student OS Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">SOCC V1 — Internal Owner Control Console</p>
        </div>

        {/* Authentication Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          {step === 'email' ? (
            /* STEP 1: Enter Email */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Owner / Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Verification codes are sent directly to your registered email. Only accounts with Owner or Admin RBAC permissions can access this console.
                </p>
              </div>

              {displayError && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{displayError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full justify-center py-2.5 mt-2"
              >
                Send Verification Code
              </Button>
            </form>
          ) : (
            /* STEP 2: Enter OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Recipient summary & back button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Code sent to <strong className="text-white">{email}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setLocalError(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Change
                </button>
              </div>

              <div>
                <label htmlFor="admin-otp" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono tracking-widest text-center"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {infoMessage && !displayError && (
                <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded-lg">
                  {infoMessage}
                </div>
              )}

              {displayError && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{displayError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full justify-center py-2.5 mt-2"
              >
                Verify & Enter SOCC
              </Button>

              <div className="pt-2 text-center">
                {countdown > 0 ? (
                  <span className="text-xs text-slate-500">
                    Resend code in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resend Verification Code
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          Student OS Internal Production Infrastructure • Strict Server-Side RBAC Active
        </p>
      </div>
    </div>
  );
};
