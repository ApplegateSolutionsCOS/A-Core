/**
 * Session Token Manager
 * 
 * Manages the sessionToken returned by the secure-auth edge function.
 * Stores it in localStorage, validates on app load, and handles expiry.
 */

import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import {
  encryptLocalJsonAtRest,
  decryptLocalJsonFromRest,
  setVaultLeaseWriteState,
} from '@/lib/encryption';

const SESSION_TOKEN_KEY = 'bos_session_token';
const SESSION_EXPIRES_KEY = 'bos_session_expires';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// 30-Day Offline Lease Constants (720 Hours / 43,200 Minutes)
const LEASE_STORAGE_KEY = 'qcore_30day_offline_lease_v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const WARNING_DAYS_THRESHOLD = 4; // Warn on Days 26-29
const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000; // 5 mins NTP tolerance

export type OfflineLeaseStatus =
  | 'ACTIVE'
  | 'GRACE_WARNING'
  | 'EXPIRED_READ_ONLY'
  | 'CLOCK_TAMPERED';

export interface ThirtyDayLeaseState {
  issuedAtUtc: number;
  expiresAtUtc: number;
  highWaterMarkUtc: number;
  elapsedOfflineMinutes: number;
  maxOfflineMinutes: number;
}

export interface LeaseEvaluation {
  status: OfflineLeaseStatus;
  daysRemaining: number;
  hoursRemaining: number;
  canWriteVaultAndRecords: boolean;
  bannerMessage: string | null;
}

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

// ─── 30-Day Local-First Offline Lease & Anti-Clock-Rollback Engine ───────────

export const HONEYPOT_TEST_MODE_STORAGE_KEY = 'acore_godmode_honeypot_test_mode_v1';

/**
 * Seeds or renews a fresh 30-Day Offline Lease encrypted at rest with ML-KEM-1024 + AES-256-GCM
 */
export async function renewThirtyDayOfflineLease(simulatedDaysElapsed = 0): Promise<LeaseEvaluation> {
  const now = Date.now();
  const issuedAt = now - simulatedDaysElapsed * 24 * 60 * 60 * 1000;
  const leaseState: ThirtyDayLeaseState = {
    issuedAtUtc: issuedAt,
    expiresAtUtc: issuedAt + THIRTY_DAYS_MS,
    highWaterMarkUtc: now,
    elapsedOfflineMinutes: simulatedDaysElapsed * 24 * 60,
    maxOfflineMinutes: 43200, // 30 Days
  };

  try {
    setVaultLeaseWriteState(true);
    const sealed = await encryptLocalJsonAtRest(leaseState, true);
    localStorage.setItem(LEASE_STORAGE_KEY, sealed);
  } catch (err) {
    console.warn('[sessionManager] Failed to seal 30-day lease:', err);
  }

  return evaluateThirtyDayOfflineLease();
}

/**
 * Forcefully reinstates the 30-day Q-CORE lease and unlocks all vault/record writes (Platform Owner Admin repair)
 */
export async function reinstateOfflineLease(): Promise<LeaseEvaluation> {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LEASE_STORAGE_KEY);
    localStorage.removeItem(HONEYPOT_TEST_MODE_STORAGE_KEY);
  }
  setVaultLeaseWriteState(true);
  refreshSessionExpiry();
  return renewThirtyDayOfflineLease(0);
}

/**
 * Evaluates the encrypted 30-day lease, detects system clock rollback, and locks/unlocks Q-CORE Vault writes
 */
