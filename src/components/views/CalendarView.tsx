import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, CalendarIcon, CloseIcon, TrashIcon, UserIcon } from '@/components/icons/Icons';

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
      autoFocus: true, value: tempVal, onChange: (e: any) => setTempVal(e.target.value),
      onBlur: finishEdit, onClick: (e: any) => e.stopPropagation(),
      className: `bg-black border border-cyan-500/80 text-white rounded px-2 py-1 outline-none shadow-[0_0_10px_rgba(0,255,255,0.3)] w-full min-w-[60px] ${inputClassName}`,
      placeholder: placeholder
    };
    if (multiline) return <textarea {...sharedProps} rows={3} onKeyDown={(e) => { if (e.key === 'Escape') { setTempVal(value); setIsEditing(false); } }} />;
    return <input {...sharedProps} onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(); if (e.key === 'Escape') { setTempVal(value); setIsEditing(false); } }} />;
  }

  return (
    <span onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={`cursor-pointer hover:bg-white/10 hover:ring-1 hover:ring-white/30 rounded transition-all inline-block px-1 min-h-[20px] min-w-[20px] ${multiline ? 'whitespace-pre-wrap block w-full' : ''} ${className}`} title="Click to edit">
      {value || <span className="opacity-50 italic">{placeholder}</span>}
    </span>
  );
};

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: 'meeting' | 'task' | 'reminder' | 'event';
  workspace?: string;
  status?: string;
}

interface CalendarViewProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

// --- Event Viewer Modal ---
interface EventViewerModalProps {
  eventId: string;
  onClose: () => void;
}

