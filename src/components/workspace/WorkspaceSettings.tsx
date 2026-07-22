import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor, COLOR_MAP } from '@/contexts/WorkspaceColorContext';
import {
  SettingsIcon,
  SearchIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  FileIcon,
  CloseIcon,
  RefreshIcon,
  CheckIcon,
  TrashIcon,
  UsersIcon,
  BarChartIcon,
  HomeIcon,
  DatabaseIcon,
  BuildIcon
} from '@/components/icons/Icons';
import { PlatformUser, MiniApp } from '@/types';
import IconPickerModal from '@/components/miniapp/IconPickerModal';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';

interface WorkspaceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  workspaceName: string;
  onAppDeleted?: (appId: string, appName: string) => void;
}

interface MiniAppListItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  is_preset: boolean;
  is_system_app: boolean;
  is_visible: boolean;
  is_hidden_by_admin: boolean;
  hidden_by?: string;
  hidden_at?: string;
  display_order: number;
  created_by?: string;
  app_settings?: any; // ⚡ Added app_settings to interface
}

export const ACCENT_COLORS = [
  // Reds & Pinks
  { name: 'red', label: 'Red', hex: '#ef4444', rgb: '239,68,68' },
  { name: 'ruby', label: 'Ruby', hex: '#e11d48', rgb: '225,29,72' },
  { name: 'raspberry', label: 'Raspberry', hex: '#e83f6f', rgb: '232,63,111' },
  { name: 'coral', label: 'Coral', hex: '#fb7185', rgb: '251,113,133' },
  { name: 'melon', label: 'Melon', hex: '#fca5a5', rgb: '252,165,165' },
  { name: 'pink', label: 'Pink', hex: '#ec4899', rgb: '236,72,153' },
  { name: 'fuchsia', label: 'Fuchsia', hex: '#d946ef', rgb: '217,70,239' },
  { name: 'magenta', label: 'Magenta', hex: '#ff00ff', rgb: '255,0,255' },

  // Purples & Blues
  { name: 'lilac', label: 'Lilac', hex: '#d8b4fe', rgb: '216,180,254' },
  { name: 'lavender', label: 'Lavender', hex: '#c084fc', rgb: '192,132,252' },
  { name: 'violet', label: 'Violet', hex: '#8b5cf6', rgb: '139,92,246' },
  { name: 'purple', label: 'Purple', hex: '#a855f7', rgb: '168,85,247' },
  { name: 'indigo', label: 'Indigo', hex: '#6366f1', rgb: '99,102,241' },
  { name: 'electric', label: 'Electric', hex: '#818cf8', rgb: '129,140,248' },
  { name: 'blue', label: 'Blue', hex: '#3b82f6', rgb: '59,130,246' },
  { name: 'azure', label: 'Azure', hex: '#007fff', rgb: '0,127,255' },
  
  // Cyans & Greens
  { name: 'sky', label: 'Sky', hex: '#0ea5e9', rgb: '14,165,233' },
  { name: 'cyan', label: 'Cyan', hex: '#00ffff', rgb: '0,255,255' },
  { name: 'teal', label: 'Teal', hex: '#14b8a6', rgb: '20,184,166' },
  { name: 'mint', label: 'Mint', hex: '#34d399', rgb: '52,211,153' },
  { name: 'emerald', label: 'Emerald', hex: '#10b981', rgb: '16,185,129' },
  { name: 'green', label: 'Green', hex: '#22c55e', rgb: '34,197,94' },
  { name: 'lime', label: 'Lime', hex: '#84cc16', rgb: '132,204,22' },
  { name: 'chartreuse', label: 'Chartreuse', hex: '#bfff00', rgb: '191,255,0' },

  // Yellows & Oranges
  { name: 'yellow', label: 'Yellow', hex: '#eab308', rgb: '234,179,8' },
  { name: 'sunflower', label: 'Sunflower', hex: '#ffc300', rgb: '255,195,0' },
  { name: 'gold', label: 'Gold', hex: '#fbbf24', rgb: '251,191,36' },
  { name: 'amber', label: 'Amber', hex: '#f59e0b', rgb: '245,158,11' },
  { name: 'peach', label: 'Peach', hex: '#fb923c', rgb: '251,146,60' },
  { name: 'orange', label: 'Orange', hex: '#ff9900', rgb: '255,153,0' },
  { name: 'tangerine', label: 'Tangerine', hex: '#f97316', rgb: '249,115,22' },

  // Neutrals
  { name: 'zinc', label: 'Zinc', hex: '#a1a1aa', rgb: '161,161,170' },
  { name: 'slate', label: 'Slate', hex: '#94a3b8', rgb: '148,163,184' },
  { name: 'silver', label: 'Silver', hex: '#d1d5db', rgb: '209,213,219' },
  { name: 'platinum', label: 'Platinum', hex: '#e5e7eb', rgb: '229,231,235' },
  { name: 'white', label: 'White', hex: '#ffffff', rgb: '255,255,255' },
];

const WORKSPACE_ID_MAP: Record<string, string> = {
  'admin': '9c5d12fb-1305-451c-9ff6-699bccbbf354',
  'personnel': '80d960f3-16f2-4f93-9eb9-8cad53594112',
  'data': '38af3278-30a7-451e-b691-8b55b741aaf5',
  'main': '22bda45d-c323-41c7-9025-566dbcef06c0',
  'security': '1759127c-2fba-4629-b63b-f27e4e0c39d8',
  'accounting': '09bd9db0-eb92-4089-9981-f01e7ed2882b',
};

