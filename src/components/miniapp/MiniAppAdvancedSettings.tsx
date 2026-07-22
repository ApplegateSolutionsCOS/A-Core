import React, { useState, useEffect } from 'react';
import {
  CloseIcon, SettingsIcon, EyeOffIcon, EditIcon, BellIcon,
  TableIcon, CardLayoutIcon, BadgeIcon, CalendarIcon, SaveIcon, BuildIcon,
} from '@/components/icons/Icons';

import { getMiniAppIcon } from '@/components/miniapp/MiniAppIcons';
import IconPickerModal from './IconPickerModal';
import { db } from '@/lib/dbProxy';
import { supabase } from '@/lib/supabase';
import * as LucideIcons from 'lucide-react'; // ⚡ ADD THIS IMPORT

import { useAuth } from '@/contexts/AuthContext';

import { useAuth } from '@/contexts/AuthContext';

interface MiniAppAdvancedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  wsColor: { primary: string; rgb: string };
  isAdmin: boolean;
  workspaceId?: string;
  onEditTemplate?: (appName: string) => void;
}


const LAYOUT_OPTIONS = [
  { key: 'table', label: 'Table', icon: TableIcon },
  { key: 'card', label: 'Card', icon: CardLayoutIcon },
  { key: 'badge', label: 'Badge', icon: BadgeIcon },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
];

