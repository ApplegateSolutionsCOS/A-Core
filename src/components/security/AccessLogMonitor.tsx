import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccessLog {
  id: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  response_code: number;
  country: string;
  city: string;
  region: string;
  org: string;
  loc: string;
  timezone: string;
  is_suspicious: boolean;
  suspicious_reason: string;
  request_size: number;
  response_time_ms: number;
  user_id: string;
  session_id: string;
  metadata: any;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', RU: 'Russia', CN: 'China', IN: 'India', JP: 'Japan',
  BR: 'Brazil', GB: 'United Kingdom', FR: 'France', DE: 'Germany', AU: 'Australia',
  KR: 'South Korea', SG: 'Singapore', AE: 'UAE', TR: 'Turkey', MX: 'Mexico',
  AR: 'Argentina', NG: 'Nigeria', KE: 'Kenya', PH: 'Philippines', SE: 'Sweden',
  NL: 'Netherlands', CA: 'Canada', IT: 'Italy', ES: 'Spain', PL: 'Poland',
  UA: 'Ukraine', IR: 'Iran', PK: 'Pakistan', VN: 'Vietnam', TH: 'Thailand',
  ID: 'Indonesia', EG: 'Egypt', ZA: 'South Africa', XX: 'Private',
};

function getMethodColor(method: string): string {
  switch (method?.toUpperCase()) {
    case 'GET': return '#22c55e';
    case 'POST': return '#3b82f6';
    case 'PUT': return '#f59e0b';
    case 'DELETE': return '#ef4444';
    case 'PATCH': return '#a855f7';
    case 'OPTIONS': return '#6b7280';
    default: return '#6b7280';
  }
}

function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return '#22c55e';
  if (code >= 300 && code < 400) return '#3b82f6';
  if (code >= 400 && code < 500) return '#f59e0b';
  if (code >= 500) return '#ef4444';
  return '#6b7280';
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

// ─── Component ───────────────────────────────────────────────────────────────

