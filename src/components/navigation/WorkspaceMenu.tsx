import React, { useState, useRef, useEffect } from 'react';
import { 
  CloseIcon, 
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ApplegateCoreLogo,
  LockIcon,
  ShieldIcon,
  BarChartIcon,
  CalculatorIcon,
  UsersIcon,
  HomeIcon,
  DatabaseIcon,
  BuildIcon,
  PopoutIcon
} from '@/components/icons/Icons';
import { Workspace, WorkspaceSlug, WORKSPACE_DEFINITIONS, SUBSCRIPTION_TIERS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';
import MiniAppView from '@/components/miniapp/MiniAppView';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';
import * as LucideIcons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/695fc81af8bb22c52e2539fb_1769628610343_93d83d41.png';

// ⚡ REPLICATING THE DASHBOARD: The exact UUID mapping for preset workspaces
const WORKSPACE_ID_MAP: Record<string, string> = {
  'admin': '9c5d12fb-1305-451c-9ff6-699bccbbf354',
  'personnel': '80d960f3-16f2-4f93-9eb9-8cad53594112',
  'data': '38af3278-30a7-451e-b691-8b55b741aaf5',
  'main': '22bda45d-c323-41c7-9025-566dbcef06c0',
  'security': '1759127c-2fba-4629-b63b-f27e4e0c39d8',
  'accounting': '09bd9db0-eb92-4089-9981-f01e7ed2882b',
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

interface WorkspaceMenuProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeWorkspace: WorkspaceSlug | null;
  onSelectWorkspace: (slug: string, miniApp?: string) => void; 
  onOpenSettings: (slug: string) => void;
  isAdmin: boolean;
  zIndex?: number;
  stackIndex?: number;
  onBringToFront?: () => void;
  onMakeSecondary?: () => void;
  // NEW: Advanced Layout Tracking for Right Panels
  dockedPanels?: string[];
  rightPanelStates?: Record<string, string>;
  onDockToggle?: (panel: string, isDocked: boolean) => void;
  onLayoutChange?: (panel: string, layoutState: string) => void;
}

// ⚡ FIX: Allow the style prop to pass through to the SVG components
const WorkspaceIcon: React.FC<{ slug: string; size?: number; className?: string; style?: React.CSSProperties }> = ({ slug, size = 24, className = '', style }) => {
  const iconProps = { size, className, style }; 
  switch (slug) {
    case 'admin': return <ShieldIcon {...iconProps} />;
    case 'accounting': return <CalculatorIcon {...iconProps} />;
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

export const workspaceColors: Record<string, { 
  border: string; bg: string; glow: string; text: string; iconGlow: string; dotColor: string;
  borderRaw: string;
}> = {
  admin: { border: 'border-red-500/40', bg: 'from-red-950/40 to-black', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', text: 'text-red-400', iconGlow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]', dotColor: 'bg-red-400', borderRaw: 'rgba(239,68,68,0.6)' },
  accounting: { border: 'border-green-500/40', bg: 'from-green-950/40 to-black', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]', text: 'text-green-400', iconGlow: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]', dotColor: 'bg-green-400', borderRaw: 'rgba(34,197,94,0.6)' },
  personnel: { border: 'border-fuchsia-500/40', bg: 'from-fuchsia-950/40 to-black', glow: 'shadow-[0_0_15px_rgba(255,0,255,0.3)]', text: 'text-fuchsia-400', iconGlow: 'drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]', dotColor: 'bg-fuchsia-400', borderRaw: 'rgba(255,0,255,0.6)' },
  main: { border: 'border-cyan-500/40', bg: 'from-cyan-950/40 to-black', glow: 'shadow-[0_0_15px_rgba(0,255,255,0.3)]', text: 'text-cyan-400', iconGlow: 'drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]', dotColor: 'bg-cyan-400', borderRaw: 'rgba(0,255,255,0.6)' },
  data: { border: 'border-purple-500/40', bg: 'from-purple-950/40 to-black', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]', text: 'text-purple-400', iconGlow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]', dotColor: 'bg-purple-400', borderRaw: 'rgba(168,85,247,0.6)' },
  security: { border: 'border-orange-500/40', bg: 'from-orange-950/40 to-black', glow: 'shadow-[0_0_15px_rgba(255,153,0,0.3)]', text: 'text-orange-400', iconGlow: 'drop-shadow-[0_0_8px_rgba(255,153,0,0.8)]', dotColor: 'bg-orange-400', borderRaw: 'rgba(255,153,0,0.6)' },
};

// Upload icon
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
    <line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" />
    <line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" />
    <line x1="9" y1="14" x2="9" y2="14.01" /><line x1="15" y1="14" x2="15" y2="14.01" />
    <path d="M9 18h6" />
  </svg>
);

