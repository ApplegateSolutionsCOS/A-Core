// ============================================
// PLATFORM ROLES (Applegate CORE BOS Internal)
// ============================================

// Platform Owner - God Mode (only one, requires 2FA key to transfer)
export type PlatformOwnerRole = 'platform_owner_admin';

// Platform Admin Roles (invited by Platform Owner)
export type PlatformAdminRole = 
  | 'platform_tech_admin'      // PlatformTechAdmin - manages tech teams
  | 'platform_support_admin'   // PlatformSupportAdmin - manages support teams
  | 'platform_sales_admin';    // PlatformSalesAdmin - manages sales teams

// Platform Manager Roles (invited by respective Admins)
export type PlatformManagerRole = 
  | 'platform_tech_manager'    // PlatformTechManager - manages tech users
  | 'platform_support_manager' // PlatformSupportManager - manages support users
  | 'platform_sales_manager';  // PlatformSalesManager - manages sales users

// Platform User Roles (invited by respective Managers with Admin authorization)
export type PlatformUserRole = 
  | 'platform_tech_user'       // PlatformTechUser - tech team member
  | 'platform_support_user'    // PlatformSupportUser - support team member
  | 'platform_sales_user';     // PlatformSalesUser - sales team member

// Combined Platform Role type
export type PlatformRole = 
  | PlatformOwnerRole 
  | PlatformAdminRole 
  | PlatformManagerRole 
  | PlatformUserRole;

// Platform Role Hierarchy (for permission checks)
export const PLATFORM_ROLE_HIERARCHY: Record<PlatformRole, number> = {
  'platform_owner_admin': 100,      // God Mode
  'platform_tech_admin': 80,
  'platform_support_admin': 80,
  'platform_sales_admin': 80,
  'platform_tech_manager': 60,
  'platform_support_manager': 60,
  'platform_sales_manager': 60,
  'platform_tech_user': 40,
  'platform_support_user': 40,
  'platform_sales_user': 40,
};

// Platform Role Categories
export const PLATFORM_ROLE_CATEGORIES = {
  owner: ['platform_owner_admin'] as PlatformRole[],
  admins: ['platform_tech_admin', 'platform_support_admin', 'platform_sales_admin'] as PlatformRole[],
  managers: ['platform_tech_manager', 'platform_support_manager', 'platform_sales_manager'] as PlatformRole[],
  users: ['platform_tech_user', 'platform_support_user', 'platform_sales_user'] as PlatformRole[],
};

// Platform Department Types
export type PlatformDepartment = 'tech' | 'support' | 'sales';

// ============================================
// ORGANIZATION ROLES (Customer Organizations)
// ============================================

// Organization Owner Admin - Ultimate authority, first user who signed up and pays the bill
export type OrganizationOwnerAdminRole = 'organization_owner_admin';

// Organization Admin Roles (department heads, invited by OrganizationOwnerAdmin)
export type OrganizationAdminRole = 
  | 'organization_owner_admin'       // OrganizationOwnerAdmin - ultimate org authority & bill payer
  | 'organization_admin'             // Legacy alias (backward compat)
  | 'organization_tech_admin'        // OrganizationTechAdmin
  | 'organization_support_admin'     // OrganizationSupportAdmin
  | 'organization_operations_admin'  // OrganizationOperationsAdmin
  | 'organization_sales_admin'       // OrganizationSalesAdmin
  | 'organization_security_admin';   // OrganizationSecurityAdmin

// Organization Manager Roles (invited by respective Admins)
export type OrganizationManagerRole = 
  | 'organization_admin_manager'         // OrganizationAdminManager
  | 'organization_tech_manager'          // OrganizationTechManager
  | 'organization_support_manager'       // OrganizationSupportManager
  | 'organization_operations_manager'    // OrganizationOperationsManager
  | 'organization_sales_manager'         // OrganizationSalesManager
  | 'organization_accounting_manager'    // OrganizationAccountingManager
  | 'organization_personnel_manager'     // OrganizationPersonnelManager
  | 'organization_security_manager';     // OrganizationSecurityManager

