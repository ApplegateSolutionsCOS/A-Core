import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor, COLOR_MAP } from '@/contexts/WorkspaceColorContext';
import { db } from '@/lib/dbProxy';

import { Workspace, WorkspaceSlug } from '@/types';
import ConfigWarningBanner from '@/components/ConfigWarningBanner';
import ErrorBoundary from '@/components/ErrorBoundary';

// Image logo from admin panel
const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/695fc81af8bb22c52e2539fb_1769628610343_93d83d41.png';

// Components
import LandingPage from '@/components/landing/LandingPage';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';
import TopHeader from '@/components/navigation/TopHeader';
import BottomNav from '@/components/navigation/BottomNav';
import WorkspaceMenu from '@/components/navigation/WorkspaceMenu';
import LeftSlidePanel from '@/components/navigation/LeftSlidePanel';
import MessagesPanel from '@/components/navigation/MessagesPanel';
import PersonalDashboard from '@/components/dashboard/PersonalDashboard';
import WorkspaceDashboard from '@/components/workspace/WorkspaceDashboard';
import CalendarView from '@/components/views/CalendarView';
import TasksView from '@/components/views/TasksView';
import MessagesView from '@/components/views/MessagesView';
import PlatformOwnerPanel from '@/components/admin/PlatformOwnerPanel';
import OrganizationSettings from '@/components/admin/OrganizationSettings';
import OrganizationAdminPanel from '@/components/admin/OrganizationAdminPanel';
import DashboardRouter from '@/components/dashboards/DashboardRouter';
import WorkspaceSettings from '@/components/workspace/WorkspaceSettings';
import { WORKSPACE_DEFINITIONS } from '@/types';


import FullViewActivity from '@/components/activity/FullViewActivity';

import QuantumBalltool from '@/components/toolbar/QuantumBalltool';
// ⚡ FIX: Add GlobalRecordPanel to the import list
import { ActivityPanel, StatusPanel, TaskPanel, EventPanel, ProjectPanel, MicrophonePanel, GlobalRecordPanel } from '@/components/toolbar/ToolbarPanels';
import UserProfile from '@/components/profile/UserProfile';
import GlobalSearch from '@/components/search/GlobalSearch';

interface AppLayoutProps {
  initialView?: 'dashboard' | 'calendar' | 'tasks' | 'messages' | 'admin' | 'settings' | 'workspace' | 'workspaces' | 'login' | 'register';
  workspaceSlug?: string;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '6, 182, 212';
};

