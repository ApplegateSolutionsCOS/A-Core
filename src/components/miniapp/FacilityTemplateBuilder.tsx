import React, { useState, useRef } from 'react';
import {
  FacilityTemplateConfig,
  FacilityZoneNode,
  FacilityFloorSchema,
  FacilityWallSegment,
  FormField,
} from '@/types';
import { sha512SyncHex, SECURITY_ALGORITHMS } from '@/lib/encryption';
import FacilityImageGeneratorModal from './FacilityImageGeneratorModal';
import {
  Building2,
  Layers,
  Plus,
  Trash2,
  Upload,
  Download,
  Move,
  Box,
  Eye,
  Grid,
  Cpu,
  Server,
  Shield,
  Camera,
  Radio,
  Truck,
  DoorOpen,
  Briefcase,
  Sparkles,
  RotateCw,
  RotateCcw,
  Sliders,
  Check,
  FileCode,
  Image as ImageIcon,
  Maximize2,
  Compass,
  ZoomIn,
  ZoomOut,
  MapPin,
  Copy,
} from 'lucide-react';

interface FacilityTemplateBuilderProps {
  value?: FacilityTemplateConfig;
  onChange: (updated: FacilityTemplateConfig) => void;
  fields: FormField[];
  wsColor: { primary: string; secondary?: string; rgb: string };
  appName?: string;
}

export const DEFAULT_FACILITY_PRESETS: Record<string, FacilityTemplateConfig> = {
  'cyber-datacenter': {
    name: 'Q-CORE Cyber Data Center & Vault',
    presetType: 'cyber-datacenter',
    facilityAddress: 'Ashburn, VA 20147',
    organizationName: 'Primary Cyber Operations Division',
    gridColumns: 24,
    gridRows: 16,
    showGrid: true,
    default3DMode: true,
    defaultTiltAngle: 54,
    defaultRotationAngle: -22,
    wallCutawayMode: 'full',
    multiFloorStack3D: false,
    blueprintOpacity: 0.45,
    floors: [
      { id: 'floor-1', name: 'Level 01 — Primary Server Hall', level: 1 },
      { id: 'floor-2', name: 'Sub-Level B1 — Quantum Cold Vault', level: 0 },
    ],
    walls: [
      { id: 'w-1', x1: 4, y1: 4, x2: 96, y2: 4, thickness: 3, height: 42, floorId: 'floor-1' },
      { id: 'w-2', x1: 96, y1: 4, x2: 96, y2: 94, thickness: 3, height: 42, floorId: 'floor-1' },
      { id: 'w-3', x1: 4, y1: 94, x2: 96, y2: 94, thickness: 3, height: 42, floorId: 'floor-1' },
      { id: 'w-4', x1: 4, y1: 4, x2: 4, y2: 94, thickness: 3, height: 42, floorId: 'floor-1' },
      { id: 'w-5', x1: 35, y1: 4, x2: 35, y2: 65, thickness: 2, height: 34, floorId: 'floor-1' },
      { id: 'w-6', x1: 68, y1: 4, x2: 68, y2: 94, thickness: 2, height: 34, floorId: 'floor-1' },
    ],
    nodes: [
      {
        id: 'node-noc',
        label: 'NOC Command Bridge',
        code: 'NOC-01',
        type: 'room',
        x: 6,
        y: 7,
        width: 27,
        height: 28,
        elevationHeight: 42,
        doorPosition: 'south',
        windowWall: 'east',
        interiorProp: 'conference',
        color: '#00f0ff',
        floorId: 'floor-1',
        capacity: 12,
        linkedFieldValue: 'NOC-01',
        description: '24/7 Network & Security Operations Bridge',
      },
      {
        id: 'node-vault',
        label: 'ML-KEM-1024 Key Vault',
        code: 'VAULT-A',
        type: 'vault',
        x: 6,
        y: 38,
        width: 27,
        height: 25,
        elevationHeight: 52,
        doorPosition: 'east',
        windowWall: 'none',
        interiorProp: 'vault-core',
        color: '#10b981',
        floorId: 'floor-1',
        capacity: 4,
        linkedFieldValue: 'VAULT-A',
        description: 'HSM & Post-Quantum Cryptographic Key Enclave',
      },
      {
        id: 'node-rack-a1',
        label: 'Rack Pod Alpha-01',
        code: 'RACK-A1',
        type: 'rack',
        x: 38,
        y: 9,
        width: 12,
        height: 22,
        elevationHeight: 56,
        doorPosition: 'south',
        interiorProp: 'racks',
        color: '#3b82f6',
        floorId: 'floor-1',
        capacity: 42,
        linkedFieldValue: 'RACK-A1',
      },
      {
        id: 'node-rack-a2',
        label: 'Rack Pod Alpha-02',
        code: 'RACK-A2',
        type: 'rack',
        x: 53,
        y: 9,
        width: 12,
        height: 22,
        elevationHeight: 56,
        doorPosition: 'south',
        interiorProp: 'racks',
        color: '#8b5cf6',
        floorId: 'floor-1',
        capacity: 42,
        linkedFieldValue: 'RACK-A2',
      },
      {
        id: 'node-rack-b1',
        label: 'AI Compute Cluster B1',
        code: 'RACK-B1',
        type: 'rack',
        x: 38,
        y: 36,
        width: 27,
        height: 24,
        elevationHeight: 60,
        doorPosition: 'south',
        interiorProp: 'racks',
        color: '#ec4899',
        floorId: 'floor-1',
        capacity: 64,
        linkedFieldValue: 'RACK-B1',
      },
      {
        id: 'node-power',
        label: 'HV Power & Cryo Cooling',
        code: 'PWR-01',
        type: 'zone',
        x: 71,
        y: 8,
        width: 22,
        height: 44,
        elevationHeight: 44,
        doorPosition: 'west',
        color: '#f59e0b',
        floorId: 'floor-1',
        capacity: 8,
        linkedFieldValue: 'PWR-01',
      },
      {
        id: 'node-dock',
        label: 'Secure Airlock & Receiving',
        code: 'DOCK-01',
        type: 'dock',
        x: 71,
        y: 56,
        width: 22,
        height: 34,
        elevationHeight: 34,
        doorPosition: 'south',
        interiorProp: 'conveyor',
        color: '#06b6d4',
        floorId: 'floor-1',
        capacity: 20,
        linkedFieldValue: 'DOCK-01',
      },
      {
        id: 'node-corridor',
        label: 'Main Security Spine',
        code: 'COR-01',
        type: 'corridor',
        x: 6,
        y: 67,
        width: 59,
        height: 23,
        elevationHeight: 20,
        doorPosition: 'east',
        color: '#64748b',
        floorId: 'floor-1',
        capacity: 50,
        linkedFieldValue: 'COR-01',
      },
      // Sub-level B1 default node so Multi-Floor 3D Stack looks rich out of the box
      {
        id: 'node-b1-cryo',
        label: 'Sub-Level Cryo Quantum Core',
        code: 'CRYO-B1',
        type: 'vault',
        x: 18,
        y: 20,
        width: 48,
        height: 45,
        elevationHeight: 48,
        doorPosition: 'south',
        interiorProp: 'vault-core',
        color: '#00f0ff',
        floorId: 'floor-2',
        capacity: 16,
        linkedFieldValue: 'CRYO-B1',
      },
    ],
  },
  'smart-warehouse': {
    name: 'Smart Fulfillment & Logistics Hub',
    presetType: 'smart-warehouse',
    facilityAddress: 'Dallas, TX 75201',
    organizationName: 'Central Logistics Subsidiary',
    gridColumns: 24,
    gridRows: 16,
    showGrid: true,
    default3DMode: true,
    defaultTiltAngle: 50,
    defaultRotationAngle: -18,
    blueprintOpacity: 0.45,
    floors: [
      { id: 'floor-1', name: 'Main Warehouse Floor', level: 1 },
      { id: 'floor-2', name: 'Mezzanine Control & QA', level: 2 },
    ],
    walls: [
      { id: 'w-1', x1: 3, y1: 5, x2: 97, y2: 5, thickness: 3, height: 42, floorId: 'floor-1' },
      { id: 'w-2', x1: 97, y1: 5, x2: 97, y2: 95, thickness: 3, height: 42, floorId: 'floor-1' },
      { id: 'w-3', x1: 3, y1: 95, x2: 97, y2: 95, thickness: 3, height: 42, floorId: 'floor-1' },
      { id: 'w-4', x1: 3, y1: 5, x2: 3, y2: 95, thickness: 3, height: 42, floorId: 'floor-1' },
    ],
    nodes: [
      { id: 'wh-inbound', label: 'Inbound Receiving Bays 1-4', code: 'BAY-IN', type: 'dock', x: 6, y: 8, width: 24, height: 38, elevationHeight: 34, doorPosition: 'west', interiorProp: 'conveyor', color: '#0ea5e9', floorId: 'floor-1', capacity: 100, linkedFieldValue: 'BAY-IN' },
      { id: 'wh-outbound', label: 'Outbound Dispatch Bays 5-8', code: 'BAY-OUT', type: 'dock', x: 6, y: 50, width: 24, height: 40, elevationHeight: 34, doorPosition: 'west', interiorProp: 'conveyor', color: '#10b981', floorId: 'floor-1', capacity: 100, linkedFieldValue: 'BAY-OUT' },
      { id: 'wh-aisle-a', label: 'High-Bay Pallet Rack A', code: 'AISLE-A', type: 'rack', x: 34, y: 8, width: 18, height: 55, elevationHeight: 64, doorPosition: 'south', interiorProp: 'racks', color: '#f59e0b', floorId: 'floor-1', capacity: 250, linkedFieldValue: 'AISLE-A' },
      { id: 'wh-aisle-b', label: 'High-Bay Pallet Rack B', code: 'AISLE-B', type: 'rack', x: 55, y: 8, width: 18, height: 55, elevationHeight: 64, doorPosition: 'south', interiorProp: 'racks', color: '#8b5cf6', floorId: 'floor-1', capacity: 250, linkedFieldValue: 'AISLE-B' },
      { id: 'wh-cold', label: 'Climate Controlled Vault', code: 'COLD-01', type: 'vault', x: 76, y: 8, width: 18, height: 42, elevationHeight: 50, doorPosition: 'west', interiorProp: 'vault-core', color: '#06b6d4', floorId: 'floor-1', capacity: 80, linkedFieldValue: 'COLD-01' },
      { id: 'wh-pack', label: 'Automated Packing & QA', code: 'PACK-01', type: 'workstation', x: 34, y: 67, width: 39, height: 23, elevationHeight: 30, doorPosition: 'north', interiorProp: 'desks', color: '#ec4899', floorId: 'floor-1', capacity: 45, linkedFieldValue: 'PACK-01' },
      { id: 'wh-office', label: 'Logistics Dispatch Office', code: 'OPS-01', type: 'office', x: 76, y: 54, width: 18, height: 36, elevationHeight: 38, doorPosition: 'west', windowWall: 'north', interiorProp: 'conference', color: '#22c55e', floorId: 'floor-1', capacity: 15, linkedFieldValue: 'OPS-01' },
    ],
  },
  'executive-hq': {
    name: 'Executive Operations Campus Floorplan',
    presetType: 'executive-hq',
    facilityAddress: 'New York, NY 10001',
    organizationName: 'Global Executive Headquarters',
    gridColumns: 24,
    gridRows: 16,
    showGrid: true,
    default3DMode: true,
    defaultTiltAngle: 48,
    defaultRotationAngle: -16,
    blueprintOpacity: 0.45,
    floors: [
      { id: 'floor-1', name: 'Executive Suite & War Room', level: 1 },
    ],
    walls: [
      { id: 'w-1', x1: 5, y1: 5, x2: 95, y2: 5, thickness: 3, height: 40, floorId: 'floor-1' },
      { id: 'w-2', x1: 95, y1: 5, x2: 95, y2: 95, thickness: 3, height: 40, floorId: 'floor-1' },
      { id: 'w-3', x1: 5, y1: 95, x2: 95, y2: 95, thickness: 3, height: 40, floorId: 'floor-1' },
      { id: 'w-4', x1: 5, y1: 5, x2: 5, y2: 95, thickness: 3, height: 40, floorId: 'floor-1' },
    ],
    nodes: [
      { id: 'hq-board', label: 'Boardroom & Strategy Theater', code: 'BOARD-01', type: 'room', x: 8, y: 8, width: 36, height: 36, elevationHeight: 42, doorPosition: 'south', windowWall: 'north', interiorProp: 'conference', color: '#3b82f6', floorId: 'floor-1', capacity: 24, linkedFieldValue: 'BOARD-01' },
      { id: 'hq-exec', label: 'Executive Offices North', code: 'EXEC-N', type: 'office', x: 47, y: 8, width: 45, height: 26, elevationHeight: 40, doorPosition: 'south', windowWall: 'north', interiorProp: 'desks', color: '#a855f7', floorId: 'floor-1', capacity: 10, linkedFieldValue: 'EXEC-N' },
      { id: 'hq-bullpen', label: 'Engineering & Product Bullpen', code: 'ENG-01', type: 'workstation', x: 8, y: 48, width: 54, height: 42, elevationHeight: 30, doorPosition: 'east', windowWall: 'south', interiorProp: 'desks', color: '#00f0ff', floorId: 'floor-1', capacity: 60, linkedFieldValue: 'ENG-01' },
      { id: 'hq-sec', label: 'SCIF / Secure Comms Room', code: 'SCIF-01', type: 'vault', x: 65, y: 38, width: 27, height: 26, elevationHeight: 48, doorPosition: 'west', interiorProp: 'vault-core', color: '#10b981', floorId: 'floor-1', capacity: 8, linkedFieldValue: 'SCIF-01' },
      { id: 'hq-lobby', label: 'Reception & Biometric Gate', code: 'LOBBY-01', type: 'corridor', x: 65, y: 68, width: 27, height: 22, elevationHeight: 26, doorPosition: 'south', color: '#f59e0b', floorId: 'floor-1', capacity: 30, linkedFieldValue: 'LOBBY-01' },
    ],
  },
};

export const NODE_TYPE_META: Record<
  FacilityZoneNode['type'],
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  room: { label: 'Room / Chamber', color: '#00f0ff', icon: DoorOpen },
  zone: { label: 'Operational Zone', color: '#f59e0b', icon: Grid },
  rack: { label: 'Server / Storage Rack', color: '#3b82f6', icon: Server },
  workstation: { label: 'Workstation Pod', color: '#ec4899', icon: Cpu },
  dock: { label: 'Loading / Airlock Bay', color: '#06b6d4', icon: Truck },
  sensor: { label: 'Telemetry Sensor Node', color: '#a855f7', icon: Radio },
  camera: { label: 'Optical / Thermal Cam', color: '#ef4444', icon: Camera },
  corridor: { label: 'Corridor / Conduit', color: '#64748b', icon: Move },
  vault: { label: 'Q-CORE Secure Vault', color: '#10b981', icon: Shield },
  office: { label: 'Command Office', color: '#22c55e', icon: Briefcase },
};

export const FacilityTemplateBuilder: React.FC<FacilityTemplateBuilderProps> = ({
  value,
  onChange,
  fields,
  wsColor,
  appName,
}) => {
  const config: FacilityTemplateConfig =
    value && value.nodes?.length
      ? value
      : {
          ...DEFAULT_FACILITY_PRESETS['cyber-datacenter'],
          name: `${appName || 'MiniApp'} Facility Schema`,
        };

  const [activeFloorId, setActiveFloorId] = useState<string>(
    config.floors?.[0]?.id || 'floor-1'
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    config.nodes?.[0]?.id || null
  );
  const [preview3D, setPreview3D] = useState<boolean>(config.default3DMode ?? true);
  const [tiltAngle, setTiltAngle] = useState<number>(config.defaultTiltAngle ?? 54);
  const [rotationAngle, setRotationAngle] = useState<number>(config.defaultRotationAngle ?? -22);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [wallCutawayMode, setWallCutawayMode] = useState<'full' | 'cutaway' | 'xray' | 'wireframe'>(
    config.wallCutawayMode || 'full'
  );
  const [multiFloorStack, setMultiFloorStack] = useState<boolean>(
    config.multiFloorStack3D ?? false
  );
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [cameraToolMode, setCameraToolMode] = useState<'manipulate' | 'orbit' | 'pan'>('manipulate');

  // Interactive node manipulation states
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [extrudingNodeId, setExtrudingNodeId] = useState<string | null>(null);
  const [extrudeStart, setExtrudeStart] = useState<{ startY: number; startH: number }>({
    startY: 0,
    startH: 36,
  });

  // Orbit / Pan camera drag state
  const [isOrbitDragging, setIsOrbitDragging] = useState<boolean>(false);
  const [isPanDragging, setIsPanDragging] = useState<boolean>(false);
  const cameraDragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startTilt: number;
    startRot: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const [drawingWallMode, setDrawingWallMode] = useState<boolean>(false);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [showImageGenerator, setShowImageGenerator] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const blueprintInputRef = useRef<HTMLInputElement>(null);
  const schemaJsonInputRef = useRef<HTMLInputElement>(null);

  const activeFloor: FacilityFloorSchema =
    config.floors.find((f) => f.id === activeFloorId) ||
    config.floors[0] || { id: 'floor-1', name: 'Level 01', level: 1 };

  const floorNodes = config.nodes.filter(
    (n) => !n.floorId || n.floorId === activeFloor.id
  );
  const floorWalls = (config.walls || []).filter(
    (w) => !w.floorId || w.floorId === activeFloor.id
  );
  const selectedNode = config.nodes.find((n) => n.id === selectedNodeId) || null;

  const updateConfig = (partial: Partial<FacilityTemplateConfig>) => {
    onChange({
      ...config,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleLoadPreset = (presetKey: string) => {
    const preset = DEFAULT_FACILITY_PRESETS[presetKey];
    if (!preset) return;
    const nextConfig: FacilityTemplateConfig = {
      ...preset,
      locationMatchFieldId: config.locationMatchFieldId,
      statusFieldId: config.statusFieldId,
      titleFieldId: config.titleFieldId,
      metricFieldId: config.metricFieldId,
      updatedAt: new Date().toISOString(),
    };
    onChange(nextConfig);
    setActiveFloorId(nextConfig.floors[0]?.id || 'floor-1');
    setSelectedNodeId(nextConfig.nodes[0]?.id || null);
  };

  const handleAddNode = (type: FacilityZoneNode['type'] = 'room') => {
    const meta = NODE_TYPE_META[type];
    const idx = config.nodes.length + 1;
    const isCompact = type === 'sensor' || type === 'camera';
    const newNode: FacilityZoneNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `${meta.label.split(' ')[0]} ${idx}`,
      code: `${type.toUpperCase().slice(0, 4)}-${String(idx).padStart(2, '0')}`,
      type,
      x: Math.min(75, 12 + ((idx * 9) % 60)),
      y: Math.min(75, 12 + ((idx * 11) % 55)),
      width: isCompact ? 8 : 20,
      height: isCompact ? 8 : 20,
      elevationHeight: isCompact ? 22 : type === 'rack' ? 58 : type === 'vault' ? 50 : 40,
      doorPosition: isCompact ? 'none' : 'south',
      windowWall: type === 'office' || type === 'room' ? 'north' : 'none',
      interiorProp: 'auto',
      color: meta.color,
      floorId: activeFloor.id,
      capacity: isCompact ? 1 : 20,
      linkedFieldValue: `${type.toUpperCase().slice(0, 4)}-${String(idx).padStart(2, '0')}`,
    };
    updateConfig({ nodes: [...config.nodes, newNode] });
    setSelectedNodeId(newNode.id);
  };

  const handleDuplicateNode = (node: FacilityZoneNode) => {
    const copy: FacilityZoneNode = {
      ...node,
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: `${node.label} (Copy)`,
      code: `${node.code}-B`,
      x: Math.min(100 - node.width, node.x + 4),
      y: Math.min(100 - node.height, node.y + 4),
    };
    updateConfig({ nodes: [...config.nodes, copy] });
    setSelectedNodeId(copy.id);
  };

  const handleUpdateNode = (nodeId: string, patch: Partial<FacilityZoneNode>) => {
    updateConfig({
      nodes: config.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = config.nodes.filter((n) => n.id !== nodeId);
    updateConfig({ nodes: nextNodes });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(nextNodes[0]?.id || null);
    }
  };

  const handleAddFloor = () => {
    const nextLevel = config.floors.length + 1;
    const newFloor: FacilityFloorSchema = {
      id: `floor-${Date.now()}`,
      name: `Level 0${nextLevel}`,
      level: nextLevel,
    };
    updateConfig({ floors: [...config.floors, newFloor] });
    setActiveFloorId(newFloor.id);
  };

  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.name.toLowerCase().endsWith('.svg')) {
      reader.onload = () => {
        const svgText = String(reader.result || '');
        const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
        updateConfig({
          blueprintImageUrl: dataUrl,
          blueprintSvgText: svgText,
          floors: config.floors.map((f) =>
            f.id === activeFloor.id
              ? { ...f, blueprintImageUrl: dataUrl, blueprintSvgText: svgText }
              : f
          ),
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        updateConfig({
          blueprintImageUrl: dataUrl,
          floors: config.floors.map((f) =>
            f.id === activeFloor.id ? { ...f, blueprintImageUrl: dataUrl } : f
          ),
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleExportSchemaJson = () => {
    const payloadStr = JSON.stringify(config, null, 2);
    const sha512Seal = sha512SyncHex(payloadStr);
    const exportBundle = {
      _acoreSchemaType: 'FACILITY_PHYSICAL_TEMPLATE_V2_3D',
      _encryptionStandard: SECURITY_ALGORITHMS.display,
      _sha512IntegritySeal: sha512Seal,
      exportedAt: new Date().toISOString(),
      facilityTemplate: config,
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(config.name || 'facility_schema').replace(/\s+/g, '_').toLowerCase()}.facility.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSchemaJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const imported: FacilityTemplateConfig = parsed.facilityTemplate || parsed;
        if (imported && Array.isArray(imported.nodes)) {
          onChange({
            ...imported,
            updatedAt: new Date().toISOString(),
          });
          if (imported.floors?.[0]?.id) setActiveFloorId(imported.floors[0].id);
          if (imported.nodes?.[0]?.id) setSelectedNodeId(imported.nodes[0].id);
        }
      } catch (err) {
        console.error('Failed to parse Facility Schema JSON:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Interactive Canvas Pointer Handlers
  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 50, y: 50 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const snapValue = (v: number): number => {
    if (!snapToGrid) return Math.round(v);
    return Math.round(v / 2) * 2;
  };

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (drawingWallMode) {
      const pt = getCanvasCoords(e);
      if (!wallStart) {
        setWallStart(pt);
      } else {
        const newWall: FacilityWallSegment = {
          id: `wall-${Date.now()}`,
          x1: wallStart.x,
          y1: wallStart.y,
          x2: pt.x,
          y2: pt.y,
          thickness: 3,
          height: 40,
          floorId: activeFloor.id,
        };
        updateConfig({ walls: [...(config.walls || []), newWall] });
        setWallStart(null);
      }
      return;
    }

    // Start 3D camera orbit or pan when clicking empty space or using orbit/pan tool
    if (e.button === 2 || e.shiftKey || cameraToolMode === 'pan') {
      setIsPanDragging(true);
    } else if (preview3D) {
      setIsOrbitDragging(true);
    }
    cameraDragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startTilt: tiltAngle,
      startRot: rotationAngle,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
  };

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    // 1. 3D Room Vertical Wall Extrusion Drag
    if (extrudingNodeId) {
      const dy = extrudeStart.startY - e.clientY;
      const nextHeight = Math.max(12, Math.min(120, Math.round(extrudeStart.startH + dy * 0.6)));
      handleUpdateNode(extrudingNodeId, { elevationHeight: nextHeight });
      return;
    }

    // 2. Room Move or Resize Drag
    if (draggingNodeId || resizingNodeId) {
      const pt = getCanvasCoords(e);
      if (draggingNodeId) {
        const target = config.nodes.find((n) => n.id === draggingNodeId);
        if (!target) return;
        const nx = Math.max(0, Math.min(100 - target.width, snapValue(pt.x - dragOffset.dx)));
        const ny = Math.max(0, Math.min(100 - target.height, snapValue(pt.y - dragOffset.dy)));
        handleUpdateNode(draggingNodeId, { x: nx, y: ny });
      } else if (resizingNodeId) {
        const target = config.nodes.find((n) => n.id === resizingNodeId);
        if (!target) return;
        const nw = Math.max(5, Math.min(100 - target.x, snapValue(pt.x - target.x)));
        const nh = Math.max(5, Math.min(100 - target.y, snapValue(pt.y - target.y)));
        handleUpdateNode(resizingNodeId, { width: nw, height: nh });
      }
      return;
    }

    // 3. 3D Virtual Camera Orbit or Pan Drag
    if ((isOrbitDragging || isPanDragging) && cameraDragStartRef.current) {
      const dx = e.clientX - cameraDragStartRef.current.clientX;
      const dy = e.clientY - cameraDragStartRef.current.clientY;
      if (isPanDragging) {
        setPanOffset({
          x: Math.max(-240, Math.min(240, cameraDragStartRef.current.startPanX + dx)),
          y: Math.max(-180, Math.min(180, cameraDragStartRef.current.startPanY + dy)),
        });
      } else if (isOrbitDragging) {
        const nextRot = Math.max(
          -180,
          Math.min(180, Math.round(cameraDragStartRef.current.startRot + dx * 0.45))
        );
        const nextTilt = Math.max(
          0,
          Math.min(76, Math.round(cameraDragStartRef.current.startTilt - dy * 0.35))
        );
        setRotationAngle(nextRot);
        setTiltAngle(nextTilt);
      }
    }
  };

  const handleViewportMouseUp = () => {
    setDraggingNodeId(null);
    setResizingNodeId(null);
    setExtrudingNodeId(null);
    if (isOrbitDragging) {
      updateConfig({ defaultTiltAngle: tiltAngle, defaultRotationAngle: rotationAngle });
    }
    setIsOrbitDragging(false);
    setIsPanDragging(false);
    cameraDragStartRef.current = null;
  };

  const activeBlueprintUrl =
    activeFloor.blueprintImageUrl || config.blueprintImageUrl || '';

  // Determine which floors to render in the 3D viewport
  const renderedFloors: FacilityFloorSchema[] =
    preview3D && multiFloorStack && config.floors.length > 1
      ? [...config.floors].sort((a, b) => a.level - b.level)
      : [activeFloor];

  return (
    <div className="space-y-4">
      {/* Top Frosted Glass Command Header */}
      <div
        className="relative rounded-2xl p-4 bg-black/80 backdrop-blur-xl border overflow-hidden transition-all"
        style={{
          borderColor: `rgba(${wsColor.rgb}, 0.35)`,
          boxShadow: `0 12px 40px -10px rgba(0,0,0,0.85), 0 0 30px rgba(${wsColor.rgb}, 0.12)`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${wsColor.primary}, transparent)`,
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center border relative"
              style={{
                background: `rgba(${wsColor.rgb}, 0.12)`,
                borderColor: `rgba(${wsColor.rgb}, 0.4)`,
                boxShadow: `0 0 20px rgba(${wsColor.rgb}, 0.25)`,
              }}
            >
              <Building2 size={22} style={{ color: wsColor.primary }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold font-mono text-white tracking-wide">
                  3D VIRTUAL FACILITY MAP BUILDER
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border"
                  style={{
                    background: `rgba(${wsColor.rgb}, 0.12)`,
                    borderColor: `rgba(${wsColor.rgb}, 0.35)`,
                    color: wsColor.primary,
                  }}
                >
                  Interactive 3D Volumetric Environment
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Manipulate 3D volumetric rooms, extruded walls, doorways & multi-floor layouts in a virtual environment, or generate high-res layout images.
              </p>
            </div>
          </div>

          {/* Import / Export / Generate Image Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={blueprintInputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleBlueprintUpload}
            />
            <input
              ref={schemaJsonInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportSchemaJson}
            />

            <button
              type="button"
              onClick={() => setShowImageGenerator(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.28), rgba(${wsColor.rgb}, 0.12))`,
                borderColor: wsColor.primary,
                color: '#ffffff',
                boxShadow: `0 0 20px rgba(${wsColor.rgb}, 0.28)`,
              }}
            >
              <Camera size={14} style={{ color: wsColor.primary }} />
              Generate Layout Image
            </button>

            <button
              type="button"
              onClick={() => blueprintInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition-all hover:scale-[1.02]"
              style={{
                background: `rgba(${wsColor.rgb}, 0.12)`,
                borderColor: `rgba(${wsColor.rgb}, 0.4)`,
                color: wsColor.primary,
              }}
            >
              <Upload size={14} />
              Upload Floorplan
            </button>

            <button
              type="button"
              onClick={() => schemaJsonInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-gray-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              <FileCode size={14} />
              Import JSON
            </button>

            <button
              type="button"
              onClick={handleExportSchemaJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-gray-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              <Download size={14} />
              Export Schema
            </button>
          </div>
        </div>

        {/* Facility External Map Location & Presets Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-4 pt-3.5 border-t border-white/10">
          <div className="lg:col-span-5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mr-1">
              3D Facility Presets:
            </span>
            {[
              { id: 'cyber-datacenter', label: 'Data Center' },
              { id: 'smart-warehouse', label: 'Smart Warehouse' },
              { id: 'executive-hq', label: 'Executive HQ' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleLoadPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                  config.presetType === p.id
                    ? 'text-white font-semibold'
                    : 'text-gray-400 border-white/10 bg-black/50 hover:text-white'
                }`}
                style={
                  config.presetType === p.id
                    ? {
                        background: `rgba(${wsColor.rgb}, 0.2)`,
                        borderColor: wsColor.primary,
                        color: wsColor.primary,
                      }
                    : {}
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Facility Name, Sub-Organization & Physical Address for External Multi-Facility Map */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] font-mono uppercase text-gray-500 mb-0.5">
                Facility Name
              </label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g. Ashburn Data Center"
                className="w-full px-2.5 py-1 rounded-lg bg-black/80 border border-white/15 text-[11px] font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase text-gray-500 mb-0.5">
                Sub-Organization / Division
              </label>
              <input
                type="text"
                value={config.organizationName || ''}
                onChange={(e) => updateConfig({ organizationName: e.target.value })}
                placeholder="e.g. East Coast Subsidiary"
                className="w-full px-2.5 py-1 rounded-lg bg-black/80 border border-white/15 text-[11px] font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase text-gray-500 mb-0.5 flex items-center gap-1">
                <MapPin size={10} style={{ color: wsColor.primary }} />
                External Map Address / City
              </label>
              <input
                type="text"
                value={config.facilityAddress || ''}
                onChange={(e) => updateConfig({ facilityAddress: e.target.value })}
                placeholder="e.g. Austin, TX or 40.71, -74.00"
                className="w-full px-2.5 py-1 rounded-lg bg-black/80 border border-white/15 text-[11px] font-mono text-white"
              />
            </div>
          </div>
        </div>

        {/* Record Field Binding Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10">
          <div>
            <label className="block text-[9px] font-mono uppercase text-gray-500 mb-0.5">
              Zone/Room Match Field
            </label>
            <select
              value={config.locationMatchFieldId || ''}
              onChange={(e) => updateConfig({ locationMatchFieldId: e.target.value })}
              className="w-full px-2 py-1 rounded-lg bg-black/80 border border-white/15 text-[11px] font-mono text-white focus:outline-none"
            >
              <option value="">Auto-Match Any Field</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {(f as any).label || f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase text-gray-500 mb-0.5">
              Record Title Field
            </label>
            <select
              value={config.titleFieldId || ''}
              onChange={(e) => updateConfig({ titleFieldId: e.target.value })}
              className="w-full px-2 py-1 rounded-lg bg-black/80 border border-white/15 text-[11px] font-mono text-white focus:outline-none"
            >
              <option value="">First Text Field</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {(f as any).label || f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase text-gray-500 mb-0.5">
              Status Glow Field
            </label>
            <select
              value={config.statusFieldId || ''}
              onChange={(e) => updateConfig({ statusFieldId: e.target.value })}
              className="w-full px-2 py-1 rounded-lg bg-black/80 border border-white/15 text-[11px] font-mono text-white focus:outline-none"
            >
              <option value="">Auto Status</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {(f as any).label || f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase text-gray-500 mb-0.5">
              Telemetry Metric Field
            </label>
            <select
              value={config.metricFieldId || ''}
              onChange={(e) => updateConfig({ metricFieldId: e.target.value })}
              className="w-full px-2 py-1 rounded-lg bg-black/80 border border-white/15 text-[11px] font-mono text-white focus:outline-none"
            >
              <option value="">Record Count</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {(f as any).label || f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Builder Split View: Left Palette + Center 3D Virtual Environment + Right Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Palette: Floors, 3D Elements & Virtual Environment Controls */}
        <div className="lg:col-span-3 space-y-3">
          {/* Floor Switcher + Multi-Floor 3D Stack Toggle */}
          <div className="rounded-2xl p-3.5 bg-black/80 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Layers size={13} style={{ color: wsColor.primary }} />
                Facility Floors ({config.floors.length})
              </span>
              <button
                type="button"
                onClick={handleAddFloor}
                className="px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all"
                style={{
                  background: `rgba(${wsColor.rgb}, 0.12)`,
                  borderColor: `rgba(${wsColor.rgb}, 0.35)`,
                  color: wsColor.primary,
                }}
              >
                + Floor
              </button>
            </div>
            <div className="space-y-1.5">
              {config.floors.map((fl) => {
                const isCurrent = fl.id === activeFloor.id;
                const count = config.nodes.filter(
                  (n) => !n.floorId || n.floorId === fl.id
                ).length;
                return (
                  <div
                    key={fl.id}
                    onClick={() => setActiveFloorId(fl.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer border text-xs font-mono transition-all ${
                      isCurrent
                        ? 'text-white'
                        : 'text-gray-400 bg-white/[0.02] border-white/5 hover:border-white/15'
                    }`}
                    style={
                      isCurrent
                        ? {
                            background: `rgba(${wsColor.rgb}, 0.15)`,
                            borderColor: wsColor.primary,
                            boxShadow: `0 0 14px rgba(${wsColor.rgb}, 0.2)`,
                          }
                        : {}
                    }
                  >
                    <span className="truncate">{fl.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-gray-400">
                      {count} zones
                    </span>
                  </div>
                );
              })}
            </div>

            {config.floors.length > 1 && preview3D && (
              <button
                type="button"
                onClick={() => {
                  const next = !multiFloorStack;
                  setMultiFloorStack(next);
                  updateConfig({ multiFloorStack3D: next });
                }}
                className={`mt-2.5 w-full py-1.5 px-2.5 rounded-xl text-[11px] font-mono border flex items-center justify-center gap-1.5 transition-all ${
                  multiFloorStack
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Layers size={12} />
                {multiFloorStack ? '3D Multi-Floor Stack: ON' : 'Stack All Floors in 3D'}
              </button>
            )}
          </div>

          {/* Physical Elements Toolbox */}
          <div className="rounded-2xl p-3.5 bg-black/80 backdrop-blur-xl border border-white/10">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-300 mb-2.5 flex items-center gap-1.5">
              <Plus size={13} style={{ color: wsColor.primary }} />
              Add 3D Rooms & Assets
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(NODE_TYPE_META) as Array<FacilityZoneNode['type']>).map((type) => {
                const meta = NODE_TYPE_META[type];
                const IconComp = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddNode(type)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 text-left transition-all group"
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${meta.color}20`,
                        border: `1px solid ${meta.color}50`,
                        color: meta.color,
                      }}
                    >
                      <IconComp size={13} />
                    </div>
                    <span className="text-[10px] font-mono text-gray-300 group-hover:text-white leading-tight truncate">
                      {meta.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Wall Drawing & Grid Snap Controls */}
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setDrawingWallMode(!drawingWallMode);
                  setWallStart(null);
                }}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono border transition-all ${
                  drawingWallMode
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <Grid size={13} />
                {drawingWallMode
                  ? wallStart
                    ? 'Click End Point for 3D Wall...'
                    : 'Click Start Point on Floor...'
                  : 'Draw 3D Structural Wall'}
              </button>

              {floorWalls.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      walls: (config.walls || []).slice(0, -1),
                    })
                  }
                  className="w-full py-1.5 rounded-xl text-[10px] font-mono text-gray-400 hover:text-white bg-white/[0.03] border border-white/10"
                >
                  Undo Last Wall ({floorWalls.length} segments)
                </button>
              )}

              <label className="flex items-center justify-between text-[11px] font-mono text-gray-300 pt-1 cursor-pointer">
                <span>Snap Rooms to CAD Grid</span>
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
              </label>

              {activeBlueprintUrl && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>Blueprint Opacity</span>
                    <span>{Math.round((config.blueprintOpacity ?? 0.45) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={config.blueprintOpacity ?? 0.45}
                    onChange={(e) =>
                      updateConfig({ blueprintOpacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig({
                        blueprintImageUrl: undefined,
                        blueprintSvgText: undefined,
                      })
                    }
                    className="text-[10px] font-mono text-red-400 hover:underline"
                  >
                    Remove Uploaded Floorplan Image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Interactive 3D Virtual Environment Viewport */}
        <div className="lg:col-span-6">
          <div
            className="rounded-2xl bg-black/90 backdrop-blur-2xl border overflow-hidden flex flex-col"
            style={{
              borderColor: `rgba(${wsColor.rgb}, 0.35)`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.9), inset 0 0 40px rgba(${wsColor.rgb}, 0.06)`,
            }}
          >
            {/* Virtual Environment Top HUD Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10 bg-black/80">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: wsColor.primary, boxShadow: `0 0 8px ${wsColor.primary}` }}
                />
                <span className="text-xs font-mono font-bold text-white">
                  {multiFloorStack ? `All Floors (${config.floors.length})` : activeFloor.name}
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  ({floorNodes.length} rooms &middot; {floorWalls.length} walls)
                </span>
              </div>

              {/* 3D / 2D + Cutaway + Camera Mode Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Manipulation vs Orbit vs Pan Tool Switcher */}
                {preview3D && (
                  <div className="flex items-center bg-black/80 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
                    {[
                      { id: 'manipulate', label: 'Edit Rooms' },
                      { id: 'orbit', label: '3D Orbit' },
                      { id: 'pan', label: 'Pan' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCameraToolMode(t.id as any)}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          cameraToolMode === t.id
                            ? 'text-white font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        style={
                          cameraToolMode === t.id
                            ? {
                                background: `rgba(${wsColor.rgb}, 0.25)`,
                                color: wsColor.primary,
                              }
                            : {}
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Wall Cutaway Mode Selector */}
                {preview3D && (
                  <select
                    value={wallCutawayMode}
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setWallCutawayMode(v);
                      updateConfig({ wallCutawayMode: v });
                    }}
                    className="px-2 py-1 rounded-lg bg-black/80 border border-white/15 text-[10px] font-mono text-gray-200 focus:outline-none"
                    title="3D Wall Visualization Mode"
                  >
                    <option value="full">3D Full Walls</option>
                    <option value="cutaway">Cutaway Walls</option>
                    <option value="xray">X-Ray Glass</option>
                    <option value="wireframe">CAD Wireframe</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const next = !preview3D;
                    setPreview3D(next);
                    updateConfig({ default3DMode: next });
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all"
                  style={
                    preview3D
                      ? {
                          background: `rgba(${wsColor.rgb}, 0.2)`,
                          borderColor: wsColor.primary,
                          color: wsColor.primary,
                          boxShadow: `0 0 12px rgba(${wsColor.rgb}, 0.3)`,
                        }
                      : {
                          background: 'rgba(255,255,255,0.05)',
                          borderColor: 'rgba(255,255,255,0.15)',
                          color: '#9ca3af',
                        }
                  }
                >
                  <Box size={12} />
                  {preview3D ? '3D Virtual' : '2D Plan'}
                </button>
              </div>
            </div>

            {/* Camera Angle & Preset Sub-Bar (in 3D mode) */}
            {preview3D && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 border-b border-white/10 bg-black/50 text-[10px] font-mono text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Camera:</span>
                  {[
                    { label: 'Iso', pitch: 54, yaw: -22 },
                    { label: 'Walkthrough', pitch: 72, yaw: -12 },
                    { label: 'North', pitch: 50, yaw: 0 },
                    { label: 'East', pitch: 50, yaw: -90 },
                    { label: 'Top', pitch: 0, yaw: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTiltAngle(preset.pitch);
                        setRotationAngle(preset.yaw);
                        setPanOffset({ x: 0, y: 0 });
                        updateConfig({
                          defaultTiltAngle: preset.pitch,
                          defaultRotationAngle: preset.yaw,
                        });
                      }}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span>Pitch {tiltAngle}°</span>
                  <input
                    type="range"
                    min={0}
                    max={75}
                    value={tiltAngle}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTiltAngle(v);
                      updateConfig({ defaultTiltAngle: v });
                    }}
                    className="w-14 accent-cyan-400"
                  />
                  <span>Yaw {rotationAngle}°</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={rotationAngle}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRotationAngle(v);
                      updateConfig({ defaultRotationAngle: v });
                    }}
                    className="w-16 accent-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}
                    className="p-0.5 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)))}
                    className="p-0.5 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Interactive 3D Virtual Environment Viewport */}
            <div
              className={`relative w-full h-[500px] overflow-hidden select-none flex items-center justify-center ${
                isOrbitDragging || isPanDragging
                  ? 'cursor-grabbing'
                  : cameraToolMode === 'orbit'
                    ? 'cursor-grab'
                    : cameraToolMode === 'pan'
                      ? 'cursor-move'
                      : 'cursor-default'
              }`}
              style={{
                perspective: '1300px',
                background:
                  'radial-gradient(circle at 50% 45%, rgba(12, 22, 42, 0.96), rgba(3, 6, 12, 1))',
              }}
              onMouseDown={handleViewportMouseDown}
              onMouseMove={handleViewportMouseMove}
              onMouseUp={handleViewportMouseUp}
              onMouseLeave={handleViewportMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.08 : -0.08;
                setZoom((z) => Math.max(0.55, Math.min(1.85, +(z + delta).toFixed(2))));
              }}
            >
              {/* 3D World Scene Container */}
              <div
                ref={canvasRef}
                className="relative w-[88%] h-[82%] transition-transform duration-150"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: preview3D
                    ? `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoom * 0.85}) rotateX(${tiltAngle}deg) rotateZ(${rotationAngle}deg)`
                    : `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoom})`,
                }}
              >
                {renderedFloors.map((fl, flIdx) => {
                  const isCurrentFloor = fl.id === activeFloor.id;
                  const floorZ =
                    renderedFloors.length > 1
                      ? (flIdx - (renderedFloors.length - 1) / 2) * 125
                      : 0;
                  const flNodes = config.nodes.filter(
                    (n) => !n.floorId || n.floorId === fl.id
                  );
                  const flWalls = (config.walls || []).filter(
                    (w) => !w.floorId || w.floorId === fl.id
                  );
                  const flBlueprint =
                    fl.blueprintImageUrl || config.blueprintImageUrl || '';

                  return (
                    <div
                      key={fl.id}
                      className="absolute inset-0 rounded-xl border"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: `translateZ(${floorZ}px)`,
                        borderColor: isCurrentFloor
                          ? `rgba(${wsColor.rgb}, 0.55)`
                          : 'rgba(255,255,255,0.2)',
                        backgroundColor: 'rgba(6, 11, 22, 0.86)',
                        backgroundImage: `
                          linear-gradient(to right, rgba(${wsColor.rgb}, 0.11) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(${wsColor.rgb}, 0.11) 1px, transparent 1px)
                        `,
                        backgroundSize: '4.166% 6.25%',
                        boxShadow: preview3D
                          ? `0 35px 70px rgba(0,0,0,0.9), 0 0 35px rgba(${wsColor.rgb}, 0.16)`
                          : `inset 0 0 30px rgba(${wsColor.rgb}, 0.08)`,
                        opacity:
                          renderedFloors.length > 1 && !isCurrentFloor ? 0.72 : 1,
                      }}
                    >
                      {/* Floor Level Tag in 3D Multi-Floor Mode */}
                      {renderedFloors.length > 1 && (
                        <div
                          className="absolute -left-2 -top-6 px-2 py-0.5 rounded bg-black/90 border text-[9px] font-mono font-bold text-white pointer-events-none"
                          style={{ borderColor: wsColor.primary }}
                        >
                          {fl.name}
                        </div>
                      )}

                      {/* Uploaded Physical Floorplan Drawing Layer */}
                      {flBlueprint && (
                        <img
                          src={flBlueprint}
                          alt="Facility Floorplan Blueprint"
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          style={{ opacity: config.blueprintOpacity ?? 0.45 }}
                        />
                      )}

                      {/* 2D Structural Walls SVG Underlay */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {flWalls.map((w) => (
                          <line
                            key={w.id}
                            x1={`${w.x1}%`}
                            y1={`${w.y1}%`}
                            x2={`${w.x2}%`}
                            y2={`${w.y2}%`}
                            stroke={w.color || wsColor.primary}
                            strokeWidth={w.thickness || 3}
                            strokeOpacity={0.85}
                            strokeLinecap="round"
                          />
                        ))}
                      </svg>

                      {/* 3D Extruded Structural Wall Segments */}
                      {preview3D &&
                        flWalls.map((w) => {
                          const dx = w.x2 - w.x1;
                          const dy = w.y2 - w.y1;
                          const lengthPct = Math.hypot(dx, dy);
                          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                          const wH =
                            wallCutawayMode === 'cutaway'
                              ? 14
                              : w.height || 38;
                          return (
                            <div
                              key={`wall3d-${w.id}`}
                              className="absolute pointer-events-none origin-top-left"
                              style={{
                                left: `${w.x1}%`,
                                top: `${w.y1}%`,
                                width: `${lengthPct}%`,
                                height: `${wH}px`,
                                transformStyle: 'preserve-3d',
                                transform: `rotateZ(${angleDeg}deg) rotateX(-90deg)`,
                                background: `linear-gradient(180deg, ${w.color || wsColor.primary}55, ${w.color || wsColor.primary}20)`,
                                borderTop: `2px solid ${w.color || wsColor.primary}`,
                                borderBottom: `1px solid ${w.color || wsColor.primary}80`,
                              }}
                            />
                          );
                        })}

                      {/* True 3D Volumetric Rooms, Racks & Zones */}
                      {flNodes.map((node) => {
                        const isSelected = node.id === selectedNodeId;
                        const meta = NODE_TYPE_META[node.type] || NODE_TYPE_META.room;
                        const IconComp = meta.icon;
                        const nodeColor = node.color || meta.color || wsColor.primary;
                        const rawWallH = node.elevationHeight || 38;
                        const wallH = !preview3D
                          ? 0
                          : wallCutawayMode === 'cutaway'
                            ? Math.max(12, Math.round(rawWallH * 0.35))
                            : rawWallH;
                        const wallAlpha =
                          wallCutawayMode === 'xray'
                            ? '18'
                            : wallCutawayMode === 'wireframe'
                              ? '05'
                              : '42';
                        const doorSide = node.doorPosition || 'south';
                        const winSide = node.windowWall || 'none';
                        const propType =
                          node.interiorProp && node.interiorProp !== 'auto'
                            ? node.interiorProp
                            : node.type === 'rack'
                              ? 'racks'
                              : node.type === 'vault'
                                ? 'vault-core'
                                : node.type === 'office' || node.type === 'room'
                                  ? 'conference'
                                  : node.type === 'workstation'
                                    ? 'desks'
                                    : 'none';

                        return (
                          <div
                            key={node.id}
                            onMouseDown={(e) => {
                              if (cameraToolMode !== 'manipulate') return;
                              e.stopPropagation();
                              setActiveFloorId(fl.id);
                              setSelectedNodeId(node.id);
                              if (drawingWallMode) return;
                              const pt = getCanvasCoords(e);
                              setDraggingNodeId(node.id);
                              setDragOffset({ dx: pt.x - node.x, dy: pt.y - node.y });
                            }}
                            className="absolute rounded-lg cursor-move group"
                            style={{
                              left: `${node.x}%`,
                              top: `${node.y}%`,
                              width: `${node.width}%`,
                              height: `${node.height}%`,
                              transformStyle: 'preserve-3d',
                              transform: node.rotation
                                ? `rotateZ(${node.rotation}deg)`
                                : undefined,
                              background:
                                wallCutawayMode === 'wireframe'
                                  ? 'transparent'
                                  : `linear-gradient(135deg, ${nodeColor}30, rgba(5, 10, 20, 0.9))`,
                              border: isSelected
                                ? `2px solid ${nodeColor}`
                                : `1.5px solid ${nodeColor}90`,
                              boxShadow: isSelected
                                ? `0 0 28px ${nodeColor}70, inset 0 0 18px ${nodeColor}35`
                                : `0 0 14px ${nodeColor}25`,
                            }}
                          >
                            {/* ─── 4 VOLUMETRIC 3D WALLS (NORTH, SOUTH, EAST, WEST) ─── */}
                            {preview3D && wallH > 0 && (
                              <>
                                {/* SOUTH WALL (Bottom edge standing up in +Z) */}
                                <div
                                  className="absolute left-0 right-0 bottom-0 pointer-events-none origin-bottom"
                                  style={{
                                    height: `${wallH}px`,
                                    transform: 'rotateX(-90deg)',
                                    background: `linear-gradient(to top, ${nodeColor}${wallAlpha}, ${nodeColor}22)`,
                                    borderTop: `2px solid ${nodeColor}`,
                                    borderLeft: `1px solid ${nodeColor}90`,
                                    borderRight: `1px solid ${nodeColor}90`,
                                    boxShadow: `0 0 12px ${nodeColor}30`,
                                  }}
                                >
                                  {doorSide === 'south' && (
                                    <div
                                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[26%] h-[72%] rounded-t-sm"
                                      style={{
                                        background: 'rgba(2, 6, 15, 0.92)',
                                        borderTop: `2px solid #ffffff`,
                                        borderLeft: `1.5px solid ${nodeColor}`,
                                        borderRight: `1.5px solid ${nodeColor}`,
                                      }}
                                    />
                                  )}
                                  {(winSide === 'south' || winSide === 'all') && (
                                    <div className="absolute top-[22%] left-[12%] right-[12%] h-[30%] bg-cyan-300/20 border-y border-cyan-300/60" />
                                  )}
                                </div>

                                {/* NORTH WALL (Top edge standing up in +Z) */}
                                <div
                                  className="absolute left-0 right-0 top-0 pointer-events-none origin-top"
                                  style={{
                                    height: `${wallH}px`,
                                    transform: 'rotateX(90deg)',
                                    background: `linear-gradient(to bottom, ${nodeColor}${wallAlpha}, ${nodeColor}18)`,
                                    borderBottom: `2px solid ${nodeColor}`,
                                    borderLeft: `1px solid ${nodeColor}80`,
                                    borderRight: `1px solid ${nodeColor}80`,
                                  }}
                                >
                                  {doorSide === 'north' && (
                                    <div
                                      className="absolute top-0 left-1/2 -translate-x-1/2 w-[26%] h-[72%] rounded-b-sm"
                                      style={{
                                        background: 'rgba(2, 6, 15, 0.92)',
                                        borderBottom: `2px solid #ffffff`,
                                        borderLeft: `1.5px solid ${nodeColor}`,
                                        borderRight: `1.5px solid ${nodeColor}`,
                                      }}
                                    />
                                  )}
                                  {(winSide === 'north' || winSide === 'all') && (
                                    <div className="absolute bottom-[22%] left-[12%] right-[12%] h-[30%] bg-cyan-300/20 border-y border-cyan-300/60" />
                                  )}
                                </div>

                                {/* EAST WALL (Right edge standing up in +Z) */}
                                <div
                                  className="absolute top-0 bottom-0 right-0 pointer-events-none origin-right"
                                  style={{
                                    width: `${wallH}px`,
                                    transform: 'rotateY(-90deg)',
                                    background: `linear-gradient(to left, ${nodeColor}${wallAlpha}, ${nodeColor}22)`,
                                    borderLeft: `2px solid ${nodeColor}`,
                                    borderTop: `1px solid ${nodeColor}80`,
                                    borderBottom: `1px solid ${nodeColor}80`,
                                  }}
                                >
                                  {doorSide === 'east' && (
                                    <div
                                      className="absolute right-0 top-1/2 -translate-y-1/2 h-[26%] w-[72%] rounded-l-sm"
                                      style={{
                                        background: 'rgba(2, 6, 15, 0.92)',
                                        borderLeft: `2px solid #ffffff`,
                                        borderTop: `1.5px solid ${nodeColor}`,
                                        borderBottom: `1.5px solid ${nodeColor}`,
                                      }}
                                    />
                                  )}
                                </div>

                                {/* WEST WALL (Left edge standing up in +Z) */}
                                <div
                                  className="absolute top-0 bottom-0 left-0 pointer-events-none origin-left"
                                  style={{
                                    width: `${wallH}px`,
                                    transform: 'rotateY(90deg)',
                                    background: `linear-gradient(to right, ${nodeColor}${wallAlpha}, ${nodeColor}18)`,
                                    borderRight: `2px solid ${nodeColor}`,
                                    borderTop: `1px solid ${nodeColor}80`,
                                    borderBottom: `1px solid ${nodeColor}80`,
                                  }}
                                >
                                  {doorSide === 'west' && (
                                    <div
                                      className="absolute left-0 top-1/2 -translate-y-1/2 h-[26%] w-[72%] rounded-r-sm"
                                      style={{
                                        background: 'rgba(2, 6, 15, 0.92)',
                                        borderRight: `2px solid #ffffff`,
                                        borderTop: `1.5px solid ${nodeColor}`,
                                        borderBottom: `1.5px solid ${nodeColor}`,
                                      }}
                                    />
                                  )}
                                </div>

                                {/* 3D TOP RIM WIREFRAME / OPTIONAL ROOF CAP AT Z = wallH */}
                                <div
                                  className="absolute inset-0 rounded-lg pointer-events-none"
                                  style={{
                                    transform: `translateZ(${wallH}px)`,
                                    border: isSelected
                                      ? `2px solid #ffffff`
                                      : `1.5px solid ${nodeColor}`,
                                    background: node.hasRoof
                                      ? `linear-gradient(135deg, ${nodeColor}45, rgba(8,14,28,0.75))`
                                      : 'transparent',
                                    boxShadow: `0 0 14px ${nodeColor}45`,
                                  }}
                                />

                                {/* ─── 3D INTERIOR VOLUMETRIC PROPS (Racks, Conference Table, Vault Core) ─── */}
                                {propType === 'racks' && (
                                  <div
                                    className="absolute inset-x-[14%] inset-y-[24%] grid grid-cols-3 gap-1 pointer-events-none"
                                    style={{
                                      transformStyle: 'preserve-3d',
                                      transform: `translateZ(${Math.round(wallH * 0.55)}px)`,
                                    }}
                                  >
                                    {[0, 1, 2].map((rk) => (
                                      <div
                                        key={rk}
                                        className="rounded-sm border flex flex-col justify-between p-0.5"
                                        style={{
                                          background: 'rgba(4, 10, 24, 0.92)',
                                          borderColor: nodeColor,
                                          boxShadow: `0 4px 10px rgba(0,0,0,0.8), 0 0 6px ${nodeColor}50`,
                                        }}
                                      >
                                        <span
                                          className="w-1 h-1 rounded-full animate-ping"
                                          style={{ background: nodeColor }}
                                        />
                                        <span className="w-full h-[1px] bg-white/30" />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {(propType === 'conference' || propType === 'desks') && (
                                  <div
                                    className="absolute inset-x-[24%] inset-y-[30%] rounded pointer-events-none border"
                                    style={{
                                      transform: `translateZ(${Math.round(wallH * 0.35)}px)`,
                                      background: `${nodeColor}35`,
                                      borderColor: `${nodeColor}90`,
                                      boxShadow: `0 6px 12px rgba(0,0,0,0.75)`,
                                    }}
                                  />
                                )}

                                {propType === 'vault-core' && (
                                  <div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full pointer-events-none border-2 flex items-center justify-center"
                                    style={{
                                      transform: `translate(-50%, -50%) translateZ(${Math.round(wallH * 0.6)}px)`,
                                      background: 'rgba(4, 16, 24, 0.95)',
                                      borderColor: nodeColor,
                                      boxShadow: `0 0 18px ${nodeColor}`,
                                    }}
                                  >
                                    <Shield size={11} style={{ color: nodeColor }} />
                                  </div>
                                )}
                              </>
                            )}

                            {/* Room Floor Content & Floating 3D Roof Header */}
                            <div
                              className="p-1.5 h-full flex flex-col justify-between overflow-hidden pointer-events-none"
                              style={{
                                transform: preview3D
                                  ? `translateZ(${Math.min(wallH + 2, 46)}px)`
                                  : 'none',
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider truncate"
                                  style={{
                                    background: 'rgba(2, 6, 16, 0.88)',
                                    color: nodeColor,
                                    border: `1px solid ${nodeColor}`,
                                  }}
                                >
                                  {node.code}
                                </span>
                                <IconComp size={12} style={{ color: nodeColor }} />
                              </div>

                              <div className="my-auto">
                                <div className="text-[11px] font-mono font-bold text-white leading-tight truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                                  {node.label}
                                </div>
                                <div className="text-[8px] font-mono text-gray-300 truncate">
                                  {Math.round(node.width * 1.5)}&apos;×{Math.round(node.height * 1.2)}&apos; &middot; H:{Math.round(rawWallH / 3.2)}ft
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[8px] font-mono text-gray-300">
                                <span>{meta.label.split(' ')[0]}</span>
                                {node.capacity ? <span>Cap: {node.capacity}</span> : null}
                              </div>
                            </div>

                            {/* 3D Vertical Wall Height Extrusion Handle (Top-Left) */}
                            {preview3D && (
                              <div
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedNodeId(node.id);
                                  setExtrudingNodeId(node.id);
                                  setExtrudeStart({
                                    startY: e.clientY,
                                    startH: node.elevationHeight || 38,
                                  });
                                }}
                                className="absolute -top-2 -left-2 px-1 py-0.5 rounded bg-black/90 border text-[8px] font-mono text-white cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                                style={{
                                  borderColor: nodeColor,
                                  transform: `translateZ(${wallH + 6}px)`,
                                }}
                                title="Drag up/down to change 3D wall height"
                              >
                                ↕ {rawWallH}px
                              </div>
                            )}

                            {/* Bottom-Right Resize Handle */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedNodeId(node.id);
                                setResizingNodeId(node.id);
                              }}
                              className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-sm cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                              style={{
                                background: nodeColor,
                                boxShadow: `0 0 8px ${nodeColor}`,
                              }}
                              title="Drag to resize room footprint"
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Floating Legend HUD */}
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-[10px] font-mono text-gray-400">
                <div className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-white/10">
                  Drag room to move &middot; Drag background to 3D orbit &middot; Scroll to zoom
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-emerald-500/30 text-emerald-400">
                  {SECURITY_ALGORITHMS.display}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Inspector: Configure Selected 3D Room / Zone Properties */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl p-4 bg-black/80 backdrop-blur-xl border border-white/10 h-full">
            {selectedNode ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                      3D Room Inspector
                    </span>
                    <h4 className="text-sm font-mono font-bold text-white truncate">
                      {selectedNode.label}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicateNode(selectedNode)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 border border-white/15 transition-all"
                      title="Duplicate Room/Zone"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
                      title="Delete Zone/Node"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Room / Zone Name
                  </label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, { label: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      Zone Code
                    </label>
                    <input
                      type="text"
                      value={selectedNode.code}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          code: e.target.value,
                          linkedFieldValue: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      Node Type
                    </label>
                    <select
                      value={selectedNode.type}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          type: e.target.value as FacilityZoneNode['type'],
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                    >
                      {(Object.keys(NODE_TYPE_META) as Array<FacilityZoneNode['type']>).map(
                        (t) => (
                          <option key={t} value={t}>
                            {NODE_TYPE_META[t].label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* 3D Architectural Properties: Wall Height, Rotation, Doorway, Windows, Interior Props */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      3D Wall Height ({selectedNode.elevationHeight || 38}px)
                    </label>
                    <input
                      type="range"
                      min={12}
                      max={110}
                      value={selectedNode.elevationHeight || 38}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          elevationHeight: parseInt(e.target.value, 10) || 38,
                        })
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      Rotation ({selectedNode.rotation || 0}°)
                    </label>
                    <input
                      type="range"
                      min={-90}
                      max={90}
                      step={15}
                      value={selectedNode.rotation || 0}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          rotation: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      3D Doorway Wall
                    </label>
                    <select
                      value={selectedNode.doorPosition || 'south'}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          doorPosition: e.target.value as any,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                    >
                      <option value="south">South Wall</option>
                      <option value="north">North Wall</option>
                      <option value="east">East Wall</option>
                      <option value="west">West Wall</option>
                      <option value="none">No Doorway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      3D Interior Furnishing
                    </label>
                    <select
                      value={selectedNode.interiorProp || 'auto'}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          interiorProp: e.target.value as any,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                    >
                      <option value="auto">Auto by Type</option>
                      <option value="racks">3D Server Racks</option>
                      <option value="conference">Conference Table</option>
                      <option value="desks">Workstation Desks</option>
                      <option value="vault-core">Quantum Vault Core</option>
                      <option value="none">Empty Room</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      3D Window Wall
                    </label>
                    <select
                      value={selectedNode.windowWall || 'none'}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          windowWall: e.target.value as any,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                    >
                      <option value="none">Solid Walls</option>
                      <option value="north">North Glass</option>
                      <option value="south">South Glass</option>
                      <option value="all">All Glass Walls</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                      Max Capacity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={selectedNode.capacity || 20}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          capacity: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Record Match Key (Location/Zone Value)
                  </label>
                  <input
                    type="text"
                    value={selectedNode.linkedFieldValue || ''}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, { linkedFieldValue: e.target.value })
                    }
                    placeholder="e.g. RACK-A1, Bay 4, Room 102"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Neon Glow Accent Color
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      '#00f0ff',
                      '#3b82f6',
                      '#8b5cf6',
                      '#ec4899',
                      '#10b981',
                      '#f59e0b',
                      '#ef4444',
                      '#06b6d4',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdateNode(selectedNode.id, { color: c })}
                        className={`w-6 h-6 rounded-lg border transition-transform ${
                          selectedNode.color === c ? 'scale-110 ring-2 ring-white' : 'opacity-75'
                        }`}
                        style={{ background: c, boxShadow: `0 0 10px ${c}80` }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                    Operational Notes
                  </label>
                  <textarea
                    rows={2}
                    value={selectedNode.description || ''}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, { description: e.target.value })
                    }
                    placeholder="Physical access protocol, rack power specs, etc."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/15 text-xs font-mono text-white resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-500 font-mono text-xs">
                <Building2 size={28} className="mb-2 opacity-40" />
                Click any 3D room, rack, or zone in the virtual viewport to inspect & configure its 3D walls, doors, furnishings, and record bindings.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High-Res 3D & 2D Layout Image Generator Studio Modal */}
      <FacilityImageGeneratorModal
        isOpen={showImageGenerator}
        onClose={() => setShowImageGenerator(false)}
        config={config}
        activeFloorId={activeFloor.id}
        wsColor={wsColor}
        initialPitch={tiltAngle}
        initialYaw={rotationAngle}
      />
    </div>
  );
};

export default FacilityTemplateBuilder;
