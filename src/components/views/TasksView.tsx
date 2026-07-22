import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TaskPanel } from '@/components/toolbar/ToolbarPanels'; 
import { 
  PlusIcon, 
  TaskIcon, 
  SearchIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  UsersIcon,
  TrashIcon,
  SettingsIcon,
  CloseIcon,
  CalendarIcon
} from '@/components/icons/Icons';
// Removed useNotifications import to prevent circular dependency crashes

interface TasksViewProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom Sort Icon
const SortIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="15" y1="18" x2="9" y2="18"></line>
    <line x1="18" y1="12" x2="6" y2="12"></line>
    <line x1="21" y1="6" x2="3" y2="6"></line>
  </svg>
);

type SortField = 'due_date' | 'priority' | 'title' | 'created_at';
interface SortCriterion { field: SortField; direction: 'asc' | 'desc'; }

// ⚡ NEW: Deterministic color generator for tags (fallback)
const getTagColor = (tag: string) => {
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];
  return { bg };
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
    if (tempVal.toString() !== (value || '').toString()) {
      onSave(tempVal.toString());
    }
  };

  if (isEditing) {
    const sharedProps = {
      autoFocus: true,
      value: tempVal,
      onChange: (e: any) => setTempVal(e.target.value),
      onBlur: finishEdit,
      onClick: (e: any) => e.stopPropagation(),
      className: `bg-black border border-cyan-500/80 text-white rounded px-2 py-1 outline-none shadow-[0_0_10px_rgba(0,255,255,0.3)] w-full min-w-[60px] ${inputClassName}`,
      placeholder: placeholder
    };

    if (multiline) {
      return (
        <textarea
          {...sharedProps}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setTempVal(value);
              setIsEditing(false);
            }
          }}
        />
      );
    }
    return (
      <input
        {...sharedProps}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finishEdit();
          if (e.key === 'Escape') {
            setTempVal(value);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span 
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`cursor-pointer hover:bg-white/10 hover:ring-1 hover:ring-white/30 rounded transition-all inline-block px-1 min-h-[20px] min-w-[20px] ${multiline ? 'whitespace-pre-wrap block w-full' : ''} ${className}`}
      title="Click to edit"
    >
      {value || <span className="opacity-50 italic">{placeholder}</span>}
    </span>
  );
};

// --- Task Viewer Modal ---
interface TaskViewerModalProps {
  taskId: string;
  onClose: () => void;
  onViewAll: () => void;
  availableStatuses?: any[];
  availablePriorities?: any[];
  availableTags?: any[]; // ⚡ Updated to object array
  onLocalUpdate?: (field: string, value: any) => void;
}

const TaskViewerModal: React.FC<TaskViewerModalProps> = ({ taskId, onClose, onViewAll, availableStatuses = [], availablePriorities = [], availableTags = [], onLocalUpdate }) => {
  const { user, organization } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const fetchTask = async () => {
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
    if (onLocalUpdate) onLocalUpdate(field, value); // Sync with parent list instantly
    
    const { error } = await supabase.schema('app_private')
      .from('tasks')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', taskId);
      
    if (error) console.error(`Error updating task ${field}:`, error);
    
    window.dispatchEvent(new CustomEvent('refreshTasks'));
  };

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-cyan-500/30 border-t-cyan-400" />
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
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto bg-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl pointer-events-auto border-cyan-500/40 shadow-[0_0_60px_rgba(0,255,255,0.15)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-black/40 flex-shrink-0 border-cyan-500/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg bg-gradient-to-br from-cyan-500/15 to-black/80 border-cyan-500/50">
                <TaskIcon size={20} className="text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-mono font-bold text-white leading-tight">Task Details</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5 uppercase tracking-widest">ID: {task.id.substring(0,8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { onViewAll(); onClose(); }} className="px-4 py-2 border rounded-lg hover:bg-white/5 transition-all font-mono text-xs uppercase tracking-wider font-bold border-cyan-500/50 text-cyan-400 hidden sm:block">View All Tasks</button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/5"><CloseIcon size={24} /></button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-6 sm:pt-8 darkwave-scrollbar bg-black/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Left Col (Main content) */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Task Title</label>
                  <div className="text-lg sm:text-xl text-white font-mono font-bold w-full bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3 min-h-[54px] flex items-center shadow-inner">
                    <InlineEdit value={task.title} onSave={(val) => handleUpdate('title', val)} placeholder="Task Title..." inputClassName="w-full text-lg sm:text-xl font-bold" />
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
              <div className="space-y-6 bg-gray-900/30 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-inner h-fit">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Status</label>
                  <select 
                    value={task.status} 
                    onChange={(e) => handleUpdate('status', e.target.value)} 
                    className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 font-mono text-sm font-bold focus:outline-none transition-colors cursor-pointer"
                    style={{ color: availableStatuses?.find(s => s.id === task.status)?.color || '#facc15' }}
                  >
                    {(availableStatuses && availableStatuses.length > 0 ? availableStatuses : [
                      { id: 'pending', name: 'Pending', color: '#facc15' },
                      { id: 'in_progress', name: 'In Progress', color: '#22d3ee' },
                      { id: 'completed', name: 'Completed', color: '#4ade80' },
                      { id: 'cancelled', name: 'Cancelled', color: '#6b7280' }
                    ]).map(status => (
                      <option key={status.id} value={status.id} className="bg-gray-900 font-bold" style={{ color: status.color || '#ffffff' }}>{status.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Priority</label>
                  <select 
                    value={task.priority} 
                    onChange={(e) => handleUpdate('priority', e.target.value)} 
                    className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 font-mono text-sm font-bold focus:outline-none transition-colors cursor-pointer"
                    style={{ color: availablePriorities?.find(p => p.id === task.priority)?.color || '#9ca3af' }}
                  >
                    {(availablePriorities && availablePriorities.length > 0 ? availablePriorities : [
                      { id: 'low', name: 'Low', color: '#9ca3af' },
                      { id: 'medium', name: 'Medium', color: '#22d3ee' },
                      { id: 'high', name: 'High', color: '#f97316' },
                      { id: 'urgent', name: 'Urgent', color: '#ef4444' }
                    ]).map(p => (
                      <option key={p.id} value={p.id} className="bg-gray-900 font-bold" style={{ color: p.color || '#ffffff' }}>{p.name}</option>
                    ))}
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
                    {(task.tags || []).map((tagId: string) => {
                      const tagObj = availableTags?.find(t => t.id === tagId) || { id: tagId, name: tagId, color: getTagColor(tagId).bg };
                      return (
                        <span key={tagId} className="px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 uppercase tracking-wider" style={{ backgroundColor: `${tagObj.color}15`, color: tagObj.color, border: `1px solid ${tagObj.color}40` }}>
                          {tagObj.name}
                          <button onClick={() => handleUpdate('tags', task.tags.filter((t: string) => t !== tagId))} className="hover:text-white ml-1 opacity-70 hover:opacity-100">&times;</button>
                        </span>
                      );
                    })}
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
                    {availableTags?.filter(t => !(task.tags || []).includes(t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

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

const TasksView: React.FC<TasksViewProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || (user as any)?.uid;

  // ⚡ Theme State
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchColors = async () => {
      if (!currentUserId) return;
      const { data } = await supabase.schema('app_private')
        .from('user_preferences')
        .select('nav_colors')
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (data?.nav_colors) setUserNavColors(data.nav_colors);
    };
    fetchColors();

    // ⚡ LISTEN: Update local colors instantly if changed in the BottomNav
    const handleColorUpdate = (e: any) => {
      if (e.detail) setUserNavColors(e.detail);
    };
    window.addEventListener('navColorsUpdated', handleColorUpdate);
    return () => window.removeEventListener('navColorsUpdated', handleColorUpdate);
  }, [currentUserId]);

  const userPrefKey = userNavColors['tasks'];
  const themeColor = userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#22c55e';
  const themeRgb = userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '34,197,94';

  // Updated State for toggling views
  const [viewMode, setViewMode] = useState<'mine' | 'delegated' | 'open' | 'completed'>('mine');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [activeFilterCategory, setActiveFilterCategory] = useState<'statuses' | 'tags' | 'priorities'>('statuses');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]); 
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [activeTaskTags, setActiveTaskTags] = useState<Record<string, string>>({}); // ⚡ Track active tag per task
  
  // ⚡ NEW: Collapse Controls State
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);

  // ⚡ NEW: Multi-Select State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const pressTimer = React.useRef<NodeJS.Timeout | null>(null);

  // ⚡ NEW: Drag-to-Scroll Logic for Tags
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
    const walk = (x - startX) * 2; // Scroll speed multiplier
    tagsScrollRef.current.scrollLeft = scrollLeft - walk;
  };
  const scrollTags = (direction: 'left' | 'right') => {
    if (!tagsScrollRef.current) return;
    const amount = 200;
    tagsScrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // ⚡ NEW: User preference for task card coloring
  const [taskColorMode, setTaskColorMode] = useState<'tags' | 'status' | 'priority'>(() => {
    return (localStorage.getItem('acore_task_color_mode') as 'tags' | 'status' | 'priority') || 'tags';
  });

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); // ⚡ NEW: Track search bar state
  
  // Database & UI States
  const [tasks, setTasks] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false); 

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>([
    { field: 'due_date', direction: 'asc' },
    { field: 'priority', direction: 'desc' },
    { field: 'created_at', direction: 'desc' }
  ]);

  useEffect(() => {
    if (!currentUserId || !isOpen) return;

    const fetchTasksData = async () => {
      try {
        const { data: me } = await supabase.schema('app_private')
          .from('organization_users')
          .select('organization_id')
          .eq('id', currentUserId)
          .maybeSingle();

        if (!me?.organization_id) {
          setIsLoading(false);
          return;
        }

        const { data: orgUsers } = await supabase.schema('app_private')
          .from('organization_users')
          .select('id, full_name, email')
          .eq('organization_id', me.organization_id);

        const uMap: Record<string, string> = {};
        orgUsers?.forEach(u => {
          uMap[u.id] = u.full_name || u.email || 'Unknown';
        });
        setUsersMap(uMap);

        // Fetch User Settings
        const { data: dbSettings } = await supabase.schema('app_private')
          .from('user_settings')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (dbSettings) {
          if (dbSettings.tags) {
            // ⚡ Migrate legacy string tags to object array on the fly
            const formattedTags = dbSettings.tags.map((t: any) => {
              if (typeof t === 'string') {
                try {
                  // ⚡ FIX: Check if the DB actually stringified our new object
                  const parsed = JSON.parse(t);
                  if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
                } catch (e) {
                  // If it fails to parse, it's a true legacy string tag (e.g., "frontend")
                }
                return { id: t.toLowerCase().replace(/\s+/g, '_'), name: t, color: getTagColor(t).bg };
              }
              return t;
            });
            setAvailableTags(formattedTags);
          }
          if (dbSettings.custom_statuses) setAvailableStatuses(dbSettings.custom_statuses);
          if (dbSettings.custom_priorities) setAvailablePriorities(dbSettings.custom_priorities);
          
          // Parse the JSON column for notifications
          if (dbSettings.notification_settings) {
            if (dbSettings.notification_settings.global_alerts !== undefined) setGlobalAlerts(dbSettings.notification_settings.global_alerts);
            if (dbSettings.notification_settings.push_delegations !== undefined) setPushDelegations(dbSettings.notification_settings.push_delegations);
            if (dbSettings.notification_settings.daily_summary !== undefined) setDailySummary(dbSettings.notification_settings.daily_summary);
          }
        }

        const { data: dbTasks } = await supabase.schema('app_private')
          .from('tasks')
          .select('*')
          .eq('organization_id', me.organization_id)
          .or(`assigned_to.eq.${currentUserId},created_by.eq.${currentUserId}`)
          .order('created_at', { ascending: false });

        if (dbTasks) {
          setTasks(dbTasks);
        }
      } catch (err) {
        console.error('Error fetching tasks view data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasksData();

    const taskSub = supabase.channel('tasks_view_realtime')
      .on('postgres_changes', { event: '*', schema: 'app_private', table: 'tasks' }, () => {
        fetchTasksData();
      })
      .subscribe();

    window.addEventListener('refreshTasks', fetchTasksData);

    return () => {
      supabase.removeChannel(taskSub);
      window.removeEventListener('refreshTasks', fetchTasksData);
    };
  }, [currentUserId, isOpen]);

  const handleToggleStatus = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const newCompletedAt = newStatus === 'completed' ? new Date().toISOString() : null;
    
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: newCompletedAt } : t));

    await supabase.schema('app_private')
      .from('tasks')
      .update({ 
        status: newStatus, 
        completed_at: newCompletedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      const newCompletedAt = newStatus === 'completed' ? new Date().toISOString() : null;
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completed_at: newCompletedAt } : t));
      
      await supabase.schema('app_private')
        .from('tasks')
        .update({ 
          status: newStatus, 
          completed_at: newCompletedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (newStatus === 'completed' && taskToUpdate && taskToUpdate.recurrence && taskToUpdate.recurrence !== 'none' && taskToUpdate.due_date) {
        const [intervalStr, type] = taskToUpdate.recurrence.split(' ');
        const interval = parseInt(intervalStr, 10) || 1;
        const currentDue = new Date(taskToUpdate.due_date);
        const nextDue = new Date(currentDue);
        
        if (type === 'days') nextDue.setDate(currentDue.getDate() + interval);
        else if (type === 'weeks') nextDue.setDate(currentDue.getDate() + (interval * 7));
        else if (type === 'months') nextDue.setMonth(currentDue.getMonth() + interval);
        else if (type === 'years') nextDue.setFullYear(currentDue.getFullYear() + interval);
        
        const nextTaskPayload = {
          ...taskToUpdate,
          id: undefined, 
          status: 'pending',
          due_date: nextDue.toISOString(),
          completed_at: null,
          created_at: undefined,
          updated_at: undefined
        };
        
        const { data: newTsk } = await supabase.schema('app_private').from('tasks').insert(nextTaskPayload).select().single();
        if (newTsk) setTasks(prev => [newTsk, ...prev]);
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handleReassign = async (taskId: string, newAssignee: string) => {
    try {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: newAssignee } : t));
      await supabase.schema('app_private')
        .from('tasks')
        .update({ 
          assigned_to: newAssignee, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);
    } catch (err) {
      console.error('Error reassigning task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await supabase.schema('app_private')
        .from('tasks')
        .delete()
        .eq('id', taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleUpdateTaskDetail = async (taskId: string, field: string, value: any) => {
    try {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
      await supabase.schema('app_private')
        .from('tasks')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', taskId);
    } catch (err) {
      console.error(`Error updating task ${field}:`, err);
    }
  };

  const handleUpdateDueDate = async (task: any, newDateStr: string, newTimeStr: string) => {
    let newIso = null;
    if (newDateStr) {
      const timeStr = newTimeStr || '23:59';
      const d = new Date(`${newDateStr}T${timeStr}`);
      if (!isNaN(d.getTime())) {
        newIso = d.toISOString();
      }
    }
    await handleUpdateTaskDetail(task.id, 'due_date', newIso);
  };

  // NOTE: Ensure you add SettingsIcon to your icon imports at the top of the file!
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(() => sessionStorage.getItem('isolatedTaskId'));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // ⚡ FIX: Replaced Context hook with a safe CustomEvent to prevent "used within App" crashes
  const addAlert = (alertData: { message: string, type: 'info' | 'warning' | 'error' | 'success' }) => {
    // Broadcasts the alert to the global app wrapper without needing React Context
    window.dispatchEvent(new CustomEvent('triggerNotification', { detail: alertData }));
    
    // Fallback console log to ensure you can still see the alerts in dev tools
    console.log(`[Notification - ${alertData.type.toUpperCase()}]: ${alertData.message}`);
  };

  // Settings State: Tags
  const [availableTags, setAvailableTags] = useState<any[]>([
    { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
    { id: 'urgent_client', name: 'Urgent Client', color: '#ef4444' }
  ]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  
  // Notification Toggles State
  const [globalAlerts, setGlobalAlerts] = useState(true);
  const [pushDelegations, setPushDelegations] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  // Helper to save settings to the database
  const updateSettingsDB = async (updates: any) => {
    if (!currentUserId) return;
    try {
      await supabase.schema('app_private')
        .from('user_settings')
        .upsert({ 
          user_id: currentUserId, 
          ...updates, 
          updated_at: new Date().toISOString() 
        });
    } catch (err) {
      console.error('Error saving user settings:', err);
      addAlert({ message: 'Failed to save settings to the database.', type: 'error' });
    }
  };

  // Dedicated handler for the JSONB notification column
  const handleNotificationToggle = async (key: 'global_alerts' | 'push_delegations' | 'daily_summary', value: boolean) => {
    if (key === 'global_alerts') setGlobalAlerts(value);
    if (key === 'push_delegations') setPushDelegations(value);
    if (key === 'daily_summary') setDailySummary(value);

    const newNotificationSettings = {
      global_alerts: key === 'global_alerts' ? value : globalAlerts,
      push_delegations: key === 'push_delegations' ? value : pushDelegations,
      daily_summary: key === 'daily_summary' ? value : dailySummary,
    };

    await updateSettingsDB({ notification_settings: newNotificationSettings });
    // ⚡ FIX: Broadcast the settings change so the TopHeader alert banner immediately updates
    window.dispatchEvent(new CustomEvent('refreshTasks'));
  };

  const handleAddTag = async () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/\s+/g, '_');
    if (availableTags.some(t => t.id === id)) return; // Prevent duplicates
    const newTag = { id, name: trimmed, color: newTagColor };
    const newTags = [...availableTags, newTag];
    setAvailableTags(newTags);
    setNewTagInput('');
    await updateSettingsDB({ tags: newTags });
    addAlert({ message: `Tag "${trimmed}" successfully added.`, type: 'info' });
  };

  const handleEditTag = async (id: string, newName: string, newColor: string) => {
    const newTags = availableTags.map(t => t.id === id ? { ...t, name: newName, color: newColor } : t);
    setAvailableTags(newTags);
    await updateSettingsDB({ tags: newTags });
    setEditingTagId(null);
  };

  const handleDeleteTag = async (id: string) => {
    const newTags = availableTags.filter(t => t.id !== id);
    setAvailableTags(newTags);
    await updateSettingsDB({ tags: newTags });
    addAlert({ message: `Tag removed.`, type: 'warning' });
  };

  const [draggedTagIdx, setDraggedTagIdx] = useState<number | null>(null);
  const handleDropTag = async (dragIndex: number, dropIndex: number) => {
    if (dragIndex === dropIndex) return;
    const newTags = [...availableTags];
    const [moved] = newTags.splice(dragIndex, 1);
    newTags.splice(dropIndex, 0, moved);
    setAvailableTags(newTags);
    await updateSettingsDB({ tags: newTags });
  };

  // Settings State: Priorities
  const [availablePriorities, setAvailablePriorities] = useState([
    { id: 'low', name: 'Low', type: 'default', color: '#9ca3af' },
    { id: 'medium', name: 'Medium', type: 'default', color: '#22d3ee' },
    { id: 'high', name: 'High', type: 'default', color: '#f97316' },
    { id: 'urgent', name: 'Urgent', type: 'default', color: '#ef4444' }
  ]);
  const [newPriorityInput, setNewPriorityInput] = useState('');
  const [newPriorityColor, setNewPriorityColor] = useState('#ef4444');
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);

  // Settings State: Statuses
  const [availableStatuses, setAvailableStatuses] = useState([
    { id: 'pending', name: 'Pending', type: 'default', color: '#facc15' },
    { id: 'in_progress', name: 'In Progress', type: 'default', color: '#22d3ee' },
    { id: 'completed', name: 'Completed', type: 'default', color: '#4ade80' },
    { id: 'cancelled', name: 'Cancelled', type: 'default', color: '#6b7280' }
  ]);
  const [newStatusInput, setNewStatusInput] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#22d3ee');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

  const handleAddStatus = async () => {
    const trimmed = newStatusInput.trim();
    if (!trimmed) return;
    const newStatus = {
      id: trimmed.toLowerCase().replace(/\s+/g, '_'),
      name: trimmed,
      type: 'custom',
      color: newStatusColor
    };
    const newStatuses = [...availableStatuses, newStatus];
    setAvailableStatuses(newStatuses);
    setNewStatusInput('');
    await updateSettingsDB({ custom_statuses: newStatuses });
    addAlert({ message: `Custom status "${trimmed}" successfully added.`, type: 'info' });
  };

  const handleEditStatus = async (id: string, newName: string, newColor: string) => {
    const newStatuses = availableStatuses.map(s => s.id === id ? { ...s, name: newName, color: newColor } : s);
    setAvailableStatuses(newStatuses);
    await updateSettingsDB({ custom_statuses: newStatuses });
    setEditingStatusId(null);
  };

  const handleDeleteStatus = async (id: string) => {
    const newStatuses = availableStatuses.filter(s => s.id !== id);
    setAvailableStatuses(newStatuses);
    await updateSettingsDB({ custom_statuses: newStatuses });
    addAlert({ message: `Status removed.`, type: 'warning' });
  };

  const [draggedStatusIdx, setDraggedStatusIdx] = useState<number | null>(null);
  const handleDropStatus = async (dragIndex: number, dropIndex: number) => {
    if (dragIndex === dropIndex) return;
    const newStatuses = [...availableStatuses];
    const [moved] = newStatuses.splice(dragIndex, 1);
    newStatuses.splice(dropIndex, 0, moved);
    setAvailableStatuses(newStatuses);
    await updateSettingsDB({ custom_statuses: newStatuses });
  };

  const handleAddPriority = async () => {
    const trimmed = newPriorityInput.trim();
    if (!trimmed) return;
    const newPriority = {
      id: trimmed.toLowerCase().replace(/\s+/g, '_'),
      name: trimmed,
      type: 'custom',
      color: newPriorityColor
    };
    const newPriorities = [...availablePriorities, newPriority];
    setAvailablePriorities(newPriorities);
    setNewPriorityInput('');
    await updateSettingsDB({ custom_priorities: newPriorities });
    addAlert({ message: `Priority "${trimmed}" added.`, type: 'info' });
  };

  const handleEditPriority = async (id: string, newName: string, newColor: string) => {
    const newPriorities = availablePriorities.map(p => p.id === id ? { ...p, name: newName, color: newColor } : p);
    setAvailablePriorities(newPriorities);
    await updateSettingsDB({ custom_priorities: newPriorities });
    setEditingPriorityId(null);
  };

  const handleDeletePriority = async (id: string) => {
    const newPriorities = availablePriorities.filter(p => p.id !== id);
    setAvailablePriorities(newPriorities);
    await updateSettingsDB({ custom_priorities: newPriorities });
    addAlert({ message: `Priority removed.`, type: 'warning' });
  };

  const [draggedPriorityIdx, setDraggedPriorityIdx] = useState<number | null>(null);
  const handleDropPriority = async (dragIndex: number, dropIndex: number) => {
    if (dragIndex === dropIndex) return;
    const newPriorities = [...availablePriorities];
    const [moved] = newPriorities.splice(dragIndex, 1);
    newPriorities.splice(dropIndex, 0, moved);
    setAvailablePriorities(newPriorities);
    await updateSettingsDB({ custom_priorities: newPriorities });
  };

  useEffect(() => {
    const storedId = sessionStorage.getItem('isolatedTaskId');
    const storedIsDelegated = sessionStorage.getItem('isolatedTaskIsDelegated');
    
    if (storedId) {
      setViewingTaskId(storedId);
      setStatusFilters([]);
      setTagFilters([]);
      setPriorityFilters([]);
      setSearchQuery('');
      if (storedIsDelegated === 'true') setViewMode('delegated');
      else if (storedIsDelegated === 'false') setViewMode('mine');
            
      sessionStorage.removeItem('isolatedTaskId');
      sessionStorage.removeItem('isolatedTaskIsDelegated');
    }

    const handleFocusTask = (e: any) => {
      const taskId = e.detail?.taskId || e.detail;
      const isDelegated = e.detail?.isDelegated;
      
      setViewingTaskId(taskId);
      setStatusFilters([]);
      setTagFilters([]);
      setPriorityFilters([]);
      setSearchQuery('');
      
      if (isDelegated !== undefined) {
         setViewMode(isDelegated ? 'delegated' : 'mine');
      }
    };

    window.addEventListener('focusTask', handleFocusTask);
    return () => window.removeEventListener('focusTask', handleFocusTask);
  }, []);

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `${r}, ${g}, ${b}`;
  };

  const sortedFilteredTasks = useMemo(() => {
    const priorityWeight: Record<string, number> = {};
    availablePriorities.forEach((p, idx) => {
      priorityWeight[p.id] = idx; 
    });

    const filtered = tasks.filter(task => {
      if (viewMode === 'mine') {
        if (task.assigned_to !== currentUserId && !(task.created_by === currentUserId && !task.assigned_to)) return false;
      } else if (viewMode === 'delegated') {
        if (task.created_by !== currentUserId || task.assigned_to === currentUserId) return false;
      } else if (viewMode === 'open') {
        if (task.status === 'completed') return false;
      } else if (viewMode === 'completed') {
        if (task.status !== 'completed') return false;
      }

      // Check if task matches ANY selected option within active categories
      if (statusFilters.length > 0 && !statusFilters.includes(task.status)) return false;
      if (priorityFilters.length > 0 && !priorityFilters.includes(task.priority)) return false;
      
      if (tagFilters.length > 0) {
        const taskTags = task.tags || [];
        // If task doesn't contain at least one of the selected tags, filter it out
        if (!tagFilters.some(tf => taskTags.includes(tf))) return false;
      }
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (b.status === 'completed' && a.status !== 'completed') return -1;
      
      if (a.status === 'completed' && b.status === 'completed') {
        const compA = new Date(a.completed_at || 0).getTime();
        const compB = new Date(b.completed_at || 0).getTime();
        if (compA !== compB) return compB - compA; 
      }

      for (const criterion of sortCriteria) {
        let comp = 0;
        if (criterion.field === 'priority') {
          comp = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
        } else if (criterion.field === 'due_date') {
          const dateA = a.due_date ? new Date(a.due_date).getTime() : (criterion.direction === 'asc' ? Infinity : -Infinity);
          const dateB = b.due_date ? new Date(b.due_date).getTime() : (criterion.direction === 'asc' ? Infinity : -Infinity);
          comp = dateA - dateB;
        } else if (criterion.field === 'title') {
          comp = (a.title || '').localeCompare(b.title || '');
        } else if (criterion.field === 'created_at') {
          comp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }

        if (comp !== 0) {
          return criterion.direction === 'asc' ? comp : -comp;
        }
      }
      return 0;
    });
  }, [tasks, viewMode, statusFilters, tagFilters, priorityFilters, searchQuery, viewingTaskId, sortCriteria, currentUserId, availablePriorities]);

  const mineTasksCount = tasks.filter(t => t.assigned_to === currentUserId || (t.created_by === currentUserId && !t.assigned_to)).length;
  const delegatedTasksCount = tasks.filter(t => t.created_by === currentUserId && t.assigned_to !== currentUserId).length;
  const openTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

  const getPriorityInfo = (priorityId: string) => {
    const p = availablePriorities.find(p => p.id === priorityId);
    const color = p ? p.color : '#9ca3af';
    const rgb = hexToRgb(color);
    return { color, rgb, name: p ? p.name : priorityId };
  };

  const getPriorityStyle = (priorityId: string): React.CSSProperties => {
    const { color, rgb } = getPriorityInfo(priorityId);
    return {
      backgroundColor: `rgba(${rgb}, 0.2)`,
      color: color,
      borderColor: `rgba(${rgb}, 0.4)`,
      boxShadow: `0 0 8px rgba(${rgb}, 0.3)`
    };
  };

  const getPriorityBorderStyle = (priorityId: string): React.CSSProperties => {
    const { rgb } = getPriorityInfo(priorityId);
    return {
      borderColor: `rgba(${rgb}, 0.2)`,
      backgroundColor: `rgba(${rgb}, 0.02)`
    };
  };

  const getStatusColor = (statusId: string) => {
    const st = availableStatuses.find(s => s.id === statusId);
    return st ? st.color : '#9ca3af';
  };

  const getStatusLabel = (statusId: string) => {
    const st = availableStatuses.find(s => s.id === statusId);
    return st ? st.name : (statusId || 'Unknown').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  // ⚡ FIX: Allow the standalone TaskViewerModal to render if a task is clicked from the banner, even if the main TasksView is closed.
  if (!isOpen && !viewingTaskId) return null;

  if (!isOpen && viewingTaskId) {
    return (
      <TaskViewerModal 
        taskId={viewingTaskId} 
        onClose={() => setViewingTaskId(null)} 
        onViewAll={() => {
            setViewingTaskId(null);
            setStatusFilters([]); // <-- Updated
            setTagFilters([]);    // <-- Added
            setPriorityFilters([]); // <-- Added
            setSearchQuery('');
          }}
        availableStatuses={availableStatuses}
        availablePriorities={availablePriorities}
        availableTags={availableTags}
        onLocalUpdate={(field, value) => {
          setTasks(prev => prev.map(t => t.id === viewingTaskId ? { ...t, [field]: value } : t));
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" id="tasks-view-modal">
      <style>{`
        #tasks-view-modal .border-cyan-500\\/30 { border-color: rgba(${themeRgb}, 0.3) !important; }
        #tasks-view-modal .border-cyan-500\\/20 { border-color: rgba(${themeRgb}, 0.2) !important; }
        #tasks-view-modal .border-cyan-500\\/40 { border-color: rgba(${themeRgb}, 0.4) !important; }
        #tasks-view-modal .border-cyan-500\\/50 { border-color: rgba(${themeRgb}, 0.5) !important; }
        #tasks-view-modal .bg-cyan-500\\/10 { background-color: rgba(${themeRgb}, 0.1) !important; }
        #tasks-view-modal .bg-cyan-500\\/20 { background-color: rgba(${themeRgb}, 0.2) !important; }
        #tasks-view-modal .hover\\:bg-cyan-500\\/20:hover { background-color: rgba(${themeRgb}, 0.2) !important; }
        #tasks-view-modal .hover\\:bg-cyan-500\\/10:hover { background-color: rgba(${themeRgb}, 0.1) !important; }
        #tasks-view-modal .hover\\:bg-cyan-500\\/30:hover { background-color: rgba(${themeRgb}, 0.3) !important; }
        #tasks-view-modal .hover\\:border-cyan-500\\/30:hover { border-color: rgba(${themeRgb}, 0.3) !important; }
        #tasks-view-modal .hover\\:border-cyan-500\\/50:hover { border-color: rgba(${themeRgb}, 0.5) !important; }
        #tasks-view-modal .hover\\:border-cyan-400\\/60:hover { border-color: rgba(${themeRgb}, 0.6) !important; }
        #tasks-view-modal .hover\\:text-cyan-400:hover { color: ${themeColor} !important; }
        #tasks-view-modal .text-cyan-400 { color: ${themeColor} !important; }
        #tasks-view-modal .text-cyan-500 { color: ${themeColor} !important; }
        #tasks-view-modal .bg-cyan-500 { background-color: ${themeColor} !important; }
        #tasks-view-modal .from-cyan-950\\/10 { --tw-gradient-from: rgba(${themeRgb}, 0.1) var(--tw-gradient-from-position); }
        #tasks-view-modal .focus\\:border-cyan-500\\/50:focus { border-color: rgba(${themeRgb}, 0.5) !important; }
        #tasks-view-modal .focus\\:shadow-\\[0_0_10px_rgba\\(0\\,255\\,255\\,0\\.1\\)\\]:focus { box-shadow: 0 0 10px rgba(${themeRgb}, 0.1) !important; }
        #tasks-view-modal .shadow-\\[0_0_50px_rgba\\(0\\,255\\,255\\,0\\.1\\)\\] { box-shadow: 0 0 50px rgba(${themeRgb}, 0.1) !important; }
        #tasks-view-modal .shadow-\\[0_0_30px_rgba\\(0\\,255\\,255\\,0\\.05\\)\\] { box-shadow: 0 0 30px rgba(${themeRgb}, 0.05) !important; }
        #tasks-view-modal .shadow-\\[0_0_15px_rgba\\(0\\,255\\,255\\,0\\.15\\)\\] { box-shadow: 0 0 15px rgba(${themeRgb}, 0.15) !important; }
        #tasks-view-modal .shadow-\\[0_0_10px_rgba\\(0\\,255\\,255\\,0\\.2\\)\\] { box-shadow: 0 0 10px rgba(${themeRgb}, 0.2) !important; }
        #tasks-view-modal .shadow-\\[0_0_8px_rgba\\(0\\,255\\,255\\,0\\.3\\)\\] { box-shadow: 0 0 8px rgba(${themeRgb}, 0.3) !important; }
        #tasks-view-modal .drop-shadow-\\[0_0_6px_rgba\\(0\\,255\\,255\\,0\\.6\\)\\] { filter: drop-shadow(0 0 6px rgba(${themeRgb}, 0.6)) !important; }
        #tasks-view-modal .accent-cyan-500 { accent-color: ${themeColor} !important; }
      `}</style>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-7xl h-full max-h-[95vh] bg-black/90 backdrop-blur-2xl border rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
           style={{ borderColor: `rgba(${themeRgb}, 0.3)`, boxShadow: `0 0 50px rgba(${themeRgb}, 0.1)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom right, rgba(${themeRgb}, 0.1), transparent, rgba(232,121,249,0.1))` }} />
        <div className="absolute inset-0 hex-pattern opacity-5 pointer-events-none" />

        {/* Sticky Header with Close Button */}
        <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-gray-800/50 bg-black/40 shrink-0">
          <div className="flex items-center">
            <h1 
              className="text-3xl md:text-4xl font-bold text-white tracking-widest leading-none -mt-1"
              style={{ fontFamily: "'Orbitron', 'Space Mono', monospace" }}
            >
              <span style={{ color: themeColor, textShadow: `0 0 10px rgba(${themeRgb}, 0.8), 0 0 20px rgba(${themeRgb}, 0.4)` }}>TASKS</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* ⚡ NEW: Expanding Search Bar */}
            <div className="flex items-center justify-end h-10">
              {isSearchExpanded ? (
                <div className="relative flex items-center animate-in fade-in slide-in-from-right-4 duration-200">
                  <SearchIcon size={16} className="absolute left-3 text-gray-500" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }}
                    placeholder="Search tasks..."
                    className="w-48 sm:w-64 h-10 bg-black/50 border border-gray-800 rounded-lg pl-9 pr-8 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  />
                  <button onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }} className="absolute right-2 p-1 text-gray-500 hover:text-white">
                    <CloseIcon size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="p-2 text-gray-400 hover:text-white bg-black/50 border border-gray-800 rounded-lg hover:bg-gray-700 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] h-10 w-10 flex items-center justify-center"
                  title="Search Tasks"
                >
                  <SearchIcon size={20} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-white bg-black/50 border border-gray-800 rounded-lg hover:bg-gray-700 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] h-10 w-10 flex items-center justify-center"
              title="Task Settings"
            >
              <SettingsIcon size={20} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-white bg-black/50 border border-gray-800 rounded-lg hover:bg-gray-700 transition-colors h-10 w-10 flex items-center justify-center"
            >
              <CloseIcon size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 no-scrollbar flex flex-col">
          
          {/* Expandable Top Section */}
          {isControlsExpanded && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 shrink-0">
              {/* Unified Controls Row */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 mb-6 mt-5">
            
            {/* Left Side: View Modes & Category Toggles */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              {/* Mine / Delegated Toggles */}
              <div className="flex border border-gray-800 rounded-lg overflow-hidden shrink-0 h-[38px] shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                <button
                  onClick={() => setViewMode('mine')}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 text-xs sm:text-sm font-mono transition-all h-full ${
                    viewMode === 'mine' ? 'bg-cyan-500/20 text-cyan-400 border-r border-cyan-500/40 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'bg-gray-900/50 text-gray-500 hover:text-gray-300 border-r border-gray-800'
                  }`}
                >
                  <UserIcon size={14} />
                  <span>Mine</span>
                  <span className="px-1 py-0.5 rounded text-[10px] bg-black/50 border border-gray-800">{mineTasksCount}</span>
                </button>
                <button
                  onClick={() => setViewMode('delegated')}
                  className={`flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 text-xs sm:text-sm font-mono transition-all h-full ${
                    viewMode === 'delegated' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'bg-gray-900/50 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <UsersIcon size={14} />
                  <span>Delegated</span>
                  <span className="px-1 py-0.5 rounded text-[10px] bg-black/50 border border-gray-800">{delegatedTasksCount}</span>
                </button>
              </div>

              {/* Category Toggle Switch */}
              <div className="flex bg-black/50 border border-gray-800 rounded-lg p-1 shadow-inner h-[38px] items-center">
                {(['statuses', 'tags', 'priorities'] as const).map(cat => {
                  const isActive = activeFilterCategory === cat;
                  const filterCount = cat === 'statuses' ? statusFilters.length : cat === 'tags' ? tagFilters.length : priorityFilters.length;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveFilterCategory(cat)}
                      className={`relative px-4 sm:px-6 py-1 rounded-md font-mono text-xs sm:text-sm uppercase tracking-wider transition-all h-full flex items-center justify-center ${
                        isActive 
                          ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)] font-bold' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {cat}
                      {filterCount > 0 && (
                        <span 
                          className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded border bg-black text-[10px] font-bold animate-in slide-in-from-bottom-2 fade-in duration-200 pointer-events-none leading-none z-10"
                          style={{ color: themeColor, borderColor: themeColor, boxShadow: `0 0 10px rgba(${themeRgb}, 0.3)` }}
                        >
                          {filterCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Sort & New Task */}
            <div className="flex items-center gap-3 shrink-0 ml-auto xl:ml-0">
              {/* Sort Button & Menu */}
              <div className="relative h-[38px]">
                <button 
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={`px-3 py-2 rounded-lg border flex items-center gap-2 font-mono text-sm transition-all h-full ${
                    showSortMenu ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  <SortIcon size={16} /> <span className="hidden sm:inline">Sort</span>
                </button>
                
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-12 w-[calc(100vw-3rem)] sm:w-80 max-w-[320px] bg-gray-950 border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.15)] z-50 p-4 flex flex-col gap-3">
                      <h4 className="text-white font-mono font-bold text-sm uppercase tracking-widest border-b border-gray-800 pb-2 mb-1">Active Sorting</h4>
                      
                      {sortCriteria.map((crit, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-black/40 border border-gray-800 rounded-lg p-2 group">
                          {/* Reorder Up/Down */}
                          <div className="flex flex-col">
                            <button disabled={idx === 0} onClick={() => {
                              const newArr = [...sortCriteria];
                              [newArr[idx-1], newArr[idx]] = [newArr[idx], newArr[idx-1]];
                              setSortCriteria(newArr);
                            }} className="text-gray-600 hover:text-cyan-400 disabled:opacity-30 p-0.5"><ChevronRightIcon size={12} className="-rotate-90" /></button>
                            <button disabled={idx === sortCriteria.length - 1} onClick={() => {
                              const newArr = [...sortCriteria];
                              [newArr[idx+1], newArr[idx]] = [newArr[idx], newArr[idx+1]];
                              setSortCriteria(newArr);
                            }} className="text-gray-600 hover:text-cyan-400 disabled:opacity-30 p-0.5"><ChevronRightIcon size={12} className="rotate-90" /></button>
                          </div>
                          
                          <select 
                            value={crit.field} 
                            onChange={(e) => setSortCriteria(prev => prev.map((c, i) => i === idx ? { ...c, field: e.target.value as SortField } : c))}
                            className="bg-gray-900 border border-gray-700 text-white font-mono text-xs p-1.5 rounded flex-1 focus:outline-none"
                          >
                            <option value="due_date">Due Date</option>
                            <option value="priority">Priority</option>
                            <option value="title">Alphabetical (A-Z)</option>
                            <option value="created_at">Date Added</option>
                          </select>
                          
                          <select 
                            value={crit.direction} 
                            onChange={(e) => setSortCriteria(prev => prev.map((c, i) => i === idx ? { ...c, direction: e.target.value as 'asc'|'desc' } : c))}
                            className="bg-gray-900 border border-gray-700 text-white font-mono text-xs p-1.5 rounded w-20 focus:outline-none"
                          >
                            <option value="asc">{crit.field === 'title' ? 'A to Z' : 'Asc ↑'}</option>
                            <option value="desc">{crit.field === 'title' ? 'Z to A' : 'Desc ↓'}</option>
                          </select>
                          
                          <button onClick={() => setSortCriteria(prev => prev.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400 p-1">
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      ))}
                      
                      {sortCriteria.length < 4 && (
                        <button 
                          onClick={() => setSortCriteria([...sortCriteria, { field: 'title', direction: 'asc' }])}
                          className="w-full py-2 mt-1 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all font-mono text-xs flex items-center justify-center gap-2 uppercase tracking-widest font-bold"
                        >
                          <PlusIcon size={14} /> Add Sort Layer
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* + Task Button */}
              <button 
                onClick={() => setIsTaskPanelOpen(true)}
                className="flex items-center justify-center gap-2 px-4 h-[38px] bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all font-mono shadow-[0_0_15px_rgba(0,255,255,0.15)] font-bold tracking-wider shrink-0"
              >
                <PlusIcon size={16} className="drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
                <span>Task</span>
              </button>
            </div>
          </div>

          {/* Quick Stats / Filter Cards */}
          <div className="flex overflow-x-auto gap-4 mb-6 pt-3 pb-4 px-1 no-scrollbar snap-x">
            {(() => {
              // 1. Build the active list dynamically based on toggle
              let activeItems: any[] = [];
              if (activeFilterCategory === 'statuses') activeItems = availableStatuses.map(s => ({ ...s, type: 'status' }));
              else if (activeFilterCategory === 'tags') activeItems = availableTags.map(t => ({ ...t, type: 'tag' }));
              else if (activeFilterCategory === 'priorities') activeItems = availablePriorities.map(p => ({ ...p, type: 'priority' }));

              // 2. Render the cards
              return activeItems.map(item => {
                const count = tasks.filter(t => {
                  // 1. Keep active View Mode logic
                  if (viewMode === 'mine' && !(t.assigned_to === currentUserId || (t.created_by === currentUserId && !t.assigned_to))) return false;
                  if (viewMode === 'delegated' && !(t.created_by === currentUserId && t.assigned_to !== currentUserId)) return false;
                  if (viewMode === 'open' && t.status === 'completed') return false;
                  if (viewMode === 'completed' && t.status === 'completed') return true; // Fixes edge case for 'completed' view

                  // 2. Check Search Query
                  if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

                  // 3. Cross-Category Filtering (Only apply filters from OTHER categories)
                  if (item.type !== 'status' && statusFilters.length > 0 && !statusFilters.includes(t.status)) return false;
                  if (item.type !== 'priority' && priorityFilters.length > 0 && !priorityFilters.includes(t.priority)) return false;
                  if (item.type !== 'tag' && tagFilters.length > 0 && !tagFilters.some(tf => (t.tags || []).includes(tf))) return false;

                  // 4. Match the specific item itself
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
                    key={item.id}
                    onClick={handleClick}
                    // CSS Math: 100% width minus 5 gaps of 1rem (16px), divided evenly by 6.
                    className="snap-start flex-none w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.66rem)] lg:w-[calc((100%-5rem)/6)] bg-black/40 backdrop-blur-md rounded-xl p-4 relative border transition-all hover:brightness-125 cursor-pointer hover:-translate-y-0.5"
                    style={{ 
                      borderColor: isSelected ? item.color : `rgba(${rgb}, 0.2)`,
                      boxShadow: isSelected ? `0 0 20px rgba(${rgb}, 0.4), inset 0 0 10px rgba(${rgb}, 0.1)` : `0 0 20px rgba(${rgb}, 0.05)`,
                      transform: isSelected ? 'scale(1.02)' : 'none'
                    }}
                  >
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l rounded-tl" style={{ borderColor: item.color }} />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r rounded-tr" style={{ borderColor: item.color }} />
                    
                    <p className="text-gray-500 text-sm font-mono uppercase tracking-wider truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p 
                      className="text-2xl font-bold mt-1 font-mono" 
                      style={{ color: item.color, textShadow: `0 0 8px rgba(${rgb}, 0.5)` }}
                    >
                      {count}
                    </p>
                  </div>
                );
              });
            })()}
          </div>
          </div>
        )}

        {/* ⚡ Faint Collapse/Expand Bar */}
        <div 
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
          className="group flex items-center justify-center py-2 mb-4 -mt-2 cursor-pointer shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          title={isControlsExpanded ? "Collapse Controls" : "Expand Controls"}
        >
          <div className="w-full h-px bg-gray-800 group-hover:bg-cyan-500/50 transition-colors relative flex justify-center">
            <div className="absolute -top-2.5 bg-gray-950 px-4 rounded-full border border-gray-800 group-hover:border-cyan-500/50 text-gray-500 group-hover:text-cyan-400 transition-colors flex items-center justify-center">
              <ChevronRightIcon 
                size={14} 
                className={`transition-transform duration-300 ${isControlsExpanded ? '-rotate-90' : 'rotate-90'}`} 
              />
            </div>
          </div>
        </div>

        {/* ⚡ NEW: Multi-Select Bulk Action Bar */}
        {isMultiSelectMode && (
          <div className="bg-fuchsia-500/10 border border-fuchsia-500/40 rounded-xl p-3 mb-4 flex items-center justify-between shadow-[0_0_15px_rgba(232,121,249,0.1)] animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
              <span className="text-fuchsia-400 font-mono font-bold text-sm uppercase tracking-widest">{selectedTaskIds.size} Selected</span>
              <button 
                onClick={() => {
                  if (selectedTaskIds.size === sortedFilteredTasks.length) {
                    setSelectedTaskIds(new Set());
                    setIsMultiSelectMode(false);
                  } else {
                    setSelectedTaskIds(new Set(sortedFilteredTasks.map(t => t.id)));
                  }
                }} 
                className="text-xs text-fuchsia-300 hover:text-fuchsia-100 underline decoration-fuchsia-500/50 underline-offset-4 transition-colors font-mono"
              >
                {selectedTaskIds.size === sortedFilteredTasks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  selectedTaskIds.forEach(id => handleDeleteTask(id));
                  setSelectedTaskIds(new Set());
                  setIsMultiSelectMode(false);
                }} 
                className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded hover:bg-red-500/30 transition-colors font-mono text-xs font-bold"
              >
                Delete
              </button>
              <button 
                onClick={() => {
                  setSelectedTaskIds(new Set());
                  setIsMultiSelectMode(false);
                }} 
                className="px-3 py-1.5 bg-black/50 text-gray-400 border border-gray-700 rounded hover:bg-gray-800 transition-colors font-mono text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="bg-black/80 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.05)] relative min-h-[400px] flex flex-col">
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/40 rounded-tl z-10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/40 rounded-tr z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/40 rounded-bl z-10 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/40 rounded-br z-10 pointer-events-none" />
          
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4 h-full flex-1">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-xs text-cyan-500/70 font-mono uppercase tracking-widest">Loading Tasks...</p>
            </div>
          ) : sortedFilteredTasks.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-2 darkwave-scrollbar mt-2">
              {sortedFilteredTasks.map((task) => {
                const formattedDate = formatDueDate(task.due_date);
                const isPastDue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'completed';
                
                // ⚡ RESOLVED: Moved activeTagId OUTSIDE the if/else block so the tags renderer can see it!
                const activeTagId = activeTaskTags[task.id] || (task.tags && task.tags[0]) || null;
                const activeTagObj = activeTagId ? (availableTags.find(t => t.id === activeTagId) || { name: activeTagId, color: getTagColor(activeTagId).bg }) : null;

                // ⚡ Dynamic Task Coloring based on user preference
                let activeColorHex = '#9ca3af';
                if (taskColorMode === 'status') {
                  activeColorHex = getStatusColor(task.status);
                } else if (taskColorMode === 'priority') {
                  activeColorHex = getPriorityInfo(task.priority).color;
                } else {
                  // Default to 'tags' (Falls back to priority if no tags exist)
                  activeColorHex = activeTagObj ? activeTagObj.color : getPriorityInfo(task.priority).color;
                }
                const activeRgb = hexToRgb(activeColorHex);

                // ⚡ UPDATED: Shifted all values higher to make the default state match the old hover state
                const defaultBorder = `rgba(${activeRgb}, 0.6)`; 
                const defaultBg = `rgba(${activeRgb}, 0.05)`;
                const hoverBorder = `rgba(${activeRgb}, 1)`; // Pure color on hover
                const hoverBg = `rgba(${activeRgb}, 0.1)`;
                const hoverShadow = `0 0 35px rgba(${activeRgb}, 0.5)`; // Increased intensity

                return (
                  <div
                    id={`task-${task.id}`}
                    key={task.id}
                    onClick={(e) => {
                      if (isMultiSelectMode) {
                        e.preventDefault();
                        const newSet = new Set(selectedTaskIds);
                        if (newSet.has(task.id)) newSet.delete(task.id);
                        else newSet.add(task.id);
                        if (newSet.size === 0) setIsMultiSelectMode(false);
                        setSelectedTaskIds(newSet);
                      } else {
                        setViewingTaskId(task.id);
                      }
                    }}
                    onMouseDown={() => {
                      if (!isMultiSelectMode) {
                        pressTimer.current = setTimeout(() => {
                          setIsMultiSelectMode(true);
                          setSelectedTaskIds(new Set([task.id]));
                          if (navigator.vibrate) navigator.vibrate(50);
                        }, 500);
                      }
                    }}
                    onMouseUp={() => { if (pressTimer.current) clearTimeout(pressTimer.current); }}
                    onTouchStart={() => {
                      if (!isMultiSelectMode) {
                        pressTimer.current = setTimeout(() => {
                          setIsMultiSelectMode(true);
                          setSelectedTaskIds(new Set([task.id]));
                          if (navigator.vibrate) navigator.vibrate(50);
                        }, 500);
                      }
                    }}
                    onTouchEnd={() => { if (pressTimer.current) clearTimeout(pressTimer.current); }}
                    onTouchMove={() => { if (pressTimer.current) clearTimeout(pressTimer.current); }}
                    // ⚡ Added pr-10 to leave space for the new vertical tags
                    // ⚡ Removed overflow-hidden so the corner curves and glows behave correctly
                    className={`p-4 pr-10 transition-all group rounded-xl border cursor-pointer hover:shadow-lg relative ${
                      task.status === 'completed' ? 'opacity-60 border-gray-800 bg-black/40 hover:bg-white/5' : ''
                    } ${selectedTaskIds.has(task.id) ? 'ring-2 ring-fuchsia-500 bg-fuchsia-500/20' : ''}`}
                    style={task.status !== 'completed' && !selectedTaskIds.has(task.id) ? { borderColor: defaultBorder, backgroundColor: defaultBg } : {}}
                    onMouseEnter={(e) => {
                      if (task.status !== 'completed' && !selectedTaskIds.has(task.id)) {
                        e.currentTarget.style.borderColor = hoverBorder;
                        e.currentTarget.style.backgroundColor = hoverBg;
                        e.currentTarget.style.boxShadow = hoverShadow;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pressTimer.current) clearTimeout(pressTimer.current); // Abort timer if dragged away
                      if (task.status !== 'completed' && !selectedTaskIds.has(task.id)) {
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
                        className={`mt-0.5 w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        task.status === 'completed'
                          ? 'bg-green-500/30 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                          : 'border-gray-700 hover:border-cyan-500 hover:shadow-[0_0_8px_rgba(0,255,255,0.3)]'
                      }`}>
                        {task.status === 'completed' && (
                          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-2">
                          <div className="flex-1 min-w-0 flex items-start gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task.id); }}
                              className="mt-1 text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0"
                            >
                              <ChevronRightIcon size={18} className={`transition-transform duration-200 ${expandedTasks[task.id] ? 'rotate-90' : ''}`} />
                            </button>
                            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                              <h3 className={`font-mono font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                                <InlineEdit 
                                  value={task.title} 
                                  onSave={(val) => handleUpdateTaskDetail(task.id, 'title', val)} 
                                  className="max-w-full whitespace-normal break-words sm:truncate inline-block leading-snug"
                                  inputClassName="min-w-[150px] max-w-full"
                                />
                              </h3>
                              {/* App Source Link */}
                              {task.app_name && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-black/40 border border-gray-700 text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                  <TaskIcon size={10} />
                                  {task.app_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right-side Actions: Delete Only */}
                          <div className="flex items-center gap-3 shrink-0">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteTask(task.id); 
                              }} 
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all ml-1"
                              title="Delete Task"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </div>
                        </div>

                        {expandedTasks[task.id] && (
                          <div className="text-sm text-gray-400 mb-3 ml-6 font-mono break-words flex items-start animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                            <InlineEdit 
                              value={task.description || ''} 
                              onSave={(val) => handleUpdateTaskDetail(task.id, 'description', val)} 
                              placeholder="Click to add description..."
                              multiline={true}
                              className="!w-auto !block max-w-full"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono ml-6 mt-2" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Status Dropdown */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-gray-800 hover:border-gray-700 transition-colors">
                            <select
                              value={task.status}
                              onChange={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-transparent focus:outline-none cursor-pointer appearance-none font-bold"
                              style={{ color: getStatusColor(task.status) }}
                            >
                              {availableStatuses.map(status => (
                                <option key={status.id} value={status.id} className="bg-gray-900 font-bold" style={{ color: status.color || '#ffffff' }}>{status.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Completed Timestamp Indicator */}
                          {task.status === 'completed' && task.completed_at && (
                            <span className="text-[10px] text-green-500/70 font-mono tracking-widest uppercase whitespace-nowrap">
                              ✓ {new Date(task.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}

                          {/* Assignment Dropdown */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-gray-800 hover:border-gray-700 transition-colors">
                            <UserIcon size={14} className="text-gray-600" />
                            <select
                              value={task.assigned_to}
                              onChange={(e) => { e.stopPropagation(); handleReassign(task.id, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-transparent focus:outline-none cursor-pointer appearance-none text-gray-400 hover:text-white transition-colors max-w-[90px] sm:max-w-none truncate"
                            >
                              <option value={currentUserId} className="bg-gray-900">Me</option>
                              {Object.entries(usersMap).map(([id, name]) => (
                                <option key={id} value={id} className="bg-gray-900">{name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Due Date Display / Editor */}
                          <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 px-2 py-1 rounded border transition-colors max-w-full ${
                            isPastDue ? 'border-red-500/50 bg-red-500/10' :
                            formattedDate === 'Today' ? 'bg-black/40 border-red-500/30' : 
                            formattedDate === 'Tomorrow' ? 'bg-black/40 border-orange-500/30' : 'bg-black/40 border-gray-800 hover:border-gray-700'
                          }`}>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isPastDue && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mr-0.5 animate-pulse">OVERDUE</span>}
                              <ClockIcon size={14} className={isPastDue ? 'text-red-500' : formattedDate === 'Today' ? 'text-red-400' : formattedDate === 'Tomorrow' ? 'text-orange-400' : 'text-gray-600'} />
                            </div>
                            <input
                              type="date"
                              value={task.due_date ? new Date(task.due_date).getFullYear() + '-' + String(new Date(task.due_date).getMonth() + 1).padStart(2, '0') + '-' + String(new Date(task.due_date).getDate()).padStart(2, '0') : ''}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                const existingTime = task.due_date ? String(new Date(task.due_date).getHours()).padStart(2, '0') + ':' + String(new Date(task.due_date).getMinutes()).padStart(2, '0') : '23:59';
                                handleUpdateDueDate(task, newDate, existingTime);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`bg-transparent focus:outline-none cursor-pointer appearance-none font-mono text-xs ${
                                isPastDue ? 'text-red-500 font-bold' : formattedDate === 'Today' ? 'text-red-400' : formattedDate === 'Tomorrow' ? 'text-orange-400' : 'text-gray-400'
                              } [color-scheme:dark] w-[100px] sm:w-[110px]`}
                            />
                            {task.due_date && (
                              <input
                                type="time"
                                value={task.due_date ? String(new Date(task.due_date).getHours()).padStart(2, '0') + ':' + String(new Date(task.due_date).getMinutes()).padStart(2, '0') : ''}
                                onChange={(e) => {
                                  const newTime = e.target.value;
                                  const existingDate = new Date(task.due_date).getFullYear() + '-' + String(new Date(task.due_date).getMonth() + 1).padStart(2, '0') + '-' + String(new Date(task.due_date).getDate()).padStart(2, '0');
                                  handleUpdateDueDate(task, existingDate, newTime);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent focus:outline-none cursor-pointer appearance-none font-mono text-xs text-gray-500 [color-scheme:dark] w-[70px] sm:w-[80px]"
                              />
                            )}
                          </div>

                          {/* Show on Calendar Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateTaskDetail(task.id, 'show_on_calendar', !task.show_on_calendar); }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${task.show_on_calendar ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-black/40 border-gray-800 hover:border-gray-700 text-gray-500 hover:text-gray-400'}`}
                            title={task.show_on_calendar ? "Visible on Calendar" : "Show on Calendar"}
                          >
                            <CalendarIcon size={14} />
                          </button>

                          {/* Custom Recurrence Editor */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-gray-800 hover:border-gray-700 transition-colors">
                            <span className="text-gray-600 font-mono text-xs" title="Repeat Task">↻</span>
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
                              className="bg-transparent focus:outline-none cursor-pointer appearance-none text-gray-400 hover:text-white transition-colors text-xs font-mono font-bold"
                            >
                              <option value="none" className="bg-gray-900">Once</option>
                              <option value="days" className="bg-gray-900">Days</option>
                              <option value="weeks" className="bg-gray-900">Weeks</option>
                              <option value="months" className="bg-gray-900">Months</option>
                              <option value="years" className="bg-gray-900">Years</option>
                            </select>
                            
                            {task.recurrence && task.recurrence !== 'none' && (
                               <>
                                 <span className="text-gray-600 font-mono text-[10px] ml-1 uppercase tracking-widest">Every:</span>
                                 <input 
                                   type="number" min="1" 
                                   value={task.recurrence.split(' ')[0]} 
                                   onChange={(e) => {
                                      const newInt = parseInt(e.target.value) || 1;
                                      const type = task.recurrence.split(' ')[1] || 'days';
                                      handleUpdateTaskDetail(task.id, 'recurrence', `${newInt} ${type}`);
                                   }}
                                   onClick={(e) => e.stopPropagation()}
                                   className="w-10 bg-black/50 text-cyan-400 border border-cyan-500/30 rounded focus:border-cyan-500 focus:outline-none text-center text-xs font-mono font-bold py-0.5"
                                 />
                               </>
                            )}
                          </div>

                          {/* ⚡ Priority Dropdown (Moved to bottom right) */}
                          <div className="ml-auto sm:ml-auto flex items-center shrink-0">
                            <select
                              value={task.priority}
                              onChange={(e) => { e.stopPropagation(); handleUpdateTaskDetail(task.id, 'priority', e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-transparent focus:outline-none cursor-pointer appearance-none px-2 py-1 rounded border text-[10px] font-mono font-bold uppercase w-fit"
                              style={getPriorityStyle(task.priority)}
                            >
                              {availablePriorities.map(p => (
                                <option key={p.id} value={p.id} className="bg-gray-900 font-bold" style={{ color: p.color }}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                        </div>
                      </div>
                    </div> {/* <-- ⚡ This closes the inner padded flex container! */}

                    {/* ⚡ NEW: Right-Edge Vertical Tags (MOVED OUTSIDE) */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="absolute -right-[1px] -top-[1px] -bottom-[1px] w-5 sm:w-6 flex flex-col z-0 rounded-r-xl overflow-hidden">
                          {task.tags.map((tagId: string, index: number) => {
                            const tagObj = availableTags.find(t => t.id === tagId) || { id: tagId, name: tagId, color: getTagColor(tagId).bg };
                            const tColor = tagObj.color;
                            const isTagActive = activeTagId === tagId;
                            const isFirst = index === 0;
                            const isLast = index === task.tags.length - 1;
                            return (
                              <div 
                                key={tagId}
                                onClick={(e) => { e.stopPropagation(); setActiveTaskTags(prev => ({...prev, [task.id]: tagId})); }}
                                // ⚡ Removed border-l, changed border-r to border-r-[3px] for a thicker thumbnail edge
                                className={`flex-1 w-full flex items-center justify-center transition-all group/tag relative cursor-pointer border-r-[3px] ${isFirst ? 'rounded-tr-xl border-t' : ''} ${isLast ? 'rounded-br-xl border-b' : ''}`}
                                style={{ 
                                  backgroundColor: '#000000', 
                                  borderRightColor: isTagActive ? tColor : `${tColor}60`,
                                  borderTopColor: isTagActive ? tColor : `${tColor}40`,
                                  borderBottomColor: isTagActive ? tColor : `${tColor}40`,
                                  boxShadow: isTagActive ? `-4px 0 15px ${tColor}60, inset 2px 0 8px rgba(0,0,0,0.3)` : 'none',
                                  zIndex: isTagActive ? 10 : 1
                                }}
                              >
                              {/* Tooltip on hover (Only show if > 1 tag) */}
                              {task.tags.length > 1 && (
                                <div className="absolute right-full mr-2 bg-black text-white text-[10px] font-bold font-mono px-2 py-1 rounded border border-gray-700 opacity-0 group-hover/tag:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                                  {tagObj.name}
                                </div>
                              )}
                              {/* Vertical text if it's the only tag */}
                              {task.tags.length === 1 && (
                                <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" style={{ color: tColor, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                  {tagObj.name}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-center mx-auto mb-4">
                <TaskIcon size={32} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-mono font-medium text-white mb-2">No tasks found</h3>
              <p className="text-gray-600 text-sm font-mono">
                {searchQuery ? 'Try adjusting your search' : 'Create a new task to get started'}
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
      
      {/* ⚙️ Settings Modal Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full max-w-2xl bg-gray-950 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,255,255,0.1)] flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                <SettingsIcon size={24} className="text-cyan-400" />
                Task Settings
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <CloseIcon size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 darkwave-scrollbar">
              
              {/* Appearance Settings */}
              <section>
                <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-3">Appearance</h3>
                <div className="p-4 bg-black/50 border border-gray-800 rounded-lg space-y-3">
                  <label className="block text-sm font-mono text-gray-400 mb-2">Color Task Cards By:</label>
                  <div className="flex gap-2">
                    {(['tags', 'status', 'priority'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          setTaskColorMode(mode);
                          localStorage.setItem('acore_task_color_mode', mode);
                        }}
                        className={`flex-1 py-2 px-3 rounded border font-mono text-xs uppercase tracking-wider transition-all ${
                          taskColorMode === mode 
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]' 
                            : 'bg-gray-900/50 text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Tags Management */}
              <section>
                <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-3 mt-8">Custom Tags</h3>
                <div className="p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {availableTags.map((tag, index) => (
                      <React.Fragment key={tag.id}>
                        <button
                          draggable
                          onDragStart={(e) => { setDraggedTagIdx(index); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                          onDrop={(e) => { e.preventDefault(); handleDropTag(draggedTagIdx!, index); setDraggedTagIdx(null); }}
                          onDragEnd={() => setDraggedTagIdx(null)}
                          onClick={() => setEditingTagId(tag.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-grab active:cursor-grabbing hover:scale-105 hover:brightness-125 ${draggedTagIdx === index ? 'opacity-30' : 'opacity-100'}`}
                          style={{ backgroundColor: `${tag.color || '#3b82f6'}15`, borderColor: `${tag.color || '#3b82f6'}50` }}
                        >
                          <span className="font-mono text-xs font-bold whitespace-nowrap" style={{ color: tag.color || '#3b82f6' }}>{tag.name}</span>
                        </button>

                        {editingTagId === tag.id && (
                          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingTagId(null)}>
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
                              <h4 className="text-white font-mono font-bold mb-4">Edit Tag</h4>
                              <div className="flex gap-3 mb-4 items-center">
                                <input type="color" defaultValue={tag.color || '#3b82f6'} id={`edit-tag-color-${tag.id}`} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                                <input type="text" defaultValue={tag.name} id={`edit-tag-name-${tag.id}`} className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500" />
                              </div>
                              <div className="flex justify-between items-center">
                                <button onClick={() => { handleDeleteTag(tag.id); setEditingTagId(null); }} className="text-red-400 hover:text-red-300 font-mono text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors flex items-center gap-1"><TrashIcon size={14}/> Delete</button>
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingTagId(null)} className="text-gray-400 hover:text-white px-3 py-1.5 font-mono text-xs rounded hover:bg-white/5 transition-colors">Cancel</button>
                                  <button onClick={() => {
                                    const newColor = (document.getElementById(`edit-tag-color-${tag.id}`) as HTMLInputElement).value;
                                    const newName = (document.getElementById(`edit-tag-name-${tag.id}`) as HTMLInputElement).value;
                                    handleEditTag(tag.id, newName, newColor);
                                  }} className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 px-4 py-1.5 font-mono text-xs font-bold rounded transition-colors">Save</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-800/50 items-center">
                    <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" title="Tag Color" />
                    <input 
                      type="text" 
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="New tag name..." 
                      className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 placeholder:text-gray-600" 
                    />
                    <button onClick={handleAddTag} className="px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 rounded hover:bg-cyan-500/20 font-mono text-sm transition-all">
                      Add Tag
                    </button>
                  </div>
                </div>
              </section>

              {/* Status Management */}
              <section>
                <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-3">Custom Statuses</h3>
                <div className="p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {availableStatuses.map((status, index) => (
                      <React.Fragment key={status.id}>
                        <button
                          draggable
                          onDragStart={(e) => { setDraggedStatusIdx(index); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                          onDrop={(e) => { e.preventDefault(); handleDropStatus(draggedStatusIdx!, index); setDraggedStatusIdx(null); }}
                          onDragEnd={() => setDraggedStatusIdx(null)}
                          onClick={() => setEditingStatusId(status.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-grab active:cursor-grabbing hover:scale-105 hover:brightness-125 ${draggedStatusIdx === index ? 'opacity-30' : 'opacity-100'}`}
                          style={{ backgroundColor: `${status.color || '#9ca3af'}15`, borderColor: `${status.color || '#9ca3af'}50` }}
                        >
                          <span className="font-mono text-xs font-bold whitespace-nowrap" style={{ color: status.color || '#9ca3af' }}>{status.name}</span>
                        </button>

                        {editingStatusId === status.id && (
                          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingStatusId(null)}>
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
                              <h4 className="text-white font-mono font-bold mb-4">Edit Status</h4>
                              <div className="flex gap-3 mb-4 items-center">
                                <input type="color" defaultValue={status.color || '#22d3ee'} id={`edit-color-${status.id}`} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                                <input type="text" defaultValue={status.name} id={`edit-name-${status.id}`} className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500" />
                              </div>
                              <div className="flex justify-between items-center">
                                {status.type !== 'default' ? (
                                  <button onClick={() => { handleDeleteStatus(status.id); setEditingStatusId(null); }} className="text-red-400 hover:text-red-300 font-mono text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors flex items-center gap-1"><TrashIcon size={14}/> Delete</button>
                                ) : <div />}
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingStatusId(null)} className="text-gray-400 hover:text-white px-3 py-1.5 font-mono text-xs rounded hover:bg-white/5 transition-colors">Cancel</button>
                                  <button onClick={() => {
                                    const newColor = (document.getElementById(`edit-color-${status.id}`) as HTMLInputElement).value;
                                    const newName = (document.getElementById(`edit-name-${status.id}`) as HTMLInputElement).value;
                                    handleEditStatus(status.id, newName, newColor);
                                  }} className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 px-4 py-1.5 font-mono text-xs font-bold rounded transition-colors">Save</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-800/50 items-center">
                    <input type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" title="Status Color" />
                    <input 
                      type="text" 
                      value={newStatusInput}
                      onChange={(e) => setNewStatusInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                      placeholder="New status name..." 
                      className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 placeholder:text-gray-600" 
                    />
                    <button onClick={handleAddStatus} className="px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 rounded hover:bg-cyan-500/20 font-mono text-sm transition-all">
                      Add Status
                    </button>
                  </div>
                </div>
              </section>

              {/* Priority Management */}
              <section>
                <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-3">Custom Priorities</h3>
                <div className="p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {availablePriorities.map((priority, index) => (
                      <React.Fragment key={priority.id}>
                        <button
                          draggable
                          onDragStart={(e) => { setDraggedPriorityIdx(index); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                          onDrop={(e) => { e.preventDefault(); handleDropPriority(draggedPriorityIdx!, index); setDraggedPriorityIdx(null); }}
                          onDragEnd={() => setDraggedPriorityIdx(null)}
                          onClick={() => setEditingPriorityId(priority.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-grab active:cursor-grabbing hover:scale-105 hover:brightness-125 ${draggedPriorityIdx === index ? 'opacity-30' : 'opacity-100'}`}
                          style={{ backgroundColor: `${priority.color || '#ef4444'}15`, borderColor: `${priority.color || '#ef4444'}50` }}
                        >
                          <span className="font-mono text-xs font-bold whitespace-nowrap" style={{ color: priority.color || '#ef4444' }}>{priority.name}</span>
                        </button>

                        {editingPriorityId === priority.id && (
                          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPriorityId(null)}>
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
                              <h4 className="text-white font-mono font-bold mb-4">Edit Priority</h4>
                              <div className="flex gap-3 mb-4 items-center">
                                <input type="color" defaultValue={priority.color || '#ef4444'} id={`edit-prio-color-${priority.id}`} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                                <input type="text" defaultValue={priority.name} id={`edit-prio-name-${priority.id}`} className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500" />
                              </div>
                              <div className="flex justify-between items-center">
                                {priority.type !== 'default' ? (
                                  <button onClick={() => { handleDeletePriority(priority.id); setEditingPriorityId(null); }} className="text-red-400 hover:text-red-300 font-mono text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors flex items-center gap-1"><TrashIcon size={14}/> Delete</button>
                                ) : <div />}
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingPriorityId(null)} className="text-gray-400 hover:text-white px-3 py-1.5 font-mono text-xs rounded hover:bg-white/5 transition-colors">Cancel</button>
                                  <button onClick={() => {
                                    const newColor = (document.getElementById(`edit-prio-color-${priority.id}`) as HTMLInputElement).value;
                                    const newName = (document.getElementById(`edit-prio-name-${priority.id}`) as HTMLInputElement).value;
                                    handleEditPriority(priority.id, newName, newColor);
                                  }} className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 px-4 py-1.5 font-mono text-xs font-bold rounded transition-colors">Save</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-800/50 items-center">
                    <input type="color" value={newPriorityColor} onChange={(e) => setNewPriorityColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" title="Priority Color" />
                    <input 
                      type="text" 
                      value={newPriorityInput}
                      onChange={(e) => setNewPriorityInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPriority()}
                      placeholder="New priority name..." 
                      className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 placeholder:text-gray-600" 
                    />
                    <button onClick={handleAddPriority} className="px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 rounded hover:bg-cyan-500/20 font-mono text-sm transition-all">
                      Add Priority
                    </button>
                  </div>
                </div>
              </section>

              {/* Notification Settings */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest">Alerts & Reminders</h3>
                  <button 
                    onClick={() => addAlert({ message: 'System check: Global alerts are functioning normally.', type: 'info' })}
                    className="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded hover:bg-cyan-500/40 transition-colors font-mono"
                  >
                    Test Alert
                  </button>
                </div>
                <div className="space-y-3 p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <label className="flex items-center gap-3 text-sm text-gray-300 font-mono cursor-pointer hover:text-white">
                    <input 
                      type="checkbox" 
                      checked={globalAlerts}
                      onChange={(e) => {
                        const val = e.target.checked;
                        handleNotificationToggle('global_alerts', val);
                        addAlert({ message: val ? 'Global alerts enabled.' : 'Global alerts disabled.', type: val ? 'info' : 'warning' });
                      }}
                      className="w-4 h-4 bg-gray-900 border-gray-700 rounded accent-cyan-500 cursor-pointer" 
                    />
                    Global top-header alerts for tasks due today
                  </label>
                  <label className="flex items-center gap-3 text-sm text-gray-300 font-mono cursor-pointer hover:text-white">
                    <input 
                      type="checkbox" 
                      checked={pushDelegations}
                      onChange={(e) => {
                        const val = e.target.checked;
                        handleNotificationToggle('push_delegations', val);
                        addAlert({ message: val ? 'Push notifications enabled.' : 'Push notifications paused.', type: val ? 'info' : 'warning' });
                      }}
                      className="w-4 h-4 bg-gray-900 border-gray-700 rounded accent-cyan-500 cursor-pointer" 
                    />
                    Push notification when a task is delegated to me
                  </label>
                  <label className="flex items-center gap-3 text-sm text-gray-300 font-mono cursor-pointer hover:text-white">
                    <input 
                      type="checkbox" 
                      checked={dailySummary}
                      onChange={(e) => {
                        const val = e.target.checked;
                        handleNotificationToggle('daily_summary', val);
                        addAlert({ message: val ? 'Daily summaries activated.' : 'Daily summaries deactivated.', type: val ? 'info' : 'warning' });
                      }}
                      className="w-4 h-4 bg-gray-900 border-gray-700 rounded accent-cyan-500 cursor-pointer" 
                    />
                    Daily summary email of pending tasks
                  </label>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* ⚡ Renders the portal-based Task Panel when the user clicks 'New Task' */}
      <TaskPanel isOpen={isTaskPanelOpen} onClose={() => setIsTaskPanelOpen(false)} />
      
      {/* ⚡ Renders the Task Viewer Modal when a specific task is clicked */}
      {viewingTaskId && (
        <TaskViewerModal 
          taskId={viewingTaskId} 
          onClose={() => setViewingTaskId(null)} 
          onViewAll={() => {
            setViewingTaskId(null);
            setStatusFilters([]); // <-- Updated
            setTagFilters([]);    // <-- Added
            setPriorityFilters([]); // <-- Added
            setSearchQuery('');
          }}
          availableStatuses={availableStatuses}
          availablePriorities={availablePriorities}
          availableTags={availableTags}
          onLocalUpdate={(field, value) => {
            setTasks(prev => prev.map(t => t.id === viewingTaskId ? { ...t, [field]: value } : t));
          }}
        />
      )}
    </div>
  );
};

export default TasksView;