const AppLayout: React.FC<AppLayoutProps> = ({ initialView, workspaceSlug }) => {
  const { isAuthenticated, isLoading, organization, isPlatformOwner, isPlatformUser, isOrganizationAdmin, user, userType, logout, pendingInviteEmail } = useAuth();

  const { getColor } = useWorkspaceColor();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Debounce ref to prevent rapid panel toggling
  const lastPanelToggleRef = useRef<number>(0);
  const DEBOUNCE_DELAY = 150; // ms
  
  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  // ⚡ Auto-open the login modal if there's a pending invite!
  useEffect(() => {
    if (pendingInviteEmail) {
      setShowLoginModal(true);
    }
  }, [pendingInviteEmail]);
  
  // RIGHT PANEL STATES
  const [openRightPanels, setOpenRightPanels] = useState<Array<'workspaces' | 'messages' | 'activity'>>([]);
  const [dockedRightPanels, setDockedRightPanels] = useState<Array<'workspaces' | 'messages' | 'activity'>>([]);
  const [rightPanelStates, setRightPanelStates] = useState<Record<string, string>>({});

  const handleRightPanelDockToggle = useCallback((panel: 'workspaces' | 'messages' | 'activity' | null, isDocked: boolean) => {
    if (!panel) return;
    setDockedRightPanels(prev => {
      if (isDocked) return prev.includes(panel) ? prev : [...prev, panel];
      return prev.filter(p => p !== panel);
    });
  }, []);

  const handleRightPanelLayoutChange = useCallback((panel: 'workspaces' | 'messages' | 'activity' | null, layoutState: string) => {
    if (!panel) return;
    setRightPanelStates(prev => ({ ...prev, [panel]: layoutState }));
  }, []);

  const [showPlatformOwnerPanel, setShowPlatformOwnerPanel] = useState(false);
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [showOrgAdminPanel, setShowOrgAdminPanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [wsSettingsSlug, setWsSettingsSlug] = useState<string | null>(null);
  const [showWorkspaceSettingsModal, setShowWorkspaceSettingsModal] = useState(false);
  const [showFullActivity, setShowFullActivity] = useState(false);


  
  // Toolbar panel states
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [activityPanelInitialTab, setActivityPanelInitialTab] = useState<'activity' | 'messages'>('activity');
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [showMicrophonePanel, setShowMicrophonePanel] = useState(false);
  
  // Left slide panel state for Tasks and Calendar (Array to support stacking!)
  const [openLeftPanels, setOpenLeftPanels] = useState<Array<'tasks' | 'calendar'>>([]);
  
  // NEW: Track the specific layout state of each panel ('normal', 'docked', 'side', 'expanded')
  const [leftPanelStates, setLeftPanelStates] = useState<Record<string, string>>({});

  const handleLeftPanelLayoutChange = useCallback((panel: 'tasks' | 'calendar' | null, layoutState: string) => {
    if (!panel) return;
    setLeftPanelStates(prev => ({ ...prev, [panel]: layoutState }));
  }, []);
  
  // NEW: Track which left panels are docked as tabs
  const [dockedLeftPanels, setDockedLeftPanels] = useState<Array<'tasks' | 'calendar'>>([]);

  // NEW: Handler for dock toggling
  const handleLeftPanelDockToggle = useCallback((panel: 'tasks' | 'calendar' | null, isDocked: boolean) => {
    if (!panel) return;
    setDockedLeftPanels(prev => {
      if (isDocked) return prev.includes(panel) ? prev : [...prev, panel];
      return prev.filter(p => p !== panel);
    });
  }, []);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSlug | null>(null);
  
  // MiniApp direct navigation state
  const [initialMiniApp, setInitialMiniApp] = useState<string | null>(null);
  const [initialAddRecord, setInitialAddRecord] = useState(false);
  
  // Data state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Handle clicks outside the panels (Header or Main App Area)
  const closeAllPanels = useCallback(() => {
    // Dock all currently open slide panels instead of closing them
    setDockedLeftPanels(prev => Array.from(new Set([...prev, ...openLeftPanels])));
    setDockedRightPanels(prev => Array.from(new Set([...prev, ...openRightPanels])));
    
    // Close the center modal panels
    setShowActivityPanel(false);
    setShowStatusPanel(false);
    setShowTaskPanel(false);
    setShowEventPanel(false);
    setShowProjectPanel(false);
    setShowMicrophonePanel(false);
  }, [openLeftPanels, openRightPanels]);

  // ========== GLOBAL KEYBOARD SHORTCUTS ==========
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // "S" key opens search (only when not typing in an input)
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey && !isInput) {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      // Cmd+K or Ctrl+K also opens search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);


  // ========== GLOBAL SCROLLBAR & THEME COLOR MATCHING ==========
  useEffect(() => {
    const root = document.documentElement;

    // 1. Reset to Default Cyan if logged out or on landing page
    if (!isAuthenticated) {
      root.style.setProperty('--scrollbar-color', 'rgba(0, 255, 255, 0.5)');
      root.style.setProperty('--scrollbar-hover-color', 'rgba(0, 255, 255, 0.7)');
      return;
    }

    // 2. Priority: Active Workspace Color
    if (activeWorkspace) {
      const wsColor = getColor(activeWorkspace);
      // ⚡ FIX: Generate the RGBA dynamically so it supports all 24+ colors!
      root.style.setProperty('--scrollbar-color', `rgba(${wsColor.rgb}, 0.5)`);
      root.style.setProperty('--scrollbar-hover-color', `rgba(${wsColor.rgb}, 0.8)`);
    } 
    // 3. Fallback: Default to Cyan for Personal Dashboard/Home
    else {
      root.style.setProperty('--scrollbar-color', 'rgba(0, 255, 255, 0.5)');
      root.style.setProperty('--scrollbar-hover-color', 'rgba(0, 255, 255, 0.7)');
    }

    // CLEANUP: Always revert to Cyan when this layout goes away
    return () => {
      root.style.setProperty('--scrollbar-color', 'rgba(0, 255, 255, 0.5)');
      root.style.setProperty('--scrollbar-hover-color', 'rgba(0, 255, 255, 0.7)');
    };
  }, [activeWorkspace, isAuthenticated, getColor]);

  // Debounced panel toggle helper
  const canTogglePanel = useCallback(() => {
    const now = Date.now();
    if (now - lastPanelToggleRef.current < DEBOUNCE_DELAY) {
      return false;
    }
    lastPanelToggleRef.current = now;
    return true;
  }, []);


  // Handle initial view from route
  useEffect(() => {
    if (initialView) {
      switch (initialView) {
        case 'admin':
          if (isAuthenticated && (isPlatformOwner() || isOrganizationAdmin())) {
            setShowPlatformOwnerPanel(isPlatformOwner());
            setShowOrgSettings(isOrganizationAdmin() && !isPlatformOwner());
          } else if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
          } else {
            setShowLoginModal(true);
          }
          break;
        case 'settings':
          if (isAuthenticated) {
            if (isPlatformOwner()) {
              setShowPlatformOwnerPanel(true);
            } else if (isOrganizationAdmin()) {
              setShowOrgSettings(true);
            }
          } else {
            setShowLoginModal(true);
          }
          break;
        case 'login':
          if (!isAuthenticated) {
            setShowLoginModal(true);
          } else {
            navigate('/dashboard', { replace: true });
          }
          break;
        case 'register':
          if (!isAuthenticated) {
            setShowRegisterModal(true);
          } else {
            navigate('/dashboard', { replace: true });
          }
          break;
        case 'workspaces':
          if (isAuthenticated) {
            setOpenRightPanels(prev => prev.includes('workspaces') ? prev : [...prev, 'workspaces']);
          } else {
            setShowLoginModal(true);
          }
          break;
        case 'workspace':
          if (isAuthenticated && workspaceSlug) {
            setActiveWorkspace(workspaceSlug as WorkspaceSlug);
            setActiveTab('workspace');
          } else if (!isAuthenticated) {
            setShowLoginModal(true);
          }
          break;
        case 'calendar':
        case 'tasks':
        case 'messages':
        case 'dashboard':
          if (isAuthenticated) {
            setActiveTab(initialView);
          } else {
            setShowLoginModal(true);
          }
          break;
      }
    }
  }, [initialView, isAuthenticated, workspaceSlug]);

  // Check for URL action parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'login' && !isAuthenticated) {
      setShowLoginModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (action === 'register' && !isAuthenticated) {
      setShowRegisterModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (action === 'forgot-password' && !isAuthenticated) {
      setShowLoginModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    const checkout = urlParams.get('checkout');
    if (checkout === 'success') {
      console.log('Checkout successful!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (checkout === 'cancelled') {
      console.log('Checkout cancelled');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated]);


  // Auto-open God Mode panel for Platform Owner strictly on initial login
  const prevAuthRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && isPlatformOwner() && !prevAuthRef.current) {
      // ⚡ FIX: Use sessionStorage so it only pops up once per browser tab session, not on every reload
      if (!sessionStorage.getItem('platform_panel_shown')) {
        setShowPlatformOwnerPanel(true);
        sessionStorage.setItem('platform_panel_shown', 'true');
      }
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, user]);


  // Fetch workspaces when authenticated
  useEffect(() => {
    if (isAuthenticated && organization) {
      fetchWorkspaces();
    }
  }, [isAuthenticated, organization]);

  const fetchWorkspaces = async () => {
    if (!organization) return;
    try {
      const { data, error } = await db
        .from('workspaces')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order');
      if (data) {
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };


  // Handle tab changes from BottomNav
  const handleTabChange = (tab: string) => {
    if (!canTogglePanel()) return;
    
    if (tab === 'workspaces') {
      if (dockedRightPanels.includes('workspaces')) {
        setDockedRightPanels(prev => prev.filter(p => p !== 'workspaces'));
      } else {
        setOpenRightPanels(prev => prev.includes('workspaces') ? prev.filter(p => p !== 'workspaces') : [...prev, 'workspaces']);
      }
    } else if (tab === 'tasks') {
      // ⚡ FIX: Check if Tasks is docked on the left
      if (dockedLeftPanels.includes('tasks')) {
        setDockedLeftPanels(prev => prev.filter(p => p !== 'tasks'));
      } else {
        setOpenLeftPanels(prev => prev.includes('tasks') ? prev.filter(p => p !== 'tasks') : [...prev, 'tasks']);
        setLeftPanelStates(prev => { const next = {...prev}; delete next['tasks']; return next; });
      }
    } else if (tab === 'calendar') {
      // ⚡ FIX: Check if Calendar is docked on the left
      if (dockedLeftPanels.includes('calendar')) {
        setDockedLeftPanels(prev => prev.filter(p => p !== 'calendar'));
      } else {
        setOpenLeftPanels(prev => prev.includes('calendar') ? prev.filter(p => p !== 'calendar') : [...prev, 'calendar']);
        setLeftPanelStates(prev => { const next = {...prev}; delete next['calendar']; return next; });
      }
    } else if (tab === 'messages') {
      // ⚡ FIX: Check if Messages is docked on the right
      if (dockedRightPanels.includes('messages')) {
        setDockedRightPanels(prev => prev.filter(p => p !== 'messages'));
      } else {
        setOpenRightPanels(prev => prev.includes('messages') ? prev.filter(p => p !== 'messages') : [...prev, 'messages']);
      }
    } else {
      setActiveTab(tab);
      setActiveWorkspace(null);
      setInitialMiniApp(null);
      setInitialAddRecord(false);
      if (tab === 'dashboard') {
        navigate('/', { replace: true });
      } else {
        navigate(`/${tab}`, { replace: true });
      }
    }
  };


  const handleNavigateToFullView = useCallback((view: 'tasks' | 'calendar') => {
    if (!canTogglePanel()) return;
    setOpenLeftPanels([]);
    // Do NOT clear workspace or miniapps so the dashboard remains in the background
    setActiveTab(view);
    navigate(`/${view}`, { replace: true });
  }, [canTogglePanel, navigate]);

  // Handle navigation to full messages view
  const handleNavigateToMessages = useCallback(() => {
    setOpenRightPanels(prev => prev.filter(p => p !== 'messages'));
    // Do NOT clear workspace or miniapps so the dashboard remains in the background
    setActiveTab('messages');
    navigate('/messages', { replace: true });
  }, [navigate]);


  // Handle workspace selection (can now handle direct MiniApp routing)
  const handleSelectWorkspace = (slug: string, miniApp?: string) => {
    setActiveWorkspace(slug as WorkspaceSlug);
    setActiveTab('workspace');
    setOpenRightPanels(prev => prev.filter(p => p !== 'workspaces'));
    
    // ⚡ FIX: Store the miniApp name if provided, otherwise clear it
    setInitialMiniApp(miniApp || null);
    setInitialAddRecord(false);
    
    navigate(`/workspace/${slug}`, { replace: true });
  };

  // Handle direct miniapp navigation from hamburger menu
  const handleNavigateToMiniApp = (wsSlug: string, appName: string, openAddRecord?: boolean) => {
    setActiveWorkspace(wsSlug as WorkspaceSlug);
    setActiveTab('workspace');
    setInitialMiniApp(appName);
    setInitialAddRecord(openAddRecord || false);
    navigate(`/workspace/${wsSlug}`, { replace: true });
  };
  // Handle workspace settings - opens workspace-specific settings modal
  const handleOpenWorkspaceSettings = (slug: string) => {
    setWsSettingsSlug(slug);
    setShowWorkspaceSettingsModal(true);
  };

  // Handle go home
  const handleGoHome = () => {
    setActiveTab('dashboard');
    setActiveWorkspace(null);
    setOpenLeftPanels([]);
    setInitialMiniApp(null);
    setInitialAddRecord(false);
    navigate('/', { replace: true });
  };

  // Handle settings - opens org settings or user profile
  const handleOpenSettings = () => {
    if (isPlatformOwner() || isOrganizationAdmin()) {
      setShowOrgSettings(true);
    } else {
      setShowUserProfile(true);
    }
  };


  // Handle login modal close
  const handleLoginModalClose = () => {
    setShowLoginModal(false);
    if (location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  };

  // Handle register modal close
  const handleRegisterModalClose = () => {
    setShowRegisterModal(false);
    if (location.pathname === '/register' || location.pathname === '/signup') {
      navigate('/', { replace: true });
    }
  };

  // Handle panel closes
  const handlePlatformPanelClose = () => {
    setShowPlatformOwnerPanel(false);
    if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
      navigate('/', { replace: true });
    }
  };

  const handleOrgSettingsClose = () => {
    setShowOrgSettings(false);
    if (location.pathname === '/settings' || location.pathname.startsWith('/settings/')) {
      navigate('/', { replace: true });
    }
  };

  // Handle activity panel close
  const handleActivityPanelClose = useCallback(() => {
    if (!canTogglePanel()) return;
    setShowActivityPanel(false);
  }, [canTogglePanel]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="absolute inset-0 alien-grid pointer-events-none" />
        <div className="text-center relative z-10">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
            <img src={LOGO_URL} alt="Applegate CORE" className="h-16 w-auto mx-auto mb-4 relative z-10 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]" />
          </div>
          <p className="text-gray-500 font-mono">Loading...</p>
          <div className="mt-4 flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }


  // Not authenticated - show landing page
  if (!isAuthenticated) {
    return (
      <>
        <ConfigWarningBanner />
        <LandingPage 
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenRegister={(planId?: string) => { setSelectedPlan(planId); setShowRegisterModal(true); }}
        />
        <LoginModal 
          isOpen={showLoginModal}
          onClose={handleLoginModalClose}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
        <RegisterModal 
          isOpen={showRegisterModal}
          onClose={handleRegisterModalClose}
          selectedPlan={selectedPlan}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      </>
    );
  }


  // Render active view
  const renderActiveView = () => {
    if (activeWorkspace) {
      return (
        <WorkspaceDashboard
          workspaceSlug={activeWorkspace}
          onOpenMiniApp={(appSlug) => console.log('Open MiniApp:', appSlug)}
          onOpenSettings={() => handleOpenWorkspaceSettings(activeWorkspace)}
          isAdmin={isOrganizationAdmin() || isPlatformOwner()}

          initialMiniApp={initialMiniApp}
          initialAddRecord={initialAddRecord}
          onClearInitialMiniApp={() => { setInitialMiniApp(null); setInitialAddRecord(false); }}
        />
      );
    }

    // If no workspace is active, default background is ALWAYS Personal Dashboard
    return <PersonalDashboard />;
  };

  // Authenticated - show main app (wrapped in ErrorBoundary so crashes show a recovery UI)
  return (
    <ErrorBoundary onSignOut={logout} fallbackTitle="Dashboard Error">
    <div className="min-h-screen bg-black" style={{
      '--theme-primary': hexToRgb(organization?.primary_color || '#06b6d4'),
      '--theme-primary-hex': organization?.primary_color || '#06b6d4',
      '--theme-accent': hexToRgb(organization?.accent_color || '#a855f7'),
      '--theme-accent-hex': organization?.accent_color || '#a855f7',
    } as React.CSSProperties}>

      {/* Config Warning Banner */}
      <ConfigWarningBanner />
      
      {/* Background patterns */}
      <div className="fixed inset-0 alien-grid pointer-events-none" />
      <div className="fixed inset-0 hex-pattern pointer-events-none opacity-30" />

      {/* Main Content Wrapper - Catches clicks for BOTH Header and Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative" onClick={closeAllPanels}>
        {/* Top Header */}
        <TopHeader
          onOpenSearch={() => setShowGlobalSearch(true)}
          onOpenNotifications={() => setShowNotifications(!showNotifications)}
          onOpenSettings={handleOpenSettings}
          onOpenProfile={() => setShowUserProfile(true)}
          onGoHome={activeWorkspace ? () => {
            // Workspace icon click → go to workspace dashboard (not home)
            setActiveTab('workspace');
            setInitialMiniApp(null);
            setInitialAddRecord(false);
          } : handleGoHome}
          onOpenAdminPanel={() => setShowPlatformOwnerPanel(true)}
          onOpenOrgAdminPanel={() => setShowOrgAdminPanel(true)}
          onOpenWorkspaceSettings={activeWorkspace ? handleOpenWorkspaceSettings : undefined}
          onOpenOrgSettings={() => setShowOrgSettings(true)}
          currentWorkspace={activeWorkspace || undefined}
        />

        {/* Removed onClick from main since the parent div now handles it! */}
        {/* FIX: main is now the dedicated scrolling container, sitting perfectly below the 64px header */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden mt-16 pb-4 relative z-10 darkwave-scrollbar" onClick={closeAllPanels}>
          <ErrorBoundary onSignOut={logout} fallbackTitle="View Error">
          {renderActiveView()}
        </ErrorBoundary>
      </main>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadMessages={5}
        pendingTasks={12}
        onSelectWorkspace={handleSelectWorkspace}
        onNavigateToMiniApp={handleNavigateToMiniApp}
        currentWorkspace={activeWorkspace || undefined}
      />

      {/* Left Slide Panels for Tasks and Calendar (Mapped for Stacking) */}
      {openLeftPanels.map((panelType, index) => {
        // MAGIC MATH: Standard panels get a stack offset. Any panel that is NOT 'normal' is skipped in the count!
        const unshiftedPanelsAfterMe = openLeftPanels.slice(index + 1).filter(p => {
          const state = leftPanelStates[p] || 'normal';
          // FIX: Keep expanded panels in the count so back panels don't lose their index!
          return state === 'normal' || state === 'expanded';
        });
        const dynamicStackIndex = unshiftedPanelsAfterMe.length;

        return (
          <LeftSlidePanel
            key={panelType}
            activePanel={panelType}
            zIndex={50 + index}
            stackIndex={dynamicStackIndex}
            currentWorkspaceSlug={activeWorkspace}
            onBringToFront={() => setOpenLeftPanels(prev => [...prev.filter(p => p !== panelType), panelType])}
            
            // NEW: Make Secondary function (inserts right behind the front panel)
            onMakeSecondary={() => setOpenLeftPanels(prev => {
              const filtered = prev.filter(p => p !== panelType);
              if (filtered.length === 0) return [panelType];
              const frontPanel = filtered.pop(); // Remove the front panel
              return [...filtered, panelType, frontPanel!]; // Re-insert with our panel right behind it
            })}

            onClose={() => {
              if (!canTogglePanel()) return;
              setOpenLeftPanels(prev => prev.filter(p => p !== panelType));
              setLeftPanelStates(prev => { const next = {...prev}; delete next[panelType]; return next; });
            }}
            onNavigateToFullView={handleNavigateToFullView}
            leftPanelStates={leftPanelStates}
            onLayoutChange={handleLeftPanelLayoutChange}
            dockedPanels={dockedLeftPanels}
            onDockToggle={handleLeftPanelDockToggle}
          />
        );
      })}

      {/* Toolbar Panels */}
      <StatusPanel isOpen={showStatusPanel} onClose={() => setShowStatusPanel(false)} />
      <TaskPanel isOpen={showTaskPanel} onClose={() => setShowTaskPanel(false)} currentView={activeTab} />
      <EventPanel isOpen={showEventPanel} onClose={() => setShowEventPanel(false)} />
      <ProjectPanel isOpen={showProjectPanel} onClose={() => setShowProjectPanel(false)} />
      <MicrophonePanel isOpen={showMicrophonePanel} onClose={() => setShowMicrophonePanel(false)} />

      {/* Right Slide Panels (Mapped for Stacking) */}
      {openRightPanels.map((panelType, index) => {
        const currentZIndex = 50 + index;
        
        // MAGIC MATH FOR RIGHT PANELS
        const unshiftedPanelsAfterMe = openRightPanels.slice(index + 1).filter(p => {
          const state = rightPanelStates[p] || 'normal';
          // FIX: Keep expanded panels in the count so back panels don't lose their index!
          return state === 'normal' || state === 'expanded';
        });
        const dynamicStackIndex = unshiftedPanelsAfterMe.length;
        
        const bringToFront = () => setOpenRightPanels(prev => [...prev.filter(p => p !== panelType), panelType]);
        
        // NEW: Make Secondary function for Right Panels
        const makeSecondary = () => setOpenRightPanels(prev => {
          const filtered = prev.filter(p => p !== panelType);
          if (filtered.length === 0) return [panelType];
          const frontPanel = filtered.pop(); 
          return [...filtered, panelType, frontPanel!]; 
        });
        
        // Common props we will pass to all right panels
        const commonProps = {
          isOpen: true,
          zIndex: currentZIndex,
          stackIndex: dynamicStackIndex,
          onBringToFront: bringToFront,
          onMakeSecondary: makeSecondary, // <--- ADDED HERE
          dockedPanels: dockedRightPanels,
          rightPanelStates: rightPanelStates,
          onDockToggle: handleRightPanelDockToggle,
          onLayoutChange: handleRightPanelLayoutChange,
          onClose: () => {
            if (!canTogglePanel()) return;
            setOpenRightPanels(prev => prev.filter(p => p !== panelType));
            setDockedRightPanels(prev => prev.filter(p => p !== panelType));
            setRightPanelStates(prev => { const next = {...prev}; delete next[panelType]; return next; });
          }
        };
        
        return (
          <React.Fragment key={panelType}>
            {panelType === 'messages' && (
              <MessagesPanel
                {...commonProps}
                // ⚡ FIX: Pass the activeWorkspace slug directly instead of finding the UUID!
                workspaceSlug={activeWorkspace}
                onNavigateToFullView={() => {
                  commonProps.onClose();
                  setActiveWorkspace(null);
                  setInitialMiniApp(null);
                  setInitialAddRecord(false);
                  setActiveTab('messages');
                  navigate('/messages', { replace: true });
                }}
              />
            )}
            {panelType === 'workspaces' && (
              <WorkspaceMenu
                {...commonProps}
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                // This now correctly passes (slug, miniApp) to Section A above
                onSelectWorkspace={handleSelectWorkspace}
                onOpenSettings={handleOpenWorkspaceSettings}
                isAdmin={isOrganizationAdmin() || isPlatformOwner()}
              />
            )}
            {panelType === 'activity' && (
              <ActivityPanel
                {...commonProps}
                onOpenFullActivity={() => setShowFullActivity(true)}
                currentWorkspace={activeWorkspace || undefined}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Platform Owner Panel */}
      <PlatformOwnerPanel
        isOpen={showPlatformOwnerPanel && isPlatformOwner()}
        onClose={handlePlatformPanelClose}
      />

      {/* Organization Settings */}
      <OrganizationSettings
        isOpen={showOrgSettings && (isOrganizationAdmin() || isPlatformOwner())}
        onClose={handleOrgSettingsClose}
      />

      {/* Organization Admin Panel (Org Admin only, not Platform Owner) */}
      <OrganizationAdminPanel
        isOpen={showOrgAdminPanel && isOrganizationAdmin() && !isPlatformOwner()}
        onClose={() => setShowOrgAdminPanel(false)}
      />

      {/* Workspace Settings Modal */}
      {showWorkspaceSettingsModal && wsSettingsSlug && (
        <WorkspaceSettings
          isOpen={showWorkspaceSettingsModal}
          onClose={() => { setShowWorkspaceSettingsModal(false); setWsSettingsSlug(null); }}
          workspaceSlug={wsSettingsSlug}
          workspaceName={WORKSPACE_DEFINITIONS[wsSettingsSlug as WorkspaceSlug]?.name || wsSettingsSlug}
        />
      )}


      {/* User Profile Panel */}
      <UserProfile
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        currentWorkspace={activeWorkspace || undefined}
      />

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigateToWorkspace={handleSelectWorkspace}
        onNavigateToMiniApp={handleNavigateToMiniApp}
        currentWorkspace={activeWorkspace || undefined}
      />

      {/* Full View Overlay Modals */}
      <TasksView 
        isOpen={activeTab === 'tasks'} 
        onClose={() => {
          setActiveTab(activeWorkspace ? 'workspace' : 'dashboard');
          navigate(activeWorkspace ? `/workspace/${activeWorkspace}` : '/', { replace: true });
        }} 
      />
      <MessagesView 
        isOpen={activeTab === 'messages'} 
        onClose={() => {
          setActiveTab(activeWorkspace ? 'workspace' : 'dashboard');
          navigate(activeWorkspace ? `/workspace/${activeWorkspace}` : '/', { replace: true });
        }} 
      />
      <CalendarView 
        isOpen={activeTab === 'calendar'} 
        onClose={() => {
          setActiveTab(activeWorkspace ? 'workspace' : 'dashboard');
          navigate(activeWorkspace ? `/workspace/${activeWorkspace}` : '/', { replace: true });
        }}
        onNavigateToTask={(taskId) => {
          sessionStorage.setItem('isolatedTaskId', taskId);
          // ⚡ Dispatch the live event so TasksView catches it in the background
          window.dispatchEvent(new CustomEvent('focusTask', { detail: { taskId } }));
          setActiveTab('tasks');
          navigate('/tasks', { replace: true });
        }}
      />

      {/* QuantumBalltool - rendered LAST to ensure highest z-index stacking */}
      <QuantumBalltool
        onOpenActivity={() => {
          if (!canTogglePanel()) return;
          setActivityPanelInitialTab('activity');
          // ⚡ FIX: Check if Activity is docked on the right
          if (dockedRightPanels.includes('activity')) {
            setDockedRightPanels(prev => prev.filter(p => p !== 'activity'));
          } else {
            setOpenRightPanels(prev => prev.includes('activity') ? prev.filter(p => p !== 'activity') : [...prev, 'activity']);
          }
        }}
        onOpenFullActivity={() => setShowFullActivity(true)}
        onOpenStatus={() => setShowStatusPanel(true)}
        onOpenTask={() => setShowTaskPanel(true)}
        onOpenEvent={() => setShowEventPanel(true)}
        onOpenProject={() => setShowProjectPanel(true)}
        onOpenMicrophone={() => setShowMicrophonePanel(true)}
        currentView={activeWorkspace ? 'workspace' : 'home'}
        currentWorkspace={activeWorkspace || undefined}
      />

      {/* Full View Activity Dashboard - opens from Activity bubble in QuantumBalltool */}
      <FullViewActivity
        isOpen={showFullActivity}
        onClose={() => setShowFullActivity(false)}
      />

      {/* ⚡ GLOBAL RECORD PANEL: Mounted at the absolute root so it never disappears! */}
      <GlobalRecordPanel 
        dockedPanels={dockedRightPanels}
        onDockToggle={handleRightPanelDockToggle}
        onLayoutChange={handleRightPanelLayoutChange}
      />

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
    </ErrorBoundary>
  );

};

export default AppLayout;
