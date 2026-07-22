// ============================================
// CENTRALIZED WIDGET CATALOG
// ============================================
// All available widgets organized by category
// Used by WidgetLibraryPanel and PersonalDashboard

export type WidgetCategory = 'analytics' | 'communication' | 'security' | 'productivity';

export interface CatalogWidget {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: string; // lucide icon name or custom
  glowColor: 'cyan' | 'magenta' | 'green' | 'purple' | 'orange';
  previewLines: string[]; // short preview description lines
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  requiresAdmin?: boolean;
  tags: string[];
}

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string; color: string; iconColor: string; borderColor: string; bgColor: string }[] = [
  { id: 'analytics', label: 'Analytics', color: 'cyan', iconColor: 'text-cyan-400', borderColor: 'border-cyan-500/30', bgColor: 'bg-cyan-500/10' },
  { id: 'communication', label: 'Communication', color: 'magenta', iconColor: 'text-fuchsia-400', borderColor: 'border-fuchsia-500/30', bgColor: 'bg-fuchsia-500/10' },
  { id: 'security', label: 'Security', color: 'green', iconColor: 'text-green-400', borderColor: 'border-green-500/30', bgColor: 'bg-green-500/10' },
  { id: 'productivity', label: 'Productivity', color: 'purple', iconColor: 'text-purple-400', borderColor: 'border-purple-500/30', bgColor: 'bg-purple-500/10' },
];

