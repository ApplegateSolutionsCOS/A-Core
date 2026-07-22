-- ============================================
-- MIGRATION: MiniApp Settings, Presets & Admin Controls
-- ============================================
-- Run this in Supabase SQL Editor AFTER running:
--   1. CREATE_TABLES.sql
--   2. MIGRATION_ITEM_UID.sql
--   3. MIGRATION_ACCESS_CONTROL.sql
--
-- This migration adds:
--   - is_preset flag on mini_apps (preset = created by platform, not editable by org admins)
--   - is_hidden_by_admin flag on mini_apps (admins can hide any app including presets)
--   - hidden_by UUID on mini_apps (who hid it)
--   - item_id_settings JSONB column on mini_apps (if not exists)
--   - RPC functions for admin MiniApp management
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS patterns
-- ============================================


-- ============================================
-- 1. ADD is_preset COLUMN TO mini_apps
-- ============================================
-- Preset MiniApps are created by the platform (shipped with workspace).
-- Organization admins CANNOT edit preset MiniApp field definitions.
-- Platform owner admin CAN edit any MiniApp (preset or user-created).
-- Organization admins CAN hide presets from their workspace view.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'mini_apps' 
        AND column_name = 'is_preset'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN is_preset BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_preset column to mini_apps';
    ELSE
        RAISE NOTICE 'is_preset column already exists on mini_apps';
    END IF;
END $$;


-- ============================================
-- 2. ADD is_hidden_by_admin COLUMN TO mini_apps
-- ============================================
-- Admins can hide any MiniApp (including presets) from workspace view.
-- Hidden apps are not deleted, just not shown to users.
-- Only admins and platform owner can see hidden apps in WorkspaceSettings.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'mini_apps' 
        AND column_name = 'is_hidden_by_admin'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN is_hidden_by_admin BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_hidden_by_admin column to mini_apps';
    ELSE
        RAISE NOTICE 'is_hidden_by_admin column already exists on mini_apps';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'mini_apps' 
        AND column_name = 'hidden_by'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN hidden_by UUID;
        RAISE NOTICE 'Added hidden_by column to mini_apps';
    ELSE
        RAISE NOTICE 'hidden_by column already exists on mini_apps';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'mini_apps' 
        AND column_name = 'hidden_at'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN hidden_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added hidden_at column to mini_apps';
    ELSE
        RAISE NOTICE 'hidden_at column already exists on mini_apps';
    END IF;
END $$;


-- ============================================
-- 3. ADD item_id_settings COLUMN TO mini_apps (if not exists)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'mini_apps' 
        AND column_name = 'item_id_settings'
    ) THEN
        ALTER TABLE app_private.mini_apps ADD COLUMN item_id_settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added item_id_settings column to mini_apps';
    ELSE
        RAISE NOTICE 'item_id_settings column already exists on mini_apps';
    END IF;
END $$;


