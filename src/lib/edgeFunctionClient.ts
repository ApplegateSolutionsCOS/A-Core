/**
 * Edge Function Client - Multi-Strategy with Detailed Logging & Diagnostics
 * 
 * Strategy 0: Quick GET connectivity test — no CORS preflight needed
 * Strategy 1: supabase.functions.invoke() — uses the Supabase JS client
 * Strategy 2: XMLHttpRequest fallback — bypasses window.fetch proxy
 * Strategy 3: Direct fetch with saved reference — captures native fetch at module load
 * Strategy 4: Simplified headers fetch — tries without Authorization to isolate CORS issues
 * Strategy 5: CORS proxy (corsproxy.io) — routes through a third-party proxy to bypass CORS
 * Strategy 6: Query-string auth — passes apikey via query string, no custom headers
 * 
 * Each strategy logs the exact URL, headers, and error details for debugging.
 * 
 * v12-cors-hardened: Edge functions now return 204 for OPTIONS with comprehensive
 * CORS headers including Vary: Origin. GET endpoint added for connectivity testing.
 */

import { supabase } from '@/lib/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConfig';

// Re-export for diagnostic panel
export { SUPABASE_URL, SUPABASE_ANON_KEY };

// Save a reference to native fetch at module load time (before any proxy)
let nativeFetch: typeof window.fetch;
try {
  nativeFetch = window.fetch.bind(window);
} catch (e) {
  // SSR or test environment
  nativeFetch = (typeof globalThis !== 'undefined' ? globalThis.fetch : fetch) as typeof window.fetch;
}

export interface EdgeFunctionResult<T = any> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface StrategyDiagnostic {
  strategy: string;
  url: string;
  status: 'success' | 'error' | 'timeout' | 'skipped';
  httpStatus: number | null;
  responsePreview: string | null;
  errorMessage: string | null;
  errorType: string | null;
  durationMs: number;
  headers: Record<string, string>;
}

export interface DiagnosticReport {
  timestamp: string;
  supabaseUrl: string;
  anonKeyPrefix: string;
  anonKeyLength: number;
  anonKeyValid: boolean;
  serviceWorkerActive: boolean;
  serviceWorkerState: string | null;
  browserInfo: string;
  strategies: StrategyDiagnostic[];
  overallResult: 'success' | 'all_failed';
  firstSuccessStrategy: string | null;
  networkOnline: boolean;
  corsPreflightResult: StrategyDiagnostic | null;
  getConnectivityResult: GetConnectivityResult | null;
}

export interface GetConnectivityResult {
  reachable: boolean;
  httpStatus: number | null;
  durationMs: number;
  errorMessage: string | null;
  responseData: any | null;
  corsHeadersPresent: boolean;
  functionVersion: string | null;
}

// ─── CORS Proxy Configuration ─────────────────────────────────────────────────

const CORS_PROXIES = [
  {
    name: 'corsproxy.io',
    buildUrl: (targetUrl: string) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    supportsPost: true,
  },
  {
    name: 'allorigins.win',
    buildUrl: (targetUrl: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    supportsPost: false,
  },
];

// ─── Strategy 0: GET Connectivity Test ────────────────────────────────────────
// A simple GET request with apikey header to test if the edge function is reachable.
// This is faster than trying all POST strategies when the function is down.

export async function testGetConnectivity(
  functionName: string = 'find-live-streams',
  timeoutMs: number = 8000
): Promise<GetConnectivityResult> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const start = performance.now();
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    // GET with apikey header — triggers CORS preflight but tests full flow
    const response = await nativeFetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
      credentials: 'omit',
      mode: 'cors',
    });
    clearTimeout(timer);
    
    const duration = Math.round(performance.now() - start);
    const text = await response.text();
    
    let responseData: any = null;
    let functionVersion: string | null = null;
    try {
      responseData = JSON.parse(text);
      functionVersion = responseData?.version || null;
    } catch {}
    
    // Check if CORS headers are present
    let corsHeadersPresent = false;
    response.headers.forEach((_, key) => {
      if (key.toLowerCase() === 'access-control-allow-origin') corsHeadersPresent = true;
    });
    
    return {
      reachable: response.status < 500,
      httpStatus: response.status,
      durationMs: duration,
      errorMessage: response.status >= 500 ? `HTTP ${response.status}` : null,
      responseData,
      corsHeadersPresent,
      functionVersion,
    };
  } catch (err: any) {
    return {
      reachable: false,
      httpStatus: null,
      durationMs: Math.round(performance.now() - start),
      errorMessage: err?.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : (err?.message || 'Connection failed'),
      responseData: null,
      corsHeadersPresent: false,
      functionVersion: null,
    };
  }
}

