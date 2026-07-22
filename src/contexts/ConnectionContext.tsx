/**
 * Connection Status Context - Monitors edge function availability
 * and provides connection state + sync controls to the entire app.
 * 
 * IMPORTANT: The offline banner only shows when navigator.onLine === false
 * (actual network disconnection). Edge function unreachability is tracked
 * separately for sync decisions but does NOT trigger the offline banner.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeSyncStatus, getSyncStatus, triggerSync,
  startSyncTimer, stopSyncTimer, setSyncInterval, getSyncInterval,
  checkEdgeFunctionHealth, isEdgeFunctionAvailable,
  type SyncStatus,
} from '@/lib/syncEngine';
import { getCacheStats, invalidateAll, invalidateTable } from '@/lib/offlineCache';
import { toast } from '@/components/ui/use-toast';

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  tableBreakdown: Record<string, { count: number; size: number }>;
  syncQueueSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

interface ConnectionContextType {
  // Connection state
  isOnline: boolean;                   // Combined: navigator.onLine && edge function reachable
  isBrowserOnline: boolean;            // Pure browser online status (navigator.onLine)
  isEdgeFunctionReachable: boolean;    // Whether edge functions are reachable
  
  // Sync state
  syncStatus: SyncStatus;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncTime: number | null;
  
  // Sync controls
  triggerManualSync: () => Promise<void>;
  setSyncFrequency: (intervalMs: number) => Promise<void>;
  getSyncFrequency: () => Promise<number>;
  
  // Cache controls
  cacheStats: CacheStats | null;
  refreshCacheStats: () => Promise<void>;
  clearAllCache: () => Promise<void>;
  clearTableCache: (table: string) => Promise<void>;
  
  // Banner visibility - ONLY for true offline (navigator.onLine === false)
  showBanner: boolean;
  dismissBanner: () => void;
  
  // Health check
  checkHealth: () => Promise<boolean>;
}

const defaultContext: ConnectionContextType = {
  isOnline: true,
  isBrowserOnline: true,
  isEdgeFunctionReachable: true,
  syncStatus: getSyncStatus(),
  isSyncing: false,
  pendingChanges: 0,
  lastSyncTime: null,
  triggerManualSync: async () => {},
  setSyncFrequency: async () => {},
  getSyncFrequency: async () => 900000,
  cacheStats: null,
  refreshCacheStats: async () => {},
  clearAllCache: async () => {},
  clearTableCache: async () => {},
  showBanner: false,
  dismissBanner: () => {},
  checkHealth: async () => true,
};

const ConnectionContext = createContext<ConnectionContextType>(defaultContext);

export const useConnection = () => useContext(ConnectionContext);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const wasBrowserOnlineRef = useRef(true);
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track browser online/offline events directly
  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      setShowBanner(false);
      setBannerDismissed(false);
      toast({
        title: 'Connection Restored',
        description: 'You are back online. Syncing pending changes...',
        duration: 4000,
      });
    };

    const handleOffline = () => {
      setIsBrowserOnline(false);
      if (!bannerDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [bannerDismissed]);

  // Subscribe to sync status changes (for sync state only, NOT for banner)
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
      // We do NOT use status.isOnline for the banner anymore
      // The banner is controlled purely by navigator.onLine events above
    });

    return unsubscribe;
  }, []);

  // Start sync timer and health checks
  useEffect(() => {
    startSyncTimer();

    // Periodic health check (for sync decisions, not for banner)
    healthCheckRef.current = setInterval(() => {
      checkEdgeFunctionHealth();
    }, 60000); // Every 60 seconds

    // Initial health check
    checkEdgeFunctionHealth();

    return () => {
      stopSyncTimer();
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    };
  }, []);

  // Load cache stats periodically
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getCacheStats();
      setCacheStats(stats);
    };
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerManualSync = useCallback(async () => {
    try {
      await triggerSync();
      toast({
        title: 'Sync Complete',
        description: `Sync finished at ${new Date().toLocaleTimeString()}`,
        duration: 3000,
      });
    } catch {
      toast({
        title: 'Sync Failed',
        description: 'Could not reach the server. Changes will be synced when connection is restored.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, []);

  const setSyncFrequency = useCallback(async (intervalMs: number) => {
    await setSyncInterval(intervalMs);
    toast({
      title: 'Sync Frequency Updated',
      description: `Auto-sync set to every ${Math.round(intervalMs / 60000)} minutes`,
      duration: 3000,
    });
  }, []);

  const refreshCacheStats = useCallback(async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  }, []);

  const clearAllCache = useCallback(async () => {
    await invalidateAll();
    await refreshCacheStats();
    toast({
      title: 'Cache Cleared',
      description: 'All cached data has been cleared. Fresh data will be fetched on next request.',
      duration: 3000,
    });
  }, [refreshCacheStats]);

  const clearTableCache = useCallback(async (table: string) => {
    await invalidateTable(table);
    await refreshCacheStats();
  }, [refreshCacheStats]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    setBannerDismissed(true);
  }, []);

  const checkHealth = useCallback(async () => {
    return checkEdgeFunctionHealth();
  }, []);

  const value: ConnectionContextType = {
    isOnline: isBrowserOnline && isEdgeFunctionAvailable(),
    isBrowserOnline,
    isEdgeFunctionReachable: isEdgeFunctionAvailable(),
    syncStatus,
    isSyncing: syncStatus.isSyncing,
    pendingChanges: syncStatus.pendingChanges,
    lastSyncTime: syncStatus.lastSyncTime,
    triggerManualSync,
    setSyncFrequency,
    getSyncFrequency: getSyncInterval,
    cacheStats,
    refreshCacheStats,
    clearAllCache,
    clearTableCache,
    showBanner,
    dismissBanner,
    checkHealth,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};
