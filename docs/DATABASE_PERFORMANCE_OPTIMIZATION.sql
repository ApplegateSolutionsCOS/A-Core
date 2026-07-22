-- ============================================================================
-- DATABASE PERFORMANCE OPTIMIZATION FOR MILLIONS OF USERS
-- Applegate Core Platform - Comprehensive Performance Tuning
-- Generated: 2026-02-10
-- ============================================================================

-- ============================================================================
-- 1. COMPOSITE INDEXES FOR HIGH-TRAFFIC QUERIES
-- ============================================================================

-- Platform users: login lookups by email + password verification
CREATE INDEX IF NOT EXISTS idx_platform_users_email_hash 
ON app_private.platform_users (email, password_hash);

-- Platform users: active user queries
CREATE INDEX IF NOT EXISTS idx_platform_users_email_active 
ON app_private.platform_users (email) WHERE status = 'active';

-- Organization users: org-scoped lookups
CREATE INDEX IF NOT EXISTS idx_org_users_org_email 
ON app_private.organization_users (organization_id, email);

-- Organization users: role-based queries within org
CREATE INDEX IF NOT EXISTS idx_org_users_org_role 
ON app_private.organization_users (organization_id, role);

-- Audit logs: time-range queries with user filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_user 
ON app_private.audit_logs (created_at DESC, user_id);

-- Audit logs: action-type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created 
ON app_private.audit_logs (action, created_at DESC);

-- Messages: workspace message feeds
CREATE INDEX IF NOT EXISTS idx_messages_workspace_created 
ON app_private.messages (workspace_id, created_at DESC);

-- Messages: user inbox queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created 
ON app_private.messages (recipient_id, created_at DESC) WHERE read = false;

-- Tasks: assigned user + status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status 
ON app_private.tasks (assigned_to, status);

-- Tasks: workspace task boards
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status 
ON app_private.tasks (workspace_id, status, priority);

-- Tasks: due date queries for reminders
CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
ON app_private.tasks (due_date) WHERE status != 'completed';

-- Calendar events: workspace event feeds
CREATE INDEX IF NOT EXISTS idx_events_workspace_start 
ON app_private.calendar_events (workspace_id, start_time);

-- Calendar events: user schedule queries
CREATE INDEX IF NOT EXISTS idx_events_user_start 
ON app_private.calendar_events (user_id, start_time);

-- Mini apps: workspace app listings
CREATE INDEX IF NOT EXISTS idx_miniapps_workspace 
ON app_private.mini_apps (workspace_id, is_visible);

-- Mini app items: app-scoped item queries
CREATE INDEX IF NOT EXISTS idx_miniapp_items_app_created 
ON app_private.mini_app_items (mini_app_id, created_at DESC);

-- Workspaces: org workspace listings
CREATE INDEX IF NOT EXISTS idx_workspaces_org_order 
ON app_private.workspaces (organization_id, display_order);

-- ============================================================================
-- 2. PARTIAL INDEXES FOR ACTIVE RECORDS (WHERE status='active')
-- ============================================================================

-- Only index active platform users (skip deactivated accounts)
CREATE INDEX IF NOT EXISTS idx_platform_users_active 
ON app_private.platform_users (id, email, role) WHERE status = 'active';

-- Only index active org users
CREATE INDEX IF NOT EXISTS idx_org_users_active 
ON app_private.organization_users (id, organization_id, role) WHERE status = 'active';

-- Only index incomplete tasks
CREATE INDEX IF NOT EXISTS idx_tasks_incomplete 
ON app_private.tasks (assigned_to, priority, due_date) WHERE status IN ('pending', 'in_progress');

-- Only index unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON app_private.messages (recipient_id, created_at DESC) WHERE read = false;

-- Only index future events
CREATE INDEX IF NOT EXISTS idx_events_upcoming 
ON app_private.calendar_events (workspace_id, start_time) WHERE start_time > NOW();

-- ============================================================================
-- 3. MATERIALIZED VIEWS FOR DASHBOARD STATISTICS
-- ============================================================================

-- Dashboard stats: organization user counts by role
CREATE MATERIALIZED VIEW IF NOT EXISTS app_private.mv_org_user_stats AS
SELECT 
  organization_id,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'active') as active_users,
  COUNT(*) FILTER (WHERE role = 'organization_admin') as admin_count,
  COUNT(*) FILTER (WHERE role = 'organization_manager') as manager_count,
  COUNT(*) FILTER (WHERE role = 'organization_user') as user_count,
  MAX(last_login_at) as last_activity
