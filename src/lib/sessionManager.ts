/**
 * Session Token Manager
 * 
 * Manages the sessionToken returned by the secure-auth edge function.
 * Stores it in localStorage, validates on app load, and handles expiry.
 */

import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';

const SESSION_TOKEN_KEY = 'bos_session_token';
const SESSION_EXPIRES_KEY = 'bos_session_expires';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionInfo {
  token: string;
  expiresAt: number; // Unix timestamp ms
}

/**
 * Store a session token with expiry
 */
export function storeSessionToken(token: string): void {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
    console.log('[sessionManager] Token stored, expires at:', new Date(expiresAt).toISOString());
  } catch (err) {
    console.warn('[sessionManager] Failed to store token:', err);
  }
}

/**
 * Get the stored session token (if not expired locally)
 */
export function getSessionToken(): string | null {
  try {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    const expiresStr = localStorage.getItem(SESSION_EXPIRES_KEY);
    
    if (!token || !expiresStr) return null;
    
    const expiresAt = parseInt(expiresStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      console.log('[sessionManager] Token expired locally, clearing');
      clearSessionToken();
      return null;
    }
    
    return token;
  } catch {
    return null;
  }
}

/**
 * Get full session info
 */
export function getSessionInfo(): SessionInfo | null {
  const token = getSessionToken();
  if (!token) return null;
  
  const expiresStr = localStorage.getItem(SESSION_EXPIRES_KEY);
  const expiresAt = expiresStr ? parseInt(expiresStr, 10) : 0;
  
  return { token, expiresAt };
}

/**
 * Clear the session token
 */
export function clearSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
    console.log('[sessionManager] Token cleared');
  } catch {
    // Ignore
  }
}

/**
 * Check if a session token exists and is not locally expired
 */
export function hasValidLocalSession(): boolean {
  return getSessionToken() !== null;
}

/**
 * Validate the session token against the server.
 * Returns true if the token is valid, false otherwise.
 * On failure, clears the stored token.
 */
export async function validateSessionToken(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) {
    console.log('[sessionManager] No token to validate');
    return false;
  }
  
  try {
    console.log('[sessionManager] Validating token with server...');
    const result = await invokeEdgeFunction('secure-auth', {
      action: 'verify_token_signature',
      token,
    }, 10000);
    
    if (result.error) {
      console.warn('[sessionManager] Token validation network error:', result.error);
      // On network error, trust the local expiry check
      // (don't clear the token just because the network is down)
      return hasValidLocalSession();
    }
    
    if (result.data?.success && result.data?.valid) {
      console.log('[sessionManager] Token validated successfully');
      return true;
    }
    
    console.log('[sessionManager] Token invalid on server, clearing');
    clearSessionToken();
    return false;
  } catch (err) {
    console.warn('[sessionManager] Token validation error:', err);
    // On error, trust local expiry
    return hasValidLocalSession();
  }
}

/**
 * Refresh the session token (extends expiry).
 * Call this periodically or on user activity.
 */
export function refreshSessionExpiry(): void {
  const token = getSessionToken();
  if (token) {
    const newExpiry = Date.now() + SESSION_DURATION_MS;
    try {
      localStorage.setItem(SESSION_EXPIRES_KEY, String(newExpiry));
    } catch {
      // Ignore
    }
  }
}

/**
 * Get remaining session time in milliseconds
 */
export function getSessionTimeRemaining(): number {
  const expiresStr = localStorage.getItem(SESSION_EXPIRES_KEY);
  if (!expiresStr) return 0;
  
  const expiresAt = parseInt(expiresStr, 10);
  if (isNaN(expiresAt)) return 0;
  
  return Math.max(0, expiresAt - Date.now());
}