const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({
  isOpen,
  onClose,
  workspaceSlug,
  workspaceName,
  onAppDeleted,
}) => {
  const { user, userType, organization } = useAuth();
  const { getColor, setWorkspaceColor } = useWorkspaceColor();
  const [miniApps, setMiniApps] = useState<MiniAppListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'visible' | 'hidden'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [activeSection, setActiveSection] = useState<'apps' | 'theme' | 'advanced' | 'visibility'>('theme'); 
  const [editedName, setEditedName] = useState(workspaceName);
  const [editedIcon, setEditedIcon] = useState('main');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSavingAdvanced, setIsSavingAdvanced] = useState(false);

  const [allOrgs, setAllOrgs] = useState<{id: string, name: string}[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [initialOrgIds, setInitialOrgIds] = useState<string[]>([]); 
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [wsAutoDeploy, setWsAutoDeploy] = useState(false); // ⚡ Auto-deploy Workspace

  const [distributingAppId, setDistributingAppId] = useState<string | null>(null);
  const [appInitialOrgs, setAppInitialOrgs] = useState<string[]>([]);
  const [appSelectedOrgs, setAppSelectedOrgs] = useState<string[]>([]);
  const [isSavingAppDist, setIsSavingAppDist] = useState(false);
  const [appAutoDeploy, setAppAutoDeploy] = useState(false); // ⚡ Auto-deploy MiniApp

  const isPlatformOwner = userType === 'platform' && (user as PlatformUser)?.is_owner;
  const isOrgAdmin = userType === 'organization' && (user as any)?.role === 'organization_admin';
  const canManage = isPlatformOwner || isOrgAdmin;

  const wsColor = getColor(workspaceSlug);
  const currentColorName = wsColor.colorName;

  const fetchMiniApps = useCallback(async () => {
    setIsLoading(true);
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    try {
      let globalWorkspaceId = WORKSPACE_ID_MAP[workspaceSlug];
      let localWorkspaceId = null;
      let dbName = workspaceName;
      let dbIcon = 'main';

      const { data: wsData } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('id, name, icon')
        .eq('slug', workspaceSlug)
        .eq('organization_id', organization.id)
        .single();
        
      if (wsData) {
        localWorkspaceId = wsData.id;
        dbName = wsData.name;
        dbIcon = wsData.icon;
      }

      const targetWorkspaceIds: string[] = [];
      if (localWorkspaceId) targetWorkspaceIds.push(localWorkspaceId);
      if (globalWorkspaceId && !targetWorkspaceIds.includes(globalWorkspaceId)) {
        targetWorkspaceIds.push(globalWorkspaceId);
      }

      if (targetWorkspaceIds.length === 0) throw new Error("Workspace ID not found");

      setEditedName(dbName);
      setEditedIcon(dbIcon);

      const { data, error } = await supabase
        .schema('app_private')
        .from('mini_apps')
        .select('*')
        .in('workspace_id', targetWorkspaceIds)
        .or(`organization_id.eq.${organization.id},is_preset.eq.true`)
        .order('display_order', { ascending: true });

      if (!error && data) {
        const uniqueAppsMap = new Map();
        
        data.forEach((a: any) => {
          const existing = uniqueAppsMap.get(a.name);
          if (!existing || (a.organization_id === organization.id && existing.is_preset)) {
            uniqueAppsMap.set(a.name, a);
          }
        });

        const uniqueApps = Array.from(uniqueAppsMap.values());

        setMiniApps(uniqueApps.map((app: any) => ({
          id: app.id,
          name: app.name,
          slug: app.slug,
          icon: app.icon,
          description: app.description,
          is_preset: app.is_preset || false,
          is_system_app: app.is_system_app || false,
          is_visible: app.is_visible !== false,
          is_hidden_by_admin: app.is_hidden_by_admin || false,
          hidden_by: app.hidden_by,
          hidden_at: app.hidden_at,
          display_order: app.display_order || 0,
          created_by: app.created_by,
          app_settings: typeof app.app_settings === 'string' ? JSON.parse(app.app_settings) : (app.app_settings || {}),
        })));
      }
    } catch (err) {
      console.error('Error fetching mini apps:', err);
    }
    setIsLoading(false);
  }, [workspaceSlug, workspaceName, organization?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchMiniApps();
    }
  }, [isOpen, fetchMiniApps]);

  useEffect(() => {
    const fetchVisibilityData = async () => {
      if (isOpen && isPlatformOwner && activeSection === 'visibility') {
        try {
          const { data: orgData } = await supabase.rpc('get_all_organizations');
          if (orgData) setAllOrgs(orgData);

          const { data: wsData, error: wsError } = await supabase.schema('app_private')
            .from('workspaces')
            .select('organization_id, settings')
            .eq('slug', workspaceSlug);

          if (!wsError && wsData) {
            const currentOrgIds = wsData.map((w: any) => w.organization_id);
            setSelectedOrgIds(currentOrgIds);
            setInitialOrgIds(currentOrgIds); 

            // Extract auto_deploy setting from the Platform Owner's specific record
            const platformWs = wsData.find((w: any) => w.organization_id === organization?.id);
            if (platformWs) {
               const settings = typeof platformWs.settings === 'string' ? JSON.parse(platformWs.settings) : (platformWs.settings || {});
               setWsAutoDeploy(!!settings.auto_deploy);
            }
          }
        } catch (err) {
          console.error("Error fetching workspace visibility:", err);
        }
      }
    };

    fetchVisibilityData();
  }, [isOpen, isPlatformOwner, activeSection, workspaceSlug, organization?.id]);

  const handleSaveVisibility = async () => {
    if (!isPlatformOwner) return;
    setIsSavingVisibility(true);

    try {
      const orgsToAdd = selectedOrgIds.filter(id => !initialOrgIds.includes(id));
      const orgsToRemove = initialOrgIds.filter(id => !selectedOrgIds.includes(id));

      if (orgsToRemove.length > 0) {
        const { error: deleteError } = await supabase.schema('app_private')
          .from('workspaces')
          .delete()
          .eq('slug', workspaceSlug)
          .in('organization_id', orgsToRemove);
          
        if (deleteError) throw deleteError;
      }

      if (orgsToAdd.length > 0) {
        const insertPayload = orgsToAdd.map(orgId => ({
          organization_id: orgId,
          name: editedName, 
          slug: workspaceSlug,
          icon: editedIcon, 
          display_order: 99 
        }));

        const { error: insertError } = await supabase.schema('app_private')
          .from('workspaces')
          .insert(insertPayload);
          
        if (insertError) throw insertError;
      }

      // ⚡ Save the auto_deploy flag specifically to the Platform Owner's master record
      if (organization?.id) {
        const { data: currentWs } = await supabase.schema('app_private').from('workspaces').select('settings').eq('slug', workspaceSlug).eq('organization_id', organization.id).single();
        const currentSettings = typeof currentWs?.settings === 'string' ? JSON.parse(currentWs.settings) : (currentWs?.settings || {});
        
        await supabase.schema('app_private')
          .from('workspaces')
          .update({ settings: { ...currentSettings, auto_deploy: wsAutoDeploy } })
          .eq('slug', workspaceSlug)
          .eq('organization_id', organization.id);
      }

      setInitialOrgIds(selectedOrgIds); 
      setSuccessMessage('Workspace visibility updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      console.error('Error saving visibility:', err);
      alert(`Failed to sync visibility: ${err.message}`);
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const handleOpenAppDistribution = async (app: MiniAppListItem) => {
    if (distributingAppId === app.id) {
      setDistributingAppId(null);
      return;
    }
    setDistributingAppId(app.id);
    setAppAutoDeploy(!!app.app_settings?.auto_deploy); // ⚡ Load state from app settings
    
    try {
      const { data: wsData } = await supabase.schema('app_private')
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug);

      const validWsIds = wsData?.map(w => w.id) || [];

      let query = supabase.schema('app_private')
        .from('mini_apps')
        .select('organization_id')
        .eq('slug', app.slug);

      if (validWsIds.length > 0) {
        query = query.in('workspace_id', validWsIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orgIds = data?.map(d => d.organization_id).filter(Boolean) || [];
      const uniqueOrgIds = Array.from(new Set(orgIds));
      
      setAppInitialOrgs(uniqueOrgIds);
      setAppSelectedOrgs(uniqueOrgIds);
      
      if (allOrgs.length === 0) {
        const { data: orgData } = await supabase.rpc('get_all_organizations');
        if (orgData) setAllOrgs(orgData);
      }
    } catch (err) {
      console.error("Error opening distribution:", err);
    }
  };

  const handleSaveAppDistribution = async (app: MiniAppListItem) => {
    setIsSavingAppDist(true);
    try {
      const orgsToAdd = appSelectedOrgs.filter(id => !appInitialOrgs.includes(id));
      const orgsToRemove = appInitialOrgs.filter(id => !appSelectedOrgs.includes(id));

      const { data: wsData, error: wsError } = await supabase.schema('app_private')
        .from('workspaces')
        .select('id, organization_id')
        .eq('slug', workspaceSlug);

      if (wsError) throw wsError;

      const wsMap: Record<string, string> = {};
      wsData?.forEach(w => {
        if (w.organization_id) wsMap[w.organization_id] = w.id;
      });

      if (orgsToRemove.length > 0) {
        const wsIdsToRemove = orgsToRemove.map(orgId => wsMap[orgId]).filter(Boolean);
        
        let delQuery = supabase.schema('app_private')
          .from('mini_apps')
          .delete()
          .eq('slug', app.slug)
          .in('organization_id', orgsToRemove);

        if (wsIdsToRemove.length > 0) {
          delQuery = delQuery.in('workspace_id', wsIdsToRemove);
        }

        const { error: delError } = await delQuery;
        if (delError) throw delError;
      }

      if (orgsToAdd.length > 0) {
        const { data: sourceApp, error: sourceError } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('*')
          .eq('id', app.id)
          .single();

        if (sourceError) throw sourceError;

        if (sourceApp) {
          const inserts = orgsToAdd.map(orgId => {
            const { id, created_at, updated_at, ...appData } = sourceApp;
            return { 
              ...appData, 
              organization_id: orgId,
              workspace_id: wsMap[orgId] || null 
            };
          });

          const { error: insertError } = await supabase.schema('app_private')
            .from('mini_apps')
            .insert(inserts);

          if (insertError) throw insertError;
        }
      }

      // ⚡ Save the auto_deploy flag specifically to the master app record
      await supabase.schema('app_private')
        .from('mini_apps')
        .update({ app_settings: { ...app.app_settings, auto_deploy: appAutoDeploy } })
        .eq('id', app.id);
      
      setAppInitialOrgs(appSelectedOrgs);
      
      // Update local state to reflect the new setting without a hard refresh
      setMiniApps(prev => prev.map(a => a.id === app.id ? { ...a, app_settings: { ...a.app_settings, auto_deploy: appAutoDeploy } } : a));

      setSuccessMessage(`${app.name} distribution updated!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (e: any) {
      console.error("Error updating MiniApp distribution:", e);
      alert(`Failed to sync distribution: ${e.message}`);
    } finally {
      setIsSavingAppDist(false);
      setDistributingAppId(null);
    }
  };


  const handleToggleVisibility = async (app: MiniAppListItem) => {
    if (!canManage) return;
    
    setTogglingId(app.id);
    const newHiddenState = !app.is_hidden_by_admin;
    
    try {
      const userId = (user as any)?.id;
      
      const { error } = await supabase
        .schema('app_private')
        .from('mini_apps')
        .update({
          is_hidden_by_admin: newHiddenState,
          hidden_by: newHiddenState ? userId : null,
          hidden_at: newHiddenState ? new Date().toISOString() : null,
        })
        .eq('id', app.id);

      if (error) throw error;

      setMiniApps(prev =>
        prev.map(a =>
          a.id === app.id
            ? {
                ...a,
                is_hidden_by_admin: newHiddenState,
                hidden_by: newHiddenState ? userId : undefined,
                hidden_at: newHiddenState ? new Date().toISOString() : undefined,
              }
            : a
        )
      );

      setSuccessMessage(
        newHiddenState
          ? `${app.name} is now hidden from workspace`
          : `${app.name} is now visible in workspace`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling visibility:', err);
    }
    setTogglingId(null);
  };

  const handleDeleteMiniApp = async (appId: string, appName: string) => {
    if (!canManage) return;
    
    if (!confirm(`Are you sure you want to permanently delete the "${appName}" MiniApp? This will also delete all of its records and cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .schema('app_private')
        .from('mini_apps')
        .delete()
        .eq('id', appId);

      if (error) throw error;

      if (organization?.id) {
        const { data: wsData } = await supabase
          .schema('app_private')
          .from('workspaces')
          .select('id, settings')
          .eq('slug', workspaceSlug)
          .eq('organization_id', organization.id)
          .single();

        if (wsData) {
          let wsSettings = typeof wsData.settings === 'string' ? JSON.parse(wsData.settings) : (wsData.settings || {});
          let tabOrder: string[] = wsSettings.tab_order || [];
          
          if (tabOrder.includes(appName)) {
            wsSettings.tab_order = tabOrder.filter((name: string) => name !== appName);
            
            await supabase
              .schema('app_private')
              .from('workspaces')
              .update({ settings: wsSettings })
              .eq('id', wsData.id);
              
            console.log(`Cleaned up "${appName}" from workspace tab_order.`);
          }
        }
      }

      setMiniApps(prev => prev.filter(a => a.id !== appId));
      setNeedsReload(true); 
      
      if (onAppDeleted) {
        onAppDeleted(appId, appName);
      }
      
      setSuccessMessage(`"${appName}" was successfully deleted.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting MiniApp:', err);
      alert(`Failed to delete MiniApp: ${err.message}`);
    }
  };

  const handleColorChange = async (colorName: string) => {
    const userId = (user as any)?.id || 'system';
    await setWorkspaceColor(workspaceSlug, colorName, userId);
    setSuccessMessage(`Workspace theme changed to ${colorName}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveAdvanced = async () => {
    if (!canManage || !organization?.id) return;
    setIsSavingAdvanced(true);
    
    try {
      const { data: wsData, error: fetchError } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .eq('organization_id', organization.id)
        .single();

      if (fetchError || !wsData?.id) {
        throw new Error("Could not locate custom workspace to update. Global workspaces cannot be edited.");
      }

      const { error } = await supabase
        .schema('app_private')
        .from('workspaces')
        .update({ 
          name: editedName, 
          icon: editedIcon 
        })
        .eq('id', wsData.id);

      if (error) throw error;
      
      setSuccessMessage('Workspace updated!');
      setTimeout(() => {
        window.location.reload(); 
      }, 1000);
      
    } catch (err: any) {
      console.error('Error saving advanced settings:', err);
      alert(`Failed to update workspace: ${err.message}`);
    }
    setIsSavingAdvanced(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!canManage || !organization?.id) return;
    setIsSavingAdvanced(true);
    
    try {
      const { data: wsData, error: fetchError } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .eq('organization_id', organization.id)
        .single();

      if (fetchError || !wsData?.id) {
        throw new Error("Could not locate this workspace in the database.");
      }

      const { error: deleteError } = await supabase
        .schema('app_private')
        .from('workspaces')
        .delete()
        .eq('id', wsData.id);

      if (deleteError) {
        throw deleteError;
      }
      
      window.location.href = '/'; 
      
    } catch (err: any) {
      console.error('Error deleting workspace:', err);
      alert(`Failed to delete workspace: ${err.message}`);
      setIsSavingAdvanced(false);
      setShowDeleteConfirm(false);
    }
  };

  const filteredApps = miniApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterMode === 'visible') return matchesSearch && !app.is_hidden_by_admin;
    if (filterMode === 'hidden') return matchesSearch && app.is_hidden_by_admin;
    return matchesSearch;
  });

  const visibleCount = miniApps.filter(a => !a.is_hidden_by_admin).length;
  const hiddenCount = miniApps.filter(a => a.is_hidden_by_admin).length;
  const presetCount = miniApps.filter(a => a.is_preset).length;

  if (!isOpen) return null;

  const renderAppRow = (app: MiniAppListItem, index: number) => (
    <div key={app.id} className="flex flex-col gap-2">
      <div
        className="flex items-center gap-4 p-4 rounded-xl border transition-all"
        style={{
          borderColor: app.is_hidden_by_admin ? 'rgba(239,68,68,0.2)' : `rgba(${wsColor.rgb}, 0.2)`,
          background: app.is_hidden_by_admin ? 'rgba(127,29,29,0.1)' : 'rgba(0,0,0,0.3)',
          opacity: app.is_hidden_by_admin ? 0.7 : 1,
        }}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            border: app.is_hidden_by_admin ? '1px solid rgba(75,85,99,0.5)' : `1px solid rgba(${wsColor.rgb}, 0.3)`,
            background: app.is_hidden_by_admin ? 'rgba(17,24,39,1)' : `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.1), rgba(0,0,0,0.9))`,
          }}>
          <FileIcon size={20} style={{ color: app.is_hidden_by_admin ? '#4b5563' : wsColor.primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-mono font-medium ${app.is_hidden_by_admin ? 'text-gray-500 line-through' : 'text-white'}`}>
              {app.name}
            </h3>
            {app.is_preset && (
              <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                Preset
              </span>
            )}
          </div>
          {app.description && (
            <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{app.description}</p>
          )}
          {app.is_hidden_by_admin && app.hidden_at && (
            <p className="text-[10px] text-red-400/60 font-mono mt-0.5">
              Hidden {new Date(app.hidden_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <span className={`text-xs font-mono ${app.is_hidden_by_admin ? 'text-red-400' : 'text-green-400'}`}>
          {app.is_hidden_by_admin ? 'Hidden' : 'Visible'}
        </span>
        
        {canManage && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleToggleVisibility(app)}
              disabled={togglingId === app.id}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${togglingId === app.id ? 'opacity-50' : ''}`}
              style={{
                background: app.is_hidden_by_admin ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                border: `1px solid ${app.is_hidden_by_admin ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
              }}
              title={app.is_hidden_by_admin ? 'Click to show' : 'Click to hide'}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center"
                style={{
                  left: app.is_hidden_by_admin ? '2px' : 'calc(100% - 22px)',
                  background: app.is_hidden_by_admin ? '#ef4444' : '#22c55e',
                  boxShadow: app.is_hidden_by_admin ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(34,197,94,0.5)',
                }}
              >
                {app.is_hidden_by_admin ? (
                  <EyeOffIcon size={10} className="text-white" />
                ) : (
                  <EyeIcon size={10} className="text-white" />
                )}
              </div>
            </button>

            {isPlatformOwner && (
              <button
                onClick={() => handleOpenAppDistribution(app)}
                className={`p-1.5 rounded-lg transition-all ${distributingAppId === app.id ? 'bg-white/10' : 'hover:bg-white/10'} text-gray-400 hover:text-white`}
                style={distributingAppId === app.id ? { color: wsColor.primary, background: `rgba(${wsColor.rgb}, 0.15)` } : {}}
                title="Distribute MiniApp"
              >
                <DatabaseIcon size={18} />
              </button>
            )}

            {(!app.is_preset || userType === 'platform') && (
              <button
                onClick={() => handleDeleteMiniApp(app.id, app.name)}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Delete MiniApp"
              >
                <TrashIcon size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {distributingAppId === app.id && isPlatformOwner && (
        <div className="p-4 rounded-xl border bg-gray-950/80 animate-in fade-in slide-in-from-top-2" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-mono font-medium text-white flex items-center gap-2">
              <DatabaseIcon size={14} style={{ color: wsColor.primary }} />
              Distribute "{app.name}"
            </h4>
            <button onClick={() => setDistributingAppId(null)} className="text-gray-500 hover:text-white"><CloseIcon size={14} /></button>
          </div>
          <p className="text-xs text-gray-500 font-mono mb-4">
            Manage which organizations have access to this MiniApp. Adding an organization instantly deploys a copy to their workspace.
          </p>
          
          <div className="flex items-center gap-2 mb-3 bg-black/40 p-2 rounded-lg border border-gray-800">
            <input
              type="checkbox"
              checked={appSelectedOrgs.length === allOrgs.length && allOrgs.length > 0}
              onChange={(e) => {
                if (e.target.checked) setAppSelectedOrgs(allOrgs.map(o => o.id));
                else setAppSelectedOrgs([]);
              }}
              className="w-3.5 h-3.5 cursor-pointer"
              style={{ accentColor: wsColor.primary }}
            />
            <span className="text-xs text-gray-300 font-mono font-bold">Select All ({allOrgs.length})</span>
          </div>

          <div className="max-h-32 overflow-y-auto space-y-1 pr-2 darkwave-scrollbar border border-gray-900 rounded-lg p-1 bg-black/20">
            {allOrgs.map(org => (
              <label key={org.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/80 p-2 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={appSelectedOrgs.includes(org.id)}
                  onChange={(e) => {
                    if (e.target.checked) setAppSelectedOrgs(prev => [...prev, org.id]);
                    else setAppSelectedOrgs(prev => prev.filter(id => id !== org.id));
                  }}
                  className="w-3 h-3 cursor-pointer"
                  style={{ accentColor: wsColor.primary }}
                />
                <span className={`text-xs font-mono truncate ${org.id === organization?.id ? 'font-bold' : 'text-gray-400'}`} style={{ color: org.id === organization?.id ? wsColor.primary : undefined }}>
                  {org.name}
                </span>
              </label>
            ))}
          </div>

          {/* ⚡ Auto-deploy toggle for MiniApps */}
          <div className="flex items-center justify-between p-3 mt-4 mb-2 bg-black/40 border border-gray-800 rounded-lg transition-colors hover:border-gray-700">
            <div>
              <h4 className="text-sm font-mono text-white">Auto-Deploy to New Orgs</h4>
              <p className="text-xs text-gray-500 font-mono mt-0.5">Automatically provision this app for all future organizations.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={appAutoDeploy} onChange={e => setAppAutoDeploy(e.target.checked)} />
              <div className={`w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${appAutoDeploy ? '' : 'peer-checked:bg-cyan-500'}`} style={appAutoDeploy ? { backgroundColor: wsColor.primary } : {}}></div>
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => handleSaveAppDistribution(app)}
              disabled={isSavingAppDist}
              className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-50"
              style={{
                backgroundColor: `rgba(${wsColor.rgb}, 0.15)`,
                border: `1px solid ${wsColor.primary}`,
                color: wsColor.primary,
              }}
            >
              {isSavingAppDist ? 'Saving...' : 'Sync Distribution'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const handleCloseModal = () => {
    if (needsReload) {
      window.location.reload();
    } else {
      onClose();
    }
  };

  const tabs = [
    { id: 'theme' as const, label: 'Theme & Colors' },
    { id: 'apps' as const, label: 'MiniApps' },
  ];
  
  if (isPlatformOwner) {
    tabs.push({ id: 'visibility' as const, label: 'Workspace' });
  }
  
  tabs.push({ id: 'advanced' as const, label: 'Advanced' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-black rounded-2xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          border: `1px solid rgba(${wsColor.rgb}, 0.3)`,
          boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.15)`,
        }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b"
          style={{
            borderColor: `rgba(${wsColor.rgb}, 0.2)`,
            background: `linear-gradient(to right, black, rgba(${wsColor.rgb}, 0.05), black)`,
          }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg blur-md animate-pulse" style={{ background: `rgba(${wsColor.rgb}, 0.2)` }} />
              <SettingsIcon size={24} className="relative" style={{ color: wsColor.primary, filter: `drop-shadow(0 0 8px ${wsColor.primary})` }} />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-white">
                Workspace Settings
              </h2>
              <p className="text-xs font-mono" style={{ color: wsColor.primary }}>
                {workspaceName}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-2 text-gray-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b" style={{ borderColor: `rgba(${wsColor.rgb}, 0.15)` }}>
          {tabs.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className="flex-1 px-4 py-3 text-sm font-mono transition-all"
              style={{
                color: activeSection === section.id ? wsColor.primary : '#6b7280',
                borderBottom: activeSection === section.id ? `2px solid ${wsColor.primary}` : '2px solid transparent',
                background: activeSection === section.id ? `rgba(${wsColor.rgb}, 0.05)` : 'transparent',
              }}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-5 mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckIcon size={16} className="text-green-400" />
            <span className="text-green-400 text-sm font-mono">{successMessage}</span>
          </div>
        )}

        {/* Theme Section */}
        {activeSection === 'theme' && (
          <div className="flex-1 overflow-y-auto px-5 py-6 darkwave-scrollbar">
            <div className="mb-6">
              <h3 className="text-white font-mono font-medium mb-2">Accent Color</h3>
              <p className="text-gray-500 text-sm font-mono mb-4">
                Choose a theme color for this workspace. This color will be applied to the navigation, headers, and all UI elements.
              </p>
              
              <div className="grid grid-cols-4 gap-3">

                {ACCENT_COLORS.map(color => {
                  const isSelected = currentColorName === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => canManage && handleColorChange(color.name)}
                      disabled={!canManage}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        canManage ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed opacity-60'
                      }`}
                      style={{
                        borderColor: isSelected ? color.hex : `rgba(${color.rgb}, 0.3)`,
                        background: isSelected
                          ? `linear-gradient(135deg, rgba(${color.rgb}, 0.15), rgba(0,0,0,0.95))`
                          : 'rgba(0,0,0,0.5)',
                        boxShadow: isSelected ? `0 0 20px rgba(${color.rgb}, 0.3), inset 0 0 20px rgba(${color.rgb}, 0.05)` : 'none',
                      }}
                    >
                      {/* Color swatch */}
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0 relative"
                        style={{
                          background: `linear-gradient(135deg, ${color.hex}, ${color.hex}80)`,
                          boxShadow: `0 0 12px rgba(${color.rgb}, 0.4)`,
                        }}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <CheckIcon size={20} className="text-black drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                      
                      {/* Color name */}
                      <div className="text-left">
                        <p className="text-white font-mono text-sm font-medium">{color.label}</p>
                        <p className="text-gray-500 font-mono text-xs">{color.hex}</p>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color.hex, boxShadow: `0 0 8px ${color.hex}` }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 rounded-xl border" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.05), rgba(0,0,0,0.95))` }}>
              <h4 className="text-sm font-mono text-gray-400 mb-3">Preview</h4>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: `1.5px solid rgba(${wsColor.rgb}, 0.5)`, background: `rgba(${wsColor.rgb}, 0.15)` }}>
                  <SettingsIcon size={16} style={{ color: wsColor.primary }} />
                </div>
                <span className="font-mono font-medium" style={{ color: wsColor.primary }}>{workspaceName}</span>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: `rgba(${wsColor.rgb}, 0.2)`, border: `1px solid rgba(${wsColor.rgb}, 0.4)`, color: wsColor.primary }}>Active Tab</div>
                <div className="px-3 py-1.5 rounded-lg text-xs font-mono text-gray-500 border border-gray-700">Inactive Tab</div>
              </div>
            </div>
          </div>
        )}

        {/* MiniApp Visibility Section */}
        {activeSection === 'apps' && (
          <>
            {/* Stats Bar */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-800 bg-gray-950/50">
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wsColor.primary, boxShadow: `0 0 6px ${wsColor.primary}` }} />
                <span className="text-gray-400">Total: <span className="text-white">{miniApps.length}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.6)]" />
                <span className="text-gray-400">Visible: <span className="text-green-400">{visibleCount}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.6)]" />
                <span className="text-gray-400">Hidden: <span className="text-red-400">{hiddenCount}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <ShieldIcon size={12} className="text-purple-400" />
                <span className="text-gray-400">Preset: <span className="text-purple-400">{presetCount}</span></span>
              </div>
              <div className="flex-1" />
              <button
                onClick={fetchMiniApps}
                className="p-1.5 text-gray-500 rounded-lg transition-all"
                style={{ color: wsColor.primary }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = `rgba(${wsColor.rgb}, 0.1)`; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
                title="Refresh"
              >
                <RefreshIcon size={16} />
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
              <div className="relative flex-1">
                <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search MiniApps..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white text-sm font-mono placeholder-gray-600 focus:outline-none transition-all"
                  style={{ ['--focus-border' as any]: `rgba(${wsColor.rgb}, 0.5)` }}
                  onFocus={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.5)`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = ''; }}
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-950 border border-gray-800 rounded-lg p-1">
                {(['all', 'visible', 'hidden'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className="px-3 py-1.5 rounded-md text-xs font-mono transition-all border"
                    style={{
                      color: filterMode === mode ? wsColor.primary : '#6b7280',
                      background: filterMode === mode ? `rgba(${wsColor.rgb}, 0.15)` : 'transparent',
                      borderColor: filterMode === mode ? `rgba(${wsColor.rgb}, 0.4)` : 'transparent',
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* MiniApp List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 darkwave-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, borderTopColor: wsColor.primary }} />
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-12">
                  <FileIcon size={48} className="text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-mono">
                    {searchQuery ? 'No MiniApps match your search' : 'No MiniApps in this workspace'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredApps.map((app, index) => renderAppRow(app, index))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Workspace Visibility Section */}
        {activeSection === 'visibility' && isPlatformOwner && (
          <div className="flex-1 overflow-y-auto px-5 py-6 darkwave-scrollbar flex flex-col">
            <h3 className="text-white font-mono font-medium mb-2">Workspace Distribution</h3>
            <p className="text-gray-500 text-sm font-mono mb-6">
              Manage which organizations have access to this workspace. Checking a box will deploy a copy of this workspace to their dashboard, and unchecking will instantly revoke it.
            </p>

            <input
              type="text"
              placeholder="Search organizations..."
              value={orgSearchQuery}
              onChange={(e) => setOrgSearchQuery(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300 mb-4 focus:outline-none focus:border-cyan-500/50 font-mono"
              style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
              onFocus={e => { e.currentTarget.style.borderColor = wsColor.primary; }}
              onBlur={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.3)`; }}
            />

            <div className="flex items-center gap-2 mb-4 bg-gray-900/40 p-3 rounded-lg border" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
              <input
                type="checkbox"
                checked={selectedOrgIds.length === allOrgs.length && allOrgs.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedOrgIds(allOrgs.map(o => o.id));
                  } else {
                    setSelectedOrgIds([]);
                  }
                }}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: wsColor.primary }}
              />
              <span className="text-sm text-gray-300 font-mono font-bold">Select All Organizations ({allOrgs.length})</span>
            </div>

            <div className="flex-1 min-h-[200px] overflow-y-auto space-y-1 pr-2 darkwave-scrollbar border border-gray-900 rounded-lg p-2">
              {allOrgs.filter(o => o.name.toLowerCase().includes(orgSearchQuery.toLowerCase())).map(org => (
                <label key={org.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/80 p-3 rounded-md transition-colors">
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
                    className="w-4 h-4 cursor-pointer"
                    style={{ accentColor: wsColor.primary }}
                  />
                  <span className={`text-sm font-mono truncate ${org.id === organization?.id ? 'font-bold' : 'text-gray-400'}`} style={{ color: org.id === organization?.id ? wsColor.primary : undefined }}>
                    {org.name} {org.id === organization?.id && '(Current)'}
                  </span>
                </label>
              ))}
            </div>

            {/* ⚡ Auto-deploy toggle for Workspaces */}
            <div className="flex items-center justify-between p-3 mt-4 mb-2 bg-black/40 border border-gray-800 rounded-lg transition-colors hover:border-gray-700">
              <div>
                <h4 className="text-sm font-mono text-white">Auto-Deploy to New Orgs</h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Automatically provision this workspace for all future organizations.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={wsAutoDeploy} onChange={e => setWsAutoDeploy(e.target.checked)} />
                <div className={`w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${wsAutoDeploy ? '' : 'peer-checked:bg-cyan-500'}`} style={wsAutoDeploy ? { backgroundColor: wsColor.primary } : {}}></div>
              </label>
            </div>

            <div className="pt-4 mt-2 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">
                {selectedOrgIds.length} organizations selected
              </span>
              <button
                onClick={handleSaveVisibility}
                disabled={isSavingVisibility}
                className="px-6 py-2.5 rounded-lg text-sm font-mono font-bold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: `rgba(${wsColor.rgb}, 0.15)`,
                  border: `1px solid ${wsColor.primary}`,
                  color: wsColor.primary,
                  boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.2)`
                }}
              >
                {isSavingVisibility ? 'Syncing Access...' : 'Save Visibility'}
              </button>
            </div>
          </div>
        )}

        {/* Advanced Section */}
        {activeSection === 'advanced' && (
          <div className="flex-1 overflow-y-auto px-5 py-6 darkwave-scrollbar space-y-8">
            
            {/* General Info */}
            <div className="space-y-5">
              <h3 className="text-white font-mono font-medium mb-4 pb-2 border-b" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}>General Settings</h3>
              
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Workspace Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={!canManage}
                  className="w-full bg-gray-950 border rounded-lg px-4 py-3 text-white font-mono focus:outline-none transition-all disabled:opacity-50"
                  style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
                  onFocus={e => { e.currentTarget.style.borderColor = wsColor.primary; e.currentTarget.style.boxShadow = `0 0 15px rgba(${wsColor.rgb}, 0.2)`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.3)`; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Workspace Icon Picker */}
              <div className="bg-gray-900/50 rounded-xl p-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.2)` }}>
                <h4 className="text-sm font-mono font-medium text-white mb-3">Workspace Icon</h4>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => canManage && setShowIconPicker(true)}
                    disabled={!canManage}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${canManage ? 'hover:scale-105 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                    style={{ border: `2px solid rgba(${wsColor.rgb}, 0.4)`, background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.1), rgba(0,0,0,0.8))` }}
                  >
                    {(() => {
                      const SelectedIconComp = getMiniAppIcon(editedIcon);
                      return <SelectedIconComp size={28} style={{ color: wsColor.primary }} />;
                    })()}
                  </button>
                  <div>
                    <button 
                      onClick={() => canManage && setShowIconPicker(true)} 
                      disabled={!canManage} 
                      className={`text-sm font-mono transition-all ${canManage ? 'hover:underline cursor-pointer' : 'cursor-not-allowed'}`} 
                      style={{ color: wsColor.primary }}
                    >
                      Change Icon
                    </button>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">Click to choose from icon library</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveAdvanced}
                  disabled={!canManage || isSavingAdvanced || !editedName.trim()}
                  className="px-6 py-2.5 rounded-lg text-sm font-mono font-bold transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: `rgba(${wsColor.rgb}, 0.15)`,
                    border: `1px solid ${wsColor.primary}`,
                    color: wsColor.primary,
                    boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.2)`
                  }}
                >
                  {isSavingAdvanced ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="space-y-4 pt-6 border-t border-red-500/20">
              <h3 className="text-red-400 font-mono font-medium mb-2 flex items-center gap-2">
                <ShieldIcon size={16} /> Danger Area
              </h3>
              <p className="text-gray-500 text-sm font-mono mb-4">
                Deleting this workspace will permanently remove all associated configurations and access. This action cannot be undone.
              </p>

              {showDeleteConfirm ? (
                <div className="p-5 bg-red-950/20 border border-red-500/30 rounded-xl space-y-4 animate-in fade-in zoom-in-95">
                  <p className="text-red-400 font-mono text-sm font-bold text-center">Are you absolutely sure?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 transition-colors font-mono text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteWorkspace}
                      disabled={isSavingAdvanced}
                      className="flex-1 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all font-mono font-bold text-sm"
                    >
                      {isSavingAdvanced ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!canManage || WORKSPACE_ID_MAP[workspaceSlug] !== undefined} 
                  className="px-6 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={WORKSPACE_ID_MAP[workspaceSlug] !== undefined ? "Global preset workspaces cannot be deleted." : ""}
                >
                  Delete Workspace
                </button>
              )}
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800 bg-gray-950/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 font-mono">
              {isPlatformOwner
                ? 'Platform Owner: Full workspace settings access'
                : isOrgAdmin
                ? 'Org Admin: Can manage workspace settings'
                : 'View only — contact your admin to change settings'}
            </p>
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 bg-gray-900 border rounded-lg text-gray-300 text-sm font-mono transition-all"
              style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.5)`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.3)`; }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
      
      {/* Icon Picker Modal */}
      <IconPickerModal 
        isOpen={showIconPicker} 
        onClose={() => setShowIconPicker(false)}
        onSelect={(iconName) => {
          setEditedIcon(iconName);
          setShowIconPicker(false);
        }} 
        currentIcon={editedIcon} 
        wsColor={wsColor} 
      />

    </div>
  );
};

export default WorkspaceSettings;