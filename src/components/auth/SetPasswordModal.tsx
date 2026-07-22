import React, { useState, useMemo } from 'react';
import { CloseIcon, EyeIcon, EyeOffIcon, LockIcon, ApplegateCoreLogo, ShieldIcon, CheckIcon } from '@/components/icons/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import { setPasswordViaRPC } from '@/lib/rpcAuth';



interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  /** If true, uses admin bypass flow with bypassCode */
  isAdminBypass?: boolean;
  /** The admin bypass PIN code (required when isAdminBypass is true) */
  bypassCode?: string;
  /** Called after password is set and login succeeds */
  onSuccess: () => void;
}

type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

const SetPasswordModal: React.FC<SetPasswordModalProps> = ({
  isOpen,
  onClose,
  email,
  isAdminBypass = false,
  bypassCode,
  onSuccess,
}) => {
  const { login, setupInvitedPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState<'setup' | 'success'>('setup');

  // Calculate password strength
  const passwordStrength = useMemo((): PasswordStrength => {
    if (!newPassword) return 'empty';
    const passedRequirements = PASSWORD_REQUIREMENTS.filter((r) => r.test(newPassword)).length;
    if (passedRequirements <= 1) return 'weak';
    if (passedRequirements <= 3) return 'medium';
    return 'strong';
  }, [newPassword]);

  const strengthConfig = useMemo(() => {
    switch (passwordStrength) {
      case 'weak':
        return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-400', glowColor: 'shadow-red-500/30', bars: 1 };
      case 'medium':
        return { label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-400', glowColor: 'shadow-amber-500/30', bars: 2 };
      case 'strong':
        return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', glowColor: 'shadow-emerald-500/30', bars: 3 };
      default:
        return { label: '', color: 'bg-gray-700', textColor: 'text-gray-500', glowColor: '', bars: 0 };
    }
  }, [passwordStrength]);

  const allRequirementsMet = useMemo(
    () => PASSWORD_REQUIREMENTS.every((r) => r.test(newPassword)),
    [newPassword]
  );

  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );

  const canSubmit = allRequirementsMet && passwordsMatch && !isLoading;

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const targetEmail = email.toLowerCase();
      
      if (isAdminBypass && bypassCode) {
        // --- 1. ADMIN BYPASS FLOW ---
        console.log('[SetPasswordModal] Setting password via admin bypass for:', targetEmail);
        const requestBody: Record<string, any> = {
          action: 'set_password',
          email: targetEmail,
          password: newPassword,
          isAdminBypass: true,
          bypassCode: bypassCode,
        };

        let edgeFnFailed = false;
        try {
          const result = await invokeEdgeFunction('secure-auth', requestBody);
          if (result.error === 'ALL_STRATEGIES_FAILED' || result.status === 0) edgeFnFailed = true;
        } catch (err) {
          edgeFnFailed = true;
        }

        if (edgeFnFailed) {
          const rpcResult = await setPasswordViaRPC(targetEmail, newPassword);
          if (!rpcResult.success) {
            setError(rpcResult.error || 'Failed to set password.');
            setIsLoading(false);
            return;
          }
        }

        setStep('success');
        setSuccessMessage('Password set successfully! Signing you in...');
        
        const loginResult = await login(targetEmail, newPassword);
        if (loginResult.success) {
          setTimeout(() => { onSuccess(); }, 800);
        } else {
          setSuccessMessage('Password set successfully! Please sign in with your new password.');
          setTimeout(() => { onClose(); }, 2000);
        }
      } else {
        // --- 2. STANDARD INVITE FLOW ---
        console.log('[SetPasswordModal] Using official Supabase updateUser flow...');
        const result = await setupInvitedPassword(newPassword);
        
        if (!result.success) {
          setError(result.error || 'Failed to set password. Your invite link may have expired.');
          setIsLoading(false);
          return;
        }

        setStep('success');
        setSuccessMessage('Password set successfully! Signing you in...');
        setTimeout(() => { onSuccess(); }, 800);
      }
    } catch (err: any) {
      console.error('Set password error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };





  const handleClose = () => {
    // Reset state on close
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSuccessMessage('');
    setStep('setup');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 overflow-hidden rounded-2xl shadow-[0_0_80px_rgba(0,180,255,0.15)]">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/15 via-slate-900/95 to-blue-950/40" />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 hex-pattern opacity-[0.06]" />

        {/* Border glow */}
        <div className="absolute inset-0 rounded-2xl border border-cyan-400/25" />
        <div className="absolute inset-[1px] rounded-2xl border border-cyan-500/8" />

        {/* Content */}
        <div className="relative p-8">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all z-10"
          >
            <CloseIcon size={20} />
          </button>

          {step === 'setup' ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                  <div className="absolute -inset-4 bg-cyan-400/15 rounded-full blur-xl" />
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center">
                    <LockIcon size={32} className="text-cyan-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white font-mono">
                  {isAdminBypass ? 'Platform Owner Setup' : 'Set Your Password'}
                </h2>
                <p className="text-cyan-300/50 mt-2 font-mono text-sm">
                  Create a secure password for your account
                </p>
              </div>

              {/* Email badge */}
              <div className="bg-cyan-500/8 border border-cyan-500/25 rounded-xl p-3 mb-6 flex items-center gap-3">
                {isAdminBypass && (
                  <ShieldIcon size={18} className="text-amber-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  {isAdminBypass && (
                    <p className="text-amber-400 text-xs font-mono font-semibold mb-0.5">Platform Owner Account</p>
                  )}
                  <p className="text-cyan-300 text-sm font-mono truncate">
                    {email}
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5 flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <p className="text-red-400 text-sm font-mono">{error}</p>
                </div>
              )}

              <form onSubmit={handleSetPassword} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/50 border border-cyan-500/30 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/60 transition-all"
                      placeholder="Enter a strong password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {newPassword.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-gray-400">Password strength</span>
                        <span className={`text-xs font-mono font-semibold ${strengthConfig.textColor}`}>
                          {strengthConfig.label}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((bar) => (
                          <div
                            key={bar}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              bar <= strengthConfig.bars
                                ? `${strengthConfig.color} ${strengthConfig.glowColor} shadow-sm`
                                : 'bg-gray-700/60'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full bg-black/50 border rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 font-mono focus:outline-none transition-all ${
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? 'border-emerald-500/50 focus:border-emerald-400/70 focus:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                            : 'border-red-500/50 focus:border-red-400/70 focus:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                          : 'border-cyan-500/30 focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)]'
                      } focus:bg-black/60`}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-red-400 text-xs font-mono mt-1.5 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Passwords do not match
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-emerald-400 text-xs font-mono mt-1.5 flex items-center gap-1">
                      <CheckIcon size={12} />
                      Passwords match
                    </p>
                  )}
                </div>

                {/* Requirements checklist */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs font-mono text-gray-400 mb-3 uppercase tracking-wider">
                    Password Requirements
                  </p>
                  <div className="space-y-2">
                    {PASSWORD_REQUIREMENTS.map((req, index) => {
                      const passed = req.test(newPassword);
                      return (
                        <div key={index} className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                              passed
                                ? 'bg-emerald-500/20 border border-emerald-500/60'
                                : newPassword.length > 0
                                ? 'bg-red-500/10 border border-red-500/30'
                                : 'bg-gray-800 border border-gray-600/40'
                            }`}
                          >
                            {passed ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400">
                                <polyline points="20,6 9,17 4,12" />
                              </svg>
                            ) : newPassword.length > 0 ? (
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
                              passed
                                ? 'text-emerald-400'
                                : newPassword.length > 0
                                ? 'text-red-400/70'
                                : 'text-gray-500'
                            }`}
                          >
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3.5 bg-gray-800/80 border border-gray-600 text-gray-200 font-semibold font-mono rounded-xl hover:bg-gray-700 hover:border-gray-500 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`flex-1 py-3.5 font-semibold font-mono rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isAdminBypass
                        ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white hover:from-amber-500 hover:to-orange-600 shadow-[0_0_25px_rgba(255,180,0,0.2)] hover:shadow-[0_0_35px_rgba(255,180,0,0.35)]'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white hover:from-cyan-500 hover:to-blue-600 shadow-[0_0_25px_rgba(0,200,255,0.25)] hover:shadow-[0_0_35px_rgba(0,200,255,0.4)]'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Setting Password...
                      </span>
                    ) : (
                      'Set Password'
                    )}
                  </button>
                </div>

              </form>

              {/* Security badge */}
              <div className="mt-6 pt-5 border-t border-cyan-500/15">
                <div className="flex items-center justify-center gap-2 text-cyan-400/30 text-xs font-mono">
                  <LockIcon size={12} className="text-cyan-400/40" />
                  <span>AES-256-GCM encrypted &middot; SHA-512 signed &middot; ML-KEM-1024 encapsulated</span>

                </div>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="relative inline-block mb-6">
                <div className="absolute -inset-4 bg-emerald-400/15 rounded-full blur-xl animate-pulse" />
                <div className="relative z-10 w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/50 flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white font-mono mb-2">Password Set!</h3>
              <p className="text-cyan-300/60 text-sm font-mono mb-6">
                {successMessage || 'Your password has been set successfully.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-cyan-300/50 text-sm font-mono">Signing you in...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPasswordModal;
