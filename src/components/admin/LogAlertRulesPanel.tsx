import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  RefreshIcon,
  SearchIcon,
  CloseIcon,
  EditIcon,
  TrashIcon,
  ActivityIcon,
} from '@/components/icons/Icons';

// ── ICONS ──
const BellIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ZapIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const CheckCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// ── TYPES ──
interface AlertRule {
  id?: string;
  name: string;
  description: string;
  is_enabled: boolean;
  metric_type: 'count' | 'rate' | 'duration' | 'threshold';
  level_filter: string;
  category_filter: string;
  source_filter: string;
  threshold_value: number;
  threshold_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  time_window_minutes: number;
  action_type: 'email' | 'flag' | 'both';
  severity: 'low' | 'medium' | 'high' | 'critical';
  notification_emails: string[];
  cooldown_minutes: number;
  last_triggered_at?: string;
  trigger_count?: number;
  last_evaluated_at?: string;
  last_evaluation_result?: { value?: number; threshold?: number; breached?: boolean };
  created_at?: string;
  updated_at?: string;
}

const EMPTY_RULE: AlertRule = {
  name: '',
  description: '',
  is_enabled: true,
  metric_type: 'count',
  level_filter: 'ERROR',
  category_filter: '',
  source_filter: '',
  threshold_value: 50,
  threshold_operator: 'gt',
  time_window_minutes: 5,
  action_type: 'flag',
  severity: 'high',
  notification_emails: [],
  cooldown_minutes: 15,
};

const SEVERITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  critical: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  low: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: '>', gte: '>=', lt: '<', lte: '<=', eq: '=',
};

const ALL_CATEGORIES = [
  'api_call', 'api_response', 'state_change', 'navigation', 'user_action',
  'click', 'form_submit', 'render', 'effect', 'error', 'console', 'network',
  'auth', 'database', 'supabase', 'function_call', 'component_mount',
  'component_unmount', 'timer', 'storage', 'dom_event', 'websocket', 'system',
];

// ══════════════════════════════════════════════
// PRESET TEMPLATES
// ══════════════════════════════════════════════
const PRESETS: { name: string; rule: Partial<AlertRule> }[] = [
  {
    name: 'High Error Rate',
    rule: { name: 'High Error Rate', description: 'Alert when ERROR count exceeds 50 in 5 minutes', metric_type: 'count', level_filter: 'ERROR', threshold_value: 50, threshold_operator: 'gt', time_window_minutes: 5, severity: 'high', action_type: 'both' },
  },
  {
    name: 'Critical Errors',
    rule: { name: 'Critical Errors Detected', description: 'Alert on any CRITICAL level log', metric_type: 'count', level_filter: 'CRITICAL', threshold_value: 0, threshold_operator: 'gt', time_window_minutes: 1, severity: 'critical', action_type: 'email' },
  },
  {
    name: 'Slow API Response',
    rule: { name: 'Slow API Response', description: 'Alert when API response time exceeds 2000ms', metric_type: 'duration', category_filter: 'api_call', threshold_value: 2000, threshold_operator: 'gt', time_window_minutes: 5, severity: 'high', action_type: 'both' },
  },
  {
    name: 'Auth Failures Spike',
    rule: { name: 'Auth Failure Spike', description: 'Alert when auth errors exceed 10 in 5 minutes', metric_type: 'count', level_filter: 'ERROR', category_filter: 'auth', threshold_value: 10, threshold_operator: 'gt', time_window_minutes: 5, severity: 'critical', action_type: 'email' },
  },
  {
    name: 'Database Errors',
    rule: { name: 'Database Error Surge', description: 'Alert when database errors exceed 20 in 10 minutes', metric_type: 'count', level_filter: 'ERROR', category_filter: 'database', threshold_value: 20, threshold_operator: 'gt', time_window_minutes: 10, severity: 'high', action_type: 'both' },
  },
];

