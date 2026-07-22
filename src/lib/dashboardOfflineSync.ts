/**
 * Dashboard Offline Sync - IndexedDB-backed queue for tile layout changes
 *
 * Features:
 * - Queues tile layout changes in IndexedDB when network is unavailable
 * - Automatically syncs pending changes when connectivity is restored
 * - Last-write-wins conflict resolution using timestamps
 * - Visual state tracking for unsaved tile indicators
 * - Integrates with existing offlineCache.ts infrastructure
 */

import { supabase } from '@/lib/supabase';

export interface PendingTileChange {
  id: string;
  userId: string;
  tabId: string;
  tabName: string;
  tiles: any[];
  customWidgets: any[];
  refreshInterval: number;
  tabOrder: number;
  isActive: boolean;
  timestamp: number;       // ms since epoch – used for last-write-wins
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retries: number;
  errorMessage?: string;
}

export interface SyncConflict {
  id: string;
  userId: string;
  tabId: string;
  tabName: string;
  localTiles: any[];
  serverTiles: any[];
  localTimestamp: number;
  serverTimestamp: number;
  localCustomWidgets: any[];
  serverCustomWidgets: any[];
  localRefreshInterval: number;
  serverRefreshInterval: number;
  /** The full pending entry so we can re-push if user picks "Keep Local" */
  pendingEntry: PendingTileChange;
}

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
  /** Set of tile IDs that have unsaved changes */
  unsavedTileIds: Set<string>;
  /** Set of tab IDs that have pending changes */
  pendingTabIds: Set<string>;
  errors: string[];
  /** Conflicts detected during sync that need user resolution */
  conflicts: SyncConflict[];
}


type SyncListener = (state: OfflineSyncState) => void;

// ─── IndexedDB Setup ───────────────────────────────────────

const DB_NAME = 'dashboard_offline_sync';
const DB_VERSION = 1;
const QUEUE_STORE = 'pending_changes';
const SNAPSHOT_STORE = 'last_known_server';

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
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tabId', 'tabId', { unique: false });
        }
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          const snapStore = db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'key' });
          snapStore.createIndex('userId', 'userId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.onclose = () => { dbInstance = null; dbReady = null; };
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('[DashboardSync] IndexedDB open failed');
        reject(new Error('IndexedDB unavailable'));
      };
    } catch (e) {
      reject(e);
    }
  });

  return dbReady;
}

// ─── State Management ──────────────────────────────────────

const listeners = new Set<SyncListener>();

let currentState: OfflineSyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  lastSyncResult: null,
  unsavedTileIds: new Set(),
  pendingTabIds: new Set(),
  errors: [],
  conflicts: [],
};


function notifyListeners() {
  const snapshot: OfflineSyncState = {
    ...currentState,
    unsavedTileIds: new Set(currentState.unsavedTileIds),
    pendingTabIds: new Set(currentState.pendingTabIds),
    conflicts: [...currentState.conflicts],
  };
  listeners.forEach(fn => { try { fn(snapshot); } catch {} });
}


function updateState(partial: Partial<OfflineSyncState>) {
  currentState = { ...currentState, ...partial };
  notifyListeners();
}

// ─── Queue Operations ──────────────────────────────────────

/**
 * Queue a tile layout change. Coalesces changes for the same user+tab
 * by replacing the previous pending entry (only the latest matters).
 */
export async function queueTileChange(
  userId: string,
  tabId: string,
  tabName: string,
  tiles: any[],
  customWidgets: any[],
  refreshInterval: number,
  tabOrder: number,
  isActive: boolean,
): Promise<void> {
  const entry: PendingTileChange = {
    id: `${userId}::${tabId}`,  // Composite key – coalesces per user+tab
    userId,
    tabId,
    tabName,
    tiles: safeClone(tiles),
    customWidgets: safeClone(customWidgets),
    refreshInterval,
    tabOrder,
    isActive,
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
  };

  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(entry);
    await txComplete(tx);
  } catch {
    // Fallback to localStorage
    try {
      const queue = JSON.parse(localStorage.getItem('dashboard_sync_queue') || '[]') as PendingTileChange[];
      const idx = queue.findIndex(e => e.id === entry.id);
      if (idx >= 0) queue[idx] = entry;
      else queue.push(entry);
      localStorage.setItem('dashboard_sync_queue', JSON.stringify(queue));
    } catch {}
  }

  // Track which tiles are unsaved
  const tileIds = tiles.map((t: any) => t.id).filter(Boolean);
  const newUnsaved = new Set(currentState.unsavedTileIds);
  tileIds.forEach((id: string) => newUnsaved.add(id));
  const newPending = new Set(currentState.pendingTabIds);
  newPending.add(tabId);

  updateState({
    pendingCount: currentState.pendingCount + (currentState.pendingTabIds.has(tabId) ? 0 : 1),
    unsavedTileIds: newUnsaved,
    pendingTabIds: newPending,
  });
}

