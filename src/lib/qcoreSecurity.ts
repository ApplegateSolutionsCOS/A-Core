import { supabase } from './supabase';

// ─── Q-CORE Digital Security Client Library ──────────────────────────────────
// Interfaces with the qcore-security edge function for file scanning,
// threat detection, and security operations

export interface QCoreHealthStatus {
  apiKeyConfigured: boolean;
  endpointConfigured: boolean;
  apiStatus: 'connected' | 'disconnected' | 'auth_failed' | 'timeout' | 'error';
  apiLatency: number | null;
  engine: string;
  version: string;
  encryptionProtocol: string;
  signingAlgorithm: string;
  supportedFileTypes: string;
  maxFileSize: string;
  scanCapabilities: string[];
  timestamp: string;
}

export interface QCoreScanResult {
  scanId: string;
  status: 'clean' | 'blocked' | 'rejected' | 'pending';
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'blocked';
  threats: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  signatures: number;
  scanDuration: number;
  engine: string;
  timestamp: string;
  verified: boolean;
}

export interface QCoreFileValidation {
  valid: boolean;
  errors: string[];
  fileInfo: {
    ext: string;
    category: string;
    maxSize: number;
  } | null;
  extension: string;
  category: string;
}

export interface QCoreScanResponse {
  success: boolean;
  scanResult: QCoreScanResult;
  validation: QCoreFileValidation;
  allowed: boolean;
  error?: string;
}

export interface QCoreSecurityStats {
  totalScans: number;
  cleanScans: number;
  blockedScans: number;
  threatDetections: number;
  scansByCategory: Record<string, number>;
  securityScore: number;
  lastScan: string | null;
}

export interface QCoreSupportedTypes {
  categories: Record<string, Array<{
    mime?: string;
    extension: string;
    maxSize: number;
  }>>;
  totalTypes: number;
  maxFileSize: number;
  maxFileSizeFormatted: string;
}

export interface FileScanLog {
  id: string;
  scan_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  file_category: string;
  scan_status: string;
  threat_level: string;
  threats: string;
  scan_engine: string;
  scan_duration_ms: number;
  uploader_id: string;
  workspace_slug: string;
  organization_id: string;
  created_at: string;
}
// Maximum file size: 300MB
export const MAX_FILE_SIZE = 314572800;
export const MAX_FILE_SIZE_MB = 300;

// ─── Error Suppression ──────────────────────────────────────────────────────
// Prevent flooding console with repeated edge function errors
const errorCooldowns: Record<string, number> = {};
const ERROR_COOLDOWN_MS = 30000; // 30 seconds between same error logs

function shouldLogError(key: string): boolean {
  const now = Date.now();
  if (errorCooldowns[key] && now - errorCooldowns[key] < ERROR_COOLDOWN_MS) return false;
  errorCooldowns[key] = now;
  return true;
}

// ─── Fallback Data ──────────────────────────────────────────────────────────
const FALLBACK_HEALTH: QCoreHealthStatus = {
  apiKeyConfigured: false,
  endpointConfigured: false,
  apiStatus: 'disconnected',
  apiLatency: null,
  engine: 'Q-CORE Digital Security',
  version: '2.0.0',
  encryptionProtocol: 'AES-256-GCM + ML-KEM-1024',
  signingAlgorithm: 'SHA-512',
  supportedFileTypes: '76+',
  maxFileSize: '300MB',
  scanCapabilities: ['Malware Detection', 'Virus Scanning', 'Threat Assessment', 'File Integrity Verification', 'Double Extension Detection', 'Content Analysis', 'Quantum-Safe Encryption', 'Network Intrusion Detection', 'Real-Time Threat Monitoring', 'Behavioral Analysis'],
  timestamp: new Date().toISOString(),
};

const FALLBACK_STATS: QCoreSecurityStats = {
  totalScans: 0, cleanScans: 0, blockedScans: 0, threatDetections: 0,
  scansByCategory: {}, securityScore: 100, lastScan: null,
};

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Check Q-CORE API health and connection status
 */
export async function checkQCoreHealth(): Promise<QCoreHealthStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: { action: 'health_check' }
    });

    if (error) {
      if (shouldLogError('health_check')) console.warn('[Q-CORE] Health check unavailable - using fallback');
      return { ...FALLBACK_HEALTH, timestamp: new Date().toISOString() };
    }

    return data?.status || { ...FALLBACK_HEALTH, timestamp: new Date().toISOString() };
  } catch (err) {
    if (shouldLogError('health_check_fatal')) console.warn('[Q-CORE] Health check failed - using fallback');
    return { ...FALLBACK_HEALTH, timestamp: new Date().toISOString() };
  }
}


/**
 * Validate a file before upload (type + size check)
 */
