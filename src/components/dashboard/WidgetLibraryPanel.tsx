import React, { useState, useMemo } from 'react';
import { CloseIcon, SearchIcon } from '@/components/icons/Icons';
import {
  WIDGET_CATALOG,
  WIDGET_CATEGORIES,
  type CatalogWidget,
  type WidgetCategory,
} from '@/lib/widgetCatalog';
import {
  Server, Users, Activity, AlertTriangle, TrendingUp, Cpu,
  MessageSquare, Rss, Megaphone, Shield, Globe, Wifi, FileText,
  CheckSquare, Calendar, Zap, StickyNote, Clock, LayoutGrid,
  Sparkles, List, BarChart3, Hash, Table2,
} from 'lucide-react';
import CustomWidgetWizard, { type CustomWidgetDefinition } from '@/components/dashboard/CustomWidgetWizard';

// Map icon string names to lucide components
const ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  'server': Server,
  'users': Users,
  'activity': Activity,
  'alert-triangle': AlertTriangle,
  'trending-up': TrendingUp,
  'cpu': Cpu,
  'message-square': MessageSquare,
  'rss': Rss,
  'megaphone': Megaphone,
  'shield': Shield,
  'globe': Globe,
  'wifi': Wifi,
  'file-text': FileText,
  'check-square': CheckSquare,
  'calendar': Calendar,
  'zap': Zap,
  'sticky-note': StickyNote,
  'clock': Clock,
  'layout-grid': LayoutGrid,
  'monitor': Server,
};

// Map visualization type to icon
const VIZ_ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  'list': List,
  'chart': BarChart3,
  'counter': Hash,
  'table': Table2,
};

const getIcon = (iconName: string) => ICON_MAP[iconName] || Activity;

interface WidgetLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: CatalogWidget) => void;
  onSaveCustomWidget?: (widget: CustomWidgetDefinition) => void;
  addedWidgetIds?: string[];
  customWidgets?: CustomWidgetDefinition[];
}

