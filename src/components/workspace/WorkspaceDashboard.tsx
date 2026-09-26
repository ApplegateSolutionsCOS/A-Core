import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TrendingUpIcon,
  BarChartIcon,
  ActivityIcon,
  UsersIcon,
  FileIcon,
  PlusIcon,
  SettingsIcon,
  TaskIcon,
  CalendarIcon,
  ShieldIcon,
  HomeIcon,
  DatabaseIcon,
  BuildIcon,
  CloudIcon,
  CloseIcon,
  StarIcon,
  PopoutIcon,
  CpuIcon,
  GripVerticalIcon,
  ChevronDownIcon,
  MaximizeIcon,
  SearchIcon,
  TrashIcon
} from '@/components/icons/Icons';

import { MessageSquare, MessagesSquare, Activity, CheckSquare, Mail, LayoutDashboard, Megaphone } from 'lucide-react';
import * as LucideIcons from 'lucide-react'; // ⚡ ADD THIS LINE

// Helper to safely map lowercase/dash-case DB icon strings to Lucide's PascalCase exports
const resolveDashboardIcon = (iconStr: string | null | undefined, appName: string) => {
  if (!iconStr || iconStr === 'grid') return getMiniAppIcon(appName);
  
  // ⚡ FIX: Convert dash-case to PascalCase safely (e.g., 'alarm-clock' -> 'AlarmClock')
  const pascalIcon = iconStr.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  
  return (LucideIcons as any)[pascalIcon] || getMiniAppIcon(appName);
};

import { WORKSPACE_DEFINITIONS, WorkspaceSlug } from '@/types';
import { supabase } from '@/lib/supabase';


import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor, COLOR_MAP } from '@/contexts/WorkspaceColorContext';
import WorkspaceSettings from './WorkspaceSettings';
import MiniAppView from '@/components/miniapp/MiniAppView';
import MiniAppBuilder from '@/components/miniapp/MiniAppBuilder';
import ResizableTile from '@/components/dashboard/ResizableTile';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';
import MiniAppContextMenu from '@/components/miniapp/MiniAppContextMenu';
import MiniAppAdvancedSettings from '@/components/miniapp/MiniAppAdvancedSettings';
import WorkflowBuilder from '@/components/miniapp/WorkflowBuilder';
import SecurityWorkspaceView from './SecurityWorkspaceView';
import { logActivityImmediate } from '@/lib/activityLogger';
import LeftSlidePanel from '@/components/navigation/LeftSlidePanel';

// Mapping human-readable slugs to their unique Database UUIDs
const WORKSPACE_ID_MAP: Record<string, string> = {
  'admin': '9c5d12fb-1305-451c-9ff6-699bccbbf354', // Replace with actual UUID
  'personnel': '80d960f3-16f2-4f93-9eb9-8cad53594112',
  'data': '38af3278-30a7-451e-b691-8b55b741aaf5',
  'main': '22bda45d-c323-41c7-9025-566dbcef06c0',
  'security': '1759127c-2fba-4629-b63b-f27e4e0c39d8',
  'accounting': '09bd9db0-eb92-4089-9981-f01e7ed2882b',
};


const MAX_MINI_APPS_PER_WORKSPACE = 120;

// TrendingDownIcon
const TrendingDownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
    <polyline points="17,18 23,18 23,12" />
  </svg>
);

const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

const ShrinkIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8M9 9 3 3m6 6V4.2M9 9H4.2" />
  </svg>
);

const ExpandIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8M3 3l6 6M3 3v4.8M3 3h4.8" />
  </svg>
);

// Workspace icon components
const WorkspaceIcon: React.FC<{ slug: string; size?: number; className?: string }> = ({ slug, size = 24, className = '' }) => {
  const iconProps = { size, className };
  switch (slug) {
    case 'admin': return <ShieldIcon {...iconProps} />;
    case 'accounting': return <BarChartIcon {...iconProps} />;
    case 'personnel': return <UsersIcon {...iconProps} />;
    case 'main': return <HomeIcon {...iconProps} />;
    case 'data': return <DatabaseIcon {...iconProps} />;
    case 'security': return <BuildIcon {...iconProps} />;
    default: 
      // ⚡ FIX: If it isn't a global workspace, grab it from the custom library!
      const CustomIcon = getMiniAppIcon(slug);
      return <CustomIcon {...iconProps} />;
  }
};

interface WorkspaceDashboardProps {
  workspaceSlug: WorkspaceSlug;
  onOpenMiniApp: (appSlug: string) => void;
  onOpenSettings: () => void;
  isAdmin: boolean;
  initialMiniApp?: string | null;
  initialAddRecord?: boolean;
  onClearInitialMiniApp?: () => void;
}

interface TileConfig {
  id: string;
  widgetId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  glowColor: string; // ⚡ FIX: Loosened from the strict 6 colors
}

// Mock data (Sorted by status: active -> idle -> offline)
const mockActiveUsers = [
  { id: '1', name: 'John Doe', status: 'active' as const },
  { id: '2', name: 'Jane Smith', status: 'active' as const },
  { id: '3', name: 'Mike Johnson', status: 'idle' as const },
  { id: '4', name: 'Sarah Wilson', status: 'offline' as const },
  { id: '5', name: 'Tom Brown', status: 'idle' as const },
  ...Array.from({ length: 50 }).map((_, i) => {
    const rand = Math.random();
    return {
      id: `gen-${i + 6}`,
      name: `Test User ${i + 6}`,
      status: (rand > 0.66 ? 'active' : rand > 0.33 ? 'idle' : 'offline') as 'active' | 'idle' | 'offline'
    };
  })
].sort((a, b) => {
  const order: Record<string, number> = { active: 1, idle: 2, offline: 3 };
  return (order[a.status] || 4) - (order[b.status] || 4);
});

// Workspace-specific stats
const getWorkspaceStats = (slug: string) => {
  switch (slug) {
    case 'admin':
      return [
        { title: 'Total Projects', value: '28', change: 12, icon: BarChartIcon },
        { title: 'Active Proposals', value: '15', change: 8, icon: FileIcon },
        { title: 'Team Members', value: '89', change: 5, icon: UsersIcon },
        { title: 'Completion Rate', value: '94%', change: 3, icon: TrendingUpIcon },
      ];
    case 'accounting':
      return [
        { title: 'Monthly Revenue', value: '$124K', change: 15, icon: TrendingUpIcon },
        { title: 'Pending Payments', value: '23', change: -8, icon: FileIcon },
        { title: 'Active Budgets', value: '8', change: 0, icon: BarChartIcon },
        { title: 'Expense Ratio', value: '68%', change: -5, icon: TrendingDownIcon },
      ];
    case 'personnel':
      return [
        { title: 'Active Members', value: '89', change: 7, icon: UsersIcon },
        { title: 'Open Positions', value: '12', change: 3, icon: FileIcon },
        { title: 'Training Done', value: '78%', change: 12, icon: TrendingUpIcon },
        { title: 'Applicants', value: '45', change: 23, icon: UsersIcon },
      ];
    case 'main':
      return [
        { title: 'Active Customers', value: '156', change: 18, icon: UsersIcon },
        { title: 'Open Orders', value: '34', change: 5, icon: FileIcon },
        { title: 'Monthly Sales', value: '$89K', change: 22, icon: TrendingUpIcon },
        { title: 'Support Tickets', value: '12', change: -15, icon: ActivityIcon },
      ];
    case 'data':
      return [
        { title: 'Data Types', value: '45', change: 8, icon: BarChartIcon },
        { title: 'Total Items', value: '567', change: 12, icon: FileIcon },
        { title: 'Active Uses', value: '234', change: 5, icon: ActivityIcon },
        { title: 'Specifications', value: '56', change: 3, icon: FileIcon },
      ];
    case 'security':
      return [
        { title: 'Security Score', value: '98%', change: 2, icon: TrendingUpIcon },
        { title: 'Active Sessions', value: '23', change: 0, icon: UsersIcon },
        { title: 'Threats Blocked', value: '156', change: -45, icon: ActivityIcon },
        { title: 'Audit Logs', value: '1.2K', change: 8, icon: FileIcon },
      ];
    default:
      return [];
  }
};

const DEFAULT_WS_TILES = (slug: string, glowColor: string, containerWidth: number = 1248): TileConfig[] => {
  const GAP = 10;
  const w3 = Math.floor((containerWidth - GAP * 2) / 3);

  return [
    { id: 'stats-1', widgetId: 'stats', title: 'Stats', position: { x: 0, y: 0 }, size: { width: containerWidth, height: 160 }, zIndex: 1, glowColor },
    { id: 'activity-1', widgetId: 'activity-stream', title: 'Live Activity', position: { x: 0, y: 170 }, size: { width: w3, height: 340 }, zIndex: 2, glowColor },
    { id: 'tasks-1', widgetId: 'ws-tasks', title: 'Tasks', position: { x: w3 + GAP, y: 170 }, size: { width: w3, height: 340 }, zIndex: 3, glowColor },
    { id: 'events-1', widgetId: 'ws-events', title: 'Events', position: { x: (w3 * 2) + (GAP * 2), y: 170 }, size: { width: containerWidth - (w3 * 2) - (GAP * 2), height: 340 }, zIndex: 4, glowColor },
  ];
};

const serializeTile = (tile: TileConfig): object => ({
  id: String(tile.id || ''),
  widgetId: String(tile.widgetId || ''),
  title: String(tile.title || ''),
  position: { x: Math.round(Number(tile.position?.x) || 0), y: Math.round(Number(tile.position?.y) || 0) },
  size: { width: Math.round(Number(tile.size?.width) || 200), height: Math.round(Number(tile.size?.height) || 150) },
  zIndex: Math.round(Number(tile.zIndex) || 1),
  glowColor: String(tile.glowColor || 'cyan')
});

