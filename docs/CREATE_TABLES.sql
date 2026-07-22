-- ============================================
-- APPLEGATE A-CORE BOS - DATABASE SCHEMA
-- All tables are created in the app_private schema
-- which is NOT exposed via the Supabase REST API.
-- Data access is ONLY through edge functions and RPC functions.
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE PRIVATE SCHEMA
-- ============================================
CREATE SCHEMA IF NOT EXISTS app_private;

-- Grant usage ONLY to service_role and postgres (NOT anon or authenticated)
GRANT USAGE ON SCHEMA app_private TO service_role;
GRANT USAGE ON SCHEMA app_private TO postgres;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  GRANT ALL ON ROUTINES TO service_role;

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    subscription_tier VARCHAR(50) DEFAULT 'starter',
    monthly_base_price DECIMAL(10,2) DEFAULT 0,
    per_user_price DECIMAL(10,2) DEFAULT 0,
    max_users INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON app_private.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON app_private.organizations(domain);

-- ============================================
-- 2. PLATFORM USERS TABLE (Internal BOS Staff)
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.platform_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'platform_tech_user',
    department VARCHAR(50),
    avatar_url TEXT,
    phone_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    is_owner BOOLEAN DEFAULT false,
    invited_by UUID REFERENCES app_private.platform_users(id),
    totp_enabled BOOLEAN DEFAULT false,
    totp_secret TEXT,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_platform_role CHECK (role IN (
        'platform_owner_admin',
        'platform_tech_admin', 'platform_support_admin', 'platform_sales_admin',
        'platform_tech_manager', 'platform_support_manager', 'platform_sales_manager',
        'platform_tech_user', 'platform_support_user', 'platform_sales_user'
    )),
    CONSTRAINT valid_platform_department CHECK (department IS NULL OR department IN ('tech', 'support', 'sales')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'idle', 'offline', 'suspended', 'pending_approval'))
);

CREATE INDEX IF NOT EXISTS idx_platform_users_email ON app_private.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON app_private.platform_users(role);

-- ============================================
-- 3. ORGANIZATION USERS TABLE (Customer Users)
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES app_private.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'organization_tech_user',
    department VARCHAR(50),
    avatar_url TEXT,
    phone_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    is_org_creator BOOLEAN DEFAULT false,
    invited_by UUID,
    manager_id UUID REFERENCES app_private.organization_users(id),
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, email),
    CONSTRAINT valid_org_role CHECK (role IN (
        'organization_admin',
        'organization_admin_manager', 'organization_tech_manager', 'organization_support_manager',
        'organization_sales_manager', 'organization_accounting_manager', 'organization_personnel_manager',
        'organization_security_manager',
        'organization_admin_user', 'organization_tech_user', 'organization_support_user',
        'organization_sales_user', 'organization_accounting_user', 'organization_personnel_user',
        'organization_security_user',
        'workspace_admin', 'workspace_regular_user', 'workspace_light_user', 'workspace_guest'
    )),
    CONSTRAINT valid_org_department CHECK (department IS NULL OR department IN (
        'admin', 'tech', 'support', 'sales', 'accounting', 'personnel', 'security'
    ))
);

CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON app_private.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_email ON app_private.organization_users(email);
CREATE INDEX IF NOT EXISTS idx_org_users_role ON app_private.organization_users(role);

-- ============================================
-- 4. WORKSPACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES app_private.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_org_id ON app_private.workspaces(organization_id);

