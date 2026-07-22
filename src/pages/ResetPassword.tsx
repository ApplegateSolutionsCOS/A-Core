import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createSignedPayload, SECURITY_ALGORITHMS } from '@/lib/encryption';
import {
  ApplegateCoreLogo,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  CheckIcon,
  ShieldIcon,
  ClockIcon,
} from '@/components/icons/Icons';



// ─── Types ───────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'success' | 'error';
type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Animated background with hex pattern and gradient */
const PageBackground: React.FC = () => (
  <>
    <div className="fixed inset-0 bg-black" />
    <div className="fixed inset-0 bg-gradient-to-br from-cyan-950/30 via-transparent to-fuchsia-950/20 pointer-events-none" />
    <div className="fixed inset-0 hex-pattern opacity-[0.08] pointer-events-none" />
    {/* Subtle animated orbs */}
    <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
    <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
  </>
);

/** Strength bar indicator */
const StrengthIndicator: React.FC<{ strength: PasswordStrength }> = ({ strength }) => {
  const config = useMemo(() => {
    switch (strength) {
      case 'weak':
        return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-400', glow: 'shadow-red-500/30', bars: 1 };
      case 'medium':
        return { label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-400', glow: 'shadow-amber-500/30', bars: 2 };
      case 'strong':
        return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', glow: 'shadow-emerald-500/30', bars: 3 };
      default:
        return { label: '', color: 'bg-gray-700', textColor: 'text-gray-500', glow: '', bars: 0 };
    }
  }, [strength]);

  if (strength === 'empty') return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-gray-400">Password strength</span>
        <span className={`text-xs font-mono font-semibold ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              bar <= config.bars
                ? `${config.color} ${config.glow} shadow-sm`
                : 'bg-gray-700/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

/** Individual requirement check item */
const RequirementItem: React.FC<{ label: string; passed: boolean; hasInput: boolean }> = ({
  label,
  passed,
  hasInput,
}) => (
  <div className="flex items-center gap-2.5">
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
        passed
          ? 'bg-emerald-500/20 border border-emerald-500/60'
          : hasInput
          ? 'bg-red-500/10 border border-red-500/30'
          : 'bg-gray-800 border border-gray-600/40'
      }`}
    >
      {passed ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      ) : hasInput ? (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-400">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
      )}
    </div>
    <span
      className={`text-xs font-mono transition-colors duration-300 ${
        passed ? 'text-emerald-400' : hasInput ? 'text-red-400/70' : 'text-gray-500'
      }`}
    >
      {label}
    </span>
  </div>
);

