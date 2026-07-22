import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import {
  ShieldIcon,
  CheckIcon,
  CloseIcon,
  ActivityIcon,
  SettingsIcon,
  SearchIcon,
} from '@/components/icons/Icons';

// Icons
const HeartPulseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
  </svg>
);

const KeyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.3 9.3" /><path d="m18 5 3-3" /><path d="m15 8 3-3" />
  </svg>
);

const RotateIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
  </svg>
);

const ClockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const FingerprintIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" /><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M8.65 22c.21-.66.45-1.32.57-2" /><path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M2 16h.01" /><path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
  </svg>
);

interface CredentialInfo {
  integration_id: string;
  integration_name: string;
  is_connected: boolean;
  credential_health: string;
  expires_at: string | null;
  encryption_version: string;
  key_fingerprint: string;
  last_health_check_at: string | null;
  health_check_error: string | null;
  rotation_policy: { enabled: boolean; interval_days: number; auto_rotate: boolean; notify_days_before: number } | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  records_synced: number;
  sync_frequency: number;
  created_at: string;
  updated_at: string;
}

const CredentialHealthDashboard: React.FC = () => {
  const { organization } = useAuth();
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);
  const [healthCheckResults, setHealthCheckResults] = useState<any[] | null>(null);
  const [showRotationWizard, setShowRotationWizard] = useState(false);
  const [selectedForRotation, setSelectedForRotation] = useState<Set<string>>(new Set());
  const [rotationRunning, setRotationRunning] = useState(false);
  const [rotationResults, setRotationResults] = useState<any[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHealth, setFilterHealth] = useState<string>('all');

  const loadCredentials = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'list',
        organizationId: organization.id,
      });
      if (result.data?.integrations) {
        setCredentials(result.data.integrations);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  const runHealthCheck = async () => {
    if (!organization?.id) return;
    setHealthCheckRunning(true);
    setHealthCheckResults(null);
    try {
      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'health_check',
        organizationId: organization.id,
      });
      if (result.data?.results) {
        setHealthCheckResults(result.data.results);
        // Reload credentials to get updated health status
        await loadCredentials();
      }
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setHealthCheckRunning(false);
    }
  };

  const runRotation = async () => {
    if (!organization?.id || selectedForRotation.size === 0) return;
    setRotationRunning(true);
    setRotationResults(null);
    try {
      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'rotate_credentials',
        organizationId: organization.id,
        rotateIntegrationIds: Array.from(selectedForRotation),
      });
      if (result.data?.results) {
        setRotationResults(result.data.results);
        await loadCredentials();
      }
    } catch (err) {
      console.error('Rotation failed:', err);
    } finally {
      setRotationRunning(false);
    }
  };

  const getHealthBadge = (health: string) => {
    const configs: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
      valid: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]', label: 'Valid' },
      expired: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.8)]', label: 'Expired' },
      failing: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400 shadow-[0_0_6px_rgba(255,153,0,0.8)]', label: 'Failing' },
      rotating: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400 shadow-[0_0_6px_rgba(0,100,255,0.8)] animate-pulse', label: 'Rotating' },
      unknown: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', dot: 'bg-gray-400', label: 'Unknown' },
    };
    const c = configs[health] || configs.unknown;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${c.bg} ${c.text} border ${c.border}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  const getExpiryCountdown = (expiresAt: string | null) => {
    if (!expiresAt) return { text: 'No expiry', color: 'text-gray-500', urgent: false };
    const now = new Date();
    const exp = new Date(expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs <= 0) return { text: 'EXPIRED', color: 'text-red-400', urgent: true };
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    if (days > 30) return { text: `${days}d remaining`, color: 'text-green-400', urgent: false };
    if (days > 7) return { text: `${days}d ${hours}h remaining`, color: 'text-yellow-400', urgent: false };
    return { text: `${days}d ${hours}h remaining`, color: 'text-orange-400', urgent: true };
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  const filteredCreds = credentials.filter(c => {
    const matchesSearch = !searchQuery || c.integration_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.integration_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHealth = filterHealth === 'all' || c.credential_health === filterHealth;
    return matchesSearch && matchesHealth;
  });

  const healthCounts = {
    valid: credentials.filter(c => c.credential_health === 'valid').length,
    expired: credentials.filter(c => c.credential_health === 'expired').length,
    failing: credentials.filter(c => c.credential_health === 'failing').length,
    total: credentials.length,
  };

  const toggleRotationSelection = (id: string) => {
    setSelectedForRotation(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllForRotation = () => {
    if (selectedForRotation.size === credentials.length) {
      setSelectedForRotation(new Set());
    } else {
      setSelectedForRotation(new Set(credentials.map(c => c.integration_id)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-gray-400 font-mono text-sm">Loading credential health data...</span>
        </div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-center mx-auto mb-4">
          <HeartPulseIcon size={32} className="text-gray-700" />
        </div>
        <h3 className="text-lg font-mono font-medium text-white mb-2">No Saved Credentials</h3>
        <p className="text-gray-500 text-sm font-mono">Configure integrations in the Catalog tab to see credential health here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Credentials', value: healthCounts.total, color: 'cyan', icon: KeyIcon },
          { label: 'Healthy', value: healthCounts.valid, color: 'green', icon: CheckIcon },
          { label: 'Expired', value: healthCounts.expired, color: 'red', icon: ClockIcon },
          { label: 'Failing', value: healthCounts.failing, color: 'orange', icon: CloseIcon },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border bg-black/80 p-4 border-${card.color}-500/30`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${card.color}-500/10 border border-${card.color}-500/30 flex items-center justify-center`}>
                  <Icon size={20} className={`text-${card.color}-400`} />
                </div>
                <div>
                  <p className={`text-2xl font-mono font-bold text-${card.color}-400`}>{card.value}</p>
                  <p className="text-xs text-gray-500 font-mono">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={runHealthCheck}
          disabled={healthCheckRunning}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 transition-all font-mono text-sm disabled:opacity-50"
        >
          <HeartPulseIcon size={16} className={healthCheckRunning ? 'animate-pulse' : ''} />
          {healthCheckRunning ? 'Running Health Check...' : 'Run Health Check'}
        </button>
        <button
          onClick={() => setShowRotationWizard(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm"
        >
          <RotateIcon size={16} />
          Bulk Rotation Wizard
        </button>
        <button
          onClick={loadCredentials}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-500/10 border border-gray-500/30 text-gray-400 rounded-lg hover:bg-gray-500/20 transition-all font-mono text-sm"
        >
          <ActivityIcon size={16} />
          Refresh
        </button>

        <div className="flex-1" />

        {/* Filter */}
        <select
          value={filterHealth}
          onChange={e => setFilterHealth(e.target.value)}
          className="bg-black border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Health</option>
          <option value="valid">Valid</option>
          <option value="expired">Expired</option>
          <option value="failing">Failing</option>
          <option value="unknown">Unknown</option>
        </select>

        {/* Search */}
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="bg-black border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 w-48"
          />
        </div>
      </div>

      {/* Health Check Results Banner */}
      {healthCheckResults && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulseIcon size={16} className="text-green-400" />
            <span className="text-sm font-mono font-bold text-green-400">Health Check Complete</span>
            <button onClick={() => setHealthCheckResults(null)} className="ml-auto p-1 text-gray-500 hover:text-white"><CloseIcon size={14} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {healthCheckResults.map((r: any) => (
              <div key={r.integration_id} className="flex items-center gap-2 bg-black/50 rounded-lg px-3 py-2 border border-gray-800">
                <div className={`w-2 h-2 rounded-full ${r.health === 'valid' ? 'bg-green-400' : r.health === 'expired' ? 'bg-red-400' : 'bg-orange-400'}`} />
                <span className="text-xs font-mono text-white flex-1">{r.integration_id}</span>
                <span className={`text-[10px] font-mono ${r.health === 'valid' ? 'text-green-400' : 'text-red-400'}`}>{r.health}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credentials Table */}
      <div className="rounded-xl border border-cyan-500/20 bg-black/80 overflow-hidden">
        <div className="overflow-x-auto darkwave-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/10 to-transparent">
                <th className="text-left p-4 text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">Integration</th>
                <th className="text-left p-4 text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">Health</th>
                <th className="text-left p-4 text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">Expiry</th>
                <th className="text-left p-4 text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">Encryption</th>
                <th className="text-left p-4 text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">Key Fingerprint</th>
                <th className="text-left p-4 text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">Last Check</th>
                <th className="text-left p-4 text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">Rotation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredCreds.map(cred => {
                const expiry = getExpiryCountdown(cred.expires_at);
                return (
                  <tr key={cred.integration_id} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${cred.is_connected ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.8)]' : 'bg-gray-500'}`} />
                        <div>
                          <p className="text-white font-mono text-sm font-medium">{cred.integration_name || cred.integration_id}</p>
                          <p className="text-gray-600 font-mono text-[10px]">{cred.integration_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getHealthBadge(cred.credential_health || 'unknown')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <ClockIcon size={14} className={expiry.color} />
                        <div>
                          <p className={`text-xs font-mono font-medium ${expiry.color}`}>{expiry.text}</p>
                          {cred.expires_at && (
                            <p className="text-[10px] text-gray-600 font-mono">{new Date(cred.expires_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-[10px] font-mono">
                        {cred.encryption_version || 'v1'}
                      </span>
                    </td>
                    <td className="p-4">
                      {cred.key_fingerprint ? (
                        <div className="flex items-center gap-2">
                          <FingerprintIcon size={14} className="text-cyan-500" />
                          <code className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">{cred.key_fingerprint}</code>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 font-mono">N/A</span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-mono text-gray-400">{formatTimestamp(cred.last_health_check_at)}</p>
                      {cred.health_check_error && (
                        <p className="text-[10px] font-mono text-orange-400 mt-0.5">{cred.health_check_error}</p>
                      )}
                    </td>
                    <td className="p-4">
                      {cred.rotation_policy?.enabled ? (
                        <div className="flex items-center gap-1.5">
                          <RotateIcon size={12} className="text-cyan-400" />
                          <span className="text-[10px] font-mono text-cyan-400">
                            Every {cred.rotation_policy.interval_days}d
                            {cred.rotation_policy.auto_rotate && ' (auto)'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-gray-600">Manual</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredCreds.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500 font-mono text-sm">No credentials match your filter</p>
          </div>
        )}
      </div>

      {/* Bulk Rotation Wizard Modal */}
      {showRotationWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowRotationWizard(false); setRotationResults(null); }} />
          <div className="relative bg-black rounded-xl w-full max-w-2xl border border-cyan-500/40 shadow-[0_0_40px_rgba(0,255,255,0.15)] max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-transparent flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <RotateIcon size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-mono font-bold text-white">Bulk Credential Rotation</h3>
                    <p className="text-xs text-gray-500 font-mono">Re-encrypt credentials with fresh key material</p>
                  </div>
                </div>
                <button onClick={() => { setShowRotationWizard(false); setRotationResults(null); }} className="p-2 text-gray-400 hover:text-white"><CloseIcon size={20} /></button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto darkwave-scrollbar flex-1">
              {!rotationResults ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-400 font-mono">Select integrations to rotate:</p>
                    <button onClick={selectAllForRotation} className="text-xs font-mono text-cyan-400 hover:text-cyan-300">
                      {selectedForRotation.size === credentials.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 mb-6">
                    {credentials.map(cred => {
                      const isSelected = selectedForRotation.has(cred.integration_id);
                      const expiry = getExpiryCountdown(cred.expires_at);
                      return (
                        <button
                          key={cred.integration_id}
                          onClick={() => toggleRotationSelection(cred.integration_id)}
                          className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-all text-left ${
                            isSelected ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'border-cyan-400 bg-cyan-500/20' : 'border-gray-600'
                          }`}>
                            {isSelected && <CheckIcon size={12} className="text-cyan-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-mono text-sm">{cred.integration_name || cred.integration_id}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {getHealthBadge(cred.credential_health || 'unknown')}
                              <span className={`text-[10px] font-mono ${expiry.color}`}>{expiry.text}</span>
                            </div>
                          </div>
                          {cred.key_fingerprint && (
                            <code className="text-[10px] font-mono text-gray-600">{cred.key_fingerprint}</code>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <ShieldIcon size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-mono text-yellow-400 font-medium">Rotation Process</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-1">
                          Selected credentials will be decrypted and re-encrypted with fresh ML-KEM-1024 + SHA-512 derived key material.
                          Expiry dates will be reset based on each integration's rotation policy. This operation is non-destructive.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckIcon size={18} className="text-green-400" />
                    <span className="text-sm font-mono font-bold text-green-400">Rotation Complete</span>
                  </div>
                  {rotationResults.map((r: any) => (
                    <div key={r.integration_id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                      r.status === 'rotated' ? 'bg-green-500/5 border-green-500/30' : r.status === 'failed' ? 'bg-red-500/5 border-red-500/30' : 'bg-gray-900/50 border-gray-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${r.status === 'rotated' ? 'bg-green-400' : r.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'}`} />
                      <span className="text-sm font-mono text-white flex-1">{r.integration_id}</span>
                      <span className={`text-xs font-mono ${r.status === 'rotated' ? 'text-green-400' : 'text-red-400'}`}>
                        {r.status === 'rotated' ? 'Rotated' : r.status === 'failed' ? `Failed: ${r.reason}` : 'Skipped'}
                      </span>
                      {r.key_fingerprint && <code className="text-[10px] font-mono text-cyan-500">{r.key_fingerprint}</code>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 flex gap-3 flex-shrink-0">
              <button
                onClick={() => { setShowRotationWizard(false); setRotationResults(null); setSelectedForRotation(new Set()); }}
                className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 transition-all font-mono text-sm"
              >
                {rotationResults ? 'Close' : 'Cancel'}
              </button>
              {!rotationResults && (
                <button
                  onClick={runRotation}
                  disabled={selectedForRotation.size === 0 || rotationRunning}
                  className="flex-1 py-2.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-mono text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {rotationRunning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                      Rotating...
                    </>
                  ) : (
                    <>
                      <RotateIcon size={16} />
                      Rotate {selectedForRotation.size} Credential{selectedForRotation.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialHealthDashboard;
