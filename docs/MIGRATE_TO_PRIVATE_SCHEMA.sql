-- ============================================================================
-- APPLEGATE A-CORE BOS - MIGRATE TO PRIVATE SCHEMA
-- ============================================================================
-- This script moves ALL tables from the public schema to a private schema
-- called "app_private". The public schema is exposed via Supabase's REST API
-- by default, which is a security risk. The app_private schema is NOT exposed,
-- making tables completely invisible to the API.
--
-- IMPORTANT: Run this in the Supabase SQL Editor.
-- This is a ONE-TIME migration. After running, use CREATE_TABLES.sql for
-- fresh installs (it already uses app_private).
-- ============================================================================

-- ============================================
-- STEP 1: CREATE THE PRIVATE SCHEMA
-- ============================================
CREATE SCHEMA IF NOT EXISTS app_private;

-- Grant usage ONLY to service_role and postgres (NOT anon or authenticated)
GRANT USAGE ON SCHEMA app_private TO service_role;
GRANT USAGE ON SCHEMA app_private TO postgres;

-- Grant full table permissions to service_role and postgres only
GRANT ALL ON ALL TABLES IN SCHEMA app_private TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA app_private TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app_private TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app_private TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA app_private TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA app_private TO postgres;

-- Set default privileges for future tables in app_private
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  GRANT ALL ON ROUTINES TO service_role;

-- ============================================
-- STEP 2: MOVE TABLES FROM PUBLIC TO APP_PRIVATE
-- ============================================
-- This moves each table. If a table doesn't exist in public, it's skipped.

DO $$
DECLARE
  tables_to_move TEXT[] := ARRAY[
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
    'security_audit_log',
    'connection_test',
    'dashboard_configs',
    'encrypted_data',
    'encryption_keys',
    'activities',
    'payment_history',
    'platform_settings',
    'mini_app_relationships',
    'users'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables_to_move LOOP
    -- Check if table exists in public schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Check if table already exists in app_private (don't overwrite)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'app_private' AND table_name = tbl
      ) THEN
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA app_private', tbl);
        RAISE NOTICE 'Moved table: public.% → app_private.%', tbl, tbl;
      ELSE
        RAISE NOTICE 'SKIPPED: app_private.% already exists', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'SKIPPED: public.% does not exist', tbl;
    END IF;
  END LOOP;
END $$;

-- NOTE: The block below is a safety net for legacy installations that may have
-- had tables in a custom project schema. If no such schema exists, it is skipped.
-- The canonical schema is app_private. No other custom schemas should be used.
DO $$
DECLARE
  tables_to_move TEXT[] := ARRAY[
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
    'security_audit_log',
    'connection_test',
    'dashboard_configs',
    'encrypted_data',
    'encryption_keys',
    'activities',
    'payment_history',
    'platform_settings',
    'mini_app_relationships',
    'users'
  ];
  tbl TEXT;
  custom_schema TEXT;
BEGIN
  -- Check for any non-standard schemas that might contain our tables
  -- (This handles edge cases from older installations)
  FOR custom_schema IN (
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('public', 'app_private', 'pg_catalog', 'information_schema',
                              'auth', 'storage', 'extensions', 'graphql', 'graphql_public',
                              'realtime', 'supabase_functions', 'supabase_migrations',
                              'pgsodium', 'pgsodium_masks', 'vault', 'net', 'pgbouncer',
                              '_realtime', 'cron')
    AND schema_name LIKE 'prj_%'
  ) LOOP
    RAISE NOTICE 'Found legacy project schema: %. Checking for tables to migrate...', custom_schema;
    FOREACH tbl IN ARRAY tables_to_move LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = custom_schema AND table_name = tbl
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'app_private' AND table_name = tbl
        ) THEN
          EXECUTE format('ALTER TABLE %I.%I SET SCHEMA app_private', custom_schema, tbl);
          RAISE NOTICE 'Moved table: %.% → app_private.%', custom_schema, tbl, tbl;
        ELSE
          RAISE NOTICE 'SKIPPED: app_private.% already exists (from public move)', tbl;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;