/** Password input field with show/hide toggle */
const PasswordInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
  label: string;
  borderOverride?: string;
  autoComplete?: string;
}> = ({ value, onChange, show, onToggleShow, placeholder, label, borderOverride, autoComplete = 'new-password' }) => (
  <div>
    <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-black/50 border rounded-xl px-4 py-3.5 pr-12 text-white placeholder-gray-500 font-mono focus:outline-none transition-all focus:bg-black/60 ${
          borderOverride ||
          'border-cyan-500/30 focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)]'
        }`}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-cyan-400 transition-colors rounded-md hover:bg-cyan-500/10"
        tabIndex={-1}
      >
        {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState('');

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ─── Derived state ───────────────────────────────────────────────────────

  const passwordStrength = useMemo((): PasswordStrength => {
    if (!newPassword) return 'empty';
    const passed = PASSWORD_REQUIREMENTS.filter((r) => r.test(newPassword)).length;
    if (passed <= 1) return 'weak';
    if (passed <= 3) return 'medium';
    return 'strong';
  }, [newPassword]);

  const allRequirementsMet = useMemo(
    () => PASSWORD_REQUIREMENTS.every((r) => r.test(newPassword)),
    [newPassword]
  );

  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );

  const canSubmit = allRequirementsMet && passwordsMatch && !isSubmitting;

  // ─── Token verification ──────────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      setTokenError('No reset token found in the URL. Please use the link from your email.');
      return;
    }

    const verifyToken = async () => {
      try {
        // Create a timeout for the verification request
        const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
          setTimeout(() => resolve({ data: null, error: { message: 'Verification request timed out. Please try again.' } }), 15000);
        });

        const verifyPromise = supabase.functions.invoke('password-reset', {
          body: {
            action: 'verify_token',
            token,
          },
        });

        const { data, error } = await Promise.race([verifyPromise, timeoutPromise]);

        if (error) {
          console.error('[ResetPassword] Token verification error:', error);
          setPageState('invalid');
          setTokenError('Unable to verify your reset link. It may be invalid or our servers may be temporarily unavailable.');
          return;
        }

        if (!data?.success) {
          // Determine if token is expired vs invalid
          const errorMsg = data?.error || '';
          const isExpired =
            errorMsg.toLowerCase().includes('expired') ||
            errorMsg.toLowerCase().includes('expir') ||
            data?.expired === true;

          if (isExpired) {
            setPageState('expired');
            setTokenError('This password reset link has expired. Please request a new one.');
          } else {
            setPageState('invalid');
            setTokenError(
              errorMsg || 'This password reset link is invalid. Please request a new one.'
            );
          }
          return;
        }

        // Token is valid
        setUserEmail(data.email || '');
        setUserName(data.name || data.full_name || '');
        if (data.expires_at) setExpiresAt(data.expires_at);
        setPageState('valid');
      } catch (err) {
        console.error('[ResetPassword] Token verification exception:', err);
        setPageState('error');
        setTokenError('An unexpected error occurred while verifying your reset link.');
      }
    };

    verifyToken();
  }, [token]);

  // ─── Form submission ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError('');

      if (!allRequirementsMet) {
        setFormError('Please meet all password requirements before submitting.');
        return;
      }

      if (!passwordsMatch) {
        setFormError('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);

      try {
        // Try secure-auth edge function first for the password update
        const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
          setTimeout(() => resolve({ data: null, error: { message: 'Request timed out. Please try again.' } }), 20000);
        });

        const resetPromise = supabase.functions.invoke('secure-auth', {
          body: {
            action: 'reset_password',
            token,
            password: newPassword,
            email: userEmail,
          },
        });

        let { data, error: resetError } = await Promise.race([resetPromise, timeoutPromise]);

        // If secure-auth doesn't support reset_password action, fall back to password-reset function
        if (resetError || (!data?.success && data?.error?.includes?.('action'))) {
          console.log('[ResetPassword] Falling back to password-reset edge function');
          const fallbackPromise = supabase.functions.invoke('password-reset', {
            body: {
              action: 'reset',
              token,
              newPassword,
            },
          });

          const fallbackResult = await Promise.race([fallbackPromise, timeoutPromise]);
          data = fallbackResult.data;
          resetError = fallbackResult.error;
        }

        if (resetError) {
          console.error('[ResetPassword] Password reset error:', resetError);
          setFormError(
            typeof resetError === 'string'
              ? resetError
              : resetError.message || 'Failed to reset password. Please try again.'
          );
          setIsSubmitting(false);
          return;
        }

        if (!data?.success) {
          // Check for token expiration during reset
          const errorMsg = data?.error || '';
          if (errorMsg.toLowerCase().includes('expired') || data?.expired === true) {
            setPageState('expired');
            setTokenError('Your reset link expired while you were setting your password. Please request a new one.');
          } else {
            setFormError(errorMsg || 'Failed to reset password. Please try again.');
          }
          setIsSubmitting(false);
          return;
        }

        // Success!
        setPageState('success');
      } catch (err: any) {
        console.error('[ResetPassword] Password reset exception:', err);
        setFormError(err?.message || 'An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, newPassword, confirmPassword, userEmail, allRequirementsMet, passwordsMatch]
  );

  // ─── Time remaining display ──────────────────────────────────────────────

  const TimeRemaining: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      if (!expiresAt) return;

      const updateTime = () => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const diff = expiry - now;

        if (diff <= 0) {
          setPageState('expired');
          setTokenError('Your reset link has expired. Please request a new one.');
          return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (minutes > 60) {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          setTimeLeft(`${hours}h ${remainingMinutes}m remaining`);
        } else {
          setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`);
        }
      };

      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }, []);

    if (!timeLeft) return null;

    return (
      <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400/70">
        <ClockIcon size={12} className="text-amber-400/50" />
        <span>Link expires in {timeLeft}</span>
      </div>
    );
  };

  // ─── Render: Loading ─────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <>
        <PageBackground />
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute -inset-4 bg-cyan-400/10 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
            <p className="text-cyan-400 font-mono text-sm">Verifying your reset link...</p>
            <p className="text-gray-500 font-mono text-xs mt-2">This should only take a moment</p>
          </div>
        </div>
      </>
    );
  }

  // ─── Render: Invalid Token ───────────────────────────────────────────────

  if (pageState === 'invalid') {
    return (
      <>
        <PageBackground />
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.12)]">
              <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-slate-900/95 to-slate-950/90" />
              <div className="absolute inset-0 bg-black/70" />
              <div className="absolute inset-0 rounded-2xl border border-red-500/25" />

              <div className="relative p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute -inset-4 bg-red-500/10 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
                    <AlertCircleIcon size={40} className="text-red-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-white font-mono mb-3">Invalid Reset Link</h1>
                <p className="text-gray-400 font-mono text-sm mb-6 leading-relaxed">
                  {tokenError}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/')}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/50 text-cyan-300 font-semibold font-mono rounded-xl hover:from-cyan-500/30 hover:to-blue-600/30 hover:border-cyan-400/70 hover:text-white transition-all shadow-[0_0_25px_rgba(0,200,255,0.1)] hover:shadow-[0_0_35px_rgba(0,200,255,0.2)]"
                  >
                    Return to Home
                  </button>
                  <button
                    onClick={() => navigate('/?action=forgot-password')}
                    className="w-full py-3 bg-transparent border border-gray-700 text-gray-400 font-mono text-sm rounded-xl hover:bg-gray-800/50 hover:border-gray-600 hover:text-gray-300 transition-all"
                  >
                    Request New Reset Link
                  </button>
                </div>

                <div className="mt-6 pt-5 border-t border-red-500/15">
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-mono">
                    <ShieldIcon size={12} className="text-gray-500" />
                    <span>Reset links are single-use for security</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Render: Expired Token ───────────────────────────────────────────────

  if (pageState === 'expired') {
    return (
      <>
        <PageBackground />
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.12)]">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-slate-900/95 to-slate-950/90" />
              <div className="absolute inset-0 bg-black/70" />
              <div className="absolute inset-0 rounded-2xl border border-amber-500/25" />

              <div className="relative p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center">
                    <ClockIcon size={40} className="text-amber-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-white font-mono mb-3">Link Expired</h1>
                <p className="text-gray-400 font-mono text-sm mb-2 leading-relaxed">
                  {tokenError || 'This password reset link has expired for your security.'}
                </p>
                <p className="text-gray-500 font-mono text-xs mb-6">
                  Reset links are valid for a limited time to protect your account.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/?action=forgot-password')}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/50 text-amber-300 font-semibold font-mono rounded-xl hover:from-amber-500/30 hover:to-orange-600/30 hover:border-amber-400/70 hover:text-white transition-all shadow-[0_0_25px_rgba(245,158,11,0.1)] hover:shadow-[0_0_35px_rgba(245,158,11,0.2)]"
                  >
                    Request New Reset Link
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full py-3 bg-transparent border border-gray-700 text-gray-400 font-mono text-sm rounded-xl hover:bg-gray-800/50 hover:border-gray-600 hover:text-gray-300 transition-all"
                  >
                    Return to Home
                  </button>
                </div>

                <div className="mt-6 pt-5 border-t border-amber-500/15">
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-mono">
                    <ShieldIcon size={12} className="text-gray-500" />
                    <span>Links expire to keep your account secure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Render: Generic Error ───────────────────────────────────────────────

  if (pageState === 'error') {
    return (
      <>
        <PageBackground />
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.12)]">
              <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-slate-900/95 to-slate-950/90" />
              <div className="absolute inset-0 bg-black/70" />
              <div className="absolute inset-0 rounded-2xl border border-red-500/25" />

              <div className="relative p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute -inset-4 bg-red-500/10 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
                    <AlertCircleIcon size={40} className="text-red-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-white font-mono mb-3">Something Went Wrong</h1>
                <p className="text-gray-400 font-mono text-sm mb-6 leading-relaxed">
                  {tokenError || 'We encountered an error processing your request. Please try again.'}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/50 text-cyan-300 font-semibold font-mono rounded-xl hover:from-cyan-500/30 hover:to-blue-600/30 hover:border-cyan-400/70 hover:text-white transition-all"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full py-3 bg-transparent border border-gray-700 text-gray-400 font-mono text-sm rounded-xl hover:bg-gray-800/50 hover:border-gray-600 hover:text-gray-300 transition-all"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Render: Success ─────────────────────────────────────────────────────

  if (pageState === 'success') {
    return (
      <>
        <PageBackground />
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl shadow-[0_0_80px_rgba(16,185,129,0.15)]">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-slate-900/95 to-slate-950/90" />
              <div className="absolute inset-0 bg-black/70" />
              <div className="absolute inset-0 rounded-2xl border border-emerald-500/25" />

              <div className="relative p-8 text-center">
                {/* Animated success icon */}
                <div className="relative inline-block mb-6">
                  <div className="absolute -inset-5 bg-emerald-400/15 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-emerald-400"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22,4 12,14.01 9,11.01" />
                    </svg>
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-white font-mono mb-3">
                  Password Reset Complete
                </h1>
                <p className="text-emerald-300/60 font-mono text-sm mb-2">
                  Your password has been successfully updated.
                </p>
                <p className="text-gray-500 font-mono text-xs mb-8">
                  You can now sign in with your new password.
                </p>

                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500/20 to-cyan-600/20 border border-emerald-400/50 text-emerald-300 font-semibold font-mono rounded-xl hover:from-emerald-500/30 hover:to-cyan-600/30 hover:border-emerald-400/70 hover:text-white transition-all shadow-[0_0_25px_rgba(16,185,129,0.12)] hover:shadow-[0_0_35px_rgba(16,185,129,0.2)]"
                >
                  Go to Sign In
                </button>

                <div className="mt-6 pt-5 border-t border-emerald-500/15">
                  <div className="flex items-center justify-center gap-2 text-emerald-400/30 text-xs font-mono">
                    <LockIcon size={12} className="text-emerald-400/40" />
                    <span>Your account is now secured with your new password</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Render: Valid Token — Password Reset Form ───────────────────────────

  return (
    <>
      <PageBackground />
      <div className="relative min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
          <div className="relative overflow-hidden rounded-2xl shadow-[0_0_80px_rgba(0,180,255,0.15)]">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/15 via-slate-900/95 to-blue-950/40" />
            <div className="absolute inset-0 bg-black/75" />
            <div className="absolute inset-0 hex-pattern opacity-[0.06]" />

            {/* Border glow */}
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/25" />
            <div className="absolute inset-[1px] rounded-2xl border border-cyan-500/8" />

            {/* Content */}
            <div className="relative p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                  <div className="absolute -inset-4 bg-cyan-400/15 rounded-full blur-xl" />
                  <ApplegateCoreLogo size={48} className="relative z-10" />
                </div>
                <h2 className="text-2xl font-bold text-white font-mono">Reset Your Password</h2>
                {(userName || userEmail) && (
                  <p className="text-cyan-300/50 mt-2 font-mono text-sm">
                    Create a new password for your account
                  </p>
                )}
              </div>

              {/* User info badge */}
              {userEmail && (
                <div className="bg-cyan-500/8 border border-cyan-500/25 rounded-xl p-3 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      {userName && (
                        <p className="text-white text-sm font-mono font-medium truncate">{userName}</p>
                      )}
                      <p className="text-cyan-300/60 text-xs font-mono truncate">{userEmail}</p>
                    </div>
                  </div>
                  {expiresAt && <TimeRemaining />}
                </div>
              )}

              {/* Form error */}
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5 flex items-start gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <p className="text-red-400 text-sm font-mono">{formError}</p>
                </div>
              )}

              {/* Reset Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showPassword}
                    onToggleShow={() => setShowPassword(!showPassword)}
                    placeholder="Enter a strong password"
                    label="New Password"
                  />
                  <StrengthIndicator strength={passwordStrength} />
                </div>

                {/* Confirm Password */}
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                  placeholder="Confirm your new password"
                  label="Confirm Password"
                  borderOverride={
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-500/50 focus:border-emerald-400/70 focus:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                        : 'border-red-500/50 focus:border-red-400/70 focus:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                      : undefined
                  }
                />

                {/* Match indicator */}
                {confirmPassword.length > 0 && (
                  <div className="-mt-3">
                    {passwordsMatch ? (
                      <p className="text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                        <CheckIcon size={12} />
                        Passwords match
                      </p>
                    ) : (
                      <p className="text-red-400 text-xs font-mono flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Passwords do not match
                      </p>
                    )}
                  </div>
                )}

                {/* Requirements checklist */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs font-mono text-gray-400 mb-3 uppercase tracking-wider">
                    Password Requirements
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PASSWORD_REQUIREMENTS.map((req) => (
                      <RequirementItem
                        key={req.id}
                        label={req.label}
                        passed={req.test(newPassword)}
                        hasInput={newPassword.length > 0}
                      />
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-3.5 font-semibold font-mono rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    canSubmit
                      ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-400/60 text-cyan-300 hover:from-cyan-500/35 hover:to-blue-600/35 hover:border-cyan-400/80 hover:text-white shadow-[0_0_30px_rgba(0,200,255,0.15)] hover:shadow-[0_0_40px_rgba(0,200,255,0.25)]'
                      : 'bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-400/20 text-cyan-300/50'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resetting Password...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LockIcon size={16} />
                      Reset Password
                    </span>
                  )}
                </button>
              </form>

              {/* Back to login link */}
              <div className="mt-5 text-center">
                <button
                  onClick={() => navigate('/')}
                  className="text-cyan-400/50 hover:text-cyan-400 text-xs font-mono transition-colors"
                >
                  Back to Sign In
                </button>
              </div>

              {/* Security badge */}
              <div className="mt-5 pt-5 border-t border-cyan-500/15">
                <div className="flex items-center justify-center gap-2 text-cyan-400/30 text-xs font-mono">
                  <LockIcon size={12} className="text-cyan-400/40" />
                  <span>{SECURITY_ALGORITHMS.badge}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
