  import React, { useEffect, useRef, useCallback, useState } from 'react';
  import { CloseIcon, TaskIcon, CalendarIcon, ChevronRightIcon, ExternalLinkIcon, PlusIcon, TrashIcon, CheckIcon, UsersIcon, UserIcon, PopoutIcon } from '@/components/icons/Icons';
  import { db } from '@/lib/dbProxy';
  import { supabase } from '@/lib/supabase';

  import { useAuth } from '@/contexts/AuthContext';
  import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';

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

  type PanelType = 'tasks' | 'calendar' | null;
  type TaskFilterType = 'mine' | 'delegated';

  interface LeftSlidePanelProps {
    activePanel: PanelType;
    onClose: () => void;
    onNavigateToFullView: (view: 'tasks' | 'calendar') => void;
    zIndex?: number;
    stackIndex?: number;
    onBringToFront?: () => void;
    onMakeSecondary?: () => void;
    leftPanelStates?: Record<string, string>; 
    onLayoutChange?: (panel: PanelType, layoutState: string) => void;
    dockedPanels?: PanelType[];
    onDockToggle?: (panel: PanelType, isDocked: boolean) => void;
    contextWorkspaceId?: string;
    contextAppId?: string;
    contextAppName?: string;
    contextRecordId?: string;
    contextRecordTitle?: string;
    currentWorkspaceSlug?: string | null;
  }

  const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastCallRef = useRef<number>(0);
    
    return useCallback((...args: any[]) => {
      const now = Date.now();
      if (now - lastCallRef.current < delay) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      lastCallRef.current = now;
      callback(...args);
    }, [callback, delay]);
  };

  const getGlobalDocked = (side: string) => {
    if (typeof window === 'undefined') return [];
    (window as any).__DOCKED_PANELS__ = (window as any).__DOCKED_PANELS__ || { left: [], right: [] };
    return (window as any).__DOCKED_PANELS__[side];
  };
  const toggleGlobalDock = (side: string, id: string, isDocked: boolean) => {
    const panels = getGlobalDocked(side);
    if (isDocked && !panels.includes(id)) panels.push(id);
    if (!isDocked) {
      const index = panels.indexOf(id);
      if (index > -1) panels.splice(index, 1);
    }
    window.dispatchEvent(new CustomEvent('dockSync'));
  };

  // --- Inline Edit Component ---
  const InlineEdit: React.FC<{
    value: string | number;
    onSave: (val: string) => void;
    className?: string;
    inputClassName?: string;
    placeholder?: string;
    multiline?: boolean;
  }> = ({ value, onSave, className = "", inputClassName = "", placeholder = "", multiline = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempVal, setTempVal] = useState(value);

    useEffect(() => { setTempVal(value); }, [value]);

    const finishEdit = () => {
      setIsEditing(false);
      if (tempVal.toString() !== (value || '').toString()) onSave(tempVal.toString());
    };

    if (isEditing) {
      const sharedProps = {
        autoFocus: true, value: tempVal, onChange: (e: any) => setTempVal(e.target.value),
        onBlur: finishEdit, onClick: (e: any) => e.stopPropagation(),
        className: `bg-black border border-cyan-500/80 text-white rounded px-2 py-1 outline-none shadow-[0_0_10px_rgba(0,255,255,0.3)] w-full min-w-[60px] ${inputClassName}`,
        placeholder: placeholder
      };
      if (multiline) {
        return <textarea {...sharedProps} rows={4} onKeyDown={(e) => { if (e.key === 'Escape') { setTempVal(value); setIsEditing(false); } }} />;
      }
      return <input {...sharedProps} onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(); if (e.key === 'Escape') { setTempVal(value); setIsEditing(false); } }} />;
    }

    return (
      <span onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={`cursor-pointer hover:bg-white/10 hover:ring-1 hover:ring-white/30 rounded transition-all inline-block px-1 min-h-[20px] min-w-[20px] ${multiline ? 'whitespace-pre-wrap block w-full h-full' : ''} ${className}`} title="Click to edit">
        {value || <span className="opacity-50 italic">{placeholder}</span>}
      </span>
    );
  };

  // --- Task Viewer Modal ---
  interface TaskViewerModalProps {
    taskId: string;
    onClose: () => void;
    onViewAll: () => void;
    accentColor: string;
    accentRgb: string;
    currentWorkspaceSlug?: string | null;
  }

  const TaskViewerModal: React.FC<TaskViewerModalProps> = ({ taskId, onClose, onViewAll, accentColor, accentRgb, currentWorkspaceSlug }) => {
    const { user, organization } = useAuth();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<any[]>([]);
    const [availableStatuses, setAvailableStatuses] = useState([
      { id: 'pending', name: 'Pending', type: 'default', color: '#facc15' },
      { id: 'in_progress', name: 'In Progress', type: 'default', color: '#22d3ee' },
      { id: 'completed', name: 'Completed', type: 'default', color: '#4ade80' },
      { id: 'cancelled', name: 'Cancelled', type: 'default', color: '#6b7280' }
    ]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    useEffect(() => {
      const fetchTask = async () => {
        if (user) {
          const userId = user.id || (user as any).uid;
          const { data: dbSettings } = await supabase.schema('app_private').from('user_settings').select('custom_statuses, tags').eq('user_id', userId).maybeSingle();
          if (dbSettings?.custom_statuses) setAvailableStatuses(dbSettings.custom_statuses);
          if (dbSettings?.tags) setAvailableTags(dbSettings.tags);
        }
        setLoading(true);
        const { data } = await supabase.schema('app_private').from('tasks').select('*').eq('id', taskId).single();
        setTask(data);
        
        if (organization?.id) {
          const { data: orgUsers } = await supabase.schema('app_private').from('organization_users').select('id, full_name').eq('organization_id', organization.id);
          setMembers((orgUsers || []).map(u => ({ id: u.id, name: u.full_name || 'Unknown User' })));
        }
        setLoading(false);
      };
      fetchTask();
    }, [taskId, organization?.id]);

    const handleUpdate = async (field: string, value: any) => {
      setTask((prev: any) => ({ ...prev, [field]: value }));
      await supabase.schema('app_private').from('tasks').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', taskId);
      window.dispatchEvent(new CustomEvent('refreshTasks'));
    };

    if (loading) {
      return (
        <>
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `rgba(${accentRgb}, 0.3)`, borderTopColor: accentColor }} />
          </div>
        </>
      );
    }
    
    if (!task) return null;

    const taskDate = task.due_date ? new Date(task.due_date) : null;
    let dateString = '';
    let timeString = '';
    if (taskDate && !isNaN(taskDate.getTime())) {
      dateString = taskDate.getFullYear() + '-' + String(taskDate.getMonth() + 1).padStart(2, '0') + '-' + String(taskDate.getDate()).padStart(2, '0');
      timeString = String(taskDate.getHours()).padStart(2, '0') + ':' + String(taskDate.getMinutes()).padStart(2, '0');
    }

    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed z-[201] flex flex-col pointer-events-none animate-in fade-in zoom-in-95 duration-200" style={{ top: 'calc(2vh + 60px)', left: '2vw', right: '2vw', bottom: '90px' }}>
          <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto bg-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl pointer-events-auto" style={{ borderColor: `rgba(${accentRgb}, 0.4)`, boxShadow: `0 0 60px rgba(${accentRgb}, 0.15)` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-black/40 flex-shrink-0" style={{ borderColor: `rgba(${accentRgb}, 0.3)` }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg" style={{ background: `linear-gradient(135deg, rgba(${accentRgb}, 0.15), rgba(0,0,0,0.8))`, borderColor: `rgba(${accentRgb}, 0.5)` }}>
                  <TaskIcon size={20} style={{ color: accentColor }} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-mono font-bold text-white leading-tight">Task Details</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 uppercase tracking-widest">ID: {task.id.substring(0,8)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { onViewAll(); onClose(); }} className="px-4 py-2 border rounded-lg hover:bg-white/5 transition-all font-mono text-xs uppercase tracking-wider font-bold" style={{ borderColor: `rgba(${accentRgb}, 0.5)`, color: accentColor }}>View All Tasks</button>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/5"><CloseIcon size={24} /></button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 pt-8 darkwave-scrollbar bg-black/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Col (Main content) */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Task Title</label>
                    <div className="text-xl text-white font-mono font-bold w-full bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3 min-h-[54px] flex items-center shadow-inner">
                      <InlineEdit value={task.title} onSave={(val) => handleUpdate('title', val)} placeholder="Task Title..." inputClassName="w-full text-xl font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Description</label>
                    <div className="text-sm text-gray-300 font-mono w-full bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-4 min-h-[200px] whitespace-pre-wrap shadow-inner">
                      <InlineEdit value={task.description || ''} onSave={(val) => handleUpdate('description', val)} placeholder="Add a more detailed description..." multiline inputClassName="w-full text-sm min-h-[160px]" />
                    </div>
                  </div>
                </div>

                {/* Right Col (Metadata) */}
                <div className="space-y-6 bg-gray-900/30 border border-gray-800 rounded-xl p-6 shadow-inner h-fit">
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Status</label>
                    <select 
                      value={task.status} 
                      onChange={(e) => handleUpdate('status', e.target.value)} 
                      className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 font-mono text-sm font-bold focus:outline-none transition-colors cursor-pointer"
                      style={{ color: availableStatuses.find(s => s.id === task.status)?.color || '#facc15' }}
                    >
                      {availableStatuses.map(status => (
                        <option key={status.id} value={status.id} className="bg-gray-900 font-bold" style={{ color: status.color || '#ffffff' }}>{status.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Priority</label>
                    <select value={task.priority} onChange={(e) => handleUpdate('priority', e.target.value)} className={`w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 font-mono text-sm font-bold focus:outline-none transition-colors cursor-pointer ${task.priority === 'urgent' ? 'text-red-400' : task.priority === 'high' ? 'text-orange-400' : task.priority === 'medium' ? 'text-cyan-400' : 'text-gray-400'}`}>
                      <option value="low" className="text-gray-400 bg-gray-900">Low</option>
                      <option value="medium" className="text-cyan-400 bg-gray-900">Medium</option>
                      <option value="high" className="text-orange-400 bg-gray-900">High</option>
                      <option value="urgent" className="text-red-400 bg-gray-900">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Assigned To</label>
                    <select value={task.assigned_to || ''} onChange={(e) => handleUpdate('assigned_to', e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer">
                      <option value={user?.id || ''}>Me</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Due Date</label>
                    <input type="date" value={dateString} onChange={(e) => {
                      const newDateStr = e.target.value;
                      let newIso = null;
                      if (newDateStr) {
                        const d = new Date(`${newDateStr}T${timeString || '23:59'}`);
                        if (!isNaN(d.getTime())) newIso = d.toISOString();
                      }
                      handleUpdate('due_date', newIso);
                    }} className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer mb-2 [color-scheme:dark]" />
                    <input type="time" value={timeString} onChange={(e) => {
                      const newTimeStr = e.target.value;
                      let newIso = null;
                      if (dateString) {
                        const d = new Date(`${dateString}T${newTimeStr || '23:59'}`);
                        if (!isNaN(d.getTime())) newIso = d.toISOString();
                      }
                      handleUpdate('due_date', newIso);
                    }} className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer [color-scheme:dark]" disabled={!task.due_date} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Tags</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(task.tags || []).map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded text-[10px] font-mono flex items-center gap-1 uppercase tracking-wider">
                          {tag}
                          <button onClick={() => handleUpdate('tags', task.tags.filter((t: string) => t !== tag))} className="hover:text-red-400 ml-1">&times;</button>
                        </span>
                      ))}
                    </div>
                    <select 
                      value="" 
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const currentTags = task.tags || [];
                        if (!currentTags.includes(e.target.value)) handleUpdate('tags', [...currentTags, e.target.value]);
                      }}
                      className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2 text-gray-400 font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer"
                    >
                      <option value="">+ Add Tag</option>
                      {availableTags.filter(t => !(task.tags || []).includes(t)).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {task.record_id && task.app_name && (
                    <div>
                      <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Linked Record</label>
                      <a href={`/app/${currentWorkspaceSlug || 'workspace'}/${task.app_name.toLowerCase().replace(/\s+/g, '-')}/${task.record_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-3 text-cyan-400 font-mono text-sm hover:bg-gray-800 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,255,255,0.1)] transition-all group">
                        <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors"><ExternalLinkIcon size={14} /></div>
                        <span className="truncate">{task.app_name}: {task.record_title || task.record_id.substring(0,8)}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };


  const LeftSlidePanel: React.FC<LeftSlidePanelProps> = ({ 
    activePanel, onClose, onNavigateToFullView, zIndex = 20, stackIndex = 0,
    onBringToFront, leftPanelStates = {}, onLayoutChange, dockedPanels = [],
    onDockToggle, onMakeSecondary, contextWorkspaceId, contextAppId,
    contextAppName, contextRecordId, contextRecordTitle, currentWorkspaceSlug
  }) => {
    const { user } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDocked, setIsDocked] = useState(false);
    const [isSideBySide, setIsSideBySide] = useState(false);
    const [globalDocked, setGlobalDocked] = useState<string[]>(() => getGlobalDocked('left'));
    
    // ⚡ NEW: User Custom Colors
    const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

    // ⚡ FETCH: LeftSlidePanel Colors (Inherits from BottomNav settings)
    useEffect(() => {
      const fetchUserPreferences = async () => {
        const userId = user?.id || (user as any)?.uid;
        if (!userId) return;
        try {
          const { data, error } = await supabase.schema('app_private')
            .from('user_preferences')
            .select('nav_colors')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (error) console.error('[LeftSlidePanel] Error fetching colors:', error);
          if (data?.nav_colors) setUserNavColors(data.nav_colors);
        } catch (err) {
          console.error('[LeftSlidePanel] Caught error fetching colors:', err);
        }
      };
      fetchUserPreferences();
    }, [user]);

    useEffect(() => {
      const handler = () => setGlobalDocked([...getGlobalDocked('left')]);
      window.addEventListener('dockSync', handler);
      return () => window.removeEventListener('dockSync', handler);
    }, []);
    
    const panelRef = useRef<HTMLDivElement>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const { getColor } = useWorkspaceColor();
    const ac = currentWorkspaceSlug ? getColor(currentWorkspaceSlug) : null;

    // ⚡ THEME RESOLUTION: User custom setting overrides workspace, which overrides defaults
    const defaultColor = activePanel === 'tasks' ? '#22c55e' : '#c4b5fd';
    const defaultRgb = activePanel === 'tasks' ? '34, 197, 94' : '196, 181, 253';
    
    const userPrefKey = activePanel ? userNavColors[activePanel] : null;

    const panelAccentColor = (currentWorkspaceSlug && ac)
      ? ac.primary 
      : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : defaultColor);

    const panelAccentRGB = (currentWorkspaceSlug && ac)
      ? ac.rgb 
      : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : defaultRgb);

    const [swipeOffset, setSwipeOffset] = useState(0);
    const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
    const swipingRef = useRef(false);
    
    const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);

    const prevLayoutRef = useRef<string>('normal');
    useEffect(() => {
      let layoutState = 'normal';
      if (isDocked) layoutState = 'docked';
      else if (isSideBySide && isExpanded) layoutState = 'side-expanded';
      else if (isSideBySide) layoutState = 'side';
      else if (isExpanded) layoutState = 'expanded';
      
      if (prevLayoutRef.current !== layoutState) {
        prevLayoutRef.current = layoutState;
        if (onLayoutChange) onLayoutChange(activePanel, layoutState);
      }
    }, [isDocked, isExpanded, isSideBySide, activePanel, onLayoutChange]);

    useEffect(() => {
      if (stackIndex === 0 && isSideBySide) setIsSideBySide(false);
      if (stackIndex > 1 && (isSideBySide || isExpanded)) {
        setIsSideBySide(false);
        setIsExpanded(false);
      }
    }, [stackIndex, isSideBySide, isExpanded]);

    useEffect(() => {
      if (activePanel && dockedPanels?.includes(activePanel as any)) {
        setIsDocked(true);
        setIsExpanded(false);
        setIsSideBySide(false);
      } else {
        // ⚡ FIX: Undock when AppLayout removes it from the list
        setIsDocked(false);
      }
    }, [dockedPanels, activePanel]);

    const panelWidth = isExpanded ? 760 : 380;
    const isFrontExpanded = Object.values(leftPanelStates || {}).includes('expanded');
    const expansionOffset = (stackIndex > 0 && isFrontExpanded) ? 380 : 0;
    const baseOffset = (stackIndex * 48) + (isHovered && stackIndex > 0 ? 24 : 0);
    const sideBySidePos = 380 + (isFrontExpanded ? 380 : 0);
    
    // ⚡ FIX: Removed the buggy + baseOffset so they sit perfectly flush
    const leftPos = isSideBySide ? `${sideBySidePos}px` : `${baseOffset + expansionOffset}px`;

    const handleExpandClick = () => {
      if (stackIndex === 0) {
        setIsExpanded(!isExpanded);
        setIsSideBySide(false);
      } else {
        if (!isSideBySide && !isExpanded) {
          setIsSideBySide(true);
          if (stackIndex > 1 && onMakeSecondary) onMakeSecondary();
        } else if (isSideBySide && !isExpanded) {
          setIsExpanded(true);
        } else {
          setIsExpanded(false);
          setIsSideBySide(false);
        }
      }
    };

    const activePanelId = (activePanel as string) || '';

    const handleDockClick = () => {
      setIsDocked(true);
      setIsExpanded(false);
      setIsSideBySide(false);
      toggleGlobalDock('left', activePanelId, true);
      if (onDockToggle) onDockToggle(activePanelId, true);
    };

    const handleCloseTab = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDocked(false);
      toggleGlobalDock('left', activePanelId, false);
      if (onDockToggle) onDockToggle(activePanelId, false);
      onClose();
    };

    useEffect(() => {
      if (activePanel) {
        setIsAnimating(true);
        setSwipeOffset(0);
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 300);
      }
      return () => { if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current); };
    }, [activePanel]);

    const handleClose = useDebounce(() => { if (!isAnimating) onClose(); }, 150);
    const handleNavigateToFullView = useDebounce((view: 'tasks' | 'calendar') => {
      if (!isAnimating) { onNavigateToFullView(view); onClose(); }
    }, 150);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
      swipingRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      if (!swipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) swipingRef.current = true;
      if (swipingRef.current && dx < 0) { setSwipeOffset(dx); e.preventDefault(); }
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      if (!touchStartRef.current || !swipingRef.current) {
        touchStartRef.current = null; swipingRef.current = false; return;
      }
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dt = (Date.now() - touchStartRef.current.t) / 1000;
      if (dx < -100 || (dx < -50 && (Math.abs(dx) / dt) > 300)) onClose();
      setSwipeOffset(0);
      touchStartRef.current = null;
      swipingRef.current = false;
    }, [onClose]);

    if (!activePanel) return null;

    if (isDocked) {
      const combinedDocked = Array.from(new Set([...(dockedPanels || []), ...globalDocked]));
      const activeDockedPanels = combinedDocked.length > 0 ? combinedDocked : [activePanelId];
      if (!activeDockedPanels.includes(activePanelId)) activeDockedPanels.push(activePanelId);
      
      const dockIndex = activeDockedPanels.indexOf(activePanelId);
      const totalDocked = activeDockedPanels.length;
      
      let tabTop = '50%';
      if (totalDocked === 2) tabTop = dockIndex === 0 ? 'calc(50% - 105px)' : 'calc(50% + 105px)';
      else if (totalDocked === 3) tabTop = dockIndex === 0 ? 'calc(50% - 210px)' : dockIndex === 1 ? '50%' : 'calc(50% + 210px)';
      else if (totalDocked > 3) tabTop = `calc(50% + ${(dockIndex - (totalDocked - 1) / 2) * 210}px)`;

      return (
        <div 
          className="fixed left-0 flex flex-col items-center py-4 bg-black/50 backdrop-blur-sm border-y border-r border-gray-800 rounded-r-xl cursor-pointer hover:bg-black/70 transition-all group shadow-lg"
          style={{ 
            zIndex: 40,
            top: tabTop,
            transform: 'translateY(-50%)',
            width: '48px',
            height: '200px',
            borderRightColor: panelAccentColor,
            borderRightWidth: '3px',
            boxShadow: `0 0 15px rgba(${panelAccentRGB}, 0.2)`
          }}
          onClick={() => { 
            if (onBringToFront) onBringToFront();
            setIsDocked(false); 
            if (onDockToggle) onDockToggle(activePanel, false); 
          }} 
          title={`Restore ${activePanel}`}
        >
          <button onClick={handleCloseTab} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800 bg-black/40"><CloseIcon size={12} /></button>
          <div className="mb-3 mt-4" style={{ color: panelAccentColor }}>
            {activePanel === 'tasks' ? <TaskIcon size={20} /> : <CalendarIcon size={20} />}
          </div>
          <span className="text-xs font-mono font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: panelAccentColor }}>
            {activePanel === 'tasks' ? 'TASKS' : 'CALENDAR'}
          </span>
        </div>
      );
    }

    // ==========================================
    // VIEW 2: FULL SLIDE PANEL MODE
    // ==========================================
    const panelTransform = swipeOffset < 0 ? `translateX(${swipeOffset}px)` : undefined;
    
    return (
      // ⚡ FIX: Hardcoded to 30 so it sits behind the BottomNav (z-40) and properly stacks!
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 30 }}>
        {/* ⚡ THEME CSS INJECTION */}
        <style>{`
          .left-panel-theme-text { color: ${panelAccentColor} !important; }
          .left-panel-theme-text-hover:hover { color: ${panelAccentColor} !important; }
          .group:hover .left-panel-group-hover-theme-text { color: ${panelAccentColor} !important; }
          .left-panel-theme-bg { background-color: rgba(${panelAccentRGB}, 0.2) !important; }
          .left-panel-theme-bg-subtle { background-color: rgba(${panelAccentRGB}, 0.05) !important; }
          .left-panel-theme-bg-hover:hover { background-color: rgba(${panelAccentRGB}, 0.1) !important; }
          .group:hover .left-panel-group-hover-theme-bg { background-color: rgba(${panelAccentRGB}, 0.1) !important; }
          .left-panel-theme-border { border-color: rgba(${panelAccentRGB}, 0.5) !important; }
          .left-panel-theme-border-subtle { border-color: rgba(${panelAccentRGB}, 0.3) !important; }
          .left-panel-theme-border-hover:hover { border-color: rgba(${panelAccentRGB}, 0.5) !important; }
          .left-panel-theme-focus:focus { border-color: rgba(${panelAccentRGB}, 0.5) !important; box-shadow: 0 0 10px rgba(${panelAccentRGB}, 0.1) !important; }
          .left-panel-theme-shadow { box-shadow: 0 0 8px rgba(${panelAccentRGB}, 0.5) !important; }
        `}</style>

        <div 
          ref={panelRef}
          className="absolute top-16 left-0 h-[calc(100%-4rem)] max-w-[90vw] bg-black border-r transform flex flex-col pointer-events-auto transition-all duration-300 ease-out animate-slide-in-left shadow-[0_0_40px_rgba(0,0,0,0.5)]"
          style={{ left: leftPos, width: `${panelWidth}px`, transform: panelTransform, borderColor: `rgba(${panelAccentRGB}, 0.3)` }}
          onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        >
          
          {stackIndex > 0 && !isSideBySide && !isExpanded && (
            <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-8 h-64 z-[0]" />
          )}

          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 z-[110]">
            <button onClick={handleDockClick} className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)]" style={{ borderColor: `rgba(${panelAccentRGB}, 0.4)` }} title="Dock as Tab">
              <PopoutIcon size={16} className="rotate-180" /> 
            </button>
            <button onClick={handleExpandClick} className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)] text-gray-500 hover:text-white hover:bg-gray-800" style={{ borderColor: `rgba(${panelAccentRGB}, 0.4)` }} title={isExpanded ? "Collapse Panel" : "Expand Panel"}>
              <ChevronRightIcon size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} /> 
            </button>
          </div>

          {stackIndex > 0 && !isSideBySide && (
            <div className="absolute inset-0 z-[100] cursor-pointer bg-black/20 hover:bg-transparent transition-colors" onClick={onBringToFront} />
          )}
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(to bottom right, rgba(${panelAccentRGB}, 0.3), transparent, rgba(0,0,0,0))` }} />
            <div className="absolute inset-0 hex-pattern opacity-10" />
          </div>
          
          {/* Header */}
          <div className="relative flex items-center justify-between p-4 border-b" style={{ borderColor: `rgba(${panelAccentRGB}, 0.2)`, background: `linear-gradient(to right, black, rgba(${panelAccentRGB}, 0.05), black)` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border flex items-center justify-center left-panel-theme-bg left-panel-theme-border">
                {activePanel === 'tasks' ? <TaskIcon size={20} style={{ color: panelAccentColor }} /> : <CalendarIcon size={20} style={{ color: panelAccentColor }} />}
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold text-white tracking-wider uppercase">
                  <span style={{ color: panelAccentColor, textShadow: `0 0 8px rgba(${panelAccentRGB}, 0.5)` }}>
                    {activePanel === 'tasks' ? 'TASKS' : 'CALENDAR'}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 font-mono">Quick view</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { if (activePanel === 'tasks' || activePanel === 'calendar') handleNavigateToFullView(activePanel); }}
                className="p-2 text-gray-400 rounded-lg border border-transparent transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={`Open Full ${activePanel === 'tasks' ? 'Tasks' : 'Calendar'} View`}
                onMouseEnter={(e) => { e.currentTarget.style.color = panelAccentColor; e.currentTarget.style.borderColor = `rgba(${panelAccentRGB}, 0.3)`; e.currentTarget.style.background = `rgba(${panelAccentRGB}, 0.1)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
              >
                <PopoutIcon size={18} />
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 rounded-lg border border-transparent transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                onMouseEnter={(e) => { e.currentTarget.style.color = panelAccentColor; e.currentTarget.style.borderColor = `rgba(${panelAccentRGB}, 0.3)`; e.currentTarget.style.background = `rgba(${panelAccentRGB}, 0.1)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
              >
                <CloseIcon size={20} />
              </button>
            </div>
          </div>
          
          <div className="relative flex-1 overflow-hidden flex flex-col">
            {activePanel === 'tasks' ? (
              <TasksQuickView 
                contextWorkspaceId={contextWorkspaceId} contextAppId={contextAppId}
                contextAppName={contextAppName} contextRecordId={contextRecordId}
                contextRecordTitle={contextRecordTitle} accentColor={panelAccentColor} accentRgb={panelAccentRGB}
                currentWorkspaceSlug={currentWorkspaceSlug}
                onNavigateToFullView={handleNavigateToFullView}
                onViewTask={setViewingTaskId}
              />
            ) : (
              <CalendarQuickView accentColor={panelAccentColor} accentRgb={panelAccentRGB} onNavigateToFullView={handleNavigateToFullView} onViewTask={setViewingTaskId} />
            )}
          </div>
        </div>

        {/* ⚡ Popover Modal for viewing a specific task */}
        {viewingTaskId && (
          <TaskViewerModal
            taskId={viewingTaskId}
            onClose={() => setViewingTaskId(null)}
            onViewAll={() => {
              setViewingTaskId(null);
              onNavigateToFullView('tasks');
            }}
            accentColor={panelAccentColor}
            accentRgb={panelAccentRGB}
            currentWorkspaceSlug={currentWorkspaceSlug}
          />
        )}
      </div>
    );
  };


  // ============================================
  // TASK INTERFACE
  // ============================================

  interface Task {
    id: string; organization_id: string; workspace_id?: string | null; mini_app_id?: string | null;
    assigned_to: string; created_by: string; title: string; description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent'; due_date?: string; completed_at?: string | null;
    recurrence?: string; tags?: string[];
    created_at: string; updated_at: string; record_id?: string | null; record_title?: string | null; app_name?: string | null;
  }

  let isTasksCached = { mine: false, delegated: false };
  let globalTasksCache: { mine: Task[]; delegated: Task[] } = { mine: [], delegated: [] };

  interface TasksQuickViewProps {
    contextWorkspaceId?: string; contextAppId?: string; contextAppName?: string; contextRecordId?: string; contextRecordTitle?: string;
    accentColor: string; accentRgb: string;
    currentWorkspaceSlug?: string | null;
    onNavigateToFullView: (view: 'tasks' | 'calendar') => void;
    onViewTask: (id: string) => void;
  }

  const TasksQuickView: React.FC<TasksQuickViewProps> = ({ 
    contextWorkspaceId, contextAppId, contextAppName, contextRecordId, contextRecordTitle, accentColor, accentRgb, currentWorkspaceSlug, onNavigateToFullView, onViewTask
  }) => {
    const { user, organization } = useAuth();
    const userId = user?.id || (user as any)?.uid; 
    
    const [availableStatuses, setAvailableStatuses] = useState([
      { id: 'pending', name: 'Pending', type: 'default', color: '#facc15' },
      { id: 'in_progress', name: 'In Progress', type: 'default', color: '#22d3ee' },
      { id: 'completed', name: 'Completed', type: 'default', color: '#4ade80' },
      { id: 'cancelled', name: 'Cancelled', type: 'default', color: '#6b7280' }
    ]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    
    useEffect(() => {
      const fetchSettings = async () => {
        if (!userId) return;
        const { data } = await supabase.schema('app_private').from('user_settings').select('custom_statuses, tags').eq('user_id', userId).maybeSingle();
        if (data?.custom_statuses) setAvailableStatuses(data.custom_statuses);
        if (data?.tags) setAvailableTags(data.tags);
      };
      fetchSettings();
    }, [userId]);

    const [taskFilter, setTaskFilter] = useState<TaskFilterType>('mine');
    const [tasks, setTasks] = useState<Task[]>(() => globalTasksCache[taskFilter] || []);
    const [loading, setLoading] = useState(() => !isTasksCached[taskFilter]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [newTaskStatus, setNewTaskStatus] = useState('pending');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskDueTime, setNewTaskDueTime] = useState('');
    const [newTaskTags, setNewTaskTags] = useState<string[]>([]);
    const [newTaskRecurrenceType, setNewTaskRecurrenceType] = useState('none');
    const [newTaskRecurrenceInterval, setNewTaskRecurrenceInterval] = useState(1);
    const [newTaskShowOnCalendar, setNewTaskShowOnCalendar] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const formatRecurrenceDisplay = (rec?: string) => {
      if (!rec || rec === 'none') return '';
      const [int, type] = rec.split(' ');
      if (int === '1') return type === 'days' ? 'Daily' : type === 'weeks' ? 'Weekly' : type === 'months' ? 'Monthly' : 'Yearly';
      return `Every ${int} ${type}`;
    };
    const [loadingMore, setLoadingMore] = useState(false);
    const [mineCount, setMineCount] = useState(0);
    const [delegatedCount, setDelegatedCount] = useState(0);

    const refreshTaskCounts = useCallback(async () => {
      if (!userId) return;
      const { count: mCount } = await supabase.schema('app_private').from('tasks').select('*', { count: 'exact', head: true })
        .or(`assigned_to.eq.${userId},and(created_by.eq.${userId},assigned_to.is.null)`);
      const { count: dCount } = await supabase.schema('app_private').from('tasks').select('*', { count: 'exact', head: true })
        .eq('created_by', userId).neq('assigned_to', userId);
      setMineCount(mCount || 0); setDelegatedCount(dCount || 0);
    }, [userId]);

    useEffect(() => { refreshTaskCounts(); }, [refreshTaskCounts]);
    
    const offsetRef = useRef(0);
    const PAGE_SIZE = 20;

    const [members, setMembers] = useState<{id: string, name: string}[]>([]);
    const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
    const [newTaskDescription, setNewTaskDescription] = useState('');

    useEffect(() => {
      const loadMembers = async () => {
        try {
          // Fetch directly from organization_users so we get EVERYONE in the org
          const { data, error } = await supabase.schema('app_private')
            .from('organization_users')
            .select('id, full_name')
            .eq('organization_id', organization?.id);
            
          if (error) throw error;
          
          // Map the actual org users to our members dropdown list
          setMembers((data || []).map(u => ({ 
            id: u.id, 
            name: u.full_name || 'Unknown User' 
          })));
        } catch (err) {
          console.error('Failed to load org members:', err);
        }
      };
      if (organization?.id) loadMembers();
    }, [organization?.id]);

    const fetchTasks = useCallback(async (offset: number = 0, isBackground: boolean = false) => {
      if (!userId) { setLoading(false); return; }
      try {
        if (!isBackground) setLoading(true);
        setErrorMsg(null);
        let query = supabase.schema('app_private').from('tasks').select('*');
        if (taskFilter === 'mine') query = query.or(`assigned_to.eq.${userId},and(created_by.eq.${userId},assigned_to.is.null)`);
        else query = query.eq('created_by', userId).neq('assigned_to', userId);

        // Pre-sort in DB to ensure pagination grabs the most pressing items first
        const { data, error } = await query
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        const results = data || [];
        if (offset === 0) { setTasks(results); globalTasksCache[taskFilter] = results; isTasksCached[taskFilter] = true; } 
        else { setTasks(prev => [...prev, ...results]); globalTasksCache[taskFilter] = [...globalTasksCache[taskFilter], ...results]; }
        setHasMore(results.length >= PAGE_SIZE); offsetRef.current = offset + results.length;
      } catch (err: any) { setErrorMsg('Internal Connection Error'); } finally { setLoading(false); setLoadingMore(false); }
    }, [userId, taskFilter]);

    useEffect(() => { fetchTasks(0, false); }, [fetchTasks]);

    const handleLoadMore = () => { setLoadingMore(true); fetchTasks(offsetRef.current, false); };

    const handleAddTask = async () => {
      if (!newTaskTitle.trim() || !userId) return;
      try {
        let dueDateTimestamp = null;
        if (newTaskDueDate) {
          const timeStr = newTaskDueTime || '23:59';
          dueDateTimestamp = new Date(`${newTaskDueDate}T${timeStr}`).toISOString();
        }

        const taskPayload = { 
          title: newTaskTitle.trim(), 
          description: newTaskDescription.trim() || null,
          priority: newTaskPriority, 
          status: newTaskStatus, 
          created_by: userId, 
          assigned_to: newTaskAssignee || userId, 
          due_date: dueDateTimestamp,
          recurrence: newTaskRecurrenceType === 'none' ? 'none' : `${newTaskRecurrenceInterval} ${newTaskRecurrenceType}`,
          show_on_calendar: newTaskShowOnCalendar,
          organization_id: organization?.id || null, 
          workspace_id: contextWorkspaceId || null, 
          mini_app_id: contextAppId || null, 
          record_id: contextRecordId || null, 
          record_title: contextRecordTitle || null, 
          // ⚡ Automatically label global tasks with their Workspace Dashboard name
          app_name: contextAppName || (currentWorkspaceSlug ? `${currentWorkspaceSlug.charAt(0).toUpperCase() + currentWorkspaceSlug.slice(1)} Dashboard` : 'Dashboard'),
          tags: newTaskTags
        };
        const { data, error } = await supabase.schema('app_private').from('tasks').insert(taskPayload).select().single();
        if (error) throw error;
        setTasks(prev => [data, ...prev]); 
        setNewTaskTitle(''); 
        setNewTaskDescription('');
        setNewTaskAssignee(''); 
        setNewTaskStatus('pending');
        setNewTaskDueDate('');
        setNewTaskDueTime('');
        setNewTaskTags([]);
        setNewTaskRecurrenceType('none');
        setNewTaskRecurrenceInterval(1);
        setNewTaskShowOnCalendar(false);
        setShowAddForm(false); 
        refreshTaskCounts();
        
        // ⚡ Dispatch manual refresh event to instantly sync the main TasksView
        window.dispatchEvent(new CustomEvent('refreshTasks'));
      } catch (err) {
        console.error("Error adding task:", err);
      }
    };

    const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
      try {
        const taskToUpdate = tasks.find(t => t.id === taskId);
        const newCompletedAt = newStatus === 'completed' ? new Date().toISOString() : null;
        const { error } = await supabase.schema('app_private').from('tasks').update({ status: newStatus, completed_at: newCompletedAt, updated_at: new Date().toISOString() }).eq('id', taskId);
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completed_at: newCompletedAt } : t));

        // ⚡ Generate next recurring task if completed
        if (newStatus === 'completed' && taskToUpdate && taskToUpdate.recurrence && taskToUpdate.recurrence !== 'none' && taskToUpdate.due_date) {
          const currentDue = new Date(taskToUpdate.due_date);
          const nextDue = new Date(currentDue);
          if (taskToUpdate.recurrence === 'daily') nextDue.setDate(currentDue.getDate() + 1);
          else if (taskToUpdate.recurrence === 'weekly') nextDue.setDate(currentDue.getDate() + 7);
          else if (taskToUpdate.recurrence === 'monthly') nextDue.setMonth(currentDue.getMonth() + 1);
          else if (taskToUpdate.recurrence === 'yearly') nextDue.setFullYear(currentDue.getFullYear() + 1);
          
          const nextTaskPayload = {
            ...taskToUpdate,
            id: undefined, // let DB generate
            status: 'pending',
            due_date: nextDue.toISOString(),
            completed_at: null,
            created_at: undefined,
            updated_at: undefined
          };
          
          const { data: newTsk } = await supabase.schema('app_private').from('tasks').insert(nextTaskPayload).select().single();
          if (newTsk) setTasks(prev => [newTsk, ...prev]);
        }
        window.dispatchEvent(new CustomEvent('refreshTasks'));
      } catch (err) {}
    };
    
    const handleDeleteTask = async (taskId: string) => {
      try {
        const { error } = await supabase.schema('app_private').from('tasks').delete().eq('id', taskId);
        if (error) throw error;
        setTasks(prev => { const updated = prev.filter(t => t.id !== taskId); globalTasksCache[taskFilter] = updated; return updated; });
        refreshTaskCounts();
        window.dispatchEvent(new CustomEvent('refreshTasks'));
      } catch (err) {}
    };

    const handleReassign = async (taskId: string, newAssignee: string) => {
      try {
        const { error } = await supabase.schema('app_private').from('tasks').update({ assigned_to: newAssignee, updated_at: new Date().toISOString() }).eq('id', taskId);
        if (error) throw error;
        setTasks(prev => { const updated = prev.map(t => t.id === taskId ? { ...t, assigned_to: newAssignee } : t); globalTasksCache[taskFilter] = updated; return updated; });
        refreshTaskCounts();
        window.dispatchEvent(new CustomEvent('refreshTasks'));
      } catch (err) {}
    };
    
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
        case 'high': return 'bg-orange-500 shadow-[0_0_8px_rgba(255,153,0,0.5)]';
        case 'medium': return 'bg-cyan-500 shadow-[0_0_8px_rgba(0,255,255,0.5)]';
        default: return 'bg-gray-500';
      }
    };
    
    const getStatusColor = (statusId: string) => {
      const st = availableStatuses.find(s => s.id === statusId);
      return st ? st.color : '#9ca3af';
    };
    
    const formatDueDate = (date?: string) => {
      if (!date) return null;
      const d = new Date(date); const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      if (d.toDateString() === today.toDateString()) return 'Today';
      if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 h-full">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${accentRgb}, 0.3)`, borderTopColor: accentColor }} />
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Connecting...</p>
      </div>
    );

    if (errorMsg) return (
      <div className="p-6 text-center flex flex-col h-full items-center justify-center">
        <p className="text-red-400 font-mono text-xs mb-2">Query Failed</p>
        <p className="text-gray-500 text-[10px] mb-4 break-words w-full px-4">{errorMsg}</p>
        <button onClick={() => fetchTasks(0)} className="px-4 py-2 border border-gray-700 text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition-colors text-[10px] font-mono uppercase">Retry</button>
      </div>
    );

    return (
      <div className="flex flex-col h-full">
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 darkwave-scrollbar ${taskFilter === 'delegated' ? 'pb-24' : ''}`}>
          <div className="flex border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setTaskFilter('mine')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-mono transition-all ${
                taskFilter === 'mine' ? 'left-panel-theme-bg left-panel-theme-text border-r left-panel-theme-border-subtle' : 'bg-gray-900/50 text-gray-500 hover:text-gray-300 border-r border-gray-800'
              }`}
            >
              <UserIcon size={16} />
              <span>Mine</span>
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: taskFilter === 'mine' ? `rgba(${accentRgb}, 0.3)` : '#1f2937' }}>{mineCount}</span>
            </button>
            <button
              onClick={() => setTaskFilter('delegated')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-mono transition-all ${
                taskFilter === 'delegated' ? 'left-panel-theme-bg left-panel-theme-text' : 'bg-gray-900/50 text-gray-500 hover:text-gray-300'
              }`}
            >
              <UsersIcon size={16} />
              <span>Delegated</span>
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: taskFilter === 'delegated' ? `rgba(${accentRgb}, 0.3)` : '#1f2937' }}>{delegatedCount}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white font-mono">{tasks.length}</p>
              <p className="text-xs text-gray-500 font-mono">Total</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400 font-mono">{tasks.filter(t => t.status === 'pending').length}</p>
              <p className="text-xs text-gray-500 font-mono">Pending</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400 font-mono">{tasks.filter(t => t.priority === 'urgent').length}</p>
              <p className="text-xs text-gray-500 font-mono">Urgent</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 font-mono text-sm">
                {taskFilter === 'mine' ? 'No tasks yet. Add your first task above!' : 'No tasks delegated to you.'}
              </div>
            ) : (
              <>
                {(() => {
                  const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
                  const filtered = tasks.filter(t => taskFilter === 'mine' ? (t.assigned_to === userId || (t.created_by === userId && !t.assigned_to)) : (t.created_by === userId && t.assigned_to !== userId));
                  
                  // Multi-level sort: Due Date -> Priority -> Created Date
                  return [...filtered].sort((a, b) => {
                    // ⚡ FORCE COMPLETED TASKS TO BOTTOM
                    if (a.status === 'completed' && b.status !== 'completed') return 1;
                    if (b.status === 'completed' && a.status !== 'completed') return -1;
                    
                    // If both are completed, sort them by most recently completed first
                    if (a.status === 'completed' && b.status === 'completed') {
                      const compA = new Date(a.completed_at || 0).getTime();
                      const compB = new Date(b.completed_at || 0).getTime();
                      if (compA !== compB) return compB - compA; // Descending
                    }

                    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                    if (dateA !== dateB) return dateA - dateB;
                    
                    const prioA = priorityWeight[a.priority] || 0;
                    const prioB = priorityWeight[b.priority] || 0;
                    if (prioA !== prioB) return prioB - prioA;
                    
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                  });
                })().map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => onViewTask(task.id)}
                    className={`p-3 bg-gray-900/50 border border-gray-800 rounded-lg left-panel-theme-border-hover left-panel-theme-bg-hover transition-all cursor-pointer group ${task.status === 'completed' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click when checking the box
                          handleUpdateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed');
                        }}
                        className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-all ${
                          task.status === 'completed' ? '' : 'border-gray-600 left-panel-theme-border-hover'
                        }`}
                        style={task.status === 'completed' ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                      >
                        {task.status === 'completed' && <CheckIcon size={12} className="text-black" />}
                      </button>
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${getPriorityColor(task.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-mono transition-colors ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-white left-panel-group-hover-theme-text'}`}>
                          {task.title}
                        </p>
                        {task.record_id && task.app_name && (
                          <a 
                            href={`/app/${currentWorkspaceSlug || 'workspace'}/${task.app_name.toLowerCase().replace(/\s+/g, '-')}/${task.record_id}`}
                            target="_blank" rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-gray-400 left-panel-theme-text-hover left-panel-theme-border-hover transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLinkIcon size={10} />
                            <span className="truncate max-w-[180px]">{task.app_name}: {task.record_title || task.record_id.substring(0, 8)}</span>
                          </a>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <select
                            value={task.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(task.id, e.target.value as any);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent focus:outline-none cursor-pointer appearance-none text-xs font-mono font-bold w-fit"
                            style={{ color: getStatusColor(task.status) }}
                            title="Change Status"
                          >
                            {availableStatuses.map(status => (
                              <option key={status.id} value={status.id} className="bg-gray-900 font-bold" style={{ color: status.color || '#ffffff' }}>{status.name}</option>
                            ))}
                          </select>

                          {/* Completed Timestamp Indicator */}
                          {task.status === 'completed' && task.completed_at && (
                            <span className="text-[9px] text-green-500/70 font-mono tracking-widest uppercase whitespace-nowrap">
                              ✓ {new Date(task.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}

                          {task.due_date && (
                            <>
                              <span className="text-xs text-gray-700">&bull;</span>
                              <span className={`text-xs font-mono flex items-center gap-1 ${
                                new Date(task.due_date).getTime() < Date.now() && task.status !== 'completed' 
                                  ? 'text-red-500 font-bold' 
                                  : formatDueDate(task.due_date) === 'Today' ? 'text-red-400' : formatDueDate(task.due_date) === 'Tomorrow' ? 'text-orange-400' : 'text-gray-500'
                              }`}>
                                {new Date(task.due_date).getTime() < Date.now() && task.status !== 'completed' && <span className="uppercase tracking-widest text-[9px] border border-red-500/50 bg-red-500/10 px-1 rounded animate-pulse">Overdue</span>}
                                {formatDueDate(task.due_date)}
                                {task.recurrence && task.recurrence !== 'none' && (
                                  <span className="opacity-70 text-[10px] ml-1 bg-black/40 px-1 rounded border border-gray-700" title={`Repeats ${formatRecurrenceDisplay(task.recurrence)}`}>
                                    ↻ {formatRecurrenceDisplay(task.recurrence)}
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                          {task.created_by !== userId && (
                            <>
                              <span className="text-xs text-gray-700">&bull;</span>
                              <span className="text-xs font-mono text-fuchsia-400">From: {task.created_by.substring(0, 8)}...</span>
                            </>
                          )}
                          <>
                            <span className="text-xs text-gray-700">&bull;</span>
                            <div className="relative inline-flex items-center">
                              {/* Visual Text (Shrink-wraps exactly to current value) */}
                              <span className="text-xs font-mono font-bold hover:opacity-80 cursor-pointer" style={{ color: accentColor }}>
                                To: {task.assigned_to === userId ? 'Me' : (members.find(m => m.id === task.assigned_to)?.name || 'Unknown')}
                              </span>
                              {/* Invisible Select overlapping the text exactly */}
                              <select
                                value={task.assigned_to} 
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleReassign(task.id, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none text-xs font-mono font-bold"
                                title="Change Assignee"
                              >
                                <option className="bg-gray-900 text-white text-xs" value={userId}>To: Me</option>
                                {members.map(m => <option className="bg-gray-900 text-white text-xs" key={m.id} value={m.id}>To: {m.name}</option>)}
                              </select>
                            </div>
                          </>
                          {(task.tags || []).length > 0 && (
                            <>
                              <span className="text-xs text-gray-700">&bull;</span>
                              <div className="flex flex-wrap gap-1 items-center">
                                {task.tags.map((tag: string) => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 rounded text-[9px] font-mono uppercase tracking-wider">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"><TrashIcon size={14} /></button>
                    </div>
                  </div>
                ))}
                
                {hasMore && tasks.length > 0 && (
                  <button
                    onClick={handleLoadMore} disabled={loadingMore}
                    className="w-full py-3 mt-2 border border-dashed rounded-lg transition-all font-mono text-sm flex items-center justify-center gap-2 disabled:opacity-50 left-panel-theme-border-subtle left-panel-theme-text left-panel-theme-bg-hover left-panel-theme-border-hover"
                  >
                    {loadingMore ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${accentRgb}, 0.3)`, borderTopColor: accentColor }} /> Loading...</> : 'Load More Tasks'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {taskFilter === 'mine' && (
          <div className="p-3 pb-24 border-t border-gray-800/50 bg-black/90 flex-shrink-0 z-10">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed transition-all font-mono text-sm left-panel-theme-border-subtle left-panel-theme-text left-panel-theme-bg-hover left-panel-theme-border-hover"
              >
                <PlusIcon size={16} /> Task
              </button>
            ) : (
              <div className="space-y-3">
                {(contextRecordId || contextAppId) && (
                  <div className="flex flex-col gap-1.5 p-2.5 bg-gray-900 border border-gray-700 rounded-lg">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
                      Linking Task To:
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-gray-300 flex-wrap">
                      <span className="bg-black px-1.5 py-0.5 rounded border border-gray-800 truncate max-w-[80px]">{currentWorkspaceSlug || 'Workspace'}</span>
                      {contextAppName && <><ChevronRightIcon size={10} className="text-gray-600" /><span className="bg-black px-1.5 py-0.5 rounded border border-gray-800 truncate max-w-[80px]">{contextAppName}</span></>}
                      {contextRecordId && <><ChevronRightIcon size={10} className="text-gray-600" /><span className="px-1.5 py-0.5 rounded truncate max-w-[120px] left-panel-theme-bg left-panel-theme-border-subtle left-panel-theme-text">{contextRecordTitle || contextRecordId.substring(0,8)}</span></>}
                    </div>
                  </div>
                )}
                <input
                  type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus" autoFocus
                />
                <textarea
                  value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Description (optional)..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus resize-none h-20"
                />
                <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus">
                  <option value={userId}>Assign to: Me</option>
                  {members.map(m => <option key={m.id} value={m.id}>Assign to: {m.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <select value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)} className="w-1/2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus">
                    {availableStatuses.map(status => (
                      <option key={status.id} value={status.id} className="bg-gray-900 font-bold" style={{ color: status.color || '#ffffff' }}>{status.name}</option>
                    ))}
                  </select>
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)} className="w-1/2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <select 
                    value="" 
                    onChange={(e) => {
                      if (!e.target.value) return;
                      if (!newTaskTags.includes(e.target.value)) setNewTaskTags([...newTaskTags, e.target.value]);
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 font-mono text-sm focus:outline-none left-panel-theme-focus"
                  >
                    <option value="">+ Add Tag</option>
                    {availableTags.filter(t => !newTaskTags.includes(t)).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {newTaskTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {newTaskTags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded text-[10px] font-mono flex items-center gap-1 uppercase tracking-wider">
                          {tag}
                          <button onClick={() => setNewTaskTags(prev => prev.filter(t => t !== tag))} className="hover:text-red-400 ml-1">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 font-mono text-sm focus:outline-none left-panel-theme-focus w-1/2" title="Optional Due Date" />
                    <input type="time" value={newTaskDueTime} onChange={(e) => setNewTaskDueTime(e.target.value)} disabled={!newTaskDueDate} className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 font-mono text-sm focus:outline-none left-panel-theme-focus disabled:opacity-50 disabled:cursor-not-allowed w-1/2" title="Optional Due Time" />
                  </div>
                  
                  <div className={`flex items-center justify-between gap-2 border border-gray-700 rounded-lg px-3 py-2 transition-all ${newTaskDueDate ? 'bg-gray-900/50' : 'bg-gray-900/20 opacity-50'}`}>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-gray-500 font-mono text-xs uppercase tracking-widest font-bold">Repeat:</span>
                      <select value={newTaskRecurrenceType} onChange={(e) => setNewTaskRecurrenceType(e.target.value)} disabled={!newTaskDueDate} className="bg-transparent text-white font-mono text-sm focus:outline-none cursor-pointer disabled:cursor-not-allowed" title="Repeat Type">
                        <option className="bg-gray-900" value="none">Never</option>
                        <option className="bg-gray-900" value="days">Days</option>
                        <option className="bg-gray-900" value="weeks">Weeks</option>
                        <option className="bg-gray-900" value="months">Months</option>
                        <option className="bg-gray-900" value="years">Years</option>
                      </select>
                      {newTaskRecurrenceType !== 'none' && (
                        <div className="flex items-center gap-2 ml-auto border-l border-gray-700 pl-3">
                          <span className="text-gray-500 font-mono text-xs uppercase tracking-widest font-bold">Every:</span>
                          <input 
                            type="number" min="1" 
                            value={newTaskRecurrenceInterval} 
                            onChange={(e) => setNewTaskRecurrenceInterval(parseInt(e.target.value) || 1)} 
                            disabled={!newTaskDueDate}
                            className="w-10 bg-black border border-cyan-500/50 rounded px-1 py-1 text-cyan-400 font-mono text-sm text-center focus:outline-none disabled:cursor-not-allowed" 
                          />
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setNewTaskShowOnCalendar(!newTaskShowOnCalendar)}
                      disabled={!newTaskDueDate}
                      className={`flex items-center justify-center p-1.5 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed ${newTaskShowOnCalendar ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,255,255,0.3)]' : 'bg-black/50 text-gray-500 border border-gray-800'}`}
                      title="Show on Calendar"
                    >
                      <CalendarIcon size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleAddTask} className="flex-1 px-4 py-2 rounded-lg transition-all font-mono text-sm left-panel-theme-bg left-panel-theme-border left-panel-theme-text left-panel-theme-bg-hover">
                    Add Task
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-700 transition-all font-mono text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };


  // ============================================
  // CALENDAR EVENT INTERFACE
  // ============================================

  interface CalendarEvent {
    id: string; user_id: string; title: string; description?: string;
    event_type: 'meeting' | 'task' | 'event' | 'reminder' | 'deadline';
    start_time: string; end_time?: string; all_day: boolean; location?: string;
    color: string; created_at: string; status?: string; isDelegated?: boolean;
  }

  interface CalendarQuickViewProps {
    accentColor: string; accentRgb: string;
    onNavigateToFullView: (view: 'tasks' | 'calendar') => void;
    onViewTask: (id: string) => void;
  }

  // Global cache variables so events don't flash/reload every time the panel opens
  let globalCalendarCache: any[] = [];
  let isCalendarCached = false;

  const CalendarQuickView: React.FC<CalendarQuickViewProps> = ({ accentColor, accentRgb, onNavigateToFullView, onViewTask }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>(() => globalCalendarCache);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(() => !isCalendarCached);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showTasks, setShowTasks] = useState(() => localStorage.getItem('acore_cal_show_tasks') !== 'false');
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventType, setNewEventType] = useState<CalendarEvent['event_type']>('meeting');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTime, setNewEventTime] = useState('09:00');
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';
    const today = new Date();
    
    const offsetRef = useRef(0);
    const PAGE_SIZE = 20;
    
    const fetchEvents = useCallback(async (offset: number = 0, isBackground: boolean = false) => {
      try {
        if (!isBackground && offset === 0) setLoading(true);
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        
        // 1. Fetch Standard Calendar Events
        // ⚡ FIX: Use app_private schema and map to created_by instead of user_id
        const { data: calData, error } = await supabase.schema('app_private').from('calendar_events').select('*').eq('created_by', userId).gte('start_time', startOfDay.toISOString()).order('start_time', { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
        if (error && offset === 0) { setEvents([]); globalCalendarCache = []; isCalendarCached = true; return; }

        // 2. Fetch Tasks mapped to calendar (only on initial load to prevent duplication during pagination)
        let taskEvents: any[] = [];
        if (offset === 0) {
          const { data: taskData } = await supabase.schema('app_private')
            .from('tasks')
            .select('*')
            .eq('show_on_calendar', true)
            .not('due_date', 'is', null)
            .or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

          taskEvents = (taskData || []).map(t => ({
            id: t.id,
            user_id: userId,
            title: t.title,
            event_type: 'task',
            start_time: t.due_date,
            all_day: false,
            color: '#f97316', // orange color hex
            created_at: t.created_at,
            status: t.status,
            isDelegated: t.created_by === userId && t.assigned_to !== userId
          }));
        }
        
        // 3. Merge and Sort
        const results = [...(calData || []), ...taskEvents].sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        if (offset === 0) { setEvents(results); globalCalendarCache = results; isCalendarCached = true; } 
        else { const merged = [...globalCalendarCache, ...results]; setEvents(merged); globalCalendarCache = merged; }
        setHasMore((calData || []).length >= PAGE_SIZE); offsetRef.current = offset + (calData || []).length;
      } catch (err) { if (offset === 0) { setEvents([]); globalCalendarCache = []; isCalendarCached = true; } } finally { setLoading(false); setLoadingMore(false); }
    }, [userId]);
    
    useEffect(() => { if (isCalendarCached) { setEvents(globalCalendarCache); setLoading(false); offsetRef.current = 0; fetchEvents(0, true); } else { setLoading(true); offsetRef.current = 0; fetchEvents(0, false); } }, [fetchEvents]);
    
    const handleLoadMore = () => { setLoadingMore(true); fetchEvents(offsetRef.current, false); };
    
    const handleAddEvent = async () => {
      if (!newEventTitle.trim() || !newEventDate) return;
      const startTime = new Date(`${newEventDate}T${newEventTime}`);
      try {
        // ⚡ FIX: Stripped out event_type, color, and user_id since they don't exist in the DB schema yet.
        const { data, error } = await supabase.schema('app_private').from('calendar_events').insert({ 
          created_by: userId, 
          title: newEventTitle.trim(), 
          start_time: startTime.toISOString(), 
          all_day: false 
        }).select().single();
        
        // ⚡ FIX: Explicitly check for null data. If the DB proxy or RLS blocks the return of the inserted row, 
        // we prevent pushing a null object into our local state array so the sorter doesn't crash!
        if (error || !data) {
          // If it succeeded but returned null, trigger a global refresh to sync it the hard way
          if (!error) {
            window.dispatchEvent(new CustomEvent('refreshCalendar'));
            setNewEventTitle(''); setNewEventDate(''); setShowAddForm(false);
          }
          return;
        }

        setEvents(prev => { 
          const updated = [...prev, data].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()); 
          globalCalendarCache = updated; 
          return updated; 
        });
        setNewEventTitle(''); setNewEventDate(''); setShowAddForm(false);
      } catch (err) {}
    };
    
    const handleDeleteEvent = async (eventId: string) => {
      try {
        const eventObj = events.find(e => e.id === eventId);
        
        // If deleting a task from the calendar, just un-sync it
        if (eventObj?.event_type === 'task') {
          await supabase.schema('app_private').from('tasks').update({ show_on_calendar: false }).eq('id', eventId);
        } else {
          // Otherwise completely delete standard calendar events
          await supabase.schema('app_private').from('calendar_events').delete().eq('id', eventId);
        }

        setEvents(prev => { const updated = prev.filter(e => e.id !== eventId); globalCalendarCache = updated; return updated; });
      } catch (err) {}
    };
    
    const getEventTypeColor = (type: string) => {
      switch (type) {
        case 'meeting': return 'bg-cyan-500 shadow-[0_0_8px_rgba(0,255,255,0.5)]';
        case 'task': return 'bg-orange-500 shadow-[0_0_8px_rgba(255,153,0,0.5)]';
        case 'event': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]';
        case 'reminder': return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]';
        case 'deadline': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
        default: return 'bg-gray-500';
      }
    };
    
    const formatEventDate = (dateStr: string) => {
      const date = new Date(dateStr); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    const formatEventTime = (dateStr: string) => { return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); };
    
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const isSelectedToday = selectedDate.toDateString() === today.toDateString();
  
  const displayEvents = events.filter(e => showTasks || e.event_type !== 'task');

  const selectedDateEvents = displayEvents.filter(e => {
    const d = new Date(e.start_time);
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() && 
           d.getFullYear() === selectedDate.getFullYear();
  });

  const upcomingEvents = displayEvents.filter(e => new Date(e.start_time).getTime() > selectedDate.getTime() && new Date(e.start_time).toDateString() !== selectedDate.toDateString());
    
    if (loading) return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${accentRgb}, 0.3)`, borderTopColor: accentColor }} />
      </div>
    );
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 darkwave-scrollbar">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <div className="text-center mb-2"><p className="text-white font-mono font-medium">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</p></div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <div key={i} className="text-xs text-gray-600 font-mono py-1">{day}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="text-xs py-1" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1; 
              const isToday = day === today.getDate();
              const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear();
              const hasEvent = displayEvents.some(e => { const d = new Date(e.start_time); return d.getDate() === day && d.getMonth() === today.getMonth(); });
              return (
                <div 
                  key={day} 
                  onClick={() => setSelectedDate(new Date(today.getFullYear(), today.getMonth(), day))}
                  className={`text-xs py-1 rounded font-mono cursor-pointer transition-all relative ${isSelected ? 'text-white font-bold' : isToday ? 'text-white' : 'text-gray-400 hover:bg-gray-800'}`} 
                  style={isSelected ? { backgroundColor: accentColor, boxShadow: `0 0 8px rgba(${accentRgb}, 0.5)` } : isToday ? { border: `1px solid ${accentColor}`, margin: '-1px' } : {}}
                >
                  {day}
                  {hasEvent && !isSelected && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }} />}
                </div>
              );
            })}
          </div>
        </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-mono font-medium text-gray-400 uppercase tracking-wider">
            {isSelectedToday ? "Today's Events" : `Events for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </h3>
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input type="checkbox" checked={showTasks} onChange={(e) => { setShowTasks(e.target.checked); localStorage.setItem('acore_cal_show_tasks', String(e.target.checked)); }} className="rounded border-gray-700 bg-black text-cyan-500 focus:ring-cyan-500/50 w-3 h-3 cursor-pointer" />
            <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors font-mono uppercase tracking-wider">Show Tasks</span>
          </label>
        </div>
        <div className="space-y-2">
            {selectedDateEvents.length === 0 ? <div className="text-center py-4 text-gray-600 font-mono text-xs">No events scheduled</div> : (
              selectedDateEvents.map((event) => (
                <div 
                  key={event.id} 
                  onClick={() => {
                    if (event.event_type === 'task') {
                      onViewTask(event.id);
                    }
                  }}
                  className={`p-3 bg-gray-900/50 border border-gray-800 rounded-lg left-panel-theme-border-hover left-panel-theme-bg-subtle transition-all group ${event.event_type === 'task' ? 'cursor-pointer hover:bg-orange-500/10 hover:border-orange-500/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getEventTypeColor(event.event_type)}`} />
                    <div className="flex-1">
                      <p className="text-white text-sm font-mono left-panel-group-hover-theme-text transition-colors">{event.title}</p>
                      <p className="text-xs text-gray-500 font-mono">{formatEventTime(event.start_time)}</p>
                    </div>
                    <button onClick={() => handleDeleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"><TrashIcon size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-mono font-medium text-gray-400 mb-2 uppercase tracking-wider">Upcoming</h3>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div 
                  key={event.id} 
                  onClick={() => {
                    if (event.event_type === 'task') {
                      onViewTask(event.id);
                    }
                  }}
                  className={`p-3 bg-gray-900/50 border border-gray-800 rounded-lg left-panel-theme-border-hover left-panel-theme-bg-subtle transition-all group ${event.event_type === 'task' ? 'cursor-pointer hover:bg-orange-500/10 hover:border-orange-500/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getEventTypeColor(event.event_type)}`} />
                    <div className="flex-1">
                      <p className="text-white text-sm font-mono left-panel-group-hover-theme-text transition-colors">{event.title}</p>
                      <p className="text-xs text-gray-500 font-mono">{formatEventDate(event.start_time)} &bull; {formatEventTime(event.start_time)}</p>
                    </div>
                    <button onClick={() => handleDeleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"><TrashIcon size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {hasMore && events.length > 0 && (
          <button onClick={handleLoadMore} disabled={loadingMore} className="w-full py-3 mt-2 border border-dashed rounded-lg transition-all font-mono text-sm flex items-center justify-center gap-2 disabled:opacity-50 left-panel-theme-border-subtle left-panel-theme-text left-panel-theme-bg-hover left-panel-theme-border-hover left-panel-theme-shadow">
            {loadingMore ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${accentRgb}, 0.3)`, borderTopColor: accentColor }} /> Loading...</> : 'Load More Events'}
          </button>
        )}
        </div>

        <div className="p-3 pb-24 border-t border-gray-800/50 bg-black/90 flex-shrink-0 z-10">
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed transition-all font-mono text-sm left-panel-theme-border-subtle left-panel-theme-text left-panel-theme-bg-hover left-panel-theme-border-hover">
              <PlusIcon size={16} /> Event
            </button>
          ) : (
            <div className="space-y-3">
              <input type="text" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="Event title..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus" autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus" />
                <input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus" />
              </div>
              <select value={newEventType} onChange={(e) => setNewEventType(e.target.value as any)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none left-panel-theme-focus">
                <option value="meeting">Meeting</option><option value="event">Event</option><option value="task">Task</option><option value="reminder">Reminder</option><option value="deadline">Deadline</option>
              </select>
              <div className="flex items-center gap-2">
                <button onClick={handleAddEvent} className="flex-1 px-4 py-2 rounded-lg transition-all font-mono text-sm left-panel-theme-bg left-panel-theme-border left-panel-theme-text left-panel-theme-bg-hover">Add Event</button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-700 transition-all font-mono text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default LeftSlidePanel;