import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  subscribeSyncState,
  triggerSync,
  queueTileChange,
  markAllSaved,
  clearPendingChanges,
  type OfflineSyncState,
  type SyncConflict,
} from '@/lib/dashboardOfflineSync';

import { useToast } from '@/hooks/use-toast';


import { 
  TaskIcon, 
  CalendarIcon, 
  MessageIcon, 
  TrendingUpIcon,
  ClockIcon,
  ActivityIcon,
  ServerIcon,
  UsersIcon,
  PlusIcon,
  CloseIcon,
  ExternalLinkIcon,
  CloudIcon,
  RefreshIcon
} from '@/components/icons/Icons';
import { OrganizationUser, PlatformUser } from '@/types';
import ResizableTile from '@/components/dashboard/ResizableTile';
import QuantumVisualization from '@/components/dashboard/QuantumVisualization';
import NewsFeedWidget from '@/components/dashboard/NewsFeedWidget';
import AddTileButton from '@/components/dashboard/AddTileButton';
import WidgetLibraryPanel from '@/components/dashboard/WidgetLibraryPanel';
import AddWidgetHub from '@/components/dashboard/AddWidgetHub';
import LayoutTemplatesModal, { generatePreviewSvg } from '@/components/dashboard/LayoutTemplatesModal';

import SyncConflictModal from '@/components/dashboard/SyncConflictModal';

import { compactLayout, type SnapLine, type TileRect } from '@/lib/spatialHashGrid';


import SecurityOverviewDashboard from '@/components/security/SecurityOverviewDashboard';
import ThreatGeoHeatmap from '@/components/security/ThreatGeoHeatmap';
import LiveIPFeed from '@/components/security/LiveIPFeed';
import LocalNetworkPanel from '@/components/security/LocalNetworkPanel';
import type { CatalogWidget, LayoutTemplate } from '@/lib/widgetCatalog';
import CustomWidgetWizard, { type CustomWidgetDefinition } from '@/components/dashboard/CustomWidgetWizard';
import PinnedReportsStrip from '@/components/toolbar/PinnedReportsStrip';



// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.FC<{ className?: string; size?: number }>;
  glowColor: 'theme-primary' | 'magenta' | 'green' | 'theme-accent' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon, glowColor }) => {
  const glowClasses: Record<string, string> = {
    'theme-primary': 'border-theme-primary-500/30 bg-gradient-to-br from-theme-primary-950/30 to-black hover:border-theme-primary-500/50',
    magenta: 'border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/30 to-black hover:border-fuchsia-500/50',
    green: 'border-green-500/30 bg-gradient-to-br from-green-950/30 to-black hover:border-green-500/50',
    'theme-accent': 'border-theme-accent-500/30 bg-gradient-to-br from-theme-accent-950/30 to-black hover:border-theme-accent-500/50',
    orange: 'border-orange-500/30 bg-gradient-to-br from-orange-950/30 to-black hover:border-orange-500/50',
  };
  const iconClasses: Record<string, string> = {
    'theme-primary': 'text-theme-primary-400 bg-theme-primary-500/20 border-theme-primary-500/40',
    magenta: 'text-fuchsia-400 bg-fuchsia-500/20 border-fuchsia-500/40',
    green: 'text-green-400 bg-green-500/20 border-green-500/40',
    'theme-accent': 'text-theme-accent-400 bg-theme-accent-500/20 border-theme-accent-500/40',
    orange: 'text-orange-400 bg-orange-500/20 border-orange-500/40',
  };
  const textClasses: Record<string, string> = {
    'theme-primary': 'text-theme-primary-400', magenta: 'text-fuchsia-400', green: 'text-green-400', 'theme-accent': 'text-theme-accent-400', orange: 'text-orange-400',
  };
  return (
    <div className={`relative rounded-xl border p-4 transition-all ${glowClasses[glowColor]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm font-mono uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${textClasses[glowColor]}`}>{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-mono ${changeType === 'positive' ? 'text-green-400' : changeType === 'negative' ? 'text-red-400' : 'text-gray-500'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${iconClasses[glowColor]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

// ============================================
// INTERFACES
// ============================================

type TileGlowColor = 'theme-primary' | 'magenta' | 'green' | 'theme-accent' | 'orange' | 'red';

interface TileConfig {
  id: string;
  widgetId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  glowColor: TileGlowColor;
}

interface DashboardTab {
  id: string;
  name: string;
  tiles: TileConfig[];
  isDefault?: boolean;
  accentColor?: string;
}

interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string; size?: number }>;
  glowColor: TileGlowColor;
  minWidth: number;
  minHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  requiresAdmin?: boolean;
}

// ============================================
// WIDGET DEFINITIONS
// ============================================

const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  { id: 'tasks', name: 'My Tasks', description: 'View and manage your tasks', icon: TaskIcon, glowColor: 'theme-primary', minWidth: 300, minHeight: 200, defaultWidth: 500, defaultHeight: 280 },
  { id: 'quick-actions', name: 'Quick Actions', description: 'Common actions at your fingertips', icon: ActivityIcon, glowColor: 'magenta', minWidth: 200, minHeight: 150, defaultWidth: 300, defaultHeight: 220 },
  { id: 'activity', name: 'Activity Feed', description: 'Recent activity and updates', icon: TrendingUpIcon, glowColor: 'green', minWidth: 250, minHeight: 150, defaultWidth: 300, defaultHeight: 200 },
  { id: 'calendar-preview', name: 'Upcoming Events', description: 'Calendar events preview', icon: CalendarIcon, glowColor: 'theme-accent', minWidth: 250, minHeight: 150, defaultWidth: 350, defaultHeight: 180 },
  { id: 'messages-preview', name: 'Recent Messages', description: 'Latest messages and notifications', icon: MessageIcon, glowColor: 'orange', minWidth: 250, minHeight: 150, defaultWidth: 350, defaultHeight: 180 },
  { id: 'system-health', name: 'System Health', description: 'Server uptime, CPU, memory, disk usage', icon: ServerIcon, glowColor: 'theme-primary', minWidth: 350, minHeight: 250, defaultWidth: 500, defaultHeight: 300, requiresAdmin: true },
  { id: 'security-overview', name: 'Security Overview', description: 'Threat alerts, firewall status, recent incidents', icon: ActivityIcon, glowColor: 'red', minWidth: 350, minHeight: 250, defaultWidth: 500, defaultHeight: 300, requiresAdmin: true },
  { id: 'user-stats', name: 'User Statistics', description: 'Active users, signups, session analytics', icon: UsersIcon, glowColor: 'theme-accent', minWidth: 300, minHeight: 200, defaultWidth: 450, defaultHeight: 280, requiresAdmin: true },
  { id: 'team-management', name: 'Team Management', description: 'Team members, roles, and permissions overview', icon: UsersIcon, glowColor: 'theme-primary', minWidth: 350, minHeight: 250, defaultWidth: 500, defaultHeight: 300 },
  { id: 'reports', name: 'Reports', description: 'Weekly summaries and performance metrics', icon: TrendingUpIcon, glowColor: 'green', minWidth: 300, minHeight: 200, defaultWidth: 450, defaultHeight: 280 },
  { id: 'quantum-visualization', name: 'Quantum Visualization', description: 'Qiskit Runtime Bloch Sphere', icon: ActivityIcon, glowColor: 'theme-accent', minWidth: 400, minHeight: 400, defaultWidth: 700, defaultHeight: 500, requiresAdmin: true },
  { id: 'news-feed', name: 'Live News Feed', description: 'Real-time news articles', icon: ExternalLinkIcon, glowColor: 'theme-primary', minWidth: 400, minHeight: 350, defaultWidth: 550, defaultHeight: 450, requiresAdmin: true },
];

// ============================================
// ROLE-BASED DEFAULT TILE CONFIGURATIONS
// ============================================

type UserRoleCategory = 'platform_owner' | 'platform_tech_admin' | 'platform_support_admin' | 'platform_sales_admin' |
  'platform_tech_manager' | 'platform_support_manager' | 'platform_sales_manager' |
  'org_admin' | 'org_manager' | 'org_user' | 'default';

const getRoleDefaultTiles = (roleCategory: UserRoleCategory, containerWidth: number = 1248): TileConfig[] => {
  const GAP = 10;
  
  // Dynamically calculate our fractions based on the actual screen/container width
  const w2 = Math.floor((containerWidth - GAP) / 2); // Half width
  const w3 = Math.floor((containerWidth - GAP * 2) / 3); // Third width

  switch (roleCategory) {
    case 'platform_owner':
      return [
        // Top Row: 2 Tiles (1/2 width each). The second tile takes up whatever pixels remain.
        { id: 'sys-health-1', widgetId: 'system-health', title: 'System Health', position: { x: 0, y: 0 }, size: { width: w2, height: 300 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: 'security-1', widgetId: 'security-overview', title: 'Security Overview', position: { x: w2 + GAP, y: 0 }, size: { width: containerWidth - w2 - GAP, height: 300 }, zIndex: 2, glowColor: 'red' },
        
        // Bottom Row: 3 Tiles (1/3 width each). The last tile takes up whatever pixels remain.
        { id: 'user-stats-1', widgetId: 'user-stats', title: 'User Statistics', position: { x: 0, y: 310 }, size: { width: w3, height: 280 }, zIndex: 3, glowColor: 'theme-accent' },
        { id: 'activity-1', widgetId: 'activity', title: 'Activity', position: { x: w3 + GAP, y: 310 }, size: { width: w3, height: 280 }, zIndex: 4, glowColor: 'green' },
        { id: 'quick-actions-1', widgetId: 'quick-actions', title: 'Quick Actions', position: { x: (w3 * 2) + (GAP * 2), y: 310 }, size: { width: containerWidth - (w3 * 2) - (GAP * 2), height: 280 }, zIndex: 5, glowColor: 'magenta' },
      ];
    case 'platform_tech_admin':
      return [
        { id: 'sys-health-1', widgetId: 'system-health', title: 'System Health', position: { x: 0, y: 0 }, size: { width: 500, height: 300 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: 'security-1', widgetId: 'security-overview', title: 'Security Overview', position: { x: 540, y: 0 }, size: { width: 500, height: 300 }, zIndex: 2, glowColor: 'red' },
        { id: 'activity-1', widgetId: 'activity', title: 'Activity', position: { x: 0, y: 320 }, size: { width: 300, height: 200 }, zIndex: 3, glowColor: 'green' },
        { id: 'tasks-1', widgetId: 'tasks', title: 'My Tasks', position: { x: 340, y: 320 }, size: { width: 500, height: 280 }, zIndex: 4, glowColor: 'theme-primary' },
      ];
    case 'platform_support_admin':
    case 'platform_sales_admin':
      return [
        { id: 'user-stats-1', widgetId: 'user-stats', title: 'User Statistics', position: { x: 0, y: 0 }, size: { width: 450, height: 280 }, zIndex: 1, glowColor: 'theme-accent' },
        { id: 'tasks-1', widgetId: 'tasks', title: 'My Tasks', position: { x: 490, y: 0 }, size: { width: 500, height: 280 }, zIndex: 2, glowColor: 'theme-primary' },
        { id: 'activity-1', widgetId: 'activity', title: 'Activity', position: { x: 0, y: 300 }, size: { width: 300, height: 200 }, zIndex: 3, glowColor: 'green' },
        { id: 'messages-preview-1', widgetId: 'messages-preview', title: 'Recent Messages', position: { x: 340, y: 300 }, size: { width: 350, height: 180 }, zIndex: 4, glowColor: 'orange' },
      ];
    case 'platform_tech_manager':
    case 'platform_support_manager':
    case 'platform_sales_manager':
      return [
        { id: 'tasks-1', widgetId: 'tasks', title: 'My Tasks', position: { x: 0, y: 0 }, size: { width: 500, height: 280 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: 'team-mgmt-1', widgetId: 'team-management', title: 'Team Management', position: { x: 540, y: 0 }, size: { width: 500, height: 300 }, zIndex: 2, glowColor: 'theme-primary' },
        { id: 'activity-1', widgetId: 'activity', title: 'Activity', position: { x: 0, y: 300 }, size: { width: 300, height: 200 }, zIndex: 3, glowColor: 'green' },
        { id: 'messages-preview-1', widgetId: 'messages-preview', title: 'Recent Messages', position: { x: 340, y: 300 }, size: { width: 350, height: 180 }, zIndex: 4, glowColor: 'orange' },
      ];
    case 'org_admin':
      return [
        { id: 'team-mgmt-1', widgetId: 'team-management', title: 'Team Management', position: { x: 0, y: 0 }, size: { width: 500, height: 300 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: 'activity-1', widgetId: 'activity', title: 'Activity', position: { x: 540, y: 0 }, size: { width: 300, height: 200 }, zIndex: 2, glowColor: 'green' },
        { id: 'reports-1', widgetId: 'reports', title: 'Reports', position: { x: 540, y: 220 }, size: { width: 450, height: 280 }, zIndex: 3, glowColor: 'green' },
        { id: 'tasks-1', widgetId: 'tasks', title: 'My Tasks', position: { x: 0, y: 320 }, size: { width: 500, height: 280 }, zIndex: 4, glowColor: 'theme-primary' },
        { id: 'messages-preview-1', widgetId: 'messages-preview', title: 'Recent Messages', position: { x: 0, y: 620 }, size: { width: 350, height: 180 }, zIndex: 5, glowColor: 'orange' },
      ];
    case 'org_manager':
      return [
        { id: 'tasks-1', widgetId: 'tasks', title: 'My Tasks', position: { x: 0, y: 0 }, size: { width: 500, height: 280 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: 'team-mgmt-1', widgetId: 'team-management', title: 'Team Management', position: { x: 540, y: 0 }, size: { width: 500, height: 300 }, zIndex: 2, glowColor: 'theme-primary' },
        { id: 'activity-1', widgetId: 'activity', title: 'Activity', position: { x: 0, y: 300 }, size: { width: 300, height: 200 }, zIndex: 3, glowColor: 'green' },
        { id: 'calendar-preview-1', widgetId: 'calendar-preview', title: 'Upcoming Events', position: { x: 340, y: 300 }, size: { width: 350, height: 180 }, zIndex: 4, glowColor: 'theme-accent' },
      ];
    case 'org_user':
      return [
        { id: 'tasks-1', widgetId: 'tasks', title: 'My Tasks', position: { x: 0, y: 0 }, size: { width: 500, height: 280 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: 'calendar-preview-1', widgetId: 'calendar-preview', title: 'Upcoming Events', position: { x: 540, y: 0 }, size: { width: 350, height: 180 }, zIndex: 2, glowColor: 'theme-accent' },
        { id: 'messages-preview-1', widgetId: 'messages-preview', title: 'Recent Messages', position: { x: 540, y: 200 }, size: { width: 350, height: 180 }, zIndex: 3, glowColor: 'orange' },
        { id: 'quick-actions-1', widgetId: 'quick-actions', title: 'Quick Actions', position: { x: 0, y: 300 }, size: { width: 300, height: 220 }, zIndex: 4, glowColor: 'magenta' },
      ];
    default:
      return [
        { id: 'tasks-1', widgetId: 'tasks', title: 'My Tasks', position: { x: 0, y: 0 }, size: { width: 500, height: 280 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: 'quick-actions-1', widgetId: 'quick-actions', title: 'Quick Actions', position: { x: 540, y: 0 }, size: { width: 300, height: 220 }, zIndex: 2, glowColor: 'magenta' },
        { id: 'activity-1', widgetId: 'activity', title: 'Activity', position: { x: 540, y: 240 }, size: { width: 300, height: 200 }, zIndex: 3, glowColor: 'green' },
        { id: 'calendar-preview-1', widgetId: 'calendar-preview', title: 'Upcoming Events', position: { x: 0, y: 300 }, size: { width: 340, height: 180 }, zIndex: 4, glowColor: 'theme-accent' },
        { id: 'messages-preview-1', widgetId: 'messages-preview', title: 'Recent Messages', position: { x: 380, y: 300 }, size: { width: 340, height: 180 }, zIndex: 5, glowColor: 'orange' },
      ];
  }
};

// ============================================
// LOCALSTORAGE CACHE HELPERS
// ============================================

const CACHE_VERSION = 'v1';
let CURRENT_ORG_ID: string | null = null;

const getCacheKey = (userId: string, tabId: string): string =>
  `dashboard_tiles_${userId}_${CURRENT_ORG_ID || 'platform'}_${tabId}_${CACHE_VERSION}`;

const getTabsCacheKey = (userId: string): string =>
  `dashboard_tabs_${userId}_${CURRENT_ORG_ID || 'platform'}_${CACHE_VERSION}`;

const saveTilesToCache = (userId: string, tabs: DashboardTab[], activeTabId: string, customWidgets: CustomWidgetDefinition[], refreshInterval: number): void => {
  try {
    const cacheData = {
      tabs: tabs.map(tab => ({ ...tab, tiles: tab.tiles.map(serializeTile) })),
      activeTabId,
      customWidgets,
      refreshInterval,
      cachedAt: Date.now(),
    };
    localStorage.setItem(getTabsCacheKey(userId), JSON.stringify(cacheData));
    // Also save per-tab cache for quick individual tab loads
    for (const tab of tabs) {
      localStorage.setItem(getCacheKey(userId, tab.id), JSON.stringify(tab.tiles.map(serializeTile)));
    }
  } catch (e) {
    console.warn('[Dashboard Cache] Failed to save to localStorage:', e);
  }
};

const loadTilesFromCache = (userId: string): { tabs: DashboardTab[]; activeTabId: string; customWidgets: CustomWidgetDefinition[]; refreshInterval: number; cachedAt: number } | null => {
  try {
    const raw = localStorage.getItem(getTabsCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tabs || !Array.isArray(parsed.tabs)) return null;
    // Only use cache if it's less than 24 hours old
    if (parsed.cachedAt && Date.now() - parsed.cachedAt > 24 * 60 * 60 * 1000) return null;
    return {
      tabs: parsed.tabs.map((t: any) => ({
        id: t.id,
        name: t.name,
        tiles: Array.isArray(t.tiles) ? t.tiles : [],
        isDefault: t.isDefault,
        accentColor: t.accentColor || 'theme-primary',
      })),

      activeTabId: parsed.activeTabId || 'main',
      customWidgets: parsed.customWidgets || [],
      refreshInterval: parsed.refreshInterval || 60,
      cachedAt: parsed.cachedAt || 0,
    };
  } catch (e) {
    console.warn('[Dashboard Cache] Failed to load from localStorage:', e);
    return null;
  }
};

const clearTilesCache = (userId: string): void => {
  try {
    const tabsKey = getTabsCacheKey(userId);
    const raw = localStorage.getItem(tabsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.tabs) {
        for (const tab of parsed.tabs) {
          localStorage.removeItem(getCacheKey(userId, tab.id));
        }
      }
    }
    localStorage.removeItem(tabsKey);
  } catch (e) { /* silent */ }
};

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_TILES: TileConfig[] = getRoleDefaultTiles('default', 1248);

const DEFAULT_TABS: DashboardTab[] = [{ id: 'main', name: 'Main Dashboard', isDefault: true, tiles: DEFAULT_TILES }];

const REFRESH_INTERVAL_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
  { value: 0, label: 'Manual' },
];

const serializeTile = (tile: TileConfig): object => ({
  id: String(tile.id || ''),
  widgetId: String(tile.widgetId || ''),
  title: String(tile.title || ''),
  position: { x: Math.round(Number(tile.position?.x) || 0), y: Math.round(Number(tile.position?.y) || 0) },
  size: { width: Math.round(Number(tile.size?.width) || 200), height: Math.round(Number(tile.size?.height) || 150) },
  zIndex: Math.round(Number(tile.zIndex) || 1),
  glowColor: String(tile.glowColor || 'theme-primary')
});


// ============================================
// CUSTOM WIDGET RENDERERS
// ============================================

const CustomCounterWidget: React.FC<{ widget: CustomWidgetDefinition }> = ({ widget }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Simulate data
    const val = widget.dataSource === 'tasks' ? 42 : widget.dataSource === 'messages' ? 18 : widget.dataSource === 'calendar' ? 7 : 156;
    setCount(val);
  }, [widget.dataSource]);
  const colorMap: Record<string, string> = { 'theme-primary': 'text-theme-primary-400', magenta: 'text-fuchsia-400', green: 'text-green-400', 'theme-accent': 'text-theme-accent-400', orange: 'text-orange-400' };
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-2">{widget.name}</p>
      <p className={`text-5xl font-bold font-mono ${colorMap[widget.glowColor] || 'text-theme-primary-400'}`}>{count}</p>
      <p className="text-gray-600 text-[10px] font-mono mt-2">Source: {widget.dataSource}</p>
    </div>
  );
};

const CustomListWidget: React.FC<{ widget: CustomWidgetDefinition }> = ({ widget }) => {
  const items = useMemo(() => {
    if (widget.dataSource === 'tasks') return ['Review Q4 budget', 'Update handbook', 'Client meeting prep', 'Deploy v2.1', 'Security audit'];
    if (widget.dataSource === 'messages') return ['Sarah: Project update', 'Mike: Meeting notes', 'Team: Sprint review', 'Alex: Bug report'];
    if (widget.dataSource === 'calendar') return ['Team Standup 10:00', 'Client Review 2:00', 'Sprint Planning 4:00'];
    return ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
  }, [widget.dataSource]);
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 font-mono">{widget.name}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className={`w-1.5 h-1.5 rounded-full bg-${widget.glowColor === 'magenta' ? 'fuchsia' : widget.glowColor}-400`} />
            <span className="text-xs text-gray-300 font-mono">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomChartWidget: React.FC<{ widget: CustomWidgetDefinition }> = ({ widget }) => {
  const bars = useMemo(() => [65, 80, 45, 90, 55, 70, 85], []);
  const colorMap: Record<string, string> = { 'theme-primary': 'bg-theme-primary-500', magenta: 'bg-fuchsia-500', green: 'bg-green-500', 'theme-accent': 'bg-theme-accent-500', orange: 'bg-orange-500' };
  const barColor = colorMap[widget.glowColor] || 'bg-theme-primary-500';
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 font-mono">{widget.name}</h3>
      <div className="flex items-end gap-2 h-32">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full rounded-t ${barColor}/70`} style={{ height: `${h}%` }} />
            <span className="text-[8px] text-gray-600 font-mono">{['M','T','W','T','F','S','S'][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomTableWidget: React.FC<{ widget: CustomWidgetDefinition }> = ({ widget }) => {
  const rows = useMemo(() => {
    if (widget.dataSource === 'tasks') return [['Review budget','High','Today'],['Update docs','Medium','Tomorrow'],['Deploy v2','Urgent','Jan 30']];
    if (widget.dataSource === 'messages') return [['Sarah Chen','Project Update','10m ago'],['Mike J.','Meeting Notes','1h ago']];
    return [['Row 1','Col A','Col B'],['Row 2','Col A','Col B'],['Row 3','Col A','Col B']];
  }, [widget.dataSource]);
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 font-mono">{widget.name}</h3>
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-gray-900/80 border-b border-gray-800">
              <th className="text-left px-3 py-2 text-gray-500">Name</th>
              <th className="text-left px-3 py-2 text-gray-500">Status</th>
              <th className="text-left px-3 py-2 text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// PERSONAL DASHBOARD COMPONENT
// ============================================

const PersonalDashboard: React.FC = () => {
  const { user, userType, organization, isPlatformOwner, isPlatformUser, isOrganizationAdmin, isOrganizationManager, isPlatformTechAdmin, isPlatformSupportAdmin, isPlatformSalesAdmin, isPlatformManager, getUserRole } = useAuth();
  const isOrgUser = userType === 'organization';
  
  CURRENT_ORG_ID = organization?.id || null;

  // --- NEW: Dynamic Theme Colors for Scrollbars & Badges ---
  const primaryColor = organization?.primary_color || '#06b6d4';
  const accentColor = organization?.accent_color || '#10b981'; // Default to emerald if not set

  const primaryRgb = useMemo(() => {
    const c = primaryColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  }, [primaryColor]);

  const accentRgb = useMemo(() => {
    const c = accentColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  }, [accentColor]);


  // Determine user's role category for default tiles
  const getUserRoleCategory = useCallback((): UserRoleCategory => {
    if (isPlatformOwner()) return 'platform_owner';
    if (isPlatformTechAdmin()) return 'platform_tech_admin';
    if (isPlatformSupportAdmin()) return 'platform_support_admin';
    if (isPlatformSalesAdmin()) return 'platform_sales_admin';
    if (isPlatformManager()) {
      const role = getUserRole();
      if (role === 'platform_tech_manager') return 'platform_tech_manager';
      if (role === 'platform_support_manager') return 'platform_support_manager';
      if (role === 'platform_sales_manager') return 'platform_sales_manager';
      return 'platform_tech_manager';
    }
    const role = getUserRole ? getUserRole() : null;
    if (isOrganizationAdmin() || role === 'organization_admin_user') return 'org_admin';
    if (isOrganizationManager()) return 'org_manager';
    if (userType === 'organization') return 'org_user';
    return 'default';
  }, [isPlatformOwner, isPlatformTechAdmin, isPlatformSupportAdmin, isPlatformSalesAdmin, isPlatformManager, isOrganizationAdmin, isOrganizationManager, getUserRole, userType]);

  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidthRef = useRef<number>(0);
  const resizeStartRef = useRef<{ width: number, tabs: DashboardTab[] } | null>(null);
  const isResizingWindowRef = useRef(false); // ⚡ Tracks if a window resize is actively happening

  // ⚡ Auto-scale tiles to maintain proportions on window resize
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
    // Use the container's exact rendered width, fallback to window width minus the px-4 padding
    const newWidth = containerRef.current?.clientWidth || (window.innerWidth - 32); 
    if (newWidth <= 0) return;

      if (containerWidthRef.current === 0) {
        containerWidthRef.current = newWidth;
        return;
      }

      // Ignore tiny sub-pixel jitters
      if (Math.abs(newWidth - containerWidthRef.current) < 5) return;

      clearTimeout(timeoutId);
      isResizingWindowRef.current = true; // ⚡ Block DB auto-saves during the drag!
      
      setDashboardTabs(prevTabs => {
        // Anchor to the original layout when the resize began to stop compounding errors
        if (!resizeStartRef.current) {
          resizeStartRef.current = { width: containerWidthRef.current, tabs: prevTabs };
        }
        
        const baseline = resizeStartRef.current;
        const scale = newWidth / baseline.width;

        return baseline.tabs.map(tab => ({
          ...tab,
          tiles: tab.tiles.map(tile => {
            // ⚡ Proportional Scale: This allows shrinking AND growing accurately!
            const exactX = tile.position.x * scale;
            const exactW = tile.size.width * scale;

            return {
              ...tile,
              position: { ...tile.position, x: Math.round(exactX) },
              size: { ...tile.size, width: Math.max(150, Math.round(exactW)) }
            };
          })
        }));
      });

      containerWidthRef.current = newWidth;

      // Clear the baseline anchor and unblock DB saving when the user stops dragging
      timeoutId = setTimeout(() => {
        resizeStartRef.current = null;
        isResizingWindowRef.current = false;
        // ⚡ FIX: Manually trigger the save, because changing a ref won't wake up the auto-saver useEffect
        saveDashboardConfigs();
      }, 500);
    };

    window.addEventListener('resize', handleResize);
    
    // Initialize on mount
    if (containerWidthRef.current === 0) {
      containerWidthRef.current = containerRef.current?.clientWidth || (window.innerWidth - 32);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const [maxZIndex, setMaxZIndex] = useState(10);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showLayoutTemplates, setShowLayoutTemplates] = useState(false);
  const [showCustomWizard, setShowCustomWizard] = useState(false);

  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [selectedTabTemplate, setSelectedTabTemplate] = useState<string | null>(null);

  const [draggingTab, setDraggingTab] = useState<string | null>(null);
  const [fullScreenTileId, setFullScreenTileId] = useState<string | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [showSyncDropdown, setShowSyncDropdown] = useState(false);

  // Cross-tab tile drag state
  const [crossTabDragTileId, setCrossTabDragTileId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // Tab reorder drag state
  const [tabReorderDragId, setTabReorderDragId] = useState<string | null>(null);
  const [tabReorderInsertIndex, setTabReorderInsertIndex] = useState<number | null>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Tab accent color context menu state
  // Tab accent color settings popup state
  const [tabSettingsPopup, setTabSettingsPopup] = useState<{ tabId: string; x: number; y: number } | null>(null);
  // Tab fullscreen mode
  const [fullScreenTabMode, setFullScreenTabMode] = useState(false);

  // Inline tab renaming state
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);


  // Snap-to-grid state
  const [snapToGridEnabled, setSnapToGridEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('dashboard_snap_to_grid') === 'true'; } catch { return false; }
  });
  const [snapGridSize, setSnapGridSize] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('dashboard_snap_grid_size') || '20', 10) || 20; } catch { return 20; }
  });




  // HTML5 drag-and-drop reorder state
  const [reorderDragTileId, setReorderDragTileId] = useState<string | null>(null);
  const [reorderDropTargetIds, setReorderDropTargetIds] = useState<string[]>([]);
  const [previewLayout, setPreviewLayout] = useState<Record<string, { x: number; y: number; width: number; height: number }> | null>(null);

  // Overlap detection & snap lines state
  const [overlappedTileIds, setOverlappedTileIds] = useState<Set<string>>(new Set());
  const [activeSnapLines, setActiveSnapLines] = useState<SnapLine[]>([]);


  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const activeLayoutOrgRef = useRef<string | null | undefined>(undefined);

  const [dashboardTabs, setDashboardTabs] = useState<DashboardTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState('main');

  // Custom widgets state
  const [customWidgets, setCustomWidgets] = useState<CustomWidgetDefinition[]>([]);

  // Refresh controls state
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [tileRefreshStates, setTileRefreshStates] = useState<Record<string, { isRefreshing: boolean; lastRefreshed: Date | null }>>({});
  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ⚡ FIX: Use a ref to guarantee save functions always capture the absolute latest state
  // without triggering stale closures in setTimeouts or stale dependency loops.
  const latestStateRef = useRef({ dashboardTabs, activeTabId, customWidgets, refreshInterval });
  latestStateRef.current = { dashboardTabs, activeTabId, customWidgets, refreshInterval };

  // Export/Import state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Publish template state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishName, setPublishName] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishTags, setPublishTags] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);


  // Pinned widgets state
  const [pinnedWidgets, setPinnedWidgets] = useState<any[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);

  // Library added widget IDs (tracks which catalog widgets have been added)
  const [libraryAddedIds, setLibraryAddedIds] = useState<string[]>([]);

  const userId = user ? (user as any).id || null : null;
  const userRoleStr = getUserRole ? getUserRole() : null;
  const canDeleteTiles = isPlatformOwner() || isOrganizationAdmin() || userRoleStr === 'organization_admin_user';

  // ─── Offline Sync State ─────────────────────────────────
  const [offlineSyncState, setOfflineSyncState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastSyncResult: null,
    unsavedTileIds: new Set(),
    pendingTabIds: new Set(),
    errors: [],
    conflicts: [],
  });

  // Active conflict for the SyncConflictModal
  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setOfflineSyncState(state);
      // Auto-show conflict modal when new conflicts arrive
      if (state.conflicts.length > 0 && !activeConflict) {
        setActiveConflict(state.conflicts[0]);
      }
    });
    return unsubscribe;
  }, [activeConflict]);

  const handleSyncNow = useCallback(async () => {
    if (offlineSyncState.isSyncing) return;
    const result = await triggerSync(userId || undefined);
    if (result.synced > 0) {
      setLastSaved(new Date());
      setSaveError(null);
    }
  }, [offlineSyncState.isSyncing, userId]);

  // ─── Auto-sync on connectivity restored ─────────────────
  useEffect(() => {
    const handleOnline = () => {
      toast({ title: 'Back Online', description: 'Syncing pending changes in 2 seconds...' });
      const timer = setTimeout(() => {
        handleSyncNow();
      }, 2000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [handleSyncNow, toast]);

  // ─── Conflict resolution handler ────────────────────────
  const handleConflictResolved = useCallback((resolvedTiles: any[], resolvedWidgets: any[], resolvedRefreshInterval: number) => {
    if (!activeConflict) return;
    // Apply resolved tiles to the matching tab
    setDashboardTabs(prev => prev.map(tab =>
      tab.id !== activeConflict.tabId ? tab : { ...tab, tiles: resolvedTiles }
    ));
    if (resolvedWidgets.length > 0) setCustomWidgets(resolvedWidgets);
    if (resolvedRefreshInterval) setRefreshInterval(resolvedRefreshInterval);
    setActiveConflict(null);
    // Show next conflict if any
    const remaining = offlineSyncState.conflicts.filter(c => c.id !== activeConflict.id);
    if (remaining.length > 0) setActiveConflict(remaining[0]);
  }, [activeConflict, offlineSyncState.conflicts]);

  const handleConflictDismiss = useCallback(() => {
    if (!activeConflict) return;
    const remaining = offlineSyncState.conflicts.filter(c => c.id !== activeConflict.id);
    setActiveConflict(remaining.length > 0 ? remaining[0] : null);
  }, [activeConflict, offlineSyncState.conflicts]);



  // Load pinned widgets
  const loadPinnedWidgets = useCallback(async () => {
    if (!userId) return;
    setPinnedLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'get_pinned_widgets', user_id: userId }
      });
      
      if (!error && data?.success && data.widgets) {
        setPinnedWidgets(data.widgets);
      }
    } catch (e) { 
      console.warn('[Dashboard] Failed to load pinned widgets:', e);
    } finally {
      // Placing this in a finally block guarantees the spinner goes away
      // even if the edge function crashes or times out.
      setPinnedLoading(false);
    }
  }, [userId]);

  const handleUnpinWidget = async (widgetId: string) => {
    try {
      const { data } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'unpin_widget', id: widgetId }
      });
      if (data?.success) {
        setPinnedWidgets(prev => prev.filter(w => w.id !== widgetId));
      }
    } catch (e) { /* silent */ }
  };

  // Load dashboard configs - localStorage first, then server sync
  const loadDashboardConfigs = useCallback(async () => {
    const currentOrg = organization?.id || null;
    
    // ⚡ FIX: Abort if we already loaded THIS organization's layout
    if (!userId || (!isInitialLoadRef.current && activeLayoutOrgRef.current === currentOrg)) { 
      setIsLoading(false); 
      return; 
    }

    setIsLoading(true);

    // 1) Try loading from localStorage cache first (instant)
    const cached = loadTilesFromCache(userId);
    let hasValidCache = false;
    if (cached && cached.tabs.length > 0) {
      console.log('[Dashboard] Loaded from localStorage cache');
      setDashboardTabs(cached.tabs);
      setActiveTabId(cached.activeTabId);
      setCustomWidgets(cached.customWidgets);
      setRefreshInterval(cached.refreshInterval);
      setIsLoading(false);
      isInitialLoadRef.current = false;
      hasValidCache = true;
    }

    // 2) Fetch from server in background (sync)
    try {
      let query = supabase
        .schema('app_private')
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', userId)
        .not('tab_id', 'ilike', 'ws-%'); // ⚡ FIX 1: Ignore all Workspace MiniApp tabs!

      // 👈 Filter strictly by the current organization context BEFORE ordering
      if (organization?.id) {
        query = query.eq('organization_id', organization.id);
      } else {
        query = query.is('organization_id', null);
      }

      // ⚡ Apply ordering AFTER all filters are attached
      query = query.order('tab_order', { ascending: true });

      const { data: configs, error } = await query;

      if (error) throw error;

      if (configs && configs.length > 0) {
        let loadedTabs: DashboardTab[] = configs.map((config: any) => {
          let parsedTiles = [];
          try {
            parsedTiles = typeof config.tiles === 'string' ? JSON.parse(config.tiles) : (config.tiles || []);
          } catch (e) {
            console.error('Failed to parse tiles from DB', e);
          }

          return {
            id: config.tab_id, 
            name: config.tab_name, 
            tiles: Array.isArray(parsedTiles) ? parsedTiles : [], 
            isDefault: config.tab_order === 0 || config.tab_id === 'main',
            accentColor: config.accent_color || 'theme-primary', 
          };
        });

        // Auto-scale loaded tiles to perfectly fit the screen
        const currentWidth = containerRef.current?.clientWidth || (window.innerWidth - 32); 
        let layoutMaxRight = 0;
        loadedTabs.forEach(tab => {
          tab.tiles.forEach(t => {
            if (t.position.x + t.size.width > layoutMaxRight) {
              layoutMaxRight = t.position.x + t.size.width;
            }
          });
        });

        // ⚡ FIX: Removed the auto-scale logic here that was permanently overwriting user layouts.

        if (!loadedTabs.some(tab => tab.id === 'main')) loadedTabs.unshift(DEFAULT_TABS[0]);
        
        // ⚡ FIX: Always use the server as the ultimate source of truth when a successful response is received. 
        // Comparing timestamps fails when rows are manually deleted from the database.
        setDashboardTabs(loadedTabs);
        const activeConfig = configs.find((c: any) => c.is_active);
        if (activeConfig) setActiveTabId(activeConfig.tab_id);
        saveTilesToCache(userId, loadedTabs, activeConfig?.tab_id || 'main', customWidgets, refreshInterval);
        console.log('[Dashboard] Synced from server');

      } else if (!hasValidCache) {
        // No server data AND no cache - use role-based defaults
        const roleCategory = getUserRoleCategory();
        const currentWidth = containerRef.current?.clientWidth || 1248;
        const roleTiles = getRoleDefaultTiles(roleCategory, currentWidth);
        const defaultTabs: DashboardTab[] = [{ id: 'main', name: 'Main Dashboard', isDefault: true, tiles: roleTiles }];
        setDashboardTabs(defaultTabs);
        saveTilesToCache(userId, defaultTabs, 'main', [], 60);
      }
    } catch (err) {
      console.warn('[Dashboard] Server sync error:', err);
    } finally { 
      activeLayoutOrgRef.current = currentOrg;
      setIsLoading(false); 
      isInitialLoadRef.current = false; 
    }
  }, [userId, organization?.id, getUserRoleCategory]);

  // ⚡ ACTUALLY CALL THE LOAD FUNCTION ON MOUNT
  useEffect(() => {
    loadDashboardConfigs();
  }, [loadDashboardConfigs]);

  // Save dashboard configs to server with retry logic
  const saveRetryCountRef = useRef(0);
  const MAX_SAVE_RETRIES = 3;

  const saveDashboardConfigs = useCallback(async () => {
    if (!userId || isInitialLoadRef.current) return;
    
    // ⚡ FIX: Abort auto-save if the layout currently in state belongs to a different organization
    if (activeLayoutOrgRef.current !== (organization?.id || null)) return;
    
    // ⚡ Extract the absolutely latest state from our ref
    const { 
      dashboardTabs: currentTabs, 
      activeTabId: currentActiveTab, 
      customWidgets: currentWidgets, 
      refreshInterval: currentInterval 
    } = latestStateRef.current;

    setIsSaving(true); setSaveError(null);

    // ─── Offline-first: queue changes when network is unavailable ───
    if (!navigator.onLine) {
      console.log('[Dashboard] Offline – queuing tile changes to IndexedDB');
      try {
        for (let i = 0; i < currentTabs.length; i++) {
          const tab = currentTabs[i];
          const serializedTiles = tab.tiles.map(serializeTile);
          await queueTileChange(
            String(userId),
            String(tab.id),
            String(tab.name),
            serializedTiles,
            currentWidgets,
            currentInterval,
            i,
            tab.id === currentActiveTab,
          );
        }
        setSaveError('Queued offline');
      } catch (err: any) {
        console.warn('[Dashboard] Failed to queue offline:', err);
        setSaveError('Queue failed');
      }
      setIsSaving(false);
      return;
    }

    // ─── Online: attempt direct server save with retry ───
const attemptSave = async (attempt: number): Promise<boolean> => {
  try {
    const savePromises = currentTabs.map(async (tab, i) => {
      const serializedTiles = tab.tiles.map(serializeTile);

      const payload = {
        user_id: String(userId),
        organization_id: organization?.id || null, // 👈 Target specific organization
        tab_id: String(tab.id),
        tab_name: String(tab.name),
        tiles: JSON.stringify(serializedTiles), 
        tab_order: i,
        is_active: tab.id === currentActiveTab,
        accent_color: tab.accentColor || 'theme-primary', 
        updated_at: new Date().toISOString(),
      };

          // ⚡ FIX: Manually check if the row exists to bypass strict .upsert() constraints
          let fetchQuery = supabase
            .schema('app_private')
            .from('dashboard_configs')
            .select('id')
            .eq('user_id', String(userId))
            .eq('tab_id', String(tab.id));
            
          if (organization?.id) {
            fetchQuery = fetchQuery.eq('organization_id', organization.id);
          } else {
            fetchQuery = fetchQuery.is('organization_id', null);
          }

          const { data: existing, error: fetchErr } = await fetchQuery.maybeSingle();

          if (fetchErr) throw fetchErr;

          if (existing?.id) {
            // Safe Update
            return supabase.schema('app_private').from('dashboard_configs').update(payload).eq('id', existing.id);
          } else {
            // Safe Insert
            return supabase.schema('app_private').from('dashboard_configs').insert(payload);
          }
        });

        const results = await Promise.all(savePromises);
        const firstError = results.find(r => r.error);
        if (firstError) throw firstError.error;

        return true;
      } catch (err: any) {
        console.warn(`[Dashboard] Save attempt ${attempt + 1} failed:`, err.message);
        return false;
      }
    };

    let saved = false;
    for (let attempt = 0; attempt < MAX_SAVE_RETRIES && !saved; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      saved = await attemptSave(attempt);
      saveRetryCountRef.current = attempt + 1;
    }

    if (saved) {
      setLastSaved(new Date());
      setSaveError(null);
      saveRetryCountRef.current = 0;
      markAllSaved();
      clearPendingChanges(String(userId)).catch(() => {});
      // ⚡ FIX: Sync the cache timestamp AFTER a successful DB save so the server doesn't out-date it
      saveTilesToCache(String(userId), currentTabs, currentActiveTab, currentWidgets, currentInterval);
    } else {
      console.warn('[Dashboard] All save retries exhausted. Queuing to offline sync.');
      try {
        for (let i = 0; i < currentTabs.length; i++) {
          const tab = currentTabs[i];
          const serializedTiles = tab.tiles.map(serializeTile);
          await queueTileChange(
            String(userId),
            String(tab.id),
            String(tab.name),
            serializedTiles,
            currentWidgets,
            currentInterval,
            i,
            tab.id === currentActiveTab,
          );
        }
      } catch {}
      setSaveError('Sync pending');
    }
    setIsSaving(false);
  }, [userId, organization?.id]); 


  // ⚡ NEW: Global Auto-Saver ⚡
  // This completely automates saving. If the dashboard UI changes for ANY reason
  // (dragging, resizing, adding a widget), this saves it to the database 800ms later.
  useEffect(() => {
    // ⚡ FIX: Abort the save if the layout change was triggered by the window scaling!
    if (!userId || isInitialLoadRef.current || isResizingWindowRef.current) return;
    
    const timer = setTimeout(() => {
      // Secondary check just in case they started resizing during the 800ms delay
      if (!isResizingWindowRef.current) {
        saveDashboardConfigs();
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [dashboardTabs, activeTabId, customWidgets, refreshInterval, saveDashboardConfigs, userId]);

  // ============================================
  // CUSTOM WIDGET HANDLERS
  // ============================================
  const handleSaveCustomWidget = useCallback(async (widget: CustomWidgetDefinition) => {
    const updated = [...customWidgets, widget];
    setCustomWidgets(updated);
    // Auto-add as tile
    const newTile: TileConfig = {
      id: `${widget.id}-${Date.now()}`,
      widgetId: widget.id,
      title: widget.name,
      position: { x: 20, y: getLowestTileBottomFn() },
      size: { width: widget.visualization === 'counter' ? 300 : 450, height: widget.visualization === 'counter' ? 200 : 300 },
      zIndex: maxZIndex + 1,
      glowColor: widget.glowColor,
    };
    setMaxZIndex(prev => prev + 1);
    setDashboardTabs(prev => prev.map(tab =>
      tab.id !== activeTabId ? tab : { ...tab, tiles: [...tab.tiles, newTile] }
    ));
    // Persist custom widgets
    if (userId) {
      try {
        await supabase.functions.invoke('dashboard-config', {
          body: { action: 'save_custom_widgets', user_id: userId, tab_id: activeTabId, custom_widgets: updated }
        });
      } catch (e) { console.error('Failed to save custom widgets:', e); }
    }
  }, [customWidgets, activeTabId, maxZIndex, userId]);

  // ============================================
  // EXPORT / IMPORT / SHARE
  // ============================================
  const handleExport = useCallback(() => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tabs: dashboardTabs.map(tab => ({
        id: tab.id, name: tab.name, tiles: tab.tiles.map(serializeTile), isDefault: tab.isDefault,
      })),
      customWidgets,
      refreshInterval,
      activeTabId,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [dashboardTabs, customWidgets, refreshInterval, activeTabId]);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);
        if (!data.tabs || !Array.isArray(data.tabs)) throw new Error('Invalid format');
        const importedTabs: DashboardTab[] = data.tabs.map((t: any) => ({
          id: t.id, name: t.name, tiles: Array.isArray(t.tiles) ? t.tiles : [], isDefault: t.isDefault,
        }));
        setDashboardTabs(importedTabs);
        if (data.customWidgets) setCustomWidgets(data.customWidgets);
        if (data.refreshInterval) setRefreshInterval(data.refreshInterval);
        if (data.activeTabId) setActiveTabId(data.activeTabId);
        setShowImportModal(false);
        setImportError(null);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleImportFromText = useCallback(() => {
    try {
      const data = JSON.parse(importData);
      if (!data.tabs || !Array.isArray(data.tabs)) throw new Error('Invalid format: missing tabs array');
      const importedTabs: DashboardTab[] = data.tabs.map((t: any) => ({
        id: t.id, name: t.name, tiles: Array.isArray(t.tiles) ? t.tiles : [], isDefault: t.isDefault,
      }));
      setDashboardTabs(importedTabs);
      if (data.customWidgets) setCustomWidgets(data.customWidgets);
      if (data.refreshInterval) setRefreshInterval(data.refreshInterval);
      if (data.activeTabId) setActiveTabId(data.activeTabId);
      setShowImportModal(false);
      setImportData('');
      setImportError(null);
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON');
    }
  }, [importData]);

  const handleShareDashboard = useCallback(() => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tabs: dashboardTabs.map(tab => ({
        id: tab.id, name: tab.name, tiles: tab.tiles.map(serializeTile), isDefault: tab.isDefault,
      })),
      customWidgets,
      refreshInterval,
    };
    const encoded = btoa(JSON.stringify(exportData));
    setShareCode(encoded);
    setShowExportMenu(false);
  }, [dashboardTabs, customWidgets, refreshInterval]);

  const currentTab = dashboardTabs.find(tab => tab.id === activeTabId) || dashboardTabs[0];
  const tiles = currentTab?.tiles || [];

  const getUserName = () => user ? (user as OrganizationUser | PlatformUser).full_name?.split(' ')[0] || 'User' : 'User';
  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const canAddAdminWidgets = () => isPlatformOwner() || (isPlatformUser() && (isPlatformTechAdmin() || isPlatformSupportAdmin() || isPlatformSalesAdmin()));
  // Platform-only widget IDs that should never appear for organization users
  const PLATFORM_ONLY_WIDGETS = ['system-health', 'security-overview', 'user-stats', 'quantum-visualization', 'news-feed'];
  const getAvailableWidgets = () => {
    if (isOrgUser) {
      // Organization users: exclude platform-only widgets entirely
      return AVAILABLE_WIDGETS.filter(w => !PLATFORM_ONLY_WIDGETS.includes(w.id));
    }
    // Platform users: show all, but requiresAdmin ones only for admins
    return AVAILABLE_WIDGETS.filter(w => !w.requiresAdmin || canAddAdminWidgets());
  };

  // Organization-specific stats (no platform metrics)
  const orgStats = [
    { title: 'Team Members', value: '24', change: '+3 this month', changeType: 'positive' as const, icon: UsersIcon, glowColor: 'theme-primary' as const },
    { title: 'Active Tasks', value: '47', change: '12 due today', changeType: 'neutral' as const, icon: TaskIcon, glowColor: 'theme-accent' as const },
    { title: 'Completion Rate', value: '94%', change: '+5%', changeType: 'positive' as const, icon: TrendingUpIcon, glowColor: 'green' as const },
    { title: 'Workspaces', value: '6', change: 'All active', changeType: 'neutral' as const, icon: ActivityIcon, glowColor: 'orange' as const },
  ];

  // Platform-level stats (system metrics)
  const platformStats = [
    { title: 'System Uptime', value: '99.97%', change: '+0.02%', changeType: 'positive' as const, icon: ServerIcon, glowColor: 'theme-primary' as const },
    { title: 'Active Users', value: '2,847', change: '+127 today', changeType: 'positive' as const, icon: UsersIcon, glowColor: 'theme-accent' as const },
    { title: 'Avg Response', value: '42ms', change: '-8ms', changeType: 'positive' as const, icon: ClockIcon, glowColor: 'magenta' as const },
    { title: 'Error Rate', value: '0.03%', change: 'Normal', changeType: 'neutral' as const, icon: ActivityIcon, glowColor: 'green' as const },
  ];

  // Use org stats for org users, platform stats for platform users
  const stats = isOrgUser ? orgStats : platformStats;


  const recentTasks = [
    { title: 'Review Q4 budget proposal', workspace: 'Accounting', priority: 'urgent', dueDate: 'Today' },
    { title: 'Update employee handbook', workspace: 'Personnel', priority: 'high', dueDate: 'Tomorrow' },
    { title: 'Client meeting preparation', workspace: 'Main', priority: 'medium', dueDate: 'Jan 30' },
  ];

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-500', medium: 'bg-theme-primary-500', high: 'bg-orange-500', urgent: 'bg-red-500'
  };

  const TILE_Y_OFFSET = 0;


  const getLowestTileBottomFn = () => tiles.length === 0 ? 100 : Math.max(...tiles.map(t => t.position.y + t.size.height)) + 50;

  const handlePositionChange = useCallback((id: string, newPosition: { x: number; y: number }) => {
    const isSnapEnabled = localStorage.getItem('dashboard_snap_to_grid') === 'true';
    const rawSnapSize = parseInt(localStorage.getItem('dashboard_snap_grid_size') || '20', 10);
    const gridSpacing = isSnapEnabled && rawSnapSize > 0 ? rawSnapSize : 10;
    const TILE_GAP = gridSpacing;

    let x = Math.max(0, Math.round(newPosition.x / gridSpacing) * gridSpacing);
    let storedY = Math.max(0, Math.round((newPosition.y - TILE_Y_OFFSET) / gridSpacing) * gridSpacing);
    
    setDashboardTabs(prev => {
      const updatedTabs = prev.map(tab => {
        if (tab.id !== activeTabId) return tab;
        
        let newTiles = tab.tiles.map(tile => 
          tile.id === id ? { ...tile, position: { x, y: storedY } } : { ...tile }
        );

        let resolved = false;
        let passes = 0;

        while (!resolved && passes < 30) {
          resolved = true;
          const sortedIndices = newTiles.map((_, i) => i).sort((a, b) => {
            if (newTiles[a].position.y !== newTiles[b].position.y) return newTiles[a].position.y - newTiles[b].position.y;
            return newTiles[a].position.x - newTiles[b].position.x;
          });
          
          for (let i of sortedIndices) {
            for (let j of sortedIndices) {
              if (i === j) continue;
              const tA = newTiles[i];
              const tB = newTiles[j];
              
              if (
                tA.position.x < tB.position.x + tB.size.width + TILE_GAP &&
                tA.position.x + tA.size.width + TILE_GAP > tB.position.x &&
                tA.position.y < tB.position.y + tB.size.height + TILE_GAP &&
                tA.position.y + tA.size.height + TILE_GAP > tB.position.y
              ) {
                resolved = false;
                let moveTile = tB;
                let anchorTile = tA;

                if (tB.id === id) { moveTile = tA; anchorTile = tB; }
                else if (tA.id !== id) {
                  if (tA.position.y > tB.position.y) { moveTile = tA; anchorTile = tB; }
                  else if (tA.position.y < tB.position.y) { moveTile = tB; anchorTile = tA; }
                  else if (tA.position.x > tB.position.x) { moveTile = tA; anchorTile = tB; }
                  else { moveTile = tB; anchorTile = tA; }
                }

                const overX = Math.min((anchorTile.position.x + anchorTile.size.width + TILE_GAP) - moveTile.position.x, (moveTile.position.x + moveTile.size.width + TILE_GAP) - anchorTile.position.x);
                const overY = Math.min((anchorTile.position.y + anchorTile.size.height + TILE_GAP) - moveTile.position.y, (moveTile.position.y + moveTile.size.height + TILE_GAP) - anchorTile.position.y);

                if (overX < overY + 40) {
                  if (moveTile.position.x >= anchorTile.position.x) {
                    moveTile.position.x = anchorTile.position.x + anchorTile.size.width + TILE_GAP;
                  } else {
                    moveTile.position.x = anchorTile.position.x - moveTile.size.width - TILE_GAP;
                    if (moveTile.position.x < 0) {
                      moveTile.position.x = 0;
                      anchorTile.position.x = moveTile.position.x + moveTile.size.width + TILE_GAP;
                    }
                  }
                } else {
                  if (moveTile.position.y >= anchorTile.position.y) {
                    moveTile.position.y = anchorTile.position.y + anchorTile.size.height + TILE_GAP;
                  } else {
                    moveTile.position.y = anchorTile.position.y - moveTile.size.height - TILE_GAP;
                    if (moveTile.position.y < 0) {
                      moveTile.position.y = 0;
                      anchorTile.position.y = moveTile.position.y + moveTile.size.height + TILE_GAP;
                    }
                  }
                }

                moveTile.position.x = Math.max(0, Math.round(moveTile.position.x / gridSpacing) * gridSpacing);
                moveTile.position.y = Math.max(0, Math.round(moveTile.position.y / gridSpacing) * gridSpacing);
                if (anchorTile.id !== id) {
                  anchorTile.position.x = Math.max(0, Math.round(anchorTile.position.x / gridSpacing) * gridSpacing);
                  anchorTile.position.y = Math.max(0, Math.round(anchorTile.position.y / gridSpacing) * gridSpacing);
                }
              }
            }
          }
          passes++;
        }
        return { ...tab, tiles: newTiles };
      });
      
      // Persist changes
      if (userId) saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
      return updatedTabs;
    });
    
    // Defer server sync slightly to ensure state is completely flushed
    
  }, [activeTabId, userId, customWidgets, refreshInterval, saveDashboardConfigs]);


  // Live Preview during Resize
  const handleSizeChange = useCallback((id: string, newSize: { width: number; height: number }, dir?: string) => {
    const tab = dashboardTabs.find(t => t.id === activeTabId);
    if (!tab) return;
    const GAP = 10;
    const containerWidth = containerRef.current?.clientWidth || 1248;

    let simTiles = tab.tiles.map(t => ({
      ...t,
      size: { ...t.size },
      position: { ...t.position }
    }));

    const originalTile = tab.tiles.find(t => t.id === id);
    if (!originalTile) return;

    const deltaW = Math.round(newSize.width) - originalTile.size.width;

    const sortedTiles = simTiles.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) > 60) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });

    const rows: typeof simTiles[] = [];
    let currentRow: typeof simTiles = [];
    let currentY = sortedTiles.length > 0 ? sortedTiles[0].position.y : 0;

    sortedTiles.forEach(tile => {
      if (Math.abs(tile.position.y - currentY) <= 60) currentRow.push(tile);
      else {
        rows.push(currentRow);
        currentRow = [tile];
        currentY = tile.position.y;
      }
    });
    if (currentRow.length > 0) rows.push(currentRow);

    // --- APPLY HORIZONTAL FLEX RESIZING ---
    if (deltaW !== 0) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const tIndex = row.findIndex(t => t.id === id);
    
    if (tIndex !== -1) {
      const targetTile = row[tIndex];
      
      let compIndex = tIndex + 1; // Default right
      if (dir?.includes('w')) {
        compIndex = tIndex - 1; // Left handle dragged, steal from left tile
      } else if (dir?.includes('e')) {
        compIndex = tIndex + 1; // Right handle dragged, steal from right tile
      }

      const minWidth = 200; // Safety catch
      let actualDelta = deltaW;

      if (compIndex >= 0 && compIndex < row.length) {
        // We have a neighbor, so steal space from them
        const compTile = row[compIndex];
        
        if (deltaW > 0 && compTile.size.width - deltaW < minWidth) {
          actualDelta = compTile.size.width - minWidth;
        }
        if (deltaW < 0 && targetTile.size.width + deltaW < minWidth) {
          actualDelta = minWidth - targetTile.size.width;
        }

        // Universally apply the delta
        targetTile.size.width += actualDelta;
        compTile.size.width -= actualDelta;
        
      } else {
        // Resizing an edge tile with no neighbor to steal from
        if (targetTile.size.width + actualDelta < minWidth) {
          actualDelta = minWidth - targetTile.size.width;
        }
        targetTile.size.width += actualDelta;
        
        // Adjust X position if we dragged the left handle of a left-most tile
        if (dir?.includes('w')) {
          targetTile.position.x -= actualDelta;
        }
      }

      // Recalculate X positions strictly left-to-right to maintain perfect gaps
      // We initialize currentX dynamically so left-side gaps are preserved if shrunk
      let currentX = row.length > 0 ? row[0].position.x : 0;
      row.forEach((t) => {
        t.position.x = currentX;
        
        // Enforce right boundary: prevent extending PAST the edge of the screen
        if (t.position.x + t.size.width > containerWidth) {
          t.size.width = Math.max(minWidth, containerWidth - t.position.x);
        }
        
        currentX += t.size.width + GAP;
      });
      
      break; // Found and processed the target row, break the loop
    }
  }
}

    const targetInSim = simTiles.find(t => t.id === id);
    if (targetInSim) {
      targetInSim.size.height = Math.round(newSize.height);
    }

    const newPreview: Record<string, {x: number, y: number, width: number, height: number}> = {};
    let packedY = 0;

    rows.forEach((row) => {
      let maxRowHeight = 0;
      row.forEach((tile) => {
        newPreview[tile.id] = {
          x: tile.position.x, 
          y: packedY,
          width: tile.size.width,
          height: tile.size.height
        };
        maxRowHeight = Math.max(maxRowHeight, tile.size.height);
      });
      packedY += maxRowHeight + GAP;
    });

    setPreviewLayout(newPreview);
  }, [activeTabId, dashboardTabs]);

  // Commit Save on Release
  const handleSizeChangeEnd = useCallback((id: string, newSize: { width: number; height: number }, dir?: string) => {
    setDashboardTabs(prev => {
      const updatedTabs = prev.map(tab => {
        if (tab.id !== activeTabId) return tab;
        const GAP = 10;
        const containerWidth = containerRef.current?.clientWidth || 1248;

        let simTiles = tab.tiles.map(t => ({
          ...t,
          size: { ...t.size },
          position: { ...t.position }
        }));

        const originalTile = tab.tiles.find(t => t.id === id);
        if (!originalTile) return tab;

        const deltaW = Math.round(newSize.width) - originalTile.size.width;

        const sortedTiles = simTiles.sort((a, b) => {
          if (Math.abs(a.position.y - b.position.y) > 60) return a.position.y - b.position.y;
          return a.position.x - b.position.x;
        });

        const rows: typeof simTiles[] = [];
        let currentRow: typeof simTiles = [];
        let currentY = sortedTiles.length > 0 ? sortedTiles[0].position.y : 0;

        sortedTiles.forEach(tile => {
          if (Math.abs(tile.position.y - currentY) <= 60) currentRow.push(tile);
          else {
            rows.push(currentRow);
            currentRow = [tile];
            currentY = tile.position.y;
          }
        });
        if (currentRow.length > 0) rows.push(currentRow);

        if (deltaW !== 0) {
          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const tIndex = row.findIndex(t => t.id === id);
            
            if (tIndex !== -1) {
              const targetTile = row[tIndex];
              
              let compIndex = tIndex + 1; // Default right
              if (dir?.includes('w')) {
                compIndex = tIndex - 1; // Left handle dragged, steal from left tile
              } else if (dir?.includes('e')) {
                compIndex = tIndex + 1; // Right handle dragged, steal from right tile
              }

              const minWidth = 200; // Safety catch
              let actualDelta = deltaW;

              if (compIndex >= 0 && compIndex < row.length) {
                // We have a neighbor, so steal space from them
                const compTile = row[compIndex];
                
                if (deltaW > 0 && compTile.size.width - deltaW < minWidth) {
                  actualDelta = compTile.size.width - minWidth;
                }
                if (deltaW < 0 && targetTile.size.width + deltaW < minWidth) {
                  actualDelta = minWidth - targetTile.size.width;
                }

                // Universally apply the delta
                targetTile.size.width += actualDelta;
                compTile.size.width -= actualDelta;
                
              } else {
                // Resizing an edge tile with no neighbor to steal from
                if (targetTile.size.width + actualDelta < minWidth) {
                  actualDelta = minWidth - targetTile.size.width;
                }
                targetTile.size.width += actualDelta;
                
                // Adjust X position if we dragged the left handle of a left-most tile
                if (dir?.includes('w')) {
                  targetTile.position.x -= actualDelta;
                }
              }

              // Recalculate X positions strictly left-to-right to maintain perfect gaps
              let currentX = row.length > 0 ? row[0].position.x : 0;
              row.forEach((t) => {
                t.position.x = currentX;
                
                // Enforce right boundary
                if (t.position.x + t.size.width > containerWidth) {
                  t.size.width = Math.max(minWidth, containerWidth - t.position.x);
                }
                
                currentX += t.size.width + GAP;
              });
              
              break; 
            }
          }
        }

        const targetInSim = simTiles.find(t => t.id === id);
        if (targetInSim) {
          targetInSim.size.height = Math.round(newSize.height);
        }

        const newTiles: TileConfig[] = [];
        let packedY = 0;

        rows.forEach((row) => {
          let maxRowHeight = 0;
          row.forEach((tile) => {
            newTiles.push({
              ...tile,
              position: { ...tile.position, y: packedY }
            });
            maxRowHeight = Math.max(maxRowHeight, tile.size.height);
          });
          packedY += maxRowHeight + GAP;
        });

        return { ...tab, tiles: newTiles };
      });

      // Persist changes
      if (userId) saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
      return updatedTabs;
    });
    
    setPreviewLayout(null);
    
  }, [activeTabId, userId, customWidgets, refreshInterval, saveDashboardConfigs]);

  const handleZIndexChange = useCallback((id: string) => {
    setMaxZIndex(prev => {
      const newMax = prev + 1;
      setDashboardTabs(prevTabs => {
        const updatedTabs = prevTabs.map(tab => tab.id !== activeTabId ? tab : {
          ...tab, tiles: tab.tiles.map(tile => tile.id === id ? { ...tile, zIndex: newMax } : tile)
        });
        
        // Persist layer order changes
        if (userId) saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
        return updatedTabs;
      });
      return newMax;
    });
    
  }, [activeTabId, userId, customWidgets, refreshInterval, saveDashboardConfigs]);

  const handleAddWidget = (widgetDef: WidgetDefinition) => {
    const newTile: TileConfig = {
      id: `${widgetDef.id}-${Date.now()}`, widgetId: widgetDef.id, title: widgetDef.name,
      position: { x: 0, y: 500 }, size: { width: widgetDef.defaultWidth, height: widgetDef.defaultHeight },
      zIndex: maxZIndex + 1, glowColor: widgetDef.glowColor,
    };
    setMaxZIndex(prev => prev + 1);
    setDashboardTabs(prev => prev.map(tab => tab.id !== activeTabId ? tab : { ...tab, tiles: [...tab.tiles, newTile] }));
    setShowAddWidgetModal(false);
  };

  const handleRemoveWidget = (tileId: string) => {
    setDashboardTabs(prev => prev.map(tab => tab.id !== activeTabId ? tab : { ...tab, tiles: tab.tiles.filter(tile => tile.id !== tileId) }));
  };

  // ============================================
  // TAB TEMPLATES
  // ============================================
  const TAB_TEMPLATES: { id: string; name: string; description: string; accentColor: string; icon: string; tiles: TileConfig[] }[] = [
    {
      id: 'analytics', name: 'Analytics Overview', description: 'KPIs, reports, and user statistics', accentColor: 'green', icon: 'chart',
      tiles: [
        { id: `rpt-${Date.now()}`, widgetId: 'reports', title: 'Reports', position: { x: 20, y: 0 }, size: { width: 500, height: 300 }, zIndex: 1, glowColor: 'green' },
        { id: `usr-${Date.now()}`, widgetId: 'user-stats', title: 'User Statistics', position: { x: 540, y: 0 }, size: { width: 480, height: 300 }, zIndex: 2, glowColor: 'theme-accent' },
        { id: `act-${Date.now()}`, widgetId: 'activity', title: 'Activity Feed', position: { x: 20, y: 320 }, size: { width: 340, height: 220 }, zIndex: 3, glowColor: 'green' },
      ],
    },
    {
      id: 'team', name: 'Team Activity', description: 'Team members, tasks, and messages', accentColor: 'theme-primary', icon: 'users',
      tiles: [
        { id: `tm-${Date.now()}`, widgetId: 'team-management', title: 'Team Management', position: { x: 20, y: 0 }, size: { width: 520, height: 320 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: `tsk-${Date.now()}`, widgetId: 'tasks', title: 'My Tasks', position: { x: 560, y: 0 }, size: { width: 460, height: 280 }, zIndex: 2, glowColor: 'theme-primary' },
        { id: `msg-${Date.now()}`, widgetId: 'messages-preview', title: 'Recent Messages', position: { x: 20, y: 340 }, size: { width: 400, height: 200 }, zIndex: 3, glowColor: 'orange' },
        { id: `cal-${Date.now()}`, widgetId: 'calendar-preview', title: 'Upcoming Events', position: { x: 440, y: 340 }, size: { width: 380, height: 200 }, zIndex: 4, glowColor: 'theme-accent' },
      ],
    },
    {
      id: 'security', name: 'Security Monitor', description: 'Security overview and system health', accentColor: 'red', icon: 'shield',
      tiles: [
        { id: `sec-${Date.now()}`, widgetId: 'security-overview', title: 'Security Overview', position: { x: 20, y: 0 }, size: { width: 520, height: 320 }, zIndex: 1, glowColor: 'red' },
        { id: `sys-${Date.now()}`, widgetId: 'system-health', title: 'System Health', position: { x: 560, y: 0 }, size: { width: 460, height: 320 }, zIndex: 2, glowColor: 'theme-primary' },
        { id: `act2-${Date.now()}`, widgetId: 'activity', title: 'Activity', position: { x: 20, y: 340 }, size: { width: 340, height: 200 }, zIndex: 3, glowColor: 'green' },
      ],
    },
    {
      id: 'productivity', name: 'Productivity Hub', description: 'Tasks, calendar, and quick actions', accentColor: 'magenta', icon: 'bolt',
      tiles: [
        { id: `tsk2-${Date.now()}`, widgetId: 'tasks', title: 'My Tasks', position: { x: 20, y: 0 }, size: { width: 540, height: 300 }, zIndex: 1, glowColor: 'theme-primary' },
        { id: `qa-${Date.now()}`, widgetId: 'quick-actions', title: 'Quick Actions', position: { x: 580, y: 0 }, size: { width: 320, height: 240 }, zIndex: 2, glowColor: 'magenta' },
        { id: `cal2-${Date.now()}`, widgetId: 'calendar-preview', title: 'Upcoming Events', position: { x: 20, y: 320 }, size: { width: 420, height: 200 }, zIndex: 3, glowColor: 'theme-accent' },
        { id: `msg2-${Date.now()}`, widgetId: 'messages-preview', title: 'Recent Messages', position: { x: 460, y: 320 }, size: { width: 420, height: 200 }, zIndex: 4, glowColor: 'orange' },
      ],
    },
    {
      id: 'executive', name: 'Executive Summary', description: 'High-level overview with all key metrics', accentColor: 'theme-accent', icon: 'crown',
      tiles: [
        { id: `rpt2-${Date.now()}`, widgetId: 'reports', title: 'Reports', position: { x: 20, y: 0 }, size: { width: 480, height: 280 }, zIndex: 1, glowColor: 'green' },
        { id: `usr2-${Date.now()}`, widgetId: 'user-stats', title: 'User Statistics', position: { x: 520, y: 0 }, size: { width: 480, height: 280 }, zIndex: 2, glowColor: 'theme-accent' },
        { id: `tsk3-${Date.now()}`, widgetId: 'tasks', title: 'My Tasks', position: { x: 20, y: 300 }, size: { width: 480, height: 260 }, zIndex: 3, glowColor: 'theme-primary' },
        { id: `tm2-${Date.now()}`, widgetId: 'team-management', title: 'Team', position: { x: 520, y: 300 }, size: { width: 480, height: 260 }, zIndex: 4, glowColor: 'theme-primary' },
      ],
    },
  ];

  const handleAddTab = () => {
    if (!newTabName.trim()) return;
    // Generate fresh unique IDs for template tiles
    const templateTiles = selectedTabTemplate
      ? (TAB_TEMPLATES.find(t => t.id === selectedTabTemplate)?.tiles || []).map((tile, i) => ({
          ...tile,
          id: `${tile.widgetId}-${Date.now()}-${i}`,
        }))
      : [];
    const templateAccent = selectedTabTemplate
      ? TAB_TEMPLATES.find(t => t.id === selectedTabTemplate)?.accentColor || 'theme-primary'
      : 'theme-primary';
    const newTab: DashboardTab = {
      id: `tab-${Date.now()}`,
      name: newTabName.trim(),
      tiles: templateTiles,
      accentColor: templateAccent,
    };
    setDashboardTabs(prev => {
      const updated = [...prev, newTab];
      // Immediately persist to localStorage
      if (userId) {
        saveTilesToCache(userId, updated, newTab.id, customWidgets, refreshInterval);
      }
      return updated;
    });
    setActiveTabId(newTab.id);
    setNewTabName('');
    setSelectedTabTemplate(null);
    setShowAddTabModal(false);
    // Immediately save to server (bypass debounce)
    
  };


  const handleDeleteTab = async (tabId: string) => {
    const tab = dashboardTabs.find(t => t.id === tabId);
    if (tab?.isDefault) return;
    
    setDashboardTabs(prev => {
      const updated = prev.filter(t => t.id !== tabId);
      // Immediately persist to localStorage
      if (userId) {
        saveTilesToCache(userId, updated, updated[0]?.id || 'main', customWidgets, refreshInterval);
      }
      return updated;
    });
    
    if (activeTabId === tabId) {
      setActiveTabId(dashboardTabs[0]?.id || 'main');
    }
    
    // Immediately save to server (bypass debounce)
    if (userId) {
      try {
        let query = supabase
          .schema('app_private')
          .from('dashboard_configs')
          .delete()
          .eq('user_id', String(userId))
          .eq('tab_id', String(tabId));

        // Safely scope the deletion to the active organization
        if (organization?.id) {
          query = query.eq('organization_id', organization.id);
        } else {
          query = query.is('organization_id', null);
        }

        const { error } = await query;
        if (error) throw error;
        
      } catch (err) {
        console.error('[Dashboard] Failed to delete tab from database:', err);
      }
    }
  };


  const handleTabDragStart = (e: React.DragEvent, tabId: string) => {
    // Don't allow dragging the default Main Dashboard tab from first position
    const tab = dashboardTabs.find(t => t.id === tabId);
    if (tab?.isDefault) {
      e.preventDefault();
      return;
    }
    setDraggingTab(tabId);
    setTabReorderDragId(tabId);
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.setData('application/tab-reorder', tabId);
    e.dataTransfer.effectAllowed = 'move';
    // Create a small drag ghost for tab reorder
    const ghost = document.createElement('div');
    ghost.textContent = tab?.name || 'Tab';
    ghost.style.cssText = 'position:absolute;top:-1000px;left:-1000px;padding:6px 16px;background:rgba(0,0,0,0.85);border:1px solid rgba(0,255,255,0.5);border-radius:8px;color:#00ffff;font-family:monospace;font-size:12px;white-space:nowrap;backdrop-filter:blur(8px);box-shadow:0 0 12px rgba(0,255,255,0.2);';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  };

  const handleTabDragEnd = () => {
    setDraggingTab(null);
    setTabReorderDragId(null);
    setTabReorderInsertIndex(null);
  };


  const handleResetLayout = useCallback(async () => {
    setDashboardTabs(prev => prev.map(tab => tab.id !== activeTabId ? tab : { ...tab, tiles: [...DEFAULT_TILES] }));
    setShowResetConfirm(false);
    if (userId) {
      try {
        const serializedTiles = DEFAULT_TILES.map(serializeTile);

          const { error } = await supabase
            .schema('app_private')
            .from('dashboard_configs')
            .upsert({
              user_id: String(userId),
              organization_id: organization?.id || null, // 👈 Target specific organization
              tab_id: String(activeTabId),
              tab_name: String(currentTab?.name || 'Main Dashboard'),
              tiles: JSON.stringify(serializedTiles),
              tab_order: 0,
              is_active: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, organization_id, tab_id' }); // 👈 Assumes you update your DB constraint
          
        if (error) throw error;
          setLastSaved(new Date());
        } catch (err) { console.error('Error resetting layout:', err); }
      }
    }, [activeTabId, userId, organization?.id, currentTab]);

  // Widget Library: Add CatalogWidget as TileConfig
  const handleAddCatalogWidget = useCallback((catalogWidget: CatalogWidget) => {
    const newTile: TileConfig = {
      id: `${catalogWidget.id}-${Date.now()}`,
      widgetId: catalogWidget.id,
      title: catalogWidget.name,
      position: { x: 0, y: getLowestTileBottomFn() },
      size: { width: catalogWidget.defaultWidth, height: catalogWidget.defaultHeight },
      zIndex: maxZIndex + 1,
      glowColor: catalogWidget.glowColor,
    };
    setMaxZIndex(prev => prev + 1);
    setDashboardTabs(prev => prev.map(tab =>
      tab.id !== activeTabId ? tab : { ...tab, tiles: [...tab.tiles, newTile] }
    ));
    setLibraryAddedIds(prev => [...prev, catalogWidget.id]);
  }, [activeTabId, maxZIndex, tiles]);

  // Layout Templates: Apply template to existing tiles
  const handleApplyTemplate = useCallback((template: LayoutTemplate) => {
    setDashboardTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      const updatedTiles = tab.tiles.map((tile, index) => {
        if (index < template.positions.length) {
          const pos = template.positions[index];
          return { ...tile, position: { x: pos.x, y: pos.y }, size: { width: pos.width, height: pos.height } };
        }
        const lastSlot = template.positions[template.positions.length - 1];
        const extraIndex = index - template.positions.length;
        const col = extraIndex % 2;
        const row = Math.floor(extraIndex / 2);
        const baseY = lastSlot ? lastSlot.y + lastSlot.height + 20 : 0;
        return { ...tile, position: { x: col * 450, y: baseY + row * 300 }, size: { width: 420, height: 280 } };
      });
      return { ...tab, tiles: updatedTiles };
    }));
  }, [activeTabId]);

  const renderTileContent = (tile: TileConfig) => {
    // Check if it's a custom widget
    const customWidget = customWidgets.find(cw => cw.id === tile.widgetId);
    if (customWidget) {
      switch (customWidget.visualization) {
        case 'counter': return <CustomCounterWidget widget={customWidget} />;
        case 'list': return <CustomListWidget widget={customWidget} />;
        case 'chart': return <CustomChartWidget widget={customWidget} />;
        case 'table': return <CustomTableWidget widget={customWidget} />;
        default: return <CustomListWidget widget={customWidget} />;
      }
    }

    switch (tile.widgetId) {
      case 'tasks':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
                <TaskIcon size={16} className="text-theme-primary-400" /> My Tasks
              </h3>
              <button className="text-xs text-theme-primary-400 hover:text-theme-primary-300 font-mono">View all</button>
            </div>
            {recentTasks.map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-theme-primary-500/30 cursor-pointer">
                <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-mono truncate">{task.title}</p>
                  <p className="text-gray-600 text-[10px] font-mono">{task.workspace}</p>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{task.dueDate}</span>
              </div>
            ))}
          </div>
        );
      case 'quick-actions':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 font-mono">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[{ icon: TaskIcon, label: 'New Task', color: 'theme-primary' }, { icon: CalendarIcon, label: 'Add Event', color: 'magenta' },
                { icon: MessageIcon, label: 'Message', color: 'theme-accent' }, { icon: ClockIcon, label: 'Clock In', color: 'green' }].map((action, i) => {
                const Icon = action.icon;
                return (
                  <button key={i} className={`flex flex-col items-center gap-1 p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:bg-${action.color}-500/10`}>
                    <Icon size={20} className={`text-${action.color}-400`} />
                    <span className="text-[10px] text-gray-400 font-mono">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'activity':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <ActivityIcon size={16} className="text-green-400" /> Activity
            </h3>
            <div className="space-y-2">
              {[{ label: 'Completed 3 tasks', color: 'green', time: '2h ago' }, { label: 'Updated status', color: 'theme-primary', time: '4h ago' }].map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full bg-${a.color}-400`} />
                  <span className="text-xs text-gray-400 font-mono flex-1">{a.label}</span>
                  <span className="text-[10px] text-gray-600 font-mono">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'calendar-preview':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <CalendarIcon size={16} className="text-theme-accent-400" /> Upcoming Events
            </h3>
            <div className="space-y-2">
              {[{ title: 'Team Standup', time: '10:00 AM' }, { title: 'Client Review', time: '2:00 PM' }].map((e, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-accent-400" />
                  <div className="flex-1">
                    <p className="text-white text-xs font-mono">{e.title}</p>
                    <p className="text-gray-600 text-[10px] font-mono">{e.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'messages-preview':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <MessageIcon size={16} className="text-orange-400" /> Recent Messages
            </h3>
            <div className="space-y-2">
              {[{ from: 'Sarah Chen', subject: 'Project Update', time: '10m ago', unread: true }, { from: 'Mike Johnson', subject: 'Meeting Notes', time: '1h ago', unread: false }].map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className={`w-1.5 h-1.5 rounded-full ${m.unread ? 'bg-orange-400' : 'bg-gray-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-mono truncate">{m.from}</p>
                    <p className="text-gray-600 text-[10px] font-mono truncate">{m.subject}</p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">{m.time}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'quantum-visualization': return <QuantumVisualization />;
      case 'news-feed': return <NewsFeedWidget />;
      case 'system-health':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <ServerIcon size={16} className="text-theme-primary-400" /> System Health
            </h3>
            <div className="space-y-3">
              {[
                { label: 'CPU Usage', value: 23, color: 'theme-primary' },
                { label: 'Memory', value: 61, color: 'theme-accent' },
                { label: 'Disk I/O', value: 14, color: 'green' },
                { label: 'Network', value: 42, color: 'orange' },
              ].map((metric, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 font-mono">{metric.label}</span>
                    <span className={`text-xs font-mono font-bold text-${metric.color}-400`}>{metric.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-${metric.color}-500`} style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] text-gray-500 font-mono">UPTIME</p>
                  <p className="text-sm text-theme-primary-400 font-mono font-bold">99.97%</p>
                </div>
                <div className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] text-gray-500 font-mono">RESPONSE</p>
                  <p className="text-sm text-green-400 font-mono font-bold">42ms</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'security-overview':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Security Overview
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Firewall Status', status: 'Active', statusColor: 'text-green-400', dot: 'bg-green-400' },
                { label: 'Threat Level', status: 'Low', statusColor: 'text-theme-primary-400', dot: 'bg-theme-primary-400' },
                { label: 'Failed Logins (24h)', status: '3', statusColor: 'text-orange-400', dot: 'bg-orange-400' },
                { label: 'Active Sessions', status: '247', statusColor: 'text-theme-accent-400', dot: 'bg-theme-accent-400' },
                { label: 'SSL Certificate', status: 'Valid', statusColor: 'text-green-400', dot: 'bg-green-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                    <span className="text-xs text-gray-400 font-mono">{item.label}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${item.statusColor}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'user-stats':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <UsersIcon size={16} className="text-theme-accent-400" /> User Statistics
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'Total Users', value: '2,847', color: 'theme-accent' },
                { label: 'Active Today', value: '1,234', color: 'theme-primary' },
                { label: 'New (7d)', value: '+89', color: 'green' },
                { label: 'Avg Session', value: '24m', color: 'orange' },
              ].map((stat, i) => (
                <div key={i} className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] text-gray-500 font-mono uppercase">{stat.label}</p>
                  <p className={`text-sm font-mono font-bold text-${stat.color}-400`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-1 h-16">
              {[35, 42, 38, 55, 48, 62, 58, 71, 65, 78, 72, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-theme-accent-500/40 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-[9px] text-gray-600 font-mono mt-1 text-center">Daily active users (12 months)</p>
          </div>
        );
      case 'team-management':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <UsersIcon size={16} className="text-theme-primary-400" /> Team Management
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Sarah Chen', role: 'Admin', status: 'online', avatar: 'SC' },
                { name: 'Mike Johnson', role: 'Manager', status: 'online', avatar: 'MJ' },
                { name: 'Alex Rivera', role: 'Developer', status: 'away', avatar: 'AR' },
                { name: 'Emily Park', role: 'Designer', status: 'offline', avatar: 'EP' },
                { name: 'James Wilson', role: 'Support', status: 'online', avatar: 'JW' },
              ].map((member, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-theme-primary-500/30 cursor-pointer">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-theme-primary-500/30 to-theme-accent-500/30 border border-gray-700 flex items-center justify-center">
                      <span className="text-[9px] text-gray-300 font-mono font-bold">{member.avatar}</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${
                      member.status === 'online' ? 'bg-green-400' : member.status === 'away' ? 'bg-yellow-400' : 'bg-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-mono truncate">{member.name}</p>
                    <p className="text-gray-600 text-[10px] font-mono">{member.role}</p>
                  </div>
                  <span className={`text-[9px] font-mono ${
                    member.status === 'online' ? 'text-green-400' : member.status === 'away' ? 'text-yellow-400' : 'text-gray-600'
                  }`}>{member.status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'reports':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <TrendingUpIcon size={16} className="text-green-400" /> Reports
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Tasks Done', value: '142', trend: '+12%', color: 'theme-primary' },
                  { label: 'On Time', value: '89%', trend: '+3%', color: 'green' },
                  { label: 'Overdue', value: '7', trend: '-2', color: 'orange' },
                ].map((kpi, i) => (
                  <div key={i} className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                    <p className="text-[9px] text-gray-500 font-mono uppercase">{kpi.label}</p>
                    <p className={`text-sm font-mono font-bold text-${kpi.color}-400`}>{kpi.value}</p>
                    <p className="text-[9px] text-green-400 font-mono">{kpi.trend}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1 h-20">
                {[45, 52, 48, 65, 58, 72, 68].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-green-500/40 rounded-t" style={{ height: `${h}%` }} />
                    <span className="text-[7px] text-gray-600 font-mono">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };


  const getWidgetUrl = (widgetId: string): string => {
    const urlMap: Record<string, string> = {
      'tasks': '/dashboard/tasks', 'quick-actions': '/dashboard/actions', 'activity': '/dashboard/activity',
      'calendar-preview': '/dashboard/calendar', 'messages-preview': '/dashboard/messages',
      'quantum-visualization': '/dashboard/quantum', 'news-feed': '/dashboard/news',
    };
    return urlMap[widgetId] || '/dashboard';
  };

  const handleFullScreen = useCallback((tileId: string) => {
    if (fullScreenTileId === tileId) {
      setFullScreenTileId(null);
    } else {
      setFullScreenTileId(tileId);
      const container = containerRef.current;
      if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = Math.max(container.clientHeight, 600);
        setDashboardTabs(prev => prev.map(tab => tab.id !== activeTabId ? tab : {
          ...tab, tiles: tab.tiles.map(tile => tile.id === tileId ? {
            ...tile, position: { x: 0, y: 0 }, size: { width: containerWidth - 20, height: containerHeight - 80 }, zIndex: maxZIndex + 100,
          } : tile)
        }));
        setMaxZIndex(prev => prev + 100);
      }
    }
  }, [fullScreenTileId, activeTabId, maxZIndex]);

  // Reorder handlers
  const handleReorderDragStart = useCallback((tileId: string) => { 
    setReorderDragTileId(tileId); 
    setCrossTabDragTileId(tileId); 
    setReorderDropTargetIds([]); 
    setPreviewLayout(null);
  }, []);

  const handleReorderDragOver = useCallback((dragId: string, x: number, y: number) => { 
    const tab = dashboardTabs.find(t => t.id === activeTabId);
    if (!tab) return;
    const containerWidth = containerRef.current?.clientWidth || 1248;
    const GAP = 10; 

    // ⚡ FIX: We clamp the simulation X to a minimum of -20.
    // This allows the sorting algorithm to "see" the tile moving 
    // past the left boundary, triggering the displacement logic.
    const simulatedX = x < 0 ? x : x; 

    let simTiles = tab.tiles.map(t => ({
      ...t,
      position: t.id === dragId ? { x: simulatedX, y } : { ...t.position }
    }));

    // Sort by Y (rows) then X (columns)
    const sortedTiles = simTiles.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) > 60) {
        return a.position.y - b.position.y;
      }
      return a.position.x - b.position.x;
    });

    // Group into rows
    const rows: typeof simTiles[] = [];
    let currentRow: typeof simTiles = [];
    let currentY = sortedTiles.length > 0 ? sortedTiles[0].position.y : 0;

    sortedTiles.forEach(tile => {
      if (Math.abs(tile.position.y - currentY) <= 60) {
        currentRow.push(tile);
      } else {
        rows.push(currentRow);
        currentRow = [tile];
        currentY = tile.position.y;
      }
    });
    if (currentRow.length > 0) rows.push(currentRow);

    // Build the preview map with recalculated widths
    const newPreview: Record<string, {x: number, y: number, width: number, height: number}> = {};
    let packedY = 0;

    rows.forEach((row) => {
      const count = row.length;
      const baseWidth = Math.floor((containerWidth - (count - 1) * GAP) / count);
      let maxRowHeight = 0;

      row.forEach((tile, colIndex) => {
        const newX = colIndex * (baseWidth + GAP);
        const isLastInRow = colIndex === count - 1;
        const finalWidth = isLastInRow ? containerWidth - newX : baseWidth;

        newPreview[tile.id] = {
          x: newX,
          y: packedY, // Keep things packed tightly upwards
          width: finalWidth,
          height: tile.size.height
        };
        maxRowHeight = Math.max(maxRowHeight, tile.size.height);
      });
      packedY += maxRowHeight + GAP;
    });

    setPreviewLayout(newPreview);
  }, [activeTabId, dashboardTabs]);

  const handleReorderDrop = useCallback((dragId: string, x: number, y: number) => {
    if (!dragId || !previewLayout) {
      setReorderDragTileId(null);
      setPreviewLayout(null);
      return;
    }

    // 1. Update the state immediately
    setDashboardTabs(prev => {
      const updatedTabs = prev.map(tab => {
        if (tab.id !== activeTabId) return tab;

        const newTiles = tab.tiles.map(tile => {
          const preview = previewLayout[tile.id];
          if (preview) {
            return {
              ...tile,
              position: { x: preview.x, y: preview.y },
              size: { width: preview.width, height: preview.height }
            };
          }
          return tile;
        });

        return { ...tab, tiles: newTiles };
      });

      // 2. ⚡ CRITICAL: Persist to Cache IMMEDIATELY so refresh doesn't break it
      if (userId) {
        saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
      }

      return updatedTabs;
    });

    setReorderDragTileId(null);
    setReorderDropTargetIds([]);
    setPreviewLayout(null);
    
    }, [activeTabId, previewLayout, saveDashboardConfigs, userId, customWidgets, refreshInterval]);

  const handleReorderDragEnd = useCallback(() => { 
    setReorderDragTileId(null); 
    setReorderDropTargetIds([]); 
    setPreviewLayout(null);
    setCrossTabDragTileId(null); 
    setDragOverTabId(null); 
  }, []);

  // ============================================
  // TAB REORDER DRAG HANDLERS
  // ============================================
  const handleTabReorderDragOver = useCallback((e: React.DragEvent) => {
    if (!tabReorderDragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Calculate insertion index based on mouse position relative to tabs
    let insertIdx: number | null = null;

    for (let i = 0; i < dashboardTabs.length; i++) {
      const tab = dashboardTabs[i];
      const el = tabRefs.current.get(tab.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;

      if (e.clientX < midX) {
        insertIdx = i;
        break;
      }
    }

    if (insertIdx === null) {
      insertIdx = dashboardTabs.length;
    }

    // Prevent insertion at index 0 (before Main Dashboard)
    if (insertIdx === 0) insertIdx = 1;

    const dragIdx = dashboardTabs.findIndex(t => t.id === tabReorderDragId);
    // Don't show insertion line at the tab's current position or adjacent
    if (insertIdx === dragIdx || insertIdx === dragIdx + 1) {
      setTabReorderInsertIndex(null);
      return;
    }

    setTabReorderInsertIndex(insertIdx);
  }, [tabReorderDragId, dashboardTabs]);

  const handleTabReorderDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!tabReorderDragId || tabReorderInsertIndex === null) {
      setTabReorderDragId(null);
      setTabReorderInsertIndex(null);
      return;
    }

    const dragIdx = dashboardTabs.findIndex(t => t.id === tabReorderDragId);
    if (dragIdx === -1) return;

    // Don't move the default tab
    if (dashboardTabs[dragIdx]?.isDefault) return;

    // Calculate new order
    const newTabs = [...dashboardTabs];
    const [draggedTab] = newTabs.splice(dragIdx, 1);

    // Adjust insert index after removal
    let adjustedInsertIdx = tabReorderInsertIndex;
    if (dragIdx < tabReorderInsertIndex) {
      adjustedInsertIdx--;
    }

    // Ensure Main Dashboard stays at index 0
    if (adjustedInsertIdx < 1) adjustedInsertIdx = 1;

    newTabs.splice(adjustedInsertIdx, 0, draggedTab);

    setDashboardTabs(newTabs);
    setTabReorderDragId(null);
    setTabReorderInsertIndex(null);
    setDraggingTab(null);

    // Persist immediately to localStorage
    if (userId) {
      saveTilesToCache(userId, newTabs, activeTabId, customWidgets, refreshInterval);
    }

    // Also persist to server via dashboard-config edge function (updated tab_order indices)
    // Use setTimeout to avoid blocking the UI and ensure state is settled
    

    toast({
      title: 'Tab Reordered',
      description: `"${draggedTab.name}" moved to position ${adjustedInsertIdx + 1}`,
    });
  }, [dashboardTabs, tabReorderDragId, tabReorderInsertIndex, userId, activeTabId, customWidgets, refreshInterval, saveDashboardConfigs, toast]);



  const handleCrossTabDrop = useCallback((targetTabId: string) => {
    if (!crossTabDragTileId || targetTabId === activeTabId) {
      setDragOverTabId(null);
      return;
    }
    // Find the tile in the current (source) tab
    const sourceTab = dashboardTabs.find(t => t.id === activeTabId);
    const tile = sourceTab?.tiles.find(t => t.id === crossTabDragTileId);
    if (!tile) { setDragOverTabId(null); return; }

    // Calculate a good drop position in the target tab
    const targetTab = dashboardTabs.find(t => t.id === targetTabId);
    const targetTiles = targetTab?.tiles || [];
    const lowestY = targetTiles.length > 0
      ? Math.max(...targetTiles.map(t => t.position.y + t.size.height)) + 20
      : 20;

    // Move tile: remove from source, add to target with calculated position
    setDashboardTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return { ...tab, tiles: tab.tiles.filter(t => t.id !== crossTabDragTileId) };
      }
      if (tab.id === targetTabId) {
        const movedTile = {
          ...tile,
          position: { x: 0, y: lowestY },
          zIndex: maxZIndex + 1,
        };
        return { ...tab, tiles: [...tab.tiles, movedTile] };
      }
      return tab;
    }));
    setMaxZIndex(prev => prev + 1);
    setCrossTabDragTileId(null);
    setDragOverTabId(null);
    setReorderDragTileId(null);

    const targetName = dashboardTabs.find(t => t.id === targetTabId)?.name || 'tab';
    toast({
      title: 'Tile Moved',
      description: `"${tile.title}" moved to ${targetName}`,
    });
  }, [crossTabDragTileId, activeTabId, dashboardTabs, maxZIndex, toast]);


  // ============================================
  // SNAP-TO-GRID TOGGLE
  // ============================================
  const handleToggleSnapToGrid = useCallback(() => {
    const newVal = !snapToGridEnabled;
    setSnapToGridEnabled(newVal);
    localStorage.setItem('dashboard_snap_to_grid', String(newVal));
  }, [snapToGridEnabled]);

  const handleSnapGridSizeChange = useCallback((size: number) => {
    setSnapGridSize(size);
    localStorage.setItem('dashboard_snap_grid_size', String(size));
  }, []);

  // ============================================
  // TAB NAVIGATION (Left/Right arrows)
  // ============================================
  const navigateTab = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = dashboardTabs.findIndex(t => t.id === activeTabId);
    if (currentIndex === -1) return;
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % dashboardTabs.length
      : (currentIndex - 1 + dashboardTabs.length) % dashboardTabs.length;
    setActiveTabId(dashboardTabs[newIndex].id);
  }, [dashboardTabs, activeTabId]);


  // ============================================
  // COMPACT LAYOUT (Bin-packing)
  // ============================================
  const handleCompactLayout = useCallback(() => {
    setIsCompacting(true);
    const containerWidth = containerRef.current?.clientWidth || 1248; // Added this to prevent a ReferenceError!
    
    const tileRects: TileRect[] = tiles.map(t => ({
      id: t.id,
      x: t.position.x,
      y: t.position.y,
      width: t.size.width,
      height: t.size.height,
    }));
    const packed = compactLayout(tileRects, containerWidth);
    const posMap = new Map(packed.map(r => [r.id, { x: r.x, y: r.y }]));
    
    setDashboardTabs(prev => {
      const updatedTabs = prev.map(tab => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          tiles: tab.tiles.map(tile => {
            const newPos = posMap.get(tile.id);
            return newPos ? { ...tile, position: newPos } : tile;
          }),
        };
      });
      
      if (userId) saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
      return updatedTabs;
    });
    
    
    setTimeout(() => setIsCompacting(false), 450);
  }, [tiles, activeTabId, userId, customWidgets, refreshInterval, saveDashboardConfigs]);

  const handleAutoFormatLayout = useCallback(() => {
    setIsCompacting(true);
    const containerWidth = containerRef.current?.clientWidth || 1200;
    const GAP = 10;

    setDashboardTabs(prev => {
      const updatedTabs = prev.map(tab => {
        if (tab.id !== activeTabId) return tab;

        const sortedTiles = [...tab.tiles].sort((a, b) => {
          if (Math.abs(a.position.y - b.position.y) > 50) {
            return a.position.y - b.position.y;
          }
          return a.position.x - b.position.x;
        });

        const rows: TileConfig[][] = [];
        let currentRow: TileConfig[] = [];
        let currentY = sortedTiles.length > 0 ? sortedTiles[0].position.y : 0;

        sortedTiles.forEach(tile => {
          if (Math.abs(tile.position.y - currentY) <= 50) {
            currentRow.push(tile);
          } else {
            rows.push(currentRow);
            currentRow = [tile];
            currentY = tile.position.y;
          }
        });
        if (currentRow.length > 0) rows.push(currentRow);

        const newTiles: TileConfig[] = [];

        rows.forEach((row) => {
          const count = row.length;
          const baseWidth = Math.floor((containerWidth - (count - 1) * GAP) / count);

          row.forEach((tile, colIndex) => {
            const newX = colIndex * (baseWidth + GAP);
            const isLastInRow = colIndex === count - 1;
            const finalWidth = isLastInRow ? containerWidth - newX : baseWidth;

            let newY = 0;

            newTiles.forEach(placedTile => {
              const overlapsHorizontally = 
                newX < placedTile.position.x + placedTile.size.width + GAP &&
                newX + finalWidth + GAP > placedTile.position.x;

              if (overlapsHorizontally) {
                newY = Math.max(newY, placedTile.position.y + placedTile.size.height + GAP);
              }
            });

            newTiles.push({
              ...tile,
              position: { x: newX, y: newY },
              size: { width: finalWidth, height: tile.size.height }
            });
          });
        });

        return { ...tab, tiles: newTiles };
      });
      
      if (userId) saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
      return updatedTabs;
    });

    
    setTimeout(() => setIsCompacting(false), 450);
  }, [activeTabId, userId, customWidgets, refreshInterval, saveDashboardConfigs]);


  // ============================================
  // OVERLAP DETECTION & SNAP LINE CALLBACKS
  // ============================================
  const handleOverlapDetected = useCallback((tileId: string, overlappingIds: string[]) => {
    setOverlappedTileIds(prev => {
      const next = new Set(prev);
      if (overlappingIds.length > 0) {
        next.add(tileId);
        overlappingIds.forEach(id => next.add(id));
      } else {
        next.delete(tileId);
      }
      return next;
    });
  }, []);

  const handleSnapLinesChange = useCallback((lines: SnapLine[]) => {
    setActiveSnapLines(lines);
  }, []);

  const getLowestTileBottom = () => tiles.length === 0 ? 100 : Math.max(...tiles.map(t => t.position.y + t.size.height)) + 50;

  // Prepare allTilesData for ResizableTile's allTiles prop (with TILE_Y_OFFSET applied)
  // Prepare allTilesData for ResizableTile's allTiles prop (with TILE_Y_OFFSET applied)
  const allTilesData = tiles.map(t => ({ id: t.id, position: { x: t.position.x, y: t.position.y + TILE_Y_OFFSET }, size: t.size }));

  // ============================================
  // TILE COLOR CHANGE HANDLER
  // ============================================
  const handleTileColorChange = useCallback((tileId: string, newColor: string) => {
    setDashboardTabs(prev => prev.map(tab => tab.id !== activeTabId ? tab : {
      ...tab, tiles: tab.tiles.map(tile => tile.id === tileId ? { ...tile, glowColor: newColor as TileGlowColor } : tile)
    }));
  }, [activeTabId]);

  // ============================================
  // TAB ACCENT COLOR CHANGE HANDLER
  // ============================================
  // ============================================
