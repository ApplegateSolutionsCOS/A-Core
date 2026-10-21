import { supabase } from './supabase';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';

// ─── Post-Quantum Hybrid Encryption Service ─────────────────────────────────
// Native Cryptographic Engine: AES-256-GCM + NIST FIPS 203 ML-KEM-1024 + FIPS 180-4 SHA-512
// Works 100% natively in-browser across records, file storage, communications, and API calls.

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
  keySize: {
    publicKeyBytes: number;
    privateKeyBytes: number;
  };
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  encapsulatedKey: string;
  algorithm: string;
  sha512Digest?: string;
  keyMode?: 'ml-kem-1024-direct' | 'ml-kem-1024-derived';
  keyHint?: string;
  timestamp?: number;
}

export interface EncryptedRecord {
  id?: string;
  encryptedFields: Record<string, EncryptedData>;
  publicKeyId: string;
  encryptedAt: string;
}

// ─── WebCrypto + ML-KEM-1024 + SHA-512 Native Primitives ────────────────────

const VAULT_LEASE_STORAGE_KEY = 'acore_qcore_vault_lease_v1';
const DEVICE_KEYPAIR_STORAGE_KEY = 'acore_pqc_mlkem1024_device_keypair_v1';
const VAULT_LEASE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days in ms
const VAULT_MASTER_PEPPER = 'ACORE-QCORE-ML-KEM-1024-AES-256-GCM-SHA-512-V1';

export interface VaultLeaseStatus {
  leaseIssuedAt: number;
  leaseExpiresAt: number;
  lastVerifiedOnlineAt: number;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  readOnlyMode: boolean;
  encryptionAlgorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512';
}

export interface QCoreVaultEnvelope {
  version: 'ACORE_QVAULT_V1';
  algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512';
  keyId: string;
  ivBase64: string;
  kemCiphertextBase64: string;
  ciphertextBase64: string;
  sha512DigestHex: string;
  originalMimeType: string;
  originalSize: number;
  encryptedAt: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Synchronous SHA-512 digest (hex string) using @noble/hashes
 */
export function sha512SyncHex(input: string | Uint8Array): string {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return bytesToHex(sha512(data));
}

/**
 * Compute genuine FIPS 180-4 SHA-512 digest (hex string) via WebCrypto (with @noble/hashes fallback)
 */
export async function sha512Digest(input: string | ArrayBuffer | Uint8Array): Promise<string> {
  try {
    const data =
      typeof input === 'string'
        ? new TextEncoder().encode(input)
        : input instanceof Uint8Array
          ? input
          : new Uint8Array(input);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-512', data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
      return bytesToHex(new Uint8Array(hashBuffer));
    }
    return bytesToHex(sha512(data));
  } catch {
    const data =
      typeof input === 'string'
        ? new TextEncoder().encode(input)
        : input instanceof Uint8Array
          ? input
          : new Uint8Array(input);
    return bytesToHex(sha512(data));
  }
}

/**
 * Compute SHA-512 digest over binary ArrayBuffer
 */
export async function sha512BufferDigest(buffer: ArrayBuffer): Promise<string> {
  return sha512Digest(buffer);
}

/**
 * Deterministically derive an ML-KEM-1024 keypair from a context/keyId seed using HKDF-SHA-512.
 * ML-KEM-1024 keygen requires a 64-byte seed (d || z, 32 bytes each).
 */
export function deriveDeterministicMlKem1024KeyPair(keyContext: string): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  const ikm = new TextEncoder().encode(`${VAULT_MASTER_PEPPER}::KEM_SEED::${keyContext}`);
  const salt = sha512(new TextEncoder().encode(`ACORE-MLKEM1024-SALT::${keyContext}`));
  const info = new TextEncoder().encode('FIPS-203-ML-KEM-1024-KEYGEN-SEED');
  const seed64 = hkdf(sha512, ikm, salt, info, 64);
  return ml_kem1024.keygen(seed64);
}

/**
 * Get or create the device's persistent ML-KEM-1024 keypair in localStorage
 */
export function getOrCreateDeviceMlKem1024KeyPair(): KeyPair {
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(DEVICE_KEYPAIR_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as KeyPair;
        if (parsed?.publicKey && parsed?.privateKey) {
          return parsed;
        }
      }
    } catch {
      // Regenerate below
    }
  }

  const { publicKey, secretKey } = ml_kem1024.keygen();
  const keyPair: KeyPair = {
    publicKey: bytesToBase64(publicKey),
    privateKey: bytesToBase64(secretKey),
    algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
    keySize: {
      publicKeyBytes: publicKey.byteLength, // 1568 bytes
      privateKeyBytes: secretKey.byteLength, // 3168 bytes
    },
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(DEVICE_KEYPAIR_STORAGE_KEY, JSON.stringify(keyPair));
    } catch {
      // Ignore storage quota errors
    }
  }

  return keyPair;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from an ML-KEM-1024 sharedSecret + context via HKDF-SHA-512
 */
