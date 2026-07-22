import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';

import { hashPassword as authHashPassword } from '@/lib/authHash';
import { hashPassword as newHashPassword, verifyPassword as newVerifyPassword, isNewHashFormat } from '@/lib/passwordHash';
import { verifyPasswordViaRPC } from '@/lib/rpcAuth';
import {
  storeSessionToken,
  getSessionToken,

  clearSessionToken,
  validateSessionToken,
  refreshSessionExpiry,
  getSessionTimeRemaining,
} from '@/lib/sessionManager';
import {
  AuthState, 
  PlatformUser, 
  OrganizationUser, 
  Organization, 
  PlatformRole, 
  OrganizationRole,
  PlatformDepartment,
  OrganizationDepartment,
  PLATFORM_ROLE_HIERARCHY,
  ORGANIZATION_ROLE_HIERARCHY,
  PLATFORM_INVITATION_RULES,
  ORGANIZATION_INVITATION_RULES,
  PLATFORM_ROLE_DISPLAY,
  ORGANIZATION_ROLE_DISPLAY,
  isPlatformRole,
  isOrganizationRole,
  getRoleDepartment,
  isManagerRole,
  isAdminRole,
  canInviteRole,
  getRoleHierarchyLevel,
  hasHigherOrEqualRole,
} from '@/types';



interface AuthContextType extends AuthState {
  // Authentication
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, companyName?: string, planTier?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  
  // Platform Owner checks (God Mode)
  isPlatformOwner: () => boolean;
  
  // Platform role checks
  isPlatformUser: () => boolean;
  isPlatformAdmin: () => boolean;
  isPlatformTechAdmin: () => boolean;
  isPlatformSupportAdmin: () => boolean;
  isPlatformSalesAdmin: () => boolean;
  isPlatformManager: () => boolean;
  isPlatformTechManager: () => boolean;
  isPlatformSupportManager: () => boolean;
  isPlatformSalesManager: () => boolean;
  
  // Organization role checks
  isOrganizationAdmin: () => boolean;
  isOrganizationManager: () => boolean;
  isOrganizationUser: () => boolean;
  
  // Department checks
  getUserDepartment: () => PlatformDepartment | OrganizationDepartment | null;
  isInDepartment: (department: PlatformDepartment | OrganizationDepartment) => boolean;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  canInvite: (targetRole: PlatformRole | OrganizationRole) => boolean;
  hasRoleLevel: (requiredRole: PlatformRole | OrganizationRole) => boolean;
  
  // Role info
  getUserRole: () => PlatformRole | OrganizationRole | null;
  getRoleDisplayInfo: () => { name: string; description: string; dashboard: string } | null;
  getDashboardName: () => string;
  
  // 2FA / Security
  verifyTOTP: (code: string) => Promise<boolean>;
  changePlatformOwnerEmail: (newEmail: string, totpCode: string) => Promise<{ success: boolean; error?: string }>;
  transferOwnership: (newOwnerEmail: string, totpCode: string) => Promise<{ success: boolean; error?: string }>;
  
  // Invite Flow
  setupInvitedPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  pendingInviteEmail: string | null;
  clearPendingInvite: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Platform owner email - stored in database, this is just the default
const DEFAULT_PLATFORM_OWNER_EMAIL = 'andrew@applegate.solutions';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    // Synchronously check local storage on the very first render
    const storedUser = localStorage.getItem('bos_user');
    const storedUserType = localStorage.getItem('bos_user_type');
    const storedOrg = localStorage.getItem('bos_organization');
    
    if (storedUser && storedUserType) {
      try {
        return {
          user: JSON.parse(storedUser),
          userType: storedUserType as 'platform' | 'organization',
          organization: storedOrg ? JSON.parse(storedOrg) : null,
          isAuthenticated: true, // Optimistically authenticate to prevent the redirect flash
          isLoading: true,       // Keep loading true while background validation happens
        };
      } catch (e) {}
    }
    
