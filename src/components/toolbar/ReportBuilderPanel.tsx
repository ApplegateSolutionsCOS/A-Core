import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CloseIcon, ReportIcon } from '@/components/icons/Icons';
import { DonutChart, PieGraph, BarChart, LineGraph, GanttChart, WaveChart } from '@/components/charts/ReportCharts';
import * as LucideIcons from 'lucide-react';
import { runReportAggregation, type FilterRow, type FilterOp } from '@/lib/reportAggregation';

// ═══════════════════════════════════════════════════════════════════════
// REPORT BUILDER PANEL
// Pulls Mini Apps from DB, lets user count/sum/calculate a field,
// optionally broken down by another field, optionally pulling related
// fields from connected Mini Apps. Renders a rich chart preview.
// ═══════════════════════════════════════════════════════════════════════

type ChartKind =
  | 'donut' | 'pie' | 'bar' | 'line' | 'gantt' | 'wave'
  | 'area' | 'scatter' | 'radar' | 'stacked_bar' | 'horizontal_bar'
  | 'heatmap' | 'bubble' | 'funnel' | 'kpi' | 'table';

interface ChartOption {
  type: ChartKind;
  label: string;
  icon: keyof typeof LucideIcons;
  description: string;
  category: 'Comparison' | 'Distribution' | 'Trend' | 'Relationship' | 'Summary';
}

const CHART_OPTIONS: ChartOption[] = [
  { type: 'bar',            label: 'Bar Chart',         icon: 'BarChart3',    description: 'Compare values across categories',   category: 'Comparison' },
  { type: 'horizontal_bar', label: 'Horizontal Bar',    icon: 'BarChartHorizontal', description: 'Bars laid sideways',           category: 'Comparison' },
  { type: 'stacked_bar',    label: 'Stacked Bar',       icon: 'Layers',       description: 'Stack sub-categories in each bar',   category: 'Comparison' },
  { type: 'line',           label: 'Line Chart',        icon: 'LineChart',    description: 'Show values across an ordered axis', category: 'Trend' },
  { type: 'area',           label: 'Area Chart',        icon: 'AreaChart',    description: 'Line chart with filled area',        category: 'Trend' },
  { type: 'pie',            label: 'Pie Chart',         icon: 'PieChart',     description: 'Part-to-whole percentages',          category: 'Distribution' },
  { type: 'donut',          label: 'Donut Chart',       icon: 'CircleDotDashed', description: 'Pie chart with a center KPI',     category: 'Distribution' },
  { type: 'scatter',        label: 'Scatter Plot',      icon: 'ScatterChart', description: 'Each record is a dot',               category: 'Relationship' },
  { type: 'bubble',         label: 'Bubble Chart',      icon: 'Circle',       description: 'Scatter sized by a 3rd field',       category: 'Relationship' },
  { type: 'radar',          label: 'Radar',             icon: 'Radar',        description: 'Multi-axis comparison',              category: 'Relationship' },
  { type: 'heatmap',        label: 'Heatmap',           icon: 'Grid3x3',      description: 'Matrix of values by two fields',     category: 'Distribution' },
  { type: 'funnel',         label: 'Funnel',            icon: 'FilterIcon',   description: 'Sequential stage drop-off',          category: 'Summary' },
  { type: 'gantt',          label: 'Gantt',             icon: 'GanttChart',   description: 'Timeline of items across dates',     category: 'Trend' },
  { type: 'wave',           label: 'Wave (Live)',       icon: 'Activity',     description: 'Live streaming amplitude',           category: 'Trend' },
  { type: 'kpi',            label: 'KPI Number',        icon: 'Hash',         description: 'Single big number card',             category: 'Summary' },
  { type: 'table',          label: 'Data Table',        icon: 'Table',        description: 'Raw aggregated rows',                category: 'Summary' },
];

type MetricMode = 'count' | 'sum' | 'calc';
type CalcOp = 'add' | 'subtract' | 'multiply' | 'divide';

interface MiniAppLite {
  id: string;
  name: string;
  slug: string | null;
  icon?: string | null;
}

interface FieldLite {
  id: string;
  name: string;
  type: string;
  sourceApp: string;      // App name/id this field lives in
  sourceAppId: string;
  isConnected?: boolean;  // True if field is pulled via a connection field
}

const NUMERIC_TYPES = new Set(['number_field', 'calculation_field', 'currency_field', 'percent_field']);

interface Props {
  onClose: () => void;
  /** If provided, the builder opens pre-populated and in edit mode */
  initialReport?: Partial<SavedReport> & { id?: string };
}

interface SavedReport {
  id: string;
  name: string;
  source_app_id: string | null;
  metric_mode: MetricMode;
  count_field: string | null;
  breakdown_field: string | null;
  calc_field_a: string | null;
  calc_field_b: string | null;
  calc_op: CalcOp | null;
  chart_type: ChartKind;
  pinned_dashboard: string | null;
  created_at: string;
  filters?: FilterRow[] | null;
}

type Step = 'source' | 'metric' | 'filters' | 'chart' | 'pin';
const STEP_ORDER: Step[] = ['source', 'metric', 'filters', 'chart', 'pin'];

