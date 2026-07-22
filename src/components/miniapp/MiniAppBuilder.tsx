import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/dbProxy';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';

import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceColor, COLOR_MAP } from '@/contexts/WorkspaceColorContext';
import { 
  CloseIcon, 
  CheckCircleIcon,
  PlusIcon, 
  TrashIcon,
  GridIcon,
  BuildIcon,
  DatabaseIcon,
  LinkIcon,
  TypeIcon,
  PhoneIcon,
  MailIcon,
  TagIcon,
  UserIcon,
  ImageIcon,
  HashIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CalculatorIcon,
  SettingsIcon,
  GripVerticalIcon,
  ColumnsIcon,
  SparklesIcon,
  GitBranchIcon,
  EditIcon,
  SearchIcon,
  TableIcon,
  CardLayoutIcon,
  BadgeIcon,
  SubMenuIcon,
  SplitIcon,
  PaymentIcon,
  LayoutIcon,
  ChevronDownIcon,
  DollarIcon,
  BarcodeIcon,
  EyeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
  HistoryIcon,
  WorkflowIcon,
  ChevronRightIcon,
  ChevronLeftIcon
} from '@/components/icons/Icons';
import { MiniApp, OrganizationUser, AppSettings, DEFAULT_APP_SETTINGS } from '@/types';
import IconPickerModal, { ALL_ICONS } from './IconPickerModal';

import MiniAppInitialSetup from './MiniAppInitialSetup';
import MiniAppVersionHistory from './MiniAppVersionHistory';
import SubMenuFieldSettings from './SubMenuFieldSettings';
import BulkFieldActions from './BulkFieldActions';
import MiniAppAIAssistant from './MiniAppAIAssistant';
import MiniAppFooterBuilder from './MiniAppFooterBuilder';


import { 
  ItemIdSettings, 
  DEFAULT_ITEM_ID_SETTINGS, 
  BARCODE_SYMBOLOGIES, 
  generatePreviewUid, 
  generateBarcodeSVG, 
  generateQRCodeSVG,
  generateItemUrl
} from '@/lib/barcodeUtils';

import { WandSparkles, Activity } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Helper to safely map lowercase DB icon strings to Lucide's PascalCase exports
const resolveBuilderIcon = (iconStr: string | null | undefined) => {
  if (!iconStr) return GridIcon;
  const pascalIcon = iconStr.charAt(0).toUpperCase() + iconStr.slice(1);
  return (LucideIcons as any)[pascalIcon] || GridIcon;
};

const MAX_FIELDS_PER_MINIAPP = 120;

type BuildingBlockType = 
  | 'text_field'
  | 'phone_number_field'
  | 'email_address_field'
  | 'category_field'
  | 'user_field'
  | 'image_field'
  | 'hyperlink_field'
  | 'number_field'
  | 'location_field'
  | 'date_field'
  | 'duration_field'
  | 'calculation_field'
  | 'connection_field'
  | 'submenu'
  | 'integration_field'
  | 'split_separator'
  | 'visualizer_field'
  | 'tabs'; 

type LayoutType = 'table' | 'card' | 'badge' | 'calendar';

interface CategoryOption {
  id: string;
  label: string;
  color: string;
}

interface SubMenuBlock {
  id: string;
  name: string;
  type: Exclude<BuildingBlockType, 'submenu'>;
  required: boolean;
  column: 1 | 2;
  row: number;
  settings: FieldSettings;
}

interface FieldSettings {
  multiline?: boolean;
  allowMultiple?: boolean;
  decimals?: number;
  durationUnits?: {
    years?: boolean;
    weeks?: boolean;
    days?: boolean;
    hours?: boolean;
    minutes?: boolean;
    seconds?: boolean;
  };
  calculationPrompt?: string;
  displaySize?: 'small' | 'medium' | 'large';
  categoryOptions?: CategoryOption[];
  linkedMiniAppId?: string;
  connectedMiniAppIds?: string[];
  allowMultipleConnections?: boolean;
  subMenuBlocks?: SubMenuBlock[];
  subMenuColumns?: 1 | 2;
  conditionFieldId?: string;        
  conditionOperator?: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  conditionValue?: string;          
  integrationId?: string;
  integrationType?: 'hardware' | 'software' | 'access_control' | 'camera' | 'data_input' | 'payment' | 'other';
  
  // ⚡ INTEGRATION-SPECIFIC CONFIGURATIONS
  // Payments (Stripe, Square)
  integrationPaymentAmountField?: string;
  integrationPaymentCurrency?: string;
  integrationPaymentDescription?: string;
  // Cameras (Verkada)
  integrationCameraId?: string;
  integrationCameraViewMode?: 'live' | 'snapshot';
  // Access Control (Brivo, HID)
  integrationDoorId?: string;
  integrationAccessAction?: 'momentary_unlock' | 'lock' | 'lockdown';

  separatorColor?: string;
  separatorStyle?: 'solid' | 'dashed';
  marginTop?: number;
  marginBottom?: number;
  tabOptions?: { id: string; label: string; fields?: BuildingBlock[]; color?: string }[]; 
  hiddenWhenEmpty?: boolean;
  hiddenWhenFull?: boolean;
  alwaysHidden?: boolean;
  
  // ⚡ VISUALIZER SETTINGS
  visualizerSourceAppId?: string;
  visualizerChartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'dynamic';
  visualizerDefaultMode?: '2D' | '3D';
  visualizerXAxisField?: string;
  visualizerXAxisLabel?: string;
  visualizerYAxisField?: string;
  visualizerYAxisOperator?: 'none' | 'add' | 'subtract' | 'multiply' | 'divide';
  visualizerYAxisField2?: string;
  visualizerYAxisLabel?: string;
  // ⚡ DYNAMIC SIMULATION SETTINGS
  isDynamicSimulation?: boolean;
  dynamicSimMin?: number;
  dynamicSimMax?: number;

  // ⚡ CONNECTION LAYOUT SETTINGS
  connectionLayoutMode?: 'dropdown' | 'bar' | 'table' | 'window';
  connectionDropdownSearchable?: boolean; // 👈 Add this line
  connectionBarExpandFields?: string[];
  connectionTableColumns?: string[];
}


interface BuildingBlock {
  id: string;
  name: string;
  type: BuildingBlockType;
  required: boolean;
  column: 1 | 2;
  columnSpan?: 1 | 2; 
  rowSpan?: number;   
  row: number;
  colSpan?: number;
  settings: FieldSettings;
  is_base?: boolean; // Identifies fields inherited from a global preset
  _isGhost?: boolean;
}

interface MiniAppBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, fields: BuildingBlock[], schema: Record<string, any>) => void;
  workspaceId?: string;
  wsColor?: { primary: string; rgb: string; dark: string; tw: string; colorName: string };
  existingApp?: {
    id?: string;
    slug?: string;
    name: string;
    description?: string;
    icon?: string;
    fields: BuildingBlock[];
    layouts?: LayoutType[];
    itemIdSettings?: ItemIdSettings;
    appSettings?: AppSettings;
    is_preset?: boolean;
    created_by?: string;
  };
  // 👇 Update this line
  initialTab?: 'template' | 'workflows' | 'pdfs' | 'labels' | 'settings';
}

const BUILDING_BLOCKS = [
  { type: 'text_field' as BuildingBlockType, label: 'Text Field', icon: TypeIcon, description: 'Single or multiline text', color: 'text-blue-400' },
  { type: 'phone_number_field' as BuildingBlockType, label: 'Phone Number', icon: PhoneIcon, description: 'Clickable phone numbers', color: 'text-green-400' },
  { type: 'email_address_field' as BuildingBlockType, label: 'Email Address', icon: MailIcon, description: 'Clickable email links', color: 'text-purple-400' },
  { type: 'category_field' as BuildingBlockType, label: 'Category', icon: TagIcon, description: 'Colored category tags', color: 'text-pink-400' },
  { type: 'user_field' as BuildingBlockType, label: 'User', icon: UserIcon, description: 'Organization user dropdown', color: 'text-orange-400' },
  { type: 'image_field' as BuildingBlockType, label: 'Image', icon: ImageIcon, description: 'Photo attachments with preview', color: 'text-cyan-400' },
  { type: 'hyperlink_field' as BuildingBlockType, label: 'Hyperlink', icon: LinkIcon, description: 'Web links with preview', color: 'text-indigo-400' },
  { type: 'number_field' as BuildingBlockType, label: 'Number', icon: HashIcon, description: 'Numbers with decimals', color: 'text-yellow-400' },
  { type: 'location_field' as BuildingBlockType, label: 'Location', icon: MapPinIcon, description: 'Google Maps preview', color: 'text-red-400' },
  { type: 'date_field' as BuildingBlockType, label: 'Date', icon: CalendarIcon, description: 'Date picker calendar', color: 'text-teal-400' },
  { type: 'duration_field' as BuildingBlockType, label: 'Duration', icon: ClockIcon, description: 'Time duration selector', color: 'text-amber-400' },
  { type: 'calculation_field' as BuildingBlockType, label: 'Calculation', icon: CalculatorIcon, description: 'AI-powered calculations', color: 'text-violet-400' },
  { type: 'connection_field' as BuildingBlockType, label: 'Connection', icon: GitBranchIcon, description: 'Link to other MiniApps', color: 'text-emerald-400' },
  { type: 'submenu' as BuildingBlockType, label: 'SubMenu', icon: SubMenuIcon, description: 'Container for grouped fields', color: 'text-sky-400' },
  { type: 'integration_field' as BuildingBlockType, label: 'Integration', icon: WorkflowIcon, description: 'Link hardware & software', color: 'text-lime-400' },
  { type: 'split_separator' as BuildingBlockType, label: 'Separator', icon: SplitIcon, description: 'Page section divider', color: 'text-slate-400' },
  { type: 'visualizer_field' as BuildingBlockType, label: 'Visualizer', icon: LucideIcons.PieChart, description: '2D/3D Data Reports', color: 'text-fuchsia-400' },
  { type: 'tabs' as BuildingBlockType, label: 'Tabs', icon: LayoutIcon, description: 'Organize fields into tabs', color: 'text-indigo-300' },
];

const LAYOUT_OPTIONS = [
  { type: 'table' as LayoutType, label: 'Table Layout', icon: TableIcon, description: 'Spreadsheet format with adjustable columns' },
  { type: 'card' as LayoutType, label: 'Card Layout', icon: CardLayoutIcon, description: 'Card-based grid view' },
  { type: 'badge' as LayoutType, label: 'Badge Layout', icon: BadgeIcon, description: 'Compact badge-style display' },
  { type: 'calendar' as LayoutType, label: 'Calendar Layout', icon: CalendarIcon, description: 'Calendar view (requires Date field)' },
];

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b'
];

const SEPARATOR_COLORS = [
  '#64748b', '#94a3b8', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#ef4444'
];

const ACCENT_COLORS = [
  { name: 'red', label: 'Red', hex: '#ef4444', rgb: '239,68,68' },
  { name: 'ruby', label: 'Ruby', hex: '#e11d48', rgb: '225,29,72' },
  { name: 'raspberry', label: 'Raspberry', hex: '#e83f6f', rgb: '232,63,111' },
  { name: 'coral', label: 'Coral', hex: '#fb7185', rgb: '251,113,133' },
  { name: 'melon', label: 'Melon', hex: '#fca5a5', rgb: '252,165,165' },
  { name: 'pink', label: 'Pink', hex: '#ec4899', rgb: '236,72,153' },
  { name: 'fuchsia', label: 'Fuchsia', hex: '#d946ef', rgb: '217,70,239' },
  { name: 'magenta', label: 'Magenta', hex: '#ff00ff', rgb: '255,0,255' },
  { name: 'lilac', label: 'Lilac', hex: '#d8b4fe', rgb: '216,180,254' },
  { name: 'lavender', label: 'Lavender', hex: '#c084fc', rgb: '192,132,252' },
  { name: 'violet', label: 'Violet', hex: '#8b5cf6', rgb: '139,92,246' },
  { name: 'purple', label: 'Purple', hex: '#a855f7', rgb: '168,85,247' },
  { name: 'indigo', label: 'Indigo', hex: '#6366f1', rgb: '99,102,241' },
  { name: 'electric', label: 'Electric', hex: '#818cf8', rgb: '129,140,248' },
  { name: 'blue', label: 'Blue', hex: '#3b82f6', rgb: '59,130,246' },
  { name: 'azure', label: 'Azure', hex: '#007fff', rgb: '0,127,255' },
  { name: 'sky', label: 'Sky', hex: '#0ea5e9', rgb: '14,165,233' },
  { name: 'cyan', label: 'Cyan', hex: '#00ffff', rgb: '0,255,255' },
  { name: 'teal', label: 'Teal', hex: '#14b8a6', rgb: '20,184,166' },
  { name: 'mint', label: 'Mint', hex: '#34d399', rgb: '52,211,153' },
  { name: 'emerald', label: 'Emerald', hex: '#10b981', rgb: '16,185,129' },
  { name: 'green', label: 'Green', hex: '#22c55e', rgb: '34,197,94' },
  { name: 'lime', label: 'Lime', hex: '#84cc16', rgb: '132,204,22' },
  { name: 'chartreuse', label: 'Chartreuse', hex: '#bfff00', rgb: '191,255,0' },
  { name: 'yellow', label: 'Yellow', hex: '#eab308', rgb: '234,179,8' },
  { name: 'sunflower', label: 'Sunflower', hex: '#ffc300', rgb: '255,195,0' },
  { name: 'gold', label: 'Gold', hex: '#fbbf24', rgb: '251,191,36' },
  { name: 'amber', label: 'Amber', hex: '#f59e0b', rgb: '245,158,11' },
  { name: 'peach', label: 'Peach', hex: '#fb923c', rgb: '251,146,60' },
  { name: 'orange', label: 'Orange', hex: '#ff9900', rgb: '255,153,0' },
  { name: 'tangerine', label: 'Tangerine', hex: '#f97316', rgb: '249,115,22' },
  { name: 'zinc', label: 'Zinc', hex: '#a1a1aa', rgb: '161,161,170' },
  { name: 'slate', label: 'Slate', hex: '#94a3b8', rgb: '148,163,184' },
  { name: 'silver', label: 'Silver', hex: '#d1d5db', rgb: '209,213,219' },
  { name: 'platinum', label: 'Platinum', hex: '#e5e7eb', rgb: '229,231,235' },
  { name: 'white', label: 'White', hex: '#ffffff', rgb: '255,255,255' },
];

// ⚡ NEW: Advanced Visualizer Configurator (Maps Axes and Math)
const VisualizerConfigurator = ({ field, updateFieldSettings, availableApps }: { field: any, updateFieldSettings: any, availableApps: any[] }) => {
  const [sourceFields, setSourceFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSchema = async () => {
      if (!field.settings.visualizerSourceAppId) {
        setSourceFields([]);
        return;
      }
      setIsLoading(true);
      const { data } = await supabase.schema('app_private')
        .from('mini_apps')
        .select('schema_definition')
        .eq('id', field.settings.visualizerSourceAppId)
        .single();
      
      if (data?.schema_definition?.fields) {
        setSourceFields(data.schema_definition.fields);
      }
      setIsLoading(false);
    };
    fetchSchema();
  }, [field.settings.visualizerSourceAppId]);

  const numericFields = sourceFields.filter(f => f.type === 'number_field' || f.type === 'calculation_field');

  return (
    <div className="space-y-4 border-t border-fuchsia-500/20 pt-4 mt-4">
      <div>
        <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Data Source App</label>
        <select
          value={field.settings.visualizerSourceAppId || ''}
          onChange={(e) => updateFieldSettings(field.id, { 
            visualizerSourceAppId: e.target.value,
            visualizerXAxisField: '',
            visualizerYAxisField: '',
            visualizerYAxisField2: '',
            visualizerYAxisOperator: 'none'
          })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500 transition-colors"
        >
          <option value="">Select an app in this workspace...</option>
          {availableApps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
      </div>

      {field.settings.visualizerSourceAppId && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* X-Axis Config */}
          <div className="p-3 bg-black/20 rounded-lg border border-slate-700/50 space-y-3">
            <p className="text-xs font-mono text-fuchsia-400 mb-2 border-b border-fuchsia-500/20 pb-1">X-Axis (Categories)</p>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Data Field</label>
              <select
                value={field.settings.visualizerXAxisField || ''}
                onChange={(e) => updateFieldSettings(field.id, { visualizerXAxisField: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                disabled={isLoading}
              >
                <option value="">Select field...</option>
                {sourceFields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Custom Label (Optional)</label>
              <input
                type="text"
                value={field.settings.visualizerXAxisLabel || ''}
                onChange={(e) => updateFieldSettings(field.id, { visualizerXAxisLabel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                placeholder="e.g., Sales Rep"
              />
            </div>
          </div>

          {/* Y-Axis Config */}
          <div className="p-3 bg-black/20 rounded-lg border border-slate-700/50 space-y-3">
            <p className="text-xs font-mono text-fuchsia-400 mb-2 border-b border-fuchsia-500/20 pb-1">Y-Axis (Values)</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Base Value Field</label>
                <select
                  value={field.settings.visualizerYAxisField || ''}
                  onChange={(e) => updateFieldSettings(field.id, { visualizerYAxisField: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                  disabled={isLoading}
                >
                  <option value="">Select numeric field...</option>
                  {numericFields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Calculation (Optional)</label>
                <select
                  value={field.settings.visualizerYAxisOperator || 'none'}
                  onChange={(e) => updateFieldSettings(field.id, { visualizerYAxisOperator: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                >
                  <option value="none">None (Raw Value)</option>
                  <option value="add">Add (+)</option>
                  <option value="subtract">Subtract (-)</option>
                  <option value="multiply">Multiply (×)</option>
                  <option value="divide">Divide (÷)</option>
                </select>
              </div>

              {field.settings.visualizerYAxisOperator && field.settings.visualizerYAxisOperator !== 'none' && (
                <div className="animate-in slide-in-from-top-1">
                  <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Secondary Field</label>
                  <select
                    value={field.settings.visualizerYAxisField2 || ''}
                    onChange={(e) => updateFieldSettings(field.id, { visualizerYAxisField2: e.target.value })}
                    className="w-full bg-slate-900 border border-fuchsia-500/50 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                    disabled={isLoading}
                  >
                    <option value="">Select numeric field...</option>
                    {numericFields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Custom Label (Optional)</label>
                <input
                  type="text"
                  value={field.settings.visualizerYAxisLabel || ''}
                  onChange={(e) => updateFieldSettings(field.id, { visualizerYAxisLabel: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                  placeholder="e.g., Net Revenue"
                />
              </div>
            </div>
          </div>
          
          {field.settings.visualizerChartType === 'dynamic' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-fuchsia-500/20">
               <div>
                 <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Start Number</label>
                 <input
                   type="number"
                   value={field.settings.dynamicSimMin ?? 0}
                   onChange={(e) => updateFieldSettings(field.id, { dynamicSimMin: Number(e.target.value) })}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                 />
               </div>
               <div>
                 <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Stop Number</label>
                 <input
                   type="number"
                   value={field.settings.dynamicSimMax ?? 100}
                   onChange={(e) => updateFieldSettings(field.id, { dynamicSimMax: Number(e.target.value) })}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                 />
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MiniAppBuilder: React.FC<MiniAppBuilderProps> = ({ isOpen, onClose, onSave, workspaceId, wsColor: wsColorProp, existingApp, initialTab = 'template' }) => {
  const { organization, isPlatformOwner, isPlatformTechAdmin, isOrganizationAdmin, user } = useAuth();
  const { getColor } = useWorkspaceColor();
  const ac = wsColorProp || (workspaceId ? getColor(workspaceId) : null) || { primary: '#00ffff', rgb: '0,255,255', dark: '#083344', tw: 'cyan', colorName: 'cyan' };
  const isPlatAdmin = isPlatformOwner() || isPlatformTechAdmin();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [appName, setAppName] = useState(existingApp?.name || '');
  const [appDescription, setAppDescription] = useState(existingApp?.description || '');
  const [appIcon, setAppIcon] = useState(existingApp?.icon || 'grid');
  const [fields, setFields] = useState<BuildingBlock[]>(existingApp?.fields || []);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const [draggedBlock, setDraggedBlock] = useState<BuildingBlockType | null>(null);
  const [rearrangingFieldId, setRearrangingFieldId] = useState<string | null>(null);

  // ⚡ FIX: Track the true DB ID securely so we bypass parent lookup errors
  const [internalAppId, setInternalAppId] = useState<string | null>(existingApp?.id || null);

  const [activeTabEditor, setActiveTabEditor] = useState<{ blockId: string; tabId: string; tabLabel: string } | null>(null);
  
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    type: 'category' | 'tab';
    fieldId: string;
    itemId: string;
    currentColor: string;
  } | null>(null);

  const activeFields = useMemo(() => {
    if (!activeTabEditor) return fields;
    const block = fields.find(f => f.id === activeTabEditor.blockId);
    const tab = block?.settings.tabOptions?.find(t => t.id === activeTabEditor.tabId);
    return tab?.fields || [];
  }, [fields, activeTabEditor]);

  const setContextFields = useCallback((updater: React.SetStateAction<BuildingBlock[]>) => {
    setFields(prevFields => {
      if (!activeTabEditor) return typeof updater === 'function' ? updater(prevFields) : updater;
      
      return prevFields.map(block => {
        if (block.id === activeTabEditor.blockId && block.type === 'tabs') {
          const newSettings = { ...block.settings };
          newSettings.tabOptions = newSettings.tabOptions?.map(tab => {
            if (tab.id === activeTabEditor.tabId) {
              const prevTabFields = tab.fields || [];
              const newTabFields = typeof updater === 'function' ? updater(prevTabFields) : updater;
              return { ...tab, fields: newTabFields as BuildingBlock[] };
            }
            return tab;
          });
          return { ...block, settings: newSettings };
        }
        return block;
      });
    });
  }, [activeTabEditor]);

  const [dropPreview, setDropPreview] = useState<{ targetId: string, position: 'before' | 'after' | 'end' } | null>(null);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [resizingSpan, setResizingSpan] = useState<number | null>(null);
  const [resizingRowFieldId, setResizingRowFieldId] = useState<string | null>(null);
  const [resizingRowSpan, setResizingRowSpan] = useState<number | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);
  const [allMiniApps, setAllMiniApps] = useState<MiniApp[]>([]);
  const [allWorkspaces, setAllWorkspaces] = useState<{id: string, name: string}[]>([]);
  const [miniAppSearchQuery, setMiniAppSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveScope, setSaveScope] = useState<'local' | 'global'>('local');
  
  const [mainTab, setMainTab] = useState<'template' | 'workflows' | 'pdfs' | 'labels' | 'settings'>(initialTab);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true); // <-- ADD THIS HERE

  const [selectedLayouts, setSelectedLayouts] = useState<LayoutType[]>(existingApp?.layouts || ['table', 'card']);
  const [configLayout, setConfigLayout] = useState<LayoutType | null>(null);
  const [cardConfigTab, setCardConfigTab] = useState<'standard' | 'connection'>('standard');
  const [selectedConnectionAppId, setSelectedConnectionAppId] = useState<string>('');
  const [miniAppSettingsTab, setMiniAppSettingsTab] = useState<'general' | 'advanced' | 'version'>('general');
  const [isFieldSettingsExpanded, setIsFieldSettingsExpanded] = useState(true);
  const [isBuildingBlocksExpanded, setIsBuildingBlocksExpanded] = useState(true);

  const [itemIdSettings, setItemIdSettings] = useState<ItemIdSettings>(DEFAULT_ITEM_ID_SETTINGS);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showGlobalConfirm, setShowGlobalConfirm] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(true);
  const [isPresetBuilder, setIsPresetBuilder] = useState(existingApp?.is_preset || false); // ⚡ NEW STATE

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ⚡ STAGE 4: Schema Distribution State
  const [appSlug, setAppSlug] = useState<string>(existingApp?.slug || '');
  const [showUpdateDistributionModal, setShowUpdateDistributionModal] = useState(false);
  const [existingOrgsWithApp, setExistingOrgsWithApp] = useState<{id: string, name: string}[]>([]);
  const [selectedOrgsForUpdate, setSelectedOrgsForUpdate] = useState<string[]>([]);
  const [isPushingUpdates, setIsPushingUpdates] = useState(false);
  const [distributePayload, setDistributePayload] = useState<any>(null);
  const [pushName, setPushName] = useState(false);
  const [pushIcon, setPushIcon] = useState(false);

  const ToggleSwitch = ({ value, onChange, label, description, color = ac.primary }: any) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div onClick={() => onChange(!value)}
        className="w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 mt-0.5"
        style={{ backgroundColor: value ? color : '#475569' }}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <div>
        <span className="text-sm text-white font-mono block">{label}</span>
        <span className="text-xs text-slate-500 font-mono">{description}</span>
      </div>
    </label>
  );

  useEffect(() => {
    if (saveError) {
      const t = setTimeout(() => setSaveError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [saveError]);

  useEffect(() => {
    if (saveSuccess) {
      const t = setTimeout(() => setSaveSuccess(false), 4000);
      return () => clearTimeout(t);
    }
  }, [saveSuccess]);

  const prevWorkspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    if (workspaceId && prevWorkspaceIdRef.current && workspaceId !== prevWorkspaceIdRef.current && !existingApp) {
      setAppName('');
      setAppDescription('');
      setAppIcon('grid');
      setFields([]);
      setSelectedField(null);
      setSelectedFieldIds(new Set());
      setSelectedLayouts(['table', 'card']);
      setItemIdSettings(DEFAULT_ITEM_ID_SETTINGS);
      setAppSettings(DEFAULT_APP_SETTINGS);
      setShowInitialSetup(true);
      setShowAIAssistant(false);
      setSaveError(null);
      setSaveSuccess(false);
    }
    prevWorkspaceIdRef.current = workspaceId;
  }, [workspaceId, existingApp]);

  interface FieldMigrationAction {
    fieldId: string;
    fieldName: string;
    fieldType: string;
    action: 'delete_field_and_data' | 'delete_field_preserve_data' | 'pending';
    recordsAffected: number;
  }
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationActions, setMigrationActions] = useState<FieldMigrationAction[]>([]);
  const [pendingRemoveFieldId, setPendingRemoveFieldId] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationRecordCount, setMigrationRecordCount] = useState(0);

  const fieldCount = fields.length;
  const isNearFieldLimit = fieldCount >= MAX_FIELDS_PER_MINIAPP - 10;
  const isAtFieldLimit = fieldCount >= MAX_FIELDS_PER_MINIAPP;

  // ⚡ FIX: Rely on the verified internal ID
  const isEditMode = !!internalAppId;
  const isPresetApp = existingApp?.is_preset || false;
  
  const canEditFields = useMemo(() => {
    if (isPlatAdmin) return true;
    if (isOrganizationAdmin()) return true; // ⚡ ALLOW ORG ADMINS TO EDIT (We will fork on save)
    return false;
  }, [isPlatAdmin, isOrganizationAdmin]);

  useEffect(() => {
    if (isOpen) {
      setMainTab(initialTab);
      setIsFieldSettingsExpanded(true);
      setIsBuildingBlocksExpanded(true);

      const initializeBuilder = async () => {
        let targetApp = existingApp;

        // ⚡ EXACT ID FETCH: Stop guessing by name. If the parent passed an ID, fetch that exact row.
        if (existingApp?.id) {
          let targetFetchId = existingApp.id;

          // ⚡ CLONE OVERRIDE: If the parent component passed the Preset ID, 
          // but a local clone exists for this organization, force the Builder to load the clone!
          if (organization?.id) {
            const { data: cloneCheck } = await supabase.schema('app_private')
              .from('mini_apps')
              .select('id')
              .ilike('name', existingApp.name || '')
              .eq('organization_id', organization.id)
              .eq('workspace_id', workspaceId)
              .eq('is_preset', false)
              .limit(1);
              
            if (cloneCheck && cloneCheck.length > 0) {
              targetFetchId = cloneCheck[0].id;
            }
          }

          const { data } = await supabase.schema('app_private')
            .from('mini_apps')
            .select('*')
            .eq('id', targetFetchId)
            .single();
          
          if (data) {
            targetApp = {
              id: data.id,
              slug: data.slug,
              name: data.name,
              description: data.description,
              icon: data.icon,
              fields: (() => {
                const schema = typeof data.schema_definition === 'string' ? JSON.parse(data.schema_definition) : (data.schema_definition || {});
                if (schema.base_fields || schema.custom_fields) {
                  const base = (schema.base_fields || []).map((f: any) => ({ ...f, is_base: true }));
                  const custom = (schema.custom_fields || []).map((f: any) => ({ ...f, is_base: false }));
                  return [...base, ...custom];
                }
                return schema.fields || [];
              })(),
              layouts: typeof data.app_settings === 'string' ? JSON.parse(data.app_settings).layouts : data.app_settings?.layouts,
              itemIdSettings: typeof data.item_id_settings === 'string' ? JSON.parse(data.item_id_settings) : data.item_id_settings,
              appSettings: typeof data.app_settings === 'string' ? JSON.parse(data.app_settings) : data.app_settings,
              is_preset: data.is_preset,
              created_by: data.created_by,
            };
          }
        }

        if (targetApp) {
          setInternalAppId(targetApp.id || null);
          setAppSlug((targetApp as any).slug || '');
          setAppName(targetApp.name || '');
          setAppDescription(targetApp.description || '');
          setAppIcon(targetApp.icon || 'grid');
          
          const rawFields = targetApp.fields || (targetApp as any).schema_definition?.fields || [];
          const sequentialFields = [...rawFields].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

          let currentRowId = 0;
          let currentRowWidth = 0;

          const reconstructedFields = sequentialFields.map((f: any) => {
            if (f.row !== undefined) {
              currentRowId = Math.max(currentRowId, f.row);
              currentRowWidth = 0; 
              return { ...f, colSpan: f.colSpan || (f.columnSpan === 2 ? 60 : 30) };
            }

            const legacySpan = f.columnSpan || (f.type === 'split_separator' ? 2 : 1);
            if (currentRowWidth + legacySpan > 2 || f.type === 'split_separator') {
              if (currentRowWidth > 0) currentRowId++;
              currentRowWidth = legacySpan;
            } else {
              currentRowWidth += legacySpan;
            }
            return { ...f, row: currentRowId, colSpan: legacySpan === 2 ? 60 : 30 };
          });

          setFields(reconstructedFields);
          setSelectedLayouts(targetApp.layouts || ['table', 'card']);

          let loadedIdSettings = false;
          const incomingIdSettings = targetApp.itemIdSettings || (targetApp as any).item_id_settings;
          if (incomingIdSettings) {
            const parsedIdSettings = typeof incomingIdSettings === 'string' ? JSON.parse(incomingIdSettings) : incomingIdSettings;
            setItemIdSettings({ ...DEFAULT_ITEM_ID_SETTINGS, ...parsedIdSettings });
            loadedIdSettings = true;
          } else {
            setItemIdSettings(DEFAULT_ITEM_ID_SETTINGS);
          }

          let loadedAppSettings = false;
          const incomingAppSettings = targetApp.appSettings || (targetApp as any).app_settings;
          let parsedAppSettings = typeof incomingAppSettings === 'string' ? JSON.parse(incomingAppSettings) : (incomingAppSettings || {});
          
          // ⚡ Fetch mapped workflows from the new table
          const { data: wfData } = await supabase.schema('app_private')
            .from('mini_app_workflows')
            .select('*')
            .eq('mini_app_id', targetApp.id);
            
          if (wfData && wfData.length > 0) {
            parsedAppSettings.workflows = wfData.map((w: any) => ({
              id: w.id,
              name: w.name,
              isActive: w.is_active,
              trigger: w.trigger_event,
              steps: typeof w.steps === 'string' ? JSON.parse(w.steps) : (w.steps || [])
            }));
          }

          setAppSettings({ ...DEFAULT_APP_SETTINGS, ...parsedAppSettings });
          if (parsedAppSettings.layouts && Array.isArray(parsedAppSettings.layouts)) {
            setSelectedLayouts(parsedAppSettings.layouts as LayoutType[]);
          }
          loadedAppSettings = true;

        } else {
          setInternalAppId(null);
          setAppName('');
          setAppDescription('');
          setAppIcon('grid');
          setFields([]);
          setSelectedLayouts(['table', 'card']);
          setItemIdSettings(DEFAULT_ITEM_ID_SETTINGS);
          setAppSettings(DEFAULT_APP_SETTINGS);
          setSelectedField(null);
        }
      };
      
      initializeBuilder();
    }
  }, [isOpen, existingApp, initialTab, workspaceId]);

  const hasDateField = fields.some(f => f.type === 'date_field');

  useEffect(() => {
    if (isOpen && organization) {
      fetchOrganizationUsers();
      fetchAllMiniApps();
      fetchAllWorkspaces();
    }
  }, [isOpen, organization]);

  const fetchAllWorkspaces = async () => {
    if (!organization) return;
    const { data } = await supabase.schema('app_private').from('workspaces').select('id, name').eq('organization_id', organization.id);
    if (data) setAllWorkspaces(data);
  };

  const fetchOrganizationUsers = async () => {
    if (!organization) return;
    try {
      const { data } = await db
        .from('organization_users')
        .select('*')
        .eq('organization_id', organization.id);
      if (data) setOrganizationUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllMiniApps = async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase
        .schema('app_private')
        .from('mini_apps')
        // ⚡ FIX: Added workspaces(name) so we can group the dropdown accurately!
        .select('id, name, slug, schema_definition, workspace_id, is_preset, workspaces(name)')
        .or(`organization_id.eq.${organization.id},is_preset.eq.true`);

      if (error) throw error;
      
      if (data) setAllMiniApps(data);
    } catch (error) {
      console.error('[MiniAppBuilder] Error fetching mini apps for validation:', error);
    }
  };

  function getDefaultSettings(type: BuildingBlockType): FieldSettings {
    switch (type) {
      case 'text_field': return { multiline: false };
      case 'phone_number_field':
      case 'email_address_field':
      case 'image_field':
      case 'hyperlink_field': return { allowMultiple: false };
      case 'number_field': return { decimals: 2, isDynamicSimulation: false, dynamicSimMin: 0, dynamicSimMax: 100 };
      case 'duration_field': return { durationUnits: { hours: true, minutes: true, seconds: true } };
      case 'calculation_field': return { calculationPrompt: '', displaySize: 'medium' };
      case 'category_field': return { categoryOptions: [] };
      case 'connection_field': return { connectedMiniAppIds: [], allowMultipleConnections: true };
      case 'submenu': return { subMenuBlocks: [], subMenuColumns: 2 };
      case 'integration_field': return { 
        integrationId: '', 
        integrationType: 'software',
        integrationPaymentCurrency: 'USD',
        integrationCameraViewMode: 'live',
        integrationAccessAction: 'momentary_unlock'
      };
      case 'split_separator': return { separatorColor: '#64748b', separatorStyle: 'solid', marginTop: 16, marginBottom: 16 };
      case 'visualizer_field': return { visualizerChartType: 'bar', visualizerDefaultMode: '2D', visualizerYAxisOperator: 'none', dynamicSimMin: 0, dynamicSimMax: 100 };
      case 'tabs': return { tabOptions: [{ id: 'tab_1', label: 'Tab 1' }, { id: 'tab_2', label: 'Tab 2' }] };
      default: return {};
    }
  }

  const handleDragStart = (type: BuildingBlockType) => {
    setDraggedBlock(type);
  };

  const handleDragEnd = () => {
    setDraggedBlock(null);
    setRearrangingFieldId(null);
    setDropPreview(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); 

    e.dataTransfer.dropEffect = 'move';

    if (id === 'ghost_preview_id') return;

    if (id === 'end') {
      setDropPreview(prev => (prev?.targetId === 'end' ? prev : { targetId: 'end', position: 'end' }));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let position: 'before' | 'after' | 'above' | 'below' = 'after';
    const verticalThreshold = rect.height * 0.25;

    if (y < verticalThreshold) position = 'above';
    else if (y > rect.height - verticalThreshold) position = 'below';
    else if (x < rect.width / 2) position = 'before';
    else position = 'after';

    setDropPreview(prev => {
      if (prev?.targetId === id && prev?.position === position) return prev;
      return { targetId: id, position };
    });
  };

  function calculateNewLayout(
    previewTargetId: string | null, 
    position: 'before' | 'after' | 'above' | 'below' | 'end', 
    isPreview: boolean,
    newFieldId?: string,
    currentContext: BuildingBlock[] = activeFields 
  ) {
    if (!previewTargetId) return currentContext;
    const isNewBlock = !!draggedBlock;
    const isExistingBlock = !!rearrangingFieldId;

    if (!isNewBlock && !isExistingBlock) return fields;

    let movingField: any;
    let fieldsWithoutMoving = [...currentContext];

    if (isNewBlock) {
      movingField = {
        id: newFieldId || 'ghost_preview_id',
        name: isPreview ? (draggedBlock === 'split_separator' ? 'Separator' : 'Drop Here') : '',
        type: draggedBlock!,
        required: false,
        colSpan: 60, 
        rowSpan: draggedBlock === 'tabs' ? 4 : 1,
        settings: getDefaultSettings(draggedBlock!),
        _isGhost: isPreview
      };
    } else {
      const movingIndex = currentContext.findIndex(f => f.id === rearrangingFieldId);
      if (movingIndex === -1) return currentContext;
      movingField = { ...currentContext[movingIndex], _isGhost: isPreview };
      fieldsWithoutMoving.splice(movingIndex, 1);
    }

    if (previewTargetId === rearrangingFieldId) {
      if (isPreview) return currentContext.map(f => f.id === rearrangingFieldId ? { ...f, _isGhost: true } : f);
      return currentContext;
    }

    const rowsMap = new Map<number, any[]>();
    fieldsWithoutMoving.forEach((f, idx) => {
      const r = f.row !== undefined ? f.row : idx; 
      if (!rowsMap.has(r)) rowsMap.set(r, []);
      rowsMap.get(r)!.push({...f});
    });

    const rows = Array.from(rowsMap.keys()).sort((a,b)=>a-b).map(k => rowsMap.get(k)!);

    let targetRowIndex = -1;
    let targetColIndex = -1;

    if (previewTargetId !== 'end') {
      for (let r = 0; r < rows.length; r++) {
        const idx = rows[r].findIndex(f => f.id === previewTargetId);
        if (idx !== -1) {
          targetRowIndex = r;
          targetColIndex = idx;
          break;
        }
      }
    }

    if (previewTargetId === 'end' || targetRowIndex === -1) {
      movingField.colSpan = 60;
      rows.push([movingField]);
    } else {
      const targetRow = rows[targetRowIndex];
      const isTargetSplit = targetRow.length === 1 && targetRow[0].type === 'split_separator';
      const isMovingSplit = movingField.type === 'split_separator';

      if (position === 'above') {
        movingField.colSpan = 60;
        rows.splice(targetRowIndex, 0, [movingField]);
      } else if (position === 'below') {
        movingField.colSpan = 60;
        rows.splice(targetRowIndex + 1, 0, [movingField]);
      } else {
        if (isTargetSplit || isMovingSplit) {
          movingField.colSpan = 60;
          if (position === 'before') rows.splice(targetRowIndex, 0, [movingField]);
          else rows.splice(targetRowIndex + 1, 0, [movingField]);
        } else {
          const currentSpanSum = targetRow.reduce((sum, f) => sum + (f.colSpan || 60), 0);

          if (currentSpanSum < 60) {
            movingField.colSpan = 60 - currentSpanSum;
            const insertIndex = position === 'before' ? targetColIndex : targetColIndex + 1;
            targetRow.splice(insertIndex, 0, movingField);
          } else {
            if (targetRow.length >= 6) {
              movingField.colSpan = 60;
              if (position === 'before') {
                rows.splice(targetRowIndex, 0, [movingField]);
              } else {
                rows.splice(targetRowIndex + 1, 0, [movingField]);
              }
            } else {
              const insertIndex = position === 'before' ? targetColIndex : targetColIndex + 1;
              targetRow.splice(insertIndex, 0, movingField);
              
              const newSpan = Math.floor(60 / targetRow.length);
              targetRow.forEach(f => {
                f.colSpan = newSpan;
              });
            }
          }
        }
      }
    }

    let finalFields: any[] = [];
    rows.forEach((rowArr, rIdx) => {
      rowArr.forEach((f) => {
        f.row = rIdx; 
        finalFields.push(f);
      });
    });

    return finalFields;
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dropPreview) {
      handleDragEnd();
      return;
    }

    const newId = `field_${Date.now()}`;
    const newFields = calculateNewLayout(dropPreview.targetId, dropPreview.position, false, newId, activeFields);
    
    const cleanedFields = newFields.map(f => { const { _isGhost, ...rest } = f; return rest; });
    setContextFields(cleanedFields as BuildingBlock[]);
    
    if (draggedBlock) setSelectedField(newId);
    handleDragEnd();
  };

  const displayFields = useMemo(() => {
    if (!dropPreview && !rearrangingFieldId) return activeFields; 
    if (!dropPreview && rearrangingFieldId) {
       return activeFields.map(f => f.id === rearrangingFieldId ? { ...f, _isGhost: true } : f);
    }
    return calculateNewLayout(dropPreview!.targetId, dropPreview!.position, true, undefined, activeFields);
  }, [activeFields, dropPreview, draggedBlock, rearrangingFieldId]);

  const handleFieldResizeStart = (e: React.MouseEvent, id: string, currentSpan: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingFieldId(id);
    setResizingSpan(currentSpan);
    
    const startX = e.clientX;
    const containerWidth = gridRef.current?.clientWidth || 800;
    const colWidth = containerWidth / 6;

    const currentSixths = Math.round(currentSpan / 10);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaCols = Math.round(deltaX / colWidth);
      let newSixths = currentSixths + deltaCols;
      newSixths = Math.max(1, Math.min(6, newSixths));
      setResizingSpan(newSixths * 10);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      const deltaX = upEvent.clientX - startX;
      const deltaCols = Math.round(deltaX / colWidth);
      let newSixths = currentSixths + deltaCols;
      newSixths = Math.max(1, Math.min(6, newSixths));
      
      setContextFields(prev => prev.map(f => f.id === id ? { ...f, colSpan: newSixths * 10 } : f));
      setResizingFieldId(null);
      setResizingSpan(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleFieldRowResizeStart = (e: React.MouseEvent, id: string, currentSpan: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRowFieldId(id);
    setResizingRowSpan(currentSpan);
    
    const startY = e.clientY;
    const rowHeight = 82; 

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaRows = Math.round(deltaY / rowHeight);
      let newSpan = currentSpan + deltaRows;
      newSpan = Math.max(1, Math.min(20, newSpan));
      setResizingRowSpan(newSpan);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      const deltaY = upEvent.clientY - startY;
      const deltaRows = Math.round(deltaY / rowHeight);
      let newSpan = currentSpan + deltaRows;
      newSpan = Math.max(1, Math.min(20, newSpan));
      
      setContextFields(prev => prev.map(f => f.id === id ? { ...f, rowSpan: newSpan } : f));
      setResizingRowFieldId(null);
      setResizingRowSpan(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const updateField = (id: string, updates: Partial<BuildingBlock>) => {
    setContextFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const updateFieldSettings = (id: string, settings: Partial<FieldSettings>) => {
    setContextFields(prev => prev.map(f => f.id === id ? { ...f, settings: { ...f.settings, ...settings } } : f));
  };

  const removeField = async (id: string) => {
    const field = activeFields.find(f => f.id === id);
    if (!field) return;

    if (isEditMode && existingApp?.id && field.name) {
      try {
        const { data: records, error } = await db
          .from('mini_app_records')
          .select('id, data')
          .eq('mini_app_id', existingApp.id);

        if (!error && records && records.length > 0) {
          const recordsWithData = records.filter((r: any) => {
            const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
            const val = data?.[field.id] || data?.[field.name];
            return val !== undefined && val !== null && val !== '';
          });

          if (recordsWithData.length > 0) {
            setPendingRemoveFieldId(id);
            setMigrationRecordCount(recordsWithData.length);
            setMigrationActions([{
              fieldId: field.id,
              fieldName: field.name || 'Unnamed Field',
              fieldType: field.type,
              action: 'pending',
              recordsAffected: recordsWithData.length,
            }]);
            setShowMigrationDialog(true);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking field data:', err);
      }
    }

    setContextFields(prev => prev.filter(f => f.id !== id));
    if (selectedField === id) setSelectedField(null);
  };

  const executeMigration = async (action: 'delete_field_and_data' | 'delete_field_preserve_data') => {
    if (!pendingRemoveFieldId || !existingApp?.id) return;
    setIsMigrating(true);

    const field = fields.find(f => f.id === pendingRemoveFieldId);
    if (!field) { setIsMigrating(false); return; }

    try {
      if (action === 'delete_field_preserve_data') {
        const { data: records } = await db
          .from('mini_app_records')
          .select('id, data')
          .eq('mini_app_id', existingApp.id);

        if (records) {
          for (const record of records) {
            const data = typeof record.data === 'string' ? JSON.parse(record.data) : { ...record.data };
            const fieldValue = data[field.id] || data[field.name];

            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
              const removedFields = data._removed_fields || {};
              removedFields[field.id] = {
                fieldName: field.name,
                fieldType: field.type,
                value: fieldValue,
                removedAt: new Date().toISOString(),
                preserveData: true, 
              };
              data._removed_fields = removedFields;

              await db
                .from('mini_app_records')
                .update({ data })
                .eq('id', record.id);
            }
          }
        }
      } else if (action === 'delete_field_and_data') {
        const { data: records } = await db
          .from('mini_app_records')
          .select('id, data')
          .eq('mini_app_id', existingApp.id);

        if (records) {
          for (const record of records) {
            const data = typeof record.data === 'string' ? JSON.parse(record.data) : { ...record.data };
            delete data[field.id];
            delete data[field.name];

            await db
              .from('mini_app_records')
              .update({ data })
              .eq('id', record.id);
          }
        }
      }

      setFields(prev => prev.filter(f => f.id !== pendingRemoveFieldId));
      if (selectedField === pendingRemoveFieldId) setSelectedField(null);
    } catch (err) {
      console.error('Error executing field migration:', err);
    } finally {
      setIsMigrating(false);
      setShowMigrationDialog(false);
      setPendingRemoveFieldId(null);
      setMigrationActions([]);
    }
  };

  const addCategoryOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    const newOption: CategoryOption = {
      id: `opt_${Date.now()}`,
      label: '',
      color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]
    };
    
    updateFieldSettings(fieldId, {
      categoryOptions: [...(field.settings.categoryOptions || []), newOption]
    });
  };

  const updateCategoryOption = (fieldId: string, optionId: string, updates: Partial<CategoryOption>) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    updateFieldSettings(fieldId, {
      categoryOptions: field.settings.categoryOptions?.map(opt => 
        opt.id === optionId ? { ...opt, ...updates } : opt
      )
    });
  };

  const removeCategoryOption = (fieldId: string, optionId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    updateFieldSettings(fieldId, {
      categoryOptions: field.settings.categoryOptions?.filter(opt => opt.id !== optionId)
    });
  };

  const addTabOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const currentTabs = field.settings.tabOptions || [];
    const newOption = {
      id: `tab_${Date.now()}`,
      label: `Tab ${currentTabs.length + 1}`,
      color: ac.primary // Default to workspace primary color
    };
    updateFieldSettings(fieldId, { tabOptions: [...currentTabs, newOption] });
  };

  const updateTabOption = (fieldId: string, tabId: string, updates: Partial<{label: string, color: string}>) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    updateFieldSettings(fieldId, {
      tabOptions: field.settings.tabOptions?.map(opt => 
        opt.id === tabId ? { ...opt, ...updates } : opt
      )
    });
  };

  const removeTabOption = (fieldId: string, tabId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    updateFieldSettings(fieldId, {
      tabOptions: field.settings.tabOptions?.filter(opt => opt.id !== tabId)
    });
  };

  const toggleConnectedMiniApp = (fieldId: string, miniAppId: string) => {
    // ⚡ FIX: Search within `activeFields` instead of top-level `fields`
    // This ensures the connection toggle works even if the field is nested inside a Tab!
    const field = activeFields.find(f => f.id === fieldId);
    if (!field) return;
    
    const currentConnections = field.settings.connectedMiniAppIds || [];
    const isConnected = currentConnections.includes(miniAppId);
    
    updateFieldSettings(fieldId, {
      connectedMiniAppIds: isConnected
        ? currentConnections.filter(id => id !== miniAppId)
        : [...currentConnections, miniAppId]
    });
  };

  const toggleLayout = (layout: LayoutType) => {
    if (layout === 'calendar' && !hasDateField) return;
    
    setSelectedLayouts(prev => 
      prev.includes(layout) 
        ? prev.filter(l => l !== layout)
        : [...prev, layout]
    );
  };

  const isNameConflict = useMemo(() => {
    const normalizedInput = appName.trim().toLowerCase();
    if (!normalizedInput) return false;
    
    if (existingApp?.name && normalizedInput === existingApp.name.trim().toLowerCase()) {
      return false; 
    }
    
    return allMiniApps.some(app => 
      app.name.trim().toLowerCase() === normalizedInput &&
      app.id !== internalAppId && // ⚡ USE TRUE DB ID
      (app as any).workspace_id === workspaceId // ⚡ Scope conflict checking to the current workspace
    );
  }, [appName, allMiniApps, internalAppId, existingApp?.name, workspaceId]);

  const handleSave = async () => {
    if (!appName.trim()) { setSaveError('Please enter an app name'); return; }
    if (fields.length === 0) { setSaveError('Please add at least one field'); return; }
    if (!canEditFields) { setSaveError('You do not have permission to edit this MiniApp.'); return; }

    const invalidFields = fields.filter(f => !f.name.trim() && f.type !== 'split_separator');
    if (invalidFields.length > 0) { setSaveError('Please name all fields before saving'); return; }

    const connectionFields = fields.filter(f => f.type === 'connection_field');
    const invalidConnections = connectionFields.filter(f => 
      !f.settings.connectedMiniAppIds || f.settings.connectedMiniAppIds.length === 0
    );
    if (invalidConnections.length > 0) { setSaveError('Please select at least one MiniApp to connect for all Connection fields'); return; }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const normalizedFields: any[] = [];
      const rowMap = new Map<number, any[]>();
      
      fields.forEach(f => {
          const r = f.row !== undefined ? f.row : 0;
          if (!rowMap.has(r)) rowMap.set(r, []);
          rowMap.get(r)!.push(f);
      });

      const rows = Array.from(rowMap.keys()).sort((a,b) => a-b).map(k => rowMap.get(k)!);
      let orderIdx = 0;

      rows.forEach((rowFields, rIdx) => {
          let currentLegacyCol = 1;
          rowFields.forEach(f => {
              const span60 = f.colSpan > 6 ? f.colSpan : (f.colSpan ? f.colSpan * 10 : (f.type === 'split_separator' ? 60 : 30));
              const legacySpan = span60 >= 60 ? 2 : 1;
              
              normalizedFields.push({
                  ...f,
                  order: orderIdx++,
                  row: rIdx,
                  colSpan: span60,
                  columnSpan: legacySpan,
                  column: currentLegacyCol,
                  rowSpan: f.rowSpan || (f.type === 'tabs' ? 4 : 1) 
              });
              
              currentLegacyCol += legacySpan;
              if (currentLegacyCol > 2) currentLegacyCol = 1; 
          });
      });

      const appSettingsToSave: any = { ...appSettings, layouts: selectedLayouts };
      
      // Preserve base/custom field markers for the UI logic
      const baseFields = normalizedFields.filter(f => f.is_base).map(({ is_base, _isGhost, ...rest }) => rest);
      const customFields = normalizedFields.filter(f => !f.is_base).map(({ is_base, _isGhost, ...rest }) => rest);

      const schemaDefinition = {
        name: appName,
        description: appDescription,
        icon: appIcon,
        base_fields: baseFields,
        custom_fields: customFields,
        fields: normalizedFields, // Keep legacy flat array for backward compatibility
        version: 1,
        createdAt: internalAppId ? internalAppId : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let finalAppId = internalAppId;

      if (finalAppId) {
        // ⚡ UPDATE EXISTING APP
        const { error: updateError } = await supabase.schema('app_private').from('mini_apps')
          .update({
            name: appName,
            description: appDescription,
            icon: appIcon,
            schema_definition: schemaDefinition,
            app_settings: appSettingsToSave,
            item_id_settings: itemIdSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', finalAppId);

        if (updateError) throw updateError;
      } else {
        // ⚡ INSERT NEW APP (If built from scratch)
        if (!workspaceId) throw new Error("Missing Workspace ID context.");
        
        const { data, error: insertError } = await supabase.schema('app_private').from('mini_apps')
          .insert({
            workspace_id: workspaceId,
            organization_id: organization?.id,
            name: appName,
            slug: `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
            description: appDescription,
            icon: appIcon,
            schema_definition: schemaDefinition,
            app_settings: appSettingsToSave,
            item_id_settings: itemIdSettings,
            is_preset: isPresetBuilder, // ⚡ Use explicit UI toggle!
            created_by: user?.id || null,
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        finalAppId = data.id;
        setInternalAppId(data.id);
      }

      const fullSchema = {
        ...schemaDefinition,
        appSettings: appSettingsToSave,
        itemIdSettings: itemIdSettings,
      };

      // ⚡ TAB SYNC FIX: Guarantee the app name is appended to the workspace Tab Order!
      if (workspaceId && finalAppId) {
        try {
          const { data: wsData } = await supabase.schema('app_private')
            .from('workspaces')
            .select('settings')
            .eq('id', workspaceId)
            .single();

          if (wsData) {
            let wsSettings = typeof wsData.settings === 'string' ? JSON.parse(wsData.settings) : (wsData.settings || {});
            let tabOrder: string[] = wsSettings.tab_order || [];

            // Remove old name if it was renamed
            if (existingApp?.name && existingApp.name !== appName) {
              tabOrder = tabOrder.filter(name => name !== existingApp.name);
            }

            // Append new name if missing
            if (!tabOrder.includes(appName)) {
              tabOrder.push(appName);
              wsSettings.tab_order = tabOrder;

              await supabase.schema('app_private')
                .from('workspaces')
                .update({ settings: wsSettings })
                .eq('id', workspaceId);
            }
          }
        } catch (wsErr) {
          console.error("Error syncing workspace tab order:", wsErr);
        }
      }

      // ⚡ SAVE WORKFLOWS
      if (finalAppId && appSettingsToSave.workflows) {
        const workflowsPayload = appSettingsToSave.workflows.map((wf: any) => ({
          id: wf.id,
          mini_app_id: finalAppId,
          organization_id: organization?.id,
          name: wf.name,
          is_active: wf.isActive,
          trigger_event: wf.trigger,
          steps: wf.steps || []
        }));

        const currentIds = workflowsPayload.map((w: any) => w.id);
        
        // Remove deleted workflows
        if (currentIds.length > 0) {
          await supabase.schema('app_private')
            .from('mini_app_workflows')
            .delete()
            .eq('mini_app_id', finalAppId)
            .not('id', 'in', `(${currentIds.join(',')})`);
        } else {
          await supabase.schema('app_private')
            .from('mini_app_workflows')
            .delete()
            .eq('mini_app_id', finalAppId);
        }

        // Upsert active workflows
        if (workflowsPayload.length > 0) {
          const { error: wfErr } = await supabase.schema('app_private')
            .from('mini_app_workflows')
            .upsert(workflowsPayload);
          if (wfErr) console.error("Workflow Save Error:", wfErr);
        }
      }

      // Record Version History (Optimistic)
      try {
        const changeSummary = `Schema saved: ${fields.length} fields`;
        const { data: maxData } = await supabase.schema('app_private').from('mini_app_versions')
          .select('version_number').eq('mini_app_id', finalAppId).order('version_number', { ascending: false }).limit(1);
        const nextVersion = (maxData && maxData.length > 0) ? maxData[0].version_number + 1 : 1;

        await supabase.schema('app_private').from('mini_app_versions')
          .insert({
            mini_app_id: finalAppId,
            version_number: nextVersion,
            schema_definition: schemaDefinition,
            app_settings: appSettingsToSave,
            item_id_settings: itemIdSettings,
            changed_by: user?.id || null,
            change_summary: changeSummary
          });
      } catch (e) { console.warn('Version tracking skipped'); }

      // ⚡ INTERCEPT FOR PLATFORM OWNERS TO PUSH UPDATES
      if (saveScope === 'global' && isPlatformOwner() && internalAppId && appSlug) {
        const { data: orgData } = await supabase.rpc('get_all_organizations'); 
        // ⚡ Match clones by SLUG to ensure we hit them even if the tenant renamed them locally
        const { data: clonedApps } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('organization_id')
          .eq('slug', appSlug)
          .neq('organization_id', organization?.id);
          
        if (clonedApps && clonedApps.length > 0 && orgData) {
          const clonedOrgIds = Array.from(new Set(clonedApps.map(a => a.organization_id)));
          const availableOrgs = orgData.filter((o: any) => clonedOrgIds.includes(o.id));
          
          if (availableOrgs.length > 0) {
            setExistingOrgsWithApp(availableOrgs);
            setSelectedOrgsForUpdate(availableOrgs.map((o: any) => o.id)); // Default to all
            setDistributePayload({
              name: appName,
              description: appDescription,
              icon: appIcon,
              schema_definition: schemaDefinition,
              app_settings: appSettingsToSave,
              item_id_settings: itemIdSettings,
              normalizedFields,
              fullSchema,
              appSlug,
              originalName: existingApp?.name || appName
            });
            setShowUpdateDistributionModal(true);
            setIsSaving(false);
            return; // Pause save and wait for modal
          }
        }
      }

      setSaveSuccess(true);
      onSave(appName, normalizedFields, fullSchema);
      window.dispatchEvent(new CustomEvent('miniapp_schema_updated'));
      onClose();
      
    } catch (err: any) {
      console.error('[MiniAppBuilder] Error saving:', err);
      setSaveError(err?.message || 'An unexpected error occurred while saving');
    } finally {
      if (!showUpdateDistributionModal) setIsSaving(false);
    }
  };

  // ⚡ Push updates to selected organizations
  const handlePushUpdates = async () => {
    setIsPushingUpdates(true);
    try {
      if (selectedOrgsForUpdate.length > 0 && distributePayload) {
        
        const updatePayload: any = {
          schema_definition: distributePayload.schema_definition,
          app_settings: distributePayload.app_settings,
          item_id_settings: distributePayload.item_id_settings,
          updated_at: new Date().toISOString()
        };

        if (pushName) {
          updatePayload.name = distributePayload.name;
          updatePayload.description = distributePayload.description;
        }
        if (pushIcon) {
          updatePayload.icon = distributePayload.icon;
        }

        const { error } = await supabase.schema('app_private')
          .from('mini_apps')
          .update(updatePayload)
          .eq('slug', distributePayload.appSlug) // Ensure it pushes directly to the unique slug
          .in('organization_id', selectedOrgsForUpdate);
          
        if (error) throw error;

        // Sync tab_order if renaming
        if (pushName && distributePayload.name !== distributePayload.originalName) {
          const { data: orgWorkspaces } = await supabase.schema('app_private')
            .from('workspaces')
            .select('id, settings')
            .in('organization_id', selectedOrgsForUpdate);

          if (orgWorkspaces) {
            for (const ws of orgWorkspaces) {
              let wsSettings = typeof ws.settings === 'string' ? JSON.parse(ws.settings) : (ws.settings || {});
              let tabOrder: string[] = wsSettings.tab_order || [];
              
              const nameIndex = tabOrder.indexOf(distributePayload.originalName);
              if (nameIndex !== -1) {
                tabOrder[nameIndex] = distributePayload.name;
                wsSettings.tab_order = tabOrder;
                await supabase.schema('app_private').from('workspaces').update({ settings: wsSettings }).eq('id', ws.id);
              }
            }
          }
        }
      }
      
      setSaveSuccess(true);
      onSave(appName, distributePayload.normalizedFields, distributePayload.fullSchema);
      window.dispatchEvent(new CustomEvent('miniapp_schema_updated'));
      setShowUpdateDistributionModal(false);
      onClose();
    } catch (err: any) {
      console.error('Error pushing updates:', err);
      setSaveError(err.message || 'Failed to push updates to organizations');
    } finally {
      setIsPushingUpdates(false);
    }
  };

  const handleSkipPush = () => {
     setSaveSuccess(true);
     onSave(appName, distributePayload.normalizedFields, distributePayload.fullSchema);
     window.dispatchEvent(new CustomEvent('miniapp_schema_updated'));
     setShowUpdateDistributionModal(false);
     onClose();
  };

  // Use activeFields instead of top-level fields so nested tab fields populate settings
  const selectedFieldData = activeFields.find(f => f.id === selectedField);

  const filteredMiniApps = allMiniApps.filter(app => 
    app.name.toLowerCase().includes(miniAppSearchQuery.toLowerCase())
  );

  const isInsideSubmenu = (fieldId: string) => {
    return fields.some(f => 
      f.type === 'submenu' && 
      f.settings.subMenuBlocks?.some(sb => sb.id === fieldId)
    );
  };

  if (!isOpen) return null;

  if (showInitialSetup && !isEditMode) {
    return (
      <MiniAppInitialSetup
        isOpen={true}
        onClose={onClose}
        allMiniApps={allMiniApps}
        workspaceId={workspaceId}
        isAdmin={isPlatAdmin} // ⚡ Passing Admin status
        onContinue={(config: any) => { 
          setAppName(config.name);
          setAppDescription(config.description);
          
          if (config.itemName) {
            setAppSettings(prev => ({ ...prev, itemName: config.itemName }));
          }

          setItemIdSettings({
            ...DEFAULT_ITEM_ID_SETTINGS,
            ...config.itemIdSettings,
          });
          if (config.fields && config.fields.length > 0) {
            setFields(config.fields);
          }
          
          if (config.isPreset) {
            setIsPresetBuilder(true); // ⚡ Capture the preset flag
          }

          setShowInitialSetup(false);
        }}
        wsColor={ac}
      />
    );
  }


  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div 
        className="absolute bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300" 
        style={{ top: '68px', left: '16px', right: '16px', bottom: '100px', boxShadow: `0 0 60px rgba(${ac.rgb}, 0.08), 0 0 120px rgba(0,0,0,0.5)` }}
      >
        <div className="flex items-stretch justify-between border-b border-white/10 relative bg-black/40" style={{ background: `linear-gradient(to right, rgba(${ac.rgb}, 0.06), transparent, rgba(${ac.rgb}, 0.02))` }}>
          
          <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0" style={{ background: `rgba(${ac.rgb}, 0.15)`, border: `1px solid rgba(${ac.rgb}, 0.3)` }}>
              <BuildIcon size={24} style={{ color: ac.primary, filter: `drop-shadow(0 0 4px ${ac.primary})` }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white font-mono truncate">
                {isEditMode ? `Edit ${existingApp?.name || 'MiniApp'}` : 'MiniApp Builder'}
              </h2>
              <p className="text-xs text-slate-400 truncate">Configure fields, workflows, and settings</p>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center flex-[2]">
            <div className="flex items-stretch h-full">
              {(['template', 'workflows', 'pdfs', 'labels', 'settings'] as const).map((tab, index, array) => (
                <React.Fragment key={tab}>
                  <button
                    onClick={() => setMainTab(tab)}
                    className="px-8 py-4 font-mono text-sm font-medium transition-all relative uppercase tracking-wider group flex items-center gap-2.5"
                    style={{ color: mainTab === tab ? ac.primary : '#94a3b8' }}
                  >
                    {tab === 'template' && <BuildIcon size={16} className={mainTab === tab ? '' : 'opacity-60 group-hover:opacity-100 transition-opacity'} />}
                    {tab === 'workflows' && <WorkflowIcon size={16} className={mainTab === tab ? '' : 'opacity-60 group-hover:opacity-100 transition-opacity'} />}
                    {tab === 'pdfs' && <ColumnsIcon size={16} className={mainTab === tab ? '' : 'opacity-60 group-hover:opacity-100 transition-opacity'} />}
                    {tab === 'labels' && <TagIcon size={16} className={mainTab === tab ? '' : 'opacity-60 group-hover:opacity-100 transition-opacity'} />}
                    {tab === 'settings' && <SettingsIcon size={16} className={mainTab === tab ? '' : 'opacity-60 group-hover:opacity-100 transition-opacity'} />}
                    <span className={mainTab === tab ? '' : 'group-hover:text-slate-300 transition-colors'}>
                      {tab === 'template' ? 'Template' : tab === 'pdfs' ? 'PDFs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </span>
                    {mainTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: ac.primary, boxShadow: `0 -2px 10px rgba(${ac.rgb}, 0.5)` }} />
                    )}
                  </button>
                  
                  {index < array.length - 1 && (
                    <div className="w-px h-6 bg-white/10 self-center mx-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 flex-1">
            <button
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              title="AI Assistant"
              className="p-2.5 rounded-lg border transition-all duration-200 flex-shrink-0"
              style={showAIAssistant
                ? { background: `rgba(${ac.rgb}, 0.15)`, borderColor: `rgba(${ac.rgb}, 0.4)`, color: ac.primary }
                : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }
              }
              onMouseEnter={e => { if (!showAIAssistant) { e.currentTarget.style.borderColor = `rgba(${ac.rgb}, 0.3)`; e.currentTarget.style.color = ac.primary; }}}
              onMouseLeave={e => { if (!showAIAssistant) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}}
            >
              <WandSparkles size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 flex-shrink-0">
              <CloseIcon size={24} />
            </button>
          </div>
        </div>

        {(saveError || saveSuccess) && (
          <div className={`mx-4 mt-2 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-300 animate-in slide-in-from-top-2 ${
            saveError 
              ? 'bg-red-500/10 border-red-500/30 text-red-300' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center gap-3">
              {saveError ? (
                <AlertTriangleIcon size={18} className="text-red-400 flex-shrink-0" />
              ) : (
                <CheckCircleIcon size={18} className="text-emerald-400 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {saveError ? 'Save Failed' : 'Saved Successfully'}
                </p>
                {saveError && (
                  <p className="text-xs text-red-400/70 mt-0.5 max-w-lg truncate">{saveError}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setSaveError(null); setSaveSuccess(false); }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">

          {mainTab === 'template' && (
            <>
              <div className="relative flex h-full z-10">
                <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden bg-black/30 backdrop-blur-xl border-r border-white/10 flex-shrink-0 ${isBuildingBlocksExpanded ? 'w-64' : 'w-0 border-r-0'}`}>
                  <div className="w-64 h-full p-4 overflow-y-auto darkwave-scrollbar">
                    <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                      <GridIcon size={16} style={{ color: ac.primary }} />
                      <span style={{ color: ac.primary }}>Building Blocks</span>
                    </h3>
                <p className="text-xs text-slate-500 mb-4">Drag to add fields</p>
                <div className="space-y-2">
                  {BUILDING_BLOCKS.map((block) => {
                    const Icon = block.icon;
                    return (
                      <div
                        key={block.type}
                        draggable
                        onDragStart={() => handleDragStart(block.type)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing group"
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${ac.rgb}, 0.3)`; e.currentTarget.style.background = `rgba(${ac.rgb}, 0.05)`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      >
                        <span className={`w-8 h-8 rounded bg-white/[0.06] flex items-center justify-center transition-colors duration-200 ${block.color}`}>
                          <Icon size={18} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-white text-sm block truncate">{block.label}</span>
                          <span className="text-xs text-slate-500 truncate block">{block.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </div>
                </div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-20">
                   <button 
                     onClick={() => setIsBuildingBlocksExpanded(!isBuildingBlocksExpanded)} 
                     className="w-5 h-16 flex items-center justify-center bg-black/60 border-r border-t border-b border-white/20 rounded-r-lg hover:bg-black/80 transition-all backdrop-blur-md cursor-pointer" 
                     style={{ color: ac.primary }}
                     title={isBuildingBlocksExpanded ? "Collapse Building Blocks" : "Expand Building Blocks"}
                   >
                      <ChevronLeftIcon size={16} className={`transition-transform duration-300 ${isBuildingBlocksExpanded ? '' : 'rotate-180'}`} />
                   </button>
                </div>
            </div>

            <div className="flex-1 min-w-0 transition-all duration-300 p-6 overflow-y-auto bg-black/20 backdrop-blur-lg" ref={canvasRef}>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    {activeTabEditor ? (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => { setActiveTabEditor(null); setSelectedField(null); }} 
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2 text-xs font-mono"
                        >
                          <ChevronLeftIcon size={14} /> Back to Main Layout
                        </button>
                        <h3 className="text-sm font-medium text-sky-400 flex items-center gap-2">
                          <LayoutIcon size={16} />
                          Editing Tab: {activeTabEditor.tabLabel}
                        </h3>
                      </div>
                    ) : (
                      <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <ColumnsIcon size={16} style={{ color: ac.primary }} />
                        Field Layout ({fields.length} / {MAX_FIELDS_PER_MINIAPP} fields)
                      </h3>
                    )}
                    {isNearFieldLimit && (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${isAtFieldLimit ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400'}`}>
                        <AlertTriangleIcon size={12} />
                        {isAtFieldLimit ? `Field limit reached (${MAX_FIELDS_PER_MINIAPP} max)` : `${MAX_FIELDS_PER_MINIAPP - fieldCount} fields remaining`}
                      </div>
                    )}
                  </div>
                  
                  <div 
                    ref={gridRef}
                    className="grid content-start rounded-xl p-2.5 min-h-[400px] border border-white/[0.06] transition-all relative pb-24 min-w-0" 
                    style={{ 
                      gridTemplateColumns: 'repeat(60, minmax(0, 1fr))', 
                      gridAutoRows: 'minmax(70px, auto)', 
                      gridAutoFlow: 'row dense', 
                      background: 'rgba(0,0,0,0.2)', 
                      backdropFilter: 'blur(16px)' 
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      
                      // Clear the drop preview if dragging over the empty grid background
                      if (e.target === e.currentTarget) {
                        setDropPreview(null);
                      }
                    }}
                    onDrop={handleDrop}
                  >
                    
                    {displayFields.map((field, index) => {
                      const isFieldSelected = selectedField === field.id;
                      const isSplit = field.type === 'split_separator';
                      const isGhost = (field as any)._isGhost; 
                      
                      const currentSpan = resizingFieldId === field.id ? (resizingSpan || 60) : (field.colSpan || 60);
                      const currentRowSpan = resizingRowFieldId === field.id ? (resizingRowSpan || 1) : (field.rowSpan || (field.type === 'tabs' ? 4 : 1));

                      const nextField = displayFields[index + 1];
                      const isLastInRow = !nextField || nextField.row !== field.row;

                      const rowFields = displayFields.filter(f => f.row === field.row);
                      const rowSum = rowFields.reduce((sum, f) => {
                          const span = resizingFieldId === f.id ? (resizingSpan || 60) : (f.colSpan || 60);
                          return sum + span;
                      }, 0);
                      const remainingSpan = Math.max(0, 60 - rowSum);

                      const isFieldResizing = resizingFieldId === field.id || resizingRowFieldId === field.id;

                      return (
                        <React.Fragment key={field.id}>
                          <div
                            draggable={!isGhost}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', field.id);
                              setRearrangingFieldId(field.id);
                              setDraggedBlock(null);
                            }}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isGhost) return;
                              handleDragOver(e, field.id);
                            }}
                            onDrop={handleDrop}
                            className={`m-1.5 relative min-w-0 min-h-[70px] rounded-lg transition-all duration-300 ease-out group/field ${isGhost ? 'z-50 opacity-90 scale-[0.98]' : 'cursor-grab active:cursor-grabbing'}`}
                            style={{
                              gridColumn: `span ${currentSpan}`,
                              gridRow: `span ${currentRowSpan}`, 
                              background: isGhost 
                                ? `linear-gradient(135deg, rgba(${ac.rgb}, 0.2), rgba(${ac.rgb}, 0.05))` 
                                : (isSplit ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)'),
                              border: isGhost 
                                ? `2px dashed ${ac.primary}` 
                                : (isFieldSelected ? `2px solid ${ac.primary}` : '1px solid rgba(255,255,255,0.08)'),
                              boxShadow: isGhost 
                                ? `0 0 30px rgba(${ac.rgb}, 0.3)` 
                                : (isFieldSelected ? `0 0 12px rgba(${ac.rgb}, 0.15)` : 'none'),
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (e.shiftKey) {
                                setSelectedFieldIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(field.id)) { next.delete(field.id); } else { next.add(field.id); }
                                  return next;
                                });
                              } else {
                                setSelectedField(field.id);
                                setSelectedFieldIds(new Set());
                              }
                            }}
                          >
                            {!isSplit && (
                              <div 
                                className="absolute bottom-0 left-0 right-0 h-4 cursor-row-resize hover:bg-white/10 z-10 flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity rounded-b-lg"
                                style={{ background: isFieldSelected ? `rgba(${ac.rgb}, 0.1)` : undefined }}
                                onMouseDown={(e) => handleFieldRowResizeStart(e, field.id, currentRowSpan)}
                              >
                                <div className="w-8 h-1 rounded-full bg-white/30" />
                              </div>
                            )}

                            <div 
                              className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-white/10 z-10 flex flex-col items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity rounded-r-lg"
                              style={{ background: isFieldSelected ? `rgba(${ac.rgb}, 0.1)` : undefined }}
                              onMouseDown={(e) => handleFieldResizeStart(e, field.id, currentSpan)}
                            >
                              <div className="w-1 h-6 rounded-full bg-white/30" />
                            </div>

                            <div className="p-3 h-full pr-6 pointer-events-auto">
                              {isSplit ? (
                                 <div className="flex flex-col h-full justify-center">
                                   <div className="flex items-center justify-between gap-2">
                                     <div className="flex items-center gap-2 flex-1">
                                       <GripVerticalIcon size={14} className="text-slate-500 flex-shrink-0" />
                                       <SplitIcon size={16} className="text-slate-400" />
                                       <span className="text-slate-400 text-sm">Page Separator</span>
                                     </div>
                                     <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-1 text-slate-500 hover:text-red-400 transition-colors z-20">
                                       <TrashIcon size={14} />
                                     </button>
                                   </div>
                                   <div className="mt-2 w-full" style={{ borderTop: `2px ${field.settings.separatorStyle || 'solid'} ${field.settings.separatorColor || '#64748b'}` }} />
                                 </div>
                              ) : (
                                 <div className="flex flex-col h-full">
                                   <div className="flex items-start justify-between gap-2">
                                     <div className="flex items-center gap-2 flex-1 min-w-0">
                                       {selectedFieldIds.size > 0 && (
                                         <input type="checkbox" checked={selectedFieldIds.has(field.id)} onChange={(e) => { e.stopPropagation(); setSelectedFieldIds(prev => { const next = new Set(prev); if (next.has(field.id)) { next.delete(field.id); } else { next.add(field.id); } return next; }); }} onClick={(e) => e.stopPropagation()} className="w-3 h-3 rounded border-slate-600 bg-slate-800 accent-sky-500 flex-shrink-0 z-20" />
                                       )}
                                       <GripVerticalIcon size={14} className="text-slate-500 flex-shrink-0" />
                                       {(() => {
                                         const blockDef = BUILDING_BLOCKS.find(b => b.type === field.type);
                                         const Icon = blockDef?.icon || GridIcon;
                                         return <Icon size={16} className={`flex-shrink-0 ${blockDef?.color || 'text-slate-400'}`} />;
                                       })()}
                                       <input type="text" value={field.name} onChange={(e) => updateField(field.id, { name: e.target.value })} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} draggable={false} className="flex-1 min-w-0 bg-transparent border-none text-white text-sm focus:outline-none placeholder-slate-600 z-20 relative" placeholder="Field name..." />
                                     </div>
                                     <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-1 text-slate-500 hover:text-red-400 transition-colors z-20 relative" title="Remove Field">
                                       <TrashIcon size={14} />
                                     </button>
                                   </div>
                                   <div className="mt-1 flex items-center gap-2 flex-wrap">
                                      {field.required && <span className="text-xs text-red-400">Required</span>}
                                      {field.type === 'connection_field' && field.settings.connectedMiniAppIds && field.settings.connectedMiniAppIds.length > 0 && (
                                        <span className="text-xs text-emerald-400">{field.settings.connectedMiniAppIds.length} linked</span>
                                      )}
                                      {field.type === 'submenu' && field.settings.conditionFieldId && (
                                        <span className="text-xs text-sky-400">Conditional</span>
                                      )}
                                    </div>
                                 </div>
                              )}
                            </div>
                          </div>

                          {isLastInRow && remainingSpan > 0 && (
                             <div 
                               style={{ gridColumn: `span ${remainingSpan}` }} 
                               className="m-1.5 min-h-[70px] h-full w-full pointer-events-auto z-10"
                               onDragEnter={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 if (!isGhost) handleDragOver(e, field.id, 'after');
                               }}
                               onDragOver={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 if (!isGhost) handleDragOver(e, field.id, 'after');
                               }}
                               onDrop={handleDrop}
                             />
                          )}
                        </React.Fragment>
                      );
                    })}

                    <div 
                      className={`mt-4 m-1.5 h-16 rounded-xl border-2 border-dashed transition-all flex items-center justify-center text-sm font-mono ${dropPreview?.targetId === 'end' ? 'border-white/40 bg-white/5 text-white' : 'border-white/10 text-slate-600'}`}
                      style={{
                        gridColumn: 'span 60',
                        ...(dropPreview?.targetId === 'end' ? { borderColor: ac.primary, color: ac.primary } : {})
                      }}
                      onDragOver={(e) => handleDragOver(e, 'end')}
                      onDrop={handleDrop}
                    >
                      Drag & Drop new fields here
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex h-full">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-20">
                   <button 
                     onClick={() => setIsFieldSettingsExpanded(!isFieldSettingsExpanded)} 
                     className="w-5 h-16 flex items-center justify-center bg-black/60 border-l border-t border-b border-white/20 rounded-l-lg hover:bg-black/80 transition-all backdrop-blur-md cursor-pointer" 
                     style={{ color: ac.primary }}
                     title={isFieldSettingsExpanded ? "Collapse Settings" : "Expand Settings"}
                   >
                      <ChevronRightIcon size={16} className={`transition-transform duration-300 ${isFieldSettingsExpanded ? '' : 'rotate-180'}`} />
                   </button>
                </div>
                
                <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden bg-black/20 backdrop-blur-xl border-l border-white/10 flex-shrink-0 ${isFieldSettingsExpanded ? 'w-80' : 'w-0 border-l-0'}`}>
                  <div className="w-80 h-full p-4 overflow-y-auto darkwave-scrollbar">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: ac.primary }}>
                      <SettingsIcon size={16} />
                      Field Settings
                    </h3>

                {selectedFieldData ? (
                  <div className="space-y-4">
                    {selectedFieldData.type !== 'split_separator' && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Field Name *
                        </label>
                        <input
                          type="text"
                          value={selectedFieldData.name}
                          onChange={(e) => updateField(selectedFieldData.id, { name: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                          placeholder="Enter field name"
                        />
                      </div>
                    )}

                    {selectedFieldData.type !== 'split_separator' && selectedFieldData.type !== 'submenu' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="required"
                          checked={selectedFieldData.required}
                          onChange={(e) => updateField(selectedFieldData.id, { required: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500"
                        />
                        <label htmlFor="required" className="text-sm text-slate-300">Required field</label>
                      </div>
                    )}

                    {selectedFieldData.type !== 'split_separator' && (
                      <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-slate-500/10 border border-indigo-500/20 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <EyeIcon size={14} className="text-indigo-400" />
                          <p className="text-xs text-slate-400 font-medium">Field Visibility</p>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Control when this field is shown to users. Default: always visible.
                        </p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div 
                              onClick={() => {
                                const newVal = !selectedFieldData.settings.hiddenWhenEmpty;
                                updateFieldSettings(selectedFieldData.id, { 
                                  hiddenWhenEmpty: newVal,
                                  ...(newVal ? { alwaysHidden: false } : {})
                                });
                              }}
                              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${selectedFieldData.settings.hiddenWhenEmpty ? 'bg-indigo-500' : 'bg-slate-600'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${selectedFieldData.settings.hiddenWhenEmpty ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <div>
                              <span className="text-xs text-slate-300 block">Hidden When Empty</span>
                              <span className="text-[10px] text-slate-500">Field hides when value is empty/null</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <div 
                              onClick={() => {
                                const newVal = !selectedFieldData.settings.hiddenWhenFull;
                                updateFieldSettings(selectedFieldData.id, { 
                                  hiddenWhenFull: newVal,
                                  ...(newVal ? { alwaysHidden: false } : {})
                                });
                              }}
                              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${selectedFieldData.settings.hiddenWhenFull ? 'bg-indigo-500' : 'bg-slate-600'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${selectedFieldData.settings.hiddenWhenFull ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <div>
                              <span className="text-xs text-slate-300 block">Hidden When Full</span>
                              <span className="text-[10px] text-slate-500">Field hides when value is populated</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <div 
                              onClick={() => {
                                const newVal = !selectedFieldData.settings.alwaysHidden;
                                updateFieldSettings(selectedFieldData.id, { 
                                  alwaysHidden: newVal,
                                  ...(newVal ? { hiddenWhenEmpty: false, hiddenWhenFull: false } : {})
                                });
                              }}
                              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${selectedFieldData.settings.alwaysHidden ? 'bg-red-500' : 'bg-slate-600'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${selectedFieldData.settings.alwaysHidden ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <div>
                              <span className="text-xs text-slate-300 block">Always Hidden</span>
                              <span className="text-[10px] text-slate-500">Admin-only data, never shown to users</span>
                            </div>
                          </label>
                        </div>

                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                          selectedFieldData.settings.alwaysHidden 
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                            : selectedFieldData.settings.hiddenWhenEmpty || selectedFieldData.settings.hiddenWhenFull
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        }`}>
                          {selectedFieldData.settings.alwaysHidden ? (
                            <><EyeOffIcon size={12} /> Always hidden from users</>
                          ) : selectedFieldData.settings.hiddenWhenEmpty && selectedFieldData.settings.hiddenWhenFull ? (
                            <><EyeOffIcon size={12} /> Hidden when empty AND when full</>
                          ) : selectedFieldData.settings.hiddenWhenEmpty ? (
                            <><EyeOffIcon size={12} /> Hidden when empty</>
                          ) : selectedFieldData.settings.hiddenWhenFull ? (
                            <><EyeOffIcon size={12} /> Hidden when populated</>
                          ) : (
                            <><EyeIcon size={12} /> Always visible (default)</>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'text_field' && (
                      <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <p className="text-xs text-slate-400 font-medium">Text Settings</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="multiline"
                            checked={selectedFieldData.settings.multiline || false}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { multiline: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500"
                          />
                          <label htmlFor="multiline" className="text-sm text-slate-300">Multiline text</label>
                        </div>
                      </div>
                    )}

                    {(selectedFieldData.type === 'phone_number_field' || 
                      selectedFieldData.type === 'email_address_field' ||
                      selectedFieldData.type === 'image_field' ||
                      selectedFieldData.type === 'hyperlink_field') && (
                      <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <p className="text-xs text-slate-400 font-medium">Multiple Values</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="allowMultiple"
                            checked={selectedFieldData.settings.allowMultiple || false}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { allowMultiple: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500"
                          />
                          <label htmlFor="allowMultiple" className="text-sm text-slate-300">Allow multiple</label>
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'number_field' && (
                      <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <p className="text-xs text-slate-400 font-medium">Number Settings</p>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Decimal places (0-6)</label>
                          <input
                            type="number"
                            min="0"
                            max="6"
                            value={selectedFieldData.settings.decimals || 0}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { decimals: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                          />
                        </div>
                        {/* ⚡ DYNAMIC SIMULATION SETTINGS */}
                        <div className="pt-2 border-t border-slate-700/50 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input
                              type="checkbox"
                              checked={selectedFieldData.settings.isDynamicSimulation || false}
                              onChange={(e) => updateFieldSettings(selectedFieldData.id, { isDynamicSimulation: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500"
                            />
                            <span className="text-sm text-slate-300 block">Dynamic Simulation Data</span>
                          </label>
                          {selectedFieldData.settings.isDynamicSimulation && (
                            <>
                              <p className="text-[10px] text-amber-400/70 mt-1.5 leading-tight">
                                This field will auto-populate with live data generating a continuous wave. It will be read-only to users.
                              </p>
                              <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 space-y-3">
                                <div>
                                  <label className="block text-[10px] text-amber-500/70 mb-1 uppercase tracking-wider">Start (Min) Number</label>
                                  <input
                                    type="number"
                                    value={selectedFieldData.settings.dynamicSimMin ?? 0}
                                    onChange={(e) => updateFieldSettings(selectedFieldData.id, { dynamicSimMin: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-amber-500/70 mb-1 uppercase tracking-wider">Stop (Max) Number</label>
                                  <input
                                    type="number"
                                    value={selectedFieldData.settings.dynamicSimMax ?? 100}
                                    onChange={(e) => updateFieldSettings(selectedFieldData.id, { dynamicSimMax: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'duration_field' && (
                      <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <p className="text-xs text-slate-400 font-medium">Duration Units</p>
                        {['years', 'weeks', 'days', 'hours', 'minutes', 'seconds'].map((unit) => (
                          <div key={unit} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={unit}
                              checked={selectedFieldData.settings.durationUnits?.[unit as keyof typeof selectedFieldData.settings.durationUnits] || false}
                              onChange={(e) => updateFieldSettings(selectedFieldData.id, { 
                                durationUnits: { 
                                  ...selectedFieldData.settings.durationUnits, 
                                  [unit]: e.target.checked 
                                } 
                              })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500"
                            />
                            <label htmlFor={unit} className="text-sm text-slate-300 capitalize">{unit}</label>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedFieldData.type === 'category_field' && (
                      <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-400 font-medium">Category Options</p>
                          <button
                            onClick={() => addCategoryOption(selectedFieldData.id)}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto darkwave-scrollbar">
                          {selectedFieldData.settings.categoryOptions?.map((opt, idx, arr) => {
                            const isTopHalf = idx < 2 || idx < arr.length / 2;
                            return (
                            <div key={opt.id} className="flex items-center gap-2 relative">

                              {/* Swatch Button */}
                              <button
                                onClick={() => {
                                  setColorPickerTarget({
                                    type: 'category',
                                    fieldId: selectedFieldData.id,
                                    itemId: opt.id,
                                    currentColor: opt.color || ac.primary
                                  });
                                }}
                                className="w-6 h-6 rounded border border-slate-600 flex-shrink-0 transition-transform hover:scale-105"
                                style={{ backgroundColor: opt.color || ac.primary }}
                                title="Edit Option Color"
                              />

                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => updateCategoryOption(selectedFieldData.id, opt.id, { label: e.target.value })}
                                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                                placeholder="Option label"
                              />
                              <button
                                onClick={() => removeCategoryOption(selectedFieldData.id, opt.id)}
                                className="text-slate-500 hover:text-red-400 p-1.5 transition-colors flex-shrink-0"
                                title="Remove Option"
                              >
                                <TrashIcon size={14} />
                              </button>
                            </div>
                          )})}
                          {(!selectedFieldData.settings.categoryOptions || selectedFieldData.settings.categoryOptions.length === 0) && (
                            <p className="text-xs text-slate-500 text-center py-2 border border-dashed border-slate-700 rounded">No options defined</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'tabs' && (
                      <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-400 font-medium">Tab Configuration</p>
                          <button
                            onClick={() => addTabOption(selectedFieldData.id)}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            + Add Tab
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Define the tabs that will appear inside this container. You'll assign fields to these tabs later.</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto darkwave-scrollbar">
                          {selectedFieldData.settings.tabOptions?.map((tab, idx, arr) => {
                            const isTopHalf = idx < 2 || idx < arr.length / 2;
                            return (
                            <div key={tab.id} className="flex items-center gap-2 relative">
                              
                              {/* Swatch Button */}
                              <button
                                onClick={() => {
                                  setColorPickerTarget({
                                    type: 'tab',
                                    fieldId: selectedFieldData.id,
                                    itemId: tab.id,
                                    currentColor: tab.color || ac.primary
                                  });
                                }}
                                className="w-6 h-6 rounded border border-slate-600 flex-shrink-0 transition-transform hover:scale-105"
                                style={{ backgroundColor: tab.color || ac.primary }}
                                title="Edit Tab Color"
                              />

                              <input
                                type="text"
                                value={tab.label}
                                onChange={(e) => updateTabOption(selectedFieldData.id, tab.id, { label: e.target.value })}
                                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                                placeholder="Tab Label"
                              />
                              
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setActiveTabEditor({ blockId: selectedFieldData.id, tabId: tab.id, tabLabel: tab.label });
                                    setSelectedField(null);
                                  }}
                                  className="text-sky-400 hover:text-sky-300 p-1.5 transition-colors"
                                  title="Edit Tab Content"
                                >
                                  <BuildIcon size={14} />
                                </button>
                                <button
                                  onClick={() => removeTabOption(selectedFieldData.id, tab.id)}
                                  className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"
                                  title="Remove Tab"
                                >
                                  <TrashIcon size={14} />
                                </button>
                              </div>
                            </div>
                          )})}
                          {(!selectedFieldData.settings.tabOptions || selectedFieldData.settings.tabOptions.length === 0) && (
                            <p className="text-xs text-slate-500 text-center py-2 border border-dashed border-slate-700 rounded">No tabs defined</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'calculation_field' && (
                      <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <SparklesIcon size={16} className="text-violet-400" />
                          <p className="text-xs text-slate-400 font-medium">AI Calculation</p>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Calculation prompt</label>
                          <textarea
                            value={selectedFieldData.settings.calculationPrompt || ''}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { calculationPrompt: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs h-24 resize-none"
                            placeholder="Use @FieldName to reference other fields. E.g., 'Calculate @Price * @Quantity'"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Display size</label>
                          <select
                            value={selectedFieldData.settings.displaySize || 'medium'}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { displaySize: e.target.value as 'small' | 'medium' | 'large' })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'user_field' && (
                      <div className="p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-slate-400 font-medium mb-2">User Field</p>
                        <p className="text-xs text-slate-500">
                          This field will show a dropdown of all organization users ({organizationUsers.length} users available).
                        </p>
                      </div>
                    )}

                    {selectedFieldData.type === 'connection_field' && (
                      <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranchIcon size={16} className="text-emerald-400" />
                          <p className="text-xs text-slate-400 font-medium">Connection Field Settings</p>
                        </div>
                        
                        <p className="text-xs text-slate-400">
                          Link this field to other MiniApps. Users will see a searchable dropdown of records from connected MiniApps.
                        </p>

                        <label className="flex items-center gap-2 cursor-pointer mt-2 mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <div 
                            onClick={() => updateFieldSettings(selectedFieldData.id, { showInboundConnections: !selectedFieldData.settings.showInboundConnections })}
                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${selectedFieldData.settings.showInboundConnections ? 'bg-emerald-500' : 'bg-slate-600'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${selectedFieldData.settings.showInboundConnections ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </div>
                          <div>
                            <span className="text-xs text-emerald-300 font-bold block">Show All Inbound Connections</span>
                            <span className="text-[10px] text-slate-400">Auto-display records from apps that link to this one.</span>
                          </div>
                        </label>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="allowMultipleConnections"
                            checked={selectedFieldData.settings.allowMultipleConnections || false}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { allowMultipleConnections: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500"
                          />
                          <label htmlFor="allowMultipleConnections" className="text-sm text-slate-300">Allow multiple connections</label>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-2">
                            {selectedFieldData.settings.showInboundConnections ? 'Select allowed Inbound sources' : 'Select MiniApps to Connect'}
                          </label>
                          <div className="relative mb-2">
                            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              value={miniAppSearchQuery}
                              onChange={(e) => setMiniAppSearchQuery(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white text-xs"
                              placeholder="Search MiniApps..."
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-900/50 rounded-lg p-2">
                            {(() => {
                              const appsToRender = filteredMiniApps.filter(app => {
                                if (!selectedFieldData.settings.showInboundConnections) return true;
                                const schema = typeof app.schema_definition === 'string' ? JSON.parse(app.schema_definition) : app.schema_definition;
                                if (!schema || !schema.fields) return false;
                                return schema.fields.some((f: any) => 
                                  (f.type === 'connection_field' || f.type === 'connection') && 
                                  (f.settings?.connectedMiniAppIds?.includes(existingApp?.id) || 
                                   f.settings?.connectedApps?.includes(appName))
                                );
                              });

                              if (appsToRender.length === 0) {
                                return (
                                  <p className="text-xs text-slate-500 text-center py-4">
                                    {selectedFieldData.settings.showInboundConnections 
                                      ? 'No inbound connections found pointing to this MiniApp' 
                                      : (miniAppSearchQuery ? 'No MiniApps found' : 'No MiniApps available')}
                                  </p>
                                );
                              }

                              return appsToRender.map((app) => {
                                const isConnected = selectedFieldData.settings.connectedMiniAppIds?.includes(app.id) || false;
                                
                                // ⚡ EXTRACT WORKSPACE NAME
                                const wsData = (app as any).workspaces;
                                const wsName = wsData ? (Array.isArray(wsData) ? wsData[0]?.name : wsData.name) : (app.is_preset ? 'Global Template' : 'Unknown Workspace');

                                return (
                                  <div
                                    key={app.id}
                                    onClick={() => toggleConnectedMiniApp(selectedFieldData.id, app.id)}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                      isConnected 
                                        ? 'bg-emerald-500/20 border border-emerald-500/50' 
                                        : 'bg-slate-800/50 border border-transparent hover:border-slate-600 hover:bg-slate-800'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                      isConnected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                                    }`}>
                                      {isConnected && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                          <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white text-xs truncate font-medium">{app.name}</p>
                                      {/* ⚡ DISPLAY WORKSPACE NAME */}
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{wsName}</p>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* CONNECTION LAYOUT SETTINGS */}
                        <div className="pt-3 mt-3 border-t border-emerald-500/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Layout Setting</label>
                            <span className="text-[10px] text-slate-500">How records display</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { value: 'dropdown', label: 'Dropdown', desc: 'Classic searchable select' },
                              { value: 'bar', label: 'Bar', desc: 'Expand/collapse row w/ fields' },
                              { value: 'table', label: 'Table', desc: 'Spreadsheet w/ columns' },
                              { value: 'window', label: 'Cards', desc: 'Grid of record cards' },
                            ] as const).map(opt => {
                              const active = (selectedFieldData.settings.connectionLayoutMode || 'dropdown') === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => updateFieldSettings(selectedFieldData.id, { connectionLayoutMode: opt.value })}
                                  className={`p-2 rounded-lg border text-left transition-all ${active ? 'border-emerald-500/70 bg-emerald-500/15' : 'border-slate-700 bg-slate-900/50 hover:border-emerald-500/40'}`}
                                >
                                  <div className={`text-xs font-mono font-bold ${active ? 'text-emerald-300' : 'text-slate-300'}`}>{opt.label}</div>
                                  <div className="text-[10px] text-slate-500 leading-tight">{opt.desc}</div>
                                </button>
                              );
                            })}
                          </div>

                              {/* Calibrate Dropdown Settings */}
                              {(!selectedFieldData.settings.connectionLayoutMode || selectedFieldData.settings.connectionLayoutMode === 'dropdown') && (
                                <div className="mt-3 p-3 bg-black/30 rounded-lg border border-emerald-500/15">
                                  <ToggleSwitch 
                                    value={selectedFieldData.settings.connectionDropdownSearchable ?? true} 
                                    onChange={(v: boolean) => updateFieldSettings(selectedFieldData.id, { connectionDropdownSearchable: v })} 
                                    label="Searchable Dropdown" 
                                    description="Allow users to type to search and filter through connected records." 
                                    color="#10b981" 
                                  />
                                </div>
                              )}

                              {/* Calibrate fields to show when Bar expands */}
                              {selectedFieldData.settings.connectionLayoutMode === 'bar' && (
                            <div className="mt-3 p-2.5 bg-black/30 rounded-lg border border-emerald-500/15">
                              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Fields shown when expanded</label>
                              <input
                                type="text"
                                value={(selectedFieldData.settings.connectionBarExpandFields || []).join(', ')}
                                onChange={e => updateFieldSettings(selectedFieldData.id, {
                                  connectionBarExpandFields: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                })}
                                placeholder="Price, Quantity, Status"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                              />
                              <p className="text-[9px] text-slate-500 mt-1">Comma-separated field names from connected app</p>
                            </div>
                          )}

                          {/* Calibrate table columns */}
                          {(selectedFieldData.settings.connectionLayoutMode === 'table' || selectedFieldData.settings.connectionLayoutMode === 'window') && (
                            <div className="mt-3 p-2.5 bg-black/30 rounded-lg border border-emerald-500/15">
                              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Columns to display</label>
                              <input
                                type="text"
                                value={(selectedFieldData.settings.connectionTableColumns || []).join(', ')}
                                onChange={e => updateFieldSettings(selectedFieldData.id, {
                                  connectionTableColumns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                })}
                                placeholder="Name, SKU, Price, Stock"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                              />
                              <p className="text-[9px] text-slate-500 mt-1">Comma-separated field names from connected app</p>
                            </div>
                          )}

                          {selectedFieldData.settings.connectionLayoutMode === 'window' && (
                            <div className="mt-2 p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                              <p className="text-[10px] text-emerald-300 leading-tight">
                                <span className="font-bold">Cards mode</span> displays connected records as a responsive grid of tiles with an expand button to jump directly into them.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'submenu' && (
                      <SubMenuFieldSettings
                        field={selectedFieldData}
                        allFields={fields}
                        onUpdateSettings={updateFieldSettings}
                        onUpdateField={updateField}
                        acColor={ac}
                      />
                    )}

                    {selectedFieldData.type === 'integration_field' && (
                      <div className="p-3 bg-gradient-to-br from-lime-500/10 to-green-500/10 border border-lime-500/30 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <WorkflowIcon size={16} className="text-lime-400" />
                          <p className="text-xs text-slate-400 font-medium">Integration Settings</p>
                        </div>
                        <p className="text-xs text-slate-400 leading-tight">
                          Connect this field to an integration configured in your Admin Panel.
                        </p>
                        
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Integration Category</label>
                          <select
                            value={selectedFieldData.settings.integrationType || 'software'}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationType: e.target.value as any, integrationId: '' })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500 transition-colors"
                          >
                            <option value="software">Software / API</option>
                            <option value="hardware">Hardware Device</option>
                            <option value="access_control">Access Control</option>
                            <option value="camera">Security Camera</option>
                            <option value="data_input">Data Input (Sensors)</option>
                            <option value="payment">Payment Gateway</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1 mt-2">Select Active Integration</label>
                          <select
                            value={selectedFieldData.settings.integrationId || ''}
                            onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationId: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500 transition-colors"
                          >
                            <option value="">Select a configured integration...</option>
                            <optgroup label="Payments">
                              <option value="int_stripe">Stripe</option>
                              <option value="int_square">Square</option>
                            </optgroup>
                            <optgroup label="Access Control & Cameras">
                              <option value="int_verkada">Verkada Security</option>
                              <option value="int_brivo">Brivo Access</option>
                              <option value="int_hid">HID Global</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* ⚡ DYNAMIC FIELD CONFIGURATION BASED ON SELECTION */}
                        {selectedFieldData.settings.integrationId && (
                          <div className="pt-3 border-t border-lime-500/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                            
                            {/* PAYMENT CONFIGURATIONS */}
                            {selectedFieldData.settings.integrationType === 'payment' && (
                              <>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">Amount Field Mapping</label>
                                  <select
                                    value={selectedFieldData.settings.integrationPaymentAmountField || ''}
                                    onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationPaymentAmountField: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500"
                                  >
                                    <option value="">Select a Number or Calculation field...</option>
                                    {fields.filter(f => f.type === 'number_field' || f.type === 'calculation_field').map(f => (
                                      <option key={f.id} value={f.id}>{f.name || 'Unnamed Field'}</option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-slate-500 mt-1">Which field determines the amount to charge?</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Currency</label>
                                    <select
                                      value={selectedFieldData.settings.integrationPaymentCurrency || 'USD'}
                                      onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationPaymentCurrency: e.target.value })}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500"
                                    >
                                      <option value="USD">USD ($)</option>
                                      <option value="EUR">EUR (€)</option>
                                      <option value="GBP">GBP (£)</option>
                                      <option value="CAD">CAD (£)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Memo / Description</label>
                                    <input
                                      type="text"
                                      value={selectedFieldData.settings.integrationPaymentDescription || ''}
                                      onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationPaymentDescription: e.target.value })}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500"
                                      placeholder="e.g. Invoice Payment"
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            {/* CAMERA CONFIGURATIONS */}
                            {selectedFieldData.settings.integrationType === 'camera' && (
                              <>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">Camera ID / Stream URL</label>
                                  <input
                                    type="text"
                                    value={selectedFieldData.settings.integrationCameraId || ''}
                                    onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationCameraId: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500"
                                    placeholder="e.g. CAM-10293 or RTSP URL"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">View Mode</label>
                                  <select
                                    value={selectedFieldData.settings.integrationCameraViewMode || 'live'}
                                    onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationCameraViewMode: e.target.value as any })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500"
                                  >
                                    <option value="live">Live Video Stream</option>
                                    <option value="snapshot">Static Image Snapshot</option>
                                  </select>
                                </div>
                              </>
                            )}

                            {/* ACCESS CONTROL CONFIGURATIONS */}
                            {selectedFieldData.settings.integrationType === 'access_control' && (
                              <>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">Target Door / Device ID</label>
                                  <input
                                    type="text"
                                    value={selectedFieldData.settings.integrationDoorId || ''}
                                    onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationDoorId: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500"
                                    placeholder="e.g. DOOR-FRONT-MAIN"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">Trigger Action</label>
                                  <select
                                    value={selectedFieldData.settings.integrationAccessAction || 'momentary_unlock'}
                                    onChange={(e) => updateFieldSettings(selectedFieldData.id, { integrationAccessAction: e.target.value as any })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-lime-500"
                                  >
                                    <option value="momentary_unlock">Momentary Unlock (Buzz In)</option>
                                    <option value="lock">Lock / Secure</option>
                                    <option value="lockdown">Global Lockdown</option>
                                  </select>
                                </div>
                              </>
                            )}

                          </div>
                        )}
                      </div>
                    )}

                    {selectedFieldData.type === 'split_separator' && (
                      <div className="p-3 bg-gradient-to-br from-slate-500/10 to-gray-500/10 border border-slate-500/30 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <SplitIcon size={16} className="text-slate-400" />
                          <p className="text-xs text-slate-400 font-medium">Separator Settings</p>
                        </div>
                        <p className="text-xs text-slate-400">
                          A page separator divides sections of your form. It always spans both columns.
                        </p>
                        <div>
                          <label className="block text-xs text-slate-400 mb-2">Line Color</label>
                          <div className="flex flex-wrap gap-2">
                            {SEPARATOR_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => updateFieldSettings(selectedFieldData.id, { separatorColor: color })}
                                className={`w-6 h-6 rounded border-2 transition-all ${
                                  selectedFieldData.settings.separatorColor === color
                                    ? 'border-white scale-110'
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Line Style</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateFieldSettings(selectedFieldData.id, { separatorStyle: 'solid' })}
                              className={`flex-1 py-2 px-3 rounded-lg border text-sm ${
                                selectedFieldData.settings.separatorStyle === 'solid'
                                  ? 'bg-slate-600/50 border-slate-500 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              Solid
                            </button>
                            <button
                              onClick={() => updateFieldSettings(selectedFieldData.id, { separatorStyle: 'dashed' })}
                              className={`flex-1 py-2 px-3 rounded-lg border text-sm ${
                                selectedFieldData.settings.separatorStyle === 'dashed'
                                  ? 'bg-slate-600/50 border-slate-500 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              Dashed
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Margin Top (px)</label>
                            <input
                              type="number"
                              min="0"
                              max="64"
                              value={selectedFieldData.settings.marginTop || 16}
                              onChange={(e) => updateFieldSettings(selectedFieldData.id, { marginTop: parseInt(e.target.value) || 0 })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Margin Bottom (px)</label>
                            <input
                              type="number"
                              min="0"
                              max="64"
                              value={selectedFieldData.settings.marginBottom || 16}
                              onChange={(e) => updateFieldSettings(selectedFieldData.id, { marginBottom: parseInt(e.target.value) || 0 })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-2">Preview:</p>
                          <div 
                            style={{
                              borderTop: `2px ${selectedFieldData.settings.separatorStyle || 'solid'} ${selectedFieldData.settings.separatorColor || '#64748b'}`,
                              marginTop: `${selectedFieldData.settings.marginTop || 16}px`,
                              marginBottom: `${selectedFieldData.settings.marginBottom || 16}px`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {selectedFieldData.type === 'visualizer_field' && (
                      <div className="p-3 bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/30 rounded-lg space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <LucideIcons.PieChart size={16} className="text-fuchsia-400" />
                          <p className="text-xs text-slate-400 font-medium">Visualizer Settings</p>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Select a data source and configure the chart axes. Combine fields to create custom metrics (e.g., Total - Discount).
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Chart Type</label>
                            <select
                              value={selectedFieldData.settings.visualizerChartType || 'bar'}
                              onChange={(e) => updateFieldSettings(selectedFieldData.id, { visualizerChartType: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                            >
                              <option value="bar">Bar Chart</option>
                              <option value="line">Line Chart</option>
                              <option value="pie">Pie Chart</option>
                              <option value="scatter">Scatter Plot</option>
                              <option value="dynamic">Dynamic Sim</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Default Mode</label>
                            <select
                              value={selectedFieldData.settings.visualizerDefaultMode || '2D'}
                              onChange={(e) => updateFieldSettings(selectedFieldData.id, { visualizerDefaultMode: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                            >
                              <option value="2D">Standard 2D</option>
                              <option value="3D">Interactive 3D</option>
                            </select>
                          </div>
                        </div>

                        <VisualizerConfigurator 
                          field={selectedFieldData}
                          updateFieldSettings={updateFieldSettings}
                          availableApps={allMiniApps}
                        />
                      </div>
                    )}

                    {selectedFieldData.type !== 'split_separator' && selectedFieldData.type !== 'submenu' && selectedFieldData.type !== 'visualizer_field' && (
                      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <p className="text-xs text-slate-400 font-medium mb-2">Preview</p>
                        <div className="bg-slate-900 rounded-lg p-3">
                          <label className="block text-xs text-slate-400 mb-1">
                            {selectedFieldData.name || 'Field Name'}
                            {selectedFieldData.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {renderFieldPreview(selectedFieldData, allMiniApps, ac)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <GridIcon size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Select a field to edit its settings</p>
                  </div>
                )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: WORKFLOWS */}
          {mainTab === 'workflows' && (() => {
            // ⚡ ENTERPRISE TOOLBOX CONFIGURATION
            const TOOLBOX_ITEMS = [
              // Logic & Control Flow
              { category: 'logic', type: 'condition', label: 'If / Condition', icon: GitBranchIcon, color: 'text-amber-400', border: 'border-amber-500/50' },
              { category: 'logic', type: 'loop', label: 'For Each (Loop)', icon: LucideIcons.Repeat, color: 'text-orange-400', border: 'border-orange-500/50' },
              { category: 'logic', type: 'delay', label: 'Delay / Wait', icon: ClockIcon, color: 'text-yellow-400', border: 'border-yellow-500/50' },
              // Actions
              { category: 'action', type: 'create_record', label: 'Create Item', icon: PlusIcon, color: 'text-emerald-400', border: 'border-emerald-500/50' },
              { category: 'action', type: 'update_record', label: 'Update Item', icon: EditIcon, color: 'text-sky-400', border: 'border-sky-500/50' },
              { category: 'action', type: 'delete_record', label: 'Delete Item', icon: TrashIcon, color: 'text-red-400', border: 'border-red-500/50' },
              { category: 'action', type: 'send_task', label: 'Assign Task', icon: LucideIcons.CheckSquare, color: 'text-fuchsia-400', border: 'border-fuchsia-500/50' },
              { category: 'action', type: 'send_alert', label: 'Send Alert', icon: LucideIcons.Bell, color: 'text-yellow-400', border: 'border-yellow-500/50' },
              { category: 'action', type: 'add_comment', label: 'Add Comment', icon: LucideIcons.MessageSquare, color: 'text-pink-400', border: 'border-pink-500/50' },
              { category: 'action', type: 'send_email', label: 'Send Email', icon: MailIcon, color: 'text-purple-400', border: 'border-purple-500/50' },
              { category: 'action', type: 'send_sms', label: 'Send SMS', icon: PhoneIcon, color: 'text-green-400', border: 'border-green-500/50' },
              { category: 'action', type: 'webhook', label: 'Trigger Webhook', icon: LucideIcons.Globe, color: 'text-rose-400', border: 'border-rose-500/50' },
              { category: 'action', type: 'generate_pdf', label: 'Generate PDF', icon: ColumnsIcon, color: 'text-red-400', border: 'border-red-500/50' },
              { category: 'action', type: 'ai_prompt', label: 'AI Prompt', icon: SparklesIcon, color: 'text-violet-400', border: 'border-violet-500/50' },
              { category: 'action', type: 'math', label: 'Custom Math', icon: CalculatorIcon, color: 'text-teal-400', border: 'border-teal-500/50' },
            ];

            return (
              <div className="relative flex h-full z-10 flex-1 w-full overflow-hidden bg-black/20 backdrop-blur-lg">
                
                {/* LEFT PANEL: WORKFLOW LIST */}
                <div className="h-full w-64 flex-shrink-0 border-r border-white/10 bg-black/30 backdrop-blur-xl overflow-y-auto darkwave-scrollbar flex flex-col">
                  <div className="p-4 border-b border-white/10">
                    <button 
                      onClick={() => {
                        const newWf = {
                          id: crypto.randomUUID(),
                          name: 'New Workflow',
                          isActive: true,
                          trigger: 'record_created',
                          steps: []
                        };
                        setAppSettings(prev => ({ ...prev, workflows: [...(prev.workflows || []), newWf] }));
                        setActiveWorkflowId(newWf.id);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-bold transition-all hover:scale-105"
                      style={{ background: `linear-gradient(135deg, rgba(${ac.rgb}, 0.2), rgba(${ac.rgb}, 0.05))`, border: `1px solid ${ac.primary}`, color: ac.primary, boxShadow: `0 0 15px rgba(${ac.rgb}, 0.2)` }}
                    >
                      <PlusIcon size={16} /> New Workflow
                    </button>
                  </div>
                  <div className="p-2 space-y-2">
                    {!(appSettings.workflows?.length > 0) ? (
                      <p className="text-xs text-slate-500 font-mono text-center py-4">No workflows yet.</p>
                    ) : (
                      appSettings.workflows.map((wf: any) => (
                        <button 
                          key={wf.id} 
                          onClick={() => setActiveWorkflowId(wf.id)}
                          className={`w-full text-left p-3 rounded-lg transition-all group flex flex-col gap-1.5 border ${activeWorkflowId === wf.id ? 'bg-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                          style={activeWorkflowId === wf.id ? { borderColor: `rgba(${ac.rgb}, 0.4)` } : {}}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wf.isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              <span className="text-sm font-mono font-bold text-white truncate">{wf.name}</span>
                            </div>
                            <div onClick={(e) => { e.stopPropagation(); setAppSettings(prev => ({ ...prev, workflows: prev.workflows.filter((w: any) => w.id !== wf.id) })); if (activeWorkflowId === wf.id) setActiveWorkflowId(null); }} className="p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-white/10">
                              <TrashIcon size={14} />
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded w-fit border border-slate-700/50">
                            {wf.trigger?.replace('_', ' ')}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* CENTER PANEL: TIMELINE EDITOR */}
                <div className="flex-1 flex flex-col h-full relative"
                     onDragOver={(e) => e.preventDefault()}
                     onDrop={(e) => {
                       e.preventDefault();
                       const type = e.dataTransfer.getData('stepType');
                       if (type && activeWorkflowId) {
                         const currentWf = appSettings.workflows.find((w:any) => w.id === activeWorkflowId);
                         const newSteps = [...(currentWf.steps || []), { id: `step_${Date.now()}`, type, config: {} }];
                         setAppSettings(prev => ({
                           ...prev,
                           workflows: prev.workflows.map((w: any) => w.id === activeWorkflowId ? { ...w, steps: newSteps } : w)
                         }));
                       }
                     }}
                >
                  {!activeWorkflowId ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-60">
                      <WorkflowIcon size={64} className="text-slate-600 mb-4" />
                      <h4 className="text-xl font-mono text-white mb-2">Select a Workflow</h4>
                      <p className="text-sm text-slate-400 font-mono max-w-md text-center">Create a new workflow or select one from the sidebar to build your automation timeline.</p>
                    </div>
                  ) : (() => {
                    const currentWf = appSettings.workflows.find((w: any) => w.id === activeWorkflowId);
                    if (!currentWf) return null;

                    const updateWf = (updates: any) => {
                      setAppSettings(prev => ({
                        ...prev,
                        workflows: prev.workflows.map((w: any) => w.id === activeWorkflowId ? { ...w, ...updates } : w)
                      }));
                    };

                    const updateStep = (stepId: string, configUpdates: any) => {
                      const newSteps = (currentWf.steps || []).map((s: any) => s.id === stepId ? { ...s, config: { ...s.config, ...configUpdates } } : s);
                      updateWf({ steps: newSteps });
                    };

                    const removeStep = (stepId: string) => {
                      updateWf({ steps: (currentWf.steps || []).filter((s: any) => s.id !== stepId) });
                    };

                    const sourceFields = fields.filter((f: any) => !['split_separator', 'tabs', 'submenu'].includes(f.type));

                    return (
                      <div className="flex-1 overflow-y-auto darkwave-scrollbar p-6 lg:p-10 pb-32 relative">
                        {/* TOP HEADER CONTROLS */}
                        <div className="flex items-center gap-4 mb-10 pb-4 border-b border-white/10">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={currentWf.name} 
                              onChange={(e) => updateWf({ name: e.target.value })}
                              className="bg-transparent border-none text-2xl font-mono font-bold text-white focus:outline-none w-full placeholder-slate-600"
                              placeholder="Workflow Name"
                            />
                          </div>
                          <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold rounded-lg transition-colors border border-slate-600">
                            {rightPanelOpen ? 'Hide Toolbox' : 'Show Toolbox'}
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
                            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Status</span>
                            <div className={`w-9 h-5 rounded-full transition-colors relative ${currentWf.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${currentWf.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <input type="checkbox" className="hidden" checked={currentWf.isActive} onChange={(e) => updateWf({ isActive: e.target.checked })} />
                          </label>
                        </div>

                        {/* ⚡ THE VERTICAL STACK TIMELINE */}
                        <div className="max-w-2xl mx-auto relative pl-4">
                          {/* Connecting Line */}
                          <div className="absolute left-[35px] top-8 bottom-0 w-[2px] bg-slate-700/50 z-0" />

                          {/* TRIGGER NODE */}
                          <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl mb-8">
                            <div className="absolute -left-[28px] top-6 w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center shadow-lg">
                               <LucideIcons.Zap size={16} className="text-slate-300" />
                            </div>
                            <div className="ml-2">
                              <h4 className="text-sm font-mono font-bold text-white mb-1">Trigger Event</h4>
                              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-4">When this happens...</p>
                              <select 
                                value={currentWf.trigger} 
                                onChange={e => updateWf({ trigger: e.target.value })}
                                className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none"
                                style={{ borderLeft: `3px solid ${ac.primary}` }}
                              >
                                <option value="record_created">When an Item is Created</option>
                                <option value="record_updated">When an Item is Updated</option>
                                <option value="record_deleted">When an Item is Deleted</option>
                                <option value="field_changed">When a Specific Field Changes</option>
                                <option value="date_reached">When a Date/Time is Reached</option>
                              </select>
                              
                              {currentWf.trigger === 'field_changed' && (
                                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Select Field to Watch</label>
                                  <select 
                                    value={currentWf.triggerField || ''} 
                                    onChange={e => updateWf({ triggerField: e.target.value })}
                                    className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                                  >
                                    <option value="">-- Choose Field --</option>
                                    {sourceFields.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                                </div>
                              )}
                              {currentWf.trigger === 'date_reached' && (
                                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Select Date Field</label>
                                  <select 
                                    value={currentWf.triggerField || ''} 
                                    onChange={e => updateWf({ triggerField: e.target.value })}
                                    className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                                  >
                                    <option value="">-- Choose Date Field --</option>
                                    {sourceFields.filter((f: any) => f.type === 'date_field').map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* DYNAMIC STEPS ARRAY */}
                          {(currentWf.steps || []).map((step: any, index: number) => {
                            const toolInfo = TOOLBOX_ITEMS.find(t => t.type === step.type);
                            const NodeIcon = toolInfo?.icon || LucideIcons.Activity;

                            return (
                              <div key={step.id} className="relative z-10 bg-slate-800/60 border border-slate-700 rounded-xl p-6 shadow-xl group mb-8">
                                <div className={`absolute -left-[28px] top-6 w-10 h-10 rounded-full bg-slate-900 border-2 ${toolInfo?.border || 'border-slate-500'} flex items-center justify-center shadow-lg`}>
                                   <NodeIcon size={16} className={toolInfo?.color || 'text-slate-400'} />
                                </div>
                                <div className="ml-2">
                                  <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-3">
                                     <div>
                                       <h4 className="text-sm font-mono font-bold text-white">{toolInfo?.label || step.type}</h4>
                                       <p className="text-[10px] font-mono text-slate-500">Step {index + 1}</p>
                                     </div>
                                     <button onClick={() => removeStep(step.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded hover:bg-white/5">
                                       <TrashIcon size={14}/>
                                     </button>
                                  </div>

                                  {/* RENDER CONFIG BASED ON TYPE */}
                                  <div className="space-y-4">
                                    
                                    {/* LOGIC: CONDITION */}
                                    {step.type === 'condition' && (
                                      <div className="space-y-3">
                                        <p className="text-[10px] text-slate-400 font-mono mb-2">If this condition fails, the workflow will stop immediately.</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <select value={step.config.fieldId || ''} onChange={e => updateStep(step.id, { fieldId: e.target.value })} className="flex-1 min-w-[120px] bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none">
                                            <option value="">-- Select Field --</option>
                                            {sourceFields.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                          </select>
                                          <select value={step.config.operator || 'equals'} onChange={e => updateStep(step.id, { operator: e.target.value })} className="w-32 bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none">
                                            <option value="equals">Equals</option><option value="not_equals">Not Equals</option>
                                            <option value="contains">Contains</option><option value="is_empty">Is Empty</option>
                                            <option value="greater_than">Greater Than</option><option value="less_than">Less Than</option>
                                          </select>
                                          {!['is_empty'].includes(step.config.operator) && (
                                            <input type="text" value={step.config.value || ''} onChange={e => updateStep(step.id, { value: e.target.value })} placeholder="Comparison Value" className="flex-1 min-w-[120px] bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* ACTION: CREATE RECORD */}
                                    {step.type === 'create_record' && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Target App</label>
                                          <select value={step.config.targetAppId || ''} onChange={e => updateStep(step.id, { targetAppId: e.target.value, fieldMapping: [] })} className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none">
                                            <option value="">-- Select Target App --</option>
                                            {allMiniApps.filter(a => a.id !== internalAppId).map(app => (
                                              <option key={app.id} value={app.id}>{app.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        
                                        {step.config.targetAppId && (
                                          <div className="bg-black/30 border border-slate-700/50 rounded-lg p-4 mt-2">
                                            <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                                              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Field Mapping</label>
                                              <button onClick={() => {
                                                const newMapping = [...(step.config.fieldMapping || []), { targetFieldId: '', sourceValue: '' }];
                                                updateStep(step.id, { fieldMapping: newMapping });
                                              }} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded transition-colors">
                                                <PlusIcon size={10} /> Add Map
                                              </button>
                                            </div>
                                            
                                            {(step.config.fieldMapping || []).length === 0 ? (
                                              <p className="text-[10px] text-slate-600 font-mono text-center italic py-2">No fields mapped.</p>
                                            ) : (
                                              <div className="space-y-2">
                                                <div className="flex items-center text-[9px] font-mono text-slate-500 uppercase px-1">
                                                  <span className="flex-1">Target Field ID</span>
                                                  <span className="w-6 text-center"></span>
                                                  <span className="flex-1">Source Value / Token</span>
                                                  <span className="w-8"></span>
                                                </div>
                                                {(step.config.fieldMapping || []).map((mapping: any, mIdx: number) => (
                                                  <div key={mIdx} className="flex items-center gap-2">
                                                    <input type="text" value={mapping.targetFieldId || ''} onChange={e => {
                                                      const newMapping = [...step.config.fieldMapping];
                                                      newMapping[mIdx].targetFieldId = e.target.value;
                                                      updateStep(step.id, { fieldMapping: newMapping });
                                                    }} placeholder="Target Field ID" className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                                                    <span className="text-slate-600"><GitBranchIcon size={12} /></span>
                                                    <input type="text" value={mapping.sourceValue || ''} onChange={e => {
                                                      const newMapping = [...step.config.fieldMapping];
                                                      newMapping[mIdx].sourceValue = e.target.value;
                                                      updateStep(step.id, { fieldMapping: newMapping });
                                                    }} placeholder="@FieldName or _record_id" className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                                                    <button onClick={() => {
                                                      const newMapping = step.config.fieldMapping.filter((_: any, i: number) => i !== mIdx);
                                                      updateStep(step.id, { fieldMapping: newMapping });
                                                    }} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/20 rounded transition-colors"><TrashIcon size={14} /></button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* ACTION: UPDATE RECORD */}
                                    {step.type === 'update_record' && (
                                      <div className="space-y-4">
                                        <p className="text-[10px] text-slate-400 font-mono bg-black/30 p-3 rounded-lg border border-slate-700/50">
                                          Type <code className="text-sky-400 bg-sky-500/10 px-1 rounded">@FieldName</code> to inject dynamic data from other fields.
                                        </p>
                                        <div className="flex gap-2">
                                          <select 
                                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-colors"
                                            onChange={(e) => {
                                              const fieldId = e.target.value; if(!fieldId) return;
                                              updateStep(step.id, { fieldUpdates: { ...(step.config.fieldUpdates || {}), [fieldId]: '' } });
                                              e.target.value = ""; 
                                            }}
                                          >
                                            <option value="">+ Add Field to Update</option>
                                            {sourceFields.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                          </select>
                                        </div>
                                        {Object.entries(step.config.fieldUpdates || {}).map(([fId, val]) => (
                                          <div key={fId} className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-slate-700/50">
                                            <div className="w-1/3 truncate text-xs font-mono text-slate-300 pl-1">{sourceFields.find((f:any) => f.id === fId)?.name || 'Unknown Field'}</div>
                                            <div className="text-slate-600"><LucideIcons.ArrowRight size={12} /></div>
                                            <input type="text" value={val as string} onChange={(e) => updateStep(step.id, { fieldUpdates: { ...step.config.fieldUpdates, [fId]: e.target.value } })}
                                              placeholder="New value or @Token" className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500 transition-colors" />
                                            <button onClick={() => {
                                                const newUpdates = { ...step.config.fieldUpdates }; delete newUpdates[fId]; updateStep(step.id, { fieldUpdates: newUpdates });
                                              }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"><CloseIcon size={14} /></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* ACTION: SEND TASK */}
                                    {step.type === 'send_task' && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Task Title</label>
                                          <input type="text" value={step.config.taskTitle || ''} placeholder="e.g. Review @Name" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-fuchsia-500"
                                            onChange={e => updateStep(step.id, { taskTitle: e.target.value })} />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Assign To</label>
                                          <select value={step.config.assigneeId || ''} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-fuchsia-500"
                                            onChange={e => updateStep(step.id, { assigneeId: e.target.value })}>
                                            <option value="">-- Select User --</option>
                                            {organizationUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                                          </select>
                                        </div>
                                      </div>
                                    )}

                                    {/* ACTION: SEND ALERT */}
                                    {step.type === 'send_alert' && (
                                      <div className="space-y-4">
                                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                          <p className="text-[10px] font-mono text-yellow-500/80">
                                            This alert will be broadcast to the entire workspace and appear in the global notifications menu.
                                          </p>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Notification Title</label>
                                          <input type="text" value={step.config.alertTitle || ''} onChange={e => updateStep(step.id, { alertTitle: e.target.value })} placeholder="e.g. New Record Created" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-yellow-500" />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Notification Message</label>
                                          <textarea value={step.config.alertMessage || ''} onChange={e => updateStep(step.id, { alertMessage: e.target.value })} placeholder="Notification details or message..." className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-yellow-500 resize-none" />
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* ACTION: WEBHOOK */}
                                    {step.type === 'webhook' && (
                                      <div>
                                        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Webhook URL</label>
                                        <input type="url" value={step.config.url || ''} onChange={e => updateStep(step.id, { url: e.target.value })} placeholder="https://hooks.zapier.com/..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-rose-500" />
                                        <p className="text-[10px] font-mono text-slate-500 mt-2">The record's JSON payload will be POSTed here automatically.</p>
                                      </div>
                                    )}

                                    {/* PENDING ACTIONS (Placeholders for now) */}
                                    {['send_email', 'send_sms', 'generate_pdf', 'ai_prompt', 'delay', 'loop', 'math', 'delete_record', 'add_comment'].includes(step.type) && (
                                      <div className="p-4 bg-black/30 border border-dashed border-slate-700 rounded-lg text-center">
                                        <p className="text-xs font-mono text-slate-500">Configuration panel for <strong className="text-white">{toolInfo?.label}</strong> is ready for backend integration.</p>
                                      </div>
                                    )}

                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* DROP ZONE / ADD STEP BUTTON */}
                          <div className="relative z-10 flex justify-start items-center group h-12 ml-[3px]">
                            <button 
                              className="w-8 h-8 rounded-full bg-slate-900 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 hover:bg-slate-800 transition-all shadow-lg"
                              title="Drag tools here, or click to add"
                            >
                              <PlusIcon size={14} />
                            </button>
                            <div className="text-[10px] font-mono text-slate-600 ml-3 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Drag a tool here</div>
                            
                            {/* Click to add flyout */}
                            <div className="absolute top-full left-0 mt-2 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-56 overflow-hidden z-50">
                               {TOOLBOX_ITEMS.map(opt => {
                                 const Icon = opt.icon;
                                 return (
                                   <button key={opt.type} onClick={() => {
                                      const newSteps = [...(currentWf.steps || []), { id: `step_${Date.now()}`, type: opt.type, config: {} }];
                                      updateWf({ steps: newSteps });
                                   }} className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left border-b border-slate-800 last:border-0">
                                     <Icon size={14} className={opt.color} /> {opt.label}
                                   </button>
                                 )
                               })}
                            </div>
                          </div>

                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* RIGHT PANEL: TOOLBOX */}
              {activeWorkflowId && (
                <div className={`h-full border-l border-white/10 bg-black/30 backdrop-blur-xl flex flex-col transition-all duration-300 ${rightPanelOpen ? 'w-64 flex-shrink-0' : 'w-0 overflow-hidden border-none'}`}>
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                      <LucideIcons.Wrench size={16} style={{ color: ac.primary }} /> Toolbox
                    </h4>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6 darkwave-scrollbar">
                    
                    {/* Logic Tools */}
                    <div>
                      <h5 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Logic & Flow</h5>
                      <div className="space-y-2">
                        {TOOLBOX_ITEMS.filter(t => t.category === 'logic').map(tool => (
                          <div key={tool.type} draggable onDragStart={(e) => e.dataTransfer.setData('stepType', tool.type)}
                               className="flex items-center justify-between p-3 bg-black/40 border border-slate-700/50 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors group">
                             <div className="flex items-center gap-2">
                                <tool.icon size={14} className={tool.color} />
                                <span className="text-xs text-slate-300 font-mono">{tool.label}</span>
                             </div>
                             <button onClick={() => {
                               const currentWf = appSettings.workflows.find((w:any) => w.id === activeWorkflowId);
                               const newSteps = [...(currentWf.steps || []), { id: `step_${Date.now()}`, type: tool.type, config: {} }];
                               setAppSettings(prev => ({ ...prev, workflows: prev.workflows.map((w: any) => w.id === activeWorkflowId ? { ...w, steps: newSteps } : w) }));
                             }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity"><PlusIcon size={14}/></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Tools */}
                    <div>
                      <h5 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Actions</h5>
                      <div className="space-y-2">
                        {TOOLBOX_ITEMS.filter(t => t.category === 'action').map(tool => (
                          <div key={tool.type} draggable onDragStart={(e) => e.dataTransfer.setData('stepType', tool.type)}
                               className="flex items-center justify-between p-3 bg-black/40 border border-slate-700/50 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors group">
                             <div className="flex items-center gap-2">
                                <tool.icon size={14} className={tool.color} />
                                <span className="text-xs text-slate-300 font-mono">{tool.label}</span>
                             </div>
                             <button onClick={() => {
                               const currentWf = appSettings.workflows.find((w:any) => w.id === activeWorkflowId);
                               const newSteps = [...(currentWf.steps || []), { id: `step_${Date.now()}`, type: tool.type, config: {} }];
                               setAppSettings(prev => ({ ...prev, workflows: prev.workflows.map((w: any) => w.id === activeWorkflowId ? { ...w, steps: newSteps } : w) }));
                             }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity"><PlusIcon size={14}/></button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}
              
            </div>
            );
          })()}

          {/* TAB 3: PDFs */}
          {mainTab === 'pdfs' && (
            <div className="flex-1 flex flex-col p-6 bg-black/40 overflow-y-auto darkwave-scrollbar max-w-5xl mx-auto w-full">
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-xl font-mono font-bold text-white mb-1">PDF Templates</h3>
                    <p className="text-sm text-slate-400 font-mono">Design and map custom PDFs for your records.</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-xl border-slate-700/50 bg-slate-900/20 text-center">
                  <ColumnsIcon size={48} className="text-slate-600 mb-4" />
                  <h4 className="text-slate-300 font-mono text-lg mb-2">PDF Builder Coming Soon</h4>
                  <p className="text-slate-500 font-mono text-sm max-w-md">You'll soon be able to map these fields directly to your custom PDF documents.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LABELS */}
          {mainTab === 'labels' && (
            <div className="flex-1 flex flex-col p-6 bg-black/40 overflow-y-auto darkwave-scrollbar max-w-5xl mx-auto w-full">
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-xl font-mono font-bold text-white mb-1">Label Printing</h3>
                    <p className="text-sm text-slate-400 font-mono">Configure barcode and QR code label layouts.</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-xl border-slate-700/50 bg-slate-900/20 text-center">
                  <TagIcon size={48} className="text-slate-600 mb-4" />
                  <h4 className="text-slate-300 font-mono text-lg mb-2">Label Builder Coming Soon</h4>
                  <p className="text-slate-500 font-mono text-sm max-w-md">Design print-ready labels for your physical items using standard thermal formats.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS (App-Level) */}
          {mainTab === 'settings' && (
            <div className="flex-1 flex flex-col bg-black/40 overflow-y-auto">
              
              <div className="flex flex-wrap items-center gap-2 px-6 pt-4 border-b border-white/10 flex-shrink-0">
                {[
                  { key: 'general' as const, label: 'General', icon: SettingsIcon },
                  { key: 'advanced' as const, label: 'Advanced', icon: BuildIcon },
                  { key: 'version' as const, label: 'Version', icon: HistoryIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = miniAppSettingsTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setMiniAppSettingsTab(tab.key)}
                      className={`cut-tab cut-tab-${ac.colorName} relative px-6 py-2.5 text-sm font-mono font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 flex-shrink-0 miniapp-icon-glow ${
                        isActive ? 'cut-tab-active' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                      style={isActive ? { color: ac.primary } : {}}
                    >
                      {isActive && <span className="cut-tab-shimmer-el" />}
                      <span className="relative z-[1] flex items-center gap-2">
                        <Icon size={16} className="flex-shrink-0" />
                        <span>{tab.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 max-w-5xl mx-auto w-full">
                
                {miniAppSettingsTab === 'general' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                    
                    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 flex flex-col lg:flex-row overflow-hidden">
                      
                      <div className="p-6 lg:w-1/3 lg:border-r border-slate-700/50 border-b lg:border-b-0 space-y-6">
                        <h4 className="text-sm font-medium text-slate-300 mb-4 border-b border-slate-700 pb-2">App Identity</h4>
                        
                        <div className="flex items-center gap-4">
                          <button onClick={() => setShowIconPicker(true)}
                            className="w-14 h-14 rounded-xl flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
                            style={{ border: `2px solid rgba(${ac.rgb}, 0.4)`, background: `linear-gradient(135deg, rgba(${ac.rgb}, 0.1), rgba(0,0,0,0.8))` }}>
                            {(() => {
                              const SelectedIcon = resolveBuilderIcon(appIcon);
                              return <SelectedIcon size={28} style={{ color: ac.primary }} />;
                            })()}
                          </button>
                          <div>
                            <button onClick={() => setShowIconPicker(true)} className="text-sm font-mono transition-all font-bold hover:opacity-80" style={{ color: ac.primary }}>
                              Change Icon
                            </button>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">Click to choose from the full library</p>
                          </div>
                        </div>

                        <div className="space-y-4 pt-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">App Name *</label>
                            <input
                              type="text"
                              value={appName}
                              onChange={(e) => setAppName(e.target.value)}
                              className="w-full bg-slate-900 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors"
                              style={{ borderColor: isNameConflict ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                              onFocus={e => e.currentTarget.style.borderColor = isNameConflict ? '#ef4444' : ac.primary}
                              onBlur={e => e.currentTarget.style.borderColor = isNameConflict ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                              placeholder="e.g., Contacts, Projects"
                            />
                            {isNameConflict && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-red-400">
                                <AlertTriangleIcon size={12} />
                                <span className="text-[10px] font-mono leading-tight">Name already exists in workspace.</span>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Singular Item Name</label>
                            <input
                              type="text"
                              value={appSettings.itemName || ''}
                              onChange={(e) => setAppSettings({ ...appSettings, itemName: e.target.value })}
                              className="w-full bg-slate-900 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors"
                              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                              onFocus={e => e.currentTarget.style.borderColor = ac.primary}
                              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                              placeholder="e.g., Contact, Project"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                            <textarea
                              value={appDescription}
                              onChange={(e) => setAppDescription(e.target.value)}
                              className="w-full bg-slate-900 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors resize-none h-20 darkwave-scrollbar"
                              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                              onFocus={e => e.currentTarget.style.borderColor = ac.primary}
                              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                              placeholder="Brief description"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 lg:w-2/3 flex-1">
                        <h4 className="text-sm font-medium text-slate-300 mb-2 border-b border-slate-700 pb-2">Display Layouts</h4>
                        <p className="text-xs text-slate-400 mb-6">Choose how items in this MiniApp can be viewed. Users can switch between enabled layouts.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {LAYOUT_OPTIONS.map((layout) => {
                              const Icon = layout.icon;
                              const isSelected = selectedLayouts.includes(layout.type);
                              const isDisabled = layout.type === 'calendar' && !hasDateField;
                              
                              return (
                                <button
                                  key={layout.type}
                                  onClick={() => toggleLayout(layout.type)}
                                  disabled={isDisabled}
                                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all relative ${
                                    isDisabled 
                                      ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-800/30'
                                      : isSelected
                                        ? ''
                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
                                  }`}
                                  style={isSelected && !isDisabled ? {
                                    backgroundColor: `rgba(${ac.rgb}, 0.2)`,
                                    borderColor: `rgba(${ac.rgb}, 0.5)`,
                                    color: ac.primary
                                  } : {}}
                                >
                                {isSelected && (
                                  <div 
                                    className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-md text-slate-400 hover:text-white transition-colors z-10"
                                    onClick={(e) => { e.stopPropagation(); setConfigLayout(layout.type); }}
                                    title="Configure Layout"
                                  >
                                    <SettingsIcon size={14} />
                                  </div>
                                )}
                                <Icon size={24} />
                                <div className="text-center">
                                  <span className="text-xs font-bold block mb-1">{layout.label}</span>
                                </div>
                                {isDisabled && (
                                  <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded mt-1">Requires Date field</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-6 flex items-center gap-4 max-w-md">
                          <label className="text-xs text-slate-300 font-medium">Default Layout:</label>
                          <select
                            value={appSettings.defaultLayout}
                            onChange={(e) => setAppSettings({ ...appSettings, defaultLayout: e.target.value })}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                          >
                            {selectedLayouts.map(l => (
                              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                      <label className="block text-sm font-medium text-slate-300 mb-3 border-b border-slate-700 pb-2">Records Per Page</label>
                      <select
                        value={appSettings.recordsPerPage}
                        onChange={(e) => setAppSettings({ ...appSettings, recordsPerPage: parseInt(e.target.value) })}
                        className="w-48 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} records</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                        <h4 className="text-sm font-medium text-slate-300 mb-4 border-b border-slate-700 pb-2">Record Display</h4>
                        <div className="space-y-5">
                          <ToggleSwitch value={appSettings.showCreatedBy || false} onChange={(v: boolean) => setAppSettings({ ...appSettings, showCreatedBy: v })} label="Show Created By" description="Display the author on records" color="#a855f7" />
                          <ToggleSwitch value={appSettings.showTimestamps || false} onChange={(v: boolean) => setAppSettings({ ...appSettings, showTimestamps: v })} label="Show Timestamps" description="Display creation and edit times" color="#a855f7" />
                        </div>
                      </div>

                      <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                        <h4 className="text-sm font-medium text-slate-300 mb-4 border-b border-slate-700 pb-2">App Features</h4>
                        <div className="space-y-5">
                          <ToggleSwitch value={appSettings.allowExport || false} onChange={(v: boolean) => setAppSettings({ ...appSettings, allowExport: v })} label="Allow Data Export" description="Users can export records to CSV" color="#a855f7" />
                          <ToggleSwitch value={appSettings.allowImport || false} onChange={(v: boolean) => setAppSettings({ ...appSettings, allowImport: v })} label="Allow Data Import" description="Users can import records from CSV" color="#a855f7" />
                          <ToggleSwitch value={appSettings.enableComments || false} onChange={(v: boolean) => setAppSettings({ ...appSettings, enableComments: v })} label="Enable Comments" description="Allow discussion threads on records" color="#a855f7" />
                          <ToggleSwitch value={appSettings.enableAttachments || false} onChange={(v: boolean) => setAppSettings({ ...appSettings, enableAttachments: v })} label="Enable Attachments" description="Allow file uploads on records" color="#a855f7" />
                        </div>
                      </div>
                    </div>

                    {/* ⚡ NEW: Frozen Footer Builder */}
                    <MiniAppFooterBuilder
                      config={appSettings.footer || { enabled: false, blocks: [], height: 64 }}
                      onChange={(next) => setAppSettings({ ...appSettings, footer: next })}
                      connectionFields={fields.filter(f => f.type === 'connection_field').map(f => ({ id: f.id, name: f.name }))}
                      wsColor={ac}
                    />
                  </div>
                )}


                {miniAppSettingsTab === 'advanced' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8 max-w-5xl">
                    
                    <div>
                      <h3 className="text-lg font-mono text-white mb-2">Advanced Security & Access</h3>
                      <p className="text-sm text-slate-400 mb-4">Strictly control user permissions and notifications for this specific MiniApp.</p>

                      <div className="space-y-4">
                        {/* Auto-Deploy Toggle */}
                        <div className="bg-emerald-950/10 p-6 rounded-xl border border-emerald-500/20 space-y-4">
                          <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              <DatabaseIcon size={20} className="text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">Automatic Distribution</h4>
                              <p className="text-xs text-slate-400">Manage how this app deploys to organizations</p>
                            </div>
                          </div>

                          <ToggleSwitch 
                            value={appSettings.auto_deploy || false} 
                            onChange={(v: boolean) => setAppSettings({ ...appSettings, auto_deploy: v })} 
                            label="Auto-Deploy to New Orgs" 
                            description="Automatically provision this app for all future organizations created in this workspace." 
                            color="#10b981" 
                          />
                        </div>

                        {/* Access Controls */}
                        <div className="bg-red-950/10 p-6 rounded-xl border border-red-500/20 space-y-6">
                          <div className="flex items-center gap-3 border-b border-red-500/20 pb-4 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                              <BuildIcon size={20} className="text-red-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">Access Controls</h4>
                              <p className="text-xs text-slate-400">Overrides global organization roles for this app</p>
                            </div>
                          </div>

                          <ToggleSwitch 
                            value={appSettings.auto_deploy || false} 
                            onChange={(v: boolean) => setAppSettings({ ...appSettings, auto_deploy: v })} 
                            label="Auto-Deploy to New Orgs" 
                            description="Automatically provision this app for all future organizations created in this workspace." 
                            color="#10b981" 
                          />
                        </div>

                        {/* Access Controls */}
                        <div className="bg-red-950/10 p-6 rounded-xl border border-red-500/20 space-y-6">
                          <div className="flex items-center gap-3 border-b border-red-500/20 pb-4 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                              <BuildIcon size={20} className="text-red-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">Access Controls</h4>
                              <p className="text-xs text-slate-400">Overrides global organization roles for this app</p>
                            </div>
                          </div>

                          <ToggleSwitch 
                            value={appSettings.disable_user_creation || false} 
                            onChange={(v: boolean) => setAppSettings({ ...appSettings, disable_user_creation: v })} 
                            label="Disable User Creation" 
                            description="Prevent normal users from creating new records in this app. Only Admins will have the 'Add Record' button." 
                            color="#ef4444" 
                          />
                          <ToggleSwitch 
                            value={appSettings.disable_user_edits || false} 
                            onChange={(v: boolean) => setAppSettings({ ...appSettings, disable_user_edits: v })} 
                            label="Disable User Edits" 
                            description="Prevent normal users from modifying existing records. Data becomes read-only for non-admins." 
                            color="#f97316" 
                          />
                          <ToggleSwitch 
                            value={appSettings.disable_notifications || false} 
                            onChange={(v: boolean) => setAppSettings({ ...appSettings, disable_notifications: v })} 
                            label="Disable Notifications" 
                            description="Silence all activity feed entries and push notifications generated by this app." 
                            color="#f59e0b" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-8 flex flex-col lg:flex-row gap-8">
                      <div className="flex-1 space-y-6">
                        <div>
                          <h3 className="text-lg font-mono text-white mb-2">Item ID & Barcodes</h3>
                          <p className="text-sm text-slate-400">
                            Configure how unique IDs are generated for items created in this MiniApp. Each item gets a unique alphanumeric UID, a URL, and optional barcode/QR code.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">ID Prefix</label>
                            <input
                              type="text"
                              value={itemIdSettings.prefix}
                              onChange={(e) => setItemIdSettings({ ...itemIdSettings, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-mono transition-colors"
                              placeholder="e.g., INV, BUG, ORD"
                              maxLength={10}
                            />
                            <p className="text-xs text-slate-500 mt-2">Letters, numbers, hyphens only</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Digits</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={itemIdSettings.minDigits}
                              onChange={(e) => setItemIdSettings({ ...itemIdSettings, minDigits: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-2">Zero-padded (1-10)</p>
                          </div>
                        </div>

                        <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                          <label className="block text-sm font-medium text-slate-300 mb-3 border-b border-slate-700 pb-2">Display Options</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                            <ToggleSwitch 
                              value={itemIdSettings.showItemId || false} 
                              onChange={(v: boolean) => setItemIdSettings({ ...itemIdSettings, showItemId: v })} 
                              label="Show Item ID" 
                              description="Display text ID" 
                              color="#f59e0b"
                            />
                            <ToggleSwitch 
                              value={itemIdSettings.showQrCode || false} 
                              onChange={(v: boolean) => setItemIdSettings({ ...itemIdSettings, showQrCode: v })} 
                              label="Show QR Code" 
                              description="Scannable 2D link" 
                              color="#f59e0b" 
                            />
                            <ToggleSwitch 
                              value={itemIdSettings.showBarcode || false} 
                              onChange={(v: boolean) => setItemIdSettings({ ...itemIdSettings, showBarcode: v })} 
                              label="Show Barcode" 
                              description="Standard 1D format" 
                              color="#f59e0b" 
                            />
                          </div>
                        </div>

                        {itemIdSettings.showBarcode && (
                          <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Barcode Symbology</label>
                            <select
                              value={itemIdSettings.barcodeSymbology}
                              onChange={(e) => setItemIdSettings({ ...itemIdSettings, barcodeSymbology: e.target.value as any })}
                              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                            >
                              {BARCODE_SYMBOLOGIES.map((sym) => (
                                <option key={sym.value} value={sym.value}>{sym.label}</option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">{BARCODE_SYMBOLOGIES.find(s => s.value === itemIdSettings.barcodeSymbology)?.description}</p>
                          </div>
                        )}
                      </div>

                      <div className="w-full lg:w-72 flex-shrink-0">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 sticky top-4">
                          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Live Preview</h4>
                          <div className="space-y-5">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Generated ID</p>
                              <p className="text-lg font-mono text-amber-400 font-bold">
                                {generatePreviewUid(itemIdSettings.prefix, itemIdSettings.minDigits, 42)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Item URL</p>
                              <p className="text-[10px] font-mono text-cyan-400 break-all leading-relaxed">
                                {generateItemUrl(generatePreviewUid(itemIdSettings.prefix, itemIdSettings.minDigits, 42))}
                              </p>
                            </div>
                            {itemIdSettings.showBarcode && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Barcode ({BARCODE_SYMBOLOGIES.find(s => s.value === itemIdSettings.barcodeSymbology)?.label})</p>
                                <div 
                                  className="bg-white rounded-lg p-3"
                                  dangerouslySetInnerHTML={{ 
                                    __html: generateBarcodeSVG(
                                      generatePreviewUid(itemIdSettings.prefix, itemIdSettings.minDigits, 42),
                                      itemIdSettings.barcodeSymbology,
                                      240, 60, true
                                    ) 
                                  }} 
                                />
                              </div>
                            )}
                            {itemIdSettings.showQrCode && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">QR Code</p>
                                <div 
                                  className="bg-white rounded-lg p-3 inline-block"
                                  dangerouslySetInnerHTML={{ 
                                    __html: generateQRCodeSVG(
                                      generateItemUrl(generatePreviewUid(itemIdSettings.prefix, itemIdSettings.minDigits, 42)),
                                      120
                                    ) 
                                  }} 
                                />
                              </div>
                            )}
                            {!itemIdSettings.showBarcode && !itemIdSettings.showQrCode && !itemIdSettings.showItemId && (
                              <div className="p-3 bg-transparent rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center gap-2">
                                <EyeOffIcon size={14} className="text-slate-500" />
                                <p className="text-xs text-slate-500 italic text-center">All displays hidden</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {miniAppSettingsTab === 'version' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl">
                    <MiniAppVersionHistory
                      miniAppId={existingApp?.id}
                      currentSchema={{
                        fields: fields.map((field, index) => ({ ...field, order: index })),
                        name: appName,
                        description: appDescription,
                        icon: appIcon,
                        appSettings: { ...appSettings, layouts: selectedLayouts },
                        itemIdSettings: itemIdSettings,
                      }}
                      wsColor={ac}
                      onRestore={(schema, restoredAppSettings, restoredItemIdSettings) => {
                        if (schema?.fields && Array.isArray(schema.fields)) setFields(schema.fields);
                        if (schema?.name) setAppName(schema.name);
                        if (schema?.description) setAppDescription(schema.description);
                        if (schema?.icon) setAppIcon(schema.icon);
                        if (restoredAppSettings && typeof restoredAppSettings === 'object') {
                          setAppSettings({ ...DEFAULT_APP_SETTINGS, ...restoredAppSettings });
                          if (restoredAppSettings.layouts && Array.isArray(restoredAppSettings.layouts)) {
                            setSelectedLayouts(restoredAppSettings.layouts as LayoutType[]);
                          }
                        }
                        if (restoredItemIdSettings && typeof restoredItemIdSettings === 'object') {
                          setItemIdSettings({ ...DEFAULT_ITEM_ID_SETTINGS, ...restoredItemIdSettings });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {showAIAssistant && (
            <MiniAppAIAssistant
              isOpen={showAIAssistant}
              onClose={() => setShowAIAssistant(false)}
              currentFields={fields}
              appName={appName}
              acColor={ac}
            />
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-white/10 flex-shrink-0" style={{ background: `linear-gradient(to right, transparent, rgba(${ac.rgb}, 0.04))` }}>
          <div className="hidden md:flex items-center gap-4 overflow-x-auto darkwave-scrollbar pb-1">
            <p className="text-sm text-slate-400 whitespace-nowrap">
              {fields.length} field{fields.length !== 1 ? 's' : ''}
            </p>
            <span className="text-white/10">|</span>
            <p className="text-sm text-slate-500 whitespace-nowrap">
              Layouts: {selectedLayouts.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}
            </p>
            <span className="text-white/10">|</span>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <BarcodeIcon size={14} className="text-amber-400" />
              ID: {itemIdSettings.prefix ? `${itemIdSettings.prefix}-` : ''}{String(1).padStart(itemIdSettings.minDigits, '0')}
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
            {/* ⚡ NEW: Local/Global Save Toggle for Platform Owners on both Template and Settings tabs */}
            {(mainTab === 'template' || mainTab === 'settings') && isPlatformOwner() && (
              <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10 mr-2">
                <button
                  onClick={() => setSaveScope('local')}
                  className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                    saveScope === 'local' 
                      ? 'bg-slate-700 text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => setSaveScope('global')}
                  className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                    saveScope === 'global' 
                      ? 'text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  style={saveScope === 'global' ? { backgroundColor: ac.primary, color: '#000' } : {}}
                >
                  Global
                </button>
              </div>
            )}

            <button onClick={onClose} className="px-6 py-2 rounded-xl font-semibold font-mono transition-all duration-200 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(${ac.rgb}, 0.4)`, color: ac.primary }}>
              Cancel
            </button>
            
            <button 
              onClick={handleSave} 
              disabled={isSaving || isNameConflict}
              className="px-8 py-2.5 rounded-xl font-semibold font-mono transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 backdrop-blur-md"
              style={{ 
                background: 'rgba(0,0,0,0.6)', 
                border: isNameConflict ? '1px solid #475569' : `1px solid rgba(${ac.rgb}, 0.5)`, 
                color: isNameConflict ? '#64748b' : ac.primary, 
                boxShadow: isNameConflict ? 'none' : `0 0 20px rgba(${ac.rgb}, 0.15)` 
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {showMigrationDialog && migrationActions.length > 0 && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowMigrationDialog(false); setPendingRemoveFieldId(null); }} />
            <div className="relative bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4" style={{ boxShadow: `0 0 40px rgba(239, 68, 68, 0.1)` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangleIcon size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Field Has Existing Data</h3>
                  <p className="text-xs text-slate-400">Choose how to handle the data</p>
                </div>
              </div>

              {migrationActions.map((action) => (
                <div key={action.fieldId} className="mb-4">
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 mb-3">
                    <p className="text-sm text-slate-300">
                      The field "<span className="font-bold text-white">{action.fieldName}</span>" ({action.fieldType.replace(/_/g, ' ')}) has data in <span className="font-bold text-amber-400">{action.recordsAffected} record{action.recordsAffected !== 1 ? 's' : ''}</span>.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => executeMigration('delete_field_preserve_data')}
                      disabled={isMigrating}
                      className="w-full p-4 rounded-lg border text-left transition-all duration-200 hover:border-amber-500/50 group"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <EyeIcon size={16} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Remove Field, Preserve Data</p>
                          <p className="text-xs text-slate-400">
                            The field will be removed from the schema, but existing data will remain visible in records until manually cleared. Data stays available for reports and exports. Archived to <code className="text-amber-400/80 bg-amber-500/10 px-1 rounded">_removed_fields</code>.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => executeMigration('delete_field_and_data')}
                      disabled={isMigrating}
                      className="w-full p-4 rounded-lg border text-left transition-all duration-200 hover:border-red-500/50 group"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <TrashIcon size={16} className="text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Remove Field and Delete All Data</p>
                          <p className="text-xs text-slate-400">
                            Permanently removes the field and deletes all {action.recordsAffected} record{action.recordsAffected !== 1 ? 's' : ''} of data. <span className="text-red-400 font-medium">This cannot be undone.</span>
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ))}

              {isMigrating && (
                <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-white/5">
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${ac.primary} transparent ${ac.primary} ${ac.primary}` }} />
                  <span className="text-sm text-slate-400">Processing migration...</span>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => { setShowMigrationDialog(false); setPendingRemoveFieldId(null); setMigrationActions([]); }}
                  disabled={isMigrating}
                  className="px-4 py-2 border border-white/10 text-slate-300 rounded-lg hover:bg-white/5 transition-all duration-200 text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showIconPicker && (
          <IconPickerModal
            isOpen={showIconPicker}
            onClose={() => setShowIconPicker(false)}
            onSelect={(icon: string) => { setAppIcon(icon); setShowIconPicker(false); }}
            currentIcon={appIcon}
            wsColor={ac}
          />
        )}

        {/* ⚡ SCHEMA UPDATE DISTRIBUTION MODAL */}
        {showUpdateDistributionModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleSkipPush} />
            <div className="relative bg-black rounded-xl w-full max-w-md mx-4 overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={{ borderColor: `rgba(${ac.rgb}, 0.5)` }}>
              <div className="p-4 border-b flex justify-between items-center bg-slate-900/50" style={{ borderColor: `rgba(${ac.rgb}, 0.2)` }}>
                <h3 className="text-white font-mono font-bold flex items-center gap-2">
                  <DatabaseIcon size={18} style={{ color: ac.primary }}/> Deploy Updates
                </h3>
                <button onClick={handleSkipPush} className="text-slate-400 hover:text-white transition-colors"><CloseIcon size={20}/></button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-300 mb-6 font-mono">
                  Schema and layout updates are ready to deploy.
                </p>

                <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-lg border border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <input type="checkbox" className="mt-1 w-4 h-4" checked={pushName} onChange={e => setPushName(e.target.checked)} style={{ accentColor: ac.primary }}/>
                    <div>
                      <p className="text-sm text-white font-medium">Force Overwrite App Name</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Checking this erases custom names tenants have set.</p>
                    </div>
                  </label>
                  
                  <div className="h-px bg-slate-800 w-full" />
                  
                  <label className="flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <input type="checkbox" className="mt-1 w-4 h-4" checked={pushIcon} onChange={e => setPushIcon(e.target.checked)} style={{ accentColor: ac.primary }}/>
                    <div>
                      <p className="text-sm text-white font-medium">Force Overwrite App Icon</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Checking this overrides custom tab icons.</p>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center gap-2 mb-2 px-1">
                  <input type="checkbox" checked={selectedOrgsForUpdate.length === existingOrgsWithApp.length && existingOrgsWithApp.length > 0} onChange={(e) => { if (e.target.checked) setSelectedOrgsForUpdate(existingOrgsWithApp.map(o => o.id)); else setSelectedOrgsForUpdate([]); }} className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: ac.primary }}/>
                  <span className="text-xs text-slate-300 font-mono font-bold">Select All Tenants ({existingOrgsWithApp.length})</span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-2 darkwave-scrollbar border border-slate-800 rounded-lg p-1 bg-black/20 mb-6">
                  {existingOrgsWithApp.map(org => (
                    <label key={org.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-800/80 p-2 rounded-md transition-colors">
                      <input type="checkbox" checked={selectedOrgsForUpdate.includes(org.id)} onChange={(e) => { if (e.target.checked) setSelectedOrgsForUpdate(prev => [...prev, org.id]); else setSelectedOrgsForUpdate(prev => prev.filter(id => id !== org.id)); }} className="w-3 h-3 cursor-pointer" style={{ accentColor: ac.primary }}/>
                      <span className="text-xs font-mono text-slate-300 truncate">{org.name}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSkipPush} className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-900 font-mono text-sm transition-colors">
                    Skip
                  </button>
                  <button onClick={handlePushUpdates} disabled={isPushingUpdates || selectedOrgsForUpdate.length === 0} className="flex-1 py-2 rounded-lg font-mono text-sm font-bold disabled:opacity-50 transition-all text-black" style={{ backgroundColor: ac.primary, boxShadow: `0 0 15px rgba(${ac.rgb}, 0.3)` }}>
                    {isPushingUpdates ? 'Pushing...' : `Deploy to ${selectedOrgsForUpdate.length}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {configLayout && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfigLayout(null)} />
            <div className="relative bg-black rounded-xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
                 <h3 className="text-white font-mono font-bold capitalize">{configLayout} Layout Settings</h3>
                 <button onClick={() => setConfigLayout(null)} className="text-slate-400 hover:text-white"><CloseIcon size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto darkwave-scrollbar flex-1">
                 {configLayout === 'card' ? (() => {
                    const isConn = cardConfigTab === 'connection';
                    const effectiveConnAppId = selectedConnectionAppId || (allMiniApps.length > 0 ? allMiniApps[0].id : '');
                    
                    const configKey = isConn ? 'connectionCardLayoutConfigs' : 'cardLayoutConfig';
                    
                    let config: any;
                    if (isConn) {
                        const configsMap = appSettings[configKey] || {};
                        config = configsMap[effectiveConnAppId] || { primary: ['', '', ''], secondary: ['', '', ''], useVisualizer: false, visualizerField: '' };
                    } else {
                        config = appSettings[configKey] || { primary: ['', '', ''], secondary: ['', '', ''], useVisualizer: false, visualizerField: '' };
                    }

                    const updateConfig = (updates: any) => {
                        if (isConn) {
                            const configsMap = appSettings[configKey] || {};
                            setAppSettings({ ...appSettings, [configKey]: { ...configsMap, [effectiveConnAppId]: { ...config, ...updates } } });
                        } else {
                            setAppSettings({ ...appSettings, [configKey]: { ...config, ...updates } });
                        }
                    };

                    let targetSchemaFields = fields;
                    if (isConn && effectiveConnAppId) {
                        const targetApp = allMiniApps.find(a => a.id === effectiveConnAppId);
                        const schema = targetApp?.schema_definition;
                        const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
                        targetSchemaFields = parsedSchema?.fields || [];
                    }

                    const availableFields = targetSchemaFields.filter((f: any) => !['split_separator', 'tabs', 'submenu'].includes(f.type));
                    const visFields = targetSchemaFields.filter((f: any) => f.type === 'visualizer_field');

                    return (
                       <div className="space-y-6">
                          <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                             <button onClick={() => setCardConfigTab('standard')} className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-colors ${!isConn ? '' : 'text-slate-400 hover:bg-white/5'}`} style={!isConn ? { backgroundColor: `rgba(${ac.rgb}, 0.2)`, color: ac.primary } : {}}>Standard Layout</button>
                             <button onClick={() => setCardConfigTab('connection')} className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-colors ${isConn ? '' : 'text-slate-400 hover:bg-white/5'}`} style={isConn ? { backgroundColor: `rgba(${ac.rgb}, 0.2)`, color: ac.primary } : {}}>Connections Layout</button>
                          </div>

                          {isConn && (
                              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in duration-200">
                                  <label className="text-sm text-slate-300 font-mono whitespace-nowrap">Target MiniApp:</label>
                                  <select 
                                      value={effectiveConnAppId} 
                                      onChange={e => setSelectedConnectionAppId(e.target.value)}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none transition-colors"
                                      onFocus={e => e.currentTarget.style.borderColor = ac.primary} 
                                      onBlur={e => e.currentTarget.style.borderColor = ''}
                                  >
                                      {allMiniApps.map(app => (
                                          <option key={app.id} value={app.id}>{app.name}</option>
                                      ))}
                                  </select>
                              </div>
                          )}
                          
                          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                             <h4 className="text-sm font-medium text-slate-300 mb-3 border-b border-slate-700 pb-2">Primary Fields (Top Half)</h4>
                             <p className="text-xs text-slate-500 mb-4">Select up to 3 fields to always display on the card. The first field acts as the card title.</p>
                             <div className="grid grid-cols-1 gap-3">
                                {[0,1,2].map(i => (
                                   <div key={`primary-${i}`} className="flex items-center gap-3">
                                      <span className="text-xs text-slate-500 font-mono w-6">{i+1}.</span>
                                      <select value={config.primary[i] || ''} onChange={e => { const newP = [...config.primary]; newP[i] = e.target.value; updateConfig({ primary: newP }); }} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none transition-colors" onFocus={e => e.currentTarget.style.borderColor = ac.primary} onBlur={e => e.currentTarget.style.borderColor = ''}>
                                         <option value="">-- None --</option>
                                         {availableFields.map((f: any) => <option key={f.id} value={f.name || f.id}>{f.name || 'Unnamed Field'}</option>)}
                                      </select>
                                   </div>
                                ))}
                             </div>
                          </div>

                          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                             <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                                <h4 className="text-sm font-medium text-slate-300">Expandable Section (Bottom Half)</h4>
                                <div className="flex items-center gap-2">
                                   <span className={`text-[10px] font-mono ${!config.useVisualizer ? 'text-cyan-400' : 'text-slate-500'}`}>Fields</span>
                                   <button onClick={() => updateConfig({ useVisualizer: !config.useVisualizer })} className={`w-8 h-4 rounded-full transition-colors relative ${config.useVisualizer ? 'bg-fuchsia-500' : 'bg-slate-600'}`}>
                                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${config.useVisualizer ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                   </button>
                                   <span className={`text-[10px] font-mono ${config.useVisualizer ? 'text-fuchsia-400' : 'text-slate-500'}`}>Visualizer</span>
                                </div>
                             </div>
                             <p className="text-xs text-slate-500 mb-4">Content displayed when a user clicks the down arrow on a card.</p>
                             
                             {config.useVisualizer ? (
                                <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg animate-in fade-in duration-200">
                                   <label className="block text-xs text-slate-400 mb-2">Select Visualizer Field</label>
                                   <select 
                                      value={config.visualizerField || ''} 
                                      onChange={e => {
                                          const fieldId = e.target.value;
                                          const def = visFields.find((f: any) => f.id === fieldId);
                                          updateConfig({ visualizerField: fieldId, visualizerFieldDef: def });
                                      }} 
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                                   >
                                      <option value="">-- Select a Visualizer --</option>
                                      {visFields.map((f: any) => <option key={f.id} value={f.id}>{f.name || 'Unnamed Visualizer'}</option>)}
                                   </select>
                                   {visFields.length === 0 && <p className="text-[10px] text-fuchsia-400/70 mt-2">No Visualizer fields found in this app's schema.</p>}
                                </div>
                             ) : (
                                <div className="grid grid-cols-1 gap-3 animate-in fade-in duration-200">
                                   {[0,1,2].map(i => (
                                      <div key={`secondary-${i}`} className="flex items-center gap-3">
                                         <span className="text-xs text-slate-500 font-mono w-6">{i+1}.</span>
                                         <select value={config.secondary[i] || ''} onChange={e => { const newS = [...config.secondary]; newS[i] = e.target.value; updateConfig({ secondary: newS }); }} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none transition-colors" onFocus={e => e.currentTarget.style.borderColor = ac.primary} onBlur={e => e.currentTarget.style.borderColor = ''}>
                                            <option value="">-- None --</option>
                                            {availableFields.map((f: any) => <option key={f.id} value={f.name || f.id}>{f.name || 'Unnamed Field'}</option>)}
                                         </select>
                                      </div>
                                   ))}
                                </div>
                             )}
                          </div>
                       </div>
                    );
                 })() : (
                    <div className="text-center text-slate-500 font-mono py-8">Advanced settings for {configLayout} layout coming soon.</div>
                 )}
              </div>
            </div>
          </div>
        )}

        <BulkFieldActions
          fields={fields}
          selectedFieldIds={selectedFieldIds}
          onFieldsChange={setFields}
          onSelectionChange={setSelectedFieldIds}
          onClearSelection={() => setSelectedFieldIds(new Set())}
          acColor={ac}
        />

        {/* ⚡ NEW: Unified Color Picker Modal */}
        {colorPickerTarget && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setColorPickerTarget(null)} />
            <div className="relative bg-black rounded-xl w-full max-w-md mx-4 overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95" style={{ borderColor: `rgba(${ac.rgb}, 0.5)` }}>
              <div className="p-4 border-b flex justify-between items-center bg-slate-900/50" style={{ borderColor: `rgba(${ac.rgb}, 0.2)` }}>
                <h3 className="text-white font-mono font-bold">Select Color</h3>
                <button onClick={() => setColorPickerTarget(null)} className="text-slate-400 hover:text-white"><CloseIcon size={20}/></button>
              </div>
              <div className="p-6 grid grid-cols-6 gap-3">
                {ACCENT_COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => {
                      if (colorPickerTarget.type === 'category') {
                        updateCategoryOption(colorPickerTarget.fieldId, colorPickerTarget.itemId, { color: color.hex });
                      } else {
                        updateTabOption(colorPickerTarget.fieldId, colorPickerTarget.itemId, { color: color.hex });
                      }
                      setColorPickerTarget(null);
                    }}
                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.hex, boxShadow: `0 0 10px rgba(${color.rgb}, 0.3)` }}
                    title={color.label}
                  >
                    {colorPickerTarget.currentColor === color.hex && <LucideIcons.Check size={20} className="text-black drop-shadow-md" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ⚡ NEW: Animated Preview Component for Dynamic Sim Charts
const DynamicSimPreview: React.FC<{ field: any }> = ({ field }) => {
  const min = field.settings?.dynamicSimMin ?? 0;
  const max = field.settings?.dynamicSimMax ?? 100;
  const [waveData, setWaveData] = useState<number[]>(Array(40).fill(min));
  const [currentVal, setCurrentVal] = useState<number>(min);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = Date.now();
    let current = min;
    let dir = 1;
    const step = (max - min) * 0.02 || 1;

    const animate = () => {
      const now = Date.now();
      // Update roughly every 50ms for a smooth but distinct "tick"
      if (now - lastTime > 50) {
        current += step * dir;
        if (current >= max) { current = max; dir = -1; }
        if (current <= min) { current = min; dir = 1; }

        setWaveData(prev => [...prev.slice(1), current]);
        setCurrentVal(current);
        
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [min, max]);

  return (
    <div className="w-full flex flex-col mt-2 pointer-events-none">
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
          <span className="text-[10px] font-mono text-fuchsia-400/70 tracking-wider">LIVE SYNC</span>
        </div>
        <span className="text-sm font-mono font-bold text-fuchsia-400">{currentVal.toFixed(2)}</span>
      </div>
      <div className="h-[60px] flex items-end gap-[2px] w-full overflow-hidden">
        {waveData.map((value, i) => {
          const heightPct = Math.min(100, Math.max(5, ((value - min) / (max - min || 1)) * 100));
          return (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-fuchsia-900/80 to-fuchsia-500/80 rounded-t"
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
      <div className="text-center mt-2 text-[9px] text-fuchsia-500/50 font-mono uppercase tracking-widest">
        {field.settings?.visualizerYAxisField || 'Referenced Value'}
      </div>
    </div>
  );
};

// Helper function to render field preview
function renderFieldPreview(field: BuildingBlock, allMiniApps: MiniApp[], ac?: any) {
  switch (field.type) {
    case 'text_field':
      return field.settings.multiline ? (
        <textarea className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs h-16 resize-none" placeholder="Enter text..." disabled />
      ) : (
        <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="Enter text..." disabled />
      );
    case 'phone_number_field':
      return (
        <div className="flex items-center gap-2">
          <PhoneIcon size={14} className="text-green-400" />
          <input type="tel" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="+1 (555) 123-4567" disabled />
        </div>
      );
    case 'email_address_field':
      return (
        <div className="flex items-center gap-2">
          <MailIcon size={14} className="text-purple-400" />
          <input type="email" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="email@example.com" disabled />
        </div>
      );
    case 'category_field':
      return (
        <div className="flex flex-wrap gap-1">
          {field.settings.categoryOptions?.slice(0, 3).map((opt) => (
            <span key={opt.id} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: opt.color }}>
              {opt.label || 'Option'}
            </span>
          ))}
          {(!field.settings.categoryOptions || field.settings.categoryOptions.length === 0) && (
            <span className="text-xs text-slate-500">No options defined</span>
          )}
        </div>
      );
    case 'user_field':
      return (
        <div className="flex items-center gap-2">
          <UserIcon size={14} className="text-orange-400" />
          <select className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" disabled>
            <option>Select user...</option>
          </select>
        </div>
      );
    case 'image_field':
      return (
        <div className="flex items-center gap-2 p-2 bg-slate-800 border border-slate-700 border-dashed rounded">
          <ImageIcon size={14} className="text-cyan-400" />
          <span className="text-xs text-slate-500">Click to upload image</span>
        </div>
      );
    case 'hyperlink_field':
      return (
        <div className="flex items-center gap-2">
          <LinkIcon size={14} className="text-indigo-400" />
          <input type="url" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="https://..." disabled />
        </div>
      );
    case 'number_field':
      return (
        <div className="flex items-center gap-2">
          <HashIcon size={14} className="text-yellow-400" />
          <input type="number" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder={`0.${'0'.repeat(field.settings.decimals || 0)}`} disabled />
        </div>
      );
    case 'location_field':
      return (
        <div className="flex items-center gap-2">
          <MapPinIcon size={14} className="text-red-400" />
          <input type="text" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="Enter address..." disabled />
        </div>
      );
    case 'date_field':
      return (
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className="text-teal-400" />
          <input type="date" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" disabled />
        </div>
      );
    case 'duration_field':
      return (
        <div className="flex items-center gap-2">
          <ClockIcon size={14} className="text-amber-400" />
          <span className="text-xs text-slate-400">
            {Object.entries(field.settings.durationUnits || {})
              .filter(([_, enabled]) => enabled)
              .map(([unit]) => unit.charAt(0).toUpperCase())
              .join(' : ') || 'H : M : S'}
          </span>
        </div>
      );
    case 'calculation_field':
      return (
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded">
          <SparklesIcon size={14} className="text-violet-400" />
          <span className="text-xs text-violet-300">AI Calculated Value</span>
        </div>
      );
    case 'connection_field':
      const connectedApps = field.settings.connectedMiniAppIds?.map(id => 
        allMiniApps.find(a => a.id === id)?.name
      ).filter(Boolean);
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranchIcon size={14} className="text-emerald-400" />
            <select className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" disabled>
              <option>Search connected records...</option>
            </select>
          </div>
          {connectedApps && connectedApps.length > 0 && (
            <div className="text-xs text-emerald-400">
              Links to: {connectedApps.join(', ')}
            </div>
          )}
        </div>
      );
    case 'integration_field':
      return (
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-lime-500/10 to-green-500/10 border border-lime-500/30 rounded">
          <WorkflowIcon size={14} className="text-lime-400" />
          <span className="text-xs text-lime-300 font-mono">
            {field.settings.integrationId ? '🔗 Active Integration Bound' : '⚡ Unconfigured Integration'}
          </span>
        </div>
      );
    case 'visualizer_field':
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-dashed border-fuchsia-500/40 rounded-lg gap-3">
          <div className="flex justify-between w-full">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {field.settings.visualizerChartType || 'bar'} Chart
            </span>
            <div className="flex bg-slate-900 rounded border border-slate-700 overflow-hidden">
              <span className={`px-2 py-0.5 text-[10px] font-mono ${field.settings.visualizerDefaultMode === '2D' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-slate-500'}`}>2D</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono ${field.settings.visualizerDefaultMode === '3D' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-slate-500'}`}>3D</span>
            </div>
          </div>
          {field.settings.visualizerChartType === 'dynamic' ? (
            <DynamicSimPreview field={field} />
          ) : (
            <>
              <LucideIcons.BarChart3 size={32} className="text-fuchsia-400/60" />
              <span className="text-xs text-fuchsia-300">
                {field.settings.visualizerSourceAppId ? 'Data Source Linked' : 'No Data Source Selected'}
              </span>
            </>
          )}
        </div>
      );
    case 'tabs': {
      // Get the active color (mocked to index 0 for the preview)
      const activeTabColor = field.settings?.tabOptions?.[0]?.color || ac?.primary || '#818cf8';
      
      // Helper to turn hex strings into 'R, G, B' formats for the rgba() dropshadows
      const hexToRgbStr = (hex: string) => {
        let c = String(hex).replace('#', '');
        if(c.length === 3) c = c.split('').map(char => char + char).join('');
        const r = parseInt(c.substring(0, 2), 16) || 99;
        const g = parseInt(c.substring(2, 4), 16) || 102;
        const b = parseInt(c.substring(4, 6), 16) || 241;
        return `${r}, ${g}, ${b}`;
      };

      const activeTabRgb = hexToRgbStr(activeTabColor);

      return (
        <div className="flex flex-col pt-2">
          <div className="flex w-full relative z-[2] px-2 pointer-events-none mb-0">
            {(field.settings?.tabOptions || []).map((t: any, idx: number) => {
              const isActive = idx === 0;
              const tabColor = t.color || ac?.primary || '#818cf8';
              const tabRgb = hexToRgbStr(tabColor);
              // Tinted inactive glow and bright active glow
              const activeGlow = isActive ? `0 0 15px rgba(${tabRgb}, 0.7), 0 0 5px rgba(${tabRgb}, 0.9)` : `0 0 5px rgba(${tabRgb}, 0.3)`;
              
              return (
                <div 
                  key={t.id} 
                  className="relative flex-1 flex items-center justify-center gap-2 pt-1.5 pb-1 pointer-events-auto -ml-2 first:ml-0 transition-all hover:brightness-125"
                  style={{
                    marginBottom: '-1px',
                    zIndex: isActive ? 10 : 5 - idx,
                    filter: `drop-shadow(${activeGlow})`
                  }}
                >
                  <div className="absolute inset-0 z-[-1]"
                       style={{
                         background: isActive ? `rgba(${tabRgb}, 0.4)` : `rgba(${tabRgb}, 0.1)`,
                         clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 100%, 0 100%)'
                       }}>
                    <div className="absolute inset-[1px] bottom-0 bg-slate-900"
                         style={{
                           clipPath: 'polygon(11px 0, calc(100% - 11px) 0, 100% 100%, 0 100%)'
                         }} />
                  </div>
                  <span className="relative z-10 text-xs font-mono font-bold whitespace-nowrap transition-colors truncate px-2" 
                        style={{ 
                          color: tabColor,
                          opacity: isActive ? 1 : 0.5,
                          filter: isActive ? 'brightness(1.3)' : 'none',
                          textShadow: isActive ? `0 0 12px rgba(${tabRgb}, 1), 0 0 24px rgba(${tabRgb}, 0.8)` : 'none'
                        }}>
                    {t.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* ⚡ FIX: Applied dynamic gradient background utilizing activeTabRgb */}
          <div className="flex-1 p-4 sm:p-6 border rounded-lg rounded-tl-none min-h-[100px] overflow-y-auto darkwave-scrollbar relative z-[1]"
               style={{ 
                 borderColor: `rgba(${activeTabRgb}, 0.5)`,
                 background: `linear-gradient(135deg, rgba(${activeTabRgb}, 0.1), rgba(0,0,0,0.6))`,
                 boxShadow: `0 0 20px rgba(${activeTabRgb}, 0.15) inset` 
               }}>
            <div className="flex items-center justify-center h-full">
               <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <LayoutIcon size={12} /> Tabbed Content Area
               </span>
            </div>
          </div>
        </div>
      );
    }
    default:
      return <span className="text-xs text-slate-500">Preview not available</span>;
  }
}

export default MiniAppBuilder;