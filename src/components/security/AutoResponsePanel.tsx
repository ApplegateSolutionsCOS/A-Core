import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ResponseRule {
  id: string;
  rule_name: string;
  description: string;
  is_enabled: boolean;
  priority: number;
  conditions: any;
  actions: any[];
  cooldown_minutes: number;
  last_triggered_at: string | null;
  trigger_count: number;
  created_by: string;
  created_at: string;
}

interface ActionLogEntry {
  id: string;
  rule_id: string;
  rule_name: string;
  action_type: string;
  target_ip: string;
  details: any;
  outcome: string;
  error_message: string | null;
  created_at: string;
}

// Inline SVG Icons
const ZapIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const PlayIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
const PauseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);
const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const ClockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const CheckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);

const CONDITION_FIELDS = [
  { value: 'severity', label: 'Severity', type: 'select', options: ['critical', 'high', 'medium', 'low'] },
  { value: 'event_type', label: 'Event Type', type: 'select', options: ['suspicious_access', 'file_blocked', 'rate_limit_exceeded', 'ip_blocked', 'threat_detected'] },
  { value: 'suspicious_count', label: 'Suspicious Count', type: 'number' },
  { value: 'total_requests', label: 'Total Requests', type: 'number' },
  { value: 'unique_endpoints', label: 'Unique Endpoints', type: 'number' },
  { value: 'country', label: 'Country Code', type: 'text' },
  { value: 'attack_type', label: 'Attack Type', type: 'text' },
];