const WorkspaceMenu: React.FC<WorkspaceMenuProps> = ({
  isOpen, onClose, workspaces, activeWorkspace, onSelectWorkspace, onOpenSettings, isAdmin, zIndex = 30, stackIndex = 0, onBringToFront,
  dockedPanels = [], rightPanelStates = {}, onDockToggle, onLayoutChange, onMakeSecondary
}) => {
  const navigate = useNavigate();
  const { user, organization } = useAuth(); // ⚡ Destructure organization
  const { getColor } = useWorkspaceColor();
  const [isHovered, setIsHovered] = useState(false);

  // ⚡ NEW: Resolve Theme Colors from Preferences and Active Workspace
  const [userHeaderColors, setUserHeaderColors] = useState<Record<string, string>>({});
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPreferences = async () => {
      const userId = user?.id || (user as any)?.uid;
      if (!userId || !isOpen || !organization?.id) return;
      const { data } = await supabase.schema('app_private')
        .from('user_preferences')
        .select('header_colors, nav_colors')
        .eq('user_id', userId)
        .eq('organization_id', organization.id) // ⚡ Scope to active org
        .maybeSingle();
      if (data?.header_colors) setUserHeaderColors(data.header_colors);
      if (data?.nav_colors) setUserNavColors(data.nav_colors);
    };
    fetchPreferences();

    const handleHeaderUpdate = (e: any) => { if (e.detail) setUserHeaderColors(e.detail); };
    const handleNavUpdate = (e: any) => { if (e.detail) setUserNavColors(e.detail); };
    
    window.addEventListener('headerColorsUpdated', handleHeaderUpdate);
    window.addEventListener('navColorsUpdated', handleNavUpdate);
    return () => {
      window.removeEventListener('headerColorsUpdated', handleHeaderUpdate);
      window.removeEventListener('navColorsUpdated', handleNavUpdate);
    };
  }, [user, isOpen]);

  const notifPrefKey = userHeaderColors['notifications'];
  const notifColor = notifPrefKey && COLOR_PALETTE[notifPrefKey] ? COLOR_PALETTE[notifPrefKey].color : '#facc15';
  const notifRgb = notifPrefKey && COLOR_PALETTE[notifPrefKey] ? COLOR_PALETTE[notifPrefKey].rgb : '250, 204, 21';
  
  // ⚡ THEME RESOLUTION FOR PANEL
  const ac = activeWorkspace ? getColor(activeWorkspace) : null;
  const userPrefKey = userNavColors['workspaces'];

  const panelAccentColor = (activeWorkspace && ac) 
    ? ac.primary 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#06b6d4'); // cyan default

  const panelAccentRGB = (activeWorkspace && ac) 
    ? ac.rgb 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '6, 182, 212');

  // STATE: Expansion, Docking, and Side-by-Side
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [isSideBySide, setIsSideBySide] = useState(false);

  const activePanelId = 'workspaces';

  const prevLayoutRef = useRef<string>('normal');
  useEffect(() => {
    let layoutState = 'normal';
    if (isDocked) layoutState = 'docked';
    else if (isSideBySide && isExpanded) layoutState = 'side-expanded';
    else if (isSideBySide) layoutState = 'side';
    else if (isExpanded) layoutState = 'expanded';
    
    if (prevLayoutRef.current !== layoutState) {
      prevLayoutRef.current = layoutState;
      if (onLayoutChange) onLayoutChange(activePanelId, layoutState);
    }
  }, [isDocked, isExpanded, isSideBySide, onLayoutChange]);

  useEffect(() => {
    if (stackIndex === 0 && isSideBySide) setIsSideBySide(false);
    // ⚡ FIX: Auto-collapse if pushed too far back to prevent screen overflow
    if (stackIndex > 1 && (isSideBySide || isExpanded)) {
      setIsSideBySide(false);
      setIsExpanded(false);
    }
  }, [stackIndex, isSideBySide, isExpanded]);

  // NEW: AUTO-DOCK FROM PARENT LOGIC
  useEffect(() => {
    if (dockedPanels?.includes(activePanelId)) {
      setIsDocked(true);
      setIsExpanded(false);
      setIsSideBySide(false);
    } else {
      // ⚡ FIX: When AppLayout removes this panel from the docked list, undock it!
      setIsDocked(false);
    }
  }, [dockedPanels]);

  // DYNAMIC LAYOUT LOGIC
  const panelWidth = isExpanded ? 836 : 418;
  const isFrontExpanded = Object.entries(rightPanelStates || {}).some(([id, state]) => id !== activePanelId && (state === 'expanded' || state === 'side-expanded'));

  const frontPanelWidth = isFrontExpanded ? 836 : 418;
  const expansionOffset = (stackIndex > 0 && isFrontExpanded) ? 418 : 0;
  const baseOffset = (stackIndex * 48) + (isHovered && stackIndex > 0 ? 24 : 0);
  
  // ⚡ FIX: If a background panel is explicitly side-by-side OR previously expanded,
  // attach it perfectly flush against the left edge of the front panel!
  const rightPos = (stackIndex > 0 && (isSideBySide || isExpanded)) 
    ? `${frontPanelWidth}px` 
    : `${baseOffset + expansionOffset}px`;

  const handleExpandClick = () => {
    if (stackIndex === 0) {
      // FRONT PANEL LOGIC: Toggle between Normal and Expanded
      const willExpand = !isExpanded;
      setIsExpanded(willExpand);
      setIsSideBySide(false); 
    } else {
      // BACK PANEL LOGIC: 3-Stage Loop (Resting -> Side-by-Side -> Expanded -> Resting)
      if (!isSideBySide && !isExpanded) {
        setIsSideBySide(true);
        if (stackIndex > 1 && onMakeSecondary) onMakeSecondary();
      } else if (isSideBySide && !isExpanded) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
        setIsSideBySide(false);
      }
    }
  };

  const handleDockClick = () => {
    setIsDocked(true);
    setIsExpanded(false);
    setIsSideBySide(false);
    if (onDockToggle) onDockToggle(activePanelId, true);
  };

  const handleCloseTab = (e: React.MouseEvent) => {
    e.stopPropagation(); setIsDocked(false);
    if (onDockToggle) onDockToggle(activePanelId, false);
    onClose();
  };

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [expandedOrgs, setExpandedOrgs] = useState<Record<string, boolean>>({ primary: true });
  const { isPlatformOwner, isOrganizationAdmin } = useAuth(); // ⚡ Removed duplicate 'organization'
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(organization?.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // ⚡ Sync local state when the AuthContext finishes loading the logo
  // ⚡ Sync local state, and allow it to clear if logo becomes null
  useEffect(() => {
    setOrgLogo(organization?.logo_url || null);
  }, [organization?.logo_url]);
  const [allDbApps, setAllDbApps] = useState<any[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true); // ⚡ NEW: Track loading state
  const [globalAddApp, setGlobalAddApp] = useState<{ wsSlug: string, wsId?: string, appName: string } | null>(null);
  const [workspaceAlerts, setWorkspaceAlerts] = useState<any[]>([]);

  // Drag & Drop + Workspace Creation State
  const [orderedWorkspaces, setOrderedWorkspaces] = useState<any[]>([]);
  const [draggedWsIdx, setDraggedWsIdx] = useState<number | null>(null);
  const [draggedOverWsIdx, setDraggedOverWsIdx] = useState<number | null>(null);

  const [showNewWsModal, setShowNewWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDescription, setNewWsDescription] = useState(''); 
  const [newWsColor, setNewWsColor] = useState('cyan');
  const [newWsIcon, setNewWsIcon] = useState('main');

  // ⚡ STAGE 1: PLATFORM OWNER REPLICATION STATE
  const PLATFORM_OWNER_ID = 'c28f0d91-c0df-4092-a2cc-19c860f1824f';
  const isSuperAdmin = organization?.id === PLATFORM_OWNER_ID;
  const [allOrgs, setAllOrgs] = useState<{id: string, name: string}[]>([]);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [autoDeployWorkspace, setAutoDeployWorkspace] = useState(false); // ⚡ NEW STATE

  // ⚡ STAGE 1: FETCH ALL ORGANIZATIONS FOR PLATFORM OWNER
  useEffect(() => {
    const fetchAllOrgs = async () => {
      if (isSuperAdmin && showNewWsModal) {
        try {
          // ⚡ FIX: Call the secure RPC function to bypass RLS restrictions
          const { data, error } = await supabase.rpc('get_all_organizations');
          
          if (error) {
            console.error("Error fetching organizations via RPC:", error);
            return;
          }
          
          if (data && data.length > 0) {
            setAllOrgs(data);
            // Default to at least selecting the current platform owner org
            setSelectedOrgIds([PLATFORM_OWNER_ID]);
          }
        } catch (err) {
          console.error("Caught error fetching orgs:", err);
        }
      }
    };
    
    fetchAllOrgs();
  }, [isSuperAdmin, showNewWsModal]);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!organization?.id) return;
      try {
        const { data } = await supabase.schema('app_private')
          .from('notifications')
          .select('id, metadata')
          .eq('organization_id', organization.id)
          .eq('is_dismissed', false);
        if (data) setWorkspaceAlerts(data);
      } catch (e) {
        console.error('Error fetching workspace alerts:', e);
      }
    };

    const fetchApps = async () => {
      if (!organization?.id) return;
      setIsLoadingApps(true);
      try {
        const { data, error } = await supabase.schema('app_private')
          .from('mini_apps')
          // ⚡ Added organization_id so frontend validation doesn't fail
          .select('id, organization_id, name, slug, workspace_id, icon, schema_definition, display_order')
          .eq('organization_id', organization.id) 
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        
        if (data) {
          // ⚡ No more deduplication map needed! Just set the data directly.
          setAllDbApps(data);
        }
      } catch (err) { 
        console.error('Error fetching apps:', err); 
      } finally {
        setIsLoadingApps(false); 
      }
    };
    
    if (isOpen) {
      fetchAlerts();
      fetchApps();
    }
  }, [isOpen, organization]);

  const isPlatOwner = isPlatformOwner();
  const isOrgAdmin = isOrganizationAdmin();
  const tier = (organization?.subscription_tier || 'basic') as 'basic' | 'pro' | 'expert';
  const tierConfig = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.basic;

  if (!isOpen) return null;

  const toggleWorkspace = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWorkspaces(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  const handleNavigate = (slug: string, miniApp?: string) => {
    onSelectWorkspace(slug, miniApp);
    onClose();
    if (miniApp) {
      navigate(`/workspace/${slug}?app=${encodeURIComponent(miniApp)}`);
    } else {
      navigate(`/workspace/${slug}`);
    }
  };

  const handleAddMiniAppItem = (workspaceSlug: string, miniAppName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const realWs = workspaces?.find(w => w.slug === workspaceSlug);
    // ⚡ REPLICATING THE DASHBOARD: Fallback to the exact mapped UUID if it's a preset
    const targetWsId = realWs?.id || WORKSPACE_ID_MAP[workspaceSlug] || workspaceSlug;
    setGlobalAddApp({ wsSlug: workspaceSlug, wsId: targetWsId, appName: miniAppName });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${organization.id}_logo.${ext}`;
      await supabase.storage.from('organization-logos').upload(fileName, file, { upsert: true });
      const { data: urlData } = supabase.storage.from('organization-logos').getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        await db.from('organization_logos').upsert({
          organization_id: organization.id, logo_url: urlData.publicUrl,
          uploaded_by: (user as any)?.id || (user as any)?.email, updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' });
        await db.from('organizations').update({ logo_url: urlData.publicUrl }).eq('id', organization.id);

        setOrgLogo(urlData.publicUrl);
      }
    } catch (err) { console.error('Logo upload error:', err); }
    finally { setUploadingLogo(false); }
  };

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!organization?.id) return;

      try {
        // 1. Fetch strictly local workspaces (no more WORKSPACE_DEFINITIONS merging!)
        const { data, error } = await supabase.schema('app_private')
          .from('workspaces')
          .select('*')
          .eq('organization_id', organization.id)
          .order('display_order', { ascending: true });

        if (error) throw error;

        if (data) {
          let sortedWs = [...data];
          
          // 2. Apply LocalStorage drag-and-drop order if it exists
          const savedOrderStr = localStorage.getItem(`workspace-order-${organization.id}`);
          if (savedOrderStr) {
            try {
              const savedSlugs = JSON.parse(savedOrderStr) as string[];
              sortedWs.sort((a, b) => {
                let idxA = savedSlugs.indexOf(a.slug);
                let idxB = savedSlugs.indexOf(b.slug);
                if (idxA === -1) idxA = 999 + (a.display_order || 0); 
                if (idxB === -1) idxB = 999 + (b.display_order || 0);
                return idxA - idxB;
              });
            } catch(e) {}
          }
          setOrderedWorkspaces(sortedWs);
        }
      } catch (err) {
        console.error('Error fetching workspaces:', err);
      }
    };

    if (isOpen) {
      fetchWorkspaces();
    }
  }, [isOpen, organization?.id]);

  const handleWsDragStart = (e: React.DragEvent, index: number) => {
    setDraggedWsIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleWsDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOverWsIdx(index);
  };
  
  const handleWsDrop = async (e: React.DragEvent, index: number) => { // ⚡ Made async
    e.preventDefault();
    if (draggedWsIdx === null || draggedWsIdx === index) return;
    
    const newOrdered = [...orderedWorkspaces];
    const [movedItem] = newOrdered.splice(draggedWsIdx, 1);
    newOrdered.splice(index, 0, movedItem);
    
    // Update local UI state immediately
    setOrderedWorkspaces(newOrdered);
    setDraggedWsIdx(null);
    setDraggedOverWsIdx(null);

    // ⚡ FIX 1: Cache the exact order locally so it survives refreshes instantly
    if (organization?.id) {
      const orderSlugs = newOrdered.map(w => w.slug);
      localStorage.setItem(`workspace-order-${organization.id}`, JSON.stringify(orderSlugs));
      
      // ⚡ FIX 2: Write the display_order back to the database!
      try {
        for (let i = 0; i < newOrdered.length; i++) {
          const ws = newOrdered[i];
          
          // Safety guard: Only try to update workspaces owned by this specific org
          // (Unless they are a platform owner, who can edit the global default order)
          if (isPlatformOwner() || ws.organization_id === organization.id) {
            await supabase
              .schema('app_private')
              .from('workspaces')
              .update({ display_order: i })
              .eq('id', ws.id);
          }
        }
      } catch (err) {
        console.error('Error saving workspace order to DB:', err);
      }
    }
  };

  const handleWsDragEnd = () => {
    setDraggedWsIdx(null);
    setDraggedOverWsIdx(null);
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName || !organization?.id) return;
    const newSlug = newWsName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    setIsDeploying(true);
    try {
      // 1. Determine who is getting this workspace
      const targetOrgIds = (isSuperAdmin && selectedOrgIds.length > 0) 
        ? selectedOrgIds 
        : [organization.id];

      // 2. Build the bulk insert payload
      const insertPayload = targetOrgIds.map(orgId => ({
        organization_id: orgId,
        name: newWsName,
        slug: newSlug,
        icon: newWsIcon,
        description: newWsDescription,
        display_order: orderedWorkspaces.length,
        // ⚡ Inject auto_deploy into the settings JSON!
        settings: { auto_deploy: autoDeployWorkspace } 
      }));

      // 3. Fire the bulk insert (Notice we removed .single() so it returns an array)
      const { data, error } = await supabase.schema('app_private')
        .from('workspaces')
        .insert(insertPayload)
        .select();

      if (error) throw error;

      // 4. Find the specific record that was created for the CURRENT organization
      // so we can update the local UI instantly without a refresh.
      const localWsData = data?.find(d => d.organization_id === organization.id);

      if (localWsData) {
        const newWs = {
          id: localWsData.id, 
          organization_id: organization.id, 
          name: localWsData.name, 
          slug: localWsData.slug, 
          description: localWsData.description || '',
          is_visible: localWsData.is_visible, 
          display_order: localWsData.display_order, 
          created_at: localWsData.created_at, 
          updated_at: localWsData.updated_at,
          miniApps: [],
          iconSlug: localWsData.icon || newWsIcon
        };
        
        workspaceColors[newWs.slug] = workspaceColors[newWsColor] || workspaceColors.cyan;
        setOrderedWorkspaces([...orderedWorkspaces, newWs]);
      }
      
      // 5. Reset Modal State
      setShowNewWsModal(false);
      setNewWsName('');
      setNewWsDescription(''); 
      setNewWsIcon('main');
      setSelectedOrgIds(isSuperAdmin ? [PLATFORM_OWNER_ID] : []);

    } catch (err) {
      console.error('Error saving workspace(s) to database:', err);
      alert('Failed to create workspace(s). Check console for details.');
    } finally {
      setIsDeploying(false);
    }
  };

  const extraOrgs = tier === 'expert' ? [
    { id: 'org-2', name: 'Subsidiary Corp' },
    { id: 'org-3', name: 'Regional Office' },
  ] : [];

  const renderWorkspaceCards = () => orderedWorkspaces.map((workspace, index) => {
    const wsColor = getColor(workspace.slug) || workspaceColors.cyan; 
    const isActive = activeWorkspace === workspace.slug;
    const isExpanded = expandedWorkspaces[workspace.slug];
    const isDragOver = draggedOverWsIdx === index && draggedWsIdx !== index;
    
    // 1. Extract tab_order from the database 'settings' field
    let tabOrder: string[] = [];
    if (workspace.settings) {
      try {
        const settingsObj = typeof workspace.settings === 'string' 
          ? JSON.parse(workspace.settings) 
          : workspace.settings;
        if (settingsObj && Array.isArray(settingsObj.tab_order)) {
          tabOrder = settingsObj.tab_order;
        }
      } catch (e) {
        console.warn(`Failed to parse settings for workspace ${workspace.slug}`, e);
      }
    }

    // 2. Build the sorted and deduplicated list of apps
    const sortedApps: any[] = [];
    const seenAppIds = new Set<string>();

    // First, pull in apps exactly as they are ordered in tab_order.
    tabOrder.forEach(itemStr => {
      const app = allDbApps.find(a => 
        a.organization_id === organization?.id &&
        a.workspace_id === workspace.id && 
        (String(a.name).toLowerCase() === String(itemStr).toLowerCase() || String(a.id) === String(itemStr))
      );
      
      if (app && !seenAppIds.has(app.id)) {
        sortedApps.push(app);
        seenAppIds.add(app.id);
      }
    });

    // 3. Catch remaining apps
    // Append any apps officially bound to this workspace in the DB that weren't in the tab_order.
    allDbApps.forEach(app => {
      if (app.organization_id === organization?.id && app.workspace_id === workspace.id && !seenAppIds.has(app.id)) {
        sortedApps.push(app);
        seenAppIds.add(app.id);
      }
    });

    return (
      <div 
        key={workspace.id} 
        className={`relative transition-all duration-200 ${isDragOver ? 'pt-16' : ''}`}
        draggable={isAdmin}
        onDragStart={(e) => handleWsDragStart(e, index)}
        onDragOver={(e) => handleWsDragOver(e, index)}
        onDrop={(e) => handleWsDrop(e, index)}
        onDragEnd={handleWsDragEnd}
      >
        <div className={`relative rounded-xl overflow-hidden transition-all ${draggedWsIdx === index ? 'opacity-40 scale-95' : ''} ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`} style={{
          border: `1.5px solid rgba(${wsColor.rgb}, 0.6)`, 
          backgroundColor: '#000',
          boxShadow: isActive ? `0 0 20px rgba(${wsColor.rgb}, 0.6), inset 0 0 8px rgba(${wsColor.rgb}, 0.1)` : `0 0 8px rgba(${wsColor.rgb}, 0.2)`,
        }}>
          <div className="flex items-center gap-4 p-4">
            <button onClick={() => handleNavigate(workspace.slug)}
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 min-h-[44px]"
            style={{ border: `1px solid rgba(${wsColor.rgb}, 0.6)`, background: 'rgba(0,0,0,0.8)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            title={`Go to ${workspace.name}`}>
            
            <span className="transition-all" style={{ color: wsColor.primary, filter: `drop-shadow(0 0 8px rgba(${wsColor.rgb}, 0.8))` }}>
              <WorkspaceIcon slug={workspace.icon || workspace.slug} size={24} />
            </span>
            
          </button>
          <button onClick={() => handleNavigate(workspace.slug)}
            className="flex-1 text-left hover:opacity-80 transition-opacity min-h-[44px] flex flex-col justify-center"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-medium flex items-center gap-2" style={{ color: wsColor.primary }}>
                  {workspace.name}
                </h3>
                
                {/* ⚡ CONDITIONAL & SUBTLE NOTIFICATION BADGE */}
                {workspaceAlerts.filter(a => a.metadata?.workspace_id === workspace.id).length > 0 && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onClose();
                      window.dispatchEvent(new CustomEvent('openGlobalNotifications'));
                    }}
                    className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[9px] font-bold font-mono rounded-full hover:scale-105 transition-all cursor-pointer animate-pulse"
                    style={{ 
                      backgroundColor: `rgba(${notifRgb}, 0.15)`, 
                      color: notifColor,
                      border: `1px solid rgba(${notifRgb}, 0.5)`,
                      boxShadow: `0 0 8px rgba(${notifRgb}, 0.4)` 
                    }}
                    title="View Notifications"
                  >
                    {workspaceAlerts.filter(a => a.metadata?.workspace_id === workspace.id).length}
                  </div>
                )}
              </div>

              {/* ⚡ THE EXACT DB COUNT OF APPS IN THIS WORKSPACE */}
              <p className="text-gray-500 text-sm mt-0.5 font-mono">
                {sortedApps.length > 0 ? `${sortedApps.length} MiniApps` : 'Coming soon'}
              </p>
          </button>
            {sortedApps.length > 0 && (
              <button onClick={(e) => toggleWorkspace(workspace.slug, e)}
                className="p-2 rounded-lg transition-all hover:bg-gray-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', color: wsColor.primary }}>
                {isExpanded ? <ChevronDownIcon size={20} style={{ filter: `drop-shadow(0 0 8px rgba(${wsColor.rgb}, 0.8))` }} /> : <ChevronRightIcon size={20} />}
              </button>
            )}
          </div>
        </div>
        {isExpanded && sortedApps.length > 0 && (
          <div className="mt-2 ml-6 pl-4 space-y-1 py-2" style={{ borderLeft: `2px solid rgba(${wsColor.rgb}, 0.6)` }}>
            {sortedApps.map((dbApp, idx) => {
              
              // Extract true icon from schema (Just like the dashboard fix!)
              let appIconStr = dbApp.icon;
              if (!appIconStr || appIconStr === 'grid') {
                try {
                  const schema = typeof dbApp.schema_definition === 'string' ? JSON.parse(dbApp.schema_definition) : (dbApp.schema_definition || {});
                  if (schema.icon && schema.icon !== 'grid') appIconStr = schema.icon;
                } catch(e) {}
              }
              
              let MiniAppIcon = getMiniAppIcon(dbApp.name);
              if (appIconStr) {
                const pascalIcon = appIconStr.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                if ((LucideIcons as any)[pascalIcon]) {
                  MiniAppIcon = (LucideIcons as any)[pascalIcon];
                }
              }
              
              return (
                <div key={dbApp.id} className="flex items-center justify-between group">
                  <button onClick={() => handleNavigate(workspace.slug, dbApp.name)}
                    className="flex-1 flex items-center gap-2 p-2 rounded-lg text-left transition-all hover:bg-gray-900/50 min-h-[44px]"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                    
                    <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 transition-transform group-hover:scale-110">
                      <MiniAppIcon 
                        size={14} 
                        style={{ color: wsColor.primary, filter: `drop-shadow(0 0 4px rgba(${wsColor.rgb}, 0.6))` }} 
                      />
                    </div>
                    
                    <span className="text-sm font-mono text-gray-400 group-hover:text-white transition-colors">{dbApp.name}</span>
                    
                    {workspaceAlerts.filter(a => a.metadata?.mini_app_id === dbApp.id).length > 0 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onClose();
                          window.dispatchEvent(new CustomEvent('openGlobalNotifications'));
                        }}
                        className="ml-2 border text-[9px] px-1.5 py-0.5 rounded-full font-bold hover:scale-110 hover:brightness-125 transition-all cursor-pointer animate-pulse flex items-center justify-center min-w-[20px]"
                        style={{
                          backgroundColor: `rgba(${notifRgb}, 0.2)`,
                          borderColor: `rgba(${notifRgb}, 0.5)`,
                          color: notifColor,
                          boxShadow: `0 0 8px rgba(${notifRgb}, 0.8)`
                        }}
                        title="View App Notifications"
                      >
                        {workspaceAlerts.filter(a => a.metadata?.mini_app_id === dbApp.id).length}
                      </div>
                    )}
                  </button>
                  <button onClick={(e) => handleAddMiniAppItem(workspace.slug, dbApp.name, e)}
                    className="p-1.5 rounded-lg transition-all hover:bg-gray-800 opacity-70 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', color: wsColor.primary }}
                    title={`Add new ${dbApp.name} item`}>
                    <PlusIcon size={16} style={{ filter: `drop-shadow(0 0 8px rgba(${wsColor.rgb}, 0.8))` }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  });


  // ==========================================
  // VIEW 1: DOCKED TAB MODE
  // ==========================================
  if (isDocked) {
    const activeDockedPanels = dockedPanels.length > 0 ? dockedPanels : [activePanelId];
    const dockIndex = activeDockedPanels.indexOf(activePanelId);
    const totalDocked = activeDockedPanels.length;
    let tabTop = '50%';
    if (totalDocked === 2) tabTop = dockIndex === 0 ? 'calc(50% - 105px)' : 'calc(50% + 105px)';
    else if (totalDocked === 3) tabTop = dockIndex === 0 ? 'calc(50% - 210px)' : dockIndex === 1 ? '50%' : 'calc(50% + 210px)';
    else if (totalDocked > 3) tabTop = `calc(50% + ${(dockIndex - (totalDocked - 1) / 2) * 210}px)`;

    return (
      <div 
        className="fixed right-0 flex flex-col items-center py-4 bg-black/50 backdrop-blur-sm border-y border-l border-gray-800 rounded-l-xl cursor-pointer hover:bg-black/70 transition-all group shadow-lg"
        style={{ zIndex: 40, top: tabTop, transform: 'translateY(-50%)', width: '48px', height: '200px', borderLeftColor: panelAccentColor, borderLeftWidth: '3px', boxShadow: `0 0 15px rgba(${panelAccentRGB}, 0.2)` }}
        onClick={() => { 
          if (onBringToFront) onBringToFront();
          setIsDocked(false); 
          if (onDockToggle) onDockToggle(activePanelId, false); 
        }} 
        title="Restore Workspaces"
      >
        <button onClick={handleCloseTab} className="absolute top-2 left-2 p-1 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800 bg-black/40" title="Close"><CloseIcon size={12} /></button>
        <div className="mb-3 mt-4" style={{ color: panelAccentColor }}><ApplegateCoreLogo size={20} /></div>
        <span className="text-xs font-mono font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: panelAccentColor }}>WORKSPACES</span>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FULL SLIDE PANEL MODE
  // ==========================================
  return (
    // ⚡ FIX: Hardcoded to 30 so it sits behind the BottomNav (z-40) and properly 
    // stacks with Messages & Activity based on the AppLayout array order!
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 30 }}>
      <div 
        // Changed top-0 to top-16, and h-full to h-[calc(100%-4rem)]
        className="absolute top-16 right-0 h-[calc(100%-4rem)] max-w-[95vw] bg-black border-l transform transition-all duration-300 ease-out animate-slide-in-right flex flex-col pointer-events-auto shadow-[-20px_0_40px_rgba(0,0,0,0.5)]"
        style={{ right: rightPos, width: `${panelWidth}px`, borderColor: `rgba(${panelAccentRGB}, 0.3)` }}
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* INVISIBLE HOVER ANTICIPATION BOX (Extends Left) */}
        {stackIndex > 0 && !isSideBySide && !isExpanded && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-8 w-8 h-64 z-[0]" />
        )}

        {/* THE NEW 2-BUTTON CONTROLS (Straddling Left Edge) */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 z-[110]">
          
          {/* Dock Button */}
          <button 
            onClick={handleDockClick}
            className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)]"
            style={{ borderColor: `rgba(${panelAccentRGB}, 0.4)` }}
            title="Dock as Tab"
          >
            <PopoutIcon size={16} className="rotate-90" /> 
          </button>
          
          {/* Smart Expand/Collapse Chevron */}
          <button 
            onClick={handleExpandClick}
            className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)] text-gray-500 hover:text-white hover:bg-gray-800"
            style={{ borderColor: `rgba(${panelAccentRGB}, 0.4)` }}
            title={isExpanded ? "Collapse Panel" : "Expand Panel"}
          >
            {/* Note: Since this is a Right-side panel, we want it to point Left (rotate-180) to pull it out, and Right (normal) to push it back! */}
            <ChevronRightIcon size={18} className={`transition-transform duration-300 ${isExpanded ? '' : 'rotate-180'}`} /> 
          </button>
        </div>

        {stackIndex > 0 && !isSideBySide && <div className="absolute inset-0 z-[100] cursor-pointer bg-black/10 hover:bg-transparent transition-colors" onClick={onBringToFront} />}
        
        {/* Background effects - Wrapped to prevent bleeding */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom left, rgba(${panelAccentRGB}, 0.15), transparent, rgba(${panelAccentRGB}, 0.05))` }} />
        </div>
        
        {/* Header: Platform Owner = A-CORE, Org = Company Name + Logo */}
        <div 
          onClick={() => setExpandedOrgs(p => ({ ...p, primary: !p.primary }))}
          className="relative flex items-center justify-between p-4 border-b cursor-pointer transition-colors"
          style={{ borderColor: `rgba(${panelAccentRGB}, 0.2)`, background: `linear-gradient(to right, black, rgba(${panelAccentRGB}, 0.1), black)` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation(); 
                onClose();
                navigate('/'); 
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0 text-left"
              title={isPlatOwner ? `Switch to ${organization?.name || 'Applegate'} Primary Dashboard` : "Go to Dashboard"}
            >
              <div className="relative group/logo flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                
                {/* ⚡ FIX: Prioritize the uploaded orgLogo for ALL users, including Platform Owners */}
                {orgLogo ? (
                  <img 
                    src={`${orgLogo}${orgLogo.includes('?') ? '&' : '?'}width=80&height=80&resize=contain`} 
                    alt="" 
                    className="h-10 w-10 rounded-lg object-contain bg-black border relative z-10"
                    style={{ borderColor: `rgba(${panelAccentRGB}, 0.3)` }}
                  />
                ) : isPlatOwner ? (
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-full blur-md opacity-60" style={{ backgroundColor: `rgba(${panelAccentRGB}, 0.2)` }} />
                    <ApplegateCoreLogo size={32} className="relative z-10" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center border" style={{ borderColor: `rgba(${panelAccentRGB}, 0.3)`, backgroundColor: `rgba(${panelAccentRGB}, 0.1)` }}>
                    <OrgIcon size={20} style={{ color: panelAccentColor }} />
                  </div>
                )}

                {/* The hidden file upload overlay */}
                {(isOrgAdmin || isPlatOwner) && (
                  <div onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/70 opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer z-20">
                    {uploadingLogo ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${panelAccentRGB}, 0.3)`, borderTopColor: panelAccentColor }} /> : <UploadIcon size={16} style={{ color: panelAccentColor }} />}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-mono font-bold text-white truncate transition-colors ws-menu-theme-text-hover">
                  {organization?.name || 'Applegate'}
                </h3>
                <p className="text-[10px] text-gray-500 font-mono">
                  {isPlatOwner ? 'CORE Platform' : tierConfig.name}
                </p>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }} 
              className="p-2 text-gray-400 rounded-lg border border-transparent transition-all flex-shrink-0 z-10 ws-menu-theme-text-hover ws-menu-theme-bg-hover ws-menu-theme-border-hover"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Workspace List */}
        <div className="relative p-4 pb-32 overflow-y-auto max-h-[calc(100vh-140px)] darkwave-scrollbar">
          
          <div className="space-y-4">
            
            {/* Primary Organization Workspaces (Collapsible) */}
            {expandedOrgs.primary && (
              <div className="space-y-2 mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                {renderWorkspaceCards()}
                
                {/* New Workspace Button Nested Inside the Organization */}
                {(tier === 'pro' || tier === 'expert') && (isOrgAdmin || isPlatOwner) && (
                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        if (orderedWorkspaces.length >= tierConfig.maxWorkspaces) { 
                          alert(`Max ${tierConfig.maxWorkspaces} workspaces.`); 
                          return; 
                        }
                        setShowNewWsModal(true);
                      }} 
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:bg-gray-800/50 hover:border-gray-500 hover:text-white transition-all shadow-none"
                    >
                      <PlusIcon size={16} className="text-cyan-400" />
                      <span className="text-sm font-mono font-bold">Workspace ({orderedWorkspaces.length}/{tierConfig.maxWorkspaces})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Extra Subsidiary Orgs (Only for Expert Tier) */}
            {tier === 'expert' && extraOrgs.length > 0 && (
              <div className="space-y-4">
                {extraOrgs.map(org => (
                  <div key={org.id}>
                    <div 
                      onClick={() => setExpandedOrgs(p => ({ ...p, [org.id]: !p[org.id] }))}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5 mb-2 cursor-pointer hover:bg-purple-500/10 transition-colors group shadow-[0_0_10px_rgba(168,85,247,0.05)]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); 
                            onClose();
                            navigate('/'); // Changed from window.location.href = '/'
                          }}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0"
                          title={`Switch to ${org.name} Dashboard`}
                        >
                          <div className="h-7 w-7 rounded flex items-center justify-center bg-purple-500/20 border border-purple-500/30">
                            <OrgIcon size={16} className="text-purple-400" />
                          </div>
                          <span className="text-sm font-mono font-bold text-purple-400 truncate hover:underline">
                            {org.name}
                          </span>
                        </button>
                      </div>
                    </div>

                    {expandedOrgs[org.id] && (
                      <div className="ml-3 pl-3 space-y-2 mb-6 border-l border-purple-500/20">
                        {renderWorkspaceCards()}
                      </div>
                    )}
                  </div>
                ))}
                
                {(isOrgAdmin || isPlatOwner) && (
                  <button 
                    onClick={() => { 
                      if (1 + extraOrgs.length >= 12) { 
                        alert('Maximum of 12 organizations reached.'); 
                        return; 
                      } 
                    }} 
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all shadow-[0_0_10px_rgba(0,255,255,0.05)]"
                  >
                    <PlusIcon size={16} />
                    <span className="text-xs font-mono font-bold">Add Organization ({1 + extraOrgs.length}/12)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 border-t bg-black/90" style={{ borderColor: `rgba(${panelAccentRGB}, 0.2)` }}>
          <div className="flex items-center justify-center gap-2 text-gray-600 text-xs font-mono">
            <LockIcon size={14} style={{ color: `rgba(${panelAccentRGB}, 0.5)` }} /><span>Q-CORE Protected</span>
          </div>
        </div>
      </div>

      <style>{`
        /* ... */
        .ws-menu-theme-text-hover:hover { color: ${panelAccentColor} !important; }
        .ws-menu-theme-bg-hover:hover { background-color: rgba(${panelAccentRGB}, 0.1) !important; }
        .ws-menu-theme-border-hover:hover { border-color: rgba(${panelAccentRGB}, 0.3) !important; }
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        @keyframes ws-menu-pulse-security { 0%, 100% { box-shadow: 0 0 12px rgba(255,153,0,0.3); } 50% { box-shadow: 0 0 25px rgba(255,153,0,0.6); } }
      `}</style>
      
      {/* New Workspace Creation Modal */}
      {showNewWsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto">
          {/* Back Overlay: Clicking here closes the modal safely */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onMouseDown={(e) => {
              e.stopPropagation();
              setShowNewWsModal(false);
            }} 
          />
          
          {/* Modal Content: Cyan themed, stops event propagation to keep open */}
          <div 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={(e) => e.stopPropagation()} 
            className="relative z-10 bg-black border border-cyan-500/50 rounded-xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(0,255,255,0.15)] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent rounded-xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3">
                  <PlusIcon size={20} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                  CREATE NEW WORKSPACE
                </h3>
                <button onClick={() => setShowNewWsModal(false)} className="text-gray-500 hover:text-white transition-colors"><CloseIcon size={20} /></button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Workspace Name</label>
                  <input
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all"
                    placeholder="e.g. MARKETING"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Description</label>
                  <textarea 
                    value={newWsDescription}
                    onChange={(e) => setNewWsDescription(e.target.value)}
                    className="w-full h-24 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 font-mono resize-none focus:outline-none focus:border-cyan-500/50 transition-all"
                    placeholder="Describe the workspace's purpose..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Choose an Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { id: 'admin', icon: ShieldIcon },
                      { id: 'accounting', icon: CalculatorIcon },
                      { id: 'personnel', icon: UsersIcon },
                      { id: 'marketing', icon: ApplegateCoreLogo },
                      { id: 'main', icon: HomeIcon },
                      { id: 'data', icon: DatabaseIcon },
                      { id: 'build', icon: BuildIcon },
                      { id: 'security', icon: LockIcon }
                    ].map(icn => (
                      <button
                        key={icn.id}
                        onClick={() => setNewWsIcon(icn.id)}
                        className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                          newWsIcon === icn.id ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'border-gray-800 text-gray-500 hover:bg-gray-900 hover:text-gray-300'
                        }`}
                        title={`Select ${icn.id} icon`}
                      >
                        <icn.icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Select Color</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['cyan', 'green', 'purple', 'fuchsia', 'orange', 'red'].map((color) => {
                      const isSelected = newWsColor === color;
                      const bgColors: Record<string, string> = {
                        cyan: 'bg-cyan-500', green: 'bg-green-500', purple: 'bg-purple-500',
                        fuchsia: 'bg-fuchsia-500', orange: 'bg-orange-500', red: 'bg-red-500'
                      };
                      return (
                        <button
                          key={color}
                          onClick={() => setNewWsColor(color)}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                            isSelected ? 'border-gray-300 bg-white/10 shadow-lg' : 'border-gray-800 hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full ${bgColors[color]} shadow-[0_0_8px_${color}]`} />
                          <span className="text-xs font-mono text-gray-300 capitalize">{color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ⚡ STAGE 1: PLATFORM OWNER DISTRIBUTION PANEL */}
                {isSuperAdmin && (
                  <div className="pt-4 mt-2 border-t border-cyan-500/20">
                    <label className="block text-sm font-mono font-bold text-cyan-400 mb-2 flex items-center gap-2">
                      <ShieldIcon size={16} /> Deploy to Organizations
                    </label>
                    
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={orgSearchQuery}
                      onChange={(e) => setOrgSearchQuery(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 mb-3 focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                    
                    <div className="flex items-center gap-2 mb-3 bg-gray-900/40 p-2 rounded-lg border border-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedOrgIds.length === allOrgs.length && allOrgs.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrgIds(allOrgs.map(o => o.id));
                          } else {
                            // If they uncheck all, at least keep the platform owner's org
                            setSelectedOrgIds([PLATFORM_OWNER_ID]); 
                          }
                        }}
                        className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      />
                      <span className="text-xs text-gray-300 font-mono font-bold">Select All Organizations ({allOrgs.length})</span>
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1 pr-2 darkwave-scrollbar border border-gray-900 rounded-lg p-1">
                      {allOrgs.filter(o => o.name.toLowerCase().includes(orgSearchQuery.toLowerCase())).map(org => (
                        <label key={org.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/80 p-2 rounded-md transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedOrgIds.includes(org.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrgIds(prev => [...prev, org.id]);
                              } else {
                                setSelectedOrgIds(prev => prev.filter(id => id !== org.id));
                              }
                            }}
                            className="w-3.5 h-3.5 accent-cyan-500 cursor-pointer"
                          />
                          <span className={`text-xs font-mono truncate ${org.id === PLATFORM_OWNER_ID ? 'text-cyan-400 font-bold' : 'text-gray-400'}`}>
                            {org.name} {org.id === PLATFORM_OWNER_ID && '(Platform)'}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* ⚡ NEW AUTO DEPLOY TOGGLE */}
                    <div className="flex items-center justify-between mt-3 p-2 bg-black/40 border border-gray-800 rounded-lg">
                      <span className="text-xs font-mono text-gray-300">Auto-deploy to new orgs</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={autoDeployWorkspace} onChange={e => setAutoDeployWorkspace(e.target.checked)} />
                        <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!newWsName.trim() || isDeploying}
                    className="flex-1 py-2.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeploying ? 'DEPLOYING...' : 'CREATE WORKSPACE'}
                  </button>
                  <button onClick={() => setShowNewWsModal(false)} className="text-sm font-mono text-cyan-400 hover:underline">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {globalAddApp && (
        <MiniAppView
          appName={globalAddApp.appName}
          workspaceSlug={globalAddApp.wsSlug as WorkspaceSlug}
          workspaceId={globalAddApp.wsId}
          isAdmin={isAdmin}
          onBack={() => {
            setGlobalAddApp(null);
            onClose(); // ⚡ Instantly close the side panel too!
          }}
          isGlobalAddMode={true}
          onGlobalAddClose={() => {
            setGlobalAddApp(null);
            onClose(); // ⚡ Instantly close the side panel too!
          }}
        />
      )}
    </div>
  );
};

export default WorkspaceMenu;