export const WIDGET_CATALOG: CatalogWidget[] = [
  // ─── Analytics ───
  {
    id: 'system-uptime',
    name: 'System Uptime',
    description: 'Real-time system uptime monitoring with historical trend data and SLA tracking.',
    category: 'analytics',
    icon: 'server',
    glowColor: 'cyan',
    previewLines: ['99.97% uptime', 'SLA compliance tracking'],
    defaultWidth: 400, defaultHeight: 250, minWidth: 300, minHeight: 200,
    tags: ['uptime', 'monitoring', 'sla', 'server'],
  },
  {
    id: 'active-users',
    name: 'Active Users',
    description: 'Track active user count, sessions, and engagement metrics across the platform.',
    category: 'analytics',
    icon: 'users',
    glowColor: 'purple',
    previewLines: ['2,847 active users', '+127 today'],
    defaultWidth: 400, defaultHeight: 250, minWidth: 300, minHeight: 200,
    tags: ['users', 'sessions', 'engagement'],
  },
  {
    id: 'response-time',
    name: 'Response Time',
    description: 'API response time monitoring with percentile breakdowns (p50, p95, p99).',
    category: 'analytics',
    icon: 'activity',
    glowColor: 'magenta',
    previewLines: ['42ms avg', 'p99: 180ms'],
    defaultWidth: 400, defaultHeight: 250, minWidth: 300, minHeight: 200,
    tags: ['api', 'latency', 'performance'],
  },
  {
    id: 'error-rate',
    name: 'Error Rate',
    description: 'Error rate tracking with breakdown by error type and affected endpoints.',
    category: 'analytics',
    icon: 'alert-triangle',
    glowColor: 'orange',
    previewLines: ['0.03% error rate', 'Normal range'],
    defaultWidth: 400, defaultHeight: 250, minWidth: 300, minHeight: 200,
    tags: ['errors', 'monitoring', 'alerts'],
  },
  {
    id: 'revenue-chart',
    name: 'Revenue Chart',
    description: 'Monthly revenue visualization with comparison to previous periods and forecasting.',
    category: 'analytics',
    icon: 'trending-up',
    glowColor: 'green',
    previewLines: ['$142K this month', '+12% MoM growth'],
    defaultWidth: 550, defaultHeight: 350, minWidth: 400, minHeight: 280,
    tags: ['revenue', 'finance', 'growth', 'chart'],
  },
  {
    id: 'quantum-visualization',
    name: 'Quantum Visualization',
    description: 'IBM Qiskit Runtime Bloch Sphere visualization for quantum computing analytics.',
    category: 'analytics',
    icon: 'cpu',
    glowColor: 'purple',
    previewLines: ['Bloch Sphere', 'Quantum state analysis'],
    defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 400,
    requiresAdmin: true,
    tags: ['quantum', 'visualization', 'qiskit', 'advanced'],
  },
  // ─── Communication ───
  {
    id: 'messages-preview',
    name: 'Recent Messages',
    description: 'Latest messages and notifications from your team channels and direct messages.',
    category: 'communication',
    icon: 'message-square',
    glowColor: 'orange',
    previewLines: ['3 unread messages', 'Latest from team'],
    defaultWidth: 400, defaultHeight: 280, minWidth: 300, minHeight: 200,
    tags: ['messages', 'chat', 'notifications'],
  },
  {
    id: 'news-feed',
    name: 'Live News Feed',
    description: 'Real-time news articles and industry updates from curated sources.',
    category: 'communication',
    icon: 'rss',
    glowColor: 'cyan',
    previewLines: ['Live headlines', 'Industry updates'],
    defaultWidth: 550, defaultHeight: 450, minWidth: 400, minHeight: 350,
    requiresAdmin: true,
    tags: ['news', 'feed', 'headlines', 'industry'],
  },
  {
    id: 'team-activity',
    name: 'Team Activity Feed',
    description: 'Real-time activity stream showing team member actions, status changes, and updates.',
    category: 'communication',
    icon: 'activity',
    glowColor: 'green',
    previewLines: ['12 updates today', 'Team collaboration'],
    defaultWidth: 400, defaultHeight: 300, minWidth: 300, minHeight: 200,
    tags: ['activity', 'team', 'collaboration', 'feed'],
  },
  {
    id: 'announcements',
    name: 'Announcements',
    description: 'Organization-wide announcements and important notices board.',
    category: 'communication',
    icon: 'megaphone',
    glowColor: 'magenta',
    previewLines: ['2 new announcements', 'Company updates'],
    defaultWidth: 400, defaultHeight: 280, minWidth: 300, minHeight: 200,
    tags: ['announcements', 'notices', 'company'],
  },
  // ─── Security ───
  {
    id: 'security-overview',
    name: 'Security Overview',
    description: 'Comprehensive security dashboard with threat level, active alerts, and compliance status.',
    category: 'security',
    icon: 'shield',
    glowColor: 'green',
    previewLines: ['Threat level: Low', '0 active alerts'],
    defaultWidth: 600, defaultHeight: 400, minWidth: 400, minHeight: 300,
    requiresAdmin: true,
    tags: ['security', 'threats', 'alerts', 'compliance'],
  },
  {
    id: 'threat-heatmap',
    name: 'Threat Geo Heatmap',
    description: 'Geographic visualization of threat origins with real-time IP geolocation data.',
    category: 'security',
    icon: 'globe',
    glowColor: 'orange',
    previewLines: ['Global threat map', 'IP geolocation'],
    defaultWidth: 700, defaultHeight: 450, minWidth: 500, minHeight: 350,
    requiresAdmin: true,
    tags: ['threats', 'heatmap', 'geolocation', 'map'],
  },
  {
    id: 'live-ip-feed',
    name: 'Live IP Feed',
    description: 'Real-time IP address monitoring with threat scoring and geographic data.',
    category: 'security',
    icon: 'wifi',
    glowColor: 'cyan',
    previewLines: ['Live monitoring', 'Threat scoring'],
    defaultWidth: 500, defaultHeight: 400, minWidth: 400, minHeight: 300,
    requiresAdmin: true,
    tags: ['ip', 'monitoring', 'live', 'network'],
  },
  {
    id: 'access-log',
    name: 'Access Log Monitor',
    description: 'Real-time access log monitoring with filtering by user, action, and resource.',
    category: 'security',
    icon: 'file-text',
    glowColor: 'purple',
    previewLines: ['Real-time logs', 'Access patterns'],
    defaultWidth: 500, defaultHeight: 350, minWidth: 400, minHeight: 280,
    requiresAdmin: true,
    tags: ['access', 'logs', 'audit', 'monitoring'],
  },
  // ─── Productivity ───
  {
    id: 'tasks',
    name: 'My Tasks',
    description: 'Personal task manager with priority levels, due dates, and workspace grouping.',
    category: 'productivity',
    icon: 'check-square',
    glowColor: 'cyan',
    previewLines: ['5 tasks due today', 'Priority tracking'],
    defaultWidth: 500, defaultHeight: 280, minWidth: 300, minHeight: 200,
    tags: ['tasks', 'todo', 'productivity', 'priority'],
  },
  {
    id: 'calendar-preview',
    name: 'Upcoming Events',
    description: 'Calendar events preview with today\'s schedule and upcoming meetings.',
    category: 'productivity',
    icon: 'calendar',
    glowColor: 'purple',
    previewLines: ['3 events today', 'Next: Team Standup'],
    defaultWidth: 400, defaultHeight: 280, minWidth: 300, minHeight: 200,
    tags: ['calendar', 'events', 'schedule', 'meetings'],
  },
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'Shortcut buttons for common actions like creating tasks, events, and messages.',
    category: 'productivity',
    icon: 'zap',
    glowColor: 'magenta',
    previewLines: ['One-click actions', 'Customizable shortcuts'],
    defaultWidth: 350, defaultHeight: 250, minWidth: 250, minHeight: 180,
    tags: ['actions', 'shortcuts', 'quick', 'productivity'],
  },
  {
    id: 'notes-widget',
    name: 'Quick Notes',
    description: 'Sticky notes widget for quick thoughts, reminders, and scratch pad.',
    category: 'productivity',
    icon: 'sticky-note',
    glowColor: 'orange',
    previewLines: ['Quick capture', 'Scratch pad'],
    defaultWidth: 350, defaultHeight: 300, minWidth: 250, minHeight: 200,
    tags: ['notes', 'sticky', 'reminders', 'quick'],
  },
  {
    id: 'time-tracker',
    name: 'Time Tracker',
    description: 'Track time spent on tasks and projects with start/stop timer and daily summary.',
    category: 'productivity',
    icon: 'clock',
    glowColor: 'green',
    previewLines: ['4h 32m today', 'Project tracking'],
    defaultWidth: 350, defaultHeight: 250, minWidth: 250, minHeight: 180,
    tags: ['time', 'tracker', 'projects', 'productivity'],
  },
];

