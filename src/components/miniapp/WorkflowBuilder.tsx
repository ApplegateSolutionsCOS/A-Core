import React, { useState, useEffect } from 'react';
import { CloseIcon, PlusIcon, TrashIcon, SaveIcon, GitBranchIcon, EditIcon } from '@/components/icons/Icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as LucideIcons from 'lucide-react';

interface WorkflowBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  workspaceId: string;
  wsColor: { primary: string; rgb: string };
}

// ⚡ THE NEW TOOLBOX
const TOOLBOX_ITEMS = [
  { type: 'condition', category: 'logic', label: 'Condition / Filter', icon: GitBranchIcon, color: 'text-amber-400' },
  { type: 'create_record', category: 'action', label: 'Create Record', icon: PlusIcon, color: 'text-emerald-400' },
  { type: 'update_record', category: 'action', label: 'Update Record', icon: EditIcon, color: 'text-sky-400' },
  { type: 'send_task', category: 'action', label: 'Assign Task', icon: LucideIcons.CheckSquare, color: 'text-fuchsia-400' },
  { type: 'send_alert', category: 'action', label: 'Send Alert', icon: LucideIcons.Bell, color: 'text-yellow-400' },
  { type: 'send_email', category: 'action', label: 'Send Email', icon: LucideIcons.Mail, color: 'text-purple-400' },
  { type: 'webhook', category: 'action', label: 'Trigger Webhook', icon: LucideIcons.Globe, color: 'text-rose-400' },
];

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  isOpen, onClose, appName, workspaceId, wsColor,
}) => {
  const { user, organization } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  
  const [miniAppId, setMiniAppId] = useState<string | null>(null);
  const [schemaFields, setSchemaFields] = useState<any[]>([]);
  const [allApps, setAllApps] = useState<any[]>([]);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !organization?.id) return;
    const initializeData = async () => {
      setLoading(true);
      try {
        const { data: appData } = await supabase.schema('app_private').from('mini_apps')
          .select('id, schema_definition').eq('workspace_id', workspaceId).ilike('name', appName).single();

        if (appData) {
          setMiniAppId(appData.id);
          const schema = typeof appData.schema_definition === 'string' ? JSON.parse(appData.schema_definition) : appData.schema_definition;
          const fields = schema?.fields || [...(schema?.base_fields || []), ...(schema?.custom_fields || [])];
          setSchemaFields(fields.filter((f: any) => !['split_separator', 'tabs', 'submenu'].includes(f.type)));

          const { data: wfData } = await supabase.schema('app_private').from('mini_app_workflows').select('*')
            .eq('mini_app_id', appData.id).order('created_at', { ascending: false });
          
          if (wfData) {
            setWorkflows(wfData.map(w => ({
              id: w.id,
              name: w.name,
              is_active: w.is_active,
              trigger_event: w.trigger_event || 'record_created', // Sync with new schema
              steps: typeof w.steps === 'string' ? JSON.parse(w.steps) : (w.steps || [])
            })));
          }
        }
        const { data: apps } = await supabase.schema('app_private').from('mini_apps').select('id, name').eq('organization_id', organization.id);
        if (apps) setAllApps(apps);

        const { data: users } = await supabase.from('organization_users').select('id, email').eq('organization_id', organization.id);
        if (users) setOrgUsers(users);

      } catch (err) {
        console.error('Error loading workflow data:', err);
      } finally { setLoading(false); }
    };
    initializeData();
  }, [isOpen, workspaceId, appName, organization]);

  const createNewWorkflow = () => {
    const newWf = { id: crypto.randomUUID(), name: 'New Workflow', is_active: true, trigger_event: 'record_created', steps: [] };
    setWorkflows([newWf, ...workflows]);
    setActiveWorkflow(newWf);
  };

  const saveWorkflow = async () => {
    if (!activeWorkflow || !miniAppId) return;
    setSaving(true);
    try {
      const payload = {
        id: activeWorkflow.id,
        mini_app_id: miniAppId,
        organization_id: organization?.id,
        name: activeWorkflow.name,
        is_active: activeWorkflow.is_active,
        trigger_event: activeWorkflow.trigger_event,
        steps: activeWorkflow.steps,
      };
      await supabase.schema('app_private').from('mini_app_workflows').upsert(payload);
      setWorkflows(prev => prev.map(w => w.id === activeWorkflow.id ? activeWorkflow : w));
    } catch (err) { console.error('Error saving:', err); } finally { setSaving(false); }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Delete this workflow permanently?')) return;
    await supabase.schema('app_private').from('mini_app_workflows').delete().eq('id', id);
    setWorkflows(prev => prev.filter(w => w.id !== id));
    if (activeWorkflow?.id === id) setActiveWorkflow(null);
  };

  // ⚡ TIMELINE LOGIC
  const addStepToTimeline = (type: string) => {
    if (!activeWorkflow) return;
    const newStep = { id: `step_${Date.now()}`, type, config: {} };
    setActiveWorkflow({ ...activeWorkflow, steps: [...activeWorkflow.steps, newStep] });
  };

  const updateStepConfig = (stepId: string, key: string, value: any) => {
    if (!activeWorkflow) return;
    setActiveWorkflow({
      ...activeWorkflow,
      steps: activeWorkflow.steps.map((s: any) => s.id === stepId ? { ...s, config: { ...s.config, [key]: value } } : s)
    });
  };

  const removeStep = (stepId: string) => {
    if (!activeWorkflow) return;
    setActiveWorkflow({ ...activeWorkflow, steps: activeWorkflow.steps.filter((s: any) => s.id !== stepId) });
  };

  // ⚡ DRAG AND DROP
  const handleDragStart = (e: React.DragEvent, type: string) => { e.dataTransfer.setData('stepType', type); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('stepType');
    if (type) addStepToTimeline(type);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black rounded-xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
        style={{ border: `1px solid rgba(${wsColor.rgb}, 0.4)`, boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.2)` }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.08), transparent)` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: `1px solid rgba(${wsColor.rgb}, 0.5)`, background: `linear-gradient(135deg, rgba(${wsColor.rgb}, 0.15), rgba(0,0,0,0.9))` }}>
              <LucideIcons.Workflow size={16} style={{ color: wsColor.primary }} />
            </div>
            <div>
              <h3 className="text-base font-mono font-bold text-white leading-tight">Workflow Engine</h3>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{appName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors">
              {rightPanelOpen ? 'HIDE TOOLBOX' : 'SHOW TOOLBOX'}
            </button>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors bg-white/5 hover:bg-white/10"><CloseIcon size={20} /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: Workflow List */}
          <div className="w-64 border-r flex-shrink-0 flex flex-col bg-slate-900/30" style={{ borderColor: `rgba(${wsColor.rgb}, 0.15)` }}>
            <div className="p-3 border-b" style={{ borderColor: `rgba(${wsColor.rgb}, 0.15)` }}>
              <button onClick={createNewWorkflow} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all hover:brightness-125"
                style={{ background: `rgba(${wsColor.rgb}, 0.15)`, border: `1px solid rgba(${wsColor.rgb}, 0.4)`, color: wsColor.primary }}>
                <PlusIcon size={14} /><span className="text-xs font-mono">New Workflow</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 darkwave-scrollbar">
              {loading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)`, borderTopColor: wsColor.primary }} /></div>
              ) : workflows.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono text-center py-8">No workflows yet</p>
              ) : (
                workflows.map(wf => (
                  <button key={wf.id} onClick={() => setActiveWorkflow(wf)}
                    className="w-full text-left p-3 rounded-lg transition-all group flex flex-col gap-2"
                    style={{ background: activeWorkflow?.id === wf.id ? `rgba(${wsColor.rgb}, 0.15)` : 'transparent', border: `1px solid ${activeWorkflow?.id === wf.id ? `rgba(${wsColor.rgb}, 0.4)` : 'transparent'}`, }}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wf.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                        <span className="text-xs font-mono font-bold text-white truncate">{wf.name}</span>
                      </div>
                      <div onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }} className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all rounded hover:bg-red-500/20">
                        <TrashIcon size={12} />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Center Panel: Timeline Canvas */}
          <div className="flex-1 overflow-y-auto darkwave-scrollbar bg-black/40 flex flex-col relative"
               onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            {!activeWorkflow ? (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                <LucideIcons.GitMerge size={64} className="text-slate-600 mb-4" />
                <h4 className="text-xl font-mono text-white mb-2">Select a Workflow</h4>
                <p className="text-sm text-slate-400 font-mono">Drag and drop actions here to build an automation timeline.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto w-full p-6 space-y-6 pb-24 min-h-full">
                
                {/* Header Controls */}
                <div className="flex items-center gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  <input type="text" value={activeWorkflow.name}
                    onChange={e => setActiveWorkflow({ ...activeWorkflow, name: e.target.value })}
                    className="flex-1 bg-transparent text-xl font-mono font-bold text-white focus:outline-none placeholder-slate-600 border-b border-transparent focus:border-slate-600 pb-1"
                    placeholder="Workflow Name" />
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${activeWorkflow.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${activeWorkflow.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={activeWorkflow.is_active} onChange={e => setActiveWorkflow({ ...activeWorkflow, is_active: e.target.checked })} />
                  </label>
                </div>

                {/* ⚡ THE VERTICAL STACK TIMELINE */}
                <div className="relative pl-6 border-l-2 border-slate-700 space-y-8 ml-4">
                  
                  {/* Trigger Node */}
                  <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
                    <div className="absolute -left-[35px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center">
                       <LucideIcons.Zap size={12} className="text-slate-400" />
                    </div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Trigger Event</label>
                    <select 
                      value={activeWorkflow.trigger_event} 
                      onChange={e => setActiveWorkflow({ ...activeWorkflow, trigger_event: e.target.value })}
                      className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
                    >
                      <option value="record_created">When a Record is Created</option>
                      <option value="record_updated">When a Record is Updated</option>
                    </select>
                  </div>

                  {/* Dynamic Nodes (Conditions & Actions stacked together) */}
                  {activeWorkflow.steps.map((step: any, index: number) => {
                    const toolInfo = TOOLBOX_ITEMS.find(t => t.type === step.type);
                    const NodeIcon = toolInfo?.icon || LucideIcons.Activity;

                    return (
                      <div key={step.id} className="relative bg-slate-800/40 border border-slate-700 rounded-xl p-5 shadow-lg group">
                        <div className={`absolute -left-[35px] top-5 w-6 h-6 rounded-full bg-slate-900 border-2 flex items-center justify-center ${toolInfo?.color.replace('text', 'border') || 'border-slate-500'}`}>
                           <span className="text-[10px] font-bold font-mono text-white">{index + 1}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-3">
                           <div className="flex items-center gap-2">
                             <NodeIcon size={16} className={toolInfo?.color || 'text-slate-400'} />
                             <h4 className="text-sm font-mono font-bold text-white">{toolInfo?.label || 'Action'}</h4>
                           </div>
                           <button onClick={() => removeStep(step.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon size={14}/></button>
                        </div>

                        {/* RENDER CONFIG BASED ON TYPE */}
                        <div className="space-y-3">
                           {step.type === 'condition' && (
                             <div className="space-y-2">
                                <p className="text-[10px] text-slate-500 font-mono">If this condition fails, the workflow stops here.</p>
                                <div className="flex items-center gap-3">
                                  <select value={step.config.fieldId || ''} onChange={e => updateStepConfig(step.id, 'fieldId', e.target.value)} className="w-1/3 bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none">
                                    <option value="">-- Field --</option>
                                    {schemaFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                                  <select value={step.config.operator || 'equals'} onChange={e => updateStepConfig(step.id, 'operator', e.target.value)} className="w-32 bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none">
                                    <option value="equals">Equals</option><option value="not_equals">Not Equals</option>
                                    <option value="contains">Contains</option><option value="is_empty">Is Empty</option>
                                    <option value="greater_than">Greater Than</option><option value="less_than">Less Than</option>
                                  </select>
                                  {!['is_empty'].includes(step.config.operator) && (
                                    <input type="text" value={step.config.value || ''} onChange={e => updateStepConfig(step.id, 'value', e.target.value)} placeholder="Value" className="flex-1 bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                                  )}
                                </div>
                             </div>
                           )}

                           {/* Nested Mapping inside Create Record */}
                           {step.type === 'create_record' && (
                             <div className="space-y-4">
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Target App ID / Name</label>
                                  <select value={step.config.targetAppId || ''} onChange={e => updateStepConfig(step.id, 'targetAppId', e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none mb-3">
                                    <option value="">-- Select Target App --</option>
                                    {allApps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                                  </select>
                                </div>
                                
                                <div className="bg-black/30 border border-slate-700/50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Field Mapping</label>
                                    <button onClick={() => {
                                      const newMapping = [...(step.config.fieldMapping || []), { sourceFieldId: '', targetFieldId: '' }];
                                      updateStepConfig(step.id, 'fieldMapping', newMapping);
                                    }} className="text-[10px] text-sky-400 hover:text-sky-300 font-mono font-bold flex items-center gap-1">
                                      <PlusIcon size={10} /> Add Field
                                    </button>
                                  </div>
                                  
                                  {(step.config.fieldMapping || []).length === 0 ? (
                                    <p className="text-[10px] text-slate-600 font-mono text-center italic py-2">No fields mapped.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {(step.config.fieldMapping || []).map((mapping: any, mIdx: number) => (
                                        <div key={mIdx} className="flex items-center gap-2">
                                          <input type="text" value={mapping.targetFieldId || ''} onChange={e => {
                                            const newMapping = [...step.config.fieldMapping];
                                            newMapping[mIdx].targetFieldId = e.target.value;
                                            updateStepConfig(step.id, 'fieldMapping', newMapping);
                                          }} placeholder="Target Field ID" className="flex-1 bg-black/50 border border-slate-600 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500" />
                                          <span className="text-slate-600"><GitBranchIcon size={12} /></span>
                                          <input type="text" value={mapping.sourceFieldId || ''} onChange={e => {
                                            const newMapping = [...step.config.fieldMapping];
                                            newMapping[mIdx].sourceFieldId = e.target.value;
                                            updateStepConfig(step.id, 'fieldMapping', newMapping);
                                          }} placeholder="Source Field ID or _record_id" className="flex-1 bg-black/50 border border-slate-600 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500" />
                                          <button onClick={() => {
                                            const newMapping = step.config.fieldMapping.filter((_: any, i: number) => i !== mIdx);
                                            updateStepConfig(step.id, 'fieldMapping', newMapping);
                                          }} className="text-slate-500 hover:text-red-400"><TrashIcon size={14} /></button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                             </div>
                           )}

                           {step.type === 'update_record' && (
                             <div>
                               <p className="text-[10px] text-slate-400 font-mono mb-2">Update fields via <code className="text-sky-400">@Token</code> replacement.</p>
                               <div className="flex gap-2">
                                  <select className="flex-1 bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none"
                                          onChange={(e) => {
                                            const fieldId = e.target.value; if(!fieldId) return;
                                            updateStepConfig(step.id, 'fieldUpdates', { ...(step.config.fieldUpdates || {}), [fieldId]: '' });
                                            e.target.value = ""; 
                                          }}>
                                    <option value="">+ Add Field to Update</option>
                                    {schemaFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                               </div>
                               {Object.entries(step.config.fieldUpdates || {}).map(([fId, val]) => (
                                 <div key={fId} className="flex items-center gap-2 mt-2">
                                    <div className="w-1/3 text-xs text-slate-300 font-mono truncate">{schemaFields.find(f => f.id === fId)?.name}</div>
                                    <LucideIcons.ArrowRight size={12} className="text-slate-600" />
                                    <input type="text" value={val as string} onChange={e => {
                                      updateStepConfig(step.id, 'fieldUpdates', { ...step.config.fieldUpdates, [fId]: e.target.value });
                                    }} placeholder="Value or @Field" className="flex-1 bg-black/50 border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none" />
                                    <button onClick={() => {
                                       const newUpdates = { ...step.config.fieldUpdates };
                                       delete newUpdates[fId];
                                       updateStepConfig(step.id, 'fieldUpdates', newUpdates);
                                    }} className="text-slate-500 hover:text-red-400"><CloseIcon size={14} /></button>
                                 </div>
                               ))}
                             </div>
                           )}

                           {step.type === 'send_task' && (
                             <div className="space-y-3">
                               <input type="text" value={step.config.taskTitle || ''} onChange={e => updateStepConfig(step.id, 'taskTitle', e.target.value)} placeholder="Task Title (e.g. Review @Name)" className="w-full bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                               <select value={step.config.assigneeId || ''} onChange={e => updateStepConfig(step.id, 'assigneeId', e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none">
                                 <option value="">-- Assign To --</option>
                                 {orgUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                               </select>
                             </div>
                           )}

                           {step.type === 'send_alert' && (
                             <div className="space-y-3">
                               <select value={step.config.recipientId || ''} onChange={e => updateStepConfig(step.id, 'recipientId', e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none">
                                 <option value="">-- Select Recipient --</option>
                                 {orgUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                               </select>
                               <input type="text" value={step.config.alertTitle || ''} onChange={e => updateStepConfig(step.id, 'alertTitle', e.target.value)} placeholder="Notification Title (e.g. New Record Created)" className="w-full bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                               <textarea value={step.config.alertMessage || ''} onChange={e => updateStepConfig(step.id, 'alertMessage', e.target.value)} placeholder="Notification details or message..." className="w-full h-20 bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none resize-none" />
                             </div>
                           )}

                           {step.type === 'webhook' && (
                             <input type="url" value={step.config.url || ''} onChange={e => updateStepConfig(step.id, 'url', e.target.value)} placeholder="https://zapier.com/hooks..." className="w-full bg-black/50 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                           )}
                           
                           {step.type === 'send_email' && (
                             <div className="space-y-3 text-center py-2"><LucideIcons.Mail size={24} className="text-slate-600 mx-auto" /><p className="text-xs font-mono text-slate-500">SendGrid Integration required.</p></div>
                           )}

                        </div>
                      </div>
                    );
                  })}

                  {/* Drop Zone / Add Step Button */}
                  <div className="relative z-10 flex justify-center py-4">
                    <div className="group relative">
                      <button className="w-10 h-10 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 hover:bg-slate-700 transition-all shadow-lg">
                        <PlusIcon size={18} />
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-48 overflow-hidden z-50">
                         {TOOLBOX_ITEMS.map(opt => {
                           const Icon = opt.icon;
                           return (
                             <button key={opt.type} onClick={() => addStepToTimeline(opt.type)} className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
                               <Icon size={14} className="text-slate-500" /> {opt.label}
                             </button>
                           )
                         })}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 pb-12">
                  <button onClick={saveWorkflow} disabled={saving} className="flex items-center gap-2 px-8 py-3 rounded-full font-mono text-sm font-bold shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform hover:scale-105"
                    style={{ background: wsColor.primary, color: '#000' }}>
                    {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <SaveIcon size={16} />}
                    Save Workflow
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Right Panel: Toolbox */}
          <div className={`border-l flex-shrink-0 flex flex-col bg-slate-900/30 transition-all duration-300 ease-in-out ${rightPanelOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'}`} style={{ borderColor: `rgba(${wsColor.rgb}, 0.15)` }}>
             <div className="p-4 border-b" style={{ borderColor: `rgba(${wsColor.rgb}, 0.15)` }}>
                <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2"><LucideIcons.Wrench size={16} style={{ color: wsColor.primary }} /> Toolbox</h4>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-6 darkwave-scrollbar">
                
                <div>
                  <h5 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Logic</h5>
                  <div className="space-y-2">
                    {TOOLBOX_ITEMS.filter(t => t.category === 'logic').map(tool => (
                      <div key={tool.type} draggable onDragStart={(e) => handleDragStart(e, tool.type)}
                           className="flex items-center justify-between p-3 bg-black/40 border border-slate-700/50 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors group">
                         <div className="flex items-center gap-2">
                            <tool.icon size={14} className={tool.color} />
                            <span className="text-xs text-slate-300 font-mono">{tool.label}</span>
                         </div>
                         <button onClick={() => addStepToTimeline(tool.type)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity"><PlusIcon size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">Actions</h5>
                  <div className="space-y-2">
                    {TOOLBOX_ITEMS.filter(t => t.category === 'action').map(tool => (
                      <div key={tool.type} draggable onDragStart={(e) => handleDragStart(e, tool.type)}
                           className="flex items-center justify-between p-3 bg-black/40 border border-slate-700/50 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors group">
                         <div className="flex items-center gap-2">
                            <tool.icon size={14} className={tool.color} />
                            <span className="text-xs text-slate-300 font-mono">{tool.label}</span>
                         </div>
                         <button onClick={() => addStepToTimeline(tool.type)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity"><PlusIcon size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>

             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;