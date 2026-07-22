/**
 * Client-side password hashing utility.
 * This replicates the simpleHash algorithm used in the secure-auth edge function,
 * allowing client-side hash computation for the RPC-based auth flow.
 */

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  let result = combined.toString(16);
  for (let round = 0; round < 8; round++) {
    h1 = Math.imul(h1 ^ (round * 31), 2654435761);
    h2 = Math.imul(h2 ^ (round * 37), 1597334677);
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    result += (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  return result.padEnd(64, '0').substring(0, 64);
}

/**
 * Hash a password with a salt using the same algorithm as the edge function.
 * @param password The plaintext password
 * @param salt The salt string (from get_auth_challenge RPC)
 * @returns The computed hash string
 */
export function hashPassword(password: string, salt: string): string {
  return simpleHash(salt + password);
}