const EventViewerModal: React.FC<EventViewerModalProps> = ({ eventId, onClose }) => {
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      const { data } = await supabase.schema('app_private').from('calendar_events').select('*').eq('id', eventId).single();
      setEvent(data);
      setLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  const handleUpdate = async (field: string, value: any) => {
    setEvent((prev: any) => ({ ...prev, [field]: value }));
    await supabase.schema('app_private').from('calendar_events').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', eventId);
    window.dispatchEvent(new CustomEvent('refreshCalendar'));
  };

  const handleDelete = async () => {
    await supabase.schema('app_private').from('calendar_events').delete().eq('id', eventId);
    window.dispatchEvent(new CustomEvent('refreshCalendar'));
    onClose();
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
  
  if (!event) return null;

  const eventDate = event.start_time ? new Date(event.start_time) : null;
  let dateString = '';
  let timeString = '';
  if (eventDate && !isNaN(eventDate.getTime())) {
    dateString = eventDate.getFullYear() + '-' + String(eventDate.getMonth() + 1).padStart(2, '0') + '-' + String(eventDate.getDate()).padStart(2, '0');
    timeString = String(eventDate.getHours()).padStart(2, '0') + ':' + String(eventDate.getMinutes()).padStart(2, '0');
  }

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-[201] flex flex-col pointer-events-none animate-in fade-in zoom-in-95 duration-200" style={{ top: 'calc(2vh + 60px)', left: '2vw', right: '2vw', bottom: '90px' }}>
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto bg-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl pointer-events-auto border-green-500/40 shadow-[0_0_60px_rgba(34,197,94,0.15)]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-black/40 flex-shrink-0 border-green-500/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg bg-gradient-to-br from-green-500/15 to-black/80 border-green-500/50">
                <CalendarIcon size={20} className="text-green-400" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-mono font-bold text-white leading-tight">Event Details</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5 uppercase tracking-widest">ID: {event.id.substring(0,8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-all hover:bg-red-500/10" title="Delete Event"><TrashIcon size={20} /></button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/5"><CloseIcon size={24} /></button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-6 sm:pt-8 darkwave-scrollbar bg-black/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Left Col (Main content) */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Event Title</label>
                  <div className="text-lg sm:text-xl text-white font-mono font-bold w-full bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3 min-h-[54px] flex items-center shadow-inner">
                    <InlineEdit value={event.title} onSave={(val) => handleUpdate('title', val)} placeholder="Event Title..." inputClassName="w-full text-lg sm:text-xl font-bold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Description</label>
                  <div className="text-sm text-gray-300 font-mono w-full bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-4 min-h-[200px] whitespace-pre-wrap shadow-inner">
                    <InlineEdit value={event.description || ''} onSave={(val) => handleUpdate('description', val)} placeholder="Add event description or agenda..." multiline inputClassName="w-full text-sm min-h-[160px]" />
                  </div>
                </div>
              </div>

              {/* Right Col (Metadata) */}
              <div className="space-y-6 bg-gray-900/30 border border-gray-800 rounded-xl p-4 sm:p-6 shadow-inner h-fit">
                
                {/* ⚡ FIX: Removed Event Type Dropdown until 'event_type' is added to the database schema */}
                
                <div>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-2 uppercase tracking-wider">Date & Time</label>
                  <input type="date" value={dateString} onChange={(e) => {
                     const newDateStr = e.target.value;
                     if (newDateStr) {
                       const d = new Date(`${newDateStr}T${timeString || '09:00'}`);
                       if (!isNaN(d.getTime())) handleUpdate('start_time', d.toISOString());
                     }
                  }} className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer mb-2 [color-scheme:dark]" />
                  
                  {!event.all_day && (
                    <input type="time" value={timeString} onChange={(e) => {
                      const newTimeStr = e.target.value;
                      if (dateString) {
                        const d = new Date(`${dateString}T${newTimeStr || '09:00'}`);
                        if (!isNaN(d.getTime())) handleUpdate('start_time', d.toISOString());
                      }
                    }} className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none hover:border-gray-700 transition-colors cursor-pointer [color-scheme:dark]" />
                  )}
                  
                  <label className="flex items-center gap-2 mt-3 cursor-pointer group w-fit">
                    <input type="checkbox" checked={event.all_day} onChange={(e) => handleUpdate('all_day', e.target.checked)} className="rounded border-gray-700 bg-black text-green-500 focus:ring-green-500/50 w-4 h-4 cursor-pointer" />
                    <span className="text-sm text-gray-400 font-mono group-hover:text-white transition-colors">All Day Event</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Location</label>
                  <div className="w-full bg-black/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm">
                    <InlineEdit value={event.location || ''} onSave={(val) => handleUpdate('location', val)} placeholder="Zoom link or room..." inputClassName="w-full text-sm" />
                  </div>
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

const CalendarView: React.FC<CalendarViewProps> = ({ isOpen, onClose, onNavigateToTask }) => {
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

  const userPrefKey = userNavColors['calendar'];
  const themeColor = userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#c4b5fd';
  const themeRgb = userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '196,181,253';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTasks, setShowTasks] = useState(() => localStorage.getItem('acore_cal_show_tasks') !== 'false');
  const [viewingEventId, setViewingEventId] = useState<string | null>(null);

  // ⚡ Fetch both Tasks AND Calendar Events
  const fetchEvents = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      // 1. Fetch Tasks
      const { data: tasks } = await supabase.schema('app_private')
        .from('tasks')
        .select('*')
        .eq('show_on_calendar', true)
        .not('due_date', 'is', null)
        .or(`assigned_to.eq.${currentUserId},created_by.eq.${currentUserId}`);

      const taskEvents: CalendarEvent[] = (tasks || []).map(t => {
        const d = new Date(t.due_date);
        return {
          id: t.id, title: t.title, date: d,
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'task', workspace: t.app_name || 'General', status: t.status
        };
      });

      // 2. Fetch standard Calendar Events
      const { data: calEvents } = await supabase.schema('app_private').from('calendar_events')
        .select('*')
        .eq('created_by', currentUserId);

      const standardEvents: CalendarEvent[] = (calEvents || []).map(e => {
        const d = new Date(e.start_time);
        return {
          id: e.id, title: e.title, date: d,
          time: e.all_day ? 'All Day' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: e.event_type as any, workspace: 'General', status: e.status
        };
      });

      setEvents([...taskEvents, ...standardEvents]);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    fetchEvents();

    // ⚡ Hook up Real-Time Synchronization for both tables
    const taskSub = supabase.channel('calendar_tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'app_private', table: 'tasks' }, fetchEvents)
      .subscribe();

    const calSub = supabase.channel('calendar_events_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchEvents)
      .subscribe();

    window.addEventListener('refreshCalendar', fetchEvents);
    window.addEventListener('refreshTasks', fetchEvents);

    return () => {
      supabase.removeChannel(taskSub);
      supabase.removeChannel(calSub);
      window.removeEventListener('refreshCalendar', fetchEvents);
      window.removeEventListener('refreshTasks', fetchEvents);
    };
  }, [isOpen, currentUserId, fetchEvents]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const displayEvents = events.filter(e => showTasks || e.type !== 'task');

  const getEventsForDate = (date: Date) => {
    return displayEvents.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-cyan-500/80 border-cyan-400/50';
      case 'task': return 'bg-orange-500/80 border-orange-400/50';
      case 'reminder': return 'bg-fuchsia-500/80 border-fuchsia-400/50';
      case 'event': return 'bg-green-500/80 border-green-400/50';
      default: return 'bg-gray-500/80 border-gray-400/50';
    }
  };

  const getEventTypeDot = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.6)]';
      case 'task': return 'bg-orange-400 shadow-[0_0_8px_rgba(255,153,0,0.6)]';
      case 'reminder': return 'bg-fuchsia-400 shadow-[0_0_8px_rgba(255,0,255,0.6)]';
      case 'event': return 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
      default: return 'bg-gray-400';
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 md:h-32 bg-black/50 border border-gray-900" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-24 md:h-32 p-2 text-left border transition-all ${
            isSelected 
              ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
              : isToday 
                ? 'bg-cyan-950/30 border-cyan-500/30' 
                : 'bg-black/50 border-gray-900 hover:bg-gray-900/50 hover:border-gray-800'
          }`}
        >
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-mono font-medium ${
            isToday 
              ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,255,255,0.5)]' 
              : isSelected 
                ? 'text-cyan-400' 
                : 'text-gray-400'
          }`}>
            {day}
          </span>
          <div className="mt-1 space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className={`text-xs px-1.5 py-0.5 rounded border truncate text-white font-mono ${getEventTypeColor(event.type)}`}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 px-1 font-mono">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </button>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const now = new Date().getTime();
  const upcomingEvents = displayEvents
    .filter(e => {
      // Exclude past events and completed tasks
      if (e.date.getTime() < now) return false;
      if (e.type === 'task' && e.status === 'completed') return false;
      return true;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" id="calendar-view-modal">
      <style>{`
        #calendar-view-modal .border-cyan-500\\/30 { border-color: rgba(${themeRgb}, 0.3) !important; }
        #calendar-view-modal .border-cyan-500\\/20 { border-color: rgba(${themeRgb}, 0.2) !important; }
        #calendar-view-modal .border-cyan-500\\/40 { border-color: rgba(${themeRgb}, 0.4) !important; }
        #calendar-view-modal .border-cyan-500\\/50 { border-color: rgba(${themeRgb}, 0.5) !important; }
        #calendar-view-modal .bg-cyan-500\\/10 { background-color: rgba(${themeRgb}, 0.1) !important; }
        #calendar-view-modal .bg-cyan-500\\/20 { background-color: rgba(${themeRgb}, 0.2) !important; }
        #calendar-view-modal .hover\\:bg-cyan-500\\/10:hover { background-color: rgba(${themeRgb}, 0.1) !important; }
        #calendar-view-modal .hover\\:bg-cyan-500\\/20:hover { background-color: rgba(${themeRgb}, 0.2) !important; }
        #calendar-view-modal .hover\\:border-cyan-500\\/30:hover { border-color: rgba(${themeRgb}, 0.3) !important; }
        #calendar-view-modal .hover\\:border-cyan-400\\/60:hover { border-color: rgba(${themeRgb}, 0.6) !important; }
        #calendar-view-modal .hover\\:text-cyan-400:hover { color: ${themeColor} !important; }
        #calendar-view-modal .text-cyan-400 { color: ${themeColor} !important; }
        #calendar-view-modal .bg-cyan-500 { background-color: ${themeColor} !important; }
        #calendar-view-modal .from-cyan-950\\/10 { --tw-gradient-from: rgba(${themeRgb}, 0.1) var(--tw-gradient-from-position); }
        #calendar-view-modal .via-cyan-950\\/10 { --tw-gradient-via: rgba(${themeRgb}, 0.1) var(--tw-gradient-via-position); }
        #calendar-view-modal .shadow-\\[0_0_50px_rgba\\(0\\,255\\,255\\,0\\.1\\)\\] { box-shadow: 0 0 50px rgba(${themeRgb}, 0.1) !important; }
        #calendar-view-modal .shadow-\\[0_0_30px_rgba\\(0\\,255\\,255\\,0\\.05\\)\\] { box-shadow: 0 0 30px rgba(${themeRgb}, 0.05) !important; }
        #calendar-view-modal .shadow-\\[0_0_15px_rgba\\(0\\,255\\,255\\,0\\.15\\)\\] { box-shadow: 0 0 15px rgba(${themeRgb}, 0.15) !important; }
        #calendar-view-modal .shadow-\\[0_0_15px_rgba\\(0\\,255\\,255\\,0\\.1\\)\\] { box-shadow: 0 0 15px rgba(${themeRgb}, 0.1) !important; }
        #calendar-view-modal .shadow-\\[0_0_10px_rgba\\(0\\,255\\,255\\,0\\.5\\)\\] { box-shadow: 0 0 10px rgba(${themeRgb}, 0.5) !important; }
        #calendar-view-modal .drop-shadow-\\[0_0_6px_rgba\\(0\\,255\\,255\\,0\\.6\\)\\] { filter: drop-shadow(0 0 6px rgba(${themeRgb}, 0.6)) !important; }
      `}</style>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-7xl h-full max-h-[95vh] bg-black/90 backdrop-blur-2xl border rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
           style={{ borderColor: `rgba(${themeRgb}, 0.3)`, boxShadow: `0 0 50px rgba(${themeRgb}, 0.1)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom right, rgba(${themeRgb}, 0.1), transparent, rgba(232,121,249,0.1))` }} />
        <div className="absolute inset-0 hex-pattern opacity-5 pointer-events-none" />
      
        {/* Modal Header */}
        <div className="relative z-20 flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-6 border-b border-gray-800/50 bg-black/40 flex-shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-mono tracking-wide">
              <span style={{ color: themeColor, textShadow: `0 0 10px rgba(${themeRgb}, 0.8), 0 0 20px rgba(${themeRgb}, 0.4)` }}>CALENDAR</span>
            </h1>
            <p className="text-gray-500 mt-1 font-mono text-sm">Manage your schedule and events</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gray-900/80 border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-gray-700 transition-all text-sm font-mono"
            >
              Today
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono"
                    style={{ backgroundColor: `rgba(${themeRgb}, 0.1)`, borderColor: `rgba(${themeRgb}, 0.4)`, color: themeColor, boxShadow: `0 0 15px rgba(${themeRgb}, 0.15)`, borderWidth: '1px' }}>
              <PlusIcon size={18} className="drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
              <span className="hidden sm:inline">Add Event</span>
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-black/50 border border-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              <CloseIcon size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 no-scrollbar">
          <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3 bg-black/80 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.05)] relative">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/40 rounded-tl z-10" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/40 rounded-tr z-10" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/40 rounded-bl z-10" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/40 rounded-br z-10" />
            
            {/* Month Navigation */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-gradient-to-r from-black via-cyan-950/10 to-black">
              <button
                onClick={prevMonth}
                className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all"
              >
                <ChevronLeftIcon size={20} />
              </button>
              <h2 className="text-lg font-mono font-semibold text-white tracking-wider uppercase">{getMonthName(currentDate)}</h2>
              <button
                onClick={nextMonth}
                className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/30 transition-all"
              >
                <ChevronRightIcon size={20} />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-mono font-medium text-gray-500 bg-gray-900/50 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {renderCalendarDays()}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            <div className="bg-black/80 border border-cyan-500/20 rounded-xl p-4 shadow-[0_0_30px_rgba(0,255,255,0.05)] relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/40 rounded-tl" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/40 rounded-tr" />
              
              <h3 className="text-lg font-mono font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarIcon size={20} className="text-cyan-400 drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
                {selectedDate 
                  ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                  : 'Select a date'
                }
              </h3>
              
              {selectedDate ? (
                selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          if (event.type === 'task' && onNavigateToTask) {
                            onNavigateToTask(event.id);
                          } else if (event.type !== 'task') {
                            setViewingEventId(event.id);
                          }
                        }}
                        className={`p-3 bg-gray-900/50 border border-gray-800 rounded-lg transition-colors ${event.type === 'task' ? 'cursor-pointer hover:bg-orange-500/10 hover:border-orange-500/30' : 'hover:bg-gray-900/80 hover:border-gray-700'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${getEventTypeDot(event.type)}`} />
                          <span className="text-sm font-mono font-medium text-white">{event.title}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                          <span>{event.time}</span>
                          {event.workspace && (
                            <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded">{event.workspace}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm text-center py-4 font-mono">No events scheduled</p>
                )
              ) : (
                <p className="text-gray-600 text-sm text-center py-4 font-mono">Click a date to view events</p>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="bg-black/80 border border-cyan-500/20 rounded-xl p-4 shadow-[0_0_30px_rgba(0,255,255,0.05)] relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/40 rounded-tl" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/40 rounded-tr" />
              
              <h3 className="text-lg font-mono font-semibold text-white mb-4">
                <span className="neon-text-cyan">UPCOMING</span>
              </h3>
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? <p className="text-gray-500 font-mono text-sm">No upcoming events.</p> : upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      if (event.type === 'task' && onNavigateToTask) {
                        onNavigateToTask(event.id);
                      } else if (event.type !== 'task') {
                        setViewingEventId(event.id);
                      }
                    }}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${event.type === 'task' ? 'cursor-pointer hover:bg-orange-500/10' : 'hover:bg-gray-900/50'}`}
                  >
                    <div className={`w-1 h-10 rounded-full ${getEventTypeDot(event.type)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium text-white truncate">{event.title}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-black/80 border border-cyan-500/20 rounded-xl p-4 shadow-[0_0_30px_rgba(0,255,255,0.05)] relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/40 rounded-tl" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/40 rounded-tr" />
              
              <h3 className="text-sm font-mono font-medium text-gray-500 mb-3 uppercase tracking-wider">Event Types</h3>
              <div className="space-y-2">
                {[
                  { type: 'meeting', label: 'Meeting', color: 'cyan' },
                  { type: 'task', label: 'Task', color: 'orange' },
                  { type: 'event', label: 'Event', color: 'green' },
                  { type: 'reminder', label: 'Reminder', color: 'fuchsia' },
                ].map((item) => (
                  <div key={item.type} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${getEventTypeDot(item.type)}`} />
                    <span className="text-sm text-gray-400 font-mono">{item.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={showTasks} onChange={(e) => { setShowTasks(e.target.checked); localStorage.setItem('acore_cal_show_tasks', String(e.target.checked)); }} className="rounded border-gray-700 bg-black text-cyan-500 focus:ring-cyan-500/50 w-4 h-4 cursor-pointer" />
                  <span className="text-sm text-gray-400 font-mono group-hover:text-white transition-colors">Show Tasks</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
     </div>

     {/* ⚡ Render the standalone event modal */}
     {viewingEventId && (
       <EventViewerModal eventId={viewingEventId} onClose={() => setViewingEventId(null)} />
     )}
    </div>
  );
};

export default CalendarView;