// Organization User Roles (invited by respective Managers)
export type OrganizationUserRole = 
  | 'organization_admin_user'            // OrganizationAdminUser
  | 'organization_tech_user'             // OrganizationTechUser
  | 'organization_support_user'          // OrganizationSupportUser
  | 'organization_operations_user'       // OrganizationOperationsUser
  | 'organization_sales_user'            // OrganizationSalesUser
  | 'organization_accounting_user'       // OrganizationAccountingUser
  | 'organization_personnel_user'        // OrganizationPersonnelUser
  | 'organization_security_user';        // OrganizationSecurityUser

// Legacy workspace roles (for backward compatibility)
export type WorkspaceRole = 
  | 'workspace_admin'
  | 'workspace_regular_user'
  | 'workspace_light_user'
  | 'workspace_guest';

// Combined Organization Role type
export type OrganizationRole = 
  | OrganizationAdminRole 
  | OrganizationManagerRole 
  | OrganizationUserRole
  | WorkspaceRole;

// Organization Role Hierarchy (for permission checks)
export const ORGANIZATION_ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  'organization_owner_admin': 100,       // Ultimate authority - pays the bill
  'organization_admin': 100,             // Legacy alias for owner_admin
  'organization_tech_admin': 90,
  'organization_support_admin': 90,
  'organization_operations_admin': 90,
  'organization_sales_admin': 90,
  'organization_security_admin': 90,
  'organization_admin_manager': 80,
  'organization_tech_manager': 75,
  'organization_support_manager': 75,
  'organization_operations_manager': 75,
  'organization_sales_manager': 75,
  'organization_accounting_manager': 75,
  'organization_personnel_manager': 75,
  'organization_security_manager': 75,
  'organization_admin_user': 60,
  'organization_tech_user': 50,
  'organization_support_user': 50,
  'organization_operations_user': 50,
  'organization_sales_user': 50,
  'organization_accounting_user': 50,
  'organization_personnel_user': 50,
  'organization_security_user': 50,
  'workspace_admin': 70,
  'workspace_regular_user': 40,
  'workspace_light_user': 20,
  'workspace_guest': 10,
};

// Organization Role Categories
export const ORGANIZATION_ROLE_CATEGORIES = {
  owner: ['organization_owner_admin'] as OrganizationRole[],
  admins: [
    'organization_owner_admin',
    'organization_admin',
    'organization_tech_admin',
    'organization_support_admin',
    'organization_operations_admin',
    'organization_sales_admin',
    'organization_security_admin',
  ] as OrganizationRole[],
  managers: [
    'organization_admin_manager',
    'organization_tech_manager',
    'organization_support_manager',
    'organization_operations_manager',
    'organization_sales_manager',
    'organization_accounting_manager',
    'organization_personnel_manager',
    'organization_security_manager',
  ] as OrganizationRole[],
  users: [
    'organization_admin_user',
    'organization_tech_user',
    'organization_support_user',
    'organization_operations_user',
    'organization_sales_user',
    'organization_accounting_user',
    'organization_personnel_user',
    'organization_security_user',
  ] as OrganizationRole[],
  workspace: [
    'workspace_admin',
    'workspace_regular_user',
    'workspace_light_user',
    'workspace_guest',
  ] as OrganizationRole[],
};

// Organization Department Types
export type OrganizationDepartment = 
  | 'admin' 
  | 'tech' 
  | 'support' 
  | 'operations'
  | 'sales' 
  | 'accounting' 
  | 'personnel' 
  | 'security';


// ============================================
// ROLE DISPLAY NAMES AND DESCRIPTIONS
// ============================================

