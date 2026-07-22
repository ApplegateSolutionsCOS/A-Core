-- ============================================
-- FIX: Supabase Security Advisor Warnings
-- "Function Search Path Mutable"
-- ============================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- This fixes BOTH warnings shown in Security Advisor.
-- ============================================

-- ============================================
-- WARNING 1: app_private.update_updated_at_column
-- Fix: Add SET search_path to make it immutable
-- ============================================
CREATE OR REPLACE FUNCTION app_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = app_private;

-- ============================================
-- WARNING 2: public.update_uodated_at_column
-- Note: "uodated" is a TYPO - this is a leftover
-- function that should be dropped entirely.
-- If it doesn't exist, the DROP will silently succeed.
-- ============================================
DROP FUNCTION IF EXISTS public.update_uodated_at_column();

-- ============================================
-- BONUS: Also fix the 4 project-schema functions
-- that don't have search_path set (these may show
-- up as warnings later)
-- ============================================
-- If you see warnings for save_dashboard_config or
-- delete_dashboard_config, run these too:

-- CREATE OR REPLACE FUNCTION save_dashboard_config(
--   p_user_id text, p_tab_id text, p_tab_name text,
--   p_tiles text, p_tab_order integer, p_is_active boolean
-- ) RETURNS void AS $$
-- BEGIN
--   INSERT INTO dashboard_configs (user_id, tab_id, tab_name, tiles, tab_order, is_active, updated_at)
--   VALUES (p_user_id, p_tab_id, p_tab_name, p_tiles::jsonb, p_tab_order, p_is_active, NOW())
--   ON CONFLICT (user_id, tab_id) DO UPDATE SET
--     tab_name = EXCLUDED.tab_name,
--     tiles = EXCLUDED.tiles,
--     tab_order = EXCLUDED.tab_order,
--     is_active = EXCLUDED.is_active,
--     updated_at = NOW();
-- END;
-- $$ LANGUAGE plpgsql
-- SET search_path = public;

-- ============================================
-- VERIFICATION: After running, go back to
-- Security Advisor and confirm 0 warnings.
-- ============================================
