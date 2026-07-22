import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  HistoryIcon, RefreshIcon, CloseIcon, CheckIcon, PlusIcon, TrashIcon,
  AlertTriangleIcon, ClockIcon, EyeIcon, UserIcon, DatabaseIcon,
  DownloadIcon, FilterIcon, ChevronDownIcon, ChevronRightIcon, InfoIcon,
} from '@/components/icons/Icons';

// ============================================
// TYPES
// ============================================
interface VersionEntry {
  id: string;
  mini_app_id: string;
  version_number: number;
  schema_definition: any;
  app_settings: any;
  item_id_settings: any;
  changed_by: string | null;
  changed_by_name: string;
  changed_by_email: string;
  changed_by_role: string;
  changed_at: string;
  change_summary: string;
}

interface FieldDiff {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  status: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  details?: string[];
}

interface VersionStats {
  count: number;
  latest_version: number | null;
  latest_changed_at: string | null;
  oldest_changed_at: string | null;
  estimated_storage_bytes: number;
}

interface MiniAppVersionHistoryProps {
  miniAppId?: string;
  currentSchema: any;
  wsColor: { primary: string; rgb: string; dark: string; tw: string; colorName: string };
  onRestore: (schema: any, appSettings: any, itemIdSettings: any) => void;
}

// ============================================
// HELPERS
// ============================================
const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const formatRelativeTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getUserInitials = (name: string): string => {
  if (!name || name === 'System') return 'SY';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getRoleColor = (role: string): string => {
  switch (role) {
    case 'platform_owner_admin': return '#f59e0b';
    case 'organization_admin': return '#8b5cf6';
    case 'organization_manager': return '#3b82f6';
    case 'organization_user': return '#22c55e';
    case 'system': return '#64748b';
    default: return '#94a3b8';
  }
};

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'platform_owner_admin': return 'Owner';
    case 'organization_admin': return 'Admin';
    case 'organization_manager': return 'Manager';
    case 'organization_user': return 'User';
    case 'system': return 'System';
    default: return role || 'Unknown';
  }
};