/**
 * Strategy 1: Use supabase.functions.invoke()
 */
async function trySupabaseInvoke<T>(
  functionName: string,
  body: Record<string, any>,
  timeoutMs: number
): Promise<EdgeFunctionResult<T> | null> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    console.log(`[edgeFn] Strategy 1: supabase.functions.invoke('${functionName}')`);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });

    const invokePromise = supabase.functions.invoke(functionName, { body });
    
    const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

    if (error) {
      const errorMsg = typeof error === 'string' ? error : error?.message || String(error);
      const errorName = error?.name || 'unknown';
      console.warn(`[edgeFn] Strategy 1 error: name=${errorName} msg=${errorMsg}`);
      
      // If we got a FunctionsHttpError, the response body might still be valid JSON
      if (error?.context?.body) {
        try {
          const text = await error.context.body.text?.();
          if (text) {
            const parsed = JSON.parse(text);
            return { data: parsed as T, error: null, status: error.context.status || 200 };
          }
        } catch {}
      }
      
      if (data) {
        return { data: data as T, error: null, status: 200 };
      }
      
      return null;
    }

    console.log(`[edgeFn] Strategy 1 SUCCESS`);
    return { data: data as T, error: null, status: 200 };
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      console.warn(`[edgeFn] Strategy 1 timed out after ${timeoutMs}ms`);
    } else {
      console.warn(`[edgeFn] Strategy 1 exception: ${err?.message}`);
    }
    return null;
  }
}

/**
 * Strategy 2: XMLHttpRequest (bypasses fetch proxy)
 */
function tryXHR<T>(
  functionName: string,
  body: Record<string, any>,
  timeoutMs: number
): Promise<EdgeFunctionResult<T> | null> {
  return new Promise((resolve) => {
    try {
      const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
      console.log(`[edgeFn] Strategy 2: XHR POST to ${url}`);
      
      const xhr = new XMLHttpRequest();
      xhr.timeout = timeoutMs;
      
      xhr.onload = function () {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ data, error: null, status: xhr.status });
        } catch {
          resolve({ data: null, error: `Invalid JSON`, status: xhr.status });
        }
      };
      
      xhr.onerror = function () {
        console.warn(`[edgeFn] Strategy 2 XHR onerror: status=${xhr.status}`);
        resolve(null);
      };
      
      xhr.ontimeout = function () {
        console.warn(`[edgeFn] Strategy 2 XHR timeout`);
        resolve(null);
      };
      
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.send(JSON.stringify(body));
    } catch (err: any) {
      console.warn(`[edgeFn] Strategy 2 setup error: ${err?.message}`);
      resolve(null);
    }
  });
}

/**
 * Strategy 3: Direct fetch with saved native reference
 */
async function tryNativeFetch<T>(
  functionName: string,
  body: Record<string, any>,
  timeoutMs: number
): Promise<EdgeFunctionResult<T> | null> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    console.log(`[edgeFn] Strategy 3: nativeFetch POST to ${url}`);
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await nativeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timer);
    
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      return { data, error: null, status: response.status };
    } catch {
      return { data: null, error: `Invalid JSON`, status: response.status };
    }
  } catch (err: any) {
    console.warn(`[edgeFn] Strategy 3 exception: ${err?.message}`);
    return null;
  }
}

