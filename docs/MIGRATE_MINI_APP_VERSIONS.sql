-- ============================================================================
-- APPLEGATE A-CORE BOS - MIGRATION: MiniApp Version History
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER running:
--   1. CREATE_TABLES.sql
--   2. MIGRATE_TO_PRIVATE_SCHEMA.sql
--   3. MIGRATION_ITEM_UID.sql
--   4. MIGRATION_ACCESS_CONTROL.sql
--   5. MIGRATION_MINIAPP_SETTINGS.sql
--
-- This migration adds:
--   - mini_app_versions table in app_private schema
--   - Composite index on (mini_app_id, version_number DESC) for fast lookups
--   - Index on (changed_at DESC) for timeline queries
--   - RLS policy (service_role only, consistent with all other tables)
--   - RPC functions for version management (insert, query, restore)
--   - Auto-versioning trigger on mini_apps save
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS and CREATE OR REPLACE patterns
-- ============================================================================


-- ============================================
-- 1. CREATE mini_app_versions TABLE
-- ============================================
-- Stores a snapshot of the MiniApp schema each time it is saved.
-- This enables full version history with diff comparison and restore.
--
-- Columns:
--   id               - Unique version record ID
--   mini_app_id      - FK to app_private.mini_apps(id), CASCADE on delete
--   version_number   - Auto-incrementing per mini_app_id (1, 2, 3, ...)
--   schema_definition- JSONB snapshot of the field schema at this version
--   app_settings     - JSONB snapshot of MiniApp-level settings (layouts, etc.)
--   item_id_settings - JSONB snapshot of Item ID configuration (prefix, digits, barcode)
--   changed_by       - UUID of the user who made the change
--   changed_at       - Timestamp of when this version was created
--   change_summary   - Human-readable description of what changed

CREATE TABLE IF NOT EXISTS app_private.mini_app_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mini_app_id UUID NOT NULL REFERENCES app_private.mini_apps(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    schema_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
    app_settings JSONB DEFAULT '{}'::jsonb,
    item_id_settings JSONB DEFAULT '{}'::jsonb,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT now(),
    change_summary TEXT DEFAULT '',
    CONSTRAINT unique_mini_app_version UNIQUE (mini_app_id, version_number)
);


-- ============================================
-- 2. CREATE INDEXES
-- ============================================
-- Primary lookup: get all versions for a MiniApp, newest first
CREATE INDEX IF NOT EXISTS idx_mini_app_versions_app_version
    ON app_private.mini_app_versions (mini_app_id, version_number DESC);

-- Timeline queries: get recent changes across all MiniApps
CREATE INDEX IF NOT EXISTS idx_mini_app_versions_changed_at
    ON app_private.mini_app_versions (changed_at DESC);

-- Optional: lookup by who made the change
CREATE INDEX IF NOT EXISTS idx_mini_app_versions_changed_by
    ON app_private.mini_app_versions (changed_by);


-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE app_private.mini_app_versions ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 4. RLS POLICY - SERVICE ROLE ONLY
-- ============================================
-- Consistent with all other app_private tables:
-- Only edge functions (service_role) can access this table directly.
-- Frontend access is through RPC functions or the db-proxy edge function.
--
-- IMPORTANT: current_setting() is wrapped in (SELECT ...) so PostgreSQL
-- evaluates it ONCE per query, not per-row. This is critical for performance.