export async function evaluateThirtyDayOfflineLease(): Promise<LeaseEvaluation> {
  if (typeof localStorage === 'undefined') {
    return { status: 'ACTIVE', daysRemaining: 30, hoursRemaining: 720, canWriteVaultAndRecords: true, bannerMessage: null };
  }

  // If Platform Owner Admin has enabled Honeypot & Q-CORE Security Test Mode, display the Q-CORE security banner for testing
  if (localStorage.getItem(HONEYPOT_TEST_MODE_STORAGE_KEY) === 'true') {
    return {
      status: 'CLOCK_TAMPERED',
      daysRemaining: 0,
      hoursRemaining: 0,
      canWriteVaultAndRecords: true, // Keep admin able to work while testing UI
      bannerMessage:
        'TEST MODE ACTIVE: Q-CORE lease integrity & Honeypot alert simulation enabled. Use Platform Owner controls to toggle off or reinstate.',
    };
  }

  const rawSealed = localStorage.getItem(LEASE_STORAGE_KEY);
  if (!rawSealed) {
    return renewThirtyDayOfflineLease(0);
  }

  try {
    const state = await decryptLocalJsonFromRest<ThirtyDayLeaseState>(rawSealed);
    const now = Date.now();

    // 1. Anti-Clock-Rollback Check
    if (now + CLOCK_ROLLBACK_TOLERANCE_MS < state.highWaterMarkUtc) {
      setVaultLeaseWriteState(false);
      return {
        status: 'CLOCK_TAMPERED',
        daysRemaining: 0,
        hoursRemaining: 0,
        canWriteVaultAndRecords: false,
        bannerMessage:
          'System clock rollback detected. Q-CORE Vault & MiniApps are locked in Read-Only Mode. Connect to the internet to synchronize UTC time.',
      };
    }

    // 2. Compute remaining time (strictest of wall-clock vs monotonic runtime)
    const msWallRemaining = state.expiresAtUtc - now;
    const msMonotonicRemaining = (state.maxOfflineMinutes - state.elapsedOfflineMinutes) * 60 * 1000;
    const effectiveMsRemaining = Math.min(msWallRemaining, msMonotonicRemaining);

    const daysRemaining = Math.max(0, Math.floor(effectiveMsRemaining / (24 * 60 * 60 * 1000)));
    const hoursRemaining = Math.max(0, Math.floor(effectiveMsRemaining / (60 * 60 * 1000)));

    // 3. Day 30+ Expired -> Lock Vault Writes & Exports
    if (effectiveMsRemaining <= 0) {
      setVaultLeaseWriteState(false);
      return {
        status: 'EXPIRED_READ_ONLY',
        daysRemaining: 0,
        hoursRemaining: 0,
        canWriteVaultAndRecords: false,
        bannerMessage:
          '30-Day Offline Lease Expired: A-CORE is in Read-Only Vault Mode. Connect to the internet to verify subscription & rotate Q-CORE keys.',
      };
    }

    setVaultLeaseWriteState(true);

    // 4. Days 26 - 29 Warning Window
    if (daysRemaining <= WARNING_DAYS_THRESHOLD) {
      return {
        status: 'GRACE_WARNING',
        daysRemaining,
        hoursRemaining,
        canWriteVaultAndRecords: true,
        bannerMessage: `Q-CORE 30-Day Key Rotation Due in ${daysRemaining}d (${hoursRemaining}h): Connect to the internet briefly to renew your offline lease and fetch updates.`,
      };
    }

    return {
      status: 'ACTIVE',
      daysRemaining,
      hoursRemaining,
      canWriteVaultAndRecords: true,
      bannerMessage: null,
    };
  } catch {
    // If browser is online (e.g. after upgrading encryption key format to ML-KEM-1024), automatically migrate & re-seal fresh lease
    if (typeof navigator === 'undefined' || navigator.onLine) {
      localStorage.removeItem(LEASE_STORAGE_KEY);
      return renewThirtyDayOfflineLease(0);
    }
    // Offline & tampered storage envelope -> lock writes
    setVaultLeaseWriteState(false);
    return {
      status: 'CLOCK_TAMPERED',
      daysRemaining: 0,
      hoursRemaining: 0,
      canWriteVaultAndRecords: false,
      bannerMessage:
        'Q-CORE lease integrity check failed. Connect to the internet to re-verify your subscription.',
    };
  }
}

/**
 * Called every 60 seconds to increment the offline monotonic counter & update high-water-mark UTC
 */
export async function recordMonotonicLeaseTick(): Promise<LeaseEvaluation> {
  if (typeof localStorage === 'undefined') return evaluateThirtyDayOfflineLease();
  const rawSealed = localStorage.getItem(LEASE_STORAGE_KEY);
  if (!rawSealed) return renewThirtyDayOfflineLease(0);

  try {
    const state = await decryptLocalJsonFromRest<ThirtyDayLeaseState>(rawSealed);
    const now = Date.now();
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

    const updated: ThirtyDayLeaseState = {
      ...state,
      highWaterMarkUtc: Math.max(now, state.highWaterMarkUtc),
      elapsedOfflineMinutes: isOffline ? state.elapsedOfflineMinutes + 1 : 0,
      expiresAtUtc: isOffline ? state.expiresAtUtc : now + THIRTY_DAYS_MS,
    };

    const sealed = await encryptLocalJsonAtRest(updated, true);
    localStorage.setItem(LEASE_STORAGE_KEY, sealed);
  } catch {}

  return evaluateThirtyDayOfflineLease();
}