FROM app_private.organization_users
GROUP BY organization_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_org_user_stats_org 
ON app_private.mv_org_user_stats (organization_id);

-- Dashboard stats: workspace activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS app_private.mv_workspace_stats AS
SELECT 
  w.id as workspace_id,
  w.organization_id,
  w.slug,
  COALESCE(t.task_count, 0) as total_tasks,
  COALESCE(t.completed_tasks, 0) as completed_tasks,
  COALESCE(m.message_count, 0) as total_messages,
  COALESCE(e.event_count, 0) as upcoming_events
FROM app_private.workspaces w
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) as task_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
  FROM app_private.tasks WHERE workspace_id = w.slug
) t ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as message_count
  FROM app_private.messages WHERE workspace_id = w.id
) m ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as event_count
  FROM app_private.calendar_events WHERE workspace_id = w.slug AND start_time > NOW()
) e ON true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_workspace_stats_id 
ON app_private.mv_workspace_stats (workspace_id);

-- Dashboard stats: platform-wide metrics (for God Mode panel)
CREATE MATERIALIZED VIEW IF NOT EXISTS app_private.mv_platform_stats AS
SELECT 
  (SELECT COUNT(*) FROM app_private.organizations) as total_organizations,
  (SELECT COUNT(*) FROM app_private.platform_users WHERE status = 'active') as active_platform_users,
  (SELECT COUNT(*) FROM app_private.organization_users WHERE status = 'active') as active_org_users,
  (SELECT COUNT(*) FROM app_private.audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as daily_audit_events,
  (SELECT COUNT(*) FROM app_private.tasks WHERE status = 'in_progress') as active_tasks,
  NOW() as refreshed_at;

-- Refresh function for materialized views (call via pg_cron or edge function)
CREATE OR REPLACE FUNCTION app_private.refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY app_private.mv_org_user_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY app_private.mv_workspace_stats;
  REFRESH MATERIALIZED VIEW app_private.mv_platform_stats;
END;
$$;

-- Schedule refresh every 5 minutes (requires pg_cron extension)
-- SELECT cron.schedule('refresh-dashboard-stats', '*/5 * * * *', 'SELECT app_private.refresh_dashboard_stats()');

-- ============================================================================
-- 4. CONNECTION POOLING RECOMMENDATIONS
-- ============================================================================

-- Supabase uses PgBouncer by default. Recommended settings for millions of users:
--
-- [pgbouncer]
-- pool_mode = transaction          -- Use transaction pooling for web apps
-- default_pool_size = 25           -- Connections per user/database pair
-- max_client_conn = 10000          -- Max simultaneous client connections
-- reserve_pool_size = 5            -- Extra connections for burst traffic
-- reserve_pool_timeout = 3         -- Seconds before using reserve pool
-- server_idle_timeout = 600        -- Close idle server connections after 10min
-- query_wait_timeout = 120         -- Max time client waits for a connection
--
-- For Supabase specifically:
-- 1. Use connection string with ?pgbouncer=true for pooled connections
-- 2. Avoid PREPARE statements (incompatible with transaction pooling)
-- 3. Use short-lived transactions
-- 4. Avoid SET statements that persist across transactions
-- 5. Use the Supabase client library which handles pooling automatically

-- ============================================================================
-- 5. RLS POLICY OPTIMIZATION: (SELECT auth.function()) PATTERN
-- Replace auth.<function>() with (SELECT auth.<function>()) to prevent
-- per-row re-evaluation. This is CRITICAL for performance at scale.
-- ============================================================================

-- Drop and recreate all RLS policies with optimized pattern

-- Organizations table
DROP POLICY IF EXISTS service_role_only ON app_private.organizations;
CREATE POLICY service_role_only ON app_private.organizations
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Platform users table
DROP POLICY IF EXISTS service_role_only ON app_private.platform_users;
CREATE POLICY service_role_only ON app_private.platform_users
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Organization users table  
DROP POLICY IF EXISTS service_role_only ON app_private.organization_users;
CREATE POLICY service_role_only ON app_private.organization_users
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Audit logs table
DROP POLICY IF EXISTS service_role_only ON app_private.audit_logs;
CREATE POLICY service_role_only ON app_private.audit_logs
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Messages table
DROP POLICY IF EXISTS service_role_only ON app_private.messages;
CREATE POLICY service_role_only ON app_private.messages
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Tasks table
DROP POLICY IF EXISTS service_role_only ON app_private.tasks;
CREATE POLICY service_role_only ON app_private.tasks
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Calendar events table
DROP POLICY IF EXISTS service_role_only ON app_private.calendar_events;
CREATE POLICY service_role_only ON app_private.calendar_events
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Workspaces table
DROP POLICY IF EXISTS service_role_only ON app_private.workspaces;
CREATE POLICY service_role_only ON app_private.workspaces
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Mini apps table
DROP POLICY IF EXISTS service_role_only ON app_private.mini_apps;
CREATE POLICY service_role_only ON app_private.mini_apps
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- Mini app items table
DROP POLICY IF EXISTS service_role_only ON app_private.mini_app_items;
CREATE POLICY service_role_only ON app_private.mini_app_items
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- If using auth.uid() based policies on public schema tables:
-- WRONG:  USING (auth.uid() = user_id)
-- RIGHT:  USING ((SELECT auth.uid()) = user_id)

-- If using auth.jwt() based policies:
-- WRONG:  USING ((auth.jwt() ->> 'role') = 'admin')
-- RIGHT:  USING (((SELECT auth.jwt()) ->> 'role') = 'admin')

-- ============================================================================
-- 6. TABLE PARTITIONING STRATEGY FOR AUDIT_LOGS BY MONTH
-- ============================================================================

-- Step 1: Create partitioned audit_logs table
-- NOTE: This requires migrating existing data. Run during maintenance window.

-- Create the new partitioned table
CREATE TABLE IF NOT EXISTS app_private.audit_logs_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for current and future months
-- Auto-create partitions for the next 12 months
DO $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..11 LOOP
    start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
    end_date := DATE_TRUNC('month', CURRENT_DATE + ((i + 1) || ' months')::INTERVAL);
    partition_name := 'audit_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS app_private.%I PARTITION OF app_private.audit_logs_partitioned
       FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    
    -- Add index on each partition
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_user_action ON app_private.%I (user_id, action)',
      partition_name, partition_name
    );
  END LOOP;
END $$;

-- Create a default partition for any data outside defined ranges
CREATE TABLE IF NOT EXISTS app_private.audit_logs_default 
PARTITION OF app_private.audit_logs_partitioned DEFAULT;

-- Function to auto-create future partitions (run monthly via pg_cron)
CREATE OR REPLACE FUNCTION app_private.create_audit_log_partition()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months');
  partition_name TEXT := 'audit_logs_' || TO_CHAR(next_month, 'YYYY_MM');
  end_date DATE := next_month + INTERVAL '1 month';
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS app_private.%I PARTITION OF app_private.audit_logs_partitioned
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month, end_date
  );
  
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_user_action ON app_private.%I (user_id, action)',
    partition_name, partition_name
  );
  
  RAISE NOTICE 'Created partition: %', partition_name;
END;
$$;

-- Schedule monthly partition creation (requires pg_cron)
-- SELECT cron.schedule('create-audit-partition', '0 0 15 * *', 'SELECT app_private.create_audit_log_partition()');

-- Migration script to move data from old table to partitioned table:
-- INSERT INTO app_private.audit_logs_partitioned 
-- SELECT * FROM app_private.audit_logs;
-- Then rename tables:
-- ALTER TABLE app_private.audit_logs RENAME TO audit_logs_old;
-- ALTER TABLE app_private.audit_logs_partitioned RENAME TO audit_logs;

-- ============================================================================
-- 7. ADDITIONAL PERFORMANCE RECOMMENDATIONS
-- ============================================================================

-- Enable pg_stat_statements for query performance monitoring
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Analyze tables after bulk operations
ANALYZE app_private.platform_users;
ANALYZE app_private.organization_users;
ANALYZE app_private.audit_logs;
ANALYZE app_private.messages;
ANALYZE app_private.tasks;
ANALYZE app_private.calendar_events;
ANALYZE app_private.workspaces;
ANALYZE app_private.mini_apps;

-- Set appropriate autovacuum settings for high-write tables
ALTER TABLE app_private.audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE app_private.messages SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);

-- ============================================================================
-- END OF PERFORMANCE OPTIMIZATION
-- ============================================================================
