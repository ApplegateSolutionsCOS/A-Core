import React from 'react';

// Google Material Icons component using Material Symbols font
// These icons are loaded from Google's CDN

// Material Icon wrapper component
interface MaterialIconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  size = 24,
  className = '',
  filled = false,
  weight = 400,
}) => {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {name}
    </span>
  );
};

// Pre-defined workspace icons using Material Symbols
export const WorkspaceIcons = {
  admin: 'admin_panel_settings',
  accounting: 'account_balance',
  personnel: 'groups',
  main: 'dashboard',
  data: 'database',
  security: 'security',
  settings: 'settings',
  home: 'home',
  calendar: 'calendar_month',
  tasks: 'task_alt',
  messages: 'chat',
  notifications: 'notifications',
  search: 'search',
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  save: 'save',
  close: 'close',
  menu: 'menu',
  more: 'more_vert',
  chevronLeft: 'chevron_left',
  chevronRight: 'chevron_right',
  expandMore: 'expand_more',
  expandLess: 'expand_less',
  person: 'person',
  lock: 'lock',
  key: 'key',
  shield: 'shield',
  verified: 'verified',
  warning: 'warning',
  error: 'error',
  info: 'info',
  check: 'check_circle',
  analytics: 'analytics',
  insights: 'insights',
  trending: 'trending_up',
  money: 'attach_money',
  payments: 'payments',
  receipt: 'receipt_long',
  folder: 'folder',
  file: 'description',
  upload: 'upload',
  download: 'download',
  cloud: 'cloud',
  sync: 'sync',
  refresh: 'refresh',
  filter: 'filter_list',
  sort: 'sort',
  view: 'visibility',
  hide: 'visibility_off',
  fullscreen: 'fullscreen',
  minimize: 'minimize',
  maximize: 'open_in_full',
  drag: 'drag_indicator',
  resize: 'open_with',
  link: 'link',
  share: 'share',
  copy: 'content_copy',
  paste: 'content_paste',
  cut: 'content_cut',
  undo: 'undo',
  redo: 'redo',
  print: 'print',
  help: 'help',
  support: 'support_agent',
  feedback: 'feedback',
  star: 'star',
  favorite: 'favorite',
  bookmark: 'bookmark',
  flag: 'flag',
  label: 'label',
  tag: 'sell',
  category: 'category',
  inventory: 'inventory_2',
  warehouse: 'warehouse',
  shipping: 'local_shipping',
  store: 'store',
  shopping: 'shopping_cart',
  creditCard: 'credit_card',
  wallet: 'account_balance_wallet',
  bank: 'account_balance',
  chart: 'bar_chart',
  pieChart: 'pie_chart',
  lineChart: 'show_chart',
  table: 'table_chart',
  grid: 'grid_view',
  list: 'view_list',
  timeline: 'timeline',
  schedule: 'schedule',
  alarm: 'alarm',
  timer: 'timer',
  history: 'history',
  event: 'event',
  meeting: 'groups',
  video: 'videocam',
  call: 'call',
  email: 'email',
  send: 'send',
  attach: 'attach_file',
  image: 'image',
  photo: 'photo_camera',
  mic: 'mic',
  speaker: 'volume_up',
  mute: 'volume_off',
  play: 'play_arrow',
  pause: 'pause',
  stop: 'stop',
  record: 'fiber_manual_record',
  location: 'location_on',
  map: 'map',
  directions: 'directions',
  navigation: 'navigation',
  globe: 'public',
  language: 'language',
  translate: 'translate',
  code: 'code',
  terminal: 'terminal',
  bug: 'bug_report',
  build: 'build',
  tools: 'construction',
  api: 'api',
  integration: 'integration_instructions',
  extension: 'extension',
  plugin: 'power',
  automation: 'smart_toy',
  ai: 'psychology',
  brain: 'neurology',
  lightbulb: 'lightbulb',
  rocket: 'rocket_launch',
  target: 'gps_fixed',
  trophy: 'emoji_events',
  medal: 'military_tech',
  badge: 'workspace_premium',
  certificate: 'verified_user',
  award: 'stars',
};

// Workspace-specific icon components
export const AdminIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <MaterialIcon name={WorkspaceIcons.admin} size={size} className={className} />
);

export const AccountingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <MaterialIcon name={WorkspaceIcons.accounting} size={size} className={className} />
);

export const PersonnelIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <MaterialIcon name={WorkspaceIcons.personnel} size={size} className={className} />
);

export const MainDashboardIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <MaterialIcon name={WorkspaceIcons.main} size={size} className={className} />
);

export const DataIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <MaterialIcon name={WorkspaceIcons.data} size={size} className={className} />
);

export const SecurityIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <MaterialIcon name={WorkspaceIcons.security} size={size} className={className} />
);

// Export a function to get workspace icon by slug
export const getWorkspaceIcon = (slug: string): string => {
  const iconMap: Record<string, string> = {
    admin: WorkspaceIcons.admin,
    accounting: WorkspaceIcons.accounting,
    personnel: WorkspaceIcons.personnel,
    main: WorkspaceIcons.main,
    data: WorkspaceIcons.data,
    security: WorkspaceIcons.security,
  };
  return iconMap[slug] || WorkspaceIcons.main;
};

export default MaterialIcon;
