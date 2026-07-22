import React, { useMemo } from 'react';
import { FooterBlock, FooterConfig } from '@/types';
import { Calculator, Plus, Trash2 } from 'lucide-react';

interface FrozenFooterProps {
  config?: FooterConfig;
  workspaceColor: { primary: string; rgb: string };
  /** Records selected inside any "Window" connection on the record page. Keyed by connection field id. */
  windowSelectionsByField: Record<string, string[]>;
  /** Current record field values (for @FieldName calc references) */
  recordFieldValues: Record<string, any>;
  /** Fires when a button requests to push selected records into a target connection field. */
  onAddSelectedToField?: (targetFieldId: string, selectedRecordIds: string[]) => void;
  /** Fires when user clicks a "custom" button — parent may decide what to do. */
  onCustomAction?: (block: FooterBlock) => void;
  /** Fires when user clicks "clear selection" button. */
  onClearSelections?: () => void;
  /** Whether the footer is inside an absolutely-positioned modal container (true) or relative to page (false) */
  contained?: boolean;
}

/**
 * A frozen, always-visible footer that the MiniApp builder configures per app.
 * It stays locked at the bottom of the record page as the user scrolls.
 * Supports three building-block types: button, number (live calc), text (static or variable).
 * Buttons can consume records selected in any Connection field rendered in "window" mode
 * and push them into another Connection field (e.g. "Add Selected Products to Order").
 */
const FrozenFooter: React.FC<FrozenFooterProps> = ({
  config,
  workspaceColor,
  windowSelectionsByField,
  recordFieldValues,
  onAddSelectedToField,
  onCustomAction,
  onClearSelections,
  contained = true,
}) => {
  const wc = workspaceColor;

  // Combine all window-selected records across connection fields
  const allSelectedIds = useMemo(() => {
    const merged = new Set<string>();
    Object.values(windowSelectionsByField || {}).forEach(ids => ids.forEach(id => merged.add(id)));
    return Array.from(merged);
  }, [windowSelectionsByField]);

  if (!config?.enabled || !config.blocks || config.blocks.length === 0) {
    return null;
  }

  // Simple calc evaluator: supports SUM(selected)/COUNT(selected) and @FieldName arithmetic
  const evalCalc = (expr: string): number => {
    try {
      if (!expr) return 0;
      let e = expr.trim();
      if (/SUM\s*\(\s*selected\s*\)/i.test(e) || /COUNT\s*\(\s*selected\s*\)/i.test(e)) {
        return allSelectedIds.length;
      }
      e = e.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_m, name) => {
        const raw = recordFieldValues?.[name];
        const n = Number(raw);
        return isNaN(n) ? '0' : String(n);
      });
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${e});`);
      const result = fn();
      return typeof result === 'number' && !isNaN(result) ? result : 0;
    } catch {
      return 0;
    }
  };

  const renderBlock = (block: FooterBlock) => {
    const width = Math.max(1, Math.min(12, block.width || 3));
    const colSpan = `span ${width}`;

    if (block.type === 'button') {
      const Icon = block.action === 'clear_selection' ? Trash2
        : block.action === 'run_calc' ? Calculator
        : Plus;
      return (
        <div key={block.id} style={{ gridColumn: colSpan }} className="flex items-center">
          <button
            type="button"
            onClick={() => {
              if (block.action === 'add_selected_to_field' && block.targetFieldId) {
                if (allSelectedIds.length === 0) return;
                onAddSelectedToField?.(block.targetFieldId, allSelectedIds);
              } else if (block.action === 'clear_selection') {
                onClearSelections?.();
              } else {
                onCustomAction?.(block);
              }
            }}
            className="w-full h-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: block.color || `rgba(${wc.rgb}, 0.2)`,
              border: `1px solid rgba(${wc.rgb}, 0.5)`,
              color: wc.primary,
              boxShadow: `0 0 10px rgba(${wc.rgb}, 0.15)`,
            }}
            title={block.action === 'add_selected_to_field' ? `Add ${allSelectedIds.length} selected` : block.label}
          >
            <Icon size={14} />
            <span className="truncate">{block.label || 'Action'}</span>
            {block.action === 'add_selected_to_field' && allSelectedIds.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: `rgba(${wc.rgb}, 0.4)` }}>
                {allSelectedIds.length}
              </span>
            )}
          </button>
        </div>
      );
    }

    if (block.type === 'number') {
      const numericValue = evalCalc(block.calcExpression || '');
      const formatted = numericValue.toLocaleString(undefined, {
        minimumFractionDigits: block.decimals ?? 0,
        maximumFractionDigits: block.decimals ?? 0,
      });
      return (
        <div
          key={block.id}
          style={{ gridColumn: colSpan, borderColor: `rgba(${wc.rgb}, 0.25)` }}
          className="flex flex-col justify-center px-3 py-1 rounded-lg bg-black/40 border"
        >
          <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 truncate">{block.label || 'Number'}</span>
          <span className="text-sm font-mono font-bold tabular-nums" style={{ color: wc.primary }}>{formatted}</span>
        </div>
      );
    }

    // text block
    return (
      <div key={block.id} style={{ gridColumn: colSpan }} className="flex flex-col justify-center px-3 py-1 rounded-lg bg-black/40 border border-white/5">
        {block.label && (
          <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 truncate">{block.label}</span>
        )}
        <span className="text-xs font-mono text-gray-200 truncate">{block.staticValue || '—'}</span>
      </div>
    );
  };

  return (
    <div
      className={`${contained ? 'absolute left-0 right-0 bottom-0' : 'fixed left-0 right-0 bottom-0'} z-[50] border-t backdrop-blur-xl`}
      style={{
        background: config.background || 'rgba(0,0,0,0.92)',
        borderColor: `rgba(${wc.rgb}, 0.3)`,
        height: config.height ? `${config.height}px` : undefined,
        boxShadow: `0 -8px 32px rgba(0,0,0,0.6)`,
      }}
    >
      <div className="h-full w-full px-3 sm:px-4 py-2 grid grid-cols-12 gap-2 items-stretch max-w-[1800px] mx-auto">
        {config.blocks.map(renderBlock)}
      </div>
    </div>
  );
};

export default FrozenFooter;