// ============================================
// DIFF COMPUTATION
// ============================================
function computeDetailedDiff(oldSchema: any, newSchema: any): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const oldFields = (oldSchema?.fields || []) as any[];
  const newFields = (newSchema?.fields || []) as any[];
  
  const oldMap = new Map(oldFields.map((f: any) => [f.id, f]));
  const newMap = new Map(newFields.map((f: any) => [f.id, f]));

  // Added fields
  for (const [id, field] of newMap) {
    if (!oldMap.has(id)) {
      diffs.push({
        fieldId: id,
        fieldName: (field as any).name || 'Unnamed',
        fieldType: (field as any).type || 'unknown',
        status: 'added',
        newValue: field,
        details: [`New ${((field as any).type || 'field').replace(/_/g, ' ')} added${(field as any).required ? ' (required)' : ''}`],
      });
    }
  }

  // Removed fields
  for (const [id, field] of oldMap) {
    if (!newMap.has(id)) {
      diffs.push({
        fieldId: id,
        fieldName: (field as any).name || 'Unnamed',
        fieldType: (field as any).type || 'unknown',
        status: 'removed',
        oldValue: field,
        details: [`${((field as any).type || 'field').replace(/_/g, ' ')} removed`],
      });
    }
  }

  // Modified fields
  for (const [id, newField] of newMap) {
    const oldField = oldMap.get(id);
    if (oldField) {
      const oldStr = JSON.stringify(oldField);
      const newStr = JSON.stringify(newField);
      if (oldStr !== newStr) {
        const details: string[] = [];
        const of = oldField as any;
        const nf = newField as any;
        
        if (of.name !== nf.name) details.push(`Renamed: "${of.name}" → "${nf.name}"`);
        if (of.type !== nf.type) details.push(`Type changed: ${of.type?.replace(/_/g, ' ')} → ${nf.type?.replace(/_/g, ' ')}`);
        if (of.required !== nf.required) details.push(nf.required ? 'Made required' : 'Made optional');
        if (of.column !== nf.column) details.push(`Moved to column ${nf.column}`);
        if (of.row !== nf.row) details.push(`Moved to row ${nf.row}`);
        if (of.columnSpan !== nf.columnSpan) details.push(`Column span: ${of.columnSpan || 1} → ${nf.columnSpan || 1}`);
        
        // Settings changes
        if (JSON.stringify(of.settings) !== JSON.stringify(nf.settings)) {
          const os = of.settings || {};
          const ns = nf.settings || {};
          if (os.multiline !== ns.multiline) details.push(ns.multiline ? 'Enabled multiline' : 'Disabled multiline');
          if (os.allowMultiple !== ns.allowMultiple) details.push(ns.allowMultiple ? 'Enabled multiple values' : 'Disabled multiple values');
          if (os.decimals !== ns.decimals) details.push(`Decimals: ${os.decimals} → ${ns.decimals}`);
          if (os.calculationPrompt !== ns.calculationPrompt) details.push('Calculation prompt updated');
          if (os.displaySize !== ns.displaySize) details.push(`Display size: ${os.displaySize} → ${ns.displaySize}`);
          if (JSON.stringify(os.categoryOptions) !== JSON.stringify(ns.categoryOptions)) {
            const oldCount = (os.categoryOptions || []).length;
            const newCount = (ns.categoryOptions || []).length;
            if (oldCount !== newCount) details.push(`Category options: ${oldCount} → ${newCount}`);
            else details.push('Category options modified');
          }
          if (JSON.stringify(os.connectedMiniAppIds) !== JSON.stringify(ns.connectedMiniAppIds)) details.push('Connected MiniApps changed');
          if (JSON.stringify(os.durationUnits) !== JSON.stringify(ns.durationUnits)) details.push('Duration units changed');
          if (os.hiddenWhenEmpty !== ns.hiddenWhenEmpty) details.push(ns.hiddenWhenEmpty ? 'Set hidden when empty' : 'Unset hidden when empty');
          if (os.hiddenWhenFull !== ns.hiddenWhenFull) details.push(ns.hiddenWhenFull ? 'Set hidden when full' : 'Unset hidden when full');
          if (os.alwaysHidden !== ns.alwaysHidden) details.push(ns.alwaysHidden ? 'Set always hidden' : 'Unset always hidden');
          if (os.separatorColor !== ns.separatorColor) details.push('Separator color changed');
          if (os.separatorStyle !== ns.separatorStyle) details.push(`Separator style: ${ns.separatorStyle}`);
          
          // If no specific settings detected, add generic
          if (details.length === 0 || (details.length === 0 && JSON.stringify(os) !== JSON.stringify(ns))) {
            details.push('Settings modified');
          }
        }
        
        if (details.length === 0) details.push('Configuration changed');

        diffs.push({
          fieldId: id,
          fieldName: nf.name || of.name || 'Unnamed',
          fieldType: nf.type || 'unknown',
          status: 'modified',
          oldValue: oldField,
          newValue: newField,
          details,
        });
      }
    }
  }

  return diffs;
}

function computeSettingsDiff(oldSettings: any, newSettings: any): string[] {
  const changes: string[] = [];
  const os = oldSettings || {};
  const ns = newSettings || {};
  
  if (JSON.stringify(os.layouts) !== JSON.stringify(ns.layouts)) {
    changes.push(`Layouts: [${(os.layouts || []).join(', ')}] → [${(ns.layouts || []).join(', ')}]`);
  }
  if (os.defaultLayout !== ns.defaultLayout) changes.push(`Default layout: ${os.defaultLayout} → ${ns.defaultLayout}`);
  if (os.recordsPerPage !== ns.recordsPerPage) changes.push(`Records per page: ${os.recordsPerPage} → ${ns.recordsPerPage}`);
  if (os.showCreatedBy !== ns.showCreatedBy) changes.push(ns.showCreatedBy ? 'Enabled "Show Created By"' : 'Disabled "Show Created By"');
  if (os.showTimestamps !== ns.showTimestamps) changes.push(ns.showTimestamps ? 'Enabled timestamps' : 'Disabled timestamps');
  if (os.allowExport !== ns.allowExport) changes.push(ns.allowExport ? 'Enabled export' : 'Disabled export');
  if (os.allowImport !== ns.allowImport) changes.push(ns.allowImport ? 'Enabled import' : 'Disabled import');
  if (os.enableComments !== ns.enableComments) changes.push(ns.enableComments ? 'Enabled comments' : 'Disabled comments');
  if (os.enableAttachments !== ns.enableAttachments) changes.push(ns.enableAttachments ? 'Enabled attachments' : 'Disabled attachments');
  
  return changes;
}