const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  workspaceSlug, onOpenMiniApp, onOpenSettings, isAdmin: propIsAdmin,
  initialMiniApp, initialAddRecord, onClearInitialMiniApp
}) => {
  const { user, organization, isPlatformOwner, isOrganizationAdmin, getUserRole } = useAuth();
  
  // ⚡ FIX: Calculate true admin clearance at the root of the workspace so it cascades everywhere
  const userRoleStr = typeof getUserRole === 'function' ? getUserRole() : null;
  const isAdmin = propIsAdmin || (typeof isOrganizationAdmin === 'function' && isOrganizationAdmin()) || userRoleStr === 'organization_admin_user' || userRoleStr === 'organization_admin';

  const { getColor } = useWorkspaceColor();
  
  // ⚡ FIX: Provide a safe fallback if the workspace isn't in WORKSPACE_DEFINITIONS
  const workspaceConfig = WORKSPACE_DEFINITIONS[workspaceSlug] || {
    name: workspaceSlug.charAt(0).toUpperCase() + workspaceSlug.slice(1).replace('-', ' '),
    slug: workspaceSlug,
    icon: HomeIcon,
    miniApps: [],
  };

  // ⚡ FIX: Pull the exact color name from the context, with a strict fallback!
  const rawColor = getColor(workspaceSlug);
  const wsColor = rawColor || { primary: '#06b6d4', rgb: '6, 182, 212', colorName: 'cyan', dark: '#083344' };
  const glowColor = wsColor.colorName || 'cyan';
  const userId = (user as any)?.id || null;
  const stats = getWorkspaceStats(workspaceSlug);

  // Resolve workspace slug to actual UUID for MiniAppBuilder
  // Live record counts - fetched from DB
  const [miniAppRecordCounts, setMiniAppRecordCounts] = useState<Record<string, number>>({});
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<string | null>(null);
  const [updateKey, setUpdateKey] = useState(Date.now());



  const [activeMiniApp, setActiveMiniApp] = useState<string | null>(null);
  const [showMiniAppBuilder, setShowMiniAppBuilder] = useState(false);
  const [builderInitialTab, setBuilderInitialTab] = useState<'template' | 'workflows' | 'settings'>('template'); // ⚡ NEW
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [appsDeletedInSession, setAppsDeletedInSession] = useState(false); // ⚡ Tracks deletions for reload
  const [miniAppAddRecord, setMiniAppAddRecord] = useState(false);

 // Users State for Dashboard
  const [isUsersExpanded, setIsUsersExpanded] = useState(true);
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const [maxVisibleUsers, setMaxVisibleUsers] = useState(5);
  const usersContainerRef = useRef<HTMLDivElement>(null);
  const [activeUserDropdown, setActiveUserDropdown] = useState<string | null>(null);
  
  // External Communication Modal State
  const [externalModalUser, setExternalModalUser] = useState<{ id: string; name: string } | null>(null);
  const [callModalUser, setCallModalUser] = useState<{ id: string; name: string } | null>(null);
  const [recordModalUser, setRecordModalUser] = useState<{ id: string; name: string } | null>(null);
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  // ⚡ NEW: Workspace Dropdown State
  const [appWorkspaceDropdown, setAppWorkspaceDropdown] = useState<string | null>(null);

  // ⚡ NEW: Directory Modal State
  const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'list'>('grid');
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [directorySortKey, setDirectorySortKey] = useState<'name' | 'status'>('name');
  const [directorySortDir, setDirectorySortDir] = useState<'asc' | 'desc'>('asc');

  // ⚡ Quick Actions Panel State
  const [activeLeftPanel, setActiveLeftPanel] = useState<'tasks' | 'calendar' | 'files' | null>(null);

  // ⚡ NEW: Filtered and Sorted Users
  const processedDirectoryUsers = React.useMemo(() => {
    let filtered = mockActiveUsers.filter(u => u.name.toLowerCase().includes(directorySearchQuery.toLowerCase()));
    filtered.sort((a, b) => {
      let valA = a[directorySortKey];
      let valB = b[directorySortKey];
      let comp = valA.localeCompare(valB);
      return directorySortDir === 'asc' ? comp : -comp;
    });
    return filtered;
  }, [directorySearchQuery, directorySortKey, directorySortDir]); // removed mockActiveUsers from deps to prevent unnecessary rebuilds since it's static

  // Close workspace dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setAppWorkspaceDropdown(null);
    if (appWorkspaceDropdown) {
      const timer = setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [appWorkspaceDropdown]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeUserDropdown) {
        // Check if the click target is inside a user dropdown panel
        const target = event.target as HTMLElement;
        const isInsidePanel = target.closest('.user-profile-panel');
        
        // If the click is outside any active panel, close it
        if (!isInsidePanel) {
          setActiveUserDropdown(null);
        }
      }
    };

    if (activeUserDropdown) {
      // Use a small timeout to prevent the click that opens the menu 
      // from immediately triggering the "outside" close logic
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [activeUserDropdown]);

  // ============================================
  // DYNAMIC MINIAPP TABS - `load`ed from DB, merged with static
  // ============================================
  const [dynamicMiniApps, setDynamicMiniApps] = useState<string[]>([]);
  const [appIdMap, setAppIdMap] = useState<Record<string, string>>({}); 
  const [appIconMap, setAppIconMap] = useState<Record<string, string>>({}); // ⚡ NEW: Stores the saved DB icons
  const appIdMapRef = useRef<Record<string, string>>({});

  // Keep the ref perfectly in sync with the state
  useEffect(() => {
    appIdMapRef.current = appIdMap;
  }, [appIdMap]);

  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [dragOverTabIdx, setDragOverTabIdx] = useState<number | null>(null);
  const [isTabsWrapped, setIsTabsWrapped] = useState(false);
  const [isTabsCondensed, setIsTabsCondensed] = useState(false);
  const canReorderTabs = isPlatformOwner() || isOrganizationAdmin();

  // Merge static + dynamic MiniApps, respecting saved tab order
  const allMiniAppNames = React.useMemo(() => {
    // ⚡ THE FIX: Never fall back to the global static configuration!
    // This stops the UI from temporarily rendering unauthorized apps.
    let baseApps = [...dynamicMiniApps];

    // If we are still loading, try to safely use the org-specific cached order 
    // to prevent a jarring blank layout jump
    if (isLoadingApps && dynamicMiniApps.length === 0) {
      if (tabOrder.length > 0) {
        baseApps = [...tabOrder];
      } else {
        return []; // Show absolutely nothing until the DB confirms access
      }
    }
    
    const merged = [...baseApps];
    
    // If we have a saved tab order, reorder to match
    if (tabOrder.length > 0) {
      const ordered: string[] = [];
      tabOrder.forEach(name => {
        if (merged.includes(name)) ordered.push(name);
      });
      // Add any newly distributed apps not in the saved order at the end
      merged.forEach(name => {
        if (!ordered.includes(name)) ordered.push(name);
      });
      return ordered;
    }
    return merged;
  }, [dynamicMiniApps, tabOrder, isLoadingApps]);

  // ⚡ SAFETY CATCH: If the active app is deleted, kick the user back to the Dashboard
  useEffect(() => {
    if (activeMiniApp && !allMiniAppNames.includes(activeMiniApp) && !isLoadingApps) {
      setActiveMiniApp(null);
    }
  }, [allMiniAppNames, activeMiniApp, isLoadingApps]);

  // Load dynamic MiniApps
  useEffect(() => {
    const loadDynamicApps = async () => {
      if (!organization?.id) return;
      setIsLoadingApps(true);

      let targetWorkspaceId = null;
      let dbTabOrder: string[] | null = null;
      const PLATFORM_OWNER_ID = 'c28f0d91-c0df-4092-a2cc-19c860f1824f';

      try {
        // 1. FETCH MASTER WORKSPACE FIRST
        const { data: masterWs } = await supabase
          .schema('app_private')
          .from('workspaces')
          .select('*')
          .eq('slug', workspaceSlug)
          .eq('organization_id', PLATFORM_OWNER_ID)
          .maybeSingle();

        // 2. CHECK IF LOCAL WORKSPACE EXISTS
        const { data: localWs } = await supabase
          .schema('app_private')
          .from('workspaces')
          .select('id, settings')
          .eq('slug', workspaceSlug)
          .eq('organization_id', organization.id)
          .maybeSingle();

        if (localWs?.id) {
          targetWorkspaceId = localWs.id;
          setResolvedWorkspaceId(localWs.id);
          const settingsObj = typeof localWs.settings === 'string' ? JSON.parse(localWs.settings || '{}') : (localWs.settings || {});
          if (settingsObj.tab_order) dbTabOrder = settingsObj.tab_order;
        } else if (organization.id !== PLATFORM_OWNER_ID && masterWs) {
          // ⚡ JIT PROVISIONING: AUTO-CREATE WORKSPACE
          const masterSettings = typeof masterWs.settings === 'string' ? JSON.parse(masterWs.settings) : (masterWs.settings || {});
          if (masterSettings.auto_deploy) {
            const { data: newWs, error: wsError } = await supabase
              .schema('app_private')
              .from('workspaces')
              .insert({
                organization_id: organization.id,
                name: masterWs.name,
                slug: masterWs.slug,
                icon: masterWs.icon,
                description: masterWs.description,
                is_visible: true,
                display_order: masterWs.display_order,
                settings: masterWs.settings 
              })
              .select('id')
              .single();
              
            if (newWs?.id) {
              targetWorkspaceId = newWs.id;
              setResolvedWorkspaceId(newWs.id);
              if (masterSettings.tab_order) dbTabOrder = masterSettings.tab_order;
            }
          }
        }

        if (!targetWorkspaceId) {
          setDynamicMiniApps([]);
          setIsLoadingApps(false);
          return;
        }

        // 3. FETCH LOCAL APPS
        const { data: myApps, error: appsError } = await supabase
          .schema('app_private')
          .from('mini_apps')
          .select('id, slug, name, display_order, icon, schema_definition, organization_id, is_preset, app_settings') 
          .eq('workspace_id', targetWorkspaceId)
          .eq('organization_id', organization.id) 
          .order('display_order', { ascending: true });

        if (appsError) throw appsError;
        let finalApps = myApps || [];

        // 4. ⚡ JIT PROVISIONING: AUTO-DEPLOY MISSING APPS
        if (organization.id !== PLATFORM_OWNER_ID && masterWs) {
           // ⚡ FIX: Map both names and slugs to prevent unique constraint cloning errors
           const myAppNames = new Set(finalApps.map(a => a.name));
           const myAppSlugs = new Set(finalApps.map(a => a.slug).filter(Boolean));
           
           const { data: masterApps } = await supabase
             .schema('app_private')
             .from('mini_apps')
             .select('*')
             .eq('workspace_id', masterWs.id)
             .eq('organization_id', PLATFORM_OWNER_ID);

           if (masterApps && masterApps.length > 0) {
              const appsToClone = masterApps.filter(app => {
                 const appSet = typeof app.app_settings === 'string' ? JSON.parse(app.app_settings) : (app.app_settings || {});
                 // Prevent clone if they have the exact name OR the exact slug
                 const alreadyExists = myAppNames.has(app.name) || (app.slug && myAppSlugs.has(app.slug));
                 return appSet.auto_deploy === true && !alreadyExists; 
              });

              if (appsToClone.length > 0) {
                 const inserts = appsToClone.map(app => {
                   const { id, created_at, updated_at, ...appData } = app;
                   return {
                     ...appData,
                     workspace_id: targetWorkspaceId,
                     organization_id: organization.id,
                     is_preset: false // ⚡ CRITICAL: Strip the preset flag so MiniAppView finds it!
                   };
                 });
                 
                 const { data: newlyClonedApps, error: cloneErr } = await supabase
                    .schema('app_private')
                    .from('mini_apps')
                    .insert(inserts)
                    .select('id, name, display_order, icon, schema_definition, organization_id, is_preset, app_settings');
                 
                 if (newlyClonedApps) {
                    finalApps = [...finalApps, ...newlyClonedApps];
                 } else if (cloneErr) {
                    console.error("Clone error:", cloneErr);
                 }
              }
           }
        }

        // 5. PROCESS THE FINAL APPS LIST INTO STATE
        if (finalApps.length > 0) {
          const uniqueAppsMap = new Map();
          
          finalApps.forEach((a: any) => {
            uniqueAppsMap.set(a.id, a); // ⚡ FIX: Deduplicate by ID to prevent ghost tabs!
          });

          const uniqueApps = Array.from(uniqueAppsMap.values());
          const appNames = uniqueApps.map(a => a.name);
          setDynamicMiniApps(appNames);

          const newMap: Record<string, string> = {};
          const newIconMap: Record<string, string> = {};
          
          uniqueApps.forEach((a: any) => { 
            newMap[a.name] = a.id; 
            let trueIcon = a.icon;
            if (!trueIcon || trueIcon === 'grid') {
              try {
                const schema = typeof a.schema_definition === 'string' ? JSON.parse(a.schema_definition) : (a.schema_definition || {});
                if (schema.icon && schema.icon !== 'grid') trueIcon = schema.icon;
              } catch (e) {}
            }
            if (trueIcon) newIconMap[a.name] = trueIcon;
          });
          
          setAppIdMap(prev => ({ ...prev, ...newMap }));
          setAppIconMap(prev => ({ ...prev, ...newIconMap }));
        } else {
          setDynamicMiniApps([]);
        }

        // 6. Apply the Database Tab Order
        if (dbTabOrder && dbTabOrder.length > 0) {
          setTabOrder(dbTabOrder);
        } else {
          const orderKey = `miniapp-tab-order-${workspaceSlug}-${organization.id}`;
          const savedOrder = localStorage.getItem(orderKey);
          if (savedOrder) {
            try { setTabOrder(JSON.parse(savedOrder)); } catch {}
          }
        }

      } catch (err) {
        console.error('[WorkspaceDashboard] Failed to load apps:', err);
      } finally {
        setIsLoadingApps(false);
      }
    };
    
    loadDynamicApps();
  }, [organization?.id, workspaceSlug, updateKey]);

  // ============================================
  // ⚡ REALTIME DATABASE SYNC: Auto-remove tabs by ID
  // ============================================
  useEffect(() => {
    if (!organization?.id) return;
    
    const channel = supabase
      .channel(`sync-miniapps-${workspaceSlug}`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'app_private', table: 'mini_apps' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;

          // Safely reverse-lookup the exact name associated with this immutable ID
          const exactTabName = Object.keys(appIdMapRef.current).find(
            name => appIdMapRef.current[name] === deletedId
          );

          if (exactTabName) {
            console.log(`[DB Sync] Tab deleted by Database ID: ${deletedId}`);
            
            // 1. Wipe from dynamic tabs
            setDynamicMiniApps(prev => prev.filter(n => n !== exactTabName));
            
            // 2. Wipe from tab order
            setTabOrder(prev => prev.filter(n => n !== exactTabName));
            
            // 3. Kick user to dashboard if they were viewing the deleted app
            setActiveMiniApp(prev => prev === exactTabName ? null : prev);
            
            // 4. Wipe from Local Storage cache
            const orderKey = `miniapp-tab-order-${workspaceSlug}-${organization.id}`;
            try {
              const saved = localStorage.getItem(orderKey);
              if (saved) {
                const newOrder = JSON.parse(saved).filter((n: string) => n !== exactTabName);
                localStorage.setItem(orderKey, JSON.stringify(newOrder));
              }
            } catch (e) {}
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceSlug, organization?.id]);

  // ============================================
  // PRESET MINIAPP INITIALIZATION + LIVE RECORD COUNTS
  // Ensures PresetMiniApps from WORKSPACE_DEFINITIONS exist in the DB
  // and fetches live record counts for the tab bar
  // ============================================
  const presetInitRanRef = useRef<string | null>(null);

  useEffect(() => {
    if (!organization?.id) return;
    // Only run once per workspace slug
    if (presetInitRanRef.current === `${workspaceSlug}-${organization.id}`) return;
    presetInitRanRef.current = `${workspaceSlug}-${organization.id}`;

    const ensurePresetsAndLoadCounts = async () => {
      try {
        let targetWorkspaceId = resolvedWorkspaceId;
        
        if (!targetWorkspaceId) {
          const { data: wsData } = await supabase
            .schema('app_private')
            .from('workspaces')
            .select('id')
            .eq('organization_id', organization.id)
            .eq('slug', workspaceSlug)
            .maybeSingle();
            
          if (wsData?.id) {
            targetWorkspaceId = wsData.id;
            setResolvedWorkspaceId(wsData.id);
          }
        }

        const globalWsId = WORKSPACE_ID_MAP[workspaceSlug];
        const searchWsIds = [targetWorkspaceId, globalWsId].filter(Boolean); // Filters out any null/undefined values

        if (searchWsIds.length === 0) {
           console.warn(`[preset-init] No workspace IDs to search for ${workspaceSlug}`);
           return;
        }

        // 1. Fetch all existing mini_apps for this workspace
        const { data: existingApps } = await supabase
          .schema('app_private')
          .from('mini_apps')
          .select('id, name')
          .in('workspace_id', searchWsIds)
          .or(`organization_id.eq.${organization.id},is_preset.eq.true`);

        const existingNames = new Set((existingApps || []).map((a: any) => a.name));
        
        // ⚡ FIX: Safely access miniApps, falling back to an empty array
        const presetNames = (workspaceConfig?.miniApps || []) as readonly string[];

        // 2. Upsert any missing preset MiniApps
        const missingPresets = presetNames.filter(name => !existingNames.has(name));

        // 3. Load live record counts
        const { data: allApps } = await supabase
          .schema('app_private')
          .from('mini_apps')
          .select('id, name')
          .in('workspace_id', searchWsIds) // Reuses the array from Fix #2
          .or(`organization_id.eq.${organization.id},is_preset.eq.true`);

        if (allApps && allApps.length > 0) {
          const appIdToName: Record<string, string> = {};
          allApps.forEach((a: any) => { appIdToName[a.id] = a.name; });

          const { data: records } = await supabase
            .schema('app_private')
            .from('mini_app_records')
            .select('mini_app_id')
            .in('mini_app_id', allApps.map((a: any) => a.id));

          const counts: Record<string, number> = {};
          if (records) {
            records.forEach((r: any) => {
              const name = appIdToName[r.mini_app_id];
              if (name) counts[name] = (counts[name] || 0) + 1;
            });
          }
          setMiniAppRecordCounts(counts);
        }
      } catch (err) {
        console.error('[preset-init] Error during preset initialization:', err);
      }
    };

    ensurePresetsAndLoadCounts();
  }, [organization?.id, workspaceSlug, userId, workspaceConfig?.miniApps, resolvedWorkspaceId]);

  // ============================================
  // ⚡ LIVE TAB RECORD COUNTS (Listens for Workflow changes)
  // ============================================
  useEffect(() => {
    const updateTabCounts = async () => {
      const appIds = Object.values(appIdMap);
      
      // If we don't have apps loaded yet, skip
      if (!organization?.id || appIds.length === 0) return;
      
      try {
        // Create a reverse lookup (ID -> Name) to map counts back to tabs
        const idToNameMap: Record<string, string> = {};
        Object.entries(appIdMap).forEach(([name, id]) => {
          idToNameMap[id] = name;
        });

        // Rapidly fetch just the IDs of all records in this workspace
        const { data: records, error } = await supabase
          .schema('app_private')
          .from('mini_app_records')
          .select('mini_app_id')
          .in('mini_app_id', appIds);

        if (error) throw error;

        const counts: Record<string, number> = {};
        if (records) {
          records.forEach((r: any) => {
            const name = idToNameMap[r.mini_app_id];
            if (name) counts[name] = (counts[name] || 0) + 1;
          });
        }
        
        // Push the fresh counts to the UI
        setMiniAppRecordCounts(counts);
      } catch (err) {
        console.error('[WorkspaceDashboard] Failed to refresh tab counts:', err);
      }
    };

    // Listen for the shout from MiniAppView
    window.addEventListener('miniapp_records_updated', updateTabCounts);
    
    return () => {
      window.removeEventListener('miniapp_records_updated', updateTabCounts);
    };
  }, [organization?.id, appIdMap]);

  // ============================================
  // DRAG-TO-REORDER TABS
  // ============================================
  const handleTabDragStart = (e: React.DragEvent, idx: number) => {
    if (!canReorderTabs) return;
    setDragTabIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    // Make the drag ghost semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleTabDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTabIdx !== idx) setDragOverTabIdx(idx);
  };

  const handleTabDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragTabIdx(null);
    setDragOverTabIdx(null);
  };

  const handleTabDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragTabIdx === null || dragTabIdx === dropIdx) {
      setDragTabIdx(null);
      setDragOverTabIdx(null);
      return;
    }
    // Reorder the tabs
    const newOrder = [...allMiniAppNames];
    const [moved] = newOrder.splice(dragTabIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    setTabOrder(newOrder);
    // Persist to localStorage
    if (organization?.id) {
      const orderKey = `miniapp-tab-order-${workspaceSlug}-${organization.id}`;
      localStorage.setItem(orderKey, JSON.stringify(newOrder));
    }
    // Also persist display_order to DB
    persistTabOrder(newOrder);
    setDragTabIdx(null);
    setDragOverTabIdx(null);
  };

  const persistTabOrder = async (order: string[]) => {
    if (!organization?.id) return;
    
    // ⚡ FIX: Use the strictly resolved state.
    const targetWorkspaceId = resolvedWorkspaceId;
    
    if (!targetWorkspaceId) return;
    
    try {
      // 1. Fetch current settings so we don't overwrite accent_color!
      const { data: wsData } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('settings')
        .eq('id', targetWorkspaceId)
        .single();

      const currentSettings = typeof wsData?.settings === 'string' 
        ? JSON.parse(wsData.settings || '{}') 
        : (wsData?.settings || {});

      // 2. Merge in the new tab order
      const newSettings = { ...currentSettings, tab_order: order };

      // 3. Update the workspace JSON column atomically
      await supabase
        .schema('app_private')
        .from('workspaces')
        .update({ settings: newSettings })
        .eq('id', targetWorkspaceId);

    } catch (err) {
      console.error('Error persisting tab order to workspace settings:', err);
    }
  };


  // Tile management state
  const [tiles, setTiles] = useState<TileConfig[]>([]);
  const [isLoadingTiles, setIsLoadingTiles] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const saveTimeoutRef = useRef<any>(null);

  const [editingApp, setEditingApp] = useState<{ id: string; name: string; description: string; icon: string;
    fields: any[]; layouts?: string[]; itemIdSettings?: any;
    appSettings?: any; is_preset?: boolean; created_by?: string;
  } | null>(null);

  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  // Security workspace tab state
  const [activeSecurityTab, setActiveSecurityTab] = useState<string>('dashboard');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ appId: string; appName: string; x: number; y: number } | null>(null);
  // ⚡ DELETED showAdvancedSettings state line here
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  // Real-time activity stream state
  const [activities, setActivities] = useState<Array<{ id: string; user_name: string; action: string; target: string; target_type: string; created_at: string }>>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  // ============================================
 // WORKSPACE INITIALIZATION (Bypassed Edge Function)
 // ============================================
 const [wsInitializing, setWsInitializing] = useState(false);
 const [wsInitError, setWsInitError] = useState<string | null>(null);
 const [wsInitRetryCount, setWsInitRetryCount] = useState(0);
 const [wsInitElapsed, setWsInitElapsed] = useState(0);
 const wsInitRanRef = useRef(false);

 useEffect(() => {
  if (wsInitRanRef.current) return;
  if (!organization?.id) return;
  
  // Mark as instantly complete! 
  // We bypassed the 30-second db-proxy wait time because your 
  // ensurePresetsAndLoadCounts hook already handles DB setup natively.
  wsInitRanRef.current = true;
  setWsInitializing(false);
 }, [organization?.id, workspaceSlug]);

 // Dummy handlers to keep the JSX happy without throwing errors
 const handleSkipInit = () => setWsInitializing(false);
 const handleRetryInit = () => setWsInitializing(false);


  const isSecurityWorkspace = workspaceSlug === 'security';
  const scrollbarClass = `scrollbar-${workspaceSlug}`;


  // Load real activities from database
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const { data, error } = await supabase
          .schema('app_private') // <-- Added schema pointer
          .from('activity_log')
          .select('*')
          .eq('workspace_slug', workspaceSlug)
          .order('created_at', { ascending: false })
          .limit(20);
        if (!error && data && data.length > 0) {
          setActivities(data);
        }
      } catch (err) {
        console.error('Error loading activities:', err);
      } finally {
        setActivitiesLoaded(true);
      }
    };
    loadActivities();

    // Subscribe to realtime activity updates
    const channel = supabase
      .channel(`activity-${workspaceSlug}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'app_private', // <-- Changed from 'public' to 'app_private'
        table: 'activity_log',
        filter: `workspace_slug=eq.${workspaceSlug}`,
      }, (payload) => {
        setActivities(prev => [payload.new as any, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceSlug]);


  // Load favorites from database on mount
  useEffect(() => {
    const loadFavorites = async () => {
      if (!userId || userId === 'anonymous') return;
      try {
        const { data, error } = await supabase
          .from('miniapp_favorites')
          .select('app_name')
          .eq('user_id', userId)
          .eq('workspace_slug', workspaceSlug);
        if (!error && data) {
          setFavorites(new Set(data.map((f: any) => f.app_name)));
        }
      } catch (err) {
        console.error('Error loading favorites:', err);
      } finally {
        setFavoritesLoaded(true);
      }
    };
    loadFavorites();
  }, [userId, workspaceSlug]);



  // Handle initial miniapp navigation from hamburger menu
  const lastProcessedMiniAppRef = useRef<string | null>(null);

  // ⚡ THE FIX: Instantly kill ghost states the millisecond the workspace changes
  const [prevWorkspace, setPrevWorkspace] = useState(workspaceSlug);
  if (workspaceSlug !== prevWorkspace) {
    setPrevWorkspace(workspaceSlug);
    setActiveMiniApp(null);
    setMiniAppAddRecord(false);
    setIsInitialLoad(true); 
    
    setShowMiniAppBuilder(false);
    setEditingApp(null);
    setShowWorkspaceSettings(false);
    setResolvedWorkspaceId(null);
  }
  
  // ⚡ Catch the popout command safely from the URL (waiting for Auth to initialize!)
  useEffect(() => {
    // Guard: Do NOT consume the popout command if auth hasn't finished loading.
    if (!organization?.id) return;

    const params = new URLSearchParams(window.location.search);
    const urlApp = params.get('app');

    if (urlApp) {
      // Set active app with a tiny delay to let the rest of the UI settle
      setTimeout(() => {
        setActiveMiniApp(urlApp);
        if (onOpenMiniApp) onOpenMiniApp(urlApp.toLowerCase());
      }, 50);

      // Clean up the URL to remove the ?app= parameter, leaving just the workspace
      // This prevents the app from auto-opening again if the user hits refresh!
      window.history.replaceState({}, document.title, `${window.location.pathname}?workspace=${workspaceSlug}`);
    }
  }, [organization?.id, workspaceSlug, onOpenMiniApp]);

  // Load tile configs from DB
  // Load tile configs DIRECTLY from DB (bypassing Edge Function)
  const loadTileConfigs = useCallback(async () => {
    if (!userId) { setIsLoadingTiles(false); return; }
    try {
      const tabId = `ws-${workspaceSlug}-main`;
      const { data, error } = await supabase
        .schema('app_private')
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('tab_id', tabId)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors if no config exists yet

      if (!error && data && Array.isArray(data.tiles) && data.tiles.length > 0) {
        setTiles(data.tiles as TileConfig[]);
      } else {
        setTiles(DEFAULT_WS_TILES(workspaceSlug, glowColor, containerRef.current?.clientWidth || 1248));
      }
      
      // We keep transitions disabled for 100ms to ensure the browser
      // paints the tiles in their final spots before allowing animation.
      setTimeout(() => setIsInitialLoad(false), 100);
    } catch (err) {
      console.error('Error loading tile configs:', err);
      setTiles(DEFAULT_WS_TILES(workspaceSlug, glowColor, containerRef.current?.clientWidth || 1248));
    } finally {
      setIsLoadingTiles(false);
      isInitialLoadRef.current = false;
    }
  }, [userId, workspaceSlug, glowColor]);

  // Save tile configs DIRECTLY to DB (bypassing Edge Function)
  const saveTileConfigs = useCallback(async () => {
    if (!userId || isInitialLoadRef.current) return;
    setIsSaving(true);
    try {
      const tabId = `ws-${workspaceSlug}-main`;
      
      // ⚡ FIX: Force the live context color into the payload so the DB heals!
      const serializedTiles = tiles.map(t => ({
        ...serializeTile(t),
        glowColor: glowColor 
      }));
      
      const { error } = await supabase
        .schema('app_private')
        .from('dashboard_configs')
        .upsert({
          user_id: String(userId), 
          tab_id: tabId, 
          tab_name: `${workspaceConfig.name} Dashboard`,
          tiles: serializedTiles, 
          tab_order: 0, 
          is_active: true, 
          updated_at: new Date().toISOString()
        }, { 
          // Match on user_id and tab_id to update existing layouts
          onConflict: 'user_id,tab_id' 
        });

      if (error) throw error;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [userId, workspaceSlug, tiles, workspaceConfig, glowColor]);

  useEffect(() => { loadTileConfigs(); }, [loadTileConfigs]);

  useEffect(() => {
    if (isInitialLoadRef.current || isLoadingTiles) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveTileConfigs(), 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [tiles, saveTileConfigs, isLoadingTiles]);

  // Grid Layout State
  const [previewLayout, setPreviewLayout] = useState<Record<string, { x: number; y: number; width: number; height: number }> | null>(null);
  const [reorderDragTileId, setReorderDragTileId] = useState<string | null>(null);

  // ⚡ NATIVE CSS DOM SORTING FOR MOBILE (Left-to-Right, Top-to-Bottom)
const sortedTiles = React.useMemo(() => {
  return [...tiles].sort((a, b) => {
    // If they are on completely different rows (more than 60px apart), sort Top-to-Bottom
    if (Math.abs(a.position.y - b.position.y) > 60) {
      return a.position.y - b.position.y;
    }
    // Otherwise, they are in the same row, so sort Left-to-Right
    return a.position.x - b.position.x;
  });
}, [tiles]);
  
  // Dynamically calculate how many users fit in the dashboard bar
  useEffect(() => {
    const container = usersContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      // Reserve ~160px for the Pop-out, Plus, Chevron buttons, and gaps
      const availableAvatarWidth = width - 160; 
      
      if (availableAvatarWidth < 40) {
        setMaxVisibleUsers(0);
      } else {
        // First avatar takes 40px, each overlapping avatar adds 32px
        const count = Math.floor((availableAvatarWidth - 40) / 32) + 1;
        setMaxVisibleUsers(Math.max(0, count));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [activeMiniApp, workspaceSlug]); // ⚡ FIX: Re-run when switching back to the dashboard!

  const TILE_Y_OFFSET = 0;

  const handlePositionChange = useCallback((id: string, newPosition: { x: number; y: number }) => {
    const storedY = Math.max(0, Math.round(newPosition.y));
    setTiles(prev => prev.map(tile => tile.id === id ? { ...tile, position: { x: Math.max(0, Math.round(newPosition.x)), y: storedY } } : tile));
  }, []);

  const handleZIndexChange = useCallback((id: string) => {
    setMaxZIndex(prev => {
      const newMax = prev + 1;
      setTiles(prevTiles => prevTiles.map(tile => tile.id === id ? { ...tile, zIndex: newMax } : tile));
      return newMax;
    });
  }, []);

  const handleReorderDragStart = useCallback((id: string) => { 
    setReorderDragTileId(id); 
    setPreviewLayout(null);
  }, []);

  const handleReorderDragOver = useCallback((dragId: string, x: number, y: number) => { 
    const containerWidth = containerRef.current?.clientWidth || 1248;
    const GAP = 10; 

    // ⚡ FIX: Allow simulatedX to be negative for edge sensitivity
    const simulatedX = x; 

    setTiles(prevTiles => {
      let simTiles = prevTiles.map(t => ({
        ...t,
        position: t.id === dragId ? { x: simulatedX, y } : { ...t.position }
      }));

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

          newPreview[tile.id] = { x: newX, y: packedY, width: finalWidth, height: tile.size.height };
          maxRowHeight = Math.max(maxRowHeight, tile.size.height);
        });
        packedY += maxRowHeight + GAP;
      });

      setPreviewLayout(newPreview);
      return prevTiles; 
    });
  }, []);

  const handleReorderDrop = useCallback((dragId: string, x: number, y: number) => {
    if (!dragId || !previewLayout) {
      setReorderDragTileId(null);
      setPreviewLayout(null);
      return;
    }

    // ⚡ FIX: Apply the previewLayout coordinates to the actual state
    setTiles(prev => {
      const newTiles = prev.map(tile => {
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
      return newTiles;
    });
    
    setReorderDragTileId(null); 
    setPreviewLayout(null);

    // ⚡ Trigger Save immediately
    setTimeout(() => {
      saveTileConfigs();
    }, 50);
  }, [previewLayout, saveTileConfigs]);

  const handleReorderDragEnd = useCallback(() => { 
    setReorderDragTileId(null); 
    setPreviewLayout(null);
  }, []);

  const handleSizeChange = useCallback((id: string, newSize: { width: number; height: number }, dir?: string) => {
    const GAP = 10;
    const containerWidth = containerRef.current?.clientWidth || 1248;

    setTiles(prevTiles => {
      let simTiles = prevTiles.map(t => ({ ...t, size: { ...t.size }, position: { ...t.position } }));
      const originalTile = prevTiles.find(t => t.id === id);
      if (!originalTile) return prevTiles;

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
      if (targetInSim) targetInSim.size.height = Math.round(newSize.height);

      const newPreview: Record<string, {x: number, y: number, width: number, height: number}> = {};
      let packedY = 0;

      rows.forEach((row) => {
        let maxRowHeight = 0;
        row.forEach((tile) => {
          newPreview[tile.id] = { x: tile.position.x, y: packedY, width: tile.size.width, height: tile.size.height };
          maxRowHeight = Math.max(maxRowHeight, tile.size.height);
        });
        packedY += maxRowHeight + GAP;
      });

      setPreviewLayout(newPreview);
      return prevTiles; 
    });
  }, []);

  const handleSizeChangeEnd = useCallback((id: string, newSize: { width: number; height: number }, dir?: string) => {
    const GAP = 10;
    const containerWidth = containerRef.current?.clientWidth || 1248;

    setTiles(prev => {
      let simTiles = prev.map(t => ({ ...t, size: { ...t.size }, position: { ...t.position } }));
      const originalTile = prev.find(t => t.id === id);
      if (!originalTile) return prev;

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
      if (targetInSim) targetInSim.size.height = Math.round(newSize.height);

      const newTiles: TileConfig[] = [];
      let packedY = 0;

      rows.forEach((row) => {
        let maxRowHeight = 0;
        row.forEach((tile) => {
          newTiles.push({ ...tile, position: { ...tile.position, y: packedY } });
          maxRowHeight = Math.max(maxRowHeight, tile.size.height);
        });
        packedY += maxRowHeight + GAP;
      });

      return newTiles;
    });
    
    setPreviewLayout(null);
  }, []);




  const handleMiniAppClick = async (appName: string) => {
    // 1. Identify the Workspace ID from our hardcoded map
    const targetWorkspaceId = WORKSPACE_ID_MAP[workspaceSlug];
    
    // 2. Set the active name immediately for UI responsiveness
    setActiveMiniApp(appName);
    setMiniAppAddRecord(false);

    try {
      // 3. Fetch the full schema for this specific app
      const { data: appData, error } = await supabase
        .schema('app_private')
        .from('mini_apps')
        .select('*')
        .eq('workspace_id', targetWorkspaceId)
        .eq('name', appName)
        .or(`organization_id.eq.${organization?.id},is_preset.eq.true`)
        .single();

      if (error) {
        console.warn('[WorkspaceDashboard] This might be a static app, no DB schema found.');
        return;
      }

      // 4. Pass the fetched schema to your view (we'll ensure MiniAppView handles this)
      console.log('[WorkspaceDashboard] Loaded schema for:', appName, appData.schema_definition);
      
      // If your MiniAppView is state-driven, you might want to store this in a 'currentAppSchema' state
      // For now, ensure your onOpenMiniApp callback is aware of the full data if needed
      onOpenMiniApp(appName.toLowerCase());
      
    } catch (err) {
      console.error('Error fetching app schema:', err);
    }
  };

  const handleSaveMiniApp = (name: string, fields: any[], schema: Record<string, any>) => {
    const targetWorkspaceId = resolvedWorkspaceId || WORKSPACE_ID_MAP[workspaceSlug];

    // ⚡ RELAXED GUARDRAIL: We bypass this for Platform Owners because they can deploy globally
    // and don't strictly need a local organization context to save presets.
    if (!isPlatformOwner() && (!organization?.id || !targetWorkspaceId)) {
      console.error('[WorkspaceDashboard] Missing Context:', { orgId: organization?.id, workspaceId: targetWorkspaceId });
      alert("Error: Missing Organization or Workspace context. Your user profile might not have the correct permissions loaded.");
      return; 
    }
    
    console.log('Saving MiniApp UI State:', { name, fields, schema });
    
    const oldName = editingApp?.name;
    
    // ⚡ FIX: Grab the exact layout of tabs as they look right now
    let currentRenderedOrder = [...allMiniAppNames];
    let orderChanged = false;

    // 1. Handle Renaming an existing app
    if (oldName && oldName !== name) {
      setDynamicMiniApps(prev => prev.map(n => n === oldName ? name : n));
      
      // Inject the new name exactly where the old name was in our tracker
      currentRenderedOrder = currentRenderedOrder.map(n => n === oldName ? name : n);
      setTabOrder(currentRenderedOrder);
      orderChanged = true;
      
      setAppIdMap(prev => { const next = {...prev}; next[name] = next[oldName]; delete next[oldName]; return next; });
      setAppIconMap(prev => { const next = {...prev}; next[name] = schema.icon || next[oldName]; delete next[oldName]; return next; });
    } 
    // 2. Handle Creating a brand new app
    else if (name && !allMiniAppNames.includes(name)) {
      setDynamicMiniApps(prev => [...prev, name]);
      
      // Append new apps to our permanent tracker
      currentRenderedOrder = [...currentRenderedOrder, name];
      setTabOrder(currentRenderedOrder);
      orderChanged = true;
      
      if (schema.icon) setAppIconMap(prev => ({ ...prev, [name]: schema.icon }));
    } 
    // 3. Handle Standard Edits (No rename)
    else if (schema.icon) {
      setAppIconMap(prev => ({ ...prev, [name]: schema.icon }));
    }

    // ⚡ FIX: If the tab order array changed, save it to the DB instantly so the refresh doesn't break it
    if (orderChanged) {
      if (organization?.id) {
        const orderKey = `miniapp-tab-order-${workspaceSlug}-${organization.id}`;
        localStorage.setItem(orderKey, JSON.stringify(currentRenderedOrder));
      }
      persistTabOrder(currentRenderedOrder);
    }

    setShowMiniAppBuilder(false);
    setEditingApp(null);

    // Log activity immediately for MiniApp creation
    const userName = (user as any)?.name || (user as any)?.full_name || (user as any)?.email || 'Unknown';
    logActivityImmediate({
      workspace_slug: workspaceSlug,
      user_id: userId,
      user_name: userName,
      action_type: 'created',
      entity_type: 'miniapp',
      entity_name: name,
      target: name,
      action: 'created MiniApp',
      metadata: { field_count: fields?.length || 0 },
    });

    // Switch to the newly created/edited tab
    setTimeout(() => {
      setActiveMiniApp(name);
      onOpenMiniApp(name.toLowerCase());
    }, 200);
    
    // ⚡ Slight delay to ensure DB transaction finishes before fetching
    setTimeout(() => setUpdateKey(Date.now()), 500); 
  };

  // Open the MiniApp Builder in Edit Mode with properly parsed fields
  // ⚡ FIX: Added targetTab parameter with default
  const handleEditMiniApp = async (appName: string, targetTab: 'template' | 'workflows' | 'settings' = 'template') => {
    if (!organization?.id) {
      console.error('[WorkspaceDashboard] Missing Org ID for edit.');
      return;
    }

    try {
      // 1. Fetch the exact app record from the database using the strictly tracked ID map
      const exactAppId = appIdMapRef.current[appName] || appIdMap[appName];
      
      let query = supabase.schema('app_private').from('mini_apps').select('*');
      
      // ⚡ FIX: Look up the exact local clone ID to ensure RLS doesn't block saves!
      if (exactAppId) {
        query = query.eq('id', exactAppId);
      } else {
        query = query.ilike('name', appName).eq('workspace_id', resolvedWorkspaceId || WORKSPACE_ID_MAP[workspaceSlug]);
      }

      const { data: appRecords, error } = await query.limit(1);

      if (error) throw error;

      // ⚡ Prevent the hard crash if the app hasn't been initialized yet
      if (!appRecords || appRecords.length === 0) {
        alert(`MiniApp '${appName}' has not been initialized in the database yet. Please refresh the page to sync presets.`);
        return;
      }

      const data = appRecords[0];

      // 2. Safely unpack the schema definition
      let schemaDef;
      try {
        schemaDef = typeof data.schema_definition === 'string' 
          ? JSON.parse(data.schema_definition) 
          : data.schema_definition;
      } catch (e) {
        schemaDef = { fields: [] };
      }

      // 3. Extract and AUTO-REPAIR the fields array!
      let parsedFields = (schemaDef && Array.isArray(schemaDef.fields)) 
        ? schemaDef.fields 
        : [];

      // ⚡ FIX: Sort by the saved 1D array order first, then map the colSpan!
      parsedFields = [...parsedFields].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field: any, index: number) => {
        return {
          ...field,
          row: field.row !== undefined ? field.row : index,
          column: field.column || 1, 
          // Preserve the fluid grid colSpan!
          colSpan: field.colSpan || (field.type === 'split_separator' ? 6 : (field.columnSpan === 2 ? 6 : 3)),
        };
      });

      console.log(`[WorkspaceDashboard] Opening builder for ${appName} with ${parsedFields.length} fields.`);

      // 4. Populate the editing state with the exact structure the Builder expects
      setEditingApp({
        id: data.id,
        slug: data.slug, // ⚡ PASS SLUG TO BUILDER
        name: data.name,
        description: schemaDef?.description || '', 
        icon: data.icon || schemaDef?.icon || 'grid', 
        fields: parsedFields, 
        layouts: schemaDef?.layouts || ['table', 'card'],
        is_preset: data.is_preset,
        appSettings: typeof data.app_settings === 'string' ? JSON.parse(data.app_settings) : data.app_settings,
        itemIdSettings: typeof data.item_id_settings === 'string' ? JSON.parse(data.item_id_settings) : data.item_id_settings,
        created_by: data.created_by
      });

      // 5. Open the modal
      setBuilderInitialTab(targetTab); // ⚡ Tell the builder which tab to open
      setShowMiniAppBuilder(true);

    } catch (err: any) {
      console.error('[WorkspaceDashboard] Error fetching app for edit:', err);
      // ⚡ Actually show the true error so we don't have to guess in the future
      alert(`Could not load the app for editing: ${err.message}`);
    }
  };

  // ⚡ Update the parameters to accept appId
  const handleContextMenu = (e: React.MouseEvent, appId: string, appName: string) => {
    e.preventDefault();
    setContextMenu({ 
      appId, // ⚡ Store the ID in the state
      appName, 
      x: e.clientX, 
      y: e.clientY 
    });
  };


  const toggleFavorite = async (appName: string) => {
    const wasFav = favorites.has(appName);
    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(appName)) next.delete(appName);
      else next.add(appName);
      return next;
    });
    // Persist to database
    try {
      if (wasFav) {
        await supabase.from('miniapp_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('workspace_slug', workspaceSlug)
          .eq('app_name', appName);
      } else {
        await supabase.from('miniapp_favorites')
          .upsert({
            user_id: userId,
            workspace_slug: workspaceSlug,
            app_name: appName,
            display_order: favorites.size,
          }, { onConflict: 'user_id,workspace_slug,app_name' });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert on error
      setFavorites(prev => {
        const next = new Set(prev);
        if (wasFav) next.add(appName);
        else next.delete(appName);
        return next;
      });
    }
  };


  const handleNewWindow = (appName: string) => {
    // Safely use the exact path the user is currently on to avoid 404s and login redirects
    const currentPath = window.location.pathname;
    window.open(`${currentPath}?workspace=${workspaceSlug}&app=${encodeURIComponent(appName)}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no');
  };

  const handleFullScreen = (appName: string) => {
    handleMiniAppClick(appName);
    // Request fullscreen on next tick after render
    setTimeout(() => {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }, 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return `bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]`;
      case 'high': return `bg-orange-500 shadow-[0_0_8px_rgba(255,153,0,0.5)]`;
      case 'medium': return `bg-cyan-500 shadow-[0_0_8px_rgba(0,255,255,0.5)]`;
      default: return 'bg-gray-500';
    }
  };

  // ⚡ FIX: Direct passthrough from your WorkspaceColorContext
  const cutTabColor = wsColor.colorName;

  const getLowestTileBottom = () => tiles.length === 0 ? 100 : Math.max(...tiles.map(t => t.position.y + t.size.height)) + 50;
  const allTilesData = tiles.map(t => ({ id: t.id, position: { x: t.position.x, y: t.position.y + TILE_Y_OFFSET }, size: t.size }));

  const appCount = allMiniAppNames.length;
  const isNearAppLimit = appCount >= MAX_MINI_APPS_PER_WORKSPACE - 5;
  const isAtAppLimit = appCount >= MAX_MINI_APPS_PER_WORKSPACE;


  // Render tile content
  const renderTileContent = (tile: TileConfig) => {
    switch (tile.widgetId) {
      case 'stats':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-black/50 rounded-xl p-3" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.3)` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-xs font-mono">{stat.title}</span>
                    <Icon size={16} style={{ color: wsColor.primary, filter: `drop-shadow(0 0 4px ${wsColor.primary})` }} />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold text-white font-mono">{stat.value}</span>
                    <div className={`flex items-center gap-1 text-xs ${stat.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stat.change >= 0 ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
                      <span>{Math.abs(stat.change)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      case 'activity-stream': {
        // Use real activities from DB, with fallback to mock data
        const timeAgo = (dateStr: string): string => {
          const now = new Date(); const date = new Date(dateStr);
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) return 'just now';
          if (diffMins < 60) return `${diffMins}m ago`;
          const diffHrs = Math.floor(diffMins / 60);
          if (diffHrs < 24) return `${diffHrs}h ago`;
          return `${Math.floor(diffHrs / 24)}d ago`;
        };

        const fallbackActivities = [
          { id: 'f1', user_name: 'John Doe', action: 'created a new record in', target: 'Contacts', created_at: new Date(Date.now() - 120000).toISOString() },
          { id: 'f2', user_name: 'Jane Smith', action: 'updated', target: 'Project Alpha', created_at: new Date(Date.now() - 300000).toISOString() },
          { id: 'f3', user_name: 'Mike Johnson', action: 'completed task in', target: 'Procedures', created_at: new Date(Date.now() - 480000).toISOString() },
          { id: 'f4', user_name: 'Sarah Wilson', action: 'commented on', target: 'Budget Report', created_at: new Date(Date.now() - 720000).toISOString() },
          { id: 'f5', user_name: 'Tom Brown', action: 'uploaded file to', target: 'Documents', created_at: new Date(Date.now() - 900000).toISOString() },
          { id: 'f6', user_name: 'John Doe', action: 'assigned task to', target: 'Sarah Wilson', created_at: new Date(Date.now() - 1200000).toISOString() },
        ];

        const displayActivities = activities.length > 0 ? activities : fallbackActivities;

        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
                <ActivityIcon size={16} style={{ color: wsColor.primary }} /> Live Activity
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: wsColor.primary }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: wsColor.primary }} />
                </span>
                {activities.length > 0 && <span className="text-[9px] text-green-400 font-mono ml-1">LIVE</span>}
              </h3>
            </div>
            <div className={`space-y-2 max-h-[260px] overflow-y-auto ${scrollbarClass}`}>
              {displayActivities.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center gap-2 p-2 bg-black/30 rounded-lg" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.15)` }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium font-mono flex-shrink-0" style={{ background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.2), rgba(0,0,0,0.8))`, color: wsColor.primary }}>
                    {activity.user_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 font-mono truncate">
                      <span className="text-white font-medium">{activity.user_name}</span>
                      {' '}{activity.action}{' '}
                      <span style={{ color: wsColor.primary }}>{activity.target}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">{timeAgo(activity.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'ws-tasks':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <TaskIcon size={16} style={{ color: wsColor.primary }} /> Tasks
            </h3>
            <div className="space-y-2">
              {[
                { title: 'Review Q4 budget', priority: 'urgent', status: 'pending' },
                { title: 'Update employee handbook', priority: 'high', status: 'in_progress' },
                { title: 'Client meeting prep', priority: 'medium', status: 'pending' },
              ].map((task, i) => (
                <div key={i} className="p-2 bg-black/30 rounded-lg" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.15)` }}>
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${getPriorityColor(task.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-white truncate">{task.title}</p>
                      <span className={`text-[10px] font-mono ${task.status === 'in_progress' ? 'text-cyan-400' : 'text-yellow-400'}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ws-events':
        return (
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 font-mono">
              <CalendarIcon size={16} style={{ color: wsColor.primary }} /> Upcoming Events
            </h3>
            <div className="space-y-2">
              {[
                { title: 'Team Standup', time: '10:00 AM' },
                { title: 'Client Review', time: '2:00 PM' },
                { title: 'Sprint Planning', time: '4:00 PM' },
              ].map((event, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-black/30 rounded-lg" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.15)` }}>
                  <CalendarIcon size={14} style={{ color: wsColor.primary }} />
                  <div className="flex-1">
                    <p className="text-xs font-mono text-white">{event.title}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Security tabs definition
  const securityTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ShieldIcon },
    { id: 'deep_scan', label: 'Deep Scan', icon: CpuIcon },
    { id: 'scanner', label: 'File Scanner', icon: FileIcon },
    { id: 'network', label: 'Network', icon: ActivityIcon },
    { id: 'alerts', label: 'Alerts', icon: BuildIcon },
    { id: 'compliance', label: 'Compliance', icon: TaskIcon },
    { id: 'reports', label: 'Reports', icon: BarChartIcon },
    { id: 'users', label: 'Access', icon: UsersIcon },
  ];



  return (
    <div className={`min-h-screen bg-black pt-3 pb-24 overflow-x-hidden w-full relative ${scrollbarClass}`}>
      
      {/* ⚡ DYNAMIC THEME INJECTION: Forces custom database colors to generate glows, fills, and borders! */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* 1. Text color and glow for the active tab */
        .cut-tab-active {
          color: ${wsColor.primary} !important;
          text-shadow: 0 0 10px rgba(${wsColor.rgb}, 0.5) !important;
        }
        
        /* 2. Apply borders, background fill, and inner glow to the pseudo-elements that form the tab shape */
        .cut-tab-active::before,
        .cut-tab-active::after {
          border-color: ${wsColor.primary} !important;
          background-color: rgba(${wsColor.rgb}, 0.15) !important;
          box-shadow: inset 0 -2px 15px rgba(${wsColor.rgb}, 0.3) !important;
        }
        
        /* 3. Apply a subtle background tint and border highlight when hovering over INACTIVE tabs */
        .cut-tab:not(.cut-tab-active):hover::before,
        .cut-tab:not(.cut-tab-active):hover::after {
          background-color: rgba(${wsColor.rgb}, 0.05) !important;
          border-color: rgba(${wsColor.rgb}, 0.4) !important;
        }
        
        /* 4. Make the SVG icons glow */
        .cut-tab-active svg {
          filter: drop-shadow(0 0 6px rgba(${wsColor.rgb}, 0.8)) !important;
        }
      `}} />

      {/* Workspace Initialization Loading Overlay */}
      {(wsInitializing || wsInitError) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 p-10 rounded-2xl max-w-md w-full mx-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.05), rgba(0,0,0,0.95))`, boxShadow: `0 0 60px rgba(${wsColor.rgb}, 0.15)` }}>
            
            {/* Error State */}
            {wsInitError ? (
              <>
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full" style={{ border: `3px solid rgba(239, 68, 68, 0.3)` }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-mono font-bold text-white mb-2">Setup Issue</h3>
                  <p className="text-sm font-mono text-gray-400 leading-relaxed">{wsInitError}</p>
                </div>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={handleRetryInit}
                    className="flex-1 px-5 py-2.5 rounded-lg font-mono font-medium text-sm transition-all duration-200 hover:scale-105"
                    style={{ background: `rgba(${wsColor.rgb}, 0.15)`, border: `1px solid rgba(${wsColor.rgb}, 0.4)`, color: wsColor.primary }}
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleSkipInit}
                    className="flex-1 px-5 py-2.5 rounded-lg font-mono font-medium text-sm transition-all duration-200 hover:scale-105 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                  >
                    Continue Anyway
                  </button>
                </div>
              </>
            ) : (
              /* Loading State */
              <>
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full animate-spin" style={{ border: `3px solid rgba(${wsColor.rgb}, 0.15)`, borderTopColor: wsColor.primary }} />
                  <div className="absolute inset-2 rounded-full animate-spin" style={{ border: `2px solid rgba(${wsColor.rgb}, 0.1)`, borderBottomColor: wsColor.primary, animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <DatabaseIcon size={20} style={{ color: wsColor.primary, filter: `drop-shadow(0 0 8px ${wsColor.primary})` }} />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-mono font-bold text-white mb-1">Setting up workspace...</h3>
                  <p className="text-sm font-mono text-gray-500">Initializing <span style={{ color: wsColor.primary }}>{workspaceConfig.name}</span> workspace and mini apps</p>
                </div>

                {/* Progress info */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-600">
                    <span>Elapsed: {Math.round(wsInitElapsed / 1000)}s</span>
                    {wsInitRetryCount > 0 && (
                      <span className="text-amber-500">Retry {wsInitRetryCount}/{WS_INIT_MAX_RETRIES}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, (wsInitElapsed / WS_INIT_TIMEOUT_MS) * 100)}%`,
                        background: wsInitElapsed > WS_INIT_TIMEOUT_MS * 0.7 
                          ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                          : `linear-gradient(90deg, ${wsColor.primary}, rgba(${wsColor.rgb}, 0.5))`,
                      }}
                    />
                  </div>
                  {wsInitElapsed > 10000 && (
                    <p className="text-[10px] text-gray-600 font-mono text-center">
                      Taking longer than expected...
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: wsColor.primary }} />
                  <span className="text-xs font-mono text-gray-600">
                    {wsInitRetryCount > 0 ? 'Retrying connection...' : 'Creating database records...'}
                  </span>
                </div>

                {/* Skip button appears after 5 seconds */}
                {wsInitElapsed > 5000 && (
                  <button
                    onClick={handleSkipInit}
                    className="px-4 py-2 rounded-lg font-mono text-xs text-gray-500 hover:text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
                  >
                    Skip and continue
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}




      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.03), transparent, rgba(${wsColor.rgb}, 0.02))` }} />
      <div className="fixed inset-0 hex-pattern opacity-10 pointer-events-none" />

      {/* Tab Bar */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-lg" style={{ borderBottom: `1px solid rgba(${wsColor.rgb}, 0.3)` }}>
        <div className="px-4 max-w-full mx-auto">
          <div className={`whitespace-nowrap flex items-end gap-1 pb-1 ${isTabsWrapped ? 'flex-wrap overflow-hidden' : `flex-nowrap overflow-x-auto ${scrollbarClass}`}`} style={{ paddingTop: '3px', marginBottom: '0px' }}>

            {/* Toggle Wrap Button */}
            <button
              onClick={() => setIsTabsWrapped(!isTabsWrapped)}
              className="h-[38px] px-2 mb-0.5 flex items-center justify-center rounded-lg border transition-all shrink-0 group hover:bg-white/5"
              style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)`, color: wsColor.primary }}
              title={isTabsWrapped ? "Horizontal Scroll View" : "Grid View"}
            >
              <div className={`transition-transform duration-300 ${isTabsWrapped ? 'rotate-90' : 'rotate-0'}`}>
                <ChevronRightIcon size={20} />
              </div>
            </button>

            {/* Toggle Condensed Button */}
            <button
              onClick={() => {
                setIsTabsCondensed(!isTabsCondensed);
                if (!isTabsCondensed) setIsTabsWrapped(true); 
              }}
              className={`h-[38px] px-2 mb-0.5 flex items-center justify-center rounded-lg border transition-all shrink-0 ${isTabsCondensed ? 'bg-white/10' : 'hover:bg-white/5'}`}
              style={{ 
                borderColor: isTabsCondensed ? wsColor.primary : `rgba(${wsColor.rgb}, 0.2)`,
                color: isTabsCondensed ? wsColor.primary : '#6b7280',
                boxShadow: isTabsCondensed ? `0 0 15px rgba(${wsColor.rgb}, 0.2)` : 'none'
              }}
              title={isTabsCondensed ? "Expand Tabs" : "Condense to Icons"}
            >
              {isTabsCondensed ? <ExpandIcon size={18} className="animate-pulse" /> : <ShrinkIcon size={18} />}
            </button>

            {isSecurityWorkspace ? (
              /* ─── Security Workspace Tabs ─── */
              <>
                {securityTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeMiniApp === null && activeSecurityTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      title={isTabsCondensed ? tab.label : undefined}
                      onClick={() => { setActiveMiniApp(null); setActiveSecurityTab(tab.id); }}
                      className={`${isTabsCondensed ? 'p-2 rounded-xl mb-1' : `px-4 py-2 cut-tab cut-tab-${cutTabColor}`} relative text-sm font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center ${isTabsCondensed ? 'justify-center' : 'gap-1.5'} flex-shrink-0 miniapp-icon-glow ${
                        isActive ? (isTabsCondensed ? 'bg-white/10 ring-1' : 'cut-tab-active') : 'text-gray-500 hover:text-gray-300'
                      }`}
                      style={{
                        minWidth: isTabsCondensed ? '42px' : 'auto',
                        ...(isActive ? { color: wsColor.primary, ...(isTabsCondensed ? { ringColor: `rgba(${wsColor.rgb}, 0.5)` } : {}) } : {})
                      }}
                    >
                      {isActive && !isTabsCondensed && <span className="cut-tab-shimmer-el" />}
                      <span className={`relative z-[1] flex items-center ${isTabsCondensed ? 'justify-center' : 'gap-1.5'}`}>
                        <Icon size={isTabsCondensed ? 20 : 14} className="flex-shrink-0" />
                        {!isTabsCondensed && <span>{tab.label}</span>}
                      </span>
                    </button>
                  );
                })}
              </>
            ) : (
              /* ─── Normal Workspace Tabs ─── */
        <>
          {/* Dashboard Tab */}
          <button
            onClick={() => { setActiveMiniApp(null); setMiniAppAddRecord(false); }}
            title={isTabsCondensed ? "Dashboard" : undefined}
            className={`${isTabsCondensed ? 'p-2 rounded-xl mb-1' : `px-6 py-2 cut-tab cut-tab-${cutTabColor}`} relative text-sm font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center ${isTabsCondensed ? 'justify-center' : 'gap-2'} flex-shrink-0 miniapp-icon-glow ${
              activeMiniApp === null ? (isTabsCondensed ? 'bg-white/10 ring-1' : 'cut-tab-active') : 'text-gray-500 hover:text-gray-300'
            }`}
            style={{
              minWidth: isTabsCondensed ? '42px' : 'auto',
              ...(activeMiniApp === null ? { color: wsColor.primary, ...(isTabsCondensed ? { ringColor: `rgba(${wsColor.rgb}, 0.5)` } : {}) } : {})
            }}
          >
            {activeMiniApp === null && !isTabsCondensed && <span className="cut-tab-shimmer-el" />}
            <span className={`relative z-[1] flex items-center ${isTabsCondensed ? 'justify-center' : 'gap-2'}`}>
              {/* ⚡ FIX: Changed BarChartIcon to LayoutDashboard */}
              <LayoutDashboard size={isTabsCondensed ? 20 : 16} className="flex-shrink-0" />
              {!isTabsCondensed && <span>Dashboard</span>}
            </span>
          </button>
                
                <div className="w-px h-5 mx-0.5 mb-1 flex-shrink-0" style={{ backgroundColor: `rgba(${wsColor.rgb}, 0.2)` }} />
                
                {allMiniAppNames.map((appName, tabIdx) => {
                  // ⚡ FIX: Safely resolve the icon using our PascalCase helper
                  const MiniAppIcon = resolveDashboardIcon(appIconMap[appName], appName);
                  
                  const isFav = favorites.has(appName);
                  const isDragOver = dragOverTabIdx === tabIdx && dragTabIdx !== null && dragTabIdx !== tabIdx;
                  return (
                    <button
                      key={appName}
                      title={isTabsCondensed ? appName : undefined}
                      draggable={canReorderTabs}
                      onDragStart={(e) => handleTabDragStart(e, tabIdx)}
                      onDragOver={(e) => handleTabDragOver(e, tabIdx)}
                      onDragEnd={handleTabDragEnd}
                      onDrop={(e) => handleTabDrop(e, tabIdx)}
                      onClick={() => handleMiniAppClick(appName)}
                      onContextMenu={(e) => handleContextMenu(e, appIdMap[appName], appName)}
                      className={`${isTabsCondensed ? 'p-2 rounded-xl mb-1' : `px-4 py-2 cut-tab cut-tab-${cutTabColor}`} relative text-sm font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center ${isTabsCondensed ? 'justify-center' : 'gap-1.5'} flex-shrink-0 miniapp-icon-glow group ${
                        activeMiniApp === appName ? (isTabsCondensed ? 'bg-white/10 ring-1' : 'cut-tab-active') : 'text-gray-500 hover:text-gray-300'
                      } ${isDragOver ? 'ring-2 ring-offset-1 ring-offset-black' : ''}`}
                      style={{
                        minWidth: isTabsCondensed ? '42px' : 'auto',
                        ...(activeMiniApp === appName ? { color: wsColor.primary, ...(isTabsCondensed ? { ringColor: `rgba(${wsColor.rgb}, 0.5)` } : {}) } : {}),
                        ...(isDragOver ? { ringColor: wsColor.primary, boxShadow: `0 0 8px ${wsColor.primary}` } : {}),
                      }}
                    >
                      {activeMiniApp === appName && !isTabsCondensed && <span className="cut-tab-shimmer-el" />}
                      <span className={`relative z-[1] flex items-center ${isTabsCondensed ? 'justify-center' : 'gap-1.5 pr-6 truncate'}`}>
                        {canReorderTabs && !isTabsCondensed && (
                          <GripVerticalIcon size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity" />
                        )}
                        {isFav && !isTabsCondensed && (
                          <svg width={10} height={10} viewBox="0 0 24 24" fill={wsColor.primary} stroke="none" className="flex-shrink-0">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
                          </svg>
                        )}
                        <div 
                          className="relative group/ws-dropdown flex items-center justify-center" 
                          onClick={(e) => {
                            // ⚡ FIX: When condensed, the icon is the entire tab. Let the click bubble up to change tabs normally!
                            if (isTabsCondensed) return;
                            
                            e.stopPropagation();
                            if (activeMiniApp !== appName) handleMiniAppClick(appName);
                            setAppWorkspaceDropdown(appWorkspaceDropdown === appName ? null : appName);
                          }}
                        >
                          <MiniAppIcon size={isTabsCondensed ? 20 : 14} className="flex-shrink-0 transition-all duration-300 hover:scale-110 cursor-pointer" />
                          
                          {/* Workspace Switcher Dropdown */}
                          {appWorkspaceDropdown === appName && (
                            <div
                              className="absolute top-[130%] left-0 w-48 p-2 rounded-xl border bg-black/95 backdrop-blur-xl z-[200] animate-in fade-in zoom-in-95 shadow-2xl cursor-default"
                              style={{
                                borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                                boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wsColor.rgb}, 0.2)`
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-2 pb-2 mb-2 border-b border-white/10 text-[10px] uppercase tracking-wider font-mono text-gray-500 text-left">
                                Switch Workspace
                              </div>
                              <div className="flex flex-col gap-1">
                                {Object.keys(WORKSPACE_ID_MAP).map(ws => (
                                  <div
                                    key={ws}
                                    className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-colors capitalize cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `${window.location.pathname}?workspace=${ws}`;
                                    }}
                                  >
                                    <WorkspaceIcon 
                                      slug={ws} 
                                      size={14} 
                                      className={ws === workspaceSlug ? `text-${wsColor.colorName}-400` : "opacity-70"} 
                                      style={ws === workspaceSlug ? { color: wsColor.primary } : {}} 
                                    />
                                    <span className={ws === workspaceSlug ? "font-bold text-white" : ""}>
                                      {ws}
                                    </span>
                                    {ws === workspaceSlug && (
                                      <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wsColor.primary }} />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {!isTabsCondensed && <span>{appName}</span>}
                        {!isTabsCondensed && <span className="text-xs opacity-60">({miniAppRecordCounts[appName] || 0})</span>}
                        
                        {/* Gear/Popout icons logic inside a right-aligned container */}
                        {!isTabsCondensed && (
                          <span className="absolute right-2 inset-y-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <span onClick={(e) => { e.stopPropagation(); handleNewWindow(appName); }} className="p-0.5 rounded hover:bg-white/10 transition-all cursor-pointer" title="Open in new window">
                              <PopoutIcon size={11} style={{ color: wsColor.primary }} />
                            </span>
                            {/* ⚡ FIX: Pass 'settings' to the function */}
                            {isAdmin && (
                              <span onClick={(e) => { e.stopPropagation(); handleEditMiniApp(appName, 'settings'); }} className="p-0.5 rounded hover:bg-white/10 transition-all cursor-pointer" title="Edit MiniApp">
                                <SettingsIcon size={11} style={{ color: wsColor.primary }} />
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}

                {/* Create MiniApp Button - NOT shown in security workspace */}
                {isAdmin && (
                  <>
                    <div className="w-px h-5 mx-0.5 mb-1 flex-shrink-0" style={{ backgroundColor: `rgba(${wsColor.rgb}, 0.2)` }} />
                    <button 
                      onClick={() => {
                        if (isAtAppLimit) { alert(`Maximum of ${MAX_MINI_APPS_PER_WORKSPACE} mini apps per workspace reached.`); return; }
                        setEditingApp(null); // Clear any previous editing state so builder opens fresh
                        setBuilderInitialTab('template'); // ⚡ FIX: Ensure it defaults to template for new apps!
                        setShowMiniAppBuilder(true);
                      }}
                      title={isTabsCondensed ? "Create App" : undefined}
                      className={`${isTabsCondensed ? 'p-2 rounded-xl mb-1' : 'px-4 py-2 cut-tab cut-tab-green'} relative text-sm font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center ${isTabsCondensed ? 'justify-center bg-white/5 hover:bg-white/10' : 'gap-2'} flex-shrink-0 text-green-400 hover:text-green-300`}
                      style={{ minWidth: isTabsCondensed ? '42px' : 'auto' }}
                    >
                      <span className={`relative z-[1] flex items-center ${isTabsCondensed ? 'justify-center' : 'gap-2'}`}>
                        <PlusIcon size={isTabsCondensed ? 20 : 16} className="drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                        {!isTabsCondensed && <span>Create</span>}
                        {!isTabsCondensed && isNearAppLimit && <span className="text-[10px] text-yellow-400 ml-1">({appCount}/{MAX_MINI_APPS_PER_WORKSPACE})</span>}
                      </span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MiniApp Builder Modal */}
      <MiniAppBuilder
        isOpen={showMiniAppBuilder}
        onClose={() => { setShowMiniAppBuilder(false); setEditingApp(null); }}
        onSave={handleSaveMiniApp}
        // ⚡ EXACT WORKSPACE INJECTION: If editing an app, DO NOT pass a workspace ID, let the builder keep its current one!
        workspaceId={editingApp?.id ? undefined : (resolvedWorkspaceId || WORKSPACE_ID_MAP[workspaceSlug])} 
        existingApp={editingApp || undefined}
        wsColor={wsColor} 
        initialTab={builderInitialTab} 
      />

    {/* External Communication Modal */}
      {externalModalUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setExternalModalUser(null)}>
          <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-sm w-full mx-4 border animate-in fade-in zoom-in-95 duration-200" 
               style={{ 
                 borderColor: `rgba(${wsColor.rgb}, 0.3)`, 
                 background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.05), rgba(0,0,0,0.95))`, 
                 boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.15)` 
               }}
               onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white">External Contact</h3>
              <button onClick={() => setExternalModalUser(null)} className="text-gray-500 hover:text-white transition-colors">
                <CloseIcon size={16} />
              </button>
            </div>
            
            <div className="text-xs font-mono text-gray-400 text-center">
              Reach out to <span className="text-white font-medium">{externalModalUser.name}</span> externally:
            </div>

            <div className="flex gap-4">
              <button 
                title="Call user's phone"
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
                style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
                onClick={() => { console.log('Initiate External Call'); setExternalModalUser(null); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span className="text-sm font-mono font-bold">Call</span>
              </button>
              
              <button 
                title="Text user's phone"
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
                style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
                onClick={() => { console.log('Initiate External Text'); setExternalModalUser(null); }}
              >
                <MessageSquare size={24} />
                <span className="text-sm font-mono font-bold">Text</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Call Modal */}
      {callModalUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setCallModalUser(null)}>
          <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-sm w-full mx-4 border animate-in fade-in zoom-in-95 duration-200" 
               style={{ 
                 borderColor: `rgba(${wsColor.rgb}, 0.3)`, 
                 background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.05), rgba(0,0,0,0.95))`, 
                 boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.15)` 
               }}
               onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white">Start Call</h3>
              <button onClick={() => setCallModalUser(null)} className="text-gray-500 hover:text-white transition-colors">
                <CloseIcon size={16} />
              </button>
            </div>
            
            <div className="text-xs font-mono text-gray-400 text-center">
              Call <span className="text-white font-medium">{callModalUser.name}</span>:
            </div>

            <div className="flex gap-4">
              <button 
                title="Internal system call"
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
                style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
                onClick={() => { console.log('Initiate Audio Call'); setCallModalUser(null); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span className="text-sm font-mono font-bold">Audio</span>
              </button>
              
              <button 
                title="Internal system video call"
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
                style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
                onClick={() => { console.log('Initiate Video Call'); setCallModalUser(null); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                <span className="text-sm font-mono font-bold">Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Modal */}
      {recordModalUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setRecordModalUser(null)}>
          <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-sm w-full mx-4 border animate-in fade-in zoom-in-95 duration-200" 
               style={{ 
                 borderColor: `rgba(${wsColor.rgb}, 0.3)`, 
                 background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.05), rgba(0,0,0,0.95))`, 
                 boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.15)` 
               }}
               onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white">Record Message</h3>
              <button onClick={() => setRecordModalUser(null)} className="text-gray-500 hover:text-white transition-colors">
                <CloseIcon size={16} />
              </button>
            </div>
            
            <div className="text-xs font-mono text-gray-400 text-center">
              Send a recording to <span className="text-white font-medium">{recordModalUser.name}</span>:
            </div>

            <div className="flex gap-4">
              <button 
                title="Record and send internal system audio message"
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
                style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
                onClick={() => { console.log('Initiate Audio Recording'); setRecordModalUser(null); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                <span className="text-sm font-mono font-bold">Audio</span>
              </button>
              
              <button 
                title="Record and send internal system video message"
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
                style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
                onClick={() => { console.log('Initiate Video Recording'); setRecordModalUser(null); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                <span className="text-sm font-mono font-bold">Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Users Full Screen Modal */}
      {showAllUsersModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowAllUsersModal(false)}>
          <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-5xl w-full mx-4 border h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
               style={{
                 borderColor: `rgba(${wsColor.rgb}, 0.3)`,
                 background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.05), rgba(0,0,0,0.95))`,
                 boxShadow: `0 0 60px rgba(${wsColor.rgb}, 0.15)`
               }}
               onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4 flex-shrink-0" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg" style={{ backgroundColor: `rgba(${wsColor.rgb}, 0.1)`, borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}>
                  <UsersIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-mono font-bold text-white tracking-wide">Workspace Directory</h3>
                  <p className="text-sm text-gray-500 font-mono mt-1">{processedDirectoryUsers.length} total members</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                   <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                   <input 
                     type="text" 
                     placeholder="Search users..." 
                     value={directorySearchQuery} 
                     onChange={e => setDirectorySearchQuery(e.target.value)} 
                     className="w-48 sm:w-64 bg-black/50 border rounded-lg pl-9 pr-3 py-2 text-white font-mono text-sm focus:outline-none transition-all" 
                     style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }} 
                   />
                </div>
                
                {/* View Toggles */}
                <div className="flex items-center bg-black/50 border rounded-lg p-1" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}>
                   <button onClick={() => setDirectoryViewMode('grid')} className={`p-1.5 rounded transition-all ${directoryViewMode === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'}`} style={{ color: directoryViewMode === 'grid' ? wsColor.primary : '#6b7280' }} title="Grid View">
                     <LayoutDashboard size={16} />
                   </button>
                   <button onClick={() => setDirectoryViewMode('list')} className={`p-1.5 rounded transition-all ${directoryViewMode === 'list' ? 'bg-white/10' : 'hover:bg-white/5'}`} style={{ color: directoryViewMode === 'list' ? wsColor.primary : '#6b7280' }} title="List View">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                   </button>
                </div>

                <button onClick={() => setShowAllUsersModal(false)} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 ml-1">
                  <CloseIcon size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {directoryViewMode === 'list' ? (
              <div className="flex-1 overflow-y-auto darkwave-scrollbar -mx-2 px-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-gray-800 text-gray-500 font-mono text-xs uppercase tracking-wider">
                       <th className="pb-3 pt-2 pl-4 cursor-pointer hover:text-white transition-colors select-none" onClick={() => { setDirectorySortKey('name'); setDirectorySortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                         User Name <span className="inline-block w-4">{directorySortKey === 'name' ? (directorySortDir === 'asc' ? '↑' : '↓') : ''}</span>
                       </th>
                       <th className="pb-3 pt-2 cursor-pointer hover:text-white transition-colors select-none" onClick={() => { setDirectorySortKey('status'); setDirectorySortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                         Status <span className="inline-block w-4">{directorySortKey === 'status' ? (directorySortDir === 'asc' ? '↑' : '↓') : ''}</span>
                       </th>
                       <th className="pb-3 pt-2">Last Seen</th>
                       <th className="pb-3 pt-2 pr-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {processedDirectoryUsers.length > 0 ? processedDirectoryUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                         <td className="py-3 pl-4 flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold font-mono flex-shrink-0" style={{ borderColor: u.status === 'active' ? `rgba(34,197,94,0.4)` : u.status === 'idle' ? `rgba(234,179,8,0.4)` : `rgba(239,68,68,0.4)`, background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)', color: u.status === 'active' ? wsColor.primary : '#9ca3af' }}>
                             {u.name.split(' ').map(n => n[0]).join('')}
                           </div>
                           <span className="text-white font-mono text-sm truncate">{u.name}</span>
                         </td>
                         <td className="py-3">
                           <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                             <span className="text-gray-400 font-mono text-xs uppercase tracking-wider">{u.status}</span>
                           </div>
                         </td>
                         <td className="py-3 text-gray-500 font-mono text-xs">
                           {u.status === 'active' ? 'Today, 8:42 AM' : 'Yesterday, 4:15 PM'}
                         </td>
                         <td className="py-3 pr-4 text-right">
                           <div className="flex items-center justify-end gap-6 opacity-30 group-hover:opacity-100 transition-opacity">
                              <label className="flex items-center gap-2 cursor-pointer" title="Suspend User">
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Suspend</span>
                                <div className="relative w-8 h-4 rounded-full bg-black border transition-colors" style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}>
                                   <div className="absolute left-[2px] top-[1px] w-3 h-3 rounded-full bg-gray-600 transition-transform"></div>
                                </div>
                              </label>
                              <button className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-all" title="Remove User">
                                <TrashIcon size={16} />
                              </button>
                           </div>
                         </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500 font-mono text-sm">No users match your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto darkwave-scrollbar pr-2 pb-2">
                {processedDirectoryUsers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {processedDirectoryUsers.map(u => {
                      const isOpen = activeUserDropdown === u.id;
                      return (
                        <div key={u.id} className="relative group/usercard">
                          {/* Base Grid Card */}
                          <div 
                            onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(isOpen ? null : u.id); }}
                            className={`flex items-center gap-4 p-3.5 rounded-xl bg-black/40 border transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-lg ${isOpen ? 'ring-2 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
                            style={{ 
                              borderColor: `rgba(${wsColor.rgb}, 0.15)`,
                              ...(isOpen ? { ringColor: wsColor.primary } : {})
                            }}>
                            <div className="relative w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold font-mono transition-all flex-shrink-0"
                                 style={{
                                   borderColor: u.status === 'active' ? `rgba(34,197,94,0.4)` : u.status === 'idle' ? `rgba(234,179,8,0.4)` : `rgba(239,68,68,0.4)`,
                                   background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)',
                                   color: u.status === 'active' ? wsColor.primary : '#9ca3af',
                                 }}>
                              {u.name.split(' ').map(n => n[0]).join('')}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-white font-mono text-sm font-bold truncate transition-colors" style={{ color: u.status === 'active' ? 'white' : '#9ca3af' }}>{u.name}</span>
                              <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider truncate mt-0.5">{u.status}</span>
                            </div>
                          </div>

                          {/* Expanded User Profile Card */}
                          {isOpen && (
                            <div className="absolute top-[110%] w-[380px] max-w-[90vw] p-5 rounded-xl cursor-default flex gap-5 bg-black/95 backdrop-blur-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 z-[100] left-1/2 -translate-x-1/2 sm:[.group\/usercard:nth-child(2n-1)_&]:left-0 sm:[.group\/usercard:nth-child(2n-1)_&]:right-auto sm:[.group\/usercard:nth-child(2n-1)_&]:translate-x-0 sm:[.group\/usercard:nth-child(2n)_&]:left-auto sm:[.group\/usercard:nth-child(2n)_&]:right-0 sm:[.group\/usercard:nth-child(2n)_&]:translate-x-0 md:[.group\/usercard:nth-child(3n-2)_&]:left-0 md:[.group\/usercard:nth-child(3n-2)_&]:right-auto md:[.group\/usercard:nth-child(3n-2)_&]:translate-x-0 md:[.group\/usercard:nth-child(3n-1)_&]:left-1/2 md:[.group\/usercard:nth-child(3n-1)_&]:right-auto md:[.group\/usercard:nth-child(3n-1)_&]:-translate-x-1/2 md:[.group\/usercard:nth-child(3n)_&]:left-auto md:[.group\/usercard:nth-child(3n)_&]:right-0 md:[.group\/usercard:nth-child(3n)_&]:translate-x-0 lg:[.group\/usercard:nth-child(4n-3)_&]:left-0 lg:[.group\/usercard:nth-child(4n-3)_&]:right-auto lg:[.group\/usercard:nth-child(4n-3)_&]:translate-x-0 lg:[.group\/usercard:nth-child(4n-2)_&]:left-1/2 lg:[.group\/usercard:nth-child(4n-2)_&]:right-auto lg:[.group\/usercard:nth-child(4n-2)_&]:-translate-x-1/2 lg:[.group\/usercard:nth-child(4n-1)_&]:left-1/2 lg:[.group\/usercard:nth-child(4n-1)_&]:right-auto lg:[.group\/usercard:nth-child(4n-1)_&]:-translate-x-1/2 lg:[.group\/usercard:nth-child(4n)_&]:left-auto lg:[.group\/usercard:nth-child(4n)_&]:right-0 lg:[.group\/usercard:nth-child(4n)_&]:translate-x-0"
                                 style={{ 
                                   borderColor: `rgba(${wsColor.rgb}, 0.5)`, 
                                   boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 25px rgba(${wsColor.rgb}, 0.3)`,
                                   filter: `drop-shadow(0 0 10px rgba(${wsColor.rgb}, 0.15))`
                                 }}
                                 onClick={(e) => e.stopPropagation()}
                            >
                              {/* Left Column: Avatar + Bottom-Aligned Toggles */}
                              <div className="flex flex-col items-center flex-shrink-0 w-[108px]">
                                <div className="w-[86px] h-[86px] rounded-full flex items-center justify-center text-2xl font-bold font-mono" 
                                     style={{ 
                                       background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(0,0,0,0.9))`, 
                                       border: `2px solid ${wsColor.primary}`, 
                                       color: wsColor.primary,
                                       boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.4)`
                                     }}>
                                  {u.name.split(' ').map(n => n[0]).join('')}
                                </div>

                                {/* Status Message Section */}
                                <div className="mt-4 mb-3 w-full flex-1 flex flex-col">
                                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider mb-1 text-left" style={{ color: wsColor.primary }}>
                                    Status:
                                  </span>
                                  <div className="flex-1 p-2 w-full rounded bg-white/5 border flex items-start justify-start" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}>
                                    <span className="text-[10px] font-mono text-gray-400 italic leading-tight text-left">
                                      "A short custom status message on the user's profile will appear here..."
                                    </span>
                                  </div>
                                </div>

                                {/* Toggles Container */}
                                <div className="flex flex-col gap-2.5 w-full pb-1">
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Suspend</span>
                                    <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                            style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}
                                            onClick={(e) => { e.stopPropagation(); console.log('Suspend user'); }}>
                                      <div className="w-2 h-2 rounded-full bg-gray-600 absolute top-[2px] left-[2px]" />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Remove</span>
                                    <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                            style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}
                                            onClick={(e) => { e.stopPropagation(); console.log('Remove user'); }}>
                                      <div className="w-2 h-2 rounded-full bg-gray-800 absolute top-[2px] left-[2px]" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Right Column: User Info, Status Message + Vertical Actions */}
                              <div className="flex flex-col min-w-0 flex-1">
                                
                                {/* Identity Section */}
                                <div className="mb-2">
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <h4 className="text-white font-mono text-base font-bold truncate leading-tight">{u.name}</h4>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-[1px]">
                                      <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                      <span className="text-gray-300 font-mono text-[10px] uppercase tracking-wider">{u.status}</span>
                                    </div>
                                  </div>
                                  <div className="text-gray-500 font-mono text-[10px] truncate">
                                    {u.status === 'active' ? 'Logged in since: Today, 8:42 AM' : 'Last seen at: Yesterday, 4:15 PM'}
                                  </div>
                                </div>
                                
                                {/* Vertical Action Buttons */}
                                <div className="flex flex-col gap-1 pt-3 border-t" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
                                  
                                  <div className="relative group w-full">
                                    <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors text-gray-300 group-hover:text-white">
                                       <MessageSquare size={13} className="flex-shrink-0" />
                                       <span className="text-[11px] font-mono truncate">Message</span>
                                       <ChevronDownIcon size={10} className="ml-auto -rotate-90 opacity-50" />
                                    </button>
                                    <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-[110]">
                                      <div className="flex flex-col gap-1 p-2 rounded-xl bg-black/95 backdrop-blur-2xl border shadow-2xl w-32 animate-in fade-in slide-in-from-left-2 duration-200"
                                           style={{ 
                                             borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                                             boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wsColor.rgb}, 0.2)`,
                                             filter: `drop-shadow(0 0 10px rgba(${wsColor.rgb}, 0.15))`
                                           }}>
                                        <button title="Internal system message" className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); console.log('Chat clicked'); setActiveUserDropdown(null); }}>
                                          <MessagesSquare size={12} className="flex-shrink-0" /><span>Chat</span>
                                        </button>
                                        <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setExternalModalUser({ id: u.id, name: u.name }); 
                                          setActiveUserDropdown(null); 
                                          setShowAllUsersModal(false); 
                                        }}>
                                          <PopoutIcon size={12} className="flex-shrink-0" /><span>External</span>
                                        </button>
                                        <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setCallModalUser({ id: u.id, name: u.name }); 
                                          setActiveUserDropdown(null); 
                                          setShowAllUsersModal(false); 
                                        }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                          <span>Call</span>
                                        </button>
                                        <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors group/record" onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setRecordModalUser({ id: u.id, name: u.name }); 
                                          setActiveUserDropdown(null); 
                                          setShowAllUsersModal(false); 
                                        }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-hover/record:text-red-500 transition-colors"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>
                                          <span>Record</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <CheckSquare size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Send Task</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <Mail size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Send Email</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <Activity size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Activity</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <PlusIcon size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Workspace</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <Megaphone size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Comms</span>
                                  </button>

                                  {(isPlatformOwner() || isOrganizationAdmin()) && (
                                    <button onClick={() => console.log('Open User Dashboard Overlay')}
                                            className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white border border-white/5">
                                       <LayoutDashboard size={13} className="flex-shrink-0" />
                                       <span className="text-[11px] font-mono truncate font-bold">Dashboard</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500 font-mono text-sm">No users match your search.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workspace Settings Modal */}
      <WorkspaceSettings
        isOpen={showWorkspaceSettings}
        onClose={() => setShowWorkspaceSettings(false)}
        onAppDeleted={(appId, appName) => {
          // ⚡ INSTANT UI REMOVAL: Slice the exact name out of the active arrays
          setDynamicMiniApps(prev => prev.filter(n => n !== appName));
          setTabOrder(prev => prev.filter(n => n !== appName));
          
          // Kick the user back to the dashboard if they were viewing the deleted app
          setActiveMiniApp(prev => prev === appName ? null : prev);

          // Purge it from the local storage cache
          if (organization?.id) {
            const orderKey = `miniapp-tab-order-${workspaceSlug}-${organization.id}`;
            try {
              const saved = localStorage.getItem(orderKey);
              if (saved) {
                const newOrder = JSON.parse(saved).filter((n: string) => n !== appName);
                localStorage.setItem(orderKey, JSON.stringify(newOrder));
              }
            } catch (e) {}
          }
        }}
        workspaceSlug={workspaceSlug}
        workspaceName={workspaceConfig.name}
      />

      {/* Context Menu */}
      {contextMenu && (
        <MiniAppContextMenu
          appId={contextMenu.appId} 
          appName={contextMenu.appName}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          isVisible={true}
          onClose={() => setContextMenu(null)}
          onEdit={() => { handleEditMiniApp(contextMenu.appName); }}
          onWorkflows={() => { console.log('Open workflows for', contextMenu.appName); }}
          onHide={() => { console.log('Hide', contextMenu.appName); }}
          onIntegrations={() => { console.log('Open integrations for', contextMenu.appName); }}
          onShare={() => { console.log('Share', contextMenu.appName); }}
          onImport={() => { console.log('Import to', contextMenu.appName); }}
          onExport={() => { console.log('Export from', contextMenu.appName); }}
          onNotifications={() => { console.log('Notifications for', contextMenu.appName); }}
          // ⚡ DELETED onAdvanced prop here
          onFavorite={() => { toggleFavorite(contextMenu.appName); }}
          isFavorited={favorites.has(contextMenu.appName)}
          wsColor={wsColor}
          isAdmin={isAdmin}
          onDelete={() => { 
            window.location.reload();
          }}
        />
      )}

      {/* Main Content */}
      {activeMiniApp ? (
        <MiniAppView 
          key={`${activeMiniApp}-${updateKey}`}
          appName={activeMiniApp}
          workspaceSlug={workspaceSlug}
          workspaceId={resolvedWorkspaceId || WORKSPACE_ID_MAP[workspaceSlug]}
          isAdmin={isAdmin}
          onBack={() => { setActiveMiniApp(null); setMiniAppAddRecord(false); }}
          initialAddRecord={miniAppAddRecord}
          onEditTemplate={(name) => handleEditMiniApp(name)}
          wsColor={wsColor} // ⚡ FIX: Explicitly pass the resolved workspace color down!
        />

      ) : workspaceSlug === 'security' ? (
        /* Security workspace renders the Q-CORE Security Dashboard */
        <SecurityWorkspaceView wsColor={wsColor} activeTab={activeSecurityTab} />

      ) : (

        <div className="px-4 max-w-full mx-auto pt-4 relative z-10">
          {/* Active Users Bar */}
          <div className="bg-black/50 rounded-xl p-4 mb-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.3)`, boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.1)` }}>
            <div className="flex items-center justify-between gap-4">
              
              {/* Left Side: Dynamic Users Container */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                
                {/* ⚡ UPDATED: Users Toggle Button with Hover Tooltip */}
                <div className="relative group/users-toggle">
                  <button 
                    onClick={() => { 
                      if (showUsersDropdown) setShowUsersDropdown(false); 
                      setIsUsersExpanded(!isUsersExpanded); 
                    }} 
                    className={`flex-shrink-0 w-10 h-10 rounded-full transition-all flex items-center justify-center hover:scale-105 ${isUsersExpanded ? 'mr-0' : ''}`} 
                    style={{ border: `1px solid rgba(${wsColor.rgb}, 0.3)`, backgroundColor: `rgba(${wsColor.rgb}, 0.1)`, color: wsColor.primary }} 
                  >
                    <UsersIcon size={16} />
                  </button>
                  {/* Tooltip for online users */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/users-toggle:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    <div className="bg-black/95 border border-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xl whitespace-nowrap">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)] animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-gray-300">{mockActiveUsers.filter(u => u.status === 'active').length} online</span>
                    </div>
                  </div>
                </div>
                
                <div ref={usersContainerRef} className={`flex gap-2 transition-all duration-300 ease-out ${isUsersExpanded ? 'flex-1 min-w-0 opacity-100' : 'max-w-0 opacity-0 overflow-hidden'}`}>
                  
                  {/* Full Screen Users Button */}
                  <button 
                    onClick={() => setShowAllUsersModal(true)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                    title="View All Directory Users"
                  >
                    <MaximizeIcon size={16} />
                  </button>

                  {/* Top Row Avatars */}
                  <div className="flex flex-1 min-w-0 h-10 items-center pl-1">
                    {mockActiveUsers.slice(0, maxVisibleUsers).map((u, i) => {
                      const isNewGroup = i > 0 && mockActiveUsers[i - 1].status !== u.status;
                      const isOpen = activeUserDropdown === u.id;
                      const isLeftHalf = i < (maxVisibleUsers / 2); // ⚡ Added bounds check
                      return (
                        <div key={u.id} 
                          onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(isOpen ? null : u.id); }}
                          className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium font-mono cursor-pointer transition-all hover:scale-110 flex-shrink-0 ${
                          u.status === 'active' ? 'border-green-500/30 hover:border-green-400 hover:shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                          u.status === 'idle' ? 'border-yellow-500/30 hover:border-yellow-400 hover:shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 
                          'border-red-500/30 hover:border-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                        }`}
                          style={{
                            background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)',
                            color: u.status === 'active' ? wsColor.primary : '#9ca3af',
                            marginLeft: i === 0 ? '0' : (isNewGroup ? '0.5rem' : '-0.5rem'),
                            zIndex: isOpen ? 100 : mockActiveUsers.length - i,
                          }}
                          title={isOpen ? '' : `${u.name} (${u.status})`}>
                          {u.name.split(' ').map(n => n[0]).join('')}

                          {/* User Dropdown Panel */}
                          {isOpen && (
                            <div className={`user-profile-panel absolute top-12 ${isLeftHalf ? 'left-0' : 'right-0'} w-[380px] max-w-[90vw] p-5 rounded-xl cursor-default flex gap-5 bg-black/95 backdrop-blur-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 z-[100]`}
                                 style={{ 
                                   borderColor: `rgba(${wsColor.rgb}, 0.5)`, 
                                   boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 25px rgba(${wsColor.rgb}, 0.3)`,
                                   filter: `drop-shadow(0 0 10px rgba(${wsColor.rgb}, 0.15))`
                                 }}
                                 onClick={(e) => e.stopPropagation()}
                            >
                               {/* Left Column: Avatar + Bottom-Aligned Toggles */}
                               <div className="flex flex-col items-center flex-shrink-0 w-[108px]">
                                 <div className="w-[86px] h-[86px] rounded-full flex items-center justify-center text-2xl font-bold font-mono" 
                                      style={{ 
                                        background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(0,0,0,0.9))`, 
                                        border: `2px solid ${wsColor.primary}`, 
                                        color: wsColor.primary,
                                        boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.4)`
                                      }}>
                                   {u.name.split(' ').map(n => n[0]).join('')}
                                 </div>

                                 {/* Status Message Section (Expanded to fill space) */}
                                 <div className="mt-4 mb-3 w-full flex-1 flex flex-col">
                                   <span 
                                     className="text-[10px] font-mono uppercase font-bold tracking-wider mb-1 text-left" 
                                     style={{ color: wsColor.primary }}
                                   >
                                     Status:
                                   </span>
                                   <div 
                                     className="flex-1 p-2 w-full rounded bg-white/5 border flex items-start justify-start" 
                                     style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
                                   >
                                     <span className="text-[10px] font-mono text-gray-400 italic leading-tight text-left">
                                       "A short custom status message on the user's profile will appear here..."
                                     </span>
                                   </div>
                                 </div>

                                 {/* Toggles Container - Bottom Aligned */}
                                 <div className="flex flex-col gap-2.5 w-full pb-1">
                                   <div className="flex items-center justify-between w-full">
                                     <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Suspend</span>
                                     <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                             style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}
                                             onClick={(e) => { e.stopPropagation(); console.log('Suspend user'); }}>
                                       <div className="w-2 h-2 rounded-full bg-gray-600 absolute top-[2px] left-[2px]" />
                                     </button>
                                   </div>
                                   <div className="flex items-center justify-between w-full">
                                     <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Remove</span>
                                     <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                             style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}
                                             onClick={(e) => { e.stopPropagation(); console.log('Remove user'); }}>
                                       <div className="w-2 h-2 rounded-full bg-gray-800 absolute top-[2px] left-[2px]" />
                                     </button>
                                   </div>
                                 </div>
                               </div>
                               
                               {/* Right Column: User Info, Status Message + Vertical Actions */}
                               <div className="flex flex-col min-w-0 flex-1">
                                 
                                 {/* Identity Section */}
                                 <div className="mb-2">
                                   <div className="flex items-center gap-3 mb-1.5">
                                     <h4 className="text-white font-mono text-base font-bold truncate leading-tight">{u.name}</h4>
                                     <div className="flex items-center gap-1.5 flex-shrink-0 mt-[1px]">
                                       <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                       <span className="text-gray-300 font-mono text-[10px] uppercase tracking-wider">{u.status}</span>
                                     </div>
                                   </div>
                                   <div className="text-gray-500 font-mono text-[10px] truncate">
                                     {u.status === 'active' ? 'Logged in since: Today, 8:42 AM' : 'Last seen at: Yesterday, 4:15 PM'}
                                   </div>
                                 </div>
                                 
                                 {/* Vertical Action Buttons */}
                                 <div className="flex flex-col gap-1 pt-3 border-t" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
                                   
                                   {/* Message Button with Hover Sub-menu */}
                                   <div className="relative group w-full">
                                     <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors text-gray-300 group-hover:text-white">
                                        <MessageSquare size={13} className="flex-shrink-0" />
                                        <span className="text-[11px] font-mono truncate">Message</span>
                                        <ChevronDownIcon size={10} className="ml-auto -rotate-90 opacity-50" />
                                     </button>
                                     
                                     {/* Invisible Hover Bridge Wrapper */}
                                     <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-[110]">
                                       {/* Actual Visible Sub-menu */}
                                       <div className="flex flex-col gap-1 p-2 rounded-xl bg-black/95 backdrop-blur-2xl border shadow-2xl w-32 animate-in fade-in slide-in-from-left-2 duration-200"
                                            style={{ 
                                              borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                                              boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wsColor.rgb}, 0.2)`,
                                              filter: `drop-shadow(0 0 10px rgba(${wsColor.rgb}, 0.15))`
                                            }}>
                                          <button 
                                            title="Internal system message"
                                            className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" 
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              console.log('Chat clicked');
                                              setActiveUserDropdown(null);
                                            }}>
                                            <MessagesSquare size={12} className="flex-shrink-0" />
                                            <span>Chat</span>
                                          </button>
                                          <button 
                                            className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" 
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              setExternalModalUser({ id: u.id, name: u.name });
                                              setActiveUserDropdown(null);
                                            }}>
                                            <PopoutIcon size={12} className="flex-shrink-0" />
                                            <span>External</span>
                                          </button>
                                          <button 
                                            className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" 
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              setCallModalUser({ id: u.id, name: u.name });
                                              setActiveUserDropdown(null);
                                            }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                            <span>Call</span>
                                          </button>
                                          <button 
                                            className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors group/record" 
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              setRecordModalUser({ id: u.id, name: u.name });
                                              setActiveUserDropdown(null);
                                            }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-hover/record:text-red-500 transition-colors"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>
                                            <span>Record</span>
                                          </button>
                                       </div>
                                     </div>
                                   </div>
                                   <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                      <CheckSquare size={13} className="flex-shrink-0" />
                                      <span className="text-[11px] font-mono truncate">Send Task</span>
                                   </button>
                                   <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                      <Mail size={13} className="flex-shrink-0" />
                                      <span className="text-[11px] font-mono truncate">Send Email</span>
                                   </button>
                                   <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                      <Activity size={13} className="flex-shrink-0" />
                                      <span className="text-[11px] font-mono truncate">Activity</span>
                                   </button>
                                   
                                   {/* Workspace Button */}
                                   <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                      <PlusIcon size={13} className="flex-shrink-0" />
                                      <span className="text-[11px] font-mono truncate">Workspace</span>
                                   </button>

                                   {/* NEW Comms Button */}
                                   <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                      <Megaphone size={13} className="flex-shrink-0" />
                                      <span className="text-[11px] font-mono truncate">Comms</span>
                                   </button>
                                   
                                   {(isPlatformOwner() || isOrganizationAdmin()) && (
                                     <button 
                                       onClick={() => console.log('Open User Dashboard Overlay')}
                                       className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white border border-white/5"
                                     >
                                        <LayoutDashboard size={13} className="flex-shrink-0" />
                                        <span className="text-[11px] font-mono truncate font-bold">Dashboard</span>
                                     </button>
                                   )}
                                 </div>
                                 
                               </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-start gap-1 flex-shrink-0 h-10">
                    {isAdmin && (
                      <button 
                        className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-all hover:scale-110 bg-black/50"
                        style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)`, color: wsColor.primary }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = wsColor.primary; e.currentTarget.style.backgroundColor = `rgba(${wsColor.rgb}, 0.1)`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.4)`; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'; }}
                        title="Invite user to organization"
                        onClick={() => console.log('Open invite modal')}
                      >
                        <PlusIcon size={16} />
                      </button>
                    )}
                    
                    {mockActiveUsers.length > maxVisibleUsers && (
                      <button 
                        onClick={() => setShowUsersDropdown(!showUsersDropdown)}
                        className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                        title={showUsersDropdown ? "Collapse users" : `View remaining ${mockActiveUsers.length - maxVisibleUsers} users`}
                      >
                        <ChevronDownIcon size={16} className={`transition-transform duration-300 ${showUsersDropdown ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ⚡ UPDATED: Right Side Quick Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 pl-4 border-l border-gray-800/50">
                <button 
                  className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/5 border border-transparent hover:border-gray-700 text-gray-400 hover:text-white" 
                  title="Tasks" 
                  onClick={() => setActiveLeftPanel('tasks')}
                >
                  <TaskIcon size={18} />
                </button>
                <button 
                  className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/5 border border-transparent hover:border-gray-700 text-gray-400 hover:text-white" 
                  title="Calendar" 
                  onClick={() => setActiveLeftPanel('calendar')}
                >
                  <CalendarIcon size={18} />
                </button>
                <button 
                  className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-white/5 border border-transparent hover:border-gray-700 text-gray-400 hover:text-white" 
                  title="Files" 
                  onClick={() => setActiveLeftPanel('files')}
                >
                  <FileIcon size={18} />
                </button>
              </div>
            </div>

            {/* ⚡ NEW: Second Row (Visible only when expanded) */}
            {showUsersDropdown && mockActiveUsers.length > maxVisibleUsers && (
              <div className="flex flex-wrap pt-3 pb-1 pl-1 animate-in slide-in-from-top-2 duration-300 gap-y-3">
                {mockActiveUsers.slice(maxVisibleUsers).map((u, i) => {
                  const actualIndex = maxVisibleUsers + i;
                  const isNewGroup = i > 0 && mockActiveUsers[actualIndex - 1].status !== u.status;
                  const isOpen = activeUserDropdown === u.id;
                  
                  // ⚡ Bounds check to prevent off-screen hanging
                  const itemsPerFullRow = maxVisibleUsers + 5; 
                  const positionInRow = i % itemsPerFullRow;
                  const isLeftHalf = positionInRow < (itemsPerFullRow / 2);

                  return (
                    <div key={u.id} 
                      onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(isOpen ? null : u.id); }}
                      className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium font-mono cursor-pointer transition-all hover:scale-110 flex-shrink-0 ${
                      u.status === 'active' ? 'border-green-500/30 hover:border-green-400 hover:shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                      u.status === 'idle' ? 'border-yellow-500/30 hover:border-yellow-400 hover:shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 
                      'border-red-500/30 hover:border-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                    }`}
                      style={{
                        background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)',
                        color: u.status === 'active' ? wsColor.primary : '#9ca3af',
                        marginLeft: i === 0 ? '0' : (isNewGroup ? '0.5rem' : '-0.5rem'),
                        zIndex: isOpen ? 100 : mockActiveUsers.length - actualIndex,
                      }}
                      title={isOpen ? '' : `${u.name} (${u.status})`}>
                      {u.name.split(' ').map(n => n[0]).join('')}

                      {/* User Dropdown Panel */}
                          {isOpen && (
                            <div className={`user-profile-panel absolute top-12 ${isLeftHalf ? 'left-0' : 'right-0'} w-[380px] max-w-[90vw] p-5 rounded-xl cursor-default flex gap-5 bg-black/95 backdrop-blur-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 z-[100]`}
                             style={{
                               borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                               boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 25px rgba(${wsColor.rgb}, 0.3)`,
                               filter: `drop-shadow(0 0 10px rgba(${wsColor.rgb}, 0.15))`
                             }}
                             onClick={(e) => e.stopPropagation()}
                        >
                           {/* Left Column: Avatar + Bottom-Aligned Toggles */}
                           <div className="flex flex-col items-center flex-shrink-0 w-[108px]">
                             <div className="w-[86px] h-[86px] rounded-full flex items-center justify-center text-2xl font-bold font-mono"
                                  style={{
                                    background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(0,0,0,0.9))`,
                                    border: `2px solid ${wsColor.primary}`,
                                    color: wsColor.primary,
                                    boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.4)`
                                  }}>
                               {u.name.split(' ').map(n => n[0]).join('')}
                             </div>

                             {/* Status Message Section */}
                             <div className="mt-4 mb-3 w-full flex-1 flex flex-col">
                               <span
                                 className="text-[10px] font-mono uppercase font-bold tracking-wider mb-1 text-left"
                                 style={{ color: wsColor.primary }}
                               >
                                 Status:
                               </span>
                               <div
                                 className="flex-1 p-2 w-full rounded bg-white/5 border flex items-start justify-start"
                                 style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
                               >
                                 <span className="text-[10px] font-mono text-gray-400 italic leading-tight text-left">
                                   "A short custom status message on the user's profile will appear here..."
                                 </span>
                               </div>
                             </div>

                             {/* Toggles Container - Bottom Aligned */}
                             <div className="flex flex-col gap-2.5 w-full pb-1">
                               <div className="flex items-center justify-between w-full">
                                 <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Suspend</span>
                                 <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                         style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}
                                         onClick={(e) => { e.stopPropagation(); console.log('Suspend user'); }}>
                                   <div className="w-2 h-2 rounded-full bg-gray-600 absolute top-[2px] left-[2px]" />
                                 </button>
                               </div>
                               <div className="flex items-center justify-between w-full">
                                 <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Remove</span>
                                 <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                         style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}
                                         onClick={(e) => { e.stopPropagation(); console.log('Remove user'); }}>
                                   <div className="w-2 h-2 rounded-full bg-gray-800 absolute top-[2px] left-[2px]" />
                                 </button>
                               </div>
                             </div>
                           </div>

                           {/* Right Column: User Info, Status Message + Vertical Actions */}
                           <div className="flex flex-col min-w-0 flex-1">

                             {/* Identity Section */}
                             <div className="mb-2">
                               <div className="flex items-center gap-3 mb-1.5">
                                 <h4 className="text-white font-mono text-base font-bold truncate leading-tight">{u.name}</h4>
                                 <div className="flex items-center gap-1.5 flex-shrink-0 mt-[1px]">
                                   <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                   <span className="text-gray-300 font-mono text-[10px] uppercase tracking-wider">{u.status}</span>
                                 </div>
                               </div>
                               <div className="text-gray-500 font-mono text-[10px] truncate">
                                 {u.status === 'active' ? 'Logged in since: Today, 8:42 AM' : 'Last seen at: Yesterday, 4:15 PM'}
                               </div>
                             </div>

                             {/* Vertical Action Buttons */}
                             <div className="flex flex-col gap-1 pt-3 border-t" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>

                               {/* Message Button with Hover Sub-menu */}
                               <div className="relative group w-full">
                                 <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors text-gray-300 group-hover:text-white">
                                    <MessageSquare size={13} className="flex-shrink-0" />
                                    <span className="text-[11px] font-mono truncate">Message</span>
                                    <ChevronDownIcon size={10} className="ml-auto -rotate-90 opacity-50" />
                                 </button>

                                 {/* Invisible Hover Bridge Wrapper */}
                                 <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-[110]">
                                   {/* Actual Visible Sub-menu */}
                                   <div className="flex flex-col gap-1 p-2 rounded-xl bg-black/95 backdrop-blur-2xl border shadow-2xl w-32 animate-in fade-in slide-in-from-left-2 duration-200"
                                        style={{
                                          borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                                          boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wsColor.rgb}, 0.2)`,
                                          filter: `drop-shadow(0 0 10px rgba(${wsColor.rgb}, 0.15))`
                                        }}>
                                     <button
                                       title="Internal system message"
                                       className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         console.log('Chat clicked');
                                         setActiveUserDropdown(null);
                                       }}>
                                       <MessagesSquare size={12} className="flex-shrink-0" />
                                       <span>Chat</span>
                                     </button>
                                     <button
                                       className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setExternalModalUser({ id: u.id, name: u.name });
                                         setActiveUserDropdown(null);
                                       }}>
                                       <PopoutIcon size={12} className="flex-shrink-0" />
                                       <span>External</span>
                                     </button>
                                     <button
                                       className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setCallModalUser({ id: u.id, name: u.name });
                                         setActiveUserDropdown(null);
                                       }}>
                                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                       <span>Call</span>
                                     </button>
                                     <button
                                       className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors group/record"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setRecordModalUser({ id: u.id, name: u.name });
                                         setActiveUserDropdown(null);
                                       }}>
                                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-hover/record:text-red-500 transition-colors"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>
                                       <span>Record</span>
                                     </button>
                                   </div>
                                 </div>
                               </div>
                               <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                  <CheckSquare size={13} className="flex-shrink-0" />
                                  <span className="text-[11px] font-mono truncate">Send Task</span>
                               </button>
                               <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                  <Mail size={13} className="flex-shrink-0" />
                                  <span className="text-[11px] font-mono truncate">Send Email</span>
                               </button>
                               <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                  <Activity size={13} className="flex-shrink-0" />
                                  <span className="text-[11px] font-mono truncate">Activity</span>
                               </button>

                               {/* Workspace Button */}
                               <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                  <PlusIcon size={13} className="flex-shrink-0" />
                                  <span className="text-[11px] font-mono truncate">Workspace</span>
                               </button>

                               {/* NEW Comms Button */}
                               <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                  <Megaphone size={13} className="flex-shrink-0" />
                                  <span className="text-[11px] font-mono truncate">Comms</span>
                               </button>

                               {(isPlatformOwner() || isOrganizationAdmin()) && (
                                 <button
                                   onClick={() => console.log('Open User Dashboard Overlay')}
                                   className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white border border-white/5"
                                 >
                                    <LayoutDashboard size={13} className="flex-shrink-0" />
                                    <span className="text-[11px] font-mono truncate font-bold">Dashboard</span>
                                 </button>
                               )}
                             </div>

                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resizable Tiles Container */}
          <div 
            ref={containerRef} 
            // ⚡ FIX: Added flex flex-col gap-4 for mobile, switches back to md:block for absolute desktop!
            className="relative w-full max-w-full overflow-x-hidden flex flex-col gap-4 md:block" 
            style={{ minHeight: `${getLowestTileBottom() + 100}px` }}
          >

            {/* ⚡ FIX: Mapping over sortedTiles so DOM flow dictates vertical mobile stack order */}
            {sortedTiles.map((tile) => {
              const isBeingDragged = reorderDragTileId === tile.id;
              const preview = !isBeingDragged ? previewLayout?.[tile.id] : null;

              // ⚡ FIX: Removed all the mobileConfig overrides.
              const displayX = preview?.x ?? tile.position.x;
              const displayY = preview?.y ?? tile.position.y;
              const displayWidth = preview?.width ?? tile.size.width;
              const displayHeight = preview?.height ?? tile.size.height;

              return (
                <ResizableTile
                  key={tile.id}
                  id={tile.id}
                  isInitialLoad={isInitialLoad}
                  initialWidth={displayWidth}
                  initialHeight={displayHeight}
                  position={{ x: displayX, y: displayY + TILE_Y_OFFSET }}
                  zIndex={tile.zIndex}
                  onPositionChange={handlePositionChange}
                  onSizeChange={handleSizeChange}
                  onSizeChangeEnd={handleSizeChangeEnd}
                  onZIndexChange={handleZIndexChange}
                  onReorderDragStart={handleReorderDragStart}
                  onReorderDragOver={handleReorderDragOver}
                  onReorderDrop={handleReorderDrop}
                  onReorderDragEnd={handleReorderDragEnd}
                  isDragSource={isBeingDragged}
                  glowColor={glowColor}
                  minWidth={150}
                  minHeight={120}
                  maxWidth={2000}
                  maxHeight={700}
                  allTiles={allTilesData}
                  canDrag={isAdmin}
                  onNewWindow={() => {
                    const url = `${window.location.origin}?workspace=${workspaceSlug}&tile=${tile.id}`;
                    window.open(url, '_blank', 'width=800,height=600,menubar=no,toolbar=no');
                  }}
                  onFullScreen={() => {
                    document.documentElement.requestFullscreen?.().catch(() => {});
                  }}
                  onClose={() => {
                    setTiles(prev => prev.filter(t => t.id !== tile.id));
                  }}
                  canDelete={isAdmin}
                >
                  {renderTileContent(tile)}
                </ResizableTile>
              );
            })}
          </div>
        </div>
      )}

      {/* ⚡ CONTEXTUAL TASKS / CALENDAR PANEL */}
      <LeftSlidePanel 
        activePanel={activeLeftPanel as any}
        onClose={() => setActiveLeftPanel(null)}
        onNavigateToFullView={(view) => console.log('Navigate to full view:', view)}
        contextWorkspaceId={resolvedWorkspaceId || WORKSPACE_ID_MAP[workspaceSlug]}
      />

    </div>
  );
};

export default WorkspaceDashboard;