/**
 * Get all pending changes for a user
 */
export async function getPendingChanges(userId?: string): Promise<PendingTileChange[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        let results = (request.result || []) as PendingTileChange[];
        if (userId) results = results.filter(e => e.userId === userId);
        results = results.filter(e => e.status === 'pending' || e.status === 'failed');
        resolve(results);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    try {
      const queue = JSON.parse(localStorage.getItem('dashboard_sync_queue') || '[]') as PendingTileChange[];
      return queue.filter(e => (!userId || e.userId === userId) && (e.status === 'pending' || e.status === 'failed'));
    } catch { return []; }
  }
}

/**
 * Save a snapshot of the last known server state for conflict resolution
 */
export async function saveServerSnapshot(userId: string, tabId: string, serverData: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
    tx.objectStore(SNAPSHOT_STORE).put({
      key: `${userId}::${tabId}`,
      userId,
      tabId,
      data: safeClone(serverData),
      timestamp: Date.now(),
    });
  } catch {}
}

/**
 * Get the last known server state for conflict resolution
 */
export async function getServerSnapshot(userId: string, tabId: string): Promise<{ data: any; timestamp: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
      const request = tx.objectStore(SNAPSHOT_STORE).get(`${userId}::${tabId}`);
      request.onsuccess = () => {
        const result = request.result;
        if (result) resolve({ data: result.data, timestamp: result.timestamp });
        else resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  } catch { return null; }
}

// ─── Sync Execution ────────────────────────────────────────

let syncInProgress = false;

/**
 * Attempt to sync all pending changes to the server.
 * Uses last-write-wins conflict resolution based on timestamps.
 */