function computeItemIdDiff(oldSettings: any, newSettings: any): string[] {
  const changes: string[] = [];
  const os = oldSettings || {};
  const ns = newSettings || {};
  
  if (os.prefix !== ns.prefix) changes.push(`Prefix: "${os.prefix}" → "${ns.prefix}"`);
  if (os.minDigits !== ns.minDigits) changes.push(`Min digits: ${os.minDigits} → ${ns.minDigits}`);
  if (os.barcodeSymbology !== ns.barcodeSymbology) changes.push(`Barcode: ${os.barcodeSymbology} → ${ns.barcodeSymbology}`);
  if (os.showItemId !== ns.showItemId) changes.push(ns.showItemId ? 'Show Item ID enabled' : 'Show Item ID disabled');
  if (os.showQrCode !== ns.showQrCode) changes.push(ns.showQrCode ? 'QR Code enabled' : 'QR Code disabled');
  if (os.showBarcode !== ns.showBarcode) changes.push(ns.showBarcode ? 'Barcode enabled' : 'Barcode disabled');
  
  return changes;
}

// ============================================
// COMPONENT
// ============================================
const MiniAppVersionHistory: React.FC<MiniAppVersionHistoryProps> = ({ 
  miniAppId, currentSchema, wsColor, onRestore 
}) => {
  const ac = wsColor;
  
  // State
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [stats, setStats] = useState<VersionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);
  const [settingsDiffs, setSettingsDiffs] = useState<string[]>([]);
  const [itemIdDiffs, setItemIdDiffs] = useState<string[]>([]);
  
  // Cleanup state
  const [showCleanupPanel, setShowCleanupPanel] = useState(false);
  const [retentionCount, setRetentionCount] = useState(50);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; kept: number } | null>(null);

  // Compare mode: compare two versions side by side
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);

  // ============================================
  // DATA LOADING
  // ============================================
  const loadVersions = useCallback(async () => {
    if (!miniAppId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('db-proxy', {
        body: { action: 'get-versions', mini_app_id: miniAppId, limit: 100 },
      });
      
      if (!error && data?.data?.versions) {
        setVersions(data.data.versions);
      } else if (!error && data?.success && data?.data) {
        // Handle alternate response shape
        const versionData = Array.isArray(data.data) ? data.data : (data.data.versions || []);
        setVersions(versionData);
      } else {
        console.warn('[VersionHistory] Failed to load versions:', error || data);
        setVersions([]);
      }
    } catch (err) {
      console.error('Error loading versions:', err);
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  }, [miniAppId]);

  const loadStats = useCallback(async () => {
    if (!miniAppId) return;
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.functions.invoke('db-proxy', {
        body: { action: 'get-version-stats', mini_app_id: miniAppId },
      });
      
      if (!error && data?.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [miniAppId]);

  useEffect(() => {
    if (miniAppId) {
      loadVersions();
      loadStats();
    }
  }, [miniAppId, loadVersions, loadStats]);

  // ============================================
  // VERSION SELECTION & DIFF
  // ============================================
  const handleSelectVersion = (version: VersionEntry) => {
    setSelectedVersion(version);
    setCompareVersionId(null);
    
    const schema = typeof version.schema_definition === 'string' 
      ? JSON.parse(version.schema_definition) 
      : version.schema_definition;
    
    // Compute field diffs between this version and current schema
    const fieldDiffs = computeDetailedDiff(schema, currentSchema);
    setDiffs(fieldDiffs);
    
    // Compute app settings diffs
    const appSettingsChanges = computeSettingsDiff(version.app_settings, currentSchema?.appSettings);
    setSettingsDiffs(appSettingsChanges);
    
    // Compute item ID diffs
    const itemIdChanges = computeItemIdDiff(version.item_id_settings, currentSchema?.itemIdSettings);
    setItemIdDiffs(itemIdChanges);
  };

  const handleToggleExpand = (versionId: string) => {
    setExpandedVersionId(prev => prev === versionId ? null : versionId);
  };

  // ============================================
  // RESTORE
  // ============================================
  const handleRestore = async () => {
    if (!selectedVersion || !miniAppId) return;
    setIsRestoring(true);
    
    try {
      // Call db-proxy restore-version action (backs up current state automatically)
      const { data, error } = await supabase.functions.invoke('db-proxy', {
        body: {
          action: 'restore-version',
          version_id: selectedVersion.id,
          restored_by: null, // Will be set by the edge function if auth is available
        },
      });

      if (error) {
        console.error('Restore error:', error);
        alert('Failed to restore version. Please try again.');
        return;
      }

      // Apply to the builder UI
      const schema = typeof selectedVersion.schema_definition === 'string'
        ? JSON.parse(selectedVersion.schema_definition)
        : selectedVersion.schema_definition;
      const appSettings = typeof selectedVersion.app_settings === 'string'
        ? JSON.parse(selectedVersion.app_settings)
        : selectedVersion.app_settings || {};
      const itemIdSettings = typeof selectedVersion.item_id_settings === 'string'
        ? JSON.parse(selectedVersion.item_id_settings)
        : selectedVersion.item_id_settings || {};
      
      onRestore(schema, appSettings, itemIdSettings);
      setShowRestoreConfirm(false);
      setSelectedVersion(null);
      
      // Reload versions to show the new backup version
      setTimeout(() => {
        loadVersions();
        loadStats();
      }, 500);
    } catch (err) {
      console.error('Restore failed:', err);
      alert('Restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  // ============================================
  // CLEANUP
  // ============================================
  const versionsToDelete = stats ? Math.max(0, stats.count - retentionCount) : 0;

  const handleCleanup = async () => {
    if (!miniAppId) return;
    setIsCleaning(true);
    setCleanupResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('db-proxy', {
        body: {
          action: 'cleanup-versions',
          mini_app_id: miniAppId,
          keep_count: retentionCount,
        },
      });

      if (!error && data?.data) {
        const result = data.data;
        setCleanupResult({
          deleted: result.deleted_count || 0,
          kept: result.kept_count || retentionCount,
        });
        
        // Reload data
        await loadVersions();
        await loadStats();
      } else {
        console.error('Cleanup error:', error || data);
        alert('Cleanup failed. Please try again.');
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
      alert('Cleanup failed. Please try again.');
    } finally {
      setIsCleaning(false);
      setShowCleanupConfirm(false);
    }
  };

  // ============================================
  // STATUS HELPERS
  // ============================================
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'added': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#4ade80', label: 'Added' };
      case 'removed': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171', label: 'Removed' };
      case 'modified': return { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', label: 'Modified' };
      default: return { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8', label: 'Unknown' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return PlusIcon;
      case 'removed': return TrashIcon;
      case 'modified': return RefreshIcon;
      default: return EyeIcon;
    }
  };

  // ============================================
  // RENDER: No MiniApp ID
  // ============================================
  if (!miniAppId) {
    return (
      <div className="text-center py-8">
        <HistoryIcon size={32} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-mono">Version history is available after the first save.</p>
        <p className="text-slate-500 text-xs font-mono mt-1">Save this MiniApp to start tracking changes.</p>
      </div>
    );
  }

  // ============================================
  // RENDER: Main Component
  // ============================================
  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* STATS HEADER */}
      {/* ============================================ */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Version Count */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `rgba(${ac.rgb}, 0.08)`, border: `1px solid rgba(${ac.rgb}, 0.2)` }}>
            <HistoryIcon size={14} style={{ color: ac.primary }} />
            <div>
              <p className="text-xs font-mono font-bold" style={{ color: ac.primary }}>
                {isLoadingStats ? '...' : (stats?.count || versions.length)}
              </p>
              <p className="text-[9px] text-slate-500 font-mono">versions</p>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <DatabaseIcon size={14} className="text-violet-400" />
            <div>
              <p className="text-xs font-mono font-bold text-violet-400">
                {isLoadingStats ? '...' : formatBytes(stats?.estimated_storage_bytes || 0)}
              </p>
              <p className="text-[9px] text-slate-500 font-mono">storage</p>
            </div>
          </div>

          {/* Latest Version */}
          {stats?.latest_changed_at && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <ClockIcon size={14} className="text-green-400" />
              <div>
                <p className="text-xs font-mono font-bold text-green-400">
                  {formatRelativeTime(stats.latest_changed_at)}
                </p>
                <p className="text-[9px] text-slate-500 font-mono">last change</p>
              </div>
            </div>
          )}

          {/* History Span */}
          {stats?.oldest_changed_at && stats?.latest_changed_at && stats.count > 1 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <InfoIcon size={14} className="text-amber-400" />
              <div>
                <p className="text-xs font-mono font-bold text-amber-400">
                  v{stats.latest_version || '?'}
                </p>
                <p className="text-[9px] text-slate-500 font-mono">latest ver.</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowCleanupPanel(!showCleanupPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:bg-red-500/10"
            style={{ 
              borderColor: showCleanupPanel ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)', 
              color: showCleanupPanel ? '#f87171' : '#94a3b8' 
            }}
          >
            <TrashIcon size={12} />
            Cleanup
          </button>
          <button
            onClick={() => { loadVersions(); loadStats(); }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all"
            style={{ borderColor: `rgba(${ac.rgb}, 0.2)`, color: ac.primary }}
          >
            <RefreshIcon size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* CLEANUP PANEL */}
      {/* ============================================ */}
      {showCleanupPanel && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrashIcon size={16} className="text-red-400" />
                <h4 className="text-sm font-mono font-semibold text-white">Cleanup Old Versions</h4>
              </div>
              <p className="text-xs text-slate-400 font-mono mb-3">
                Remove old version snapshots to free up storage. The most recent versions will be retained.
              </p>

              <div className="flex items-center gap-4 mb-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider">Retain Latest</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={retentionCount}
                      onChange={(e) => setRetentionCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 50)))}
                      className="w-20 bg-black/40 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                    />
                    <span className="text-xs text-slate-500 font-mono">versions</span>
                  </div>
                </div>

                {/* Quick presets */}
                <div>
                  <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider">Presets</label>
                  <div className="flex gap-1">
                    {[10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        onClick={() => setRetentionCount(n)}
                        className="px-2 py-1 rounded text-[10px] font-mono transition-all"
                        style={{
                          background: retentionCount === n ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                          border: retentionCount === n ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          color: retentionCount === n ? '#f87171' : '#94a3b8',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Impact preview */}
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider">Impact</label>
                  <div className="flex items-center gap-2">
                    {versionsToDelete > 0 ? (
                      <span className="text-xs font-mono text-red-400 font-bold">
                        {versionsToDelete} version{versionsToDelete !== 1 ? 's' : ''} will be deleted
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-green-400">
                        No versions to delete
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cleanup result */}
              {cleanupResult && (
                <div className="flex items-center gap-2 p-2 rounded-lg mb-3" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <CheckIcon size={14} className="text-green-400" />
                  <span className="text-xs font-mono text-green-400">
                    Cleanup complete: {cleanupResult.deleted} version{cleanupResult.deleted !== 1 ? 's' : ''} deleted, {cleanupResult.kept} retained.
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  if (versionsToDelete > 0) {
                    setShowCleanupConfirm(true);
                  }
                }}
                disabled={versionsToDelete === 0 || isCleaning}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: versionsToDelete > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${versionsToDelete > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: versionsToDelete > 0 ? '#f87171' : '#64748b',
                }}
              >
                {isCleaning ? (
                  <>
                    <div className="w-3 h-3 border-2 border-t-transparent border-red-400 rounded-full animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <TrashIcon size={12} />
                    Delete {versionsToDelete} Old Version{versionsToDelete !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => { setShowCleanupPanel(false); setCleanupResult(null); }}
              className="p-1 text-slate-500 hover:text-white transition-colors"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* VERSION LIST + DIFF PANEL */}
      {/* ============================================ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${ac.rgb}, 0.2)`, borderTopColor: ac.primary }} />
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <HistoryIcon size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-mono">No versions recorded yet.</p>
          <p className="text-slate-500 text-xs font-mono mt-1">Each save creates a new version snapshot.</p>
        </div>
      ) : (
        <div className="flex gap-4" style={{ minHeight: '350px' }}>
          {/* ---- VERSION TIMELINE ---- */}
          <div className="w-1/2 space-y-1.5 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {versions.map((version, idx) => {
              const isSelected = selectedVersion?.id === version.id;
              const isLatest = idx === 0;
              const isExpanded = expandedVersionId === version.id;
              const schema = typeof version.schema_definition === 'string' ? JSON.parse(version.schema_definition) : version.schema_definition;
              const fieldCount = (schema?.fields || []).length;
              const roleColor = getRoleColor(version.changed_by_role);
              const isAutoBackup = version.change_summary?.startsWith('Auto-backup');
              const isAutoVersioned = version.change_summary?.startsWith('Auto-versioned');

              return (
                <div key={version.id} className="relative">
                  {/* Timeline connector line */}
                  {idx < versions.length - 1 && (
                    <div 
                      className="absolute left-[19px] top-[44px] w-[2px] h-[calc(100%-20px)]"
                      style={{ background: `rgba(${ac.rgb}, 0.1)` }}
                    />
                  )}

                  <button
                    onClick={() => handleSelectVersion(version)}
                    className="w-full text-left p-3 rounded-lg transition-all duration-200 relative"
                    style={{
                      background: isSelected ? `rgba(${ac.rgb}, 0.1)` : 'rgba(255,255,255,0.02)',
                      border: isSelected ? `1px solid rgba(${ac.rgb}, 0.3)` : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Top row: version badge + timestamp */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {/* Version circle */}
                        <div 
                          className="w-[38px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                          style={{ 
                            background: isSelected ? `rgba(${ac.rgb}, 0.2)` : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${isSelected ? `rgba(${ac.rgb}, 0.4)` : 'rgba(255,255,255,0.1)'}`,
                            color: isSelected ? ac.primary : '#94a3b8',
                          }}
                        >
                          v{version.version_number}
                        </div>

                        {isLatest && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium" style={{ background: `rgba(${ac.rgb}, 0.15)`, color: ac.primary }}>
                            Latest
                          </span>
                        )}
                        {isAutoBackup && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Backup
                          </span>
                        )}
                        {isAutoVersioned && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Auto
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        {formatRelativeTime(version.changed_at)}
                      </span>
                    </div>

                    {/* User attribution row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                        style={{ 
                          background: `${roleColor}20`,
                          border: `1px solid ${roleColor}40`,
                          color: roleColor,
                        }}
                      >
                        {getUserInitials(version.changed_by_name)}
                      </div>
                      <span className="text-[11px] text-slate-300 font-mono truncate">
                        {version.changed_by_name}
                      </span>
                      <span 
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                        style={{ background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}25` }}
                      >
                        {getRoleLabel(version.changed_by_role)}
                      </span>
                    </div>

                    {/* Change summary */}
                    {version.change_summary && (
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-1 line-clamp-2">
                        {version.change_summary}
                      </p>
                    )}

                    {/* Bottom row: field count + expand toggle */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                          <ClockIcon size={10} />
                          {formatDate(version.changed_at)}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleExpand(version.id); }}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                      >
                        {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                      </button>
                    </div>

                    {/* Expanded: show full details */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[10px] text-slate-500 font-mono">
                          <span className="text-slate-600">Version ID:</span> {version.id.substring(0, 8)}...
                        </p>
                        {version.changed_by_email && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            <span className="text-slate-600">Email:</span> {version.changed_by_email}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono">
                          <span className="text-slate-600">Schema size:</span> {formatBytes(JSON.stringify(version.schema_definition).length)}
                        </p>
                        {version.app_settings && Object.keys(version.app_settings).length > 0 && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            <span className="text-slate-600">Layouts:</span> {(version.app_settings?.layouts || []).join(', ') || 'N/A'}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ---- DIFF / DETAIL VIEW ---- */}
          <div className="w-1/2 max-h-[420px] overflow-y-auto pr-1">
            {selectedVersion ? (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-semibold text-white">
                    Changes since v{selectedVersion.version_number}
                  </h4>
                  <button
                    onClick={() => setShowRestoreConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:bg-amber-500/10"
                    style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}
                  >
                    <HistoryIcon size={12} />
                    Revert to This Version
                  </button>
                </div>

                {/* Summary stats */}
                <div className="flex items-center gap-2 flex-wrap">
                  {diffs.filter(d => d.status === 'added').length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                      +{diffs.filter(d => d.status === 'added').length} added
                    </span>
                  )}
                  {diffs.filter(d => d.status === 'removed').length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                      -{diffs.filter(d => d.status === 'removed').length} removed
                    </span>
                  )}
                  {diffs.filter(d => d.status === 'modified').length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
                      ~{diffs.filter(d => d.status === 'modified').length} modified
                    </span>
                  )}
                  {settingsDiffs.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                      {settingsDiffs.length} setting{settingsDiffs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {itemIdDiffs.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
                      {itemIdDiffs.length} ID setting{itemIdDiffs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* No changes */}
                {diffs.length === 0 && settingsDiffs.length === 0 && itemIdDiffs.length === 0 ? (
                  <div className="p-4 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <CheckIcon size={20} className="text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-mono">No differences from current version.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Field diffs */}
                    {diffs.map((diff) => {
                      const style = getStatusStyle(diff.status);
                      const Icon = getStatusIcon(diff.status);
                      return (
                        <div 
                          key={diff.fieldId} 
                          className="p-3 rounded-lg"
                          style={{ background: style.bg, border: `1px solid ${style.border}` }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={12} style={{ color: style.text }} />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: style.text }}>
                              {style.label}
                            </span>
                            <span className="text-xs text-white font-mono font-bold">{diff.fieldName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({diff.fieldType.replace(/_/g, ' ')})</span>
                          </div>
                          {diff.details && diff.details.length > 0 && (
                            <div className="ml-5 space-y-0.5">
                              {diff.details.map((detail, i) => (
                                <p key={i} className="text-[10px] font-mono text-slate-400">
                                  <span className="text-slate-600 mr-1">-</span>
                                  {detail}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* App settings diffs */}
                    {settingsDiffs.length > 0 && (
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <FilterIcon size={12} className="text-violet-400" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-400">
                            App Settings
                          </span>
                        </div>
                        <div className="ml-5 space-y-0.5">
                          {settingsDiffs.map((change, i) => (
                            <p key={i} className="text-[10px] font-mono text-slate-400">
                              <span className="text-slate-600 mr-1">-</span>
                              {change}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Item ID diffs */}
                    {itemIdDiffs.length > 0 && (
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <InfoIcon size={12} className="text-amber-400" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                            Item ID Settings
                          </span>
                        </div>
                        <div className="ml-5 space-y-0.5">
                          {itemIdDiffs.map((change, i) => (
                            <p key={i} className="text-[10px] font-mono text-slate-400">
                              <span className="text-slate-600 mr-1">-</span>
                              {change}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full py-12">
                <div className="text-center">
                  <EyeIcon size={24} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-mono">Select a version to view changes</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-1">Click any version on the left to compare</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* RESTORE CONFIRMATION DIALOG */}
      {/* ============================================ */}
      {showRestoreConfirm && selectedVersion && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRestoreConfirm(false)} />
          <div className="relative bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4" style={{ boxShadow: `0 0 40px rgba(245,158,11,0.1)` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangleIcon size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold font-mono">Revert to Version {selectedVersion.version_number}?</h3>
                <p className="text-xs text-slate-400 font-mono">This will replace the current schema</p>
              </div>
            </div>

            {/* Version info */}
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ 
                    background: `${getRoleColor(selectedVersion.changed_by_role)}20`,
                    border: `1px solid ${getRoleColor(selectedVersion.changed_by_role)}40`,
                    color: getRoleColor(selectedVersion.changed_by_role),
                  }}
                >
                  {getUserInitials(selectedVersion.changed_by_name)}
                </div>
                <span className="text-xs text-slate-300 font-mono">{selectedVersion.changed_by_name}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatDate(selectedVersion.changed_at)}
                </span>
              </div>
              {selectedVersion.change_summary && (
                <p className="text-xs text-slate-400 font-mono mt-1">{selectedVersion.change_summary}</p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 mb-4">
              <p className="text-sm text-slate-300 font-mono">
                Reverting will replace the current schema with version <span className="font-bold text-amber-400">v{selectedVersion.version_number}</span>. 
                The current state will be automatically saved as a backup version before reverting.
              </p>
            </div>

            {/* Impact summary */}
            {(diffs.length > 0 || settingsDiffs.length > 0 || itemIdDiffs.length > 0) && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] mb-4">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Revert Impact</p>
                <div className="flex flex-wrap gap-2">
                  {diffs.filter(d => d.status === 'added').length > 0 && (
                    <span className="text-[10px] font-mono text-red-400">
                      {diffs.filter(d => d.status === 'added').length} field{diffs.filter(d => d.status === 'added').length !== 1 ? 's' : ''} will be removed
                    </span>
                  )}
                  {diffs.filter(d => d.status === 'removed').length > 0 && (
                    <span className="text-[10px] font-mono text-green-400">
                      {diffs.filter(d => d.status === 'removed').length} field{diffs.filter(d => d.status === 'removed').length !== 1 ? 's' : ''} will be restored
                    </span>
                  )}
                  {diffs.filter(d => d.status === 'modified').length > 0 && (
                    <span className="text-[10px] font-mono text-amber-400">
                      {diffs.filter(d => d.status === 'modified').length} field{diffs.filter(d => d.status === 'modified').length !== 1 ? 's' : ''} will be reverted
                    </span>
                  )}
                  {settingsDiffs.length > 0 && (
                    <span className="text-[10px] font-mono text-violet-400">
                      {settingsDiffs.length} app setting{settingsDiffs.length !== 1 ? 's' : ''} will revert
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                disabled={isRestoring}
                className="px-4 py-2 border border-white/10 text-slate-300 rounded-lg hover:bg-white/5 transition-all text-sm font-mono disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="px-5 py-2 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-lg font-medium transition-all text-sm font-mono hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <div className="w-3 h-3 border-2 border-t-transparent border-amber-400 rounded-full animate-spin" />
                    Reverting...
                  </>
                ) : (
                  <>
                    <HistoryIcon size={14} />
                    Revert to v{selectedVersion.version_number}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CLEANUP CONFIRMATION DIALOG */}
      {/* ============================================ */}
      {showCleanupConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCleanupConfirm(false)} />
          <div className="relative bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4" style={{ boxShadow: '0 0 40px rgba(239,68,68,0.1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <TrashIcon size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold font-mono">Confirm Cleanup</h3>
                <p className="text-xs text-slate-400 font-mono">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 mb-4">
              <p className="text-sm text-slate-300 font-mono">
                This will permanently delete <span className="font-bold text-red-400">{versionsToDelete} version{versionsToDelete !== 1 ? 's' : ''}</span> and 
                retain only the <span className="font-bold text-green-400">{retentionCount} most recent</span> versions.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] mb-4">
              <p className="text-xs text-slate-500 font-mono">
                Deleted versions cannot be recovered. The most recent {retentionCount} versions (including the latest) will be preserved.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCleanupConfirm(false)}
                disabled={isCleaning}
                className="px-4 py-2 border border-white/10 text-slate-300 rounded-lg hover:bg-white/5 transition-all text-sm font-mono disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCleanup}
                disabled={isCleaning}
                className="px-5 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-medium transition-all text-sm font-mono hover:bg-red-500/30 disabled:opacity-50 flex items-center gap-2"
              >
                {isCleaning ? (
                  <>
                    <div className="w-3 h-3 border-2 border-t-transparent border-red-400 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon size={14} />
                    Delete {versionsToDelete} Version{versionsToDelete !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniAppVersionHistory;
