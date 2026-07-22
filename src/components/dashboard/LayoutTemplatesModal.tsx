import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon, SearchIcon } from '@/components/icons/Icons';
import { LAYOUT_TEMPLATES, type LayoutTemplate } from '@/lib/widgetCatalog';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export interface SharedTemplate {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  preview_thumbnail: string;
  tags: string[];
  is_public: boolean;
  use_count: number;
  config_json: any;
  created_at: string;
  updated_at: string;
}

interface LayoutTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: LayoutTemplate) => void;
  onCloneSharedTemplate?: (config: any) => void;
  currentTileCount: number;
  userId?: string | null;
}

// ============================================
// SVG PREVIEW THUMBNAIL — Built-in Templates
// ============================================

const LayoutPreview: React.FC<{ template: LayoutTemplate; isSelected: boolean }> = ({ template, isSelected }) => {
  const maxX = Math.max(...template.positions.map(p => p.x + p.width));
  const maxY = Math.max(...template.positions.map(p => p.y + p.height));
  const scaleX = 150 / maxX;
  const scaleY = 90 / maxY;
  const scale = Math.min(scaleX, scaleY);

  const glowColors: Record<string, { fill: string; stroke: string; glow: string }> = {
    cyan: { fill: 'rgba(0,255,255,0.08)', stroke: 'rgba(0,255,255,0.4)', glow: 'rgba(0,255,255,0.15)' },
    magenta: { fill: 'rgba(255,0,255,0.08)', stroke: 'rgba(255,0,255,0.4)', glow: 'rgba(255,0,255,0.15)' },
    green: { fill: 'rgba(0,255,0,0.08)', stroke: 'rgba(0,255,0,0.4)', glow: 'rgba(0,255,0,0.15)' },
    orange: { fill: 'rgba(255,153,0,0.08)', stroke: 'rgba(255,153,0,0.4)', glow: 'rgba(255,153,0,0.15)' },
    purple: { fill: 'rgba(128,0,255,0.08)', stroke: 'rgba(128,0,255,0.4)', glow: 'rgba(128,0,255,0.15)' },
  };

  const colors = glowColors[template.glowColor] || glowColors.cyan;

  return (
    <svg width="160" height="100" viewBox="0 0 160 100" className="rounded-lg">
      <rect x="0" y="0" width="160" height="100" rx="4" fill="#0a0a0a" stroke={isSelected ? colors.stroke : '#1f2937'} strokeWidth={isSelected ? 2 : 1} />
      {Array.from({ length: 8 }).map((_, i) =>
        Array.from({ length: 5 }).map((_, j) => (
          <circle key={`${i}-${j}`} cx={10 + i * 20} cy={10 + j * 20} r="0.5" fill="#1f2937" />
        ))
      )}
      {template.positions.map((pos, i) => {
        const x = 5 + pos.x * scale;
        const y = 5 + pos.y * scale;
        const w = pos.width * scale - 2;
        const h = pos.height * scale - 2;
        return (
          <g key={i}>
            {isSelected && (
              <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx="3" fill={colors.glow} />
            )}
            <rect
              x={x} y={y} width={w} height={h} rx="2"
              fill={isSelected ? colors.fill : 'rgba(255,255,255,0.03)'}
              stroke={isSelected ? colors.stroke : '#374151'}
              strokeWidth="0.8"
            />
            <rect x={x + 2} y={y + 2} width={w * 0.4} height="3" rx="1" fill={isSelected ? colors.stroke : '#374151'} opacity="0.5" />
            <rect x={x + 2} y={y + 8} width={w * 0.7} height="1.5" rx="0.5" fill="#1f2937" />
            <rect x={x + 2} y={y + 12} width={w * 0.5} height="1.5" rx="0.5" fill="#1f2937" />
          </g>
        );
      })}
    </svg>
  );
};

// ============================================
// SVG PREVIEW THUMBNAIL — Shared Templates
// Generates a visual preview from config_json tile positions
// ============================================

