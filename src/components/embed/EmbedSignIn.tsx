import React from 'react';

/**
 * EmbedSignIn - A component that can be used to generate embeddable sign-in buttons
 * for external websites like www.applegate.solutions
 * 
 * NOTE: This component and embed codes are ONLY visible to the Platform Owner
 * through the Platform Owner Panel settings.
 */

interface EmbedSignInProps {
  variant?: 'default' | 'compact' | 'full';
  onSignIn?: () => void;
}

const EmbedSignIn: React.FC<EmbedSignInProps> = ({ variant = 'default', onSignIn }) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://core.applegate.solutions';
  
  const handleClick = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      // Redirect to login
      window.location.href = `${baseUrl}?action=login`;
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
        </svg>
        Sign In
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/697a4ecd5b86994479b1bd46_1769628002643_35f0a966.png" 
            alt="Applegate CORE" 
            className="h-10"
          />
          <div>
            <span className="text-white font-bold">Applegate</span>
            <span className="text-cyan-400 font-bold ml-1">CORE</span>
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Access your Business Operating System
        </p>
        <button
          onClick={handleClick}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
          </svg>
          Sign in to CORE BOS
        </button>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/697a4ecd5b86994479b1bd46_1769628022208_dadb3d77.png" 
            alt="Q-CORE" 
            className="h-4 rounded"
          />
          <span>Protected by Q-CORE Security</span>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
      </svg>
      Sign in to CORE BOS
    </button>
  );
};

/**
 * Generate embed code for external websites
 * NOTE: These codes are only accessible to the Platform Owner
 */
export const generateEmbedCode = (variant: 'default' | 'compact' | 'full' = 'default'): string => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://core.applegate.solutions';
  
  if (variant === 'compact') {
    return `<a href="${baseUrl}?action=login" 
  style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:linear-gradient(to right,#06b6d4,#2563eb);color:white;font-weight:500;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;"
  target="_blank" rel="noopener noreferrer">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
  </svg>
  Sign In
</a>`;
  }

  if (variant === 'full') {
    return `<div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;max-width:320px;font-family:system-ui,sans-serif;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    <img src="https://d64gsuwffb70l.cloudfront.net/697a4ecd5b86994479b1bd46_1769628002643_35f0a966.png" alt="CORE" style="height:40px;">
    <div>
      <span style="color:white;font-weight:700;">Applegate</span>
      <span style="color:#22d3ee;font-weight:700;margin-left:4px;">CORE</span>
    </div>
  </div>
  <p style="color:#94a3b8;font-size:14px;margin-bottom:16px;">Access your Business Operating System</p>
  <a href="${baseUrl}?action=login" 
    style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;background:linear-gradient(to right,#06b6d4,#2563eb);color:white;font-weight:600;border-radius:8px;text-decoration:none;width:100%;box-sizing:border-box;"
    target="_blank" rel="noopener noreferrer">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
    </svg>
    Sign in to CORE BOS
  </a>
  <div style="margin-top:16px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;color:#64748b;">
    <img src="https://d64gsuwffb70l.cloudfront.net/697a4ecd5b86994479b1bd46_1769628022208_dadb3d77.png" alt="Q-CORE" style="height:16px;border-radius:4px;">
    <span>Protected by Q-CORE Security</span>
  </div>
</div>`;
  }

  // Default
  return `<a href="${baseUrl}?action=login" 
  style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(to right,#06b6d4,#2563eb);color:white;font-weight:600;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;box-shadow:0 10px 15px -3px rgba(6,182,212,0.25);"
  target="_blank" rel="noopener noreferrer">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
  </svg>
  Sign in to CORE BOS
</a>`;
};

export default EmbedSignIn;