const AccessLogMonitor: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);
  const animatingIds = useRef<Set<string>>(new Set());
  const [animTick, setAnimTick] = useState(0);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'get_access_logs', limit: 200, suspicious_only: suspiciousOnly }
      });
      if (!error && data?.logs) {
        setLogs(data.logs);
        setTotalCount(data.logs.length);
        setSuspiciousCount(data.logs.filter((l: AccessLog) => l.is_suspicious).length);
        const countries = [...new Set(data.logs.map((l: AccessLog) => l.country).filter(Boolean))] as string[];
        setUniqueCountries(countries.sort());
      }
    } catch { /* silent */ }
    setIsLoading(false);
  }, [suspiciousOnly]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Realtime subscription
  useEffect(() => {
    if (!isLive) return;
    const channel = supabase
      .channel('access-log-monitor')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'access_logs',
      }, (payload) => {
        const entry = payload.new as AccessLog;
        if (!entry) return;

        animatingIds.current.add(entry.id);
        setTimeout(() => {
          animatingIds.current.delete(entry.id);
          setAnimTick(t => t + 1);
        }, 3000);

        setLogs(prev => [entry, ...prev].slice(0, 200));
        setTotalCount(prev => prev + 1);
        if (entry.is_suspicious) setSuspiciousCount(prev => prev + 1);
        if (entry.country && !uniqueCountries.includes(entry.country)) {
          setUniqueCountries(prev => [...prev, entry.country].sort());
        }
        setAnimTick(t => t + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive, uniqueCountries]);

  // Simulate demo access logs periodically
  useEffect(() => {
    if (!isLive) return;
    const endpoints = [
      '/api/dashboard', '/api/security/scan', '/api/auth/session',
      '/api/files/upload', '/api/workspace/list', '/api/notifications/read',
      '/api/metrics/realtime', '/api/users/search', '/wp-admin/login.php',
      '/api/integrations/webhook', '/.env', '/api/billing/invoice',
    ];
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
      'sqlmap/1.7.2#stable',
      'python-requests/2.31.0',
      'curl/8.4.0',
    ];

    const interval = setInterval(async () => {
      const ip = `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      const methods = ['GET', 'GET', 'GET', 'POST', 'PUT', 'DELETE'];
      const codes = [200, 200, 200, 201, 301, 400, 401, 403, 404, 500];

      try {
        await supabase.functions.invoke('qcore-security', {
          body: {
            action: 'log_access',
            ip_address: ip,
            user_agent: ua,
            endpoint: ep,
            method: methods[Math.floor(Math.random() * methods.length)],
            response_code: codes[Math.floor(Math.random() * codes.length)],
            response_time_ms: Math.floor(Math.random() * 500) + 10,
          }
        });
      } catch { /* silent */ }
    }, 6000 + Math.random() * 10000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (countryFilter && log.country !== countryFilter) return false;
    if (timeRange !== '7d') {
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      if (new Date(log.created_at).getTime() < cutoff) return false;
    }
    return true;
  });

  // Stats for filtered view
  const filteredSuspicious = filteredLogs.filter(l => l.is_suspicious).length;
  const avgResponseTime = filteredLogs.length > 0
    ? Math.round(filteredLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / filteredLogs.length)
    : 0;

  // Status code breakdown
  const statusBreakdown: Record<string, number> = {};
  filteredLogs.forEach(l => {
    const group = `${Math.floor(l.response_code / 100)}xx`;
    statusBreakdown[group] = (statusBreakdown[group] || 0) + 1;
  });

  // Top endpoints
  const endpointCounts: Record<string, number> = {};
  filteredLogs.forEach(l => { endpointCounts[l.endpoint] = (endpointCounts[l.endpoint] || 0) + 1; });
  const topEndpoints = Object.entries(endpointCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header + Controls */}
      <div className="rounded-xl border border-orange-500/30 bg-black/80 overflow-hidden">
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                {isLive && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-ping" />}
              </div>
              <div>
                <h3 className="text-white font-mono font-bold text-sm">ACCESS LOG MONITOR</h3>
                <p className="text-gray-600 font-mono text-[10px]">Real-time HTTP request monitoring with IpInfo geolocation</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Time Range */}
              <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                {(['1h', '6h', '24h', '7d'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2.5 py-1 font-mono text-[10px] font-bold transition-all ${
                      timeRange === range ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Country Filter */}
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 font-mono text-[10px] text-gray-400 focus:outline-none focus:border-orange-500/50"
              >
                <option value="">All Countries</option>
                {uniqueCountries.map(c => (
                  <option key={c} value={c}>{COUNTRY_NAMES[c] || c} ({c})</option>
                ))}
              </select>

              {/* Suspicious Toggle */}
              <button
                onClick={() => setSuspiciousOnly(!suspiciousOnly)}
                className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                  suspiciousOnly ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                }`}
              >
                {suspiciousOnly ? 'SUSPICIOUS ONLY' : 'ALL REQUESTS'}
              </button>

              {/* Live Toggle */}
              <button
                onClick={() => setIsLive(!isLive)}
                className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                  isLive ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {isLive ? 'LIVE' : 'PAUSED'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 border-b border-gray-800/50">
          <div className="p-3 text-center border-r border-gray-800/50">
            <p className="text-orange-400 font-mono text-xl font-bold">{filteredLogs.length}</p>
            <p className="text-gray-600 font-mono text-[9px] uppercase">Requests</p>
          </div>
          <div className="p-3 text-center border-r border-gray-800/50">
            <p className="text-red-400 font-mono text-xl font-bold">{filteredSuspicious}</p>
            <p className="text-gray-600 font-mono text-[9px] uppercase">Suspicious</p>
          </div>
          <div className="p-3 text-center border-r border-gray-800/50 hidden lg:block">
            <p className="text-cyan-400 font-mono text-xl font-bold">{avgResponseTime}<span className="text-xs">ms</span></p>
            <p className="text-gray-600 font-mono text-[9px] uppercase">Avg Response</p>
          </div>
          <div className="p-3 text-center border-r border-gray-800/50 hidden lg:block">
            <p className="text-green-400 font-mono text-xl font-bold">{statusBreakdown['2xx'] || 0}</p>
            <p className="text-gray-600 font-mono text-[9px] uppercase">2xx Success</p>
          </div>
          <div className="p-3 text-center hidden lg:block">
            <p className="text-yellow-400 font-mono text-xl font-bold">{(statusBreakdown['4xx'] || 0) + (statusBreakdown['5xx'] || 0)}</p>
            <p className="text-gray-600 font-mono text-[9px] uppercase">4xx/5xx Errors</p>
          </div>
        </div>

        {/* Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase w-8"></th>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase">IP Address</th>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase">Location</th>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase">Method</th>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase">Endpoint</th>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase">Status</th>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase">Time</th>
                <th className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
                    <p className="text-gray-600 font-mono text-xs mt-2">Loading access logs...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700 mx-auto mb-2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <p className="text-gray-600 font-mono text-xs">No access logs found</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 50).map((log) => {
                  const isNew = animatingIds.current.has(log.id);
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setSelectedLog(isSelected ? null : log)}
                        className={`cursor-pointer transition-all ${
                          isNew ? 'bg-orange-500/10' : log.is_suspicious ? 'bg-red-500/5' : 'hover:bg-gray-900/50'
                        } ${isSelected ? 'bg-orange-500/10' : ''}`}
                        style={isNew ? { animation: 'log-row-flash 0.5s ease-out' } : {}}
                      >
                        <td className="p-3">
                          <div className="relative">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: log.is_suspicious ? '#ef4444' : '#22c55e',
                                boxShadow: `0 0 4px ${log.is_suspicious ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.4)'}`,
                              }}
                            />
                            {isNew && (
                              <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: log.is_suspicious ? '#ef4444' : '#22c55e', opacity: 0.4 }} />
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-white font-mono text-xs font-medium">{log.ip_address}</span>
                          {log.org && <p className="text-gray-600 font-mono text-[9px] truncate max-w-[140px]">{log.org}</p>}
                        </td>
                        <td className="p-3">
                          <span className="text-gray-400 font-mono text-xs">
                            {log.city && log.country ? `${log.city}, ${log.country}` : log.country || '—'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                            style={{ color: getMethodColor(log.method), backgroundColor: `${getMethodColor(log.method)}15`, border: `1px solid ${getMethodColor(log.method)}30` }}
                          >
                            {log.method}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-400 font-mono text-xs truncate max-w-[180px] block">{log.endpoint}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-xs font-bold" style={{ color: getStatusColor(log.response_code) }}>
                            {log.response_code}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-500 font-mono text-[10px]">{formatTimeAgo(log.created_at)}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-500 font-mono text-[10px]">{log.response_time_ms || 0}ms</span>
                        </td>
                      </tr>
                      {/* Expanded Detail Row */}
                      {isSelected && (
                        <tr className="bg-gray-900/80">
                          <td colSpan={8} className="p-4">
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="p-2.5 bg-black/50 border border-gray-800 rounded-lg">
                                <p className="text-gray-600 text-[9px] font-mono uppercase mb-0.5">User Agent</p>
                                <p className="text-gray-300 font-mono text-[10px] break-all">{log.user_agent || '—'}</p>
                              </div>
                              <div className="p-2.5 bg-black/50 border border-gray-800 rounded-lg">
                                <p className="text-gray-600 text-[9px] font-mono uppercase mb-0.5">Full Location</p>
                                <p className="text-gray-300 font-mono text-[10px]">{log.city}, {log.region}, {COUNTRY_NAMES[log.country] || log.country}</p>
                                <p className="text-gray-600 font-mono text-[9px]">Coords: {log.loc || '—'}</p>
                              </div>
                              <div className="p-2.5 bg-black/50 border border-gray-800 rounded-lg">
                                <p className="text-gray-600 text-[9px] font-mono uppercase mb-0.5">Organization</p>
                                <p className="text-gray-300 font-mono text-[10px]">{log.org || '—'}</p>
                                <p className="text-gray-600 font-mono text-[9px]">TZ: {log.timezone || '—'}</p>
                              </div>
                              {log.is_suspicious && (
                                <div className="p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
                                  <p className="text-red-400 text-[9px] font-mono uppercase mb-0.5 font-bold">Suspicious Reason</p>
                                  <p className="text-red-300 font-mono text-[10px]">{log.suspicious_reason}</p>
                                </div>
                              )}
                              {!log.is_suspicious && (
                                <div className="p-2.5 bg-black/50 border border-gray-800 rounded-lg">
                                  <p className="text-gray-600 text-[9px] font-mono uppercase mb-0.5">Timestamp</p>
                                  <p className="text-gray-300 font-mono text-[10px]">{formatTime(log.created_at)}</p>
                                  <p className="text-gray-600 font-mono text-[9px]">{new Date(log.created_at).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > 50 && (
          <div className="p-3 border-t border-gray-800 text-center">
            <span className="text-gray-600 font-mono text-xs">Showing 50 of {filteredLogs.length} logs</span>
          </div>
        )}
      </div>

      {/* Bottom Row: Top Endpoints + Status Breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Endpoints */}
        <div className="rounded-xl border border-orange-500/20 bg-black/80 p-5">
          <h4 className="text-white font-mono font-bold text-xs mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
              <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            Top Endpoints
          </h4>
          <div className="space-y-2">
            {topEndpoints.length > 0 ? topEndpoints.map(([ep, count], i) => {
              const maxCount = topEndpoints[0][1];
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={ep}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-gray-400 font-mono text-[10px] truncate max-w-[200px]">{ep}</span>
                    <span className="text-orange-400 font-mono text-[10px] font-bold">{count}</span>
                  </div>
                  <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500/60 to-orange-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-600 font-mono text-xs text-center py-4">No endpoint data</p>
            )}
          </div>
        </div>

        {/* Status Code Breakdown */}
        <div className="rounded-xl border border-orange-500/20 bg-black/80 p-5">
          <h4 className="text-white font-mono font-bold text-xs mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Response Status Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { code: '2xx', label: 'Success', color: '#22c55e' },
              { code: '3xx', label: 'Redirect', color: '#3b82f6' },
              { code: '4xx', label: 'Client Error', color: '#f59e0b' },
              { code: '5xx', label: 'Server Error', color: '#ef4444' },
            ].map(item => (
              <div key={item.code} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                <p className="font-mono text-2xl font-bold" style={{ color: item.color }}>{statusBreakdown[item.code] || 0}</p>
                <p className="text-gray-500 font-mono text-[9px] uppercase">{item.code} {item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        @keyframes log-row-flash {
          0% { background-color: rgba(255,153,0,0.2); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  );
};

export default AccessLogMonitor;
