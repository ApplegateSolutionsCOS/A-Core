import React, { useState } from 'react';
import {
  PlusIcon, TrashIcon, GridIcon, SubMenuIcon, ChevronDownIcon,
  GripVerticalIcon, TypeIcon, PhoneIcon, MailIcon, TagIcon,
  UserIcon, ImageIcon, LinkIcon, HashIcon, MapPinIcon,
  CalendarIcon, ClockIcon, CalculatorIcon, GitBranchIcon,
  PaymentIcon, SparklesIcon, SearchIcon,
} from '@/components/icons/Icons';

// Mirrors the types from MiniAppBuilder
type BuildingBlockType =
  | 'text_field' | 'phone_number_field' | 'email_address_field'
  | 'category_field' | 'user_field' | 'image_field'
  | 'hyperlink_field' | 'number_field' | 'location_field'
  | 'date_field' | 'duration_field' | 'calculation_field'
  | 'connection_field' | 'submenu' | 'payment_field' | 'split_separator';

interface FieldSettings {
  multiline?: boolean;
  allowMultiple?: boolean;
  decimals?: number;
  durationUnits?: Record<string, boolean>;
  calculationPrompt?: string;
  displaySize?: 'small' | 'medium' | 'large';
  categoryOptions?: { id: string; label: string; color: string }[];
  linkedMiniAppId?: string;
  connectedMiniAppIds?: string[];
  allowMultipleConnections?: boolean;
  subMenuBlocks?: SubMenuBlock[];
  subMenuColumns?: 1 | 2;
  conditionFieldId?: string;
  conditionOperator?: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  conditionValue?: string;
  merchantAccountId?: string;
  owedFieldReference?: string;
  paymentDescription?: string;
  separatorColor?: string;
  separatorStyle?: 'solid' | 'dashed';
  marginTop?: number;
  marginBottom?: number;
  hiddenWhenEmpty?: boolean;
  hiddenWhenFull?: boolean;
  alwaysHidden?: boolean;
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

interface SubMenuFieldSettingsProps {
  field: BuildingBlock;
  allFields: BuildingBlock[];
  onUpdateSettings: (fieldId: string, settings: Partial<FieldSettings>) => void;
  onUpdateField: (fieldId: string, updates: Partial<BuildingBlock>) => void;
  acColor: { primary: string; rgb: string; dark: string; tw: string; colorName: string };
}

const CHILD_BLOCK_OPTIONS: { type: Exclude<BuildingBlockType, 'submenu'>; label: string; icon: React.FC<any>; color: string }[] = [
  { type: 'text_field', label: 'Text Field', icon: TypeIcon, color: 'text-blue-400' },
  { type: 'phone_number_field', label: 'Phone Number', icon: PhoneIcon, color: 'text-green-400' },
  { type: 'email_address_field', label: 'Email Address', icon: MailIcon, color: 'text-purple-400' },
  { type: 'category_field', label: 'Category', icon: TagIcon, color: 'text-pink-400' },
  { type: 'user_field', label: 'User', icon: UserIcon, color: 'text-orange-400' },
  { type: 'image_field', label: 'Image', icon: ImageIcon, color: 'text-cyan-400' },
  { type: 'hyperlink_field', label: 'Hyperlink', icon: LinkIcon, color: 'text-indigo-400' },
  { type: 'number_field', label: 'Number', icon: HashIcon, color: 'text-yellow-400' },
  { type: 'location_field', label: 'Location', icon: MapPinIcon, color: 'text-red-400' },
  { type: 'date_field', label: 'Date', icon: CalendarIcon, color: 'text-teal-400' },
  { type: 'duration_field', label: 'Duration', icon: ClockIcon, color: 'text-amber-400' },
  { type: 'calculation_field', label: 'Calculation', icon: CalculatorIcon, color: 'text-violet-400' },
  { type: 'connection_field', label: 'Connection', icon: GitBranchIcon, color: 'text-emerald-400' },
  { type: 'payment_field', label: 'Payment', icon: PaymentIcon, color: 'text-lime-400' },
];

const CONDITION_OPERATORS = [
  { value: 'equals' as const, label: 'Equals' },
  { value: 'not_equals' as const, label: 'Not Equals' },
  { value: 'contains' as const, label: 'Contains' },
  { value: 'is_empty' as const, label: 'Is Empty' },
  { value: 'is_not_empty' as const, label: 'Is Not Empty' },
];

const SubMenuFieldSettings: React.FC<SubMenuFieldSettingsProps> = ({
  field, allFields, onUpdateSettings, onUpdateField, acColor: ac,
}) => {
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [dragChildId, setDragChildId] = useState<string | null>(null);

  const subMenuBlocks = field.settings.subMenuBlocks || [];
  const subMenuColumns = field.settings.subMenuColumns || 2;

  // Other placed fields (excluding this submenu) for condition dropdown
  const otherFields = allFields.filter(f => f.id !== field.id && f.type !== 'split_separator');

  // Get category options for the selected condition field
  const conditionField = otherFields.find(f => f.id === field.settings.conditionFieldId);
  const conditionFieldOptions = conditionField?.settings?.categoryOptions || [];

  const addChildBlock = (type: Exclude<BuildingBlockType, 'submenu'>) => {
    const maxRow = subMenuBlocks.length > 0 ? Math.max(...subMenuBlocks.map(b => b.row)) : -1;
    const newBlock: SubMenuBlock = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: '',
      type,
      required: false,
      column: 1,
      row: maxRow + 1,
      settings: {},
    };
    onUpdateSettings(field.id, { subMenuBlocks: [...subMenuBlocks, newBlock] });
    setEditingChildId(newBlock.id);
    setShowAddDropdown(false);
  };

