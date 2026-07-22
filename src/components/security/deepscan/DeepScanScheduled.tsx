import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  CalendarIcon, DownloadIcon, RefreshIcon, TrashIcon, ClockIcon, TrendingUpIcon,
  WindowsIcon, AppleIcon, LinuxIcon, CheckCircleIcon, PlayIcon, ZapIcon,
  ScanSchedule, threatScoreColor, getThreatColor, getStatusColor,
} from './DeepScanIcons';

interface Props {
  userId: string;
}

const DeepScanScheduled: React.FC<Props> = ({ userId }) => {
  const [schedules, setSchedules] = useState<ScanSchedule[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlatform, setNewPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [newFrequency, setNewFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [newHostname, setNewHostname] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [installerScript, setInstallerScript] = useState<{ script: string; filename: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, trendRes] = await Promise.all([
        supabase.functions.invoke('deep-scan-analyzer', { body: { action: 'get_schedules', user_id: userId } }),
        supabase.functions.invoke('deep-scan-analyzer', { body: { action: 'get_trends', user_id: userId } }),
      ]);
      if (schedRes.data?.schedules) setSchedules(schedRes.data.schedules);
      if (trendRes.data?.trends) setTrends(trendRes.data.trends);
    } catch (e) { console.error('[Scheduled] fetch error:', e); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createSchedule = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'save_schedule', user_id: userId, platform: newPlatform, frequency: newFrequency, hostname: newHostname || 'My Computer' }
      });
      if (data?.success) {
        toast.success('Schedule created! Download the installer to set up automatic scanning.');
        if (data.installer) setInstallerScript({ script: data.installer, filename: data.filename });
        setShowCreate(false);
        fetchData();
      } else {
        toast.error('Failed: ' + (data?.error || error?.message || 'Unknown'));
      }
    } catch (e: any) { toast.error('Error: ' + e.message); }
    setCreating(false);
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    try {
      await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'update_schedule', schedule_id: id, enabled: !enabled }
      });
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
      toast.success(enabled ? 'Schedule paused' : 'Schedule resumed');
    } catch (e) { toast.error('Failed to update'); }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await supabase.functions.invoke('deep-scan-analyzer', { body: { action: 'delete_schedule', schedule_id: id } });
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule deleted');
    } catch (e) { toast.error('Failed to delete'); }
  };

  const downloadInstaller = () => {
    if (!installerScript) return;
    const blob = new Blob([installerScript.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = installerScript.filename; a.click();
    URL.revokeObjectURL(url);
    toast.success('Installer downloaded');
  };

  const PlatformIcon = ({ p, size = 16 }: { p: string; size?: number }) => {
    if (p === 'windows') return <WindowsIcon size={size} className="text-blue-400" />;
    if (p === 'macos') return <AppleIcon size={size} className="text-gray-300" />;
    return <LinuxIcon size={size} className="text-orange-400" />;
  };

  // Trend chart - simple SVG sparkline
  const trendData = trends.slice(0, 30).reverse();
  const maxScore = Math.max(10, ...trendData.map(t => t.threat_score || 0));
  const chartWidth = 600;
  const chartHeight = 120;
  const points = trendData.map((t, i) => {
    const x = (i / Math.max(1, trendData.length - 1)) * chartWidth;
    const y = chartHeight - ((t.threat_score || 0) / maxScore) * (chartHeight - 10);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-mono font-bold flex items-center gap-2">
          <CalendarIcon size={18} className="text-red-400" /> Scheduled Scans
        </h3>
        <div className="flex gap-2">
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/50 border border-gray-800 text-gray-400 rounded-lg hover:text-white transition-all font-mono text-xs">
            <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/25 transition-all font-mono text-xs font-bold">
            <CalendarIcon size={14} /> New Schedule
          </button>
        </div>
      </div>

      {/* Create Schedule Form */}
      {showCreate && (
        <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4">Create Scheduled Scan</h4>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-gray-400 font-mono text-xs block mb-2">Platform</label>
              <div className="flex gap-2">
                {(['windows', 'macos', 'linux'] as const).map(p => (
                  <button key={p} onClick={() => setNewPlatform(p)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-all ${newPlatform === p ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-gray-900/30 border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                    <PlatformIcon p={p} size={14} /> {p === 'macos' ? 'macOS' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 font-mono text-xs block mb-2">Frequency</label>
              <div className="flex gap-2">
                {(['hourly', 'daily', 'weekly'] as const).map(f => (
                  <button key={f} onClick={() => setNewFrequency(f)} className={`px-3 py-2 rounded-lg border font-mono text-xs transition-all ${newFrequency === f ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-gray-900/30 border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 font-mono text-xs block mb-2">Hostname (optional)</label>
              <input type="text" value={newHostname} onChange={e => setNewHostname(e.target.value)} placeholder="My Computer" className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-red-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createSchedule} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/25 transition-all font-mono text-sm font-bold disabled:opacity-50">
              {creating ? <RefreshIcon size={16} className="animate-spin" /> : <ZapIcon size={16} />}
              {creating ? 'Creating...' : 'Create & Generate Installer'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-900/50 border border-gray-800 text-gray-400 rounded-lg hover:text-white transition-all font-mono text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Installer Download */}
      {installerScript && (
        <div className="rounded-xl border border-green-500/30 bg-black/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-green-400 font-mono font-bold flex items-center gap-2"><CheckCircleIcon size={18} /> Agent Installer Ready</h4>
            <button onClick={() => setInstallerScript(null)} className="text-gray-500 hover:text-white text-xs font-mono">Dismiss</button>
          </div>
          <p className="text-gray-400 text-sm mb-3">Download and run this installer to set up automatic scanning on your machine.</p>
          <button onClick={downloadInstaller} className="flex items-center gap-2 px-4 py-2 bg-green-500/15 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/25 transition-all font-mono text-sm font-bold">
            <DownloadIcon size={16} /> Download {installerScript.filename}
          </button>
          <div className="mt-3 bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-[200px] overflow-auto">
            <pre className="text-green-400/70 font-mono text-[10px] whitespace-pre-wrap">{installerScript.script.slice(0, 1000)}...</pre>
          </div>
        </div>
      )}

      {/* Active Schedules */}
      <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
        <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><ClockIcon size={16} className="text-red-400" /> Active Schedules ({schedules.length})</h4>
        {schedules.length > 0 ? (
          <div className="space-y-3">
            {schedules.map(s => (
              <div key={s.id} className={`p-4 rounded-lg border ${s.enabled ? 'border-green-500/20 bg-green-500/5' : 'border-gray-800 bg-gray-900/30 opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <PlatformIcon p={s.platform} size={24} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm font-bold">{s.hostname || 'Unknown Host'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${s.enabled ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-gray-500 border-gray-700 bg-gray-800'}`}>
                        {s.enabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 border border-gray-700 bg-gray-900">{s.frequency.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-gray-500 font-mono text-xs">{s.platform}</span>
                      {s.next_scan_at && <span className="text-gray-600 font-mono text-xs">Next: {new Date(s.next_scan_at).toLocaleString()}</span>}
                      {s.last_scan_at && <span className="text-gray-600 font-mono text-xs">Last: {new Date(s.last_scan_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleSchedule(s.id, s.enabled)} className={`p-2 rounded-lg border transition-all ${s.enabled ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`} title={s.enabled ? 'Pause' : 'Resume'}>
                      <PlayIcon size={14} />
                    </button>
                    <button onClick={() => deleteSchedule(s.id)} className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 font-mono text-sm">No scheduled scans</p>
            <p className="text-gray-600 font-mono text-xs mt-1">Create a schedule to run automatic scans</p>
          </div>
        )}
      </div>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><TrendingUpIcon size={16} className="text-red-400" /> Threat Score Trend</h4>
          <div className="relative overflow-hidden">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full h-auto" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map(v => {
                const y = chartHeight - (v / maxScore) * (chartHeight - 10);
                return (
                  <g key={v}>
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="rgba(100,100,100,0.15)" strokeWidth="1" />
                    <text x={chartWidth + 5} y={y + 3} fill="rgba(100,100,100,0.5)" fontSize="8" fontFamily="monospace">{v}</text>
                  </g>
                );
              })}
              {/* Area fill */}
              {trendData.length > 1 && (
                <polygon
                  points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
                  fill="url(#trendGradient)"
                  opacity="0.3"
                />
              )}
              {/* Line */}
              {trendData.length > 1 && (
                <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {/* Dots */}
              {trendData.map((t, i) => {
                const x = (i / Math.max(1, trendData.length - 1)) * chartWidth;
                const y = chartHeight - ((t.threat_score || 0) / maxScore) * (chartHeight - 10);
                return (
                  <circle key={i} cx={x} cy={y} r="3" fill={threatScoreColor(t.threat_score || 0)} stroke="black" strokeWidth="1" />
                );
              })}
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            {/* X-axis labels */}
            <div className="flex justify-between mt-1">
              {trendData.length > 0 && (
                <>
                  <span className="text-gray-600 font-mono text-[9px]">{new Date(trendData[0]?.created_at).toLocaleDateString()}</span>
                  <span className="text-gray-600 font-mono text-[9px]">{new Date(trendData[trendData.length - 1]?.created_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-500 font-mono text-[10px]">Threat Score</span>
            </div>
            <span className="text-gray-600 font-mono text-[10px]">{trendData.length} scans over time</span>
            {trendData.length >= 2 && (
              <span className={`font-mono text-[10px] ${trendData[trendData.length - 1]?.threat_score <= trendData[trendData.length - 2]?.threat_score ? 'text-green-400' : 'text-red-400'}`}>
                {trendData[trendData.length - 1]?.threat_score <= trendData[trendData.length - 2]?.threat_score ? 'Improving' : 'Worsening'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepScanScheduled;
