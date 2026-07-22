import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PinWidgetButton from './PinWidgetButton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccessLogEntry {
  id: string;
  ip_address: string;
  endpoint: string;
  method: string;
  response_code: number;
  country: string;
  city: string;
  region: string;
  org: string;
  loc: string;
  is_suspicious: boolean;
  suspicious_reason: string;
  user_agent: string;
  created_at: string;
}

interface FeedStats {
  totalConnections: number;
  uniqueIPs: number;
  suspiciousCount: number;
}

// ─── Country flag helper ─────────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', RU: 'Russia', CN: 'China', IN: 'India', JP: 'Japan',
  BR: 'Brazil', GB: 'United Kingdom', FR: 'France', DE: 'Germany', AU: 'Australia',
  KR: 'South Korea', SG: 'Singapore', AE: 'UAE', TR: 'Turkey', MX: 'Mexico',
  AR: 'Argentina', NG: 'Nigeria', KE: 'Kenya', PH: 'Philippines', SE: 'Sweden',
  NL: 'Netherlands', CA: 'Canada', IT: 'Italy', ES: 'Spain', PL: 'Poland',
  UA: 'Ukraine', IR: 'Iran', PK: 'Pakistan', VN: 'Vietnam', TH: 'Thailand',
  ID: 'Indonesia', EG: 'Egypt', ZA: 'South Africa', XX: 'Private Network',
};

