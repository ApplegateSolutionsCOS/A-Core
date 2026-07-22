import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon, ActivityIcon, TaskIcon, CalendarIcon, FileIcon, RefreshIcon } from '@/components/icons/Icons';
import { WorkspaceSlug } from '@/types';
import { db } from '@/lib/dbProxy';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/contexts/AuthContext';

interface ActiveUser {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'offline';
  avatar: string | null;
}

interface ActivityStreamProps {
  workspaceSlug: WorkspaceSlug;
  activeUsers: ActiveUser[];
  onClose: () => void;
  contextView?: string; // What the user is currently looking at
  contextMiniApp?: string; // Which mini app is active
}

interface ActivityItemData {
  id: string;
  user: string;
  action: string;
  target: string;
  targetType: string;
  time: string;
  details?: string;
  workspace_id?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  workspace_id?: string;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  workspace_id?: string;
}

// Workspace-specific DarkWave color configurations
const workspaceThemes: Record<string, { 
  border: string; 
  bg: string; 
  text: string; 
  glow: string;
  headerBg: string;
}> = {
  admin: { 
    border: 'border-red-500/40', 
    bg: 'from-red-950/40 to-black', 
    text: 'text-red-400',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    headerBg: 'from-red-950/50 via-black to-red-950/30'
  },
  accounting: { 
    border: 'border-green-500/40', 
    bg: 'from-green-950/40 to-black', 
    text: 'text-green-400',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
    headerBg: 'from-green-950/50 via-black to-green-950/30'
  },
  personnel: { 
    border: 'border-fuchsia-500/40', 
    bg: 'from-fuchsia-950/40 to-black', 
    text: 'text-fuchsia-400',
    glow: 'shadow-[0_0_15px_rgba(255,0,255,0.3)]',
    headerBg: 'from-fuchsia-950/50 via-black to-fuchsia-950/30'
  },
  main: { 
    border: 'border-cyan-500/40', 
    bg: 'from-cyan-950/40 to-black', 
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_15px_rgba(0,255,255,0.3)]',
    headerBg: 'from-cyan-950/50 via-black to-cyan-950/30'
  },
  data: { 
    border: 'border-purple-500/40', 
    bg: 'from-purple-950/40 to-black', 
    text: 'text-purple-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    headerBg: 'from-purple-950/50 via-black to-purple-950/30'
  },
  security: { 
    border: 'border-orange-500/40', 
    bg: 'from-orange-950/40 to-black', 
    text: 'text-orange-400',
    glow: 'shadow-[0_0_15px_rgba(255,153,0,0.3)]',
    headerBg: 'from-orange-950/50 via-black to-orange-950/30'
  },
};

