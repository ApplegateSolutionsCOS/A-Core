import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import { 
  SearchIcon, PlusIcon, MessageIcon, ChevronRightIcon, CloseIcon 
} from '@/components/icons/Icons';

// Inline SVG icons (matching the Panel)
const SendIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>);
const VideoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>);
const PhoneIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>);
const PaperclipIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>);

interface Contact { 
  id: string; 
  name: string; 
  initials: string; 
  status: 'online' | 'away' | 'offline'; 
  lastMessage: string; 
  time: string; 
  lastMessageTime: Date | null; 
  unread: number; 
}

interface Message { 
  id: string; 
  senderId: string; 
  text: string; 
  time: string; 
  isMe: boolean; 
  type?: 'text' | 'video' | 'file'; 
}

interface MessagesViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspaceSlug?: string | null;
}

const COLOR_PALETTE: Record<string, { color: string; rgb: string }> = {
  // Reds & Pinks
  red: { color: '#ef4444', rgb: '239,68,68' }, ruby: { color: '#e11d48', rgb: '225,29,72' }, raspberry: { color: '#e83f6f', rgb: '232,63,111' }, coral: { color: '#fb7185', rgb: '251,113,133' }, melon: { color: '#fca5a5', rgb: '252,165,165' }, pink: { color: '#ec4899', rgb: '236,72,153' }, fuchsia: { color: '#d946ef', rgb: '217,70,239' }, magenta: { color: '#ff00ff', rgb: '255,0,255' },
  // Purples & Blues
  lilac: { color: '#d8b4fe', rgb: '216,180,254' }, lavender: { color: '#c084fc', rgb: '192,132,252' }, violet: { color: '#8b5cf6', rgb: '139,92,246' }, purple: { color: '#a855f7', rgb: '168,85,247' }, indigo: { color: '#6366f1', rgb: '99,102,241' }, electric: { color: '#818cf8', rgb: '129,140,248' }, blue: { color: '#3b82f6', rgb: '59,130,246' }, azure: { color: '#007fff', rgb: '0,127,255' },
  // Cyans & Greens
  sky: { color: '#0ea5e9', rgb: '14,165,233' }, cyan: { color: '#00ffff', rgb: '0,255,255' }, teal: { color: '#14b8a6', rgb: '20,184,166' }, mint: { color: '#34d399', rgb: '52,211,153' }, emerald: { color: '#10b981', rgb: '16,185,129' }, green: { color: '#22c55e', rgb: '34,197,94' }, lime: { color: '#84cc16', rgb: '132,204,22' }, chartreuse: { color: '#bfff00', rgb: '191,255,0' },
  // Yellows & Oranges
  yellow: { color: '#eab308', rgb: '234,179,8' }, sunflower: { color: '#ffc300', rgb: '255,195,0' }, gold: { color: '#fbbf24', rgb: '251,191,36' }, amber: { color: '#f59e0b', rgb: '245,158,11' }, peach: { color: '#fb923c', rgb: '251,146,60' }, orange: { color: '#ff9900', rgb: '255,153,0' }, tangerine: { color: '#f97316', rgb: '249,115,22' },
  // Neutrals
  zinc: { color: '#a1a1aa', rgb: '161,161,170' }, slate: { color: '#94a3b8', rgb: '148,163,184' }, silver: { color: '#d1d5db', rgb: '209,213,219' }, platinum: { color: '#e5e7eb', rgb: '229,231,235' }, white: { color: '#ffffff', rgb: '255,255,255' },
};

