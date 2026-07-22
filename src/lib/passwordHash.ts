/**
 * Simple deterministic password hashing using pure JS operations.
 * No crypto.subtle, no TextEncoder, no Uint8Array, no Node.js modules.
 * 
 * This is used as a FALLBACK when the secure-auth edge function is unavailable.
 * It calls the public RPC functions (SECURITY DEFINER) that access app_private tables.
 * 
 * Hash format: "acore_v2$<hex_string>"
 * 
 * IMPORTANT: The same hash function must be used in the edge function.
 * See docs/EDGE_FUNCTION_SECURE_AUTH_V2.md for the matching implementation.
 */

const HASH_SALT = 'applegate_core_2026';
const HASH_PREFIX = 'acore_v2$';

/**
 * Compute a deterministic hash of a password.
 * Uses multiple rounds of a cyrb53-variant hash for better distribution.
 */
export function hashPassword(password: string): string {
  // Combine salt + password
  const input = HASH_SALT + '::' + password + '::' + HASH_SALT;
  
  // Round 1: cyrb53 variant
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Round 2: feed round 1 output back in for more mixing
  const round1 = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  const input2 = round1 + '::' + input + '::' + round1;
  
  let h3 = 0x811c9dc5;
  let h4 = 0xc1059ed8;
  for (let i = 0; i < input2.length; i++) {
    const ch = input2.charCodeAt(i);
    h3 = Math.imul(h3 ^ ch, 16777619);
    h4 = Math.imul(h4 ^ ch, 2246822507);
  }
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2654435761);
  h3 ^= Math.imul(h4 ^ (h4 >>> 13), 1597334677);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2654435761);
  h4 ^= Math.imul(h3 ^ (h3 >>> 13), 1597334677);

  // Combine all 4 values into a 32-char hex string
  const hex = (h1 >>> 0).toString(16).padStart(8, '0')
    + (h2 >>> 0).toString(16).padStart(8, '0')
    + (h3 >>> 0).toString(16).padStart(8, '0')
    + (h4 >>> 0).toString(16).padStart(8, '0');

  return HASH_PREFIX + hex;
}

/**
 * Verify a password against a stored hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  
  // If the stored hash uses our format, compare directly
  if (storedHash.startsWith(HASH_PREFIX)) {
    return hashPassword(password) === storedHash;
  }
  
  // Legacy: if the stored hash doesn't have our prefix, 
  // it was set by the old edge function. We can't verify it client-side.
  // Return false to let the edge function handle it.
  return false;
}

/**
 * Check if a stored hash uses the new format (can be verified client-side).
 */
export function isNewHashFormat(storedHash: string): boolean {
  return storedHash?.startsWith(HASH_PREFIX) || false;
}
