import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import IPProfileModal from '@/components/security/IPProfileModal';
import PinWidgetButton from './PinWidgetButton';


// ─── Types ───────────────────────────────────────────────────────────────────

interface CountryData {
  code: string;
  totalRequests: number;
  suspiciousCount: number;
  blockedIps: number;
  uniqueIps: number;
  notifications: number;
  severities: { critical: number; high: number; medium: number; low: number };
  riskScore: number;
  riskLevel: 'high' | 'moderate' | 'safe';
  topIps: { ip: string; city: string; org: string; requests: number; suspicious: number; blocked: boolean }[];
}

interface HeatmapSummary {
  totalCountries: number;
  highRisk: number;
  moderateRisk: number;
  safeCountries: number;
  totalRequests: number;
  totalNotifications: number;
  totalBlockedIps: number;
  timeRange: string;
}

interface IPBreakdown {
  ip: string;
  city: string;
  org: string;
  requests: number;
  suspicious: number;
  blocked: boolean;
  geo?: any;
  classification?: { isHosting: boolean; isVpn: boolean; isTor: boolean; type: string };
  threatScore?: { score: number; factors: string[]; riskLevel: string };
}

// ─── Country centroids for map plotting ──────────────────────────────────────

const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number; name: string }> = {
  US: { lat: 39.8, lng: -98.5, name: 'United States' },
  CA: { lat: 56.1, lng: -106.3, name: 'Canada' },
  MX: { lat: 23.6, lng: -102.5, name: 'Mexico' },
  BR: { lat: -14.2, lng: -51.9, name: 'Brazil' },
  AR: { lat: -38.4, lng: -63.6, name: 'Argentina' },
  CO: { lat: 4.6, lng: -74.3, name: 'Colombia' },
  CL: { lat: -35.7, lng: -71.5, name: 'Chile' },
  GB: { lat: 55.4, lng: -3.4, name: 'United Kingdom' },
  FR: { lat: 46.2, lng: 2.2, name: 'France' },
  DE: { lat: 51.2, lng: 10.5, name: 'Germany' },
  IT: { lat: 41.9, lng: 12.6, name: 'Italy' },
  ES: { lat: 40.5, lng: -3.7, name: 'Spain' },
  PT: { lat: 39.4, lng: -8.2, name: 'Portugal' },
  NL: { lat: 52.1, lng: 5.3, name: 'Netherlands' },
  BE: { lat: 50.5, lng: 4.5, name: 'Belgium' },
  SE: { lat: 60.1, lng: 18.6, name: 'Sweden' },
  NO: { lat: 60.5, lng: 8.5, name: 'Norway' },
  FI: { lat: 61.9, lng: 25.7, name: 'Finland' },
  DK: { lat: 56.3, lng: 9.5, name: 'Denmark' },
  PL: { lat: 51.9, lng: 19.1, name: 'Poland' },
  CZ: { lat: 49.8, lng: 15.5, name: 'Czech Republic' },
  AT: { lat: 47.5, lng: 14.6, name: 'Austria' },
  CH: { lat: 46.8, lng: 8.2, name: 'Switzerland' },
  IE: { lat: 53.4, lng: -8.2, name: 'Ireland' },
  RO: { lat: 45.9, lng: 25.0, name: 'Romania' },
  HU: { lat: 47.2, lng: 19.5, name: 'Hungary' },
  GR: { lat: 39.1, lng: 21.8, name: 'Greece' },
  RU: { lat: 61.5, lng: 105.3, name: 'Russia' },
  UA: { lat: 48.4, lng: 31.2, name: 'Ukraine' },
  TR: { lat: 39.0, lng: 35.2, name: 'Turkey' },
  CN: { lat: 35.9, lng: 104.2, name: 'China' },
  JP: { lat: 36.2, lng: 138.3, name: 'Japan' },
  KR: { lat: 35.9, lng: 127.8, name: 'South Korea' },
  IN: { lat: 20.6, lng: 79.0, name: 'India' },
  PK: { lat: 30.4, lng: 69.3, name: 'Pakistan' },
  ID: { lat: -0.8, lng: 113.9, name: 'Indonesia' },
  TH: { lat: 15.9, lng: 100.9, name: 'Thailand' },
  VN: { lat: 14.1, lng: 108.3, name: 'Vietnam' },
  PH: { lat: 12.9, lng: 121.8, name: 'Philippines' },
  SG: { lat: 1.4, lng: 103.8, name: 'Singapore' },
  MY: { lat: 4.2, lng: 101.9, name: 'Malaysia' },
  AU: { lat: -25.3, lng: 133.8, name: 'Australia' },
  NZ: { lat: -40.9, lng: 174.9, name: 'New Zealand' },
  ZA: { lat: -30.6, lng: 22.9, name: 'South Africa' },
  NG: { lat: 9.1, lng: 8.7, name: 'Nigeria' },
  EG: { lat: 26.8, lng: 30.8, name: 'Egypt' },
  KE: { lat: -0.0, lng: 37.9, name: 'Kenya' },
  AE: { lat: 23.4, lng: 53.8, name: 'UAE' },
  SA: { lat: 23.9, lng: 45.1, name: 'Saudi Arabia' },
  IR: { lat: 32.4, lng: 53.7, name: 'Iran' },
  IL: { lat: 31.0, lng: 34.9, name: 'Israel' },
  IS: { lat: 64.9, lng: -19.0, name: 'Iceland' },
  LB: { lat: 33.9, lng: 35.9, name: 'Lebanon' },
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

function geoToSvg(lat: number, lng: number, width: number, height: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (height / 2) - (width * mercN) / (2 * Math.PI);
  return { x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)) };
}