// ══════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════
const LogAlertRulesPanel: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule>({ ...EMPTY_RULE });
  const [emailInput, setEmailInput] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{ evaluated: number; triggered: number; triggeredAlerts: string[] } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const fetchRules = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'get_alert_rules' },
      });
      if (data?.success) setRules(data.rules || []);
    } catch (err) {
      console.error('Failed to fetch alert rules:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async () => {
    if (!editingRule.name.trim()) return;
    setSaveStatus('saving');
    try {
      const { data } = await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'save_alert_rule', rule: editingRule },
      });
      if (data?.success) {
        setSaveStatus('saved');
        setShowEditor(false);
        setEditingRule({ ...EMPTY_RULE });
        fetchRules();
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this alert rule?')) return;
    try {
      await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'delete_alert_rule', rule_id: id },
      });
      fetchRules();
    } catch {}
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'toggle_alert_rule', rule_id: id, is_enabled: enabled },
      });
      fetchRules();
    } catch {}
  };

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const { data } = await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'evaluate_alerts' },
      });
      if (data?.success) {
        setEvalResult({ evaluated: data.evaluated, triggered: data.triggered, triggeredAlerts: data.triggeredAlerts || [] });
      }
    } catch {}
    setEvaluating(false);
    fetchRules();
  };

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && email.includes('@') && !editingRule.notification_emails.includes(email)) {
      setEditingRule(prev => ({ ...prev, notification_emails: [...prev.notification_emails, email] }));
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEditingRule(prev => ({ ...prev, notification_emails: prev.notification_emails.filter(e => e !== email) }));
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setEditingRule(prev => ({ ...prev, ...preset.rule }));
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule({ ...rule });
    setShowEditor(true);
  };

  const formatTime = (ts?: string) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-950/20 to-red-950/20 p-5 overflow-hidden">
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-orange-500/20 rounded-lg blur-lg animate-pulse" />
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/50 flex items-center justify-center">
                  <BellIcon size={22} className="text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Alert Rules Engine</h3>
                <p className="text-xs font-mono text-gray-400">Threshold-based alerts on persisted runtime logs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEvaluateNow}
                disabled={evaluating}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-all font-mono text-sm disabled:opacity-50"
              >
                <ZapIcon size={14} className={evaluating ? 'animate-pulse' : ''} />
                {evaluating ? 'Evaluating...' : 'Evaluate Now'}
              </button>
              <button
                onClick={() => { setEditingRule({ ...EMPTY_RULE }); setShowEditor(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm"
              >
                <PlusIcon size={14} />
                New Rule
              </button>
            </div>
          </div>

          {/* Evaluation Result */}
          {evalResult && (
            <div className={`mt-3 p-3 rounded-lg border text-[12px] font-mono ${
              evalResult.triggered > 0
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            }`}>
              <div className="flex items-center gap-2">
                {evalResult.triggered > 0 ? (
                  <BellIcon size={14} className="text-red-400" />
                ) : (
                  <CheckCircleIcon size={14} className="text-green-400" />
                )}
                <span>
                  Evaluated {evalResult.evaluated} rules — {evalResult.triggered} triggered
                  {evalResult.triggeredAlerts.length > 0 && `: ${evalResult.triggeredAlerts.join(', ')}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RULES LIST ── */}
      {rules.length === 0 && !showEditor ? (
        <div className="rounded-xl border border-gray-800 bg-black/60 p-12 text-center">
          <BellIcon size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-mono text-sm mb-2">No alert rules configured</p>
          <p className="text-gray-600 font-mono text-xs mb-4">Create rules to monitor runtime log thresholds and receive notifications</p>
          <button
            onClick={() => { setEditingRule({ ...EMPTY_RULE }); setShowEditor(true); }}
            className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-sm"
          >
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const sev = SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;
            const evalRes = rule.last_evaluation_result;
            return (
              <div key={rule.id} className={`rounded-xl border bg-black/60 p-4 transition-all ${
                rule.is_enabled ? 'border-gray-800 hover:border-gray-700' : 'border-gray-900 opacity-60'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${sev.text} ${sev.bg} border ${sev.border}`}>
                        {rule.severity}
                      </span>
                      <h4 className="text-white font-mono font-medium truncate">{rule.name}</h4>
                      {!rule.is_enabled && (
                        <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono text-gray-500">DISABLED</span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-gray-500 font-mono text-xs mb-2">{rule.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600 flex-wrap">
                      <span className="text-cyan-400/70">
                        {rule.metric_type} {OPERATOR_LABELS[rule.threshold_operator]} {rule.threshold_value}
                      </span>
                      <span>Window: {rule.time_window_minutes}m</span>
                      {rule.level_filter && rule.level_filter !== 'ALL' && <span>Level: {rule.level_filter}</span>}
                      {rule.category_filter && <span>Cat: {rule.category_filter}</span>}
                      {rule.source_filter && <span>Source: {rule.source_filter}</span>}
                      <span>Action: {rule.action_type}</span>
                      <span>Cooldown: {rule.cooldown_minutes}m</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-mono">
                      <span className="text-gray-600">Triggered: <span className="text-orange-400">{rule.trigger_count || 0}x</span></span>
                      <span className="text-gray-600">Last: <span className="text-gray-400">{formatTime(rule.last_triggered_at)}</span></span>
                      {evalRes && (
                        <span className={`${evalRes.breached ? 'text-red-400' : 'text-green-400'}`}>
                          Current: {evalRes.value ?? 'N/A'} / {evalRes.threshold}
                          {evalRes.breached ? ' BREACHED' : ' OK'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(rule.id!, !rule.is_enabled)}
                      className={`relative w-10 h-5 rounded-full transition-all ${
                        rule.is_enabled ? 'bg-green-500/30 border-green-500/50' : 'bg-gray-800 border-gray-700'
                      } border`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                        rule.is_enabled ? 'left-5 bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.5)]' : 'left-0.5 bg-gray-500'
                      }`} />
                    </button>
                    <button onClick={() => handleEdit(rule)} className="p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all">
                      <EditIcon size={14} />
                    </button>
                    <button onClick={() => handleDelete(rule.id!)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RULE EDITOR MODAL ── */}
      {showEditor && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="relative bg-black border border-cyan-500/50 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-[0_0_40px_rgba(0,255,255,0.15)] darkwave-scrollbar">
            <div className="sticky top-0 z-10 bg-black border-b border-cyan-500/20 p-4 flex items-center justify-between">
              <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                <BellIcon size={20} className="text-cyan-400" />
                {editingRule.id ? 'Edit Alert Rule' : 'New Alert Rule'}
              </h3>
              <button onClick={() => setShowEditor(false)} className="p-1.5 text-gray-400 hover:text-white transition-colors">
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Presets */}
              {!editingRule.id && (
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 mb-2 uppercase">Quick Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => handleApplyPreset(preset)}
                        className="px-3 py-1.5 text-[11px] font-mono text-gray-400 border border-gray-800 rounded-lg hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name & Description */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Rule Name *</label>
                  <input
                    type="text"
                    value={editingRule.name}
                    onChange={e => setEditingRule(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    placeholder="e.g., High Error Rate Alert"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Description</label>
                  <input
                    type="text"
                    value={editingRule.description}
                    onChange={e => setEditingRule(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    placeholder="e.g., Alert when ERROR count exceeds 50 in 5 minutes"
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-4">
                <h4 className="text-sm font-mono font-bold text-cyan-400">Condition</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Metric Type</label>
                    <select
                      value={editingRule.metric_type}
                      onChange={e => setEditingRule(prev => ({ ...prev, metric_type: e.target.value as any }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="count">Count</option>
                      <option value="rate">Rate (per min)</option>
                      <option value="duration">Max Duration (ms)</option>
                      <option value="threshold">Threshold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Operator</label>
                    <select
                      value={editingRule.threshold_operator}
                      onChange={e => setEditingRule(prev => ({ ...prev, threshold_operator: e.target.value as any }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="gt">Greater than (&gt;)</option>
                      <option value="gte">Greater or equal (&gt;=)</option>
                      <option value="lt">Less than (&lt;)</option>
                      <option value="lte">Less or equal (&lt;=)</option>
                      <option value="eq">Equal (=)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Threshold Value</label>
                    <input
                      type="number"
                      value={editingRule.threshold_value}
                      onChange={e => setEditingRule(prev => ({ ...prev, threshold_value: Number(e.target.value) }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Time Window</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editingRule.time_window_minutes}
                        onChange={e => setEditingRule(prev => ({ ...prev, time_window_minutes: Number(e.target.value) }))}
                        className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 pr-12 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-[10px] font-mono">min</span>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Level Filter</label>
                    <select
                      value={editingRule.level_filter}
                      onChange={e => setEditingRule(prev => ({ ...prev, level_filter: e.target.value }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="ALL">All Levels</option>
                      {['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Category Filter</label>
                    <select
                      value={editingRule.category_filter}
                      onChange={e => setEditingRule(prev => ({ ...prev, category_filter: e.target.value }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="">All Categories</option>
                      {ALL_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Source Filter</label>
                    <input
                      type="text"
                      value={editingRule.source_filter}
                      onChange={e => setEditingRule(prev => ({ ...prev, source_filter: e.target.value }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                      placeholder="e.g., AuthContext"
                    />
                  </div>
                </div>

                {/* Human-readable summary */}
                <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                  <p className="text-[11px] font-mono text-cyan-400">
                    IF <span className="text-white font-bold">{editingRule.metric_type}</span>
                    {editingRule.level_filter && editingRule.level_filter !== 'ALL' ? ` of ${editingRule.level_filter} logs` : ' of all logs'}
                    {editingRule.category_filter ? ` in category "${editingRule.category_filter}"` : ''}
                    {editingRule.source_filter ? ` from source "${editingRule.source_filter}"` : ''}
                    {' '}<span className="text-white font-bold">{OPERATOR_LABELS[editingRule.threshold_operator]} {editingRule.threshold_value}</span>
                    {editingRule.metric_type === 'duration' ? 'ms' : ''}
                    {' '}within <span className="text-white font-bold">{editingRule.time_window_minutes} minutes</span>
                    {' '}THEN <span className="text-orange-400 font-bold">{editingRule.action_type === 'email' ? 'send email' : editingRule.action_type === 'both' ? 'flag + send email' : 'flag as alert'}</span>
                  </p>
                </div>
              </div>

              {/* Action Configuration */}
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-4">
                <h4 className="text-sm font-mono font-bold text-orange-400">Action</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Action Type</label>
                    <select
                      value={editingRule.action_type}
                      onChange={e => setEditingRule(prev => ({ ...prev, action_type: e.target.value as any }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="flag">Flag Only</option>
                      <option value="email">Email Alert</option>
                      <option value="both">Flag + Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Severity</label>
                    <select
                      value={editingRule.severity}
                      onChange={e => setEditingRule(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Cooldown</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editingRule.cooldown_minutes}
                        onChange={e => setEditingRule(prev => ({ ...prev, cooldown_minutes: Number(e.target.value) }))}
                        className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 pr-12 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-[10px] font-mono">min</span>
                    </div>
                  </div>
                </div>

                {/* Email Recipients */}
                {(editingRule.action_type === 'email' || editingRule.action_type === 'both') && (
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Notification Emails</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
                        className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                        placeholder="email@example.com"
                      />
                      <button onClick={handleAddEmail} className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all text-sm font-mono">
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingRule.notification_emails.map(email => (
                        <span key={email} className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 border border-gray-800 rounded-lg text-[11px] font-mono text-gray-300">
                          {email}
                          <button onClick={() => handleRemoveEmail(email)} className="text-gray-600 hover:text-red-400 transition-colors">
                            <CloseIcon size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-5 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all font-mono text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editingRule.name.trim() || saveStatus === 'saving'}
                  className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all disabled:opacity-50 font-mono text-sm flex items-center gap-2"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <CheckCircleIcon size={14} className="text-green-400" />
                      Saved!
                    </>
                  ) : (
                    'Save Rule'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogAlertRulesPanel;
