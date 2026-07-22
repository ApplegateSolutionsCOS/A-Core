import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  ShieldIcon, AlertIcon, CheckCircleIcon, RefreshIcon, GlobeIcon, CpuIcon, MonitorIcon,
  DownloadIcon, CrosshairIcon, ZapIcon, CopyIcon,
  AnalysisResult, getThreatColor, getStatusColor, threatScoreColor,
} from './DeepScanIcons';

type DetailTab = 'overview' | 'processes' | 'network' | 'startup' | 'threats' | 'remediate';

interface Props {
  result: AnalysisResult;
  platform?: string;
}

const DeepScanResults: React.FC<Props> = ({ result, platform = 'windows' }) => {
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [processFilter, setProcessFilter] = useState<'all' | 'critical' | 'suspicious' | 'warning' | 'safe' | 'unknown'>('all');
  const [processSearch, setProcessSearch] = useState('');
  const [generatingRemediation, setGeneratingRemediation] = useState(false);
  const [remediationScript, setRemediationScript] = useState<string | null>(null);
  const [singleRemediations, setSingleRemediations] = useState<Record<number, string>>({});

  const filteredProcesses = result.processes?.filter(p => {
    if (processFilter !== 'all' && p.status !== processFilter) return false;
    if (processSearch && !p.name.toLowerCase().includes(processSearch.toLowerCase()) && !p.path.toLowerCase().includes(processSearch.toLowerCase())) return false;
    return true;
  }) || [];

  const hasThreats = result.threats.length > 0 || result.analysis.criticalProcesses > 0 || result.analysis.suspiciousProcesses > 0;

  const generateFullRemediation = async () => {
    setGeneratingRemediation(true);
    try {
      const { data, error } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: {
          action: 'generate_remediation', platform, mode: 'full',
          threats: result.threats,
          processes: result.processes.filter(p => p.status === 'critical' || p.status === 'suspicious'),
          connections: result.networkConnections.filter(c => c.status === 'critical' || c.status === 'suspicious'),
          startup_items: result.startupItems.filter(s => s.status === 'critical' || s.status === 'suspicious'),
        }
      });
      if (data?.script) {
        setRemediationScript(data.script);
        setDetailTab('remediate');
        toast.success('Remediation script generated');
      } else {
        toast.error('Failed to generate script');
      }
    } catch (e: any) { toast.error('Error: ' + e.message); }
    setGeneratingRemediation(false);
  };

  const generateSingleRemediation = async (finding: any, index: number) => {
    try {
      const { data } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'generate_remediation', platform, mode: 'single', finding }
      });
      if (data?.command) {
        setSingleRemediations(prev => ({ ...prev, [index]: data.command }));
        await navigator.clipboard.writeText(data.command);
        toast.success('Command copied to clipboard');
      }
    } catch (e) { toast.error('Failed to generate command'); }
  };

  const downloadScript = () => {
    if (!remediationScript) return;
    const blob = new Blob([remediationScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = platform === 'windows' ? 'qcore-remediate.ps1' : 'qcore-remediate.sh';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Remediation script downloaded');
  };

  const tc = getThreatColor(result.threatLevel);

  return (
    <div className="space-y-6">
      {/* Threat Score */}
      <div className={`rounded-xl border ${tc.border} bg-black/80 p-6 ${tc.glow}`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(100,100,100,0.2)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={threatScoreColor(result.threatScore)} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${result.threatScore * 2.64} 264`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono" style={{ color: threatScoreColor(result.threatScore) }}>{result.threatScore}</span>
              <span className="text-gray-500 text-[10px] font-mono">/100</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-mono font-bold text-white">Threat Assessment</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getStatusColor(result.threatLevel)}`}>{result.threatLevel.toUpperCase()}</span>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Scanned {result.analysis.totalProcesses} processes, {result.analysis.totalConnections} connections, {result.analysis.totalStartupItems} startup items in {(result.scanDuration / 1000).toFixed(1)}s
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Critical', value: result.analysis.criticalProcesses, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                { label: 'Suspicious', value: result.analysis.suspiciousProcesses, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                { label: 'Warnings', value: result.analysis.warningProcesses, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                { label: 'Safe', value: result.analysis.safeProcesses, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                { label: 'Unknown', value: result.analysis.unknownProcesses, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
              ].map((s, i) => (
                <div key={i} className={`p-2 border rounded-lg text-center ${s.color}`}>
                  <p className="font-mono text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] font-mono opacity-70">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Remediation CTA */}
        {hasThreats && (
          <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-3">
            <button onClick={generateFullRemediation} disabled={generatingRemediation} className="flex items-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/25 transition-all font-mono text-sm font-bold disabled:opacity-50">
              {generatingRemediation ? <RefreshIcon size={16} className="animate-spin" /> : <ZapIcon size={16} />}
              {generatingRemediation ? 'Generating...' : 'Generate Full Remediation Script'}
            </button>
            <span className="text-gray-600 text-xs font-mono self-center">Creates a {platform === 'windows' ? 'PowerShell' : 'Bash'} script to neutralize all detected threats</span>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
          <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><AlertIcon size={18} className="text-orange-400" /> Recommendations</h3>
          <div className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <div key={i} className={`p-4 rounded-lg border ${rec.priority === 'critical' ? 'border-red-500/30 bg-red-500/5' : rec.priority === 'high' ? 'border-orange-500/30 bg-orange-500/5' : rec.priority === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${rec.priority === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' : rec.priority === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : rec.priority === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-green-400 border-green-500/30 bg-green-500/10'}`}>{rec.priority.toUpperCase()}</span>
                  <div>
                    <p className="text-white font-mono text-sm font-bold">{rec.action}</p>
                    <p className="text-gray-500 text-xs mt-1">{rec.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'overview' as DetailTab, label: 'Overview', count: null },
          { id: 'processes' as DetailTab, label: 'Processes', count: result.analysis.totalProcesses },
          { id: 'network' as DetailTab, label: 'Network', count: result.analysis.totalConnections },
          { id: 'startup' as DetailTab, label: 'Startup', count: result.analysis.totalStartupItems },
          { id: 'threats' as DetailTab, label: 'Threats', count: result.threats.length },
          ...(remediationScript ? [{ id: 'remediate' as DetailTab, label: 'Remediation', count: null }] : []),
        ]).map(tab => (
          <button key={tab.id} onClick={() => setDetailTab(tab.id)} className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all flex items-center gap-2 ${detailTab === tab.id ? 'bg-red-500/15 border border-red-500/40 text-red-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
            {tab.label}
            {tab.count !== null && <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 text-[10px]">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Remediation Script View */}
      {detailTab === 'remediate' && remediationScript && (
        <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-mono font-bold flex items-center gap-2"><ZapIcon size={18} className="text-red-400" /> Remediation Script</h3>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(remediationScript); toast.success('Copied to clipboard'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/50 border border-gray-700 text-gray-400 rounded-lg hover:text-white transition-all font-mono text-xs">
                <CopyIcon size={14} /> Copy
              </button>
              <button onClick={downloadScript} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/25 transition-all font-mono text-xs font-bold">
                <DownloadIcon size={14} /> Download
              </button>
            </div>
          </div>
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 max-h-[500px] overflow-auto">
            <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap leading-relaxed">{remediationScript}</pre>
          </div>
          <div className="mt-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 font-mono text-xs font-bold">WARNING: Review the script carefully before running.</p>
            <p className="text-gray-500 text-xs mt-1">Run as {platform === 'windows' ? 'Administrator in PowerShell' : 'root with sudo'}. Some actions are irreversible.</p>
          </div>
        </div>
      )}

      {/* Process List */}
      {detailTab === 'processes' && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <input type="text" value={processSearch} onChange={e => setProcessSearch(e.target.value)} placeholder="Search processes..." className="flex-1 max-w-md bg-black border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-red-400" />
            <div className="flex gap-1 flex-wrap">
              {(['all', 'critical', 'suspicious', 'warning', 'safe', 'unknown'] as const).map(f => (
                <button key={f} onClick={() => setProcessFilter(f)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all ${processFilter === f ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-gray-900/30 border-gray-800 text-gray-500'}`}>
                  {f.toUpperCase()} {f !== 'all' && <span className="opacity-60">({result.processes.filter(p => p.status === f).length})</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-900/50 border-b border-gray-800">
                <tr>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">Status</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">Process</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">PID</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">Mem</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">CPU</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">Risk</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">Findings</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredProcesses.slice(0, 100).map((proc, i) => (
                  <tr key={i} className={`hover:bg-gray-900/30 transition-colors ${proc.status === 'critical' ? 'bg-red-500/5' : proc.status === 'suspicious' ? 'bg-orange-500/5' : ''}`}>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusColor(proc.status)}`}>{proc.status.toUpperCase()}</span></td>
                    <td className="p-3">
                      <p className="text-white font-mono text-sm">{proc.name}</p>
                      <p className="text-gray-600 font-mono text-[10px] truncate max-w-[200px]">{proc.path}</p>
                    </td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{proc.pid}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{proc.memoryMB > 0 ? `${proc.memoryMB.toFixed(1)}M` : '-'}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{proc.cpu > 0 ? `${proc.cpu.toFixed(1)}%` : '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${proc.riskScore}%`, background: proc.riskScore >= 70 ? '#ef4444' : proc.riskScore >= 40 ? '#f97316' : proc.riskScore > 0 ? '#eab308' : '#22c55e' }} />
                        </div>
                        <span className="text-gray-500 font-mono text-[10px]">{proc.riskScore}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {proc.findings.length > 0 ? proc.findings.map((f, j) => (
                        <div key={j} className="text-[10px] font-mono text-gray-400">{f.detail}</div>
                      )) : <span className="text-gray-600 text-[10px] font-mono">{proc.isKnown ? 'Known' : '-'}</span>}
                    </td>
                    <td className="p-3">
                      {(proc.status === 'critical' || proc.status === 'suspicious') && (
                        <button onClick={() => generateSingleRemediation({ source: 'process', pid: proc.pid, processName: proc.name, detail: proc.findings[0]?.detail || '' }, i)} className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono hover:bg-red-500/20 transition-all" title="Generate kill command">
                          <CrosshairIcon size={10} /> Quarantine
                        </button>
                      )}
                      {singleRemediations[i] && (
                        <code className="block mt-1 text-[9px] font-mono text-green-400 bg-gray-950 px-1.5 py-0.5 rounded max-w-[150px] truncate">{singleRemediations[i]}</code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProcesses.length > 100 && <p className="text-gray-600 font-mono text-xs text-center mt-3">Showing 100 of {filteredProcesses.length}</p>}
        </div>
      )}

      {/* Network */}
      {detailTab === 'network' && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
          <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><GlobeIcon size={18} className="text-red-400" /> Network Connections ({result.networkConnections.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-900/50 border-b border-gray-800">
                <tr>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400">STATUS</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400">PROCESS</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400">LOCAL</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400">REMOTE</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400">STATE</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400">RISK</th>
                  <th className="text-left p-3 text-xs font-mono font-bold text-red-400">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {result.networkConnections.slice(0, 100).map((conn, i) => (
                  <tr key={i} className={`hover:bg-gray-900/30 ${conn.status === 'critical' ? 'bg-red-500/5' : conn.status === 'suspicious' ? 'bg-orange-500/5' : ''}`}>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusColor(conn.status)}`}>{conn.status.toUpperCase()}</span></td>
                    <td className="p-3 text-gray-300 font-mono text-xs">{conn.processName || `PID:${conn.pid}`}</td>
                    <td className="p-3 text-gray-400 font-mono text-[10px]">{conn.localAddress}:{conn.localPort}</td>
                    <td className="p-3 text-gray-400 font-mono text-[10px]">{conn.remoteAddress}:{conn.remotePort}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-400 text-[10px] font-mono">{conn.state}</span></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${conn.riskScore}%`, background: conn.riskScore >= 50 ? '#ef4444' : conn.riskScore >= 25 ? '#f97316' : conn.riskScore > 0 ? '#eab308' : '#22c55e' }} />
                        </div>
                        <span className="text-gray-500 font-mono text-[10px]">{conn.riskScore}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {(conn.status === 'critical' || conn.status === 'suspicious') && (
                        <button onClick={() => generateSingleRemediation({ source: 'network', remoteAddress: conn.remoteAddress, remotePort: conn.remotePort, pid: conn.pid }, 1000 + i)} className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono hover:bg-red-500/20">
                          <CrosshairIcon size={10} /> Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Startup */}
      {detailTab === 'startup' && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
          <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><MonitorIcon size={18} className="text-red-400" /> Startup Items ({result.startupItems.length})</h3>
          <div className="space-y-2">
            {result.startupItems.map((item, i) => (
              <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 ${item.status === 'critical' ? 'border-red-500/30 bg-red-500/5' : item.status === 'suspicious' ? 'border-orange-500/30 bg-orange-500/5' : 'border-gray-800 bg-gray-900/30'}`}>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${getStatusColor(item.status)}`}>{item.status.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-sm">{item.name}</p>
                  <p className="text-gray-600 font-mono text-[10px] truncate">{item.command}</p>
                </div>
                {(item.status === 'critical' || item.status === 'suspicious') && (
                  <button onClick={() => generateSingleRemediation({ source: 'startup', itemName: item.name, detail: item.findings[0]?.detail || '' }, 2000 + i)} className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono hover:bg-red-500/20 flex-shrink-0">
                    <CrosshairIcon size={10} /> Remove
                  </button>
                )}
              </div>
            ))}
            {result.startupItems.length === 0 && (
              <div className="text-center py-8"><CheckCircleIcon size={32} className="text-green-500/50 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No startup items in report</p></div>
            )}
          </div>
        </div>
      )}

      {/* Threats */}
      {detailTab === 'threats' && (
        <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
          <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><AlertIcon size={18} className="text-red-400" /> All Threats ({result.threats.length})</h3>
          {result.threats.length > 0 ? (
            <div className="space-y-2">
              {result.threats.map((threat, i) => (
                <div key={i} className={`p-4 rounded-lg border ${threat.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : threat.severity === 'high' ? 'border-orange-500/30 bg-orange-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${threat.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' : threat.severity === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>{threat.severity.toUpperCase()}</span>
                    <div className="flex-1">
                      <p className="text-white font-mono text-sm">{threat.detail}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-gray-600 font-mono text-[10px]">Source: {threat.source}</span>
                        {threat.processName && <span className="text-gray-600 font-mono text-[10px]">Process: {threat.processName}</span>}
                        {threat.remoteAddress && <span className="text-gray-600 font-mono text-[10px]">Remote: {threat.remoteAddress}:{threat.remotePort}</span>}
                      </div>
                      {singleRemediations[3000 + i] && (
                        <code className="block mt-2 text-[10px] font-mono text-green-400 bg-gray-950 px-2 py-1 rounded">{singleRemediations[3000 + i]}</code>
                      )}
                    </div>
                    <button onClick={() => generateSingleRemediation(threat, 3000 + i)} className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono hover:bg-red-500/20 flex-shrink-0">
                      <CrosshairIcon size={10} /> Remediate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircleIcon size={48} className="text-green-500/50 mx-auto mb-3" />
              <p className="text-green-400 font-mono text-lg font-bold">No Threats Detected</p>
              <p className="text-gray-600 font-mono text-sm mt-1">Your system appears clean</p>
            </div>
          )}
        </div>
      )}

      {/* Overview */}
      {detailTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><CpuIcon size={16} className="text-red-400" /> Process Summary</h4>
            <div className="space-y-3">
              {[
                { label: 'Total', value: result.analysis.totalProcesses, color: 'text-gray-300' },
                { label: 'Critical', value: result.analysis.criticalProcesses, color: 'text-red-400' },
                { label: 'Suspicious', value: result.analysis.suspiciousProcesses, color: 'text-orange-400' },
                { label: 'Warnings', value: result.analysis.warningProcesses, color: 'text-yellow-400' },
                { label: 'Safe', value: result.analysis.safeProcesses, color: 'text-green-400' },
                { label: 'Unknown', value: result.analysis.unknownProcesses, color: 'text-gray-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-900/30 rounded-lg">
                  <span className="text-gray-400 font-mono text-xs">{s.label}</span>
                  <span className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><GlobeIcon size={16} className="text-red-400" /> Network & Startup</h4>
            <div className="space-y-3">
              {[
                { label: 'Total Connections', value: result.analysis.totalConnections, color: 'text-gray-300' },
                { label: 'Critical Connections', value: result.analysis.criticalConnections, color: 'text-red-400' },
                { label: 'Suspicious Connections', value: result.analysis.suspiciousConnections, color: 'text-orange-400' },
                { label: 'Startup Items', value: result.analysis.totalStartupItems, color: 'text-gray-300' },
                { label: 'Suspicious Startup', value: result.analysis.criticalStartup + result.analysis.suspiciousStartup, color: 'text-orange-400' },
                { label: 'Suspicious Temp Files', value: result.analysis.suspiciousTempFiles, color: 'text-yellow-400' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-900/30 rounded-lg">
                  <span className="text-gray-400 font-mono text-xs">{s.label}</span>
                  <span className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepScanResults;