  const updateChildBlock = (childId: string, updates: Partial<SubMenuBlock>) => {
    onUpdateSettings(field.id, {
      subMenuBlocks: subMenuBlocks.map(b => b.id === childId ? { ...b, ...updates } : b),
    });
  };

  const removeChildBlock = (childId: string) => {
    onUpdateSettings(field.id, {
      subMenuBlocks: subMenuBlocks.filter(b => b.id !== childId),
    });
    if (editingChildId === childId) setEditingChildId(null);
  };

  const moveChildBlock = (childId: string, direction: 'up' | 'down') => {
    const idx = subMenuBlocks.findIndex(b => b.id === childId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === subMenuBlocks.length - 1) return;
    const newBlocks = [...subMenuBlocks];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    // Swap rows
    const tempRow = newBlocks[idx].row;
    newBlocks[idx] = { ...newBlocks[idx], row: newBlocks[swapIdx].row };
    newBlocks[swapIdx] = { ...newBlocks[swapIdx], row: tempRow };
    // Swap positions in array
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    onUpdateSettings(field.id, { subMenuBlocks: newBlocks });
  };

  const handleChildDragStart = (childId: string) => {
    setDragChildId(childId);
  };

  const handleChildDrop = (targetId: string) => {
    if (!dragChildId || dragChildId === targetId) { setDragChildId(null); return; }
    const srcIdx = subMenuBlocks.findIndex(b => b.id === dragChildId);
    const tgtIdx = subMenuBlocks.findIndex(b => b.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) { setDragChildId(null); return; }
    const newBlocks = [...subMenuBlocks];
    const [moved] = newBlocks.splice(srcIdx, 1);
    newBlocks.splice(tgtIdx, 0, moved);
    // Re-index rows
    newBlocks.forEach((b, i) => { b.row = i; });
    onUpdateSettings(field.id, { subMenuBlocks: newBlocks });
    setDragChildId(null);
  };

  const needsValue = field.settings.conditionOperator !== 'is_empty' && field.settings.conditionOperator !== 'is_not_empty';

