import React, { useState, useRef, useEffect } from 'react';
import { 
  CalendarIcon, TaskIcon, DashboardIcon, MessageIcon, MenuIcon,
  CloseIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon,
  ShieldIcon, CalculatorIcon, UsersIcon, DatabaseIcon, LockIcon,
  BuildIcon, ApplegateCoreLogo
} from '@/components/icons/Icons';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';
import { WORKSPACE_DEFINITIONS, WorkspaceSlug, SUBSCRIPTION_TIERS } from '@/types';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';

import CreateWorkspaceModal from './CreateWorkspaceModal';
import CreateOrganizationModal from './CreateOrganizationModal';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadMessages?: number;
  pendingTasks?: number;
  onSelectWorkspace?: (slug: string) => void;
  onNavigateToMiniApp?: (wsSlug: string, appName: string, openAddRecord?: boolean) => void;
  currentWorkspace?: string;
}

const wsIcons: Record<string, React.FC<{ className?: string; size?: number }>> = {
  admin: ShieldIcon, accounting: CalculatorIcon, personnel: UsersIcon,
  main: DashboardIcon, data: DatabaseIcon, security: LockIcon,
};

// Default Home Colors
const HOME_COLORS: Record<string, { color: string; rgb: string }> = {
  calendar: { color: '#c4b5fd', rgb: '196,181,253' }, 
  tasks: { color: '#6ee7b7', rgb: '110,231,183' },    
  dashboard: { color: '#67e8f9', rgb: '103,232,249' },
  messages: { color: '#93c5fd', rgb: '147,197,253' },
  workspaces: { color: '#f0abfc', rgb: '240,171,252' },
};

// ⚡ NEW: Selectable Color Palette for Customization
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

const FIXED_ICON_COLORS: Record<string, { color: string; rgb: string }> = {};

const UploadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17,8 12,3 7,8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const OrgIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="6" x2="9" y2="6.01" />
    <line x1="15" y1="6" x2="15" y2="6.01" />
    <line x1="9" y1="10" x2="9" y2="10.01" />
    <line x1="15" y1="10" x2="15" y2="10.01" />
    <line x1="9" y1="14" x2="9" y2="14.01" />
    <line x1="15" y1="14" x2="15" y2="14.01" />
    <path d="M9 18h6" />
  </svg>
);