/**
 * Strategy 4: Simplified headers fetch — minimal headers to isolate CORS issues
 */
async function trySimplifiedFetch<T>(
  functionName: string,
  body: Record<string, any>,
  timeoutMs: number
): Promise<EdgeFunctionResult<T> | null> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    console.log(`[edgeFn] Strategy 4: Simplified fetch POST (no Authorization header)`);
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await nativeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
      mode: 'cors',
    });
    
    clearTimeout(timer);
    
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      return { data, error: null, status: response.status };
    } catch {
      return { data: null, error: `Invalid JSON`, status: response.status };
    }
  } catch (err: any) {
    console.warn(`[edgeFn] Strategy 4 exception: ${err?.message}`);
    return null;
  }
}

/**
 * Strategy 5: CORS Proxy via corsproxy.io
 */
async function tryCorsProxy<T>(
  functionName: string,
  body: Record<string, any>,
  timeoutMs: number
): Promise<EdgeFunctionResult<T> | null> {
  const targetUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  try {
    console.log(`[edgeFn] Strategy 5: CORS proxy POST via corsproxy.io`);
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await nativeFetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
      mode: 'cors',
    });
    
    clearTimeout(timer);
    
    const text = await response.text();
    
    if (text.startsWith('<!') || text.startsWith('<html')) {
      console.warn(`[edgeFn] Strategy 5: Got HTML response (proxy error page)`);
      return null;
    }
    
    try {
      const data = JSON.parse(text);
      return { data, error: null, status: response.status };
    } catch {
      return { data: null, error: `Invalid JSON`, status: response.status };
    }
  } catch (err: any) {
    console.warn(`[edgeFn] Strategy 5 exception: ${err?.message}`);
    return null;
  }
}

/**
 * Strategy 6: Direct REST API call with query-string auth
 */
