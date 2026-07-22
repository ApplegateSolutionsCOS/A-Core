import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
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

const EsriIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect width="40" height="40" rx="8" fill="#007AC2"/>
    <circle cx="20" cy="20" r="12" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="20" cy="20" r="6" fill="white"/>
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
  configFields?: { label: string; placeholder: string; type?: string; required?: boolean }[];
}

// ─── Integration Data ───

const integrations: Integration[] = [
  // ═══════════════ CRM ═══════════════
  {
    id: 'hubspot', name: 'HubSpot', description: 'All-in-one CRM platform for marketing, sales, and customer service',
    category: 'crm', icon: HubSpotIcon, status: 'disconnected', authType: 'credentials',
    features: ['Contact Management', 'Deal Tracking', 'Email Marketing', 'Analytics'],
    configFields: [{ label: 'Portal ID', placeholder: 'Your HubSpot portal ID' }],
  },
  {
    id: 'pipedrive', name: 'Pipedrive', description: 'Sales-focused CRM designed to help small teams manage leads and deals',
    category: 'crm', icon: PipedriveIcon, status: 'disconnected', authType: 'credentials',
    features: ['Pipeline Management', 'Lead Scoring', 'Activity Tracking', 'Reporting'],
    configFields: [{ label: 'Company Domain', placeholder: 'yourcompany.pipedrive.com' }],
  },
  {
    id: 'monday', name: 'Monday.com', description: 'Work OS platform for project management, CRM, and team collaboration',
    category: 'crm', icon: MondayIcon, status: 'disconnected', authType: 'credentials',
    features: ['Project Boards', 'Automations', 'Dashboards', 'Integrations'],
    configFields: [{ label: 'Board ID', placeholder: 'Default board ID' }],
  },
  {
    id: 'salesforce', name: 'Salesforce', description: 'Enterprise CRM platform with comprehensive sales and service cloud',
    category: 'crm', icon: SalesforceIcon, status: 'disconnected', authType: 'oauth',
    features: ['Sales Cloud', 'Service Cloud', 'Marketing Cloud', 'Einstein AI'],
    configFields: [{ label: 'Instance URL', placeholder: 'https://yourorg.salesforce.com' }],
  },
  {
    id: 'zoho', name: 'Zoho CRM', description: 'Cloud-based CRM with AI-powered sales assistant and omnichannel support',
    category: 'crm', icon: ZohoIcon, status: 'disconnected', authType: 'credentials',
    features: ['Zia AI Assistant', 'Omnichannel', 'Process Management', 'Analytics'],
  },
  // ═══════════════ ERP ═══════════════
  {
    id: 'ifs-cloud', name: 'IFS Cloud', description: 'Enterprise resource planning and asset management integration',
    category: 'erp', icon: IFSCloudIcon, status: 'disconnected', authType: 'credentials',
    features: ['Asset Management', 'Work Orders', 'Inventory', 'Procurement'],
    configFields: [{ label: 'Server URL', placeholder: 'https://ifs.yourcompany.com' }],
  },
  {
    id: 'oracle-ccb', name: 'Oracle CC&B', description: 'Customer Care and Billing for utility management',
    category: 'erp', icon: OracleCCBIcon, status: 'disconnected', authType: 'credentials',
    features: ['Customer Management', 'Billing', 'Meter Data', 'Service Orders'],
    configFields: [{ label: 'Server URL', placeholder: 'https://ccb.yourcompany.com' }],
  },
  {
    id: 'oracle-erp', name: 'Oracle ERP Cloud / InsightSoftware', description: 'Enterprise resource planning with advanced financial reporting',
    category: 'erp', icon: OracleERPIcon, status: 'disconnected', authType: 'credentials',
    features: ['Financial Management', 'Supply Chain', 'Project Management', 'Analytics'],
    configFields: [{ label: 'Cloud URL', placeholder: 'https://cloud.oracle.com/erp' }],
  },
  {
    id: 'bartender', name: 'SeagullScientific Bartender', description: 'Enterprise label and barcode design, printing, and management',
    category: 'erp', icon: BartenderIcon, status: 'disconnected', authType: 'credentials',
    features: ['Label Design', 'Barcode Printing', 'RFID Encoding', 'Print Automation'],
    configFields: [{ label: 'Print Server URL', placeholder: 'https://printserver.local:8080' }],
  },
  // ═══════════════ Analytics ═══════════════
  {
    id: 'qiskit', name: 'Qiskit Runtime', description: 'IBM Quantum Cloud for quantum computing and predictive analysis',
    category: 'analytics', icon: QiskitIcon, status: 'disconnected', authType: 'credentials',
    features: ['Quantum Computing', 'Predictive Analytics', 'Wave Analysis', 'Qubit Visualization'],
    configFields: [{ label: 'IBM Cloud URL', placeholder: 'https://quantum-computing.ibm.com' }],
  },
  {
    id: 'tableau', name: 'Tableau', description: 'Visual analytics platform for interactive data visualization',
    category: 'analytics', icon: TableauIcon, status: 'disconnected', authType: 'credentials',
    features: ['Interactive Dashboards', 'Data Blending', 'Real-time Analytics', 'Embedded Analytics'],
    configFields: [{ label: 'Server URL', placeholder: 'https://tableau.yourcompany.com' }],
  },
  {
    id: 'powerbi', name: 'Power BI', description: 'Microsoft business intelligence with AI-driven insights',
    category: 'analytics', icon: PowerBIIcon, status: 'disconnected', authType: 'oauth',
    features: ['AI Insights', 'Natural Language Q&A', 'Paginated Reports', 'Dataflows'],
    configFields: [{ label: 'Tenant ID', placeholder: 'Azure AD Tenant ID' }],
  },
  // ═══════════════ Communication ═══════════════
  {
    id: 'slack', name: 'Slack', description: 'Team messaging and collaboration platform with channels and integrations',
    category: 'communication', icon: SlackIcon, status: 'disconnected', authType: 'oauth',
    features: ['Channels', 'Direct Messages', 'Workflows', 'App Integrations'],
    configFields: [{ label: 'Workspace URL', placeholder: 'yourteam.slack.com' }],
  },
  {
    id: 'teams', name: 'Microsoft Teams', description: 'Enterprise communication and collaboration hub',
    category: 'communication', icon: TeamsIcon, status: 'disconnected', authType: 'oauth',
    features: ['Chat', 'Video Meetings', 'File Sharing', 'Teams Apps'],
    configFields: [{ label: 'Tenant ID', placeholder: 'Azure AD Tenant ID' }],
  },
  {
    id: 'podio', name: 'Progress Podio', description: 'Low-code collaboration and workflow automation platform',
    category: 'communication', icon: PodioIcon, status: 'disconnected', authType: 'credentials',
    features: ['Workflow Automation', 'Project Management', 'CRM', 'Custom Apps'],
  },
  // ═══════════════ HARDWARE ═══════════════
  {
    id: 'smart-meter', name: 'SmartMeter AMI', description: 'Advanced metering infrastructure for real-time energy monitoring and demand response',
    category: 'hardware', icon: SmartMeterIcon, status: 'disconnected', authType: 'credentials',
    features: ['Real-time Monitoring', 'Usage Analytics', 'Demand Response', 'Remote Reading'],
    configFields: [{ label: 'Gateway IP Address', placeholder: '192.168.1.100' }, { label: 'Port', placeholder: '8443', type: 'text' }],
  },
  {
    id: 'axis-cameras', name: 'Axis Communications', description: 'Network video surveillance cameras with VAPIX API and analytics',
    category: 'hardware', icon: AxisCameraIcon, status: 'disconnected', authType: 'credentials',
    features: ['Video Surveillance', 'Motion Detection', 'Edge Analytics', 'Remote Viewing'],
    configFields: [{ label: 'Camera Station URL', placeholder: 'https://axis-station.local' }],
  },
  {
    id: 'zebra-printers', name: 'Zebra Technologies', description: 'Enterprise label printers, barcode scanners, and mobile computers',
    category: 'hardware', icon: ZebraPrinterIcon, status: 'disconnected', authType: 'credentials',
    features: ['Label Printing', 'Barcode Scanning', 'RFID Encoding', 'Fleet Management'],
    configFields: [{ label: 'PrintConnect Server', placeholder: 'https://printconnect.local:9100' }],
  },
  {
    id: 'honeywell', name: 'Honeywell Connected', description: 'Industrial barcode scanners, RFID readers, and mobile computing devices',
    category: 'hardware', icon: HoneywellIcon, status: 'disconnected', authType: 'credentials',
    features: ['Barcode Scanning', 'RFID Reading', 'Mobile Computing', 'Voice Picking'],
    configFields: [{ label: 'Operational Intelligence URL', placeholder: 'https://oi.honeywell.com' }],
  },
  {
    id: 'siemens-plc', name: 'Siemens SIMATIC', description: 'Programmable logic controllers and SCADA systems for industrial automation',
    category: 'hardware', icon: SiemensIcon, status: 'disconnected', authType: 'credentials',
    features: ['PLC Control', 'SCADA Monitoring', 'HMI Panels', 'Industrial IoT'],
    configFields: [{ label: 'TIA Portal Server', placeholder: 'https://tia-portal.local' }, { label: 'PLC IP Address', placeholder: '10.0.0.50' }],
  },
  {
    id: 'rockwell-plc', name: 'Allen-Bradley / Rockwell', description: 'Industrial automation controllers, drives, and FactoryTalk software suite',
    category: 'hardware', icon: RockwellIcon, status: 'disconnected', authType: 'credentials',
    features: ['PLC Programming', 'FactoryTalk', 'Variable Drives', 'Safety Systems'],
    configFields: [{ label: 'FactoryTalk Server', placeholder: 'https://factorytalk.local' }],
  },
  {
    id: 'cisco-meraki', name: 'Cisco Meraki', description: 'Cloud-managed networking, security, and IoT infrastructure',
    category: 'hardware', icon: CiscoMerakiIcon, status: 'disconnected', authType: 'credentials',
    features: ['Network Management', 'Security Appliances', 'Wireless APs', 'Smart Cameras'],
    configFields: [{ label: 'Dashboard URL', placeholder: 'https://dashboard.meraki.com' }, { label: 'Organization ID', placeholder: 'Meraki Org ID' }],
  },
  {
    id: 'ubiquiti-unifi', name: 'Ubiquiti UniFi', description: 'Enterprise network management with access points, switches, and gateways',
    category: 'hardware', icon: UniFiIcon, status: 'disconnected', authType: 'credentials',
    features: ['Network Controller', 'Access Points', 'Switches', 'Security Gateways'],
    configFields: [{ label: 'UniFi Controller URL', placeholder: 'https://unifi.local:8443' }],
  },
  {
    id: 'hid-global', name: 'HID Global', description: 'Physical access control, identity management, and credential systems',
    category: 'hardware', icon: HIDGlobalIcon, status: 'disconnected', authType: 'credentials',
    features: ['Access Control', 'Card Readers', 'Mobile Credentials', 'Visitor Management'],
    configFields: [{ label: 'AERO Server URL', placeholder: 'https://aero.hidglobal.com' }],
  },
  {
    id: 'crestron', name: 'Crestron', description: 'Audio/visual control systems, room scheduling, and digital workplace solutions',
    category: 'hardware', icon: CrestronIcon, status: 'disconnected', authType: 'credentials',
    features: ['AV Control', 'Room Scheduling', 'Digital Signage', 'Lighting Control'],
    configFields: [{ label: 'XiO Cloud URL', placeholder: 'https://xio.crestron.com' }],
  },
  {
    id: 'digi-iot', name: 'Digi International', description: 'IoT gateways, routers, and device management for industrial connectivity',
    category: 'hardware', icon: DigiIoTIcon, status: 'disconnected', authType: 'credentials',
    features: ['IoT Gateways', 'Cellular Routers', 'Device Management', 'Edge Computing'],
    configFields: [{ label: 'Digi Remote Manager URL', placeholder: 'https://remotemanager.digi.com' }],
  },
  {
    id: 'trimble', name: 'Trimble', description: 'GPS fleet tracking, asset management, and geospatial positioning solutions',
    category: 'hardware', icon: TrimbleIcon, status: 'disconnected', authType: 'credentials',
    features: ['Fleet Tracking', 'Asset Management', 'Geofencing', 'Route Optimization'],
    configFields: [{ label: 'Trimble Cloud URL', placeholder: 'https://cloud.trimble.com' }],
  },
  {
    id: 'schneider', name: 'Schneider Electric', description: 'Power management, UPS systems, and building automation solutions',
    category: 'hardware', icon: SchneiderIcon, status: 'disconnected', authType: 'credentials',
    features: ['Power Monitoring', 'UPS Management', 'Building Automation', 'Energy Analytics'],
    configFields: [{ label: 'EcoStruxure URL', placeholder: 'https://ecostruxure.schneider-electric.com' }],
  },
  {
    id: 'genetec', name: 'Genetec Security Center', description: 'Unified video management, access control, and license plate recognition',
    category: 'hardware', icon: GenetecIcon, status: 'disconnected', authType: 'credentials',
    features: ['Video Management', 'Access Control', 'LPR/ANPR', 'Intrusion Detection'],
    configFields: [{ label: 'Security Center URL', placeholder: 'https://genetec.local:4590' }],
  },
  {
    id: 'flir-thermal', name: 'FLIR / Teledyne', description: 'Thermal imaging cameras for predictive maintenance and security applications',
    category: 'hardware', icon: FlirIcon, status: 'disconnected', authType: 'credentials',
    features: ['Thermal Imaging', 'Predictive Maintenance', 'Perimeter Security', 'Temperature Monitoring'],
    configFields: [{ label: 'FLIR Cloud URL', placeholder: 'https://cloud.flir.com' }],
  },
  {
    id: 'motorola-sol', name: 'Motorola Solutions', description: 'Two-way radios, body cameras, and command center software',
    category: 'hardware', icon: MotorolaSolIcon, status: 'disconnected', authType: 'credentials',
    features: ['Push-to-Talk', 'Body Cameras', 'Command Center', 'Incident Management'],
    configFields: [{ label: 'WAVE Server URL', placeholder: 'https://wave.motorolasolutions.com' }],
  },
  {
    id: 'eaton-power', name: 'Eaton', description: 'Power distribution, UPS systems, and electrical infrastructure management',
    category: 'hardware', icon: EatonIcon, status: 'disconnected', authType: 'credentials',
    features: ['UPS Monitoring', 'Power Distribution', 'Transfer Switches', 'Battery Management'],
    configFields: [{ label: 'IPM Server URL', placeholder: 'https://ipm.eaton.com' }],
  },
  {
    id: 'bosch-security', name: 'Bosch Security', description: 'Intrusion detection, fire alarm, and public address systems',
    category: 'hardware', icon: BoschSecurityIcon, status: 'disconnected', authType: 'credentials',
    features: ['Intrusion Detection', 'Fire Alarm', 'Video Analytics', 'Public Address'],
    configFields: [{ label: 'BIS Server URL', placeholder: 'https://bis.bosch.local' }],
  },
  {
    id: 'emerson', name: 'Emerson / Fisher', description: 'Process control valves, transmitters, and DeltaV automation systems',
    category: 'hardware', icon: EmersonIcon, status: 'disconnected', authType: 'credentials',
    features: ['Process Control', 'Valve Management', 'DeltaV DCS', 'Predictive Diagnostics'],
    configFields: [{ label: 'Plantweb Optics URL', placeholder: 'https://plantweb.emerson.com' }],
  },
  {
    id: 'abb-robotics', name: 'ABB Robotics', description: 'Industrial robots, cobots, and RobotStudio programming environment',
    category: 'hardware', icon: ABBIcon, status: 'disconnected', authType: 'credentials',
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
}

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({ isOrganizationAdmin = false, isOrgAdmin = false, filterByToggles }) => {
  const { organization } = useAuth();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionStates, setConnectionStates] = useState<Record<string, boolean>>({});
  const [savedConfigs, setSavedConfigs] = useState<Record<string, Record<string, string>>>({});
  const [savedCredentialIds, setSavedCredentialIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'catalog' | 'live-status' | 'sync-jobs' | 'audit-log' | 'credential-health'>('catalog');



  // ─── Load saved integration IDs on mount ───
  useEffect(() => {
    loadSavedIntegrationIds();
  }, [organization?.id]);

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
        // Also set connection states for saved integrations
        const newStates: Record<string, boolean> = {};
        result.data.integrationIds.forEach((id: string) => {
          newStates[id] = true;
        });
        setConnectionStates(prev => ({ ...prev, ...newStates }));
        console.log(`[IntegrationsPanel] Loaded ${ids.size} saved integration credentials`);
      }
    } catch (err) {
      console.error('[IntegrationsPanel] Error loading saved integration IDs:', err);
    }
  };

  const handleCredentialsSaved = (integrationId: string) => {
    setSavedCredentialIds(prev => new Set([...prev, integrationId]));
  };

  // Filter out restricted integrations for org admins
  const availableIntegrations = (isOrgAdmin || isOrganizationAdmin) && filterByToggles
    ? integrations.filter(i => {
        if (i.id === 'qiskit') {
          const toggle = filterByToggles.find(t => t.feature_key === 'integration_qiskit');
          return toggle ? toggle.is_enabled_for_org_admins : false;
        }
        const hwToggle = filterByToggles.find(t => t.feature_key === `integration_${i.id.replace(/-/g, '_')}`);
        if (hwToggle) return hwToggle.is_enabled_for_org_admins;
        return true;
      })
    : integrations;

  const filteredIntegrations = availableIntegrations.filter(i => {
    const matchesCategory = activeCategory === 'all' || i.category === activeCategory;
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowConfigModal(true);
  };

  const handleToggleConnection = (id: string) => {
    setConnectionStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveConfig = (id: string, config: Record<string, string>) => {
    setSavedConfigs(prev => ({ ...prev, [id]: config }));
  };

  const getStatusBadge = (integration: Integration) => {
    const isConnected = connectionStates[integration.id];
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
      oauth: 'OAuth',
      token: 'Token',
    };
    return (
      <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono text-gray-500">
        {labels[authType]}
      </span>
    );
  };

  const renderIntegrationCard = (integration: Integration) => {
    const Icon = integration.icon;
    const isConnected = connectionStates[integration.id];
    const hasSavedCreds = savedCredentialIds.has(integration.id);
    return (
      <div
        key={integration.id}
        className="relative rounded-xl border border-gray-800 bg-black/80 p-5 hover:border-cyan-500/30 transition-all group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Icon className="w-10 h-10 flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h5 className="text-white font-mono font-medium truncate">{integration.name}</h5>
                  {getAuthBadge(integration)}
                </div>
                <p className="text-xs text-gray-500 font-mono line-clamp-2 mt-0.5">{integration.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusBadge(integration)}
              {/* Credentials Saved badge */}
              {hasSavedCreds && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-xs font-mono">
                  <CheckIcon size={10} className="text-green-400" />
                  Credentials Saved
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
              className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${isConnected ? 'bg-green-500/30 border border-green-500/50' : 'bg-gray-800 border border-gray-700'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${isConnected ? 'left-6 bg-green-400 shadow-[0_0_8px_rgba(0,255,0,0.6)]' : 'left-0.5 bg-gray-500'}`} />
            </button>
            <button
              onClick={() => handleConfigureIntegration(integration)}
              className="flex-1 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm"
            >
              {isConnected ? 'Manage' : 'Configure'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const hardwareCount = integrations.filter(i => i.category === 'hardware').length;
  const connectedHardwareIds = Array.from(savedCredentialIds).filter(id =>
    integrations.find(i => i.id === id && i.category === 'hardware')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-fuchsia-950/20 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/50 flex items-center justify-center">
            <BuildIcon size={24} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-mono font-bold text-white">Third-Party Integrations</h3>
            <p className="text-sm text-gray-400 font-mono">
              Connect CRMs, ERPs, analytics platforms, communication tools, and {hardwareCount} hardware systems
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-cyan-400">{integrations.length}</p>
              <p className="text-xs text-gray-500 font-mono">Total Integrations</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-green-400">{Object.values(connectionStates).filter(Boolean).length}</p>
              <p className="text-xs text-gray-500 font-mono">Connected</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-emerald-400">{savedCredentialIds.size}</p>
              <p className="text-xs text-gray-500 font-mono">Saved Configs</p>
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
      {viewMode === 'credential-health' && (
        <CredentialHealthDashboard />
      )}


      {/* Live Status View */}
      {viewMode === 'live-status' && (
        <HardwareStatusDashboard
          connectedIntegrationIds={connectedHardwareIds.length > 0 ? connectedHardwareIds : undefined}
        />
      )}

      {/* Sync Jobs View */}
      {viewMode === 'sync-jobs' && (
        <SyncJobsMonitor
          connectedIntegrationIds={Array.from(savedCredentialIds)}
        />
      )}

      {/* Audit Log View */}
      {viewMode === 'audit-log' && (
        <IntegrationAuditLog />
      )}



      {/* Catalog View */}
      {viewMode === 'catalog' && (
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
            {categoryTabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeCategory === tab.id;
              const count = tab.id === 'all' ? availableIntegrations.length : availableIntegrations.filter(i => i.category === tab.id).length;
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
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-800 text-gray-600'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Hardware highlight banner when hardware tab active */}
          {activeCategory === 'hardware' && (
            <div className="relative rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/10 via-black to-cyan-950/10 p-4 overflow-hidden">
              <div className="absolute inset-0 hex-pattern opacity-10" />
              <div className="relative z-10 flex items-center gap-4">
                <CpuIcon size={28} className="text-cyan-400 flex-shrink-0" />
                <div>
                  <h4 className="text-white font-mono font-bold text-sm">Hardware Integrations</h4>
                  <p className="text-gray-400 font-mono text-xs">
                    {hardwareCount} hardware systems available — PLCs, cameras, scanners, network gear, access control, power management, and more. 
                    All authenticate via secure username/password credentials.
                  </p>
                </div>
                <div className="ml-auto flex gap-2 flex-shrink-0">
                  {['Industrial', 'Network', 'Security', 'Power'].map(tag => (
                    <span key={tag} className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-[10px] font-mono text-cyan-500">{tag}</span>
                  ))}
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

      {/* Configuration Modal */}
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
    </div>
  );
};

export default IntegrationsPanel;