const ActivityStream: React.FC<ActivityStreamProps> = ({ 
  workspaceSlug, 
  activeUsers, 
  onClose,
  contextView,
  contextMiniApp 
}) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItemData[]>([]);
  const [workspaceTasks, setWorkspaceTasks] = useState<Task[]>([]);
  const [workspaceEvents, setWorkspaceEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'tasks' | 'events'>('activity');
  
  const theme = workspaceThemes[workspaceSlug] || workspaceThemes.main;
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';

  // Fetch workspace-specific tasks
  const fetchWorkspaceTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspaceSlug)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching workspace tasks:', error);
        return;
      }

      setWorkspaceTasks(data || []);
    } catch (err) {
      console.error('Error fetching workspace tasks:', err);
    }
  }, [workspaceSlug]);

  // Fetch workspace-specific events
  const fetchWorkspaceEvents = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await db
        .from('calendar_events')
        .select('*')
        .eq('workspace_id', workspaceSlug)
        .gte('start_time', today.toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching workspace events:', error);
        setWorkspaceEvents([]);
        return;
      }

      setWorkspaceEvents(data || []);
    } catch (err) {
      console.error('Error fetching workspace events:', err);
      setWorkspaceEvents([]);
    }
  }, [workspaceSlug]);


  // Fetch activities from database
  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Use mock data if fetch fails
        setActivities(getMockActivities(workspaceSlug, contextMiniApp));
        return;
      }

      if (data && data.length > 0) {
        setActivities(data.map(a => ({
          id: a.id,
          user: a.user_name,
          action: a.action,
          target: a.target,
          targetType: a.target_type,
          time: formatTime(a.created_at),
          details: a.details,
          workspace_id: workspaceSlug
        })));
      } else {
        setActivities(getMockActivities(workspaceSlug, contextMiniApp));
      }
    } catch (err) {
      setActivities(getMockActivities(workspaceSlug, contextMiniApp));
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, contextMiniApp]);

  useEffect(() => {
    fetchActivities();
    fetchWorkspaceTasks();
    fetchWorkspaceEvents();
  }, [fetchActivities, fetchWorkspaceTasks, fetchWorkspaceEvents]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-green-400';
      case 'updated': return 'text-blue-400';
      case 'deleted': return 'text-red-400';
      case 'completed': return 'text-cyan-400';
      case 'approved': return 'text-emerald-400';
      case 'commented on': return 'text-purple-400';
      case 'assigned': return 'text-orange-400';
      case 'uploaded': return 'text-indigo-400';
      default: return 'text-slate-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      case 'high': return 'bg-orange-500 shadow-[0_0_8px_rgba(255,153,0,0.5)]';
      case 'medium': return 'bg-cyan-500 shadow-[0_0_8px_rgba(0,255,255,0.5)]';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-black border-l ${theme.border} ${theme.glow} animate-slide-in-right overflow-hidden flex flex-col`}>
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} pointer-events-none`} />
        <div className="absolute inset-0 hex-pattern opacity-10 pointer-events-none" />
        
        {/* Header */}
        <div className={`relative flex items-center justify-between p-4 border-b ${theme.border} bg-gradient-to-r ${theme.headerBg} flex-shrink-0`}>
          <h2 className="text-lg font-mono font-bold text-white flex items-center gap-2">
            <ActivityIcon size={20} className={theme.text} />
            <span className={theme.text}>{workspaceSlug.charAt(0).toUpperCase() + workspaceSlug.slice(1)}</span> Activity
          </h2>
          <button
            onClick={onClose}
            className={`p-2 text-gray-400 hover:${theme.text} hover:bg-gray-800/50 rounded-lg transition-colors`}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Context Banner */}
        {contextMiniApp && (
          <div className={`relative px-4 py-2 border-b ${theme.border} bg-black/50`}>
            <p className="text-xs text-gray-500 font-mono">
              Viewing activity for: <span className={theme.text}>{contextMiniApp}</span>
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className={`relative flex border-b ${theme.border}`}>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-3 text-sm font-mono transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'activity' 
                ? `${theme.text} border-b-2 ${theme.border.replace('/40', '')} bg-black/30` 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ActivityIcon size={16} />
            Activity
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-3 text-sm font-mono transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'tasks' 
                ? `${theme.text} border-b-2 ${theme.border.replace('/40', '')} bg-black/30` 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <TaskIcon size={16} />
            Tasks
            {workspaceTasks.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${theme.text} bg-black/50`}>
                {workspaceTasks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-3 text-sm font-mono transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'events' 
                ? `${theme.text} border-b-2 ${theme.border.replace('/40', '')} bg-black/30` 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <CalendarIcon size={16} />
            Events
            {workspaceEvents.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${theme.text} bg-black/50`}>
                {workspaceEvents.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Users */}
        <div className={`relative p-4 border-b ${theme.border} flex-shrink-0`}>
          <h3 className="text-sm font-mono font-medium text-gray-400 mb-3">Active in Workspace</h3>
          <div className="flex flex-wrap gap-2">
            {activeUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center gap-2 px-3 py-1.5 bg-black/50 border ${theme.border} rounded-full`}
              >
                <div className="relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium ${
                    user.status === 'active' 
                      ? `bg-gradient-to-br ${theme.bg} ${theme.text}` 
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${
                    user.status === 'active' ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.5)]' : 'bg-yellow-400'
                  }`} />
                </div>
                <span className="text-sm text-gray-300 font-mono">{user.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="relative flex-1 overflow-y-auto p-4 darkwave-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className={`w-8 h-8 border-2 border-gray-700 border-t-current rounded-full animate-spin ${theme.text}`} />
            </div>
          ) : activeTab === 'activity' ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="relative pl-6">
                  <div className={`absolute left-2 top-6 bottom-0 w-px ${theme.border}`} />
                  <div className={`absolute left-0 top-2 w-4 h-4 rounded-full bg-black border-2 ${theme.border} flex items-center justify-center`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${getActionColor(activity.action).replace('text-', 'bg-')}`} />
                  </div>

                  <div className={`bg-black/50 border ${theme.border} rounded-lg p-3 hover:bg-black/70 transition-colors`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-mono">
                          <span className="text-white font-medium">{activity.user}</span>
                          {' '}
                          <span className={getActionColor(activity.action)}>{activity.action}</span>
                          {' '}
                          <span className="text-gray-300">{activity.target}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">
                          in {activity.targetType}
                        </p>
                        {activity.details && (
                          <p className="text-xs text-gray-400 mt-1 italic font-mono">
                            "{activity.details}"
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap font-mono">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'tasks' ? (
            <div className="space-y-3">
              {workspaceTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-sm">
                  No tasks in this workspace yet
                </div>
              ) : (
                workspaceTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 bg-black/50 border ${theme.border} rounded-lg hover:bg-black/70 transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${getPriorityColor(task.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-white">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-mono ${
                            task.status === 'completed' ? 'text-green-400' :
                            task.status === 'in_progress' ? 'text-cyan-400' : 'text-yellow-400'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.due_date && (
                            <>
                              <span className="text-xs text-gray-700">•</span>
                              <span className="text-xs text-gray-500 font-mono">
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {workspaceEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-sm">
                  No upcoming events in this workspace
                </div>
              ) : (
                workspaceEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 bg-black/50 border ${theme.border} rounded-lg hover:bg-black/70 transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      <CalendarIcon size={16} className={theme.text} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-white">{event.title}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">
                          {new Date(event.start_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`relative p-4 border-t ${theme.border} flex-shrink-0`}>
          <button 
            onClick={() => {
              fetchActivities();
              fetchWorkspaceTasks();
              fetchWorkspaceEvents();
            }}
            className={`w-full py-2 text-sm ${theme.text} hover:opacity-80 transition-colors font-mono flex items-center justify-center gap-2`}
          >
            <RefreshIcon size={16} />
            Refresh Activity
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Mock activities based on workspace and context
function getMockActivities(workspaceSlug: string, contextMiniApp?: string): ActivityItemData[] {
  const baseActivities: ActivityItemData[] = [
    { id: '1', user: 'John Doe', action: 'created', target: 'New Record', targetType: contextMiniApp || 'Records', time: '2 min ago' },
    { id: '2', user: 'Jane Smith', action: 'updated', target: 'Q4 Report', targetType: contextMiniApp || 'Documents', time: '5 min ago', details: 'Changed status to Approved' },
    { id: '3', user: 'Mike Johnson', action: 'completed', target: 'Review Task', targetType: 'Tasks', time: '12 min ago' },
    { id: '4', user: 'Sarah Wilson', action: 'commented on', target: 'Project Update', targetType: 'Projects', time: '18 min ago', details: 'Great progress!' },
    { id: '5', user: 'Tom Brown', action: 'uploaded', target: 'New Document', targetType: 'Documents', time: '25 min ago' },
  ];

  return baseActivities.map(a => ({ ...a, workspace_id: workspaceSlug }));
}

// Add RefreshIcon if not in Icons
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export default ActivityStream;