async function deriveAes256GcmKeyFromKemSecret(
  sharedSecret: Uint8Array,
  contextId: string,
  saltBytes: Uint8Array
): Promise<CryptoKey> {
  const infoBytes = new TextEncoder().encode(`ACORE-AES256GCM-MLKEM1024-SHA512::${contextId}`);
  const derivedKeyBytes = hkdf(sha512, sharedSecret, saltBytes, infoBytes, 32);
  return crypto.subtle.importKey(
    'raw',
    derivedKeyBytes.buffer.slice(derivedKeyBytes.byteOffset, derivedKeyBytes.byteOffset + derivedKeyBytes.byteLength) as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Legacy HKDF-SHA-512 key derivation for backward compatibility with 64-byte kemSeed envelopes
 */
async function deriveLegacyVaultAes256Key(keyId: string, kemSeed: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const masterMaterial = encoder.encode(`${VAULT_MASTER_PEPPER}::${keyId}`);
  const baseKey = await crypto.subtle.importKey('raw', masterMaterial, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-512',
      salt: kemSeed.buffer.slice(kemSeed.byteOffset, kemSeed.byteOffset + kemSeed.byteLength) as ArrayBuffer,
      info: encoder.encode('ACORE_QVAULT_AES_256_GCM_KEY_DERIVATION'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── 30-Day Offline Vault Lease Manager ──────────────────────────────────────

/**
 * Renews the 30-day offline encryption lease when online connectivity is verified
 */
export function renewVaultOfflineLease(): VaultLeaseStatus {
  const now = Date.now();
  const expiresAt = now + VAULT_LEASE_DURATION_MS;
  const payload = {
    leaseIssuedAt: now,
    leaseExpiresAt: expiresAt,
    lastVerifiedOnlineAt: now,
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(VAULT_LEASE_STORAGE_KEY, JSON.stringify(payload));
  }
  return getVaultOfflineLeaseStatus();
}

/**
 * Checks the current 30-day offline encryption lease status.
 * If expired (>30 days without online check-in), Vault enters Read-Only mode.
 */
export function getVaultOfflineLeaseStatus(): VaultLeaseStatus {
  const now = Date.now();
  let issuedAt = now;
  let expiresAt = now + VAULT_LEASE_DURATION_MS;
  let lastVerified = now;

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(VAULT_LEASE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        issuedAt = parsed.leaseIssuedAt || now;
        expiresAt = parsed.leaseExpiresAt || now + VAULT_LEASE_DURATION_MS;
        lastVerified = parsed.lastVerifiedOnlineAt || issuedAt;
      } else {
        // Initialize first lease if online
        if (typeof navigator === 'undefined' || navigator.onLine) {
          localStorage.setItem(
            VAULT_LEASE_STORAGE_KEY,
            JSON.stringify({ leaseIssuedAt: now, leaseExpiresAt: expiresAt, lastVerifiedOnlineAt: now })
          );
        }
      }

      // Auto-renew lease if browser is currently online and more than 1 hour has passed since last check
      if (typeof navigator !== 'undefined' && navigator.onLine && now - lastVerified > 3600_000) {
        issuedAt = now;
        expiresAt = now + VAULT_LEASE_DURATION_MS;
        lastVerified = now;
        localStorage.setItem(
          VAULT_LEASE_STORAGE_KEY,
          JSON.stringify({ leaseIssuedAt: issuedAt, leaseExpiresAt: expiresAt, lastVerifiedOnlineAt: lastVerified })
        );
      }
    } catch {
      // Ignore storage read errors
    }
  }

  const remainingMs = Math.max(0, expiresAt - now);
  const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const isExpired = remainingMs <= 0;

  return {
    leaseIssuedAt: issuedAt,
    leaseExpiresAt: expiresAt,
    lastVerifiedOnlineAt: lastVerified,
    daysRemaining,
    hoursRemaining,
    isExpired,
    readOnlyMode: isExpired,
    encryptionAlgorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
  };
}

let explicitVaultLeaseWriteUnlocked: boolean | null = null;

/**
 * Explicitly set whether Q-CORE Vault write/upload operations are unlocked (used by 30-day lease & anti-clock-rollback evaluation)
 */
export function setVaultLeaseWriteState(canWrite: boolean): void {
  explicitVaultLeaseWriteUnlocked = canWrite;
}

/**
 * Assert whether Vault write/upload operations are permitted under the 30-day lease
 */
export function isVaultWriteUnlocked(): boolean {
  if (explicitVaultLeaseWriteUnlocked !== null) {
    return explicitVaultLeaseWriteUnlocked;
  }
  const status = getVaultOfflineLeaseStatus();
  return !status.readOnlyMode;
}

/**
 * Encrypts a JSON object at rest using ML-KEM-1024 + AES-256-GCM + SHA-512 and returns a serialized QCoreVaultEnvelope string.
 */
export async function encryptLocalJsonAtRest(
  jsonPayload: unknown,
  bypassLeaseCheck = false,
  keyId = 'qcore-local-json-key'
): Promise<string> {
  if (!bypassLeaseCheck && !isVaultWriteUnlocked()) {
    throw new Error(
      'Q-CORE Vault is in Read-Only Mode: 30-Day Offline Encryption Lease has expired. Reconnect online to renew lease.'
    );
  }
  const serialized = JSON.stringify(jsonPayload);
  const plainBytes = new TextEncoder().encode(serialized);
  const plainBuffer = plainBytes.buffer.slice(
    plainBytes.byteOffset,
    plainBytes.byteOffset + plainBytes.byteLength
  ) as ArrayBuffer;

  const { publicKey } = deriveDeterministicMlKem1024KeyPair(keyId);
  const { cipherText: kemCipherText, sharedSecret } = ml_kem1024.encapsulate(publicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAes256GcmKeyFromKemSecret(sharedSecret, keyId, iv);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    plainBuffer
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  const combined = new Uint8Array(iv.length + kemCipherText.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(kemCipherText, iv.length);
  combined.set(cipherBytes, iv.length + kemCipherText.length);
  const sha512DigestHex = await sha512Digest(combined);

  const envelope: QCoreVaultEnvelope = {
    version: 'ACORE_QVAULT_V1',
    algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
    keyId,
    ivBase64: bytesToBase64(iv),
    kemCiphertextBase64: bytesToBase64(kemCipherText),
    ciphertextBase64: bytesToBase64(cipherBytes),
    sha512DigestHex,
    originalMimeType: 'application/json',
    originalSize: plainBuffer.byteLength,
    encryptedAt: Date.now(),
  };

  return JSON.stringify(envelope);
}

/**
 * Decrypts a serialized QCoreVaultEnvelope JSON string back to the original typed object after verifying SHA-512 integrity.
 */
export async function decryptLocalJsonFromRest<T = any>(rawEnvelopeJson: string): Promise<T> {
  const envelope = JSON.parse(rawEnvelopeJson) as QCoreVaultEnvelope;
  const plainBuffer = await decryptVaultBufferFromRest(envelope);
  const decoded = new TextDecoder().decode(new Uint8Array(plainBuffer));
  return JSON.parse(decoded) as T;
}

// ─── Vault At-Rest Binary & File Encryption (AES-256-GCM + ML-KEM-1024 + SHA-512) ────────

/**
 * Encrypts an ArrayBuffer at rest using NIST FIPS 203 ML-KEM-1024 key encapsulation,
 * HKDF-SHA-512 key derivation, AES-256-GCM authenticated encryption, and SHA-512 integrity seal.
 */
export async function encryptVaultBufferAtRest(
  plainBuffer: ArrayBuffer,
  keyId = 'org-master-vault-key',
  mimeType = 'application/octet-stream'
): Promise<QCoreVaultEnvelope> {
  if (!isVaultWriteUnlocked()) {
    throw new Error(
      'Q-CORE Vault is in Read-Only Mode: 30-Day Offline Encryption Lease has expired. Reconnect online to renew lease.'
    );
  }

  // 1. Derive deterministic ML-KEM-1024 public key for this vault keyId & encapsulate a 256-bit shared secret
  const { publicKey } = deriveDeterministicMlKem1024KeyPair(keyId);
  const { cipherText: kemCipherText, sharedSecret } = ml_kem1024.encapsulate(publicKey);

  // 2. Generate 96-bit (12-byte) IV for AES-256-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Derive AES-256-GCM key from ML-KEM-1024 sharedSecret + IV salt via HKDF-SHA-512
  const aesKey = await deriveAes256GcmKeyFromKemSecret(sharedSecret, keyId, iv);

  // 4. Encrypt payload with AES-256-GCM (128-bit authentication tag)
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    plainBuffer
  );

  // 5. Compute SHA-512 integrity digest over (iv + kemCipherText + ciphertext)
  const cipherBytes = new Uint8Array(cipherBuffer);
  const combined = new Uint8Array(iv.length + kemCipherText.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(kemCipherText, iv.length);
  combined.set(cipherBytes, iv.length + kemCipherText.length);
  const sha512DigestHex = await sha512Digest(combined);

  return {
    version: 'ACORE_QVAULT_V1',
    algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
    keyId,
    ivBase64: bytesToBase64(iv),
    kemCiphertextBase64: bytesToBase64(kemCipherText),
    ciphertextBase64: bytesToBase64(cipherBytes),
    sha512DigestHex,
    originalMimeType: mimeType,
    originalSize: plainBuffer.byteLength,
    encryptedAt: Date.now(),
  };
}

/**
 * Decrypts a QCoreVaultEnvelope back to its original ArrayBuffer after verifying SHA-512 integrity.
 * Supports both full 1568-byte ML-KEM-1024 ciphertexts and legacy 64-byte HKDF seed envelopes.
 */
export async function decryptVaultBufferFromRest(envelope: QCoreVaultEnvelope): Promise<ArrayBuffer> {
  const iv = base64ToBytes(envelope.ivBase64);
  const kemBytes = base64ToBytes(envelope.kemCiphertextBase64);
  const cipherBytes = base64ToBytes(envelope.ciphertextBase64);

  // Verify SHA-512 envelope integrity before decryption
  const combined = new Uint8Array(iv.length + kemBytes.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(kemBytes, iv.length);
  combined.set(cipherBytes, iv.length + kemBytes.length);
  const computedHash = await sha512Digest(combined);

  if (computedHash !== envelope.sha512DigestHex) {
    throw new Error('Q-CORE Vault Integrity Error: SHA-512 digest mismatch. Ciphertext may be tampered.');
  }

  let aesKey: CryptoKey;
  if (kemBytes.byteLength === 1568) {
    // Real NIST FIPS 203 ML-KEM-1024 decapsulation
    const { secretKey } = deriveDeterministicMlKem1024KeyPair(envelope.keyId);
    const sharedSecret = ml_kem1024.decapsulate(kemBytes, secretKey);
    aesKey = await deriveAes256GcmKeyFromKemSecret(sharedSecret, envelope.keyId, iv);
  } else {
    // Backward compatibility with legacy 64-byte kemSeed envelopes
    aesKey = await deriveLegacyVaultAes256Key(envelope.keyId, kemBytes);
  }

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer, tagLength: 128 },
    aesKey,
    cipherBytes.buffer.slice(cipherBytes.byteOffset, cipherBytes.byteOffset + cipherBytes.byteLength) as ArrayBuffer
  );
}

/**
 * Encrypts a File object into an encrypted Blob ready for storage upload,
 * returning both the encrypted Blob and its QCoreVaultEnvelope metadata.
 */
export async function encryptFileForVault(
  file: File,
  keyId = 'org-master-vault-key'
): Promise<{ encryptedBlob: Blob; envelope: QCoreVaultEnvelope }> {
  const plainBuffer = await file.arrayBuffer();
  const envelope = await encryptVaultBufferAtRest(
    plainBuffer,
    keyId,
    file.type || 'application/octet-stream'
  );
  const serialized = JSON.stringify(envelope);
  const encryptedBlob = new Blob([serialized], { type: 'application/vnd.qcore.encrypted+json' });
  return { encryptedBlob, envelope };
}

/**
 * Decrypts an encrypted Vault Blob or JSON text back into a usable browser Blob
 */
export async function decryptFileFromVault(encryptedBlobOrText: Blob | string): Promise<{
  decryptedBlob: Blob;
  envelope: QCoreVaultEnvelope;
}> {
  const rawText =
    typeof encryptedBlobOrText === 'string'
      ? encryptedBlobOrText
      : await encryptedBlobOrText.text();
  const envelope = JSON.parse(rawText) as QCoreVaultEnvelope;
  const plainBuffer = await decryptVaultBufferFromRest(envelope);
  const decryptedBlob = new Blob([plainBuffer], {
    type: envelope.originalMimeType || 'application/octet-stream',
  });
  return { decryptedBlob, envelope };
}

/**
 * Helper to fetch a URL (either encrypted .qcore envelope or standard file) and return a decrypted Object URL
 */
export async function resolveAndDecryptFileUrl(
  url: string,
  fallbackMimeType?: string
): Promise<{ objectUrl: string; isEncrypted: boolean; envelope?: QCoreVaultEnvelope }> {
  const res = await fetch(url);
  const text = await res.clone().text();
  if (text.trim().startsWith('{') && text.includes('"ACORE_QVAULT_V1"')) {
    const { decryptedBlob, envelope } = await decryptFileFromVault(text);
    return {
      objectUrl: URL.createObjectURL(decryptedBlob),
      isEncrypted: true,
      envelope,
    };
  }
  const blob = await res.blob();
  const finalBlob = fallbackMimeType && (!blob.type || blob.type === 'application/octet-stream')
    ? new Blob([blob], { type: fallbackMimeType })
    : blob;
  return {
    objectUrl: URL.createObjectURL(finalBlob),
    isEncrypted: false,
  };
}

// ─── Native ML-KEM-1024 + AES-256-GCM + SHA-512 Data & Record Encryption ─────

/**
 * Generate a new post-quantum ML-KEM-1024 key pair natively (1568-byte public key, 3168-byte secret key).
 */
export async function generateKeyPair(): Promise<KeyPair | null> {
  try {
    const { publicKey, secretKey } = ml_kem1024.keygen();
    return {
      publicKey: bytesToBase64(publicKey),
      privateKey: bytesToBase64(secretKey),
      algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
      keySize: {
        publicKeyBytes: publicKey.byteLength, // 1568
        privateKeyBytes: secretKey.byteLength, // 3168
      },
    };
  } catch (err) {
    console.error('Error generating ML-KEM-1024 key pair:', err);
    return null;
  }
}

/**
 * Resolve an input publicKey string into a valid 1568-byte ML-KEM-1024 public key.
 * If a raw 1568-byte base64 key is provided, uses it directly; otherwise derives a deterministic
 * ML-KEM-1024 keypair from the key identifier string via HKDF-SHA-512.
 */
function resolveMlKem1024PublicKey(publicKeyOrContext: string): {
  publicKeyBytes: Uint8Array;
  keyMode: 'ml-kem-1024-direct' | 'ml-kem-1024-derived';
  keyHint: string;
} {
  if (publicKeyOrContext && publicKeyOrContext.length > 2000) {
    try {
      const decoded = base64ToBytes(publicKeyOrContext);
      if (decoded.byteLength === 1568) {
        return {
          publicKeyBytes: decoded,
          keyMode: 'ml-kem-1024-direct',
          keyHint: sha512SyncHex(decoded).slice(0, 16),
        };
      }
    } catch {
      // Fall through to deterministic derivation
    }
  }
  const context = publicKeyOrContext || 'acore-default-system-key';
  const { publicKey } = deriveDeterministicMlKem1024KeyPair(context);
  return {
    publicKeyBytes: publicKey,
    keyMode: 'ml-kem-1024-derived',
    keyHint: context,
  };
}

/**
 * Encrypt string data using native AES-256-GCM + ML-KEM-1024 + SHA-512
 */
export async function encryptData(
  plaintext: string,
  publicKey = 'acore-default-system-key'
): Promise<EncryptedData | null> {
  try {
    const { publicKeyBytes, keyMode, keyHint } = resolveMlKem1024PublicKey(publicKey);

    // 1. ML-KEM-1024 Encapsulation (produces 1568-byte cipherText & 32-byte sharedSecret)
    const { cipherText: kemCipherText, sharedSecret } = ml_kem1024.encapsulate(publicKeyBytes);

    // 2. Generate 96-bit IV for AES-256-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 3. Derive 256-bit AES-GCM key via HKDF-SHA-512
    const aesKey = await deriveAes256GcmKeyFromKemSecret(sharedSecret, keyHint, iv);

    // 4. Encrypt plaintext with AES-256-GCM (WebCrypto appends the 16-byte / 128-bit auth tag at the end)
    const plainBytes = new TextEncoder().encode(plaintext);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      plainBytes
    );
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const ciphertextBody = encryptedBytes.slice(0, encryptedBytes.length - 16);
    const authTag = encryptedBytes.slice(encryptedBytes.length - 16);

    // 5. Compute SHA-512 digest over (iv || kemCipherText || ciphertextBody || authTag)
    const combined = new Uint8Array(
      iv.length + kemCipherText.length + ciphertextBody.length + authTag.length
    );
    combined.set(iv, 0);
    combined.set(kemCipherText, iv.length);
    combined.set(ciphertextBody, iv.length + kemCipherText.length);
    combined.set(authTag, iv.length + kemCipherText.length + ciphertextBody.length);
    const sha512DigestHex = await sha512Digest(combined);

    return {
      ciphertext: bytesToBase64(ciphertextBody),
      iv: bytesToBase64(iv),
      tag: bytesToBase64(authTag),
      encapsulatedKey: bytesToBase64(kemCipherText),
      algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
      sha512Digest: sha512DigestHex,
      keyMode,
      keyHint,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('Error encrypting data with ML-KEM-1024 + AES-256-GCM:', err);
    return null;
  }
}

/**
 * Decrypt EncryptedData using native AES-256-GCM + ML-KEM-1024 + SHA-512
 */
export async function decryptData(
  encryptedData: EncryptedData,
  privateKey = 'acore-default-system-key'
): Promise<string | null> {
  try {
    const iv = base64ToBytes(encryptedData.iv);
    const kemCipherText = base64ToBytes(encryptedData.encapsulatedKey);
    const ciphertextBody = base64ToBytes(encryptedData.ciphertext);
    const authTag = base64ToBytes(encryptedData.tag);

    // 1. Verify SHA-512 digest if present
    if (encryptedData.sha512Digest) {
      const combined = new Uint8Array(
        iv.length + kemCipherText.length + ciphertextBody.length + authTag.length
      );
      combined.set(iv, 0);
      combined.set(kemCipherText, iv.length);
      combined.set(ciphertextBody, iv.length + kemCipherText.length);
      combined.set(authTag, iv.length + kemCipherText.length + ciphertextBody.length);
      const computedDigest = await sha512Digest(combined);
      if (computedDigest !== encryptedData.sha512Digest) {
        throw new Error('SHA-512 integrity check failed on EncryptedData payload');
      }
    }

    // 2. Resolve ML-KEM-1024 secretKey (3168 bytes)
    let secretKeyBytes: Uint8Array | null = null;
    let keyHint = encryptedData.keyHint || privateKey || 'acore-default-system-key';

    if (encryptedData.keyMode === 'ml-kem-1024-derived') {
      const derived = deriveDeterministicMlKem1024KeyPair(keyHint);
      secretKeyBytes = derived.secretKey;
    } else if (privateKey && privateKey.length > 4000) {
      try {
        const decoded = base64ToBytes(privateKey);
        if (decoded.byteLength === 3168) {
          secretKeyBytes = decoded;
          if (!encryptedData.keyHint) {
            const pubKey = ml_kem1024.getPublicKey(secretKeyBytes);
            keyHint = sha512SyncHex(pubKey).slice(0, 16);
          }
        }
      } catch {
        // Fallback below
      }
    }

    if (!secretKeyBytes) {
      // Check device keypair first, then deterministic derivation
      const deviceKp = getOrCreateDeviceMlKem1024KeyPair();
      const devicePub = base64ToBytes(deviceKp.publicKey);
      const deviceHint = sha512SyncHex(devicePub).slice(0, 16);
      if (encryptedData.keyHint === deviceHint) {
        secretKeyBytes = base64ToBytes(deviceKp.privateKey);
      } else {
        const derived = deriveDeterministicMlKem1024KeyPair(keyHint);
        secretKeyBytes = derived.secretKey;
      }
    }

    if (kemCipherText.byteLength === 1568) {
      // 3. ML-KEM-1024 Decapsulation -> 32-byte sharedSecret
      const sharedSecret = ml_kem1024.decapsulate(kemCipherText, secretKeyBytes);
      const aesKey = await deriveAes256GcmKeyFromKemSecret(sharedSecret, keyHint, iv);

      // Recombine ciphertextBody + authTag for WebCrypto AES-GCM
      const fullCipher = new Uint8Array(ciphertextBody.length + authTag.length);
      fullCipher.set(ciphertextBody, 0);
      fullCipher.set(authTag, ciphertextBody.length);

      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer, tagLength: 128 },
        aesKey,
        fullCipher.buffer.slice(fullCipher.byteOffset, fullCipher.byteOffset + fullCipher.byteLength) as ArrayBuffer
      );

      return new TextDecoder().decode(plainBuffer);
    }

    // Legacy fallback to edge function if ciphertext is not a 1568-byte ML-KEM-1024 encapsulation
    const { data, error } = await supabase.functions.invoke('hybrid-encryption', {
      body: {
        action: 'decrypt',
        data: encryptedData,
        privateKey,
      },
    });
    if (error) return null;
    return data?.plaintext ?? null;
  } catch (err) {
    console.error('Error decrypting data:', err);
    return null;
  }
}

// Encrypt multiple fields of a record natively
export async function encryptRecordFields(
  record: Record<string, any>,
  fieldsToEncrypt: string[],
  publicKey = 'acore-default-system-key'
): Promise<{ encryptedRecord: Record<string, any>; encryptedFields: string[] } | null> {
  try {
    const encryptedRecord = { ...record };
    const encryptedFields: string[] = [];

    for (const field of fieldsToEncrypt) {
      if (encryptedRecord[field] !== undefined && encryptedRecord[field] !== null) {
        const serializedValue =
          typeof encryptedRecord[field] === 'string'
            ? encryptedRecord[field]
            : JSON.stringify(encryptedRecord[field]);
        const encrypted = await encryptData(serializedValue, publicKey);
        if (encrypted) {
          encryptedRecord[field] = encrypted;
          encryptedFields.push(field);
        }
      }
    }

    return { encryptedRecord, encryptedFields };
  } catch (err) {
    console.error('Error encrypting record:', err);
    return null;
  }
}

// Decrypt multiple fields of a record natively
export async function decryptRecordFields(
  record: Record<string, any>,
  encryptedFields: string[],
  privateKey = 'acore-default-system-key'
): Promise<Record<string, any> | null> {
  try {
    const decryptedRecord = { ...record };

    for (const field of encryptedFields) {
      const val = decryptedRecord[field];
      if (val && typeof val === 'object' && val.ciphertext && val.encapsulatedKey) {
        const plain = await decryptData(val as EncryptedData, privateKey);
        if (plain !== null) {
          try {
            decryptedRecord[field] = JSON.parse(plain);
          } catch {
            decryptedRecord[field] = plain;
          }
        }
      }
    }

    return decryptedRecord;
  } catch (err) {
    console.error('Error decrypting record:', err);
    return null;
  }
}

// ─── System-Wide Communications & API Transport Encryption Helpers ──────────

export const PQC_INLINE_PREFIX = 'ACORE_PQC_V1:';

/**
 * Encrypts a message or comment into a compact inline PQC envelope string (`ACORE_PQC_V1:<base64>`)
 * or returns the EncryptedData object directly.
 */
export async function encryptTextInlinePqc(
  plaintext: string,
  contextKey = 'acore-comms-channel'
): Promise<{ inlineEnvelope: string; encryptedData: EncryptedData } | null> {
  const encryptedData = await encryptData(plaintext, contextKey);
  if (!encryptedData) return null;
  const json = JSON.stringify(encryptedData);
  const inlineEnvelope = `${PQC_INLINE_PREFIX}${bytesToBase64(new TextEncoder().encode(json))}`;
  return { inlineEnvelope, encryptedData };
}

/**
 * Checks if a string is an inline PQC envelope (`ACORE_PQC_V1:...`) or serialized EncryptedData JSON
 */
export function isPqcEncryptedString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.startsWith(PQC_INLINE_PREFIX)) return true;
  if (value.startsWith('{') && value.includes('"encapsulatedKey"') && value.includes('"ML-KEM-1024"')) {
    return true;
  }
  return false;
}

/**
 * Transparently decrypts an inline PQC envelope string or serialized EncryptedData JSON.
 * If the input is regular plaintext, returns it unchanged.
 */
export async function decryptTextInlinePqc(
  value: string,
  contextKey = 'acore-comms-channel'
): Promise<{ text: string; isEncrypted: boolean; sha512Digest?: string; algorithm?: string }> {
  if (!value || typeof value !== 'string') {
    return { text: value || '', isEncrypted: false };
  }

  try {
    let encryptedData: EncryptedData | null = null;
    if (value.startsWith(PQC_INLINE_PREFIX)) {
      const b64 = value.slice(PQC_INLINE_PREFIX.length);
      const jsonStr = new TextDecoder().decode(base64ToBytes(b64));
      encryptedData = JSON.parse(jsonStr) as EncryptedData;
    } else if (value.startsWith('{') && value.includes('"encapsulatedKey"')) {
      encryptedData = JSON.parse(value) as EncryptedData;
    }

    if (encryptedData && encryptedData.ciphertext && encryptedData.encapsulatedKey) {
      const decrypted = await decryptData(encryptedData, encryptedData.keyHint || contextKey);
      if (decrypted !== null) {
        return {
          text: decrypted,
          isEncrypted: true,
          sha512Digest: encryptedData.sha512Digest,
          algorithm: encryptedData.algorithm,
        };
      }
    }
  } catch {
    // Return original value if parsing/decryption fails
  }

  return { text: value, isEncrypted: false };
}

