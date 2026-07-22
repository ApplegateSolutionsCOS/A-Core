import React, { useState } from 'react';
import { CloseIcon, PlusIcon } from '@/components/icons/Icons';
import { db } from '@/lib/dbProxy';


interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentOrganizationId?: string;
  userId?: string;
  currentCount: number;
  maxCount: number;
  onCreated?: (org: { id: string; name: string; domain: string }) => void;
  accentColor?: string;
  accentRgb?: string;
}

// Building icon
const OrgIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="6" x2="9" y2="6.01" />
    <line x1="15" y1="6" x2="15" y2="6.01" />
    <line x1="9" y1="10" x2="9" y2="10.01" />
    <line x1="15" y1="10" x2="15" y2="10.01" />
    <line x1="9" y1="14" x2="9" y2="14.01" />
    <line x1="15" y1="14" x2="15" y2="14.01" />
    <path d="M9 18h6" />
  </svg>
);

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen, onClose, parentOrganizationId, userId, currentCount, maxCount, onCreated,
  accentColor = '#a855f7', accentRgb = '168,85,247',
}) => {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const atLimit = currentCount >= maxCount;

  const handleSave = async () => {
    if (!name.trim()) { setError('Organization name is required'); return; }
    if (atLimit) { setError(`Maximum of ${maxCount} organizations reached`); return; }
    setError('');
    setSaving(true);
    try {
      const orgId = crypto.randomUUID ? crypto.randomUUID() : `org-${Date.now()}`;
      const { data, error: dbError } = await db.from('organizations').insert({

        id: orgId,
        name: name.trim(),
        domain: domain.trim() || `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.com`,
        subscription_tier: 'expert',
        monthly_base_price: 899,
        per_user_price: 19,
        max_workspaces: 30,
        max_organizations: 12,
        parent_organization_id: parentOrganizationId || null,
        is_active: true,
      }).select().single();

      if (dbError) throw dbError;
      if (onCreated) onCreated({ id: orgId, name: name.trim(), domain: domain.trim() });
      setName(''); setDomain('');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create organization');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10020 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        style={{ borderColor: `rgba(${accentRgb}, 0.4)`, boxShadow: `0 0 40px rgba(${accentRgb}, 0.15)` }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `rgba(${accentRgb}, 0.2)` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb}, 0.15)`, border: `1.5px solid rgba(${accentRgb}, 0.3)` }}>
              <OrgIcon size={22} style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-mono">New Organization</h2>
              <p className="text-xs text-gray-400 font-mono">{currentCount}/{maxCount} organizations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {atLimit && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              Maximum of {maxCount} organizations reached for your Expert plan.
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-mono text-gray-400 mb-2">Organization Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={60}
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none transition-all"
              style={{ borderColor: name ? `rgba(${accentRgb}, 0.4)` : undefined }}
              placeholder="e.g., Subsidiary Corp, Regional Office..." disabled={atLimit} />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-mono text-gray-400 mb-2">Domain <span className="text-gray-600">(optional)</span></label>
            <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
              className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none transition-all"
              placeholder="e.g., subsidiary.com" disabled={atLimit} />
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <p className="text-xs text-gray-400 font-mono">
              New organizations inherit your Expert plan features: up to 30 workspaces, all preset MiniApps, and dedicated support.
            </p>
          </div>

          {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t" style={{ borderColor: `rgba(${accentRgb}, 0.15)` }}>
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-900 transition-all font-mono">Cancel</button>
          <button onClick={handleSave} disabled={saving || atLimit || !name.trim()}
            className="flex-1 py-2.5 rounded-xl font-mono font-medium transition-all disabled:opacity-40"
            style={{ background: `rgba(${accentRgb}, 0.2)`, border: `1.5px solid rgba(${accentRgb}, 0.5)`, color: accentColor }}>
            {saving ? 'Creating...' : 'Create Organization'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrganizationModal;