const SharedTemplatePreview: React.FC<{ template: SharedTemplate }> = ({ template }) => {
  // If we have a stored SVG preview_thumbnail, render it directly
  if (template.preview_thumbnail && template.preview_thumbnail.startsWith('<svg')) {
    return (
      <div
        className="w-[120px] h-[75px] rounded-lg overflow-hidden flex-shrink-0 border border-gray-800"
        dangerouslySetInnerHTML={{ __html: template.preview_thumbnail }}
      />
    );
  }

  // Otherwise generate from config_json tile positions
  const tiles = extractTilesFromConfig(template.config_json);
  if (tiles.length === 0) {
    // Fallback: generic grid icon
    return (
      <div className="w-[120px] h-[75px] rounded-lg flex-shrink-0 border border-gray-800 bg-gray-950 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500/40">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
    );
  }

  // Calculate bounds for scaling
  const maxX = Math.max(...tiles.map(t => t.x + t.w), 1);
  const maxY = Math.max(...tiles.map(t => t.y + t.h), 1);
  const scaleX = 110 / maxX;
  const scaleY = 65 / maxY;
  const scale = Math.min(scaleX, scaleY);

  const tileColors = [
    { fill: 'rgba(0,255,255,0.12)', stroke: 'rgba(0,255,255,0.35)' },
    { fill: 'rgba(255,0,255,0.12)', stroke: 'rgba(255,0,255,0.35)' },
    { fill: 'rgba(0,255,0,0.12)', stroke: 'rgba(0,255,0,0.35)' },
    { fill: 'rgba(128,0,255,0.12)', stroke: 'rgba(128,0,255,0.35)' },
    { fill: 'rgba(255,153,0,0.12)', stroke: 'rgba(255,153,0,0.35)' },
    { fill: 'rgba(59,130,246,0.12)', stroke: 'rgba(59,130,246,0.35)' },
  ];

  return (
    <svg width="120" height="75" viewBox="0 0 120 75" className="rounded-lg flex-shrink-0 border border-gray-800">
      <rect x="0" y="0" width="120" height="75" rx="4" fill="#050505" />
      {/* Dot grid background */}
      {Array.from({ length: 6 }).map((_, i) =>
        Array.from({ length: 4 }).map((_, j) => (
          <circle key={`d${i}-${j}`} cx={10 + i * 20} cy={10 + j * 18} r="0.4" fill="#1a1a2e" />
        ))
      )}
      {/* Tile rectangles */}
      {tiles.map((tile, i) => {
        const x = 5 + tile.x * scale;
        const y = 5 + tile.y * scale;
        const w = Math.max(tile.w * scale - 2, 4);
        const h = Math.max(tile.h * scale - 2, 4);
        const color = tileColors[i % tileColors.length];
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="2" fill={color.fill} stroke={color.stroke} strokeWidth="0.7" />
            {/* Mini title bar */}
            <rect x={x + 2} y={y + 2} width={Math.min(w * 0.45, w - 4)} height="2.5" rx="0.8" fill={color.stroke} opacity="0.5" />
            {/* Content lines */}
            {h > 12 && <rect x={x + 2} y={y + 7} width={Math.min(w * 0.65, w - 4)} height="1.2" rx="0.4" fill="#1f2937" />}
            {h > 18 && <rect x={x + 2} y={y + 10.5} width={Math.min(w * 0.5, w - 4)} height="1.2" rx="0.4" fill="#1f2937" />}
          </g>
        );
      })}
    </svg>
  );
};