DROP POLICY IF EXISTS "service_role_only" ON app_private.mini_app_versions;
CREATE POLICY "service_role_only" ON app_private.mini_app_versions FOR ALL
    USING (
        (SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role'
    )
    WITH CHECK (
        (SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role'
    );


-- ============================================
-- 5. GRANT TABLE PERMISSIONS TO SERVICE ROLE
-- ============================================
-- Ensure service_role and postgres have full access
GRANT ALL ON app_private.mini_app_versions TO service_role;
GRANT ALL ON app_private.mini_app_versions TO postgres;


-- ============================================
-- 6. RPC FUNCTION: Insert a new version snapshot
-- ============================================
-- Called after each MiniApp save. Automatically determines the next
-- version_number by finding MAX(version_number) for the given mini_app_id.
-- Returns the created version record.

CREATE OR REPLACE FUNCTION public.insert_mini_app_version(
    p_mini_app_id UUID,
    p_schema_definition JSONB,
    p_app_settings JSONB DEFAULT '{}'::jsonb,
    p_item_id_settings JSONB DEFAULT '{}'::jsonb,
    p_changed_by UUID DEFAULT NULL,
    p_change_summary TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_next_version INTEGER;
    v_result RECORD;
BEGIN
    -- Verify the mini_app exists
    IF NOT EXISTS (SELECT 1 FROM app_private.mini_apps WHERE id = p_mini_app_id) THEN
        RETURN json_build_object('success', false, 'error', 'MiniApp not found');
    END IF;

    -- Calculate next version number (auto-increment per mini_app_id)
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM app_private.mini_app_versions
    WHERE mini_app_id = p_mini_app_id;

    -- Insert the version snapshot
    INSERT INTO app_private.mini_app_versions (
        mini_app_id,
        version_number,
        schema_definition,
        app_settings,
        item_id_settings,
        changed_by,
        change_summary
    ) VALUES (
        p_mini_app_id,
        v_next_version,
        p_schema_definition,
        p_app_settings,
        p_item_id_settings,
        p_changed_by,
        p_change_summary
    )
    RETURNING * INTO v_result;

    RETURN json_build_object(
        'success', true,
        'version', row_to_json(v_result),
        'version_number', v_next_version
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_mini_app_version(UUID, JSONB, JSONB, JSONB, UUID, TEXT) TO anon, authenticated, service_role;


-- ============================================
-- 7. RPC FUNCTION: Get version history for a MiniApp
-- ============================================
-- Returns all versions for a given mini_app_id, ordered newest first.
-- Optionally limited to a specific number of versions.

CREATE OR REPLACE FUNCTION public.get_mini_app_versions(
    p_mini_app_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(row_to_json(v))
    INTO v_result
    FROM (
        SELECT id, mini_app_id, version_number,
               schema_definition, app_settings, item_id_settings,
               changed_by, changed_at, change_summary
        FROM app_private.mini_app_versions
        WHERE mini_app_id = p_mini_app_id
        ORDER BY version_number DESC
        LIMIT p_limit
    ) v;

    RETURN json_build_object(
        'success', true,
        'versions', COALESCE(v_result, '[]'::json)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mini_app_versions(UUID, INTEGER) TO anon, authenticated, service_role;


-- ============================================
-- 8. RPC FUNCTION: Get a specific version by ID
-- ============================================
-- Returns a single version record for detailed inspection or restore.

CREATE OR REPLACE FUNCTION public.get_mini_app_version_by_id(
    p_version_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT row_to_json(v)
    INTO v_result
    FROM (
        SELECT id, mini_app_id, version_number,
               schema_definition, app_settings, item_id_settings,
               changed_by, changed_at, change_summary
        FROM app_private.mini_app_versions
        WHERE id = p_version_id
    ) v;

    IF v_result IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Version not found');
    END IF;

    RETURN json_build_object('success', true, 'version', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mini_app_version_by_id(UUID) TO anon, authenticated, service_role;


-- ============================================
-- 9. RPC FUNCTION: Restore a MiniApp to a specific version
-- ============================================
-- Restores the MiniApp's schema_definition, app_settings, and item_id_settings
-- to the values stored in the specified version. Before restoring, the CURRENT
-- state is saved as a new version (so no data is ever lost).
-- Returns the newly created "pre-restore" version and the restored MiniApp.

CREATE OR REPLACE FUNCTION public.restore_mini_app_version(
    p_version_id UUID,
    p_restored_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_version RECORD;
    v_current_app RECORD;
    v_backup_version_number INTEGER;
    v_backup RECORD;
BEGIN
    -- Get the version to restore
    SELECT * INTO v_version
    FROM app_private.mini_app_versions
    WHERE id = p_version_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Version not found');
    END IF;

    -- Get current MiniApp state (to save as backup before restoring)
    SELECT * INTO v_current_app
    FROM app_private.mini_apps
    WHERE id = v_version.mini_app_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'MiniApp not found');
    END IF;

    -- Save current state as a new version (backup before restore)
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_backup_version_number
    FROM app_private.mini_app_versions
    WHERE mini_app_id = v_version.mini_app_id;

    INSERT INTO app_private.mini_app_versions (
        mini_app_id, version_number, schema_definition,
        app_settings, item_id_settings, changed_by,
        change_summary
    ) VALUES (
        v_version.mini_app_id,
        v_backup_version_number,
        COALESCE(v_current_app.schema_definition, '{}'::jsonb),
        COALESCE(v_current_app.app_settings, '{}'::jsonb),
        COALESCE(v_current_app.item_id_settings, '{}'::jsonb),
        p_restored_by,
        format('Auto-backup before restoring to v%s', v_version.version_number)
    )
    RETURNING * INTO v_backup;

    -- Restore the MiniApp to the selected version
    UPDATE app_private.mini_apps
    SET schema_definition = v_version.schema_definition,
        app_settings = COALESCE(v_version.app_settings, app_settings),
        item_id_settings = COALESCE(v_version.item_id_settings, item_id_settings),
        updated_at = NOW()
    WHERE id = v_version.mini_app_id;

    RETURN json_build_object(
        'success', true,
        'restored_to_version', v_version.version_number,
        'backup_version', v_backup_version_number,
        'mini_app_id', v_version.mini_app_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_mini_app_version(UUID, UUID) TO anon, authenticated, service_role;


-- ============================================
-- 10. RPC FUNCTION: Get version count for a MiniApp
-- ============================================
-- Lightweight query to check how many versions exist.

CREATE OR REPLACE FUNCTION public.get_mini_app_version_count(
    p_mini_app_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_count INTEGER;
    v_latest_version INTEGER;
    v_latest_changed_at TIMESTAMPTZ;
BEGIN
    SELECT COUNT(*), MAX(version_number), MAX(changed_at)
    INTO v_count, v_latest_version, v_latest_changed_at
    FROM app_private.mini_app_versions
    WHERE mini_app_id = p_mini_app_id;

    RETURN json_build_object(
        'success', true,
        'count', COALESCE(v_count, 0),
        'latest_version', v_latest_version,
        'latest_changed_at', v_latest_changed_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mini_app_version_count(UUID) TO anon, authenticated, service_role;


-- ============================================
-- 11. RPC FUNCTION: Cleanup old versions (retention policy)
-- ============================================
-- Keeps only the N most recent versions for a MiniApp.
-- Useful for automated cleanup or manual maintenance.
-- Default retention: 50 versions per MiniApp.

CREATE OR REPLACE FUNCTION public.cleanup_mini_app_versions(
    p_mini_app_id UUID,
    p_keep_count INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    WITH versions_to_delete AS (
        SELECT id
        FROM app_private.mini_app_versions
        WHERE mini_app_id = p_mini_app_id
        ORDER BY version_number DESC
        OFFSET p_keep_count
    )
    DELETE FROM app_private.mini_app_versions
    WHERE id IN (SELECT id FROM versions_to_delete);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'deleted_count', v_deleted,
        'kept_count', p_keep_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_mini_app_versions(UUID, INTEGER) TO anon, authenticated, service_role;


-- ============================================
-- 12. TRIGGER: Auto-version on MiniApp schema save
-- ============================================
-- Automatically creates a version snapshot whenever the schema_definition,
-- app_settings, or item_id_settings columns are updated on mini_apps.
-- This ensures no schema change is ever lost, even if the frontend
-- forgets to call insert_mini_app_version explicitly.

CREATE OR REPLACE FUNCTION app_private.auto_version_mini_app()
RETURNS TRIGGER AS $$
DECLARE
    v_next_version INTEGER;
    v_changes TEXT[] := ARRAY[]::TEXT[];
    v_summary TEXT;
BEGIN
    -- Only trigger if schema-related columns actually changed
    IF (OLD.schema_definition IS DISTINCT FROM NEW.schema_definition) THEN
        v_changes := array_append(v_changes, 'schema');
    END IF;
    IF (OLD.app_settings IS DISTINCT FROM NEW.app_settings) THEN
        v_changes := array_append(v_changes, 'app_settings');
    END IF;
    IF (OLD.item_id_settings IS DISTINCT FROM NEW.item_id_settings) THEN
        v_changes := array_append(v_changes, 'item_id_settings');
    END IF;

    -- If nothing schema-related changed, skip versioning
    IF array_length(v_changes, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- Build change summary
    v_summary := 'Auto-versioned: ' || array_to_string(v_changes, ', ') || ' updated';

    -- Calculate next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM app_private.mini_app_versions
    WHERE mini_app_id = OLD.id;

    -- Save the OLD (pre-update) state as a version
    INSERT INTO app_private.mini_app_versions (
        mini_app_id,
        version_number,
        schema_definition,
        app_settings,
        item_id_settings,
        changed_by,
        change_summary
    ) VALUES (
        OLD.id,
        v_next_version,
        COALESCE(OLD.schema_definition, '{}'::jsonb),
        COALESCE(OLD.app_settings, '{}'::jsonb),
        COALESCE(OLD.item_id_settings, '{}'::jsonb),
        NULL,  -- changed_by is not available in trigger context
        v_summary
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't block the update if versioning fails
    RAISE WARNING 'Auto-versioning failed for mini_app %: %', OLD.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger (DROP IF EXISTS for idempotency)
DROP TRIGGER IF EXISTS auto_version_mini_app_trigger ON app_private.mini_apps;
CREATE TRIGGER auto_version_mini_app_trigger
    BEFORE UPDATE ON app_private.mini_apps
    FOR EACH ROW
    EXECUTE FUNCTION app_private.auto_version_mini_app();


-- ============================================
-- 13. UPDATED_AT TRIGGER (not needed - changed_at uses DEFAULT now())
-- ============================================
-- The mini_app_versions table is append-only (versions are never updated),
-- so no updated_at trigger is needed. changed_at is set once on INSERT.


-- ============================================
-- 14. VERIFICATION
-- ============================================
DO $$
DECLARE
    v_has_table BOOLEAN;
    v_has_idx_version BOOLEAN;
    v_has_idx_changed BOOLEAN;
    v_has_idx_changed_by BOOLEAN;
    v_has_rls BOOLEAN;
    v_has_policy BOOLEAN;
    v_has_insert_fn BOOLEAN;
    v_has_get_fn BOOLEAN;
    v_has_get_by_id_fn BOOLEAN;
    v_has_restore_fn BOOLEAN;
    v_has_count_fn BOOLEAN;
    v_has_cleanup_fn BOOLEAN;
    v_has_trigger BOOLEAN;
    v_col_count INTEGER;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'app_private' AND table_name = 'mini_app_versions'
    ) INTO v_has_table;

    -- Check indexes
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'app_private' AND indexname = 'idx_mini_app_versions_app_version'
    ) INTO v_has_idx_version;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'app_private' AND indexname = 'idx_mini_app_versions_changed_at'
    ) INTO v_has_idx_changed;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'app_private' AND indexname = 'idx_mini_app_versions_changed_by'
    ) INTO v_has_idx_changed_by;

    -- Check RLS
    SELECT relrowsecurity INTO v_has_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app_private' AND c.relname = 'mini_app_versions';
    v_has_rls := COALESCE(v_has_rls, false);

    -- Check policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'app_private' AND tablename = 'mini_app_versions'
        AND policyname = 'service_role_only'
    ) INTO v_has_policy;

    -- Check RPC functions
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'insert_mini_app_version') INTO v_has_insert_fn;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_mini_app_versions') INTO v_has_get_fn;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_mini_app_version_by_id') INTO v_has_get_by_id_fn;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'restore_mini_app_version') INTO v_has_restore_fn;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_mini_app_version_count') INTO v_has_count_fn;
    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'cleanup_mini_app_versions') INTO v_has_cleanup_fn;

    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_schema = 'app_private'
        AND trigger_name = 'auto_version_mini_app_trigger'
        AND event_object_table = 'mini_apps'
    ) INTO v_has_trigger;

    -- Count columns
    SELECT COUNT(*) INTO v_col_count
    FROM information_schema.columns
    WHERE table_schema = 'app_private' AND table_name = 'mini_app_versions';

    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   MINI APP VERSION HISTORY - MIGRATION VERIFICATION      ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║                                                          ║';
    RAISE NOTICE '║  TABLE                                                   ║';
    RAISE NOTICE '║  ─────                                                   ║';
    RAISE NOTICE '║  app_private.mini_app_versions:    %', CASE WHEN v_has_table THEN 'YES  (' || v_col_count || ' columns)' ELSE 'NO' END;
    RAISE NOTICE '║                                                          ║';
    RAISE NOTICE '║  INDEXES                                                 ║';
    RAISE NOTICE '║  ───────                                                 ║';
    RAISE NOTICE '║  idx_app_version (composite):      %', CASE WHEN v_has_idx_version THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  idx_changed_at:                   %', CASE WHEN v_has_idx_changed THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  idx_changed_by:                   %', CASE WHEN v_has_idx_changed_by THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║                                                          ║';
    RAISE NOTICE '║  SECURITY                                                ║';
    RAISE NOTICE '║  ────────                                                ║';
    RAISE NOTICE '║  RLS enabled:                      %', CASE WHEN v_has_rls THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  service_role_only policy:         %', CASE WHEN v_has_policy THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║                                                          ║';
    RAISE NOTICE '║  RPC FUNCTIONS                                           ║';
    RAISE NOTICE '║  ─────────────                                           ║';
    RAISE NOTICE '║  insert_mini_app_version():        %', CASE WHEN v_has_insert_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  get_mini_app_versions():          %', CASE WHEN v_has_get_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  get_mini_app_version_by_id():     %', CASE WHEN v_has_get_by_id_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  restore_mini_app_version():       %', CASE WHEN v_has_restore_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  get_mini_app_version_count():     %', CASE WHEN v_has_count_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  cleanup_mini_app_versions():      %', CASE WHEN v_has_cleanup_fn THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║                                                          ║';
    RAISE NOTICE '║  TRIGGER                                                 ║';
    RAISE NOTICE '║  ───────                                                 ║';
    RAISE NOTICE '║  auto_version_mini_app_trigger:    %', CASE WHEN v_has_trigger THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║                                                          ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';

    IF v_has_table AND v_has_idx_version AND v_has_idx_changed AND v_has_rls
       AND v_has_policy AND v_has_insert_fn AND v_has_get_fn
       AND v_has_get_by_id_fn AND v_has_restore_fn AND v_has_count_fn
       AND v_has_cleanup_fn AND v_has_trigger THEN
        RAISE NOTICE '║  STATUS: ALL CHECKS PASSED - MIGRATION SUCCESSFUL       ║';
    ELSE
        RAISE NOTICE '║  STATUS: SOME CHECKS FAILED - review output above       ║';
    END IF;

    RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
END $$;