  return (
    <div className="space-y-4">
      {/* SubMenu Header */}
      <div className="p-3 bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/30 rounded-lg space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <SubMenuIcon size={16} className="text-sky-400" />
          <p className="text-xs text-slate-400 font-medium">SubMenu Settings</p>
        </div>

        {/* Columns Toggle */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Columns</label>
          <div className="flex gap-2">
            {([1, 2] as const).map(n => (
              <button
                key={n}
                onClick={() => onUpdateSettings(field.id, { subMenuColumns: n })}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  subMenuColumns === n
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {n} Column{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Conditional Visibility Rules ─── */}
      <div className="p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <SparklesIcon size={14} className="text-amber-400" />
          <p className="text-xs text-slate-400 font-medium">Conditional Visibility</p>
        </div>
        <p className="text-[10px] text-slate-500">
          Show this submenu only when a condition on another field is met.
        </p>

        {/* Condition Field */}
        <div>
          <label className="block text-[10px] text-slate-500 mb-1">When field:</label>
          <select
            value={field.settings.conditionFieldId || ''}
            onChange={(e) => onUpdateSettings(field.id, {
              conditionFieldId: e.target.value || undefined,
              conditionOperator: e.target.value ? (field.settings.conditionOperator || 'equals') : undefined,
              conditionValue: e.target.value ? field.settings.conditionValue : undefined,
            })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="">No condition (always visible)</option>
            {otherFields.map(f => (
              <option key={f.id} value={f.id}>
                {f.name || f.type.replace(/_/g, ' ')} ({f.type.replace(/_field/, '').replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>

        {/* Condition Operator */}
        {field.settings.conditionFieldId && (
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Operator:</label>
            <select
              value={field.settings.conditionOperator || 'equals'}
              onChange={(e) => onUpdateSettings(field.id, {
                conditionOperator: e.target.value as any,
              })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
            >
              {CONDITION_OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Condition Value */}
        {field.settings.conditionFieldId && needsValue && (
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Value:</label>
            {conditionFieldOptions.length > 0 ? (
              <select
                value={field.settings.conditionValue || ''}
                onChange={(e) => onUpdateSettings(field.id, { conditionValue: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="">Select option...</option>
                {conditionFieldOptions.map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={field.settings.conditionValue || ''}
                onChange={(e) => onUpdateSettings(field.id, { conditionValue: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                placeholder="Enter value..."
              />
            )}
          </div>
        )}

        {/* Condition Summary */}
        {field.settings.conditionFieldId && (
          <div className="px-2 py-1.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300">
            Show when "{otherFields.find(f => f.id === field.settings.conditionFieldId)?.name || '?'}"
            {' '}{field.settings.conditionOperator?.replace(/_/g, ' ') || 'equals'}
            {needsValue && <> "{field.settings.conditionValue || '...'}"</>}
          </div>
        )}
      </div>

      {/* ─── Child Fields Mini Canvas ─── */}
      <div className="p-3 bg-gradient-to-br from-sky-500/5 to-indigo-500/5 border border-sky-500/20 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GridIcon size={14} className="text-sky-400" />
            <p className="text-xs text-slate-400 font-medium">Child Fields ({subMenuBlocks.length})</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all"
              style={{ background: `rgba(${ac.rgb}, 0.15)`, color: ac.primary, border: `1px solid rgba(${ac.rgb}, 0.3)` }}
            >
              <PlusIcon size={10} /> Add Field
            </button>
            {showAddDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-black/95 backdrop-blur-xl rounded-lg border border-white/10 shadow-2xl w-48 max-h-60 overflow-y-auto">
                  {CHILD_BLOCK_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.type}
                        onClick={() => addChildBlock(opt.type)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 transition-all"
                      >
                        <Icon size={14} className={opt.color} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Child blocks list */}
        {subMenuBlocks.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-600">
            No child fields yet. Click "Add Field" to add blocks inside this submenu.
          </div>
        ) : (
          <div className="space-y-1.5">
            {subMenuBlocks.map((child, idx) => {
              const blockDef = CHILD_BLOCK_OPTIONS.find(b => b.type === child.type);
              const Icon = blockDef?.icon || GridIcon;
              const isEditing = editingChildId === child.id;
              const isDragging = dragChildId === child.id;

              return (
                <div
                  key={child.id}
                  draggable
                  onDragStart={() => handleChildDragStart(child.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleChildDrop(child.id)}
                  onDragEnd={() => setDragChildId(null)}
                  className={`rounded-lg border transition-all ${
                    isDragging ? 'opacity-40 scale-95' : ''
                  } ${isEditing
                    ? 'border-sky-500/50 bg-sky-500/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                  }`}
                >
                  {/* Child header row */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-2 cursor-pointer"
                    onClick={() => setEditingChildId(isEditing ? null : child.id)}
                  >
                    <GripVerticalIcon size={12} className="text-slate-600 cursor-grab flex-shrink-0" />
                    <Icon size={14} className={`flex-shrink-0 ${blockDef?.color || 'text-slate-400'}`} />
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => { e.stopPropagation(); updateChildBlock(child.id, { name: e.target.value }); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-transparent text-white text-xs focus:outline-none placeholder-slate-600"
                      placeholder="Field name..."
                    />
                    <span className="text-[9px] text-slate-600 flex-shrink-0">{blockDef?.label}</span>
                    {/* Move buttons */}
                    <button
                      onClick={(e) => { e.stopPropagation(); moveChildBlock(child.id, 'up'); }}
                      disabled={idx === 0}
                      className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18,15 12,9 6,15"/></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveChildBlock(child.id, 'down'); }}
                      disabled={idx === subMenuBlocks.length - 1}
                      className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6,9 12,15 18,9"/></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeChildBlock(child.id); }}
                      className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>

                  {/* Expanded settings */}
                  {isEditing && (
                    <div className="px-2.5 pb-2.5 pt-1 border-t border-white/[0.05] space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={child.required}
                          onChange={(e) => updateChildBlock(child.id, { required: e.target.checked })}
                          className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-sky-500"
                        />
                        <label className="text-[10px] text-slate-400">Required</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-500">Column:</label>
                        <div className="flex gap-1">
                          {([1, 2] as const).map(c => (
                            <button
                              key={c}
                              onClick={() => updateChildBlock(child.id, { column: c })}
                              className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                                child.column === c
                                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-500'
                              }`}
                            >
                              Col {c}
                            </button>
                          ))}
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
    </div>
  );
};

export default SubMenuFieldSettings;
