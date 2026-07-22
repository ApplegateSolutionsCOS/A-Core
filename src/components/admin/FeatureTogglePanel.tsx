/**
 * Feature Toggle Panel - Platform Owner controls what features
 * are visible to Organization Admins
 */

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/dbProxy';
import { 
  ShieldIcon, SettingsIcon, EyeIcon, EyeOffIcon, SearchIcon, CheckIcon
} from '@/components/icons/Icons';

interface FeatureToggle {
  id: string;
  feature_key: string;
  feature_name: string;
  feature_category: string;
  description: string;
  is_enabled_for_org_admins: boolean;
  is_enabled_for_org_managers: boolean;
  is_enabled_for_org_users: boolean;
  requires_tier: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  admin_tabs: { label: 'Admin Panel Tabs', color: 'cyan', icon: 'settings' },
  security_widgets: { label: 'Security Workspace Widgets', color: 'red', icon: 'shield' },
  integrations: { label: 'Integrations', color: 'green', icon: 'build' },
  general: { label: 'General Features', color: 'purple', icon: 'settings' },
  security: { label: 'Security Features', color: 'orange', icon: 'shield' },
};

const FeatureTogglePanel: React.FC = () => {
  const [toggles, setToggles] = useState<FeatureToggle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchToggles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await db.from('feature_toggles').select('*').order('feature_category');
      if (data) setToggles(data);
    } catch (err) {
      console.error('Error fetching feature toggles:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchToggles();
  }, [fetchToggles]);

  const handleToggle = async (toggle: FeatureToggle, field: 'is_enabled_for_org_admins' | 'is_enabled_for_org_managers' | 'is_enabled_for_org_users') => {
    const newValue = !toggle[field];
    setSavingId(toggle.id);

    // Optimistic update
    setToggles(prev => prev.map(t => t.id === toggle.id ? { ...t, [field]: newValue } : t));

    try {
      await db.from('feature_toggles').update({ [field]: newValue }).eq('id', toggle.id);
    } catch (err) {
      // Revert on error
      setToggles(prev => prev.map(t => t.id === toggle.id ? { ...t, [field]: !newValue } : t));
      console.error('Error updating toggle:', err);
    }
    setSavingId(null);
  };

  const handleBulkToggle = async (category: string, field: 'is_enabled_for_org_admins', value: boolean) => {
    const categoryToggles = toggles.filter(t => t.feature_category === category);
    
    // Optimistic update
    setToggles(prev => prev.map(t => t.feature_category === category ? { ...t, [field]: value } : t));

    for (const toggle of categoryToggles) {
      try {
        await db.from('feature_toggles').update({ [field]: value }).eq('id', toggle.id);
      } catch (err) {
        console.error('Error bulk updating:', err);
      }
    }
  };

  const categories = [...new Set(toggles.map(t => t.feature_category))];
  
  const filteredToggles = toggles.filter(t => {
    const matchesSearch = !searchQuery || 
      t.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || t.feature_category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedToggles = filteredToggles.reduce((acc, t) => {
    if (!acc[t.feature_category]) acc[t.feature_category] = [];
    acc[t.feature_category].push(t);
    return acc;
  }, {} as Record<string, FeatureToggle[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-400 font-mono text-sm">Loading feature toggles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative rounded-xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-950/20 to-cyan-950/20 p-5 overflow-hidden">
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="relative z-10">
          <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3 mb-2">
            <ShieldIcon size={20} className="text-fuchsia-400" />
            Organization Admin Feature Controls
          </h3>
          <p className="text-gray-400 font-mono text-sm">
            Toggle which features, tabs, and widgets are available to Organization Admins. 
            Changes take effect immediately for all organizations.
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search features..."
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500/50 transition-all"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-300 font-mono text-sm focus:outline-none focus:border-fuchsia-500/50"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]?.label || cat}</option>
          ))}
        </select>
      </div>

      {/* Toggle Groups */}
      {Object.entries(groupedToggles).map(([category, items]) => {
        const catInfo = CATEGORY_LABELS[category] || { label: category, color: 'gray' };
        const allEnabled = items.every(t => t.is_enabled_for_org_admins);
        const noneEnabled = items.every(t => !t.is_enabled_for_org_admins);

        return (
          <div key={category} className="rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
            {/* Category Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  allEnabled ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.5)]' :
                  noneEnabled ? 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.5)]' :
                  'bg-yellow-400 shadow-[0_0_6px_rgba(255,255,0,0.5)]'
                }`} />
                <h4 className="text-white font-mono font-bold text-sm">{catInfo.label}</h4>
                <span className="text-gray-600 font-mono text-xs">
                  {items.filter(t => t.is_enabled_for_org_admins).length}/{items.length} enabled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkToggle(category, 'is_enabled_for_org_admins', true)}
                  className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg font-mono text-xs hover:bg-green-500/20 transition-all"
                >
                  Enable All
                </button>
                <button
                  onClick={() => handleBulkToggle(category, 'is_enabled_for_org_admins', false)}
                  className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg font-mono text-xs hover:bg-red-500/20 transition-all"
                >
                  Disable All
                </button>
              </div>
            </div>

            {/* Toggle Items */}
            <div className="divide-y divide-gray-800/50">
              {items.map(toggle => (
                <div key={toggle.id} className="flex items-center justify-between p-4 hover:bg-gray-900/30 transition-colors">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">{toggle.feature_name}</span>
                      {toggle.requires_tier !== 'basic' && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 font-mono text-[10px] uppercase">
                          {toggle.requires_tier}+
                        </span>
                      )}
                    </div>
                    {toggle.description && (
                      <p className="text-gray-600 font-mono text-xs mt-0.5">{toggle.description}</p>
                    )}
                  </div>

                  {/* Toggle switches */}
                  <div className="flex items-center gap-4">
                    {/* Org Admins */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-mono text-[10px] uppercase w-12 text-right">Admin</span>
                      <button
                        onClick={() => handleToggle(toggle, 'is_enabled_for_org_admins')}
                        className={`relative w-11 h-6 rounded-full transition-all ${
                          toggle.is_enabled_for_org_admins
                            ? 'bg-green-500/30 border border-green-500/50'
                            : 'bg-gray-800 border border-gray-700'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                          toggle.is_enabled_for_org_admins
                            ? 'left-5 bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.5)]'
                            : 'left-0.5 bg-gray-500'
                        }`}>
                          {savingId === toggle.id && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Visibility icon */}
                    <div className={`p-1 rounded ${toggle.is_enabled_for_org_admins ? 'text-green-400' : 'text-gray-700'}`}>
                      {toggle.is_enabled_for_org_admins ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filteredToggles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 font-mono text-sm">No features match your search.</p>
        </div>
      )}
    </div>
  );
};

export default FeatureTogglePanel;