// Extract tile positions from a config_json object
function extractTilesFromConfig(config: any): { x: number; y: number; w: number; h: number }[] {
  if (!config) return [];
  try {
    // config_json may have tabs[].tiles[] structure
    const tabs = config.tabs || [];
    for (const tab of tabs) {
      const tiles = tab.tiles || [];
      if (tiles.length > 0) {
        return tiles.map((t: any) => ({
          x: t.position?.x || 0,
          y: t.position?.y || 0,
          w: t.size?.width || 200,
          h: t.size?.height || 150,
        }));
      }
    }
    // Fallback: config might be a flat array of tiles
    if (Array.isArray(config)) {
      return config.map((t: any) => ({
        x: t.position?.x || 0,
        y: t.position?.y || 0,
        w: t.size?.width || 200,
        h: t.size?.height || 150,
      }));
    }
  } catch (_e) {}
  return [];
}

// ============================================
// Generate SVG string from tile config (for storing as preview_thumbnail)
// ============================================
export function generatePreviewSvg(configJson: any): string {
  const tiles = extractTilesFromConfig(configJson);
  if (tiles.length === 0) return '';

  const maxX = Math.max(...tiles.map(t => t.x + t.w), 1);
  const maxY = Math.max(...tiles.map(t => t.y + t.h), 1);
  const scaleX = 110 / maxX;
  const scaleY = 65 / maxY;
  const scale = Math.min(scaleX, scaleY);

  const tileColors = [
    { fill: 'rgba(0,255,255,0.12)', stroke: 'rgba(0,255,255,0.35)' },
    { fill: 'rgba(255,0,255,0.12)', stroke: 'rgba(255,0,255,0.35)' },
    { fill: 'rgba(0,255,0,0.12)', stroke: 'rgba(0,255,0,0.35)' },
    { fill: 'rgba(128,0,255,0.12)', stroke: 'rgba(128,0,255,0.35)' },
    { fill: 'rgba(255,153,0,0.12)', stroke: 'rgba(255,153,0,0.35)' },
    { fill: 'rgba(59,130,246,0.12)', stroke: 'rgba(59,130,246,0.35)' },
  ];

  let svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="75" viewBox="0 0 120 75">';
  svgContent += '<rect x="0" y="0" width="120" height="75" rx="4" fill="#050505"/>';

  // Dot grid
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      svgContent += `<circle cx="${10 + i * 20}" cy="${10 + j * 18}" r="0.4" fill="#1a1a2e"/>`;
    }
  }

  // Tiles
  tiles.forEach((tile, i) => {
    const x = 5 + tile.x * scale;
    const y = 5 + tile.y * scale;
    const w = Math.max(tile.w * scale - 2, 4);
    const h = Math.max(tile.h * scale - 2, 4);
    const color = tileColors[i % tileColors.length];

    svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${color.fill}" stroke="${color.stroke}" stroke-width="0.7"/>`;
    svgContent += `<rect x="${x + 2}" y="${y + 2}" width="${Math.min(w * 0.45, w - 4)}" height="2.5" rx="0.8" fill="${color.stroke}" opacity="0.5"/>`;
    if (h > 12) svgContent += `<rect x="${x + 2}" y="${y + 7}" width="${Math.min(w * 0.65, w - 4)}" height="1.2" rx="0.4" fill="#1f2937"/>`;
    if (h > 18) svgContent += `<rect x="${x + 2}" y="${y + 10.5}" width="${Math.min(w * 0.5, w - 4)}" height="1.2" rx="0.4" fill="#1f2937"/>`;
  });

  svgContent += '</svg>';
  return svgContent;
}

// ============================================
// SHARED TEMPLATE CARD
// ============================================

