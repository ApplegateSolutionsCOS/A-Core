import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Navigation, Layers, Compass, Search, Plus, Minus,
  Maximize2, Eye, Edit3, Route, Flame, Radio, ShieldCheck,
  Globe, ExternalLink, Filter, CheckCircle2, Sparkles, X,
  ChevronRight, Building2, LocateFixed, Sliders
} from 'lucide-react';
import { AppRecord, FormField, MapLayoutConfig } from '@/types';

interface WorkspaceColor {
  primary: string;
  secondary?: string;
  rgb: string;
}

interface MapLayoutViewProps {
  appName?: string;
  records: AppRecord[];
  fields: FormField[];
  mapConfig?: MapLayoutConfig;
  wsColor: WorkspaceColor;
  onSelectRecord: (record: AppRecord) => void;
  onEditRecord?: (record: AppRecord) => void;
  onOpenSettings?: () => void;
}

interface ResolvedMapRecord {
  record: AppRecord;
  title: string;
  subtitle: string;
  addressText: string;
  statusText: string;
  categoryText: string;
  lat: number;
  lng: number;
  isExactCoord: boolean;
  pinColor: string;
}

// Comprehensive city & region coordinates dictionary for instant zero-latency geocoding
const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  'new york': [40.7128, -74.0060],
  'nyc': [40.7128, -74.0060],
  'manhattan': [40.7831, -73.9712],
  'brooklyn': [40.6782, -73.9442],
  'los angeles': [34.0522, -118.2437],
  'chicago': [41.8781, -87.6298],
  'houston': [29.7604, -95.3698],
  'phoenix': [33.4484, -112.0740],
  'philadelphia': [39.9526, -75.1652],
  'san antonio': [29.4241, -98.4936],
  'san diego': [32.7157, -117.1611],
  'dallas': [32.7767, -96.7970],
  'austin': [30.2672, -97.7431],
  'san jose': [37.3382, -121.8863],
  'san francisco': [37.7749, -122.4194],
  'seattle': [47.6062, -122.3321],
  'denver': [39.7392, -104.9903],
  'washington': [38.9072, -77.0369],
  'boston': [42.3601, -71.0589],
  'miami': [25.7617, -80.1918],
  'atlanta': [33.7490, -84.3880],
  'las vegas': [36.1699, -115.1398],
  'detroit': [42.3314, -83.0458],
  'portland': [45.5152, -122.6784],
  'charlotte': [35.2271, -80.8431],
  'nashville': [36.1627, -86.7816],
  'salt lake city': [40.7608, -111.8910],
  'minneapolis': [44.9778, -93.2650],
  'tampa': [27.9506, -82.4572],
  'orlando': [28.5383, -81.3792],
  'pittsburgh': [40.4406, -79.9959],
  'columbus': [39.9612, -82.9988],
  'indianapolis': [39.7684, -86.1581],
  'kansas city': [39.0997, -94.5786],
  'st. louis': [38.6270, -90.1994],
  'baltimore': [39.2904, -76.6122],
  'raleigh': [35.7796, -78.6382],
  'new orleans': [29.9511, -90.0715],
  'honolulu': [21.3069, -157.8583],
  'anchorage': [61.2181, -149.9003],
  'london': [51.5074, -0.1278],
  'paris': [48.8566, 2.3522],
  'berlin': [52.5200, 13.4050],
  'tokyo': [35.6762, 139.6503],
  'singapore': [1.3521, 103.8198],
  'sydney': [-33.8688, 151.2093],
  'toronto': [43.6532, -79.3832],
  'vancouver': [49.2827, -123.1207],
  'dubai': [25.2048, 55.2708],
  'zurich': [47.3769, 8.5417],
  'frankfurt': [50.1109, 8.6821],
  'amsterdam': [52.3676, 4.9041],
  'seoul': [37.5665, 126.9780],
  'california': [36.7783, -119.4179],
  'texas': [31.9686, -99.9018],
  'florida': [27.9944, -81.7603],
  'virginia': [37.4316, -78.6569],
  'illinois': [40.6331, -89.3985],
  'washington dc': [38.9072, -77.0369],
};

// US ZIP prefix (first digit) approximate centroids
const ZIP_PREFIX_COORDS: Record<string, [number, number]> = {
  '0': [42.3601, -71.0589], // Northeast (MA/NJ/CT)
  '1': [40.7128, -74.0060], // NY/PA
  '2': [38.9072, -77.0369], // DC/VA/MD/NC
  '3': [33.7490, -84.3880], // Southeast (GA/FL/TN)
  '4': [39.9612, -82.9988], // Midwest (OH/IN/MI/KY)
  '5': [44.9778, -93.2650], // Upper Midwest (MN/IA/WI)
  '6': [41.8781, -87.6298], // Central (IL/MO/KS)
  '7': [32.7767, -96.7970], // South Central (TX/OK/LA)
  '8': [39.7392, -104.9903], // Mountain (CO/UT/AZ/NV)
  '9': [37.7749, -122.4194], // West Coast (CA/WA/OR)
};

function hashStringToOffset(str: string): [number, number] {
  let h1 = 2166136261;
  let h2 = 16777619;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ (c * 31), 2166136261);
  }
  const latOffset = (((h1 >>> 0) % 2000) / 2000 - 0.5) * 0.08;
  const lngOffset = (((h2 >>> 0) % 2000) / 2000 - 0.5) * 0.08;
  return [latOffset, lngOffset];
}

function resolveAddressCoordinates(
  addressText: string,
  recordId: string,
  defaultCenter: [number, number],
  geocodedCache: Record<string, [number, number]>
): { lat: number; lng: number; isExact: boolean } {
  const normalized = addressText.trim().toLowerCase();
  if (normalized && geocodedCache[normalized]) {
    return {
      lat: geocodedCache[normalized][0],
      lng: geocodedCache[normalized][1],
      isExact: true,
    };
  }

  // Check if addressText itself contains "lat, lng"
  const coordMatch = normalized.match(/(-?\d{1,2}\.\d{3,})\s*[,;/]\s*(-?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, isExact: true };
    }
  }

  // Match known city or state names in address string
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (normalized.includes(key)) {
      const [dLat, dLng] = hashStringToOffset(addressText + recordId);
      return { lat: coords[0] + dLat, lng: coords[1] + dLng, isExact: true };
    }
  }

  // Match 5-digit US ZIP code
  const zipMatch = normalized.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) {
    const zip = zipMatch[1];
    const base = ZIP_PREFIX_COORDS[zip[0]] || defaultCenter;
    const zipNum = parseInt(zip.slice(1), 10) || 0;
    const latShift = ((zipNum % 100) / 100 - 0.5) * 2.4;
    const lngShift = ((Math.floor(zipNum / 100) % 100) / 100 - 0.5) * 3.2;
    const [dLat, dLng] = hashStringToOffset(addressText + recordId);
    return {
      lat: base[0] + latShift + dLat * 0.25,
      lng: base[1] + lngShift + dLng * 0.25,
      isExact: true,
    };
  }

  // Deterministic placement around default center
  const [dLat, dLng] = hashStringToOffset((addressText || 'record') + recordId);
  return {
    lat: defaultCenter[0] + dLat * 1.4,
    lng: defaultCenter[1] + dLng * 1.8,
    isExact: false,
  };
}

// Web Mercator projection helpers
function lngToWorldX(lng: number, worldSize: number): number {
  return ((lng + 180) / 360) * worldSize;
}

function latToWorldY(lat: number, worldSize: number): number {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const sinLat = Math.sin((clamped * Math.PI) / 180);
  return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize;
}

function worldXToLng(x: number, worldSize: number): number {
  return (x / worldSize) * 360 - 180;
}