// Globe icon for SaveGlobally
const GlobeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// Local save icon
const LocalIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27,6.96 12,12.01 20.73,6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const MiniAppAdvancedSettings: React.FC<MiniAppAdvancedSettingsProps> = ({
  isOpen, onClose, appName, wsColor, isAdmin, workspaceId = '', onEditTemplate,
}) => {

  const { isPlatformOwner, user, organization } = useAuth();
  const [selectedIcon, setSelectedIcon] = useState('');
  const [defaultView, setDefaultView] = useState('table');
  const [helpText, setHelpText] = useState('');
  const [disableUserCreate, setDisableUserCreate] = useState(false);
  const [disableUserEdit, setDisableUserEdit] = useState(false);
  const [disableNotifications, setDisableNotifications] = useState(false);
  const [idPrefix, setIdPrefix] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ⚡ NEW: Track the real DB UUID and original record so we don't overwrite JSON data!
  const [actualDbId, setActualDbId] = useState<string | null>(null); 
  const [rawRecord, setRawRecord] = useState<any>(null);

  const isPlatOwner = isPlatformOwner();
  const AppIcon = getMiniAppIcon(appName);

  // Load existing settings from the real mini_apps table
  useEffect(() => {
    if (!isOpen || !organization?.id) return;
    setLoading(true);
    setSaveSuccess(null);
    
    const loadSettings = async () => {
      try {
        // ⚡ FIX: Added fallback 'none' variables to prevent PostgREST syntax errors!
        const safeWorkspaceId = workspaceId || 'none';
        const safeOrgId = organization?.id || 'none';

        const { data, error } = await supabase
          .schema('app_private')
          .from('mini_apps')
          .select('*')
          .eq('name', appName)
          .or(`workspace_id.eq.${safeWorkspaceId},organization_id.eq.${safeOrgId},is_preset.eq.true`)
          .order('organization_id', { ascending: false })
          .limit(1)
          .single();
        
        if (!error && data) {
          setActualDbId(data.id);
          setRawRecord(data);

          // Safely parse JSON columns
          const appSettings = typeof data.app_settings === 'string' ? JSON.parse(data.app_settings || '{}') : (data.app_settings || {});
          const itemIdSettings = typeof data.item_id_settings === 'string' ? JSON.parse(data.item_id_settings || '{}') : (data.item_id_settings || {});

          // Hydrate the UI
          setSelectedIcon(data.icon || 'grid');
          setDefaultView(appSettings.defaultLayout || 'table');
          setHelpText(data.description || '');
          setIdPrefix(itemIdSettings.prefix || '');
          setDisableUserCreate(appSettings.disable_user_creation || false);
          setDisableUserEdit(appSettings.disable_user_edits || false);
          setDisableNotifications(appSettings.disable_notifications || false);
        }
      } catch (err) {
        console.error('Error loading miniapp settings from mini_apps table:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [isOpen, appName, workspaceId, organization?.id]);

  if (!isOpen) return null;

  const handleSave = async (scope: 'local' | 'global') => {
    if (!actualDbId || !rawRecord) {
      setSaveSuccess('Error: App settings not fully loaded. Try closing and reopening.'); // ⚡ FIX: Actually show an error instead of silently failing
      return;
    }
    
    setSaving(true);
    setSaveSuccess(null);
    
    try {
      // 1. Parse current JSON objects so we ONLY update specific keys and preserve the rest (like layout arrays)
      const currentAppSettings = typeof rawRecord.app_settings === 'string' ? JSON.parse(rawRecord.app_settings || '{}') : (rawRecord.app_settings || {});
      const currentItemIdSettings = typeof rawRecord.item_id_settings === 'string' ? JSON.parse(rawRecord.item_id_settings || '{}') : (rawRecord.item_id_settings || {});
      const currentSchemaDef = typeof rawRecord.schema_definition === 'string' ? JSON.parse(rawRecord.schema_definition || '{}') : (rawRecord.schema_definition || {});

      // 2. Build the updated JSON payloads
      const updatedAppSettings = {
        ...currentAppSettings,
        defaultLayout: defaultView,
        disable_user_creation: disableUserCreate,
        disable_user_edits: disableUserEdit,
        disable_notifications: disableNotifications
      };

      const updatedItemIdSettings = {
        ...currentItemIdSettings,
        prefix: idPrefix
      };

      const updatedSchemaDef = {
        ...currentSchemaDef,
        icon: selectedIcon,
        description: helpText
      };

      // 3. Build the final database payload
      const updates = {
        icon: selectedIcon,
        description: helpText,
        app_settings: updatedAppSettings,
        item_id_settings: updatedItemIdSettings,
        schema_definition: updatedSchemaDef,
        updated_at: new Date().toISOString()
      };

      // 4. Fire to Database
      if (scope === 'local') {
        const { error } = await supabase
          .schema('app_private')
          .from('mini_apps')
          .update(updates)
          .eq('id', actualDbId); // Update just this specific instance

        if (error) throw error;
        setSaveSuccess('Saved successfully! Reloading workspace...');
        setTimeout(() => window.location.reload(), 1200); // ⚡ FIX: Reload the workspace after a 1.2 second delay!
        
      } else if (scope === 'global' && isPlatOwner) {
        // Global save: update ALL instances of this MiniApp across the entire platform
        const { error } = await supabase
          .schema('app_private')
          .from('mini_apps')
          .update(updates)
          .eq('name', appName); // Update all apps that share this name

        if (error) throw error;
        setSaveSuccess('Saved globally! Reloading workspace...');
        setTimeout(() => window.location.reload(), 1200); // ⚡ FIX: Reload the workspace after a 1.2 second delay!
      }
    } catch (err) {
      console.error('Error saving miniapp settings:', err);
      setSaveSuccess('Error saving settings');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const ToggleSwitch = ({ value, onChange, label, description, color = wsColor.primary }: {
    value: boolean; onChange: (v: boolean) => void; label: string; description: string; color?: string;
  }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div onClick={() => onChange(!value)}
        className="w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 mt-0.5"
        style={{ backgroundColor: value ? color : '#475569' }}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <div>
        <span className="text-sm text-white font-mono block">{label}</span>
        <span className="text-xs text-gray-500 font-mono">{description}</span>
      </div>
    </label>
  );

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ border: `1px solid rgba(${wsColor.rgb}, 0.4)`, boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.2)` }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.08), transparent)` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ border: `1.5px solid rgba(${wsColor.rgb}, 0.5)`, background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.15), rgba(0,0,0,0.9))` }}>
              <SettingsIcon size={20} style={{ color: wsColor.primary }} />
            </div>
            <div>
              <h3 className="text-lg font-mono font-bold text-white">Advanced Settings</h3>
              <p className="text-xs text-gray-500 font-mono">{appName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg"><CloseIcon size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, borderTopColor: wsColor.primary }} />
            </div>
          ) : (
            <>
              {/* App Icon */}
              <div className="bg-gray-900/50 rounded-xl p-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.2)` }}>
                <h4 className="text-sm font-mono font-medium text-white mb-3">App Icon</h4>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowIconPicker(true)}
                    className="w-14 h-14 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{ border: `2px solid rgba(${wsColor.rgb}, 0.4)`, background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.1), rgba(0,0,0,0.8))` }}>
                    
                    {/* ⚡ FIX: Render the selected Lucide icon, fallback to the default app icon */}
                    {(() => {
                      if (selectedIcon && (LucideIcons as any)[selectedIcon]) {
                        const SelectedLucideIcon = (LucideIcons as any)[selectedIcon];
                        return <SelectedLucideIcon size={28} style={{ color: wsColor.primary }} />;
                      }
                      return <AppIcon size={28} style={{ color: wsColor.primary }} />;
                    })()}

                  </button>
                  <div>
                    <button onClick={() => setShowIconPicker(true)} className="text-sm font-mono transition-all" style={{ color: wsColor.primary }}>
                      Change Icon
                    </button>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">Click to choose from icon library</p>
                  </div>
                </div>
              </div>

              {/* Default View/Layout */}
              <div className="bg-gray-900/50 rounded-xl p-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.2)` }}>
                <h4 className="text-sm font-mono font-medium text-white mb-3">Default View</h4>
                <div className="grid grid-cols-4 gap-2">
                  {LAYOUT_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const isActive = defaultView === opt.key;
                    return (
                      <button key={opt.key} onClick={() => setDefaultView(opt.key)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all"
                        style={{
                          background: isActive ? `rgba(${wsColor.rgb}, 0.15)` : 'transparent',
                          border: `1.5px solid ${isActive ? `rgba(${wsColor.rgb}, 0.5)` : 'rgba(255,255,255,0.08)'}`,
                          color: isActive ? wsColor.primary : '#9ca3af',
                        }}>
                        <Icon size={22} />
                        <span className="text-xs font-mono">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-gray-900/50 rounded-xl p-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.2)` }}>
                <h4 className="text-sm font-mono font-medium text-white mb-2">Help Text</h4>
                <p className="text-xs text-gray-500 font-mono mb-2">Appears on hover over the app tab</p>
                <textarea value={helpText} onChange={e => setHelpText(e.target.value)}
                  className="w-full bg-black/50 border rounded-lg px-3 py-2 text-white font-mono text-sm h-20 resize-none focus:outline-none"
                  style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
                  placeholder="Describe what this mini app is used for..."
                  onFocus={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.6)`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.3)`; }}
                />
              </div>

              {/* Alpha-Numeric ID Prefix */}
              <div className="bg-gray-900/50 rounded-xl p-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.2)` }}>
                <h4 className="text-sm font-mono font-medium text-white mb-2">Item ID Prefix</h4>
                <p className="text-xs text-gray-500 font-mono mb-2">Alpha-numeric prefix for all unique IDs in this app</p>
                <div className="flex items-center gap-3">
                  <input type="text" value={idPrefix}
                    onChange={e => setIdPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                    className="w-32 bg-black/50 border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                    style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
                    placeholder="e.g., INV"
                    maxLength={10}
                    onFocus={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.6)`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.3)`; }}
                  />
                  <span className="text-xs text-gray-500 font-mono">
                    Preview: <span style={{ color: wsColor.primary }}>{idPrefix || 'APP'}-0001</span>
                  </span>
                </div>
              </div>

              {/* Access Controls */}
              <div className="bg-gray-900/50 rounded-xl p-4 space-y-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.2)` }}>
                <h4 className="text-sm font-mono font-medium text-white">Access Controls</h4>
                <ToggleSwitch value={disableUserCreate} onChange={setDisableUserCreate}
                  label="Disable User Creation" description="Prevent normal users from creating items in this app"
                  color="#ef4444" />
                <ToggleSwitch value={disableUserEdit} onChange={setDisableUserEdit}
                  label="Disable User Edits" description="Prevent normal users from editing items in this app"
                  color="#f97316" />
                <ToggleSwitch value={disableNotifications} onChange={setDisableNotifications}
                  label="Disable Notifications" description="Disable all notifications and activity feed entries for this app"
                  color="#a855f7" />
              </div>

              {/* Template Button - opens MiniApp Builder with existing fields */}
              {isAdmin && onEditTemplate && (
                <div className="bg-gray-900/50 rounded-xl p-4" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.2)` }}>
                  <h4 className="text-sm font-mono font-medium text-white mb-2">Template Builder</h4>
                  <p className="text-xs text-gray-500 font-mono mb-3">Open the MiniApp Builder to edit fields, layouts, and schema for this app</p>
                  <button
                    onClick={() => { onClose(); onEditTemplate(appName); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm font-medium transition-all"
                    style={{ background: wsColor.primary, color: '#000', boxShadow: `0 0 20px rgba(${wsColor.rgb}, 0.3)` }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 30px rgba(${wsColor.rgb}, 0.5)`; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 20px rgba(${wsColor.rgb}, 0.3)`; }}
                  >
                    <BuildIcon size={16} />
                    Template
                  </button>
                </div>
              )}
            </>
          )}
        </div>


        {/* Footer with SaveLocally / SaveGlobally */}
        <div className="flex items-center justify-between gap-3 p-4 border-t" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)` }}>
          {/* Save status */}
          <div className="flex-1">
            {saveSuccess && (
              <p className="text-xs font-mono" style={{ color: saveSuccess.includes('Error') ? '#ef4444' : '#22c55e' }}>
                {saveSuccess}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm">
              Cancel
            </button>
            
            {/* Save Locally */}
            <button 
              onClick={() => handleSave('local')} 
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all disabled:opacity-50"
              style={{ background: `rgba(${wsColor.rgb}, 0.15)`, border: `1px solid rgba(${wsColor.rgb}, 0.4)`, color: wsColor.primary }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, borderTopColor: wsColor.primary }} />
              ) : (
                <LocalIcon size={16} />
              )}
              Save Locally
            </button>
            
            {/* Save Globally - Only for Platform Owner */}
            {isPlatOwner && (
              <button 
                onClick={() => handleSave('global')} 
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all disabled:opacity-50"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                ) : (
                  <GlobeIcon size={16} />
                )}
                Save Globally
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Icon Picker */}
      <IconPickerModal 
        isOpen={showIconPicker} 
        onClose={() => setShowIconPicker(false)}
        onSelect={(icon) => { 
          setSelectedIcon(icon); 
          setShowIconPicker(false); // ⚡ FIX: Automatically close the modal when an icon is picked
        }} 
        currentIcon={selectedIcon} 
        wsColor={wsColor} 
      />
    </div>
  );
};

export default MiniAppAdvancedSettings;
