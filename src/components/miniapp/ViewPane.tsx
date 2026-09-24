import React, { useState, useEffect, useCallback } from 'react';
import {
  TrashIcon, CloseIcon, EyeIcon, ChevronDownIcon, ChevronRightIcon,
  FilterIcon, PlusIcon, Share2Icon
} from '@/components/icons/Icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Lock icon inline
const LockIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 16, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UsersIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 16, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

export interface SavedView {
  id: string;
  mini_app_id: string;
  user_id: string;
  name: string;
  view_type: 'team' | 'private';
  layout: 'table' | 'grid' | 'board' | 'list';
  filters: ViewFilter[];
  sorting: ViewSort[];
  column_widths: Record<string, number>;
  visible_columns: string[];
  group_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViewFilter {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'empty' | 'not_empty';
  value: string;
}

export interface ViewSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ViewPaneProps {
  miniAppId: string;
  columns: string[];
  fields?: Array<{ name: string; type: string; options?: string[] }>;
  wsColor: { primary: string; rgb: string };
  currentLayout: string;
  currentFilters: ViewFilter[];
  currentSorting: ViewSort[];
  currentColumnWidths: Record<string, number>;
  currentGroupBy: string | null;
  activeGroupedData?: Record<string, any[]> | null; 
  activeGroupFilter?: string | null;                 // ⚡ ADDED
  onSelectGroup?: (groupName: string | null) => void;// ⚡ ADDED
  onApplyView: (view: {
    layout: string;
    filters: ViewFilter[];
    sorting: ViewSort[];
    columnWidths: Record<string, number>;
    groupBy: string | null;
  }) => void;
  isOpen: boolean;
  onToggle: () => void;
  isAdmin?: boolean;
}

const ViewPane: React.FC<ViewPaneProps> = ({
  miniAppId, columns, fields = [], wsColor,
  currentLayout, currentFilters, currentSorting, currentColumnWidths, currentGroupBy, activeGroupedData, activeGroupFilter, onSelectGroup,
  onApplyView, isOpen, onToggle, isAdmin, // ⚡ ADD isAdmin HERE
}) => {
  const { user } = useAuth();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';

  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  
  // ⚡ ADD THIS STATE
  const [sendToMenuOpenId, setSendToMenuOpenId] = useState<string | null>(null);
  
  const [saveName, setSaveName] = useState('');
  const [viewSaveScope, setViewSaveScope] = useState<'team' | 'private'>('private');
  const [isCreatingView, setIsCreatingView] = useState(false);
  
  const [teamExpanded, setTeamExpanded] = useState(true);
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [showPulse, setShowPulse] = useState(true);

  const [editGroupBy, setEditGroupBy] = useState<string | null>(currentGroupBy);

  useEffect(() => {
    if (showPulse) {
      const timer = setTimeout(() => setShowPulse(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showPulse]);

  const groupableFields = columns.filter(col => {
    const field = fields.find(f => f.name === col);
    if (!field) return false;
    const type = field.type?.toLowerCase() || '';
    return ['connection', 'category', 'select', 'multi-select', 'status', 'tag', 'reference', 'lookup'].includes(type);
  });

  const loadViews = useCallback(async () => {
    if (!miniAppId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.schema('app_private')
        .from('mini_apps')
        .select('schema_definition')
        .eq('id', miniAppId)
        .single();

      if (error) throw error;

      if (data?.schema_definition) {
        const schemaDef = typeof data.schema_definition === 'string' ? JSON.parse(data.schema_definition) : data.schema_definition;
        const allViews: SavedView[] = schemaDef.savedViews || [];
        
        const visibleViews = allViews.filter(v => v.view_type === 'team' || v.user_id === userId);
        visibleViews.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        
        setSavedViews(visibleViews);
      }
    } catch (err) {
      console.error('Error loading views:', err);
    } finally {
      setIsLoading(false);
    }
  }, [miniAppId, userId]);

  useEffect(() => {
    if (isOpen) loadViews();
  }, [isOpen, loadViews]);

  useEffect(() => {
    setEditGroupBy(currentGroupBy);
  }, [currentGroupBy]);

  const handleApplyEdits = () => {
    onApplyView({
      layout: currentLayout,
      filters: currentFilters,
      sorting: currentSorting,
      columnWidths: currentColumnWidths,
      groupBy: editGroupBy,
    });
  };

  const handleSaveView = async () => {
    if (!saveName.trim() || !miniAppId) return;
    try {
      const { data, error: fetchError } = await supabase.schema('app_private')
        .from('mini_apps')
        .select('schema_definition')
        .eq('id', miniAppId)
        .single();

      if (fetchError) throw fetchError;

      const schemaDef = typeof data?.schema_definition === 'string' ? JSON.parse(data.schema_definition) : (data?.schema_definition || {});
      const existingViews: SavedView[] = schemaDef.savedViews || [];

      const newView: SavedView = {
        id: 'view_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        mini_app_id: miniAppId,
        user_id: userId,
        name: saveName.trim(),
        view_type: viewSaveScope,
        layout: currentLayout as any,
        filters: currentFilters,
        sorting: currentSorting,
        column_widths: currentColumnWidths,
        visible_columns: columns,
        group_by: editGroupBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updatedSchemaDef = { ...schemaDef, savedViews: [...existingViews, newView] };

      const { error: updateError } = await supabase.schema('app_private')
        .from('mini_apps')
        .update({ schema_definition: updatedSchemaDef })
        .eq('id', miniAppId);

      if (updateError) throw updateError;
      
      setSaveName('');
      setIsCreatingView(false);
      handleApplyEdits(); 
      await loadViews();
    } catch (err) {
      console.error('Error saving view:', err);
    }
  };

  const handleApplyView = (view: SavedView) => {
    setActiveViewId(view.id);
    onApplyView({
      layout: view.layout || 'table',
      filters: (view.filters as ViewFilter[]) || [],
      sorting: (view.sorting as ViewSort[]) || [],
      columnWidths: (view.column_widths as Record<string, number>) || {},
      groupBy: view.group_by || null,
    });
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      const { data, error: fetchError } = await supabase.schema('app_private')
        .from('mini_apps')
        .select('schema_definition')
        .eq('id', miniAppId)
        .single();

      if (fetchError) throw fetchError;

      const schemaDef = typeof data?.schema_definition === 'string' ? JSON.parse(data.schema_definition) : (data?.schema_definition || {});
      const existingViews: SavedView[] = schemaDef.savedViews || [];

      const updatedSchemaDef = {
        ...schemaDef,
        savedViews: existingViews.filter(v => v.id !== viewId)
      };

      const { error: updateError } = await supabase.schema('app_private')
        .from('mini_apps')
        .update({ schema_definition: updatedSchemaDef })
        .eq('id', miniAppId);

      if (updateError) throw updateError;

      setSavedViews(prev => prev.filter(v => v.id !== viewId));
      if (activeViewId === viewId) setActiveViewId(null);
    } catch (err) {
      console.error('Error deleting view:', err);
    }
  };

  const teamViews = savedViews.filter(v => v.view_type === 'team');
  const privateViews = savedViews.filter(v => v.view_type === 'private' && v.user_id === userId);

  if (!isOpen) {
    return (
      <div className="h-full relative w-0 overflow-visible z-40">
        <button
          onClick={() => { setShowPulse(false); onToggle(); }}
          className="absolute left-0 top-1/2 -translate-y-1/2 px-2.5 py-8 rounded-r-xl transition-all hover:px-3.5 group"
          style={{
            background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.3), rgba(${wsColor.rgb}, 0.15))`,
            border: `1px solid rgba(${wsColor.rgb}, 0.5)`,
            borderLeft: 'none',
            boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.2), inset 0 0 10px rgba(${wsColor.rgb}, 0.05)`,
          }}
          title="Open Views Panel"
        >
          {showPulse && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: wsColor.primary }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: wsColor.primary }} />
            </span>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <EyeIcon size={16} style={{ color: wsColor.primary }} className="group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: wsColor.primary, writingMode: 'vertical-lr', textOrientation: 'mixed' }}>VIEWS</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-[352px] h-full flex-shrink-0 bg-black/90 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-left-4"
      style={{
        border: `1px solid rgba(${wsColor.rgb}, 0.3)`,
        boxShadow: `0 0 20px rgba(${wsColor.rgb}, 0.08)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid rgba(${wsColor.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.06), transparent)` }}>
        <div className="flex items-center gap-2">
          <EyeIcon size={14} style={{ color: wsColor.primary }} />
          <span className="text-xs font-mono font-medium" style={{ color: wsColor.primary }}>Views</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsCreatingView(!isCreatingView)} 
            className={`p-1 rounded transition-all ${isCreatingView ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Create New View"
          >
            <PlusIcon size={14} />
          </button>
          <button onClick={onToggle} className="p-1 text-gray-500 hover:text-white transition-colors">
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto darkwave-scrollbar pt-1 pb-4">
        
        {/* ⚡ Create View Controls (Hidden until Plus is clicked) */}
        {isCreatingView && (
          <div className="p-4 bg-black/60 border-b animate-in slide-in-from-top-2 duration-200" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
            
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <EyeIcon size={14} style={{ color: wsColor.primary }} />
                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Group By</span>
              </div>
              <select
                value={editGroupBy || ''}
                onChange={e => { 
                  const newVal = e.target.value || null;
                  setEditGroupBy(newVal); 
                  onApplyView({
                    layout: currentLayout,
                    filters: currentFilters,
                    sorting: currentSorting,
                    columnWidths: currentColumnWidths,
                    groupBy: newVal,
                  });
                }}
                className="w-full bg-black/50 border border-gray-800 rounded px-2 py-2 text-xs text-white font-mono focus:outline-none cursor-pointer hover:border-gray-700 transition-colors"
              >
                <option value="">None</option>
                {columns.map(col => {
                  const isGroupable = groupableFields.includes(col);
                  return (
                    <option key={col} value={col}>
                      {col}{isGroupable ? ' (building block)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2.5 mb-3 text-white font-mono text-sm focus:outline-none transition-colors"
              placeholder="Name this view..."
              autoFocus
              onFocus={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.5)`; }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; }}
            />
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setViewSaveScope('team')}
                className={`flex-1 py-2 rounded-lg border text-xs uppercase tracking-wider font-mono transition-all ${viewSaveScope === 'team' ? 'text-white font-bold' : 'text-gray-500 border-transparent hover:bg-white/5'}`}
                style={viewSaveScope === 'team' ? { 
                  background: `rgba(${wsColor.rgb}, 0.15)`, 
                  borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                  boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.3) inset, 0 0 10px rgba(${wsColor.rgb}, 0.2)`
                } : {}}
              >
                Team
              </button>
              <button 
                onClick={() => setViewSaveScope('private')}
                className={`flex-1 py-2 rounded-lg border text-xs uppercase tracking-wider font-mono transition-all ${viewSaveScope === 'private' ? 'text-white font-bold' : 'text-gray-500 border-transparent hover:bg-white/5'}`}
                style={viewSaveScope === 'private' ? { 
                  background: `rgba(${wsColor.rgb}, 0.15)`, 
                  borderColor: `rgba(${wsColor.rgb}, 0.5)`,
                  boxShadow: `0 0 15px rgba(${wsColor.rgb}, 0.3) inset, 0 0 10px rgba(${wsColor.rgb}, 0.2)`
                } : {}}
              >
                Private
              </button>
            </div>
            <button 
              onClick={handleSaveView}
              disabled={!saveName.trim()}
              className="w-full py-3 rounded-lg text-sm font-mono transition-all disabled:opacity-30 disabled:hover:scale-100 uppercase tracking-widest font-bold" 
              style={saveName.trim() ? { 
                background: `rgba(${wsColor.rgb}, 0.15)`, 
                border: `1px solid rgba(${wsColor.rgb}, 0.5)`,
                color: wsColor.primary, 
                boxShadow: `0 0 20px rgba(${wsColor.rgb}, 0.3)` 
              } : {
                background: 'transparent',
                border: '1px solid rgba(75,85,99,0.5)',
                color: '#6b7280'
              }}
            >
              Save
            </button>
          </div>
        )}

        {/* ⚡ Team Views (Sizes increased) */}
        <div className="px-3 py-3" style={{ borderBottom: `1px solid rgba(${wsColor.rgb}, 0.1)` }}>
          <button onClick={() => setTeamExpanded(!teamExpanded)} className="flex items-center gap-2 w-full text-left mb-2">
            {teamExpanded ? <ChevronDownIcon size={14} className="text-gray-500" /> : <ChevronRightIcon size={14} className="text-gray-500" />}
            <UsersIcon size={16} style={{ color: wsColor.primary }} />
            <span className="text-sm text-gray-300 font-mono font-bold tracking-wide">Team Views</span>
            <span className="text-sm text-gray-600 font-mono ml-auto">{teamViews.length}</span>
          </button>
          {teamExpanded && (
            <div className="space-y-1.5 ml-5 mt-2">
              {teamViews.length === 0 ? (
                <p className="text-sm text-gray-700 font-mono py-1">No team views</p>
              ) : (
                teamViews.map(view => (
                  <div key={view.id} className="flex flex-col">
                    <div
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group ${activeViewId === view.id ? '' : 'hover:bg-white/5'}`}
                      style={activeViewId === view.id ? { background: `rgba(${wsColor.rgb}, 0.12)`, border: `1px solid rgba(${wsColor.rgb}, 0.3)` } : { border: '1px solid transparent' }}
                      onClick={() => handleApplyView(view)}
                    >
                      <EyeIcon size={14} style={{ color: activeViewId === view.id ? wsColor.primary : '#6b7280' }} />
                      <span className="text-sm font-mono truncate flex-1 font-medium" style={{ color: activeViewId === view.id ? wsColor.primary : '#d1d5db' }}>
                        {view.name}
                      </span>
                      {view.filters && (view.filters as ViewFilter[]).length > 0 && (
                        <FilterIcon size={12} className="text-gray-600" />
                      )}

                      {/* ⚡ START NEW BLOCK HERE */}
                      {activeViewId === view.id && (
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSendToMenuOpenId(sendToMenuOpenId === view.id ? null : view.id); }}
                            className={`p-1 rounded transition-colors ${sendToMenuOpenId === view.id ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                            title="Share View to Dashboard"
                          >
                            <Share2Icon size={14} />
                          </button>
                          {sendToMenuOpenId === view.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setSendToMenuOpenId(null); }} />
                              <div className="absolute right-0 top-full mt-1 z-50 bg-black/95 backdrop-blur-xl border rounded-lg p-1 min-w-[180px] shadow-2xl" style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}>
                                <button className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-all text-left" onClick={(e) => { e.stopPropagation(); console.log('Send to Home Dashboard'); setSendToMenuOpenId(null); }}>
                                  Home Dashboard
                                </button>
                                {isAdmin && (
                                  <button className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-all text-left" onClick={(e) => { e.stopPropagation(); console.log('Send to Workspace Dashboard'); setSendToMenuOpenId(null); }}>
                                    Workspace Dashboard
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {/* ⚡ END NEW BLOCK */}

                      <button onClick={(e) => { e.stopPropagation(); handleDeleteView(view.id); }}
                        className="p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <TrashIcon size={12} />
                      </button>
                    </div>
                    {/* ⚡ Dropdown for active view groupings */}
                    {activeViewId === view.id && view.group_by && activeGroupedData && Object.keys(activeGroupedData).length > 0 && (
                      <div className="flex flex-col pl-6 pr-2 py-1.5 gap-1 animate-in slide-in-from-top-2 duration-200 border-l ml-3 my-1" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
                        {Object.entries(activeGroupedData).map(([groupName, items]) => {
                          const isActiveGroup = activeGroupFilter === groupName;
                          return (
                            <div 
                              key={groupName} 
                              className={`flex items-center justify-between text-xs font-mono py-1 px-2 rounded cursor-pointer transition-colors ${isActiveGroup ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                              style={isActiveGroup ? { background: `rgba(${wsColor.rgb}, 0.2)` } : {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectGroup) onSelectGroup(isActiveGroup ? null : groupName);
                              }}
                            >
                              <span className="truncate pr-2 flex-1 font-medium">{groupName}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-xs font-bold transition-colors ${isActiveGroup ? 'text-white' : 'bg-black/50 border-gray-800 text-gray-500'}`} style={isActiveGroup ? { borderColor: `rgba(${wsColor.rgb}, 0.5)`, background: `rgba(${wsColor.rgb}, 0.4)` } : {}}>{items.length}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ⚡ Private Views (Sizes increased) */}
        <div className="px-3 py-3 pb-6">
          <button onClick={() => setPrivateExpanded(!privateExpanded)} className="flex items-center gap-2 w-full text-left mb-2">
            {privateExpanded ? <ChevronDownIcon size={14} className="text-gray-500" /> : <ChevronRightIcon size={14} className="text-gray-500" />}
            <LockIcon size={16} style={{ color: wsColor.primary }} />
            <span className="text-sm text-gray-300 font-mono font-bold tracking-wide">Private Views</span>
            <span className="text-sm text-gray-600 font-mono ml-auto">{privateViews.length}</span>
          </button>
          {privateExpanded && (
            <div className="space-y-1.5 ml-5 mt-2">
              {privateViews.length === 0 ? (
                <p className="text-sm text-gray-700 font-mono py-1">No private views</p>
              ) : (
                privateViews.map(view => (
                  <div key={view.id} className="flex flex-col">
                    <div
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group ${activeViewId === view.id ? '' : 'hover:bg-white/5'}`}
                      style={activeViewId === view.id ? { background: `rgba(${wsColor.rgb}, 0.12)`, border: `1px solid rgba(${wsColor.rgb}, 0.3)` } : { border: '1px solid transparent' }}
                      onClick={() => handleApplyView(view)}
                    >
                      <EyeIcon size={14} style={{ color: activeViewId === view.id ? wsColor.primary : '#6b7280' }} />
                      <span className="text-sm font-mono truncate flex-1 font-medium" style={{ color: activeViewId === view.id ? wsColor.primary : '#d1d5db' }}>
                        {view.name}
                      </span>
                      {view.filters && (view.filters as ViewFilter[]).length > 0 && (
                        <FilterIcon size={12} className="text-gray-600" />
                      )}

                      {/* ⚡ START NEW BLOCK HERE */}
                      {activeViewId === view.id && (
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSendToMenuOpenId(sendToMenuOpenId === view.id ? null : view.id); }}
                            className={`p-1 rounded transition-colors ${sendToMenuOpenId === view.id ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                            title="Share View to Dashboard"
                          >
                            <Share2Icon size={14} />
                          </button>
                          {sendToMenuOpenId === view.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setSendToMenuOpenId(null); }} />
                              <div className="absolute right-0 top-full mt-1 z-50 bg-black/95 backdrop-blur-xl border rounded-lg p-1 min-w-[180px] shadow-2xl" style={{ borderColor: `rgba(${wsColor.rgb}, 0.4)` }}>
                                <button className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-all text-left" onClick={(e) => { e.stopPropagation(); console.log('Send to Home Dashboard'); setSendToMenuOpenId(null); }}>
                                  Home Dashboard
                                </button>
                                {isAdmin && (
                                  <button className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-all text-left" onClick={(e) => { e.stopPropagation(); console.log('Send to Workspace Dashboard'); setSendToMenuOpenId(null); }}>
                                    Workspace Dashboard
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {/* ⚡ END NEW BLOCK */}

                      <button onClick={(e) => { e.stopPropagation(); handleDeleteView(view.id); }}
                        className="p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <TrashIcon size={12} />
                      </button>
                    </div>
                    {/* ⚡ Dropdown for active view groupings */}
                    {activeViewId === view.id && view.group_by && activeGroupedData && Object.keys(activeGroupedData).length > 0 && (
                      <div className="flex flex-col pl-7 pr-2 py-1.5 gap-1.5 animate-in slide-in-from-top-2 duration-200 border-l ml-3 my-1" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
                        {Object.entries(activeGroupedData).map(([groupName, items]) => (
                          <div key={groupName} className="flex items-center justify-between text-sm font-mono py-0.5">
                            <span className="text-gray-400 truncate pr-2 flex-1">{groupName}</span>
                            <span className="bg-black/50 px-1.5 py-0.5 rounded border border-gray-800 text-gray-500 font-bold text-sm">{items.length}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ViewPane;