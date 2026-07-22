import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface IpRate {
  ip: string;
  total: number;
  suspicious: number;
  ratePerMinute: number;
  ratePerHour: number;
  exceeds: boolean;
  country: string;
  city: string;
  org: string;
  methods: Record<string, number>;
  endpoints: Record<string, number>;
  statusCodes: Record<string, number>;
}

interface BlocklistEntry {
  id: string;
  ip_address: string;
  reason: string;
  blocked_by: string;
  severity: string;
  geo_location: any;
  is_active: boolean;
  created_at: string;
}

interface TimeSeries {
  time: string;
  count: number;
}

// Inline SVG icons
const ActivityIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const BanIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
);
const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);

const RateLimitDashboard: React.FC = () => {
  const [ipRates, setIpRates] = useState<IpRate[]>([]);
  const [violators, setViolators] = useState<IpRate[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeries[]>([]);
  const [blocklist, setBlocklist] = useState<BlocklistEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeWindow, setTimeWindow] = useState(60);
  const [threshold, setThreshold] = useState(60);
  const [activeSubTab, setActiveSubTab] = useState<'rates' | 'blocklist'>('rates');
  const [blockIpInput, setBlockIpInput] = useState('');
  const [blockReasonInput, setBlockReasonInput] = useState('');

  const fetchRateLimits = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [rateRes, blockRes] = await Promise.all([
        supabase.functions.invoke('qcore-security', {
          body: { action: 'get_rate_limits', time_window: timeWindow, threshold }
        }),
        supabase.functions.invoke('qcore-security', {
          body: { action: 'manage_blocklist', operation: 'list' }
        })
      ]);
      if (rateRes.data?.success) {
        setIpRates(rateRes.data.ipRates || []);
        setViolators(rateRes.data.violators || []);
        setTimeSeries(rateRes.data.timeSeries || []);
        setSummary(rateRes.data.summary || null);
      }
      if (blockRes.data?.success) {
        setBlocklist(blockRes.data.blocklist || []);
      }
    } catch (e) {
      console.error('Rate limit fetch error:', e);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [timeWindow, threshold]);

  useEffect(() => { fetchRateLimits(); }, [fetchRateLimits]);

  const handleBlockIp = async (ip: string, reason?: string) => {
    try {
      const { data } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'manage_blocklist', operation: 'add', ip_address: ip, reason: reason || 'Rate limit violation', blocked_by: 'admin' }
      });
      if (data?.success) {
        toast.success('IP blocked: ' + ip);
        setBlockIpInput('');
        setBlockReasonInput('');
        fetchRateLimits();
      }
    } catch (e) { toast.error('Failed to block IP'); }
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      const { data } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'manage_blocklist', operation: 'remove', ip_address: ip }
      });
      if (data?.success) {
        toast.success('IP unblocked: ' + ip);
        fetchRateLimits();
      }
    } catch (e) { toast.error('Failed to unblock IP'); }
  };

  // Simple bar chart renderer
  const maxCount = Math.max(...timeSeries.map(t => t.count), 1);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-orange-500/30 bg-black/80 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
          <span className="text-orange-400 font-mono text-sm animate-pulse">Analyzing request rates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-orange-500/40 bg-black/80 p-6" style={{ boxShadow: '0 0 20px rgba(255,153,0,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <ActivityIcon size={20} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Rate Limiting</h3>
              <p className="text-orange-400/60 font-mono text-xs">Request Rate Analysis & IP Blocklist Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRateLimits} disabled={isRefreshing} className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all font-mono text-xs disabled:opacity-50">
              <RefreshIcon size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Requests', value: summary.totalRequests, color: 'text-white' },
              { label: 'Unique IPs', value: summary.uniqueIps, color: 'text-cyan-400' },
              { label: 'Avg Rate/min', value: summary.avgRatePerMinute, color: 'text-green-400' },
              { label: 'Violators', value: summary.violatorCount, color: 'text-red-400' },
              { label: 'Threshold', value: threshold + '/win', color: 'text-orange-400' },
            ].map((card, i) => (
              <div key={i} className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg text-center">
                <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase">{card.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-mono text-xs">Window:</span>
          {[15, 30, 60, 360].map(w => (
            <button key={w} onClick={() => setTimeWindow(w)} className={`px-2 py-1 rounded font-mono text-[10px] ${timeWindow === w ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500'}`}>
              {w < 60 ? w + 'm' : (w / 60) + 'h'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-mono text-xs">Threshold:</span>
          {[30, 60, 100, 200].map(t => (
            <button key={t} onClick={() => setThreshold(t)} className={`px-2 py-1 rounded font-mono text-[10px] ${threshold === t ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {[
            { id: 'rates' as const, label: 'Rate Monitor' },
            { id: 'blocklist' as const, label: 'IP Blocklist' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveSubTab(t.id)} className={`px-3 py-1.5 rounded-lg font-mono text-xs ${activeSubTab === t.id ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'rates' && (
        <>
          {/* Request Rate Chart */}
          {timeSeries.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4 text-sm">Requests Over Time</h4>
              <div className="flex items-end gap-1 h-32">
                {timeSeries.slice(-40).map((point, i) => {
                  const height = (point.count / maxCount) * 100;
                  const isHigh = point.count > threshold / timeWindow;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[9px] font-mono text-gray-300 whitespace-nowrap z-10">
                        {point.count} req @ {point.time.split('T')[1] || point.time}
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${isHigh ? 'bg-red-500' : 'bg-orange-500/60'}`}
                        style={{ height: `${Math.max(2, height)}%`, minHeight: '2px' }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-600 font-mono text-[9px]">{timeSeries[0]?.time?.split('T')[1] || ''}</span>
                <span className="text-gray-600 font-mono text-[9px]">{timeSeries[timeSeries.length - 1]?.time?.split('T')[1] || ''}</span>
              </div>
            </div>
          )}

          {/* Violators */}
          {violators.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
              <h4 className="text-red-400 font-mono font-bold mb-4 text-sm flex items-center gap-2">
                <BanIcon size={16} /> Rate Limit Violators ({violators.length})
              </h4>
              <div className="space-y-2">
                {violators.map((v, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">{v.ip}</span>
                        <span className="text-red-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded">EXCEEDED</span>
                      </div>
                      <span className="text-gray-500 font-mono text-xs">{v.city}, {v.country} - {v.org}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 font-mono text-lg font-bold">{v.total}</p>
                      <p className="text-gray-600 text-[9px] font-mono">requests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-orange-400 font-mono text-sm font-bold">{v.ratePerMinute}/min</p>
                      <p className="text-gray-600 text-[9px] font-mono">rate</p>
                    </div>
                    <button onClick={() => handleBlockIp(v.ip, 'Rate limit exceeded: ' + v.total + ' requests')} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-mono hover:bg-red-500/20 transition-all">
                      Block
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All IP Rates */}
          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h4 className="text-white font-mono font-bold text-sm">All IP Request Rates ({ipRates.length})</h4>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto darkwave-scrollbar">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-900/60 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-xs font-mono text-orange-400 uppercase">IP</th>
                    <th className="text-left p-3 text-xs font-mono text-orange-400 uppercase">Location</th>
                    <th className="text-center p-3 text-xs font-mono text-orange-400 uppercase">Total</th>
                    <th className="text-center p-3 text-xs font-mono text-orange-400 uppercase">Rate/min</th>
                    <th className="text-center p-3 text-xs font-mono text-orange-400 uppercase">Suspicious</th>
                    <th className="text-center p-3 text-xs font-mono text-orange-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {ipRates.map((rate, i) => (
                    <tr key={i} className={`hover:bg-orange-500/5 ${rate.exceeds ? 'bg-red-500/5' : ''}`}>
                      <td className="p-3"><span className="text-white font-mono text-xs">{rate.ip}</span></td>
                      <td className="p-3"><span className="text-gray-400 font-mono text-xs">{rate.city}, {rate.country}</span></td>
                      <td className="p-3 text-center"><span className="text-gray-300 font-mono text-xs">{rate.total}</span></td>
                      <td className="p-3 text-center"><span className={`font-mono text-xs font-bold ${rate.exceeds ? 'text-red-400' : 'text-green-400'}`}>{rate.ratePerMinute}</span></td>
                      <td className="p-3 text-center"><span className={`font-mono text-xs ${rate.suspicious > 0 ? 'text-red-400' : 'text-gray-600'}`}>{rate.suspicious}</span></td>
                      <td className="p-3 text-center">
                        {rate.exceeds ? (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono">EXCEEDED</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-[10px] font-mono">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'blocklist' && (
        <>
          {/* Add to Blocklist */}
          <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold mb-4 text-sm flex items-center gap-2">
              <PlusIcon size={16} className="text-red-400" /> Add IP to Blocklist
            </h4>
            <div className="flex gap-3">
              <input
                type="text" value={blockIpInput} onChange={e => setBlockIpInput(e.target.value)}
                placeholder="IP Address (e.g. 203.0.113.42)"
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-red-500/50"
              />
              <input
                type="text" value={blockReasonInput} onChange={e => setBlockReasonInput(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-red-500/50"
              />
              <button
                onClick={() => blockIpInput && handleBlockIp(blockIpInput, blockReasonInput || 'Manual block')}
                disabled={!blockIpInput}
                className="px-4 py-2 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg font-mono text-sm hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                Block IP
              </button>
            </div>
          </div>

          {/* Blocklist Table */}
          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h4 className="text-white font-mono font-bold text-sm">IP Blocklist ({blocklist.length})</h4>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto darkwave-scrollbar">
              {blocklist.length > 0 ? (
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-900/60 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-xs font-mono text-orange-400 uppercase">IP Address</th>
                      <th className="text-left p-3 text-xs font-mono text-orange-400 uppercase">Location</th>
                      <th className="text-left p-3 text-xs font-mono text-orange-400 uppercase">Reason</th>
                      <th className="text-center p-3 text-xs font-mono text-orange-400 uppercase">Status</th>
                      <th className="text-left p-3 text-xs font-mono text-orange-400 uppercase">Blocked</th>
                      <th className="text-center p-3 text-xs font-mono text-orange-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {blocklist.map((entry, i) => (
                      <tr key={i} className="hover:bg-red-500/5">
                        <td className="p-3"><span className="text-white font-mono text-xs">{entry.ip_address}</span></td>
                        <td className="p-3"><span className="text-gray-400 font-mono text-xs">{entry.geo_location?.city || '?'}, {entry.geo_location?.country || '?'}</span></td>
                        <td className="p-3"><span className="text-gray-500 font-mono text-xs truncate max-w-[200px] block">{entry.reason}</span></td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${entry.is_active ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                            {entry.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="p-3"><span className="text-gray-600 font-mono text-[10px]">{new Date(entry.created_at).toLocaleDateString()}</span></td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleUnblockIp(entry.ip_address)} className="p-1.5 bg-gray-900 border border-gray-700 text-gray-400 rounded hover:text-red-400 hover:border-red-500/30 transition-all">
                            <TrashIcon size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center">
                  <BanIcon size={32} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 font-mono text-sm">No IPs in blocklist</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RateLimitDashboard;
