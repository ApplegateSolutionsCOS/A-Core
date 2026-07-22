import React, { useState, useEffect, useCallback } from 'react';
import {
  checkQCoreHealth,
  getSecurityStats,
  getScanHistory,
  getSupportedTypes,
  formatFileSize,
  getThreatLevelColor,
  type QCoreHealthStatus,
  type QCoreSecurityStats,
  type QCoreSupportedTypes,
  type FileScanLog
} from '@/lib/qcoreSecurity';
import {
  ShieldIcon,
  LockIcon,
  CheckIcon,
  SearchIcon,
  ActivityIcon,
  BarChartIcon,
  DatabaseIcon,
  CloseIcon,
} from '@/components/icons/Icons';

// Inline icons
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const DownloadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const FileIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const AlertIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

type SortField = 'file_name' | 'file_category' | 'scan_status' | 'threat_level' | 'scan_engine' | 'created_at';
type SortDir = 'asc' | 'desc';

const QCoreSecurityDashboard: React.FC = () => {
  const [health, setHealth] = useState<QCoreHealthStatus | null>(null);
  const [stats, setStats] = useState<QCoreSecurityStats | null>(null);
  const [scanHistory, setScanHistory] = useState<FileScanLog[]>([]);
  const [supportedTypes, setSupportedTypes] = useState<QCoreSupportedTypes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'history' | 'filetypes' | 'reports'>('overview');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    const [h, s, hist, types] = await Promise.all([
      checkQCoreHealth(),
      getSecurityStats(),
      getScanHistory({ limit: 100 }),
      getSupportedTypes()
    ]);
    setHealth(h);
    setStats(s);
    setScanHistory(hist);
    setSupportedTypes(types);
    setLastRefresh(new Date());
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const sortedHistory = [...scanHistory]
    .filter(s => !searchQuery || s.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.file_category?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aVal = (a as any)[sortField] || '';
      const bVal = (b as any)[sortField] || '';
      if (sortDir === 'asc') return aVal < bVal ? -1 : 1;
      return aVal > bVal ? -1 : 1;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const exportCSV = () => {
    const headers = ['Scan ID', 'File Name', 'File Size', 'Category', 'Status', 'Threat Level', 'Engine', 'Duration (ms)', 'Timestamp'];
    const rows = scanHistory.map(s => [
      s.scan_id, s.file_name, s.file_size, s.file_category, s.scan_status, s.threat_level, s.scan_engine, s.scan_duration_ms, s.created_at
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `qcore-security-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
      clean: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'CLEAN' },
      blocked: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'BLOCKED' },
      rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'REJECTED' },
      pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'SCANNING' },
    };
    const s = map[status] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', label: status?.toUpperCase() || 'UNKNOWN' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>;
  };

  const getThreatBadge = (level: string) => {
    const c = getThreatLevelColor(level);
    return <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${c.bg} ${c.text} ${c.border}`}>{level?.toUpperCase() || 'NONE'}</span>;
  };

  const apiStatusColor = health ? 'green' : 'gray';
  const apiStatusLabel = health ? 'ONLINE' : 'OFFLINE';


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-spin" style={{ borderTopColor: '#0ff' }} />
            <div className="absolute inset-2 rounded-full border-2 border-fuchsia-500/30 animate-spin" style={{ borderBottomColor: '#f0f', animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <LockIcon size={24} className="absolute inset-0 m-auto text-cyan-400" />
          </div>
          <p className="text-cyan-400 font-mono text-sm animate-pulse">Initializing Q-CORE Security...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="relative rounded-xl border border-cyan-500/50 bg-black overflow-hidden neon-glow-cyan">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-transparent to-fuchsia-950/20" />
        <div className="absolute inset-0 hex-pattern opacity-20" />
        <div className="relative z-10 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-2 bg-cyan-500/30 rounded-xl blur-lg animate-pulse" />
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/50 flex items-center justify-center">
                  <LockIcon size={28} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-mono font-bold neon-text-cyan">Q-CORE Digital Security</h3>
                <p className="text-xs font-mono text-fuchsia-400 tracking-widest uppercase">Real-Time Security Operations Center</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Live connection pulse */}
              <div className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-gray-800 rounded-lg">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${apiStatusColor === 'green' ? 'bg-green-400' : apiStatusColor === 'red' ? 'bg-red-400' : apiStatusColor === 'orange' ? 'bg-orange-400' : apiStatusColor === 'yellow' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                  {apiStatusColor === 'green' && (
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />
                  )}
                </div>
                <span className={`text-xs font-mono font-bold ${apiStatusColor === 'green' ? 'text-green-400' : apiStatusColor === 'red' ? 'text-red-400' : apiStatusColor === 'orange' ? 'text-orange-400' : apiStatusColor === 'yellow' ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {apiStatusLabel}
                </span>
                {health?.apiLatency !== null && health?.apiLatency !== undefined && (
                  <span className="text-gray-600 text-xs font-mono">{health.apiLatency}ms</span>
                )}
              </div>
              <button
                onClick={fetchAll}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm disabled:opacity-50"
              >
                <RefreshIcon size={16} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-mono text-sm"
              >
                <DownloadIcon size={16} />
                Export CSV
              </button>
            </div>
          </div>

          {/* API Details */}
          {health && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Engine', value: health.engine },
                { label: 'Version', value: health.version },
                { label: 'Encryption', value: health.encryptionProtocol },
                { label: 'Max File Size', value: health.maxFileSize },
              ].map((item, i) => (
                <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] font-mono uppercase">{item.label}</p>
                  <p className="text-cyan-400 font-mono text-sm font-bold truncate">{item.value}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-gray-600 text-xs font-mono mt-3">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: BarChartIcon },
          { id: 'history' as const, label: 'Scan History', icon: ActivityIcon },
          { id: 'filetypes' as const, label: 'Supported Types', icon: FileIcon },
          { id: 'reports' as const, label: 'Audit Reports', icon: ShieldIcon },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm whitespace-nowrap transition-all ${
              activeSubTab === tab.id
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                : 'bg-gray-900/50 border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Scans', value: stats?.totalScans || 0, icon: ActivityIcon, color: 'cyan', glow: 'neon-glow-cyan' },
              { label: 'Clean Files', value: stats?.cleanScans || 0, icon: CheckIcon, color: 'green', glow: 'neon-glow-green' },
              { label: 'Blocked Threats', value: stats?.blockedScans || 0, icon: AlertIcon, color: 'red', glow: 'neon-glow-red' },
              { label: 'Security Score', value: `${stats?.securityScore || 100}%`, icon: ShieldIcon, color: 'cyan', glow: 'neon-glow-cyan' },
            ].map((card, i) => {
              const Icon = card.icon;
              const colorMap: Record<string, { border: string; text: string; iconBg: string; iconText: string }> = {
                cyan: { border: 'border-cyan-500/40', text: 'neon-text-cyan', iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400' },
                green: { border: 'border-green-500/40', text: 'text-green-400', iconBg: 'bg-green-500/20', iconText: 'text-green-400' },
                red: { border: 'border-red-500/40', text: 'text-red-400', iconBg: 'bg-red-500/20', iconText: 'text-red-400' },
              };
              const c = colorMap[card.color] || colorMap.cyan;
              return (
                <div key={i} className={`relative rounded-xl border-2 ${c.border} bg-black p-5 ${card.glow}`}>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/40 rounded-tl" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/40 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/40 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/40 rounded-br" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">{card.label}</span>
                    <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center`}>
                      <Icon size={18} className={c.iconText} />
                    </div>
                  </div>
                  <p className={`text-3xl font-bold font-mono ${c.text}`}>{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Scan Capabilities + Category Breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Capabilities */}
            <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
                <ShieldIcon size={18} className="text-cyan-400" />
                Scan Capabilities
              </h4>
              <div className="space-y-2">
                {(health?.scanCapabilities || [
                  'Malware Detection', 'Virus Scanning', 'Threat Assessment',
                  'File Integrity Verification', 'Double Extension Detection',
                  'Content Analysis', 'Quantum-Safe Encryption'
                ]).map((cap, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.8)]" />
                    <span className="text-gray-300 font-mono text-sm">{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="rounded-xl border border-fuchsia-500/30 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
                <BarChartIcon size={18} className="text-fuchsia-400" />
                Scans by Category
              </h4>
              {stats?.scansByCategory && Object.keys(stats.scansByCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.scansByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count], i) => {
                      const pct = stats.totalScans > 0 ? Math.round((count / stats.totalScans) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-400 font-mono text-xs uppercase">{cat}</span>
                            <span className="text-fuchsia-400 font-mono text-xs font-bold">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DatabaseIcon size={32} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 font-mono text-sm">No scan data yet</p>
                  <p className="text-gray-700 font-mono text-xs mt-1">Upload files to see category breakdown</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Scans Quick View */}
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
              <ActivityIcon size={18} className="text-cyan-400" />
              Recent Scans
            </h4>
            {scanHistory.length > 0 ? (
              <div className="space-y-2">
                {scanHistory.slice(0, 5).map((scan, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-cyan-500/30 transition-all">
                    <FileIcon size={18} className="text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono text-sm truncate">{scan.file_name}</p>
                      <p className="text-gray-600 font-mono text-xs">{scan.file_category} &middot; {formatFileSize(scan.file_size)}</p>
                    </div>
                    {getStatusBadge(scan.scan_status)}
                    {getThreatBadge(scan.threat_level)}
                    <span className="text-gray-600 font-mono text-xs flex-shrink-0">{new Date(scan.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldIcon size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 font-mono text-sm">No scans recorded yet</p>
                <p className="text-gray-700 font-mono text-xs mt-1">Files will be scanned automatically when uploaded through the messaging system</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan History Tab */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search scans..."
                className="w-full bg-black border border-cyan-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all"
              />
            </div>
            <span className="text-gray-500 font-mono text-sm">{sortedHistory.length} scans</span>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-cyan-950/30 border-b border-cyan-500/20">
                  <tr>
                    {[
                      { field: 'file_name' as SortField, label: 'File Name' },
                      { field: 'file_category' as SortField, label: 'Category' },
                      { field: 'scan_status' as SortField, label: 'Status' },
                      { field: 'threat_level' as SortField, label: 'Threat Level' },
                      { field: 'scan_engine' as SortField, label: 'Engine' },
                      { field: 'created_at' as SortField, label: 'Timestamp' },
                    ].map(col => (
                      <th
                        key={col.field}
                        onClick={() => handleSort(col.field)}
                        className="text-left p-4 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider cursor-pointer hover:text-cyan-300 select-none"
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortField === col.field && (
                            <span className="text-cyan-300">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedHistory.length > 0 ? sortedHistory.map((scan, i) => (
                    <tr key={i} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FileIcon size={16} className="text-gray-500 flex-shrink-0" />
                          <div>
                            <p className="text-white font-mono text-sm truncate max-w-[200px]">{scan.file_name}</p>
                            <p className="text-gray-600 font-mono text-xs">{formatFileSize(scan.file_size)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-900 border border-gray-800 rounded text-xs font-mono text-gray-400">{scan.file_category}</span>
                      </td>
                      <td className="p-4">{getStatusBadge(scan.scan_status)}</td>
                      <td className="p-4">{getThreatBadge(scan.threat_level)}</td>
                      <td className="p-4 text-gray-400 font-mono text-xs">{scan.scan_engine}</td>
                      <td className="p-4 text-gray-500 font-mono text-xs">{new Date(scan.created_at).toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <ShieldIcon size={32} className="text-gray-700 mx-auto mb-2" />
                        <p className="text-gray-600 font-mono text-sm">No scan records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Supported File Types Tab */}
      {activeSubTab === 'filetypes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-mono font-bold">Supported File Types</h4>
              <p className="text-gray-500 font-mono text-sm mt-1">
                {supportedTypes?.totalTypes || '76+'} file types across {supportedTypes ? Object.keys(supportedTypes.categories).length : '20'} categories
              </p>
            </div>
            <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg font-mono text-sm">
              Max: {supportedTypes?.maxFileSizeFormatted || '300MB'}
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {supportedTypes?.categories && Object.entries(supportedTypes.categories)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, types], i) => {
                const catColors: Record<string, { border: string; bg: string; text: string }> = {
                  document: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400' },
                  image: { border: 'border-green-500/30', bg: 'bg-green-500/5', text: 'text-green-400' },
                  video: { border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/5', text: 'text-fuchsia-400' },
                  audio: { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400' },
                  archive: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', text: 'text-yellow-400' },
                  code: { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400' },
                  spreadsheet: { border: 'border-green-500/30', bg: 'bg-green-500/5', text: 'text-green-400' },
                  executable: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400' },
                  data: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400' },
                };
                const cc = catColors[category] || { border: 'border-gray-700', bg: 'bg-gray-900/50', text: 'text-gray-400' };
                return (
                  <div key={i} className={`rounded-xl border ${cc.border} ${cc.bg} p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className={`font-mono font-bold text-sm uppercase ${cc.text}`}>{category}</h5>
                      <span className="text-gray-600 font-mono text-xs">{types.length} types</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {types.map((t, j) => (
                        <span key={j} className="px-2 py-0.5 bg-black/50 border border-gray-800 rounded text-xs font-mono text-gray-400">
                          .{t.extension}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Audit Reports Tab */}
      {activeSubTab === 'reports' && (
        <SecurityAuditReportsInline stats={stats} scanHistory={scanHistory} onExportCSV={exportCSV} />
      )}
    </div>
  );
};

// ─── Inline Audit Reports ────────────────────────────────────────────────────

interface AuditReportsProps {
  stats: QCoreSecurityStats | null;
  scanHistory: FileScanLog[];
  onExportCSV: () => void;
}

const SecurityAuditReportsInline: React.FC<AuditReportsProps> = ({ stats, scanHistory, onExportCSV }) => {
  // Weekly summary
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weeklyScans = scanHistory.filter(s => new Date(s.created_at) >= oneWeekAgo);
  const monthlyScans = scanHistory.filter(s => new Date(s.created_at) >= oneMonthAgo);

  const weeklyClean = weeklyScans.filter(s => s.scan_status === 'clean').length;
  const weeklyBlocked = weeklyScans.filter(s => s.scan_status === 'blocked').length;
  const monthlyClean = monthlyScans.filter(s => s.scan_status === 'clean').length;
  const monthlyBlocked = monthlyScans.filter(s => s.scan_status === 'blocked').length;

  // Top file types
  const typeCounts: Record<string, number> = {};
  scanHistory.forEach(s => { typeCounts[s.file_category] = (typeCounts[s.file_category] || 0) + 1; });
  const topTypes = Object.entries(typeCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  // Blocked attempts
  const blockedAttempts = scanHistory.filter(s => s.scan_status === 'blocked' || s.scan_status === 'rejected');

  // Daily scan counts for chart
  const dailyCounts: Record<string, number> = {};
  scanHistory.forEach(s => {
    const day = new Date(s.created_at).toLocaleDateString();
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });
  const dailyData = Object.entries(dailyCounts).slice(0, 14).reverse();
  const maxDaily = Math.max(...dailyData.map(([, c]) => c), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly */}
        <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <ActivityIcon size={18} className="text-cyan-400" />
            Weekly Summary
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-2xl font-bold font-mono text-cyan-400">{weeklyScans.length}</p>
              <p className="text-gray-500 text-xs font-mono">Total</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-2xl font-bold font-mono text-green-400">{weeklyClean}</p>
              <p className="text-gray-500 text-xs font-mono">Clean</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-2xl font-bold font-mono text-red-400">{weeklyBlocked}</p>
              <p className="text-gray-500 text-xs font-mono">Blocked</p>
            </div>
          </div>
        </div>

        {/* Monthly */}
        <div className="rounded-xl border border-fuchsia-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <BarChartIcon size={18} className="text-fuchsia-400" />
            Monthly Summary
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-2xl font-bold font-mono text-fuchsia-400">{monthlyScans.length}</p>
              <p className="text-gray-500 text-xs font-mono">Total</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-2xl font-bold font-mono text-green-400">{monthlyClean}</p>
              <p className="text-gray-500 text-xs font-mono">Clean</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-2xl font-bold font-mono text-red-400">{monthlyBlocked}</p>
              <p className="text-gray-500 text-xs font-mono">Blocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Trend Chart */}
      <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
        <h4 className="text-white font-mono font-bold mb-4">Scans Over Time</h4>
        {dailyData.length > 0 ? (
          <div className="flex items-end gap-2 h-40">
            {dailyData.map(([day, count], i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-cyan-400 font-mono text-xs">{count}</span>
                <div
                  className="w-full bg-gradient-to-t from-cyan-500/60 to-fuchsia-500/60 rounded-t-sm transition-all duration-500"
                  style={{ height: `${(count / maxDaily) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-gray-600 font-mono text-[9px] truncate max-w-full">{day.split('/').slice(0, 2).join('/')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 font-mono text-sm text-center py-8">No data to display</p>
        )}
      </div>

      {/* Top File Types + Blocked Attempts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-green-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4">Most Common File Types</h4>
          {topTypes.length > 0 ? (
            <div className="space-y-2">
              {topTypes.map(([cat, count], i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <span className="text-gray-300 font-mono text-sm capitalize">{cat}</span>
                  <span className="text-green-400 font-mono text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 font-mono text-sm text-center py-4">No data</p>
          )}
        </div>

        <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <AlertIcon size={18} className="text-red-400" />
            Blocked File Attempts
          </h4>
          {blockedAttempts.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto darkwave-scrollbar">
              {blockedAttempts.map((scan, i) => (
                <div key={i} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-mono text-sm truncate">{scan.file_name}</p>
                    <span className="text-red-400 font-mono text-xs">{scan.scan_status?.toUpperCase()}</span>
                  </div>
                  <p className="text-gray-500 font-mono text-xs mt-1">{new Date(scan.created_at).toLocaleString()}</p>
                  {scan.threats && (
                    <p className="text-red-400/70 font-mono text-xs mt-1 truncate">{typeof scan.threats === 'string' ? scan.threats : JSON.stringify(scan.threats)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckIcon size={32} className="text-green-500/50 mx-auto mb-2" />
              <p className="text-gray-600 font-mono text-sm">No blocked attempts</p>
            </div>
          )}
        </div>
      </div>

      {/* Security Score */}
      <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-mono font-bold">Security Score</h4>
          <button onClick={onExportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-mono text-sm">
            <DownloadIcon size={16} />
            Export Full Report (CSV)
          </button>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(100,100,100,0.2)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={stats && stats.securityScore >= 90 ? '#22c55e' : stats && stats.securityScore >= 70 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(stats?.securityScore || 100) * 2.64} 264`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold font-mono ${stats && stats.securityScore >= 90 ? 'text-green-400' : stats && stats.securityScore >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                {stats?.securityScore || 100}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-gray-400 font-mono text-sm mb-2">
              Your security score is based on the ratio of clean files to total scans.
              A score of 100% means all scanned files were clean.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-gray-500 text-xs font-mono">Total Scans</p>
                <p className="text-white font-mono font-bold">{stats?.totalScans || 0}</p>
              </div>
              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-gray-500 text-xs font-mono">Last Scan</p>
                <p className="text-white font-mono font-bold text-sm">{stats?.lastScan ? new Date(stats.lastScan).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QCoreSecurityDashboard;
