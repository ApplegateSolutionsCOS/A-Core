-- ============================================
-- FIX: Supabase Performance Advisor Warnings
-- "RLS policy re-evaluates current_setting() for each row"
-- ============================================
-- Run this ENTIRE script in the Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste > Run)
--
-- PROBLEM:
--   USING (COALESCE(current_setting('request.jwt.claim.role', true), 'anon') = 'service_role')
--   ^ This re-evaluates current_setting() for EVERY row in the table.
--
-- FIX:
--   USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
--   ^ Wrapping in (SELECT ...) makes PostgreSQL evaluate it ONCE per query.
--
-- This fixes all tables in app_private schema that have this issue.
-- Tables that don't exist yet are safely skipped.
-- ============================================

-- ============================================
-- STEP 0: Create any missing tables first
-- ============================================
-- The sms_verification_sessions table may not exist if the database
-- was set up before this table was added to the schema.

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

-- Enable RLS on the table (safe to run even if already enabled)
ALTER TABLE app_private.sms_verification_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 1: Fix all RLS policies
-- Each block checks if the table exists before modifying.
-- ============================================

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
    v_skipped INTEGER := 0;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        -- Check if the table exists in app_private schema
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'app_private' AND table_name = v_table
        ) THEN
            -- Drop the old policy
            EXECUTE format('DROP POLICY IF EXISTS "service_role_only" ON app_private.%I', v_table);
            
            -- Create the new optimized policy with (SELECT ...) wrapper
            EXECUTE format(
                'CREATE POLICY "service_role_only" ON app_private.%I FOR ALL
                 USING ((SELECT COALESCE(current_setting(''request.jwt.claim.role'', true), ''anon'')) = ''service_role'')
                 WITH CHECK ((SELECT COALESCE(current_setting(''request.jwt.claim.role'', true), ''anon'')) = ''service_role'')',
                v_table
            );
            
            v_count := v_count + 1;
            RAISE NOTICE 'Fixed: app_private.%', v_table;
        ELSE
            v_skipped := v_skipped + 1;
            RAISE NOTICE 'SKIPPED (table not found): app_private.%', v_table;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RLS PERFORMANCE FIX COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Policies fixed: % of % tables', v_count, array_length(v_tables, 1);
    IF v_skipped > 0 THEN
        RAISE NOTICE 'Skipped (missing tables): %', v_skipped;
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE 'All current_setting() calls now wrapped in (SELECT ...)';
    RAISE NOTICE 'Effect: Evaluated ONCE per query instead of per-row';
    RAISE NOTICE '';
    RAISE NOTICE 'Go to Performance Advisor to verify 0 warnings.';
    RAISE NOTICE '============================================';
END $$;
