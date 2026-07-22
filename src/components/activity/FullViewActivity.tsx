import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchGlobalActivities } from '@/lib/activityLogger';
import ActivityHeatmap from './ActivityHeatmap';
import { FeatureBarChart, WorkspaceDistribution, SessionStats, HourlyActivityChart } from './ActivityCharts';

// ═══════════════ ICONS ═══════════════
const CloseIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

const DownloadIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);

const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);

// ═══════════════ TYPES ═══════════════
type DateRange = 'today' | 'week' | 'month' | 'all';
type TabId = 'overview' | 'security' | 'rawlog';

interface FullViewActivityProps {
  isOpen: boolean;
  onClose: () => void;
}

// ═══════════════ LOGIN HISTORY ITEM ═══════════════
const LoginHistoryItem: React.FC<{ activity: any }> = ({ activity }) => {
  const meta = activity.metadata || {};
  const ip = meta.ip_address || meta.ip || 'Unknown';
  const location = meta.location || meta.city || 'Unknown';
  const device = meta.user_agent ? (meta.user_agent.includes('Mobile') ? 'Mobile' : 'Desktop') : 'Unknown';
  const time = activity.created_at ? new Date(activity.created_at).toLocaleString() : 'Unknown';

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-900/30 border border-gray-800/50 rounded-lg hover:border-cyan-500/20 transition-all">
      <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-white truncate">{activity.user_name || 'Unknown'}</span>
          <span className="text-xs font-mono text-gray-500">{activity.action || 'logged in'}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            {ip}
          </span>
          <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {location}
          </span>
          <span className="text-[10px] font-mono text-gray-600">{device}</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-gray-600 flex-shrink-0">{time}</span>
    </div>
  );
};

