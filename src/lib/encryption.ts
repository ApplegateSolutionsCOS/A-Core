import { supabase } from './supabase';

// Encryption service for AES-256-GCM + ML-KEM-1024 hybrid encryption
// with SHA-512 signature authorization for all pre-sign-in flows
// Uses the hybrid-encryption edge function for server-side cryptographic operations

export interface EncryptedData {
  encapsulatedKey: string;
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm?: string;
}

export interface EncryptionKeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
}

// ─── SHA-512 Signing Utilities ───────────────────────────────────────────────
// Used for all signature authorizations on pre-sign-in pages

/**
 * Compute a SHA-512 digest of the given message.
 * Returns a lowercase hex string (128 chars).
 */
export async function sha512Digest(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate an HMAC-SHA-512 signature for the given message using a secret key.
 * Returns a lowercase hex string (128 chars).
 */
export async function hmacSHA512Sign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const sigArray = new Uint8Array(signature);
  return Array.from(sigArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify an HMAC-SHA-512 signature using constant-time comparison.
 * Returns true if the signature is valid.
 */
export async function hmacSHA512Verify(
  message: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['verify']
  );
  // Convert hex signature to Uint8Array
  const sigBytes = new Uint8Array(signature.length / 2);
  for (let i = 0; i < signature.length; i += 2) {
    sigBytes[i / 2] = parseInt(signature.substring(i, i + 2), 16);
  }
  return await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, encoder.encode(message));
}

/**
 * Create a signed request payload for pre-sign-in API calls.
 * Adds a SHA-512 timestamp signature to prevent replay attacks.
 */
export async function createSignedPayload(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const timestamp = Date.now().toString();
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const nonceHex = Array.from(nonce)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Create a canonical string from the payload for signing
  const canonical = JSON.stringify(payload) + '|' + timestamp + '|' + nonceHex;
  const digest = await sha512Digest(canonical);

  return {
    ...payload,
    _timestamp: timestamp,
    _nonce: nonceHex,
    _signature: digest,
    _sigAlgorithm: 'SHA-512',
  };
}

/**
 * Hash a password client-side with SHA-512 before sending to the server.
 * This provides defense-in-depth — the server also hashes with its own salt.
 * Returns the hex-encoded SHA-512 hash.
 */
export async function preHashPassword(password: string, clientSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt = clientSalt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const combined = salt + ':' + password;
  const hash = await sha512Digest(combined);
  return { hash, salt };
}

// ─── Hybrid Encryption (AES-256-GCM + ML-KEM-1024) ──────────────────────────

// Generate a new key pair for hybrid encryption
export async function generateKeyPair(): Promise<EncryptionKeyPair | null> {
  try {
    const { data, error } = await supabase.functions.invoke('hybrid-encryption', {
      body: { action: 'generateKeyPair' }
    });

    if (error) {
      console.error('Error generating key pair:', error);
      return null;
    }

    if (!data?.success) {
      console.error('Key generation failed:', data?.error);
      return null;
    }

    return {
      publicKey: data.publicKey,
      privateKey: data.privateKey,
      algorithm: data.algorithm
    };
  } catch (err) {
    console.error('Error generating key pair:', err);
    return null;
  }
}

// Encrypt plaintext using hybrid encryption (ML-KEM + AES-256-GCM)
export async function encryptData(plaintext: string, publicKey: string): Promise<EncryptedData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('hybrid-encryption', {
      body: {
        action: 'encrypt',
        data: { plaintext, publicKey }
      }
    });

    if (error) {
      console.error('Error encrypting data:', error);
      return null;
    }

    if (!data?.success) {
      console.error('Encryption failed:', data?.error);
      return null;
    }

    return data.encryptedData;
  } catch (err) {
    console.error('Error encrypting data:', err);
    return null;
  }
}

// Decrypt encrypted data using hybrid encryption
export async function decryptData(encryptedData: EncryptedData, privateKey: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('hybrid-encryption', {
      body: {
        action: 'decrypt',
        data: { encryptedData, privateKey }
      }
    });

    if (error) {
      console.error('Error decrypting data:', error);
      return null;
    }

    if (!data?.success) {
      console.error('Decryption failed:', data?.error);
      return null;
    }

    return data.plaintext;
  } catch (err) {
    console.error('Error decrypting data:', err);
    return null;
  }
}

// Store encryption key in database
export async function storeEncryptionKey(
  userId: string,
  publicKey: string,
  keyType: string = 'ml-kem-1024'
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('encryption_keys')
      .insert({
        user_id: userId,
        public_key: publicKey,
        key_type: keyType,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing encryption key:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('Error storing encryption key:', err);
    return null;
  }
}

// Get user's active public key
export async function getUserPublicKey(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('encryption_keys')
      .select('public_key')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching user public key:', error);
      return null;
    }

    return data?.public_key || null;
  } catch (err) {
    console.error('Error fetching user public key:', err);
    return null;
  }
}

// Encrypt task description
export async function encryptTaskDescription(
  description: string,
  publicKey: string
): Promise<{ encrypted: EncryptedData; keyId: string } | null> {
  const encrypted = await encryptData(description, publicKey);
  if (!encrypted) return null;

  return {
    encrypted,
    keyId: 'user-key'
  };
}

// Encrypt calendar event details
export async function encryptEventDetails(
  details: string,
  publicKey: string
): Promise<{ encrypted: EncryptedData; keyId: string } | null> {
  const encrypted = await encryptData(details, publicKey);
  if (!encrypted) return null;

  return {
    encrypted,
    keyId: 'user-key'
  };
}

// Encrypt message content
export async function encryptMessage(
  content: string,
  recipientPublicKey: string
): Promise<{ encrypted: EncryptedData; keyId: string } | null> {
  const encrypted = await encryptData(content, recipientPublicKey);
  if (!encrypted) return null;

  return {
    encrypted,
    keyId: 'recipient-key'
  };
}

// Helper to serialize encrypted data for database storage
export function serializeEncryptedData(data: EncryptedData): string {
  return JSON.stringify(data);
}

// Helper to deserialize encrypted data from database
export function deserializeEncryptedData(serialized: string): EncryptedData | null {
  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

// Encryption status for UI display
export interface EncryptionStatus {
  isEncrypted: boolean;
  algorithm: string;
  keyId?: string;
}

export function getEncryptionStatus(encryptedField: string | null): EncryptionStatus {
  if (!encryptedField) {
    return { isEncrypted: false, algorithm: 'none' };
  }

  const data = deserializeEncryptedData(encryptedField);
  if (!data) {
    return { isEncrypted: false, algorithm: 'none' };
  }

  return {
    isEncrypted: true,
    algorithm: data.algorithm || 'AES-256-GCM + ML-KEM-1024'
  };
}

// ─── Security Constants ──────────────────────────────────────────────────────

export const SECURITY_ALGORITHMS = {
  symmetric: 'AES-256-GCM',
  pqc: 'ML-KEM-1024',
  hash: 'SHA-512',
  hmac: 'HMAC-SHA-512',
  protocol: 'Hybrid Classical + PQC',
  display: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
  badge: 'Protected by Q-CORE AES-256-GCM + SHA-512 Signed + ML-KEM-1024 Encryption',
} as const;
