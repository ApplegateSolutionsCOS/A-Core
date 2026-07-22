/**
 * Sync Engine - Manages batch synchronization between local cache and server
 * 
 * Features:
 * - Configurable sync interval (default 15 min)
 * - Batch mode processing of queued mutations
 * - Automatic sync on reconnection
 * - Sync status tracking
 * - Conflict resolution (server wins by default)
 */

import { getSyncQueue, updateSyncEntry, clearCompletedSync, getMeta, setMeta, invalidateAll } from './offlineCache';
import { invokeEdgeFunction } from './edgeFunctionClient';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
  syncErrors: string[];
  nextSyncTime: number | null;
}

type SyncListener = (status: SyncStatus) => void;

const listeners: Set<SyncListener> = new Set();
let syncTimer: ReturnType<typeof setInterval> | null = null;
let currentStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncTime: null,
  pendingChanges: 0,
  lastSyncResult: null,
  syncErrors: [],
  nextSyncTime: null,
};


// Default sync interval: 15 minutes (in ms)
const DEFAULT_SYNC_INTERVAL = 15 * 60 * 1000;
let syncInterval = DEFAULT_SYNC_INTERVAL;

function notifyListeners() {
  listeners.forEach(fn => {
    try { fn({ ...currentStatus }); } catch {}
  });
}

function updateStatus(partial: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notifyListeners();
}

// ─── Connection Monitoring ────────────────────────────────

let edgeFunctionAvailable = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export async function checkEdgeFunctionHealth(): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && edgeFunctionAvailable) {
    return edgeFunctionAvailable;
  }

  try {
    const result = await invokeEdgeFunction('db-proxy', {
      table: '_health',
      operation: 'select',
    }, 10000);

    // Even if the table doesn't exist, if we got a response the function is reachable
    edgeFunctionAvailable = result.error !== 'ALL_STRATEGIES_FAILED';
    lastHealthCheck = now;
  } catch {
    edgeFunctionAvailable = false;
  }

  updateStatus({ isOnline: navigator.onLine && edgeFunctionAvailable });
  return edgeFunctionAvailable;
}

export function isEdgeFunctionAvailable(): boolean {
  return edgeFunctionAvailable;
}

export function setEdgeFunctionAvailable(available: boolean) {
  edgeFunctionAvailable = available;
  updateStatus({ isOnline: navigator.onLine && available });
}

// ─── Sync Execution ────────────────────────────────────────

async function executeBatchSync(): Promise<void> {
  if (currentStatus.isSyncing) return;
  if (!navigator.onLine) {
    updateStatus({ isOnline: false });
    return;
  }

  // Check edge function health first
  const healthy = await checkEdgeFunctionHealth();
  if (!healthy) {
    updateStatus({ isOnline: false, lastSyncResult: 'failed' });
    return;
  }

  updateStatus({ isSyncing: true, syncErrors: [] });

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      updateStatus({
        isSyncing: false,
        lastSyncTime: Date.now(),
        pendingChanges: 0,
        lastSyncResult: 'success',
        nextSyncTime: Date.now() + syncInterval,
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process queue in order
    for (const entry of queue) {
      try {
        await updateSyncEntry(entry.id, { status: 'syncing' });

        const body: any = {
          table: entry.table,
          operation: entry.operation,
          data: entry.data,
        };
        if (entry.filters?.length > 0) body.filters = entry.filters;

        const result = await invokeEdgeFunction('db-proxy', body, 15000);

        if (result.error && result.error !== 'ALL_STRATEGIES_FAILED') {
          // Server returned an error but was reachable
          await updateSyncEntry(entry.id, { status: 'failed', retries: entry.retries + 1 });
          failCount++;
          errors.push(`${entry.table}.${entry.operation}: ${result.error}`);
        } else if (result.error === 'ALL_STRATEGIES_FAILED') {
          // Server unreachable, stop syncing
          await updateSyncEntry(entry.id, { status: 'pending' });
          break;
        } else {
          await updateSyncEntry(entry.id, { status: 'completed' });
          successCount++;
        }
      } catch (err: any) {
        await updateSyncEntry(entry.id, { status: 'failed', retries: entry.retries + 1 });
        failCount++;
        errors.push(`${entry.table}: ${err.message}`);
      }
    }

    // Clean up completed entries
    await clearCompletedSync();

    // If we synced successfully, invalidate cache to get fresh data
    if (successCount > 0) {
      await invalidateAll();
    }

    const remaining = await getSyncQueue();
    updateStatus({
      isSyncing: false,
      lastSyncTime: Date.now(),
      pendingChanges: remaining.length,
      lastSyncResult: failCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed',
      syncErrors: errors,
      nextSyncTime: Date.now() + syncInterval,
    });
  } catch (err: any) {
    updateStatus({
      isSyncing: false,
      lastSyncResult: 'failed',
      syncErrors: [err.message || 'Sync failed'],
    });
  }
}

// ─── Public API ────────────────────────────────────────────

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentStatus });
  return () => listeners.delete(listener);
}

export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

export async function getSyncInterval(): Promise<number> {
  const saved = await getMeta('sync_interval');
  if (saved && typeof saved === 'number') {
    syncInterval = saved;
    return saved;
  }
  return DEFAULT_SYNC_INTERVAL;
}

export async function setSyncInterval(intervalMs: number): Promise<void> {
  syncInterval = Math.max(60000, intervalMs); // Minimum 1 minute
  await setMeta('sync_interval', syncInterval);
  
  // Restart timer with new interval
  stopSyncTimer();
  startSyncTimer();
}

export function triggerSync(): Promise<void> {
  return executeBatchSync();
}

export function startSyncTimer(): void {
  if (syncTimer) return;
  
  // Load saved interval
  getMeta('sync_interval').then(saved => {
    if (saved && typeof saved === 'number') {
      syncInterval = Math.max(60000, saved);
    }
    
    syncTimer = setInterval(() => {
      if (navigator.onLine) {
        executeBatchSync();
      }
    }, syncInterval);

    updateStatus({ nextSyncTime: Date.now() + syncInterval });
  });
}

export function stopSyncTimer(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  updateStatus({ nextSyncTime: null });
}

// ─── Browser Event Listeners ────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateStatus({ isOnline: true });
    // Auto-sync when coming back online
    setTimeout(() => executeBatchSync(), 2000);
  });

  window.addEventListener('offline', () => {
    updateStatus({ isOnline: false });
  });

  // Sync before page unload if there are pending changes
  window.addEventListener('beforeunload', () => {
    if (currentStatus.pendingChanges > 0) {
      // Use sendBeacon or sync event if available
      try {
        navigator.sendBeacon?.('/api/sync-beacon', JSON.stringify({ pending: currentStatus.pendingChanges }));
      } catch {}
    }
  });
}

// Initialize
(async () => {
  const queue = await getSyncQueue();
  updateStatus({ pendingChanges: queue.length });
  const saved = await getMeta('last_sync_time');
  if (saved) updateStatus({ lastSyncTime: saved });
})();
