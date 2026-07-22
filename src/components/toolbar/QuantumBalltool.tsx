import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActivityIcon, StatusIcon, TaskIcon, EventIcon, MicrophoneIcon, ReportIcon,
  WorkflowIcon, PieChartIcon, BarChartIcon, LineChartIcon, GanttChartIcon,
  WaveChartIcon, DonutChartIcon, CloseIcon, PinIcon, BarcodeIcon, StarIcon,
} from '@/components/icons/Icons';
import { DonutChart, PieGraph, BarChart, LineGraph, GanttChart, WaveChart } from '@/components/charts/ReportCharts';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';
import { parseScannedInput } from '@/lib/barcodeUtils';
import { fetchGlobalActivities } from '@/lib/activityLogger';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';

import FavoritesPanel from './FavoritesPanel';
import PhoneMirror from './PhoneMirror';
import ReportBuilderPanel from './ReportBuilderPanel';

// Selectable Color Palette for Customization
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

// Phone Mirror icon
const PhoneMirrorIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

// Email icon
const EmailIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

interface ToolItem {
  id: string; name: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string; glowColor: string; lightColor: string;
  adminOnly?: boolean;
  quickActions?: { label: string; action: string }[];
}

const tools: ToolItem[] = [
  { id: 'favorites', name: 'Favorites', icon: StarIcon, color: '#FF99AA', glowColor: 'rgba(255,153,170,1)', lightColor: '#FFCCDD', quickActions: [{ label: 'View All', action: 'all' }, { label: 'Recent', action: 'recent' }] },
  { id: 'activity', name: 'Activity', icon: ActivityIcon, color: '#66FFFF', glowColor: 'rgba(102,255,255,1)', lightColor: '#BBFFFF', quickActions: [{ label: 'View Feed', action: 'feed' }, { label: 'My Activity', action: 'mine' }, { label: 'Mentions', action: 'mentions' }] },
  { id: 'status', name: 'Status', icon: StatusIcon, color: '#88BBFF', glowColor: 'rgba(136,187,255,1)', lightColor: '#CCDDFF', quickActions: [{ label: 'Set Status', action: 'set' }, { label: 'Team Status', action: 'team' }, { label: 'Away', action: 'away' }] },
  { id: 'task', name: 'Tasks', icon: TaskIcon, color: '#88FFBB', glowColor: 'rgba(136,255,187,1)', lightColor: '#CCFFDD', quickActions: [{ label: 'New Task', action: 'new' }, { label: 'View Overdue', action: 'overdue' }, { label: 'My Tasks', action: 'mine' }] },
  { id: 'event', name: 'Events', icon: EventIcon, color: '#FFAA77', glowColor: 'rgba(255,170,119,1)', lightColor: '#FFDDBB', quickActions: [{ label: 'New Event', action: 'new' }, { label: 'Today', action: 'today' }, { label: 'This Week', action: 'week' }] },
  { id: 'microphone', name: 'AI Assistant', icon: MicrophoneIcon, color: '#AADDFF', glowColor: 'rgba(170,221,255,1)', lightColor: '#DDEEFF', quickActions: [{ label: 'Voice Input', action: 'voice' }, { label: 'Ask AI', action: 'ask' }, { label: 'Summarize', action: 'summarize' }] },
  { id: 'scanner', name: 'Scanner', icon: BarcodeIcon, color: '#FFFFFF', glowColor: 'rgba(255,255,255,1)', lightColor: '#FFFFFF', quickActions: [{ label: 'Scan Barcode', action: 'scan' }, { label: 'Scan QR', action: 'qr' }, { label: 'Manual Entry', action: 'manual' }] },
  { id: 'phone-mirror', name: 'Phone Mirror', icon: PhoneMirrorIcon, color: '#00FFDD', glowColor: 'rgba(0,255,221,1)', lightColor: '#AAFFEE', quickActions: [{ label: 'Connect Phone', action: 'connect' }, { label: 'Disconnect', action: 'disconnect' }] },
  { id: 'email-mirror', name: 'Email Mirror', icon: EmailIcon, color: '#FF77CC', glowColor: 'rgba(255,119,204,1)', lightColor: '#FFCCEE', quickActions: [{ label: 'View Inbox', action: 'inbox' }, { label: 'Add Account', action: 'add' }, { label: 'Settings', action: 'settings' }] },
  { id: 'report', name: 'Reports', icon: ReportIcon, color: '#CC88FF', glowColor: 'rgba(204,136,255,1)', lightColor: '#E0BBFF', adminOnly: true, quickActions: [{ label: 'New Report', action: 'new' }, { label: 'Templates', action: 'templates' }, { label: 'Scheduled', action: 'scheduled' }] },
  { id: 'workflow', name: 'Workflow', icon: WorkflowIcon, color: '#66DDFF', glowColor: 'rgba(102,221,255,1)', lightColor: '#BBEEFF', adminOnly: true, quickActions: [{ label: 'New Flow', action: 'new' }, { label: 'Active', action: 'active' }, { label: 'Templates', action: 'templates' }] },
];

interface Position { x: number; y: number; }
type ChartType = 'donut' | 'pie' | 'bar' | 'line' | 'gantt' | 'wave';
interface ReportConfig { id: string; name: string; chartType: ChartType; dataSource: string; pinnedTo?: string; }

interface QuantumBalltoolProps {
  onOpenActivity: () => void; onOpenStatus: () => void; onOpenTask: () => void;
  onOpenEvent: () => void; onOpenProject: () => void; onOpenMicrophone: () => void;
  onOpenMessages?: () => void; onOpenWorkflow?: () => void;
  onOpenFullActivity?: () => void;
  onNavigateToMiniApp?: (wsSlug: string, appName: string) => void;
  currentView?: 'home' | 'workspace' | 'miniapp'; currentWorkspace?: string;
  currentMiniApp?: string; availableWorkspaces?: string[];
  availableMiniApps?: { name: string; workspace: string }[]; workspaceColor?: string;
}

const CHART_TYPES: { type: ChartType; label: string; icon: React.FC<{ size?: number; className?: string }>; description: string }[] = [
  { type: 'donut', label: 'Donut Chart', icon: DonutChartIcon, description: 'Ring chart with center value' },
  { type: 'pie', label: 'Pie Graph', icon: PieChartIcon, description: 'Circular percentage breakdown' },
  { type: 'bar', label: 'Bar Chart', icon: BarChartIcon, description: 'Vertical or horizontal bars' },
  { type: 'line', label: 'Line Graph', icon: LineChartIcon, description: 'Trend lines over time' },
  { type: 'gantt', label: 'Gantt Chart', icon: GanttChartIcon, description: 'Timeline project view' },
  { type: 'wave', label: 'Wave Chart', icon: WaveChartIcon, description: 'Real-time streaming data' },
];

function parseColor(c: string): [number, number, number, number] {
  const rgbaMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return [+rgbaMatch[1], +rgbaMatch[2], +rgbaMatch[3], rgbaMatch[4] !== undefined ? +rgbaMatch[4] : 1];
  }
  let hex = c.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16), 1];
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1,g1,b1,a1] = parseColor(from);
  const [r2,g2,b2,a2] = parseColor(to);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  const a = a1 + (a2 - a1) * t;
  if (from.startsWith('#')) {
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
  return `rgba(${r},${g},${b},${parseFloat(a.toFixed(3))})`;
}

type WsColorSet = { border: string; glow1: string; glow2: string; ring: string; core1: string; core2: string; ringBright: string };
function lerpColorSet(from: WsColorSet, to: WsColorSet, t: number): WsColorSet {
  return {
    border: lerpColor(from.border, to.border, t),
    glow1: lerpColor(from.glow1, to.glow1, t),
    glow2: lerpColor(from.glow2, to.glow2, t),
    ring: lerpColor(from.ring, to.ring, t),
    core1: lerpColor(from.core1, to.core1, t),
    core2: lerpColor(from.core2, to.core2, t),
    ringBright: lerpColor(from.ringBright, to.ringBright, t),
  };
}

function clamp(pos: Position, size: number): Position {
  return { x: Math.max(0, Math.min(window.innerWidth - size, pos.x)), y: Math.max(0, Math.min(window.innerHeight - size, pos.y)) };
}

const EDGE_MAGNET_ZONE = 40; 
const EDGE_MAX_OVERSHOOT = 12; 
const EDGE_RUBBER_FACTOR = 0.15; 

function edgeMagnetClamp(
  rawPos: Position,
  size: number
): { pos: Position; clampedX: boolean; clampedY: boolean } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minX = 0, maxX = vw - size;
  const minY = 0, maxY = vh - size;

  let x = rawPos.x;
  let y = rawPos.y;
  let clampedX = false;
  let clampedY = false;

  if (x < minX) {
    const overshoot = minX - x;
    x = minX - Math.min(EDGE_MAX_OVERSHOOT, overshoot * EDGE_RUBBER_FACTOR);
    clampedX = true;
  } else if (x > maxX) {
    const overshoot = x - maxX;
    x = maxX + Math.min(EDGE_MAX_OVERSHOOT, overshoot * EDGE_RUBBER_FACTOR);
    clampedX = true;
  } else if (x < minX + EDGE_MAGNET_ZONE) {
    const t = x / EDGE_MAGNET_ZONE; 
    x = minX + EDGE_MAGNET_ZONE * (t * t); 
  } else if (x > maxX - EDGE_MAGNET_ZONE) {
    const distFromEdge = maxX - x;
    const t = distFromEdge / EDGE_MAGNET_ZONE;
    x = maxX - EDGE_MAGNET_ZONE * (t * t);
  }

  if (y < minY) {
    const overshoot = minY - y;
    y = minY - Math.min(EDGE_MAX_OVERSHOOT, overshoot * EDGE_RUBBER_FACTOR);
    clampedY = true;
  } else if (y > maxY) {
    const overshoot = y - maxY;
    y = maxY + Math.min(EDGE_MAX_OVERSHOOT, overshoot * EDGE_RUBBER_FACTOR);
    clampedY = true;
  } else if (y < minY + EDGE_MAGNET_ZONE) {
    const t = y / EDGE_MAGNET_ZONE;
    y = minY + EDGE_MAGNET_ZONE * (t * t);
  } else if (y > maxY - EDGE_MAGNET_ZONE) {
    const distFromEdge = maxY - y;
    const t = distFromEdge / EDGE_MAGNET_ZONE;
    y = maxY - EDGE_MAGNET_ZONE * (t * t);
  }

  return { pos: { x, y }, clampedX, clampedY };
}

