/**
 * ============================================================
 * CENTRALIZED SUPABASE CONFIGURATION
 * ============================================================
 * 
 * This is the SINGLE SOURCE OF TRUTH for the Supabase URL and anon key.
 * All other files (supabase.ts, supabasePrivate.ts, edgeFunctionClient.ts)
 * import from here.
 * 
 * ╔══════════════════════════════════════════════════════════╗
 * ║  ACTION REQUIRED: Replace the anon key below!           ║
 * ║                                                         ║
 * ║  The current key "sb_publishable_..." is NOT a valid    ║
 * ║  Supabase JWT key. ALL API calls will fail until this   ║
 * ║  is replaced with the real key from your dashboard.     ║
 * ╚══════════════════════════════════════════════════════════╝
 * 
 * HOW TO FIX:
 * 
 * Option A (recommended): Create a .env file in the project root:
 *   VITE_SUPABASE_URL=https://rghtxlzzpuazvacupere.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
 * 
 * Option B: Edit FALLBACK_SUPABASE_ANON_KEY on line 43 below directly.
 * 
 * TO GET YOUR ANON KEY:
 *   1. Go to https://supabase.com/dashboard/project/rghtxlzzpuazvacupere/settings/api
 *   2. Under "Project API keys", copy the "anon public" key
 *   3. It will be a long JWT string starting with "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
 *   4. Paste it as the value of FALLBACK_SUPABASE_ANON_KEY below (or in .env)
 * ============================================================
 */

const FALLBACK_SUPABASE_URL = 'https://rghtxlzzpuazvacupere.supabase.co';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  ⚠️  REPLACE THIS VALUE with your real Supabase anon key (JWT)     ║
// ║  It should start with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.      ║
// ║  Get it from: Dashboard → Settings → API → "anon public" key       ║
// ╚══════════════════════════════════════════════════════════════════════╝
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaHR4bHp6cHVhenZhY3VwZXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzg5MjEsImV4cCI6MjA4NTY1NDkyMX0.AW4rgaYchm1PuVwxNKoRcyhBWmUJKnNBdMSG54rU33I';

// Read from environment variables (Vite exposes VITE_ prefixed vars)
export const SUPABASE_URL: string = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  FALLBACK_SUPABASE_URL;

export const SUPABASE_ANON_KEY: string = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  FALLBACK_SUPABASE_ANON_KEY;

// Helper: check if the key looks like a valid JWT
export const isKeyValid = SUPABASE_ANON_KEY.startsWith('eyJ');

// Runtime validation: warn at startup if the key doesn't look like a JWT
if (typeof window !== 'undefined' && !isKeyValid) {
  console.error(
    `%c╔══════════════════════════════════════════════════════════════╗\n` +
    `║  SUPABASE ANON KEY IS NOT A VALID JWT TOKEN                 ║\n` +
    `║  ALL database connections, edge functions, and RPC calls     ║\n` +
    `║  will FAIL until this is fixed.                             ║\n` +
    `╚══════════════════════════════════════════════════════════════╝`,
    'color: red; font-weight: bold; font-size: 14px;'
  );
  console.error(
    `%c[SUPABASE CONFIG] Current key: "${SUPABASE_ANON_KEY.substring(0, 30)}..."`,
    'color: red;'
  );
  console.error(
    `%c[SUPABASE CONFIG] Expected format: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx"`,
    'color: yellow;'
  );
  console.error(
    `%c[SUPABASE CONFIG] FIX: Go to https://supabase.com/dashboard/project/rghtxlzzpuazvacupere/settings/api`,
    'color: yellow; font-weight: bold;'
  );
  console.error(
    `%c[SUPABASE CONFIG] Copy the "anon public" key and either:`,
    'color: yellow;'
  );
  console.error(
    `%c[SUPABASE CONFIG]   1. Create .env file with: VITE_SUPABASE_ANON_KEY=eyJ...your_key_here`,
    'color: yellow;'
  );
  console.error(
    `%c[SUPABASE CONFIG]   2. Or edit src/lib/supabaseConfig.ts line 43 directly`,
    'color: yellow;'
  );
} else if (typeof window !== 'undefined') {
  console.log(
    `%c[SUPABASE CONFIG] Anon key format: OK (JWT)`,
    'color: green; font-weight: bold;'
  );
  console.log(
    `%c[SUPABASE CONFIG] URL: ${SUPABASE_URL}`,
    'color: green;'
  );
}
