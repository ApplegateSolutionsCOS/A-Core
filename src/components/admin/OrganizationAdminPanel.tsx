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
import { useConnection } from '@/contexts/ConnectionContext';
import {
  ShieldIcon, UsersIcon, SettingsIcon, CloseIcon, SearchIcon,
  TrashIcon, EditIcon, EyeIcon, EyeOffIcon, BarChartIcon, BuildIcon,
  CheckIcon, LockIcon, KeyIcon, HistoryIcon, ActivityIcon,
  MaximizeIcon, MinimizeIcon, PopoutIcon, InviteIcon, CreditCardIcon,
  DownloadIcon
} from '@/components/icons/Icons';
import { Organization, OrganizationUser, Workspace, OrganizationRole, SUBSCRIPTION_TIERS } from '@/types';
import AuditLogViewer from './AuditLogViewer';
import IntegrationsPanel from '@/components/integrations/IntegrationsPanel';
import { ConnectionStatusDot, SyncStatusPanel } from '@/components/connectivity/ConnectionBanner';
import ChangePasswordPanel from './ChangePasswordPanel';

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
}

interface FeatureToggle {
  feature_key: string;
  feature_name: string;
  feature_category: string;
  is_enabled_for_org_admins: boolean;
}

// Emerald Neon Stat Card
const EmeraldStatCard: React.FC<{
  label: string; value: string | number;
  icon: React.FC<{ size?: number; className?: string }>;
  glowColor: 'emerald' | 'cyan' | 'purple' | 'orange';
  delay?: number;
}> = ({ label, value, icon: Icon, glowColor, delay = 0 }) => {
  const colors = {
    emerald: { border: 'border-emerald-500/50', bg: 'bg-gradient-to-br from-emerald-950/40 to-black', text: 'text-emerald-400', icon: 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]' },
    cyan: { border: 'border-cyan-500/50', bg: 'bg-gradient-to-br from-cyan-950/40 to-black', text: 'text-cyan-400', icon: 'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]' },
    purple: { border: 'border-purple-500/50', bg: 'bg-gradient-to-br from-purple-950/40 to-black', text: 'text-purple-400', icon: 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]' },
    orange: { border: 'border-orange-500/50', bg: 'bg-gradient-to-br from-orange-950/40 to-black', text: 'text-orange-400', icon: 'text-orange-400 drop-shadow-[0_0_6px_rgba(255,153,0,0.6)]' },
  };
  const c = colors[glowColor];
  return (
    <div className={`relative rounded-xl border-2 p-5 transition-all duration-500 ${c.border} ${c.bg}`}>
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

const OrganizationAdminPanel: React.FC<OrganizationAdminPanelProps> = ({ isOpen, onClose }) => {
  const { organization: authOrg, user } = useAuth();
  const [organization, setOrganization] = useState<any>(authOrg); // Local state for fresh DB data
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'sync_offline'>('general');
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [featureToggles, setFeatureToggles] = useState<FeatureToggle[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('workspace_regular_user');
  const [inviteName, setInviteName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Trial status
  const [trialStatus, setTrialStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen && authOrg) {
      fetchData();
      fetchFeatureToggles();
      fetchTrialStatus();
    }
  }, [isOpen, authOrg]);

  // ... (fullscreen listener)

  const fetchData = async () => {
    if (!authOrg) return;
    setIsLoading(true);
    try {
      const [usersRes, wsRes, orgRes] = await Promise.all([
        db.from('organization_users').select('*').eq('organization_id', authOrg.id).order('created_at', { ascending: false }),
        db.from('workspaces').select('*').eq('organization_id', authOrg.id).order('display_order'),
        db.from('organizations').select('*').eq('id', authOrg.id).single() // Fetch fresh org data!
      ]);
      
      if (usersRes.data) setUsers(usersRes.data);
      if (wsRes.data) setWorkspaces(wsRes.data);
      if (orgRes.data) setOrganization(orgRes.data); // Override cached context with live DB data
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

  const isFeatureEnabled = (key: string): boolean => {
    const toggle = featureToggles.find(t => t.feature_key === key);
    return toggle ? toggle.is_enabled_for_org_admins : true; // Default enabled if no toggle exists
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteName || !organization) return;
    try {
      await db.from('organization_users').insert({
        organization_id: organization.id, email: inviteEmail.toLowerCase(),
        full_name: inviteName, role: inviteRole, is_org_creator: false,
      });
      setShowInviteModal(false); setInviteEmail(''); setInviteName('');
      setInviteRole('workspace_regular_user'); fetchData();
    } catch (err) { console.error('Error inviting user:', err); }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Remove this user?')) return;
    try { await db.from('organization_users').delete().eq('id', userId); fetchData(); }
    catch (err) { console.error('Error removing user:', err); }
  };

  const toggleWorkspaceVisibility = async (wsId: string, current: boolean) => {
    try { await db.from('workspaces').update({ is_visible: !current }).eq('id', wsId); fetchData(); }
    catch (err) { console.error('Error:', err); }
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

  const additionalUsers = users.filter(u => u.role !== 'organization_admin').length;
  const totalUserCost = additionalUsers * 19;
  const baseCost = organization?.monthly_base_price || 249;
  const totalMonthlyCost = baseCost + totalUserCost;

  const userRoles: { value: OrganizationRole; label: string }[] = [
    { value: 'organization_admin_manager', label: 'Admin Manager' },
    { value: 'organization_tech_manager', label: 'Tech Manager' },
    { value: 'organization_support_manager', label: 'Support Manager' },
    { value: 'organization_sales_manager', label: 'Sales Manager' },
    { value: 'workspace_admin', label: 'Workspace Admin' },
    { value: 'workspace_regular_user', label: 'Regular User' },
    { value: 'workspace_light_user', label: 'Light User' },
    { value: 'workspace_guest', label: 'Guest' },
  ];

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
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/50 flex items-center justify-center">
                <ShieldIcon size={24} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wide">
                <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">ADMIN CONSOLE</span>
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
            <button onClick={handleFullscreenToggle} className="relative p-2 text-gray-400 hover:text-emerald-400 rounded-lg border border-transparent hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all">
              {isFullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
            </button>
            <button onClick={onClose} className="relative p-2 text-gray-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/50 hover:bg-red-500/10 transition-all">
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
            <button className="px-3 py-1 bg-white/10 rounded border border-white/20 hover:bg-white/20 transition-all">
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
                <EmeraldStatCard label="Team Members" value={users.length} icon={UsersIcon} glowColor="emerald" />
                <EmeraldStatCard label="Workspaces" value={workspaces.length} icon={ShieldIcon} glowColor="cyan" />
                <EmeraldStatCard label="Monthly Cost" value={`$${totalMonthlyCost}`} icon={BarChartIcon} glowColor="emerald" />
                <EmeraldStatCard label="Active Apps" value={workspaces.length * 10} icon={BuildIcon} glowColor="orange" />
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
                      { label: 'Subscription', value: organization?.subscription_tier?.toUpperCase() || 'TRIAL', status: 'active' },
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
                <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  TEAM MEMBERS
                </h3>
                <div className="space-y-3">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-sm font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                          {u.full_name.split(' ').map(n => n[0]).join('')}
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
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50" />
                  <input type="text" placeholder="Search users..." className="w-full bg-black border border-emerald-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-emerald-400 transition-all" />
                </div>
                <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all font-mono">
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
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-sm font-mono font-bold">
                              {u.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <span className="text-white font-mono font-medium">{u.full_name}</span>
                              <p className="text-xs text-gray-500 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono text-gray-300">{u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></td>
                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-mono border ${u.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>{u.status?.toUpperCase() || 'PENDING'}</span></td>
                        <td className="p-4 text-emerald-400 font-mono font-bold">{u.role === 'organization_admin' ? `$${baseCost}/mo` : '$19/mo'}</td>
                        <td className="p-4 text-right">
                          {u.role !== 'organization_admin' && (
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"><EditIcon size={18} /></button>
                              <button onClick={() => handleRemoveUser(u.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><TrashIcon size={18} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div className="p-12 text-center"><p className="text-gray-500 font-mono">No users found</p></div>}
              </div>
            </div>
          )}

          {/* WORKSPACES TAB */}
          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              <p className="text-gray-400 font-mono text-sm">Control which workspaces are visible to your team</p>
              <div className="grid gap-4">
                {workspaces.map((ws) => (
                  <div key={ws.id} className={`bg-gray-900/50 border rounded-xl p-4 ${ws.is_visible ? 'border-emerald-500/30' : 'border-gray-800 opacity-60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ws.is_visible ? 'bg-emerald-500/20' : 'bg-gray-700'}`}>
                          <ShieldIcon size={20} className={ws.is_visible ? 'text-emerald-400' : 'text-gray-500'} />
                        </div>
                        <div>
                          <h3 className="text-white font-mono font-medium">{ws.name}</h3>
                          <p className="text-xs text-gray-500 font-mono">{ws.slug}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleWorkspaceVisibility(ws.id, ws.is_visible)} className={`p-2 rounded-lg transition-colors ${ws.is_visible ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-gray-500 hover:bg-gray-700'}`}>
                        {ws.is_visible ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                      After trial: {SUBSCRIPTION_TIERS[trialStatus.selected_tier as keyof typeof SUBSCRIPTION_TIERS]?.name || 'Basic'} at ${SUBSCRIPTION_TIERS[trialStatus.selected_tier as keyof typeof SUBSCRIPTION_TIERS]?.price || 149}/mo
                    </p>
                  </div>
                </div>
              )}

              {/* Current Plan */}
              <div className="rounded-xl border border-emerald-500/30 bg-black/80 p-6">
                <h3 className="text-lg font-mono font-bold text-white mb-4">Current Subscription</h3>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Base Plan</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">${baseCost}<span className="text-sm text-gray-500">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Additional Users</p>
                    <p className="text-2xl font-bold text-white font-mono">{additionalUsers}<span className="text-sm text-gray-500"> users</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Total Monthly</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">${totalMonthlyCost}<span className="text-sm text-gray-500">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-mono">Tier</p>
                    <p className="text-2xl font-bold text-white font-mono">{organization?.subscription_tier?.toUpperCase() || 'TRIAL'}</p>
                  </div>
                </div>
              </div>

              {/* Upgrade Options */}
              <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
                <h3 className="text-lg font-mono font-bold text-white mb-4">Available Plans</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                    <div key={key} className={`p-4 rounded-xl border-2 transition-all ${
                      organization?.subscription_tier === key ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-gray-800 hover:border-gray-700'
                    }`}>
                      <h4 className="text-white font-mono font-bold text-lg mb-1">{tier.name}</h4>
                      <p className="text-emerald-400 font-mono text-2xl font-bold mb-3">${tier.price}<span className="text-sm text-gray-500">/mo</span></p>
                      <ul className="space-y-1.5">
                        {tier.features.map((f, i) => (
                          <li key={i} className="text-gray-400 font-mono text-xs flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{f}
                          </li>
                        ))}
                      </ul>
                      {organization?.subscription_tier === key ? (
                        <div className="mt-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono text-center">Current Plan</div>
                      ) : (
                        <button className="mt-3 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-xs font-mono hover:border-emerald-500/50 hover:text-emerald-400 transition-all">
                          {tier.price > (baseCost || 0) ? 'Upgrade' : 'Downgrade'}
                        </button>
                      )}
                    </div>
                  ))}
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
            <IntegrationsPanel filterByToggles={featureToggles} isOrgAdmin />
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
                  { id: 'general', label: 'General', color: 'emerald' },
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
                  <ChangePasswordPanel />
                  <div className="relative rounded-xl border border-emerald-500/50 bg-black overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 to-transparent" />
                    <div className="relative z-10 p-6">
                      <h3 className="text-lg font-mono font-bold text-white mb-4">Organization Details</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Organization Name</label>
                          <input type="text" defaultValue={organization?.name} className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Domain</label>
                          <input type="text" value={organization?.domain} disabled className="w-full max-w-md bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 text-gray-500 font-mono cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                  </div>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-black border border-emerald-500/50 rounded-xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 to-transparent rounded-xl" />
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
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all" placeholder={`user@${organization?.domain}`} />
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as OrganizationRole)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all">
                    {userRoles.map((role) => (<option key={role.value} value={role.value}>{role.label} ($19/mo)</option>))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 transition-all font-mono">Cancel</button>
                  <button onClick={handleInviteUser} className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all font-mono">Invite</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationAdminPanel;
