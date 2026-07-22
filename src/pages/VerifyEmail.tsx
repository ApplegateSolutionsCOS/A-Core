import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckIcon, CloseIcon, MailIcon } from '@/components/icons/Icons';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      setMessage('No verification token provided');
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('email-verification', {
        body: { action: 'verify', token }
      });

      if (error) {
        setStatus('error');
        setMessage(error.message || 'Failed to verify email');
        return;
      }

      if (data.error) {
        setStatus('error');
        setMessage(data.error);
        return;
      }

      setStatus('success');
      setMessage(data.message || 'Email verified successfully!');
      if (data.email) setEmail(data.email);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/?login=true');
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An error occurred during verification');
    }
  };

  const handleResendVerification = async () => {
    const userEmail = prompt('Enter your email address to resend verification:');
    if (!userEmail) return;

    try {
      const { data, error } = await supabase.functions.invoke('email-verification', {
        body: { action: 'resend', email: userEmail }
      });

      if (error || data?.error) {
        alert(data?.error || error?.message || 'Failed to resend verification email');
        return;
      }

      alert('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      alert(err.message || 'Failed to resend verification email');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === 'verifying' && (
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center animate-bounce-once">
                <CheckIcon size={40} className="text-green-400" />
              </div>
            )}
            {(status === 'error' || status === 'no-token') && (
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                <CloseIcon size={40} className="text-red-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-2 font-mono">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'no-token' && 'Invalid Link'}
          </h1>

          {/* Message */}
          <p className={`text-center mb-6 font-mono ${
            status === 'success' ? 'text-green-400' : 
            status === 'error' || status === 'no-token' ? 'text-red-400' : 
            'text-gray-400'
          }`}>
            {message || 'Please wait while we verify your email address...'}
          </p>

          {/* Success state */}
          {status === 'success' && (
            <div className="space-y-4">
              {email && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <MailIcon size={18} className="text-green-400" />
                  <span className="text-green-300 font-mono text-sm">{email}</span>
                </div>
              )}
              <p className="text-gray-500 text-center text-sm font-mono">
                Redirecting to login in 3 seconds...
              </p>
              <button
                onClick={() => navigate('/?login=true')}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-mono font-medium hover:from-cyan-400 hover:to-cyan-500 transition-all"
              >
                Go to Login Now
              </button>
            </div>
          )}

          {/* Error state */}
          {(status === 'error' || status === 'no-token') && (
            <div className="space-y-4">
              <button
                onClick={handleResendVerification}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-mono font-medium hover:from-cyan-400 hover:to-cyan-500 transition-all"
              >
                Resend Verification Email
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 border border-gray-700 text-gray-400 rounded-lg font-mono hover:bg-gray-900 transition-all"
              >
                Return to Home
              </button>
            </div>
          )}

          {/* Verifying state */}
          {status === 'verifying' && (
            <div className="flex justify-center">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6 font-mono">
          Having trouble? Contact support for assistance.
        </p>
      </div>

      <style>{`
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
