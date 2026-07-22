import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  GitCompareIcon, RefreshIcon, ArrowRightIcon, ShieldIcon, CpuIcon, GlobeIcon,
  AlertIcon, CheckCircleIcon, PlusIcon, MinusIcon, ClockIcon, TrendingUpIcon,
  ScanHistoryItem, threatScoreColor, getThreatColor,
} from './DeepScanIcons';

interface Props {
  userId: string;
  scanHistory: ScanHistoryItem[];
}

interface ComparisonResult {
  scanA: { id: string; date: string; score: number; level: string; processCount: number; connectionCount: number; startupCount: number; threatCount: number };
  scanB: { id: string; date: string; score: number; level: string; processCount: number; connectionCount: number; startupCount: number; threatCount: number };
  newProcesses: string[];
  removedProcesses: string[];
  commonProcessCount: number;
  newConnections: string[];
  closedConnections: string[];
  newStartup: string[];
  removedStartup: string[];
  newThreats: string[];
  resolvedThreats: string[];
  scoreChange: number;
  improved: boolean;
  summary: string;
}

const DeepScanCompare: React.FC<Props> = ({ userId, scanHistory }) => {
  const [scanIdA, setScanIdA] = useState<string>('');
  const [scanIdB, setScanIdB] = useState<string>('');
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const runComparison = useCallback(async () => {
    if (!scanIdA || !scanIdB) { toast.error('Select two scans to compare'); return; }
    if (scanIdA === scanIdB) { toast.error('Select two different scans'); return; }
    setComparing(true);
    try {
      const { data, error } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'compare_scans', scan_id_a: scanIdA, scan_id_b: scanIdB }
      });
      if (data?.comparison) {
        setResult(data.comparison);
        toast.success('Comparison complete');
      } else {
        toast.error('Comparison failed: ' + (error?.message || data?.error || 'Unknown'));
      }
    } catch (e: any) { toast.error('Error: ' + e.message); }
    setComparing(false);
  }, [scanIdA, scanIdB]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Timeline view
  const timelineData = scanHistory.slice(0, 30).reverse();
  const maxScore = Math.max(10, ...timelineData.map(s => s.threat_score || 0));
  const tlWidth = 700;
  const tlHeight = 140;

  return (
    <div className="space-y-6">
      {/* Scan Selector */}
      <div className="rounded-xl border border-purple-500/30 bg-black/80 p-6">
        <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
          <GitCompareIcon size={18} className="text-purple-400" /> Compare Two Scans
        </h4>
        <div className="grid md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-end">
          <div>
            <label className="text-gray-400 font-mono text-xs block mb-2">Scan A (Baseline)</label>
            <select value={scanIdA} onChange={e => setScanIdA(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-400 appearance-none">
              <option value="">Select scan...</option>
              {scanHistory.map(s => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.created_at)} - Score: {s.threat_score} ({s.threat_level})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-center pb-1">
            <ArrowRightIcon size={20} className="text-purple-400" />
          </div>
          <div>
            <label className="text-gray-400 font-mono text-xs block mb-2">Scan B (Current)</label>
            <select value={scanIdB} onChange={e => setScanIdB(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-400 appearance-none">
              <option value="">Select scan...</option>
              {scanHistory.map(s => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.created_at)} - Score: {s.threat_score} ({s.threat_level})
                </option>
              ))}
            </select>
          </div>
          <button onClick={runComparison} disabled={comparing || !scanIdA || !scanIdB} className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/15 border border-purple-500/40 text-purple-400 rounded-lg hover:bg-purple-500/25 transition-all font-mono text-sm font-bold disabled:opacity-50">
            {comparing ? <RefreshIcon size={16} className="animate-spin" /> : <GitCompareIcon size={16} />}
            {comparing ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {result && (
        <>
          {/* Score Change Banner */}
          <div className={`rounded-xl border p-6 ${result.improved ? 'border-green-500/40 bg-green-500/5' : result.scoreChange > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-gray-700 bg-gray-900/30'}`} style={result.scoreChange !== 0 ? { boxShadow: `0 0 20px ${result.improved ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)'}` } : {}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${result.improved ? 'bg-green-500/20 border border-green-500/30' : result.scoreChange > 0 ? 'bg-red-500/20 border border-red-500/30' : 'bg-gray-800 border border-gray-700'}`}>
                  <span className={`font-mono text-2xl font-bold ${result.improved ? 'text-green-400' : result.scoreChange > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {result.scoreChange > 0 ? '+' : ''}{result.scoreChange}
                  </span>
                </div>
                <div>
                  <h3 className={`font-mono font-bold text-lg ${result.improved ? 'text-green-400' : result.scoreChange > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {result.summary}
                  </h3>
                  <p className="text-gray-500 font-mono text-xs mt-1">
                    Score: {result.scanA.score} &rarr; {result.scanB.score}
                  </p>
                </div>
              </div>
              <ShieldIcon size={32} className={result.improved ? 'text-green-400/30' : result.scoreChange > 0 ? 'text-red-400/30' : 'text-gray-600'} />
            </div>
          </div>

          {/* Side-by-Side Stats */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { label: 'Scan A (Baseline)', data: result.scanA, color: 'blue' },
              { label: 'Scan B (Current)', data: result.scanB, color: 'purple' },
            ].map((side, si) => {
              const tc = getThreatColor(side.data.level);
              return (
                <div key={si} className={`rounded-xl border ${tc.border} bg-black/80 p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-white font-mono font-bold text-sm">{side.label}</h5>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${tc.text} ${tc.bg} ${tc.border}`}>{side.data.level.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(100,100,100,0.2)" strokeWidth="4" />
                        <circle cx="25" cy="25" r="20" fill="none" stroke={threatScoreColor(side.data.score)} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${side.data.score * 1.26} 126`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-sm font-bold" style={{ color: threatScoreColor(side.data.score) }}>{side.data.score}</span>
                      </div>
                    </div>
                    <div className="flex-1 text-xs font-mono space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">Processes</span><span className="text-white">{side.data.processCount}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Connections</span><span className="text-white">{side.data.connectionCount}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Startup</span><span className="text-white">{side.data.startupCount}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Threats</span><span className="text-red-400">{side.data.threatCount}</span></div>
                    </div>
                  </div>
                  <p className="text-gray-600 font-mono text-[10px]">{formatDate(side.data.date)}</p>
                </div>
              );
            })}
          </div>

          {/* Changes Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* New Processes */}
            <div className="rounded-xl border border-red-500/20 bg-black/80 p-4">
              <h5 className="text-red-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                <PlusIcon size={14} /> New Processes ({result.newProcesses.length})
              </h5>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {result.newProcesses.length > 0 ? result.newProcesses.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 bg-red-500/5 rounded text-xs font-mono text-red-300">
                    <PlusIcon size={10} className="text-red-400 flex-shrink-0" /> {p}
                  </div>
                )) : <p className="text-gray-600 font-mono text-[10px]">No new processes</p>}
              </div>
            </div>

            {/* Removed Processes */}
            <div className="rounded-xl border border-green-500/20 bg-black/80 p-4">
              <h5 className="text-green-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                <MinusIcon size={14} /> Removed Processes ({result.removedProcesses.length})
              </h5>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {result.removedProcesses.length > 0 ? result.removedProcesses.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 bg-green-500/5 rounded text-xs font-mono text-green-300">
                    <MinusIcon size={10} className="text-green-400 flex-shrink-0" /> {p}
                  </div>
                )) : <p className="text-gray-600 font-mono text-[10px]">No removed processes</p>}
              </div>
            </div>

            {/* New Connections */}
            <div className="rounded-xl border border-orange-500/20 bg-black/80 p-4">
              <h5 className="text-orange-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                <GlobeIcon size={14} /> New Connections ({result.newConnections.length})
              </h5>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {result.newConnections.length > 0 ? result.newConnections.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 bg-orange-500/5 rounded text-xs font-mono text-orange-300">
                    <PlusIcon size={10} className="text-orange-400 flex-shrink-0" /> {c}
                  </div>
                )) : <p className="text-gray-600 font-mono text-[10px]">No new connections</p>}
              </div>
            </div>

            {/* Closed Connections */}
            <div className="rounded-xl border border-cyan-500/20 bg-black/80 p-4">
              <h5 className="text-cyan-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                <MinusIcon size={14} /> Closed Connections ({result.closedConnections.length})
              </h5>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {result.closedConnections.length > 0 ? result.closedConnections.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 bg-cyan-500/5 rounded text-xs font-mono text-cyan-300">
                    <MinusIcon size={10} className="text-cyan-400 flex-shrink-0" /> {c}
                  </div>
                )) : <p className="text-gray-600 font-mono text-[10px]">No closed connections</p>}
              </div>
            </div>

            {/* New Threats */}
            <div className="rounded-xl border border-red-500/30 bg-black/80 p-4">
              <h5 className="text-red-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                <AlertIcon size={14} /> New Threats ({result.newThreats.length})
              </h5>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {result.newThreats.length > 0 ? result.newThreats.map((t, i) => (
                  <div key={i} className="p-1.5 bg-red-500/5 rounded text-[10px] font-mono text-red-300 border border-red-500/10">{t}</div>
                )) : <p className="text-gray-600 font-mono text-[10px]">No new threats</p>}
              </div>
            </div>

            {/* Resolved Threats */}
            <div className="rounded-xl border border-green-500/30 bg-black/80 p-4">
              <h5 className="text-green-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                <CheckCircleIcon size={14} /> Resolved Threats ({result.resolvedThreats.length})
              </h5>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {result.resolvedThreats.length > 0 ? result.resolvedThreats.map((t, i) => (
                  <div key={i} className="p-1.5 bg-green-500/5 rounded text-[10px] font-mono text-green-300 border border-green-500/10">{t}</div>
                )) : <p className="text-gray-600 font-mono text-[10px]">No resolved threats</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Security Posture Timeline */}
      {timelineData.length > 1 && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2">
            <TrendingUpIcon size={16} className="text-purple-400" /> Security Posture Timeline
          </h4>
          <svg viewBox={`0 0 ${tlWidth} ${tlHeight + 30}`} className="w-full h-auto" preserveAspectRatio="none">
            <defs>
              <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid */}
            {[0, 25, 50, 75, 100].map(v => {
              const y = tlHeight - (v / maxScore) * (tlHeight - 10);
              return <g key={v}><line x1="30" y1={y} x2={tlWidth} y2={y} stroke="rgba(100,100,100,0.1)" /><text x="25" y={y + 3} fill="rgba(100,100,100,0.4)" fontSize="8" fontFamily="monospace" textAnchor="end">{v}</text></g>;
            })}
            {/* Area */}
            {timelineData.length > 1 && (
              <polygon
                points={`30,${tlHeight} ${timelineData.map((s, i) => {
                  const x = 30 + (i / (timelineData.length - 1)) * (tlWidth - 40);
                  const y = tlHeight - ((s.threat_score || 0) / maxScore) * (tlHeight - 10);
                  return `${x},${y}`;
                }).join(' ')} ${tlWidth - 10},${tlHeight}`}
                fill="url(#timelineGrad)"
              />
            )}
            {/* Line */}
            {timelineData.length > 1 && (
              <polyline
                points={timelineData.map((s, i) => {
                  const x = 30 + (i / (timelineData.length - 1)) * (tlWidth - 40);
                  const y = tlHeight - ((s.threat_score || 0) / maxScore) * (tlHeight - 10);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"
              />
            )}
            {/* Dots + labels */}
            {timelineData.map((s, i) => {
              const x = 30 + (i / Math.max(1, timelineData.length - 1)) * (tlWidth - 40);
              const y = tlHeight - ((s.threat_score || 0) / maxScore) * (tlHeight - 10);
              const isSelected = s.id === scanIdA || s.id === scanIdB;
              return (
                <g key={i} style={{ cursor: 'pointer' }} onClick={() => {
                  if (!scanIdA) setScanIdA(s.id);
                  else if (!scanIdB) setScanIdB(s.id);
                  else { setScanIdA(scanIdB); setScanIdB(s.id); }
                }}>
                  <circle cx={x} cy={y} r={isSelected ? 6 : 4} fill={threatScoreColor(s.threat_score)} stroke={isSelected ? '#fff' : 'black'} strokeWidth={isSelected ? 2 : 1} />
                  {(i === 0 || i === timelineData.length - 1 || i % Math.max(1, Math.floor(timelineData.length / 6)) === 0) && (
                    <text x={x} y={tlHeight + 15} fill="rgba(100,100,100,0.5)" fontSize="7" fontFamily="monospace" textAnchor="middle">
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="text-gray-600 font-mono text-[10px] mt-2 text-center">Click dots to select scans for comparison</p>
        </div>
      )}
    </div>
  );
};

export default DeepScanCompare;