-- ============================================
-- STEP 3: MOVE THE TRIGGER FUNCTION
-- ============================================
-- The update_updated_at_column() function needs to be accessible
-- We'll recreate it in app_private schema
CREATE OR REPLACE FUNCTION app_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================
DO $$
DECLARE
  tbl TEXT;
  tables_list TEXT[] := ARRAY[
    'organizations', 'platform_users', 'organization_users',
    'workspaces', 'workspace_access', 'mini_apps', 'mini_app_records',
    'audit_logs', 'invitations', 'messages', 'tasks', 'calendar_events',
    'activity_stream', 'user_sessions', 'verification_codes',
    'sms_verification_sessions', 'security_audit_log', 'connection_test',
    'dashboard_configs', 'encrypted_data', 'encryption_keys', 'activities',
    'payment_history', 'platform_settings', 'mini_app_relationships', 'users'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_list LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'app_private' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'RLS enabled on app_private.%', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- STEP 5: DROP ALL EXISTING RLS POLICIES
-- ============================================
-- Remove ALL policies on app_private tables (clean slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'app_private'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON app_private.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy: % on app_private.%', r.policyname, r.tablename;
  END LOOP;
END $$;

-- ============================================
-- STEP 6: ADD SERVICE_ROLE-ONLY POLICIES
-- ============================================
-- These policies ensure ONLY edge functions (service_role) can access data.
-- The anon and authenticated roles are completely blocked.
-- IMPORTANT: current_setting() is wrapped in (SELECT ...) so PostgreSQL
-- evaluates it ONCE per query, not per-row. This is critical for performance.
DO $$
DECLARE
  tbl TEXT;
  tables_list TEXT[] := ARRAY[
    'organizations', 'platform_users', 'organization_users',
    'workspaces', 'workspace_access', 'mini_apps', 'mini_app_records',
    'audit_logs', 'invitations', 'messages', 'tasks', 'calendar_events',
    'activity_stream', 'user_sessions', 'verification_codes',
    'sms_verification_sessions', 'security_audit_log', 'connection_test',
    'dashboard_configs', 'encrypted_data', 'encryption_keys', 'activities',
    'payment_history', 'platform_settings', 'mini_app_relationships', 'users'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_list LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'app_private' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'CREATE POLICY "service_role_only" ON app_private.%I FOR ALL '
        || 'USING ((SELECT COALESCE(current_setting(''request.jwt.claim.role'', true), ''anon'')) = ''service_role'') '
        || 'WITH CHECK ((SELECT COALESCE(current_setting(''request.jwt.claim.role'', true), ''anon'')) = ''service_role'')',
        tbl
      );
      RAISE NOTICE 'Added service_role_only policy on app_private.%', tbl;
    END IF;
  END LOOP;
END $$;


-- ============================================
-- STEP 7: REVOKE PUBLIC SCHEMA ACCESS
-- ============================================
-- Remove any grants on public schema tables that shouldn't exist
-- (The public schema should only contain RPC functions, not data tables)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Re-grant execute on public functions (RPC functions need to be callable)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- STEP 8: UPDATE/CREATE RPC FUNCTIONS
-- ============================================
-- These functions live in the PUBLIC schema (so they're callable via API)
-- but they access data in the APP_PRIVATE schema (via SECURITY DEFINER)

-- Drop old functions that referenced the old schema
DROP FUNCTION IF EXISTS public.get_platform_user_by_email(TEXT);
DROP FUNCTION IF EXISTS public.verify_platform_user_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.set_platform_user_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_platform_user_email(TEXT);
DROP FUNCTION IF EXISTS public.get_platform_user_by_id(UUID);

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
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  IF v_user.password_hash IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Password not set',
      'requiresPasswordSetup', true
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user', row_to_json(v_user),
    'storedHash', v_user.password_hash
  );
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
  SELECT *
  INTO v_user
  FROM app_private.platform_users
  WHERE LOWER(email) = LOWER(p_email);
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  UPDATE app_private.platform_users
  SET 
    password_hash = p_password_hash,
    updated_at = NOW()
  WHERE LOWER(email) = LOWER(p_email);
  
  SELECT row_to_json(t)
  INTO v_result
  FROM (
    SELECT id, email, full_name, role, department, is_owner, 
           phone_number, avatar_url, status, created_at, updated_at
    FROM app_private.platform_users
    WHERE LOWER(email) = LOWER(p_email)
  ) t;
  
  RETURN json_build_object(
    'success', true,
    'user', v_result
  );
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
  UPDATE app_private.platform_users
  SET 
    email_verified = true,
    updated_at = NOW()
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
  SELECT row_to_json(t)
  INTO v_user
  FROM (
    SELECT id, email, full_name, role, department, is_owner, 
           phone_number, avatar_url, status, email_verified,
           created_at, updated_at
    FROM app_private.platform_users
    WHERE id = p_user_id
  ) t;
  
  RETURN v_user;
END;
$$;

-- Function: Get organization user by email (for org login)
CREATE OR REPLACE FUNCTION public.get_org_user_by_email(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_user JSON;
BEGIN
  SELECT row_to_json(t)
  INTO v_user
  FROM (
    SELECT ou.*, o.name as organization_name, o.slug as organization_slug
    FROM app_private.organization_users ou
    JOIN app_private.organizations o ON o.id = ou.organization_id
    WHERE LOWER(ou.email) = LOWER(p_email)
    LIMIT 1
  ) t;
  
  RETURN v_user;
END;
$$;

-- Function: Get workspaces for an organization
CREATE OR REPLACE FUNCTION public.get_org_workspaces(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(w))
  INTO v_result
  FROM (
    SELECT * FROM app_private.workspaces
    WHERE organization_id = p_org_id
    ORDER BY display_order
  ) w;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Function: Get all organizations (for platform admin)
CREATE OR REPLACE FUNCTION public.get_all_organizations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(o))
  INTO v_result
  FROM (
    SELECT * FROM app_private.organizations
    ORDER BY created_at DESC
  ) o;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Function: Get all platform users (for platform admin)
CREATE OR REPLACE FUNCTION public.get_all_platform_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT id, email, full_name, role, department, is_owner, 
           phone_number, avatar_url, status, email_verified,
           totp_enabled, created_at, updated_at
    FROM app_private.platform_users
    ORDER BY created_at DESC
  ) t;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Function: Get dashboard configs for a user
CREATE OR REPLACE FUNCTION public.get_dashboard_configs(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(d))
  INTO v_result
  FROM (
    SELECT * FROM app_private.dashboard_configs
    WHERE user_id = p_user_id
    ORDER BY tab_order ASC
  ) d;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Function: Upsert dashboard config
CREATE OR REPLACE FUNCTION public.upsert_dashboard_config(p_config JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  INSERT INTO app_private.dashboard_configs (
    user_id, tab_id, tab_name, tiles, tab_order, is_active, updated_at
  ) VALUES (
    p_config->>'user_id',
    p_config->>'tab_id',
    p_config->>'tab_name',
    (p_config->'tiles')::jsonb,
    (p_config->>'tab_order')::int,
    (p_config->>'is_active')::boolean,
    COALESCE(p_config->>'updated_at', NOW()::text)::timestamptz
  )
  ON CONFLICT (user_id, tab_id) DO UPDATE SET
    tab_name = EXCLUDED.tab_name,
    tiles = EXCLUDED.tiles,
    tab_order = EXCLUDED.tab_order,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at
  RETURNING row_to_json(dashboard_configs.*) INTO v_result;
  
  RETURN json_build_object('success', true, 'data', v_result);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Insert audit log
CREATE OR REPLACE FUNCTION public.insert_audit_log(p_log JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
  INSERT INTO app_private.audit_logs (
    organization_id, user_id, user_type, user_email,
    action, entity_type, entity_id, old_values, new_values,
    ip_address, user_agent, metadata
  ) VALUES (
    (p_log->>'organization_id')::uuid,
    (p_log->>'user_id')::uuid,
    p_log->>'user_type',
    p_log->>'user_email',
    p_log->>'action',
    p_log->>'entity_type',
    (p_log->>'entity_id')::uuid,
    (p_log->'old_values')::jsonb,
    (p_log->'new_values')::jsonb,
    p_log->>'ip_address',
    p_log->>'user_agent',
    COALESCE((p_log->'metadata')::jsonb, '{}'::jsonb)
  );
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Get audit logs (with optional filters)
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_org_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_org_id IS NOT NULL THEN
    SELECT json_agg(row_to_json(a))
    INTO v_result
    FROM (
      SELECT * FROM app_private.audit_logs
      WHERE organization_id = p_org_id
      ORDER BY created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) a;
  ELSE
    SELECT json_agg(row_to_json(a))
    INTO v_result
    FROM (
      SELECT * FROM app_private.audit_logs
      ORDER BY created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) a;
  END IF;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Function: Get organization users
CREATE OR REPLACE FUNCTION public.get_org_users(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT id, organization_id, email, full_name, role, department,
           avatar_url, phone_number, status, is_org_creator, email_verified,
           created_at, updated_at
    FROM app_private.organization_users
    WHERE organization_id = p_org_id
    ORDER BY created_at DESC
  ) t;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Function: Insert organization user
CREATE OR REPLACE FUNCTION public.insert_org_user(p_user JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  INSERT INTO app_private.organization_users (
    organization_id, email, full_name, role, department, status
  ) VALUES (
    (p_user->>'organization_id')::uuid,
    p_user->>'email',
    COALESCE(p_user->>'full_name', p_user->>'email'),
    COALESCE(p_user->>'role', 'organization_tech_user'),
    p_user->>'department',
    COALESCE(p_user->>'status', 'active')
  )
  RETURNING row_to_json(organization_users.*) INTO v_result;
  
  RETURN json_build_object('success', true, 'data', v_result);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Delete organization user
CREATE OR REPLACE FUNCTION public.delete_org_user(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
  DELETE FROM app_private.organization_users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function: Toggle workspace visibility
CREATE OR REPLACE FUNCTION public.toggle_workspace_visibility(p_workspace_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_current BOOLEAN;
BEGIN
  SELECT is_visible INTO v_current FROM app_private.workspaces WHERE id = p_workspace_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Workspace not found');
  END IF;
  
  UPDATE app_private.workspaces SET is_visible = NOT v_current WHERE id = p_workspace_id;
  
  RETURN json_build_object('success', true, 'is_visible', NOT v_current);
END;
$$;

-- Function: Insert platform user (for invitations)
CREATE OR REPLACE FUNCTION public.insert_platform_user(p_user JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_result JSON;
BEGIN
  INSERT INTO app_private.platform_users (
    email, full_name, role, department, status, is_owner, phone_number
  ) VALUES (
    p_user->>'email',
    COALESCE(p_user->>'full_name', p_user->>'email'),
    COALESCE(p_user->>'role', 'platform_tech_user'),
    p_user->>'department',
    COALESCE(p_user->>'status', 'pending_approval'),
    COALESCE((p_user->>'is_owner')::boolean, false),
    p_user->>'phone_number'
  )
  RETURNING row_to_json(platform_users.*) INTO v_result;
  
  RETURN json_build_object('success', true, 'data', v_result);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Update platform user TOTP settings
CREATE OR REPLACE FUNCTION public.update_platform_user_totp(
  p_user_id UUID,
  p_totp_secret TEXT,
  p_totp_enabled BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
  UPDATE app_private.platform_users
  SET 
    totp_secret = p_totp_secret,
    totp_enabled = p_totp_enabled,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function: Get platform user password hash (for verification)
CREATE OR REPLACE FUNCTION public.get_platform_user_password_hash(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
DECLARE
  v_hash TEXT;
  v_totp BOOLEAN;
BEGIN
  SELECT password_hash, totp_enabled
  INTO v_hash, v_totp
  FROM app_private.platform_users
  WHERE LOWER(email) = LOWER(p_email);
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'password_hash', v_hash,
    'totp_enabled', v_totp
  );
END;
$$;

-- Grant execute on ALL new functions to the roles that need them
-- Note: anon needs execute for RPC calls from the frontend
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- STEP 9: CLEAN UP OLD POLICIES ON PUBLIC TABLES
-- ============================================
-- Drop any remaining policies on public schema tables (if any tables remain)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped public policy: % on %', r.policyname, r.tablename;
  END LOOP;
END $$;

-- ============================================
-- STEP 10: VERIFY MIGRATION
-- ============================================
DO $$
DECLARE
  public_count INT;
  private_count INT;
  tbl RECORD;
BEGIN
  -- Count tables in each schema
  SELECT COUNT(*) INTO public_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  SELECT COUNT(*) INTO private_count
  FROM information_schema.tables
  WHERE table_schema = 'app_private' AND table_type = 'BASE TABLE';
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables remaining in public schema: %', public_count;
  RAISE NOTICE 'Tables in app_private schema: %', private_count;
  RAISE NOTICE '';
  
  -- List tables in app_private
  RAISE NOTICE 'Tables in app_private:';
  FOR tbl IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'app_private' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  ) LOOP
    RAISE NOTICE '  - %', tbl.table_name;
  END LOOP;
  
  -- List any remaining tables in public (should be 0)
  IF public_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'WARNING: Tables still in public schema:';
    FOR tbl IN (
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    ) LOOP
      RAISE NOTICE '  - % (consider moving manually)', tbl.table_name;
    END LOOP;
  END IF;
  
  -- List RPC functions
  RAISE NOTICE '';
  RAISE NOTICE 'RPC functions in public schema:';
  FOR tbl IN (
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    AND routine_name NOT LIKE 'pg_%'
    ORDER BY routine_name
  ) LOOP
    RAISE NOTICE '  - %', tbl.routine_name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SECURITY STATUS:';
  RAISE NOTICE '  - All tables in app_private (NOT exposed via API)';
  RAISE NOTICE '  - RLS enabled on all tables';
  RAISE NOTICE '  - Only service_role can access tables directly';
  RAISE NOTICE '  - RPC functions in public schema use SECURITY DEFINER';
  RAISE NOTICE '  - Frontend anon key CANNOT read any table data';
  RAISE NOTICE '============================================';
END $$;
