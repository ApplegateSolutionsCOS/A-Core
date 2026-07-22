import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ThreatProfile {
  ip: string;
  geo: any;
  orgClassification: { isHosting: boolean; isVpn: boolean; isTor: boolean; type: string };
  threatScore: { score: number; factors: string[]; riskLevel: string };
  accessCount: number;
  suspiciousCount: number;
  notificationCount: number;
  blocklisted: boolean;
  lastSeen: string | null;
  firstSeen: string | null;
}

interface ThreatSummary {
  totalUniqueIps: number;
  analyzedIps: number;
  vpnDetected: number;
  proxyDetected: number;
  torDetected: number;
  hostingDetected: number;
  maliciousIps: number;
  blocklistedIps: number;
  totalAccessLogs: number;
  totalNotifications: number;
}

// Inline SVG icons
const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
const AlertIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const EyeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const BanIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
);

const ThreatIntelPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<ThreatProfile[]>([]);
  const [summary, setSummary] = useState<ThreatSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ThreatProfile | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'vpn' | 'tor' | 'hosting' | 'malicious' | 'blocklisted'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'access' | 'recent'>('score');

  const fetchThreatIntel = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'threat_intel' }
      });
      if (data?.success) {
        setProfiles(data.profiles || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Threat intel fetch error:', e);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => { fetchThreatIntel(); }, [fetchThreatIntel]);

  const handleBlock = async (ip: string) => {
    try {
      const { data } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'manage_blocklist', operation: 'add', ip_address: ip, reason: 'Blocked via Threat Intel', blocked_by: 'admin' }
      });
      if (data?.success) {
        toast.success('IP blocked: ' + ip);
        fetchThreatIntel();
      }
    } catch (e) { toast.error('Failed to block IP'); }
  };

  const filteredProfiles = profiles.filter(p => {
    if (filterType === 'vpn') return p.orgClassification.isVpn;
    if (filterType === 'tor') return p.orgClassification.isTor;
    if (filterType === 'hosting') return p.orgClassification.isHosting;
    if (filterType === 'malicious') return p.threatScore.score >= 60;
    if (filterType === 'blocklisted') return p.blocklisted;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'access') return b.accessCount - a.accessCount;
    if (sortBy === 'recent') return (b.lastSeen || '').localeCompare(a.lastSeen || '');
    return b.threatScore.score - a.threatScore.score;
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', bar: '#ef4444' };
      case 'high': return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', bar: '#f97316' };
      case 'medium': return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', bar: '#eab308' };
      case 'low': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', bar: '#3b82f6' };
      default: return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', bar: '#22c55e' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tor': return <span className="text-purple-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded">TOR</span>;
      case 'vpn': return <span className="text-blue-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded">VPN</span>;
      case 'hosting': return <span className="text-cyan-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">HOST</span>;
      default: return <span className="text-gray-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-gray-500/10 border border-gray-500/30 rounded">ISP</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-orange-500/30 bg-black/80 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
          <span className="text-orange-400 font-mono text-sm animate-pulse">Analyzing threat intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-orange-500/40 bg-black/80 p-6" style={{ boxShadow: '0 0 20px rgba(255,153,0,0.1)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <EyeIcon size={20} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Threat Intelligence</h3>
              <p className="text-orange-400/60 font-mono text-xs">IpInfo-Powered IP Analysis & Risk Scoring</p>
            </div>
          </div>
          <button onClick={fetchThreatIntel} disabled={isRefreshing} className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all font-mono text-xs disabled:opacity-50">
            <RefreshIcon size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Unique IPs', value: summary.totalUniqueIps, color: 'text-white' },
              { label: 'VPN/Proxy', value: summary.vpnDetected + summary.proxyDetected, color: 'text-blue-400' },
              { label: 'Tor Nodes', value: summary.torDetected, color: 'text-purple-400' },
              { label: 'Malicious', value: summary.maliciousIps, color: 'text-red-400' },
              { label: 'Blocklisted', value: summary.blocklistedIps, color: 'text-orange-400' },
            ].map((card, i) => (
              <div key={i} className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg text-center">
                <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase">{card.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all' as const, label: 'All IPs' },
          { id: 'malicious' as const, label: 'Malicious' },
          { id: 'vpn' as const, label: 'VPN/Proxy' },
          { id: 'tor' as const, label: 'Tor' },
          { id: 'hosting' as const, label: 'Hosting' },
          { id: 'blocklisted' as const, label: 'Blocklisted' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilterType(f.id)} className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${filterType === f.id ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
            {f.label} {f.id !== 'all' && <span className="ml-1 text-gray-600">({filteredProfiles.length})</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-gray-600 font-mono text-xs">Sort:</span>
          {[
            { id: 'score' as const, label: 'Risk' },
            { id: 'access' as const, label: 'Activity' },
            { id: 'recent' as const, label: 'Recent' },
          ].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)} className={`px-2 py-1 rounded font-mono text-[10px] ${sortBy === s.id ? 'bg-orange-500/10 text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Threat Profiles Table */}
      <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-900/60 border-b border-gray-800">
              <tr>
                <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">IP Address</th>
                <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">Location</th>
                <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">Organization</th>
                <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Type</th>
                <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Risk Score</th>
                <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Requests</th>
                <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Suspicious</th>
                <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredProfiles.length > 0 ? filteredProfiles.map((profile, i) => {
                const risk = getRiskColor(profile.threatScore.riskLevel);
                return (
                  <tr key={i} className={`hover:bg-orange-500/5 transition-colors cursor-pointer ${selectedProfile?.ip === profile.ip ? 'bg-orange-500/10' : ''}`} onClick={() => setSelectedProfile(selectedProfile?.ip === profile.ip ? null : profile)}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {profile.blocklisted && <BanIcon size={14} className="text-red-400 flex-shrink-0" />}
                        <span className="text-white font-mono text-sm">{profile.ip}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-400 font-mono text-xs">
                        {profile.geo?.city || '?'}, {profile.geo?.country || '?'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-500 font-mono text-xs truncate max-w-[200px] block">{profile.geo?.org || 'Unknown'}</span>
                    </td>
                    <td className="p-3 text-center">{getTypeIcon(profile.orgClassification.type)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${profile.threatScore.score}%`, background: risk.bar }} />
                        </div>
                        <span className={`font-mono text-xs font-bold ${risk.text}`}>{profile.threatScore.score}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center"><span className="text-gray-300 font-mono text-xs">{profile.accessCount}</span></td>
                    <td className="p-3 text-center">
                      <span className={`font-mono text-xs font-bold ${profile.suspiciousCount > 0 ? 'text-red-400' : 'text-gray-600'}`}>{profile.suspiciousCount}</span>
                    </td>
                    <td className="p-3 text-center">
                      {!profile.blocklisted && profile.threatScore.score >= 40 && (
                        <button onClick={(e) => { e.stopPropagation(); handleBlock(profile.ip); }} className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono hover:bg-red-500/20 transition-all">
                          Block
                        </button>
                      )}
                      {profile.blocklisted && (
                        <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono">BLOCKED</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="p-8 text-center"><ShieldIcon size={32} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No threat data available</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Profile Detail */}
      {selectedProfile && (
        <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-mono font-bold flex items-center gap-2">
              <AlertIcon size={16} className="text-orange-400" />
              IP Detail: {selectedProfile.ip}
            </h4>
            <button onClick={() => setSelectedProfile(null)} className="text-gray-500 hover:text-gray-300 font-mono text-xs">Close</button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <h5 className="text-orange-400 font-mono text-xs uppercase tracking-wider">Geolocation</h5>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between"><span className="text-gray-500">City:</span><span className="text-gray-300">{selectedProfile.geo?.city || 'Unknown'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Region:</span><span className="text-gray-300">{selectedProfile.geo?.region || 'Unknown'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Country:</span><span className="text-gray-300">{selectedProfile.geo?.country || 'Unknown'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Coordinates:</span><span className="text-gray-300">{selectedProfile.geo?.loc || '0,0'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Timezone:</span><span className="text-gray-300">{selectedProfile.geo?.timezone || 'Unknown'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Organization:</span><span className="text-gray-300 truncate max-w-[150px]">{selectedProfile.geo?.org || 'Unknown'}</span></div>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="text-orange-400 font-mono text-xs uppercase tracking-wider">Classification</h5>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between"><span className="text-gray-500">Type:</span>{getTypeIcon(selectedProfile.orgClassification.type)}</div>
                <div className="flex justify-between"><span className="text-gray-500">VPN:</span><span className={selectedProfile.orgClassification.isVpn ? 'text-blue-400' : 'text-gray-600'}>{selectedProfile.orgClassification.isVpn ? 'Detected' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tor:</span><span className={selectedProfile.orgClassification.isTor ? 'text-purple-400' : 'text-gray-600'}>{selectedProfile.orgClassification.isTor ? 'Detected' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hosting:</span><span className={selectedProfile.orgClassification.isHosting ? 'text-cyan-400' : 'text-gray-600'}>{selectedProfile.orgClassification.isHosting ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Blocklisted:</span><span className={selectedProfile.blocklisted ? 'text-red-400' : 'text-gray-600'}>{selectedProfile.blocklisted ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="text-orange-400 font-mono text-xs uppercase tracking-wider">Risk Assessment</h5>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(100,100,100,0.2)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={getRiskColor(selectedProfile.threatScore.riskLevel).bar} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${selectedProfile.threatScore.score * 2.64} 264`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold font-mono ${getRiskColor(selectedProfile.threatScore.riskLevel).text}`}>{selectedProfile.threatScore.score}</span>
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${getRiskColor(selectedProfile.threatScore.riskLevel).bg} ${getRiskColor(selectedProfile.threatScore.riskLevel).text} ${getRiskColor(selectedProfile.threatScore.riskLevel).border} border`}>
                    {selectedProfile.threatScore.riskLevel}
                  </span>
                </div>
              </div>
              {selectedProfile.threatScore.factors.length > 0 && (
                <div className="space-y-1">
                  {selectedProfile.threatScore.factors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatIntelPanel;