export const PLATFORM_ROLE_DISPLAY: Record<PlatformRole, { name: string; description: string; dashboard: string }> = {
  'platform_owner_admin': {
    name: 'Platform Owner (God Mode)',
    description: 'Ultimate authority with all privileges. Can only transfer ownership with 2FA key.',
    dashboard: 'PlatformOwnerDashboard',
  },
  'platform_tech_admin': {
    name: 'Platform Tech Admin',
    description: 'Manages technical teams and system configurations.',
    dashboard: 'PlatformTechAdminDashboard',
  },
  'platform_support_admin': {
    name: 'Platform Support Admin',
    description: 'Manages customer support teams and escalations.',
    dashboard: 'PlatformSupportAdminDashboard',
  },
  'platform_sales_admin': {
    name: 'Platform Sales Admin',
    description: 'Manages sales teams and revenue operations.',
    dashboard: 'PlatformSalesAdminDashboard',
  },
  'platform_tech_manager': {
    name: 'Platform Tech Manager',
    description: 'Manages individual tech teams. Can invite tech users with admin authorization.',
    dashboard: 'PlatformTechManagerDashboard',
  },
  'platform_support_manager': {
    name: 'Platform Support Manager',
    description: 'Manages support team operations.',
    dashboard: 'PlatformSupportManagerDashboard',
  },
  'platform_sales_manager': {
    name: 'Platform Sales Manager',
    description: 'Manages sales team operations.',
    dashboard: 'PlatformSalesManagerDashboard',
  },
  'platform_tech_user': {
    name: 'Platform Tech User',
    description: 'Supports system modifications but cannot change settings without Tech Admin.',
    dashboard: 'PlatformTechUserDashboard',
  },
  'platform_support_user': {
    name: 'Platform Support User',
    description: 'Handles customer support tickets and inquiries.',
    dashboard: 'PlatformSupportUserDashboard',
  },
  'platform_sales_user': {
    name: 'Platform Sales User',
    description: 'Handles sales activities and customer acquisition.',
    dashboard: 'PlatformSalesUserDashboard',
  },
};

export const ORGANIZATION_ROLE_DISPLAY: Record<OrganizationRole, { name: string; description: string; dashboard: string }> = {
  'organization_owner_admin': {
    name: 'Organization Owner Admin',
    description: 'Ultimate authority for the organization. First user to sign up who pays the bill.',
    dashboard: 'OrganizationOwnerAdminDashboard',
  },
  'organization_admin': {
    name: 'Organization Admin (Legacy)',
    description: 'Full control over the organization. Can invite all manager types.',
    dashboard: 'OrganizationAdminDashboard',
  },
  'organization_tech_admin': {
    name: 'Organization Tech Admin',
    description: 'Manages all technical operations and tech teams within the organization.',
    dashboard: 'OrganizationTechAdminDashboard',
  },
  'organization_support_admin': {
    name: 'Organization Support Admin',
    description: 'Manages all support operations and support teams within the organization.',
    dashboard: 'OrganizationSupportAdminDashboard',
  },
  'organization_operations_admin': {
    name: 'Organization Operations Admin',
    description: 'Manages all operational processes and operations teams within the organization.',
    dashboard: 'OrganizationOperationsAdminDashboard',
  },
  'organization_sales_admin': {
    name: 'Organization Sales Admin',
    description: 'Manages all sales operations and sales teams within the organization.',
    dashboard: 'OrganizationSalesAdminDashboard',
  },
  'organization_security_admin': {
    name: 'Organization Security Admin',
    description: 'Manages all security policies, access control, and security teams.',
    dashboard: 'OrganizationSecurityAdminDashboard',
  },
  'organization_admin_manager': {
    name: 'Organization Admin Manager',
    description: 'Assists organization admin with administrative tasks.',
    dashboard: 'OrganizationAdminManagerDashboard',
  },
  'organization_tech_manager': {
    name: 'Organization Tech Manager',
    description: 'Manages technical operations within the organization.',
    dashboard: 'OrganizationTechManagerDashboard',
  },
  'organization_support_manager': {
    name: 'Organization Support Manager',
    description: 'Manages internal support operations.',
    dashboard: 'OrganizationSupportManagerDashboard',
  },
  'organization_operations_manager': {
    name: 'Organization Operations Manager',
    description: 'Manages day-to-day operational processes.',
    dashboard: 'OrganizationOperationsManagerDashboard',
  },
  'organization_sales_manager': {
    name: 'Organization Sales Manager',
    description: 'Manages sales operations within the organization.',
    dashboard: 'OrganizationSalesManagerDashboard',
  },
  'organization_accounting_manager': {
    name: 'Organization Accounting Manager',
    description: 'Manages financial operations and reporting.',
    dashboard: 'OrganizationAccountingManagerDashboard',
  },
  'organization_personnel_manager': {
    name: 'Organization Personnel Manager',
    description: 'Manages HR and personnel operations.',
    dashboard: 'OrganizationPersonnelManagerDashboard',
  },
  'organization_security_manager': {
    name: 'Organization Security Manager',
    description: 'Manages security policies and access control.',
    dashboard: 'OrganizationSecurityManagerDashboard',
  },
  'organization_admin_user': {
    name: 'Organization Admin User',
    description: 'Administrative staff member.',
    dashboard: 'OrganizationAdminUserDashboard',
  },
  'organization_tech_user': {
    name: 'Organization Tech User',
    description: 'Technical staff member.',
    dashboard: 'OrganizationTechUserDashboard',
  },
  'organization_support_user': {
    name: 'Organization Support User',
    description: 'Support staff member.',
    dashboard: 'OrganizationSupportUserDashboard',
  },
  'organization_operations_user': {
    name: 'Organization Operations User',
    description: 'Operations staff member.',
    dashboard: 'OrganizationOperationsUserDashboard',
  },
  'organization_sales_user': {
    name: 'Organization Sales User',
    description: 'Sales staff member.',
    dashboard: 'OrganizationSalesUserDashboard',
  },
  'organization_accounting_user': {
    name: 'Organization Accounting User',
    description: 'Accounting staff member.',
    dashboard: 'OrganizationAccountingUserDashboard',
  },
  'organization_personnel_user': {
    name: 'Organization Personnel User',
    description: 'HR/Personnel staff member.',
    dashboard: 'OrganizationPersonnelUserDashboard',
  },
  'organization_security_user': {
    name: 'Organization Security User',
    description: 'Security staff member.',
    dashboard: 'OrganizationSecurityUserDashboard',
  },
  'workspace_admin': {
    name: 'Workspace Admin',
    description: 'Full control over specific workspaces.',
    dashboard: 'WorkspaceAdminDashboard',
  },
  'workspace_regular_user': {
    name: 'Workspace Regular User',
    description: 'Standard access to assigned workspaces.',
    dashboard: 'WorkspaceUserDashboard',
  },
  'workspace_light_user': {
    name: 'Workspace Light User',
    description: 'Limited access to assigned workspaces.',
    dashboard: 'WorkspaceLightUserDashboard',
  },
  'workspace_guest': {
    name: 'Workspace Guest',
    description: 'View-only access to specific workspaces.',
    dashboard: 'WorkspaceGuestDashboard',
  },
};

