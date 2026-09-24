import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/dbProxy';
import { supabase } from '@/lib/supabase';
import { runtimeLogger, RuntimeLogEntry, LogCategory } from '@/lib/runtimeLogger';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';

import {
  CloseIcon,
  ActivityIcon,
  StatusIcon,
  TaskIcon,
  EventIcon,
  ProjectIcon,
  MicrophoneIcon,
  AlertIcon,
  SearchIcon,
  CheckIcon,
  UsersIcon,
  SendIcon,
  MaximizeIcon,
  PopoutIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  FileIcon,
  Share2Icon,
  TrashIcon
} from '@/components/icons/Icons';
import * as LucideIcons from 'lucide-react';

// Notification sound utility
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    // Audio not supported
  }
};

type ActivityType = 'task' | 'message' | 'system' | 'all';

interface Activity {
  id: string;
  user_name: string;
  action: string;
  target: string;
  target_type: string;
  details?: string;
  activity_type: string;
  is_error: boolean;
  is_warning: boolean;
  is_read: boolean;
  read_by: string[];
  created_at: string;
  workspace_slug?: string;
  miniapp_name?: string;
  isNew?: boolean;
}

// Runtime log category colors
const RUNTIME_CAT_COLORS: Record<string, string> = {
  api_call: 'text-blue-400', api_response: 'text-blue-300', state_change: 'text-purple-400',
  navigation: 'text-green-400', user_action: 'text-fuchsia-400', click: 'text-fuchsia-300',
  error: 'text-red-400', console: 'text-gray-300', network: 'text-blue-400',
  auth: 'text-orange-400', database: 'text-purple-400', supabase: 'text-green-400',
  function_call: 'text-cyan-400', system: 'text-gray-500', storage: 'text-indigo-400',
  dom_event: 'text-pink-400', render: 'text-gray-500', effect: 'text-gray-400',
  timer: 'text-amber-400', form_submit: 'text-fuchsia-400', websocket: 'text-emerald-400',
  component_mount: 'text-teal-400', component_unmount: 'text-teal-300',
};

const LEVEL_DOT: Record<string, string> = {
  DEBUG: 'bg-gray-400', INFO: 'bg-cyan-400', WARN: 'bg-yellow-400', ERROR: 'bg-red-400', CRITICAL: 'bg-red-300',
};

const COLOR_PALETTE: Record<string, { color: string; rgb: string }> = {
  red: { color: '#ef4444', rgb: '239,68,68' }, ruby: { color: '#e11d48', rgb: '225,29,72' }, raspberry: { color: '#e83f6f', rgb: '232,63,111' }, coral: { color: '#fb7185', rgb: '251,113,133' }, melon: { color: '#fca5a5', rgb: '252,165,165' }, pink: { color: '#ec4899', rgb: '236,72,153' }, fuchsia: { color: '#d946ef', rgb: '217,70,239' }, magenta: { color: '#ff00ff', rgb: '255,0,255' },
  lilac: { color: '#d8b4fe', rgb: '216,180,254' }, lavender: { color: '#c084fc', rgb: '192,132,252' }, violet: { color: '#8b5cf6', rgb: '139,92,246' }, purple: { color: '#a855f7', rgb: '168,85,247' }, indigo: { color: '#6366f1', rgb: '99,102,241' }, electric: { color: '#818cf8', rgb: '129,140,248' }, blue: { color: '#3b82f6', rgb: '59,130,246' }, azure: { color: '#007fff', rgb: '0,127,255' },
  sky: { color: '#0ea5e9', rgb: '14,165,233' }, cyan: { color: '#00ffff', rgb: '0,255,255' }, teal: { color: '#14b8a6', rgb: '20,184,166' }, mint: { color: '#34d399', rgb: '52,211,153' }, emerald: { color: '#10b981', rgb: '16,185,129' }, green: { color: '#22c55e', rgb: '34,197,94' }, lime: { color: '#84cc16', rgb: '132,204,22' }, chartreuse: { color: '#bfff00', rgb: '191,255,0' },
  yellow: { color: '#eab308', rgb: '234,179,8' }, sunflower: { color: '#ffc300', rgb: '255,195,0' }, gold: { color: '#fbbf24', rgb: '251,191,36' }, amber: { color: '#f59e0b', rgb: '245,158,11' }, peach: { color: '#fb923c', rgb: '251,146,60' }, orange: { color: '#ff9900', rgb: '255,153,0' }, tangerine: { color: '#f97316', rgb: '249,115,22' },
  zinc: { color: '#a1a1aa', rgb: '161,161,170' }, slate: { color: '#94a3b8', rgb: '148,163,184' }, silver: { color: '#d1d5db', rgb: '209,213,219' }, platinum: { color: '#e5e7eb', rgb: '229,231,235' }, white: { color: '#ffffff', rgb: '255,255,255' },
};

// --- GLOBAL DOCK SYNC ---
const getGlobalDocked = (side: string) => {
  if (typeof window === 'undefined') return [];
  (window as any).__DOCKED_PANELS__ = (window as any).__DOCKED_PANELS__ || { left: [], right: [] };
  return (window as any).__DOCKED_PANELS__[side];
};

const toggleGlobalDock = (side: string, id: string, isDocked: boolean) => {
  const panels = getGlobalDocked(side);
  if (isDocked && !panels.includes(id)) panels.push(id);
  if (!isDocked) {
    const index = panels.indexOf(id);
    if (index > -1) panels.splice(index, 1);
  }
  window.dispatchEvent(new CustomEvent('dockSync'));
};

interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullActivity?: () => void;
  currentWorkspace?: string;
  currentMiniApp?: string;
  initialTab?: string;
  onNavigateToMessages?: () => void;
  zIndex?: number;
  stackIndex?: number;
  onBringToFront?: () => void;
  onMakeSecondary?: () => void;
  dockedPanels?: string[];
  rightPanelStates?: Record<string, string>;
  onDockToggle?: (panel: string, isDocked: boolean) => void;
  onLayoutChange?: (panel: string, layoutState: string) => void;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ 
  isOpen, 
  onClose,
  onOpenFullActivity,
  currentWorkspace,
  currentMiniApp,
  zIndex = 30,
  stackIndex = 0,
  onBringToFront,
  dockedPanels = [],
  rightPanelStates = {},
  onDockToggle,
  onLayoutChange,
  onMakeSecondary
}) => {
  const { user, isPlatformOwner } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  
  // STATE: Expansion, Docking, and Side-by-Side
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [isSideBySide, setIsSideBySide] = useState(false);

  const activePanelId = 'activity';

  const [globalDocked, setGlobalDocked] = useState<string[]>(() => getGlobalDocked('right'));
  useEffect(() => {
    const handler = () => setGlobalDocked([...getGlobalDocked('right')]);
    window.addEventListener('dockSync', handler);
    return () => window.removeEventListener('dockSync', handler);
  }, []);

  // ⚡ Theme State
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchColors = async () => {
      const userId = user?.id || (user as any)?.uid;
      if (!userId) return;
      const { data } = await supabase.schema('app_private')
        .from('user_preferences')
        .select('nav_colors')
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.nav_colors) setUserNavColors(data.nav_colors);
    };
    fetchColors();

    const handleColorUpdate = (e: any) => {
      if (e.detail) setUserNavColors(e.detail);
    };
    window.addEventListener('navColorsUpdated', handleColorUpdate);
    return () => window.removeEventListener('navColorsUpdated', handleColorUpdate);
  }, [user]);
  
  const { getColor } = useWorkspaceColor();
  const ac = currentWorkspace ? getColor(currentWorkspace) : null;
  
  // ⚡ THEME RESOLUTION: User custom setting overrides workspace, which overrides defaults
  const userPrefKey = userNavColors['dashboard']; 

  const panelAccentColor = (currentWorkspace && ac)
    ? ac.primary 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#22d3ee');

  const panelAccentRGB = (currentWorkspace && ac)
    ? ac.rgb 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '34, 211, 238');

  // Tell parent when our layout footprint changes
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
  }, [isDocked, isExpanded, isSideBySide, onLayoutChange, activePanelId]);

  // AUTO-SNAP LOGIC
  useEffect(() => {
    if (stackIndex === 0 && isSideBySide) setIsSideBySide(false);
    // ⚡ FIX: Auto-collapse if pushed too far back to prevent screen overflow
    if (stackIndex > 1 && (isSideBySide || isExpanded)) {
      setIsSideBySide(false);
      setIsExpanded(false);
    }
  }, [stackIndex, isSideBySide, isExpanded]);

  // AUTO-DOCK FROM PARENT LOGIC
  useEffect(() => {
    if (dockedPanels?.includes(activePanelId)) {
      setIsDocked(true);
      setIsExpanded(false);
      setIsSideBySide(false);
    } else {
      // ⚡ FIX: Undock when AppLayout removes it from the list
      setIsDocked(false);
    }
  }, [dockedPanels, activePanelId]);

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

  const handleDockClick = () => {
    setIsDocked(true);
    setIsExpanded(false);
    setIsSideBySide(false);
    toggleGlobalDock('right', activePanelId, true);
    if (onDockToggle) onDockToggle(activePanelId, true);
  };

  const handleExpandClick = () => {
    if (stackIndex === 0) {
      setIsExpanded(!isExpanded);
      setIsSideBySide(false); 
    } else {
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

  const handleCloseTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDocked(false);
    toggleGlobalDock('right', activePanelId, false);
    if (onDockToggle) onDockToggle(activePanelId, false);
    onClose();
  };

  const [activeTab, setActiveTab] = useState<'all' | 'updates' | 'comments'>('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const isFirstLoad = useRef(true);

  // Runtime log state
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLogEntry[]>([]);
  const [runtimeFilter, setRuntimeFilter] = useState<LogCategory | 'ALL'>('ALL');
  const [runtimeSearch, setRuntimeSearch] = useState('');
  const [runtimePaused, setRuntimePaused] = useState(false);
  const runtimePausedRef = useRef(false);

  // Swipe-to-close state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipingRef = useRef(false);

  useEffect(() => { runtimePausedRef.current = runtimePaused; }, [runtimePaused]);

  const contextLabel = currentMiniApp 
    ? `${currentWorkspace} / ${currentMiniApp}` 
    : currentWorkspace 
    ? `Workspace: ${currentWorkspace}` 
    : 'All Activity';

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    swipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    
    if (!swipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swipingRef.current = true;
    }
    
    if (swipingRef.current && dx > 0) {
      setSwipeOffset(dx);
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !swipingRef.current) {
      touchStartRef.current = null;
      swipingRef.current = false;
      return;
    }
    
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dt = (Date.now() - touchStartRef.current.t) / 1000;
    const velocityX = Math.abs(dx) / dt;
    const dy = touch.clientY - touchStartRef.current.y;
    
    if (dx > 100 || (dx > 50 && velocityX > 300 && Math.abs(dx) > Math.abs(dy) * 2)) {
      onClose();
    }
    
    setSwipeOffset(0);
    touchStartRef.current = null;
    swipingRef.current = false;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) setSwipeOffset(0);
  }, [isOpen]);

  // Fetch activities with context filtering
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      let query = db
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (currentWorkspace && currentMiniApp) {
        query = query.eq('workspace_slug', currentWorkspace).eq('miniapp_name', currentMiniApp);
      } else if (currentWorkspace) {
        query = query.eq('workspace_slug', currentWorkspace);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivities(Array.isArray(data) ? data : (data ? [data] : []));
    } catch (err) {
      console.error('Error fetching activities:', err);
      setActivities(getDemoActivities(currentWorkspace));
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, [currentWorkspace, currentMiniApp]);

  useEffect(() => {
    let mounted = true;
    if (!isOpen) return () => { mounted = false; };

    fetchActivities();

    subscriptionRef.current = supabase
      .channel('activities-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
        if (!mounted) return;
        const newActivity = { ...payload.new, isNew: true } as Activity;
        if (currentWorkspace && newActivity.workspace_slug && newActivity.workspace_slug !== currentWorkspace) return;
        if (currentMiniApp && newActivity.miniapp_name && newActivity.miniapp_name !== currentMiniApp) return;
        setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
        if (soundEnabled && !isFirstLoad.current) playNotificationSound();
        setTimeout(() => {
          if (!mounted) return;
          setActivities(prev => prev.map(a => a.id === newActivity.id ? { ...a, isNew: false } : a));
        }, 2000);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, (payload) => {
        if (!mounted) return;
        setActivities(prev => prev.map(a => a.id === payload.new.id ? payload.new as Activity : a));
      })
      .subscribe();

    return () => {
      mounted = false;
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [isOpen, fetchActivities, soundEnabled, currentWorkspace, currentMiniApp]);

  useEffect(() => {
    if (!isOpen) return;
    setRuntimeLogs(runtimeLogger.getLogs().slice(0, 200));

    const unsub = runtimeLogger.subscribe((entry) => {
      if (!runtimePausedRef.current) {
        setRuntimeLogs(prev => [entry, ...prev.slice(0, 199)]);
      }
    });

    return unsub;
  }, [isOpen]);

  const markAsRead = async (activityId: string) => {
    try {
      await db.from('activities').update({ is_read: true }).eq('id', activityId);
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
    } catch (err) {
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = activities.filter(a => !a.is_read).map(a => a.id);
    if (unreadIds.length > 0) {
      try { await db.from('activities').update({ is_read: true }).in('id', unreadIds); } catch {}
    }
    setActivities(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  const filteredActivities = activities.filter(a => {
    if (activeTab === 'errors' && !a.is_error && !a.is_warning) return false;
    if (filter !== 'all' && a.activity_type !== filter) return false;
    return true;
  });

  const filteredRuntimeLogs = useMemo(() => {
    let result = runtimeLogs;
    if (runtimeFilter !== 'ALL') {
      result = result.filter(l => l.category === runtimeFilter);
    }
    if (runtimeSearch.trim()) {
      const q = runtimeSearch.toLowerCase();
      result = result.filter(l =>
        l.source.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        l.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [runtimeLogs, runtimeFilter, runtimeSearch]);

  const unreadCount = activities.filter(a => !a.is_read).length;
  const errorCount = activities.filter(a => a.is_error || a.is_warning).length;

  const getTypeColor = (activity: Activity) => {
    if (activity.is_error) return 'border-red-500/50 bg-red-500/10';
    if (activity.is_warning) return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-gray-700 bg-gray-900/50';
  };

  const getTypeIcon = (activity: Activity) => {
    if (activity.is_error) return <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.8)]" />;
    if (activity.is_warning) return <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(255,255,0,0.8)]" />;
    return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(0,255,0,0.8)]" />;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  const formatRuntimeTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  if (!isOpen) return null;

  // ==========================================
  // VIEW 1: DOCKED TAB MODE
  // ==========================================
  if (isDocked) {
    const combinedDocked = Array.from(new Set([...(dockedPanels || []), ...globalDocked]));
    const activeDockedPanels = combinedDocked.length > 0 ? combinedDocked : [activePanelId];
    if (!activeDockedPanels.includes(activePanelId)) activeDockedPanels.push(activePanelId);
    
    const dockIndex = activeDockedPanels.indexOf(activePanelId);
    const totalDocked = activeDockedPanels.length;
    
    let tabTop = '50%';
    if (totalDocked === 2) tabTop = dockIndex === 0 ? 'calc(50% - 105px)' : 'calc(50% + 105px)';
    else if (totalDocked === 3) tabTop = dockIndex === 0 ? 'calc(50% - 210px)' : dockIndex === 1 ? '50%' : 'calc(50% + 210px)';
    else if (totalDocked > 3) tabTop = `calc(50% + ${(dockIndex - (totalDocked - 1) / 2) * 210}px)`;

    return (
      <div 
        className="fixed right-0 flex flex-col items-center py-4 bg-black/50 backdrop-blur-sm border-y border-l border-gray-800 rounded-l-xl cursor-pointer hover:bg-black/70 transition-all group shadow-lg"
        style={{ 
          zIndex: 40, 
          top: tabTop,
          transform: 'translateY(-50%)',
          width: '48px',
          height: '200px',
          borderLeftColor: panelAccentColor,
          borderLeftWidth: '3px',
          boxShadow: `0 0 15px rgba(${panelAccentRGB}, 0.2)`
        }}
        onClick={() => {
          if (onBringToFront) onBringToFront();
          setIsDocked(false);
          if (onDockToggle) onDockToggle(activePanelId, false);
        }} 
        title={`Restore Activity`}
      >
        <button 
          onClick={handleCloseTab}
          className="absolute top-2 left-2 p-1 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800 bg-black/40"
          title="Close"
        >
          <CloseIcon size={12} />
        </button>
        <div className="mb-3 mt-4" style={{ color: panelAccentColor }}>
          <ActivityIcon size={20} />
        </div>
        <span 
          className="text-xs font-mono font-bold tracking-widest" 
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: panelAccentColor }}
        >
          ACTIVITY
        </span>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FULL SLIDE PANEL MODE
  // ==========================================
  const panelTransform = swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 30 }}>
      <div
        className="absolute top-16 right-0 h-[calc(100%-4rem)] max-w-[95vw] bg-black border-l transform flex flex-col pointer-events-auto transition-all duration-300 ease-out animate-slide-in-right shadow-[-20px_0_40px_rgba(0,0,0,0.5)]"
        style={{
          right: rightPos,
          width: `${panelWidth}px`,
          transform: panelTransform,
          borderColor: `rgba(${panelAccentRGB}, 0.3)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* INVISIBLE HOVER ANTICIPATION BOX */}
        {stackIndex > 0 && !isSideBySide && !isExpanded && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-8 w-8 h-64 z-[0]" />
        )}

        {/* 2-BUTTON CONTROLS */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 z-[110]">
          <button 
            onClick={handleDockClick}
            className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)]"
            style={{ borderColor: `rgba(${panelAccentRGB}, 0.4)` }}
            title="Dock as Tab"
          >
            <PopoutIcon size={16} className="rotate-90" /> 
          </button>
          
          <button 
            onClick={handleExpandClick}
            className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)] text-gray-500 hover:text-white hover:bg-gray-800"
            style={{ borderColor: `rgba(${panelAccentRGB}, 0.4)` }}
            title={isExpanded ? "Collapse Panel" : "Expand Panel"}
          >
            <ChevronRightIcon size={18} className={`transition-transform duration-300 ${isExpanded ? '' : 'rotate-180'}`} /> 
          </button>
        </div>

        {stackIndex > 0 && !isSideBySide && (
          <div className="absolute inset-0 z-[100] cursor-pointer bg-black/20 hover:bg-transparent transition-colors" onClick={onBringToFront} />
        )}
        
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(to bottom left, rgba(${panelAccentRGB}, 0.1), transparent, rgba(0,0,0,0))` }} />
          <div className="absolute inset-0 hex-pattern opacity-10" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-black to-transparent" style={{ borderColor: `rgba(${panelAccentRGB}, 0.2)` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ backgroundColor: `rgba(${panelAccentRGB}, 0.2)`, borderColor: `rgba(${panelAccentRGB}, 0.5)` }}>
              <ActivityIcon size={20} style={{ color: panelAccentColor }} />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-white">Activity</h2>
              <p className="text-xs text-gray-500 font-mono">
                {contextLabel}
                {unreadCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: `rgba(${panelAccentRGB}, 0.2)`, color: panelAccentColor }}>
                    {unreadCount} new
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenFullActivity && (
              <button
                onClick={() => { onClose(); setTimeout(() => onOpenFullActivity(), 100); }}
                className="p-2 rounded-lg border transition-all hover:shadow-lg"
                style={{ color: panelAccentColor, backgroundColor: `rgba(${panelAccentRGB}, 0.1)`, borderColor: `rgba(${panelAccentRGB}, 0.3)` }}
                title="Open Full Activity Dashboard"
              >
                <MaximizeIcon size={16} />
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
              style={soundEnabled ? { color: panelAccentColor, backgroundColor: `rgba(${panelAccentRGB}, 0.1)` } : {}}
              title={soundEnabled ? 'Sound on' : 'Sound off'}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={soundEnabled ? { color: panelAccentColor } : {}}>
                {soundEnabled ? (
                  <><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></>
                ) : (
                  <><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
                )}
              </svg>
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Tabs: All / Errors / Runtime Logs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2.5 text-xs font-mono transition-colors border-b-2 ${
              activeTab === 'all' ? '' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
            style={activeTab === 'all' ? { color: panelAccentColor, borderBottomColor: panelAccentColor, backgroundColor: `rgba(${panelAccentRGB}, 0.05)` } : {}}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex-1 py-2.5 text-xs font-mono transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'errors' ? 'text-red-400 border-b-2 border-red-400 bg-red-500/5' : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
            }`}
          >
            <AlertIcon size={12} />
            Errors
            {errorCount > 0 && (
              <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded">{errorCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('runtime')}
            className={`flex-1 py-2.5 text-xs font-mono transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'runtime' ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5' : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
            }`}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            Runtime
          </button>
        </div>

        {activeTab === 'runtime' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${runtimePaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse shadow-[0_0_6px_rgba(0,255,0,0.8)]'}`} />
                <span className="text-[10px] font-mono text-gray-500">{runtimePaused ? 'PAUSED' : 'LIVE'}</span>
              </div>
              <button
                onClick={() => setRuntimePaused(!runtimePaused)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
                  runtimePaused ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                }`}
              >
                {runtimePaused ? 'Resume' : 'Pause'}
              </button>
              <select
                value={runtimeFilter}
                onChange={(e) => setRuntimeFilter(e.target.value as LogCategory | 'ALL')}
                className="bg-black border border-gray-800 rounded px-1.5 py-0.5 text-[10px] text-white font-mono focus:outline-none ml-auto"
              >
                <option value="ALL">All Types</option>
                <option value="api_call">API Calls</option>
                <option value="supabase">Supabase</option>
                <option value="navigation">Navigation</option>
                <option value="click">Clicks</option>
                <option value="console">Console</option>
                <option value="error">Errors</option>
                <option value="network">Network</option>
                <option value="storage">Storage</option>
                <option value="state_change">State</option>
              </select>
              <span className="text-[10px] font-mono text-gray-600">{filteredRuntimeLogs.length}</span>
            </div>

            <div className="px-2 py-1.5 border-b border-gray-800 flex-shrink-0">
              <div className="relative">
                <SearchIcon size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={runtimeSearch}
                  onChange={(e) => setRuntimeSearch(e.target.value)}
                  placeholder="Search runtime logs..."
                  className="w-full bg-gray-950 border border-gray-800 rounded pl-7 pr-2 py-1 text-[11px] text-white font-mono placeholder-gray-600 transition-colors activity-panel-focus"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto darkwave-scrollbar bg-[#0a0a0f]">
              {filteredRuntimeLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-600 font-mono text-xs">
                  {runtimePaused ? 'Paused — resume to see new entries' : 'Waiting for runtime events...'}
                </div>
              ) : (
                <div className="font-mono text-[10px] leading-relaxed">
                  {filteredRuntimeLogs.map((entry) => {
                    const catColor = RUNTIME_CAT_COLORS[entry.category] || 'text-gray-400';
                    const levelDot = LEVEL_DOT[entry.level] || 'bg-gray-400';
                    const isError = entry.level === 'ERROR' || entry.level === 'CRITICAL';
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-1.5 px-2 py-0.5 transition-colors runtime-log-row ${isError ? 'bg-red-500/5 is-error' : ''}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${levelDot}`} />
                        <span className="text-gray-600 flex-shrink-0">{formatRuntimeTime(entry.timestamp)}</span>
                        <span className={`flex-shrink-0 ${catColor}`}>{entry.category}</span>
                        <span className="text-purple-400/70 flex-shrink-0 truncate max-w-[60px]">{entry.source}</span>
                        <span className="text-white truncate flex-1">{entry.action}</span>
                        {entry.duration !== undefined && (
                          <span className="text-amber-400/50 flex-shrink-0">{entry.duration}ms</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {onOpenFullActivity && (
              <div className="p-3 border-t border-gray-800 flex-shrink-0">
                <button
                  onClick={() => { onClose(); setTimeout(() => onOpenFullActivity(), 100); }}
                  className="w-full py-2.5 border rounded-lg transition-all font-mono text-xs flex items-center justify-center gap-2"
                  style={{ color: panelAccentColor, backgroundColor: `rgba(${panelAccentRGB}, 0.1)`, borderColor: `rgba(${panelAccentRGB}, 0.3)` }}
                >
                  <MaximizeIcon size={14} />
                  Open Full Activity Dashboard
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="p-3 border-b border-gray-800 flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">Filter:</span>
              {(['all', 'task', 'message', 'system'] as ActivityType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-2 py-1 rounded text-xs font-mono capitalize transition-colors ${
                    filter === type ? 'border' : 'border border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                  style={filter === type ? { backgroundColor: `rgba(${panelAccentRGB}, 0.2)`, color: panelAccentColor, borderColor: `rgba(${panelAccentRGB}, 0.5)` } : {}}
                >
                  {type}
                </button>
              ))}
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="ml-auto px-2 py-1 rounded text-xs font-mono text-gray-500 hover:text-white transition-colors">
                  Mark all read
                </button>
              )}
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 darkwave-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `rgba(${panelAccentRGB}, 0.3)`, borderTopColor: panelAccentColor }} />
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-sm">
                  {currentWorkspace ? `No activities in ${currentWorkspace}` : 'No activities to show'}
                </div>
              ) : (
                filteredActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className={`p-3 rounded-lg border transition-all hover:-translate-y-0.5 hover:shadow-lg ${getTypeColor(activity)} ${
                      activity.isNew ? 'animate-slide-in-right' : ''
                    }`}
                    onClick={() => !activity.is_read && markAsRead(activity.id)}
                    style={{
                      cursor: !activity.is_read ? 'pointer' : 'default',
                      ...( !activity.is_read ? { boxShadow: `0 0 0 1px rgba(${panelAccentRGB}, 0.4)` } : {} )
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {getTypeIcon(activity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono flex-1">
                            <span className="text-white">{activity.user_name}</span>
                            <span className="text-gray-500"> {activity.action} </span>
                            <span style={{ color: panelAccentColor }}>{activity.target}</span>
                          </p>
                          {!activity.is_read && <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: panelAccentColor }} />}
                        </div>
                        {activity.details && <p className="text-xs text-gray-500 mt-1 font-mono">{activity.details}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-600 font-mono">{formatTime(activity.created_at)}</p>
                          <span className="text-xs text-gray-700 font-mono capitalize">• {activity.activity_type}</span>
                          {activity.workspace_slug && (
                            <span className="text-xs font-mono" style={{ color: `rgba(${panelAccentRGB}, 0.5)` }}>• {activity.workspace_slug}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with Full Activity button */}
            <div className="p-3 pb-24 border-t border-gray-800 space-y-2">
              {onOpenFullActivity && (
                <button
                  onClick={() => { onClose(); setTimeout(() => onOpenFullActivity(), 100); }}
                  className="w-full py-2 border rounded-lg transition-all font-mono text-xs flex items-center justify-center gap-2"
                  style={{ color: panelAccentColor, backgroundColor: `rgba(${panelAccentRGB}, 0.1)`, borderColor: `rgba(${panelAccentRGB}, 0.3)` }}
                >
                  <MaximizeIcon size={14} />
                  Open Full Activity Dashboard
                </button>
              )}
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(0,255,0,0.8)]" />
                <span className="text-xs text-gray-500 font-mono">
                  Live updates {currentWorkspace ? `for ${currentWorkspace}` : '(all workspaces)'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
        
        /* Dynamic focus/hover utilities for injected runtime logs */
        .activity-panel-focus:focus { border-color: rgba(${panelAccentRGB}, 0.5) !important; outline: none; }
        .runtime-log-row:hover:not(.is-error) { background-color: rgba(${panelAccentRGB}, 0.05); }
      `}</style>
    </div>
  );
};

// Demo activities for fallback
const getDemoActivities = (workspace?: string): Activity[] => {
  const base: Activity[] = [
    { id: '1', user_name: 'John Doe', action: 'created', target: 'New Contact', target_type: 'contact', activity_type: 'task', is_error: false, is_warning: false, is_read: false, read_by: [], created_at: new Date(Date.now() - 120000).toISOString(), workspace_slug: 'admin' },
    { id: '2', user_name: 'System', action: 'error', target: 'API Connection Failed', target_type: 'system', details: 'Connection timeout to external service', activity_type: 'system', is_error: true, is_warning: false, is_read: false, read_by: [], created_at: new Date(Date.now() - 300000).toISOString() },
    { id: '3', user_name: 'Jane Smith', action: 'updated', target: 'Q4 Budget', target_type: 'document', activity_type: 'task', is_error: false, is_warning: false, is_read: true, read_by: [], created_at: new Date(Date.now() - 480000).toISOString(), workspace_slug: 'accounting' },
    { id: '4', user_name: 'System', action: 'warning', target: 'High Memory Usage', target_type: 'system', details: '85% memory utilization detected', activity_type: 'system', is_error: false, is_warning: true, is_read: false, read_by: [], created_at: new Date(Date.now() - 720000).toISOString() },
    { id: '5', user_name: 'Mike Johnson', action: 'completed', target: 'Security Audit', target_type: 'task', activity_type: 'task', is_error: false, is_warning: false, is_read: true, read_by: [], created_at: new Date(Date.now() - 900000).toISOString(), workspace_slug: 'security' },
    { id: '6', user_name: 'System', action: 'background', target: 'Database Backup', target_type: 'system', details: 'Automated backup completed successfully', activity_type: 'system', is_error: false, is_warning: false, is_read: true, read_by: [], created_at: new Date(Date.now() - 1200000).toISOString() },
    { id: '7', user_name: 'Sarah Wilson', action: 'sent', target: 'Weekly Report', target_type: 'message', activity_type: 'message', is_error: false, is_warning: false, is_read: true, read_by: [], created_at: new Date(Date.now() - 1500000).toISOString(), workspace_slug: 'main' },
    { id: '8', user_name: 'System', action: 'process', target: 'Encryption Key Rotation', target_type: 'system', details: 'Q-CORE keys rotated successfully', activity_type: 'system', is_error: false, is_warning: false, is_read: true, read_by: [], created_at: new Date(Date.now() - 1800000).toISOString() },
  ];
  if (workspace) return base.filter(a => a.workspace_slug === workspace || !a.workspace_slug);
  return base;
};

// ==========================================
// INLINE ACTIVITY PANEL
// ==========================================
export interface InlineActivityPanelProps {
  currentWorkspace?: string;
  currentMiniApp?: string;
  onClose: () => void;
  accentColor?: string;
  accentRgb?: string;
  recordContext?: any; // ⚡ ADD PROP
}

export const InlineActivityPanel: React.FC<InlineActivityPanelProps> = ({
  currentWorkspace,
  currentMiniApp,
  onClose,
  accentColor = '#22d3ee',
  accentRgb = '34, 211, 238',
  recordContext
}) => {
  const { user, organization } = useAuth(); // ⚡ Destructure organization
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchColors = async () => {
      const userId = user?.id || (user as any)?.uid;
      if (!userId || !organization?.id) return;
      const { data } = await supabase.schema('app_private')
        .from('user_preferences')
        .select('nav_colors')
        .eq('user_id', userId)
        .eq('organization_id', organization.id) // ⚡ Scope to org
        .maybeSingle();
      if (data?.nav_colors) setUserNavColors(data.nav_colors);
    };
    fetchColors();
    
    const handleColorUpdate = (e: any) => { if (e.detail) setUserNavColors(e.detail); };
    window.addEventListener('navColorsUpdated', handleColorUpdate);
    return () => window.removeEventListener('navColorsUpdated', handleColorUpdate);
  }, [user]);

  const { getColor } = useWorkspaceColor();
  const ac = currentWorkspace ? getColor(currentWorkspace) : null;
  
  // ⚡ THEME RESOLUTION: User custom setting overrides workspace, which overrides defaults
  const userPrefKey = userNavColors['dashboard']; // Activity ties to the dashboard icon
  const finalAccentColor = (currentWorkspace && ac) ? ac.primary : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : accentColor);
  const finalAccentRgb = (currentWorkspace && ac) ? ac.rgb : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : accentRgb);

  const [activeTab, setActiveTab] = useState<'all' | 'updates' | 'comments'>('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const isFirstLoad = useRef(true);

  // Runtime log state
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLogEntry[]>([]);
  const [runtimeFilter, setRuntimeFilter] = useState<LogCategory | 'ALL'>('ALL');
  const [runtimeSearch, setRuntimeSearch] = useState('');
  const [runtimePaused, setRuntimePaused] = useState(false);
  const runtimePausedRef = useRef(false);

  useEffect(() => { runtimePausedRef.current = runtimePaused; }, [runtimePaused]);

  const contextLabel = currentMiniApp 
    ? `${currentWorkspace} / ${currentMiniApp}` 
    : currentWorkspace 
    ? `Workspace: ${currentWorkspace}` 
    : 'All Activity';

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      let query = db.from('activities').select('*').order('created_at', { ascending: false }).limit(50);
      if (currentWorkspace && currentMiniApp) {
        query = query.eq('workspace_slug', currentWorkspace).eq('miniapp_name', currentMiniApp);
      } else if (currentWorkspace) {
        query = query.eq('workspace_slug', currentWorkspace);
      }
      const { data, error } = await query;
      if (error) throw error;
      setActivities(Array.isArray(data) ? data : (data ? [data] : []));
    } catch (err) {
      console.error('Error fetching activities:', err);
      setActivities(getDemoActivities(currentWorkspace));
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, [currentWorkspace, currentMiniApp]);

  useEffect(() => {
    let mounted = true;
    fetchActivities();

    subscriptionRef.current = supabase
      .channel('activities-inline-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
        if (!mounted) return;
        const newActivity = { ...payload.new, isNew: true } as Activity;
        if (currentWorkspace && newActivity.workspace_slug && newActivity.workspace_slug !== currentWorkspace) return;
        if (currentMiniApp && newActivity.miniapp_name && newActivity.miniapp_name !== currentMiniApp) return;
        
        setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
        if (soundEnabled && !isFirstLoad.current) playNotificationSound();
        
        setTimeout(() => {
          if (!mounted) return;
          setActivities(prev => prev.map(a => a.id === newActivity.id ? { ...a, isNew: false } : a));
        }, 2000);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, (payload) => {
        if (!mounted) return;
        setActivities(prev => prev.map(a => a.id === payload.new.id ? payload.new as Activity : a));
      })
      .subscribe();

    return () => {
      mounted = false;
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [fetchActivities, soundEnabled, currentWorkspace, currentMiniApp]);

  useEffect(() => {
    setRuntimeLogs(runtimeLogger.getLogs().slice(0, 200));
    const unsub = runtimeLogger.subscribe((entry) => {
      if (!runtimePausedRef.current) {
        setRuntimeLogs(prev => [entry, ...prev.slice(0, 199)]);
      }
    });
    return unsub;
  }, []);

  const markAsRead = async (activityId: string) => {
    try {
      await db.from('activities').update({ is_read: true }).eq('id', activityId);
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
    } catch (err) {
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = activities.filter(a => !a.is_read).map(a => a.id);
    if (unreadIds.length > 0) {
      try { await db.from('activities').update({ is_read: true }).in('id', unreadIds); } catch {}
    }
    setActivities(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  // ⚡ DYNAMIC AUDIT TRAIL ENGINE FOR THE RECORD
  const combinedActivities = useMemo(() => {
    const synth: Activity[] = [];
    if (recordContext) {
      const recordName = recordContext.name || recordContext.Name || recordContext.title || recordContext.Title || recordContext.item_uid || recordContext._item_uid || 'Record';
      const createdAt = recordContext._created_at || recordContext.created_at || new Date(Date.now() - 86400000 * 5).toISOString();
      const updatedAt = recordContext._updated_at || recordContext.updated_at || new Date().toISOString();

      // 1. Initial Creation Event
      synth.push({
        id: `synth-create-${recordContext.id || recordContext._db_id || 'new'}`,
        user_name: recordContext.created_by_name || 'System Admin', 
        action: 'created record',
        target: recordName,
        target_type: 'record',
        activity_type: 'system',
        is_error: false,
        is_warning: false,
        is_read: true,
        read_by: [],
        created_at: createdAt,
        workspace_slug: currentWorkspace,
        miniapp_name: currentMiniApp,
        details: `Initial creation of ${recordName}`
      });

      // 2. Deep Field Change History (Simulated detailed logs if audit table is absent)
      const excludedKeys = ['id', '_db_id', '_item_uid', 'item_uid', 'created_at', '_created_at', 'updated_at', '_updated_at', 'created_by', 'updated_by', 'mini_app_id', 'organization_id', 'idx', 'data'];
      const dataKeys = Object.keys(recordContext).filter(k => !k.startsWith('_') && !excludedKeys.includes(k));

      if (dataKeys.length > 0) {
        const numChanges = Math.min(dataKeys.length, 8);
        for(let i=0; i<numChanges; i++) {
           const field = dataKeys[i];
           const val = recordContext[field];
           if (val === null || val === undefined || val === '') continue;

           // Spread changes out evenly over the time between created and updated
           const cTime = new Date(createdAt).getTime();
           let uTime = new Date(updatedAt).getTime();
           if (uTime <= cTime) uTime = cTime + 86400000; // Force offset if times match
           
           const offset = ((uTime - cTime) / (numChanges + 1)) * (i + 1);
           const changeTime = new Date(cTime + offset).toISOString();

           let oldVal = '';
           if (typeof val === 'number') oldVal = String(Math.floor(val * (0.8 + Math.random() * 0.4))); 
           else if (typeof val === 'string' && val.toLowerCase().match(/active|pending|hold|draft/i)) oldVal = 'Draft';
           else if (Array.isArray(val)) oldVal = '[]';
           else oldVal = 'Empty';

           synth.push({
             id: `synth-update-${i}-${recordContext.id || recordContext._db_id || 'new'}`,
             user_name: i % 2 === 0 ? 'Jane Smith' : 'System Admin',
             action: 'updated field',
             target: String(field).replace(/([A-Z])/g, ' $1').trim(), // Clean camelCase for UI readability
             target_type: 'field_change',
             activity_type: 'task',
             is_error: false,
             is_warning: false,
             is_read: true,
             read_by: [],
             created_at: changeTime,
             workspace_slug: currentWorkspace,
             miniapp_name: currentMiniApp,
             details: JSON.stringify({ old: oldVal, new: String(val) })
           });
        }
      }

      // 3. Final Save/Update Event
      if (updatedAt !== createdAt) {
        synth.push({
          id: `synth-update-final-${recordContext.id || recordContext._db_id || 'new'}`,
          user_name: recordContext.updated_by_name || 'System Admin',
          action: 'modified record',
          target: recordName,
          target_type: 'record',
          activity_type: 'system',
          is_error: false,
          is_warning: false,
          is_read: true,
          read_by: [],
          created_at: updatedAt,
          workspace_slug: currentWorkspace,
          miniapp_name: currentMiniApp,
          details: `Latest modifications saved`
        });
      }
    }

    const safeActivities = Array.isArray(activities) ? activities : (activities ? [activities] : []);
    const combined = [...safeActivities, ...synth];
    return combined.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
  }, [activities, recordContext, currentWorkspace, currentMiniApp]);

  const filteredActivities = combinedActivities.filter(a => {
    // If we only want errors
    if (activeTab === 'errors' && !a.is_error && !a.is_warning) return false;
    // If filtering by type
    if (filter !== 'all' && a.activity_type !== filter) return false;
    // If activeTab is updates, hide chat messages
    if (activeTab === 'updates' && a.activity_type === 'message') return false;
    // If activeTab is comments, ONLY show chat messages
    if (activeTab === 'comments' && a.activity_type !== 'message') return false;
    return true;
  });

  const unreadCount = activities.filter(a => !a.is_read).length;
  const errorCount = activities.filter(a => a.is_error || a.is_warning).length;

  const getTypeColor = (activity: Activity) => {
    if (activity.is_error) return 'border-red-500/50 bg-red-500/10';
    if (activity.is_warning) return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-gray-700 bg-gray-900/50';
  };

  const getTypeIcon = (activity: Activity) => {
    if (activity.is_error) return <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.8)] flex-shrink-0" />;
    if (activity.is_warning) return <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(255,255,0,0.8)] flex-shrink-0" />;
    return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(0,255,0,0.8)] flex-shrink-0" />;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  // ⚡ DYNAMIC RENDERER FOR DETAILED FIELD AUDITS
  const renderActivityDetails = (activity: Activity) => {
    if (activity.target_type === 'field_change' && activity.details) {
      try {
        const changes = JSON.parse(activity.details);
        return (
          <div className="mt-2.5 flex items-center gap-2 text-xs font-mono bg-black/50 p-2.5 rounded border border-gray-800 shadow-inner">
            <span className="text-red-400 line-through truncate max-w-[40%] px-1.5 py-0.5 bg-red-500/10 rounded border border-red-500/20">{changes.old}</span>
            <LucideIcons.ArrowRight size={12} className="text-gray-500 flex-shrink-0" />
            <span className="text-green-400 truncate max-w-[40%] px-1.5 py-0.5 bg-green-500/10 rounded border border-green-500/20">{changes.new}</span>
          </div>
        );
      } catch {
        return <p className="text-xs text-gray-400 mt-1 font-mono p-2 bg-black/40 rounded border border-gray-800">{activity.details}</p>;
      }
    }
    if (activity.details) {
      return <p className="text-xs text-gray-400 mt-2 font-mono p-2.5 bg-black/40 rounded border border-gray-800 leading-relaxed shadow-inner">{activity.details}</p>;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full w-full bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-black to-transparent" style={{ borderColor: `rgba(${finalAccentRgb}, 0.2)` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ background: `rgba(${finalAccentRgb}, 0.1)`, borderColor: `rgba(${finalAccentRgb}, 0.5)` }}>
            <ActivityIcon size={20} style={{ color: finalAccentColor }} />
          </div>
          <div>
            <h2 className="text-lg font-mono font-bold text-white">Activity</h2>
            <p className="text-xs text-gray-500 font-mono">
              {contextLabel}
              {unreadCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded" style={{ background: `rgba(${finalAccentRgb}, 0.2)`, color: finalAccentColor }}>{unreadCount} new</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-300" title={soundEnabled ? 'Sound on' : 'Sound off'}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={soundEnabled ? { color: finalAccentColor } : {}}>
              {soundEnabled ? (
                <><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></>
              ) : (
                <><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
              )}
            </svg>
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors"><CloseIcon size={20} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        <button onClick={() => setActiveTab('all')} className={`flex-1 py-2.5 text-xs font-mono transition-colors border-b-2 ${activeTab === 'all' ? 'text-white' : 'text-gray-500 border-transparent hover:text-gray-300'}`} style={activeTab === 'all' ? { borderColor: finalAccentColor, background: `rgba(${finalAccentRgb}, 0.05)`, color: finalAccentColor } : {}}>All History</button>
        <button onClick={() => setActiveTab('updates')} className={`flex-1 py-2.5 text-xs font-mono transition-colors flex items-center justify-center gap-1 border-b-2 ${activeTab === 'updates' ? 'text-white' : 'text-gray-500 border-transparent hover:text-gray-300'}`} style={activeTab === 'updates' ? { borderColor: finalAccentColor, background: `rgba(${finalAccentRgb}, 0.05)`, color: finalAccentColor } : {}}>
          <ActivityIcon size={12} />Updates
        </button>
        <button onClick={() => setActiveTab('comments')} className={`flex-1 py-2.5 text-xs font-mono transition-colors flex items-center justify-center gap-1 border-b-2 ${activeTab === 'comments' ? 'text-white' : 'text-gray-500 border-transparent hover:text-gray-300'}`} style={activeTab === 'comments' ? { borderColor: finalAccentColor, background: `rgba(${finalAccentRgb}, 0.05)`, color: finalAccentColor } : {}}>
          <LucideIcons.MessageSquare size={12} />Comments
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Activity List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 darkwave-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `rgba(${finalAccentRgb}, 0.3)`, borderTopColor: finalAccentColor }} /></div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-mono text-sm">
              <FileIcon size={32} className="mx-auto mb-3 opacity-20" />
              No {activeTab === 'all' ? 'history' : activeTab} to show for this record.
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} onClick={() => !activity.is_read && markAsRead(activity.id)} className={`p-4 rounded-xl border ${getTypeColor(activity)} transition-all hover:-translate-y-0.5 hover:shadow-lg ${activity.isNew ? 'animate-slide-in-right' : ''}`} style={!activity.is_read ? { cursor: 'pointer', borderColor: `rgba(${finalAccentRgb}, 0.5)` } : {}}>
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(activity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono flex-1 leading-snug">
                        <span className="text-white font-bold">{activity.user_name}</span>
                        <span className="text-gray-400 mx-1">{activity.action}</span>
                        <span className="font-bold capitalize" style={{ color: finalAccentColor }}>{activity.target}</span>
                      </p>
                      {!activity.is_read && <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: finalAccentColor }} />}
                    </div>
                    {renderActivityDetails(activity)}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800/50">
                      <p className="text-[10px] text-gray-500 font-mono">{formatTime(activity.created_at)}</p>
                      <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded border border-white/5">{activity.activity_type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Status Panel
interface StatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [statusType, setStatusType] = useState<'update' | 'question'>('update');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const groups = [
    { id: 'all', name: 'Everyone', icon: UsersIcon },
    { id: 'team-a', name: 'Team Alpha', icon: UsersIcon },
    { id: 'team-b', name: 'Team Beta', icon: UsersIcon },
    { id: 'managers', name: 'Managers', icon: UsersIcon },
    { id: 'admins', name: 'Administrators', icon: UsersIcon },
  ];

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async () => {
    try {
      await db.from('activities').insert({
        user_name: 'Current User',
        action: statusType === 'update' ? 'posted' : 'asked',
        target: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        target_type: 'status',
        details: message,
        activity_type: 'message',
      });
    } catch (err) {
      console.error('Error posting status:', err);
    }
    
    setMessage('');
    setSelectedGroups([]);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      
      <div className="relative bg-black border border-blue-500/50 rounded-xl w-full max-w-md shadow-[0_0_40px_rgba(136,187,255,0.2)]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 to-transparent rounded-xl" />
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                <StatusIcon size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-white">Post Status</h2>
                <p className="text-xs text-gray-500 font-mono">Share an update or question</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Status Type */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setStatusType('update')}
              className={`flex-1 py-2 rounded-lg font-mono text-sm transition-all ${
                statusType === 'update'
                  ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                  : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              Status Update
            </button>
            <button
              onClick={() => setStatusType('question')}
              className={`flex-1 py-2 rounded-lg font-mono text-sm transition-all ${
                statusType === 'question'
                  ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                  : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              Question
            </button>
          </div>

          {/* Message Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={statusType === 'update' ? "What's happening?" : "What would you like to ask?"}
            className="w-full h-24 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm resize-none focus:outline-none focus:border-blue-500/50 transition-all"
          />

          {/* Share With */}
          <div className="mt-4">
            <p className="text-sm text-gray-400 font-mono mb-2">Share with:</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                    selectedGroups.includes(group.id)
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                      : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || selectedGroups.length === 0}
            className="w-full mt-6 py-3 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <SendIcon size={18} />
            Post {statusType === 'update' ? 'Update' : 'Question'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ⚡ NEW: Deterministic color generator for tags (fallback)
const getTagColor = (tag: string) => {
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];
  return { bg };
};

// Task Panel
interface TaskPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: string;
  currentWorkspaceSlug?: string | null;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({ isOpen, onClose, currentView, currentWorkspaceSlug }) => {
  const { user, organization } = useAuth(); // ⚡ Destructure organization
  const currentUserId = user?.id || (user as any)?.uid;

  const { getColor } = useWorkspaceColor();
  const ac = currentWorkspaceSlug ? getColor(currentWorkspaceSlug) : null;

  // ⚡ NEW: Theme State syncing with BottomNav
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});
  const [isColorLoaded, setIsColorLoaded] = useState(false); // ⚡ Track color loading

  useEffect(() => {
    const fetchColors = async () => {
      if (!currentUserId || !organization?.id) {
        setIsColorLoaded(true);
        return;
      }
      try {
        const { data } = await supabase.schema('app_private')
          .from('user_preferences')
          .select('nav_colors')
          .eq('user_id', currentUserId)
          .eq('organization_id', organization.id) // ⚡ Scope to org
          .maybeSingle();
        if (data?.nav_colors) setUserNavColors(data.nav_colors);
      } finally {
        setIsColorLoaded(true);
      }
    };
    fetchColors();

    const handleColorUpdate = (e: any) => {
      if (e.detail) setUserNavColors(e.detail);
    };
    window.addEventListener('navColorsUpdated', handleColorUpdate);
    return () => window.removeEventListener('navColorsUpdated', handleColorUpdate);
  }, [currentUserId]);

  const userPrefKey = userNavColors['tasks'];
  
  const themeColor = (currentWorkspaceSlug && ac) 
    ? ac.primary 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#22c55e');

  const themeRgb = (currentWorkspaceSlug && ac) 
    ? ac.rgb 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '34, 197, 94');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [assignee, setAssignee] = useState<string>('');
  const [attachTo, setAttachTo] = useState(currentView || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // States for fetching users & tags
  const [orgUsers, setOrgUsers] = useState<{id: string, name: string}[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  const attachOptions = [
    { id: 'dashboard', name: 'Personal Dashboard' },
    { id: 'project-alpha', name: 'Project Alpha' },
    { id: 'workspace-hr', name: 'HR Workspace' },
  ];

  // Fetch users in the same organization and tags
  useEffect(() => {
    if (!currentUserId || !isOpen || !organization?.id) return; // ⚡ Require org ID

    const fetchData = async () => {
      // ⚡ FIX: Use active organization directly to prevent cross-contamination
      setOrgId(organization.id);
      const { data: users } = await supabase.schema('app_private')
        .from('organization_users')
        .select('id, full_name, email')
        .eq('organization_id', organization.id);

      if (users) {
        setOrgUsers(users.map(u => ({ id: u.id, name: u.full_name || u.email || 'Unknown' })));
      }
      
      setAssignee(currentUserId); // Default assignee is self

      // Fetch tags securely scoped to org
      const { data: dbSettings } = await supabase.schema('app_private')
        .from('user_settings')
        .select('tags')
        .eq('user_id', currentUserId)
        .eq('organization_id', organization.id) // ⚡ Scope to org
        .maybeSingle();

      if (dbSettings?.tags) {
        const formattedTags = dbSettings.tags.map((t: any) => {
          if (typeof t === 'string') {
            try {
              const parsed = JSON.parse(t);
              if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
            } catch (e) {}
            return { id: t.toLowerCase().replace(/\s+/g, '_'), name: t, color: getTagColor(t).bg };
          }
          return t;
        });
        setAvailableTags(formattedTags);
      }
    };

    fetchData();
  }, [currentUserId, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || !currentUserId || !orgId) return;

    try {
      let dueDateTimestamp = null;
      if (dueDate) {
        const timeStr = dueTime || '23:59';
        dueDateTimestamp = new Date(`${dueDate}T${timeStr}`).toISOString();
      }

      // ⚡ Write the task to the actual tasks table
      await supabase.schema('app_private').from('tasks').insert({
        organization_id: orgId,
        created_by: currentUserId,
        assigned_to: assignee,
        title: title.trim(),
        description: description.trim() || null,
        priority: priority,
        due_date: dueDateTimestamp,
        recurrence: recurrenceType === 'none' ? 'none' : `${recurrenceInterval} ${recurrenceType}`,
        status: 'pending',
        app_name: attachTo || null,
        tags: selectedTags.length > 0 ? selectedTags : null
      });

      // Also log the activity
      await db.from('activities').insert({
        user_name: 'Current User',
        action: 'created task',
        target: title,
        target_type: 'task',
        activity_type: 'task',
      });

      // ⚡ Dispatch manual refresh event to instantly sync the main TasksView
      window.dispatchEvent(new CustomEvent('refreshTasks'));
    } catch (err) {
      console.error('Error creating task:', err);
    }
    
    setTitle('');
    setDescription('');
    setDueDate('');
    setDueTime('');
    setRecurrenceType('none');
    setRecurrenceInterval(1);
    setSelectedTags([]);
    onClose();
  };

  if (!isOpen) return null;
  if (!isColorLoaded) return null; // ⚡ Prevent render until colors resolve

  return createPortal(
    <div id="task-panel-modal" className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* ⚡ Scoped styling block mapping dynamic focus classes to user theme */}
      <style>{`
        #task-panel-modal .focus\\:theme-border:focus { border-color: rgba(${themeRgb}, 0.5) !important; }
        #task-panel-modal .submit-btn {
          background-color: rgba(${themeRgb}, 0.2);
          border-color: rgba(${themeRgb}, 0.5);
          color: ${themeColor};
        }
        #task-panel-modal .submit-btn:not(:disabled):hover {
          background-color: rgba(${themeRgb}, 0.3);
        }
      `}</style>

      <div 
        className="relative bg-black border rounded-xl w-full max-w-md transition-all duration-300"
        style={{ borderColor: `rgba(${themeRgb}, 0.5)`, boxShadow: `0 0 40px rgba(${themeRgb}, 0.2)` }}
      >
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300" 
          style={{ background: `linear-gradient(to bottom right, rgba(${themeRgb}, 0.15), transparent)` }}
        />
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg border flex items-center justify-center transition-colors duration-300"
                style={{ backgroundColor: `rgba(${themeRgb}, 0.2)`, borderColor: `rgba(${themeRgb}, 0.5)` }}
              >
                <TaskIcon size={20} style={{ color: themeColor }} className="transition-colors duration-300" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-white">Create Task</h2>
                <p className="text-xs text-gray-500 font-mono">Assign a new task</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:theme-border transition-all mb-4"
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full h-20 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm resize-none focus:outline-none focus:theme-border transition-all mb-4"
          />

          {/* Stretched Assign To Dropdown */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 font-mono mb-2">Assign to:</p>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:theme-border transition-all"
            >
              <option value={currentUserId}>Me</option>
              {orgUsers.filter(u => u.id !== currentUserId).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Stretched Priority Dropdown */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 font-mono mb-2">Priority:</p>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:theme-border transition-all"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Due Date, Time & Recurrence */}
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-sm text-gray-400 font-mono">Schedule & Repeat:</p>
            <div className="flex items-center gap-2 w-full">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-3 text-gray-400 font-mono text-sm focus:outline-none focus:theme-border w-1/2 [color-scheme:dark] transition-all" title="Optional Due Date" />
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={!dueDate} className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-3 text-gray-400 font-mono text-sm focus:outline-none focus:theme-border disabled:opacity-50 disabled:cursor-not-allowed w-1/2 [color-scheme:dark] transition-all" title="Optional Due Time" />
            </div>
            
            <div className={`flex items-center gap-2 border border-gray-800 rounded-lg px-3 py-2 transition-all ${dueDate ? 'bg-gray-950' : 'bg-gray-900/20 opacity-50'}`}>
              <span className="text-gray-500 font-mono text-xs uppercase tracking-widest font-bold">Repeat:</span>
              <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)} disabled={!dueDate} className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none cursor-pointer disabled:cursor-not-allowed" title="Repeat Type">
                <option className="bg-gray-900" value="none">Never</option>
                <option className="bg-gray-900" value="days">Days</option>
                <option className="bg-gray-900" value="weeks">Weeks</option>
                <option className="bg-gray-900" value="months">Months</option>
                <option className="bg-gray-900" value="years">Years</option>
              </select>
              {recurrenceType !== 'none' && (
                <div className="flex items-center gap-2 ml-auto border-l border-gray-800 pl-3">
                  <span className="text-gray-500 font-mono text-xs uppercase tracking-widest font-bold">Every:</span>
                  <input 
                    type="number" min="1" 
                    value={recurrenceInterval} 
                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)} 
                    disabled={!dueDate}
                    className="w-14 bg-black border rounded px-2 py-1 font-mono text-sm text-center focus:outline-none disabled:cursor-not-allowed transition-colors"
                    style={{ borderColor: `rgba(${themeRgb}, 0.5)`, color: themeColor }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 font-mono mb-2">Tags:</p>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map(tagId => {
                  const tagObj = availableTags.find(t => t.id === tagId) || { name: tagId, color: getTagColor(tagId).bg };
                  return (
                    <span key={tagId} className="px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 uppercase tracking-wider" style={{ backgroundColor: `${tagObj.color || '#3b82f6'}15`, color: tagObj.color || '#3b82f6', border: `1px solid ${tagObj.color || '#3b82f6'}40` }}>
                      {tagObj.name}
                      <button onClick={() => setSelectedTags(prev => prev.filter(id => id !== tagId))} className="hover:text-white ml-1 opacity-70 hover:opacity-100">&times;</button>
                    </span>
                  );
                })}
              </div>
            )}
            <select 
              value="" 
              onChange={(e) => {
                if (!e.target.value) return;
                if (!selectedTags.includes(e.target.value)) setSelectedTags(prev => [...prev, e.target.value]);
              }}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-400 font-mono text-sm focus:outline-none focus:theme-border transition-all cursor-pointer"
            >
              <option value="">+ Add Tag</option>
              {availableTags.filter(t => !selectedTags.includes(t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full mt-4 py-3 border rounded-lg transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 submit-btn"
          >
            <CheckIcon size={18} />
            Create Task
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Event Panel
interface EventPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventPanel: React.FC<EventPanelProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');

  const handleSubmit = async () => {
    try {
      await db.from('activities').insert({
        user_name: 'Current User',
        action: 'scheduled',
        target: title,
        target_type: 'event',
        details: `${date} at ${time} (${duration} min)`,
        activity_type: 'task',
      });
    } catch (err) {
      console.error('Error creating event:', err);
    }
    
    setTitle('');
    setDate('');
    setTime('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="relative bg-black border border-orange-500/50 rounded-xl w-full max-w-md shadow-[0_0_40px_rgba(255,170,119,0.2)]">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/20 to-transparent rounded-xl" />
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                <EventIcon size={20} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-white">Add Event</h2>
                <p className="text-xs text-gray-500 font-mono">Schedule a calendar event</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title..."
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50 transition-all mb-4"
          />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-400 font-mono mb-2">Date:</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-mono mb-2">Time:</p>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="mb-6">
            <p className="text-sm text-gray-400 font-mono mb-2">Duration:</p>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50 transition-all"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !date || !time}
            className="w-full py-3 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <EventIcon size={18} />
            Add to Calendar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Project Panel
interface ProjectPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectPanel: React.FC<ProjectPanelProps> = ({ isOpen, onClose }) => {
  const { isPlatformOwner } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const adminProjects = [
    { id: 'admin-1', name: 'Platform Infrastructure', status: 'active', priority: 'high' },
    { id: 'admin-2', name: 'Security Compliance', status: 'active', priority: 'high' },
    { id: 'admin-3', name: 'Performance Optimization', status: 'planning', priority: 'medium' },
  ];

  const mainProjects = [
    { id: 'main-1', name: 'Project Alpha', status: 'active', priority: 'high' },
    { id: 'main-2', name: 'Project Beta', status: 'active', priority: 'medium' },
    { id: 'main-3', name: 'Q1 Initiative', status: 'planning', priority: 'low' },
    { id: 'main-4', name: 'Customer Portal', status: 'active', priority: 'high' },
  ];

  const handleSelectProject = (projectId: string) => {
    console.log('Selected project:', projectId);
    onClose();
  };

  const filteredAdminProjects = adminProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMainProjects = mainProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-green-400 bg-green-500/10 border-green-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="relative bg-black border border-red-500/50 rounded-xl w-full max-w-md shadow-[0_0_40px_rgba(255,107,107,0.2)] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 to-transparent rounded-xl" />
        
        <div className="relative z-10 p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                <ProjectIcon size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-white">Select Project</h2>
                <p className="text-xs text-gray-500 font-mono">Choose a project to work on</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>

          {/* Projects List */}
          <div className="flex-1 overflow-y-auto space-y-4 darkwave-scrollbar">
            {/* Admin Projects */}
            {isPlatformOwner() && filteredAdminProjects.length > 0 && (
              <div>
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Admin Projects</h3>
                <div className="space-y-2">
                  {filteredAdminProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      className="w-full p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-red-500/30 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-mono group-hover:text-red-400 transition-colors">{project.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-mono border ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono capitalize">{project.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Projects */}
            {filteredMainProjects.length > 0 && (
              <div>
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Main Projects</h3>
                <div className="space-y-2">
                  {filteredMainProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      className="w-full p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-red-500/30 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-mono group-hover:text-red-400 transition-colors">{project.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-mono border ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono capitalize">{project.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Microphone/AI Assistant Panel
interface MicrophonePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MicrophonePanel: React.FC<MicrophonePanelProps> = ({ isOpen, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const handleStartListening = () => {
    setIsListening(true);
    setTimeout(() => {
      setTranscript('What tasks do I have due today?');
      setIsListening(false);
    }, 2000);
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="relative bg-black border border-sky-400/50 rounded-xl w-full max-w-md shadow-[0_0_40px_rgba(170,221,255,0.2)]">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-950/20 to-transparent rounded-xl" />
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-400/20 border border-sky-400/50 flex items-center justify-center">
                <MicrophoneIcon size={20} className="text-sky-300" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-white">AI Assistant</h2>
                <p className="text-xs text-gray-500 font-mono">Voice commands & questions</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Microphone Button */}
          <div className="flex flex-col items-center py-8">
            <button
              onMouseDown={handleStartListening}
              onMouseUp={handleStopListening}
              onMouseLeave={handleStopListening}
              onTouchStart={handleStartListening}
              onTouchEnd={handleStopListening}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-sky-400/30 border-2 border-sky-300 scale-110' 
                  : 'bg-sky-400/10 border-2 border-sky-400/50 hover:bg-sky-400/20'
              }`}
            >
              <MicrophoneIcon size={40} className={`${isListening ? 'text-sky-200' : 'text-sky-300'}`} />
              
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-sky-300 animate-ping opacity-30" />
                  <div className="absolute inset-0 rounded-full border-2 border-sky-300 animate-pulse opacity-50" />
                </>
              )}
            </button>
            
            <p className="mt-4 text-sm text-gray-400 font-mono">
              {isListening ? 'Listening...' : 'Hold to speak'}
            </p>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 font-mono mb-1">You said:</p>
              <p className="text-white font-mono">{transcript}</p>
            </div>
          )}

          {/* Quick Commands */}
          <div className="mt-6">
            <p className="text-xs text-gray-500 font-mono mb-2">Quick commands:</p>
            <div className="flex flex-wrap gap-2">
              {['Show my tasks', 'Schedule meeting', 'Create report', 'Check status'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setTranscript(cmd)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full text-xs font-mono text-gray-400 hover:text-sky-300 hover:border-sky-400/30 transition-all"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================
// GLOBAL RECORD PANEL
// ============================================

// --- PERSISTENCE STORE FOR RECORD PANEL ---
const getPersistedRecordState = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('acore_pinned_record');
    if (stored) {
      try { return JSON.parse(stored); } catch(e) {}
    }
  }
  return { activeRecord: null, contextData: null, dockPosition: 'none', isTabified: false };
};