// TAB ACCENT COLOR CHANGE HANDLER
// ============================================
const COLOR_PALETTE: Record<string, { color: string; rgb: string }> = {
  // Dynamic User Choices
  'theme-primary': { color: primaryColor, rgb: primaryRgb },
  'theme-accent': { color: accentColor, rgb: accentRgb },

  // Reds & Pinks
  red: { color: '#ef4444', rgb: '239,68,68' },
  ruby: { color: '#e11d48', rgb: '225,29,72' },
  raspberry: { color: '#e83f6f', rgb: '232,63,111' },
  coral: { color: '#fb7185', rgb: '251,113,133' },
  melon: { color: '#fca5a5', rgb: '252,165,165' },
  pink: { color: '#ec4899', rgb: '236,72,153' },
  fuchsia: { color: '#d946ef', rgb: '217,70,239' },
  magenta: { color: '#ff00ff', rgb: '255,0,255' },

  // Purples & Blues
  lilac: { color: '#d8b4fe', rgb: '216,180,254' },
  lavender: { color: '#c084fc', rgb: '192,132,252' },
  violet: { color: '#8b5cf6', rgb: '139,92,246' },
  purple: { color: '#a855f7', rgb: '168,85,247' },
  indigo: { color: '#6366f1', rgb: '99,102,241' },
  electric: { color: '#818cf8', rgb: '129,140,248' },
  blue: { color: '#3b82f6', rgb: '59,130,246' },
  azure: { color: '#007fff', rgb: '0,127,255' },
  
  // Cyans & Greens
  sky: { color: '#0ea5e9', rgb: '14,165,233' },
  cyan: { color: '#00ffff', rgb: '0,255,255' },
  teal: { color: '#14b8a6', rgb: '20,184,166' },
  mint: { color: '#34d399', rgb: '52,211,153' },
  emerald: { color: '#10b981', rgb: '16,185,129' },
  green: { color: '#22c55e', rgb: '34,197,94' },
  lime: { color: '#84cc16', rgb: '132,204,22' },
  chartreuse: { color: '#bfff00', rgb: '191,255,0' },

  // Yellows & Oranges
  yellow: { color: '#eab308', rgb: '234,179,8' },
  sunflower: { color: '#ffc300', rgb: '255,195,0' },
  gold: { color: '#fbbf24', rgb: '251,191,36' },
  amber: { color: '#f59e0b', rgb: '245,158,11' },
  peach: { color: '#fb923c', rgb: '251,146,60' },
  orange: { color: '#ff9900', rgb: '255,153,0' },
  tangerine: { color: '#f97316', rgb: '249,115,22' },

  // Neutrals
  zinc: { color: '#a1a1aa', rgb: '161,161,170' },
  slate: { color: '#94a3b8', rgb: '148,163,184' },
  silver: { color: '#d1d5db', rgb: '209,213,219' },
  platinum: { color: '#e5e7eb', rgb: '229,231,235' },
  white: { color: '#ffffff', rgb: '255,255,255' },
};

  const handleTabAccentColorChange = useCallback((tabId: string, newColor: string) => {
    setDashboardTabs(prev => prev.map(tab =>
      tab.id !== tabId ? tab : { ...tab, accentColor: newColor }
    ));
    setTabSettingsPopup(null);

    // Persist to localStorage immediately
    if (userId) {
      const updatedTabs = dashboardTabs.map(tab =>
        tab.id !== tabId ? tab : { ...tab, accentColor: newColor }
      );
      saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
    }

    // Persist to server via dashboard-config edge function
    // (The auto-save debounce will pick this up, but we also trigger explicitly)
    

    toast({
      title: 'Tab Color Updated',
      description: `Tab accent color changed to ${newColor}`,
    });
  }, [dashboardTabs, userId, activeTabId, customWidgets, refreshInterval, saveDashboardConfigs, toast]);

  const handleTabNewWindow = useCallback((tabId: string) => {
    const url = `${window.location.origin}/dashboard?tab=${tabId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleTabFullScreen = useCallback(() => {
    setFullScreenTabMode(prev => !prev);
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTabSettingsPopup({ tabId, x: e.clientX, y: e.clientY });
  }, []);

  // ============================================
  // INLINE TAB RENAME HANDLERS
  // ============================================
  const handleTabDoubleClick = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const tab = dashboardTabs.find(t => t.id === tabId);
    if (!tab) return;
    setRenamingTabId(tabId);
    setRenameValue(tab.name);
    // Focus the input after render
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [dashboardTabs]);

  const handleRenameConfirm = useCallback(() => {
    if (!renamingTabId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      // Revert if empty
      setRenamingTabId(null);
      setRenameValue('');
      return;
    }
    setDashboardTabs(prev => prev.map(tab =>
      tab.id !== renamingTabId ? tab : { ...tab, name: trimmed }
    ));
    // Persist to localStorage immediately
    if (userId) {
      const updatedTabs = dashboardTabs.map(tab =>
        tab.id !== renamingTabId ? tab : { ...tab, name: trimmed }
      );
      saveTilesToCache(userId, updatedTabs, activeTabId, customWidgets, refreshInterval);
    }
    // Persist to server
    
    toast({
      title: 'Tab Renamed',
      description: `Tab renamed to "${trimmed}"`,
    });
    setRenamingTabId(null);
    setRenameValue('');
  }, [renamingTabId, renameValue, dashboardTabs, userId, activeTabId, customWidgets, refreshInterval, saveDashboardConfigs, toast]);

  const handleRenameCancel = useCallback(() => {
    setRenamingTabId(null);
    setRenameValue('');
  }, []);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  }, [handleRenameConfirm, handleRenameCancel]);

  // Auto-focus rename input when renamingTabId changes
  useEffect(() => {
    if (renamingTabId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingTabId]);



  return (
      <div className="min-h-screen bg-black pb-24 px-4 overflow-x-hidden w-full relative">
        {/* ⚡ NEW: Global Custom Scrollbars & Dynamic Cut-Tabs */}
        <style>{`
          /* Dynamic Cut-Tab Styling */
          ${Object.entries(COLOR_PALETTE).map(([name, theme]) => `
            .cut-tab-${name}.cut-tab-active {
              color: ${theme.color} !important;
              text-shadow: 0 0 10px rgba(${theme.rgb}, 0.5) !important;
            }
            .cut-tab-${name}.cut-tab-active::before,
            .cut-tab-${name}.cut-tab-active::after {
              border-color: ${theme.color} !important;
              background-color: rgba(${theme.rgb}, 0.15) !important;
              box-shadow: inset 0 -2px 15px rgba(${theme.rgb}, 0.3) !important;
            }
            .cut-tab-${name}:not(.cut-tab-active):hover::before,
            .cut-tab-${name}:not(.cut-tab-active):hover::after {
              background-color: rgba(${theme.rgb}, 0.05) !important;
              border-color: rgba(${theme.rgb}, 0.4) !important;
            }
          `).join('')}

          /* WebKit (Chrome, Safari, Edge) */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(${primaryRgb}, 0.4);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(${primaryRgb}, 0.8);
          }
          ::-webkit-scrollbar-corner {
            background: transparent;
          }

          /* Firefox */
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(${primaryRgb}, 0.5) rgba(0, 0, 0, 0.2);
          }
        `}</style>

      {/* ⚡ FIX: Changed max-w-7xl to max-w-full to fill the screen width */}
      <div className="max-w-full mx-auto pt-4">
        {/* ─── Greeting + Role Badge + Toolbar ─── */}
        <div className="mb-4 flex items-center gap-4 flex-wrap w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal text-white font-['Goldman']">
              {getGreeting()}, <span className="text-theme-primary-400">{getUserName()}</span>
            </h1>
            {isOrgUser && organization && (
              <p className="text-sm text-gray-500 font-mono mt-0.5">{organization.name}</p>
            )}
          </div>

          {isPlatformOwner() && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-[0_0_12px_rgba(0,0,0,0.15)]"
              style={{
                // Background Gradient: Primary (left) -> Accent (right)
                background: `linear-gradient(to right, rgba(${primaryRgb}, 0.2), rgba(${accentRgb}, 0.2))`,
                borderColor: `rgba(${primaryRgb}, 0.4)`,
              }}
            >
              <svg 
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: primaryColor }} // Dynamic icon color
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span 
                className="text-xs font-mono font-bold bg-clip-text text-transparent tracking-wider uppercase"
                style={{
                  // Text Gradient: Primary -> Accent
                  backgroundImage: `linear-gradient(to right, ${primaryColor}, ${accentColor})`,
                  WebkitBackgroundClip: 'text'
                }}
              >
                Platform Owner Admin - GOD MODE
              </span>
            </div>
          )}
          {isOrgUser && (isOrganizationAdmin() || getUserRole?.() === 'organization_admin_user') && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-[0_0_12px_rgba(0,0,0,0.15)]"
              style={{
                background: `linear-gradient(to right, rgba(${primaryRgb}, 0.2), rgba(${accentRgb}, 0.2))`,
                borderColor: `rgba(${primaryRgb}, 0.4)`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: primaryColor }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span style={{ color: primaryColor }}>Owner</span>
                <span className="text-gray-500">//</span>
                <span 
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${primaryColor}, ${accentColor})`,
                    WebkitBackgroundClip: 'text'
                  }}
                >
                  Admin Clearance &gt; Unlimited Access
                </span>
              </span>
            </div>
          )}

          {/* ── Right-side toolbar icons (Moved UP!) ── */}
          <div className="ml-auto flex items-center gap-1.5">

            {/* ═══ LAYOUT DROPDOWN (Layouts + Library + Compact) ═══ */}
            <div className="relative">
              <button
                onClick={() => { setShowLayoutDropdown(!showLayoutDropdown); setShowSyncDropdown(false); setShowExportMenu(false); }}
                className="cut-tab cut-tab-theme-accent relative px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 text-gray-400 hover:text-theme-accent-400"
                title="Layout options"
              >
                <span className="relative z-[1] flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {showLayoutDropdown && (
                <div className="absolute top-full right-0 mt-1.5 bg-black/80 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 overflow-hidden min-w-[200px]">
                  <button
                    onClick={() => { setShowLayoutTemplates(true); setShowLayoutDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-theme-accent-500/10 hover:text-theme-accent-300 font-mono text-xs transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-accent-400 flex-shrink-0">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    Layout Templates
                  </button>
                  <button
                    onClick={() => { setShowWidgetLibrary(true); setShowLayoutDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-theme-primary-500/10 hover:text-theme-primary-300 font-mono text-xs transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-primary-400 flex-shrink-0">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    Widget Library
                  </button>
                  <div className="border-t border-gray-700/40 mx-2" />
                  <button
                    onClick={() => { handleCompactLayout(); setShowLayoutDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-green-500/10 hover:text-green-300 font-mono text-xs transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 flex-shrink-0">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <path d="M10 7h4M7 10v4M17 10v4M10 17h4" />
                    </svg>
                    Compact Layout
                  </button>
                  <button
                    onClick={() => { handleAutoFormatLayout(); setShowLayoutDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-blue-500/10 hover:text-blue-300 font-mono text-xs transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 flex-shrink-0">
                      <rect x="3" y="3" width="18" height="7" rx="1" />
                      <rect x="3" y="14" width="8" height="7" rx="1" />
                      <rect x="13" y="14" width="8" height="7" rx="1" />
                    </svg>
                    Auto-Format Rows
                  </button>
                  <div className="border-t border-gray-700/40 mx-2" />
                  {/* Snap-to-Grid Toggle */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={snapToGridEnabled ? 'text-theme-primary-400' : 'text-gray-500'}>
                          <rect x="3" y="3" width="18" height="18" rx="0" />
                          <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
                          <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                        </svg>
                        <span className="text-xs font-mono text-gray-300">Snap to Grid</span>
                      </div>
                      <button
                        onClick={handleToggleSnapToGrid}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${snapToGridEnabled ? 'bg-theme-primary-500/40 border border-theme-primary-500/60' : 'bg-gray-700 border border-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${snapToGridEnabled ? 'translate-x-4 bg-theme-primary-400' : 'translate-x-0.5 bg-gray-400'}`} />
                      </button>
                    </div>
                    {snapToGridEnabled && (
                      <div className="mt-2">
                        <p className="text-[10px] text-gray-500 font-mono mb-1.5">Grid Size</p>
                        <div className="flex items-center gap-1">
                          {[10, 20, 40, 60].map(size => (
                            <button
                              key={size}
                              onClick={() => handleSnapGridSizeChange(size)}
                              className={`px-2 py-1 rounded font-mono text-[10px] transition-all ${
                                snapGridSize === size
                                  ? 'bg-theme-primary-500/20 text-theme-primary-400 border border-theme-primary-500/40'
                                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-transparent'
                              }`}
                            >
                              {size}px
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ═══ SYNC DROPDOWN (Refresh Interval + Refresh + Cached + Pending + Sync) ═══ */}
            <div className="relative">
              <button
                onClick={() => { setShowSyncDropdown(!showSyncDropdown); setShowLayoutDropdown(false); setShowExportMenu(false); }}
                className={`cut-tab cut-tab-green relative px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 ${
                  offlineSyncState.pendingCount > 0 ? 'text-yellow-400' : 'text-gray-400 hover:text-green-400'
                }`}
                title="Sync & refresh options"
              >
                <span className="relative z-[1] flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  {offlineSyncState.pendingCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
                      </span>
                      <span className="tabular-nums">{offlineSyncState.pendingCount}</span>
                    </span>
                  )}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {showSyncDropdown && (
                <div className="absolute top-full right-0 mt-1.5 bg-black/80 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 overflow-hidden min-w-[220px]">
                  {/* Refresh Interval */}
                  <div className="px-4 py-2.5 border-b border-gray-700/40">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2">Refresh Interval</p>
                    <div className="flex items-center gap-1">
                      {REFRESH_INTERVAL_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleRefreshIntervalChange(opt.value)}
                          className={`px-2 py-1 rounded font-mono text-[10px] transition-all ${
                            refreshInterval === opt.value
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Refresh All */}
                  <button
                    onClick={() => { triggerGlobalRefresh(); setShowSyncDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-theme-primary-500/10 hover:text-theme-primary-300 font-mono text-xs transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-primary-400 flex-shrink-0">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Refresh All Tiles
                  </button>
                  {/* Cache status */}
                  <div className="border-t border-gray-700/40 mx-2" />
                  <div className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isSaving ? (
                          <>
                            <div className="w-2.5 h-2.5 border-[1.5px] border-theme-primary-500/30 border-t-theme-primary-500 rounded-full animate-spin" />
                            <span className="text-xs text-theme-primary-400 font-mono">Saving...</span>
                          </>
                        ) : saveError ? (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                            <span className="text-xs text-yellow-400 font-mono">Cached locally</span>
                          </>
                        ) : lastSaved ? (
                          <>
                            <CloudIcon size={12} className="text-green-400" />
                            <span className="text-xs text-green-400 font-mono">Saved</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                            <span className="text-xs text-gray-500 font-mono">No changes</span>
                          </>
                        )}
                      </div>
                      {saveError && (
                        <button
                          onClick={handleManualRetry}
                          className="text-[10px] text-yellow-400 hover:text-yellow-300 font-mono underline"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Pending changes + Sync Now */}
                  {offlineSyncState.pendingCount > 0 && (
                    <>
                      <div className="border-t border-gray-700/40 mx-2" />
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping opacity-60" />
                          </div>
                          <span className="text-xs text-yellow-400 font-mono">
                            {offlineSyncState.pendingCount} pending
                          </span>
                        </div>
                        <button
                          onClick={() => { handleSyncNow(); setShowSyncDropdown(false); }}
                          disabled={offlineSyncState.isSyncing || !offlineSyncState.isOnline}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 font-mono text-[10px] transition-all disabled:opacity-50"
                        >
                          {offlineSyncState.isSyncing ? (
                            <div className="w-2.5 h-2.5 border-[1.5px] border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                          )}
                          Sync Now
                        </button>
                      </div>
                    </>
                  )}
                  {/* Offline indicator */}
                  {!offlineSyncState.isOnline && (
                    <>
                      <div className="border-t border-gray-700/40 mx-2" />
                      <div className="px-4 py-2.5 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                        <span className="text-[10px] text-gray-500 font-mono">Offline — will sync when connected</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ═══ EXPORT / IMPORT — far right ═══ */}
            <div className="relative">
              <button
                onClick={() => { setShowExportMenu(!showExportMenu); setShowLayoutDropdown(false); setShowSyncDropdown(false); }}
                className="cut-tab cut-tab-orange relative px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 text-gray-400 hover:text-orange-400"
                title="Export / Import / Share"
              >
                <span className="relative z-[1] flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
              </button>
              {showExportMenu && (
                <div className="absolute top-full right-0 mt-1.5 bg-black/80 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 overflow-hidden min-w-[200px]">
                  <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-orange-500/10 hover:text-orange-300 font-mono text-xs transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 flex-shrink-0">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Export JSON
                  </button>
                  <button onClick={() => { setShowImportModal(true); setShowExportMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-orange-500/10 hover:text-orange-300 font-mono text-xs transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 flex-shrink-0">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Import JSON
                  </button>
                  <div className="border-t border-gray-700/40 mx-2" />
                  <button onClick={handleShareDashboard} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-theme-primary-500/10 hover:text-theme-primary-300 font-mono text-xs transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-primary-400 flex-shrink-0">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share Dashboard
                  </button>
                  <button onClick={() => { setShowPublishModal(true); setShowExportMenu(false); setPublishName(''); setPublishDescription(''); setPublishTags(''); setPublishSuccess(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-theme-accent-400 hover:bg-theme-accent-500/10 hover:text-theme-accent-300 font-mono text-xs transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Publish as Template
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>




        {/* Dashboard Tabs + Toolbar — CutTab styled */}
        <div
          className="flex items-center gap-1 mb-4 flex-nowrap overflow-visible"
          onDragOver={(e) => {
            // Handle tab reorder drag over the tab bar area
            if (tabReorderDragId) {
              handleTabReorderDragOver(e);
            }
          }}
          onDrop={(e) => {
            // Handle tab reorder drop
            if (tabReorderDragId) {
              handleTabReorderDrop(e);
            }
          }}
          onDragLeave={(e) => {
            // Clear insertion index when leaving the tab bar entirely
            const relatedTarget = e.relatedTarget as Node | null;
            const currentTarget = e.currentTarget as Node;
            if (!currentTarget.contains(relatedTarget) && tabReorderDragId) {
              setTabReorderInsertIndex(null);
            }
          }}
        >



          {/* ── Tab bar with reorder insertion lines ── */}
          {dashboardTabs.map((tab, tabIndex) => {
            const isActive = activeTabId === tab.id;
            const isDragOverTarget = dragOverTabId === tab.id && !isActive && !!crossTabDragTileId;
            const isCrossTabDragActive = !!crossTabDragTileId;
            const isTabReorderActive = !!tabReorderDragId;
            const isBeingDragged = tabReorderDragId === tab.id;
            const tileCount = tab.tiles.length;
            const showInsertBefore = tabReorderInsertIndex === tabIndex && isTabReorderActive;
            
            // ⚡ NEW: Pull the exact hex and rgb from the palette
            const tabColorHex = COLOR_PALETTE[tab.accentColor]?.color || '#00ffff';
            const tabColorRgb = COLOR_PALETTE[tab.accentColor]?.rgb || '0,255,255';

            return (
              <React.Fragment key={tab.id}>
                {/* theme-primary insertion line indicator BEFORE this tab */}
                {showInsertBefore && (
                  <div
                    className="flex-shrink-0 self-stretch flex items-center"
                    style={{ width: '4px', margin: '0 -2px', zIndex: 50 }}
                  >
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        background: 'linear-gradient(180deg, transparent 5%, rgba(0,255,255,0.8) 30%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 70%, transparent 95%)',
                        boxShadow: '0 0 8px rgba(0,255,255,0.6), 0 0 16px rgba(0,255,255,0.3)',
                        animation: 'tabInsertLinePulse 1s ease-in-out infinite',
                      }}
                    />
                  </div>
                )}
                <div
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.id, el);
                    else tabRefs.current.delete(tab.id);
                  }}
                  draggable={!tab.isDefault}
                  onDragStart={(e) => handleTabDragStart(e, tab.id)}
                  onDragEnd={handleTabDragEnd}
                  onClick={() => setActiveTabId(tab.id)}
                  onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                  onDragOver={(e) => {
                    if (crossTabDragTileId && tab.id !== activeTabId) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverTabId(tab.id);
                    }
                  }}
                  onDragEnter={(e) => {
                    if (crossTabDragTileId && tab.id !== activeTabId) {
                      e.preventDefault();
                      setDragOverTabId(tab.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    const relatedTarget = e.relatedTarget as Node | null;
                    const currentTarget = e.currentTarget as Node;
                    if (!currentTarget.contains(relatedTarget)) {
                      if (dragOverTabId === tab.id) setDragOverTabId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (crossTabDragTileId && tab.id !== activeTabId) {
                      handleCrossTabDrop(tab.id);
                      }
                    }}
                    // ⚡ NEW: Apply dynamic cut-tab color class
                    className={`cut-tab cut-tab-${tab.accentColor || 'theme-primary'} relative px-5 py-2 text-sm font-mono font-medium whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 group ${
                      isActive ? 'cut-tab-active' : 'text-gray-500 hover:text-gray-300'
                    } ${
                    isDragOverTarget ? 'scale-110 z-10' : isCrossTabDragActive && !isActive ? 'border-dashed' : ''
                  } ${isBeingDragged ? 'opacity-40' : 'cursor-pointer'} ${
                    tab.isDefault && isTabReorderActive ? 'cursor-not-allowed' : ''
                  }`}
                  // ⚡ NEW: Updated style to use dynamic palette colors
                  style={{
                    color: isActive ? tabColorHex : undefined,
                    transition: isBeingDragged ? 'opacity 200ms' : 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(isDragOverTarget ? {
                      boxShadow: `0 0 20px rgba(${tabColorRgb},0.4), 0 0 40px rgba(${tabColorRgb},0.15), inset 0 0 12px rgba(${tabColorRgb},0.08)`,
                      borderColor: `rgba(${tabColorRgb},0.7)`,
                      background: `linear-gradient(135deg, rgba(${tabColorRgb},0.12) 0%, rgba(${tabColorRgb},0.06) 50%, rgba(${tabColorRgb},0.12) 100%)`,
                    } : isCrossTabDragActive && !isActive ? {
                      borderColor: `rgba(${tabColorRgb},0.25)`,
                      background: `rgba(${tabColorRgb},0.03)`,
                    } : {}),
                  }}
                >
                  {isActive && <span className="cut-tab-shimmer-el" />}

                  {/* Animated theme-primary glow overlay for cross-tab tile drag-over target */}
                  {isDragOverTarget && (
                    <>
                      <span
                        className="absolute inset-0 rounded pointer-events-none"
                        style={{
                          animation: 'crossTabGlowPulse 1.2s ease-in-out infinite',
                          background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15) 0%, transparent 70%)',
                        }}
                      />
                      <span
                        className="absolute inset-0 rounded pointer-events-none border border-theme-primary-400/60"
                        style={{
                          animation: 'crossTabBorderPulse 1.2s ease-in-out infinite',
                        }}
                      />
                    </>
                  )}

                  {/* Subtle ready-to-receive indicator for non-active tabs during tile drag */}
                  {isCrossTabDragActive && !isActive && !isDragOverTarget && (
                    <span className="absolute inset-0 rounded pointer-events-none border border-dashed border-theme-primary-500/20" />
                  )}

                  <span className="relative z-[1] flex items-center gap-1.5">
                    {/* Lock icon for Main Dashboard during tab reorder */}
                    {tab.isDefault && isTabReorderActive && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 flex-shrink-0">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {/* Inline rename input OR tab name with double-click */}
                    {renamingTabId === tab.id ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleRenameConfirm}
                        onClick={(e) => e.stopPropagation()}
                        // ⚡ NEW: Removed Tailwind borders/text colors
                        className="bg-transparent border-b font-mono text-sm font-medium outline-none w-[120px] py-0 px-0"
                        // ⚡ NEW: Added dynamic inline styles
                        style={{ 
                          color: tabColorHex,
                          borderColor: `rgba(${tabColorRgb}, 0.6)`,
                          caretColor: tabColorHex 
                        }}
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => handleTabDoubleClick(e, tab.id)}
                        className="cursor-text select-none"
                        title="Double-click to rename"
                      >
                        {tab.name}
                      </span>
                    )}

                    {/* Tile count badge — visible during cross-tab drag OR tab reorder */}
                    {(isCrossTabDragActive || isTabReorderActive) && (
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-mono font-bold leading-none transition-all duration-200 ${
                        isDragOverTarget
                          ? 'bg-theme-primary-400/30 text-theme-primary-300 border border-theme-primary-400/50 shadow-[0_0_8px_rgba(0,255,255,0.3)]'
                          : isActive
                            ? 'bg-theme-primary-500/15 text-theme-primary-500/60 border border-theme-primary-500/20'
                            : 'bg-gray-800/60 text-gray-500 border border-gray-700/40'
                      }`}>
                        {tileCount}
                      </span>
                    )}

                    {/* Drop here label for cross-tab tile drag-over target */}
                    {isDragOverTarget && (
                      <span className="flex items-center gap-1 ml-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-theme-primary-400">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <span className="text-[9px] text-theme-primary-400 font-mono font-bold tracking-wide">DROP</span>
                      </span>
                    )}

                    {/* Hover action icons: Gear (color picker), New Window, Fullscreen — hidden during drag */}
                    {!isCrossTabDragActive && !isTabReorderActive && (
                      <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-0.5">
                        {/* New Window icon */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTabNewWindow(tab.id); }}
                          className="p-0.5 rounded hover:bg-white/10 transition-colors"
                          title="Open in new window"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-white">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </button>
                        {/* Fullscreen icon */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTabFullScreen(); }}
                          className="p-0.5 rounded hover:bg-white/10 transition-colors"
                          title="Toggle fullscreen"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-white">
                            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                          </svg>
                        </button>
                      </span>
                    )}

                    {/* Delete tab button (not during any drag) */}
                    {!tab.isDefault && !isCrossTabDragActive && !isTabReorderActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTab(tab.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded ml-0.5"
                      >
                        <CloseIcon size={11} className="text-red-400" />
                      </button>
                    )}

                  </span>
                </div>
              </React.Fragment>
            );
          })}

          {/* Insertion line AFTER the last tab (when dropping at the end) */}
          {tabReorderInsertIndex === dashboardTabs.length && !!tabReorderDragId && (
            <div
              className="flex-shrink-0 self-stretch flex items-center"
              style={{ width: '4px', margin: '0 -2px', zIndex: 50 }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: 'linear-gradient(180deg, transparent 5%, rgba(0,255,255,0.8) 30%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 70%, transparent 95%)',
                  boxShadow: '0 0 8px rgba(0,255,255,0.6), 0 0 16px rgba(0,255,255,0.3)',
                  animation: 'tabInsertLinePulse 1s ease-in-out infinite',
                }}
              />
            </div>
          )}

          {/* + New Tab */}
          <button
            onClick={() => setShowAddTabModal(true)}
            className="cut-tab cut-tab-theme-primary relative px-4 py-2 text-sm font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-1 flex-shrink-0 text-gray-600 hover:text-theme-primary-400"
          >
            <span className="relative z-[1] flex items-center gap-1">
              <PlusIcon size={13} />
              <span className="hidden sm:inline">New Tab</span>
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {stats.map((stat, i) => <StatCard key={i} {...stat} />)}
        </div>

        {/* Pinned Report Widgets for the active dashboard tab */}
        <PinnedReportsStrip dashboardId={activeTabId} label={currentTab?.name} />


        {pinnedWidgets.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                  <path d="M16 2L14.5 3.5L18.5 7.5L20 6C20 6 21 5 20 4L18 2C17 1 16 2 16 2Z" />
                  <path d="M12.5 5.5L5 13L5 17L9 17L16.5 9.5L12.5 5.5Z" />
                  <path d="M2 22L7 17" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-mono font-bold text-lg">Pinned Widgets</h2>
                <p className="text-gray-500 font-mono text-xs">Widgets pinned from your workspaces</p>
              </div>
            </div>
            <div className="space-y-6">
              {pinnedWidgets.map((pw) => (
                <div key={pw.id} className="relative group">
                  <button onClick={() => handleUnpinWidget(pw.id)}
                    className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/90 border border-red-500/40 rounded-lg text-red-400 font-mono text-xs opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 hover:border-red-500/60"
                    title="Unpin from dashboard"
                  >
                    <CloseIcon size={12} /> Unpin
                  </button>
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/80 border border-gray-700 rounded-lg">
                    <span className="text-gray-400 font-mono text-[9px]">from {pw.source_workspace || 'security'}</span>
                  </div>
                  {pw.widget_type === 'security_overview' && <SecurityOverviewDashboard />}
                  {pw.widget_type === 'threat_heatmap' && <ThreatGeoHeatmap />}
                  {pw.widget_type === 'live_ip_feed' && <LiveIPFeed />}
                  {pw.widget_type === 'local_network' && <LocalNetworkPanel />}
                  {!['security_overview', 'threat_heatmap', 'live_ip_feed', 'local_network'].includes(pw.widget_type) && (
                    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6 text-center">
                      <p className="text-gray-400 font-mono text-sm">Widget: {pw.title || pw.widget_type}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {pinnedLoading && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
            <span className="text-orange-400 font-mono text-sm">Loading pinned widgets...</span>
          </div>
        )}

        {/* Resizable Tiles Container */}
        <div
          ref={containerRef}
          className="relative w-full max-w-full overflow-x-hidden"
          style={{
            minHeight: `${getLowestTileBottom() + 220}px`,
            ...(snapToGridEnabled ? {
              backgroundImage: `repeating-linear-gradient(0deg, rgba(0,255,255,0.04) 0px, transparent 1px, transparent ${snapGridSize}px), repeating-linear-gradient(90deg, rgba(0,255,255,0.04) 0px, transparent 1px, transparent ${snapGridSize}px)`,
              backgroundSize: `${snapGridSize}px ${snapGridSize}px`,
            } : {}),
          }}
        >

          {/* ── Left/Right Tab Navigation Chevron Arrows ── */}
          {dashboardTabs.length > 1 && (
            <>
              {/* Left Arrow */}
              <button
                onClick={() => navigateTab('prev')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-[100] w-10 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md border border-gray-700/40 rounded-r-xl text-gray-500 hover:text-theme-primary-400 hover:bg-black/60 hover:border-theme-primary-500/40 hover:shadow-[0_0_16px_rgba(0,255,255,0.15)] transition-all duration-300 opacity-60 hover:opacity-100 group"
                title="Previous tab"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:-translate-x-0.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              {/* Right Arrow */}
              <button
                onClick={() => navigateTab('next')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-[100] w-10 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md border border-gray-700/40 rounded-l-xl text-gray-500 hover:text-theme-primary-400 hover:bg-black/60 hover:border-theme-primary-500/40 hover:shadow-[0_0_16px_rgba(0,255,255,0.15)] transition-all duration-300 opacity-60 hover:opacity-100 group"
                title="Next tab"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}


          {/* Snap lines rendered during drag */}
          {activeSnapLines.map((line, i) => (
            line.type === 'vertical' ? (
              <div key={`snap-${i}`} className="absolute pointer-events-none" style={{
                left: `${line.position}px`, top: `${line.start}px`,
                width: '1px', height: `${line.end - line.start}px`,
                borderLeft: '1px dashed rgba(0, 255, 255, 0.7)',
                boxShadow: '0 0 6px rgba(0, 255, 255, 0.4)',
                zIndex: 9998,
              }} />
            ) : (
              <div key={`snap-${i}`} className="absolute pointer-events-none" style={{
                left: `${line.start}px`, top: `${line.position}px`,
                width: `${line.end - line.start}px`, height: '1px',
                borderTop: '1px dashed rgba(0, 255, 255, 0.7)',
                boxShadow: '0 0 6px rgba(0, 255, 255, 0.4)',
                zIndex: 9998,
              }} />
            )
          ))}

          {tiles.map((tile) => {
            const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === tile.widgetId);
            const refreshState = tileRefreshStates[tile.id];
            
            // ⚡ LIVE REFLOW: Animate background tiles to their preview slot (exclude the active drag tile)
            const isBeingDragged = reorderDragTileId === tile.id;
            const preview = !isBeingDragged ? previewLayout?.[tile.id] : null;

            const displayX = preview?.x ?? tile.position.x;
            const displayY = preview?.y ?? tile.position.y;
            const displayWidth = preview?.width ?? tile.size.width;
            const displayHeight = preview?.height ?? tile.size.height;

            return (
              <ResizableTile key={tile.id} id={tile.id} initialWidth={displayWidth} initialHeight={displayHeight}
                position={{ x: displayX, y: displayY + TILE_Y_OFFSET }} zIndex={tile.zIndex}
                onPositionChange={handlePositionChange}
                onSizeChange={handleSizeChange}
                onSizeChangeEnd={handleSizeChangeEnd}
                onZIndexChange={handleZIndexChange}
                glowColor={tile.glowColor} minWidth={widgetDef?.minWidth || 200} minHeight={widgetDef?.minHeight || 150}
                maxWidth={1400} maxHeight={1200} onClose={() => handleRemoveWidget(tile.id)}
                onNewWindow={() => window.open(getWidgetUrl(tile.widgetId), '_blank', 'noopener,noreferrer')}
                onFullScreen={() => handleFullScreen(tile.id)}
                onRefresh={() => handleRefreshSingle(tile.id)}
                onColorChange={handleTileColorChange}
                isRefreshing={refreshState?.isRefreshing || false}
                lastRefreshed={refreshState?.lastRefreshed || null}
                canDelete={true}
                canDrag={true}
                allTiles={allTilesData}
                hasUnsavedChanges={offlineSyncState.unsavedTileIds.has(tile.id)}
                isCompacting={isCompacting}
                tileTitle={tile.title}

                onReorderDragStart={handleReorderDragStart}
                onReorderDragOver={handleReorderDragOver}
                onReorderDrop={handleReorderDrop}
                onReorderDragEnd={handleReorderDragEnd}
                isDropTarget={false} // We no longer need glowing borders since tiles physically move out of the way!
                isDragSource={reorderDragTileId === tile.id}
                isOverlapped={overlappedTileIds.has(tile.id)}
                onOverlapDetected={(ids: string[]) => handleOverlapDetected(tile.id, ids)}
                onSnapLinesChange={handleSnapLinesChange}
              >
                {renderTileContent(tile)}
              </ResizableTile>


            );
          })}





          {/* Add Tile / Browse Library / Layouts buttons at the bottom */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: `${getLowestTileBottom() + 10}px` }}>
            <div className="flex flex-col items-center gap-3">
              <AddTileButton onClick={() => setShowAddWidgetModal(true)} label="Add Widget" />
              <div className="flex items-center gap-3">
                <button onClick={() => setShowWidgetLibrary(true)}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-theme-primary-500/30 bg-theme-primary-500/5 text-theme-primary-400 hover:bg-theme-primary-500/10 hover:border-theme-primary-500/50 transition-all duration-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span className="font-mono text-xs font-medium">Browse Library</span>
                </button>
                <button onClick={() => setShowLayoutTemplates(true)}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-theme-accent-500/30 bg-theme-accent-500/5 text-theme-accent-400 hover:bg-theme-accent-500/10 hover:border-theme-accent-500/50 transition-all duration-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  <span className="font-mono text-xs font-medium">Layouts</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Add Widget Hub (replaces old simple modal) ─── */}
      <AddWidgetHub
        isOpen={showAddWidgetModal}
        onClose={() => setShowAddWidgetModal(false)}
        availableWidgets={getAvailableWidgets()}
        onAddWidget={(widget) => handleAddWidget(widget as WidgetDefinition)}
        onAddCatalogWidget={handleAddCatalogWidget}
        addedWidgetIds={libraryAddedIds}
        customWidgets={customWidgets}
        onApplyTemplate={handleApplyTemplate}
        currentTileCount={tiles.length}
        onOpenCustomWizard={() => { setShowAddWidgetModal(false); setShowCustomWizard(true); }}
        onOpenWidgetLibrary={() => { setShowAddWidgetModal(false); setShowWidgetLibrary(true); }}
        onOpenLayoutTemplates={() => { setShowAddWidgetModal(false); setShowLayoutTemplates(true); }}
      />


      {/* ─── Add Tab Modal with Templates ─── */}
      {showAddTabModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowAddTabModal(false); setSelectedTabTemplate(null); setNewTabName(''); }} />
          <div className="relative bg-black border border-theme-primary-500/50 rounded-xl p-6 w-full max-w-lg mx-4 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-mono font-bold text-white">New Dashboard Tab</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">Start blank or choose a template</p>
              </div>
              <button onClick={() => { setShowAddTabModal(false); setSelectedTabTemplate(null); setNewTabName(''); }} className="p-2 text-gray-400 hover:text-white"><CloseIcon size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">Tab Name</label>
                <input type="text" value={newTabName} onChange={(e) => setNewTabName(e.target.value)} placeholder="Enter tab name..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-theme-primary-500/50" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && newTabName.trim()) handleAddTab(); }}
                />
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">Template <span className="text-gray-600">(optional)</span></label>
                <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {/* Blank option */}
                  <button
                    onClick={() => setSelectedTabTemplate(null)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedTabTemplate === null
                        ? 'border-theme-primary-500/60 bg-theme-primary-500/10 shadow-[0_0_12px_rgba(0,255,255,0.1)]'
                        : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                      selectedTabTemplate === null ? 'bg-theme-primary-500/20 border-theme-primary-500/40' : 'bg-gray-900 border-gray-700'
                    }`}>
                      <PlusIcon size={16} className={selectedTabTemplate === null ? 'text-theme-primary-400' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-mono font-medium ${selectedTabTemplate === null ? 'text-theme-primary-400' : 'text-gray-300'}`}>Blank Tab</p>
                      <p className="text-[10px] text-gray-600 font-mono">Start with an empty canvas</p>
                    </div>
                    {selectedTabTemplate === null && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-theme-primary-400 flex-shrink-0"><polyline points="20,6 9,17 4,12" /></svg>
                    )}
                  </button>

                  {/* Template options */}
                  {TAB_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTabTemplate === tmpl.id;
                    const colorMap: Record<string, { text: string; bg: string; border: string; dot: string }> = {
                      green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/60', dot: 'bg-green-500' },
                      'theme-primary': { text: 'text-theme-primary-400', bg: 'bg-theme-primary-500/10', border: 'border-theme-primary-500/60', dot: 'bg-theme-primary-500' },
                      red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/60', dot: 'bg-red-500' },
                      magenta: { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/60', dot: 'bg-fuchsia-500' },
                      'theme-accent': { text: 'text-theme-accent-400', bg: 'bg-theme-accent-500/10', border: 'border-theme-accent-500/60', dot: 'bg-theme-accent-500' },
                    };
                    const c = colorMap[tmpl.accentColor] || colorMap['theme-primary'];
                    const iconMap: Record<string, React.ReactNode> = {
                      chart: <TrendingUpIcon size={16} className={isSelected ? c.text : 'text-gray-500'} />,
                      users: <UsersIcon size={16} className={isSelected ? c.text : 'text-gray-500'} />,
                      shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isSelected ? c.text : 'text-gray-500'}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
                      bolt: <ActivityIcon size={16} className={isSelected ? c.text : 'text-gray-500'} />,
                      crown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isSelected ? c.text : 'text-gray-500'}><path d="M2 20h20l-3-12-5 5-4-8-4 8-5-5z" /></svg>,
                    };
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => {
                          setSelectedTabTemplate(tmpl.id);
                          if (!newTabName.trim()) setNewTabName(tmpl.name);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          isSelected ? `${c.border} ${c.bg}` : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                          isSelected ? `${c.bg} ${c.border}` : 'bg-gray-900 border-gray-700'
                        }`}>
                          {iconMap[tmpl.icon] || <PlusIcon size={16} className="text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-mono font-medium ${isSelected ? c.text : 'text-gray-300'}`}>{tmpl.name}</p>
                          <p className="text-[10px] text-gray-600 font-mono">{tmpl.description} &middot; {tmpl.tiles.length} widgets</p>
                        </div>
                        {isSelected && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`${c.text} flex-shrink-0`}><polyline points="20,6 9,17 4,12" /></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowAddTabModal(false); setSelectedTabTemplate(null); setNewTabName(''); }} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono">Cancel</button>
                <button onClick={handleAddTab} disabled={!newTabName.trim()} className="flex-1 py-3 bg-theme-primary-500/20 border border-theme-primary-500/50 text-theme-primary-400 rounded-lg hover:bg-theme-primary-500/30 font-mono disabled:opacity-50">
                  {selectedTabTemplate ? 'Create from Template' : 'Create Tab'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ─── Reset Layout Confirmation ─── */}
      {showResetConfirm && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-black border border-orange-500/50 rounded-xl p-6 w-full max-w-sm mx-4 shadow-[0_0_40px_rgba(255,153,0,0.2)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                <RefreshIcon size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Reset Layout</h3>
                <p className="text-xs text-gray-500 font-mono">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 font-mono mb-6">Reset dashboard layout to defaults?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">Cancel</button>
              <button onClick={handleResetLayout} className="flex-1 py-2.5 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 font-mono text-sm">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Import Modal ─── */}
      {showImportModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowImportModal(false); setImportError(null); }} />
          <div className="relative bg-black border border-theme-primary-500/50 rounded-xl p-6 w-full max-w-lg mx-4 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Import Dashboard</h3>
                <p className="text-xs text-gray-500 font-mono">Upload a JSON file or paste a share code</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportError(null); }} className="p-2 text-gray-400 hover:text-white"><CloseIcon size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Upload JSON File</label>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-700 bg-gray-950/50 text-gray-400 hover:border-theme-primary-500/50 hover:text-theme-primary-400 transition-all font-mono text-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Choose File
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-600 font-mono">OR</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Paste Share Code or JSON</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste exported JSON or share code here..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-theme-primary-500/50 placeholder:text-gray-700 h-32 resize-none"
                />
              </div>
              {importError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{importError}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowImportModal(false); setImportError(null); }} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">Cancel</button>
                <button onClick={() => {
                  try {
                    const decoded = atob(importData.trim());
                    setImportData(decoded);
                    handleImportFromText();
                  } catch {
                    handleImportFromText();
                  }
                }} disabled={!importData.trim()} className="flex-1 py-2.5 bg-theme-primary-500/20 border border-theme-primary-500/50 text-theme-primary-400 rounded-lg hover:bg-theme-primary-500/30 font-mono text-sm disabled:opacity-50">Import</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Share Code Modal ─── */}
      {shareCode && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShareCode(null)} />
          <div className="relative bg-black border border-theme-primary-500/50 rounded-xl p-6 w-full max-w-lg mx-4 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-primary-500/20 border border-theme-primary-500/40 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-primary-400">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-white">Share Dashboard</h3>
                  <p className="text-xs text-gray-500 font-mono">Copy this code to share your layout</p>
                </div>
              </div>
              <button onClick={() => setShareCode(null)} className="p-2 text-gray-400 hover:text-white"><CloseIcon size={20} /></button>
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={shareCode || ''}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-theme-primary-400 font-mono text-[10px] focus:outline-none h-32 resize-none"
              />
              <button
                onClick={() => { 
                  navigator.clipboard.writeText(shareCode || '').catch(err => {
                    console.warn('Clipboard permission denied by iframe policy. Please copy manually.', err);
                  }); 
                }}
                className="absolute top-2 right-2 px-3 py-1.5 bg-theme-primary-500/10 border border-theme-primary-500/40 rounded-lg text-theme-primary-400 font-mono text-xs hover:bg-theme-primary-500/20 transition-all"
              >
                Copy
              </button>
            </div>
            <p className="text-[10px] text-gray-600 font-mono mt-3">Others can import this code using the Import function to clone your dashboard layout.</p>
          </div>
        </div>
      )}

      {/* ─── Publish as Template Modal ─── */}
      {showPublishModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPublishModal(false)} />
          <div className="relative bg-black border border-theme-accent-500/50 rounded-xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(128,0,255,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-accent-500/20 border border-theme-accent-500/40 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-accent-400">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-white">Publish Template</h3>
                  <p className="text-xs text-gray-500 font-mono">Share your dashboard layout with others</p>
                </div>
              </div>
              <button onClick={() => setShowPublishModal(false)} className="p-2 text-gray-400 hover:text-white"><CloseIcon size={20} /></button>
            </div>
            {publishSuccess ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/40 flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </div>
                <p className="text-green-400 font-mono font-medium">Template Published!</p>
                <p className="text-gray-500 font-mono text-xs mt-1">Others can now discover and clone your layout.</p>
                <button onClick={() => setShowPublishModal(false)} className="mt-4 px-6 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 font-mono text-sm hover:text-white">Close</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Template Name</label>
                  <input type="text" value={publishName} onChange={(e) => setPublishName(e.target.value)} placeholder="My Awesome Layout"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-theme-accent-500/50 placeholder:text-gray-700" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea value={publishDescription} onChange={(e) => setPublishDescription(e.target.value)} placeholder="Describe your layout..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-theme-accent-500/50 placeholder:text-gray-700 h-20 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Tags (comma-separated)</label>
                  <input type="text" value={publishTags} onChange={(e) => setPublishTags(e.target.value)} placeholder="productivity, security, analytics"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-theme-accent-500/50 placeholder:text-gray-700" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPublishModal(false)} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">Cancel</button>
                  <button
                    onClick={async () => {
                      if (!publishName.trim()) return;
                      setIsPublishing(true);
                      try {
                        const configJson = {
                          version: 1, tabs: dashboardTabs.map(tab => ({ id: tab.id, name: tab.name, tiles: tab.tiles.map(serializeTile), isDefault: tab.isDefault })),
                          customWidgets, refreshInterval, activeTabId,
                        };
                        const tags = publishTags.split(',').map(t => t.trim()).filter(Boolean);
                        // Generate SVG preview thumbnail from tile positions
                        const previewSvg = generatePreviewSvg(configJson);
                        // Publish via dashboard-config edge function (routes to app_private)
                        const { data: publishResp, error: publishErr } = await supabase.functions.invoke('dashboard-config', {
                          body: {
                            action: 'publish_template',
                            creator_id: userId || 'anonymous',
                            name: publishName.trim(),
                            description: publishDescription.trim(),
                            config_json: configJson,
                            tags: tags,
                            is_public: true,
                            preview_thumbnail: previewSvg,
                          }
                        });
                        if (publishErr) {
                          console.error('Publish edge function error:', publishErr);
                        }
                        if (publishResp?.success || !publishErr) {
                          setPublishSuccess(true);
                        } else {
                          console.error('Publish failed:', publishResp?.error);
                        }
                      } catch (e) { console.error('Publish failed:', e); }
                      setIsPublishing(false);
                    }}

                    disabled={!publishName.trim() || isPublishing}
                    className="flex-1 py-2.5 bg-theme-accent-500/20 border border-theme-accent-500/50 text-theme-accent-400 rounded-lg hover:bg-theme-accent-500/30 font-mono text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPublishing && <div className="w-3.5 h-3.5 border-[1.5px] border-theme-accent-500/30 border-t-theme-accent-400 rounded-full animate-spin" />}
                    Publish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Widget Library Panel (slide-over) ─── */}
      <WidgetLibraryPanel
        isOpen={showWidgetLibrary}
        onClose={() => setShowWidgetLibrary(false)}
        onAddWidget={handleAddCatalogWidget}
        onSaveCustomWidget={handleSaveCustomWidget}
        addedWidgetIds={libraryAddedIds}
        customWidgets={customWidgets}
      />

      {/* ─── Layout Templates Modal ─── */}
      <LayoutTemplatesModal
        isOpen={showLayoutTemplates}
        onClose={() => setShowLayoutTemplates(false)}
        onApplyTemplate={handleApplyTemplate}
        onCloneSharedTemplate={(config: any) => {
          if (config?.tabs && Array.isArray(config.tabs)) {
            const importedTabs: DashboardTab[] = config.tabs.map((t: any) => ({ id: t.id, name: t.name, tiles: Array.isArray(t.tiles) ? t.tiles : [], isDefault: t.isDefault }));
            setDashboardTabs(importedTabs);
            if (config.customWidgets) setCustomWidgets(config.customWidgets);
            if (config.refreshInterval) setRefreshInterval(config.refreshInterval);
            if (config.activeTabId) setActiveTabId(config.activeTabId);
          }
        }}
        currentTileCount={tiles.length}
        userId={userId}
      />

      {/* ─── Custom Widget Wizard (standalone, opened from AddWidgetHub) ─── */}
      <CustomWidgetWizard
        isOpen={showCustomWizard}
        onClose={() => setShowCustomWizard(false)}
        onSave={handleSaveCustomWidget}
      />


      {/* ─── Sync Conflict Modal ─── */}
      {activeConflict && (
        <SyncConflictModal
          conflict={activeConflict}
          onResolved={handleConflictResolved}
          onDismiss={handleConflictDismiss}
        />
      )}

      {/* ─── Tab Settings / Color Picker Popup ─── */}
      {tabSettingsPopup && (
        <>
          {/* Click-away overlay for settings popup */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setTabSettingsPopup(null)}
          />
          {/* Settings dropdown */}
          <div
            className="fixed z-[9999] bg-black/90 backdrop-blur-xl border border-gray-700/60 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_20px_rgba(0,255,255,0.08)] p-3 min-w-[160px]"
            style={{
              left: `${tabSettingsPopup.x}px`,
              top: `${tabSettingsPopup.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rename Tab Button */}
            <button
              onClick={() => {
                const tab = dashboardTabs.find(t => t.id === tabSettingsPopup.tabId);
                if (tab) {
                  setRenamingTabId(tab.id);
                  setRenameValue(tab.name);
                  setTabSettingsPopup(null);
                  setTimeout(() => renameInputRef.current?.focus(), 50);
                }
              }}
              className="w-full flex items-center gap-2 px-2 py-2 mb-2 text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Rename Tab
            </button>

            <div className="border-t border-gray-700/50 mb-3 mx-1" />

            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2.5 px-0.5">Tab Color</p>
            {/* ⚡ FIX: Changed to grid-cols-6 and mapped over the new COLOR_PALETTE */}
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(COLOR_PALETTE).map(([key, { color }]) => {
                const currentTab = dashboardTabs.find(t => t.id === tabSettingsPopup.tabId);
                const isSelected = (currentTab?.accentColor || 'theme-primary') === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => handleTabAccentColorChange(tabSettingsPopup.tabId, key)}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${color}30`, 
                      borderColor: color, 
                      boxShadow: isSelected ? `0 0 15px ${color}80` : `0 0 8px ${color}40`
                    }}
                    title={key}
                  >
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            {/* ⚡ FIX: Simplified the label text to just grab the active string key */}
            <p className="text-[10px] text-gray-500 font-mono mt-2 text-center capitalize">
              {(dashboardTabs.find(t => t.id === tabSettingsPopup.tabId)?.accentColor || 'theme-primary')}
            </p>
          </div>
        </>
      )}

      {/* Click-away handler for dropdowns */}
      {(showLayoutDropdown || showSyncDropdown || showExportMenu || showRefreshDropdown) && (
        <div className="fixed inset-0 z-[40]" onClick={() => { setShowLayoutDropdown(false); setShowSyncDropdown(false); setShowExportMenu(false); setShowRefreshDropdown(false); setTabSettingsPopup(null); }} />
      )}




    </div>
  );
};

export default PersonalDashboard;