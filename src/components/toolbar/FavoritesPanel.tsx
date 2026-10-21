import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import { SearchIcon, CloseIcon, StarIcon, ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon } from '@/components/icons/Icons';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';
import { WORKSPACE_DEFINITIONS } from '@/types';
import { FEATURES } from '@/config/features';
import * as LucideIcons from 'lucide-react';

interface FavoriteMiniAppItem {
  id: string;
  user_id: string;
  workspace_slug: string;
  app_name: string;
  display_order: number;
}

interface FavoritedRecordItem {
  dbId: string;
  itemUid: string;
  title: string;
  subtitle: string;
  miniAppId: string;
  miniAppName: string;
  miniAppIcon?: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  podioItemId?: number | string | null;
  rawData: Record<string, any>;
  updatedAt: string;
}

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onNavigateToMiniApp?: (wsSlug: string, appName: string) => void;
}

const cleanDisplayString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
    try { val = JSON.parse(val); } catch {}
  }
  if (Array.isArray(val)) {
    return val.map(v => (typeof v === 'object' && v !== null ? (v.value || v.text || v.name || v.title || '') : String(v))).filter(Boolean).join(', ');
  }
  if (typeof val === 'object' && val !== null) {
    return String(val.value || val.text || val.name || val.title || '');
  }
  return String(val);
};