function getMethodColor(method: string): string {
  switch (method?.toUpperCase()) {
    case 'GET': return '#22c55e';
    case 'POST': return '#3b82f6';
    case 'PUT': return '#f59e0b';
    case 'DELETE': return '#ef4444';
    case 'PATCH': return '#a855f7';
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

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const LiveIPFeed: React.FC = () => {
  const [entries, setEntries] = useState<AccessLogEntry[]>([]);
  const [stats, setStats] = useState<FeedStats>({ totalConnections: 0, uniqueIPs: 0, suspiciousCount: 0 });
  const [isLive, setIsLive] = useState(true);
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const seenIPs = useRef<Set<string>>(new Set());
  const animatingIds = useRef<Set<string>>(new Set());
  const [animTick, setAnimTick] = useState(0);

  // Fetch initial access logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('qcore-security', {
          body: { action: 'get_access_logs', limit: 30 }
        });
        if (!error && data?.logs) {
          setEntries(data.logs.slice(0, 20));
          const ips = new Set<string>();
          let suspicious = 0;
          data.logs.forEach((l: AccessLogEntry) => {
            ips.add(l.ip_address);
            seenIPs.current.add(l.ip_address);
            if (l.is_suspicious) suspicious++;
          });
          setStats({ totalConnections: data.logs.length, uniqueIPs: ips.size, suspiciousCount: suspicious });
        }
      } catch { /* silent */ }
    };
    fetchLogs();
  }, []);

  // Subscribe to Realtime on access_logs
  useEffect(() => {
    if (!isLive) return;
    const channel = supabase
      .channel('live-ip-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'access_logs',
      }, (payload) => {
        const entry = payload.new as AccessLogEntry;
        if (!entry) return;

        animatingIds.current.add(entry.id);
        setTimeout(() => {
          animatingIds.current.delete(entry.id);
          setAnimTick(t => t + 1);
        }, 2000);

        setEntries(prev => [entry, ...prev].slice(0, 20));
        seenIPs.current.add(entry.ip_address);
        setStats(prev => ({
          totalConnections: prev.totalConnections + 1,
          uniqueIPs: seenIPs.current.size,
          suspiciousCount: prev.suspiciousCount + (entry.is_suspicious ? 1 : 0),
        }));
        setAnimTick(t => t + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive]);

  // Simulate page view logging periodically for demo
  useEffect(() => {
    if (!isLive) return;
    const endpoints = ['/api/dashboard', '/api/security/scan', '/api/workspace/settings', '/api/auth/session', '/api/files/list', '/api/notifications', '/api/metrics', '/api/users/profile'];
    const interval = setInterval(async () => {
      const randomIP = `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const methods = ['GET', 'GET', 'GET', 'POST', 'PUT'];
      const codes = [200, 200, 200, 200, 201, 301, 403, 404, 500];
      try {
        await supabase.functions.invoke('qcore-security', {
          body: {
            action: 'log_access',
            ip_address: randomIP,
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            endpoint,
            method: methods[Math.floor(Math.random() * methods.length)],
            response_code: codes[Math.floor(Math.random() * codes.length)],
          }
        });
      } catch { /* silent */ }
    }, 8000 + Math.random() * 12000);

    return () => clearInterval(interval);
  }, [isLive]);

  const filteredEntries = showSuspiciousOnly ? entries.filter(e => e.is_suspicious) : entries;

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden" style={{ boxShadow: '0 0 20px rgba(0,200,255,0.08)' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {isLive && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-ping" />}
          </div>
          <div>
            <h3 className="text-white font-mono font-bold text-sm">LIVE IP CONNECTIONS</h3>
            <p className="text-gray-600 font-mono text-[10px]">IpInfo Geolocation Resolved</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PinWidgetButton widgetType="live_ip_feed" title="Live IP Feed" />

          <button
            onClick={() => setShowSuspiciousOnly(!showSuspiciousOnly)}
            className={`px-2 py-1 rounded font-mono text-[10px] font-bold border transition-all ${
              showSuspiciousOnly ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {showSuspiciousOnly ? 'THREATS' : 'ALL'}
          </button>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-2 py-1 rounded font-mono text-[10px] font-bold border transition-all ${
              isLive ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}
          >
            {isLive ? 'LIVE' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-3 border-b border-gray-800/50">
        <div className="p-2.5 text-center border-r border-gray-800/50">
          <p className="text-cyan-400 font-mono text-lg font-bold leading-tight">{stats.totalConnections}</p>
          <p className="text-gray-600 font-mono text-[9px] uppercase">Connections</p>
        </div>
        <div className="p-2.5 text-center border-r border-gray-800/50">
          <p className="text-blue-400 font-mono text-lg font-bold leading-tight">{stats.uniqueIPs}</p>
          <p className="text-gray-600 font-mono text-[9px] uppercase">Unique IPs</p>
        </div>
        <div className="p-2.5 text-center">
          <p className="text-red-400 font-mono text-lg font-bold leading-tight">{stats.suspiciousCount}</p>
          <p className="text-gray-600 font-mono text-[9px] uppercase">Suspicious</p>
        </div>
      </div>

      {/* Scrolling Feed */}
      <div ref={feedRef} className="max-h-[400px] overflow-y-auto darkwave-scrollbar">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700 mx-auto mb-2">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <p className="text-gray-600 font-mono text-xs">Waiting for connections...</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isNew = animatingIds.current.has(entry.id);
            return (
              <div
                key={entry.id}
                className={`px-4 py-2.5 border-b border-gray-800/30 transition-all duration-500 ${
                  isNew ? 'bg-cyan-500/10' : entry.is_suspicious ? 'bg-red-500/5' : 'hover:bg-gray-900/50'
                }`}
                style={isNew ? { animation: 'feed-slide-in 0.4s ease-out' } : {}}
              >
                <div className="flex items-center gap-2.5">
                  {/* Status dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: entry.is_suspicious ? '#ef4444' : '#22c55e',
                        boxShadow: `0 0 6px ${entry.is_suspicious ? 'rgba(239,68,68,0.8)' : 'rgba(34,197,94,0.6)'}`,
                      }}
                    />
                    {isNew && (
                      <div
                        className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping"
                        style={{ backgroundColor: entry.is_suspicious ? '#ef4444' : '#22c55e', opacity: 0.5 }}
                      />
                    )}
                  </div>

                  {/* IP + Location */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-xs font-bold">{entry.ip_address}</span>
                      {entry.is_suspicious && (
                        <span className="px-1 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-[8px] font-mono text-red-400 font-bold">
                          FLAGGED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {entry.city && entry.country && entry.country !== 'XX' ? (
                        <span className="text-gray-500 font-mono text-[10px]">
                          {entry.city}, {COUNTRY_NAMES[entry.country] || entry.country}
                        </span>
                      ) : entry.country === 'XX' ? (
                        <span className="text-gray-600 font-mono text-[10px]">Private Network</span>
                      ) : (
                        <span className="text-gray-600 font-mono text-[10px]">Resolving...</span>
                      )}
                      {entry.org && (
                        <span className="text-gray-700 font-mono text-[9px] truncate max-w-[120px]">| {entry.org}</span>
                      )}
                    </div>
                  </div>

                  {/* Method + Endpoint + Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                      style={{ color: getMethodColor(entry.method), backgroundColor: `${getMethodColor(entry.method)}15`, border: `1px solid ${getMethodColor(entry.method)}30` }}
                    >
                      {entry.method}
                    </span>
                    <span className="text-gray-500 font-mono text-[10px] max-w-[100px] truncate hidden lg:inline">
                      {entry.endpoint}
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: getStatusColor(entry.response_code) }}
                    >
                      {entry.response_code}
                    </span>
                    <span className="text-gray-700 font-mono text-[9px] w-6 text-right">
                      {formatTimeAgo(entry.created_at)}
                    </span>
                  </div>
                </div>

                {/* Suspicious reason */}
                {entry.is_suspicious && entry.suspicious_reason && (
                  <p className="text-red-400/70 font-mono text-[9px] mt-1 ml-5 truncate">
                    {entry.suspicious_reason}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CSS */}
      <style>{`
        @keyframes feed-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LiveIPFeed;