export async function syncPendingChanges(userId?: string): Promise<{ synced: number; failed: number; conflicts: number }> {
  if (syncInProgress) return { synced: 0, failed: 0, conflicts: 0 };
  if (!navigator.onLine) {
    updateState({ isOnline: false });
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  syncInProgress = true;
  updateState({ isSyncing: true, errors: [] });

  const pending = await getPendingChanges(userId);
  if (pending.length === 0) {
    syncInProgress = false;
    updateState({
      isSyncing: false,
      lastSyncTime: Date.now(),
      lastSyncResult: 'success',
      pendingCount: 0,
      unsavedTileIds: new Set(),
      pendingTabIds: new Set(),
    });
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  const errors: string[] = [];

  for (const entry of pending) {
    try {
      // Mark as syncing
      await updateQueueEntry(entry.id, { status: 'syncing' });

      // ── Conflict Resolution: Last-Write-Wins ──
      // Fetch the current server state for this tab
      let serverTimestamp = 0;
      try {
        const { data: serverResp, error: fetchErr } = await supabase.functions.invoke('dashboard-config', {
          body: { action: 'get', user_id: entry.userId }
        });
        if (!fetchErr && serverResp?.data) {
          const serverTab = serverResp.data.find((c: any) => c.tab_id === entry.tabId);
          if (serverTab?.updated_at) {
            serverTimestamp = new Date(serverTab.updated_at).getTime();
          }
        }
      } catch {}

      // If server has a newer version, surface as a conflict for user resolution
      if (serverTimestamp > entry.timestamp) {
        conflicts++;
        console.log(`[DashboardSync] Conflict: server (${new Date(serverTimestamp).toISOString()}) > local (${new Date(entry.timestamp).toISOString()}) for tab ${entry.tabId}. Surfacing to UI.`);

        // Fetch full server data for the conflict modal
        let serverTiles: any[] = [];
        let serverCustomWidgets: any[] = [];
        let serverRefreshInterval = 60;
        try {
          const { data: freshResp } = await supabase.functions.invoke('dashboard-config', {
            body: { action: 'get', user_id: entry.userId }
          });
          if (freshResp?.data) {
            const freshTab = freshResp.data.find((c: any) => c.tab_id === entry.tabId);
            if (freshTab) {
              serverTiles = Array.isArray(freshTab.tiles) ? freshTab.tiles : [];
              serverCustomWidgets = Array.isArray(freshTab.custom_widgets) ? freshTab.custom_widgets : [];
              serverRefreshInterval = freshTab.refresh_interval || 60;
              await saveServerSnapshot(entry.userId, entry.tabId, freshTab);
            }
          }
        } catch {}

        // Create conflict object for the UI
        const conflict: SyncConflict = {
          id: `conflict-${entry.userId}-${entry.tabId}-${Date.now()}`,
          userId: entry.userId,
          tabId: entry.tabId,
          tabName: entry.tabName,
          localTiles: safeClone(entry.tiles),
          serverTiles: safeClone(serverTiles),
          localTimestamp: entry.timestamp,
          serverTimestamp,
          localCustomWidgets: safeClone(entry.customWidgets),
          serverCustomWidgets: safeClone(serverCustomWidgets),
          localRefreshInterval: entry.refreshInterval,
          serverRefreshInterval,
          pendingEntry: safeClone(entry),
        };

        // Add conflict to state (don't auto-resolve)
        const existingConflicts = [...currentState.conflicts];
        // Replace existing conflict for same tab if any
        const existingIdx = existingConflicts.findIndex(c => c.tabId === entry.tabId && c.userId === entry.userId);
        if (existingIdx >= 0) {
          existingConflicts[existingIdx] = conflict;
        } else {
          existingConflicts.push(conflict);
        }
        updateState({ conflicts: existingConflicts });

        // Mark as completed in queue (conflict is now tracked in state)
        await updateQueueEntry(entry.id, { status: 'completed' });
        continue;
      }


      // Local is newer or same – push our changes
      const serializedTiles = entry.tiles.map(serializeTile);
      const { data: resp, error } = await supabase.functions.invoke('dashboard-config', {
        body: {
          action: 'upsert',
          config: {
            user_id: String(entry.userId),
            tab_id: String(entry.tabId),
            tab_name: String(entry.tabName),
            tiles: serializedTiles,
            custom_widgets: safeClone(entry.customWidgets),
            refresh_interval: entry.refreshInterval,
            tab_order: entry.tabOrder,
            is_active: entry.isActive,
            updated_at: new Date(entry.timestamp).toISOString(),
          }
        }
      });

      if (error) throw error;
      if (resp && !resp.success) throw new Error(resp.error || 'Upsert failed');

      await updateQueueEntry(entry.id, { status: 'completed' });
      await saveServerSnapshot(entry.userId, entry.tabId, { tiles: entry.tiles, updated_at: new Date(entry.timestamp).toISOString() });
      synced++;
    } catch (err: any) {
      failed++;
      const msg = err?.message || String(err);
      errors.push(`Tab ${entry.tabId}: ${msg}`);
      await updateQueueEntry(entry.id, {
        status: 'failed',
        retries: entry.retries + 1,
        errorMessage: msg,
      });
    }
  }

  // Clean up completed entries
  await clearCompletedEntries();

  // Refresh pending state
  const remaining = await getPendingChanges(userId);
  const remainingTileIds = new Set<string>();
  const remainingTabIds = new Set<string>();
  remaining.forEach(e => {
    e.tiles.forEach((t: any) => { if (t.id) remainingTileIds.add(t.id); });
    remainingTabIds.add(e.tabId);
  });

  syncInProgress = false;
  updateState({
    isSyncing: false,
    lastSyncTime: Date.now(),
    lastSyncResult: failed === 0 ? 'success' : synced > 0 ? 'partial' : 'failed',
    pendingCount: remaining.length,
    unsavedTileIds: remainingTileIds,
    pendingTabIds: remainingTabIds,
    errors,
  });

  return { synced, failed, conflicts };
}

// ─── Queue Helpers ─────────────────────────────────────────

async function updateQueueEntry(id: string, updates: Partial<PendingTileChange>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        store.put({ ...request.result, ...updates });
      }
    };
  } catch {}
}

async function clearCompletedEntries(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (cursor.value.status === 'completed') cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });
  } catch {}
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Serialization Helpers ─────────────────────────────────

function safeClone(value: any): any {
  if (value === null || value === undefined) return [];
  try { return JSON.parse(JSON.stringify(value)); } catch { return []; }
}

function serializeTile(tile: any): object {
  return {
    id: String(tile.id || ''),
    widgetId: String(tile.widgetId || ''),
    title: String(tile.title || ''),
    position: { x: Math.round(Number(tile.position?.x) || 0), y: Math.round(Number(tile.position?.y) || 0) },
    size: { width: Math.round(Number(tile.size?.width) || 200), height: Math.round(Number(tile.size?.height) || 150) },
    zIndex: Math.round(Number(tile.zIndex) || 1),
    glowColor: String(tile.glowColor || 'cyan'),
  };
}

// ─── Public API ────────────────────────────────────────────

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentState, unsavedTileIds: new Set(currentState.unsavedTileIds), pendingTabIds: new Set(currentState.pendingTabIds) });
  return () => listeners.delete(listener);
}

export function getSyncState(): OfflineSyncState {
  return { ...currentState, unsavedTileIds: new Set(currentState.unsavedTileIds), pendingTabIds: new Set(currentState.pendingTabIds) };
}

export function triggerSync(userId?: string): Promise<{ synced: number; failed: number; conflicts: number }> {
  return syncPendingChanges(userId);
}

/**
 * Check if a specific tile has unsaved changes
 */
export function isTileUnsaved(tileId: string): boolean {
  return currentState.unsavedTileIds.has(tileId);
}

/**
 * Mark all tiles as saved (call after successful server save)
 */
export function markAllSaved(): void {
  updateState({
    unsavedTileIds: new Set(),
    pendingTabIds: new Set(),
    pendingCount: 0,
  });
}

/**
 * Clear all pending changes (e.g., after successful direct save)
 */
export async function clearPendingChanges(userId?: string): Promise<void> {
  try {
    const db = await openDB();
    if (userId) {
      const pending = await getPendingChanges(userId);
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      pending.forEach(e => store.delete(e.id));
    } else {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).clear();
    }
  } catch {}
  markAllSaved();
}


/**
 * Resolve a sync conflict by applying the chosen strategy.
 * - 'keep-local': Force-push local tiles to server
 * - 'use-server': Accept server tiles (caller should reload dashboard)
 * - 'merge': Combine tiles from both versions (union, deduplicate by id)
 * Returns the resolved tiles array.
 */