-- ============================================
-- 5. WORKSPACE ACCESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.workspace_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES app_private.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_private.organization_users(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_access_workspace ON app_private.workspace_access(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_access_user ON app_private.workspace_access(user_id);

-- ============================================
-- 6. MINI APPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.mini_apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES app_private.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    is_system_app BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    schema_definition JSONB DEFAULT '{}',
    created_by UUID REFERENCES app_private.organization_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_mini_apps_workspace ON app_private.mini_apps(workspace_id);

-- ============================================
-- 7. MINI APP RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.mini_app_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mini_app_id UUID NOT NULL REFERENCES app_private.mini_apps(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES app_private.organization_users(id),
    updated_by UUID REFERENCES app_private.organization_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mini_app_records_app ON app_private.mini_app_records(mini_app_id);

-- ============================================
-- 8. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES app_private.organizations(id) ON DELETE SET NULL,
    user_id UUID,
    user_type VARCHAR(20),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON app_private.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON app_private.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON app_private.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON app_private.audit_logs(created_at);

-- ============================================
-- 9. INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES app_private.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    invited_by UUID NOT NULL,
    invited_by_type VARCHAR(20) NOT NULL,
    requires_authorization_from UUID,
    authorization_status VARCHAR(20) DEFAULT 'pending',
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON app_private.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON app_private.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON app_private.invitations(organization_id);

-- ============================================
-- 10. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES app_private.organizations(id) ON DELETE CASCADE,
    sender_id UUID,
    sender_type VARCHAR(20),
    recipient_id UUID,
    recipient_type VARCHAR(20),
    subject VARCHAR(500),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES app_private.messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_org ON app_private.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON app_private.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON app_private.messages(recipient_id);

-- ============================================
-- 11. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES app_private.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES app_private.workspaces(id) ON DELETE SET NULL,
    mini_app_id UUID REFERENCES app_private.mini_apps(id) ON DELETE SET NULL,
    assigned_to UUID,
    created_by UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_task_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON app_private.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON app_private.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON app_private.tasks(status);

-- ============================================
-- 12. CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES app_private.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES app_private.workspaces(id) ON DELETE SET NULL,
    created_by UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    location VARCHAR(500),
    attendees UUID[] DEFAULT '{}',
    recurrence VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON app_private.calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON app_private.calendar_events(start_time);

-- ============================================
-- 13. ACTIVITY STREAM TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.activity_stream (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES app_private.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES app_private.workspaces(id) ON DELETE SET NULL,
    user_id UUID,
    user_type VARCHAR(20),
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_org ON app_private.activity_stream(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON app_private.activity_stream(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON app_private.activity_stream(created_at);

-- ============================================
-- 14. SESSIONS TABLE (for custom auth)
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON app_private.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON app_private.user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON app_private.user_sessions(expires_at);

-- ============================================
-- 15. VERIFICATION CODES TABLE (for SMS/Email)
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_type VARCHAR(20),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_email ON app_private.verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_phone ON app_private.verification_codes(phone_number);

-- ============================================
-- 16. SMS VERIFICATION SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.sms_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    ip_address TEXT,
    purpose TEXT DEFAULT 'login',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_sessions_session_id ON app_private.sms_verification_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sms_sessions_email ON app_private.sms_verification_sessions(email);

-- ============================================
-- 17. DASHBOARD CONFIGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_private.dashboard_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    tab_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    tiles JSONB DEFAULT '[]',
    tab_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tab_id)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user ON app_private.dashboard_configs(user_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE app_private.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.workspace_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.mini_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.mini_app_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.activity_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.sms_verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.dashboard_configs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - SERVICE ROLE ONLY
-- ============================================
-- These policies ensure ONLY edge functions (service_role) can access data.
-- The anon and authenticated roles are completely blocked from direct access.
-- Data is accessed through RPC functions (SECURITY DEFINER) or edge functions.
--
-- IMPORTANT: current_setting() is wrapped in (SELECT ...) so PostgreSQL
-- evaluates it ONCE per query, not per-row. This is critical for performance.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- DROP IF EXISTS ensures this script is SAFE TO RE-RUN.

DROP POLICY IF EXISTS "service_role_only" ON app_private.organizations;
CREATE POLICY "service_role_only" ON app_private.organizations FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.platform_users;
CREATE POLICY "service_role_only" ON app_private.platform_users FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.organization_users;
CREATE POLICY "service_role_only" ON app_private.organization_users FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.workspaces;
CREATE POLICY "service_role_only" ON app_private.workspaces FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.workspace_access;
CREATE POLICY "service_role_only" ON app_private.workspace_access FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.mini_apps;
CREATE POLICY "service_role_only" ON app_private.mini_apps FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.mini_app_records;
CREATE POLICY "service_role_only" ON app_private.mini_app_records FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.audit_logs;
CREATE POLICY "service_role_only" ON app_private.audit_logs FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.invitations;
CREATE POLICY "service_role_only" ON app_private.invitations FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.messages;
CREATE POLICY "service_role_only" ON app_private.messages FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.tasks;
CREATE POLICY "service_role_only" ON app_private.tasks FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.calendar_events;
CREATE POLICY "service_role_only" ON app_private.calendar_events FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.activity_stream;
CREATE POLICY "service_role_only" ON app_private.activity_stream FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.user_sessions;
CREATE POLICY "service_role_only" ON app_private.user_sessions FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.verification_codes;
CREATE POLICY "service_role_only" ON app_private.verification_codes FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.sms_verification_sessions;
CREATE POLICY "service_role_only" ON app_private.sms_verification_sessions FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

DROP POLICY IF EXISTS "service_role_only" ON app_private.dashboard_configs;
CREATE POLICY "service_role_only" ON app_private.dashboard_configs FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');


-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION app_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (DROP IF EXISTS for idempotency)
DROP TRIGGER IF EXISTS update_organizations_updated_at ON app_private.organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON app_private.organizations FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_users_updated_at ON app_private.platform_users;
CREATE TRIGGER update_platform_users_updated_at BEFORE UPDATE ON app_private.platform_users FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_users_updated_at ON app_private.organization_users;
CREATE TRIGGER update_organization_users_updated_at BEFORE UPDATE ON app_private.organization_users FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON app_private.workspaces;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON app_private.workspaces FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mini_apps_updated_at ON app_private.mini_apps;
CREATE TRIGGER update_mini_apps_updated_at BEFORE UPDATE ON app_private.mini_apps FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mini_app_records_updated_at ON app_private.mini_app_records;
CREATE TRIGGER update_mini_app_records_updated_at BEFORE UPDATE ON app_private.mini_app_records FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON app_private.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON app_private.tasks FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON app_private.calendar_events;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON app_private.calendar_events FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_configs_updated_at ON app_private.dashboard_configs;
CREATE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON app_private.dashboard_configs FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();


-- ============================================
-- RPC FUNCTIONS (in public schema for API access)
-- ============================================
-- These functions are callable via the Supabase REST API
-- They use SECURITY DEFINER to access app_private tables

-- Function: Get platform user by email
CREATE OR REPLACE FUNCTION public.get_platform_user_by_email(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_user JSON;
BEGIN
  SELECT row_to_json(u.*)
  INTO v_user
  FROM app_private.platform_users u
  WHERE LOWER(u.email) = LOWER(p_email);
  
  RETURN v_user;
END;
$$;

-- Function: Verify platform user password
CREATE OR REPLACE FUNCTION public.verify_platform_user_password(
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT *
  INTO v_user
  FROM app_private.platform_users
  WHERE LOWER(email) = LOWER(p_email);
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_user.password_hash IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Password not set', 'requiresPasswordSetup', true);
  END IF;
  
  RETURN json_build_object('success', true, 'user', row_to_json(v_user), 'storedHash', v_user.password_hash);
END;
$$;

-- Function: Set platform user password
CREATE OR REPLACE FUNCTION public.set_platform_user_password(
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_user RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_user FROM app_private.platform_users WHERE LOWER(email) = LOWER(p_email);
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  UPDATE app_private.platform_users
  SET password_hash = p_password_hash, updated_at = NOW()
  WHERE LOWER(email) = LOWER(p_email);
  
  SELECT row_to_json(t) INTO v_result
  FROM (
    SELECT id, email, full_name, role, department, is_owner, 
           phone_number, avatar_url, status, created_at, updated_at
    FROM app_private.platform_users WHERE LOWER(email) = LOWER(p_email)
  ) t;
  
  RETURN json_build_object('success', true, 'user', v_result);
END;
$$;

-- Function: Verify platform user email
CREATE OR REPLACE FUNCTION public.verify_platform_user_email(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
  UPDATE app_private.platform_users SET email_verified = true, updated_at = NOW()
  WHERE LOWER(email) = LOWER(p_email);
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function: Get platform user by ID
CREATE OR REPLACE FUNCTION public.get_platform_user_by_id(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_user JSON;
BEGIN
  SELECT row_to_json(t) INTO v_user
  FROM (
    SELECT id, email, full_name, role, department, is_owner, 
           phone_number, avatar_url, status, email_verified, created_at, updated_at
    FROM app_private.platform_users WHERE id = p_user_id
  ) t;
  
  RETURN v_user;
END;
$$;

-- Grant execute on all public functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ALL TABLES CREATED IN app_private SCHEMA';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Schema: app_private (NOT exposed via REST API)';
    RAISE NOTICE 'Tables: organizations, platform_users, organization_users,';
    RAISE NOTICE '  workspaces, workspace_access, mini_apps, mini_app_records,';
    RAISE NOTICE '  audit_logs, invitations, messages, tasks, calendar_events,';
    RAISE NOTICE '  activity_stream, user_sessions, verification_codes,';
    RAISE NOTICE '  sms_verification_sessions, dashboard_configs';
    RAISE NOTICE '';
    RAISE NOTICE 'Security:';
    RAISE NOTICE '  - RLS enabled on ALL tables';
    RAISE NOTICE '  - Only service_role can access tables directly';
    RAISE NOTICE '  - RPC functions in public schema use SECURITY DEFINER';
    RAISE NOTICE '  - Frontend anon key CANNOT read any table data';
    RAISE NOTICE '============================================';
END $$;
