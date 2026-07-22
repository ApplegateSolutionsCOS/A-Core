import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  PlusIcon, SearchIcon, FilterIcon, SortIcon, EditIcon, TrashIcon,
  ChevronLeftIcon, FileIcon, SettingsIcon, GitBranchIcon, ChevronDownIcon,
  LinkIcon, CloseIcon, TableIcon, CardLayoutIcon, BadgeIcon, CalendarIcon,
  ChevronRightIcon, EyeIcon, CheckboxIcon, PopoutIcon, Share2Icon,
  MessageIcon, SendIcon, UploadIcon, DownloadIcon, BellIcon, WorkflowIcon,
  EyeOffIcon, UsersIcon, MaximizeIcon
} from '@/components/icons/Icons';
import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';
import { WorkspaceSlug } from '@/types';
import MiniAppAdvancedSettings from './MiniAppAdvancedSettings';
import RecordComments from './RecordComments';
import RecordAttachments from './RecordAttachments';
import ViewPane, { ViewFilter, ViewSort } from './ViewPane';
import LeftSlidePanel from '@/components/navigation/LeftSlidePanel'; // ⚡ FIXED IMPORT
import { InlineActivityPanel } from '@/components/toolbar/ToolbarPanels'; // ⚡ ADD THIS IMPORT
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { ChartNetwork, MessageSquare, MessagesSquare, Activity, CheckSquare, Mail, Megaphone, LayoutDashboard } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';

// Helper to safely map lowercase DB icon strings to Lucide's PascalCase exports
const resolveAppIcon = (iconStr: string | null | undefined, appName: string) => {
  if (!iconStr) return getMiniAppIcon(appName);
  const pascalIcon = iconStr.charAt(0).toUpperCase() + iconStr.slice(1);
  return (LucideIcons as any)[pascalIcon] || getMiniAppIcon(appName);
};

// Inline icons for bulk actions
const CheckSquareIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 16, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);
const SquareIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 16, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
);
const TagIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 16, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
);
const PaperclipIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 16, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
);

type LayoutType = 'table' | 'card' | 'badge' | 'calendar';

interface MiniAppViewProps {
  appName: string;
  workspaceSlug: WorkspaceSlug;
  workspaceId?: string;
  isAdmin: boolean;
  onBack: () => void;
  availableLayouts?: LayoutType[];
  initialAddRecord?: boolean;
  onEditTemplate?: (appName: string, exactAppId?: string) => void; // ⚡ Added exactAppId
  isGlobalAddMode?: boolean;
  onGlobalAddClose?: () => void;
}

const getConnectedItems = (record: Record<string, any>): { appName: string; items: string[] }[] => {
  const connections: { appName: string; items: string[] }[] = [];
  Object.entries(record).forEach(([key, value]) => {
    if (key.startsWith('connected') && Array.isArray(value) && value.length > 0) {
      connections.push({ appName: key.replace('connected', ''), items: value });
    }
  });
  return connections;
};

const LAYOUT_ICONS: Record<string, React.FC<any>> = { table: TableIcon, card: CardLayoutIcon, badge: BadgeIcon, calendar: CalendarIcon };

