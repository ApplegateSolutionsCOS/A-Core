import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/icons/Icons';
import { SpatialHashGrid, getMagneticSnap, type SnapLine, type TileRect } from '@/lib/spatialHashGrid';
import { COLOR_MAP } from '@/contexts/WorkspaceColorContext';

const COLOR_PALETTE: Record<string, { color: string; rgb: string }> = {
  // Reds & Pinks
  red: { color: '#ef4444', rgb: '239,68,68' },
  ruby: { color: '#e11d48', rgb: '225,29,72' },
  raspberry: { color: '#e83f6f', rgb: '232,63,111' },
  coral: { color: '#fb7185', rgb: '251,113,133' },
  melon: { color: '#fca5a5', rgb: '252,165,165' },
  pink: { color: '#ec4899', rgb: '236,72,153' },
  fuchsia: { color: '#d946ef', rgb: '217,70,239' },
  magenta: { color: '#ff00ff', rgb: '255,0,255' },

  // Purples & Blues
  lilac: { color: '#d8b4fe', rgb: '216,180,254' },
  lavender: { color: '#c084fc', rgb: '192,132,252' },
  violet: { color: '#8b5cf6', rgb: '139,92,246' },
  purple: { color: '#a855f7', rgb: '168,85,247' },
  indigo: { color: '#6366f1', rgb: '99,102,241' },
  electric: { color: '#818cf8', rgb: '129,140,248' },
  blue: { color: '#3b82f6', rgb: '59,130,246' },
  azure: { color: '#007fff', rgb: '0,127,255' },
  
  // Cyans & Greens
  sky: { color: '#0ea5e9', rgb: '14,165,233' },
  cyan: { color: '#00ffff', rgb: '0,255,255' },
  teal: { color: '#14b8a6', rgb: '20,184,166' },
  mint: { color: '#34d399', rgb: '52,211,153' },
  emerald: { color: '#10b981', rgb: '16,185,129' },
  green: { color: '#22c55e', rgb: '34,197,94' },
  lime: { color: '#84cc16', rgb: '132,204,22' },
  chartreuse: { color: '#bfff00', rgb: '191,255,0' },

  // Yellows & Oranges
  yellow: { color: '#eab308', rgb: '234,179,8' },
  sunflower: { color: '#ffc300', rgb: '255,195,0' },
  gold: { color: '#fbbf24', rgb: '251,191,36' },
  amber: { color: '#f59e0b', rgb: '245,158,11' },
  peach: { color: '#fb923c', rgb: '251,146,60' },
  orange: { color: '#ff9900', rgb: '255,153,0' },
  tangerine: { color: '#f97316', rgb: '249,115,22' },

  // Neutrals
  zinc: { color: '#a1a1aa', rgb: '161,161,170' },
  slate: { color: '#94a3b8', rgb: '148,163,184' },
  silver: { color: '#d1d5db', rgb: '209,213,219' },
  platinum: { color: '#e5e7eb', rgb: '229,231,235' },
  white: { color: '#ffffff', rgb: '255,255,255' },
};

// Inline SVG icons for tile header actions
const NewWindowIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const ShrinkExpandIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);
const TrashSmallIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ReorderGripIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="8" cy="4" r="2" /><circle cx="16" cy="4" r="2" />
    <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
    <circle cx="8" cy="20" r="2" /><circle cx="16" cy="20" r="2" />
  </svg>
);
const RefreshSmallIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

interface ResizableTileProps {
  id: string;
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  position: { x: number; y: number };
  zIndex: number;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSizeChange: (id: string, size: { width: number; height: number }, dir?: string) => void;
  onSizeChangeEnd?: (id: string, size: { width: number; height: number }, dir?: string) => void;
  onZIndexChange: (id: string) => void;
  onClose?: () => void;
  onNewWindow?: () => void;
  onFullScreen?: () => void;
  onRefresh?: () => void;
  onColorChange?: (id: string, color: 'cyan' | 'magenta' | 'green' | 'purple' | 'orange' | 'red') => void;
  canDelete?: boolean;
  className?: string;
  glowColor?: string;
  allTiles?: Array<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>;
  gridSize?: number;
  canDrag?: boolean;
  isRefreshing?: boolean;
  lastRefreshed?: Date | null;
  hasUnsavedChanges?: boolean;
  isCompacting?: boolean;
  isInitialLoad?: boolean;
  onReorderDragStart?: (id: string) => void;
  onReorderDragOver?: (id: string, x: number, y: number) => void;
  onReorderDrop?: (id: string, x: number, y: number) => void;
  onReorderDragEnd?: () => void;
  isDropTarget?: boolean;
  isDragSource?: boolean;
  isOverlapped?: boolean;
  onOverlapDetected?: (overlappingIds: string[]) => void;
  onSnapLinesChange?: (lines: SnapLine[]) => void;
  tileTitle?: string;
}

const GRID_SIZE = 20;
const TILE_GAP = 8;
const LONG_PRESS_DURATION = 350; 
const LONG_PRESS_MOVE_THRESHOLD = 8;

const formatTimestamp = (date: Date | null): string => {
  if (!date) return 'Never';
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 5) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ResizableTile: React.FC<ResizableTileProps> = ({
  id,
  children,
  initialWidth = 300,
  initialHeight = 200,
  minWidth = 200,
  minHeight = 150,
  maxWidth = 800,
  maxHeight = 600,
  position,
  zIndex,
  onPositionChange,
  onSizeChange,
  onSizeChangeEnd, 
  onZIndexChange,
  onClose,
  onNewWindow,
  onFullScreen,
  onRefresh,
  onColorChange,
  canDelete = false,
  className = '',
  glowColor = 'cyan',
  allTiles = [],
  gridSize = GRID_SIZE,
  canDrag = true,
  isRefreshing = false,
  lastRefreshed = null,
  onReorderDragStart,
  onReorderDragOver,
  onReorderDrop,
  onReorderDragEnd,
  isDropTarget = false,
  isDragSource = false,
  hasUnsavedChanges = false,
  isCompacting = false,
  isOverlapped = false,
  onOverlapDetected,
  onSnapLinesChange,
  tileTitle,
  isInitialLoad = false,
}) => {

  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [currentDragPos, setCurrentDragPos] = useState({ x: position.x, y: position.y });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [longPressReady, setLongPressReady] = useState(false);
  const [overlapFlash, setOverlapFlash] = useState(false); 
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuView, setContextMenuView] = useState<'menu' | 'color'>('menu');
  const [isExpanded, setIsExpanded] = useState(false); // NEW: Local expand state
  const tileRef = useRef<HTMLDivElement>(null);

  const handleTileContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Constrain the menu so it doesn't render off-screen on the right or bottom
    const safeX = Math.min(e.clientX, window.innerWidth - 280);
    const safeY = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenuPos({ x: safeX, y: safeY });
    setContextMenuView('menu'); // Always start on the main menu
  }, []);

  const onPositionChangeRef = useRef(onPositionChange);
  const onSizeChangeRef = useRef(onSizeChange);
  const onSizeChangeEndRef = useRef(onSizeChangeEnd); 
  const onOverlapDetectedRef = useRef(onOverlapDetected);
  const onSnapLinesChangeRef = useRef(onSnapLinesChange);
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const allTilesRef = useRef(allTiles);
  
  onPositionChangeRef.current = onPositionChange;
  onSizeChangeRef.current = onSizeChange;
  onOverlapDetectedRef.current = onOverlapDetected;
  onSnapLinesChangeRef.current = onSnapLinesChange;
  positionRef.current = position;
  sizeRef.current = size;
  allTilesRef.current = allTiles;

  const spatialGridRef = useRef(new SpatialHashGrid(100));

  useEffect(() => {
    const rects: TileRect[] = allTilesRef.current.map(t => ({
      id: t.id,
      x: t.position.x,
      y: t.position.y,
      width: t.size.width,
      height: t.size.height,
    }));
    spatialGridRef.current.rebuild(rects);
  }, [allTiles]);
  
  const dragDataRef = useRef({
    offsetX: 0,
    offsetY: 0,
    startMouseX: 0,
    startMouseY: 0,
    startPosX: 0,
    startPosY: 0,
    startWidth: 0,
    startHeight: 0,
    resizeDir: '',
    isDragging: false,
    isResizing: false,
    currentX: 0,
    currentY: 0,
  });
  
  const animationFrameRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);

  useEffect(() => {
    setSize({ width: initialWidth, height: initialHeight });
  }, [initialWidth, initialHeight]);

  useEffect(() => {
    if (!dragDataRef.current.isDragging) {
      setCurrentDragPos({ x: position.x, y: position.y });
    }
  }, [position.x, position.y]);

  const snapToGrid = (value: number): number => {
    return Math.round(value / gridSize) * gridSize;
  };

  const findNonOverlappingPosition = useCallback((
    targetX: number,
    targetY: number,
    tileWidth: number,
    tileHeight: number
  ): { x: number; y: number } => {
    const grid = spatialGridRef.current;
    return grid.findNonOverlapping(targetX, targetY, tileWidth, tileHeight, id, gridSize, TILE_GAP, 500);
  }, [id, gridSize]);

  const applyMagneticSnapAndDetectOverlap = useCallback((rawX: number, rawY: number) => {
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;
    const tileRects: TileRect[] = allTilesRef.current.map(t => ({
      id: t.id, x: t.position.x, y: t.position.y, width: t.size.width, height: t.size.height,
    }));

    const snap = getMagneticSnap(rawX, rawY, w, h, tileRects, id, 10);
    onSnapLinesChangeRef.current?.(snap.snapLines);

    const grid = spatialGridRef.current;
    const overlapping = grid.getOverlapping(snap.x, snap.y, w, h, id, 0);
    
    onOverlapDetectedRef.current?.(overlapping);
    return { x: snap.x, y: snap.y };
  }, [id]);

  const applySnapRef = useRef(applyMagneticSnapAndDetectOverlap);
  applySnapRef.current = applyMagneticSnapAndDetectOverlap;

  const clearDragFeedback = useCallback(() => {
    setOverlapFlash(false);
    onOverlapDetectedRef.current?.([]);
    onSnapLinesChangeRef.current?.([]);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    longPressFiredRef.current = false;
    setLongPressReady(false);
  }, []);

  // ========== DRAG START (Mouse) ==========
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // PREVENT interaction on mobile viewports so layout changes don't fire and save!
    if (!canDrag || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
    
    e.preventDefault();
    e.stopPropagation();

    const container = tileRef.current?.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const containerX = e.clientX - rect.left + container.scrollLeft;
    const containerY = e.clientY - rect.top + container.scrollTop;
    
    dragDataRef.current = {
      ...dragDataRef.current,
      offsetX: containerX - positionRef.current.x,
      offsetY: containerY - positionRef.current.y,
      startPosX: positionRef.current.x,
      startPosY: positionRef.current.y,
      isDragging: true,
      isResizing: false,
    };

    setIsDragging(true);
    setCurrentDragPos({ x: positionRef.current.x, y: positionRef.current.y });
    onZIndexChange(id);
    onReorderDragStart?.(id);
  }, [canDrag, id, onZIndexChange, onReorderDragStart]);

  // ========== DRAG START (Touch) ==========
  const handleTouchDragStart = useCallback((e: React.TouchEvent) => {
    // PREVENT interaction on mobile viewports so layout changes don't fire and save!
    if (!canDrag || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    const container = tileRef.current?.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const containerX = touch.clientX - rect.left + container.scrollLeft;
    const containerY = touch.clientY - rect.top + container.scrollTop;
    
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setLongPressReady(true);
      
      dragDataRef.current = {
        ...dragDataRef.current,
        offsetX: containerX - positionRef.current.x,
        offsetY: containerY - positionRef.current.y,
        startPosX: positionRef.current.x,
        startPosY: positionRef.current.y,
        isDragging: true,
        isResizing: false,
      };

      setIsDragging(true);
      setCurrentDragPos({ x: positionRef.current.x, y: positionRef.current.y });
      onZIndexChange(id);
      onReorderDragStart?.(id);

      if (navigator.vibrate) navigator.vibrate(50); 
    }, LONG_PRESS_DURATION);
  }, [canDrag, id, onZIndexChange, onReorderDragStart]);

  const handleTouchDragMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startPos = touchStartPosRef.current;
    if (touch && startPos && !longPressFiredRef.current) {
      const dx = Math.abs(touch.clientX - startPos.x);
      const dy = Math.abs(touch.clientY - startPos.y);
      if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
        cancelLongPress();
      }
    }
  }, [cancelLongPress]);

  const handleTouchDragEnd = useCallback(() => {
    if (!longPressFiredRef.current) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  // ========== RESIZE START (Mouse) ==========
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (!canDrag || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
    e.preventDefault();
    e.stopPropagation();

    dragDataRef.current = {
      ...dragDataRef.current,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: positionRef.current.x,
      startPosY: positionRef.current.y,
      startWidth: sizeRef.current.width,
      startHeight: sizeRef.current.height,
      resizeDir: direction,
      isDragging: false,
      isResizing: true,
    };

    setIsResizing(direction);
    onZIndexChange(id);
  }, [canDrag, id, onZIndexChange]);

  // ========== RESIZE START (Touch) ==========
  const handleTouchResizeStart = useCallback((e: React.TouchEvent, direction: string) => {
    if (!canDrag || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    if (!touch) return;

    dragDataRef.current = {
      ...dragDataRef.current,
      startMouseX: touch.clientX,
      startMouseY: touch.clientY,
      startPosX: positionRef.current.x,
      startPosY: positionRef.current.y,
      startWidth: sizeRef.current.width,
      startHeight: sizeRef.current.height,
      resizeDir: direction,
      isDragging: false,
      isResizing: true,
    };

    setIsResizing(direction);
    onZIndexChange(id);
    if (navigator.vibrate) navigator.vibrate(15);
  }, [canDrag, id, onZIndexChange]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
        const data = dragDataRef.current;
        
        if (data.isDragging) {
          const container = tileRef.current?.parentElement;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const containerX = e.clientX - rect.left + container.scrollLeft;
          const containerY = e.clientY - rect.top + container.scrollTop;
          const rawX = containerX - data.offsetX;
          const rawY = containerY - data.offsetY;

          const containerWidth = tileRef.current?.parentElement?.clientWidth || window.innerWidth;
          const maxVisualX = Math.max(0, containerWidth - sizeRef.current.width);

          const visualX = Math.min(maxVisualX, Math.max(0, rawX));
          const visualY = Math.max(0, rawY);
          const snapped = applySnapRef.current(visualX, visualY);

          dragDataRef.current.currentX = snapped.x;
          dragDataRef.current.currentY = snapped.y;
          setCurrentDragPos({ x: snapped.x, y: snapped.y });
          onReorderDragOver?.(id, rawX, snapped.y);
        }

        if (data.isResizing) {
          const deltaX = e.clientX - data.startMouseX;
          const deltaY = e.clientY - data.startMouseY;
          const dir = data.resizeDir;

          let newWidth = data.startWidth;
          let newHeight = data.startHeight;

          if (dir.includes('e')) newWidth = Math.min(maxWidth, Math.max(minWidth, data.startWidth + deltaX));
          if (dir.includes('w')) {
            const potentialWidth = data.startWidth - deltaX;
            if (potentialWidth >= minWidth && potentialWidth <= maxWidth) newWidth = potentialWidth;
          }
          if (dir.includes('s')) newHeight = Math.min(maxHeight, Math.max(minHeight, data.startHeight + deltaY));
          if (dir.includes('n')) {
            const potentialHeight = data.startHeight - deltaY;
            if (potentialHeight >= minHeight && potentialHeight <= maxHeight) newHeight = potentialHeight;
          }

          newWidth = snapToGrid(newWidth);
          newHeight = snapToGrid(newHeight);

          sizeRef.current = { width: newWidth, height: newHeight };
          onSizeChangeRef.current(id, { width: newWidth, height: newHeight }, dir);
        }
      });
    };

    const handleMouseUp = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (dragDataRef.current.isDragging) {
        const rawDropX = dragDataRef.current.currentX;
        const rawDropY = dragDataRef.current.currentY;

        if (onReorderDrop) {
          onReorderDrop(id, rawDropX, rawDropY);
          setCurrentDragPos({ x: rawDropX, y: rawDropY });
        } else {
          onPositionChangeRef.current(id, { x: rawDropX, y: rawDropY });
          setCurrentDragPos({ x: rawDropX, y: rawDropY });
        }
      }

      if (dragDataRef.current.isResizing) {
        onSizeChangeEndRef.current?.(id, { width: sizeRef.current.width, height: sizeRef.current.height }, dragDataRef.current.resizeDir);
      }

      dragDataRef.current.isDragging = false;
      dragDataRef.current.isResizing = false;
      setIsDragging(false);
      setIsResizing(null);
      setLongPressReady(false);
      clearDragFeedback();
      onReorderDragEnd?.();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      if (!touch) return;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      
      animationFrameRef.current = requestAnimationFrame(() => {
        const data = dragDataRef.current;
        if (data.isDragging) {
          const container = tileRef.current?.parentElement;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const containerX = touch.clientX - rect.left + container.scrollLeft;
          const containerY = touch.clientY - rect.top + container.scrollTop;
          
          const rawX = containerX - data.offsetX;
          const rawY = containerY - data.offsetY;
          const visualX = Math.max(0, rawX);
          const visualY = Math.max(0, rawY);
          const snapped = applySnapRef.current(visualX, visualY);

          dragDataRef.current.currentX = snapped.x;
          dragDataRef.current.currentY = snapped.y;
          setCurrentDragPos({ x: snapped.x, y: snapped.y });
          onReorderDragOver?.(id, rawX, snapped.y);
        }

        if (data.isResizing) {
          const deltaX = touch.clientX - data.startMouseX;
          const deltaY = touch.clientY - data.startMouseY;
          const dir = data.resizeDir;
          let newWidth = data.startWidth;
          let newHeight = data.startHeight;

          if (dir.includes('e')) newWidth = Math.min(maxWidth, Math.max(minWidth, data.startWidth + deltaX));
          if (dir.includes('w')) {
            const pw = data.startWidth - deltaX;
            if (pw >= minWidth && pw <= maxWidth) newWidth = pw;
          }
          if (dir.includes('s')) newHeight = Math.min(maxHeight, Math.max(minHeight, data.startHeight + deltaY));
          if (dir.includes('n')) {
            const ph = data.startHeight - deltaY;
            if (ph >= minHeight && ph <= maxHeight) newHeight = ph;
          }

          newWidth = snapToGrid(newWidth);
          newHeight = snapToGrid(newHeight);
          
          sizeRef.current = { width: newWidth, height: newHeight };
          onSizeChangeRef.current(id, { width: newWidth, height: newHeight }, dir);
        }
      });
    };

    const handleTouchEnd = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (dragDataRef.current.isDragging) {
        const rawDropX = dragDataRef.current.currentX;
        const rawDropY = dragDataRef.current.currentY;

        if (onReorderDrop) {
          onReorderDrop(id, rawDropX, rawDropY);
          setCurrentDragPos({ x: rawDropX, y: rawDropY });
        } else {
          onPositionChangeRef.current(id, { x: rawDropX, y: rawDropY });
          setCurrentDragPos({ x: rawDropX, y: rawDropY });
        }
      }

      if (dragDataRef.current.isResizing) {
        onSizeChangeEndRef.current?.(id, { width: sizeRef.current.width, height: sizeRef.current.height }, dragDataRef.current.resizeDir);
      }

      dragDataRef.current.isDragging = false;
      dragDataRef.current.isResizing = false;
      setIsDragging(false);
      setIsResizing(null);
      setLongPressReady(false);
      clearDragFeedback();
      onReorderDragEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
    } else if (isResizing) {
      const dir = isResizing;
      document.body.style.cursor = 
        (dir.includes('n') && dir.includes('w')) || (dir.includes('s') && dir.includes('e')) ? 'nwse-resize' :
        (dir.includes('n') && dir.includes('e')) || (dir.includes('s') && dir.includes('w')) ? 'nesw-resize' :
        dir.includes('n') || dir.includes('s') ? 'ns-resize' : 'ew-resize';
    }
    document.body.style.userSelect = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    };

  }, [isDragging, isResizing, id, minWidth, minHeight, maxWidth, maxHeight, findNonOverlappingPosition, cancelLongPress, onReorderDragOver, onReorderDrop, onReorderDragEnd]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const isActive = isDragging || isResizing;
  const displayX = isDragging ? currentDragPos.x : position.x;
  const displayY = isDragging ? currentDragPos.y : position.y;
  
  const c = COLOR_MAP[glowColor] || COLOR_MAP.cyan;

  return (
    <>
    {isExpanded && (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" 
        style={{ zIndex: 9998 }}
        onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} 
      />
    )}
    <div
      ref={tileRef}
      className={`${isExpanded ? '!fixed !top-24 !bottom-24 !left-4 !right-4 !w-auto !h-auto z-[9999]' : 'absolute'} rounded-xl border bg-black/90 backdrop-blur-sm max-md:!relative max-md:!left-auto max-md:!top-auto max-md:!w-full max-md:!transform-none ${
        isDropTarget ? 'ring-2 ring-offset-1 ring-offset-black/50 transition-all duration-150'
          : isActive || longPressReady ? 'transition-shadow duration-150'
            : 'transition-all duration-300'
      } ${!canDrag || isExpanded ? 'pointer-events-auto' : ''} ${className}`}
      style={isExpanded ? {
        borderColor: c.primary,
        boxShadow: `0 0 40px rgba(${c.rgb}, 0.4), inset 0 0 20px rgba(${c.rgb}, 0.1)`,
        transform: 'none',
        opacity: 1,
        zIndex: 9999,
      } : {
        left: displayX, top: displayY, width: size.width, height: size.height,
        zIndex: isActive ? zIndex + 1000 : zIndex,
        transform: isDragging ? 'scale(1.02)' : longPressReady ? 'scale(1.01)' : isDragSource ? 'scale(0.97)' : 'scale(1)',
        opacity: isDragSource ? 0.5 : 1,
        transition: isInitialLoad ? 'none' : isCompacting ? 'left 400ms cubic-bezier(0.4, 0, 0.2, 1), top 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease-out, box-shadow 0.2s ease-out' : isDragging ? 'transform 0.1s ease-out, box-shadow 0.15s ease-out' : 'all 0.2s ease-out',
        borderColor: isDropTarget ? `rgba(${c.rgb}, 0.8)` : isActive || longPressReady ? c.primary : `rgba(${c.rgb}, 0.3)`,
        boxShadow: isDropTarget ? `0 0 30px rgba(${c.rgb}, 0.8), inset 0 0 20px rgba(${c.rgb}, 0.05)` : isActive || longPressReady ? `0 0 40px rgba(${c.rgb}, 0.5)` : `0 0 15px rgba(${c.rgb}, 0.1)`,
      }}
      onDragOver={(e) => { if(isExpanded) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onReorderDragOver?.(id, position.x, position.y); }}
      onDragEnter={(e) => { if(isExpanded) return; e.preventDefault(); onReorderDragOver?.(id, position.x, position.y); }}
      onDragLeave={(e) => { if(isExpanded) return; if (!tileRef.current?.contains(e.relatedTarget as Node)) onReorderDragOver?.('', 0, 0); }}
      onDrop={(e) => { if(isExpanded) return; e.preventDefault(); onReorderDrop?.(id, position.x, position.y); }}
    >
      {/* Drop target visual overlay */}
      {isDropTarget && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-40 border-2 border-dashed animate-pulse" style={{ borderColor: `rgba(${c.rgb}, 0.8)` }}>
          <div className="absolute inset-0 rounded-xl" style={{ background: `radial-gradient(ellipse at center, rgba(${c.rgb}, 0.8) 10%, transparent 70%)` }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/90 border rounded-lg font-mono text-xs" style={{ borderColor: `rgba(${c.rgb}, 0.8)`, color: c.primary }}>Drop to swap</div>
        </div>
      )}

      {/* Long-press visual feedback overlay */}
      {longPressReady && !isDragging && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-30 animate-pulse" style={{ boxShadow: `inset 0 0 20px rgba(${c.rgb}, 0.3)` }} />
      )}

      {/* Drag handle header */}
      <div
        className={`absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-3 ${canDrag && !isExpanded ? 'cursor-grab active:cursor-grabbing max-md:cursor-default' : 'cursor-default'} border-b rounded-t-xl transition-all duration-150`}
        style={{
          WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
          borderColor: isDragging || longPressReady ? `rgba(${c.rgb}, 0.6)` : `rgba(${c.rgb}, 0.2)`,
          background: isDragging || longPressReady ? `linear-gradient(to right, rgba(${c.rgb}, 0.3), rgba(${c.rgb}, 0.2), rgba(${c.rgb}, 0.3))` : `linear-gradient(to right, rgba(${c.rgb}, 0.2), transparent, rgba(${c.rgb}, 0.2))`,
        }}
        onMouseDown={(e) => { if (!isExpanded) handleDragStart(e); }} 
        onContextMenu={handleTileContextMenu}
        onTouchStart={(e) => { if (!isExpanded) handleTouchDragStart(e); }}
        onTouchMove={(e) => { if (!isExpanded) handleTouchDragMove(e); }}
        onTouchEnd={(e) => { if (!isExpanded) handleTouchDragEnd(); }}
        onTouchCancel={(e) => { if (!isExpanded) handleTouchDragEnd(); }}
      >
        <div className="flex items-center gap-0.5" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
            className="p-1 rounded hover:bg-gray-500/20 text-gray-500 hover:text-gray-300 transition-all" 
            title={isExpanded ? "Shrink" : "Expand"}
          >
            <ShrinkExpandIcon size={13} />
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 pointer-events-none">
          <div className="px-2 py-1 flex gap-0.5 opacity-40 pointer-events-none">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="flex flex-col gap-0.5"><div className="w-1 h-1 rounded-full bg-gray-400" /><div className="w-1 h-1 rounded-full bg-gray-400" /></div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            {isRefreshing && <div className="w-3 h-3 border-[1.5px] border-gray-600 rounded-full animate-spin" style={{ borderTopColor: c.primary }} />}
            {lastRefreshed && !isDragging && (
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowTimestamp(!showTimestamp); }} className="text-[9px] text-gray-600 font-mono hover:text-gray-400 transition-colors">{formatTimestamp(lastRefreshed)}</button>
                {showTimestamp && <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-black border border-gray-700 rounded text-[9px] text-gray-400 font-mono whitespace-nowrap z-50 shadow-lg">{lastRefreshed.toLocaleString()}</div>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {isDragging && <span className="text-xs text-gray-300 font-mono bg-black/50 px-2 py-0.5 rounded">{Math.round(displayX)}, {Math.round(displayY)}</span>}
          {longPressReady && !isDragging && <span className="text-[9px] font-mono animate-pulse" style={{ color: c.primary }}>Hold...</span>}
          {onClose && !canDelete && (<button onClick={(e) => { e.stopPropagation(); onClose(); }} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all ml-1"><CloseIcon size={14} /></button>)}
        </div>
      </div>
      
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl border border-red-500/50">
          <div className="text-center p-4">
            <TrashSmallIcon size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300 font-mono mb-3">Delete this tile?</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-xs font-mono rounded border border-gray-600 text-gray-400 hover:bg-gray-800 transition-all">Cancel</button>
              <button onClick={() => { setShowDeleteConfirm(false); onClose?.(); }} className="px-3 py-1.5 text-xs font-mono rounded border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-0 top-11 overflow-hidden">
        <div className="w-full h-full p-4 darkwave-scrollbar overflow-hidden md:overflow-auto" style={{ scrollbarWidth: 'thin' }}>
          {children}
        </div>
      </div>

      {/* Resize handles */}
      {canDrag && !isExpanded && (
        <>
          <div className="max-md:hidden absolute top-12 bottom-4 -left-1 w-4 cursor-ew-resize transition-colors rounded-l group" style={{ touchAction: 'none', backgroundColor: isResizing === 'w' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 'w')} onTouchStart={(e) => handleTouchResizeStart(e, 'w')}>
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-10 rounded-full transition-all bg-transparent group-hover:bg-gray-500/50" style={{ backgroundColor: isResizing === 'w' ? c.primary : undefined }} />
          </div>
          <div className="max-md:hidden absolute top-12 bottom-4 -right-1 w-4 cursor-ew-resize transition-colors rounded-r group" style={{ touchAction: 'none', backgroundColor: isResizing === 'e' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 'e')} onTouchStart={(e) => handleTouchResizeStart(e, 'e')}>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-10 rounded-full transition-all bg-transparent group-hover:bg-gray-500/50" style={{ backgroundColor: isResizing === 'e' ? c.primary : undefined }} />
          </div>
          <div className="max-md:hidden absolute left-4 right-4 -bottom-3 h-8 z-50 cursor-ns-resize transition-colors rounded-b group flex items-end justify-center pb-2" style={{ touchAction: 'none', backgroundColor: isResizing === 's' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 's')} onTouchStart={(e) => handleTouchResizeStart(e, 's')}>
            <div className="h-1.5 w-12 rounded-full transition-all bg-gray-500/30 group-hover:bg-gray-500/60" style={{ backgroundColor: isResizing === 's' ? c.primary : undefined }} />
          </div>
          <div className="max-md:hidden absolute left-4 right-4 top-8 h-4 cursor-ns-resize transition-colors group" style={{ touchAction: 'none', backgroundColor: isResizing === 'n' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 'n')} onTouchStart={(e) => handleTouchResizeStart(e, 'n')} />
          <div className="max-md:hidden absolute -bottom-1 -left-1 w-6 h-6 cursor-nesw-resize transition-colors rounded-bl" style={{ touchAction: 'none', backgroundColor: isResizing === 'sw' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 'sw')} onTouchStart={(e) => handleTouchResizeStart(e, 'sw')} />
          <div className="max-md:hidden absolute -bottom-1 -right-1 w-6 h-6 cursor-nwse-resize transition-colors rounded-br" style={{ touchAction: 'none', backgroundColor: isResizing === 'se' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 'se')} onTouchStart={(e) => handleTouchResizeStart(e, 'se')}>
            <svg className="absolute bottom-1.5 right-1.5 w-3 h-3 text-gray-600" viewBox="0 0 10 10"><path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <div className="max-md:hidden absolute -top-1 -left-1 w-6 h-6 cursor-nwse-resize transition-colors rounded-tl" style={{ touchAction: 'none', backgroundColor: isResizing === 'nw' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 'nw')} onTouchStart={(e) => handleTouchResizeStart(e, 'nw')} />
          <div className="max-md:hidden absolute -top-1 -right-1 w-6 h-6 cursor-nesw-resize transition-colors rounded-tr" style={{ touchAction: 'none', backgroundColor: isResizing === 'ne' ? `rgba(${c.rgb}, 0.2)` : undefined }} onMouseDown={(e) => handleResizeStart(e, 'ne')} onTouchStart={(e) => handleTouchResizeStart(e, 'ne')} />
        </>
      )}

      {/* Corner accent indicators */}
      {['top-0 left-0 border-t-2 border-l-2 rounded-tl', 'top-0 right-0 border-t-2 border-r-2 rounded-tr', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br'].map((pos, i) => (
        <div key={i} className={`absolute w-3 h-3 ${pos} pointer-events-none transition-colors duration-150`} style={{ borderColor: isActive ? undefined : 'rgba(100,100,100,0.3)' }} />
      ))}

      {isResizing && (
        <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/90 border rounded text-xs font-mono pointer-events-none shadow-lg z-50" style={{ borderColor: `rgba(${c.rgb}, 0.5)`, color: c.primary }}>
          {Math.round(size.width)} x {Math.round(size.height)}
        </div>
      )}

      {isDragging && <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ backgroundColor: `rgba(${c.rgb}, 0.05)` }} />}
      
      {/* Floating Right-Click Context Menu */}
      {contextMenuPos && createPortal(
        <>
          <div 
            className="fixed inset-0" 
            style={{ zIndex: 99998 }}
            onClick={(e) => { e.stopPropagation(); setContextMenuPos(null); }} 
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenuPos(null); }}
          />
          <div
            className="fixed bg-black/95 backdrop-blur-xl border border-gray-800 rounded-xl p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in duration-200 min-w-[170px]"
            style={{
              zIndex: 99999,
              left: `${contextMenuPos.x}px`,
              top: `${contextMenuPos.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenuView === 'menu' ? (
              <div className="flex flex-col gap-1">
                {onColorChange && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setContextMenuView('color'); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
                    Change Color
                  </button>
                )}
                {onRefresh && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRefresh(); setContextMenuPos(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <RefreshSmallIcon size={14} />
                    Refresh Data
                  </button>
                )}
                {onNewWindow && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onNewWindow(); setContextMenuPos(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <NewWindowIcon size={14} />
                    New Window
                  </button>
                )}
                {onClose && (
                  <>
                    <div className="border-t border-gray-700/50 my-1 mx-1" />
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (canDelete) { setShowDeleteConfirm(true); } else { onClose(); } 
                        setContextMenuPos(null); 
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <TrashSmallIcon size={14} />
                      Delete Tile
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={(e) => { e.stopPropagation(); setContextMenuView('menu'); }} className="p-1 text-gray-400 hover:text-white rounded transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Set Tile Color</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(COLOR_PALETTE).map(([key, { color }]) => {
                    const isActive = glowColor === key;
                    return (
                      <button
                        key={key}
                        onClick={(e) => { e.stopPropagation(); onColorChange?.(id, key as any); setContextMenuPos(null); }}
                        className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ 
                          backgroundColor: `${color}30`, 
                          borderColor: color, 
                          boxShadow: isActive ? `0 0 15px ${color}80` : `0 0 8px ${color}40`
                        }}
                        title={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    );
                  })}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onColorChange?.(id, 'default' as any); setContextMenuPos(null); }} 
                  className="mt-2 py-1.5 px-3 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-gray-800"
                >
                  Reset to Default
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
    </>
  );
};

export default ResizableTile;