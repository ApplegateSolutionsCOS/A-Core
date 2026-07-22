/**
 * Offline Cache Layer - IndexedDB-based caching for Edge Function responses
 * 
 * Features:
 * - Per-table configurable TTL
 * - Automatic cache invalidation
 * - Storage usage tracking
 * - Graceful fallback to localStorage if IndexedDB unavailable
 */

const DB_NAME = 'applegate_core_cache';
const DB_VERSION = 2;
const STORE_NAME = 'api_cache';
const SYNC_QUEUE_STORE = 'sync_queue';
const META_STORE = 'cache_meta';

// Default TTL per table (in milliseconds)
const DEFAULT_TTL: Record<string, number> = {
  organizations: 5 * 60 * 1000,        // 5 min
  platform_users: 5 * 60 * 1000,       // 5 min
  organization_users: 3 * 60 * 1000,   // 3 min
  workspaces: 3 * 60 * 1000,           // 3 min
  workspace_items: 2 * 60 * 1000,      // 2 min
  mini_apps: 5 * 60 * 1000,            // 5 min
  mini_app_versions: 10 * 60 * 1000,   // 10 min
  security_notifications: 1 * 60 * 1000, // 1 min
  audit_logs: 5 * 60 * 1000,           // 5 min
  _default: 3 * 60 * 1000,             // 3 min default
};

interface CacheEntry {
  key: string;
  data: any;
  table: string;
  operation: string;
  timestamp: number;
  ttl: number;
  hash: string;
}

interface SyncQueueEntry {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'upsert';
  data: any;
  filters: any[];
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

interface CacheMeta {
  key: string;
  value: any;
}

let dbInstance: IDBDatabase | null = null;
let dbReady: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbReady) return dbReady;

  dbReady = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('table', 'table', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.onclose = () => { dbInstance = null; dbReady = null; };
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('[offlineCache] IndexedDB open failed, falling back to localStorage');
        reject(new Error('IndexedDB unavailable'));
      };
    } catch (e) {
      reject(e);
    }
  });

  return dbReady;
}

function generateCacheKey(table: string, operation: string, filters: any[], columns: string, order: any, limit: number | null): string {
  const parts = [table, operation, columns, JSON.stringify(filters), JSON.stringify(order), String(limit)];
  return parts.join('::');
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// ─── Public API ────────────────────────────────────────────

export function getTTL(table: string): number {
  return DEFAULT_TTL[table] || DEFAULT_TTL._default;
}

export function setCustomTTL(table: string, ttlMs: number): void {
  DEFAULT_TTL[table] = ttlMs;
  // Persist custom TTLs
  try {
    localStorage.setItem('cache_custom_ttls', JSON.stringify(
      Object.fromEntries(Object.entries(DEFAULT_TTL).filter(([k]) => k !== '_default'))
    ));
  } catch {}
}

// Load custom TTLs from localStorage
try {
  const saved = localStorage.getItem('cache_custom_ttls');
  if (saved) {
    const custom = JSON.parse(saved);
    Object.assign(DEFAULT_TTL, custom);
  }
} catch {}

export async function getCachedData(
  table: string,
  operation: string,
  filters: any[] = [],
  columns: string = '*',
  order: any = null,
  limit: number | null = null
): Promise<{ data: any; isCached: boolean; cacheAge: number } | null> {
  const key = generateCacheKey(table, operation, filters, columns, order, limit);
  
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        const age = Date.now() - entry.timestamp;
        const ttl = entry.ttl || getTTL(table);

        if (age > ttl) {
          // Expired but still return as stale cache
          resolve({ data: entry.data, isCached: true, cacheAge: age });
          return;
        }

        resolve({ data: entry.data, isCached: true, cacheAge: age });
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    // Fallback to localStorage
    try {
      const lsKey = `cache_${simpleHash(key)}`;
      const stored = localStorage.getItem(lsKey);
      if (stored) {
        const entry = JSON.parse(stored);
        const age = Date.now() - entry.timestamp;
        return { data: entry.data, isCached: true, cacheAge: age };
      }
    } catch {}
    return null;
  }
}