const SharedTemplateCard: React.FC<{
  template: SharedTemplate;
  isCloning: boolean;
  onClone: (template: SharedTemplate) => void;
}> = ({ template, isCloning, onClone }) => {
  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4 hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(128,0,255,0.08)] transition-all">
      <div className="flex items-start gap-3">
        {/* SVG Preview Thumbnail */}
        <SharedTemplatePreview template={template} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-mono font-medium text-sm truncate">{template.name}</h3>
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center gap-1">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              SHARED
            </span>
          </div>
          <p className="text-gray-500 font-mono text-xs leading-relaxed line-clamp-2">{template.description || 'No description provided'}</p>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {template.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-[9px] font-mono text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
              {template.use_count} {template.use_count === 1 ? 'use' : 'uses'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              {extractTilesFromConfig(template.config_json).length} tiles
            </span>
            <span className="text-[10px] font-mono text-gray-700">{timeAgo(template.created_at)}</span>
          </div>
        </div>

        {/* Clone button */}
        <button
          onClick={() => onClone(template)}
          disabled={isCloning}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/40 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/60 font-mono text-xs transition-all disabled:opacity-50"
        >
          {isCloning ? (
            <div className="w-3.5 h-3.5 border-[1.5px] border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          Clone
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const LayoutTemplatesModal: React.FC<LayoutTemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  onCloneSharedTemplate,
  currentTileCount,
  userId,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [activeSection, setActiveSection] = useState<'builtin' | 'discover'>('builtin');

  // Discover state
  const [sharedTemplates, setSharedTemplates] = useState<SharedTemplate[]>([]);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [clonedId, setClonedId] = useState<string | null>(null);

  // Fetch public templates via dashboard-config edge function
  const fetchSharedTemplates = useCallback(async () => {
    setIsLoadingShared(true);
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-config', {
        body: { action: 'get_public_templates', search: searchQuery || null, limit: 20 }
      });
      if (!error && data?.success && data.templates) {
        setSharedTemplates(Array.isArray(data.templates) ? data.templates : []);
      } else {
        setSharedTemplates([]);
      }
    } catch (e) {
      console.error('Failed to fetch shared templates:', e);
      setSharedTemplates([]);
    }
    setIsLoadingShared(false);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen && activeSection === 'discover') {
      fetchSharedTemplates();
    }
  }, [isOpen, activeSection, fetchSharedTemplates]);

  const handleApply = () => {
    const template = LAYOUT_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      onApplyTemplate(template);
      setApplied(true);
      setTimeout(() => {
        setApplied(false);
        onClose();
      }, 1000);
    }
  };

  const handleCloneTemplate = async (template: SharedTemplate) => {
    setCloningId(template.id);
    try {
      // Increment use_count via edge function
      try {
        await supabase.functions.invoke('dashboard-config', {
          body: { action: 'clone_template', template_id: template.id }
        });
      } catch { /* silent - use_count increment is best-effort */ }

      // Apply the config
      if (onCloneSharedTemplate && template.config_json) {
        onCloneSharedTemplate(template.config_json);
      }

      setClonedId(template.id);
      setTimeout(() => setClonedId(null), 2000);

      // Update local use_count
      setSharedTemplates(prev => prev.map(t =>
        t.id === template.id ? { ...t, use_count: t.use_count + 1 } : t
      ));
    } catch (e) {
      console.error('Failed to clone template:', e);
    }
    setCloningId(null);
  };

  if (!isOpen) return null;

  const glowBorderMap: Record<string, string> = {
    cyan: 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.15)]',
    magenta: 'border-fuchsia-500/50 shadow-[0_0_20px_rgba(255,0,255,0.15)]',
    green: 'border-green-500/50 shadow-[0_0_20px_rgba(0,255,0,0.15)]',
    orange: 'border-orange-500/50 shadow-[0_0_20px_rgba(255,153,0,0.15)]',
    purple: 'border-purple-500/50 shadow-[0_0_20px_rgba(128,0,255,0.15)]',
  };

  const glowTextMap: Record<string, string> = {
    cyan: 'text-cyan-400',
    magenta: 'text-fuchsia-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-black border border-cyan-500/40 rounded-2xl w-full max-w-3xl mx-4 shadow-[0_0_60px_rgba(0,255,255,0.15)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-cyan-500/20 p-6 bg-gradient-to-r from-cyan-950/20 to-black rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white font-mono flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                Layout Templates
              </h2>
              <p className="text-sm text-gray-500 font-mono mt-1">
                {activeSection === 'builtin'
                  ? `Choose a layout to rearrange your ${currentTileCount} tile${currentTileCount !== 1 ? 's' : ''}`
                  : 'Discover and clone dashboard layouts shared by other users'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('builtin')}
              className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all ${
                activeSection === 'builtin'
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                  : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Built-in ({LAYOUT_TEMPLATES.length})
              </div>
            </button>
            <button
              onClick={() => setActiveSection('discover')}
              className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all ${
                activeSection === 'discover'
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                  : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Discover Templates
                {sharedTemplates.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px]">
                    {sharedTemplates.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ─── BUILT-IN TEMPLATES ─── */}
          {activeSection === 'builtin' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {LAYOUT_TEMPLATES.map(template => {
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? `${glowBorderMap[template.glowColor]} bg-gray-950/80`
                          : 'border-gray-800 bg-gray-950/30 hover:border-gray-700 hover:bg-gray-950/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                            <polyline points="20,6 9,17 4,12" />
                          </svg>
                        </div>
                      )}
                      <div className="flex justify-center mb-3">
                        <LayoutPreview template={template} isSelected={isSelected} />
                      </div>
                      <h3 className={`font-mono font-medium text-sm ${isSelected ? (glowTextMap[template.glowColor] || 'text-cyan-400') : 'text-white'}`}>
                        {template.name}
                      </h3>
                      <p className="text-gray-500 font-mono text-[10px] mt-1 leading-relaxed">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-mono text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                          {template.positions.length} slots
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3 rounded-lg border border-gray-800 bg-gray-950/30">
                <p className="text-[10px] text-gray-600 font-mono">
                  Templates reposition existing tiles to match the selected layout pattern. If you have more tiles than slots, extra tiles will be stacked below. If fewer, empty slots will be left for new widgets.
                </p>
              </div>
            </>
          )}

          {/* ─── DISCOVER TEMPLATES ─── */}
          {activeSection === 'discover' && (
            <>
              {/* Search bar */}
              <div className="relative mb-4">
                <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSharedTemplates()}
                  placeholder="Search shared templates by name, description, or tag..."
                  className="w-full bg-gray-950/80 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600"
                />
              </div>

              {isLoadingShared ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mb-4" />
                  <p className="text-gray-500 font-mono text-sm">Loading shared templates...</p>
                </div>
              ) : sharedTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-mono text-sm font-medium">No shared templates yet</p>
                  <p className="text-gray-600 font-mono text-xs mt-1 max-w-sm">
                    Be the first to publish a dashboard template! Use the "Publish as Template" option in the export menu to share your layout.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedTemplates.map(template => (
                    <div key={template.id} className="relative">
                      {clonedId === template.id && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/40 rounded-lg text-green-400 font-mono text-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20,6 9,17 4,12" />
                            </svg>
                            Cloned successfully!
                          </div>
                        </div>
                      )}
                      <SharedTemplateCard
                        template={template}
                        isCloning={cloningId === template.id}
                        onClone={handleCloneTemplate}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="mt-4 p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                <p className="text-[10px] text-gray-500 font-mono">
                  Cloning a template imports the complete dashboard configuration including tile positions, sizes, and widget assignments. Your existing dashboard will be replaced. You can always reset to defaults.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-cyan-500/20 p-4 bg-black/80 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 font-mono">
              {activeSection === 'builtin'
                ? (selectedTemplate ? `Selected: ${LAYOUT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}` : 'Select a template to apply')
                : `${sharedTemplates.length} shared template${sharedTemplates.length !== 1 ? 's' : ''} available`
              }
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 font-mono text-xs transition-all"
              >
                Cancel
              </button>
              {activeSection === 'builtin' && (
                <>
                  {applied ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/40 text-green-400 font-mono text-xs">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                      Applied!
                    </div>
                  ) : (
                    <button
                      onClick={handleApply}
                      disabled={!selectedTemplate}
                      className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/60 font-mono text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Apply Template
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutTemplatesModal;
