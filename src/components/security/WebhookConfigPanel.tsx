import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Webhook {
  id: string;
  name: string;
  url: string;
  webhook_type: 'slack' | 'discord' | 'pagerduty' | 'teams' | 'custom';
  event_types: string[];
  is_active: boolean;
  secret_token: string | null;
  headers: Record<string, string>;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
}

interface DeliveryLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  delivery_status: 'pending' | 'success' | 'failed' | 'timeout';
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { id: 'ip_blocked', label: 'IP Blocked', desc: 'When an IP is added to blocklist', color: 'text-red-400' },
  { id: 'critical_alert', label: 'Critical Alert', desc: 'Critical/high severity events', color: 'text-orange-400' },
  { id: 'report_generated', label: 'Report Generated', desc: 'Security report created', color: 'text-blue-400' },
  { id: 'team_action', label: 'Team Action', desc: 'Team member changes', color: 'text-purple-400' },
];

const WEBHOOK_TYPES = [
  { id: 'slack' as const, label: 'Slack', color: '#4A154B', icon: 'S' },
  { id: 'discord' as const, label: 'Discord', color: '#5865F2', icon: 'D' },
  { id: 'pagerduty' as const, label: 'PagerDuty', color: '#06AC38', icon: 'P' },
  { id: 'teams' as const, label: 'Teams', color: '#6264A7', icon: 'T' },
  { id: 'custom' as const, label: 'Custom', color: '#ff9900', icon: 'C' },
];

// ─── Component ───────────────────────────────────────────────────────────────

