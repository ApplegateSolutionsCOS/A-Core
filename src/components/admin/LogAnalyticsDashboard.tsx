import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  RefreshIcon,
  ActivityIcon,
  SearchIcon,
  DownloadIcon,
  ClockIcon,
} from '@/components/icons/Icons';

// ── TYPES ──
interface TimeSeriesBucket {
  time: string;
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
  CRITICAL: number;
}

interface CategoryDist {
  name: string;
  value: number;
}

interface ErrorSource {
  source: string;
  count: number;
}

interface SlowCall {
  timestamp: string;
  source: string;
  action: string;
  details: string | null;
  duration: number;
  category: string;
}

// ── COLORS ──
const LEVEL_CHART_COLORS: Record<string, string> = {
  DEBUG: '#6b7280',
  INFO: '#22d3ee',
  WARN: '#facc15',
  ERROR: '#ef4444',
  CRITICAL: '#f87171',
};

const CATEGORY_CHART_COLORS = [
  '#22d3ee', '#a855f7', '#22c55e', '#f59e0b', '#ec4899',
  '#3b82f6', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
  '#84cc16', '#e11d48', '#6366f1', '#10b981', '#f43f5e',
  '#0ea5e9', '#d946ef', '#eab308', '#64748b', '#fb923c',
];

const HEATMAP_COLORS = [
  'rgba(0,0,0,0)', 'rgba(34,211,238,0.1)', 'rgba(34,211,238,0.2)',
  'rgba(34,211,238,0.35)', 'rgba(34,211,238,0.5)', 'rgba(34,211,238,0.65)',
  'rgba(34,211,238,0.8)', 'rgba(168,85,247,0.7)', 'rgba(236,72,153,0.8)',
  'rgba(239,68,68,0.9)',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── ICONS ──
const ChartLineIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const PieChartIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const BarChartHIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="9" width="13" height="4" rx="1" /><rect x="3" y="15" width="8" height="4" rx="1" />
  </svg>
);

const GridIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const AlertTriangleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ══════════════════════════════════════════════
// CANVAS CHART COMPONENTS
// ══════════════════════════════════════════════

