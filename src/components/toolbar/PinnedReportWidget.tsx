import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Pencil, X, BarChart3, PieChart, LineChart, Activity, Hash, Table as TableIcon, CircleDotDashed, Radar, ScatterChart, Circle, Grid3x3, Filter as FilterIcon, GanttChart as GanttIcon, AreaChart, BarChartHorizontal, Layers } from 'lucide-react';
import { BarChart, DonutChart, GanttChart, LineGraph, PieGraph, WaveChart } from '@/components/charts/ReportCharts';
import { runReportAggregation, type AggregatedPoint } from '@/lib/reportAggregation';

// ═══════════════════════════════════════════════════════════════════════
// PINNED REPORT WIDGET
// Reads a saved report row, runs the same aggregation as the builder
// preview, renders the saved chart type, auto-refreshes on a configurable
// interval, and supports resize (via parent style) + remove + edit.
// ═══════════════════════════════════════════════════════════════════════

export interface SavedReportConfig {
  id: string;
  name: string;
  source_app_id: string | null;
  metric_mode: 'count' | 'sum' | 'calc';
  count_field: string | null;
  breakdown_field: string | null;
  calc_field_a: string | null;
  calc_field_b: string | null;
  calc_op: 'add' | 'subtract' | 'multiply' | 'divide' | null;
  chart_type: string;
  pinned_dashboard: string | null;
  filters?: any[];
  refresh_interval?: number;
  widget_size?: { width: number; height: number } | null;
  organization_id?: string;
}

interface Props {
  report: SavedReportConfig;
  orgId: string;
  sourceAppName?: string;
  onRemove?: (reportId: string) => void;
  onEdit?: (report: SavedReportConfig) => void;
  onResize?: (reportId: string, size: { width: number; height: number }) => void;
}

const CHART_ICON: Record<string, React.FC<any>> = {
  bar: BarChart3, horizontal_bar: BarChartHorizontal, stacked_bar: Layers,
  line: LineChart, area: AreaChart,
  pie: PieChart, donut: CircleDotDashed,
  scatter: ScatterChart, bubble: Circle, radar: Radar,
  heatmap: Grid3x3, funnel: FilterIcon, gantt: GanttIcon,
  wave: Activity, kpi: Hash, table: TableIcon,
};

const REFRESH_OPTIONS = [
  { v: 0, l: 'Off' }, { v: 15, l: '15s' }, { v: 30, l: '30s' },
  { v: 60, l: '1m' }, { v: 300, l: '5m' }, { v: 900, l: '15m' },
];

