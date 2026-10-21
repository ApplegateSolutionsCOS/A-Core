import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import { evaluateConnectorQuota, getEffectiveTier, TIER_RANK } from '@/config/features';
import { SubscriptionTier } from '@/types';
import {
  SettingsIcon,
  DatabaseIcon,
  BuildIcon,
  CheckIcon,
  CloseIcon,
  CpuIcon,
  SearchIcon,
  BarChartIcon,
  ActivityIcon,
} from '@/components/icons/Icons';
import IntegrationConfigModal from './IntegrationConfigModal';
import HardwareStatusDashboard from './HardwareStatusDashboard';
import SyncJobsMonitor from './SyncJobsMonitor';
import IntegrationAuditLog from './IntegrationAuditLog';
import CredentialHealthDashboard from './CredentialHealthDashboard';

import {
  ZebraPrinterIcon,
  HoneywellIcon,
  SiemensIcon,
  RockwellIcon,
  CiscoMerakiIcon,
  UniFiIcon,
  HIDGlobalIcon,
  CrestronIcon,
  DigiIoTIcon,
  TrimbleIcon,
  SchneiderIcon,
  GenetecIcon,
  FlirIcon,
  MotorolaSolIcon,
  EatonIcon,
  BoschSecurityIcon,
  EmersonIcon,
  ABBIcon,
} from './HardwareIcons';

// ─── Software Integration Icons ───

const IFSCloudIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#0066B3"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">IFS</text>
  </svg>
);

const OracleCCBIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#F80000"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">CC&B</text>
  </svg>
);

const QiskitIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#6929C4"/>
    <circle cx="20" cy="20" r="10" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="20" cy="20" r="4" fill="#00D4AA"/>
    <line x1="20" y1="10" x2="20" y2="6" stroke="white" strokeWidth="2"/>
    <line x1="20" y1="34" x2="20" y2="30" stroke="white" strokeWidth="2"/>
    <line x1="10" y1="20" x2="6" y2="20" stroke="white" strokeWidth="2"/>
    <line x1="34" y1="20" x2="30" y2="20" stroke="white" strokeWidth="2"/>
  </svg>
);

const OracleERPIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#C74634"/>
    <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">ORACLE</text>
    <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="6">ERP</text>
  </svg>
);

const BartenderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#003366"/>
    <rect x="8" y="10" width="24" height="16" rx="2" fill="none" stroke="white" strokeWidth="2"/>
    <line x1="10" y1="15" x2="30" y2="15" stroke="white" strokeWidth="1"/>
    <line x1="10" y1="18" x2="25" y2="18" stroke="white" strokeWidth="1"/>
    <line x1="10" y1="21" x2="30" y2="21" stroke="white" strokeWidth="1"/>
    <rect x="26" y="28" width="6" height="4" fill="white"/>
  </svg>
);

const PodioIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#5B3256"/>
    <circle cx="14" cy="14" r="5" fill="#FF6B35"/>
    <circle cx="26" cy="14" r="5" fill="#FFB800"/>
    <circle cx="14" cy="26" r="5" fill="#00B4D8"/>
    <circle cx="26" cy="26" r="5" fill="#7CB518"/>
  </svg>
);

const SmartMeterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#1A1A2E"/>
    <rect x="8" y="8" width="24" height="24" rx="4" stroke="#00FF88" strokeWidth="2" fill="none"/>
    <circle cx="20" cy="16" r="4" stroke="#00FF88" strokeWidth="1.5" fill="none"/>
    <path d="M12 26 L16 22 L20 24 L24 20 L28 23" stroke="#00FF88" strokeWidth="1.5" fill="none"/>
    <text x="50%" y="90%" dominantBaseline="middle" textAnchor="middle" fill="#00FF88" fontSize="4">kWh</text>
  </svg>
);

const AxisCameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#FFD200"/>
    <circle cx="20" cy="18" r="10" fill="#1A1A1A"/>
    <circle cx="20" cy="18" r="7" fill="#333"/>
    <circle cx="20" cy="18" r="4" fill="#1A1A1A" stroke="#666" strokeWidth="1"/>
    <circle cx="20" cy="18" r="2" fill="#00BFFF"/>
    <rect x="8" y="30" width="24" height="4" rx="1" fill="#1A1A1A"/>
  </svg>
);

// CRM Icons
const HubSpotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#FF7A59"/>
    <circle cx="20" cy="16" r="4" fill="white"/>
    <circle cx="12" cy="24" r="3" fill="white"/>
    <circle cx="28" cy="24" r="3" fill="white"/>
    <line x1="17" y1="19" x2="14" y2="22" stroke="white" strokeWidth="2"/>
    <line x1="23" y1="19" x2="26" y2="22" stroke="white" strokeWidth="2"/>
    <rect x="18" y="24" width="4" height="8" rx="1" fill="white"/>
  </svg>
);

const PipedriveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#017737"/>
    <path d="M12 30 L12 22 L16 18 L20 22 L24 14 L28 18 L28 30" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="22" r="2" fill="white"/>
    <circle cx="16" cy="18" r="2" fill="white"/>
    <circle cx="20" cy="22" r="2" fill="white"/>
    <circle cx="24" cy="14" r="2" fill="white"/>
    <circle cx="28" cy="18" r="2" fill="white"/>
  </svg>
);

const MondayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#6C3CE1"/>
    <circle cx="12" cy="26" r="4" fill="#00CA72"/>
    <circle cx="20" cy="18" r="4" fill="#FDAB3D"/>
    <circle cx="28" cy="12" r="4" fill="#E2445C"/>
    <line x1="12" y1="22" x2="12" y2="14" stroke="#00CA72" strokeWidth="3" strokeLinecap="round"/>
    <line x1="20" y1="14" x2="20" y2="10" stroke="#FDAB3D" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const SalesforceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#00A1E0"/>
    <path d="M10 22 C10 16 14 12 20 12 C26 12 30 16 30 22 C30 28 26 30 20 30 C14 30 10 28 10 22Z" fill="white" opacity="0.9"/>
    <text x="50%" y="60%" dominantBaseline="middle" textAnchor="middle" fill="#00A1E0" fontSize="7" fontWeight="bold">SF</text>
  </svg>
);

const ZohoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#E42527"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Z</text>
    <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="1.5" fill="none" opacity="0.3"/>
  </svg>
);

const SlackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#4A154B"/>
    <rect x="10" y="16" width="8" height="3" rx="1.5" fill="#E01E5A"/>
    <rect x="22" y="16" width="8" height="3" rx="1.5" fill="#36C5F0"/>
    <rect x="10" y="22" width="8" height="3" rx="1.5" fill="#2EB67D"/>
    <rect x="22" y="22" width="8" height="3" rx="1.5" fill="#ECB22E"/>
  </svg>
);

const TeamsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#5B5FC7"/>
    <rect x="8" y="12" width="18" height="16" rx="2" fill="white"/>
    <text x="17" y="23" dominantBaseline="middle" textAnchor="middle" fill="#5B5FC7" fontSize="8" fontWeight="bold">T</text>
    <circle cx="30" cy="14" r="5" fill="white" opacity="0.9"/>
  </svg>
);

const TableauIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#E97627"/>
    <line x1="20" y1="8" x2="20" y2="32" stroke="white" strokeWidth="2"/>
    <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeWidth="2"/>
    <line x1="12" y1="12" x2="12" y2="28" stroke="white" strokeWidth="1.5" opacity="0.6"/>
    <line x1="28" y1="12" x2="28" y2="28" stroke="white" strokeWidth="1.5" opacity="0.6"/>
  </svg>
);

const PowerBIIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#F2C811"/>
    <rect x="10" y="20" width="5" height="12" rx="1" fill="#333"/>
    <rect x="17.5" y="14" width="5" height="18" rx="1" fill="#333"/>
    <rect x="25" y="8" width="5" height="24" rx="1" fill="#333"/>
  </svg>
);

// ─── Types ───

type IntegrationCategory = 'all' | 'crm' | 'erp' | 'analytics' | 'communication' | 'hardware';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: React.FC<{ className?: string }>;
  status: 'connected' | 'disconnected' | 'pending';
  features: string[];
  authType?: 'credentials' | 'oauth' | 'token';
  minTier: SubscriptionTier;
  configFields?: { label: string; placeholder: string; type?: string; required?: boolean }[];
}

// ─── Integration Data ───

const integrations: Integration[] = [
  // ═══════════════ BASIC TIER ($249/mo+) ═══════════════
  {
    id: 'podio',
    name: 'Progress Podio',
    description: 'Import & synchronize Podio Organizations, Workspaces, MiniApps, Relational Schemas, and Records directly into A-CORE',
    category: 'communication',
    icon: PodioIcon,
    status: 'disconnected',
    authType: 'oauth',
    minTier: 'basic',
    features: ['OAuth 2.0 Connection', 'Workspace & App Importer', 'Relational Field Mapping', 'Live Record Sync'],
  },
  // ═══════════════ PRO TIER ($499/mo+) — CORE SMB, ACCOUNTING & CRM ═══════════════
  {
    id: 'quickbooks', name: 'QuickBooks Online', description: 'Bi-directional accounting ledger, invoice, expense, customer, and vendor sync',
    category: 'erp', icon: IFSCloudIcon, status: 'disconnected', authType: 'oauth', minTier: 'pro',
    features: ['Invoices & Bills', 'Expense Sync', 'Customer & Vendor Ledger', 'COGS Reconciliation'],
    configFields: [{ label: 'QuickBooks Realm / Company ID', placeholder: 'Your Intuit Realm ID' }],
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business Cloud', description: 'Two-way customer and team WhatsApp messaging synced directly into A-CORE Messages',
    category: 'communication', icon: SlackIcon, status: 'disconnected', authType: 'token', minTier: 'pro',
    features: ['Live Customer Chat', 'Team Alpha AI Auto-Reply', 'Media Vault Sync', 'Contact Matching'],
    configFields: [{ label: 'Meta Phone Number ID', placeholder: 'WhatsApp Business Phone ID' }],
  },
  {
    id: 'dynamics-crm', name: 'Microsoft Dynamics 365 CRM', description: 'Bi-directional enterprise sales, customer service, and account synchronization',
    category: 'crm', icon: TeamsIcon, status: 'disconnected', authType: 'oauth', minTier: 'pro',
    features: ['Lead & Opportunity Sync', 'Account Hierarchy', 'Field Service', 'Activity Sync'],
    configFields: [{ label: 'Dynamics Environment URL', placeholder: 'https://yourorg.crm.dynamics.com' }],
  },
  {
    id: 'shopify', name: 'Shopify Storefront', description: 'Real-time storefront order, product catalog, customer, and inventory sync',
    category: 'erp', icon: PipedriveIcon, status: 'disconnected', authType: 'token', minTier: 'pro',
    features: ['Live Order Sync', 'Inventory Deduction', 'Customer Profiles', 'Webhook Triggers'],
    configFields: [{ label: 'Shopify Store Domain', placeholder: 'yourstore.myshopify.com' }],
  },
  {
    id: 'hubspot', name: 'HubSpot', description: 'All-in-one CRM platform for marketing, sales, and customer service',
    category: 'crm', icon: HubSpotIcon, status: 'disconnected', authType: 'credentials', minTier: 'pro',
    features: ['Contact Management', 'Deal Tracking', 'Email Marketing', 'Analytics'],
    configFields: [{ label: 'Portal ID', placeholder: 'Your HubSpot portal ID' }],
  },
  {
    id: 'pipedrive', name: 'Pipedrive', description: 'Sales-focused CRM designed to help small teams manage leads and deals',
    category: 'crm', icon: PipedriveIcon, status: 'disconnected', authType: 'credentials', minTier: 'pro',
    features: ['Pipeline Management', 'Lead Scoring', 'Activity Tracking', 'Reporting'],
    configFields: [{ label: 'Company Domain', placeholder: 'yourcompany.pipedrive.com' }],
  },
  {
    id: 'monday', name: 'Monday.com', description: 'Work OS platform for project management, CRM, and team collaboration',
    category: 'crm', icon: MondayIcon, status: 'disconnected', authType: 'credentials', minTier: 'pro',
    features: ['Project Boards', 'Automations', 'Dashboards', 'Integrations'],
    configFields: [{ label: 'Board ID', placeholder: 'Default board ID' }],
  },
  {
    id: 'salesforce', name: 'Salesforce', description: 'Enterprise CRM platform with comprehensive sales and service cloud',
    category: 'crm', icon: SalesforceIcon, status: 'disconnected', authType: 'oauth', minTier: 'pro',
    features: ['Sales Cloud', 'Service Cloud', 'Marketing Cloud', 'Einstein AI'],
    configFields: [{ label: 'Instance URL', placeholder: 'https://yourorg.salesforce.com' }],
  },
  {
    id: 'zoho', name: 'Zoho CRM', description: 'Cloud-based CRM with AI-powered sales assistant and omnichannel support',
    category: 'crm', icon: ZohoIcon, status: 'disconnected', authType: 'credentials', minTier: 'pro',
    features: ['Zia AI Assistant', 'Omnichannel', 'Process Management', 'Analytics'],
  },
  // ═══════════════Communication (PRO+) ═══════════════
  {
    id: 'slack', name: 'Slack', description: 'Team messaging and collaboration platform with channels and integrations',
    category: 'communication', icon: SlackIcon, status: 'disconnected', authType: 'oauth', minTier: 'pro',
    features: ['Channels', 'Direct Messages', 'Workflows', 'App Integrations'],
    configFields: [{ label: 'Workspace URL', placeholder: 'yourteam.slack.com' }],
  },
  {
    id: 'teams', name: 'Microsoft Teams', description: 'Enterprise communication and collaboration hub',
    category: 'communication', icon: TeamsIcon, status: 'disconnected', authType: 'oauth', minTier: 'pro',
    features: ['Chat', 'Video Meetings', 'File Sharing', 'Teams Apps'],
    configFields: [{ label: 'Tenant ID', placeholder: 'Azure AD Tenant ID' }],
  },
  // ═══════════════ EXPERT & ENTERPRISE TIERS — ERP & ANALYTICS ═══════════════
  {
    id: 'ifs-cloud', name: 'IFS Cloud', description: 'Enterprise resource planning and asset management integration',
    category: 'erp', icon: IFSCloudIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Asset Management', 'Work Orders', 'Inventory', 'Procurement'],
    configFields: [{ label: 'Server URL', placeholder: 'https://ifs.yourcompany.com' }],
  },
  {
    id: 'oracle-ccb', name: 'Oracle CC&B', description: 'Customer Care and Billing for utility management',
    category: 'erp', icon: OracleCCBIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Customer Management', 'Billing', 'Meter Data', 'Service Orders'],
    configFields: [{ label: 'Server URL', placeholder: 'https://ccb.yourcompany.com' }],
  },
  {
    id: 'oracle-erp', name: 'Oracle ERP Cloud / InsightSoftware', description: 'Enterprise resource planning with advanced financial reporting',
    category: 'erp', icon: OracleERPIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Financial Management', 'Supply Chain', 'Project Management', 'Analytics'],
    configFields: [{ label: 'Cloud URL', placeholder: 'https://cloud.oracle.com/erp' }],
  },
  {
    id: 'bartender', name: 'SeagullScientific Bartender', description: 'Enterprise label and barcode design, printing, and management',
    category: 'erp', icon: BartenderIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Label Design', 'Barcode Printing', 'RFID Encoding', 'Print Automation'],
    configFields: [{ label: 'Print Server URL', placeholder: 'https://printserver.local:8080' }],
  },
  {
    id: 'qiskit', name: 'Qiskit Runtime', description: 'IBM Quantum Cloud for quantum computing and predictive analysis',
    category: 'analytics', icon: QiskitIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprisePlus',
    features: ['Quantum Computing', 'Predictive Analytics', 'Wave Analysis', 'Qubit Visualization'],
    configFields: [{ label: 'IBM Cloud URL', placeholder: 'https://quantum-computing.ibm.com' }],
  },
  {
    id: 'tableau', name: 'Tableau', description: 'Visual analytics platform for interactive data visualization',
    category: 'analytics', icon: TableauIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Interactive Dashboards', 'Data Blending', 'Real-time Analytics', 'Embedded Analytics'],
    configFields: [{ label: 'Server URL', placeholder: 'https://tableau.yourcompany.com' }],
  },
  {
    id: 'powerbi', name: 'Power BI', description: 'Microsoft business intelligence with AI-driven insights',
    category: 'analytics', icon: PowerBIIcon, status: 'disconnected', authType: 'oauth', minTier: 'expert',
    features: ['AI Insights', 'Natural Language Q&A', 'Paginated Reports', 'Dataflows'],
    configFields: [{ label: 'Tenant ID', placeholder: 'Azure AD Tenant ID' }],
  },
  // ═══════════════ HARDWARE (EXPERT+ TIER) ═══════════════
  {
    id: 'smart-meter', name: 'SmartMeter AMI', description: 'Advanced metering infrastructure for real-time energy monitoring and demand response',
    category: 'hardware', icon: SmartMeterIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Real-time Monitoring', 'Usage Analytics', 'Demand Response', 'Remote Reading'],
    configFields: [{ label: 'Gateway IP Address', placeholder: '192.168.1.100' }, { label: 'Port', placeholder: '8443', type: 'text' }],
  },
  {
    id: 'axis-cameras', name: 'Axis Communications', description: 'Network video surveillance cameras with VAPIX API and analytics',
    category: 'hardware', icon: AxisCameraIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Video Surveillance', 'Motion Detection', 'Edge Analytics', 'Remote Viewing'],
    configFields: [{ label: 'Camera Station URL', placeholder: 'https://axis-station.local' }],
  },
  {
    id: 'zebra-printers', name: 'Zebra Technologies', description: 'Enterprise label printers, barcode scanners, and mobile computers',
    category: 'hardware', icon: ZebraPrinterIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Label Printing', 'Barcode Scanning', 'RFID Encoding', 'Fleet Management'],
    configFields: [{ label: 'PrintConnect Server', placeholder: 'https://printconnect.local:9100' }],
  },
  {
    id: 'honeywell', name: 'Honeywell Connected', description: 'Industrial barcode scanners, RFID readers, and mobile computing devices',
    category: 'hardware', icon: HoneywellIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Barcode Scanning', 'RFID Reading', 'Mobile Computing', 'Voice Picking'],
    configFields: [{ label: 'Operational Intelligence URL', placeholder: 'https://oi.honeywell.com' }],
  },
  {
    id: 'siemens-plc', name: 'Siemens SIMATIC', description: 'Programmable logic controllers and SCADA systems for industrial automation',
    category: 'hardware', icon: SiemensIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['PLC Control', 'SCADA Monitoring', 'HMI Panels', 'Industrial IoT'],
    configFields: [{ label: 'TIA Portal Server', placeholder: 'https://tia-portal.local' }, { label: 'PLC IP Address', placeholder: '10.0.0.50' }],
  },
  {
    id: 'rockwell-plc', name: 'Allen-Bradley / Rockwell', description: 'Industrial automation controllers, drives, and FactoryTalk software suite',
    category: 'hardware', icon: RockwellIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['PLC Programming', 'FactoryTalk', 'Variable Drives', 'Safety Systems'],
    configFields: [{ label: 'FactoryTalk Server', placeholder: 'https://factorytalk.local' }],
  },
  {
    id: 'cisco-meraki', name: 'Cisco Meraki', description: 'Cloud-managed networking, security, and IoT infrastructure',
    category: 'hardware', icon: CiscoMerakiIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Network Management', 'Security Appliances', 'Wireless APs', 'Smart Cameras'],
    configFields: [{ label: 'Dashboard URL', placeholder: 'https://dashboard.meraki.com' }, { label: 'Organization ID', placeholder: 'Meraki Org ID' }],
  },
  {
    id: 'ubiquiti-unifi', name: 'Ubiquiti UniFi', description: 'Enterprise network management with access points, switches, and gateways',
    category: 'hardware', icon: UniFiIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Network Controller', 'Access Points', 'Switches', 'Security Gateways'],
    configFields: [{ label: 'UniFi Controller URL', placeholder: 'https://unifi.local:8443' }],
  },
  {
    id: 'hid-global', name: 'HID Global', description: 'Physical access control, identity management, and credential systems',
    category: 'hardware', icon: HIDGlobalIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Access Control', 'Card Readers', 'Mobile Credentials', 'Visitor Management'],
    configFields: [{ label: 'AERO Server URL', placeholder: 'https://aero.hidglobal.com' }],
  },
  {
    id: 'crestron', name: 'Crestron', description: 'Audio/visual control systems, room scheduling, and digital workplace solutions',
    category: 'hardware', icon: CrestronIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['AV Control', 'Room Scheduling', 'Digital Signage', 'Lighting Control'],
    configFields: [{ label: 'XiO Cloud URL', placeholder: 'https://xio.crestron.com' }],
  },
  {
    id: 'digi-iot', name: 'Digi International', description: 'IoT gateways, routers, and device management for industrial connectivity',
    category: 'hardware', icon: DigiIoTIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['IoT Gateways', 'Cellular Routers', 'Device Management', 'Edge Computing'],
    configFields: [{ label: 'Digi Remote Manager URL', placeholder: 'https://remotemanager.digi.com' }],
  },
  {
    id: 'trimble', name: 'Trimble', description: 'GPS fleet tracking, asset management, and geospatial positioning solutions',
    category: 'hardware', icon: TrimbleIcon, status: 'disconnected', authType: 'credentials', minTier: 'expert',
    features: ['Fleet Tracking', 'Asset Management', 'Geofencing', 'Route Optimization'],
    configFields: [{ label: 'Trimble Cloud URL', placeholder: 'https://cloud.trimble.com' }],
  },
  {
    id: 'schneider', name: 'Schneider Electric', description: 'Power management, UPS systems, and building automation solutions',
    category: 'hardware', icon: SchneiderIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Power Monitoring', 'UPS Management', 'Building Automation', 'Energy Analytics'],
    configFields: [{ label: 'EcoStruxure URL', placeholder: 'https://ecostruxure.schneider-electric.com' }],
  },
  {
    id: 'genetec', name: 'Genetec Security Center', description: 'Unified video management, access control, and license plate recognition',
    category: 'hardware', icon: GenetecIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Video Management', 'Access Control', 'LPR/ANPR', 'Intrusion Detection'],
    configFields: [{ label: 'Security Center URL', placeholder: 'https://genetec.local:4590' }],
  },
  {
    id: 'flir-thermal', name: 'FLIR / Teledyne', description: 'Thermal imaging cameras for predictive maintenance and security applications',
    category: 'hardware', icon: FlirIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Thermal Imaging', 'Predictive Maintenance', 'Perimeter Security', 'Temperature Monitoring'],
    configFields: [{ label: 'FLIR Cloud URL', placeholder: 'https://cloud.flir.com' }],
  },
  {
    id: 'motorola-sol', name: 'Motorola Solutions', description: 'Two-way radios, body cameras, and command center software',
    category: 'hardware', icon: MotorolaSolIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Push-to-Talk', 'Body Cameras', 'Command Center', 'Incident Management'],
    configFields: [{ label: 'WAVE Server URL', placeholder: 'https://wave.motorolasolutions.com' }],
  },
  {
    id: 'eaton-power', name: 'Eaton', description: 'Power distribution, UPS systems, and electrical infrastructure management',
    category: 'hardware', icon: EatonIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['UPS Monitoring', 'Power Distribution', 'Transfer Switches', 'Battery Management'],
    configFields: [{ label: 'IPM Server URL', placeholder: 'https://ipm.eaton.com' }],
  },
  {
    id: 'bosch-security', name: 'Bosch Security', description: 'Intrusion detection, fire alarm, and public address systems',
    category: 'hardware', icon: BoschSecurityIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Intrusion Detection', 'Fire Alarm', 'Video Analytics', 'Public Address'],
    configFields: [{ label: 'BIS Server URL', placeholder: 'https://bis.bosch.local' }],
  },
  {
    id: 'emerson', name: 'Emerson / Fisher', description: 'Process control valves, transmitters, and DeltaV automation systems',
    category: 'hardware', icon: EmersonIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Process Control', 'Valve Management', 'DeltaV DCS', 'Predictive Diagnostics'],
    configFields: [{ label: 'Plantweb Optics URL', placeholder: 'https://plantweb.emerson.com' }],
  },
  {
    id: 'abb-robotics', name: 'ABB Robotics', description: 'Industrial robots, cobots, and RobotStudio programming environment',
    category: 'hardware', icon: ABBIcon, status: 'disconnected', authType: 'credentials', minTier: 'enterprise',
    features: ['Robot Control', 'Cobots', 'RobotStudio', 'FlexPendant'],
    configFields: [{ label: 'ABB Ability URL', placeholder: 'https://ability.abb.com' }],
  },
];

// ─── Category Tabs ───

const categoryTabs: { id: IntegrationCategory; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'all', label: 'All', icon: BuildIcon },
  { id: 'crm', label: 'CRM', icon: ActivityIcon },
  { id: 'erp', label: 'ERP', icon: DatabaseIcon },
  { id: 'analytics', label: 'Analytics', icon: BarChartIcon },
  { id: 'communication', label: 'Communication', icon: ActivityIcon },
  { id: 'hardware', label: 'Hardware', icon: CpuIcon },
];

// ─── Component ───

interface IntegrationsPanelProps {
  isOrganizationAdmin?: boolean;
  isOrgAdmin?: boolean;
  filterByToggles?: Array<{ feature_key: string; is_enabled_for_org_admins: boolean }>;
  initialOpenPodio?: boolean;
}

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({
  isOrganizationAdmin = false,
  isOrgAdmin = false,
  filterByToggles,
  initialOpenPodio = false,
}) => {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const currentUserId = (user as any)?.id || (user as any)?.uid;

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionStates, setConnectionStates] = useState<Record<string, boolean>>({});
  const [savedConfigs, setSavedConfigs] = useState<Record<string, Record<string, string>>>({});
  const [savedCredentialIds, setSavedCredentialIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'catalog' | 'live-status' | 'sync-jobs' | 'audit-log' | 'credential-health'>('catalog');

  // ─── Podio OAuth & Workspace/Apps/Records Importer State ───
  const [showPodioModal, setShowPodioModal] = useState<boolean>(initialOpenPodio);
  const [podioConnected, setPodioConnected] = useState<boolean>(false);
  const [isAwaitingPodioAuth, setIsAwaitingPodioAuth] = useState<boolean>(false);
  const [isLoadingPodioSpaces, setIsLoadingPodioSpaces] = useState<boolean>(false);
  const [podioAppsList, setPodioAppsList] = useState<{
    app_id: number;
    name: string;
    space_name: string;
    space_id?: number;
    org_name?: string;
  }[]>([]);
  const [selectedPodioSpace, setSelectedPodioSpace] = useState<string>('');
  const [isImportingPodioWs, setIsImportingPodioWs] = useState<boolean>(false);
  const [podioImportProgress, setPodioImportProgress] = useState<string>('');
  const [podioImportError, setPodioImportError] = useState<string | null>(null);
  const [lastImportedWorkspace, setLastImportedWorkspace] = useState<{ slug: string; name: string; firstApp?: string } | null>(null);

  // ─── Load saved integration IDs & Podio status on mount ───
  useEffect(() => {
    loadSavedIntegrationIds();
    loadPodioWorkspaces(true);
  }, [organization?.id, currentUserId]);

  useEffect(() => {
    if (initialOpenPodio) {
      setShowPodioModal(true);
    }
  }, [initialOpenPodio]);

  useEffect(() => {
    if (showPodioModal) {
      loadPodioWorkspaces(false);
    }
  }, [showPodioModal]);

  // Listen for Podio OAuth popup completion or external open event
  useEffect(() => {
    const handleOpenPodioSetup = () => {
      setShowPodioModal(true);
    };
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PODIO_AUTH_SUCCESS') {
        setIsAwaitingPodioAuth(false);
        loadPodioWorkspaces(false);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'podio_oauth_completed') {
        setIsAwaitingPodioAuth(false);
        loadPodioWorkspaces(false);
      }
    };
    window.addEventListener('openPodioIntegrationSetup', handleOpenPodioSetup);
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('openPodioIntegrationSetup', handleOpenPodioSetup);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUserId]);

  const loadSavedIntegrationIds = async () => {
    if (!organization?.id) return;
    try {
      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'list',
        organizationId: organization.id,
      });
      if (result.data?.integrationIds && Array.isArray(result.data.integrationIds)) {
        const ids = new Set<string>(result.data.integrationIds);
        setSavedCredentialIds(ids);
        const newStates: Record<string, boolean> = {};
        result.data.integrationIds.forEach((id: string) => {
          newStates[id] = true;
        });
        setConnectionStates(prev => ({ ...prev, ...newStates }));
      }
    } catch (err) {
      console.error('[IntegrationsPanel] Error loading saved integration IDs:', err);
    }
  };

  const loadPodioWorkspaces = async (silent = false) => {
    if (!currentUserId) return;
    if (!silent) {
      setIsLoadingPodioSpaces(true);
      setPodioImportError(null);
    }
    try {
      const { data, error } = await supabase.functions.invoke('fetch-podio-apps', {
        body: { userId: currentUserId },
      });

      if (error) throw error;

      if (data?.error) {
        if (String(data.error).toLowerCase().includes('not found') || String(data.error).toLowerCase().includes('expired')) {
          setPodioConnected(false);
          setConnectionStates(prev => ({ ...prev, podio: false }));
        } else {
          setPodioConnected(false);
          if (!silent) setPodioImportError(data.error);
        }
        return;
      }

      const normalizedApps = (data?.apps || []).map((app: any) => ({
        app_id: Number(app.app_id),
        name: app.config?.name || app.name || 'Unnamed App',
        space_name: app.space?.name || app.space_name || 'Unknown Workspace',
        space_id: (app.space_id || app.space?.space_id) ? Number(app.space_id || app.space?.space_id) : undefined,
        org_name: app.org?.name || app.org_name || app.space?.org?.name || undefined,
      }));

      setPodioConnected(true);
      setPodioAppsList(normalizedApps);
      setConnectionStates(prev => ({ ...prev, podio: true }));
      setSavedCredentialIds(prev => new Set([...prev, 'podio']));
    } catch (err: any) {
      setPodioConnected(false);
      if (!silent) {
        setPodioImportError(err.message || 'Failed to load Podio workspaces.');
      }
    } finally {
      if (!silent) setIsLoadingPodioSpaces(false);
    }
  };

  const handleLaunchPodioOAuth = () => {
    if (!currentUserId) return;
    setIsAwaitingPodioAuth(true);
    setPodioImportError(null);
    const clientId = 'a-core-dev';
    const redirectUri = encodeURIComponent('https://rghtxlzzpuazvacupere.supabase.co/functions/v1/podio-oauth');
    const statePayload = btoa(JSON.stringify({ userId: currentUserId, returnUrl: window.location.href }));
    const authUrl = `https://podio.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${statePayload}`;
    const width = 680, height = 540;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(authUrl, 'PodioAuth', `width=${width},height=${height},left=${left},top=${top}`);
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        setIsAwaitingPodioAuth(false);
        loadPodioWorkspaces(false);
      }
    }, 1000);
  };

  const handleImportFullPodioWorkspace = async () => {
    if (!selectedPodioSpace || !organization?.id || !currentUserId) return;
    setIsImportingPodioWs(true);
    setPodioImportError(null);
    setLastImportedWorkspace(null);

    try {
      const cleanNameHelper = (raw: string) =>
        (raw || 'Podio Workspace').replace(/^[\s\-–—]+/, '').trim() || 'Podio Workspace';

      const appIdToSpaceName = new Map<number, string>();
      const spaceIdToSpaceName = new Map<number, string>();
      podioAppsList.forEach(a => {
        if (a.app_id && a.space_name) {
          appIdToSpaceName.set(Number(a.app_id), a.space_name);
        }
        if (a.space_id && a.space_name) {
          spaceIdToSpaceName.set(Number(a.space_id), a.space_name);
        }
      });

      const workspaceByCleanName = new Map<string, any>();
      const { data: existingDbWorkspaces } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order', { ascending: true });

      if (existingDbWorkspaces) {
        existingDbWorkspaces.forEach((w: any) => {
          if (w?.name) workspaceByCleanName.set(w.name.toLowerCase().trim(), w);
        });
      }

      const colors = ['cyan', 'green', 'purple', 'fuchsia', 'orange', 'red'];
      let createdWsCount = existingDbWorkspaces?.length || 0;

      const getOrCreateWorkspaceForSpaceName = async (rawSpaceName: string): Promise<any> => {
        const cleanWsName = cleanNameHelper(rawSpaceName);
        const key = cleanWsName.toLowerCase();
        if (workspaceByCleanName.has(key)) {
          const existingWs = workspaceByCleanName.get(key);
          const existingSettings =
            typeof existingWs.settings === 'string'
              ? JSON.parse(existingWs.settings || '{}')
              : existingWs.settings || {};
          if (!existingSettings.is_custom_lite) {
            const updatedSettings = { ...existingSettings, is_custom_lite: true };
            await supabase
              .schema('app_private')
              .from('workspaces')
              .update({ settings: updatedSettings })
              .eq('id', existingWs.id);
            existingWs.settings = updatedSettings;
          }
          return existingWs;
        }

        setPodioImportProgress(`Creating A-CORE Workspace "${cleanWsName}"...`);
        const baseSlug =
          cleanWsName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'workspace';
        const chosenColor = colors[createdWsCount % colors.length];

        let insertRes = await supabase
          .schema('app_private')
          .from('workspaces')
          .insert({
            organization_id: organization.id,
            name: cleanWsName,
            slug: baseSlug,
            icon: 'database',
            description: `Imported from Podio (${cleanWsName})`,
            display_order: createdWsCount,
            settings: { is_custom_lite: true, accent_color: chosenColor, tab_order: [] },
          })
          .select('*')
          .single();

        if (insertRes.error) {
          insertRes = await supabase
            .schema('app_private')
            .from('workspaces')
            .insert({
              organization_id: organization.id,
              name: cleanWsName,
              slug: `${baseSlug}-${Date.now().toString(36).slice(-4)}`,
              icon: 'database',
              description: `Imported from Podio (${cleanWsName})`,
              display_order: createdWsCount,
              settings: { is_custom_lite: true, accent_color: chosenColor, tab_order: [] },
            })
            .select('*')
            .single();
          if (insertRes.error) throw insertRes.error;
        }

        createdWsCount++;
        workspaceByCleanName.set(key, insertRes.data);
        return insertRes.data;
      };

      const primaryTargetWs = await getOrCreateWorkspaceForSpaceName(selectedPodioSpace);

      const spaceApps = podioAppsList.filter(a => a.space_name === selectedPodioSpace);
      if (spaceApps.length === 0) throw new Error('No apps found in this Podio workspace.');
      const primarySpaceAppIds = new Set<number>(spaceApps.map(a => Number(a.app_id)));
      const primarySpaceAppNamesLower = new Set<string>(spaceApps.map(a => (a.name || '').trim().toLowerCase()));

      const isRelField = (pf: any) => {
        const t = (pf?.type || '').toLowerCase();
        if (['app', 'relationship', 'reference'].includes(t)) return true;
        if (Array.isArray(pf?.config?.settings?.referenced_apps) && pf.config.settings.referenced_apps.length > 0) return true;
        if (Array.isArray(pf?.referenced_apps) && pf.referenced_apps.length > 0) return true;
        return false;
      };

      const mapType = (pf: any): string => {
        if (isRelField(pf)) return 'connection_field';
        const t = (pf.type || '').toLowerCase();
        switch (t) {
          case 'text': return 'text_field';
          case 'number':
          case 'money':
          case 'progress': return 'number_field';
          case 'date': return 'date_field';
          case 'phone': return 'phone_number_field';
          case 'email': return 'email_address_field';
          case 'category':
          case 'question': return 'category_field';
          case 'contact':
          case 'member': return 'user_field';
          case 'image': return 'image_field';
          case 'embed':
          case 'link': return 'hyperlink_field';
          case 'location': return 'location_field';
          case 'duration': return 'duration_field';
          case 'calculation': return 'calculation_field';
          default: return 'text_field';
        }
      };

      const schemaCache = new Map<number, { name: string; spaceName: string; fields: any[]; dependencies: any[] }>();
      const queue: { app_id: number; name: string; space_name?: string }[] = spaceApps.map(a => ({
        app_id: Number(a.app_id),
        name: a.name,
        space_name: a.space_name,
      }));

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const currId = Number(curr.app_id);
        if (!currId || schemaCache.has(currId)) continue;
        setPodioImportProgress(`Analyzing schema for "${curr.name}"...`);

        const { data, error } = await supabase.functions.invoke('fetch-podio-schema', {
          body: { podioAppId: currId.toString(), userId: currentUserId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const deps = data.dependencies || [];
        const rawFields = data.fields || [];

        rawFields.forEach((pf: any) => {
          const refs = pf?.config?.settings?.referenced_apps || pf?.referenced_apps || [];
          if (Array.isArray(refs)) {
            refs.forEach((r: any) => {
              const refId = Number(r?.app_id || r?.app?.app_id);
              const refSpaceName =
                r?.space_name ||
                r?.space?.name ||
                r?.app?.space?.name ||
                (r?.space_id || r?.app?.space_id
                  ? spaceIdToSpaceName.get(Number(r?.space_id || r?.app?.space_id))
                  : undefined);
              if (refId && refSpaceName && !appIdToSpaceName.has(refId)) {
                appIdToSpaceName.set(refId, refSpaceName);
              }
            });
          }
        });

        deps.forEach((d: any) => {
          const depId = Number(d?.app_id);
          const depSpaceName =
            d?.space_name ||
            d?.space?.name ||
            d?.app?.space?.name ||
            (d?.space_id || d?.space?.space_id || d?.app?.space_id
              ? spaceIdToSpaceName.get(Number(d?.space_id || d?.space?.space_id || d?.app?.space_id))
              : undefined);
          if (depId && depSpaceName && !appIdToSpaceName.has(depId)) {
            appIdToSpaceName.set(depId, depSpaceName);
          }
        });

        const dataSpaceId = Number(data?.space_id || data?.app?.space_id || data?.space?.space_id || 0);
        const resolvedSpaceName = primarySpaceAppIds.has(currId)
          ? selectedPodioSpace
          : curr.space_name ||
            appIdToSpaceName.get(currId) ||
            data.space_name ||
            data.space?.name ||
            data.app?.space?.name ||
            (dataSpaceId ? spaceIdToSpaceName.get(dataSpaceId) : undefined) ||
            'Podio Linked Apps';

        schemaCache.set(currId, {
          name: curr.name || data.name || data.app?.config?.name || `App ${currId}`,
          spaceName: resolvedSpaceName,
          fields: rawFields,
          dependencies: deps,
        });

        deps.forEach((d: any) => {
          const depId = Number(d?.app_id);
          if (depId && !schemaCache.has(depId)) {
            queue.push({
              app_id: depId,
              name: d.name || d.config?.name || `App ${depId}`,
              space_name: appIdToSpaceName.get(depId) || d.space_name || d.space?.name || d.app?.space?.name,
            });
          }
        });
      }

      const sortedAppIds: number[] = [];
      const visited = new Set<number>();
      const visiting = new Set<number>();

      const visit = (id: number) => {
        const numId = Number(id);
        if (!numId || visited.has(numId) || visiting.has(numId)) return;
        visiting.add(numId);
        const node = schemaCache.get(numId);
        if (node) {
          node.dependencies.forEach((d: any) => visit(Number(d.app_id)));
          sortedAppIds.push(numId);
        }
        visiting.delete(numId);
        visited.add(numId);
      };
      Array.from(schemaCache.keys()).forEach(id => visit(id));

      const podioToAcoreAppMap: Record<number, string> = {};
      const wsTabsMap = new Map<string, { ws: any; tabNames: string[] }>();
      const movedFromPrimaryTitles = new Set<string>();
      const palette = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
      ];

      const { data: orgExistingApps } = await supabase
        .schema('app_private')
        .from('mini_apps')
        .select('*')
        .eq('organization_id', organization.id);
      const existingAppsPool: any[] = orgExistingApps || [];

      for (let i = 0; i < sortedAppIds.length; i++) {
        const pAppId = sortedAppIds[i];
        const meta = schemaCache.get(pAppId)!;
        const isPrimaryApp = primarySpaceAppIds.has(pAppId);

        const appTargetWs = isPrimaryApp
          ? primaryTargetWs
          : await getOrCreateWorkspaceForSpaceName(meta.spaceName || 'Podio Linked Apps');

        if (!wsTabsMap.has(appTargetWs.id)) {
          wsTabsMap.set(appTargetWs.id, { ws: appTargetWs, tabNames: [] });
        }

        setPodioImportProgress(
          `(${i + 1}/${sortedAppIds.length}) Importing "${meta.name}" into Workspace "${appTargetWs.name}"...`
        );

        const cleanTitle = (meta.name || 'Imported App').trim();
        const prefix = cleanTitle.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'APP';
        const appSlug = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${pAppId}`;

        let existingMiniApp = existingAppsPool.find(a => {
          const settings = typeof a.app_settings === 'string' ? JSON.parse(a.app_settings || '{}') : a.app_settings || {};
          return Number(settings?.podio_sync_config?.podio_app_id) === Number(pAppId);
        });

        if (!existingMiniApp) {
          existingMiniApp = existingAppsPool.find(
            a =>
              a.workspace_id === appTargetWs.id &&
              String(a.name || '').trim().toLowerCase() === cleanTitle.toLowerCase()
          );
        }

        if (
          !existingMiniApp &&
          !isPrimaryApp &&
          appTargetWs.id !== primaryTargetWs.id &&
          !primarySpaceAppNamesLower.has(cleanTitle.toLowerCase())
        ) {
          const misplacedApp = existingAppsPool.find(
            a =>
              a.workspace_id === primaryTargetWs.id &&
              String(a.name || '').trim().toLowerCase() === cleanTitle.toLowerCase()
          );
          if (misplacedApp) {
            existingMiniApp = misplacedApp;
            movedFromPrimaryTitles.add(cleanTitle.toLowerCase());
          }
        }

        const existingSchema = existingMiniApp?.schema_definition
          ? typeof existingMiniApp.schema_definition === 'string'
            ? JSON.parse(existingMiniApp.schema_definition)
            : existingMiniApp.schema_definition
          : null;
        const existingFieldsList: any[] = existingSchema?.fields || existingSchema?.custom_fields || [];

        const generatedFields = meta.fields.map((pf: any, idx: number) => {
          const acoreType = mapType(pf);
          const fieldName = pf.label || pf.external_id || `Field ${idx + 1}`;
          const prevField = existingFieldsList.find(
            ef => String(ef.name || '').trim().toLowerCase() === String(fieldName).trim().toLowerCase()
          );

          const settings: any = {};

          if (acoreType === 'text_field') {
            const labelLower = (pf.label || '').toLowerCase();
            const isShortNameField = [
              'first name', 'last name', 'name', 'full name', 'title', 'company', 'city', 'state', 'zip',
            ].includes(labelLower);
            settings.multiline = !isShortNameField && (pf.config?.settings?.size === 'large' || false);
          } else if (acoreType === 'number_field') {
            settings.decimals = pf.config?.settings?.decimals ?? (pf.type === 'money' ? 2 : 0);
          } else if (acoreType === 'category_field') {
            const rawOpts = pf.config?.settings?.options || pf.options || [];
            settings.categoryOptions = rawOpts
              .filter((o: any) => o.status !== 'deleted')
              .map((o: any, optIdx: number) => ({
                id: `opt_${o.id || optIdx}`,
                label: o.text || o.label || `Option ${optIdx + 1}`,
                color: o.color && String(o.color).startsWith('#') ? o.color : palette[optIdx % palette.length],
              }));
          } else if (acoreType === 'connection_field') {
            const refAppIds: number[] = (
              pf.config?.settings?.referenced_apps?.map((a: any) => Number(a.app_id || a.app?.app_id)) ||
              pf.referenced_apps?.map((a: any) => Number(a.app_id || a)) ||
              []
            ).filter(Boolean);
            settings.connectedMiniAppIds = refAppIds.map(id => podioToAcoreAppMap[Number(id)]).filter(Boolean);
            settings.allowMultipleConnections = pf.config?.settings?.multiple !== false;
            settings.connectionLayoutMode = 'dropdown';
            settings.connectionDropdownSearchable = true;
          }

          return {
            id: prevField?.id || `field_podio_${pf.field_id || pf.external_id || idx}`,
            name: fieldName,
            type: acoreType,
            required: Boolean(pf.config?.required),
            column: 1,
            columnSpan: 2,
            colSpan: 60,
            rowSpan: 1,
            row: idx,
            order: idx,
            settings,
          };
        });

        const fieldMapping: Record<string, string> = {};
        meta.fields.forEach((pf: any, idx: number) => {
          if (generatedFields[idx]) {
            fieldMapping[pf.external_id] = generatedFields[idx].name;
          }
        });

        const schemaPayload = {
          name: cleanTitle,
          description: `Imported from Podio (${cleanTitle})`,
          icon: 'database',
          base_fields: [],
          custom_fields: generatedFields,
          fields: generatedFields,
          version: 1,
        };

        const appSettingsPayload = {
          layouts: ['table', 'card'],
          defaultLayout: 'table',
          recordsPerPage: 25,
          allowExport: true,
          allowImport: true,
          enableComments: true,
          enableAttachments: true,
          itemName: cleanTitle.endsWith('s') && !cleanTitle.endsWith('ss') ? cleanTitle.slice(0, -1) : cleanTitle,
          podio_sync_config: {
            podio_app_id: pAppId,
            field_mapping: fieldMapping,
          },
        };

        let newApp = existingMiniApp;
        let appErr = null;

        if (!newApp) {
          const insertRes = await supabase
            .schema('app_private')
            .from('mini_apps')
            .insert({
              workspace_id: appTargetWs.id,
              organization_id: organization.id,
              name: cleanTitle,
              slug: appSlug,
              description: `Imported from Podio (${cleanTitle})`,
              icon: 'database',
              display_order: wsTabsMap.get(appTargetWs.id)!.tabNames.length,
              schema_definition: schemaPayload,
              app_settings: appSettingsPayload,
              item_id_settings: {
                prefix,
                minDigits: 4,
                showItemId: true,
                showQrCode: true,
                showBarcode: false,
                barcodeSymbology: 'code128',
              },
              is_preset: false,
              created_by: currentUserId,
            })
            .select('*')
            .single();

          newApp = insertRes.data;
          appErr = insertRes.error;
        } else {
          const updateRes = await supabase
            .schema('app_private')
            .from('mini_apps')
            .update({
              workspace_id: appTargetWs.id,
              schema_definition: schemaPayload,
              app_settings: {
                ...(typeof newApp.app_settings === 'string'
                  ? JSON.parse(newApp.app_settings || '{}')
                  : newApp.app_settings || {}),
                ...appSettingsPayload,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', newApp.id)
            .select('*')
            .single();

          if (updateRes.data) newApp = updateRes.data;
        }

        if (appErr) throw appErr;

        podioToAcoreAppMap[pAppId] = newApp.id;
        wsTabsMap.get(appTargetWs.id)!.tabNames.push(cleanTitle);

        const importBody = {
          podioAppId: pAppId.toString(),
          targetMiniAppId: newApp.id,
          organizationId: organization.id,
          fieldMapping,
          schemaFields: generatedFields,
          userId: currentUserId,
          skipSpaceSync: true,
        };

        let { data: impData, error: impErr } = await supabase.functions.invoke('import-podio-data', {
          body: importBody,
        });

        if (impErr) {
          await new Promise(res => setTimeout(res, 1500));
          const retryRes = await supabase.functions.invoke('import-podio-data', {
            body: importBody,
          });
          impData = retryRes.data;
          impErr = retryRes.error;
        }

        if (impErr) console.warn(`[Podio Import] Non-fatal warning on ${cleanTitle}:`, impErr);
        if (impData?.error) console.warn(`[Podio Import] Non-fatal data warning on ${cleanTitle}:`, impData.error);
      }

      for (const [wsId, { ws, tabNames }] of wsTabsMap.entries()) {
        const existingSettings =
          typeof ws.settings === 'string' ? JSON.parse(ws.settings || '{}') : ws.settings || {};
        const prevTabs: string[] = Array.isArray(existingSettings.tab_order) ? existingSettings.tab_order : [];
        const filteredPrevTabs =
          wsId === primaryTargetWs.id
            ? prevTabs.filter(t => !movedFromPrimaryTitles.has(String(t || '').trim().toLowerCase()))
            : prevTabs;

        await supabase
          .schema('app_private')
          .from('workspaces')
          .update({
            settings: {
              ...existingSettings,
              is_custom_lite: true,
              tab_order: Array.from(new Set([...filteredPrevTabs, ...tabNames])),
            },
          })
          .eq('id', ws.id);
      }

      window.dispatchEvent(new CustomEvent('miniapp_schema_updated'));
      window.dispatchEvent(new CustomEvent('workspacesUpdated'));
      window.dispatchEvent(new CustomEvent('miniapp_records_updated'));

      const primaryTabs = wsTabsMap.get(primaryTargetWs.id)?.tabNames || [];
      setLastImportedWorkspace({
        slug: primaryTargetWs.slug,
        name: primaryTargetWs.name,
        firstApp: primaryTabs[0],
      });
      setPodioImportProgress('');
    } catch (err: any) {
      setPodioImportError(err.message || 'Failed to import Podio workspace.');
    } finally {
      setIsImportingPodioWs(false);
      setPodioImportProgress('');
    }
  };

  const handleCredentialsSaved = (integrationId: string) => {
    setSavedCredentialIds(prev => new Set([...prev, integrationId]));
  };

  // ─── Tier Gating: Only show integrations unlocked for the active tier ───
  const activeTier: SubscriptionTier = getEffectiveTier(organization?.subscription_tier);
  const activeTierRank = TIER_RANK[activeTier] || 1;

  const tierUnlockedIntegrations = integrations.filter(i => {
    const reqRank = TIER_RANK[i.minTier] || 1;
    return reqRank <= activeTierRank;
  });

  // Filter out restricted integrations for org admins if feature toggles are passed
  const availableIntegrations =
    (isOrgAdmin || isOrganizationAdmin) && filterByToggles
      ? tierUnlockedIntegrations.filter(i => {
          if (i.id === 'qiskit') {
            const toggle = filterByToggles.find(t => t.feature_key === 'integration_qiskit');
            return toggle ? toggle.is_enabled_for_org_admins : false;
          }
          const hwToggle = filterByToggles.find(t => t.feature_key === `integration_${i.id.replace(/-/g, '_')}`);
          if (hwToggle) return hwToggle.is_enabled_for_org_admins;
          return true;
        })
      : tierUnlockedIntegrations;

  const visibleCategoryTabs = categoryTabs.filter(
    tab => tab.id === 'all' || availableIntegrations.some(i => i.category === tab.id)
  );

  const filteredIntegrations = availableIntegrations.filter(i => {
    const matchesCategory = activeCategory === 'all' || i.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCloudCount = Object.entries(connectionStates).filter(([id, isConn]) => {
    if (!isConn) return false;
    const item = availableIntegrations.find(i => i.id === id);
    return item && item.category !== 'hardware';
  }).length;

  const activeHardwareCount = Object.entries(connectionStates).filter(([id, isConn]) => {
    if (!isConn) return false;
    const item = availableIntegrations.find(i => i.id === id);
    return item && item.category === 'hardware';
  }).length;

  const quota = evaluateConnectorQuota(activeTier, activeCloudCount, activeHardwareCount);

  const handleConfigureIntegration = (integration: Integration) => {
    if (integration.id === 'podio') {
      setShowPodioModal(true);
      return;
    }
    if (integration.category === 'hardware' && !quota.allowHardwareConnectors) {
      alert(
        `Hardware & Industrial Connectors require Expert ($899/mo) or higher. Your current tier (${quota.tierName}) supports Cloud Software Connectors only.`
      );
      return;
    }
    if (!connectionStates[integration.id] && quota.isAtHardCap) {
      alert(
        `You have reached the maximum total connector cap (${quota.maxTotalConnectorsCap}) for your ${quota.tierName}. Please upgrade your A-CORE plan to add more integrations.`
      );
      return;
    }
    setSelectedIntegration(integration);
    setShowConfigModal(true);
  };

  const handleToggleConnection = (id: string) => {
    if (id === 'podio') {
      setShowPodioModal(true);
      return;
    }
    const target = availableIntegrations.find(i => i.id === id);
    const isCurrentlyConnected = !!connectionStates[id];

    if (!isCurrentlyConnected) {
      if (target?.category === 'hardware' && !quota.allowHardwareConnectors) {
        alert(
          `Hardware & Industrial Connectors are locked on ${quota.tierName}. Upgrade to Expert ($899/mo) or Enterprise ($1,999/mo) to unlock hardware bridges.`
        );
        return;
      }
      if (quota.isAtHardCap) {
        alert(
          `Hard Cap Reached: ${quota.tierName} allows up to ${quota.maxTotalConnectorsCap} total connectors (${quota.includedFreeConnectors} free + ${quota.maxPaidAddonConnectors} paid add-ons). Upgrade your plan to connect more platforms.`
        );
        return;
      }
    }
    setConnectionStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveConfig = (id: string, config: Record<string, string>) => {
    setSavedConfigs(prev => ({ ...prev, [id]: config }));
  };

  const getStatusBadge = (integration: Integration) => {
    const isConnected = integration.id === 'podio' ? podioConnected || connectionStates.podio : connectionStates[integration.id];
    if (isConnected) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-xs font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]" />
          Connected
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 border border-gray-500/30 text-gray-400 rounded-full text-xs font-mono">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Not Connected
      </span>
    );
  };

  const getAuthBadge = (integration: Integration) => {
    const authType = integration.authType || 'credentials';
    const labels: Record<string, string> = {
      credentials: 'User/Pass',
      oauth: 'OAuth 2.0',
      token: 'Token',
    };
    return (
      <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono text-gray-400">
        {labels[authType]}
      </span>
    );
  };

  const uniquePodioSpaces = Array.from(new Set(podioAppsList.map(a => a.space_name)));

  const renderIntegrationCard = (integration: Integration) => {
    const Icon = integration.icon;
    const isPodio = integration.id === 'podio';
    const isConnected = isPodio ? podioConnected || connectionStates.podio : connectionStates[integration.id];
    const hasSavedCreds = savedCredentialIds.has(integration.id) || (isPodio && podioConnected);

    return (
      <div
        key={integration.id}
        className={`relative rounded-xl border p-5 transition-all group ${
          isPodio
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-black to-black hover:border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.1)]'
            : 'border-gray-800 bg-black/80 hover:border-cyan-500/30'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Icon className="w-10 h-10 flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-white font-mono font-medium truncate">{integration.name}</h5>
                  {getAuthBadge(integration)}
                  {isPodio && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/40 rounded text-[10px] font-mono text-emerald-300 font-bold">
                      INCLUDED IN BASIC
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono line-clamp-2 mt-0.5">{integration.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(integration)}
              {hasSavedCreds && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-xs font-mono">
                  <CheckIcon size={10} className="text-green-400" />
                  {isPodio && podioConnected
                    ? `${uniquePodioSpaces.length} Workspaces · ${podioAppsList.length} Apps`
                    : 'Credentials Saved'}
                </span>
              )}
            </div>
            {integration.category === 'hardware' && (
              <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[10px] font-mono text-cyan-500">
                HARDWARE
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {integration.features.map((feature, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-[10px] font-mono text-gray-400"
              >
                {feature}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleToggleConnection(integration.id)}
              className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                isConnected
                  ? 'bg-green-500/30 border border-green-500/50'
                  : 'bg-gray-800 border border-gray-700'
              }`}
              title={isPodio ? 'Open Podio OAuth & Workspace Importer' : 'Toggle Connection'}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                  isConnected
                    ? 'left-6 bg-green-400 shadow-[0_0_8px_rgba(0,255,0,0.6)]'
                    : 'left-0.5 bg-gray-500'
                }`}
              />
            </button>
            <button
              onClick={() => handleConfigureIntegration(integration)}
              className={`flex-1 py-2 rounded-lg transition-all font-mono text-sm font-bold ${
                isPodio
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-normal'
              }`}
            >
              {isPodio
                ? isConnected
                  ? '⚡ Import Workspaces & Manage Podio'
                  : '⚡ Connect Podio & Import Workspaces'
                : isConnected
                ? 'Manage'
                : 'Configure'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const hardwareCount = availableIntegrations.filter(i => i.category === 'hardware').length;
  const connectedHardwareIds = Array.from(savedCredentialIds).filter(id =>
    availableIntegrations.find(i => i.id === id && i.category === 'hardware')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-fuchsia-950/20 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/50 flex items-center justify-center">
            <BuildIcon size={24} className="text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-mono font-bold text-white">Third-Party Integrations</h3>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                {quota.tierName}
              </span>
            </div>
            <p className="text-sm text-gray-400 font-mono">
              {activeTier === 'basic'
                ? 'Connect your Progress Podio account to import and synchronize Organizations, Workspaces, Apps, and Records.'
                : `Connect CRMs, ERPs, analytics platforms, communication tools${
                    hardwareCount > 0 ? `, and ${hardwareCount} hardware systems` : ''
                  }`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-cyan-400">{availableIntegrations.length}</p>
              <p className="text-xs text-gray-500 font-mono">Available in {quota.tierName}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-green-400">
                {availableIntegrations.filter(i => connectionStates[i.id] || (i.id === 'podio' && podioConnected)).length}
              </p>
              <p className="text-xs text-gray-500 font-mono">Connected</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 items-end pb-1">
          {[
            { key: 'catalog' as const, label: 'Catalog', icon: BuildIcon },
            { key: 'live-status' as const, label: 'Status', icon: CpuIcon },
            { key: 'sync-jobs' as const, label: 'Syncs', icon: ActivityIcon },
            { key: 'audit-log' as const, label: 'Audits', icon: DatabaseIcon },
            { key: 'credential-health' as const, label: 'Health', icon: SettingsIcon },
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={`cut-tab cut-tab-cyan relative px-4 py-2 text-sm font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 ${
                  isActive ? 'cut-tab-active text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {isActive && <span className="cut-tab-shimmer-el" />}
                <span className="relative z-[1] flex items-center gap-1.5">
                  <TabIcon size={14} className="flex-shrink-0" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Auth Policy Banner */}
        <div className="flex-1 flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg min-w-[200px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500 flex-shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-xs font-mono text-gray-400">
            <span className="text-cyan-400 font-bold">Security Policy:</span> All credentials encrypted with ML-KEM-1024 + SHA-512 + AES-256-GCM via Q-CORE.
          </p>
        </div>
      </div>

      {/* Credential Health View */}
      {viewMode === 'credential-health' && <CredentialHealthDashboard />}

      {/* Live Status View */}
      {viewMode === 'live-status' && (
        <HardwareStatusDashboard
          connectedIntegrationIds={connectedHardwareIds.length > 0 ? connectedHardwareIds : undefined}
        />
      )}

      {/* Sync Jobs View */}
      {viewMode === 'sync-jobs' && (
        <SyncJobsMonitor connectedIntegrationIds={Array.from(savedCredentialIds)} />
      )}

      {/* Audit Log View */}
      {viewMode === 'audit-log' && <IntegrationAuditLog />}

      {/* Catalog View */}
      {viewMode === 'catalog' && (
        <>
          {availableIntegrations.length > 1 && (
            <>
              {/* Search Bar */}
              <div className="relative">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search integrations..."
                  className="w-full bg-black border border-cyan-500/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 darkwave-scrollbar">
                {visibleCategoryTabs.map(tab => {
                  const TabIcon = tab.icon;
                  const isActive = activeCategory === tab.id;
                  const count =
                    tab.id === 'all'
                      ? availableIntegrations.length
                      : availableIntegrations.filter(i => i.category === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCategory(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-mono whitespace-nowrap transition-all border flex-shrink-0 ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.15)]'
                          : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      <TabIcon size={16} />
                      {tab.label}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-800 text-gray-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Hardware highlight banner when hardware tab active */}
          {activeCategory === 'hardware' && hardwareCount > 0 && (
            <div className="relative rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/10 via-black to-cyan-950/10 p-4 overflow-hidden">
              <div className="absolute inset-0 hex-pattern opacity-10" />
              <div className="relative z-10 flex items-center gap-4">
                <CpuIcon size={28} className="text-cyan-400 flex-shrink-0" />
                <div>
                  <h4 className="text-white font-mono font-bold text-sm">Hardware Integrations</h4>
                  <p className="text-gray-400 font-mono text-xs">
                    {hardwareCount} hardware systems available — PLCs, cameras, scanners, network gear, access control, power management, and more.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredIntegrations.map(renderIntegrationCard)}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <CpuIcon size={40} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500 font-mono">No integrations found matching your search</p>
              <p className="text-gray-600 font-mono text-xs mt-1">Try a different search term or category</p>
            </div>
          )}
        </>
      )}

      {/* Standard Integration Configuration Modal (for non-Podio integrations) */}
      {showConfigModal && selectedIntegration && (
        <IntegrationConfigModal
          integration={selectedIntegration}
          onClose={() => setShowConfigModal(false)}
          onSave={handleSaveConfig}
          isConnected={connectionStates[selectedIntegration.id] || false}
          organizationId={organization?.id}
          onCredentialsSaved={handleCredentialsSaved}
        />
      )}

      {/* ─── Progress Podio OAuth & Workspace/Apps/Records Importer Modal ─── */}
      {showPodioModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center pointer-events-auto">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onMouseDown={e => {
              e.stopPropagation();
              if (!isImportingPodioWs) setShowPodioModal(false);
            }}
          />
          <div
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="relative z-10 bg-black border border-emerald-500/50 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(16,185,129,0.25)] animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <PodioIcon className="w-10 h-10 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-mono font-bold text-white">Progress Podio Integration</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        podioConnected
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}
                    >
                      {podioConnected ? 'OAuth Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-400">
                    Import Podio Organizations, Workspaces, MiniApps, Fields &amp; Records
                  </p>
                </div>
              </div>
              {!isImportingPodioWs && (
                <button
                  onClick={() => setShowPodioModal(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <CloseIcon size={18} />
                </button>
              )}
            </div>

            {podioImportError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400">
                {podioImportError}
              </div>
            )}

            {lastImportedWorkspace && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-emerald-300">
                    ✓ Workspace &quot;{lastImportedWorkspace.name}&quot; Imported!
                  </p>
                  <p className="text-[11px] font-mono text-gray-300 truncate">
                    All MiniApps, relational schemas, and records are synced.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPodioModal(false);
                    window.dispatchEvent(new CustomEvent('closeAllAdminPanels'));
                    if (lastImportedWorkspace.firstApp) {
                      navigate(
                        `/workspace/${lastImportedWorkspace.slug}?app=${encodeURIComponent(
                          lastImportedWorkspace.firstApp
                        )}`
                      );
                    } else {
                      navigate(`/workspace/${lastImportedWorkspace.slug}`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black font-mono text-xs font-bold hover:bg-emerald-300 transition-all flex-shrink-0"
                >
                  Open Workspace →
                </button>
              </div>
            )}

            {isLoadingPodioSpaces ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3">
                <div className="w-7 h-7 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                <span className="text-xs font-mono text-gray-400">
                  Loading your Podio Organizations, Workspaces &amp; Apps...
                </span>
              </div>
            ) : !podioConnected ? (
              <div className="py-6 flex flex-col items-center text-center space-y-4">
                <p className="text-xs font-mono text-gray-300 leading-relaxed">
                  Authorize A-CORE via Podio OAuth 2.0 to automatically discover your Podio Organizations and Workspaces, construct relational MiniApp schemas, and import your records.
                </p>
                <button
                  onClick={handleLaunchPodioOAuth}
                  disabled={isAwaitingPodioAuth}
                  className="w-full py-3 rounded-xl font-mono text-sm font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                >
                  {isAwaitingPodioAuth ? 'Awaiting Podio Authorization...' : 'Connect Podio Account (OAuth 2.0)'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connected Account Actions Bar */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-950 border border-gray-800 text-xs font-mono">
                  <span className="text-gray-400">
                    Discovered <strong className="text-emerald-400">{uniquePodioSpaces.length}</strong> Workspaces &amp;{' '}
                    <strong className="text-emerald-400">{podioAppsList.length}</strong> Apps
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadPodioWorkspaces(false)}
                      disabled={isImportingPodioWs}
                      className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-all text-[11px]"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={handleLaunchPodioOAuth}
                      disabled={isImportingPodioWs || isAwaitingPodioAuth}
                      className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[11px]"
                    >
                      Reconnect OAuth
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                    Select Podio Workspace to Import / Sync
                  </label>
                  <select
                    value={selectedPodioSpace}
                    onChange={e => setSelectedPodioSpace(e.target.value)}
                    disabled={isImportingPodioWs}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose a Podio Workspace --</option>
                    {uniquePodioSpaces.map(spaceName => {
                      const spaceApps = podioAppsList.filter(a => a.space_name === spaceName);
                      const count = spaceApps.length;
                      const orgLabel = spaceApps[0]?.org_name ? `[${spaceApps[0].org_name}] ` : '';
                      return (
                        <option key={spaceName} value={spaceName}>
                          {orgLabel}{spaceName} ({count} {count === 1 ? 'App' : 'Apps'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedPodioSpace && (
                  <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 max-h-40 overflow-y-auto darkwave-scrollbar space-y-1">
                    <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold mb-1.5">
                      Apps to be created/synced in &quot;{selectedPodioSpace.replace(/^[\s\-–—]+/, '').trim()}&quot;:
                    </p>
                    {podioAppsList
                      .filter(a => a.space_name === selectedPodioSpace)
                      .map(app => (
                        <div key={app.app_id} className="text-xs font-mono text-gray-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="truncate">{app.name}</span>
                        </div>
                      ))}
                  </div>
                )}

                {podioImportProgress && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs font-mono text-emerald-300">
                    <div className="w-4 h-4 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin flex-shrink-0" />
                    <span className="truncate">{podioImportProgress}</span>
                  </div>
                )}

                <button
                  onClick={handleImportFullPodioWorkspace}
                  disabled={!selectedPodioSpace || isImportingPodioWs}
                  className="w-full py-3 rounded-xl font-mono text-sm font-bold text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                >
                  {isImportingPodioWs
                    ? 'Importing Workspace, Apps & Records...'
                    : '⚡ Auto-Create Workspace & Import All Apps'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsPanel;
