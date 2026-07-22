import React, { useState } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabaseConfig';

/**
 * ConfigWarningBanner
 * 
 * Shows a prominent, visible warning banner in the app UI when the Supabase
 * anon key is not in JWT format (doesn't start with "eyJ"). This makes the
 * misconfiguration impossible to miss.
 * 
 * The banner includes:
 * - Clear description of the problem
 * - Step-by-step fix instructions
 * - Direct link to the Supabase dashboard API settings
 * - Current key preview (truncated) for debugging
 */
const ConfigWarningBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  // Only show if the key is NOT a valid JWT
  const isKeyValid = SUPABASE_ANON_KEY.startsWith('eyJ');

  if (isKeyValid || dismissed) {
    return null;
  }

  const dashboardUrl = `https://supabase.com/dashboard/project/${extractProjectRef(SUPABASE_URL)}/settings/api`;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-950/95 backdrop-blur-sm border-b-2 border-red-500 shadow-[0_4px_30px_rgba(255,0,0,0.3)]">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-start gap-4">
          {/* Warning Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-red-300 font-bold font-mono text-sm">
              DATABASE CONNECTION FAILED — Invalid API Key
            </h3>
            <p className="text-red-400/80 text-xs font-mono mt-1">
              The Supabase anon key is <code className="bg-red-900/50 px-1.5 py-0.5 rounded text-red-300">"{SUPABASE_ANON_KEY.substring(0, 25)}..."</code> which is NOT a valid JWT token.
              Login, edge functions, RPC calls, and all database queries will fail.
            </p>
            
            <div className="mt-3 bg-black/40 rounded-lg p-3 border border-red-500/20">
              <p className="text-white text-xs font-mono font-bold mb-2">To fix this:</p>
              <ol className="text-red-400/90 text-xs font-mono space-y-1.5 list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a 
                    href={dashboardUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 underline hover:text-cyan-300 break-all"
                  >
                    Supabase Dashboard → Settings → API
                  </a>
                </li>
                <li>Copy the <strong className="text-white">"anon public"</strong> key (starts with <code className="bg-red-900/50 px-1 py-0.5 rounded text-green-400">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.</code>)</li>
                <li>
                  Open <code className="bg-red-900/50 px-1 py-0.5 rounded text-yellow-300">src/lib/supabaseConfig.ts</code> line 28
                </li>
                <li>
                  Replace the <code className="bg-red-900/50 px-1 py-0.5 rounded text-red-300">FALLBACK_SUPABASE_ANON_KEY</code> value with the real JWT key
                </li>
              </ol>
              <p className="text-gray-500 text-xs font-mono mt-2">
                Or create a <code className="bg-red-900/50 px-1 py-0.5 rounded text-yellow-300">.env</code> file in the project root with:
              </p>
              <pre className="text-green-400 text-xs font-mono mt-1 bg-black/60 rounded p-2 overflow-x-auto">
{`VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=eyJ...paste_your_real_key_here`}
              </pre>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-red-500 hover:text-red-300 transition-colors p-1"
            title="Dismiss (warning will reappear on reload)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Extract the project reference from a Supabase URL.
 * e.g., "https://rghtxlzzpuazvacupere.supabase.co" → "rghtxlzzpuazvacupere"
 */
function extractProjectRef(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0] || 'your-project-ref';
  } catch {
    return 'your-project-ref';
  }
}

export default ConfigWarningBanner;