const ReportBuilderPanel: React.FC<Props> = ({ onClose, initialReport }) => {
  const { organization, user } = useAuth();
  const orgId = organization?.id;
  const userId = (user as any)?.id;

  const [step, setStep] = useState<Step>(initialReport ? 'metric' : 'source');


  // Step 1: source app
  const [availableApps, setAvailableApps] = useState<MiniAppLite[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [sourceAppId, setSourceAppId] = useState('');

  // My Reports (saved)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step 2: schema + connections + metric config
  const [sourceSchema, setSourceSchema] = useState<any[]>([]);
  const [connectedApps, setConnectedApps] = useState<MiniAppLite[]>([]);
  const [connectedSchemas, setConnectedSchemas] = useState<Record<string, any[]>>({});
  const [loadingSchema, setLoadingSchema] = useState(false);

  const [metricMode, setMetricMode] = useState<MetricMode>('count');
  const [countField, setCountField] = useState('');        // field to sum/count distinct values of
  const [breakdownField, setBreakdownField] = useState(''); // group by
  const [calcFieldA, setCalcFieldA] = useState('');         // "fieldId::appId"
  const [calcFieldB, setCalcFieldB] = useState('');
  const [calcOp, setCalcOp] = useState<CalcOp>('add');

  // Step 3: chart
  const [chartType, setChartType] = useState<ChartKind>('bar');
  const [reportName, setReportName] = useState('');

  // Step 4: pin
  const [pinnedDashboard, setPinnedDashboard] = useState('');

  // Preview data
  const [previewData, setPreviewData] = useState<{ label: string; value: number }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Step: filters
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const newFilterId = () => `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const addFilter = () => setFilters(prev => [
    ...prev,
    { id: newFilterId(), fieldName: '', fieldType: '', op: 'equals', value: '', value2: '', conjunction: 'AND' },
  ]);
  const removeFilter = (id: string) => setFilters(prev => prev.filter(f => f.id !== id));
  const updateFilter = (id: string, patch: Partial<FilterRow>) =>
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  // ─── Auto-populate when opened with initialReport (from dashboard edit) ───
  useEffect(() => {
    if (!initialReport) return;
    if (initialReport.id) setEditingReportId(initialReport.id);
    if (initialReport.name !== undefined) setReportName(initialReport.name || '');
    if (initialReport.source_app_id !== undefined) setSourceAppId(initialReport.source_app_id || '');
    if (initialReport.metric_mode) setMetricMode(initialReport.metric_mode);
    if (initialReport.count_field !== undefined) setCountField(initialReport.count_field || '');
    if (initialReport.breakdown_field !== undefined) setBreakdownField(initialReport.breakdown_field || '');
    if (initialReport.calc_field_a !== undefined) setCalcFieldA(initialReport.calc_field_a || '');
    if (initialReport.calc_field_b !== undefined) setCalcFieldB(initialReport.calc_field_b || '');
    if (initialReport.calc_op) setCalcOp(initialReport.calc_op as CalcOp);
    if (initialReport.chart_type) setChartType(initialReport.chart_type as ChartKind);
    if (initialReport.pinned_dashboard !== undefined) setPinnedDashboard(initialReport.pinned_dashboard || '');
    if (Array.isArray(initialReport.filters)) setFilters(initialReport.filters as FilterRow[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ─── Load saved reports for current org/user ───
  const refreshReports = async () => {
    if (!orgId) return;
    setLoadingReports(true);
    try {
      let q = supabase.schema('app_private').from('reports').select('*').order('created_at', { ascending: false }).limit(50);
      if (orgId) q = q.eq('organization_id', orgId);
      const { data, error } = await q;
      if (error) throw error;
      setSavedReports((data || []) as any);
    } catch (e) {
      console.error('[ReportBuilder] Error loading saved reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { refreshReports(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const openSavedReport = (r: SavedReport) => {
    setEditingReportId(r.id);
    setReportName(r.name || '');
    setSourceAppId(r.source_app_id || '');
    setMetricMode(r.metric_mode || 'count');
    setCountField(r.count_field || '');
    setBreakdownField(r.breakdown_field || '');
    setCalcFieldA(r.calc_field_a || '');
    setCalcFieldB(r.calc_field_b || '');
    setCalcOp((r.calc_op as CalcOp) || 'add');
    setChartType((r.chart_type as ChartKind) || 'bar');
    setPinnedDashboard(r.pinned_dashboard || '');
    setStep('metric');
  };

  const deleteSavedReport = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      const { error } = await supabase.schema('app_private').from('reports').delete().eq('id', id);
      if (error) throw error;
      setSavedReports(prev => prev.filter(r => r.id !== id));
      if (editingReportId === id) setEditingReportId(null);
    } catch (e: any) {
      console.error('[ReportBuilder] Delete error:', e);
      alert('Could not delete report: ' + (e.message || 'Unknown error'));
    }
  };



  // ─── STEP 1: Load all Mini Apps for the org ───
  useEffect(() => {
    if (!orgId) return;
    let cancel = false;
    (async () => {
      setLoadingApps(true);
      try {
        const { data, error } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('id, name, slug, icon, organization_id, is_preset')
          .or(`organization_id.eq.${orgId},is_preset.eq.true`)
          .order('name', { ascending: true });
        if (error) throw error;
        if (!cancel && data) {
          setAvailableApps(data.map((a: any) => ({ id: a.id, name: a.name, slug: a.slug, icon: a.icon })));
        }
      } catch (e) {
        console.error('[ReportBuilder] Error loading apps:', e);
      } finally {
        if (!cancel) setLoadingApps(false);
      }
    })();
    return () => { cancel = true; };
  }, [orgId]);

  // ─── STEP 2: Load schema for selected app + find connected apps ───
  useEffect(() => {
    if (!sourceAppId) {
      setSourceSchema([]); setConnectedApps([]); setConnectedSchemas({});
      return;
    }
    let cancel = false;
    (async () => {
      setLoadingSchema(true);
      try {
        const { data, error } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('id, name, schema_definition')
          .eq('id', sourceAppId)
          .single();
        if (error) throw error;
        const schemaDef = typeof data.schema_definition === 'string' ? JSON.parse(data.schema_definition) : data.schema_definition;
        const fields = Array.isArray(schemaDef?.fields) ? schemaDef.fields : [];
        if (cancel) return;
        setSourceSchema(fields);

        // Find connection fields and gather linked app ids/names
        const linked: string[] = [];
        fields.forEach((f: any) => {
          if (f.type === 'connection_field' || f.type === 'connection') {
            const ids = f.settings?.connectedMiniAppIds || f.settings?.connectedApps || f.settings?.connectedMiniApps || [];
            const arr = Array.isArray(ids) ? ids : [ids];
            arr.forEach((x: any) => {
              if (!x) return;
              const v = typeof x === 'object' ? (x.id || x.name || x.value) : x;
              if (v) linked.push(String(v).toLowerCase().trim());
            });
          }
        });

        if (linked.length > 0) {
          // Resolve apps via name/slug/id
          const { data: allApps } = await supabase.schema('app_private')
            .from('mini_apps')
            .select('id, name, slug, schema_definition')
            .or(`organization_id.eq.${orgId},is_preset.eq.true`);
          if (cancel) return;
          const matched = (allApps || []).filter((a: any) =>
            linked.includes((a.name || '').toLowerCase()) ||
            linked.includes((a.slug || '').toLowerCase()) ||
            linked.includes(String(a.id).toLowerCase())
          );
          setConnectedApps(matched.map((m: any) => ({ id: m.id, name: m.name, slug: m.slug })));
          const schemas: Record<string, any[]> = {};
          matched.forEach((m: any) => {
            try {
              const sd = typeof m.schema_definition === 'string' ? JSON.parse(m.schema_definition) : m.schema_definition;
              schemas[m.id] = Array.isArray(sd?.fields) ? sd.fields : [];
            } catch { schemas[m.id] = []; }
          });
          setConnectedSchemas(schemas);
        } else {
          setConnectedApps([]); setConnectedSchemas({});
        }
      } catch (e) {
        console.error('[ReportBuilder] Error loading schema:', e);
      } finally {
        if (!cancel) setLoadingSchema(false);
      }
    })();
    return () => { cancel = true; };
  }, [sourceAppId, orgId]);

  // Reset metric selections when the user changes the source app — but
  // skip this on the very first mount so an edit/initialReport flow keeps
  // its pre-populated values.
  const firstSourceChangeRef = React.useRef(true);
  useEffect(() => {
    if (firstSourceChangeRef.current) {
      firstSourceChangeRef.current = false;
      return;
    }
    setCountField(''); setBreakdownField(''); setCalcFieldA(''); setCalcFieldB(''); setMetricMode('count');
    setFilters([]);
  }, [sourceAppId]);


  // All fields (source + connected), with category label
  const allFields: FieldLite[] = useMemo(() => {
    const out: FieldLite[] = [];
    const srcApp = availableApps.find(a => a.id === sourceAppId);
    sourceSchema.filter(f => f.name && f.type !== 'split_separator' && f.type !== 'tabs' && f.type !== 'submenu')
      .forEach(f => out.push({
        id: f.name, name: f.name, type: f.type,
        sourceApp: srcApp?.name || 'Source', sourceAppId: sourceAppId,
      }));
    connectedApps.forEach(ca => {
      (connectedSchemas[ca.id] || []).filter(f => f.name && f.type !== 'split_separator' && f.type !== 'tabs' && f.type !== 'submenu')
        .forEach(f => out.push({
          id: f.name, name: f.name, type: f.type,
          sourceApp: ca.name, sourceAppId: ca.id, isConnected: true,
        }));
    });
    return out;
  }, [sourceSchema, connectedApps, connectedSchemas, availableApps, sourceAppId]);

  const numericFields = useMemo(() => allFields.filter(f => NUMERIC_TYPES.has(f.type)), [allFields]);
  const groupableFields = useMemo(() => allFields.filter(f => f.sourceAppId === sourceAppId && !NUMERIC_TYPES.has(f.type)), [allFields, sourceAppId]);

  // ─── PREVIEW: run shared aggregator (filters + count/sum/calc) ───
  useEffect(() => {
    if (step !== 'chart' && step !== 'pin' && step !== 'filters') return;
    if (!sourceAppId || !orgId) return;
    let cancel = false;
    (async () => {
      setPreviewLoading(true); setPreviewError(null);
      try {
        const out = await runReportAggregation({
          orgId,
          sourceAppId,
          metricMode,
          countField,
          breakdownField,
          calcFieldA,
          calcFieldB,
          calcOp,
          filters,
        });
        if (!cancel) setPreviewData(out);
      } catch (e: any) {
        if (!cancel) setPreviewError(e?.message || 'Preview failed');
      } finally {
        if (!cancel) setPreviewLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [step, sourceAppId, orgId, metricMode, countField, breakdownField, calcFieldA, calcFieldB, calcOp, filters]);


  // ─── Validation for step gating ───
  const canAdvanceFromSource = !!sourceAppId;
  const canAdvanceFromMetric =
    (metricMode === 'count') ||
    (metricMode === 'sum' && !!countField) ||
    (metricMode === 'calc' && !!calcFieldA && !!calcFieldB);

  const filteredApps = availableApps.filter(a => a.name.toLowerCase().includes(appSearch.toLowerCase()));

  const handleCreate = async () => {
    if (!orgId) {
      setSaveError('No organization selected');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const payload: any = {
      organization_id: orgId,
      user_id: userId || null,
      name: reportName || 'Untitled Report',
      source_app_id: sourceAppId || null,
      metric_mode: metricMode,
      count_field: countField || null,
      breakdown_field: breakdownField || null,
      calc_field_a: calcFieldA || null,
      calc_field_b: calcFieldB || null,
      calc_op: metricMode === 'calc' ? calcOp : null,
      chart_type: chartType,
      pinned_dashboard: pinnedDashboard || null,
      filters: filters || [],
      refresh_interval: initialReport?.refresh_interval ?? 60,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingReportId) {
        const { error } = await supabase.schema('app_private').from('reports').update(payload).eq('id', editingReportId);
        if (error) throw error;
      } else {
        const { error } = await supabase.schema('app_private').from('reports').insert(payload);
        if (error) throw error;
      }
      await refreshReports();
      onClose();
    } catch (e: any) {
      console.error('[ReportBuilder] Save error:', e);
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };



  const renderPreviewChart = () => {
    if (previewLoading) return <div className="text-purple-300/60 text-xs font-mono animate-pulse py-8">Loading preview…</div>;
    if (previewError) return <div className="text-red-400 text-xs font-mono py-8">{previewError}</div>;
    if (previewData.length === 0) return <div className="text-slate-500 text-xs font-mono py-8">No data to display yet</div>;

    const cp = { data: previewData, width: 260, height: 160, animate: true };
    switch (chartType) {
      case 'donut': return <DonutChart {...cp} />;
      case 'pie': return <PieGraph {...cp} />;
      case 'bar':
      case 'horizontal_bar':
      case 'stacked_bar':
        return <BarChart {...cp} />;
      case 'line':
      case 'area':
        return <LineGraph {...cp} showArea={chartType === 'area'} />;
      case 'gantt':
        return <GanttChart tasks={previewData.slice(0, 5).map((d, i) => ({ id: String(i), name: d.label, start: i * 10, duration: Math.max(5, d.value / 2), progress: Math.min(100, d.value) }))} width={260} height={120} />;
      case 'wave':
        return <WaveChart data={previewData.map(d => d.value)} width={260} height={120} />;
      case 'kpi': {
        const total = previewData.reduce((s, d) => s + d.value, 0);
        return (
          <div className="flex flex-col items-center justify-center py-6">
            <span className="text-5xl font-mono font-bold text-purple-300">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 font-mono mt-2 uppercase tracking-wider">{reportName || 'Total'}</span>
          </div>
        );
      }
      case 'table':
        return (
          <div className="w-full max-w-[260px]">
            <table className="w-full text-xs font-mono">
              <thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left py-1">Label</th><th className="text-right py-1">Value</th></tr></thead>
              <tbody>
                {previewData.slice(0, 6).map((d, i) => (
                  <tr key={i} className="border-b border-slate-800/60"><td className="py-1 text-slate-300 truncate max-w-[140px]">{d.label}</td><td className="py-1 text-right text-purple-300">{d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'scatter':
      case 'bubble':
      case 'radar':
      case 'heatmap':
      case 'funnel':
        // Reuse bar chart as a visual stand-in for advanced chart types
        return (
          <div className="flex flex-col items-center gap-2">
            <BarChart {...cp} />
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{chartType} (advanced rendering)</span>
          </div>
        );
      default:
        return <BarChart {...cp} />;
    }
  };

  const chartByCategory = useMemo(() => {
    const grouped: Record<string, ChartOption[]> = {};
    CHART_OPTIONS.forEach(c => {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category].push(c);
    });
    return grouped;
  }, []);

  const dashboards = [
    { id: 'home', label: 'Home Dashboard' },
    { id: 'ws_main', label: 'Main Workspace' },
    { id: 'ws_admin', label: 'Admin Workspace' },
    { id: 'ws_data', label: 'Data Workspace' },
    { id: 'ws_security', label: 'Security Workspace' },
  ];

  const subtitle =
    step === 'source' ? 'Step 1 · Select a MiniApp as the data source'
    : step === 'metric' ? 'Step 2 · Configure the metric to report on'
    : step === 'filters' ? 'Step 3 · Filter which records are counted'
    : step === 'chart' ? 'Step 4 · Choose a chart type & name your report'
    : 'Step 5 · Pin to a dashboard';


  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-[0_0_40px_rgba(204,136,255,0.25)] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/60 bg-gradient-to-r from-purple-950/30 via-slate-900 to-fuchsia-950/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center">
              <ReportIcon size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-mono">Create Report</h2>
              <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><CloseIcon size={22} /></button>
        </div>

        {/* STEPPER */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center gap-1 border-b border-slate-800/50">
          {STEP_ORDER.map((s, i) => {
            const isDone = STEP_ORDER.indexOf(step) > i;
            const isActive = step === s;
            const label = s === 'source' ? 'Source' : s === 'metric' ? 'Metric' : s === 'filters' ? 'Filters' : s === 'chart' ? 'Chart' : 'Pin';
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${isActive ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : isDone ? 'text-purple-300/70' : 'text-slate-600'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${isActive ? 'bg-purple-500 text-white' : isDone ? 'bg-purple-500/40 text-purple-200' : 'bg-slate-800 text-slate-500'}`}>{i + 1}</span>
                  {label}
                  {s === 'filters' && filters.length > 0 && <span className="ml-1 text-[9px] text-purple-300">·{filters.length}</span>}
                </div>
                {i < STEP_ORDER.length - 1 && <div className={`flex-1 h-px ${isDone ? 'bg-purple-500/40' : 'bg-slate-800'}`} />}
              </React.Fragment>
            );
          })}
        </div>


        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 darkwave-scrollbar">
          {/* STEP 1: SOURCE */}
          {step === 'source' && (
            <div className="space-y-4">
              {/* MY REPORTS (saved) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-purple-300/70 flex items-center gap-1.5">
                    <LucideIcons.Bookmark size={11} /> My Reports
                    {savedReports.length > 0 && <span className="text-slate-600">· {savedReports.length}</span>}
                  </label>
                  <button type="button" onClick={refreshReports} className="text-[10px] font-mono text-slate-500 hover:text-purple-300 flex items-center gap-1" title="Refresh">
                    <LucideIcons.RefreshCw size={10} /> Refresh
                  </button>
                </div>
                {loadingReports ? (
                  <div className="text-[10px] text-slate-500 font-mono py-2">Loading reports…</div>
                ) : savedReports.length === 0 ? (
                  <div className="text-[10px] font-mono text-slate-600 bg-slate-800/40 border border-dashed border-slate-700 rounded-lg px-3 py-2">
                    No saved reports yet. Build one below and it will appear here.
                  </div>
                ) : (
                  <div className="max-h-[22vh] overflow-y-auto darkwave-scrollbar space-y-1.5 pr-1">
                    {savedReports.map(r => {
                      const app = availableApps.find(a => a.id === r.source_app_id);
                      const chartOpt = CHART_OPTIONS.find(c => c.type === r.chart_type);
                      const Ic = chartOpt ? (LucideIcons as any)[chartOpt.icon] || LucideIcons.BarChart3 : LucideIcons.BarChart3;
                      return (
                        <div key={r.id} className="group flex items-center gap-2 p-2 bg-slate-800/60 border border-slate-700 hover:border-purple-500/40 rounded-lg transition-all">
                          <div className="w-7 h-7 rounded bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                            <Ic size={12} className="text-purple-300" />
                          </div>
                          <button type="button" onClick={() => openSavedReport(r)} className="flex-1 min-w-0 text-left">
                            <div className="text-xs font-mono text-slate-200 truncate">{r.name}</div>
                            <div className="text-[9px] font-mono text-slate-500 truncate uppercase tracking-wider">
                              {r.metric_mode} · {chartOpt?.label || r.chart_type}{app ? ` · ${app.name}` : ''}
                            </div>
                          </button>
                          <button type="button" onClick={() => openSavedReport(r)} title="Open / Edit" className="p-1 text-slate-500 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            <LucideIcons.Pencil size={12} />
                          </button>
                          <button type="button" onClick={() => deleteSavedReport(r.id)} title="Delete" className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <LucideIcons.Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-800" />

              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                {editingReportId ? 'Change Source MiniApp (editing saved report)' : 'Search MiniApps'}
              </label>
              <div className="relative">
                <LucideIcons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={appSearch} onChange={e => setAppSearch(e.target.value)} placeholder="Type to filter apps..." className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50" />
              </div>
              {loadingApps ? (
                <div className="py-8 text-center text-slate-500 font-mono text-xs">Loading mini apps…</div>
              ) : filteredApps.length === 0 ? (
                <div className="py-8 text-center text-slate-600 font-mono text-xs border border-dashed border-slate-700 rounded-lg">No mini apps found for this organization.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto darkwave-scrollbar">
                  {filteredApps.map(app => {
                    const Icon = (app.icon && (LucideIcons as any)[app.icon]) ? (LucideIcons as any)[app.icon] : LucideIcons.AppWindow;
                    const isSel = sourceAppId === app.id;
                    return (
                      <button key={app.id} type="button" onClick={() => setSourceAppId(app.id)} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSel ? 'bg-purple-500/20 border-purple-500/60 shadow-[0_0_14px_rgba(204,136,255,0.2)]' : 'bg-slate-800/70 border-slate-700 hover:border-slate-600'}`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-purple-500/25 border border-purple-500/50' : 'bg-slate-900 border border-slate-700'}`}>
                          <Icon size={16} className={isSel ? 'text-purple-300' : 'text-slate-400'} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-sm font-mono font-medium truncate ${isSel ? 'text-purple-200' : 'text-slate-200'}`}>{app.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 truncate">{app.slug || app.id.slice(0, 8)}</span>
                        </div>
                        {isSel && <LucideIcons.Check size={14} className="text-purple-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {/* STEP 2: METRIC */}
          {step === 'metric' && (
            <div className="space-y-5">
              {loadingSchema ? (
                <div className="py-8 text-center text-slate-500 font-mono text-xs animate-pulse">Loading field schema…</div>
              ) : (
                <>
                  {/* Metric Mode */}
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 block">Metric Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'count', label: 'Count Records', icon: 'Hash', desc: 'Count matching records' },
                        { id: 'sum',   label: 'Sum Field',     icon: 'Sigma', desc: 'Sum values of one field' },
                        { id: 'calc',  label: 'Calculate',     icon: 'Calculator', desc: 'Math between 2 fields' },
                      ] as const).map(mode => {
                        const Ic = (LucideIcons as any)[mode.icon];
                        const isSel = metricMode === mode.id;
                        return (
                          <button key={mode.id} type="button" onClick={() => setMetricMode(mode.id)} className={`p-3 rounded-lg border text-center transition-all ${isSel ? 'bg-purple-500/20 border-purple-500/60 text-purple-200' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'}`}>
                            <Ic size={18} className={`mx-auto mb-1 ${isSel ? 'text-purple-300' : 'text-slate-400'}`} />
                            <div className="text-[11px] font-mono font-bold">{mode.label}</div>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">{mode.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Count/Sum: pick a field */}
                  {(metricMode === 'count' || metricMode === 'sum') && (
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 block">
                        {metricMode === 'count' ? 'Field to Count (optional — blank = count all records)' : 'Field to Sum'}
                      </label>
                      <select value={countField} onChange={e => setCountField(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50">
                        <option value="">{metricMode === 'count' ? 'Count all records' : 'Select a numeric field…'}</option>
                        {(metricMode === 'sum' ? numericFields.filter(f => f.sourceAppId === sourceAppId) : allFields.filter(f => f.sourceAppId === sourceAppId)).map(f => (
                          <option key={`${f.id}-${f.sourceAppId}`} value={f.name}>{f.name} ({f.type.replace('_field', '')})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Calc mode: two fields + operator */}
                  {metricMode === 'calc' && (
                    <div className="space-y-3 p-3 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-lg">
                      <p className="text-[10px] font-mono text-fuchsia-300/80 uppercase tracking-wider">Calculate between fields</p>
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                        <select value={calcFieldA} onChange={e => setCalcFieldA(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-fuchsia-500/60">
                          <option value="">Field A…</option>
                          <optgroup label={`Source: ${availableApps.find(a => a.id === sourceAppId)?.name || ''}`}>
                            {numericFields.filter(f => f.sourceAppId === sourceAppId).map(f => (
                              <option key={`A-${f.id}`} value={`${f.name}::${f.sourceAppId}`}>{f.name}</option>
                            ))}
                          </optgroup>
                          {connectedApps.map(ca => (
                            <optgroup key={ca.id} label={`Connected: ${ca.name}`}>
                              {numericFields.filter(f => f.sourceAppId === ca.id).map(f => (
                                <option key={`A-${ca.id}-${f.id}`} value={`${f.name}::${ca.id}`}>{f.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <select value={calcOp} onChange={e => setCalcOp(e.target.value as CalcOp)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm font-mono focus:outline-none focus:border-fuchsia-500/60">
                          <option value="add">+</option>
                          <option value="subtract">−</option>
                          <option value="multiply">×</option>
                          <option value="divide">÷</option>
                        </select>
                        <select value={calcFieldB} onChange={e => setCalcFieldB(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-fuchsia-500/60">
                          <option value="">Field B…</option>
                          <optgroup label={`Source: ${availableApps.find(a => a.id === sourceAppId)?.name || ''}`}>
                            {numericFields.filter(f => f.sourceAppId === sourceAppId).map(f => (
                              <option key={`B-${f.id}`} value={`${f.name}::${f.sourceAppId}`}>{f.name}</option>
                            ))}
                          </optgroup>
                          {connectedApps.map(ca => (
                            <optgroup key={ca.id} label={`Connected: ${ca.name}`}>
                              {numericFields.filter(f => f.sourceAppId === ca.id).map(f => (
                                <option key={`B-${ca.id}-${f.id}`} value={`${f.name}::${ca.id}`}>{f.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {connectedApps.length > 0 && (
                        <p className="text-[10px] font-mono text-slate-500">
                          <LucideIcons.Link2 size={10} className="inline mr-1 text-fuchsia-400" />
                          {connectedApps.length} connected app{connectedApps.length > 1 ? 's' : ''} available ({connectedApps.map(c => c.name).join(', ')})
                        </p>
                      )}
                      {connectedApps.length === 0 && (
                        <p className="text-[10px] font-mono text-slate-600">Add a connection building block to this app to pull fields from other MiniApps.</p>
                      )}
                    </div>
                  )}

                  {/* Breakdown (group by) */}
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 block flex items-center gap-2">
                      Break Down By <span className="text-slate-600 normal-case">(optional)</span>
                    </label>
                    <select value={breakdownField} onChange={e => setBreakdownField(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50">
                      <option value="">No breakdown — single total</option>
                      {groupableFields.map(f => (
                        <option key={`grp-${f.id}`} value={f.name}>{f.name} ({f.type.replace('_field', '')})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: FILTERS */}
          {step === 'filters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300 font-mono font-semibold">Only count records that match</p>
                  <p className="text-[10px] text-slate-500 font-mono">Leave empty to include every record in the source app.</p>
                </div>
                <button type="button" onClick={addFilter} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25 font-mono text-[11px]">
                  <LucideIcons.Plus size={12} /> Add Filter
                </button>
              </div>

              {filters.length === 0 ? (
                <div className="py-6 px-4 border border-dashed border-slate-700 rounded-lg text-center">
                  <LucideIcons.Filter size={20} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-[11px] font-mono text-slate-500">No filters yet · aggregating every record</p>
                  <p className="text-[9px] font-mono text-slate-600 mt-1">Common: status = Active · number &gt; 100 · date in last 30 days</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filters.map((f, i) => {
                    const srcFields = allFields.filter(af => af.sourceAppId === sourceAppId);
                    const currentField = srcFields.find(af => af.name === f.fieldName);
                    const fType = currentField?.type || f.fieldType || 'text_field';
                    const isNumeric = NUMERIC_TYPES.has(fType);
                    const isDate = fType === 'date_field' || fType === 'datetime_field';
                    const needsValue = f.op !== 'is_empty' && f.op !== 'is_not_empty';
                    const needsTwoValues = f.op === 'between';
                    return (
                      <div key={f.id} className="p-2.5 bg-slate-800/60 border border-slate-700 rounded-lg space-y-2">
                        {i > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-slate-700" />
                            <div className="inline-flex rounded overflow-hidden border border-slate-600 text-[9px] font-mono">
                              {(['AND', 'OR'] as const).map(c => (
                                <button key={c} type="button"
                                  onClick={() => updateFilter(f.id, { conjunction: c })}
                                  className={`px-2 py-0.5 ${f.conjunction === c ? 'bg-purple-500/30 text-purple-200' : 'text-slate-400 hover:bg-slate-700'}`}>
                                  {c}
                                </button>
                              ))}
                            </div>
                            <div className="flex-1 h-px bg-slate-700" />
                          </div>
                        )}
                        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 items-center">
                          <select value={f.fieldName} onChange={e => {
                            const sel = srcFields.find(af => af.name === e.target.value);
                            updateFilter(f.id, { fieldName: e.target.value, fieldType: sel?.type || '' });
                          }} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500/50 min-w-0">
                            <option value="">Field…</option>
                            {srcFields.map(af => (
                              <option key={af.name} value={af.name}>{af.name} ({af.type.replace('_field','')})</option>
                            ))}
                          </select>
                          <select value={f.op} onChange={e => updateFilter(f.id, { op: e.target.value as FilterOp })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500/50">
                            <option value="equals">=</option>
                            <option value="not_equals">≠</option>
                            {!isDate && <option value="contains">contains</option>}
                            {!isDate && <option value="not_contains">not contains</option>}
                            {(isNumeric || isDate) && <option value="gt">&gt;</option>}
                            {(isNumeric || isDate) && <option value="gte">≥</option>}
                            {(isNumeric || isDate) && <option value="lt">&lt;</option>}
                            {(isNumeric || isDate) && <option value="lte">≤</option>}
                            {(isNumeric || isDate) && <option value="between">between</option>}
                            {isDate && <option value="in_last_days">in last N days</option>}
                            {isDate && <option value="not_in_last_days">not in last N days</option>}
                            <option value="is_empty">is empty</option>
                            <option value="is_not_empty">is not empty</option>
                          </select>
                          {needsValue ? (
                            isDate && f.op !== 'in_last_days' && f.op !== 'not_in_last_days' ? (
                              <input type="date" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500/50 min-w-0" />
                            ) : (
                              <input
                                type={isNumeric || f.op === 'in_last_days' || f.op === 'not_in_last_days' ? 'number' : 'text'}
                                value={f.value}
                                onChange={e => updateFilter(f.id, { value: e.target.value })}
                                placeholder={f.op === 'in_last_days' ? '30' : 'value'}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500/50 min-w-0"
                              />
                            )
                          ) : <span />}
                          <button type="button" onClick={() => removeFilter(f.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded">
                            <LucideIcons.Trash2 size={13} />
                          </button>
                        </div>
                        {needsTwoValues && (
                          <div className="grid grid-cols-[auto_1fr] gap-2 items-center pl-1">
                            <span className="text-[10px] font-mono text-slate-500">and</span>
                            {isDate ? (
                              <input type="date" value={f.value2 || ''} onChange={e => updateFilter(f.id, { value2: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500/50" />
                            ) : (
                              <input type="number" value={f.value2 || ''} onChange={e => updateFilter(f.id, { value2: e.target.value })}
                                placeholder="upper bound"
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500/50" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Live filtered preview */}
              <div className="p-3 bg-black/40 rounded-lg border border-purple-500/20">
                <p className="text-[10px] font-mono text-purple-300/70 uppercase tracking-wider mb-1.5">
                  Filtered Preview · {previewLoading ? '…' : previewData.length} buckets ·
                  {' '}{previewLoading ? '—' : previewData.reduce((s, d) => s + d.value, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} total
                </p>
                {previewError && <p className="text-[10px] text-red-400 font-mono">{previewError}</p>}
                {!previewError && previewData.length > 0 && (
                  <div className="space-y-0.5 max-h-28 overflow-y-auto">
                    {previewData.slice(0, 6).map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400 truncate">{d.label}</span>
                        <span className="text-purple-300">{d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: CHART */}
          {step === 'chart' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 block">Report Name</label>
                <input type="text" value={reportName} onChange={e => setReportName(e.target.value)} placeholder="e.g. Sales by Region" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50" />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 block">Chart Type · {CHART_OPTIONS.length} options</label>
                <div className="space-y-3 max-h-[42vh] overflow-y-auto darkwave-scrollbar pr-1">
                  {Object.entries(chartByCategory).map(([cat, opts]) => (
                    <div key={cat}>
                      <p className="text-[9px] font-mono text-purple-300/70 uppercase tracking-wider mb-1.5">{cat}</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {opts.map(opt => {
                          const Ic = (LucideIcons as any)[opt.icon] || LucideIcons.BarChart3;
                          const isSel = chartType === opt.type;
                          return (
                            <button key={opt.type} type="button" onClick={() => setChartType(opt.type)} className={`p-2.5 rounded-lg border text-center transition-all ${isSel ? 'bg-purple-500/20 border-purple-500/60 shadow-[0_0_10px_rgba(204,136,255,0.2)]' : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`} title={opt.description}>
                              <Ic size={20} className={`mx-auto mb-1 ${isSel ? 'text-purple-300' : 'text-slate-400'}`} />
                              <span className={`block text-[10px] font-mono ${isSel ? 'text-purple-200' : 'text-slate-300'}`}>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className="p-4 bg-black/50 rounded-lg border border-purple-500/25">
                <p className="text-[10px] font-mono text-purple-300/70 uppercase tracking-wider mb-2">
                  Live Preview{filters.length > 0 && <span className="text-slate-500 normal-case"> · {filters.length} filter{filters.length > 1 ? 's' : ''} applied</span>}
                </p>
                <div className="flex justify-center">{renderPreviewChart()}</div>
              </div>
            </div>
          )}

          {/* STEP 5: PIN */}
          {step === 'pin' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-mono mb-3">Choose where to pin this report widget:</p>
              {dashboards.map(d => {
                const isSel = pinnedDashboard === d.id;
                return (
                  <button key={d.id} type="button" onClick={() => setPinnedDashboard(d.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSel ? 'bg-purple-500/20 border-purple-500/60' : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`}>
                    <LucideIcons.LayoutDashboard size={16} className={isSel ? 'text-purple-300' : 'text-slate-400'} />
                    <span className={`font-mono text-sm ${isSel ? 'text-purple-200 font-bold' : 'text-slate-200'}`}>{d.label}</span>
                    {isSel && <LucideIcons.Check size={14} className="text-purple-400 ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 flex flex-col gap-1 border-t border-slate-700/60 bg-slate-950/50">
          {saveError && (
            <div className="px-4 pt-2 -mb-1">
              <p className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1 flex items-center gap-1">
                <LucideIcons.AlertTriangle size={10} /> {saveError}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between p-4">
            <button
              type="button"
              onClick={() => {
                const idx = STEP_ORDER.indexOf(step);
                if (idx <= 0) onClose();
                else setStep(STEP_ORDER[idx - 1]);
              }}
              disabled={saving}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm font-mono disabled:opacity-40"
            >
              {step === 'source' ? 'Cancel' : '← Back'}
            </button>
            <div className="flex items-center gap-2">
              {step !== 'source' && (
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                  {editingReportId ? 'Editing · ' : ''}{availableApps.find(a => a.id === sourceAppId)?.name || ''}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (step === 'pin') { handleCreate(); return; }
                  const idx = STEP_ORDER.indexOf(step);
                  if (step === 'source' && !canAdvanceFromSource) return;
                  if (step === 'metric' && !canAdvanceFromMetric) return;
                  if (idx >= 0 && idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
                }}
                disabled={
                  saving ||
                  (step === 'source' && !canAdvanceFromSource) ||
                  (step === 'metric' && !canAdvanceFromMetric) ||
                  (step === 'pin' && !pinnedDashboard)
                }
                className={`px-6 py-2 rounded-lg font-mono text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${step === 'pin' ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-400 hover:to-fuchsia-400 shadow-[0_0_15px_rgba(204,136,255,0.3)]' : 'bg-purple-500 text-white hover:bg-purple-400'}`}
              >
                {saving ? 'Saving…' : step === 'pin' ? (editingReportId ? 'Save Changes' : 'Create Report') : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

};


export default ReportBuilderPanel;
