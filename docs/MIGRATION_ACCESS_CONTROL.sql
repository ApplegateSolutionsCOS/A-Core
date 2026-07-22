-- ============================================
-- MIGRATION: Granular Access Control & MiniApp Settings
-- ============================================
-- Run this in Supabase SQL Editor AFTER running:
--   1. CREATE_TABLES.sql (or VERIFY_AND_FIX_ALL.sql)
--   2. MIGRATION_ITEM_UID.sql
-- 
-- This migration adds:
--   - mini_app_access table (per-user, per-MiniApp permissions)
--   - app_settings JSONB column on mini_apps (separate from schema_definition)
--   - access_scope fields on invitations table
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS patterns
-- ============================================


-- ============================================
-- 1. MINI APP ACCESS TABLE
-- ============================================
-- Granular per-user access to individual MiniApps.
-- When an admin invites a user, they can grant access to:
--   a) The whole workspace (all MiniApps inherit workspace_access permissions)
--   b) Individual MiniApps within a workspace
-- If a user has a mini_app_access row, it OVERRIDES workspace-level defaults.
-- If no mini_app_access row exists, the user falls back to workspace_access.

CREATE TABLE IF NOT EXISTS app_private.mini_app_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mini_app_id UUID NOT NULL REFERENCES app_private.mini_apps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_private.organization_users(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_admin BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES app_private.organization_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mini_app_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_app_access_app ON app_private.mini_app_access(mini_app_id);
CREATE INDEX IF NOT EXISTS idx_mini_app_access_user ON app_private.mini_app_access(user_id);

-- Enable RLS
ALTER TABLE app_private.mini_app_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'app_private' 
        AND tablename = 'mini_app_access' 
        AND policyname = 'service_role_only'
    ) THEN
        CREATE POLICY "service_role_only" ON app_private.mini_app_access FOR ALL
          USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
          WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');
        RAISE NOTICE 'Created RLS policy on mini_app_access';
    ELSE
        RAISE NOTICE 'RLS policy already exists on mini_app_access';
    END IF;
END $$;

-- Grant access to service_role
GRANT ALL ON app_private.mini_app_access TO service_role;

-- Add updated_at trigger
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_schema = 'app_private' 
        AND event_object_table = 'mini_app_access' 
        AND trigger_name = 'update_mini_app_access_updated_at'
    ) THEN
        CREATE TRIGGER update_mini_app_access_updated_at 
          BEFORE UPDATE ON app_private.mini_app_access 
          FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();
        RAISE NOTICE 'Created updated_at trigger on mini_app_access';
    ELSE
        RAISE NOTICE 'updated_at trigger already exists on mini_app_access';
    END IF;
END $$;


-- ============================================
-- 2. ADD app_settings COLUMN TO mini_apps
-- ============================================
-- Separates MiniApp-level settings from field definitions (schema_definition).
--
-- schema_definition = Field Settings (BuildingBlocks, field types, field config)
-- app_settings      = MiniApp Settings (layouts, display prefs, general config)
-- item_id_settings   = Item ID Settings (prefix, digits, barcode, QR) [already exists]

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'mini_apps' 
        AND column_name = 'app_settings'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN app_settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added app_settings column to mini_apps';
    ELSE
        RAISE NOTICE 'app_settings column already exists on mini_apps';
    END IF;
END $$;


-- ============================================
-- 3. ADD ACCESS SCOPE FIELDS TO invitations
-- ============================================
-- When admins invite users, they specify:
--   access_scope: 'full_workspace' | 'selected_mini_apps'
--   granted_workspace_ids: UUID[] of workspaces (for full_workspace scope)
--   granted_mini_app_ids: UUID[] of specific MiniApps (for selected_mini_apps scope)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'invitations' 
        AND column_name = 'access_scope'
    ) THEN
        ALTER TABLE app_private.invitations ADD COLUMN access_scope VARCHAR(50) DEFAULT 'full_workspace';
        RAISE NOTICE 'Added access_scope column to invitations';
    ELSE
        RAISE NOTICE 'access_scope column already exists on invitations';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'invitations' 
        AND column_name = 'granted_workspace_ids'
    ) THEN
        ALTER TABLE app_private.invitations ADD COLUMN granted_workspace_ids UUID[] DEFAULT '{}';
        RAISE NOTICE 'Added granted_workspace_ids column to invitations';
    ELSE
        RAISE NOTICE 'granted_workspace_ids column already exists on invitations';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'invitations' 
        AND column_name = 'granted_mini_app_ids'
    ) THEN
        ALTER TABLE app_private.invitations ADD COLUMN granted_mini_app_ids UUID[] DEFAULT '{}';
        RAISE NOTICE 'Added granted_mini_app_ids column to invitations';
    ELSE
        RAISE NOTICE 'granted_mini_app_ids column already exists on invitations';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'invitations' 
        AND column_name = 'granted_permissions'
    ) THEN
        ALTER TABLE app_private.invitations ADD COLUMN granted_permissions JSONB DEFAULT '{"can_view": true, "can_edit": false, "can_admin": false, "can_delete": false}';
        RAISE NOTICE 'Added granted_permissions column to invitations';
    ELSE
        RAISE NOTICE 'granted_permissions column already exists on invitations';
    END IF;
END $$;


-- ============================================
-- 4. RPC: Check user access to a MiniApp
-- ============================================
-- Returns the effective permissions for a user on a specific MiniApp.
-- Priority: mini_app_access > workspace_access > role-based defaults

CREATE OR REPLACE FUNCTION public.check_mini_app_access(
    p_user_id UUID,
    p_mini_app_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_app_access RECORD;
    v_ws_access RECORD;
    v_mini_app RECORD;
    v_user RECORD;
BEGIN
    -- 1. Check direct mini_app_access first (highest priority)
    SELECT * INTO v_app_access
    FROM app_private.mini_app_access
    WHERE mini_app_id = p_mini_app_id AND user_id = p_user_id;
    
    IF FOUND THEN
        RETURN json_build_object(
            'has_access', v_app_access.can_view,
            'can_view', v_app_access.can_view,
            'can_edit', v_app_access.can_edit,
            'can_admin', v_app_access.can_admin,
            'can_delete', v_app_access.can_delete,
            'source', 'mini_app_access'
        );
    END IF;
    
    -- 2. Fall back to workspace_access
    SELECT ma.workspace_id INTO v_mini_app
    FROM app_private.mini_apps ma
    WHERE ma.id = p_mini_app_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('has_access', false, 'error', 'MiniApp not found');
    END IF;
    
    SELECT * INTO v_ws_access
    FROM app_private.workspace_access
    WHERE workspace_id = v_mini_app.workspace_id AND user_id = p_user_id;
    
    IF FOUND THEN
        RETURN json_build_object(
            'has_access', v_ws_access.can_view,
            'can_view', v_ws_access.can_view,
            'can_edit', v_ws_access.can_edit,
            'can_admin', v_ws_access.can_admin,
            'can_delete', v_ws_access.can_admin, -- workspace admins can delete
            'source', 'workspace_access'
        );
    END IF;
    
    -- 3. Check if user is org admin (they get full access to everything)
    SELECT * INTO v_user
    FROM app_private.organization_users
    WHERE id = p_user_id;
    
    IF FOUND AND v_user.role = 'organization_admin' THEN
        RETURN json_build_object(
            'has_access', true,
            'can_view', true,
            'can_edit', true,
            'can_admin', true,
            'can_delete', true,
            'source', 'organization_admin'
        );
    END IF;
    
    -- 4. No access
    RETURN json_build_object(
        'has_access', false,
        'can_view', false,
        'can_edit', false,
        'can_admin', false,
        'can_delete', false,
        'source', 'no_access'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_mini_app_access(UUID, UUID) TO anon, authenticated, service_role;


-- ============================================
-- 5. RPC: Get all accessible MiniApps for a user
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_accessible_mini_apps(
    p_user_id UUID,
    p_organization_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_user RECORD;
    v_result JSON;
BEGIN
    -- Check if user is org admin (gets everything)
    SELECT * INTO v_user
    FROM app_private.organization_users
    WHERE id = p_user_id AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found in organization');
    END IF;
    
    IF v_user.role = 'organization_admin' THEN
        -- Org admins see all MiniApps
        SELECT json_agg(row_to_json(t)) INTO v_result
        FROM (
            SELECT ma.id, ma.name, ma.slug, ma.workspace_id, w.name as workspace_name,
                   true as can_view, true as can_edit, true as can_admin, true as can_delete,
                   'organization_admin' as access_source
            FROM app_private.mini_apps ma
            JOIN app_private.workspaces w ON w.id = ma.workspace_id
            WHERE w.organization_id = p_organization_id AND ma.is_visible = true
            ORDER BY w.display_order, ma.display_order
        ) t;
    ELSE
        -- Non-admins: combine workspace_access + mini_app_access
        SELECT json_agg(row_to_json(t)) INTO v_result
        FROM (
            -- MiniApps accessible via workspace_access (no specific mini_app_access override)
            SELECT DISTINCT ma.id, ma.name, ma.slug, ma.workspace_id, w.name as workspace_name,
                   wa.can_view, wa.can_edit, wa.can_admin, wa.can_admin as can_delete,
                   'workspace_access' as access_source
            FROM app_private.mini_apps ma
            JOIN app_private.workspaces w ON w.id = ma.workspace_id
            JOIN app_private.workspace_access wa ON wa.workspace_id = w.id AND wa.user_id = p_user_id
            WHERE w.organization_id = p_organization_id 
              AND ma.is_visible = true
              AND wa.can_view = true
              AND NOT EXISTS (
                  SELECT 1 FROM app_private.mini_app_access maa 
                  WHERE maa.mini_app_id = ma.id AND maa.user_id = p_user_id
              )
            
            UNION ALL
            
            -- MiniApps with explicit mini_app_access
            SELECT ma.id, ma.name, ma.slug, ma.workspace_id, w.name as workspace_name,
                   maa.can_view, maa.can_edit, maa.can_admin, maa.can_delete,
                   'mini_app_access' as access_source
            FROM app_private.mini_app_access maa
            JOIN app_private.mini_apps ma ON ma.id = maa.mini_app_id
            JOIN app_private.workspaces w ON w.id = ma.workspace_id
            WHERE w.organization_id = p_organization_id 
              AND ma.is_visible = true
              AND maa.user_id = p_user_id
              AND maa.can_view = true
            
            ORDER BY workspace_name, name
        ) t;
    END IF;
    
    RETURN json_build_object('success', true, 'mini_apps', COALESCE(v_result, '[]'::json));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_accessible_mini_apps(UUID, UUID) TO anon, authenticated, service_role;


-- ============================================
-- 6. RPC: Grant MiniApp access (used during invitation acceptance)
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_mini_app_access(
    p_user_id UUID,
    p_mini_app_id UUID,
    p_can_view BOOLEAN DEFAULT true,
    p_can_edit BOOLEAN DEFAULT false,
    p_can_admin BOOLEAN DEFAULT false,
    p_can_delete BOOLEAN DEFAULT false,
    p_granted_by UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by)
    VALUES (p_mini_app_id, p_user_id, p_can_view, p_can_edit, p_can_admin, p_can_delete, p_granted_by)
    ON CONFLICT (mini_app_id, user_id) DO UPDATE
    SET can_view = p_can_view,
        can_edit = p_can_edit,
        can_admin = p_can_admin,
        can_delete = p_can_delete,
        granted_by = p_granted_by,
        updated_at = NOW();
    
    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_mini_app_access(UUID, UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, UUID) TO anon, authenticated, service_role;


-- ============================================
-- 7. UPDATE EXISTING mini_apps WITH DEFAULT app_settings
-- ============================================
UPDATE app_private.mini_apps
SET app_settings = jsonb_build_object(
    'layouts', '["table", "card"]'::jsonb,
    'defaultLayout', 'table',
    'recordsPerPage', 25,
    'allowExport', true,
    'allowImport', false,
    'showCreatedBy', true,
    'showTimestamps', true,
    'enableComments', false,
    'enableAttachments', false
)
WHERE app_settings IS NULL OR app_settings = '{}';


-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    v_has_mini_app_access BOOLEAN;
    v_has_app_settings BOOLEAN;
    v_has_access_scope BOOLEAN;
    v_has_granted_ws BOOLEAN;
    v_has_granted_ma BOOLEAN;
    v_has_granted_perms BOOLEAN;
    v_has_check_fn BOOLEAN;
    v_has_get_fn BOOLEAN;
    v_has_grant_fn BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'app_private' AND table_name = 'mini_app_access'
    ) INTO v_has_mini_app_access;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'app_settings'
    ) INTO v_has_app_settings;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' AND table_name = 'invitations' AND column_name = 'access_scope'
    ) INTO v_has_access_scope;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' AND table_name = 'invitations' AND column_name = 'granted_workspace_ids'
    ) INTO v_has_granted_ws;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' AND table_name = 'invitations' AND column_name = 'granted_mini_app_ids'
    ) INTO v_has_granted_ma;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' AND table_name = 'invitations' AND column_name = 'granted_permissions'
    ) INTO v_has_granted_perms;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'check_mini_app_access'
    ) INTO v_has_check_fn;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'get_user_accessible_mini_apps'
    ) INTO v_has_get_fn;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'grant_mini_app_access'
    ) INTO v_has_grant_fn;

    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   ACCESS CONTROL MIGRATION VERIFICATION              ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  mini_app_access table:          %', CASE WHEN v_has_mini_app_access THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_apps.app_settings:         %', CASE WHEN v_has_app_settings THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  invitations.access_scope:       %', CASE WHEN v_has_access_scope THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  invitations.granted_workspace:  %', CASE WHEN v_has_granted_ws THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  invitations.granted_mini_apps:  %', CASE WHEN v_has_granted_ma THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  invitations.granted_permissions:%', CASE WHEN v_has_granted_perms THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  check_mini_app_access():        %', CASE WHEN v_has_check_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  get_user_accessible_mini_apps():%', CASE WHEN v_has_get_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  grant_mini_app_access():        %', CASE WHEN v_has_grant_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '╠══════════════════════════════════════════════════════╣';

    IF v_has_mini_app_access AND v_has_app_settings AND v_has_access_scope 
       AND v_has_granted_ws AND v_has_granted_ma AND v_has_granted_perms
       AND v_has_check_fn AND v_has_get_fn AND v_has_grant_fn THEN
        RAISE NOTICE '║  STATUS: MIGRATION SUCCESSFUL                        ║';
    ELSE
        RAISE NOTICE '║  STATUS: MIGRATION INCOMPLETE - check above           ║';
    END IF;

    RAISE NOTICE '╚══════════════════════════════════════════════════════╝';
END $$;