// ─── CSV Utilities ───
const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return '';
  
  // Safely handle arrays/objects without getting [object Object]
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const exportToCSV = (data: Record<string, any>[], columns: string[], fileName: string) => {
  try {
    const header = columns.map(c => escapeCSV(c)).join(',');
    const rows = data.map(row => columns.map(col => escapeCSV(row[col])).join(','));
    const csv = [header, ...rows].join('\n');
    
    // Add BOM (\uFEFF) to ensure Excel reads UTF-8 correctly
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const finalFileName = `${(fileName || 'export').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', finalFileName);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Fallback for strict Web IDE iframes (StackBlitz, CodeSandbox, etc.)
    if (window !== window.parent) {
      setTimeout(() => {
        const win = window.open('', '_blank');
        if (win) {
          // Inject raw CSV text into a new tab so the user can easily Ctrl+S / Cmd+S
          win.document.title = finalFileName;
          win.document.body.style.margin = '0';
          win.document.body.style.background = '#0a0a0a';
          win.document.body.style.color = '#d4d4d4';
          const safeCsv = csv.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          win.document.write(`<pre style="padding: 20px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;">${safeCsv}</pre>`);
          win.document.close();
        }
      }, 100);
    }

    // Delay cleanup to ensure the browser registers the download intent
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
  } catch (err) {
    console.error("Export to CSV failed: ", err);
  }
};

const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
};

// Helper to turn hex strings into 'R, G, B' formats
const hexToRgbStr = (hex: string) => {
  if (!hex) return '148, 163, 184'; // Default slate-400 fallback
  let c = String(hex).replace('#', '');
  if(c.length === 3) c = c.split('').map(char => char + char).join('');
  const r = parseInt(c.substring(0, 2), 16) || 99;
  const g = parseInt(c.substring(2, 4), 16) || 102;
  const b = parseInt(c.substring(4, 6), 16) || 241;
  return `${r}, ${g}, ${b}`;
};

// ============================================
// DYNAMIC SIMULATION INPUT ENGINE
// ============================================
const DynamicSimulationInput: React.FC<{ fieldDef: any, onChange: (val: string) => void, currentValue: string, baseColor?: string, baseRgb?: string }> = ({ fieldDef, onChange, currentValue, baseColor = '#f59e0b', baseRgb = '245, 158, 11' }) => {
  const min = fieldDef.settings?.dynamicSimMin ?? 0;
  const max = fieldDef.settings?.dynamicSimMax ?? 100;
  
  const [displayValue, setDisplayValue] = useState(Number(currentValue) || min);
  const valRef = useRef(displayValue);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let lastSync = Date.now();
    let animationId: number;
    let direction = 1;
    // Base the step off the range, e.g., 2% per frame update, fallback to 1 if misconfigured
    const step = (max - min) * 0.02 || 1;

    const animate = () => {
      valRef.current += step * direction;

      if (valRef.current >= max) { 
        valRef.current = max; 
        direction = -1; 
      }
      if (valRef.current <= min) { 
        valRef.current = min; 
        direction = 1; 
      }

      const decimals = fieldDef.settings?.decimals ?? 1;
      const formattedValue = Number(valRef.current.toFixed(decimals));
      
      setDisplayValue(formattedValue);

      // Throttle sync to parent to avoid rendering the whole form 60x a second
      if (Date.now() - lastSync > 500) {
        onChangeRef.current(String(formattedValue));
        lastSync = Date.now();
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
      onChangeRef.current(String(valRef.current));
    };
  }, [fieldDef.settings?.decimals, min, max]); 

  return (
      <div className="relative w-full">
        <input 
          type="number" 
          value={displayValue} 
          readOnly 
          disabled
          className="w-full bg-gray-900/40 border rounded-lg px-4 py-2 font-mono focus:outline-none cursor-not-allowed transition-colors" 
          style={{ color: baseColor, borderColor: `rgba(${baseRgb}, 0.3)` }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <Activity size={14} className="animate-pulse" style={{ color: baseColor }} />
          <span className="text-[9px] uppercase tracking-wider font-mono" style={{ color: `rgba(${baseRgb}, 0.7)` }}>Qubit θ</span>
        </div>
      </div>
  );
};


// ============================================
// VISUALIZER CHART ENGINE
// Supports: Real Time / 5s / 10s / 30s / 1min sync intervals
// Supports: 2D & 3D interactive rendering (click for historical snapshots)
// Supports: Live chart type switching (Bar / Line / Pie / Scatter / Dynamic)
// ============================================
type SyncInterval = 'realtime' | '5s' | '10s' | '30s' | '1m';
type ChartKind = 'bar' | 'line' | 'pie' | 'scatter' | 'dynamic';

const SYNC_OPTIONS: { id: SyncInterval; label: string; ms: number }[] = [
  { id: 'realtime', label: 'Real Time', ms: 1000 },
  { id: '5s', label: '5 Seconds', ms: 5000 },
  { id: '10s', label: '10 Seconds', ms: 10000 },
  { id: '30s', label: '30 Seconds', ms: 30000 },
  { id: '1m', label: '1 min', ms: 60000 },
];

const CHART_TYPE_OPTIONS: { id: ChartKind; label: string; icon: keyof typeof LucideIcons }[] = [
  { id: 'bar', label: 'Bar', icon: 'BarChart3' },
  { id: 'line', label: 'Line', icon: 'LineChart' },
  { id: 'pie', label: 'Pie', icon: 'PieChart' },
  { id: 'scatter', label: 'Scatter', icon: 'ScatterChart' },
  { id: 'dynamic', label: 'Dynamic', icon: 'Activity' },
];

// Pie slice color palette (fuchsia-leaning to match theme)
const PIE_COLORS = ['#d946ef', '#06b6d4', '#a855f7', '#ec4899', '#8b5cf6', '#22d3ee', '#f472b6', '#c084fc', '#e879f9', '#67e8f9', '#f0abfc', '#a5f3fc'];

interface HistorySnapshot {
  timestamp: number;
  value: number;
  label?: string;
}

const LOAD_BANDS = [0, 20, 40, 60, 80, 100]; // Y-Axis: Turbine Load %
const TIME_STEPS = 20; // X-Axis: Time history

// ============================================
// DYNAMIC PLOTLY WRAPPER (Bypasses Vite Build Errors)
// ============================================
const DynamicPlotly: React.FC<{ data: any; layout: any; config?: any; style?: React.CSSProperties }> = ({ data, layout, config, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).Plotly) {
      setIsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (isLoaded && containerRef.current && (window as any).Plotly) {
      (window as any).Plotly.react(containerRef.current, data, layout, config);
    }
  }, [isLoaded, data, layout, config]);

  return (
    <div className="w-full h-full relative" style={style}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-cyan-400 font-mono text-xs animate-pulse">
          Initializing 3D Engine...
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

const useTurbineSimulator = (isActive: boolean) => {
  const [zData, setZData] = useState<number[][]>(
    LOAD_BANDS.map(() => Array(TIME_STEPS).fill(0))
  );
  const timeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      timeRef.current += 0.2;
      
      setZData((prevZ) => {
        return LOAD_BANDS.map((load, yIndex) => {
          const rowHistory = [...prevZ[yIndex].slice(1)];
          // Base temp + load factor + rolling variance + noise
          const baseTemp = 300; 
          const loadHeat = load * 4.5; 
          const variance = Math.sin(timeRef.current + yIndex) * 50; 
          const noise = Math.random() * 15;
          rowHistory.push(baseTemp + loadHeat + variance + noise);
          return rowHistory;
        });
      });
    }, 500); // 500ms update rate

    return () => clearInterval(interval);
  }, [isActive]);

  return {
    x: Array.from({ length: TIME_STEPS }, (_, i) => `t-${TIME_STEPS - 1 - i}`),
    y: LOAD_BANDS.map(b => `${b}%`),
    z: zData
  };
};

const VisualizerChart: React.FC<{ fieldDef: any; currentData?: any; baseColor?: string; baseRgb?: string }> = ({ fieldDef, currentData, baseColor = '#d946ef', baseRgb = '217, 70, 239' }) => {
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [targetRecordName, setTargetRecordName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentDataRef = useRef(currentData);
  useEffect(() => { currentDataRef.current = currentData; }, [currentData]);

  const isInitialFetch = useRef(true);
  const initialType: ChartKind = (fieldDef.settings?.visualizerChartType as ChartKind) || 'bar';

  // ⚡ Live chart type (can be switched without leaving)
  const [chartType, setChartType] = useState<ChartKind>(initialType);
  const isDynamic = chartType === 'dynamic';

  // ⚡ Sync + display state
  const [syncInterval, setSyncInterval] = useState<SyncInterval>(isDynamic ? 'realtime' : '5s');
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>(fieldDef.settings?.visualizerDefaultMode || '2D');

  // ⚡ Dynamic Wave State
  const [dynamicWave, setDynamicWave] = useState<number[]>(Array(40).fill(0));
  const [currentDynamicVal, setCurrentDynamicVal] = useState<number>(0);
  const baseValueRef = useRef<number>(0);

  // ⚡ History tracking (for interactive click-to-inspect)
  const historyRef = useRef<HistorySnapshot[]>([]);
  const MAX_HISTORY = 200;
  const [selectedSnapshot, setSelectedSnapshot] = useState<HistorySnapshot | null>(null);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  // ⚡ Download / export
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // ⚡ Call our new 3D Turbine Simulator (only active if Dynamic and 3D are selected)
  const { x: simX, y: simY, z: simZ } = useTurbineSimulator(isDynamic && viewMode === '3D');

  // ⚡ MOVED PLOTLY MEMOS HERE (Must be safely above the early return statements below!)
  const plotlyLayout = React.useMemo(() => ({
    uirevision: 'true', // Locks camera/zoom state
    autosize: true,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { l: 10, r: 10, b: 10, t: 10 },
    dragmode: 'turntable',
    scene: {
      xaxis: { title: 'Time', color: baseColor, gridcolor: '#1e293b', titlefont: { size: 10 } },
      yaxis: { title: 'Load', color: baseColor, gridcolor: '#1e293b', titlefont: { size: 10 } },
      zaxis: { title: 'Temp °C', color: baseColor, gridcolor: '#1e293b', titlefont: { size: 10 } },
      aspectratio: { x: 1, y: 1, z: 0.75 }
    }
  }), [baseColor]);

  const plotlyConfig = React.useMemo(() => ({
    displayModeBar: false,
    scrollZoom: true
  }), []);

  const currentSyncMs = SYNC_OPTIONS.find(s => s.id === syncInterval)?.ms || 1000;


  // 1. DATA FETCHING EFFECT
  useEffect(() => {
    let isMounted = true;

    const fetchAndProcessData = async () => {
      const {
        visualizerSourceAppId,
        visualizerXAxisField,
        visualizerYAxisField,
        visualizerYAxisOperator,
        visualizerYAxisField2,
      } = fieldDef.settings || {};

      // ⚡ FIX: Skip the X-Axis requirement if the chart is dynamic
      if (!visualizerSourceAppId || (!isDynamic && !visualizerXAxisField) || !visualizerYAxisField) {
        if (isMounted) setChartData([]);
        return;
      }

      if (isInitialFetch.current) setLoading(true);

      try {
        const { data: records, error } = await supabase.schema('app_private')
          .from('mini_app_records')
          .select('id, item_uid, data')
          .eq('mini_app_id', visualizerSourceAppId);

        if (error) throw error;

        if (records && isMounted) {
          const getVal = (obj: any, key: string) => {
            if (obj[key] !== undefined) return obj[key];
            const lowerKey = String(key).toLowerCase();
            const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
            return foundKey ? obj[foundKey] : undefined;
          };

          if (isDynamic) {
            let selectedVals: string[] = [];
            if (currentDataRef.current) {
              Object.values(currentDataRef.current).forEach((val: any) => {
                if (Array.isArray(val)) selectedVals.push(...val.map(String));
                else if (val) selectedVals.push(String(val));
              });
            }
            
            let targetRecord = records.find(r => selectedVals.includes(r.item_uid) || selectedVals.includes(r.id));
            if (!targetRecord) targetRecord = records[0];

            if (targetRecord) {
              const data = typeof targetRecord.data === 'string' ? JSON.parse(targetRecord.data) : (targetRecord.data || {});
              const yVal = Number(getVal(data, visualizerYAxisField)) || 0;
              baseValueRef.current = yVal;
              
              const recordName = data.name || data.Name || data.title || data.Title || targetRecord.item_uid;
              setTargetRecordName(recordName);
              
              setChartData([{ label: recordName || 'Live Data', value: yVal }]);
            } else {
              baseValueRef.current = 0;
              setTargetRecordName(null);
              setChartData([]);
            }
          } else {
            const aggregated: Record<string, number> = {};
            records.forEach(r => {
              const data = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});

              const xRaw = getVal(data, visualizerXAxisField);
              if (xRaw === undefined || xRaw === null || xRaw === '') return;
              const xValue = String(xRaw);

              const getNum = (fieldName: string) => {
                const val = getVal(data, fieldName);
                const num = Number(val);
                return isNaN(num) ? 0 : num;
              };

              let yValue = getNum(visualizerYAxisField);

              if (visualizerYAxisOperator && visualizerYAxisOperator !== 'none' && visualizerYAxisField2) {
                const y2 = getNum(visualizerYAxisField2);
                switch (visualizerYAxisOperator) {
                  case 'add': yValue += y2; break;
                  case 'subtract': yValue -= y2; break;
                  case 'multiply': yValue *= y2; break;
                  case 'divide': yValue = y2 !== 0 ? yValue / y2 : yValue; break;
                }
              }

              aggregated[xValue] = (aggregated[xValue] || 0) + yValue;
            });

            const parsed = Object.entries(aggregated)
              .map(([label, value]) => ({ label: label.substring(0, 20), value }))
              .sort((a, b) => b.value - a.value);

            setChartData(parsed);

            // Store snapshot of overall total for history (static charts)
            const totalNow = parsed.reduce((s, d) => s + d.value, 0);
            historyRef.current = [
              ...historyRef.current.slice(-(MAX_HISTORY - 1)),
              { timestamp: Date.now(), value: totalNow, label: 'Total' },
            ];
          }
        }
      } catch (e) {
        console.error('Error fetching chart data:', e);
      } finally {
        isInitialFetch.current = false;
        if (isMounted) setLoading(false);
      }
    };

    fetchAndProcessData();

    // ⚡ Sync interval controls re-fetch from DB
    const interval = setInterval(fetchAndProcessData, currentSyncMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fieldDef.settings, isDynamic, currentSyncMs]);

  // 2. ⚡ DYNAMIC WAVE ANIMATION EFFECT
  useEffect(() => {
    if (!isDynamic) return;

    let animationFrameId: number;
    let lastTime = Date.now();
    let lastFrozenTime = Date.now();
    let frozenData: number[] | null = null;
    
    const min = fieldDef.settings?.dynamicSimMin ?? 0;
    const max = fieldDef.settings?.dynamicSimMax ?? 100;
    const step = (max - min) * 0.02 || 1;
    
    let currentWaveVal = min;
    let dir = 1;

    const animate = () => {
      const now = Date.now();
      const shouldAdvance = syncInterval === 'realtime' || (now - lastFrozenTime >= currentSyncMs);

      if (now - lastTime > 50) {
        if (shouldAdvance || !frozenData) {
          
          // Generate the continuous ping-pong wave based on user settings
          currentWaveVal += step * dir;
          if (currentWaveVal >= max) { currentWaveVal = max; dir = -1; }
          if (currentWaveVal <= min) { currentWaveVal = min; dir = 1; }

          // The final visual value combines the user's start/stop generation AND the target record's base value
          const base = baseValueRef.current || 0;
          const finalVal = currentWaveVal + base;

          setDynamicWave(prev => {
            const nextData = [...prev.slice(1), finalVal];
            if (syncInterval !== 'realtime') {
              frozenData = nextData;
              lastFrozenTime = now;
            }
            return nextData;
          });
          
          setCurrentDynamicVal(finalVal);

          // Track history for click-to-inspect
          historyRef.current = [
            ...historyRef.current.slice(-(MAX_HISTORY - 1)),
            { timestamp: now, value: finalVal },
          ];
        }
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDynamic, syncInterval, currentSyncMs, fieldDef.settings?.dynamicSimMin, fieldDef.settings?.dynamicSimMax]);

  // ⚡ FIX: Skip the X-Axis requirement if the chart is dynamic
  if (!fieldDef.settings?.visualizerSourceAppId || (!isDynamic && !fieldDef.settings?.visualizerXAxisField) || !fieldDef.settings?.visualizerYAxisField) {
    return <div className="text-xs text-slate-500 italic p-4 border border-dashed border-slate-700/50 rounded-lg text-center w-full">Visualizer configuration incomplete.</div>;
  }

  if (loading) return <div className="mt-2 h-32 w-full flex items-center justify-center border border-dashed rounded-xl bg-black/20" style={{ borderColor: `rgba(${baseRgb}, 0.3)` }}><span className="text-xs font-mono animate-pulse" style={{ color: `rgba(${baseRgb}, 0.5)` }}>Calculating Data...</span></div>;

  const maxVal = Math.max(...chartData.map(d => Math.abs(d.value)), 1);
  const is3D = viewMode === '3D';

  // Find historical snapshot closest to a wave bar index (for click-to-inspect)
  const getHistoricalForWaveIdx = (idx: number): HistorySnapshot | null => {
    const hist = historyRef.current;
    if (hist.length === 0) return null;
    // Map wave idx 0..39 to the last 40 history entries
    const histOffset = Math.max(0, hist.length - 40);
    const targetIdx = histOffset + idx;
    return hist[Math.min(targetIdx, hist.length - 1)] || null;
  };

  const handleWaveClick = (idx: number, value: number) => {
    const snap = getHistoricalForWaveIdx(idx) || { timestamp: Date.now(), value };
    setSelectedSnapshot({ ...snap, value });
    setSelectedBarIdx(idx);
  };

  const handlePointClick = (idx: number, d: { label: string; value: number }) => {
    setSelectedSnapshot({ timestamp: Date.now(), value: d.value, label: d.label });
    setSelectedBarIdx(idx);
  };

  // ⚡ Export helpers — CSV / PNG snapshot of current chart
  const chartTitle = (fieldDef.settings?.visualizerYAxisLabel || fieldDef.settings?.visualizerYAxisField || 'Visualizer').toString() + (targetRecordName ? ` | ${targetRecordName}` : '');
  const safeFilename = chartTitle.replace(/[^a-zA-Z0-9]/g, '_') + `_${chartType}_${new Date().toISOString().split('T')[0]}`;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportVisualizerCSV = () => {
    const xLabel = (fieldDef.settings?.visualizerXAxisLabel || fieldDef.settings?.visualizerXAxisField || 'Label').toString();
    const yLabel = chartTitle;
    const header = `${escapeCSV(xLabel)},${escapeCSV(yLabel)}`;
    let rows: string[] = [];
    if (chartType === 'dynamic') {
      // Export the current 40-sample wave as time-ordered rows
      rows = dynamicWave.map((v, i) => `${escapeCSV(`t-${39 - i}`)},${escapeCSV(v)}`);
    } else {
      rows = chartData.map(d => `${escapeCSV(d.label)},${escapeCSV(d.value)}`);
    }
    const csv = [header, ...rows].join('\n');
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${safeFilename}.csv`);
    setShowDownloadMenu(false);
  };

  // Build a standalone SVG string representing the current chart for PNG export.
  // This works universally — for HTML-based bar/dynamic charts, we synthesize an SVG.
  const buildExportSvg = (): { svg: string; width: number; height: number } => {
    const W = 800;
    const H = 400;
    const PAD = 40;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const bg = '<rect width="100%" height="100%" fill="#0a0a0a"/>';
    const titleSvg = `<text x="${W / 2}" y="24" text-anchor="middle" font-family="monospace" font-size="14" fill="${baseColor}" font-weight="bold">${escapeXml(chartTitle)} · ${chartType.toUpperCase()} · ${viewMode}</text>`;

    let body = '';

    if (chartType === 'dynamic') {
      const data = dynamicWave;
      const base = baseValueRef.current || 0;
      const min = (fieldDef.settings?.dynamicSimMin ?? 0) + base;
      const max = (fieldDef.settings?.dynamicSimMax ?? 100) + base;
      const barW = innerW / data.length;
      body = data.map((v, i) => {
        const hPct = Math.min(1, Math.max(0.05, (v - min) / (max - min || 1)));
        const h = hPct * innerH;
        const x = PAD + i * barW;
        const y = PAD + innerH - h;
        return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(barW - 1).toFixed(2)}" height="${h.toFixed(2)}" fill="${baseColor}" opacity="0.85"/>`;
      }).join('');
    } else if (chartData.length === 0) {
      body = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="monospace" font-size="12" fill="#666">No data</text>`;
    } else if (chartType === 'pie') {
      const cx = W / 2, cy = H / 2 + 10;
      const r = Math.min(innerW, innerH) / 2 - 20;
      const total = chartData.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
      let acc = 0;
      body = chartData.map((d, i) => {
        const v = Math.max(0, d.value);
        const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += v;
        const a2 = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const large = a2 - a1 > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
        return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${PIE_COLORS[i % PIE_COLORS.length]}" stroke="#000" stroke-width="1"/>`;
      }).join('');
    } else if (chartType === 'line') {
      const step = chartData.length > 1 ? innerW / (chartData.length - 1) : 0;
      const pts = chartData.map((d, i) => {
        const x = PAD + i * step;
        const y = PAD + innerH - (Math.max(0, d.value) / maxVal) * innerH;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      body =
        `<polyline points="${pts.join(' ')}" fill="none" stroke="${baseColor}" stroke-width="2"/>` +
        chartData.map((d, i) => {
          const x = PAD + i * step;
          const y = PAD + innerH - (Math.max(0, d.value) / maxVal) * innerH;
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="${baseColor}"/>`;
        }).join('');
    } else if (chartType === 'scatter') {
      const step = chartData.length > 1 ? innerW / (chartData.length - 1) : innerW / 2;
      body = chartData.map((d, i) => {
        const x = PAD + (chartData.length > 1 ? i * step : innerW / 2);
        const y = PAD + innerH - (Math.max(0, d.value) / maxVal) * innerH;
        const size = Math.max(3, Math.min(12, 3 + (d.value / maxVal) * 9));
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${size.toFixed(2)}" fill="${baseColor}" fill-opacity="0.7" stroke="${baseColor}"/>`;
      }).join('');
    } else {
      // Bar chart
      const barW = innerW / chartData.length;
      body = chartData.map((d, i) => {
        const v = Math.max(0, d.value);
        const h = (v / maxVal) * innerH;
        const x = PAD + i * barW + barW * 0.15;
        const y = PAD + innerH - h;
        const w = barW * 0.7;
        return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${baseColor}" opacity="0.85"/>` +
               `<text x="${(x + w / 2).toFixed(2)}" y="${(PAD + innerH + 14).toFixed(2)}" text-anchor="middle" font-family="monospace" font-size="10" fill="#aaa">${escapeXml(String(d.label).substring(0, 12))}</text>`;
      }).join('');
    }

    const axis = chartType === 'pie' || chartType === 'dynamic' ? '' :
      `<line x1="${PAD}" y1="${PAD + innerH}" x2="${W - PAD}" y2="${PAD + innerH}" stroke="#444" stroke-width="1"/>` +
      `<line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${PAD + innerH}" stroke="#444" stroke-width="1"/>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      bg + titleSvg + axis + body +
      `</svg>`;
    return { svg, width: W, height: H };
  };

  const escapeXml = (s: string) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const exportVisualizerPNG = () => {
    try {
      const { svg, width, height } = buildExportSvg();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const scale = 2; // retina-quality
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); return; }
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(pngBlob => {
          URL.revokeObjectURL(url);
          if (pngBlob) triggerDownload(pngBlob, `${safeFilename}.png`);
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); };
      img.src = url;
    } catch (err) {
      console.error('PNG export failed:', err);
    }
    setShowDownloadMenu(false);
  };


  // ─── SVG Chart Renderers ───
  const renderLineChart = () => {
    if (chartData.length === 0) return null;
    const W = 600;
    const H = 160;
    const PAD_X = 20;
    const PAD_Y = 12;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2;
    const step = chartData.length > 1 ? innerW / (chartData.length - 1) : 0;
    const points = chartData.map((d, i) => {
      const x = PAD_X + i * step;
      const y = PAD_Y + innerH - (Math.max(0, d.value) / maxVal) * innerH;
      return { x, y, d, i };
    });
    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${PAD_X},${PAD_Y + innerH} ${polyline} ${PAD_X + (chartData.length - 1) * step},${PAD_Y + innerH}`;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40 overflow-visible">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={baseColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={baseColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Baseline grid */}
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={PAD_X} x2={W - PAD_X} y1={PAD_Y + innerH * t} y2={PAD_Y + innerH * t} stroke={`rgba(${baseRgb},0.1)`} strokeDasharray="2 3" />
        ))}
        {/* Area fill */}
        <polygon points={area} fill="url(#lineFill)" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke={baseColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px rgba(${baseRgb},0.6))` }} />
        {/* Interactive points */}
        {points.map(p => {
          const isSel = selectedBarIdx === p.i;
          return (
            <g key={p.i} style={{ cursor: 'pointer' }} onClick={() => handlePointClick(p.i, p.d)}>
              <circle cx={p.x} cy={p.y} r={isSel ? 7 : 12} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={isSel ? 5 : 3.5} fill={isSel ? '#facc15' : baseColor} stroke={isSel ? '#fde68a' : '#fff'} strokeWidth={isSel ? 2 : 1} style={{ filter: isSel ? 'drop-shadow(0 0 6px rgba(250,204,21,0.8))' : `drop-shadow(0 0 3px rgba(${baseRgb},0.8))` }}>
                <title>{`${p.d.label}: ${p.d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderPieChart = () => {
    if (chartData.length === 0) return null;
    const total = chartData.reduce((s, d) => s + Math.max(0, d.value), 0);
    if (total <= 0) return <div className="w-full h-40 flex items-center justify-center text-xs font-mono" style={{ color: `rgba(${baseRgb}, 0.5)` }}>No positive values to plot</div>;
    const W = 400;
    const H = 160;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2 - 8;
    let acc = 0;
    const slices = chartData.map((d, i) => {
      const v = Math.max(0, d.value);
      const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += v;
      const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const midAngle = (startAngle + endAngle) / 2;
      const labelX = cx + (r * 0.6) * Math.cos(midAngle);
      const labelY = cy + (r * 0.6) * Math.sin(midAngle);
      return { path, d, i, color: PIE_COLORS[i % PIE_COLORS.length], pct: (v / total) * 100, labelX, labelY };
    });

    return (
      <div className="w-full h-40 flex items-center gap-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full flex-shrink-0" style={{ maxWidth: '60%' }}>
          {slices.map(s => {
            const isSel = selectedBarIdx === s.i;
            return (
              <g key={s.i} style={{ cursor: 'pointer', transformOrigin: `${cx}px ${cy}px`, transform: isSel ? 'scale(1.05)' : 'scale(1)', transition: 'transform 150ms' }} onClick={() => handlePointClick(s.i, s.d)}>
                <path d={s.path} fill={isSel ? '#facc15' : s.color} stroke="#000" strokeWidth="1.5" style={{ filter: isSel ? 'drop-shadow(0 0 8px rgba(250,204,21,0.8))' : `drop-shadow(0 0 3px rgba(${baseRgb},0.3))` }}>
                  <title>{`${s.d.label}: ${s.d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${s.pct.toFixed(1)}%)`}</title>
                </path>
                {s.pct > 6 && (
                  <text x={s.labelX} y={s.labelY} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontFamily="monospace" fill="#000" fontWeight="bold" pointerEvents="none">
                    {s.pct.toFixed(0)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div className="flex-1 min-w-0 overflow-y-auto max-h-full darkwave-scrollbar">
          <div className="flex flex-col gap-1">
            {slices.slice(0, 10).map(s => {
              const isSel = selectedBarIdx === s.i;
              return (
                <button key={s.i} type="button" onClick={() => handlePointClick(s.i, s.d)} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono text-left transition-colors ${isSel ? 'bg-yellow-500/20 text-yellow-200' : 'hover:bg-white/5 text-slate-300'}`}>
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: isSel ? '#facc15' : s.color }} />
                  <span className="truncate flex-1">{s.d.label}</span>
                  <span className="text-slate-500">{s.pct.toFixed(1)}%</span>
                </button>
              );
            })}
            {slices.length > 10 && <span className="text-[9px] text-slate-600 font-mono px-2">+{slices.length - 10} more</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderScatterChart = () => {
    if (chartData.length === 0) return null;
    const W = 600;
    const H = 160;
    const PAD_X = 24;
    const PAD_Y = 12;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2;
    const step = chartData.length > 1 ? innerW / (chartData.length - 1) : innerW / 2;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40 overflow-visible">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={`h-${t}`} x1={PAD_X} x2={W - PAD_X} y1={PAD_Y + innerH * t} y2={PAD_Y + innerH * t} stroke={`rgba(${baseRgb},0.08)`} strokeDasharray="2 3" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={`v-${t}`} y1={PAD_Y} y2={H - PAD_Y} x1={PAD_X + innerW * t} x2={PAD_X + innerW * t} stroke={`rgba(${baseRgb},0.06)`} strokeDasharray="2 3" />
        ))}
        {/* Axes */}
        <line x1={PAD_X} y1={H - PAD_Y} x2={W - PAD_X} y2={H - PAD_Y} stroke={`rgba(${baseRgb},0.3)`} strokeWidth="1" />
        <line x1={PAD_X} y1={PAD_Y} x2={PAD_X} y2={H - PAD_Y} stroke={`rgba(${baseRgb},0.3)`} strokeWidth="1" />
        {/* Points */}
        {chartData.map((d, i) => {
          const x = PAD_X + (chartData.length > 1 ? i * step : innerW / 2);
          const y = PAD_Y + innerH - (Math.max(0, d.value) / maxVal) * innerH;
          const isSel = selectedBarIdx === i;
          const size = Math.max(3, Math.min(10, 3 + (d.value / maxVal) * 7));
          return (
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => handlePointClick(i, d)}>
              <circle cx={x} cy={y} r={size + 10} fill="transparent" />
              <circle cx={x} cy={y} r={isSel ? size + 2 : size} fill={isSel ? '#facc15' : baseColor} fillOpacity={isSel ? 1 : 0.7} stroke={isSel ? '#fde68a' : baseColor} strokeWidth={isSel ? 2 : 1} style={{ filter: isSel ? 'drop-shadow(0 0 8px rgba(250,204,21,0.9))' : `drop-shadow(0 0 4px rgba(${baseRgb},0.6))` }}>
                <title>{`${d.label}: ${d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="w-full mt-2 p-5 bg-black/40 border rounded-xl pointer-events-auto" style={{ borderColor: `rgba(${baseRgb}, 0.3)`, boxShadow: `0 0 15px rgba(${baseRgb}, 0.1)` }}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 border-b pb-2 gap-2 flex-wrap" style={{ borderColor: `rgba(${baseRgb}, 0.2)` }}>
        <h4 className="text-xs font-mono font-bold tracking-wider uppercase" style={{ color: baseColor }}>
          {fieldDef.settings.visualizerYAxisLabel || fieldDef.settings.visualizerYAxisField}
          {targetRecordName ? ` | ${targetRecordName}` : ''}
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          {/* ⚡ Chart Type Selector */}
          <div className="relative">
            <button
              onClick={() => { setShowChartTypeMenu(!showChartTypeMenu); setShowSyncMenu(false); }}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-all"
              style={{ color: baseColor, borderColor: `rgba(${baseRgb}, 0.3)`, backgroundColor: `rgba(${baseRgb}, 0.1)` }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = `rgba(${baseRgb}, 0.2)`}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = `rgba(${baseRgb}, 0.1)`}
              title="Chart Type"
            >
              {(() => {
                const opt = CHART_TYPE_OPTIONS.find(c => c.id === chartType);
                const Ico = (LucideIcons as any)[opt?.icon || 'BarChart3'];
                return <Ico size={10} />;
              })()}
              <span>{CHART_TYPE_OPTIONS.find(c => c.id === chartType)?.label}</span>
              <ChevronDownIcon size={10} />
            </button>
            {showChartTypeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowChartTypeMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-black/95 backdrop-blur-xl rounded-lg overflow-hidden border border-slate-700 shadow-2xl min-w-[130px]">
                  {CHART_TYPE_OPTIONS.map(opt => {
                    const Ico = (LucideIcons as any)[opt.icon];
                    const active = chartType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setChartType(opt.id);
                          setShowChartTypeMenu(false);
                          setSelectedSnapshot(null);
                          setSelectedBarIdx(null);
                          // When switching INTO dynamic, default sync to realtime for nicest feel
                          if (opt.id === 'dynamic' && syncInterval !== 'realtime') {
                            setSyncInterval('realtime');
                          }
                        }}
                        className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${active ? '' : 'text-slate-400 hover:bg-white/5'}`}
                        style={active ? { backgroundColor: `rgba(${baseRgb}, 0.2)`, color: baseColor } : {}}
                      >
                        <Ico size={11} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ⚡ Download Button (CSV / PNG) */}
          <div className="relative">
            <button
              onClick={() => { setShowDownloadMenu(!showDownloadMenu); setShowSyncMenu(false); setShowChartTypeMenu(false); }}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-all"
              style={{ color: baseColor, borderColor: `rgba(${baseRgb}, 0.3)`, backgroundColor: `rgba(${baseRgb}, 0.1)` }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = `rgba(${baseRgb}, 0.2)`}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = `rgba(${baseRgb}, 0.1)`}
              title="Download chart"
            >
              <LucideIcons.Download size={10} />
              <span>Download</span>
              <ChevronDownIcon size={10} />
            </button>
            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-black/95 backdrop-blur-xl rounded-lg overflow-hidden border border-slate-700 shadow-2xl min-w-[160px]">
                  <button
                    onClick={exportVisualizerCSV}
                    className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors"
                    title="Export aggregated data as CSV"
                  >
                    <LucideIcons.FileSpreadsheet size={11} />
                    CSV (raw data)
                  </button>
                  <button
                    onClick={exportVisualizerPNG}
                    className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:bg-fuchsia-500/15 hover:text-fuchsia-300 transition-colors border-t border-slate-800"
                    title="Export rendered chart as PNG"
                  >
                    <LucideIcons.Image size={11} />
                    PNG (image)
                  </button>
                </div>
              </>
            )}
          </div>


          {/* ⚡ 2D / 3D Toggle */}
          <div className="flex bg-black/60 rounded border border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-all ${viewMode === '2D' ? '' : 'text-slate-500 hover:text-slate-300'}`}
              style={viewMode === '2D' ? { backgroundColor: `rgba(${baseRgb}, 0.3)`, color: baseColor } : {}}
              title="2D View"
            >2D</button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-all ${viewMode === '3D' ? '' : 'text-slate-500 hover:text-slate-300'}`}
              style={viewMode === '3D' ? { backgroundColor: `rgba(${baseRgb}, 0.3)`, color: baseColor } : {}}
              title="3D View"
            >3D</button>
          </div>

          {/* ⚡ Sync Selector */}
          <div className="relative">
            <button
              onClick={() => { setShowSyncMenu(!showSyncMenu); setShowChartTypeMenu(false); }}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-all"
              style={{ color: baseColor, borderColor: `rgba(${baseRgb}, 0.3)`, backgroundColor: `rgba(${baseRgb}, 0.1)` }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = `rgba(${baseRgb}, 0.2)`}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = `rgba(${baseRgb}, 0.1)`}
              title="Sync Interval"
            >
              <LucideIcons.RefreshCw size={10} className={syncInterval === 'realtime' ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
              <span>{SYNC_OPTIONS.find(s => s.id === syncInterval)?.label}</span>
              <ChevronDownIcon size={10} />
            </button>
            {showSyncMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSyncMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-black/95 backdrop-blur-xl rounded-lg overflow-hidden border border-slate-700 shadow-2xl min-w-[110px]">
                  {SYNC_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSyncInterval(opt.id); setShowSyncMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${syncInterval === opt.id ? '' : 'text-slate-400 hover:bg-white/5'}`}
                      style={syncInterval === opt.id ? { backgroundColor: `rgba(${baseRgb}, 0.2)`, color: baseColor } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {isDynamic && (
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${syncInterval === 'realtime' ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)] animate-pulse' : 'bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.6)]'}`} />
              <span className="text-[9px] text-green-400 font-mono tracking-wider">{syncInterval === 'realtime' ? 'LIVE' : 'SYNC'}</span>
            </div>
          )}
        </div>
      </div>

      {/* RENDER LOGIC */}
      <div
        className={`relative pt-2 ${isDynamic ? (is3D ? 'h-64' : 'flex items-end gap-0.5 h-40') : chartType === 'bar' ? 'flex items-end gap-3 h-40' : 'h-40'}`}
        style={is3D && !isDynamic ? { // Note: We remove the CSS transform if it's the Plotly 3D chart
          transform: 'perspective(800px) rotateX(18deg) rotateY(-6deg)',
          transformStyle: 'preserve-3d',
          transformOrigin: 'center bottom',
        } : undefined}
      >
         {chartData.length === 0 && !isDynamic ? (
           <div className="w-full h-full flex items-center justify-center text-xs font-mono" style={{ color: `rgba(${baseRgb}, 0.5)` }}>No data found</div>
        ) : isDynamic ? (
           // ⚡ NEW: True 3D Surface Map for Dynamic + 3D
           is3D ? (
             <div 
               className="w-full h-full relative -mt-6"
               onWheel={(e) => e.stopPropagation()} 
               onPointerDown={(e) => e.stopPropagation()}
             >
                <DynamicPlotly
                  data={[
                    {
                      z: simZ,
                      x: simX,
                      y: simY,
                      type: 'surface',
                      colorscale: 'Jet',
                      showscale: false, 
                    }
                  ]}
                  layout={{ ...plotlyLayout, datarevision: Date.now() }}
                  config={plotlyConfig}
                  style={{ width: '100%', height: '100%', pointerEvents: 'auto', cursor: 'grab' }}
                />
             </div>
           ) : (
             // Existing 2D Dynamic Wave
             <div className="w-full h-full flex flex-col relative">
               <div className="absolute right-0 -top-6">
                 <span className="text-sm font-mono font-bold" style={{ color: baseColor }}>{currentDynamicVal.toFixed(2)}</span>
               </div>
               <div className="h-full flex items-end gap-0.5 w-full overflow-hidden">
                  {dynamicWave.map((value, i) => {
                    const base = baseValueRef.current || 0;
                    const min = (fieldDef.settings?.dynamicSimMin ?? 0) + base;
                    const max = (fieldDef.settings?.dynamicSimMax ?? 100) + base;
                    const heightPct = Math.min(100, Math.max(5, ((value - min) / (max - min || 1)) * 100));
                    const isSelected = selectedBarIdx === i;
                   return (
                     <button
                       key={i}
                       type="button"
                       onClick={(e) => { e.stopPropagation(); handleWaveClick(i, value); }}
                       className={`flex-1 rounded-t transition-all duration-100 cursor-pointer hover:brightness-150 ${isSelected ? 'bg-gradient-to-t from-yellow-900/90 to-yellow-300 ring-1 ring-yellow-300' : ''}`}
                       style={{
                         height: `${heightPct}%`,
                         transformOrigin: 'bottom',
                         ...(isSelected ? {} : { background: `linear-gradient(to top, rgba(${baseRgb}, 0.4), rgba(${baseRgb}, 0.8))` })
                       }}
                       title={`t-${39 - i}: ${value.toFixed(2)}`}
                     />
                   );
                 })}
               </div>
             </div>
           )
         ) : chartType === 'line' ? (
           renderLineChart()
         ) : chartType === 'pie' ? (
           renderPieChart()
         ) : chartType === 'scatter' ? (
           renderScatterChart()
         ) : (
           // Default: Bar chart — interactive
           <div className="w-full h-full flex items-end gap-3">
             {chartData.map((d, i) => {
               const isSelected = selectedBarIdx === i;
               return (
                 <div key={i} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                   <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 text-[10px] py-1.5 px-2.5 rounded border pointer-events-none whitespace-nowrap z-10 shadow-lg translate-y-2 group-hover:translate-y-0 font-mono" style={{ backgroundColor: `rgba(${baseRgb}, 0.1)`, borderColor: `rgba(${baseRgb}, 0.5)`, color: 'white' }}>
                     {d.label}: <span className="font-bold">{d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                   </div>
                   <button
                     type="button"
                     onClick={(e) => { e.stopPropagation(); handlePointClick(i, d); }}
                     className={`w-full max-w-[40px] rounded-t-sm border-t border-l border-r shadow-[0_0_10px_rgba(${baseRgb},0.2)] transition-all cursor-pointer hover:brightness-125 ${isSelected ? 'bg-gradient-to-t from-yellow-900 to-yellow-400 border-yellow-300 ring-1 ring-yellow-300' : ''}`}
                     style={{
                       height: `${(Math.max(0, d.value) / maxVal) * 100}%`,
                       minHeight: '4px',
                       transformOrigin: 'bottom',
                       transform: is3D ? `translateZ(${isSelected ? 25 : 0}px)` : undefined,
                       ...(isSelected ? {} : { background: `linear-gradient(to top, rgba(${baseRgb}, 0.4), rgba(${baseRgb}, 0.9))`, borderColor: `rgba(${baseRgb}, 0.8)` })
                     }}
                     title={`${d.label}: ${d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                   />
                   <span className="text-[9px] text-slate-400 mt-2 truncate w-full text-center block font-mono">
                     {d.label}
                   </span>
                 </div>
               );
             })}
           </div>
         )}
      </div>

      {/* ⚡ HISTORICAL SNAPSHOT POPOUT */}
      {selectedSnapshot && (
        <div className="mt-3 p-3 rounded-lg border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ backgroundColor: `rgba(${baseRgb}, 0.05)`, borderColor: `rgba(${baseRgb}, 0.3)` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <LucideIcons.Clock size={12} style={{ color: baseColor }} />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Snapshot:</span>
            <span className="text-[11px] font-mono text-white">
              {new Date(selectedSnapshot.timestamp).toLocaleTimeString()}
            </span>
            {selectedSnapshot.label && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ backgroundColor: `rgba(${baseRgb}, 0.2)`, color: baseColor }}>
                {selectedSnapshot.label}
              </span>
            )}
            <span className="text-xs font-mono font-bold text-white ml-2">
              = {selectedSnapshot.value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
            </span>
          </div>
          <button
            onClick={() => { setSelectedSnapshot(null); setSelectedBarIdx(null); }}
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
            title="Close snapshot"
          >
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      {/* FOOTER */}
      {isDynamic ? (
        <div className="mt-2 flex justify-between text-[10px] font-mono text-gray-500 border-t pt-2" style={{ borderColor: `rgba(${baseRgb}, 0.2)` }}>
          <span>t-40</span>
          <span>Amplitude · {viewMode} · {chartType.toUpperCase()}</span>
          <span>t</span>
        </div>
      ) : (
        <div className="text-center mt-3 text-[10px] text-slate-500 font-mono uppercase tracking-widest border-t pt-2" style={{ borderColor: `rgba(${baseRgb}, 0.2)` }}>
          {fieldDef.settings.visualizerXAxisLabel || fieldDef.settings.visualizerXAxisField} · {viewMode} · {chartType.toUpperCase()}
        </div>
      )}
    </div>
  );
};




// ============================================
// CONNECTION FIELD SELECTOR
// ============================================
const ConnectionSelect: React.FC<{ fieldDef: any, value: any, onChange: (val: any) => void, organizationId: string, workspaceSlug: string, currentRecordId?: string, wsColor?: any, hostAppSettings?: any, onPreview?: (conn: any) => void }> = ({ fieldDef, value, onChange, organizationId, workspaceSlug, currentRecordId, wsColor, hostAppSettings, onPreview }) => {
  const [options, setOptions] = useState<{id: string, label: string, appName: string, appId: string, appSlug: string, wsName?: string, data: any}[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugStatus, setDebugStatus] = useState('Initializing...');

  // Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const isInboundMode = fieldDef.settings?.showInboundConnections;
  const isMultiple = fieldDef.settings?.allowMultipleConnections || fieldDef.settings?.allowMultiple || fieldDef.type === 'visualizer_field';
  const layoutMode = fieldDef.settings?.connectionLayoutMode || 'dropdown';
  const isSearchable = fieldDef.settings?.connectionDropdownSearchable ?? true;
  const baseClass = "w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2 text-white font-mono focus:outline-none transition-all";

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        let connected = fieldDef.settings?.connectedMiniAppIds || fieldDef.settings?.connectedApps || fieldDef.settings?.connectedMiniApps || [];
        if (fieldDef.type === 'visualizer_field' && fieldDef.settings?.visualizerSourceAppId) {
            connected = [fieldDef.settings.visualizerSourceAppId];
        }
        if (typeof connected === 'string') connected = [connected];
        if (connected.length > 0 && typeof connected[0] === 'object') {
          connected = connected.map((c: any) => c.name || c.value || c.id || '');
        }
        const safeAppIdentifiers = connected.filter(Boolean).map((a: string) => String(a).toLowerCase().trim());

        if (safeAppIdentifiers.length === 0) {
          setDebugStatus('Not configured (link an app in Builder)');
          setLoading(false);
          return;
        }

        const { data: apps, error: appsError } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('id, name, slug')
          .or(`organization_id.eq.${organizationId},is_preset.eq.true`);

        if (appsError) throw appsError;

        const targetApps = (apps || []).filter(a => 
          safeAppIdentifiers.includes((a.name || '').toLowerCase()) || 
          safeAppIdentifiers.includes((a.slug || '').toLowerCase()) ||
          safeAppIdentifiers.includes(String(a.id).toLowerCase())
        );

        if (targetApps.length === 0) {
          setDebugStatus('App missing in DB');
          setLoading(false);
          return;
        }

        const appIds = targetApps.map(a => a.id);
        
        const { data: records, error: recError } = await supabase.schema('app_private')
          .from('mini_app_records')
          .select('id, item_uid, data, mini_apps(id, name, slug, is_preset, workspaces(name))')
          .in('mini_app_id', appIds)
          .eq('organization_id', organizationId);

        if (recError) throw recError;

        if (records && records.length > 0) {
          let filteredRecords = records;
          
          if (isInboundMode) {
            if (!currentRecordId) {
              setDebugStatus('Save this record first to view inbound connections.');
              setOptions([]);
              setLoading(false);
              return;
            }
            filteredRecords = records.filter(r => {
              const dataStr = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
              return dataStr.includes(currentRecordId);
            });
          }

          const formatted = filteredRecords.map(r => {
            const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data || {};
            const label = data.name || data.Name || data.title || data.Title || data.identifier || r.item_uid || r.id;
            const appInfo = Array.isArray(r.mini_apps) ? r.mini_apps[0] : r.mini_apps;
            
            const wsData = appInfo?.workspaces;
            const wsName = wsData ? (Array.isArray(wsData) ? wsData[0]?.name : wsData.name) : (appInfo?.is_preset ? 'Global Template' : 'Unknown Workspace');

            return { 
              id: r.item_uid || r.id, 
              label: String(label),
              appName: appInfo?.name || 'Unknown App',
              appId: appInfo?.id || '',
              appSlug: appInfo?.slug || '',
              wsName: wsName,
              data: data
            };
          });
          
          setOptions(formatted);
          setDebugStatus(''); 
        } else {
          setDebugStatus(`0 records in ${targetApps.map(a => a.name).join(', ')}`);
        }
      } catch (err) {
        console.error('[ConnectionSelect] Error fetching connection records:', err);
        setDebugStatus('Error fetching connections');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) fetchRecords();
  }, [fieldDef, organizationId, currentRecordId, isInboundMode]);

  const currentValues = React.useMemo(() => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string' && value.trim()) return value.split(',').map(s => s.trim());
    if (value) return [String(value)];
    return [];
  }, [value]);

  const handleAdd = (newId: string) => {
    if (!newId) return;
    if (isMultiple) {
      if (!currentValues.includes(newId)) onChange([...currentValues, newId]);
    } else {
      onChange([newId]);
    }
  };

  const handleRemove = (removeId: string) => {
    if (isMultiple) {
      onChange(currentValues.filter((v: string) => v !== removeId));
    } else {
      onChange('');
    }
  };

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const isExpanding = !prev[id];
      if (isExpanding) {
        setTimeout(() => {
          const el = document.getElementById(`conn-card-${id}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            const isBottomVisible = rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
            if (!isBottomVisible) {
              el.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
          }
        }, 310);
      }
      return { ...prev, [id]: isExpanding };
    });
  };

  const renderTargets = isInboundMode ? options : currentValues.map(val => options.find(o => o.id === val) || { id: val, label: val, appName: 'Loading...', appId: '', appSlug: '', data: {} });

  // ─── REUSABLE ADD DROPDOWN (Used by Bar, Table, and Card layouts) ───
  const renderAddDropdown = (triggerContent: React.ReactNode, className: string = '') => {
    if (isInboundMode) return null;
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="cursor-pointer"
        >
          {triggerContent}
        </div>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[280px]">
            {isSearchable && (
              <div className="p-2 border-b border-gray-800 relative">
                <SearchIcon size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" autoFocus
                  value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} placeholder="Search records..."
                  className="w-full bg-black/50 border border-gray-800 rounded px-3 pl-8 py-1.5 text-xs text-white focus:outline-none focus:border-gray-600 transition-colors"
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto darkwave-scrollbar">
              {options.filter(o => !currentValues.includes(o.id) && (o.label.toLowerCase().includes(dropdownSearch.toLowerCase()) || o.appName.toLowerCase().includes(dropdownSearch.toLowerCase()) || o.wsName?.toLowerCase().includes(dropdownSearch.toLowerCase()))).map(opt => (
                <div 
                  key={opt.id} onClick={() => { handleAdd(opt.id); setIsDropdownOpen(false); }}
                  className="px-3 py-2 text-sm cursor-pointer border-b border-gray-800/50 flex flex-col transition-colors hover:bg-white/5"
                >
                  <span className="text-white">{opt.label}</span>
                  <span className="text-[10px] text-gray-500">{opt.appName} • {opt.wsName}</span>
                </div>
              ))}
              {options.filter(o => !currentValues.includes(o.id)).length === 0 && <div className="p-3 text-center text-xs text-gray-500">No records available</div>}
            </div>
          </div>
        )}
      </div>
    );
  };


  // ==========================================
  // 1. BAR LAYOUT
  // ==========================================
  if (layoutMode === 'bar') {
    return (
      <div className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 min-h-[46px] flex flex-wrap items-center gap-2 transition-all" style={{ borderColor: `rgba(${wsColor?.rgb || '100,116,139'}, 0.3)` }}>
        {renderTargets.length === 0 && !loading && (
           <span className="text-gray-500 font-mono text-sm px-2 italic">{isInboundMode ? debugStatus || 'No inbound links' : 'No connections added...'}</span>
        )}
        {renderTargets.map((opt: any) => (
          <div 
            key={opt.id} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono group hover:brightness-125 transition-all cursor-pointer shadow-sm" 
            style={{ background: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.15)`, border: `1px solid rgba(${wsColor?.rgb || '16, 185, 129'}, 0.4)`, color: wsColor?.primary || '#10b981' }}
            onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview({ id: opt.id, data: opt.data, appName: opt.appName, appId: opt.appId, origin: { x: e.clientX, y: e.clientY } }); else if(opt.appSlug) window.open(`/app/${workspaceSlug}/${opt.appSlug}/${opt.id}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no'); }}
          >
            <span className="truncate max-w-[200px] font-bold">{opt.data?.name || opt.label}</span>
            <span className="text-[9px] opacity-60 ml-1 border-l pl-2" style={{ borderColor: `rgba(${wsColor?.rgb || '255,255,255'}, 0.3)` }}>{opt.appName}</span>
            {!isInboundMode && (
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(opt.id); }} className="hover:text-red-400 hover:bg-red-500/20 rounded-full p-0.5 ml-1 transition-colors">
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        ))}

        {!isInboundMode && renderAddDropdown(
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-gray-400 hover:text-white hover:bg-white/10 border border-dashed border-gray-600 hover:border-gray-400 transition-all">
            <PlusIcon size={12} /> Add
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. TABLE LAYOUT
  // ==========================================
  if (layoutMode === 'table') {
    // Attempt to guess decent headers based on the first mapped item's data keys (ignoring hidden keys)
    let tableHeaders = ['Name', 'App'];
    if (renderTargets.length > 0 && renderTargets[0].data) {
       const keys = Object.keys(renderTargets[0].data).filter(k => !k.startsWith('_') && k.toLowerCase() !== 'name' && k.toLowerCase() !== 'title').slice(0, 2);
       tableHeaders = ['Name', ...keys, 'App'];
    }

    return (
      <div className="w-full bg-black/60 border rounded-xl overflow-hidden" style={{ borderColor: `rgba(${wsColor?.rgb || '100,116,139'}, 0.3)` }}>
        <div className="overflow-x-auto darkwave-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900/60 border-b" style={{ borderColor: `rgba(${wsColor?.rgb || '100,116,139'}, 0.2)` }}>
              <tr>
                {tableHeaders.map((th, idx) => (
                  <th key={idx} className="p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">{th}</th>
                ))}
                {!isInboundMode && <th className="p-3 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {renderTargets.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length + 1} className="p-6 text-center text-xs font-mono text-gray-500 italic">
                    {isInboundMode ? debugStatus || 'No inbound links found' : 'No connections added yet.'}
                  </td>
                </tr>
              ) : (
                renderTargets.map((opt: any) => (
                  <tr key={opt.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview({ id: opt.id, data: opt.data, appName: opt.appName, appId: opt.appId, origin: { x: e.clientX, y: e.clientY } }); else if(opt.appSlug) window.open(`/app/${workspaceSlug}/${opt.appSlug}/${opt.id}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no'); }}>
                    {tableHeaders.map((th, idx) => {
                      // Map values based on assumed headers
                      let val = '';
                      if (th === 'Name') val = opt.data?.name || opt.data?.title || opt.label;
                      else if (th === 'App') val = opt.appName;
                      else val = opt.data?.[th] || '-';
                      
                      return (
                        <td key={idx} className={`p-3 text-sm font-mono ${th === 'Name' ? 'font-bold text-white' : 'text-gray-400'} truncate max-w-[200px]`}>
                           {th === 'App' ? (
                             <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider" style={{ background: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.1)`, color: wsColor?.primary || '#10b981', border: `1px solid rgba(${wsColor?.rgb || '16, 185, 129'}, 0.2)` }}>{val}</span>
                           ) : String(val)}
                        </td>
                      );
                    })}
                    {!isInboundMode && (
                      <td className="p-3 text-right">
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(opt.id); }} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-500/20 rounded">
                          <TrashIcon size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isInboundMode && (
          <div className="p-2 border-t bg-black/40 flex justify-center" style={{ borderColor: `rgba(${wsColor?.rgb || '100,116,139'}, 0.2)` }}>
             {renderAddDropdown(
                <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:brightness-125" style={{ color: wsColor?.primary || '#10b981', background: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.1)`, border: `1px dashed rgba(${wsColor?.rgb || '16, 185, 129'}, 0.4)` }}>
                  <PlusIcon size={14} /> {loading ? 'Loading...' : 'Add Row'}
                </button>
             )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 3. CARD / WINDOW LAYOUT (Existing complex cards)
  // ==========================================
  if (layoutMode === 'window' || layoutMode === 'card') {
    return (
      <div className="w-full space-y-3 relative">
        {renderTargets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2 mb-3">
            {renderTargets.map((opt: any) => {
              const hostConnConfigs = hostAppSettings?.connectionCardLayoutConfigs || {};
              const connConfig = hostConnConfigs[opt.appId];
              let primaryFields: string[] = [];
              let secondaryFields: string[] = [];
              let visualizerFieldDef: any = null;
              
              if (connConfig) {
                 primaryFields = (connConfig.primary || []).filter(Boolean);
                 if (connConfig.useVisualizer && connConfig.visualizerFieldDef) {
                     visualizerFieldDef = connConfig.visualizerFieldDef;
                 } else {
                     secondaryFields = (connConfig.secondary || []).filter(Boolean);
                 }
              } else {
                 const keys = Object.keys(opt.data || {}).filter(k => !k.startsWith('_') && k.toLowerCase() !== 'name' && k.toLowerCase() !== 'title' && k.toLowerCase() !== 'identifier');
                 secondaryFields = keys.slice(0, 3);
              }

              const primaryCol = primaryFields[0] || 'name';
              const title = opt.data[primaryCol] || opt.label;
              const isExpanded = expandedCards[opt.id];
              const hasExpandableContent = secondaryFields.length > 0 || visualizerFieldDef;

              return (
                <div key={opt.id} id={`conn-card-${opt.id}`} className="scroll-my-8 bg-black/80 rounded-xl p-4 transition-all group relative overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" style={{ border: `1px solid rgba(${wsColor?.rgb || '16, 185, 129'}, 0.3)` }} onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview({ id: opt.id, data: opt.data, appName: opt.appName, appId: opt.appId, origin: { x: e.clientX, y: e.clientY } }); else if(opt.appSlug) window.open(`/app/${workspaceSlug}/${opt.appSlug}/${opt.id}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no'); }}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-mono font-medium truncate flex-1 transition-colors group-hover:opacity-80" style={{ textShadow: `0 0 10px rgba(${wsColor?.rgb || '255,255,255'}, 0.3)` }}>{title}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                      {!isInboundMode && (
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(opt.id); }} className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors bg-black/40" title="Remove Connection">
                          <CloseIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm flex-1">
                    {primaryFields.slice(1).map(k => (
                       <div key={k} className="flex items-center justify-between">
                         <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{k}</span>
                         <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{String(opt.data[k] || '')}</span>
                       </div>
                    ))}
                    {primaryFields.length <= 1 && !connConfig && secondaryFields.slice(0, 1).map(k => (
                       <div key={k} className="flex items-center justify-between">
                         <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{k}</span>
                         <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{String(opt.data[k] || '')}</span>
                       </div>
                    ))}
                  </div>

                  {hasExpandableContent && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col" onClick={(e) => { e.stopPropagation(); toggleCardExpand(opt.id); }}>
                      <button type="button" className="w-full flex items-center justify-center p-1 transition-colors rounded" style={{ color: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.5)`, backgroundColor: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.05)` }} onMouseEnter={e => { e.currentTarget.style.color = wsColor?.primary || '#10b981'; e.currentTarget.style.backgroundColor = `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.1)`; }} onMouseLeave={e => { e.currentTarget.style.color = `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.5)`; e.currentTarget.style.backgroundColor = `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.05)`; }}>
                        <ChevronDownIcon size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <div className={`grid transition-all duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`} onClick={e => e.stopPropagation()}>
                        <div className="overflow-hidden">
                          <div className="cursor-default space-y-2 text-sm">
                            {visualizerFieldDef ? (
                               isExpanded && <VisualizerChart fieldDef={visualizerFieldDef} currentData={opt.data} baseColor={wsColor?.primary} baseRgb={wsColor?.rgb} />
                            ) : (
                               secondaryFields.map(k => (
                                  <div key={k} className="flex items-center justify-between">
                                    <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{k}</span>
                                    <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{String(opt.data[k] || '')}</span>
                                  </div>
                               ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.2)` }}>
                    <span className="text-[10px] font-mono tracking-wider uppercase truncate" style={{ color: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.7)` }}>{opt.appName} • {opt.wsName}</span>
                    <span className="text-[9px] text-gray-600 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-gray-800 truncate max-w-[100px]">ID: {opt.id.substring(0, 10)}...</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
           isInboundMode && <div className="text-xs text-slate-500 italic p-4 border border-dashed border-slate-700/50 rounded-lg text-center w-full">{debugStatus || 'No inbound connections found.'}</div>
        )}

        {/* Fallback to custom dropdown for adding more items in card mode */}
        {!isInboundMode && renderAddDropdown(
           <div 
             className="w-full flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-emerald-400 font-mono text-sm focus:outline-none hover:bg-emerald-500/20 transition-all cursor-pointer"
             style={{ color: wsColor?.primary, borderColor: `rgba(${wsColor?.rgb}, 0.4)`, background: `rgba(${wsColor?.rgb}, 0.1)` }}
           >
             <span>{loading ? 'Loading...' : '+ Add Connection Card'}</span>
             <ChevronDownIcon size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
           </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 4. DROPDOWN LAYOUT (Default searchable select)
  // ==========================================
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(dropdownSearch.toLowerCase()) || 
    opt.appName.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
    opt.wsName?.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => !isInboundMode && setIsDropdownOpen(!isDropdownOpen)}
        className={`${baseClass} min-h-[40px] flex items-center justify-between cursor-pointer ${isInboundMode ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <div className="flex-1 truncate">
          {currentValues.length === 0 ? (
            <span className="text-gray-500">
              {loading ? 'Searching...' : (isInboundMode ? 'View cards for inbound data' : 'Select a record...')}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {currentValues.map(val => {
                const opt = options.find(o => o.id === val);
                return opt ? (
                  <span key={val} className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-white flex items-center gap-1">
                    {opt.label}
                    {isMultiple && !isInboundMode && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemove(val); }}
                        className="hover:text-red-400 ml-1"
                      ><CloseIcon size={12} /></button>
                    )}
                  </span>
                ) : <span key={val} className="text-sm">{val}</span>;
              })}
            </div>
          )}
        </div>
        <ChevronDownIcon size={14} className={`text-gray-500 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </div>

      {isDropdownOpen && !isInboundMode && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {isSearchable && (
            <div className="p-2 border-b border-gray-800 relative">
              <SearchIcon size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                autoFocus
                value={dropdownSearch}
                onChange={(e) => setDropdownSearch(e.target.value)}
                placeholder="Search records..."
                className="w-full bg-black/50 border border-gray-800 rounded px-3 pl-8 py-1.5 text-xs text-white focus:outline-none focus:border-gray-600 transition-colors"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto darkwave-scrollbar">
            {loading && <div className="p-3 text-center text-xs text-gray-500">Loading data...</div>}
            {!loading && filteredOptions.length === 0 && (
              <div className="p-3 text-center text-xs text-gray-500">{debugStatus || 'No records found'}</div>
            )}
            {filteredOptions.map(opt => {
              const isSelected = currentValues.includes(opt.id);
              return (
                <div 
                  key={opt.id}
                  onClick={() => {
                    if (isSelected) {
                      handleRemove(opt.id);
                    } else {
                      handleAdd(opt.id);
                      if (!isMultiple) setIsDropdownOpen(false);
                    }
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-800/50 flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-white/5'}`}
                >
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <span className={`truncate ${isSelected ? 'text-emerald-400 font-bold' : 'text-white'}`}>{opt.label}</span>
                    <span className="text-[10px] text-gray-500 truncate">{opt.appName} • {opt.wsName}</span>
                  </div>
                  {isSelected && <CheckSquareIcon size={14} className="text-emerald-500 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// RECORD CONNECTIONS VIEWER
// ============================================
const RecordConnectionsTab: React.FC<{
  record: Record<string, any>;
  organizationId: string;
  workspaceSlug: string;
  wsColor: any;
  hostAppSettings?: any;
  onPreview?: (conn: any) => void;
}> = ({ record, organizationId, workspaceSlug, wsColor, hostAppSettings, onPreview }) => {
  const [linkedRecords, setLinkedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const isExpanding = !prev[id];
      if (isExpanding) {
        setTimeout(() => {
          const el = document.getElementById(`conn-tab-card-${id}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            const isBottomVisible = rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
            if (!isBottomVisible) {
              el.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
          }
        }, 310);
      }
      return { ...prev, [id]: isExpanding };
    });
  };

  useEffect(() => {
    const fetchConnections = async () => {
      setLoading(true);
      try {
        const recordUid = record._item_uid || record.id;
        const recordDbId = record._db_id;

        const { data: records, error } = await supabase.schema('app_private')
          .from('mini_app_records')
          .select('id, item_uid, mini_app_id, data, mini_apps(id, name, icon, slug)')
          .eq('organization_id', organizationId);

        if (error) throw error;

        const linked = (records || []).filter(r => {
          if (r.id === recordDbId) return false; 
          const dataStr = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
          return dataStr.includes(recordUid) || (recordDbId && dataStr.includes(recordDbId));
        });

        setLinkedRecords(linked);
      } catch (err) {
        console.error('Error fetching connections:', err);
      } finally {
        setLoading(false);
      }
    };

    if (record && organizationId) fetchConnections();
  }, [record, organizationId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-full min-h-[300px] gap-4">
        <GitBranchIcon size={32} className="text-gray-700 animate-pulse" />
        <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Scanning for links...</p>
      </div>
    );
  }

  if (linkedRecords.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 h-full min-h-[300px]">
        <div className="text-center">
          <GitBranchIcon size={32} className="mx-auto mb-3 text-gray-700" />
          <h3 className="text-lg font-mono font-medium text-white mb-2">No Connections Found</h3>
          <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto">
            This record hasn't been linked to any items in other MiniApps yet.
          </p>
        </div>
      </div>
    );
  }

  const grouped = linkedRecords.reduce((acc, curr) => {
    const appData = Array.isArray(curr.mini_apps) ? curr.mini_apps[0] : curr.mini_apps;
    const appName = appData?.name || 'Unknown App';
    if (!acc[appName]) acc[appName] = { appId: appData?.id, icon: appData?.icon, slug: appData?.slug, records: [] };
    acc[appName].records.push(curr);
    return acc;
  }, {} as Record<string, { appId: string, icon: string, slug: string, records: any[] }>);

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
          <GitBranchIcon size={20} style={{ color: wsColor.primary }} />
          Connected Records
        </h3>
        <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">
          {linkedRecords.length} total link(s)
        </span>
      </div>
      
      {Object.entries(grouped).map(([appName, group]) => {
        const AppIcon = resolveAppIcon(group.icon, appName);
          
        return (
          <div key={appName} className="bg-black/40 rounded-xl border border-white/10 overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="px-4 py-3 bg-white/5 flex items-center gap-3 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${wsColor.rgb}, 0.15)`, border: `1px solid rgba(${wsColor.rgb}, 0.3)` }}>
                <AppIcon size={16} style={{ color: wsColor.primary }} />
              </div>
              <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{appName}</h4>
              <span className="text-[10px] text-gray-400 font-mono ml-auto bg-black/40 px-2 py-0.5 rounded border border-slate-800">{group.records.length} item(s)</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.records.map(rec => {
                const data = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data || {};
                
                const hostConnConfigs = hostAppSettings?.connectionCardLayoutConfigs || {};
                const connConfig = hostConnConfigs[group.appId];
                let primaryFields: string[] = [];
                let secondaryFields: string[] = [];
                let visualizerFieldDef: any = null;
                
                if (connConfig) {
                   primaryFields = (connConfig.primary || []).filter(Boolean);
                   if (connConfig.useVisualizer && connConfig.visualizerFieldDef) {
                       visualizerFieldDef = connConfig.visualizerFieldDef;
                   } else {
                       secondaryFields = (connConfig.secondary || []).filter(Boolean);
                   }
                } else {
                   const keys = Object.keys(data).filter(k => !k.startsWith('_') && k.toLowerCase() !== 'name' && k.toLowerCase() !== 'title' && k.toLowerCase() !== 'identifier');
                   secondaryFields = keys.slice(0, 3);
                }

                const primaryCol = primaryFields[0] || 'name';
                const title = data[primaryCol] || data.Name || data.title || data.Title || data.identifier || rec.item_uid;
                const isExpanded = expandedCards[rec.id];
                const hasExpandableContent = secondaryFields.length > 0 || visualizerFieldDef;
                
                return (
                  <div key={rec.id} id={`conn-tab-card-${rec.id}`} className="scroll-my-8 bg-black/80 rounded-xl p-4 transition-all cursor-pointer group relative overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-lg" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.3)` }} onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview({ id: rec.item_uid || rec.id, data, appName, appId: group.appId, origin: { x: e.clientX, y: e.clientY } }); else if (group.slug) window.open(`/app/${workspaceSlug}/${group.slug}/${rec.item_uid || rec.id}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no'); }}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-white font-mono font-medium truncate flex-1 transition-colors group-hover:opacity-80" style={{ textShadow: `0 0 10px rgba(${wsColor?.rgb || '255,255,255'}, 0.3)` }}>{title}</h3>
                    </div>

                    <div className="space-y-2 text-sm flex-1">
                      {primaryFields.slice(1).map(k => (
                         <div key={k} className="flex items-center justify-between">
                           <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{k}</span>
                           <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{String(data[k] || '')}</span>
                         </div>
                      ))}
                      {primaryFields.length <= 1 && !connConfig && secondaryFields.slice(0, 1).map(k => (
                         <div key={k} className="flex items-center justify-between">
                           <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{k}</span>
                           <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{String(data[k] || '')}</span>
                         </div>
                      ))}
                    </div>

                    {hasExpandableContent && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex flex-col" onClick={(e) => { e.stopPropagation(); toggleCardExpand(rec.id); }}>
                        <button type="button" className="w-full flex items-center justify-center p-1 transition-colors rounded" style={{ color: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.5)`, backgroundColor: `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.05)` }} onMouseEnter={e => { e.currentTarget.style.color = wsColor?.primary || '#10b981'; e.currentTarget.style.backgroundColor = `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.1)`; }} onMouseLeave={e => { e.currentTarget.style.color = `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.5)`; e.currentTarget.style.backgroundColor = `rgba(${wsColor?.rgb || '16, 185, 129'}, 0.05)`; }}>
                          <ChevronDownIcon size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className={`grid transition-all duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`} onClick={e => e.stopPropagation()}>
                          <div className="overflow-hidden">
                            <div className="cursor-default space-y-2 text-sm">
                              {visualizerFieldDef ? (
                                 isExpanded && <VisualizerChart fieldDef={visualizerFieldDef} currentData={data} baseColor={wsColor?.primary} baseRgb={wsColor?.rgb} />
                              ) : (
                                 secondaryFields.map(k => (
                                   <div key={k} className="flex items-center justify-between">
                                     <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{k}</span>
                                     <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{String(data[k] || '')}</span>
                                   </div>
                                 ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// INLINE RECORD COMMENTS PANE
// ============================================
interface RecordComment {
  id: string;
  record_id: string;
  miniapp_id: string;
  organization_id?: string; // ⚡ ADDED: organization_id for RLS
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
}

const RecordCommentsPane: React.FC<{
  recordId: string;
  miniAppId: string;
  wsColor: { primary: string; rgb: string; glow: string; border: string; bg: string };
  onClose: () => void;
}> = ({ recordId, miniAppId, wsColor, onClose }) => {
  // ⚡ FIX: Extracted organization from useAuth to satisfy potential RLS policies
  const { user, organization } = useAuth();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';
  const userName = user ? ((user as any).display_name || (user as any).email || 'User') : 'User';

  const [comments, setComments] = useState<RecordComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      // ⚡ FIX: Added .schema('app_private')
      const { data, error } = await supabase.schema('app_private')
        .from('mini_app_record_comments')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: true });

      if (!error && data) setComments(data);
      setIsLoading(false);
      scrollToBottom();
    };

    fetchComments();

    // ⚡ FIX: Changed schema from 'public' to 'app_private'
    const channel = supabase
      .channel(`comments-${recordId}`)
      .on('postgres_changes', { 
        event: 'INSERT', schema: 'app_private', table: 'mini_app_record_comments', filter: `record_id=eq.${recordId}`
      }, (payload) => {
        setComments(prev => [...prev, payload.new as RecordComment]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [recordId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      // ⚡ FIX: Added schema, injected organization_id, and explicitly captured the error to throw
      const { error } = await supabase.schema('app_private').from('mini_app_record_comments').insert({
        record_id: recordId, 
        miniapp_id: miniAppId, 
        organization_id: organization?.id,
        user_id: userId, 
        user_name: userName, 
        comment_text: newComment.trim(),
      });
      
      if (error) throw error;
      
      setNewComment('');
      scrollToBottom();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full w-full bg-black/95">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-black to-transparent flex-shrink-0" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ background: `rgba(${wsColor.rgb}, 0.1)`, borderColor: `rgba(${wsColor.rgb}, 0.5)` }}>
            <MessageIcon size={20} style={{ color: wsColor.primary }} />
          </div>
          <div>
            <h2 className="text-lg font-mono font-bold text-white">Comments</h2>
            <p className="text-xs text-gray-500 font-mono">Discussion for this record</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors"><CloseIcon size={20} /></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 darkwave-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, borderTopColor: wsColor.primary }} /></div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-50">
            <MessageIcon size={32} className="mb-2" />
            <p className="text-xs font-mono">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.user_id === userId;
            return (
              <div key={comment.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-gray-500 font-mono mb-1 px-1">{isMe ? 'You' : comment.user_name} • {formatTime(comment.created_at)}</span>
                  <div className={`p-3 rounded-xl text-sm font-mono border`} style={{ background: isMe ? `rgba(${wsColor.rgb}, 0.15)` : 'rgba(255,255,255,0.05)', borderColor: isMe ? `rgba(${wsColor.rgb}, 0.3)` : 'rgba(255,255,255,0.1)', color: isMe ? '#fff' : '#d1d5db', borderBottomRightRadius: isMe ? '4px' : '12px', borderBottomLeftRadius: !isMe ? '4px' : '12px' }}>
                    {comment.comment_text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t bg-black/60 flex-shrink-0" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
        <div className="relative flex items-end">
          <textarea 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSend(); 
              } 
            }} 
            placeholder="Write a comment..." 
            className="w-full bg-gray-900/80 border rounded-xl pl-4 pr-12 py-3 text-white font-mono text-sm resize-none focus:outline-none min-h-[50px] max-h-[150px] darkwave-scrollbar" 
            style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }} 
            rows={1} 
          />
          <button 
            onClick={handleSend} 
            disabled={!newComment.trim() || isSubmitting} 
            className="absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:scale-105" 
            style={{ background: wsColor.primary, color: '#000' }}
          >
            <SendIcon size={14} />
          </button>
        </div>
        <p className="text-[9px] text-gray-600 font-mono mt-2 text-center">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
};

const MiniAppView: React.FC<MiniAppViewProps> = ({
  appName, workspaceSlug, workspaceId, isAdmin, onBack,
  availableLayouts = ['table', 'card', 'badge', 'calendar'],
  initialAddRecord,
  onEditTemplate,
  isGlobalAddMode,
  onGlobalAddClose,
}) => {
  const [appIconStr, setAppIconStr] = useState<string | null>(null);
  const { user, organization, isPlatformOwner, isPlatformTechAdmin, isOrganizationAdmin } = useAuth();
  const userId = user ? (user as any).id || (user as any).email || 'anonymous' : 'anonymous';
  const userName = user ? ((user as any).display_name || (user as any).email || 'User') : 'User';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showAddModal, setShowAddModal] = useState(initialAddRecord || isGlobalAddMode || false);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  
  // ⚡ Updated to include appId
  const [previewConnection, setPreviewConnection] = useState<{ id: string; data: any; appName: string; appId?: string; origin: { x: number; y: number } | null } | null>(null);
  
  // ⚡ Hooks to load and store the schema layout for the previewed connection
  const [previewSchema, setPreviewSchema] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTabMap, setPreviewTabMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    if (previewConnection?.appId) {
      setPreviewLoading(true);
      supabase.schema('app_private').from('mini_apps').select('schema_definition').eq('id', previewConnection.appId).single().then(({data}) => {
        if (!isMounted) return;
        if (data?.schema_definition) {
          const schemaDef = typeof data.schema_definition === 'string' ? JSON.parse(data.schema_definition) : data.schema_definition;
          let combinedFields = [];
          if (schemaDef.base_fields || schemaDef.custom_fields) {
            combinedFields = [...(schemaDef.base_fields || []), ...(schemaDef.custom_fields || [])];
          } else if (schemaDef.fields) {
            combinedFields = schemaDef.fields;
          }
          const sorted = [...combinedFields].filter((f: any) => f.name || f.type === 'split_separator').sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setPreviewSchema(sorted);
        } else {
          setPreviewSchema([]);
        }
        setPreviewLoading(false);
      });
    } else {
      setPreviewSchema([]);
    }
    return () => { isMounted = false; };
  }, [previewConnection]);

  const [clickOrigin, setClickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  // Advanced Record Panel State
  const [dockPosition, setDockPosition] = useState<'none' | 'left' | 'right'>('none');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true); // true = 600px, false = 300px
  const [isTabified, setIsTabified] = useState(false); // true = 48px sliver
  
  useEffect(() => {
    if (selectedRecord) {
      const stored = localStorage.getItem('acore_pinned_record');
      if (stored) {
        try {
          const state = JSON.parse(stored);
          if (state.activeRecord && (state.activeRecord._item_uid === selectedRecord._item_uid || state.activeRecord.id === selectedRecord.id)) {
            setDockPosition(state.dockPosition || 'none');
            setIsTabified(state.isTabified || false);
          }
        } catch(e) {}
      }
    }
  }, [selectedRecord]);

  useEffect(() => {
    const handleGlobalChange = (e: any) => {
      const state = e.detail;
      if (state.activeRecord && selectedRecord && (state.activeRecord._item_uid === selectedRecord._item_uid || state.activeRecord.id === selectedRecord.id)) {
        setDockPosition(state.dockPosition || 'none');
        setIsTabified(state.isTabified || false);
      } else if (!state.activeRecord) {
        setDockPosition('none');
        setIsTabified(false);
      }
    };
    window.addEventListener('globalRecordStateChanged', handleGlobalChange);
    return () => window.removeEventListener('globalRecordStateChanged', handleGlobalChange);
  }, [selectedRecord]);

  const handlePin = (side: 'left' | 'right' | 'none') => {
    setDockPosition(side);
    const nextState = {
      activeRecord: side === 'none' ? null : selectedRecord,
      contextData: side === 'none' ? null : { appName, appSettings, wc, workspaceSlug, url: getItemUrl(selectedRecord?._item_uid || selectedRecord?.id || '') },
      dockPosition: side,
      isTabified: false
    };
    localStorage.setItem('acore_pinned_record', JSON.stringify(nextState));
    window.dispatchEvent(new CustomEvent('globalRecordStateChanged', { detail: nextState }));
  };

  const handleTabify = () => {
    // ⚡ FIX: Default to 'right' so the global panel knows where to dock instead of 'none'
    const newDock = dockPosition === 'none' ? 'right' : dockPosition;
    setDockPosition(newDock);
    setIsTabified(true);
    
    const nextState = {
      activeRecord: selectedRecord,
      contextData: { appName, appSettings, wc, workspaceSlug, url: getItemUrl(selectedRecord?._item_uid || selectedRecord?.id || '') },
      dockPosition: newDock,
      isTabified: true
    };
    localStorage.setItem('acore_pinned_record', JSON.stringify(nextState));
    window.dispatchEvent(new CustomEvent('globalRecordStateChanged', { detail: nextState }));
  };

  // Swipe State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipingRef = useRef(false);

  const handleCloseRecord = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedRecord(null);
      setEditingRecord(null);
      setRecordDetailTab('details');
      setClickOrigin(null);
      setDockPosition('none');
      setIsTabified(false);
      setIsPanelExpanded(true);
      setSwipeOffset(0);
      setIsClosing(false);
      
      const nextState = { activeRecord: null, contextData: null, dockPosition: 'none', isTabified: false };
      localStorage.setItem('acore_pinned_record', JSON.stringify(nextState));
      window.dispatchEvent(new CustomEvent('globalRecordStateChanged', { detail: nextState }));
    }, 200); 
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (dockPosition === 'none') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    swipingRef.current = false;
  }, [dockPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || dockPosition === 'none') return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    if (!swipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) swipingRef.current = true;
    if (swipingRef.current) {
      if (dockPosition === 'right' && dx > 0) { setSwipeOffset(dx); e.preventDefault(); }
      if (dockPosition === 'left' && dx < 0) { setSwipeOffset(dx); e.preventDefault(); }
    }
  }, [dockPosition]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !swipingRef.current || dockPosition === 'none') {
      touchStartRef.current = null; swipingRef.current = false; return;
    }
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dt = (Date.now() - touchStartRef.current.t) / 1000;
    const velocityX = Math.abs(dx) / dt;
    
    // Collapse to Tab if swiped hard/far enough towards the edge
    if (dockPosition === 'right' && (dx > 100 || (dx > 50 && velocityX > 300))) setIsTabified(true);
    if (dockPosition === 'left' && (dx < -100 || (dx < -50 && velocityX > 300))) setIsTabified(true);
    
    setSwipeOffset(0);
    touchStartRef.current = null;
    swipingRef.current = false;
  }, [dockPosition]);

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewRecordFields({});
    if (onGlobalAddClose) onGlobalAddClose();
  };
  const [expandedConnections, setExpandedConnections] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const isExpanding = !prev[id];
      if (isExpanding) {
        setTimeout(() => {
          const el = document.getElementById(`record-card-${id}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            const isBottomVisible = rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
            if (!isBottomVisible) {
              el.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
          }
        }, 310);
      }
      return { ...prev, [id]: isExpanding };
    });
  };
  // ⚡ NEW: Tracks the active tab ID for any Tabs container
  const [activeTabMap, setActiveTabMap] = useState<Record<string, string>>({});
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('table');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 1));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false); // ⚡ Added Sort toggle
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showCommentsPane, setShowCommentsPane] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showViewPane, setShowViewPane] = useState(false);
  const [viewSaveScope, setViewSaveScope] = useState<'private' | 'team'>('private'); // <-- ADD THIS
  
  // Tab State Handlers
  const [recordDetailTab, setRecordDetailTab] = useState<'details' | 'tasks' | 'connections' | 'comments' | 'attachments' | 'activity' | 'alerts'>('details');
  const [tabsDisplayState, setTabsDisplayState] = useState<'full' | 'icons'>('full');
  const [showBarcodes, setShowBarcodes] = useState(false); // ⚡ ADD THIS LINE BACK
  const [enlargedCode, setEnlargedCode] = useState<{ url: string, title: string } | null>(null);

  const [showReportsOverlay, setShowReportsOverlay] = useState(false);
  const [activeLeftPanel, setActiveLeftPanel] = useState<'tasks' | 'calendar' | null>(null);
  const [showActivitySplit, setShowActivitySplit] = useState(false); 
  const [showCommentsSplit, setShowCommentsSplit] = useState(false); // ⚡ ADD THIS

  // Active Users State
  const [isUsersExpanded, setIsUsersExpanded] = useState(true);
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const [maxVisibleUsers, setMaxVisibleUsers] = useState(5);
  const usersContainerRef = useRef<HTMLDivElement>(null);
  const [activeUserDropdown, setActiveUserDropdown] = useState<string | null>(null);
  const [externalModalUser, setExternalModalUser] = useState<{ id: string; name: string } | null>(null);
  const [callModalUser, setCallModalUser] = useState<{ id: string; name: string } | null>(null);
  const [recordModalUser, setRecordModalUser] = useState<{ id: string; name: string } | null>(null);
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  const [directoryViewMode, setDirectoryViewMode] = useState<'grid' | 'list'>('grid');
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [directorySortKey, setDirectorySortKey] = useState<'name' | 'status'>('name');
  const [directorySortDir, setDirectorySortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const handleClickOutside = () => setActiveUserDropdown(null);
    if (activeUserDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeUserDropdown]);
  
  const mockAppUsers = React.useMemo(() => {
    return [
      { id: '1', name: 'John Doe', status: 'active' },
      { id: '2', name: 'Jane Smith', status: 'active' },
      { id: '3', name: 'Mike Johnson', status: 'idle' },
      { id: '4', name: 'Sarah Wilson', status: 'offline' },
      { id: '5', name: 'Tom Brown', status: 'idle' },
      { id: '6', name: 'Emily Davis', status: 'active' },
      ...Array.from({ length: 50 }).map((_, i) => {
        const rand = Math.random();
        return {
          id: `gen-${i + 7}`,
          name: `Test User ${i + 7}`,
          status: rand > 0.66 ? 'active' : rand > 0.33 ? 'idle' : 'offline'
        };
      })
    ].sort((a, b) => {
      const order: Record<string, number> = { active: 1, idle: 2, offline: 3 };
      return (order[a.status] || 4) - (order[b.status] || 4);
    });
  }, []);

  const processedDirectoryUsers = React.useMemo(() => {
    let filtered = mockAppUsers.filter(u => u.name.toLowerCase().includes(directorySearchQuery.toLowerCase()));
    filtered.sort((a, b) => {
      let valA = a[directorySortKey];
      let valB = b[directorySortKey];
      let comp = valA.localeCompare(valB);
      return directorySortDir === 'asc' ? comp : -comp;
    });
    return filtered;
  }, [directorySearchQuery, directorySortKey, directorySortDir, mockAppUsers]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTarget, setExportTarget] = useState<'all' | 'selected'>('all');
  const [selectedExportColumns, setSelectedExportColumns] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Active');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showAddToAppModal, setShowAddToAppModal] = useState(false);
  const [availableMiniApps, setAvailableMiniApps] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [targetAppId, setTargetAppId] = useState('');
  const [addToAppSearchQuery, setAddToAppSearchQuery] = useState('');

  const tableRef = useRef<HTMLTableElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewFilters, setViewFilters] = useState<ViewFilter[]>([]);
  const [viewSorting, setViewSorting] = useState<ViewSort[]>([]);
  const [viewGroupBy, setViewGroupBy] = useState<string | null>(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string | null>(null);

  const [dbRecords, setDbRecords] = useState<Array<Record<string, any>>>([]);
  const [miniAppId, setMiniAppId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const [newRecordFields, setNewRecordFields] = useState<Record<string, string>>({});
  const [dbError, setDbError] = useState<string | null>(null);
  const [schemaFields, setSchemaFields] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>({});
  const [itemIdSettings, setItemIdSettings] = useState<any>({});

  // ⚡ NEW: Local Alerts State & Listener
  const [appAlerts, setAppAlerts] = useState<any[]>([]);
  const [showAlertsPane, setShowAlertsPane] = useState(false);

  useEffect(() => {
    if (!miniAppId || !organization?.id) return;

    const fetchAlerts = async () => {
      try {
        const { data } = await supabase.schema('app_private')
          .from('notifications')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_dismissed', false);

        if (data) {
          // Filter down to only alerts belonging to THIS specific MiniApp
          const filtered = data.filter((n: any) => n.metadata?.mini_app_id === miniAppId);
          setAppAlerts(filtered);
          // Auto-hide the pane if the last alert is dismissed
          if (filtered.length === 0) setShowAlertsPane(false);
        }
      } catch (err) {
        console.error("Error fetching app alerts:", err);
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel(`miniapp-${miniAppId}-alerts`)
      .on('postgres_changes', {
        event: '*',
        schema: 'app_private',
        table: 'notifications',
        filter: `organization_id=eq.${organization.id}`
      }, () => fetchAlerts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [miniAppId, organization?.id]);
  
  const { getColor } = useWorkspaceColor();
  const activeColor = getColor(workspaceSlug);
  
  const wc = {
    primary: activeColor.primary,
    rgb: activeColor.rgb,
    glow: `rgba(${activeColor.rgb}, 0.3)`,
    border: `border-[rgba(${activeColor.rgb},0.3)]`,
    bg: `from-[rgba(${activeColor.rgb},0.2)]`
  };

  // ⚡ Smart singularization helper utilizing the database's itemName setting
  const singularAppName = React.useMemo(() => {
    if (appSettings?.itemName) return appSettings.itemName;
    
    // Fallback if the user never configured the Singular Item Name in the builder
    const name = appName || 'Record';
    if (name.toLowerCase().endsWith('ies')) return name.slice(0, -3) + 'y';
    if (name.toLowerCase().endsWith('s') && !name.toLowerCase().endsWith('ss')) return name.slice(0, -1);
    return name;
  }, [appName, appSettings?.itemName]);

  const loadRecords = useCallback(async () => {
  if (!organization?.id) return;
  setIsLoading(true);
  setDbError(null);

  try {
    // ⚡ 1. GET THE ORG GRAPH: Fetch all Workspaces strictly for this Organization ID
    const { data: orgWorkspaces, error: wsError } = await supabase.schema('app_private')
      .from('workspaces')
      .select('id, name, slug')
      .eq('organization_id', organization.id);

    if (wsError) throw wsError;

    let activeWs = orgWorkspaces?.find(ws => 
      workspaceId ? ws.id === workspaceId : ws.slug === workspaceSlug
    );

    if (!activeWs?.id) {
      setDbError(`Workspace could not be resolved.`);
      setIsLoading(false);
      return;
    }

    // ⚡ 2. FETCH APPS: Only look for apps belonging to this exact organization and workspace.
    const { data: apps, error: appError } = await supabase.schema('app_private')
      .from('mini_apps')
      .select('id, name, schema_definition, app_settings, item_id_settings, icon, workspace_id, is_preset, organization_id')
      .eq('organization_id', organization.id)
      .eq('workspace_id', activeWs.id);

    if (appError) throw appError;

    // ⚡ 3. PINPOINT TARGET APP
    let targetApp = apps?.find(a => a.name.toLowerCase() === appName.toLowerCase());

    // If it literally doesn't exist locally, gently fallback to checking global presets
    if (!targetApp) {
      const { data: presetApp } = await supabase.schema('app_private')
        .from('mini_apps')
        .select('id, name, schema_definition, app_settings, item_id_settings, icon, workspace_id, is_preset, organization_id')
        .eq('is_preset', true)
        .ilike('name', appName)
        .maybeSingle();
        
      if (presetApp) targetApp = presetApp;
    }

    if (targetApp) {
      const appId = targetApp.id;
      setMiniAppId(appId);
      if (targetApp.icon) setAppIconStr(targetApp.icon);
      
      const schemaDef = typeof targetApp.schema_definition === 'string' ? JSON.parse(targetApp.schema_definition) : targetApp.schema_definition;
      
      let combinedFields = [];
      if (schemaDef?.base_fields || schemaDef?.custom_fields) {
        combinedFields = [...(schemaDef.base_fields || []), ...(schemaDef.custom_fields || [])];
      } else if (schemaDef?.fields) {
        combinedFields = schemaDef.fields;
      }

      if (combinedFields && Array.isArray(combinedFields)) {
        const sorted = [...combinedFields].filter((f: any) => f.name || f.type === 'split_separator').sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setSchemaFields(sorted);
      } else {
        setSchemaFields([]);
      }
      
      const parsedSettings = typeof targetApp.app_settings === 'string' ? JSON.parse(targetApp.app_settings) : (targetApp.app_settings || {});
      setAppSettings(parsedSettings);
      
      const parsedIdSettings = typeof targetApp.item_id_settings === 'string' ? JSON.parse(targetApp.item_id_settings) : (targetApp.item_id_settings || {});
      setItemIdSettings(parsedIdSettings);
      
      const parentAppId = parsedSettings.parent_preset_id;
      
      // ⚡ 4. FETCH RECORDS
      // We explicitly query by organization_id to ensure absolute data isolation
      let query = supabase.schema('app_private').from('mini_app_records')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (parentAppId) {
        query = query.in('mini_app_id', [appId, parentAppId]);
      } else {
        query = query.eq('mini_app_id', appId);
      }

      const { data: records, error: recError } = await query;

      if (recError) throw recError;
      if (records && records.length > 0) {
        const transformed = records.map((r: any) => ({
          _db_id: r.id, _item_uid: r.item_uid, id: r.item_uid || r.id, ...((r.data as Record<string, any>) || {}),
          _created_at: r.created_at, _updated_at: r.updated_at,
        }));
        setDbRecords(transformed);
      } else { setDbRecords([]); }
    } else {
      setMiniAppId(null); setDbRecords([]); setSchemaFields([]); 
    }
  } catch (err: any) {
    setDbError(err.message || 'Failed to load records');
    setDbRecords([]);
  } finally { setIsLoading(false); }
}, [appName, organization?.id, workspaceId, workspaceSlug]);

  useEffect(() => { 
    loadRecords(); 
    
    // ⚡ Listen for Builder and Record updates so the Viewer refreshes instantly!
    const handleUpdate = () => loadRecords();
    
    window.addEventListener('miniapp_schema_updated', handleUpdate);
    window.addEventListener('miniapp_records_updated', handleUpdate);
    
    return () => {
      window.removeEventListener('miniapp_schema_updated', handleUpdate);
      window.removeEventListener('miniapp_records_updated', handleUpdate);
    };
  }, [loadRecords]);

  useEffect(() => {
    const container = usersContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      const availableAvatarWidth = width - 160; 
      if (availableAvatarWidth < 40) { setMaxVisibleUsers(0); } 
      else {
        const count = Math.floor((availableAvatarWidth - 40) / 32) + 1;
        setMaxVisibleUsers(Math.max(0, count));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { if (isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 150); }, [isSearchOpen]);

  const data = dbRecords;
  const columns = schemaFields.length > 0
    ? schemaFields.filter(f => f.name && f.type !== 'submenu').map((f: any) => f.name)
    : (data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'id' && !k.startsWith('connected') && !k.startsWith('_')) : []);

  const renderSchemaCell = (fieldName: string, value: any) => {
    const fieldDef = schemaFields.find((f: any) => f.name === fieldName);
    if (!fieldDef || !value) return renderCellContent(fieldName, value);
    switch (fieldDef.type) {
      case 'category_field': {
        const opts = fieldDef.settings?.categoryOptions || [];
        const opt = opts.find((o: any) => o.label === value);
        const badgeColor = opt?.color || wc.primary;
        const badgeRgb = hexToRgbStr(badgeColor);
        return (
          <span 
            className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold whitespace-nowrap inline-flex items-center justify-center" 
            style={{ 
              background: `linear-gradient(135deg, rgba(${badgeRgb}, 0.25), rgba(${badgeRgb}, 0.05))`,
              color: badgeColor, 
              border: `1px solid rgba(${badgeRgb}, 0.4)`,
              boxShadow: `0 0 12px rgba(${badgeRgb}, 0.3)`
            }}
          >
            {value}
          </span>
        );
      }
      case 'phone_number_field': return <a href={`tel:${value}`} className="text-green-400 hover:underline font-mono text-sm">{value}</a>;
      case 'email_address_field': return <a href={`mailto:${value}`} style={{ color: wc.primary }} className="hover:underline font-mono text-sm">{value}</a>;
      case 'date_field': try { return <span className="text-gray-300 font-mono text-sm">{new Date(value).toLocaleDateString()}</span>; } catch { return value; }
      case 'number_field': return <span className="text-gray-300 font-mono text-sm tabular-nums">{Number(value).toLocaleString(undefined, { minimumFractionDigits: fieldDef.settings?.decimals || 0, maximumFractionDigits: fieldDef.settings?.decimals || 0 })}</span>;
      case 'hyperlink_field': return <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: wc.primary }} className="hover:underline font-mono text-sm truncate block">{value}</a>;
      case 'location_field': return <span className="text-gray-300 font-mono text-sm">{value}</span>;
      case 'user_field': return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono" style={{ background: `rgba(${wc.rgb}, 0.1)`, border: `1px solid rgba(${wc.rgb}, 0.2)`, color: wc.primary }}>{value}</span>;
      default: return renderCellContent(fieldName, value);
    }
  };

  const renderSchemaInput = (fieldDefOrName: any, value: string, onChange: (val: string) => void, activeTabColor?: string) => {
    // ⚡ FIX: Allow passing full field objects directly so nested fields don't fail lookup!
    const isString = typeof fieldDefOrName === 'string';
    const fieldName = isString ? fieldDefOrName : (fieldDefOrName.name || 'Unnamed');
    const fieldDef = isString ? schemaFields.find((f: any) => f.name === fieldName) : fieldDefOrName;
    
    const focusColor = activeTabColor || wc.primary;
    const baseClass = "w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2 text-white font-mono focus:outline-none transition-colors duration-300";
    
    const handleFocus = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = focusColor; };
    const handleBlur = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = ''; };

    if (!fieldDef) return <input type="text" value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} placeholder={`Enter ${fieldName.toLowerCase()}`} />;
    
    switch (fieldDef.type) {
      case 'category_field': {
        const opts = fieldDef.settings?.categoryOptions || [];
        return (
          <div className="flex flex-wrap gap-2 w-full bg-gray-900/40 border border-gray-800 rounded-lg p-2 min-h-[42px] items-center">
            {opts.length === 0 && <span className="text-gray-600 text-xs font-mono px-2">No options defined</span>}
            {opts.map((o: any) => {
              const isSelected = value === o.label;
              const badgeColor = o.color || activeTabColor || wc.primary;
              const badgeRgb = hexToRgbStr(badgeColor);
              
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={(e) => { e.preventDefault(); onChange(isSelected ? '' : o.label); }}
                  className={`px-3 py-1.5 text-xs font-mono transition-all rounded-md border ${isSelected ? 'font-bold scale-105 z-10' : 'hover:scale-105 hover:brightness-125'}`}
                  style={{
                    background: isSelected ? `linear-gradient(135deg, rgba(${badgeRgb}, 0.25), rgba(${badgeRgb}, 0.05))` : 'transparent',
                    color: badgeColor,
                    borderColor: isSelected ? `rgba(${badgeRgb}, 0.5)` : `rgba(${badgeRgb}, 0.2)`,
                    opacity: isSelected ? 1 : 0.6,
                    boxShadow: isSelected ? `0 0 14px rgba(${badgeRgb}, 0.4), inset 0 0 8px rgba(${badgeRgb}, 0.2)` : 'none'
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      }
      case 'connection_field':
      case 'connection':
        return (
          <ConnectionSelect 
            fieldDef={fieldDef} 
            value={value} 
            onChange={onChange} 
            organizationId={organization?.id || ''} 
            workspaceSlug={workspaceSlug}
            currentRecordId={editingRecord?._item_uid || editingRecord?.id || selectedRecord?._item_uid || selectedRecord?.id || null}
            wsColor={{ ...wc, primary: focusColor, rgb: hexToRgbStr(focusColor) }}
            hostAppSettings={appSettings}
            onPreview={setPreviewConnection}
          />
        );
      case 'visualizer_field':
        // ⚡ Automatically render the self-contained Chart Engine!
        const currentData = editingRecord || selectedRecord || newRecordFields || {};
        return <VisualizerChart fieldDef={fieldDef} currentData={currentData} baseColor={focusColor} baseRgb={hexToRgbStr(focusColor)} />;
      case 'date_field': return <input type="date" value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} />;
      case 'number_field': 
        // ⚡ Dynamic Simulation Integration
        if (fieldDef.settings?.isDynamicSimulation) {
          return <DynamicSimulationInput fieldDef={fieldDef} onChange={(val) => onChange(val)} currentValue={value} baseColor={focusColor} baseRgb={hexToRgbStr(focusColor)} />;
        }
        return <input type="number" step={fieldDef.settings?.decimals ? `0.${'0'.repeat((fieldDef.settings.decimals || 1) - 1)}1` : '1'} value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} placeholder="0" />;
      case 'phone_number_field': return <input type="tel" value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} placeholder="+1 (555) 123-4567" />;
      case 'email_address_field': return <input type="email" value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} placeholder="email@example.com" />;
      case 'hyperlink_field': return <input type="url" value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} placeholder="https://..." />;
      case 'text_field': if (fieldDef.settings?.multiline) return <textarea value={value} onChange={e => onChange(e.target.value)} className={`${baseClass} h-24 resize-none`} onFocus={handleFocus} onBlur={handleBlur} placeholder={`Enter ${fieldName.toLowerCase()}`} />;
        return <input type="text" value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} placeholder={`Enter ${fieldName.toLowerCase()}`} />;
      default: return <input type="text" value={value} onChange={e => onChange(e.target.value)} className={baseClass} onFocus={handleFocus} onBlur={handleBlur} placeholder={`Enter ${fieldName.toLowerCase()}`} />;
    }
  };

  let processedData = data.filter(item => Object.entries(item).some(([key, val]) => !key.startsWith('_') && String(val).toLowerCase().includes(searchQuery.toLowerCase())));

  viewFilters.forEach(filter => {
    processedData = processedData.filter(item => {
      const val = String(item[filter.field] ?? '').toLowerCase();
      const fv = filter.value.toLowerCase();
      switch (filter.operator) {
        case 'eq': return val === fv; case 'neq': return val !== fv; case 'contains': return val.includes(fv);
        case 'gt': return parseFloat(val) > parseFloat(fv); case 'lt': return parseFloat(val) < parseFloat(fv);
        case 'empty': return !val; case 'not_empty': return !!val; default: return true;
      }
    });
  });

  if (viewSorting.length > 0) {
    processedData = [...processedData].sort((a, b) => {
      for (const sort of viewSorting) {
        const aVal = String(a[sort.field] ?? ''); const bVal = String(b[sort.field] ?? '');
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
        if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }

  let filteredData = processedData;

  // 1. Calculate the FULL group list so the sidebar always shows every option
  const sidebarGroupedData = viewGroupBy ? (() => {
    const groups: Record<string, typeof filteredData> = {};
    filteredData.forEach(item => {
      const key = String(item[viewGroupBy] || 'Ungrouped');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  })() : null;

  // 2. Filter the actual view down to ONLY the group you clicked on
  if (viewGroupBy && activeGroupFilter) {
    filteredData = filteredData.filter(item => String(item[viewGroupBy] || 'Ungrouped') === activeGroupFilter);
  }

  // 3. Re-calculate the groups to render on the main table
  const groupedData = viewGroupBy ? (() => {
    const groups: Record<string, typeof filteredData> = {};
    filteredData.forEach(item => {
      const key = String(item[viewGroupBy] || 'Ungrouped');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  })() : null;

  // ⚡ SEQUENTIAL WORKFLOW ENGINE (ENTERPRISE)
  const executeWorkflows = async (triggerEvent: 'record_created' | 'record_updated', recordData: any, recordId: string) => {
    if (!miniAppId) return;

    let workflowsToRun: any[] = [];

    // Try the dedicated workflows table first
    const { data: wfData, error: fetchError } = await supabase.schema('app_private')
      .from('mini_app_workflows')
      .select('*')
      .eq('mini_app_id', miniAppId)
      .eq('is_active', true)
      .eq('trigger_event', triggerEvent);

    if (!fetchError && wfData && wfData.length > 0) {
      workflowsToRun = wfData;
    } else if (appSettings?.workflows && Array.isArray(appSettings.workflows)) {
      // ⚡ FALLBACK: If the table save was blocked by RLS, read from the JSON fallback!
      workflowsToRun = appSettings.workflows
        .filter((w: any) => w.isActive && w.trigger === triggerEvent)
        .map((w: any) => ({
          ...w,
          steps: w.steps,
          trigger_event: w.trigger,
          is_active: w.isActive
        }));
    }

    if (workflowsToRun.length === 0) return;

    const safeParse = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return fallback; }
      }
      return val;
    };

    const parseDynamicTokens = (text: string, data: any, schema: any[]) => {
      if (!text || typeof text !== 'string') return text;
      let parsedText = text;
      schema.forEach(field => {
        const token = `@${(field.name || '').replace(/\s+/g, '')}`;
        const val = data[field.id] || data[field.name] || '';
        parsedText = parsedText.split(token).join(String(val));
      });
      return parsedText;
    };

    for (const wf of workflowsToRun) {
      // ⚡ The new sequential steps array
      const steps = safeParse(wf.steps, []);
      let workflowPasses = true;

      for (const step of steps) {
        if (!workflowPasses) break; // Stop execution if a previous condition failed

        try {
          if (step.type === 'condition') {
            const rule = step.config;
            const val1 = String(recordData[rule.fieldId] || '').toLowerCase();
            const val2 = String(rule.value || '').toLowerCase();
            let result = false;
            
            switch(rule.operator) {
              case 'equals': result = val1 === val2; break;
              case 'not_equals': result = val1 !== val2; break;
              case 'contains': result = val1.includes(val2); break;
              case 'greater_than': result = Number(recordData[rule.fieldId]) > Number(rule.value); break;
              case 'less_than': result = Number(recordData[rule.fieldId]) < Number(rule.value); break;
              case 'is_empty': result = !val1; break;
              case 'is_not_empty': result = !!val1; break;
            }
            if (!result) workflowPasses = false; // Kill the timeline
          }
          
          else if (step.type === 'create_record' && step.config?.targetAppId) {
            const { data: targetApp } = await supabase.schema('app_private').from('mini_apps').select('name, item_id_settings, schema_definition').eq('id', step.config.targetAppId).single();
            if (!targetApp) continue;

            const targetSchema = targetApp.schema_definition ? safeParse(targetApp.schema_definition, { fields: [] }) : { fields: [] };
            const targetFields = targetSchema.fields || [];
            const newRecordData: any = {};
            
            Object.entries(step.config.fieldMapping || {}).forEach(([targetFieldId, sourceFieldId]) => {
              const mappedValue = sourceFieldId === '_record_id' ? recordId : recordData[sourceFieldId as string];
              newRecordData[targetFieldId] = mappedValue;
              const targetFieldDef = targetFields.find((f: any) => f.id === targetFieldId);
              if (targetFieldDef && targetFieldDef.name) newRecordData[targetFieldDef.name] = mappedValue; 
            });
            
            const targetSettings = targetApp.item_id_settings ? safeParse(targetApp.item_id_settings, {}) : {};
            const prefix = targetSettings.prefix || targetApp.name?.substring(0, 3).toUpperCase() || 'APP';
            const itemUid = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

            const { error: insertError } = await supabase.schema('app_private').from('mini_app_records').insert({
              mini_app_id: step.config.targetAppId,
              organization_id: organization?.id,
              item_uid: itemUid,
              data: newRecordData,
              created_by: user?.id || null,
              updated_by: user?.id || null
            });
            if (!insertError) window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
          }
          
          else if (step.type === 'update_record') {
            const updates: any = {};
            Object.entries(step.config.fieldUpdates || {}).forEach(([fieldId, newValue]) => {
              const parsedValue = parseDynamicTokens(newValue as string, recordData, schemaFields);
              updates[fieldId] = parsedValue;
              const targetFieldDef = schemaFields.find((f: any) => f.id === fieldId);
              if (targetFieldDef && targetFieldDef.name) updates[targetFieldDef.name] = parsedValue; 
            });

            await supabase.schema('app_private').from('mini_app_records')
              .update({ data: { ...recordData, ...updates }, updated_at: new Date().toISOString() })
              .eq('id', recordId);
            window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
          }
          
          else if (step.type === 'send_task') {
            const taskTitle = parseDynamicTokens(step.config.taskTitle, recordData, schemaFields);
            await supabase.schema('app_private').from('tasks').insert({
              title: taskTitle,
              assignee_id: step.config.assigneeId,
              related_record_id: recordId,
              organization_id: organization?.id,
              app_name: appName // ⚡ Injects the MiniApp's name as the breadcrumb source
            });
          }

          else if (step.type === 'webhook') {
            const url = parseDynamicTokens(step.config.url, recordData, schemaFields);
            if (url) {
                // In production, this should ideally route through an edge function
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ triggerEvent, recordId, recordData })
                }).catch(e => console.error("Webhook failed:", e));
            }
          }
          
          // ⚡ NEW: GLOBAL SEND ALERT ACTION
          else if (step.type === 'send_alert') {
            // We need the workspace_id for the UI badges to light up correctly
            const { data: appInfo } = await supabase.schema('app_private')
              .from('mini_apps')
              .select('workspace_id')
              .eq('id', miniAppId)
              .single();

            const alertTitle = parseDynamicTokens(step.config.alertTitle, recordData, schemaFields);
            const alertMessage = parseDynamicTokens(step.config.alertMessage, recordData, schemaFields);

            // ⚡ FIX: Added .schema('app_private') so it hits the correct table!
            const { error: alertError } = await supabase.schema('app_private').from('notifications').insert({
              organization_id: organization?.id,
              type: 'alert',
              category: 'system',
              title: alertTitle || 'System Alert',
              message: alertMessage || '',
              metadata: {
                workspace_id: appInfo?.workspace_id,
                mini_app_id: miniAppId,
                record_id: recordId
              },
              is_read: false,
              is_dismissed: false
            });
            
            if (alertError) console.error("Failed to send alert:", alertError);
          }
        } catch (err: any) {
          console.error(`[Workflow Step Error]:`, err);
        }
      }
    }
  };

  const handleCreateRecord = async () => {
  if (!miniAppId) { alert('Error: No MiniApp ID found!'); return; }
  setIsSaving(true);
  
  try {
    let targetMiniAppId = miniAppId;

    // ⚡ JIT CLONING CHECK
    // Determine if the active app is a Preset
    const { data: currentApp } = await supabase.schema('app_private')
      .from('mini_apps')
      .select('is_preset, schema_definition, app_settings, item_id_settings, icon')
      .eq('id', miniAppId)
      .single();

    if (currentApp?.is_preset) {
      // Find the correct workspace ID for this org
      const { data: targetWs } = await supabase.schema('app_private')
        .from('workspaces')
        .select('id')
        .eq('organization_id', organization?.id)
        .eq('slug', workspaceSlug.toLowerCase()) // Match the active view
        .single();

      if (!targetWs) throw new Error("Could not resolve workspace ID for cloning.");

      // ⚡ FIX: Safely parse app_settings to inject parent_preset_id
      const parsedSettings = typeof currentApp.app_settings === 'string' 
        ? JSON.parse(currentApp.app_settings) 
        : (currentApp.app_settings || {});

      // Clone the Preset to the User's Workspace
      const { data: newApp, error: cloneError } = await supabase.schema('app_private')
        .from('mini_apps')
        .insert({
          organization_id: organization?.id,
          workspace_id: targetWs.id,
          name: appName,
          slug: appName.toLowerCase().replace(/\s+/g, '-'),
          icon: currentApp.icon,
          schema_definition: currentApp.schema_definition,
          item_id_settings: currentApp.item_id_settings,
          is_preset: false, // Strip the preset flag!
          // ⚡ Inject the parent ID INSIDE the settings JSON!
          app_settings: {
            ...parsedSettings,
            parent_preset_id: miniAppId 
          }
        })
        .select('id')
        .single();

      if (cloneError) throw cloneError;
      
      targetMiniAppId = newApp.id;
      setMiniAppId(newApp.id); // Update React state to the newly cloned app
    }

    // Now insert the record mapped to the correct App and Org ID
    const itemUid = `${appName.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const payload = { 
      mini_app_id: targetMiniAppId, 
      organization_id: organization?.id, 
      item_uid: itemUid, 
      data: { ...newRecordFields }, 
      created_by: user?.id || null, 
      updated_by: user?.id || null 
    };
    
    const { data, error } = await supabase.schema('app_private').from('mini_app_records').insert(payload).select();
    if (error) throw error;
    
    // TRIGGER WORKFLOWS
    if (data && data.length > 0) {
      await executeWorkflows('record_created', { ...newRecordFields }, data[0].item_uid || data[0].id);
    }

    handleCloseAddModal();
    await loadRecords(); // Refresh using the new ID logic
    window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
    logActivity({ workspace_slug: workspaceSlug, user_id: userId, user_name: userName, action_type: 'created', entity_type: 'record', entity_name: appName, target: appName, action: 'created a new record in' });
  } catch (err: any) { 
    console.error("[Create Record Error]:", err); // ⚡ Now it won't fail silently
    setDbError(err.message || 'Failed to create record'); 
  } finally { 
    setIsSaving(false); 
  }
};

  const handleUpdateRecord = async () => {
    if (!editingRecord?._db_id) return;
    setIsSaving(true);
    try {
      const { _db_id, _item_uid, _created_at, _updated_at, id, ...dataFields } = editingRecord;
      const { error } = await supabase.schema('app_private').from('mini_app_records').update({ data: dataFields, updated_by: user?.id || null, updated_at: new Date().toISOString() }).eq('id', _db_id);
      if (error) throw error;

      // ⚡ TRIGGER WORKFLOWS
      await executeWorkflows('record_updated', dataFields, _item_uid || id);

      handleCloseRecord(); await loadRecords();
      logActivity({ workspace_slug: workspaceSlug, user_id: userId, user_name: userName, action_type: 'updated', entity_type: 'record', entity_name: appName, target: appName, action: 'updated a record in' });
    } catch (err: any) { setDbError(err.message || 'Failed to update record'); } finally { setIsSaving(false); }
  };

  const handleDeleteRecord = async (record: Record<string, any>) => {
    if (!record._db_id) return;
    if (!confirm('Delete this record permanently?')) return;
    try {
      const { error } = await supabase.schema('app_private').from('mini_app_records').delete().eq('id', record._db_id);
      if (error) throw error;
      if (selectedRecord?._db_id === record._db_id) handleCloseRecord();
      await loadRecords();
      window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
      logActivity({ workspace_slug: workspaceSlug, user_id: userId, user_name: userName, action_type: 'deleted', entity_type: 'record', entity_name: appName, target: appName, action: 'deleted a record from' });
    } catch (err: any) { setDbError(err.message || 'Failed to delete record'); }
  };

  const openExportModal = (target: 'all' | 'selected') => {
    setExportTarget(target);
    setSelectedExportColumns(new Set(columns)); // Pre-select all columns
    setShowExportModal(true);
    setShowGearMenu(false);
  };

  const handleExport = () => { 
    if (filteredData.length === 0) return; 
    openExportModal('all'); 
  };

  const handleConfirmExport = () => {
    const records = exportTarget === 'selected' ? getSelectedRecords() : filteredData;
    const columnsToExport = columns.filter(col => selectedExportColumns.has(col));
    const fileName = exportTarget === 'selected' ? `${appName}_Bulk_Export` : appName;
    
    // Trigger the download
    exportToCSV(records, columnsToExport, fileName);
    
    // Defer the UI cleanup to prevent React from unmounting the modal 
    // before the browser executes the asynchronous download sequence
    setTimeout(() => {
      setShowExportModal(false);
      if (exportTarget === 'selected') {
         setSelectedIds(new Set());
         setMultiSelectMode(false);
      }
    }, 150);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string);
      setImportData(parsed);
      const mapping: Record<string, string> = {};
      parsed.headers.forEach(h => { const match = columns.find(c => c.toLowerCase() === h.toLowerCase()); if (match) mapping[h] = match; });
      setImportMapping(mapping); setShowImportModal(true);
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleImportRecords = async () => {
    if (!importData || !miniAppId || !organization?.id) return;
    setIsImporting(true);
    try {
      const records = importData.rows.map(row => {
        const data: Record<string, string> = {};
        importData.headers.forEach((h, i) => { const targetCol = importMapping[h]; if (targetCol) data[targetCol] = row[i] || ''; });
        return { mini_app_id: miniAppId, organization_id: organization.id, item_uid: `${appName.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`, data, created_by: user?.id || null, updated_by: user?.id || null };
      });
      for (let i = 0; i < records.length; i += 50) {
        const { error } = await supabase.schema('app_private').from('mini_app_records').insert(records.slice(i, i + 50));
        if (error) throw error;
      }
      setShowImportModal(false); setImportData(null); setImportMapping({}); await loadRecords();
      
      // ⚡ FIX: Tell the dashboard to recount after a bulk import
      window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
      
    } catch (err: any) { setDbError(err.message || 'Import failed'); } finally { setIsImporting(false); }
  };

  const toggleConnectionExpand = (recordId: string) => setExpandedConnections(prev => ({ ...prev, [recordId]: !prev[recordId] }));

  useEffect(() => {
    if (columns.length > 0 && Object.keys(columnWidths).length === 0) {
      const widths: Record<string, number> = {};
      columns.forEach(col => {
        const maxLength = Math.max(col.length, ...data.map(row => String(row[col] || '').length));
        widths[col] = Math.min(Math.max(maxLength * 10, 80), 250);
      });
      setColumnWidths(widths);
    }
  }, [columns, data]);

  const handleColumnResize = (column: string, e: React.MouseEvent) => {
    e.preventDefault(); setResizingColumn(column);
    const startX = e.clientX; const startWidth = columnWidths[column] || 100;
    const handleMouseMove = (moveEvent: MouseEvent) => setColumnWidths(prev => ({ ...prev, [column]: Math.max(60, startWidth + (moveEvent.clientX - startX)) }));
    const handleMouseUp = () => { setResizingColumn(null); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getEventsForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredData.filter(item => item.date === dateStr || item.dueDate === dateStr);
  };

  const handleNewWindow = () => {
    // Safely use the exact path the user is currently on to avoid 404s and login redirects
    const currentPath = window.location.pathname;
    window.open(`${currentPath}?workspace=${workspaceSlug}&app=${encodeURIComponent(appName)}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no');
  };

  const getItemUrl = (itemId: string) => {
    return `${window.location.origin}${window.location.pathname}?workspace=${workspaceSlug}&app=${encodeURIComponent(appName)}&record=${itemId}`;
  };

  // ⚡ Global Keyboard Shortcuts for QR / Barcode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Handle Escape: Close the modal if it's open
      if (e.key === 'Escape' && enlargedCode) {
        setEnlargedCode(null);
        return;
      }

      // 2. Abort if no record is selected
      if (!selectedRecord) return;

      // 3. Abort if the user is currently typing in an input field or textarea
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        (activeEl as HTMLElement).isContentEditable
      );

      if (isTyping) return;

      // 4. Check for Q or B and trigger or toggle the respective modal
      const key = e.key.toLowerCase();
      const itemId = selectedRecord._item_uid || selectedRecord.id;

      if (key === 'q' && itemIdSettings?.showQrCode) {
        e.preventDefault(); // Stop default browser behaviors (like searching)
        if (enlargedCode?.title === 'QR Code') {
          setEnlargedCode(null); // Toggle off if already open
        } else {
          setEnlargedCode({ 
            url: `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(getItemUrl(itemId))}&scale=8&barcolor=${wc.primary.replace('#','')}`, 
            title: 'QR Code' 
          });
        }
      } else if (key === 'b' && itemIdSettings?.showBarcode) {
        e.preventDefault();
        if (enlargedCode?.title === 'Barcode') {
          setEnlargedCode(null); // Toggle off if already open
        } else {
          setEnlargedCode({ 
            url: `https://bwipjs-api.metafloor.com/?bcid=${itemIdSettings.barcodeSymbology || 'code128'}&text=${encodeURIComponent(itemId)}&scale=6&height=24&barcolor=${wc.primary.replace('#','')}`, 
            title: 'Barcode' 
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecord, enlargedCode, itemIdSettings, wc.primary, workspaceSlug, appName]);

  const renderCellContent = (col: string, value: any) => {
    if (col === 'status') return <span className={`px-2 py-1 rounded border text-xs font-mono font-medium ${getStatusClasses(value)}`}>{value}</span>;
    if (col === 'priority') return <span className={`px-2 py-1 rounded border text-xs font-mono font-medium ${value === 'High' ? 'bg-red-500/20 text-red-400 border-red-500/40' : value === 'Medium' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-gray-500/20 text-gray-400 border-gray-500/40'}`}>{value}</span>;
    if (col === 'progress') return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <div className="h-full rounded-full" style={{ width: `${value}%`, background: `linear-gradient(to right, ${wc.primary}, ${wc.primary}80)`, boxShadow: `0 0 8px ${wc.glow}` }} />
        </div><span className="text-xs text-gray-400 font-mono">{value}%</span>
      </div>
    );
    if (col === 'email') return <a href={`mailto:${value}`} style={{ color: wc.primary }} className="hover:underline">{value}</a>;
    if (col === 'phone') return <a href={`tel:${value}`} className="text-green-400 hover:underline">{value}</a>;
    return value;
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Active': case 'Completed': return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'In Progress': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      case 'Pending': case 'Planning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  const gearMenuItems = [
    // ⚡ FIX: Only fire the edit event if we have a strict, resolved miniAppId. 
    // Removed the "|| undefined" fallback that was causing the builder to guess which app to edit.
    { 
      icon: EditIcon, 
      label: 'Edit', 
      action: () => { 
        setShowGearMenu(false); 
        if (onEditTemplate && miniAppId) onEditTemplate(appName, miniAppId); 
      }, 
      adminOnly: true 
    },
    { icon: WorkflowIcon, label: 'Workflows', action: () => { setShowGearMenu(false); }, adminOnly: true },
    { icon: EyeOffIcon, label: 'Hide', action: () => { setShowGearMenu(false); }, adminOnly: true },
    { icon: LinkIcon, label: 'Integrations', action: () => { setShowGearMenu(false); }, adminOnly: true },
    { divider: true },
    { icon: Share2Icon, label: 'Share', action: () => { setShowGearMenu(false); }, adminOnly: false },
    { icon: UploadIcon, label: 'Import CSV', action: () => { setShowGearMenu(false); fileInputRef.current?.click(); }, adminOnly: true },
    { icon: DownloadIcon, label: 'Export CSV', action: () => { handleExport(); }, adminOnly: false },
    { divider: true },
    { icon: BellIcon, label: 'Notifications', action: () => { setShowGearMenu(false); }, adminOnly: false },
    { icon: SettingsIcon, label: 'Advanced', action: () => { setShowGearMenu(false); setShowAdvancedSettings(true); }, adminOnly: true },
  ];

  const selectedRecordIndex = selectedRecord ? filteredData.findIndex(r => (r._db_id || r.id) === (selectedRecord._db_id || selectedRecord.id)) : -1;
  const canGoPrev = selectedRecordIndex > 0;
  const canGoNext = selectedRecordIndex >= 0 && selectedRecordIndex < filteredData.length - 1;
  const goToPrevRecord = () => { if (canGoPrev) { setSelectedRecord(filteredData[selectedRecordIndex - 1]); setEditingRecord(null); } };
  const goToNextRecord = () => { if (canGoNext) { setSelectedRecord(filteredData[selectedRecordIndex + 1]); setEditingRecord(null); } };

  const renderTableRows = (items: typeof filteredData) => items.map(item => {
    const connections = getConnectedItems(item);
    const hasConnections = connections.length > 0;
    const isExpanded = expandedConnections[item.id];
    const itemKey = item._db_id || item.id;
    const isSelected = selectedIds.has(itemKey);
    return (
      <React.Fragment key={item.id}>
        <tr
          className="transition-colors cursor-pointer"
          style={isSelected ? { backgroundColor: `rgba(${wc.rgb}, 0.1)` } : {}}
          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = `rgba(${wc.rgb}, 0.05)`; }}
          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = ''; }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'A' || target.closest('a') || target.closest('button')) return;
            setClickOrigin({ x: e.clientX, y: e.clientY });
            setSelectedRecord(item); setEditingRecord(null);
          }}
        >
          {multiSelectMode && (
            <td className="p-2 pl-4 w-10">
              <button onClick={(e) => { e.stopPropagation(); toggleRecordSelection(itemKey); }} className="p-1 rounded transition-all">
                {isSelected ? <CheckSquareIcon size={16} style={{ color: wc.primary }} /> : <SquareIcon size={16} className="text-gray-600" />}
              </button>
            </td>
          )}
          {columns.map(col => (
            <td key={col} className="p-4 text-gray-300 font-mono text-sm truncate" style={{ maxWidth: columnWidths[col] || 'auto' }}>{schemaFields.length > 0 ? renderSchemaCell(col, item[col]) : renderCellContent(col, item[col])}</td>
          ))}
          <td className="p-4 text-center">
            {hasConnections ? (
              <button onClick={(e) => { e.stopPropagation(); toggleConnectionExpand(item.id); }} className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded-lg text-xs font-mono hover:bg-green-500/30 transition-all">
                <LinkIcon size={12} />{connections.reduce((acc, c) => acc + c.items.length, 0)} linked
                <ChevronDownIcon size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            ) : <span className="text-xs text-gray-600 font-mono">None</span>}
          </td>
        </tr>
        {hasConnections && isExpanded && (
          <tr><td colSpan={columns.length + (multiSelectMode ? 2 : 1)} className="p-0">
            <div className="bg-green-950/20 border-t border-green-500/20 p-4">
              <div className="flex items-center gap-2 mb-3"><GitBranchIcon size={16} className="text-green-400" /><h4 className="text-sm font-mono font-medium text-green-400">Connected Items</h4></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {connections.map((connection, idx) => (
                  <div key={idx} className="bg-black/50 border border-green-500/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-mono mb-2">{connection.appName}</p>
                    {connection.items.map((itemName, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2 p-2 bg-gray-900/50 border border-gray-800 rounded hover:border-green-500/30 transition-all cursor-pointer">
                        <LinkIcon size={12} className="text-green-400" /><span className="text-sm text-white font-mono">{itemName}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </td></tr>
        )}
      </React.Fragment>
    );
  });

  const renderTableLayout = () => {
    if (groupedData) {
      return (
        <div className="space-y-4">
          {Object.entries(groupedData).map(([groupKey, items]) => (
            <div key={groupKey} className="bg-black/80 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(${wc.rgb}, 0.3)` }}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: `linear-gradient(to right, rgba(${wc.rgb}, 0.1), transparent)`, borderBottom: `1px solid rgba(${wc.rgb}, 0.15)` }}>
                <span className="text-xs font-mono uppercase text-gray-500">{viewGroupBy}:</span>
                <span className="text-sm font-mono font-medium" style={{ color: wc.primary }}>{groupKey}</span>
                <span className="text-[10px] text-gray-600 font-mono ml-auto">{items.length} records</span>
              </div>
              <div className="overflow-x-auto darkwave-scrollbar">
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                  <tbody className="divide-y divide-gray-800/50">{renderTableRows(items)}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="bg-black/80 rounded-xl overflow-hidden relative" style={{ border: `1px solid rgba(${wc.rgb}, 0.3)`, boxShadow: `0 0 30px rgba(${wc.rgb}, 0.05)` }}>
        <div className="overflow-x-auto darkwave-scrollbar">
          <table ref={tableRef} className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead style={{ background: `linear-gradient(to right, rgba(${wc.rgb}, 0.08), rgba(0,0,0,1), rgba(${wc.rgb}, 0.08))`, borderBottom: `1px solid rgba(${wc.rgb}, 0.2)` }}>
              <tr>
                {multiSelectMode && (
                  <th className="p-2 pl-4 w-10">
                    <button onClick={selectAll} className="p-1 rounded transition-all">
                      {selectedIds.size === filteredData.length && filteredData.length > 0 ? <CheckSquareIcon size={16} style={{ color: wc.primary }} /> : <SquareIcon size={16} className="text-gray-500" />}
                    </button>
                  </th>
                )}
                {columns.map(col => (
                  <th key={col} className="text-left p-4 text-sm font-mono font-medium text-gray-400 uppercase tracking-wider relative group" style={{ width: columnWidths[col] || 'auto' }}>
                    {col.replace(/([A-Z])/g, ' $1').trim()}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-opacity-50" style={{ backgroundColor: resizingColumn === col ? `rgba(${wc.rgb}, 0.5)` : 'transparent' }} onMouseDown={(e) => handleColumnResize(col, e)} />
                  </th>
                ))}
                <th className="text-center p-4 text-sm font-mono font-medium text-gray-400 uppercase tracking-wider w-32">
                  <span className="flex items-center justify-center gap-1"><GitBranchIcon size={14} className="text-green-400" />Connections</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">{renderTableRows(filteredData)}</tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCardLayout = () => {
    const cardConfig = appSettings?.cardLayoutConfig;
    let primaryFields: string[] = [];
    let secondaryFields: string[] = [];
    let visualizerFieldDef: any = null;

    if (cardConfig) {
      primaryFields = (cardConfig.primary || []).filter(Boolean);
      if (cardConfig.useVisualizer) {
        visualizerFieldDef = schemaFields.find(f => f.id === cardConfig.visualizerField);
      } else {
        secondaryFields = (cardConfig.secondary || []).filter(Boolean);
      }
    } else {
      // Fallback if no custom config exists
      const visibleFields = schemaFields.length > 0 ? schemaFields.filter(f => f.name && f.type !== 'submenu').slice(0, 4) : [];
      primaryFields = [visibleFields[0]?.name || columns[0] || 'name', ...visibleFields.slice(1, 4).map(f => typeof f === 'string' ? f : f.name)];
      secondaryFields = [];
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredData.map(item => {
          const primaryCol = primaryFields[0] || 'name';
          const isExpanded = expandedCards[item.id];
          const hasExpandableContent = secondaryFields.length > 0 || visualizerFieldDef;

          return (
            <div key={item.id} id={`record-card-${item.id}`} className="scroll-my-8 bg-black/80 rounded-xl p-4 transition-all cursor-pointer group relative overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-lg" style={{ border: `1px solid rgba(${wc.rgb}, 0.3)` }} onClick={(e) => { setClickOrigin({ x: e.clientX, y: e.clientY }); setSelectedRecord(item); }}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-mono font-medium truncate flex-1 transition-colors group-hover:opacity-80">{item[primaryCol] ?? item.name ?? 'Untitled'}</h3>
              </div>
              
              <div className="space-y-2 text-sm flex-1">
                {primaryFields.slice(1).map(colName => {
                  const val = item[colName];
                  if (val === undefined || val === null || val === '') return null;
                  return (
                    <div key={colName} className="flex items-center justify-between">
                      <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{colName}</span>
                      <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{schemaFields.length > 0 ? renderSchemaCell(colName, val) : renderCellContent(colName, val)}</span>
                    </div>
                  );
                })}
              </div>

              {hasExpandableContent && (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-col" onClick={(e) => { e.stopPropagation(); toggleCardExpand(item.id); }}>
                  <button className="w-full flex items-center justify-center p-1 text-slate-500 hover:text-white transition-colors bg-white/5 rounded hover:bg-white/10">
                    <ChevronDownIcon size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div className={`grid transition-all duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`} onClick={e => e.stopPropagation()}>
                    <div className="overflow-hidden">
                      <div className="cursor-default space-y-2 text-sm">
                        {visualizerFieldDef ? (
                          isExpanded && <VisualizerChart fieldDef={visualizerFieldDef} currentData={item} />
                        ) : (
                          secondaryFields.map(colName => {
                            const val = item[colName];
                            if (val === undefined || val === null || val === '') return null;
                            return (
                              <div key={colName} className="flex items-center justify-between">
                                <span className="text-gray-500 font-mono text-xs uppercase truncate max-w-[40%]">{colName}</span>
                                <span className="text-gray-300 font-mono truncate ml-2 flex-1 text-right">{schemaFields.length > 0 ? renderSchemaCell(colName, val) : renderCellContent(colName, val)}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBadgeLayout = () => {
    const primaryCol = columns[0] || 'name'; const subtitleCol = columns[1] || null;
    return (
      <div className="flex flex-wrap gap-3">
        {filteredData.map(item => {
          const initial = String(item[primaryCol] ?? '').charAt(0) || '?';
          return (
            <div key={item.id} className="inline-flex items-center gap-3 bg-black/80 rounded-full px-4 py-2 transition-all cursor-pointer" style={{ border: `1px solid rgba(${wc.rgb}, 0.3)` }} onClick={(e) => { setClickOrigin({ x: e.clientX, y: e.clientY }); setSelectedRecord(item); }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-mono text-sm" style={{ background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.8))` }}>{initial}</div>
              <div className="flex flex-col">
                <span className="text-white font-mono text-sm">{item[primaryCol] ?? 'Untitled'}</span>
                {subtitleCol && item[subtitleCol] && <span className="text-xs font-mono" style={{ color: wc.primary }}>{schemaFields.length > 0 ? renderSchemaCell(subtitleCol, item[subtitleCol]) : item[subtitleCol]}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendarLayout = () => {
    const daysInMonth = getDaysInMonth(currentMonth); const firstDay = getFirstDayOfMonth(currentMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1); const blanks = Array.from({ length: firstDay }, (_, i) => i);
    return (
      <div className="bg-black/80 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(${wc.rgb}, 0.3)` }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid rgba(${wc.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wc.rgb}, 0.08), rgba(0,0,0,1), rgba(${wc.rgb}, 0.08))` }}>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={{ color: wc.primary }}><ChevronLeftIcon size={20} /></button>
          <h3 className="text-white font-mono font-medium">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={{ color: wc.primary }}><ChevronRightIcon size={20} /></button>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="p-3 text-center text-xs font-mono text-gray-500 uppercase">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {blanks.map(i => <div key={`blank-${i}`} className="h-24 border-b border-r border-gray-800/50 bg-gray-900/20" />)}
          {days.map(day => {
            const events = getEventsForDate(day);
            return (
              <div key={day} className="h-24 border-b border-r border-gray-800/50 p-1 overflow-hidden hover:bg-gray-800/30 transition-colors">
                <div className="text-xs font-mono mb-1 text-gray-500">{day}</div>
                <div className="space-y-1 overflow-y-auto max-h-16">
                  {events.slice(0, 3).map((event, idx) => (
                    <div key={idx} className="text-xs px-1 py-0.5 rounded truncate cursor-pointer" style={{ background: `rgba(${wc.rgb}, 0.2)`, color: wc.primary }} onClick={(e) => { setClickOrigin({ x: e.clientX, y: e.clientY }); setSelectedRecord(event); }}>{event.name}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleApplyView = (view: { layout: string; filters: ViewFilter[]; sorting: ViewSort[]; columnWidths: Record<string, number>; groupBy: string | null }) => {
    if (view.layout && ['table', 'card', 'badge', 'calendar'].includes(view.layout)) setCurrentLayout(view.layout as LayoutType);
    setViewFilters(view.filters || []); setViewSorting(view.sorting || []);
    if (view.columnWidths && Object.keys(view.columnWidths).length > 0) setColumnWidths(view.columnWidths);
    
    // ⚡ ALWAYS clear the sub-filter when clicking the main view link so it resets to showing all records
    setActiveGroupFilter(null); 
    setViewGroupBy(view.groupBy || null);
  };

  const toggleMultiSelect = () => {
    setMultiSelectMode(prev => !prev);
    if (multiSelectMode) {
      setSelectedIds(new Set());
    }
  };

  const toggleRecordSelection = (itemKey: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = filteredData.map(item => item._db_id || item.id);
      setSelectedIds(new Set(allIds));
    }
  };

  const getSelectedRecords = () => {
    return filteredData.filter(item => selectedIds.has(item._db_id || item.id));
  };

  const handleBulkExport = () => {
    const records = getSelectedRecords();
    if (records.length === 0) return;
    openExportModal('selected');
  };

  const handleBulkDelete = async () => {
    const records = getSelectedRecords();
    if (records.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${records.length} records?`)) return;
    
    setIsBulkProcessing(true);
    try {
      for (const record of records) {
        if (!record._db_id) continue;
        await supabase.schema('app_private').from('mini_app_records').delete().eq('id', record._db_id);
      }
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      await loadRecords();
      
      // ⚡ FIX: Tell the dashboard to recount after a bulk deletion
      window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
      
    } catch (err: any) { 
      setDbError(err.message || 'Bulk delete failed'); 
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    const records = getSelectedRecords(); if (records.length === 0) return;
    try {
      for (const record of records) {
        if (!record._db_id) continue;
        const { _db_id, _item_uid, _created_at, _updated_at, id, ...dataFields } = record;
        // ⚡ FIXED
        await supabase.schema('app_private').from('mini_app_records')
          .update({ data: { ...dataFields, status: bulkStatus }, updated_by: user?.id || null, updated_at: new Date().toISOString() })
          .eq('id', _db_id);
      }
      setShowBulkStatusModal(false); setSelectedIds(new Set()); setMultiSelectMode(false); await loadRecords();
    } catch (err: any) { setDbError(err.message || 'Bulk status update failed'); }
  };

  const handleBulkAssign = async () => {
    const records = getSelectedRecords(); if (records.length === 0 || !bulkAssignee.trim()) return;
    try {
      for (const record of records) {
        if (!record._db_id) continue;
        const { _db_id, _item_uid, _created_at, _updated_at, id, ...dataFields } = record;
        // ⚡ FIXED
        await supabase.schema('app_private').from('mini_app_records')
          .update({ data: { ...dataFields, assignee: bulkAssignee.trim() }, updated_by: user?.id || null, updated_at: new Date().toISOString() })
          .eq('id', _db_id);
      }
      setShowBulkAssignModal(false); setBulkAssignee(''); setSelectedIds(new Set()); setMultiSelectMode(false); await loadRecords();
    } catch (err: any) { setDbError(err.message || 'Bulk assign failed'); }
  };

  const handleAttachmentsChange = async (recordDbId: string, attachments: any[]) => {
    if (!recordDbId) return;
    try {
      const record = data.find(r => r._db_id === recordDbId); if (!record) return;
      const { _db_id, _item_uid, _created_at, _updated_at, id: _id, ...dataFields } = record;
      // ⚡ FIXED
      await supabase.schema('app_private').from('mini_app_records')
        .update({ data: { ...dataFields, _attachments: attachments }, updated_by: user?.id || null, updated_at: new Date().toISOString() })
        .eq('id', recordDbId);
      setDbRecords(prev => prev.map(r => r._db_id === recordDbId ? { ...r, _attachments: attachments } : r));
      if (selectedRecord?._db_id === recordDbId) setSelectedRecord(prev => prev ? { ...prev, _attachments: attachments } : prev);
    } catch (err: any) { console.error('Error saving attachments:', err); }
  };

  const handleBulkEditField = async () => {
    if (!bulkEditField || selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const records = getSelectedRecords();
      const targetFieldDef = schemaFields.find((f: any) => f.name === bulkEditField || f.id === bulkEditField);
      
      for (const record of records) {
        if (!record._db_id) continue;
        const { _db_id, _item_uid, _created_at, _updated_at, id, ...dataFields } = record;
        
        // Ensure we update both the ID and the human-readable Name keys
        const updatedData = { ...dataFields, [bulkEditField]: bulkEditValue };
        if (targetFieldDef && targetFieldDef.id) updatedData[targetFieldDef.id] = bulkEditValue;
        if (targetFieldDef && targetFieldDef.name) updatedData[targetFieldDef.name] = bulkEditValue;

        // ⚡ FIXED: Added .schema('app_private') here
        await supabase.schema('app_private').from('mini_app_records')
          .update({ data: updatedData, updated_by: user?.id || null, updated_at: new Date().toISOString() })
          .eq('id', _db_id);
      }
      setShowBulkEditModal(false); setBulkEditField(''); setBulkEditValue(''); setSelectedIds(new Set()); setMultiSelectMode(false); await loadRecords();
    } catch (err: any) { setDbError(err.message || 'Bulk edit failed'); } finally { setIsBulkProcessing(false); }
  };

  const loadAvailableMiniApps = async () => {
    try {
      const { data: apps } = await supabase.schema('app_private').from('mini_apps').select('id, name, slug').eq('organization_id', organization?.id || '').neq('name', appName).limit(50);
      if (apps) setAvailableMiniApps(apps);
    } catch (err) { console.error('Error loading mini apps:', err); }
  };

  const handleAddToAnotherApp = async () => {
    if (!targetAppId || selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const records = getSelectedRecords();
      const targetApp = availableMiniApps.find(a => a.id === targetAppId);
      const prefix = (targetApp?.name || 'APP').substring(0, 3).toUpperCase();

      for (const record of records) {
        const { _db_id, _item_uid, _created_at, _updated_at, id, ...dataFields } = record;
        const cleanData: Record<string, any> = {};
        Object.entries(dataFields).forEach(([k, v]) => { if (!k.startsWith('_') && !k.startsWith('connected')) cleanData[k] = v; });
        cleanData._source_app = appName; cleanData._source_record_id = _item_uid || id;
        const itemUid = `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
        await supabase.schema('app_private').from('mini_app_records').insert({ mini_app_id: targetAppId, organization_id: organization?.id, item_uid: itemUid, data: cleanData, created_by: user?.id || null, updated_by: user?.id || null });
      }
      setShowAddToAppModal(false); setTargetAppId(''); setSelectedIds(new Set()); setMultiSelectMode(false);
      
      // ⚡ FIX: Tell the dashboard to recount the target app after pushing records to it
      window.dispatchEvent(new CustomEvent('miniapp_records_updated'));
      
    } catch (err: any) { setDbError(err.message || 'Add to app failed'); } finally { setIsBulkProcessing(false); }
  };

  const AppIcon = resolveAppIcon(appIconStr, appName);

  const renderFormLayout = (
    schema: any[],
    dataObj: any,
    onChangeFn: (field: any, val: any) => void,
    tabMap: Record<string, string>,
    setTabMap: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    isReadonly: boolean = false
  ) => {
    return (
      // ⚡ FIX: Removed gap-x-6 and replaced with -mx-3 to prevent 60-column blowout
      <div className={`grid gap-y-5 -mx-3 ${isReadonly ? 'pointer-events-none opacity-90' : ''}`} style={{ gridTemplateColumns: 'repeat(60, minmax(0, 1fr))', gridAutoFlow: 'row dense' }}>
        {schema.filter(f => (f.name || f.type === 'split_separator' || f.type === 'tabs' || f.type === 'visualizer_field') && f.type !== 'submenu').map((field: any, index: number, arr: any[]) => {
          const isSplit = field.type === 'split_separator'; 
          const isTabs = field.type === 'tabs';
          const isVisualizer = field.type === 'visualizer_field';
          
          const rawSpan = field.colSpan || (isSplit || isTabs || isVisualizer ? 60 : (field.columnSpan === 2 ? 60 : 30));
          const currentRowSpan = field.rowSpan || (isTabs ? 4 : 1);
          
          const nextField = arr[index + 1];
          const isLastInRow = !nextField || nextField.row !== field.row;
          const rowFields = arr.filter(f => f.row === field.row);
          const rowSum = rowFields.reduce((sum, f) => {
            const fSpan = f.colSpan || (f.type === 'split_separator' || f.type === 'tabs' || f.type === 'visualizer_field' ? 60 : (f.columnSpan === 2 ? 60 : 30));
            return sum + fSpan;
          }, 0);
          const remainingSpan60 = Math.max(0, 60 - rowSum);

          return (
            <React.Fragment key={field.id}>
              
              {isSplit && (
                // ⚡ FIX: Added px-3 to create the internal gutter
                <div className="py-2 px-3" style={{ gridColumn: `span ${rawSpan}`, gridRow: `span ${currentRowSpan}` }}>
                  <div className="w-full" style={{ borderTop: `2px ${field.settings?.separatorStyle || 'solid'} ${field.settings?.separatorColor || '#64748b'}`, marginTop: `${field.settings?.marginTop || 16}px`, marginBottom: `${field.settings?.marginBottom || 16}px` }} />
                </div>
              )}
              
              {isTabs && (
                // ⚡ FIX: Added px-3
                <div className="flex flex-col pt-2 px-3" style={{ gridColumn: `span ${rawSpan}`, gridRow: `span ${currentRowSpan}` }}>
                  <div className="flex w-full relative z-[2] px-2 pointer-events-none mb-0">
                    {(field.settings?.tabOptions || []).map((t: any, idx: number) => {
                      const isActive = tabMap[field.id] ? tabMap[field.id] === t.id : idx === 0;
                      const tabColor = t.color || wc.primary;
                      const tabRgb = hexToRgbStr(tabColor);
                      
                      return (
                        <div 
                          key={t.id} 
                          onClick={(e) => { e.stopPropagation(); setTabMap(prev => ({ ...prev, [field.id]: t.id })); }}
                          className={`relative flex-1 flex items-center justify-center gap-2 pt-2 cursor-pointer pointer-events-auto -ml-2 first:ml-0 transition-all ${isActive ? 'pb-2' : 'pb-1 hover:brightness-125'}`}
                          style={{ marginBottom: isActive ? '-1px' : '0px', zIndex: isActive ? 10 : 5 - idx }}
                        >
                          <div className="absolute inset-0 z-[-1]" style={{ background: isActive ? `rgba(${tabRgb}, 0.5)` : `rgba(${tabRgb}, 0.2)`, clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 100%, 0 100%)' }}>
                            <div className="absolute z-[-1]" style={{ top: '1px', left: '1px', right: '1px', bottom: isActive ? '-1px' : '1px', background: '#000', clipPath: 'polygon(11px 0, calc(100% - 11px) 0, 100% 100%, 0 100%)' }} />
                            <div className="absolute z-[-1] backdrop-blur-xl" style={{ top: '1px', left: '1px', right: '1px', bottom: isActive ? '-1px' : '1px', background: isActive ? `linear-gradient(to bottom, rgba(${tabRgb}, 0.15), rgba(${tabRgb}, 0.05))` : 'rgba(255,255,255,0.03)', clipPath: 'polygon(11px 0, calc(100% - 11px) 0, 100% 100%, 0 100%)' }} />
                          </div>
                          
                          <span className="relative z-10 text-xs font-mono font-bold whitespace-nowrap transition-colors truncate px-2" style={{ color: tabColor, opacity: isActive ? 1 : 0.5, filter: isActive ? 'brightness(1.3)' : 'none', textShadow: isActive ? `0 0 12px rgba(${tabRgb}, 1)` : 'none' }}>
                            {t.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    const tabs = field.settings?.tabOptions || [];
                    const activeTabId = tabMap[field.id] || tabs[0]?.id;
                    const activeTab = tabs.find((t: any) => t.id === activeTabId);
                    const activeColor = activeTab?.color || wc.primary;
                    const activeRgb = hexToRgbStr(activeColor);
                    const tabFields = activeTab?.fields || [];

                    return (
                      <div className="flex-1 p-4 sm:p-6 border rounded-lg rounded-tl-none min-h-[100px] overflow-y-auto darkwave-scrollbar relative z-[1]"
                           style={{ borderColor: `rgba(${activeRgb}, 0.5)`, background: `linear-gradient(135deg, rgba(${activeRgb}, 0.1), rgba(0,0,0,0.6))`, boxShadow: `0 0 20px rgba(${activeRgb}, 0.15) inset` }}>
                        {tabFields.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-gray-600 text-xs font-mono py-8">No fields in this tab.</div>
                        ) : (
                          // ⚡ FIX: Use a recursive call instead of nesting the loop again!
                          renderFormLayout(tabFields, dataObj, onChangeFn, tabMap, setTabMap, isReadonly)
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {isVisualizer && (
                // ⚡ FIX: Added px-3
                <div className="flex flex-col px-3" style={{ gridColumn: `span ${rawSpan}`, gridRow: `span ${currentRowSpan}` }}>
                  {field.name && <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider flex-shrink-0">{field.name.replace(/([A-Z])/g, ' $1').trim()}</label>}
                  <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-900/40 border border-dashed border-fuchsia-500/40 rounded-lg gap-3 min-h-[100px]">
                    <div className="flex justify-between w-full">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{field.settings?.visualizerChartType || 'bar'} Chart</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-fuchsia-500/20 text-fuchsia-400 rounded">{field.settings?.visualizerDefaultMode || '2D'}</span>
                    </div>
                    {field.settings?.visualizerSourceAppId ? (
                      <div className="w-full mt-2 pointer-events-auto">
                        {renderSchemaInput(field, String(dataObj[field.id] ?? dataObj[field.name] ?? ''), (val) => onChangeFn(field, val))}
                      </div>
                    ) : (
                      <>
                        <ChartNetwork size={32} className="text-fuchsia-400/60" />
                        <span className="text-xs text-fuchsia-300">Pending Configuration</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {!isSplit && !isTabs && !isVisualizer && (
                // ⚡ FIX: Added px-3
                <div className="px-3" style={{ gridColumn: `span ${rawSpan}`, gridRow: `span ${currentRowSpan}` }}>
                  <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{field.name.replace(/([A-Z])/g, ' $1').trim()}{field.required && <span className="text-red-400 ml-1">*</span>}</label>
                  {renderSchemaInput(field, String(dataObj[field.id] ?? dataObj[field.name] ?? ''), (val) => onChangeFn(field, val))}
                </div>
              )}

              {isLastInRow && remainingSpan60 > 0 && <div style={{ gridColumn: `span ${remainingSpan60}` }} />}
              
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const getGridSpanClass = (span: number) => {
    if (span >= 60) return 'col-span-6'; if (span >= 50) return 'col-span-6 sm:col-span-5'; if (span >= 40) return 'col-span-6 sm:col-span-4';
    if (span >= 30) return 'col-span-6 sm:col-span-3'; if (span >= 20) return 'col-span-6 sm:col-span-2'; if (span >= 10) return 'col-span-6 sm:col-span-1';
    switch (span) { case 1: return 'col-span-6 sm:col-span-1'; case 2: return 'col-span-6 sm:col-span-2'; case 3: return 'col-span-6 sm:col-span-3'; case 4: return 'col-span-6 sm:col-span-4'; case 5: return 'col-span-6 sm:col-span-5'; case 6: return 'col-span-6'; default: return 'col-span-6 sm:col-span-3'; }
  };

  const addRecordModal = showAddModal && (
        <>
          <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" onClick={handleCloseAddModal} />
          
          {/* Outer Wrapper now uses pointer-events-none so the empty space isn't clickable */}
            <div className="fixed z-[100001] flex flex-col transition-all duration-300 ease-out pointer-events-none" 
                 style={{ top: 'calc(2vh + 60px)', left: '2vw', right: '2vw', bottom: '90px' }}>

            {/* --- TOP TABS ROW --- */}
              <div className="flex justify-start items-end w-full relative z-[2] px-4 sm:px-10 pointer-events-none">
                
                {/* Slanted Title Tab - Shorter, wider, steeper slant */}
                <div className="relative flex items-end gap-3 px-14 sm:px-16 pt-2 pb-1 pointer-events-auto"
                     style={{ marginBottom: '-1px' }}
                     onClick={(e) => e.stopPropagation()}>
                     
                  {/* Border & Background Layers for perfect slant */}
                  <div className="absolute inset-0 z-[-1]" 
                       style={{ 
                         background: `rgba(${wc.rgb}, 0.4)`, 
                         clipPath: 'polygon(40px 0, calc(100% - 40px) 0, 100% 100%, 0 100%)' 
                       }}>
                    <div className="absolute inset-[1px] bottom-0 bg-black/95 backdrop-blur-xl" 
                         style={{ 
                           clipPath: 'polygon(39px 0, calc(100% - 39px) 0, 100% 100%, 0 100%)' 
                         }} />
                  </div>

                  {/* ⚡ Icon and Text Wrapped to center vertically with each other */}
                  <div className="flex items-center gap-3 relative top-[2px]">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.2), rgba(0,0,0,0.8))`, border: `1px solid rgba(${wc.rgb}, 0.3)` }}>
                      <AppIcon size={20} style={{ color: wc.primary }} />
                    </div>
                    
                    <div className="pr-2 flex items-center">
                      <h3 className="text-lg sm:text-xl font-mono font-bold whitespace-nowrap leading-none tracking-tight">
                        <span className="text-white">Add New </span>
                        <span style={{ color: wc.primary }}>{appSettings?.itemName || appName}</span>
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

        {/* --- MAIN BODY --- */}
        <div className="flex-1 flex flex-col bg-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border pointer-events-auto relative z-[1]" 
             style={{ borderColor: `rgba(${wc.rgb}, 0.4)`, boxShadow: `0 0 60px rgba(${wc.rgb}, 0.15), 0 0 120px rgba(0,0,0,0.8)` }} 
             onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
             
          {/* FULL WIDTH HEADER */}
          <div className="flex items-center justify-end w-full border-b bg-black/40 px-4 py-2" style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }}>
            <button onClick={handleCloseAddModal} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Close"><CloseIcon size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-6 sm:pt-8 darkwave-scrollbar">
            <div className="w-full">
                {isLoading ? ( 
                  <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, borderTopColor: wc.primary }} /></div> 
                ) : schemaFields.length > 0 ? (
                  // ⚡ FIX: We can simply call our newly robust renderFormLayout here!
                  renderFormLayout(
                    schemaFields, 
                    newRecordFields, 
                    (field, val) => setNewRecordFields(prev => ({ ...prev, [field.id]: val, [field.name]: val })), 
                    activeTabMap, 
                    setActiveTabMap, 
                    false
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {(columns.length > 0 ? columns : ['name', 'status', 'description']).map(col => (
                      <div key={col}>
                        <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{col.replace(/([A-Z])/g, ' $1').trim()}</label>
                        {renderSchemaInput(col, newRecordFields[col] || '', (val) => setNewRecordFields(prev => ({ ...prev, [col]: val })))}
                      </div>
                    ))}
                  </div>
                )}
            </div>
            </div>
            {/* ⚡ FIX: The footer is now safely INSIDE the pointer-events-auto wrapper! */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-gray-800/50 flex flex-wrap items-center justify-end gap-3" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <button onClick={handleCloseAddModal} className="px-6 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 transition-all font-mono text-sm flex-1 sm:flex-none text-center">Cancel</button>
              <button onClick={handleCreateRecord} disabled={isSaving} className="px-6 py-2 rounded-lg transition-all font-mono text-sm font-medium disabled:opacity-50 flex-1 sm:flex-none text-center" style={{ background: wc.primary, color: '#000', boxShadow: `0 0 20px rgba(${wc.rgb}, 0.3)` }}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
    </>
  );

  if (isGlobalAddMode) return addRecordModal || null;

  return (
    <>
      {/* ⚡ Force exact viewport height and flex-col so the left panel stays pinned! */}
<div className="px-4 max-w-full mx-auto pt-4 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
        <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFile} />

      <div className="mb-2 pb-4 border-b border-gray-800/30 relative z-10 flex-shrink-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-shrink-0 pt-0.5">
            <button onClick={onBack} className="p-2 text-gray-400 rounded-lg border border-transparent transition-all hover:bg-white/5" onMouseEnter={e => e.currentTarget.style.color = wc.primary} onMouseLeave={e => e.currentTarget.style.color = ''}><ChevronLeftIcon size={20} /></button>
            <div className="flex items-center gap-2 relative">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ border: `1.5px solid rgba(${wc.rgb}, 0.5)`, background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.15), rgba(0,0,0,0.9))`, boxShadow: `0 0 12px rgba(${wc.rgb}, 0.2)` }}><AppIcon size={18} style={{ color: wc.primary }} /></div>
              <h1 className="text-xl font-bold font-mono uppercase tracking-tight" style={{ color: wc.primary }}>{appName}</h1>
              <div className="relative" ref={gearRef}>
                <button onClick={() => setShowGearMenu(!showGearMenu)} className="p-1.5 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="MiniApp Settings" style={{ color: wc.primary }}><SettingsIcon size={18} className="!opacity-100" style={{ color: wc.primary, stroke: wc.primary, filter: `drop-shadow(0 0 5px rgba(${wc.rgb}, 0.5))` }} /></button>
                {showGearMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowGearMenu(false)} />
                    <div className="absolute left-0 top-full mt-1 z-50 bg-black/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl" style={{ border: `1px solid rgba(${wc.rgb}, 0.4)`, minWidth: '180px' }}>
                      <div className="py-1">
                        {gearMenuItems.map((item, index) => {
                          if ('divider' in item && item.divider) return <div key={`div-${index}`} className="my-1 border-t" style={{ borderColor: `rgba(${wc.rgb}, 0.15)` }} />;
                          const mi = item as { icon: React.FC<any>; label: string; action: () => void; adminOnly: boolean };
                          if (mi.adminOnly && !isAdmin) return null;
                          const Icon = mi.icon;
                          return <button key={mi.label} onClick={mi.action} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-mono text-gray-300 transition-all hover:bg-white/5"><Icon size={15} /><span>{mi.label}</span></button>;
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="absolute bottom-[100%] translate-y-2 right-1 flex items-center justify-end gap-1.5 text-[10px] text-gray-500 font-mono whitespace-nowrap">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(0,255,0,0.8)] animate-pulse" />
                <span>{mockAppUsers.filter(u => u.status === 'active').length} active</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-1 min-w-0 items-start">
            <button onClick={() => { if (showUsersDropdown) setShowUsersDropdown(false); setIsUsersExpanded(!isUsersExpanded); }} className={`flex-shrink-0 w-10 h-10 rounded-full transition-all flex items-center justify-center hover:scale-105 ${isUsersExpanded ? 'mr-3' : ''}`} style={{ border: `1px solid rgba(${wc.rgb}, 0.3)`, backgroundColor: `rgba(${wc.rgb}, 0.1)`, color: wc.primary }} title="Active Users"><UsersIcon size={16} /></button>
            <div ref={usersContainerRef} className={`flex gap-2 transition-all duration-300 ease-out ${isUsersExpanded ? 'flex-1 min-w-0 opacity-100' : 'max-w-0 opacity-0 overflow-hidden'}`}>
              <button onClick={() => setShowAllUsersModal(true)} className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-all" title="View All Directory Users">
  <MaximizeIcon size={16} />
</button>
              
              {/* Top Row Avatars */}
              <div className="flex flex-1 min-w-0 h-10 items-center pl-1 relative z-[80]">
                {mockAppUsers.slice(0, maxVisibleUsers).map((u, i) => {
                  const isNewGroup = i > 0 && mockAppUsers[i - 1].status !== u.status;
                  const isOpen = activeUserDropdown === u.id;
                  const isLeftHalf = i < (maxVisibleUsers / 2);
                  
                  return (
                    <div key={u.id} 
                      onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(isOpen ? null : u.id); }}
                      className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium font-mono cursor-pointer transition-all hover:scale-110 flex-shrink-0 ${
                      u.status === 'active' ? 'border-green-500/30 hover:border-green-400 hover:shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                      u.status === 'idle' ? 'border-yellow-500/30 hover:border-yellow-400 hover:shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 
                      'border-red-500/30 hover:border-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                    }`}
                      style={{
                        background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)',
                        color: u.status === 'active' ? wc.primary : '#9ca3af',
                        marginLeft: i === 0 ? '0' : (isNewGroup ? '0.5rem' : '-0.5rem'),
                        zIndex: isOpen ? 9999 : mockAppUsers.length - i,
                      }}
                      title={isOpen ? '' : `${u.name} (${u.status})`}>
                      {u.name.split(' ').map((n: string) => n[0]).join('')}

                      {/* User Dropdown Panel */}
                      {isOpen && (
                        <div className={`user-profile-panel absolute top-12 ${isLeftHalf ? 'left-0' : 'right-0'} w-[380px] max-w-[90vw] p-5 rounded-xl cursor-default flex gap-5 bg-black/95 backdrop-blur-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 z-[9999]`}
                             style={{
                               borderColor: `rgba(${wc.rgb}, 0.5)`,
                               boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 25px rgba(${wc.rgb}, 0.3)`,
                               filter: `drop-shadow(0 0 10px rgba(${wc.rgb}, 0.15))`
                             }}
                             onClick={(e) => e.stopPropagation()}
                        >
                          {/* Left Column: Avatar + Bottom-Aligned Toggles */}
                          <div className="flex flex-col items-center flex-shrink-0 w-[108px]">
                            <div className="w-[86px] h-[86px] rounded-full flex items-center justify-center text-2xl font-bold font-mono" 
                                 style={{ background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.9))`, border: `2px solid ${wc.primary}`, color: wc.primary, boxShadow: `0 0 15px rgba(${wc.rgb}, 0.4)` }}>
                              {u.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            
                            {/* Status Message Section */}
                            <div className="mt-4 mb-3 w-full flex-1 flex flex-col">
                              <span className="text-[10px] font-mono uppercase font-bold tracking-wider mb-1 text-left" style={{ color: wc.primary }}>Status:</span>
                              <div className="flex-1 p-2 w-full rounded bg-white/5 border flex items-start justify-start" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
                                <span className="text-[10px] font-mono text-gray-400 italic leading-tight text-left">
                                  "A short custom status message on the user's profile will appear here..."
                                </span>
                              </div>
                            </div>
                            
                            {/* Toggles Container */}
                            <div className="flex flex-col gap-2.5 w-full pb-1">
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Suspend</span>
                                <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors" style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }} onClick={(e) => { e.stopPropagation(); console.log('Suspend user'); }}>
                                  <div className="w-2 h-2 rounded-full bg-gray-600 absolute top-[2px] left-[2px]" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Remove</span>
                                <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors" style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }} onClick={(e) => { e.stopPropagation(); console.log('Remove user'); }}>
                                  <div className="w-2 h-2 rounded-full bg-gray-800 absolute top-[2px] left-[2px]" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: User Info, Status Message + Vertical Actions */}
                          <div className="flex flex-col min-w-0 flex-1">
                            
                            {/* Identity Section */}
                            <div className="mb-2">
                              <div className="flex items-center gap-3 mb-1.5">
                                <h4 className="text-white font-mono text-base font-bold truncate leading-tight">{u.name}</h4>
                                <div className="flex items-center gap-1.5 flex-shrink-0 mt-[1px]">
                                  <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                  <span className="text-gray-300 font-mono text-[10px] uppercase tracking-wider">{u.status}</span>
                                </div>
                              </div>
                              <div className="text-gray-500 font-mono text-[10px] truncate">
                                {u.status === 'active' ? 'Logged in since: Today, 8:42 AM' : 'Last seen at: Yesterday, 4:15 PM'}
                              </div>
                            </div>

                            {/* Vertical Action Buttons */}
                            <div className="flex flex-col gap-1 pt-3 border-t" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
                              
                              <div className="relative group w-full">
                                <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors text-gray-300 group-hover:text-white">
                                   <MessageSquare size={13} className="flex-shrink-0" />
                                   <span className="text-[11px] font-mono truncate">Message</span>
                                   <ChevronDownIcon size={10} className="ml-auto -rotate-90 opacity-50" />
                                </button>
                                <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-[110]">
                                  <div className="flex flex-col gap-1 p-2 rounded-xl bg-black/95 backdrop-blur-2xl border shadow-2xl w-32 animate-in fade-in slide-in-from-left-2 duration-200"
                                       style={{ borderColor: `rgba(${wc.rgb}, 0.5)`, boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wc.rgb}, 0.2)`, filter: `drop-shadow(0 0 10px rgba(${wc.rgb}, 0.15))` }}>
                                    <button title="Internal system message" className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(null); }}>
                                      <MessagesSquare size={12} className="flex-shrink-0" /><span>Chat</span>
                                    </button>
                                    <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setExternalModalUser({ id: u.id, name: u.name }); 
                                      setActiveUserDropdown(null); 
                                    }}>
                                      <PopoutIcon size={12} className="flex-shrink-0" /><span>External</span>
                                    </button>
                                    <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setCallModalUser({ id: u.id, name: u.name }); 
                                      setActiveUserDropdown(null); 
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>Call</span>
                                    </button>
                                    <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors group/record" onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setRecordModalUser({ id: u.id, name: u.name }); 
                                      setActiveUserDropdown(null); 
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-hover/record:text-red-500 transition-colors"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg><span>Record</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <CheckSquare size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Send Task</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <Mail size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Send Email</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <Activity size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Activity</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <PlusIcon size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">App</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <Megaphone size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Comms</span>
                              </button>

                              {(isPlatformOwner() || isOrganizationAdmin()) && (
                                <button onClick={() => console.log('Open Dashboard')} className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white border border-white/5">
                                   <LayoutDashboard size={13} className="flex-shrink-0" />
                                   <span className="text-[11px] font-mono truncate font-bold">Dashboard</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-1 flex-shrink-0 h-10">
                {isAdmin && (
                  <button 
                    className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-all hover:scale-110 bg-black/50"
                    style={{ borderColor: `rgba(${wc.rgb}, 0.4)`, color: wc.primary }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = wc.primary; e.currentTarget.style.backgroundColor = `rgba(${wc.rgb}, 0.1)`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.4)`; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'; }}
                    title="Invite user to MiniApp"
                  >
                    <PlusIcon size={16} />
                  </button>
                )}
                
                {mockAppUsers.length > maxVisibleUsers && (
                  <button 
                    onClick={() => setShowUsersDropdown(!showUsersDropdown)}
                    className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                    title={showUsersDropdown ? "Collapse users" : `View remaining ${mockAppUsers.length - maxVisibleUsers} users`}
                  >
                    <ChevronDownIcon size={16} className={`transition-transform duration-300 ${showUsersDropdown ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="relative flex items-center">
              <div className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${isSearchOpen ? 'w-48 md:w-64 opacity-100 mr-2' : 'w-0 opacity-0 mr-0'}`}>
                <div className="relative w-full">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={`Search ${appName.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/60 rounded-lg pl-3 pr-8 py-1.5 text-white placeholder-gray-600 font-mono text-sm focus:outline-none transition-all"
                    style={{ border: `1px solid rgba(${wc.rgb}, 0.3)`, boxShadow: searchQuery ? `0 0 12px rgba(${wc.rgb}, 0.1)` : 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.6)`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.3)`; }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                        if (!searchQuery) e.currentTarget.blur();
                      }
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-500 hover:text-white transition-colors">
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-lg border transition-all hover:bg-white/5" 
                style={{ color: wc.primary, borderColor: isSearchOpen ? `rgba(${wc.rgb}, 0.5)` : `rgba(${wc.rgb}, 0.3)`, backgroundColor: isSearchOpen ? `rgba(${wc.rgb}, 0.1)` : 'transparent' }} 
                title="Search"
              >
                <SearchIcon size={18} />
              </button>
            </div>

          <button 
            onClick={handleNewWindow} 
            className="p-2 rounded-lg border transition-all hover:bg-white/5 flex items-center justify-center" 
            style={{ color: wc.primary, borderColor: `rgba(${wc.rgb}, 0.3)` }} 
            title="Open in New Window"
          >
            <PopoutIcon size={18} />
          </button>

          <button onClick={() => setShowReportsOverlay(true)} className="p-2 rounded-lg border transition-all hover:bg-white/5 flex items-center justify-center" style={{ color: wc.primary, borderColor: `rgba(${wc.rgb}, 0.3)` }} title="Reports">
            <ChartNetwork size={18} />
          </button>

          <div className="relative">
            <button onClick={() => setShowDataMenu(!showDataMenu)} className="flex items-center gap-1 p-2 rounded-lg border transition-all hover:bg-white/5" style={{ color: wc.primary, borderColor: `rgba(${wc.rgb}, 0.3)`, backgroundColor: showDataMenu ? `rgba(${wc.rgb}, 0.15)` : 'transparent' }} title="Import / Export Data">
              <LucideIcons.ArrowDownUp size={18} />
            </button>
            {showDataMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDataMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-black border rounded-lg p-1 min-w-[140px]" style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, boxShadow: `0 0 20px rgba(${wc.rgb}, 0.15)` }}>
                  <button onClick={() => { handleExport(); setShowDataMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-mono transition-all text-gray-300 hover:text-white hover:bg-white/5">
                    <DownloadIcon size={16} /> Export CSV
                  </button>
                  {isAdmin && (
                    <button onClick={() => { fileInputRef.current?.click(); setShowDataMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-mono transition-all text-gray-300 hover:text-white hover:bg-white/5">
                      <UploadIcon size={16} /> Import CSV
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Layout dropdown moved to center row */}

          <div className="relative ml-1">
            {/* ⚡ Glowing Pulsating Backdrop */}
            <div 
              className="absolute inset-0 -m-1.5 rounded-xl blur-md opacity-40 animate-pulse pointer-events-none" 
              style={{ backgroundColor: `rgba(${wc.rgb}, 0.6)` }} 
            />
            <button 
              onClick={() => setShowAddModal(true)} 
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 z-10 hover:bg-white/5" 
              style={{ 
                color: wc.primary, 
                borderColor: wc.primary, 
                backgroundColor: 'transparent', 
                boxShadow: `0 0 15px rgba(${wc.rgb}, 0.3), inset 0 0 5px rgba(${wc.rgb}, 0.1)` 
              }} 
              title={`Add ${singularAppName}`}
            >
              <PlusIcon size={18} />
              <span className="text-sm font-bold font-mono whitespace-nowrap">{singularAppName}</span>
            </button>
          </div>
        </div>
      </div>

      {showUsersDropdown && mockAppUsers.length > maxVisibleUsers && (
        <div className="flex flex-wrap pt-3 pb-1 pl-1 animate-in slide-in-from-top-2 duration-300 gap-y-3 relative z-[60]">
          {mockAppUsers.slice(maxVisibleUsers).map((u, i) => {
            const actualIndex = maxVisibleUsers + i;
            const isNewGroup = i > 0 && mockAppUsers[actualIndex - 1].status !== u.status;
            const isOpen = activeUserDropdown === u.id;
            
            const itemsPerFullRow = maxVisibleUsers + 5; 
            const positionInRow = i % itemsPerFullRow;
            const isLeftHalf = positionInRow < (itemsPerFullRow / 2);

            return (
              <div key={u.id} 
                onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(isOpen ? null : u.id); }}
                className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium font-mono cursor-pointer transition-all hover:scale-110 flex-shrink-0 ${
                  u.status === 'active' ? 'border-green-500/30 hover:border-green-400 hover:shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                  u.status === 'idle' ? 'border-yellow-500/30 hover:border-yellow-400 hover:shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 
                  'border-red-500/30 hover:border-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                }`}
                style={{
                  background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)',
                  color: u.status === 'active' ? wc.primary : '#9ca3af',
                  marginLeft: i === 0 ? '0' : (isNewGroup ? '0.5rem' : '-0.5rem'),
                  zIndex: isOpen ? 9999 : mockAppUsers.length - actualIndex,
                }}
                title={isOpen ? '' : `${u.name} (${u.status})`}>
                {u.name.split(' ').map((n: string) => n[0]).join('')}

                {/* User Dropdown Panel */}
                      {isOpen && (
                        <div className={`user-profile-panel absolute top-12 ${isLeftHalf ? 'left-0' : 'right-0'} w-[380px] max-w-[90vw] p-5 rounded-xl cursor-default flex gap-5 bg-black/95 backdrop-blur-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 z-[9999]`}
                             style={{
                               borderColor: `rgba(${wc.rgb}, 0.5)`,
                               boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 25px rgba(${wc.rgb}, 0.3)`,
                               filter: `drop-shadow(0 0 10px rgba(${wc.rgb}, 0.15))`
                             }}
                             onClick={(e) => e.stopPropagation()}
                        >
                          {/* Left Column: Avatar + Bottom-Aligned Toggles */}
                          <div className="flex flex-col items-center flex-shrink-0 w-[108px]">
                            <div className="w-[86px] h-[86px] rounded-full flex items-center justify-center text-2xl font-bold font-mono" 
                                 style={{ background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.9))`, border: `2px solid ${wc.primary}`, color: wc.primary, boxShadow: `0 0 15px rgba(${wc.rgb}, 0.4)` }}>
                              {u.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            
                            {/* Status Message Section */}
                            <div className="mt-4 mb-3 w-full flex-1 flex flex-col">
                              <span className="text-[10px] font-mono uppercase font-bold tracking-wider mb-1 text-left" style={{ color: wc.primary }}>Status:</span>
                              <div className="flex-1 p-2 w-full rounded bg-white/5 border flex items-start justify-start" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
                                <span className="text-[10px] font-mono text-gray-400 italic leading-tight text-left">
                                  "A short custom status message on the user's profile will appear here..."
                                </span>
                              </div>
                            </div>
                            
                            {/* Toggles Container */}
                            <div className="flex flex-col gap-2.5 w-full pb-1">
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Suspend</span>
                                <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors" style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }} onClick={(e) => { e.stopPropagation(); console.log('Suspend user'); }}>
                                  <div className="w-2 h-2 rounded-full bg-gray-600 absolute top-[2px] left-[2px]" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Remove</span>
                                <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors" style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }} onClick={(e) => { e.stopPropagation(); console.log('Remove user'); }}>
                                  <div className="w-2 h-2 rounded-full bg-gray-800 absolute top-[2px] left-[2px]" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: User Info, Status Message + Vertical Actions */}
                          <div className="flex flex-col min-w-0 flex-1">
                            
                            {/* Identity Section */}
                            <div className="mb-2">
                              <div className="flex items-center gap-3 mb-1.5">
                                <h4 className="text-white font-mono text-base font-bold truncate leading-tight">{u.name}</h4>
                                <div className="flex items-center gap-1.5 flex-shrink-0 mt-[1px]">
                                  <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                  <span className="text-gray-300 font-mono text-[10px] uppercase tracking-wider">{u.status}</span>
                                </div>
                              </div>
                              <div className="text-gray-500 font-mono text-[10px] truncate">
                                {u.status === 'active' ? 'Logged in since: Today, 8:42 AM' : 'Last seen at: Yesterday, 4:15 PM'}
                              </div>
                            </div>

                            {/* Vertical Action Buttons */}
                            <div className="flex flex-col gap-1 pt-3 border-t" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
                              
                              <div className="relative group w-full">
                                <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors text-gray-300 group-hover:text-white">
                                   <MessageSquare size={13} className="flex-shrink-0" />
                                   <span className="text-[11px] font-mono truncate">Message</span>
                                   <ChevronDownIcon size={10} className="ml-auto -rotate-90 opacity-50" />
                                </button>
                                <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-[110]">
                                  <div className="flex flex-col gap-1 p-2 rounded-xl bg-black/95 backdrop-blur-2xl border shadow-2xl w-32 animate-in fade-in slide-in-from-left-2 duration-200"
                                       style={{ borderColor: `rgba(${wc.rgb}, 0.5)`, boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wc.rgb}, 0.2)`, filter: `drop-shadow(0 0 10px rgba(${wc.rgb}, 0.15))` }}>
                                    <button title="Internal system message" className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(null); }}>
                                      <MessagesSquare size={12} className="flex-shrink-0" /><span>Chat</span>
                                    </button>
                                    <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setExternalModalUser({ id: u.id, name: u.name }); 
                                      setActiveUserDropdown(null); 
                                    }}>
                                      <PopoutIcon size={12} className="flex-shrink-0" /><span>External</span>
                                    </button>
                                    <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setCallModalUser({ id: u.id, name: u.name }); 
                                      setActiveUserDropdown(null); 
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>Call</span>
                                    </button>
                                    <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors group/record" onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setRecordModalUser({ id: u.id, name: u.name }); 
                                      setActiveUserDropdown(null); 
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-hover/record:text-red-500 transition-colors"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg><span>Record</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <CheckSquare size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Send Task</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <Mail size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Send Email</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <Activity size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Activity</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <PlusIcon size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">App</span>
                              </button>
                              <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                 <Megaphone size={13} className="flex-shrink-0" />
                                 <span className="text-[11px] font-mono truncate">Comms</span>
                              </button>

                              {(isPlatformOwner() || isOrganizationAdmin()) && (
                                <button onClick={() => console.log('Open Dashboard')} className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white border border-white/5">
                                   <LayoutDashboard size={13} className="flex-shrink-0" />
                                   <span className="text-[11px] font-mono truncate font-bold">Dashboard</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* ⚡ Added flex-1 and min-h-0 so this container stretches perfectly to the bottom of the screen */}
    {/* ⚡ flex-1 min-h-0 forces this row to fill the rest of the screen */}
<div className="flex gap-4 mt-2 relative flex-1 min-h-0 pb-24">
      
      <ViewPane
        miniAppId={miniAppId || ''}
        columns={columns}
        fields={schemaFields}
        wsColor={wc}
        currentLayout={currentLayout}
        currentFilters={viewFilters}
        currentSorting={viewSorting}
        currentColumnWidths={columnWidths}
        currentGroupBy={viewGroupBy}
        activeGroupedData={sidebarGroupedData}
        activeGroupFilter={activeGroupFilter} 
        onSelectGroup={setActiveGroupFilter}  
        onApplyView={handleApplyView}
        isOpen={showViewPane}
        onToggle={() => setShowViewPane(!showViewPane)}
        isAdmin={isAdmin} // ⚡ ADD THIS LINE
      />

      {/* ⚡ Changed this to be an independent scrolling container, leaving the ViewPane permanently floating next to it */}
      {/* ⚡ Make the data area scroll internally so the left pane never moves */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* NEW CENTERED CONTROLS & RECORD COUNT ROW */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3 flex-shrink-0">
          
          {/* Left Spacer (Keeps the center items perfectly centered) */}
          <div className="flex-1 hidden md:block"></div>
          
          {/* Centered Buttons (Icon Only) */}
          <div className="flex items-center justify-center gap-2 flex-1 min-w-[250px]">
            
            {/* Layout Dropdown */}
            <div className="relative">
              <button onClick={() => setShowViewsDropdown(!showViewsDropdown)} className="flex items-center justify-center p-2 rounded-lg border transition-all hover:bg-white/5" style={{ color: wc.primary, borderColor: `rgba(${wc.rgb}, 0.3)`, backgroundColor: showViewsDropdown ? `rgba(${wc.rgb}, 0.15)` : 'transparent' }} title="View Layout">
                <LucideIcons.PanelLeft size={16} />
              </button>
              {showViewsDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowViewsDropdown(false)} />
                  {/* Positioned center-aligned below the icon */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-black border rounded-lg p-1 min-w-[140px]" style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, boxShadow: `0 0 20px rgba(${wc.rgb}, 0.15)` }}>
                    {availableLayouts.map(layout => {
                      const Icon = LAYOUT_ICONS[layout];
                      return (
                        <button key={layout} onClick={() => { setCurrentLayout(layout); setShowViewsDropdown(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-mono transition-all" style={{ color: currentLayout === layout ? wc.primary : '#9ca3af', background: currentLayout === layout ? `rgba(${wc.rgb}, 0.15)` : 'transparent' }}>
                          <Icon size={16} />{layout.charAt(0).toUpperCase() + layout.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setShowViewPane(!showViewPane)} className="flex items-center justify-center p-2 rounded-lg border transition-all hover:bg-white/5" style={{ color: wc.primary, borderColor: `rgba(${wc.rgb}, 0.3)`, backgroundColor: showViewPane ? `rgba(${wc.rgb}, 0.15)` : 'transparent' }} title="Filters">
              <FilterIcon size={16} />
            </button>

            {/* ⚡ Custom Sort Dropdown (Quick Menu) */}
            <div className="relative">
              <button 
                onClick={() => setShowSortDropdown(!showSortDropdown)} 
                className="flex items-center justify-center p-2 rounded-lg border transition-all hover:bg-white/5" 
                style={{ color: wc.primary, borderColor: `rgba(${wc.rgb}, 0.3)`, backgroundColor: showSortDropdown ? `rgba(${wc.rgb}, 0.15)` : 'transparent' }} 
                title="Sort"
              >
                <SortIcon size={16} />
                {viewSorting.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: wc.primary, color: '#000' }}>
                    {viewSorting.length}
                  </span>
                )}
              </button>
              
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-black/95 backdrop-blur-xl border rounded-xl py-2 min-w-[200px] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200" style={{ borderColor: `rgba(${wc.rgb}, 0.4)`, boxShadow: `0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(${wc.rgb}, 0.15)` }}>
                    <div className="px-3 pb-2 mb-2 border-b" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
                      <h4 className="text-xs font-mono font-bold" style={{ color: wc.primary }}>Sort by Field</h4>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto darkwave-scrollbar px-1.5 space-y-0.5">
                      {columns.map(col => {
                        const existingSort = viewSorting.find(s => s.field === col);
                        const isActive = !!existingSort;
                        const direction = existingSort?.direction;

                        return (
                          <button 
                            key={col}
                            onClick={() => {
                              if (!existingSort) {
                                setViewSorting([...viewSorting, { field: col, direction: 'asc' }]);
                              } else if (existingSort.direction === 'asc') {
                                setViewSorting(viewSorting.map(s => s.field === col ? { ...s, direction: 'desc' } : s));
                              } else {
                                setViewSorting(viewSorting.filter(s => s.field !== col));
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-mono transition-all group"
                            style={{ 
                              color: isActive ? wc.primary : '#d1d5db',
                              backgroundColor: isActive ? `rgba(${wc.rgb}, 0.15)` : 'transparent' 
                            }}
                          >
                            <span className="truncate pr-2">{col}</span>
                            {isActive && (
                              <span className="flex-shrink-0 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border" style={{ borderColor: `rgba(${wc.rgb}, 0.4)`, backgroundColor: `rgba(${wc.rgb}, 0.2)` }}>
                                {direction === 'asc' ? 'A-Z' : 'Z-A'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {viewSorting.length > 0 && (
                      <div className="px-2 pt-2 mt-2 border-t" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
                        <button 
                          onClick={() => setViewSorting([])}
                          className="w-full py-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-500 hover:text-white transition-colors rounded hover:bg-white/5"
                        >
                          Clear Sorts
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button onClick={toggleMultiSelect} className="flex items-center justify-center p-2 rounded-lg border transition-all hover:bg-white/5" style={{ color: wc.primary, borderColor: `rgba(${wc.rgb}, 0.3)`, backgroundColor: multiSelectMode ? `rgba(${wc.rgb}, 0.15)` : 'transparent' }} title="Multi-select">
              {multiSelectMode ? <CheckSquareIcon size={16} /> : <CheckboxIcon size={16} />} 
            </button>
          </div>

          {/* Right Aligned Text */}
          <div className="flex-1 flex justify-end min-w-[150px] items-center gap-4">
            <p className="text-gray-500 text-xs font-mono text-right">
              {viewFilters.length > 0 && <span className="ml-2" style={{ color: wc.primary }}>({viewFilters.length} filter{viewFilters.length > 1 ? 's' : ''} active)</span>}
              {viewGroupBy && <span className="ml-2 text-gray-600">grouped by {viewGroupBy}</span>}
            </p>
          </div>
        </div>

        {/* ⚡ Internal scrollable container for records */}
        <div className="flex-1 overflow-y-auto darkwave-scrollbar pr-2 pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, borderTopColor: wc.primary }} />
            </div>
          ) : (
            <>
              {currentLayout === 'table' && renderTableLayout()}
              {currentLayout === 'card' && renderCardLayout()}
              {currentLayout === 'badge' && renderBadgeLayout()}
              {currentLayout === 'calendar' && renderCalendarLayout()}
            </>
          )}
          
          {!isLoading && filteredData.length === 0 && (
            <div className="p-12 text-center bg-black/80 rounded-xl mt-4" style={{ border: `1px solid rgba(${wc.rgb}, 0.3)`, boxShadow: `0 0 30px rgba(${wc.rgb}, 0.05)` }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" 
                style={{ 
                  background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.15), rgba(0,0,0,0.8))`, 
                  border: `1px solid rgba(${wc.rgb}, 0.4)`,
                  boxShadow: `0 0 15px rgba(${wc.rgb}, 0.2)`
                }}>
                <FileIcon size={32} style={{ color: wc.primary }} />
              </div>
              <h3 className="text-lg font-mono font-medium text-white mb-2">No records found</h3>
              <p className="text-gray-500 text-sm font-mono mb-6">
                {searchQuery ? 'Try adjusting your search query' : `Start by adding your first ${singularAppName}.`}
              </p>
              <button 
                onClick={() => setShowAddModal(true)} 
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border-2 transition-all font-mono font-medium hover:scale-105 mx-auto hover:bg-white/5" 
                style={{ 
                  backgroundColor: 'transparent', 
                  borderColor: wc.primary,
                  color: wc.primary, 
                  boxShadow: `0 0 25px rgba(${wc.rgb}, 0.2), inset 0 0 10px rgba(${wc.rgb}, 0.1)` 
                }}
              >
                <PlusIcon size={16} />
                <span>Add First {singularAppName}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ⚡ NEW: Right-Side Alerts Tab (Collapsed) */}
      {!showAlertsPane && appAlerts.length > 0 && (
        <div className="h-full relative w-0 overflow-visible z-40">
          <button
            onClick={() => setShowAlertsPane(true)}
            // ⚡ Added fast pulse animation directly to the tab wrapper
            className="absolute right-0 top-1/2 -translate-y-1/2 px-2.5 py-8 rounded-l-xl transition-all hover:px-3.5 group animate-pulse"
            style={{
              background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.25), rgba(${wc.rgb}, 0.05))`,
              border: `1px solid rgba(${wc.rgb}, 0.6)`,
              borderRight: 'none',
              boxShadow: `0 0 20px rgba(${wc.rgb}, 0.4), inset 0 0 10px rgba(${wc.rgb}, 0.1)`,
              animationDuration: '0.8s' // ⚡ Custom fast pulse speed
            }}
            title="Open Alerts"
          >
            <span className="absolute -top-1 -left-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: wc.primary, animationDuration: '0.8s' }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: wc.primary }} />
            </span>
            <div className="flex flex-col items-center gap-1.5">
              <BellIcon size={16} className="group-hover:scale-110 transition-transform" style={{ color: wc.primary }} />
              <span className="text-[9px] font-mono font-bold tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: wc.primary }}>ALERTS ({appAlerts.length})</span>
            </div>
          </button>
        </div>
      )}

      {/* ⚡ NEW: Right-Side Alerts Pane (Expanded) */}
      {showAlertsPane && appAlerts.length > 0 && (
        <div className="w-72 flex-shrink-0 bg-black/80 rounded-xl overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-right-4" 
             style={{ border: `1px solid rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 30px rgba(${wc.rgb}, 0.2)`, maxHeight: 'calc(100vh - 200px)' }}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, backgroundColor: `rgba(${wc.rgb}, 0.15)` }}>
            <h3 className="text-sm font-mono font-bold flex items-center gap-2" style={{ color: wc.primary }}>
              <BellIcon size={16} /> {appName} Alerts
            </h3>
            <button onClick={() => setShowAlertsPane(false)} className="p-1 transition-colors hover:text-white" style={{ color: `rgba(${wc.rgb}, 0.7)` }}>
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 darkwave-scrollbar">
            {appAlerts.map(alert => {
              // Find the underlying record locally so we can grab its human-readable name
              const rec = dbRecords.find(r => r._item_uid === alert.metadata?.record_id || r._db_id === alert.metadata?.record_id || r.id === alert.metadata?.record_id);
              const recName = rec ? (rec.name || rec.Name || rec.title || rec.Title || alert.metadata?.record_id) : alert.metadata?.record_id;

              return (
                <div 
                  key={alert.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (rec) {
                      // Anchor the modal origin to the card location for a smooth zoom animation
                      setClickOrigin({ x: e.clientX, y: e.clientY }); 
                      setSelectedRecord(rec);
                      setEditingRecord(null);
                    }
                  }}
                  className="bg-black/60 rounded-lg p-3 cursor-pointer transition-all group relative border"
                  style={{ borderColor: `rgba(${wc.rgb}, 0.25)` }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.6)`;
                    e.currentTarget.style.backgroundColor = `rgba(${wc.rgb}, 0.15)`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.25)`;
                    e.currentTarget.style.backgroundColor = `rgba(0,0,0,0.6)`;
                  }}
                >
                  {!alert.is_read && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: wc.primary, boxShadow: `0 0 8px ${wc.primary}`, animationDuration: '0.8s' }} />
                  )}
                  <p className="text-xs font-mono font-bold text-white mb-1 pr-4">{alert.title}</p>
                  <p className="text-[10px] font-mono text-gray-400 line-clamp-2 mb-2">{alert.message}</p>
                  
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: `rgba(${wc.rgb}, 0.15)` }}>
                    <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: `rgba(${wc.rgb}, 0.8)` }}>Record:</span>
                    <span className="text-[10px] font-mono truncate font-medium" style={{ color: wc.primary }}>{recName || 'Unknown'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy Comments Pane (Preserved for backwards compatibility if needed) */}
      {showCommentsPane && (
        <div className="w-80 flex-shrink-0 bg-black/80 rounded-xl overflow-hidden flex flex-col" style={{ border: `1px solid rgba(${wc.rgb}, 0.3)`, maxHeight: 'calc(100vh - 200px)' }}>
          {selectedRecord && miniAppId ? (
            <RecordComments
              recordId={selectedRecord._db_id || selectedRecord.id}
              miniAppId={miniAppId}
              wsColor={wc}
              onClose={() => setShowCommentsPane(false)}
            />
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: `rgba(${wc.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wc.rgb}, 0.08), transparent)` }}>
                <h3 className="text-sm font-mono font-medium" style={{ color: wc.primary }}>Comments</h3>
                <button onClick={() => setShowCommentsPane(false)} className="p-1 text-gray-500 hover:text-white"><CloseIcon size={14} /></button>
              </div>
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <MessageIcon size={24} className="mx-auto mb-2 text-gray-700" />
                  <p className="text-xs text-gray-600 font-mono">Select a record to view comments</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>

    {selectedRecord && !showShareMenu && (
      <>
        {/* Only show background overlay if NOT docked */}
        {dockPosition === 'none' && (
          <div
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm ${isClosing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-300'}`}
            onClick={handleCloseRecord}
          />
        )}

        {/* ⚡ RESTORE THE COLLAPSED TAB HERE */}
        {dockPosition !== 'none' && isTabified && (
          <div 
            className={`fixed ${dockPosition === 'left' ? 'left-0 rounded-r-xl border-r' : 'right-0 rounded-l-xl border-l'} flex flex-col items-center py-4 bg-black/50 backdrop-blur-sm border-y border-gray-800 cursor-pointer hover:bg-black/70 transition-all group shadow-lg z-[100] animate-in fade-in`}
            style={{ 
              zIndex: 40, top: '50%', transform: 'translateY(-50%)', width: '48px', height: '200px', 
              [dockPosition === 'left' ? 'borderRightColor' : 'borderLeftColor']: wc.primary, 
              [dockPosition === 'left' ? 'borderRightWidth' : 'borderLeftWidth']: '3px',
              boxShadow: `0 0 15px ${wc.glow}`
            }}
            onClick={() => {
              setIsTabified(false);
              const nextState = {
                activeRecord: selectedRecord,
                contextData: { appName, appSettings, wc, workspaceSlug, url: getItemUrl(selectedRecord?._item_uid || selectedRecord?.id || '') },
                dockPosition,
                isTabified: false
              };
              localStorage.setItem('acore_pinned_record', JSON.stringify(nextState));
              window.dispatchEvent(new CustomEvent('globalRecordStateChanged', { detail: nextState }));
            }}
            title="Restore Record"
          >
            <button onClick={(e) => { e.stopPropagation(); handleCloseRecord(); }} className={`absolute top-2 ${dockPosition === 'left' ? 'right-2' : 'left-2'} p-1 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800 bg-black/40`} title="Close">
              <CloseIcon size={12} />
            </button>
            <div className="mb-3 mt-4" style={{ color: wc.primary }}><FileIcon size={20} /></div>
            <span className="text-xs font-mono font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: wc.primary }}>RECORD</span>
          </div>
        )}

        {!isTabified && (
          <>
            <button
              onClick={goToPrevRecord}
              disabled={!canGoPrev}
              className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[60] p-2 sm:p-3 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ background: canGoPrev ? `rgba(${wc.rgb}, 0.15)` : 'rgba(255,255,255,0.05)', border: `1px solid rgba(${wc.rgb}, ${canGoPrev ? '0.4' : '0.1'})`, color: canGoPrev ? wc.primary : '#555', boxShadow: canGoPrev ? `0 0 20px rgba(${wc.rgb}, 0.2)` : 'none' }}
              title="Previous record"
            >
              <ChevronLeftIcon size={28} />
            </button>

            <button
              onClick={goToNextRecord}
              disabled={!canGoNext}
              className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[60] p-2 sm:p-3 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ background: canGoNext ? `rgba(${wc.rgb}, 0.15)` : 'rgba(255,255,255,0.05)', border: `1px solid rgba(${wc.rgb}, ${canGoNext ? '0.4' : '0.1'})`, color: canGoNext ? wc.primary : '#555', boxShadow: canGoNext ? `0 0 20px rgba(${wc.rgb}, 0.2)` : 'none' }}
              title="Next record"
            >
              <ChevronRightIcon size={28} />
            </button>
          </>
        )}

        {/* ⚡ Dynamic Wrapper: Switches between Center Modal and Docked Side Panel */}
        {!isTabified && (
          <div id={`local-record-editor-${selectedRecord?._item_uid || selectedRecord?.id}`}
               className={dockPosition === 'none' 
                ? `fixed z-[60] flex flex-col pointer-events-none ${isClosing ? 'animate-out fade-out zoom-out duration-200 ease-in' : 'animate-in fade-in zoom-in duration-300 ease-out'}`
                : `fixed z-[60] flex flex-col pointer-events-none ${dockPosition === 'left' ? 'animate-in slide-in-from-left-full' : 'animate-in slide-in-from-right-full'} duration-300 ease-out`
               }
               style={dockPosition === 'none' 
                ? { top: 'calc(2vh + 60px)', left: '2vw', right: '2vw', bottom: '90px', transformOrigin: clickOrigin ? `${clickOrigin.x}px ${clickOrigin.y}px` : 'center center' }
                : { top: '64px', [dockPosition]: 0, bottom: 0, width: isPanelExpanded ? '600px' : '300px', maxWidth: '90vw', transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined }
               }
               onTouchStart={handleTouchStart}
               onTouchMove={handleTouchMove}
               onTouchEnd={handleTouchEnd}
              >

          {/* THE 2-BUTTON EDGE CONTROLS (Only visible when docked) */}
          {dockPosition !== 'none' && (
            <div className={`absolute top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[110] pointer-events-auto ${dockPosition === 'left' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'}`}>
              <button 
                onClick={handleTabify}
                className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)]"
                style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }}
                title="Dock as Tab"
              >
                <PopoutIcon size={16} className={dockPosition === 'left' ? 'rotate-180' : 'rotate-90'} /> 
              </button>
              <button 
                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                className="flex items-center justify-center w-8 h-10 bg-black/90 border rounded-lg transition-all shadow-[0_0_15px_rgba(0,0,0,0.6)] text-gray-500 hover:text-white hover:bg-gray-800"
                style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }}
                title={isPanelExpanded ? "Collapse Panel" : "Expand Panel"}
              >
                <ChevronRightIcon size={18} className={`transition-transform duration-300 ${dockPosition === 'left' ? (isPanelExpanded ? 'rotate-180' : '') : (isPanelExpanded ? '' : 'rotate-180')}`} /> 
              </button>
            </div>
          )}

          {/* --- TOP TABS ROW --- */}
          <div className="flex justify-start items-end w-full relative z-[2] px-4 sm:px-10 pointer-events-none">
            
            {/* ⚡ FIX: Drastically reduced top/bottom padding (pt-2 pb-1) to keep the tab very short! */}
            <div className="relative flex items-end gap-3 px-14 sm:px-16 pt-2 pb-1 pointer-events-auto"
                 style={{ marginBottom: '-1px' }}
                 onClick={(e) => e.stopPropagation()}>
                 
              {/* Border & Background Layers for perfect slant */}
              <div className="absolute inset-0 z-[-1]" 
                   style={{ 
                     background: `rgba(${wc.rgb}, 0.4)`, 
                     clipPath: 'polygon(40px 0, calc(100% - 40px) 0, 100% 100%, 0 100%)' 
                   }}>
                <div className="absolute inset-[1px] bottom-0 bg-black/95 backdrop-blur-xl" 
                     style={{ 
                       clipPath: 'polygon(39px 0, calc(100% - 39px) 0, 100% 100%, 0 100%)' 
                     }} />
              </div>

              {/* ⚡ Icon and Text Wrapped to center vertically with each other */}
              <div className="flex items-center gap-3 relative top-[2px]">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.2), rgba(0,0,0,0.8))`, border: `1px solid rgba(${wc.rgb}, 0.3)` }}>
                  <AppIcon size={20} style={{ color: wc.primary }} />
                </div>
                
                <div className="pr-2 flex items-center">
                  <h3 className="text-lg sm:text-xl font-mono font-bold whitespace-nowrap leading-none tracking-tight">
                    <span style={{ color: wc.primary }}>{appSettings?.itemName || appName} ID: </span>
                    <span className="text-white">{selectedRecord._item_uid || selectedRecord.id}</span>
                  </h3>
                </div>
              </div>

              {/* ⚡ NEW: Barcode Slide-Out Toggle */}
              {(itemIdSettings?.showQrCode || itemIdSettings?.showBarcode) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowBarcodes(!showBarcodes); }}
                  className={`relative top-[2px] ml-2 p-1.5 rounded-md transition-colors z-10 ${showBarcodes ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  title="Toggle Item Codes"
                >
                  <LucideIcons.ScanBarcode size={16} />
                </button>
              )}

              {/* ⚡ NEW: Sliding Barcode Panel (slides from behind the slanted tab) */}
              {(itemIdSettings?.showQrCode || itemIdSettings?.showBarcode) && (
                <div 
                  className={`absolute top-0 bottom-0 flex items-stretch transition-all duration-300 ease-out z-[-2] ${showBarcodes ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}
                  style={{ left: 'calc(100% - 40px)' }} 
                >
                  <div className="relative flex items-center h-full min-w-[200px]">
                    {/* Outer Border Layer for Slide-out */}
                    <div className="absolute inset-0 z-[-1]" 
                         style={{ 
                           background: `rgba(${wc.rgb}, 0.4)`, 
                           clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 100%, 40px 100%)' 
                         }}>
                      {/* Inner Background Layer for Slide-out */}
                      <div className="absolute inset-[1px] bottom-0 left-0 bg-black/95 backdrop-blur-xl" 
                           style={{ 
                             clipPath: 'polygon(0 0, calc(100% - 39px) 0, 100% 100%, 40px 100%)' 
                           }} />
                    </div>
                    
                    {/* Content (generous gap & right padding to safely clear the slant) */}
                    {/* ⚡ CHANGED: gap-8 is now gap-4 */}
                    <div className="flex items-center gap-4 h-full pl-12 pr-24 py-1.5">
                      {itemIdSettings?.showQrCode && selectedRecord && (
                        <img 
                          src={`https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(getItemUrl(selectedRecord._item_uid || selectedRecord.id))}&scale=4&barcolor=${wc.primary.replace('#','')}`} 
                          alt="QR Code" 
                          title="Enlarge QR Code (Q)"
                          className="h-[80%] w-auto object-contain aspect-square cursor-pointer hover:scale-105 transition-transform" 
                          style={{ filter: 'brightness(1.5)' }} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEnlargedCode({ 
                              url: `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(getItemUrl(selectedRecord._item_uid || selectedRecord.id))}&scale=8&barcolor=${wc.primary.replace('#','')}`, 
                              title: 'QR Code' 
                            }); 
                          }}
                        />
                      )}
                      {itemIdSettings?.showBarcode && selectedRecord && (
                        <img 
                          src={`https://bwipjs-api.metafloor.com/?bcid=${itemIdSettings.barcodeSymbology || 'code128'}&text=${encodeURIComponent(selectedRecord._item_uid || selectedRecord.id)}&scale=3&height=12&barcolor=${wc.primary.replace('#','')}`} 
                          alt="Barcode" 
                          title="Enlarge Barcode (B)"
                          className="h-full w-auto object-contain min-w-[140px] cursor-pointer hover:scale-105 transition-transform" 
                          style={{ filter: 'brightness(1.5)' }} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEnlargedCode({ 
                              url: `https://bwipjs-api.metafloor.com/?bcid=${itemIdSettings.barcodeSymbology || 'code128'}&text=${encodeURIComponent(selectedRecord._item_uid || selectedRecord.id)}&scale=6&height=24&barcolor=${wc.primary.replace('#','')}`, 
                              title: 'Barcode' 
                            }); 
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- MAIN BODY --- */}
          <div className={`flex-1 flex flex-col bg-black/95 backdrop-blur-xl overflow-hidden border pointer-events-auto relative z-[1] ${
                 dockPosition === 'none' ? 'rounded-2xl' : dockPosition === 'left' ? 'border-r border-y-0 border-l-0' : 'border-l border-y-0 border-r-0'
               }`}
               style={{ borderColor: `rgba(${wc.rgb}, 0.4)`, boxShadow: `0 0 60px rgba(${wc.rgb}, 0.15), 0 0 120px rgba(0,0,0,0.8)` }}
               onClick={(e) => e.stopPropagation()}>

            {/* FULL WIDTH HEADER */}
            <div className="flex flex-col w-full border-b bg-black/40 px-4 pt-3 pb-2" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
              
              {/* Single Top Row: Tabs & Actions */}
              <div className="flex items-center justify-between w-full mb-1 gap-4">
                {/* Left side: Tabs */}
                <div className="flex items-center gap-6 overflow-x-auto darkwave-scrollbar pb-2 flex-1">

                  {/* --- TABS CONTAINER --- */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    
                    {/* ⚡ MOVED DETAILS BUTTON (Always visible, bordered, left of toggle) */}
                    <button
                      onClick={() => setRecordDetailTab('details')}
                      className="px-4 py-2 mr-3 text-xs font-mono uppercase tracking-wider transition-all rounded-xl flex-shrink-0 border shadow-inner"
                      style={{
                        color: recordDetailTab === 'details' ? wc.primary : '#888',
                        background: recordDetailTab === 'details' ? `rgba(${wc.rgb}, 0.12)` : 'rgba(255,255,255,0.03)',
                        borderColor: recordDetailTab === 'details' ? `rgba(${wc.rgb}, 0.5)` : 'rgba(255,255,255,0.08)',
                      }}
                      onMouseEnter={e => {
                        if (recordDetailTab !== 'details') {
                          e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.3)`;
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (recordDetailTab !== 'details') {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.color = '#888';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }
                      }}
                      title="View Record Details"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <EditIcon size={14} /> <span>Details</span>
                      </span>
                    </button>

                    {/* --- Shrink/Expand Toggle --- */}
                    <button
                      onClick={() => setTabsDisplayState(prev => prev === 'full' ? 'icons' : 'full')}
                      className="p-1 sm:p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 mr-1"
                      title={tabsDisplayState === 'full' ? "Collapse Tabs" : "Expand Tabs"}
                    >
                      {tabsDisplayState === 'full' ? <LucideIcons.Minimize2 size={16} /> : <LucideIcons.Maximize2 size={16} />}
                    </button>

                    {/* --- 5 Action Tabs --- */}
                    {(['tasks', 'connections', 'comments', 'attachments', 'activity', 'alerts'] as const).map(tab => {
                      // ⚡ UPDATE THIS LINE:
                      const isActiveTab = (tab === 'activity' && showActivitySplit) || (tab === 'comments' && showCommentsSplit) || (!showActivitySplit && !showCommentsSplit && recordDetailTab === tab);
                      
                      return (
                        <button
                          key={tab}
                          onClick={() => {
                            // ⚡ UPDATE THIS ENTIRE ONCLICK BLOCK:
                            if (tab === 'activity') {
                              setShowActivitySplit(!showActivitySplit);
                              setShowCommentsSplit(false);
                              if (!showActivitySplit && recordDetailTab === 'activity') setRecordDetailTab('details');
                            } else if (tab === 'comments') {
                              setShowCommentsSplit(!showCommentsSplit);
                              setShowActivitySplit(false);
                              if (!showCommentsSplit && recordDetailTab === 'comments') setRecordDetailTab('details');
                            } else {
                              setShowActivitySplit(false);
                              setShowCommentsSplit(false);
                              setRecordDetailTab(tab);
                            }
                          }}
                          className={`py-1.5 sm:py-2 text-xs font-mono uppercase tracking-wider transition-all rounded-lg flex-shrink-0 ${tabsDisplayState === 'icons' ? 'px-2' : 'px-3'}`}
                          style={{
                            color: isActiveTab ? wc?.primary : '#6b7280',
                            background: isActiveTab ? `rgba(${wc?.rgb}, 0.08)` : 'transparent',
                          }}
                          title={tab}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            {tab === 'tasks' && <CheckSquareIcon size={14} />}
                            {tab === 'connections' && <GitBranchIcon size={14} />}
                            {tab === 'comments' && <MessageIcon size={14} />}
                            {tab === 'attachments' && <PaperclipIcon size={14} />}
                            {tab === 'activity' && <Activity size={14} />}
                            {tab === 'alerts' && <LucideIcons.AlertTriangle size={14} />}
                            {tabsDisplayState === 'full' && <span>{tab}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Right side: Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-auto border-l pl-3" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
                  {/* Pin Controls */}
                  <button onClick={() => handlePin('left')} className={`p-1.5 rounded-lg transition-all hover:bg-white/5 flex-shrink-0 ${dockPosition === 'left' ? 'bg-white/10' : ''}`} style={{ color: dockPosition === 'left' ? wc.primary : '#6b7280' }} title="Pin Left">
                    <LucideIcons.PanelLeft size={18} />
                  </button>
                  <button onClick={() => handlePin('none')} className={`p-1.5 rounded-lg transition-all hover:bg-white/5 flex-shrink-0 ${dockPosition === 'none' ? 'bg-white/10' : ''}`} style={{ color: dockPosition === 'none' ? wc.primary : '#6b7280' }} title="Center">
                    <MaximizeIcon size={16} />
                  </button>
                  <button onClick={() => handlePin('right')} className={`p-1.5 rounded-lg transition-all hover:bg-white/5 flex-shrink-0 ${dockPosition === 'right' ? 'bg-white/10' : ''}`} style={{ color: dockPosition === 'right' ? wc.primary : '#6b7280' }} title="Pin Right">
                    <LucideIcons.PanelRight size={18} />
                  </button>
                  
                  <div className="w-px h-5 mx-1" style={{ backgroundColor: `rgba(${wc.rgb}, 0.2)` }} />

                  <button onClick={() => setShowShareMenu(true)} className="p-1.5 rounded-lg transition-all hover:bg-white/5 flex-shrink-0" style={{ color: wc.primary }} title="Share"><Share2Icon size={16} /></button>
                  <button onClick={() => handleDeleteRecord(selectedRecord)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0" title="Delete"><TrashIcon size={16} /></button>
                  <button onClick={handleCloseRecord} className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all flex-shrink-0" title="Close"><CloseIcon size={20} /></button>
                </div>
              </div>
            </div>

          {/* --- SPLIT PANE WRAPPER --- */}
          <div className="flex-1 flex relative overflow-hidden">
            
            {/* Left Side (Content + Footer) */}
            {/* ⚡ TRIMMED: Reduced mr-[350px] sm:mr-[400px] to mr-[320px] sm:mr-[360px] */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${(showActivitySplit || showCommentsSplit) ? 'mr-[320px] sm:mr-[360px]' : ''}`}>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 darkwave-scrollbar">
                {recordDetailTab === 'details' && (
                  <div className="w-full">
                    {schemaFields.length > 0 ? (
                      renderFormLayout(schemaFields, editingRecord || selectedRecord, (field, val) => {
                        if (!editingRecord) setEditingRecord({ ...selectedRecord });
                        setEditingRecord(prev => prev ? { ...prev, [field.id]: val, [field.name]: val } : { ...selectedRecord, [field.id]: val, [field.name]: val });
                      }, activeTabMap, setActiveTabMap, false)
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {(columns.length > 0 ? columns : ['name', 'status', 'description']).map(col => (
                          <div key={col}>
                            <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{col.replace(/([A-Z])/g, ' $1').trim()}</label>
                            {renderSchemaInput(col, editingRecord ? String(editingRecord[col] ?? '') : String(selectedRecord[col] ?? ''), (val) => {
                              if (!editingRecord) setEditingRecord({ ...selectedRecord });
                              setEditingRecord(prev => prev ? { ...prev, [col]: val } : { ...selectedRecord, [col]: val });
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TASKS TAB */}
                {recordDetailTab === 'tasks' && (
                  <div className="flex items-center justify-center p-12 h-full min-h-[300px]">
                    <div className="text-center">
                      <CheckSquareIcon size={32} className="mx-auto mb-3 text-gray-700" />
                      <h3 className="text-lg font-mono font-medium text-white mb-2">Linked Tasks</h3>
                      <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto mb-6">
                        Create and track tasks specifically related to this record.
                      </p>
                      <button 
                        onClick={() => setActiveLeftPanel('tasks')}
                        className="px-6 py-2 rounded-lg transition-all font-mono text-sm font-medium hover:scale-105"
                        style={{ background: wc.primary, color: '#000', boxShadow: `0 0 20px rgba(${wc.rgb}, 0.3)` }}
                      >
                        Open Tasks Panel
                      </button>
                    </div>
                  </div>
                )}

                {/* CONNECTIONS TAB */}
                {recordDetailTab === 'connections' && selectedRecord && organization?.id && (
                  <RecordConnectionsTab 
                    record={selectedRecord} 
                    organizationId={organization.id} 
                    workspaceSlug={workspaceSlug}
                    wsColor={wc} 
                    hostAppSettings={appSettings}
                    onPreview={setPreviewConnection}
                  />
                )}

                {/* ALERTS TAB */}
                {recordDetailTab === 'alerts' && (
                  <div className="flex items-center justify-center p-12 h-full min-h-[300px]">
                    <div className="text-center">
                      <LucideIcons.AlertTriangle size={32} className="mx-auto mb-3 text-gray-700" />
                      <h3 className="text-lg font-mono font-medium text-white mb-2">Record Alerts</h3>
                      <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto">
                        Set custom notifications, reminders, and alerts tied to this specific record. (Coming soon)
                      </p>
                    </div>
                  </div>
                )}

                {recordDetailTab === 'attachments' && selectedRecord._db_id && (
                  <div className="p-6 w-full">
                    <RecordAttachments recordId={selectedRecord._db_id} miniAppId={miniAppId || ''} wsColor={wc} attachments={selectedRecord._attachments || []} onAttachmentsChange={(attachments) => handleAttachmentsChange(selectedRecord._db_id, attachments)} />
                  </div>
                )}
                {recordDetailTab === 'attachments' && !selectedRecord._db_id && (
                  <div className="flex items-center justify-center p-12">
                    <div className="text-center">
                      <PaperclipIcon size={28} className="mx-auto mb-2 text-gray-700" />
                      <p className="text-xs text-gray-600 font-mono">Save the record first to add attachments</p>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              {recordDetailTab === 'details' && (
                <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-gray-800/50 flex flex-wrap items-center justify-between gap-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <div className="flex items-center gap-2 text-xs text-gray-600 font-mono w-full sm:w-auto">
                    {selectedRecordIndex >= 0 && <span>Use chevron arrows or swipe to navigate between records</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
                    <button onClick={handleCloseRecord} className="px-6 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 transition-all font-mono text-sm flex-1 sm:flex-none text-center">Close</button>
                    <button onClick={handleUpdateRecord} disabled={isSaving || !editingRecord} className="px-6 py-2 rounded-lg transition-all font-mono text-sm font-medium disabled:opacity-30 flex-1 sm:flex-none text-center" style={{ background: `rgba(${wc.rgb}, 0.2)`, border: `1px solid rgba(${wc.rgb}, 0.5)`, color: wc.primary }}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Embedded Activity Split Panel */}
            <div 
              className={`absolute top-0 right-0 bottom-0 w-[280px] sm:w-[360px] bg-black border-l transition-transform duration-300 z-20 flex flex-col ${showActivitySplit ? 'translate-x-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]' : 'translate-x-full pointer-events-none'}`}
              style={{ borderColor: `rgba(${wc?.rgb}, 0.2)` }}
            >
              {showActivitySplit && (
                <InlineActivityPanel 
                  currentWorkspace={workspaceSlug} 
                  currentMiniApp={appName} 
                  onClose={() => setShowActivitySplit(false)} 
                  accentColor={wc?.primary || '#22d3ee'} 
                  accentRgb={wc?.rgb || '34, 211, 238'} 
                  recordContext={selectedRecord}
                />
              )}
            </div>

            {/* Right Side: Embedded Comments Split Panel */}
            <div
              className={`absolute top-0 right-0 bottom-0 w-[280px] sm:w-[360px] bg-black border-l transition-transform duration-300 z-20 flex flex-col ${showCommentsSplit ? 'translate-x-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]' : 'translate-x-full pointer-events-none'}`}
              style={{ borderColor: `rgba(${wc?.rgb}, 0.2)` }}
            >
              {selectedRecord && miniAppId && (
                <RecordCommentsPane
                  recordId={selectedRecord._db_id || selectedRecord.id}
                  miniAppId={miniAppId}
                  wsColor={wc}
                  onClose={() => setShowCommentsSplit(false)}
                />
              )}
            </div>

          </div>
        </div> 
        </div> 
        )}
      </>
    )}

    {showShareMenu && selectedRecord && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowShareMenu(false)} />
        <div className="relative bg-black rounded-xl w-full max-w-sm mx-4" style={{ border: `1px solid rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 40px rgba(${wc.rgb}, 0.2)` }}>
          <div className="p-4 border-b" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold" style={{ color: wc.primary }}>Share "{selectedRecord.name}"</h3>
              <button onClick={() => setShowShareMenu(false)} className="p-1 text-gray-400 hover:text-white"><CloseIcon size={16} /></button>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {['John Doe', 'Sarah Wilson', 'Mike Johnson'].map(name => (
              <button key={name} onClick={() => { setShowShareMenu(false); setSelectedRecord(null); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all" style={{ border: `1px solid rgba(${wc.rgb}, 0.15)` }} onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.4)`; e.currentTarget.style.backgroundColor = `rgba(${wc.rgb}, 0.05)`; }} onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${wc.rgb}, 0.15)`; e.currentTarget.style.backgroundColor = ''; }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono" style={{ background: `rgba(${wc.rgb}, 0.2)`, color: wc.primary }}>{name.split(' ').map(n => n[0]).join('')}</div>
                <span className="text-sm text-white font-mono">{name}</span>
                <SendIcon size={14} className="ml-auto" style={{ color: wc.primary }} />
              </button>
            ))}
            <button className="w-full mt-2 py-2 rounded-lg text-sm font-mono text-gray-400 border border-gray-700 hover:bg-gray-900 transition-all" onClick={() => { navigator.clipboard.writeText(getItemUrl(selectedRecord.id)); setShowShareMenu(false); setSelectedRecord(null); }}>
              Copy Link
            </button>
          </div>
        </div>
      </div>
    )}

    {addRecordModal}

    {previewConnection && (
      <>
        {/* Background Overlay */}
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={() => setPreviewConnection(null)} />
        
        {/* Wrapper matched to the Add/Edit Record sizing constraints */}
        <div className="fixed z-[201] flex flex-col pointer-events-none animate-in fade-in zoom-in-95 duration-200" 
             style={{ top: 'calc(2vh + 60px)', left: '2vw', right: '2vw', bottom: '90px' }}>
             
          <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto bg-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl pointer-events-auto" 
               style={{ borderColor: `rgba(${wc.rgb}, 0.4)`, boxShadow: `0 0 60px rgba(${wc.rgb}, 0.15)` }}>
            
            <div className="flex items-center justify-between px-6 py-4 border-b bg-black/40 flex-shrink-0" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${wc.rgb}, 0.15)`, border: `1px solid rgba(${wc.rgb}, 0.3)` }}>
                  <MaximizeIcon size={16} style={{ color: wc.primary }} />
                </div>
                <div>
                  <h3 className="text-base font-mono font-bold text-white">{previewConnection.appName} Record</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {previewConnection.id}</p>
                </div>
              </div>
              <button onClick={() => setPreviewConnection(null)} className="p-2 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/5">
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-6 sm:pt-8 darkwave-scrollbar">
              <div className="w-full">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, borderTopColor: wc.primary }} />
                  </div>
                ) : previewSchema.length > 0 ? (
                  renderFormLayout(previewSchema, previewConnection.data, () => {}, previewTabMap, setPreviewTabMap, true)
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pointer-events-none opacity-90">
                    {Object.entries(previewConnection.data).filter(([k]) => !k.startsWith('_')).map(([col, val]) => (
                      <div key={col}>
                        <label className="block text-[11px] font-mono font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{col.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <div className="w-full bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm break-words min-h-[40px]">{String(val || '')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    )}

    {/* External Communication Modal */}
    {externalModalUser && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setExternalModalUser(null)}>
        <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-sm w-full mx-4 border animate-in fade-in zoom-in-95 duration-200" 
             style={{ 
               borderColor: `rgba(${wc.rgb}, 0.3)`, 
               background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.05), rgba(0,0,0,0.95))`, 
               boxShadow: `0 0 40px rgba(${wc.rgb}, 0.15)` 
             }}
             onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-white">External Contact</h3>
            <button onClick={() => setExternalModalUser(null)} className="text-gray-500 hover:text-white transition-colors">
              <CloseIcon size={16} />
            </button>
          </div>
          
          <div className="text-xs font-mono text-gray-400 text-center">
            Reach out to <span className="text-white font-medium">{externalModalUser.name}</span> externally:
          </div>

          <div className="flex gap-4">
            <button 
              title="Call user's phone"
              className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
              style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}
              onClick={() => { console.log('Initiate External Call'); setExternalModalUser(null); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span className="text-sm font-mono font-bold">Call</span>
            </button>
            
            <button 
              title="Text user's phone"
              className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
              style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}
              onClick={() => { console.log('Initiate External Text'); setExternalModalUser(null); }}
            >
              <MessageSquare size={24} />
              <span className="text-sm font-mono font-bold">Text</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Internal Call Modal */}
    {callModalUser && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setCallModalUser(null)}>
        <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-sm w-full mx-4 border animate-in fade-in zoom-in-95 duration-200" 
             style={{ 
               borderColor: `rgba(${wc.rgb}, 0.3)`, 
               background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.05), rgba(0,0,0,0.95))`, 
               boxShadow: `0 0 40px rgba(${wc.rgb}, 0.15)` 
             }}
             onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-white">Start Call</h3>
            <button onClick={() => setCallModalUser(null)} className="text-gray-500 hover:text-white transition-colors">
              <CloseIcon size={16} />
            </button>
          </div>
          
          <div className="text-xs font-mono text-gray-400 text-center">
            Call <span className="text-white font-medium">{callModalUser.name}</span>:
          </div>

          <div className="flex gap-4">
            <button 
              title="Internal system call"
              className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
              style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}
              onClick={() => { console.log('Initiate Audio Call'); setCallModalUser(null); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span className="text-sm font-mono font-bold">Audio</span>
            </button>
            
            <button 
              title="Internal system video call"
              className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
              style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}
              onClick={() => { console.log('Initiate Video Call'); setCallModalUser(null); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              <span className="text-sm font-mono font-bold">Video</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Record Modal */}
    {recordModalUser && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setRecordModalUser(null)}>
        <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-sm w-full mx-4 border animate-in fade-in zoom-in-95 duration-200" 
             style={{ 
               borderColor: `rgba(${wc.rgb}, 0.3)`, 
               background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.05), rgba(0,0,0,0.95))`, 
               boxShadow: `0 0 40px rgba(${wc.rgb}, 0.15)` 
             }}
             onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-white">Record Message</h3>
            <button onClick={() => setRecordModalUser(null)} className="text-gray-500 hover:text-white transition-colors">
              <CloseIcon size={16} />
            </button>
          </div>
          
          <div className="text-xs font-mono text-gray-400 text-center">
            Send a recording to <span className="text-white font-medium">{recordModalUser.name}</span>:
          </div>

          <div className="flex gap-4">
            <button 
              title="Record and send internal system audio message"
              className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
              style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}
              onClick={() => { console.log('Initiate Audio Recording'); setRecordModalUser(null); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              <span className="text-sm font-mono font-bold">Audio</span>
            </button>
            
            <button 
              title="Record and send internal system video message"
              className="flex-1 flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:scale-105 hover:bg-white/5"
              style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}
              onClick={() => { console.log('Initiate Video Recording'); setRecordModalUser(null); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              <span className="text-sm font-mono font-bold">Video</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {showExportModal && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
        <div className="relative bg-black rounded-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200" style={{ border: `1px solid rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 40px rgba(${wc.rgb}, 0.2)` }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-mono font-bold" style={{ color: wc.primary }}>Export Data</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  Select columns to include ({exportTarget === 'selected' ? selectedIds.size : filteredData.length} records)
                </p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"><CloseIcon size={20} /></button>
            </div>
            
            <div className="flex justify-between items-center mb-3 pb-2 border-b" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
              <button 
                onClick={() => setSelectedExportColumns(new Set(columns))}
                className="text-xs font-mono text-gray-400 hover:text-white transition-colors"
              >Select All</button>
              <button 
                onClick={() => setSelectedExportColumns(new Set())}
                className="text-xs font-mono text-gray-400 hover:text-white transition-colors"
              >Deselect All</button>
            </div>

            <div className="max-h-60 overflow-y-auto darkwave-scrollbar space-y-1 mb-5 pr-2">
              {columns.map(col => {
                const isSelected = selectedExportColumns.has(col);
                return (
                  <label key={col} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors border" style={{ borderColor: isSelected ? `rgba(${wc.rgb}, 0.3)` : 'transparent' }}>
                    <div className="w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0" style={{ borderColor: isSelected ? wc.primary : '#4b5563', background: isSelected ? `rgba(${wc.rgb}, 0.2)` : 'transparent' }}>
                      {isSelected && <CheckSquareIcon size={12} style={{ color: wc.primary }} />}
                    </div>
                    <span className="text-sm font-mono text-gray-300 truncate">{col.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                );
              })}
            </div>
            
            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
              <button type="button" onClick={() => setShowExportModal(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm transition-all">Cancel</button>
              <button 
                type="button"
                onClick={handleConfirmExport} 
                disabled={selectedExportColumns.size === 0} 
                className="flex-1 py-2 rounded-lg font-mono text-sm font-medium disabled:opacity-30 transition-all flex items-center justify-center gap-2" 
                style={{ background: wc.primary, color: '#000', boxShadow: `0 0 20px rgba(${wc.rgb}, 0.3)` }}
              >
                <DownloadIcon size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showImportModal && importData && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowImportModal(false); setImportData(null); }} />
        <div className="relative bg-black rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden" style={{ border: `1px solid rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 40px rgba(${wc.rgb}, 0.2)` }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono font-bold" style={{ color: wc.primary }}>Import CSV</h3>
              <button onClick={() => { setShowImportModal(false); setImportData(null); }} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={20} /></button>
            </div>
            <p className="text-xs text-gray-500 font-mono mb-4">{importData.rows.length} rows found. Map CSV columns to fields:</p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto darkwave-scrollbar">
              {importData.headers.map(header => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono w-32 truncate" title={header}>{header}</span>
                  <ChevronRightIcon size={14} className="text-gray-600" />
                  <select value={importMapping[header] || ''} onChange={e => setImportMapping(prev => ({ ...prev, [header]: e.target.value }))} className="flex-1 bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none">
                    <option value="">Skip</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowImportModal(false); setImportData(null); }} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">Cancel</button>
              <button onClick={handleImportRecords} disabled={isImporting || Object.values(importMapping).filter(Boolean).length === 0} className="flex-1 py-2 rounded-lg font-mono text-sm font-medium disabled:opacity-30 transition-all" style={{ background: wc.primary, color: '#000' }}>
                {isImporting ? 'Importing...' : `Import ${importData.rows.length} Records`}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {multiSelectMode && selectedIds.size > 0 && (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-4" style={{ background: `rgba(0,0,0,0.9)`, border: `1px solid rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 40px rgba(${wc.rgb}, 0.2), 0 8px 32px rgba(0,0,0,0.6)` }}>
        <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
          <CheckSquareIcon size={16} style={{ color: wc.primary }} />
          <span className="text-sm font-mono font-bold" style={{ color: wc.primary }}>{selectedIds.size}</span>
          <span className="text-xs text-gray-400 font-mono">selected</span>
        </div>
        <button onClick={() => { setBulkEditField(columns[0] || ''); setBulkEditValue(''); setShowBulkEditModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all hover:scale-105" style={{ background: `rgba(${wc.rgb}, 0.15)`, border: `1px solid rgba(${wc.rgb}, 0.3)`, color: wc.primary }} title="Bulk edit a field on selected records">
          <EditIcon size={14} /> Edit Field
        </button>
        <button onClick={() => { loadAvailableMiniApps(); setShowAddToAppModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all hover:scale-105" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }} title="Add selected records to another MiniApp">
          <GitBranchIcon size={14} /> Add to App
        </button>
        <button onClick={handleBulkExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all hover:scale-105" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }} title="Export selected records">
          <DownloadIcon size={14} /> Export
        </button>
        <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all hover:scale-105" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }} title="Delete selected records">
          <TrashIcon size={14} /> Delete
        </button>
        <button onClick={() => { setSelectedIds(new Set()); setMultiSelectMode(false); }} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all ml-1" title="Clear selection">
          <CloseIcon size={16} />
        </button>
      </div>
    )}

    {showBulkEditModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBulkEditModal(false)} />
        <div className="relative bg-black rounded-xl w-full max-w-md mx-4" style={{ border: `1px solid rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 40px rgba(${wc.rgb}, 0.2)` }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-mono font-bold" style={{ color: wc.primary }}>Bulk Edit Field</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">Update a field across {selectedIds.size} selected record{selectedIds.size > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowBulkEditModal(false)} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Select Field</label>
                <select value={bulkEditField} onChange={e => { setBulkEditField(e.target.value); setBulkEditValue(''); }} className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2 text-white font-mono focus:outline-none">
                  {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">New Value</label>
                {renderSchemaInput(bulkEditField, bulkEditValue, setBulkEditValue)}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowBulkEditModal(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">Cancel</button>
                <button onClick={handleBulkEditField} disabled={isBulkProcessing || !bulkEditField} className="flex-1 py-2 rounded-lg font-mono text-sm font-medium disabled:opacity-30 transition-all" style={{ background: wc.primary, color: '#000' }}>
                  {isBulkProcessing ? 'Updating...' : `Update ${selectedIds.size} Records`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {showAddToAppModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddToAppModal(false)} />
        <div className="relative bg-black rounded-xl w-full max-w-md mx-4" style={{ border: '1px solid rgba(34,197,94,0.5)', boxShadow: '0 0 40px rgba(34,197,94,0.2)' }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-mono font-bold text-green-400">Add to Another App</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">Copy {selectedIds.size} record{selectedIds.size > 1 ? 's' : ''} to another MiniApp</p>
              </div>
              <button onClick={() => setShowAddToAppModal(false)} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Target MiniApp</label>
                <div className="relative mb-2">
                  <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" value={addToAppSearchQuery} onChange={e => setAddToAppSearchQuery(e.target.value)} className="w-full bg-gray-900/80 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-white font-mono text-sm focus:outline-none" placeholder="Search MiniApps..." />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-gray-900/50 rounded-lg p-2">
                  {availableMiniApps.filter(a => a.name.toLowerCase().includes(addToAppSearchQuery.toLowerCase())).map(app => {
                    const isTarget = targetAppId === app.id;
                    const TargetIcon = getMiniAppIcon(app.name);
                    return (
                      <button key={app.id} onClick={() => setTargetAppId(app.id)} className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${isTarget ? 'bg-green-500/20 border border-green-500/50' : 'border border-transparent hover:border-gray-700'}`}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isTarget ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)', border: isTarget ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.1)' }}>
                          <TargetIcon size={14} style={{ color: isTarget ? '#22c55e' : '#6b7280' }} />
                        </div>
                        <span className={`text-sm font-mono ${isTarget ? 'text-green-400 font-medium' : 'text-gray-300'}`}>{app.name}</span>
                        {isTarget && <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="ml-auto"><polyline points="20,6 9,17 4,12" /></svg>}
                      </button>
                    );
                  })}
                  {availableMiniApps.filter(a => a.name.toLowerCase().includes(addToAppSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-xs text-gray-600 font-mono text-center py-4">No MiniApps found</p>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-gray-400 font-mono">Selected records will be <span className="text-green-400 font-medium">copied</span> to the target MiniApp with a reference back to {appName}. Original records remain unchanged.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddToAppModal(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">Cancel</button>
                <button onClick={handleAddToAnotherApp} disabled={isBulkProcessing || !targetAppId} className="flex-1 py-2 rounded-lg font-mono text-sm font-medium disabled:opacity-30 transition-all" style={{ background: '#22c55e', color: '#000' }}>
                  {isBulkProcessing ? 'Adding...' : `Add ${selectedIds.size} to ${availableMiniApps.find(a => a.id === targetAppId)?.name || 'App'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* All Users Full Screen Modal */}
      {showAllUsersModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowAllUsersModal(false)}>
          <div className="flex flex-col gap-6 p-6 rounded-2xl max-w-5xl w-full mx-4 border h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
               style={{
                 borderColor: `rgba(${wc.rgb}, 0.3)`,
                 background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.05), rgba(0,0,0,0.95))`,
                 boxShadow: `0 0 60px rgba(${wc.rgb}, 0.15)`
               }}
               onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4 flex-shrink-0" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg" style={{ backgroundColor: `rgba(${wc.rgb}, 0.1)`, borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}>
                  <UsersIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-mono font-bold text-white tracking-wide">Workspace Directory</h3>
                  <p className="text-sm text-gray-500 font-mono mt-1">{processedDirectoryUsers.length} total members</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                   <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                   <input 
                     type="text" 
                     placeholder="Search users..." 
                     value={directorySearchQuery} 
                     onChange={e => setDirectorySearchQuery(e.target.value)} 
                     className="w-48 sm:w-64 bg-black/50 border rounded-lg pl-9 pr-3 py-2 text-white font-mono text-sm focus:outline-none transition-all" 
                     style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }} 
                   />
                </div>
                
                {/* View Toggles */}
                <div className="flex items-center bg-black/50 border rounded-lg p-1" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
                   <button onClick={() => setDirectoryViewMode('grid')} className={`p-1.5 rounded transition-all ${directoryViewMode === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'}`} style={{ color: directoryViewMode === 'grid' ? wc.primary : '#6b7280' }} title="Grid View">
                     <LayoutDashboard size={16} />
                   </button>
                   <button onClick={() => setDirectoryViewMode('list')} className={`p-1.5 rounded transition-all ${directoryViewMode === 'list' ? 'bg-white/10' : 'hover:bg-white/5'}`} style={{ color: directoryViewMode === 'list' ? wc.primary : '#6b7280' }} title="List View">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                   </button>
                </div>

                <button onClick={() => setShowAllUsersModal(false)} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 ml-1">
                  <CloseIcon size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {directoryViewMode === 'list' ? (
              <div className="flex-1 overflow-y-auto darkwave-scrollbar -mx-2 px-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-gray-800 text-gray-500 font-mono text-xs uppercase tracking-wider">
                       <th className="pb-3 pt-2 pl-4 cursor-pointer hover:text-white transition-colors select-none" onClick={() => { setDirectorySortKey('name'); setDirectorySortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                         User Name <span className="inline-block w-4">{directorySortKey === 'name' ? (directorySortDir === 'asc' ? '↑' : '↓') : ''}</span>
                       </th>
                       <th className="pb-3 pt-2 cursor-pointer hover:text-white transition-colors select-none" onClick={() => { setDirectorySortKey('status'); setDirectorySortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                         Status <span className="inline-block w-4">{directorySortKey === 'status' ? (directorySortDir === 'asc' ? '↑' : '↓') : ''}</span>
                       </th>
                       <th className="pb-3 pt-2">Last Seen</th>
                       <th className="pb-3 pt-2 pr-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {processedDirectoryUsers.length > 0 ? processedDirectoryUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                         <td className="py-3 pl-4 flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold font-mono flex-shrink-0" style={{ borderColor: u.status === 'active' ? `rgba(34,197,94,0.4)` : u.status === 'idle' ? `rgba(234,179,8,0.4)` : `rgba(239,68,68,0.4)`, background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)', color: u.status === 'active' ? wc.primary : '#9ca3af' }}>
                             {u.name.split(' ').map(n => n[0]).join('')}
                           </div>
                           <span className="text-white font-mono text-sm truncate">{u.name}</span>
                         </td>
                         <td className="py-3">
                           <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                             <span className="text-gray-400 font-mono text-xs uppercase tracking-wider">{u.status}</span>
                           </div>
                         </td>
                         <td className="py-3 text-gray-500 font-mono text-xs">
                           {u.status === 'active' ? 'Today, 8:42 AM' : 'Yesterday, 4:15 PM'}
                         </td>
                         <td className="py-3 pr-4 text-right">
                           <div className="flex items-center justify-end gap-6 opacity-30 group-hover:opacity-100 transition-opacity">
                              <label className="flex items-center gap-2 cursor-pointer" title="Suspend User">
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Suspend</span>
                                <div className="relative w-8 h-4 rounded-full bg-black border transition-colors" style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }}>
                                   <div className="absolute left-[2px] top-[1px] w-3 h-3 rounded-full bg-gray-600 transition-transform"></div>
                                </div>
                              </label>
                              <button className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-all" title="Remove User">
                                <TrashIcon size={16} />
                              </button>
                           </div>
                         </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500 font-mono text-sm">No users match your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto darkwave-scrollbar pr-2 pb-2">
                {processedDirectoryUsers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {processedDirectoryUsers.map(u => {
                      const isOpen = activeUserDropdown === u.id;
                      return (
                        <div key={u.id} className="relative group/usercard">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setActiveUserDropdown(isOpen ? null : u.id); }}
                            className={`flex items-center gap-4 p-3.5 rounded-xl bg-black/40 border transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-lg ${isOpen ? 'ring-2 ring-offset-2 ring-offset-black' : 'hover:bg-white/5'}`}
                            style={{ 
                              borderColor: `rgba(${wc.rgb}, 0.15)`,
                              ...(isOpen ? { ringColor: wc.primary } : {})
                            }}>
                            <div className="relative w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold font-mono transition-all flex-shrink-0"
                                 style={{
                                   borderColor: u.status === 'active' ? `rgba(34,197,94,0.4)` : u.status === 'idle' ? `rgba(234,179,8,0.4)` : `rgba(239,68,68,0.4)`,
                                   background: u.status === 'active' ? `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.8))` : 'rgb(31,41,55)',
                                   color: u.status === 'active' ? wc.primary : '#9ca3af',
                                 }}>
                              {u.name.split(' ').map(n => n[0]).join('')}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-white font-mono text-sm font-bold truncate transition-colors" style={{ color: u.status === 'active' ? 'white' : '#9ca3af' }}>{u.name}</span>
                              <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider truncate mt-0.5">{u.status}</span>
                            </div>
                          </div>

                          {/* Expanded User Profile Card */}
                          {isOpen && (
                            <div className="absolute top-[110%] w-[380px] max-w-[90vw] p-5 rounded-xl cursor-default flex gap-5 bg-black/95 backdrop-blur-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 z-[100] left-1/2 -translate-x-1/2 sm:[.group\/usercard:nth-child(2n-1)_&]:left-0 sm:[.group\/usercard:nth-child(2n-1)_&]:right-auto sm:[.group\/usercard:nth-child(2n-1)_&]:translate-x-0 sm:[.group\/usercard:nth-child(2n)_&]:left-auto sm:[.group\/usercard:nth-child(2n)_&]:right-0 sm:[.group\/usercard:nth-child(2n)_&]:translate-x-0 md:[.group\/usercard:nth-child(3n-2)_&]:left-0 md:[.group\/usercard:nth-child(3n-2)_&]:right-auto md:[.group\/usercard:nth-child(3n-2)_&]:translate-x-0 md:[.group\/usercard:nth-child(3n-1)_&]:left-1/2 md:[.group\/usercard:nth-child(3n-1)_&]:right-auto md:[.group\/usercard:nth-child(3n-1)_&]:-translate-x-1/2 md:[.group\/usercard:nth-child(3n)_&]:left-auto md:[.group\/usercard:nth-child(3n)_&]:right-0 md:[.group\/usercard:nth-child(3n)_&]:translate-x-0 lg:[.group\/usercard:nth-child(4n-3)_&]:left-0 lg:[.group\/usercard:nth-child(4n-3)_&]:right-auto lg:[.group\/usercard:nth-child(4n-3)_&]:translate-x-0 lg:[.group\/usercard:nth-child(4n-2)_&]:left-1/2 lg:[.group\/usercard:nth-child(4n-2)_&]:right-auto lg:[.group\/usercard:nth-child(4n-2)_&]:-translate-x-1/2 lg:[.group\/usercard:nth-child(4n-1)_&]:left-1/2 lg:[.group\/usercard:nth-child(4n-1)_&]:right-auto lg:[.group\/usercard:nth-child(4n-1)_&]:-translate-x-1/2 lg:[.group\/usercard:nth-child(4n)_&]:left-auto lg:[.group\/usercard:nth-child(4n)_&]:right-0 lg:[.group\/usercard:nth-child(4n)_&]:translate-x-0"
                                 style={{ 
                                   borderColor: `rgba(${wc.rgb}, 0.5)`, 
                                   boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 25px rgba(${wc.rgb}, 0.3)`,
                                   filter: `drop-shadow(0 0 10px rgba(${wc.rgb}, 0.15))`
                                 }}
                                 onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col items-center flex-shrink-0 w-[108px]">
                                <div className="w-[86px] h-[86px] rounded-full flex items-center justify-center text-2xl font-bold font-mono" 
                                     style={{ 
                                       background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.3), rgba(0,0,0,0.9))`, 
                                       border: `2px solid ${wc.primary}`, 
                                       color: wc.primary,
                                       boxShadow: `0 0 15px rgba(${wc.rgb}, 0.4)`
                                     }}>
                                  {u.name.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div className="mt-4 mb-3 w-full flex-1 flex flex-col">
                                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider mb-1 text-left" style={{ color: wc.primary }}>Status:</span>
                                  <div className="flex-1 p-2 w-full rounded bg-white/5 border flex items-start justify-start" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
                                    <span className="text-[10px] font-mono text-gray-400 italic leading-tight text-left">
                                      "A short custom status message on the user's profile will appear here..."
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2.5 w-full pb-1">
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Suspend</span>
                                    <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                            style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }}
                                            onClick={(e) => { e.stopPropagation(); console.log('Suspend user'); }}>
                                      <div className="w-2 h-2 rounded-full bg-gray-600 absolute top-[2px] left-[2px]" />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Remove</span>
                                    <button className="w-7 h-3.5 rounded-full bg-black/50 border relative transition-colors"
                                            style={{ borderColor: `rgba(${wc.rgb}, 0.4)` }}
                                            onClick={(e) => { e.stopPropagation(); console.log('Remove user'); }}>
                                      <div className="w-2 h-2 rounded-full bg-gray-800 absolute top-[2px] left-[2px]" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="mb-2">
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <h4 className="text-white font-mono text-base font-bold truncate leading-tight">{u.name}</h4>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-[1px]">
                                      <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : u.status === 'idle' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                                      <span className="text-gray-300 font-mono text-[10px] uppercase tracking-wider">{u.status}</span>
                                    </div>
                                  </div>
                                  <div className="text-gray-500 font-mono text-[10px] truncate">
                                    {u.status === 'active' ? 'Logged in since: Today, 8:42 AM' : 'Last seen at: Yesterday, 4:15 PM'}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 pt-3 border-t" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
                                  <div className="relative group w-full">
                                    <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors text-gray-300 group-hover:text-white">
                                       <MessageSquare size={13} className="flex-shrink-0" />
                                       <span className="text-[11px] font-mono truncate">Message</span>
                                       <ChevronDownIcon size={10} className="ml-auto -rotate-90 opacity-50" />
                                    </button>
                                    <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-[110]">
                                      <div className="flex flex-col gap-1 p-2 rounded-xl bg-black/95 backdrop-blur-2xl border shadow-2xl w-32 animate-in fade-in slide-in-from-left-2 duration-200"
                                           style={{ 
                                             borderColor: `rgba(${wc.rgb}, 0.5)`,
                                             boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px rgba(${wc.rgb}, 0.2)`,
                                             filter: `drop-shadow(0 0 10px rgba(${wc.rgb}, 0.15))`
                                           }}>
                                        <button title="Internal system message" className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); console.log('Chat clicked'); setActiveUserDropdown(null); }}>
                                          <MessagesSquare size={12} className="flex-shrink-0" /><span>Chat</span>
                                        </button>
                                        <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setExternalModalUser({ id: u.id, name: u.name }); 
                                          setActiveUserDropdown(null); 
                                          setShowAllUsersModal(false); 
                                        }}>
                                          <PopoutIcon size={12} className="flex-shrink-0" /><span>External</span>
                                        </button>
                                        <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors" onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setCallModalUser({ id: u.id, name: u.name }); 
                                          setActiveUserDropdown(null); 
                                          setShowAllUsersModal(false); 
                                        }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                          <span>Call</span>
                                        </button>
                                        <button className="w-full flex items-center justify-start gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-colors group/record" onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setRecordModalUser({ id: u.id, name: u.name }); 
                                          setActiveUserDropdown(null); 
                                          setShowAllUsersModal(false); 
                                        }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-hover/record:text-red-500 transition-colors"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>
                                          <span>Record</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <CheckSquare size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Send Task</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <Mail size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Send Email</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <Activity size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Activity</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <PlusIcon size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Workspace</span>
                                  </button>
                                  <button className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                                     <Megaphone size={13} className="flex-shrink-0" />
                                     <span className="text-[11px] font-mono truncate">Comms</span>
                                  </button>

                                  {(isPlatformOwner() || isOrganizationAdmin()) && (
                                    <button onClick={() => console.log('Open User Dashboard Overlay')}
                                            className="w-full flex items-center justify-start gap-3 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white border border-white/5">
                                       <LayoutDashboard size={13} className="flex-shrink-0" />
                                       <span className="text-[11px] font-mono truncate font-bold">Dashboard</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500 font-mono text-sm">No users match your search.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    {showReportsOverlay && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowReportsOverlay(false)} />
        
        <div className="relative bg-black rounded-xl w-full max-w-6xl mx-4 h-[75vh] min-h-[500px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ border: `1px solid rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 60px rgba(${wc.rgb}, 0.15)` }}>
          
          <div className="p-5 border-b flex-shrink-0" style={{ borderColor: `rgba(${wc.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wc.rgb}, 0.08), transparent)` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `rgba(${wc.rgb}, 0.15)`, border: `1px solid rgba(${wc.rgb}, 0.3)` }}>
                  <ChartNetwork size={20} style={{ color: wc.primary }} />
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold" style={{ color: wc.primary }}>{appName} Reports</h3>
                  <p className="text-xs text-gray-500 font-mono">Data visualization & insights</p>
                </div>
              </div>
              <button onClick={() => setShowReportsOverlay(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <CloseIcon size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-black/40">
            <div className="h-full border-2 border-dashed rounded-xl flex items-center justify-center" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
              <div className="text-center space-y-4">
                <ChartNetwork size={48} className="mx-auto" style={{ color: `rgba(${wc.rgb}, 0.4)` }} />
                <p className="text-slate-400 font-mono text-sm">Reports dashboard workspace ready.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    )}
    </div>

    {/* ⚡ ENLARGED QR/BARCODE MODAL */}
    {enlargedCode && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setEnlargedCode(null)}>
        <div className="relative flex flex-col items-center p-6 sm:p-8 bg-black/80 rounded-2xl border animate-in zoom-in-95 duration-200" 
             style={{ borderColor: `rgba(${wc.rgb}, 0.5)`, boxShadow: `0 0 60px rgba(${wc.rgb}, 0.2)` }}
             onClick={(e) => e.stopPropagation()}>
          
          <div className="w-full flex justify-between items-center mb-6">
            <h3 className="text-xl font-mono font-bold tracking-wider" style={{ color: wc.primary }}>{enlargedCode.title}</h3>
            <button onClick={() => setEnlargedCode(null)} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors bg-white/5 hover:bg-white/10">
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="p-6 rounded-xl flex items-center justify-center border" 
               style={{ 
                 background: `linear-gradient(135deg, rgba(${wc.rgb}, 0.1), rgba(0,0,0,0.8))`,
                 borderColor: `rgba(${wc.rgb}, 0.2)`,
                 boxShadow: `inset 0 0 30px rgba(${wc.rgb}, 0.05)`
               }}>
            <img 
              src={enlargedCode.url} 
              alt={enlargedCode.title} 
              className="max-w-[36vw] max-h-[22vh] sm:max-h-[27vh] object-contain"
              style={{ filter: 'brightness(1.5)' }}
            />
          </div>
          
          <p className="mt-6 text-sm font-mono text-gray-500 text-center uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-lg border border-white/5">
            ID: <span className="text-white">{selectedRecord?._item_uid || selectedRecord?.id}</span>
          </p>
        </div>
      </div>
    )}

    {/* ⚡ CONTEXTUAL TASKS PANEL */}
    <LeftSlidePanel 
      activePanel={activeLeftPanel}
      onClose={() => setActiveLeftPanel(null)}
      onNavigateToFullView={(view) => console.log('Navigate to full view:', view)}
      contextWorkspaceId={workspaceId}
      contextAppId={miniAppId || undefined}
      contextAppName={appName}
      contextRecordId={selectedRecord?._item_uid || selectedRecord?.id || undefined}
      contextRecordTitle={selectedRecord?.name || selectedRecord?.Name || selectedRecord?.title || selectedRecord?.Title || undefined}
    />

  </>
  );
};

export default MiniAppView;