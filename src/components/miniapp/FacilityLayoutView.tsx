import React, { useState, useMemo, useRef } from 'react';
import {
  FacilityTemplateConfig,
  FacilityZoneNode,
  FacilityWallSegment,
  FormField,
} from '@/types';
import { DEFAULT_FACILITY_PRESETS } from './FacilityTemplateBuilder';
import { FacilityImageGeneratorModal } from './FacilityImageGeneratorModal';
import { SECURITY_ALGORITHMS } from '@/lib/encryption';
import {
  Building2,
  Box,
  Layers,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Activity,
  Shield,
  Server,
  Cpu,
  DoorOpen,
  Grid,
  Truck,
  Radio,
  Camera,
  Briefcase,
  Move,
  Sliders,
  ExternalLink,
  Compass,
  Eye,
  Image as ImageIcon,
  MapPin,
} from 'lucide-react';

interface FacilityLayoutViewProps {
  records: any[];
  fields: FormField[];
  facilityTemplate?: FacilityTemplateConfig;
  wsColor: { primary: string; secondary?: string; rgb: string };
  appName?: string;
  onSelectRecord: (record: any) => void;
  onOpenTemplateBuilder?: () => void;
  extractPlainText?: (val: any) => string;
}

const NODE_ICONS: Record<
  FacilityZoneNode['type'],
  React.ComponentType<any>
> = {
  room: DoorOpen,
  zone: Grid,
  rack: Server,
  workstation: Cpu,
  dock: Truck,
  sensor: Radio,
  camera: Camera,
  corridor: Move,
  vault: Shield,
  office: Briefcase,
};

const getFieldLabel = (f?: FormField | null): string => {
  if (!f) return '';
  return String((f as any).label || f.name || '');
};

