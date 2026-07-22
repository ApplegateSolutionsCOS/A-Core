/**
 * Connection Banner - Shows ONLY when navigator.onLine === false (actual network disconnection)
 * Does NOT show when edge functions are unreachable but browser has internet.
 * 
 * Cached Data Indicator - Shows when displaying stale/cached data
 * Only visible when user is authenticated
 */

import React, { useState, useEffect } from 'react';
import { useConnection } from '@/contexts/ConnectionContext';
import { useAuth } from '@/contexts/AuthContext';

// ─── Connection Status Banner ────────────────────────────────

export const ConnectionBanner: React.FC = () => {
  const { isBrowserOnline, showBanner, dismissBanner, pendingChanges, isSyncing, triggerManualSync, syncStatus } = useConnection();
  const { isAuthenticated } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  // Only show when:
  // 1. User is signed in
  // 2. showBanner is true (set by ConnectionContext when navigator goes offline)
  // 3. Browser is actually offline (navigator.onLine === false)
  if (!showBanner || isBrowserOnline || !isAuthenticated) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    await triggerManualSync();
    setIsRetrying(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-slideDown">
      <div className="bg-gradient-to-r from-purple-950/70 via-violet-950/70 to-fuchsia-950/70 border-b border-purple-500/25 backdrop-blur-md px-4 py-2.5 shadow-[0_4px_20px_rgba(147,51,234,0.1)]">

        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Pulsing disconnected indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-purple-500 animate-ping opacity-75" />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-purple-300 font-mono text-sm font-bold">OFFLINE MODE</span>
              <span className="text-purple-400/60 font-mono text-xs hidden sm:inline">
                No internet connection — using cached data
              </span>
              {pendingChanges > 0 && (
                <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 font-mono text-xs">
                  {pendingChanges} pending {pendingChanges === 1 ? 'change' : 'changes'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRetry}
              disabled={isRetrying || isSyncing}
              className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all font-mono text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRetrying || isSyncing ? 'animate-spin' : ''}>
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
            
            <button
              onClick={dismissBanner}
              className="p-1.5 text-purple-400/60 hover:text-purple-300 transition-colors"
              title="Dismiss"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Sync progress bar */}
      {isSyncing && (
        <div className="h-0.5 bg-purple-950">
          <div className="h-full bg-gradient-to-r from-purple-500 to-violet-400 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
    </div>
  );
};


// ─── Cached Data Indicator ────────────────────────────────

interface CachedDataIndicatorProps {
  isCached?: boolean;
  cacheAge?: number;
  tableName?: string;
  className?: string;
  compact?: boolean;
}

export const CachedDataIndicator: React.FC<CachedDataIndicatorProps> = ({
  isCached,
  cacheAge,
  tableName,
  className = '',
  compact = false,
}) => {
  if (!isCached) return null;

  const ageStr = cacheAge
    ? cacheAge < 60000
      ? `${Math.round(cacheAge / 1000)}s ago`
      : cacheAge < 3600000
        ? `${Math.round(cacheAge / 60000)}m ago`
        : `${Math.round(cacheAge / 3600000)}h ago`
    : 'cached';

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400/80 text-[10px] font-mono ${className}`}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v10l4.5 4.5" /><circle cx="12" cy="12" r="10" />
        </svg>
        {ageStr}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400/80 flex-shrink-0">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
      <span className="text-amber-400/80 font-mono text-xs">
        Showing cached data{tableName ? ` for ${tableName}` : ''} ({ageStr})
      </span>
    </div>
  );
};

// ─── Connection Status Dot (for headers/toolbars) ────────────

export const ConnectionStatusDot: React.FC<{ className?: string; showLabel?: boolean }> = ({ className = '', showLabel = false }) => {
  const { isBrowserOnline, isEdgeFunctionReachable, pendingChanges, isSyncing } = useConnection();

  // Determine status: syncing > online > edge-unreachable > offline
  const getStatus = () => {
    if (isSyncing) return { color: 'bg-blue-400', textColor: 'text-blue-400', label: 'SYNCING', pulse: true };
    if (!isBrowserOnline) return { color: 'bg-red-400', textColor: 'text-red-400', label: 'OFFLINE', pulse: true };
    if (!isEdgeFunctionReachable) return { color: 'bg-yellow-400', textColor: 'text-yellow-400', label: 'LOCAL', pulse: false };
    return { color: 'bg-green-400', textColor: 'text-green-400', label: 'ONLINE', pulse: false };
  };

  const status = getStatus();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${status.color}`} />
        {status.pulse && (
          <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-75 ${status.color}`} />
        )}
      </div>
      {showLabel && (
        <span className={`font-mono text-xs ${status.textColor}`}>
          {status.label}
        </span>
      )}
      {pendingChanges > 0 && (
        <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 font-mono text-[10px]">
          {pendingChanges}
        </span>
      )}
    </div>
  );
};

// ─── Sync Status Panel (for settings/admin) ────────────────

export const SyncStatusPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    isOnline, isBrowserOnline, isEdgeFunctionReachable, syncStatus, pendingChanges, lastSyncTime,
    triggerManualSync, isSyncing, cacheStats, refreshCacheStats, clearAllCache,
    setSyncFrequency, getSyncFrequency,
  } = useConnection();
  
  const [syncFreq, setSyncFreq] = useState(15);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    getSyncFrequency().then(ms => setSyncFreq(Math.round(ms / 60000)));
  }, [getSyncFrequency]);

  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);

  const handleFreqChange = async (minutes: number) => {
    setSyncFreq(minutes);
    await setSyncFrequency(minutes * 60000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (ts: number | null): string => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <div className="relative rounded-xl border border-cyan-500/30 bg-black/80 p-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-mono font-bold flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
              Connection & Sync
            </h4>
            <ConnectionStatusDot showLabel />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Browser</p>
              <p className={`font-mono text-sm font-bold ${isBrowserOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isBrowserOnline ? 'Online' : 'Offline'}
              </p>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Edge Functions</p>
              <p className={`font-mono text-sm font-bold ${isEdgeFunctionReachable ? 'text-green-400' : 'text-yellow-400'}`}>
                {isEdgeFunctionReachable ? 'Reachable' : 'Local Mode'}
              </p>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Pending</p>
              <p className={`font-mono text-sm font-bold ${pendingChanges > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                {pendingChanges} changes
              </p>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Last Sync</p>
              <p className="font-mono text-xs text-gray-300">{formatTime(lastSyncTime)}</p>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Result</p>
              <p className={`font-mono text-sm font-bold ${
                syncStatus.lastSyncResult === 'success' ? 'text-green-400' :
                syncStatus.lastSyncResult === 'partial' ? 'text-yellow-400' :
                syncStatus.lastSyncResult === 'failed' ? 'text-red-400' : 'text-gray-500'
              }`}>
                {syncStatus.lastSyncResult?.toUpperCase() || 'N/A'}
              </p>
            </div>
          </div>

          {/* Local-first info banner */}
          <div className="mb-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
            <p className="text-cyan-400/80 font-mono text-xs">
              <span className="font-bold">Local-First Protocol:</span> Data is cached locally and synced to the server periodically.
              {!isEdgeFunctionReachable && isBrowserOnline && (
                <span className="text-yellow-400 ml-1">Edge functions are currently unreachable — operating in local cache mode. Your data is safe and will sync when the server is available.</span>
              )}
            </p>
          </div>

          {/* Sync Frequency Control */}
          <div className="mb-4">
            <label className="block text-sm font-mono font-medium text-gray-400 mb-2">
              Auto-Sync Frequency
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {[1, 5, 15, 30, 60].map(min => (
                <button
                  key={min}
                  onClick={() => handleFreqChange(min)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
                    syncFreq === min
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {min < 60 ? `${min}m` : `${min / 60}h`}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={syncFreq}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    if (v > 0) handleFreqChange(v);
                  }}
                  className="w-16 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-white font-mono text-xs text-center focus:outline-none focus:border-cyan-500/50"
                />
                <span className="text-gray-500 font-mono text-xs">min</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={triggerManualSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isSyncing ? 'animate-spin' : ''}>
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={clearAllCache}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:border-red-500/30 hover:text-red-400 transition-all font-mono text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear Cache
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-3 py-2 text-gray-500 hover:text-gray-300 font-mono text-xs transition-colors"
            >
              {showAdvanced ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {/* Sync errors */}
          {syncStatus.syncErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 font-mono text-xs font-bold mb-1">Sync Errors:</p>
              {syncStatus.syncErrors.slice(0, 3).map((err, i) => (
                <p key={i} className="text-red-400/70 font-mono text-xs">{err}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Advanced: Cache Stats */}
      {showAdvanced && cacheStats && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-5">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
              <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            Local Cache Details
          </h4>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Entries</p>
              <p className="text-purple-400 font-mono text-lg font-bold">{cacheStats.totalEntries}</p>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Size</p>
              <p className="text-purple-400 font-mono text-lg font-bold">{formatBytes(cacheStats.totalSize)}</p>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Sync Queue</p>
              <p className={`font-mono text-lg font-bold ${cacheStats.syncQueueSize > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                {cacheStats.syncQueueSize}
              </p>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <p className="text-gray-500 text-[10px] font-mono uppercase">Tables</p>
              <p className="text-purple-400 font-mono text-lg font-bold">{Object.keys(cacheStats.tableBreakdown).length}</p>
            </div>
          </div>

          {/* Per-table breakdown */}
          {Object.keys(cacheStats.tableBreakdown).length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-500 font-mono text-xs uppercase">Per-Table Breakdown</p>
              {Object.entries(cacheStats.tableBreakdown).sort(([, a], [, b]) => b.size - a.size).map(([table, info]) => (
                <div key={table} className="flex items-center justify-between p-2 bg-gray-900/40 border border-gray-800 rounded-lg">
                  <span className="text-gray-300 font-mono text-xs">{table}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-mono text-xs">{info.count} entries</span>
                    <span className="text-purple-400 font-mono text-xs">{formatBytes(info.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