    return {
      user: null,
      userType: null,
      organization: null,
      isAuthenticated: false,
      isLoading: true,
    };
  });
  const [platformOwnerEmail, setPlatformOwnerEmail] = useState<string>(DEFAULT_PLATFORM_OWNER_EMAIL);
  const activityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const platformOrgInitRef = useRef(false);

  const [pendingInviteEmail, setPendingInviteEmail] = useState<string | null>(null);
  const clearPendingInvite = () => setPendingInviteEmail(null);

  // ============================================
  // INVITE LINK INTERCEPTOR
  // ============================================
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessType = hashParams.get('type');
    
    if (accessType === 'invite') {
      console.log('[AuthContext] Invite link detected in URL!');
      // Read the user directly from the secure session Supabase just created
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setPendingInviteEmail(data.user.email);
          // Clean the URL so the token isn't visible in the address bar
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, []);

  // ============================================
  // PLATFORM ORG INITIALIZATION
  // When a platform user logs in, ensure they have the Applegate Solutions
  // organization context so they can use the system as an organization.
  // ============================================
  useEffect(() => {
    if (state.isAuthenticated && state.userType === 'platform' && !state.organization && !platformOrgInitRef.current) {
      platformOrgInitRef.current = true;
      
      // Check localStorage first for cached platform org
      const cachedPlatOrg = localStorage.getItem('bos_platform_organization');
      if (cachedPlatOrg) {
        try {
          const org = JSON.parse(cachedPlatOrg);
          setState(prev => ({ ...prev, organization: org }));
          localStorage.setItem('bos_organization', cachedPlatOrg);
          return;
        } catch (_e) {}
      }

      // Fetch/create Applegate Solutions org via edge function
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('db-proxy', {
            body: { action: 'ensure-platform-org', user_id: (state.user as any)?.id },
          });
          if (!error && data?.data?.organization) {
            const org = data.data.organization;
            setState(prev => ({ ...prev, organization: org }));
            localStorage.setItem('bos_organization', JSON.stringify(org));
            localStorage.setItem('bos_platform_organization', JSON.stringify(org));
            console.log('[AuthContext] Platform org initialized: Applegate Solutions');
          }
        } catch (err) {
          console.warn('[AuthContext] Failed to init platform org:', err);
        }
      })();
    }
  }, [state.isAuthenticated, state.userType, state.organization, state.user]);

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  useEffect(() => {
    const initSession = async () => {
      const storedUser = localStorage.getItem('bos_user');
      const storedUserType = localStorage.getItem('bos_user_type');
      const storedOrg = localStorage.getItem('bos_organization');

      console.log('[AuthContext] Checking stored session...');
      
      if (storedUser && storedUserType) {
        const parsedUser = JSON.parse(storedUser);
        console.log('[AuthContext] Found stored session for:', parsedUser?.email);
        
        // Check if we have a session token
        const sessionToken = getSessionToken();
        
        if (sessionToken) {
          console.log('[AuthContext] Session token found, validating...');
          console.log('[AuthContext] Session time remaining:', Math.round(getSessionTimeRemaining() / 1000 / 60), 'minutes');
          
          // Validate token in background (don't block UI)
          const isValid = await validateSessionToken();
          
          if (!isValid) {
            console.log('[AuthContext] Session token invalid, clearing session');
            clearAllStorage();
            setState(prev => ({ ...prev, isLoading: false }));
            return;
          }
          
          console.log('[AuthContext] Session token valid, restoring session');
        } else {
          console.log('[AuthContext] No session token found, but user data exists - allowing session');
        }
        
        setState({
          user: parsedUser,
          userType: storedUserType as 'platform' | 'organization',
          organization: storedOrg ? JSON.parse(storedOrg) : null,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initSession();
    
    // Set up activity-based session refresh
    const handleActivity = () => {
      if (getSessionToken()) {
        refreshSessionExpiry();
      }
    };
    
    // Refresh session on user activity (throttled)
    let lastRefresh = 0;
    const throttledRefresh = () => {
      const now = Date.now();
      if (now - lastRefresh > 5 * 60 * 1000) {
        lastRefresh = now;
        handleActivity();
      }
    };
    
    window.addEventListener('click', throttledRefresh);
    window.addEventListener('keydown', throttledRefresh);
    
    // Check session expiry periodically
    activityTimerRef.current = setInterval(() => {
      const token = getSessionToken();
      if (!token && state.isAuthenticated) {
        console.log('[AuthContext] Session expired, logging out');
        clearAllStorage();
        setState({
          user: null, userType: null, organization: null,
          isAuthenticated: false, isLoading: false,
        });
      }
    }, 60000);
    
    // Debug helper
    (window as any).debugAuth = () => {
      console.log('=== AUTH DEBUG INFO ===');
      console.log('localStorage bos_user:', localStorage.getItem('bos_user'));
      console.log('localStorage bos_user_type:', localStorage.getItem('bos_user_type'));
      console.log('Session token:', getSessionToken() ? 'present' : 'none');
      console.log('Session remaining:', Math.round(getSessionTimeRemaining() / 1000 / 60), 'minutes');
      const user = localStorage.getItem('bos_user');
      if (user) {
        const parsed = JSON.parse(user);
        console.log('Parsed user:', parsed);
        console.log('is_owner:', parsed?.is_owner, 'role:', parsed?.role);
      }
      console.log('========================');
    };
    
    return () => {
      window.removeEventListener('click', throttledRefresh);
      window.removeEventListener('keydown', throttledRefresh);
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
    };
  }, []);


  const clearAllStorage = () => {
    localStorage.removeItem('bos_user');
    localStorage.removeItem('bos_user_type');
    localStorage.removeItem('bos_organization');
    clearSessionToken();
  };

  const extractDomain = (email: string): string => {
    return email.split('@')[1] || '';
  };

  // ============================================
  // LOGIN (Targeting app_private schema directly)
  // ============================================

  const login = async (
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: string; requiresPasswordSetup?: boolean }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[login] Attempting Native Supabase login for:', normalizedEmail);

      // 1. NATIVE SUPABASE AUTHENTICATION
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        console.error('[login] Native Auth Error:', authError.message);
        return { success: false, error: 'Invalid email or password. If the problem persists, try resetting your password.' };
      }

      const userId = authData.user.id;
      console.log('[login] Native Auth Success! User ID:', userId);

      // 2. IS IT A PLATFORM USER?
      // Use .schema() to explicitly target app_private
      const { data: platformUser, error: platformError } = await supabase
        .schema('app_private')
        .from('platform_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (platformError) console.warn('[login] Platform user check error:', platformError.message);

      if (platformUser) {
        console.log('[login] Identified as Platform User. Fetching linked Organization...');
        
        // ⚡ THE FIX: Explicitly fetch the Organization and its logo
        const { data: orgLink } = await supabase
          .schema('app_private')
          .from('organization_users')
          .select('organizations(*, organization_logos(logo_url))')
          .eq('id', userId)
          .maybeSingle();

        // Unpack the organization data and flatten the logo
        let platOrg: any = null;
        if (orgLink && orgLink.organizations) {
          platOrg = Array.isArray(orgLink.organizations) ? orgLink.organizations[0] : orgLink.organizations;
          
          if (platOrg) {
            const logoData = platOrg.organization_logos;
            platOrg.logo_url = Array.isArray(logoData) ? logoData[0]?.logo_url : logoData?.logo_url;
            delete platOrg.organization_logos; // Clean up nested object before saving to localStorage
          }
        }

        const sessionToken = `platform_${Date.now().toString(36)}`;
        storeSessionToken(sessionToken);
        
        localStorage.setItem('bos_user', JSON.stringify(platformUser));
        localStorage.setItem('bos_user_type', 'platform');
        
        if (platOrg) {
          localStorage.setItem('bos_organization', JSON.stringify(platOrg));
        } else {
          localStorage.removeItem('bos_organization');
        }
        
        setState({
          user: platformUser as PlatformUser,
          userType: 'platform',
          organization: platOrg as Organization || null, // ⚡ Andrew's Org ID is finally loaded!
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      // 3. IS IT AN ORGANIZATION USER?
      // Use .schema() to explicitly target app_private
      const { data: orgUser, error: orgError } = await supabase
        .schema('app_private')
        .from('organization_users')
        .select('*, organizations(*, organization_logos(logo_url))')
        .eq('id', userId) // Using 'id' instead of 'user_id'
        .maybeSingle();

      if (orgError) console.warn('[login] Org user check error:', orgError.message);

      if (orgUser) {
        console.log('[login] Identified as Organization User.');
        // In your schema, the join might return an array or object. 
        // We ensure we grab the organization object correctly.
        const organization: any = Array.isArray(orgUser.organizations) ? orgUser.organizations[0] : orgUser.organizations;
        
        // Flatten the logo
        if (organization) {
          const logoData = organization.organization_logos;
          organization.logo_url = Array.isArray(logoData) ? logoData[0]?.logo_url : logoData?.logo_url;
          delete organization.organization_logos; // Clean up nested object
        }
        
        // Strip out the nested org data for the user object
        const safeOrgUser = { ...orgUser };
        delete (safeOrgUser as any).organizations;

        const orgSessionToken = `org_${Date.now().toString(36)}`;
        storeSessionToken(orgSessionToken);
        
        localStorage.setItem('bos_user', JSON.stringify(safeOrgUser));
        localStorage.setItem('bos_user_type', 'organization');
        localStorage.setItem('bos_organization', JSON.stringify(organization));
        
        setState({
          user: safeOrgUser as OrganizationUser,
          userType: 'organization',
          organization: organization as Organization,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      // 4. FALLBACK
      console.error('[login] User authenticated, but no profile found in DB tables.');
      return { success: false, error: 'Your account setup is incomplete. Please contact support.' };

    } catch (error: any) {
      console.error('[login] Fatal login exception:', error);
      return { success: false, error: 'An unexpected error occurred during login.' };
    }
  };




  // ============================================
  // REGISTER (Sends data to Auth, letting DB trigger handle the rest)
  // ============================================

  const register = async (
    email: string, 
    password: string, 
    fullName: string, 
    companyName?: string,
    planTier?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      if (normalizedEmail === platformOwnerEmail.toLowerCase()) {
        return { success: false, error: 'This email is reserved. Please use login instead.' };
      }

      // 1. CALL SUPABASE AUTH
      // Store the selected pricing tier in the user metadata so any DB trigger
      // that provisions the organization can pick it up structurally.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName || 'Independent', 
            plan_tier: planTier || null,
          }
        }
      });

      if (authError) return { success: false, error: authError.message };
      
      if (!authData.user) {
        return { success: false, error: 'Verification email sent! Please check your inbox.' };
      }

      // 2. FETCH THE NEWLY CREATED DATA
      await new Promise(resolve => setTimeout(resolve, 800)); // Delay for DB trigger

      const { data: orgUser, error: fetchError } = await supabase
        .schema('app_private')
        .from('organization_users')
        .select('*, organizations(*, organization_logos(logo_url))')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (fetchError || !orgUser) {
        console.warn("User created, but fetching org failed. Proceeding to manual login.", fetchError);
        return { success: true }; 
      }

      // ⚡ Unpack the organization data robustly and flatten the logo
      const organization: any = Array.isArray(orgUser.organizations) ? orgUser.organizations[0] : orgUser.organizations;
      
      if (organization) {
        const logoData = organization.organization_logos;
        organization.logo_url = Array.isArray(logoData) ? logoData[0]?.logo_url : logoData?.logo_url;
        delete organization.organization_logos; // Clean up nested object

        // 2b. PERSIST THE SELECTED PLAN TIER AS A STRUCTURED FIELD ON THE ORG RECORD
        // (best-effort - never block registration if this fails)
        if (planTier && organization.id) {
          try {
            const { error: planErr } = await supabase
              .schema('app_private')
              .from('organizations')
              .update({ plan_tier: planTier })
              .eq('id', organization.id);
            if (planErr) {
              console.warn('[register] Could not persist plan_tier:', planErr.message);
            } else {
              organization.plan_tier = planTier;
            }
          } catch (e) {
            console.warn('[register] plan_tier update threw:', e);
          }
        }
      }

      // 3. SET LOCAL STATE (AUTO-LOGIN)
      const safeOrgUser: any = { ...orgUser };
      delete safeOrgUser.organizations; 
      
      const orgSessionToken = `org_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      storeSessionToken(orgSessionToken);
      
      localStorage.setItem('bos_user', JSON.stringify(safeOrgUser));
      localStorage.setItem('bos_user_type', 'organization');
      localStorage.setItem('bos_organization', JSON.stringify(organization));
      
      setState({
        user: safeOrgUser,
        userType: 'organization',
        organization: organization,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  // ============================================
  // INVITE PASSWORD SETUP
  // ============================================
  
  const setupInvitedPassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Supabase automatically gave us a temporary session from the email link hash.
      // We use that session to securely update the user's password.
      const { data, error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      // 2. Now that their account has a password, we run them through our standard custom login
      // flow to fetch their organization data and set up our local `bos_user` storage.
      if (data.user?.email) {
        return await login(data.user.email, password);
      }
      
      return { success: true };
    } catch (err: any) {
      console.error('[setupInvitedPassword] Error:', err);
      return { success: false, error: err.message || 'Failed to set password.' };
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const logout = () => {
    clearAllStorage();
    
    setState({
      user: null,
      userType: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  // ============================================
  // PLATFORM OWNER CHECKS (GOD MODE)
  // ============================================

  const isPlatformOwner = (): boolean => {
    if (state.userType !== 'platform') return false;
    
    const platformUser = state.user as PlatformUser;
    
    // Check is_owner - handle both boolean true and string "true"
    const isOwnerFlag = platformUser?.is_owner === true || platformUser?.is_owner === 'true' as any;
    const isOwnerRole = platformUser?.role === 'platform_owner_admin' || platformUser?.role === 'platform_owner';
    
    return isOwnerFlag || isOwnerRole;
  };

  // ============================================
  // PLATFORM ROLE CHECKS
  // ============================================

  const isPlatformUser = (): boolean => {
    return state.userType === 'platform';
  };

  const isPlatformAdmin = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_owner_admin' ||
           platformUser?.role === 'platform_tech_admin' ||
           platformUser?.role === 'platform_support_admin' ||
           platformUser?.role === 'platform_sales_admin';
  };

  const isPlatformTechAdmin = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_owner_admin' || platformUser?.role === 'platform_tech_admin';
  };

  const isPlatformSupportAdmin = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_owner_admin' || platformUser?.role === 'platform_support_admin';
  };

  const isPlatformSalesAdmin = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_owner_admin' || platformUser?.role === 'platform_sales_admin';
  };

  const isPlatformManager = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_tech_manager' ||
           platformUser?.role === 'platform_support_manager' ||
           platformUser?.role === 'platform_sales_manager';
  };

  const isPlatformTechManager = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_tech_manager';
  };

  const isPlatformSupportManager = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_support_manager';
  };

  const isPlatformSalesManager = (): boolean => {
    if (state.userType !== 'platform') return false;
    const platformUser = state.user as PlatformUser;
    return platformUser?.role === 'platform_sales_manager';
  };

  // ============================================
  // ORGANIZATION ROLE CHECKS
  // ============================================

  const isOrganizationAdmin = (): boolean => {
    if (state.userType !== 'organization') return false;
    const orgUser = state.user as OrganizationUser;
    return orgUser?.role === 'organization_admin';
  };

  const isOrganizationManager = (): boolean => {
    if (state.userType !== 'organization') return false;
    const orgUser = state.user as OrganizationUser;
    return isManagerRole(orgUser?.role);
  };

  const isOrganizationUser = (): boolean => {
    return state.userType === 'organization';
  };

  // ============================================
  // DEPARTMENT CHECKS
  // ============================================

  const getUserDepartment = (): PlatformDepartment | OrganizationDepartment | null => {
    if (!state.user) return null;
    
    if (state.userType === 'platform') {
      const platformUser = state.user as PlatformUser;
      return platformUser.department || (getRoleDepartment(platformUser.role) as PlatformDepartment);
    }
    
    if (state.userType === 'organization') {
      const orgUser = state.user as OrganizationUser;
      return orgUser.department || (getRoleDepartment(orgUser.role) as OrganizationDepartment);
    }
    
    return null;
  };

  const isInDepartment = (department: PlatformDepartment | OrganizationDepartment): boolean => {
    return getUserDepartment() === department;
  };

  // ============================================
  // PERMISSION CHECKS
  // ============================================

  const hasPermission = (permission: string): boolean => {
    if (isPlatformOwner()) return true;
    
    const userRole = getUserRole();
    if (!userRole) return false;

    const permissionMap: Record<string, (PlatformRole | OrganizationRole)[]> = {
      'manage_platform_users': ['platform_owner_admin', 'platform_tech_admin', 'platform_support_admin', 'platform_sales_admin'],
      'manage_organizations': ['platform_owner_admin', 'platform_sales_admin'],
      'view_audit_logs': ['platform_owner_admin', 'platform_tech_admin', 'platform_security_admin' as any],
      'manage_billing': ['platform_owner_admin', 'platform_sales_admin', 'organization_admin', 'organization_accounting_manager'],
      'invite_users': ['platform_owner_admin', 'platform_tech_admin', 'platform_support_admin', 'platform_sales_admin', 
                       'platform_tech_manager', 'platform_support_manager', 'platform_sales_manager',
                       'organization_admin', 'organization_admin_manager', 'organization_tech_manager',
                       'organization_support_manager', 'organization_sales_manager', 'organization_accounting_manager',
                       'organization_personnel_manager', 'organization_security_manager'],
    };

    return permissionMap[permission]?.includes(userRole) || false;
  };

  const canInvite = (targetRole: PlatformRole | OrganizationRole): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    return canInviteRole(userRole, targetRole);
  };

  const hasRoleLevel = (requiredRole: PlatformRole | OrganizationRole): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    return hasHigherOrEqualRole(userRole, requiredRole);
  };

  // ============================================
  // ROLE INFO
  // ============================================

  const getUserRole = (): PlatformRole | OrganizationRole | null => {
    if (!state.user) return null;
    
    if (state.userType === 'platform') {
      return (state.user as PlatformUser).role;
    }
    
    if (state.userType === 'organization') {
      return (state.user as OrganizationUser).role;
    }
    
    return null;
  };

  const getRoleDisplayInfo = (): { name: string; description: string; dashboard: string } | null => {
    const role = getUserRole();
    if (!role) return null;

    if (isPlatformRole(role)) {
      return PLATFORM_ROLE_DISPLAY[role];
    }

    if (isOrganizationRole(role)) {
      return ORGANIZATION_ROLE_DISPLAY[role as OrganizationRole];
    }

    return null;
  };

  const getDashboardName = (): string => {
    const displayInfo = getRoleDisplayInfo();
    return displayInfo?.dashboard || 'DefaultDashboard';
  };

  // ============================================
  // 2FA / SECURITY
  // ============================================

  const verifyTOTP = async (code: string): Promise<boolean> => {
    try {
      const result = await invokeEdgeFunction('verify-totp', {
        code,
        userId: (state.user as PlatformUser)?.id,
      });
      return result.data?.valid === true;
    } catch (error) {
      console.error('TOTP verification error:', error);
      return false;
    }
  };

  const changePlatformOwnerEmail = async (
    newEmail: string, 
    totpCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isPlatformOwner()) {
      return { success: false, error: 'Only the platform owner can change this setting' };
    }

    const isValidTOTP = await verifyTOTP(totpCode);
    if (!isValidTOTP) {
      return { success: false, error: 'Invalid verification code' };
    }

    try {
      const { error: settingsError } = await db
        .from('platform_settings')
        .update({ value: newEmail.toLowerCase(), updated_at: new Date().toISOString() })
        .eq('key', 'platform_owner_email');

      if (settingsError) throw settingsError;

      const { error: userError } = await db
        .from('platform_users')
        .update({ email: newEmail.toLowerCase(), updated_at: new Date().toISOString() })
        .eq('is_owner', true);

      if (userError) throw userError;

      setPlatformOwnerEmail(newEmail.toLowerCase());
      
      const updatedUser = { ...state.user, email: newEmail.toLowerCase() };
      localStorage.setItem('bos_user', JSON.stringify(updatedUser));
      setState(prev => ({ ...prev, user: updatedUser as PlatformUser }));

      return { success: true };
    } catch (error: any) {
      console.error('Error changing platform owner email:', error);
      return { success: false, error: error.message || 'Failed to update email' };
    }
  };

  const transferOwnership = async (
    newOwnerEmail: string,
    totpCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isPlatformOwner()) {
      return { success: false, error: 'Only the platform owner can transfer ownership' };
    }

    const isValidTOTP = await verifyTOTP(totpCode);
    if (!isValidTOTP) {
      return { success: false, error: 'Invalid 2FA verification code. Ownership transfer requires valid 2FA.' };
    }

    try {
      const normalizedEmail = newOwnerEmail.toLowerCase();
      
      const { data: newOwner, error: findError } = await db
        .from('platform_users')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (findError || !newOwner) {
        return { success: false, error: 'New owner must be an existing platform user' };
      }

      const { error: removeError } = await db
        .from('platform_users')
        .update({ 
          is_owner: false, 
          role: 'platform_tech_admin',
          updated_at: new Date().toISOString() 
        })
        .eq('is_owner', true);

      if (removeError) throw removeError;

      const { error: setError } = await db
        .from('platform_users')
        .update({ 
          is_owner: true, 
          role: 'platform_owner_admin',
          updated_at: new Date().toISOString() 
        })
        .eq('email', normalizedEmail);

      if (setError) throw setError;

      const { error: settingsError } = await db
        .from('platform_settings')
        .update({ value: normalizedEmail, updated_at: new Date().toISOString() })
        .eq('key', 'platform_owner_email');

      if (settingsError) throw settingsError;

      if (settingsError) throw settingsError;

      logout();

      return { success: true };
    } catch (error: any) {
      console.error('Error transferring ownership:', error);
      return { success: false, error: error.message || 'Failed to transfer ownership' };
    }
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      logout,
      isPlatformOwner,
      isPlatformUser,
      isPlatformAdmin,
      isPlatformTechAdmin,
      isPlatformSupportAdmin,
      isPlatformSalesAdmin,
      isPlatformManager,
      isPlatformTechManager,
      isPlatformSupportManager,
      isPlatformSalesManager,
      isOrganizationAdmin,
      isOrganizationManager,
      isOrganizationUser,
      getUserDepartment,
      isInDepartment,
      hasPermission,
      canInvite,
      hasRoleLevel,
      getUserRole,
      getRoleDisplayInfo,
      getDashboardName,
      verifyTOTP,
      changePlatformOwnerEmail,
      transferOwnership,
      setupInvitedPassword,
      pendingInviteEmail,
      clearPendingInvite,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