export async function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<QCoreFileValidation | null> {
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: {
        action: 'validate_file',
        fileName,
        fileSize,
        mimeType
      }
    });

    if (error) {
      console.error('[Q-CORE] Validation error:', error);
      return null;
    }

    return data?.validation || null;
  } catch (err) {
    console.error('[Q-CORE] Validation failed:', err);
    return null;
  }
}

/**
 * Scan a file for security threats via Q-CORE
 */
export async function scanFile(params: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  uploaderId: string;
  workspace?: string;
  organizationId?: string;
}): Promise<QCoreScanResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: {
        action: 'scan_file',
        ...params
      }
    });

    if (error) {
      console.error('[Q-CORE] Scan error:', error);
      return null;
    }

    return data as QCoreScanResponse;
  } catch (err) {
    console.error('[Q-CORE] Scan failed:', err);
    return null;
  }
}

/**
 * Get scan history
 */
export async function getScanHistory(params?: {
  limit?: number;
  organizationId?: string;
  workspace?: string;
}): Promise<FileScanLog[]> {
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: {
        action: 'get_scan_history',
        ...params
      }
    });

    if (error) {
      if (shouldLogError('scan_history')) console.warn('[Q-CORE] Scan history unavailable');
      return [];
    }

    return data?.scans || [];
  } catch (err) {
    if (shouldLogError('scan_history_fatal')) console.warn('[Q-CORE] Scan history failed');
    return [];
  }
}

/**
 * Get supported file types
 */
export async function getSupportedTypes(): Promise<QCoreSupportedTypes | null> {
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: { action: 'get_supported_types' }
    });

    if (error) {
      if (shouldLogError('supported_types')) console.warn('[Q-CORE] Supported types unavailable');
      return null;
    }

    return data as QCoreSupportedTypes;
  } catch (err) {
    if (shouldLogError('supported_types_fatal')) console.warn('[Q-CORE] Supported types failed');
    return null;
  }
}

/**
 * Get security statistics
 */
export async function getSecurityStats(): Promise<QCoreSecurityStats> {
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: { action: 'get_security_stats' }
    });

    if (error) {
      if (shouldLogError('security_stats')) console.warn('[Q-CORE] Security stats unavailable - using fallback');
      return { ...FALLBACK_STATS };
    }

    return data?.stats || { ...FALLBACK_STATS };
  } catch (err) {
    if (shouldLogError('security_stats_fatal')) console.warn('[Q-CORE] Security stats failed - using fallback');
    return { ...FALLBACK_STATS };
  }
}


/**
 * Compute SHA-256 hash of a file for integrity verification
 */
export async function computeFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    console.error('[Q-CORE] Hash computation failed:', err);
    return 'hash-error-' + Date.now();
  }
}

/**
 * Full file upload pipeline: validate → hash → scan → upload
 * Returns the scan result and whether the file is allowed
 */
