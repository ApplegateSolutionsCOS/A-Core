import React, { useState } from 'react';
import {
  ShieldIcon,
  UsersIcon,
  DatabaseIcon,
  LockIcon,
  BarChartIcon,
  BuildIcon,
  CheckIcon,
  LayersIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ZapIcon,
  CpuIcon,
  GlobeIcon,
  ChevronDownIcon,
  ApplegateCoreLogo,
  ServerIcon,
  CloudIcon,
  CalculatorIcon, // ⚡ Fixed to match Icons.tsx export
} from '@/components/icons/Icons';
import { Atom, LockKeyhole, GitBranch, FileText, Calendar, MessageSquare, CheckSquare, Sparkles } from 'lucide-react'; // ⚡ Bypassing Icons.tsx to grab these directly
import { FEATURES } from '@/config/features';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: (planId?: string) => void;
}

type Integration = { name: string; tip: string; short: string; tone: string };

// Small branded monogram badge with hover tooltip
const BrandBadge: React.FC<{ item: Integration }> = ({ item }) => {
  const toneMap: Record<string, string> = {
    cyan: 'from-cyan-500/30 to-cyan-700/20 border-cyan-500/40 text-cyan-200',
    blue: 'from-blue-500/30 to-blue-700/20 border-blue-500/40 text-blue-200',
    green: 'from-green-500/30 to-green-700/20 border-green-500/40 text-green-200',
    purple: 'from-purple-500/30 to-purple-700/20 border-purple-500/40 text-purple-200',
    orange: 'from-orange-500/30 to-orange-700/20 border-orange-500/40 text-orange-200',
    fuchsia: 'from-fuchsia-500/30 to-fuchsia-700/20 border-fuchsia-500/40 text-fuchsia-200',
    red: 'from-red-500/30 to-red-700/20 border-red-500/40 text-red-200',
  };
  const tone = toneMap[item.tone] || toneMap.cyan;
  return (
    <div className="relative group/badge">
      <div
        className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg border bg-gradient-to-br ${tone} cursor-default transition-all hover:scale-[1.03]`}
      >
        <svg width="22" height="22" viewBox="0 0 32 32" className="flex-shrink-0 drop-shadow-[0_0_4px_rgba(0,255,255,0.25)]">
          <rect x="1" y="1" width="30" height="30" rx="8" fill="rgba(0,0,0,0.55)" stroke="currentColor" strokeWidth="1.5" />
          <text x="16" y="21" textAnchor="middle" fontSize="13" fontFamily="monospace" fontWeight="700" fill="currentColor">
            {item.short}
          </text>
        </svg>
        <span className="text-xs font-mono whitespace-nowrap">{item.name}</span>
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 opacity-0 group-hover/badge:opacity-100 transition-opacity z-30">
        <div className="bg-black border border-cyan-500/40 rounded-lg px-3 py-2 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
          <p className="text-cyan-300 font-mono text-[11px] font-bold mb-0.5">{item.name}</p>
          <p className="text-gray-400 font-mono text-[10px] leading-snug">{item.tip}</p>
        </div>
        <div className="w-2 h-2 bg-black border-r border-b border-cyan-500/40 rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  );
};

const b = (name: string, short: string, tip: string, tone = 'cyan'): Integration => ({ name, short, tip, tone });

// Inline monitor icon
function MonitorScreen({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

// Inline memory / RAM icon
function MemoryChip({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 6V3M12 6V3M17 6V3M7 21v-3M12 21v-3M17 21v-3" />
      <rect x="8" y="10" width="8" height="4" rx="1" />
    </svg>
  );
}

const LOGO_URL = 'https://rghtxlzzpuazvacupere.supabase.co/storage/v1/object/public/organization-logos/logos/c28f0d91-c0df-4092-a2cc-19c860f1824f-1777231826845.png?width=80&height=80&resize=contain';

const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin, onOpenRegister }) => {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);

  // Compare-plans state for filtering the feature matrix
  const [compareMode, setCompareMode] = useState(false);
  const [comparedTiers, setComparedTiers] = useState<string[]>(['basic', 'enterprise', 'whiteGlove']);

  const features = [
    { icon: LayersIcon, title: '6 Integrated Workspaces', description: 'Admin, Accounting, Personnel, Main, Data, and Security workspaces with specialized MiniApps for every business need.', color: 'cyan' },
    { icon: BuildIcon, title: 'Custom MiniApp Builder', description: 'Create your own MiniApps with drag-and-drop building blocks. Modify templates to fit your exact workflow.', color: 'magenta' },
    { icon: UsersIcon, title: 'Team Collaboration', description: 'Real-time activity streams, user presence indicators, and role-based access control for seamless teamwork.', color: 'green' },
    { icon: BarChartIcon, title: 'Analytics Dashboard', description: 'Workspace-specific analytics and personal dashboards to track performance and make data-driven decisions.', color: 'orange' },
    { icon: DatabaseIcon, title: 'Relational Data', description: 'Connect MiniApps through relationship fields. Link contacts to projects, orders to customers, and more.', color: 'purple' },
    { icon: ShieldIcon, title: 'Q-CORE Security', description: 'AES-256-GCM + ML-KEM-1024 hybrid encryption. Quantum-immune protection for all your business data.', color: 'red' },
  ];

  const getFeatureClasses = (color: string) => {
    const classes: Record<string, string> = {
      cyan: 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-black hover:border-cyan-500/50',
      magenta: 'border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/30 to-black hover:border-fuchsia-500/50',
      green: 'border-green-500/30 bg-gradient-to-br from-green-950/30 to-black hover:border-green-500/50',
      orange: 'border-orange-500/30 bg-gradient-to-br from-orange-950/30 to-black hover:border-orange-500/50',
      purple: 'border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-black hover:border-purple-500/50',
      red: 'border-red-500/30 bg-gradient-to-br from-red-950/30 to-black hover:border-red-500/50',
    };
    return classes[color] || classes.cyan;
  };

  const getIconClasses = (color: string) => {
    const classes: Record<string, string> = {
      cyan: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40',
      magenta: 'text-fuchsia-400 bg-fuchsia-500/20 border-fuchsia-500/40',
      green: 'text-green-400 bg-green-500/20 border-green-500/40',
      orange: 'text-orange-400 bg-orange-500/20 border-orange-500/40',
      purple: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
      red: 'text-red-400 bg-red-500/20 border-red-500/40',
    };
    return classes[color] || classes.cyan;
  };

  const workspaces = [
    { name: 'Admin', icon: ShieldIcon, apps: 12, description: 'Contacts, Jobs, Titles, Ranks, Benefits, Companies, Proposals, Projections, Owners, Projects, Procedures, Protocols', features: ['Global organization settings & branding', 'Role-based access control (RBAC) matrix', 'System-wide audit logs & reporting', 'API key & webhook management'], theme: { border: 'border-[#ef4444]/20 hover:border-[#ef4444]/40', badge: 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]', check: 'text-[#ef4444]' } },
    { name: 'Accounting', icon: CalculatorIcon, apps: 8, description: 'Banks, Loans, Payments, Wallets, Expenses, Transfers, Payouts, Budgets', features: ['Real-time multi-currency ledger syncing', 'Automated expense categorization rules', 'Financial projections & burn rate dashboards', 'Custom tax & compliance reporting'], theme: { border: 'border-[#22C55e]/20 hover:border-[#22C55e]/40', badge: 'bg-[#22C55e]/10 border-[#22C55e]/30 text-[#22C55e]', check: 'text-[#22C55e]' } },
    { name: 'Personnel', icon: UsersIcon, apps: 5, description: 'Applicants, Members, Documents, Training, Protocols', features: ['Integrated Applicant Tracking System (ATS)', 'Automated employee onboarding workflows', 'Time-off & availability management', 'Performance review cycle tracking'], theme: { border: 'border-[#ff00ff]/20 hover:border-[#ff00ff]/40', badge: 'bg-[#ff00ff]/10 border-[#ff00ff]/30 text-[#ff00ff]', check: 'text-[#ff00ff]' } },
    { name: 'Main', icon: Atom, apps: 17, description: 'Contacts, Leads, Customers, Vendors, Projects, Events, Products, Services, Purchases, Quotes, Orders, Assets, Inventory, Locations, Clock, Support, Ideas', features: ['Drag-and-drop Kanban project boards', 'Customizable CRM pipeline views', 'Real-time multi-location inventory tracking', 'Integrated helpdesk ticketing system'], theme: { border: 'border-[#00ffff]/20 hover:border-[#00ffff]/40', badge: 'bg-[#00ffff]/10 border-[#00ffff]/30 text-[#00ffff]', check: 'text-[#00ffff]' } },
    { name: 'Data', icon: DatabaseIcon, apps: 12, description: 'Items, Types, Purposes, Units, Amounts, Specifications, Ratings, Dimensions, Flavors, Colors, Rates, Uses', features: ['Visual relational schema builder', 'Custom field mapping & validation', 'Bulk data import/export wizards', 'Automated point-in-time backups'], theme: { border: 'border-[#a855f7]/20 hover:border-[#a855f7]/40', badge: 'bg-[#a855f7]/10 border-[#a855f7]/30 text-[#a855f7]', check: 'text-[#a855f7]' } },
    { name: 'Security', icon: LockKeyhole, apps: 6, description: 'Live Camera Matrix, Q-CORE Encrypted NVR Vault, Access Control, Active Honeypot Defense, Team Bravo Internal Affairs AI & Threat Map (Q-CORE Add-On)', features: ['Live RTSP/WebRTC facility camera feeds', 'Q-CORE Encrypted NVR video clip vault', 'Kurogo & Kovac active deception honeypots', 'Green Horizon (IBM Quantum + Google Cloud) threat scoring'], theme: { border: 'border-[#ff9900]/20 hover:border-[#ff9900]/40', badge: 'bg-[#ff9900]/10 border-[#ff9900]/30 text-[#ff9900]', check: 'text-[#ff9900]' } },
  ];

  const systemRequirements = [
    { icon: GlobeIcon, title: 'Web Browser', items: ['Chrome 110+ / Edge 110+', 'Firefox 110+', 'Safari 16+', 'JavaScript & cookies enabled'] },
    { icon: CpuIcon, title: 'CPU (Local Machine)', items: ['Minimum: Dual-core 2.0 GHz', 'Recommended: Quad-core 2.5 GHz+', 'Intel i5 / Ryzen 5 (8th gen+)', 'AVX2 support recommended'] },
    { icon: MemoryChip, title: 'Memory (RAM)', items: ['Minimum: 4 GB RAM', 'Recommended: 8 GB RAM', '16 GB for quantum/map tools', '500 MB free local cache'] },
    { icon: MonitorScreen, title: 'Display', items: ['1280×720 minimum', '1920×1080 recommended', 'Responsive mobile layouts', 'Dark-mode optimized'] },
    { icon: ServerIcon, title: 'Network', items: ['Broadband 10 Mbps+', 'Stable internet connection', 'WebSocket support', 'Low-latency recommended'] },
    { icon: CloudIcon, title: 'Platform', items: ['No installation required', 'Cloud-hosted SaaS', 'Offline cache (PWA)', 'Auto-updating client'] },
  ];

  // 6-tier pricing model with Simplified Cloud ($49) / Hardware ($199) Connector Caps & Unbundled Q-CORE Add-Ons
  const pricing = [
    {
      tier: 'basic', name: 'Basic Account', price: '$249', period: '/month', perUser: '$19/user/mo',
      description: 'Full access to all 6 default workspaces, Q-CORE Encrypted File Vault & 30-Day Local-First engine',
      features: [
        'Downloadable Local-First App (Works 100% offline for up to 30 days between cloud syncs)',
        'Q-CORE Encrypted Vault File Storage (ML-KEM-1024 + AES-256-GCM + SHA-512 at rest & in transit)',
        'All 6 default workspaces & 60+ built-in MiniApps (Up to 60 MiniApps/workspace)',
        '1 Free Cloud Software Connector of choice (Podio, QuickBooks, Slack, WhatsApp, Shopify)',
        'Add up to +2 extra Cloud Connectors at $49/mo each (3 Total Connectors Max)',
        'Radial QBall quick-action menu, Light/Dark modes & custom workspace icon colors',
        'Instant local Mass-Edit, Mass-Delete & unlimited data records',
        '1-Click Q-CORE Security & Commercial AI Add-On Bridge Ready',
      ],
      highlight: false, badge: null,
      theme: { card: 'border border-cyan-800/80 bg-gray-900/50 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.2)]', badge: '', price: 'text-white', check: 'text-cyan-500', integrateBtn: 'bg-cyan-900/20 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/40', icon: 'text-cyan-400', getStartedBtn: 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600', integrateBorder: 'border-cyan-800', integrateIconBg: 'bg-cyan-900/30 border-cyan-800' },
      integrations: {
        software: [b('1 Free Choice Included', '1x', 'Pick 1 free: Podio, QuickBooks, Slack, WhatsApp, or Shopify', 'cyan'), b('Podio', 'PO', '1-Click Workspace, Schema & Record bi-directional mirror', 'cyan'), b('QuickBooks', 'QB', 'Sync invoices, expenses & accounting ledgers', 'green'), b('Slack', 'SL', 'Stream channels & DMs into A-CORE Messages', 'fuchsia'), b('WhatsApp', 'WA', 'Two-way customer & team WhatsApp messaging', 'green'), b('Salesforce (+$49/mo)', 'SF', 'Add-on Cloud CRM sync (Max 3 total connectors on Basic)', 'blue'), b('HubSpot (+$49/mo)', 'HS', 'Add-on Cloud CRM sync', 'orange'), b('Zoho CRM (+$49/mo)', 'ZH', 'Add-on Cloud CRM & Books sync', 'purple'), b('Microsoft CRM (+$49/mo)', 'MS', 'Dynamics 365 Cloud CRM sync', 'blue')],
        hardware: [b('Hardware Locked on Basic', '🔒', 'Upgrade to Expert ($899/mo) to unlock RFID, Barcode & POS hardware', 'orange')],
      },
    },
    {
      tier: 'pro', name: 'Pro Account', price: '$499', period: '/month', perUser: '$19/user/mo',
      description: 'Unify your external cloud software, communications & workflows in one OS',
      features: [
        'Everything in Basic Account',
        '3 Free Cloud Software Connectors included (Add up to +4 extra at $49/mo — 7 Total Max)',
        'Up to 30 custom workspaces ($0 additional charge per workspace)',
        'Unified Communications Hub: Cell Phone + Business Phone on-screen dialer, SMS & WhatsApp',
        'Advanced cross-system workflow automation & Dynamic PDF invoice generation',
        'Custom workspace icons, colors & workspace-level analytics',
        'Priority support & 1-Click Q-CORE Security Add-On Bridge',
      ],
      highlight: true, badge: 'Most Popular',
      theme: { card: 'border-2 border-cyan-500/60 bg-gradient-to-br from-cyan-950/30 to-black neon-glow-cyan hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]', badge: 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400', price: 'text-cyan-400 neon-text-cyan', check: 'text-cyan-400', integrateBtn: 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20', icon: 'text-cyan-400', getStartedBtn: 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.15)]', integrateBorder: 'border-cyan-500/30', integrateIconBg: 'bg-cyan-500/15 border-cyan-500/40' },
      integrations: {
        software: [b('3 Free Cloud Connectors', '3x', 'Pick any 3 Cloud Software connectors free (Max 7 total on Pro)', 'cyan'), b('Podio + QuickBooks', 'PQ', 'Run CRM & Accounting side-by-side', 'green'), b('Salesforce', 'SF', 'Two-way Lead, Account & Opportunity sync', 'blue'), b('HubSpot', 'HS', 'Two-way CRM & pipeline sync', 'orange'), b('Microsoft CRM', 'MS', 'Dynamics 365 CRM sync', 'blue'), b('Zoho Suite', 'ZH', 'Zoho CRM & Books bi-directional sync', 'purple'), b('Shopify & Wix', 'SH', 'Live storefront order & inventory sync', 'green'), b('Slack & WhatsApp', 'SW', 'Unified external & internal messaging', 'fuchsia')],
        hardware: [b('Hardware Locked on Pro', '🔒', 'Upgrade to Expert ($899/mo) to unlock RFID, Barcode & POS hardware', 'orange')],
      },
    },
    {
      tier: 'expert', name: 'Expert Account', price: '$899', period: '/month', perUser: '$19/user/mo',
      description: 'Multi-organization management with field hardware, barcode/RFID & mobile layouts',
      features: [
        'Everything in Pro Account',
        'Up to 12 Organizations & 30 workspaces per org with Multi-Org Hierarchy Management',
        '6 Free Connectors included — Mix & Match Cloud Software or Hardware (12 Total Max)',
        'Unlocks Physical Hardware Connectors (+$199/mo beyond free slots): Barcode/RFID, POS & Scales',
        'Role-locked Mobile Kiosk layouts for field technicians & shop-floor personnel',
        'Cross-org financial & inventory roll-up reporting + Enterprise SSO',
        'Eligible for 1-Click Q-CORE Commercial AI Suite (Team Alpha AI / Workflow AI) Add-On',
      ],
      highlight: false, badge: 'Expert',
      theme: { card: 'border border-emerald-600/50 bg-gradient-to-br from-emerald-950/20 to-black hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]', badge: 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400', price: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]', check: 'text-emerald-400', integrateBtn: 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20', icon: 'text-emerald-400', getStartedBtn: 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]', integrateBorder: 'border-emerald-500/30', integrateIconBg: 'bg-emerald-500/15 border-emerald-500/40' },
      integrations: {
        software: [b('6 Free Connectors (Max 12)', '6x', 'Mix & match up to 6 Cloud or Hardware connectors free', 'green'), b('All Cloud CRMs & ERPs', '+', 'Podio, QuickBooks, Salesforce, HubSpot, Zoho, Dynamics', 'cyan'), b('ShipStation / Carriers', 'SS', 'Multi-carrier shipping label & tracking sync', 'blue'), b('SAML / OAuth SSO', 'SSO', 'Enterprise identity provider integration', 'orange'), b('Q-CORE AI Add-On (+$299)', 'AI', 'Optional 1-click upgrade for Team Alpha AI & Workflow AI', 'purple')],
        hardware: [b('Zebra / Brother RFID & Barcode', 'RF', 'Automated thermal barcode & RFID label printing', 'green'), b('POS Terminals & Readers', 'POS', 'Point-of-sale checkout & card readers', 'cyan'), b('Rugged Field Tablets', 'RT', 'Mobile shop-floor & field data terminals', 'orange'), b('Digital Scales', 'SC', 'Batch & weight calibration hardware', 'blue')],
      },
    },
    {
      tier: 'enterprise', name: 'Enterprise', price: '$1,999', period: '/month', perUser: '$19/user/mo',
      description: 'Interactive maps, 3D facility floor-plan WMS & industrial sensor telemetry',
      features: [
        'Everything in Expert Account',
        '12 Free Connectors included across Cloud, ERP & Industrial Hardware (20 Total Max)',
        'Interactive Facility Layouts & Floor-Plan Warehouse Management System (WMS)',
        'Interactive Map, Fleet Telematics & Multi-Stop Route Planning',
        'Live Industrial PLC, Turbine & Frequency Sensor Telemetry (2D/3D Plant Monitoring)',
        'News Feed Tab (Pop-out live market & industry news stations)',
        '1-Click Bridge for Q-CORE Security Camera Workspace & Team Bravo/Delta AI Add-Ons',
      ],
      highlight: false, badge: 'Industrial & WMS',
      theme: { card: 'border border-purple-800/80 bg-gray-900/50 hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]', badge: 'bg-purple-900/40 border border-purple-800 text-purple-300', price: 'text-white', check: 'text-purple-500', integrateBtn: 'bg-purple-900/20 border border-purple-800 text-purple-300 hover:bg-purple-900/40', icon: 'text-purple-400', getStartedBtn: 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600', integrateBorder: 'border-purple-800', integrateIconBg: 'bg-purple-900/30 border-purple-800' },
      integrations: {
        software: [b('12 Free Connectors (Max 20)', '12x', 'Includes heavy ERP, WMS & industrial integrations', 'purple'), b('SAP S/4HANA & NetSuite', 'ERP', 'Two-way enterprise ERP sync', 'blue'), b('Manhattan WMS', 'WMS', 'Warehouse management & control sync', 'orange'), b('Mapbox / Fleet Routing', 'MB', 'Interactive route optimization', 'green'), b('Q-CORE Security Add-Ons', 'QC', '1-Click upgrade for Team Bravo/Delta AI & Live Camera Workspace', 'red')],
        hardware: [b('Industrial PLC & Turbine Sensors', 'PLC', 'Real-time 2D/3D plant frequency & telemetry feeds', 'cyan'), b('RFID Portal Gateways', 'RG', 'Automated dock door & pallet scanning', 'green'), b('Forklift & Wall Displays', 'FT', 'Facility map wall & vehicle terminals', 'orange'), b('GPS Fleet Telematics', 'GPS', 'Live vehicle & asset tracking', 'red')],
      },
    },
    {
      tier: 'enterprisePlus', name: 'Enterprise +', price: '$4,999', period: '/month', perUser: 'Volume Discount',
      description: 'Custom branded UX, runtime amortization & 1-click Quantum Cloud bridge',
      features: [
        'Everything in Enterprise',
        '20 Free Connectors included across all Cloud, ERP & Industrial categories (35 Total Max)',
        'Full Custom Branded UX & Volume Discounts on user seats',
        'Interactive Bubble Analysis Tool & Activity/Data Point Amortization',
        'Real-Time Runtime Analytics',
        '1-Click Integration Ready for Green Horizon Quantum Predictive Intelligence (Billed via Card-on-File)',
      ],
      highlight: true, badge: 'Quantum Ready',
      theme: { card: 'border-2 border-purple-500/60 bg-gradient-to-br from-purple-950/30 to-black neon-glow-purple hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.4)]', badge: 'bg-purple-500/20 border border-purple-500/40 text-purple-400', price: 'text-purple-400 neon-text-purple', check: 'text-purple-400', integrateBtn: 'bg-purple-500/10 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20', icon: 'text-purple-400', getStartedBtn: 'bg-purple-500/20 border-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]', integrateBorder: 'border-purple-500/30', integrateIconBg: 'bg-purple-500/15 border-purple-500/40' },
      integrations: {
        software: [b('20 Free Connectors (Max 35)', '20x', '20 included connectors across all categories', 'purple'), b('Quantum Bubble & Runtime', 'QB', 'Interactive bubble analysis & amortization engine', 'cyan'), b('Green Horizon Add-On Ready', 'GH', '1-click IBM Quantum Cloud + Google Cloud threat bridge (Card-on-file passthrough)', 'green'), b('Branded UX Engine', 'UX', 'Custom white-label organizational branding', 'fuchsia')],
        hardware: [b('All Enterprise Hardware', '+', 'Full PLC, RFID, Telemetry & WMS hardware support', 'purple'), b('Dedicated Edge Collectors', 'DC', 'High-density plant data acquisition nodes', 'cyan'), b('Custom Kiosk Hardware', 'KI', 'Branded facility kiosk terminals', 'fuchsia')],
      },
    },
    {
      tier: 'whiteGlove', name: 'White Glove', price: '$8,999', period: '/month', perUser: 'Included ($0/user)',
      description: 'Dedicated in-house development team, custom ongoing UX & unlimited user seats',
      features: [
        'Everything in Enterprise +',
        'Unlimited Additional User Seats Included ($0/user/month)',
        '40 Free Standard Connectors + Custom In-House Dev Builds (60 Total Connectors Max)',
        'Dedicated Account Manager & Direct Access to In-House Development Team',
        'Custom Ongoing UX Development tailored with your team & Custom Code Priority',
        'Monthly System Optimization Audits & 24/7 Direct Executive Support Line',
        '1-Click Bridge for All Standalone Q-CORE Security & Green Horizon Quantum Add-Ons',
      ],
      highlight: false, badge: 'Full Service',
      theme: { card: 'border border-gray-500/50 bg-gradient-to-br from-gray-900/40 to-black shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:border-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]', badge: 'bg-gray-200/20 border border-gray-300/40 text-white', price: 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]', check: 'text-white', integrateBtn: 'bg-gray-500/20 border border-gray-400/40 text-gray-200 hover:bg-gray-500/40', icon: 'text-white', getStartedBtn: 'bg-gray-200/10 border border-gray-300/50 text-white hover:bg-gray-200/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]', integrateBorder: 'border-gray-500/40', integrateIconBg: 'bg-gray-500/30 border-gray-400/40' },
      integrations: {
        software: [b('40 Free + Custom Dev (Max 60)', '60x', '40 standard connectors + custom-engineered integrations', 'cyan'), b('Bespoke Legacy ERP/DB', 'BI', 'Our in-house team builds custom connectors for your proprietary systems', 'green'), b('Private CI/CD & UX', 'CX', 'Ongoing custom UX & workflow engineering', 'fuchsia'), b('Q-CORE Add-On Bridge', 'QC', '1-Click integration for Q-CORE Active Defense, Cameras & Green Horizon Quantum', 'purple')],
        hardware: [b('Custom Hardware Engineering', 'HW', 'Bespoke sensor networks, custom PLCs & on-site provisioning', 'orange')],
      },
    },
  ];

  // Master feature matrix across all 6 tiers
  const tierKeys = ['basic', 'pro', 'expert', 'enterprise', 'enterprisePlus', 'whiteGlove'] as const;
  const tierLabels: Record<string, string> = { basic: 'Basic', pro: 'Pro', expert: 'Expert', enterprise: 'Enterprise', enterprisePlus: 'Enterprise +', whiteGlove: 'White Glove' };
  const T = [true, true, true, true, true, true];
  const featureMatrix: { feature: string; values: boolean[] }[] = [
    { feature: 'All 6 default workspaces', values: T },
    { feature: '60+ built-in MiniApps', values: T },
    { feature: 'Custom MiniApp builder', values: T },
    { feature: 'Q-CORE quantum encryption', values: T },
    { feature: 'Analytics dashboards', values: T },
    { feature: 'AI-Assistant', values: [false, true, true, true, true, true] },
    { feature: 'Custom workspace creation', values: [false, true, true, true, true, true] },
    { feature: 'Advanced workflow automation', values: [false, true, true, true, true, true] },
    { feature: 'Priority support', values: [false, true, true, true, true, true] },
    { feature: 'MiniApp Builder / Workflow AI', values: [false, false, true, true, true, true] },
    { feature: 'Mobile layouts (field personnel)', values: [false, false, true, true, true, true] },
    { feature: 'Customer-facing AI (Team Alpha)', values: [false, false, true, true, true, true] },
    { feature: 'Multi-organization management', values: [false, false, true, true, true, true] },
    { feature: 'Cross-org reporting', values: [false, false, true, true, true, true] },
    { feature: 'Interactive maps & route planning', values: [false, false, false, true, true, true] },
    { feature: 'Interactive facility floor plans', values: [false, false, false, true, true, true] },
    { feature: 'AI floor plan generation (WMS)', values: [false, false, false, true, true, true] },
    { feature: 'Team Bravo & Delta AI', values: [false, false, false, true, true, true] },
    { feature: 'Core AI Boss Assistant', values: [false, false, false, true, true, true] },
    { feature: 'News Feed tab (pop-out stations)', values: [false, false, false, true, true, true] },
    { feature: 'Branded UX', values: [false, false, false, false, true, true] },
    { feature: 'Quantum predictive analysis', values: [false, false, false, false, true, true] },
    { feature: 'Quantum bubble tool', values: [false, false, false, false, true, true] },
    { feature: 'IBM Quantum Cloud access', values: [false, false, false, false, true, true] },
    { feature: 'Custom ongoing UX development', values: [false, false, false, false, false, true] },
    { feature: 'Dedicated account manager & dev team', values: [false, false, false, false, false, true] },
    { feature: '24/7 executive support line', values: [false, false, false, false, false, true] },
  ];

  // Which tier columns to render in the matrix
  const visibleTierIdx = compareMode
    ? tierKeys.map((k, i) => ({ k, i })).filter(({ k }) => comparedTiers.includes(k)).map(({ i }) => i)
    : tierKeys.map((_, i) => i);

  const toggleComparedTier = (k: string) => {
    setComparedTiers((prev) => {
      if (prev.includes(k)) {
        if (prev.length <= 2) return prev; // keep at least 2
        return prev.filter((x) => x !== k);
      }
      if (prev.length >= 3) return [...prev.slice(1), k]; // max 3, drop oldest
      return [...prev, k];
    });
  };

  // Security comparison
  const securityProviders = [
    { id: 'qcore', name: 'Q-CORE', subtitle: 'Applegate CORE BOS', highlight: true },
    { id: 'aws', name: 'AWS', subtitle: 'Amazon Web Services', highlight: false },
    { id: 'salesforce', name: 'Salesforce', subtitle: 'CRM Platform', highlight: false },
    { id: 'microsoft', name: 'Microsoft', subtitle: 'Dynamics CRM', highlight: false },
    { id: 'nsa', name: 'NSA', subtitle: 'US Intelligence', highlight: false },
    { id: 'military', name: 'US Military', subtitle: 'DoD Systems', highlight: false },
    { id: 'famous', name: 'Famous.ai', subtitle: 'AI Platform', highlight: false },
    { id: 'base44', name: 'Base 44', subtitle: 'No-Code Platform', highlight: false },
  ];

  const securityComparison = [
    { feature: 'Encryption Standard', qcore: { value: 'AES-256-GCM + ML-KEM-1024', status: 'full' }, aws: { value: 'AES-256', status: 'partial' }, salesforce: { value: 'AES-256', status: 'partial' }, microsoft: { value: 'AES-256', status: 'partial' }, nsa: { value: 'Suite B / CNSA', status: 'partial' }, military: { value: 'Type 1 (Classified)', status: 'partial' }, famous: { value: 'AES-256', status: 'partial' }, base44: { value: 'AES-256', status: 'partial' } },
    { feature: 'Post-Quantum Ready', qcore: { value: 'ML-KEM-1024 Integrated', status: 'full' }, aws: { value: 'Testing Phase', status: 'partial' }, salesforce: { value: 'Not Implemented', status: 'none' }, microsoft: { value: 'Research Only', status: 'none' }, nsa: { value: 'CNSA 2.0 Transition', status: 'partial' }, military: { value: 'In Development', status: 'partial' }, famous: { value: 'Not Implemented', status: 'none' }, base44: { value: 'Not Implemented', status: 'none' } },
    { feature: 'Quantum Attack Immunity', qcore: { value: 'Full Protection Today', status: 'full' }, aws: { value: 'Vulnerable until ~2030', status: 'none' }, salesforce: { value: 'Vulnerable', status: 'none' }, microsoft: { value: 'Vulnerable', status: 'none' }, nsa: { value: 'Partial (Classified)', status: 'partial' }, military: { value: 'Partial (Classified)', status: 'partial' }, famous: { value: 'Vulnerable', status: 'none' }, base44: { value: 'Vulnerable', status: 'none' } },
    { feature: 'Harvest Now, Decrypt Later Defense', qcore: { value: 'Protected Today', status: 'full' }, aws: { value: 'Data at Risk', status: 'none' }, salesforce: { value: 'Data at Risk', status: 'none' }, microsoft: { value: 'Data at Risk', status: 'none' }, nsa: { value: 'Classified Measures', status: 'partial' }, military: { value: 'Classified Measures', status: 'partial' }, famous: { value: 'Data at Risk', status: 'none' }, base44: { value: 'Data at Risk', status: 'none' } },
    { feature: 'Hybrid Encryption Protocol', qcore: { value: 'Classical + PQC Combined', status: 'full' }, aws: { value: 'Classical Only', status: 'none' }, salesforce: { value: 'Classical Only', status: 'none' }, microsoft: { value: 'Classical Only', status: 'none' }, nsa: { value: 'Transitioning', status: 'partial' }, military: { value: 'Transitioning', status: 'partial' }, famous: { value: 'Classical Only', status: 'none' }, base44: { value: 'Classical Only', status: 'none' } },
    { feature: 'Key Exchange Security', qcore: { value: 'Quantum-Safe KEMs', status: 'full' }, aws: { value: 'ECDH (Vulnerable)', status: 'none' }, salesforce: { value: 'RSA/ECDH (Vulnerable)', status: 'none' }, microsoft: { value: 'RSA/ECDH (Vulnerable)', status: 'none' }, nsa: { value: 'CNSA 2.0 KEMs', status: 'partial' }, military: { value: 'Type 1 (Classified)', status: 'partial' }, famous: { value: 'ECDH (Vulnerable)', status: 'none' }, base44: { value: 'Standard TLS', status: 'none' } },
    { feature: 'Future-Proof Architecture', qcore: { value: '2050+ Ready', status: 'full' }, aws: { value: 'Obsolete by 2035', status: 'none' }, salesforce: { value: 'Obsolete by 2035', status: 'none' }, microsoft: { value: 'Obsolete by 2035', status: 'none' }, nsa: { value: '2033 Mandate', status: 'partial' }, military: { value: '2033 Mandate', status: 'partial' }, famous: { value: 'Obsolete by 2035', status: 'none' }, base44: { value: 'Obsolete by 2030', status: 'none' } },
    { feature: 'Zero-Knowledge Proofs', qcore: { value: 'Fully Integrated', status: 'full' }, aws: { value: 'Not Available', status: 'none' }, salesforce: { value: 'Not Available', status: 'none' }, microsoft: { value: 'Limited', status: 'partial' }, nsa: { value: 'Classified', status: 'partial' }, military: { value: 'Classified', status: 'partial' }, famous: { value: 'Not Available', status: 'none' }, base44: { value: 'Not Available', status: 'none' } },
    { feature: 'End-to-End Encryption', qcore: { value: 'All Data, All Times', status: 'full' }, aws: { value: 'Optional (Extra Cost)', status: 'partial' }, salesforce: { value: 'Shield Add-on ($$$)', status: 'partial' }, microsoft: { value: 'Enterprise Only', status: 'partial' }, nsa: { value: 'All Communications', status: 'full' }, military: { value: 'All Communications', status: 'full' }, famous: { value: 'Transit Only', status: 'partial' }, base44: { value: 'Transit Only', status: 'partial' } },
    { feature: 'Cryptographic Agility', qcore: { value: 'Instant Algorithm Swap', status: 'full' }, aws: { value: 'Manual Migration', status: 'partial' }, salesforce: { value: 'Vendor Dependent', status: 'none' }, microsoft: { value: 'Slow Updates', status: 'partial' }, nsa: { value: 'Rapid Response', status: 'full' }, military: { value: 'Rapid Response', status: 'full' }, famous: { value: 'Vendor Dependent', status: 'none' }, base44: { value: 'No Control', status: 'none' } },
  ];

  // ERP / CRM / WMS competitive comparison
  const erpProviders = [
    { id: 'acore', name: 'A-CORE', subtitle: 'Unified BOS', highlight: true },
    { id: 'sap', name: 'SAP', subtitle: 'S/4HANA ERP', highlight: false },
    { id: 'oracle', name: 'Oracle', subtitle: 'NetSuite ERP', highlight: false },
    { id: 'sfdc', name: 'Salesforce', subtitle: 'CRM Cloud', highlight: false },
    { id: 'msd', name: 'MS Dynamics', subtitle: '365 ERP/CRM', highlight: false },
    { id: 'manh', name: 'Manhattan', subtitle: 'WMS', highlight: false },
  ];
  const erpComparison = [
    { feature: 'ERP + CRM + WMS in one platform', acore: 'full', sap: 'partial', oracle: 'partial', sfdc: 'none', msd: 'partial', manh: 'none' },
    { feature: 'No-code MiniApp / workflow builder', acore: 'full', sap: 'none', oracle: 'partial', sfdc: 'partial', msd: 'partial', manh: 'none' },
    { feature: 'Built-in multi-agent AI suite', acore: 'full', sap: 'partial', oracle: 'partial', sfdc: 'partial', msd: 'partial', manh: 'none' },
    { feature: 'Quantum-immune encryption', acore: 'full', sap: 'none', oracle: 'none', sfdc: 'none', msd: 'none', manh: 'none' },
    { feature: 'Interactive maps & floor-plan WMS', acore: 'full', sap: 'partial', oracle: 'none', sfdc: 'none', msd: 'none', manh: 'full' },
    { feature: 'Quantum predictive analytics', acore: 'full', sap: 'none', oracle: 'none', sfdc: 'none', msd: 'none', manh: 'none' },
    { feature: 'Deploys over existing systems', acore: 'full', sap: 'none', oracle: 'none', sfdc: 'partial', msd: 'partial', manh: 'none' },
    { feature: 'Transparent flat monthly pricing', acore: 'full', sap: 'none', oracle: 'none', sfdc: 'partial', msd: 'partial', manh: 'none' },
    { feature: 'Implementation time', acore: 'full', sap: 'none', oracle: 'none', sfdc: 'partial', msd: 'none', manh: 'none' },
    { feature: 'Self-serve setup (no consultants)', acore: 'full', sap: 'none', oracle: 'none', sfdc: 'partial', msd: 'partial', manh: 'none' },
  ];

  const getStatusIcon = (status: string, size = 18) => {
    switch (status) {
      case 'full': return <CheckCircleIcon size={size} className="text-green-400" />;
      case 'partial': return <AlertTriangleIcon size={size} className="text-yellow-400" />;
      default: return <XCircleIcon size={size} className="text-red-400" />;
    }
  };
  const getStatusColor = (status: string) => (status === 'full' ? 'text-green-400' : status === 'partial' ? 'text-yellow-400' : 'text-red-400');

  const handleStartCheckout = async (tier?: string) => {
    setIsCheckoutLoading(true);
    try {
      onOpenRegister(tier);
    } catch (error) {
      console.error('Checkout error:', error);
    }
    setIsCheckoutLoading(false);
  };

  // ⚡ A-CORE LITE LANDING PAGE (Podio Marketplace Companion Edition)
  // All full-launch data arrays above and full JSX sections below remain 100% preserved!
  if (FEATURES.IS_LITE_MODE) {
    const liteFeatures = [
      {
        icon: DatabaseIcon,
        title: 'Bi-Directional Podio Sync',
        description: 'Import your Podio Workspaces, Apps, Schemas, and Records in one click. Add or edit data in Podio or A-CORE and watch both stay in sync.',
        color: 'cyan',
      },
      {
        icon: GitBranch,
        title: 'Automatic Relationship Wiring',
        description: 'Podio Relationship fields are automatically detected in topological order and wired directly into A-CORE relational Connection fields.',
        color: 'green',
      },
      {
        icon: ZapIcon,
        title: 'Visual Workflow Automation',
        description: 'Build trigger-and-action workflows across your synced MiniApps to automate status updates, record creation, and team alerts.',
        color: 'magenta',
      },
      {
        icon: FileText,
        title: 'Dynamic PDF Builder',
        description: 'Design custom PDF templates mapped directly to your MiniApp fields to generate polished invoices, proposals, and reports on demand.',
        color: 'orange',
      },
      {
        icon: Sparkles,
        title: 'QBall Quick-Action Hub',
        description: 'Launch Tasks, Workflows, Reports, Calendar Events, and live Activity feeds from anywhere in your workspace with one click.',
        color: 'purple',
      },
      {
        icon: MessageSquare,
        title: 'Tasks, Calendar & Messages',
        description: 'Keep your organization aligned with integrated task management, shared scheduling, real-time team messaging, and Q-CORE security.',
        color: 'red',
      },
    ];

    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="fixed inset-0 alien-grid pointer-events-none" />
        <div className="fixed inset-0 hex-pattern pointer-events-none opacity-50" />

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-lg border-b border-cyan-500/20 z-40">
          <div className="flex items-center justify-between h-full px-4 w-full mx-auto">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <div className="absolute -inset-x-2 h-1/2 top-1/2 -translate-y-1/2 bg-cyan-500/10 rounded-lg blur-sm opacity-30" />
                <ApplegateCoreLogo className="relative z-10 w-40 h-auto text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.25)]" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                Podio Edition
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenLogin}
                className="px-5 py-2 bg-gray-900/50 border border-gray-700 text-gray-300 font-medium font-mono rounded-lg hover:bg-gray-800 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenRegister('lite')}
                className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-medium font-mono rounded-lg hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all shadow-[0_0_15px_rgba(0,255,255,0.15)]"
              >
                Create Account
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-28 pb-12 px-4 relative flex-1 flex flex-col justify-center">
          <div className="w-full max-w-5xl mx-auto text-center relative z-10">
            <div className="flex flex-col items-center gap-3 mb-6 relative z-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <GitBranch size={16} />
                Official Podio Workspace &amp; MiniApp Companion
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-cyan-900/20 border border-cyan-500/20 rounded-full text-gray-400 text-[10px] sm:text-xs font-mono backdrop-blur-md">
                <LockIcon size={12} className="text-cyan-400" />
                <span>
                  Protected by <span className="text-cyan-400 font-bold">Q-CORE</span> AES-256-GCM + PQC-ML-KEM-1024 Encryption
                </span>
              </div>
            </div>

            <div className="relative flex justify-center -mt-12 -mb-10 md:-mt-20 md:-mb-16 z-10 pointer-events-none">
              <div className="absolute inset-0 rounded-full blur-3xl bg-cyan-500/15" />
              <ApplegateCoreLogo className="relative w-72 sm:w-80 md:w-[28rem] h-auto text-cyan-400 drop-shadow-[0_0_30px_rgba(0,255,255,0.45)]" />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight font-mono relative z-20">
              Supercharge Your <span className="text-emerald-400">Podio</span><br />
              Workspaces in <span className="text-cyan-400">A-CORE</span>
            </h1>

            <p className="text-base md:text-lg text-gray-500 font-mono mb-4 flex items-center justify-center gap-2 relative z-20">
              by
              <a
                href="https://www.applegate.solutions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors pointer-events-auto"
              >
                <img src={LOGO_URL} alt="Applegate Solutions Logo" className="h-6 w-auto drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]" />
                Applegate.Solutions
              </a>
            </p>

            <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto mb-8 font-mono relative z-20">
              Connect your Podio account to mirror your organization&apos;s Workspaces, Apps, Relationships, and Records with real-time bi-directional sync, custom Workflows, PDF generation, QBall quick actions, Tasks, Calendar, and Messages.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
              <button
                onClick={() => handleStartCheckout('lite')}
                disabled={isCheckoutLoading}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 font-semibold font-mono rounded-xl hover:bg-emerald-500/25 transition-all shadow-[0_0_25px_rgba(16,185,129,0.25)] text-lg disabled:opacity-50"
              >
                {isCheckoutLoading ? 'Loading...' : 'Get Started & Connect Podio'}
              </button>
              <button
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-8 py-4 bg-gray-900/80 border border-gray-700 text-gray-300 font-semibold font-mono rounded-xl hover:bg-gray-800 hover:border-cyan-500/40 hover:text-cyan-300 transition-all text-lg"
              >
                Sign In to Existing Account
              </button>
            </div>
          </div>
        </section>

        {/* Lite Features Grid */}
        <section className="py-12 px-4 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 font-mono">Built for Seamless Podio Collaboration</h2>
              <p className="text-gray-500 text-base md:text-lg font-mono">Your organization, your Podio workspaces, zero clutter.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liteFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className={`rounded-2xl border p-6 transition-all ${getFeatureClasses(f.color)}`}>
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${getIconClasses(f.color)}`}>
                      <Icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 font-mono">{f.title}</h3>
                    <p className="text-gray-400 font-mono text-sm leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How Podio <-> A-CORE Works */}
        <section className="py-12 px-4 relative">
          <div className="max-w-5xl mx-auto rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-black to-emerald-950/20 p-8">
            <h3 className="text-2xl font-bold text-white font-mono text-center mb-8">How A-CORE Works With Podio</h3>
            <div className="grid md:grid-cols-3 gap-6 font-mono">
              <div className="p-5 rounded-xl bg-black/60 border border-gray-800">
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Step 1 • Authenticate</div>
                <h4 className="text-white font-bold mb-2">Create Your Organization</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Sign up for your dedicated A-CORE organization and authorize your Podio account via secure OAuth 2.0.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-black/60 border border-gray-800">
                <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-2">Step 2 • Auto-Build</div>
                <h4 className="text-white font-bold mb-2">Import Workspaces &amp; Apps</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Auto-create matching Workspaces, MiniApps, field schemas, and linked Connections in topological order.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-black/60 border border-gray-800">
                <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-2">Step 3 • Live Two-Way Sync</div>
                <h4 className="text-white font-bold mb-2">Work in Either Platform</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Add or update records in Podio or A-CORE and trigger Workflows, PDFs, Tasks, Calendar events, and Reports automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-cyan-500/20 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ApplegateCoreLogo className="w-16 h-auto text-gray-500" />
              <span className="text-gray-600 font-mono text-xs">A-CORE BOS • Podio Edition</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 font-mono">
              <a href="https://www.applegate.solutions" className="hover:text-cyan-400 transition-colors">Applegate.Solutions</a>
              <span>|</span>
              <span>&copy; 2026 Applegate Solutions. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 alien-grid pointer-events-none" />
      <div className="fixed inset-0 hex-pattern pointer-events-none opacity-50" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-lg border-b border-cyan-500/20 z-40">
        <div className="flex items-center justify-between h-full px-4 w-full mx-auto">
          <div className="flex items-center">
            <div className="relative flex items-center">
              {/* Dimmed the background glow element behind the logo */}
              <div className="absolute -inset-x-2 h-1/2 top-1/2 -translate-y-1/2 bg-cyan-500/10 rounded-lg blur-sm opacity-30" />
              {/* Doubled the width to w-40 and halved the drop-shadow values */}
              <ApplegateCoreLogo className="relative z-10 w-40 h-auto text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.25)]" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onOpenLogin} className="px-5 py-2 bg-gray-900/50 border border-gray-700 text-gray-300 font-medium font-mono rounded-lg hover:bg-gray-800 hover:border-cyan-500/50 hover:text-cyan-400 transition-all">
              Sign In
            </button>
            <button onClick={() => onOpenRegister()} className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-medium font-mono rounded-lg hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all shadow-[0_0_15px_rgba(0,255,255,0.15)]">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - large central logo, minimal dead space */}
      <section className="pt-24 pb-10 px-4 relative">
        
        <style>{`
          /* "Welcome to" Animation */
          @keyframes leftToRightFadeOut {
            0% { background-position: 100% 0; opacity: 1; filter: blur(0px); transform: scale(1); }
            20% { background-position: 0% 0; opacity: 1; filter: blur(0px); transform: scale(1); }
            80% { background-position: 0% 0; opacity: 1; filter: blur(0px); transform: scale(1); }
            100% { background-position: 0% 0; opacity: 0; filter: blur(15px); transform: scale(0.9); visibility: hidden; }
          }
          .animate-wipe-in {
            background: linear-gradient(to right, #22d3ee 45%, rgba(34, 211, 238, 0) 55%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: leftToRightFadeOut 5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }

          /* Workspace Color Cycling using Hue-Rotate (Preserves black lines/details) */
          /* The rotation moves forward smoothly through the color wheel: Cyan -> Purple -> Magenta -> Red -> Orange -> Green -> Cyan */
          @keyframes colorCycleLogo {
            0% { filter: hue-rotate(0deg) brightness(1.1) drop-shadow(0 0 35px rgba(0, 255, 255, 0.55)); }
            16.6% { filter: hue-rotate(75deg) brightness(1.1) drop-shadow(0 0 35px rgba(168, 85, 247, 0.55)); }
            33.3% { filter: hue-rotate(120deg) brightness(1.1) drop-shadow(0 0 35px rgba(255, 0, 255, 0.55)); }
            50% { filter: hue-rotate(180deg) brightness(1.1) drop-shadow(0 0 35px rgba(239, 68, 68, 0.55)); }
            66.6% { filter: hue-rotate(210deg) brightness(1.1) drop-shadow(0 0 35px rgba(255, 153, 0, 0.55)); }
            83.3% { filter: hue-rotate(290deg) brightness(1.1) drop-shadow(0 0 35px rgba(34, 197, 94, 0.55)); }
            100% { filter: hue-rotate(360deg) brightness(1.1) drop-shadow(0 0 35px rgba(0, 255, 255, 0.55)); }
          }
          @keyframes colorCycleGlow {
            0%, 100% { background-color: rgba(0, 255, 255, 0.2); }
            16.6% { background-color: rgba(168, 85, 247, 0.2); }
            33.3% { background-color: rgba(255, 0, 255, 0.2); }
            50% { background-color: rgba(239, 68, 68, 0.2); }
            66.6% { background-color: rgba(255, 153, 0, 0.2); }
            83.3% { background-color: rgba(34, 197, 94, 0.2); }
          }

          /* Slow Organic Pulse (Opacity + subtle Scale) */
          @keyframes slowPulseLogo {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.85; transform: scale(0.98); }
          }
          @keyframes slowPulseGlow {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.95); }
          }

          /* Combine the cycles and pulses */
          /* Note: We use "linear" for the color cycle so it spins through the hues continuously without stuttering */
          .animate-workspace-logo {
            /* Changed slowPulseLogo duration from 4s to 8s */
            animation: colorCycleLogo 24s linear infinite, slowPulseLogo 8s ease-in-out infinite;
          }
          .animate-workspace-glow {
            /* Changed slowPulseGlow duration from 4s to 8s */
            animation: colorCycleGlow 24s linear infinite, slowPulseGlow 8s ease-in-out infinite;
          }
        `}</style>

        <div className="w-full max-w-5xl mx-auto text-center relative z-10">
          
          {/* Top Badges / Readouts */}
          <div className="flex flex-col items-center gap-3 mb-6 relative z-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-mono shadow-[0_0_15px_rgba(0,255,255,0.1)]">
              <ShieldIcon size={16} />
              Enterprise-Grade Business Operating System
            </div>
            
            {/* New Q-CORE Security Banner */}
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-cyan-900/20 border border-cyan-500/20 rounded-full text-gray-400 text-[10px] sm:text-xs font-mono backdrop-blur-md">
              <LockIcon size={12} className="text-cyan-400" />
              <span>
                Protected by <span className="text-cyan-400 font-bold">Q-CORE</span> AES-256-GCM + SHA-512 Signed + PQC-ML-KEM-1024 Encryption
              </span>
            </div>
          </div>

          {/* Animated "Welcome to" Text */}
          <div className="h-0 relative flex justify-center z-30 pointer-events-none">
            <div className="animate-wipe-in absolute top-4 md:top-6 text-2xl md:text-3xl lg:text-4xl font-bold font-mono uppercase tracking-widest whitespace-nowrap drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
              Welcome to
            </div>
          </div>

          {/* Large central A-CORE logo (10% Larger + Proportionally Tighter Negative Margins) */}
          <div className="relative flex justify-center -mt-[4.5rem] -mb-[3.5rem] md:-mt-[7.75rem] md:-mb-[6.5rem] lg:-mt-[9rem] lg:-mb-[7.75rem] z-10 pointer-events-none">
            <div className="absolute inset-0 rounded-full blur-3xl animate-workspace-glow" />
            {/* Width increased by exactly 10% across all breakpoints */}
            <ApplegateCoreLogo className="relative w-[22rem] sm:w-[26.5rem] md:w-[37.5rem] h-auto animate-workspace-logo" />
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-5 leading-tight font-mono relative z-20">
            Your Complete <span className="landing-purple-pulse">Business</span><br /><span className="landing-purple-pulse">Operating System</span>
          </h1>
          
          <p className="text-base md:text-lg text-gray-500 font-mono mb-5 flex items-center justify-center gap-2 relative z-20">
            by 
            <a href="https://www.applegate.solutions" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors pointer-events-auto">
              <img src={LOGO_URL} alt="Applegate Solutions Logo" className="h-6 w-auto drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]" />
              Applegate.Solutions
            </a>
          </p>

          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-7 font-mono relative z-20">
            6 integrated workspaces, 60+ MiniApps, and powerful customization tools to run your entire business from one quantum-secured platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
            <button onClick={() => handleStartCheckout()} disabled={isCheckoutLoading} className="w-full sm:w-auto px-8 py-4 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-semibold font-mono rounded-xl hover:bg-cyan-500/20 transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)] text-lg disabled:opacity-50 neon-glow-cyan">
              {isCheckoutLoading ? 'Loading...' : 'Request Beta Access'}
            </button>
            <button onClick={onOpenLogin} className="w-full sm:w-auto px-8 py-4 bg-gray-900/80 border border-gray-700 text-gray-300 font-semibold font-mono rounded-xl hover:bg-gray-800 hover:border-gray-600 transition-all text-lg">Sign In</button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-14 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">Everything You Need to Run Your Business</h2>
            <p className="text-gray-500 text-lg font-mono">One platform. Six workspaces. Infinite customization.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className={`rounded-2xl border p-6 transition-all ${getFeatureClasses(f.color)}`}>
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${getIconClasses(f.color)}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 font-mono">{f.title}</h3>
                  <p className="text-gray-400 font-mono text-sm leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Anti-Silo / Overlay Section */}
      <section className="py-14 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm font-mono mb-4">
              <LayersIcon size={16} /> One Layer Over Everything
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">Kill the Data Silos</h2>
            <p className="text-gray-500 text-lg font-mono max-w-3xl mx-auto">A-CORE lays a single intelligent operating layer over your existing ERP, CRM, WMS, spreadsheets and tools — unifying fragmented data without ripping out what already works.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Visual: scattered silos -> unified */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-black p-6">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">Before — Disconnected Silos</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {['ERP', 'CRM', 'WMS', 'Sheets', 'Email', 'Legacy DB'].map((s, i) => (
                  <div key={i} className="rounded-lg border border-gray-700 bg-gray-900/60 py-4 text-center font-mono text-xs text-gray-400">{s}</div>
                ))}
              </div>
              <div className="flex justify-center mb-4">
                <ChevronDownIcon size={28} className="text-cyan-400 animate-bounce" />
              </div>
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">After — Unified by A-CORE</p>
              <div className="rounded-xl border-2 border-cyan-500/50 bg-cyan-500/10 py-6 text-center neon-glow-cyan">
                <ApplegateCoreLogo className="w-16 h-auto mx-auto text-cyan-400 mb-2" />
                <p className="font-mono text-cyan-300 text-sm font-bold">Single Source of Truth</p>
              </div>
            </div>

            {/* Bullet explanation */}
            <div className="space-y-5">
              {[
                { icon: DatabaseIcon, title: 'Connect, don\'t replace', desc: 'Sync data bi-directionally from Podio, QuickBooks, HubSpot, Salesforce, Zoho, Slack, WhatsApp, Shopify, SAP, NetSuite, and Manhattan WMS — no costly rip-and-replace migration.' },
                { icon: GlobeIcon, title: 'One unified view', desc: 'Customers, orders, inventory, finance and personnel all relate to each other in a single relational model across every department.' },
                { icon: ZapIcon, title: 'Automate across systems', desc: 'Workflow AI triggers actions across previously-disconnected tools, eliminating manual re-keying and reconciliation.' },
                { icon: ShieldIcon, title: 'Govern centrally', desc: 'Role-based access, audit logs and Q-CORE quantum encryption applied consistently over all your federated data.' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-mono font-bold mb-1">{item.title}</h3>
                      <p className="text-gray-400 font-mono text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Workspaces */}
      <section className="py-14 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">6 Powerful Workspaces</h2>
            <p className="text-gray-500 text-lg font-mono">Pre-built MiniApps for every department, ready to use on day one.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws, i) => (
              <div 
                key={i} 
                onClick={() => setExpandedWorkspace(expandedWorkspace === ws.name ? null : ws.name)}
                className={`rounded-2xl border bg-gray-900/40 p-6 transition-all cursor-pointer hover:bg-gray-900/60 flex flex-col ${ws.theme.border}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-black/60 border border-gray-800">
                      <ws.icon size={22} className={ws.theme.check} />
                    </div>
                    <h3 className="text-xl font-bold text-white font-mono">{ws.name}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-xs font-mono flex-shrink-0 ${ws.theme.badge}`}>
                    {ws.apps > 0 ? `${ws.apps} MiniApps` : 'Coming Soon'}
                  </span>
                </div>
                <p className="text-gray-500 font-mono text-xs leading-relaxed">{ws.description}</p>
                
                {/* Expanded Details */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedWorkspace === ws.name ? 'max-h-[500px] opacity-100 mt-5' : 'max-h-0 opacity-0 mt-0'}`}>
                  <div className="pt-4 border-t border-gray-800">
                    <p className="text-gray-300 text-xs font-mono mb-3 font-bold uppercase tracking-wider">Key Capabilities</p>
                    <ul className="space-y-2.5">
                      {ws.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-gray-400 font-mono text-xs">
                          <CheckIcon size={14} className={`flex-shrink-0 mt-0.5 ${ws.theme.check}`} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Expansion Indicator Arrow */}
                <div className="mt-auto pt-4 flex justify-center">
                  <ChevronDownIcon size={18} className={`text-gray-600 transition-transform duration-300 ${expandedWorkspace === ws.name ? 'rotate-180' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ERP / CRM / WMS Comparison */}
      <section className="py-14 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-mono mb-4">
              <BarChartIcon size={16} /> Head-to-Head
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">A-CORE vs. Major ERP, CRM &amp; WMS Systems</h2>
            <p className="text-gray-500 text-lg font-mono max-w-3xl mx-auto">See how a single unified A-CORE deployment compares to stitching together legacy enterprise suites.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-cyan-500/20 darkwave-scrollbar">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="bg-gray-900/80">
                  <th className="p-4 font-mono text-cyan-300 text-sm sticky left-0 bg-[#05080f] z-20 border-r border-cyan-500/20 shadow-[4px_0_12px_rgba(0,0,0,0.9)]">Capability</th>
                  {erpProviders.map((p) => (
                    <th key={p.id} className={`p-4 font-mono text-sm text-center ${p.highlight ? 'text-cyan-400' : 'text-gray-400'}`}>
                      <div className={p.highlight ? 'neon-text-cyan font-bold' : 'font-semibold'}>{p.name}</div>
                      <div className="text-[10px] text-gray-600 font-normal">{p.subtitle}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {erpComparison.map((row, i) => (
                  <tr key={i} className={`border-t border-gray-800 ${i % 2 === 0 ? 'bg-black/30' : 'bg-gray-900/20'}`}>
                    <td className="p-4 font-mono text-gray-300 text-sm sticky left-0 bg-[#05080f] z-20 border-r border-cyan-500/20 shadow-[4px_0_12px_rgba(0,0,0,0.9)]">{row.feature}</td>
                    {erpProviders.map((p) => (
                      <td key={p.id} className={`p-4 text-center ${p.highlight ? 'bg-cyan-500/5' : ''}`}>
                        <div className="flex justify-center">{getStatusIcon((row as any)[p.id])}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-5 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-green-400"><CheckCircleIcon size={14} /> Full support</span>
            <span className="flex items-center gap-1.5 text-yellow-400"><AlertTriangleIcon size={14} /> Partial / add-on</span>
            <span className="flex items-center gap-1.5 text-red-400"><XCircleIcon size={14} /> Not available</span>
          </div>
        </div>
      </section>

      {/* Q-CORE Security Comparison */}
      <section className="py-14 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-mono mb-4">
              <ShieldIcon size={16} /> Quantum-Immune Security
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">Q-CORE vs. The World</h2>
            <p className="text-gray-500 text-lg font-mono max-w-3xl mx-auto">See how our quantum-immune encryption stacks up against the biggest names in tech, intelligence, and defense.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-cyan-500/20 darkwave-scrollbar">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-gray-900/80">
                  <th className="p-4 font-mono text-cyan-300 text-sm sticky left-0 bg-[#05080f] z-20 border-r border-cyan-500/20 shadow-[4px_0_12px_rgba(0,0,0,0.9)]">Security Feature</th>
                  {securityProviders.map((p) => (
                    <th key={p.id} className={`p-4 font-mono text-sm text-center ${p.highlight ? 'text-cyan-400' : 'text-gray-400'}`}>
                      <div className={p.highlight ? 'neon-text-cyan font-bold' : 'font-semibold'}>{p.name}</div>
                      <div className="text-[10px] text-gray-600 font-normal">{p.subtitle}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {securityComparison.map((row, i) => (
                  <tr key={i} className={`border-t border-gray-800 ${i % 2 === 0 ? 'bg-black/30' : 'bg-gray-900/20'}`}>
                    <td className="p-4 font-mono text-gray-300 text-sm sticky left-0 bg-[#05080f] z-20 border-r border-cyan-500/20 shadow-[4px_0_12px_rgba(0,0,0,0.9)]">{row.feature}</td>
                    {securityProviders.map((p) => {
                      const cell = (row as any)[p.id];
                      return (
                        <td key={p.id} className={`p-4 text-center ${p.highlight ? 'bg-cyan-500/5' : ''}`}>
                          <div className="flex flex-col items-center gap-1">
                            {getStatusIcon(cell.status)}
                            <span className={`text-[10px] font-mono ${getStatusColor(cell.status)}`}>{cell.value}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="py-14 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">System Requirements</h2>
            <p className="text-gray-500 text-lg font-mono">A-CORE BOS runs entirely in your browser — here's what your local machine needs.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemRequirements.map((req, i) => {
              const Icon = req.icon;
              return (
                <div key={i} className="rounded-2xl border border-cyan-500/20 bg-gray-900/40 p-6 hover:border-cyan-500/40 transition-all">
                  <div className="w-12 h-12 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3 font-mono">{req.title}</h3>
                  <ul className="space-y-2">
                    {req.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-400 font-mono text-xs">
                        <CheckIcon size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section - all 6 tiers visible */}
      <section className="py-14 px-4 relative" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 text-lg font-mono">All six plans, no hidden tiers. Every plan includes Q-CORE quantum encryption.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {pricing.map((plan, index) => (
              <div key={index} className={`relative rounded-2xl p-8 overflow-hidden transition-all duration-300 flex flex-col h-full ${plan.theme.card}`}>
                
                {plan.badge && (
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-mono font-bold ${plan.theme.badge}`}>{plan.badge}</div>
                )}
                {plan.highlight && <div className="absolute inset-0 hex-pattern opacity-20 pointer-events-none" />}

                <div className="relative z-10 flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2 font-mono">{plan.name}</h3>
                  <p className="text-gray-500 mb-4 font-mono text-sm leading-relaxed">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-5xl font-bold font-mono ${plan.theme.price}`}>{plan.price}</span>
                    <span className="text-gray-500 font-mono text-lg">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 text-sm font-mono mb-6">{plan.perUser} for additional users</p>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-400 font-mono text-sm leading-tight">
                        <CheckIcon size={16} className={`flex-shrink-0 mt-0.5 ${plan.theme.check}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Integrations slide-down */}
                <div className="relative z-10 mb-4">
                  <button onClick={() => setExpandedTier(expandedTier === plan.tier ? null : plan.tier)} aria-expanded={expandedTier === plan.tier} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-mono text-sm font-semibold transition-all ${plan.theme.integrateBtn}`}>
                    <span className="flex items-center gap-2"><ZapIcon size={16} className={plan.theme.icon} /> View Integrations</span>
                    <ChevronDownIcon size={18} className={`transition-transform duration-300 ${expandedTier === plan.tier ? 'rotate-180' : ''} ${plan.theme.icon}`} />
                  </button>

                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedTier === plan.tier ? 'max-h-[1400px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                    <div className={`rounded-xl border p-4 space-y-5 bg-black/60 ${plan.theme.integrateBorder}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${plan.theme.integrateIconBg}`}><GlobeIcon size={15} className={plan.theme.icon} /></div>
                          <h4 className="text-white font-mono font-bold text-sm tracking-wide">Software Integrations</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.integrations.software.map((item, i) => <BrandBadge key={i} item={item} />)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${plan.theme.integrateIconBg}`}><CpuIcon size={15} className={plan.theme.icon} /></div>
                          <h4 className="text-white font-mono font-bold text-sm tracking-wide">Hardware Integrations</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.integrations.hardware.map((item, i) => <BrandBadge key={i} item={item} />)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-auto">
                  <button onClick={() => handleStartCheckout(plan.tier)} className={`w-full py-3.5 rounded-xl font-semibold font-mono transition-all text-lg ${plan.theme.getStartedBtn}`}>Get Started</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 bg-gray-900/50 border border-gray-800 rounded-xl">
              <UsersIcon size={20} className="text-cyan-400" />
              <div className="text-left">
                <p className="text-white font-mono font-medium">Additional Team Members</p>
                <p className="text-gray-500 text-sm font-mono">$19/user/month across all plans. Includes Workspace Admin, Regular User, Light User, and Guest roles.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Feature Comparison Matrix with Compare Plans toggle */}
      <section className="py-14 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-mono">Full Feature Comparison</h2>
            <p className="text-gray-500 text-lg font-mono">Every feature, across all six tiers, at a glance.</p>
          </div>

          {/* Sticky Compare Plans control bar */}
          <div className="sticky top-16 z-30 mb-4">
            <div className="rounded-xl border border-purple-500/30 bg-black/90 backdrop-blur-lg p-4 shadow-[0_0_25px_rgba(168,85,247,0.12)]">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCompareMode((v) => !v)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-all ${compareMode ? 'bg-purple-500/30 border-purple-500/60' : 'bg-gray-800 border-gray-700'}`}
                    aria-pressed={compareMode}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full transition-transform ${compareMode ? 'translate-x-6 bg-purple-300' : 'translate-x-1 bg-gray-400'}`} />
                  </button>
                  <div>
                    <p className="text-white font-mono font-bold text-sm">Compare Plans</p>
                    <p className="text-gray-500 font-mono text-xs">Pin 2–3 tiers to view them head-to-head</p>
                  </div>
                </div>
                <div className={`flex flex-wrap gap-2 ${compareMode ? '' : 'opacity-40 pointer-events-none'}`}>
                  {tierKeys.map((k) => {
                    const active = comparedTiers.includes(k);
                    return (
                      <button
                        key={k}
                        onClick={() => toggleComparedTier(k)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border transition-all ${active ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.15)]' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                      >
                        {tierLabels[k]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {compareMode && (
                <p className="text-purple-300/70 font-mono text-[11px] mt-3">Showing {comparedTiers.length} pinned tiers. Select up to 3 (minimum 2).</p>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-purple-500/20 darkwave-scrollbar">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-gray-900/80">
                  <th className="p-4 font-mono text-purple-300 text-sm sticky left-0 bg-[#05080f] z-20 border-r border-purple-500/20 shadow-[4px_0_12px_rgba(0,0,0,0.9)]">Feature</th>
                  {visibleTierIdx.map((i) => {
                    const k = tierKeys[i];
                    return (
                      <th key={k} className="p-4 font-mono text-sm text-center">
                        <div className={i >= 3 ? 'text-purple-400 font-bold' : 'text-cyan-400 font-semibold'}>{tierLabels[k]}</div>
                        <div className="text-[10px] text-gray-600 font-normal">{pricing.find((p) => p.tier === k)?.price}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((row, i) => (
                  <tr key={i} className={`border-t border-gray-800 ${i % 2 === 0 ? 'bg-black/30' : 'bg-gray-900/20'}`}>
                    <td className="p-3 font-mono text-gray-300 text-sm sticky left-0 bg-[#05080f] z-20 border-r border-purple-500/20 shadow-[4px_0_12px_rgba(0,0,0,0.9)]">{row.feature}</td>
                    {visibleTierIdx.map((idx) => (
                      <td key={idx} className={`p-3 text-center ${idx >= 3 ? 'bg-purple-500/5' : ''}`}>
                        {row.values[idx] ? <CheckCircleIcon size={18} className="text-green-400 mx-auto" /> : <XCircleIcon size={18} className="text-gray-700 mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-mono">Ready to Transform Your Business?</h2>
          <button onClick={() => onOpenRegister()} className="px-8 py-4 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-semibold font-mono rounded-xl hover:bg-cyan-500/20 transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)] text-lg neon-glow-cyan">Request Beta Access</button>
        </div>
      </section>

      {/* Compact Footer */}
      <footer className="py-6 px-4 border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ApplegateCoreLogo className="w-16 h-auto text-gray-500" />
            <span className="text-gray-600 font-mono text-xs">A-CORE BOS</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600 font-mono">
            <a href="https://www.applegate.solutions" className="hover:text-cyan-400 transition-colors">Applegate.Solutions</a>
            <span>|</span>
            <span>&copy; 2026 Applegate Solutions. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
