  import React, { useEffect, useRef, useCallback, useState } from 'react';
  import { 
    CloseIcon, TaskIcon, CalendarIcon, ChevronRightIcon, ExternalLinkIcon, 
    PlusIcon, TrashIcon, CheckIcon, UsersIcon, UserIcon, PopoutIcon, ClockIcon,
    SearchIcon, SettingsIcon 
  } from '@/components/icons/Icons';
  import * as LucideIcons from 'lucide-react';
  import { TaskPanel, InlineActivityPanel } from '@/components/toolbar/ToolbarPanels';
  import { db } from '@/lib/dbProxy';
  import { supabase } from '@/lib/supabase';

  import { useAuth } from '@/contexts/AuthContext';
  import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';

  type SortField = 'due_date' | 'priority' | 'title' | 'created_at';
  interface SortCriterion { field: SortField; direction: 'asc' | 'desc'; }

  const SortIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="15" y1="18" x2="9" y2="18"></line>
      <line x1="18" y1="12" x2="6" y2="12"></line>
      <line x1="21" y1="6" x2="3" y2="6"></line>
    </svg>
  );

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

  // ⚡ FIX: Add the missing getTagColor helper that the transplanted Task components rely on!
  const getTagColor = (tag: string) => {
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    const bg = colors[Math.abs(hash) % colors.length];
    return { bg };
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
        if (organization?.id) {
          const { data: orgSettings } = await supabase.schema('app_private').from('organizations').select('custom_statuses, tags').eq('id', organization.id).maybeSingle();
          if (orgSettings?.custom_statuses) setAvailableStatuses(orgSettings.custom_statuses);
          if (orgSettings?.tags) {
            const formattedTags = orgSettings.tags.map((t: any) => {
              if (typeof t === 'string') {
                try { const parsed = JSON.parse(t); if (parsed && typeof parsed === 'object' && parsed.id) return parsed; } catch (e) {}
                return { id: t.toLowerCase().replace(/\s+/g, '_'), name: t, color: getTagColor(t).bg };
              }
              return t;
            });
            setAvailableTags(formattedTags);
          }
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
                      {(task.tags || []).map((rawTag: string) => {
                        let tagId = rawTag;
                        if (typeof rawTag === 'string' && rawTag.startsWith('{')) {
                          try { tagId = JSON.parse(rawTag).id || rawTag; } catch(e) {}
                        }
                        const tagObj = availableTags?.find(t => t.id === tagId) || { id: tagId, name: tagId, color: getTagColor(tagId).bg };
                        return (
                          <span key={rawTag} className="px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 uppercase tracking-wider" style={{ backgroundColor: `${tagObj.color}15`, color: tagObj.color, border: `1px solid ${tagObj.color}40` }}>
                            {tagObj.name}
                            <button onClick={() => handleUpdate('tags', task.tags.filter((t: string) => t !== rawTag))} className="hover:text-white ml-1 opacity-70 hover:opacity-100">&times;</button>
                          </span>
                        );
                      })}
                    </div>
                    <select 
                      value="" 
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const val = e.target.value;
                        const currentTags = task.tags || [];
                        // Clean existing tags to prevent duplicates and legacy corruption
                        const cleanedTags = currentTags.map((t: string) => {
                          if (typeof t === 'string' && t.startsWith('{')) {
                            try { return JSON.parse(t).id; } catch(err) { return t; }
                          }
                          return t;
                        });
                        if (!cleanedTags.includes(val)) handleUpdate('tags', [...cleanedTags, val]);
                      }}
                      className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2 text-gray-400 font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer"
                    >
                      <option value="">+ Add Tag</option>
                      {availableTags?.filter(t => {
                        const currentCleaned = (task.tags || []).map((ct: string) => {
                          if (typeof ct === 'string' && ct.startsWith('{')) {
                            try { return JSON.parse(ct).id; } catch(e) { return ct; }
                          }
                          return ct;
                        });
                        return !currentCleaned.includes(t.id);
                      }).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
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
    const { user, organization } = useAuth(); // ⚡ Destructure organization
    const [isHovered, setIsHovered] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDocked, setIsDocked] = useState(false);
    const [isSideBySide, setIsSideBySide] = useState(false);
    const [globalDocked, setGlobalDocked] = useState<string[]>(() => getGlobalDocked('left'));
    
    // ⚡ NEW: User Custom Colors
    const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});
    const [isColorLoaded, setIsColorLoaded] = useState(false); // Track color loading

    // ⚡ FETCH: LeftSlidePanel Colors (Inherits from BottomNav settings)
    useEffect(() => {
      const fetchUserPreferences = async () => {
        const userId = user?.id || (user as any)?.uid;
        if (!userId || !organization?.id) {
          setIsColorLoaded(true);
          return;
        }
        try {
          const { data, error } = await supabase.schema('app_private')
            .from('user_preferences')
            .select('nav_colors')
            .eq('user_id', userId)
            .eq('organization_id', organization.id) // ⚡ Scope to active org
            .maybeSingle();
            
          if (error) console.error('[LeftSlidePanel] Error fetching colors:', error);
          if (data?.nav_colors) setUserNavColors(data.nav_colors);
        } catch (err) {
          console.error('[LeftSlidePanel] Caught error fetching colors:', err);
        } finally {
          setIsColorLoaded(true);
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

    const panelWidth = isExpanded ? 836 : 418;
    const isFrontExpanded = Object.values(leftPanelStates || {}).includes('expanded');
    const expansionOffset = (stackIndex > 0 && isFrontExpanded) ? 418 : 0;
    const baseOffset = (stackIndex * 48) + (isHovered && stackIndex > 0 ? 24 : 0);
    const sideBySidePos = 418 + (isFrontExpanded ? 418 : 0);
    
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
    if (!isColorLoaded) return null;

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

  let currentOrgCacheId: string | null = null;
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
    const [availablePriorities, setAvailablePriorities] = useState([
      { id: 'low', name: 'Low', type: 'default', color: '#9ca3af' },
      { id: 'medium', name: 'Medium', type: 'default', color: '#22d3ee' },
      { id: 'high', name: 'High', type: 'default', color: '#f97316' },
      { id: 'urgent', name: 'Urgent', type: 'default', color: '#ef4444' }
    ]);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    
    // ⚡ NEW UI STATES FOR INLINE EDITING
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
    const [activeTaskTags, setActiveTaskTags] = useState<Record<string, string>>({});
    const [taskColorMode, setTaskColorMode] = useState<'tags' | 'status' | 'priority'>(() => {
      return (localStorage.getItem('acore_task_color_mode') as 'tags' | 'status' | 'priority') || 'tags';
    });

    // ⚡ NEW FILTER STATES
    const [activeFilterCategory, setActiveFilterCategory] = useState<'statuses' | 'tags' | 'priorities'>('statuses');
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [tagFilters, setTagFilters] = useState<string[]>([]); 
    const [priorityFilters, setPriorityFilters] = useState<string[]>([]);

    // ⚡ NEW: Drag-to-Scroll & Cover-Flow Logic for Tags
    const tagsScrollRef = React.useRef<HTMLDivElement>(null);
    const [isDraggingTags, setIsDraggingTags] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDownTags = (e: React.MouseEvent) => {
      if (!tagsScrollRef.current) return;
      setIsDraggingTags(true);
      setStartX(e.pageX - tagsScrollRef.current.offsetLeft);
      setScrollLeft(tagsScrollRef.current.scrollLeft);
    };
    const handleMouseLeaveTags = () => setIsDraggingTags(false);
    const handleMouseUpTags = () => setIsDraggingTags(false);
    const handleMouseMoveTags = (e: React.MouseEvent) => {
      if (!isDraggingTags || !tagsScrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - tagsScrollRef.current.offsetLeft;
      const walk = (x - startX) * 2; 
      tagsScrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const updateCarouselVisuals = useCallback(() => {
      if (!tagsScrollRef.current) return;
      const container = tagsScrollRef.current;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      
      Array.from(container.children).forEach((child: any) => {
        const childCenter = child.offsetLeft + (child.clientWidth / 2);
        const centerDiff = childCenter - containerCenter;
        const absDiff = Math.abs(centerDiff);
        
        // Match the sizing from TasksView mapping
        const offset = centerDiff / 170; 
        const absOffset = Math.abs(offset);
        
        const translateZ = -absOffset * 60;
        const rotateY = offset * -35; 
        const translateX = offset === 0 ? 0 : (offset > 0 ? -1 : 1) * (absOffset * 55);
        
        const scale = Math.max(0.75, 1 - absOffset * 0.1);
        const opacity = Math.max(0, 1 - (absOffset * 0.35)); 
        const zIndex = Math.round(100 - absOffset * 10);
        
        const isSelected = child.dataset.selected === 'true';
        const yOffset = isSelected ? -10 : 0;
        const scaleMult = isSelected ? 1.05 : 1;

        child.style.transform = `perspective(1000px) translateX(${translateX}px) translateY(${yOffset}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale * scaleMult})`;
        child.style.opacity = opacity.toString();
        child.style.zIndex = zIndex.toString();
        child.style.filter = `brightness(${Math.max(0.3, 1 - absOffset * 0.25)})`;
      });
    }, []);

    const handleCarouselScroll = () => {
      updateCarouselVisuals();
      const container = tagsScrollRef.current;
      if (!container || isDraggingTags) return;
      
      const setWidth = container.scrollWidth / 9;
      if (setWidth === 0) return;

      if (container.scrollLeft <= setWidth * 2) {
        container.style.scrollBehavior = 'auto';
        container.scrollLeft += setWidth * 3;
        requestAnimationFrame(() => { if (container) container.style.scrollBehavior = 'smooth'; });
      } else if (container.scrollLeft >= setWidth * 7) {
        container.style.scrollBehavior = 'auto';
        container.scrollLeft -= setWidth * 3;
        requestAnimationFrame(() => { if (container) container.style.scrollBehavior = 'smooth'; });
      }
    };

    // Momentum Desktop Scrolling
    useEffect(() => {
      const container = tagsScrollRef.current;
      if (!container) return;
      const handleWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          container.scrollBy({ left: e.deltaY, behavior: 'auto' });
        }
      };
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    useEffect(() => {
      if (tagsScrollRef.current) {
        setTimeout(() => {
          if (tagsScrollRef.current) {
            const setWidth = tagsScrollRef.current.scrollWidth / 9;
            tagsScrollRef.current.scrollLeft = (setWidth * 4) + (setWidth / 2) - (tagsScrollRef.current.clientWidth / 2);
            updateCarouselVisuals();
          }
        }, 50);
      }
    }, [activeFilterCategory, availableStatuses, availableTags, availablePriorities]);

    useEffect(() => {
      updateCarouselVisuals();
      window.addEventListener('resize', updateCarouselVisuals);
      return () => window.removeEventListener('resize', updateCarouselVisuals);
    }, [updateCarouselVisuals]);


    const toggleTaskExpand = (taskId: string) => setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      return `${r}, ${g}, ${b}`;
    };

    const getPriorityInfo = (priorityId: string) => {
      const p = availablePriorities.find(p => p.id === priorityId);
      const color = p ? p.color : '#9ca3af';
      return { color, rgb: hexToRgb(color), name: p ? p.name : priorityId };
    };

    const getPriorityStyle = (priorityId: string): React.CSSProperties => {
      const { color, rgb } = getPriorityInfo(priorityId);
      return { backgroundColor: `rgba(${rgb}, 0.2)`, color: color, borderColor: `rgba(${rgb}, 0.4)`, boxShadow: `0 0 8px rgba(${rgb}, 0.3)` };
    };

    const handleUpdateTaskDetail = async (taskId: string, field: string, value: any) => {
      try {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
        await supabase.schema('app_private').from('tasks').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', taskId);
        globalTasksCache[taskFilter] = globalTasksCache[taskFilter].map(t => t.id === taskId ? { ...t, [field]: value } : t);
        window.dispatchEvent(new CustomEvent('refreshTasks'));
      } catch (err) { console.error(`Error updating task ${field}:`, err); }
    };

    const handleUpdateDueDate = async (task: any, newDateStr: string, newTimeStr: string) => {
      let newIso = null;
      if (newDateStr) {
        const timeStr = newTimeStr || '23:59';
        const d = new Date(`${newDateStr}T${timeStr}`);
        if (!isNaN(d.getTime())) newIso = d.toISOString();
      }
      await handleUpdateTaskDetail(task.id, 'due_date', newIso);
    };

    useEffect(() => {
      const fetchSettings = async () => {
        if (!organization?.id) return;
        const { data } = await supabase.schema('app_private').from('organizations').select('custom_statuses, custom_priorities, tags').eq('id', organization.id).maybeSingle();
        if (data?.custom_statuses) setAvailableStatuses(data.custom_statuses);
        if (data?.custom_priorities) setAvailablePriorities(data.custom_priorities);
        if (data?.tags) {
          const formattedTags = data.tags.map((t: any) => {
            if (typeof t === 'string') {
              try { const parsed = JSON.parse(t); if (parsed && typeof parsed === 'object' && parsed.id) return parsed; } catch (e) {}
              return { id: t.toLowerCase().replace(/\s+/g, '_'), name: t, color: getTagColor(t).bg };
            }
            return t;
          });
          setAvailableTags(formattedTags);
        }
      };
      fetchSettings();
    }, [userId, organization?.id]);

    // ⚡ WIPE CACHE IF ORGANIZATION CHANGES TO PREVENT DATA BLEED
    if (currentOrgCacheId !== organization?.id) {
      currentOrgCacheId = organization?.id || null;
      isTasksCached = { mine: false, delegated: false };
      globalTasksCache = { mine: [], delegated: [] };
    }

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
      if (!userId || !organization?.id) return;
      const { count: mCount } = await supabase.schema('app_private').from('tasks').select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id) // ⚡ Scope count to active org
        .or(`assigned_to.eq.${userId},and(created_by.eq.${userId},assigned_to.is.null)`);
      const { count: dCount } = await supabase.schema('app_private').from('tasks').select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id) // ⚡ Scope count to active org
        .eq('created_by', userId).neq('assigned_to', userId);
      setMineCount(mCount || 0); setDelegatedCount(dCount || 0);
    }, [userId, organization?.id]);

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
      if (!userId || !organization?.id) { setLoading(false); return; }
      try {
        if (!isBackground) setLoading(true);
        setErrorMsg(null);
        let query = supabase.schema('app_private')
          .from('tasks')
          .select('*')
          .eq('organization_id', organization.id); // ⚡ Scope list to active org
          
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

          {/* Category Toggle Switch */}
          <div className="flex bg-black/50 border border-gray-800 rounded-lg p-1 shadow-inner h-[32px] items-center mt-2">
            {(['statuses', 'tags', 'priorities'] as const).map(cat => {
              const isActive = activeFilterCategory === cat;
              const filterCount = cat === 'statuses' ? statusFilters.length : cat === 'tags' ? tagFilters.length : priorityFilters.length;
              
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilterCategory(cat)}
                  className={`relative flex-1 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all h-full flex items-center justify-center ${
                    isActive 
                      ? 'bg-white/10 text-white shadow-sm font-bold border border-white/20' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                  }`}
                  style={isActive ? { color: accentColor, borderColor: `rgba(${accentRgb}, 0.5)`, backgroundColor: `rgba(${accentRgb}, 0.15)` } : {}}
                >
                  {cat}
                  {filterCount > 0 && (
                    <span 
                      className="absolute -top-3 -right-1 px-1 py-0.5 rounded border bg-black text-[8px] font-bold pointer-events-none leading-none z-10"
                      style={{ color: accentColor, borderColor: accentColor, boxShadow: `0 0 8px rgba(${accentRgb}, 0.3)` }}
                    >
                      {filterCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter Cards (Carousel) */}
          <div 
            ref={tagsScrollRef}
            onScroll={handleCarouselScroll}
            onMouseDown={handleMouseDownTags}
            onMouseLeave={handleMouseLeaveTags}
            onMouseUp={handleMouseUpTags}
            onMouseMove={handleMouseMoveTags}
            className="flex overflow-x-auto gap-6 py-8 px-[calc(50%-75px)] no-scrollbar snap-x snap-mandatory cursor-grab active:cursor-grabbing"
            style={{ 
              scrollBehavior: 'smooth',
              maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', 
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' 
            }}
          >
            {(() => {
              let activeItems: any[] = [];
              if (activeFilterCategory === 'statuses') activeItems = availableStatuses.map(s => ({ ...s, type: 'status' }));
              else if (activeFilterCategory === 'tags') activeItems = availableTags.map(t => ({ ...t, type: 'tag' }));
              else if (activeFilterCategory === 'priorities') activeItems = availablePriorities.map(p => ({ ...p, type: 'priority' }));

              if (activeItems.length === 0) return null;

              // Create 9 identical sets for seamless 3D infinite scrolling
              const infiniteItems = Array(9).fill(activeItems).flat().map((item, idx) => ({ ...item, _loopId: idx }));

              return infiniteItems.map(item => {
                const count = tasks.filter(t => {
                  // Base View Mode logic - kept identical to LeftSlidePanel requirements
                  if (taskFilter === 'mine' && !(t.assigned_to === userId || (t.created_by === userId && !t.assigned_to))) return false;
                  if (taskFilter === 'delegated' && !(t.created_by === userId && t.assigned_to !== userId)) return false;

                  // Cross-Category Filtering
                  if (item.type !== 'status' && statusFilters.length > 0 && !statusFilters.includes(t.status)) return false;
                  if (item.type !== 'priority' && priorityFilters.length > 0 && !priorityFilters.includes(t.priority)) return false;
                  if (item.type !== 'tag' && tagFilters.length > 0 && !tagFilters.some(tf => (t.tags || []).includes(tf))) return false;

                  // Match the specific item itself
                  if (item.type === 'status' && t.status !== item.id) return false;
                  if (item.type === 'tag' && !(t.tags || []).includes(item.id)) return false;
                  if (item.type === 'priority' && t.priority !== item.id) return false;

                  return true;
                }).length;
                
                const rgb = hexToRgb(item.color || '#9ca3af');
                
                let isSelected = false;
                if (item.type === 'status') isSelected = statusFilters.includes(item.id);
                if (item.type === 'tag') isSelected = tagFilters.includes(item.id);
                if (item.type === 'priority') isSelected = priorityFilters.includes(item.id);

                const handleClick = () => {
                  if (item.type === 'status') setStatusFilters(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                  if (item.type === 'tag') setTagFilters(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                  if (item.type === 'priority') setPriorityFilters(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                };
                
                return (
                  <div 
                    key={item._loopId}
                    data-selected={isSelected}
                    onClick={handleClick}
                    className="snap-center flex-none w-[150px] backdrop-blur-md rounded-xl p-4 relative border cursor-pointer group flex flex-col justify-center items-center text-center will-change-transform"
                    style={{ 
                      background: `radial-gradient(circle at center, rgba(0,0,0,0.8) 0%, rgba(${rgb}, 0.25) 100%)`,
                      borderColor: isSelected ? item.color : `rgba(${rgb}, 0.4)`,
                      boxShadow: isSelected 
                        ? `0 0 25px rgba(${rgb}, 0.8), inset 0 0 30px rgba(${rgb}, 0.5)` 
                        : `0 0 10px rgba(${rgb}, 0.1), inset 0 0 15px rgba(${rgb}, 0.2)`,
                      transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
                    }}
                  >
                    {/* Corner accents (Brackets) */}
                    <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 rounded-tl-xl" style={{ borderColor: isSelected ? '#fff' : item.color }} />
                    <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 rounded-tr-xl" style={{ borderColor: isSelected ? '#fff' : item.color }} />
                    <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 rounded-bl-xl" style={{ borderColor: isSelected ? '#fff' : item.color }} />
                    <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 rounded-br-xl" style={{ borderColor: isSelected ? '#fff' : item.color }} />
                    
                    <p className="text-xs font-mono uppercase tracking-wider truncate w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                       style={{ color: isSelected ? '#fff' : `rgba(${rgb}, 0.8)` }} title={item.name}>
                      {item.name}
                    </p>
                    <p 
                      className="text-3xl font-bold mt-2 font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" 
                      style={{ color: isSelected ? '#fff' : item.color, textShadow: isSelected ? `0 0 12px rgba(255,255,255,0.5)` : `0 0 8px rgba(${rgb}, 0.5)` }}
                    >
                      {count}
                    </p>
                  </div>
                );
              });
            })()}
          </div>
          
          <div className="space-y-2 relative">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 font-mono text-sm">
                {taskFilter === 'mine' ? 'No tasks yet. Add your first task above!' : 'No tasks delegated to you.'}
              </div>
            ) : (
              <>
                {(() => {
                  let currentGroup: string | null = null;
                  const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
                  
                  // ⚡ MULTI-FILTER ENGINE
                  const filtered = tasks.filter(t => {
                    // 1. View Mode Logic
                    if (taskFilter === 'mine' && !(t.assigned_to === userId || (t.created_by === userId && !t.assigned_to))) return false;
                    if (taskFilter === 'delegated' && !(t.created_by === userId && t.assigned_to !== userId)) return false;

                    // 2. Cross-Category Filters
                    if (statusFilters.length > 0 && !statusFilters.includes(t.status)) return false;
                    if (priorityFilters.length > 0 && !priorityFilters.includes(t.priority)) return false;
                    if (tagFilters.length > 0) {
                      const taskTags = t.tags || [];
                      if (!tagFilters.some(tf => taskTags.includes(tf))) return false;
                    }

                    return true;
                  });
                  
                  // Multi-level sort: Due Date -> Priority -> Created Date
                  return [...filtered].sort((a, b) => {
                    if (a.status === 'completed' && b.status !== 'completed') return 1;
                    if (b.status === 'completed' && a.status !== 'completed') return -1;
                    
                    if (a.status === 'completed' && b.status === 'completed') {
                      const compA = new Date(a.completed_at || 0).getTime();
                      const compB = new Date(b.completed_at || 0).getTime();
                      if (compA !== compB) return compB - compA; 
                    }

                    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                    if (dateA !== dateB) return dateA - dateB;
                    
                    const prioA = priorityWeight[a.priority] || 0;
                    const prioB = priorityWeight[b.priority] || 0;
                    if (prioA !== prioB) return prioB - prioA;
                    
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                  }).map((task) => {
                    const formattedDate = formatDueDate(task.due_date);
                    const isPastDue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'completed';
                    
                    let groupName = 'Other';
                    if (task.status === 'completed') {
                      groupName = 'Completed';
                    } else {
                      if (!task.due_date) {
                        groupName = 'No Due Date';
                      } else {
                        const due = new Date(task.due_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const taskDate = new Date(due);
                        taskDate.setHours(0, 0, 0, 0);

                        if (taskDate.getTime() < today.getTime()) groupName = 'Overdue';
                        else if (taskDate.getTime() === today.getTime()) groupName = 'Today';
                        else if (taskDate.getTime() === tomorrow.getTime()) groupName = 'Tomorrow';
                        else groupName = 'Upcoming';
                      }
                    }

                    const isNewGroup = groupName !== currentGroup;
                    if (isNewGroup) currentGroup = groupName;

                    // ⚡ Clean legacy JSON tags for the active tag ID
                    let activeTagId = activeTaskTags[task.id] || (task.tags && task.tags[0]) || null;
                    if (typeof activeTagId === 'string' && activeTagId.startsWith('{')) {
                      try { activeTagId = JSON.parse(activeTagId).id || activeTagId; } catch(e) {}
                    }
                    const activeTagObj = activeTagId ? (availableTags.find(t => t.id === activeTagId) || { name: activeTagId, color: getTagColor(activeTagId).bg }) : null;

                    let activeColorHex = '#9ca3af';
                    if (taskColorMode === 'status') {
                      activeColorHex = getStatusColor(task.status);
                    } else if (taskColorMode === 'priority') {
                      activeColorHex = getPriorityInfo(task.priority).color;
                    } else {
                      activeColorHex = activeTagObj ? activeTagObj.color : getPriorityInfo(task.priority).color;
                    }
                    const activeRgb = hexToRgb(activeColorHex);

                    const defaultBorder = `rgba(${activeRgb}, 0.6)`; 
                    const defaultBg = `rgba(${activeRgb}, 0.05)`;
                    const hoverBorder = `rgba(${activeRgb}, 1)`; 
                    const hoverBg = `rgba(${activeRgb}, 0.12)`;
                    const hoverShadow = `0 0 35px rgba(${activeRgb}, 0.5)`;

                    return (
                      <React.Fragment key={task.id}>
                        {isNewGroup && (
                          <div className="flex items-center gap-3 mt-7 mb-3 ml-1 opacity-90 animate-in fade-in duration-300">
                            <h4 className="text-[14px] font-mono font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                                style={{ color: groupName === 'Overdue' ? '#ef4444' : groupName === 'Today' ? '#f97316' : undefined }}>
                              {groupName}
                            </h4>
                            <div className="h-px flex-1 mt-0.5" style={{ background: `linear-gradient(90deg, rgba(75,85,99,0.8), transparent)` }}></div>
                          </div>
                        )}
                        <div
                          id={`task-${task.id}`}
                          onClick={() => onViewTask(task.id)}
                          className={`p-3 pl-8 transition-all duration-300 ease-out group rounded-xl border cursor-pointer relative z-10 hover:z-40 hover:scale-[1.015] hover:-translate-y-1 ${
                            task.status === 'completed' ? 'opacity-60 border-gray-800 bg-black/40 hover:bg-white/5' : ''
                          }`}
                          style={task.status !== 'completed' ? { borderColor: defaultBorder, backgroundColor: defaultBg } : {}}
                          onMouseEnter={(e) => {
                            if (task.status !== 'completed') {
                              e.currentTarget.style.borderColor = hoverBorder;
                              e.currentTarget.style.backgroundColor = hoverBg;
                              e.currentTarget.style.boxShadow = hoverShadow;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (task.status !== 'completed') {
                              e.currentTarget.style.borderColor = defaultBorder;
                              e.currentTarget.style.backgroundColor = defaultBg;
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <div className="flex items-start gap-3 sm:gap-4 relative z-10">
                            {/* Checkbox */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(e, task);
                              }}
                              className={`mt-0.5 w-7 h-7 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              task.status === 'completed'
                                ? 'bg-green-500/30 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                                : 'border-gray-600 hover:border-cyan-500 hover:shadow-[0_0_8px_rgba(0,255,255,0.3)]'
                            }`}>
                              {task.status === 'completed' && (
                                <CheckIcon size={14} className="text-green-400" />
                              )}
                            </button>

                            {/* Task Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0 flex items-start gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task.id); }}
                                    className="mt-0.5 text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0"
                                  >
                                    <ChevronRightIcon size={16} className={`transition-transform duration-200 ${expandedTasks[task.id] ? 'rotate-90' : ''}`} />
                                  </button>
                                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <h3 className={`font-mono font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                                      <InlineEdit 
                                        value={task.title} 
                                        onSave={(val) => handleUpdateTaskDetail(task.id, 'title', val)} 
                                        className="max-w-full whitespace-normal break-words sm:truncate inline-block leading-snug"
                                        inputClassName="min-w-[150px] max-w-full text-xs"
                                      />
                                    </h3>
                                    {/* App Source Link */}
                                    {task.app_name && (
                                      <span className="flex items-center gap-1 w-fit px-1.5 py-0.5 rounded text-[8px] bg-black/40 border border-gray-700 text-gray-400 uppercase tracking-widest whitespace-nowrap mt-1">
                                        <TaskIcon size={10} />
                                        {task.app_name}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} 
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                    title="Delete Task"
                                  >
                                    <TrashIcon size={14} />
                                  </button>
                                </div>
                              </div>

                              {expandedTasks[task.id] && (
                                <div className="text-xs text-gray-400 mb-3 ml-6 font-mono break-words flex items-start animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                  <InlineEdit 
                                    value={task.description || ''} 
                                    onSave={(val) => handleUpdateTaskDetail(task.id, 'description', val)} 
                                    placeholder="Click to add description..."
                                    multiline={true}
                                    className="!w-auto !block max-w-full"
                                  />
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono ml-6 mt-2" onClick={(e) => e.stopPropagation()}>
                                
                                <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-black/40 border border-gray-800 hover:border-gray-700 transition-colors">
                                  <select
                                    value={task.status}
                                    onChange={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, e.target.value as any); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent focus:outline-none cursor-pointer appearance-none font-bold"
                                    style={{ color: getStatusColor(task.status) }}
                                  >
                                    {availableStatuses.map(status => (
                                      <option key={status.id} value={status.id} className="bg-gray-900 font-bold" style={{ color: status.color || '#ffffff' }}>{status.name}</option>
                                    ))}
                                  </select>
                                </div>

                                {task.status === 'completed' && task.completed_at && (
                                  <span className="text-[9px] text-green-500/70 font-mono tracking-widest uppercase whitespace-nowrap">
                                    ✓ {new Date(task.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}

                                <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-black/40 border border-gray-800 hover:border-gray-700 transition-colors">
                                  <UserIcon size={12} className="text-gray-600" />
                                  <select
                                    value={task.assigned_to}
                                    onChange={(e) => { e.stopPropagation(); handleReassign(task.id, e.target.value); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent focus:outline-none cursor-pointer appearance-none text-gray-400 hover:text-white transition-colors max-w-[70px] truncate"
                                  >
                                    <option value={userId}>Me</option>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                  </select>
                                </div>

                                <div className={`flex items-center gap-x-1 px-1.5 py-1 rounded border transition-colors ${
                                  isPastDue ? 'border-red-500/50 bg-red-500/10' :
                                  formattedDate === 'Today' ? 'bg-black/40 border-red-500/30' : 
                                  formattedDate === 'Tomorrow' ? 'bg-black/40 border-orange-500/30' : 'bg-black/40 border-gray-800'
                                }`}>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isPastDue && <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest mr-0.5 animate-pulse">OVERDUE</span>}
                                    <ClockIcon size={12} className={isPastDue ? 'text-red-500' : formattedDate === 'Today' ? 'text-red-400' : formattedDate === 'Tomorrow' ? 'text-orange-400' : 'text-gray-600'} />
                                  </div>
                                  <input
                                    type="date"
                                    value={task.due_date ? String(new Date(task.due_date).getFullYear()).padStart(4, '0') + '-' + String(new Date(task.due_date).getMonth() + 1).padStart(2, '0') + '-' + String(new Date(task.due_date).getDate()).padStart(2, '0') : ''}
                                    onChange={(e) => {
                                      if (e.target.validity.badInput) return; 
                                      const newDate = e.target.value;
                                      const existingTime = task.due_date ? String(new Date(task.due_date).getHours()).padStart(2, '0') + ':' + String(new Date(task.due_date).getMinutes()).padStart(2, '0') : '23:59';
                                      handleUpdateDueDate(task, newDate, existingTime);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`bg-transparent focus:outline-none cursor-pointer appearance-none font-mono text-[10px] sm:text-xs ${
                                      isPastDue ? 'text-red-500 font-bold' : formattedDate === 'Today' ? 'text-red-400' : formattedDate === 'Tomorrow' ? 'text-orange-400' : 'text-gray-400'
                                    } [color-scheme:dark] w-[80px] sm:w-[90px]`}
                                  />
                                  {task.due_date && (
                                    <input
                                      type="time"
                                      value={task.due_date ? String(new Date(task.due_date).getHours()).padStart(2, '0') + ':' + String(new Date(task.due_date).getMinutes()).padStart(2, '0') : ''}
                                      onChange={(e) => {
                                        if (e.target.validity.badInput) return; 
                                        const newTime = e.target.value;
                                        const existingDate = String(new Date(task.due_date).getFullYear()).padStart(4, '0') + '-' + String(new Date(task.due_date).getMonth() + 1).padStart(2, '0') + '-' + String(new Date(task.due_date).getDate()).padStart(2, '0');
                                        handleUpdateDueDate(task, existingDate, newTime);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-transparent focus:outline-none cursor-pointer appearance-none font-mono text-[10px] text-gray-500 [color-scheme:dark] w-[50px] sm:w-[60px]"
                                    />
                                  )}
                                </div>

                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateTaskDetail(task.id, 'show_on_calendar', !task.show_on_calendar); }}
                                  className={`flex items-center gap-1 px-1.5 py-1 rounded border transition-colors ${task.show_on_calendar ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-black/40 border-gray-800 text-gray-500'}`}
                                  title={task.show_on_calendar ? "Visible on Calendar" : "Show on Calendar"}
                                >
                                  <CalendarIcon size={12} />
                                </button>

                                <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-black/40 border border-gray-800 transition-colors">
                                  <span className="text-gray-600 font-mono text-[10px]" title="Repeat Task">↻</span>
                                  <select
                                    value={task.recurrence ? (task.recurrence === 'none' ? 'none' : task.recurrence.split(' ')[1] || 'none') : 'none'}
                                    onChange={(e) => {
                                       e.stopPropagation();
                                       const newType = e.target.value;
                                       if (newType === 'none') {
                                         handleUpdateTaskDetail(task.id, 'recurrence', 'none');
                                       } else {
                                         const currentInt = task.recurrence && task.recurrence !== 'none' ? task.recurrence.split(' ')[0] : '1';
                                         handleUpdateTaskDetail(task.id, 'recurrence', `${currentInt} ${newType}`);
                                       }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent focus:outline-none cursor-pointer appearance-none text-gray-400 hover:text-white transition-colors text-[10px] font-mono font-bold"
                                  >
                                    <option value="none" className="bg-gray-900">Once</option>
                                    <option value="days" className="bg-gray-900">Days</option>
                                    <option value="weeks" className="bg-gray-900">Weeks</option>
                                    <option value="months" className="bg-gray-900">Months</option>
                                    <option value="years" className="bg-gray-900">Years</option>
                                  </select>
                                  
                                  {task.recurrence && task.recurrence !== 'none' && (
                                     <>
                                       <span className="text-gray-600 font-mono text-[9px] ml-1 uppercase tracking-widest">Every:</span>
                                       <input 
                                         type="number" min="1" 
                                         value={task.recurrence.split(' ')[0]} 
                                         onChange={(e) => {
                                            const newInt = parseInt(e.target.value) || 1;
                                            const type = task.recurrence.split(' ')[1] || 'days';
                                            handleUpdateTaskDetail(task.id, 'recurrence', `${newInt} ${type}`);
                                         }}
                                         onClick={(e) => e.stopPropagation()}
                                         className="w-8 bg-black/50 text-cyan-400 border border-cyan-500/30 rounded focus:border-cyan-500 focus:outline-none text-center text-[10px] font-mono font-bold py-0.5"
                                       />
                                     </>
                                  )}
                                </div>

                                <div className="ml-auto flex items-center shrink-0">
                                  <select
                                    value={task.priority}
                                    onChange={(e) => { e.stopPropagation(); handleUpdateTaskDetail(task.id, 'priority', e.target.value); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent focus:outline-none cursor-pointer appearance-none px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold uppercase w-fit"
                                    style={getPriorityStyle(task.priority)}
                                  >
                                    {availablePriorities.map(p => (
                                      <option key={p.id} value={p.id} className="bg-gray-900 font-bold" style={{ color: p.color }}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>

                              </div>
                            </div>
                          </div>

                          {/* ⚡ Left-Edge Hover Cascade with +X Bubble */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="absolute left-[1px] top-[1px] bottom-[1px] flex flex-row z-20 group/cascade rounded-l-[11px] overflow-hidden shadow-[4px_0_10px_rgba(0,0,0,0.3)] bg-black">
                              {task.tags.map((rawTag: string, index: number) => {
                                let tagId = rawTag;
                                if (typeof rawTag === 'string' && rawTag.startsWith('{')) {
                                  try { tagId = JSON.parse(rawTag).id || rawTag; } catch(e) {}
                                }
                                const tagObj = availableTags.find(t => t.id === tagId) || { id: tagId, name: tagId, color: getTagColor(tagId).bg };
                                const tColor = tagObj.color;
                                const isTagActive = activeTagId === tagId;
                                const isLast = index === task.tags.length - 1;
                                const extraCount = task.tags.length - 1;
                                
                                return (
                                  <div 
                                    key={tagId}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setActiveTaskTags(prev => ({...prev, [task.id]: tagId})); 
                                      const currentTags = [...task.tags];
                                      const tagIndex = currentTags.indexOf(tagId);
                                      if (tagIndex > 0) {
                                        currentTags.splice(tagIndex, 1);
                                        currentTags.unshift(tagId);      
                                        handleUpdateTaskDetail(task.id, 'tags', currentTags);
                                      }
                                    }}
                                    className={`h-full flex flex-col items-center justify-center transition-all duration-300 group/tag relative cursor-pointer overflow-hidden
                                      ${isTagActive 
                                        ? `w-5 z-20 border-l-[2px] opacity-100 ${!isLast ? 'border-r border-gray-800/50' : ''}` 
                                        : `w-0 border-l-0 opacity-0 ${!isLast ? 'border-r-0' : ''}`
                                      } 
                                      group-hover/cascade:w-5 group-hover/cascade:opacity-100 group-hover/cascade:border-l-[2px]
                                      ${!isLast ? 'group-hover/cascade:border-r group-hover/cascade:border-gray-800/50' : ''} 
                                    `}
                                    style={{ 
                                      backgroundColor: isTagActive ? '#111111' : '#000000', 
                                      borderLeftColor: isTagActive ? tColor : `${tColor}80`,
                                      boxShadow: isTagActive ? `0 0 10px ${tColor}40, inset 0 0 6px rgba(0,0,0,0.4)` : 'inset -1px 0 3px rgba(0,0,0,0.5)',
                                    }}
                                  >
                                  {isTagActive && extraCount > 0 && (
                                    <div className="absolute top-2 w-3.5 h-3.5 rounded-full bg-black border flex items-center justify-center shadow-[0_0_6px_rgba(0,0,0,0.8)] z-30 transition-opacity duration-300 group-hover/cascade:opacity-0"
                                         style={{ borderColor: tColor, color: tColor }}>
                                      <span className="text-[7px] font-bold font-mono leading-none mt-[1px]">+{extraCount}</span>
                                    </div>
                                  )}
                                  <div className={`flex items-center justify-center w-full h-full transition-all duration-300 ${isTagActive || task.tags.length === 1 ? 'opacity-100' : 'opacity-0 group-hover/cascade:opacity-100'} ${isTagActive && extraCount > 0 ? 'pt-6 group-hover/cascade:pt-0' : ''}`}>
                                    <span className="text-[9px] font-bold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] whitespace-nowrap" style={{ color: tColor, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                      {tagObj.name}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                      </div>
                    </React.Fragment>
                  );
                });
                })()}
                
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
  let currentCalOrgCacheId: string | null = null;
  let globalCalendarCache: any[] = [];
  let isCalendarCached = false;

  const CalendarQuickView: React.FC<CalendarQuickViewProps> = ({ accentColor, accentRgb, onNavigateToFullView, onViewTask }) => {
    const { user, organization } = useAuth(); // ⚡ Destructure organization
    
    // ⚡ WIPE CACHE IF ORGANIZATION CHANGES TO PREVENT DATA BLEED
    if (currentCalOrgCacheId !== organization?.id) {
      currentCalOrgCacheId = organization?.id || null;
      globalCalendarCache = [];
      isCalendarCached = false;
    }

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
        const { data: calData, error } = await supabase.schema('app_private')
          .from('calendar_events')
          .select('*')
          .eq('created_by', userId)
          .eq('organization_id', organization?.id) // ⚡ Scope to active org
          .gte('start_time', startOfDay.toISOString())
          .order('start_time', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error && offset === 0) { setEvents([]); globalCalendarCache = []; isCalendarCached = true; return; }

        // 2. Fetch Tasks mapped to calendar (only on initial load to prevent duplication during pagination)
        let taskEvents: any[] = [];
        if (offset === 0) {
          const { data: taskData } = await supabase.schema('app_private')
            .from('tasks')
            .select('*')
            .eq('organization_id', organization?.id) // ⚡ Scope to active org
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