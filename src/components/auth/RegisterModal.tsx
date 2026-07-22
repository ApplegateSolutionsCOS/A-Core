import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CloseIcon, EyeIcon, EyeOffIcon, LockIcon, CheckIcon, ApplegateCoreLogo } from '@/components/icons/Icons';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  selectedPlan?: string;
}

// Map plan tier ids to display names + prices
const PLAN_INFO: Record<string, { name: string; price: string }> = {
  basic: { name: 'Basic Account', price: '$249/mo' },
  pro: { name: 'Pro Account', price: '$499/mo' },
  expert: { name: 'Expert Account', price: '$899/mo' },
  enterprise: { name: 'Enterprise', price: '$1,999/mo' },
  enterprisePlus: { name: 'Enterprise+', price: '$4,999/mo' },
  whiteGlove: { name: 'White Glove', price: '$8,999/mo' },
};


// TOGGLE THIS TO 'live' WHEN YOU ARE READY FOR REAL SIGNUPS
const REGISTRATION_MODE: 'beta' | 'live' = 'beta';

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin, selectedPlan }) => {
  const planInfo = selectedPlan ? PLAN_INFO[selectedPlan] : undefined;
  const { register } = useAuth();
  
  // Shared States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Live Registration Specific States
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Beta Request Specific States
  const [isHuman, setIsHuman] = useState(false);
  const [betaSubmitted, setBetaSubmitted] = useState(false);
  const [useCase, setUseCase] = useState('');

  // NATIVE CLOUDFLARE TURNSTILE INTEGRATION
  useEffect(() => {
    // 1. Create global callbacks for the Turnstile script to talk to React
    (window as any).onTurnstileSuccess = () => {
      setIsHuman(true);
      setError('');
    };
    (window as any).onTurnstileError = () => {
      setError('Security check failed. Please refresh the page.');
      setIsHuman(false);
    };
    (window as any).onTurnstileExpire = () => {
      setIsHuman(false);
    };

    // 2. Inject the Cloudflare script if it doesn't exist yet
    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // 3. Cleanup callbacks when modal closes
    return () => {
      delete (window as any).onTurnstileSuccess;
      delete (window as any).onTurnstileError;
      delete (window as any).onTurnstileExpire;
    };
  }, []);

  const handleBetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isHuman) {
      setError('Please verify that you are human.');
      return;
    }

    setIsLoading(true);

    try {
      // Securely pass data to the private schema via our public RPC
      // Prefix the selected plan onto the use case so it is stored with the record
      const planPrefix = planInfo ? `[Selected Plan: ${planInfo.name} (${planInfo.price})] ` : '';
      const { error: insertError } = await supabase.rpc('submit_beta_request', {
        p_full_name: fullName,
        p_email: email,
        p_company: companyName,
        p_use_case: planPrefix + useCase
      });
      
      if (insertError) throw insertError;
      
      setBetaSubmitted(true);
    } catch (err: any) {
      console.error('Beta request error:', err);
      setError('Failed to submit request. Please try again.');
    }

    setIsLoading(false);
  };

  const handleLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);

    const result = await register(email, password, fullName, companyName || undefined, selectedPlan);
    
    if (!result.success) {
      setError(result.error || 'Registration failed');
    } else {
      onClose();
    }
    
    setIsLoading(false);
  };

  // Original Stripe Checkout logic preserved
  const handleStripeCheckout = async () => {
    if (!email || !fullName || !companyName) {
      setError('Please fill in all fields');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'new_organization',
          organizationName: companyName,
          email: email,
          successUrl: `${window.location.origin}?checkout=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}&company=${encodeURIComponent(companyName)}`,
          cancelUrl: `${window.location.origin}?checkout=cancelled`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        const result = await register(email, password, fullName, companyName);
        if (!result.success) {
          setError(result.error || 'Registration failed');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const result = await register(email, password, fullName, companyName);
      if (!result.success) {
        setError(result.error || 'Registration failed');
      } else {
        onClose();
      }
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(0,180,255,0.2)]">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 via-cyan-600/15 to-blue-900/30" />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="absolute inset-0 rounded-2xl border border-cyan-400/30" />
        <div className="absolute inset-[1px] rounded-2xl border border-cyan-500/10" />
        
        <div className="relative p-8 overflow-y-auto max-h-[90vh] darkwave-scrollbar">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all z-10"
          >
            <CloseIcon size={20} />
          </button>

          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute -inset-3 bg-cyan-400/20 rounded-full blur-xl" />
              <ApplegateCoreLogo size={48} className="mx-auto mb-4 relative z-10" />
            </div>
            <h2 className="text-2xl font-bold text-white font-mono">
              {REGISTRATION_MODE === 'beta' ? 'Request Beta Access' : 'Create Account'}
            </h2>
            <p className="text-cyan-300/60 mt-1 font-mono text-sm">
              {REGISTRATION_MODE === 'beta' 
                ? 'Join the waitlist for A-CORE BOS' 
                : 'Start your 14-day free trial'}
            </p>
          </div>

          {/* Selected plan banner */}
          {planInfo && !betaSubmitted && (
            <div className="mb-6 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 flex items-center justify-between">
              <div>
                <p className="text-cyan-300/60 font-mono text-xs">Selected Plan</p>
                <p className="text-white font-mono font-bold text-sm">{planInfo.name}</p>
              </div>
              <span className="text-cyan-400 font-mono font-bold">{planInfo.price}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-sm font-mono">{error}</p>
            </div>
          )}

          {/* ================= SUCCESS STATE FOR BETA ================= */}
          {REGISTRATION_MODE === 'beta' && betaSubmitted ? (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon size={32} className="text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-mono">Request Received</h3>
              <p className="text-cyan-200/60 font-mono text-sm">
                Thank you for your interest in A-CORE BOS. We are currently rolling out access in batches. Our team will contact you at <strong>{email}</strong> when your workspace is ready.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-800/80 text-white font-mono rounded-lg hover:bg-gray-700 transition-colors border border-gray-600"
              >
                Return to Site
              </button>
            </div>
          ) : (
            /* ================= DYNAMIC FORM ================= */
            <form onSubmit={REGISTRATION_MODE === 'beta' ? handleBetaSubmit : handleLiveSubmit} className="space-y-5">
              
              {/* SHARED FIELDS */}
              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/90 transition-all login-input-dark"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">Work Email</label>
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
                <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/90 transition-all login-input-dark"
                  placeholder="Your Company Inc."
                  required={REGISTRATION_MODE === 'beta'}
                />
              </div>

              {/* LIVE REGISTRATION SPECIFIC FIELDS */}
              {REGISTRATION_MODE === 'live' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/90 transition-all login-input-dark"
                        placeholder="Create a strong password"
                        required
                        minLength={8}
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

                  <div className="relative rounded-lg border border-cyan-500/30 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10" />
                    <div className="relative z-10 p-4">
                      <h4 className="text-cyan-300 font-medium mb-2 font-mono">What you'll get:</h4>
                      <ul className="space-y-2 text-sm text-cyan-200/60 font-mono">
                        {[
                          'Organization Admin access ($249/mo after trial)',
                          'All 6 workspaces with 60+ MiniApps',
                          'Add team members at $19/user/mo',
                          'Q-CORE quantum-immune encryption',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckIcon size={16} className="text-cyan-400 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-cyan-500/30 bg-black/50 text-cyan-500 focus:ring-cyan-500/50" 
                    />
                    <span className="text-sm text-cyan-300/50 font-mono">
                      I agree to the <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">Terms of Service</a> and <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">Privacy Policy</a>
                    </span>
                  </label>
                </>
              )}

              {/* BETA REQUEST SPECIFIC FIELDS */}
              {REGISTRATION_MODE === 'beta' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">Primary Use Case</label>
                    <textarea
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/90 transition-all login-input-dark resize-none"
                      placeholder="How do you plan to use A-CORE BOS?"
                      rows={2}
                      required
                    />
                  </div>

                  {/* NATIVE CLOUDFLARE TURNSTILE WIDGET */}
                  <div className="flex justify-center my-4 min-h-[65px]">
                    <div 
                      className="cf-turnstile" 
                      data-sitekey="0x4AAAAAADdd4nWfuVrREpoY" 
                      data-theme="dark"
                      data-callback="onTurnstileSuccess"
                      data-error-callback="onTurnstileError"
                      data-expired-callback="onTurnstileExpire"
                    ></div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading || (REGISTRATION_MODE === 'live' ? !agreedToTerms : !isHuman)}
                className="w-full py-4 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-semibold font-mono rounded-xl hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_35px_rgba(0,255,255,0.4)] text-lg neon-glow-cyan"
              >
                {isLoading 
                  ? 'Processing...' 
                  : REGISTRATION_MODE === 'beta' 
                    ? 'Submit Beta Request' 
                    : 'Start Free Trial'}
              </button>
            </form>
          )}

          {!betaSubmitted && (
            <>
              <div className="mt-6 pt-6 border-t border-cyan-500/20">
                <div className="flex items-center justify-center gap-2 text-cyan-400/40 text-xs font-mono">
                  <LockIcon size={14} className="text-cyan-400/50" />
                  <span>Protected by Q-CORE AES-256-GCM + SHA-512 Signed + ML-KEM-1024 Encryption</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-cyan-300/50 font-mono text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={onSwitchToLogin}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;

{/* OLD REGISTRATION CODE BELOW - SIMPLY UNCOMMENT BY SELECTING ALL AND USING CTRL + / WHEN READY TO REDEPLOY}

// import React, { useState } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import { supabase } from '@/lib/supabase';
// import { CloseIcon, EyeIcon, EyeOffIcon, LockIcon, CheckIcon, ApplegateCoreLogo } from '@/components/icons/Icons';

// interface RegisterModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSwitchToLogin: () => void;
// }

// const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
//   const { register } = useAuth();
//   const [fullName, setFullName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [companyName, setCompanyName] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [agreedToTerms, setAgreedToTerms] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');

//     if (!agreedToTerms) {
//       setError('Please agree to the terms and conditions');
//       return;
//     }

//     setIsLoading(true);

//     const result = await register(email, password, fullName, companyName || undefined);
    
//     if (!result.success) {
//       setError(result.error || 'Registration failed');
//     } else {
//       onClose();
//     }
    
//     setIsLoading(false);
//   };

//   const handleStripeCheckout = async () => {
//     if (!email || !fullName || !companyName) {
//       setError('Please fill in all fields');
//       return;
//     }

//     if (!agreedToTerms) {
//       setError('Please agree to the terms and conditions');
//       return;
//     }

//     setIsLoading(true);
//     setError('');

//     try {
//       const { data, error } = await supabase.functions.invoke('stripe-checkout', {
//         body: {
//           type: 'new_organization',
//           organizationName: companyName,
//           email: email,
//           successUrl: `${window.location.origin}?checkout=success&email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}&company=${encodeURIComponent(companyName)}`,
//           cancelUrl: `${window.location.origin}?checkout=cancelled`
//         }
//       });

//       if (error) throw error;

//       if (data?.url) {
//         window.location.href = data.url;
//       } else {
//         // Fallback to regular registration if Stripe is not configured
//         const result = await register(email, password, fullName, companyName);
//         if (!result.success) {
//           setError(result.error || 'Registration failed');
//         } else {
//           onClose();
//         }
//       }
//     } catch (err: any) {
//       console.error('Checkout error:', err);
//       // Fallback to regular registration
//       const result = await register(email, password, fullName, companyName);
//       if (!result.success) {
//         setError(result.error || 'Registration failed');
//       } else {
//         onClose();
//       }
//     }

//     setIsLoading(false);
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       {/* Backdrop with translucent black */}
//       <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      
//       {/* Modal with lighter cyan to darker blue gradient */}
//       <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(0,180,255,0.2)]">
//         {/* Gradient background - lighter cyan to darker blue */}
//         <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 via-cyan-600/15 to-blue-900/30" />
//         <div className="absolute inset-0 bg-black/70" />
        
//         {/* Subtle hex pattern overlay */}
//         <div className="absolute inset-0 hex-pattern opacity-10" />
        
//         {/* Glow border effect */}
//         <div className="absolute inset-0 rounded-2xl border border-cyan-400/30" />
//         <div className="absolute inset-[1px] rounded-2xl border border-cyan-500/10" />
        
//         {/* Content */}
//         <div className="relative p-8 overflow-y-auto max-h-[90vh] darkwave-scrollbar">
//           {/* Close Button */}
//           <button
//             onClick={onClose}
//             className="absolute top-4 right-4 p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all z-10"
//           >
//             <CloseIcon size={20} />
//           </button>

//           {/* Logo */}
//           <div className="text-center mb-8">
//             <div className="relative inline-block">
//               <div className="absolute -inset-3 bg-cyan-400/20 rounded-full blur-xl" />
//               <ApplegateCoreLogo size={48} className="mx-auto mb-4 relative z-10" />
//             </div>
//             <h2 className="text-2xl font-bold text-white font-mono">Create Account</h2>
//             <p className="text-cyan-300/60 mt-1 font-mono text-sm">Start your 14-day free trial</p>
//           </div>


//           {/* Error Message */}
//           {error && (
//             <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
//               <p className="text-red-400 text-sm font-mono">{error}</p>
//             </div>
//           )}

//           {/* Form */}
//           <form onSubmit={handleSubmit} className="space-y-5">
//             <div>
//               <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
//                 Full Name
//               </label>
//               <input
//                 type="text"
//                 value={fullName}
//                 onChange={(e) => setFullName(e.target.value)}
//                 className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/60 transition-all"
//                 placeholder="John Smith"
//                 required
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
//                 Work Email
//               </label>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/60 transition-all"
//                 placeholder="you@company.com"
//                 required
//               />
//               <p className="text-xs text-cyan-400/40 mt-1 font-mono">
//                 Your email domain determines your organization
//               </p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
//                 Company Name
//               </label>
//               <input
//                 type="text"
//                 value={companyName}
//                 onChange={(e) => setCompanyName(e.target.value)}
//                 className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/60 transition-all"
//                 placeholder="Your Company Inc."
//               />
//               <p className="text-xs text-cyan-400/40 mt-1 font-mono">
//                 Required if you're the first from your organization
//               </p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-cyan-300/80 mb-2 font-mono">
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_20px_rgba(0,200,255,0.15)] focus:bg-black/60 transition-all"
//                   placeholder="Create a strong password"
//                   required
//                   minLength={8}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-cyan-400 transition-colors"
//                 >
//                   {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
//                 </button>
//               </div>
//             </div>

//             {/* Pricing Info - NuDarkwave with cyan gradient */}
//             <div className="relative rounded-lg border border-cyan-500/30 overflow-hidden">
//               <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10" />
//               <div className="relative z-10 p-4">
//                 <h4 className="text-cyan-300 font-medium mb-2 font-mono">What you'll get:</h4>
//                 <ul className="space-y-2 text-sm text-cyan-200/60 font-mono">
//                   {[
//                     'Organization Admin access ($249/mo after trial)',
//                     'All 6 workspaces with 60+ MiniApps',
//                     'Add team members at $19/user/mo',
//                     'Q-CORE quantum-immune encryption',
//                   ].map((item, i) => (
//                     <li key={i} className="flex items-center gap-2">
//                       <CheckIcon size={16} className="text-cyan-400 flex-shrink-0" />
//                       {item}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             </div>

//             <label className="flex items-start gap-3 cursor-pointer">
//               <input 
//                 type="checkbox" 
//                 checked={agreedToTerms}
//                 onChange={(e) => setAgreedToTerms(e.target.checked)}
//                 className="w-4 h-4 mt-0.5 rounded border-cyan-500/30 bg-black/50 text-cyan-500 focus:ring-cyan-500/50" 
//               />
//               <span className="text-sm text-cyan-300/50 font-mono">
//                 I agree to the{' '}
//                 <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">Terms of Service</a>
//                 {' '}and{' '}
//                 <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">Privacy Policy</a>
//               </span>
//             </label>

//             <button
//               type="submit"
//               disabled={isLoading || !agreedToTerms}
//               className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-semibold font-mono rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(0,200,255,0.25)] hover:shadow-[0_0_35px_rgba(0,200,255,0.4)]"

//             >
//               {isLoading ? 'Creating account...' : 'Start Free Trial'}
//             </button>
//           </form>

//           {/* Q-CORE Security Badge */}
//           <div className="mt-6 pt-6 border-t border-cyan-500/20">
//             <div className="flex items-center justify-center gap-2 text-cyan-400/40 text-xs font-mono">
//               <LockIcon size={14} className="text-cyan-400/50" />
//               <span>Protected by Q-CORE AES-256-GCM + SHA-512 Signed + ML-KEM-1024 Encryption</span>

//             </div>
//           </div>

//           {/* Switch to Login */}
//           <div className="mt-6 text-center">
//             <p className="text-cyan-300/50 font-mono text-sm">
//               Already have an account?{' '}
//               <button
//                 onClick={onSwitchToLogin}
//                 className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
//               >
//                 Sign in
//               </button>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RegisterModal;