export async function setCachedData(
  table: string,
  operation: string,
  filters: any[],
  columns: string,
  order: any,
  limit: number | null,
  data: any
): Promise<void> {
  const key = generateCacheKey(table, operation, filters, columns, order, limit);
  const entry: CacheEntry = {
    key,
    data,
    table,
    operation,
    timestamp: Date.now(),
    ttl: getTTL(table),
    hash: simpleHash(JSON.stringify(data)),
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
  } catch {
    // Fallback to localStorage
    try {
      const lsKey = `cache_${simpleHash(key)}`;
      localStorage.setItem(lsKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  }
}

export async function invalidateTable(table: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('table');
    const request = index.openCursor(IDBKeyRange.only(table));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch {}
}

export async function invalidateAll(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Clear localStorage cache entries
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

// ─── Sync Queue ────────────────────────────────────────────

export async function addToSyncQueue(entry: Omit<SyncQueueEntry, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<void> {
  const fullEntry: SyncQueueEntry = {
    ...entry,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  };

  try {
    const db = await openDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    tx.objectStore(SYNC_QUEUE_STORE).add(fullEntry);
  } catch {
    // Fallback to localStorage
    try {
      const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      queue.push(fullEntry);
      localStorage.setItem('sync_queue', JSON.stringify(queue));
    } catch {}
  }
}

export async function getSyncQueue(): Promise<SyncQueueEntry[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const index = store.index('status');
      const request = index.getAll(IDBKeyRange.only('pending'));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    try {
      const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      return queue.filter((e: SyncQueueEntry) => e.status === 'pending');
    } catch { return []; }
  }
}

export async function updateSyncEntry(id: string, updates: Partial<SyncQueueEntry>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        store.put({ ...request.result, ...updates });
      }
    };
  } catch {}
}

export async function clearCompletedSync(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only('completed'));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch {}
}

// ─── Cache Stats ────────────────────────────────────────────

export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalSize: number;
  tableBreakdown: Record<string, { count: number; size: number }>;
  syncQueueSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}> {
  const stats = {
    totalEntries: 0,
    totalSize: 0,
    tableBreakdown: {} as Record<string, { count: number; size: number }>,
    syncQueueSize: 0,
    oldestEntry: null as number | null,
    newestEntry: null as number | null,
  };

  try {
    const db = await openDB();
    
    // Cache entries
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          const size = JSON.stringify(entry.data).length;
          stats.totalEntries++;
          stats.totalSize += size;
          
          if (!stats.tableBreakdown[entry.table]) {
            stats.tableBreakdown[entry.table] = { count: 0, size: 0 };
          }
          stats.tableBreakdown[entry.table].count++;
          stats.tableBreakdown[entry.table].size += size;
          
          if (!stats.oldestEntry || entry.timestamp < stats.oldestEntry) stats.oldestEntry = entry.timestamp;
          if (!stats.newestEntry || entry.timestamp > stats.newestEntry) stats.newestEntry = entry.timestamp;
          
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });

    // Sync queue
    await new Promise<void>((resolve) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
      const request = tx.objectStore(SYNC_QUEUE_STORE).count();
      request.onsuccess = () => { stats.syncQueueSize = request.result; resolve(); };
      request.onerror = () => resolve();
    });
  } catch {}

  return stats;
}

// ─── Meta Store (for sync settings) ────────────────────────

export async function setMeta(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put({ key, value });
  } catch {
    try { localStorage.setItem(`meta_${key}`, JSON.stringify(value)); } catch {}
  }
}

export async function getMeta(key: string): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const request = tx.objectStore(META_STORE).get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    try {
      const stored = localStorage.getItem(`meta_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }
}