// ═══════════════ SECURITY EVENT ITEM ═══════════════
const SecurityEventItem: React.FC<{ activity: any }> = ({ activity }) => {
  const meta = activity.metadata || {};
  const severity = meta.severity || 'info';
  const severityColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
    low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
    info: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', dot: 'bg-gray-400' },
  };
  const sc = severityColors[severity] || severityColors.info;
  const time = activity.created_at ? new Date(activity.created_at).toLocaleString() : '';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${sc.bg} ${sc.border}`}>
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
        <div className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} style={{ boxShadow: `0 0 6px currentColor` }} />
        <div className="w-px h-8 bg-gray-800" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-mono font-bold ${sc.text}`}>{activity.action_type || 'event'}</span>
          <span className="text-xs font-mono text-gray-400">{activity.action || activity.entity_name || ''}</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${sc.bg} ${sc.border} border ${sc.text}`}>
            {severity}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-gray-600">{activity.user_name || 'System'}</span>
          <span className="text-[10px] font-mono text-gray-700">{time}</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════ RAW LOG ENTRY ═══════════════
const RawLogEntry: React.FC<{ activity: any; index: number }> = ({ activity, index }) => {
  const time = activity.created_at ? new Date(activity.created_at).toISOString() : '';
  const actionColor = {
    created: '#88ffbb',
    updated: '#66ddff',
    deleted: '#ff6666',
    viewed: '#888888',
  }[activity.action_type as string] || '#aaaaaa';

  return (
    <div className="font-mono text-[11px] leading-5 hover:bg-cyan-500/5 px-3 py-0.5 group">
      <span className="text-gray-700 select-none">{String(index + 1).padStart(4, ' ')} </span>
      <span className="text-gray-600">[{time}]</span>
      {' '}
      <span style={{ color: actionColor }}>{activity.action_type || 'unknown'}</span>
      {' '}
      <span className="text-gray-400">{activity.entity_type || ''}</span>
      {' '}
      <span className="text-cyan-400/80">"{activity.entity_name || ''}"</span>
      {' '}
      <span className="text-gray-600">by</span>
      {' '}
      <span className="text-purple-400/80">{activity.user_name || 'unknown'}</span>
      {' '}
      <span className="text-gray-700">in</span>
      {' '}
      <span className="text-orange-400/70">{activity.workspace_slug || 'global'}</span>
      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
        <span className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          {JSON.stringify(activity.metadata)}
        </span>
      )}
    </div>
  );
};

// ═══════════════ MAIN COMPONENT ═══════════════
const COLOR_PALETTE: Record<string, { color: string; rgb: string }> = {
  red: { color: '#ef4444', rgb: '239,68,68' }, ruby: { color: '#e11d48', rgb: '225,29,72' }, raspberry: { color: '#e83f6f', rgb: '232,63,111' }, coral: { color: '#fb7185', rgb: '251,113,133' }, melon: { color: '#fca5a5', rgb: '252,165,165' }, pink: { color: '#ec4899', rgb: '236,72,153' }, fuchsia: { color: '#d946ef', rgb: '217,70,239' }, magenta: { color: '#ff00ff', rgb: '255,0,255' },
  lilac: { color: '#d8b4fe', rgb: '216,180,254' }, lavender: { color: '#c084fc', rgb: '192,132,252' }, violet: { color: '#8b5cf6', rgb: '139,92,246' }, purple: { color: '#a855f7', rgb: '168,85,247' }, indigo: { color: '#6366f1', rgb: '99,102,241' }, electric: { color: '#818cf8', rgb: '129,140,248' }, blue: { color: '#3b82f6', rgb: '59,130,246' }, azure: { color: '#007fff', rgb: '0,127,255' },
  sky: { color: '#0ea5e9', rgb: '14,165,233' }, cyan: { color: '#00ffff', rgb: '0,255,255' }, teal: { color: '#14b8a6', rgb: '20,184,166' }, mint: { color: '#34d399', rgb: '52,211,153' }, emerald: { color: '#10b981', rgb: '16,185,129' }, green: { color: '#22c55e', rgb: '34,197,94' }, lime: { color: '#84cc16', rgb: '132,204,22' }, chartreuse: { color: '#bfff00', rgb: '191,255,0' },
  yellow: { color: '#eab308', rgb: '234,179,8' }, sunflower: { color: '#ffc300', rgb: '255,195,0' }, gold: { color: '#fbbf24', rgb: '251,191,36' }, amber: { color: '#f59e0b', rgb: '245,158,11' }, peach: { color: '#fb923c', rgb: '251,146,60' }, orange: { color: '#ff9900', rgb: '255,153,0' }, tangerine: { color: '#f97316', rgb: '249,115,22' },
  zinc: { color: '#a1a1aa', rgb: '161,161,170' }, slate: { color: '#94a3b8', rgb: '148,163,184' }, silver: { color: '#d1d5db', rgb: '209,213,219' }, platinum: { color: '#e5e7eb', rgb: '229,231,235' }, white: { color: '#ffffff', rgb: '255,255,255' },
};

const FullViewActivity: React.FC<FullViewActivityProps> = ({ isOpen, onClose }) => {
  const { user, isPlatformOwner, isPlatformTechManager } = useAuth();
  const currentUserId = user ? (user as any).id || (user as any).email || '' : '';

  // ⚡ Theme State
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchColors = async () => {
      if (!currentUserId) return;
      const { data } = await supabase.schema('app_private')
        .from('user_preferences')
        .select('nav_colors')
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (data?.nav_colors) setUserNavColors(data.nav_colors);
    };
    fetchColors();

    const handleColorUpdate = (e: any) => {
      if (e.detail) setUserNavColors(e.detail);
    };
    window.addEventListener('navColorsUpdated', handleColorUpdate);
    return () => window.removeEventListener('navColorsUpdated', handleColorUpdate);
  }, [currentUserId]);

  const userPrefKey = userNavColors['dashboard']; // Activity ties to the dashboard icon
  const themeColor = userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#22d3ee';
  const themeRgb = userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '34,211,238';

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawLogAutoScroll, setRawLogAutoScroll] = useState(true);
  const rawLogRef = useRef<HTMLDivElement>(null);

  // Permission check for RawLog tab
  const canViewRawLog = isPlatformOwner() || isPlatformTechManager();

  // Compute date range
  const getDateRange = useCallback((range: DateRange): { start?: string; end?: string } => {
    const now = new Date();
    switch (range) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: start.toISOString(), end: now.toISOString() };
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString(), end: now.toISOString() };
      }
      case 'month': {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString(), end: now.toISOString() };
      }
      case 'all':
      default:
        return {};
    }
  }, []);

  // Fetch activities
  const loadActivities = useCallback(async (range: DateRange) => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(range);
      const data = await fetchGlobalActivities(500, undefined, undefined, start, end, 0);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
    setLoading(false);
  }, [getDateRange]);

  // Initial load and refresh
  useEffect(() => {
    if (isOpen) {
      loadActivities(dateRange);
    }
  }, [isOpen, dateRange, loadActivities]);

  // Realtime subscription
  useEffect(() => {
    if (!isOpen) return;
    const channel = supabase
      .channel('full-activity-feed')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload: any) => {
          if (payload.new) {
            setActivities(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOpen]);

  // Auto-scroll raw log
  useEffect(() => {
    if (rawLogAutoScroll && rawLogRef.current && activeTab === 'rawlog') {
      rawLogRef.current.scrollTop = 0;
    }
  }, [activities, rawLogAutoScroll, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities(dateRange);
    setRefreshing(false);
  };

  // Filter activities by type for different sections
  const loginActivities = useMemo(() =>
    activities.filter(a => a.action_type === 'viewed' && (a.entity_type === 'workspace' || a.action?.includes('login') || a.action?.includes('viewed'))).slice(0, 20),
    [activities]
  );

  const securityActivities = useMemo(() =>
    activities.filter(a =>
      a.workspace_slug === 'security' ||
      a.action_type === 'deleted' ||
      a.metadata?.severity ||
      a.entity_type === 'workspace' && a.action_type !== 'viewed'
    ).slice(0, 50),
    [activities]
  );

  // CSV Export
  const handleExportCSV = useCallback(() => {
    if (activities.length === 0) return;
    const headers = ['timestamp', 'user_name', 'user_id', 'action_type', 'entity_type', 'entity_name', 'workspace_slug', 'action', 'metadata'];
    const rows = activities.map(act => [
      act.created_at || '',
      `"${(act.user_name || '').replace(/"/g, '""')}"`,
      act.user_id || '',
      act.action_type || '',
      act.entity_type || '',
      `"${(act.entity_name || '').replace(/"/g, '""')}"`,
      act.workspace_slug || '',
      `"${(act.action || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(act.metadata || {}).replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-export-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activities, dateRange]);

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: string; restricted?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'security', label: 'Security', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
    { id: 'rawlog', label: 'Raw Log', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', restricted: true },
  ];

  const dateRangeOptions: { id: DateRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="fixed inset-0 flex items-stretch" style={{ zIndex: 10010 }} id="full-activity-modal">
      <style>{`
        #full-activity-modal .border-cyan-500\\/20 { border-color: rgba(${themeRgb}, 0.2) !important; }
        #full-activity-modal .border-cyan-500\\/15 { border-color: rgba(${themeRgb}, 0.15) !important; }
        #full-activity-modal .border-cyan-500\\/30 { border-color: rgba(${themeRgb}, 0.3) !important; }
        #full-activity-modal .border-cyan-500\\/10 { border-color: rgba(${themeRgb}, 0.1) !important; }
        #full-activity-modal .border-cyan-400 { border-color: ${themeColor} !important; }
        #full-activity-modal .bg-cyan-500\\/10 { background-color: rgba(${themeRgb}, 0.1) !important; }
        #full-activity-modal .bg-cyan-500\\/20 { background-color: rgba(${themeRgb}, 0.2) !important; }
        #full-activity-modal .bg-cyan-500\\/5 { background-color: rgba(${themeRgb}, 0.05) !important; }
        #full-activity-modal .hover\\:bg-cyan-500\\/10:hover { background-color: rgba(${themeRgb}, 0.1) !important; }
        #full-activity-modal .hover\\:bg-cyan-500\\/5:hover { background-color: rgba(${themeRgb}, 0.05) !important; }
        #full-activity-modal .hover\\:border-cyan-500\\/20:hover { border-color: rgba(${themeRgb}, 0.2) !important; }
        #full-activity-modal .hover\\:border-cyan-500\\/30:hover { border-color: rgba(${themeRgb}, 0.3) !important; }
        #full-activity-modal .hover\\:text-cyan-400:hover { color: ${themeColor} !important; }
        #full-activity-modal .text-cyan-400 { color: ${themeColor} !important; }
        #full-activity-modal .text-cyan-500 { color: ${themeColor} !important; }
        #full-activity-modal .text-cyan-400\\/80 { color: rgba(${themeRgb}, 0.8) !important; }
        #full-activity-modal .fill-cyan-400 { fill: ${themeColor} !important; }
        #full-activity-modal .stroke-cyan-400 { stroke: ${themeColor} !important; }
        #full-activity-modal .from-cyan-950\\/20 { --tw-gradient-from: rgba(${themeRgb}, 0.2) var(--tw-gradient-from-position) !important; }
        #full-activity-modal .to-cyan-950\\/20 { --tw-gradient-to: rgba(${themeRgb}, 0.2) var(--tw-gradient-to-position) !important; }
        #full-activity-modal .from-cyan-500\\/20 { --tw-gradient-from: rgba(${themeRgb}, 0.2) var(--tw-gradient-from-position) !important; }
        #full-activity-modal .to-blue-500\\/20 { --tw-gradient-to: rgba(${themeRgb}, 0.2) var(--tw-gradient-to-position) !important; }
        #full-activity-modal .via-cyan-950\\/5 { --tw-gradient-via: rgba(${themeRgb}, 0.05) var(--tw-gradient-via-position) !important; }
        #full-activity-modal .shadow-\\[0_0_60px_rgba\\(0\\,255\\,255\\,0\\.1\\)\\] { box-shadow: 0 0 60px rgba(${themeRgb}, 0.1) !important; }
        #full-activity-modal .shadow-\\[0_0_8px_rgba\\(0\\,255\\,255\\,0\\.15\\)\\] { box-shadow: 0 0 8px rgba(${themeRgb}, 0.15) !important; }
      `}</style>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      {/* Main Panel */}
      <div className="relative w-full max-w-6xl mx-auto my-4 bg-black border rounded-2xl overflow-hidden flex flex-col"
           style={{ borderColor: `rgba(${themeRgb}, 0.2)`, boxShadow: `0 0 60px rgba(${themeRgb}, 0.1)` }}>
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r via-black"
             style={{ borderColor: `rgba(${themeRgb}, 0.15)`, '--tw-gradient-from': `rgba(${themeRgb}, 0.2)`, '--tw-gradient-to': `rgba(${themeRgb}, 0.2)` } as any}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white font-mono">Activity Dashboard</h2>
                <p className="text-xs text-gray-500 font-mono">
                  {activities.length} activities loaded
                  {dateRange !== 'all' && ` \u2022 ${dateRange === 'today' ? 'today' : dateRange === 'week' ? 'last 7 days' : 'last 30 days'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Date range filter */}
              <div className="flex items-center gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-0.5">
                {dateRangeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDateRange(opt.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                      dateRange === opt.id
                        ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.15)]'
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                disabled={activities.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-all disabled:opacity-30"
                title="Export to CSV"
              >
                <DownloadIcon size={14} /> CSV
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshIcon size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>

              {/* Close */}
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <CloseIcon size={22} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pb-0">
            {tabs.map(tab => {
              if (tab.restricted && !canViewRawLog) return null;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-mono font-bold transition-all border-b-2 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400'
                      : 'text-gray-500 hover:text-gray-400 border-transparent hover:bg-gray-900/50'
                  }`}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={tab.icon} />
                  </svg>
                  {tab.label}
                  {tab.restricted && (
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/60">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto darkwave-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 font-mono text-sm">Loading activity data...</p>
              </div>
            </div>
          ) : activeTab === 'overview' ? (
            <div className="p-6 space-y-6">
              {/* Stats Cards */}
              <SessionStats activities={activities} />

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workspace Access Heatmap */}
                <div className="p-5 rounded-xl border border-gray-800/60 bg-gray-900/20">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <h3 className="text-sm font-mono font-bold text-white">Access Heatmap</h3>
                    <span className="text-[10px] font-mono text-gray-600 ml-auto">Last {dateRange === 'all' ? '16' : dateRange === 'month' ? '16' : dateRange === 'week' ? '4' : '2'} weeks</span>
                  </div>
                  <ActivityHeatmap activities={activities} weeks={dateRange === 'week' ? 4 : dateRange === 'today' ? 2 : 16} />
                </div>

                {/* Workspace Distribution */}
                <div className="p-5 rounded-xl border border-gray-800/60 bg-gray-900/20">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
                    </svg>
                    <h3 className="text-sm font-mono font-bold text-white">Workspace Distribution</h3>
                  </div>
                  <WorkspaceDistribution activities={activities} />
                </div>

                {/* Feature Usage */}
                <div className="p-5 rounded-xl border border-gray-800/60 bg-gray-900/20">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <h3 className="text-sm font-mono font-bold text-white">Feature Usage</h3>
                  </div>
                  <FeatureBarChart activities={activities} />
                </div>

                {/* Hourly Activity */}
                <div className="p-5 rounded-xl border border-gray-800/60 bg-gray-900/20">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <h3 className="text-sm font-mono font-bold text-white">Activity by Hour</h3>
                    <span className="text-[10px] font-mono text-gray-600 ml-auto">24h distribution</span>
                  </div>
                  <HourlyActivityChart activities={activities} />
                </div>
              </div>

              {/* Recent Login History */}
              <div className="p-5 rounded-xl border border-gray-800/60 bg-gray-900/20">
                <div className="flex items-center gap-2 mb-4">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <h3 className="text-sm font-mono font-bold text-white">Recent Activity</h3>
                  <span className="text-[10px] font-mono text-gray-600 ml-auto">{loginActivities.length} entries</span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto darkwave-scrollbar">
                  {loginActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 font-mono text-xs">No login activity recorded</div>
                  ) : (
                    loginActivities.map((act, i) => <LoginHistoryItem key={act.id || i} activity={act} />)
                  )}
                </div>
              </div>
            </div>

          ) : activeTab === 'security' ? (
            <div className="p-6 space-y-6">
              {/* Security Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Security Events', value: securityActivities.length, color: '#ff9900' },
                  { label: 'Deletions', value: activities.filter(a => a.action_type === 'deleted').length, color: '#ef4444' },
                  { label: 'Admin Actions', value: activities.filter(a => a.workspace_slug === 'admin').length, color: '#cc88ff' },
                  { label: 'Security WS', value: activities.filter(a => a.workspace_slug === 'security').length, color: '#ff9900' },
                ].map(stat => (
                  <div key={stat.label} className="p-4 rounded-xl border" style={{ background: `${stat.color}08`, borderColor: `${stat.color}25` }}>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">{stat.label}</div>
                    <div className="text-2xl font-mono font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Security Timeline */}
              <div className="p-5 rounded-xl border border-gray-800/60 bg-gray-900/20">
                <div className="flex items-center gap-2 mb-4">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <h3 className="text-sm font-mono font-bold text-white">Security Events Timeline</h3>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto darkwave-scrollbar">
                  {securityActivities.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 font-mono text-xs">
                      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-gray-700">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      No security events in this time range
                    </div>
                  ) : (
                    securityActivities.map((act, i) => <SecurityEventItem key={act.id || i} activity={act} />)
                  )}
                </div>
              </div>
            </div>

          ) : activeTab === 'rawlog' && canViewRawLog ? (
            <div className="flex flex-col h-full">
              {/* Raw Log Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-950/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" style={{ animation: 'quantum-dot-pulse 1.5s ease-in-out infinite' }} />
                    <span className="text-[10px] font-mono text-green-400 uppercase tracking-wider">Live</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-600">{activities.length} entries</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    PlatformOwner + TechManager Only
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRawLogAutoScroll(!rawLogAutoScroll)}
                    className={`px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                      rawLogAutoScroll
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-gray-900 border-gray-700 text-gray-500'
                    }`}
                  >
                    Auto-scroll {rawLogAutoScroll ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Raw Log Content */}
              <div
                ref={rawLogRef}
                className="flex-1 overflow-y-auto bg-[#0a0a0f] font-mono text-[11px] leading-relaxed darkwave-scrollbar"
                style={{ minHeight: 0 }}
              >
                {/* Header comment */}
                <div className="px-3 py-2 text-gray-700 border-b border-gray-900">
                  {'// ═══════════════════════════════════════════════════════════'}
                  <br />
                  {'// PLATFORM ACTIVITY LOG — LIVE STREAM'}
                  <br />
                  {'// Restricted: PlatformOwnerAdmin, PlatformTechManager'}
                  <br />
                  {'// ═══════════════════════════════════════════════════════════'}
                </div>

                {activities.length === 0 ? (
                  <div className="text-center py-12 text-gray-700 font-mono text-xs">
                    Waiting for activity events...
                  </div>
                ) : (
                  activities.map((act, i) => <RawLogEntry key={act.id || i} activity={act} index={i} />)
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-cyan-500/10 bg-gradient-to-r from-black via-cyan-950/5 to-black">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-600">
              {activities.length} activities \u2022 {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 days' : dateRange === 'month' ? 'Last 30 days' : 'All time'}
              {' \u2022 '}Last updated: {new Date().toLocaleTimeString()}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
              <span className="text-[10px] font-mono text-gray-600">Realtime connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullViewActivity;
