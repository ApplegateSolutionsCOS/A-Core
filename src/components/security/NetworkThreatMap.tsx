import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Inline icons
const GlobeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const CrosshairIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>
);
const AlertIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);

interface GeoIPResult {
  ip_address: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  loc?: string;
  org?: string;
  is_threat?: boolean;
  threat_score?: number;
}

interface ConnectionWithGeo {
  ip: string;
  port: number;
  processName: string;
  status: string;
  riskScore: number;
  geo?: GeoIPResult;
  lat?: number;
  lng?: number;
}

interface Props {
  connections?: any[];
  scanId?: string;
}

// Convert lat/lng to SVG coordinates on equirectangular projection
function geoToSvg(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

const NetworkThreatMap: React.FC<Props> = ({ connections = [], scanId }) => {
  const [geoData, setGeoData] = useState<Record<string, GeoIPResult>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [connWithGeo, setConnWithGeo] = useState<ConnectionWithGeo[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const mapWidth = 900;
  const mapHeight = 450;

  // Extract unique IPs from connections
  const uniqueIPs = [...new Set(connections.map(c => c.remoteAddress || c.remote_address || '').filter(ip =>
    ip && !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.') && ip !== '::' && ip !== '::1' && ip !== '*' && ip !== '0.0.0.0'
  ))].slice(0, 50);

  const lookupGeoIP = useCallback(async () => {
    if (uniqueIPs.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deep-scan-analyzer', {
        body: { action: 'geoip_lookup', ips: uniqueIPs }
      });
      if (data?.results) {
        setGeoData(data.results);
        // Build connections with geo data
        const withGeo: ConnectionWithGeo[] = connections
          .filter(c => {
            const ip = c.remoteAddress || c.remote_address || '';
            return ip && data.results[ip];
          })
          .map(c => {
            const ip = c.remoteAddress || c.remote_address || '';
            const geo = data.results[ip];
            const [lat, lng] = (geo?.loc || '0,0').split(',').map(Number);
            return {
              ip, port: c.remotePort || c.remote_port || 0,
              processName: c.processName || c.process_name || '',
              status: c.status || 'unknown', riskScore: c.riskScore || c.risk_score || 0,
              geo, lat, lng
            };
          });
        setConnWithGeo(withGeo);

        // Try to detect user location from first local-ish response
        const firstGeo = Object.values(data.results)[0] as any;
        if (firstGeo?.loc) {
          // Use a rough estimate - we'll set user at center of their country
          setUserLocation({ lat: 37.7749, lng: -122.4194 }); // Default SF
        }
      }
    } catch (e: any) { toast.error('GeoIP lookup failed: ' + e.message); }
    setLoading(false);
  }, [uniqueIPs.join(',')]);

  useEffect(() => { lookupGeoIP(); }, [connections.length]);

  // Try to get user's approximate location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 37.7749, lng: -122.4194 })
      );
    }
  }, []);

  const getThreatColor = (riskScore: number) => {
    if (riskScore >= 70) return '#ef4444';
    if (riskScore >= 40) return '#f97316';
    if (riskScore >= 20) return '#eab308';
    return '#22c55e';
  };

  const handleBlockIP = async (ip: string) => {
    toast.success(`Firewall rule generated for ${ip}`, {
      description: 'Copy the command from the remediation panel to block this IP'
    });
  };

  const selectedConn = connWithGeo.find(c => c.ip === selectedIP);

  // World map simplified outline paths
  const worldOutline = "M145,95 L150,90 L160,88 L170,85 L180,82 L190,80 L200,78 L210,80 L220,82 L230,85 L240,88 L250,90 L260,92 L270,95 L280,98 L290,100 L300,102 L310,105 L320,108 L330,110 L340,112 L350,115 L360,118 L370,120 L380,122 L390,125 L400,128 L410,130 L420,132 L430,135 L440,138 L450,140 L460,142 L470,145 L480,148 L490,150 L500,152 L510,155 L520,158 L530,160 L540,162 L550,165 L560,168 L570,170 L580,172 L590,175 L600,178 L610,180 L620,182 L630,185 L640,188 L650,190 L660,192 L670,195 L680,198 L690,200";

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden" style={{ boxShadow: '0 0 20px rgba(0,200,255,0.1)' }}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GlobeIcon size={20} className="text-cyan-400" />
            <div>
              <h3 className="text-white font-mono font-bold">Deep Scan Network Threat Map</h3>
              <p className="text-gray-500 font-mono text-xs">{connWithGeo.length} connections geolocated via IPinfo API</p>
            </div>
          </div>
          <button onClick={lookupGeoIP} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-xs disabled:opacity-50">
            <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Looking up...' : 'Refresh GeoIP'}
          </button>
        </div>

        {/* SVG World Map */}
        <div className="relative rounded-lg overflow-hidden border border-gray-800 bg-gray-950">
          <svg ref={svgRef} viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-auto" style={{ minHeight: 300 }}>
            <defs>
              <radialGradient id="threatGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Background grid */}
            {Array.from({ length: 18 }, (_, i) => (
              <line key={'vg' + i} x1={i * 50} y1={0} x2={i * 50} y2={mapHeight} stroke="rgba(0,200,255,0.03)" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={'hg' + i} x1={0} y1={i * 50} x2={mapWidth} y2={i * 50} stroke="rgba(0,200,255,0.03)" strokeWidth="0.5" />
            ))}

            {/* Simplified continent outlines */}
            {/* North America */}
            <path d="M100,80 L120,70 L140,65 L160,60 L180,62 L200,65 L210,70 L220,80 L225,90 L230,100 L235,110 L240,120 L235,130 L225,140 L215,150 L205,155 L195,160 L185,165 L175,170 L165,175 L155,180 L145,185 L135,180 L125,170 L115,160 L110,150 L105,140 L100,130 L95,120 L90,110 L85,100 L90,90 Z" fill="rgba(0,200,255,0.05)" stroke="rgba(0,200,255,0.15)" strokeWidth="1" />
            {/* South America */}
            <path d="M195,195 L210,190 L225,195 L235,210 L240,230 L245,250 L250,270 L255,290 L250,310 L240,330 L225,340 L210,345 L200,340 L195,325 L190,310 L185,290 L180,270 L175,250 L180,230 L185,210 Z" fill="rgba(0,200,255,0.05)" stroke="rgba(0,200,255,0.15)" strokeWidth="1" />
            {/* Europe */}
            <path d="M380,60 L400,55 L420,50 L440,52 L460,55 L475,60 L480,70 L478,80 L470,90 L460,95 L450,100 L440,105 L430,108 L420,110 L410,108 L400,105 L390,100 L385,90 L380,80 Z" fill="rgba(0,200,255,0.05)" stroke="rgba(0,200,255,0.15)" strokeWidth="1" />
            {/* Africa */}
            <path d="M410,120 L430,115 L450,118 L470,125 L480,140 L485,160 L490,180 L495,200 L498,220 L495,240 L490,260 L480,280 L465,295 L450,300 L435,295 L420,285 L410,270 L405,250 L400,230 L398,210 L400,190 L402,170 L405,150 L408,135 Z" fill="rgba(0,200,255,0.05)" stroke="rgba(0,200,255,0.15)" strokeWidth="1" />
            {/* Asia */}
            <path d="M490,50 L520,45 L550,42 L580,40 L610,42 L640,45 L670,50 L700,55 L720,60 L740,70 L750,80 L755,95 L750,110 L740,125 L720,135 L700,140 L680,145 L660,148 L640,150 L620,148 L600,145 L580,140 L560,135 L540,130 L520,120 L505,110 L495,95 L490,80 L488,65 Z" fill="rgba(0,200,255,0.05)" stroke="rgba(0,200,255,0.15)" strokeWidth="1" />
            {/* Australia */}
            <path d="M680,260 L710,255 L740,258 L760,265 L775,280 L780,300 L775,315 L760,325 L740,330 L720,328 L700,320 L685,310 L678,295 L675,280 Z" fill="rgba(0,200,255,0.05)" stroke="rgba(0,200,255,0.15)" strokeWidth="1" />

            {/* User location */}
            {userLocation && (() => {
              const [ux, uy] = geoToSvg(userLocation.lat, userLocation.lng, mapWidth, mapHeight);
              return (
                <g>
                  <circle cx={ux} cy={uy} r="12" fill="rgba(0,200,255,0.1)" stroke="rgba(0,200,255,0.3)" strokeWidth="1">
                    <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={ux} cy={uy} r="4" fill="#06b6d4" stroke="#fff" strokeWidth="1.5" filter="url(#glow)" />
                  <text x={ux} y={uy - 10} fill="#06b6d4" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">YOU</text>
                </g>
              );
            })()}

            {/* Connection lines and remote points */}
            {connWithGeo.map((conn, i) => {
              if (!conn.lat || !conn.lng) return null;
              const [rx, ry] = geoToSvg(conn.lat, conn.lng, mapWidth, mapHeight);
              const color = getThreatColor(conn.riskScore);
              const isSelected = conn.ip === selectedIP;

              let ux = mapWidth / 2, uy = mapHeight / 2;
              if (userLocation) {
                [ux, uy] = geoToSvg(userLocation.lat, userLocation.lng, mapWidth, mapHeight);
              }

              return (
                <g key={i}>
                  {/* Animated connection line */}
                  <line x1={ux} y1={uy} x2={rx} y2={ry} stroke={color} strokeWidth={isSelected ? 2 : 1} opacity={isSelected ? 0.8 : 0.3} strokeDasharray={conn.riskScore >= 40 ? '' : '4 4'}>
                    <animate attributeName="opacity" values={`${isSelected ? 0.5 : 0.1};${isSelected ? 0.9 : 0.4};${isSelected ? 0.5 : 0.1}`} dur={`${2 + i * 0.1}s`} repeatCount="indefinite" />
                  </line>
                  {/* Animated pulse along line */}
                  <circle r="2" fill={color} opacity="0.8">
                    <animateMotion dur={`${3 + i * 0.2}s`} repeatCount="indefinite" path={`M${ux},${uy} L${rx},${ry}`} />
                  </circle>
                  {/* Remote endpoint */}
                  <circle cx={rx} cy={ry} r={isSelected ? 7 : 4} fill={color} opacity={0.8} stroke={isSelected ? '#fff' : 'none'} strokeWidth={isSelected ? 2 : 0} style={{ cursor: 'pointer' }} onClick={() => setSelectedIP(conn.ip === selectedIP ? null : conn.ip)} />
                  {conn.riskScore >= 40 && (
                    <circle cx={rx} cy={ry} r="10" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
                      <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-black/80 border border-gray-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-gray-400 font-mono text-[9px]">Safe</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><span className="text-gray-400 font-mono text-[9px]">Warning</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /><span className="text-gray-400 font-mono text-[9px]">Suspicious</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-gray-400 font-mono text-[9px]">Critical</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-cyan-500" /><span className="text-gray-400 font-mono text-[9px]">Your Location</span></div>
          </div>
        </div>

        {/* Selected IP Detail */}
        {selectedConn && selectedConn.geo && (
          <div className="mt-4 p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GlobeIcon size={16} className="text-cyan-400" />
                <span className="text-white font-mono text-sm font-bold">{selectedConn.ip}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${selectedConn.riskScore >= 50 ? 'text-red-400 border-red-500/30 bg-red-500/10' : selectedConn.riskScore >= 20 ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-green-400 border-green-500/30 bg-green-500/10'}`}>
                  Risk: {selectedConn.riskScore}
                </span>
              </div>
              <button onClick={() => handleBlockIP(selectedConn.ip)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-mono text-xs">
                <CrosshairIcon size={12} /> Block IP
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div><span className="text-gray-500">City:</span> <span className="text-white">{selectedConn.geo.city || 'Unknown'}</span></div>
              <div><span className="text-gray-500">Region:</span> <span className="text-white">{selectedConn.geo.region || 'Unknown'}</span></div>
              <div><span className="text-gray-500">Country:</span> <span className="text-white">{selectedConn.geo.country || 'Unknown'}</span></div>
              <div><span className="text-gray-500">Org:</span> <span className="text-white">{(selectedConn.geo.org || 'Unknown').slice(0, 30)}</span></div>
              <div><span className="text-gray-500">Port:</span> <span className="text-white">{selectedConn.port}</span></div>
              <div><span className="text-gray-500">Process:</span> <span className="text-white">{selectedConn.processName || 'Unknown'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="text-white">{selectedConn.status}</span></div>
              <div><span className="text-gray-500">Coords:</span> <span className="text-white">{selectedConn.geo.loc || 'N/A'}</span></div>
            </div>
          </div>
        )}

        {/* Connection Table */}
        {connWithGeo.length > 0 && (
          <div className="mt-4">
            <h5 className="text-gray-400 font-mono text-xs font-bold mb-2">Geolocated Connections ({connWithGeo.length})</h5>
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-900/50 border-b border-gray-800 sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">IP</th>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">PORT</th>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">PROCESS</th>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">CITY</th>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">COUNTRY</th>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">ORG</th>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">RISK</th>
                    <th className="text-left p-2 text-[10px] font-mono text-cyan-400">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {connWithGeo.map((conn, i) => (
                    <tr key={i} className={`hover:bg-gray-900/30 cursor-pointer transition-colors ${conn.ip === selectedIP ? 'bg-cyan-500/5' : ''}`} onClick={() => setSelectedIP(conn.ip === selectedIP ? null : conn.ip)}>
                      <td className="p-2 text-white font-mono text-[10px]">{conn.ip}</td>
                      <td className="p-2 text-gray-400 font-mono text-[10px]">{conn.port}</td>
                      <td className="p-2 text-gray-400 font-mono text-[10px]">{conn.processName || '-'}</td>
                      <td className="p-2 text-gray-400 font-mono text-[10px]">{conn.geo?.city || '-'}</td>
                      <td className="p-2 text-gray-400 font-mono text-[10px]">{conn.geo?.country || '-'}</td>
                      <td className="p-2 text-gray-500 font-mono text-[10px] truncate max-w-[150px]">{conn.geo?.org || '-'}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <div className="w-8 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${conn.riskScore}%`, background: getThreatColor(conn.riskScore) }} />
                          </div>
                          <span className="text-gray-500 font-mono text-[9px]">{conn.riskScore}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        {conn.riskScore >= 30 && (
                          <button onClick={(e) => { e.stopPropagation(); handleBlockIP(conn.ip); }} className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[9px] font-mono hover:bg-red-500/20">
                            Block
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

        {uniqueIPs.length === 0 && (
          <div className="text-center py-8">
            <GlobeIcon size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">No external connections to map</p>
            <p className="text-gray-600 font-mono text-xs mt-1">Run a Deep Scan to detect network connections and geolocate remote servers</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkThreatMap;
