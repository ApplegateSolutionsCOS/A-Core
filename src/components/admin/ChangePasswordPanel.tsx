import React, { useState } from 'react';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import { useAuth } from '@/contexts/AuthContext';
import { LockIcon, CheckIcon, EyeIcon, EyeOffIcon, ShieldIcon } from '@/components/icons/Icons';

const ChangePasswordPanel: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    
    if (score <= 2) return { score, label: 'Weak', color: 'red' };
    if (score <= 4) return { score, label: 'Fair', color: 'yellow' };
    if (score <= 5) return { score, label: 'Good', color: 'cyan' };
    return { score, label: 'Strong', color: 'green' };
  };

  const getRequirements = (pw: string) => [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'Contains a number', met: /[0-9]/.test(pw) },
    { label: 'Contains special character', met: /[^a-zA-Z0-9]/.test(pw) },
  ];

  const strength = getPasswordStrength(newPassword);
  const requirements = getRequirements(newPassword);
  const allRequirementsMet = requirements.every(r => r.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!currentPassword) {
      setResult({ success: false, message: 'Current password is required' });
      return;
    }
    if (!allRequirementsMet) {
      setResult({ success: false, message: 'New password does not meet all requirements' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setResult({ success: false, message: 'New passwords do not match' });
      return;
    }
    if (currentPassword === newPassword) {
      setResult({ success: false, message: 'New password must be different from current password' });
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await invokeEdgeFunction('secure-auth', {
      action: 'change_password',
      email: (user as any)?.email || '',
      currentPassword,
      newPassword,
    });

    if (error) {
      setResult({ success: false, message: error });
    } else if (data?.success) {
      setResult({ success: true, message: data.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setResult({ success: false, message: data?.error || 'Failed to change password' });
    }

    setIsSubmitting(false);
  };

  const strengthBarWidth = Math.min((strength.score / 7) * 100, 100);

  return (
    <div className="relative rounded-xl border border-cyan-500/50 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-transparent to-purple-950/20" />
      
      <div className="relative z-10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="absolute -inset-2 bg-cyan-500/30 rounded-xl blur-lg animate-pulse" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 flex items-center justify-center">
              <LockIcon size={24} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-mono font-bold text-white">Change Password</h3>
            <p className="text-xs font-mono text-cyan-400">Update your account password securely</p>
          </div>
        </div>

        {result && (
          <div className={`rounded-lg p-4 mb-6 border ${
            result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckIcon size={16} className="text-green-400" />
              ) : (
                <ShieldIcon size={16} className="text-red-400" />
              )}
              <p className={`font-mono text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 pr-12 text-white font-mono focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,255,255,0.15)] transition-all"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors"
              >
                {showCurrent ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-mono font-medium text-gray-400 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 pr-12 text-white font-mono focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,255,255,0.15)] transition-all"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors"
              >
                {showNew ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>

            {/* Strength Bar */}
            {newPassword && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-500">Password Strength</span>
                  <span className={`text-xs font-mono font-bold ${
                    strength.color === 'red' ? 'text-red-400' :
                    strength.color === 'yellow' ? 'text-yellow-400' :
                    strength.color === 'cyan' ? 'text-cyan-400' :
                    'text-green-400'
                  }`}>{strength.label}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      strength.color === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.5)]' :
                      strength.color === 'yellow' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(255,200,0,0.5)]' :
                      strength.color === 'cyan' ? 'bg-cyan-500 shadow-[0_0_8px_rgba(0,255,255,0.5)]' :
                      'bg-green-500 shadow-[0_0_8px_rgba(0,255,0,0.5)]'
                    }`}
                    style={{ width: `${strengthBarWidth}%` }}
                  />
                </div>
              </div>
            )}

            {/* Requirements */}
            {newPassword && (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      req.met ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-800 border border-gray-700'
                    }`}>
                      {req.met && <CheckIcon size={10} className="text-green-400" />}
                    </div>
                    <span className={`text-xs font-mono ${req.met ? 'text-green-400' : 'text-gray-500'}`}>{req.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-gray-950 border rounded-lg px-4 py-3 pr-12 text-white font-mono focus:outline-none transition-all ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-500/50 focus:border-red-500/80'
                    : confirmPassword && confirmPassword === newPassword
                    ? 'border-green-500/50 focus:border-green-500/80'
                    : 'border-gray-800 focus:border-cyan-500/50'
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors"
              >
                {showConfirm ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-red-400 text-xs font-mono mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !currentPassword || !allRequirementsMet || newPassword !== confirmPassword}
            className="w-full py-3 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono font-medium"
          >
            {isSubmitting ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPanel;
