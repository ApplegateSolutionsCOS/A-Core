import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AlertConfig {
  id: string;
  config_name: string;
  recipient_emails: string[];
  severity_threshold: string;
  alert_frequency_minutes: number;
  is_enabled: boolean;
  last_alert_sent_at: string | null;
  alerts_sent_today: number;
  max_alerts_per_day: number;
  include_geo_data: boolean;
  include_threat_details: boolean;
  created_by: string;
  created_at: string;
}

// Inline SVG icons
const MailIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
);
const SaveIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
);
const SendIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const CheckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12" /></svg>
);
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);

const EmailAlertConfig: React.FC = () => {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingAlerts, setIsSendingAlerts] = useState(false);
  const [sendGridConfigured, setSendGridConfigured] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Form state
  const [editConfig, setEditConfig] = useState<Partial<AlertConfig>>({
    config_name: 'default',
    recipient_emails: [],
    severity_threshold: 'high',
    alert_frequency_minutes: 15,
    is_enabled: true,
    max_alerts_per_day: 50,
    include_geo_data: true,
    include_threat_details: true,
  });

  const fetchConfigs = useCallback(async () => {
    try {
      // Check health for SendGrid status
      const { data: healthData } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'health_check' }
      });
      if (healthData?.success) {
        setSendGridConfigured(healthData.status?.sendGridConfigured || false);
      }

      const { data } = await supabase.functions.invoke('security-email-alerts', {
        body: { action: 'get_config' }
      });
      if (data?.success && data.configs?.length > 0) {
        setConfigs(data.configs);
        setEditConfig(data.configs[0]);
      }
    } catch (e) {
      console.error('Config fetch error:', e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data } = await supabase.functions.invoke('security-email-alerts', {
        body: {
          action: 'save_config',
          ...editConfig,
        }
      });
      if (data?.success) {
        toast.success(data.message || 'Config saved');
        fetchConfigs();
      } else {
        toast.error(data?.error || 'Failed to save');
      }
    } catch (e) {
      toast.error('Failed to save config');
    }
    setIsSaving(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) { toast.error('Enter a test email address'); return; }
    setIsSending(true);
    try {
      const { data } = await supabase.functions.invoke('security-email-alerts', {
        body: { action: 'send_test', email: testEmail }
      });
      if (data?.success) {
        toast.success(data.message || 'Test email sent');
      } else {
        toast.error(data?.error || 'Failed to send test email');
      }
    } catch (e) {
      toast.error('Failed to send test email');
    }
    setIsSending(false);
  };

  const handleTriggerAlerts = async () => {
    setIsSendingAlerts(true);
    try {
      const { data } = await supabase.functions.invoke('security-email-alerts', {
        body: { action: 'check_and_send' }
      });
      if (data?.success) {
        toast.success(data.message || 'Alerts processed');
      } else {
        toast.error(data?.error || 'Failed to process alerts');
      }
    } catch (e) {
      toast.error('Failed to process alerts');
    }
    setIsSendingAlerts(false);
  };

  const addRecipient = () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    const emails = editConfig.recipient_emails || [];
    if (emails.includes(newEmail)) { toast.error('Email already added'); return; }
    setEditConfig({ ...editConfig, recipient_emails: [...emails, newEmail] });
    setNewEmail('');
  };

  const removeRecipient = (email: string) => {
    setEditConfig({
      ...editConfig,
      recipient_emails: (editConfig.recipient_emails || []).filter(e => e !== email)
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-orange-500/30 bg-black/80 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
          <span className="text-orange-400 font-mono text-sm animate-pulse">Loading email config...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-orange-500/40 bg-black/80 p-6" style={{ boxShadow: '0 0 20px rgba(255,153,0,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <MailIcon size={20} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Email Alert Configuration</h3>
              <p className="text-orange-400/60 font-mono text-xs">SendGrid-Powered Security Notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${sendGridConfigured ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className={`w-2 h-2 rounded-full ${sendGridConfigured ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`font-mono text-xs ${sendGridConfigured ? 'text-green-400' : 'text-red-400'}`}>
                SendGrid {sendGridConfigured ? 'Connected' : 'Not Configured'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleTriggerAlerts} disabled={isSendingAlerts} className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all font-mono text-sm disabled:opacity-50">
            <SendIcon size={14} className={isSendingAlerts ? 'animate-pulse' : ''} />
            {isSendingAlerts ? 'Sending...' : 'Send Pending Alerts'}
          </button>
          <button onClick={fetchConfigs} className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border border-gray-700 text-gray-400 rounded-lg hover:text-gray-300 transition-all font-mono text-sm">
            <RefreshIcon size={14} /> Reload Config
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <div className="rounded-xl border border-gray-800 bg-black/80 p-6 space-y-5">
          <h4 className="text-white font-mono font-bold text-sm">Alert Settings</h4>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div>
              <p className="text-white font-mono text-sm">Email Alerts</p>
              <p className="text-gray-500 font-mono text-xs">Send email notifications for security events</p>
            </div>
            <button
              onClick={() => setEditConfig({ ...editConfig, is_enabled: !editConfig.is_enabled })}
              className={`w-12 h-6 rounded-full transition-all relative ${editConfig.is_enabled ? 'bg-green-500/30 border border-green-500/50' : 'bg-gray-800 border border-gray-700'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${editConfig.is_enabled ? 'left-6 bg-green-400' : 'left-0.5 bg-gray-500'}`} />
            </button>
          </div>

          {/* Severity Threshold */}
          <div>
            <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">Severity Threshold</label>
            <div className="flex gap-2">
              {['critical', 'high', 'medium', 'low'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setEditConfig({ ...editConfig, severity_threshold: sev })}
                  className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all ${
                    editConfig.severity_threshold === sev
                      ? sev === 'critical' ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                        : sev === 'high' ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                        : sev === 'medium' ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                        : 'bg-green-500/20 border border-green-500/50 text-green-400'
                      : 'bg-gray-900/50 border border-gray-800 text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
            <p className="text-gray-600 font-mono text-[10px] mt-1">Alerts at this level and above will trigger emails</p>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">Alert Frequency (minutes between emails)</label>
            <div className="flex gap-2">
              {[5, 15, 30, 60, 120].map(min => (
                <button
                  key={min}
                  onClick={() => setEditConfig({ ...editConfig, alert_frequency_minutes: min })}
                  className={`flex-1 py-2 rounded-lg font-mono text-xs transition-all ${
                    editConfig.alert_frequency_minutes === min
                      ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400'
                      : 'bg-gray-900/50 border border-gray-800 text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {min < 60 ? min + 'm' : (min / 60) + 'h'}
                </button>
              ))}
            </div>
          </div>

          {/* Max per day */}
          <div>
            <label className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2 block">Max Alerts Per Day</label>
            <input
              type="number" value={editConfig.max_alerts_per_day || 50}
              onChange={e => setEditConfig({ ...editConfig, max_alerts_per_day: parseInt(e.target.value) || 50 })}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            {[
              { key: 'include_geo_data', label: 'Include IpInfo Geolocation Data' },
              { key: 'include_threat_details', label: 'Include Threat Details' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-3 p-2 bg-gray-900/30 rounded-lg cursor-pointer hover:bg-gray-900/50 transition-all">
                <div
                  onClick={() => setEditConfig({ ...editConfig, [opt.key]: !(editConfig as any)[opt.key] })}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    (editConfig as any)[opt.key]
                      ? 'bg-orange-500/20 border-orange-500/50'
                      : 'bg-gray-900 border-gray-700'
                  }`}
                >
                  {(editConfig as any)[opt.key] && <CheckIcon size={12} className="text-orange-400" />}
                </div>
                <span className="text-gray-400 font-mono text-xs">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={isSaving} className="w-full py-3 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg font-mono text-sm font-bold hover:bg-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <SaveIcon size={16} />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Recipients & Test */}
        <div className="space-y-6">
          {/* Recipients */}
          <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold text-sm mb-4">Recipient Emails</h4>
            <div className="flex gap-2 mb-4">
              <input
                type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="admin@example.com"
                onKeyDown={e => e.key === 'Enter' && addRecipient()}
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-orange-500/50"
              />
              <button onClick={addRecipient} className="px-3 py-2 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all">
                <PlusIcon size={16} />
              </button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto darkwave-scrollbar">
              {(editConfig.recipient_emails || []).length > 0 ? (
                (editConfig.recipient_emails || []).map((email, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MailIcon size={14} className="text-orange-400" />
                      <span className="text-gray-300 font-mono text-sm">{email}</span>
                    </div>
                    <button onClick={() => removeRecipient(email)} className="p-1 text-gray-600 hover:text-red-400 transition-all">
                      <XIcon size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <MailIcon size={24} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 font-mono text-xs">No recipients configured</p>
                </div>
              )}
            </div>
          </div>

          {/* Test Email */}
          <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
            <h4 className="text-white font-mono font-bold text-sm mb-4 flex items-center gap-2">
              <SendIcon size={16} className="text-cyan-400" /> Send Test Alert
            </h4>
            <p className="text-gray-500 font-mono text-xs mb-4">Send a sample security alert email to verify your configuration.</p>
            <div className="flex gap-2">
              <input
                type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={handleSendTest} disabled={isSending || !testEmail}
                className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg font-mono text-sm hover:bg-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <SendIcon size={14} className={isSending ? 'animate-pulse' : ''} />
                {isSending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>

          {/* Status */}
          {configs.length > 0 && configs[0].last_alert_sent_at && (
            <div className="rounded-xl border border-gray-800 bg-black/80 p-6">
              <h4 className="text-white font-mono font-bold text-sm mb-3">Alert Status</h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between"><span className="text-gray-500">Last Alert Sent:</span><span className="text-gray-300">{new Date(configs[0].last_alert_sent_at).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Alerts Sent Today:</span><span className="text-orange-400 font-bold">{configs[0].alerts_sent_today || 0} / {configs[0].max_alerts_per_day || 50}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={configs[0].is_enabled ? 'text-green-400' : 'text-red-400'}>{configs[0].is_enabled ? 'Active' : 'Disabled'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailAlertConfig;
