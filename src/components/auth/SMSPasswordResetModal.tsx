import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import { setPasswordViaRPC } from '@/lib/rpcAuth';
import { useAuth } from '@/contexts/AuthContext';


import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  Lock,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Phone,
  BadgeCheck,
  Fingerprint
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SMSPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordReset: () => void;
  defaultEmail?: string;
  /** If true, shows email input as first step */
  showEmailStep?: boolean;
}

type ResetStep = 'email' | 'phone' | 'code' | 'password' | 'success';

const PLATFORM_OWNER_EMAIL = 'andrew@applegate.solutions';
const ADMIN_BYPASS_PIN = '5418901829';

// Helper: invoke edge function with timeout using XHR client
async function invokeWithTimeout(
  fnName: string,
  body: Record<string, any>,
  timeoutMs = 20000
): Promise<{ data: any; error: any }> {
  const result = await invokeEdgeFunction(fnName, body, timeoutMs);
  if (result.error) {
    return { data: null, error: { message: result.error } };
  }
  return { data: result.data, error: null };
}

// Helper: extract meaningful error message from edge function error
function extractErrorMessage(error: any, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message) {
    if (error.message.includes('non-2xx') || error.message.includes('Edge Function')) {
      return fallback + ' (Edge function returned an error - check deployment)';
    }
    return error.message;
  }
  if (error.msg) return error.msg;
  return fallback;
}


export const SMSPasswordResetModal: React.FC<SMSPasswordResetModalProps> = ({
  isOpen,
  onClose,
  onPasswordReset,
  defaultEmail = '',
  showEmailStep = false,
}) => {
  const { login } = useAuth();

  // Determine initial step based on whether we need email input
  const getInitialStep = (): ResetStep => {
    if (showEmailStep && !defaultEmail) return 'email';
    return 'phone';
  };

  const [step, setStep] = useState<ResetStep>(getInitialStep());
  const [email, setEmail] = useState(defaultEmail);
  const [digits, setDigits] = useState<string[]>(Array(10).fill(''));
  const [verificationDigits, setVerificationDigits] = useState<string[]>(Array(6).fill(''));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [deliveryMethod, setDeliveryMethod] = useState<'sms' | 'email' | null>(null);
  
  // Phone auto-lookup state
  const [phoneOnFile, setPhoneOnFile] = useState<string | null>(null);
  const [phoneIsVerified, setPhoneIsVerified] = useState(false);
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin bypass state
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassPin, setBypassPin] = useState('');
  const [bypassError, setBypassError] = useState<string | null>(null);
  const [bypassAttempts, setBypassAttempts] = useState(0);
  const [bypassLocked, setBypassLocked] = useState(false);
  const [adminBypassVerified, setAdminBypassVerified] = useState(false);
  
  const phoneInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const bypassInputRef = useRef<HTMLInputElement | null>(null);

  // Check if current email is the platform owner
  const isPlatformOwnerEmail = email.toLowerCase().trim() === PLATFORM_OWNER_EMAIL;

  // Auto-lookup phone number when email is set and we're on the phone step
  const fetchUserPhone = useCallback(async (emailToLookup: string) => {
    if (!emailToLookup) return;
    setIsLoadingPhone(true);
    setPhoneLookedUp(false);
    try {
      const { data, error: invokeError } = await invokeWithTimeout('secure-auth', {
        action: 'get_user_phone',
        email: emailToLookup.toLowerCase().trim(),
      }, 10000);

      if (invokeError) {
        console.warn('[SMSPasswordReset] Phone lookup error (non-critical):', invokeError);
        setPhoneLookedUp(true);
        return;
      }
      if (data?.success && data?.phoneNumber) {
        setPhoneOnFile(data.phoneNumber);
        setPhoneIsVerified(data.phoneVerified || false);
        // Auto-fill the digit boxes
        const rawDigits = data.phoneNumber.replace(/\D/g, '');
        const localDigits = rawDigits.startsWith('1') && rawDigits.length === 11 ? rawDigits.slice(1) : rawDigits;
        if (localDigits.length === 10) {
          const newDigits = localDigits.split('');
          setDigits(newDigits);
        }
      }
      setPhoneLookedUp(true);
    } catch (err) {
      console.warn('[SMSPasswordReset] Phone lookup error (non-critical):', err);
      setPhoneLookedUp(true);
    } finally {
      setIsLoadingPhone(false);
    }
  }, []);

  // When modal opens or email changes, look up phone
  useEffect(() => {
    if (isOpen && email && (step === 'phone' || step === 'email')) {
      fetchUserPhone(email);
    }
  }, [isOpen, email, fetchUserPhone]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const initialEmail = defaultEmail || '';
      setEmail(initialEmail);
      setStep(showEmailStep && !defaultEmail ? 'email' : 'phone');
      setDigits(Array(10).fill(''));
      setVerificationDigits(Array(6).fill(''));
      setSessionId(null);
      setExpiresAt(null);
      setError(null);
      setDeliveryMethod(null);
      setNewPassword('');
      setConfirmPassword('');
      setPhoneOnFile(null);
      setPhoneIsVerified(false);
      setPhoneLookedUp(false);
      setAttemptsRemaining(3);
      // Reset bypass state
      setShowBypassInput(false);
      setBypassPin('');
      setBypassError(null);
      setBypassAttempts(0);
      setBypassLocked(false);
      setAdminBypassVerified(false);
      if (initialEmail) {
        fetchUserPhone(initialEmail);
      }
    }
  }, [isOpen, defaultEmail, showEmailStep, fetchUserPhone]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0) { setError('Verification code has expired. Please request a new code.'); clearInterval(interval); }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (step === 'email' && emailInputRef.current) setTimeout(() => emailInputRef.current?.focus(), 100);
    else if (step === 'phone' && phoneInputRefs.current[0] && !isLoadingPhone) {
      // Focus the first empty digit
      const firstEmpty = digits.findIndex(d => !d);
      const focusIdx = firstEmpty >= 0 ? firstEmpty : 0;
      setTimeout(() => phoneInputRefs.current[focusIdx]?.focus(), 100);
    }
    else if (step === 'code' && codeInputRefs.current[0]) setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
  }, [step, isOpen, isLoadingPhone]);

  // Focus bypass input when shown
  useEffect(() => {
    if (showBypassInput && bypassInputRef.current) {
      setTimeout(() => bypassInputRef.current?.focus(), 100);
    }
  }, [showBypassInput]);

  const handlePhoneDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    if (value.length > 1) {
      const pastedDigits = value.slice(0, 10 - index).split('');
      pastedDigits.forEach((d, i) => { if (index + i < 10) newDigits[index + i] = d; });
      setDigits(newDigits);
      phoneInputRefs.current[Math.min(index + pastedDigits.length, 9)]?.focus();
    } else {
      newDigits[index] = value;
      setDigits(newDigits);
      if (value && index < 9) phoneInputRefs.current[index + 1]?.focus();
    }
    setError(null);
  };

  const handlePhoneKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) phoneInputRefs.current[index - 1]?.focus();
    if (e.key === 'Enter' && digits.every(d => d)) handleSendCode();
  };

  const handleCodeDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...verificationDigits];
    if (value.length > 1) {
      const pastedDigits = value.slice(0, 6 - index).split('');
      pastedDigits.forEach((d, i) => { if (index + i < 6) newDigits[index + i] = d; });
      setVerificationDigits(newDigits);
      codeInputRefs.current[Math.min(index + pastedDigits.length, 5)]?.focus();
      if (newDigits.every(d => d)) handleVerifyCode(newDigits.join(''));
    } else {
      newDigits[index] = value;
      setVerificationDigits(newDigits);
      if (value && index < 5) codeInputRefs.current[index + 1]?.focus();
      if (value && newDigits.every(d => d)) handleVerifyCode(newDigits.join(''));
    }
    setError(null);
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationDigits[index] && index > 0) codeInputRefs.current[index - 1]?.focus();
  };

  const getCleanPhoneNumber = (): string => `+1${digits.join('')}`;

  const getFormattedPhoneDisplay = (): string => {
    const d = digits;
    if (d.every(x => x)) return `(${d.slice(0,3).join('')}) ${d.slice(3,6).join('')}-${d.slice(6,10).join('')}`;
    return '';
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    // Look up phone number for this email
    await fetchUserPhone(email.trim());
    
    setIsLoading(false);
    setStep('phone');
  };

  const handleSendCode = async () => {
    if (digits.join('').length !== 10) { setError('Please enter all 10 digits'); return; }
    setIsLoading(true);
    setError(null);
    setDeliveryMethod(null);

    try {
      const { data, error: invokeError } = await invokeWithTimeout('sms-verification', {
        action: 'send_code',
        email: email.toLowerCase().trim(),
        phoneNumber: getCleanPhoneNumber(),
        purpose: 'password_reset',
      });

      if (invokeError) {
        throw new Error(extractErrorMessage(invokeError, 'Failed to send verification code'));
      }
      if (!data?.success) throw new Error(data?.error || 'Failed to send verification code');

      setSessionId(data.sessionId);
      setExpiresAt(new Date(data.expiresAt));
      setDeliveryMethod(data.deliveryMethod || 'sms');
      setStep('code');
      setAttemptsRemaining(3);
      setVerificationDigits(Array(6).fill(''));
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await invokeWithTimeout('sms-verification', {
        action: 'verify_code',
        email: email.toLowerCase().trim(),
        code,
        sessionId,
        phoneNumber: getCleanPhoneNumber(),
      });

      if (invokeError) {
        throw new Error(extractErrorMessage(invokeError, 'Verification failed'));
      }
      if (!data?.success) {
        const remaining = data?.attemptsRemaining ?? attemptsRemaining - 1;
        setAttemptsRemaining(remaining);
        if (remaining <= 0) { setError('Maximum attempts exceeded.'); setStep('phone'); }
        else throw new Error(data?.error || 'Invalid verification code');
        return;
      }
      setStep('password');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setVerificationDigits(Array(6).fill(''));
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // ADMIN BYPASS - verify PIN and skip to password
  // ============================================
  const handleBypassPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBypassError(null);

    if (bypassLocked) {
      setBypassError('Access locked for 5 minutes due to failed attempts.');
      return;
    }

    if (bypassPin === ADMIN_BYPASS_PIN) {
      // PIN correct - mark admin bypass verified and skip to password step
      console.log('[SMSPasswordReset] Admin bypass verified, skipping to password step');
      setAdminBypassVerified(true);
      setBypassAttempts(0);
      setBypassError(null);
      setError(null);
      setStep('password');
    } else {
      const newAttempts = bypassAttempts + 1;
      setBypassAttempts(newAttempts);

      if (newAttempts >= 3) {
        setBypassLocked(true);
        setBypassError('Too many failed attempts. Access locked for 5 minutes.');
        setTimeout(() => {
          setBypassLocked(false);
          setBypassAttempts(0);
        }, 5 * 60 * 1000);
      } else {
        setBypassError(`Invalid PIN. ${3 - newAttempts} attempt${3 - newAttempts !== 1 ? 's' : ''} remaining.`);
      }
      setBypassPin('');
    }
  };

  // ============================================
  // SET PASSWORD - handles both SMS-verified and admin bypass paths
  const handleSetPassword = async () => {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('Password must contain at least one number'); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) { setError('Password must contain at least one special character'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    setError(null);

    try {
      if (adminBypassVerified) {
        // ---- ADMIN BYPASS PATH ----
        // Try edge function first, then RPC fallback
        const targetEmail = email.toLowerCase().trim();
        console.log('[SMSPasswordReset] Setting password via edge function for:', targetEmail);
        
        let passwordSet = false;
        
        // Strategy 1: Edge function
        try {
          const { data, error: invokeError } = await invokeWithTimeout('secure-auth', {
            action: 'set_password',
            email: targetEmail,
            password: newPassword,
            isAdminBypass: true,
            bypassCode: ADMIN_BYPASS_PIN,
          }, 25000);
          
          if (!invokeError && data?.success) {
            console.log('[SMSPasswordReset] Password set successfully via edge function!');
            passwordSet = true;
          } else {
            const errMsg = data?.error || extractErrorMessage(invokeError, 'Edge function failed');
            console.warn('[SMSPasswordReset] Edge function set_password failed:', errMsg);
          }
        } catch (edgeErr: any) {
          console.warn('[SMSPasswordReset] Edge function threw:', edgeErr?.message);
        }

        // Strategy 2: RPC fallback (if edge function failed)
        if (!passwordSet) {
          console.log('[SMSPasswordReset] Trying RPC fallback (setPasswordViaRPC)...');
          const rpcResult = await setPasswordViaRPC(targetEmail, newPassword);
          console.log('[SMSPasswordReset] RPC result:', JSON.stringify(rpcResult));
          if (rpcResult.success) {
            passwordSet = true;
          } else {
            throw new Error(rpcResult.error || 'Both edge function and RPC fallback failed to set password');
          }
        }

        console.log('[SMSPasswordReset] Password set successfully!');
        setStep('success');

        // Auto-login after a brief delay
        setTimeout(async () => {
          try {
            console.log('[SMSPasswordReset] Attempting auto-login...');
            const loginResult = await login(targetEmail, newPassword);
            console.log('[SMSPasswordReset] Auto-login result:', loginResult);
            onPasswordReset();
          } catch (loginErr) {
            console.warn('[SMSPasswordReset] Auto-login failed:', loginErr);
            onPasswordReset();
          }
        }, 1500);


      } else {
        // ---- SMS/EMAIL VERIFIED PATH ----
        // Use sms-verification reset_password_with_sms
        console.log('[SMSPasswordReset] Setting password via SMS-verified path');
        const { data, error: invokeError } = await invokeWithTimeout('sms-verification', {
          action: 'reset_password_with_sms',
          email: email.toLowerCase().trim(),
          sessionId,
          newPassword,
        });

        if (invokeError) {
          throw new Error(extractErrorMessage(invokeError, 'Failed to set password'));
        }
        if (!data?.success) throw new Error(data?.error || 'Failed to set password');
        
        setStep('success');
        setTimeout(() => onPasswordReset(), 2000);
      }
    } catch (err: any) {
      console.error('[SMSPasswordReset] handleSetPassword error:', err);
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleResendCode = async () => { setVerificationDigits(Array(6).fill('')); setError(null); await handleSendCode(); };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setStep(getInitialStep()); setDigits(Array(10).fill('')); setVerificationDigits(Array(6).fill(''));
    setSessionId(null); setExpiresAt(null); setError(null); setDeliveryMethod(null);
    setNewPassword(''); setConfirmPassword(''); setPhoneOnFile(null); setPhoneIsVerified(false);
    setPhoneLookedUp(false); setEmail(defaultEmail || '');
    setShowBypassInput(false); setBypassPin(''); setBypassError(null); setAdminBypassVerified(false);
    onClose();
  };

  // Step indicator logic
  const allSteps = showEmailStep ? ['email', 'phone', 'code', 'password', 'success'] : ['phone', 'code', 'password', 'success'];
  const getStepIndex = (s: ResetStep): number => {
    if (adminBypassVerified && s === 'password') {
      return showEmailStep ? 2 : 1;
    }
    return allSteps.indexOf(s);
  };
  const totalSteps = allSteps.length;

  // Check if phone on file matches current digits
  const isUsingPhoneOnFile = phoneOnFile && digits.every(d => d) && getCleanPhoneNumber() === phoneOnFile;

  // Password strength
  const getPasswordStrength = () => {
    if (!newPassword) return { label: '', bars: 0, color: '' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) score++;
    if (score <= 1) return { label: 'Weak', bars: 1, color: 'red' };
    if (score <= 3) return { label: 'Medium', bars: 2, color: 'amber' };
    return { label: 'Strong', bars: 3, color: 'emerald' };
  };

  const strength = getPasswordStrength();

  // ============================================
  // BUTTON STYLE CONSTANTS (High-contrast Darkwave)
  // ============================================
  const btnPrimary = "bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-semibold font-mono rounded-lg hover:from-cyan-500 hover:to-blue-600 shadow-[0_0_20px_rgba(0,200,255,0.25)] hover:shadow-[0_0_30px_rgba(0,200,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all";
  const btnAmber = "bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold font-mono rounded-lg hover:from-amber-500 hover:to-orange-600 shadow-[0_0_20px_rgba(255,180,0,0.2)] hover:shadow-[0_0_30px_rgba(255,180,0,0.35)] disabled:opacity-50 disabled:cursor-not-allowed transition-all";
  const btnSuccess = "bg-gradient-to-r from-emerald-600 to-green-700 text-white font-semibold font-mono rounded-lg hover:from-emerald-500 hover:to-green-600 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all";
  const btnOutline = "bg-gray-800/80 border border-gray-600 text-gray-200 font-mono rounded-lg hover:bg-gray-700 hover:border-gray-500 hover:text-white transition-all";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-gray-900 via-gray-900 to-black border border-cyan-500/30 text-white shadow-[0_0_60px_rgba(0,200,255,0.15)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-mono">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            {step === 'email' ? 'Password Recovery' : 
             step === 'success' ? 'Password Set!' : 
             adminBypassVerified && step === 'password' ? 'Set Your Password' :
             'Secure Password Reset'}
          </DialogTitle>
          <DialogDescription className="text-cyan-300/60 font-mono text-sm">
            {step === 'email' ? 'Enter your email to get started' : 
             adminBypassVerified && step === 'password' ? 'Identity verified via admin PIN' :
             'Q-Core Verified Identity Reset'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {allSteps.map((s, index) => (
              <React.Fragment key={s}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium font-mono transition-all',
                  getStepIndex(step) >= index ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,200,255,0.3)]' : 'bg-gray-800 text-gray-500 border border-gray-700'
                )}>
                  {getStepIndex(step) > index ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>
                {index < totalSteps - 1 && <div className={cn('w-6 h-0.5 transition-all', getStepIndex(step) > index ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gray-700')} />}
              </React.Fragment>
            ))}
          </div>

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-gray-300 font-mono text-sm">Enter your account email address to begin the password recovery process.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-300/80 font-mono text-sm">Email Address</Label>
                <Input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@company.com"
                  className="bg-black/50 border-cyan-500/30 text-white placeholder-gray-500 font-mono focus:border-cyan-400/60"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 p-3 rounded-lg font-mono">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={isLoading || !email.trim()}
                className={cn("w-full py-3", btnPrimary)}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Looking up account...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2"><Mail className="w-4 h-4" />Continue</span>
                )}
              </button>
            </form>
          )}

          {/* Phone Step */}
          {step === 'phone' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-gray-300 font-mono text-sm mb-1">
                  {isLoadingPhone ? 'Looking up your phone number...' : 'Verify your identity to set your password'}
                </p>
                <p className="text-cyan-400/50 text-xs font-mono">{email}</p>
                <p className="text-gray-500 text-xs font-mono mt-1">SMS will be tried first; falls back to email if unavailable.</p>
              </div>

              {/* Phone auto-lookup status */}
              {isLoadingPhone && (
                <div className="flex items-center justify-center gap-2 py-3 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-mono">Looking up phone number...</span>
                </div>
              )}

              {!isLoadingPhone && phoneLookedUp && phoneOnFile && phoneIsVerified && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-green-400 text-sm font-medium font-mono">Verified phone found</p>
                    <p className="text-green-300/70 text-xs font-mono">
                      Phone number auto-filled from your account
                    </p>
                  </div>
                </div>
              )}

              {!isLoadingPhone && phoneLookedUp && phoneOnFile && !phoneIsVerified && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-400 text-sm font-medium font-mono">Phone found (unverified)</p>
                    <p className="text-amber-300/70 text-xs font-mono">Confirm or update the number below</p>
                  </div>
                </div>
              )}

              {!isLoadingPhone && phoneLookedUp && !phoneOnFile && (
                <div className="flex items-center gap-2 bg-gray-500/10 border border-gray-500/30 rounded-lg p-3">
                  <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-sm font-medium font-mono">Enter your phone number</p>
                    <p className="text-gray-400/70 text-xs font-mono">We'll send a verification code to confirm your identity</p>
                  </div>
                </div>
              )}

              {/* Phone digit inputs - only show when NOT in bypass mode */}
              {!showBypassInput && (
                <>
                  <div className="space-y-2">
                    <Label className="text-cyan-300/60 font-mono text-xs text-center block">PHONE NUMBER (10 DIGITS)</Label>
                    <div className="flex justify-center gap-1">
                      {digits.map((digit, index) => (
                        <React.Fragment key={index}>
                          <input ref={el => phoneInputRefs.current[index] = el} type="text" inputMode="numeric" maxLength={1}
                            value={digit} onChange={(e) => handlePhoneDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handlePhoneKeyDown(index, e)}
                            onPaste={(e) => { e.preventDefault(); handlePhoneDigitChange(index, e.clipboardData.getData('text').replace(/\D/g, '')); }}
                            disabled={isLoading || isLoadingPhone}
                            className={cn("w-8 h-10 text-center text-lg font-mono rounded-md border bg-black/60 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all",
                              digit ? "border-cyan-500/50 shadow-[0_0_10px_rgba(0,200,255,0.15)]" : "border-gray-700",
                              (isLoading || isLoadingPhone) && "opacity-50"
                            )} />
                          {(index === 2 || index === 5) && <div className="w-2 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-cyan-500/40" /></div>}
                        </React.Fragment>
                      ))}
                    </div>
                    {digits.every(d => d) && (
                      <p className="text-center text-xs text-cyan-400/60 font-mono mt-1">
                        {getFormattedPhoneDisplay()}
                        {isUsingPhoneOnFile && phoneIsVerified && (
                          <span className="ml-2 text-green-400/70">
                            <BadgeCheck className="w-3 h-3 inline mr-0.5" />verified
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 p-3 rounded-lg font-mono">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {showEmailStep && (
                      <button onClick={() => { setStep('email'); setError(null); }}
                        className={cn("px-4 py-3", btnOutline)}>
                        Back
                      </button>
                    )}
                    <button onClick={handleSendCode} disabled={isLoading || isLoadingPhone || !digits.every(d => d)}
                      className={cn("flex-1 py-3", btnPrimary, !showEmailStep && "w-full")}>
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending...</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2"><Shield className="w-4 h-4" />Send Verification Code</span>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* ============================================ */}
              {/* ADMIN BYPASS SECTION */}
              {/* ============================================ */}
              {isPlatformOwnerEmail && !showBypassInput && (
                <div className="border-t border-gray-700/50 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowBypassInput(true); setError(null); }}
                    className="w-full flex items-center justify-center gap-2 text-amber-400/60 text-xs font-mono hover:text-amber-400 transition-colors group"
                  >
                    <Fingerprint className="w-3.5 h-3.5 group-hover:text-amber-400 transition-colors" />
                    <span>Can't receive verification codes? Use admin PIN</span>
                  </button>
                </div>
              )}

              {/* Admin Bypass PIN Input */}
              {isPlatformOwnerEmail && showBypassInput && (
                <div className="border-t border-amber-500/20 pt-4 space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-3">
                      <Fingerprint className="w-6 h-6 text-amber-400" />
                    </div>
                    <h4 className="text-amber-300 text-sm font-semibold font-mono mb-1">Platform Owner Bypass</h4>
                    <p className="text-gray-400 text-xs font-mono">Enter your 10-digit admin PIN to verify your identity</p>
                  </div>

                  <form onSubmit={handleBypassPinSubmit} className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-amber-300/70 font-mono text-xs text-center block">ADMIN PIN</Label>
                      <Input
                        ref={bypassInputRef}
                        type="password"
                        value={bypassPin}
                        onChange={(e) => { setBypassPin(e.target.value.replace(/\D/g, '').slice(0, 10)); setBypassError(null); }}
                        placeholder="Enter 10-digit PIN"
                        maxLength={10}
                        inputMode="numeric"
                        className="bg-black/50 border-amber-500/30 text-white placeholder-gray-500 font-mono text-center text-xl tracking-[0.3em] focus:border-amber-400/60 focus:shadow-[0_0_20px_rgba(255,180,0,0.15)]"
                        disabled={bypassLocked}
                        required
                      />
                      <p className="text-xs text-gray-500 font-mono text-center">
                        {bypassPin.length}/10 digits
                      </p>
                    </div>

                    {bypassError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 p-3 rounded-lg font-mono">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{bypassError}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowBypassInput(false); setBypassPin(''); setBypassError(null); }}
                        className={cn("px-4 py-3", btnOutline)}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={bypassLocked || bypassPin.length < 10}
                        className={cn("flex-1 py-3", btnAmber)}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Fingerprint className="w-4 h-4" />
                          Verify PIN
                        </span>
                      </button>
                    </div>
                  </form>

                  {bypassLocked && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-400 text-sm font-mono text-center">
                        Access locked for 5 minutes due to failed attempts.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Code Step */}
          {step === 'code' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center mx-auto mb-4">
                  {deliveryMethod === 'email' ? <Mail className="w-8 h-8 text-amber-400" /> : <Lock className="w-8 h-8 text-cyan-400" />}
                </div>
                <p className="text-gray-300 font-mono text-sm">Enter the 6-digit code</p>
                {deliveryMethod === 'email' ? (
                  <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mx-auto max-w-xs">
                    <div className="flex items-center justify-center gap-1.5 text-amber-300 text-xs font-mono">
                      <Mail className="w-3.5 h-3.5" />
                      <span>SMS unavailable — code sent to your email</span>
                    </div>
                    <p className="text-amber-400/70 text-xs font-mono mt-0.5">{email}</p>
                  </div>
                ) : (
                  <p className="text-cyan-400/60 text-xs font-mono mt-1">Sent to {getFormattedPhoneDisplay()}</p>
                )}
              </div>

              {timeRemaining > 0 && (
                <div className="flex items-center justify-center gap-2 text-cyan-300/60 font-mono text-sm">
                  <Clock className="w-4 h-4" /><span>Expires in {formatTime(timeRemaining)}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-cyan-300/60 font-mono text-xs text-center block">VERIFICATION CODE</Label>
                <div className="flex justify-center gap-2">
                  {verificationDigits.map((digit, index) => (
                    <input key={index} ref={el => codeInputRefs.current[index] = el} type="text" inputMode="numeric" maxLength={1}
                      value={digit} onChange={(e) => handleCodeDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      onPaste={(e) => { e.preventDefault(); handleCodeDigitChange(index, e.clipboardData.getData('text').replace(/\D/g, '')); }}
                      disabled={isLoading}
                      className={cn("w-10 h-12 text-center text-xl font-mono rounded-lg border bg-black/60 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all",
                        digit ? "border-cyan-500/50 shadow-[0_0_10px_rgba(0,200,255,0.15)]" : "border-gray-700",
                        isLoading && "opacity-50"
                      )} />
                  ))}
                </div>
              </div>

              {attemptsRemaining < 3 && <p className="text-center text-sm text-amber-400 font-mono">{attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining</p>}

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 p-3 rounded-lg font-mono">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleResendCode} disabled={isLoading || timeRemaining > 240}
                  className={cn("flex-1 py-3", btnOutline, "disabled:opacity-50")}>
                  <span className="flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" />Resend</span>
                </button>
                <button onClick={() => handleVerifyCode(verificationDigits.join(''))} disabled={isLoading || !verificationDigits.every(d => d)}
                  className={cn("flex-1 py-3", btnPrimary)}>
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /></span>
                  ) : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border",
                  adminBypassVerified 
                    ? "bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/40"
                    : "bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/40"
                )}>
                  <KeyRound className={cn("w-8 h-8", adminBypassVerified ? "text-amber-400" : "text-green-400")} />
                </div>
                <p className="text-gray-300 font-mono text-sm">
                  {adminBypassVerified ? 'Admin identity verified! Set your password below.' : 'Identity verified! Set your password below.'}
                </p>
                <p className="text-cyan-400/50 text-xs font-mono mt-1">{email}</p>
                {adminBypassVerified && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
                    <Fingerprint className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-300 text-xs font-mono">Admin PIN Verified</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-cyan-300/80 font-mono text-sm">New Password</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showPassword ? 'text' : 'password'} value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(null); }} placeholder="Enter new password"
                      className="pr-10 bg-black/50 border-cyan-500/30 text-white placeholder-gray-500 font-mono" disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Password strength indicator */}
                  {newPassword.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-400">Strength</span>
                        <span className={cn("text-xs font-mono font-semibold",
                          strength.color === 'red' && 'text-red-400',
                          strength.color === 'amber' && 'text-amber-400',
                          strength.color === 'emerald' && 'text-emerald-400'
                        )}>{strength.label}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((bar) => (
                          <div key={bar} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300",
                            bar <= strength.bars
                              ? strength.color === 'red' ? 'bg-red-500' : strength.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                              : 'bg-gray-700/60'
                          )} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3 mt-2">
                    <p className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Requirements</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: '8+ characters', test: newPassword.length >= 8 },
                        { label: 'Uppercase', test: /[A-Z]/.test(newPassword) },
                        { label: 'Number', test: /[0-9]/.test(newPassword) },
                        { label: 'Special char', test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword) },
                      ].map((req, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={cn("w-3 h-3 rounded-full flex items-center justify-center",
                            req.test ? 'bg-emerald-500/20 border border-emerald-500/60' : newPassword.length > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-800 border border-gray-600/40'
                          )}>
                            {req.test && <CheckCircle2 className="w-2 h-2 text-emerald-400" />}
                          </div>
                          <span className={cn("text-xs font-mono", req.test ? 'text-emerald-400' : newPassword.length > 0 ? 'text-red-400/70' : 'text-gray-500')}>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-cyan-300/80 font-mono text-sm">Confirm Password</Label>
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} placeholder="Confirm new password"
                    className={cn("bg-black/50 text-white placeholder-gray-500 font-mono",
                      confirmPassword.length > 0
                        ? newPassword === confirmPassword ? 'border-emerald-500/50' : 'border-red-500/50'
                        : 'border-cyan-500/30'
                    )} disabled={isLoading} />
                  {confirmPassword.length > 0 && newPassword === confirmPassword && (
                    <p className="text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>
                  )}
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-red-400 text-xs font-mono flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Passwords do not match</p>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 p-3 rounded-lg font-mono">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              <button onClick={handleSetPassword} disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                className={cn(
                  "w-full py-3.5",
                  adminBypassVerified ? btnAmber : btnSuccess
                )}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Setting Password...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" />Set Password</span>
                )}
              </button>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white font-mono">Password Set Successfully!</h3>
                <p className="text-gray-400 mt-1 font-mono text-sm">
                  {adminBypassVerified ? 'Signing you in automatically...' : 'You can now sign in with your new password'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{adminBypassVerified ? 'Signing in...' : 'Redirecting to sign in...'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-cyan-500/20 pt-4">
          <p className="text-xs text-cyan-400/40 text-center flex items-center justify-center gap-1 font-mono">
            <Shield className="w-3 h-3" />
            Protected by Q-CORE AES-256-GCM + SHA-512 Signed + ML-KEM-1024 Encryption
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SMSPasswordResetModal;
