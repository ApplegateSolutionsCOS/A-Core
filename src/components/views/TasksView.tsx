import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import { TaskPanel, InlineActivityPanel } from '@/components/toolbar/ToolbarPanels'; 
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
  CalendarIcon,
  ExternalLinkIcon
} from '@/components/icons/Icons';
import * as LucideIcons from 'lucide-react';
// Removed useNotifications import to prevent circular dependency crashes

interface TasksViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspaceSlug?: string | null;
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

// --- Task Comments Pane ---
interface TaskComment {
  id: string;
  task_id: string;
  organization_id?: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
}

const TaskCommentsPane: React.FC<{
  taskId: string;
  onClose: () => void;
}> = ({ taskId, onClose }) => {
  const { user, organization } = useAuth();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';
  const userName = user ? ((user as any).display_name || (user as any).email || 'User') : 'User';

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hardcoded to match the TaskViewerModal's cyan theme
  const primaryColor = '#22d3ee';
  const rgbColor = '34, 211, 238';

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.schema('app_private')
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (!error && data) setComments(data);
      setIsLoading(false);
      scrollToBottom();
    };

    fetchComments();

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'app_private', table: 'task_comments', filter: `task_id=eq.${taskId}`
      }, (payload) => {
        setComments(prev => [...prev, payload.new as TaskComment]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [taskId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.schema('app_private').from('task_comments').insert({
        task_id: taskId,
        organization_id: organization?.id,
        user_id: userId,
        user_name: userName,
        comment_text: newComment.trim(),
      });
      
      if (error) throw error;
      
      setNewComment('');
      scrollToBottom();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full w-full bg-black/40 relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 darkwave-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `rgba(${rgbColor}, 0.3)`, borderTopColor: primaryColor }} /></div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-50">
            <LucideIcons.MessageSquare size={32} className="mb-2" />
            <p className="text-xs font-mono">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.user_id === userId;
            return (
              <div key={comment.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-gray-500 font-mono mb-1 px-1">{isMe ? 'You' : comment.user_name} • {formatTime(comment.created_at)}</span>
                  <div className={`p-3 rounded-xl text-sm font-mono border`} style={{ background: isMe ? `rgba(${rgbColor}, 0.15)` : 'rgba(255,255,255,0.05)', borderColor: isMe ? `rgba(${rgbColor}, 0.3)` : 'rgba(255,255,255,0.1)', color: isMe ? '#fff' : '#d1d5db', borderBottomRightRadius: isMe ? '4px' : '12px', borderBottomLeftRadius: !isMe ? '4px' : '12px' }}>
                    {comment.comment_text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t bg-black/60 flex-shrink-0" style={{ borderColor: `rgba(${rgbColor}, 0.2)` }}>
        <div className="relative flex items-end">
          <textarea 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSend(); 
              } 
            }} 
            placeholder="Write a comment..." 
            className="w-full bg-gray-900/80 border rounded-xl pl-4 pr-12 py-3 text-white font-mono text-sm resize-none focus:outline-none min-h-[50px] max-h-[150px] darkwave-scrollbar" 
            style={{ borderColor: `rgba(${rgbColor}, 0.3)` }} 
            rows={1} 
          />
          <button 
            onClick={handleSend} 
            disabled={!newComment.trim() || isSubmitting} 
            className="absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:scale-105" 
            style={{ background: primaryColor, color: '#000' }}
          >
            <LucideIcons.Send size={14} />
          </button>
        </div>
        <p className="text-[9px] text-gray-600 font-mono mt-2 text-center">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
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

  // ⚡ NEW: Tab States
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments' | 'activity' | 'alerts'>('details');
  const [tabsDisplayState, setTabsDisplayState] = useState<'full' | 'icons'>('full');

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
    // ⚡ FIX: Padded the year to 4 digits to prevent the browser from rejecting partial year keystrokes
    dateString = String(taskDate.getFullYear()).padStart(4, '0') + '-' + String(taskDate.getMonth() + 1).padStart(2, '0') + '-' + String(taskDate.getDate()).padStart(2, '0');
    timeString = String(taskDate.getHours()).padStart(2, '0') + ':' + String(taskDate.getMinutes()).padStart(2, '0');
  }

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-[201] flex flex-col pointer-events-none animate-in fade-in zoom-in-95 duration-200" style={{ top: 'calc(2vh + 60px)', left: '2vw', right: '2vw', bottom: '90px' }}>
        <div className="flex-1 flex flex-col w-full max-w-[992px] mx-auto bg-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl pointer-events-auto border-cyan-500/40 shadow-[0_0_60px_rgba(0,255,255,0.15)]">
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

          {/* ⚡ NEW: TABS ROW */}
          <div className="w-full border-b bg-black/40 px-4 sm:px-6 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 border-cyan-500/30">
            <button
              onClick={() => setActiveTab('details')}
              className="px-4 py-2 mr-3 text-xs font-mono uppercase tracking-wider transition-all rounded-xl flex-shrink-0 border shadow-inner"
              style={{
                color: activeTab === 'details' ? '#22d3ee' : '#888',
                background: activeTab === 'details' ? 'rgba(34,211,238, 0.12)' : 'rgba(255,255,255,0.03)',
                borderColor: activeTab === 'details' ? 'rgba(34,211,238, 0.5)' : 'rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => {
                if (activeTab !== 'details') {
                  e.currentTarget.style.borderColor = 'rgba(34,211,238, 0.3)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'details') {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#888';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }
              }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <LucideIcons.Edit size={14} /> <span>Details</span>
              </span>
            </button>

            <button
              onClick={() => setTabsDisplayState(prev => prev === 'full' ? 'icons' : 'full')}
              className="p-1 sm:p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 mr-1"
              title={tabsDisplayState === 'full' ? "Collapse Tabs" : "Expand Tabs"}
            >
              {tabsDisplayState === 'full' ? <LucideIcons.Minimize2 size={16} /> : <LucideIcons.Maximize2 size={16} />}
            </button>

            {(['comments', 'attachments', 'activity', 'alerts'] as const).map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-1.5 sm:py-2 text-xs font-mono uppercase tracking-wider transition-all rounded-lg flex-shrink-0 ${tabsDisplayState === 'icons' ? 'px-2' : 'px-3'}`}
                  style={{
                    color: isActive ? '#22d3ee' : '#6b7280',
                    background: isActive ? 'rgba(34,211,238, 0.08)' : 'transparent',
                  }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {tab === 'comments' && <LucideIcons.MessageSquare size={14} />}
                    {tab === 'attachments' && <LucideIcons.Paperclip size={14} />}
                    {tab === 'activity' && <LucideIcons.Activity size={14} />}
                    {tab === 'alerts' && <LucideIcons.AlertTriangle size={14} />}
                    {tabsDisplayState === 'full' && <span>{tab}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Body */}
          {activeTab === 'details' && (
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
                     if (e.target.validity.badInput) return; // ⚡ FIX: Prevent erasure while typing
                     const newDateStr = e.target.value;
                     let newIso = null;
                     if (newDateStr) {
                       const d = new Date(`${newDateStr}T${timeString || '23:59'}`);
                       if (!isNaN(d.getTime())) newIso = d.toISOString();
                     }
                     handleUpdate('due_date', newIso);
                  }} className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer mb-2 [color-scheme:dark]" />
                  <input type="time" value={timeString} onChange={(e) => {
                     if (e.target.validity.badInput) return; // ⚡ FIX: Prevent erasure while typing
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
              </div>
            </div>
          </div>
          )}

          {/* ⚡ NEW: Activity Tab Content */}
          {activeTab === 'activity' && (
            <div className="flex-1 overflow-hidden bg-black/40 relative">
               <InlineActivityPanel
                  currentWorkspace={task.workspace_slug || 'General'}
                  currentMiniApp="Tasks"
                  onClose={() => setActiveTab('details')}
                  accentColor="#22d3ee"
                  accentRgb="34, 211, 238"
                  recordContext={task}
                />
            </div>
          )}

          {/* ⚡ NEW: Comments Tab Content */}
          {activeTab === 'comments' && (
            <div className="flex-1 overflow-hidden bg-black/40 relative flex flex-col">
              <TaskCommentsPane 
                taskId={task.id} 
                onClose={() => setActiveTab('details')} 
              />
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="flex-1 flex items-center justify-center bg-black/40 p-12">
              <div className="text-center">
                <LucideIcons.Paperclip size={32} className="mx-auto mb-3 text-gray-700" />
                <h3 className="text-lg font-mono font-medium text-white mb-2">Task Attachments</h3>
                <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto">Upload files and documents related to this task. (Coming soon)</p>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="flex-1 flex items-center justify-center bg-black/40 p-12">
              <div className="text-center">
                <LucideIcons.AlertTriangle size={32} className="mx-auto mb-3 text-gray-700" />
                <h3 className="text-lg font-mono font-medium text-white mb-2">Task Alerts</h3>
                <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto">Set custom notifications and reminders tied to this specific task. (Coming soon)</p>
              </div>
            </div>
          )}

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

const TasksView: React.FC<TasksViewProps> = ({ isOpen, onClose, currentWorkspaceSlug }) => {
  const { user, organization } = useAuth(); // ⚡ Destructure organization
  const currentUserId = user?.id || (user as any)?.uid;
  
  // Get Workspace Colors exactly like LeftSlidePanel (removed activeWorkspace to fix the red squiggle)
  const { getColor } = useWorkspaceColor();
  const ac = currentWorkspaceSlug ? getColor(currentWorkspaceSlug) : null;

  // ⚡ Theme State
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchColors = async () => {
      if (!currentUserId || !organization?.id) return;
      const { data } = await supabase.schema('app_private')
        .from('user_preferences')
        .select('nav_colors')
        .eq('user_id', currentUserId)
        .eq('organization_id', organization.id) // ⚡ Scope to org
        .maybeSingle();
      if (data?.nav_colors) setUserNavColors(data.nav_colors);
    };
    fetchColors();

    const handleColorUpdate = (e: any) => {
      if (e.detail) setUserNavColors(e.detail);
    };
    window.addEventListener('navColorsUpdated', handleColorUpdate);
    return () => window.removeEventListener('navColorsUpdated', handleColorUpdate);
  }, [currentUserId]);

  const userPrefKey = userNavColors['tasks'];
  
  // ⚡ THE FIX: Use the exact same workspace-first inheritance logic as LeftSlidePanel
  const themeColor = (currentWorkspaceSlug && ac) 
    ? ac.primary 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#22c55e');

  const themeRgb = (currentWorkspaceSlug && ac) 
    ? ac.rgb 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '34,197,94');

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
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const centerDiff = childCenter - containerCenter; // + is right, - is left
      const absDiff = Math.abs(centerDiff);
      
      // Card width (150px) + Gap (24px) = ~174px. We use 170 for smooth normalized mapping.
      const offset = centerDiff / 170; 
      const absOffset = Math.abs(offset);
      
      // 1. Z-Push: Push back based on distance from center
      const translateZ = -absOffset * 60;
      
      // 2. Rotate: Inward turn (Right items look left, Left items look right)
      const rotateY = offset * -35; 
      
      // 3. Squeeze (X-Translation): Pull items tighter together to overlap *behind* the center
      const translateX = offset === 0 ? 0 : (offset > 0 ? -1 : 1) * (absOffset * 55);
      
      // 4. Scale & Fade (Fade completely out before hitting edges)
      const scale = Math.max(0.75, 1 - absOffset * 0.1);
      const opacity = Math.max(0, 1 - (absOffset * 0.35)); 
      
      // 5. Z-Index: Center is 100, stepping down cleanly outward
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
    
    // ⚡ True Infinite Loop teleportation logic
    const setWidth = container.scrollWidth / 9;
    if (setWidth === 0) return;

    if (container.scrollLeft <= setWidth * 2) {
      container.style.scrollBehavior = 'auto'; // Disable smooth scroll to make teleport invisible
      container.scrollLeft += setWidth * 3;
      requestAnimationFrame(() => { if (container) container.style.scrollBehavior = 'smooth'; });
    } else if (container.scrollLeft >= setWidth * 7) {
      container.style.scrollBehavior = 'auto';
      container.scrollLeft -= setWidth * 3;
      requestAnimationFrame(() => { if (container) container.style.scrollBehavior = 'smooth'; });
    }
  };

  // ⚡ Momentum Desktop Scrolling (Mouse wheel interception)
  useEffect(() => {
    const container = tagsScrollRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        // behavior: 'auto' translates standard scrolling exactly to horizontal scrolling
        // The container's snap-mandatory will catch it when the wheel stops moving!
        container.scrollBy({ left: e.deltaY, behavior: 'auto' });
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

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

  // Feature Toggle Menus
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Feature Active States
  const [activeLayout, setActiveLayout] = useState<'list' | 'board' | 'calendar'>('list');
  const [activeGroupMode, setActiveGroupMode] = useState<'status' | 'priority' | 'due_date' | 'none'>('due_date');

  useEffect(() => {
    if (!currentUserId || !isOpen || !organization?.id) return; // ⚡ Require org ID

    const fetchTasksData = async () => {
      try {
        // ⚡ FIX: Use active organization directly to prevent cross-contamination
        const { data: orgUsers } = await supabase.schema('app_private')
          .from('organization_users')
          .select('id, full_name, email')
          .eq('organization_id', organization.id);

        const uMap: Record<string, string> = {};
        orgUsers?.forEach(u => {
          uMap[u.id] = u.full_name || u.email || 'Unknown';
        });
        setUsersMap(uMap);

        // Fetch User Settings (Notifications)
        const { data: dbSettings } = await supabase.schema('app_private')
          .from('user_settings')
          .select('notification_settings')
          .eq('user_id', currentUserId)
          .eq('organization_id', organization.id)
          .maybeSingle();

        // Fetch Org Settings (Tags, Statuses, Priorities)
        const { data: orgSettings } = await supabase.schema('app_private')
          .from('organizations')
          .select('tags, custom_statuses, custom_priorities')
          .eq('id', organization.id)
          .maybeSingle();

        if (orgSettings) {
          if (orgSettings.tags) {
            const formattedTags = orgSettings.tags.map((t: any) => {
              if (typeof t === 'string') {
                try {
                  const parsed = JSON.parse(t);
                  if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
                } catch (e) {}
                return { id: t.toLowerCase().replace(/\s+/g, '_'), name: t, color: getTagColor(t).bg };
              }
              return t;
            });
            setAvailableTags(formattedTags);
          }
          if (orgSettings.custom_statuses) setAvailableStatuses(orgSettings.custom_statuses);
          if (orgSettings.custom_priorities) setAvailablePriorities(orgSettings.custom_priorities);
        }
        
        if (dbSettings?.notification_settings) {
          if (dbSettings.notification_settings.global_alerts !== undefined) setGlobalAlerts(dbSettings.notification_settings.global_alerts);
          if (dbSettings.notification_settings.push_delegations !== undefined) setPushDelegations(dbSettings.notification_settings.push_delegations);
          if (dbSettings.notification_settings.daily_summary !== undefined) setDailySummary(dbSettings.notification_settings.daily_summary);
        }

        const { data: dbTasks } = await supabase.schema('app_private')
          .from('tasks')
          .select('*')
          .eq('organization_id', organization.id) // ⚡ Scope directly to active org
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
  const [isViewPaneOpen, setIsViewPaneOpen] = useState(false); // ⚡ NEW: View Pane State
  
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

  // Helper to save user preferences (Notifications)
  const updateUserSettingsDB = async (updates: any) => {
    if (!currentUserId || !organization?.id) return;
    try {
      await supabase.schema('app_private')
        .from('user_settings')
        .upsert({ 
          user_id: currentUserId, 
          organization_id: organization.id,
          ...updates, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'user_id, organization_id' });
    } catch (err) {
      console.error('Error saving user settings:', err);
      addAlert({ message: 'Failed to save settings to the database.', type: 'error' });
    }
  };

  // Helper to save ORG-WIDE settings (Tags, Statuses, Priorities)
  const updateOrgSettingsDB = async (updates: any) => {
    if (!organization?.id) return;
    try {
      await supabase.schema('app_private')
        .from('organizations')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', organization.id);
    } catch (err) {
      console.error('Error saving organization settings:', err);
      addAlert({ message: 'Failed to save organization settings to the database.', type: 'error' });
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

    await updateUserSettingsDB({ notification_settings: newNotificationSettings });
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

  `const taskCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  // ⚡ Recenter on filter change
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

  // ⚡ FIX: Allow the standalone TaskViewerModal to render if a task is clicked from the banner, even if the main TasksView is closed.`
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
        /* ⚡ NEW: Force hide scrollbars for elements using no-scrollbar */
        #tasks-view-modal .no-scrollbar::-webkit-scrollbar { display: none !important; }
        #tasks-view-modal .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }

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
      <div className="relative w-full max-w-[1376px] h-full max-h-[95vh] bg-black/10 backdrop-blur-xl border rounded-2xl flex animate-in zoom-in-95 duration-200 overflow-hidden transition-shadow duration-300"
           style={{ 
             borderColor: `rgba(${themeRgb}, 0.5)`, 
             boxShadow: `0 0 30px rgba(${themeRgb}, 0.3), inset 0 0 20px rgba(${themeRgb}, 0.1)` 
           }}>
        {/* ⚡ FIX: Removed hardcoded purple and matched the gradient purely to your theme color */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(to bottom right, rgba(${themeRgb}, 0.15), transparent, rgba(${themeRgb}, 0.05))` }} />
        <div className="absolute inset-0 hex-pattern opacity-5 pointer-events-none z-0" />

        {/* ⚡ VIEW PANE GOES HERE */}
        {isViewPaneOpen ? (
          <div
            className="w-[352px] h-full flex-shrink-0 bg-black/90 backdrop-blur-xl overflow-hidden flex flex-col transition-all duration-300 relative z-30 border-r"
            style={{
              borderColor: `rgba(${themeRgb}, 0.3)`,
              boxShadow: `20px 0 20px -20px rgba(${themeRgb}, 0.1)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid rgba(${themeRgb}, 0.2)`, background: `linear-gradient(to right, rgba(${themeRgb}, 0.06), transparent)` }}>
              <div className="flex items-center gap-2">
                <LucideIcons.Eye size={14} style={{ color: themeColor }} />
                <span className="text-xs font-mono font-medium" style={{ color: themeColor }}>Views</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 text-gray-500 hover:text-white transition-colors" title="Create New View">
                  <PlusIcon size={14} />
                </button>
                <button onClick={() => setIsViewPaneOpen(false)} className="p-1 text-gray-500 hover:text-white transition-colors">
                  <CloseIcon size={14} />
                </button>
              </div>
            </div>
            
            {/* Saved Views List Placeholder */}
            <div className="flex-1 overflow-y-auto darkwave-scrollbar pt-1 pb-4">
              <div className="px-3 py-3 pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <LucideIcons.Lock size={14} style={{ color: themeColor }} />
                  <span className="text-sm text-gray-300 font-mono font-bold tracking-wide">Saved Views</span>
                </div>
                <div className="space-y-1.5 ml-5 mt-2">
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/5 border border-transparent">
                    <LucideIcons.Eye size={14} className="text-gray-500" />
                    <span className="text-sm font-mono truncate flex-1 font-medium text-gray-300">My Due Tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full relative w-0 overflow-visible z-40">
            <button
              onClick={() => setIsViewPaneOpen(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 px-2.5 py-8 rounded-r-xl transition-all hover:px-3.5 group"
              style={{
                background: `linear-gradient(135deg, rgba(${themeRgb}, 0.3), rgba(${themeRgb}, 0.15))`,
                border: `1px solid rgba(${themeRgb}, 0.5)`,
                borderLeft: 'none',
                boxShadow: `0 0 15px rgba(${themeRgb}, 0.2), inset 0 0 10px rgba(${themeRgb}, 0.05)`,
              }}
              title="Open Views Panel"
            >
              <div className="flex flex-col items-center gap-1.5">
                <LucideIcons.Eye size={16} style={{ color: themeColor }} className="group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: themeColor, writingMode: 'vertical-lr', textOrientation: 'mixed' }}>VIEWS</span>
              </div>
            </button>
          </div>
        )}

        {/* RIGHT MAIN CONTENT */}
        <div className="flex-1 flex flex-col relative z-20 min-w-0">
          {/* Sticky Header with Close Button */}
          <div className="relative z-20 flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-6 border-b border-gray-800/50 bg-black/20 shrink-0">
          <div className="flex flex-col xl:flex-row xl:items-center gap-6">
            <h1 
              className="text-3xl md:text-4xl font-bold text-white tracking-widest leading-none -mt-1"
              style={{ fontFamily: "'Orbitron', 'Space Mono', monospace" }}
            >
              <span style={{ color: themeColor, textShadow: `0 0 10px rgba(${themeRgb}, 0.8), 0 0 20px rgba(${themeRgb}, 0.4)` }}>TASKS</span>
            </h1>
            
            {/* Moved Toggles */}
            <div className="flex flex-wrap items-center gap-3">
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
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => console.log('Share Tasks')}
              className="p-2 text-gray-400 hover:text-white bg-black/50 border border-gray-800 rounded-lg hover:bg-gray-700 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] h-10 w-10 flex items-center justify-center"
              title="Share Tasks"
            >
              <LucideIcons.Share2 size={20} />
            </button>
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
              // 1. Build the active list dynamically based on toggle
              let activeItems: any[] = [];
              if (activeFilterCategory === 'statuses') activeItems = availableStatuses.map(s => ({ ...s, type: 'status' }));
              else if (activeFilterCategory === 'tags') activeItems = availableTags.map(t => ({ ...t, type: 'tag' }));
              else if (activeFilterCategory === 'priorities') activeItems = availablePriorities.map(p => ({ ...p, type: 'priority' }));

              if (activeItems.length === 0) return null;

              // Create 9 identical sets for seamless 3D infinite scrolling
              const infiniteItems = Array(9).fill(activeItems).flat().map((item, idx) => ({ ...item, _loopId: idx }));

              // 2. Render the cards
              return infiniteItems.map(item => {
                const count = tasks.filter(t => {
                  if (viewMode === 'mine' && !(t.assigned_to === currentUserId || (t.created_by === currentUserId && !t.assigned_to))) return false;
                  if (viewMode === 'delegated' && !(t.created_by === currentUserId && t.assigned_to !== currentUserId)) return false;
                  if (viewMode === 'open' && t.status === 'completed') return false;
                  if (viewMode === 'completed' && t.status === 'completed') return true;

                  if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  if (item.type !== 'status' && statusFilters.length > 0 && !statusFilters.includes(t.status)) return false;
                  if (item.type !== 'priority' && priorityFilters.length > 0 && !priorityFilters.includes(t.priority)) return false;
                  if (item.type !== 'tag' && tagFilters.length > 0 && !tagFilters.some(tf => (t.tags || []).includes(tf))) return false;

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

        {/* List Controls: Filter, Group, Layout, Sort, Search, Task */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          
          {/* Left Side: Filter, Group, Layout, Sort */}
          <div className="flex items-center gap-2">
            
          {/* Filter Button */}
          <div className="relative h-[32px]">
            <button 
              onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); setShowGroupMenu(false); setShowLayoutMenu(false); }}
              title="Filter"
              className={`w-[32px] rounded-lg border flex items-center justify-center transition-all h-full ${
                showFilterMenu ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.3)]'
              }`}
            >
              <LucideIcons.Filter size={14} />
            </button>
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute left-0 top-10 w-48 bg-gray-950 border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.15)] z-50 p-4">
                  <h4 className="text-white font-mono font-bold text-sm uppercase tracking-widest border-b border-gray-800 pb-2 mb-2">Filters</h4>
                  <p className="text-xs text-gray-500 font-mono">Advanced filters coming soon.</p>
                </div>
              </>
            )}
          </div>

          {/* Group Button */}
          <div className="relative h-[32px]">
            <button 
              onClick={() => { setShowGroupMenu(!showGroupMenu); setShowFilterMenu(false); setShowSortMenu(false); setShowLayoutMenu(false); }}
              title="Group"
              className={`w-[32px] rounded-lg border flex items-center justify-center transition-all h-full ${
                showGroupMenu ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.3)]'
              }`}
            >
              <LucideIcons.Layers size={14} />
            </button>
            {showGroupMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowGroupMenu(false)} />
                <div className="absolute left-0 top-10 w-48 bg-gray-950 border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.15)] z-50 p-2 flex flex-col gap-1">
                  <h4 className="text-white font-mono font-bold text-sm uppercase tracking-widest border-b border-gray-800 pb-2 mb-1 px-2">Group By</h4>
                  {(['due_date', 'status', 'priority', 'none'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { setActiveGroupMode(mode); setShowGroupMenu(false); }}
                      className={`text-left px-3 py-2 rounded-lg font-mono text-xs transition-colors ${activeGroupMode === mode ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}
                    >
                      {mode === 'none' ? 'None' : mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Layout Button */}
          <div className="relative h-[32px]">
            <button 
              onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowFilterMenu(false); setShowSortMenu(false); setShowGroupMenu(false); }}
              title="Layout"
              className={`w-[32px] rounded-lg border flex items-center justify-center transition-all h-full ${
                showLayoutMenu ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.3)]'
              }`}
            >
              <LucideIcons.LayoutGrid size={14} />
            </button>
            {showLayoutMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLayoutMenu(false)} />
                <div className="absolute left-0 top-10 w-48 bg-gray-950 border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.15)] z-50 p-2 flex flex-col gap-1">
                  <h4 className="text-white font-mono font-bold text-sm uppercase tracking-widest border-b border-gray-800 pb-2 mb-1 px-2">View As</h4>
                  {(['list', 'board', 'calendar'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { setActiveLayout(mode); setShowLayoutMenu(false); }}
                      className={`text-left px-3 py-2 rounded-lg font-mono text-xs capitalize transition-colors ${activeLayout === mode ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort Button & Menu */}
          <div className="relative h-[32px]">
            <button 
              onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); setShowGroupMenu(false); setShowLayoutMenu(false); }}
              title="Sort"
              className={`w-[32px] rounded-lg border flex items-center justify-center transition-all h-full ${
                showSortMenu ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 shadow-[0_0_10px_rgba(0,0,0,0.3)]'
              }`}
            >
              <SortIcon size={14} />
            </button>
            
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute left-0 top-10 w-[calc(100vw-3rem)] sm:w-80 max-w-[320px] bg-gray-950 border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.15)] z-50 p-4 flex flex-col gap-3">
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
          </div>

          {/* Right Side: Search & New Task */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Expanding Search Bar */}
            <div className="flex items-center justify-end h-[32px]">
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
                    className="w-48 sm:w-64 h-[32px] bg-black/50 border border-gray-800 rounded-lg pl-9 pr-8 py-1.5 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  />
                  <button onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }} className="absolute right-2 p-1 text-gray-500 hover:text-white">
                    <CloseIcon size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="p-1.5 text-gray-400 hover:text-white bg-gray-900/50 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)] h-[32px] w-[32px] flex items-center justify-center"
                  title="Search Tasks"
                >
                  <SearchIcon size={16} />
                </button>
              )}
            </div>

            {/* + Task Button */}
            <button 
              onClick={() => setIsTaskPanelOpen(true)}
              className="flex items-center justify-center gap-2 px-4 h-[32px] bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all font-mono shadow-[0_0_15px_rgba(0,255,255,0.15)] font-bold tracking-wider shrink-0"
            >
              <PlusIcon size={14} className="drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
              <span className="text-sm">Task</span>
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-black/10 backdrop-blur-sm border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.05)] relative min-h-[400px] flex flex-col">
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
            <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-4 no-scrollbar mt-2">
              {(() => {
                let currentGroup: string | null = null;
                
                return sortedFilteredTasks.map((task) => {
                  const formattedDate = formatDueDate(task.due_date);
                  const isPastDue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'completed';
                  
                  // ⚡ Dynamic Grouping Logic (Accounts for Date, Priority, or Alphabetical Sorting)
                  let groupName = 'Other';
                  if (task.status === 'completed') {
                    groupName = 'Completed';
                  } else if (sortCriteria[0]?.field === 'priority') {
                    const p = availablePriorities.find(ap => ap.id === task.priority);
                    groupName = `${p ? p.name : 'No'} Priority`;
                  } else if (sortCriteria[0]?.field === 'title') {
                    groupName = task.title ? task.title.charAt(0).toUpperCase() : '#';
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
                  // Default to 'tags' (Falls back to priority if no tags exist)
                  activeColorHex = activeTagObj ? activeTagObj.color : getPriorityInfo(task.priority).color;
                }
                const activeRgb = hexToRgb(activeColorHex);

                // ⚡ UPDATED: Shifted all values higher to make the default state match the old hover state
                const defaultBorder = `rgba(${activeRgb}, 0.6)`; 
                const defaultBg = `rgba(${activeRgb}, 0.05)`;
                const hoverBorder = `rgba(${activeRgb}, 1)`; // Pure color on hover
                // ⚡ FIX: Dialed opacity down to 0.08 for a much more subtle hover tint
                const hoverBg = `rgba(${activeRgb}, 0.12)`;
                const hoverShadow = `0 0 35px rgba(${activeRgb}, 0.5)`; // Increased intensity

                return (
                  <React.Fragment key={task.id}>
                    {isNewGroup && (
                      <div className="flex items-center gap-3 mt-7 mb-3 ml-1 opacity-90 animate-in fade-in duration-300">
                        {/* ⚡ Adjusted font size to be halfway between original (11px) and previous large size (22px) */}
                        <h4 className="text-[16px] font-mono font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                            style={{ color: groupName === 'Overdue' ? '#ef4444' : groupName === 'Today' ? '#f97316' : undefined }}>
                          {groupName}
                        </h4>
                        <div className="h-px flex-1 mt-0.5" style={{ background: `linear-gradient(90deg, rgba(75,85,99,0.8), transparent)` }}></div>
                      </div>
                    )}
                    <div
                      id={`task-${task.id}`}
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
                    // ⚡ Added pl-10 to leave space for the new vertical tags on the left
                    // ⚡ Removed overflow-hidden so the corner curves and glows behave correctly
                    // ⚡ Added transform scale, translate-y, and z-index for a 3D pop-up effect
                    className={`p-4 pl-10 transition-all duration-300 ease-out group rounded-xl border cursor-pointer relative z-10 hover:z-40 hover:scale-[1.015] hover:-translate-y-1 ${
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
                              value={task.due_date ? String(new Date(task.due_date).getFullYear()).padStart(4, '0') + '-' + String(new Date(task.due_date).getMonth() + 1).padStart(2, '0') + '-' + String(new Date(task.due_date).getDate()).padStart(2, '0') : ''}
                              onChange={(e) => {
                                if (e.target.validity.badInput) return; 
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
                                  if (e.target.validity.badInput) return; 
                                  const newTime = e.target.value;
                                  const existingDate = String(new Date(task.due_date).getFullYear()).padStart(4, '0') + '-' + String(new Date(task.due_date).getMonth() + 1).padStart(2, '0') + '-' + String(new Date(task.due_date).getDate()).padStart(2, '0');
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

                    {/* ⚡ Left-Edge Hover Cascade with +X Bubble */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="absolute left-[1px] top-[1px] bottom-[1px] flex flex-row z-20 group/cascade rounded-l-[11px] overflow-hidden shadow-[2px_0_6px_rgba(0,0,0,0.3)] bg-black">
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
                                  
                                  // 1. Keep the instant UI update
                                  setActiveTaskTags(prev => ({...prev, [task.id]: tagId})); 
                                  
                                  // 2. Reorder the array to make the clicked tag the "primary" (index 0)
                                  const currentTags = [...task.tags];
                                  const tagIndex = currentTags.indexOf(tagId);
                                  
                                  if (tagIndex > 0) {
                                    currentTags.splice(tagIndex, 1); // Remove it from its current spot
                                    currentTags.unshift(tagId);      // Add it to the beginning
                                    
                                    // 3. Save the newly ordered array to the database
                                    handleUpdateTaskDetail(task.id, 'tags', currentTags);
                                  }
                                }}
                                // ⚡ Cascade Logic: Active tag is visible. Inactive are 0-width until hovered.
                                className={`h-full flex flex-col items-center justify-center transition-all duration-300 group/tag relative cursor-pointer overflow-hidden
                                  ${isTagActive 
                                    ? `w-6 sm:w-7 z-20 border-l-[2px] sm:border-l-[3px] opacity-100 ${!isLast ? 'border-r border-gray-800/50' : ''}` 
                                    : `w-0 border-l-0 opacity-0 ${!isLast ? 'border-r-0' : ''}`
                                  } 
                                  group-hover/cascade:w-6 group-hover/cascade:sm:w-7 group-hover/cascade:opacity-100 group-hover/cascade:border-l-[2px] group-hover/cascade:sm:border-l-[3px]
                                  ${!isLast ? 'group-hover/cascade:border-r group-hover/cascade:border-gray-800/50' : ''} 
                                `}
                                style={{ 
                                  backgroundColor: isTagActive ? '#111111' : '#000000', 
                                  borderLeftColor: isTagActive ? tColor : `${tColor}80`,
                                  boxShadow: isTagActive ? `0 0 15px ${tColor}40, inset 0 0 8px rgba(0,0,0,0.4)` : 'inset -2px 0 5px rgba(0,0,0,0.5)',
                                }}
                              >
                              
                              {/* +X Badge Bubble (Only on Active Tag, fades out on hover) */}
                              {isTagActive && extraCount > 0 && (
                                <div className="absolute top-2 w-4 h-4 rounded-full bg-black border flex items-center justify-center shadow-[0_0_8px_rgba(0,0,0,0.8)] z-30 transition-opacity duration-300 group-hover/cascade:opacity-0"
                                     style={{ borderColor: tColor, color: tColor }}>
                                  <span className="text-[8px] font-bold font-mono leading-none mt-[1px]">+{extraCount}</span>
                                </div>
                              )}

                              {/* Vertical text */}
                              <div className={`flex items-center justify-center w-full h-full transition-all duration-300 ${isTagActive || task.tags.length === 1 ? 'opacity-100' : 'opacity-0 group-hover/cascade:opacity-100'} ${isTagActive && extraCount > 0 ? 'pt-8 group-hover/cascade:pt-0' : ''}`}>
                                <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] whitespace-nowrap" style={{ color: tColor, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
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
            </div> {/* <-- ⚡ Closes RIGHT MAIN CONTENT */}
          </div>
          
          {/* ⚙️ Settings Modal Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full max-w-[768px] bg-gray-950 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,255,255,0.1)] flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-200">
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
      <TaskPanel isOpen={isTaskPanelOpen} onClose={() => setIsTaskPanelOpen(false)} currentWorkspaceSlug={currentWorkspaceSlug} />
      
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