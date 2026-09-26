import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CloseIcon, BuildIcon, BarcodeIcon, SettingsIcon, TagIcon,
  HashIcon, QrCodeIcon, UserIcon, MailIcon, PhoneIcon,
  CalendarIcon, MapPinIcon, ImageIcon, LinkIcon, TypeIcon,
  DatabaseIcon, DollarIcon, GridIcon, ClockIcon, CalculatorIcon,
} from '@/components/icons/Icons';
import { 
  ItemIdSettings, DEFAULT_ITEM_ID_SETTINGS, BARCODE_SYMBOLOGIES,
  generatePreviewUid, generateBarcodeSVG, generateQRCodeSVG, generateItemUrl
} from '@/lib/barcodeUtils';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

type BuildingBlockType = 
  | 'text_field' | 'phone_number_field' | 'email_address_field'
  | 'category_field' | 'user_field' | 'image_field'
  | 'hyperlink_field' | 'number_field' | 'location_field'
  | 'date_field' | 'duration_field' | 'calculation_field'
  | 'connection_field' | 'submenu' | 'payment_field' | 'split_separator';

interface TemplateField {
  id: string;
  name: string;
  type: BuildingBlockType;
  required: boolean;
  column: 1 | 2;
  row: number;
  settings: Record<string, any>;
  subMenuBlocks?: any[];
  conditionalVisibility?: any;
}

interface MiniAppTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  idPrefix: string;
  uidLength: number;
  color: string;
  fields: TemplateField[];
}

interface MiniAppInitialSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (config: {
    name: string;
    description: string;
    itemName?: string; // ⚡ FIX: Added missing property from state
    idPrefix: string;
    uidLength: number;
    itemIdSettings: ItemIdSettings;
    fields?: TemplateField[];
    isPreset?: boolean; 
    targetOrgIds?: string[];
    autoDeploy?: boolean; // ⚡ FIX: Added missing property from state
  }) => void;
  wsColor: { primary: string; rgb: string; dark: string; tw: string; colorName: string };
  allMiniApps: any[]; 
  workspaceId?: string; 
  isAdmin?: boolean; 
}

// ============================================
// HELPER: Generate unique field IDs
// ============================================
let _fid = 0;
const fid = () => `tpl_${Date.now()}_${++_fid}`;

// ============================================
// DEFAULT FIELD SETTINGS
// ============================================
const defaultSettings = (overrides: Record<string, any> = {}) => ({
  placeholder: '',
  helpText: '',
  defaultValue: '',
  validation: {},
  appearance: { width: 'full' },
  ...overrides,
});

// ============================================
// TEMPLATE DEFINITIONS (10 templates)
// ============================================
const TEMPLATES: MiniAppTemplate[] = [
  {
    id: 'contact-list',
    name: 'Contact List',
    description: 'Manage contacts with names, phone numbers, emails, and addresses.',
    icon: <UserIcon size={22} />,
    idPrefix: 'CON',
    uidLength: 5,
    color: '#3b82f6',
    fields: [
      { id: fid(), name: 'Full Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Enter full name' }) },
      { id: fid(), name: 'Company', type: 'text_field', required: false, column: 2, row: 1, settings: defaultSettings({ placeholder: 'Company name' }) },
      { id: fid(), name: 'Phone', type: 'phone_number_field', required: true, column: 1, row: 2, settings: defaultSettings({ placeholder: '+1 (555) 000-0000' }) },
      { id: fid(), name: 'Email', type: 'email_address_field', required: true, column: 2, row: 2, settings: defaultSettings({ placeholder: 'email@example.com' }) },
      { id: fid(), name: 'Address', type: 'location_field', required: false, column: 1, row: 3, settings: defaultSettings({ placeholder: 'Street address' }) },
      { id: fid(), name: 'Category', type: 'category_field', required: false, column: 2, row: 3, settings: defaultSettings({ options: [{ id: '1', label: 'Client', color: '#3b82f6' }, { id: '2', label: 'Vendor', color: '#f59e0b' }, { id: '3', label: 'Partner', color: '#10b981' }] }) },
      { id: fid(), name: 'Photo', type: 'image_field', required: false, column: 1, row: 4, settings: defaultSettings() },
      { id: fid(), name: 'Notes', type: 'text_field', required: false, column: 2, row: 4, settings: defaultSettings({ placeholder: 'Additional notes...' }) },
    ],
  },
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    description: 'Track projects with status, deadlines, assigned team members, and progress.',
    icon: <GridIcon size={22} />,
    idPrefix: 'PRJ',
    uidLength: 5,
    color: '#8b5cf6',
    fields: [
      { id: fid(), name: 'Project Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Project name' }) },
      { id: fid(), name: 'Status', type: 'category_field', required: true, column: 2, row: 1, settings: defaultSettings({ options: [{ id: '1', label: 'Not Started', color: '#6b7280' }, { id: '2', label: 'In Progress', color: '#3b82f6' }, { id: '3', label: 'On Hold', color: '#f59e0b' }, { id: '4', label: 'Completed', color: '#10b981' }] }) },
      { id: fid(), name: 'Assigned To', type: 'user_field', required: true, column: 1, row: 2, settings: defaultSettings() },
      { id: fid(), name: 'Priority', type: 'category_field', required: false, column: 2, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'Low', color: '#6b7280' }, { id: '2', label: 'Medium', color: '#f59e0b' }, { id: '3', label: 'High', color: '#ef4444' }, { id: '4', label: 'Critical', color: '#dc2626' }] }) },
      { id: fid(), name: 'Start Date', type: 'date_field', required: true, column: 1, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Due Date', type: 'date_field', required: true, column: 2, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Budget', type: 'number_field', required: false, column: 1, row: 4, settings: defaultSettings({ placeholder: '0.00' }) },
      { id: fid(), name: 'Description', type: 'text_field', required: false, column: 2, row: 4, settings: defaultSettings({ placeholder: 'Project description...' }) },
    ],
  },
  {
    id: 'inventory-manager',
    name: 'Inventory Manager',
    description: 'Track inventory items with quantities, locations, and reorder levels.',
    icon: <DatabaseIcon size={22} />,
    idPrefix: 'INV',
    uidLength: 6,
    color: '#10b981',
    fields: [
      { id: fid(), name: 'Item Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Item name' }) },
      { id: fid(), name: 'SKU', type: 'text_field', required: true, column: 2, row: 1, settings: defaultSettings({ placeholder: 'SKU-0000' }) },
      { id: fid(), name: 'Category', type: 'category_field', required: true, column: 1, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'Electronics', color: '#3b82f6' }, { id: '2', label: 'Furniture', color: '#f59e0b' }, { id: '3', label: 'Supplies', color: '#10b981' }, { id: '4', label: 'Equipment', color: '#8b5cf6' }] }) },
      { id: fid(), name: 'Quantity', type: 'number_field', required: true, column: 2, row: 2, settings: defaultSettings({ placeholder: '0' }) },
      { id: fid(), name: 'Unit Price', type: 'number_field', required: true, column: 1, row: 3, settings: defaultSettings({ placeholder: '0.00' }) },
      { id: fid(), name: 'Location', type: 'location_field', required: false, column: 2, row: 3, settings: defaultSettings({ placeholder: 'Warehouse / Shelf' }) },
      { id: fid(), name: 'Reorder Level', type: 'number_field', required: false, column: 1, row: 4, settings: defaultSettings({ placeholder: 'Min qty' }) },
      { id: fid(), name: 'Photo', type: 'image_field', required: false, column: 2, row: 4, settings: defaultSettings() },
      { id: fid(), name: 'Supplier', type: 'text_field', required: false, column: 1, row: 5, settings: defaultSettings({ placeholder: 'Supplier name' }) },
      { id: fid(), name: 'Last Restocked', type: 'date_field', required: false, column: 2, row: 5, settings: defaultSettings() },
    ],
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Report and track software bugs with severity, status, and assignments.',
    icon: <BuildIcon size={22} />,
    idPrefix: 'BUG',
    uidLength: 5,
    color: '#ef4444',
    fields: [
      { id: fid(), name: 'Bug Title', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Brief description of the bug' }) },
      { id: fid(), name: 'Severity', type: 'category_field', required: true, column: 2, row: 1, settings: defaultSettings({ options: [{ id: '1', label: 'Low', color: '#6b7280' }, { id: '2', label: 'Medium', color: '#f59e0b' }, { id: '3', label: 'High', color: '#ef4444' }, { id: '4', label: 'Critical', color: '#dc2626' }] }) },
      { id: fid(), name: 'Status', type: 'category_field', required: true, column: 1, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'Open', color: '#ef4444' }, { id: '2', label: 'In Progress', color: '#3b82f6' }, { id: '3', label: 'Fixed', color: '#10b981' }, { id: '4', label: 'Closed', color: '#6b7280' }] }) },
      { id: fid(), name: 'Assigned To', type: 'user_field', required: false, column: 2, row: 2, settings: defaultSettings() },
      { id: fid(), name: 'Reported Date', type: 'date_field', required: true, column: 1, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Steps to Reproduce', type: 'text_field', required: false, column: 2, row: 3, settings: defaultSettings({ placeholder: '1. Go to...\n2. Click on...' }) },
      { id: fid(), name: 'Screenshot', type: 'image_field', required: false, column: 1, row: 4, settings: defaultSettings() },
      { id: fid(), name: 'Environment', type: 'text_field', required: false, column: 2, row: 4, settings: defaultSettings({ placeholder: 'Browser, OS, Device...' }) },
    ],
  },
  {
    id: 'invoice-manager',
    name: 'Invoice Manager',
    description: 'Create and track invoices with line items, amounts, and payment status.',
    icon: <DollarIcon size={22} />,
    idPrefix: 'INV',
    uidLength: 6,
    color: '#f59e0b',
    fields: [
      { id: fid(), name: 'Client Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Client / Company name' }) },
      { id: fid(), name: 'Invoice Date', type: 'date_field', required: true, column: 2, row: 1, settings: defaultSettings() },
      { id: fid(), name: 'Due Date', type: 'date_field', required: true, column: 1, row: 2, settings: defaultSettings() },
      { id: fid(), name: 'Status', type: 'category_field', required: true, column: 2, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'Draft', color: '#6b7280' }, { id: '2', label: 'Sent', color: '#3b82f6' }, { id: '3', label: 'Paid', color: '#10b981' }, { id: '4', label: 'Overdue', color: '#ef4444' }] }) },
      { id: fid(), name: 'Amount', type: 'number_field', required: true, column: 1, row: 3, settings: defaultSettings({ placeholder: '0.00' }) },
      { id: fid(), name: 'Tax Rate', type: 'number_field', required: false, column: 2, row: 3, settings: defaultSettings({ placeholder: '0%' }) },
      { id: fid(), name: 'Client Email', type: 'email_address_field', required: false, column: 1, row: 4, settings: defaultSettings({ placeholder: 'billing@client.com' }) },
      { id: fid(), name: 'Notes', type: 'text_field', required: false, column: 2, row: 4, settings: defaultSettings({ placeholder: 'Payment terms, notes...' }) },
    ],
  },
  {
    id: 'employee-directory',
    name: 'Employee Directory',
    description: 'Maintain a directory of employees with roles, departments, and contact info.',
    icon: <UserIcon size={22} />,
    idPrefix: 'EMP',
    uidLength: 5,
    color: '#06b6d4',
    fields: [
      { id: fid(), name: 'Full Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'First and last name' }) },
      { id: fid(), name: 'Job Title', type: 'text_field', required: true, column: 2, row: 1, settings: defaultSettings({ placeholder: 'Job title' }) },
      { id: fid(), name: 'Department', type: 'category_field', required: true, column: 1, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'Engineering', color: '#3b82f6' }, { id: '2', label: 'Marketing', color: '#f59e0b' }, { id: '3', label: 'Sales', color: '#10b981' }, { id: '4', label: 'HR', color: '#8b5cf6' }, { id: '5', label: 'Finance', color: '#06b6d4' }] }) },
      { id: fid(), name: 'Email', type: 'email_address_field', required: true, column: 2, row: 2, settings: defaultSettings({ placeholder: 'name@company.com' }) },
      { id: fid(), name: 'Phone', type: 'phone_number_field', required: true, column: 1, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Start Date', type: 'date_field', required: false, column: 2, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Photo', type: 'image_field', required: false, column: 1, row: 4, settings: defaultSettings() },
      { id: fid(), name: 'Office Location', type: 'location_field', required: false, column: 2, row: 4, settings: defaultSettings({ placeholder: 'Building / Floor' }) },
      { id: fid(), name: 'Manager', type: 'user_field', required: false, column: 1, row: 5, settings: defaultSettings() },
    ],
  },
  {
    id: 'event-planner',
    name: 'Event Planner',
    description: 'Plan and manage events with dates, venues, attendees, and budgets.',
    icon: <CalendarIcon size={22} />,
    idPrefix: 'EVT',
    uidLength: 5,
    color: '#ec4899',
    fields: [
      { id: fid(), name: 'Event Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Event name' }) },
      { id: fid(), name: 'Event Type', type: 'category_field', required: true, column: 2, row: 1, settings: defaultSettings({ options: [{ id: '1', label: 'Conference', color: '#3b82f6' }, { id: '2', label: 'Workshop', color: '#f59e0b' }, { id: '3', label: 'Social', color: '#ec4899' }, { id: '4', label: 'Meeting', color: '#6b7280' }] }) },
      { id: fid(), name: 'Start Date', type: 'date_field', required: true, column: 1, row: 2, settings: defaultSettings() },
      { id: fid(), name: 'End Date', type: 'date_field', required: true, column: 2, row: 2, settings: defaultSettings() },
      { id: fid(), name: 'Venue', type: 'location_field', required: true, column: 1, row: 3, settings: defaultSettings({ placeholder: 'Venue name and address' }) },
      { id: fid(), name: 'Organizer', type: 'user_field', required: true, column: 2, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Budget', type: 'number_field', required: false, column: 1, row: 4, settings: defaultSettings({ placeholder: '0.00' }) },
      { id: fid(), name: 'Max Attendees', type: 'number_field', required: false, column: 2, row: 4, settings: defaultSettings({ placeholder: '0' }) },
      { id: fid(), name: 'Description', type: 'text_field', required: false, column: 1, row: 5, settings: defaultSettings({ placeholder: 'Event details...' }) },
      { id: fid(), name: 'Banner Image', type: 'image_field', required: false, column: 2, row: 5, settings: defaultSettings() },
    ],
  },
  {
    id: 'customer-crm',
    name: 'Customer CRM',
    description: 'Manage customer relationships with deal stages, values, and interactions.',
    icon: <TagIcon size={22} />,
    idPrefix: 'CRM',
    uidLength: 5,
    color: '#f97316',
    fields: [
      { id: fid(), name: 'Customer Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Customer / Company' }) },
      { id: fid(), name: 'Contact Person', type: 'text_field', required: true, column: 2, row: 1, settings: defaultSettings({ placeholder: 'Primary contact' }) },
      { id: fid(), name: 'Email', type: 'email_address_field', required: true, column: 1, row: 2, settings: defaultSettings({ placeholder: 'email@customer.com' }) },
      { id: fid(), name: 'Phone', type: 'phone_number_field', required: true, column: 2, row: 2, settings: defaultSettings() },
      { id: fid(), name: 'Deal Stage', type: 'category_field', required: true, column: 1, row: 3, settings: defaultSettings({ options: [{ id: '1', label: 'Lead', color: '#6b7280' }, { id: '2', label: 'Qualified', color: '#3b82f6' }, { id: '3', label: 'Proposal', color: '#f59e0b' }, { id: '4', label: 'Negotiation', color: '#8b5cf6' }, { id: '5', label: 'Won', color: '#10b981' }, { id: '6', label: 'Lost', color: '#ef4444' }] }) },
      { id: fid(), name: 'Deal Value', type: 'number_field', required: false, column: 2, row: 3, settings: defaultSettings({ placeholder: '0.00' }) },
      { id: fid(), name: 'Assigned Rep', type: 'user_field', required: false, column: 1, row: 4, settings: defaultSettings() },
      { id: fid(), name: 'Last Contact', type: 'date_field', required: false, column: 2, row: 4, settings: defaultSettings() },
      { id: fid(), name: 'Website', type: 'hyperlink_field', required: false, column: 1, row: 5, settings: defaultSettings({ placeholder: 'https://...' }) },
      { id: fid(), name: 'Notes', type: 'text_field', required: false, column: 2, row: 5, settings: defaultSettings({ placeholder: 'Interaction notes...' }) },
    ],
  },
  {
    id: 'work-order',
    name: 'Work Order',
    description: 'Manage maintenance and service work orders with priorities and assignments.',
    icon: <BuildIcon size={22} />,
    idPrefix: 'WO',
    uidLength: 6,
    color: '#64748b',
    fields: [
      { id: fid(), name: 'Work Order Title', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Describe the work needed' }) },
      { id: fid(), name: 'Priority', type: 'category_field', required: true, column: 2, row: 1, settings: defaultSettings({ options: [{ id: '1', label: 'Low', color: '#6b7280' }, { id: '2', label: 'Medium', color: '#f59e0b' }, { id: '3', label: 'High', color: '#ef4444' }, { id: '4', label: 'Emergency', color: '#dc2626' }] }) },
      { id: fid(), name: 'Status', type: 'category_field', required: true, column: 1, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'Open', color: '#3b82f6' }, { id: '2', label: 'Assigned', color: '#8b5cf6' }, { id: '3', label: 'In Progress', color: '#f59e0b' }, { id: '4', label: 'Completed', color: '#10b981' }, { id: '5', label: 'Closed', color: '#6b7280' }] }) },
      { id: fid(), name: 'Assigned To', type: 'user_field', required: true, column: 2, row: 2, settings: defaultSettings() },
      { id: fid(), name: 'Location', type: 'location_field', required: true, column: 1, row: 3, settings: defaultSettings({ placeholder: 'Building / Room' }) },
      { id: fid(), name: 'Due Date', type: 'date_field', required: true, column: 2, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Estimated Hours', type: 'duration_field', required: false, column: 1, row: 4, settings: defaultSettings({ placeholder: '0h' }) },
      { id: fid(), name: 'Cost', type: 'number_field', required: false, column: 2, row: 4, settings: defaultSettings({ placeholder: '0.00' }) },
      { id: fid(), name: 'Photos', type: 'image_field', required: false, column: 1, row: 5, settings: defaultSettings() },
      { id: fid(), name: 'Notes', type: 'text_field', required: false, column: 2, row: 5, settings: defaultSettings({ placeholder: 'Additional details...' }) },
    ],
  },
  {
    id: 'asset-register',
    name: 'Asset Register',
    description: 'Track company assets with serial numbers, locations, and depreciation.',
    icon: <BarcodeIcon size={22} />,
    idPrefix: 'AST',
    uidLength: 6,
    color: '#14b8a6',
    fields: [
      { id: fid(), name: 'Asset Name', type: 'text_field', required: true, column: 1, row: 1, settings: defaultSettings({ placeholder: 'Asset name / description' }) },
      { id: fid(), name: 'Serial Number', type: 'text_field', required: true, column: 2, row: 1, settings: defaultSettings({ placeholder: 'S/N' }) },
      { id: fid(), name: 'Category', type: 'category_field', required: true, column: 1, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'IT Equipment', color: '#3b82f6' }, { id: '2', label: 'Furniture', color: '#f59e0b' }, { id: '3', label: 'Vehicle', color: '#10b981' }, { id: '4', label: 'Machinery', color: '#8b5cf6' }, { id: '5', label: 'Other', color: '#6b7280' }] }) },
      { id: fid(), name: 'Status', type: 'category_field', required: true, column: 2, row: 2, settings: defaultSettings({ options: [{ id: '1', label: 'Active', color: '#10b981' }, { id: '2', label: 'In Repair', color: '#f59e0b' }, { id: '3', label: 'Retired', color: '#6b7280' }, { id: '4', label: 'Lost', color: '#ef4444' }] }) },
      { id: fid(), name: 'Purchase Date', type: 'date_field', required: true, column: 1, row: 3, settings: defaultSettings() },
      { id: fid(), name: 'Purchase Price', type: 'number_field', required: true, column: 2, row: 3, settings: defaultSettings({ placeholder: '0.00' }) },
      { id: fid(), name: 'Location', type: 'location_field', required: false, column: 1, row: 4, settings: defaultSettings({ placeholder: 'Building / Room' }) },
      { id: fid(), name: 'Assigned To', type: 'user_field', required: false, column: 2, row: 4, settings: defaultSettings() },
      { id: fid(), name: 'Photo', type: 'image_field', required: false, column: 1, row: 5, settings: defaultSettings() },
      { id: fid(), name: 'Warranty Expiry', type: 'date_field', required: false, column: 2, row: 5, settings: defaultSettings() },
    ],
  },
];

// ============================================
// COMPONENT
// ============================================
const MiniAppInitialSetup: React.FC<MiniAppInitialSetupProps> = ({ isOpen, onClose, onContinue, wsColor, allMiniApps, workspaceId, isAdmin }) => {

  const { organization, getUserRole } = useAuth();
  const userRole = getUserRole ? getUserRole() : null;
  const effectiveIsAdmin = isAdmin || userRole === 'organization_admin_user' || userRole === 'organization_admin';
  
  const ac = wsColor;
  const [step, setStep] = useState<'templates' | 'configure'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<MiniAppTemplate | null>(null);
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [itemName, setItemName] = useState('');
  const [idPrefix, setIdPrefix] = useState('');
  const [uidLength, setUidLength] = useState(6);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showItemId, setShowItemId] = useState(true);
  const [barcodeSymbology, setBarcodeSymbology] = useState<string>('code128');
  const [error, setError] = useState('');
  const [isPreset, setIsPreset] = useState(false);

  // ⚡ STAGE 3: Platform Owner Organization Fetching
  const [allOrgs, setAllOrgs] = useState<{id: string, name: string}[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [autoDeployMiniApp, setAutoDeployMiniApp] = useState(false); // ⚡ NEW STATE

  // Real-time name conflict validation scoped to the current workspace
  const isNameConflict = React.useMemo(() => {
    const normalizedInput = appName.trim().toLowerCase();
    if (!normalizedInput) return false;
    return allMiniApps?.some(app => 
      app.name.trim().toLowerCase() === normalizedInput && 
      app.workspace_id === workspaceId
    );
  }, [appName, allMiniApps, workspaceId]);

  // ⚡ STAGE 3: Fetch all organizations safely if Admin
  useEffect(() => {
    if (effectiveIsAdmin && isOpen) {
      supabase.rpc('get_all_organizations').then(({ data }) => {
        if (data) setAllOrgs(data);
      });
    }
  }, [effectiveIsAdmin, isOpen]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: MiniAppTemplate) => {
    setSelectedTemplate(template);
    setAppName(template.name);
    setAppDescription(template.description);
    setIdPrefix(template.idPrefix);
    setUidLength(template.uidLength);
    setStep('configure');
  };

  const handleStartBlank = () => {
    setSelectedTemplate(null);
    setAppName('');
    setAppDescription('');
    setIdPrefix('');
    setUidLength(6);
    setStep('configure');
  };

  const handleContinue = () => {
    if (!appName.trim()) {
      setError('Please enter a MiniApp name');
      return;
    }
    setError('');
    
    const itemIdSettings: ItemIdSettings = {
      ...DEFAULT_ITEM_ID_SETTINGS,
      prefix: idPrefix,
      minDigits: uidLength,
      showBarcode,
      showQrCode,
      showItemId,
      barcodeSymbology: barcodeSymbology as any,
    };

    onContinue({
      name: appName,
      description: appDescription,
      itemName,
      idPrefix,
      uidLength,
      itemIdSettings,
      fields: selectedTemplate?.fields,
      isPreset,
      targetOrgIds: selectedOrgIds, 
      autoDeploy: autoDeployMiniApp // ⚡ PASS FLAG TO BUILDER
    });
  };

  const previewUid = generatePreviewUid(idPrefix, uidLength, 42);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ padding: '72px 16px 72px 16px' }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{ 
          background: 'rgba(0,0,0,0.95)', 
          backdropFilter: 'blur(24px)',
          border: `1px solid rgba(${ac.rgb}, 0.2)`,
          boxShadow: `0 0 60px rgba(${ac.rgb}, 0.1), 0 0 120px rgba(0,0,0,0.5)`,
          maxHeight: '100%',
          maxWidth: step === 'templates' ? '64rem' : '42rem',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: `rgba(${ac.rgb}, 0.15)` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgba(${ac.rgb}, 0.15)` }}>
              <BuildIcon size={20} style={{ color: ac.primary }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {step === 'templates' ? 'Create New MiniApp' : 'Configure MiniApp'}
              </h2>
              <p className="text-xs text-white/40">
                {step === 'templates' 
                  ? 'Choose a template or start from scratch' 
                  : selectedTemplate 
                    ? `Template: ${selectedTemplate.name} — Customize your settings`
                    : 'Set up your app name, ID format, and settings'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === 'configure' && (
              <button
                onClick={() => setStep('templates')}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                Back to Templates
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: `rgba(${ac.rgb},0.3) transparent` }}>
          
          {/* STEP 1: TEMPLATE SELECTION */}
          {step === 'templates' && (
            <div className="space-y-6">
              <div>
                <button
                  onClick={handleStartBlank}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all duration-200 hover:scale-[1.01] group"
                  style={{ borderColor: `rgba(${ac.rgb}, 0.25)`, background: `rgba(${ac.rgb}, 0.03)` }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-dashed transition-colors" style={{ borderColor: `rgba(${ac.rgb}, 0.3)` }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: ac.primary }}>
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold group-hover:text-white/90">Start from Scratch</p>
                    <p className="text-xs text-white/40">Build your MiniApp with a blank canvas — add fields as you go</p>
                  </div>
                  <div className="ml-auto">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-white/50 transition-colors">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Or choose a template</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="group flex flex-col items-start p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] text-left"
                      style={{ borderColor: `rgba(${ac.rgb}, 0.1)`, background: 'rgba(255,255,255,0.02)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = template.color + '60'; e.currentTarget.style.background = template.color + '08'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${ac.rgb}, 0.1)`; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: template.color + '20', color: template.color }}>
                        {template.icon}
                      </div>
                      <p className="text-sm font-semibold text-white mb-1">{template.name}</p>
                      <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2">{template.description}</p>
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: template.color + '15', color: template.color }}>{template.fields.length} fields</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30 font-mono">{template.idPrefix}-</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE */}
          {step === 'configure' && (
            <div className="space-y-6">
              {selectedTemplate && (
                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: selectedTemplate.color + '30', background: selectedTemplate.color + '08' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: selectedTemplate.color + '20', color: selectedTemplate.color }}>{selectedTemplate.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Using template: <span style={{ color: selectedTemplate.color }}>{selectedTemplate.name}</span></p>
                    <p className="text-[11px] text-white/40">{selectedTemplate.fields.length} pre-configured fields will be added to your canvas</p>
                  </div>
                  <button onClick={() => { setSelectedTemplate(null); setAppName(''); setAppDescription(''); setIdPrefix(''); }} className="text-xs text-white/30 hover:text-white/60 px-2 py-1 rounded-lg hover:bg-white/5 transition-all">Clear</button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">MiniApp Name *</label>
                <input type="text" value={appName} onChange={(e) => { setAppName(e.target.value); setError(''); }}
                  placeholder="e.g., Customer Contacts, Inventory Items..."
                  className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/20 focus:outline-none transition-all"
                  style={{ borderColor: isNameConflict ? '#ef4444' : error ? '#ef4444' : `rgba(${ac.rgb}, 0.15)` }}
                  onFocus={(e) => { if (!error && !isNameConflict) e.target.style.borderColor = ac.primary; }}
                  onBlur={(e) => { if (!error && !isNameConflict) e.target.style.borderColor = `rgba(${ac.rgb}, 0.15)`; }}
                  autoFocus={step === 'configure'}
                />
                {error && !isNameConflict && <p className="text-xs text-red-400 mt-1">{error}</p>}
                
                {isNameConflict && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-400 animate-in fade-in slide-in-from-top-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span className="text-xs font-mono">A MiniApp with this name already exists in this workspace.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Item Name</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/20 focus:outline-none transition-all"
                  style={{ borderColor: `rgba(${ac.rgb}, 0.15)` }}
                  onFocus={e => { e.currentTarget.style.borderColor = wsColor.primary; e.currentTarget.style.boxShadow = `0 0 12px rgba(${wsColor.rgb}, 0.15)`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = `rgba(${ac.rgb}, 0.15)`; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="Enter singular record name"
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Description</label>
                <textarea value={appDescription} onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="What will this MiniApp be used for?" rows={2}
                  className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder:text-white/20 focus:outline-none transition-all resize-none"
                  style={{ borderColor: `rgba(${ac.rgb}, 0.15)` }}
                  onFocus={(e) => e.target.style.borderColor = ac.primary}
                  onBlur={(e) => e.target.style.borderColor = `rgba(${ac.rgb}, 0.15)`}
                />
              </div>

              <div className="p-4 rounded-xl border" style={{ borderColor: `rgba(${ac.rgb}, 0.1)`, background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <HashIcon size={16} style={{ color: ac.primary }} />
                  <span className="text-sm font-medium text-white/70">Item ID Settings</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">ID Prefix</label>
                    <input type="text" value={idPrefix} onChange={(e) => setIdPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                      placeholder="e.g., INV" className="w-full px-3 py-2 rounded-lg border bg-white/5 text-white placeholder:text-white/20 text-sm focus:outline-none transition-all font-mono"
                      style={{ borderColor: `rgba(${ac.rgb}, 0.15)` }} onFocus={(e) => e.target.style.borderColor = ac.primary} onBlur={(e) => e.target.style.borderColor = `rgba(${ac.rgb}, 0.15)`} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">UID Length</label>
                    <select value={uidLength} onChange={(e) => setUidLength(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border bg-white/5 text-white text-sm focus:outline-none transition-all" style={{ borderColor: `rgba(${ac.rgb}, 0.15)` }}>
                      {[4, 5, 6, 7, 8].map(n => (<option key={n} value={n} className="bg-gray-900">{n} digits</option>))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Preview</p>
                  <p className="text-sm font-mono" style={{ color: ac.primary }}>{previewUid}</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Show Item ID', value: showItemId, set: setShowItemId },
                    { label: 'Show Barcode', value: showBarcode, set: setShowBarcode },
                    { label: 'Show QR Code', value: showQrCode, set: setShowQrCode },
                  ].map(({ label, value, set }) => (
                    <button key={label} onClick={() => set(!value)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all"
                      style={{ borderColor: value ? `rgba(${ac.rgb}, 0.3)` : 'rgba(255,255,255,0.1)', background: value ? `rgba(${ac.rgb}, 0.1)` : 'transparent', color: value ? ac.primary : 'rgba(255,255,255,0.4)' }}>
                      <div className={`w-3 h-3 rounded-sm border ${value ? '' : 'border-white/20'}`} style={value ? { background: ac.primary, borderColor: ac.primary } : {}}>
                        {value && (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)}
                      </div>
                      {label}
                    </button>
                  ))}
                </div>
                {showBarcode && (
                  <div className="mt-3">
                    <label className="block text-xs text-white/40 mb-1">Barcode Format</label>
                    <select value={barcodeSymbology} onChange={(e) => setBarcodeSymbology(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-white/5 text-white text-sm focus:outline-none transition-all" style={{ borderColor: `rgba(${ac.rgb}, 0.15)` }}>
                      {BARCODE_SYMBOLOGIES.map(s => (<option key={s.id} value={s.id} className="bg-gray-900">{s.label}</option>))}
                    </select>
                  </div>
                )}
              </div>

              {effectiveIsAdmin && (
                <div className="p-4 rounded-xl border mt-6" style={{ borderColor: `rgba(${ac.rgb}, 0.15)`, background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Global Preset</h4>
                      <p className="text-xs text-white/50">Make this MiniApp available to all workspaces and organizations.</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div
                        onClick={() => setIsPreset(!isPreset)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${isPreset ? '' : 'bg-slate-700'}`}
                        style={isPreset ? { backgroundColor: ac.primary } : {}}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isPreset ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    </label>
                  </div>

                  {/* ⚡ STAGE 3: Organization Distribution Section (Matches Workspace UI) */}
                  <div className={`transition-all duration-300 overflow-hidden ${isPreset ? 'max-h-[400px] mt-4 pt-4 border-t' : 'max-h-0'}`} style={{ borderColor: `rgba(${ac.rgb}, 0.15)` }}>
                    <label className="block text-sm font-mono font-bold mb-2 flex items-center gap-2" style={{ color: ac.primary }}>
                      <DatabaseIcon size={16} /> Deploy to Organizations
                    </label>
                    
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={orgSearchQuery}
                      onChange={(e) => setOrgSearchQuery(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 mb-3 focus:outline-none font-mono"
                      style={{ ['--focus-border' as any]: `rgba(${ac.rgb}, 0.5)` }}
                      onFocus={e => { e.currentTarget.style.borderColor = `rgba(${ac.rgb}, 0.5)`; }}
                      onBlur={e => { e.currentTarget.style.borderColor = ''; }}
                    />
                    
                    <div className="flex items-center gap-2 mb-3 bg-gray-900/40 p-2 rounded-lg border border-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedOrgIds.length === allOrgs.length && allOrgs.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedOrgIds(allOrgs.map(o => o.id));
                          else setSelectedOrgIds([]); 
                        }}
                        className="w-4 h-4 cursor-pointer"
                        style={{ accentColor: ac.primary }}
                      />
                      <span className="text-xs text-gray-300 font-mono font-bold">Select All Organizations ({allOrgs.length})</span>
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1 pr-2 darkwave-scrollbar border border-gray-900 rounded-lg p-1">
                      {allOrgs.filter(o => o.name.toLowerCase().includes(orgSearchQuery.toLowerCase())).map(org => (
                        <label key={org.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/80 p-2 rounded-md transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedOrgIds.includes(org.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedOrgIds(prev => [...prev, org.id]);
                              else setSelectedOrgIds(prev => prev.filter(id => id !== org.id));
                            }}
                            className="w-3.5 h-3.5 cursor-pointer"
                            style={{ accentColor: ac.primary }}
                          />
                          <span className={`text-xs font-mono truncate ${org.id === organization?.id ? 'font-bold' : 'text-gray-400'}`} style={{ color: org.id === organization?.id ? ac.primary : undefined }}>
                            {org.name}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* ⚡ NEW AUTO DEPLOY TOGGLE */}
                    <div className="flex items-center justify-between mt-3 p-2 bg-black/40 border border-gray-800 rounded-lg transition-colors hover:border-gray-700">
                      <span className="text-xs font-mono text-gray-300">Auto-deploy to new orgs</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={autoDeployMiniApp} onChange={e => setAutoDeployMiniApp(e.target.checked)} />
                        <div className={`w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${autoDeployMiniApp ? '' : 'peer-checked:bg-cyan-500'}`} style={autoDeployMiniApp ? { backgroundColor: ac.primary } : {}}></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'configure' && (
          <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: `rgba(${ac.rgb}, 0.1)` }}>
            <p className="text-xs text-white/30">
              {selectedTemplate ? `${selectedTemplate.fields.length} fields from template` : 'Starting with blank canvas'}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-all">Cancel</button>
              <button
                onClick={handleContinue}
                disabled={isNameConflict} 
                className="px-8 py-2.5 text-sm font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 backdrop-blur-md font-['Space_Mono',monospace] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ 
                  background: 'rgba(0,0,0,0.6)', 
                  border: isNameConflict ? '1px solid #475569' : `1px solid rgba(${ac.rgb}, 0.5)`, 
                  color: isNameConflict ? '#64748b' : ac.primary, 
                  boxShadow: isNameConflict ? 'none' : `0 0 20px rgba(${ac.rgb}, 0.15)` 
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniAppInitialSetup;