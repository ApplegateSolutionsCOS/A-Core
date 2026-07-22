import React, { useState, useMemo } from 'react';
import { CloseIcon } from '@/components/icons/Icons';
import { type SyncConflict, resolveConflict, dismissConflict } from '@/lib/dashboardOfflineSync';

// ─── SVG Minimap Preview ───────────────────────────────────

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 180;

const TileLayoutPreview: React.FC<{ tiles: any[]; label: string; accentColor: string }> = ({ tiles, label, accentColor }) => {
  // Compute bounding box of all tiles to normalize into preview area
  const bounds = useMemo(() => {
    if (!tiles || tiles.length === 0) return { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tiles) {
      const x = Number(t.position?.x) || 0;
      const y = Number(t.position?.y) || 0;
      const w = Number(t.size?.width) || 200;
      const h = Number(t.size?.height) || 150;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }
    // Add padding
    return { minX: minX - 10, minY: minY - 10, maxX: maxX + 10, maxY: maxY + 10 };
  }, [tiles]);

  const scaleX = PREVIEW_WIDTH / Math.max(bounds.maxX - bounds.minX, 1);
  const scaleY = PREVIEW_HEIGHT / Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(scaleX, scaleY, 1);

  const glowColorMap: Record<string, string> = {
    cyan: '#22d3ee', magenta: '#d946ef', green: '#22c55e',
    purple: '#a855f7', orange: '#f97316', red: '#ef4444',
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-gray-600 ml-auto">{tiles.length} tile{tiles.length !== 1 ? 's' : ''}</span>
      </div>
      <svg
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
        className="rounded-lg border border-gray-800 bg-gray-950/80"
      >
        {/* Grid dots */}
        {Array.from({ length: 15 }).map((_, i) =>
          Array.from({ length: 10 }).map((_, j) => (
            <circle
              key={`${i}-${j}`}
              cx={i * 20 + 10}
              cy={j * 20 + 10}
              r={0.5}
              fill="rgba(100,100,100,0.3)"
            />
          ))
        )}
        {/* Tile rectangles */}
        {tiles.map((t: any, idx: number) => {
          const x = ((Number(t.position?.x) || 0) - bounds.minX) * scale;
          const y = ((Number(t.position?.y) || 0) - bounds.minY) * scale;
          const w = (Number(t.size?.width) || 200) * scale;
          const h = (Number(t.size?.height) || 150) * scale;
          const color = glowColorMap[t.glowColor] || glowColorMap.cyan;
          return (
            <g key={t.id || idx}>
              <rect
                x={x} y={y} width={w} height={h}
                rx={3} ry={3}
                fill={`${color}15`}
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
              {/* Title bar */}
              <rect
                x={x} y={y} width={w} height={Math.min(8, h * 0.15)}
                rx={3} ry={3}
                fill={`${color}30`}
              />
              {/* Widget ID label */}
              {w > 30 && (
                <text
                  x={x + 4} y={y + Math.min(8, h * 0.15) + 10}
                  fontSize={7}
                  fill="rgba(200,200,200,0.5)"
                  fontFamily="monospace"
                >
                  {String(t.widgetId || t.title || '').slice(0, 12)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Diff Summary ──────────────────────────────────────────

const DiffSummary: React.FC<{ localTiles: any[]; serverTiles: any[] }> = ({ localTiles, serverTiles }) => {
  const localIds = new Set(localTiles.map((t: any) => t.id));
  const serverIds = new Set(serverTiles.map((t: any) => t.id));

  const onlyLocal = localTiles.filter((t: any) => !serverIds.has(t.id));
  const onlyServer = serverTiles.filter((t: any) => !localIds.has(t.id));
  const shared = localTiles.filter((t: any) => serverIds.has(t.id));

  // Check for position/size differences in shared tiles
  const movedTiles = shared.filter((lt: any) => {
    const st = serverTiles.find((s: any) => s.id === lt.id);
    if (!st) return false;
    return (
      Math.abs((lt.position?.x || 0) - (st.position?.x || 0)) > 5 ||
      Math.abs((lt.position?.y || 0) - (st.position?.y || 0)) > 5 ||
      Math.abs((lt.size?.width || 0) - (st.size?.width || 0)) > 5 ||
      Math.abs((lt.size?.height || 0) - (st.size?.height || 0)) > 5
    );
  });

  return (
    <div className="space-y-1.5 text-[11px] font-mono">
      {onlyLocal.length > 0 && (
        <div className="flex items-center gap-2 text-yellow-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{onlyLocal.length} tile{onlyLocal.length > 1 ? 's' : ''} only in local</span>
        </div>
      )}
      {onlyServer.length > 0 && (
        <div className="flex items-center gap-2 text-cyan-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{onlyServer.length} tile{onlyServer.length > 1 ? 's' : ''} only on server</span>
        </div>
      )}
      {movedTiles.length > 0 && (
        <div className="flex items-center gap-2 text-purple-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
            <polyline points="19 9 22 12 19 15" /><polyline points="9 19 12 22 15 19" />
            <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
          </svg>
          <span>{movedTiles.length} tile{movedTiles.length > 1 ? 's' : ''} moved/resized</span>
        </div>
      )}
      {onlyLocal.length === 0 && onlyServer.length === 0 && movedTiles.length === 0 && (
        <div className="text-gray-500">No structural differences (position/size changes only)</div>
      )}
    </div>
  );
};

// ─── Main Modal ────────────────────────────────────────────

interface SyncConflictModalProps {
  conflict: SyncConflict;
  onResolved: (resolvedTiles: any[], resolvedWidgets: any[], resolvedRefreshInterval: number) => void;
  onDismiss: () => void;
}

const SyncConflictModal: React.FC<SyncConflictModalProps> = ({ conflict, onResolved, onDismiss }) => {
  const [isResolving, setIsResolving] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<'keep-local' | 'use-server' | 'merge' | null>(null);

  const handleResolve = async (strategy: 'keep-local' | 'use-server' | 'merge') => {
    setIsResolving(true);
    setSelectedStrategy(strategy);
    try {
      const result = await resolveConflict(conflict.id, strategy);
      if (result) {
        onResolved(result.resolvedTiles, result.resolvedWidgets, result.resolvedRefreshInterval);
      }
    } catch (e) {
      console.error('[SyncConflictModal] Resolution failed:', e);
    }
    setIsResolving(false);
  };

  const handleDismiss = () => {
    dismissConflict(conflict.id);
    onDismiss();
  };

  const localTime = new Date(conflict.localTimestamp).toLocaleString();
  const serverTime = new Date(conflict.serverTimestamp).toLocaleString();

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10000 }}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={handleDismiss} />
      <div className="relative bg-black border border-orange-500/50 rounded-xl p-6 w-full max-w-3xl mx-4 shadow-[0_0_60px_rgba(255,153,0,0.15)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-mono font-bold text-white">Sync Conflict Detected</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Tab &ldquo;{conflict.tabName}&rdquo; was edited on another device while you were offline
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-[10px] text-yellow-400/70 font-mono uppercase tracking-wider mb-1">Your Local Version</p>
            <p className="text-xs text-yellow-400 font-mono">{localTime}</p>
          </div>
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
            <p className="text-[10px] text-cyan-400/70 font-mono uppercase tracking-wider mb-1">Server Version</p>
            <p className="text-xs text-cyan-400 font-mono">{serverTime}</p>
          </div>
        </div>

        {/* Side-by-side previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <TileLayoutPreview
            tiles={conflict.localTiles}
            label="Local (Your Changes)"
            accentColor="#eab308"
          />
          <TileLayoutPreview
            tiles={conflict.serverTiles}
            label="Server (Other Device)"
            accentColor="#22d3ee"
          />
        </div>

        {/* Diff summary */}
        <div className="p-3 rounded-lg border border-gray-800 bg-gray-950/50 mb-5">
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2">Differences</p>
          <DiffSummary localTiles={conflict.localTiles} serverTiles={conflict.serverTiles} />
        </div>

        {/* Resolution buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleResolve('keep-local')}
            disabled={isResolving}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              selectedStrategy === 'keep-local' && isResolving
                ? 'border-yellow-400 bg-yellow-500/10'
                : 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500/50'
            } disabled:opacity-50 disabled:cursor-wait`}
          >
            {selectedStrategy === 'keep-local' && isResolving ? (
              <div className="w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
            <span className="text-sm font-mono font-medium text-yellow-400">Keep Local</span>
            <span className="text-[10px] font-mono text-gray-500 text-center">Overwrite server with your changes</span>
          </button>

          <button
            onClick={() => handleResolve('use-server')}
            disabled={isResolving}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              selectedStrategy === 'use-server' && isResolving
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50'
            } disabled:opacity-50 disabled:cursor-wait`}
          >
            {selectedStrategy === 'use-server' && isResolving ? (
              <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span className="text-sm font-mono font-medium text-cyan-400">Use Server</span>
            <span className="text-[10px] font-mono text-gray-500 text-center">Discard local, use server version</span>
          </button>

          <button
            onClick={() => handleResolve('merge')}
            disabled={isResolving}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              selectedStrategy === 'merge' && isResolving
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/50'
            } disabled:opacity-50 disabled:cursor-wait`}
          >
            {selectedStrategy === 'merge' && isResolving ? (
              <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
                <path d="M6 21V9a9 9 0 0 0 9 9" />
              </svg>
            )}
            <span className="text-sm font-mono font-medium text-purple-400">Merge</span>
            <span className="text-[10px] font-mono text-gray-500 text-center">Combine tiles from both versions</span>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-gray-600 font-mono mt-4 text-center">
          Merge keeps all unique tiles from both versions. Shared tiles use your local positions.
        </p>
      </div>
    </div>
  );
};

export default SyncConflictModal;
