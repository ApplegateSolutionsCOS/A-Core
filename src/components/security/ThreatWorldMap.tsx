import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThreatPoint {
  id: string;
  ip: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  attackType: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  timestamp: Date;
  isp?: string;
  org?: string;
  resolvedViaIpInfo?: boolean;
}

interface GeoResult {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string; // "lat,lng"
  org: string;
  timezone: string;
  bogon?: boolean;
}

// ─── IP Geolocation Cache ────────────────────────────────────────────────────

const ipGeoCache = new Map<string, GeoResult>();

async function lookupIpGeo(ip: string): Promise<GeoResult | null> {
  // Check cache first
  if (ipGeoCache.has(ip)) {
    return ipGeoCache.get(ip)!;
  }
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: { action: 'ip_lookup', ip }
    });
    if (error || !data?.success) return null;
    const geo = data?.geo || null;
    if (geo) {
      ipGeoCache.set(ip, geo);
      // Limit cache size
      if (ipGeoCache.size > 500) {
        const firstKey = ipGeoCache.keys().next().value;
        if (firstKey) ipGeoCache.delete(firstKey);
      }
    }
    return geo;
  } catch {
    return null;
  }
}

async function batchLookupIpGeo(ips: string[]): Promise<Record<string, GeoResult>> {
  const uncached = ips.filter(ip => !ipGeoCache.has(ip));
  if (uncached.length === 0) {
    const results: Record<string, GeoResult> = {};
    ips.forEach(ip => { if (ipGeoCache.has(ip)) results[ip] = ipGeoCache.get(ip)!; });
    return results;
  }
  try {
    const { data, error } = await supabase.functions.invoke('qcore-security', {
      body: { action: 'batch_ip_lookup', ips: uncached.slice(0, 20) }
    });
    if (!error && data?.results) {
      Object.entries(data.results).forEach(([ip, geo]) => {
        ipGeoCache.set(ip, geo as GeoResult);
      });
    }
  } catch { /* silent */ }
  const results: Record<string, GeoResult> = {};
  ips.forEach(ip => { if (ipGeoCache.has(ip)) results[ip] = ipGeoCache.get(ip)!; });
  return results;
}

// ─── Fallback IP-to-Geo mapping ──────────────────────────────────────────────

function ipToGeoFallback(ip: string): { lat: number; lng: number; country: string; city: string } {
  const parts = ip.split('.').map(Number);
  const hash = parts.reduce((a, b) => a * 31 + b, 0);
  const locations = [
    { lat: 55.7558, lng: 37.6173, country: 'RU', city: 'Moscow' },
    { lat: 39.9042, lng: 116.4074, country: 'CN', city: 'Beijing' },
    { lat: 31.2304, lng: 121.4737, country: 'CN', city: 'Shanghai' },
    { lat: 28.6139, lng: 77.2090, country: 'IN', city: 'New Delhi' },
    { lat: 35.6762, lng: 139.6503, country: 'JP', city: 'Tokyo' },
    { lat: -23.5505, lng: -46.6333, country: 'BR', city: 'São Paulo' },
    { lat: 51.5074, lng: -0.1278, country: 'GB', city: 'London' },
    { lat: 48.8566, lng: 2.3522, country: 'FR', city: 'Paris' },
    { lat: 52.5200, lng: 13.4050, country: 'DE', city: 'Berlin' },
    { lat: -33.8688, lng: 151.2093, country: 'AU', city: 'Sydney' },
    { lat: 37.5665, lng: 126.9780, country: 'KR', city: 'Seoul' },
    { lat: 1.3521, lng: 103.8198, country: 'SG', city: 'Singapore' },
    { lat: 25.2048, lng: 55.2708, country: 'AE', city: 'Dubai' },
    { lat: 41.0082, lng: 28.9784, country: 'TR', city: 'Istanbul' },
    { lat: 19.4326, lng: -99.1332, country: 'MX', city: 'Mexico City' },
    { lat: -34.6037, lng: -58.3816, country: 'AR', city: 'Buenos Aires' },
    { lat: 6.5244, lng: 3.3792, country: 'NG', city: 'Lagos' },
    { lat: -1.2921, lng: 36.8219, country: 'KE', city: 'Nairobi' },
    { lat: 33.8938, lng: 35.5018, country: 'LB', city: 'Beirut' },
    { lat: 14.5995, lng: 120.9842, country: 'PH', city: 'Manila' },
    { lat: 59.3293, lng: 18.0686, country: 'SE', city: 'Stockholm' },
    { lat: 50.0755, lng: 14.4378, country: 'CZ', city: 'Prague' },
    { lat: 47.4979, lng: 19.0402, country: 'HU', city: 'Budapest' },
    { lat: 64.1466, lng: -21.9426, country: 'IS', city: 'Reykjavik' },
  ];
  return locations[Math.abs(hash) % locations.length];
}