const extractRecordTitleAndSubtitle = (data: Record<string, any>, itemUid: string): { title: string; subtitle: string } => {
  const firstName = cleanDisplayString(data['First Name'] || data['first_name']);
  const lastName = cleanDisplayString(data['Last Name'] || data['last_name']);
  const fullName = `${firstName} ${lastName}`.trim();

  const knownTitleKeys = ['Name', 'name', 'Title', 'title', 'Company', 'company', 'Subject', 'subject', 'Project', 'project'];
  let title = fullName;
  if (!title) {
    for (const k of knownTitleKeys) {
      if (data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== '') {
        title = cleanDisplayString(data[k]);
        break;
      }
    }
  }
  if (!title) {
    const firstPopulatedKey = Object.keys(data).find(
      k => !k.startsWith('_') && data[k] !== null && data[k] !== undefined && String(data[k]).trim() !== ''
    );
    if (firstPopulatedKey) title = cleanDisplayString(data[firstPopulatedKey]);
  }
  if (!title) title = itemUid || 'Untitled Record';

  // Find a helpful secondary field for subtitle (e.g., Status, Email, Phone, Category)
  const subKey = Object.keys(data).find(
    k =>
      !k.startsWith('_') &&
      !['First Name', 'Last Name', 'Name', 'name', 'Title', 'title'].includes(k) &&
      data[k] !== null &&
      data[k] !== undefined &&
      String(data[k]).trim() !== ''
  );
  const subtitle = subKey ? `${subKey}: ${cleanDisplayString(data[subKey])}` : itemUid;

  return { title, subtitle };
};

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ isOpen, onClose, userId, onNavigateToMiniApp }) => {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { getColor } = useWorkspaceColor();

  const [activeTab, setActiveTab] = useState<'records' | 'apps'>('records');
  const [favoritedRecords, setFavoritedRecords] = useState<FavoritedRecordItem[]>([]);
  const [pinnedApps, setPinnedApps] = useState<FavoriteMiniAppItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const loadAllFavorites = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch visible workspaces for this organization
      const { data: wsRows } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('id, name, slug, settings')
        .eq('organization_id', orgId)
        .order('display_order', { ascending: true });

      const SYSTEM_PRESET_SLUGS = ['admin', 'accounting', 'personnel', 'main', 'data', 'security'];
      const visibleWorkspaces = !FEATURES.ENABLE_PRESET_WORKSPACES_AND_APPS
        ? (wsRows || []).filter((w: any) => {
            if (!SYSTEM_PRESET_SLUGS.includes(w.slug)) return true;
            const s = typeof w.settings === 'string' ? JSON.parse(w.settings || '{}') : (w.settings || {});
            return Boolean(s.is_custom_lite);
          })
        : (wsRows || []);

      const wsMap = new Map<string, { id: string; name: string; slug: string }>();
      visibleWorkspaces.forEach((w: any) => wsMap.set(w.id, { id: w.id, name: w.name, slug: w.slug }));

      const activeWsIds = Array.from(wsMap.keys());

      // 2. Fetch MiniApps belonging to those workspaces
      let appMap = new Map<string, { id: string; name: string; icon?: string; workspace_id: string }>();
      if (activeWsIds.length > 0) {
        const { data: appRows } = await supabase
          .schema('app_private')
          .from('mini_apps')
          .select('id, name, icon, workspace_id, is_preset')
          .eq('organization_id', orgId)
          .in('workspace_id', activeWsIds);

        (appRows || [])
          .filter((a: any) => !a.is_preset)
          .forEach((a: any) => appMap.set(a.id, a));
      }

      const activeAppIds = Array.from(appMap.keys());

      // 3. Fetch all records in active MiniApps and filter to those with `_is_liked: true`
      let likedList: FavoritedRecordItem[] = [];
      if (activeAppIds.length > 0) {
        const { data: recRows } = await supabase
          .schema('app_private')
          .from('mini_app_records')
          .select('id, item_uid, mini_app_id, data, updated_at, created_at')
          .eq('organization_id', orgId)
          .in('mini_app_id', activeAppIds)
          .order('updated_at', { ascending: false });

        (recRows || []).forEach((r: any) => {
          const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
          if (!d._is_liked) return;

          const appInfo = appMap.get(r.mini_app_id);
          if (!appInfo) return;
          const wsInfo = wsMap.get(appInfo.workspace_id);
          if (!wsInfo) return;

          const { title, subtitle } = extractRecordTitleAndSubtitle(d, r.item_uid || r.id);
          likedList.push({
            dbId: r.id,
            itemUid: r.item_uid || r.id,
            title,
            subtitle,
            miniAppId: appInfo.id,
            miniAppName: appInfo.name,
            miniAppIcon: appInfo.icon,
            workspaceId: wsInfo.id,
            workspaceName: wsInfo.name,
            workspaceSlug: wsInfo.slug,
            podioItemId: d._podio_item_id || null,
            rawData: d,
            updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
          });
        });
      }

      setFavoritedRecords(likedList);

      // Default all workspaces and apps with favorited records to expanded
      const nextWsExpanded: Record<string, boolean> = {};
      const nextAppExpanded: Record<string, boolean> = {};
      likedList.forEach(item => {
        nextWsExpanded[item.workspaceId] = true;
        nextAppExpanded[item.miniAppId] = true;
      });
      setExpandedWorkspaces(prev => ({ ...nextWsExpanded, ...prev }));
      setExpandedApps(prev => ({ ...nextAppExpanded, ...prev }));

      // 4. Also load pinned MiniApps for the secondary tab
      if (userId) {
        const { data: appFavs } = await db
          .from('miniapp_favorites')
          .select('*')
          .eq('user_id', userId)
          .order('display_order', { ascending: true });
        if (Array.isArray(appFavs)) setPinnedApps(appFavs);
      }
    } catch (e) {
      console.error('[FavoritesPanel] Error loading favorites:', e);
    } finally {
      setLoading(false);
    }
  }, [orgId, userId]);

  useEffect(() => {
    if (isOpen) {
      loadAllFavorites();
      setTimeout(() => searchRef.current?.focus(), 150);
      // Also poll Podio's Ratings API in the background so any item Liked/Unliked inside Podio syncs immediately!
      if (orgId && userId && userId !== 'anonymous') {
        supabase.functions.invoke('sync-to-podio', {
          body: { action: 'sync_likes', workspaceId: orgId, userId }
        }).then(({ data }) => {
          if (data?.updatedCount > 0) {
            loadAllFavorites();
            window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, loadAllFavorites, orgId, userId]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('favoritesUpdated', loadAllFavorites);
    window.addEventListener('miniapp_records_updated', loadAllFavorites);
    return () => {
      window.removeEventListener('favoritesUpdated', loadAllFavorites);
      window.removeEventListener('miniapp_records_updated', loadAllFavorites);
    };
  }, [isOpen, loadAllFavorites]);

  // Unfavorite a record (and unlike in Podio!)
  const handleUnfavoriteRecord = async (item: FavoritedRecordItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritedRecords(prev => prev.filter(r => r.dbId !== item.dbId));
    try {
      const updatedData = { ...item.rawData, _is_liked: false };
      await supabase
        .schema('app_private')
        .from('mini_app_records')
        .update({ data: updatedData, updated_at: new Date().toISOString() })
        .eq('id', item.dbId);

      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
      window.dispatchEvent(new CustomEvent('miniapp_records_updated'));

      if (item.podioItemId) {
        supabase.functions.invoke('sync-to-podio', {
          body: {
            action: 'toggle_like',
            miniAppId: item.miniAppId,
            recordId: item.dbId,
            podioItemId: item.podioItemId,
            isLiked: false,
            userId,
          }
        }).catch(err => console.warn('[Podio Unlike Sync] Warning:', err));
      }
    } catch (err) {
      console.error('Error unfavoriting record:', err);
      loadAllFavorites();
    }
  };

  // Jump straight to the record's MiniApp and open the Record Detail Modal
  const handleOpenFavoritedRecord = (item: FavoritedRecordItem) => {
    sessionStorage.setItem('acore_open_record_id', item.itemUid || item.dbId);
    window.dispatchEvent(new CustomEvent('focusMiniAppRecord', { detail: { recordId: item.itemUid || item.dbId } }));
    if (onNavigateToMiniApp) {
      onNavigateToMiniApp(item.workspaceSlug, item.miniAppName);
    }
    onClose();
  };

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return favoritedRecords;
    const q = searchQuery.toLowerCase();
    return favoritedRecords.filter(
      r =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.itemUid.toLowerCase().includes(q) ||
        r.miniAppName.toLowerCase().includes(q) ||
        r.workspaceName.toLowerCase().includes(q)
    );
  }, [favoritedRecords, searchQuery]);

  // Group hierarchically: Workspace -> MiniApp -> Records
  const hierarchy = useMemo(() => {
    const wsGroups: Record<
      string,
      {
        workspaceId: string;
        workspaceName: string;
        workspaceSlug: string;
        apps: Record<
          string,
          {
            miniAppId: string;
            miniAppName: string;
            miniAppIcon?: string | null;
            records: FavoritedRecordItem[];
          }
        >;
      }
    > = {};

    filteredRecords.forEach(rec => {
      if (!wsGroups[rec.workspaceId]) {
        wsGroups[rec.workspaceId] = {
          workspaceId: rec.workspaceId,
          workspaceName: rec.workspaceName,
          workspaceSlug: rec.workspaceSlug,
          apps: {},
        };
      }
      if (!wsGroups[rec.workspaceId].apps[rec.miniAppId]) {
        wsGroups[rec.workspaceId].apps[rec.miniAppId] = {
          miniAppId: rec.miniAppId,
          miniAppName: rec.miniAppName,
          miniAppIcon: rec.miniAppIcon,
          records: [],
        };
      }
      wsGroups[rec.workspaceId].apps[rec.miniAppId].records.push(rec);
    });

    return Object.values(wsGroups);
  }, [filteredRecords]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 10010 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Right Slide-Out Side Panel */}
      <div
        className="absolute top-16 right-0 h-[calc(100%-4rem)] w-[420px] max-w-[95vw] bg-black/95 backdrop-blur-xl border-l border-rose-500/35 flex flex-col pointer-events-auto shadow-[-20px_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(244,63,94,0.12)] animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-500/20 bg-gradient-to-r from-rose-950/30 via-black to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-500/15 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <LucideIcons.Star size={20} className="text-amber-400" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                Favorites
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  {favoritedRecords.length}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 font-mono">Synced with Podio Likes</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadAllFavorites}
              className="p-2 text-gray-400 hover:text-rose-300 rounded-lg hover:bg-white/5 transition-colors"
              title="Refresh Favorites"
            >
              <LucideIcons.RefreshCw size={16} className={loading ? 'animate-spin text-rose-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Mode Tabs (Favorited Records vs Pinned MiniApps) */}
        {!FEATURES.IS_LITE_MODE && (
          <div className="flex border-b border-gray-800 flex-shrink-0">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex-1 py-2.5 text-xs font-mono font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'records'
                  ? 'border-rose-400 text-rose-300 bg-rose-500/10'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <LucideIcons.Star size={13} /> Records ({favoritedRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('apps')}
              className={`flex-1 py-2.5 text-xs font-mono font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'apps'
                  ? 'border-rose-400 text-rose-300 bg-rose-500/10'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <StarIcon size={13} /> Pinned Apps ({pinnedApps.length})
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="p-3 border-b border-gray-800/80 flex-shrink-0">
          <div className="relative">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400/60" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search favorited records, apps, workspaces..."
              className="w-full bg-gray-900/90 border border-gray-800 rounded-lg pl-9 pr-8 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500/50 transition-all placeholder-gray-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 space-y-3 darkwave-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-rose-500/30 border-t-rose-400 rounded-full animate-spin" />
              <span className="text-xs font-mono text-gray-500">Loading favorited records...</span>
            </div>
          ) : activeTab === 'records' ? (
            hierarchy.length === 0 ? (
              <div className="text-center py-14 px-4 border border-dashed border-gray-800 rounded-xl bg-gray-950/40">
                <LucideIcons.Star size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-300 font-mono text-sm font-semibold">
                  {searchQuery ? 'No matching favorites found' : 'No favorited records yet'}
                </p>
                <p className="text-gray-500 font-mono text-xs mt-1.5 leading-relaxed">
                  Click the <span className="text-amber-400">★ Star</span> icon on any record in A-CORE or Like an item in Podio — they sync automatically in both directions!
                </p>
              </div>
            ) : (
              hierarchy.map(wsGroup => {
                const wsColor = getColor(wsGroup.workspaceSlug);
                const isWsExpanded = expandedWorkspaces[wsGroup.workspaceId] ?? true;
                const totalWsRecords = Object.values(wsGroup.apps).reduce((sum, a) => sum + a.records.length, 0);

                return (
                  <div
                    key={wsGroup.workspaceId}
                    className="rounded-xl border bg-gray-950/60 overflow-hidden transition-all"
                    style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
                  >
                    {/* LEVEL 1: WORKSPACE HEADER */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWorkspaces(prev => ({
                          ...prev,
                          [wsGroup.workspaceId]: !isWsExpanded,
                        }))
                      }
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-white/5"
                      style={{
                        background: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.14), transparent)`,
                        borderBottom: isWsExpanded ? `1px solid rgba(${wsColor.rgb}, 0.2)` : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: wsColor.primary, boxShadow: `0 0 8px ${wsColor.primary}` }}
                        />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-white truncate">
                          {wsGroup.workspaceName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `rgba(${wsColor.rgb}, 0.15)`,
                            color: wsColor.primary,
                          }}
                        >
                          {totalWsRecords}
                        </span>
                        {isWsExpanded ? (
                          <ChevronDownIcon size={14} className="text-gray-400" />
                        ) : (
                          <ChevronRightIcon size={14} className="text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* LEVEL 2: MINIAPPS WITHIN WORKSPACE */}
                    {isWsExpanded && (
                      <div className="p-2 space-y-2">
                        {Object.values(wsGroup.apps).map(appGroup => {
                          const isAppExpanded = expandedApps[appGroup.miniAppId] ?? true;
                          const AppIcon = getMiniAppIcon(appGroup.miniAppName);

                          return (
                            <div
                              key={appGroup.miniAppId}
                              className="rounded-lg border border-gray-800/90 bg-black/60 overflow-hidden"
                            >
                              <div className="flex items-center justify-between px-3 py-2 bg-gray-900/50 border-b border-gray-800/60">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedApps(prev => ({
                                      ...prev,
                                      [appGroup.miniAppId]: !isAppExpanded,
                                    }))
                                  }
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                >
                                  <AppIcon size={14} style={{ color: wsColor.primary }} />
                                  <span className="text-xs font-mono font-semibold text-gray-200 truncate">
                                    {appGroup.miniAppName}
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-500">
                                    ({appGroup.records.length})
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onNavigateToMiniApp) {
                                      onNavigateToMiniApp(wsGroup.workspaceSlug, appGroup.miniAppName);
                                      onClose();
                                    }
                                  }}
                                  className="text-[10px] font-mono text-gray-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5"
                                  title={`Open ${appGroup.miniAppName}`}
                                >
                                  <span>Open App</span>
                                  <ExternalLinkIcon size={10} />
                                </button>
                              </div>

                              {/* LEVEL 3: FAVORITED RECORDS INSIDE MINIAPP */}
                              {isAppExpanded && (
                                <div className="divide-y divide-gray-800/50">
                                  {appGroup.records.map(rec => (
                                    <div
                                      key={rec.dbId}
                                      onClick={() => handleOpenFavoritedRecord(rec)}
                                      className="flex items-center justify-between gap-2.5 px-3 py-2.5 hover:bg-rose-500/10 cursor-pointer group transition-colors"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-mono font-bold text-white group-hover:text-rose-300 truncate transition-colors">
                                            {rec.title}
                                          </p>
                                          {rec.podioItemId && (
                                            <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                                              Podio
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] font-mono text-gray-500 truncate mt-0.5">
                                          {rec.subtitle}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={e => handleUnfavoriteRecord(rec, e)}
                                          className="p-1.5 rounded-lg text-amber-400 hover:text-gray-400 hover:bg-amber-500/15 transition-colors"
                                          title="Remove from Favorites (Unlikes in Podio)"
                                        >
                                          <LucideIcons.Star size={14} fill="currentColor" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* Secondary Tab for Full Mode: Pinned MiniApps */
            pinnedApps.length === 0 ? (
              <div className="text-center py-12">
                <StarIcon size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-mono text-sm">No pinned MiniApps yet</p>
              </div>
            ) : (
              pinnedApps.map(fav => {
                const wsColor = getColor(fav.workspace_slug);
                const AppIcon = getMiniAppIcon(fav.app_name);
                const wsName = (WORKSPACE_DEFINITIONS as any)[fav.workspace_slug]?.name || fav.workspace_slug;
                return (
                  <div
                    key={fav.id}
                    onClick={() => {
                      if (onNavigateToMiniApp) onNavigateToMiniApp(fav.workspace_slug, fav.app_name);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-800 hover:border-rose-500/40 bg-gray-900/50 cursor-pointer transition-all"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        border: `1.5px solid rgba(${wsColor.rgb}, 0.4)`,
                        background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.12), rgba(0,0,0,0.9))`,
                      }}
                    >
                      <AppIcon size={16} style={{ color: wsColor.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono text-sm font-medium truncate">{fav.app_name}</p>
                      <p className="text-xs font-mono truncate" style={{ color: wsColor.primary }}>{wsName}</p>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FavoritesPanel;