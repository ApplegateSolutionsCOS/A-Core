import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FacilityTemplateConfig, FacilityZoneNode, FacilityFloorSchema } from '@/types';
import { sha512SyncHex, SECURITY_ALGORITHMS } from '@/lib/encryption';
import {
  Camera,
  Download,
  Copy,
  Check,
  X,
  Box,
  Layers,
  Grid,
  Sparkles,
  FileCode,
  RotateCcw,
  Eye,
  Compass,
} from 'lucide-react';

interface FacilityImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FacilityTemplateConfig;
  activeFloorId: string;
  wsColor: { primary: string; secondary?: string; rgb: string };
  recordsByNodeId?: Record<string, any[]>;
  initialPitch?: number;
  initialYaw?: number;
}

type RenderMode = '3d-single' | '3d-stack' | '2d-blueprint';
type VisualTheme = 'darkwave' | 'blueprint' | 'executive-light' | 'thermal';

function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || '#00f0ff').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const FacilityImageGeneratorModal: React.FC<FacilityImageGeneratorModalProps> = ({
  isOpen,
  onClose,
  config,
  activeFloorId,
  wsColor,
  recordsByNodeId = {},
  initialPitch = 52,
  initialYaw = -24,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [renderMode, setRenderMode] = useState<RenderMode>('3d-single');
  const [theme, setTheme] = useState<VisualTheme>('darkwave');
  const [pitch, setPitch] = useState<number>(initialPitch || 52);
  const [yaw, setYaw] = useState<number>(initialYaw || -24);
  const [wallCutaway, setWallCutaway] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showInteriorProps, setShowInteriorProps] = useState<boolean>(true);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(true);
  const [showTitleBlock, setShowTitleBlock] = useState<boolean>(true);
  const [resolution, setResolution] = useState<'1600x1000' | '1920x1200' | '2560x1600'>('1920x1200');
  const [copied, setCopied] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>(config.name || 'Facility Layout');

  useEffect(() => {
    setCustomTitle(config.name || 'Facility Layout');
  }, [config.name]);

  const activeFloor: FacilityFloorSchema =
    config.floors.find((f) => f.id === activeFloorId) ||
    config.floors[0] || { id: 'floor-1', name: 'Level 01', level: 1 };

  const [resW, resH] = resolution.split('x').map(Number);

  // Render the facility layout onto the HTML5 Canvas
  const drawFacilityCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = resW;
    const H = resH;
    canvas.width = W;
    canvas.height = H;

    // 1. Background Fill according to Theme
    if (theme === 'blueprint') {
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.75);
      grad.addColorStop(0, '#0c2d57');
      grad.addColorStop(1, '#06172e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (theme === 'executive-light') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.75);
      grad.addColorStop(0, '#0d1629');
      grad.addColorStop(1, '#04070f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Subtle background drafting grid
    ctx.save();
    ctx.strokeStyle =
      theme === 'executive-light'
        ? 'rgba(15, 23, 42, 0.05)'
        : theme === 'blueprint'
          ? 'rgba(125, 211, 252, 0.09)'
          : `rgba(${wsColor.rgb}, 0.06)`;
    ctx.lineWidth = 1;
    const bgStep = 40;
    for (let x = 0; x < W; x += bgStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += bgStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // Available drawing area (leave bottom for title block if enabled)
    const drawAreaH = showTitleBlock ? H - 135 : H - 40;
    const centerX = W * 0.5;
    const centerY = drawAreaH * 0.52;

    if (renderMode === '2d-blueprint') {
      // ─── 2D ORTHOGONAL ARCHITECTURAL FLOORPLAN RENDER ───
      const boardW = Math.min(W * 0.82, drawAreaH * 1.38);
      const boardH = boardW * 0.65;
      const startX = centerX - boardW / 2;
      const startY = centerY - boardH / 2;

      // Floorplate base
      ctx.save();
      ctx.fillStyle =
        theme === 'executive-light'
          ? '#ffffff'
          : theme === 'blueprint'
            ? 'rgba(10, 37, 74, 0.9)'
            : 'rgba(8, 13, 26, 0.92)';
      ctx.strokeStyle =
        theme === 'executive-light'
          ? '#334155'
          : theme === 'blueprint'
            ? '#38bdf8'
            : wsColor.primary;
      ctx.lineWidth = 3;
      ctx.fillRect(startX, startY, boardW, boardH);
      ctx.strokeRect(startX, startY, boardW, boardH);

      // Internal CAD grid
      const cols = config.gridColumns || 24;
      const rows = config.gridRows || 16;
      ctx.strokeStyle =
        theme === 'executive-light'
          ? 'rgba(100, 116, 139, 0.16)'
          : theme === 'blueprint'
            ? 'rgba(125, 211, 252, 0.18)'
            : `rgba(${wsColor.rgb}, 0.12)`;
      ctx.lineWidth = 1;
      for (let c = 1; c < cols; c++) {
        const gx = startX + (boardW * c) / cols;
        ctx.beginPath();
        ctx.moveTo(gx, startY);
        ctx.lineTo(gx, startY + boardH);
        ctx.stroke();
      }
      for (let r = 1; r < rows; r++) {
        const gy = startY + (boardH * r) / rows;
        ctx.beginPath();
        ctx.moveTo(startX, gy);
        ctx.lineTo(startX + boardW, gy);
        ctx.stroke();
      }

      // Structural walls
      const floorWalls = (config.walls || []).filter(
        (w) => !w.floorId || w.floorId === activeFloor.id
      );
      floorWalls.forEach((w) => {
        const x1 = startX + (w.x1 / 100) * boardW;
        const y1 = startY + (w.y1 / 100) * boardH;
        const x2 = startX + (w.x2 / 100) * boardW;
        const y2 = startY + (w.y2 / 100) * boardH;
        ctx.strokeStyle =
          theme === 'executive-light'
            ? '#0f172a'
            : theme === 'blueprint'
              ? '#e0f2fe'
              : w.color || wsColor.primary;
        ctx.lineWidth = (w.thickness || 3) * 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Rooms & Zones
      const floorNodes = config.nodes.filter(
        (n) => !n.floorId || n.floorId === activeFloor.id
      );
      floorNodes.forEach((node) => {
        const nx = startX + (node.x / 100) * boardW;
        const ny = startY + (node.y / 100) * boardH;
        const nw = (node.width / 100) * boardW;
        const nh = (node.height / 100) * boardH;
        const recs = recordsByNodeId[node.id] || [];
        const util = node.capacity
          ? Math.min(100, Math.round((recs.length / node.capacity) * 100))
          : Math.min(100, recs.length * 20);

        let roomColor = node.color || wsColor.primary;
        if (theme === 'blueprint') roomColor = '#38bdf8';
        else if (theme === 'executive-light') roomColor = '#2563eb';
        else if (theme === 'thermal') {
          roomColor = util > 75 ? '#ef4444' : util > 40 ? '#f59e0b' : '#10b981';
        }

        ctx.fillStyle =
          theme === 'executive-light'
            ? hexToRgba(node.color || '#2563eb', 0.12)
            : hexToRgba(roomColor, 0.22);
        ctx.strokeStyle =
          theme === 'executive-light' ? node.color || '#1e40af' : roomColor;
        ctx.lineWidth = 2.5;
        ctx.fillRect(nx, ny, nw, nh);
        ctx.strokeRect(nx, ny, nw, nh);

        // Doorway arc in 2D blueprint
        const doorPos = node.doorPosition || 'south';
        if (doorPos !== 'none') {
          ctx.save();
          ctx.strokeStyle = theme === 'executive-light' ? '#0f172a' : '#ffffff';
          ctx.lineWidth = 1.5;
          const doorW = Math.min(26, nw * 0.28);
          if (doorPos === 'south') {
            ctx.clearRect(nx + nw / 2 - doorW / 2, ny + nh - 2, doorW, 4);
            ctx.beginPath();
            ctx.arc(nx + nw / 2 - doorW / 2, ny + nh, doorW, -Math.PI / 2, 0);
            ctx.stroke();
          } else if (doorPos === 'north') {
            ctx.clearRect(nx + nw / 2 - doorW / 2, ny - 2, doorW, 4);
            ctx.beginPath();
            ctx.arc(nx + nw / 2 - doorW / 2, ny, doorW, 0, Math.PI / 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Labels
        if (showLabels) {
          ctx.fillStyle = theme === 'executive-light' ? '#0f172a' : '#ffffff';
          ctx.font = 'bold 14px monospace';
          ctx.fillText(node.code, nx + 10, ny + 22);
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(node.label, nx + 10, ny + 42, nw - 20);
        }

        if (showDimensions) {
          const ftW = Math.round(node.width * 1.5);
          const ftH = Math.round(node.height * 1.2);
          ctx.fillStyle =
            theme === 'executive-light' ? '#475569' : 'rgba(255,255,255,0.65)';
          ctx.font = '11px monospace';
          ctx.fillText(`${ftW}' × ${ftH}' (${ftW * ftH} sq ft)`, nx + 10, ny + nh - 12);
        }

        if (showTelemetry) {
          const badgeText = `${recs.length}/${node.capacity || 20}`;
          ctx.font = 'bold 11px monospace';
          const tw = ctx.measureText(badgeText).width + 14;
          ctx.fillStyle = theme === 'executive-light' ? '#0f172a' : 'rgba(0,0,0,0.8)';
          ctx.fillRect(nx + nw - tw - 8, ny + 8, tw, 20);
          ctx.fillStyle = roomColor;
          ctx.fillText(badgeText, nx + nw - tw - 1, ny + 22);
        }
      });

      ctx.restore();
    } else {
      // ─── TRUE 3D VOLUMETRIC ISOMETRIC / PERSPECTIVE RENDER ───
      const floorsToRender =
        renderMode === '3d-stack' && config.floors.length > 1
          ? [...config.floors].sort((a, b) => a.level - b.level)
          : [activeFloor];

      const radYaw = (yaw * Math.PI) / 180;
      const radPitch = (pitch * Math.PI) / 180;
      const cosY = Math.cos(radYaw);
      const sinY = Math.sin(radYaw);
      const cosP = Math.cos(radPitch);
      const sinP = Math.sin(radPitch);

      const scale = Math.min(W, drawAreaH) * 0.0085 * (floorsToRender.length > 1 ? 0.82 : 1);

      // Project normalized 0..100 (x, y) and world Z (height) to 2D canvas
      const project3D = (nx: number, ny: number, z: number) => {
        // Center around (50, 50)
        const wx = (nx - 50) * 1.35;
        const wy = (ny - 50) * 0.95;
        const rx = wx * cosY - wy * sinY;
        const ry = wx * sinY + wy * cosY;

        const screenX = centerX + rx * scale * 10;
        const screenY = centerY + ry * cosP * scale * 10 - z * sinP * (scale * 1.45);
        const depth = ry * sinP + z * cosP * 0.05;
        return { x: screenX, y: screenY, depth };
      };

      floorsToRender.forEach((fl, floorIdx) => {
        const baseZ =
          floorsToRender.length > 1
            ? (floorIdx - (floorsToRender.length - 1) / 2) * 125
            : 0;

        // 1. Draw 3D Floor Slab Base
        const c0 = project3D(0, 0, baseZ);
        const c1 = project3D(100, 0, baseZ);
        const c2 = project3D(100, 100, baseZ);
        const c3 = project3D(0, 100, baseZ);

        // Slab thickness (extruded downward 8px)
        const b0 = project3D(0, 0, baseZ - 6);
        const b1 = project3D(100, 0, baseZ - 6);
        const b2 = project3D(100, 100, baseZ - 6);
        const b3 = project3D(0, 100, baseZ - 6);

        // Slab sideskirt
        ctx.fillStyle =
          theme === 'executive-light'
            ? '#94a3b8'
            : theme === 'blueprint'
              ? '#1e3a8a'
              : `rgba(${wsColor.rgb}, 0.28)`;
        ctx.beginPath();
        ctx.moveTo(c3.x, c3.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.lineTo(b3.x, b3.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.lineTo(b1.x, b1.y);
        ctx.closePath();
        ctx.fill();

        // Floor top surface
        ctx.fillStyle =
          theme === 'executive-light'
            ? 'rgba(241, 245, 249, 0.94)'
            : theme === 'blueprint'
              ? 'rgba(10, 37, 74, 0.88)'
              : 'rgba(8, 14, 28, 0.9)';
        ctx.strokeStyle =
          theme === 'executive-light'
            ? '#475569'
            : theme === 'blueprint'
              ? '#38bdf8'
              : wsColor.primary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(c0.x, c0.y);
        ctx.lineTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3D Floor Grid Lines
        const cols = config.gridColumns || 24;
        const rows = config.gridRows || 16;
        ctx.strokeStyle =
          theme === 'executive-light'
            ? 'rgba(100, 116, 139, 0.18)'
            : theme === 'blueprint'
              ? 'rgba(125, 211, 252, 0.16)'
              : `rgba(${wsColor.rgb}, 0.14)`;
        ctx.lineWidth = 1;
        for (let i = 1; i < cols; i++) {
          const gx = (i / cols) * 100;
          const pA = project3D(gx, 0, baseZ);
          const pB = project3D(gx, 100, baseZ);
          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.stroke();
        }
        for (let j = 1; j < rows; j++) {
          const gy = (j / rows) * 100;
          const pA = project3D(0, gy, baseZ);
          const pB = project3D(100, gy, baseZ);
          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.stroke();
        }

        // Floor label tag on slab corner
        ctx.fillStyle = theme === 'executive-light' ? '#0f172a' : wsColor.primary;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(fl.name.toUpperCase(), c3.x + 12, c3.y + 20);

        // 2. Structural Walls in 3D
        const flWalls = (config.walls || []).filter(
          (w) => !w.floorId || w.floorId === fl.id
        );
        flWalls.forEach((w) => {
          const wHeight = wallCutaway ? 12 : w.height || 32;
          const p1B = project3D(w.x1, w.y1, baseZ);
          const p2B = project3D(w.x2, w.y2, baseZ);
          const p2T = project3D(w.x2, w.y2, baseZ + wHeight);
          const p1T = project3D(w.x1, w.y1, baseZ + wHeight);

          const wallColor =
            theme === 'executive-light'
              ? '#64748b'
              : theme === 'blueprint'
                ? '#38bdf8'
                : w.color || wsColor.primary;

          ctx.fillStyle = hexToRgba(wallColor, 0.35);
          ctx.strokeStyle = hexToRgba(wallColor, 0.85);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p1B.x, p1B.y);
          ctx.lineTo(p2B.x, p2B.y);
          ctx.lineTo(p2T.x, p2T.y);
          ctx.lineTo(p1T.x, p1T.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        // 3. Sort Floor Nodes Back-to-Front by 3D Centroid Depth (Painter's Algorithm)
        const flNodes = config.nodes
          .filter((n) => !n.floorId || n.floorId === fl.id)
          .map((n) => {
            const centerPt = project3D(
              n.x + n.width / 2,
              n.y + n.height / 2,
              baseZ + (n.elevationHeight || 36) / 2
            );
            return { node: n, depth: centerPt.depth };
          })
          .sort((a, b) => a.depth - b.depth);

        // 4. Render Each 3D Volumetric Room / Zone
        flNodes.forEach(({ node }) => {
          const x1 = node.x;
          const y1 = node.y;
          const x2 = node.x + node.width;
          const y2 = node.y + node.height;
          const fullH = node.elevationHeight || 38;
          const h = wallCutaway ? Math.max(12, fullH * 0.35) : fullH;
          const recs = recordsByNodeId[node.id] || [];
          const util = node.capacity
            ? Math.min(100, Math.round((recs.length / node.capacity) * 100))
            : Math.min(100, recs.length * 20);

          let baseColor = node.color || wsColor.primary;
          if (theme === 'blueprint') baseColor = '#38bdf8';
          else if (theme === 'executive-light') baseColor = node.color || '#2563eb';
          else if (theme === 'thermal') {
            baseColor = util > 75 ? '#ef4444' : util > 40 ? '#f59e0b' : '#10b981';
          }

          // Bottom 4 corners
          const bNW = project3D(x1, y1, baseZ);
          const bNE = project3D(x2, y1, baseZ);
          const bSE = project3D(x2, y2, baseZ);
          const bSW = project3D(x1, y2, baseZ);

          // Top 4 corners
          const tNW = project3D(x1, y1, baseZ + h);
          const tNE = project3D(x2, y1, baseZ + h);
          const tSE = project3D(x2, y2, baseZ + h);
          const tSW = project3D(x1, y2, baseZ + h);

          // Room Floor Tile
          ctx.fillStyle =
            theme === 'executive-light'
              ? hexToRgba(baseColor, 0.18)
              : hexToRgba(baseColor, 0.26);
          ctx.strokeStyle = hexToRgba(baseColor, 0.7);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bNW.x, bNW.y);
          ctx.lineTo(bNE.x, bNE.y);
          ctx.lineTo(bSE.x, bSE.y);
          ctx.lineTo(bSW.x, bSW.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Build the 4 vertical walls and sort them back-to-front
          const walls3D = [
            {
              side: 'north',
              bA: bNW,
              bB: bNE,
              tB: tNE,
              tA: tNW,
              depth: (bNW.depth + bNE.depth) / 2,
              shade: 0.22,
            },
            {
              side: 'east',
              bA: bNE,
              bB: bSE,
              tB: tSE,
              tA: tNE,
              depth: (bNE.depth + bSE.depth) / 2,
              shade: 0.34,
            },
            {
              side: 'south',
              bA: bSW,
              bB: bSE,
              tB: tSE,
              tA: tSW,
              depth: (bSW.depth + bSE.depth) / 2,
              shade: 0.42,
            },
            {
              side: 'west',
              bA: bNW,
              bB: bSW,
              tB: tSW,
              tA: tNW,
              depth: (bNW.depth + bSW.depth) / 2,
              shade: 0.28,
            },
          ].sort((a, b) => a.depth - b.depth);

          // Draw Back 2 Walls first
          walls3D.slice(0, 2).forEach((w) => {
            ctx.fillStyle = hexToRgba(
              baseColor,
              theme === 'executive-light' ? w.shade * 0.7 : w.shade
            );
            ctx.strokeStyle = hexToRgba(baseColor, 0.75);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(w.bA.x, w.bA.y);
            ctx.lineTo(w.bB.x, w.bB.y);
            ctx.lineTo(w.tB.x, w.tB.y);
            ctx.lineTo(w.tA.x, w.tA.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });

          // Draw 3D Interior Sub-Objects (Racks / Desks / Vault Core) inside the room
          if (showInteriorProps && node.width >= 10 && node.height >= 10) {
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

            if (propType === 'racks') {
              const numRacks = Math.min(4, Math.max(2, Math.floor(node.width / 6)));
              for (let r = 0; r < numRacks; r++) {
                const rx1 = x1 + 2 + (r * (node.width - 4)) / numRacks;
                const rx2 = rx1 + (node.width - 6) / numRacks;
                const ry1 = y1 + node.height * 0.25;
                const ry2 = y1 + node.height * 0.75;
                const rh = h * 0.78;
                const rBNW = project3D(rx1, ry1, baseZ);
                const rBNE = project3D(rx2, ry1, baseZ);
                const rBSE = project3D(rx2, ry2, baseZ);
                const rBSW = project3D(rx1, ry2, baseZ);
                const rTNW = project3D(rx1, ry1, baseZ + rh);
                const rTNE = project3D(rx2, ry1, baseZ + rh);
                const rTSE = project3D(rx2, ry2, baseZ + rh);
                const rTSW = project3D(rx1, ry2, baseZ + rh);

                ctx.fillStyle = hexToRgba(baseColor, 0.45);
                ctx.strokeStyle = hexToRgba('#ffffff', 0.5);
                ctx.lineWidth = 1;
                // Top of rack
                ctx.beginPath();
                ctx.moveTo(rTNW.x, rTNW.y);
                ctx.lineTo(rTNE.x, rTNE.y);
                ctx.lineTo(rTSE.x, rTSE.y);
                ctx.lineTo(rTSW.x, rTSW.y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Front of rack
                ctx.beginPath();
                ctx.moveTo(rBSW.x, rBSW.y);
                ctx.lineTo(rBSE.x, rBSE.y);
                ctx.lineTo(rTSE.x, rTSE.y);
                ctx.lineTo(rTSW.x, rTSW.y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              }
            } else if (propType === 'conference' || propType === 'desks' || propType === 'vault-core') {
              const cx1 = x1 + node.width * 0.28;
              const cx2 = x1 + node.width * 0.72;
              const cy1 = y1 + node.height * 0.3;
              const cy2 = y1 + node.height * 0.7;
              const ch = propType === 'vault-core' ? h * 0.75 : h * 0.35;
              const pTNW = project3D(cx1, cy1, baseZ + ch);
              const pTNE = project3D(cx2, cy1, baseZ + ch);
              const pTSE = project3D(cx2, cy2, baseZ + ch);
              const pTSW = project3D(cx1, cy2, baseZ + ch);
              ctx.fillStyle = hexToRgba(baseColor, 0.48);
              ctx.strokeStyle = hexToRgba('#ffffff', 0.65);
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(pTNW.x, pTNW.y);
              ctx.lineTo(pTNE.x, pTNE.y);
              ctx.lineTo(pTSE.x, pTSE.y);
              ctx.lineTo(pTSW.x, pTSW.y);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          }

          // Draw Front 2 Walls (with translucent cutaway + doorway portal)
          walls3D.slice(2).forEach((w) => {
            const opacityScale = node.wallOpacity ?? 1;
            ctx.fillStyle = hexToRgba(
              baseColor,
              (theme === 'executive-light' ? w.shade * 0.65 : w.shade * 0.85) * opacityScale
            );
            ctx.strokeStyle =
              theme === 'executive-light'
                ? hexToRgba(baseColor, 0.9)
                : hexToRgba(baseColor, 0.95);
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(w.bA.x, w.bA.y);
            ctx.lineTo(w.bB.x, w.bB.y);
            ctx.lineTo(w.tB.x, w.tB.y);
            ctx.lineTo(w.tA.x, w.tA.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Render 3D Doorway Portal on the matching wall (default south)
            const doorSide = node.doorPosition || 'south';
            if (w.side === doorSide && doorSide !== 'none') {
              const dA = {
                x: w.bA.x + (w.bB.x - w.bA.x) * 0.38,
                y: w.bA.y + (w.bB.y - w.bA.y) * 0.38,
              };
              const dB = {
                x: w.bA.x + (w.bB.x - w.bA.x) * 0.62,
                y: w.bA.y + (w.bB.y - w.bA.y) * 0.62,
              };
              const dTA = {
                x: dA.x + (w.tA.x - w.bA.x) * 0.68,
                y: dA.y + (w.tA.y - w.bA.y) * 0.68,
              };
              const dTB = {
                x: dB.x + (w.tB.x - w.bB.x) * 0.68,
                y: dB.y + (w.tB.y - w.bB.y) * 0.68,
              };
              ctx.fillStyle =
                theme === 'executive-light'
                  ? 'rgba(15, 23, 42, 0.75)'
                  : 'rgba(2, 6, 16, 0.88)';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(dA.x, dA.y);
              ctx.lineTo(dB.x, dB.y);
              ctx.lineTo(dTB.x, dTB.y);
              ctx.lineTo(dTA.x, dTA.y);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          });

          // Top Rim Neon Outline (or Roof Cap)
          ctx.strokeStyle =
            theme === 'executive-light' ? baseColor : hexToRgba('#ffffff', 0.85);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tNW.x, tNW.y);
          ctx.lineTo(tNE.x, tNE.y);
          ctx.lineTo(tSE.x, tSE.y);
          ctx.lineTo(tSW.x, tSW.y);
          ctx.closePath();
          if (node.hasRoof) {
            ctx.fillStyle = hexToRgba(baseColor, 0.35);
            ctx.fill();
          }
          ctx.stroke();

          // Floating 3D Room Label & Telemetry Callout above the room
          if (showLabels) {
            const topCenter = project3D(
              x1 + node.width / 2,
              y1 + node.height / 2,
              baseZ + h + 8
            );
            const codeText = node.code;
            const titleText = node.label;
            const countText = showTelemetry ? `${recs.length}/${node.capacity || 20}` : '';

            ctx.font = 'bold 12px monospace';
            const pillW = Math.max(
              110,
              Math.min(210, ctx.measureText(titleText).width + 32)
            );
            const pillH = showDimensions ? 48 : 34;
            const px = topCenter.x - pillW / 2;
            const py = topCenter.y - pillH / 2;

            // Pill box
            ctx.fillStyle =
              theme === 'executive-light'
                ? 'rgba(255, 255, 255, 0.94)'
                : 'rgba(4, 8, 18, 0.88)';
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(px, py, pillW, pillH, 7);
            ctx.fill();
            ctx.stroke();

            // Code + Telemetry row
            ctx.fillStyle = baseColor;
            ctx.font = 'bold 10px monospace';
            ctx.fillText(codeText, px + 8, py + 13);
            if (countText) {
              const cw = ctx.measureText(countText).width;
              ctx.fillStyle = theme === 'executive-light' ? '#334155' : '#e2e8f0';
              ctx.fillText(countText, px + pillW - cw - 8, py + 13);
            }

            // Room Name
            ctx.fillStyle = theme === 'executive-light' ? '#0f172a' : '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(titleText, px + 8, py + 27, pillW - 16);

            if (showDimensions) {
              const ftW = Math.round(node.width * 1.5);
              const ftH = Math.round(node.height * 1.2);
              ctx.fillStyle =
                theme === 'executive-light' ? '#64748b' : 'rgba(148, 163, 184, 0.9)';
              ctx.font = '9px monospace';
              ctx.fillText(
                `${ftW}'×${ftH}' • H:${Math.round(fullH / 3.2)}ft`,
                px + 8,
                py + 41
              );
            }
          }
        });
      });
    }

    // ─── COMPASS ROSE TOP-RIGHT ───
    ctx.save();
    const compX = W - 75;
    const compY = 75;
    ctx.translate(compX, compY);
    if (renderMode !== '2d-blueprint') {
      ctx.rotate((yaw * Math.PI) / 180);
    }
    ctx.strokeStyle =
      theme === 'executive-light' ? '#334155' : wsColor.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = theme === 'executive-light' ? '#0f172a' : wsColor.primary;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(7, 4);
    ctx.lineTo(0, -2);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -37);
    ctx.restore();

    // ─── ARCHITECTURAL TITLE BLOCK FOOTER ───
    if (showTitleBlock) {
      const tbY = H - 115;
      ctx.fillStyle =
        theme === 'executive-light'
          ? '#ffffff'
          : theme === 'blueprint'
            ? 'rgba(5, 22, 46, 0.96)'
            : 'rgba(5, 9, 20, 0.95)';
      ctx.strokeStyle =
        theme === 'executive-light'
          ? '#cbd5e1'
          : theme === 'blueprint'
            ? '#38bdf8'
            : wsColor.primary;
      ctx.lineWidth = 2;
      ctx.fillRect(30, tbY, W - 60, 90);
      ctx.strokeRect(30, tbY, W - 60, 90);

      // Title & Subtitle
      ctx.fillStyle = theme === 'executive-light' ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(customTitle.toUpperCase(), 50, tbY + 32);

      ctx.fillStyle =
        theme === 'executive-light' ? '#475569' : 'rgba(148, 163, 184, 0.95)';
      ctx.font = '12px monospace';
      const floorText =
        renderMode === '3d-stack'
          ? `ALL FLOORS STACKED (${config.floors.length} LEVELS)`
          : activeFloor.name.toUpperCase();
      const addrText = config.facilityAddress
        ? ` • LOCATION: ${config.facilityAddress.toUpperCase()}`
        : '';
      const orgText = config.organizationName
        ? ` • ORG: ${config.organizationName.toUpperCase()}`
        : '';
      ctx.fillText(
        `${floorText} • ${config.nodes.length} PHYSICAL ZONES${orgText}${addrText}`,
        50,
        tbY + 54
      );

      const sealHash = sha512SyncHex(
        `${customTitle}-${config.nodes.length}-${new Date().toISOString().slice(0, 10)}`
      ).slice(0, 24);
      ctx.fillStyle =
        theme === 'executive-light' ? '#059669' : '#34d399';
      ctx.font = '11px monospace';
      ctx.fillText(
        `${SECURITY_ALGORITHMS.display} • SHA-512 SEAL: ${sealHash}... • GENERATED ${new Date().toLocaleString()}`,
        50,
        tbY + 76
      );

      // Right Metadata Columns in Title Block
      const metaX = W - 360;
      ctx.strokeStyle =
        theme === 'executive-light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(metaX, tbY);
      ctx.lineTo(metaX, tbY + 90);
      ctx.stroke();

      ctx.fillStyle = theme === 'executive-light' ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `PROJECTION: ${
          renderMode === '2d-blueprint'
            ? '2D ORTHO CAD'
            : renderMode === '3d-stack'
              ? '3D MULTI-FLOOR'
              : `3D VIRTUAL (${pitch}° / ${yaw}°)`
        }`,
        metaX + 20,
        tbY + 30
      );
      ctx.fillText(`THEME: ${theme.toUpperCase()}`, metaX + 20, tbY + 52);
      ctx.fillText(`SCALE: 1 GRID = 6.0 FT • RES: ${resolution}`, metaX + 20, tbY + 74);
    }
  }, [
    resW,
    resH,
    theme,
    wsColor,
    showTitleBlock,
    renderMode,
    config,
    activeFloor,
    recordsByNodeId,
    showLabels,
    showDimensions,
    showTelemetry,
    yaw,
    pitch,
    wallCutaway,
    showInteriorProps,
    customTitle,
    resolution,
  ]);

  useEffect(() => {
    if (isOpen) {
      drawFacilityCanvas();
    }
  }, [isOpen, drawFacilityCanvas]);

  if (!isOpen) return null;

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${(customTitle || 'facility_layout')
      .replace(/[^a-z0-9]+/gi, '_')
      .toLowerCase()}_${renderMode}.png`;
    a.click();
  };

  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleDownloadSvg = () => {
    const floorNodes = config.nodes.filter(
      (n) => !n.floorId || n.floorId === activeFloor.id
    );
    const floorWalls = (config.walls || []).filter(
      (w) => !w.floorId || w.floorId === activeFloor.id
    );
    const svgLines: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">`,
      `<rect width="1200" height="800" fill="#061326"/>`,
      `<rect x="60" y="50" width="1080" height="620" fill="#0a1d3a" stroke="${wsColor.primary}" stroke-width="3"/>`,
    ];

    floorWalls.forEach((w) => {
      const x1 = 60 + (w.x1 / 100) * 1080;
      const y1 = 50 + (w.y1 / 100) * 620;
      const x2 = 60 + (w.x2 / 100) * 1080;
      const y2 = 50 + (w.y2 / 100) * 620;
      svgLines.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${wsColor.primary}" stroke-width="${(w.thickness || 3) * 2}" stroke-linecap="round"/>`
      );
    });

    floorNodes.forEach((n) => {
      const x = 60 + (n.x / 100) * 1080;
      const y = 50 + (n.y / 100) * 620;
      const w = (n.width / 100) * 1080;
      const h = (n.height / 100) * 620;
      const col = n.color || wsColor.primary;
      svgLines.push(
        `<g>`,
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${col}" fill-opacity="0.22" stroke="${col}" stroke-width="2.5"/>`,
        `<text x="${x + 12}" y="${y + 24}" fill="${col}" font-family="monospace" font-size="13" font-weight="bold">${n.code}</text>`,
        `<text x="${x + 12}" y="${y + 44}" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">${n.label.replace(/&/g, '&amp;')}</text>`,
        `</g>`
      );
    });

    svgLines.push(
      `<text x="60" y="725" fill="#ffffff" font-family="monospace" font-size="20" font-weight="bold">${customTitle.replace(/&/g, '&amp;')} — ${activeFloor.name.replace(/&/g, '&amp;')}</text>`,
      `<text x="60" y="752" fill="#38bdf8" font-family="monospace" font-size="12">${SECURITY_ALGORITHMS.display} • Generated ${new Date().toISOString()}</text>`,
      `</svg>`
    );

    const blob = new Blob([svgLines.join('\n')], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(customTitle || 'facility_blueprint').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl rounded-2xl bg-[#050811] border overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        style={{
          borderColor: `rgba(${wsColor.rgb}, 0.45)`,
          boxShadow: `0 25px 80px rgba(0,0,0,0.95), 0 0 40px rgba(${wsColor.rgb}, 0.2)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/80">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                background: `rgba(${wsColor.rgb}, 0.15)`,
                borderColor: `rgba(${wsColor.rgb}, 0.45)`,
                color: wsColor.primary,
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
                Generate 3D Facility Layout & Blueprint Image
              </h3>
              <p className="text-[11px] font-mono text-gray-400">
                Export high-resolution 3D virtual environment snapshots or 2D architectural floorplan images (PNG / SVG)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-gray-200 bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Copied to Clipboard!' : 'Copy Image'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-gray-200 bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              <FileCode size={14} />
              Download SVG
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all hover:scale-[1.02]"
              style={{
                background: `rgba(${wsColor.rgb}, 0.22)`,
                borderColor: wsColor.primary,
                color: wsColor.primary,
                boxShadow: `0 0 20px rgba(${wsColor.rgb}, 0.3)`,
              }}
            >
              <Download size={14} />
              Download PNG Image
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body: Left Controls + Right High-Res Canvas Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Settings Column */}
          <div className="lg:col-span-4 p-4 border-r border-white/10 overflow-y-auto space-y-4 bg-black/60">
            {/* Custom Title */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                Image Title Block Heading
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/90 border border-white/15 text-xs font-mono text-white"
              />
            </div>

            {/* Projection Mode */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1.5">
                Projection Mode
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: '3d-single',
                    label: '3D Virtual Isometric Render',
                    desc: 'Volumetric 3D walls, doors & interior racks',
                    icon: Box,
                  },
                  {
                    id: '3d-stack',
                    label: '3D Multi-Floor Stacked Render',
                    desc: `Stack all ${config.floors.length} facility levels in 3D`,
                    icon: Layers,
                  },
                  {
                    id: '2d-blueprint',
                    label: '2D Architectural Floorplan CAD',
                    desc: 'Top-down orthogonal blueprint with door arcs',
                    icon: Grid,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = renderMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRenderMode(m.id as RenderMode)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                        active
                          ? 'text-white'
                          : 'text-gray-400 bg-white/[0.02] border-white/10 hover:border-white/25'
                      }`}
                      style={
                        active
                          ? {
                              background: `rgba(${wsColor.rgb}, 0.16)`,
                              borderColor: wsColor.primary,
                            }
                          : {}
                      }
                    >
                      <Icon size={16} style={{ color: active ? wsColor.primary : '#9ca3af' }} />
                      <div>
                        <div className="text-xs font-mono font-bold">{m.label}</div>
                        <div className="text-[10px] font-mono text-gray-400">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3D Camera Angles (when in 3D mode) */}
            {renderMode !== '2d-blueprint' && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-gray-300 flex items-center gap-1">
                    <Compass size={12} style={{ color: wsColor.primary }} />
                    3D Virtual Camera Angle
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPitch(52);
                      setYaw(-24);
                    }}
                    className="text-[10px] font-mono text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-400">
                    <span>Camera Pitch (Elevation)</span>
                    <span>{pitch}°</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={75}
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-400">
                    <span>Camera Orbit (Yaw Rotation)</span>
                    <span>{yaw}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={yaw}
                    onChange={(e) => setYaw(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <label className="flex items-center justify-between text-xs font-mono text-gray-300 pt-1 cursor-pointer">
                  <span>Dolls-House Wall Cutaway</span>
                  <input
                    type="checkbox"
                    checked={wallCutaway}
                    onChange={(e) => setWallCutaway(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                </label>
              </div>
            )}

            {/* Visual Theme */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1.5">
                Visual Style Theme
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'darkwave', label: 'Darkwave 3D' },
                  { id: 'blueprint', label: 'CAD Blueprint' },
                  { id: 'executive-light', label: 'Clean White Report' },
                  { id: 'thermal', label: 'Thermal Heatmap' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as VisualTheme)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-mono border transition-all ${
                      theme === t.id
                        ? 'text-white font-bold'
                        : 'text-gray-400 bg-white/[0.02] border-white/10 hover:text-white'
                    }`}
                    style={
                      theme === t.id
                        ? {
                            background: `rgba(${wsColor.rgb}, 0.18)`,
                            borderColor: wsColor.primary,
                            color: wsColor.primary,
                          }
                        : {}
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Overlays & Resolution */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="block text-[10px] font-mono uppercase text-gray-400">
                Annotations & Details
              </span>
              {[
                { label: 'Show Zone Codes & Room Names', val: showLabels, set: setShowLabels },
                { label: 'Show Dimensions & Square Footage', val: showDimensions, set: setShowDimensions },
                { label: 'Show 3D Interior Racks & Props', val: showInteriorProps, set: setShowInteriorProps },
                { label: 'Show Record Count & Capacity', val: showTelemetry, set: setShowTelemetry },
                { label: 'Show Architectural Title Block', val: showTitleBlock, set: setShowTitleBlock },
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono text-gray-300 cursor-pointer"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.set(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                </label>
              ))}

              <div className="pt-2">
                <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                  Output Image Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-black/90 border border-white/15 text-xs font-mono text-white"
                >
                  <option value="1600x1000">1600 × 1000 px (Standard HD)</option>
                  <option value="1920x1200">1920 × 1200 px (Full HD Widescreen)</option>
                  <option value="2560x1600">2560 × 1600 px (2K Architectural Print)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Live High-Res Canvas Preview */}
          <div className="lg:col-span-8 p-4 bg-[#03050a] flex flex-col items-center justify-center overflow-auto">
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                <Eye size={13} style={{ color: wsColor.primary }} />
                Live High-Resolution Render Preview ({resolution} px)
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                Right-click canvas to save or use Download PNG / SVG buttons above
              </span>
            </div>
            <div className="relative w-full flex-1 flex items-center justify-center rounded-xl overflow-hidden border border-white/15 bg-black/90 p-2">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[68vh] w-auto h-auto rounded-lg shadow-2xl object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilityImageGeneratorModal;