async function tryQueryStringAuth<T>(
  functionName: string,
  body: Record<string, any>,
  timeoutMs: number
): Promise<EdgeFunctionResult<T> | null> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}`;
    console.log(`[edgeFn] Strategy 6: Query-string auth POST`);
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await nativeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
      mode: 'cors',
    });
    
    clearTimeout(timer);
    
    const text = await response.text();
    
    if (text.startsWith('<!') || text.startsWith('<html')) {
      return null;
    }
    
    try {
      const data = JSON.parse(text);
      if (response.status === 401 || data?.msg === 'Invalid JWT') {
        console.warn(`[edgeFn] Strategy 6: Auth rejected via query string`);
        return null;
      }
      return { data, error: null, status: response.status };
    } catch {
      return { data: null, error: `Invalid JSON`, status: response.status };
    }
  } catch (err: any) {
    console.warn(`[edgeFn] Strategy 6 exception: ${err?.message}`);
    return null;
  }
}

/**
 * Invoke a Supabase edge function using multiple strategies.
 * First does a quick GET connectivity test, then tries 6 POST strategies in order.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>,
  timeoutMs: number = 30000
): Promise<EdgeFunctionResult<T>> {
  console.log(`[edgeFn] Invoking '${functionName}' action=${body.action || body.healthCheck ? 'healthCheck' : 'N/A'}`);
  
  // Strategy 1: supabase.functions.invoke()
  const result1 = await trySupabaseInvoke<T>(functionName, body, timeoutMs);
  if (result1) return result1;
  
  // Strategy 2: XHR
  const result2 = await tryXHR<T>(functionName, body, timeoutMs);
  if (result2) return result2;
  
  // Strategy 3: Native fetch
  const result3 = await tryNativeFetch<T>(functionName, body, timeoutMs);
  if (result3) return result3;
  
  // Strategy 4: Simplified headers fetch
  const result4 = await trySimplifiedFetch<T>(functionName, body, timeoutMs);
  if (result4) return result4;
  
  // Strategy 5: CORS proxy (corsproxy.io)
  const result5 = await tryCorsProxy<T>(functionName, body, timeoutMs);
  if (result5) return result5;
  
  // Strategy 6: Query-string auth
  const result6 = await tryQueryStringAuth<T>(functionName, body, timeoutMs);
  if (result6) return result6;
  
  // All strategies failed — run a quick GET connectivity test for diagnostic info
  const getTest = await testGetConnectivity(functionName, 5000);
  if (getTest.reachable && getTest.responseData) {
    // The function IS reachable via GET but all POST strategies failed
    // This means CORS preflight is blocking the POST requests
    console.warn(`[edgeFn] GET connectivity test PASSED (v${getTest.functionVersion}) but all POST strategies failed. CORS preflight issue at gateway level.`);
  } else {
    console.warn(`[edgeFn] GET connectivity test also FAILED: ${getTest.errorMessage}. Function may be unreachable.`);
  }
  
  console.warn(`[edgeFn] All 6 strategies failed for '${functionName}'. Using client-side fallback.`);
  
  return {
    data: null,
    error: 'ALL_STRATEGIES_FAILED',
    status: 0,
  };
}



// ─── Individual Strategy Testers (for Diagnostic Panel) ──────────────────────

export interface SingleStrategyResult {
  strategy: string;
  strategyNumber: number;
  success: boolean;
  httpStatus: number | null;
  responsePreview: string | null;
  errorMessage: string | null;
  errorType: string | null;
  durationMs: number;
  corsHeaders: Record<string, string>;
}

/**
 * Test a single strategy by number. Used by the diagnostic panel.
 */
export async function testSingleStrategy(
  strategyNumber: number,
  functionName: string = 'find-live-streams',
  timeoutMs: number = 15000
): Promise<SingleStrategyResult> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const body = { healthCheck: true };
  const start = performance.now();
  
  const baseResult: SingleStrategyResult = {
    strategy: '',
    strategyNumber,
    success: false,
    httpStatus: null,
    responsePreview: null,
    errorMessage: null,
    errorType: null,
    durationMs: 0,
    corsHeaders: {},
  };
  
  try {
    switch (strategyNumber) {
      case 1: {
        baseResult.strategy = 'supabase.functions.invoke()';
        const r = await trySupabaseInvoke(functionName, body, timeoutMs);
        baseResult.durationMs = Math.round(performance.now() - start);
        if (r) {
          baseResult.success = true;
          baseResult.httpStatus = r.status;
          baseResult.responsePreview = JSON.stringify(r.data).substring(0, 300);
        } else {
          baseResult.errorMessage = 'Strategy returned null (failed)';
        }
        break;
      }
      case 2: {
        baseResult.strategy = 'XMLHttpRequest (XHR)';
        const r = await tryXHR(functionName, body, timeoutMs);
        baseResult.durationMs = Math.round(performance.now() - start);
        if (r) {
          baseResult.success = true;
          baseResult.httpStatus = r.status;
          baseResult.responsePreview = JSON.stringify(r.data).substring(0, 300);
        } else {
          baseResult.errorMessage = 'XHR failed (network error or CORS block)';
        }
        break;
      }
      case 3: {
        baseResult.strategy = 'Native fetch (full headers)';
        const r = await tryNativeFetch(functionName, body, timeoutMs);
        baseResult.durationMs = Math.round(performance.now() - start);
        if (r) {
          baseResult.success = true;
          baseResult.httpStatus = r.status;
          baseResult.responsePreview = JSON.stringify(r.data).substring(0, 300);
        } else {
          baseResult.errorMessage = 'Native fetch failed (CORS or network)';
        }
        break;
      }
      case 4: {
        baseResult.strategy = 'Simplified fetch (no Authorization)';
        const r = await trySimplifiedFetch(functionName, body, timeoutMs);
        baseResult.durationMs = Math.round(performance.now() - start);
        if (r) {
          baseResult.success = true;
          baseResult.httpStatus = r.status;
          baseResult.responsePreview = JSON.stringify(r.data).substring(0, 300);
        } else {
          baseResult.errorMessage = 'Simplified fetch failed';
        }
        break;
      }
      case 5: {
        baseResult.strategy = 'CORS Proxy (corsproxy.io)';
        const r = await tryCorsProxy(functionName, body, timeoutMs);
        baseResult.durationMs = Math.round(performance.now() - start);
        if (r) {
          baseResult.success = true;
          baseResult.httpStatus = r.status;
          baseResult.responsePreview = JSON.stringify(r.data).substring(0, 300);
        } else {
          baseResult.errorMessage = 'CORS proxy failed';
        }
        break;
      }
      case 6: {
        baseResult.strategy = 'Query-string auth (no custom headers)';
        const r = await tryQueryStringAuth(functionName, body, timeoutMs);
        baseResult.durationMs = Math.round(performance.now() - start);
        if (r) {
          baseResult.success = true;
          baseResult.httpStatus = r.status;
          baseResult.responsePreview = JSON.stringify(r.data).substring(0, 300);
        } else {
          baseResult.errorMessage = 'Query-string auth failed';
        }
        break;
      }
      default: {
        baseResult.strategy = `Unknown strategy ${strategyNumber}`;
        baseResult.errorMessage = 'Invalid strategy number';
      }
    }
  } catch (err: any) {
    baseResult.durationMs = Math.round(performance.now() - start);
    baseResult.errorMessage = err?.message || 'Unknown error';
    baseResult.errorType = err?.name || 'Error';
  }
  
  return baseResult;
}

/**
 * Test CORS preflight (OPTIONS request) directly.
 */
export async function testCorsPreflightDirect(
  functionName: string = 'find-live-streams',
  timeoutMs: number = 10000
): Promise<{
  success: boolean;
  httpStatus: number | null;
  corsHeaders: Record<string, string>;
  errorMessage: string | null;
  durationMs: number;
  allowOrigin: string | null;
  allowHeaders: string | null;
  allowMethods: string | null;
}> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const start = performance.now();
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await nativeFetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, apikey, authorization',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    
    const duration = Math.round(performance.now() - start);
    const corsHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('access-control')) {
        corsHeaders[key] = value;
      }
    });
    
    return {
      success: response.ok || response.status === 204,
      httpStatus: response.status,
      corsHeaders,
      errorMessage: response.ok || response.status === 204 ? null : `HTTP ${response.status} ${response.statusText}`,
      durationMs: duration,
      allowOrigin: corsHeaders['access-control-allow-origin'] || null,
      allowHeaders: corsHeaders['access-control-allow-headers'] || null,
      allowMethods: corsHeaders['access-control-allow-methods'] || null,
    };
  } catch (err: any) {
    return {
      success: false,
      httpStatus: null,
      corsHeaders: {},
      errorMessage: err?.message || 'Preflight request failed',
      durationMs: Math.round(performance.now() - start),
      allowOrigin: null,
      allowHeaders: null,
      allowMethods: null,
    };
  }
}

/**
 * Quick connectivity test — just checks if the Supabase URL is reachable at all.
 * Uses a simple GET to the root URL (not an edge function).
 */
export async function testSupabaseConnectivity(timeoutMs: number = 8000): Promise<{
  reachable: boolean;
  httpStatus: number | null;
  durationMs: number;
  errorMessage: string | null;
}> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    // Test the Supabase REST API endpoint (always has CORS)
    const response = await nativeFetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
      credentials: 'omit',
    });
    clearTimeout(timer);
    
    return {
      reachable: true,
      httpStatus: response.status,
      durationMs: Math.round(performance.now() - start),
      errorMessage: null,
    };
  } catch (err: any) {
    return {
      reachable: false,
      httpStatus: null,
      durationMs: Math.round(performance.now() - start),
      errorMessage: err?.message || 'Connection failed',
    };
  }
}


// ─── Diagnostics ──────────────────────────────────────────────────────────────

/**
 * Run a comprehensive diagnostic test against a specific edge function.
 * Tests each strategy individually and collects detailed results.
 * Also tests CORS preflight and service worker status.
 */
export async function runDiagnostics(
  functionName: string = 'find-live-streams',
  timeoutMs: number = 15000
): Promise<DiagnosticReport> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const body = { healthCheck: true };
  const strategies: StrategyDiagnostic[] = [];
  let firstSuccess: string | null = null;

  // Check service worker status
  let swActive = false;
  let swState: string | null = null;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        swActive = true;
        swState = reg.active.state;
      } else if (reg?.installing) {
        swState = 'installing';
      } else if (reg?.waiting) {
        swState = 'waiting';
      } else {
        swState = 'none';
      }
    }
  } catch {
    swState = 'error-checking';
  }

  // ─── CORS Preflight Test ──────────────────────────────────────────────────
  let corsResult: StrategyDiagnostic | null = null;
  try {
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const preflightResponse = await nativeFetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, apikey, authorization',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    
    const duration = Math.round(performance.now() - start);
    const corsHeaders: Record<string, string> = {};
    preflightResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('access-control')) {
        corsHeaders[key] = value;
      }
    });
    
    corsResult = {
      strategy: 'CORS Preflight (OPTIONS)',
      url,
      status: preflightResponse.ok || preflightResponse.status === 204 ? 'success' : 'error',
      httpStatus: preflightResponse.status,
      responsePreview: JSON.stringify(corsHeaders),
      errorMessage: preflightResponse.ok || preflightResponse.status === 204 ? null : `HTTP ${preflightResponse.status} ${preflightResponse.statusText}`,
      errorType: null,
      durationMs: duration,
      headers: corsHeaders,
    };
  } catch (err: any) {
    corsResult = {
      strategy: 'CORS Preflight (OPTIONS)',
      url,
      status: err?.name === 'AbortError' ? 'timeout' : 'error',
      httpStatus: null,
      responsePreview: null,
      errorMessage: err?.message || 'Unknown error',
      errorType: err?.name || 'Error',
      durationMs: 0,
      headers: {},
    };
  }

  // ─── Strategy 1: supabase.functions.invoke ────────────────────────────────
  {
    const start = performance.now();
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
      });
      const invokePromise = supabase.functions.invoke(functionName, { body });
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
      const duration = Math.round(performance.now() - start);
      
      if (error) {
        const errorMsg = typeof error === 'string' ? error : error?.message || String(error);
        
        // Check if error body has data
        let bodyPreview: string | null = null;
        if (error?.context?.body) {
          try {
            const text = await error.context.body.text?.();
            bodyPreview = text?.substring(0, 300) || null;
          } catch {}
        }
        
        strategies.push({
          strategy: 'supabase.functions.invoke()',
          url,
          status: 'error',
          httpStatus: error?.context?.status || null,
          responsePreview: bodyPreview || (data ? JSON.stringify(data).substring(0, 300) : null),
          errorMessage: errorMsg,
          errorType: error?.name || 'FunctionsError',
          durationMs: duration,
          headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
        });
      } else {
        if (!firstSuccess) firstSuccess = 'supabase.functions.invoke()';
        strategies.push({
          strategy: 'supabase.functions.invoke()',
          url,
          status: 'success',
          httpStatus: 200,
          responsePreview: JSON.stringify(data).substring(0, 300),
          errorMessage: null,
          errorType: null,
          durationMs: duration,
          headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
        });
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      strategies.push({
        strategy: 'supabase.functions.invoke()',
        url,
        status: err?.message === 'TIMEOUT' ? 'timeout' : 'error',
        httpStatus: null,
        responsePreview: null,
        errorMessage: err?.message || 'Unknown error',
        errorType: err?.name || 'Error',
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
      });
    }
  }

  // ─── Strategy 2: XHR ──────────────────────────────────────────────────────
  {
    const start = performance.now();
    const xhrResult = await new Promise<StrategyDiagnostic>((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.timeout = timeoutMs;
        
        xhr.onload = function () {
          const duration = Math.round(performance.now() - start);
          if (!firstSuccess) firstSuccess = 'XHR';
          resolve({
            strategy: 'XMLHttpRequest (XHR)',
            url,
            status: 'success',
            httpStatus: xhr.status,
            responsePreview: xhr.responseText?.substring(0, 300) || null,
            errorMessage: null,
            errorType: null,
            durationMs: duration,
            headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
          });
        };
        
        xhr.onerror = function () {
          const duration = Math.round(performance.now() - start);
          resolve({
            strategy: 'XMLHttpRequest (XHR)',
            url,
            status: 'error',
            httpStatus: xhr.status || null,
            responsePreview: xhr.responseText?.substring(0, 300) || null,
            errorMessage: `XHR onerror: readyState=${xhr.readyState} status=${xhr.status}`,
            errorType: 'NetworkError',
            durationMs: duration,
            headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
          });
        };
        
        xhr.ontimeout = function () {
          const duration = Math.round(performance.now() - start);
          resolve({
            strategy: 'XMLHttpRequest (XHR)',
            url,
            status: 'timeout',
            httpStatus: null,
            responsePreview: null,
            errorMessage: `Timed out after ${timeoutMs}ms`,
            errorType: 'Timeout',
            durationMs: duration,
            headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
          });
        };
        
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
        xhr.send(JSON.stringify(body));
      } catch (err: any) {
        const duration = Math.round(performance.now() - start);
        resolve({
          strategy: 'XMLHttpRequest (XHR)',
          url,
          status: 'error',
          httpStatus: null,
          responsePreview: null,
          errorMessage: err?.message || 'Setup error',
          errorType: err?.name || 'Error',
          durationMs: duration,
          headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
        });
      }
    });
    strategies.push(xhrResult);
  }

  // ─── Strategy 3: Native fetch ─────────────────────────────────────────────
  {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await nativeFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      
      const text = await response.text();
      const duration = Math.round(performance.now() - start);
      
      if (!firstSuccess) firstSuccess = 'Native fetch';
      strategies.push({
        strategy: 'Native fetch (saved reference)',
        url,
        status: 'success',
        httpStatus: response.status,
        responsePreview: text.substring(0, 300),
        errorMessage: null,
        errorType: null,
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
      });
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      strategies.push({
        strategy: 'Native fetch (saved reference)',
        url,
        status: err?.name === 'AbortError' ? 'timeout' : 'error',
        httpStatus: null,
        responsePreview: null,
        errorMessage: err?.message || 'Unknown error',
        errorType: err?.name || 'Error',
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***' },
      });
    }
  }

  // ─── Strategy 4: Simplified headers fetch ─────────────────────────────────
  {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await nativeFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: 'omit',
        mode: 'cors',
      });
      clearTimeout(timer);
      
      const text = await response.text();
      const duration = Math.round(performance.now() - start);
      
      if (!firstSuccess) firstSuccess = 'Simplified fetch';
      strategies.push({
        strategy: 'Simplified fetch (no Authorization, credentials:omit)',
        url,
        status: 'success',
        httpStatus: response.status,
        responsePreview: text.substring(0, 300),
        errorMessage: null,
        errorType: null,
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': '***' },
      });
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      strategies.push({
        strategy: 'Simplified fetch (no Authorization, credentials:omit)',
        url,
        status: err?.name === 'AbortError' ? 'timeout' : 'error',
        httpStatus: null,
        responsePreview: null,
        errorMessage: err?.message || 'Unknown error',
        errorType: err?.name || 'Error',
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': '***' },
      });
    }
  }

  // ─── Strategy 5: CORS Proxy ───────────────────────────────────────────────
  {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await nativeFetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: 'omit',
        mode: 'cors',
      });
      clearTimeout(timer);
      
      const text = await response.text();
      const duration = Math.round(performance.now() - start);
      
      const isHtml = text.startsWith('<!') || text.startsWith('<html');
      
      if (!isHtml && !firstSuccess) firstSuccess = 'CORS Proxy (corsproxy.io)';
      strategies.push({
        strategy: 'CORS Proxy (corsproxy.io)',
        url: proxyUrl,
        status: isHtml ? 'error' : 'success',
        httpStatus: response.status,
        responsePreview: text.substring(0, 300),
        errorMessage: isHtml ? 'Got HTML response (proxy error page)' : null,
        errorType: isHtml ? 'ProxyError' : null,
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***', 'proxy': 'corsproxy.io' },
      });
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      strategies.push({
        strategy: 'CORS Proxy (corsproxy.io)',
        url: proxyUrl,
        status: err?.name === 'AbortError' ? 'timeout' : 'error',
        httpStatus: null,
        responsePreview: null,
        errorMessage: err?.message || 'Unknown error',
        errorType: err?.name || 'Error',
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': '***', 'Authorization': 'Bearer ***', 'proxy': 'corsproxy.io' },
      });
    }
  }

  // ─── Strategy 6: Query-string auth ────────────────────────────────────────
  {
    const qsUrl = `${url}?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}`;
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await nativeFetch(qsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: 'omit',
        mode: 'cors',
      });
      clearTimeout(timer);
      
      const text = await response.text();
      const duration = Math.round(performance.now() - start);
      
      if (!firstSuccess && response.status !== 401) firstSuccess = 'Query-string auth';
      strategies.push({
        strategy: 'Query-string auth (no custom headers)',
        url: `${url}?apikey=***`,
        status: response.status === 401 ? 'error' : 'success',
        httpStatus: response.status,
        responsePreview: text.substring(0, 300),
        errorMessage: response.status === 401 ? 'Auth rejected (query-string not supported)' : null,
        errorType: response.status === 401 ? 'AuthError' : null,
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': 'query-string' },
      });
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      strategies.push({
        strategy: 'Query-string auth (no custom headers)',
        url: `${url}?apikey=***`,
        status: err?.name === 'AbortError' ? 'timeout' : 'error',
        httpStatus: null,
        responsePreview: null,
        errorMessage: err?.message || 'Unknown error',
        errorType: err?.name || 'Error',
        durationMs: duration,
        headers: { 'Content-Type': 'application/json', 'apikey': 'query-string' },
      });
    }
  }

  const anySuccess = strategies.some(s => s.status === 'success');

  // ─── GET Connectivity Test ────────────────────────────────────────────────
  let getConnectivityResult: GetConnectivityResult | null = null;
  try {
    getConnectivityResult = await testGetConnectivity(functionName, 8000);
  } catch {
    getConnectivityResult = null;
  }

  return {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    anonKeyPrefix: SUPABASE_ANON_KEY.substring(0, 20) + '...',
    anonKeyLength: SUPABASE_ANON_KEY.length,
    anonKeyValid: SUPABASE_ANON_KEY.startsWith('eyJ') && SUPABASE_ANON_KEY.length > 100,
    serviceWorkerActive: swActive,
    serviceWorkerState: swState,
    browserInfo: navigator.userAgent.substring(0, 120),
    strategies,
    overallResult: anySuccess ? 'success' : 'all_failed',
    firstSuccessStrategy: firstSuccess,
    networkOnline: navigator.onLine,
    corsPreflightResult: corsResult,
    getConnectivityResult,
  };
}