const WidgetLibraryPanel: React.FC<WidgetLibraryPanelProps> = ({
  isOpen,
  onClose,
  onAddWidget,
  onSaveCustomWidget,
  addedWidgetIds = [],
  customWidgets = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | 'all' | 'custom'>('all');
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Convert custom widgets to CatalogWidget-like entries for display
  const customCatalogWidgets: CatalogWidget[] = useMemo(() => {
    return customWidgets.map(cw => ({
      id: cw.id,
      name: cw.name,
      description: cw.description,
      category: 'productivity' as WidgetCategory,
      icon: cw.visualization === 'chart' ? 'trending-up' : cw.visualization === 'counter' ? 'activity' : cw.visualization === 'table' ? 'layout-grid' : 'check-square',
      glowColor: cw.glowColor,
      previewLines: [`Source: ${cw.dataSource}`, `Type: ${cw.visualization}`],
      defaultWidth: cw.visualization === 'counter' ? 300 : 450,
      defaultHeight: cw.visualization === 'counter' ? 200 : 300,
      minWidth: 250,
      minHeight: 150,
      tags: ['custom', cw.dataSource, cw.visualization],
    }));
  }, [customWidgets]);

  const allWidgets = useMemo(() => [...WIDGET_CATALOG, ...customCatalogWidgets], [customCatalogWidgets]);

  const filteredWidgets = useMemo(() => {
    let widgets = activeCategory === 'custom'
      ? customCatalogWidgets
      : activeCategory === 'all'
        ? allWidgets
        : allWidgets.filter(w => w.category === activeCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      widgets = widgets.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.tags.some(t => t.includes(q))
      );
    }

    return widgets;
  }, [searchQuery, activeCategory, allWidgets, customCatalogWidgets]);

  const handleAdd = (widget: CatalogWidget) => {
    onAddWidget(widget);
    setAddedFeedback(widget.id);
    setTimeout(() => setAddedFeedback(null), 1500);
  };

  const handleSaveCustom = (widget: CustomWidgetDefinition) => {
    onSaveCustomWidget?.(widget);
    setShowWizard(false);
    // Show feedback
    setAddedFeedback(widget.id);
    setTimeout(() => setAddedFeedback(null), 1500);
  };

  const isCustomWidget = (widgetId: string) => customWidgets.some(cw => cw.id === widgetId);

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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Slide-over panel */}
        <div className="relative w-full max-w-2xl bg-black/95 border-l border-cyan-500/30 shadow-[-20px_0_60px_rgba(0,255,255,0.1)] flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-black p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white font-mono flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                    <LayoutGrid className="w-4 h-4 text-cyan-400" />
                  </div>
                  Widget Library
                </h2>
                <p className="text-sm text-gray-500 font-mono mt-1">
                  {allWidgets.length} widgets available {customWidgets.length > 0 && `(${customWidgets.length} custom)`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Create Custom Widget Button */}
            <button
              onClick={() => setShowWizard(true)}
              className="w-full flex items-center gap-3 p-3 mb-4 rounded-xl border border-dashed border-purple-500/40 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 hover:from-purple-500/10 hover:to-cyan-500/10 hover:border-purple-500/60 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-mono font-medium text-white group-hover:text-purple-300 transition-colors">Create Custom Widget</p>
                <p className="text-[10px] font-mono text-gray-500">Build a widget with your own data source and visualization</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-purple-400 transition-colors">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Search */}
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search widgets by name, category, or tag..."
                className="w-full bg-gray-950/80 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-600"
              />
            </div>

            {/* Category filters */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border whitespace-nowrap transition-all ${
                  activeCategory === 'all'
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                }`}
              >
                All ({allWidgets.length})
              </button>
              {WIDGET_CATEGORIES.map(cat => {
                const count = allWidgets.filter(w => w.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border whitespace-nowrap transition-all ${
                      activeCategory === cat.id
                        ? `${cat.bgColor} ${cat.borderColor} ${cat.iconColor}`
                        : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
              {customWidgets.length > 0 && (
                <button
                  onClick={() => setActiveCategory('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeCategory === 'custom'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Custom ({customWidgets.length})
                </button>
              )}
            </div>
          </div>

          {/* Widget list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <SearchIcon size={40} className="text-gray-700 mb-4" />
                <p className="text-gray-500 font-mono text-sm">No widgets found</p>
                <p className="text-gray-600 font-mono text-xs mt-1">Try a different search term or category</p>
              </div>
            ) : (
              filteredWidgets.map(widget => {
                const isCustom = isCustomWidget(widget.id);
                const customDef = isCustom ? customWidgets.find(cw => cw.id === widget.id) : null;
                const VizIcon = customDef ? (VIZ_ICON_MAP[customDef.visualization] || Activity) : null;
                const Icon = VizIcon || getIcon(widget.icon);
                const isAdded = addedWidgetIds.includes(widget.id);
                const justAdded = addedFeedback === widget.id;
                const catInfo = WIDGET_CATEGORIES.find(c => c.id === widget.category);

                return (
                  <div
                    key={widget.id}
                    className={`relative rounded-xl border border-gray-800 bg-gray-950/50 p-4 transition-all duration-200 ${glowBorderMap[widget.glowColor] || ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center ${glowColorMap[widget.glowColor] || ''}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-mono font-medium text-sm truncate">{widget.name}</h3>
                          {isCustom && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-gradient-to-r from-purple-500/15 to-cyan-500/15 border border-purple-500/40 text-purple-400 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              CUSTOM
                            </span>
                          )}
                          {widget.requiresAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-orange-500/10 border border-orange-500/30 text-orange-400">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 font-mono text-xs leading-relaxed line-clamp-2">{widget.description}</p>

                        {/* Preview lines */}
                        <div className="flex items-center gap-3 mt-2">
                          {widget.previewLines.map((line, i) => (
                            <span key={i} className="text-[10px] font-mono text-gray-600 bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800">
                              {line}
                            </span>
                          ))}
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {catInfo && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${catInfo.bgColor} ${catInfo.borderColor} ${catInfo.iconColor} border`}>
                              {catInfo.label}
                            </span>
                          )}
                          {widget.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] font-mono text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Add button */}
                      <div className="flex-shrink-0">
                        {justAdded ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/40 text-green-400 font-mono text-xs">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20,6 9,17 4,12" />
                            </svg>
                            Added
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAdd(widget)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/60 font-mono text-xs transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-cyan-500/20 p-4 bg-black/80">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 font-mono">
                Showing {filteredWidgets.length} of {allWidgets.length} widgets
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 font-mono text-xs transition-all"
              >
                Close Library
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Widget Wizard Modal */}
      <CustomWidgetWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSave={handleSaveCustom}
      />
    </>
  );
};

export default WidgetLibraryPanel;