export async function resolveConflict(
  conflictId: string,
  strategy: 'keep-local' | 'use-server' | 'merge',
): Promise<{ resolvedTiles: any[]; resolvedWidgets: any[]; resolvedRefreshInterval: number } | null> {
  const conflict = currentState.conflicts.find(c => c.id === conflictId);
  if (!conflict) return null;

  let resolvedTiles: any[];
  let resolvedWidgets: any[];
  let resolvedRefreshInterval: number;

  switch (strategy) {
    case 'keep-local':
      resolvedTiles = safeClone(conflict.localTiles);
      resolvedWidgets = safeClone(conflict.localCustomWidgets);
      resolvedRefreshInterval = conflict.localRefreshInterval;
      // Force-push local to server
      try {
        const serializedTiles = resolvedTiles.map(serializeTile);
        await supabase.functions.invoke('dashboard-config', {
          body: {
            action: 'upsert',
            config: {
              user_id: String(conflict.userId),
              tab_id: String(conflict.tabId),
              tab_name: String(conflict.tabName),
              tiles: serializedTiles,
              custom_widgets: resolvedWidgets,
              refresh_interval: resolvedRefreshInterval,
              tab_order: conflict.pendingEntry.tabOrder,
              is_active: conflict.pendingEntry.isActive,
              updated_at: new Date().toISOString(),
            }
          }
        });
        await saveServerSnapshot(conflict.userId, conflict.tabId, { tiles: resolvedTiles, updated_at: new Date().toISOString() });
      } catch (e) {
        console.error('[DashboardSync] Failed to push local resolution:', e);
      }
      break;

    case 'use-server':
      resolvedTiles = safeClone(conflict.serverTiles);
      resolvedWidgets = safeClone(conflict.serverCustomWidgets);
      resolvedRefreshInterval = conflict.serverRefreshInterval;
      // Server already has this data, just update our snapshot
      await saveServerSnapshot(conflict.userId, conflict.tabId, { tiles: resolvedTiles, updated_at: new Date(conflict.serverTimestamp).toISOString() });
      break;

    case 'merge': {
      // Union of tiles: keep all tiles from both, deduplicate by id (local wins on collision)
      const localMap = new Map<string, any>();
      conflict.localTiles.forEach((t: any) => localMap.set(t.id, t));
      conflict.serverTiles.forEach((t: any) => {
        if (!localMap.has(t.id)) localMap.set(t.id, t);
      });
      resolvedTiles = safeClone(Array.from(localMap.values()));

      // Merge custom widgets similarly
      const widgetMap = new Map<string, any>();
      conflict.localCustomWidgets.forEach((w: any) => widgetMap.set(w.id, w));
      conflict.serverCustomWidgets.forEach((w: any) => {
        if (!widgetMap.has(w.id)) widgetMap.set(w.id, w);
      });
      resolvedWidgets = safeClone(Array.from(widgetMap.values()));
      resolvedRefreshInterval = conflict.localRefreshInterval; // prefer local setting

      // Push merged result to server
      try {
        const serializedTiles = resolvedTiles.map(serializeTile);
        await supabase.functions.invoke('dashboard-config', {
          body: {
            action: 'upsert',
            config: {
              user_id: String(conflict.userId),
              tab_id: String(conflict.tabId),
              tab_name: String(conflict.tabName),
              tiles: serializedTiles,
              custom_widgets: resolvedWidgets,
              refresh_interval: resolvedRefreshInterval,
              tab_order: conflict.pendingEntry.tabOrder,
              is_active: conflict.pendingEntry.isActive,
              updated_at: new Date().toISOString(),
            }
          }
        });
        await saveServerSnapshot(conflict.userId, conflict.tabId, { tiles: resolvedTiles, updated_at: new Date().toISOString() });
      } catch (e) {
        console.error('[DashboardSync] Failed to push merge resolution:', e);
      }
      break;
    }
  }

  // Remove the resolved conflict from state
  const remaining = currentState.conflicts.filter(c => c.id !== conflictId);
  updateState({ conflicts: remaining });

  return { resolvedTiles, resolvedWidgets, resolvedRefreshInterval };
}

/**
 * Dismiss a conflict without resolving (uses server version by default)
 */
export function dismissConflict(conflictId: string): void {
  const remaining = currentState.conflicts.filter(c => c.id !== conflictId);
  updateState({ conflicts: remaining });
}


// ─── Browser Event Listeners ───────────────────────────────

let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateState({ isOnline: true });
    // Auto-sync after coming back online (2s delay to let connection stabilize)
    if (autoSyncTimer) clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => {
      if (currentState.pendingCount > 0) {
        console.log('[DashboardSync] Back online – syncing pending changes...');
        syncPendingChanges();
      }
    }, 2000);
  });

  window.addEventListener('offline', () => {
    updateState({ isOnline: false });
  });

  // Periodic sync check every 30 seconds
  setInterval(() => {
    if (navigator.onLine && currentState.pendingCount > 0 && !currentState.isSyncing) {
      syncPendingChanges();
    }
  }, 30000);
}

// Initialize pending count
(async () => {
  try {
    const pending = await getPendingChanges();
    const tileIds = new Set<string>();
    const tabIds = new Set<string>();
    pending.forEach(e => {
      e.tiles.forEach((t: any) => { if (t.id) tileIds.add(t.id); });
      tabIds.add(e.tabId);
    });
    updateState({
      pendingCount: pending.length,
      unsavedTileIds: tileIds,
      pendingTabIds: tabIds,
    });
  } catch {}
})();