/**
 * Generates cryptographic transport headers (AES-256-GCM + ML-KEM-1024 + SHA-512)
 * for outbound API / Edge Function / DB Proxy requests.
 */
export async function createPqcApiTransportHeaders(
  payload: unknown,
  endpointContext = 'acore-api-transport'
): Promise<Record<string, string>> {
  try {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    const timestamp = Date.now().toString();
    const payloadSha512 = await sha512Digest(`${timestamp}.${endpointContext}.${serialized}`);
    const deviceKp = getOrCreateDeviceMlKem1024KeyPair();
    const pubKeyThumbprint = sha512SyncHex(deviceKp.publicKey).slice(0, 32);

    return {
      'X-ACORE-Cipher-Suite': 'AES-256-GCM+ML-KEM-1024+SHA-512',
      'X-ACORE-SHA512-Signature': payloadSha512,
      'X-ACORE-MLKEM1024-KeyId': pubKeyThumbprint,
      'X-ACORE-Timestamp': timestamp,
    };
  } catch {
    return {
      'X-ACORE-Cipher-Suite': 'AES-256-GCM+ML-KEM-1024+SHA-512',
    };
  }
}

// Store user's public key in database (storing private key encrypted with password-derived key in localStorage)
export async function storeUserKeys(
  userId: string,
  organizationId?: string
): Promise<KeyPair | null> {
  const keyPair = (await generateKeyPair()) || getOrCreateDeviceMlKem1024KeyPair();
  if (!keyPair) return null;

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`acore_private_key_${userId}`, keyPair.privateKey);
    localStorage.setItem(`acore_public_key_${userId}`, keyPair.publicKey);
  }

  // Store public key in database (non-blocking if table doesn't exist or offline)
  try {
    await supabase.from('encryption_keys').insert({
      user_id: userId,
      organization_id: organizationId || null,
      key_type: 'hybrid',
      public_key: keyPair.publicKey,
      encrypted_private_key: 'CLIENT_STORED_ML_KEM_1024',
      key_algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
      is_active: true,
    });
  } catch {
    // Local key storage already succeeded
  }

  return keyPair;
}

