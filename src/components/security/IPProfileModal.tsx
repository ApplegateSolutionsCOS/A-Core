import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface IPProfile {
  ip: string;
  geo: any;
  classification: { isHosting: boolean; isVpn: boolean; isTor: boolean; type: string };
  threatScore: { score: number; factors: string[]; riskLevel: string };
  isBlocked: boolean;
  blockEntries: any[];
  firstSeen: string | null;
  lastSeen: string | null;
  totalRequests: number;
  suspiciousRequests: number;
  errorRate: number;
  behavior: {
    hourDistribution: { hour: number; count: number }[];
    methodDistribution: Record<string, number>;
    topEndpoints: { endpoint: string; count: number }[];
    statusDistribution: Record<string, number>;
    dailyVolume: { date: string; count: number }[];
  };
  recentLogs: any[];
  notifications: any[];
}

interface Props {
  ip: string;
  onClose: () => void;
}

const IPProfileModal: React.FC<Props> = ({ ip, onClose }) => {
  const [profile, setProfile] = useState<IPProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'logs' | 'behavior' | 'notifications'>('overview');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [ip]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'ip_profile', ip }
      });
      if (!error && data?.success) setProfile(data.profile);
      else toast.error('Failed to load IP profile');
    } catch (e) { toast.error('Error loading profile'); }
    setIsLoading(false);
  };

  const handleBlock = async () => {
    setActionLoading('block');
    try {
      const { data } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'manage_blocklist', operation: 'add', ip_address: ip, reason: 'Blocked via IP Profile', blocked_by: 'admin' }
      });
      if (data?.success) { toast.success('IP blocked: ' + ip); fetchProfile(); }
    } catch { toast.error('Failed to block IP'); }
    setActionLoading('');
  };

  const handleUnblock = async () => {
    setActionLoading('unblock');
    try {
      const { data } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'manage_blocklist', operation: 'remove', ip_address: ip }
      });
      if (data?.success) { toast.success('IP unblocked: ' + ip); fetchProfile(); }
    } catch { toast.error('Failed to unblock IP'); }
    setActionLoading('');
  };

  const getRiskColor = (level: string) => {
    if (level === 'critical') return '#ef4444';
    if (level === 'high') return '#f97316';
    if (level === 'medium') return '#eab308';
    if (level === 'low') return '#22c55e';
    return '#6b7280';
  };

  const maxHour = profile ? Math.max(...profile.behavior.hourDistribution.map(h => h.count), 1) : 1;
  const maxDaily = profile ? Math.max(...profile.behavior.dailyVolume.map(d => d.count), 1) : 1;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border border-orange-500/50 rounded-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" style={{ boxShadow: '0 0 60px rgba(255,153,0,0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-lg">IP Profile: <span className="text-orange-400">{ip}</span></h3>
              {profile?.geo && <p className="text-gray-500 font-mono text-xs">{profile.geo.city}, {profile.geo.region}, {profile.geo.country} | {profile.geo.org}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
            <span className="ml-3 text-orange-400 font-mono text-sm animate-pulse">Loading IP profile via IpInfo...</span>
          </div>
        ) : profile ? (
          <>
            {/* Section Tabs */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-gray-800/50 flex-shrink-0">
              {(['overview', 'behavior', 'logs', 'notifications'] as const).map(s => (
                <button key={s} onClick={() => setActiveSection(s)} className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${activeSection === s ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>
                  {s === 'overview' ? 'Overview' : s === 'behavior' ? 'Behavior' : s === 'logs' ? 'Access Logs' : 'Alerts'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* ═══ OVERVIEW ═══ */}
              {activeSection === 'overview' && (
                <>
                  {/* Threat Score + Actions */}
                  <div className="grid lg:grid-cols-[1fr_300px] gap-5">
                    <div className="space-y-4">
                      {/* Threat Score */}
                      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-mono font-bold">Threat Assessment</h4>
                          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold border" style={{ color: getRiskColor(profile.threatScore.riskLevel), borderColor: getRiskColor(profile.threatScore.riskLevel) + '50', backgroundColor: getRiskColor(profile.threatScore.riskLevel) + '15' }}>
                            {profile.threatScore.riskLevel.toUpperCase()} - {profile.threatScore.score}/100
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${profile.threatScore.score}%`, background: `linear-gradient(90deg, ${getRiskColor(profile.threatScore.riskLevel)}80, ${getRiskColor(profile.threatScore.riskLevel)})` }} />
                        </div>
                        {profile.threatScore.factors.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {profile.threatScore.factors.map((f, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-mono text-red-400">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* IpInfo Details */}
                      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                        <h4 className="text-white font-mono font-bold mb-3">IpInfo Geolocation Data</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Hostname', value: profile.geo?.hostname || 'N/A' },
                            { label: 'City', value: profile.geo?.city || 'Unknown' },
                            { label: 'Region', value: profile.geo?.region || 'Unknown' },
                            { label: 'Country', value: profile.geo?.country || 'XX' },
                            { label: 'Coordinates', value: profile.geo?.loc || 'N/A' },
                            { label: 'Postal', value: profile.geo?.postal || 'N/A' },
                            { label: 'Timezone', value: profile.geo?.timezone || 'N/A' },
                            { label: 'Organization', value: profile.geo?.org || 'Unknown' },
                          ].map((item, i) => (
                            <div key={i} className="p-2 bg-gray-800/50 rounded-lg">
                              <span className="text-gray-500 font-mono text-[10px] uppercase block">{item.label}</span>
                              <span className="text-gray-300 font-mono text-xs truncate block">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        {/* ASN / Company / Abuse */}
                        {(profile.geo?.asn || profile.geo?.company || profile.geo?.abuse) && (
                          <div className="mt-3 space-y-2">
                            {profile.geo?.asn && (
                              <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <span className="text-blue-400 font-mono text-[10px] font-bold">ASN</span>
                                <p className="text-gray-300 font-mono text-xs">{profile.geo.asn.asn} - {profile.geo.asn.name} ({profile.geo.asn.type})</p>
                              </div>
                            )}
                            {profile.geo?.company && (
                              <div className="p-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                                <span className="text-purple-400 font-mono text-[10px] font-bold">Company</span>
                                <p className="text-gray-300 font-mono text-xs">{profile.geo.company.name} ({profile.geo.company.type})</p>
                              </div>
                            )}
                            {profile.geo?.abuse && (
                              <div className="p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                                <span className="text-red-400 font-mono text-[10px] font-bold">Abuse Contact</span>
                                <p className="text-gray-300 font-mono text-xs">{profile.geo.abuse.email || profile.geo.abuse.name || 'N/A'}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Privacy flags */}
                        {profile.geo?.privacy && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {profile.geo.privacy.vpn && <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] font-mono text-blue-400 font-bold">VPN</span>}
                            {profile.geo.privacy.proxy && <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-[10px] font-mono text-yellow-400 font-bold">PROXY</span>}
                            {profile.geo.privacy.tor && <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-[10px] font-mono text-purple-400 font-bold">TOR</span>}
                            {profile.geo.privacy.relay && <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-[10px] font-mono text-cyan-400 font-bold">RELAY</span>}
                            {profile.geo.privacy.hosting && <span className="px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-[10px] font-mono text-orange-400 font-bold">HOSTING</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Stats + Actions */}
                    <div className="space-y-4">
                      {/* Quick Stats */}
                      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
                        {[
                          { label: 'Total Requests', value: profile.totalRequests, color: 'text-cyan-400' },
                          { label: 'Suspicious', value: profile.suspiciousRequests, color: profile.suspiciousRequests > 0 ? 'text-red-400' : 'text-gray-400' },
                          { label: 'Error Rate', value: profile.errorRate + '%', color: profile.errorRate > 20 ? 'text-red-400' : 'text-gray-400' },
                          { label: 'First Seen', value: profile.firstSeen ? new Date(profile.firstSeen).toLocaleDateString() : 'N/A', color: 'text-gray-400' },
                          { label: 'Last Seen', value: profile.lastSeen ? new Date(profile.lastSeen).toLocaleString() : 'N/A', color: 'text-gray-400' },
                          { label: 'Alerts', value: profile.notifications.length, color: profile.notifications.length > 0 ? 'text-orange-400' : 'text-gray-400' },
                        ].map((s, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-gray-500 font-mono text-xs">{s.label}</span>
                            <span className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Classification */}
                      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                        <h5 className="text-white font-mono text-xs font-bold mb-2">Classification</h5>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border inline-block ${
                          profile.classification.type === 'tor' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                          profile.classification.type === 'vpn' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                          profile.classification.type === 'hosting' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' :
                          'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }`}>
                          {profile.classification.type.toUpperCase()}
                        </span>
                      </div>

                      {/* Action Panel */}
                      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-2">
                        <h5 className="text-orange-400 font-mono text-xs font-bold mb-2">Actions</h5>
                        {profile.isBlocked ? (
                          <button onClick={handleUnblock} disabled={!!actionLoading} className="w-full px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-mono text-xs font-bold disabled:opacity-50">
                            {actionLoading === 'unblock' ? 'Unblocking...' : 'Unblock IP'}
                          </button>
                        ) : (
                          <button onClick={handleBlock} disabled={!!actionLoading} className="w-full px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-mono text-xs font-bold disabled:opacity-50">
                            {actionLoading === 'block' ? 'Blocking...' : 'Block IP'}
                          </button>
                        )}
                        <button onClick={() => { navigator.clipboard.writeText(ip); toast.success('IP copied'); }} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-all font-mono text-xs">
                          Copy IP Address
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ═══ BEHAVIOR ═══ */}
              {activeSection === 'behavior' && (
                <div className="space-y-5">
                  {/* Hour Distribution */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                    <h4 className="text-white font-mono font-bold mb-3">Request Frequency by Hour (UTC)</h4>
                    <div className="flex items-end gap-0.5 h-24">
                      {profile.behavior.hourDistribution.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center group relative">
                          <div className="w-full rounded-t transition-all" style={{ height: `${(h.count / maxHour) * 100}%`, minHeight: h.count > 0 ? '2px' : '0', background: h.count > maxHour * 0.7 ? '#ef4444' : h.count > maxHour * 0.3 ? '#f59e0b' : '#22c55e' }} />
                          {i % 4 === 0 && <span className="text-[8px] text-gray-600 font-mono mt-1">{h.hour}h</span>}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-black border border-gray-700 rounded text-[9px] font-mono text-white whitespace-nowrap z-10">
                            {h.hour}:00 - {h.count} req
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Volume */}
                  {profile.behavior.dailyVolume.length > 0 && (
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                      <h4 className="text-white font-mono font-bold mb-3">Daily Request Volume</h4>
                      <div className="flex items-end gap-1 h-20">
                        {profile.behavior.dailyVolume.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center group relative">
                            <div className="w-full rounded-t bg-orange-500/60 transition-all" style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '2px' : '0' }} />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-black border border-gray-700 rounded text-[9px] font-mono text-white whitespace-nowrap z-10">
                              {d.date}: {d.count}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-gray-600 font-mono">{profile.behavior.dailyVolume[0]?.date}</span>
                        <span className="text-[8px] text-gray-600 font-mono">{profile.behavior.dailyVolume[profile.behavior.dailyVolume.length - 1]?.date}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid lg:grid-cols-3 gap-4">
                    {/* Method Distribution */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                      <h5 className="text-white font-mono text-xs font-bold mb-3">HTTP Methods</h5>
                      {Object.entries(profile.behavior.methodDistribution).sort(([,a],[,b]) => (b as number) - (a as number)).map(([method, count], i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <span className="text-cyan-400 font-mono text-xs">{method}</span>
                          <span className="text-gray-400 font-mono text-xs">{count as number}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status Distribution */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                      <h5 className="text-white font-mono text-xs font-bold mb-3">Status Codes</h5>
                      {Object.entries(profile.behavior.statusDistribution).sort(([,a],[,b]) => (b as number) - (a as number)).map(([code, count], i) => {
                        const c = parseInt(code);
                        const color = c < 300 ? 'text-green-400' : c < 400 ? 'text-blue-400' : c < 500 ? 'text-yellow-400' : 'text-red-400';
                        return (
                          <div key={i} className="flex items-center justify-between py-1">
                            <span className={`font-mono text-xs ${color}`}>{code}</span>
                            <span className="text-gray-400 font-mono text-xs">{count as number}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Top Endpoints */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                      <h5 className="text-white font-mono text-xs font-bold mb-3">Top Endpoints</h5>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {profile.behavior.topEndpoints.map((ep, i) => (
                          <div key={i} className="flex items-center justify-between py-1">
                            <span className="text-gray-300 font-mono text-[10px] truncate flex-1 mr-2">{ep.endpoint}</span>
                            <span className="text-gray-500 font-mono text-[10px]">{ep.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ ACCESS LOGS ═══ */}
              {activeSection === 'logs' && (
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
                  <div className="p-3 border-b border-gray-800/50 flex items-center justify-between">
                    <h4 className="text-white font-mono font-bold text-sm">Recent Access Logs ({profile.recentLogs.length})</h4>
                  </div>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-gray-900/80 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-[10px] font-mono font-bold text-orange-400 uppercase">Time</th>
                          <th className="text-left p-2 text-[10px] font-mono font-bold text-orange-400 uppercase">Method</th>
                          <th className="text-left p-2 text-[10px] font-mono font-bold text-orange-400 uppercase">Endpoint</th>
                          <th className="text-center p-2 text-[10px] font-mono font-bold text-orange-400 uppercase">Status</th>
                          <th className="text-center p-2 text-[10px] font-mono font-bold text-orange-400 uppercase">Suspicious</th>
                          <th className="text-left p-2 text-[10px] font-mono font-bold text-orange-400 uppercase">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/30">
                        {profile.recentLogs.map((log, i) => (
                          <tr key={i} className={`hover:bg-orange-500/5 ${log.is_suspicious ? 'bg-red-500/5' : ''}`}>
                            <td className="p-2 text-gray-400 font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="p-2"><span className="text-cyan-400 font-mono text-[10px] font-bold">{log.method}</span></td>
                            <td className="p-2 text-gray-300 font-mono text-[10px] truncate max-w-[200px]">{log.endpoint}</td>
                            <td className="p-2 text-center">
                              <span className={`font-mono text-[10px] font-bold ${log.response_code < 300 ? 'text-green-400' : log.response_code < 400 ? 'text-blue-400' : 'text-red-400'}`}>{log.response_code}</span>
                            </td>
                            <td className="p-2 text-center">
                              {log.is_suspicious && <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-[9px] font-mono text-red-400 font-bold">SUS</span>}
                            </td>
                            <td className="p-2 text-red-400/60 font-mono text-[9px] truncate max-w-[180px]">{log.suspicious_reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ═══ NOTIFICATIONS ═══ */}
              {activeSection === 'notifications' && (
                <div className="space-y-3">
                  <h4 className="text-white font-mono font-bold">Security Notifications ({profile.notifications.length})</h4>
                  {profile.notifications.length > 0 ? profile.notifications.map((n, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${n.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : n.severity === 'high' ? 'border-orange-500/30 bg-orange-500/5' : 'border-gray-800 bg-gray-900/50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${n.severity === 'critical' ? 'bg-red-400' : n.severity === 'high' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                        <span className="text-white font-mono text-sm font-bold">{n.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${n.severity === 'critical' ? 'bg-red-500/10 text-red-400' : n.severity === 'high' ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {n.severity?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400 font-mono text-xs ml-4">{n.message}</p>
                      <div className="flex items-center gap-3 ml-4 mt-1">
                        <span className="text-gray-600 font-mono text-[10px]">{n.event_type}</span>
                        <span className="text-gray-600 font-mono text-[10px]">{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 font-mono text-sm">No security notifications for this IP</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600 font-mono text-sm">Failed to load IP profile</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IPProfileModal;