// ─── Country name mapping ────────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', RU: 'Russia', CN: 'China', IN: 'India', JP: 'Japan',
  BR: 'Brazil', GB: 'United Kingdom', FR: 'France', DE: 'Germany', AU: 'Australia',
  KR: 'South Korea', SG: 'Singapore', AE: 'UAE', TR: 'Turkey', MX: 'Mexico',
  AR: 'Argentina', NG: 'Nigeria', KE: 'Kenya', LB: 'Lebanon', PH: 'Philippines',
  SE: 'Sweden', CZ: 'Czech Republic', HU: 'Hungary', IS: 'Iceland',
  UA: 'Ukraine', IR: 'Iran', PK: 'Pakistan', VN: 'Vietnam', TH: 'Thailand',
  ID: 'Indonesia', EG: 'Egypt', ZA: 'South Africa', CO: 'Colombia', CL: 'Chile',
  RO: 'Romania', PL: 'Poland', NL: 'Netherlands', BE: 'Belgium', IT: 'Italy',
  CA: 'Canada', ES: 'Spain', PT: 'Portugal', NO: 'Norway', FI: 'Finland',
  DK: 'Denmark', AT: 'Austria', CH: 'Switzerland', IE: 'Ireland', NZ: 'New Zealand',
  XX: 'Private Network',
};

// ─── Attack type generation ──────────────────────────────────────────────────

const ATTACK_TYPES = [
  'SSH Brute Force', 'SQL Injection', 'XSS Attack', 'DDoS Attempt',
  'Port Scan', 'Malware Upload', 'Credential Stuffing', 'API Abuse',
  'Directory Traversal', 'Buffer Overflow', 'DNS Amplification',
  'Phishing Attempt', 'RCE Exploit', 'CSRF Attack', 'Bot Traffic',
  'Ransomware Probe', 'Zero-Day Exploit', 'Man-in-the-Middle',
  'Privilege Escalation', 'Data Exfiltration',
];

function getAttackType(hash: number): string {
  return ATTACK_TYPES[Math.abs(hash) % ATTACK_TYPES.length];
}

function getSeverity(hash: number): ThreatPoint['severity'] {
  const r = Math.abs(hash) % 100;
  if (r < 10) return 'critical';
  if (r < 30) return 'high';
  if (r < 55) return 'medium';
  if (r < 80) return 'low';
  return 'info';
}

// ─── Realistic public IP ranges for simulation ──────────────────────────────

const PUBLIC_IP_RANGES = [
  // Russia
  { prefix: [5, 45], country: 'RU' }, { prefix: [46, 161], country: 'RU' }, { prefix: [77, 37], country: 'RU' },
  // China
  { prefix: [1, 80], country: 'CN' }, { prefix: [36, 99], country: 'CN' }, { prefix: [58, 14], country: 'CN' },
  // India
  { prefix: [14, 139], country: 'IN' }, { prefix: [49, 36], country: 'IN' },
  // Brazil
  { prefix: [177, 70], country: 'BR' }, { prefix: [187, 19], country: 'BR' },
  // Germany
  { prefix: [5, 9], country: 'DE' }, { prefix: [46, 4], country: 'DE' },
  // UK
  { prefix: [5, 65], country: 'GB' }, { prefix: [81, 2], country: 'GB' },
  // Japan
  { prefix: [1, 33], country: 'JP' }, { prefix: [14, 3], country: 'JP' },
  // South Korea
  { prefix: [1, 11], country: 'KR' }, { prefix: [14, 36], country: 'KR' },
  // US
  { prefix: [3, 5], country: 'US' }, { prefix: [8, 8], country: 'US' }, { prefix: [12, 0], country: 'US' },
  // France
  { prefix: [5, 39], country: 'FR' }, { prefix: [37, 58], country: 'FR' },
  // Netherlands
  { prefix: [5, 2], country: 'NL' }, { prefix: [31, 3], country: 'NL' },
  // Turkey
  { prefix: [5, 44], country: 'TR' }, { prefix: [78, 160], country: 'TR' },
  // Nigeria
  { prefix: [41, 58], country: 'NG' }, { prefix: [105, 112], country: 'NG' },
  // Australia
  { prefix: [1, 120], country: 'AU' }, { prefix: [49, 176], country: 'AU' },
];

