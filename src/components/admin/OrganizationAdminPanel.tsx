/**
 * OrganizationAdminPanel - Filtered version of PlatformOwnerPanel for Org Admins
 * Fetches feature_toggles and only shows enabled features.
 * Never shows: Quantum, Q-CORE Security, Database backend, Platform Users
 * Uses emerald/green NuDarkwave accent colors
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldIcon, UsersIcon, SettingsIcon, CloseIcon, SearchIcon,
  TrashIcon, EditIcon, EyeIcon, EyeOffIcon, BarChartIcon, BuildIcon,
  CheckIcon, HistoryIcon,
  MaximizeIcon, MinimizeIcon, InviteIcon, CreditCardIcon,
  DownloadIcon, PlusIcon
} from '@/components/icons/Icons';
import { OrganizationUser, Workspace, OrganizationRole, SUBSCRIPTION_TIERS } from '@/types';
import { FEATURES } from '@/config/features';
import AuditLogViewer from './AuditLogViewer';
import IntegrationsPanel from '@/components/integrations/IntegrationsPanel';
import { ConnectionStatusDot, SyncStatusPanel } from '@/components/connectivity/ConnectionBanner';
import ChangePasswordPanel from './ChangePasswordPanel';
import WorkspaceSettings from '@/components/workspace/WorkspaceSettings';

// Sync icon
const SyncIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

interface OrganizationAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  initialOpenPodio?: boolean;
}

interface FeatureToggle {
  feature_key: string;
  feature_name: string;
  feature_category: string;
  is_enabled_for_org_admins: boolean;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  date: string;
  pdf: string;
}

// Emerald Neon Stat Card
const EmeraldStatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.FC<{ size?: number; className?: string }>;
  glowColor: 'emerald' | 'cyan' | 'purple' | 'orange';
  onClick?: () => void;
}> = ({ label, value, icon: Icon, glowColor, onClick }) => {
  const colors = {
    emerald: { border: 'border-emerald-500/50', bg: 'bg-gradient-to-br from-emerald-950/40 to-black', text: 'text-emerald-400', icon: 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]' },
    cyan: { border: 'border-cyan-500/50', bg: 'bg-gradient-to-br from-cyan-950/40 to-black', text: 'text-cyan-400', icon: 'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]' },
    purple: { border: 'border-purple-500/50', bg: 'bg-gradient-to-br from-purple-950/40 to-black', text: 'text-purple-400', icon: 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]' },
    orange: { border: 'border-orange-500/50', bg: 'bg-gradient-to-br from-orange-950/40 to-black', text: 'text-orange-400', icon: 'text-orange-400 drop-shadow-[0_0_6px_rgba(255,153,0,0.6)]' },
  };
  const c = colors[glowColor];
  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border-2 p-5 transition-all duration-500 ${c.border} ${c.bg} ${onClick ? 'cursor-pointer hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]' : ''}`}
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400/60 rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400/60 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400/60 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400/60 rounded-br" />
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-mono uppercase tracking-wider">{label}</span>
        <Icon size={22} className={c.icon} />
      </div>
      <p className={`text-3xl font-bold font-mono ${c.text}`}>{value}</p>
    </div>
  );
};

// BLOCKED tabs that org admins should NEVER see
const BLOCKED_TABS = ['quantum', 'qcore_security', 'platform_users', 'feature_controls'];
const SYSTEM_PRESET_SLUGS = ['admin', 'accounting', 'personnel', 'main', 'data', 'security'];

const OrganizationAdminPanel: React.FC<OrganizationAdminPanelProps> = ({ isOpen, onClose, initialTab, initialOpenPodio }) => {
  const { organization: authOrg, user, isOrganizationAdmin, isPlatformOwner } = useAuth();
  const [organization, setOrganization] = useState<any>(authOrg); // Local state for fresh DB data
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'sync_offline'>('general');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeAppsCount, setActiveAppsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [featureToggles, setFeatureToggles] = useState<FeatureToggle[]>([]);

  // Users Search & Invite & Edit state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('workspace_regular_user');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<OrganizationRole>('workspace_regular_user');
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'idle' | 'suspended' | 'pending'>('active');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Workspaces Create & Settings state
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsColor, setNewWsColor] = useState('#10b981');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [wsSettingsTarget, setWsSettingsTarget] = useState<{ slug: string; name: string } | null>(null);

  // Billing state
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [newUserCount, setNewUserCount] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [switchingPlanTier, setSwitchingPlanTier] = useState<string | null>(null);

  // General Settings state
  const [editOrgName, setEditOrgName] = useState(authOrg?.name || '');
  const [editOrgLogo, setEditOrgLogo] = useState((authOrg as any)?.logo_url || '');
  const [editPrimaryColor, setEditPrimaryColor] = useState((authOrg as any)?.primary_color || '#06b6d4');
  const [editAccentColor, setEditAccentColor] = useState((authOrg as any)?.accent_color || '#3b82f6');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoadRef = useRef(true);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (isOpen && authOrg) {
      isFirstLoadRef.current = true;
      fetchData();
      fetchFeatureToggles();
      fetchTrialStatus();
    }
  }, [isOpen, authOrg?.id]);

  useEffect(() => {
    if (activeTab === 'billing' && organization) {
      fetchBillingData();
    }
  }, [activeTab, organization?.id]);

  const fetchData = async () => {
    if (!authOrg?.id) return;
    setIsLoading(true);
    try {
      const [usersRes, wsRes, orgRes] = await Promise.all([
        supabase.schema('app_private').from('organization_users').select('*').eq('organization_id', authOrg.id).order('created_at', { ascending: false }),
        db.from('workspaces').select('*').eq('organization_id', authOrg.id).order('display_order'),
        supabase.schema('app_private').from('organizations').select(`*, organization_logos!organization_id ( logo_url )`).eq('id', authOrg.id).maybeSingle()
      ]);

      if (usersRes.data) {
        const fetchedUsers = [...usersRes.data];
        const currentUserInList = fetchedUsers.some(u => u.email === (user as any)?.email);

        if (!currentUserInList && user && (isOrganizationAdmin() || (typeof isPlatformOwner === 'function' && isPlatformOwner()))) {
          const userEmail = (user as any).email || '';
          let displayName = (user as any).user_metadata?.full_name || (user as any).full_name;

          if (!displayName && userEmail) {
            displayName = userEmail.split('@')[0]
              .split(/[._-]/)
              .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
          } else if (!displayName) {
            displayName = 'Organization Admin';
          }

          fetchedUsers.unshift({
            id: (user as any).id || 'virtual-admin-id',
            organization_id: authOrg.id,
            email: userEmail,
            full_name: displayName,
            role: 'organization_admin',
            status: 'active',
            is_org_creator: true
          } as OrganizationUser);
        }
        setUsers(fetchedUsers);
      }

      if (wsRes.data) {
        const filteredWs = !FEATURES.ENABLE_PRESET_WORKSPACES_AND_APPS
          ? wsRes.data.filter((w: any) => {
              if (!SYSTEM_PRESET_SLUGS.includes(w.slug)) return true;
              const s = typeof w.settings === 'string' ? JSON.parse(w.settings || '{}') : (w.settings || {});
              return Boolean(s.is_custom_lite);
            })
          : wsRes.data;
        setWorkspaces(filteredWs);

        if (filteredWs.length > 0) {
          const wsIds = filteredWs.map((w: any) => w.id);
          const { count } = await db
            .from('mini_apps')
            .select('id', { count: 'exact', head: true })
            .in('workspace_id', wsIds);
          setActiveAppsCount(count ?? 0);
        } else {
          setActiveAppsCount(0);
        }
      }

      if (orgRes.data) {
        const fetchedOrg: any = { ...orgRes.data };
        const logoData = orgRes.data.organization_logos;
        const finalLogoUrl = Array.isArray(logoData)
          ? logoData[0]?.logo_url
          : (logoData as any)?.logo_url;
        fetchedOrg.logo_url = finalLogoUrl || fetchedOrg.logo_url || null;

        setOrganization(fetchedOrg);
        if (isFirstLoadRef.current) {
          setEditOrgName(fetchedOrg.name || '');
          setEditOrgLogo(fetchedOrg.logo_url || '');
          setEditPrimaryColor(fetchedOrg.primary_color || '#06b6d4');
          setEditAccentColor(fetchedOrg.accent_color || '#3b82f6');
          isFirstLoadRef.current = false;
        }
      }
    } catch (err) {
      console.error('Error fetching org data:', err);
    }
    setIsLoading(false);
  };

  const fetchFeatureToggles = async () => {
    try {
      const { data } = await db.from('feature_toggles').select('*');
      if (data) setFeatureToggles(data);
    } catch (err) { console.error('Error fetching toggles:', err); }
  };

  const fetchTrialStatus = async () => {
    try {
      const { data } = await supabase.functions.invoke('auto-charge-scheduler', {
        body: { action: 'get_trial_status', organizationId: authOrg?.id }
      });
      if (data && !data.error) setTrialStatus(data);
    } catch (err) { console.error('Error fetching trial:', err); }
  };

  const fetchBillingData = async () => {
    if (!organization?.stripe_customer_id) return;
    setIsLoadingBilling(true);
    try {
      const { data } = await supabase.functions.invoke('stripe-billing', {
        body: {
          action: 'get_invoices',
          customerId: organization.stripe_customer_id
        }
      });
      if (data?.invoices) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    }
    setIsLoadingBilling(false);
  };

  const isFeatureEnabled = (key: string): boolean => {
    const toggle = featureToggles.find(t => t.feature_key === key);
    return toggle ? toggle.is_enabled_for_org_admins : true;
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !inviteName.trim() || !organization) return;
    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          full_name: inviteName.trim(),
          role: inviteRole,
          org_id: organization.id
        }
      });

      if (error || data?.error) {
        const errMsg = data?.error || error?.message || '';
        if (errMsg.includes('already been registered')) {
          const { data: existingUser } = await supabase.schema('app_private')
            .from('organization_users')
            .select('id')
            .eq('email', inviteEmail.trim().toLowerCase())
            .limit(1)
            .maybeSingle();

          const insertPayload: any = {
            organization_id: organization.id,
            email: inviteEmail.trim().toLowerCase(),
            full_name: inviteName.trim(),
            role: inviteRole,
            status: 'active',
            is_org_creator: false
          };
          if (existingUser?.id) insertPayload.id = existingUser.id;

          const { error: insertError } = await supabase.schema('app_private')
            .from('organization_users')
            .insert(insertPayload);
          if (insertError) throw new Error(insertError.message);
        } else {
          // Fallback to direct table insert if Edge Function is unavailable
          const { error: fallbackError } = await db.from('organization_users').insert({
            organization_id: organization.id,
            email: inviteEmail.trim().toLowerCase(),
            full_name: inviteName.trim(),
            role: inviteRole,
            status: 'pending',
            is_org_creator: false,
          });
          if (fallbackError) throw new Error(errMsg || fallbackError.message);
        }
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('workspace_regular_user');
      fetchData();
    } catch (err: any) {
      console.error('Error inviting user:', err);
      alert(`Failed to invite user: ${err.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleOpenEditUser = (u: OrganizationUser) => {
    setEditingUser(u);
    setEditUserName(u.full_name || '');
    setEditUserRole(u.role);
    setEditUserStatus((u.status as any) || 'active');
  };

  const handleSaveEditUser = async () => {
    if (!editingUser || !organization) return;
    setIsSavingUser(true);
    try {
      const { error } = await supabase.schema('app_private')
        .from('organization_users')
        .update({
          full_name: editUserName.trim(),
          role: editUserRole,
          status: editUserStatus,
        })
        .eq('id', editingUser.id)
        .eq('organization_id', organization.id);

      if (error) throw error;
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      console.error('Error updating user:', err);
      alert(`Failed to update user: ${err.message}`);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from your organization?')) return;
    try {
      await supabase.schema('app_private')
        .from('organization_users')
        .delete()
        .eq('id', userId)
        .eq('organization_id', authOrg?.id);
      fetchData();
    } catch (err) {
      console.error('Error removing user:', err);
    }
  };

  const toggleWorkspaceVisibility = async (wsId: string, current: boolean) => {
    try {
      await db.from('workspaces').update({ is_visible: !current }).eq('id', wsId);
      fetchData();
    } catch (err) {
      console.error('Error toggling workspace visibility:', err);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim() || !organization?.id) return;
    setIsCreatingWs(true);
    try {
      const baseSlug = newWsName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `ws-${Date.now()}`;
      const slug = SYSTEM_PRESET_SLUGS.includes(baseSlug) ? `${baseSlug}-custom` : baseSlug;

      const { error } = await supabase.schema('app_private')
        .from('workspaces')
        .insert({
          organization_id: organization.id,
          name: newWsName.trim(),
          slug,
          icon: 'main',
          color: newWsColor,
          is_visible: true,
          display_order: workspaces.length + 1,
          settings: {
            is_custom_lite: true,
            color: newWsColor,
          },
        });

      if (error) throw error;
      setShowCreateWsModal(false);
      setNewWsName('');
      await fetchData();
      window.dispatchEvent(new CustomEvent('podioWorkspaceImported', { detail: { workspaceSlug: slug } }));
    } catch (err: any) {
      console.error('Error creating workspace:', err);
      alert(`Failed to create workspace: ${err.message}`);
    } finally {
      setIsCreatingWs(false);
    }
  };

  const handleDeleteWorkspace = async (ws: Workspace) => {
    if (!confirm(`Are you sure you want to delete the "${ws.name}" workspace and all of its apps? This cannot be undone.`)) return;
    try {
      await supabase.schema('app_private').from('mini_apps').delete().eq('workspace_id', ws.id);
      const { error } = await supabase.schema('app_private').from('workspaces').delete().eq('id', ws.id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting workspace:', err);
      alert(`Failed to delete workspace: ${err.message}`);
    }
  };

  const handleAddUsers = async () => {
    if (!organization || newUserCount < 1) return;
    setIsProcessingPayment(true);
    try {
      const { data } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'add_users',
          organizationId: organization.id,
          email: (user as any)?.email || '',
          userCount: newUserCount,
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: `${window.location.origin}?checkout=cancelled`
        }
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Stripe checkout session could not be created. Please verify Stripe configuration.');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      alert(`Payment error: ${error.message}`);
    }
    setIsProcessingPayment(false);
  };

  const handleManageBilling = async () => {
    if (!organization) return;
    try {
      if (organization.stripe_customer_id) {
        const { data } = await supabase.functions.invoke('stripe-billing', {
          body: {
            action: 'create_portal',
            customerId: organization.stripe_customer_id,
            returnUrl: window.location.href
          }
        });
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }
      // Fallback: create subscription checkout session to attach a payment method
      const currentTier = organization.subscription_tier || 'basic';
      const { data } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'subscription',
          tier: currentTier,
          organizationId: organization.id,
          email: (user as any)?.email || '',
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: `${window.location.origin}?checkout=cancelled`
        }
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Billing portal is not yet connected for this account.');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    }
  };

  const handleSelectPlan = async (tierKey: string) => {
    if (!organization) return;
    const tierInfo = SUBSCRIPTION_TIERS[tierKey as keyof typeof SUBSCRIPTION_TIERS];
    if (!tierInfo) return;

    if (!confirm(`Switch your organization subscription to the ${tierInfo.name} Plan ($${tierInfo.price}/mo)?`)) return;

    setSwitchingPlanTier(tierKey);
    try {
      // First attempt Stripe checkout if not yet subscribed
      if (organization.stripe_customer_id) {
        const { data } = await supabase.functions.invoke('stripe-checkout', {
          body: {
            type: 'subscription',
            tier: tierKey,
            organizationId: organization.id,
            email: (user as any)?.email || '',
            successUrl: `${window.location.origin}?checkout=success`,
            cancelUrl: `${window.location.origin}?checkout=cancelled`
          }
        });
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      // Direct DB update for subscription tier & monthly_base_price
      const { error } = await supabase.schema('app_private')
        .from('organizations')
        .update({
          subscription_tier: tierKey,
          monthly_base_price: tierInfo.price,
        })
        .eq('id', organization.id);

      if (error) throw error;

      const updatedOrg = {
        ...organization,
        subscription_tier: tierKey,
        plan_tier: tierKey,
        monthly_base_price: tierInfo.price,
      };
      setOrganization(updatedOrg);
      localStorage.setItem('bos_organization', JSON.stringify(updatedOrg));
      alert(`Successfully switched to the ${tierInfo.name} Plan!`);
    } catch (err: any) {
      console.error('Error switching plan:', err);
      alert(`Failed to switch plan: ${err.message}`);
    } finally {
      setSwitchingPlanTier(null);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization) return;

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

      setEditOrgLogo(publicUrl);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveGeneral = async () => {
    if (!organization) return;
    setIsSavingGeneral(true);
    try {
      const { error: orgError } = await supabase.schema('app_private')
        .from('organizations')
        .update({
          name: editOrgName.trim(),
          primary_color: editPrimaryColor,
          accent_color: editAccentColor
        })
        .eq('id', organization.id);

      if (orgError) throw new Error(`Org Update Failed: ${orgError.message}`);

      if (editOrgLogo) {
        const { error: logoLinkError } = await supabase
          .schema('app_private')
          .from('organization_logos')
          .upsert({
            organization_id: organization.id,
            logo_url: editOrgLogo,
            uploaded_by: (user as any)?.id || (user as any)?.email,
          }, {
            onConflict: 'organization_id'
          });

        if (logoLinkError) throw new Error(`Logo Link Failed: ${logoLinkError.message}`);
      }

      const updatedOrg = {
        ...organization,
        name: editOrgName.trim(),
        logo_url: editOrgLogo,
        primary_color: editPrimaryColor,
        accent_color: editAccentColor
      };
      setOrganization(updatedOrg);
      localStorage.setItem('bos_organization', JSON.stringify(updatedOrg));

      const cachedPlatOrg = localStorage.getItem('bos_platform_organization');
      if (cachedPlatOrg) {
        const parsedPlatOrg = JSON.parse(cachedPlatOrg);
        if (parsedPlatOrg.id === organization.id) {
          localStorage.setItem('bos_platform_organization', JSON.stringify(updatedOrg));
        }
      }

      alert('Organization settings saved successfully!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving general settings:', error);
      alert(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) panelRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  if (!isOpen) return null;

  // Build tabs - filter by feature toggles and blocked list
  const allTabs = [
    { id: 'overview', label: 'Overview', icon: BarChartIcon, color: 'emerald', featureKey: 'tab_overview' },
    { id: 'users', label: 'Users', icon: UsersIcon, color: 'emerald', featureKey: 'tab_users' },
    { id: 'workspaces', label: 'Workspaces', icon: ShieldIcon, color: 'cyan', featureKey: 'tab_workspaces' },
    { id: 'billing', label: 'Billing', icon: CreditCardIcon, color: 'green', featureKey: 'tab_billing' },
    { id: 'audit_logs', label: 'Audit Logs', icon: HistoryIcon, color: 'orange', featureKey: 'tab_audit_logs' },
    { id: 'integrations', label: 'Integrations', icon: BuildIcon, color: 'cyan', featureKey: 'tab_integrations' },
    { id: 'sync_offline', label: 'Sync & Offline', icon: SyncIcon, color: 'purple', featureKey: 'tab_sync_offline' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, color: 'emerald', featureKey: 'tab_settings' },
  ];

  const visibleTabs = allTabs.filter(t => !BLOCKED_TABS.includes(t.id) && isFeatureEnabled(t.featureKey));

  const tabColorMap: Record<string, { text: string; textActive: string }> = {
    emerald: { text: 'text-gray-500', textActive: 'text-emerald-300' },
    cyan: { text: 'text-gray-500', textActive: 'text-cyan-300' },
    green: { text: 'text-gray-500', textActive: 'text-green-300' },
    orange: { text: 'text-gray-500', textActive: 'text-orange-300' },
    purple: { text: 'text-gray-500', textActive: 'text-purple-300' },
  };

  const rawTierKey = (organization?.plan_tier || organization?.subscription_tier || 'basic') as keyof typeof SUBSCRIPTION_TIERS;
  const additionalUsers = users.filter(u => u.role !== 'organization_admin').length;
  const totalUserCost = additionalUsers * 19;
  const baseCost = organization?.monthly_base_price || SUBSCRIPTION_TIERS[rawTierKey]?.price || 249;
  const totalMonthlyCost = baseCost + totalUserCost;

  const userRoles: { value: OrganizationRole; label: string }[] = [
    { value: 'organization_admin_manager', label: 'Admin Manager' },
    { value: 'organization_tech_manager', label: 'Tech Manager' },
    { value: 'organization_support_manager', label: 'Support Manager' },
    { value: 'organization_sales_manager', label: 'Sales Manager' },
    { value: 'organization_accounting_manager', label: 'Accounting Manager' },
    { value: 'organization_personnel_manager', label: 'Personnel Manager' },
    { value: 'organization_security_manager', label: 'Security Manager' },
    { value: 'organization_admin_user', label: 'Admin User' },
    { value: 'organization_tech_user', label: 'Tech User' },
    { value: 'organization_support_user', label: 'Support User' },
    { value: 'organization_sales_user', label: 'Sales User' },
    { value: 'organization_accounting_user', label: 'Accounting User' },
    { value: 'organization_personnel_user', label: 'Personnel User' },
    { value: 'organization_security_user', label: 'Security User' },
    { value: 'workspace_admin', label: 'Workspace Admin' },
    { value: 'workspace_regular_user', label: 'Regular User' },
    { value: 'workspace_light_user', label: 'Light User' },
    { value: 'workspace_guest', label: 'Guest' },
  ];

  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().replace(/_/g, ' ').includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50" ref={panelRef}>
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md alien-grid" onClick={onClose} />

      <div className={`absolute ${isFullscreen ? 'inset-0' : 'inset-2 md:inset-4 lg:inset-6'} bg-black border border-emerald-500/30 rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col`}>
        {/* Border glow */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 rounded-2xl border border-emerald-400/20" />
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 opacity-50" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-emerald-500/20 bg-gradient-to-r from-black via-emerald-950/20 to-black">
          <div className="flex items-center gap-4 z-10">
            <div className="relative">
              <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/50 flex items-center justify-center overflow-hidden">
                {editOrgLogo ? (
                  <img src={editOrgLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ShieldIcon size={24} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wide">
                <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">ORGANIZATION ADMIN CONSOLE</span>
                <span className="text-gray-500 mx-2">//</span>
                <span className="text-gray-300">{organization?.name || 'Organization'}</span>
              </h2>
              <p className="text-xs font-mono text-emerald-400/60 tracking-widest uppercase">
                [ Organization Administrator ]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 z-10">
            <ConnectionStatusDot showLabel className="mr-1 px-2 py-1 bg-gray-900/50 border border-gray-800 rounded-lg" />
            <button onClick={handleFullscreenToggle} className="relative p-2 text-gray-400 hover:text-emerald-400 rounded-lg border border-transparent hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
            </button>
            <button onClick={onClose} className="relative p-2 text-gray-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/50 hover:bg-red-500/10 transition-all" title="Close">
              <CloseIcon size={24} />
            </button>
          </div>
        </div>

        {/* Trial Warning Banner */}
        {trialStatus?.is_trial_active && trialStatus.days_remaining <= 7 && (
          <div className={`px-4 py-2 font-mono text-xs flex items-center justify-between ${
            trialStatus.days_remaining <= 1 ? 'bg-red-500/20 border-b border-red-500/30 text-red-400' :
            trialStatus.days_remaining <= 3 ? 'bg-orange-500/20 border-b border-orange-500/30 text-orange-400' :
            'bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-400'
          }`}>
            <span>
              {trialStatus.days_remaining <= 1 ? 'TRIAL EXPIRES TOMORROW' :
               trialStatus.days_remaining <= 3 ? `TRIAL EXPIRES IN ${trialStatus.days_remaining} DAYS` :
               `Free trial ends in ${trialStatus.days_remaining} days`}
              {' '} - Your {SUBSCRIPTION_TIERS[trialStatus.selected_tier as keyof typeof SUBSCRIPTION_TIERS]?.name || 'subscription'} will begin automatically.
            </span>
            <button
              onClick={() => setActiveTab('billing')}
              className="px-3 py-1 bg-white/10 rounded border border-white/20 hover:bg-white/20 transition-all"
            >
              Manage Billing
            </button>
          </div>
        )}

        {/* Tabs - Emerald cut-tab style */}
        <div className="flex gap-3 p-3 border-b border-emerald-500/20 bg-black/80 overflow-x-auto scrollbar-admin-emerald" style={{ scrollbarWidth: 'thin' }}>
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const colors = tabColorMap[tab.color] || tabColorMap.emerald;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`cut-tab cut-tab-emerald relative px-8 py-3.5 text-sm font-mono whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 flex-shrink-0 min-w-fit ${
                  isActive ? `cut-tab-active ${colors.textActive}` : `${colors.text} hover:text-gray-300`
                }`}
              >
                {isActive && <span className="cut-tab-shimmer-el" />}
                <span className="relative z-[1] flex items-center gap-2.5">
                  <TabIcon size={16} className="flex-shrink-0" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-black to-gray-950 scrollbar-admin-emerald">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <EmeraldStatCard label="Team Members" value={users.length} icon={UsersIcon} glowColor="emerald" onClick={() => setActiveTab('users')} />
                <EmeraldStatCard label="Workspaces" value={workspaces.length} icon={ShieldIcon} glowColor="cyan" onClick={() => setActiveTab('workspaces')} />
                <EmeraldStatCard label="Monthly Cost" value={`$${totalMonthlyCost}`} icon={BarChartIcon} glowColor="emerald" onClick={() => setActiveTab('billing')} />
                <EmeraldStatCard label="Active Apps" value={activeAppsCount} icon={BuildIcon} glowColor="orange" onClick={() => setActiveTab('workspaces')} />
              </div>

              {/* Organization Status */}
              <div className="relative rounded-xl border border-emerald-500/30 bg-black/80 p-6 overflow-hidden">
                <div className="absolute inset-0 hex-pattern opacity-30" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(0,255,0,0.8)] animate-pulse" />
                    <h3 className="text-lg font-mono font-bold text-white tracking-wide">ORGANIZATION STATUS</h3>
                    <span className="text-xs font-mono text-green-400 ml-auto">ALL SYSTEMS OPERATIONAL</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { label: 'Subscription', value: (organization?.plan_tier || organization?.subscription_tier || 'BASIC').toUpperCase(), status: 'active' },
                      { label: 'Domain', value: organization?.domain || 'N/A', status: 'verified' },
                      { label: 'Encryption', value: 'Q-CORE AES-256', status: 'active' },
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                        <p className="text-gray-500 text-xs font-mono uppercase mb-1">{item.label}</p>
                        <p className="text-xl font-mono font-bold text-emerald-400">{item.value}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]" />
                          <span className="text-xs font-mono text-green-400 uppercase">{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Users */}
              <div className="relative rounded-xl border border-emerald-500/30 bg-black/80 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    TEAM MEMBERS
                  </h3>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs font-mono text-emerald-400 hover:underline"
                  >
                    Manage All ({users.length}) →
                  </button>
                </div>
                <div className="space-y-3">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-sm font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                          {(u.full_name || 'U').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-white font-mono font-medium">{u.full_name}</p>
                          <p className="text-sm text-gray-500 font-mono">{u.email}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
                        u.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                      }`}>{u.status?.toUpperCase() || 'PENDING'}</span>
                    </div>
                  ))}
                  {users.length === 0 && <p className="text-gray-500 font-mono text-center py-8">No team members yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users by name, email, or role..."
                    className="w-full bg-black border border-emerald-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all font-mono"
                >
                  <InviteIcon size={18} /> Invite User
                </button>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-black/80 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-emerald-950/30 border-b border-emerald-500/20">
                    <tr>
                      <th className="text-left p-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">User</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Role</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Status</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Cost</th>
                      <th className="text-right p-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-sm font-mono font-bold">
                              {(u.full_name || 'U').split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <span className="text-white font-mono font-medium">{u.full_name}</span>
                              <p className="text-xs text-gray-500 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono text-gray-300">
                            {u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
                            u.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            u.status === 'suspended' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/30'
                          }`}>
                            {u.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="p-4 text-emerald-400 font-mono font-bold">
                          {u.role === 'organization_admin' ? `$${baseCost}/mo` : '$19/mo'}
                        </td>
                        <td className="p-4 text-right">
                          {u.role !== 'organization_admin' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                title="Edit User"
                              >
                                <EditIcon size={18} />
                              </button>
                              <button
                                onClick={() => handleRemoveUser(u.id)}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Remove User"
                              >
                                <TrashIcon size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-500 font-mono">
                      {userSearchQuery ? `No users matching "${userSearchQuery}"` : 'No users found'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WORKSPACES TAB */}
          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-mono font-bold">Organization Workspaces ({workspaces.length})</p>
                  <p className="text-gray-400 font-mono text-sm">Control which workspaces are visible to your team and configure workspace apps</p>
                </div>
                <button
                  onClick={() => setShowCreateWsModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-all font-mono text-sm"
                >
                  <PlusIcon size={16} /> Create Workspace
                </button>
              </div>

              {workspaces.length === 0 ? (
                <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-10 text-center">
                  <ShieldIcon size={36} className="text-emerald-500/50 mx-auto mb-3" />
                  <p className="text-white font-mono font-bold mb-1">No Workspaces Configured Yet</p>
                  <p className="text-gray-500 font-mono text-xs mb-4">
                    Create a new custom workspace or import workspaces from Podio in the Integrations tab.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowCreateWsModal(true)}
                      className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-lg font-mono text-xs hover:bg-emerald-500/30 transition-all"
                    >
                      + Create Workspace
                    </button>
                    <button
                      onClick={() => setActiveTab('integrations')}
                      className="px-4 py-2 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 rounded-lg font-mono text-xs hover:bg-cyan-500/25 transition-all"
                    >
                      Import from Podio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {workspaces.map((ws) => {
                    const isCustom = !SYSTEM_PRESET_SLUGS.includes(ws.slug);
                    return (
                      <div key={ws.id} className={`bg-gray-900/50 border rounded-xl p-4 transition-all ${ws.is_visible ? 'border-emerald-500/30' : 'border-gray-800 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ws.is_visible ? 'bg-emerald-500/20' : 'bg-gray-700'}`}>
                              <ShieldIcon size={20} className={ws.is_visible ? 'text-emerald-400' : 'text-gray-500'} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-white font-mono font-medium">{ws.name}</h3>
                                {!ws.is_visible && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">HIDDEN</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 font-mono">/{ws.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleWorkspaceVisibility(ws.id, ws.is_visible)}
                              className={`p-2 rounded-lg transition-colors ${ws.is_visible ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-gray-500 hover:bg-gray-700'}`}
                              title={ws.is_visible ? 'Hide Workspace from Team' : 'Show Workspace to Team'}
                            >
                              {ws.is_visible ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
                            </button>
                            <button
                              onClick={() => setWsSettingsTarget({ slug: ws.slug, name: ws.name })}
                              className="p-2 text-gray-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Workspace Settings & Mini-Apps"
                            >
                              <SettingsIcon size={20} />
                            </button>
                            {isCustom && (
                              <button
                                onClick={() => handleDeleteWorkspace(ws)}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete Workspace"
                              >
                                <TrashIcon size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Trial Status Banner */}
              {trialStatus?.is_trial_active && (
                <div className="relative rounded-xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 p-6 overflow-hidden">
                  <div className="absolute inset-0 hex-pattern opacity-10" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-mono font-bold text-white">Free Trial Active</h3>
                        <p className="text-emerald-400 font-mono text-sm">Full Expert Tier access during trial</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-mono font-bold text-emerald-400">{trialStatus.days_remaining}</p>
                        <p className="text-xs font-mono text-gray-500">days remaining</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all" style={{ width: `${((14 - trialStatus.days_remaining) / 14) * 100}%` }} />
                    </div>
                    <p className="text-gray-500 font-mono text-xs mt-2">
                      After trial: {SUBSCRIPTION_TIERS[trialStatus.selected_tier as keyof typeof SUBSCRIPTION_TIERS]?.name || 'Basic'} at ${SUBSCRIPTION_TIERS[trialStatus.selected_tier as keyof typeof SUBSCRIPTION_TIERS]?.price || 249}/mo
                    </p>
                  </div>
                </div>
              )}

              {/* Current Plan */}
              <div className="rounded-xl border border-emerald-500/30 bg-black/80 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-mono font-bold text-white">Current Subscription</h3>
                  <button
                    onClick={() => setShowAddUsersModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-all font-mono text-xs font-bold"
                  >
                    <PlusIcon size={16} /> Add User Seats
                  </button>
                </div>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Base Plan</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">${baseCost}<span className="text-sm text-gray-500">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Additional Users</p>
                    <p className="text-2xl font-bold text-white font-mono">{additionalUsers}<span className="text-sm text-gray-500"> users (${totalUserCost}/mo)</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Total Monthly</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">${totalMonthlyCost}<span className="text-sm text-gray-500">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Tier</p>
                    <p className="text-2xl font-bold text-white font-mono">{(organization?.plan_tier || organization?.subscription_tier || 'BASIC').toUpperCase()}</p>
                  </div>
                </div>
              </div>

              {/* Upgrade Options */}
              <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
                <h3 className="text-lg font-mono font-bold text-white mb-4">Available Plans</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
                    const isCurrent = (organization?.plan_tier || organization?.subscription_tier || 'basic') === key;
                    return (
                      <div key={key} className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                        isCurrent ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-gray-800 hover:border-gray-700'
                      }`}>
                        <div>
                          <h4 className="text-white font-mono font-bold text-lg mb-1">{tier.name}</h4>
                          <p className="text-emerald-400 font-mono text-2xl font-bold mb-3">${tier.price}<span className="text-sm text-gray-500">/mo</span></p>
                          <ul className="space-y-1.5 mb-4">
                            {tier.features.map((f, i) => (
                              <li key={i} className="text-gray-400 font-mono text-xs flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {isCurrent ? (
                          <div className="mt-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono text-center font-bold">
                            Current Plan
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectPlan(key)}
                            disabled={switchingPlanTier === key}
                            className="mt-3 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-xs font-mono hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                          >
                            {switchingPlanTier === key ? 'Switching...' : tier.price > (baseCost || 0) ? `Upgrade to ${tier.name}` : `Switch to ${tier.name}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method & Invoices */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-mono font-bold text-white">Payment Method</h3>
                    <button
                      onClick={handleManageBilling}
                      className="text-xs font-mono text-emerald-400 hover:underline"
                    >
                      {organization?.stripe_customer_id ? 'Manage in Stripe →' : 'Setup Billing →'}
                    </button>
                  </div>
                  {organization?.stripe_customer_id ? (
                    <div className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                      <CreditCardIcon size={24} className="text-emerald-400" />
                      <div>
                        <p className="text-white font-mono font-medium">Stripe Billing Connected</p>
                        <p className="text-xs font-mono text-gray-500 mt-0.5">Customer ID: {organization.stripe_customer_id}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CreditCardIcon size={36} className="text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 font-mono text-sm mb-3">No payment method on file</p>
                      <button
                        onClick={handleManageBilling}
                        className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 rounded-lg font-mono text-xs hover:bg-emerald-500/25 transition-all"
                      >
                        Add Payment Method
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
                  <h3 className="text-lg font-mono font-bold text-white mb-4">Payment History</h3>
                  {isLoadingBilling ? (
                    <p className="text-gray-500 font-mono text-sm text-center py-6">Loading invoices...</p>
                  ) : invoices.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                          <div>
                            <p className="text-white font-mono text-xs font-bold">Invoice #{inv.number}</p>
                            <p className="text-gray-500 font-mono text-[10px]">{new Date(inv.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-mono text-xs font-bold">${inv.amount.toFixed(2)}</span>
                            {inv.pdf && (
                              <a href={inv.pdf} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-white">
                                <DownloadIcon size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 font-mono text-sm text-center py-6">No invoices yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'audit_logs' && organization && (
            <AuditLogViewer organizationId={organization.id} />
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
            <IntegrationsPanel filterByToggles={featureToggles} isOrgAdmin initialOpenPodio={initialOpenPodio} />
          )}

          {/* SYNC & OFFLINE TAB */}
          {activeTab === 'sync_offline' && (
            <div className="space-y-6">
              <div className="relative rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 p-6 overflow-hidden">
                <div className="absolute inset-0 hex-pattern opacity-10" />
                <div className="relative z-10">
                  <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3 mb-2">
                    <SyncIcon size={20} className="text-emerald-400" />
                    Sync & Offline Management
                  </h3>
                  <p className="text-gray-400 font-mono text-sm">
                    Manage sync frequency, cached data, and offline operations for your organization.
                  </p>
                </div>
              </div>
              <SyncStatusPanel />
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Sub-tabs */}
              <div className="flex gap-2 pb-4 border-b border-gray-800">
                {[
                  { id: 'general', label: 'General & Branding', color: 'emerald' },
                  { id: 'sync_offline', label: 'Sync & Offline', color: 'cyan' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsSubTab(tab.id as any)}
                    className={`cut-tab cut-tab-emerald relative px-6 py-2.5 text-sm font-mono whitespace-nowrap transition-all duration-300 ${
                      settingsSubTab === tab.id ? 'cut-tab-active text-emerald-300' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {settingsSubTab === tab.id && <span className="cut-tab-shimmer-el" />}
                    <span className="relative z-[1]">{tab.label}</span>
                  </button>
                ))}
              </div>

              {settingsSubTab === 'general' && (
                <div className="space-y-6">
                  <div className="relative rounded-xl border border-emerald-500/50 bg-black overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 to-transparent" />
                    <div className="relative z-10 p-6">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
                        <div>
                          <h3 className="text-lg font-mono font-bold text-white">Organization Details & Branding</h3>
                          <p className="text-xs font-mono text-gray-400 mt-0.5">Customize your organization name, logo, and interface colors</p>
                        </div>
                        <button
                          onClick={handleSaveGeneral}
                          disabled={isSavingGeneral || isUploadingLogo}
                          className="px-5 py-2.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all font-mono text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                          <CheckIcon size={16} />
                          {isSavingGeneral ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>

                      {/* Logo Upload */}
                      <div className="flex items-start gap-6 mb-6">
                        <div className="w-20 h-20 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {editOrgLogo ? (
                            <img src={editOrgLogo} alt="Organization Logo" className="w-full h-full object-contain" />
                          ) : (
                            <ShieldIcon size={32} className="text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-mono font-bold text-white mb-1">Organization Logo</h4>
                          <p className="text-xs font-mono text-gray-500 mb-3">Recommended size: 256x256px. Max size: 2MB.</p>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingLogo}
                              className="px-4 py-2 bg-gray-900 border border-gray-700 hover:border-emerald-500/50 text-gray-200 text-xs font-mono rounded-lg transition-all disabled:opacity-50"
                            >
                              {isUploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                            </button>
                            {editOrgLogo && (
                              <button
                                onClick={() => setEditOrgLogo('')}
                                className="px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Organization Name</label>
                          <input
                            type="text"
                            value={editOrgName}
                            onChange={(e) => setEditOrgName(e.target.value)}
                            className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Domain</label>
                          <input
                            type="text"
                            value={organization?.domain || ''}
                            disabled
                            className="w-full max-w-md bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 text-gray-500 font-mono cursor-not-allowed"
                          />
                        </div>

                        {/* Theme Colors */}
                        <div className="pt-4 mt-4 border-t border-gray-800">
                          <h4 className="text-sm font-mono font-bold text-gray-300 mb-3">Theme Colors</h4>
                          <div className="flex flex-wrap gap-8">
                            <div>
                              <label className="block text-xs font-mono text-gray-400 mb-2">Primary Color</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={editPrimaryColor}
                                  onChange={(e) => setEditPrimaryColor(e.target.value)}
                                  className="w-10 h-10 rounded cursor-pointer bg-gray-950 border border-gray-700 p-0.5"
                                />
                                <span className="text-gray-300 font-mono text-sm uppercase">{editPrimaryColor}</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-mono text-gray-400 mb-2">Accent Color</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={editAccentColor}
                                  onChange={(e) => setEditAccentColor(e.target.value)}
                                  className="w-10 h-10 rounded cursor-pointer bg-gray-950 border border-gray-700 p-0.5"
                                />
                                <span className="text-gray-300 font-mono text-sm uppercase">{editAccentColor}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ChangePasswordPanel />
                </div>
              )}

              {settingsSubTab === 'sync_offline' && (
                <div className="space-y-6">
                  <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 p-6 overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3 mb-2">
                        <SyncIcon size={20} className="text-cyan-400" />
                        Organization Sync Settings
                      </h3>
                      <p className="text-gray-400 font-mono text-sm">Configure sync frequency and offline behavior for your organization.</p>
                    </div>
                  </div>
                  <SyncStatusPanel />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-black border border-emerald-500/50 rounded-xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 to-transparent rounded-xl pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-lg font-mono font-bold text-white mb-6 flex items-center gap-3">
                <InviteIcon size={20} className="text-emerald-400" />
                Invite Team Member
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Full Name</label>
                  <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all" placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Email</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all" placeholder={`user@${organization?.domain || 'company.com'}`} />
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as OrganizationRole)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all">
                    {userRoles.map((role) => (<option key={role.value} value={role.value}>{role.label} ($19/mo)</option>))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 transition-all font-mono">Cancel</button>
                  <button
                    onClick={handleInviteUser}
                    disabled={isInviting || !inviteName.trim() || !inviteEmail.trim()}
                    className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all font-mono disabled:opacity-50"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invite'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative bg-black border border-emerald-500/50 rounded-xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                  <EditIcon size={18} className="text-emerald-400" />
                  Edit Team Member
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                  <CloseIcon size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Email</label>
                  <input type="text" value={editingUser.email} disabled className="w-full bg-gray-950/60 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-500 font-mono text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Role</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as OrganizationRole)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    {userRoles.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Status</label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="idle">Idle</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditUser}
                    disabled={isSavingUser || !editUserName.trim()}
                    className="flex-1 py-2.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/30 font-mono text-sm font-bold disabled:opacity-50"
                  >
                    {isSavingUser ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateWsModal(false)} />
          <div className="relative bg-black border border-emerald-500/50 rounded-xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                  <PlusIcon size={18} className="text-emerald-400" />
                  Create Workspace
                </h3>
                <button onClick={() => setShowCreateWsModal(false)} className="text-gray-400 hover:text-white">
                  <CloseIcon size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Workspace Name</label>
                  <input
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="e.g. Client Operations"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newWsColor}
                      onChange={(e) => setNewWsColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-gray-950 border border-gray-700 p-0.5"
                    />
                    <span className="text-gray-300 font-mono text-sm uppercase">{newWsColor}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowCreateWsModal(false)} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={isCreatingWs || !newWsName.trim()}
                    className="flex-1 py-2.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/30 font-mono text-sm font-bold disabled:opacity-50"
                  >
                    {isCreatingWs ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Users Modal */}
      {showAddUsersModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddUsersModal(false)} />
          <div className="relative bg-black border border-emerald-500/50 rounded-xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <h3 className="text-lg font-mono font-bold text-white mb-4">Add User Seats</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">Number of Users</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNewUserCount(Math.max(1, newUserCount - 1))}
                    className="w-10 h-10 bg-gray-900 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors font-mono"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={newUserCount}
                    onChange={(e) => setNewUserCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white text-center font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => setNewUserCount(newUserCount + 1)}
                    className="w-10 h-10 bg-gray-900 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors font-mono"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 font-mono">
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-gray-400">Price per user</span>
                  <span className="text-white">$19/mo</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-300">Total</span>
                  <span className="text-emerald-400">${newUserCount * 19}/mo</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddUsersModal(false)}
                  className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 transition-colors font-mono text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUsers}
                  disabled={isProcessingPayment}
                  className="flex-1 py-2.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50 font-mono text-sm font-bold"
                >
                  {isProcessingPayment ? 'Processing...' : 'Continue to Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Settings Modal */}
      {wsSettingsTarget && (
        <WorkspaceSettings
          isOpen={Boolean(wsSettingsTarget)}
          onClose={() => {
            setWsSettingsTarget(null);
            fetchData();
          }}
          workspaceSlug={wsSettingsTarget.slug}
          workspaceName={wsSettingsTarget.name}
        />
      )}
    </div>
  );
};

export default OrganizationAdminPanel;
