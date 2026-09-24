import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';

import { 
  BellIcon,
  TaskIcon, 
  SettingsIcon, 
  LogoutIcon,
  UserIcon,
  AdminPanelIcon,
  ShieldIcon,
  CalculatorIcon,
  UsersIcon,
  HomeIcon,
  DatabaseIcon,
  BuildIcon,
  SearchIcon,
  CloseIcon,
} from '@/components/icons/Icons';
import { OrganizationUser, PlatformUser, WORKSPACE_DEFINITIONS, WorkspaceSlug } from '@/types';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/695fc81af8bb22c52e2539fb_1769628610343_93d83d41.png';

// ⚡ UPDATED: Search is now Green
const HEADER_COLORS: Record<string, { color: string; rgb: string }> = {
  search: { color: '#4ade80', rgb: '74,222,128' }, // Green
  security: { color: '#fb923c', rgb: '251,146,60' }, // Orange
  admin: { color: '#e879f9', rgb: '232,121,249' }, // Fuchsia
  notifications: { color: '#facc15', rgb: '250,204,21' }, // Yellow
  profile: { color: '#22d3ee', rgb: '34,211,238' }, // Cyan
  settings: { color: '#9ca3af', rgb: '156,163,175' }, // Gray
  logout: { color: '#fb7185', rgb: '251,113,133' }, // Rose
};

// Selectable Color Palette for Customization
const COLOR_PALETTE: Record<string, { color: string; rgb: string }> = {
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

// Security alert icon
const AlertTriangleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// Category-specific notification icons
const KeyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const SyncIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const AtSignIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
);

const InfoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CheckCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

interface SecurityNotification {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  message: string;
  file_name?: string;
  threat_level?: string;
  read_at: string | null;
  created_at: string;
}

interface AppNotification {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  type: string;
  category: string;
  title: string;
  message: string;
  metadata: any;
  is_read: boolean;
  is_dismissed: boolean;
  action_url: string | null;
  created_at: string;
  expires_at: string | null;
}

interface SearchResult {
  id: string;
  type: 'workspace' | 'miniapp' | 'message' | 'task' | 'setting' | 'file';
  title: string;
  subtitle: string;
  icon: string;
  action?: () => void;
}

interface TopHeaderProps {
  onOpenSearch?: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenLogin?: () => void;
  onGoHome?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenOrgAdminPanel?: () => void;
  onOpenWorkspaceSettings?: (slug: string) => void;
  onOpenOrgSettings?: () => void;
  currentWorkspace?: string;
  notificationCount?: number;
}


const wsIconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  admin: ShieldIcon,
  accounting: CalculatorIcon,
  personnel: UsersIcon,
  main: HomeIcon,
  data: DatabaseIcon,
  security: BuildIcon,
};