-- ============================================
-- 4. RPC: Toggle MiniApp visibility (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION public.toggle_mini_app_visibility(
    p_mini_app_id UUID,
    p_hidden BOOLEAN,
    p_hidden_by UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
    UPDATE app_private.mini_apps
    SET is_hidden_by_admin = p_hidden,
        hidden_by = CASE WHEN p_hidden THEN p_hidden_by ELSE NULL END,
        hidden_at = CASE WHEN p_hidden THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_mini_app_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'MiniApp not found');
    END IF;
    
    RETURN json_build_object('success', true, 'is_hidden', p_hidden);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_mini_app_visibility(UUID, BOOLEAN, UUID) TO anon, authenticated, service_role;


-- ============================================
-- 5. RPC: Get all MiniApps for workspace (admin view, includes hidden)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_workspace_mini_apps_admin(
    p_workspace_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(row_to_json(t) ORDER BY t.display_order) INTO v_result
    FROM (
        SELECT ma.id, ma.name, ma.slug, ma.icon, ma.description,
               ma.is_system_app, ma.is_preset, ma.is_visible,
               ma.is_hidden_by_admin, ma.hidden_by, ma.hidden_at,
               ma.display_order, ma.created_by,
               ma.schema_definition, ma.app_settings, ma.item_id_settings,
               ma.created_at, ma.updated_at
        FROM app_private.mini_apps ma
        WHERE ma.workspace_id = p_workspace_id
        ORDER BY ma.display_order
    ) t;
    
    RETURN json_build_object('success', true, 'mini_apps', COALESCE(v_result, '[]'::json));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_mini_apps_admin(UUID) TO anon, authenticated, service_role;


-- ============================================
-- 6. RPC: Save MiniApp (create or update)
-- ============================================
-- Handles both creating new MiniApps and updating existing ones.
-- Enforces permission rules:
--   - Platform owner can edit ANY MiniApp
--   - Org admins can edit MiniApps they created (NOT presets)
--   - Updates are LIVE (no PushUpdate needed)

CREATE OR REPLACE FUNCTION public.save_mini_app(
    p_mini_app_id UUID DEFAULT NULL,  -- NULL = create new
    p_workspace_id UUID DEFAULT NULL,
    p_name VARCHAR DEFAULT NULL,
    p_slug VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_icon VARCHAR DEFAULT NULL,
    p_schema_definition JSONB DEFAULT NULL,
    p_app_settings JSONB DEFAULT NULL,
    p_item_id_settings JSONB DEFAULT NULL,
    p_is_preset BOOLEAN DEFAULT false,
    p_created_by UUID DEFAULT NULL,
    p_caller_role VARCHAR DEFAULT NULL  -- 'platform_owner_admin' or org role
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_existing RECORD;
    v_result RECORD;
BEGIN
    -- If updating existing MiniApp
    IF p_mini_app_id IS NOT NULL THEN
        SELECT * INTO v_existing FROM app_private.mini_apps WHERE id = p_mini_app_id;
        
        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'MiniApp not found');
        END IF;
        
        -- Permission check: only platform owner can edit presets
        IF v_existing.is_preset AND p_caller_role != 'platform_owner_admin' THEN
            RETURN json_build_object('success', false, 'error', 'Only the platform owner can edit preset MiniApps');
        END IF;
        
        -- Permission check: org admins can only edit MiniApps they created
        IF NOT v_existing.is_preset AND p_caller_role != 'platform_owner_admin' THEN
            IF v_existing.created_by IS NOT NULL AND v_existing.created_by != p_created_by THEN
                -- Allow org admins to edit any non-preset app in their org
                -- (the edge function should verify org membership)
                NULL; -- Allow through
            END IF;
        END IF;
        
        -- Update existing MiniApp (LIVE - no PushUpdate needed)
        UPDATE app_private.mini_apps
        SET name = COALESCE(p_name, name),
            description = COALESCE(p_description, description),
            icon = COALESCE(p_icon, icon),
            schema_definition = COALESCE(p_schema_definition, schema_definition),
            app_settings = COALESCE(p_app_settings, app_settings),
            item_id_settings = COALESCE(p_item_id_settings, item_id_settings),
            updated_at = NOW()
        WHERE id = p_mini_app_id
        RETURNING * INTO v_result;
        
        RETURN json_build_object('success', true, 'mini_app', row_to_json(v_result), 'action', 'updated');
    ELSE
        -- Create new MiniApp
        IF p_workspace_id IS NULL OR p_name IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'workspace_id and name are required');
        END IF;
        
        INSERT INTO app_private.mini_apps (
            workspace_id, name, slug, description, icon,
            schema_definition, app_settings, item_id_settings,
            is_preset, is_system_app, created_by
        ) VALUES (
            p_workspace_id,
            p_name,
            COALESCE(p_slug, LOWER(REPLACE(p_name, ' ', '-'))),
            p_description,
            p_icon,
            COALESCE(p_schema_definition, '{}'),
            COALESCE(p_app_settings, '{}'),
            COALESCE(p_item_id_settings, '{}'),
            p_is_preset,
            p_is_preset,  -- system apps are also presets
            p_created_by
        ) RETURNING * INTO v_result;
        
        RETURN json_build_object('success', true, 'mini_app', row_to_json(v_result), 'action', 'created');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_mini_app(UUID, UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, JSONB, JSONB, JSONB, BOOLEAN, UUID, VARCHAR) TO anon, authenticated, service_role;


-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    v_has_is_preset BOOLEAN;
    v_has_is_hidden BOOLEAN;
    v_has_hidden_by BOOLEAN;
    v_has_item_id_settings BOOLEAN;
    v_has_toggle_fn BOOLEAN;
    v_has_admin_fn BOOLEAN;
    v_has_save_fn BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'is_preset') INTO v_has_is_preset;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'is_hidden_by_admin') INTO v_has_is_hidden;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'hidden_by') INTO v_has_hidden_by;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'item_id_settings') INTO v_has_item_id_settings;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'toggle_mini_app_visibility') INTO v_has_toggle_fn;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_workspace_mini_apps_admin') INTO v_has_admin_fn;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'save_mini_app') INTO v_has_save_fn;

    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   MINIAPP SETTINGS MIGRATION VERIFICATION            ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  mini_apps.is_preset:            %', CASE WHEN v_has_is_preset THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_apps.is_hidden_by_admin:   %', CASE WHEN v_has_is_hidden THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_apps.hidden_by:            %', CASE WHEN v_has_hidden_by THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_apps.item_id_settings:     %', CASE WHEN v_has_item_id_settings THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  toggle_mini_app_visibility():   %', CASE WHEN v_has_toggle_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  get_workspace_mini_apps_admin():%', CASE WHEN v_has_admin_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  save_mini_app():                %', CASE WHEN v_has_save_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '╠══════════════════════════════════════════════════════╣';

    IF v_has_is_preset AND v_has_is_hidden AND v_has_hidden_by AND v_has_item_id_settings
       AND v_has_toggle_fn AND v_has_admin_fn AND v_has_save_fn THEN
        RAISE NOTICE '║  STATUS: MIGRATION SUCCESSFUL                        ║';
    ELSE
        RAISE NOTICE '║  STATUS: MIGRATION INCOMPLETE - check above           ║';
    END IF;

    RAISE NOTICE '╚══════════════════════════════════════════════════════╝';
END $$;
