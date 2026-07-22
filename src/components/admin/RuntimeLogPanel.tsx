import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { runtimeLogger, RuntimeLogEntry, LogLevel, LogCategory } from '@/lib/runtimeLogger';
import { supabase } from '@/lib/supabase';
import {
  SearchIcon,
  CloseIcon,
  ActivityIcon,
  RefreshIcon,
  DownloadIcon,
  DatabaseIcon,
  BarChartIcon,
} from '@/components/icons/Icons';
import LogAnalyticsDashboard from './LogAnalyticsDashboard';
import LogAlertRulesPanel from './LogAlertRulesPanel';

// Bell icon for alerts tab
const BellIcon2: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// Chart icon for analytics tab
const ChartLineIcon2: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

// Main tab definitions for the Runtime Log Panel
const RUNTIME_TABS = [
  { id: 'logs', label: 'Live Logs', icon: ActivityIcon, color: 'cyan' },
  { id: 'analytics', label: 'Analytics', icon: ChartLineIcon2, color: 'purple' },
  { id: 'alerts', label: 'Alert Rules', icon: BellIcon2, color: 'orange' },
] as const;

type RuntimeTab = typeof RUNTIME_TABS[number]['id'];



// Icons
const TrashIcon2: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PauseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PlayIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const FilterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const CloudIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const CalendarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UploadCloudIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const ChevronLeftIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="15 18 9 12 15 6" /></svg>
);

const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6" /></svg>
);

const LEVEL_COLORS: Record<LogLevel, { text: string; bg: string; border: string; dot: string }> = {
  DEBUG: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', dot: 'bg-gray-400' },
  INFO: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  WARN: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  ERROR: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400' },
  CRITICAL: { text: 'text-red-300', bg: 'bg-red-600/20', border: 'border-red-400/50', dot: 'bg-red-300' },
};

const CATEGORY_COLORS: Record<string, string> = {
  api_call: 'text-blue-400', api_response: 'text-blue-300', state_change: 'text-purple-400',
  navigation: 'text-green-400', user_action: 'text-fuchsia-400', click: 'text-fuchsia-300',
  form_submit: 'text-fuchsia-400', render: 'text-gray-500', effect: 'text-gray-400',
  error: 'text-red-400', console: 'text-gray-300', network: 'text-blue-400',
  auth: 'text-orange-400', database: 'text-purple-400', supabase: 'text-green-400',
  function_call: 'text-cyan-400', component_mount: 'text-teal-400', component_unmount: 'text-teal-300',
  timer: 'text-amber-400', storage: 'text-indigo-400', dom_event: 'text-pink-400',
  websocket: 'text-emerald-400', system: 'text-gray-500',
};

const ALL_CATEGORIES: LogCategory[] = [
  'api_call', 'api_response', 'state_change', 'navigation', 'user_action',
  'click', 'form_submit', 'render', 'effect', 'error', 'console', 'network',
  'auth', 'database', 'supabase', 'function_call', 'component_mount',
  'component_unmount', 'timer', 'storage', 'dom_event', 'websocket', 'system',
];

type DataSource = 'memory' | 'database';

