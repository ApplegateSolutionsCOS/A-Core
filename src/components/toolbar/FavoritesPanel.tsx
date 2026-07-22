import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/dbProxy';

import { SearchIcon, CloseIcon, StarIcon, PinIcon } from '@/components/icons/Icons';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';
import { WORKSPACE_DEFINITIONS } from '@/types';

const WS_COLORS: Record<string, { primary: string; rgb: string }> = {
  admin: { primary: '#ef4444', rgb: '239,68,68' },
  accounting: { primary: '#22c55e', rgb: '34,197,94' },
  personnel: { primary: '#ff00ff', rgb: '255,0,255' },
  main: { primary: '#00ffff', rgb: '0,255,255' },
  data: { primary: '#a855f7', rgb: '168,85,247' },
  security: { primary: '#ff9900', rgb: '255,153,0' },
};

interface FavoriteItem {
  id: string;
  user_id: string;
  workspace_slug: string;
  app_name: string;
  display_order: number;
}

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onNavigateToMiniApp?: (wsSlug: string, appName: string) => void;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ isOpen, onClose, userId, onNavigateToMiniApp }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load favorites from DB
const loadFavorites = useCallback(async () => {
  if (!userId) return;
  try {
    // ⚡ FIX: Removed .schema() since dbProxy doesn't support it (and it routes correctly without it!)
    const { data, error } = await db
      .from('miniapp_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (data && !error) {
      setFavorites(data);
    }
  } catch (e) {
    console.error('Error loading favorites:', e);
  }
  setLoading(false);
}, [userId]); // (Make sure userId is in the dependency array)

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
      setTimeout(() => searchRef.current?.focus(), 200);
    }
  }, [isOpen, loadFavorites]);

  // Fuzzy search
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    let qi = 0;
    for (let i = 0; i < lower.length && qi < q.length; i++) {
      if (lower[i] === q[qi]) qi++;
    }
    return qi === q.length;
  };

  const filtered = favorites.filter(f =>
    fuzzyMatch(f.app_name, searchQuery) || fuzzyMatch(f.workspace_slug, searchQuery)
  );

  // Remove favorite
  const removeFavorite = async (fav: FavoriteItem) => {
    setFavorites(prev => prev.filter(f => f.id !== fav.id));
    try {
      await db.from('miniapp_favorites').delete().eq('id', fav.id);
    } catch (e) {
      console.error('Error removing favorite:', e);
    }
  };


  // Drag and drop reorder
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = async (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newFavs = [...favorites];
    const [moved] = newFavs.splice(dragIdx, 1);
    newFavs.splice(idx, 0, moved);
    // Update display_order
    const updated = newFavs.map((f, i) => ({ ...f, display_order: i }));
    setFavorites(updated);
    setDragIdx(null);
    setDragOverIdx(null);
    for (const f of updated) {
      try {
        await db.from('miniapp_favorites').update({ display_order: f.display_order }).eq('id', f.id);
      } catch (e) {
        console.error('Error updating order:', e);
      }
    }

  };

  const handleNavigate = (fav: FavoriteItem) => {
    if (onNavigateToMiniApp) {
      onNavigateToMiniApp(fav.workspace_slug, fav.app_name);
    }
    onClose();
  };

  if (!isOpen) return null;

  // ⚡ FIX: Use createPortal to break out of z-index stacking contexts
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border border-rose-500/30 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-[0_0_40px_rgba(255,153,170,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 flex items-center justify-center">
              <StarIcon size={22} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-mono">Favorites</h2>
              <p className="text-xs text-gray-400 font-mono">{favorites.length} pinned MiniApps</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500/50" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Fuzzy search favorites..."
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-rose-500/50 transition-all placeholder-gray-600"
            />
          </div>
        </div>

        {/* Favorites list */}
        <div className="overflow-y-auto max-h-[55vh] p-3 space-y-1 darkwave-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-400 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <StarIcon size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 font-mono text-sm">
                {searchQuery ? 'No matching favorites' : 'No favorites yet'}
              </p>
              <p className="text-gray-600 font-mono text-xs mt-1">
                {searchQuery ? 'Try a different search' : 'Star MiniApps to pin them here'}
              </p>
            </div>
          ) : (
            filtered.map((fav, idx) => {
              const wsColor = WS_COLORS[fav.workspace_slug] || WS_COLORS.main;
              const AppIcon = getMiniAppIcon(fav.app_name);
              const wsName = (WORKSPACE_DEFINITIONS as any)[fav.workspace_slug]?.name || fav.workspace_slug;
              const isDragOver = dragOverIdx === idx;

              return (
                <div
                  key={fav.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  onClick={() => handleNavigate(fav)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                    isDragOver ? 'border-rose-500/50 bg-rose-500/10' : 'border-transparent hover:bg-gray-900/80'
                  }`}
                  style={{
                    border: `1px solid ${isDragOver ? 'rgba(255,153,170,0.4)' : 'transparent'}`,
                    opacity: dragIdx === idx ? 0.5 : 1,
                  }}
                >
                  {/* Drag handle */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing flex-shrink-0">
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                  </div>

                  {/* Workspace color indicator */}
                  <div
                    className="w-1.5 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: wsColor.primary, boxShadow: `0 0 6px ${wsColor.primary}60` }}
                  />

                  {/* App icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      border: `1.5px solid rgba(${wsColor.rgb}, 0.4)`,
                      background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.12), rgba(0,0,0,0.9))`,
                    }}
                  >
                    <AppIcon size={16} style={{ color: wsColor.primary }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-mono text-sm font-medium truncate">{fav.app_name}</p>
                    <p className="text-xs font-mono truncate" style={{ color: wsColor.primary }}>{wsName}</p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={e => { e.stopPropagation(); removeFavorite(fav); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                    title="Remove from favorites"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {favorites.length > 0 && (
          <div className="p-3 border-t border-gray-800 text-center">
            <p className="text-[10px] text-gray-600 font-mono">Drag to reorder &middot; Click to navigate</p>
          </div>
        )}
      </div>
    </div>,
    document.body // ⚡ FIX: Attach to document body
  );
};

export default FavoritesPanel;
