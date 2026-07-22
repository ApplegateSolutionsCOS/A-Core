-- ============================================
-- MIGRATION: Fix mini_apps/mini_app_records + Dashboard Templates
-- ============================================
-- Run this in Supabase SQL Editor AFTER running:
--   1. CREATE_TABLES.sql
--   2. MIGRATION_ITEM_UID.sql
--   3. MIGRATION_ACCESS_CONTROL.sql
--   4. MIGRATION_MINIAPP_SETTINGS.sql
--
-- This migration:
--   A) Ensures mini_apps has ALL required columns in app_private
--   B) Ensures mini_app_records has ALL required columns in app_private
--   C) Creates dashboard_templates table in app_private
--   D) Adds RLS policies for dashboard_templates
--   E) Adds RPC functions for template CRUD
--
-- IMPORTANT: ALL tables are in app_private schema.
-- The db-proxy edge function must be updated to route
-- mini_apps and mini_app_records queries to app_private.
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS and DO $$ blocks.
-- ============================================

-- ============================================
-- A) ENSURE mini_apps HAS ALL REQUIRED COLUMNS
-- ============================================
-- Required columns per spec:
--   id, name, slug, workspace_id, schema_definition, app_settings,
--   item_id_settings, is_preset, created_by, created_at, updated_at
--
-- Also preserves existing columns: icon, description, is_system_app,
-- is_visible, display_order, is_hidden_by_admin, hidden_by, hidden_at

-- Ensure the table exists first (should already from CREATE_TABLES.sql)
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

-- Add app_settings if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private'
        AND table_name = 'mini_apps'
        AND column_name = 'app_settings'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN app_settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added app_settings column to app_private.mini_apps';
    ELSE
        RAISE NOTICE 'app_settings column already exists on app_private.mini_apps';
    END IF;
END $$;

-- Add item_id_settings if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private'
        AND table_name = 'mini_apps'
        AND column_name = 'item_id_settings'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN item_id_settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added item_id_settings column to app_private.mini_apps';
    ELSE
        RAISE NOTICE 'item_id_settings column already exists on app_private.mini_apps';
    END IF;
END $$;

-- Add is_preset if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private'
        AND table_name = 'mini_apps'
        AND column_name = 'is_preset'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN is_preset BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_preset column to app_private.mini_apps';
    ELSE
        RAISE NOTICE 'is_preset column already exists on app_private.mini_apps';
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_mini_apps_workspace ON app_private.mini_apps(workspace_id);

-- ============================================
-- B) ENSURE mini_app_records HAS ALL REQUIRED COLUMNS
-- ============================================
-- Required columns per spec:
--   id, mini_app_id, item_uid, data, created_by, updated_by,
--   created_at, updated_at

CREATE TABLE IF NOT EXISTS app_private.mini_app_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mini_app_id UUID NOT NULL REFERENCES app_private.mini_apps(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES app_private.organization_users(id),
    updated_by UUID REFERENCES app_private.organization_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add item_uid if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private'
        AND table_name = 'mini_app_records'
        AND column_name = 'item_uid'
    ) THEN
        ALTER TABLE app_private.mini_app_records ADD COLUMN item_uid TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mini_app_records_uid
            ON app_private.mini_app_records(item_uid);
        RAISE NOTICE 'Added item_uid column to app_private.mini_app_records';
    ELSE
        RAISE NOTICE 'item_uid column already exists on app_private.mini_app_records';
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_mini_app_records_app ON app_private.mini_app_records(mini_app_id);

-- ============================================
-- C) CREATE dashboard_templates TABLE
-- ============================================
-- Shared dashboard templates system where users can publish
-- their dashboard layouts as reusable templates.

CREATE TABLE IF NOT EXISTS app_private.dashboard_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    preview_thumbnail TEXT DEFAULT '',
    config_json JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_templates_creator
    ON app_private.dashboard_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_public
    ON app_private.dashboard_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_use_count
    ON app_private.dashboard_templates(use_count DESC);

-- ============================================
-- D) RLS POLICIES
-- ============================================

-- mini_apps (may already exist from CREATE_TABLES.sql)
ALTER TABLE app_private.mini_apps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON app_private.mini_apps;
CREATE POLICY "service_role_only" ON app_private.mini_apps FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

-- mini_app_records (may already exist from CREATE_TABLES.sql)
ALTER TABLE app_private.mini_app_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON app_private.mini_app_records;
CREATE POLICY "service_role_only" ON app_private.mini_app_records FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

-- dashboard_templates
ALTER TABLE app_private.dashboard_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON app_private.dashboard_templates;
CREATE POLICY "service_role_only" ON app_private.dashboard_templates FOR ALL
  USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
  WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');

-- ============================================
-- E) UPDATED_AT TRIGGERS
-- ============================================

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION app_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mini_apps_updated_at ON app_private.mini_apps;
CREATE TRIGGER update_mini_apps_updated_at
    BEFORE UPDATE ON app_private.mini_apps
    FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mini_app_records_updated_at ON app_private.mini_app_records;
CREATE TRIGGER update_mini_app_records_updated_at
    BEFORE UPDATE ON app_private.mini_app_records
    FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_templates_updated_at ON app_private.dashboard_templates;
CREATE TRIGGER update_dashboard_templates_updated_at
    BEFORE UPDATE ON app_private.dashboard_templates
    FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();

-- ============================================
-- F) RPC FUNCTIONS FOR DASHBOARD TEMPLATES
-- ============================================

-- 1. Publish a dashboard template
CREATE OR REPLACE FUNCTION public.publish_dashboard_template(
    p_creator_id TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT '',
    p_config_json JSONB DEFAULT '{}',
    p_tags TEXT[] DEFAULT '{}',
    p_is_public BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_template RECORD;
BEGIN
    INSERT INTO app_private.dashboard_templates (
        creator_id, name, description, config_json, tags, is_public
    ) VALUES (
        p_creator_id, p_name, p_description, p_config_json, p_tags, p_is_public
    )
    RETURNING * INTO v_template;

    RETURN json_build_object(
        'success', true,
        'template', row_to_json(v_template)
    );
END;
$$;

-- 2. Get public templates (for "Discover" section)
CREATE OR REPLACE FUNCTION public.get_public_dashboard_templates(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_templates JSON;
    v_total INTEGER;
BEGIN
    IF p_search IS NOT NULL AND p_search != '' THEN
        SELECT json_agg(t), COUNT(*) OVER() INTO v_templates, v_total
        FROM (
            SELECT id, creator_id, name, description, tags, is_public,
                   use_count, created_at, updated_at
            FROM app_private.dashboard_templates
            WHERE is_public = true
            AND (
                name ILIKE '%' || p_search || '%'
                OR description ILIKE '%' || p_search || '%'
                OR p_search = ANY(tags)
            )
            ORDER BY use_count DESC, created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) t;
    ELSE
        SELECT json_agg(t) INTO v_templates
        FROM (
            SELECT id, creator_id, name, description, tags, is_public,
                   use_count, created_at, updated_at
            FROM app_private.dashboard_templates
            WHERE is_public = true
            ORDER BY use_count DESC, created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) t;

        SELECT COUNT(*) INTO v_total
        FROM app_private.dashboard_templates
        WHERE is_public = true;
    END IF;

    RETURN json_build_object(
        'success', true,
        'templates', COALESCE(v_templates, '[]'::json),
        'total', COALESCE(v_total, 0)
    );
END;
$$;

-- 3. Get a single template config (for cloning)
CREATE OR REPLACE FUNCTION public.get_dashboard_template(
    p_template_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_template RECORD;
BEGIN
    SELECT * INTO v_template
    FROM app_private.dashboard_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Template not found');
    END IF;

    RETURN json_build_object(
        'success', true,
        'template', row_to_json(v_template)
    );
END;
$$;

-- 4. Clone a template (increment use_count)
CREATE OR REPLACE FUNCTION public.clone_dashboard_template(
    p_template_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_template RECORD;
BEGIN
    UPDATE app_private.dashboard_templates
    SET use_count = use_count + 1
    WHERE id = p_template_id
    RETURNING * INTO v_template;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Template not found');
    END IF;

    RETURN json_build_object(
        'success', true,
        'template', row_to_json(v_template)
    );
END;
$$;

-- 5. Get templates by creator
CREATE OR REPLACE FUNCTION public.get_my_dashboard_templates(
    p_creator_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_templates JSON;
BEGIN
    SELECT json_agg(t) INTO v_templates
    FROM (
        SELECT id, creator_id, name, description, tags, is_public,
               use_count, created_at, updated_at
        FROM app_private.dashboard_templates
        WHERE creator_id = p_creator_id
        ORDER BY created_at DESC
    ) t;

    RETURN json_build_object(
        'success', true,
        'templates', COALESCE(v_templates, '[]'::json)
    );
END;
$$;

-- 6. Delete a template (only creator can delete)
CREATE OR REPLACE FUNCTION public.delete_dashboard_template(
    p_template_id UUID,
    p_creator_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
    DELETE FROM app_private.dashboard_templates
    WHERE id = p_template_id AND creator_id = p_creator_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Template not found or not owned by you');
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- Grant execute on all new functions
GRANT EXECUTE ON FUNCTION public.publish_dashboard_template(TEXT, TEXT, TEXT, JSONB, TEXT[], BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_dashboard_templates(INTEGER, INTEGER, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_template(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clone_dashboard_template(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_templates(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_dashboard_template(UUID, TEXT) TO anon, authenticated, service_role;

-- ============================================
-- G) ADD custom_widgets AND refresh_interval TO dashboard_configs
-- ============================================
-- These columns are used by the PersonalDashboard for
-- custom widget persistence and refresh interval settings.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private'
        AND table_name = 'dashboard_configs'
        AND column_name = 'custom_widgets'
    ) THEN
        ALTER TABLE app_private.dashboard_configs ADD COLUMN custom_widgets JSONB DEFAULT '[]';
        RAISE NOTICE 'Added custom_widgets column to app_private.dashboard_configs';
    ELSE
        RAISE NOTICE 'custom_widgets column already exists on app_private.dashboard_configs';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private'
        AND table_name = 'dashboard_configs'
        AND column_name = 'refresh_interval'
    ) THEN
        ALTER TABLE app_private.dashboard_configs ADD COLUMN refresh_interval INTEGER DEFAULT 60;
        RAISE NOTICE 'Added refresh_interval column to app_private.dashboard_configs';
    ELSE
        RAISE NOTICE 'refresh_interval column already exists on app_private.dashboard_configs';
    END IF;
END $$;

-- ============================================
-- H) VERIFICATION
-- ============================================
DO $$
DECLARE
    v_mini_apps_exists BOOLEAN;
    v_mini_app_records_exists BOOLEAN;
    v_templates_exists BOOLEAN;
    v_has_item_uid BOOLEAN;
    v_has_item_id_settings BOOLEAN;
    v_has_is_preset BOOLEAN;
    v_has_app_settings BOOLEAN;
    v_has_custom_widgets BOOLEAN;
    v_has_refresh_interval BOOLEAN;
BEGIN
    -- Check tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'app_private' AND table_name = 'mini_apps'
    ) INTO v_mini_apps_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'app_private' AND table_name = 'mini_app_records'
    ) INTO v_mini_app_records_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'app_private' AND table_name = 'dashboard_templates'
    ) INTO v_templates_exists;

    -- Check columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private' AND table_name = 'mini_app_records' AND column_name = 'item_uid'
    ) INTO v_has_item_uid;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'item_id_settings'
    ) INTO v_has_item_id_settings;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'is_preset'
    ) INTO v_has_is_preset;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'app_settings'
    ) INTO v_has_app_settings;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private' AND table_name = 'dashboard_configs' AND column_name = 'custom_widgets'
    ) INTO v_has_custom_widgets;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app_private' AND table_name = 'dashboard_configs' AND column_name = 'refresh_interval'
    ) INTO v_has_refresh_interval;

    RAISE NOTICE '╔══════════════════════════════════════════════════╗';
    RAISE NOTICE '║   MINI APPS FIX + TEMPLATES MIGRATION REPORT    ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║  app_private.mini_apps:           %', CASE WHEN v_mini_apps_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '║  app_private.mini_app_records:    %', CASE WHEN v_mini_app_records_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '║  app_private.dashboard_templates: %', CASE WHEN v_templates_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║  mini_apps.app_settings:          %', CASE WHEN v_has_app_settings THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_apps.item_id_settings:      %', CASE WHEN v_has_item_id_settings THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_apps.is_preset:             %', CASE WHEN v_has_is_preset THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_app_records.item_uid:       %', CASE WHEN v_has_item_uid THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  dashboard_configs.custom_widgets:%', CASE WHEN v_has_custom_widgets THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  dashboard_configs.refresh_interval:%', CASE WHEN v_has_refresh_interval THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';

    IF v_mini_apps_exists AND v_mini_app_records_exists AND v_templates_exists
       AND v_has_item_uid AND v_has_item_id_settings AND v_has_is_preset
       AND v_has_app_settings AND v_has_custom_widgets AND v_has_refresh_interval THEN
        RAISE NOTICE '║  STATUS: ALL MIGRATIONS SUCCESSFUL               ║';
    ELSE
        RAISE NOTICE '║  STATUS: SOME ITEMS MISSING - CHECK ABOVE         ║';
    END IF;

    RAISE NOTICE '╚══════════════════════════════════════════════════╝';
END $$;

-- ============================================
-- I) DB-PROXY EDGE FUNCTION UPDATE INSTRUCTIONS
-- ============================================
-- The db-proxy edge function MUST be updated to route
-- mini_apps and mini_app_records queries to app_private schema.
--
-- In the db-proxy edge function (supabase/functions/db-proxy/index.ts):
--
-- 1. Find or create the PRIVATE_SCHEMA_TABLES array:
--
--    const PRIVATE_SCHEMA_TABLES = [
--      'organizations', 'platform_users', 'organization_users',
--      'workspaces', 'workspace_access',
--      'mini_apps', 'mini_app_records',        // <-- ADD THESE
--      'mini_app_access', 'mini_app_versions',
--      'audit_logs', 'invitations', 'messages',
--      'tasks', 'calendar_events', 'activity_stream',
--      'user_sessions', 'verification_codes',
--      'sms_verification_sessions', 'dashboard_configs',
--      'dashboard_templates',                   // <-- ADD THIS
--      'item_sequences',
--    ];
--
-- 2. When building the PostgREST query, prefix the table name
--    with the app_private schema:
--
--    const schemaPrefix = PRIVATE_SCHEMA_TABLES.includes(table)
--      ? 'app_private.' : '';
--    const targetTable = `${schemaPrefix}${table}`;
--
-- 3. Set the Accept-Profile and Content-Profile headers to 'app_private'
--    when querying private schema tables:
--
--    if (PRIVATE_SCHEMA_TABLES.includes(table)) {
--      headers['Accept-Profile'] = 'app_private';
--      headers['Content-Profile'] = 'app_private';
--    }
--
-- 4. Also add dashboard_templates to the PRIVATE_SCHEMA_TABLES array
--    so the template RPC functions can be accessed via the db-proxy.
--
-- ALTERNATIVELY: Since all tables are in app_private, the db-proxy
-- should ALWAYS use app_private as the schema for ALL table queries.
-- This eliminates the need for a whitelist entirely:
--
--    headers['Accept-Profile'] = 'app_private';
--    headers['Content-Profile'] = 'app_private';
--
-- ============================================
