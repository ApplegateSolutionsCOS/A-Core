import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DeepScanResults from './deepscan/DeepScanResults';
import DeepScanScheduled from './deepscan/DeepScanScheduled';
import DeepScanLiveMonitor from './deepscan/DeepScanLiveMonitor';
import DeepScanCompare from './deepscan/DeepScanCompare';
import NetworkThreatMap from './NetworkThreatMap';
import {
  ShieldIcon, DownloadIcon, UploadIcon, CheckCircleIcon, RefreshIcon, CpuIcon,
  ClockIcon, TerminalIcon, WindowsIcon, AppleIcon, LinuxIcon, CalendarIcon, ZapIcon,
  ActivityIcon, GitCompareIcon, GlobeIcon, MapPinIcon,
  AnalysisResult, ScanHistoryItem, getThreatColor, getStatusColor,
} from './deepscan/DeepScanIcons';

type ViewTab = 'download' | 'upload' | 'results' | 'history' | 'scheduled' | 'live_monitor' | 'compare' | 'geo_map';

const DeepScanPanel: React.FC = () => {
  const { user } = useAuth();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';

  const [activeView, setActiveView] = useState<ViewTab>('download');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStage, setAnalyzeStage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingScript, setDownloadingScript] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');

  // Auto-upload token state
  const [scanToken, setScanToken] = useState<string | null>(null);
  const [tokenPolling, setTokenPolling] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'waiting' | 'received' | 'error'>('idle');
  const pollIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) setDetectedPlatform('macos');
    else if (ua.includes('linux')) setDetectedPlatform('linux');
    else setDetectedPlatform('windows');
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'get_history', user_id: userId, limit: 50 }
      });
      if (data?.scans) setScanHistory(data.scans);
    } catch (e) { console.error('[DeepScan] History fetch failed:', e); }
    setHistoryLoading(false);
  }, [userId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ─── Token Polling ───
  const createToken = async (platform: string) => {
    try {
      const { data } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'create_token', user_id: userId, platform }
      });
      if (data?.token) { setScanToken(data.token); return { token: data.token, upload_url: data.upload_url }; }
      return null;
    } catch (e) { return null; }
  };

  const startPolling = useCallback((token: string) => {
    setTokenPolling(true); setTokenStatus('waiting');
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    let attempts = 0;
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) { clearInterval(pollIntervalRef.current); setTokenPolling(false); setTokenStatus('error'); toast.error('Scan token expired.'); return; }
      try {
        const { data } = await supabase.functions.invoke('deep-scan-analyzer', { body: { action: 'poll_token', token } });
        if (data?.status === 'completed') {
          clearInterval(pollIntervalRef.current); setTokenPolling(false); setTokenStatus('received');
          setAnalysisResult({ scan_id: data.scan_id, analysis: data.analysis, threats: data.threats || [], threatScore: data.threatScore, threatLevel: data.threatLevel, recommendations: [], processes: data.processes || [], networkConnections: data.networkConnections || [], startupItems: data.startupItems || [], scanDuration: data.scanDuration || 0 });
          setActiveView('results'); fetchHistory();
          if (data.threatScore >= 50) toast.error(`Threats detected! Score: ${data.threatScore}/100`, { duration: 10000 });
          else if (data.threatScore >= 10) toast.warning(`Minor issues. Score: ${data.threatScore}/100`);
          else toast.success('System appears clean!');
        }
      } catch (e) { /* silent retry */ }
    }, 5000);
  }, [userId, fetchHistory]);

  useEffect(() => { return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); }; }, []);

  const downloadScript = async (platform: 'windows' | 'macos' | 'linux') => {
    setDownloadingScript(platform);
    try {
      const tokenData = await createToken(platform);
      const { data, error } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'get_scanner_script', platform, upload_url: tokenData?.upload_url || '', token: tokenData?.token || '' }
      });
      if (error || !data?.script) { toast.error('Failed to generate script'); setDownloadingScript(null); return; }
      const blob = new Blob([data.script], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Scanner downloaded with auto-upload`, { description: `Run ${data.filename} - results appear here automatically` });
      if (tokenData?.token) startPolling(tokenData.token);
    } catch (e) { toast.error('Download failed'); }
    setDownloadingScript(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.json')) { toast.error('Please upload a JSON scan report'); return; }
    setIsAnalyzing(true); setAnalyzeProgress(0); setAnalyzeStage('Reading report...'); setActiveView('results');
    try {
      setAnalyzeProgress(10);
      const text = await file.text();
      setAnalyzeStage('Parsing scan data...'); setAnalyzeProgress(20);
      let report: any;
      try { report = JSON.parse(text); } catch (e) { toast.error('Invalid JSON file'); setIsAnalyzing(false); return; }
      if (!report.processes && !report.network_connections && !report.startup_items) { toast.error('Invalid scan report'); setIsAnalyzing(false); return; }
      setAnalyzeStage('Analyzing processes...'); setAnalyzeProgress(45);
      await new Promise(r => setTimeout(r, 400));
      setAnalyzeStage('Checking network connections...'); setAnalyzeProgress(60);
      await new Promise(r => setTimeout(r, 300));
      setAnalyzeStage('Running Q-CORE threat intelligence...'); setAnalyzeProgress(80);
      const { data, error } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'analyze', user_id: userId, report, scan_type: report.scan_type || 'full', source: 'manual' }
      });
      if (error || !data?.success) { toast.error('Analysis failed'); setIsAnalyzing(false); return; }
      setAnalyzeStage('Complete!'); setAnalyzeProgress(100);
      setAnalysisResult(data as AnalysisResult); fetchHistory();
      if (data.threatScore >= 50) toast.error(`Threats detected! Score: ${data.threatScore}/100`, { duration: 10000 });
      else if (data.threatScore >= 10) toast.warning(`Minor issues. Score: ${data.threatScore}/100`);
      else toast.success(`System clean! Score: ${data.threatScore}/100`);
    } catch (e: any) { toast.error('Analysis failed: ' + (e.message || 'Unknown')); }
    setIsAnalyzing(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]); }, [userId]);

  const loadScanDetail = async (scan: ScanHistoryItem) => {
    try {
      const { data } = await supabase.functions.invoke('deep-scan-analyzer', { body: { action: 'get_detail', scan_id: scan.id } });
      if (data?.scan) {
        setAnalysisResult({ scan_id: data.scan.id, analysis: data.scan.analysis_result, threats: data.scan.threats_found || [], threatScore: data.scan.threat_score, threatLevel: data.scan.threat_level, recommendations: [], processes: data.scan.processes || [], networkConnections: data.scan.network_connections || [], startupItems: data.scan.startup_items || [], scanDuration: data.scan.scan_duration_ms });
        setActiveView('results');
      }
    } catch (e) { toast.error('Failed to load scan details'); }
  };

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'download', label: 'Download', icon: <DownloadIcon size={14} /> },
    { id: 'upload', label: 'Upload', icon: <UploadIcon size={14} /> },
    { id: 'results', label: 'Results', icon: <CpuIcon size={14} /> },
    { id: 'history', label: 'History', icon: <ClockIcon size={14} /> },
    { id: 'scheduled', label: 'Scheduled', icon: <CalendarIcon size={14} /> },
    { id: 'live_monitor', label: 'Live Monitor', icon: <ActivityIcon size={14} /> },
    { id: 'compare', label: 'Compare', icon: <GitCompareIcon size={14} /> },
    { id: 'geo_map', label: 'Geo Map', icon: <MapPinIcon size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-xl border border-red-500/40 bg-black overflow-hidden" style={{ boxShadow: '0 0 30px rgba(255,0,0,0.1)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-orange-950/10" />
        <div className="relative z-10 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-2 bg-red-500/20 rounded-xl blur-lg animate-pulse" />
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/50 flex items-center justify-center">
                  <CpuIcon size={28} className="text-red-400 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-mono font-bold text-white">
                  <span className="text-red-400" style={{ textShadow: '0 0 10px rgba(255,0,0,0.6)' }}>DEEP SCAN</span>
                  <span className="text-gray-500 mx-2">//</span>
                  <span className="text-gray-300">v4.0</span>
                </h2>
                <p className="text-xs font-mono text-red-400/70 tracking-widest uppercase">
                  Live Monitor &middot; GeoIP Mapping &middot; Scan Comparison &middot; WebSocket Realtime
                </p>
              </div>
            </div>
            {tokenPolling && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-pulse">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="text-blue-400 font-mono text-xs">Waiting for scan results...</span>
              </div>
            )}
            {tokenStatus === 'received' && !tokenPolling && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircleIcon size={14} className="text-green-400" />
                <span className="text-green-400 font-mono text-xs">Results received!</span>
              </div>
            )}
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1.5 mt-4 flex-wrap">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveView(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${activeView === t.id ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-gray-900/30 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ DOWNLOAD SCANNER ═══ */}
      {activeView === 'download' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><TerminalIcon size={18} className="text-red-400" /> How Deep Scan v4.0 Works</h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Download Scanner', desc: 'Get the Q-CORE scanner for your OS with auto-upload.', icon: <DownloadIcon size={20} className="text-red-400" /> },
                { step: '2', title: 'Run on Machine', desc: 'Execute with admin/root. Scans processes, network, startup.', icon: <CpuIcon size={20} className="text-orange-400" /> },
                { step: '3', title: 'Auto-Upload', desc: 'Results POST to Q-CORE. Dashboard updates via WebSocket.', icon: <ZapIcon size={20} className="text-blue-400" /> },
                { step: '4', title: 'Live Analysis', desc: 'GeoIP mapping, threat comparison, real-time monitoring.', icon: <ShieldIcon size={20} className="text-green-400" /> },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-mono font-bold text-sm">{item.step}</div>
                    {item.icon}
                  </div>
                  <h5 className="text-white font-mono text-sm font-bold mb-1">{item.title}</h5>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { platform: 'windows' as const, icon: <WindowsIcon size={24} className="text-blue-400" />, name: 'Windows', color: 'blue', file: 'qcore-deep-scan.ps1', desc: 'PowerShell script. Scans processes, services, network, startup, tasks, temp files.', reqs: ['Windows 10/11', 'Run as Administrator', 'Auto-uploads results'] },
              { platform: 'macos' as const, icon: <AppleIcon size={24} className="text-gray-300" />, name: 'macOS', color: 'gray', file: 'qcore-deep-scan.sh', desc: 'Bash script with Python. Scans processes, LaunchAgents, network, temp files.', reqs: ['macOS 12+', 'sudo required', 'Auto-uploads results'] },
              { platform: 'linux' as const, icon: <LinuxIcon size={24} className="text-orange-400" />, name: 'Linux', color: 'orange', file: 'qcore-deep-scan.sh', desc: 'Bash script. Scans processes, systemd, network, cron, temp directories.', reqs: ['Ubuntu/Debian/RHEL', 'sudo required', 'Auto-uploads results'] },
            ].map(p => {
              const isDetected = p.platform === detectedPlatform;
              const borderColor = p.color === 'blue' ? 'border-blue-500/30 hover:border-blue-500/50' : p.color === 'orange' ? 'border-orange-500/30 hover:border-orange-500/50' : 'border-gray-600/30 hover:border-gray-500/50';
              const btnColor = p.color === 'blue' ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25' : p.color === 'orange' ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500/25' : 'bg-gray-500/15 border-gray-600/40 text-gray-300 hover:bg-gray-500/25';
              return (
                <div key={p.platform} className={`rounded-xl border bg-black/80 p-6 transition-all ${borderColor} ${isDetected ? 'ring-1 ring-red-500/30' : ''}`}>
                  {isDetected && <div className="text-red-400 font-mono text-[10px] font-bold mb-2 uppercase tracking-wider">Detected Platform</div>}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-center">{p.icon}</div>
                    <div><h4 className="text-white font-mono font-bold">{p.name}</h4><p className="text-gray-500 font-mono text-xs">{p.platform === 'windows' ? 'PowerShell' : 'Bash'}</p></div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{p.desc}</p>
                  <div className="space-y-2 mb-4">
                    {p.reqs.map((r, i) => (<div key={i} className="flex items-center gap-2 text-xs text-gray-500 font-mono"><CheckCircleIcon size={12} className="text-green-400" /> {r}</div>))}
                  </div>
                  <button onClick={() => downloadScript(p.platform)} disabled={downloadingScript === p.platform} className={`w-full py-3 border rounded-lg transition-all font-mono text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${btnColor}`}>
                    {downloadingScript === p.platform ? <RefreshIcon size={16} className="animate-spin" /> : <DownloadIcon size={16} />}
                    {downloadingScript === p.platform ? 'Generating...' : `Download ${p.file}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ UPLOAD REPORT ═══ */}
      {activeView === 'upload' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
            <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><UploadIcon size={18} className="text-orange-400" /> Upload Scan Report</h3>
            <p className="text-gray-400 text-sm mb-4">If auto-upload didn't work, manually upload the JSON report.</p>
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-red-400 bg-red-500/10' : 'border-gray-700 hover:border-red-500/50 hover:bg-red-500/5'}`}>
              <UploadIcon size={48} className={`mx-auto mb-4 ${isDragging ? 'text-red-400' : 'text-gray-500'}`} />
              <p className="text-gray-300 font-mono text-sm mb-2">{isDragging ? 'Drop scan report here' : 'Drag & drop qcore-scan-report.json'}</p>
              <p className="text-gray-600 font-mono text-xs">Or click to browse</p>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
            </div>
          </div>
          {isAnalyzing && (
            <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-8 h-8"><div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-spin" style={{ borderTopColor: '#ef4444' }} /></div>
                <div><h4 className="text-white font-mono font-bold text-sm">Analyzing...</h4><p className="text-red-400/70 font-mono text-xs">{analyzeStage}</p></div>
              </div>
              <div className="h-2 bg-gray-900 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${analyzeProgress}%` }} /></div>
            </div>
          )}
        </div>
      )}

      {/* ═══ RESULTS ═══ */}
      {activeView === 'results' && analysisResult && <DeepScanResults result={analysisResult} platform={detectedPlatform} />}
      {activeView === 'results' && !analysisResult && !isAnalyzing && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-12 text-center">
          <CpuIcon size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 font-mono text-lg font-bold mb-2">No Analysis Results</h3>
          <p className="text-gray-600 font-mono text-sm mb-4">Download and run the scanner, or upload a report</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setActiveView('download')} className="px-6 py-2 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/25 transition-all font-mono text-sm">Download Scanner</button>
            <button onClick={() => setActiveView('upload')} className="px-6 py-2 bg-gray-900/50 border border-gray-800 text-gray-400 rounded-lg hover:text-white transition-all font-mono text-sm">Upload Report</button>
          </div>
        </div>
      )}

      {/* ═══ HISTORY ═══ */}
      {activeView === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-mono font-bold flex items-center gap-2"><ClockIcon size={18} className="text-red-400" /> Scan History</h3>
            <button onClick={fetchHistory} disabled={historyLoading} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 border border-gray-800 text-gray-400 rounded-lg hover:text-white transition-all font-mono text-xs">
              <RefreshIcon size={14} className={historyLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {scanHistory.length > 0 ? (
            <div className="space-y-2">
              {scanHistory.map(scan => {
                const tc = getThreatColor(scan.threat_level);
                return (
                  <div key={scan.id} className={`p-4 rounded-xl border ${tc.border} bg-black/80 hover:bg-gray-900/30 transition-all cursor-pointer`} onClick={() => loadScanDetail(scan)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${tc.bg} border ${tc.border} flex items-center justify-center`}>
                        <span className={`font-mono text-lg font-bold ${tc.text}`}>{scan.threat_score}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-mono text-sm font-bold">{scan.scan_type === 'full' ? 'Full System Scan' : scan.scan_type}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusColor(scan.threat_level)}`}>{scan.threat_level.toUpperCase()}</span>
                          {scan.source && scan.source !== 'manual' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-blue-400 border border-blue-500/30 bg-blue-500/10">
                              {scan.source === 'auto_upload' ? 'AUTO' : scan.source.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-gray-500 font-mono text-xs">{scan.os_info?.hostname || 'Unknown'}</span>
                          <span className="text-gray-600 font-mono text-xs">{scan.os_info?.os || ''}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 font-mono text-xs">{new Date(scan.created_at).toLocaleDateString()}</p>
                        <p className="text-gray-600 font-mono text-[10px]">{new Date(scan.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-black/80 p-12 text-center">
              <ClockIcon size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-mono text-sm">No scan history yet</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ SCHEDULED SCANS ═══ */}
      {activeView === 'scheduled' && <DeepScanScheduled userId={userId} />}

      {/* ═══ LIVE MONITOR ═══ */}
      {activeView === 'live_monitor' && <DeepScanLiveMonitor userId={userId} />}

      {/* ═══ COMPARE ═══ */}
      {activeView === 'compare' && <DeepScanCompare userId={userId} scanHistory={scanHistory} />}

      {/* ═══ GEO MAP ═══ */}
      {activeView === 'geo_map' && (
        <NetworkThreatMap
          connections={analysisResult?.networkConnections || []}
          scanId={analysisResult?.scan_id || undefined}
        />
      )}
    </div>
  );
};

export default DeepScanPanel;
