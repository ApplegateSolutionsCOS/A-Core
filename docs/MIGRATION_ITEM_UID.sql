-- ============================================
-- MIGRATION: Add Item UID System
-- ============================================
-- Run this in Supabase SQL Editor
-- Adds unique alphanumeric Item IDs, QR codes, and barcode support
-- SAFE TO RE-RUN: Uses IF NOT EXISTS / IF NOT EXISTS patterns
-- ============================================

-- 1. Add item_uid column to mini_app_records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' 
        AND table_name = 'mini_app_records' 
        AND column_name = 'item_uid'
    ) THEN
        ALTER TABLE app_private.mini_app_records ADD COLUMN item_uid TEXT;
        CREATE UNIQUE INDEX idx_mini_app_records_uid ON app_private.mini_app_records(item_uid);
        RAISE NOTICE 'Added item_uid column to mini_app_records';
    ELSE
        RAISE NOTICE 'item_uid column already exists on mini_app_records';
    END IF;
END $$;

-- 2. Add item_id_settings JSONB column to mini_apps
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

-- 3. Create item_sequences table for auto-incrementing per mini_app
CREATE TABLE IF NOT EXISTS app_private.item_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mini_app_id UUID NOT NULL REFERENCES app_private.mini_apps(id) ON DELETE CASCADE,
    current_value BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mini_app_id)
);

-- Enable RLS
ALTER TABLE app_private.item_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (idempotent with DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'app_private' 
        AND tablename = 'item_sequences' 
        AND policyname = 'service_role_only'
    ) THEN
        CREATE POLICY "service_role_only" ON app_private.item_sequences FOR ALL
          USING ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role')
          WITH CHECK ((SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')) = 'service_role');
        RAISE NOTICE 'Created RLS policy on item_sequences';
    ELSE
        RAISE NOTICE 'RLS policy already exists on item_sequences';
    END IF;
END $$;

-- Grant access to service_role
GRANT ALL ON app_private.item_sequences TO service_role;

-- Add updated_at trigger (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_schema = 'app_private' 
        AND event_object_table = 'item_sequences' 
        AND trigger_name = 'update_item_sequences_updated_at'
    ) THEN
        CREATE TRIGGER update_item_sequences_updated_at 
          BEFORE UPDATE ON app_private.item_sequences 
          FOR EACH ROW EXECUTE FUNCTION app_private.update_updated_at_column();
        RAISE NOTICE 'Created updated_at trigger on item_sequences';
    ELSE
        RAISE NOTICE 'updated_at trigger already exists on item_sequences';
    END IF;
END $$;

-- 4. Create function to generate next item UID
CREATE OR REPLACE FUNCTION app_private.generate_item_uid(
    p_mini_app_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private
AS $$
DECLARE
    v_settings JSONB;
    v_prefix TEXT;
    v_min_digits INTEGER;
    v_next_val BIGINT;
    v_uid TEXT;
BEGIN
    -- Get the item_id_settings from the mini_app
    SELECT COALESCE(item_id_settings, '{}')
    INTO v_settings
    FROM app_private.mini_apps
    WHERE id = p_mini_app_id;

    -- Extract settings with defaults
    v_prefix := COALESCE(v_settings->>'prefix', '');
    v_min_digits := COALESCE((v_settings->>'minDigits')::INTEGER, 6);

    -- Ensure minimum digits is at least 1
    IF v_min_digits < 1 THEN
        v_min_digits := 6;
    END IF;

    -- Get and increment the sequence
    INSERT INTO app_private.item_sequences (mini_app_id, current_value)
    VALUES (p_mini_app_id, 1)
    ON CONFLICT (mini_app_id) DO UPDATE
    SET current_value = app_private.item_sequences.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO v_next_val;

    -- Build the UID: PREFIX + zero-padded number
    IF v_prefix != '' THEN
        v_uid := v_prefix || '-' || LPAD(v_next_val::TEXT, v_min_digits, '0');
    ELSE
        v_uid := LPAD(v_next_val::TEXT, v_min_digits, '0');
    END IF;

    RETURN v_uid;
END;
$$;

-- 5. Create public RPC function for generating item UIDs
CREATE OR REPLACE FUNCTION public.generate_next_item_uid(p_mini_app_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, public
AS $$
BEGIN
    RETURN app_private.generate_item_uid(p_mini_app_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_next_item_uid(UUID) TO anon, authenticated, service_role;

-- 6. Update existing mini_apps with default item_id_settings
UPDATE app_private.mini_apps
SET item_id_settings = jsonb_build_object(
    'prefix', '',
    'minDigits', 6,
    'showItemId', true,
    'showQrCode', false,
    'showBarcode', false,
    'barcodeSymbology', 'code128'
)
WHERE item_id_settings IS NULL OR item_id_settings = '{}';

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    v_has_item_uid BOOLEAN;
    v_has_settings BOOLEAN;
    v_has_sequences BOOLEAN;
    v_has_function BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' AND table_name = 'mini_app_records' AND column_name = 'item_uid'
    ) INTO v_has_item_uid;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app_private' AND table_name = 'mini_apps' AND column_name = 'item_id_settings'
    ) INTO v_has_settings;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'app_private' AND table_name = 'item_sequences'
    ) INTO v_has_sequences;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'generate_next_item_uid'
    ) INTO v_has_function;

    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════╗';
    RAISE NOTICE '║       ITEM UID MIGRATION VERIFICATION            ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║  mini_app_records.item_uid:  %', CASE WHEN v_has_item_uid THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  mini_apps.item_id_settings: %', CASE WHEN v_has_settings THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  item_sequences table:       %', CASE WHEN v_has_sequences THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '║  generate_next_item_uid():   %', CASE WHEN v_has_function THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';

    IF v_has_item_uid AND v_has_settings AND v_has_sequences AND v_has_function THEN
        RAISE NOTICE '║  STATUS: MIGRATION SUCCESSFUL                    ║';
    ELSE
        RAISE NOTICE '║  STATUS: MIGRATION INCOMPLETE - check above       ║';
    END IF;

    RAISE NOTICE '╚══════════════════════════════════════════════════╝';
END $$;
