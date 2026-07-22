/**
 * IntegrationAuditLog - Filterable, searchable timeline of integration activities with CSV export.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import {
  SearchIcon,
  CheckIcon,
  CloseIcon,
} from '@/components/icons/Icons';

const HistoryIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
  </svg>
);

const DownloadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

interface AuditEntry {
  id: string;
  organization_id: string;
  integration_id: string;
  action_type: string;
  actor_id: string;
  actor_name: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const IntegrationAuditLog: React.FC = () => {
  const { organization } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterIntegration, setFilterIntegration] = useState<string>('all');

  const loadLogs = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'get_audit_log',
        organizationId: organization.id,
        limit: 200,
      });
      if (result.data?.logs) {
        setLogs(result.data.logs);
      }
    } catch (err) {
      console.error('[AuditLog] Error loading logs:', err);
    }
    setIsLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Unique values for filters
  const uniqueActions = Array.from(new Set(logs.map(l => l.action_type)));
  const uniqueIntegrations = Array.from(new Set(logs.map(l => l.integration_id)));

  // Filtered logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.integration_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action_type === filterAction;
    const matchesIntegration = filterIntegration === 'all' || log.integration_id === filterIntegration;
    return matchesSearch && matchesAction && matchesIntegration;
  });

  // CSV Export
  const exportCSV = () => {
    const headers = ['Timestamp', 'Integration', 'Action', 'Actor', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toISOString(),
      log.integration_id,
      log.action_type,
      log.actor_id || 'system',
      JSON.stringify(log.details || {}),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, { color: string; label: string }> = {
      credentials_saved: { color: 'text-green-400', label: 'Saved' },
      credentials_loaded: { color: 'text-cyan-400', label: 'Loaded' },
      disconnected: { color: 'text-red-400', label: 'Disconnected' },
      sync_completed: { color: 'text-blue-400', label: 'Synced' },
      connection_toggled: { color: 'text-yellow-400', label: 'Toggled' },
      config_changed: { color: 'text-purple-400', label: 'Config' },
    };
    const info = iconMap[action] || { color: 'text-gray-400', label: action };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
        info.color === 'text-green-400' ? 'bg-green-500/10 border-green-500/30' :
        info.color === 'text-cyan-400' ? 'bg-cyan-500/10 border-cyan-500/30' :
        info.color === 'text-red-400' ? 'bg-red-500/10 border-red-500/30' :
        info.color === 'text-blue-400' ? 'bg-blue-500/10 border-blue-500/30' :
        info.color === 'text-yellow-400' ? 'bg-yellow-500/10 border-yellow-500/30' :
        info.color === 'text-purple-400' ? 'bg-purple-500/10 border-purple-500/30' :
        'bg-gray-500/10 border-gray-500/30'
      } ${info.color}`}>
        {info.label}
      </span>
    );
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-black to-cyan-950/20 p-4 overflow-hidden">
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/50 flex items-center justify-center">
              <HistoryIcon size={20} className="text-cyan-400" />
            </div>
            <div>
              <h4 className="text-white font-mono font-bold text-sm">Integration Audit Log</h4>
              <p className="text-gray-500 font-mono text-[10px]">{filteredLogs.length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-xs"
            >
              <RefreshIcon size={14} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-mono text-xs disabled:opacity-50"
            >
              <DownloadIcon size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search audit log..."
            className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={filterIntegration}
          onChange={e => setFilterIntegration(e.target.value)}
          className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Integrations</option>
          {uniqueIntegrations.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 font-mono text-sm">Loading audit log...</span>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <HistoryIcon size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 font-mono text-sm">No audit entries found</p>
            <p className="text-gray-600 font-mono text-xs mt-1">Integration activities will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50 max-h-[500px] overflow-y-auto darkwave-scrollbar">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-cyan-500/5 transition-colors">
                {/* Timeline dot */}
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    log.action_type === 'credentials_saved' ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.6)]' :
                    log.action_type === 'disconnected' ? 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.6)]' :
                    log.action_type === 'sync_completed' ? 'bg-blue-400 shadow-[0_0_6px_rgba(0,100,255,0.6)]' :
                    'bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.6)]'
                  }`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-mono text-sm font-medium">{log.integration_id}</span>
                    {getActionIcon(log.action_type)}
                    <span className="text-gray-600 font-mono text-[10px]">by {log.actor_id || 'system'}</span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {Object.entries(log.details).slice(0, 5).map(([key, value]) => (
                        <span key={key} className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-[9px] font-mono text-gray-500">
                          {key}: {typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value).substring(0, 30)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-gray-600 font-mono text-[10px] flex-shrink-0 whitespace-nowrap">
                  {formatTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationAuditLog;
