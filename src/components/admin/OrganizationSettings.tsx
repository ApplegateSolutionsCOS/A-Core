import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';

import { useAuth } from '@/contexts/AuthContext';
import { 
  CloseIcon, 
  UsersIcon, 
  SettingsIcon,
  InviteIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  CreditCardIcon,
  DownloadIcon,
  PlusIcon,
  CheckIcon,
  HistoryIcon
} from '@/components/icons/Icons';
import { OrganizationUser, Workspace, OrganizationRole } from '@/types';
import AuditLogViewer from './AuditLogViewer';
import OrganizationAdminPanel from './OrganizationAdminPanel';

interface OrganizationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  date: string;
  pdf: string;
}

const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ isOpen, onClose }) => {
  const { organization: authOrg, user, isOrganizationAdmin, isPlatformOwner } = useAuth();
  const [organization, setOrganization] = useState<any>(authOrg); // Local state for fresh DB data
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'workspaces' | 'billing' | 'audit_logs'>('general');

  // --- NEW: Dynamic Theme Colors ---
  const primaryColor = organization?.primary_color || '#06b6d4';
  const accentColor = organization?.accent_color || '#3b82f6';
  
  const primaryRgb = useMemo(() => {
    const c = primaryColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  }, [primaryColor]);
  
  const accentRgb = useMemo(() => {
    const c = accentColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
  }, [accentColor]);

  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('organization_tech_user');
  const [inviteName, setInviteName] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // Billing state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [newUserCount, setNewUserCount] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- NEW: General Settings State ---
  const [editOrgName, setEditOrgName] = useState(authOrg?.name || '');
  const [editOrgLogo, setEditOrgLogo] = useState(authOrg?.logo_url || '');
  const [editPrimaryColor, setEditPrimaryColor] = useState(authOrg?.primary_color || '#06b6d4'); 
  const [editAccentColor, setEditAccentColor] = useState(authOrg?.accent_color || '#3b82f6');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Use a ref to guarantee we only overwrite inputs on the initial load of the modal
  const isFirstLoadRef = useRef(true);

  // ⚡ THE FIX: Trigger the fetch only when the modal opens
  useEffect(() => {
    if (isOpen) {
      isFirstLoadRef.current = true;
      fetchData();
    }
  }, [isOpen]);
  // --- END NEW STATE ---

  const fetchData = async () => {
    if (!authOrg?.id) return;
    setIsLoading(true);
    try {
      // 1. Fetch users and workspaces
      const [usersResponse, workspacesResponse] = await Promise.all([
        supabase.schema('app_private').from('organization_users').select('*').eq('organization_id', authOrg.id),
        db.from('workspaces').select('*').eq('organization_id', authOrg.id).order('display_order'),
      ]);

      if (usersResponse.data) {
        let fetchedUsers = [...usersResponse.data];
        
        // Ensure the current active Admin/Owner is always visible in the Users list, 
        // even if they are a Platform Owner viewing a demo organization virtually.
        const currentUserInList = fetchedUsers.some(u => u.email === (user as any)?.email);
        
        // Ensure Platform Owners viewing a demo are also injected
        if (!currentUserInList && user && (isOrganizationAdmin() || (typeof isPlatformOwner === 'function' && isPlatformOwner()))) {
          const userEmail = (user as any).email || '';
          let displayName = (user as any).user_metadata?.full_name;

          // 1. If Auth metadata is empty, check the platform_users table
          if (!displayName) {
            const { data: pUser } = await supabase
              .schema('app_private')
              .from('platform_users')
              .select('full_name')
              .eq('id', user.id)
              .maybeSingle();
              
            if (pUser?.full_name) {
              displayName = pUser.full_name;
            } else {
              // 2. If not a platform user, check their home organization_users record
              const { data: oUser } = await supabase
                .schema('app_private')
                .from('organization_users')
                .select('full_name')
                .eq('email', userEmail)
                .eq('organization_id', authOrg.id)
                .limit(1)
                .maybeSingle();
                
              if (oUser?.full_name) displayName = oUser.full_name;
            }
          }
          
          // 3. If STILL missing, format the email prefix nicely (e.g., "andrew.smith" -> "Andrew Smith")
          if (!displayName && userEmail) {
            displayName = userEmail.split('@')[0]
              .split(/[._-]/)
              .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
          } else if (!displayName) {
            displayName = 'Platform Admin';
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
      if (workspacesResponse.data) setWorkspaces(workspacesResponse.data);
      
      // 2 & 3. Combined Fetch: Get Org Data and Logo in one request
      const { data: combinedData, error: combinedErr } = await supabase
        .schema('app_private')
        .from('organizations')
        .select(`
          *,
          organization_logos!organization_id (
            logo_url
          )
        `)
        .eq('id', authOrg.id)
        .maybeSingle();

      if (combinedErr) throw combinedErr;

      // Create a local object to store the flattened data
      let fetchedOrg = { ...combinedData };

      // Flatten the logo_url so it's directly accessible on the object
      const logoData = combinedData?.organization_logos;
      const finalLogoUrl = Array.isArray(logoData) 
        ? logoData[0]?.logo_url 
        : (logoData as any)?.logo_url;

      fetchedOrg.logo_url = finalLogoUrl || null;

      // Sync everything to UI
      setOrganization(fetchedOrg);
      
      // ⚡ THE FIX: Populate the inputs with true DB data on initial load.
      // This bypasses any stale 'authOrg' state returned from the local cache.
      if (isFirstLoadRef.current) {
        setEditOrgName(fetchedOrg.name || '');
        setEditOrgLogo(fetchedOrg.logo_url || '');
        setEditPrimaryColor(fetchedOrg.primary_color || '#06b6d4');
        setEditAccentColor(fetchedOrg.accent_color || '#3b82f6');
        isFirstLoadRef.current = false;
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  };

  const fetchBillingData = async () => {
    if (!organization?.stripe_customer_id) return;
    setIsLoadingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing', {
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

  useEffect(() => {
    if (activeTab === 'billing' && organization) {
      fetchBillingData();
    }
  }, [activeTab, organization]);

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteName || !organization) return;

    try {
      // 1. Call the Edge Function with the exact parameters it expects
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { 
          email: inviteEmail.toLowerCase(), 
          full_name: inviteName, 
          role: inviteRole, 
          org_id: organization.id 
          // Note: 'type' is omitted here so it defaults to the 'organization_users' flow in your Edge Function
        }
      });

      // 2. Check for network errors or internal Edge Function errors
        if (error) throw new Error(error.message || 'Failed to trigger Edge Function');
        
        if (data?.error) {
          // If the user already has an Auth account, we just map them to the new org directly.
          if (data.error.includes('already been registered')) {
            const { data: existingUser } = await supabase.schema('app_private')
              .from('organization_users')
              .select('id')
              .eq('email', inviteEmail.toLowerCase())
              .limit(1)
              .maybeSingle();

            if (existingUser) {
              const { error: insertError } = await supabase.schema('app_private')
                .from('organization_users')
                .insert({
                  id: existingUser.id,
                  organization_id: organization.id,
                  email: inviteEmail.toLowerCase(),
                  full_name: inviteName,
                  role: inviteRole,
                  status: 'active',
                  is_org_creator: false
                });

              if (insertError) throw new Error(insertError.message);
            } else {
              throw new Error('User exists in Auth but could not be located to map them.');
            }
          } else {
            throw new Error(data.error);
          }
        }

        // 3. Success! The Edge Function or fallback logic handled the database insert
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('workspace_regular_user' as any);
        
        // Refresh the table to show the new user
        fetchData();
      
    } catch (error: any) {
      console.error('Error inviting user:', error);
      alert(`Failed to invite user: ${error.message}`);
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

      // PREVIEW ONLY: Update local state. User must click "Save Changes" to commit.
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
      // 1. Write the new name AND colors to the primary organizations table
      const { error: orgError } = await supabase.schema('app_private')
        .from('organizations')
        .update({ 
          name: editOrgName,
          primary_color: editPrimaryColor,
          accent_color: editAccentColor
        })
        .eq('id', organization.id);

      if (orgError) throw new Error(`Org Update Failed: ${orgError.message}`);

      // 2. Write logo to the database table to "link" the storage file
      if (editOrgLogo) {
        // We use upsert here: it will Update if the ID exists, or Insert if it doesn't.
        const { error: logoLinkError } = await supabase
          .schema('app_private')
          .from('organization_logos')
          .upsert({
            organization_id: organization.id,
            logo_url: editOrgLogo,
            uploaded_by: (user as any)?.id || (user as any)?.email,
            // created_at is handled by DB default
          }, { 
            onConflict: 'organization_id' 
          });

        if (logoLinkError) throw new Error(`Logo Link Failed: ${logoLinkError.message}`);
      }

      // 3. Success! Sync state and notify user
      const updatedOrg = { 
        ...organization, 
        name: editOrgName, 
        logo_url: editOrgLogo,
        primary_color: editPrimaryColor,
        accent_color: editAccentColor
      };
      setOrganization(updatedOrg);
      
      // ⚡ THE FIX: Update Local Storage before the reload so AuthContext grabs the new name instantly
      localStorage.setItem('bos_organization', JSON.stringify(updatedOrg));
      
      // Also update the platform cache if this happens to be the primary platform org
      const cachedPlatOrg = localStorage.getItem('bos_platform_organization');
      if (cachedPlatOrg) {
        const parsedPlatOrg = JSON.parse(cachedPlatOrg);
        if (parsedPlatOrg.id === organization.id) {
          localStorage.setItem('bos_platform_organization', JSON.stringify(updatedOrg));
        }
      }

      alert('Organization settings saved successfully!');
      
      // Force hard refresh to pass the data up to AuthContext and TopHeader
      window.location.reload();
      
    } catch (error: any) {
      console.error('Error saving general settings:', error);
      alert(`Failed to save settings: ${error.message}`); 
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    
    try {
      const { error } = await supabase.schema('app_private')
        .from('organization_users')
        .delete()
        .eq('id', userId)
        .eq('organization_id', organization.id);

      
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  const toggleWorkspaceVisibility = async (workspaceId: string, currentVisibility: boolean) => {
    try {
      await db
        .from('workspaces')
        .update({ is_visible: !currentVisibility })
        .eq('id', workspaceId);
      fetchData();
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };


  const handleAddUsers = async () => {
    if (!organization || newUserCount < 1) return;
    setIsProcessingPayment(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'add_users',
          organizationId: organization.id,
          email: (user as OrganizationUser)?.email || '',
          userCount: newUserCount,
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: `${window.location.origin}?checkout=cancelled`
        }
      });

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
    setIsProcessingPayment(false);
  };

  const handleManageBilling = async () => {
    if (!organization?.stripe_customer_id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing', {
        body: {
          action: 'create_portal',
          customerId: organization.stripe_customer_id,
          returnUrl: window.location.href
        }
      });

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    }
  };

  if (!isOpen) return null;

  const userRoles: { value: OrganizationRole; label: string; description: string; price: string }[] = [
    // Manager Roles
    { value: 'organization_admin_manager', label: 'Admin Manager', description: 'Assists with administrative tasks', price: '$19/mo' },
    { value: 'organization_tech_manager', label: 'Tech Manager', description: 'Manages technical operations', price: '$19/mo' },
    { value: 'organization_support_manager', label: 'Support Manager', description: 'Manages internal support', price: '$19/mo' },
    { value: 'organization_sales_manager', label: 'Sales Manager', description: 'Manages sales operations', price: '$19/mo' },
    { value: 'organization_accounting_manager', label: 'Accounting Manager', description: 'Manages financial operations', price: '$19/mo' },
    { value: 'organization_personnel_manager', label: 'Personnel Manager', description: 'Manages HR operations', price: '$19/mo' },
    { value: 'organization_security_manager', label: 'Security Manager', description: 'Manages security policies', price: '$19/mo' },
    // User Roles
    { value: 'organization_admin_user', label: 'Admin User', description: 'Administrative staff member', price: '$19/mo' },
    { value: 'organization_tech_user', label: 'Tech User', description: 'Technical staff member', price: '$19/mo' },
    { value: 'organization_support_user', label: 'Support User', description: 'Support staff member', price: '$19/mo' },
    { value: 'organization_sales_user', label: 'Sales User', description: 'Sales staff member', price: '$19/mo' },
    { value: 'organization_accounting_user', label: 'Accounting User', description: 'Accounting staff member', price: '$19/mo' },
    { value: 'organization_personnel_user', label: 'Personnel User', description: 'HR staff member', price: '$19/mo' },
    { value: 'organization_security_user', label: 'Security User', description: 'Security staff member', price: '$19/mo' },
    // Legacy Workspace Roles
    { value: 'workspace_admin', label: 'Workspace Admin', description: 'Full control over workspaces', price: '$19/mo' },
    { value: 'workspace_regular_user', label: 'Regular User', description: 'Standard workspace access', price: '$19/mo' },
    { value: 'workspace_light_user', label: 'Light User', description: 'Limited workspace access', price: '$19/mo' },
    { value: 'workspace_guest', label: 'Guest', description: 'View-only access', price: '$19/mo' },
  ];



  const additionalUsers = users.filter(u => u.role !== 'organization_admin').length;
  const totalUserCost = additionalUsers * 19;
  const totalMonthlyCost = 249 + totalUserCost;

  return (
    <div className="fixed inset-0 z-50">
      <style>{`
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
      `}</style>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm alien-grid" onClick={onClose} />
      
      <div 
        className="absolute inset-4 md:inset-8 bg-black/40 backdrop-blur-2xl rounded-2xl overflow-hidden flex flex-col"
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

        {/* Header */}
        <div 
          className="relative flex items-center justify-between p-4 border-b flex-shrink-0"
          style={{ 
            borderColor: `rgba(${primaryRgb}, 0.2)`, 
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.4), rgba(${primaryRgb}, 0.2), rgba(0,0,0,0.4))` 
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute inset-0 h-8 animate-pulse" style={{ backgroundImage: `linear-gradient(to bottom, transparent, rgba(${primaryRgb}, 0.05), transparent)` }} />
          </div>

          <div className="flex items-center gap-4 z-10">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full blur-xl animate-pulse" style={{ backgroundColor: `rgba(${primaryRgb}, 0.2)` }} />
              <div 
                className="w-12 h-12 relative z-10 rounded-lg flex items-center justify-center overflow-hidden border"
                style={{ borderColor: `rgba(${primaryRgb}, 0.4)`, backgroundColor: `rgba(${primaryRgb}, 0.1)` }}
              >
                {editOrgLogo ? (
                  <img src={`${editOrgLogo}${editOrgLogo.includes('?') ? '&' : '?'}width=100&height=100&resize=contain`} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <SettingsIcon size={24} style={{ color: primaryColor }} />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wide text-white">Organization Settings</h2>
              <p className="text-xs font-mono tracking-widest uppercase" style={{ color: primaryColor }}>{organization?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 z-10">
            {/* Admin Console Button - only for org admins */}
            {isOrganizationAdmin() && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono text-sm border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, borderColor: `rgba(${primaryRgb}, 0.3)`, color: primaryColor }}
              >
                <ShieldIcon size={16} />
                Admin Console
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors hover:bg-white/10"
            >
              <CloseIcon size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative z-30 sticky top-0 bg-black/40 backdrop-blur-xl" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="flex items-end gap-1 px-4 pb-1 overflow-x-auto no-scrollbar pt-[3px]">
            {[
              { id: 'general', label: 'General', icon: SettingsIcon },
              { id: 'users', label: 'Users', icon: UsersIcon },
              { id: 'workspaces', label: 'Workspaces', icon: ShieldIcon },
              { id: 'billing', label: 'Billing', icon: CreditCardIcon },
              { id: 'audit_logs', label: 'Audit Logs', icon: HistoryIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`cut-tab cut-tab-org relative px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-all duration-300 flex-shrink-0 flex items-center justify-center gap-2 ${
                    isActive ? 'cut-tab-active' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={isActive ? { color: primaryColor } : {}}
                >
                  {isActive && <span className="cut-tab-shimmer-el" />}
                  <Icon size={16} className="relative z-[1]" />
                  <span className="relative z-[1]">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-black/20 to-black/60">
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-mono">
                    {users.length} user{users.length !== 1 ? 's' : ''} in your organization
                  </p>
                  <p className="text-sm font-mono text-gray-400">
                    {additionalUsers} additional user{additionalUsers !== 1 ? 's' : ''} at $19/mo each
                  </p>
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-mono font-bold rounded-lg transition-all hover:bg-white/5 border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  style={{ backgroundColor: `rgba(${primaryRgb}, 0.2)`, borderColor: `rgba(${primaryRgb}, 0.5)`, color: primaryColor }}
                >
                  <InviteIcon size={18} />
                  Invite User
                </button>
              </div>

              <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-black/50 border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">User</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Cost</th>
                      <th className="text-right p-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {users.map((orgUser) => (
                      <tr key={orgUser.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-mono font-bold"
                              style={{ backgroundImage: `linear-gradient(to bottom right, ${primaryColor}, ${accentColor})` }}
                            >
                              {orgUser.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <span className="text-white font-mono font-medium">{orgUser.full_name}</span>
                              <p className="text-xs font-mono text-gray-400">{orgUser.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            orgUser.role === 'organization_admin' 
                              ? 'bg-purple-500/20 text-purple-400' 
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {orgUser.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            orgUser.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                            orgUser.status === 'idle' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {orgUser.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">
                          {orgUser.role === 'organization_admin' ? '$249/mo' : '$19/mo'}
                        </td>
                        <td className="p-4 text-right">
                          {orgUser.role !== 'organization_admin' && (
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-slate-400 hover:text-orange-400 transition-colors">
                                <EditIcon size={18} />
                              </button>
                              <button 
                                onClick={() => handleRemoveUser(orgUser.id)}
                                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
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
              </div>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              <p className="text-gray-400 font-mono">
                Control which workspaces are visible to your team
              </p>

              <div className="grid gap-4">
                {workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className={`bg-gray-900/40 border rounded-xl p-4 ${
                      workspace.is_visible ? 'border-gray-700' : 'border-gray-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                            workspace.is_visible ? '' : 'bg-gray-800 border-gray-700'
                          }`}
                          style={workspace.is_visible ? { backgroundColor: `rgba(${primaryRgb}, 0.2)`, borderColor: `rgba(${primaryRgb}, 0.4)` } : {}}
                        >
                          <ShieldIcon size={20} style={workspace.is_visible ? { color: primaryColor } : {}} className={!workspace.is_visible ? 'text-gray-500' : ''} />
                        </div>
                        <div>
                          <h3 className="text-white font-mono font-medium">{workspace.name}</h3>
                          <p className="text-xs font-mono text-gray-400">{workspace.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleWorkspaceVisibility(workspace.id, workspace.is_visible)}
                          className={`p-2 rounded-lg transition-colors ${
                            workspace.is_visible 
                              ? 'hover:bg-white/10' 
                              : 'text-gray-500 hover:bg-gray-700'
                          }`}
                          style={workspace.is_visible ? { color: primaryColor } : {}}
                        >
                          {workspace.is_visible ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <SettingsIcon size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan */}
              <div 
                className="border rounded-xl p-6"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(${primaryRgb}, 0.1), rgba(${accentRgb}, 0.1))`,
                  borderColor: `rgba(${primaryRgb}, 0.4)`
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-mono font-bold text-white">Current Subscription</h3>
                    {(() => {
                      const PLAN_TIER_LABELS: Record<string, string> = {
                        basic: 'Basic', pro: 'Pro', expert: 'Expert',
                        enterprise: 'Enterprise', enterprisePlus: 'Enterprise+', whiteGlove: 'White Glove',
                      };
                      const rawTier = organization?.plan_tier || organization?.subscription_tier;
                      const tierLabel = rawTier ? (PLAN_TIER_LABELS[rawTier] || rawTier) : 'Basic';
                      return (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-mono font-bold border"
                          style={{ backgroundColor: `rgba(${primaryRgb}, 0.12)`, borderColor: `rgba(${primaryRgb}, 0.4)`, color: primaryColor }}
                          title="Active plan tier"
                        >
                          {tierLabel} Plan
                        </span>
                      );
                    })()}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                    organization?.subscription_status === 'active' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {organization?.subscription_status === 'active' ? 'ACTIVE' : 'TRIAL'}
                  </span>
                </div>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-gray-400 font-mono text-sm uppercase tracking-wider mb-1">Base Plan</p>
                    <p className="text-2xl font-mono font-bold text-white">$249<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                    <p className="text-xs font-mono text-gray-500 mt-1">Organization Admin</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-mono text-sm uppercase tracking-wider mb-1">Additional Users</p>
                    <p className="text-2xl font-mono font-bold text-white">{additionalUsers}<span className="text-sm text-gray-500 font-normal"> users</span></p>
                    <p className="text-xs font-mono text-gray-500 mt-1">${totalUserCost}/mo</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-mono text-sm uppercase tracking-wider mb-1">Total Monthly</p>
                    <p className="text-2xl font-mono font-bold" style={{ color: primaryColor }}>${totalMonthlyCost}<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setShowAddUsersModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-mono font-bold rounded-lg transition-all hover:bg-white/5 border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] w-full justify-center"
                      style={{ backgroundColor: `rgba(${primaryRgb}, 0.2)`, borderColor: `rgba(${primaryRgb}, 0.5)`, color: primaryColor }}
                    >
                      <PlusIcon size={18} />
                      Add Users
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-mono font-bold text-white">Payment Method</h3>
                  {organization?.stripe_customer_id && (
                    <button
                      onClick={handleManageBilling}
                      className="text-sm font-mono hover:underline"
                      style={{ color: primaryColor }}
                    >
                      Manage in Stripe
                    </button>
                  )}
                </div>
                {organization?.stripe_customer_id ? (
                  <div className="flex items-center gap-4 p-4 bg-black/50 border border-gray-800 rounded-lg">
                    <CreditCardIcon size={24} className="text-gray-400" />
                    <div>
                      <p className="text-white font-mono font-medium">Card ending in ****</p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">Expires **/**</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCardIcon size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-mono mb-4">No payment method on file</p>
                    <button 
                      className="px-6 py-2 text-sm font-mono font-bold rounded-lg transition-all hover:bg-white/5 border hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      style={{ backgroundColor: `rgba(${primaryRgb}, 0.2)`, borderColor: `rgba(${primaryRgb}, 0.5)`, color: primaryColor }}
                    >
                      Add Payment Method
                    </button>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-mono font-bold text-white mb-4">Payment History</h3>
                {isLoadingBilling ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 font-mono">Loading payment history...</p>
                  </div>
                ) : invoices.length > 0 ? (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-400 shadow-[0_0_8px_rgba(0,255,0,0.8)]' : 'bg-yellow-400 shadow-[0_0_8px_rgba(255,255,0,0.8)]'
                          }`} />
                          <div>
                            <p className="text-white font-mono font-medium">Invoice #{invoice.number}</p>
                            <p className="text-xs font-mono text-gray-500 mt-0.5">{new Date(invoice.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <p className="text-white font-mono font-bold">${invoice.amount.toFixed(2)}</p>
                          {invoice.pdf && (
                            <a 
                              href={invoice.pdf} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                              <DownloadIcon size={18} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 font-mono text-center py-8">No payment history yet</p>
                )}
              </div>
            </div>
          )}


          {activeTab === 'audit_logs' && organization && (
            <AuditLogViewer organizationId={organization.id} />
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
                
                {/* Header & Save Button */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
                  <h3 className="text-lg font-mono font-bold text-white">Organization Details</h3>
                  <button
                    onClick={handleSaveGeneral}
                    disabled={isSavingGeneral || isUploadingLogo}
                    className="px-6 py-2 text-sm font-mono font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 hover:bg-white/5"
                    style={{
                      backgroundColor: `rgba(${primaryRgb}, 0.2)`,
                      borderColor: `rgba(${primaryRgb}, 0.5)`,
                      borderWidth: '1px',
                      color: primaryColor,
                      boxShadow: `0 0 15px rgba(${primaryRgb}, 0.3)`
                    }}
                  >
                    {isSavingGeneral ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
                
                {/* Logo Upload Preview */}
                <div className="flex items-start gap-6 mb-8">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                      {editOrgLogo ? (
                        <img 
                          src={editOrgLogo} 
                          alt="Logo Preview" 
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <SettingsIcon size={32} className="text-slate-600" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-1">Organization Logo</h4>
                    <p className="text-xs text-slate-500 mb-3">Recommended size: 256x256px. Max size: 2MB.</p>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUploadingLogo ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Upload New Image'
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Organization Name</label>
                    <input
                      type="text"
                      value={editOrgName}
                      onChange={(e) => setEditOrgName(e.target.value)}
                      className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Domain</label>
                    <input
                      type="text"
                      value={organization?.domain}
                      disabled
                      className="w-full max-w-md bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 mt-1">Domain cannot be changed</p>
                  </div>

                  {/* Theme Colors */}
                  <div className="pt-4 mt-4 border-t border-slate-700/50">
                    <h4 className="text-sm font-medium text-slate-300 mb-4">Theme Colors</h4>
                    <div className="flex gap-8">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Primary Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={editPrimaryColor}
                            onChange={(e) => setEditPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer bg-slate-900 border border-slate-700 p-0.5"
                          />
                          <span className="text-slate-300 font-mono text-sm uppercase">{editPrimaryColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Accent Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={editAccentColor}
                            onChange={(e) => setEditAccentColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer bg-slate-900 border border-slate-700 p-0.5"
                          />
                          <span className="text-slate-300 font-mono text-sm uppercase">{editAccentColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Once you delete your organization, there is no going back. Please be certain.
                </p>
                <button className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                  Delete Organization
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div id="invite-modal-panel" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <style>{`
            #invite-modal-panel .focus\\:theme-border:focus { border-color: rgba(${primaryRgb}, 0.5) !important; }
            #invite-modal-panel .submit-btn {
              background-color: rgba(${primaryRgb}, 0.2);
              border-color: rgba(${primaryRgb}, 0.5);
              color: ${primaryColor};
            }
            #invite-modal-panel .submit-btn:not(:disabled):hover {
              background-color: rgba(${primaryRgb}, 0.3);
            }
          `}</style>
          
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
          
          <div 
            className="relative bg-black border rounded-xl w-full max-w-md transition-all duration-300 shadow-2xl animate-in zoom-in-95"
            style={{ borderColor: `rgba(${primaryRgb}, 0.5)`, boxShadow: `0 0 40px rgba(${primaryRgb}, 0.2)` }}
          >
            <div 
              className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300" 
              style={{ background: `linear-gradient(to bottom right, rgba(${primaryRgb}, 0.15), transparent)` }}
            />
            
            <div className="relative z-10 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg border flex items-center justify-center transition-colors duration-300"
                    style={{ backgroundColor: `rgba(${primaryRgb}, 0.2)`, borderColor: `rgba(${primaryRgb}, 0.5)` }}
                  >
                    <InviteIcon size={20} style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-mono font-bold text-white">Invite User</h2>
                    <p className="text-xs text-gray-500 font-mono">Add a new team member</p>
                  </div>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <CloseIcon size={20} />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Full Name (e.g. John Smith)"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:theme-border transition-all"
                />

                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={`Email (e.g. user@${organization?.domain || 'domain.com'})`}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:theme-border transition-all"
                />

                <div>
                  <p className="text-sm text-gray-400 font-mono mb-2">Role:</p>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:theme-border transition-all"
                  >
                    {userRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label} ({role.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleInviteUser}
                  disabled={!inviteName.trim() || !inviteEmail.trim()}
                  className="w-full mt-6 py-3 border rounded-lg transition-all font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 submit-btn"
                >
                  <CheckIcon size={18} />
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Users Modal */}
      {showAddUsersModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddUsersModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Add User Seats</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Number of Users</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNewUserCount(Math.max(1, newUserCount - 1))}
                    className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={newUserCount}
                    onChange={(e) => setNewUserCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => setNewUserCount(newUserCount + 1)}
                    className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400">Price per user</span>
                  <span className="text-white">$19/mo</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-slate-300">Total</span>
                  <span className="text-cyan-400">${newUserCount * 19}/mo</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddUsersModal(false)}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUsers}
                  disabled={isProcessingPayment}
                  className="flex-1 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Processing...' : 'Continue to Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organization Admin Panel */}
      <OrganizationAdminPanel 
        isOpen={showAdminPanel} 
        onClose={() => setShowAdminPanel(false)} 
      />
    </div>
  );
};

export default OrganizationSettings;