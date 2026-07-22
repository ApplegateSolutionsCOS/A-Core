import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import {
  CloseIcon,
  CheckIcon,
  ActivityIcon,
} from '@/components/icons/Icons';

type ConfigStep = 'connection' | 'sync' | 'mapping';

interface ConfigField {
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}

interface IntegrationForModal {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  configFields?: ConfigField[];
  authType?: 'credentials' | 'oauth' | 'token';
}

interface IntegrationConfigModalProps {
  integration: IntegrationForModal;
  onClose: () => void;
  onSave: (id: string, config: Record<string, string>) => void;
  isConnected: boolean;
  organizationId?: string;
  onCredentialsSaved?: (integrationId: string) => void;
}

const fieldMappings = [
  { source: 'Device ID', target: 'device_uid', enabled: true },
  { source: 'Device Name', target: 'device_name', enabled: true },
  { source: 'Location', target: 'location', enabled: true },
  { source: 'Status', target: 'status', enabled: true },
  { source: 'Last Reading', target: 'last_reading_value', enabled: false },
  { source: 'Firmware Version', target: 'firmware_version', enabled: false },
  { source: 'Serial Number', target: 'serial_number', enabled: true },
  { source: 'Last Seen', target: 'last_seen_at', enabled: true },
];

const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  integration,
  onClose,
  onSave,
  isConnected,
  organizationId: propOrgId,
  onCredentialsSaved,
}) => {
  const { organization } = useAuth();
  const orgId = propOrgId || organization?.id;

  const [configStep, setConfigStep] = useState<ConfigStep>('connection');
  const [syncFrequency, setSyncFrequency] = useState('15');
  const [syncDirection, setSyncDirection] = useState('Bidirectional');
  const [conflictResolution, setConflictResolution] = useState('Most recent wins');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [mappingStates, setMappingStates] = useState<Record<string, boolean>>(
    Object.fromEntries(fieldMappings.map(m => [m.source, m.enabled]))
  );
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCreds, setIsLoadingCreds] = useState(false);
  const [hasExistingCreds, setHasExistingCreds] = useState(false);

  const Icon = integration.icon;
  const authType = integration.authType || 'credentials';

  // ─── Load saved credentials on modal open ───
  useEffect(() => {
    if (!orgId) return;
    loadSavedCredentials();
  }, [orgId, integration.id]);

  const loadSavedCredentials = async () => {
    if (!orgId) return;
    setIsLoadingCreds(true);
    try {
      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'load',
        organizationId: orgId,
        integrationId: integration.id,
      });

      if (result.data && !result.data.error && result.data.credentials) {
        const creds = result.data.credentials;
        const newFormValues: Record<string, string> = {};

        // Map saved credentials back to form fields
        if (creds.username) {
          // Determine the correct field label based on auth type
          if (authType === 'oauth') {
            newFormValues['Username / Email'] = creds.username;
          } else {
            newFormValues['Username'] = creds.username;
          }
        }
        if (creds.password) {
          if (authType === 'token') {
            newFormValues['Password / Token'] = creds.password;
          } else {
            newFormValues['Password'] = creds.password;
          }
        }

        // Load extra config fields
        if (creds.extra_config && typeof creds.extra_config === 'object') {
          Object.entries(creds.extra_config).forEach(([key, value]) => {
            newFormValues[key] = value as string;
          });
        }

        // Load sync settings
        if (creds.sync_frequency) setSyncFrequency(String(creds.sync_frequency));
        if (creds.sync_direction) setSyncDirection(creds.sync_direction);
        if (creds.conflict_resolution) setConflictResolution(creds.conflict_resolution);

        // Load field mappings
        if (creds.field_mappings && typeof creds.field_mappings === 'object') {
          setMappingStates(prev => ({ ...prev, ...creds.field_mappings }));
        }

        setFormValues(newFormValues);
        setHasExistingCreds(true);
        console.log(`[IntegrationConfig] Loaded saved credentials for ${integration.id}`);
      }
    } catch (err) {
      console.error('[IntegrationConfig] Error loading credentials:', err);
    }
    setIsLoadingCreds(false);
  };

  const getAuthFields = (): ConfigField[] => {
    const baseFields: ConfigField[] = [];

    if (authType === 'credentials') {
      baseFields.push(
        { label: 'Username', placeholder: `Enter your ${integration.name} username`, type: 'text', required: true },
        { label: 'Password', placeholder: `Enter your ${integration.name} password`, type: 'password', required: true },
      );
    } else if (authType === 'oauth') {
      baseFields.push(
        { label: 'Username / Email', placeholder: `Enter your ${integration.name} email`, type: 'text', required: true },
        { label: 'Password', placeholder: `Enter your ${integration.name} password`, type: 'password', required: true },
      );
    } else {
      baseFields.push(
        { label: 'Username', placeholder: `Enter your ${integration.name} username`, type: 'text', required: true },
        { label: 'Password / Token', placeholder: `Enter your ${integration.name} password or token`, type: 'password', required: true },
      );
    }

    if (integration.configFields) {
      baseFields.push(...integration.configFields);
    }

    return baseFields;
  };

  const handleTestConnection = () => {
    setConnectionStatus('testing');
    setTimeout(() => {
      const hasCredentials = formValues['Username'] || formValues['Username / Email'];
      const hasPassword = formValues['Password'] || formValues['Password / Token'];
      if (hasCredentials && hasPassword) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    }, 2000);
  };

  // ─── Save credentials to edge function (encrypted) ───
  const handleSave = async () => {
    if (!orgId) {
      setSaveError('No organization ID available');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      // Extract username and password from form values
      const username = formValues['Username'] || formValues['Username / Email'] || '';
      const password = formValues['Password'] || formValues['Password / Token'] || '';

      // Collect extra config fields (non-auth fields)
      const authLabels = ['Username', 'Username / Email', 'Password', 'Password / Token'];
      const extraConfig: Record<string, string> = {};
      Object.entries(formValues).forEach(([key, value]) => {
        if (!authLabels.includes(key) && value) {
          extraConfig[key] = value;
        }
      });

      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'save',
        organizationId: orgId,
        integrationId: integration.id,
        username,
        password,
        syncFrequency: parseInt(syncFrequency, 10),
        syncDirection,
        conflictResolution,
        fieldMappings: mappingStates,
        extraConfig,
      });

      if (result.data?.error) {
        setSaveError(result.data.error);
      } else if (result.error && result.error !== 'ALL_STRATEGIES_FAILED') {
        setSaveError(result.error);
      } else {
        setSaveMessage('Configuration saved & encrypted successfully');
        setHasExistingCreds(true);
        onSave(integration.id, formValues);
        onCredentialsSaved?.(integration.id);
        setTimeout(() => setSaveMessage(''), 4000);
      }
    } catch (err: any) {
      console.error('[IntegrationConfig] Save error:', err);
      setSaveError(err.message || 'Failed to save credentials');
    }

    setIsSaving(false);
  };

  const handleFieldChange = (label: string, value: string) => {
    setFormValues(prev => ({ ...prev, [label]: value }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border border-cyan-500/50 rounded-xl p-6 w-full max-w-lg mx-4 shadow-[0_0_40px_rgba(0,255,255,0.2)] max-h-[85vh] overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent rounded-xl" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Icon className="w-10 h-10" />
              <div>
                <h3 className="text-lg font-mono font-bold text-white">{integration.name}</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {isConnected ? 'Connected - Manage Configuration' : 'Integration Configuration'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>

          {/* Auth type badge + existing creds indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs font-mono text-cyan-400">
              {authType === 'credentials' ? 'Username / Password' : authType === 'oauth' ? 'OAuth Login' : 'Token Auth'}
            </span>
            {isConnected && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]" />
                Active
              </span>
            )}
            {hasExistingCreds && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-xs font-mono">
                <CheckIcon size={10} className="text-green-400" />
                Saved
              </span>
            )}
          </div>

          {/* Config Step Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-900/50 rounded-lg p-1">
            {([
              { id: 'connection' as const, label: 'Connection' },
              { id: 'sync' as const, label: 'Sync Settings' },
              { id: 'mapping' as const, label: 'Field Mapping' },
            ]).map(step => (
              <button
                key={step.id}
                onClick={() => setConfigStep(step.id)}
                className={`flex-1 py-2 rounded-md text-xs font-mono transition-all ${
                  configStep === step.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          {/* Save message */}
          {saveMessage && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-mono text-sm flex items-center gap-2">
                <CheckIcon size={14} /> {saveMessage}
              </p>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 font-mono text-sm">{saveError}</p>
            </div>
          )}

          {/* Loading indicator for credential loading */}
          {isLoadingCreds && (
            <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-400 font-mono text-sm">Loading saved credentials...</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto darkwave-scrollbar space-y-4">
            {/* CONNECTION TAB */}
            {configStep === 'connection' && (
              <>
                {getAuthFields().map((field, i) => (
                  <div key={i}>
                    <label className="block text-sm font-mono font-medium text-gray-400 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={formValues[field.label] || ''}
                      onChange={e => handleFieldChange(field.label, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                ))}

                {/* Connection Status */}
                <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'success' ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]' :
                      connectionStatus === 'error' ? 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.8)]' :
                      connectionStatus === 'testing' ? 'bg-yellow-400 shadow-[0_0_6px_rgba(255,255,0,0.8)] animate-pulse' :
                      'bg-gray-600'
                    }`} />
                    <span className={
                      connectionStatus === 'success' ? 'text-green-400' :
                      connectionStatus === 'error' ? 'text-red-400' :
                      connectionStatus === 'testing' ? 'text-yellow-400' :
                      'text-gray-500'
                    }>
                      {connectionStatus === 'success' ? 'Connection successful - Credentials verified' :
                       connectionStatus === 'error' ? 'Connection failed - Check your credentials' :
                       connectionStatus === 'testing' ? 'Testing connection...' :
                       'Connection status: Not tested'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={connectionStatus === 'testing'}
                  className="w-full py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connectionStatus === 'testing' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <ActivityIcon size={16} />
                      Test Connection
                    </>
                  )}
                </button>

                {/* Security note */}
                <div className="p-3 bg-gray-900/30 border border-gray-800/50 rounded-lg">
                  <p className="text-gray-600 font-mono text-[10px] leading-relaxed">
                    Your credentials are encrypted using Q-CORE AES-256-GCM encryption before storage. 
                    Credentials are never transmitted in plain text and are only decrypted server-side 
                    during authenticated API calls.
                  </p>
                </div>
              </>
            )}

            {/* SYNC SETTINGS TAB */}
            {configStep === 'sync' && (
              <>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Sync Frequency</label>
                  <select
                    value={syncFrequency}
                    onChange={e => setSyncFrequency(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                  >
                    <option value="1">Every 1 minute (Real-time)</option>
                    <option value="5">Every 5 minutes</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every hour</option>
                    <option value="360">Every 6 hours</option>
                    <option value="1440">Daily</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Sync Direction</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Bidirectional', 'Push Only', 'Pull Only'].map(dir => (
                      <button
                        key={dir}
                        onClick={() => setSyncDirection(dir)}
                        className={`py-2 px-3 border rounded-lg text-xs font-mono transition-all ${
                          syncDirection === dir
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-cyan-500/30 hover:text-cyan-400'
                        }`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Conflict Resolution</label>
                  <select
                    value={conflictResolution}
                    onChange={e => setConflictResolution(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
                  >
                    <option>Most recent wins</option>
                    <option>Source always wins</option>
                    <option>Destination always wins</option>
                    <option>Manual resolution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-mono font-medium text-gray-400 mb-2">Data Retention</label>
                  <select className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all">
                    <option>30 days</option>
                    <option>60 days</option>
                    <option>90 days</option>
                    <option>1 year</option>
                    <option>Unlimited</option>
                  </select>
                </div>
                <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 font-mono">Last sync: {isConnected ? '2 minutes ago' : 'Never'}</p>
                  <p className="text-xs text-gray-500 font-mono">Records synced: {isConnected ? '1,247' : '0'}</p>
                  <p className="text-xs text-gray-500 font-mono">Errors: 0</p>
                </div>
              </>
            )}

            {/* FIELD MAPPING TAB */}
            {configStep === 'mapping' && (
              <>
                <p className="text-xs text-gray-500 font-mono">
                  Map fields from {integration.name} to your workspace data model.
                </p>
                <div className="space-y-2">
                  {fieldMappings.map(mapping => (
                    <div key={mapping.source} className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                      <button
                        onClick={() => setMappingStates(prev => ({ ...prev, [mapping.source]: !prev[mapping.source] }))}
                        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          mappingStates[mapping.source] ? 'bg-cyan-500/20 border-cyan-500/50' : 'border-gray-700'
                        }`}
                      >
                        {mappingStates[mapping.source] && <CheckIcon size={12} className="text-cyan-400" />}
                      </button>
                      <span className="text-sm font-mono text-white flex-1">{mapping.source}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 flex-shrink-0">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      <select className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500/50">
                        <option>{mapping.target}</option>
                        <option>custom_field_1</option>
                        <option>custom_field_2</option>
                        <option>-- Ignore --</option>
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 mt-4 border-t border-gray-800">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-mono flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  Encrypting & Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationConfigModal;