function generateRealisticIP(): string {
  const range = PUBLIC_IP_RANGES[Math.floor(Math.random() * PUBLIC_IP_RANGES.length)];
  return `${range.prefix[0]}.${range.prefix[1]}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
}

// ─── Lat/Lng to SVG coordinate mapping (Mercator-ish) ────────────────────────

function geoToSvg(lat: number, lng: number, width: number, height: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (height / 2) - (width * mercN) / (2 * Math.PI);
  return { x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)) };
}

// ─── Server location (US East Coast) ─────────────────────────────────────────

const SERVER_LOC = { lat: 39.0438, lng: -77.4874 }; // Ashburn, VA

// ─── Severity colors ─────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff0040',
  high: '#ff4444',
  medium: '#ff9900',
  low: '#ffcc00',
  info: '#00ccff',
};

// ─── Continent outlines (simplified) ─────────────────────────────────────────

const CONTINENTS = {
  northAmerica: 'M 80,60 L 95,55 110,50 125,48 140,52 155,58 170,62 180,70 185,78 175,85 165,92 155,100 145,108 140,118 135,128 130,138 128,148 132,155 140,158 148,155 155,150 160,145 165,140 170,135 175,130 178,125 180,120 182,115 185,110 188,105 192,100 195,95 200,90 205,85 210,80 215,75 220,70 225,65 230,60 225,55 220,50 210,48 200,50 190,52 180,55 170,58 160,55 150,52 140,50 130,48 120,50 110,52 100,55 90,58 80,60 Z',
  southAmerica: 'M 185,175 L 190,170 195,168 200,172 205,178 210,185 215,195 218,205 220,215 222,225 220,235 218,245 215,255 210,265 205,275 200,280 195,285 190,290 185,295 180,298 175,295 172,288 170,280 168,270 170,260 172,250 175,240 178,230 180,220 182,210 183,200 184,190 185,175 Z',
  europe: 'M 430,48 L 440,45 450,42 460,45 470,48 480,52 490,55 495,60 490,65 485,70 480,75 475,80 470,82 465,80 460,78 455,75 450,72 445,70 440,68 435,65 432,60 430,55 430,48 Z',
  africa: 'M 430,95 L 440,92 450,90 460,92 470,95 478,100 485,108 490,118 492,128 490,140 488,150 485,160 480,170 475,180 470,190 465,200 460,210 455,218 450,225 445,230 440,228 435,222 430,215 425,205 420,195 418,185 420,175 422,165 425,155 428,145 430,135 432,125 433,115 432,105 430,95 Z',
  asia: 'M 500,35 L 520,32 540,30 560,32 580,35 600,38 620,40 640,42 660,45 680,48 700,50 720,52 730,55 735,60 730,65 725,70 720,75 715,80 710,85 705,90 700,95 695,100 690,105 685,108 680,110 670,112 660,115 650,118 640,120 630,118 620,115 610,112 600,108 590,105 580,100 570,95 560,90 550,85 540,80 530,75 520,70 510,65 505,60 500,55 498,48 500,35 Z',
  oceania: 'M 680,195 L 700,190 720,188 740,192 755,198 765,208 770,220 768,232 760,242 750,248 738,250 725,248 712,242 702,232 698,220 700,208 680,195 Z',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ThreatWorldMapProps {
  scanHistory?: any[];
}

const ThreatWorldMap: React.FC<ThreatWorldMapProps> = ({ scanHistory = [] }) => {
  const [threats, setThreats] = useState<ThreatPoint[]>([]);
  const [selectedThreat, setSelectedThreat] = useState<ThreatPoint | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [totalBlocked, setTotalBlocked] = useState(0);
  const [animatingLines, setAnimatingLines] = useState<string[]>([]);
  const [ipInfoConnected, setIpInfoConnected] = useState<boolean | null>(null);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const mapWidth = 900;
  const mapHeight = 450;

  // Check IpInfo connection status via health check
  useEffect(() => {
    const checkIpInfo = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('qcore-security', {
          body: { action: 'health_check' }
        });
        if (!error && data?.status) {
          setIpInfoConnected(data.status.ipInfoConfigured === true);
        }
      } catch {
        setIpInfoConnected(false);
      }
    };
    checkIpInfo();
  }, []);

  // Helper to resolve IP and create threat point
  const resolveAndCreateThreat = useCallback(async (
    ip: string,
    id: string,
    attackType: string,
    severity: ThreatPoint['severity'],
    timestamp: Date,
  ): Promise<ThreatPoint> => {
    // Try IpInfo lookup
    const geo = await lookupIpGeo(ip);
    if (geo?.loc && !geo.bogon) {
      const [lat, lng] = geo.loc.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setResolvedCount(prev => prev + 1);
        setCachedCount(ipGeoCache.size);
        return {
          id, ip, lat, lng,
          country: geo.country || 'XX',
          city: geo.city || 'Unknown',
          attackType, severity, timestamp,
          org: geo.org,
          resolvedViaIpInfo: true,
        };
      }
    }
    // Fallback
    const fallback = ipToGeoFallback(ip);
    return {
      id, ip,
      lat: fallback.lat + (Math.random() - 0.5) * 3,
      lng: fallback.lng + (Math.random() - 0.5) * 3,
      country: fallback.country,
      city: fallback.city,
      attackType, severity, timestamp,
      resolvedViaIpInfo: false,
    };
  }, []);

  // Generate initial threats from scan history
  useEffect(() => {
    const init = async () => {
      const initialThreats: ThreatPoint[] = [];
      const blockedScans = scanHistory.filter(s => s.scan_status === 'blocked' || s.scan_status === 'rejected');

      // Process blocked scans
      for (const scan of blockedScans.slice(0, 10)) {
        const ip = scan.ip_address || generateRealisticIP();
        const hash = ip.split('.').reduce((a: number, b: string) => a * 31 + parseInt(b), 0);
        const threat = await resolveAndCreateThreat(
          ip,
          `hist-${initialThreats.length}-${Date.now()}`,
          scan.threats ? (typeof scan.threats === 'string' ? scan.threats : 'Malware Upload') : getAttackType(hash),
          scan.threat_level === 'high' || scan.threat_level === 'blocked' ? 'high' : scan.threat_level === 'medium' ? 'medium' : 'low',
          new Date(scan.created_at),
        );
        initialThreats.push(threat);
      }

      // Add simulated threats with realistic IPs
      if (initialThreats.length < 8) {
        const simulatedIPs = Array.from({ length: 15 - initialThreats.length }, () => generateRealisticIP());

        // Batch resolve IPs
        await batchLookupIpGeo(simulatedIPs);

        for (let i = 0; i < simulatedIPs.length; i++) {
          const ip = simulatedIPs[i];
          const hash = ip.split('.').reduce((a: number, b: string) => a * 31 + parseInt(b), 0);
          const threat = await resolveAndCreateThreat(
            ip,
            `sim-${i}-${Date.now()}`,
            getAttackType(hash + i),
            getSeverity(hash + i),
            new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          );
          initialThreats.push(threat);
        }
      }

      setThreats(initialThreats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      setTotalBlocked(initialThreats.length);
      setCachedCount(ipGeoCache.size);
    };
    init();
  }, [scanHistory, resolveAndCreateThreat]);

  // Simulate new threats arriving in real-time with IpInfo resolution
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const ip = generateRealisticIP();
      const hash = ip.split('.').reduce((a: number, b: string) => a * 31 + parseInt(b), 0);
      const newThreat = await resolveAndCreateThreat(
        ip,
        `live-${Date.now()}-${Math.random()}`,
        getAttackType(hash),
        getSeverity(hash),
        new Date(),
      );

      setThreats(prev => [newThreat, ...prev].slice(0, 100));
      setTotalBlocked(prev => prev + 1);
      setAnimatingLines(prev => [...prev, newThreat.id]);

      setTimeout(() => {
        setAnimatingLines(prev => prev.filter(id => id !== newThreat.id));
      }, 3000);
    }, 4000 + Math.random() * 6000);

    return () => clearInterval(interval);
  }, [isLive, resolveAndCreateThreat]);

  // Realtime subscription for security_notifications
  useEffect(() => {
    const channel = supabase
      .channel('threat-map-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_notifications',
      }, async (payload) => {
        const n = payload.new as any;
        if (!n) return;

        const ip = n.ip_address || n.metadata?.ip_address || generateRealisticIP();

        // Use geo_location from notification if available
        let lat: number, lng: number, country: string, city: string, org: string | undefined;
        let resolvedViaIpInfo = false;

        if (n.geo_location?.lat && n.geo_location?.lng) {
          lat = n.geo_location.lat;
          lng = n.geo_location.lng;
          country = n.geo_location.country || 'XX';
          city = n.geo_location.city || 'Unknown';
          resolvedViaIpInfo = true;
        } else {
          // Try IpInfo lookup via edge function
          const geo = await lookupIpGeo(ip);
          if (geo?.loc && !geo.bogon) {
            const [gLat, gLng] = geo.loc.split(',').map(Number);
            if (!isNaN(gLat) && !isNaN(gLng)) {
              lat = gLat; lng = gLng;
              country = geo.country || 'XX';
              city = geo.city || 'Unknown';
              org = geo.org;
              resolvedViaIpInfo = true;
            } else {
              const fallback = ipToGeoFallback(ip);
              lat = fallback.lat; lng = fallback.lng;
              country = fallback.country; city = fallback.city;
            }
          } else {
            const fallback = ipToGeoFallback(ip);
            lat = fallback.lat; lng = fallback.lng;
            country = fallback.country; city = fallback.city;
          }
        }

        const newThreat: ThreatPoint = {
          id: `rt-${n.id || Date.now()}`,
          ip, lat, lng, country, city,
          attackType: n.title || n.attack_type || 'Security Alert',
          severity: (n.severity as any) || 'medium',
          timestamp: new Date(n.created_at || Date.now()),
          org,
          resolvedViaIpInfo,
        };

        setThreats(prev => [newThreat, ...prev].slice(0, 100));
        setTotalBlocked(prev => prev + 1);
        setAnimatingLines(prev => [...prev, newThreat.id]);
        setTimeout(() => setAnimatingLines(prev => prev.filter(id => id !== newThreat.id)), 3000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Country breakdown
  const countryBreakdown = threats.reduce<Record<string, number>>((acc, t) => {
    acc[t.country] = (acc[t.country] || 0) + 1;
    return acc;
  }, {});
  const sortedCountries = Object.entries(countryBreakdown).sort(([, a], [, b]) => b - a).slice(0, 10);
  const maxCountryCount = sortedCountries.length > 0 ? sortedCountries[0][1] : 1;

  // 24-hour timeline
  const hourlyData: number[] = new Array(24).fill(0);
  const now = Date.now();
  threats.forEach(t => {
    const hoursAgo = Math.floor((now - t.timestamp.getTime()) / (60 * 60 * 1000));
    if (hoursAgo >= 0 && hoursAgo < 24) hourlyData[23 - hoursAgo]++;
  });
  const maxHourly = Math.max(...hourlyData, 1);

  // Server position on map
  const serverPos = geoToSvg(SERVER_LOC.lat, SERVER_LOC.lng, mapWidth, mapHeight);

  // IpInfo resolved stats
  const ipInfoResolvedThreats = threats.filter(t => t.resolvedViaIpInfo).length;

  return (
    <div className="space-y-6">
      {/* Main Map + Feed Layout */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* World Map */}
        <div className="relative rounded-xl border border-orange-500/40 bg-black overflow-hidden" style={{ boxShadow: '0 0 30px rgba(255,153,0,0.1)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-950/10 via-transparent to-red-950/10" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between p-4 border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-50" />
              </div>
              <h3 className="text-white font-mono font-bold text-sm">GLOBAL THREAT MAP</h3>
              <span className="text-gray-600 font-mono text-xs">LIVE</span>
            </div>
            <div className="flex items-center gap-3">
              {/* IpInfo Connected Status */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/80 border border-gray-800 rounded" title={ipInfoConnected ? `IpInfo API Connected - ${ipGeoCache.size} IPs cached, ${ipInfoResolvedThreats} resolved` : 'IpInfo API not configured'}>
                <div className={`w-1.5 h-1.5 rounded-full ${ipInfoConnected === true ? 'bg-green-400 shadow-[0_0_4px_rgba(0,255,0,0.8)]' : ipInfoConnected === false ? 'bg-red-400' : 'bg-gray-600 animate-pulse'}`} />
                <span className={`font-mono text-[9px] font-bold ${ipInfoConnected === true ? 'text-green-400' : ipInfoConnected === false ? 'text-red-400' : 'text-gray-500'}`}>
                  IpInfo {ipInfoConnected === true ? 'OK' : ipInfoConnected === false ? 'OFF' : '...'}
                </span>
                {ipInfoConnected && (
                  <span className="text-gray-600 font-mono text-[8px]">{ipGeoCache.size} cached</span>
                )}
              </div>
              <span className="text-red-400 font-mono text-xs font-bold">{totalBlocked} BLOCKED</span>
              <button
                onClick={() => setIsLive(!isLive)}
                className={`px-3 py-1 rounded font-mono text-xs font-bold border transition-all ${
                  isLive ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {isLive ? 'LIVE' : 'PAUSED'}
              </button>
            </div>
          </div>

          {/* SVG Map */}
          <div className="relative p-2">
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              className="w-full h-auto"
              style={{ minHeight: '300px' }}
            >
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,153,0,0.05)" strokeWidth="0.5" />
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-strong">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background grid */}
              <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

              {/* Continent outlines */}
              {Object.entries(CONTINENTS).map(([name, path]) => (
                <path
                  key={name}
                  d={path}
                  fill="rgba(255,153,0,0.04)"
                  stroke="rgba(255,153,0,0.15)"
                  strokeWidth="1"
                />
              ))}

              {/* Latitude/Longitude lines */}
              {[-60, -30, 0, 30, 60].map(lat => {
                const y = geoToSvg(lat, 0, mapWidth, mapHeight).y;
                return <line key={`lat-${lat}`} x1="0" y1={y} x2={mapWidth} y2={y} stroke="rgba(255,153,0,0.06)" strokeWidth="0.5" strokeDasharray="4,8" />;
              })}
              {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lng => {
                const x = geoToSvg(0, lng, mapWidth, mapHeight).x;
                return <line key={`lng-${lng}`} x1={x} y1="0" x2={x} y2={mapHeight} stroke="rgba(255,153,0,0.06)" strokeWidth="0.5" strokeDasharray="4,8" />;
              })}

              {/* Connection lines from threats to server */}
              {threats.slice(0, 30).map(threat => {
                const pos = geoToSvg(threat.lat, threat.lng, mapWidth, mapHeight);
                const isAnimating = animatingLines.includes(threat.id);
                const color = SEVERITY_COLORS[threat.severity] || '#ff9900';
                return (
                  <g key={`line-${threat.id}`}>
                    <line
                      x1={pos.x} y1={pos.y}
                      x2={serverPos.x} y2={serverPos.y}
                      stroke={color}
                      strokeWidth={isAnimating ? 1.5 : 0.4}
                      strokeOpacity={isAnimating ? 0.7 : 0.12}
                      strokeDasharray={isAnimating ? '6,4' : '2,6'}
                      style={isAnimating ? { animation: 'threat-line-dash 1s linear infinite' } : {}}
                    />
                    {/* Animated projectile along line */}
                    {isAnimating && (
                      <circle r="2" fill={color} opacity="0.9" filter="url(#glow)">
                        <animateMotion dur="1.5s" repeatCount="2" path={`M${pos.x},${pos.y} L${serverPos.x},${serverPos.y}`} />
                        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Server location (shield icon) */}
              <g transform={`translate(${serverPos.x}, ${serverPos.y})`}>
                <circle r="12" fill="rgba(0,255,100,0.1)" stroke="rgba(0,255,100,0.4)" strokeWidth="1.5">
                  <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle r="6" fill="rgba(0,255,100,0.3)" stroke="rgba(0,255,100,0.8)" strokeWidth="1">
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle r="2.5" fill="#00ff64" />
                <text y="-18" textAnchor="middle" fill="#00ff64" fontSize="8" fontFamily="monospace" fontWeight="bold">SERVER</text>
              </g>

              {/* Threat dots */}
              {threats.slice(0, 50).map((threat, i) => {
                const pos = geoToSvg(threat.lat, threat.lng, mapWidth, mapHeight);
                const color = SEVERITY_COLORS[threat.severity] || '#ff9900';
                const isNew = animatingLines.includes(threat.id);
                const isSelected = selectedThreat?.id === threat.id;
                return (
                  <g
                    key={threat.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedThreat(threat)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulse ring for new threats */}
                    {isNew && (
                      <>
                        <circle r="0" fill="none" stroke={color} strokeWidth="1.5" opacity="0">
                          <animate attributeName="r" from="4" to="25" dur="1.5s" repeatCount="3" />
                          <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="3" />
                        </circle>
                        <circle r="0" fill="none" stroke={color} strokeWidth="1" opacity="0">
                          <animate attributeName="r" from="4" to="18" dur="1s" repeatCount="3" begin="0.3s" />
                          <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="3" begin="0.3s" />
                        </circle>
                      </>
                    )}
                    {/* Outer glow */}
                    <circle r={isSelected ? 8 : 5} fill={color} opacity={0.15} filter="url(#glow)" />
                    {/* IpInfo resolved indicator (tiny ring) */}
                    {threat.resolvedViaIpInfo && (
                      <circle r={isNew ? 6 : 4} fill="none" stroke="rgba(0,255,100,0.3)" strokeWidth="0.5" />
                    )}
                    {/* Main dot */}
                    <circle
                      r={isNew ? 4 : isSelected ? 4 : 2.5}
                      fill={color}
                      opacity={i < 10 ? 0.9 : 0.6}
                      filter={isNew ? 'url(#glow-strong)' : undefined}
                    >
                      {i < 15 && (
                        <animate attributeName="opacity" values={`${i < 5 ? 0.9 : 0.6};${i < 5 ? 0.5 : 0.3};${i < 5 ? 0.9 : 0.6}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                      )}
                    </circle>
                    {/* Label for selected */}
                    {isSelected && (
                      <g>
                        <rect x="8" y="-24" width="140" height="40" rx="4" fill="rgba(0,0,0,0.95)" stroke={color} strokeWidth="0.5" />
                        <text x="14" y="-12" fill={color} fontSize="8" fontFamily="monospace" fontWeight="bold">{threat.ip}</text>
                        <text x="14" y="-2" fill="rgba(255,255,255,0.6)" fontSize="7" fontFamily="monospace">{threat.city}, {threat.country}</text>
                        {threat.resolvedViaIpInfo && (
                          <text x="14" y="8" fill="rgba(0,255,100,0.5)" fontSize="6" fontFamily="monospace">via IpInfo</text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Legend */}
          <div className="flex items-center gap-4 px-4 pb-3 flex-wrap">
            {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                <span className="text-gray-500 font-mono text-[10px] uppercase">{level}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 4px #00ff64' }} />
              <span className="text-gray-500 font-mono text-[10px]">SERVER</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full border border-green-400/40" />
              <span className="text-gray-600 font-mono text-[9px]">IpInfo Resolved ({ipInfoResolvedThreats})</span>
            </div>
          </div>
        </div>

        {/* Threat Feed Sidebar */}
        <div className="rounded-xl border border-orange-500/30 bg-black/80 overflow-hidden flex flex-col" style={{ maxHeight: '520px' }}>
          <div className="p-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
            <h4 className="text-white font-mono font-bold text-xs">THREAT FEED</h4>
            <span className="text-gray-600 font-mono text-[10px]">{threats.length} events</span>
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto darkwave-scrollbar">
            {threats.slice(0, 50).map((threat) => {
              const color = SEVERITY_COLORS[threat.severity];
              const isNew = animatingLines.includes(threat.id);
              return (
                <div
                  key={threat.id}
                  onClick={() => setSelectedThreat(threat)}
                  className={`p-3 border-b border-gray-800/50 cursor-pointer transition-all hover:bg-orange-500/5 ${
                    isNew ? 'bg-red-500/10 border-l-2' : 'border-l-2 border-l-transparent'
                  } ${selectedThreat?.id === threat.id ? 'bg-orange-500/10' : ''}`}
                  style={{ borderLeftColor: isNew || selectedThreat?.id === threat.id ? color : 'transparent' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                    <span className="text-white font-mono text-xs font-bold truncate">{threat.ip}</span>
                    {isNew && <span className="px-1 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-[8px] font-mono text-red-400 font-bold flex-shrink-0">NEW</span>}
                    {threat.resolvedViaIpInfo && (
                      <span className="px-1 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[7px] font-mono text-green-500 flex-shrink-0">GEO</span>
                    )}
                  </div>
                  <p className="text-gray-400 font-mono text-[10px] truncate">{threat.attackType}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-600 font-mono text-[9px]">{threat.city}, {threat.country}</span>
                    <span className="text-gray-700 font-mono text-[9px]">{formatTimeAgo(threat.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Country Breakdown + Timeline */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Country Breakdown */}
        <div className="rounded-xl border border-orange-500/30 bg-black/80 p-5">
          <h4 className="text-white font-mono font-bold text-sm mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Threats by Country
          </h4>
          <div className="space-y-2.5">
            {sortedCountries.map(([code, count], i) => {
              const pct = Math.round((count / maxCountryCount) * 100);
              return (
                <div key={code}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-mono text-[10px] w-4 text-right">{i + 1}</span>
                      <span className="text-gray-300 font-mono text-xs">{COUNTRY_NAMES[code] || code}</span>
                      <span className="text-gray-600 font-mono text-[10px]">({code})</span>
                    </div>
                    <span className="text-orange-400 font-mono text-xs font-bold">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden ml-6">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? 'linear-gradient(90deg, #ff0040, #ff4444)' :
                                   i < 3 ? 'linear-gradient(90deg, #ff4444, #ff9900)' :
                                   'linear-gradient(90deg, #ff9900, #ffcc00)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {sortedCountries.length === 0 && (
              <p className="text-gray-600 font-mono text-xs text-center py-4">No threat data</p>
            )}
          </div>
        </div>

        {/* 24-Hour Timeline */}
        <div className="rounded-xl border border-orange-500/30 bg-black/80 p-5">
          <h4 className="text-white font-mono font-bold text-sm mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            24-Hour Threat Timeline
          </h4>
          <div className="flex items-end gap-1 h-32">
            {hourlyData.map((count, i) => {
              const pct = maxHourly > 0 ? (count / maxHourly) * 100 : 0;
              const hour = (new Date().getHours() - 23 + i + 24) % 24;
              const isCurrentHour = i === 23;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {count > 0 && (
                    <span className="text-orange-400 font-mono text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                  )}
                  <div
                    className="w-full rounded-t transition-all duration-500 group-hover:opacity-100"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      minHeight: count > 0 ? '4px' : '1px',
                      background: isCurrentHour
                        ? 'linear-gradient(180deg, #ff0040, #ff440080)'
                        : count > maxHourly * 0.7
                        ? 'linear-gradient(180deg, #ff4444, #ff990060)'
                        : count > 0
                        ? 'linear-gradient(180deg, #ff9900, #ff990040)'
                        : 'rgba(255,153,0,0.1)',
                      boxShadow: isCurrentHour ? '0 0 8px rgba(255,0,64,0.5)' : 'none',
                    }}
                  />
                  {(i % 4 === 0 || isCurrentHour) && (
                    <span className={`font-mono text-[8px] ${isCurrentHour ? 'text-orange-400 font-bold' : 'text-gray-600'}`}>
                      {hour.toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
            <span className="text-gray-600 font-mono text-[10px]">24 hours ago</span>
            <div className="flex items-center gap-3">
              {ipInfoConnected && (
                <span className="text-green-500/50 font-mono text-[9px]">{resolvedCount} IPs resolved via IpInfo</span>
              )}
              <span className="text-orange-400 font-mono text-[10px] font-bold">NOW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Threat Detail */}
      {selectedThreat && (
        <div className="rounded-xl border border-orange-500/40 bg-black/80 p-5" style={{ boxShadow: `0 0 20px ${SEVERITY_COLORS[selectedThreat.severity]}20` }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-mono font-bold text-sm flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[selectedThreat.severity], boxShadow: `0 0 6px ${SEVERITY_COLORS[selectedThreat.severity]}` }} />
              Threat Detail
              {selectedThreat.resolvedViaIpInfo && (
                <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[8px] font-mono text-green-400">IpInfo Verified</span>
              )}
            </h4>
            <button onClick={() => setSelectedThreat(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'IP Address', value: selectedThreat.ip },
              { label: 'Location', value: `${selectedThreat.city}, ${COUNTRY_NAMES[selectedThreat.country] || selectedThreat.country}` },
              { label: 'Attack Type', value: selectedThreat.attackType },
              { label: 'Severity', value: selectedThreat.severity.toUpperCase() },
              { label: 'Coordinates', value: `${selectedThreat.lat.toFixed(4)}, ${selectedThreat.lng.toFixed(4)}` },
              { label: selectedThreat.org ? 'Organization' : 'Timestamp', value: selectedThreat.org || selectedThreat.timestamp.toLocaleString() },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">{item.label}</p>
                <p className="text-white font-mono text-xs font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes threat-line-dash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -20; }
        }
      `}</style>
    </div>
  );
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default ThreatWorldMap;
