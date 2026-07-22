import React, { useState } from 'react';
import { CloseIcon, PlusIcon } from '@/components/icons/Icons';
import { db } from '@/lib/dbProxy';


const WORKSPACE_COLORS = [
  { name: 'Cyan', value: '#00ffff', rgb: '0,255,255' },
  { name: 'Red', value: '#ef4444', rgb: '239,68,68' },
  { name: 'Green', value: '#22c55e', rgb: '34,197,94' },
  { name: 'Purple', value: '#a855f7', rgb: '168,85,247' },
  { name: 'Magenta', value: '#ff00ff', rgb: '255,0,255' },
  { name: 'Orange', value: '#ff9900', rgb: '255,153,0' },
  { name: 'Blue', value: '#3b82f6', rgb: '59,130,246' },
  { name: 'Pink', value: '#ec4899', rgb: '236,72,153' },
  { name: 'Yellow', value: '#eab308', rgb: '234,179,8' },
  { name: 'Teal', value: '#14b8a6', rgb: '20,184,166' },
  { name: 'Indigo', value: '#6366f1', rgb: '99,102,241' },
  { name: 'Lime', value: '#84cc16', rgb: '132,204,22' },
];

const WORKSPACE_ICONS = [
  'home', 'shield', 'calculator', 'users', 'database', 'lock',
  'briefcase', 'star', 'heart', 'zap', 'globe', 'layers',
  'target', 'compass', 'activity', 'clipboard', 'folder', 'grid',
];

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
  userId?: string;
  currentCount: number;
  maxCount: number;
  onCreated?: (workspace: { name: string; slug: string; color: string; icon: string }) => void;
  accentColor?: string;
  accentRgb?: string;
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen, onClose, organizationId, userId, currentCount, maxCount, onCreated,
  accentColor = '#00ffff', accentRgb = '0,255,255',
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(WORKSPACE_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState('home');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const atLimit = currentCount >= maxCount;

  const handleSave = async () => {
    if (!name.trim()) { setError('Workspace name is required'); return; }
    if (atLimit) { setError(`Maximum of ${maxCount} workspaces reached`); return; }
    setError('');
    setSaving(true);
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data, error: dbError } = await db.from('workspaces').insert({

        organization_id: organizationId || null,
        name: name.trim(),
        slug,
        icon: selectedIcon,
        color: selectedColor,
        description: description.trim() || null,
        display_order: currentCount,
        created_by: userId || null,
      }).select().single();

      if (dbError) throw dbError;
      if (onCreated) onCreated({ name: name.trim(), slug, color: selectedColor, icon: selectedIcon });
      setName(''); setDescription(''); setSelectedColor(WORKSPACE_COLORS[0].value); setSelectedIcon('home');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create workspace');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10020 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl"
        style={{ borderColor: `rgba(${accentRgb}, 0.4)`, boxShadow: `0 0 40px rgba(${accentRgb}, 0.15)` }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `rgba(${accentRgb}, 0.2)` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb}, 0.15)`, border: `1.5px solid rgba(${accentRgb}, 0.3)` }}>
              <PlusIcon size={22} style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-mono">New Workspace</h2>
              <p className="text-xs text-gray-400 font-mono">{currentCount}/{maxCount} workspaces</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={20} /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[65vh] darkwave-scrollbar">
          {atLimit && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              Maximum of {maxCount} workspaces reached for your plan.
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-mono text-gray-400 mb-2">Workspace Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={40}
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none transition-all"
              style={{ borderColor: name ? `rgba(${accentRgb}, 0.4)` : undefined }}
              placeholder="e.g., Marketing, Operations..." disabled={atLimit} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-mono text-gray-400 mb-2">Description <span className="text-gray-600">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none resize-none transition-all"
              placeholder="What is this workspace for?" disabled={atLimit} />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-mono text-gray-400 mb-2">Color</label>
            <div className="grid grid-cols-6 gap-2">
              {WORKSPACE_COLORS.map(c => (
                <button key={c.value} onClick={() => setSelectedColor(c.value)} disabled={atLimit}
                  className="w-10 h-10 rounded-lg transition-all"
                  style={{
                    backgroundColor: `${c.value}20`,
                    border: selectedColor === c.value ? `2.5px solid ${c.value}` : `1.5px solid ${c.value}40`,
                    boxShadow: selectedColor === c.value ? `0 0 12px ${c.value}60` : 'none',
                  }}
                >
                  <div className="w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: c.value }} />
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-sm font-mono text-gray-400 mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {WORKSPACE_ICONS.map(icon => (
                <button key={icon} onClick={() => setSelectedIcon(icon)} disabled={atLimit}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono transition-all"
                  style={{
                    background: selectedIcon === icon ? `rgba(${accentRgb}, 0.15)` : 'rgba(0,0,0,0.5)',
                    border: selectedIcon === icon ? `2px solid ${accentColor}` : '1px solid rgba(75,85,99,0.4)',
                    color: selectedIcon === icon ? accentColor : '#9ca3af',
                  }}
                >
                  {icon.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {name && (
            <div className="p-3 rounded-xl" style={{ border: `1.5px solid ${selectedColor}40`, background: `${selectedColor}08` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ border: `1.5px solid ${selectedColor}60`, background: `${selectedColor}15` }}>
                  <span className="text-sm font-mono font-bold" style={{ color: selectedColor }}>{name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-mono font-medium text-sm">{name}</p>
                  {description && <p className="text-gray-500 font-mono text-xs truncate max-w-[200px]">{description}</p>}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t" style={{ borderColor: `rgba(${accentRgb}, 0.15)` }}>
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-900 transition-all font-mono">Cancel</button>
          <button onClick={handleSave} disabled={saving || atLimit || !name.trim()}
            className="flex-1 py-2.5 rounded-xl font-mono font-medium transition-all disabled:opacity-40"
            style={{ background: `rgba(${accentRgb}, 0.2)`, border: `1.5px solid rgba(${accentRgb}, 0.5)`, color: accentColor }}>
            {saving ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