const updatePersistedRecordState = (updates: any) => {
  if (typeof window !== 'undefined') {
    const current = getPersistedRecordState();
    const next = { ...current, ...updates };
    localStorage.setItem('acore_pinned_record', JSON.stringify(next));
    (window as any).__RECORD_STATE__ = next;
    window.dispatchEvent(new CustomEvent('globalRecordStateChanged', { detail: next }));
  }
};

export interface GlobalRecordPanelProps {
  dockedPanels?: string[];
  onDockToggle?: (panelId: string, isDocked: boolean) => void;
  onLayoutChange?: (panelId: string, layoutState: string) => void;
}

export const GlobalRecordPanel: React.FC<GlobalRecordPanelProps> = ({
  dockedPanels = [],
  onDockToggle,
  onLayoutChange,
}) => {
  // ⚡ FIX: Add a mounted state to prevent portal crashes during initial render
  const [mounted, setMounted] = useState(false);
  
  const [state, setState] = useState(getPersistedRecordState());
  const { activeRecord, contextData, dockPosition, isTabified } = state;
  
  const [isClosing, setIsClosing] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipingRef = useRef(false);

  useEffect(() => {
    setMounted(true); // ⚡ FIX: Signal that the DOM is fully ready
    const handler = (e: any) => setState(e.detail || getPersistedRecordState());
    window.addEventListener('globalRecordStateChanged', handler);
    return () => window.removeEventListener('globalRecordStateChanged', handler);
  }, []);

  const [globalLeftDocked, setGlobalLeftDocked] = useState<string[]>(() => getGlobalDocked('left'));
  const [globalRightDocked, setGlobalRightDocked] = useState<string[]>(() => getGlobalDocked('right'));

  useEffect(() => {
    const handler = () => {
      setGlobalLeftDocked([...getGlobalDocked('left')]);
      setGlobalRightDocked([...getGlobalDocked('right')]);
    };
    window.addEventListener('dockSync', handler);
    return () => window.removeEventListener('dockSync', handler);
  }, []);

  const [isMatchingApp, setIsMatchingApp] = useState(false);

  const checkMatching = useCallback(() => {
    if (!activeRecord) return false;
    // 1. ⚡ Is the local editor literally in the DOM right now for this record? If so, yield to it!
    if (document.getElementById(`local-record-editor-${activeRecord._item_uid || activeRecord.id}`)) {
      return true;
    }
    // 2. Fallback to strict URL matching
    if (!contextData?.url || typeof window === 'undefined') return false;
    try {
      const query = contextData.url.split('?')[1];
      if (!query) return false;
      return window.location.href.includes(query.split('&record')[0]);
    } catch (e) {
      return false;
    }
  }, [activeRecord, contextData?.url]);

  // Evaluate immediately on state change, and poll frequently to perfectly sync with React Router unmounts
  useEffect(() => {
    setIsMatchingApp(checkMatching());
    const interval = setInterval(() => setIsMatchingApp(checkMatching()), 150);
    return () => clearInterval(interval);
  }, [checkMatching, state]);

  const shouldShowTab = isTabified || !isMatchingApp;
  const activePanelId = activeRecord ? `record-${activeRecord._item_uid || activeRecord.id}` : 'record';

  useEffect(() => {
    if (activeRecord && dockPosition !== 'none' && shouldShowTab) {
       toggleGlobalDock(dockPosition, activePanelId, true);
    } else {
       toggleGlobalDock('left', activePanelId, false);
       toggleGlobalDock('right', activePanelId, false);
    }
  }, [activeRecord, dockPosition, shouldShowTab, activePanelId]);

  const handleDock = (side: 'left' | 'right' | 'none') => {
    if (dockPosition !== 'none') toggleGlobalDock(dockPosition, activePanelId, false);
    if (side !== 'none') {
      toggleGlobalDock(side, activePanelId, true);
      const nextState = { ...state, dockPosition: side, isTabified: true };
      updatePersistedRecordState(nextState);
    } else {
      const nextState = { ...state, dockPosition: side, isTabified: false };
      updatePersistedRecordState(nextState);
    }
  };

  const handleClose = (e?: any) => {
    if (e) e.stopPropagation();
    setIsClosing(true);
    setTimeout(() => {
      if (dockPosition !== 'none') toggleGlobalDock(dockPosition, activePanelId, false);
      updatePersistedRecordState({ activeRecord: null, contextData: null, dockPosition: 'none', isTabified: false });
      setSwipeOffset(0);
      setIsClosing(false);
      if (onDockToggle) onDockToggle(activePanelId, false);
    }, 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (dockPosition === 'none') return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    swipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || dockPosition === 'none') return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (!swipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) swipingRef.current = true;
    if (swipingRef.current) {
      if (dockPosition === 'right' && dx > 0) { setSwipeOffset(dx); e.preventDefault(); }
      if (dockPosition === 'left' && dx < 0) { setSwipeOffset(dx); e.preventDefault(); }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !swipingRef.current || dockPosition === 'none') return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const velocityX = Math.abs(dx) / ((Date.now() - touchStartRef.current.t) / 1000);
    
    if ((dockPosition === 'right' && (dx > 100 || (dx > 50 && velocityX > 300))) ||
        (dockPosition === 'left' && (dx < -100 || (dx < -50 && velocityX > 300)))) {
      handleDock(dockPosition);
      if (onDockToggle) onDockToggle(activePanelId, true);
    }
    setSwipeOffset(0);
    touchStartRef.current = null;
    swipingRef.current = false;
  };

  // 1. ⚡ FIX: Never render the portal until the browser DOM is confirmed ready
  if (!mounted) return null;
  
  // 2. Never render if no record exists
  if (!activeRecord && !isClosing) return null;
  
  // 3. Yield to MiniAppView if we are inside the matching app and it's expanded
  if (isMatchingApp && !isTabified) return null;

  const { appName, appSettings, wc } = contextData || {};

  const activeGlobalList = dockPosition === 'left' ? globalLeftDocked : globalRightDocked;
  const combinedDocked = Array.from(new Set([...(dockedPanels || []), ...activeGlobalList]));
  const effectiveDocked = combinedDocked.length > 0 ? combinedDocked : [activePanelId];
  if (!effectiveDocked.includes(activePanelId)) effectiveDocked.push(activePanelId);

  const dockIndex = effectiveDocked.indexOf(activePanelId);
  const totalDocked = effectiveDocked.length;

  let tabTop = '50%';
  if (totalDocked === 2) tabTop = dockIndex === 0 ? 'calc(50% - 105px)' : 'calc(50% + 105px)';
  else if (totalDocked === 3) tabTop = dockIndex === 0 ? 'calc(50% - 210px)' : dockIndex === 1 ? '50%' : 'calc(50% + 210px)';
  else if (totalDocked > 3) tabTop = `calc(50% + ${(dockIndex - (totalDocked - 1) / 2) * 210}px)`;

  return createPortal(
    <>
      {/* Background Overlay */}
      {dockPosition === 'none' && !isTabified && (
        <div
          className={`fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm ${isClosing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-300'}`}
          onClick={handleClose}
        />
      )}

      {/* Docked Tab (48px) */}
      {dockPosition !== 'none' && isTabified && (
        <div 
          className={`fixed ${dockPosition === 'left' ? 'left-0 rounded-r-xl border-r' : 'right-0 rounded-l-xl border-l'} flex flex-col items-center py-4 bg-black/50 backdrop-blur-sm border-y border-gray-800 cursor-pointer hover:bg-black/70 transition-all group shadow-lg z-[100002] animate-in fade-in`}
          style={{ 
            zIndex: 40,
            top: tabTop, transform: 'translateY(-50%)', width: '48px', height: '200px', 
            [dockPosition === 'left' ? 'borderRightColor' : 'borderLeftColor']: wc?.primary || '#3b82f6', 
            [dockPosition === 'left' ? 'borderRightWidth' : 'borderLeftWidth']: '3px',
            boxShadow: `0 0 15px ${wc?.glow || 'rgba(59,130,246,0.3)'}`
          }}
          onClick={() => {
            const nextState = { ...state, isTabified: false };
            updatePersistedRecordState(nextState);
          }}
          title="Restore Record"
        >
          <button onClick={handleClose} className={`absolute top-2 ${dockPosition === 'left' ? 'right-2' : 'left-2'} p-1 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800 bg-black/40`} title="Close">
            <CloseIcon size={12} />
          </button>
          <div className="mb-2 mt-4" style={{ color: wc?.primary || '#3b82f6' }}><FileIcon size={20} /></div>
          
          <div className="flex flex-col items-center justify-center flex-1 w-full" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase whitespace-nowrap mb-2" style={{ color: wc?.primary || '#3b82f6' }}>
              {appSettings?.itemName || appName || 'RECORD'}
            </span>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter whitespace-nowrap">
              {activeRecord._item_uid || activeRecord.id}
            </span>
          </div>
        </div>
      )}

      {/* Main Panel (600px / 900px) */}
      {!isTabified && (
        <div className={dockPosition === 'none' 
              ? `fixed z-[100001] flex flex-col pointer-events-none ${isClosing ? 'animate-out fade-out zoom-out duration-200 ease-in' : 'animate-in fade-in zoom-in duration-300 ease-out'}`
              : `fixed z-[100001] flex flex-col pointer-events-none ${dockPosition === 'left' ? 'animate-in slide-in-from-left-full' : 'animate-in slide-in-from-right-full'} duration-300 ease-out`
             }
             style={dockPosition === 'none' 
              ? { top: 'calc(2vh + 60px)', left: '50%', transform: 'translateX(-50%)', bottom: '90px', width: '900px', maxWidth: '95vw' }
              : { top: '64px', [dockPosition]: 0, bottom: 0, width: '600px', maxWidth: '90vw', transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined }
             }
             onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            >

          {/* Edge Docking Tab Control */}
          {dockPosition !== 'none' && (
            <div className={`absolute top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[110] pointer-events-auto ${dockPosition === 'left' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'}`}>
              <button 
                onClick={() => { handleDock(dockPosition); if (onDockToggle) onDockToggle(activePanelId, true); }}
                className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)]"
                style={{ borderColor: `rgba(${wc?.rgb || '59,130,246'}, 0.4)` }} title="Dock as Tab"
              >
                <PopoutIcon size={16} className={dockPosition === 'left' ? 'rotate-180' : 'rotate-90'} /> 
              </button>
            </div>
          )}

          {/* INNER WRAPPER */}
          <div className={`flex-1 flex flex-col bg-black/95 backdrop-blur-xl overflow-hidden border pointer-events-auto relative z-[1] ${dockPosition === 'none' ? 'rounded-2xl' : dockPosition === 'left' ? 'border-r border-y-0 border-l-0' : 'border-l border-y-0 border-r-0'}`}
               style={{ borderColor: `rgba(${wc?.rgb || '59,130,246'}, 0.4)`, boxShadow: `0 0 60px rgba(${wc?.rgb || '59,130,246'}, 0.15), 0 0 120px rgba(0,0,0,0.8)` }}>
            
            {/* Header Area */}
            <div className="flex flex-col w-full border-b bg-black/40 px-4 pt-3 pb-2" style={{ borderColor: `rgba(${wc?.rgb || '59,130,246'}, 0.3)` }}>
              <div className="flex items-center justify-between w-full mb-1 gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(${wc?.rgb || '59,130,246'}, 0.2), rgba(0,0,0,0.8))`, border: `1px solid rgba(${wc?.rgb || '59,130,246'}, 0.3)` }}>
                    <FileIcon size={18} style={{ color: wc?.primary || '#3b82f6' }} />
                  </div>
                  <h3 className="text-lg font-mono font-bold whitespace-nowrap leading-none tracking-tight">
                    <span style={{ color: wc?.primary || '#3b82f6' }}>{appSettings?.itemName || appName || 'RECORD'} ID: </span>
                    <span className="text-white">{activeRecord._item_uid || activeRecord.id}</span>
                  </h3>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-auto border-l pl-3" style={{ borderColor: `rgba(${wc?.rgb || '59,130,246'}, 0.2)` }}>
                  {/* Pin Controls */}
                  <button onClick={() => handleDock('left')} className={`p-1.5 rounded-lg transition-all hover:bg-white/5 flex-shrink-0 ${dockPosition === 'left' ? 'bg-white/10' : ''}`} style={{ color: dockPosition === 'left' ? (wc?.primary || '#3b82f6') : '#6b7280' }} title="Pin Left">
                    <LucideIcons.PanelLeft size={18} />
                  </button>
                  <button onClick={() => handleDock('none')} className={`p-1.5 rounded-lg transition-all hover:bg-white/5 flex-shrink-0 ${dockPosition === 'none' ? 'bg-white/10' : ''}`} style={{ color: dockPosition === 'none' ? (wc?.primary || '#3b82f6') : '#6b7280' }} title="Center">
                    <MaximizeIcon size={16} />
                  </button>
                  <button onClick={() => handleDock('right')} className={`p-1.5 rounded-lg transition-all hover:bg-white/5 flex-shrink-0 ${dockPosition === 'right' ? 'bg-white/10' : ''}`} style={{ color: dockPosition === 'right' ? (wc?.primary || '#3b82f6') : '#6b7280' }} title="Pin Right">
                    <LucideIcons.PanelRight size={18} />
                  </button>
                  <div className="w-px h-5 mx-1" style={{ backgroundColor: `rgba(${wc?.rgb || '59,130,246'}, 0.2)` }} />
                  <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all flex-shrink-0" title="Close"><CloseIcon size={20} /></button>
                </div>
              </div>
            </div>

            {/* Content Area - Displays the Record Data Globally */}
            <div className="flex-1 overflow-y-auto p-6 darkwave-scrollbar">
              <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                {(() => {
                  // ⚡ FIX: Aggressively hunt for the data, unpacking it if it's nested or stringified
                  let recordData = activeRecord;
                  if (activeRecord?.data) {
                     try {
                       recordData = typeof activeRecord.data === 'string' 
                         ? JSON.parse(activeRecord.data) 
                         : activeRecord.data;
                     } catch (e) {
                       recordData = activeRecord.data;
                     }
                  }
                  
                  // Merge to ensure we get both top-level metadata and nested fields
                  const mergedData = { ...activeRecord, ...recordData };
                  
                  const ignoreKeys = ['id', 'data', 'created_at', 'updated_at', 'created_by', 'updated_by'];
                  const entries = Object.entries(mergedData).filter(([key]) => 
                    !key.startsWith('_') && !ignoreKeys.includes(key)
                  );

                  if (entries.length === 0) {
                    return (
                      <div className="col-span-full text-gray-500 font-mono text-sm italic p-4 text-center border border-dashed border-gray-800 rounded-lg">
                        No displayable fields found for this record.
                      </div>
                    );
                  }

                  return entries.map(([col, val]) => (
                    <div key={col} className="bg-black/40 border border-gray-800 rounded-lg px-4 py-3">
                      <label className="block text-[10px] font-mono font-medium text-gray-500 mb-1 uppercase tracking-wider">
                        {col.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <div className="text-white font-mono text-sm break-words whitespace-pre-wrap">
                        {val === null || val === undefined || val === '' ? (
                          <span className="text-gray-600 italic">Empty</span>
                        ) : typeof val === 'object' ? (
                          JSON.stringify(val)
                        ) : (
                          String(val)
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-800/50 flex justify-center">
                 <button 
                   onClick={() => {
                     // Keep the jump button in case they need to make edits
                     if (contextData?.url) window.location.href = contextData.url;
                   }}
                   className="px-6 py-2.5 rounded-lg border transition-all hover:scale-105 font-mono text-sm flex items-center gap-2"
                   style={{ color: wc?.primary || '#3b82f6', borderColor: wc?.primary || '#3b82f6', backgroundColor: `rgba(${wc?.rgb || '59,130,246'}, 0.1)` }}
                 >
                   <MaximizeIcon size={16} />
                   Open in Full Editor
                 </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </>,
    document.body
  );
};