export const FacilityLayoutView: React.FC<FacilityLayoutViewProps> = ({
  records,
  fields,
  facilityTemplate,
  wsColor,
  appName,
  onSelectRecord,
  onOpenTemplateBuilder,
  extractPlainText,
}) => {
  const schema: FacilityTemplateConfig = useMemo(() => {
    if (facilityTemplate && Array.isArray(facilityTemplate.nodes) && facilityTemplate.nodes.length > 0) {
      return facilityTemplate;
    }
    return {
      ...DEFAULT_FACILITY_PRESETS['cyber-datacenter'],
      name: `${appName || 'MiniApp'} Facility Digital Twin`,
    };
  }, [facilityTemplate, appName]);

  const [activeFloorId, setActiveFloorId] = useState<string>(
    schema.floors?.[0]?.id || 'floor-1'
  );
  const [is3D, setIs3D] = useState<boolean>(schema.default3DMode ?? true);
  const [tilt, setTilt] = useState<number>(schema.defaultTiltAngle ?? 54);
  const [rotation, setRotation] = useState<number>(schema.defaultRotationAngle ?? -22);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [wallCutawayMode, setWallCutawayMode] = useState<'full' | 'cutaway' | 'xray' | 'wireframe'>(
    schema.wallCutawayMode || 'cutaway'
  );
  const [multiFloorStack3D, setMultiFloorStack3D] = useState<boolean>(
    schema.multiFloorStack3D ?? false
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    schema.nodes?.[0]?.id || null
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showRadarPulse, setShowRadarPulse] = useState<boolean>(true);
  const [showImageGenerator, setShowImageGenerator] = useState<boolean>(false);

  // Interactive 3D Virtual Camera Orbit & Pan State
  const [cameraDragState, setCameraDragState] = useState<{
    mode: 'orbit' | 'pan';
    startX: number;
    startY: number;
    origTilt: number;
    origRot: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const safeText = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (extractPlainText) return extractPlainText(val);
    if (typeof val === 'string') return val.replace(/<[^>]*>/g, '').trim();
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) return val.map(safeText).join(', ');
    if (typeof val === 'object') {
      return String(val.text || val.name || val.title || val.label || val.value || '');
    }
    return String(val);
  };

  // Determine key fields for title, location, status, and metric
  const titleField = useMemo(() => {
    if (schema.titleFieldId) {
      const found = fields.find((f) => f.id === schema.titleFieldId);
      if (found) return found;
    }
    return (
      fields.find((f) => /name|title|subject|asset|item|unit|client|device/i.test(getFieldLabel(f))) ||
      fields[0]
    );
  }, [fields, schema.titleFieldId]);

  const locationField = useMemo(() => {
    if (schema.locationMatchFieldId) {
      const found = fields.find((f) => f.id === schema.locationMatchFieldId);
      if (found) return found;
    }
    return fields.find((f) =>
      /zone|room|rack|bay|floor|location|building|facility|sector|department|station|site/i.test(
        getFieldLabel(f)
      )
    );
  }, [fields, schema.locationMatchFieldId]);

  const statusField = useMemo(() => {
    if (schema.statusFieldId) {
      const found = fields.find((f) => f.id === schema.statusFieldId);
      if (found) return found;
    }
    return fields.find(
      (f) =>
        f.type === 'status' ||
        f.type === 'dropdown' ||
        /status|state|health|priority|stage/i.test(getFieldLabel(f))
    );
  }, [fields, schema.statusFieldId]);

  const metricField = useMemo(() => {
    if (schema.metricFieldId) {
      const found = fields.find((f) => f.id === schema.metricFieldId);
      if (found) return found;
    }
    return fields.find((f) =>
      ['number', 'currency', 'progress', 'rating'].includes(f.type)
    );
  }, [fields, schema.metricFieldId]);

  const getRecordTitle = (rec: any, idx: number): string => {
    const data = rec.data || rec;
    if (titleField && data[titleField.id] !== undefined) {
      const t = safeText(data[titleField.id]);
      if (t) return t;
    }
    if (titleField && data[titleField.name] !== undefined) {
      const t = safeText(data[titleField.name]);
      if (t) return t;
    }
    for (const f of fields) {
      const v = safeText(data[f.id] ?? data[f.name]);
      if (v) return v;
    }
    return `Record #${idx + 1}`;
  };

  const getRecordStatusInfo = (rec: any): { label: string; color: string; alert: boolean } => {
    const data = rec.data || rec;
    const raw = statusField ? safeText(data[statusField.id] ?? data[statusField.name]) : '';
    const lower = raw.toLowerCase();
    if (/critical|error|down|offline|blocked|overdue|high|urgent|fail/.test(lower)) {
      return { label: raw || 'ALERT', color: '#ef4444', alert: true };
    }
    if (/warn|pending|review|maintenance|hold|medium|progress/.test(lower)) {
      return { label: raw || 'ACTIVE', color: '#f59e0b', alert: false };
    }
    if (/active|online|clean|complete|nominal|ready|approved|open|low/.test(lower)) {
      return { label: raw || 'NOMINAL', color: '#10b981', alert: false };
    }
    return { label: raw || 'ONLINE', color: wsColor.primary, alert: false };
  };

  // Map records to Facility Schema nodes
  const recordsByNodeId = useMemo(() => {
    const map: Record<string, any[]> = {};
    schema.nodes.forEach((n) => {
      map[n.id] = [];
    });

    if (!schema.nodes.length) return map;

    const unassigned: any[] = [];

    records.forEach((rec) => {
      const data = rec.data || rec;
      // 1. Check explicit node assignment
      const explicitNode = schema.nodes.find((n) =>
        n.assignedRecordIds?.includes(rec.id)
      );
      if (explicitNode) {
        map[explicitNode.id].push(rec);
        return;
      }

      // 2. Check locationField or any field matching node code / label / linkedFieldValue
      const candidateText = locationField
        ? safeText(data[locationField.id] ?? data[locationField.name]).toLowerCase()
        : Object.values(data)
            .map((v) => safeText(v))
            .join(' ')
            .toLowerCase();

      const matchedNode = schema.nodes.find((n) => {
        const code = (n.code || '').toLowerCase();
        const label = (n.label || '').toLowerCase();
        const linked = (n.linkedFieldValue || '').toLowerCase();
        return (
          (code && candidateText.includes(code)) ||
          (linked && candidateText.includes(linked)) ||
          (label && candidateText.includes(label))
        );
      });

      if (matchedNode) {
        map[matchedNode.id].push(rec);
      } else {
        unassigned.push(rec);
      }
    });

    // 3. Deterministically distribute remaining records across physical zones so every record is inspectable on the facility map
    unassigned.forEach((rec, i) => {
      const hashSource = String(rec.id || i);
      let hash = 0;
      for (let c = 0; c < hashSource.length; c++) {
        hash = (hash * 31 + hashSource.charCodeAt(c)) >>> 0;
      }
      const targetNode = schema.nodes[hash % schema.nodes.length];
      if (targetNode) {
        map[targetNode.id].push(rec);
      }
    });

    return map;
  }, [records, schema.nodes, locationField]);

  const activeFloor =
    schema.floors.find((f) => f.id === activeFloorId) ||
    schema.floors[0] || { id: 'floor-1', name: 'Level 01', level: 1 };

  const floorNodes = schema.nodes.filter(
    (n) => !n.floorId || n.floorId === activeFloor.id
  );
  const floorWalls = (schema.walls || []).filter(
    (w) => !w.floorId || w.floorId === activeFloor.id
  );

  const selectedNode =
    schema.nodes.find((n) => n.id === selectedNodeId) || floorNodes[0] || null;
  const selectedNodeRecords = selectedNode
    ? recordsByNodeId[selectedNode.id] || []
    : [];

  const activeBlueprintUrl =
    activeFloor.blueprintImageUrl || schema.blueprintImageUrl || '';

  // Camera drag handlers
  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-facility-interactive="true"]')) return;
    const isPan = e.shiftKey || e.button === 1 || e.button === 2 || !is3D;
    setCameraDragState({
      mode: isPan ? 'pan' : 'orbit',
      startX: e.clientX,
      startY: e.clientY,
      origTilt: tilt,
      origRot: rotation,
      origPanX: panOffset.x,
      origPanY: panOffset.y,
    });
  };

  const handleViewportMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cameraDragState) return;
    const dx = e.clientX - cameraDragState.startX;
    const dy = e.clientY - cameraDragState.startY;
    if (cameraDragState.mode === 'orbit') {
      const nextRot = Math.max(-180, Math.min(180, Math.round(cameraDragState.origRot + dx * 0.45)));
      const nextTilt = Math.max(0, Math.min(75, Math.round(cameraDragState.origTilt - dy * 0.35)));
      setRotation(nextRot);
      setTilt(nextTilt);
    } else {
      setPanOffset({
        x: Math.max(-260, Math.min(260, cameraDragState.origPanX + dx)),
        y: Math.max(-220, Math.min(220, cameraDragState.origPanY + dy)),
      });
    }
  };

  const handleViewportMouseUp = () => {
    if (cameraDragState) setCameraDragState(null);
  };

  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.max(0.55, Math.min(1.85, +(z + delta).toFixed(2))));
  };

  // Render a single floor slab + 3D volumetric rooms + live record telemetry
  const renderFloorPlane = (
    floorObj: { id: string; name: string; level: number; blueprintImageUrl?: string },
    nodesForFloor: FacilityZoneNode[],
    wallsForFloor: FacilityWallSegment[],
    zElevationPx: number,
    isCurrentActiveFloor: boolean
  ) => {
    const bpUrl = floorObj.blueprintImageUrl || schema.blueprintImageUrl || '';
    const normYaw = ((rotation % 360) + 360) % 360;
    const southFront = normYaw < 90 || normYaw > 270;
    const eastFront = normYaw > 0 && normYaw < 180;

    return (
      <div
        key={floorObj.id}
        onClick={() => {
          if (!isCurrentActiveFloor) setActiveFloorId(floorObj.id);
        }}
        className={`absolute inset-0 rounded-2xl border transition-all duration-200 ${
          isCurrentActiveFloor ? 'ring-1 ring-white/15' : 'opacity-80 hover:opacity-100'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateZ(${zElevationPx}px)`,
          borderColor: isCurrentActiveFloor
            ? `rgba(${wsColor.rgb}, 0.55)`
            : 'rgba(255,255,255,0.18)',
          backgroundColor: 'rgba(4, 9, 20, 0.86)',
          backgroundImage: `
            linear-gradient(to right, rgba(${wsColor.rgb}, 0.13) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(${wsColor.rgb}, 0.13) 1px, transparent 1px)
          `,
          backgroundSize: `${100 / (schema.gridCols || 24)}% ${100 / (schema.gridRows || 16)}%`,
          boxShadow: is3D
            ? `0 30px 70px rgba(0,0,0,0.9), 0 0 38px rgba(${wsColor.rgb}, 0.18)`
            : `0 0 35px rgba(${wsColor.rgb}, 0.12)`,
        }}
      >
        {/* Floor Level Tag */}
        <div
          className="absolute -top-6 left-2 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border pointer-events-none"
          style={{
            background: 'rgba(2, 6, 16, 0.92)',
            borderColor: `rgba(${wsColor.rgb}, 0.5)`,
            color: wsColor.primary,
            transform: is3D ? 'translateZ(10px)' : 'none',
          }}
        >
          {floorObj.name} (L{floorObj.level})
        </div>

        {/* Uploaded Blueprint Underlay */}
        {bpUrl && (
          <img
            src={bpUrl}
            alt="Facility Blueprint"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none rounded-2xl"
            style={{ opacity: schema.blueprintOpacity ?? 0.45 }}
          />
        )}

        {/* 2D SVG Wall Footprints */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {wallsForFloor.map((w) => (
            <line
              key={w.id}
              x1={`${w.x1}%`}
              y1={`${w.y1}%`}
              x2={`${w.x2}%`}
              y2={`${w.y2}%`}
              stroke={w.color || wsColor.primary}
              strokeWidth={w.thickness || 4}
              strokeOpacity={0.85}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* 3D Standing Structural Wall Segments */}
        {is3D &&
          wallsForFloor.map((w) => {
            const dx = w.x2 - w.x1;
            const dy = w.y2 - w.y1;
            const lengthPct = Math.hypot(dx, dy);
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            const wallH = w.height || 38;
            const wallCol = w.color || wsColor.primary;
            return (
              <div
                key={`wall3d-${w.id}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${w.x1}%`,
                  top: `${w.y1}%`,
                  width: `${lengthPct}%`,
                  height: `${Math.max(3, w.thickness || 4)}px`,
                  transformOrigin: '0 50%',
                  transformStyle: 'preserve-3d',
                  transform: `rotateZ(${angleDeg}deg)`,
                }}
              >
                <div
                  className="absolute left-0 top-0 w-full origin-bottom"
                  style={{
                    height: `${wallH}px`,
                    transform: 'rotateX(-90deg)',
                    background: `linear-gradient(180deg, ${wallCol}88, ${wallCol}30)`,
                    borderTop: `2px solid ${wallCol}`,
                    boxShadow: `0 0 14px ${wallCol}45`,
                  }}
                />
              </div>
            );
          })}

        {/* 3D Volumetric Rooms & Live Telemetry Nodes */}
        {nodesForFloor.map((node) => {
          const nodeRecs = recordsByNodeId[node.id] || [];
          const isSelected = selectedNode?.id === node.id;
          const IconComp = NODE_ICONS[node.type] || DoorOpen;
          const baseColor = node.color || wsColor.primary;

          const matchesSearch =
            !searchTerm.trim() ||
            node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nodeRecs.some((r, idx) =>
              getRecordTitle(r, idx)
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            );

          const hasAlert = nodeRecs.some((r) => getRecordStatusInfo(r).alert);
          const activeColor = hasAlert ? '#ef4444' : baseColor;
          const wallHeightPx = is3D ? Math.max(14, Math.round((node.elevationHeight || 42) * 0.95)) : 0;
          const baseWallAlpha =
            wallCutawayMode === 'wireframe'
              ? 0.08
              : wallCutawayMode === 'xray'
              ? 0.22
              : node.wallOpacity ?? 0.72;

          const northH =
            wallCutawayMode === 'cutaway' && !southFront
              ? Math.round(wallHeightPx * 0.28)
              : wallHeightPx;
          const southH =
            wallCutawayMode === 'cutaway' && southFront
              ? Math.round(wallHeightPx * 0.28)
              : wallHeightPx;
          const eastH =
            wallCutawayMode === 'cutaway' && eastFront
              ? Math.round(wallHeightPx * 0.28)
              : wallHeightPx;
          const westH =
            wallCutawayMode === 'cutaway' && !eastFront
              ? Math.round(wallHeightPx * 0.28)
              : wallHeightPx;

          const doorWall = node.doorPosition || 'south';
          const windowWall = node.windowWall || 'east';
          const utilization = node.capacity
            ? Math.min(100, Math.round((nodeRecs.length / node.capacity) * 100))
            : Math.min(100, nodeRecs.length * 15);

          return (
            <div
              key={node.id}
              data-facility-interactive="true"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
              }}
              className={`absolute rounded-lg cursor-pointer transition-opacity duration-200 group ${
                matchesSearch ? 'opacity-100' : 'opacity-25'
              }`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: `${node.width}%`,
                height: `${node.height}%`,
                transformStyle: 'preserve-3d',
                transform: `${node.rotation ? `rotateZ(${node.rotation}deg)` : ''}`,
                background:
                  wallCutawayMode === 'wireframe'
                    ? 'rgba(4, 10, 22, 0.35)'
                    : `linear-gradient(145deg, ${activeColor}32, rgba(4, 8, 18, 0.92))`,
                border: isSelected
                  ? `2px solid ${activeColor}`
                  : `1.5px solid ${activeColor}90`,
                boxShadow: isSelected
                  ? `0 0 32px ${activeColor}75, inset 0 0 18px ${activeColor}35`
                  : `0 0 14px ${activeColor}25`,
              }}
            >
              {/* Animated Neon Glow Pulse Ring on Active/Alert Zones */}
              {showRadarPulse && (nodeRecs.length > 0 || isSelected) && (
                <div
                  className="absolute -inset-[2px] rounded-lg pointer-events-none animate-pulse"
                  style={{
                    border: `1px solid ${activeColor}`,
                    boxShadow: `0 0 18px ${activeColor}55`,
                  }}
                />
              )}

              {/* === TRUE 3D EXTRUDED ARCHITECTURAL WALLS === */}
              {is3D && (
                <>
                  {/* NORTH WALL */}
                  <div
                    className="absolute left-0 top-0 w-full pointer-events-none origin-top transition-all duration-200"
                    style={{
                      height: `${northH}px`,
                      transform: 'rotateX(-90deg)',
                      background: `linear-gradient(to top, ${activeColor}${Math.round(
                        baseWallAlpha * 210
                      )
                        .toString(16)
                        .padStart(2, '0')}, ${activeColor}22)`,
                      borderTop: `2px solid ${activeColor}`,
                      borderLeft: `1px solid ${activeColor}70`,
                      borderRight: `1px solid ${activeColor}70`,
                    }}
                  >
                    {doorWall === 'north' && (
                      <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[26%] max-w-[34px] h-[72%] rounded-t-sm"
                        style={{
                          background: 'rgba(2, 6, 14, 0.92)',
                          borderTop: `2px solid ${activeColor}`,
                          borderLeft: `1.5px solid ${activeColor}`,
                          borderRight: `1.5px solid ${activeColor}`,
                        }}
                      />
                    )}
                    {windowWall === 'north' && (
                      <div className="absolute top-[22%] left-[18%] right-[18%] h-[32%] rounded-sm border border-cyan-300/60 bg-cyan-400/15" />
                    )}
                  </div>

                  {/* SOUTH WALL */}
                  <div
                    className="absolute left-0 bottom-0 w-full pointer-events-none origin-bottom transition-all duration-200"
                    style={{
                      height: `${southH}px`,
                      transform: 'rotateX(90deg)',
                      background: `linear-gradient(to bottom, ${activeColor}${Math.round(
                        baseWallAlpha * 230
                      )
                        .toString(16)
                        .padStart(2, '0')}, ${activeColor}28)`,
                      borderBottom: `2px solid ${activeColor}`,
                      borderLeft: `1px solid ${activeColor}80`,
                      borderRight: `1px solid ${activeColor}80`,
                      boxShadow: `0 0 16px ${activeColor}35`,
                    }}
                  >
                    {doorWall === 'south' && (
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-[26%] max-w-[34px] h-[72%] rounded-b-sm"
                        style={{
                          background: 'rgba(2, 6, 14, 0.92)',
                          borderBottom: `2px solid ${activeColor}`,
                          borderLeft: `1.5px solid ${activeColor}`,
                          borderRight: `1.5px solid ${activeColor}`,
                        }}
                      />
                    )}
                    {windowWall === 'south' && (
                      <div className="absolute bottom-[22%] left-[18%] right-[18%] h-[32%] rounded-sm border border-cyan-300/60 bg-cyan-400/15" />
                    )}
                  </div>

                  {/* WEST WALL */}
                  <div
                    className="absolute left-0 top-0 h-full pointer-events-none origin-left transition-all duration-200"
                    style={{
                      width: `${westH}px`,
                      transform: 'rotateY(90deg)',
                      background: `linear-gradient(to left, ${activeColor}${Math.round(
                        baseWallAlpha * 195
                      )
                        .toString(16)
                        .padStart(2, '0')}, ${activeColor}20)`,
                      borderLeft: `2px solid ${activeColor}`,
                      borderTop: `1px solid ${activeColor}70`,
                      borderBottom: `1px solid ${activeColor}70`,
                    }}
                  />

                  {/* EAST WALL */}
                  <div
                    className="absolute right-0 top-0 h-full pointer-events-none origin-right transition-all duration-200"
                    style={{
                      width: `${eastH}px`,
                      transform: 'rotateY(-90deg)',
                      background: `linear-gradient(to right, ${activeColor}${Math.round(
                        baseWallAlpha * 220
                      )
                        .toString(16)
                        .padStart(2, '0')}, ${activeColor}25)`,
                      borderRight: `2px solid ${activeColor}`,
                      borderTop: `1px solid ${activeColor}80`,
                      borderBottom: `1px solid ${activeColor}80`,
                    }}
                  />

                  {/* 3D TOP ROOF RIM / CEILING CAP */}
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-200"
                    style={{
                      transform: `translateZ(${wallHeightPx}px)`,
                      border: `1.5px solid ${activeColor}`,
                      background: node.hasRoof
                        ? `linear-gradient(135deg, ${activeColor}45, rgba(6, 12, 26, 0.72))`
                        : 'transparent',
                      boxShadow: isSelected
                        ? `0 0 22px ${activeColor}75, inset 0 0 14px ${activeColor}35`
                        : `0 0 10px ${activeColor}35`,
                    }}
                  />

                  {/* 3D Interior Furnishings (Server Racks, Conference Table, Desks, Vault Core) */}
                  {(node.interiorProp === 'racks' || node.type === 'rack') && (
                    <div
                      className="absolute inset-x-[18%] top-[28%] bottom-[26%] flex items-center justify-around pointer-events-none"
                      style={{ transformStyle: 'preserve-3d', transform: 'translateZ(8px)' }}
                    >
                      {[0, 1, 2].map((rk) => (
                        <div
                          key={rk}
                          className="w-[22%] h-full rounded-sm border"
                          style={{
                            borderColor: `${activeColor}99`,
                            background: `linear-gradient(180deg, ${activeColor}55, rgba(2,6,16,0.95))`,
                            boxShadow: `0 0 8px ${activeColor}55`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {(node.interiorProp === 'conference' || node.type === 'office') && (
                    <div
                      className="absolute inset-x-[24%] top-[32%] bottom-[30%] rounded-full border pointer-events-none"
                      style={{
                        transform: 'translateZ(6px)',
                        borderColor: `${activeColor}88`,
                        background: `radial-gradient(circle, ${activeColor}40, rgba(4,10,20,0.9))`,
                      }}
                    />
                  )}
                  {(node.interiorProp === 'vault-core' || node.type === 'vault') && (
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 pointer-events-none"
                      style={{
                        transform: 'translate(-50%, -50%) translateZ(12px)',
                        borderColor: activeColor,
                        background: `radial-gradient(circle, ${activeColor}80, rgba(2,6,14,0.95))`,
                        boxShadow: `0 0 16px ${activeColor}`,
                      }}
                    />
                  )}
                </>
              )}

              {/* Floating Room Telemetry HUD */}
              <div
                className="p-2 h-full flex flex-col justify-between overflow-hidden relative z-10"
                style={{
                  transform: is3D
                    ? `translateZ(${Math.min(wallHeightPx + 4, 28)}px)`
                    : 'none',
                }}
              >
                {/* Top Row: Code Badge + Record Count Pill */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider truncate"
                    style={{
                      background: 'rgba(2, 6, 16, 0.85)',
                      color: activeColor,
                      border: `1px solid ${activeColor}75`,
                    }}
                  >
                    {node.code}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1"
                    style={{
                      background: 'rgba(0,0,0,0.82)',
                      color: '#fff',
                      border: `1px solid ${activeColor}70`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: activeColor,
                        boxShadow: `0 0 6px ${activeColor}`,
                      }}
                    />
                    {nodeRecs.length}
                  </span>
                </div>

                {/* Center Zone Title + Mini Record Chips */}
                <div className="my-auto py-0.5">
                  <div className="flex items-center gap-1">
                    <IconComp size={12} style={{ color: activeColor }} />
                    <span className="text-[11px] font-mono font-bold text-white truncate drop-shadow">
                      {node.label}
                    </span>
                  </div>
                  {nodeRecs.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 max-h-10 overflow-hidden">
                      {nodeRecs.slice(0, 2).map((r, rIdx) => (
                        <button
                          key={r.id || rIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRecord(r);
                          }}
                          className="px-1.5 py-0.5 rounded bg-black/85 hover:bg-black text-[9px] font-mono text-gray-200 border border-white/15 truncate max-w-full transition-transform hover:scale-105"
                        >
                          {getRecordTitle(r, rIdx)}
                        </button>
                      ))}
                      {nodeRecs.length > 2 && (
                        <span className="text-[8px] font-mono text-gray-300 px-1">
                          +{nodeRecs.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Utilization Bar */}
                <div className="space-y-0.5">
                  <div className="w-full h-1 rounded-full bg-black/75 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${utilization}%`,
                        background: activeColor,
                        boxShadow: `0 0 8px ${activeColor}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Frosted Black Translucent Facility Command Bar */}
      <div
        className="rounded-2xl p-3.5 bg-black/80 backdrop-blur-xl border flex flex-wrap items-center justify-between gap-3 relative overflow-hidden"
        style={{
          borderColor: `rgba(${wsColor.rgb}, 0.35)`,
          boxShadow: `0 10px 35px rgba(0,0,0,0.85), 0 0 25px rgba(${wsColor.rgb}, 0.12)`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[1.5px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${wsColor.primary}, transparent)`,
          }}
        />

        {/* Facility Title & Floor Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                background: `rgba(${wsColor.rgb}, 0.14)`,
                borderColor: `rgba(${wsColor.rgb}, 0.4)`,
                boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.25)`,
              }}
            >
              <Building2 size={18} style={{ color: wsColor.primary }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-mono text-white">
                  {schema.name || 'Facility Schema View'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  3D VIRTUAL TWIN
                </span>
                {schema.organizationName && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {schema.organizationName}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-gray-400 flex items-center gap-2">
                <span>
                  {records.length} records mapped across {schema.nodes.length} 3D rooms/zones &middot;{' '}
                  {SECURITY_ALGORITHMS.display}
                </span>
                {schema.facilityAddress && (
                  <span className="text-cyan-300 flex items-center gap-1">
                    <MapPin size={10} /> {schema.facilityAddress}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Floor Switcher Pills */}
          {schema.floors.length > 1 && (
            <div className="flex items-center gap-1 bg-black/70 p-1 rounded-xl border border-white/10">
              {schema.floors.map((fl) => {
                const active = fl.id === activeFloor.id;
                return (
                  <button
                    key={fl.id}
                    onClick={() => setActiveFloorId(fl.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                      active ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
                    }`}
                    style={
                      active
                        ? {
                            background: `rgba(${wsColor.rgb}, 0.22)`,
                            border: `1px solid ${wsColor.primary}`,
                            color: wsColor.primary,
                          }
                        : {}
                    }
                  >
                    {fl.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Controls: Search, 2D/3D Toggle, Multi-Floor Stack, Generate Image, Edit Schema */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Locate record or room..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-black/80 border border-white/15 text-xs font-mono text-white placeholder-gray-500 w-44 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIs3D(!is3D)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all"
            style={
              is3D
                ? {
                    background: `rgba(${wsColor.rgb}, 0.18)`,
                    borderColor: wsColor.primary,
                    color: wsColor.primary,
                    boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.25)`,
                  }
                : {
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    color: '#9ca3af',
                  }
            }
          >
            <Box size={14} />
            {is3D ? '3D Virtual Space' : '2D Floorplan'}
          </button>

          {is3D && schema.floors.length > 1 && (
            <button
              onClick={() => setMultiFloorStack3D((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center gap-1 ${
                multiFloorStack3D
                  ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Stack All Facility Floors Vertically in 3D"
            >
              <Layers size={13} />
              3D Stack
            </button>
          )}

          <button
            onClick={() => setShowRadarPulse(!showRadarPulse)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center gap-1 ${
              showRadarPulse
                ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
            title="Toggle Live Glow Motion Effects"
          >
            <Activity size={13} />
            Glow FX
          </button>

          <div className="flex items-center gap-1 bg-black/80 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.55, +(z - 0.12).toFixed(2)))}
              className="p-1 text-gray-400 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono text-gray-300 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.85, +(z + 0.12).toFixed(2)))}
              className="p-1 text-gray-400 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => {
                setTilt(schema.defaultTiltAngle ?? 54);
                setRotation(schema.defaultRotationAngle ?? -22);
                setZoom(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1 text-gray-400 hover:text-white rounded"
              title="Reset 3D Virtual Camera"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Generate Facility Layout Image Button */}
          <button
            onClick={() => setShowImageGenerator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            title="Generate High-Resolution 3D or 2D Blueprint Image of Facility"
          >
            <ImageIcon size={13} />
            Generate Layout Image
          </button>

          {onOpenTemplateBuilder && (
            <button
              onClick={onOpenTemplateBuilder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all hover:scale-[1.02]"
              style={{
                background: `rgba(${wsColor.rgb}, 0.15)`,
                borderColor: `rgba(${wsColor.rgb}, 0.45)`,
                color: wsColor.primary,
              }}
            >
              <Sliders size={13} />
              3D Facility Builder
            </button>
          )}
        </div>
      </div>

      {/* Main Facility Digital Twin Viewport + Right Frosted Translucent Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left/Center 3D Physical Schema Viewport */}
        <div className="lg:col-span-8">
          <div
            ref={viewportRef}
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onMouseLeave={handleViewportMouseUp}
            onWheel={handleViewportWheel}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative rounded-2xl bg-black/90 backdrop-blur-2xl border overflow-hidden h-[580px] flex items-center justify-center select-none ${
              cameraDragState ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              perspective: '1400px',
              borderColor: `rgba(${wsColor.rgb}, 0.35)`,
              background:
                'radial-gradient(circle at 50% 45%, rgba(10, 18, 36, 0.96), rgba(2, 4, 10, 1))',
              boxShadow: `0 25px 70px rgba(0,0,0,0.95), inset 0 0 60px rgba(${wsColor.rgb}, 0.07)`,
            }}
          >
            {/* Ambient Cyber Grid Scanline Effect */}
            {showRadarPulse && (
              <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  background: `radial-gradient(circle at 50% 50%, rgba(${wsColor.rgb}, 0.18), transparent 65%)`,
                }}
              />
            )}

            {/* Top-Left 3D Camera Orbit & Presets Overlay */}
            {is3D && (
              <div
                data-facility-interactive="true"
                className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-xl border border-white/15 text-[10px] font-mono text-gray-300 shadow-2xl"
              >
                <div className="flex items-center gap-1 text-cyan-300 font-bold">
                  <Compass size={12} />
                  <span>3D ORBIT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Pitch:</span>
                  <input
                    type="range"
                    min={0}
                    max={75}
                    value={tilt}
                    onChange={(e) => setTilt(Number(e.target.value))}
                    className="w-14 accent-cyan-400"
                  />
                  <span className="w-7">{tilt}°</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Yaw:</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-16 accent-cyan-400"
                  />
                  <span className="w-9">{rotation}°</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Iso', p: 54, y: -22 },
                    { label: 'Walk', p: 72, y: -12 },
                    { label: 'North', p: 50, y: 0 },
                    { label: 'East', p: 50, y: -90 },
                    { label: 'Top', p: 0, y: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setTilt(preset.p);
                        setRotation(preset.y);
                      }}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] text-gray-300 border border-white/10"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top-Right Wall Cutaway Mode Bar */}
            {is3D && (
              <div
                data-facility-interactive="true"
                className="absolute top-3 right-3 z-30 flex items-center gap-1 px-2 py-1 rounded-xl bg-black/85 backdrop-blur-xl border border-white/15 text-[10px] font-mono"
              >
                <Eye size={11} className="text-cyan-400 mr-1" />
                {(
                  [
                    { id: 'full', label: 'Full Walls' },
                    { id: 'cutaway', label: 'Cutaway' },
                    { id: 'xray', label: 'X-Ray' },
                    { id: 'wireframe', label: 'Wireframe' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setWallCutawayMode(m.id)}
                    className={`px-2 py-0.5 rounded-lg transition-all ${
                      wallCutawayMode === m.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* 3D Transformed Facility World Container */}
            <div
              className="relative w-[88%] h-[82%] transition-transform duration-150"
              style={{
                transformStyle: 'preserve-3d',
                transform: is3D
                  ? `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${
                      zoom * 0.86
                    }) rotateX(${tilt}deg) rotateZ(${rotation}deg)`
                  : `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoom})`,
              }}
            >
              {is3D && multiFloorStack3D && schema.floors.length > 1
                ? schema.floors.map((fl, fIdx) => {
                    const fNodes = schema.nodes.filter(
                      (n) =>
                        n.floorId === fl.id || (!n.floorId && fIdx === 0)
                    );
                    const fWalls = (schema.walls || []).filter(
                      (w) =>
                        w.floorId === fl.id || (!w.floorId && fIdx === 0)
                    );
                    return renderFloorPlane(
                      fl,
                      fNodes,
                      fWalls,
                      fIdx * 95,
                      fl.id === activeFloor.id
                    );
                  })
                : renderFloorPlane(
                    activeFloor,
                    floorNodes,
                    floorWalls,
                    0,
                    true
                  )}
            </div>

            {/* Bottom Floating Navigation Hint */}
            <div className="absolute bottom-2.5 inset-x-4 flex items-center justify-between text-[10px] font-mono text-gray-400 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-black/75 border border-white/10">
                Drag background to Orbit 3D &middot; Shift+Drag to Pan &middot; Scroll to Zoom &middot; Click any 3D room to inspect records
              </span>
              {activeBlueprintUrl && (
                <span className="px-2.5 py-1 rounded-lg bg-black/75 border border-white/10 text-cyan-300">
                  Blueprint Underlay Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Frosted Black Translucent Zone & Record Inspector Pane */}
        <div className="lg:col-span-4">
          <div
            className="rounded-2xl p-4 bg-black/80 backdrop-blur-2xl border h-[580px] flex flex-col"
            style={{
              borderColor: `rgba(${wsColor.rgb}, 0.35)`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.85), 0 0 25px rgba(${wsColor.rgb}, 0.1)`,
            }}
          >
            {selectedNode ? (
              <>
                <div className="pb-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                      style={{
                        background: `${selectedNode.color || wsColor.primary}25`,
                        color: selectedNode.color || wsColor.primary,
                        border: `1px solid ${selectedNode.color || wsColor.primary}50`,
                      }}
                    >
                      {selectedNode.code} &middot; {selectedNode.type.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {selectedNodeRecords.length} / {selectedNode.capacity || 20} Units
                    </span>
                  </div>
                  <h4 className="text-base font-bold font-mono text-white mt-1.5">
                    {selectedNode.label}
                  </h4>
                  {selectedNode.description && (
                    <p className="text-xs font-mono text-gray-400 mt-0.5">
                      {selectedNode.description}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] font-mono text-gray-400">
                    <div className="px-2 py-1 rounded bg-white/[0.03] border border-white/10">
                      Footprint: <span className="text-white">{selectedNode.width}×{selectedNode.height}m</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-white/[0.03] border border-white/10">
                      3D Wall: <span className="text-cyan-300">{selectedNode.elevationHeight || 42}px</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-white/[0.03] border border-white/10">
                      Area: <span className="text-emerald-300">{Math.round(selectedNode.width * selectedNode.height * 6.5)} sq ft</span>
                    </div>
                  </div>
                </div>

                {/* Records Inside This Physical Zone */}
                <div className="flex items-center justify-between my-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    Records Located in Room ({selectedNodeRecords.length})
                  </span>
                  {locationField && (
                    <span className="text-[10px] font-mono text-gray-500">
                      Bound to: {getFieldLabel(locationField)}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {selectedNodeRecords.length > 0 ? (
                    selectedNodeRecords.map((rec, idx) => {
                      const title = getRecordTitle(rec, idx);
                      const status = getRecordStatusInfo(rec);
                      const data = rec.data || rec;
                      const metricVal = metricField
                        ? safeText(data[metricField.id] ?? data[metricField.name])
                        : '';

                      return (
                        <div
                          key={rec.id || idx}
                          onClick={() => onSelectRecord(rec)}
                          className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 cursor-pointer transition-all group"
                          style={{
                            boxShadow: `0 4px 16px rgba(0,0,0,0.5)`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-bold text-white group-hover:underline truncate">
                                {title}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold"
                                  style={{
                                    background: `${status.color}20`,
                                    color: status.color,
                                    border: `1px solid ${status.color}40`,
                                  }}
                                >
                                  {status.label}
                                </span>
                                {metricVal && (
                                  <span className="text-[10px] font-mono text-gray-300">
                                    {getFieldLabel(metricField)}: <strong>{metricVal}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                            <ExternalLink
                              size={13}
                              className="text-gray-500 group-hover:text-white flex-shrink-0 mt-0.5"
                            />
                          </div>

                          {/* Preview up to 2 additional fields */}
                          <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-2 gap-1.5 text-[10px] font-mono text-gray-400">
                            {fields
                              .filter(
                                (f) =>
                                  f.id !== titleField?.id &&
                                  f.id !== statusField?.id &&
                                  safeText(data[f.id] ?? data[f.name])
                              )
                              .slice(0, 2)
                              .map((f) => (
                                <div key={f.id} className="truncate">
                                  <span className="text-gray-600">{getFieldLabel(f)}: </span>
                                  <span className="text-gray-300">
                                    {safeText(data[f.id] ?? data[f.name])}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-center text-gray-500 font-mono text-xs px-4">
                      <Box size={24} className="mb-2 opacity-40" />
                      No records currently assigned to <strong>{selectedNode.code}</strong>.
                      <span className="text-[10px] text-gray-600 mt-1">
                        Set a record&apos;s location field to &ldquo;
                        {selectedNode.linkedFieldValue || selectedNode.code}&rdquo; to place it here.
                      </span>
                    </div>
                  )}
                </div>

                {/* Zone Footer Summary */}
                <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Shield size={11} />
                    PQC Encrypted 3D Room
                  </span>
                  <span>
                    Coords: ({selectedNode.x}%, {selectedNode.y}%)
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* High-Resolution 3D / 2D Facility Layout Image Generator Modal */}
      <FacilityImageGeneratorModal
        isOpen={showImageGenerator}
        onClose={() => setShowImageGenerator(false)}
        schema={schema}
        activeFloorId={activeFloor.id}
        wsColor={wsColor}
        recordsByNodeId={recordsByNodeId}
        initialPitch={tilt}
        initialYaw={rotation}
      />
    </div>
  );
};

export default FacilityLayoutView;