const RuntimeLogPanel: React.FC = () => {
  // ── Main tab state ──
  const [mainTab, setMainTab] = useState<RuntimeTab>('logs');

  // ── In-memory state ──
  const [logs, setLogs] = useState<RuntimeLogEntry[]>([]);

  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [selectedCategories, setSelectedCategories] = useState<Set<LogCategory>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed' | 'raw'>('compact');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  // ── Data source toggle ──
  const [dataSource, setDataSource] = useState<DataSource>('memory');
  const [persistenceEnabled, setPersistenceEnabled] = useState(runtimeLogger.persistenceEnabled);

  // ── Database query state ──
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(0);
  const [dbPageSize] = useState(200);
  const [dbStartDate, setDbStartDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d.toISOString().slice(0, 16);
  });
  const [dbEndDate, setDbEndDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [dbLevel, setDbLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [dbCategory, setDbCategory] = useState<LogCategory | 'ALL'>('ALL' as any);
  const [dbSearch, setDbSearch] = useState('');
  const [dbStats, setDbStats] = useState<{ byLevel: Record<string, number>; byCategory: Record<string, number>; total: number } | null>(null);

  // ── Persistence status ──
  const [flushStatus, setFlushStatus] = useState({
    totalPersisted: runtimeLogger.totalPersisted,
    lastFlushTime: runtimeLogger.lastFlushTime,
    lastFlushCount: runtimeLogger.lastFlushCount,
    pendingCount: runtimeLogger.pendingCount,
  });

  // Keep ref in sync
  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Load initial logs and subscribe to updates
  useEffect(() => {
    setLogs(runtimeLogger.getLogs());

    const unsub = runtimeLogger.subscribe((entry) => {
      if (!pausedRef.current) {
        setLogs(prev => [entry, ...prev.slice(0, 4999)]);
      }
    });

    // Update flush status periodically
    const statusInterval = setInterval(() => {
      setFlushStatus({
        totalPersisted: runtimeLogger.totalPersisted,
        lastFlushTime: runtimeLogger.lastFlushTime,
        lastFlushCount: runtimeLogger.lastFlushCount,
        pendingCount: runtimeLogger.pendingCount,
      });
    }, 5000);

    return () => {
      unsub();
      clearInterval(statusInterval);
    };
  }, []);

  // Toggle persistence
  const handleTogglePersistence = useCallback(() => {
    const newState = !persistenceEnabled;
    runtimeLogger.setPersistence(newState);
    setPersistenceEnabled(newState);
  }, [persistenceEnabled]);

  // Force flush
  const handleForceFlush = useCallback(async () => {
    const result = await runtimeLogger.flushToDatabase();
    setFlushStatus({
      totalPersisted: runtimeLogger.totalPersisted,
      lastFlushTime: runtimeLogger.lastFlushTime,
      lastFlushCount: runtimeLogger.lastFlushCount,
      pendingCount: runtimeLogger.pendingCount,
    });
  }, []);

  // ── Database queries ──
  const fetchDbLogs = useCallback(async () => {
    setDbLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('persist-runtime-logs', {
        body: {
          action: 'query',
          start_date: new Date(dbStartDate).toISOString(),
          end_date: new Date(dbEndDate).toISOString(),
          level: dbLevel !== 'ALL' ? dbLevel : undefined,
          category: dbCategory !== 'ALL' ? dbCategory : undefined,
          search: dbSearch || undefined,
          limit: dbPageSize,
          offset: dbPage * dbPageSize,
          order: 'desc',
        },
      });

      if (data?.success) {
        setDbLogs(data.logs || []);
        setDbTotal(data.total || 0);
      }
    } catch (err) {
      // silently fail
    }
    setDbLoading(false);
  }, [dbStartDate, dbEndDate, dbLevel, dbCategory, dbSearch, dbPage, dbPageSize]);

  const fetchDbStats = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('persist-runtime-logs', {
        body: {
          action: 'stats',
          start_date: new Date(dbStartDate).toISOString(),
          end_date: new Date(dbEndDate).toISOString(),
        },
      });
      if (data?.success) {
        setDbStats(data.stats);
      }
    } catch {}
  }, [dbStartDate, dbEndDate]);

  // Auto-fetch when switching to database mode or changing filters
  useEffect(() => {
    if (dataSource === 'database') {
      fetchDbLogs();
      fetchDbStats();
    }
  }, [dataSource, dbPage]);

  const handleDbQuery = () => {
    setDbPage(0);
    fetchDbLogs();
    fetchDbStats();
  };

  const handlePurge = async (days: number) => {
    if (!confirm(`Purge all logs older than ${days} days? This cannot be undone.`)) return;
    try {
      await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'purge', older_than_days: days },
      });
      fetchDbLogs();
      fetchDbStats();
    } catch {}
  };

  const stats = useMemo(() => runtimeLogger.getStats(), [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (selectedLevel !== 'ALL') result = result.filter(l => l.level === selectedLevel);
    if (selectedCategories.size > 0) result = result.filter(l => selectedCategories.has(l.category));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.source.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        l.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, selectedLevel, selectedCategories, searchQuery]);

  const toggleCategory = (cat: LogCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleExport = useCallback(() => {
    const data = JSON.stringify(dataSource === 'memory' ? filteredLogs : dbLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runtime-log-${dataSource}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredLogs, dbLogs, dataSource]);

  const handleClear = () => {
    runtimeLogger.clear();
    setLogs([]);
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const formatDateFull = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  // Determine which logs to display
  const displayLogs = dataSource === 'memory' ? filteredLogs : dbLogs;
  const totalPages = dataSource === 'database' ? Math.ceil(dbTotal / dbPageSize) : 1;

  // Tab color mapping for cut-tab style
  const tabTextActive: Record<string, string> = {
    cyan: 'text-cyan-300',
    purple: 'text-purple-300',
    orange: 'text-orange-300',
  };

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CUT-TAB NAVIGATION - Same style as admin panel & mini apps */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex gap-3 pb-3 border-b border-cyan-500/20 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        {RUNTIME_TABS.map((tab) => {
          const isActive = mainTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`cut-tab cut-tab-${tab.color} relative px-8 py-3.5 text-sm font-mono whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 flex-shrink-0 min-w-fit ${
                isActive
                  ? `cut-tab-active ${tabTextActive[tab.color] || 'text-cyan-300'}`
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {isActive && <span className="cut-tab-shimmer-el" />}
              <span className="relative z-[1] flex items-center gap-2.5">
                <TabIcon size={16} className="flex-shrink-0" />
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ANALYTICS TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mainTab === 'analytics' && <LogAnalyticsDashboard />}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ALERT RULES TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mainTab === 'alerts' && <LogAlertRulesPanel />}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LIVE LOGS TAB (original content) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mainTab === 'logs' && (
      <>

    <div className="space-y-4">
      {/* Header */}
      <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-fuchsia-950/20 p-5 overflow-hidden">
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-cyan-500/20 rounded-lg blur-lg animate-pulse" />
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/50 flex items-center justify-center">
                  <ActivityIcon size={22} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Runtime Execution Log</h3>
                <p className="text-xs font-mono text-gray-400">
                  Live capture of ALL code execution, API calls, state changes, and user interactions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Persistence Toggle */}
              <button
                onClick={handleTogglePersistence}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-all ${
                  persistenceEnabled
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                <CloudIcon size={14} />
                DB Persist: {persistenceEnabled ? 'ON' : 'OFF'}
              </button>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono ${isPaused ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
                <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse shadow-[0_0_6px_rgba(0,255,0,0.8)]'}`} />
                {isPaused ? 'PAUSED' : 'LIVE'}
              </div>
            </div>
          </div>

          {/* Persistence Status Bar */}
          {persistenceEnabled && (
            <div className="flex items-center gap-4 text-[10px] font-mono mt-2 p-2 bg-green-500/5 border border-green-500/20 rounded-lg">
              <span className="text-green-400 flex items-center gap-1.5">
                <UploadCloudIcon size={12} />
                DB Persistence Active
              </span>
              <span className="text-gray-500">Persisted: <span className="text-green-400">{flushStatus.totalPersisted}</span></span>
              <span className="text-gray-500">Pending: <span className="text-yellow-400">{flushStatus.pendingCount}</span></span>
              {flushStatus.lastFlushTime && (
                <span className="text-gray-500">Last flush: <span className="text-cyan-400">{formatTimestamp(flushStatus.lastFlushTime)} ({flushStatus.lastFlushCount} logs)</span></span>
              )}
              <button
                onClick={handleForceFlush}
                className="ml-auto px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded hover:bg-green-500/20 transition-all"
              >
                Flush Now
              </button>
            </div>
          )}

          {/* Stats Bar */}
          <div className="flex items-center gap-4 text-[10px] font-mono mt-2">
            {Object.entries(stats.byLevel).map(([level, count]) => (
              <span key={level} className={`flex items-center gap-1 ${LEVEL_COLORS[level as LogLevel]?.text || 'text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_COLORS[level as LogLevel]?.dot || 'bg-gray-500'}`} />
                {level}: {count}
              </span>
            ))}
            <span className="text-gray-600 ml-auto">~{stats.logsPerSecond}/sec | {filteredLogs.length} / {logs.length} entries</span>
          </div>
        </div>
      </div>

      {/* Data Source Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setDataSource('memory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-mono transition-all ${
              dataSource === 'memory' ? 'bg-cyan-500/20 text-cyan-400 border-r border-cyan-500/30' : 'text-gray-500 hover:text-gray-300 border-r border-gray-800'
            }`}
          >
            <ActivityIcon size={14} />
            In-Memory (Live)
          </button>
          <button
            onClick={() => setDataSource('database')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-mono transition-all ${
              dataSource === 'database' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <DatabaseIcon size={14} />
            Database (Historical)
          </button>
        </div>

        {dataSource === 'memory' && (
          <>
            {/* View Mode */}
            <div className="flex items-center border border-gray-800 rounded-lg overflow-hidden ml-auto">
              {(['compact', 'detailed', 'raw'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 text-[11px] font-mono capitalize transition-all ${
                    viewMode === mode ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* IN-MEMORY MODE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {dataSource === 'memory' && (
        <>
          {/* Controls Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs... (source, action, details)"
                className="w-full bg-black border border-gray-800 rounded-lg pl-9 pr-8 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                  <CloseIcon size={14} />
                </button>
              )}
            </div>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'ALL')}
              className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Levels</option>
              {(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as LogLevel[]).map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                showFilters || selectedCategories.size > 0
                  ? 'bg-fuchsia-500/10 border border-fuchsia-500/50 text-fuchsia-400'
                  : 'bg-black border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <FilterIcon size={14} />
              Categories
              {selectedCategories.size > 0 && (
                <span className="px-1.5 py-0.5 bg-fuchsia-500/20 text-fuchsia-400 text-[10px] rounded">{selectedCategories.size}</span>
              )}
            </button>

            <button onClick={() => setIsPaused(!isPaused)} className={`p-2 rounded-lg border transition-all ${isPaused ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'}`} title={isPaused ? 'Resume' : 'Pause'}>
              {isPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
            </button>
            <button onClick={handleExport} className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all" title="Export JSON">
              <DownloadIcon size={14} />
            </button>
            <button onClick={handleClear} className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all" title="Clear Logs">
              <TrashIcon2 size={14} />
            </button>
          </div>

          {/* Category Filter Chips */}
          {showFilters && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-gray-950 border border-gray-800 rounded-lg">
              <button
                onClick={() => setSelectedCategories(new Set())}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                  selectedCategories.size === 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300 border border-gray-700'
                }`}
              >
                All
              </button>
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                    selectedCategories.has(cat)
                      ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'
                      : 'text-gray-500 hover:text-gray-300 border border-gray-700'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DATABASE MODE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {dataSource === 'database' && (
        <>
          {/* Date Range & Filters */}
          <div className="p-4 bg-gray-950 border border-purple-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon size={16} className="text-purple-400" />
              <span className="text-sm font-mono font-bold text-purple-300">Historical Query</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Start Date</label>
                <input
                  type="datetime-local"
                  value={dbStartDate}
                  onChange={(e) => setDbStartDate(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">End Date</label>
                <input
                  type="datetime-local"
                  value={dbEndDate}
                  onChange={(e) => setDbEndDate(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Level</label>
                <select
                  value={dbLevel}
                  onChange={(e) => setDbLevel(e.target.value as any)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50"
                >
                  <option value="ALL">All Levels</option>
                  {(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as LogLevel[]).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Category</label>
                <select
                  value={dbCategory}
                  onChange={(e) => setDbCategory(e.target.value as any)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50"
                >
                  <option value="ALL">All Categories</option>
                  {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={dbSearch}
                  onChange={(e) => setDbSearch(e.target.value)}
                  placeholder="Search historical logs..."
                  className="w-full bg-black border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <button
                onClick={handleDbQuery}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all font-mono text-sm"
              >
                <SearchIcon size={14} />
                Query
              </button>
              <button
                onClick={handleExport}
                className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                title="Export Results"
              >
                <DownloadIcon size={14} />
              </button>
              <div className="relative group">
                <button className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all" title="Purge Old Logs">
                  <TrashIcon2 size={14} />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-gray-950 border border-gray-800 rounded-lg p-2 hidden group-hover:block z-20 min-w-[160px]">
                  {[7, 14, 30, 90].map(d => (
                    <button key={d} onClick={() => handlePurge(d)} className="block w-full text-left px-3 py-1.5 text-[11px] font-mono text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                      Purge &gt; {d} days old
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick date range buttons */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-600 uppercase">Quick:</span>
              {[
                { label: '1h', hours: 1 },
                { label: '6h', hours: 6 },
                { label: '24h', hours: 24 },
                { label: '7d', hours: 168 },
                { label: '30d', hours: 720 },
              ].map(({ label, hours }) => (
                <button
                  key={label}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
                    setDbStartDate(start.toISOString().slice(0, 16));
                    setDbEndDate(end.toISOString().slice(0, 16));
                  }}
                  className="px-2 py-1 text-[10px] font-mono text-gray-500 border border-gray-800 rounded hover:text-purple-400 hover:border-purple-500/30 transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* DB Stats */}
          {dbStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.entries(dbStats.byLevel || {}).sort((a, b) => b[1] - a[1]).map(([level, count]) => (
                <div key={level} className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <p className={`text-[10px] font-mono ${LEVEL_COLORS[level as LogLevel]?.text || 'text-gray-400'}`}>{level}</p>
                  <p className="text-lg font-mono font-bold text-white">{count}</p>
                </div>
              ))}
              <div className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-[10px] font-mono text-purple-400">TOTAL</p>
                <p className="text-lg font-mono font-bold text-white">{dbStats.total}</p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {dbTotal > dbPageSize && (
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>Showing {dbPage * dbPageSize + 1}-{Math.min((dbPage + 1) * dbPageSize, dbTotal)} of {dbTotal}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDbPage(Math.max(0, dbPage - 1))}
                  disabled={dbPage === 0}
                  className="p-1 rounded border border-gray-800 text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <span className="px-2 text-purple-400">Page {dbPage + 1} / {totalPages}</span>
                <button
                  onClick={() => setDbPage(Math.min(totalPages - 1, dbPage + 1))}
                  disabled={dbPage >= totalPages - 1}
                  className="p-1 rounded border border-gray-800 text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LOG ENTRIES (shared between both modes) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        ref={logContainerRef}
        className="rounded-xl border border-gray-800 bg-[#0a0a0f] overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '400px' }}
      >
        {dbLoading && dataSource === 'database' && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-purple-400 font-mono text-sm">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Querying database...
            </div>
          </div>
        )}

        {/* Column Headers */}
        {viewMode !== 'raw' && !dbLoading && (
          <div className="sticky top-0 z-10 flex items-center gap-3 px-3 py-2 bg-gray-950 border-b border-gray-800 text-[10px] font-mono text-gray-600 uppercase tracking-wider">
            <span className="w-20">{dataSource === 'database' ? 'Date/Time' : 'Time'}</span>
            <span className="w-14">Level</span>
            <span className="w-24">Category</span>
            <span className="w-32">Source</span>
            <span className="flex-1">Action / Details</span>
            {viewMode === 'detailed' && <span className="w-16">Duration</span>}
          </div>
        )}

        <div className="overflow-y-auto darkwave-scrollbar" style={{ maxHeight: 'calc(100vh - 550px)', minHeight: '350px' }}>
          {!dbLoading && displayLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <ActivityIcon size={32} className="mb-3 opacity-30" />
              <p className="font-mono text-sm">
                {dataSource === 'database' ? 'No historical logs found for this query' : 'No log entries match your filters'}
              </p>
              <p className="font-mono text-xs mt-1">
                {dataSource === 'database' ? 'Try adjusting your date range or filters' : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : !dbLoading && viewMode === 'raw' ? (
            <div className="p-2 font-mono text-[11px] leading-relaxed">
              {displayLogs.map((entry: any, i: number) => {
                const level = entry.level as LogLevel;
                const lc = LEVEL_COLORS[level];
                const cc = CATEGORY_COLORS[entry.category] || 'text-gray-400';
                const entryId = entry.id || entry.log_id || `db_${i}`;
                return (
                  <div key={entryId} className="hover:bg-cyan-500/5 px-2 py-0.5 group cursor-pointer" onClick={() => setExpandedEntry(expandedEntry === entryId ? null : entryId)}>
                    <span className="text-gray-700 select-none">{String(i + 1).padStart(4, ' ')} </span>
                    <span className="text-gray-600">[{formatTimestamp(entry.timestamp)}]</span>
                    {' '}
                    <span className={`font-bold ${lc.text}`}>{level.padEnd(5)}</span>
                    {' '}
                    <span className={cc}>{entry.category}</span>
                    {' '}
                    <span className="text-purple-400/80">{entry.source}</span>
                    {' '}
                    <span className="text-white">{entry.action}</span>
                    {entry.details && <span className="text-gray-500"> — {entry.details.substring(0, 120)}</span>}
                    {entry.duration !== undefined && entry.duration !== null && <span className="text-amber-400/60"> ({entry.duration}ms)</span>}
                    {expandedEntry === entryId && entry.data && (
                      <div className="mt-1 ml-6 p-2 bg-gray-900/50 border border-gray-800 rounded text-[10px] text-green-400/70 overflow-x-auto">
                        <pre>{JSON.stringify(entry.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !dbLoading && (
            displayLogs.map((entry: any, i: number) => {
              const level = entry.level as LogLevel;
              const lc = LEVEL_COLORS[level];
              const cc = CATEGORY_COLORS[entry.category] || 'text-gray-400';
              const entryId = entry.id || entry.log_id || `db_${i}`;
              const isExpanded = expandedEntry === entryId;

              return (
                <div
                  key={entryId}
                  className={`flex items-start gap-3 px-3 py-1.5 border-b border-gray-900/50 hover:bg-gray-900/30 transition-colors cursor-pointer ${
                    level === 'ERROR' || level === 'CRITICAL' ? 'bg-red-500/5' : ''
                  }`}
                  onClick={() => setExpandedEntry(isExpanded ? null : entryId)}
                >
                  <span className="w-20 text-[10px] font-mono text-gray-600 flex-shrink-0 pt-0.5">
                    {dataSource === 'database' ? formatDateFull(entry.timestamp) : formatTimestamp(entry.timestamp)}
                  </span>
                  <span className="w-14 flex-shrink-0 pt-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${lc.text} ${lc.bg} border ${lc.border}`}>
                      {level}
                    </span>
                  </span>
                  <span className={`w-24 text-[10px] font-mono flex-shrink-0 pt-0.5 ${cc}`}>{entry.category.replace(/_/g, ' ')}</span>
                  <span className="w-32 text-[10px] font-mono text-purple-400/80 flex-shrink-0 pt-0.5 truncate">{entry.source}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-white truncate">{entry.action}</p>
                    {entry.details && <p className="text-[10px] font-mono text-gray-500 truncate">{entry.details}</p>}
                    {isExpanded && entry.data && (
                      <pre className="mt-1 p-2 bg-gray-900/50 border border-gray-800 rounded text-[10px] text-green-400/70 font-mono overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(entry.data, null, 2)}
                      </pre>
                    )}
                  </div>
                  {viewMode === 'detailed' && (
                    <span className="w-16 text-[10px] font-mono text-amber-400/60 flex-shrink-0 pt-0.5 text-right">
                      {entry.duration !== undefined && entry.duration !== null ? `${entry.duration}ms` : ''}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {dataSource === 'memory' && (
        <div className="rounded-xl border border-gray-800 bg-black/60 p-4">
          <h4 className="text-sm font-mono font-bold text-white mb-3 flex items-center gap-2">
            <FilterIcon size={14} className="text-fuchsia-400" />
            Activity Breakdown by Category
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(stats.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => {
                    const newSet = new Set<LogCategory>();
                    newSet.add(cat as LogCategory);
                    setSelectedCategories(newSet);
                  }}
                  className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-cyan-500/30 transition-all text-left group"
                >
                  <p className={`text-[10px] font-mono ${CATEGORY_COLORS[cat] || 'text-gray-400'} group-hover:text-white transition-colors`}>
                    {cat.replace(/_/g, ' ')}
                  </p>
                  <p className="text-lg font-mono font-bold text-white">{count}</p>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Database Category Breakdown */}
      {dataSource === 'database' && dbStats && Object.keys(dbStats.byCategory || {}).length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-black/60 p-4">
          <h4 className="text-sm font-mono font-bold text-white mb-3 flex items-center gap-2">
            <FilterIcon size={14} className="text-purple-400" />
            Historical Activity Breakdown
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(dbStats.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => {
                    setDbCategory(cat as any);
                    handleDbQuery();
                  }}
                  className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-purple-500/30 transition-all text-left group"
                >
                  <p className={`text-[10px] font-mono ${CATEGORY_COLORS[cat] || 'text-gray-400'} group-hover:text-white transition-colors`}>
                    {cat.replace(/_/g, ' ')}
                  </p>
                  <p className="text-lg font-mono font-bold text-white">{count}</p>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
      </>
      )}
    </div>
  );

};

export default RuntimeLogPanel;
