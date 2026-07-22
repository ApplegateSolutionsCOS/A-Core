import React, { useState, useMemo } from 'react';
import { CloseIcon, SearchIcon, PlusIcon } from '@/components/icons/Icons';
import {
  WIDGET_CATALOG,
  WIDGET_CATEGORIES,
  LAYOUT_TEMPLATES,
  type CatalogWidget,
  type WidgetCategory,
  type LayoutTemplate,
} from '@/lib/widgetCatalog';
import {
  Server, Users, Activity, AlertTriangle, TrendingUp, Cpu,
  MessageSquare, Rss, Megaphone, Shield, Globe, Wifi, FileText,
  CheckSquare, Calendar, Zap, StickyNote, Clock, LayoutGrid,
  Sparkles, List, BarChart3, Hash, Table2, Layers, Palette,
} from 'lucide-react';
import type { CustomWidgetDefinition } from '@/components/dashboard/CustomWidgetWizard';

// ============================================
// TYPES
// ============================================

interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string; size?: number }>;
  glowColor: string;
  minWidth: number;
  minHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  requiresAdmin?: boolean;
}

interface AddWidgetHubProps {
  isOpen: boolean;
  onClose: () => void;
  // Quick Add
  availableWidgets: WidgetDefinition[];
  onAddWidget: (widget: WidgetDefinition) => void;
  // Widget Library
  onAddCatalogWidget: (widget: CatalogWidget) => void;
  addedWidgetIds?: string[];
  customWidgets?: CustomWidgetDefinition[];
  // Layouts
  onApplyTemplate: (template: LayoutTemplate) => void;
  currentTileCount: number;
  // Custom Widget
  onOpenCustomWizard: () => void;
  // Open full panels
  onOpenWidgetLibrary: () => void;
  onOpenLayoutTemplates: () => void;
}

// ============================================
// ICON MAP
// ============================================

const ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  'server': Server, 'users': Users, 'activity': Activity,
  'alert-triangle': AlertTriangle, 'trending-up': TrendingUp, 'cpu': Cpu,
  'message-square': MessageSquare, 'rss': Rss, 'megaphone': Megaphone,
  'shield': Shield, 'globe': Globe, 'wifi': Wifi, 'file-text': FileText,
  'check-square': CheckSquare, 'calendar': Calendar, 'zap': Zap,
  'sticky-note': StickyNote, 'clock': Clock, 'layout-grid': LayoutGrid,
  'monitor': Server,
};

const getIcon = (iconName: string) => ICON_MAP[iconName] || Activity;

// ============================================
// GLOW COLOR MAPS
// ============================================

const glowColorMap: Record<string, string> = {
  cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  magenta: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-400',
  green: 'border-green-500/40 bg-green-500/10 text-green-400',
  purple: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
  orange: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
};

const glowBorderMap: Record<string, string> = {
  cyan: 'hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]',
  magenta: 'hover:border-fuchsia-500/50 hover:shadow-[0_0_20px_rgba(255,0,255,0.1)]',
  green: 'hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(0,255,0,0.1)]',
  purple: 'hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(128,0,255,0.1)]',
  orange: 'hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(255,153,0,0.1)]',
};

// ============================================
// LAYOUT PREVIEW SVG
// ============================================

