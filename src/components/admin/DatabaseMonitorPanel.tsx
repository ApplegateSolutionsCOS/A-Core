import React, { useState, useEffect, useCallback } from 'react';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import {
  DatabaseIcon,
  RefreshIcon,
  CheckCircleIcon,
  XCircleIcon,
  ActivityIcon,
  ServerIcon,
  ClockIcon,
  UsersIcon,
  ShieldIcon,
  SearchIcon,
} from '@/components/icons/Icons';

interface TableStat {
  name: string;
  rowCount: number;
  lastActivity: string | null;
  status: string;
}

interface HealthCheck {
  status: string;
  latency?: string;
  error?: string;
}

interface AuditEvent {
  id: string;
  email: string;
  action_type: string;
  ip_address: string;
  user_agent: string;
  metadata: any;
  created_at: string;
}

interface DbOverview {
  schema: string;
  tables: TableStat[];
  recentAuditEvents: AuditEvent[];
  summary: {
    totalTables: number;
    totalUsers: number;
    activeUsers24h: number;
    usersWithPasswords: number;
    tablesOnline: number;
  };
  timestamp: string;
}

const DatabaseMonitorPanel: React.FC = () => {
  const [overview, setOverview] = useState<DbOverview | null>(null);
  const [healthChecks, setHealthChecks] = useState<Record<string, HealthCheck> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'tables' | 'activity' | 'health'>('overview');
  const [tableData, setTableData] = useState<{ table: string; rows: any[]; totalCount: number } | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchOverview = useCallback(async () => {
    const result = await invokeEdgeFunction<DbOverview>('db-monitor', { action: 'get_overview' });
    if (result.data?.success !== false) {
      setOverview(result.data);
    }
  }, []);

  const fetchHealthCheck = useCallback(async () => {
    const result = await invokeEdgeFunction('db-monitor', { action: 'health_check' });
    if (result.data?.checks) {
      setHealthChecks(result.data.checks);
    }
  }, []);

  const fetchTableData = useCallback(async (tableName: string) => {
    setSelectedTable(tableName);
    const result = await invokeEdgeFunction('db-monitor', { action: 'get_table_data', table: tableName, limit: 50 });
    if (result.data?.rows) {
      setTableData({ table: tableName, rows: result.data.rows, totalCount: result.data.totalCount });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchOverview(), fetchHealthCheck()]);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  }, [fetchOverview, fetchHealthCheck]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await refreshAll();
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshAll, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshAll]);

  const formatTime = (ts: string | null) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login_success': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'login_failed': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'password_changed': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'password_set': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'session_expired': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Connecting to database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-2 bg-purple-500/20 rounded-xl blur-lg animate-pulse" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/50 flex items-center justify-center">
              <DatabaseIcon size={24} className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-white">Database Monitor</h3>
            <p className="text-xs font-mono text-purple-400">
              Schema: <span className="text-cyan-400">{overview?.schema || 'app_private'}</span>

              {lastRefresh && <span className="text-gray-500 ml-3">Last refresh: {lastRefresh.toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-5 rounded-full transition-all ${autoRefresh ? 'bg-green-500/30 border-green-500/50' : 'bg-gray-800 border-gray-700'} border relative`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${autoRefresh ? 'left-5 bg-green-400 shadow-[0_0_8px_rgba(0,255,0,0.5)]' : 'left-0.5 bg-gray-500'}`} />
            </div>
            <span className="text-xs font-mono text-gray-400">Auto-refresh</span>
          </label>
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm disabled:opacity-50"
          >
            <RefreshIcon size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: ServerIcon },
          { id: 'tables', label: 'Tables', icon: DatabaseIcon },
          { id: 'activity', label: 'Activity', icon: ActivityIcon },
          { id: 'health', label: 'Health', icon: ShieldIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-mono transition-all ${
              activeSubTab === tab.id
                ? 'text-cyan-400 bg-cyan-500/10 border border-b-0 border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Sub-tab */}
      {activeSubTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Tables Online', value: overview.summary.tablesOnline + '/' + overview.summary.totalTables, color: 'cyan', icon: DatabaseIcon },
              { label: 'Total Users', value: overview.summary.totalUsers, color: 'purple', icon: UsersIcon },
              { label: 'Active (24h)', value: overview.summary.activeUsers24h, color: 'green', icon: ActivityIcon },
              { label: 'With Passwords', value: overview.summary.usersWithPasswords, color: 'orange', icon: ShieldIcon },
              { label: 'Audit Events', value: overview.recentAuditEvents.length, color: 'magenta', icon: ClockIcon },
            ].map((card, i) => (
              <div key={i} className={`rounded-xl border p-4 bg-black/60 ${
                card.color === 'cyan' ? 'border-cyan-500/30' :
                card.color === 'purple' ? 'border-purple-500/30' :
                card.color === 'green' ? 'border-green-500/30' :
                card.color === 'orange' ? 'border-orange-500/30' :
                'border-fuchsia-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-mono uppercase">{card.label}</span>
                  <card.icon size={16} className={
                    card.color === 'cyan' ? 'text-cyan-400' :
                    card.color === 'purple' ? 'text-purple-400' :
                    card.color === 'green' ? 'text-green-400' :
                    card.color === 'orange' ? 'text-orange-400' :
                    'text-fuchsia-400'
                  } />
                </div>
                <p className={`text-2xl font-mono font-bold ${
                  card.color === 'cyan' ? 'text-cyan-400' :
                  card.color === 'purple' ? 'text-purple-400' :
                  card.color === 'green' ? 'text-green-400' :
                  card.color === 'orange' ? 'text-orange-400' :
                  'text-fuchsia-400'
                }`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Tables Overview */}
          <div className="rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h4 className="text-white font-mono font-medium flex items-center gap-2">
                <DatabaseIcon size={16} className="text-cyan-400" />
                Table Status
              </h4>
            </div>
            <div className="divide-y divide-gray-800">
              {overview.tables.map((table, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${table.status === 'online' ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.6)]'}`} />
                    <span className="text-white font-mono">{table.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-cyan-400 font-mono text-sm">{table.rowCount >= 0 ? table.rowCount + ' rows' : 'error'}</span>
                    <span className="text-gray-500 font-mono text-xs">{table.lastActivity ? formatTime(table.lastActivity) : 'No data'}</span>
                    <button
                      onClick={() => { fetchTableData(table.name); setActiveSubTab('tables'); }}
                      className="px-3 py-1 text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-all"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Audit Events */}
          {overview.recentAuditEvents.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h4 className="text-white font-mono font-medium flex items-center gap-2">
                  <ActivityIcon size={16} className="text-fuchsia-400" />
                  Recent Auth Events
                </h4>
              </div>
              <div className="divide-y divide-gray-800">
                {overview.recentAuditEvents.slice(0, 5).map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono border ${getActionColor(event.action_type)}`}>
                        {event.action_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-gray-300 font-mono text-sm">{event.email}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600 font-mono text-xs">{event.ip_address}</span>
                      <span className="text-gray-500 font-mono text-xs">{formatTime(event.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tables Sub-tab */}
      {activeSubTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(overview?.tables || []).map((t) => (
              <button
                key={t.name}
                onClick={() => fetchTableData(t.name)}
                className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                  selectedTable === t.name
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-cyan-500/30'
                }`}
              >
                {t.name} ({t.rowCount})
              </button>
            ))}
          </div>

          {tableData && (
            <div className="rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h4 className="text-white font-mono font-medium">
                  {tableData.table} <span className="text-gray-500 text-sm">({tableData.totalCount} total rows)</span>
                </h4>
              </div>
              <div className="overflow-x-auto">
                {tableData.rows.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/50">
                      <tr>
                        {Object.keys(tableData.rows[0]).map((col) => (
                          <th key={col} className="text-left p-3 text-xs font-mono text-cyan-400 uppercase whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {tableData.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-900/30">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="p-3 text-gray-300 font-mono text-xs whitespace-nowrap max-w-[200px] truncate">
                              {val === null ? <span className="text-gray-600 italic">null</span> : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-500 font-mono">No data in this table</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Sub-tab */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h4 className="text-white font-mono font-medium flex items-center gap-2">
                <ActivityIcon size={16} className="text-fuchsia-400" />
                Authentication Audit Trail
              </h4>
            </div>
            {(overview?.recentAuditEvents || []).length > 0 ? (
              <div className="divide-y divide-gray-800">
                {(overview?.recentAuditEvents || []).map((event, i) => (
                  <div key={i} className="p-4 hover:bg-gray-900/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono border ${getActionColor(event.action_type)}`}>
                          {event.action_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-white font-mono text-sm">{event.email}</span>
                      </div>
                      <span className="text-gray-500 font-mono text-xs">{formatTime(event.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-600">
                      <span>IP: {event.ip_address}</span>
                      {event.user_agent && <span className="truncate max-w-[300px]">UA: {event.user_agent}</span>}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <span className="text-purple-400">Meta: {JSON.stringify(event.metadata)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <ActivityIcon size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-mono">No audit events recorded yet</p>
                <p className="text-gray-600 font-mono text-xs mt-1">Events will appear after login attempts</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Sub-tab */}
      {activeSubTab === 'health' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h4 className="text-white font-mono font-medium flex items-center gap-2">
                <ShieldIcon size={16} className="text-green-400" />
                System Health Checks
              </h4>
              <button
                onClick={fetchHealthCheck}
                className="px-3 py-1 text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-all"
              >
                Re-check
              </button>
            </div>
            {healthChecks ? (
              <div className="divide-y divide-gray-800">
                {Object.entries(healthChecks).map(([name, check], i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {check.status === 'healthy' ? (
                        <CheckCircleIcon size={18} className="text-green-400" />
                      ) : (
                        <XCircleIcon size={18} className="text-red-400" />
                      )}
                      <span className="text-white font-mono">{name.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono border ${
                        check.status === 'healthy' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                        check.status === 'degraded' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                        'text-red-400 bg-red-500/10 border-red-500/30'
                      }`}>
                        {check.status.toUpperCase()}
                      </span>
                      {check.latency && <span className="text-gray-500 font-mono text-xs">{check.latency}</span>}
                      {check.error && <span className="text-red-400 font-mono text-xs truncate max-w-[300px]">{check.error}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 font-mono">Loading health checks...</div>
            )}
          </div>

          {/* Connection Info */}
          <div className="rounded-xl border border-gray-800 bg-black/60 p-6">
            <h4 className="text-white font-mono font-medium mb-4 flex items-center gap-2">
              <ServerIcon size={16} className="text-cyan-400" />
              Connection Details
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: 'Schema', value: overview?.schema || 'app_private' },
                { label: 'API Protocol', value: 'REST (PostgREST)' },
                { label: 'Auth Method', value: 'Service Role Key' },
                { label: 'Edge Functions', value: 'db-monitor, secure-auth' },
              ].map((item, i) => (
                <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                  <p className="text-gray-500 text-xs font-mono uppercase mb-1">{item.label}</p>
                  <p className="text-cyan-400 font-mono text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default DatabaseMonitorPanel;
