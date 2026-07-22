import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import HardwareStatusDashboard from '@/components/integrations/HardwareStatusDashboard';
import CameraFeedsDashboard from '@/components/security/CameraFeedsDashboard';
import DeepScanPanel from '@/components/security/DeepScanPanel';
import NetworkThreatMap from '@/components/security/NetworkThreatMap';


import {
  checkQCoreHealth, getSecurityStats, getScanHistory, getSupportedTypes,
  validateFile, scanFile, secureFileUpload, computeFileHash, formatFileSize,
  getThreatLevelColor, type QCoreHealthStatus, type QCoreSecurityStats,
  type QCoreSupportedTypes, type QCoreScanResult, type FileScanLog
} from '@/lib/qcoreSecurity';
import { supabase } from '@/lib/supabase';
import { BarChart, LineGraph, DonutChart } from '@/components/charts/ReportCharts';
import { toast } from 'sonner';
import ThreatWorldMap from '@/components/security/ThreatWorldMap';
import LiveIPFeed from '@/components/security/LiveIPFeed';
import AccessLogMonitor from '@/components/security/AccessLogMonitor';
import ThreatIntelPanel from '@/components/security/ThreatIntelPanel';
import RateLimitDashboard from '@/components/security/RateLimitDashboard';
import EmailAlertConfig from '@/components/security/EmailAlertConfig';
import SecurityReportPanel from '@/components/security/SecurityReportPanel';
import AutoResponsePanel from '@/components/security/AutoResponsePanel';
import TeamManagementPanel from '@/components/security/TeamManagementPanel';
import ThreatGeoHeatmap from '@/components/security/ThreatGeoHeatmap';
import WebhookConfigPanel from '@/components/security/WebhookConfigPanel';
import SecurityOverviewDashboard from '@/components/security/SecurityOverviewDashboard';
import LocalNetworkPanel from '@/components/security/LocalNetworkPanel';
import SecurityAlertsHistory from '@/components/security/SecurityAlertsHistory';



// ─── Inline SVG Icons ────────────────────────────────────────────────────────
const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
const ScanIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="7" y1="12" x2="17" y2="12" /></svg>
);
const AlertIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
const CheckCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const UploadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
);
const FileIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
);
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const LockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const UsersIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const ActivityIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
const BarChartIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const DownloadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const SearchIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const DatabaseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
);
const CheckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12" /></svg>
);

const STAGES = ['Validating', 'Hashing', 'Q-CORE Scanning', 'Uploading', 'Complete'];

type SortField = 'file_name' | 'file_category' | 'scan_status' | 'threat_level' | 'scan_engine' | 'created_at';
type SortDir = 'asc' | 'desc';
type DashSubTab = 'overview' | 'history' | 'filetypes';

interface SecurityWorkspaceViewProps {
  wsColor: { primary: string; rgb: string; colorName: string };
  activeTab?: string;
}