// ── TIME SERIES LINE CHART ──
const TimeSeriesChart: React.FC<{ data: TimeSeriesBucket[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 280 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '280px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 280;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Find max
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as const;
    let maxVal = 0;
    data.forEach(b => {
      levels.forEach(l => { if (b[l] > maxVal) maxVal = b[l]; });
    });
    if (maxVal === 0) maxVal = 1;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = '#4b5563';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxVal * (1 - i / 5))), pad.left - 8, y + 3);
    }

    // X labels
    const step = Math.max(1, Math.floor(data.length / 8));
    data.forEach((b, i) => {
      if (i % step === 0) {
        const x = pad.left + (i / (data.length - 1)) * cw;
        const d = new Date(b.time);
        const label = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        ctx.fillStyle = '#4b5563';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, h - pad.bottom + 18);
      }
    });

    // Draw lines
    levels.forEach(level => {
      const color = LEVEL_CHART_COLORS[level];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((b, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * cw;
        const y = pad.top + ch - (b[level] / maxVal) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Fill area
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = color;
      ctx.lineTo(pad.left + cw, pad.top + ch);
      ctx.lineTo(pad.left, pad.top + ch);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    });

  }, [data]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = { left: 50, right: 20 };
    const cw = rect.width - pad.left - pad.right;
    const idx = Math.round(((x - pad.left) / cw) * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      const b = data[idx];
      const d = new Date(b.time);
      const content = `${d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}\nDEBUG: ${b.DEBUG}  INFO: ${b.INFO}\nWARN: ${b.WARN}  ERROR: ${b.ERROR}  CRIT: ${b.CRITICAL}`;
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, content });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)} className="w-full cursor-crosshair" />
      {tooltip && (
        <div className="absolute z-10 px-3 py-2 bg-gray-900 border border-cyan-500/30 rounded-lg text-[10px] font-mono text-gray-300 whitespace-pre pointer-events-none shadow-lg"
          style={{ left: Math.min(tooltip.x, (containerRef.current?.clientWidth || 400) - 200), top: tooltip.y - 80 }}>
          {tooltip.content}
        </div>
      )}
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-2">
        {Object.entries(LEVEL_CHART_COLORS).map(([level, color]) => (
          <div key={level} className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
            {level}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── PIE CHART ──
const PieChart: React.FC<{ data: CategoryDist[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 240;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 100;
    const innerRadius = 55;
    const total = data.reduce((s, d) => s + d.value, 0);

    let startAngle = -Math.PI / 2;
    data.forEach((d, i) => {
      const sliceAngle = (d.value / total) * Math.PI * 2;
      const isHovered = hovered === i;
      const offset = isHovered ? 6 : 0;
      const midAngle = startAngle + sliceAngle / 2;
      const ox = Math.cos(midAngle) * offset;
      const oy = Math.sin(midAngle) * offset;

      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx + ox, cy + oy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length];
      ctx.globalAlpha = isHovered ? 1 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(total), cx, cy - 2);
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.fillText('TOTAL LOGS', cx, cy + 14);

  }, [data, hovered]);

  return (
    <div className="flex items-start gap-6">
      <canvas ref={canvasRef} className="flex-shrink-0" />
      <div className="flex-1 max-h-[240px] overflow-y-auto space-y-1 pr-2 darkwave-scrollbar">
        {data.slice(0, 15).map((d, i) => {
          const total = data.reduce((s, d) => s + d.value, 0);
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
          return (
            <div
              key={d.name}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800/50 cursor-pointer transition-colors"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length] }} />
              <span className="text-[11px] font-mono text-gray-400 flex-1 truncate">{d.name.replace(/_/g, ' ')}</span>
              <span className="text-[11px] font-mono text-white font-bold">{d.value}</span>
              <span className="text-[10px] font-mono text-gray-600">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── BAR CHART ──
const BarChart: React.FC<{ data: ErrorSource[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = Math.max(200, data.length * 32 + 40);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 10, right: 60, bottom: 10, left: 160 };
    const cw = w - pad.left - pad.right;
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const barH = 20;
    const gap = 8;

    data.forEach((d, i) => {
      const y = pad.top + i * (barH + gap);
      const barW = (d.count / maxVal) * cw;

      // Bar gradient
      const grad = ctx.createLinearGradient(pad.left, 0, pad.left + barW, 0);
      grad.addColorStop(0, 'rgba(239,68,68,0.8)');
      grad.addColorStop(1, 'rgba(239,68,68,0.3)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(pad.left, y, barW, barH, 4);
      ctx.fill();

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      const label = d.source.length > 22 ? d.source.slice(0, 22) + '...' : d.source;
      ctx.fillText(label, pad.left - 8, y + barH / 2 + 4);

      // Count
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(String(d.count), pad.left + barW + 8, y + barH / 2 + 4);
    });

  }, [data]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
};

// ── HEATMAP ──
const HeatmapChart: React.FC<{ data: number[][] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 25, right: 10, bottom: 10, left: 40 };
    const cellW = (w - pad.left - pad.right) / 24;
    const cellH = (h - pad.top - pad.bottom) / 7;

    // Find max
    let maxVal = 0;
    data.forEach(row => row.forEach(v => { if (v > maxVal) maxVal = v; }));
    if (maxVal === 0) maxVal = 1;

    // Hour labels
    for (let hr = 0; hr < 24; hr++) {
      if (hr % 3 === 0) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(hr).padStart(2, '0'), pad.left + hr * cellW + cellW / 2, pad.top - 8);
      }
    }

    // Day labels & cells
    data.forEach((row, day) => {
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(DAY_LABELS[day], pad.left - 6, pad.top + day * cellH + cellH / 2 + 3);

      row.forEach((val, hr) => {
        const x = pad.left + hr * cellW;
        const y = pad.top + day * cellH;
        const intensity = Math.min(Math.floor((val / maxVal) * 9), 9);

        ctx.fillStyle = HEATMAP_COLORS[intensity];
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cellW - 2, cellH - 2, 3);
        ctx.fill();

        if (val > 0) {
          ctx.strokeStyle = 'rgba(34,211,238,0.15)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

  }, [data]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pad = { top: 25, left: 40, right: 10, bottom: 10 };
    const cellW = (rect.width - pad.left - pad.right) / 24;
    const cellH = (220 - pad.top - pad.bottom) / 7;
    const hr = Math.floor((x - pad.left) / cellW);
    const day = Math.floor((y - pad.top) / cellH);
    if (hr >= 0 && hr < 24 && day >= 0 && day < 7) {
      const val = data[day][hr];
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, content: `${DAY_LABELS[day]} ${String(hr).padStart(2, '0')}:00 — ${val} logs` });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)} className="w-full cursor-crosshair" />
      {tooltip && (
        <div className="absolute z-10 px-3 py-1.5 bg-gray-900 border border-cyan-500/30 rounded-lg text-[10px] font-mono text-gray-300 pointer-events-none shadow-lg"
          style={{ left: Math.min(tooltip.x, (containerRef.current?.clientWidth || 300) - 160), top: tooltip.y - 35 }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════
const LogAnalyticsDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  });

  const [timeSeries, setTimeSeries] = useState<TimeSeriesBucket[]>([]);
  const [categoryDist, setCategoryDist] = useState<CategoryDist[]>([]);
  const [errorSources, setErrorSources] = useState<ErrorSource[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [slowCalls, setSlowCalls] = useState<SlowCall[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllAnalytics = useCallback(async () => {
    setIsRefreshing(true);
    const params = { start_date: timeRange.start, end_date: timeRange.end };

    try {
      const [tsRes, catRes, errRes, hmRes, slowRes] = await Promise.all([
        supabase.functions.invoke('persist-runtime-logs', { body: { action: 'analytics', analytics_type: 'time_series', ...params } }),
        supabase.functions.invoke('persist-runtime-logs', { body: { action: 'analytics', analytics_type: 'category_distribution', ...params } }),
        supabase.functions.invoke('persist-runtime-logs', { body: { action: 'analytics', analytics_type: 'top_error_sources', ...params } }),
        supabase.functions.invoke('persist-runtime-logs', { body: { action: 'analytics', analytics_type: 'activity_heatmap', ...params } }),
        supabase.functions.invoke('persist-runtime-logs', { body: { action: 'analytics', analytics_type: 'slowest_api_calls', ...params } }),
      ]);

      if (tsRes.data?.success) setTimeSeries(tsRes.data.data || []);
      if (catRes.data?.success) setCategoryDist(catRes.data.data || []);
      if (errRes.data?.success) setErrorSources(errRes.data.data || []);
      if (hmRes.data?.success) setHeatmapData(hmRes.data.data || []);
      if (slowRes.data?.success) setSlowCalls(slowRes.data.data || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    }

    setIsRefreshing(false);
    setIsLoading(false);
  }, [timeRange]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  const setQuickRange = (hours: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    setTimeRange({ start: start.toISOString(), end: end.toISOString() });
  };

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
    return ms.toFixed(0) + 'ms';
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-purple-950/20 p-5 overflow-hidden">
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-cyan-500/20 rounded-lg blur-lg animate-pulse" />
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 flex items-center justify-center">
                  <ChartLineIcon size={22} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Log Analytics Dashboard</h3>
                <p className="text-xs font-mono text-gray-400">Interactive visualizations of persisted runtime log data</p>
              </div>
            </div>
            <button
              onClick={fetchAllAnalytics}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm disabled:opacity-50"
            >
              <RefreshIcon size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Quick range buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-gray-600 uppercase">Range:</span>
            {[
              { label: '1h', hours: 1 },
              { label: '6h', hours: 6 },
              { label: '24h', hours: 24 },
              { label: '7d', hours: 168 },
              { label: '30d', hours: 720 },
            ].map(({ label, hours }) => (
              <button
                key={label}
                onClick={() => setQuickRange(hours)}
                className="px-3 py-1 text-[11px] font-mono text-gray-400 border border-gray-800 rounded-lg hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
              >
                {label}
              </button>
            ))}
            <span className="text-[10px] font-mono text-gray-600 ml-2">
              {new Date(timeRange.start).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
              {' — '}
              {new Date(timeRange.end).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
        </div>
      </div>

      {/* ── ROW 1: Time Series + Pie Chart ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Time Series Line Chart */}
        <div className="xl:col-span-3 rounded-xl border border-gray-800 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4">
            <ChartLineIcon size={16} className="text-cyan-400" />
            <h4 className="text-sm font-mono font-bold text-white">Log Volume Over Time</h4>
            <span className="text-[10px] font-mono text-gray-600 ml-auto">Grouped by level</span>
          </div>
          {timeSeries.length > 0 ? (
            <TimeSeriesChart data={timeSeries} />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-600 font-mono text-sm">No time series data available</div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="xl:col-span-2 rounded-xl border border-gray-800 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={16} className="text-purple-400" />
            <h4 className="text-sm font-mono font-bold text-white">Log Distribution</h4>
            <span className="text-[10px] font-mono text-gray-600 ml-auto">By category</span>
          </div>
          {categoryDist.length > 0 ? (
            <PieChart data={categoryDist} />
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-600 font-mono text-sm">No category data available</div>
          )}
        </div>
      </div>

      {/* ── ROW 2: Bar Chart + Heatmap ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Error Sources */}
        <div className="rounded-xl border border-gray-800 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangleIcon size={16} className="text-red-400" />
            <h4 className="text-sm font-mono font-bold text-white">Top 10 Error Sources</h4>
            <span className="text-[10px] font-mono text-gray-600 ml-auto">ERROR + CRITICAL</span>
          </div>
          {errorSources.length > 0 ? (
            <BarChart data={errorSources} />
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-600 font-mono text-sm">
              <div className="text-center">
                <AlertTriangleIcon size={24} className="text-gray-700 mx-auto mb-2" />
                <p>No errors in this time range</p>
              </div>
            </div>
          )}
        </div>

        {/* Activity Heatmap */}
        <div className="rounded-xl border border-gray-800 bg-black/60 p-4">
          <div className="flex items-center gap-2 mb-4">
            <GridIcon size={16} className="text-cyan-400" />
            <h4 className="text-sm font-mono font-bold text-white">Activity Heatmap</h4>
            <span className="text-[10px] font-mono text-gray-600 ml-auto">Hour / Day of Week (UTC)</span>
          </div>
          {heatmapData.length > 0 ? (
            <HeatmapChart data={heatmapData} />
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-600 font-mono text-sm">No heatmap data available</div>
          )}
        </div>
      </div>

      {/* ── ROW 3: Slowest API Calls Table ── */}
      <div className="rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <ClockIcon size={16} className="text-amber-400" />
          <h4 className="text-sm font-mono font-bold text-white">Slowest API Calls</h4>
          <span className="text-[10px] font-mono text-gray-600 ml-auto">Sorted by duration (descending)</span>
        </div>
        {slowCalls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="text-left p-3 text-[10px] font-mono text-amber-400 uppercase">#</th>
                  <th className="text-left p-3 text-[10px] font-mono text-amber-400 uppercase">Duration</th>
                  <th className="text-left p-3 text-[10px] font-mono text-amber-400 uppercase">Source</th>
                  <th className="text-left p-3 text-[10px] font-mono text-amber-400 uppercase">Action</th>
                  <th className="text-left p-3 text-[10px] font-mono text-amber-400 uppercase">Category</th>
                  <th className="text-left p-3 text-[10px] font-mono text-amber-400 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {slowCalls.slice(0, 25).map((call, i) => (
                  <tr key={i} className="hover:bg-gray-900/30 transition-colors">
                    <td className="p-3 text-[11px] font-mono text-gray-600">{i + 1}</td>
                    <td className="p-3">
                      <span className={`text-[12px] font-mono font-bold ${
                        call.duration >= 2000 ? 'text-red-400' :
                        call.duration >= 1000 ? 'text-orange-400' :
                        call.duration >= 500 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {formatDuration(call.duration)}
                      </span>
                      {/* Duration bar */}
                      <div className="w-24 h-1 bg-gray-800 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full ${
                            call.duration >= 2000 ? 'bg-red-500' :
                            call.duration >= 1000 ? 'bg-orange-500' :
                            call.duration >= 500 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((call.duration / (slowCalls[0]?.duration || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-[11px] font-mono text-purple-400 max-w-[200px] truncate">{call.source}</td>
                    <td className="p-3 text-[11px] font-mono text-white max-w-[250px] truncate">{call.action}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono text-gray-400">
                        {call.category?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-[10px] font-mono text-gray-500">{formatTimestamp(call.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <ClockIcon size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">No API call duration data available</p>
            <p className="text-gray-600 font-mono text-xs mt-1">Ensure DB persistence is enabled and API calls are being logged with duration</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogAnalyticsDashboard;
