import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedPinInput } from './MaskedPinInput';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';

import { 
  Shield, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  Lock,
  Clock,
  BadgeCheck,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SMSVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
  defaultPhoneNumber?: string;
}

type VerificationStep = 'phone' | 'code' | 'verified';

export const SMSVerificationModal: React.FC<SMSVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  email,
  defaultPhoneNumber = '',
}) => {
  const [step, setStep] = useState<VerificationStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [verificationCode, setVerificationCode] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [phoneOnFile, setPhoneOnFile] = useState<string | null>(null);
  const [phoneIsVerified, setPhoneIsVerified] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'sms' | 'email' | null>(null);

  const fetchUserPhone = useCallback(async () => {
    if (!email) return;
    setIsLoadingPhone(true);
    try {
      const result = await invokeEdgeFunction('secure-auth', {
        action: 'get_user_phone', email: email.toLowerCase().trim()
      });
      if (result.error) return;
      const data = result.data;
      if (data?.success && data?.phoneNumber) {
        setPhoneOnFile(data.phoneNumber);
        setPhoneIsVerified(data.phoneVerified || false);
        const digits = data.phoneNumber.replace(/\D/g, '');
        const localDigits = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
        if (localDigits.length === 10) {
          setPhoneNumber(`(${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6, 10)}`);
        } else {
          setPhoneNumber(data.phoneNumber);
        }
      }
    } catch (err) {
      console.error('[SMSVerification] Error fetching phone:', err);
    } finally {
      setIsLoadingPhone(false);
    }
  }, [email]);


  useEffect(() => {
    if (isOpen && email) fetchUserPhone();
  }, [isOpen, email, fetchUserPhone]);

  useEffect(() => {
    if (!isOpen) {
      setStep('phone');
      setVerificationCode('');
      setSessionId(null);
      setExpiresAt(null);
      setError(null);
      setAttemptsRemaining(3);
      setTimeRemaining(0);
      setDeliveryMethod(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0) {
        setError('Verification code has expired. Please request a new code.');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(e.target.value));
    setError(null);
  };

  const getCleanPhoneNumber = (): string => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
  };

  const handleSendCode = async () => {
    const cleanPhone = getCleanPhoneNumber();
    if (cleanPhone.length < 11) {
      setError('Please enter a valid phone number');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const result = await invokeEdgeFunction('sms-verification', {
        action: 'send_code', email, phoneNumber: cleanPhone
      });
      const data = result.data;
      if (result.error) throw new Error(result.error || 'Failed to send verification code');
      if (!data?.success) throw new Error(data?.error || 'Failed to send verification code');

      setSessionId(data.sessionId);
      setExpiresAt(new Date(data.expiresAt));
      setDeliveryMethod(data.deliveryMethod || 'sms');
      setStep('code');
      setAttemptsRemaining(3);
    } catch (err: any) {
      console.error('[SMSVerification] Send code error:', err);
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
      const result = await invokeEdgeFunction('sms-verification', {
        action: 'verify_code', email, code, sessionId, phoneNumber: getCleanPhoneNumber()
      });
      const data = result.data;
      if (result.error) throw new Error(result.error || 'Verification failed');
      if (!data?.success) {
        const remaining = data?.attemptsRemaining ?? attemptsRemaining - 1;
        setAttemptsRemaining(remaining);
        if (remaining <= 0) {
          setError('Maximum attempts exceeded. Please request a new code.');
          setStep('phone');
        } else {
          throw new Error(data?.error || 'Invalid verification code');
        }
        return;
      }

      setStep('verified');
      setTimeout(() => onVerified(), 1500);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setVerificationCode('');
    } finally {
      setIsLoading(false);
    }
  };


  const handleResendCode = async () => {
    setVerificationCode('');
    setError(null);
    await handleSendCode();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setStep('phone');
    setVerificationCode('');
    setSessionId(null);
    setExpiresAt(null);
    setError(null);
    setDeliveryMethod(null);
    onClose();
  };

  const isUsingPhoneOnFile = phoneOnFile && getCleanPhoneNumber() === phoneOnFile;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-cyan-400" />
            Identity Verification
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Secure authentication for Platform Owner access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {['phone', 'code', 'verified'].map((s, index) => (
              <React.Fragment key={s}>
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  step === s || (['code', 'verified'].includes(step) && s === 'phone') || (step === 'verified' && s === 'code')
                    ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'
                )}>
                  {step === 'verified' && s !== 'verified' ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>
                {index < 2 && (
                  <div className={cn('w-12 h-0.5 transition-all',
                    (['code', 'verified'].includes(step) && s === 'phone') || (step === 'verified' && s === 'code')
                      ? 'bg-cyan-500' : 'bg-gray-700'
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Phone Number Step */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="text-center">
                <Phone className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <p className="text-gray-300">
                  {isLoadingPhone ? 'Checking for verified phone number...' : 'Enter your phone number to receive a verification code'}
                </p>
                <p className="text-xs text-gray-500 mt-1">SMS will be attempted first; if unavailable, code will be sent to your email.</p>
              </div>

              {isLoadingPhone && (
                <div className="flex items-center justify-center gap-2 py-3 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Looking up phone number...</span>
                </div>
              )}

              {!isLoadingPhone && phoneOnFile && phoneIsVerified && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-green-400 text-sm font-medium">Verified phone on file</p>
                    <p className="text-green-300/70 text-xs truncate">
                      {phoneOnFile.replace(/(\+1)(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4')}
                    </p>
                  </div>
                </div>
              )}

              {!isLoadingPhone && phoneOnFile && !phoneIsVerified && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-400 text-sm font-medium">Unverified phone on file</p>
                    <p className="text-amber-300/70 text-xs">Verify this number to complete setup</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-200">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">+1</span>
                  <Input id="phone" type="tel" value={phoneNumber} onChange={handlePhoneChange}
                    placeholder="(555) 555-5555" className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                    disabled={isLoading || isLoadingPhone} />
                  {isUsingPhoneOnFile && phoneIsVerified && (
                    <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button onClick={handleSendCode} disabled={isLoading || isLoadingPhone || phoneNumber.replace(/\D/g, '').length < 10}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>) : (<><MessageSquare className="w-4 h-4 mr-2" />Send Verification Code</>)}
              </Button>
            </div>
          )}

          {/* Code Entry Step */}
          {step === 'code' && (
            <div className="space-y-4">
              <div className="text-center">
                {deliveryMethod === 'email' ? (
                  <Mail className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                ) : (
                  <Lock className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                )}
                <p className="text-gray-300">
                  Enter the 6-digit code {deliveryMethod === 'email' ? 'sent to your email' : 'sent to your phone'}
                </p>
                {deliveryMethod === 'email' ? (
                  <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mx-auto max-w-xs">
                    <div className="flex items-center justify-center gap-2 text-amber-300 text-xs">
                      <Mail className="w-3.5 h-3.5" />
                      <span>SMS unavailable — code sent to your email instead</span>
                    </div>
                    <p className="text-amber-400/70 text-xs mt-1">{email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">{phoneNumber}</p>
                )}
              </div>

              {timeRemaining > 0 && (
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Code expires in {formatTime(timeRemaining)}</span>
                </div>
              )}

              <MaskedPinInput length={6} value={verificationCode} onChange={setVerificationCode}
                onComplete={handleVerifyCode} disabled={isLoading} error={error || undefined} label="Verification Code" />

              {attemptsRemaining < 3 && (
                <p className="text-center text-sm text-yellow-400">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleResendCode} disabled={isLoading || timeRemaining > 240}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800">
                  <RefreshCw className="w-4 h-4 mr-2" />Resend Code
                </Button>
                <Button onClick={() => handleVerifyCode(verificationCode)} disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>

              <p className="text-xs text-gray-600 text-center">If you are in danger, enter 911911 as your code</p>
            </div>
          )}

          {/* Verified Step */}
          {step === 'verified' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Verification Complete</h3>
                <p className="text-gray-400 mt-1">Your identity has been verified successfully</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Proceeding to secure access...</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Protected by end-to-end encryption
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SMSVerificationModal;
