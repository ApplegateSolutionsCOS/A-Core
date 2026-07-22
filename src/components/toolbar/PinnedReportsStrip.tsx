import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookmarkCheck } from 'lucide-react';
import PinnedReportWidget, { type SavedReportConfig } from './PinnedReportWidget';
import ReportBuilderPanel from './ReportBuilderPanel';

// ═══════════════════════════════════════════════════════════════════════
// PINNED REPORTS STRIP
// For a given dashboard id, load all reports whose pinned_dashboard
// matches and render them as live widgets. Clicking edit reopens the
// Report Builder pre-populated with that report.
// ═══════════════════════════════════════════════════════════════════════

interface Props {
  dashboardId: string;
  /** Optional label shown above the strip (e.g. tab name) */
  label?: string;
}

const PinnedReportsStrip: React.FC<Props> = ({ dashboardId, label }) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const [reports, setReports] = useState<SavedReportConfig[]>([]);
  const [appNames, setAppNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<SavedReportConfig | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !dashboardId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.schema('app_private')
        .from('reports')
        .select('*')
        .eq('organization_id', orgId)
        .eq('pinned_dashboard', dashboardId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as SavedReportConfig[];
      setReports(rows);

      // Fetch app names for header labels
      const appIds = Array.from(new Set(rows.map(r => r.source_app_id).filter(Boolean))) as string[];
      if (appIds.length > 0) {
        const { data: apps } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('id, name')
          .in('id', appIds);
        const map: Record<string, string> = {};
        (apps || []).forEach((a: any) => { map[a.id] = a.name; });
        setAppNames(map);
      }
    } catch (e) {
      console.error('[PinnedReportsStrip] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [orgId, dashboardId]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (reportId: string) => {
    if (!confirm('Remove this report from the dashboard?')) return;
    try {
      // Unpin (rather than delete) so the user keeps it in "My Reports"
      const { error } = await supabase.schema('app_private')
        .from('reports')
        .update({ pinned_dashboard: null })
        .eq('id', reportId);
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (e: any) {
      console.error('[PinnedReportsStrip] remove error:', e);
      alert('Could not unpin report: ' + (e.message || 'Unknown'));
    }
  };

  const handleResize = useCallback(async (reportId: string, size: { width: number; height: number }) => {
    try {
      await supabase.schema('app_private')
        .from('reports')
        .update({ widget_size: size })
        .eq('id', reportId);
      // Update local state so memoized widgets stay consistent
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, widget_size: size } : r));
    } catch (e) {
      console.warn('[PinnedReportsStrip] resize persist failed:', e);
    }
  }, []);

  const handleEdit = (r: SavedReportConfig) => {
    setEditing(r);
    setShowBuilder(true);
  };

  if (!dashboardId) return null;
  if (!loading && reports.length === 0 && !showBuilder) return null;

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <BookmarkCheck size={14} className="text-purple-400" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-purple-300/80">
            Pinned Reports{label ? ` · ${label}` : ''}
          </h3>
          <span className="text-[10px] font-mono text-slate-600">· {reports.length}</span>
          {loading && <span className="text-[10px] font-mono text-slate-500 animate-pulse">loading…</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          {reports.map(r => (
            <PinnedReportWidget
              key={r.id}
              report={r}
              orgId={orgId || ''}
              sourceAppName={r.source_app_id ? appNames[r.source_app_id] : undefined}
              onRemove={handleRemove}
              onEdit={handleEdit}
              onResize={handleResize}
            />
          ))}
        </div>
      </div>

      {showBuilder && (
        <ReportBuilderPanel
          onClose={() => { setShowBuilder(false); setEditing(null); load(); }}
          initialReport={editing || undefined}
        />
      )}
    </>
  );
};

export default PinnedReportsStrip;