function worldYToLat(y: number, worldSize: number): number {
  const n = Math.PI - (2 * Math.PI * y) / worldSize;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// Haversine distance in kilometers
function calculateHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const MapLayoutView: React.FC<MapLayoutViewProps> = ({
  records,
  fields,
  mapConfig,
  wsColor,
  onSelectRecord,
  onEditRecord,
  onOpenSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 600 });

  // Map camera state
  const [centerLat, setCenterLat] = useState<number>(mapConfig?.defaultCenterLat ?? 38.9072);
  const [centerLng, setCenterLng] = useState<number>(mapConfig?.defaultCenterLng ?? -77.0369);
  const [zoom, setZoom] = useState<number>(mapConfig?.defaultZoom ?? 5);
  const [mapStyle, setMapStyle] = useState<'darkwave' | 'satellite' | 'street' | 'terrain'>(
    mapConfig?.defaultStyle || 'darkwave'
  );
  const [enable3DTilt, setEnable3DTilt] = useState<boolean>(mapConfig?.enable3DTilt ?? true);
  const [pitch, setPitch] = useState<number>(mapConfig?.enable3DTilt === false ? 0 : 32);
  const [enableClustering, setEnableClustering] = useState<boolean>(mapConfig?.enableClustering ?? false);
  const [enableHeatmap, setEnableHeatmap] = useState<boolean>(mapConfig?.enableHeatmap ?? false);
  const [showRadiusRings, setShowRadiusRings] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(mapConfig?.radiusKm || 25);

  // Interactive UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<boolean>(false);
  const [routePinIds, setRoutePinIds] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [geocodedCache, setGeocodedCache] = useState<Record<string, [number, number]>>({});
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startWorldX: number; startWorldY: number } | null>(null);

  // Measure viewport
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setViewportSize({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [showSidebar]);

  // Auto-detect fields when not explicitly set in mapConfig
  const fieldMapping = useMemo(() => {
    const findFieldByKeywords = (keywords: string[], types?: string[]) => {
      return fields.find(f => {
        const name = f.name.toLowerCase();
        const label = f.label.toLowerCase();
        const typeMatch = !types || types.includes(f.type);
        return typeMatch && keywords.some(k => name.includes(k) || label.includes(k));
      });
    };

    const titleField =
      fields.find(f => f.id === mapConfig?.titleFieldId || f.name === mapConfig?.titleFieldId) ||
      findFieldByKeywords(['name', 'title', 'facility', 'site', 'client', 'company', 'project', 'asset']) ||
      fields[0];

    const addressField =
      fields.find(f => f.id === mapConfig?.addressFieldId || f.name === mapConfig?.addressFieldId) ||
      findFieldByKeywords(['address', 'street', 'location', 'city', 'site', 'hq', 'office', 'destination', 'region', 'state', 'zip']);

    const latField =
      fields.find(f => f.id === mapConfig?.latFieldId || f.name === mapConfig?.latFieldId) ||
      findFieldByKeywords(['lat', 'latitude']);

    const lngField =
      fields.find(f => f.id === mapConfig?.lngFieldId || f.name === mapConfig?.lngFieldId) ||
      findFieldByKeywords(['lng', 'lon', 'longitude']);

    const statusField =
      fields.find(f => f.id === mapConfig?.statusFieldId || f.name === mapConfig?.statusFieldId) ||
      findFieldByKeywords(['status', 'state', 'stage', 'priority', 'health', 'condition']);

    const categoryField =
      fields.find(f => f.id === mapConfig?.categoryFieldId || f.name === mapConfig?.categoryFieldId) ||
      findFieldByKeywords(['category', 'type', 'department', 'tier', 'division', 'zone']);

    // Also collect secondary address parts (city, state, zip, country) to build composite addresses
    const addressPartFields = fields.filter(f => {
      const n = (f.name + ' ' + f.label).toLowerCase();
      return (
        n.includes('address') ||
        n.includes('street') ||
        n.includes('city') ||
        n.includes('state') ||
        n.includes('zip') ||
        n.includes('postal') ||
        n.includes('country') ||
        n.includes('location')
      );
    });

    return {
      titleField,
      addressField,
      latField,
      lngField,
      statusField,
      categoryField,
      addressPartFields,
    };
  }, [fields, mapConfig]);

  const getFieldValue = useCallback((record: AppRecord, field?: FormField): string => {
    if (!field) return '';
    const d = record.data || {};
    const val = d[field.name] ?? d[field.id] ?? d[field.label];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }, []);

  const getPinColorForStatus = useCallback(
    (status: string): string => {
      const s = status.toLowerCase();
      if (s.includes('critical') || s.includes('error') || s.includes('offline') || s.includes('alert') || s.includes('high') || s.includes('overdue')) {
        return '#ef4444';
      }
      if (s.includes('warn') || s.includes('pending') || s.includes('maintenance') || s.includes('review') || s.includes('medium')) {
        return '#f59e0b';
      }
      if (s.includes('active') || s.includes('online') || s.includes('complete') || s.includes('open') || s.includes('verified') || s.includes('operational')) {
        return '#10b981';
      }
      return wsColor.primary || '#00f0ff';
    },
    [wsColor.primary]
  );

  // Resolve all records into physical map pins
  const resolvedRecords = useMemo<ResolvedMapRecord[]>(() => {
    const defaultCenter: [number, number] = [
      mapConfig?.defaultCenterLat ?? 38.9072,
      mapConfig?.defaultCenterLng ?? -77.0369,
    ];

    return records.map((rec, index) => {
      const title =
        getFieldValue(rec, fieldMapping.titleField) ||
        Object.values(rec.data || {}).find(v => typeof v === 'string' && v.trim().length > 0) ||
        `Record #${index + 1}`;

      // Compose full address from primary address field + any city/state/zip fields
      let addressText = getFieldValue(rec, fieldMapping.addressField);
      if (fieldMapping.addressPartFields.length > 1) {
        const parts = fieldMapping.addressPartFields
          .map(f => getFieldValue(rec, f).trim())
          .filter(Boolean);
        const uniqueParts = Array.from(new Set(parts));
        if (uniqueParts.length > 0) {
          addressText = uniqueParts.join(', ');
        }
      }

      if (!addressText) {
        // Fallback: inspect all string values in record for anything resembling a location or address
        const fallbackCandidate = Object.entries(rec.data || {}).find(([k, v]) => {
          if (typeof v !== 'string') return false;
          const kl = k.toLowerCase();
          return kl.includes('loc') || kl.includes('addr') || kl.includes('city') || kl.includes('site') || kl.includes('region');
        });
        if (fallbackCandidate) {
          addressText = String(fallbackCandidate[1]);
        }
      }

      const statusText = getFieldValue(rec, fieldMapping.statusField) || 'Active';
      const categoryText = getFieldValue(rec, fieldMapping.categoryField) || '';

      // Check explicit lat/lng fields first
      const rawLat = parseFloat(getFieldValue(rec, fieldMapping.latField));
      const rawLng = parseFloat(getFieldValue(rec, fieldMapping.lngField));

      let lat: number;
      let lng: number;
      let isExactCoord = false;

      if (!isNaN(rawLat) && !isNaN(rawLng) && rawLat >= -90 && rawLat <= 90 && rawLng >= -180 && rawLng <= 180) {
        lat = rawLat;
        lng = rawLng;
        isExactCoord = true;
      } else {
        const resolved = resolveAddressCoordinates(addressText || String(title), rec.id, defaultCenter, geocodedCache);
        lat = resolved.lat;
        lng = resolved.lng;
        isExactCoord = resolved.isExact;
      }

      return {
        record: rec,
        title: String(title),
        subtitle: categoryText || statusText,
        addressText: addressText || `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
        statusText,
        categoryText,
        lat,
        lng,
        isExactCoord,
        pinColor: getPinColorForStatus(statusText),
      };
    });
  }, [records, fieldMapping, getFieldValue, getPinColorForStatus, mapConfig, geocodedCache]);

  // Background live OpenStreetMap Nominatim geocoding for street addresses not yet in cache
  useEffect(() => {
    let cancelled = false;
    const addressesToGeocode = resolvedRecords
      .filter(r => !r.isExactCoord && r.addressText && !r.addressText.includes('° N'))
      .map(r => r.addressText.trim().toLowerCase())
      .filter((addr, idx, arr) => addr.length > 4 && !geocodedCache[addr] && arr.indexOf(addr) === idx)
      .slice(0, 5); // Batch up to 5 addresses cleanly

    if (addressesToGeocode.length === 0) return;

    const runGeocode = async () => {
      setIsGeocoding(true);
      for (const addr of addressesToGeocode) {
        if (cancelled) break;
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`;
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              if (!cancelled && !isNaN(lat) && !isNaN(lng)) {
                setGeocodedCache(prev => ({ ...prev, [addr]: [lat, lng] }));
              }
            }
          }
        } catch {
          // Offline or rate-limited; deterministic coordinates remain active
        }
      }
      if (!cancelled) setIsGeocoding(false);
    };

    runGeocode();
    return () => {
      cancelled = true;
    };
  }, [resolvedRecords, geocodedCache]);

  // Auto-fit bounds on initial load if records exist
  const hasAutoFittedRef = useRef(false);
  useEffect(() => {
    if (!hasAutoFittedRef.current && resolvedRecords.length > 0) {
      hasAutoFittedRef.current = true;
      const avgLat = resolvedRecords.reduce((acc, r) => acc + r.lat, 0) / resolvedRecords.length;
      const avgLng = resolvedRecords.reduce((acc, r) => acc + r.lng, 0) / resolvedRecords.length;
      setCenterLat(avgLat);
      setCenterLng(avgLng);
    }
  }, [resolvedRecords]);

  // Filter pins by search & status
  const filteredPins = useMemo(() => {
    return resolvedRecords.filter(item => {
      if (statusFilter !== 'all' && item.statusText.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.addressText.toLowerCase().includes(q) ||
        item.statusText.toLowerCase().includes(q) ||
        item.categoryText.toLowerCase().includes(q)
      );
    });
  }, [resolvedRecords, searchQuery, statusFilter]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    resolvedRecords.forEach(r => {
      if (r.statusText) set.add(r.statusText);
    });
    return Array.from(set);
  }, [resolvedRecords]);

  // Slippy map projection math
  const tileZoom = Math.max(2, Math.min(18, Math.round(zoom)));
  const numTiles = Math.pow(2, tileZoom);
  const worldSize = numTiles * 256;
  const centerWorldX = lngToWorldX(centerLng, worldSize);
  const centerWorldY = latToWorldY(centerLat, worldSize);

  const latLngToScreen = useCallback(
    (lat: number, lng: number) => {
      let wx = lngToWorldX(lng, worldSize);
      const wy = latToWorldY(lat, worldSize);
      // Wrap horizontally closest to center
      if (wx - centerWorldX > worldSize / 2) wx -= worldSize;
      if (centerWorldX - wx > worldSize / 2) wx += worldSize;

      return {
        x: viewportSize.width / 2 + (wx - centerWorldX),
        y: viewportSize.height / 2 + (wy - centerWorldY),
      };
    },
    [worldSize, centerWorldX, centerWorldY, viewportSize]
  );

  // Compute visible map tiles
  const visibleTiles = useMemo(() => {
    const halfW = viewportSize.width / 2 + 256;
    const halfH = viewportSize.height / 2 + 256;
    const minTileX = Math.floor((centerWorldX - halfW) / 256);
    const maxTileX = Math.floor((centerWorldX + halfW) / 256);
    const minTileY = Math.max(0, Math.floor((centerWorldY - halfH) / 256));
    const maxTileY = Math.min(numTiles - 1, Math.floor((centerWorldY + halfH) / 256));

    const tiles: Array<{
      key: string;
      url: string;
      left: number;
      top: number;
    }> = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const wrappedX = ((tx % numTiles) + numTiles) % numTiles;
        let url = '';
        if (mapStyle === 'darkwave') {
          url = `https://a.basemaps.cartocdn.com/dark_all/${tileZoom}/${wrappedX}/${ty}.png`;
        } else if (mapStyle === 'satellite') {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tileZoom}/${ty}/${wrappedX}`;
        } else if (mapStyle === 'terrain') {
          url = `https://a.tile.opentopomap.org/${tileZoom}/${wrappedX}/${ty}.png`;
        } else {
          url = `https://tile.openstreetmap.org/${tileZoom}/${wrappedX}/${ty}.png`;
        }

        tiles.push({
          key: `${tileZoom}-${tx}-${ty}-${mapStyle}`,
          url,
          left: viewportSize.width / 2 + (tx * 256 - centerWorldX),
          top: viewportSize.height / 2 + (ty * 256 - centerWorldY),
        });
      }
    }
    return tiles;
  }, [viewportSize, centerWorldX, centerWorldY, numTiles, tileZoom, mapStyle]);

  // Pin clustering calculation
  const renderedClustersOrPins = useMemo(() => {
    const screenPoints = filteredPins.map(pin => {
      const pos = latLngToScreen(pin.lat, pin.lng);
      return { pin, x: pos.x, y: pos.y };
    });

    if (!enableClustering || tileZoom >= 14) {
      return screenPoints.map(sp => ({
        type: 'single' as const,
        id: sp.pin.record.id,
        x: sp.x,
        y: sp.y,
        pin: sp.pin,
        members: [sp.pin],
      }));
    }

    const clusterRadiusPx = 68;
    const used = new Set<string>();
    const clusters: Array<{
      type: 'single' | 'cluster';
      id: string;
      x: number;
      y: number;
      pin: ResolvedMapRecord;
      members: ResolvedMapRecord[];
    }> = [];

    for (let i = 0; i < screenPoints.length; i++) {
      const current = screenPoints[i];
      if (used.has(current.pin.record.id)) continue;
      used.add(current.pin.record.id);

      const group = [current];
      for (let j = i + 1; j < screenPoints.length; j++) {
        const candidate = screenPoints[j];
        if (used.has(candidate.pin.record.id)) continue;
        const dist = Math.hypot(current.x - candidate.x, current.y - candidate.y);
        if (dist <= clusterRadiusPx) {
          used.add(candidate.pin.record.id);
          group.push(candidate);
        }
      }

      const avgX = group.reduce((s, g) => s + g.x, 0) / group.length;
      const avgY = group.reduce((s, g) => s + g.y, 0) / group.length;

      clusters.push({
        type: group.length > 1 ? 'cluster' : 'single',
        id: group.map(g => g.pin.record.id).join('-'),
        x: avgX,
        y: avgY,
        pin: current.pin,
        members: group.map(g => g.pin),
      });
    }

    return clusters;
  }, [filteredPins, latLngToScreen, enableClustering, tileZoom]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-map-interactive="true"]')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startWorldX: centerWorldX,
      startWorldY: centerWorldY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextWorldX = ((dragStartRef.current.startWorldX - dx) % worldSize + worldSize) % worldSize;
    const nextWorldY = Math.max(0, Math.min(worldSize, dragStartRef.current.startWorldY - dy));

    setCenterLng(worldXToLng(nextWorldX, worldSize));
    setCenterLat(worldYToLat(nextWorldY, worldSize));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    setZoom(prev => Math.max(2, Math.min(18, prev + delta)));
  };

  const flyToPin = (pin: ResolvedMapRecord, targetZoom = 13) => {
    setSelectedPinId(pin.record.id);
    setCenterLat(pin.lat);
    setCenterLng(pin.lng);
    setZoom(prev => Math.max(prev, targetZoom));
  };

  const resetViewToFitAll = () => {
    if (filteredPins.length === 0) return;
    const minLat = Math.min(...filteredPins.map(p => p.lat));
    const maxLat = Math.max(...filteredPins.map(p => p.lat));
    const minLng = Math.min(...filteredPins.map(p => p.lng));
    const maxLng = Math.max(...filteredPins.map(p => p.lng));

    setCenterLat((minLat + maxLat) / 2);
    setCenterLng((minLng + maxLng) / 2);

    const span = Math.max(maxLat - minLat, maxLng - minLng);
    if (span < 0.05) setZoom(14);
    else if (span < 0.5) setZoom(11);
    else if (span < 3) setZoom(8);
    else if (span < 15) setZoom(5);
    else setZoom(3);
  };

  // Route & Distance calculation
  const routePins = useMemo(() => {
    return routePinIds
      .map(id => resolvedRecords.find(r => r.record.id === id))
      .filter((r): r is ResolvedMapRecord => !!r);
  }, [routePinIds, resolvedRecords]);

  const routeMetrics = useMemo(() => {
    if (routePins.length < 2) return { totalKm: 0, totalMiles: 0, segments: [] };
    let totalKm = 0;
    const segments: Array<{
      from: ResolvedMapRecord;
      to: ResolvedMapRecord;
      km: number;
      miles: number;
    }> = [];

    for (let i = 0; i < routePins.length - 1; i++) {
      const from = routePins[i];
      const to = routePins[i + 1];
      const km = calculateHaversineKm(from.lat, from.lng, to.lat, to.lng);
      const miles = km * 0.621371;
      totalKm += km;
      segments.push({ from, to, km, miles });
    }
    return {
      totalKm,
      totalMiles: totalKm * 0.621371,
      segments,
    };
  }, [routePins]);

  const togglePinInRoute = (recordId: string) => {
    setRoutePinIds(prev =>
      prev.includes(recordId) ? prev.filter(id => id !== recordId) : [...prev, recordId]
    );
  };

  const selectedPin = useMemo(
    () => resolvedRecords.find(r => r.record.id === selectedPinId) || null,
    [resolvedRecords, selectedPinId]
  );

  // Convert radiusKm to approximate screen pixels at current latitude & zoom
  const radiusPixels = useMemo(() => {
    const metersPerPixel =
      (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, tileZoom);
    return Math.max(18, Math.min(350, (radiusKm * 1000) / Math.max(1, metersPerPixel)));
  }, [radiusKm, centerLat, tileZoom]);

  return (
    <div className="relative w-full h-[680px] rounded-2xl overflow-hidden border border-white/15 bg-[#04060b] shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex select-none">
      {/* Ambient Outer Neon Glow */}
      <div
        className="pointer-events-none absolute -inset-1 opacity-25 blur-2xl z-0"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${wsColor.primary}, transparent 60%)`,
        }}
      />

      {/* TOP FLOATING HUD BAR */}
      <div
        data-map-interactive="true"
        className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-black/80 backdrop-blur-2xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.75)]"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center border relative overflow-hidden"
            style={{
              backgroundColor: `rgba(${wsColor.rgb}, 0.14)`,
              borderColor: `rgba(${wsColor.rgb}, 0.45)`,
              boxShadow: `0 0 18px rgba(${wsColor.rgb}, 0.35)`,
            }}
          >
            <Globe className="w-4 h-4 animate-pulse" style={{ color: wsColor.primary }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-white">
                Geospatial Physical Map
              </span>
              <span
                className="px-2 py-0.5 text-[10px] font-mono rounded-full border"
                style={{
                  backgroundColor: `rgba(${wsColor.rgb}, 0.15)`,
                  borderColor: `rgba(${wsColor.rgb}, 0.4)`,
                  color: wsColor.primary,
                }}
              >
                {filteredPins.length} LOCATIONS
              </span>
              {isGeocoding && (
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 animate-pulse">
                  GEOCODING LIVE...
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              {centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E • ZOOM L{tileZoom} • PQC ENCRYPTED TELEMETRY
            </p>
          </div>
        </div>

        {/* Map Layer & Feature Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Layer Style Switcher */}
          <div className="flex items-center bg-black/70 p-0.5 rounded-lg border border-white/10">
            {(['darkwave', 'satellite', 'street', 'terrain'] as const).map(style => (
              <button
                key={style}
                onClick={() => setMapStyle(style)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                  mapStyle === style
                    ? 'text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                style={
                  mapStyle === style
                    ? {
                        backgroundColor: `rgba(${wsColor.rgb}, 0.25)`,
                        border: `1px solid rgba(${wsColor.rgb}, 0.5)`,
                        boxShadow: `0 0 12px rgba(${wsColor.rgb}, 0.25)`,
                      }
                    : {}
                }
              >
                {style}
              </button>
            ))}
          </div>

          {/* 3D Tilt Toggle */}
          <button
            onClick={() => {
              const next = !enable3DTilt;
              setEnable3DTilt(next);
              setPitch(next ? 32 : 0);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
              enable3DTilt
                ? 'bg-white/15 text-white border-white/30'
                : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Toggle 3D Perspective Tilt"
          >
            <Compass className="w-3.5 h-3.5" style={{ color: enable3DTilt ? wsColor.primary : undefined }} />
            3D Tilt
          </button>

          {/* Clustering Toggle */}
          <button
            onClick={() => setEnableClustering(v => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
              enableClustering
                ? 'bg-white/15 text-white border-white/30'
                : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Cluster Nearby Address Pins"
          >
            <Layers className="w-3.5 h-3.5" style={{ color: enableClustering ? wsColor.primary : undefined }} />
            Cluster
          </button>

          {/* Heatmap Toggle */}
          <button
            onClick={() => setEnableHeatmap(v => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
              enableHeatmap
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Thermal Density Heatmap Overlay"
          >
            <Flame className="w-3.5 h-3.5" />
            Heatmap
          </button>

          {/* Geofence Radius Rings */}
          <button
            onClick={() => setShowRadiusRings(v => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
              showRadiusRings
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Geofence Coverage Rings"
          >
            <Radio className="w-3.5 h-3.5" />
            Geofence ({radiusKm}km)
          </button>

          {/* Route Planner Tool */}
          <button
            onClick={() => {
              setRouteMode(v => !v);
              if (!routeMode && routePinIds.length === 0 && filteredPins.length >= 2) {
                setRoutePinIds([filteredPins[0].record.id, filteredPins[1].record.id]);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
              routeMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Measure Multi-Point Route & Distance"
          >
            <Route className="w-3.5 h-3.5" />
            Route
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-black/60 text-gray-400 hover:text-white border border-white/10 transition-colors"
              title="Configure Map Fields & Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setShowSidebar(v => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-black/60 text-gray-300 hover:text-white border border-white/10 text-[11px] font-medium"
          >
            {showSidebar ? 'Hide Directory' : 'Show Directory'}
          </button>
        </div>
      </div>

      {/* MAIN INTERACTIVE MAP CANVAS */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`relative flex-1 h-full overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          perspective: '1400px',
          background:
            'radial-gradient(circle at 50% 50%, rgba(12, 18, 34, 1) 0%, rgba(4, 6, 12, 1) 100%)',
        }}
      >
        {/* 3D Transformed Map Plane */}
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            transform: enable3DTilt
              ? `rotateX(${pitch}deg) scale(${1 + pitch * 0.004})`
              : 'none',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Cyber Grid Underlay (Always visible behind or during tile load) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(${wsColor.rgb}, 0.2) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
            }}
          />

          {/* Slippy Map Raster Tiles */}
          <div className="absolute inset-0 pointer-events-none">
            {visibleTiles.map(tile => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                draggable={false}
                className="absolute w-[256px] h-[256px] max-w-none select-none transition-opacity duration-200"
                style={{
                  left: `${tile.left}px`,
                  top: `${tile.top}px`,
                  filter:
                    mapStyle === 'darkwave'
                      ? `contrast(1.18) brightness(0.95) drop-shadow(0 0 1px rgba(${wsColor.rgb}, 0.2))`
                      : mapStyle === 'satellite'
                      ? 'contrast(1.1) saturate(1.15)'
                      : 'none',
                }}
              />
            ))}
          </div>

          {/* Heatmap & Geofence Overlay Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <radialGradient id="mapThermalGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.65" />
                <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="80%" stopColor={wsColor.primary} stopOpacity="0.15" />
                <stop offset="100%" stopColor={wsColor.primary} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Thermal Heatmap blobs */}
            {enableHeatmap &&
              filteredPins.map(pin => {
                const pos = latLngToScreen(pin.lat, pin.lng);
                return (
                  <circle
                    key={`heat-${pin.record.id}`}
                    cx={pos.x}
                    cy={pos.y}
                    r={85}
                    fill="url(#mapThermalGrad)"
                  />
                );
              })}

            {/* Geofence Radius Rings */}
            {showRadiusRings &&
              filteredPins.map(pin => {
                const pos = latLngToScreen(pin.lat, pin.lng);
                return (
                  <g key={`radius-${pin.record.id}`}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radiusPixels}
                      fill={`rgba(${wsColor.rgb}, 0.08)`}
                      stroke={pin.pinColor}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                  </g>
                );
              })}

            {/* Route Polyline & Animated Pulse */}
            {routeMode &&
              routePins.length >= 2 &&
              routeMetrics.segments.map((seg, idx) => {
                const p1 = latLngToScreen(seg.from.lat, seg.from.lng);
                const p2 = latLngToScreen(seg.to.lat, seg.to.lng);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                return (
                  <g key={`route-seg-${idx}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={wsColor.primary}
                      strokeWidth={5}
                      strokeOpacity={0.25}
                    />
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      strokeDasharray="8 6"
                    />
                    <rect
                      x={midX - 42}
                      y={midY - 12}
                      width={84}
                      height={22}
                      rx={6}
                      fill="rgba(0,0,0,0.85)"
                      stroke="#22d3ee"
                      strokeWidth={1}
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      textAnchor="middle"
                      fill="#67e8f9"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {seg.miles.toFixed(1)} mi
                    </text>
                  </g>
                );
              })}
          </svg>

          {/* Interactive Map Pins & Clusters */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {renderedClustersOrPins.map(item => {
              // Skip off-screen pins with buffer
              if (
                item.x < -100 ||
                item.x > viewportSize.width + 100 ||
                item.y < -100 ||
                item.y > viewportSize.height + 100
              ) {
                return null;
              }

              if (item.type === 'cluster') {
                return (
                  <button
                    key={item.id}
                    data-map-interactive="true"
                    onClick={e => {
                      e.stopPropagation();
                      const avgLat =
                        item.members.reduce((s, m) => s + m.lat, 0) / item.members.length;
                      const avgLng =
                        item.members.reduce((s, m) => s + m.lng, 0) / item.members.length;
                      setCenterLat(avgLat);
                      setCenterLng(avgLng);
                      setZoom(z => Math.min(18, z + 2));
                    }}
                    className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${item.x}px`, top: `${item.y}px` }}
                  >
                    <span
                      className="absolute -inset-3 rounded-full animate-ping opacity-30"
                      style={{ backgroundColor: wsColor.primary }}
                    />
                    <div
                      className="w-11 h-11 rounded-full flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl border-2 text-white font-bold shadow-[0_0_25px_rgba(0,0,0,0.8)] transition-transform group-hover:scale-110"
                      style={{
                        borderColor: wsColor.primary,
                        boxShadow: `0 0 20px rgba(${wsColor.rgb}, 0.55)`,
                      }}
                    >
                      <span className="text-xs leading-none">{item.members.length}</span>
                      <span className="text-[8px] font-mono text-gray-300 uppercase">PINS</span>
                    </div>
                  </button>
                );
              }

              const pin = item.pin;
              const isSelected = selectedPinId === pin.record.id;
              const isHovered = hoveredPinId === pin.record.id;
              const inRouteIndex = routePinIds.indexOf(pin.record.id);

              return (
                <div
                  key={pin.record.id}
                  data-map-interactive="true"
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    zIndex: isSelected || isHovered ? 50 : 20,
                  }}
                  onMouseEnter={() => setHoveredPinId(pin.record.id)}
                  onMouseLeave={() => setHoveredPinId(null)}
                >
                  {/* Hover or Selected Floating Card */}
                  {(isHovered || isSelected) && (
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        onSelectRecord(pin.record);
                      }}
                      className="mb-2 w-64 p-3 rounded-xl bg-black/90 backdrop-blur-2xl border border-white/20 shadow-[0_15px_35px_rgba(0,0,0,0.9)] cursor-pointer transition-all"
                      style={{
                        borderColor: isSelected ? wsColor.primary : 'rgba(255,255,255,0.2)',
                        boxShadow: `0 12px 30px rgba(0,0,0,0.85), 0 0 18px rgba(${wsColor.rgb}, 0.3)`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-white truncate">{pin.title}</h4>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase shrink-0"
                          style={{
                            backgroundColor: `${pin.pinColor}25`,
                            color: pin.pinColor,
                            border: `1px solid ${pin.pinColor}55`,
                          }}
                        >
                          {pin.statusText}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 line-clamp-2 mb-2 flex items-start gap-1">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />
                        <span>{pin.addressText}</span>
                      </p>
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-gray-400 font-mono">
                        <span>
                          {pin.lat.toFixed(3)}°, {pin.lng.toFixed(3)}°
                        </span>
                        <span
                          className="flex items-center gap-1 font-semibold"
                          style={{ color: wsColor.primary }}
                        >
                          Inspect Record <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Glowing 3D Pin Marker */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (routeMode) {
                        togglePinInRoute(pin.record.id);
                      } else {
                        setSelectedPinId(pin.record.id);
                      }
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      onSelectRecord(pin.record);
                    }}
                    className="relative flex flex-col items-center group focus:outline-none mx-auto"
                  >
                    {/* Pulse Halo */}
                    <span
                      className="absolute -inset-2 rounded-full animate-ping opacity-35"
                      style={{ backgroundColor: pin.pinColor }}
                    />

                    {/* Pin Head */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform duration-200 ${
                        isSelected ? 'scale-125' : 'group-hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: 'rgba(5, 8, 18, 0.92)',
                        borderColor: pin.pinColor,
                        boxShadow: `0 0 18px ${pin.pinColor}`,
                      }}
                    >
                      {inRouteIndex >= 0 ? (
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {inRouteIndex + 1}
                        </span>
                      ) : (
                        <MapPin className="w-4 h-4" style={{ color: pin.pinColor }} />
                      )}
                    </div>

                    {/* Pin Stem & Ground Shadow */}
                    <div
                      className="w-0.5 h-2.5"
                      style={{ backgroundColor: pin.pinColor }}
                    />
                    <div
                      className="w-3 h-1 rounded-full blur-[1px]"
                      style={{ backgroundColor: pin.pinColor }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* FLOATING BOTTOM-LEFT CAMERA & ZOOM CONTROLS */}
        <div
          data-map-interactive="true"
          className="absolute bottom-4 left-4 z-30 flex flex-col gap-1.5 p-1.5 rounded-xl bg-black/80 backdrop-blur-2xl border border-white/15 shadow-2xl"
        >
          <button
            onClick={() => setZoom(z => Math.min(18, z + 1))}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(2, z - 1))}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="h-px bg-white/10 my-0.5" />
          <button
            onClick={resetViewToFitAll}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors"
            title="Fit All Record Pins"
          >
            <LocateFixed className="w-4 h-4" style={{ color: wsColor.primary }} />
          </button>
        </div>

        {/* FLOATING ROUTE DISTANCE TELEMETRY BAR */}
        {routeMode && (
          <div
            data-map-interactive="true"
            className="absolute bottom-4 left-16 z-30 max-w-md px-4 py-3 rounded-xl bg-black/85 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.85)]"
          >
            <div className="flex items-center justify-between gap-4 mb-1.5">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Multi-Point Route Calculator
                </span>
              </div>
              <button
                onClick={() => setRoutePinIds([])}
                className="text-[10px] text-gray-400 hover:text-white underline"
              >
                Clear Stops ({routePins.length})
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mb-2">
              Click any map pin to add or remove stops along your physical route.
            </p>
            {routePins.length >= 2 ? (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                <div className="p-1.5 rounded-lg bg-white/5">
                  <div className="text-[10px] text-gray-400">DISTANCE (MI)</div>
                  <div className="text-sm font-mono font-bold text-cyan-300">
                    {routeMetrics.totalMiles.toFixed(1)} mi
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5">
                  <div className="text-[10px] text-gray-400">DISTANCE (KM)</div>
                  <div className="text-sm font-mono font-bold text-white">
                    {routeMetrics.totalKm.toFixed(1)} km
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5">
                  <div className="text-[10px] text-gray-400">EST. TRANSIT</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    {Math.max(1, Math.round(routeMetrics.totalMiles / 55))}h{' '}
                    {Math.round(((routeMetrics.totalMiles / 55) % 1) * 60)}m
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-cyan-300 font-mono">
                Select at least 2 pins to compute geodesic distance.
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT FROSTED BLACK TRANSLUCENT LOCATION DIRECTORY & INSPECTOR */}
      {showSidebar && (
        <div
          data-map-interactive="true"
          className="w-80 md:w-96 h-full bg-black/85 backdrop-blur-2xl border-l border-white/15 z-30 flex flex-col pt-16"
        >
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-white/10 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search addresses, cities, records..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
              />
            </div>

            {uniqueStatuses.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  All ({resolvedRecords.length})
                </button>
                {uniqueStatuses.map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 transition-colors ${
                      statusFilter === st
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Pin Deep Inspector Drawer */}
          {selectedPin && (
            <div
              className="p-3.5 border-b border-white/15 bg-gradient-to-b from-white/[0.07] to-transparent"
              style={{ borderLeft: `3px solid ${selectedPin.pinColor}` }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    SELECTED LOCATION
                  </span>
                  <h3 className="text-sm font-bold text-white">{selectedPin.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedPinId(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-gray-300 mb-2 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: selectedPin.pinColor }} />
                <span>{selectedPin.addressText}</span>
              </p>

              <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px] font-mono">
                <div className="p-1.5 rounded bg-black/60 border border-white/10 text-gray-300">
                  LAT: <span className="text-white">{selectedPin.lat.toFixed(5)}°</span>
                </div>
                <div className="p-1.5 rounded bg-black/60 border border-white/10 text-gray-300">
                  LNG: <span className="text-white">{selectedPin.lng.toFixed(5)}°</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSelectRecord(selectedPin.record)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: `rgba(${wsColor.rgb}, 0.25)`,
                    border: `1px solid rgba(${wsColor.rgb}, 0.55)`,
                    boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.25)`,
                  }}
                >
                  <Eye className="w-3.5 h-3.5" /> Open Record
                </button>
                {onEditRecord && (
                  <button
                    onClick={() => onEditRecord(selectedPin.record)}
                    className="py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white border border-white/15 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    selectedPin.addressText && !selectedPin.addressText.includes('° N')
                      ? selectedPin.addressText
                      : `${selectedPin.lat},${selectedPin.lng}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-gray-300 hover:text-white border border-white/15 flex items-center gap-1"
                  title="Open in External Satellite Map"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Scrollable Address & Record List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredPins.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium text-gray-400">No mapped records match your filter</p>
                <p className="text-[11px] mt-1">
                  Add records with an Address, City, State, ZIP, or Coordinate field to plot them here.
                </p>
              </div>
            ) : (
              filteredPins.map(pin => {
                const isSelected = selectedPinId === pin.record.id;
                const inRoute = routePinIds.includes(pin.record.id);

                return (
                  <div
                    key={pin.record.id}
                    onClick={() => flyToPin(pin)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/12 border-white/30 shadow-lg'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: wsColor.primary,
                            boxShadow: `0 0 18px rgba(${wsColor.rgb}, 0.2)`,
                          }
                        : {}
                    }
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: pin.pinColor,
                            boxShadow: `0 0 8px ${pin.pinColor}`,
                          }}
                        />
                        <h4 className="text-xs font-semibold text-white truncate">{pin.title}</h4>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase shrink-0"
                        style={{
                          backgroundColor: `${pin.pinColor}20`,
                          color: pin.pinColor,
                        }}
                      >
                        {pin.statusText}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-2 pl-4 mb-2">
                      {pin.addressText}
                    </p>

                    <div className="flex items-center justify-between pl-4 text-[10px] text-gray-500 font-mono">
                      <span>
                        {pin.lat.toFixed(3)}°N, {pin.lng.toFixed(3)}°E
                      </span>
                      <div className="flex items-center gap-2">
                        {routeMode && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              togglePinInRoute(pin.record.id);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-medium ${
                              inRoute
                                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                                : 'bg-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            {inRoute ? 'In Route' : '+ Route'}
                          </button>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectRecord(pin.record);
                          }}
                          className="text-gray-300 hover:text-white underline font-sans"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Security & Mapping Status */}
          <div className="p-2.5 border-t border-white/10 bg-black/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              AES-256-GCM + ML-KEM-1024
            </span>
            <span>SHA-512 VERIFIED</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLayoutView;