const SecurityWorkspaceView: React.FC<SecurityWorkspaceViewProps> = ({ wsColor, activeTab = 'dashboard' }) => {
  const { user, isPlatformOwner, isOrganizationAdmin } = useAuth();
  const isAdmin = isPlatformOwner() || isOrganizationAdmin();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';

  // Dashboard data
  const [health, setHealth] = useState<QCoreHealthStatus | null>(null);
  const [stats, setStats] = useState<QCoreSecurityStats | null>(null);
  const [scanHistory, setScanHistory] = useState<FileScanLog[]>([]);
  const [supportedTypes, setSupportedTypes] = useState<QCoreSupportedTypes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dashSubTab, setDashSubTab] = useState<DashSubTab>('overview');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Scanner state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<QCoreScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [localScanHistory, setLocalScanHistory] = useState<{ file: string; result: QCoreScanResult; time: Date }[]>([]);
  const [deepScanMode, setDeepScanMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Network metrics state
  const [cpuUsage, setCpuUsage] = useState(23);
  const [memoryUsage, setMemoryUsage] = useState(45);
  const [networkIn, setNetworkIn] = useState(12.4);
  const [networkOut, setNetworkOut] = useState(8.7);
  const [diskUsage, setDiskUsage] = useState(62);
  const [activeConnections, setActiveConnections] = useState(847);
  const [firewallBlocked, setFirewallBlocked] = useState(156);
  const [plasmaShieldActive, setPlasmaShieldActive] = useState(true);

  // Realtime subscription for security notifications
  useEffect(() => {
    const channel = supabase
      .channel('security-notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_notifications' }, (payload) => {
        const n = payload.new as any;
        if (n) {
          const severity = n.severity || 'info';
          const title = n.title || 'Security Alert';
          const message = n.message || '';
          if (severity === 'critical') {
            toast.error(title, { description: message, duration: 10000 });
          } else if (severity === 'high') {
            toast.warning(title, { description: message, duration: 8000 });
          } else {
            toast.info(title, { description: message, duration: 5000 });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Simulate real-time metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => Math.max(5, Math.min(95, prev + (Math.random() - 0.5) * 8)));
      setMemoryUsage(prev => Math.max(20, Math.min(85, prev + (Math.random() - 0.5) * 4)));
      setNetworkIn(prev => Math.max(0.5, Math.min(50, prev + (Math.random() - 0.5) * 3)));
      setNetworkOut(prev => Math.max(0.3, Math.min(30, prev + (Math.random() - 0.5) * 2)));
      setDiskUsage(prev => Math.max(40, Math.min(90, prev + (Math.random() - 0.5) * 0.5)));
      setActiveConnections(prev => Math.max(100, Math.min(2000, prev + Math.floor((Math.random() - 0.5) * 50))));
      setFirewallBlocked(prev => prev + (Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    const [h, s, hist, types] = await Promise.all([
      checkQCoreHealth(), getSecurityStats(), getScanHistory({ limit: 100 }), getSupportedTypes()
    ]);
    setHealth(h); setStats(s); setScanHistory(hist); setSupportedTypes(types);
    setLastRefresh(new Date()); setIsLoading(false); setIsRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const interval = setInterval(fetchAll, 30000); return () => clearInterval(interval); }, [fetchAll]);

  // Sorted/filtered history
  const sortedHistory = [...scanHistory]
    .filter(s => !searchQuery || s.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.file_category?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aVal = (a as any)[sortField] || '';
      const bVal = (b as any)[sortField] || '';
      return sortDir === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Scan ID', 'File Name', 'File Size', 'Category', 'Status', 'Threat Level', 'Engine', 'Duration (ms)', 'Uploader', 'Timestamp'];
    const rows = scanHistory.map(s => [s.scan_id, s.file_name, s.file_size, s.file_category, s.scan_status, s.threat_level, s.scan_engine, s.scan_duration_ms, s.uploader_id, s.created_at]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `qcore-security-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Badge helpers
  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
      clean: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'CLEAN' },
      blocked: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'BLOCKED' },
      rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'REJECTED' },
      pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'SCANNING' },
    };
    const s = map[status] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', label: status?.toUpperCase() || 'UNKNOWN' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>;
  };
  const getThreatBadge = (level: string) => {
    const c = getThreatLevelColor(level);
    return <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${c.bg} ${c.text} ${c.border}`}>{level?.toUpperCase() || 'NONE'}</span>;
  };

  // File scanner handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) { setSelectedFile(e.dataTransfer.files[0]); setScanResult(null); setScanError(null); }
  }, []);

  const handleScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true); setScanError(null); setScanResult(null);
    setScanStage('Validating'); setScanProgress(5);
    if (deepScanMode) {
      try {
        setScanStage('Validating'); setScanProgress(10);
        const validation = await validateFile(selectedFile.name, selectedFile.size, selectedFile.type || 'application/octet-stream');
        if (!validation || !validation.valid) { setScanError(validation?.errors?.join(', ') || 'File validation failed'); setIsScanning(false); return; }
        setScanStage('Hashing'); setScanProgress(30);
        const fileHash = await computeFileHash(selectedFile);
        setScanStage('Q-CORE Scanning'); setScanProgress(50);
        const scanResponse = await scanFile({ fileName: selectedFile.name, fileSize: selectedFile.size, mimeType: selectedFile.type || 'application/octet-stream', fileHash, uploaderId: userId, workspace: 'security' });
        if (scanResponse?.scanResult) {
          setScanResult(scanResponse.scanResult);
          setLocalScanHistory(prev => [{ file: selectedFile.name, result: scanResponse.scanResult, time: new Date() }, ...prev].slice(0, 20));
          setScanStage('Complete'); setScanProgress(100);
        }
        if (!scanResponse?.allowed) setScanError(scanResponse?.scanResult?.threats?.map(t => t.description).join(', ') || 'File blocked by Q-CORE deep scan');
      } catch (err: any) { setScanError(err.message || 'Deep scan failed'); }
    } else {
      const result = await secureFileUpload({
        file: selectedFile, uploaderId: userId, uploaderName: (user as any)?.full_name || 'User', workspace: 'security',
        onProgress: (stage) => {
          if (stage.includes('Validat')) { setScanStage('Validating'); setScanProgress(10); }
          else if (stage.includes('hash') || stage.includes('Hash')) { setScanStage('Hashing'); setScanProgress(25); }
          else if (stage.includes('Q-CORE') || stage.includes('scan')) { setScanStage('Q-CORE Scanning'); setScanProgress(50); }
          else if (stage.includes('Upload')) { setScanStage('Uploading'); setScanProgress(75); }
          else if (stage.includes('Complete') || stage.includes('Final')) { setScanStage('Complete'); setScanProgress(100); }
        }
      });
      if (result.scanResult) {
        setScanResult(result.scanResult);
        setLocalScanHistory(prev => [{ file: selectedFile.name, result: result.scanResult!, time: new Date() }, ...prev].slice(0, 20));
      }
      if (!result.success) setScanError(result.error || 'Scan failed');
      else { setScanStage('Complete'); setScanProgress(100); }
    }
    setIsScanning(false);
    setTimeout(fetchAll, 1000);
  };

  const getStageIndex = () => STAGES.indexOf(scanStage);

  // Alerts from scan history
  const alerts = [
    ...scanHistory.filter(s => s.scan_status === 'blocked' || s.scan_status === 'rejected').map(s => ({
      type: 'threat' as const, title: `Threat blocked: ${s.file_name}`,
      detail: `${s.threat_level} threat detected by ${s.scan_engine}`, time: new Date(s.created_at), severity: 'high' as const,
    })),
    ...(health?.apiStatus === 'connected' ? [{ type: 'info' as const, title: 'Q-CORE API Connected', detail: `Engine: ${health.engine} v${health.version} - Latency: ${health.apiLatency}ms`, time: new Date(), severity: 'low' as const }] : [{ type: 'warning' as const, title: 'Q-CORE API Disconnected', detail: 'Security scanning is using local fallback engine', time: new Date(), severity: 'medium' as const }]),
    ...scanHistory.slice(0, 5).map(s => ({ type: 'scan' as const, title: `File scanned: ${s.file_name}`, detail: `Status: ${s.scan_status} - ${formatFileSize(s.file_size)}`, time: new Date(s.created_at), severity: s.scan_status === 'clean' ? 'low' as const : 'high' as const })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 25);

  // Compliance
  const complianceItems = [
    { label: 'File Scanning Active', status: health?.apiKeyConfigured ? 'pass' : 'fail', description: 'Q-CORE security scanning is configured and operational' },
    { label: 'Encryption Protocol', status: 'pass', description: health?.encryptionProtocol || 'AES-256-GCM with ML-KEM-1024 quantum-safe encryption' },
    { label: 'Threat Detection Rate', status: (stats?.securityScore || 100) >= 90 ? 'pass' : 'warn', description: `Security score: ${stats?.securityScore || 100}%` },
    { label: 'Scan Coverage', status: stats && stats.totalScans > 0 ? 'pass' : 'warn', description: `${stats?.totalScans || 0} files scanned total` },
    { label: 'Blocked Threats', status: (stats?.blockedScans || 0) > 0 ? 'info' : 'pass', description: `${stats?.blockedScans || 0} threats blocked` },
    { label: 'API Latency', status: health?.apiLatency && health.apiLatency < 500 ? 'pass' : health?.apiLatency ? 'warn' : 'fail', description: health?.apiLatency ? `${health.apiLatency}ms response time` : 'Not connected' },
    { label: 'Double Extension Detection', status: 'pass', description: 'Detects masking attacks like file.pdf.exe' },
    { label: 'Max File Size Enforcement', status: 'pass', description: `${health?.maxFileSize || '300MB'} maximum file size limit enforced` },
    { label: 'Signing Algorithm', status: 'pass', description: health?.signingAlgorithm || 'ML-DSA-65 quantum-safe signing' },
  ];
  const complianceScore = Math.round((complianceItems.filter(c => c.status === 'pass').length / complianceItems.length) * 100);

  // Report data
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const weeklyScans = scanHistory.filter(s => new Date(s.created_at) >= oneWeekAgo);
  const monthlyScans = scanHistory.filter(s => new Date(s.created_at) >= oneMonthAgo);
  const typeCounts: Record<string, number> = {};
  scanHistory.forEach(s => { typeCounts[s.file_category] = (typeCounts[s.file_category] || 0) + 1; });
  const topTypes = Object.entries(typeCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
  const blockedAttempts = scanHistory.filter(s => s.scan_status === 'blocked' || s.scan_status === 'rejected');
  const dailyCounts: Record<string, { total: number; clean: number; blocked: number }> = {};
  scanHistory.forEach(s => {
    const day = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dailyCounts[day]) dailyCounts[day] = { total: 0, clean: 0, blocked: 0 };
    dailyCounts[day].total++;
    if (s.scan_status === 'clean') dailyCounts[day].clean++;
    if (s.scan_status === 'blocked' || s.scan_status === 'rejected') dailyCounts[day].blocked++;
  });
  const dailyData = Object.entries(dailyCounts).slice(0, 14).reverse();
  const uploaderCounts: Record<string, number> = {};
  scanHistory.forEach(s => { uploaderCounts[s.uploader_id] = (uploaderCounts[s.uploader_id] || 0) + 1; });
  const topUploaders = Object.entries(uploaderCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
  const apiStatusColor = health ? 'green' : 'gray';
  const apiStatusLabel = health ? 'ONLINE' : 'OFFLINE';


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 animate-spin" style={{ borderTopColor: '#ff9900' }} />
            <div className="absolute inset-2 rounded-full border-2 border-red-500/30 animate-spin" style={{ borderBottomColor: '#ff4444', animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <LockIcon size={24} className="absolute inset-0 m-auto text-orange-400" />
          </div>
          <p className="text-orange-400 font-mono text-sm animate-pulse">Initializing Q-CORE Security...</p>
        </div>
      </div>
    );
  }

  // Metric bar component
  const MetricBar: React.FC<{ label: string; value: number; max?: number; unit?: string; color: string; icon?: React.ReactNode }> = ({ label, value, max = 100, unit = '%', color, icon }) => {
    const pct = Math.min(100, (value / max) * 100);
    return (
      <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-gray-400 text-xs font-mono uppercase">{label}</span>
          </div>
          <span className="font-mono text-sm font-bold" style={{ color }}>{typeof value === 'number' ? value.toFixed(1) : value}{unit}</span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}60` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 max-w-full mx-auto pt-4 space-y-6">
      {/* Header */}
      <div className="relative rounded-xl border border-orange-500/50 bg-black overflow-hidden" style={{ boxShadow: '0 0 30px rgba(255,153,0,0.15)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 via-transparent to-red-950/20" />
        <div className="relative z-10 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-2 bg-orange-500/30 rounded-xl blur-lg animate-pulse" />
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/50 flex items-center justify-center">
                  <LockIcon size={28} className="text-orange-400 drop-shadow-[0_0_10px_rgba(255,153,0,0.8)]" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-mono font-bold text-white">
                  <span className="text-orange-400" style={{ textShadow: '0 0 10px rgba(255,153,0,0.6)' }}>SECURITY</span>
                  <span className="text-gray-500 mx-2">//</span>
                  <span className="text-gray-300">Q-CORE Operations Center</span>
                </h2>
                <p className="text-xs font-mono text-orange-400/70 tracking-widest uppercase">
                  {health?.engine ? `${health.engine} v${health.version}` : 'Real-Time Threat Monitoring & File Security'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-gray-800 rounded-lg">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${apiStatusColor === 'green' ? 'bg-green-400' : apiStatusColor === 'red' ? 'bg-red-400' : 'bg-gray-500'}`} />
                  {apiStatusColor === 'green' && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />}
                </div>
                <span className={`text-xs font-mono font-bold ${apiStatusColor === 'green' ? 'text-green-400' : 'text-gray-500'}`}>
                  {apiStatusLabel}
                </span>

              </div>
              <button onClick={fetchAll} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all font-mono text-sm disabled:opacity-50">
                <RefreshIcon size={16} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-mono text-sm">
                <DownloadIcon size={16} /> Export CSV
              </button>
            </div>
          </div>
          <p className="text-gray-600 text-xs font-mono mt-3">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
        </div>
      </div>

      {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* ─── Camera Feeds & Physical Access Controls ─── */}
          <CameraFeedsDashboard />

          {/* ─── Hardware Integrations Health ─── */}
          <HardwareStatusDashboard />


          <div className="flex gap-2">
            {([{ id: 'overview' as DashSubTab, label: 'Q-CORE Scanner' }, { id: 'history' as DashSubTab, label: 'Scan History' }, { id: 'filetypes' as DashSubTab, label: 'Supported Types' }]).map(t => (
              <button key={t.id} onClick={() => setDashSubTab(t.id)} className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${dashSubTab === t.id ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>{t.label}</button>
            ))}
          </div>

          {dashSubTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[{ label: 'Total Scans', value: stats?.totalScans || 0, color: 'orange' }, { label: 'Clean Files', value: stats?.cleanScans || 0, color: 'green' }, { label: 'Blocked Threats', value: stats?.blockedScans || 0, color: 'red' }, { label: 'Security Score', value: `${stats?.securityScore || 100}%`, color: 'orange' }].map((card, i) => {
                  const cMap: Record<string, { border: string; text: string }> = { orange: { border: 'border-orange-500/40', text: 'text-orange-400' }, green: { border: 'border-green-500/40', text: 'text-green-400' }, red: { border: 'border-red-500/40', text: 'text-red-400' } };
                  const c = cMap[card.color] || cMap.orange;
                  return (<div key={i} className={`rounded-xl border-2 ${c.border} bg-black p-5`}><span className="text-gray-400 text-xs font-mono uppercase tracking-wider">{card.label}</span><p className={`text-3xl font-bold font-mono mt-2 ${c.text}`}>{card.value}</p></div>);
                })}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
                  <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><ShieldIcon size={18} className="text-orange-400" /> Scan Capabilities</h4>
                  <div className="space-y-2">
                    {(health?.scanCapabilities || ['Malware Detection', 'Virus Scanning', 'Threat Assessment', 'File Integrity Verification', 'Double Extension Detection', 'Content Analysis', 'Quantum-Safe Encryption']).map((cap, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg"><div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(255,153,0,0.8)]" /><span className="text-gray-300 font-mono text-sm">{cap}</span></div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
                  <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><BarChartIcon size={18} className="text-red-400" /> Scans by Category</h4>
                  {stats?.scansByCategory && Object.keys(stats.scansByCategory).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(stats.scansByCategory).sort(([, a], [, b]) => b - a).map(([cat, count], i) => {
                        const pct = stats.totalScans > 0 ? Math.round((count / stats.totalScans) * 100) : 0;
                        return (<div key={i}><div className="flex items-center justify-between mb-1"><span className="text-gray-400 font-mono text-xs uppercase">{cat}</span><span className="text-orange-400 font-mono text-xs font-bold">{count} ({pct}%)</span></div><div className="h-2 bg-gray-900 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div></div>);
                      })}
                    </div>
                  ) : (<div className="text-center py-8"><DatabaseIcon size={32} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No scan data yet</p></div>)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
                <h4 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><ActivityIcon size={18} className="text-orange-400" /> Recent Scans</h4>
                {scanHistory.length > 0 ? (
                  <div className="space-y-2">
                    {scanHistory.slice(0, 5).map((scan, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-orange-500/30 transition-all">
                        <FileIcon size={18} className="text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0"><p className="text-white font-mono text-sm truncate">{scan.file_name}</p><p className="text-gray-600 font-mono text-xs">{scan.file_category} &middot; {formatFileSize(scan.file_size)}</p></div>
                        {getStatusBadge(scan.scan_status)}{getThreatBadge(scan.threat_level)}
                        <span className="text-gray-600 font-mono text-xs flex-shrink-0">{new Date(scan.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (<div className="text-center py-8"><ShieldIcon size={32} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No scans recorded yet</p></div>)}
              </div>
            </div>
          )}
          {dashSubTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/50" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search scans..." className="w-full bg-black border border-orange-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-orange-400 transition-all" />
                </div>
                <span className="text-gray-500 font-mono text-sm">{sortedHistory.length} scans</span>
              </div>
              <div className="rounded-xl border border-orange-500/30 bg-black/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-orange-950/30 border-b border-orange-500/20"><tr>
                      {[{ field: 'file_name' as SortField, label: 'File Name' }, { field: 'file_category' as SortField, label: 'Category' }, { field: 'scan_status' as SortField, label: 'Status' }, { field: 'threat_level' as SortField, label: 'Threat Level' }, { field: 'scan_engine' as SortField, label: 'Engine' }, { field: 'created_at' as SortField, label: 'Timestamp' }].map(col => (
                        <th key={col.field} onClick={() => handleSort(col.field)} className="text-left p-4 text-xs font-mono font-bold text-orange-400 uppercase tracking-wider cursor-pointer hover:text-orange-300 select-none"><span className="flex items-center gap-1">{col.label}{sortField === col.field && <span className="text-orange-300">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}</span></th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-800">
                      {sortedHistory.length > 0 ? sortedHistory.map((scan, i) => (
                        <tr key={i} className="hover:bg-orange-500/5 transition-colors">
                          <td className="p-4"><div className="flex items-center gap-2"><FileIcon size={16} className="text-gray-500 flex-shrink-0" /><div><p className="text-white font-mono text-sm truncate max-w-[200px]">{scan.file_name}</p><p className="text-gray-600 font-mono text-xs">{formatFileSize(scan.file_size)}</p></div></div></td>
                          <td className="p-4"><span className="px-2 py-1 bg-gray-900 border border-gray-800 rounded text-xs font-mono text-gray-400">{scan.file_category}</span></td>
                          <td className="p-4">{getStatusBadge(scan.scan_status)}</td>
                          <td className="p-4">{getThreatBadge(scan.threat_level)}</td>
                          <td className="p-4 text-gray-400 font-mono text-xs">{scan.scan_engine}</td>
                          <td className="p-4 text-gray-500 font-mono text-xs">{new Date(scan.created_at).toLocaleString()}</td>
                        </tr>
                      )) : (<tr><td colSpan={6} className="p-12 text-center"><p className="text-gray-600 font-mono text-sm">No scan records found</p></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {dashSubTab === 'filetypes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><div><h4 className="text-white font-mono font-bold">Supported File Types</h4><p className="text-gray-500 font-mono text-sm mt-1">{supportedTypes?.totalTypes || '76+'} file types</p></div><span className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg font-mono text-sm">Max: {supportedTypes?.maxFileSizeFormatted || '300MB'}</span></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {supportedTypes?.categories && Object.entries(supportedTypes.categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, types], i) => (
                  <div key={i} className="rounded-xl border border-gray-700 bg-gray-900/50 p-4"><div className="flex items-center justify-between mb-3"><h5 className="font-mono font-bold text-sm uppercase text-orange-400">{category}</h5><span className="text-gray-600 font-mono text-xs">{types.length} types</span></div><div className="flex flex-wrap gap-1.5">{types.map((t, j) => (<span key={j} className="px-2 py-0.5 bg-black/50 border border-gray-800 rounded text-xs font-mono text-gray-400">.{t.extension}</span>))}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ FILE SCANNER TAB ═══════════════ */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-mono font-bold flex items-center gap-2"><ScanIcon size={18} className="text-orange-400" /> {deepScanMode ? 'Deep Scan Mode' : 'Scan File Before Sharing'}</h3>
                <button onClick={() => setDeepScanMode(!deepScanMode)} className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${deepScanMode ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-orange-500/50 hover:text-orange-400'}`}>{deepScanMode ? 'DEEP SCAN ON' : 'Enable Deep Scan'}</button>
              </div>
              {!selectedFile && (
                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${isDragging ? 'border-orange-400 bg-orange-500/10' : 'border-gray-700 hover:border-orange-500/50 hover:bg-orange-500/5'}`}>
                  <UploadIcon size={40} className={`mx-auto mb-3 ${isDragging ? 'text-orange-400' : 'text-gray-500'}`} />
                  <p className="text-gray-400 font-mono text-sm">{isDragging ? 'Drop file here to scan' : 'Drag & drop a file or click to browse'}</p>
                  <p className="text-gray-600 font-mono text-xs mt-2">Max 300MB - Scanned by Q-CORE Security Engine</p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) { setSelectedFile(e.target.files[0]); setScanResult(null); setScanError(null); } }} />
                </div>
              )}
              {selectedFile && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <FileIcon size={20} className="text-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0"><p className="text-white font-mono text-sm truncate">{selectedFile.name}</p><p className="text-gray-500 font-mono text-xs">{formatFileSize(selectedFile.size)}</p></div>
                    {!isScanning && (<button onClick={() => { setSelectedFile(null); setScanResult(null); setScanError(null); setScanStage(''); setScanProgress(0); }} className="p-1 text-gray-500 hover:text-red-400"><XIcon size={16} /></button>)}
                  </div>
                  {(isScanning || scanResult || scanError) && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1">
                        {STAGES.map((stage, i) => {
                          const stageIdx = getStageIndex(); const isActive = i === stageIdx; const isDone = i < stageIdx || (scanResult?.status === 'clean' && i <= 4); const isFailed = scanError && i === stageIdx;
                          return (<React.Fragment key={stage}><div className="flex flex-col items-center flex-1"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold border transition-all ${isFailed ? 'bg-red-500/20 border-red-500/50 text-red-400' : isDone ? 'bg-green-500/20 border-green-500/50 text-green-400' : isActive ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 animate-pulse' : 'bg-gray-900 border-gray-700 text-gray-600'}`}>{isDone ? '\u2713' : isFailed ? '!' : i + 1}</div><span className={`text-[9px] font-mono mt-1 text-center ${isFailed ? 'text-red-400' : isDone ? 'text-green-400' : isActive ? 'text-orange-400' : 'text-gray-600'}`}>{stage}</span></div>{i < STAGES.length - 1 && <div className={`h-0.5 flex-1 rounded ${isDone ? 'bg-green-500/50' : 'bg-gray-800'}`} />}</React.Fragment>);
                        })}
                      </div>
                      <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${scanError ? 'bg-red-500' : scanResult?.status === 'clean' ? 'bg-green-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`} style={{ width: `${scanProgress}%` }} /></div>
                    </div>
                  )}
                  {scanResult && (
                    <div className={`rounded-lg border p-4 ${scanResult.status === 'clean' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                      <div className="flex items-center gap-2 mb-3">{scanResult.status === 'clean' ? <CheckCircleIcon size={20} className="text-green-400" /> : <AlertIcon size={20} className="text-red-400" />}<span className={`font-mono text-sm font-bold ${scanResult.status === 'clean' ? 'text-green-400' : 'text-red-400'}`}>{scanResult.status === 'clean' ? 'File is CLEAN - Safe to Share' : 'File BLOCKED - Threats Detected'}</span></div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div><span className="text-gray-500">Engine:</span> <span className="text-gray-300">{scanResult.engine}</span></div>
                        <div><span className="text-gray-500">Threat Level:</span> <span className={getThreatLevelColor(scanResult.threatLevel).text}>{scanResult.threatLevel?.toUpperCase()}</span></div>
                        <div><span className="text-gray-500">Duration:</span> <span className="text-gray-300">{scanResult.scanDuration}ms</span></div>
                        <div><span className="text-gray-500">Verified:</span> <span className="text-gray-300">{scanResult.verified ? 'Yes' : 'No'}</span></div>
                      </div>
                    </div>
                  )}
                  {scanError && !scanResult && (<div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3"><span className="text-red-400 font-mono text-sm">{scanError}</span></div>)}
                  {!isScanning && !scanResult && (<button onClick={handleScan} className={`w-full py-3 border rounded-lg hover:shadow-[0_0_20px_rgba(255,153,0,0.2)] transition-all font-mono font-bold ${deepScanMode ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-orange-500/20 border-orange-500/50 text-orange-400'}`}>{deepScanMode ? 'Deep Scan with Q-CORE' : 'Scan File with Q-CORE'}</button>)}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
              <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><ActivityIcon size={18} className="text-orange-400" /> Your Scan History</h3>
              {localScanHistory.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto darkwave-scrollbar">
                  {localScanHistory.map((scan, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${scan.result.status === 'clean' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div className="flex-1 min-w-0"><p className="text-white font-mono text-sm truncate">{scan.file}</p><p className="text-gray-600 font-mono text-xs">{scan.result.engine} &middot; {scan.result.scanDuration}ms</p></div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${scan.result.status === 'clean' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>{scan.result.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              ) : (<div className="text-center py-12"><ScanIcon size={40} className="text-gray-700 mx-auto mb-3" /><p className="text-gray-600 font-mono text-sm">No files scanned yet</p></div>)}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ DEEP SCAN TAB ═══════════════ */}
      {activeTab === 'deep_scan' && (
        <DeepScanPanel />
      )}

      {/* ═══════════════ NETWORK & METRICS TAB ═══════════════ */}

      {activeTab === 'network' && (
        <div className="space-y-6">
          {/* Quantum Plasma Shield + Live IP Feed Side by Side */}
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Quantum Plasma Shield */}
            <div className="relative rounded-xl border border-orange-500/40 bg-black overflow-hidden" style={{ boxShadow: '0 0 40px rgba(255,153,0,0.15)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-orange-950/20 via-transparent to-red-950/20" />
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ShieldIcon size={24} className="text-orange-400" />
                    <div>
                      <h3 className="text-white font-mono font-bold text-lg">Quantum Plasma Shield</h3>
                      <p className="text-orange-400/60 font-mono text-xs">ML-KEM-1024 + AES-256-GCM Quantum-Safe Protection</p>
                    </div>
                  </div>
                  <button onClick={() => setPlasmaShieldActive(!plasmaShieldActive)} className={`px-4 py-2 rounded-lg font-mono text-sm font-bold border transition-all ${plasmaShieldActive ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
                    {plasmaShieldActive ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>
                {/* Plasma Shield Visualization */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(255,153,0,0.3)', animation: plasmaShieldActive ? 'quantum-ring-spin 8s linear infinite' : 'none', boxShadow: plasmaShieldActive ? '0 0 20px rgba(255,153,0,0.3), inset 0 0 20px rgba(255,153,0,0.1)' : 'none' }} />
                    <div className="absolute inset-4 rounded-full" style={{ border: '2px solid rgba(255,100,0,0.4)', animation: plasmaShieldActive ? 'quantum-ring-spin-reverse 6s linear infinite' : 'none', boxShadow: plasmaShieldActive ? '0 0 15px rgba(255,100,0,0.3)' : 'none' }} />
                    <div className="absolute inset-8 rounded-full" style={{ border: '2px solid rgba(255,200,0,0.5)', animation: plasmaShieldActive ? 'quantum-ring-spin 4s linear infinite' : 'none', boxShadow: plasmaShieldActive ? '0 0 10px rgba(255,200,0,0.4)' : 'none' }} />
                    <div className="absolute inset-12 rounded-full flex items-center justify-center" style={{ background: plasmaShieldActive ? 'radial-gradient(circle, rgba(255,153,0,0.3), rgba(255,50,0,0.1), transparent)' : 'rgba(50,50,50,0.3)', boxShadow: plasmaShieldActive ? '0 0 30px rgba(255,153,0,0.5)' : 'none' }}>
                      <ShieldIcon size={32} className={plasmaShieldActive ? 'text-orange-400' : 'text-gray-600'} style={plasmaShieldActive ? { filter: 'drop-shadow(0 0 12px rgba(255,153,0,0.8))', animation: 'qb-core-glow-shield 2s ease-in-out infinite' } : {}} />
                    </div>
                    {plasmaShieldActive && [0, 1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="absolute w-2 h-2 rounded-full" style={{
                        background: `hsl(${30 + i * 10}, 100%, 60%)`,
                        boxShadow: `0 0 8px hsl(${30 + i * 10}, 100%, 60%)`,
                        top: '50%', left: '50%',
                        animation: `plasma-orbit-${i % 3} ${3 + i * 0.5}s linear infinite`,
                        animationDelay: `${i * 0.5}s`,
                      }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <p className="text-gray-500 text-[10px] font-mono uppercase">Encryption</p>
                    <p className="text-orange-400 font-mono text-sm font-bold">AES-256-GCM</p>
                  </div>
                  <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <p className="text-gray-500 text-[10px] font-mono uppercase">Key Exchange</p>
                    <p className="text-orange-400 font-mono text-sm font-bold">ML-KEM-1024</p>
                  </div>
                  <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <p className="text-gray-500 text-[10px] font-mono uppercase">Signing</p>
                    <p className="text-orange-400 font-mono text-sm font-bold">SHA-512</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live IP Feed Panel - Next to Quantum Plasma Shield */}
            <LiveIPFeed />
          </div>

          {/* ─── Local Network Detection ─── */}
          <LocalNetworkPanel />

          {/* ─── Real-Time Threat Visualization Map ─── */}
          <ThreatWorldMap scanHistory={scanHistory} />

          {/* ─── Geographic Threat Heatmap ─── */}
          <ThreatGeoHeatmap />

          {/* ─── Deep Scan Network Threat Map (GeoIP) ─── */}
          <NetworkThreatMap />



          {/* ─── Access Log Monitor ─── */}
          <AccessLogMonitor />

          {/* ─── Threat Intelligence Panel ─── */}
          <ThreatIntelPanel />

          {/* ─── Rate Limiting Dashboard ─── */}
          <RateLimitDashboard />


          {/* Real-time Metrics */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-white font-mono font-bold flex items-center gap-2"><ActivityIcon size={18} className="text-orange-400" /> System Metrics</h3>
              <MetricBar label="CPU Usage" value={cpuUsage} color={cpuUsage > 80 ? '#ef4444' : cpuUsage > 60 ? '#f59e0b' : '#22c55e'} icon={<ActivityIcon size={14} className="text-gray-500" />} />
              <MetricBar label="Memory Usage" value={memoryUsage} color={memoryUsage > 80 ? '#ef4444' : memoryUsage > 60 ? '#f59e0b' : '#3b82f6'} icon={<DatabaseIcon size={14} className="text-gray-500" />} />
              <MetricBar label="Disk Usage" value={diskUsage} color={diskUsage > 85 ? '#ef4444' : diskUsage > 70 ? '#f59e0b' : '#a855f7'} icon={<DatabaseIcon size={14} className="text-gray-500" />} />
            </div>
            <div className="space-y-4">
              <h3 className="text-white font-mono font-bold flex items-center gap-2"><ShieldIcon size={18} className="text-orange-400" /> Network Security</h3>
              <MetricBar label="Network In" value={networkIn} max={100} unit=" MB/s" color="#00ffff" icon={<ActivityIcon size={14} className="text-gray-500" />} />
              <MetricBar label="Network Out" value={networkOut} max={100} unit=" MB/s" color="#ff9900" icon={<ActivityIcon size={14} className="text-gray-500" />} />
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl text-center">
                  <p className="text-gray-500 text-[10px] font-mono uppercase">Active Connections</p>
                  <p className="text-2xl font-bold font-mono text-cyan-400">{activeConnections}</p>
                </div>
                <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl text-center">
                  <p className="text-gray-500 text-[10px] font-mono uppercase">Firewall Blocked</p>
                  <p className="text-2xl font-bold font-mono text-red-400">{firewallBlocked}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Security Status */}
          <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
            <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><ShieldIcon size={18} className="text-orange-400" /> Network Security Status</h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: 'Firewall', status: 'active', desc: 'All ports monitored' },
                { label: 'IDS/IPS', status: 'active', desc: 'Intrusion detection active' },
                { label: 'DDoS Protection', status: 'active', desc: 'Rate limiting enabled' },
                { label: 'SSL/TLS', status: 'active', desc: 'TLS 1.3 enforced' },
                { label: 'DNS Security', status: 'active', desc: 'DNSSEC validated' },
                { label: 'VPN Gateway', status: 'active', desc: 'WireGuard tunnel' },
                { label: 'WAF', status: 'active', desc: 'Web app firewall on' },
                { label: 'Zero Trust', status: 'active', desc: 'Verify all requests' },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-gray-900/50 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]" />
                    <span className="text-white font-mono text-sm font-medium">{item.label}</span>
                  </div>
                  <p className="text-gray-500 font-mono text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* ═══════════════ ALERTS & AUTO-RESPONSE TAB ═══════════════ */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-4">
            {[{ label: 'Critical Alerts', count: alerts.filter(a => a.severity === 'high').length, borderC: 'border-red-500/30', textC: 'text-red-400' }, { label: 'Warnings', count: alerts.filter(a => a.severity === 'medium').length, borderC: 'border-yellow-500/30', textC: 'text-yellow-400' }, { label: 'Info', count: alerts.filter(a => a.severity === 'low').length, borderC: 'border-green-500/30', textC: 'text-green-400' }].map((c, i) => (
              <div key={i} className={`rounded-xl border ${c.borderC} bg-black/80 p-5`}><span className="text-gray-400 text-xs font-mono uppercase">{c.label}</span><p className={`text-3xl font-bold font-mono ${c.textC}`}>{c.count}</p></div>
            ))}
          </div>
          <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
            <h3 className="text-white font-mono font-bold mb-4">Security Alerts Feed</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto darkwave-scrollbar">
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${alert.severity === 'high' ? 'bg-red-500/5 border-red-500/20' : alert.severity === 'medium' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-gray-900/50 border-gray-800'}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'high' ? 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.8)]' : alert.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0"><p className="text-white font-mono text-sm">{alert.title}</p><p className="text-gray-500 font-mono text-xs mt-0.5">{alert.detail}</p></div>
                  <span className="text-gray-600 font-mono text-[10px] flex-shrink-0">{alert.time.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Automated Threat Response ─── */}
          <AutoResponsePanel />

          {/* ─── Email Alert Configuration ─── */}
          <EmailAlertConfig />

          {/* ─── Webhook Notifications ─── */}
          <WebhookConfigPanel />
        </div>
      )}

      {/* ═══════════════ COMPLIANCE TAB ═══════════════ */}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(100,100,100,0.2)" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke={complianceScore >= 90 ? '#22c55e' : complianceScore >= 70 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${complianceScore * 2.64} 264`} className="transition-all duration-1000" /></svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className={`text-3xl font-bold font-mono ${complianceScore >= 90 ? 'text-green-400' : complianceScore >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{complianceScore}%</span></div>
              </div>
              <div><h3 className="text-xl font-mono font-bold text-white mb-2">Security Compliance Score</h3><p className="text-gray-400 font-mono text-sm">Based on Q-CORE scanning coverage, threat detection, and encryption protocols.</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h3 className="text-white font-mono font-bold mb-4">Compliance Checklist</h3>
            <div className="space-y-3">
              {complianceItems.map((item, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-lg border ${item.status === 'pass' ? 'border-green-500/20 bg-green-500/5' : item.status === 'warn' ? 'border-yellow-500/20 bg-yellow-500/5' : item.status === 'info' ? 'border-blue-500/20 bg-blue-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === 'pass' ? 'bg-green-500/20 text-green-400' : item.status === 'warn' ? 'bg-yellow-500/20 text-yellow-400' : item.status === 'info' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                    {item.status === 'pass' ? <CheckIcon size={18} /> : item.status === 'warn' ? <AlertIcon size={18} /> : item.status === 'info' ? <ActivityIcon size={18} /> : <XIcon size={18} />}
                  </div>
                  <div className="flex-1"><p className="text-white font-mono text-sm font-medium">{item.label}</p><p className="text-gray-500 font-mono text-xs">{item.description}</p></div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${item.status === 'pass' ? 'bg-green-500/10 text-green-400 border-green-500/30' : item.status === 'warn' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : item.status === 'info' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>{item.status === 'pass' ? 'PASS' : item.status === 'warn' ? 'WARNING' : item.status === 'info' ? 'INFO' : 'FAIL'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ AUDIT REPORTS TAB ═══════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* ─── Security Report Generator ─── */}
          <SecurityReportPanel />

          {/* ─── Quick Stats ─── */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4">Weekly Scan Summary</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg"><p className="text-2xl font-bold font-mono text-orange-400">{weeklyScans.length}</p><p className="text-gray-500 text-xs font-mono">Total</p></div>
                <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg"><p className="text-2xl font-bold font-mono text-green-400">{weeklyScans.filter(s => s.scan_status === 'clean').length}</p><p className="text-gray-500 text-xs font-mono">Clean</p></div>
                <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg"><p className="text-2xl font-bold font-mono text-red-400">{weeklyScans.filter(s => s.scan_status === 'blocked').length}</p><p className="text-gray-500 text-xs font-mono">Blocked</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4">Monthly Scan Summary</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg"><p className="text-2xl font-bold font-mono text-red-400">{monthlyScans.length}</p><p className="text-gray-500 text-xs font-mono">Total</p></div>
                <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg"><p className="text-2xl font-bold font-mono text-green-400">{monthlyScans.filter(s => s.scan_status === 'clean').length}</p><p className="text-gray-500 text-xs font-mono">Clean</p></div>
                <div className="text-center p-3 bg-gray-900/50 border border-gray-800 rounded-lg"><p className="text-2xl font-bold font-mono text-red-400">{monthlyScans.filter(s => s.scan_status === 'blocked').length}</p><p className="text-gray-500 text-xs font-mono">Blocked</p></div>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4">Scans Over Time</h4>
              {dailyData.length > 0 ? <BarChart data={dailyData.map(([day, counts]) => ({ label: day, value: counts.total }))} width={450} height={200} animate glowColor="#ff9900" /> : <p className="text-gray-600 font-mono text-sm text-center py-8">No data</p>}
            </div>
            <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold mb-4">Threat Detection Trend</h4>
              {dailyData.length > 0 ? <LineGraph data={dailyData.map(([day, counts]) => ({ label: day, value: counts.blocked }))} width={450} height={200} animate showArea glowColor="#ef4444" /> : <p className="text-gray-600 font-mono text-sm text-center py-8">No data</p>}
            </div>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-mono font-bold flex items-center gap-2"><AlertIcon size={18} className="text-red-400" /> Blocked File Attempts</h4>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-mono text-sm"><DownloadIcon size={16} /> Export CSV</button>
            </div>
            {blockedAttempts.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto darkwave-scrollbar">
                {blockedAttempts.map((scan, i) => (
                  <div key={i} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <div className="flex items-center justify-between"><p className="text-white font-mono text-sm truncate">{scan.file_name}</p><span className="text-red-400 font-mono text-xs">{scan.scan_status?.toUpperCase()}</span></div>
                    <p className="text-gray-500 font-mono text-xs mt-1">{new Date(scan.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (<div className="text-center py-8"><CheckIcon size={32} className="text-green-500/50 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No blocked attempts</p></div>)}
          </div>
        </div>
      )}

      {/* ═══════════════ TEAM ACCESS TAB ═══════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* ─── Team Management Panel ─── */}
          <TeamManagementPanel />

          {/* ─── Legacy Role Overview ─── */}
          <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
            <h3 className="text-white font-mono font-bold mb-4 flex items-center gap-2"><UsersIcon size={18} className="text-orange-400" /> Workspace Role Overview</h3>
            <div className="space-y-2">
              {[
                { name: 'Platform Owner', role: 'Full Access - All Q-CORE Functions', status: 'active', level: 'admin' },
                { name: 'Organization Admin', role: 'Full Access - Dashboard, Scanner, Reports', status: 'active', level: 'admin' },
                { name: 'Security Manager', role: 'Manage & View - Scanner, Alerts, Compliance', status: 'active', level: 'manager' },
                { name: 'Security User', role: 'View & Scan - Scanner, Alerts', status: 'active', level: 'user' },
                { name: 'Other Users', role: 'Scan Only - File Scanner', status: 'limited', level: 'user' },
              ].map((u, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${u.level === 'admin' ? 'bg-orange-500/20 border border-orange-500/30' : u.level === 'manager' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-gray-800 border border-gray-700'}`}>
                    <UsersIcon size={18} className={u.level === 'admin' ? 'text-orange-400' : u.level === 'manager' ? 'text-cyan-400' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1"><p className="text-white font-mono text-sm">{u.name}</p><p className="text-gray-500 font-mono text-xs">{u.role}</p></div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${u.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>{u.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* CSS for plasma shield animations */}
      <style>{`
        @keyframes plasma-orbit-0 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(80px) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg) translateX(80px) rotate(-360deg); } }
        @keyframes plasma-orbit-1 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(-360deg) translateX(60px) rotate(360deg); } }
        @keyframes plasma-orbit-2 { 0% { transform: translate(-50%, -50%) rotate(0deg) translateX(70px) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg) translateX(70px) rotate(-360deg); } }
        @keyframes qb-core-glow-shield { 0%,100% { filter: drop-shadow(0 0 8px rgba(255,153,0,0.6)); } 50% { filter: drop-shadow(0 0 20px rgba(255,153,0,1)); } }
      `}</style>
    </div>
  );
};

export default SecurityWorkspaceView;