function loadLS<T>(key: string, fb: T): T { try { const r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch {} return fb; }
function saveLS(key: string, v: any) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }
function debounce(fn: (...a: any[]) => void, ms: number) { let t: any; return (...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ═══════════════ EMAIL MIRROR PANEL ═══════════════
const EMAIL_PRESETS: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }> = {
  gmail: { imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 587 },
  outlook: { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587 },
  yahoo: { imap_host: 'imap.mail.yahoo.com', imap_port: 993, smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587 },
  icloud: { imap_host: 'imap.mail.me.com', imap_port: 993, smtp_host: 'smtp.mail.me.com', smtp_port: 587 },
  aol: { imap_host: 'imap.aol.com', imap_port: 993, smtp_host: 'smtp.aol.com', smtp_port: 587 },
  custom: { imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587 },
};

const EmailMirrorPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState('gmail');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imapHost, setImapHost] = useState(EMAIL_PRESETS.gmail.imap_host);
  const [imapPort, setImapPort] = useState(EMAIL_PRESETS.gmail.imap_port);
  const [smtpHost, setSmtpHost] = useState(EMAIL_PRESETS.gmail.smtp_host);
  const [smtpPort, setSmtpPort] = useState(EMAIL_PRESETS.gmail.smtp_port);
  const [saving, setSaving] = useState(false);
  const [activeInbox, setActiveInbox] = useState<string | null>(null);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const { data } = await db.from('email_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (data) setAccounts(data);
    } catch (err) { console.error('Error loading email accounts:', err); }
  };

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const preset = EMAIL_PRESETS[p] || EMAIL_PRESETS.custom;
    setImapHost(preset.imap_host); setImapPort(preset.imap_port);
    setSmtpHost(preset.smtp_host); setSmtpPort(preset.smtp_port);
  };

  const handleAddAccount = async () => {
    if (!email || !password) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('email_accounts').insert({
        user_id: userId, provider, email_address: email, display_name: email.split('@')[0],
        imap_host: imapHost, imap_port: imapPort, smtp_host: smtpHost, smtp_port: smtpPort,
        encrypted_password: btoa(password), is_active: true, sync_status: 'connecting',
      });
      if (!error) { setEmail(''); setPassword(''); setShowAddForm(false); loadAccounts(); }
    } catch (err) { console.error('Error adding account:', err); }
    finally { setSaving(false); }
  };

  const toggleAccount = async (id: string, isActive: boolean) => { await supabase.from('email_accounts').update({ is_active: !isActive }).eq('id', id); loadAccounts(); };
  const removeAccount = async (id: string) => { await supabase.from('email_accounts').delete().eq('id', id); loadAccounts(); };

  const mockEmails = [
    { from: 'Sarah Chen', subject: 'Q4 Budget Review Meeting', time: '10:32 AM', unread: true },
    { from: 'Mike Johnson', subject: 'Re: Project Alpha Update', time: '9:15 AM', unread: true },
    { from: 'HR Department', subject: 'Benefits Enrollment Reminder', time: 'Yesterday', unread: false },
    { from: 'DevOps Team', subject: 'Server Maintenance Window', time: 'Yesterday', unread: false },
    { from: 'Client Portal', subject: 'New Support Ticket #4521', time: 'Feb 18', unread: false },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border border-pink-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-[0_0_40px_rgba(255,119,204,0.2)]">
        <div className="flex items-center justify-between p-4 border-b border-pink-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center">
              <EmailIcon size={24} className="text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-mono">Email Mirror</h2>
              <p className="text-xs text-gray-400 font-mono">{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={24} /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh] darkwave-scrollbar">
          {accounts.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-sm font-mono text-gray-400 mb-2">Connected Accounts</h3>
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-pink-500/30 transition-all">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono ${acc.is_active ? 'bg-pink-500/20 border border-pink-500/30 text-pink-400' : 'bg-gray-800 border border-gray-700 text-gray-500'}`}>
                    {acc.provider?.[0]?.toUpperCase() || 'E'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-mono text-sm truncate">{acc.email_address}</p>
                    <p className="text-gray-500 font-mono text-xs">{acc.provider} &middot; {acc.sync_status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveInbox(activeInbox === acc.id ? null : acc.id)} className="px-2 py-1 text-xs font-mono text-pink-400 border border-pink-500/30 rounded hover:bg-pink-500/10">Inbox</button>
                    <button onClick={() => toggleAccount(acc.id, acc.is_active)} className={`w-8 h-4 rounded-full transition-all ${acc.is_active ? 'bg-green-500' : 'bg-gray-700'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${acc.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => removeAccount(acc.id)} className="p-1 text-gray-500 hover:text-red-400"><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeInbox && (
            <div className="mb-4 rounded-xl border border-pink-500/20 bg-gray-900/30 p-4">
              <h3 className="text-sm font-mono text-pink-400 mb-3">Inbox Preview</h3>
              <div className="space-y-2">
                {mockEmails.map((em, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${em.unread ? 'bg-pink-500/5 border border-pink-500/15' : 'bg-gray-900/30 border border-gray-800'} hover:border-pink-500/30`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${em.unread ? 'bg-pink-400 shadow-[0_0_6px_rgba(255,119,204,0.8)]' : 'bg-gray-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono ${em.unread ? 'text-white font-bold' : 'text-gray-400'}`}>{em.from}</span>
                        <span className="text-[10px] text-gray-600 font-mono">{em.time}</span>
                      </div>
                      <p className={`text-xs font-mono truncate ${em.unread ? 'text-gray-300' : 'text-gray-500'}`}>{em.subject}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showAddForm ? (
            <div className="rounded-xl border border-pink-500/30 bg-gray-900/50 p-4 space-y-4">
              <h3 className="text-sm font-mono text-white font-bold">Add Email Account</h3>
              <div>
                <label className="text-xs font-mono text-gray-400 mb-1 block">Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {['gmail', 'outlook', 'yahoo', 'icloud', 'aol', 'custom'].map(p => (
                    <button key={p} onClick={() => handleProviderChange(p)} className={`px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-all ${provider === p ? 'bg-pink-500/20 border-pink-500/50 text-pink-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-gray-400 mb-1 block">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-pink-500/50" />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-400 mb-1 block">Password / App Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-pink-500/50" />
              </div>
              {provider === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-mono text-gray-400 mb-1 block">IMAP Host</label><input type="text" value={imapHost} onChange={e => setImapHost(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-pink-500/50" /></div>
                  <div><label className="text-xs font-mono text-gray-400 mb-1 block">IMAP Port</label><input type="number" value={imapPort} onChange={e => setImapPort(Number(e.target.value))} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-pink-500/50" /></div>
                  <div><label className="text-xs font-mono text-gray-400 mb-1 block">SMTP Host</label><input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-pink-500/50" /></div>
                  <div><label className="text-xs font-mono text-gray-400 mb-1 block">SMTP Port</label><input type="number" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-pink-500/50" /></div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">Cancel</button>
                <button onClick={handleAddAccount} disabled={saving || !email || !password} className="flex-1 py-2.5 bg-pink-500/20 border border-pink-500/50 text-pink-400 rounded-lg hover:bg-pink-500/30 font-mono text-sm disabled:opacity-50">{saving ? 'Connecting...' : 'Connect Account'}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)} className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-pink-500/50 hover:text-pink-400 transition-all font-mono flex items-center justify-center gap-2">
              <EmailIcon size={18} /> Add Email Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════ LOCALSTORAGE KEYS ═══════════════
const LS_POS = 'quantum-ball-pos';
const LS_ROT = 'quantum-ball-rot';
const LS_TOOL = 'quantum-ball-tool';

// ═══════════════ SCANNER PANEL ═══════════════
const LS_SCAN_HISTORY = 'quantum-scanner-history';

interface ScanHistoryItem { raw: string; type: string; timestamp: number; uniqueId?: string; url?: string; }

const ScannerPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>(() => {
    try { const stored = localStorage.getItem(LS_SCAN_HISTORY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  });
  const [parsedResult, setParsedResult] = useState<ReturnType<typeof parseScannedInput> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (val.trim()) {
      const result = parseScannedInput(val.trim());
      setParsedResult(result);
    } else {
      setParsedResult(null);
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    const result = parseScannedInput(inputValue.trim());
    const newItem: ScanHistoryItem = { raw: inputValue.trim(), type: result.type, timestamp: Date.now(), uniqueId: result.uniqueId, url: result.url };
    const updated = [newItem, ...scanHistory.filter(h => h.raw !== inputValue.trim())].slice(0, 50);
    setScanHistory(updated);
    try { localStorage.setItem(LS_SCAN_HISTORY, JSON.stringify(updated)); } catch {}
    
    if (result.type === 'qr_url' && result.url) {
      window.location.href = result.url;
    } else if (result.type === 'unique_id' && result.uniqueId) {
      window.location.href = `/item/${result.uniqueId}`;
    }
  };

  const handleNavigate = () => {
    if (!parsedResult) return;
    if (parsedResult.type === 'qr_url' && parsedResult.url) {
      const newItem: ScanHistoryItem = { raw: inputValue.trim(), type: parsedResult.type, timestamp: Date.now(), url: parsedResult.url };
      const updated = [newItem, ...scanHistory.filter(h => h.raw !== inputValue.trim())].slice(0, 50);
      try { localStorage.setItem(LS_SCAN_HISTORY, JSON.stringify(updated)); } catch {}
      window.location.href = parsedResult.url;
    } else if (parsedResult.type === 'unique_id' && parsedResult.uniqueId) {
      const newItem: ScanHistoryItem = { raw: inputValue.trim(), type: parsedResult.type, timestamp: Date.now(), uniqueId: parsedResult.uniqueId };
      const updated = [newItem, ...scanHistory.filter(h => h.raw !== inputValue.trim())].slice(0, 50);
      try { localStorage.setItem(LS_SCAN_HISTORY, JSON.stringify(updated)); } catch {}
      window.location.href = `/item/${parsedResult.uniqueId}`;
    }
  };

  const clearHistory = () => {
    setScanHistory([]);
    try { localStorage.removeItem(LS_SCAN_HISTORY); } catch {}
  };

  const loadFromHistory = (item: ScanHistoryItem) => {
    setInputValue(item.raw);
    handleInputChange(item.raw);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'qr_url': return { label: 'QR URL', color: 'bg-blue-500/20 border-blue-500/50 text-blue-400', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]' };
      case 'unique_id': return { label: 'Unique ID', color: 'bg-purple-500/20 border-purple-500/50 text-purple-400', glow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]' };
      default: return { label: 'Raw Text', color: 'bg-gray-500/20 border-gray-500/50 text-gray-400', glow: '' };
    }
  };

  const isNavigable = parsedResult && (parsedResult.type === 'qr_url' || parsedResult.type === 'unique_id');

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border border-slate-400/30 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)]">
        <div className="flex items-center justify-between p-4 border-b border-slate-500/20 bg-gradient-to-r from-slate-900/40 via-black to-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-300/20 to-slate-500/20 border border-slate-400/30 flex items-center justify-center">
              <BarcodeIcon size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-mono">Scanner</h2>
              <p className="text-xs text-gray-400 font-mono">Barcode & QR Code Reader</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><CloseIcon size={24} /></button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[70vh] darkwave-scrollbar space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-300 mb-2 block uppercase tracking-wider">Manual Entry / Paste Scanned Value</label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Scan or type barcode/QR value..."
                className="flex-1 bg-black border border-slate-400/30 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-slate-400/60 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all placeholder-gray-600"
              />
              <button
                onClick={handleSubmit}
                className="px-4 py-3 bg-slate-500/20 border border-slate-400/50 text-white rounded-lg hover:bg-slate-500/30 transition-all font-mono text-sm font-bold"
              >
                Parse
              </button>
            </div>
          </div>

          {parsedResult && inputValue.trim() && (
            <div className="rounded-xl border border-slate-400/20 bg-slate-900/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Parsed Result</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${getTypeBadge(parsedResult.type).color} ${getTypeBadge(parsedResult.type).glow}`}>
                  {getTypeBadge(parsedResult.type).label}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono w-16">Raw:</span>
                  <span className="text-sm text-white font-mono truncate">{parsedResult.raw}</span>
                </div>
                {parsedResult.uniqueId && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono w-16">UID:</span>
                    <span className="text-sm text-slate-300 font-mono font-bold">{parsedResult.uniqueId}</span>
                  </div>
                )}
                {parsedResult.url && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono w-16">URL:</span>
                    <span className="text-sm text-white font-mono truncate">{parsedResult.url}</span>
                  </div>
                )}
              </div>
              {isNavigable && (
                <button
                  onClick={handleNavigate}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-slate-400/20 to-slate-600/20 border border-slate-400/50 text-white rounded-lg hover:from-slate-400/30 hover:to-slate-600/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all font-mono text-sm font-bold flex items-center justify-center gap-2"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  Navigate to {parsedResult.type === 'qr_url' ? 'URL' : `Item ${parsedResult.uniqueId}`}
                </button>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Scan History</span>
              {scanHistory.length > 0 && (
                <button onClick={clearHistory} className="text-xs font-mono text-gray-600 hover:text-red-400 transition-colors">Clear All</button>
              )}
            </div>
            {scanHistory.length === 0 ? (
              <div className="text-center py-6 text-gray-600 font-mono text-xs border border-dashed border-gray-800 rounded-lg">
                No scan history yet
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto darkwave-scrollbar">
                {scanHistory.map((item, i) => {
                  const badge = getTypeBadge(item.type);
                  return (
                    <div
                      key={`${item.raw}-${item.timestamp}`}
                      onClick={() => loadFromHistory(item)}
                      className="flex items-center gap-3 p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-slate-400/30 hover:bg-slate-400/10 transition-all cursor-pointer group"
                    >
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-300 font-mono truncate flex-1 group-hover:text-white transition-colors">{item.raw}</span>
                      <span className="text-[10px] text-gray-700 font-mono flex-shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════ ACTIVITY FEED PANEL ═══════════════
function getActionIcon(actionType: string): React.ReactNode {
  switch (actionType) {
    case 'created':
      return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case 'updated':
      return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    case 'deleted':
      return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
    case 'viewed':
      return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
    default:
      return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  if (!name || name === 'Unknown') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-400/30 text-yellow-300 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

type DatePreset = 'all' | 'today' | '7days' | '30days' | 'custom';

const DATE_PRESETS: { id: DatePreset; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Time', icon: <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg> },
  { id: 'today', label: 'Today', icon: <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
  { id: '7days', label: '7 Days', icon: <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg> },
  { id: '30days', label: '30 Days', icon: <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" /><line x1="16" y1="14" x2="16" y2="14.01" /><line x1="8" y1="18" x2="8" y2="18.01" /><line x1="12" y1="18" x2="12" y2="18.01" /></svg> },
  { id: 'custom', label: 'Custom', icon: <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> },
];

function computeDateRange(preset: DatePreset, customStart: string, customEnd: string): { startDate: string | undefined; endDate: string | undefined } {
  if (preset === 'all') return { startDate: undefined, endDate: undefined };
  const now = new Date();
  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (preset === '7days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }
  if (preset === '30days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }
  if (preset === 'custom') {
    const s = customStart ? new Date(customStart + 'T00:00:00').toISOString() : undefined;
    const e = customEnd ? new Date(customEnd + 'T23:59:59.999').toISOString() : undefined;
    return { startDate: s, endDate: e };
  }
  return { startDate: undefined, endDate: undefined };
}

function formatDateRangeLabel(preset: DatePreset, customStart: string, customEnd: string): string {
  if (preset === 'all') return '';
  if (preset === 'today') return 'today';
  if (preset === '7days') return 'last 7 days';
  if (preset === '30days') return 'last 30 days';
  if (preset === 'custom') {
    const parts: string[] = [];
    if (customStart) parts.push(customStart);
    if (customEnd) parts.push(customEnd);
    return parts.length > 0 ? parts.join(' to ') : 'custom range';
  }
  return '';
}

function buildCsvDateSuffix(preset: DatePreset, customStart: string, customEnd: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (preset === 'all') return today;
  if (preset === 'today') return today;
  if (preset === '7days') {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return `${start.toISOString().split('T')[0]}_to_${today}`;
  }
  if (preset === '30days') {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return `${start.toISOString().split('T')[0]}_to_${today}`;
  }
  if (preset === 'custom') {
    return `${customStart || 'start'}_to_${customEnd || 'end'}`;
  }
  return today;
}

const ActivityFeedPanel: React.FC<{ onClose: () => void; availableWorkspaces: string[] }> = ({ onClose, availableWorkspaces }) => {
  const { user } = useAuth();
  const { getColor } = useWorkspaceColor(); 
  const currentUserId = user ? (user as any).id || (user as any).email || '' : '';

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [myActivityOnly, setMyActivityOnly] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const PAGE_SIZE = 50;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const myActivityOnlyRef = useRef(myActivityOnly);
  myActivityOnlyRef.current = myActivityOnly;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;
  const selectedWorkspaceRef = useRef(selectedWorkspace);
  selectedWorkspaceRef.current = selectedWorkspace;
  const datePresetRef = useRef(datePreset);
  datePresetRef.current = datePreset;
  const customStartDateRef = useRef(customStartDate);
  customStartDateRef.current = customStartDate;
  const customEndDateRef = useRef(customEndDate);
  customEndDateRef.current = customEndDate;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  const { startDate: computedStartDate, endDate: computedEndDate } = useMemo(
    () => computeDateRange(datePreset, customStartDate, customEndDate),
    [datePreset, customStartDate, customEndDate]
  );

  const loadActivities = useCallback(async (
    filterByUser: boolean, wsSlug: string | null, sDate?: string, eDate?: string, pageOffset = 0, append = false
  ) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    const userId = filterByUser ? currentUserIdRef.current : undefined;
    const ws = wsSlug || undefined;
    const data = await fetchGlobalActivities(PAGE_SIZE, userId, ws, sDate, eDate, pageOffset);
    if (append) {
      setActivities(prev => [...prev, ...data]);
    } else {
      setActivities(data);
    }
    setHasMore(data.length >= PAGE_SIZE);
    setOffset(pageOffset + data.length);
    if (!append) setLoading(false); else setLoadingMore(false);
  }, [PAGE_SIZE]);

  useEffect(() => {
    setOffset(0); setHasMore(true);
    loadActivities(myActivityOnly, selectedWorkspace, computedStartDate, computedEndDate, 0, false);
  }, [myActivityOnly, selectedWorkspace, computedStartDate, computedEndDate, loadActivities]);

  useEffect(() => {
    const channel = supabase
      .channel('activity-global-feed')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload: any) => {
          if (payload.new) {
            if (myActivityOnlyRef.current) {
              if (payload.new.user_id !== currentUserIdRef.current) return;
            }
            if (selectedWorkspaceRef.current) {
              if (payload.new.workspace_slug !== selectedWorkspaceRef.current) return;
            }
            const currentRange = computeDateRange(datePresetRef.current, customStartDateRef.current, customEndDateRef.current);
            if (currentRange.startDate || currentRange.endDate) {
              const entryDate = payload.new.created_at;
              if (entryDate) {
                if (currentRange.startDate && entryDate < currentRange.startDate) return;
                if (currentRange.endDate && entryDate > currentRange.endDate) return;
              }
            }
            setActivities(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLoadMore = useCallback(() => {
    loadActivities(myActivityOnly, selectedWorkspace, computedStartDate, computedEndDate, offset, true);
  }, [loadActivities, myActivityOnly, selectedWorkspace, computedStartDate, computedEndDate, offset]);

  const filteredActivities = useMemo(() => {
    if (!debouncedSearch) return activities;
    const q = debouncedSearch.toLowerCase();
    return activities.filter(act => {
      const userName = (act.user_name || '').toLowerCase();
      const entityName = (act.entity_name || '').toLowerCase();
      const actionType = (act.action_type || '').toLowerCase();
      const wsSlug = (act.workspace_slug || '').toLowerCase();
      const actionStr = (act.action || '').toLowerCase();
      const target = (act.target || '').toLowerCase();
      return userName.includes(q) || entityName.includes(q) || actionType.includes(q) || wsSlug.includes(q) || actionStr.includes(q) || target.includes(q);
    });
  }, [activities, debouncedSearch]);

  const handleToggleMyActivity = () => setMyActivityOnly(prev => !prev);
  const handleSelectWorkspace = (slug: string | null) => setSelectedWorkspace(slug);

  const handleSelectDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const handleDownloadCSV = () => {
    const rows = filteredActivities;
    if (rows.length === 0) return;

    const headers = ['timestamp', 'user_name', 'action_type', 'entity_type', 'entity_name', 'workspace_slug', 'action_description'];
    const csvLines = [headers.join(',')];

    rows.forEach(act => {
      const ts = act.created_at || '';
      const userName = (act.user_name || '').replace(/"/g, '""');
      const actionType = act.action_type || '';
      const entityType = act.entity_type || '';
      const entityName = (act.entity_name || '').replace(/"/g, '""');
      const wsSlug = act.workspace_slug || '';
      const actionDesc = (act.action || '').replace(/"/g, '""');
      csvLines.push(`"${ts}","${userName}","${actionType}","${entityType}","${entityName}","${wsSlug}","${actionDesc}"`);
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateSuffix = buildCsvDateSuffix(datePreset, customStartDate, customEndDate);
    link.href = url;
    link.download = `activity-log-${dateSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const subtitleParts: string[] = [];
  if (myActivityOnly) subtitleParts.push('Your activity'); else subtitleParts.push('Global feed');
  if (selectedWorkspace) subtitleParts.push(`in ${selectedWorkspace}`); else subtitleParts.push('across all workspaces');
  const dateLabel = formatDateRangeLabel(datePreset, customStartDate, customEndDate);
  if (dateLabel) subtitleParts.push(`\u2022 ${dateLabel}`);
  const subtitleText = subtitleParts.join(' ');

  const todayStr = new Date().toISOString().split('T')[0];

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative bg-black border border-cyan-500/30 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden shadow-[0_0_40px_rgba(102,255,255,0.15)] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex-shrink-0 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-black to-cyan-950/20">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <ActivityIcon size={24} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white font-mono">Live Activity</h2>
                <p className="text-xs text-gray-400 font-mono truncate max-w-[260px]">{subtitleText}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMyActivity}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                  myActivityOnly ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(102,255,255,0.15)]' : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                }`}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                My Activity
              </button>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-gray-600'}`} style={{ animation: isLive ? 'quantum-dot-pulse 1.5s ease-in-out infinite' : 'none' }} />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{isLive ? 'Live' : 'Paused'}</span>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><CloseIcon size={24} /></button>
            </div>
          </div>

          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleSelectWorkspace(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-all ${
                selectedWorkspace === null ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(102,255,255,0.12)]' : 'bg-gray-900/50 border-gray-700/60 text-gray-500 hover:border-gray-600 hover:text-gray-400'
              }`}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
              All
            </button>
            {availableWorkspaces.map(ws => {
              const c = getColor(ws);
              const isActive = selectedWorkspace === ws;
              return (
                <button
                  key={ws}
                  onClick={() => handleSelectWorkspace(isActive ? null : ws)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-all ${
                    isActive ? 'shadow-[0_0_8px_rgba(255,255,255,0.08)]' : 'bg-gray-900/50 border-gray-700/60 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                  }`}
                  style={isActive ? { backgroundColor: `rgba(${c.rgb}, 0.1)`, borderColor: `rgba(${c.rgb}, 0.25)`, color: c.primary } : {}}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? c.primary : '#4b5563' }} />
                  {ws}
                </button>
              );
            })}
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {DATE_PRESETS.map(preset => {
                const isActive = datePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectDatePreset(preset.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-all ${
                      isActive ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.12)]' : 'bg-gray-900/50 border-gray-700/60 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                    }`}
                  >
                    <span className={isActive ? 'text-amber-400' : 'text-gray-600'}>{preset.icon}</span>
                    {preset.label}
                  </button>
                );
              })}
              {datePreset !== 'all' && datePreset !== 'custom' && (
                <span className="text-[10px] font-mono text-amber-500/60 ml-1">
                  {datePreset === 'today' && todayStr}
                  {datePreset === '7days' && (() => { const s = new Date(); s.setDate(s.getDate() - 7); return `${s.toISOString().split('T')[0]} — ${todayStr}`; })()}
                  {datePreset === '30days' && (() => { const s = new Date(); s.setDate(s.getDate() - 30); return `${s.toISOString().split('T')[0]} — ${todayStr}`; })()}
                </span>
              )}
            </div>

            {(datePreset === 'custom' || showCustomDatePicker) && (
              <div className="mt-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-950/10 space-y-2.5">
                <div className="flex items-center gap-2">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  <span className="text-xs font-mono text-amber-400/80 uppercase tracking-wider">Custom Date Range</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-mono text-gray-500 mb-1 block uppercase tracking-wider">Start Date</label>
                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} max={customEndDate || todayStr} className="w-full bg-black border border-amber-500/25 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 focus:shadow-[0_0_10px_rgba(245,158,11,0.1)] transition-all [color-scheme:dark]" />
                  </div>
                  <div className="flex items-center pt-4">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-mono text-gray-500 mb-1 block uppercase tracking-wider">End Date</label>
                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} min={customStartDate || undefined} max={todayStr} className="w-full bg-black border border-amber-500/25 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 focus:shadow-[0_0_10px_rgba(245,158,11,0.1)] transition-all [color-scheme:dark]" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 3); setCustomStartDate(d.toISOString().split('T')[0]); setCustomEndDate(todayStr); }} className="px-2 py-0.5 text-[10px] font-mono text-gray-500 border border-gray-700/60 rounded hover:border-amber-500/30 hover:text-amber-400 transition-all">3d</button>
                    <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 14); setCustomStartDate(d.toISOString().split('T')[0]); setCustomEndDate(todayStr); }} className="px-2 py-0.5 text-[10px] font-mono text-gray-500 border border-gray-700/60 rounded hover:border-amber-500/30 hover:text-amber-400 transition-all">14d</button>
                    <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 90); setCustomStartDate(d.toISOString().split('T')[0]); setCustomEndDate(todayStr); }} className="px-2 py-0.5 text-[10px] font-mono text-gray-500 border border-gray-700/60 rounded hover:border-amber-500/30 hover:text-amber-400 transition-all">90d</button>
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }} className="text-[10px] font-mono text-gray-600 hover:text-red-400 transition-colors">Clear</button>
                  )}
                </div>
                {(customStartDate || customEndDate) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                    <span className="text-[10px] font-mono text-amber-400/70">{customStartDate || 'beginning'} — {customEndDate || 'now'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by user, entity, action, workspace..." className="w-full bg-gray-900/50 border border-gray-700/60 rounded-lg pl-9 pr-8 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_12px_rgba(102,255,255,0.08)] transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 darkwave-scrollbar min-h-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-900/30 border border-gray-800/50 rounded-lg animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-800 rounded w-3/4" /><div className="h-2.5 bg-gray-800/60 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                {debouncedSearch ? <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> : datePreset !== 'all' ? <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> : myActivityOnly ? <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> : <ActivityIcon size={28} className="text-gray-600" />}
              </div>
              <p className="text-gray-500 font-mono text-sm">
                {debouncedSearch ? `No results for "${debouncedSearch}"` : datePreset !== 'all' ? `No activity for ${formatDateRangeLabel(datePreset, customStartDate, customEndDate)}` : myActivityOnly ? 'No activity from you yet' : selectedWorkspace ? `No activity in ${selectedWorkspace}` : 'No activity recorded yet'}
              </p>
              <p className="text-gray-700 font-mono text-xs mt-1">
                {debouncedSearch ? 'Try a different search term or clear filters' : datePreset !== 'all' ? 'Try expanding the date range or selecting a different period' : myActivityOnly ? 'Your actions across workspaces will appear here' : 'Actions across workspaces will appear here in real-time'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActivities.map((act, i) => {
                const wsSlug = act.workspace_slug || '';
                const c = getColor(wsSlug || 'main');
                const userName = act.user_name || 'Unknown';
                const initials = getInitials(userName);
                const actionType = act.action_type || 'created';
                const entityType = act.entity_type || 'record';
                const entityName = act.entity_name || act.target || '';
                const actionStr = act.action || `${actionType} ${entityType}`;
                const createdAt = act.created_at || new Date().toISOString();
                const isNew = i === 0 && Date.now() - new Date(createdAt).getTime() < 10000;
                const q = debouncedSearch;

                return (
                  <div key={act.id || `${createdAt}-${i}`} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${isNew ? 'ring-1 shadow-[0_0_12px_rgba(102,255,255,0.1)]' : ''}`} style={{ backgroundColor: `rgba(${c.rgb}, 0.1)`, borderColor: `rgba(${c.rgb}, 0.25)`, animation: isNew ? 'quantum-radial-expand 0.3s ease-out both' : 'none', ...(isNew ? { ringColor: `rgba(${c.rgb}, 0.3)` } : {}) }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 border" style={{ backgroundColor: `rgba(${c.rgb}, 0.1)`, borderColor: `rgba(${c.rgb}, 0.25)`, textShadow: '0 0 6px currentColor' }}>
                      <span style={{ color: c.primary }}>{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-mono text-sm font-semibold truncate"><HighlightText text={userName} query={q} /></span>
                        <span className="text-gray-500 font-mono text-xs"><HighlightText text={actionStr} query={q} /></span>
                        {entityName && <span className="font-mono text-xs font-bold truncate max-w-[140px]" style={{ color: c.primary }}><HighlightText text={entityName} query={q} /></span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span style={{ color: c.primary }} className="opacity-70">{getActionIcon(actionType)}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border" style={{ backgroundColor: `rgba(${c.rgb}, 0.1)`, borderColor: `rgba(${c.rgb}, 0.25)`, color: c.primary }}><HighlightText text={entityType} query={q} /></span>
                        {wsSlug && <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border" style={{ backgroundColor: `rgba(${c.rgb}, 0.1)`, borderColor: `rgba(${c.rgb}, 0.25)`, color: c.primary }}><HighlightText text={wsSlug} query={q} /></span>}
                        <span className="text-[10px] text-gray-600 font-mono ml-auto flex-shrink-0">{relativeTime(createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasMore && !debouncedSearch && (
                <div className="pt-3 pb-1">
                  <button onClick={handleLoadMore} disabled={loadingMore} className="w-full py-2.5 text-xs font-mono font-bold text-cyan-400 border border-cyan-500/25 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loadingMore ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" /></svg> Loading older activities...</> : <><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></svg> Load More</>}
                  </button>
                </div>
              )}
              {!hasMore && activities.length > 0 && !debouncedSearch && (
                <div className="pt-3 pb-1 text-center">
                  <span className="text-[10px] font-mono text-gray-700 uppercase tracking-wider">All activities loaded</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-4 py-3 border-t border-cyan-500/10 bg-gradient-to-r from-black via-cyan-950/5 to-black">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider flex-shrink-0">
              {filteredActivities.length}{debouncedSearch ? ` of ${activities.length}` : ''}{!debouncedSearch && hasMore ? '+' : ''} {filteredActivities.length === 1 ? 'activity' : 'activities'} loaded
              {myActivityOnly ? ' (yours)' : ''}{selectedWorkspace ? ` in ${selectedWorkspace}` : ''}{datePreset !== 'all' ? ` \u2022 ${formatDateRangeLabel(datePreset, customStartDate, customEndDate)}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadCSV} disabled={filteredActivities.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Download displayed activities as CSV">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> CSV
              </button>
              <button onClick={() => { setOffset(0); setHasMore(true); loadActivities(myActivityOnly, selectedWorkspace, computedStartDate, computedEndDate, 0, false); }} className="px-3 py-1.5 text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-all">Refresh</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ═══════════════ MAIN COMPONENT ═══════════════
const QuantumBalltool: React.FC<QuantumBalltoolProps> = ({
  onOpenActivity, onOpenStatus, onOpenTask, onOpenEvent, onOpenProject, onOpenMicrophone,
  onOpenMessages, onOpenWorkflow, onOpenFullActivity, onNavigateToMiniApp,
  currentView = 'home', currentWorkspace, currentMiniApp,
  availableWorkspaces = ['admin', 'accounting', 'personnel', 'main', 'data', 'security'],
  availableMiniApps = [], workspaceColor,
}) => {
  const { user, isPlatformOwner, isOrganizationAdmin, organization } = useAuth();
  
  const { getColor } = useWorkspaceColor(); 
  
  const activeWsColor = useMemo(() => {
    // 1. If a workspace is active, use its specific theme color
    if (currentWorkspace) return getColor(currentWorkspace);
    
    // 2. Otherwise, fall back to the Organization's primary color
    const primary = organization?.primary_color || '#06b6d4';
    const [r, g, b] = parseColor(primary);
    
    // 3. Return an object matching the WorkspaceColor structure 
    // so the ball's lerping animations don't break
    return {
      primary: primary,
      dark: primary,
      rgb: `${r},${g},${b}`
    };
  }, [currentWorkspace, getColor, organization?.primary_color]);
  
  const targetWsC = useMemo(() => ({
    border: `rgba(${activeWsColor.rgb},0.7)`,
    glow1: `rgba(${activeWsColor.rgb},0.5)`,
    glow2: `rgba(${activeWsColor.rgb},0.2)`,
    ring: `rgba(${activeWsColor.rgb},0.6)`,
    core1: activeWsColor.primary,
    core2: activeWsColor.dark,
    ringBright: `rgba(${activeWsColor.rgb},0.8)`
  }), [activeWsColor.rgb, activeWsColor.primary, activeWsColor.dark]);

  const isAdmin = isPlatformOwner() || isOrganizationAdmin();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';

  // Context Menu & User Color States
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean, x: number, y: number, buttonId: string } | null>(null);
  const [userNavColors, setUserNavColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.schema('app_private')
          .from('user_preferences')
          .select('nav_colors')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.nav_colors) setUserNavColors(data.nav_colors);
      } catch (err) {}
    };
    fetchUserPreferences();
  }, [user]);

  const handleColorSelect = async (colorKey: string) => {
    if (!contextMenu || !user) return;

    const updatedColors = { ...userNavColors };
    if (colorKey === 'default') {
      delete updatedColors[contextMenu.buttonId];
    } else {
      updatedColors[contextMenu.buttonId] = colorKey;
    }

    setUserNavColors(updatedColors);
    setContextMenu(null);

    try {
      await supabase.schema('app_private')
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          nav_colors: updatedColors,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Failed to save user nav color', err);
    }
  };

  const getToolColors = (tool: ToolItem) => {
    const customKey = userNavColors[tool.id];
    if (customKey && COLOR_PALETTE[customKey]) {
      return {
        color: COLOR_PALETTE[customKey].color,
        glowColor: `rgba(${COLOR_PALETTE[customKey].rgb}, 1)`,
        lightColor: `rgba(${COLOR_PALETTE[customKey].rgb}, 0.3)`
      };
    }
    return { color: tool.color, glowColor: tool.glowColor, lightColor: tool.lightColor };
  };

  const R = 100, ballSz = 56, bubSz = 44, bubBig = 78;
  const MOVE_TH = 6, SNAP_TH = 0.5, LP_MS = 500, CLICK_DB = 120;

  const defPos = { x: window.innerWidth - 60, y: window.innerHeight - 120 };
  const LS_DOCKED = 'quantum-ball-docked';
  const [position, setPosition] = useState<Position>(clamp(loadLS(LS_POS, defPos), ballSz));
  const [isDocked, setIsDocked] = useState<boolean>(() => loadLS(LS_DOCKED, false));
  const isDockedRef = useRef(isDocked);
  useEffect(() => { isDockedRef.current = isDocked; }, [isDocked]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandAnim, setExpandAnim] = useState<'idle' | 'expanding' | 'collapsing'>('idle');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(loadLS(LS_TOOL, null));
  const [longPressMenu, setLongPressMenu] = useState<{ toolId: string; x: number; y: number } | null>(null);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [showFavoritesPanel, setShowFavoritesPanel] = useState(false);
  const [showPhoneMirror, setShowPhoneMirror] = useState(false);
  const [showEmailMirror, setShowEmailMirror] = useState(false);
  const [showScannerPanel, setShowScannerPanel] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);

  const [isSnappingToTool, setIsSnappingToTool] = useState(false);
  const pendingFireToolRef = useRef<string | null>(null);
  const suppressBadgeRef = useRef(false);

  const [reportStep, setReportStep] = useState<'source' | 'chart' | 'pin'>('source');
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('donut');
  const [reportName, setReportName] = useState('');
  const [pinnedDashboard, setPinnedDashboard] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);

  const rotRef = useRef(loadLS(LS_ROT, 0));
  const velRef = useRef(0);
  const animRef = useRef(0);
  const orbitRef = useRef<HTMLDivElement>(null);
  const bubRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<HTMLDivElement>(null);
  const dotAngle = useRef(0);
  const snapping = useRef(false);
  const snapTarget = useRef(0);
  const snapProg = useRef(0);
  const snapStart = useRef(0);

  const badgeSvgRef = useRef<SVGSVGElement>(null);
  const badgePath1Ref = useRef<SVGPathElement>(null);
  const badgePath2Ref = useRef<SVGPathElement>(null);
  const badgeDot1Ref = useRef<SVGCircleElement>(null);
  const badgeDot2Ref = useRef<SVGCircleElement>(null);
  const badgeLabelRef = useRef<HTMLDivElement>(null);
  const badgeToolRef = useRef<string | null>(null);
  const badgeKeyRef = useRef(0);

  const forceRecalcRef = useRef(false);

  const [badgeToolId, setBadgeToolId] = useState<string | null>(null);
  const [badgeKey, setBadgeKey] = useState(0);

  const interRef = useRef<'none' | 'drag-ball' | 'spin'>('none');
  const pStartRef = useRef<Position>({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const dragOff = useRef<Position>({ x: 0, y: 0 });
  const spinStartA = useRef(0);
  const spinStartR = useRef(0);
  const lastA = useRef(0);
  const lastT = useRef(0);
  const posRef = useRef(position);
  posRef.current = position;

  const lpTimer = useRef<any>(null);
  const lpFired = useRef(false);
  const lastClick = useRef(0);
  const expandTimer = useRef<any>(null);

  const savePosDb = useRef(debounce((p: Position) => saveLS(LS_POS, p), 300)).current;
  const saveRotDb = useRef(debounce((r: number) => saveLS(LS_ROT, r), 500)).current;

  // --- DOCKING LOGIC ---
  useEffect(() => {
    const handleDockToggle = () => {
      setIsDocked(prev => {
        const next = !prev;
        saveLS(LS_DOCKED, next);
        return next;
      });
    };
    window.addEventListener('toggle-qball-dock', handleDockToggle);
    return () => window.removeEventListener('toggle-qball-dock', handleDockToggle);
  }, []);

  useEffect(() => {
    if (!isDocked) return;
    
    const updateDockPosition = () => {
      const target = document.getElementById('qball-dock-target');
      if (target) {
        const rect = target.getBoundingClientRect();
        // Snap the center of the ball directly over the center of the dock target
        const newPos = {
          x: rect.left + rect.width / 2 - ballSz / 2,
          y: rect.top + rect.height / 2 - ballSz / 2
        };
        setPosition(newPos);
        posRef.current = newPos;
        savePosDb(newPos);
      }
    };

    updateDockPosition();
    
    // Track dynamic layout shifts and resizing
    window.addEventListener('resize', updateDockPosition);
    const observer = new MutationObserver(updateDockPosition);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('resize', updateDockPosition);
      observer.disconnect();
    };
  }, [isDocked, ballSz, savePosDb, isExpanded]);

  const vis = useMemo(() => tools.filter(t => !t.adminOnly || isAdmin), [isAdmin]);
  const N = vis.length;

  const [wsC, setWsC] = useState<WsColorSet>(targetWsC);
  const prevWsRef = useRef(currentWorkspace);
  const prevColorRef = useRef(targetWsC.core1); 
  const colorAnimRef = useRef<number>(0);

  // ⚡ FIX: Use a ref to capture `wsC` so it doesn't constantly break our color animations 
  const wsCRef = useRef(wsC);
  useEffect(() => {
    wsCRef.current = wsC;
  }, [wsC]);

  useEffect(() => {
    if (prevWsRef.current === currentWorkspace && prevColorRef.current === targetWsC.core1) return;
    
    // We capture the current animated color without adding wsC to the dependency array
    const fromColors = wsCRef.current; 
    const toColors = targetWsC; 
    
    prevWsRef.current = currentWorkspace;
    prevColorRef.current = targetWsC.core1;

    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const interpolated = lerpColorSet(fromColors, toColors, eased);
      
      setWsC(interpolated);
      
      if (t < 1) {
        colorAnimRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(colorAnimRef.current);
    colorAnimRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(colorAnimRef.current);
  }, [currentWorkspace, targetWsC]); // ⚡ Removed wsC dependency to prevent loop cancellation

  const getViewAngle = useCallback(() => {
    const p = posRef.current;
    const cx = p.x + ballSz / 2, cy = p.y + ballSz / 2;
    const a = Math.atan2(window.innerHeight / 2 - cy, window.innerWidth / 2 - cx) * (180 / Math.PI);
    return ((a % 360) + 360) % 360;
  }, []);

  const getBubPos = useCallback((i: number, rot: number) => {
    const deg = (360 / N) * i + rot;
    const rad = (deg * Math.PI) / 180;
    const p = posRef.current;
    const eScale = isDockedRef.current ? 0.6 : 1;
    return { x: p.x + ballSz / 2 + Math.cos(rad) * (R * eScale), y: p.y + ballSz / 2 + Math.sin(rad) * (R * eScale), deg };
  }, [N]);

  const getViewIdx = useCallback((rot: number) => {
    const va = getViewAngle();
    let best = 0, bestD = Infinity;
    for (let i = 0; i < N; i++) {
      const a = (((360 / N) * i + rot) % 360 + 360) % 360;
      let d = Math.abs(a - va); if (d > 180) d = 360 - d;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }, [N, getViewAngle]);

  const getSnapRot = useCallback((idx: number) => {
    const va = getViewAngle();
    let target = va - (360 / N) * idx;
    const cur = rotRef.current;
    while (target - cur > 180) target -= 360;
    while (target - cur < -180) target += 360;
    return target;
  }, [N, getViewAngle]);

  const hitBubble = useCallback((cx: number, cy: number): string | null => {
    const eScale = isDockedRef.current ? 0.6 : 1;
    const hr = (bubBig / 2 + 28) * eScale;
    let bestId: string | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < vis.length; i++) {
      if (isDockedRef.current) {
        const aDeg = (360 / vis.length) * i;
        let vAngle = (aDeg + rotRef.current) % 360;
        if (vAngle < 0) vAngle += 360;
        if (vAngle > 175 || vAngle < 5) continue; // Skip hidden bubbles in the top half
      }
      const { x, y } = getBubPos(i, rotRef.current);
      const dist = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = vis[i].id;
      }
    }

    return bestDist <= hr ? bestId : null;
  }, [vis, getBubPos]);

  const nearestBubble = useCallback((cx: number, cy: number): { id: string; dist: number } | null => {
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < vis.length; i++) {
      if (isDockedRef.current) {
        const aDeg = (360 / vis.length) * i;
        let vAngle = (aDeg + rotRef.current) % 360;
        if (vAngle < 0) vAngle += 360;
        if (vAngle > 175 || vAngle < 5) continue; // Skip hidden bubbles in the top half
      }
      const { x, y } = getBubPos(i, rotRef.current);
      const d = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (d < bestDist) { bestDist = d; bestId = vis[i].id; }
    }
    return bestId ? { id: bestId, dist: bestDist } : null;
  }, [vis, getBubPos]);

  const getCXY = useCallback(() => {
    const p = posRef.current;
    return { cx: p.x + ballSz / 2, cy: p.y + ballSz / 2 };
  }, []);

  const getPAngle = useCallback((cx: number, cy: number) => {
    const { cx: bx, cy: by } = getCXY();
    return Math.atan2(cy - by, cx - bx) * (180 / Math.PI);
  }, [getCXY]);

  const updateBadgePosition = useCallback((rot: number) => {
    const tid = badgeToolRef.current;
    if (!tid) return;
    const toolIdx = vis.findIndex(t => t.id === tid);
    if (toolIdx === -1) return;
    const { x: bx, y: by } = getBubPos(toolIdx, rot);
    const p = posRef.current;
    const cx = p.x + ballSz / 2, cy = p.y + ballSz / 2;
    const eScale = isDockedRef.current ? 0.6 : 1;
    const br = (bubBig / 2) * eScale;
    const dx = bx - cx, dy = by - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dist > 0 ? dx / dist : 0, ny = dist > 0 ? dy / dist : -1;
    const lsx = bx + nx * (br + 4), lsy = by + ny * (br + 4);
    
    const goUp = by < cy; 
    const goRight = bx >= cx; 
    
    const diagLen = 40;
    const diagX = lsx + (goRight ? diagLen : -diagLen);
    const diagY = lsy + (goUp ? -diagLen : diagLen);
    
    const horizLen = 50;
    const endX = diagX + (goRight ? horizLen : -horizLen);
    const endY = diagY;
    
    const elbowPath = `M ${lsx},${lsy} L ${diagX},${diagY} L ${endX},${endY}`;
    if (badgePath1Ref.current) { badgePath1Ref.current.setAttribute('d', elbowPath); }
    if (badgePath2Ref.current) { badgePath2Ref.current.setAttribute('d', elbowPath); }
    if (badgeDot1Ref.current) { badgeDot1Ref.current.setAttribute('cx', String(lsx)); badgeDot1Ref.current.setAttribute('cy', String(lsy)); }
    if (badgeDot2Ref.current) { badgeDot2Ref.current.setAttribute('cx', String(endX)); badgeDot2Ref.current.setAttribute('cy', String(endY)); }
    if (badgeLabelRef.current) {
      const badgeEl = badgeLabelRef.current;
      const badgeWidth = badgeEl.offsetWidth || 80; 
      const badgeHeight = badgeEl.offsetHeight || 30; 
      const offsetX = goRight ? endX + (badgeWidth / 2) + 4 : endX - (badgeWidth / 2) - 4;
      const offsetY = endY;
      badgeEl.style.left = `${offsetX}px`; 
      badgeEl.style.top = `${offsetY}px`;
      badgeEl.style.setProperty('--badge-slide-dir', goRight ? '-40px' : '40px');
    }
  }, [vis, getBubPos]);

  const fireTool = useCallback((toolId: string) => {
    setShowReportBuilder(false); setShowWorkflowBuilder(false); setShowPhoneMirror(false); setShowEmailMirror(false); setShowScannerPanel(false); setShowActivityPanel(false); setShowFavoritesPanel(false);

    setSelectedTool(toolId); setActiveTool(toolId); setExpandAnim('collapsing');
    badgeToolRef.current = null; setBadgeToolId(null); setLongPressMenu(null); setIsSnappingToTool(false);
    pendingFireToolRef.current = null;
    if (expandTimer.current) clearTimeout(expandTimer.current);
    expandTimer.current = setTimeout(() => { setIsExpanded(false); setExpandAnim('idle'); }, 350);
    switch (toolId) {
      case 'favorites': setShowFavoritesPanel(true); break;
      case 'activity': onOpenActivity(); break;
      case 'status': console.log('Status triggered!'); onOpenStatus(); break;
      case 'task': console.log('Task triggered!'); onOpenTask(); break;
      case 'event': console.log('Event triggered!'); onOpenEvent(); break;
      case 'microphone': console.log('Microphone triggered!'); onOpenMicrophone(); break;
      case 'scanner': setShowScannerPanel(true); break;
      case 'phone-mirror': setShowPhoneMirror(true); break;
      case 'email-mirror': setShowEmailMirror(true); break;
      case 'workflow': setShowWorkflowBuilder(true); break;
      case 'report': setShowReportBuilder(true); setReportStep('source'); setSelectedDataSource(''); setSelectedChartType('donut'); setReportName(''); setPinnedDashboard(''); break;
    }
    setTimeout(() => setSelectedTool(null), 300);
  }, [onOpenActivity, onOpenStatus, onOpenTask, onOpenEvent, onOpenMicrophone]);

  const snapAndFire = useCallback((toolId: string) => {
    fireTool(toolId);
  }, [fireTool]);

  useEffect(() => {
    let running = true;
    let lastBadgeIdx = -1;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const loop = () => {
      if (!running) return;

      if (forceRecalcRef.current) {
        forceRecalcRef.current = false;
        lastBadgeIdx = -1; 
      }

      if (snapping.current) {
        snapProg.current += 0.025;
        if (snapProg.current >= 1) {
          snapProg.current = 1; snapping.current = false;
          if (pendingFireToolRef.current) {
            const toolId = pendingFireToolRef.current;
            setTimeout(() => fireTool(toolId), 50);
          }
        }
        rotRef.current = snapStart.current + (snapTarget.current - snapStart.current) * easeOut(snapProg.current);
        velRef.current = 0;
      } else if (interRef.current !== 'spin' && Math.abs(velRef.current) > 0.01) {
        rotRef.current += velRef.current;
        velRef.current *= 0.965;
        if (Math.abs(velRef.current) < SNAP_TH && Math.abs(velRef.current) > 0.01) {
          const idx = getViewIdx(rotRef.current);
          snapping.current = true; snapStart.current = rotRef.current; snapTarget.current = getSnapRot(idx); snapProg.current = 0; velRef.current = 0;
        }
        if (Math.abs(velRef.current) < 0.01) velRef.current = 0;
      }

      const rot = rotRef.current;
      saveRotDb(rot);
      if (orbitRef.current) orbitRef.current.style.transform = `rotate(${rot}deg) ${isDockedRef.current ? 'scale(0.6)' : 'scale(1)'}`;
      bubRefs.current.forEach((el, i) => { 
        if (!el) return;
        el.style.transform = `rotate(${-rot}deg)`; 
        
        if (isDockedRef.current) {
          const aDeg = (360 / vis.length) * i;
          let vAngle = (aDeg + rot) % 360;
          if (vAngle < 0) vAngle += 360;
          
          if (vAngle > 180 && vAngle < 360) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          } else {
            let op = 1;
            const distFromCenter = Math.abs(vAngle - 90);
            if (distFromCenter > 50) {
              op = Math.max(0, 1 - (distFromCenter - 50) / 40);
            }
            el.style.opacity = op.toString();
            el.style.pointerEvents = 'none'; // Fixed: Allow wheel drag directly on bubbles
          }
        } else {
          el.style.opacity = '1';
          el.style.pointerEvents = 'none'; // Fixed: Allow wheel drag directly on bubbles
        }
      });

      if (isExpanded && expandAnim === 'idle') {
        updateBadgePosition(rot);
        const topIdx = getViewIdx(rot);
        if (topIdx !== lastBadgeIdx) {
          lastBadgeIdx = topIdx;
          const tool = vis[topIdx];
          if (tool) { badgeToolRef.current = tool.id; setBadgeToolId(tool.id); setBadgeKey(k => k + 1); }
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    if (isExpanded || expandAnim !== 'idle') { lastBadgeIdx = -1; animRef.current = requestAnimationFrame(loop); }
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [isExpanded, expandAnim, getViewIdx, getSnapRot, vis, saveRotDb, updateBadgePosition, fireTool]);

  useEffect(() => {
    if (isExpanded || expandAnim !== 'idle') return;
    let running = true;
    const anim = () => {
      if (!running) return;
      dotAngle.current = (dotAngle.current + 1.2) % 360;
      if (dotRef.current) {
        const rad = (dotAngle.current * Math.PI) / 180;
        const r = ballSz / 2 + 10;
        dotRef.current.style.left = `${ballSz / 2 + Math.cos(rad) * r - 5}px`;
        dotRef.current.style.top = `${ballSz / 2 + Math.sin(rad) * r - 5}px`;
      }
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
    return () => { running = false; };
  }, [isExpanded, expandAnim]);

  const layoutTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const roDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reclampAndSignal = useCallback(() => {
    if (isDocked) return; // Prevent clamping from fighting the fixed dock position
    const clamped = clamp(posRef.current, ballSz);
    const moved = clamped.x !== posRef.current.x || clamped.y !== posRef.current.y;
    if (moved) {
      posRef.current = clamped;
      setPosition(clamped);
      savePosDb(clamped);
    }
  }, [savePosDb, isDocked]);

  useEffect(() => {
    layoutTimersRef.current.forEach(clearTimeout);
    layoutTimersRef.current = [];

    reclampAndSignal();

    const delays = [50, 150, 350, 600];
    delays.forEach(ms => {
      const t = setTimeout(() => {
        reclampAndSignal();
      }, ms);
      layoutTimersRef.current.push(t);
    });

    return () => {
      layoutTimersRef.current.forEach(clearTimeout);
      layoutTimersRef.current = [];
    };
  }, [currentWorkspace, currentView, reclampAndSignal]);

  useEffect(() => {
    const handleResize = () => {
      reclampAndSignal();
    };

    const handleResizeObserved = () => {
      if (roDebounceRef.current) clearTimeout(roDebounceRef.current);
      roDebounceRef.current = setTimeout(() => {
        reclampAndSignal();
      }, 30); 
    };

    let resizeObserver: ResizeObserver | null = null;
    try {
      resizeObserver = new ResizeObserver(handleResizeObserved);
      resizeObserver.observe(document.body);
      resizeObserver.observe(document.documentElement);
      const rootEl = document.getElementById('root');
      if (rootEl) resizeObserver.observe(rootEl);
    } catch (e) {}

    const handleTransitionEnd = (e: TransitionEvent) => {
      const prop = e.propertyName;
      if (prop === 'width' || prop === 'transform' || prop === 'margin-left' || prop === 'margin-right' || prop === 'padding-left' || prop === 'left') {
        reclampAndSignal();
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('transitionend', handleTransitionEnd);
      if (resizeObserver) resizeObserver.disconnect();
      if (roDebounceRef.current) clearTimeout(roDebounceRef.current);
    };
  }, [reclampAndSignal]);

  useEffect(() => {
    if (!isExpanded || expandAnim === 'collapsing') { badgeToolRef.current = null; setBadgeToolId(null); setLongPressMenu(null); }
  }, [isExpanded, expandAnim]);

  useEffect(() => {
    if (!longPressMenu) return;
    const h = () => setLongPressMenu(null);
    const t = setTimeout(() => window.addEventListener('pointerdown', h, { once: true }), 100);
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', h); };
  }, [longPressMenu]);

  const clearLP = useCallback(() => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } lpFired.current = false; }, []);

  const bubVisRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pressedBubElRef = useRef<HTMLDivElement | null>(null);
  const pressedOrigBoxShadow = useRef('');
  const pressedOrigTransform = useRef('');

  const releasePressedBubble = useCallback(() => {
    const el = pressedBubElRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.12s ease-out, box-shadow 0.12s ease-out';
    el.style.transform = pressedOrigTransform.current || 'scale(1)';
    el.style.boxShadow = pressedOrigBoxShadow.current;
    setTimeout(() => { if (el) el.style.transition = ''; }, 130);
    pressedBubElRef.current = null;
  }, []);

  const hitBubbleOnDownRef = useRef<string | null>(null);

  const WHEEL_SENSITIVITY = 0.08;
  const handleWheel = useCallback((e: React.WheelEvent | WheelEvent) => {
    if (!isExpanded || expandAnim !== 'idle') return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY * WHEEL_SENSITIVITY;
    rotRef.current += delta;
    velRef.current = 0; 
    snapping.current = false; 
    if ((handleWheel as any)._snapTimer) clearTimeout((handleWheel as any)._snapTimer);
    (handleWheel as any)._snapTimer = setTimeout(() => {
      const idx = getViewIdx(rotRef.current);
      snapping.current = true;
      snapStart.current = rotRef.current;
      snapTarget.current = getSnapRot(idx);
      snapProg.current = 0;
    }, 150);
  }, [isExpanded, expandAnim, getViewIdx, getSnapRot]);

  const handleDown = useCallback((cx: number, cy: number, isBall: boolean) => {
    if (isSnappingToTool) return; 
    pStartRef.current = { x: cx, y: cy }; movedRef.current = false; clearLP(); lpFired.current = false; setLongPressMenu(null);
    hitBubbleOnDownRef.current = null; 

    if (isExpanded && expandAnim === 'idle') {
      const hitId = hitBubble(cx, cy);
      if (hitId) {
        hitBubbleOnDownRef.current = hitId; 
        const idx = vis.findIndex(t => t.id === hitId);
        if (idx >= 0) {
          const visEl = bubVisRefs.current[idx];
          if (visEl) {
            const toolColors = getToolColors(vis[idx]);
            pressedBubElRef.current = visEl;
            pressedOrigBoxShadow.current = visEl.style.boxShadow;
            pressedOrigTransform.current = visEl.style.transform;
            visEl.style.transition = 'none';
            visEl.style.transform = 'scale(0.85)';
            visEl.style.boxShadow = `0 0 38px ${toolColors.color}CC, 0 0 68px ${toolColors.color}55, 0 0 12px ${toolColors.color}FF`;
          }
        }
      }
    }

    if (isBall || !isExpanded) {
      interRef.current = 'drag-ball'; dragOff.current = { x: cx - posRef.current.x, y: cy - posRef.current.y };
    } else {
      interRef.current = 'spin'; velRef.current = 0; snapping.current = false;
      const a = getPAngle(cx, cy); spinStartA.current = a; spinStartR.current = rotRef.current; lastA.current = a; lastT.current = performance.now();
      if (hitBubbleOnDownRef.current) {
        lpTimer.current = setTimeout(() => {
          lpFired.current = true;
          const hitId = hitBubbleOnDownRef.current;
          if (hitId) {
            const idx = vis.findIndex(t => t.id === hitId);
            if (idx >= 0) { const { x, y } = getBubPos(idx, rotRef.current); setLongPressMenu({ toolId: hitId, x, y }); }
          }
        }, LP_MS);
      }
    }
  }, [isExpanded, expandAnim, isSnappingToTool, getPAngle, hitBubble, clearLP, vis, getBubPos]);

  const handleMove = useCallback((cx: number, cy: number) => {
    if (interRef.current === 'none') return;
    const dx = cx - pStartRef.current.x, dy = cy - pStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_TH) { movedRef.current = true; clearLP(); releasePressedBubble(); }

    if (interRef.current === 'drag-ball') {
      if (!movedRef.current) return;
      
      // Release dock state immediately on drag using live ref
      if (isDockedRef.current) {
        setIsDocked(false);
        saveLS(LS_DOCKED, false);
      }

      // Highlight dock target if in vicinity
      const target = document.getElementById('qball-dock-target');
      if (target) {
        const headerCenter = { x: window.innerWidth / 2, y: 32 }; // 32 is roughly the center of the 64px header
        const dist = Math.sqrt((cx - headerCenter.x)**2 + (cy - headerCenter.y)**2);
        if (dist < 70) {
          target.style.opacity = '1';
          target.style.transform = 'translate(-50%, -50%) scale(1)';
        } else {
          target.style.opacity = '0';
          target.style.transform = 'translate(-50%, -50%) scale(0.6)';
        }
      }

      const rawX = cx - dragOff.current.x;
      const rawY = cy - dragOff.current.y;
      const { pos: c, clampedX, clampedY } = edgeMagnetClamp({ x: rawX, y: rawY }, ballSz);
      if (clampedX) {
        dragOff.current.x = cx - c.x;
      }
      if (clampedY) {
        dragOff.current.y = cy - c.y;
      }
      setPosition(c); savePosDb(c);
    } else if (interRef.current === 'spin') {
      const a = getPAngle(cx, cy); const now = performance.now();
      let ad = a - lastA.current; if (ad > 180) ad -= 360; if (ad < -180) ad += 360;
      const td = now - lastT.current;
      if (td > 0 && Math.abs(ad) < 90) velRef.current = (ad / td) * 16;
      let td2 = a - spinStartA.current; if (td2 > 180) td2 -= 360; if (td2 < -180) td2 += 360;
      rotRef.current = spinStartR.current + td2; lastA.current = a; lastT.current = now;
    }
  }, [getPAngle, clearLP, savePosDb]);

  const snapBackToViewport = useCallback(() => {
    const clamped = clamp(posRef.current, ballSz);
    if (clamped.x === posRef.current.x && clamped.y === posRef.current.y) return;
    const startPos = { ...posRef.current };
    const startTime = performance.now();
    const duration = 180; 
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const et = easeOut(t);
      const newPos = {
        x: startPos.x + (clamped.x - startPos.x) * et,
        y: startPos.y + (clamped.y - startPos.y) * et,
      };
      posRef.current = newPos;
      setPosition(newPos);
      if (t < 1) requestAnimationFrame(animate);
      else savePosDb(clamped);
    };
    requestAnimationFrame(animate);
  }, [savePosDb]);

  const handleUp = useCallback((cx: number, cy: number) => {
    releasePressedBubble(); 
    const type = interRef.current; const moved = movedRef.current;
    const storedHitBubble = hitBubbleOnDownRef.current; 
    interRef.current = 'none'; clearLP();
    hitBubbleOnDownRef.current = null; 

    if (lpFired.current) { lpFired.current = false; snapBackToViewport(); return; }
    if (isSnappingToTool) return; 
    const now = Date.now();
    if (now - lastClick.current < CLICK_DB) return;

    if (type === 'drag-ball' && moved) {
      // Hide dock target visually
      const target = document.getElementById('qball-dock-target');
      if (target) {
        target.style.opacity = '0';
        target.style.transform = 'translate(-50%, -50%) scale(0.6)';
      }

      // Check proximity for drop-to-dock
      const headerCenter = { x: window.innerWidth / 2, y: 32 };
      const dist = Math.sqrt((cx - headerCenter.x)**2 + (cy - headerCenter.y)**2);
      
      if (dist < 70) {
        setIsDocked(true);
        saveLS(LS_DOCKED, true);
        if (target) {
          const rect = target.getBoundingClientRect();
          const newPos = {
            x: rect.left + rect.width / 2 - ballSz / 2,
            y: rect.top + rect.height / 2 - ballSz / 2
          };
          setPosition(newPos);
          posRef.current = newPos;
          savePosDb(newPos);
        }
        return; // Break early so we don't snap back to viewport edges
      }

      snapBackToViewport();
    }

    if (type === 'spin' && moved) {
      if (Math.abs(velRef.current) < 2.5) {
        velRef.current = 0;
        const idx = getViewIdx(rotRef.current);
        snapping.current = true;
        snapStart.current = rotRef.current;
        snapTarget.current = getSnapRot(idx);
        snapProg.current = 0;
      }
    }

    if (!moved) {
      if (type === 'drag-ball') {
        lastClick.current = now;
        if (expandTimer.current) { clearTimeout(expandTimer.current); expandTimer.current = null; }
        if (isExpanded && expandAnim === 'idle') {
          const { cx: bcx, cy: bcy } = getCXY();
          const distToCenter = Math.sqrt((cx - bcx) ** 2 + (cy - bcy) ** 2);
          
          let hitId = null;
          
          if (distToCenter > ballSz / 2 + 15) {
            hitId = hitBubble(cx, cy) || storedHitBubble;
            
            if (!hitId) {
              const nearest = nearestBubble(cx, cy);
              const eScale = isDockedRef.current ? 0.6 : 1;
              if (nearest && nearest.dist <= (R * eScale) - ballSz / 2 + (bubBig * eScale) / 2 + 12) {
                hitId = nearest.id;
              }
            }
          }

          if (hitId) {
            snapAndFire(hitId);
            return;
          }
          
          setExpandAnim('collapsing'); badgeToolRef.current = null; setBadgeToolId(null); setLongPressMenu(null);
          expandTimer.current = setTimeout(() => { setIsExpanded(false); setExpandAnim('idle'); }, 350);
        } else if (!isExpanded && expandAnim === 'idle') {
          
          const topIdx = getViewIdx(rotRef.current);
          if (vis[topIdx]) {
            badgeToolRef.current = vis[topIdx].id;
            setBadgeToolId(vis[topIdx].id);
          }

          setExpandAnim('expanding'); setIsExpanded(true); setLongPressMenu(null);
          expandTimer.current = setTimeout(() => setExpandAnim('idle'), 400);
        }
      } else if (type === 'spin') {
        let hitId = hitBubble(cx, cy) || storedHitBubble;
        if (!hitId) {
          const nearest = nearestBubble(cx, cy);
          const eScale = isDockedRef.current ? 0.6 : 1;
          if (nearest && nearest.dist <= (R * eScale) + (bubBig * eScale) / 2 + 15) {
            hitId = nearest.id;
          }
        }
        if (hitId) {
          snapAndFire(hitId);
        }
      }
    }
  }, [isExpanded, expandAnim, isSnappingToTool, hitBubble, nearestBubble, snapAndFire, clearLP, snapBackToViewport, getViewIdx, getSnapRot]);

  useEffect(() => {
    const mm = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const mu = (e: MouseEvent) => handleUp(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => { if (interRef.current !== 'none' && e.touches.length > 0) { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); } };
    const te = (e: TouchEvent) => {
      if (interRef.current === 'none') return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (t) handleUp(t.clientX, t.clientY);
    };
    const tc = () => {
      if (interRef.current !== 'none') {
        const wasDragging = interRef.current === 'drag-ball' && movedRef.current;
        interRef.current = 'none'; clearLP(); movedRef.current = false; hitBubbleOnDownRef.current = null;
        releasePressedBubble();
        if (wasDragging) snapBackToViewport();
      }
    };
    const ml = () => {
      if (interRef.current !== 'none') {
        const wasDragging = interRef.current === 'drag-ball' && movedRef.current;
        interRef.current = 'none'; clearLP(); movedRef.current = false; hitBubbleOnDownRef.current = null;
        releasePressedBubble();
        if (wasDragging) snapBackToViewport();
      }
    };
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
    window.addEventListener('touchmove', tm, { passive: false }); window.addEventListener('touchend', te, { passive: false });
    window.addEventListener('touchcancel', tc);
    document.addEventListener('mouseleave', ml); window.addEventListener('blur', ml);
    return () => {
      window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu);
      window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te);
      window.removeEventListener('touchcancel', tc);
      document.removeEventListener('mouseleave', ml); window.removeEventListener('blur', ml);
    };
  }, [handleMove, handleUp, clearLP, releasePressedBubble, snapBackToViewport]);

  const getDataSources = useCallback(() => {
    const s: { id: string; label: string; category: string }[] = [];
    if (currentView === 'home') { s.push({ id: 'all_tasks', label: 'All Tasks', category: 'Global' }, { id: 'all_projects', label: 'All Projects', category: 'Global' }); availableWorkspaces.forEach(ws => s.push({ id: `ws_${ws}_tasks`, label: `${ws} Tasks`, category: 'Workspaces' })); }
    else if (currentView === 'workspace' && currentWorkspace) { s.push({ id: `ws_${currentWorkspace}_tasks`, label: 'Workspace Tasks', category: 'Current' }); }
    return s;
  }, [currentView, currentWorkspace, availableWorkspaces]);

  const getPinnableDashboards = useCallback(() => {
    const d = [{ id: 'home', label: 'Home Dashboard' }];
    availableWorkspaces.forEach(ws => d.push({ id: `ws_${ws}`, label: `${ws.charAt(0).toUpperCase() + ws.slice(1)} Workspace` }));
    return d;
  }, [availableWorkspaces]);

  useEffect(() => { if (selectedDataSource) setPreviewData([{ label: 'Active', value: Math.floor(Math.random() * 50) + 20 }, { label: 'Pending', value: Math.floor(Math.random() * 30) + 10 }, { label: 'Completed', value: Math.floor(Math.random() * 40) + 15 }, { label: 'Overdue', value: Math.floor(Math.random() * 15) + 5 }]); }, [selectedDataSource]);

  const handleCreateReport = () => { console.log('Creating report'); setShowReportBuilder(false); };

  const renderChartPreview = () => {
    const cp = { data: previewData, width: 200, height: 150, animate: true };
    switch (selectedChartType) {
      case 'donut': return <DonutChart {...cp} />; case 'pie': return <PieGraph {...cp} />; case 'bar': return <BarChart {...cp} />;
      case 'line': return <LineGraph {...cp} showArea />; case 'gantt': return <GanttChart tasks={[{ id: '1', name: 'Task 1', start: 0, duration: 40, progress: 75 }]} width={200} height={120} />;
      case 'wave': return <WaveChart data={Array.from({ length: 30 }, () => Math.random() * 100)} width={200} height={100} />; default: return null;
    }
  };

  const bcx = position.x + ballSz / 2, bcy = position.y + ballSz / 2;
  const activeColor = activeTool ? getToolColors(tools.find(t => t.id === activeTool) || tools[0]).color : wsC.core1;
  const badgeToolData = badgeToolId ? vis.find(t => t.id === badgeToolId) : null;
  const badgeColors = badgeToolData ? getToolColors(badgeToolData) : null;

  return (
    <>
      {isExpanded && expandAnim === 'idle' && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9995, touchAction: 'none' }}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            releasePressedBubble();
            setExpandAnim('collapsing');
            badgeToolRef.current = null;
            setBadgeToolId(null);
            setLongPressMenu(null);
            if (expandTimer.current) clearTimeout(expandTimer.current);
            expandTimer.current = setTimeout(() => { setIsExpanded(false); setExpandAnim('idle'); }, 350);
          }}
          onTouchStart={e => {
            e.preventDefault();
            e.stopPropagation();
            releasePressedBubble();
            setExpandAnim('collapsing');
            badgeToolRef.current = null;
            setBadgeToolId(null);
            setLongPressMenu(null);
            if (expandTimer.current) clearTimeout(expandTimer.current);
            expandTimer.current = setTimeout(() => { setIsExpanded(false); setExpandAnim('idle'); }, 350);
          }}
        />
      )}

      {isExpanded && expandAnim === 'idle' && (
        <div className="fixed" style={{ zIndex: 9998, left: bcx - R - 50, top: bcy - R - 50, width: (R + 50) * 2, height: (R + 50) * 2, borderRadius: '50%', cursor: 'grab', touchAction: 'none', transform: isDocked ? 'scale(0.6)' : 'scale(1)' }}
          onMouseDown={e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); const { cx, cy } = getCXY(); if (Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2) < ballSz / 2 + 5) return; handleDown(e.clientX, e.clientY, false); }}
          onTouchStart={e => { e.preventDefault(); e.stopPropagation(); const t = e.touches[0]; const { cx, cy } = getCXY(); if (Math.sqrt((t.clientX - cx) ** 2 + (t.clientY - cy) ** 2) < ballSz / 2 + 5) return; handleDown(t.clientX, t.clientY, false); }}
          onWheel={handleWheel as any}
          onContextMenu={e => {
            e.preventDefault();
            e.stopPropagation();
            const hitId = hitBubble(e.clientX, e.clientY);
            if (hitId) {
              setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, buttonId: hitId });
            }
          }}
        />
      )}

      {isExpanded && (
        <>
          <div className="fixed pointer-events-none transition-all duration-300" style={{ zIndex: 9996, width: (R + 45) * 2, height: (R + 45) * 2, left: bcx - R - 45, top: bcy - R - 45, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.4) 90%, transparent 100%)', clipPath: isDocked ? 'inset(50% 0 0 0)' : 'none', WebkitMaskImage: isDocked ? 'linear-gradient(to right, transparent 5%, black 20%, black 80%, transparent 95%)' : 'none', transform: isDocked ? 'scale(0.6)' : 'scale(1)' }} />
          <div className="fixed pointer-events-none transition-all duration-300" style={{ zIndex: 9997, width: R * 2, height: R * 2, left: bcx - R, top: bcy - R, borderRadius: '50%', border: `2px solid ${wsC.border}`, boxShadow: `0 0 20px ${wsC.glow1}, 0 0 40px ${wsC.glow2}, inset 0 0 20px ${wsC.glow2}`, animation: 'quantum-ring-spin 12s linear infinite', clipPath: isDocked ? 'inset(50% 0 0 0)' : 'none', WebkitMaskImage: isDocked ? 'linear-gradient(to right, transparent 5%, black 20%, black 80%, transparent 95%)' : 'none', transform: isDocked ? 'scale(0.6)' : 'scale(1)' }} />
          <div className="fixed pointer-events-none transition-all duration-300" style={{ zIndex: 9997, width: R * 2 + 16, height: R * 2 + 16, left: bcx - R - 8, top: bcy - R - 8, borderRadius: '50%', border: `1px solid ${wsC.glow2}`, boxShadow: `0 0 12px ${wsC.glow2}`, animation: 'quantum-ring-spin-reverse 18s linear infinite', clipPath: isDocked ? 'inset(50% 0 0 0)' : 'none', WebkitMaskImage: isDocked ? 'linear-gradient(to right, transparent 5%, black 20%, black 80%, transparent 95%)' : 'none', transform: isDocked ? 'scale(0.6)' : 'scale(1)' }} />
        </>
      )}

      {(isExpanded || expandAnim === 'collapsing') && (
        <div ref={orbitRef} className="fixed pointer-events-none" style={{ zIndex: 9999, left: bcx - R, top: bcy - R, width: R * 2, height: R * 2, transform: `rotate(${rotRef.current}deg)`, willChange: 'transform' }}>
          {vis.map((tool, i) => {
            const tColors = getToolColors(tool);
            const aDeg = (360 / N) * i; const aRad = (aDeg * Math.PI) / 180;
            const bx = R + Math.cos(aRad) * R, by = R + Math.sin(aRad) * R;
            const Icon = tool.icon; const isBadged = badgeToolId === tool.id; const isClicked = selectedTool === tool.id;
            const sz = isBadged ? bubBig : bubSz; const icoSz = isBadged ? 26 : 20;
            const ox = R - bx, oy = R - by;
            return (
              <div key={tool.id} className="absolute" style={{
                left: bx - sz / 2, top: by - sz / 2, width: sz, height: sz,
                transition: 'width 0.2s, height 0.2s, left 0.2s, top 0.2s',
                ['--expand-start-x' as any]: `${ox}px`, ['--expand-start-y' as any]: `${oy}px`,
                animation: expandAnim === 'expanding' ? 'quantum-radial-expand 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : expandAnim === 'collapsing' ? 'quantum-radial-collapse 0.3s ease-in both' : 'none',
                animationDelay: '0ms',
              }}>
                <div ref={el => { bubRefs.current[i] = el; }} className="w-full h-full" style={{ transform: `rotate(${-rotRef.current}deg)`, willChange: 'transform' }}>
                  <div 
                    ref={el => { bubVisRefs.current[i] = el; }} 
                    className="w-full h-full rounded-full flex items-center justify-center" style={{
                    background: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.85) 50%, ${tColors.color}20 70%, ${tColors.color}40 100%)`,
                    border: `2.5px solid ${tColors.color}`,
                    boxShadow: isClicked ? `0 0 50px ${tColors.glowColor}, 0 0 90px ${tColors.color}80` : isBadged ? `0 0 40px ${tColors.color}BB, 0 0 70px ${tColors.color}55, 0 0 15px ${tColors.color}EE` : `0 0 25px ${tColors.color}80, 0 0 45px ${tColors.color}30, 0 0 8px ${tColors.color}BB`,
                    transform: isClicked ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s, box-shadow 0.3s',
                    animation: 'qb-bubble-pulse 2.5s ease-in-out infinite',
                    ['--bub-color' as any]: tColors.color,
                    ['--bub-glow' as any]: tColors.glowColor,
                  }}>
                    <div style={{ color: tColors.color, filter: `drop-shadow(0 0 ${isBadged ? '14px' : '8px'} ${tColors.glowColor})`, animation: isBadged ? 'quantum-icon-glow 2s ease-in-out infinite' : 'none', ['--icon-glow-color' as any]: tColors.glowColor, ['--icon-color' as any]: tColors.color }}>
                      <Icon size={icoSz} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isExpanded && expandAnim === 'idle' && badgeToolData && badgeColors && (
        <React.Fragment key={`badge-${badgeKey}`}>
          <svg ref={badgeSvgRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible', zIndex: 10000 }}>
            <defs><filter id={`blg-${badgeToolData.id}`}><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
            <path ref={badgePath1Ref} d="" stroke={badgeColors.color} strokeWidth="3" opacity="0.4" fill="none" filter={`url(#blg-${badgeToolData.id})`} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: '300', strokeDashoffset: '300', animation: 'quantum-elbow-draw 0.4s ease-out both' }} />
            <path ref={badgePath2Ref} d="" stroke={badgeColors.color} strokeWidth="1.5" opacity="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: '300', strokeDashoffset: '300', animation: 'quantum-elbow-draw 0.4s ease-out both' }} />
            <circle ref={badgeDot1Ref} r="3" fill={badgeColors.color} opacity="0.9" style={{ animation: 'quantum-dot-appear 0.2s ease-out both' }} />
            <circle ref={badgeDot2Ref} r="3" fill={badgeColors.color} opacity="0.9" style={{ animation: 'quantum-dot-appear 0.2s 0.25s ease-out both' }} />
          </svg>
          <div ref={badgeLabelRef} className="fixed pointer-events-none" style={{ zIndex: 10001, transform: 'translate(-50%, -50%)', animation: 'quantum-badge-slideout 0.3s 0.15s ease-out both' }}>
            <div
              className="whitespace-nowrap relative"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)', overflow: 'hidden' }}
            >
              <div className="absolute inset-0" style={{ background: `${badgeColors.color}4D`, clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }} />
              <div className="absolute" style={{ inset: '1.5px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', clipPath: 'polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)' }} />
              <div className="relative px-5 py-2.5" style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', color: badgeColors.color, textShadow: `0 0 14px ${badgeColors.glowColor}` }}>
                {badgeToolData.name.toUpperCase()}
                {activeTool === badgeToolData.id && <span className="ml-2 inline-block w-2 h-2 rounded-full" style={{ backgroundColor: badgeColors.color, boxShadow: `0 0 8px ${badgeColors.color}`, animation: 'quantum-dot-pulse 1.5s ease-in-out infinite' }} />}
              </div>
            </div>
          </div>
        </React.Fragment>
      )}

      {longPressMenu && (() => {
        const tool = vis.find(t => t.id === longPressMenu.toolId);
        if (!tool?.quickActions) return null;
        const tColors = getToolColors(tool);
        return (
          <div className="fixed pointer-events-auto" style={{ zIndex: 10002, left: longPressMenu.x, top: longPressMenu.y, transform: 'translate(-50%, -50%)' }}>
            {tool.quickActions.map((a, i) => {
              const angle = -90 + (i - (tool.quickActions!.length - 1) / 2) * 50;
              const rad = (angle * Math.PI) / 180;
              return (
                <button key={a.action} className="absolute rounded-lg px-3 py-1.5 text-xs font-mono font-bold whitespace-nowrap" style={{
                  left: Math.cos(rad) * 70, top: Math.sin(rad) * 70, transform: 'translate(-50%, -50%)',
                  background: 'rgba(0,0,0,0.95)', border: `1.5px solid ${tColors.color}`, color: tColors.color,
                  boxShadow: `0 0 12px ${tColors.color}60`, animation: `quantum-radial-expand 0.25s cubic-bezier(0.34,1.56,0.64,1) both`, animationDelay: `${i * 50}ms`,
                }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); fireTool(tool.id); }}>
                  {a.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="fixed select-none transition-transform duration-300" style={{ zIndex: 10000, left: position.x, top: position.y, width: ballSz, height: ballSz, touchAction: 'none', transform: isDocked ? 'scale(0.6)' : 'scale(1)' }}>
        <div onMouseDown={e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); handleDown(e.clientX, e.clientY, true); }}
          onTouchStart={e => { e.preventDefault(); e.stopPropagation(); handleDown(e.touches[0].clientX, e.touches[0].clientY, true); }}
          className="w-full h-full rounded-full cursor-pointer relative" style={{
            touchAction: 'none',
            background: 'radial-gradient(circle at 30% 30%, #1a1a2e, #0a0a15)',
            border: `2px solid ${wsC.border}`,
            boxShadow: isExpanded ? `0 0 30px ${wsC.glow1}, 0 0 60px ${wsC.glow2}` : `0 0 18px ${wsC.glow1}`,
            animation: isExpanded ? 'qb-pulse-expanded 2s ease-in-out infinite' : 'qb-pulse 2.5s ease-in-out infinite',
          }}>
          <div className="absolute inset-2 rounded-full" style={{ background: `radial-gradient(circle at 40% 40%, ${wsC.glow1}, ${wsC.glow2} 60%, transparent 80%)` }} />
          <div className="absolute inset-0 rounded-full" style={{ border: '2px solid transparent', borderTopColor: wsC.border, borderRightColor: wsC.ring, animation: 'quantum-ring-spin 3s linear infinite' }} />
          <div className="absolute inset-1 rounded-full" style={{ border: '1px solid transparent', borderBottomColor: wsC.border, borderLeftColor: wsC.ring, animation: 'quantum-ring-spin-reverse 4s linear infinite' }} />
          <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${wsC.core1}, ${wsC.core2})`, boxShadow: `0 0 8px ${wsC.core1}, 0 0 16px ${wsC.core2}80`, animation: 'qb-core-glow 2s ease-in-out infinite' }} />
        </div>
        {!isExpanded && expandAnim === 'idle' && (
          <div ref={dotRef} className="absolute pointer-events-none" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#000', border: `1.5px solid ${activeColor}`, boxShadow: `0 0 10px ${activeColor}, 0 0 4px ${activeColor}` }} />
        )}
      </div>

      {/* Custom Color Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0" style={{ zIndex: 100000 }} 
            onClick={(e) => { e.stopPropagation(); setContextMenu(null); }} 
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu(null); }} 
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          />
          <div 
            className="fixed bg-black/95 backdrop-blur-xl border border-gray-800 rounded-xl p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in duration-200"
            style={{ 
              zIndex: 100001,
              left: Math.min(contextMenu.x, window.innerWidth - 280), // ⚡ Adjusted to 280px limit to accommodate a wider 6-column menu
              top: Math.min(contextMenu.y, window.innerHeight - 150) 
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider text-center">Set Icon Color</span>
            <div className="grid grid-cols-6 gap-2"> {/* ⚡ Changed to 6 cols and slightly tighter gap */}
              {Object.entries(COLOR_PALETTE).map(([key, { color }]) => (
                <button
                  key={key}
                  onClick={() => handleColorSelect(key)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: `${color}30`, 
                    borderColor: color, 
                    boxShadow: userNavColors[contextMenu.buttonId] === key ? `0 0 15px ${color}80` : `0 0 8px ${color}40`
                  }}
                  title={key}
                />
              ))}
            </div>
            <button 
               onClick={() => handleColorSelect('default')} 
               className="mt-2 py-1.5 px-3 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-gray-800"
            >
              Reset to Default
            </button>
          </div>
        </>
      )}

      {showWorkflowBuilder && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWorkflowBuilder(false)} />
          <div className="relative bg-black border border-cyan-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]">
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center"><WorkflowIcon size={24} className="text-cyan-400" /></div>
                <div><h2 className="text-lg font-semibold text-white font-mono">Workflow Automation</h2><p className="text-xs text-gray-400 font-mono">Create and manage automated workflows</p></div>
              </div>
              <button onClick={() => setShowWorkflowBuilder(false)} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] darkwave-scrollbar">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {[{ name: 'Task Assignment', desc: 'Auto-assign tasks based on workload', triggers: 3, active: true }, { name: 'Approval Chain', desc: 'Multi-level approval workflow', triggers: 5, active: true }, { name: 'Notification Alerts', desc: 'Send alerts on status changes', triggers: 8, active: false }, { name: 'Data Sync', desc: 'Sync records across workspaces', triggers: 2, active: true }].map((wf, i) => (
                  <div key={i} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2"><h4 className="text-white font-mono font-medium">{wf.name}</h4><div className={`w-2 h-2 rounded-full ${wf.active ? 'bg-green-400' : 'bg-gray-600'}`} /></div>
                    <p className="text-xs text-gray-500 font-mono mb-3">{wf.desc}</p>
                    <div className="flex items-center justify-between"><span className="text-xs text-cyan-400 font-mono">{wf.triggers} triggers</span><button className="text-xs text-gray-500 hover:text-cyan-400 font-mono transition-colors">Edit</button></div>
                  </div>
                ))}
              </div>
              <button className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-mono flex items-center justify-center gap-2"><WorkflowIcon size={18} /> Create New Workflow</button>
            </div>
          </div>
        </div>
      )}

      {showReportBuilder && <ReportBuilderPanel onClose={() => setShowReportBuilder(false)} />}
      {showEmailMirror && <EmailMirrorPanel onClose={() => setShowEmailMirror(false)} />}
      {showScannerPanel && <ScannerPanel onClose={() => setShowScannerPanel(false)} />}
      {showActivityPanel && <ActivityFeedPanel onClose={() => setShowActivityPanel(false)} availableWorkspaces={availableWorkspaces} />}
      {showFavoritesPanel && (
        <FavoritesPanel 
          isOpen={true} 
          onClose={() => setShowFavoritesPanel(false)} 
          userId={userId}
          onNavigateToMiniApp={onNavigateToMiniApp}
        />
      )}
      {showPhoneMirror && (
        <PhoneMirror 
          isOpen={true} 
          onClose={() => setShowPhoneMirror(false)} 
        />
      )}

      <style>{`
        @keyframes qb-pulse { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }
        @keyframes qb-pulse-expanded { 0%,100% { opacity: 0.9; } 50% { opacity: 1; } }
        @keyframes qb-core-glow { 0%,100% { opacity: 0.8; } 50% { opacity: 1; } }

        @keyframes quantum-elbow-draw { 0% { stroke-dashoffset: 300; } 100% { stroke-dashoffset: 0; } }
        @keyframes qb-bubble-pulse { 0%,100% { opacity: 0.92; } 50% { opacity: 1; } }
        @keyframes quantum-icon-glow { 0%,100% { opacity: 1; } 50% { opacity: 0.8; } }
        @keyframes quantum-dot-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
        @keyframes quantum-dot-appear { 0% { opacity: 0; r: 0; } 100% { opacity: 0.9; r: 3; } }
        @keyframes quantum-badge-slideout {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) translateX(var(--badge-slide-dir, -30px)); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1.06) translateX(calc(var(--badge-slide-dir, -30px) * -0.05)); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateX(0); }
        }
        @keyframes quantum-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes quantum-ring-spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes quantum-radial-expand { 0% { opacity: 0; transform: translate(var(--expand-start-x), var(--expand-start-y)) scale(0); } 100% { opacity: 1; transform: translate(0,0) scale(1); } }
        @keyframes quantum-radial-collapse { 0% { opacity: 1; transform: translate(0,0) scale(1); } 100% { opacity: 0; transform: translate(var(--expand-start-x), var(--expand-start-y)) scale(0); } }
      `}</style>
    </>
  );
};

export default QuantumBalltool;