const WebhookConfigPanel: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subTab, setSubTab] = useState<'webhooks' | 'logs'>('webhooks');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [selectedLogWebhook, setSelectedLogWebhook] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formType, setFormType] = useState<Webhook['webhook_type']>('custom');
  const [formEvents, setFormEvents] = useState<string[]>(['ip_blocked', 'critical_alert']);
  const [formSecret, setFormSecret] = useState('');

  const fetchWebhooks = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-webhooks', {
        body: { action: 'list' }
      });
      if (!error && data?.success) setWebhooks(data.webhooks || []);
    } catch (e) { console.error('Webhook fetch error:', e); }
    setIsLoading(false);
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const filters: any = { action: 'delivery_log', limit: 50 };
      if (selectedLogWebhook) filters.webhook_id = selectedLogWebhook;
      const { data, error } = await supabase.functions.invoke('security-webhooks', {
        body: filters
      });
      if (!error && data?.success) setDeliveryLogs(data.logs || []);
    } catch (e) { console.error('Log fetch error:', e); }
  }, [selectedLogWebhook]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);
  useEffect(() => { if (subTab === 'logs') fetchLogs(); }, [subTab, fetchLogs]);

  const resetForm = () => {
    setFormName(''); setFormUrl(''); setFormType('custom');
    setFormEvents(['ip_blocked', 'critical_alert']); setFormSecret('');
    setEditingWebhook(null); setShowCreateForm(false);
  };

  const handleCreate = async () => {
    if (!formName || !formUrl) { toast.error('Name and URL are required'); return; }
    try {
      const { data, error } = await supabase.functions.invoke('security-webhooks', {
        body: {
          action: editingWebhook ? 'update' : 'create',
          ...(editingWebhook ? { id: editingWebhook.id } : {}),
          name: formName, url: formUrl, webhook_type: formType,
          event_types: formEvents, secret_token: formSecret || null,
        }
      });
      if (!error && data?.success) {
        toast.success(editingWebhook ? 'Webhook updated' : 'Webhook created');
        resetForm();
        fetchWebhooks();
      } else {
        toast.error(data?.error || 'Failed to save webhook');
      }
    } catch (e) { toast.error('Failed to save webhook'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data } = await supabase.functions.invoke('security-webhooks', {
        body: { action: 'delete', id }
      });
      if (data?.success) { toast.success('Webhook deleted'); fetchWebhooks(); }
    } catch { toast.error('Failed to delete webhook'); }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      const { data } = await supabase.functions.invoke('security-webhooks', {
        body: { action: 'update', id: webhook.id, is_active: !webhook.is_active }
      });
      if (data?.success) { toast.success(webhook.is_active ? 'Webhook disabled' : 'Webhook enabled'); fetchWebhooks(); }
    } catch { toast.error('Failed to toggle webhook'); }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('security-webhooks', {
        body: { action: 'test', id }
      });
      if (!error && data?.success) {
        toast.success('Test webhook delivered successfully');
      } else {
        toast.error('Test delivery failed: ' + (data?.delivery?.error_message || data?.error || 'Unknown error'));
      }
    } catch (e) { toast.error('Test failed'); }
    setTestingId(null);
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormType(webhook.webhook_type);
    setFormEvents(webhook.event_types || []);
    setFormSecret(webhook.secret_token || '');
    setShowCreateForm(true);
  };

  const toggleEvent = (eventId: string) => {
    setFormEvents(prev => prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]);
  };

  const getTypeInfo = (type: string) => WEBHOOK_TYPES.find(t => t.id === type) || WEBHOOK_TYPES[4];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      success: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', label: 'SUCCESS' },
      failed: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', label: 'FAILED' },
      timeout: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', label: 'TIMEOUT' },
      pending: { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-400', label: 'PENDING' },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-orange-500/30 bg-black/80 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
          <span className="text-orange-400 font-mono text-sm animate-pulse">Loading webhook configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-orange-500/40 bg-black/80 p-6" style={{ boxShadow: '0 0 20px rgba(255,153,0,0.1)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/40 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Webhook Notifications</h3>
              <p className="text-blue-400/60 font-mono text-xs">Real-Time Security Event Delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['webhooks', 'logs'] as const).map(tab => (
              <button key={tab} onClick={() => setSubTab(tab)} className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${subTab === tab ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                {tab === 'webhooks' ? 'Endpoints' : 'Delivery Log'}
              </button>
            ))}
            <button onClick={() => { resetForm(); setShowCreateForm(true); }} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all font-mono text-xs">
              + Add Webhook
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-blue-500/30 bg-black/80 p-6">
          <h4 className="text-white font-mono font-bold mb-4">{editingWebhook ? 'Edit Webhook' : 'New Webhook Endpoint'}</h4>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-gray-400 font-mono text-xs block mb-1">Name</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., Slack Security Channel" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-gray-400 font-mono text-xs block mb-1">Webhook URL</label>
              <input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>

          {/* Type Selection */}
          <div className="mb-4">
            <label className="text-gray-400 font-mono text-xs block mb-2">Platform</label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_TYPES.map(type => (
                <button key={type.id} onClick={() => setFormType(type.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs transition-all border ${formType === type.id ? 'border-orange-500/40 bg-orange-500/10 text-white' : 'border-gray-800 bg-gray-900/50 text-gray-500 hover:text-gray-300'}`}>
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: type.color }}>{type.icon}</div>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event Types */}
          <div className="mb-4">
            <label className="text-gray-400 font-mono text-xs block mb-2">Event Types</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {EVENT_TYPES.map(evt => (
                <button key={evt.id} onClick={() => toggleEvent(evt.id)} className={`p-3 rounded-lg border text-left transition-all ${formEvents.includes(evt.id) ? 'border-orange-500/40 bg-orange-500/10' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-sm border ${formEvents.includes(evt.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-600'}`}>
                      {formEvents.includes(evt.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span className={`font-mono text-xs font-bold ${evt.color}`}>{evt.label}</span>
                  </div>
                  <p className="text-gray-600 font-mono text-[9px] ml-5">{evt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Secret Token */}
          <div className="mb-4">
            <label className="text-gray-400 font-mono text-xs block mb-1">Secret Token (optional)</label>
            <input type="text" value={formSecret} onChange={e => setFormSecret(e.target.value)} placeholder="Sent as X-Webhook-Secret header" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-400 max-w-md" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleCreate} className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all font-mono text-sm font-bold">
              {editingWebhook ? 'Update Webhook' : 'Create Webhook'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-all font-mono text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {subTab === 'webhooks' && (
        <div className="space-y-3">
          {webhooks.length > 0 ? webhooks.map(webhook => {
            const typeInfo = getTypeInfo(webhook.webhook_type);
            const totalDeliveries = webhook.success_count + webhook.failure_count;
            const successRate = totalDeliveries > 0 ? Math.round((webhook.success_count / totalDeliveries) * 100) : 0;
            return (
              <div key={webhook.id} className={`rounded-xl border bg-black/80 p-5 transition-all ${webhook.is_active ? 'border-gray-800 hover:border-orange-500/30' : 'border-gray-800/50 opacity-60'}`}>
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-mono font-bold text-sm flex-shrink-0" style={{ backgroundColor: typeInfo.color }}>
                    {typeInfo.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-white font-mono font-bold text-sm">{webhook.name}</h5>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${webhook.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-gray-500/10 text-gray-500 border border-gray-500/30'}`}>
                        {webhook.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-gray-500 bg-gray-900 border border-gray-800">{typeInfo.label}</span>
                    </div>
                    <p className="text-gray-500 font-mono text-xs truncate mb-2">{webhook.url}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(webhook.event_types || []).map(evt => {
                        const evtInfo = EVENT_TYPES.find(e => e.id === evt);
                        return (
                          <span key={evt} className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gray-900 border border-gray-800 ${evtInfo?.color || 'text-gray-400'}`}>
                            {evtInfo?.label || evt}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-gray-600">
                      <span>Deliveries: {totalDeliveries}</span>
                      <span className="text-green-400/60">Success: {webhook.success_count}</span>
                      <span className="text-red-400/60">Failed: {webhook.failure_count}</span>
                      {totalDeliveries > 0 && <span>Rate: {successRate}%</span>}
                      {webhook.last_triggered_at && <span>Last: {new Date(webhook.last_triggered_at).toLocaleString()}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleTest(webhook.id)} disabled={testingId === webhook.id} className="px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all font-mono text-[10px] font-bold disabled:opacity-50">
                      {testingId === webhook.id ? (
                        <span className="flex items-center gap-1"><div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /> Testing...</span>
                      ) : 'Test'}
                    </button>
                    <button onClick={() => handleToggle(webhook)} className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all ${webhook.is_active ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20' : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}>
                      {webhook.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleEdit(webhook)} className="px-2.5 py-1.5 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-all font-mono text-[10px]">Edit</button>
                    <button onClick={() => handleDelete(webhook.id)} className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-mono text-[10px]">Delete</button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-xl border border-gray-800 bg-black/80 p-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700 mx-auto mb-3">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-gray-600 font-mono text-sm mb-2">No webhooks configured</p>
              <p className="text-gray-700 font-mono text-xs">Add a webhook to receive real-time security event notifications</p>
            </div>
          )}
        </div>
      )}

      {/* Delivery Log */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter by webhook */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setSelectedLogWebhook(null); }} className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-all ${!selectedLogWebhook ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500'}`}>All</button>
            {webhooks.map(w => (
              <button key={w.id} onClick={() => setSelectedLogWebhook(w.id)} className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-all ${selectedLogWebhook === w.id ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500'}`}>
                {w.name}
              </button>
            ))}
            <button onClick={fetchLogs} className="ml-auto px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-all font-mono text-xs">
              Refresh
            </button>
          </div>

          {/* Log Table */}
          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-900/60 border-b border-gray-800">
                  <tr>
                    <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">Time</th>
                    <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">Webhook</th>
                    <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">Event</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Status</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">HTTP</th>
                    <th className="text-center p-3 text-xs font-mono font-bold text-orange-400 uppercase">Duration</th>
                    <th className="text-left p-3 text-xs font-mono font-bold text-orange-400 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {deliveryLogs.length > 0 ? deliveryLogs.map(log => {
                    const webhook = webhooks.find(w => w.id === log.webhook_id);
                    return (
                      <tr key={log.id} className="hover:bg-orange-500/5 transition-colors">
                        <td className="p-3 text-gray-400 font-mono text-xs">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-3 text-white font-mono text-xs">{webhook?.name || 'Unknown'}</td>
                        <td className="p-3 text-gray-400 font-mono text-xs">{log.event_type}</td>
                        <td className="p-3 text-center">{getStatusBadge(log.delivery_status)}</td>
                        <td className="p-3 text-center">
                          <span className={`font-mono text-xs ${log.response_status && log.response_status < 300 ? 'text-green-400' : log.response_status ? 'text-red-400' : 'text-gray-600'}`}>
                            {log.response_status || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-500 font-mono text-xs">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</td>
                        <td className="p-3 text-red-400/70 font-mono text-xs truncate max-w-[200px]">{log.error_message || '-'}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <p className="text-gray-600 font-mono text-sm">No delivery logs yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookConfigPanel;
