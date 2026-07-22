import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CloseIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, ChevronLeftIcon } from '@/components/icons/Icons';
import { supabase } from '@/lib/supabase';
import { SMSVerificationModal } from './SMSVerificationModal';
import { SMSPasswordResetModal } from './SMSPasswordResetModal';
import SetPasswordModal from './SetPasswordModal';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/695fc81af8bb22c52e2539fb_1769628610343_93d83d41.png';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

type ModalView = 'login' | 'admin_bypass';

// Admin bypass configuration
const ADMIN_BYPASS_PIN = '5418901829';
const PLATFORM_OWNER_EMAIL = 'andrew@applegate.solutions';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // View state
  const [currentView, setCurrentView] = useState<ModalView>('login');

  // Admin bypass state
  const [bypassPin, setBypassPin] = useState('');
  const [bypassAttempts, setBypassAttempts] = useState(0);
  const [bypassLocked, setBypassLocked] = useState(false);

  // SMS Verification state
  const [showSMSVerification, setShowSMSVerification] = useState(false);
  const [pendingLoginCredentials, setPendingLoginCredentials] = useState<{ email: string; password: string } | null>(null);

  // SMS Password Reset state
  const [showSMSPasswordReset, setShowSMSPasswordReset] = useState(false);
  const [smsResetEmail, setSmsResetEmail] = useState('');
  const [smsResetShowEmailStep, setSmsResetShowEmailStep] = useState(false);

  // SetPasswordModal state
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [setPasswordIsAdmin, setSetPasswordIsAdmin] = useState(false);
  const [setPasswordEmail, setSetPasswordEmail] = useState('');
  const [setPasswordBypassCode, setSetPasswordBypassCode] = useState('');

  // Returning user detection
  const [returningUserName, setReturningUserName] = useState<string | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  const { pendingInviteEmail, clearPendingInvite } = useAuth();

  // Automatically trigger the Set Password modal if there is a pending invite
  useEffect(() => {
    if (pendingInviteEmail && isOpen) {
      setSetPasswordEmail(pendingInviteEmail);
      setSetPasswordIsAdmin(false);
      setShowSetPasswordModal(true);
    }
  }, [pendingInviteEmail, isOpen]);

  // Check if user has previously logged in
  useEffect(() => {
    if (isOpen) {
      try {
        const storedName = localStorage.getItem('acore_user_first_name');
        const hasLoggedIn = localStorage.getItem('acore_has_logged_in');
        if (hasLoggedIn && storedName) {
          setReturningUserName(storedName);
          setIsFirstVisit(false);
        } else {
          setReturningUserName(null);
          setIsFirstVisit(true);
        }
      } catch {
        setReturningUserName(null);
        setIsFirstVisit(true);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const result = await login(normalizedEmail, password);
      
      if (!result.success) {
        if ((result as any).requiresPasswordSetup) {
          openForgotPasswordFlow(normalizedEmail);
          setError('');
        } else {
          setError(result.error || 'Invalid email or password');
        }
      } else {
        // Login succeeded - store user info for returning user detection
        try {
          localStorage.setItem('acore_has_logged_in', 'true');
          // Try to extract first name from email or user data
          const firstName = normalizedEmail.split('@')[0].split('.')[0];
          const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
          localStorage.setItem('acore_user_first_name', capitalizedName);
        } catch {}
        onClose();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.error || err?.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };


  const openForgotPasswordFlow = (emailValue?: string) => {
    const trimmedEmail = (emailValue || email || '').trim().toLowerCase();
    
    if (trimmedEmail) {
      setSmsResetEmail(trimmedEmail);
      setSmsResetShowEmailStep(false);
    } else {
      setSmsResetEmail('');
      setSmsResetShowEmailStep(true);
    }
    
    setShowSMSPasswordReset(true);
    setError('');
  };

  const handleSMSVerified = async () => {
    if (!pendingLoginCredentials) return;

    setShowSMSVerification(false);
    setIsLoading(true);

    try {
      const result = await login(pendingLoginCredentials.email, pendingLoginCredentials.password);
      
      if (result.success) {
        setPendingLoginCredentials(null);
        onClose();
      } else {
        setError(result.error || 'Login failed after verification');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSMSVerificationClose = () => {
    setShowSMSVerification(false);
    setPendingLoginCredentials(null);
  };

  const handleSecurityBadgeClick = () => {
    setSmsResetEmail(PLATFORM_OWNER_EMAIL);
    setSmsResetShowEmailStep(false);
    setShowSMSPasswordReset(true);
    setError('');
  };

  const handleSMSPasswordResetComplete = () => {
    setShowSMSPasswordReset(false);
    onClose();
  };


  const handleBypassPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (bypassLocked) {
      setError('Access locked. Please try again later.');
      return;
    }

    if (bypassPin === ADMIN_BYPASS_PIN) {
      setBypassAttempts(0);
      setSetPasswordEmail(PLATFORM_OWNER_EMAIL);
      setSetPasswordIsAdmin(true);
      setSetPasswordBypassCode(ADMIN_BYPASS_PIN);
      setShowSetPasswordModal(true);
      setCurrentView('login');
    } else {
      const newAttempts = bypassAttempts + 1;
      setBypassAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setBypassLocked(true);
        setError('Too many failed attempts. Access locked for security.');
        setTimeout(() => {
          setBypassLocked(false);
          setBypassAttempts(0);
        }, 5 * 60 * 1000);
      } else {
        setError(`Invalid PIN. ${3 - newAttempts} attempts remaining.`);
      }
      setBypassPin('');
    }
  };

  const handleSetPasswordSuccess = () => {
    setShowSetPasswordModal(false);
    setSetPasswordIsAdmin(false);
    setSetPasswordBypassCode('');
    if (pendingInviteEmail) clearPendingInvite();
    onClose();
  };

  const handleSetPasswordClose = () => {
    setShowSetPasswordModal(false);
    setSetPasswordIsAdmin(false);
    setSetPasswordBypassCode('');
    setCurrentView('login');
    if (pendingInviteEmail) clearPendingInvite();
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    setBypassPin('');
    setError('');
    setSuccessMessage('');
  };

  if (!isOpen) return null;

  const renderLoginForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/90 transition-all login-input-dark"
          placeholder="you@company.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/90 transition-all login-input-dark"
            placeholder="Enter your password"
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
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-cyan-500/30 bg-black/50 text-cyan-500 focus:ring-cyan-500/50" />
          <span className="text-sm text-cyan-300/60 font-mono">Remember me</span>
        </label>
        <button 
          type="button" 
          onClick={() => openForgotPasswordFlow()}
          className="text-sm text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {/* Platform owner notice - GREEN */}
      {email.toLowerCase().trim() === PLATFORM_OWNER_EMAIL && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <p className="text-green-300 text-xs font-mono flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Platform Owner Detected
          </p>
        </div>
      )}

      {/* Sign In Button - Matching "Start Free Trial" styling with glow effect */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-semibold font-mono rounded-xl hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_35px_rgba(0,255,255,0.4)] text-lg neon-glow-cyan"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );



  const renderAdminBypass = () => (
    <form onSubmit={handleBypassPinSubmit} className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-amber-400 font-mono mb-2">Platform Owner Access</h3>
        <p className="text-cyan-300/60 text-sm font-mono">
          Enter your secure PIN to bypass email verification.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
          Security PIN
        </label>
        <input
          type="password"
          value={bypassPin}
          onChange={(e) => setBypassPin(e.target.value.replace(/\D/g, ''))}
          className="w-full bg-black/50 border border-amber-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-amber-400/60 focus:shadow-[0_0_20px_rgba(255,180,0,0.15)] focus:bg-black/60 transition-all"
          placeholder="••••••••••"
          maxLength={10}
          required
          disabled={bypassLocked}
        />
        <p className="text-xs text-gray-500 mt-2 font-mono text-center">
          Enter 10-digit PIN
        </p>
      </div>

      {bypassLocked && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm font-mono text-center">
            Access locked for 5 minutes due to failed attempts.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || bypassLocked || bypassPin.length < 10}
        className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold font-mono rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(255,180,0,0.2)] hover:shadow-[0_0_35px_rgba(255,180,0,0.35)]"
      >
        {isLoading ? 'Verifying...' : 'Verify PIN'}
      </button>


      <button
        type="button"
        onClick={handleBackToLogin}
        className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-cyan-400 font-mono text-sm transition-colors"
      >
        <ChevronLeftIcon size={16} />
        Back to Sign In
      </button>
    </form>
  );

  const getTitle = () => {
    switch (currentView) {
      case 'admin_bypass': return 'Secure Access';
      default:
        if (!isFirstVisit && returningUserName) {
          return `Welcome Back ${returningUserName}!`;
        }
        return 'Welcome to A-CORE';
    }
  };

  const getSubtitle = () => {
    switch (currentView) {
      case 'admin_bypass': return 'Platform owner authentication';
      default:
        if (!isFirstVisit && returningUserName) {
          return 'Please sign in.';
        }
        return 'Business Operating System';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop with translucent black */}
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
        
        {/* Modal with lighter cyan to darker blue gradient */}
        <div className="relative w-full max-w-md mx-4 overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(0,180,255,0.2)]">
          {/* Gradient background - lighter cyan to darker blue */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 via-cyan-600/15 to-blue-900/30" />
          <div className="absolute inset-0 bg-black/70" />
          
          {/* Subtle hex pattern overlay */}
          <div className="absolute inset-0 hex-pattern opacity-10" />
          
          {/* Glow border effect */}
          <div className="absolute inset-0 rounded-2xl border border-cyan-400/30" />
          <div className="absolute inset-[1px] rounded-2xl border border-cyan-500/10" />
          
          {/* Content */}
          <div className="relative p-8">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all z-10"
            >
              <CloseIcon size={20} />
            </button>

            {/* Logo - A-CORE Image Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="absolute -inset-3 bg-cyan-400/20 rounded-full blur-xl" />
                <img 
                  src={LOGO_URL} 
                  alt="A-CORE BOS" 
                  className="relative z-10 h-14 w-auto mx-auto mb-4 drop-shadow-[0_0_12px_rgba(0,255,255,0.5)]" 
                />
              </div>
              <h2 className="text-2xl font-bold text-white font-mono">
                {getTitle()}
              </h2>
              {getSubtitle() && (
                <p className="text-cyan-300/60 mt-1 font-mono text-sm">
                  {getSubtitle()}
                </p>
              )}
            </div>

            {/* Success Message */}
            {successMessage && currentView === 'login' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-6">
                <p className="text-green-400 text-sm font-mono">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-sm font-mono">{error}</p>
              </div>
            )}

            {/* Render appropriate form based on view */}
            {currentView === 'login' && renderLoginForm()}
            {currentView === 'admin_bypass' && renderAdminBypass()}

            {/* Q-CORE Security Badge - Clickable for admin bypass */}
            <div className="mt-6 pt-6 border-t border-cyan-500/20">
              <button
                type="button"
                onClick={handleSecurityBadgeClick}
                className="w-full flex items-center justify-center gap-2 text-cyan-400/40 text-xs font-mono hover:text-cyan-400/70 transition-colors cursor-pointer group"
                title="Q-CORE Digital Security"
              >
                <LockIcon size={14} className="text-cyan-400/50 group-hover:text-cyan-400/80 transition-colors" />
                <span className="group-hover:text-cyan-400/80 transition-colors">Protected by Q-CORE AES-256-GCM + SHA-512 Signed + ML-KEM-1024 Encryption</span>

              </button>
            </div>

            {/* Switch to Register */}
            {currentView === 'login' && (
              <div className="mt-6 text-center">
                <p className="text-cyan-300/50 font-mono text-sm">
                  Don't have an account?{' '}
                  <button
                    onClick={onSwitchToRegister}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Create one
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SMS Verification Modal */}
      <SMSVerificationModal
        isOpen={showSMSVerification}
        onClose={handleSMSVerificationClose}
        onVerified={handleSMSVerified}
        email={pendingLoginCredentials?.email || ''}
      />

      {/* SMS Password Reset Modal */}
      <SMSPasswordResetModal
        isOpen={showSMSPasswordReset}
        onClose={() => setShowSMSPasswordReset(false)}
        onPasswordReset={handleSMSPasswordResetComplete}
        defaultEmail={smsResetEmail}
        showEmailStep={smsResetShowEmailStep}
      />

      {/* Set Password Modal */}
      <SetPasswordModal
        isOpen={showSetPasswordModal}
        onClose={handleSetPasswordClose}
        email={setPasswordEmail}
        isAdminBypass={setPasswordIsAdmin}
        bypassCode={setPasswordBypassCode}
        onSuccess={handleSetPasswordSuccess}
      />
    </>
  );
};

export default LoginModal;
