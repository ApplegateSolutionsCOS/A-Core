import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  ActivityIcon, ShieldIcon, AlertIcon, GlobeIcon, CpuIcon, WifiIcon, RefreshIcon,
  VolumeIcon, VolumeMuteIcon, CheckCircleIcon, ClockIcon, threatScoreColor,
} from './DeepScanIcons';

interface LiveEvent {
  id: string;
  scan_token: string;
  user_id: string;
  event_type: string;
  event_data: any;
  severity: string;
  created_at: string;
}

interface Props {
  userId: string;
}

const DeepScanLiveMonitor: React.FC<Props> = ({ userId }) => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [processTree, setProcessTree] = useState<any[]>([]);
  const [liveConnections, setLiveConnections] = useState<any[]>([]);
  const [threatAlerts, setThreatAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ events: 0, threats: 0, processes: 0, connections: 0 });
  const channelRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const playAlertSound = useCallback((severity: string) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (severity === 'critical') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (severity === 'warning') {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) { /* audio not available */ }
  }, [soundEnabled]);

  // Subscribe to Supabase Realtime for live events
  useEffect(() => {
    const channel = supabase
      .channel('deep-scan-live-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'deep_scan_live_events',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const evt = payload.new as LiveEvent;
        setEvents(prev => [evt, ...prev].slice(0, 200));
        setStats(prev => ({ ...prev, events: prev.events + 1 }));

        if (evt.event_type === 'threat_detected' || evt.severity === 'critical') {
          setThreatAlerts(prev => [evt, ...prev].slice(0, 50));
          setStats(prev => ({ ...prev, threats: prev.threats + 1 }));
          playAlertSound('critical');
          toast.error('THREAT DETECTED', { description: evt.event_data?.detail || 'Critical threat detected on endpoint', duration: 10000 });
        } else if (evt.event_type === 'process_change') {
          setProcessTree(prev => {
            const updated = [...prev];
            const existing = updated.findIndex(p => p.pid === evt.event_data?.pid);
            if (existing >= 0) updated[existing] = { ...updated[existing], ...evt.event_data };
            else updated.unshift(evt.event_data);
            return updated.slice(0, 100);
          });
          setStats(prev => ({ ...prev, processes: prev.processes + 1 }));
          if (evt.severity === 'warning') playAlertSound('warning');
        } else if (evt.event_type === 'network_new' || evt.event_type === 'network_closed') {
          setLiveConnections(prev => {
            if (evt.event_type === 'network_closed') return prev.filter(c => c.id !== evt.event_data?.id);
            return [evt.event_data, ...prev].slice(0, 100);
          });
          setStats(prev => ({ ...prev, connections: prev.connections + 1 }));
        } else if (evt.event_type === 'scan_complete') {
          playAlertSound(evt.severity === 'critical' ? 'critical' : 'info');
          toast.success('Scan Complete', { description: `Threat Score: ${evt.event_data?.threat_score}/100` });
        }
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, playAlertSound]);

  // Also poll for recent events on mount
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const { data } = await supabase.functions.invoke('deep-scan-analyzer', {
          body: { action: 'get_live_events', user_id: userId, since: new Date(Date.now() - 3600000).toISOString() }
        });
        if (data?.events) {
          setEvents(data.events);
          const threats = data.events.filter((e: any) => e.severity === 'critical' || e.event_type === 'threat_detected');
          setThreatAlerts(threats);
        }
      } catch (e) { /* ok */ }
    };
    fetchRecent();
  }, [userId]);

  // Auto-scroll events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'process_change': return <CpuIcon size={14} className="text-blue-400" />;
      case 'network_new': return <GlobeIcon size={14} className="text-cyan-400" />;
      case 'network_closed': return <GlobeIcon size={14} className="text-gray-500" />;
      case 'threat_detected': return <AlertIcon size={14} className="text-red-400" />;
      case 'scan_complete': return <CheckCircleIcon size={14} className="text-green-400" />;
      case 'scan_progress': return <RefreshIcon size={14} className="text-orange-400 animate-spin" />;
      case 'heartbeat': return <ActivityIcon size={14} className="text-green-400" />;
      default: return <ActivityIcon size={14} className="text-gray-400" />;
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'border-red-500/40 bg-red-500/5';
      case 'warning': return 'border-orange-500/30 bg-orange-500/5';
      default: return 'border-gray-800 bg-gray-900/30';
    }
  };

  // Network connection graph - simple SVG visualization
  const connGraphWidth = 800;
  const connGraphHeight = 200;
  const uniqueRemotes = [...new Set(liveConnections.map(c => c.remoteAddress || c.remote).filter(Boolean))].slice(0, 15);
  const uniqueLocals = [...new Set(liveConnections.map(c => c.processName || c.process).filter(Boolean))].slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-black/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`relative w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}>
              {connected && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />}
            </div>
            <span className={`font-mono text-xs font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? 'LIVE CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <span className="text-gray-600 font-mono text-xs">via Supabase Realtime WebSocket</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-500">Events: <span className="text-white">{stats.events}</span></span>
            <span className="text-gray-500">Threats: <span className="text-red-400">{stats.threats}</span></span>
            <span className="text-gray-500">Procs: <span className="text-blue-400">{stats.processes}</span></span>
            <span className="text-gray-500">Conns: <span className="text-cyan-400">{stats.connections}</span></span>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg border transition-all ${soundEnabled ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-gray-700 text-gray-500 hover:bg-gray-800'}`} title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}>
            {soundEnabled ? <VolumeIcon size={16} /> : <VolumeMuteIcon size={16} />}
          </button>
        </div>
      </div>

      {/* Threat Alerts Banner */}
      {threatAlerts.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4" style={{ boxShadow: '0 0 20px rgba(255,0,0,0.15)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertIcon size={18} className="text-red-400" />
            <h4 className="text-red-400 font-mono font-bold text-sm">LIVE THREAT ALERTS ({threatAlerts.length})</h4>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {threatAlerts.slice(0, 10).map((alert, i) => (
              <div key={alert.id || i} className="flex items-center gap-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                <span className="text-red-300 font-mono text-xs flex-1">{alert.event_data?.detail || alert.event_type}</span>
                <span className="text-red-400/60 font-mono text-[10px]">{new Date(alert.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Process Tree */}
        <div className="rounded-xl border border-blue-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <CpuIcon size={16} className="text-blue-400" /> Live Process Tree
            <span className="text-gray-600 font-mono text-xs ml-auto">{processTree.length} tracked</span>
          </h4>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {processTree.length > 0 ? processTree.slice(0, 50).map((proc, i) => {
              const isNew = Date.now() - new Date(proc.timestamp || proc.created_at || 0).getTime() < 10000;
              return (
                <div key={proc.pid || i} className={`flex items-center gap-2 p-2 rounded-lg transition-all ${isNew ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-gray-900/30 border border-transparent'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${proc.status === 'critical' ? 'bg-red-400' : proc.status === 'suspicious' ? 'bg-orange-400' : proc.status === 'new' ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
                  <span className="text-white font-mono text-xs flex-1 truncate">{proc.name || proc.processName}</span>
                  <span className="text-gray-600 font-mono text-[10px]">PID:{proc.pid}</span>
                  {proc.cpu > 0 && <span className="text-gray-500 font-mono text-[10px]">{proc.cpu?.toFixed(1)}%</span>}
                  {isNew && <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded text-[8px] font-mono font-bold">NEW</span>}
                </div>
              );
            }) : (
              <div className="text-center py-8">
                <CpuIcon size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 font-mono text-xs">Waiting for process data...</p>
                <p className="text-gray-700 font-mono text-[10px] mt-1">Run the scanner agent to see live updates</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Network Graph */}
        <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <WifiIcon size={16} className="text-cyan-400" /> Live Network Connections
            <span className="text-gray-600 font-mono text-xs ml-auto">{liveConnections.length} active</span>
          </h4>
          {liveConnections.length > 0 ? (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {liveConnections.slice(0, 50).map((conn, i) => {
                const isNew = Date.now() - new Date(conn.timestamp || conn.created_at || 0).getTime() < 10000;
                const isSuspicious = conn.status === 'critical' || conn.status === 'suspicious' || conn.riskScore > 30;
                return (
                  <div key={conn.id || i} className={`flex items-center gap-2 p-2 rounded-lg transition-all ${isSuspicious ? 'bg-red-500/5 border border-red-500/20' : isNew ? 'bg-cyan-500/5 border border-cyan-500/20' : 'bg-gray-900/30 border border-transparent'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSuspicious ? 'bg-red-400 animate-pulse' : isNew ? 'bg-cyan-400' : 'bg-gray-500'}`} />
                    <span className="text-gray-400 font-mono text-[10px] w-20 truncate">{conn.processName || conn.process || '?'}</span>
                    <span className="text-gray-600 font-mono text-[10px]">&rarr;</span>
                    <span className={`font-mono text-[10px] flex-1 truncate ${isSuspicious ? 'text-red-400' : 'text-white'}`}>{conn.remoteAddress || conn.remote}:{conn.remotePort || conn.port}</span>
                    <span className="text-gray-600 font-mono text-[10px]">{conn.state || 'EST'}</span>
                    {isNew && <span className="px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded text-[8px] font-mono font-bold">NEW</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <WifiIcon size={32} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 font-mono text-xs">Waiting for network data...</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
        <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
          <ActivityIcon size={16} className="text-green-400" /> Real-Time Event Stream
          {connected && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
        </h4>
        <div className="space-y-1 max-h-[300px] overflow-y-auto font-mono text-xs">
          {events.length > 0 ? events.slice(0, 100).map((evt, i) => (
            <div key={evt.id || i} className={`flex items-center gap-2 p-2 rounded border transition-all ${getSeverityColor(evt.severity)}`}>
              {getEventIcon(evt.event_type)}
              <span className="text-gray-500 text-[10px] w-16 flex-shrink-0">{new Date(evt.created_at).toLocaleTimeString()}</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${evt.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' : evt.severity === 'warning' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-gray-400 border-gray-700 bg-gray-800'}`}>
                {evt.event_type.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-gray-300 flex-1 truncate">{evt.event_data?.detail || evt.event_data?.name || JSON.stringify(evt.event_data).slice(0, 80)}</span>
            </div>
          )) : (
            <div className="text-center py-8">
              <ActivityIcon size={32} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No live events yet</p>
              <p className="text-gray-700 text-[10px] mt-1">Events will appear here in real-time via WebSocket when the scanner agent is running</p>
            </div>
          )}
          <div ref={eventsEndRef} />
        </div>
      </div>

      {/* Network Connection Graph SVG */}
      {liveConnections.length > 0 && uniqueLocals.length > 0 && uniqueRemotes.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <GlobeIcon size={16} className="text-cyan-400" /> Process-to-Server Connection Graph
          </h4>
          <svg viewBox={`0 0 ${connGraphWidth} ${connGraphHeight}`} className="w-full h-auto">
            {/* Local processes on left */}
            {uniqueLocals.map((name, i) => {
              const y = 20 + (i / Math.max(1, uniqueLocals.length - 1)) * (connGraphHeight - 40);
              return (
                <g key={'l-' + i}>
                  <circle cx={60} cy={y} r={6} fill="#3b82f6" opacity={0.8} />
                  <text x={70} y={y + 4} fill="#9ca3af" fontSize="9" fontFamily="monospace">{name.slice(0, 15)}</text>
                </g>
              );
            })}
            {/* Remote servers on right */}
            {uniqueRemotes.map((addr, i) => {
              const y = 20 + (i / Math.max(1, uniqueRemotes.length - 1)) * (connGraphHeight - 40);
              const isSus = liveConnections.some(c => (c.remoteAddress === addr || c.remote === addr) && (c.status === 'critical' || c.status === 'suspicious'));
              return (
                <g key={'r-' + i}>
                  <circle cx={connGraphWidth - 60} cy={y} r={6} fill={isSus ? '#ef4444' : '#06b6d4'} opacity={0.8} />
                  <text x={connGraphWidth - 55} y={y + 4} fill={isSus ? '#fca5a5' : '#9ca3af'} fontSize="8" fontFamily="monospace" textAnchor="start">{(addr || '').slice(0, 20)}</text>
                </g>
              );
            })}
            {/* Connection lines */}
            {liveConnections.slice(0, 30).map((conn, i) => {
              const localName = conn.processName || conn.process || '';
              const remoteName = conn.remoteAddress || conn.remote || '';
              const li = uniqueLocals.indexOf(localName);
              const ri = uniqueRemotes.indexOf(remoteName);
              if (li < 0 || ri < 0) return null;
              const y1 = 20 + (li / Math.max(1, uniqueLocals.length - 1)) * (connGraphHeight - 40);
              const y2 = 20 + (ri / Math.max(1, uniqueRemotes.length - 1)) * (connGraphHeight - 40);
              const isSus = conn.status === 'critical' || conn.status === 'suspicious';
              return (
                <line key={'c-' + i} x1={66} y1={y1} x2={connGraphWidth - 66} y2={y2} stroke={isSus ? '#ef4444' : '#06b6d4'} strokeWidth={isSus ? 2 : 1} opacity={0.4} strokeDasharray={isSus ? '' : '4 2'}>
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" begin={`${i * 0.1}s`} />
                </line>
              );
            })}
            {/* Labels */}
            <text x={60} y={12} fill="#3b82f6" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">LOCAL</text>
            <text x={connGraphWidth - 60} y={12} fill="#06b6d4" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">REMOTE</text>
          </svg>
        </div>
      )}
    </div>
  );
};

export default DeepScanLiveMonitor;
