import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConfig';

// Initialize with default (public) schema to prevent Edge Function/RPC lookup errors
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };