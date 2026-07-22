/**
 * Applegate CORE - Service Worker
 * Enables offline-first operation with intelligent caching strategies.
 *
 * Strategies:
 * - HTML / navigation requests: ALWAYS network-first, never serve a stale
 *   cached index.html while online. (This is what fixes "old version showing".)
 * - Hashed static assets (JS, CSS, fonts, images): Stale-while-revalidate so a
 *   fresh copy is fetched in the background and picked up on the next load.
 * - API / Edge Function calls: Network-first with cache fallback.
 *
 * IMPORTANT: POST and OPTIONS requests are ALWAYS passed through to the network
 * without any service worker interception. This is critical for Supabase edge
 * function calls which use POST, and for CORS preflight which uses OPTIONS.
 *
 * VERSION BUMP: Whenever the deployed app changes, the cache version below is
 * bumped so every old cache is purged on `activate` and the latest build is
 * served. Combined with the auto-update/reload logic in main.tsx, users always
 * see the live version of the application.
 */

// Bumping this version string purges ALL previous caches on activate, which
// guarantees stale (old-version) assets are removed from the browser. It is
// also intentionally byte-different from the previous worker so the browser's
// update check reliably detects this as a NEW worker and installs it.
const SW_VERSION = 'v4';
const CACHE_NAME = `applegate-core-${SW_VERSION}`;
const STATIC_CACHE = `applegate-static-${SW_VERSION}`;
const API_CACHE = `applegate-api-${SW_VERSION}`;

// Track whether SW bypass mode is active (can be toggled from main thread)
let bypassMode = false;

// Only pre-cache truly static, rarely-changing assets.
// NOTE: We intentionally DO NOT pre-cache '/' (index.html). The HTML document
// must always come fresh from the network so new deployments are picked up
// immediately instead of serving a stale, pre-cached shell.
const PRECACHE_URLS = [
  '/manifest.json',
  '/placeholder.svg',
];

// Install event - pre-cache essential assets, then activate immediately
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing service worker ${SW_VERSION}...`);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRECACHE_URLS).catch(err => {
          console.warn('[SW] Some pre-cache URLs failed:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - purge EVERY cache that doesn't match the current version,
// then take control of all open clients immediately. When this activation is an
// UPDATE (i.e. an old, mismatched cache existed and was deleted), force every
// open window to reload so devices that were stuck on the OLD build are pulled
// onto the live version even if their running page predates the reload logic in
// main.tsx. A first-ever install (no old caches) does NOT trigger a reload, so
// there is no reload loop for new visitors.
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating service worker ${SW_VERSION}...`);
  const currentCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      const staleCaches = cacheNames.filter(name => !currentCaches.includes(name));
      const wasUpdate = staleCaches.length > 0;
      return Promise.all(
        staleCaches.map(name => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      ).then(() => wasUpdate);
    })
    .then(wasUpdate => self.clients.claim().then(() => wasUpdate))
    .then(wasUpdate => {
      if (!wasUpdate) return;
      // Genuine update: refresh open windows onto the live build.
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          clients.forEach(client => {
            // Tell up-to-date clients to reload gracefully...
            client.postMessage({ type: 'SW_UPDATED_RELOAD' });
            // ...and force-navigate as a hard fallback for old clients that do
            // not listen for the message above.
            if ('navigate' in client && typeof client.navigate === 'function') {
              client.navigate(client.url).catch(() => {});
            }
          });
        });
    })
  );
});

// Fetch event - intelligent routing
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Skip ALL non-GET requests immediately.
  // POST requests (edge function calls) and OPTIONS requests (CORS preflight)
  // MUST pass through to the network without any SW interception.
  // ═══════════════════════════════════════════════════════════════════════════
  if (event.request.method !== 'GET') {
    if (url.pathname.includes('/functions/v1/')) {
      console.log(`[SW] PASSTHROUGH ${event.request.method} ${url.pathname} — not intercepting non-GET request`);
    }
    return; // Browser handles the request normally
  }

  // If bypass mode is active, let everything through
  if (bypassMode) {
    console.log(`[SW] BYPASS MODE — passing through: ${url.pathname}`);
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Only handle requests for our own origin. Cross-origin requests
  // (CDNs, fonts, Supabase, analytics, etc.) go straight to the network so we
  // never serve a stale cross-origin copy.
  if (url.origin !== self.location.origin) return;

  // Skip Supabase API/Edge Function GET requests — always go to network
  if (url.pathname.includes('/functions/v1/') || url.pathname.includes('/rest/v1/')) {
    event.respondWith(networkFirstStrategy(event.request, API_CACHE));
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HTML / navigation requests → ALWAYS network-first, NEVER serve a cached
  // index.html while online. This is the key fix that ensures the preview
  // domain (e.g. acore.applegate.solutions) displays the LIVE build instead of
  // a stale, previously-cached version.
  // ───────────────────────────────────────────────────────────────────────────
  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(htmlNetworkOnlyWithOfflineFallback(event.request));
    return;
  }

  // Hashed static assets → Stale-while-revalidate (fast load + background update)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
});

function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)(\?.*)?$/.test(pathname);
}

// Network-only for the HTML shell. Falls back to a cached copy ONLY when the
// network is genuinely unavailable (offline). When online, the freshest
// document is always returned, so deploys take effect on the next load.
async function htmlNetworkOnlyWithOfflineFallback(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      // Keep a copy purely as an offline fallback.
      cache.put('/', response.clone());
    }
    return response;
  } catch (err) {
    const cachedExact = await caches.match(request);
    if (cachedExact) return cachedExact;
    const cachedRoot = await caches.match('/');
    if (cachedRoot) return cachedRoot;
    return new Response(
      '<!DOCTYPE html><html><body><h1>Offline</h1><p>Reconnect to load the latest version.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Stale-while-revalidate: serve the cached copy immediately (if present) while
// fetching a fresh copy in the background to update the cache for next time.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available; otherwise wait for the network.
  return cached || (await networkFetch) || new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.headers.get('accept')?.includes('text/html')) {
      const root = await caches.match('/');
      if (root) return root;
    }

    return new Response(JSON.stringify({ error: 'Offline', data: null }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Listen for sync events (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-changes') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        });
      })
    );
  }
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches by request');
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  // Allow the main app to enable/disable bypass mode for debugging
  if (event.data?.type === 'SET_BYPASS') {
    bypassMode = !!event.data.enabled;
    console.log(`[SW] Bypass mode ${bypassMode ? 'ENABLED' : 'DISABLED'}`);
  }
  // Diagnostic: report SW status back to the main thread
  if (event.data?.type === 'GET_STATUS') {
    event.source?.postMessage({
      type: 'SW_STATUS',
      data: {
        version: SW_VERSION,
        bypassMode,
        cacheNames: null,
        scope: self.registration?.scope || 'unknown',
      },
    });
    caches.keys().then(names => {
      event.source?.postMessage({
        type: 'SW_CACHE_NAMES',
        data: names,
      });
    });
  }
});
