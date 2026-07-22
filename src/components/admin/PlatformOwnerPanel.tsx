import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';

import { useAuth } from '@/contexts/AuthContext';
import { useConnection } from '@/contexts/ConnectionContext';
import { 
  ShieldIcon, 
  UsersIcon, 
  SettingsIcon,
  InviteIcon,
  CloseIcon,
  SearchIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  BarChartIcon,
  BuildIcon,
  CopyIcon,
  CheckIcon,
  LockIcon,
  KeyIcon,
  HistoryIcon,
  ActivityIcon,
  MaximizeIcon,
  MinimizeIcon,
  PopoutIcon,
  DatabaseIcon,
  DownloadIcon,
  SaveIcon,
  PlusIcon,
  RefreshIcon
} from '@/components/icons/Icons';

import { Organization, PlatformUser } from '@/types';
import AuditLogViewer from './AuditLogViewer';
import IntegrationsPanel from '@/components/integrations/IntegrationsPanel';
import QuantumVisualization from '@/components/dashboard/QuantumVisualization';
import DatabaseSeeder from '@/components/database/DatabaseSeeder';
import DatabaseVerification from '@/components/database/DatabaseVerification';
import DirectDatabaseTest from '@/components/database/DirectDatabaseTest';
import RuntimeLogPanel from './RuntimeLogPanel';
import CodeDiffViewer from './CodeDiffViewer';

import DatabaseMonitorPanel from './DatabaseMonitorPanel';
import ChangePasswordPanel from './ChangePasswordPanel';
import QCoreSecurityDashboard from './QCoreSecurityDashboard';
import { ConnectionStatusDot, SyncStatusPanel } from '@/components/connectivity/ConnectionBanner';
import FeatureTogglePanel from './FeatureTogglePanel';
import SystemSnapshotPanel from './SystemSnapshotPanel';
import NewsFeedTab from './NewsFeedTab';
import { LegalViewer } from '@/components/legal/LegalDocuments';
import { FileText, Landmark, Handshake, Briefcase, CreditCard, Share2, ChevronDown, Film, Paperclip, ShieldCheck } from 'lucide-react';

// Sync icon
const SyncIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const LayoutGridIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/695fc81af8bb22c52e2539fb_1769628610343_93d83d41.png';

const NewsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6Z" />
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

interface PlatformOwnerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Full 36-Color Core Logic mapped globally for settings panels & tabs
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

export const tabColorMap: Record<string, { primary: string; rgb: string; bg: string }> = {};
ACCENT_COLORS.forEach(c => {
  tabColorMap[c.name] = {
    primary: c.hex,
    rgb: c.rgb,
    bg: `rgba(${c.rgb},0.08)`
  };
});

const NeonStatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.FC<{ size?: number; className?: string }>;
  isAccent?: boolean;
  delay?: number;
}> = ({ label, value, icon: Icon, isAccent, delay = 0 }) => {
  const { organization } = useAuth();
  const primaryColor = organization?.primary_color || '#06b6d4';
  const accentColor = organization?.accent_color || '#a855f7';
  
  const color = isAccent ? accentColor : primaryColor;
  
  // Calculate RGB dynamically to apply proper opacities to the glows
  const rgb = React.useMemo(() => {
    const c = color.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  }, [color]);

  return (
    <div 
      className="relative rounded-xl border-2 p-5 transition-all duration-500 bg-black/40"
      style={{ 
        animationDelay: `${delay}ms`,
        borderColor: `rgba(${rgb}, 0.5)`,
        boxShadow: `0 0 20px rgba(${rgb}, 0.15)`,
        backgroundImage: `linear-gradient(to bottom right, rgba(${rgb}, 0.15), transparent)`
      }}
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl" style={{ borderColor: color }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr" style={{ borderColor: color }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl" style={{ borderColor: color }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br" style={{ borderColor: color }} />
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-mono uppercase tracking-wider">{label}</span>
        <Icon size={22} style={{ color: color, filter: `drop-shadow(0 0 6px rgba(${rgb}, 0.6))` }} />
      </div>
      <p className="text-3xl font-bold font-mono" style={{ color: color, textShadow: `0 0 10px rgba(${rgb}, 0.6)` }}>{value}</p>
    </div>
  );
};

const PlatformOwnerPanel: React.FC<PlatformOwnerPanelProps> = ({ isOpen, onClose }) => {
  const { changePlatformOwnerEmail, user, organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'platform_users' | 'system' | 'audit_logs' | 'quantum' | 'news' | 'security' | 'financials' | 'features'>('overview');

  // --- NEW: Dynamic Theme Colors for the God Mode Console ---
  const primaryColor = organization?.primary_color || '#06b6d4';
  const accentColor = organization?.accent_color || '#a855f7';

  const hexToRgb = (hex: string) => {
    const c = hex.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  };

  const primaryRgb = hexToRgb(primaryColor);
  const accentRgb = hexToRgb(accentColor);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  // --- NEW: Organization Users State ---
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [isLoadingOrgUsers, setIsLoadingOrgUsers] = useState(false);
  const [showAddOrgUser, setShowAddOrgUser] = useState(false);
  const [newOrgUser, setNewOrgUser] = useState({ email: '', full_name: '', role: 'organization_general_user' });

  // --- NEW: User Deletion State ---
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string, type: 'org' | 'platform'} | null>(null);

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      if (userToDelete.type === 'org') {
        await supabase.schema('app_private').from('organization_users').delete().eq('id', userToDelete.id);
        setOrgUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      } else {
        await db.from('platform_users').delete().eq('id', userToDelete.id);
        setPlatformUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      }
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user.');
    }
  };

  // --- NEW: Organization Users Functions ---
  const toggleOrgExpand = async (orgId: string) => {
    if (expandedOrgId === orgId) {
      setExpandedOrgId(null);
      setOrgUsers([]);
      setShowAddOrgUser(false);
      return;
    }
    
    setExpandedOrgId(orgId);
    setIsLoadingOrgUsers(true);
    try {
      // EXPLICIT SCHEMA ROUTING: Target app_private schema
      const { data, error } = await supabase
        .schema('app_private')
        .from('organization_users') 
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Org Users Fetch Error:', error);
        throw error;
      }
      setOrgUsers(data || []);
    } catch (err) {
      console.error('Error fetching org users:', err);
    }
    setIsLoadingOrgUsers(false);
  };

  const handleAddUserToOrg = async (orgId: string) => {
    if (!newOrgUser.email || !newOrgUser.full_name) return;
    
    try {
      // ⚡ FIX: Use the Edge Function to trigger Supabase Auth & send the invite email
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          type: 'organization',
          email: newOrgUser.email,
          full_name: newOrgUser.full_name,
          role: newOrgUser.role,
          org_id: orgId
        }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      // Force UI refresh to pull the newly created user
      setExpandedOrgId(null);
      setTimeout(() => toggleOrgExpand(orgId), 100);
      
      setNewOrgUser({ email: '', full_name: '', role: 'organization_general_user' });
      setShowAddOrgUser(false);
      alert("Invite email sent successfully!");
    } catch (err: any) {
      console.error('Error forcefully adding user to org:', err);
      alert(err.message || "Failed to invite user.");
    }
  };

  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('platform_support_user');
  const [inviteName, setInviteName] = useState('');
  
  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [emailChangeError, setEmailChangeError] = useState('');

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [passwordResetResult, setPasswordResetResult] = useState<{ success: boolean; temporaryCode?: string; error?: string } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qrCodeUrl: string; uri: string; } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState('');
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const popoutWindowRef = useRef<Window | null>(null);

  // --- NEW: Tab Customization State ---
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [customTabColors, setCustomTabColors] = useState<Record<string, string>>({});
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [dragOverTabIdx, setDragOverTabIdx] = useState<number | null>(null);
  const [colorPickerTabId, setColorPickerTabId] = useState<string | null>(null);
  const [isTabsWrapped, setIsTabsWrapped] = useState(false);
  const [isTabsCondensed, setIsTabsCondensed] = useState(false);

  const loadAdminPreferences = async () => {
    const platformUser = user as PlatformUser;
    if (!platformUser?.id) return;
    try {
      const { data } = await db.from('platform_users').select('admin_settings').eq('id', platformUser.id).single();
      if (data?.admin_settings) {
        if (data.admin_settings.tabOrder) setTabOrder(data.admin_settings.tabOrder);
        if (data.admin_settings.tabColors) setCustomTabColors(data.admin_settings.tabColors);
      }
    } catch (err) {
      console.error('Could not load tab preferences:', err);
    }
  };

  const saveAdminPreferences = async (newOrder: string[], newColors: Record<string, string>) => {
    const platformUser = user as PlatformUser;
    if (!platformUser?.id) return;
    try {
      await db.from('platform_users').update({
        admin_settings: { tabOrder: newOrder, tabColors: newColors }
      }).eq('id', platformUser.id);
    } catch (err) {
      console.error('Could not save tab preferences:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      check2FAStatus();
      loadAdminPreferences();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // EXPLICIT SCHEMA ROUTING: Bypassing dbProxy to guarantee we hit app_private
      const [orgsResponse, usersResponse] = await Promise.all([
        supabase.schema('app_private').from('organizations').select('*').order('created_at', { ascending: false }),
        supabase.schema('app_private').from('platform_users').select('*').order('created_at', { ascending: false })
      ]);

      // Explicitly log any Supabase errors
      if (orgsResponse.error) console.error('Organizations Fetch Error:', orgsResponse.error);
      if (usersResponse.error) console.error('Platform Users Fetch Error:', usersResponse.error);

      if (orgsResponse.data) setOrganizations(orgsResponse.data);
      if (usersResponse.data) setPlatformUsers(usersResponse.data);
    } catch (error) {
      console.error('Error in fetchData Promise:', error);
    }
    setIsLoading(false);
  };

  const check2FAStatus = async () => {
    const platformUser = user as PlatformUser;
    if (platformUser?.id) {
      const { data } = await db
        .from('platform_users')
        .select('totp_enabled')
        .eq('id', platformUser.id)
        .single();
      setIs2FAEnabled(data?.totp_enabled || false);
    }
  };

  const handleInvitePlatformUser = async () => {
    if (!inviteEmail || !inviteName) return;
    try {
      // ⚡ FIX: Use the Edge Function to trigger Supabase Auth & send the invite email
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          type: 'platform',
          email: inviteEmail,
          full_name: inviteName,
          role: inviteRole
        }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('platform_support_user');
      fetchData();
      alert("Invite email sent successfully!");
    } catch (error: any) {
      console.error('Error inviting user:', error);
      alert(error.message || "Failed to invite platform user.");
    }
  };

  const handleCopyEmbed = (type: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedEmbed(type);
    setTimeout(() => setCopiedEmbed(null), 2000);
  };

  const handleEmailChange = async () => {
    if (!newOwnerEmail || !totpCode) {
      setEmailChangeError('Please fill in all fields');
      return;
    }
    const result = await changePlatformOwnerEmail(newOwnerEmail, totpCode);
    if (result.success) {
      setShowEmailChangeModal(false);
      setNewOwnerEmail('');
      setTotpCode('');
      setEmailChangeError('');
    } else {
      setEmailChangeError(result.error || 'Failed to change email');
    }
  };

  const handleStart2FASetup = async () => {
    setIsSettingUp2FA(true);
    setSetupError('');
    try {
      const platformUser = user as PlatformUser;
      const { data, error } = await supabase.functions.invoke('totp-setup', {
        body: { action: 'generate', email: platformUser?.email || 'andrew@applegate.solutions' }
      });
      if (error) throw error;
      setTotpSetupData({ secret: data.secret, qrCodeUrl: data.qrCodeUrl, uri: data.uri });
      setShow2FASetupModal(true);
    } catch (error) {
      setSetupError('Failed to generate 2FA secret');
    }
    setIsSettingUp2FA(false);
  };

  const handleVerify2FASetup = async () => {
    if (!setupCode || !totpSetupData) {
      setSetupError('Please enter the verification code');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('totp-setup', {
        body: { action: 'verify_setup', secret: totpSetupData.secret, code: setupCode }
      });
      if (error) throw error;
      if (data.valid) {
        const platformUser = user as PlatformUser;
        await db
          .from('platform_users')
          .update({ totp_secret: totpSetupData.secret, totp_enabled: true })
          .eq('id', platformUser.id);
        setIs2FAEnabled(true);
        setShow2FASetupModal(false);
        setTotpSetupData(null);
        setSetupCode('');
        setSetupError('');
      } else {
        setSetupError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      setSetupError('Verification failed. Please try again.');
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordResetEmail) {
      setPasswordResetResult({ success: false, error: 'Please enter an email address' });
      return;
    }
    setIsResettingPassword(true);
    setPasswordResetResult(null);
    try {
      const platformUser = user as PlatformUser;
      const { data, error } = await supabase.functions.invoke('password-reset', {
        body: { action: 'admin_reset', email: passwordResetEmail, requesterId: platformUser?.id }
      });
      if (error) throw error;
      if (data.success) {
        setPasswordResetResult({ success: true, temporaryCode: data.temporaryCode });
      } else {
        setPasswordResetResult({ success: false, error: data.error || 'Reset failed' });
      }
    } catch (error: any) {
      setPasswordResetResult({ success: false, error: error.message || 'Failed to reset password' });
    }
    setIsResettingPassword(false);
  };

  // ⚡ DETECT POPOUT: Prevent God Mode from hijacking a MiniApp popout window
  const isMiniAppPopout = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const isAdminPopout = params.get('adminPanel') === 'true';
    const isTargetingApp = params.has('workspace') && params.has('app');
    
    // If we have an opener (it's a popup), we are targeting an app, and we DID NOT explicitly request the admin panel
    return window.opener && isTargetingApp && !isAdminPopout;
  }, []);

  useEffect(() => {
    // If it mounts in an open state during a popout, immediately fire onClose to sync the parent state
    if (isOpen && isMiniAppPopout) {
      onClose();
    }
  }, [isOpen, isMiniAppPopout, onClose]);

  if (!isOpen || isMiniAppPopout) return null;

  const platformRoles = [
    { value: 'platform_tech_admin', label: 'Tech Admin', description: 'Manages technical teams and system configurations' },
    { value: 'platform_support_admin', label: 'Support Admin', description: 'Manages customer support teams and escalations' },
    { value: 'platform_sales_admin', label: 'Sales Admin', description: 'Manages sales teams and revenue operations' },
    { value: 'platform_tech_manager', label: 'Tech Manager', description: 'Manages individual tech teams' },
    { value: 'platform_support_manager', label: 'Support Manager', description: 'Manages support team operations' },
    { value: 'platform_sales_manager', label: 'Sales Manager', description: 'Manages sales team operations' },
    { value: 'platform_tech_user', label: 'Tech User', description: 'Supports system modifications' },
    { value: 'platform_support_user', label: 'Support User', description: 'Handles customer support tickets' },
    { value: 'platform_sales_user', label: 'Sales User', description: 'Handles sales activities' },
  ];

  const stats = [
    { label: 'Organizations', value: organizations.length, icon: UsersIcon, isAccent: false },
    { label: 'Platform Users', value: platformUsers.length, icon: ShieldIcon, isAccent: true },
    { label: 'Total Revenue', value: `$${(organizations.length * 249).toLocaleString()}`, icon: BarChartIcon, isAccent: false },
    { label: 'Active MiniApps', value: '60+', icon: BuildIcon, isAccent: true },
  ];

  const embedCodes = {
    button: `\n<a href="${window.location.origin}?action=login"\n   style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:white;font-weight:500;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;">\n  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>\n  </svg>\n  Sign In to CORE\n</a>`,
    redirect: `\n<a href="${window.location.origin}?action=login">Sign In to Applegate CORE</a>\n\n\n<script>\nfunction openApplegateSignIn() {\n  window.location.href = '${window.location.origin}?action=login';\n}\n</script>\n<button onclick="openApplegateSignIn()">Sign In</button>`,
  };

  const DEFAULT_TABS = [
    { id: 'overview', label: 'Dashboard', icon: BarChartIcon, color: 'cyan' },
    { id: 'organizations', label: 'Organizations', icon: UsersIcon, color: 'cyan' },
    { id: 'platform_users', label: 'Platform', icon: ShieldIcon, color: 'purple' },
    { id: 'security', label: 'Security', icon: LockIcon, color: 'cyan' },
    { id: 'features', label: 'Features', icon: EyeIcon, color: 'magenta' },
    { id: 'system', label: 'System', icon: BuildIcon, color: 'green' },
    { id: 'audit_logs', label: 'Audit Logs', icon: HistoryIcon, color: 'orange' },
    { id: 'quantum', label: 'Quantum', icon: ActivityIcon, color: 'magenta' },
    { id: 'news', label: 'News Feed', icon: NewsIcon, color: 'orange' },
    { id: 'financials', label: 'Financials', icon: UsersIcon, color: 'green' },
  ];

  // --- NEW: Drag and Drop Handlers ---
  const handleTabDragStart = (e: React.DragEvent, idx: number) => {
    setDragTabIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleTabDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    
    // LIVE PUSH: If we are hovering over a different tab, swap them in state immediately
    if (dragTabIdx !== null && dragTabIdx !== idx) {
      const currentOrder = tabOrder.length > 0 ? [...tabOrder] : DEFAULT_TABS.map(t => t.id);
      const newOrder = [...currentOrder];
      
      const [movedItem] = newOrder.splice(dragTabIdx, 1);
      newOrder.splice(idx, 0, movedItem);
      
      setTabOrder(newOrder);
      // This is the key: update the index we are "holding" to the new position
      setDragTabIdx(idx);
    }

    if (dragOverTabIdx !== idx) setDragOverTabIdx(idx);
  };

  const handleTabDragEnd = () => {
    setDragTabIdx(null);
    setDragOverTabIdx(null);
  };

  const handleTabDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Use the latest tabOrder state established during the live DragOver
    const finalOrder = tabOrder.length > 0 ? tabOrder : DEFAULT_TABS.map(t => t.id);
    saveAdminPreferences(finalOrder, customTabColors);
    
    setDragTabIdx(null);
    setDragOverTabIdx(null);
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      panelRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handlePopout = () => {
    const width = 1400;
    const height = 900;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const newWindow = window.open(
      window.location.href + '?adminPanel=true',
      'AdminPanel',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
    if (newWindow) {
      popoutWindowRef.current = newWindow;
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50" ref={panelRef}>
      <style>{`
        /* Dynamic Scrollbar Styling */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(${primaryRgb}, 0.4); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(${primaryRgb}, 0.8); }
        ::-webkit-scrollbar-corner { background: transparent; }
        * { scrollbar-width: thin; scrollbar-color: rgba(${primaryRgb}, 0.5) rgba(0, 0, 0, 0.2); }

        /* Dynamic Cut-Tab Styling */
        .cut-tab-org.cut-tab-active {
          color: ${primaryColor} !important;
          text-shadow: 0 0 10px rgba(${primaryRgb}, 0.5) !important;
        }
        .cut-tab-org.cut-tab-active::before,
        .cut-tab-org.cut-tab-active::after {
          border-color: ${primaryColor} !important;
          background-color: rgba(${primaryRgb}, 0.15) !important;
          box-shadow: inset 0 -2px 15px rgba(${primaryRgb}, 0.3) !important;
        }
        .cut-tab-org:not(.cut-tab-active):hover::before,
        .cut-tab-org:not(.cut-tab-active):hover::after {
          background-color: rgba(${primaryRgb}, 0.05) !important;
          border-color: rgba(${primaryRgb}, 0.4) !important;
        }

        /* Financial Phase Dynamic Elements for Org Theme */
        .phase-card-org { border-color: rgba(${primaryRgb}, 0.3); }
        .phase-card-org:hover { border-color: rgba(${primaryRgb}, 0.5); box-shadow: 0 0 20px rgba(${primaryRgb}, 0.1); }
        .phase-bg-grad-org { background-image: linear-gradient(to bottom right, rgba(${primaryRgb}, 0.15), transparent); }
        .phase-text-main-org { color: ${primaryColor}; }
        .phase-bg-icon-org { background-color: rgba(${primaryRgb}, 0.1); }
        .phase-text-sub-org { color: rgba(${primaryRgb}, 0.7); }
        .phase-header-bg-org { background-color: rgba(${primaryRgb}, 0.15); }
        .phase-dot-org { background-color: ${primaryColor}; box-shadow: 0 0 10px rgba(${primaryRgb}, 0.9); }
        
        .phase-btn-org { border-color: rgba(255,255,255,0.2); color: #9ca3af; }
        .phase-btn-org:hover { color: ${primaryColor}; border-color: rgba(${primaryRgb}, 0.5); background-color: rgba(${primaryRgb}, 0.1); }
        .phase-btn-dashed-org { border-color: rgba(255,255,255,0.2); }
        .phase-btn-dashed-org:hover { color: ${primaryColor}; border-color: rgba(${primaryRgb}, 0.5); background-color: rgba(${primaryRgb}, 0.05); }

        /* Restore the 36-Color Palette Styles */
        ${Object.entries(tabColorMap).map(([name, theme]) => `
          .cut-tab-${name}.cut-tab-active {
            color: ${theme.primary} !important;
            text-shadow: 0 0 10px rgba(${theme.rgb}, 0.5) !important;
          }
          .cut-tab-${name}.cut-tab-active::before,
          .cut-tab-${name}.cut-tab-active::after {
            border-color: ${theme.primary} !important;
            background-color: rgba(${theme.rgb}, 0.15) !important;
            box-shadow: inset 0 -2px 15px rgba(${theme.rgb}, 0.3) !important;
          }
          .cut-tab-${name}:not(.cut-tab-active):hover::before,
          .cut-tab-${name}:not(.cut-tab-active):hover::after {
            background-color: rgba(${theme.rgb}, 0.05) !important;
            border-color: rgba(${theme.rgb}, 0.4) !important;
          }

          .phase-card-${name} { border-color: rgba(${theme.rgb}, 0.3); }
          .phase-card-${name}:hover { border-color: rgba(${theme.rgb}, 0.5); box-shadow: 0 0 20px rgba(${theme.rgb}, 0.1); }
          .phase-bg-grad-${name} { background-image: linear-gradient(to bottom right, rgba(${theme.rgb}, 0.15), transparent); }
          .phase-text-main-${name} { color: ${theme.primary}; }
          .phase-bg-icon-${name} { background-color: rgba(${theme.rgb}, 0.1); }
          .phase-text-sub-${name} { color: rgba(${theme.rgb}, 0.7); }
          .phase-header-bg-${name} { background-color: rgba(${theme.rgb}, 0.15); }
          .phase-dot-${name} { background-color: ${theme.primary}; box-shadow: 0 0 10px rgba(${theme.rgb}, 0.9); }
          
          .phase-btn-${name} { border-color: rgba(255,255,255,0.2); color: #9ca3af; }
          .phase-btn-${name}:hover { color: ${theme.primary}; border-color: rgba(${theme.rgb}, 0.5); background-color: rgba(${theme.rgb}, 0.1); }
          .phase-btn-dashed-${name} { border-color: rgba(255,255,255,0.2); }
          .phase-btn-dashed-${name}:hover { color: ${theme.primary}; border-color: rgba(${theme.rgb}, 0.5); background-color: rgba(${theme.rgb}, 0.05); }
        `).join('')}
      `}</style>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm alien-grid" onClick={onClose} />
      
      <div 
        className={`absolute ${isFullscreen ? 'inset-0' : 'inset-2 md:inset-4 lg:inset-6'} bg-black/40 backdrop-blur-2xl rounded-2xl overflow-hidden flex flex-col`}
        style={{ 
          borderColor: `rgba(${primaryRgb}, 0.4)`, 
          borderWidth: '1px', 
          boxShadow: `0 0 60px rgba(${primaryRgb}, 0.2), inset 0 0 20px rgba(0,0,0,0.5)` 
        }}
      >
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 rounded-2xl border" style={{ borderColor: `rgba(${primaryRgb}, 0.2)` }} />
          <div 
            className="absolute -inset-[1px] rounded-2xl opacity-50" 
            style={{ backgroundImage: `linear-gradient(to right, rgba(${primaryRgb}, 0.1), rgba(${accentRgb}, 0.1))` }} 
          />
        </div>

        <div 
          className="relative flex items-center justify-between p-3 sm:p-4 border-b gap-2"
          style={{ 
            borderColor: `rgba(${primaryRgb}, 0.2)`, 
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.4), rgba(${primaryRgb}, 0.2), rgba(0,0,0,0.4))` 
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute inset-0 h-8 animate-pulse" style={{ backgroundImage: `linear-gradient(to bottom, transparent, rgba(${primaryRgb}, 0.05), transparent)` }} />
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 z-10 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-2 rounded-full blur-xl animate-pulse" style={{ backgroundColor: `rgba(${primaryRgb}, 0.2)` }} />
              <img src={LOGO_URL} alt="Applegate CORE" className="h-8 sm:h-10 relative z-10" style={{ filter: `drop-shadow(0 0 10px rgba(${primaryRgb}, 0.5))` }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-wide truncate">
                <span style={{ color: primaryColor, textShadow: `0 0 10px rgba(${primaryRgb}, 0.5)` }}>GOD MODE</span>
                <span className="text-gray-500 mx-1 sm:mx-2">//</span>
                <span className="text-gray-300 hidden sm:inline">Platform Owner Console</span>
              </h2>
              <p className="text-[10px] sm:text-xs font-mono tracking-widest uppercase truncate" style={{ color: accentColor }}>
                [ Restricted Access <span className="hidden sm:inline">- Ultimate Authority</span> ]
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 z-10 shrink-0">
            <div className="hidden lg:block">
              <ConnectionStatusDot showLabel className="mr-1 px-2 py-1 bg-gray-900/50 border border-gray-800 rounded-lg" />
            </div>
            
            <button
              onClick={() => setShowSettingsModal(true)}
              className="relative p-1.5 sm:p-2 text-gray-400 hover:text-cyan-400 rounded-lg border border-transparent hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 group hidden sm:block"
              title="Platform Settings"
            >
              <div className="absolute inset-0 bg-cyan-500/20 rounded-lg opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
              <SettingsIcon size={20} className="relative z-10" />
            </button>

            <button
              onClick={handlePopout}
              className="relative p-1.5 sm:p-2 text-gray-400 hover:text-cyan-400 rounded-lg border border-transparent hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 group hidden sm:block"
              title="Open in new window"
            >
              <div className="absolute inset-0 bg-cyan-500/20 rounded-lg opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
              <PopoutIcon size={20} className="relative z-10" />
            </button>
            
            <button
              onClick={handleFullscreenToggle}
              className="relative p-1.5 sm:p-2 text-gray-400 hover:text-cyan-400 rounded-lg border border-transparent hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 group hidden sm:block"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <div className="absolute inset-0 bg-cyan-500/20 rounded-lg opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
              {isFullscreen ? <MinimizeIcon size={20} className="relative z-10" /> : <MaximizeIcon size={20} className="relative z-10" />}
            </button>
            
            <button
              onClick={onClose}
              className="relative p-2 sm:p-2 text-gray-300 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/50 hover:bg-red-500/10 transition-all duration-300 group ml-2"
              title="Close panel"
            >
              <div className="absolute inset-0 bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
              <CloseIcon size={28} className="relative z-10 sm:text-gray-400 group-hover:text-red-400" />
            </button>
          </div>
        </div>

        <div className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="px-4 max-w-full mx-auto">
            <div className={`flex items-end gap-1 pb-1 ${isTabsWrapped ? 'flex-wrap overflow-hidden' : 'flex-nowrap overflow-x-auto no-scrollbar'}`} style={{ paddingTop: '3px' }}>
            {/* Toggle Wrap Button */}
            <button
              onClick={() => setIsTabsWrapped(!isTabsWrapped)}
              className="h-[38px] px-2 mb-0.5 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-cyan-500/20 transition-all shrink-0 group"
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
              className={`h-[38px] px-2 mb-0.5 flex items-center justify-center rounded-lg border transition-all shrink-0 ${isTabsCondensed ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'text-gray-500 border-gray-800 hover:bg-white/5'}`}
              title={isTabsCondensed ? "Expand Tabs" : "Condense to Icons"}
            >
              {/* When tabs are full size, show arrows pointing IN (ShrinkIcon) */}
              {/* When tabs are condensed, show arrows pointing OUT (ExpandIcon) */}
              {isTabsCondensed ? (
                <ExpandIcon size={18} className="animate-pulse" />
              ) : (
                <ShrinkIcon size={18} />
              )}
            </button>

            {(() => {
              // Compute current display order
                const orderedTabs = tabOrder.length > 0 
                  ? tabOrder.map(id => DEFAULT_TABS.find(t => t.id === id)).filter(Boolean) as typeof DEFAULT_TABS
                  : [...DEFAULT_TABS];
                
                // Append any missing default tabs just in case
                DEFAULT_TABS.forEach(t => { if (!orderedTabs.find(ot => ot.id === t.id)) orderedTabs.push(t); });

                return orderedTabs.map((tab, idx) => {
                  const isActive = activeTab === tab.id;
                  const activeColorName = customTabColors[tab.id] || 'org';
                  const TabIcon = tab.icon;
                  const isDragOver = dragOverTabIdx === idx && dragTabIdx !== null && dragTabIdx !== idx;
                  
                  return (
                    <button
                      key={tab.id}
                      title={isTabsCondensed ? tab.label : undefined} // Tooltip only shows when condensed
                      draggable
                      onDragStart={(e) => handleTabDragStart(e, idx)}
                      onDragOver={(e) => handleTabDragOver(e, idx)}
                      onDragEnd={handleTabDragEnd}
                      onDrop={(e) => handleTabDrop(e)}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`${isTabsCondensed ? 'p-2 rounded-xl mb-1' : 'px-4 py-2 cut-tab'} cut-tab-${activeColorName} group relative text-sm font-mono font-medium transition-all duration-300 flex items-center shrink-0 ${
                        isActive ? (isTabsCondensed ? 'bg-white/10 ring-1 ring-cyan-400/50' : 'cut-tab-active') : 'text-gray-500 hover:text-gray-300'
                      } ${isDragOver ? 'ring-2 ring-offset-1 ring-offset-black' : ''}`}
                      style={{
                        minWidth: isTabsCondensed ? '42px' : '180px',
                        justifyContent: isTabsCondensed ? 'center' : 'flex-start',
                        ...(isActive && !isTabsCondensed && activeColorName === 'org' ? { color: primaryColor } : {}),
                        ...(isDragOver ? { ringColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}` } : {})
                      }}
                    >
                      {isActive && !isTabsCondensed && <span className="cut-tab-shimmer-el" />}
                      <span className={`relative z-[1] flex items-center gap-2 ${!isTabsCondensed ? 'pr-6 truncate' : ''}`}>
                        <TabIcon size={isTabsCondensed ? 20 : 14} className="flex-shrink-0" />
                        {!isTabsCondensed && <span className="truncate">{tab.label}</span>}
                      </span>
                      
                      {/* Gear Icon - Only visible in expanded mode or on hover in condensed mode */}
                      <div 
                        className={`absolute ${isTabsCondensed ? '-top-1 -right-1 scale-75' : 'right-2 inset-y-0'} flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10`}
                        onClick={(e) => { e.stopPropagation(); setColorPickerTabId(tab.id); }}
                      >
                        <div className="p-1 hover:bg-white/10 rounded transition-all flex items-center justify-center bg-black/80">
                          <SettingsIcon size={12} className="text-gray-400 hover:text-white" />
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-black/20 to-black/60">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <NeonStatCard key={index} label={stat.label} value={stat.value} icon={stat.icon} glowColor={stat.color} delay={index * 100} />
                ))}
              </div>

              <div className="relative rounded-xl border border-cyan-500/30 bg-black/80 p-6 overflow-hidden">
                <div className="absolute inset-0 hex-pattern opacity-30" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(0,255,0,0.8)] animate-pulse" />
                    <h3 className="text-lg font-mono font-bold text-white tracking-wide">SYSTEM STATUS</h3>
                    <span className="text-xs font-mono text-green-400 ml-auto">ALL SYSTEMS OPERATIONAL</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { label: 'API Response', value: '12ms', status: 'optimal' },
                      { label: 'Database Load', value: '23%', status: 'optimal' },
                      { label: 'Memory Usage', value: '1.2GB', status: 'optimal' },
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                        <p className="text-gray-500 text-xs font-mono uppercase mb-1">{item.label}</p>
                        <p className="text-xl font-mono font-bold text-cyan-400">{item.value}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]" />
                          <span className="text-xs font-mono text-green-400 uppercase">{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative rounded-xl border border-fuchsia-500/30 bg-black/80 p-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-950/20 to-transparent" />
                <div className="relative z-10">
                  <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(255,0,255,0.8)]" />
                    RECENT ORGANIZATIONS
                  </h3>
                  <div className="space-y-3">
                    {organizations.slice(0, 5).map((org, index) => (
                      <div key={org.id} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                        <div>
                          <p className="text-white font-mono font-medium">{org.name}</p>
                          <p className="text-sm text-gray-500 font-mono">{org.domain}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-mono border ${org.is_active ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(0,255,0,0.2)]' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                          {org.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    ))}
                    {organizations.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500 font-mono">No organizations detected</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                  <input type="text" placeholder="Search organizations..." className="w-full bg-black border border-cyan-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all" />
                </div>
              </div>

              <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-cyan-950/30 border-b border-cyan-500/20">
                    <tr>
                      <th className="w-10 p-4"></th> {/* Chevron Column */}
                      <th className="text-left p-4 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Organization</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Domain</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Status</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Monthly</th>
                      <th className="text-right p-4 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {organizations.map((org) => (
                      <React.Fragment key={org.id}>
                        <tr 
                          className="hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                          onClick={() => toggleOrgExpand(org.id)}
                        >
                          <td className="p-4 text-gray-500 group-hover:text-cyan-400 transition-colors">
                            <div className={`transition-transform duration-300 ${expandedOrgId === org.id ? 'rotate-180' : '-rotate-90'}`}>
                              <ChevronDown size={18} />
                            </div>
                          </td>
                          <td className="p-4"><p className="text-white font-mono font-medium">{org.name}</p></td>
                          <td className="p-4 text-gray-400 font-mono">{org.domain}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-mono border ${org.is_active ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                              {org.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 text-green-400 font-mono font-bold">${org.monthly_base_price}</td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all"><EyeIcon size={18} /></button>
                              <button className="p-2 text-gray-500 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-lg border border-transparent hover:border-fuchsia-500/30 transition-all"><EditIcon size={18} /></button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED USERS VIEW */}
                        {expandedOrgId === org.id && (
                          <tr className="bg-gray-950 border-b border-gray-800">
                            <td colSpan={6} className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-white font-mono font-bold flex items-center gap-2">
                                  <UsersIcon size={16} className="text-cyan-400" /> Organization Users
                                </h4>
                                <button 
                                  onClick={() => setShowAddOrgUser(!showAddOrgUser)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-500/20 transition-all text-xs font-mono font-bold uppercase tracking-wider"
                                >
                                  {showAddOrgUser ? 'Cancel' : <><PlusIcon size={14} /> Force Add User</>}
                                </button>
                              </div>

                              {/* ADD USER FORM (Bypasses Domain Restrict) */}
                              {showAddOrgUser && (
                                <div className="mb-6 p-4 border border-cyan-500/30 rounded-lg bg-black/50 space-y-4">
                                  <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs font-mono bg-amber-500/10 p-2 rounded border border-amber-500/20 inline-block">
                                    <ShieldCheck size={14} className="inline" /> GOD MODE: Domain matching rules are suspended for this action.
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-1">
                                      <input type="text" placeholder="Full Name" value={newOrgUser.full_name} onChange={(e) => setNewOrgUser({...newOrgUser, full_name: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white font-mono focus:border-cyan-400 focus:outline-none" />
                                    </div>
                                    <div className="md:col-span-1">
                                      <input type="email" placeholder="Email Address" value={newOrgUser.email} onChange={(e) => setNewOrgUser({...newOrgUser, email: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white font-mono focus:border-cyan-400 focus:outline-none" />
                                    </div>
                                    <div className="md:col-span-1">
                                      <select value={newOrgUser.role} onChange={(e) => setNewOrgUser({...newOrgUser, role: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white font-mono focus:border-cyan-400 focus:outline-none">
                                        <option value="organization_admin">Admin</option>
                                        <option value="organization_general_user">General User</option>
                                        <option value="organization_tech_user">Tech User</option>
                                        <option value="organization_sales_user">Sales User</option>
                                        <option value="organization_support_user">Support User</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-1">
                                      <button 
                                        onClick={() => handleAddUserToOrg(org.id)}
                                        disabled={!newOrgUser.email || !newOrgUser.full_name}
                                        className="w-full py-2 bg-cyan-500 text-black font-bold font-mono rounded hover:bg-cyan-400 transition-colors disabled:opacity-50 text-sm"
                                      >
                                        Execute Insert
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* USERS LIST */}
                              {isLoadingOrgUsers ? (
                                <div className="text-cyan-400 font-mono text-sm animate-pulse">Loading identities...</div>
                              ) : orgUsers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {orgUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-3 border border-gray-800 rounded bg-gray-900/30 group">
                                      <div className="flex-1 truncate pr-2">
                                        <p className="text-white text-sm font-mono truncate">{user.full_name}</p>
                                        <p className="text-gray-500 text-xs font-mono truncate">{user.email}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-gray-800 rounded text-[10px] text-gray-400 font-mono uppercase border border-gray-700 shrink-0">
                                          {user.role.replace('organization_', '').replace(/_/g, ' ')}
                                        </span>
                                        <button 
                                          onClick={() => setUserToDelete({ id: user.id, name: user.full_name, type: 'org' })}
                                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                          title="Remove User"
                                        >
                                          <TrashIcon size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 font-mono text-sm">No identities found for this organization.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {organizations.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-500 font-mono">No organizations found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'platform_users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                  <input type="text" placeholder="Search users..." className="w-full bg-black border border-cyan-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all" />
                </div>
                <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-5 py-3 bg-fuchsia-500/10 border border-fuchsia-500/50 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/20 hover:shadow-[0_0_20px_rgba(255,0,255,0.3)] transition-all font-mono">
                  <InviteIcon size={18} /> Invite User
                </button>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-black/80 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-purple-950/30 border-b border-purple-500/20">
                    <tr>
                      <th className="text-left p-4 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">User</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Email</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Role</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Status</th>
                      <th className="text-right p-4 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {platformUsers.map((pUser) => (
                      <tr key={pUser.id} className="hover:bg-purple-500/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-sm font-mono font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                              {pUser.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-white font-mono font-medium">{pUser.full_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 font-mono">{pUser.email}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono text-gray-300">
                            {pUser.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-mono border ${pUser.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' : pUser.status === 'idle' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                            {pUser.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 text-gray-500 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-lg border border-transparent hover:border-fuchsia-500/30 transition-all"><EditIcon size={18} /></button>
                            {!pUser.is_owner && (
                              <button onClick={() => setUserToDelete({ id: pUser.id, name: pUser.full_name, type: 'platform' })} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/30 transition-all"><TrashIcon size={18} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {platformUsers.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-500 font-mono">No platform users found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'system' && <SystemTab copiedEmbed={copiedEmbed} handleCopyEmbed={handleCopyEmbed} embedCodes={embedCodes} />}
          {activeTab === 'audit_logs' && <AuditLogViewer isPlatformOwner={true} />}
          {activeTab === 'security' && <QCoreSecurityDashboard />}
          {activeTab === 'features' && <FeatureTogglePanel />}
          {activeTab === 'news' && <NewsFeedTab />}
          {activeTab === 'financials' && <FinancialsTab />}
          {activeTab === 'quantum' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/20 to-cyan-950/20 p-6">
                <h3 className="text-lg font-mono font-bold text-white mb-2">Qiskit Runtime - IBM Quantum Cloud</h3>
                <p className="text-gray-400 font-mono text-sm">Real-time quantum state visualization and predictive data analysis powered by IBM Quantum.</p>
              </div>
              <QuantumVisualization />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          <div className="relative border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
               style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: `rgba(${primaryRgb}, 0.2)` }}>
              <div className="flex items-center gap-3">
                <SettingsIcon size={24} style={{ color: primaryColor }} />
                <h3 className="text-xl font-mono font-bold text-white">Platform Settings</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 text-gray-400 hover:text-white rounded transition-colors"><CloseIcon size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 scrollbar-admin-cyan">
              <SettingsTab 
                is2FAEnabled={is2FAEnabled}
                isSettingUp2FA={isSettingUp2FA}
                handleStart2FASetup={handleStart2FASetup}
                setShowEmailChangeModal={setShowEmailChangeModal}
                setShowPasswordResetModal={setShowPasswordResetModal}
                user={user}
              />
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
          <div className="relative border rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="relative z-10">
              <h3 className="text-lg font-mono font-bold text-white mb-6 flex items-center gap-3"><InviteIcon size={20} style={{ color: primaryColor }} /> Invite Platform User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Full Name</label>
                  <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-white/50 transition-all" placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Email</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-white/50 transition-all" placeholder="user@applegate.solutions" />
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-white/50 transition-all">
                    {platformRoles.map((role) => (<option key={role.value} value={role.value} className="bg-gray-900">{role.label}</option>))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all font-mono">Cancel</button>
                  <button onClick={handleInvitePlatformUser} className="flex-1 py-3 border rounded-lg transition-all font-mono font-bold text-black" style={{ background: primaryColor, borderColor: primaryColor, boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)` }}>Invite</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailChangeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEmailChangeModal(false)} />
          <div className="relative border rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4"><LockIcon size={24} style={{ color: primaryColor }} /><h3 className="text-lg font-mono font-bold text-white">Change Platform Owner Email</h3></div>
              <p className="text-gray-400 font-mono text-sm mb-4">This action requires 2-step verification. Enter your Google Authenticator code to proceed.</p>
              {emailChangeError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4"><p className="text-red-400 font-mono text-sm">{emailChangeError}</p></div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">New Email Address</label>
                  <input type="email" value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-white/50 transition-all" placeholder="new-email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Google Authenticator Code</label>
                  <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-white/50 transition-all" placeholder="000000" maxLength={6} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setShowEmailChangeModal(false); setNewOwnerEmail(''); setTotpCode(''); setEmailChangeError(''); }} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all font-mono">Cancel</button>
                  <button onClick={handleEmailChange} className="flex-1 py-3 border rounded-lg transition-all font-mono font-bold text-black" style={{ background: primaryColor, borderColor: primaryColor, boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)` }}>Verify & Change</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {show2FASetupModal && totpSetupData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShow2FASetupModal(false)} />
          <div className="relative border rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6"><KeyIcon size={24} style={{ color: primaryColor }} /><h3 className="text-lg font-mono font-bold text-white">Setup Google Authenticator</h3></div>
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-400 font-mono text-sm mb-4">Scan this QR code with Google Authenticator app</p>
                  <div className="bg-white p-4 rounded-xl inline-block shadow-lg" style={{ boxShadow: `0 0 30px rgba(${primaryRgb}, 0.3)` }}>
                    <img src={totpSetupData.qrCodeUrl} alt="QR Code for Google Authenticator" className="w-48 h-48" />
                  </div>
                </div>
                <div className="bg-black/50 border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-500 text-xs font-mono mb-2 uppercase">Or enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black border border-gray-800 rounded px-3 py-2 font-mono text-sm break-all" style={{ color: primaryColor }}>{totpSetupData.secret}</code>
                    <button onClick={() => { navigator.clipboard.writeText(totpSetupData.secret); }} className="p-2 text-gray-500 hover:text-white transition-colors"><CopyIcon size={18} /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Enter the 6-digit code from the app</label>
                  <input type="text" value={setupCode} onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-4 text-white font-mono text-center text-3xl tracking-[0.5em] focus:outline-none focus:border-white/50 transition-all" placeholder="000000" maxLength={6} />
                </div>
                {setupError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"><p className="text-red-400 font-mono text-sm">{setupError}</p></div>}
                <div className="flex gap-3">
                  <button onClick={() => { setShow2FASetupModal(false); setTotpSetupData(null); setSetupCode(''); setSetupError(''); }} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all font-mono">Cancel</button>
                  <button onClick={handleVerify2FASetup} disabled={!setupCode || setupCode.length !== 6} className="flex-1 py-3 border rounded-lg transition-all font-mono font-bold text-black disabled:opacity-50" style={{ background: primaryColor, borderColor: primaryColor, boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)` }}>Verify & Enable</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordResetModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowPasswordResetModal(false); setPasswordResetEmail(''); setPasswordResetResult(null); }} />
          <div className="relative border rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4"><KeyIcon size={24} style={{ color: primaryColor }} /><h3 className="text-lg font-mono font-bold text-white">Reset User Password</h3></div>
              <p className="text-gray-400 font-mono text-sm mb-4">Enter the email address of the user whose password you want to reset.</p>
              {passwordResetResult && (
                <div className={`rounded-lg p-4 mb-4 ${passwordResetResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  {passwordResetResult.success ? (
                    <div>
                      <p className="text-green-400 font-mono text-sm mb-2">Password reset successful!</p>
                      <p className="text-gray-400 font-mono text-xs mb-2">Temporary access code:</p>
                      <code className="block bg-black border border-green-500/30 rounded px-3 py-2 text-green-400 font-mono text-lg tracking-wider text-center">{passwordResetResult.temporaryCode}</code>
                      <p className="text-gray-500 font-mono text-xs mt-2">Share this code with the user. It expires in 24 hours.</p>
                    </div>
                  ) : (<p className="text-red-400 font-mono text-sm">{passwordResetResult.error}</p>)}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">User Email Address</label>
                  <input type="email" value={passwordResetEmail} onChange={(e) => setPasswordResetEmail(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-white/50 transition-all" placeholder="user@example.com" disabled={passwordResetResult?.success} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setShowPasswordResetModal(false); setPasswordResetEmail(''); setPasswordResetResult(null); }} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all font-mono">{passwordResetResult?.success ? 'Close' : 'Cancel'}</button>
                  <button onClick={handlePasswordReset} disabled={isResettingPassword || !passwordResetEmail} className="flex-1 py-3 border rounded-lg transition-all font-mono font-bold text-black disabled:opacity-50" style={{ background: primaryColor, borderColor: primaryColor, boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)` }}>{isResettingPassword ? 'Resetting...' : 'Reset Password'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUserToDelete(null)} />
          <div className="relative border rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(239, 68, 68, 0.3)`, background: `linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(239, 68, 68, 0.15)` }}>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                <TrashIcon size={32} />
              </div>
              <h3 className="text-2xl font-mono font-bold text-white mb-2">Remove User</h3>
              <p className="text-gray-400 font-mono text-sm mb-8">Are you sure you want to permanently remove <strong className="text-red-400">"{userToDelete.name}"</strong>? They will lose all access immediately. This cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => setUserToDelete(null)} className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-white/10 transition-all font-mono font-bold">CANCEL</button>
                <button onClick={confirmDeleteUser} className="flex-1 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all font-mono font-bold">REMOVE USER</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Settings & Theme Modal */}
        {colorPickerTabId && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setColorPickerTabId(null)} />
            <div className="relative border rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 duration-200"
                style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-mono font-bold text-white">Tab Theme Color</h3>
                  <button onClick={() => setColorPickerTabId(null)} className="p-2 text-gray-400 hover:text-white rounded transition-colors"><CloseIcon size={24} /></button>
              </div>

              <div className="mb-6">
                  <button
                      onClick={() => {
                        const newColors = { ...customTabColors };
                        delete newColors[colorPickerTabId];
                        setCustomTabColors(newColors);
                        saveAdminPreferences(tabOrder.length > 0 ? tabOrder : DEFAULT_TABS.map(t => t.id), newColors);
                        setColorPickerTabId(null);
                      }}
                      className="px-4 py-3 rounded-lg font-mono text-sm font-bold transition-all hover:bg-white/10 border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] w-full flex items-center justify-center gap-2"
                      style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, borderColor: `rgba(${primaryRgb}, 0.3)`, color: primaryColor }}
                  >
                      <RefreshIcon size={16} /> Reset to Organization Default
                  </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                  {ACCENT_COLORS.map(color => (
                      <button
                          key={color.name}
                          onClick={() => {
                            const newColors = { ...customTabColors, [colorPickerTabId]: color.name };
                            setCustomTabColors(newColors);
                            saveAdminPreferences(tabOrder.length > 0 ? tabOrder : DEFAULT_TABS.map(t => t.id), newColors);
                            setColorPickerTabId(null);
                          }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition-all group"
                      >
                          <div className="w-8 h-8 rounded-lg shadow-lg group-hover:scale-110 transition-transform" 
                              style={{ backgroundColor: color.hex, boxShadow: `0 0 10px ${color.hex}40` }} />
                      </button>
                  ))}
              </div>
            </div>
          </div>
        )}

    </div>
  );
};

// ============================================
// SYSTEM TAB COMPONENT WITH SUB-TABS
// ============================================

interface SystemTabProps {
  copiedEmbed: string | null;
  handleCopyEmbed: (type: string, code: string) => void;
  embedCodes: { button: string, redirect: string };
}

const SystemTab: React.FC<SystemTabProps> = ({ copiedEmbed, handleCopyEmbed, embedCodes }) => {
  const { organization } = useAuth();
  const primaryColor = organization?.primary_color || '#06b6d4';
  const primaryRgb = React.useMemo(() => {
    const c = primaryColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  }, [primaryColor]);

  const [activeSubTab, setActiveSubTab] = useState<'apps' | 'integrations' | 'database' | 'embed' | 'legal'>('apps');

  // --- NEW: Sub-Tab Color State ---
  const [colorPickerSubTabId, setColorPickerSubTabId] = useState<string | null>(null);
  const [subTabColors, setSubTabColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('system_subtab_colors') || '{}'); } catch { return {}; }
  });

  const updateSubTabColor = (id: string, color: string) => {
    const newColors = { ...subTabColors, [id]: color };
    setSubTabColors(newColors);
    localStorage.setItem('system_subtab_colors', JSON.stringify(newColors));
    setColorPickerSubTabId(null);
  };

  const resetSubTabColor = (id: string) => {
    const newColors = { ...subTabColors };
    delete newColors[id];
    setSubTabColors(newColors);
    localStorage.setItem('system_subtab_colors', JSON.stringify(newColors));
    setColorPickerSubTabId(null);
  };

  const subTabs = [
    { id: 'apps', label: 'Apps' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'database', label: 'Database' },
    { id: 'embed', label: 'Embed Code' },
    { id: 'legal', label: 'Legal' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1 mb-6 border-b border-gray-800/50 pb-1 overflow-x-auto no-scrollbar">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const activeColorName = subTabColors[tab.id] || 'org';
          return (
            <button 
              key={tab.id} 
              onClick={() => setActiveSubTab(tab.id as any)} 
              className={`cut-tab cut-tab-${activeColorName} group relative px-5 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-all duration-300 flex-shrink-0 flex flex-row flex-nowrap items-center justify-between gap-3 ${
                isActive ? 'cut-tab-active' : 'text-gray-500 hover:text-gray-300'
              }`}
              style={isActive && activeColorName === 'org' ? { color: primaryColor } : {}}
            >
              {isActive && <span className="cut-tab-shimmer-el" />}
              <span className="relative z-[1] whitespace-nowrap">{tab.label}</span>

              {/* Gear Icon - Fixed Width & Flex-Shrink-0 to prevent wrapping/overlap */}
              <div 
                className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10 flex items-center justify-center w-4 h-4 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); setColorPickerSubTabId(tab.id); }}
              >
                <div className="hover:bg-white/10 rounded transition-all p-1 flex items-center justify-center">
                  <SettingsIcon size={14} className="text-gray-400 hover:text-white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeSubTab === 'apps' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
            <p className="text-gray-400 font-mono">System MiniApps are the built-in applications that come with each workspace. Only the Platform Owner can modify these templates.</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-3"><BuildIcon size={20} className="text-cyan-400" /> MiniApp Template Editor</h3>
            <p className="text-gray-500 font-mono text-sm">Coming soon - Drag and drop builder for system MiniApps</p>
          </div>
          <div className="relative rounded-xl border border-cyan-500/50 bg-black overflow-hidden neon-glow-cyan">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-transparent to-fuchsia-950/30" />
            <div className="absolute inset-0 hex-pattern opacity-20" />
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute -inset-2 bg-cyan-500/30 rounded-xl blur-lg animate-pulse" />
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/50 flex items-center justify-center">
                    <LockIcon size={28} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-mono font-bold neon-text-cyan">Q-CORE Digital Security</h3>
                  <p className="text-xs font-mono text-fuchsia-400 tracking-widest uppercase">Quantum-Immune Encryption Protocol</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'Symmetric Encryption', value: 'AES-256-GCM' },
                  { label: 'Key Encapsulation', value: 'ML-KEM-1024 (PQC)' },
                  { label: 'Protocol Type', value: 'Hybrid Classical + PQC' },
                  { label: 'Security Level', value: 'NIST Level 5 (Quantum-Safe)' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4">
                    <p className="text-gray-500 text-xs font-mono uppercase mb-1">{item.label}</p>
                    <p className="text-cyan-400 font-mono font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 font-mono text-sm">All platform data is protected by our proprietary hybrid encryption system, making it immune to both classical and quantum computing attacks.</p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'integrations' && <IntegrationsPanel />}

      {activeSubTab === 'database' && (
        <div className="space-y-6">
          <RuntimeLogPanel />
          <CodeDiffViewer />
          <SystemSnapshotPanel />
          <DatabaseMonitorPanel />
          <details className="rounded-xl border border-gray-800 bg-black/60">
            <summary className="p-4 cursor-pointer text-gray-400 font-mono text-sm hover:text-cyan-400 transition-colors">Legacy Database Tools (Seeder, Verification, Direct Test)</summary>
            <div className="p-4 space-y-4 border-t border-gray-800">
              <DirectDatabaseTest />
              <DatabaseVerification />
              <DatabaseSeeder />
            </div>
          </details>
        </div>
      )}

      {activeSubTab === 'embed' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-fuchsia-950/20 p-6">
            <h3 className="text-lg font-mono font-bold text-white mb-2">Embeddable Sign-In for www.applegate.solutions</h3>
            <p className="text-gray-400 font-mono text-sm">Use these code snippets to add Applegate CORE sign-in functionality to your parent website.</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-mono font-medium">Sign-In Button</h4>
              <button onClick={() => handleCopyEmbed('button', embedCodes.button)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all">
                {copiedEmbed === 'button' ? <CheckIcon size={16} className="text-green-400" /> : <CopyIcon size={16} />}
                {copiedEmbed === 'button' ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-cyan-400 font-mono">{embedCodes.button}</pre>
            <div className="mt-4 p-4 bg-gray-950/50 border border-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 font-mono mb-3 uppercase">Preview:</p>
              <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.3)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
                Sign In to CORE
              </a>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-mono font-medium">Simple Redirect Link</h4>
              <button onClick={() => handleCopyEmbed('redirect', embedCodes.redirect)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all">
                {copiedEmbed === 'redirect' ? <CheckIcon size={16} className="text-green-400" /> : <CopyIcon size={16} />}
                {copiedEmbed === 'redirect' ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-cyan-400 font-mono">{embedCodes.redirect}</pre>
          </div>
        </div>
      )}

      {activeSubTab === 'legal' && (
        <div className="space-y-6">
          <div className="relative rounded-xl border border-red-500/30 bg-gradient-to-r from-red-950/20 to-fuchsia-950/20 p-6 overflow-hidden">
            <div className="absolute inset-0 hex-pattern opacity-10" />
            <div className="relative z-10">
              <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3 mb-2"><ShieldIcon size={20} className="text-red-400" /> Legal Documents</h3>
              <p className="text-gray-400 font-mono text-sm">End User License Agreement, Terms of Service, and Privacy Policy. These documents are presented to users during trial signup and must be accepted before proceeding.</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6 max-h-[60vh] overflow-y-auto"><LegalViewer /></div>
        </div>
      )}

      {/* Sub-Tab Theme Color Picker Modal */}
      {colorPickerSubTabId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setColorPickerSubTabId(null)} />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl animate-in zoom-in-95 duration-200"
              style={{ borderColor: `rgba(${primaryRgb}, 0.4)` }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white">Sub-Tab Theme Color</h3>
                <button onClick={() => setColorPickerSubTabId(null)} className="p-2 text-gray-400 hover:text-white rounded transition-colors"><CloseIcon size={24} /></button>
            </div>

            <div className="mb-6">
                <button
                    onClick={() => resetSubTabColor(colorPickerSubTabId)}
                    className="px-4 py-3 rounded-lg font-mono text-sm font-bold transition-all hover:bg-white/5 border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] w-full flex items-center justify-center gap-2"
                    style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, borderColor: `rgba(${primaryRgb}, 0.3)`, color: primaryColor }}
                >
                    <RefreshIcon size={16} /> Reset to Organization Default
                </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                {ACCENT_COLORS.map(color => (
                    <button
                        key={color.name}
                        onClick={() => updateSubTabColor(colorPickerSubTabId, color.name)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-gray-800 hover:bg-white/5 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg shadow-lg group-hover:scale-110 transition-transform" 
                            style={{ backgroundColor: color.hex, boxShadow: `0 0 10px ${color.hex}40` }} />
                    </button>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ============================================
// SETTINGS TAB COMPONENT WITH SUB-TABS
// ============================================

interface SettingsTabProps {
  is2FAEnabled: boolean;
  isSettingUp2FA: boolean;
  handleStart2FASetup: () => void;
  setShowEmailChangeModal: (show: boolean) => void;
  setShowPasswordResetModal: (show: boolean) => void;
  user: any;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  is2FAEnabled, isSettingUp2FA, handleStart2FASetup, setShowEmailChangeModal, setShowPasswordResetModal, user
}) => {
  const { organization } = useAuth();
  const primaryColor = organization?.primary_color || '#06b6d4';
  const [myPassword, setMyPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [hasPasswordSet, setHasPasswordSet] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'sync_offline' | 'pricing'>('general');

  useEffect(() => {
    const checkPasswordStatus = async () => {
      const platformUser = user as PlatformUser;
      if (platformUser?.email) {
        const { data } = await db.from('platform_users').select('password_hash').eq('email', platformUser.email).single();
        setHasPasswordSet(!!data?.password_hash);
      }
    };
    checkPasswordStatus();
  }, [user]);

  const handleSetMyPassword = async () => {
    if (!myPassword || myPassword.length < 12) { setPasswordResult({ success: false, error: 'Password must be at least 12 characters' }); return; }
    if (myPassword !== confirmPassword) { setPasswordResult({ success: false, error: 'Passwords do not match' }); return; }

    setIsSettingPassword(true);
    setPasswordResult(null);

    try {
      const platformUser = user as PlatformUser;
      const { data, error } = await supabase.functions.invoke('secure-auth', {
        body: { action: 'set_password', email: platformUser?.email, password: myPassword }
      });
      if (error) throw error;
      if (data.success) {
        setPasswordResult({ success: true, message: data.message });
        setMyPassword(''); setConfirmPassword(''); setHasPasswordSet(true);
      } else {
        setPasswordResult({ success: false, error: data.error || 'Failed to set password' });
      }
    } catch (err: any) {
      setPasswordResult({ success: false, error: err.message || 'Failed to set password' });
    }
    setIsSettingPassword(false);
  };

  const subTabs = [
    { id: 'general', label: 'General' },
    { id: 'sync_offline', label: 'Sync & Offline' },
    { id: 'pricing', label: 'Pricing' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1 mb-6 border-b border-gray-800/50 pb-1 overflow-x-auto no-scrollbar">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => setActiveSubTab(tab.id as any)} 
              className={`cut-tab cut-tab-org relative px-6 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-all duration-300 flex-shrink-0 ${
                isActive ? 'cut-tab-active' : 'text-gray-500 hover:text-gray-300'
              }`}
              style={isActive ? { color: primaryColor } : {}}
            >
              {isActive && <span className="cut-tab-shimmer-el" />}
              <span className="relative z-[1]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === 'general' && (
        <div className="space-y-6">
          {hasPasswordSet && <ChangePasswordPanel />}
          {!hasPasswordSet && (
            <div className="relative rounded-xl border border-cyan-500/50 bg-black overflow-hidden neon-glow-cyan">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 to-transparent" />
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-cyan-500/30 rounded-lg blur-lg animate-pulse" />
                    <LockIcon size={28} className="relative text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-mono font-bold text-white">Set My Password</h3>
                    <p className="text-xs font-mono text-cyan-400">Set your secure login password</p>
                  </div>
                </div>
                <p className="text-gray-400 font-mono text-sm mb-4">Set a secure password for your account. This password will be encrypted using PBKDF2-SHA256 with 310,000 iterations.</p>
                {passwordResult && (
                  <div className={`rounded-lg p-4 mb-4 ${passwordResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <p className={`font-mono text-sm ${passwordResult.success ? 'text-green-400' : 'text-red-400'}`}>{passwordResult.success ? passwordResult.message : passwordResult.error}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-mono font-medium text-gray-400 mb-2">New Password</label>
                    <input type="password" value={myPassword} onChange={(e) => setMyPassword(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all" placeholder="Enter a strong password (min 12 characters)" />
                  </div>
                  <div>
                    <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all" placeholder="Confirm your password" />
                  </div>
                  <button onClick={handleSetMyPassword} disabled={isSettingPassword || !myPassword || !confirmPassword} className="px-5 py-3 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all disabled:opacity-50 font-mono">
                    {isSettingPassword ? 'Setting Password...' : 'Set Password'}
                  </button>
                </div>
                <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <h4 className="text-sm font-mono font-medium text-gray-300 mb-2">Login Process:</h4>
                  <ol className="text-xs font-mono text-gray-500 space-y-1 list-decimal list-inside">
                    <li>Go to the login page and enter your email: andrew@applegate.solutions</li>
                    <li>Enter the password you set above</li>
                    <li>If 2FA is enabled, enter your Google Authenticator code</li>
                    <li>You will be authenticated and redirected to your dashboard</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          <div className="relative rounded-xl border border-purple-500/50 bg-black overflow-hidden neon-glow-purple">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 to-transparent" />
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute -inset-2 bg-purple-500/30 rounded-lg blur-lg animate-pulse" />
                  <KeyIcon size={28} className="relative text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-white">Two-Factor Authentication</h3>
                  <p className="text-xs font-mono text-purple-400">{is2FAEnabled ? 'Enabled - Google Authenticator' : 'Not configured'}</p>
                </div>
              </div>
              <p className="text-gray-400 font-mono text-sm mb-4">Google Authenticator is required for sensitive operations like changing the platform owner email.</p>
              {is2FAEnabled ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-mono"><CheckIcon size={16} /> 2FA Enabled</span>
                  <button className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg hover:border-purple-500/50 transition-all font-mono text-sm">Reconfigure</button>
                </div>
              ) : (
                <button onClick={handleStart2FASetup} disabled={isSettingUp2FA} className="px-5 py-3 bg-purple-500/10 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50 font-mono">
                  {isSettingUp2FA ? 'Generating...' : 'Setup Google Authenticator'}
                </button>
              )}
            </div>
          </div>

          <div className="relative rounded-xl border border-red-500/50 bg-black overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 to-transparent" />
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute -inset-2 bg-red-500/30 rounded-lg blur-lg animate-pulse" />
                  <LockIcon size={28} className="relative text-red-400 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-white">Platform Owner Email</h3>
                  <p className="text-xs font-mono text-red-400">Requires 2-Step Verification to change</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input type="email" value="andrew@applegate.solutions" disabled className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-400 font-mono" />
                <button onClick={() => setShowEmailChangeModal(true)} disabled={!is2FAEnabled} className="px-5 py-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono">Change Email</button>
              </div>
              {!is2FAEnabled && <p className="text-yellow-400 text-xs font-mono mt-3">You must enable 2FA before you can change the platform owner email.</p>}
            </div>
          </div>

          <div className="relative rounded-xl border border-orange-500/50 bg-black overflow-hidden neon-glow-orange">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 to-transparent" />
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute -inset-2 bg-orange-500/30 rounded-lg blur-lg animate-pulse" />
                  <KeyIcon size={28} className="relative text-orange-400 drop-shadow-[0_0_10px_rgba(255,153,0,0.8)]" />
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-white">Password Reset</h3>
                  <p className="text-xs font-mono text-orange-400">Admin-initiated password reset for platform users</p>
                </div>
              </div>
              <p className="text-gray-400 font-mono text-sm mb-4">Reset a user's password and generate a temporary access code. The user will be required to set a new password on their next login.</p>
              <button onClick={() => setShowPasswordResetModal(true)} className="px-5 py-3 bg-orange-500/10 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/20 hover:shadow-[0_0_20px_rgba(255,153,0,0.3)] transition-all font-mono">Reset User Password</button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'sync_offline' && (
        <div className="space-y-6">
          <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-fuchsia-950/20 p-6 overflow-hidden">
            <div className="absolute inset-0 hex-pattern opacity-10" />
            <div className="relative z-10">
              <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3 mb-2"><SyncIcon size={20} className="text-cyan-400" /> Sync & Offline Management</h3>
              <p className="text-gray-400 font-mono text-sm">Control sync frequency, manage cached data, and monitor offline operations. Changes here apply as the default for all organizations. Organization admins can override their own sync frequency.</p>
            </div>
          </div>
          <SyncStatusPanel />
        </div>
      )}

      {activeSubTab === 'pricing' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-green-500/30 bg-black/80 p-6">
            <h3 className="text-lg font-mono font-bold text-white mb-6 flex items-center gap-3"><BarChartIcon size={20} className="text-green-400" /> Pricing Settings</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Organization Admin Price (Monthly)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-mono">$</span>
                  <input type="number" defaultValue={249} className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-4 py-3 text-green-400 font-mono font-bold focus:outline-none focus:border-green-500/50 focus:shadow-[0_0_15px_rgba(0,255,0,0.2)] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Per User Price (Monthly)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-mono">$</span>
                  <input type="number" defaultValue={19} className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-4 py-3 text-green-400 font-mono font-bold focus:outline-none focus:border-green-500/50 focus:shadow-[0_0_15px_rgba(0,255,0,0.2)] transition-all" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-green-500/30 bg-black/80 p-6">
            <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-3"><BarChartIcon size={20} className="text-green-400" /> Subscription Tiers</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: 'Starter', price: 149, features: ['5 Users', '3 Workspaces', 'Basic Support', 'Standard Encryption'] },
                { name: 'Professional', price: 249, features: ['25 Users', '10 Workspaces', 'Priority Support', 'Q-CORE Encryption', 'Audit Logs'] },
                { name: 'Expert', price: 499, features: ['Unlimited Users', 'Unlimited Workspaces', '24/7 Support', 'Q-CORE Encryption', 'Full Audit Trail', 'Custom Integrations', 'Quantum Dashboard'] },
              ].map((tier) => (
                <div key={tier.name} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                  <h4 className="text-white font-mono font-bold text-lg mb-1">{tier.name}</h4>
                  <p className="text-green-400 font-mono text-2xl font-bold mb-3">${tier.price}<span className="text-sm text-gray-500">/mo</span></p>
                  <ul className="space-y-1.5">
                    {tier.features.map((f, i) => <li key={i} className="text-gray-400 font-mono text-xs flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400" />{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-green-500/30 bg-black/80 p-6">
            <h3 className="text-lg font-mono font-bold text-white mb-4">Free Trial Settings</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Trial Duration (Days)</label>
                <input type="number" defaultValue={14} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-green-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Trial Tier Access</label>
                <select className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-green-500/50 transition-all">
                  <option value="expert">Expert (Full Access)</option>
                  <option value="professional">Professional</option>
                  <option value="starter">Starter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Card Verification Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-mono">$</span>
                  <input type="number" defaultValue={1.00} step={0.01} className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-4 py-3 text-white font-mono focus:outline-none focus:border-green-500/50 transition-all" />
                </div>
                <p className="text-gray-600 font-mono text-xs mt-1">Amount authorized and immediately refunded to verify card</p>
              </div>
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Warning Notifications</label>
                <div className="space-y-2">
                  {[7, 3, 1].map(days => (
                    <label key={days} className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                      <input type="checkbox" defaultChecked className="rounded border-gray-700 bg-gray-900 text-green-500" /> {days} day{days > 1 ? 's' : ''} before expiry
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// FINANCIALS TAB COMPONENT WITH SUB-TABS
// ============================================

const RocketIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

// Move/Export-Right Icon
const MoveRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// --- Calculation Helpers ---
const parseCurrency = (val: string | number | undefined): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return Number(val.replace(/[^0-9.-]+/g, "")) || 0;
};

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

// --- Inline Edit Component ---
const InlineEdit: React.FC<{
  value: string | number;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  multiline?: boolean; // New prop for textarea support
}> = ({ value, onSave, className = "", inputClassName = "", placeholder = "", multiline = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  useEffect(() => { setTempVal(value); }, [value]);

  const finishEdit = () => {
    setIsEditing(false);
    if (tempVal.toString() !== value.toString()) {
      onSave(tempVal.toString());
    }
  };

  if (isEditing) {
    const sharedProps = {
      autoFocus: true,
      value: tempVal,
      onChange: (e: any) => setTempVal(e.target.value),
      onBlur: finishEdit,
      onClick: (e: any) => e.stopPropagation(),
      className: `bg-black border border-cyan-500/80 text-white rounded px-2 py-1 outline-none shadow-[0_0_10px_rgba(0,255,255,0.3)] w-full min-w-[60px] ${inputClassName}`,
      placeholder: placeholder
    };

    if (multiline) {
      return (
        <textarea
          {...sharedProps}
          rows={3}
          onKeyDown={(e) => {
            // Escape to cancel, but allow Enter for new lines
            if (e.key === 'Escape') {
              setTempVal(value);
              setIsEditing(false);
            }
          }}
        />
      );
    }

    return (
      <input
        {...sharedProps}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finishEdit();
          if (e.key === 'Escape') {
            setTempVal(value);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span 
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`cursor-pointer hover:bg-white/10 hover:ring-1 hover:ring-white/30 rounded transition-all inline-block px-1 min-h-[20px] min-w-[20px] ${multiline ? 'whitespace-pre-wrap block w-full' : ''} ${className}`}
      title="Click to edit"
    >
      {value || <span className="opacity-50 italic">{placeholder}</span>}
    </span>
  );
};


const FinancialsTab: React.FC = () => {
  const { organization } = useAuth();
  const primaryColor = organization?.primary_color || '#06b6d4';
  const primaryRgb = React.useMemo(() => {
    const c = primaryColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  }, [primaryColor]);

  const [activeSubTab, setActiveSubTab] = useState<'proposals' | 'funding' | 'investors' | 'payments'>('proposals');

  // --- NEW: Alerts & Requests State ---
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState<string | null>(null);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .schema('app_private')
        .from('access_requests')
        .select('*')
        .eq('status', 'pending');

      if (error) {
        console.error("Error fetching alerts:", error);
        return;
      }
      
      if (data) setPendingRequests(data);
    } catch (err) {
      console.error("Network error fetching alerts:", err);
    }
  };

  useEffect(() => {
    fetchPendingRequests();

    const channel = supabase
      .channel('access_alerts')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'app_private', 
          table: 'access_requests' 
        },
        (payload) => {
          console.log('Real-time alert received:', payload);
          fetchPendingRequests();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully connected to app_private.access_requests');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApproveAccess = async (requestIds: string[]) => {
    setLoading(true);
    const selectedRequests = pendingRequests.filter(r => requestIds.includes(r.id));
    try {
      const accessRecords = selectedRequests.map(r => ({
        proposal_id: r.proposal_id,
        email: r.email
      }));
      const { error: guestError } = await supabase
        .schema('app_private')
        .from('guest_access')
        .upsert(accessRecords);
      if (guestError) throw guestError;
      
      // Cleanup UI
      if (requestIds.length === pendingRequests.filter(r => r.proposal_id === showAlertsModal).length) {
          setShowAlertsModal(null);
      }
    } catch (err) {
      console.error("Approval failed:", err);
    } finally {
      setLoading(false);
      fetchPendingRequests();
    }
  };

  // --- NEW: Sub-Tab Color State ---
  const [colorPickerSubTabId, setColorPickerSubTabId] = useState<string | null>(null);
  const [subTabColors, setSubTabColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('financial_subtab_colors') || '{}'); } catch { return {}; }
  });

  const updateSubTabColor = (id: string, color: string) => {
    const newColors = { ...subTabColors, [id]: color };
    setSubTabColors(newColors);
    localStorage.setItem('financial_subtab_colors', JSON.stringify(newColors));
    setColorPickerSubTabId(null);
  };

  const resetSubTabColor = (id: string) => {
    const newColors = { ...subTabColors };
    delete newColors[id];
    setSubTabColors(newColors);
    localStorage.setItem('financial_subtab_colors', JSON.stringify(newColors));
    setColorPickerSubTabId(null);
  };
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPitchDeckModal, setShowPitchDeckModal] = useState(false);
  
  // Track expansion states
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpansion = (phaseId: string, catIdx: number, itemIdx: number) => {
    const key = `${phaseId}-${catIdx}-${itemIdx}`;
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    phaseId: string;
    catIdx: number;
    key: 'name' | 'model_no' | 'capex_opex' | 'billed_type' | 'unit_cost' | 'qty' | 'software_cost' | 'timeline' | 'cost';
    direction: 'asc' | 'desc';
  } | null>(null);

  // Drag & Drop State
  const [draggedPhaseId, setDraggedPhaseId] = useState<string | null>(null);
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);

  // Modals
  const [proposalToDelete, setProposalToDelete] = useState<{id: string, name: string} | null>(null);
  const [phaseToDelete, setPhaseToDelete] = useState<{id: string, title: string} | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<{phaseId: string, catIdx: number, label: string} | null>(null);
  const [colorPickerPhaseId, setColorPickerPhaseId] = useState<string | null>(null);
  const [proposalColorPicker, setProposalColorPicker] = useState<{ proposalId: string, field: 'total_cost_color' | 'timeline_color' | 'opex_color' } | null>(null);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);

  const updateProposalFieldColor = async (proposalId: string, field: 'total_cost_color' | 'timeline_color' | 'opex_color', color: string) => {
    const newPhases = phases.map(p => {
      const pId = p.proposal_id || LEGACY_PROPOSAL_ID;
      if (pId === proposalId) return { ...p, [field]: color };
      return p;
    });
    setPhases(newPhases);
    // Sync the anchor phase (Phase 0) to save the colors to the DB
    const firstPhase = newPhases.find(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === proposalId);
    if (firstPhase) await syncPhaseToDB(firstPhase);
    setProposalColorPicker(null);
  };
  
  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmails, setShareEmails] = useState('');
  const [activeShareProposalId, setActiveShareProposalId] = useState<string | null>(null);
  // Media Dropdown & Video State
  const [mediaDropdownId, setMediaDropdownId] = useState<string | null>(null);
  const [videoModalProposalId, setVideoModalProposalId] = useState<string | null>(null);

  // NEW: Handle clicking outside to close media dropdown
  useEffect(() => {
    const handleGlobalClick = () => setMediaDropdownId(null);
    if (mediaDropdownId) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [mediaDropdownId]);
  
  const handleOpenShareModal = (proposalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveShareProposalId(proposalId);
    setShowShareModal(true);
  };

  // Activity Log State
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showActivityModal, setShowActivityModal] = useState<string | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<'timeline' | 'users'>('timeline');
  const [selectedLogUser, setSelectedLogUser] = useState<string | null>(null);

  // Group and sort logs by user for the session timeline
  const logsByUser = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    activityLogs.forEach(log => {
      if (!grouped[log.user_email]) grouped[log.user_email] = [];
      grouped[log.user_email].push(log);
    });
    // Sort ascending by time to calculate duration gaps
    Object.values(grouped).forEach(logs => {
       logs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
    return grouped;
  }, [activityLogs]);

  // Helper to format milliseconds to minutes/seconds
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const fetchActivityLogs = async (propId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.schema('app_private')
        .from('proposal_activity_logs')
        .select('*')
        .eq('proposal_id', propId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActivityLogs(data || []);
      setShowActivityModal(propId);
    } catch (e) {
      alert("Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeAndShare = async () => {
    if (!activeShareProposalId) return;

    // 1. Construct the secure link FIRST
    const baseUrl = 'https://share.applegate.solutions'; // Swap to Vercel URL if DNS is still propagating
    const url = `${baseUrl}/proposal/${activeShareProposalId}`;

    // 2. Copy to clipboard immediately to maintain the browser's "user gesture" permission
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      // Fallback for strict iframe preview environments (like Deploypad)
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackErr) {
        console.error('Fallback copy failed', fallbackErr);
      }
      document.body.removeChild(textArea);
    }

    // 3. Clean up and parse the comma-separated emails
    const emails = shareEmails
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e);

    if (emails.length > 0) {
      // 4. Map them to the database structure
      const accessRecords = emails.map(email => ({
        proposal_id: activeShareProposalId,
        email: email
      }));

      try {
        // 5. Insert authorized emails into Supabase
        const { error } = await supabase.schema('app_private').from('guest_access').upsert(accessRecords);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to authorize emails:", err);
        alert("Warning: Link copied, but failed to save emails to the database. Check Supabase permissions.");
      }
    }

    // 6. Cleanup the UI
    setCopiedProposalId(activeShareProposalId);
    setTimeout(() => setCopiedProposalId(null), 2000);
    setShowShareModal(false);
    setShareEmails('');
    setActiveShareProposalId(null);
  };

  // Item Move State
  const [itemToMove, setItemToMove] = useState<{phaseId: string, catIdx: number, itemIdx: number, item: any, proposalId: string} | null>(null);
  const [moveTargetPhaseId, setMoveTargetPhaseId] = useState<string>('');
  const [moveTargetSectionIdx, setMoveTargetSectionIdx] = useState<number | ''>('');
  const [moveQuantity, setMoveQuantity] = useState<number>(1);

  const LEGACY_PROPOSAL_ID = '00000000-0000-0000-0000-000000000000';

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('app_private')
        .from('platform_financial_phases')
        .select('*')
        .order('phase_number', { ascending: true });
      
      if (error) throw error;
      if (data) {
        // Normalize legacy data (add unit_cost, model_no, software_cost, timeline if missing)
        const normalizedData = data.map((phase: any) => {
          const newBreakdown = phase.breakdown?.map((cat: any) => ({
            ...cat,
            items: cat.items?.map((item: any) => {
              const newItem = { ...item };
              if (newItem.unit_cost === undefined) {
                const totalNum = parseCurrency(item.cost);
                const qtyNum = Number(item.qty) || 1;
                newItem.unit_cost = formatCurrency(totalNum / qtyNum);
              }
              if (newItem.software_cost === undefined) {
                newItem.software_cost = '$0';
              }
              if (newItem.model_no === undefined) {
                newItem.model_no = '';
              }
              if (newItem.timeline === undefined) {
                newItem.timeline = '0';
              }
              if (newItem.description === undefined) {
                newItem.description = '';
              }
              if (newItem.capex_opex === undefined) {
                newItem.capex_opex = 'CapEx';
              }
              if (newItem.billed_type === undefined) {
                newItem.billed_type = 'Contract';
              }
              return newItem;
            }) || []
          })) || [];
          return { 
            ...phase, 
            breakdown: newBreakdown,
            timeline_months: phase.timeline_months || '0'
          };
        });

        setPhases(normalizedData);
      }
    } catch (error) {
      console.error("Financial Uplink Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFinancials(); }, []);

  useEffect(() => {
    const syncHeights = () => {
      // Use requestAnimationFrame to let the DOM paint the text naturally first
      requestAnimationFrame(() => {
        // Sync Titles
        const titles = document.querySelectorAll('.sync-title-height');
        let maxTitle = 0;
        titles.forEach(el => {
          (el as HTMLElement).style.minHeight = 'auto'; // Reset to measure natural height
          if (el.scrollHeight > maxTitle) maxTitle = el.scrollHeight;
        });
        titles.forEach(el => {
          (el as HTMLElement).style.minHeight = `${maxTitle}px`; // Apply max height to all
        });

        // Sync Subtitles
        const subtitles = document.querySelectorAll('.sync-subtitle-height');
        let maxSub = 0;
        subtitles.forEach(el => {
          (el as HTMLElement).style.minHeight = 'auto';
          if (el.scrollHeight > maxSub) maxSub = el.scrollHeight;
        });
        subtitles.forEach(el => {
          (el as HTMLElement).style.minHeight = `${maxSub}px`;
        });
      });
    };

    syncHeights();
    // Recalculate if the user resizes their browser window causing text to wrap differently
    window.addEventListener('resize', syncHeights); 
    return () => window.removeEventListener('resize', syncHeights);
  }, [phases, expandedProposalId]); // Re-runs anytime phase data or the expanded view changes

  // Group phases by Proposal ID
  const groupedProposals = React.useMemo(() => {
    const map = new Map<string, { id: string, name: string, phases: any[] }>();
    phases.forEach(phase => {
      const pId = phase.proposal_id || LEGACY_PROPOSAL_ID;
      const pName = phase.proposal_name || 'Project Sapphire';
      
      if (!map.has(pId)) {
        map.set(pId, { id: pId, name: pName, phases: [] });
      }
      map.get(pId)!.phases.push(phase);
    });

    const list = Array.from(map.values());
    list.forEach(prop => prop.phases.sort((a, b) => a.phase_number - b.phase_number));
    
    // Sort to bring the expanded proposal to the top
    list.sort((a, b) => {
      if (a.id === expandedProposalId) return -1;
      if (b.id === expandedProposalId) return 1;
      return 0; // maintain relative order for the rest
    });

    return list;
  }, [phases, expandedProposalId]); // Added expandedProposalId to dependencies

  // --- CORE DB SYNC & RECALCULATION ---
  const syncPhaseToDB = async (phase: any) => {
    let phaseTotalNum = 0;
    let phaseTimelineNum = 0;

    const newBreakdown = phase.breakdown?.map((cat: any) => {
      let catTotalNum = 0;
      let maxCatTimeline = 0; // Track the longest item timeline in this section

      const newItems = cat.items?.map((item: any) => {
        const unitCostNum = parseCurrency(item.unit_cost);
        const softCostNum = parseCurrency(item.software_cost);
        const timelineNum = Number(item.timeline) || 0;
        const qtyNum = Number(item.qty) || 0;
        const totalNum = (unitCostNum * qtyNum) + softCostNum;
        
        catTotalNum += totalNum;
        
        // Update the max timeline for this category if the current item takes longer
        if (timelineNum > maxCatTimeline) {
          maxCatTimeline = timelineNum;
        }

        return { 
          ...item, 
          unit_cost: formatCurrency(unitCostNum), 
          software_cost: formatCurrency(softCostNum),
          timeline: timelineNum.toString(),
          cost: formatCurrency(totalNum),
          description: item.description || '',
          manufacturer: item.manufacturer || '',
          product_link: item.product_link || '',
          capex_opex: item.capex_opex || 'CapEx',
          billed_type: item.billed_type || 'Contract'
        };
      }) || [];
      
      phaseTotalNum += catTotalNum;
      phaseTimelineNum += maxCatTimeline; // Add the longest section timeline to the phase total
      
      return { ...cat, value: formatCurrency(catTotalNum), items: newItems };
    }) || [];

    const phaseMobilization = parseCurrency(phase.mobilization || '$0.00');

    const phaseData = {
      proposal_id: phase.proposal_id || LEGACY_PROPOSAL_ID,
      proposal_name: phase.proposal_name,
      proposal_logo_url: phase.proposal_logo_url, 
      video_demo_url: phase.video_demo_url, 
      phase_number: phase.phase_number,
      title: phase.title, 
      subtitle: phase.subtitle,
      timeline_months: phaseTimelineNum.toString(), 
      total_amount: formatCurrency(phaseTotalNum),
      color_theme: phase.color_theme,
      total_cost_color: phase.total_cost_color || 'cyan',
      timeline_color: phase.timeline_color || 'green',
      opex_color: phase.opex_color || 'purple',
      mobilization: phase.mobilization || '$0.00',
      breakdown: newBreakdown
    };

    if (phase.id && phase.id.toString().startsWith('temp-')) {
      const { data, error } = await supabase.schema('app_private').from('platform_financial_phases')
        .insert([{ ...phaseData, id: crypto.randomUUID() }]).select().single();
      if (error) { console.error("Insert error:", error); return phase; }
      return data;
    } else {
      const { data, error } = await supabase.schema('app_private').from('platform_financial_phases')
        .update(phaseData).eq('id', phase.id).select().single();
      if (error) { console.error("Update error:", error); return phase; }
      return data;
    }
  };

  const updateStateAndSync = async (updatedPhases: any[], phaseIdToSync: string | null = null) => {
    setPhases(updatedPhases);
    if (phaseIdToSync) {
      const phaseToSync = updatedPhases.find(p => p.id === phaseIdToSync);
      if (phaseToSync) {
        const updatedPhase = await syncPhaseToDB(phaseToSync);
        setPhases(prev => prev.map(p => p.id === phaseIdToSync ? updatedPhase : p));
      }
    }
  };

  // --- SORTING HANDLER ---
  const handleSortToggle = (phaseId: string, catIdx: number, key: 'name' | 'model_no' | 'capex_opex' | 'billed_type' | 'unit_cost' | 'qty' | 'software_cost' | 'timeline' | 'cost') => {
    setSortConfig((prev) => {
      if (prev && prev.phaseId === phaseId && prev.catIdx === catIdx && prev.key === key) {
        if (prev.direction === 'asc') return { phaseId, catIdx, key, direction: 'desc' };
        return null; // toggle off
      }
      return { phaseId, catIdx, key, direction: 'asc' };
    });
  };

  // --- DRAG AND DROP HANDLER ---
  const handleDropPhase = async (proposalId: string, targetPhaseId: string) => {
    if (!draggedPhaseId || draggedPhaseId === targetPhaseId) return;

    const newPhases = [...phases];
    const proposalPhases = newPhases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === proposalId).sort((a, b) => a.phase_number - b.phase_number);
    
    const draggedIdx = proposalPhases.findIndex(p => p.id === draggedPhaseId);
    const targetIdx = proposalPhases.findIndex(p => p.id === targetPhaseId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const [draggedItem] = proposalPhases.splice(draggedIdx, 1);
    proposalPhases.splice(targetIdx, 0, draggedItem);
    
    proposalPhases.forEach((p, index) => { p.phase_number = index; });
    
    const otherPhases = newPhases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) !== proposalId);
    const finalizedPhases = [...otherPhases, ...proposalPhases];
    
    setPhases(finalizedPhases);
    setDraggedPhaseId(null);
    setDragOverPhaseId(null);

    for (const p of proposalPhases) {
      await syncPhaseToDB(p);
    }
  };

  // --- ACTIONS ---
  const handleMoveItem = async () => {
    if (!itemToMove || !moveTargetPhaseId || moveTargetSectionIdx === '') return;
    setLoading(true);
    
    try {
      const newPhases = JSON.parse(JSON.stringify(phases));
      const srcPhaseIdx = newPhases.findIndex((p: any) => p.id === itemToMove.phaseId);
      const tgtPhaseIdx = newPhases.findIndex((p: any) => p.id === moveTargetPhaseId);

      const originalItem = newPhases[srcPhaseIdx].breakdown[itemToMove.catIdx].items[itemToMove.itemIdx];
      const currentQty = Number(originalItem.qty) || 1;
      const moveQty = Number(moveQuantity) || 1;

      let itemToInsert;

      if (moveQty >= currentQty) {
        // Move the entire item
        const [movedItem] = newPhases[srcPhaseIdx].breakdown[itemToMove.catIdx].items.splice(itemToMove.itemIdx, 1);
        itemToInsert = movedItem;
      } else {
        // Split the item
        originalItem.qty = currentQty - moveQty;
        itemToInsert = { ...originalItem, qty: moveQty };
      }
      
      if (!newPhases[tgtPhaseIdx].breakdown[Number(moveTargetSectionIdx)].items) {
        newPhases[tgtPhaseIdx].breakdown[Number(moveTargetSectionIdx)].items = [];
      }
      newPhases[tgtPhaseIdx].breakdown[Number(moveTargetSectionIdx)].items.push(itemToInsert);

      setPhases(newPhases);

      if (itemToMove.phaseId === moveTargetPhaseId) {
        await syncPhaseToDB(newPhases[srcPhaseIdx]);
      } else {
        await syncPhaseToDB(newPhases[srcPhaseIdx]);
        await syncPhaseToDB(newPhases[tgtPhaseIdx]);
      }

      setItemToMove(null);
      setMoveTargetPhaseId('');
      setMoveTargetSectionIdx('');
      await fetchFinancials(); 
    } catch (error) {
      console.error(error);
      alert("Failed to move component.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteProposal = async () => {
    if (!proposalToDelete) return;
    setLoading(true);
    try {
      if (proposalToDelete.id.startsWith('temp-')) {
        setPhases(phases.filter(p => p.proposal_id !== proposalToDelete.id));
      } else {
        await supabase.schema('app_private').from('platform_financial_phases').delete().eq('proposal_id', proposalToDelete.id);
      }
      if (expandedProposalId === proposalToDelete.id) setExpandedProposalId(null);
      setProposalToDelete(null);
      await fetchFinancials();
    } catch (error) { alert("Failed to delete proposal."); } 
    finally { setLoading(false); }
  };

  const confirmDeletePhase = async () => {
    if (!phaseToDelete) return;
    setLoading(true);
    try {
      if (!phaseToDelete.id.startsWith('temp-')) {
        await supabase.schema('app_private').from('platform_financial_phases').delete().eq('id', phaseToDelete.id);
      }
      setPhases(phases.filter(p => p.id !== phaseToDelete.id));
      if (expandedPhaseId === phaseToDelete.id) setExpandedPhaseId(null);
      setPhaseToDelete(null);
    } catch (error) { alert("Failed to delete phase."); } 
    finally { setLoading(false); }
  };

  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    setLoading(true);
    try {
      const { phaseId, catIdx } = sectionToDelete;
      const newPhases = [...phases];
      const pIdx = newPhases.findIndex(p => p.id === phaseId);
      if (pIdx !== -1) {
        newPhases[pIdx].breakdown.splice(catIdx, 1);
        await updateStateAndSync(newPhases, phaseId);
      }
      setSectionToDelete(null);
    } catch (error) { alert("Failed to delete section."); }
    finally { setLoading(false); }
  };

  const addProposal = async () => {
    const newId = crypto.randomUUID();
    const newPhase = { 
      id: `temp-${crypto.randomUUID()}`, 
      proposal_id: newId, 
      proposal_name: 'NEW STRATEGIC PROPOSAL', 
      phase_number: 0, 
      title: 'Initial Concept', 
      subtitle: 'Concept Outline', 
      timeline_months: '0',
      total_amount: '$0', 
      color_theme: 'cyan', 
      breakdown: [] 
    };
    const syncedPhase = await syncPhaseToDB(newPhase);
    setPhases([...phases, syncedPhase]);
    setExpandedProposalId(newId);
  };

  const addPhase = async (proposalId: string, proposalName: string) => {
    const propPhases = phases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === proposalId);
    const newPhase = { 
      id: `temp-${Date.now()}`, 
      proposal_id: proposalId, 
      proposal_name: proposalName, 
      phase_number: propPhases.length, 
      title: `New Phase Name`, 
      subtitle: 'Phase Description', 
      timeline_months: '0',
      total_amount: '$0', 
      color_theme: 'cyan', 
      breakdown: [] 
    };
    const syncedPhase = await syncPhaseToDB(newPhase);
    setPhases([...phases, syncedPhase]);
  };

  const updateProposalName = async (proposalId: string, newName: string) => {
    const newPhases = phases.map(p => {
      const pId = p.proposal_id || LEGACY_PROPOSAL_ID;
      if (pId === proposalId) return { ...p, proposal_name: newName };
      return p;
    });
    setPhases(newPhases);
    const affectedPhases = newPhases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === proposalId);
    for (const p of affectedPhases) { await syncPhaseToDB(p); }
  };

  const updateVideoUrl = async (proposalId: string, url: string) => {
    const newPhases = phases.map(p => {
      const pId = p.proposal_id || LEGACY_PROPOSAL_ID;
      if (pId === proposalId) return { ...p, video_demo_url: url };
      return p;
    });
    setPhases(newPhases);
    const affectedPhases = newPhases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === proposalId);
    for (const p of affectedPhases) { await syncPhaseToDB(p); }
  };

  const handleLogoUpload = async (proposalId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${proposalId}-${Date.now()}.${fileExt}`;
      
      // Upload to your new Supabase bucket
      const { error: uploadError } = await supabase.storage
        .from('proposal_logos')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL for the image
      const { data: { publicUrl } } = supabase.storage
        .from('proposal_logos')
        .getPublicUrl(fileName);
      
      // Update state for all phases sharing this proposal ID
      const newPhases = phases.map(p => {
        const pId = p.proposal_id || LEGACY_PROPOSAL_ID;
        if (pId === proposalId) return { ...p, proposal_logo_url: publicUrl };
        return p;
      });
      setPhases(newPhases);
      
      // Sync the update to the database
      const affectedPhases = newPhases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === proposalId);
      for (const p of affectedPhases) { await syncPhaseToDB(p); }
      
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo.');
    } finally {
      setLoading(false);
    }
  };

  const updatePhaseField = (phaseId: string, field: string, value: string) => {
    const newPhases = phases.map(p => p.id === phaseId ? { ...p, [field]: value } : p);
    updateStateAndSync(newPhases, phaseId);
  };

  const changePhaseColor = (phaseId: string, color: string) => {
    const newPhases = phases.map(p => p.id === phaseId ? { ...p, color_theme: color } : p);
    setColorPickerPhaseId(null);
    updateStateAndSync(newPhases, phaseId);
  };

  const addSection = (phaseId: string) => {
    const newPhases = phases.map(p => {
      if (p.id !== phaseId) return p;
      return { ...p, breakdown: [...(p.breakdown || []), { label: 'NEW SECTION', value: '$0', items: [] }] };
    });
    updateStateAndSync(newPhases, phaseId);
  };

  const updateNestedItem = (phaseId: string, catIdx: number, itemIdx: number, field: string, value: string) => {
    const newPhases = JSON.parse(JSON.stringify(phases));
    const pIdx = newPhases.findIndex((p: any) => p.id === phaseId);
    
    if (pIdx > -1) {
      const item = newPhases[pIdx].breakdown[catIdx].items[itemIdx];
      
      // Auto-calculate software cost based on timeline modification
      if (field === 'timeline') {
        const oldTimeline = Number(item.timeline) || 0;
        const newTimeline = Number(value) || 0;
        const oldSoftwareCost = parseCurrency(item.software_cost || '$0');
        
        if (oldTimeline > 0) {
          const newSoftwareCost = (oldSoftwareCost / oldTimeline) * newTimeline;
          item.software_cost = formatCurrency(newSoftwareCost);
        }
      }
      
      item[field] = value;
    }
    
    updateStateAndSync(newPhases, phaseId);
  };

  const addNestedItem = (phaseId: string, catIdx: number) => {
    const newPhases = phases.map(p => {
      if (p.id !== phaseId) return p;
      const newP = { ...p, breakdown: [...p.breakdown] };
      if (!newP.breakdown[catIdx].items) newP.breakdown[catIdx].items = [];
      newP.breakdown[catIdx].items.push({ name: 'New Component', manufacturer: '', model_no: '', product_link: '', capex_opex: 'CapEx', billed_type: 'Contract', qty: 1, unit_cost: '$0', software_cost: '$0', timeline: '0', cost: '$0', description: '' });
      return newP;
    });
    updateStateAndSync(newPhases, phaseId);
  };

  const removeNestedItem = (phaseId: string, catIdx: number, itemIdx: number) => {
    const newPhases = phases.map(p => {
      if (p.id !== phaseId) return p;
      const newP = { ...p, breakdown: [...p.breakdown] };
      newP.breakdown[catIdx].items.splice(itemIdx, 1);
      return newP;
    });
    updateStateAndSync(newPhases, phaseId);
  };

  if (loading && phases.length === 0) return <div className="text-cyan-400 font-mono p-10 animate-pulse text-lg">INITIALIZING FINANCIAL UPLINK...</div>;

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-1 mb-4">
        <div className="flex items-end gap-1 overflow-x-auto no-scrollbar">
          {[
          { id: 'proposals', label: 'Proposals', icon: FileText },
          { id: 'funding', label: 'Funding', icon: Landmark },
          { id: 'investors', label: 'Investors', icon: Handshake },
          { id: 'payments', label: 'Payments', icon: CreditCard },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          const activeColorName = subTabColors[tab.id] || 'org';
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`cut-tab cut-tab-${activeColorName} group relative px-6 py-2.5 text-sm font-mono font-bold transition-all duration-300 flex-shrink-0 flex flex-row flex-nowrap items-center justify-between gap-4 ${
                isActive ? 'cut-tab-active' : 'text-gray-500 hover:text-gray-300'
              }`}
              style={isActive && activeColorName === 'org' ? { color: primaryColor } : {}}
            >
              {isActive && <span className="cut-tab-shimmer-el" />}
              
              <div className="relative z-[1] flex items-center gap-2 whitespace-nowrap">
                <Icon size={16} />
                <span>{tab.label}</span>
              </div>

              {/* Gear Icon - Fixed Width & Flex-Shrink-0 to prevent wrapping/overlap */}
              <div 
                className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10 flex items-center justify-center w-4 h-4 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); setColorPickerSubTabId(tab.id); }}
              >
                <div className="hover:bg-white/10 rounded transition-all p-1.5 flex items-center justify-center">
                  <SettingsIcon size={14} className="text-gray-400 hover:text-white" />
                </div>
              </div>
            </button>
          );
        })}
        </div>

        {/* Dynamic Header Actions */}
        {activeSubTab === 'proposals' && (
          <button
            onClick={addProposal}
            className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/50 transition-all ml-4"
            title="Add New Proposal"
          >
            <PlusIcon size={24} />
          </button>
        )}
      </div>

      {/* ─── PROPOSALS SUB-TAB ─── */}
      {activeSubTab === 'proposals' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {groupedProposals.map((proposal) => {
            const isExpanded = expandedProposalId === proposal.id;
            const themeName = proposal.phases[0]?.color_theme && tabColorMap[proposal.phases[0].color_theme] ? proposal.phases[0].color_theme : 'org';
            const totalCostColor = proposal.phases[0]?.total_cost_color || 'cyan';
            const timelineColor = proposal.phases[0]?.timeline_color || 'green';
            const opexColor = proposal.phases[0]?.opex_color || 'purple';
            
            // 1. Calculate max length using the actual stored total_amount strings
            const lengths = proposal.phases.map(p => (p.total_amount || '').length);
            const maxTotalLength = Math.max(...lengths, 10);

            // 2. Fluid Scaling: grow/shrink based on screen size AND string length
            const getUniformTextClass = (len: number) => {
                if (len >= 18) return 'text-sm sm:text-[10px] md:text-xs lg:text-[11px] xl:text-sm 2xl:text-lg tracking-tighter';
                if (len >= 15) return 'text-base sm:text-xs md:text-sm lg:text-xs xl:text-lg 2xl:text-xl tracking-tighter';
                if (len >= 12) return 'text-xl sm:text-base md:text-lg lg:text-sm xl:text-xl 2xl:text-2xl tracking-tight';
                return 'text-2xl sm:text-lg md:text-2xl lg:text-base xl:text-2xl 2xl:text-3xl tracking-tight';
            };
            const uniformTextSize = getUniformTextClass(maxTotalLength);

            // Generate visual array with instant preview reordering
            let displayPhases = [...proposal.phases];
            if (draggedPhaseId && dragOverPhaseId && draggedPhaseId !== dragOverPhaseId) {
                const draggedIdx = displayPhases.findIndex(p => p.id === draggedPhaseId);
                const targetIdx = displayPhases.findIndex(p => p.id === dragOverPhaseId);
                if (draggedIdx !== -1 && targetIdx !== -1) {
                    const [item] = displayPhases.splice(draggedIdx, 1);
                    displayPhases.splice(targetIdx, 0, item);
                }
            }

            // Aggregate Grand Totals
            let grandTotalCost = 0;
            let grandTotalTimeline = 0;
            let grandTotalCapEx = 0;
            let grandTotalOpEx = 0;

            displayPhases.forEach(phase => {
              let phaseMaxTimelineSum = 0;
              
              phase.breakdown?.forEach((cat: any) => {
                let maxCatTimeline = 0;
                
                cat.items?.forEach((item: any) => {
                  const uCost = parseCurrency(item.unit_cost);
                  const sCost = parseCurrency(item.software_cost);
                  const itemTimeline = Number(item.timeline) || 0;
                  const itemTotal = (uCost * (Number(item.qty) || 0)) + sCost;
                  
                  if (itemTimeline > maxCatTimeline) {
                    maxCatTimeline = itemTimeline;
                  }
                  
                  grandTotalCost += itemTotal; 

                  // Separate into strict CapEx / OpEx buckets
                  if (item.capex_opex === 'OpEx') {
                    grandTotalOpEx += itemTotal;
                  } else {
                    grandTotalCapEx += itemTotal;
                  }
                });
                
                phaseMaxTimelineSum += maxCatTimeline;
              });
              
              grandTotalTimeline += phaseMaxTimelineSum;
            });

            return (
              <div key={proposal.id} className={`relative rounded-xl border border-cyan-500/30 bg-black/40 transition-all duration-300 ${mediaDropdownId === proposal.id ? 'z-50' : 'z-10'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/10 to-transparent pointer-events-none rounded-xl" />
                
                {/* PROPOSAL HEADER */}
                <div 
                  className="relative z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 hover:bg-white/5 transition-colors cursor-pointer group rounded-t-xl"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName === 'INPUT') return;
                    setExpandedProposalId(isExpanded ? null : proposal.id);
                  }}
                >
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="relative group/logo w-14 h-14 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex-shrink-0 overflow-hidden">
                    {/* Conditionally render image or briefcase */}
                    {proposal.phases[0]?.proposal_logo_url ? (
                      <img src={proposal.phases[0].proposal_logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Briefcase size={28} />
                    )}
                    
                    {/* Upload Overlay on Hover */}
                    <label 
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm"
                      title="Upload custom logo"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EditIcon size={18} className="text-white" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleLogoUpload(proposal.id, e)} 
                      />
                    </label>
                  </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-mono font-bold text-white leading-tight">
                        <InlineEdit 
                            value={proposal.name} 
                            onSave={(val) => updateProposalName(proposal.id, val)}
                            inputClassName="text-2xl font-bold w-full max-w-lg"
                        />
                      </h3>
                      <p className="text-cyan-500/70 font-mono text-sm uppercase tracking-widest mt-1">Strategic Investment Proposal • {proposal.phases.length} Phases</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); fetchActivityLogs(proposal.id); }}
                      className="flex items-center justify-center w-12 h-12 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all"
                      title="View Client Activity"
                    >
                      <ActivityIcon size={20} />
                    </button>

                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setShowAlertsModal(proposal.id); 
                      }}
                      className="relative flex items-center justify-center w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/20 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
                      title="Pending Access Alerts"
                    >
                      <ShieldCheck size={20} />
                      {pendingRequests.filter(r => r.proposal_id === proposal.id).length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-lg animate-bounce z-50">
                          {pendingRequests.filter(r => r.proposal_id === proposal.id).length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={(e) => handleOpenShareModal(proposal.id, e)}
                      className="flex items-center justify-center w-12 h-12 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all"
                      title="Share Secure Link"
                    >
                      {copiedProposalId === proposal.id ? <CheckIcon size={20} className="text-green-400" /> : <Share2 size={20} />}
                    </button>

                    <div className="relative">
                      {/* Swapped text/chevron for a square Paperclip button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMediaDropdownId(mediaDropdownId === proposal.id ? null : proposal.id);
                        }}
                        className="flex items-center justify-center w-12 h-12 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all"
                        title="Attachments"
                      >
                        <Paperclip size={20} />
                      </button>

                      {mediaDropdownId === proposal.id && (
                        <div 
                          className="absolute right-0 top-[110%] w-56 bg-gray-950 border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.2)] overflow-hidden z-50 flex flex-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={(e) => { e.stopPropagation(); setShowPitchDeckModal(true); setMediaDropdownId(null); }} className="flex items-center gap-3 px-4 py-3 text-cyan-400 hover:bg-cyan-500/10 border-b border-gray-800 transition-colors font-mono text-sm text-left">
                            <RocketIcon size={16} /> Launch Pitch Deck
                          </button>
                          <a href="https://docs.google.com/presentation/d/1VgyH72x-W0knjI0QAJaSXNWPDLG3iMMzjDm7NmHrgKs/export/pdf" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-4 py-3 text-cyan-400 hover:bg-cyan-500/10 border-b border-gray-800 transition-colors font-mono text-sm">
                            <DownloadIcon size={16} /> Download Deck
                          </a>
                          <button onClick={(e) => { e.stopPropagation(); setVideoModalProposalId(proposal.id); setMediaDropdownId(null); }} className="flex items-center gap-3 px-4 py-3 text-cyan-400 hover:bg-cyan-500/10 transition-colors font-mono text-sm text-left">
                            <Film size={16} /> Configure Video Demo
                          </button>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProposalToDelete({ id: proposal.id, name: proposal.name });
                        }}
                        className="flex items-center justify-center w-12 h-12 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(255,0,0,0.3)] transition-all ml-2"
                        title="Delete Entire Proposal"
                      >
                        <TrashIcon size={20} />
                      </button>
                    )}

                    <div className={`p-2 text-gray-500 transition-transform duration-300 ml-2 ${isExpanded ? 'rotate-90' : ''}`}>
                       <ChevronRightIcon size={28} />
                    </div>
                  </div>
                </div>

                {/* EXPANDED PROPOSAL CONTENT */}
                {isExpanded && (
                  <div className="relative z-10 border-t border-cyan-500/20 p-6 bg-black/60 animate-in slide-in-from-top-2">
                    
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <h4 className="text-white font-mono font-bold text-lg flex items-center gap-3">
                          <ActivityIcon size={20} className="text-cyan-400 shrink-0" />
                          Financial Requirements Snapshot
                        </h4>
                        
                        {/* Redesigned Aggregated Totals Block */}
                        <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-6 bg-gray-900/80 border border-gray-800 rounded-xl p-5 shadow-inner w-full xl:w-auto">
                          
                          {/* Left Block: Initial Investment + Timeline + Stacked Breakdown */}
                          <div className="flex flex-col min-w-[240px]">
                            <span className="text-xs text-gray-400 font-mono tracking-widest uppercase mb-1">Initial Deployment Investment</span>
                            
                            <div className="flex flex-col mb-4 w-full">
                              <div className="group/cost flex items-center gap-2">
                                <span className={`phase-text-main-${totalCostColor} font-mono font-bold text-3xl leading-none tracking-tight`}>
                                  {formatCurrency(grandTotalCost)}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); setProposalColorPicker({ proposalId: proposal.id, field: 'total_cost_color' }); }} className="opacity-0 group-hover/cost:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity">
                                  <SettingsIcon size={14} />
                                </button>
                              </div>

                              {/* Nested Timeline */}
                              <div className="flex justify-between items-baseline mt-2">
                                <span className="text-gray-500 font-mono text-xs tracking-widest uppercase font-bold">Timeline:</span>
                                <div className="group/timeline flex items-center gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); setProposalColorPicker({ proposalId: proposal.id, field: 'timeline_color' }); }} className="opacity-0 group-hover/timeline:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity">
                                    <SettingsIcon size={12} />
                                  </button>
                                  <span className={`phase-text-main-${timelineColor} font-mono text-lg tracking-widest uppercase font-bold leading-none`}>
                                    {grandTotalTimeline} <span className="text-[10px] opacity-50">MOS</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stacked Sub-breakdown (CapEx / OpEx only) */}
                            <div className="flex flex-col gap-2 text-[10px] font-mono uppercase tracking-wider bg-black/50 p-3 rounded-lg border border-gray-700/60 shadow-sm w-full">
                              <div className="flex justify-between items-center border-b border-gray-800/60 pb-1.5">
                                <span className="text-gray-500">CapEx</span>
                                <span className="text-gray-300 font-bold">{formatCurrency(grandTotalCapEx)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">OpEx</span>
                                <span className="text-gray-300 font-bold">{formatCurrency(grandTotalOpEx)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Vertical Divider */}
                          <div className="w-[1px] bg-gray-800 hidden sm:block"></div>

                          {/* Right Block: Ongoing Yearly */}
                          <div className="flex flex-col justify-start">
                            <span className="text-xs text-gray-400 font-mono tracking-widest uppercase mb-1">Ongoing Yearly OpEx</span>
                            <div className="group/opex flex items-center gap-2 mt-1">
                              <span className={`phase-text-main-${opexColor} font-mono font-bold text-3xl leading-none tracking-tight`}>
                                {formatCurrency(grandTotalTimeline > 0 ? (grandTotalOpEx / grandTotalTimeline) * 12 : grandTotalOpEx)}
                              </span>
                              <button onClick={(e) => { e.stopPropagation(); setProposalColorPicker({ proposalId: proposal.id, field: 'opex_color' }); }} className="opacity-0 group-hover/opex:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity">
                                <SettingsIcon size={14} />
                              </button>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 mt-2 tracking-widest uppercase max-w-[200px] leading-tight">
                              Annualized run-rate<br/>post-deployment
                            </span>
                          </div>
                          
                        </div>
                      </div>

                      <button 
                        onClick={() => addPhase(proposal.id, proposal.name)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono font-bold text-sm transition-all bg-purple-500/10 border border-purple-500/50 text-purple-400 hover:bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                      >
                        <PlusIcon size={16} /> ADD PHASE
                      </button>
                    </div>

                    {/* Phases Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
                      {displayPhases.map((phase, idx) => {
                        const themeName = phase.color_theme && tabColorMap[phase.color_theme] ? phase.color_theme : 'org';
                        const isThisPhaseExpanded = expandedPhaseId === phase.id;
                        
                        const isDraggedItem = draggedPhaseId === phase.id;
                        const isDragOver = dragOverPhaseId === phase.id && draggedPhaseId !== phase.id;

                        let phaseTimelineTotalNum = 0;
                        let phaseCapExTotal = 0;
                        let phaseOpExTotal = 0;
                        let phaseMobilizationTotal = parseCurrency(phase.mobilization || '$0.00'); 
                        
                        const phaseTotalNum = phase.breakdown?.reduce((acc: number, cat: any) => {
                          let maxCatTimeline = 0;
                          
                          const catTotal = cat.items?.reduce((iAcc: number, item: any) => {
                              const uCost = parseCurrency(item.unit_cost);
                              const sCost = parseCurrency(item.software_cost);
                              const itemTimeline = Number(item.timeline) || 0;
                              
                              if (itemTimeline > maxCatTimeline) {
                                maxCatTimeline = itemTimeline;
                              }
                              
                              const itemTotal = (uCost * (Number(item.qty) || 0)) + sCost;
                              
                              if (item.capex_opex === 'OpEx') phaseOpExTotal += itemTotal;
                              else phaseCapExTotal += itemTotal; // Default to CapEx
                              
                              return iAcc + itemTotal;
                          }, 0) || 0;
                          
                          phaseTimelineTotalNum += maxCatTimeline;
                          return acc + catTotal;
                        }, 0) || 0;
                        const displayPhaseTotal = formatCurrency(phaseTotalNum);

                        let cleanTitle = phase.title;
                        if (cleanTitle.toLowerCase().startsWith('phase')) {
                            const splitTitle = cleanTitle.split(':');
                            if (splitTitle.length > 1) {
                                cleanTitle = splitTitle.slice(1).join(':').trim();
                            }
                        }

                        return (
                          <div 
                            key={phase.id} 
                            className={`relative flex flex-col pt-8 pb-2 transition-all duration-300 ease-in-out ${isDraggedItem ? 'opacity-60 scale-95' : 'opacity-100 scale-100'}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (draggedPhaseId && draggedPhaseId !== phase.id) {
                                    setDragOverPhaseId(phase.id);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (draggedPhaseId) handleDropPhase(proposal.id, dragOverPhaseId || phase.id);
                            }}
                          >
                            {/* Drag & Drop Ghost Preview */}
                            {isDragOver && (
                                <div className={`absolute inset-0 mt-10 border-2 border-dashed phase-card-${themeName} phase-bg-icon-${themeName} rounded-xl z-0`} />
                            )}

                            <div className={`relative flex flex-col h-full transition-all duration-300 z-10 ${isDraggedItem ? 'opacity-30 scale-95' : ''} ${isDragOver ? 'translate-x-4 translate-y-4 opacity-40' : ''}`}>
                                {/* FOLDER TAB */}
                                <div className="group/tab absolute top-0 left-0 w-full">
                                  <div 
                                      draggable
                                      onDragStart={(e) => {
                                          setDraggedPhaseId(phase.id);
                                          e.dataTransfer.setData('text/plain', phase.id);
                                      }}
                                      onDragEnd={() => {
                                          setDraggedPhaseId(null);
                                          setDragOverPhaseId(null);
                                      }}
                                      className={`h-[42px] px-5 rounded-t-xl border-t border-l border-r ${isDraggedItem ? 'border-dashed border-2' : `phase-card-${themeName}`} phase-header-bg-${themeName} flex items-center justify-between z-20 bg-black backdrop-blur-md pb-2 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors`}
                                      style={{ borderBottom: 'none' }}
                                  >
                                      <div className="flex items-center gap-3">
                                        <span className="text-gray-500 hover:text-white" title="Drag to reorder">⣿</span>
                                        <div className={`w-2.5 h-2.5 rounded-full phase-dot-${themeName}`} />
                                        <span className={`text-xs font-mono font-bold phase-text-main-${themeName} tracking-[0.15em] uppercase whitespace-nowrap`}>PHASE {idx}</span>
                                      </div>

                                      {/* Phase Hover Actions */}
                                      <div className="flex items-center gap-1.5 opacity-0 group-hover/tab:opacity-100 transition-opacity -mr-2">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); setColorPickerPhaseId(phase.id); }}
                                          className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors" title="Change Theme Color">
                                            <SettingsIcon size={14} />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); setPhaseToDelete({id: phase.id, title: phase.title}); }}
                                          className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-red-500/20 transition-colors" title="Delete Phase">
                                            <TrashIcon size={14} />
                                        </button>
                                      </div>
                                  </div>
                                </div>

                                {/* MAIN CARD */}
                                <div 
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                    setExpandedPhaseId(isThisPhaseExpanded ? null : phase.id);
                                    setExpandedCategory(null);
                                  }}
                                  className={`mt-[41px] bg-gray-900/40 border-b border-l border-r ${isDraggedItem ? 'border-dashed border-2 border-t-0' : `phase-card-${themeName}`} rounded-b-xl relative overflow-hidden group cursor-pointer transition-all flex-1 z-10`}
                                >
                                  <div className={`absolute inset-0 phase-bg-grad-${themeName} pointer-events-none`} />
                                  <div className="relative z-10 flex flex-col h-full pt-1">
                                    <div className="p-6 h-full flex flex-col">
                                        {/* PHASE TITLE */}
                                        <p className="sync-title-height text-gray-400 text-sm font-mono font-bold uppercase tracking-widest mb-3 transition-all duration-200">
                                            <InlineEdit 
                                              value={cleanTitle} 
                                              onSave={(val) => updatePhaseField(phase.id, 'title', val)}
                                              placeholder="Phase Title"
                                            />
                                        </p>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex-1 min-w-0 flex items-center overflow-hidden h-9">
                                              <p className={`${uniformTextSize} font-mono font-bold phase-text-main-${themeName} whitespace-nowrap transition-all duration-500 w-full truncate`} title={displayPhaseTotal}>
                                                {displayPhaseTotal}
                                              </p>
                                            </div>
                                            <p className={`sync-subtitle-height text-xs font-mono phase-text-sub-${themeName} mt-2 font-bold uppercase tracking-wider transition-all duration-200`}>
                                              <InlineEdit value={phase.subtitle} onSave={(val) => updatePhaseField(phase.id, 'subtitle', val)} placeholder="Description" />
                                            </p>

                                            {/* NEW CAPEX / OPEX / MOBILIZATION SECTION */}
                                            <div className="mt-4 flex flex-col gap-2 border-t border-gray-800/50 pt-4">
                                              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 w-full">
                                                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest shrink-0">CapEx</span>
                                                <span className={`text-xs sm:text-sm font-mono font-bold phase-text-main-${themeName}`}>
                                                  {formatCurrency(phaseCapExTotal)}
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 w-full">
                                                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest shrink-0">OpEx</span>
                                                <span className={`text-xs sm:text-sm font-mono font-bold phase-text-main-${themeName}`}>
                                                  {formatCurrency(phaseOpExTotal)}
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 w-full">
                                                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest shrink-0">Mobilization</span>
                                                <div className="max-w-full">
                                                  <InlineEdit 
                                                    value={formatCurrency(phaseMobilizationTotal)} 
                                                    onSave={(val) => updatePhaseField(phase.id, 'mobilization', formatCurrency(parseCurrency(val)))} 
                                                    className={`text-xs sm:text-sm font-mono font-bold phase-text-main-${themeName}`} 
                                                    inputClassName="w-32"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                        </div>
                                        
                                        {/* TIMELINE SECTION */}
                                        <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between mb-2">
                                          <span className="text-gray-500 font-mono text-xs uppercase tracking-widest">Timeline</span>
                                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <span className={`phase-text-main-${themeName} font-mono font-bold text-lg`} title="Auto-Calculated">
                                              {phaseTimelineTotalNum}
                                            </span>
                                            <span className="text-gray-500 font-mono text-xs uppercase tracking-widest">Months</span>
                                          </div>
                                        </div>
                                        
                                        {/* EXPANSION CHEVRON */}
                                        <div className="-mx-6 -mb-6 mt-auto pt-2 pb-1 flex items-center justify-center border-t border-gray-800/30 group-hover:bg-white/5 transition-colors">
                                            <div className={`text-gray-500 transition-transform duration-300 group-hover:phase-text-main-${themeName} ${isThisPhaseExpanded ? '-rotate-90' : 'rotate-90'}`}>
                                                <ChevronRightIcon size={24} />
                                            </div>
                                        </div>
                                    </div>
                                  </div>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Sub-breakdown Viewer/Editor */}
                    {expandedPhaseId !== null && (() => {
                      const activePhase = proposal.phases.find(p => p.id === expandedPhaseId);
                      if (!activePhase) return null;
                      const activeThemeName = activePhase.color_theme && tabColorMap[activePhase.color_theme] ? activePhase.color_theme : 'org';

                      let cleanTitle = activePhase.title;
                      if (cleanTitle.toLowerCase().startsWith('phase')) {
                          const splitTitle = cleanTitle.split(':');
                          if (splitTitle.length > 1) {
                              cleanTitle = splitTitle.slice(1).join(':').trim();
                          }
                      }

                      // Table Sorting Helper function
                      const renderSortArrow = (cIdx: number, key: string) => {
                          if (sortConfig?.phaseId === activePhase.id && sortConfig?.catIdx === cIdx && sortConfig?.key === key) {
                              return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
                          }
                          return '';
                      };

                      return (
                        <div className={`mt-8 bg-gray-950/90 border-2 phase-card-${activeThemeName} rounded-xl p-6 animate-in slide-in-from-top-2 shadow-2xl`}>
                          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
                              <h5 className={`phase-text-main-${activeThemeName} font-mono text-xl font-bold uppercase tracking-widest flex items-center gap-3`}>
                                  <DatabaseIcon size={20} /> Phase {activePhase.phase_number}: {cleanTitle} Breakdown
                              </h5>
                              <button 
                                  onClick={() => addSection(activePhase.id)} 
                                  className={`p-2 rounded-lg transition-all phase-btn-${activeThemeName}`}
                                  title="Add New Section"
                              >
                                  <PlusIcon size={20} />
                              </button>
                          </div>
                          
                          <div className="space-y-5">
                            {activePhase.breakdown?.map((category: any, cIdx: number) => {
                              const isCatExpanded = expandedCategory === category.label;
                              const catTotalNum = category.items?.reduce((iAcc: number, item: any) => {
                                  const uCost = parseCurrency(item.unit_cost);
                                  const sCost = parseCurrency(item.software_cost);
                                  return iAcc + (uCost * (Number(item.qty) || 0)) + sCost;
                              }, 0) || 0;
                              const displayCatTotal = formatCurrency(catTotalNum);

                              // Apply sorting mapped with original indices
                              let displayItems = category.items?.map((item: any, index: number) => {
                                  const uCostStr = item.unit_cost !== undefined ? item.unit_cost : formatCurrency(parseCurrency(item.cost) / (item.qty || 1));
                                  const uCostNum = parseCurrency(uCostStr);
                                  const sCostStr = item.software_cost !== undefined ? item.software_cost : '$0';
                                  const sCostNum = parseCurrency(sCostStr);
                                  const timeline = item.timeline !== undefined ? item.timeline : '0';
                                  
                                  const itemTotalNum = (uCostNum * (Number(item.qty) || 0)) + sCostNum;
                                  return { 
                                    ...item, 
                                    _oIdx: index, 
                                    _uCostStr: uCostStr, 
                                    _uCostNum: uCostNum,
                                    _sCostStr: sCostStr,
                                    _sCostNum: sCostNum,
                                    timeline: timeline,
                                    _itemTotalNum: itemTotalNum, 
                                    _displayTotal: formatCurrency(itemTotalNum) 
                                  };
                              }) || [];

                              if (sortConfig && sortConfig.phaseId === activePhase.id && sortConfig.catIdx === cIdx) {
                                  displayItems.sort((a: any, b: any) => {
                                      let comp = 0;
                                      if (sortConfig.key === 'name') comp = (a.name || '').localeCompare(b.name || '');
                                      else if (sortConfig.key === 'model_no') comp = (a.model_no || '').localeCompare(b.model_no || '');
                                      else if (sortConfig.key === 'capex_opex') comp = (a.capex_opex || '').localeCompare(b.capex_opex || '');
                                      else if (sortConfig.key === 'billed_type') comp = (a.billed_type || '').localeCompare(b.billed_type || '');
                                      else if (sortConfig.key === 'qty') comp = (Number(a.qty) || 0) - (Number(b.qty) || 0);
                                      else if (sortConfig.key === 'unit_cost') comp = a._uCostNum - b._uCostNum;
                                      else if (sortConfig.key === 'software_cost') comp = a._sCostNum - b._sCostNum;
                                      else if (sortConfig.key === 'timeline') comp = (Number(a.timeline) || 0) - (Number(b.timeline) || 0);
                                      else if (sortConfig.key === 'cost') comp = a._itemTotalNum - b._itemTotalNum;
                                      return sortConfig.direction === 'asc' ? comp : -comp;
                                  });
                              }

                              return (
                                <div key={cIdx} className="bg-black/80 border border-gray-700 rounded-lg overflow-hidden shadow-lg group/section">
                                  <div 
                                    className={`w-full flex items-center justify-between p-5 hover:bg-white/5 cursor-pointer transition-colors ${isCatExpanded ? 'bg-white/5 border-b border-gray-700' : ''}`}
                                    onClick={(e) => {
                                      if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                      setExpandedCategory(isCatExpanded ? null : category.label);
                                    }}
                                  >
                                    <div className="text-left flex items-center gap-4">
                                      <div>
                                        <span className="text-white font-mono text-base font-bold uppercase tracking-wider">
                                          <InlineEdit 
                                            value={category.label} 
                                            onSave={(val) => {
                                              const newPhases = [...phases];
                                              const pIdx = newPhases.findIndex(p => p.id === activePhase.id);
                                              newPhases[pIdx].breakdown[cIdx].label = val;
                                              updateStateAndSync(newPhases, activePhase.id);
                                            }}
                                            placeholder="Category Label"
                                          />
                                        </span>
                                        <p className="text-gray-400 text-xs font-mono mt-2">{category.items?.length || 0} Critical Components</p>
                                      </div>
                                      
                                      {/* Delete Section Icon */}
                                      <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSectionToDelete({ phaseId: activePhase.id, catIdx: cIdx, label: category.label });
                                        }}
                                        className="opacity-0 group-hover/section:opacity-100 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-all"
                                        title="Delete Section"
                                      >
                                        <TrashIcon size={16} />
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                      <div className="text-right">
                                        <span className={`phase-text-main-${activeThemeName} font-mono text-xl font-bold whitespace-nowrap`} title="Auto-Calculated">{displayCatTotal}</span>
                                      </div>
                                      <div className={`text-gray-400 transition-transform duration-300 ${isCatExpanded ? 'rotate-90' : ''}`}>
                                        <ChevronRightIcon size={20} />
                                      </div>
                                    </div>
                                  </div>

                                  {isCatExpanded && (
                                    <div className="p-0 overflow-x-auto">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="border-b border-gray-700 bg-gray-900/80 text-gray-400 font-mono text-xs uppercase tracking-widest select-none">
                                            <th className="px-5 py-4 text-left font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'name')}>
                                                Item Specification <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'name')}</span>
                                            </th>
                                            <th className="px-5 py-4 text-center font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'capex_opex')}>
                                                Expend <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'capex_opex')}</span>
                                            </th>
                                            <th className="px-5 py-4 text-center font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'billed_type')}>
                                                Billed <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'billed_type')}</span>
                                            </th>
                                            <th className="px-5 py-4 text-right font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'unit_cost')}>
                                                Unit $ <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'unit_cost')}</span>
                                            </th>
                                            <th className="px-5 py-4 text-center font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'qty')}>
                                                Qty <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'qty')}</span>
                                            </th>
                                            <th className="px-5 py-4 text-right font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'software_cost')}>
                                                Integration <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'software_cost')}</span>
                                            </th>
                                            <th className="px-5 py-4 text-center font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'timeline')}>
                                                Months <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'timeline')}</span>
                                            </th>
                                            <th className="px-5 py-4 text-right font-semibold cursor-pointer hover:text-white transition-colors" onClick={() => handleSortToggle(activePhase.id, cIdx, 'cost')}>
                                                Total <span className={`phase-text-main-${activeThemeName}`}>{renderSortArrow(cIdx, 'cost')}</span>
                                            </th>
                                            <th className="px-5 py-4 w-20 text-center"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {displayItems.map((item: any, displayIdx: number) => {
                                            const iIdx = item._oIdx; // Map to true index for modifications
                                            const isItemExpanded = expandedItems[`${activePhase.id}-${cIdx}-${iIdx}`];
                                            return (
                                              <React.Fragment key={iIdx}>
                                                <tr 
                                                  onClick={() => toggleItemExpansion(activePhase.id, cIdx, iIdx)}
                                                  className={`cursor-pointer hover:bg-white/10 transition-colors text-sm font-mono border-b border-gray-800/50 last:border-0 group/row ${displayIdx % 2 === 0 ? 'bg-gray-800/80' : 'bg-black/40'}`}
                                                >
                                                  <td className="px-5 py-3 text-gray-200">
                                                      <div className="flex items-center gap-3">
                                                        <div className={`text-gray-500 transition-transform duration-300 ${isItemExpanded ? 'rotate-90' : ''}`}>
                                                          <ChevronRightIcon size={16} />
                                                        </div>
                                                        <InlineEdit value={item.name} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'name', val)} placeholder="Component Name" />
                                                      </div>
                                                  </td>
                                                  <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                      value={item.capex_opex || 'CapEx'}
                                                      onChange={(e) => updateNestedItem(activePhase.id, cIdx, iIdx, 'capex_opex', e.target.value)}
                                                      className={`bg-transparent border border-gray-700/50 text-gray-300 text-xs font-mono font-bold uppercase rounded px-2 py-1 focus:outline-none hover:phase-card-${activeThemeName} transition-colors cursor-pointer`}
                                                    >
                                                      <option value="CapEx" className="bg-gray-900">CapEx</option>
                                                      <option value="OpEx" className="bg-gray-900">OpEx</option>
                                                    </select>
                                                  </td>
                                                  <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                      value={item.billed_type || 'Contract'}
                                                      onChange={(e) => updateNestedItem(activePhase.id, cIdx, iIdx, 'billed_type', e.target.value)}
                                                      className={`bg-transparent border border-gray-700/50 text-gray-300 text-xs font-mono font-bold uppercase rounded px-2 py-1 focus:outline-none hover:phase-card-${activeThemeName} transition-colors cursor-pointer`}
                                                    >
                                                      <option value="Contract" className="bg-gray-900">Contract</option>
                                                      <option value="Yearly" className="bg-gray-900">Yearly</option>
                                                      <option value="Monthly" className="bg-gray-900">Monthly</option>
                                                      <option value="Once" className="bg-gray-900">Once</option>
                                                    </select>
                                                  </td>
                                                  <td className="px-5 py-3 text-gray-300 text-right tabular-nums font-bold">
                                                      <InlineEdit value={item._uCostStr} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'unit_cost', val)} inputClassName="w-28 text-right" />
                                                  </td>
                                                  <td className="px-5 py-3 text-gray-300 text-center">
                                                      <InlineEdit value={item.qty} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'qty', val)} inputClassName="w-16 text-center" />
                                                  </td>
                                                  <td className="px-5 py-3 text-gray-300 text-right tabular-nums font-bold text-xs">
                                                      <InlineEdit value={item._sCostStr} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'software_cost', val)} inputClassName="w-28 text-right" />
                                                  </td>
                                                  <td className="px-5 py-3 text-gray-300 text-center tabular-nums">
                                                      <InlineEdit value={item.timeline || '0'} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'timeline', val.replace(/[^0-9.]/g, ''))} inputClassName="w-16 text-center" />
                                                  </td>
                                                  <td className="px-5 py-3 text-gray-400 text-right tabular-nums opacity-70 cursor-not-allowed" title="Auto-Calculated">
                                                      {item._displayTotal}
                                                  </td>
                                                  <td className="px-5 py-3 text-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                      <div className="flex items-center justify-end gap-1">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setItemToMove({ phaseId: activePhase.id, catIdx: cIdx, itemIdx: iIdx, item, proposalId: proposal.id });
                                                                setMoveTargetPhaseId('');
                                                                setMoveTargetSectionIdx('');
                                                                setMoveQuantity(Number(item.qty) || 1);
                                                            }} 
                                                            className={`p-1.5 text-gray-400 hover:phase-text-main-${activeThemeName} hover:phase-bg-icon-${activeThemeName} rounded transition-colors`}
                                                            title="Move Component"
                                                        >
                                                          <MoveRightIcon size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              removeNestedItem(activePhase.id, cIdx, iIdx);
                                                            }} 
                                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                                            title="Remove Item"
                                                        >
                                                          <TrashIcon size={16} />
                                                        </button>
                                                      </div>
                                                  </td>
                                                </tr>
                                                {isItemExpanded && (
                                                <tr className={`border-b border-gray-800/50 ${displayIdx % 2 === 0 ? 'bg-gray-800/40' : 'bg-black/20'}`}>
                                                  <td colSpan={8} className="px-5 py-6 pl-[4.5rem]">
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6">
                                                        {/* Left Side: Description */}
                                                        <div className="flex flex-col gap-2 md:col-span-5">
                                                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description & Purpose:</span>
                                                          <InlineEdit
                                                            value={item.description || ''}
                                                            onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'description', val)}
                                                            placeholder="Enter description and purpose for this component..."
                                                            multiline={true}
                                                            className="text-gray-400 text-sm min-h-[40px]"
                                                            inputClassName="!text-gray-400 min-h-[80px]"
                                                          />
                                                        </div>

                                                        {/* Right Side Container */}
                                                        <div className="md:col-span-6 md:col-start-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                          {/* Column 1: Manufacturer & Product Link */}
                                                          <div className="flex flex-col gap-6">
                                                            <div className="flex flex-col gap-2">
                                                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manufacturer:</span>
                                                              <InlineEdit value={item.manufacturer || ''} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'manufacturer', val)} placeholder="e.g. IBM, Dell, Cisco..." className="text-gray-300 text-sm" />
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Product Link:</span>
                                                              <div className="flex items-center gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                  <InlineEdit value={item.product_link || ''} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'product_link', val)} placeholder="https://..." className="text-cyan-400 hover:text-cyan-300 text-sm w-full truncate block" inputClassName="w-full" />
                                                                </div>
                                                                {item.product_link && (
                                                                  <a href={item.product_link.startsWith('http') ? item.product_link : `https://${item.product_link}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-1.5 bg-gray-900 border border-gray-700 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 rounded transition-colors" title="Open Link">
                                                                    <PopoutIcon size={16} />
                                                                  </a>
                                                                )}
                                                              </div>
                                                            </div>
                                                          </div>

                                                          {/* Column 2: Model # */}
                                                          <div className="flex flex-col gap-2">
                                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Model #:</span>
                                                            <InlineEdit value={item.model_no || ''} onSave={(val) => updateNestedItem(activePhase.id, cIdx, iIdx, 'model_no', val)} placeholder="Enter Model Number" className="text-gray-300 text-sm font-mono" />
                                                          </div>
                                                        </div>
                                                      </div>
                                                  </td>
                                                </tr>
                                                )}
                                              </React.Fragment>
                                            )
                                          })}
                                          
                                          <tr>
                                              <td colSpan={8} className="px-5 py-4 bg-gray-900/30">
                                                  <button onClick={() => addNestedItem(activePhase.id, cIdx)} className={`w-full py-3 flex items-center justify-center gap-2 border border-dashed border-gray-600 rounded-lg text-gray-400 font-mono text-sm phase-btn-dashed-${activeThemeName} transition-all uppercase tracking-widest font-bold`}>
                                                      <PlusIcon size={16} /> Add Component
                                                  </button>
                                              </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── FUNDING SUB-TAB ─── */}
      {activeSubTab === 'funding' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 border border-green-500/30 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-950/20 to-transparent" />
              <div className="relative z-10">
                <p className="text-gray-500 text-sm font-mono uppercase mb-2">Annual Recurring Revenue</p>
                <p className="text-4xl font-mono font-bold text-green-400">$0.0M</p>
                <p className="text-sm font-mono text-green-500 mt-3 flex items-center gap-1">
                  <span className="text-green-400">↑ 0%</span> MoM Growth
                </p>
              </div>
            </div>
            <div className="bg-gray-900/50 border border-red-500/30 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 to-transparent" />
              <div className="relative z-10">
                <p className="text-gray-500 text-sm font-mono uppercase mb-2">Monthly Burn Rate</p>
                <p className="text-4xl font-mono font-bold text-red-400">$0k</p>
                <p className="text-sm font-mono text-gray-400 mt-3">Expected runway: TBD</p>
              </div>
            </div>
            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent" />
              <div className="relative z-10">
                <p className="text-gray-500 text-sm font-mono uppercase mb-2">Customer Acquisition Cost</p>
                <p className="text-4xl font-mono font-bold text-cyan-400">$0</p>
                <p className="text-sm font-mono text-cyan-500 mt-3">LTV/CAC Ratio: 0.0</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 p-8">
             <h3 className="text-xl font-mono font-bold text-white mb-6">Financial Projections</h3>
             <div className="h-72 border border-gray-800 rounded-lg bg-gray-950 flex items-center justify-center">
                <p className="text-gray-600 font-mono text-lg">[ Financial Chart Component Placeholder ]</p>
             </div>
          </div>
        </div>
      )}

      {/* ─── INVESTORS SUB-TAB ─── */}
      {activeSubTab === 'investors' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="relative rounded-xl border border-purple-500/50 bg-black overflow-hidden neon-glow-purple">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 to-transparent" />
            <div className="relative z-10 p-8">
              <h3 className="text-2xl font-mono font-bold text-purple-400 mb-4">Current Funding Round</h3>
              <div className="w-full bg-gray-900 rounded-full h-3 mb-3 mt-6">
                <div className="bg-purple-500 h-3 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" style={{ width: '0%' }}></div>
              </div>
              <div className="flex justify-between text-sm font-mono text-gray-400 font-bold">
                <span>$0 Committed</span>
                <span>Target: TBD</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-800">
                <tr>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Investor Entity</th>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Committed</th>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr className="hover:bg-purple-500/5 transition-colors">
                  <td colSpan={4} className="p-10 text-center text-gray-500 font-mono text-lg">No active investors to display</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PAYMENTS SUB-TAB ─── */}
      {activeSubTab === 'payments' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="relative rounded-xl border border-orange-500/50 bg-black overflow-hidden neon-glow-orange">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 to-transparent" />
            <div className="relative z-10 p-8">
              <h3 className="text-2xl font-mono font-bold text-orange-400 mb-2">Payment Gateway Integration</h3>
              <p className="text-gray-400 font-mono text-sm">Platform transaction and processing metrics will populate here.</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-800">
                <tr>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Transaction ID</th>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Organization</th>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left p-5 text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr className="hover:bg-orange-500/5 transition-colors">
                  <td colSpan={4} className="p-10 text-center text-gray-500 font-mono text-lg">No recent transactions to display</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Move Modal */}
      {itemToMove && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setItemToMove(null)} />
          <div className="relative border rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-mono font-bold text-white flex items-center gap-3">
                   <MoveRightIcon size={24} style={{ color: primaryColor }} /> Move Component
                 </h3>
                 <button onClick={() => setItemToMove(null)} className="text-gray-400 hover:text-white transition-colors"><CloseIcon size={24} /></button>
              </div>
              
              <p className="text-gray-400 font-mono text-sm mb-6">
                Moving <strong style={{ color: primaryColor }}>"{itemToMove.item.name}"</strong> to a new section.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Target Phase</label>
                  <select 
                    value={moveTargetPhaseId} 
                    onChange={(e) => {
                      setMoveTargetPhaseId(e.target.value);
                      setMoveTargetSectionIdx(''); // reset section when phase changes
                    }}
                    className="w-full bg-black/50 border border-gray-700 text-white font-mono text-sm p-3 rounded-lg focus:outline-none transition-colors"
                    style={{ outlineColor: primaryColor }}
                  >
                    <option value="" disabled className="bg-gray-900">Select a Phase...</option>
                    {phases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === itemToMove.proposalId).sort((a,b)=>a.phase_number - b.phase_number).map(p => (
                      <option key={p.id} value={p.id} className="bg-gray-900">Phase {p.phase_number}: {p.title.replace(/^Phase \d+:\s*/i, '')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Target Section</label>
                  <select 
                    value={moveTargetSectionIdx} 
                    onChange={(e) => setMoveTargetSectionIdx(Number(e.target.value))}
                    disabled={!moveTargetPhaseId}
                    className="w-full bg-black/50 border border-gray-700 text-white font-mono text-sm p-3 rounded-lg focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ outlineColor: primaryColor }}
                  >
                    <option value="" disabled className="bg-gray-900">Select a Section...</option>
                    {moveTargetPhaseId && phases.find(p => p.id === moveTargetPhaseId)?.breakdown?.map((cat: any, idx: number) => (
                      <option key={idx} value={idx} className="bg-gray-900">{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Quantity to Move (Max: {Number(itemToMove.item.qty) || 1})
                  </label>
                  <input 
                    type="number" 
                    min={1} 
                    max={Number(itemToMove.item.qty) || 1}
                    value={moveQuantity}
                    onChange={(e) => {
                      const max = Number(itemToMove.item.qty) || 1;
                      let val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 1) val = 1;
                      if (val > max) val = max;
                      setMoveQuantity(val);
                    }}
                    className="w-full bg-black/50 border border-gray-700 text-white font-mono text-sm p-3 rounded-lg focus:outline-none transition-colors"
                    style={{ outlineColor: primaryColor }}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setItemToMove(null)} className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-white/10 transition-all font-mono font-bold text-sm">CANCEL</button>
                <button 
                  onClick={handleMoveItem} 
                  disabled={!moveTargetPhaseId || moveTargetSectionIdx === ''}
                  className="flex-1 py-3 border rounded-lg transition-all font-mono font-bold text-sm text-black disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: primaryColor, borderColor: primaryColor, boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)` }}
                >
                  MOVE ITEM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Proposal Modal */}
      {proposalToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProposalToDelete(null)} />
          <div className="relative border rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(239, 68, 68, 0.3)`, background: `linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(239, 68, 68, 0.15)` }}>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                <TrashIcon size={32} />
              </div>
              <h3 className="text-2xl font-mono font-bold text-white mb-2">Delete Proposal</h3>
              <p className="text-gray-400 font-mono text-sm mb-8">Are you sure you want to permanently delete <strong className="text-red-400">"{proposalToDelete.name}"</strong> and all of its associated phases and financial data? This cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => setProposalToDelete(null)} className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-white/10 transition-all font-mono font-bold">CANCEL</button>
                <button onClick={confirmDeleteProposal} className="flex-1 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all font-mono font-bold">DELETE PROPOSAL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Phase Modal */}
      {phaseToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPhaseToDelete(null)} />
          <div className="relative border rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(239, 68, 68, 0.3)`, background: `linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(239, 68, 68, 0.15)` }}>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                <TrashIcon size={32} />
              </div>
              <h3 className="text-2xl font-mono font-bold text-white mb-2">Delete Phase</h3>
              <p className="text-gray-400 font-mono text-sm mb-8">Are you sure you want to permanently delete <strong className="text-red-400">"{phaseToDelete.title}"</strong> and its financial data?</p>
              <div className="flex gap-4">
                <button onClick={() => setPhaseToDelete(null)} className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-white/10 transition-all font-mono font-bold">CANCEL</button>
                <button onClick={confirmDeletePhase} className="flex-1 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all font-mono font-bold">DELETE PHASE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Section Modal */}
      {sectionToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSectionToDelete(null)} />
          <div className="relative border rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(239, 68, 68, 0.3)`, background: `linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(239, 68, 68, 0.15)` }}>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                <TrashIcon size={32} />
              </div>
              <h3 className="text-2xl font-mono font-bold text-white mb-2">Delete Section</h3>
              <p className="text-gray-400 font-mono text-sm mb-8">Are you sure you want to permanently delete <strong className="text-red-400">"{sectionToDelete.label}"</strong> and all of its components? This cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => setSectionToDelete(null)} className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-white/10 transition-all font-mono font-bold">CANCEL</button>
                <button onClick={confirmDeleteSection} className="flex-1 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all font-mono font-bold">DELETE SECTION</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Field Color Picker Modal */}
      {proposalColorPicker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProposalColorPicker(null)} />
          <div className="relative border rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 duration-200"
              style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white">Select Value Color</h3>
                <button onClick={() => setProposalColorPicker(null)} className="p-2 text-gray-400 hover:text-white rounded transition-colors"><CloseIcon size={24} /></button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                {ACCENT_COLORS.map(color => (
                    <button
                        key={color.name}
                        onClick={() => updateProposalFieldColor(proposalColorPicker.proposalId, proposalColorPicker.field, color.name)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg shadow-lg group-hover:scale-110 transition-transform" 
                            style={{ backgroundColor: color.hex, boxShadow: `0 0 10px ${color.hex}40` }} />
                    </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Phase Theme Color Picker Modal */}
      {colorPickerPhaseId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setColorPickerPhaseId(null)} />
          <div className="relative border rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 duration-200"
              style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white">Phase Theme Color</h3>
                <button onClick={() => setColorPickerPhaseId(null)} className="p-2 text-gray-400 hover:text-white rounded transition-colors"><CloseIcon size={24} /></button>
            </div>

            <div className="mb-6">
                <button
                    onClick={() => changePhaseColor(colorPickerPhaseId, 'org')}
                    className="px-4 py-3 rounded-lg font-mono text-sm font-bold transition-all hover:bg-white/10 border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] w-full flex items-center justify-center gap-2"
                    style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, borderColor: `rgba(${primaryRgb}, 0.3)`, color: primaryColor }}
                >
                    <RefreshIcon size={16} /> Reset to Organization Default
                </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                {ACCENT_COLORS.map(color => (
                    <button
                        key={color.name}
                        onClick={() => changePhaseColor(colorPickerPhaseId, color.name)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg shadow-lg group-hover:scale-110 transition-transform" 
                            style={{ backgroundColor: color.hex, boxShadow: `0 0 10px ${color.hex}40` }} />
                    </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Share & Authorize Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="relative border rounded-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200"
               style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-mono font-bold text-white flex items-center gap-3">
                   <Share2 size={24} style={{ color: primaryColor }} /> Share Proposal
                 </h3>
                 <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white transition-colors"><CloseIcon size={24} /></button>
              </div>
              
              <p className="text-gray-400 font-mono text-sm mb-6">
                Enter the email addresses that should be authorized to view this financial snapshot. Separate multiple emails with commas.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Authorized Emails</label>
                  <textarea 
                    value={shareEmails}
                    onChange={(e) => setShareEmails(e.target.value)}
                    placeholder="client1@csu.edu, client2@csu.edu"
                    className="w-full bg-black/50 border border-gray-700 text-white font-mono text-sm p-4 rounded-lg focus:outline-none transition-colors h-32 resize-none"
                    style={{ outlineColor: primaryColor }}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowShareModal(false)} className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-white/10 transition-all font-mono font-bold text-sm">CANCEL</button>
                <button 
                  onClick={handleAuthorizeAndShare} 
                  className="flex-1 py-3 border rounded-lg transition-all font-mono font-bold text-sm text-black"
                  style={{ background: primaryColor, borderColor: primaryColor, boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)` }}
                >
                  AUTHORIZE & COPY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Setup Modal */}
      {videoModalProposalId && (() => {
        const propPhases = phases.filter(p => (p.proposal_id || LEGACY_PROPOSAL_ID) === videoModalProposalId);
        const videoUrl = propPhases[0]?.video_demo_url || '';

        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVideoModalProposalId(null)} />
            <div className="relative border rounded-2xl p-8 w-full max-w-4xl animate-in zoom-in-95 duration-200 flex flex-col gap-6"
                 style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-mono font-bold text-white flex items-center gap-3">
                    <Film size={24} style={{ color: primaryColor }} /> Video Demonstration Setup
                  </h3>
                  <button onClick={() => setVideoModalProposalId(null)} className="text-gray-400 hover:text-white transition-colors"><CloseIcon size={24} /></button>
               </div>
               
               <div>
                 <label className="block text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Video Embed URL (YouTube, Vimeo, MP4)</label>
                 <InlineEdit 
                   value={videoUrl} 
                   onSave={(val) => updateVideoUrl(videoModalProposalId, val)} 
                   placeholder="e.g., https://www.youtube.com/embed/dQw4w9WgXcQ" 
                   className="w-full border border-gray-800 p-4 rounded-lg bg-black/50 font-mono text-sm block min-h-[50px]"
                   style={{ color: primaryColor }}
                   inputClassName="w-full"
                 />
                 <p className="text-gray-500 text-xs mt-2 font-mono">Click the URL box above to edit. For best results, use standard embed links.</p>
               </div>

               {videoUrl ? (
                 <div className="w-full aspect-video bg-black rounded-xl border border-gray-800 overflow-hidden relative shadow-inner">
                   <iframe src={videoUrl} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; fullscreen" />
                 </div>
               ) : (
                 <div className="w-full aspect-video bg-black/50 rounded-xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center text-gray-600 font-mono">
                   <Film size={48} className="mb-4 opacity-50" />
                   <p>No video linked yet</p>
                 </div>
               )}
            </div>
          </div>
        );
      })()}

      {/* Activity Log Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowActivityModal(null)} />
          {/* Expanded to max-w-4xl to accommodate the two-column layout */}
          <div className="relative border rounded-2xl p-8 w-full max-w-4xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
                style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
               <h3 className="text-xl font-mono font-bold text-white flex items-center gap-3">
                 <HistoryIcon size={24} style={{ color: primaryColor }} /> Client Activity Log
               </h3>
               
               <div className="flex items-center gap-4">
                 {/* Top Navigation Tabs */}
                 <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-800">
                   <button onClick={() => setActiveLogTab('timeline')} className={`px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-widest font-bold transition-all ${activeLogTab === 'timeline' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Timeline</button>
                   <button onClick={() => setActiveLogTab('users')} className={`px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-widest font-bold transition-all ${activeLogTab === 'users' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>User Breakdown</button>
                 </div>
                 <button onClick={() => setShowActivityModal(null)} className="text-gray-400 hover:text-white transition-colors"><CloseIcon size={24} /></button>
               </div>
            </div>
            
            <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
              {activityLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-500 font-mono">No activity recorded for this proposal yet.</div>
              ) : (
                <>
                  {activeLogTab === 'timeline' && (
                    <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                      <div className="relative border-l ml-3 space-y-6 pb-4" style={{ borderColor: `rgba(${primaryRgb}, 0.3)` }}>
                        {activityLogs.map((log) => {
                          const date = new Date(log.created_at);
                          return (
                            <div key={log.id} className="relative pl-6">
                              <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px rgba(${primaryRgb}, 0.8)` }} />
                              <div className="flex flex-col gap-1 bg-black/50 border border-gray-800 rounded-lg p-3 hover:bg-white/5 transition-colors">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-sm font-mono font-bold text-white">{log.user_email}</span>
                                  <span className="text-[10px] font-mono text-gray-500 shrink-0">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                                </div>
                                <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{log.action.replace(/_/g, ' ')}</span>
                                {log.details && <p className="text-sm font-mono text-gray-400 mt-1">{log.details}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeLogTab === 'users' && (
                    <div className="flex flex-col md:flex-row h-full gap-6 overflow-hidden">
                      {/* Left Side: Authorized Users List */}
                      <div className="w-full md:w-1/3 flex flex-col border border-gray-800 rounded-xl bg-black/30 overflow-hidden">
                        <div className="p-3 border-b border-gray-800 bg-gray-900/50">
                          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest font-bold">Authorized Users</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                          {Object.keys(logsByUser).map(email => (
                            <button
                              key={email}
                              onClick={() => setSelectedLogUser(email)}
                              className={`w-full text-left px-3 py-3 rounded-lg font-mono text-sm transition-all truncate ${selectedLogUser === email ? 'bg-white/10 text-white border border-gray-600 shadow-sm' : 'text-gray-400 border border-transparent hover:bg-white/5'}`}
                            >
                              {email}
                              <span className="block text-[10px] text-gray-500 mt-1">{logsByUser[email].length} Actions Recorded</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right Side: Inferred User Session Timeline */}
                      <div className="w-full md:w-2/3 flex flex-col border border-gray-800 rounded-xl bg-black/30 overflow-hidden">
                        <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest font-bold">Session Timeline</span>
                          {selectedLogUser && <span className="text-[10px] font-mono text-cyan-400 truncate max-w-[150px]">{selectedLogUser}</span>}
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6">
                          {!selectedLogUser ? (
                            <div className="h-full flex items-center justify-center text-gray-500 font-mono text-sm">Select a user to view their session breakdown.</div>
                          ) : (
                            <div className="relative border-l space-y-6 pb-4" style={{ borderColor: `rgba(${primaryRgb}, 0.3)` }}>
                              {logsByUser[selectedLogUser]?.map((log, idx) => {
                                const nextLog = logsByUser[selectedLogUser][idx + 1];
                                const currentMs = new Date(log.created_at).getTime();
                                const nextMs = nextLog ? new Date(nextLog.created_at).getTime() : null;
                                
                                // Cap sessions to a 30-minute idle time so durations don't track over breaks
                                const durationMs = nextMs && (nextMs - currentMs < 1800000) ? nextMs - currentMs : null;
                                const date = new Date(log.created_at);

                                return (
                                  <div key={log.id} className="relative pl-6">
                                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px rgba(${primaryRgb}, 0.8)` }} />
                                    <div className="flex flex-col gap-2 bg-black/50 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors z-10 relative">
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{log.action.replace(/_/g, ' ')}</span>
                                        <span className="text-[10px] font-mono text-gray-500">{date.toLocaleTimeString()}</span>
                                      </div>
                                      {log.details && <p className="text-sm font-mono text-white">{log.details}</p>}
                                      
                                      <div className="mt-2 pt-2 border-t border-gray-800/50 flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-gray-500 uppercase">Time Spent:</span>
                                        <span className="text-xs font-mono font-bold text-gray-300">
                                          {durationMs ? formatDuration(durationMs) : (nextMs ? 'Session Idle / Break' : 'Current / Final Action')}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Visual connecting line for continuous sessions */}
                                    {durationMs && (
                                      <div className="absolute left-[-4px] top-[calc(100%+8px)] bottom-[-16px] w-[2px] opacity-30" style={{ backgroundColor: primaryColor }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Pitch Deck Modal */}
      {showPitchDeckModal && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 p-4">
          <div className="flex items-center justify-between p-5 border-b bg-black/40 shadow-2xl rounded-t-2xl" style={{ borderColor: `rgba(${primaryRgb}, 0.3)` }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, borderColor: `rgba(${primaryRgb}, 0.3)`, color: primaryColor }}>
                <UsersIcon size={20} />
              </div>
              <h3 className="text-white font-mono text-lg font-bold">Applegate CORE - Pitch Deck</h3>
              <span className="text-gray-400 font-mono text-[10px] sm:text-xs ml-2 sm:ml-4 border border-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded bg-black/50 tracking-wide">
                <span className="hidden sm:inline">CLICK SLIDE OR USE ARROWS TO NAVIGATE</span>
                <span className="inline sm:hidden">SWIPE LEFT/RIGHT TO NAVIGATE</span>
              </span>
            </div>
            <button
              onClick={() => setShowPitchDeckModal(false)}
              className="p-2.5 text-gray-400 hover:text-white rounded-lg border border-transparent hover:bg-white/10 transition-all"
            >
              <CloseIcon size={28} />
            </button>
          </div>
          
          <div className="flex-1 w-full h-full flex flex-col">
            <div className="w-full h-full flex-1 rounded-b-2xl overflow-hidden border border-t-0 shadow-2xl relative bg-black" style={{ borderColor: `rgba(${primaryRgb}, 0.3)` }}>
              <iframe 
                src="https://docs.google.com/presentation/d/1VgyH72x-W0knjI0QAJaSXNWPDLG3iMMzjDm7NmHrgKs/embed?rm=minimal&loop=true" 
                width="100%" 
                height="100%" 
                frameBorder="0"
                allowFullScreen={true}
                title="Applegate CORE Pitch Deck"
                className="absolute inset-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab Theme Color Picker Modal */}
      {colorPickerSubTabId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setColorPickerSubTabId(null)} />
          <div className="relative border rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 duration-200"
              style={{ borderColor: `rgba(${primaryRgb}, 0.3)`, background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.05), rgba(0,0,0,0.40))`, backdropFilter: 'blur(16px)', boxShadow: `0 0 40px rgba(${primaryRgb}, 0.15)` }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white">Sub-Tab Theme Color</h3>
                <button onClick={() => setColorPickerSubTabId(null)} className="p-2 text-gray-400 hover:text-white rounded transition-colors"><CloseIcon size={24} /></button>
            </div>

            <div className="mb-6">
                <button
                    onClick={() => resetSubTabColor(colorPickerSubTabId)}
                    className="px-4 py-3 rounded-lg font-mono text-sm font-bold transition-all hover:bg-white/10 border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] w-full flex items-center justify-center gap-2"
                    style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, borderColor: `rgba(${primaryRgb}, 0.3)`, color: primaryColor }}
                >
                    <RefreshIcon size={16} /> Reset to Organization Default
                </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                {ACCENT_COLORS.map(color => (
                    <button
                        key={color.name}
                        onClick={() => updateSubTabColor(colorPickerSubTabId, color.name)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg shadow-lg group-hover:scale-110 transition-transform" 
                            style={{ backgroundColor: color.hex, boxShadow: `0 0 10px ${color.hex}40` }} />
                    </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Access Alerts Modal */}
      {showAlertsModal && (() => {
        const proposalRequests = pendingRequests.filter(r => r.proposal_id === showAlertsModal);
        const propName = groupedProposals.find(p => p.id === showAlertsModal)?.name || "Proposal";

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAlertsModal(null)} />
            <div className="relative border border-amber-500/40 rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 shadow-[0_0_50px_rgba(245,158,11,0.15)]"
                 style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.05), #050505)` }}>
              
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-mono font-bold uppercase tracking-tight">Security Alerts</h3>
                    <p className="text-[10px] font-mono text-amber-500/70 uppercase">{propName}</p>
                  </div>
                </div>
                <button onClick={() => setShowAlertsModal(null)} className="text-gray-500 hover:text-white transition-colors"><CloseIcon size={24} /></button>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 no-scrollbar">
                {proposalRequests.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">No Pending Authorizations</p>
                  </div>
                ) : (
                  proposalRequests.map((req) => (
                    <div key={req.id} className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-mono text-sm font-bold">{req.email}</span>
                        <span className="text-[10px] text-gray-500 font-mono uppercase">Requested: {new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                      <button 
                        onClick={() => handleApproveAccess([req.id])}
                        className="px-3 py-1.5 rounded bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-mono text-[10px] font-bold hover:bg-cyan-500/20 transition-all"
                      >
                        APPROVE
                      </button>
                    </div>
                  ))
                )}
              </div>

              {proposalRequests.length > 1 && (
                <div className="p-4 bg-black/40 border-t border-white/5">
                  <button 
                    onClick={() => handleApproveAccess(proposalRequests.map(r => r.id))}
                    className="w-full py-3 rounded-lg bg-amber-500 text-black font-mono font-bold text-xs uppercase tracking-tighter hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  >
                    Authorize All ({proposalRequests.length}) Identities
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default PlatformOwnerPanel;