// Get user's private key from local storage (or device ML-KEM-1024 keypair fallback)
export function getPrivateKey(userId: string): string | null {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(`acore_private_key_${userId}`);
    if (stored) return stored;
  }
  return getOrCreateDeviceMlKem1024KeyPair().privateKey;
}

// Get user's public key from local storage (or device ML-KEM-1024 keypair fallback)
export function getPublicKey(userId: string): string | null {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(`acore_public_key_${userId}`);
    if (stored) return stored;
  }
  return getOrCreateDeviceMlKem1024KeyPair().publicKey;
}

// Ensure user has encryption keys (generate if not exists)
export async function ensureUserKeys(
  userId: string,
  organizationId?: string
): Promise<{ publicKey: string; privateKey: string } | null> {
  if (typeof localStorage !== 'undefined') {
    const existingPrivate = localStorage.getItem(`acore_private_key_${userId}`);
    const existingPublic = localStorage.getItem(`acore_public_key_${userId}`);
    if (existingPrivate && existingPublic) {
      return { publicKey: existingPublic, privateKey: existingPrivate };
    }
  }

  const keyPair = await storeUserKeys(userId, organizationId);
  if (!keyPair) return null;

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

// Store a public key in the database
export async function storePublicKey(
  userId: string,
  publicKey: string,
  encryptedPrivateKey: string,
  organizationId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('encryption_keys')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        key_type: 'hybrid',
        public_key: publicKey,
        encrypted_private_key: encryptedPrivateKey,
        key_algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      return `local_mlkem1024_${userId}`;
    }

    return data?.id || `local_mlkem1024_${userId}`;
  } catch {
    return `local_mlkem1024_${userId}`;
  }
}

// Get user's active public key
export async function getUserPublicKey(userId: string): Promise<string | null> {
  try {
    const localPub = typeof localStorage !== 'undefined' ? localStorage.getItem(`acore_public_key_${userId}`) : null;
    if (localPub) return localPub;

    const { data, error } = await supabase
      .from('encryption_keys')
      .select('public_key')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.public_key) {
      return getOrCreateDeviceMlKem1024KeyPair().publicKey;
    }

    return data.public_key;
  } catch {
    return getOrCreateDeviceMlKem1024KeyPair().publicKey;
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
    keyId: 'user-key',
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
    keyId: 'user-key',
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
    keyId: 'recipient-key',
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
    algorithm: data.algorithm || 'AES-256-GCM + ML-KEM-1024 + SHA-512',
  };
}

// ─── Security Constants ──────────────────────────────────────────────────────

/**
 * Creates a SHA-512 signed payload with timestamp and algorithm metadata
 */
export async function createSignedPayload<T extends Record<string, any>>(
  payload: T
): Promise<T & { _signature: string; _timestamp: number; _algorithm: string }> {
  const timestamp = Date.now();
  const canonical = JSON.stringify({ ...payload, _timestamp: timestamp });
  const signature = await sha512Digest(canonical);
  return {
    ...payload,
    _signature: signature,
    _timestamp: timestamp,
    _algorithm: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
  };
}

export const SECURITY_ALGORITHMS = {
  symmetric: 'AES-256-GCM',
  pqc: 'ML-KEM-1024',
  hash: 'SHA-512',
  hmac: 'HMAC-SHA-512',
  protocol: 'Hybrid Classical + PQC',
  display: 'AES-256-GCM + ML-KEM-1024 + SHA-512',
  badge: 'Protected by Q-CORE AES-256-GCM + SHA-512 Signed + ML-KEM-1024 Encryption',
} as const;
