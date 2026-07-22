-- ============================================================
-- Migration: Create workspace_settings table
-- Purpose: Store per-workspace accent color and settings
-- Date: 2026-02-21
-- ============================================================

-- Create the workspace_settings table
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_slug text UNIQUE NOT NULL,
  accent_color text NOT NULL DEFAULT 'cyan',
  updated_by text DEFAULT 'system',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read workspace settings
CREATE POLICY "workspace_settings_select_all" ON public.workspace_settings
  FOR SELECT USING (true);

-- Allow all authenticated users to insert workspace settings
CREATE POLICY "workspace_settings_insert_all" ON public.workspace_settings
  FOR INSERT WITH CHECK (true);

-- Allow all authenticated users to update workspace settings
CREATE POLICY "workspace_settings_update_all" ON public.workspace_settings
  FOR UPDATE USING (true);

-- Create index on workspace_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspace_settings_slug ON public.workspace_settings(workspace_slug);

-- Seed default workspace colors
INSERT INTO public.workspace_settings (workspace_slug, accent_color) VALUES
  ('admin', 'red'),
  ('accounting', 'green'),
  ('personnel', 'magenta'),
  ('main', 'cyan'),
  ('data', 'purple'),
  ('security', 'orange')
ON CONFLICT (workspace_slug) DO NOTHING;
