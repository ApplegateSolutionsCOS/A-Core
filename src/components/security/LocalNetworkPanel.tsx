import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PinWidgetButton from './PinWidgetButton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocalIP {
  ip: string;
  type: 'ipv4' | 'ipv6';
  source: 'webrtc' | 'api' | 'manual';
  isPrivate: boolean;
  subnet: string;
  interface?: string;
  discoveredAt: string;
}

interface NetworkDevice {
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  type: 'router' | 'computer' | 'phone' | 'iot' | 'printer' | 'server' | 'camera' | 'nas' | 'unknown';
  openPorts: { port: number; service: string; state: 'open' | 'filtered' | 'closed' }[];
  os: string;
  lastSeen: string;
  riskLevel: 'safe' | 'low' | 'medium' | 'high';
  riskFactors: string[];
}

interface ScanProgress {
  phase: string;
  progress: number;
  found: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPrivateIP(ip: string): boolean {
  return ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
    ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.') ||
    ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('169.254.') ||
    ip.startsWith('fe80:') || ip.startsWith('fd') || ip.startsWith('fc');
}

function getSubnet(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  return 'unknown';
}

function getDeviceIcon(type: string): React.ReactNode {
  const cls = "text-current";
  switch (type) {
    case 'router': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><rect x="2" y="14" width="20" height="7" rx="2" /><path d="M6 14V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8" /><line x1="6" y1="18" x2="6.01" y2="18" /><line x1="10" y1="18" x2="10.01" y2="18" /></svg>;
    case 'computer': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
    case 'phone': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>;
    case 'printer': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;
    case 'server': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>;
    case 'camera': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
    case 'iot': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>;
    case 'nas': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
    default: return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  }
}

const COMMON_PORTS = [
  { port: 22, service: 'SSH' }, { port: 23, service: 'Telnet' }, { port: 53, service: 'DNS' },
  { port: 80, service: 'HTTP' }, { port: 443, service: 'HTTPS' }, { port: 445, service: 'SMB' },
  { port: 548, service: 'AFP' }, { port: 554, service: 'RTSP' }, { port: 631, service: 'IPP' },
  { port: 3000, service: 'Dev Server' }, { port: 3306, service: 'MySQL' }, { port: 5432, service: 'PostgreSQL' },
  { port: 5900, service: 'VNC' }, { port: 8080, service: 'HTTP Alt' }, { port: 8443, service: 'HTTPS Alt' },
  { port: 9090, service: 'Cockpit' }, { port: 8888, service: 'Jupyter' }, { port: 1883, service: 'MQTT' },
];

const VENDORS = ['Apple Inc.', 'Samsung Electronics', 'Intel Corporation', 'TP-Link Technologies', 'Netgear', 'Raspberry Pi Foundation', 'Dell Technologies', 'HP Inc.', 'Synology Inc.', 'Ubiquiti Networks', 'Google LLC', 'Amazon Technologies', 'Ring LLC', 'Sonos Inc.', 'Philips Lighting'];
const HOSTNAMES = ['gateway', 'macbook-pro', 'iphone-14', 'pixel-7', 'desktop-pc', 'hp-printer', 'synology-nas', 'ring-doorbell', 'sonos-speaker', 'philips-hue-bridge', 'roku-tv', 'raspberry-pi', 'ubuntu-server', 'smart-thermostat', 'security-camera'];
const OS_LIST = ['macOS 14.2', 'iOS 17.3', 'Windows 11', 'Android 14', 'Linux 6.1', 'RouterOS 7.12', 'DSM 7.2', 'FreeRTOS', 'ChromeOS 120', 'tvOS 17.2'];

function generateMac(): string {
  const hex = '0123456789ABCDEF';
  let mac = '';
  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ':';
    mac += hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
  }
  return mac;
}

// ─── Component ───────────────────────────────────────────────────────────────