const OPERATORS = [
  { value: 'eq', label: '=' }, { value: 'neq', label: '!=' },
  { value: 'gt', label: '>' }, { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' }, { value: 'lte', label: '<=' },
  { value: 'contains', label: 'contains' }, { value: 'in', label: 'in list' },
];

const ACTION_TYPES = [
  { value: 'block_ip', label: 'Block IP', color: 'text-red-400', desc: 'Add IP to blocklist' },
  { value: 'escalate_severity', label: 'Escalate Severity', color: 'text-yellow-400', desc: 'Upgrade event severity' },
  { value: 'email_alert', label: 'Send Email Alert', color: 'text-blue-400', desc: 'Bypass frequency limits' },
  { value: 'create_notification', label: 'Create Notification', color: 'text-green-400', desc: 'Log a new notification' },
];

const AutoResponsePanel: React.FC = () => {
  const [rules, setRules] = useState<ResponseRule[]>([]);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'log'>('rules');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ResponseRule | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Rule form state
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [rulePriority, setRulePriority] = useState(50);
  const [ruleCooldown, setRuleCooldown] = useState(15);
  const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([{ field: 'suspicious_count', operator: 'gte', value: '10' }]);
  const [actions, setActions] = useState<{ type: string; reason?: string; severity?: string; expires_in_hours?: number; target_severity?: string; subject?: string }[]>([{ type: 'block_ip', reason: 'Auto-blocked', expires_in_hours: 24 }]);

  const fetchRules = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('auto-response', { body: { action: 'get_rules' } });
      if (data?.rules) setRules(data.rules);
    } catch (e) {}
  }, []);

  const fetchActionLog = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('auto-response', { body: { action: 'get_action_log', limit: 100 } });
      if (data?.logs) setActionLog(data.logs);
    } catch (e) {}
  }, []);

  useEffect(() => {
    Promise.all([fetchRules(), fetchActionLog()]).then(() => setIsLoading(false));
  }, [fetchRules, fetchActionLog]);

  const handleSeedDefaults = async () => {
    toast.info('Seeding default rules...');
    const { data } = await supabase.functions.invoke('auto-response', { body: { action: 'seed_defaults', created_by: 'admin' } });
    if (data?.success) {
      toast.success(`Created ${data.created} default rules`);
      fetchRules();
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    toast.info('Evaluating rules against recent events...');
    try {
      const { data } = await supabase.functions.invoke('auto-response', { body: { action: 'evaluate', lookback_minutes: 10 } });
      if (data?.success) {
        toast.success(`Evaluated ${data.rulesEvaluated} rules, ${data.actionsExecuted} actions executed`);
        fetchActionLog();
        fetchRules();
      }
    } catch (e: any) { toast.error('Evaluation failed'); }
    setIsEvaluating(false);
  };

  const handleExpireBlocklist = async () => {
    const { data } = await supabase.functions.invoke('auto-response', { body: { action: 'expire_blocklist' } });
    if (data?.success) toast.success(`Expired ${data.expired} blocklist entries`);
  };

  const handleToggleRule = async (rule: ResponseRule) => {
    await supabase.functions.invoke('auto-response', { body: { action: 'toggle_rule', id: rule.id, is_enabled: !rule.is_enabled } });
    fetchRules();
  };

  const handleDeleteRule = async (id: string) => {
    await supabase.functions.invoke('auto-response', { body: { action: 'delete_rule', id } });
    toast.success('Rule deleted');
    fetchRules();
  };

  const handleSaveRule = async () => {
    if (!ruleName) { toast.error('Rule name required'); return; }
    const ruleData: any = {
      action: 'save_rule', rule_name: ruleName, description: ruleDesc,
      priority: rulePriority, cooldown_minutes: ruleCooldown,
      conditions: { all: conditions }, actions, created_by: 'admin'
    };
    if (editingRule) ruleData.id = editingRule.id;
    const { data } = await supabase.functions.invoke('auto-response', { body: ruleData });
    if (data?.success) {
      toast.success(editingRule ? 'Rule updated' : 'Rule created');
      resetForm();
      fetchRules();
    }
  };

  const resetForm = () => {
    setShowRuleForm(false); setEditingRule(null);
    setRuleName(''); setRuleDesc(''); setRulePriority(50); setRuleCooldown(15);
    setConditions([{ field: 'suspicious_count', operator: 'gte', value: '10' }]);
    setActions([{ type: 'block_ip', reason: 'Auto-blocked', expires_in_hours: 24 }]);
  };

  const startEditRule = (rule: ResponseRule) => {
    setEditingRule(rule);
    setRuleName(rule.rule_name);
    setRuleDesc(rule.description || '');
    setRulePriority(rule.priority);
    setRuleCooldown(rule.cooldown_minutes);
    const conds = rule.conditions?.all || (Array.isArray(rule.conditions) ? rule.conditions : [rule.conditions]);
    setConditions(conds.length > 0 ? conds : [{ field: 'suspicious_count', operator: 'gte', value: '10' }]);
    setActions(Array.isArray(rule.actions) ? rule.actions : [rule.actions]);
    setShowRuleForm(true);
  };

  const getActionColor = (type: string) => {
    const map: Record<string, string> = { block_ip: 'text-red-400', escalate_severity: 'text-yellow-400', email_alert: 'text-blue-400', create_notification: 'text-green-400', unblock_ip: 'text-cyan-400' };
    return map[type] || 'text-gray-400';
  };

  const getOutcomeBadge = (outcome: string) => {
    return outcome === 'success'
      ? <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/30">SUCCESS</span>
      : <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">FAILED</span>;
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return Math.floor(diff / 1000) + 's ago';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-red-500/30 bg-black/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ZapIcon size={22} className="text-red-400" />
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Automated Threat Response</h3>
              <p className="text-gray-500 font-mono text-xs">Configure if/then rules for automatic security actions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExpireBlocklist} className="px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:text-white font-mono text-xs">
              <ClockIcon size={12} className="inline mr-1" /> Expire Blocklist
            </button>
            <button onClick={handleEvaluate} disabled={isEvaluating}
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 font-mono text-xs disabled:opacity-50">
              {isEvaluating ? <RefreshIcon size={12} className="inline mr-1 animate-spin" /> : <PlayIcon size={12} className="inline mr-1" />}
              Run Evaluation
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'rules' as const, label: `Response Rules (${rules.length})`, icon: <ShieldIcon size={14} /> },
            { id: 'log' as const, label: `Action Log (${actionLog.length})`, icon: <ClockIcon size={14} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveSubTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${activeSubTab === t.id ? 'bg-red-500/15 border border-red-500/40 text-red-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Tab */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <button onClick={handleSeedDefaults} className="px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:text-white font-mono text-xs">
              Seed Default Rules
            </button>
            <button onClick={() => { resetForm(); setShowRuleForm(true); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 font-mono text-sm">
              <PlusIcon size={14} /> New Rule
            </button>
          </div>

          {/* Rule Form */}
          {showRuleForm && (
            <div className="rounded-xl border border-red-500/30 bg-black/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-mono font-bold">{editingRule ? 'Edit Rule' : 'Create Response Rule'}</h4>
                <button onClick={resetForm} className="text-gray-500 hover:text-white"><XIcon size={16} /></button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Rule Name</label>
                  <input type="text" value={ruleName} onChange={e => setRuleName(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-red-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Priority</label>
                    <input type="number" value={rulePriority} onChange={e => setRulePriority(Number(e.target.value))} min={1} max={100}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-red-500/50" />
                  </div>
                  <div>
                    <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Cooldown (min)</label>
                    <input type="number" value={ruleCooldown} onChange={e => setRuleCooldown(Number(e.target.value))} min={1}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-red-500/50" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Description</label>
                <input type="text" value={ruleDesc} onChange={e => setRuleDesc(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-red-500/50" />
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-red-400 font-mono text-xs uppercase font-bold">IF (All conditions match)</label>
                  <button onClick={() => setConditions([...conditions, { field: 'severity', operator: 'eq', value: 'critical' }])}
                    className="text-gray-500 hover:text-red-400 text-xs font-mono"><PlusIcon size={12} className="inline" /> Add</button>
                </div>
                <div className="space-y-2">
                  {conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
                      <select value={cond.field} onChange={e => { const c = [...conditions]; c[i].field = e.target.value; setConditions(c); }}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none">
                        {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                      <select value={cond.operator} onChange={e => { const c = [...conditions]; c[i].operator = e.target.value; setConditions(c); }}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-orange-400 font-mono text-xs focus:outline-none">
                        {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <input type="text" value={cond.value} onChange={e => { const c = [...conditions]; c[i].value = e.target.value; setConditions(c); }}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none" placeholder="Value" />
                      {conditions.length > 1 && (
                        <button onClick={() => setConditions(conditions.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400"><XIcon size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-green-400 font-mono text-xs uppercase font-bold">THEN (Execute actions)</label>
                  <button onClick={() => setActions([...actions, { type: 'email_alert' }])}
                    className="text-gray-500 hover:text-green-400 text-xs font-mono"><PlusIcon size={12} className="inline" /> Add</button>
                </div>
                <div className="space-y-2">
                  {actions.map((act, i) => (
                    <div key={i} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <select value={act.type} onChange={e => { const a = [...actions]; a[i] = { ...a[i], type: e.target.value }; setActions(a); }}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none">
                          {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        <span className={`text-xs font-mono ${ACTION_TYPES.find(a => a.value === act.type)?.color || 'text-gray-400'}`}>
                          {ACTION_TYPES.find(a => a.value === act.type)?.desc || ''}
                        </span>
                        {actions.length > 1 && (
                          <button onClick={() => setActions(actions.filter((_, j) => j !== i))} className="ml-auto text-gray-600 hover:text-red-400"><XIcon size={14} /></button>
                        )}
                      </div>
                      {act.type === 'block_ip' && (
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={act.reason || ''} onChange={e => { const a = [...actions]; a[i].reason = e.target.value; setActions(a); }}
                            placeholder="Block reason" className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none placeholder-gray-600" />
                          <input type="number" value={act.expires_in_hours || 24} onChange={e => { const a = [...actions]; a[i].expires_in_hours = Number(e.target.value); setActions(a); }}
                            placeholder="Expires (hours)" className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none" />
                        </div>
                      )}
                      {act.type === 'escalate_severity' && (
                        <select value={act.target_severity || 'critical'} onChange={e => { const a = [...actions]; a[i].target_severity = e.target.value; setActions(a); }}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none">
                          <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSaveRule} className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 font-mono text-sm font-bold">
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
                <button onClick={resetForm} className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:text-white font-mono text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            {rules.length === 0 ? (
              <div className="p-12 text-center">
                <ZapIcon size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 font-mono text-sm">No response rules configured</p>
                <button onClick={handleSeedDefaults} className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg font-mono text-sm">
                  Load Default Rules
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {rules.map(rule => (
                  <div key={rule.id} className={`p-4 transition-colors ${rule.is_enabled ? 'hover:bg-red-500/5' : 'opacity-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button onClick={() => handleToggleRule(rule)} className="flex-shrink-0">
                          {rule.is_enabled ? <PlayIcon size={16} className="text-green-400" /> : <PauseIcon size={16} className="text-gray-600" />}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-mono text-sm font-medium">{rule.rule_name}</p>
                            <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono text-gray-500">P{rule.priority}</span>
                            <span className="text-gray-600 font-mono text-[10px]">Cooldown: {rule.cooldown_minutes}m</span>
                          </div>
                          {rule.description && <p className="text-gray-500 font-mono text-xs mt-0.5">{rule.description}</p>}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-red-400/60 font-mono text-[10px]">IF: {
                              (rule.conditions?.all || []).map((c: any) => `${c.field} ${c.operator} ${c.value}`).join(' AND ') || 'custom'
                            }</span>
                            <span className="text-gray-700">|</span>
                            <span className="text-green-400/60 font-mono text-[10px]">THEN: {
                              (Array.isArray(rule.actions) ? rule.actions : []).map((a: any) => a.type).join(', ') || 'custom'
                            }</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-gray-600 font-mono text-[10px]">Triggered: {rule.trigger_count}x</span>
                            {rule.last_triggered_at && <span className="text-orange-400/50 font-mono text-[10px]">Last: {timeAgo(rule.last_triggered_at)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => startEditRule(rule)} className="p-1.5 text-gray-600 hover:text-orange-400 transition-colors" title="Edit">
                          <ZapIcon size={14} />
                        </button>
                        <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors" title="Delete">
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Log Tab */}
      {activeSubTab === 'log' && (
        <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">{actionLog.length} actions recorded</span>
            <button onClick={fetchActionLog} className="text-gray-500 hover:text-orange-400"><RefreshIcon size={14} /></button>
          </div>
          {actionLog.length === 0 ? (
            <div className="p-12 text-center"><ClockIcon size={32} className="text-gray-700 mx-auto mb-2" /><p className="text-gray-600 font-mono text-sm">No response actions yet</p></div>
          ) : (
            <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
              {actionLog.map(entry => (
                <div key={entry.id} className="p-3 hover:bg-gray-900/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.outcome === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono text-xs font-bold ${getActionColor(entry.action_type)}`}>{entry.action_type.replace(/_/g, ' ').toUpperCase()}</span>
                          {entry.rule_name && <span className="text-gray-600 font-mono text-[10px]">via {entry.rule_name}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.target_ip && <span className="text-gray-400 font-mono text-xs">{entry.target_ip}</span>}
                          {entry.error_message && <span className="text-red-400/60 font-mono text-[10px]">{entry.error_message}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getOutcomeBadge(entry.outcome)}
                      <span className="text-gray-600 font-mono text-[10px]">{timeAgo(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoResponsePanel;
