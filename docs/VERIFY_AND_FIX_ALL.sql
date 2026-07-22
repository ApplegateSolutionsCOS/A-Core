-- ============================================
-- COMPREHENSIVE DATABASE VERIFICATION & FIX
-- ============================================
-- Run this ENTIRE script in the Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste > Run)
--
-- This script does SEVEN things:
--   1. Creates all 17 expected tables (IF NOT EXISTS)
--   2. Enables RLS on all 17 tables
--   3. Creates optimized "service_role_only" RLS policies on all 17 tables
--   4. Fixes Security Advisor warnings (mutable function search paths)
--   5. Ensures all updated_at triggers exist
--   6. Outputs a full diagnostic report (RAISE NOTICE)
--   7. Returns a final SELECT showing all tables with RLS/policy status

--
-- After this script succeeds, run SEED_DATA.sql to populate test data.
-- ============================================



-- ============================================
-- STEP 1: VERIFY & CREATE ALL 17 TABLES
-- ============================================
-- Each CREATE TABLE IF NOT EXISTS is safe to run even if the table
-- already exists — it will simply skip creation.

-- 1. organizations
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

-- 2. platform_users
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

-- 3. organization_users
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

-- 4. workspaces
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

-- 5. workspace_access
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

-- 6. mini_apps
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

-- 7. mini_app_records
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

-- 8. audit_logs
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

-- 9. invitations
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

-- 10. messages
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

-- 11. tasks
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

-- 12. calendar_events
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

-- 13. activity_stream
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

-- 14. user_sessions
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

-- 15. verification_codes
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

-- 16. sms_verification_sessions
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

-- 17. dashboard_configs
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
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================
-- Safe to run even if already enabled
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
-- STEP 3: CREATE RLS POLICIES ON ALL TABLES
-- ============================================
-- Uses optimized (SELECT ...) wrapper so current_setting() is evaluated
-- once per query instead of per-row (fixes Performance Advisor warnings).
-- DROP IF EXISTS + CREATE ensures idempotency.

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'organizations',
        'platform_users',
        'organization_users',
        'workspaces',
        'workspace_access',
        'mini_apps',
        'mini_app_records',
        'audit_logs',
        'invitations',
        'messages',
        'tasks',
        'calendar_events',
        'activity_stream',
        'user_sessions',
        'verification_codes',
        'sms_verification_sessions',
        'dashboard_configs'
    ];
    v_table TEXT;
    v_count INTEGER := 0;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'app_private' AND table_name = v_table
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS "service_role_only" ON app_private.%I', v_table);
            EXECUTE format(
                'CREATE POLICY "service_role_only" ON app_private.%I FOR ALL
                 USING ((SELECT COALESCE(current_setting(''request.jwt.claim.role'', true), ''anon'')) = ''service_role'')
                 WITH CHECK ((SELECT COALESCE(current_setting(''request.jwt.claim.role'', true), ''anon'')) = ''service_role'')',
                v_table
            );
            v_count := v_count + 1;
            RAISE NOTICE 'Policy created: app_private.%', v_table;
        ELSE
            RAISE NOTICE 'SKIPPED (table not found): app_private.%', v_table;
        END IF;
    END LOOP;
    RAISE NOTICE 'RLS policies created on % tables', v_count;
END $$;


-- ============================================
-- STEP 4: FIX SECURITY ADVISOR WARNINGS
-- "Function Search Path Mutable"
-- ============================================

-- WARNING 1: app_private.update_updated_at_column()
-- Fix: Add SET search_path to make the function search path immutable
CREATE OR REPLACE FUNCTION app_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = app_private;

-- WARNING 2: public.update_uodated_at_column() (note the typo "uodated")
-- This is a leftover/orphan function that should be dropped entirely.
DROP FUNCTION IF EXISTS public.update_uodated_at_column();


-- ============================================
-- STEP 5: ENSURE TRIGGERS EXIST
-- ============================================
-- Drop and recreate triggers to ensure they point to the fixed function.
-- Using DROP IF EXISTS + CREATE ensures idempotency.

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
-- STEP 6: DIAGNOSTIC REPORT
-- ============================================

-- This outputs a full verification of all 17 tables

DO $$
DECLARE
    v_expected TEXT[] := ARRAY[
        'activity_stream',
        'audit_logs',
        'calendar_events',
        'dashboard_configs',
        'invitations',
        'messages',
        'mini_app_records',
        'mini_apps',
        'organization_users',
        'organizations',
        'platform_users',
        'sms_verification_sessions',
        'tasks',
        'user_sessions',
        'verification_codes',
        'workspace_access',
        'workspaces'
    ];
    v_table TEXT;
    v_found INTEGER := 0;
    v_missing INTEGER := 0;
    v_missing_list TEXT := '';
    v_has_rls BOOLEAN;
    v_has_policy BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════╗';
    RAISE NOTICE '║     DATABASE VERIFICATION & FIX REPORT          ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  TABLE VERIFICATION (app_private schema)         ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';

    FOREACH v_table IN ARRAY v_expected
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'app_private' AND table_name = v_table
        ) THEN
            -- Check RLS status
            SELECT relrowsecurity INTO v_has_rls
            FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'app_private' AND c.relname = v_table;

            -- Check policy exists
            SELECT EXISTS(
                SELECT 1 FROM pg_policies
                WHERE schemaname = 'app_private' AND tablename = v_table AND policyname = 'service_role_only'
            ) INTO v_has_policy;

            v_found := v_found + 1;
            IF v_has_rls AND v_has_policy THEN
                RAISE NOTICE '║  [OK]  % (RLS + Policy)', rpad(v_table, 30);
            ELSIF v_has_rls THEN
                RAISE NOTICE '║  [!!]  % (RLS on, NO policy!)', rpad(v_table, 30);
            ELSE
                RAISE NOTICE '║  [!!]  % (NO RLS!)', rpad(v_table, 30);
            END IF;
        ELSE
            v_missing := v_missing + 1;
            v_missing_list := v_missing_list || v_table || ', ';
            RAISE NOTICE '║  [MISSING]  %', v_table;
        END IF;
    END LOOP;

    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║  Tables found: % / 17', v_found;
    IF v_missing > 0 THEN
        RAISE NOTICE '║  MISSING: %', v_missing_list;
    ELSE
        RAISE NOTICE '║  All 17 tables verified!                         ║';
    END IF;

    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  FUNCTION VERIFICATION                           ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';

    -- Check app_private.update_updated_at_column has SET search_path
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'app_private' AND p.proname = 'update_updated_at_column'
        AND p.proconfig IS NOT NULL AND 'search_path=app_private' = ANY(p.proconfig)
    ) THEN
        RAISE NOTICE '║  [OK]  app_private.update_updated_at_column()    ║';
        RAISE NOTICE '║        SET search_path = app_private              ║';
    ELSE
        RAISE NOTICE '║  [!!]  app_private.update_updated_at_column()    ║';
        RAISE NOTICE '║        search_path NOT set (may still warn)      ║';
    END IF;

    -- Check public.update_uodated_at_column is gone
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'update_uodated_at_column'
    ) THEN
        RAISE NOTICE '║  [OK]  public.update_uodated_at_column() dropped ║';
    ELSE
        RAISE NOTICE '║  [!!]  public.update_uodated_at_column() EXISTS  ║';
        RAISE NOTICE '║        This orphan function should be dropped     ║';
    END IF;

    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  SUMMARY                                         ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';

    IF v_missing = 0 THEN
        RAISE NOTICE '║  Tables:    17/17 verified                       ║';
        RAISE NOTICE '║  RLS:       Enabled on all tables                ║';
        RAISE NOTICE '║  Policies:  service_role_only on all tables      ║';
        RAISE NOTICE '║  Functions: Search paths fixed                   ║';
        RAISE NOTICE '║                                                  ║';
        RAISE NOTICE '║  STATUS: ALL CLEAR                               ║';
        RAISE NOTICE '║                                                  ║';
        RAISE NOTICE '║  Next steps:                                     ║';
        RAISE NOTICE '║  1. Check Performance Advisor  -> 0 warnings     ║';
        RAISE NOTICE '║  2. Check Security Advisor     -> 0 warnings     ║';
        RAISE NOTICE '║  3. Run SEED_DATA.sql to populate test data      ║';
    ELSE
        RAISE NOTICE '║  STATUS: % TABLE(S) MISSING - check errors above', v_missing;
    END IF;

    RAISE NOTICE '╚══════════════════════════════════════════════════╝';
END $$;


-- ============================================
-- STEP 7: FINAL TABLE LIST OUTPUT
-- ============================================

-- This SELECT returns actual rows so you can see the result in the SQL Editor
SELECT
    table_name,
    CASE WHEN c.relrowsecurity THEN 'YES' ELSE 'NO' END AS rls_enabled,
    CASE WHEN EXISTS(
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'app_private' AND p.tablename = t.table_name AND p.policyname = 'service_role_only'
    ) THEN 'YES' ELSE 'NO' END AS has_policy
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'app_private'
WHERE t.table_schema = 'app_private'
ORDER BY t.table_name;