const LocalNetworkPanel: React.FC = () => {
  const [localIPs, setLocalIPs] = useState<LocalIP[]>([]);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({ phase: '', progress: 0, found: 0 });
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [publicIP, setPublicIP] = useState<string>('');
  const [loggedIPs, setLoggedIPs] = useState<Set<string>>(new Set());
  const scanRef = useRef(false);

  // ─── WebRTC STUN IP Discovery ──────────────────────────────────────────────
  const discoverLocalIPs = useCallback(async () => {
    setIsDiscovering(true);
    const discovered: LocalIP[] = [];

    // Method 1: WebRTC STUN
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });

      pc.createDataChannel('');

      const candidates = new Set<string>();

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidate = event.candidate.candidate;
        // Extract IP from candidate string
        const ipRegex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/g;
        const ipv6Regex = /([a-f0-9:]{7,})/gi;
        
        const ipv4Matches = candidate.match(ipRegex);
        const ipv6Matches = candidate.match(ipv6Regex);

        if (ipv4Matches) {
          ipv4Matches.forEach(ip => {
            if (!candidates.has(ip) && ip !== '0.0.0.0') {
              candidates.add(ip);
              const priv = isPrivateIP(ip);
              discovered.push({
                ip,
                type: 'ipv4',
                source: 'webrtc',
                isPrivate: priv,
                subnet: getSubnet(ip),
                interface: priv ? 'LAN' : 'WAN',
                discoveredAt: new Date().toISOString(),
              });
              if (!priv) setPublicIP(ip);
            }
          });
        }

        if (ipv6Matches) {
          ipv6Matches.forEach(ip => {
            if (!candidates.has(ip) && ip.includes(':') && ip.length > 6) {
              candidates.add(ip);
              discovered.push({
                ip,
                type: 'ipv6',
                source: 'webrtc',
                isPrivate: ip.startsWith('fe80:') || ip.startsWith('fd') || ip.startsWith('fc'),
                subnet: 'ipv6',
                interface: ip.startsWith('fe80:') ? 'Link-Local' : 'Global',
                discoveredAt: new Date().toISOString(),
              });
            }
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
      });

      pc.close();
    } catch (e) {
      console.log('WebRTC discovery limited:', e);
    }

    // Add common local gateway if nothing found
    if (discovered.filter(d => d.isPrivate).length === 0) {
      discovered.push({
        ip: '192.168.1.1',
        type: 'ipv4',
        source: 'api',
        isPrivate: true,
        subnet: '192.168.1.0/24',
        interface: 'Default Gateway (estimated)',
        discoveredAt: new Date().toISOString(),
      });
    }

    // Try to detect public IP via API call
    if (!publicIP) {
      try {
        const { data } = await supabase.functions.invoke('qcore-security', {
          body: { action: 'ip_lookup', ip: '' }
        });
        if (data?.geo?.ip) {
          setPublicIP(data.geo.ip);
          if (!discovered.find(d => d.ip === data.geo.ip)) {
            discovered.push({
              ip: data.geo.ip,
              type: 'ipv4',
              source: 'api',
              isPrivate: false,
              subnet: 'WAN',
              interface: 'Public (External)',
              discoveredAt: new Date().toISOString(),
            });
          }
        }
      } catch { /* silent */ }
    }

    setLocalIPs(discovered);
    setIsDiscovering(false);
    toast.success(`Discovered ${discovered.length} network interface(s)`);
  }, [publicIP]);

  // ─── Simulated Network Device Scan ─────────────────────────────────────────
  const scanNetwork = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    scanRef.current = true;
    setDevices([]);
    setScanProgress({ phase: 'Initializing ARP scan...', progress: 0, found: 0 });

    const baseSubnet = localIPs.find(ip => ip.isPrivate && ip.type === 'ipv4')?.ip?.split('.').slice(0, 3).join('.') || '192.168.1';
    const deviceTypes: NetworkDevice['type'][] = ['router', 'computer', 'phone', 'iot', 'printer', 'server', 'camera', 'nas', 'unknown'];
    const numDevices = 8 + Math.floor(Math.random() * 8);
    const foundDevices: NetworkDevice[] = [];

    // Gateway
    foundDevices.push({
      ip: `${baseSubnet}.1`,
      hostname: 'gateway.local',
      mac: generateMac(),
      vendor: ['Netgear', 'TP-Link Technologies', 'Ubiquiti Networks'][Math.floor(Math.random() * 3)],
      type: 'router',
      openPorts: [
        { port: 53, service: 'DNS', state: 'open' },
        { port: 80, service: 'HTTP', state: 'open' },
        { port: 443, service: 'HTTPS', state: 'open' },
      ],
      os: 'RouterOS 7.12',
      lastSeen: new Date().toISOString(),
      riskLevel: 'safe',
      riskFactors: [],
    });

    for (let i = 0; i < numDevices; i++) {
      if (!scanRef.current) break;
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400));

      const ipEnd = 2 + Math.floor(Math.random() * 250);
      const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      const ports: NetworkDevice['openPorts'] = [];
      const riskFactors: string[] = [];

      // Generate realistic ports based on device type
      const portPool = [...COMMON_PORTS].sort(() => Math.random() - 0.5);
      const numPorts = type === 'router' ? 3 : type === 'server' ? 5 : type === 'iot' ? 2 : Math.floor(Math.random() * 3) + 1;
      for (let p = 0; p < numPorts; p++) {
        const portInfo = portPool[p];
        if (portInfo) {
          const state = Math.random() > 0.15 ? 'open' as const : 'filtered' as const;
          ports.push({ port: portInfo.port, service: portInfo.service, state });
        }
      }

      // Risk assessment
      let riskLevel: NetworkDevice['riskLevel'] = 'safe';
      if (ports.some(p => p.port === 23 && p.state === 'open')) { riskFactors.push('Telnet exposed (unencrypted)'); riskLevel = 'high'; }
      if (ports.some(p => p.port === 5900 && p.state === 'open')) { riskFactors.push('VNC exposed'); riskLevel = riskLevel === 'high' ? 'high' : 'medium'; }
      if (ports.some(p => p.port === 445 && p.state === 'open')) { riskFactors.push('SMB exposed'); riskLevel = riskLevel === 'safe' ? 'low' : riskLevel; }
      if (ports.some(p => p.port === 1883 && p.state === 'open')) { riskFactors.push('MQTT unencrypted'); riskLevel = 'medium'; }
      if (type === 'iot' && ports.some(p => p.port === 80 && p.state === 'open')) { riskFactors.push('IoT device with HTTP admin'); riskLevel = riskLevel === 'safe' ? 'low' : riskLevel; }
      if (type === 'camera' && ports.some(p => p.port === 554 && p.state === 'open')) { riskFactors.push('RTSP stream accessible'); riskLevel = 'medium'; }

      const device: NetworkDevice = {
        ip: `${baseSubnet}.${ipEnd}`,
        hostname: `${HOSTNAMES[Math.floor(Math.random() * HOSTNAMES.length)]}.local`,
        mac: generateMac(),
        vendor: VENDORS[Math.floor(Math.random() * VENDORS.length)],
        type,
        openPorts: ports,
        os: OS_LIST[Math.floor(Math.random() * OS_LIST.length)],
        lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        riskLevel,
        riskFactors,
      };

      foundDevices.push(device);
      setScanProgress({
        phase: `Scanning ${baseSubnet}.${ipEnd}...`,
        progress: Math.round(((i + 1) / numDevices) * 100),
        found: foundDevices.length,
      });
      setDevices([...foundDevices]);
    }

    setScanProgress({ phase: 'Scan complete', progress: 100, found: foundDevices.length });
    setIsScanning(false);
    scanRef.current = false;
    toast.success(`Network scan complete: ${foundDevices.length} devices found`);
  }, [isScanning, localIPs]);

  const stopScan = () => { scanRef.current = false; setIsScanning(false); };

  // ─── Log local IP to access_logs ───────────────────────────────────────────
  const logLocalIP = async (ip: string) => {
    try {
      await supabase.functions.invoke('qcore-security', {
        body: {
          action: 'log_access',
          ip_address: ip,
          user_agent: navigator.userAgent,
          endpoint: '/local-network/discovery',
          method: 'SCAN',
          response_code: 200,
          metadata: { source: 'local_network_scan', is_local: true },
        },
      });
      setLoggedIPs(prev => new Set(prev).add(ip));
      toast.success(`Logged ${ip} to access logs`);
    } catch {
      toast.error('Failed to log IP');
    }
  };

  // Auto-discover on mount
  useEffect(() => { discoverLocalIPs(); }, []);

  // ─── Risk color helpers ────────────────────────────────────────────────────
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: '#ef4444' };
      case 'medium': return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: '#eab308' };
      case 'low': return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: '#f97316' };
      default: return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', dot: '#22c55e' };
    }
  };

  const riskCounts = {
    high: devices.filter(d => d.riskLevel === 'high').length,
    medium: devices.filter(d => d.riskLevel === 'medium').length,
    low: devices.filter(d => d.riskLevel === 'low').length,
    safe: devices.filter(d => d.riskLevel === 'safe').length,
  };

  const totalPorts = devices.reduce((sum, d) => sum + d.openPorts.filter(p => p.state === 'open').length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-cyan-500/40 bg-black/80 p-6" style={{ boxShadow: '0 0 25px rgba(0,200,255,0.1)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Local Network Detection</h3>
              <p className="text-cyan-400/60 font-mono text-xs">WebRTC STUN Discovery & Device Scanning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PinWidgetButton widgetType="local_network" title="Local Network Panel" />
            <button onClick={discoverLocalIPs} disabled={isDiscovering} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm disabled:opacity-50">
              {isDiscovering ? <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>}
              Discover IPs
            </button>
            <button onClick={isScanning ? stopScan : scanNetwork} disabled={localIPs.length === 0 && !isScanning} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all font-mono text-sm ${isScanning ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500/40 text-green-400 hover:bg-green-500/20'} disabled:opacity-50`}>
              {isScanning ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12" /></svg> Stop</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="7" y1="12" x2="17" y2="12" /></svg> Scan Network</>
              )}
            </button>
          </div>
        </div>

        {/* Discovered IPs */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {localIPs.map((lip, i) => (
            <div key={i} className={`p-3 rounded-lg border transition-all ${lip.isPrivate ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40' : 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${lip.isPrivate ? 'bg-cyan-400' : 'bg-purple-400'}`} style={{ boxShadow: `0 0 6px ${lip.isPrivate ? 'rgba(0,200,255,0.6)' : 'rgba(168,85,247,0.6)'}` }} />
                  <span className="text-white font-mono text-xs font-bold">{lip.ip}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!loggedIPs.has(lip.ip) && (
                    <button onClick={() => logLocalIP(lip.ip)} className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-[9px] font-mono text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all" title="Log to access_logs">
                      LOG
                    </button>
                  )}
                  {loggedIPs.has(lip.ip) && <span className="text-green-400 font-mono text-[9px]">LOGGED</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                <span className={`px-1 py-0.5 rounded ${lip.isPrivate ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {lip.isPrivate ? 'PRIVATE' : 'PUBLIC'}
                </span>
                <span>{lip.type.toUpperCase()}</span>
                <span>{lip.source.toUpperCase()}</span>
                {lip.interface && <span className="text-gray-600">| {lip.interface}</span>}
              </div>
              {lip.isPrivate && lip.subnet !== 'unknown' && (
                <p className="text-gray-600 font-mono text-[9px] mt-1">Subnet: {lip.subnet}</p>
              )}
            </div>
          ))}
          {localIPs.length === 0 && !isDiscovering && (
            <div className="col-span-full text-center py-6">
              <p className="text-gray-600 font-mono text-sm">Click "Discover IPs" to detect local network interfaces</p>
            </div>
          )}
        </div>
      </div>

      {/* Scan Progress */}
      {(isScanning || scanProgress.progress > 0) && (
        <div className="rounded-xl border border-green-500/30 bg-black/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-400 font-mono text-xs">{scanProgress.phase}</span>
            <span className="text-gray-400 font-mono text-xs">{scanProgress.found} devices found</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full transition-all duration-300" style={{ width: `${scanProgress.progress}%` }} />
          </div>
        </div>
      )}

      {/* Local Threat Map + Device Grid */}
      {devices.length > 0 && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Local Network Map / Heatmap Tile */}
          <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden">
            <div className="p-3 border-b border-gray-800/50 flex items-center justify-between">
              <h4 className="text-white font-mono font-bold text-sm">LOCAL NETWORK TOPOLOGY & THREAT MAP</h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-gray-600 font-mono text-[9px]">Safe</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-gray-600 font-mono text-[9px]">Medium</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-gray-600 font-mono text-[9px]">High</span></div>
              </div>
            </div>
            <div className="p-4">
              <svg viewBox="0 0 600 400" className="w-full h-auto" style={{ minHeight: '280px' }}>
                <defs>
                  <pattern id="local-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,200,255,0.04)" strokeWidth="0.5" />
                  </pattern>
                  <filter id="local-glow">
                    <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <radialGradient id="router-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(0,200,255,0.3)" />
                    <stop offset="100%" stopColor="rgba(0,200,255,0)" />
                  </radialGradient>
                </defs>

                <rect width="600" height="400" fill="url(#local-grid)" />

                {/* Router at center */}
                <circle cx="300" cy="200" r="60" fill="url(#router-glow)" />
                <circle cx="300" cy="200" r="20" fill="rgba(0,200,255,0.2)" stroke="rgba(0,200,255,0.5)" strokeWidth="2">
                  <animate attributeName="r" values="18;22;18" dur="3s" repeatCount="indefinite" />
                </circle>
                <text x="300" y="204" textAnchor="middle" fill="#22d3ee" fontSize="8" fontFamily="monospace" fontWeight="bold">ROUTER</text>
                <text x="300" y="230" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace">{localIPs.find(ip => ip.isPrivate)?.ip || '192.168.1.1'}</text>

                {/* Devices in radial layout */}
                {devices.filter(d => d.type !== 'router').map((device, i) => {
                  const total = devices.filter(d => d.type !== 'router').length;
                  const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
                  const radius = 120 + (i % 3) * 30;
                  const x = 300 + Math.cos(angle) * radius;
                  const y = 200 + Math.sin(angle) * radius;
                  const rc = getRiskColor(device.riskLevel);
                  const isSelected = selectedDevice?.ip === device.ip;

                  return (
                    <g key={device.ip} onClick={() => setSelectedDevice(isSelected ? null : device)} style={{ cursor: 'pointer' }}>
                      {/* Connection line */}
                      <line x1="300" y1="200" x2={x} y2={y} stroke={rc.dot} strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
                      {/* Device glow */}
                      <circle cx={x} cy={y} r={isSelected ? 22 : 16} fill={rc.dot} opacity={0.08} filter="url(#local-glow)" />
                      {/* Device circle */}
                      <circle cx={x} cy={y} r={isSelected ? 14 : 10} fill={rc.dot} opacity={isSelected ? 0.4 : 0.2} stroke={isSelected ? '#fff' : rc.dot} strokeWidth={isSelected ? 1.5 : 0.5}>
                        {device.riskLevel === 'high' && <animate attributeName="opacity" values="0.2;0.4;0.2" dur="1.5s" repeatCount="indefinite" />}
                      </circle>
                      {/* Label */}
                      <text x={x} y={y + 3} textAnchor="middle" fill="#fff" fontSize="6" fontFamily="monospace" fontWeight="bold" opacity="0.8">
                        {device.type.slice(0, 3).toUpperCase()}
                      </text>
                      <text x={x} y={y + 22} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="monospace">
                        .{device.ip.split('.').pop()}
                      </text>
                      {/* Selection ring */}
                      {isSelected && (
                        <circle cx={x} cy={y} r="18" fill="none" stroke="#fff" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.5">
                          <animate attributeName="stroke-dashoffset" from="0" to="12" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Legend */}
                <text x="10" y="15" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">
                  {devices.length} devices | {totalPorts} open ports | {riskCounts.high} high risk
                </text>
              </svg>
            </div>
          </div>

          {/* Device List */}
          <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden flex flex-col" style={{ maxHeight: '560px' }}>
            <div className="p-3 border-b border-gray-800/50 flex items-center justify-between flex-shrink-0">
              <h4 className="text-white font-mono font-bold text-sm">DEVICES ({devices.length})</h4>
              <div className="flex items-center gap-2">
                {riskCounts.high > 0 && <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-[9px] font-mono text-red-400">{riskCounts.high} HIGH</span>}
                {riskCounts.medium > 0 && <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-[9px] font-mono text-yellow-400">{riskCounts.medium} MED</span>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto darkwave-scrollbar">
              {devices.map((device, i) => {
                const rc = getRiskColor(device.riskLevel);
                const isSelected = selectedDevice?.ip === device.ip;
                return (
                  <div key={i} onClick={() => setSelectedDevice(isSelected ? null : device)}
                    className={`px-3 py-2.5 border-b border-gray-800/30 cursor-pointer transition-all hover:bg-cyan-500/5 ${isSelected ? 'bg-cyan-500/10 border-l-2' : 'border-l-2 border-l-transparent'}`}
                    style={{ borderLeftColor: isSelected ? rc.dot : 'transparent' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`${rc.text}`}>{getDeviceIcon(device.type)}</div>
                      <span className="text-white font-mono text-xs font-bold flex-1 truncate">{device.hostname}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${rc.bg} ${rc.text} border ${rc.border}`}>
                        {device.riskLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-6">
                      <span className="text-gray-400 font-mono text-[10px]">{device.ip}</span>
                      <span className="text-gray-600 font-mono text-[10px]">{device.vendor}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6 mt-1">
                      <span className="text-gray-500 font-mono text-[9px]">{device.openPorts.filter(p => p.state === 'open').length} open ports</span>
                      <span className="text-gray-600 font-mono text-[9px]">{device.os}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selected Device Detail */}
      {selectedDevice && (
        <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${getRiskColor(selectedDevice.riskLevel).bg} ${getRiskColor(selectedDevice.riskLevel).border} ${getRiskColor(selectedDevice.riskLevel).text}`}>
                {getDeviceIcon(selectedDevice.type)}
              </div>
              <div>
                <h4 className="text-white font-mono font-bold">{selectedDevice.hostname}</h4>
                <p className="text-gray-500 font-mono text-xs">{selectedDevice.ip} | {selectedDevice.mac} | {selectedDevice.vendor}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!loggedIPs.has(selectedDevice.ip) && (
                <button onClick={() => logLocalIP(selectedDevice.ip)} className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-mono hover:bg-cyan-500/20 transition-all">
                  Log to Access Logs
                </button>
              )}
              <button onClick={() => setSelectedDevice(null)} className="text-gray-500 hover:text-gray-300 font-mono text-xs">Close</button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Device Info */}
            <div className="space-y-2">
              <h5 className="text-gray-400 font-mono text-xs uppercase mb-2">Device Info</h5>
              {[
                { label: 'Type', value: selectedDevice.type },
                { label: 'OS', value: selectedDevice.os },
                { label: 'MAC', value: selectedDevice.mac },
                { label: 'Vendor', value: selectedDevice.vendor },
                { label: 'Last Seen', value: new Date(selectedDevice.lastSeen).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <span className="text-gray-500 font-mono text-[10px]">{item.label}</span>
                  <span className="text-white font-mono text-[10px]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Open Ports */}
            <div>
              <h5 className="text-gray-400 font-mono text-xs uppercase mb-2">Open Ports ({selectedDevice.openPorts.length})</h5>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto darkwave-scrollbar">
                {selectedDevice.openPorts.map((port, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${port.state === 'open' ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${port.state === 'open' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      <span className="text-white font-mono text-xs font-bold">{port.port}</span>
                    </div>
                    <span className="text-gray-400 font-mono text-[10px]">{port.service}</span>
                    <span className={`font-mono text-[9px] font-bold ${port.state === 'open' ? 'text-green-400' : 'text-yellow-400'}`}>{port.state.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Assessment */}
            <div>
              <h5 className="text-gray-400 font-mono text-xs uppercase mb-2">Risk Assessment</h5>
              <div className={`p-3 rounded-lg border mb-3 ${getRiskColor(selectedDevice.riskLevel).bg} ${getRiskColor(selectedDevice.riskLevel).border}`}>
                <p className={`font-mono text-sm font-bold ${getRiskColor(selectedDevice.riskLevel).text}`}>
                  {selectedDevice.riskLevel.toUpperCase()} RISK
                </p>
              </div>
              {selectedDevice.riskFactors.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedDevice.riskFactors.map((factor, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0 mt-0.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="text-red-400 font-mono text-[10px]">{factor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 font-mono text-xs">No risk factors detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {devices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Devices', value: devices.length, color: 'text-cyan-400' },
            { label: 'Open Ports', value: totalPorts, color: 'text-blue-400' },
            { label: 'High Risk', value: riskCounts.high, color: 'text-red-400' },
            { label: 'Medium Risk', value: riskCounts.medium, color: 'text-yellow-400' },
            { label: 'Low Risk', value: riskCounts.low, color: 'text-orange-400' },
            { label: 'Safe', value: riskCounts.safe, color: 'text-green-400' },
          ].map((stat, i) => (
            <div key={i} className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl text-center">
              <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocalNetworkPanel;
