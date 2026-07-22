import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Search, CheckSquare, Square, Maximize2, Minimize2, GitBranch, X, Plus } from 'lucide-react';

export type ConnectionLayoutMode = 'dropdown' | 'bar' | 'table' | 'window';

interface ConnectionFieldRendererProps {
  fieldDef: any;                       // The Connection building block from the schema
  value: any;                          // Selected item UIDs (string or array)
  onChange: (val: any) => void;        // Single / multi value change
  organizationId: string;
  workspaceColor: { primary: string; rgb: string };
  onMultiSelectChange?: (selectedRecordIds: string[]) => void; // For 'window' mode → feeds the frozen footer
  readOnly?: boolean;
}

interface ConnectedApp {
  id: string;
  name: string;
  slug: string;
  schema_definition?: any;
}

interface ConnectedRecord {
  id: string;
  item_uid?: string;
  data: Record<string, any>;
  mini_app_id: string;
  _appName?: string;
}

/**
 * Renders a Connection field in one of four layout modes configured by the builder:
 *  - dropdown : classic dropdown (legacy fallback)
 *  - bar      : expandable horizontal bar with chevron, reveals extra fields underneath
 *  - table    : spreadsheet-style table showing selected columns
 *  - window   : full inline mini-app window with multi-select that feeds the frozen footer
 */