const LayoutPreviewSmall: React.FC<{ template: LayoutTemplate; isSelected: boolean }> = ({ template, isSelected }) => {
  const maxX = Math.max(...template.positions.map(p => p.x + p.width));
  const maxY = Math.max(...template.positions.map(p => p.y + p.height));
  const scaleX = 120 / maxX;
  const scaleY = 70 / maxY;
  const scale = Math.min(scaleX, scaleY);

  const glowColors: Record<string, { fill: string; stroke: string }> = {
    cyan: { fill: 'rgba(0,255,255,0.08)', stroke: 'rgba(0,255,255,0.4)' },
    magenta: { fill: 'rgba(255,0,255,0.08)', stroke: 'rgba(255,0,255,0.4)' },
    green: { fill: 'rgba(0,255,0,0.08)', stroke: 'rgba(0,255,0,0.4)' },
    orange: { fill: 'rgba(255,153,0,0.08)', stroke: 'rgba(255,153,0,0.4)' },
    purple: { fill: 'rgba(128,0,255,0.08)', stroke: 'rgba(128,0,255,0.4)' },
  };
  const colors = glowColors[template.glowColor] || glowColors.cyan;

  return (
    <svg width="120" height="70" viewBox="0 0 120 70" className="rounded-lg flex-shrink-0">
      <rect x="0" y="0" width="120" height="70" rx="3" fill="#0a0a0a" stroke={isSelected ? colors.stroke : '#1f2937'} strokeWidth={isSelected ? 1.5 : 0.8} />
      {template.positions.map((pos, i) => {
        const x = 4 + pos.x * scale;
        const y = 4 + pos.y * scale;
        const w = pos.width * scale - 2;
        const h = pos.height * scale - 2;
        return (
          <rect key={i} x={x} y={y} width={w} height={h} rx="2"
            fill={isSelected ? colors.fill : 'rgba(255,255,255,0.03)'}
            stroke={isSelected ? colors.stroke : '#374151'}
            strokeWidth="0.6"
          />
        );
      })}
    </svg>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

type HubTab = 'quick' | 'library' | 'layouts' | 'custom';

const AddWidgetHub: React.FC<AddWidgetHubProps> = ({
  isOpen,
  onClose,
  availableWidgets,
  onAddWidget,
  onAddCatalogWidget,
  addedWidgetIds = [],
  customWidgets = [],
  onApplyTemplate,
  currentTileCount,
  onOpenCustomWizard,
  onOpenWidgetLibrary,
  onOpenLayoutTemplates,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>('quick');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const [appliedTemplate, setAppliedTemplate] = useState(false);

  // Custom widget wizard inline state
  const [wizardStep, setWizardStep] = useState(0);
  const [cwName, setCwName] = useState('');
  const [cwDescription, setCwDescription] = useState('');
  const [cwDataSource, setCwDataSource] = useState('');
  const [cwVisualization, setCwVisualization] = useState('');
  const [cwGlowColor, setCwGlowColor] = useState<'cyan' | 'magenta' | 'green' | 'purple' | 'orange'>('cyan');
  const [cwRefreshInterval, setCwRefreshInterval] = useState(60);

  // Filtered catalog widgets
  const filteredCatalogWidgets = useMemo(() => {
    let widgets = activeCategory === 'all'
      ? WIDGET_CATALOG
      : WIDGET_CATALOG.filter(w => w.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      widgets = widgets.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.tags.some(t => t.includes(q))
      );
    }
    return widgets;
  }, [searchQuery, activeCategory]);

  // Filtered quick-add widgets
  const filteredQuickWidgets = useMemo(() => {
    if (!searchQuery.trim()) return availableWidgets;
    const q = searchQuery.toLowerCase();
    return availableWidgets.filter(w =>
      w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
    );
  }, [searchQuery, availableWidgets]);

  const handleAddCatalog = (widget: CatalogWidget) => {
    onAddCatalogWidget(widget);
    setAddedFeedback(widget.id);
    setTimeout(() => setAddedFeedback(null), 1500);
  };

  const handleApplyTemplate = () => {
    const template = LAYOUT_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      onApplyTemplate(template);
      setAppliedTemplate(true);
      setTimeout(() => {
        setAppliedTemplate(false);
        onClose();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  const TABS: { id: HubTab; label: string; icon: React.FC<{ className?: string; size?: number }>; color: string; count?: number }[] = [
    { id: 'quick', label: 'Quick Add', icon: Zap, color: 'cyan', count: availableWidgets.length },
    { id: 'library', label: 'Widget Library', icon: LayoutGrid, color: 'purple', count: WIDGET_CATALOG.length },
    { id: 'layouts', label: 'Layouts', icon: Layers, color: 'green', count: LAYOUT_TEMPLATES.length },
    { id: 'custom', label: 'Create Custom', icon: Sparkles, color: 'orange' },
  ];

  const tabColorMap: Record<string, { active: string; inactive: string }> = {
    cyan: { active: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400', inactive: 'text-gray-500 hover:text-gray-300 hover:border-gray-700' },
    purple: { active: 'bg-purple-500/10 border-purple-500/40 text-purple-400', inactive: 'text-gray-500 hover:text-gray-300 hover:border-gray-700' },
    green: { active: 'bg-green-500/10 border-green-500/40 text-green-400', inactive: 'text-gray-500 hover:text-gray-300 hover:border-gray-700' },
    orange: { active: 'bg-orange-500/10 border-orange-500/40 text-orange-400', inactive: 'text-gray-500 hover:text-gray-300 hover:border-gray-700' },
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border border-cyan-500/40 rounded-2xl w-full max-w-4xl mx-4 shadow-[0_0_60px_rgba(0,255,255,0.15)] max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-cyan-500/20 p-5 bg-gradient-to-r from-cyan-950/20 to-black rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center">
                <PlusIcon size={20} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-mono">Add Widget</h2>
                <p className="text-xs text-gray-500 font-mono">
                  {activeTab === 'quick' && 'Add a built-in widget to your dashboard'}
                  {activeTab === 'library' && `Browse ${WIDGET_CATALOG.length} widgets from the catalog`}
                  {activeTab === 'layouts' && `Apply a layout template to your ${currentTileCount} tiles`}
                  {activeTab === 'custom' && 'Create a custom widget with your own data source'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all">
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colors = tabColorMap[tab.color];
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono border transition-all ${
                    isActive ? colors.active : `border-gray-800 ${colors.inactive}`
                  }`}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                      isActive ? 'bg-white/10' : 'bg-gray-800 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search bar (for Quick Add and Library tabs) */}
          {(activeTab === 'quick' || activeTab === 'library') && (
            <div className="relative mt-3">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'quick' ? 'Search widgets...' : 'Search catalog by name, category, or tag...'}
                className="w-full bg-gray-950/80 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-600"
              />
            </div>
          )}

          {/* Category filters (Library tab only) */}
          {activeTab === 'library' && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono border whitespace-nowrap transition-all ${
                  activeCategory === 'all'
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                All ({WIDGET_CATALOG.length})
              </button>
              {WIDGET_CATEGORIES.map(cat => {
                const count = WIDGET_CATALOG.filter(w => w.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono border whitespace-nowrap transition-all ${
                      activeCategory === cat.id
                        ? `${cat.bgColor} ${cat.borderColor} ${cat.iconColor}`
                        : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ─── QUICK ADD TAB ─── */}
          {activeTab === 'quick' && (
            <div className="grid md:grid-cols-2 gap-3">
              {filteredQuickWidgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <button
                    key={widget.id}
                    onClick={() => { onAddWidget(widget); onClose(); }}
                    className={`flex items-start gap-3 p-4 rounded-xl border border-gray-800 bg-gray-950/50 text-left transition-all duration-200 ${glowBorderMap[widget.glowColor] || ''}`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${glowColorMap[widget.glowColor] || ''}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-mono font-medium text-sm truncate">{widget.name}</h4>
                        {widget.requiresAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-orange-500/10 border border-orange-500/30 text-orange-400 flex-shrink-0">ADMIN</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs font-mono mt-0.5 line-clamp-2">{widget.description}</p>
                    </div>
                  </button>
                );
              })}
              {filteredQuickWidgets.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
                  <SearchIcon size={32} className="text-gray-700 mb-3" />
                  <p className="text-gray-500 font-mono text-sm">No widgets match your search</p>
                </div>
              )}
            </div>
          )}

          {/* ─── WIDGET LIBRARY TAB ─── */}
          {activeTab === 'library' && (
            <div className="space-y-3">
              {/* Open full library button */}
              <button
                onClick={() => { onClose(); setTimeout(() => onOpenWidgetLibrary(), 100); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-purple-500/40 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 hover:from-purple-500/10 hover:to-cyan-500/10 hover:border-purple-500/60 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LayoutGrid className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-mono font-medium text-white group-hover:text-purple-300 transition-colors">Open Full Widget Library</p>
                  <p className="text-[10px] font-mono text-gray-500">Slide-out panel with advanced search and custom widget creation</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-purple-400 transition-colors flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Inline catalog list */}
              {filteredCatalogWidgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <SearchIcon size={32} className="text-gray-700 mb-3" />
                  <p className="text-gray-500 font-mono text-sm">No widgets found</p>
                </div>
              ) : (
                filteredCatalogWidgets.map(widget => {
                  const Icon = getIcon(widget.icon);
                  const justAdded = addedFeedback === widget.id;
                  return (
                    <div key={widget.id} className={`rounded-xl border border-gray-800 bg-gray-950/50 p-3 transition-all duration-200 ${glowBorderMap[widget.glowColor] || ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${glowColorMap[widget.glowColor] || ''}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-mono font-medium text-sm truncate">{widget.name}</h3>
                          <p className="text-gray-500 font-mono text-[10px] line-clamp-1">{widget.description}</p>
                        </div>
                        {justAdded ? (
                          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/40 text-green-400 font-mono text-[10px]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                            Added
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddCatalog(widget)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 font-mono text-[10px] transition-all flex-shrink-0"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── LAYOUTS TAB ─── */}
          {activeTab === 'layouts' && (
            <div className="space-y-4">
              {/* Open full layouts modal button */}
              <button
                onClick={() => { onClose(); setTimeout(() => onOpenLayoutTemplates(), 100); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-green-500/40 bg-gradient-to-r from-green-500/5 to-cyan-500/5 hover:from-green-500/10 hover:to-cyan-500/10 hover:border-green-500/60 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-mono font-medium text-white group-hover:text-green-300 transition-colors">Open Full Layout Templates</p>
                  <p className="text-[10px] font-mono text-gray-500">Full modal with built-in templates and community shared layouts</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-green-400 transition-colors flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {LAYOUT_TEMPLATES.map(template => {
                  const isSelected = selectedTemplate === template.id;
                  const glowTextMap: Record<string, string> = {
                    cyan: 'text-cyan-400', magenta: 'text-fuchsia-400', green: 'text-green-400',
                    orange: 'text-orange-400', purple: 'text-purple-400',
                  };
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                        isSelected
                          ? `border-${template.glowColor === 'magenta' ? 'fuchsia' : template.glowColor}-500/50 bg-gray-950/80 shadow-[0_0_16px_rgba(0,255,255,0.1)]`
                          : 'border-gray-800 bg-gray-950/30 hover:border-gray-700'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><polyline points="20,6 9,17 4,12" /></svg>
                        </div>
                      )}
                      <div className="flex justify-center mb-2">
                        <LayoutPreviewSmall template={template} isSelected={isSelected} />
                      </div>
                      <h3 className={`font-mono font-medium text-xs ${isSelected ? (glowTextMap[template.glowColor] || 'text-cyan-400') : 'text-white'}`}>
                        {template.name}
                      </h3>
                      <p className="text-gray-600 font-mono text-[9px] mt-0.5 line-clamp-1">{template.description}</p>
                      <span className="text-[8px] font-mono text-gray-700 mt-1 inline-block">{template.positions.length} slots</span>
                    </button>
                  );
                })}
              </div>

              {selectedTemplate && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                  <p className="text-xs text-gray-400 font-mono">
                    Selected: <span className="text-cyan-400">{LAYOUT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}</span>
                  </p>
                  {appliedTemplate ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/40 text-green-400 font-mono text-xs">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                      Applied!
                    </div>
                  ) : (
                    <button
                      onClick={handleApplyTemplate}
                      className="px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 font-mono text-xs transition-all"
                    >
                      Apply Template
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── CREATE CUSTOM TAB ─── */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              {/* Open full wizard button */}
              <button
                onClick={() => { onClose(); setTimeout(() => onOpenCustomWizard(), 100); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-orange-500/40 bg-gradient-to-r from-orange-500/5 to-purple-500/5 hover:from-orange-500/10 hover:to-purple-500/10 hover:border-orange-500/60 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-base font-mono font-medium text-white group-hover:text-orange-300 transition-colors">Open Custom Widget Wizard</p>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    Step-by-step wizard to create a custom widget with your own data source and visualization type
                  </p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-orange-400 transition-colors flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Quick-create inline form */}
              <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-5">
                <h3 className="text-sm font-mono font-medium text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  Quick Create
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">Widget Name</label>
                    <input
                      type="text"
                      value={cwName}
                      onChange={e => setCwName(e.target.value)}
                      placeholder="e.g., Task Completion Rate"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50 placeholder:text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">Data Source</label>
                    <select
                      value={cwDataSource}
                      onChange={e => setCwDataSource(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="">Select source...</option>
                      <option value="tasks">Tasks</option>
                      <option value="calendar">Calendar</option>
                      <option value="messages">Messages</option>
                      <option value="miniapp">MiniApp Data</option>
                      <option value="api">Custom API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">Visualization</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'list', icon: List, label: 'List' },
                        { id: 'chart', icon: BarChart3, label: 'Chart' },
                        { id: 'counter', icon: Hash, label: 'Counter' },
                        { id: 'table', icon: Table2, label: 'Table' },
                      ].map(viz => {
                        const VizIcon = viz.icon;
                        return (
                          <button
                            key={viz.id}
                            onClick={() => setCwVisualization(viz.id)}
                            className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                              cwVisualization === viz.id
                                ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                                : 'border-gray-800 text-gray-500 hover:border-gray-700'
                            }`}
                          >
                            <VizIcon className="w-4 h-4" />
                            <span className="text-[9px] font-mono">{viz.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">
                      <Palette className="w-3 h-3 inline mr-1" />Color
                    </label>
                    <div className="flex gap-2">
                      {(['cyan', 'magenta', 'green', 'purple', 'orange'] as const).map(c => (
                        <button
                          key={c}
                          onClick={() => setCwGlowColor(c)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            cwGlowColor === c
                              ? `${glowColorMap[c]} scale-110`
                              : 'border-gray-700 bg-gray-900 opacity-50 hover:opacity-80'
                          }`}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!cwName.trim() || !cwDataSource || !cwVisualization) return;
                    onOpenCustomWizard();
                    onClose();
                  }}
                  disabled={!cwName.trim() || !cwDataSource || !cwVisualization}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/50 text-orange-400 hover:from-orange-500/30 hover:to-purple-500/30 font-mono text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  Continue in Wizard
                </button>
              </div>

              {/* Existing custom widgets */}
              {customWidgets.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                  <h3 className="text-xs font-mono font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Your Custom Widgets ({customWidgets.length})
                  </h3>
                  <div className="space-y-2">
                    {customWidgets.map(cw => (
                      <div key={cw.id} className="flex items-center gap-3 p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${glowColorMap[cw.glowColor] || ''}`}>
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-mono text-xs truncate">{cw.name}</p>
                          <p className="text-gray-600 font-mono text-[9px]">{cw.dataSource} / {cw.visualization}</p>
                        </div>
                        <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded">CUSTOM</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-cyan-500/20 p-4 bg-black/80 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-600 font-mono">
              {activeTab === 'quick' && `${filteredQuickWidgets.length} widgets available`}
              {activeTab === 'library' && `${filteredCatalogWidgets.length} of ${WIDGET_CATALOG.length} catalog widgets`}
              {activeTab === 'layouts' && `${LAYOUT_TEMPLATES.length} layout templates`}
              {activeTab === 'custom' && `${customWidgets.length} custom widgets created`}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 font-mono text-xs transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWidgetHub;
