// ============================================
// ACTIVITY LOGGER
// ============================================
// Logs workspace activities to public.activity_log table.
// Used by MiniAppBuilder, MiniAppView, and WorkspaceDashboard.
// The QuantumBallTool's Activity bubble and the workspace
// dashboard's Activity Feed widget both consume this data.

import { supabase } from '@/lib/supabase';

export interface ActivityEntry {
  workspace_id?: string;
  workspace_slug: string;
  user_id: string;
  user_name: string;
  action_type: 'created' | 'updated' | 'deleted' | 'viewed';
  entity_type: 'miniapp' | 'record' | 'field' | 'workspace';
  entity_name: string;
  target?: string;   // e.g., the MiniApp name the record belongs to
  action?: string;    // human-readable action string, e.g. "created a new record in"
  metadata?: Record<string, any>;
}

// Debounce queue to batch rapid-fire events
let queue: ActivityEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY = 500; // ms

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushQueue, FLUSH_DELAY);
}

async function flushQueue() {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue = [];

  try {
    const entries = batch.map(entry => ({
      workspace_id: entry.workspace_id || null,
      workspace_slug: entry.workspace_slug,
      user_id: entry.user_id,
      user_name: entry.user_name,
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_name: entry.entity_name,
      target: entry.target || entry.entity_name,
      action: entry.action || buildActionString(entry),
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    }));

    // Try direct insert to public.activity_log
    const { error } = await supabase
      .schema('app_private')
      .from('activity_log')
      .insert(entries);

    if (error) {
      console.warn('[ActivityLogger] Direct insert failed, trying edge function:', error.message);
      // Fallback to edge function
      await supabase.functions.invoke('log-activity', {
        body: { batch: entries },
      });
    }
  } catch (err) {
    console.error('[ActivityLogger] Failed to log activity:', err);
  }
}

function buildActionString(entry: ActivityEntry): string {
  switch (entry.action_type) {
    case 'created':
      return entry.entity_type === 'record'
        ? 'created a new record in'
        : entry.entity_type === 'miniapp'
          ? 'created MiniApp'
          : `created ${entry.entity_type} in`;
    case 'updated':
      return entry.entity_type === 'record'
        ? 'updated a record in'
        : entry.entity_type === 'miniapp'
          ? 'updated MiniApp'
          : `updated ${entry.entity_type} in`;
    case 'deleted':
      return entry.entity_type === 'record'
        ? 'deleted a record from'
        : entry.entity_type === 'miniapp'
          ? 'deleted MiniApp'
          : `deleted ${entry.entity_type} from`;
    case 'viewed':
      return `viewed ${entry.entity_type}`;
    default:
      return `${entry.action_type} ${entry.entity_type}`;
  }
}

/**
 * Log a single activity entry. Entries are batched and flushed
 * after a short delay to avoid excessive DB writes.
 */
export function logActivity(entry: ActivityEntry): void {
  queue.push(entry);
  scheduleFlush();
}

/**
 * Log an activity immediately without batching.
 * Use for important events like MiniApp creation/deletion.
 */
export async function logActivityImmediate(entry: ActivityEntry): Promise<void> {
  const row = {
    workspace_id: entry.workspace_id || null,
    workspace_slug: entry.workspace_slug,
    user_id: entry.user_id,
    user_name: entry.user_name,
    action_type: entry.action_type,
    entity_type: entry.entity_type,
    entity_name: entry.entity_name,
    target: entry.target || entry.entity_name,
    action: entry.action || buildActionString(entry),
    metadata: entry.metadata || {},
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .schema('app_private')
      .from('activity_log')
      .insert(row);

    if (error) {
      console.warn('[ActivityLogger] Direct insert failed:', error.message);
      await supabase.functions.invoke('log-activity', { body: row });
    }
  } catch (err) {
    console.error('[ActivityLogger] Immediate log failed:', err);
  }
}

/**
 * Fetch recent activities for a workspace.
 */
export async function fetchActivities(
  workspaceSlug: string,
  limit = 30
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .schema('app_private')
      .from('activity_log')
      .select('*')
      .eq('workspace_slug', workspaceSlug)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[ActivityLogger] Fetch failed:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[ActivityLogger] Fetch error:', err);
    return [];
  }
}

/**
 * Fetch recent activities across all workspaces (for global feeds).
 * Optionally filter by user_id to show only the current user's activity.
 * Optionally filter by workspace_slug to show only a specific workspace.
 * Optionally filter by startDate / endDate (ISO strings) to restrict the time range.
 * Supports pagination via offset parameter (0-based).
 */
export async function fetchGlobalActivities(
  limit = 20,
  userId?: string,
  workspaceSlug?: string,
  startDate?: string,
  endDate?: string,
  offset = 0
): Promise<any[]> {
  try {
    let query = supabase
      .schema('app_private')
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (workspaceSlug) {
      query = query.eq('workspace_slug', workspaceSlug);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}