export async function secureFileUpload(params: {
  file: File;
  uploaderId: string;
  uploaderName?: string;
  uploaderEmail?: string;
  workspace?: string;
  organizationId?: string;
  channel?: string;
  onProgress?: (stage: string, progress: number) => void;
}): Promise<{
  success: boolean;
  scanResult?: QCoreScanResult;
  validation?: QCoreFileValidation;
  fileUrl?: string;
  fileRecord?: any;
  error?: string;
}> {
  const { file, uploaderId, uploaderName, uploaderEmail, workspace, organizationId, channel, onProgress } = params;

  try {
    // Stage 1: Validate
    onProgress?.('Validating file...', 10);
    const validation = await validateFile(file.name, file.size, file.type || 'application/octet-stream');
    
    if (!validation || !validation.valid) {
      return {
        success: false,
        validation: validation || undefined,
        error: validation?.errors?.join(', ') || 'File validation failed'
      };
    }

    // Stage 2: Compute hash
    onProgress?.('Computing file hash...', 25);
    const fileHash = await computeFileHash(file);

    // Stage 3: Q-CORE Security Scan
    onProgress?.('Q-CORE security scan...', 40);
    const scanResponse = await scanFile({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      fileHash,
      uploaderId,
      workspace,
      organizationId
    });

    if (!scanResponse || !scanResponse.allowed) {
      return {
        success: false,
        scanResult: scanResponse?.scanResult,
        validation,
        error: scanResponse?.scanResult?.threats?.map(t => t.description).join(', ') || 'File blocked by Q-CORE security scan'
      };
    }

    // Stage 4: Upload to Supabase Storage
    onProgress?.('Uploading file...', 60);
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${workspace || 'general'}/${uploaderId}/${timestamp}_${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[Q-CORE] Upload error:', uploadError);
      return {
        success: false,
        scanResult: scanResponse.scanResult,
        validation,
        error: 'File upload failed: ' + uploadError.message
      };
    }

    // Stage 5: Get public URL
    onProgress?.('Finalizing...', 85);
    const { data: urlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || '';

    // Stage 6: Record in database
    onProgress?.('Recording file...', 95);
    const { data: fileRecord, error: dbError } = await supabase
      .from('user_files')
      .insert({
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        file_category: validation.category,
        storage_path: storagePath,
        storage_url: fileUrl,
        scan_id: scanResponse.scanResult.scanId,
        scan_status: scanResponse.scanResult.status,
        uploader_id: uploaderId,
        uploader_name: uploaderName || '',
        uploader_email: uploaderEmail || '',
        workspace_slug: workspace || '',
        organization_id: organizationId || null,
        channel: channel || '',
        is_shared: false,
        metadata: {
          fileHash,
          scanEngine: scanResponse.scanResult.engine,
          scanDuration: scanResponse.scanResult.scanDuration,
          signatures: scanResponse.scanResult.signatures
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Q-CORE] DB record error:', dbError);
      // File is uploaded but record failed - still return success
    }

    onProgress?.('Complete!', 100);

    return {
      success: true,
      scanResult: scanResponse.scanResult,
      validation,
      fileUrl,
      fileRecord
    };
  } catch (err: any) {
    console.error('[Q-CORE] Secure upload failed:', err);
    return {
      success: false,
      error: err.message || 'Secure upload failed'
    };
  }
}

/**
 * Get file icon based on category
 */
export function getFileIcon(category: string): string {
  const icons: Record<string, string> = {
    document: 'FileText',
    spreadsheet: 'Table',
    presentation: 'Presentation',
    image: 'Image',
    video: 'Video',
    audio: 'Music',
    archive: 'Archive',
    executable: 'Terminal',
    code: 'Code',
    data: 'Database',
    font: 'Type',
    '3d': 'Box',
    cad: 'Ruler',
    database: 'Database',
    design: 'Palette',
    ebook: 'BookOpen',
    binary: 'Binary',
    calendar: 'Calendar',
    contact: 'User',
    unknown: 'File'
  };
  return icons[category] || icons.unknown;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get threat level color
 */
export function getThreatLevelColor(level: string): { bg: string; text: string; border: string; glow: string } {
  switch (level) {
    case 'none':
      return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-[0_0_10px_rgba(0,255,0,0.2)]' };
    case 'low':
      return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-[0_0_10px_rgba(255,255,0,0.2)]' };
    case 'medium':
      return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-[0_0_10px_rgba(255,153,0,0.2)]' };
    case 'high':
    case 'blocked':
      return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_10px_rgba(255,0,0,0.2)]' };
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', glow: '' };
  }
}

/**
 * Get scan status badge info
 */
export function getScanStatusBadge(status: string): { label: string; color: string; icon: string } {
  switch (status) {
    case 'clean':
      return { label: 'CLEAN', color: 'green', icon: 'ShieldCheck' };
    case 'blocked':
      return { label: 'BLOCKED', color: 'red', icon: 'ShieldAlert' };
    case 'rejected':
      return { label: 'REJECTED', color: 'red', icon: 'ShieldX' };
    case 'pending':
      return { label: 'SCANNING', color: 'yellow', icon: 'Shield' };
    default:
      return { label: 'UNKNOWN', color: 'gray', icon: 'Shield' };
  }
}


// ─── IP Geolocation Lookup ───────────────────────────────────────────────────

export interface IpGeoResult {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string; // "lat,lng"
  org: string;
  timezone: string;
  hostname?: string;
  postal?: string;
}

/**
 * Look up IP geolocation via Q-CORE edge function (uses IpInfo API)
 * Falls back gracefully if the edge function doesn't support this action
 */
export async function lookupIpGeolocation(ip: string): Promise<IpGeoResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: { action: 'ip_lookup', ip }
    });

    if (error) {
      console.warn('[Q-CORE] IP lookup not available via edge function:', error.message);
      return null;
    }

    // The edge function may return the geo data in different formats
    return data?.geo || data?.result || data || null;
  } catch (err) {
    console.warn('[Q-CORE] IP geolocation lookup failed:', err);
    return null;
  }
}

/**
 * Batch lookup multiple IPs for geolocation
 */
export async function batchIpLookup(ips: string[]): Promise<Record<string, IpGeoResult>> {
  const results: Record<string, IpGeoResult> = {};
  
  // Process in batches of 5 to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    const promises = batch.map(async (ip) => {
      const result = await lookupIpGeolocation(ip);
      if (result) results[ip] = result;
    });
    await Promise.allSettled(promises);
  }
  
  return results;
}