const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenSearch, onOpenNotifications, onOpenSettings, onOpenProfile,
  onOpenLogin, onGoHome, onOpenAdminPanel, onOpenOrgAdminPanel, onOpenWorkspaceSettings,
  onOpenOrgSettings, currentWorkspace
}) => {

  const { user, organization, logout, isPlatformUser, isPlatformOwner, isOrganizationAdmin, isAuthenticated } = useAuth();
  const { getColor } = useWorkspaceColor();
  
  const [customWorkspaceData, setCustomWorkspaceData] = useState<{name: string, icon: string} | null>(null);

  // Context Menu & User Color States
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean, x: number, y: number, buttonId: string } | null>(null);
  const [userHeaderColors, setUserHeaderColors] = useState<Record<string, string>>({});

  useEffect(() => {
    // ⚡ FIX: Removed the WORKSPACE_DEFINITIONS bypass so it ALWAYS checks the DB
    if (!currentWorkspace) {
      setCustomWorkspaceData(null);
      return;
    }
    
    // ⚡ FIX: Wait for the organization to be loaded before querying
    if (!organization?.id) return;
    
    const fetchCustomWorkspace = async () => {
      try {
        const { data, error } = await supabase
          .schema('app_private')
          .from('workspaces')
          .select('name, icon')
          .eq('slug', currentWorkspace)
          .eq('organization_id', organization.id) // ⚡ FIX: Filter by current org
          .maybeSingle(); // ⚡ FIX: Use maybeSingle to avoid crash
          
        if (error) throw error;
          
        if (data) {
          setCustomWorkspaceData(data);
        }
      } catch (err) {
        console.error("Error fetching custom workspace data for header:", err);
      }
    };
    
    fetchCustomWorkspace();
  }, [currentWorkspace, organization?.id]); // ⚡ Added organization dependency

  // FETCH: TopHeader Colors
  useEffect(() => {
    const fetchUserPreferences = async () => {
      const userId = user?.id || (user as any)?.uid;
      if (!userId || !organization?.id) return;
      try {
        const { data, error } = await supabase.schema('app_private')
          .from('user_preferences')
          .select('header_colors')
          .eq('user_id', userId)
          .eq('organization_id', organization.id) // ⚡ Scope to current org
          .maybeSingle();

        if (error) console.error('[TopHeader] Error fetching colors:', error);
        if (data?.header_colors) setUserHeaderColors(data.header_colors);
      } catch (err) {
        console.error('[TopHeader] Caught error fetching colors:', err);
      }
    };
    fetchUserPreferences();
  }, [user]);

  // SAVE: TopHeader Colors
  const handleColorSelect = async (colorKey: string) => {
    const userId = user?.id || (user as any)?.uid;
    if (!contextMenu || !userId) return;

    const updatedColors = { ...userHeaderColors };
    if (colorKey === 'default') {
      delete updatedColors[contextMenu.buttonId];
    } else {
      updatedColors[contextMenu.buttonId] = colorKey;
    }

    setUserHeaderColors(updatedColors);
    setContextMenu(null);

    // ⚡ BROADCAST: Tell other components the header colors changed
    window.dispatchEvent(new CustomEvent('headerColorsUpdated', { detail: updatedColors }));

    try {
      const { error } = await supabase.schema('app_private')
        .from('user_preferences')
        .upsert({
          user_id: userId,
          organization_id: organization.id, // ⚡ Scope to current org
          header_colors: updatedColors,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, organization_id' }); // ⚡ Use new composite key
        
      if (error) console.error('[TopHeader] Error saving colors to DB:', error);
    } catch (err) {
      console.error('[TopHeader] Caught error saving colors:', err);
    }
  };

  // Workspace Switcher state
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const wsDropdownRef = useRef<HTMLDivElement>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);

  // Fetch dynamic workspaces for the dropdown
  useEffect(() => {
    const fetchWorkspaces = async () => {
      // 1. Generate base workspaces
      const baseWs = Object.entries(WORKSPACE_DEFINITIONS).map(([slug, def], index) => ({
        name: def.name,
        slug,
        iconSlug: slug,
        display_order: index
      }));

      if (!organization?.id) {
        setAvailableWorkspaces(baseWs);
        return;
      }

      try {
        // 2. Query the app_private schema and select ALL fields so we don't miss organization_id
        const { data, error } = await supabase.schema('app_private')
          .from('workspaces')
          .select('*')
          .or(`organization_id.eq.${organization.id},organization_id.eq.aaaa0000-0000-0000-0000-000000000001`);

        if (error) throw error;

        let mergedWs = [...baseWs];

        if (data && data.length > 0) {
          const dbMap = new Map(data.map((w: any) => [w.slug, w]));
          
          mergedWs = baseWs.map(bw => {
            const dbWorkspace = dbMap.get(bw.slug);
            return { ...bw, ...dbWorkspace, iconSlug: dbWorkspace?.icon || bw.slug };
          });

          // Filter for custom workspaces belonging ONLY to this organization
          const customWs = data
            .filter((w: any) => w.organization_id === organization.id)
            .map((ws: any) => ({ ...ws, iconSlug: ws.icon || 'main' }));
            
          const globalSlugs = new Set(mergedWs.map(w => w.slug));
          const uniqueCustomWs = customWs.filter((w: any) => !globalSlugs.has(w.slug));
          
          mergedWs = [...mergedWs, ...uniqueCustomWs];
        }

        // 3. Sort by cached drag-and-drop order, then display_order
        const savedOrderStr = localStorage.getItem(`workspace-order-${organization.id}`);
        if (savedOrderStr) {
          try {
            const savedSlugs = JSON.parse(savedOrderStr) as string[];
            mergedWs.sort((a, b) => {
              let idxA = savedSlugs.indexOf(a.slug);
              let idxB = savedSlugs.indexOf(b.slug);
              if (idxA === -1) idxA = 999 + (a.display_order || 0);
              if (idxB === -1) idxB = 999 + (b.display_order || 0);
              return idxA - idxB;
            });
          } catch(e) {
            mergedWs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
          }
        } else {
          mergedWs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        }

        setAvailableWorkspaces(mergedWs);
      } catch (err) {
        console.error('Error fetching workspaces for dropdown:', err);
        setAvailableWorkspaces(baseWs);
      }
    };

    // Ensure it triggers when the menu is opened to stay synced with side panel
    if (showWorkspaceDropdown || availableWorkspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [organization?.id, showWorkspaceDropdown]);

  // Security notifications state
  const [securityNotifications, setSecurityNotifications] = useState<SecurityNotification[]>([]);
  const [unreadSecurityCount, setUnreadSecurityCount] = useState(0);
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const securityDropdownRef = useRef<HTMLDivElement>(null);
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';

  // App notifications state
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadAppCount, setUnreadAppCount] = useState(0);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false); // ⚡ NEW: Modal State
  const bellDropdownRef = useRef<HTMLDivElement>(null);

  // Inline search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Account Dropdown State
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Task Alert State
  const [tasksDueToday, setTasksDueToday] = useState<any[]>([]);
  const [globalAlertsEnabled, setGlobalAlertsEnabled] = useState(false);
  const [dismissedTaskAlert, setDismissedTaskAlert] = useState(false);
  const [hasViewedTasks, setHasViewedTasks] = useState(false); // ⚡ NEW: Tracks if tasks have been read in the dropdown

  // ⚡ NEW: Snooze state persisted in localStorage with auto-wake timeout
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('taskAlertSnooze');
    if (saved && parseInt(saved) > Date.now()) return parseInt(saved);
    return null;
  });
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [customSnoozeValue, setCustomSnoozeValue] = useState('5');
  
  const SNOOZE_OPTIONS = [
    { val: '5', label: '5 mins' },
    { val: '15', label: '15 mins' },
    { val: '30', label: '30 mins' },
    { val: '60', label: '1 Hour' },
    { val: '120', label: '2 Hours' },
    { val: '240', label: '4 Hours' },
    { val: '480', label: '8 Hours' },
    { val: '720', label: '12 Hours' },
    { val: '1440', label: 'Tomorrow' }
  ];

  useEffect(() => {
    if (snoozeUntil && snoozeUntil > Date.now()) {
      const timeout = setTimeout(() => {
        setSnoozeUntil(null);
        localStorage.removeItem('taskAlertSnooze');
      }, snoozeUntil - Date.now());
      return () => clearTimeout(timeout);
    }
  }, [snoozeUntil]);

  const handleSnooze = (hours: number) => {
    const time = Date.now() + hours * 60 * 60 * 1000;
    setSnoozeUntil(time);
    localStorage.setItem('taskAlertSnooze', time.toString());
    setShowSnoozeMenu(false);
  };

  // ⚡ NEW: Individual Task Snooze & Expansion States
  const [snoozedTasks, setSnoozedTasks] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('individualTaskSnooze');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);
  const [activeIndividualSnoozeMenu, setActiveIndividualSnoozeMenu] = useState<string | null>(null);
  const [individualSnoozeValue, setIndividualSnoozeValue] = useState('5');

  const handleTaskSnooze = (taskId: string, hours: number) => {
    const time = Date.now() + hours * 60 * 60 * 1000;
    const updated = { ...snoozedTasks, [taskId]: time };
    setSnoozedTasks(updated);
    localStorage.setItem('individualTaskSnooze', JSON.stringify(updated));
    setActiveIndividualSnoozeMenu(null);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      // Optimistically update the UI so it vanishes instantly
      setTasksDueToday(prev => prev.filter(t => t.id !== taskId));
      await supabase.schema('app_private')
        .from('tasks')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);
      window.dispatchEvent(new CustomEvent('refreshTasks'));
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  // Dynamically filter out individually snoozed tasks
  const activeTasksDueToday = tasksDueToday.filter(t => !snoozedTasks[t.id] || snoozedTasks[t.id] < Date.now());

  // Auto-collapse if no tasks are left
  useEffect(() => {
    if (activeTasksDueToday.length === 0) setIsBannerExpanded(false);
  }, [activeTasksDueToday.length]);

  const loadTodayTasks = useCallback(async () => {
    if (!isAuthenticated || userId === 'anonymous') return;
    try {
      // 1. Check user preferences
      const { data: settings } = await supabase.schema('app_private')
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', userId)
        .maybeSingle();

      const isEnabled = settings?.notification_settings?.global_alerts ?? true;
      setGlobalAlertsEnabled(isEnabled);

      if (isEnabled) {
        // 2. Build today's boundaries
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // 3. Fetch pending tasks due today
        const { data } = await supabase.schema('app_private')
          .from('tasks')
          .select('id, title, due_date, status, assigned_to, created_by')
          .neq('status', 'completed')
          .gte('due_date', todayStart.toISOString())
          .lte('due_date', todayEnd.toISOString())
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
        
        // Filter strictly for "Mine" logic (assigned to user OR created by user with no assignee)
        const mine = (data || []).filter((t: any) => 
          t.assigned_to === userId || (t.created_by === userId && !t.assigned_to)
        );
        setTasksDueToday(prev => {
          // ⚡ Reset unread task bubble if a new task is added
          if (mine.length > prev.length) setHasViewedTasks(false);
          return mine;
        });
      } else {
        setTasksDueToday([]);
      }
    } catch (err) {
      console.error('Error fetching today tasks for header:', err);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    loadTodayTasks();
    // ⚡ Listen for changes from TasksView (new tasks, completed tasks, changed settings)
    window.addEventListener('refreshTasks', loadTodayTasks);
    return () => window.removeEventListener('refreshTasks', loadTodayTasks);
  }, [loadTodayTasks]);

  const loadSecurityNotifications = useCallback(async () => {
    if (!isAuthenticated || userId === 'anonymous') return;
    try {
      const { data, error } = await db
        .from('security_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setSecurityNotifications(data as SecurityNotification[]);
        setUnreadSecurityCount(data.filter((n: any) => !n.read_at).length);
      }
    } catch (err) {}
  }, [isAuthenticated, userId]);

  const loadAppNotifications = useCallback(async () => {
    if (!isAuthenticated || userId === 'anonymous' || !organization?.id) return;
    try {
      const { data, error } = await supabase.schema('app_private')
        .from('notifications')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        const notifs = data as AppNotification[];
        setAppNotifications(notifs);
        setUnreadAppCount(notifs.filter(n => !n.is_read).length);
      }
    } catch (err) {}
  }, [isAuthenticated, userId]);


  useEffect(() => {
    if (!isAuthenticated) return;
    loadSecurityNotifications();

    const channel = supabase
      .channel('security-notifications-header')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_notifications',
      }, (payload) => {
        const newNotif = payload.new as SecurityNotification;
        setSecurityNotifications(prev => [newNotif, ...prev].slice(0, 20));
        setUnreadSecurityCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, loadSecurityNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadAppNotifications();

    const channel = supabase
      .channel('app-notifications-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'app_private', // ⚡ FIX: Changed from 'public'
        table: 'notifications',
      }, (payload) => {
        const newNotif = payload.new as AppNotification;
        setAppNotifications(prev => [newNotif, ...prev].slice(0, 30));
        setUnreadAppCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'app_private', // ⚡ FIX: Changed from 'public'
        table: 'notifications',
      }, (payload) => {
        const updated = payload.new as AppNotification;
        setAppNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        setAppNotifications(prev => {
          const newList = prev.map(n => n.id === updated.id ? updated : n);
          setUnreadAppCount(newList.filter(n => !n.is_read).length);
          return newList;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, loadAppNotifications]);

  // ⚡ NEW: Global Event Listener to open the notification bell from anywhere
  useEffect(() => {
    const handleOpenGlobalNotifs = () => {
      setShowBellDropdown(true);
      setShowSecurityDropdown(false);
      if (unreadAppCount > 0) {
        markAllAppNotificationsRead();
      }
      setHasViewedTasks(true);
    };
    
    window.addEventListener('openGlobalNotifications', handleOpenGlobalNotifs);
    return () => window.removeEventListener('openGlobalNotifications', handleOpenGlobalNotifs);
  }, [unreadAppCount]);

  useEffect(() => {
    if (!showSecurityDropdown && !showBellDropdown) return;
    const handler = (e: MouseEvent) => {
      if (showSecurityDropdown && securityDropdownRef.current && !securityDropdownRef.current.contains(e.target as Node)) {
        setShowSecurityDropdown(false);
      }
      if (showBellDropdown && bellDropdownRef.current && !bellDropdownRef.current.contains(e.target as Node)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSecurityDropdown, showBellDropdown]);

  useEffect(() => {
    if (!showSearchDropdown) return;
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearchDropdown]);

  useEffect(() => {
    if (!showAccountDropdown) return;
    const handler = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAccountDropdown]);

  useEffect(() => {
    if (!showWorkspaceDropdown) return;
    const handler = (e: MouseEvent) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showWorkspaceDropdown]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((e.target as HTMLElement)?.contentEditable === 'true') return;
      
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setShowSearchDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    Object.entries(WORKSPACE_DEFINITIONS).forEach(([slug, ws]) => {
      if (ws.name.toLowerCase().includes(q) || slug.includes(q)) {
        results.push({
          id: `ws-${slug}`, type: 'workspace', title: ws.name,
          subtitle: `Workspace - ${ws.miniApps?.length || 0} MiniApps`, icon: 'workspace',
        });
      }
      ws.miniApps?.forEach(app => {
        if (app.toLowerCase().includes(q)) {
          results.push({
            id: `app-${slug}-${app}`, type: 'miniapp', title: app,
            subtitle: `MiniApp in ${ws.name}`, icon: 'miniapp',
          });
        }
      });
    });

    ['Profile Settings', 'Organization Settings', 'Security Settings', 'Notification Preferences', 'Theme Settings', 'Account Settings'].forEach(setting => {
      if (setting.toLowerCase().includes(q)) {
        results.push({
          id: `setting-${setting}`, type: 'setting', title: setting,
          subtitle: 'Settings', icon: 'settings',
        });
      }
    });

    ['Create Task', 'New Event', 'Send Message', 'Upload File', 'View Calendar', 'View Reports', 'Security Dashboard', 'Admin Panel'].forEach(action => {
      if (action.toLowerCase().includes(q)) {
        results.push({
          id: `action-${action}`, type: 'task', title: action,
          subtitle: 'Quick Action', icon: 'action',
        });
      }
    });

    ['Project Alpha Update', 'Budget Review Notes', 'Team Standup Summary', 'Client Feedback', 'Sprint Planning'].forEach((msg, i) => {
      if (msg.toLowerCase().includes(q)) {
        results.push({
          id: `msg-${i}`, type: 'message', title: msg,
          subtitle: 'Message', icon: 'message',
        });
      }
    });

    setSearchResults(results.slice(0, 8));
    setShowSearchDropdown(results.length > 0);
  }, [searchQuery]);

  const markAllSecurityRead = async () => {
    try {
      const unreadIds = securityNotifications.filter(n => !n.read_at).map(n => n.id);
      if (unreadIds.length > 0) {
        await db
          .from('security_notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
      setSecurityNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadSecurityCount(0);
    } catch (err) {}
  };

  const markNotificationRead = async (notifId: string) => {
    try {
      await supabase.schema('app_private')
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);
      
      setAppNotifications(prev => {
        const updated = prev.map(n => n.id === notifId ? { ...n, is_read: true } : n);
        setUnreadAppCount(updated.filter(n => !n.is_read).length);
        return updated;
      });
    } catch (err) {}
  };

  const markAllAppNotificationsRead = async () => {
    try {
      const unreadIds = appNotifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        for (const id of unreadIds) {
          await supabase.schema('app_private')
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        }
      }
      setAppNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadAppCount(0);
    } catch (err) {}
  };

  const dismissNotification = async (notifId: string) => {
    try {
      await supabase.schema('app_private')
        .from('notifications')
        .update({ is_dismissed: true })
        .eq('id', notifId);
      
      setAppNotifications(prev => {
        const updated = prev.filter(n => n.id !== notifId);
        setUnreadAppCount(updated.filter(n => !n.is_read).length);
        return updated;
      });
    } catch (err) {}
  };

  // ⚡ NEW: Handle clicking a notification to route to the record
  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) markNotificationRead(notif.id);

    const meta = notif.metadata;
    if (meta?.workspace_id && meta?.mini_app_id && meta?.record_id) {
      try {
        // Fetch the workspace slug
        const { data: wsData } = await supabase.schema('app_private')
          .from('workspaces')
          .select('slug')
          .eq('id', meta.workspace_id)
          .maybeSingle();

        // Fetch the miniapp name
        const { data: appData } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('name')
          .eq('id', meta.mini_app_id)
          .maybeSingle();

        if (wsData?.slug && appData?.name) {
          setShowBellDropdown(false);
          setShowAllNotificationsModal(false);
          // ⚡ Route to the exact app and record
          window.location.href = `/workspace/${wsData.slug}?app=${encodeURIComponent(appData.name)}&record=${meta.record_id}`;
        }
      } catch (err) {
        console.error("Error routing to notification record:", err);
      }
    }
  };

  const getUserName = () => {
    if (!user) return 'User';
    return (user as OrganizationUser | PlatformUser).full_name || 'User';
  };

  const getUserRole = () => {
    if (isPlatformOwner()) return 'Platform Owner';
    if (isPlatformUser()) {
      const platformUser = user as PlatformUser;
      return platformUser.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    const orgUser = user as OrganizationUser;
    return orgUser?.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': case 'high': return { dot: 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.8)]', text: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' };
      case 'medium': return { dot: 'bg-yellow-400 shadow-[0_0_6px_rgba(255,255,0,0.8)]', text: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20' };
      default: return { dot: 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]', text: 'text-green-400', bg: 'bg-green-500/5 border-green-500/20' };
    }
  };

  const getCategoryDisplay = (category: string, type: string) => {
    switch (category) {
      case 'credential_expiry':
        return { icon: <KeyIcon size={14} />, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', label: 'Credential Expiry' };
      case 'credential_failure':
        return { icon: <KeyIcon size={14} />, color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', label: 'Credential Failure' };
      case 'sync_failure':
        return { icon: <SyncIcon size={14} />, color: '#f97316', bgColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.3)', label: 'Sync Failure' };
      case 'security_event':
        return { icon: <AlertTriangleIcon size={14} />, color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', label: 'Security Event' };
      case 'team_mention':
        return { icon: <AtSignIcon size={14} />, color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)', label: 'Mention' };
      case 'system':
        return { icon: <InfoIcon size={14} />, color: '#06b6d4', bgColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)', label: 'System' };
      case 'success':
        return { icon: <CheckCircleIcon size={14} />, color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', label: 'Success' };
      default:
        return { icon: <BellIcon size={14} />, color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.3)', label: type || 'Notification' };
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'workspace': return <DatabaseIcon size={14} />;
      case 'miniapp': return <BuildIcon size={14} />;
      case 'message': return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
      case 'setting': return <SettingsIcon size={14} />;
      case 'file': return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
      default: return <SearchIcon size={14} />;
    }
  };

  const handleSearchToggle = () => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
      setSearchQuery('');
      setShowSearchDropdown(false);
    } else {
      setIsSearchOpen(true);
    }
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <header className="fixed top-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-lg border-b border-cyan-500/20 z-40">
        <div className="flex items-center justify-between h-full px-4 max-w-full mx-auto">
          <div className="flex items-center gap-2">
            <img 
              src={organization?.logo_url || LOGO_URL} 
              alt={organization?.name || "Gruppo"} 
              className={`h-9 w-auto drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] ${organization?.logo_url ? 'rounded-md object-contain max-w-[140px]' : ''}`} 
            />
            <div className="hidden sm:block">
              <span className="text-base font-bold text-white drop-shadow-[0_0_8px_rgba(0,255,255,0.3)] font-['Gruppo'] [-webkit-text-stroke:0px_white]">
                {organization?.name || 'Gruppo'}
              </span>
            </div>
          </div>
          {onOpenLogin && (
            <button onClick={onOpenLogin}
              className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-medium font-mono rounded-lg hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all shadow-[0_0_15px_rgba(0,255,255,0.15)]">
              Sign In
            </button>
          )}
        </div>
      </header>
    );
  }

  const wsSlug = currentWorkspace as WorkspaceSlug | undefined;
  
  // ⚡ FIX: Rebuilt wsConfig to prioritize customWorkspaceData.name over the preset definition
  const wsConfig = wsSlug 
    ? {
        ...(WORKSPACE_DEFINITIONS[wsSlug] || { slug: wsSlug, miniApps: [] }),
        name: customWorkspaceData?.name || WORKSPACE_DEFINITIONS[wsSlug]?.name || wsSlug.charAt(0).toUpperCase() + wsSlug.slice(1).replace(/-/g, ' ')
      }
    : null;
    
  const wsColor = wsSlug ? getColor(wsSlug) : null;
  const isMain = !wsSlug;
  
  const rawIconString = customWorkspaceData?.icon || wsSlug;
  const WsIcon = wsSlug ? (wsIconMap[rawIconString || ''] || getMiniAppIcon(rawIconString || '')) : null;

  // Helper to dynamically resolve the button colors depending on the context
  const getResolvedColor = (id: string) => {
    if (!isMain && wsColor) return { c: wsColor.primary, r: wsColor.rgb };
    const customKey = userHeaderColors[id];
    if (customKey && COLOR_PALETTE[customKey]) {
      return { c: COLOR_PALETTE[customKey].color, r: COLOR_PALETTE[customKey].rgb };
    }
    return { c: HEADER_COLORS[id]?.color || '#00ffff', r: HEADER_COLORS[id]?.rgb || '0,255,255' };
  };

  // Refactored getBtnProps to build dynamic CSS strings instead of hardcoded tailwind classes
  const getBtnProps = (id: string, isActive: boolean) => {
    const defaultClass = `w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0 bg-gradient-to-br relative`;
    const theme = getResolvedColor(id);

    return {
      className: defaultClass,
      style: {
        borderColor: isActive ? `rgba(${theme.r}, 0.4)` : `rgba(${theme.r}, 0.2)`,
        background: isActive ? `linear-gradient(135deg, rgba(${theme.r}, 0.2), rgba(0,0,0,0.6))` : `linear-gradient(135deg, rgba(${theme.r}, 0.1), rgba(0,0,0,0.4))`,
        color: isActive ? theme.c : `rgba(${theme.r}, 0.8)`
      },
      onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = `rgba(${theme.r}, 0.4)`;
          e.currentTarget.style.background = `linear-gradient(135deg, rgba(${theme.r}, 0.2), rgba(0,0,0,0.6))`;
          e.currentTarget.style.color = theme.c;
        }
      },
      onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = `rgba(${theme.r}, 0.2)`;
          e.currentTarget.style.background = `linear-gradient(135deg, rgba(${theme.r}, 0.1), rgba(0,0,0,0.4))`;
          e.currentTarget.style.color = `rgba(${theme.r}, 0.8)`;
        }
      },
      onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, buttonId: id });
      }
    };
  };

  // Pre-resolve colors for the dropdown UI panels so they match the parent button
  const searchTheme = getResolvedColor('search');
  const securityTheme = getResolvedColor('security');
  const notifTheme = getResolvedColor('notifications');

  return (
    <>
      {/* ⚡ FIX: Added -mb-16 to the wrapper to absorb the layout's hardcoded padding, eliminating the massive black gap */}
      <div className="sticky top-0 left-0 right-0 z-40 flex flex-col w-full -mb-16">
        {/* ⚡ FIX: Elevated the header's z-index so its child dropdowns naturally paint over the banner */}
        <header className="h-16 bg-black/95 backdrop-blur-lg w-full relative z-[60]"
          style={{ borderBottom: wsColor ? `1px solid rgba(${wsColor.rgb}, 0.3)` : '1px solid rgba(0,255,255,0.2)' }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent h-4" />
        </div>
        
        <div className="flex items-center justify-between h-full px-4 max-w-full mx-auto relative z-10">
          {/* Absolute Center Dock Target (Hidden by default, reacts to Q-Ball dragging) */}
          <div 
            id="qball-dock-target"
            className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full border-2 border-dashed transition-all duration-300 pointer-events-none opacity-0 z-0"
            style={{ 
              borderColor: wsColor ? `rgba(${wsColor.rgb}, 0.6)` : 'rgba(0,255,255,0.6)', 
              backgroundColor: wsColor ? `rgba(${wsColor.rgb}, 0.1)` : 'rgba(0,255,255,0.1)',
              transform: 'translate(-50%, -50%) scale(0.6)'
            }}
          />
          
          {/* Left: Home button + Workspace name + Settings gear */}
          <div className="flex items-center gap-4 flex-shrink-0 relative z-10">
            {wsConfig && wsColor && WsIcon ? (
              <div className="relative" ref={wsDropdownRef}>
                <button 
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)} 
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform hover:scale-105" style={{
                      border: `1.5px solid rgba(${wsColor.rgb}, 0.5)`,
                      background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.15), rgba(0,0,0,0.9))`,
                      boxShadow: `0 0 10px rgba(${wsColor.rgb}, 0.25)`,
                    }}>
                      <span style={{ color: wsColor.primary, filter: `drop-shadow(0 0 4px ${wsColor.primary})` }}>
                        <WsIcon size={20} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold font-mono hidden md:block tracking-wider uppercase" style={{ color: wsColor.primary, textShadow: `0 0 8px rgba(${wsColor.rgb}, 0.5)` }}>{wsConfig.name}</p>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={wsColor.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`hidden md:block transition-transform duration-200 ${showWorkspaceDropdown ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Workspace Switcher Dropdown */}
                {showWorkspaceDropdown && (
                  <div
                    className="absolute top-[120%] left-0 w-56 p-2 rounded-xl border bg-black/95 backdrop-blur-xl z-[200] animate-in fade-in zoom-in-95 shadow-2xl cursor-default"
                    style={{
                      borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                      boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wsColor.rgb}, 0.2)`
                    }}
                  >
                    <div className="px-2 pb-2 mb-2 border-b border-white/10 flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-wider font-mono text-gray-500">Switch Workspace</span>
                      {/* Bypass AppLayout's interception and force a hard navigation to the root dashboard */}
                      <button onClick={() => { setShowWorkspaceDropdown(false); window.location.href = '/'; }} className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors uppercase font-mono tracking-wider">
                        Go Home
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto darkwave-scrollbar">
                      {availableWorkspaces.map((ws) => {
                        const slug = ws.slug;
                        
                        // ⚡ FIX: Use iconSlug from the DB instead of hardcoded slug!
                        // This ensures custom icons (like 'atom' for Main) correctly override defaults.
                        const DropdownIcon = wsIconMap[ws.iconSlug] || getMiniAppIcon(ws.iconSlug);
                        
                        const isCurrent = slug === currentWorkspace;
                        
                        const dropColor = isCurrent && wsColor ? wsColor.primary : '#9ca3af';
                        const dropRgb = isCurrent && wsColor ? wsColor.rgb : '156,163,175';

                        return (
                          <button
                            key={slug}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'}`}
                            style={{ 
                              ...(isCurrent ? { border: `1px solid rgba(${dropRgb}, 0.3)`, boxShadow: `inset 0 0 10px rgba(${dropRgb}, 0.1)` } : { border: '1px solid transparent' })
                            }}
                            onClick={() => {
                              setShowWorkspaceDropdown(false);
                              if (!isCurrent) {
                                window.location.href = `/workspace/${slug}`;
                              }
                            }}
                          >
                            <span style={{ color: dropColor }}><DropdownIcon size={16} /></span>
                            <span className={isCurrent ? "font-bold text-white truncate" : "truncate"}>{ws.name}</span>
                            {isCurrent && (
                              <div className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dropColor, boxShadow: `0 0 6px ${dropColor}` }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={onGoHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                <img 
                  src={organization?.logo_url || LOGO_URL} 
                  alt={organization?.name || "Gruppo"} 
                  className={`h-9 w-auto drop-shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all duration-300 ${
                    organization?.logo_url ? 'rounded-md object-contain max-w-[140px]' : ''
                  }`} 
                />
                <div className="hidden md:flex flex-col justify-center">
                  <p className="text-base font-bold text-white drop-shadow-[0_0_8px_rgba(0,255,255,0.3)] font-['Gruppo'] [-webkit-text-stroke:0px_white]">
                    {organization?.name || 'Gruppo'}
                  </p>
                </div>
                {isPlatformUser() && !organization && (
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-white font-mono">Dashboard</p>
                  </div>
                )}
              </button>
            )}

            {wsConfig && wsColor && wsSlug && onOpenWorkspaceSettings && (isPlatformOwner() || isOrganizationAdmin()) && (
              <button 
                onClick={() => onOpenWorkspaceSettings(wsSlug)}
                className="p-1.5 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                style={{ color: wsColor.primary }}
                title="Workspace Settings"
              >
                <SettingsIcon 
                  size={22} 
                  className="!opacity-100" 
                  style={{ 
                    stroke: wsColor.primary,
                    filter: `drop-shadow(0 0 5px rgba(${wsColor.rgb}, 0.4))` 
                  }} 
                />
              </button>
            )}

            {/* MOVED: Security Notification Bell */}
            <div className="relative" ref={securityDropdownRef}>
              <button
                onClick={() => { setShowSecurityDropdown(!showSecurityDropdown); setShowBellDropdown(false); if (!showSecurityDropdown) markAllSecurityRead(); }}
                onContextMenu={(e) => { 
                  e.preventDefault(); 
                  setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, buttonId: 'security' }); 
                }}
                className="w-10 h-10 flex items-center justify-center transition-all duration-300 hover:scale-110 flex-shrink-0 relative group bg-transparent border-none"
                style={{ color: showSecurityDropdown ? securityTheme.c : `rgba(${securityTheme.r}, 0.9)` }}
                onMouseEnter={(e) => { e.currentTarget.style.color = securityTheme.c; }}
                onMouseLeave={(e) => { if (!showSecurityDropdown) e.currentTarget.style.color = `rgba(${securityTheme.r}, 0.9)`; }}
                title="Security Alerts"
              >
                <div 
                  className={unreadSecurityCount > 0 ? "animate-pulse" : "transition-all duration-300 group-hover:animate-pulse"}
                  style={{ filter: `drop-shadow(0 0 10px ${securityTheme.c})` }}
                >
                  <AlertTriangleIcon size={24} />
                </div>
                
                {unreadSecurityCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 text-white text-[8px] font-bold font-mono rounded-full flex items-center justify-center bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.6)] z-10">
                    {unreadSecurityCount > 9 ? '9+' : unreadSecurityCount}
                  </span>
                )}
              </button>

              {/* Security Dropdown */}
              {showSecurityDropdown && (
                <div className="absolute left-0 top-full mt-2 w-[380px] max-h-[500px] rounded-xl overflow-hidden z-50"
                  style={{
                    backgroundColor: 'rgba(10, 10, 14, 0.98)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: `1px solid rgba(${securityTheme.r}, 0.3)`,
                    boxShadow: `0 0 40px rgba(${securityTheme.r}, 0.15), 0 20px 60px rgba(0,0,0,0.8)`,
                  }}>
                  <div className="flex items-center justify-between p-3"
                    style={{
                      borderBottom: `1px solid rgba(${securityTheme.r}, 0.2)`,
                      background: `linear-gradient(135deg, rgba(${securityTheme.r}, 0.06), transparent)`,
                    }}>
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon size={16} style={{ color: securityTheme.c }} />
                      <span className="text-sm font-mono font-bold" style={{ color: securityTheme.c }}>Security Alerts</span>
                    </div>
                    {securityNotifications.length > 0 && (
                      <button onClick={markAllSecurityRead}
                        className="text-[10px] font-mono text-gray-500 transition-colors"
                        onMouseEnter={e => { e.currentTarget.style.color = securityTheme.c; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; }}
                      >Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto darkwave-scrollbar">
                    {securityNotifications.length > 0 ? securityNotifications.map((notif) => {
                      const sc = getSeverityColor(notif.severity);
                      return (
                        <div key={notif.id}
                          className={`flex items-start gap-3 p-3 border-b border-gray-800/50 transition-all hover:bg-gray-900/50`}
                          style={!notif.read_at ? { backgroundColor: `rgba(${securityTheme.r}, 0.04)` } : {}}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sc.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-mono text-xs font-medium">{notif.title}</p>
                            <p className="text-gray-500 font-mono text-[10px] mt-0.5">{notif.message}</p>
                            {notif.file_name && <p className="text-gray-600 font-mono text-[10px] mt-0.5">File: {notif.file_name}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-gray-600 font-mono text-[9px]">{new Date(notif.created_at).toLocaleTimeString()}</span>
                            {notif.threat_level && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${sc.text} border ${sc.bg}`}>
                                {notif.threat_level.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="p-8 text-center">
                        <AlertTriangleIcon size={24} className="text-gray-700 mx-auto mb-2" />
                        <p className="text-gray-600 font-mono text-xs">No security alerts</p>
                        <p className="text-gray-700 font-mono text-[10px] mt-1">Threats will appear here when detected</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Inline Search */}
            <div ref={searchContainerRef} className="relative flex items-center">
              <div className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${isSearchOpen ? 'w-64 md:w-80 opacity-100' : 'w-0 opacity-0'}`}>
                <div className="relative w-full">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
                    placeholder="Search everything..."
                    className="w-full h-9 bg-gray-900/80 border rounded-lg pl-3 pr-8 text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-all"
                    style={{
                      borderColor: `rgba(${searchTheme.r}, 0.3)`,
                      boxShadow: `0 0 10px rgba(${searchTheme.r}, 0.1)`,
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        setShowSearchDropdown(false);
                      }
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); searchInputRef.current?.focus(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-500 hover:text-white"
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleSearchToggle}
                {...getBtnProps('search', isSearchOpen)}
                title="Search (S)"
              >
                <SearchIcon size={16} />
              </button>

              {/* Search Results Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[400px] bg-black/98 border rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden"
                  style={{ borderColor: `rgba(${searchTheme.r}, 0.3)`, boxShadow: `0 0 30px rgba(${searchTheme.r}, 0.1)` }}>
                  <div className="p-2 border-b" style={{ borderColor: `rgba(${searchTheme.r}, 0.15)` }}>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-2">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                    </p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto darkwave-scrollbar">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                          setIsSearchOpen(false);
                          result.action?.();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-gray-900/80"
                        style={{ borderBottom: '1px solid rgba(50,50,50,0.3)' }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `rgba(${searchTheme.r}, 0.1)`, border: `1px solid rgba(${searchTheme.r}, 0.2)`, color: searchTheme.c }}>
                          {getResultIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-mono text-sm truncate">{result.title}</p>
                          <p className="text-gray-500 font-mono text-[10px]">{result.subtitle}</p>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-gray-500"
                          style={{ borderColor: 'rgba(100,100,100,0.3)' }}>
                          {result.type}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t" style={{ borderColor: `rgba(${searchTheme.r}, 0.15)` }}>
                    <button
                      onClick={() => {
                        setShowSearchDropdown(false);
                        if (onOpenSearch) onOpenSearch();
                      }}
                      className="w-full py-2 rounded-lg text-xs font-mono font-medium transition-all hover:bg-gray-900/50"
                      style={{ color: searchTheme.c }}
                    >
                      Advanced Search
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Panel Button */}
            {isPlatformOwner() && onOpenAdminPanel && (
              <button onClick={onOpenAdminPanel}
                {...getBtnProps('admin', false)}
                title="Platform Admin Panel">
                <AdminPanelIcon size={16} />
              </button>
            )}
            
            {/* Organization Admin Console Button */}
            {!isPlatformOwner() && isOrganizationAdmin() && onOpenOrgAdminPanel && (
              <button onClick={onOpenOrgAdminPanel}
                {...getBtnProps('admin', false)}
                title="Admin Console">
                <AdminPanelIcon size={16} />
              </button>
            )}

            {/* Notification Bell (Real-time from DB) */}
            <div className="relative" ref={bellDropdownRef}>
              <button
                onClick={() => { 
                  setShowBellDropdown(!showBellDropdown); 
                  setShowSecurityDropdown(false); 
                  // ⚡ FIX: Auto-mark as read when viewed, clearing the bubble instantly
                  if (!showBellDropdown) {
                    if (unreadAppCount > 0) markAllAppNotificationsRead();
                    setHasViewedTasks(true); // Mark tasks as read
                  }
                }}
                {...getBtnProps('notifications', showBellDropdown)}
                title="Notifications"
              >
                <BellIcon size={16} />
                {(unreadAppCount > 0 || (!hasViewedTasks && tasksDueToday.length > 0)) && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-1 text-white text-[8px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse"
                    style={{ backgroundColor: wsColor && !isMain ? wsColor.primary : '#d946ef', boxShadow: wsColor && !isMain ? `0 0 8px rgba(${wsColor.rgb}, 0.6)` : '0 0 8px rgba(217,70,239,0.6)' }}>
                    {(unreadAppCount + (hasViewedTasks ? 0 : tasksDueToday.length)) > 99 ? '99+' : (unreadAppCount + (hasViewedTasks ? 0 : tasksDueToday.length))}
                  </span>
                )}
              </button>

              {/* Bell Notification Dropdown */}
              {showBellDropdown && (
                <div className="absolute right-0 top-full mt-2 w-[400px] max-h-[520px] rounded-xl overflow-hidden z-50"
                  style={{
                    backgroundColor: 'rgba(10, 10, 14, 0.98)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: `1px solid rgba(${notifTheme.r}, 0.3)`,
                    boxShadow: `0 0 40px rgba(${notifTheme.r}, 0.15), 0 20px 60px rgba(0,0,0,0.8)`,
                  }}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: `rgba(${notifTheme.r}, 0.2)`, background: `linear-gradient(135deg, rgba(${notifTheme.r}, 0.05), transparent)` }}>
                    <div className="flex items-center gap-2">
                      <BellIcon size={16} style={{ color: notifTheme.c }} />
                      <span className="text-sm font-mono font-bold" style={{ color: notifTheme.c }}>Notifications</span>
                      {unreadAppCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `rgba(${notifTheme.r}, 0.15)`, color: notifTheme.c }}>
                          {unreadAppCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadAppCount > 0 && (
                        <button onClick={markAllAppNotificationsRead} className="text-[10px] font-mono text-gray-500 hover:text-white transition-colors">
                          Mark all read
                        </button>
                      )}
                      <button onClick={() => { loadAppNotifications(); }} className="text-[10px] font-mono text-gray-500 hover:text-white transition-colors" title="Refresh">
                        <SyncIcon size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[400px] overflow-y-auto darkwave-scrollbar">
                    
                    {/* ⚡ Tasks Due Today Section in Notifications */}
                    {(tasksDueToday.length > 0 || (snoozeUntil && snoozeUntil > Date.now()) || dismissedTaskAlert) && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-gray-800/50">
                          <span className="text-[10px] font-mono font-bold text-cyan-500 uppercase tracking-wider">Tasks Due Today</span>
                          {((snoozeUntil && snoozeUntil > Date.now()) || dismissedTaskAlert) && (
                            <button 
                              onClick={() => {
                                setSnoozeUntil(null);
                                localStorage.removeItem('taskAlertSnooze');
                                setDismissedTaskAlert(false);
                              }}
                              className="text-[9px] font-mono px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            >
                              Un-snooze Banner
                            </button>
                          )}
                        </div>
                        {tasksDueToday.length > 0 ? tasksDueToday.map(task => {
                          const isSnoozed = snoozedTasks[task.id] && snoozedTasks[task.id] > Date.now();
                          return (
                            <div
                              key={`notif-task-${task.id}`}
                              onClick={() => {
                                setShowBellDropdown(false);
                                window.dispatchEvent(new CustomEvent('focusTask', { detail: { taskId: task.id } }));
                              }}
                              className={`relative flex items-start gap-3 p-3 border-b border-gray-800/40 transition-all hover:bg-gray-900/60 cursor-pointer group bg-gradient-to-r from-transparent ${isSnoozed ? 'opacity-50 grayscale' : ''}`}
                              style={{ backgroundColor: `rgba(34,211,238, 0.03)` }}
                            >
                              {!isSnoozed && <div className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22d3ee', boxShadow: `0 0 6px #22d3ee` }} />}
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                <TaskIcon size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-mono text-xs leading-tight text-white font-medium truncate">
                                    {task.title}
                                  </p>
                                  <span className="text-cyan-500 font-mono text-[9px] whitespace-nowrap flex-shrink-0">
                                    {isSnoozed ? 'Snoozed' : 'Due Today'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                                    Task
                                  </span>
                                  {isSnoozed && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = { ...snoozedTasks };
                                        delete updated[task.id];
                                        setSnoozedTasks(updated);
                                        localStorage.setItem('individualTaskSnooze', JSON.stringify(updated));
                                      }}
                                      className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-yellow-500/30 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors ml-2"
                                    >
                                      Un-snooze
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="px-3 py-2 text-[10px] font-mono text-gray-500">No tasks due today.</div>
                        )}
                        {appNotifications.length > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-black/20 border-b border-gray-800/50 mt-1">
                            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">App Notifications</span>
                          </div>
                        )}
                      </div>
                    )}

                    {appNotifications.length > 0 ? appNotifications.map((notif) => {
                      const catDisplay = getCategoryDisplay(notif.category, notif.type);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`relative flex items-start gap-3 p-3 border-b border-gray-800/40 transition-all hover:bg-gray-900/60 cursor-pointer group ${
                            !notif.is_read ? 'bg-gradient-to-r from-transparent' : ''
                          }`}
                          style={!notif.is_read ? { backgroundColor: `rgba(${notifTheme.r}, 0.03)` } : {}}
                        >
                          {!notif.is_read && (
                            <div className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: notifTheme.c, boxShadow: `0 0 6px ${notifTheme.c}` }} />
                          )}
                          
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: catDisplay.bgColor, border: `1px solid ${catDisplay.borderColor}`, color: catDisplay.color }}>
                            {catDisplay.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-mono text-xs leading-tight ${!notif.is_read ? 'text-white font-medium' : 'text-gray-300'}`}>
                                {notif.title}
                              </p>
                              <span className="text-gray-600 font-mono text-[9px] whitespace-nowrap flex-shrink-0">
                                {timeAgo(notif.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-500 font-mono text-[10px] mt-0.5 line-clamp-2">{notif.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border" style={{ color: catDisplay.color, borderColor: catDisplay.borderColor, backgroundColor: catDisplay.bgColor }}>
                                {catDisplay.label}
                              </span>
                              {notif.metadata?.integration_name && (
                                <span className="text-[8px] font-mono text-gray-600">{notif.metadata.integration_name}</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-800 transition-all flex-shrink-0"
                            title="Dismiss"
                          >
                            <CloseIcon size={12} className="text-gray-500" />
                          </button>
                        </div>
                      );
                    }) : (
                      <div className="p-10 text-center">
                        <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `rgba(${notifTheme.r}, 0.05)`, border: `1px solid rgba(${notifTheme.r}, 0.15)` }}>
                          <BellIcon size={20} className="text-gray-700" />
                        </div>
                        <p className="text-gray-500 font-mono text-xs">No notifications yet</p>
                        <p className="text-gray-700 font-mono text-[10px] mt-1">Credential alerts, sync events, and mentions will appear here</p>
                      </div>
                    )}
                  </div>

                  {appNotifications.length > 0 && (
                    <div className="p-2 border-t" style={{ borderColor: `rgba(${notifTheme.r}, 0.15)` }}>
                      <button
                        onClick={() => { setShowBellDropdown(false); setShowAllNotificationsModal(true); }}
                        className="w-full py-2 rounded-lg text-xs font-mono font-medium transition-all hover:bg-gray-900/50"
                        style={{ color: notifTheme.c }}
                      >
                        View all notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unified Account Menu */}
            <div className="relative" ref={accountDropdownRef}>
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                {...getBtnProps('profile', showAccountDropdown)}
                title="Account Menu"
              >
                <UserIcon size={16} />
              </button>

              {showAccountDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50 border bg-black/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95"
                  style={{ borderColor: `rgba(${getResolvedColor('profile').r}, 0.3)` }}>
                  
                  {/* User Info Header */}
                  <div className="p-3 border-b" style={{ borderColor: `rgba(${getResolvedColor('profile').r}, 0.2)`, background: `linear-gradient(135deg, rgba(${getResolvedColor('profile').r}, 0.05), transparent)` }}>
                    <p className="text-sm font-bold text-white font-mono truncate">{getUserName()}</p>
                    <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: getResolvedColor('profile').c }}>{getUserRole()}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => { setShowAccountDropdown(false); onOpenSettings(); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-colors w-full text-left"
                    >
                      <SettingsIcon size={14} className="text-gray-400" />
                      Settings
                    </button>
                    <button
                      onClick={() => { setShowAccountDropdown(false); onOpenProfile(); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-colors w-full text-left"
                    >
                      <UserIcon size={14} className="text-gray-400" />
                      Profile
                    </button>
                    
                    {/* ⚡ NEW: Exit Demo Mode Option */}
                    {isPlatformOwner() && organization?.subscription_tier === 'demo' && (
                      <>
                        <div className="h-px w-full bg-gray-800/50 my-1" />
                        <button
                          onClick={() => {
                            setShowAccountDropdown(false);
                            
                            // Bypass all network requests to avoid triggering security interceptors.
                            // Synchronously restore the exact Platform Owner organization.
                            const corePlatformOrg = {
                              id: 'c28f0d91-c0df-4092-a2cc-19c860f1824f',
                              name: 'Applegate Solutions',
                              subscription_tier: 'expert',
                              is_active: true,
                              primary_color: '#06b6d4',
                              logo_url: 'https://rghtxlzzpuazvacupere.supabase.co/storage/v1/object/public/organization-logos/logos/c28f0d91-c0df-4092-a2cc-19c860f1824f-1777231826845.png'
                            };
                            
                            localStorage.setItem('bos_organization', JSON.stringify(corePlatformOrg));
                            localStorage.setItem('bos_platform_organization', JSON.stringify(corePlatformOrg));
                            
                            // Instantly reload into the home environment
                            window.location.href = '/'; 
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-mono text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors w-full text-left"
                        >
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Exit Demo Mode
                        </button>
                      </>
                    )}

                    <div className="h-px w-full bg-gray-800/50 my-1" />
                    <button
                      onClick={() => { setShowAccountDropdown(false); logout(); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left"
                    >
                      <LogoutIcon size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ⚡ NEW: Task Due Today Banner within the sticky flow */}
      {globalAlertsEnabled && activeTasksDueToday.length > 0 && !dismissedTaskAlert && (!snoozeUntil || snoozeUntil <= Date.now()) && (
        <div className="w-full pointer-events-auto relative z-50 flex flex-col">
          {/* Main Collapsed Banner */}
          <div className="w-full bg-gradient-to-r from-cyan-950/60 via-black/50 to-cyan-950/60 border-b border-cyan-500/30 backdrop-blur-md px-4 py-2 flex items-center shadow-[0_4px_20px_rgba(0,255,255,0.15)] animate-in slide-in-from-top-4 duration-300 relative z-[51]">
            <div className="flex items-center gap-3 overflow-visible max-w-full mx-auto w-full">
              
              {/* Expand Toggle */}
              <button 
                onClick={() => setIsBannerExpanded(!isBannerExpanded)}
                className="p-1 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors flex-shrink-0"
                title={isBannerExpanded ? "Collapse Tasks" : "Expand Tasks"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isBannerExpanded ? 'rotate-90' : ''}`}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0 animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                <TaskIcon size={12} className="text-cyan-400" />
              </div>
              
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <span className="font-bold text-cyan-400 text-xs font-mono whitespace-nowrap">
                  Due Today ({activeTasksDueToday.length}):
                </span>
                {!isBannerExpanded && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
                    {activeTasksDueToday.map((t, idx) => (
                      <React.Fragment key={t.id}>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('focusTask', { detail: { taskId: t.id } }))}
                          className="text-cyan-100 font-mono text-xs hover:text-white hover:underline whitespace-nowrap transition-colors"
                        >
                          {t.title}
                        </button>
                        {idx < activeTasksDueToday.length - 1 && <span className="text-cyan-500/50 text-xs">•</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Global Snooze and Dismiss Controls */}
              <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="relative flex items-center">
                  <button 
                    onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                    className="text-xs font-mono text-cyan-500/80 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    title="Change snooze duration"
                  >
                    {SNOOZE_OPTIONS.find(opt => opt.val === customSnoozeValue)?.label || '5 mins'}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showSnoozeMenu ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  
                  {showSnoozeMenu && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowSnoozeMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-32 bg-black/95 border border-cyan-500/40 rounded-lg shadow-xl p-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[300px] overflow-y-auto darkwave-scrollbar">
                        {SNOOZE_OPTIONS.map((opt) => (
                          <button 
                            key={opt.val}
                            onClick={() => { setCustomSnoozeValue(opt.val); setShowSnoozeMenu(false); }} 
                            className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors ${customSnoozeValue === opt.val ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-100 hover:bg-cyan-500/10 hover:text-white'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button 
                  onClick={() => handleSnooze(parseInt(customSnoozeValue) / 60)}
                  className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 rounded transition-colors text-xs font-mono font-medium"
                  title="Snooze All Tasks"
                >
                  Snooze
                </button>

                <div className="w-px h-4 bg-cyan-500/30 mx-1"></div>

                <button 
                  onClick={() => setDismissedTaskAlert(true)}
                  className="p-1 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/20 rounded transition-colors"
                  title="Dismiss Alert"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ⚡ Expanded Sub-Banners */}
          {isBannerExpanded && (
            <div className="w-full bg-black/90 backdrop-blur-xl border-b border-cyan-500/30 shadow-[0_8px_30px_rgba(0,255,255,0.1)] flex flex-col max-h-[50vh] overflow-y-auto darkwave-scrollbar relative z-[50] animate-in slide-in-from-top-2 duration-200">
              {activeTasksDueToday.map((task) => (
                <div key={`exp-${task.id}`} className="flex items-center gap-4 px-6 py-2.5 border-b border-cyan-500/10 hover:bg-cyan-900/20 transition-colors w-full mx-auto">
                  
                  {/* Mark Completed Checkbox */}
                  <button 
                    onClick={() => handleCompleteTask(task.id)}
                    className="group w-4 h-4 rounded border border-cyan-500/50 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-400 transition-all flex-shrink-0"
                    title="Mark as completed"
                  >
                    <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>

                  {/* Task Title Link */}
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('focusTask', { detail: { taskId: task.id } }))}
                    className="text-cyan-100 font-mono text-xs hover:text-white hover:underline text-left flex-1 truncate"
                  >
                    {task.title}
                  </button>

                  {/* Individual Snooze */}
                  <div className="ml-auto flex items-center gap-2 flex-shrink-0 relative">
                    <button 
                      onClick={() => setActiveIndividualSnoozeMenu(activeIndividualSnoozeMenu === task.id ? null : task.id)}
                      className="text-[10px] font-mono text-cyan-500/80 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      {SNOOZE_OPTIONS.find(opt => opt.val === individualSnoozeValue)?.label || '5 mins'}
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${activeIndividualSnoozeMenu === task.id ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    
                    {activeIndividualSnoozeMenu === task.id && (
                      <>
                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveIndividualSnoozeMenu(null)} />
                        <div className="absolute right-16 top-full mt-1 w-28 bg-black/95 border border-cyan-500/40 rounded-lg shadow-xl p-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[200px] overflow-y-auto darkwave-scrollbar">
                          {SNOOZE_OPTIONS.map((opt) => (
                            <button 
                              key={opt.val}
                              onClick={() => { setIndividualSnoozeValue(opt.val); setActiveIndividualSnoozeMenu(null); }} 
                              className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-mono transition-colors ${individualSnoozeValue === opt.val ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-100 hover:bg-cyan-500/10 hover:text-white'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <button 
                      onClick={() => handleTaskSnooze(task.id, parseInt(individualSnoozeValue) / 60)}
                      className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 rounded transition-colors text-[10px] font-mono font-medium"
                      title="Snooze this task"
                    >
                      Snooze
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Custom Color Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setContextMenu(null)} 
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} 
          />
          <div 
            className="fixed z-[101] bg-black/95 backdrop-blur-xl border border-gray-800 rounded-xl p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in duration-200"
            style={{ 
              left: Math.min(contextMenu.x - 60, window.innerWidth - 280), // ⚡ Adjusted width limit
              top: Math.min(contextMenu.y + 15, window.innerHeight - 150) 
            }}
          >
            <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider text-center">Set Icon Color</span>
            <div className="grid grid-cols-6 gap-2"> {/* ⚡ Changed to 6 columns */}
              {Object.entries(COLOR_PALETTE).map(([key, { color }]) => (
                <button
                  key={key}
                  onClick={() => handleColorSelect(key)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: `${color}30`, 
                    borderColor: color, 
                    boxShadow: userHeaderColors[contextMenu.buttonId] === key ? `0 0 15px ${color}80` : `0 0 8px ${color}40`
                  }}
                  title={key}
                />
              ))}
            </div>
            <button 
               onClick={() => handleColorSelect('default')} 
               className="mt-2 py-1.5 px-3 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-gray-800"
            >
              Reset to Default
            </button>
          </div>
        </>
      )}

      {/* ⚡ NEW: All Notifications Full Screen Modal */}
      {showAllNotificationsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowAllNotificationsModal(false)}>
          <div className="flex flex-col w-full max-w-4xl mx-4 border rounded-2xl h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl"
               style={{
                 borderColor: `rgba(${notifTheme.r}, 0.3)`,
                 background: `linear-gradient(135deg, rgba(${notifTheme.r}, 0.05), rgba(0,0,0,0.95))`,
                 boxShadow: `0 0 60px rgba(${notifTheme.r}, 0.15)`
               }}
               onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0" style={{ borderColor: `rgba(${notifTheme.r}, 0.2)` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg" style={{ backgroundColor: `rgba(${notifTheme.r}, 0.1)`, borderColor: `rgba(${notifTheme.r}, 0.3)`, color: notifTheme.c }}>
                  <BellIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-mono font-bold text-white tracking-wide">All Notifications</h3>
                  <p className="text-sm text-gray-500 font-mono mt-1">Manage all your alerts and messages</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {unreadAppCount > 0 && (
                  <button 
                    onClick={markAllAppNotificationsRead}
                    className="px-4 py-2 rounded-lg text-sm font-mono transition-colors border"
                    style={{ borderColor: `rgba(${notifTheme.r}, 0.4)`, color: notifTheme.c, backgroundColor: `rgba(${notifTheme.r}, 0.1)` }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = `rgba(${notifTheme.r}, 0.2)`}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = `rgba(${notifTheme.r}, 0.1)`}
                  >
                    Mark all as read
                  </button>
                )}
                <button onClick={() => setShowAllNotificationsModal(false)} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10">
                  <CloseIcon size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto darkwave-scrollbar p-6 space-y-3">
              {appNotifications.length > 0 ? appNotifications.map((notif) => {
                const catDisplay = getCategoryDisplay(notif.category, notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative flex items-start gap-4 p-4 border rounded-xl transition-all hover:bg-gray-900/60 cursor-pointer group ${
                      !notif.is_read ? 'bg-gradient-to-r from-transparent' : 'bg-black/40 border-gray-800'
                    }`}
                    style={!notif.is_read ? { backgroundColor: `rgba(${notifTheme.r}, 0.03)`, borderColor: `rgba(${notifTheme.r}, 0.2)` } : {}}
                  >
                    {!notif.is_read && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full" style={{ backgroundColor: notifTheme.c, boxShadow: `0 0 8px ${notifTheme.c}` }} />
                    )}
                    
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: catDisplay.bgColor, border: `1px solid ${catDisplay.borderColor}`, color: catDisplay.color }}>
                      {catDisplay.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`font-mono text-base leading-tight ${!notif.is_read ? 'text-white font-bold' : 'text-gray-300 font-medium'}`}>
                          {notif.title}
                        </p>
                        <span className="text-gray-500 font-mono text-xs whitespace-nowrap flex-shrink-0">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-400 font-mono text-sm leading-relaxed mb-3">{notif.message}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono px-2 py-1 rounded-md border" style={{ color: catDisplay.color, borderColor: catDisplay.borderColor, backgroundColor: catDisplay.bgColor }}>
                          {catDisplay.label}
                        </span>
                        {notif.metadata?.integration_name && (
                          <span className="text-xs font-mono text-gray-500 border border-gray-700 px-2 py-1 rounded-md bg-gray-900/50">
                            {notif.metadata.integration_name}
                          </span>
                        )}
                        {notif.metadata?.workspace_id && notif.metadata?.mini_app_id && (
                          <span className="text-xs font-mono text-gray-500 border border-gray-700 px-2 py-1 rounded-md bg-gray-900/50">
                            Linked to MiniApp
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-gray-800 transition-all flex-shrink-0 border border-transparent hover:border-gray-600 text-gray-500"
                      title="Dismiss"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                  <BellIcon size={48} className="mb-4 text-gray-600" />
                  <p className="text-gray-400 font-mono text-lg mb-2">No notifications found</p>
                  <p className="text-gray-600 font-mono text-sm">You're all caught up!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopHeader;