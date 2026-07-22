
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runtimeLogger } from './lib/runtimeLogger'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabaseConfig'

// ============================================
// SUPPRESS BROWSER EXTENSION ERRORS (MetaMask, etc.)
// These are injected by browser extensions and are NOT our code.
// ============================================
const SUPPRESSED_ERROR_PATTERNS = [
  'MetaMask',
  'metamask',
  'inpage.js',
  'chrome-extension://',
  'moz-extension://',
  'Failed to connect to MetaMask',
  'nkbihfbeogaeaoehlefnkodbefgpgknn', // MetaMask extension ID
  'ethereum',
  'web3',
];

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map(a => typeof a === 'string' ? a : (a?.message || a?.stack || '')).join(' ');
  if (SUPPRESSED_ERROR_PATTERNS.some(p => msg.includes(p))) return;
  originalConsoleError.apply(console, args);
};

// Suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason?.stack || event.reason || '');
  if (SUPPRESSED_ERROR_PATTERNS.some(p => msg.includes(p))) {
    event.preventDefault();
    return;
  }
});

// Suppress global errors from extensions
window.addEventListener('error', (event) => {
  const msg = String(event.message || event.filename || '');
  if (SUPPRESSED_ERROR_PATTERNS.some(p => msg.includes(p))) {
    event.preventDefault();
    return;
  }
});

// Initialize runtime logger FIRST so it captures everything
runtimeLogger.initialize();

// Set supabase credentials for persistence
runtimeLogger.setSupabaseCredentials(SUPABASE_URL, SUPABASE_ANON_KEY);


// Register Service Worker for offline-first PWA support.
// IMPORTANT: When a new version is detected we DO NOT auto-reload (that would
// interrupt users mid-edit). Instead we surface a non-intrusive toast (see
// UpdateNotification.tsx). The single, controlled reload below only happens
// once the user opts in and the new worker takes control via SKIP_WAITING.
if ('serviceWorker' in navigator) {
  // Reload the page exactly once when a new service worker takes control.
  // This only fires after the user clicks "Refresh" (which posts SKIP_WAITING).
  let hasReloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloadedForUpdate) return;
    hasReloadedForUpdate = true;
    console.log('[SW] New version activated — reloading to show the latest build.');
    window.location.reload();
  });

  // Notify the app (UpdateNotification toast) that an update is ready, passing
  // a reference to the waiting worker so the toast can trigger SKIP_WAITING.
  const announceUpdate = (worker: ServiceWorker | null) => {
    console.log('[SW] New version available — prompting user to refresh.');
    window.dispatchEvent(
      new CustomEvent('sw-update-available', { detail: worker })
    );
  };

  window.addEventListener('load', () => {
    // CRITICAL FIX: `updateViaCache: 'none'` forces the browser to ALWAYS fetch
    // /sw.js fresh from the network instead of reusing a (potentially stale)
    // HTTP-cached copy. This is what allows a browser/device that is stuck on an
    // OLD service worker (and therefore showing the old landing page) to finally
    // detect the new worker, install it (skipWaiting + claim + purge old caches),
    // and escape the stale version. Without this, the browser could keep using a
    // cached sw.js for up to 24h and never see the new build.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(registration => {
        console.log('[SW] Service Worker registered with scope:', registration.scope);

        // Force an immediate update check on every load (bypassing HTTP cache via
        // the updateViaCache setting above) so new deploys are picked up at once.
        registration.update().catch(() => {});

        // If a new worker is already waiting, prompt the user (no auto-apply).
        if (registration.waiting && navigator.serviceWorker.controller) {
          announceUpdate(registration.waiting);
        }

        // When a new worker is found, prompt the user once it is installed
        // (only when an existing controller is present, i.e. an actual update).
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                announceUpdate(newWorker);
              }
            });
          }
        });
      })
      .catch(err => {
        console.warn('[SW] Service Worker registration failed:', err);
      });


    // Periodically check for updates so long-lived tabs also pick up new deploys.
    setInterval(() => {
      navigator.serviceWorker.getRegistration().then(reg => {
        reg?.update().catch(() => {});
      });
    }, 60 * 1000);

    // Listen for messages from the service worker.
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'TRIGGER_SYNC') {
        import('./lib/syncEngine').then(({ triggerSync }) => {
          triggerSync();
        });
      }
      // A newly activated worker (genuine update) notifies live clients. For
      // clients running the CURRENT build we surface the non-intrusive refresh
      // toast (preserving in-progress edits) rather than auto-reloading. Old,
      // stuck clients that don't run this code are instead force-navigated by
      // the service worker's activate handler, which is the only way to pull
      // them off the stale build.
      if (event.data?.type === 'SW_UPDATED_RELOAD') {
        announceUpdate(null);
      }
    });
  });
}



createRoot(document.getElementById("root")!).render(<App />);
