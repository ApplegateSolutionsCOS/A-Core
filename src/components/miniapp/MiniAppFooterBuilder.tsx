import React from 'react';
import { FooterConfig, FooterBlock, DEFAULT_FOOTER_CONFIG } from '@/types';
import { Plus, Trash2, GripVertical, Square, Hash, Type, MousePointer } from 'lucide-react';

interface MiniAppFooterBuilderProps {
  config: FooterConfig;
  onChange: (next: FooterConfig) => void;
  connectionFields: { id: string; name: string }[]; // For "Add to Field" button action
  wsColor: { primary: string; rgb: string };
}

const BLOCK_TYPE_OPTIONS = [
  { type: 'button' as const, label: 'Button', icon: MousePointer },
  { type: 'number' as const, label: 'Number', icon: Hash },
  { type: 'text' as const, label: 'Text', icon: Type },
];

const BUTTON_ACTION_OPTIONS: { value: NonNullable<FooterBlock['action']>; label: string; description: string }[] = [
  { value: 'add_selected_to_field', label: 'Add Selected → Field', description: 'Push records selected in a Window connection into another Connection field' },
  { value: 'clear_selection', label: 'Clear Window Selection', description: 'Deselect all records in Window layouts' },
  { value: 'run_calc', label: 'Trigger Calculation', description: 'Recalculate number blocks' },
  { value: 'custom', label: 'Custom Action', description: 'Handled by parent record page' },
];

/**
 * Settings panel for configuring the MiniApp's frozen footer:
 *  - master "Freeze" toggle
 *  - add/remove/reorder button / number / text building blocks
 *  - per-block configuration (label, action, target field, calc expression, etc.)
 */