function getRiskColor(level: string): string {
  if (level === 'high') return '#ef4444';
  if (level === 'moderate') return '#eab308';
  return '#22c55e';
}

function getRiskGlow(level: string): string {
  if (level === 'high') return 'rgba(239,68,68,0.6)';
  if (level === 'moderate') return 'rgba(234,179,8,0.4)';
  return 'rgba(34,197,94,0.3)';
}

// ─── Component ───────────────────────────────────────────────────────────────

const ThreatGeoHeatmap: React.FC = () => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [summary, setSummary] = useState<HeatmapSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [ipBreakdown, setIpBreakdown] = useState<IPBreakdown[]>([]);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [sortBy, setSortBy] = useState<'risk' | 'requests' | 'suspicious' | 'blocked'>('risk');
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [profileIp, setProfileIp] = useState<string | null>(null);

  const mapWidth = 900;
  const mapHeight = 450;

  const fetchHeatmap = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'geo_heatmap', time_range: timeRange }
      });
      if (!error && data?.success) {
        setCountries(data.countries || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Heatmap fetch error:', e);
    }
    setIsLoading(false);
  }, [timeRange]);

  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

  const fetchCountryBreakdown = async (countryCode: string) => {
    if (selectedCountry === countryCode) { setSelectedCountry(null); setIpBreakdown([]); return; }
    setSelectedCountry(countryCode);
    setIsLoadingBreakdown(true);
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'country_ip_breakdown', country_code: countryCode, time_range: timeRange }
      });
      if (!error && data?.success) {
        setIpBreakdown(data.ips || []);
      }
    } catch (e) {
      console.error('Country breakdown error:', e);
    }
    setIsLoadingBreakdown(false);
  };

  const handleBlock = async (ip: string) => {
    try {
      const { data } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'manage_blocklist', operation: 'add', ip_address: ip, reason: 'Blocked via Geo Heatmap', blocked_by: 'admin' }
      });
      if (data?.success) {
        toast.success('IP blocked: ' + ip);
        if (selectedCountry) fetchCountryBreakdown(selectedCountry);
        fetchHeatmap();
      }
    } catch { toast.error('Failed to block IP'); }
  };

  const sortedCountries = [...countries].sort((a, b) => {
    if (sortBy === 'requests') return b.totalRequests - a.totalRequests;
    if (sortBy === 'suspicious') return b.suspiciousCount - a.suspiciousCount;
    if (sortBy === 'blocked') return b.blockedIps - a.blockedIps;
    return b.riskScore - a.riskScore;
  });

  // Build country lookup for map
  const countryLookup: Record<string, CountryData> = {};
  countries.forEach(c => { countryLookup[c.code] = c; });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-orange-500/30 bg-black/80 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
          <span className="text-orange-400 font-mono text-sm animate-pulse">Loading geographic threat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Summary */}
      <div className="rounded-xl border border-orange-500/40 bg-black/80 p-6" style={{ boxShadow: '0 0 20px rgba(255,153,0,0.1)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Geographic Threat Heatmap</h3>
              <p className="text-orange-400/60 font-mono text-xs">Country-Level Threat Aggregation & Risk Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PinWidgetButton widgetType="threat_heatmap" title="Threat Geo Heatmap" />
            {(['24h', '7d', '30d'] as const).map(range => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${timeRange === range ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                {range.toUpperCase()}
              </button>
            ))}
          </div>

        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Countries', value: summary.totalCountries, color: 'text-white' },
              { label: 'High Risk', value: summary.highRisk, color: 'text-red-400' },
              { label: 'Moderate', value: summary.moderateRisk, color: 'text-yellow-400' },
              { label: 'Safe', value: summary.safeCountries, color: 'text-green-400' },
              { label: 'Requests', value: summary.totalRequests, color: 'text-cyan-400' },
              { label: 'Alerts', value: summary.totalNotifications, color: 'text-orange-400' },
              { label: 'Blocked IPs', value: summary.totalBlockedIps, color: 'text-red-400' },
            ].map((card, i) => (
              <div key={i} className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg text-center">
                <p className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase">{card.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map + Table Layout */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* SVG World Map with Heat Regions */}
        <div className="rounded-xl border border-orange-500/30 bg-black/80 overflow-hidden">
          <div className="p-3 border-b border-gray-800/50 flex items-center justify-between">
            <h4 className="text-white font-mono font-bold text-sm">THREAT HEATMAP</h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-gray-600 font-mono text-[9px]">Safe</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-gray-600 font-mono text-[9px]">Moderate</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-gray-600 font-mono text-[9px]">High</span></div>
            </div>
          </div>
          <div className="p-2">
            <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-auto" style={{ minHeight: '280px' }}>
              <defs>
                <pattern id="heatmap-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,153,0,0.04)" strokeWidth="0.5" />
                </pattern>
                <filter id="heat-glow">
                  <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="heat-glow-sm">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <rect width={mapWidth} height={mapHeight} fill="url(#heatmap-grid)" />

              {/* Continent outlines */}
              {Object.entries(CONTINENTS).map(([name, path]) => (
                <path key={name} d={path} fill="rgba(255,153,0,0.03)" stroke="rgba(255,153,0,0.12)" strokeWidth="0.8" />
              ))}

              {/* Lat/Lng lines */}
              {[-60, -30, 0, 30, 60].map(lat => {
                const y = geoToSvg(lat, 0, mapWidth, mapHeight).y;
                return <line key={`lat-${lat}`} x1="0" y1={y} x2={mapWidth} y2={y} stroke="rgba(255,153,0,0.04)" strokeWidth="0.5" strokeDasharray="4,8" />;
              })}

              {/* Heat circles for each country */}
              {countries.map(country => {
                const centroid = COUNTRY_CENTROIDS[country.code];
                if (!centroid) return null;
                const pos = geoToSvg(centroid.lat, centroid.lng, mapWidth, mapHeight);
                const color = getRiskColor(country.riskLevel);
                const glow = getRiskGlow(country.riskLevel);
                const baseRadius = Math.max(6, Math.min(30, Math.sqrt(country.totalRequests) * 1.5 + country.riskScore * 0.15));
                const isSelected = selectedCountry === country.code;
                const isHovered = hoveredCountry === country.code;

                return (
                  <g key={country.code}
                    onClick={() => fetchCountryBreakdown(country.code)}
                    onMouseEnter={() => setHoveredCountry(country.code)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Outer heat glow */}
                    <circle cx={pos.x} cy={pos.y} r={baseRadius * 1.8} fill={color} opacity={0.08} filter="url(#heat-glow)" />
                    {/* Mid ring */}
                    <circle cx={pos.x} cy={pos.y} r={baseRadius * 1.2} fill={color} opacity={0.12} />
                    {/* Core circle */}
                    <circle cx={pos.x} cy={pos.y} r={baseRadius * 0.7} fill={color} opacity={isSelected || isHovered ? 0.6 : 0.35} stroke={isSelected ? '#fff' : color} strokeWidth={isSelected ? 2 : 0.5} strokeOpacity={isSelected ? 0.8 : 0.4}>
                      {country.riskLevel === 'high' && (
                        <animate attributeName="opacity" values="0.35;0.5;0.35" dur="2s" repeatCount="indefinite" />
                      )}
                    </circle>
                    {/* Selection ring */}
                    {isSelected && (
                      <circle cx={pos.x} cy={pos.y} r={baseRadius * 1.5} fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="3,3" opacity="0.5">
                        <animate attributeName="stroke-dashoffset" from="0" to="12" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Country code label */}
                    <text x={pos.x} y={pos.y + 3} textAnchor="middle" fill="#fff" fontSize={isSelected || isHovered ? "9" : "7"} fontFamily="monospace" fontWeight="bold" opacity={isSelected || isHovered ? 1 : 0.7}>
                      {country.code}
                    </text>
                    {/* Tooltip on hover */}
                    {isHovered && !isSelected && (
                      <g>
                        <rect x={pos.x + 12} y={pos.y - 30} width="130" height="48" rx="4" fill="rgba(0,0,0,0.95)" stroke={color} strokeWidth="0.5" />
                        <text x={pos.x + 18} y={pos.y - 16} fill={color} fontSize="8" fontFamily="monospace" fontWeight="bold">{centroid.name}</text>
                        <text x={pos.x + 18} y={pos.y - 4} fill="rgba(255,255,255,0.7)" fontSize="7" fontFamily="monospace">{country.totalRequests} req | {country.suspiciousCount} sus</text>
                        <text x={pos.x + 18} y={pos.y + 8} fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="monospace">Risk: {country.riskScore}/100 ({country.riskLevel})</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Country Ranking Table */}
        <div className="rounded-xl border border-orange-500/30 bg-black/80 overflow-hidden flex flex-col" style={{ maxHeight: '560px' }}>
          <div className="p-3 border-b border-gray-800/50 flex items-center justify-between flex-shrink-0">
            <h4 className="text-white font-mono font-bold text-sm">COUNTRY RANKING</h4>
            <span className="text-gray-600 font-mono text-[10px]">{countries.length} countries</span>
          </div>
          {/* Sort controls */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800/30 flex-shrink-0">
            {([
              { id: 'risk' as const, label: 'Risk' },
              { id: 'requests' as const, label: 'Requests' },
              { id: 'suspicious' as const, label: 'Suspicious' },
              { id: 'blocked' as const, label: 'Blocked' },
            ]).map(s => (
              <button key={s.id} onClick={() => setSortBy(s.id)} className={`px-2 py-0.5 rounded font-mono text-[9px] transition-all ${sortBy === s.id ? 'bg-orange-500/10 text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}>{s.label}</button>
            ))}
          </div>
          {/* Country list */}
          <div className="flex-1 overflow-y-auto darkwave-scrollbar">
            {sortedCountries.length > 0 ? sortedCountries.map((country, i) => {
              const centroid = COUNTRY_CENTROIDS[country.code];
              const name = centroid?.name || country.code;
              const color = getRiskColor(country.riskLevel);
              const isSelected = selectedCountry === country.code;
              return (
                <div key={country.code}
                  onClick={() => fetchCountryBreakdown(country.code)}
                  className={`px-3 py-2.5 border-b border-gray-800/30 cursor-pointer transition-all hover:bg-orange-500/5 ${isSelected ? 'bg-orange-500/10 border-l-2' : 'border-l-2 border-l-transparent'}`}
                  style={{ borderLeftColor: isSelected ? color : 'transparent' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-600 font-mono text-[10px] w-4 text-right">{i + 1}</span>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                    <span className="text-white font-mono text-xs font-bold flex-1 truncate">{name}</span>
                    <span className="text-gray-500 font-mono text-[10px]">{country.code}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-6">
                    <div className="flex-1">
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${country.riskScore}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold w-6 text-right" style={{ color }}>{country.riskScore}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-6 mt-1">
                    <span className="text-gray-500 font-mono text-[9px]">{country.totalRequests} req</span>
                    <span className={`font-mono text-[9px] ${country.suspiciousCount > 0 ? 'text-red-400' : 'text-gray-600'}`}>{country.suspiciousCount} sus</span>
                    <span className={`font-mono text-[9px] ${country.blockedIps > 0 ? 'text-orange-400' : 'text-gray-600'}`}>{country.blockedIps} blocked</span>
                    <span className="text-gray-600 font-mono text-[9px]">{country.uniqueIps} IPs</span>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700 mx-auto mb-2">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                <p className="text-gray-600 font-mono text-xs">No geographic data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Country IP Breakdown */}
      {selectedCountry && (
        <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6" style={{ boxShadow: `0 0 20px ${getRiskColor(countryLookup[selectedCountry]?.riskLevel || 'safe')}15` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getRiskColor(countryLookup[selectedCountry]?.riskLevel || 'safe'), boxShadow: `0 0 8px ${getRiskColor(countryLookup[selectedCountry]?.riskLevel || 'safe')}` }} />
              <h4 className="text-white font-mono font-bold">
                IP Breakdown: {COUNTRY_CENTROIDS[selectedCountry]?.name || selectedCountry}
              </h4>
              {countryLookup[selectedCountry] && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${countryLookup[selectedCountry].riskLevel === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : countryLookup[selectedCountry].riskLevel === 'moderate' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-green-500/10 text-green-400 border border-green-500/30'}`}>
                  {countryLookup[selectedCountry].riskLevel} RISK ({countryLookup[selectedCountry].riskScore}/100)
                </span>
              )}
            </div>
            <button onClick={() => { setSelectedCountry(null); setIpBreakdown([]); }} className="text-gray-500 hover:text-gray-300 font-mono text-xs">Close</button>
          </div>

          {isLoadingBreakdown ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
              <span className="text-orange-400 font-mono text-sm animate-pulse">Resolving IPs via IpInfo...</span>
            </div>
          ) : ipBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-900/60 border-b border-gray-800">
                  <tr>
                    <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">IP Address</th>
                    <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">City</th>
                    <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">Organization</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Type</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Risk</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Requests</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Suspicious</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {ipBreakdown.map((ip, idx) => {
                    const riskColor = ip.threatScore?.riskLevel === 'critical' ? '#ef4444' : ip.threatScore?.riskLevel === 'high' ? '#f97316' : ip.threatScore?.riskLevel === 'medium' ? '#eab308' : '#22c55e';
                    return (
                      <tr key={idx} className="hover:bg-orange-500/5 transition-colors cursor-pointer" onClick={() => setProfileIp(ip.ip)}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {ip.blocked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>}
                            <span className="text-white font-mono text-xs hover:text-orange-400 transition-colors">{ip.ip}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                          </div>
                        </td>
                        <td className="p-3 text-gray-400 font-mono text-xs">{ip.geo?.city || ip.city || '?'}</td>
                        <td className="p-3 text-gray-500 font-mono text-xs truncate max-w-[180px]">{ip.geo?.org || ip.org || 'Unknown'}</td>
                        <td className="p-3 text-center">
                          {ip.classification?.type === 'tor' && <span className="text-purple-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded">TOR</span>}
                          {ip.classification?.type === 'vpn' && <span className="text-blue-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded">VPN</span>}
                          {ip.classification?.type === 'hosting' && <span className="text-cyan-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">HOST</span>}
                          {(!ip.classification || ip.classification.type === 'isp' || ip.classification.type === 'unknown') && <span className="text-gray-400 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-gray-500/10 border border-gray-500/30 rounded">ISP</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${ip.threatScore?.score || 0}%`, background: riskColor }} />
                            </div>
                            <span className="font-mono text-[10px] font-bold" style={{ color: riskColor }}>{ip.threatScore?.score || 0}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center text-gray-300 font-mono text-xs">{ip.requests}</td>
                        <td className="p-3 text-center">
                          <span className={`font-mono text-xs font-bold ${ip.suspicious > 0 ? 'text-red-400' : 'text-gray-600'}`}>{ip.suspicious}</span>
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {!ip.blocked && (ip.threatScore?.score || 0) >= 30 ? (
                            <button onClick={() => handleBlock(ip.ip)} className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono hover:bg-red-500/20 transition-all">Block</button>
                          ) : ip.blocked ? (
                            <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] font-mono">BLOCKED</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 font-mono text-sm">No IP data available for this country</p>
            </div>
          )}
        </div>
      )}

      {/* IP Profile Modal */}
      {profileIp && <IPProfileModal ip={profileIp} onClose={() => setProfileIp(null)} />}
    </div>
  );
};

export default ThreatGeoHeatmap;