const ConnectionFieldRenderer: React.FC<ConnectionFieldRendererProps> = ({
  fieldDef,
  value,
  onChange,
  organizationId,
  workspaceColor,
  onMultiSelectChange,
  readOnly,
}) => {
  const layoutMode: ConnectionLayoutMode = fieldDef.settings?.connectionLayoutMode || 'dropdown';
  const isMultiple = fieldDef.settings?.allowMultipleConnections ?? (layoutMode === 'window' || layoutMode === 'table');
  const barExpandFields: string[] = fieldDef.settings?.connectionBarExpandFields || [];
  const tableColumns: string[] = fieldDef.settings?.connectionTableColumns || [];

  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [records, setRecords] = useState<ConnectedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [windowSelected, setWindowSelected] = useState<Set<string>>(new Set());
  const [windowMaximized, setWindowMaximized] = useState(false);

  const wc = workspaceColor;

  // Normalize current value to an array for easier downstream handling
  const selectedValues: string[] = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [String(value)];
  }, [value]);

  // Fetch connected apps + records
  useEffect(() => {
    const fetch = async () => {
      const connectedIds: string[] = fieldDef.settings?.connectedMiniAppIds
        || fieldDef.settings?.connectedApps
        || [];
      if (!connectedIds || connectedIds.length === 0 || !organizationId) {
        setConnectedApps([]);
        setRecords([]);
        return;
      }
      setLoading(true);
      try {
        const safeIds = connectedIds.filter(Boolean).map((x: any) => String(x).toLowerCase().trim());

        const { data: apps } = await supabase.schema('app_private')
          .from('mini_apps')
          .select('id, name, slug, schema_definition')
          .or(`organization_id.eq.${organizationId},is_preset.eq.true`);

        const matching = (apps || []).filter(a =>
          safeIds.includes(String(a.id).toLowerCase()) ||
          safeIds.includes((a.name || '').toLowerCase()) ||
          safeIds.includes((a.slug || '').toLowerCase())
        );

        setConnectedApps(matching);

        if (matching.length > 0) {
          const { data: recs } = await supabase.schema('app_private')
            .from('mini_app_records')
            .select('id, item_uid, data, mini_app_id')
            .in('mini_app_id', matching.map(a => a.id))
            .eq('organization_id', organizationId)
            .limit(500);

          const enriched: ConnectedRecord[] = (recs || []).map((r: any) => ({
            id: r.id,
            item_uid: r.item_uid,
            data: typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}),
            mini_app_id: r.mini_app_id,
            _appName: matching.find(a => a.id === r.mini_app_id)?.name,
          }));
          setRecords(enriched);
        } else {
          setRecords([]);
        }
      } catch (e) {
        console.error('[ConnectionFieldRenderer] Fetch failed:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [fieldDef.settings, organizationId]);

  // When window-mode selection changes, notify parent so the frozen footer buttons can consume it
  useEffect(() => {
    if (layoutMode === 'window' && onMultiSelectChange) {
      onMultiSelectChange(Array.from(windowSelected));
    }
  }, [windowSelected, layoutMode, onMultiSelectChange]);

  const getLabel = (r: ConnectedRecord): string => {
    const d = r.data || {};
    return d.name || d.Name || d.title || d.Title || d.identifier || r.item_uid || r.id;
  };

  // Discover all known field names across the connected app schemas (for the settings validators)
  const allFieldNames: string[] = useMemo(() => {
    const names = new Set<string>();
    connectedApps.forEach(a => {
      const fields = a.schema_definition?.fields || [];
      fields.forEach((f: any) => { if (f.name) names.add(f.name); });
    });
    return Array.from(names);
  }, [connectedApps]);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return records;
    return records.filter(r => {
      const label = getLabel(r).toLowerCase();
      if (label.includes(q)) return true;
      return Object.values(r.data || {}).some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [records, search]);

  const toggleSelect = (uid: string) => {
    if (readOnly) return;
    if (isMultiple) {
      const next = selectedValues.includes(uid)
        ? selectedValues.filter(x => x !== uid)
        : [...selectedValues, uid];
      onChange(next);
    } else {
      onChange(uid);
    }
  };

  // ─── DROPDOWN MODE (fallback for legacy connections) ───
  if (layoutMode === 'dropdown') {
    const current = isMultiple ? selectedValues : (selectedValues[0] || '');
    return (
      <select
        multiple={isMultiple}
        value={current}
        disabled={readOnly}
        onChange={(e) => {
          if (isMultiple) {
            onChange(Array.from(e.target.selectedOptions, o => o.value));
          } else {
            onChange(e.target.value);
          }
        }}
        className={`w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2 text-white font-mono focus:outline-none transition-all ${isMultiple ? 'h-24' : ''}`}
      >
        {!isMultiple && <option value="">{loading ? 'Loading...' : 'Select a record...'}</option>}
        {records.map(r => (
          <option key={r.item_uid || r.id} value={r.item_uid || r.id}>{getLabel(r)}</option>
        ))}
      </select>
    );
  }

  // ─── BAR MODE ───
  if (layoutMode === 'bar') {
    const primary = records.find(r => selectedValues.includes(r.item_uid || r.id));
    const isExpanded = !!expandedRow;
    return (
      <div className="w-full border rounded-lg bg-black/40 overflow-hidden" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
        <button
          type="button"
          onClick={() => setExpandedRow(prev => prev ? null : (primary?.id || 'empty'))}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
        >
          <GitBranch size={14} style={{ color: wc.primary }} />
          <span className="text-sm font-mono text-white flex-1 truncate">
            {primary ? getLabel(primary) : (isMultiple ? `${selectedValues.length} selected` : 'Select a record...')}
          </span>
          {isMultiple && selectedValues.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `rgba(${wc.rgb}, 0.15)`, color: wc.primary }}>
              {selectedValues.length}
            </span>
          )}
          {isExpanded ? <ChevronDown size={16} style={{ color: wc.primary }} /> : <ChevronRight size={16} style={{ color: wc.primary }} />}
        </button>

        {isExpanded && (
          <div className="border-t p-3 space-y-3" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search connected records..."
                className="w-full bg-black/50 border border-gray-800 rounded pl-7 pr-2 py-1.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            {/* Record list */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 darkwave-scrollbar">
              {loading && <p className="text-[11px] text-gray-500 font-mono text-center py-2">Loading...</p>}
              {!loading && filteredRecords.length === 0 && (
                <p className="text-[11px] text-gray-500 font-mono text-center py-2">No records found</p>
              )}
              {filteredRecords.map(r => {
                const uid = r.item_uid || r.id;
                const isSelected = selectedValues.includes(uid);
                return (
                  <div
                    key={r.id}
                    className="rounded-lg transition-colors"
                    style={{ background: isSelected ? `rgba(${wc.rgb}, 0.08)` : 'rgba(255,255,255,0.02)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelect(uid)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/5 transition-colors rounded-t-lg"
                    >
                      {isSelected ? <CheckSquare size={12} style={{ color: wc.primary }} /> : <Square size={12} className="text-gray-600" />}
                      <span className="text-xs font-mono text-white flex-1 truncate">{getLabel(r)}</span>
                    </button>
                    {/* Calibrated extra fields shown below the bar */}
                    {isSelected && barExpandFields.length > 0 && (
                      <div className="px-3 pt-1 pb-2 border-t grid grid-cols-2 gap-x-3 gap-y-1" style={{ borderColor: `rgba(${wc.rgb}, 0.15)` }}>
                        {barExpandFields.map(fname => (
                          <div key={fname} className="text-[10px] font-mono">
                            <span className="text-gray-500 uppercase tracking-wider">{fname}:</span>{' '}
                            <span className="text-gray-300">{String(r.data?.[fname] ?? '—')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── TABLE MODE ───
  if (layoutMode === 'table') {
    const cols = tableColumns.length > 0 ? tableColumns : (allFieldNames.slice(0, 4));
    return (
      <div className="w-full border rounded-lg bg-black/40 overflow-hidden" style={{ borderColor: `rgba(${wc.rgb}, 0.3)` }}>
        <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: `rgba(${wc.rgb}, 0.15)` }}>
          <GitBranch size={12} style={{ color: wc.primary }} />
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: wc.primary }}>
            {connectedApps.map(a => a.name).join(', ') || 'Connection'} · Table
          </span>
          <span className="text-[10px] font-mono text-gray-500 ml-auto">{selectedValues.length} selected / {records.length}</span>
          <div className="relative ml-2">
            <Search size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-32 bg-black/50 border border-gray-800 rounded pl-6 pr-2 py-1 text-[10px] font-mono text-white focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto darkwave-scrollbar">
          <table className="w-full text-xs font-mono">
            <thead className="bg-black/60 sticky top-0">
              <tr>
                {isMultiple && <th className="w-8 p-2"></th>}
                {cols.map(c => (
                  <th key={c} className="p-2 text-left text-[10px] uppercase tracking-wider text-gray-500 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={cols.length + (isMultiple ? 1 : 0)} className="p-4 text-center text-gray-500 text-[11px]">Loading...</td></tr>
              )}
              {!loading && filteredRecords.length === 0 && (
                <tr><td colSpan={cols.length + (isMultiple ? 1 : 0)} className="p-4 text-center text-gray-500 text-[11px]">No records found</td></tr>
              )}
              {filteredRecords.map(r => {
                const uid = r.item_uid || r.id;
                const isSelected = selectedValues.includes(uid);
                return (
                  <tr
                    key={r.id}
                    className="border-t transition-colors cursor-pointer"
                    style={{ borderColor: `rgba(${wc.rgb}, 0.08)`, background: isSelected ? `rgba(${wc.rgb}, 0.08)` : undefined }}
                    onClick={() => toggleSelect(uid)}
                  >
                    {isMultiple && (
                      <td className="p-2">
                        {isSelected ? <CheckSquare size={12} style={{ color: wc.primary }} /> : <Square size={12} className="text-gray-600" />}
                      </td>
                    )}
                    {cols.map(c => (
                      <td key={c} className="p-2 text-gray-300 whitespace-nowrap truncate max-w-[180px]" title={String(r.data?.[c] ?? '')}>
                        {String(r.data?.[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── WINDOW MODE ───
  // A literal window into the connected mini app: icon strip, multi-select records, feeds footer
  const winSelectedArr = Array.from(windowSelected);
  return (
    <div
      className="w-full border rounded-lg bg-black/40 overflow-hidden flex flex-col"
      style={{
        borderColor: `rgba(${wc.rgb}, 0.3)`,
        height: windowMaximized ? '70vh' : '380px',
      }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-black/60" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
        <GitBranch size={12} style={{ color: wc.primary }} className="ml-2" />
        <span className="text-[11px] font-mono uppercase tracking-wider flex-1 truncate" style={{ color: wc.primary }}>
          {connectedApps.map(a => a.name).join(' · ') || 'Connection'} · Window
        </span>
        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">{winSelectedArr.length} selected</span>
        <button type="button" onClick={() => setWindowSelected(new Set())} className="p-1 text-gray-500 hover:text-white" title="Clear selection">
          <X size={12} />
        </button>
        <button type="button" onClick={() => setWindowMaximized(v => !v)} className="p-1 text-gray-500 hover:text-white" title="Maximize">
          {windowMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      {/* Action strip — mimics the connected mini app's top action bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b flex-wrap" style={{ borderColor: `rgba(${wc.rgb}, 0.12)` }}>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${connectedApps[0]?.name || 'records'}...`}
            className="w-full bg-black/50 border border-gray-800 rounded pl-7 pr-2 py-1 text-[11px] font-mono text-white focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (windowSelected.size === filteredRecords.length) setWindowSelected(new Set());
            else setWindowSelected(new Set(filteredRecords.map(r => r.item_uid || r.id)));
          }}
          className="px-2 py-1 rounded text-[10px] font-mono border transition-colors hover:bg-white/5"
          style={{ borderColor: `rgba(${wc.rgb}, 0.3)`, color: wc.primary }}
        >
          {windowSelected.size === filteredRecords.length && filteredRecords.length > 0 ? 'Clear All' : 'Select All'}
        </button>
        <div className="text-[10px] font-mono text-gray-600 ml-auto">{filteredRecords.length} records</div>
      </div>

      {/* Records table (the "view pane") */}
      <div className="flex-1 overflow-auto darkwave-scrollbar">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-xs font-mono">Loading...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs font-mono">No records in connected mini app</div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="bg-black/60 sticky top-0">
              <tr>
                <th className="w-8 p-2"></th>
                {(tableColumns.length > 0 ? tableColumns : allFieldNames.slice(0, 5)).map(c => (
                  <th key={c} className="p-2 text-left text-[10px] uppercase tracking-wider text-gray-500 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(r => {
                const uid = r.item_uid || r.id;
                const isWinSelected = windowSelected.has(uid);
                const cols = tableColumns.length > 0 ? tableColumns : allFieldNames.slice(0, 5);
                return (
                  <tr
                    key={r.id}
                    className="border-t transition-colors cursor-pointer"
                    style={{ borderColor: `rgba(${wc.rgb}, 0.08)`, background: isWinSelected ? `rgba(${wc.rgb}, 0.1)` : undefined }}
                    onClick={() => {
                      setWindowSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(uid)) next.delete(uid);
                        else next.add(uid);
                        return next;
                      });
                    }}
                  >
                    <td className="p-2" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setWindowSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(uid)) next.delete(uid);
                            else next.add(uid);
                            return next;
                          });
                        }}
                      >
                        {isWinSelected ? <CheckSquare size={12} style={{ color: wc.primary }} /> : <Square size={12} className="text-gray-600" />}
                      </button>
                    </td>
                    {cols.map(c => (
                      <td key={c} className="p-2 text-gray-300 whitespace-nowrap truncate max-w-[200px]" title={String(r.data?.[c] ?? '')}>
                        {String(r.data?.[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer of the window — confirms the selection into the field value */}
      <div className="flex items-center gap-2 px-3 py-2 border-t bg-black/60" style={{ borderColor: `rgba(${wc.rgb}, 0.2)` }}>
        <span className="text-[10px] font-mono text-gray-500">
          Selected records feed the parent app's frozen footer buttons.
        </span>
        <button
          type="button"
          disabled={winSelectedArr.length === 0 || readOnly}
          onClick={() => {
            // Also sync into the field value itself so the field remembers what was selected
            onChange(isMultiple ? winSelectedArr : (winSelectedArr[0] || ''));
          }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-medium transition-all disabled:opacity-30"
          style={{ background: `rgba(${wc.rgb}, 0.2)`, border: `1px solid rgba(${wc.rgb}, 0.5)`, color: wc.primary }}
        >
          <Plus size={10} /> Attach to field
        </button>
      </div>
    </div>
  );
};

export default ConnectionFieldRenderer;