// Helper to calculate hue rotation from cyan (~185deg) to target hex color
const getHueRotation = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return Math.round(h * 360) - 185; 
};

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab, onTabChange, unreadMessages = 0, pendingTasks = 0,
  onSelectWorkspace, onNavigateToMiniApp, currentWorkspace
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedWs, setExpandedWs] = useState<Record<string, boolean>>({});
  const [expandedOrgs, setExpandedOrgs] = useState<Record<string, boolean>>({});
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  
  // ⚡ NEW: Context Menu & User Color States
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean, x: number, y: number, buttonId: string } | null>(null);
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});
  const [isColorLoaded, setIsColorLoaded] = useState(false); // ⚡ Track color loading

  const { getColor } = useWorkspaceColor();
  const { organization, isPlatformOwner, isOrganizationAdmin, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(organization?.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // NEW: Global Notification States
  const [unreadCount, setUnreadCount] = useState(unreadMessages);
  const [pendingTasksCount, setPendingTasksCount] = useState(pendingTasks);

  const isHome = !currentWorkspace;
  const wc = currentWorkspace ? getColor(currentWorkspace) : null;

  // --- NEW: Dynamic Theme Colors ---
  const primaryColor = organization?.primary_color || '#06b6d4';
  
  // Helper to convert hex to rgb string for shadows and alphas
  const hexToRgb = (hex: string) => {
    const c = hex.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  };
  const primaryRgb = hexToRgb(primaryColor);
  const isPlatOwner = isPlatformOwner();
  const isOrgAdmin = isOrganizationAdmin();
  const tier = (organization?.subscription_tier || 'basic') as 'basic' | 'pro' | 'expert';
  const tierConfig = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.basic;

  const navItems = [
    { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
    { id: 'tasks', icon: TaskIcon, label: 'Tasks', badge: pendingTasksCount }, // ⚡ Uses live DB count now
    { id: 'dashboard', icon: DashboardIcon, label: 'Dashboard', isMain: true },
    { id: 'messages', icon: MessageIcon, label: 'Messages', badge: unreadCount }, 
    { id: 'workspaces', icon: MenuIcon, label: 'MENU', isMenu: true },
  ];

  // ⚡ NEW: Global Presence (Broadcast Online Status & Dispatch to App)
  useEffect(() => {
    const currentUserId = user?.id || (user as any)?.uid;
    const orgId = organization?.id;
    if (!currentUserId || !orgId) return;

    const presenceChannel = supabase.channel(`org_presence_${orgId}`, {
      config: { presence: { key: currentUserId } },
    });

    // 1. ADD LISTENER BEFORE SUBSCRIBING
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const onlineIds = Object.keys(state);
      
      // ⚡ FIX: Store it globally so panels that open later can read it immediately!
      (window as any).__onlineUserIds = onlineIds;
      
      // 2. DISPATCH GLOBALLY SO ANY COMPONENT CAN READ IT
      window.dispatchEvent(new CustomEvent('presence_update', { detail: onlineIds }));
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [organization?.id, user]);

  // ⚡ NEW: Global Unread Message Listener
  useEffect(() => {
    const currentUserId = user?.id || (user as any)?.uid;
    if (!currentUserId) return;

    const fetchUnread = async () => {
      const { count } = await supabase.schema('app_private')
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);
      
      if (count !== null) setUnreadCount(count);
    };

    fetchUnread(); // Initial fetch on load

    // Listen for new messages OR messages being marked as read
    const messageSub = supabase.channel('global_unread_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'app_private', 
        table: 'messages', 
        filter: `recipient_id=eq.${currentUserId}` 
      }, () => {
        fetchUnread();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'app_private', 
        table: 'messages', 
        filter: `recipient_id=eq.${currentUserId}` 
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSub);
    };
  }, [user]);

  // ⚡ NEW: Global Pending Tasks Listener
  useEffect(() => {
    const currentUserId = user?.id || (user as any)?.uid;
    if (!currentUserId) return;

    const fetchPendingTasks = async () => {
      const { count } = await supabase.schema('app_private')
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', currentUserId)
        .neq('status', 'completed');
      
      if (count !== null) setPendingTasksCount(count);
    };

    fetchPendingTasks(); // Initial fetch on load

    // Listen for any task changes assigned to us
    const taskSub = supabase.channel('global_pending_tasks')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'app_private', 
        table: 'tasks', 
        filter: `assigned_to=eq.${currentUserId}` 
      }, () => {
        fetchPendingTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskSub);
    };
  }, [user]);

  // ⚡ FETCH: BottomNav Colors
  useEffect(() => {
    const fetchUserPreferences = async () => {
      const userId = user?.id || (user as any)?.uid;
      if (!userId || !organization?.id) {
        setIsColorLoaded(true);
        return;
      }
      try {
        const { data, error } = await supabase.schema('app_private')
          .from('user_preferences')
          .select('nav_colors')
          .eq('user_id', userId)
          .eq('organization_id', organization.id) // ⚡ Scope to current org
          .maybeSingle();

        if (error) console.error('[BottomNav] Error fetching colors:', error);
        if (data?.nav_colors) setUserNavColors(data.nav_colors);
      } catch (err) {
        console.error('[BottomNav] Caught error fetching colors:', err);
      } finally {
        setIsColorLoaded(true);
      }
    };
    fetchUserPreferences();
  }, [user]);

  // ⚡ SAVE: BottomNav Colors
  const handleColorSelect = async (colorKey: string) => {
    const userId = user?.id || (user as any)?.uid;
    if (!contextMenu || !userId) return;

    const updatedColors = { ...userNavColors };
    if (colorKey === 'default') {
      delete updatedColors[contextMenu.buttonId];
    } else {
      updatedColors[contextMenu.buttonId] = colorKey;
    }

    setUserNavColors(updatedColors);
    setContextMenu(null);

    // ⚡ BROADCAST: Tell the rest of the app the colors just changed
    window.dispatchEvent(new CustomEvent('navColorsUpdated', { detail: updatedColors }));

    try {
      const { error } = await supabase.schema('app_private')
        .from('user_preferences')
        .upsert({
          user_id: userId,
          organization_id: organization.id, // ⚡ Scope to current org
          nav_colors: updatedColors,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, organization_id' }); // ⚡ Use new composite key
        
      if (error) console.error('[BottomNav] Error saving colors to DB:', error);
    } catch (err) {
      console.error('[BottomNav] Caught error saving colors:', err);
    }
  };

  // ⚡ UPDATED: Resolves the icon color, prioritizing workspace colors first
  const getIconColor = (id: string) => {
    if (FIXED_ICON_COLORS[id]) return FIXED_ICON_COLORS[id].color;
    // 1. Workspace mode takes absolute priority
    if (!isHome && wc) return wc.primary; 
    // 2. User custom color on Home
    if (userNavColors[id] && COLOR_PALETTE[userNavColors[id]]) return COLOR_PALETTE[userNavColors[id]].color;
    
    // ⚡ THE FIX: Default the dashboard icon to the org's primary color
    if (id === 'dashboard') return primaryColor;
    return HOME_COLORS[id]?.color || '#4b5563';
  };

  const getIconRgb = (id: string) => {
    if (FIXED_ICON_COLORS[id]) return FIXED_ICON_COLORS[id].rgb;
    // 1. Workspace mode takes absolute priority
    if (!isHome && wc) return wc.rgb;
    // 2. User custom RGB on Home
    if (userNavColors[id] && COLOR_PALETTE[userNavColors[id]]) return COLOR_PALETTE[userNavColors[id]].rgb;
    
    // ⚡ THE FIX: Default the dashboard icon to the org's primary RGB
    if (id === 'dashboard') return primaryRgb;
    return HOME_COLORS[id]?.rgb || '75,85,99';
  };

  // Update structural nav colors to use the primary color instead of hardcoded cyan
  const navBorderRgb = isHome ? primaryRgb : (wc?.rgb || primaryRgb);
  const menuScrollColor = isHome ? primaryRgb : (wc?.rgb || primaryRgb);
  const menuScrollPrimary = isHome ? primaryColor : (wc?.primary || primaryColor);

  const handleNav = (slug: string) => {
    if (onSelectWorkspace) onSelectWorkspace(slug);
    setIsMenuOpen(false);
  };

  const handleMiniAppClick = (wsSlug: string, appName: string) => {
    if (onNavigateToMiniApp) {
      onNavigateToMiniApp(wsSlug, appName, false);
    } else if (onSelectWorkspace) {
      onSelectWorkspace(wsSlug);
    }
    setIsMenuOpen(false);
  };

  const handleMiniAppAddRecord = (wsSlug: string, appName: string) => {
    if (onNavigateToMiniApp) {
      onNavigateToMiniApp(wsSlug, appName, true);
    } else if (onSelectWorkspace) {
      onSelectWorkspace(wsSlug);
    }
    setIsMenuOpen(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;
    
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${organization.id}_logo.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName);
      
      const logoUrl = urlData?.publicUrl;
      if (logoUrl) {
        await db.from('organization_logos').upsert({
          organization_id: organization.id,
          logo_url: logoUrl,
          uploaded_by: (user as any)?.id || (user as any)?.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' });
        
        await db.from('organizations')
          .update({ logo_url: logoUrl })
          .eq('id', organization.id);
        
        setOrgLogo(logoUrl);
      }
    } catch (err) {
      console.error('Logo upload error:', err);
    } finally {
      setUploadingLogo(false);
    }
  };

  const extraOrgs = tier === 'expert' ? [
    { id: 'org-2', name: 'Subsidiary Corp', tier: 'expert' as const },
    { id: 'org-3', name: 'Regional Office', tier: 'expert' as const },
  ] : [];

  // Dynamically calculate the active logo color
  const activeLogoColor = (currentWorkspace && wc) 
    ? wc.primary 
    : (userNavColors['dashboard'] && COLOR_PALETTE[userNavColors['dashboard']] ? COLOR_PALETTE[userNavColors['dashboard']].color : primaryColor);
    
  const activeLogoRgb = (currentWorkspace && wc) 
    ? wc.rgb 
    : (userNavColors['dashboard'] && COLOR_PALETTE[userNavColors['dashboard']] ? COLOR_PALETTE[userNavColors['dashboard']].rgb : primaryRgb);

  const hueRotateDeg = getHueRotation(activeLogoColor);
  
  // ⚡ NEW: Detect if the target color is white/grayscale
  const activeR = parseInt(activeLogoColor.slice(1, 3), 16) || 0;
  const activeG = parseInt(activeLogoColor.slice(3, 5), 16) || 0;
  const activeB = parseInt(activeLogoColor.slice(5, 7), 16) || 0;
  // If the RGB values are very close to each other, it's grayscale
  const isGrayscale = Math.max(activeR, activeG, activeB) - Math.min(activeR, activeG, activeB) < 20;
  const isLight = (activeR + activeG + activeB) / 3 > 150;

  if (!isColorLoaded) return null; // ⚡ NEW: Prevent render until colors resolve

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-lg z-40"
        style={{ borderTop: `1px solid rgba(${navBorderRgb}, 0.2)`, WebkitTapHighlightColor: 'transparent' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, rgba(${navBorderRgb}, 0.3), transparent)` }} />
        
        {/* Dynamic Logo Block matching Workspace or User Dashboard preferences */}
        <div 
          className="absolute top-1/2 left-4 -translate-y-1/2 opacity-100 pointer-events-none transition-all duration-500"
          style={{ 
            filter: isGrayscale 
              ? `grayscale(100%) brightness(${isLight ? 200 : 120}%) drop-shadow(0 0 12px rgba(${activeLogoRgb}, 0.8))`
              : `hue-rotate(${hueRotateDeg}deg) drop-shadow(0 0 12px rgba(${activeLogoRgb}, 0.8))` 
          }}
        >
          <ApplegateCoreLogo className="w-24 h-auto transition-all duration-500 brightness-110" />
        </div>

        <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'workspaces' && activeTab === 'workspace');
            const iconColor = getIconColor(item.id);
            const iconRgb = getIconRgb(item.id);

            if (item.isMain) {
              const dc = isHome ? (userNavColors[item.id] ? COLOR_PALETTE[userNavColors[item.id]].color : primaryColor) : (wc?.primary || primaryColor);
              const dr = isHome ? (userNavColors[item.id] ? COLOR_PALETTE[userNavColors[item.id]].rgb : primaryRgb) : (wc?.rgb || primaryRgb);
              
              return (
                <button 
                  key={item.id} 
                  onClick={() => onTabChange(item.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, buttonId: item.id });
                  }}
                  className="relative flex flex-col items-center justify-center -mt-10 w-16 transition-all"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  title="Right-click to customize color"
                >
                  <div 
                    className="absolute inset-0 -m-3 rounded-2xl blur-xl" 
                    style={{ 
                      background: `rgba(${dr}, ${isActive ? 0.3 : 0.12})`,
                      animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
                    }} 
                  />
                  <div className="relative w-14 h-14 rounded-xl flex items-center justify-center" style={{
                    background: isHome ? `linear-gradient(135deg, rgba(${dr},0.12), rgba(168,85,247,0.08), rgba(0,0,0,0.95))` : `linear-gradient(135deg, rgba(${dr}, 0.12), rgba(0,0,0,0.95))`,
                    border: `2.5px solid rgba(${dr}, ${isActive ? 0.8 : 0.5})`,
                    boxShadow: isActive ? `0 0 30px rgba(${dr}, 0.5), 0 0 60px rgba(${dr}, 0.2), inset 0 0 20px rgba(${dr}, 0.15)` : `0 0 12px rgba(${dr}, 0.25), 0 0 4px rgba(${dr}, 0.4)`,
                    animation: 'navPulse 3s ease-in-out infinite' 
                  }}>
                    <span style={{ color: dc, filter: isActive ? `drop-shadow(0 0 12px rgba(${dr}, 0.9)) drop-shadow(0 0 4px ${dc})` : `drop-shadow(0 0 6px rgba(${dr}, 0.5))` }}>
                      <Icon size={26} />
                    </span>
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: `rgba(${dr}, 0.7)` }} />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: `rgba(${dr}, 0.5)` }} />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: `rgba(${dr}, 0.5)` }} />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: `rgba(${dr}, 0.7)` }} />
                  </div>
                </button>
              );
            }

            if (item.isMenu) {
              return (
                <button 
                  key={item.id} 
                  onClick={() => onTabChange(item.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, buttonId: item.id });
                  }}
                  className="relative flex items-center justify-center p-3 rounded-lg transition-all min-h-[44px] min-w-[44px]"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  title="Right-click to customize color"
                >
                  <span style={{ color: iconColor, filter: `drop-shadow(0 0 5px ${iconColor}60)` }}>
                    <Icon size={24} />
                  </span>
                </button>
              );
            }

            return (
              <button 
                key={item.id} 
                onClick={() => onTabChange(item.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, buttonId: item.id });
                }}
                className="relative flex items-center justify-center p-3 rounded-lg transition-all min-h-[44px] min-w-[44px]"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                title="Right-click to customize color"
              >
                <div className="relative">
                  <span style={{ color: iconColor, filter: isActive ? `drop-shadow(0 0 8px rgba(${iconRgb}, 0.8)) drop-shadow(0 0 3px ${iconColor})` : `drop-shadow(0 0 4px rgba(${iconRgb}, 0.3))` }}>
                    <Icon size={24} />
                  </span>
                  {(item.badge || 0) > 0 && (
                    <span className="absolute -top-2.5 -right-3 min-w-[18px] h-[18px] text-[9px] font-bold font-mono rounded-full flex items-center justify-center px-1"
                      style={{ backgroundColor: '#000', border: `2px solid ${iconColor}`, color: iconColor, boxShadow: `0 0 8px rgba(${iconRgb}, 0.5), 0 0 2px rgba(0,0,0,1)`, outline: '1.5px solid #000' }}>
                      {item.badge! > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                {isActive && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: iconColor, boxShadow: `0 0 8px rgba(${iconRgb}, 0.7)` }} />}
              </button>
            );
          })}
        </div>

        {/* ⚡ NEW: Demo Mode Badge & Exit Button */}
        {organization?.subscription_tier === 'demo' && (
          <div className="absolute top-1/2 right-4 -translate-y-1/2 z-50 flex items-center gap-2 animate-in fade-in duration-500">
            {/* Exit Demo Button */}
            <button
              onClick={() => {
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
                window.location.href = '/'; 
              }}
              className="px-2 py-1 bg-black/80 border border-emerald-500/50 text-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] backdrop-blur-md hover:bg-emerald-500/20 hover:scale-105 transition-all flex items-center gap-1"
              title="Exit Demo Mode"
            >
              <CloseIcon size={12} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Exit</span>
            </button>

            {/* Original Demo Mode Indicator */}
            <div className="relative flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md animate-pulse" />
              <div className="relative flex items-center gap-2 px-3 py-1.5 bg-black/80 border border-amber-500/50 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" style={{ animationDuration: '1.5s' }} />
                <span className="text-amber-400 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">
                  Demo Mode
                </span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ⚡ NEW: Custom Color Context Menu */}
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
              left: Math.min(contextMenu.x - 60, window.innerWidth - 280), // ⚡ Adjusted to 280px limit to accommodate a wider 6-column menu
              bottom: window.innerHeight - contextMenu.y + 15 
            }}
          >
            <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider text-center">Set Icon Color</span>
            <div className="grid grid-cols-6 gap-2"> {/* ⚡ Changed to 6 cols and slightly tighter gap */}
              {Object.entries(COLOR_PALETTE).map(([key, { color }]) => (
                <button
                  key={key}
                  onClick={() => handleColorSelect(key)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: `${color}30`, 
                    borderColor: color, 
                    boxShadow: userNavColors[contextMenu.buttonId] === key ? `0 0 15px ${color}80` : `0 0 8px ${color}40`
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

      {/* Hamburger Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-96 max-w-[90vw] bg-black shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-slide-in-right" style={{ borderLeft: `1px solid rgba(${menuScrollColor}, 0.2)` }}>
            <div className="absolute inset-0 hex-pattern opacity-10" />
            
            <div className="relative flex items-center justify-between p-4 border-b" style={{ borderColor: `rgba(${menuScrollColor}, 0.2)` }}>
              {isPlatOwner ? (
                <div className="flex items-center gap-3">
                  <img src={LOGO_URL} alt="Applegate CORE" className="h-8 w-auto drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
                  <span className="text-sm font-mono font-bold tracking-widest uppercase" style={{ color: menuScrollPrimary }}>A-CORE</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative group flex-shrink-0">
                    {orgLogo ? (
                      <img src={orgLogo} alt={organization?.name || 'Organization'} className="h-10 w-10 rounded-lg object-cover" style={{ border: `1.5px solid rgba(${menuScrollColor}, 0.4)` }} />
                    ) : (
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ border: `1.5px solid rgba(${menuScrollColor}, 0.4)`, background: `rgba(${menuScrollColor}, 0.1)` }}>
                        <OrgIcon size={20} style={{ color: menuScrollPrimary }} />
                      </div>
                    )}
                    {(isOrgAdmin || isPlatOwner) && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {uploadingLogo ? (
                          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${menuScrollColor}, 0.3)`, borderTopColor: menuScrollPrimary }} />
                        ) : (
                          <UploadIcon size={16} style={{ color: menuScrollPrimary }} />
                        )}
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-mono font-bold truncate" style={{ color: menuScrollPrimary }}>
                      {organization?.name || 'Organization'}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {tierConfig.name} &middot; ${tierConfig.price}/mo
                    </p>
                  </div>
                </div>
              )}
              <button onClick={() => setIsMenuOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-lg flex-shrink-0">
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="relative p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-140px)]"
              style={{ scrollbarWidth: 'thin', scrollbarColor: `${menuScrollPrimary}40 transparent` }}>
              
              {tier === 'expert' && (
                <>
                  <div className="mb-2">
                    <button
                      onClick={() => setExpandedOrgs(p => ({ ...p, primary: !p.primary }))}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all"
                      style={{ borderColor: `rgba(${menuScrollColor}, 0.3)`, background: `rgba(${menuScrollColor}, 0.05)` }}
                    >
                      {orgLogo ? (
                        <img src={orgLogo} alt="" className="h-7 w-7 rounded object-cover" />
                      ) : (
                        <OrgIcon size={18} style={{ color: menuScrollPrimary }} />
                      )}
                      <span className="flex-1 text-left text-sm font-mono font-medium" style={{ color: menuScrollPrimary }}>
                        {organization?.name || 'Primary Organization'}
                      </span>
                      {expandedOrgs.primary !== false ? <ChevronDownIcon size={16} style={{ color: menuScrollPrimary }} /> : <ChevronRightIcon size={16} className="text-gray-600" />}
                    </button>
                  </div>
                  
                  {expandedOrgs.primary !== false && (
                    <div className="ml-2 space-y-3">
                      {renderWorkspaceList()}
                    </div>
                  )}

                  {extraOrgs.map((org) => (
                    <div key={org.id} className="mb-2">
                      <button
                        onClick={() => setExpandedOrgs(p => ({ ...p, [org.id]: !p[org.id] }))}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all"
                        style={{ borderColor: 'rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.05)' }}
                      >
                        <OrgIcon size={18} className="text-purple-400" />
                        <span className="flex-1 text-left text-sm font-mono font-medium text-purple-400">{org.name}</span>
                        {expandedOrgs[org.id] ? <ChevronDownIcon size={16} className="text-purple-400" /> : <ChevronRightIcon size={16} className="text-gray-600" />}
                      </button>
                      {expandedOrgs[org.id] && (
                        <div className="ml-2 mt-2 space-y-3">
                          {renderWorkspaceList()}
                        </div>
                      )}
                    </div>
                  ))}

                  {(isOrgAdmin || isPlatOwner) && (
                    <button
                      onClick={() => setShowCreateOrg(true)}
                      className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed transition-all hover:bg-gray-900/50"
                      style={{ borderColor: `rgba(${menuScrollColor}, 0.3)`, color: menuScrollPrimary }}
                    >
                      <PlusIcon size={16} />
                      <span className="text-xs font-mono">Add Organization ({1 + extraOrgs.length}/12)</span>
                    </button>
                  )}
                </>
              )}

              {tier !== 'expert' && renderWorkspaceList()}

              {(tier === 'pro' || tier === 'expert') && (isOrgAdmin || isPlatOwner) && (
                <button
                  onClick={() => setShowCreateWorkspace(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed transition-all hover:bg-gray-900/50"
                  style={{ borderColor: `rgba(${menuScrollColor}, 0.3)`, color: menuScrollPrimary }}
                >
                  <PlusIcon size={16} />
                  <span className="text-sm font-mono">Add Workspace ({Object.keys(WORKSPACE_DEFINITIONS).length}/{tierConfig.maxWorkspaces})</span>
                </button>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 border-t" style={{ borderColor: `rgba(${menuScrollColor}, 0.15)` }}>
              <div className="flex items-center justify-center gap-2 text-xs font-mono" style={{ color: `rgba(${menuScrollColor}, 0.4)` }}>
                <LockIcon size={14} />
                <span>Q-CORE Protected</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        organizationId={organization?.id}
        userId={(user as any)?.id || (user as any)?.email}
        currentCount={Object.keys(WORKSPACE_DEFINITIONS).length}
        maxCount={tierConfig.maxWorkspaces}
        accentColor={menuScrollPrimary}
        accentRgb={menuScrollColor}
        onCreated={(ws) => {
          console.log('Workspace created:', ws);
          if (onSelectWorkspace) onSelectWorkspace(ws.slug);
          setIsMenuOpen(false);
        }}
      />

      <CreateOrganizationModal
        isOpen={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        parentOrganizationId={organization?.id}
        userId={(user as any)?.id || (user as any)?.email}
        currentCount={1 + extraOrgs.length}
        maxCount={tierConfig.maxOrganizations}
        onCreated={(org) => {
          console.log('Organization created:', org);
        }}
      />

      <style>{`
          @keyframes navPulse {
            0%, 100% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.05); filter: brightness(1.2) drop-shadow(0 0 15px rgba(${navBorderRgb}, 0.6)); }
          }
          <style>{
        /* ⚡ Custom Slow Pulse (3s = half speed of standard Tailwind pulse) */
        @keyframes slowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-slow-pulse { 
          animation: slowPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; 
        }

        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        ${Object.keys(WORKSPACE_DEFINITIONS).map(slug => {
          const c = getColor(slug);
          return `
            @keyframes ws-pulsate-${slug} {
              0%, 100% { box-shadow: 0 0 6px rgba(${c.rgb}, 0.3), inset 0 0 6px rgba(${c.rgb}, 0.1); border-color: rgba(${c.rgb}, 0.4); }
              50% { box-shadow: 0 0 24px rgba(${c.rgb}, 0.6), inset 0 0 14px rgba(${c.rgb}, 0.15); border-color: rgba(${c.rgb}, 0.8); }
            }
          `;
        }).join('\n')}
      `}</style>
    </>
  );

  function renderWorkspaceList() {
    return Object.entries(WORKSPACE_DEFINITIONS).map(([slug, ws]) => {
      const Icon = wsIcons[slug] || DashboardIcon;
      const c = getColor(slug);
      const isExp = expandedWs[slug];
      const miniApps = ws.miniApps || [];
      const isCurrent = currentWorkspace === slug;

      return (
        <div key={slug} className="relative">
          <div className="relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all overflow-hidden" style={{
            borderColor: isExp ? c.primary : `rgba(${c.rgb}, 0.35)`,
            background: 'transparent',
            boxShadow: isCurrent ? undefined : isExp ? `0 0 20px rgba(${c.rgb}, 0.25)` : `0 0 8px rgba(${c.rgb}, 0.15)`,
            animation: isCurrent ? `ws-pulsate-${slug} 2s ease-in-out infinite` : 'none',
          }}>
            <div className="absolute inset-0 z-0" style={{ background: `linear-gradient(135deg, rgba(${c.rgb}, 0.08) 0%, rgba(0,0,0,0.95) 30%, rgba(0,0,0,0.98) 70%, rgba(${c.rgb}, 0.08) 100%)` }} />
            <button onClick={() => handleNav(slug)} className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110" style={{ border: `1.5px solid rgba(${c.rgb}, 0.5)`, background: `linear-gradient(135deg, rgba(${c.rgb}, 0.15), rgba(0,0,0,0.9))`, boxShadow: `0 0 12px rgba(${c.rgb}, 0.3)` }}>
              <span style={{ color: c.primary, filter: `drop-shadow(0 0 6px ${c.primary})` }}>
                <Icon size={20} />
              </span>
            </button>
            <button onClick={() => handleNav(slug)} className="relative z-10 flex-1 text-left hover:opacity-80 transition-opacity">
              <h3 className="font-mono font-medium flex items-center gap-2" style={{ color: c.primary }}>
                {ws.name}
                {isCurrent && <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: c.primary, boxShadow: `0 0 8px ${c.primary}` }} />}
              </h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{miniApps.length} MiniApps</p>
            </button>
            {miniApps.length > 0 && (
              <button onClick={e => { e.stopPropagation(); setExpandedWs(p => ({ ...p, [slug]: !p[slug] })); }} className="relative z-10 p-2 rounded-lg transition-all hover:bg-gray-800/50" style={{ color: c.primary }}>
                {isExp ? <ChevronDownIcon size={20} /> : <ChevronRightIcon size={20} className="text-gray-600" />}
              </button>
            )}
          </div>
          {isExp && miniApps.length > 0 && (
            <div className="mt-3 ml-4 pl-4 space-y-1" style={{ borderLeft: `2px solid rgba(${c.rgb}, 0.3)` }}>
              {miniApps.map((app, i) => {
                const MiniIcon = getMiniAppIcon(app);
                return (
                  <div key={i} className="flex items-center justify-between group">
                    <button onClick={() => handleMiniAppClick(slug, app)} className="flex-1 flex items-center gap-2 p-2 rounded-lg text-left transition-all hover:bg-gray-900/50">
                      <MiniIcon size={14} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: c.primary }} />
                      <span className="text-sm font-mono text-gray-400 group-hover:text-white">{app}</span>
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleMiniAppAddRecord(slug, app); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-800" style={{ color: c.primary }} title={`Create new ${app}`}>
                      <PlusIcon size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  }
};

export default BottomNav;