const MiniAppFooterBuilder: React.FC<MiniAppFooterBuilderProps> = ({ config, onChange, connectionFields, wsColor }) => {
  const safeConfig: FooterConfig = { ...DEFAULT_FOOTER_CONFIG, ...config, blocks: config?.blocks || [] };

  const update = (patch: Partial<FooterConfig>) => onChange({ ...safeConfig, ...patch });

  const addBlock = (type: FooterBlock['type']) => {
    const newBlock: FooterBlock = {
      id: `fb_${Date.now()}`,
      type,
      label: type === 'button' ? 'Add to Order' : type === 'number' ? 'Total' : 'Note',
      width: type === 'button' ? 3 : type === 'number' ? 2 : 3,
      ...(type === 'button' ? { action: 'add_selected_to_field' } : {}),
      ...(type === 'number' ? { decimals: 2, calcExpression: 'COUNT(selected)' } : {}),
      ...(type === 'text' ? { staticValue: '' } : {}),
    };
    update({ blocks: [...safeConfig.blocks, newBlock] });
  };

  const updateBlock = (id: string, patch: Partial<FooterBlock>) => {
    update({ blocks: safeConfig.blocks.map(b => b.id === id ? { ...b, ...patch } : b) });
  };

  const removeBlock = (id: string) => {
    update({ blocks: safeConfig.blocks.filter(b => b.id !== id) });
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = safeConfig.blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const next = [...safeConfig.blocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    update({ blocks: next });
  };

  return (
    <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-700 pb-4">
        <div>
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Square size={14} style={{ color: wsColor.primary }} />
            Frozen Footer
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-lg">
            A locked footer that stays at the bottom of every record page in this MiniApp as the user scrolls.
            Add Button, Number, and Text building blocks. Buttons can consume records selected in any
            Connection field rendered in "Window" layout (e.g. "Add to Order").
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => update({ enabled: !safeConfig.enabled })}
              className="w-10 h-5 rounded-full transition-colors relative cursor-pointer"
              style={{ backgroundColor: safeConfig.enabled ? wsColor.primary : '#475569' }}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${safeConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs font-mono" style={{ color: safeConfig.enabled ? wsColor.primary : '#64748b' }}>
              {safeConfig.enabled ? 'Frozen' : 'Off'}
            </span>
          </label>
        </div>
      </div>

      {safeConfig.enabled && (
        <>
          {/* Add-block toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Add Block:</span>
            {BLOCK_TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => addBlock(opt.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:bg-white/5"
                  style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, color: wsColor.primary }}
                >
                  <Icon size={12} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Height control */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Footer Height</label>
            <input
              type="range"
              min={48}
              max={160}
              value={safeConfig.height || 64}
              onChange={e => update({ height: parseInt(e.target.value) })}
              className="flex-1 max-w-xs"
            />
            <span className="text-xs font-mono text-slate-400 w-12 text-right">{safeConfig.height || 64}px</span>
          </div>

          {/* Blocks list */}
          <div className="space-y-3">
            {safeConfig.blocks.length === 0 && (
              <div className="text-center py-6 text-xs font-mono text-slate-600 border border-dashed border-slate-700 rounded-lg">
                No footer blocks yet. Add Button, Number, or Text above.
              </div>
            )}

            {safeConfig.blocks.map((block, idx) => (
              <div key={block.id} className="p-3 rounded-lg border bg-black/20" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="text-slate-500 hover:text-white disabled:opacity-20">▲</button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={idx === safeConfig.blocks.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20">▼</button>
                  </div>
                  <GripVertical size={12} className="text-slate-600" />
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded" style={{ background: `rgba(${wsColor.rgb}, 0.12)`, color: wsColor.primary }}>
                    {block.type}
                  </span>
                  <input
                    type="text"
                    value={block.label}
                    onChange={e => updateBlock(block.id, { label: e.target.value })}
                    placeholder="Label"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">W</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={block.width || 3}
                      onChange={e => updateBlock(block.id, { width: Math.max(1, Math.min(12, parseInt(e.target.value) || 3)) })}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <button type="button" onClick={() => removeBlock(block.id)} className="p-1 text-slate-500 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Per-type config */}
                {block.type === 'button' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-mono">Action</label>
                      <select
                        value={block.action || 'custom'}
                        onChange={e => updateBlock(block.id, { action: e.target.value as FooterBlock['action'] })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                      >
                        {BUTTON_ACTION_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    {block.action === 'add_selected_to_field' && (
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-mono">Target Connection Field</label>
                        <select
                          value={block.targetFieldId || ''}
                          onChange={e => updateBlock(block.id, { targetFieldId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value="">Select field...</option>
                          {connectionFields.map(f => <option key={f.id} value={f.id}>{f.name || 'Unnamed'}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-mono">Color (hex or rgba)</label>
                      <input
                        type="text"
                        value={block.color || ''}
                        onChange={e => updateBlock(block.id, { color: e.target.value })}
                        placeholder="#22c55e or rgba(34,197,94,0.2)"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {block.type === 'number' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-mono">Calc Expression</label>
                      <input
                        type="text"
                        value={block.calcExpression || ''}
                        onChange={e => updateBlock(block.id, { calcExpression: e.target.value })}
                        placeholder="e.g. SUM(selected) or @price * @qty"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-mono">Decimals</label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={block.decimals ?? 0}
                        onChange={e => updateBlock(block.id, { decimals: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {block.type === 'text' && (
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-mono">Static Value</label>
                    <input
                      type="text"
                      value={block.staticValue || ''}
                      onChange={e => updateBlock(block.id, { staticValue: e.target.value })}
                      placeholder="e.g. Ready to submit"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Live preview */}
          {safeConfig.blocks.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Preview</p>
              <div
                className="relative border rounded-lg overflow-hidden"
                style={{ height: `${safeConfig.height || 64}px`, background: 'rgba(0,0,0,0.7)', borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
              >
                <div className="h-full w-full px-3 py-2 grid grid-cols-12 gap-2">
                  {safeConfig.blocks.map(b => {
                    const w = Math.max(1, Math.min(12, b.width || 3));
                    if (b.type === 'button') {
                      return (
                        <div key={b.id} style={{ gridColumn: `span ${w}` }} className="flex items-center">
                          <div className="w-full h-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-mono truncate"
                               style={{ background: b.color || `rgba(${wsColor.rgb}, 0.2)`, border: `1px solid rgba(${wsColor.rgb}, 0.5)`, color: wsColor.primary }}>
                            <Plus size={11} /> {b.label || 'Button'}
                          </div>
                        </div>
                      );
                    }
                    if (b.type === 'number') {
                      return (
                        <div key={b.id} style={{ gridColumn: `span ${w}`, borderColor: `rgba(${wsColor.rgb}, 0.25)` }} className="flex flex-col justify-center px-2 py-1 rounded-lg bg-black/40 border">
                          <span className="text-[8px] uppercase tracking-widest text-gray-500 truncate">{b.label}</span>
                          <span className="text-sm font-bold font-mono" style={{ color: wsColor.primary }}>0</span>
                        </div>
                      );
                    }
                    return (
                      <div key={b.id} style={{ gridColumn: `span ${w}` }} className="flex flex-col justify-center px-2 py-1 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[8px] uppercase tracking-widest text-gray-500 truncate">{b.label}</span>
                        <span className="text-[11px] font-mono text-gray-200 truncate">{b.staticValue || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MiniAppFooterBuilder;