const PinnedReportWidget: React.FC<Props> = ({ report, orgId, sourceAppName, onRemove, onEdit, onResize }) => {
  const [data, setData] = useState<AggregatedPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [interval, setIntervalVal] = useState<number>(report.refresh_interval ?? 60);
  const [showIntervalMenu, setShowIntervalMenu] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number }>(
    () => report.widget_size || { width: 520, height: 360 }
  );

  const resizeStateRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !report.source_app_id) return;
    setLoading(true);
    setError(null);
    try {
      const out = await runReportAggregation({
        orgId,
        sourceAppId: report.source_app_id,
        metricMode: report.metric_mode,
        countField: report.count_field,
        breakdownField: report.breakdown_field,
        calcFieldA: report.calc_field_a,
        calcFieldB: report.calc_field_b,
        calcOp: report.calc_op,
        filters: report.filters || [],
      });
      setData(out);
      setLastRefreshed(new Date());
    } catch (e: any) {
      console.error('[PinnedReportWidget] load error:', e);
      setError(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [orgId, report]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh timer
  useEffect(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (interval > 0) {
      timerRef.current = window.setInterval(() => { load(); }, interval * 1000);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [interval, load]);

  // Resize handle (bottom-right corner)
  const onResizeDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStateRef.current = { startX: e.clientX, startY: e.clientY, startW: size.width, startH: size.height };
    const onMove = (ev: MouseEvent) => {
      const s = resizeStateRef.current; if (!s) return;
      const newW = Math.max(280, s.startW + (ev.clientX - s.startX));
      const newH = Math.max(220, s.startH + (ev.clientY - s.startY));
      setSize({ width: newW, height: newH });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (resizeStateRef.current && onResize) {
        onResize(report.id, size);
      }
      resizeStateRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Persist size on size change (debounced via blur of drag)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (onResize) onResize(report.id, size);
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  const chartW = Math.max(260, size.width - 40);
  const chartH = Math.max(160, size.height - 100);

  const Icon = CHART_ICON[report.chart_type] || BarChart3;

  const body = useMemo(() => {
    if (loading && data.length === 0) {
      return <div className="flex items-center justify-center h-full text-xs text-purple-300/60 font-mono animate-pulse">Loading…</div>;
    }
    if (error) {
      return <div className="flex items-center justify-center h-full text-xs text-red-400 font-mono px-4 text-center">{error}</div>;
    }
    if (data.length === 0) {
      return <div className="flex flex-col items-center justify-center h-full text-xs text-slate-500 font-mono gap-2">
        <Icon size={28} className="text-slate-700" />
        <span>No data matches this report</span>
      </div>;
    }
    const cp = { data, width: chartW, height: chartH, animate: false };
    switch (report.chart_type) {
      case 'donut': return <DonutChart {...cp} />;
      case 'pie': return <PieGraph {...cp} />;
      case 'line':
      case 'area': return <LineGraph {...cp} showArea={report.chart_type === 'area'} />;
      case 'gantt':
        return <GanttChart width={chartW} height={chartH}
          tasks={data.slice(0, 6).map((d, i) => ({
            id: String(i), name: d.label, start: i * 10,
            duration: Math.max(5, d.value / 2),
            progress: Math.min(100, d.value),
          }))} />;
      case 'wave':
        return <WaveChart data={data.map(d => d.value)} width={chartW} height={chartH} />;
      case 'kpi': {
        const total = data.reduce((s, d) => s + d.value, 0);
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-5xl font-mono font-bold text-purple-300">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-wider">{report.name}</span>
          </div>
        );
      }
      case 'table':
        return (
          <div className="h-full w-full overflow-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-1.5 px-2">Label</th>
                  <th className="text-right py-1.5 px-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i} className="border-b border-slate-800/60">
                    <td className="py-1 px-2 text-slate-300 truncate max-w-[200px]">{d.label}</td>
                    <td className="py-1 px-2 text-right text-purple-300">{d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return <BarChart {...cp} />;
    }
  }, [loading, error, data, chartW, chartH, report.chart_type, report.name, Icon]);

  return (
    <div
      className="relative flex flex-col bg-slate-900/90 border border-purple-500/30 rounded-xl overflow-hidden shadow-[0_0_18px_rgba(168,85,247,0.08)]"
      style={{ width: size.width, height: size.height, minWidth: 280, minHeight: 220 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-fuchsia-950/40 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
          <Icon size={12} className="text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-semibold text-slate-100 truncate">{report.name}</div>
          <div className="text-[9px] font-mono text-slate-500 truncate uppercase tracking-wider">
            {report.metric_mode} · {report.chart_type}{sourceAppName ? ` · ${sourceAppName}` : ''}
            {lastRefreshed && <span className="text-slate-600"> · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowIntervalMenu(v => !v)}
            className="p-1 text-slate-500 hover:text-purple-300 hover:bg-white/5 rounded transition-all"
            title={`Auto-refresh: ${REFRESH_OPTIONS.find(r => r.v === interval)?.l || 'custom'}`}
          >
            <span className="text-[9px] font-mono tabular-nums">
              {REFRESH_OPTIONS.find(r => r.v === interval)?.l || `${interval}s`}
            </span>
          </button>
          {showIntervalMenu && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setShowIntervalMenu(false)} />
              <div className="absolute top-full right-0 mt-1 bg-slate-950 border border-slate-700 rounded-lg shadow-xl z-[9999] overflow-hidden min-w-[90px]">
                {REFRESH_OPTIONS.map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => { setIntervalVal(opt.v); setShowIntervalMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[10px] font-mono transition-all ${interval === opt.v ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="p-1 text-slate-500 hover:text-purple-300 hover:bg-white/5 rounded transition-all disabled:opacity-50"
          title="Refresh now"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(report)}
            className="p-1 text-slate-500 hover:text-cyan-300 hover:bg-white/5 rounded transition-all"
            title="Edit report"
          >
            <Pencil size={12} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(report.id)}
            className="p-1 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded transition-all"
            title="Remove from dashboard"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Chart body */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-hidden min-h-0">
        {body}
      </div>

      {/* Resize handle (SE corner) */}
      <div
        onMouseDown={onResizeDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-40 hover:opacity-100 transition-opacity"
        title="Drag to resize"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" className="text-purple-400">
          <path d="M14 2 L2 14 M14 6 L6 14 M14 10 L10 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default PinnedReportWidget;