// ============================================
// INVITATION HIERARCHY (who can invite whom)
// ============================================

export const PLATFORM_INVITATION_RULES: Record<PlatformRole, PlatformRole[]> = {
  'platform_owner_admin': [
    'platform_tech_admin',
    'platform_support_admin',
    'platform_sales_admin',
    'platform_tech_manager',
    'platform_support_manager',
    'platform_sales_manager',
    'platform_tech_user',
    'platform_support_user',
    'platform_sales_user',
  ],
  'platform_tech_admin': ['platform_tech_manager'],
  'platform_support_admin': ['platform_support_manager'],
  'platform_sales_admin': ['platform_sales_manager'],
  'platform_tech_manager': ['platform_tech_user'],
  'platform_support_manager': ['platform_support_user'],
  'platform_sales_manager': ['platform_sales_user'],
  'platform_tech_user': [],
  'platform_support_user': [],
  'platform_sales_user': [],
};

export const ORGANIZATION_INVITATION_RULES: Record<OrganizationRole, OrganizationRole[]> = {
  'organization_owner_admin': [
    'organization_tech_admin',
    'organization_support_admin',
    'organization_operations_admin',
    'organization_sales_admin',
    'organization_security_admin',
    'organization_admin_manager',
    'organization_admin_user',
    'organization_tech_manager',
    'organization_tech_user',
    'organization_support_manager',
    'organization_support_user',
    'organization_operations_manager',
    'organization_operations_user',
    'organization_sales_manager',
    'organization_sales_user',
    'organization_accounting_manager',
    'organization_accounting_user',
    'organization_personnel_manager',
    'organization_personnel_user',
    'organization_security_manager',
    'organization_security_user',
    'workspace_admin',
    'workspace_regular_user',
    'workspace_light_user',
    'workspace_guest',
  ],
  'organization_admin': [
    'organization_admin_manager',
    'organization_admin_user',
    'organization_tech_manager',
    'organization_tech_user',
    'organization_support_manager',
    'organization_support_user',
    'organization_operations_manager',
    'organization_operations_user',
    'organization_sales_manager',
    'organization_sales_user',
    'organization_accounting_manager',
    'organization_accounting_user',
    'organization_personnel_manager',
    'organization_personnel_user',
    'organization_security_manager',
    'organization_security_user',
    'workspace_admin',
    'workspace_regular_user',
    'workspace_light_user',
    'workspace_guest',
  ],
  'organization_tech_admin': ['organization_tech_manager', 'organization_tech_user'],
  'organization_support_admin': ['organization_support_manager', 'organization_support_user'],
  'organization_operations_admin': ['organization_operations_manager', 'organization_operations_user'],
  'organization_sales_admin': ['organization_sales_manager', 'organization_sales_user'],
  'organization_security_admin': ['organization_security_manager', 'organization_security_user'],
  'organization_admin_manager': ['organization_admin_user'],
  'organization_tech_manager': ['organization_tech_user'],
  'organization_support_manager': ['organization_support_user'],
  'organization_operations_manager': ['organization_operations_user'],
  'organization_sales_manager': ['organization_sales_user'],
  'organization_accounting_manager': ['organization_accounting_user'],
  'organization_personnel_manager': ['organization_personnel_user'],
  'organization_security_manager': ['organization_security_user'],
  'organization_admin_user': [],
  'organization_tech_user': [],
  'organization_support_user': [],
  'organization_operations_user': [],
  'organization_sales_user': [],
  'organization_accounting_user': [],
  'organization_personnel_user': [],
  'organization_security_user': [],
  'workspace_admin': ['workspace_regular_user', 'workspace_light_user', 'workspace_guest'],
  'workspace_regular_user': [],
  'workspace_light_user': [],
  'workspace_guest': [],
};


// ============================================
// USER STATUS
// ============================================

export type UserStatus = 'active' | 'idle' | 'offline' | 'suspended' | 'pending_approval';

// ============================================
// USER INTERFACES
// ============================================

export interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  role: PlatformRole;
  department?: PlatformDepartment;
  avatar_url?: string;
  status: UserStatus;
  is_owner: boolean;
  invited_by?: string;
  totp_enabled: boolean;
  totp_secret?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  logo_url?: string;
  subscription_tier: 'basic' | 'pro' | 'expert';
  monthly_base_price: number;
  per_user_price: number;
  max_workspaces: number;
  max_organizations: number;
  parent_organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
  basic: {
    name: 'Basic Account',
    price: 249,
    perUserPrice: 19,
    maxWorkspaces: 6,
    maxOrganizations: 1,
    features: ['6 Default Workspaces', 'All Preset Mini Apps', 'Up to 60 Mini Apps per Workspace', 'Standard Support'],
  },
  pro: {
    name: 'Pro Account',
    price: 499,
    perUserPrice: 19,
    maxWorkspaces: 30,
    maxOrganizations: 1,
    features: ['Up to 30 Workspaces', 'All Preset Mini Apps', 'Up to 60 Mini Apps per Workspace', 'Priority Support', 'Custom Workspace Creation'],
  },
  expert: {
    name: 'Expert Account',
    price: 899,
    perUserPrice: 19,
    maxWorkspaces: 30,
    maxOrganizations: 12,
    features: ['Up to 12 Organizations', 'Up to 30 Workspaces per Org', 'All Preset Mini Apps', 'Up to 60 Mini Apps per Workspace', 'Dedicated Support', 'Multi-Org Management'],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;


export interface OrganizationUser {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: OrganizationRole;
  department?: OrganizationDepartment;
  avatar_url?: string;
  status: UserStatus;
  is_org_creator: boolean;
  invited_by?: string;
  manager_id?: string; // Reference to their manager
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// WORKSPACE & MINIAPP INTERFACES
// ============================================

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceAccess {
  id: string;
  workspace_id: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_admin: boolean;
  created_at: string;
}

// ============================================
// MINIAPP SETTINGS (App-level configuration)
// ============================================
// These are MiniApp-level settings, separate from Field Settings.
// Field Settings = per-field config (type, required, options, etc.)
// MiniApp Settings = app-level config (layouts, display, access defaults)

export interface FooterBlock {
  id: string;
  type: 'button' | 'number' | 'text';
  label: string;
  // button-specific:
  action?: 'add_selected_to_field' | 'clear_selection' | 'run_calc' | 'custom';
  targetFieldId?: string;     // which connection_field to push selected records into
  color?: string;
  // number-specific:
  decimals?: number;
  calcExpression?: string;    // e.g. "SUM(selected)" or "@price * @qty"
  // text-specific:
  staticValue?: string;
  width?: number;             // 1-12 grid span for footer row
}

export interface FooterConfig {
  enabled: boolean;            // "Freeze" toggle
  blocks: FooterBlock[];
  background?: string;
  height?: number;             // px
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  enabled: false,
  blocks: [],
  height: 64,
};

export interface AppSettings {
  layouts: string[];            // e.g., ['table', 'card', 'badge', 'calendar']
  defaultLayout: string;        // e.g., 'table'
  recordsPerPage: number;       // e.g., 25
  allowExport: boolean;
  allowImport: boolean;
  showCreatedBy: boolean;
  showTimestamps: boolean;
  enableComments: boolean;
  enableAttachments: boolean;
  itemName?: string;
  disable_user_creation?: boolean;
  disable_user_edits?: boolean;
  disable_notifications?: boolean;
  footer?: FooterConfig;       // ⚡ NEW: Frozen footer configuration
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  layouts: ['table', 'card'],
  defaultLayout: 'table',
  recordsPerPage: 25,
  allowExport: true,
  allowImport: false,
  showCreatedBy: true,
  showTimestamps: true,
  enableComments: false,
  enableAttachments: false,
  footer: DEFAULT_FOOTER_CONFIG,
};


export interface MiniApp {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  is_system_app: boolean;
  is_visible: boolean;
  is_preset: boolean;           // Preset = shipped with workspace, only platform owner can edit fields
  is_hidden_by_admin: boolean;  // Admin can hide any app (including presets) from workspace view
  hidden_by?: string;           // UUID of admin who hid it
  hidden_at?: string;           // When it was hidden
  display_order: number;
  // Field Settings: BuildingBlock definitions (field types, names, options, etc.)
  schema_definition: Record<string, any>;
  // MiniApp Settings: App-level configuration (layouts, display, general prefs)
  app_settings?: AppSettings;
  // Item ID Settings: UID generation, barcode, QR code config
  item_id_settings?: {
    prefix: string;
    minDigits: number;
    showItemId: boolean;
    showQrCode: boolean;
    showBarcode: boolean;
    barcodeSymbology: string;
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}


export interface MiniAppRecord {
  id: string;
  mini_app_id: string;
  item_uid?: string;
  data: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// MINIAPP ACCESS CONTROL
// ============================================
// Granular per-user, per-MiniApp permissions.
// Priority: mini_app_access > workspace_access > role-based defaults

export interface MiniAppAccess {
  id: string;
  mini_app_id: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_admin: boolean;
  can_delete: boolean;
  granted_by?: string;
  created_at: string;
  updated_at: string;
}

// Access scope for invitations
export type AccessScope = 'full_workspace' | 'selected_mini_apps';

export interface AccessPermissions {
  can_view: boolean;
  can_edit: boolean;
  can_admin: boolean;
  can_delete: boolean;
}

export const DEFAULT_ACCESS_PERMISSIONS: AccessPermissions = {
  can_view: true,
  can_edit: false,
  can_admin: false,
  can_delete: false,
};




// ============================================
// ACTIVITY & COMMUNICATION INTERFACES
// ============================================

export interface ActivityItem {
  id: string;
  organization_id: string;
  workspace_id: string;
  user_id?: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Message {
  id: string;
  organization_id: string;
  sender_id?: string;
  recipient_id?: string;
  subject?: string;
  content: string;
  is_read: boolean;
  parent_id?: string;
  created_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  workspace_id?: string;
  mini_app_id?: string;
  assigned_to?: string;
  created_by?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  organization_id: string;
  workspace_id?: string;
  created_by?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day: boolean;
  location?: string;
  attendees: string[];
  recurrence?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// INVITATION INTERFACE
// ============================================

export interface Invitation {
  id: string;
  organization_id?: string; // null for platform invitations
  email: string;
  role: OrganizationRole | PlatformRole;
  department?: OrganizationDepartment | PlatformDepartment;
  invited_by: string;
  requires_authorization_from?: string; // For roles that need admin authorization
  authorization_status?: 'pending' | 'approved' | 'rejected';
  // Access scope: determines what the invited user can access
  access_scope: AccessScope;                  // 'full_workspace' | 'selected_mini_apps'
  granted_workspace_ids: string[];            // Workspace UUIDs (for full_workspace scope)
  granted_mini_app_ids: string[];             // MiniApp UUIDs (for selected_mini_apps scope)
  granted_permissions: AccessPermissions;     // Permission levels granted
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}


// ============================================
// WORKSPACE DEFINITIONS
// ============================================

export const WORKSPACE_DEFINITIONS = {
  admin: {
    name: 'Admin',
    icon: 'shield',
    miniApps: ['Contacts', 'Jobs', 'Titles', 'Ranks', 'Benefits', 'Companies', 'Proposals', 'Projections', 'Owners', 'Projects', 'Procedures', 'Protocols']
  },
  accounting: {
    name: 'Accounting',
    icon: 'calculator',
    miniApps: ['Banks', 'Loans', 'Payments', 'Wallets', 'Expenses', 'Transfers', 'Payouts', 'Budgets']
  },
  personnel: {
    name: 'Personnel',
    icon: 'users',
    miniApps: ['Applicants', 'Members', 'Documents', 'Training', 'Protocols']
  },
  main: {
    name: 'Main',
    icon: 'home',
    miniApps: ['Contacts', 'Leads', 'Customers', 'Vendors', 'Projects', 'Events', 'Products', 'Services', 'Purchases', 'Quotes', 'Orders', 'Assets', 'Inventory', 'Locations', 'Clock', 'Support', 'Ideas']
  },
  data: {
    name: 'Data',
    icon: 'database',
    miniApps: ['Items', 'Types', 'Purposes', 'Units', 'Amounts', 'Specifications', 'Ratings', 'Dimensions', 'Flavors', 'Colors', 'Rates', 'Uses']
  },
  security: {
    name: 'Security',
    icon: 'lock',
    miniApps: []
  }
} as const;

export type WorkspaceSlug = keyof typeof WORKSPACE_DEFINITIONS;

// ============================================
// AUTH STATE INTERFACE
// ============================================

export interface AuthState {
  user: PlatformUser | OrganizationUser | null;
  userType: 'platform' | 'organization' | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const isPlatformRole = (role: string): role is PlatformRole => {
  return role.startsWith('platform_');
};

export const isOrganizationRole = (role: string): role is OrganizationRole => {
  return role.startsWith('organization_') || role.startsWith('workspace_');
};

export const getRoleDepartment = (role: PlatformRole | OrganizationRole): string | null => {
  if (role.includes('tech')) return 'tech';
  if (role.includes('support')) return 'support';
  if (role.includes('operations')) return 'operations';
  if (role.includes('sales')) return 'sales';
  if (role.includes('accounting')) return 'accounting';
  if (role.includes('personnel')) return 'personnel';
  if (role.includes('security')) return 'security';
  if (role.includes('admin')) return 'admin';
  return null;
};


export const isManagerRole = (role: PlatformRole | OrganizationRole): boolean => {
  return role.includes('_manager');
};

export const isAdminRole = (role: PlatformRole | OrganizationRole): boolean => {
  return role.includes('_admin');
};

export const isUserRole = (role: PlatformRole | OrganizationRole): boolean => {
  return role.endsWith('_user') && !role.includes('_admin');
};

export const canInviteRole = (
  inviterRole: PlatformRole | OrganizationRole,
  targetRole: PlatformRole | OrganizationRole
): boolean => {
  if (isPlatformRole(inviterRole) && isPlatformRole(targetRole)) {
    return PLATFORM_INVITATION_RULES[inviterRole]?.includes(targetRole) || false;
  }
  if (isOrganizationRole(inviterRole) && isOrganizationRole(targetRole)) {
    return ORGANIZATION_INVITATION_RULES[inviterRole as OrganizationRole]?.includes(targetRole as OrganizationRole) || false;
  }
  return false;
};

export const getRoleHierarchyLevel = (role: PlatformRole | OrganizationRole): number => {
  if (isPlatformRole(role)) {
    return PLATFORM_ROLE_HIERARCHY[role] || 0;
  }
  if (isOrganizationRole(role)) {
    return ORGANIZATION_ROLE_HIERARCHY[role as OrganizationRole] || 0;
  }
  return 0;
};

export const hasHigherOrEqualRole = (
  userRole: PlatformRole | OrganizationRole,
  requiredRole: PlatformRole | OrganizationRole
): boolean => {
  return getRoleHierarchyLevel(userRole) >= getRoleHierarchyLevel(requiredRole);
};
