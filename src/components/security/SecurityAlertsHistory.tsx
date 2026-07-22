import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PinWidgetButton from './PinWidgetButton';

interface SecurityNotification {
  id: string;
  user_id: string;
  event_type: string;
  severity: string;
  title: string;
  message: string;
  ip_address: string;
  scan_id: string;
  file_name: string;
  threat_level: string;
  attack_type: string;
  geo_location: any;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  info: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', dot: 'bg-gray-400' },
};

const EVENT_TYPES = [
  'all', 'file_blocked', 'suspicious_access', 'ip_blocked', 'threat_detected',
  'rate_limit_exceeded', 'auth_failure', 'scan_complete'
];

const SecurityAlertsHistory: React.FC = () => {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [selectedNotif, setSelectedNotif] = useState<SecurityNotification | null>(null);
  const pageSize = 20;

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: {
          action: 'get_security_notifications',
          limit: pageSize,
          offset: page * pageSize,
          severity: severityFilter,
          event_type: eventTypeFilter,
          date_from: dateFrom || undefined,
        },
      });
      if (!error && data?.success) {
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
    setIsLoading(false);
  }, [page, severityFilter, eventTypeFilter, dateFrom]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const totalPages = Math.ceil(total / pageSize);
  const sc = (sev: string) => SEVERITY_COLORS[sev] || SEVERITY_COLORS.info;

  return (
    <div className="rounded-xl border border-orange-500/30 bg-black/80 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          </div>
          <div>
            <h3 className="text-white font-mono font-bold text-sm">Security Alerts History</h3>
            <p className="text-gray-500 font-mono text-[10px]">{total} total notifications</p>
          </div>
          <PinWidgetButton widgetType="alerts_history" title="Alerts History" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
            className="bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-orange-500/50">
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={eventTypeFilter} onChange={e => { setEventTypeFilter(e.target.value); setPage(0); }}
            className="bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-orange-500/50">
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All Events' : t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            className="bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-orange-500/50" />
          <button onClick={fetchNotifications} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg text-xs font-mono hover:bg-orange-500/20 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-orange-950/20 border-b border-orange-500/15">
            <tr>
              {['Severity', 'Event Type', 'Title', 'IP Address', 'Attack Type', 'Timestamp'].map(h => (
                <th key={h} className="text-left p-3 text-[10px] font-mono font-bold text-orange-400/70 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
                  <span className="text-orange-400 font-mono text-xs">Loading alerts...</span>
                </div>
              </td></tr>
            ) : notifications.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-600 font-mono text-sm">No notifications found</td></tr>
            ) : notifications.map((n, i) => {
              const s = sc(n.severity);
              return (
                <tr key={n.id || i} onClick={() => setSelectedNotif(n)}
                  className="hover:bg-orange-500/5 cursor-pointer transition-colors">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${s.bg} ${s.text} ${s.border}`}>
                      {(n.severity || 'info').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-[10px] font-mono text-gray-400">
                      {(n.event_type || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="text-white font-mono text-xs truncate max-w-[250px]">{n.title}</p>
                    <p className="text-gray-600 font-mono text-[10px] truncate max-w-[250px]">{n.message}</p>
                  </td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{n.ip_address || '-'}</td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{n.attack_type || '-'}</td>
                  <td className="p-3 text-gray-500 font-mono text-[10px]">{n.created_at ? new Date(n.created_at).toLocaleString() : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-800/50 flex items-center justify-between">
          <span className="text-gray-500 font-mono text-xs">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="px-2.5 py-1 border border-gray-700 text-gray-400 rounded text-xs font-mono disabled:opacity-30 hover:border-orange-500/50 transition-all">
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page < 3 ? i : page + i - 2;
              if (p < 0 || p >= totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2.5 py-1 border rounded text-xs font-mono transition-all ${p === page ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'border-gray-700 text-gray-400 hover:border-orange-500/50'}`}>
                  {p + 1}
                </button>
              );
            })}
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="px-2.5 py-1 border border-gray-700 text-gray-400 rounded text-xs font-mono disabled:opacity-30 hover:border-orange-500/50 transition-all">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedNotif(null)} />
          <div className="relative bg-black rounded-xl border border-orange-500/40 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" style={{ boxShadow: '0 0 40px rgba(255,153,0,0.15)' }}>
            <div className="p-5 border-b border-gray-800/50 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${sc(selectedNotif.severity).dot}`} style={{ boxShadow: `0 0 8px ${selectedNotif.severity === 'critical' ? 'rgba(255,0,0,0.6)' : 'rgba(255,153,0,0.4)'}` }} />
                <div>
                  <h3 className="text-white font-mono font-bold">{selectedNotif.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${sc(selectedNotif.severity).bg} ${sc(selectedNotif.severity).text} ${sc(selectedNotif.severity).border}`}>
                      {selectedNotif.severity?.toUpperCase()}
                    </span>
                    <span className="text-gray-500 font-mono text-[10px]">{selectedNotif.event_type?.replace(/_/g, ' ')}</span>
                    <span className="text-gray-600 font-mono text-[10px]">{new Date(selectedNotif.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedNotif(null)} className="text-gray-500 hover:text-white p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-gray-300 font-mono text-sm">{selectedNotif.message}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: 'IP Address', value: selectedNotif.ip_address },
                  { label: 'Attack Type', value: selectedNotif.attack_type },
                  { label: 'Threat Level', value: selectedNotif.threat_level },
                  { label: 'File Name', value: selectedNotif.file_name },
                  { label: 'Scan ID', value: selectedNotif.scan_id },
                  { label: 'User ID', value: selectedNotif.user_id },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-900/30 border border-gray-800/50 rounded-lg">
                    <span className="text-gray-500 font-mono text-[10px] uppercase">{item.label}</span>
                    <span className="text-white font-mono text-xs">{item.value}</span>
                  </div>
                ))}
              </div>
              {selectedNotif.geo_location && Object.keys(selectedNotif.geo_location).length > 0 && (
                <div>
                  <h4 className="text-gray-400 font-mono text-xs uppercase mb-2">Geo Location</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedNotif.geo_location).map(([k, v], i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-900/30 border border-gray-800/50 rounded-lg">
                        <span className="text-gray-500 font-mono text-[10px]">{k}</span>
                        <span className="text-white font-mono text-[10px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedNotif.metadata && Object.keys(selectedNotif.metadata).length > 0 && (
                <div>
                  <h4 className="text-gray-400 font-mono text-xs uppercase mb-2">Metadata</h4>
                  <pre className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg text-gray-400 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedNotif.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAlertsHistory;