const MessagesView: React.FC<MessagesViewProps> = ({ isOpen, onClose, currentWorkspaceSlug }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || (user as any)?.uid;

  const { getColor } = useWorkspaceColor();
  
  // ⚡ THE REAL FIX: Inspect the browser's URL directly to find the workspace context!
  // This guarantees we always know if we are inside a workspace, even if Context is missing.
  const getSlugFromUrl = () => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    
    // ⚡ FIX: Look for the actual '/workspace/' path used by your router
    if (path.startsWith('/workspace/')) {
       const parts = path.split('/');
       if (parts.length > 2) return parts[2]; // e.g. /workspace/admin
    }
    
    // Check if we are on the main dashboard
    if (path === '/dashboard' || path === '/app' || path === '/') {
        return null;
    }
    
    return null;
  };

  const currentWsSlug = currentWorkspaceSlug || getSlugFromUrl();
  const ac = currentWsSlug ? getColor(currentWsSlug) : null;

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

  const userPrefKey = userNavColors['messages'];
  
  // ⚡ THE FIX: Use the exact same workspace-first inheritance logic as LeftSlidePanel
  const panelAccentColor = (currentWsSlug && ac) 
    ? ac.primary 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].color : '#3b82f6');

  const panelAccentRGB = (currentWsSlug && ac) 
    ? ac.rgb 
    : (userPrefKey && COLOR_PALETTE[userPrefKey] ? COLOR_PALETTE[userPrefKey].rgb : '59,130,246');

  // DB States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentUserOrg, setCurrentUserOrg] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<string>('Loading contacts...');

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const UPLOAD_STAGES = ['Validating', 'Hashing', 'Q-CORE Scanning', 'Uploading', 'Complete'];

  // 1. Fetch Contacts & Previews
  useEffect(() => {
    if (!currentUserId) return;

    const fetchContacts = async () => {
      try {
        const { data: me } = await supabase.schema('app_private')
          .from('organization_users')
          .select('organization_id')
          .eq('id', currentUserId)
          .maybeSingle();

        if (!me?.organization_id) {
          setDbStatus('No organization found.');
          return;
        }
        
        setCurrentUserOrg(me.organization_id);

        const { data: orgUsers } = await supabase.schema('app_private')
          .from('organization_users')
          .select('*')
          .eq('organization_id', me.organization_id)
          .neq('id', currentUserId); 

        if (orgUsers && orgUsers.length > 0) {
          // Fetch previews
          const { data: recentMessages } = await supabase.schema('app_private')
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
            .order('created_at', { ascending: false });

          const latestMsgMap: Record<string, any> = {};
          const unreadCountMap: Record<string, number> = {};

          recentMessages?.forEach(msg => {
            const otherId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
            if (!latestMsgMap[otherId]) latestMsgMap[otherId] = msg;
            if (msg.recipient_id === currentUserId && msg.is_read === false) {
              unreadCountMap[msg.sender_id] = (unreadCountMap[msg.sender_id] || 0) + 1;
            }
          });

          const formattedContacts: Contact[] = orgUsers.map(u => {
            const rawName = u.full_name || u.email || 'Unknown';
            const lastMsg = latestMsgMap[u.id];
            
            // Default to an empty string instead of 'Tap to message'
            let lastMessageStr = '';
            let timeStr = '';
            let lastMessageTime: Date | null = null;

            if (lastMsg) {
              const prefix = lastMsg.sender_id === currentUserId ? 'You: ' : '';
              lastMessageStr = `${prefix}${lastMsg.content}`;
              lastMessageTime = new Date(lastMsg.created_at);
              const today = new Date();
              const isToday = lastMessageTime.getDate() === today.getDate() && 
                              lastMessageTime.getMonth() === today.getMonth() && 
                              lastMessageTime.getFullYear() === today.getFullYear();
              timeStr = isToday 
                ? lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : lastMessageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }

            return {
              id: u.id,
              name: rawName,
              initials: rawName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
              status: 'offline', 
              lastMessage: lastMessageStr,
              lastMessageTime,
              time: timeStr,
              unread: unreadCountMap[u.id] || 0
            };
          });
          
          setContacts(formattedContacts);
          setDbStatus('');
        } else {
          setDbStatus(`No other users found in organization.`);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchContacts();
  }, [currentUserId]);

  // 2. Global Presence Listener
  useEffect(() => {
    if ((window as any).__onlineUserIds) {
      setOnlineUserIds((window as any).__onlineUserIds);
    }
    const handlePresenceUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) setOnlineUserIds(e.detail);
    };
    window.addEventListener('presence_update', handlePresenceUpdate);
    return () => window.removeEventListener('presence_update', handlePresenceUpdate);
  }, []);

  // 3. Chat History & Realtime Messages
  useEffect(() => {
    if (!selectedContact || !currentUserId) return;
    
    const fetchChatHistory = async () => {
      const { data: chat } = await supabase.schema('app_private')
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (chat) {
        setMessages(chat.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: m.sender_id === currentUserId,
          type: m.message_type || 'text',
          attachment: m.attachment || undefined,
          videoUrl: m.video_url || undefined
        })));
      } else {
        setMessages([]);
      }

      // Mark as read!
      await supabase.schema('app_private')
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', currentUserId)
        .eq('sender_id', selectedContact.id)
        .eq('is_read', false);

      setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, unread: 0 } : c));
    };

    fetchChatHistory();

    const messageSubscription = supabase
      .channel(`chat_view_${selectedContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'app_private', table: 'messages' }, (payload) => {
          const newDbMsg = payload.new as any;
          const isRelevant = 
            (newDbMsg.sender_id === currentUserId && newDbMsg.recipient_id === selectedContact.id) ||
            (newDbMsg.sender_id === selectedContact.id && newDbMsg.recipient_id === currentUserId);
          
          if (isRelevant) {
            setMessages((prev) => {
              if (newDbMsg.sender_id === currentUserId) return prev;
              if (prev.some(m => m.id === newDbMsg.id)) return prev;
              const incomingMsg: Message = {
                id: newDbMsg.id,
                senderId: newDbMsg.sender_id,
                text: newDbMsg.content,
                time: new Date(newDbMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: false, 
                type: newDbMsg.message_type || 'text',
                attachment: newDbMsg.attachment || undefined,
                videoUrl: newDbMsg.video_url || undefined
              };
              return [...prev, incomingMsg];
            });
            
            // Mark it as read instantly since we have the window open
            supabase.schema('app_private').from('messages').update({ is_read: true }).eq('id', newDbMsg.id).then();
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(messageSubscription); };
  }, [selectedContact, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send Message Handler
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !currentUserId || !currentUserOrg) return;
    
    const contentToSave = newMessage.trim();
    
    const tempMsg: Message = { 
      id: `m${Date.now()}`, senderId: currentUserId, text: contentToSave, 
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), isMe: true 
    };
    
    setMessages(prev => [...prev, tempMsg]); 
    setNewMessage('');

    setContacts(prev => prev.map(c => {
      if (c.id === selectedContact.id) {
        return { ...c, lastMessage: `You: ${contentToSave}`, lastMessageTime: new Date(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return c;
    }));

    await supabase.schema('app_private').from('messages').insert({
      organization_id: currentUserOrg,
      sender_id: currentUserId,
      sender_type: 'organization',
      recipient_id: selectedContact.id,
      recipient_type: 'organization',
      subject: 'Direct Message',
      content: contentToSave,
      message_type: 'text',
      is_read: false
    });
  };

  // 5. Sorting Engine
  const statusWeight = { online: 3, away: 2, offline: 1 };
  const filteredContacts = contacts
    .map(c => ({ ...c, status: onlineUserIds.includes(c.id) ? 'online' : 'offline' as Contact['status'] }))
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (statusWeight[a.status] !== statusWeight[b.status]) return statusWeight[b.status] - statusWeight[a.status];
      const timeA = a.lastMessageTime ? a.lastMessageTime.getTime() : 0;
      const timeB = b.lastMessageTime ? b.lastMessageTime.getTime() : 0;
      return timeB - timeA;
    });

  const onlineCount = filteredContacts.filter(c => c.status === 'online').length;

  const statusColor = (s: string) => {
    switch (s) {
      case 'online': return 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]';
      case 'away': return 'bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.8)]';
      default: return 'bg-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" id="messages-view-modal">
      <style>{`
        #messages-view-modal .border-blue-500\\/20 { border-color: rgba(${panelAccentRGB}, 0.2) !important; }
        #messages-view-modal .border-blue-500\\/30 { border-color: rgba(${panelAccentRGB}, 0.3) !important; }
        #messages-view-modal .border-blue-500\\/40 { border-color: rgba(${panelAccentRGB}, 0.4) !important; }
        #messages-view-modal .border-blue-500\\/50 { border-color: rgba(${panelAccentRGB}, 0.5) !important; }
        #messages-view-modal .border-l-blue-500 { border-color: ${panelAccentColor} !important; }
        #messages-view-modal .bg-blue-500\\/5 { background-color: rgba(${panelAccentRGB}, 0.05) !important; }
        #messages-view-modal .bg-blue-500\\/10 { background-color: rgba(${panelAccentRGB}, 0.1) !important; }
        #messages-view-modal .bg-blue-500\\/20 { background-color: rgba(${panelAccentRGB}, 0.2) !important; }
        #messages-view-modal .bg-blue-500\\/30 { background-color: rgba(${panelAccentRGB}, 0.3) !important; }
        #messages-view-modal .hover\\:bg-blue-500\\/10:hover { background-color: rgba(${panelAccentRGB}, 0.1) !important; }
        #messages-view-modal .hover\\:bg-blue-500\\/20:hover { background-color: rgba(${panelAccentRGB}, 0.2) !important; }
        #messages-view-modal .hover\\:bg-blue-500\\/30:hover { background-color: rgba(${panelAccentRGB}, 0.3) !important; }
        #messages-view-modal .hover\\:border-blue-400\\/60:hover { border-color: rgba(${panelAccentRGB}, 0.6) !important; }
        #messages-view-modal .hover\\:border-blue-500\\/50:hover { border-color: rgba(${panelAccentRGB}, 0.5) !important; }
        #messages-view-modal .hover\\:text-blue-400:hover { color: ${panelAccentColor} !important; }
        #messages-view-modal .text-blue-400 { color: ${panelAccentColor} !important; }
        #messages-view-modal .text-blue-300\\/70 { color: rgba(${panelAccentRGB}, 0.7) !important; }
        #messages-view-modal .from-blue-950\\/10 { --tw-gradient-from: rgba(${panelAccentRGB}, 0.1) var(--tw-gradient-from-position); }
        #messages-view-modal .from-blue-500\\/10 { --tw-gradient-from: rgba(${panelAccentRGB}, 0.1) var(--tw-gradient-from-position); }
        #messages-view-modal .from-blue-500\\/30 { --tw-gradient-from: rgba(${panelAccentRGB}, 0.3) var(--tw-gradient-from-position); }
        #messages-view-modal .via-blue-950\\/10 { --tw-gradient-via: rgba(${panelAccentRGB}, 0.1) var(--tw-gradient-via-position); }
        #messages-view-modal .focus\\:border-blue-500\\/50:focus { border-color: rgba(${panelAccentRGB}, 0.5) !important; }
        #messages-view-modal .focus\\:shadow-\\[0_0_10px_rgba\\(59\\,130\\,246\\,0\\.1\\)\\]:focus { box-shadow: 0 0 10px rgba(${panelAccentRGB}, 0.1) !important; }
        #messages-view-modal .shadow-\\[0_0_50px_rgba\\(59\\,130\\,246\\,0\\.1\\)\\] { box-shadow: 0 0 50px rgba(${panelAccentRGB}, 0.1) !important; }
        #messages-view-modal .shadow-\\[0_0_30px_rgba\\(59\\,130\\,246\\,0\\.05\\)\\] { box-shadow: 0 0 30px rgba(${panelAccentRGB}, 0.05) !important; }
        #messages-view-modal .shadow-\\[0_0_30px_rgba\\(59\\,130\\,246\\,0\\.1\\)\\] { box-shadow: 0 0 30px rgba(${panelAccentRGB}, 0.1) !important; }
        #messages-view-modal .shadow-\\[0_0_15px_rgba\\(59\\,130\\,246\\,0\\.15\\)\\] { box-shadow: 0 0 15px rgba(${panelAccentRGB}, 0.15) !important; }
        #messages-view-modal .shadow-\\[0_0_10px_rgba\\(59\\,130\\,246\\,0\\.15\\)\\] { box-shadow: 0 0 10px rgba(${panelAccentRGB}, 0.15) !important; }
      `}</style>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-[1376px] h-full max-h-[95vh] bg-black/90 backdrop-blur-2xl border rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
           style={{ borderColor: `rgba(${panelAccentRGB}, 0.3)`, boxShadow: `0 0 50px rgba(${panelAccentRGB}, 0.1)` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/10 via-transparent to-sky-950/10 pointer-events-none" />
        <div className="absolute inset-0 hex-pattern opacity-5 pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-20 flex items-center justify-between p-6 border-b border-gray-800/50 bg-black/40 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white font-mono tracking-wide mb-1">
              <span style={{ color: panelAccentColor, textShadow: `0 0 3px rgba(${panelAccentRGB},0.6), 0 0 6px rgba(${panelAccentRGB},0.4)` }}>MESSAGES</span>
            </h1>
            <p className="text-gray-500 font-mono text-xs flex items-center gap-1.5">
              {contacts.length} Contacts {onlineCount > 0 && <span className="text-green-400 font-medium">({onlineCount} online)</span>}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white bg-black/50 border border-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
        
          {/* Left Column: Contact List */}
          <div className="w-full md:w-96 flex flex-col bg-black/80 border border-blue-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.05)] flex-shrink-0">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-blue-500/40 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500/40 rounded-tr" />

            <div className="p-3 border-b border-gray-800/50 bg-black flex-shrink-0">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Search contacts..."
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-9 pr-3 py-2.5 text-white font-mono text-sm focus:outline-none transition-all focus:border-blue-500/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto darkwave-scrollbar">
            {dbStatus && contacts.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-gray-500">{dbStatus}</div>
            ) : (
              filteredContacts.map(contact => (
                <button key={contact.id} onClick={() => setSelectedContact(contact)}
                  className={`w-full flex items-center gap-3 p-4 transition-all border-b border-gray-800/30 text-left hover:bg-blue-500/10 ${selectedContact?.id === contact.id ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-mono font-bold"
                         style={{ background: `linear-gradient(to bottom right, rgba(${panelAccentRGB}, 0.2), rgba(${panelAccentRGB}, 0.05))`, borderColor: `rgba(${panelAccentRGB}, 0.3)`, color: panelAccentColor }}>
                      {contact.initials}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black ${statusColor(contact.status)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-mono font-medium truncate ${contact.unread > 0 ? 'text-white' : 'text-gray-300'}`}>{contact.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono flex-shrink-0 ml-2">{contact.time}</span>
                    </div>
                    <p className={`text-xs font-mono truncate mt-1 ${contact.unread > 0 ? 'text-blue-400 font-medium' : 'text-gray-500'}`}>{contact.lastMessage}</p>
                  </div>
                  {contact.unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-[20px] text-[10px] font-bold font-mono rounded-full flex items-center justify-center px-1"
                      style={{ backgroundColor: '#000', border: `2px solid ${panelAccentColor}`, color: panelAccentColor, boxShadow: `0 0 8px rgba(${panelAccentRGB},0.4)` }}>
                      {contact.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Thread */}
        <div className="flex-1 bg-black/80 border border-blue-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.05)] flex flex-col relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-blue-500/40 rounded-tl pointer-events-none" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500/40 rounded-tr pointer-events-none" />
          
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-blue-500/20 bg-gradient-to-r from-black via-blue-950/10 to-black flex-shrink-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono font-bold"
                       style={{ background: `linear-gradient(to bottom right, rgba(${panelAccentRGB}, 0.2), rgba(${panelAccentRGB}, 0.05))`, borderColor: `rgba(${panelAccentRGB}, 0.3)`, color: panelAccentColor }}>
                    {selectedContact.initials}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${statusColor(selectedContact.status)}`} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-base font-mono font-medium">{selectedContact.name}</p>
                  <p className="text-xs text-gray-500 font-mono capitalize">{selectedContact.status}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Video Call"><VideoIcon size={18} /></button>
                  <button className="p-2.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all" title="Voice Call"><PhoneIcon size={18} /></button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto darkwave-scrollbar p-6 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.isMe ? 'bg-blue-500/20 border border-blue-500/30 text-white' : 'bg-gray-900/80 border border-gray-800 text-gray-200'}`}>
                      {msg.type === 'video' && msg.videoUrl && <div className="mb-2"><video src={msg.videoUrl} controls className="w-full max-w-[300px] rounded-lg border border-blue-500/20" /></div>}
                      {msg.type === 'file' && msg.attachment && (
                        <div className="mb-2">
                          <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" download={msg.attachment.name} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-blue-500/20 hover:bg-black/60 transition-colors cursor-pointer group/file">
                            <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover/file:text-white transition-colors">
                              {msg.attachment.type.startsWith('image/') ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> : <PaperclipIcon size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono text-white truncate group-hover/file:underline">{msg.attachment.name}</p>
                              <p className="text-xs font-mono text-gray-500">{(msg.attachment.size / 1024 / 1024).toFixed(2)} MB • Click to download</p>
                            </div>
                          </a>
                        </div>
                      )}
                      <p className="text-sm font-mono leading-relaxed">{msg.text}</p>
                      <p className={`text-[10px] font-mono mt-2 text-right ${msg.isMe ? 'text-blue-300/70' : 'text-gray-500'}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="p-4 bg-black border-t border-blue-500/20 flex-shrink-0">
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => { if (e.target.files?.[0]) { setUploadingFile(e.target.files[0]); setShowFileUpload(true); setUploadStage(''); setUploadError(null); } e.target.value = ''; }} />
                <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                  
                  {/* File Upload Box */}
                  {showFileUpload && uploadingFile && (
                    <div className="p-3 border border-blue-500/30 bg-blue-500/5 rounded-lg flex-shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                        <PaperclipIcon size={16} className="flex-shrink-0 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-white truncate">{uploadingFile.name}</p>
                          <p className="text-[10px] font-mono text-gray-500">{(uploadingFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        {!uploadStage && <button onClick={() => { setShowFileUpload(false); setUploadingFile(null); setUploadError(null); }} className="p-1 text-gray-400 hover:text-red-400 transition-colors"><CloseIcon size={14} /></button>}
                      </div>
                      {uploadStage && (
                        <div className="mb-2">
                          <div className="flex items-center gap-0.5 mb-1">
                            {UPLOAD_STAGES.map((stage, i) => {
                              const stageIdx = UPLOAD_STAGES.indexOf(uploadStage);
                              const isDone = i < stageIdx || (uploadStage === 'Complete');
                              const isActive = stage === uploadStage && uploadStage !== 'Complete';
                              return (
                                <div key={stage} className="flex-1">
                                  <div className={`h-1 rounded-full transition-all ${isDone ? 'bg-green-500' : isActive ? 'animate-pulse' : uploadError && isActive ? 'bg-red-500' : 'bg-gray-800'}`} style={isActive && !uploadError ? { backgroundColor: panelAccentColor } : {}} />
                                  <p className={`text-[8px] font-mono mt-0.5 text-center ${isDone ? 'text-green-400' : 'text-gray-600'}`} style={isActive && !uploadError ? { color: panelAccentColor } : {}}>{stage}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {uploadError && <div className="flex items-center gap-1.5 p-1.5 bg-red-500/10 border border-red-500/30 rounded mb-2"><span className="text-[10px] font-mono text-red-400">{uploadError}</span></div>}
                      {!uploadStage && !uploadError && (
                        <button onClick={async () => {
                          if (!uploadingFile || !selectedContact) return;
                          setUploadStage('Validating'); setUploadError(null);
                          try {
                            await new Promise(r => setTimeout(r, 400)); setUploadStage('Hashing');
                            await new Promise(r => setTimeout(r, 600)); setUploadStage('Q-CORE Scanning');
                            await new Promise(r => setTimeout(r, 800)); setUploadStage('Uploading');

                            const ext = uploadingFile.name.split('.').pop();
                            const fileName = `${user?.id || 'user'}_${Date.now()}.${ext}`;
                            const { error: uploadErr } = await supabase.storage.from('message-attachments').upload(fileName, uploadingFile);
                            if (uploadErr) throw uploadErr;

                            const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
                            
                            setUploadStage('Complete');
                            const fakeScanResult = { status: 'clean', engine: 'Q-CORE Local', signatures: 4291842 };
                            const attachmentData = { name: uploadingFile.name, size: uploadingFile.size, type: uploadingFile.type, url: urlData.publicUrl, scanResult: fakeScanResult as any };
                            const msg: Message = { id: `f${Date.now()}`, senderId: 'me', text: `Sent file: ${uploadingFile.name}`, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), isMe: true, type: 'file', attachment: attachmentData };
                            setMessages(prev => [...prev, msg]);

                            if (user?.id && currentUserOrg && selectedContact) {
                              supabase.schema('app_private').from('messages').insert({
                                organization_id: currentUserOrg, sender_id: user.id, sender_type: 'organization', recipient_id: selectedContact.id, recipient_type: 'organization',
                                subject: 'File Attachment', content: `Sent file: ${uploadingFile.name}`, message_type: 'file', attachment: attachmentData, is_read: false
                              }).then();
                            }

                            setTimeout(() => { setShowFileUpload(false); setUploadingFile(null); setUploadStage(''); setUploadError(null); }, 1000);
                          } catch (err: any) {
                            setUploadError(err.message || 'File upload failed'); setUploadStage('');
                          }
                        }} className="w-full py-2 rounded-lg transition-all font-mono text-xs font-bold flex items-center justify-center gap-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30">
                          Scan & Send File
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg border bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-all" title="Attach file">
                      <PaperclipIcon size={18} />
                    </button>
                    <button className="p-2 rounded-lg border bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-all" title="Record video message">
                      <VideoIcon size={18} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full">
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={e => setNewMessage(e.target.value)} 
                      onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }} 
                      placeholder="Type a message..." 
                      className="flex-1 min-w-0 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none transition-all focus:border-blue-500/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                    />
                    <button 
                      onClick={handleSendMessage} 
                      disabled={!newMessage.trim()} 
                      className="flex-shrink-0 p-3 rounded-lg bg-blue-500/10 border border-blue-500/40 text-blue-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-500/20 hover:border-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                    >
                      <SendIcon size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                  <MessageIcon size={40} className="text-blue-500/50" />
                </div>
                <h3 className="text-xl font-mono font-medium text-white mb-2">Your Messages</h3>
                <p className="text-gray-500 text-sm font-mono max-w-xs mx-auto leading-relaxed">
                  Select a contact from the sidebar to view your conversation history or start a new chat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
     </div>
    </div>
  );
};

export default MessagesView;

// import React, { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
// import { useAuth } from '@/contexts/AuthContext';
// import { 
//   SearchIcon, 
//   PlusIcon, 
//   MessageIcon,
//   ChevronRightIcon,
//   UserIcon
// } from '@/components/icons/Icons';

// interface Message {
//   id: string;
//   senderId?: string;
//   recipientId?: string;
//   sender: string;
//   senderAvatar?: string;
//   subject: string;
//   preview: string;
//   timestamp: string;
//   isRead: boolean;
//   isStarred: boolean;
//   workspace?: string;
// }

// const MessagesView: React.FC = () => {
//   const { user } = useAuth();
//   const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'starred'>('inbox');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
//   const [messages, setMessages] = useState<Message[]>([]);

//   // NEW: Compose States
//   const [isComposing, setIsComposing] = useState(false);
//   const [contacts, setContacts] = useState<{id: string, name: string}[]>([]);
//   const [composeTo, setComposeTo] = useState('');
//   const [composeSubject, setComposeSubject] = useState('');
//   const [composeBody, setComposeBody] = useState('');
//   const [currentUserOrg, setCurrentUserOrg] = useState<string | null>(null);

//   const currentUserId = user?.id || (user as any)?.uid;

//   // Fetch messages and user mappings from Supabase
//   useEffect(() => {
//     if (!currentUserId) return;

//     const fetchMessagesData = async () => {
//       try {
//         // 1. Get the current user's organization_id securely
//         const { data: me, error: meError } = await supabase.schema('app_private')
//           .from('organization_users')
//           .select('organization_id')
//           .eq('id', currentUserId)
//           .maybeSingle();

//         if (meError || !me?.organization_id) {
//           console.error('[MessagesView] Error fetching org or missing org ID:', meError);
//           return;
//         }

//         // 2. Fetch all users in this organization for a quick lookup map (for names and avatars)
//         const { data: orgUsers } = await supabase.schema('app_private')
//           .from('organization_users')
//           .select('id, full_name, email, avatar_url')
//           .eq('organization_id', me.organization_id);

//         const usersMap: Record<string, any> = {};
//         orgUsers?.forEach(u => {
//           usersMap[u.id] = u;
//         });

//         // Add current user to map just in case
//         if (!usersMap[currentUserId]) {
//           usersMap[currentUserId] = { full_name: 'Me', email: user?.email };
//         }
        
//         // NEW: Save the user's Org ID and Co-workers for the compose dropdown
//         setCurrentUserOrg(me.organization_id);
//         if (orgUsers) {
//           setContacts(orgUsers
//             .filter(u => u.id !== currentUserId)
//             .map(u => ({ id: u.id, name: u.full_name || u.email || 'Unknown User' }))
//           );
//         }

//         // 3. Fetch messages where the user is either the sender or the recipient
//         const { data: dbMessages, error: msgError } = await supabase.schema('app_private')
//           .from('messages')
//           .select('*')
//           .or(`recipient_id.eq.${currentUserId},sender_id.eq.${currentUserId}`)
//           .order('created_at', { ascending: false });

//         if (msgError) {
//           console.error('[MessagesView] Error fetching messages:', msgError);
//           return;
//         }

//         if (dbMessages) {
//           const formattedMessages: Message[] = dbMessages.map(m => {
//             // UI FIX: If I sent the message, show the RECIPIENT'S name. 
//             // If I received the message, show the SENDER'S name.
//             const isMeSender = m.sender_id === currentUserId;
//             const targetUserId = isMeSender ? m.recipient_id : m.sender_id;
            
//             const targetUser = usersMap[targetUserId] || {};
//             const displaySenderName = targetUser.full_name || targetUser.email || 'Unknown User';

//             return {
//               id: m.id,
//               senderId: m.sender_id,
//               recipientId: m.recipient_id,
//               sender: displaySenderName,
//               senderAvatar: targetUser.avatar_url,
//               subject: m.subject || 'Direct Message',
//               preview: m.content || '',
//               timestamp: new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
//               isRead: m.is_read,
//               isStarred: false, // Default since it's not in the DB schema provided
//               workspace: 'Main' 
//             };
//           });
          
//           setMessages(formattedMessages);
//         }
//       } catch (err) {
//         console.error("[MessagesView] Failed to load messages view data:", err);
//       }
//     };

//     fetchMessagesData();
//   }, [currentUserId]);

//   const filteredMessages = messages.filter(msg => {
//     // Tab filtering based on actual sender/recipient IDs vs the current user
//     if (activeTab === 'inbox' && msg.recipientId !== currentUserId) return false;
//     if (activeTab === 'sent' && msg.senderId !== currentUserId) return false;
//     if (activeTab === 'starred' && !msg.isStarred) return false;

//     // Search query filtering
//     if (searchQuery && !msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) && 
//         !msg.sender.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
//     return true;
//   });

//   const unreadCount = messages.filter(m => !m.isRead && m.recipientId === currentUserId).length;

//   // ⚡ FIX: Mark messages as read in the DB when clicked
//   const handleSelectMessage = async (msg: Message) => {
//     setSelectedMessage(msg);
    
//     if (!msg.isRead && msg.recipientId === currentUserId) {
//       // 1. Optimistic UI update
//       setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      
//       // 2. Database update
//       await supabase.schema('app_private')
//         .from('messages')
//         .update({ is_read: true })
//         .eq('id', msg.id);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-black pt-20 pb-24 px-4">
//       {/* Background effects - blue theme */}
//       <div className="fixed inset-0 bg-gradient-to-br from-blue-950/10 via-black to-sky-950/10 pointer-events-none" />
//       <div className="fixed inset-0 hex-pattern opacity-5 pointer-events-none" />
      
//       <div className="max-w-7xl mx-auto relative z-10">
//         {/* Header */}
//         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
//           <div>
//             <h1 className="text-2xl md:text-3xl font-bold text-white font-mono tracking-wide">
//               <span style={{ color: '#3b82f6', textShadow: '0 0 3px rgba(59,130,246,0.6), 0 0 6px rgba(59,130,246,0.4)' }}>MESSAGES</span>
//             </h1>
//             <p className="text-gray-500 mt-1 font-mono text-sm">
//               {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up!'}
//             </p>
//           </div>
//           <button 
//             onClick={() => { setIsComposing(true); setSelectedMessage(null); }}
//             className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/40 text-blue-400 rounded-lg hover:bg-blue-500/20 hover:border-blue-400/60 transition-all font-mono shadow-[0_0_15px_rgba(59,130,246,0.15)]"
//           >
//             <PlusIcon size={18} className="drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
//             <span>Compose</span>
//           </button>
//         </div>

//         <div className="grid lg:grid-cols-3 gap-6">
//           {/* Message List */}
//           <div className="lg:col-span-2 bg-black/80 border border-blue-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.05)]">
//             <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-blue-500/40 rounded-tl" />
//             <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500/40 rounded-tr" />
            
//             {/* Tabs and Search */}
//             <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-black via-blue-950/10 to-black">
//               <div className="flex flex-col sm:flex-row gap-4">
//                 <div className="flex gap-2">
//                   {(['inbox', 'sent', 'starred'] as const).map((tab) => (
//                     <button
//                       key={tab}
//                       onClick={() => setActiveTab(tab)}
//                       className={`px-4 py-2 rounded-lg text-sm font-mono font-medium uppercase tracking-wider transition-all ${
//                         activeTab === tab
//                           ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
//                           : 'bg-gray-900/50 text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-700'
//                       }`}
//                     >
//                       {tab}
//                       {tab === 'inbox' && unreadCount > 0 && (
//                         <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500 text-white text-xs shadow-[0_0_8px_rgba(59,130,246,0.4)]">
//                           {unreadCount}
//                         </span>
//                       )}
//                     </button>
//                   ))}
//                 </div>
//                 <div className="flex-1">
//                   <div className="relative">
//                     <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
//                     <input
//                       type="text"
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                       placeholder="Search messages..."
//                       className="w-full bg-black/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Messages */}
//             {filteredMessages.length > 0 ? (
//               <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto darkwave-scrollbar">
//                 {filteredMessages.map((message) => (
//                   <button
//                     key={message.id}
//                     onClick={() => handleSelectMessage(message)}
//                     className={`w-full p-4 text-left hover:bg-blue-500/5 transition-colors ${
//                       !message.isRead && message.recipientId === user?.id ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
//                     } ${selectedMessage?.id === message.id ? 'bg-blue-500/10' : ''}`}
//                   >
//                     <div className="flex items-start gap-3">
//                       <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/30 to-sky-500/30 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-mono font-medium flex-shrink-0">
//                         {message.sender.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center justify-between gap-2 mb-1">
//                           <span className={`font-mono truncate ${!message.isRead && message.recipientId === user?.id ? 'text-white' : 'text-gray-400'}`}>
//                             {message.sender}
//                           </span>
//                           <span className="text-xs text-gray-600 flex-shrink-0 font-mono">{message.timestamp}</span>
//                         </div>
//                         <p className={`text-sm truncate mb-1 font-mono ${!message.isRead && message.recipientId === user?.id ? 'text-blue-400 font-medium' : 'text-gray-500'}`}>
//                           {message.subject}
//                         </p>
//                         <p className="text-xs text-gray-600 truncate font-mono">{message.preview}</p>
//                         {message.workspace && (
//                           <span className="inline-block mt-2 px-2 py-0.5 bg-gray-900/80 border border-gray-800 rounded text-xs text-gray-500 font-mono">
//                             {message.workspace}
//                           </span>
//                         )}
//                       </div>
//                       {!message.isRead && message.recipientId === user?.id && (
//                         <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
//                       )}
//                     </div>
//                   </button>
//                 ))}
//               </div>
//             ) : (
//               <div className="p-12 text-center">
//                 <div className="w-16 h-16 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-center mx-auto mb-4">
//                   <MessageIcon size={32} className="text-gray-700" />
//                 </div>
//                 <h3 className="text-lg font-mono font-medium text-white mb-2">No messages</h3>
//                 <p className="text-gray-600 text-sm font-mono">
//                   {searchQuery ? 'Try adjusting your search' : 'Your inbox is empty'}
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* Message Preview / Sidebar */}
//           <div className="bg-black/80 border border-blue-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.05)] relative">
//             <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-blue-500/40 rounded-tl" />
//             <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500/40 rounded-tr" />
//             <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-blue-500/40 rounded-bl" />
//             <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-blue-500/40 rounded-br" />
            
//             {isComposing ? (
//               <div className="h-full flex flex-col p-6">
//                 <h2 className="text-xl font-mono font-bold text-white mb-6 border-b border-blue-500/20 pb-4">New Message</h2>
//                 <div className="space-y-4 flex-1">
//                   <div>
//                     <label className="block text-xs font-mono text-gray-400 mb-1">To:</label>
//                     <select 
//                       value={composeTo} 
//                       onChange={e => setComposeTo(e.target.value)} 
//                       className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
//                     >
//                       <option value="" disabled>Select Recipient...</option>
//                       {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-xs font-mono text-gray-400 mb-1">Subject:</label>
//                     <input 
//                       type="text" 
//                       placeholder="Enter subject" 
//                       value={composeSubject} 
//                       onChange={e => setComposeSubject(e.target.value)} 
//                       className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 transition-colors" 
//                     />
//                   </div>
//                   <div className="h-full pt-2 pb-8">
//                     <label className="block text-xs font-mono text-gray-400 mb-1">Message:</label>
//                     <textarea 
//                       placeholder="Type your message here..." 
//                       value={composeBody} 
//                       onChange={e => setComposeBody(e.target.value)} 
//                       className="w-full h-full min-h-[250px] bg-black/50 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 resize-none darkwave-scrollbar transition-colors" 
//                     />
//                   </div>
//                 </div>
//                 <div className="pt-4 flex justify-end gap-3 border-t border-blue-500/20 mt-auto">
//                   <button 
//                     onClick={() => { setIsComposing(false); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }} 
//                     className="px-6 py-2.5 bg-gray-900/80 border border-gray-800 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-all text-sm font-mono"
//                   >
//                     Cancel
//                   </button>
//                   <button 
//                     onClick={async () => {
//                       if (!composeTo || !composeBody.trim() || !currentUserOrg || !currentUserId) return;
//                       await supabase.schema('app_private').from('messages').insert({
//                         organization_id: currentUserOrg,
//                         sender_id: currentUserId,
//                         sender_type: 'organization',
//                         recipient_id: composeTo,
//                         recipient_type: 'organization',
//                         subject: composeSubject || 'No Subject',
//                         content: composeBody,
//                         is_read: false
//                       });
//                       setIsComposing(false); setComposeTo(''); setComposeSubject(''); setComposeBody('');
//                       window.location.reload(); // Simple refresh to pull the new message immediately
//                     }} 
//                     disabled={!composeTo || !composeBody.trim()} 
//                     className="flex items-center gap-2 px-6 py-2.5 bg-blue-500/10 border border-blue-500/40 text-blue-400 rounded-lg hover:bg-blue-500/20 hover:border-blue-400/60 transition-all text-sm font-mono font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(59,130,246,0.15)]"
//                   >
//                     Send Message
//                   </button>
//                 </div>
//               </div>
//             ) : selectedMessage ? (
//               <div className="h-full flex flex-col">
//                 <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-black via-blue-950/10 to-black">
//                   <div className="flex items-center gap-3 mb-3">
//                     <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/30 to-sky-500/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono font-medium">
//                       {selectedMessage.sender.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
//                     </div>
//                     <div>
//                       <h3 className="font-mono font-medium text-white">{selectedMessage.sender}</h3>
//                       <p className="text-xs text-gray-600 font-mono">{selectedMessage.timestamp}</p>
//                     </div>
//                   </div>
//                   <h2 className="text-lg font-mono font-semibold text-blue-400">{selectedMessage.subject}</h2>
//                   {selectedMessage.workspace && (
//                     <span className="inline-block mt-2 px-2 py-0.5 bg-gray-900/80 border border-gray-800 rounded text-xs text-gray-500 font-mono">
//                       {selectedMessage.workspace}
//                     </span>
//                   )}
//                 </div>
//                 <div className="flex-1 p-4 overflow-y-auto darkwave-scrollbar">
//                   <p className="text-gray-400 text-sm leading-relaxed font-mono whitespace-pre-wrap">
//                     {selectedMessage.preview}
//                   </p>
//                 </div>
//                 <div className="p-4 border-t border-blue-500/20 bg-gradient-to-r from-black via-blue-950/10 to-black">
//                   <div className="flex gap-2">
//                     <button 
//                       onClick={() => { setIsComposing(true); setComposeTo(selectedMessage.senderId === currentUserId ? selectedMessage.recipientId || '' : selectedMessage.senderId || ''); setComposeSubject(`Re: ${selectedMessage.subject}`); }}
//                       className="flex-1 py-2 bg-blue-500/10 border border-blue-500/40 text-blue-400 rounded-lg hover:bg-blue-500/20 hover:border-blue-400/60 transition-all text-sm font-mono font-medium shadow-[0_0_10px_rgba(59,130,246,0.15)]"
//                     >
//                       Reply
//                     </button>
//                     <button className="px-4 py-2 bg-gray-900/80 border border-gray-800 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-all text-sm font-mono">
//                       Forward
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div className="h-full flex items-center justify-center p-8">
//                 <div className="text-center">
//                   <div className="w-16 h-16 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-center mx-auto mb-4">
//                     <MessageIcon size={32} className="text-gray-700" />
//                   </div>
//                   <h3 className="text-lg font-mono font-medium text-white mb-2">Select a message</h3>
//                   <p className="text-gray-600 text-sm font-mono">Choose a message to view its contents</p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MessagesView;