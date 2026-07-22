import React, { useState } from 'react';
import {
  TrashIcon, CopyIcon, CheckIcon, CloseIcon,
  GripVerticalIcon,
} from '@/components/icons/Icons';

// Inline arrow icons
const ArrowUpIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>
);
const ArrowDownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>
);
const CheckSquareIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
);

type BuildingBlockType =
  | 'text_field' | 'phone_number_field' | 'email_address_field'
  | 'category_field' | 'user_field' | 'image_field'
  | 'hyperlink_field' | 'number_field' | 'location_field'
  | 'date_field' | 'duration_field' | 'calculation_field'
  | 'connection_field' | 'submenu' | 'payment_field' | 'split_separator';

interface FieldSettings {
  [key: string]: any;
}

interface BuildingBlock {
  id: string;
  name: string;
  type: BuildingBlockType;
  required: boolean;
  column: 1 | 2;
  columnSpan?: 1 | 2;
  row: number;
  settings: FieldSettings;
}

interface BulkFieldActionsProps {
  fields: BuildingBlock[];
  selectedFieldIds: Set<string>;
  onFieldsChange: (fields: BuildingBlock[]) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onClearSelection: () => void;
  acColor: { primary: string; rgb: string };
}

const BulkFieldActions: React.FC<BulkFieldActionsProps> = ({
  fields, selectedFieldIds, onFieldsChange, onSelectionChange, onClearSelection, acColor: ac,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const count = selectedFieldIds.size;
  if (count === 0) return null;

  const selectedFields = fields.filter(f => selectedFieldIds.has(f.id));

  // Bulk delete
  const handleBulkDelete = () => {
    onFieldsChange(fields.filter(f => !selectedFieldIds.has(f.id)));
    onClearSelection();
    setShowDeleteConfirm(false);
  };

  // Bulk toggle required
  const handleToggleRequired = () => {
    const allRequired = selectedFields.every(f => f.required);
    const newRequired = !allRequired;
    onFieldsChange(fields.map(f =>
      selectedFieldIds.has(f.id) ? { ...f, required: newRequired } : f
    ));
  };

  // Bulk move up (decrease row by 1)
  const handleMoveUp = () => {
    const minRow = Math.min(...selectedFields.map(f => f.row));
    if (minRow <= 0) return;
    onFieldsChange(fields.map(f =>
      selectedFieldIds.has(f.id) ? { ...f, row: f.row - 1 } : f
    ));
  };

  // Bulk move down (increase row by 1)
  const handleMoveDown = () => {
    onFieldsChange(fields.map(f =>
      selectedFieldIds.has(f.id) ? { ...f, row: f.row + 1 } : f
    ));
  };

  // Bulk duplicate
  const handleDuplicate = () => {
    const maxRow = fields.length > 0 ? Math.max(...fields.map(f => f.row)) : 0;
    let nextRow = maxRow + 1;
    const newFields: BuildingBlock[] = [];
    selectedFields.forEach(f => {
      newFields.push({
        ...f,
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: f.name ? `${f.name} (copy)` : '',
        row: nextRow,
        column: f.column,
      });
      nextRow++;
    });
    onFieldsChange([...fields, ...newFields]);
    onClearSelection();
  };

  // Select all
  const handleSelectAll = () => {
    onSelectionChange(new Set(fields.map(f => f.id)));
  };

  const allRequired = selectedFields.every(f => f.required);

  return (
    <>
      {/* Floating action bar */}
      <div
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(0,0,0,0.85)',
          borderColor: `rgba(${ac.rgb}, 0.4)`,
          boxShadow: `0 0 30px rgba(${ac.rgb}, 0.15), 0 8px 32px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Count badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <CheckSquareIcon size={16} style={{ color: ac.primary }} />
          <span className="text-sm font-medium text-white font-mono">{count} selected</span>
        </div>

        {/* Select All */}
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          title="Select All"
        >
          <CheckSquareIcon size={14} />
          All
        </button>

        {/* Toggle Required */}
        <button
          onClick={handleToggleRequired}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ color: allRequired ? '#f59e0b' : '#94a3b8' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; }}
          title={allRequired ? 'Set Optional' : 'Set Required'}
        >
          <span className="text-[10px] font-bold">*</span>
          {allRequired ? 'Optional' : 'Required'}
        </button>

        {/* Move Up */}
        <button
          onClick={handleMoveUp}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          title="Move Up"
        >
          <ArrowUpIcon size={14} />
        </button>

        {/* Move Down */}
        <button
          onClick={handleMoveDown}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          title="Move Down"
        >
          <ArrowDownIcon size={14} />
        </button>

        {/* Duplicate */}
        <button
          onClick={handleDuplicate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          title="Duplicate"
        >
          <CopyIcon size={14} />
          Duplicate
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          title="Delete Selected"
        >
          <TrashIcon size={14} />
          Delete
        </button>

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          title="Clear Selection"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-black/90 backdrop-blur-2xl border border-red-500/30 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <TrashIcon size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Delete {count} Field{count > 1 ? 's' : ''}?</h3>
                <p className="text-[10px] text-slate-500">This removes them from the canvas</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              This will remove {count} selected field{count > 1 ? 's' : ''} from the builder canvas. If you're editing an existing MiniApp, the fields won't be permanently deleted until you save.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 text-xs text-slate-300 border border-white/10 rounded-lg hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all font-medium"
              >
                Delete {count} Field{count > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkFieldActions;