// ============================================
// LAYOUT TEMPLATES
// ============================================

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  glowColor: string;
  // Grid positions for tiles (index-based)
  positions: { x: number; y: number; width: number; height: number }[];
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: '2-column',
    name: '2-Column Grid',
    description: 'Clean two-column layout with equal-width tiles stacked vertically.',
    icon: 'columns',
    glowColor: 'cyan',
    positions: [
      { x: 0, y: 0, width: 420, height: 280 },
      { x: 440, y: 0, width: 420, height: 280 },
      { x: 0, y: 300, width: 420, height: 280 },
      { x: 440, y: 300, width: 420, height: 280 },
      { x: 0, y: 600, width: 420, height: 280 },
      { x: 440, y: 600, width: 420, height: 280 },
    ],
  },
  {
    id: '3-column',
    name: '3-Column Masonry',
    description: 'Three-column masonry layout for dense information display.',
    icon: 'layout-grid',
    glowColor: 'magenta',
    positions: [
      { x: 0, y: 0, width: 280, height: 250 },
      { x: 300, y: 0, width: 280, height: 350 },
      { x: 600, y: 0, width: 280, height: 250 },
      { x: 0, y: 270, width: 280, height: 350 },
      { x: 600, y: 270, width: 280, height: 350 },
      { x: 300, y: 370, width: 280, height: 250 },
    ],
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    description: 'One large primary tile with a sidebar of smaller supporting tiles.',
    icon: 'maximize',
    glowColor: 'green',
    positions: [
      { x: 0, y: 0, width: 600, height: 560 },
      { x: 620, y: 0, width: 260, height: 270 },
      { x: 620, y: 290, width: 260, height: 270 },
      { x: 0, y: 580, width: 420, height: 250 },
      { x: 440, y: 580, width: 440, height: 250 },
    ],
  },
  {
    id: 'monitoring',
    name: 'Monitoring Wall',
    description: 'Dense 4x3 grid optimized for real-time monitoring and status dashboards.',
    icon: 'monitor',
    glowColor: 'orange',
    positions: [
      { x: 0, y: 0, width: 210, height: 200 },
      { x: 225, y: 0, width: 210, height: 200 },
      { x: 450, y: 0, width: 210, height: 200 },
      { x: 675, y: 0, width: 210, height: 200 },
      { x: 0, y: 215, width: 210, height: 200 },
      { x: 225, y: 215, width: 210, height: 200 },
      { x: 450, y: 215, width: 210, height: 200 },
      { x: 675, y: 215, width: 210, height: 200 },
      { x: 0, y: 430, width: 210, height: 200 },
      { x: 225, y: 430, width: 210, height: 200 },
      { x: 450, y: 430, width: 210, height: 200 },
      { x: 675, y: 430, width: 210, height: 200 },
    ],
  },
  {
    id: 'hero-sidebar',
    name: 'Hero + Sidebar',
    description: 'Large hero widget at top with a row of smaller widgets below.',
    icon: 'layout',
    glowColor: 'purple',
    positions: [
      { x: 0, y: 0, width: 880, height: 350 },
      { x: 0, y: 370, width: 280, height: 250 },
      { x: 300, y: 370, width: 280, height: 250 },
      { x: 600, y: 370, width: 280, height: 250 },
      { x: 0, y: 640, width: 440, height: 250 },
      { x: 460, y: 640, width: 420, height: 250 },
    ],
  },
];
