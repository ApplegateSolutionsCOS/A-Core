import React, { useState } from 'react';
import { CloseIcon } from '@/components/icons/Icons';
import { BarChart3, List, Hash, Table2, Database, Calendar, MessageSquare, Globe, ChevronRight, ChevronLeft, Sparkles, Palette } from 'lucide-react';

export interface CustomWidgetDefinition {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  visualization: string;
  refreshInterval: number;
  glowColor: 'cyan' | 'magenta' | 'green' | 'purple' | 'orange';
  config: Record<string, any>;
  createdAt: string;
}

interface CustomWidgetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: CustomWidgetDefinition) => void;
}

const DATA_SOURCES = [
  { id: 'tasks', name: 'Tasks', description: 'Your task data from all workspaces', icon: List, color: 'cyan' },
  { id: 'calendar', name: 'Calendar', description: 'Calendar events and scheduling data', icon: Calendar, color: 'purple' },
  { id: 'messages', name: 'Messages', description: 'Message counts and activity data', icon: MessageSquare, color: 'orange' },
  { id: 'miniapp', name: 'MiniApp Data', description: 'Records from any MiniApp table', icon: Database, color: 'green' },
  { id: 'api', name: 'Custom API', description: 'Fetch data from an external endpoint', icon: Globe, color: 'magenta' },
];

const VISUALIZATIONS = [
  { id: 'list', name: 'List', description: 'Scrollable list of items with labels', icon: List, preview: 'Ordered rows of data' },
  { id: 'chart', name: 'Bar Chart', description: 'Vertical bar chart visualization', icon: BarChart3, preview: 'Grouped bar graph' },
  { id: 'counter', name: 'Counter', description: 'Large number with trend indicator', icon: Hash, preview: 'Big number + delta' },
  { id: 'table', name: 'Data Table', description: 'Compact table with sortable columns', icon: Table2, preview: 'Rows and columns' },
];

const GLOW_COLORS: { id: 'cyan' | 'magenta' | 'green' | 'purple' | 'orange'; label: string; classes: string }[] = [
  { id: 'cyan', label: 'Cyan', classes: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' },
  { id: 'magenta', label: 'Magenta', classes: 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-400' },
  { id: 'green', label: 'Green', classes: 'bg-green-500/20 border-green-500/50 text-green-400' },
  { id: 'purple', label: 'Purple', classes: 'bg-purple-500/20 border-purple-500/50 text-purple-400' },
  { id: 'orange', label: 'Orange', classes: 'bg-orange-500/20 border-orange-500/50 text-orange-400' },
];

const REFRESH_OPTIONS = [
  { value: 0, label: 'Manual only' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
];

const CustomWidgetWizard: React.FC<CustomWidgetWizardProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [visualization, setVisualization] = useState('');
  const [glowColor, setGlowColor] = useState<'cyan' | 'magenta' | 'green' | 'purple' | 'orange'>('cyan');
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [miniAppName, setMiniAppName] = useState('');

  const steps = ['Data Source', 'Visualization', 'Configure', 'Review'];

  const canProceed = () => {
    switch (step) {
      case 0: return !!dataSource;
      case 1: return !!visualization;
      case 2: return name.trim().length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const handleSave = () => {
    const widget: CustomWidgetDefinition = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || `Custom ${visualization} from ${dataSource}`,
      dataSource,
      visualization,
      refreshInterval,
      glowColor,
      config: {
        ...(dataSource === 'api' ? { apiEndpoint } : {}),
        ...(dataSource === 'miniapp' ? { miniAppName } : {}),
      },
      createdAt: new Date().toISOString(),
    };
    onSave(widget);
    // Reset form
    setStep(0);
    setName('');
    setDescription('');
    setDataSource('');
    setVisualization('');
    setGlowColor('cyan');
    setRefreshInterval(60);
    setApiEndpoint('');
    setMiniAppName('');
  };

  if (!isOpen) return null;

  const selectedSource = DATA_SOURCES.find(s => s.id === dataSource);
  const selectedViz = VISUALIZATIONS.find(v => v.id === visualization);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-black border border-cyan-500/40 rounded-2xl w-full max-w-2xl shadow-[0_0_60px_rgba(0,255,255,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono">Create Custom Widget</h2>
              <p className="text-xs text-gray-500 font-mono">Step {step + 1} of {steps.length}: {steps[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-4">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  i <= step ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : ''
                }`}
                style={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[320px]">
          {/* Step 0: Data Source */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 font-mono mb-4">Choose where your widget will pull data from:</p>
              {DATA_SOURCES.map(source => {
                const Icon = source.icon;
                const isSelected = dataSource === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => setDataSource(source.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,255,255,0.1)]'
                        : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                      isSelected ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-gray-900 border-gray-700 text-gray-500'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-mono font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>{source.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{source.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 1: Visualization */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 font-mono mb-4">Select how to display the data:</p>
              <div className="grid grid-cols-2 gap-3">
                {VISUALIZATIONS.map(viz => {
                  const Icon = viz.icon;
                  const isSelected = visualization === viz.id;
                  return (
                    <button
                      key={viz.id}
                      onClick={() => setVisualization(viz.id)}
                      className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,255,255,0.1)]'
                          : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                        isSelected ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-gray-900 border-gray-700 text-gray-500'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className={`font-mono font-medium text-sm ${isSelected ? 'text-cyan-400' : 'text-white'}`}>{viz.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{viz.preview}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Widget Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Task Completion Rate"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-700"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-700"
                />
              </div>
              {dataSource === 'api' && (
                <div>
                  <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">API Endpoint</label>
                  <input
                    type="url"
                    value={apiEndpoint}
                    onChange={e => setApiEndpoint(e.target.value)}
                    placeholder="https://api.example.com/data"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-700"
                  />
                </div>
              )}
              {dataSource === 'miniapp' && (
                <div>
                  <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">MiniApp Name</label>
                  <input
                    type="text"
                    value={miniAppName}
                    onChange={e => setMiniAppName(e.target.value)}
                    placeholder="e.g., Contacts, Inventory"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-700"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">
                    <Palette className="w-3 h-3 inline mr-1" />Color Theme
                  </label>
                  <div className="flex gap-2">
                    {GLOW_COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setGlowColor(c.id)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          glowColor === c.id ? c.classes + ' scale-110' : 'border-gray-700 bg-gray-900 opacity-50 hover:opacity-80'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Refresh Rate</label>
                  <select
                    value={refreshInterval}
                    onChange={e => setRefreshInterval(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50"
                  >
                    {REFRESH_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 font-mono mb-4">Review your custom widget configuration:</p>
              <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-black p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                    GLOW_COLORS.find(c => c.id === glowColor)?.classes || ''
                  }`}>
                    {selectedViz && <selectedViz.icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-white font-mono font-bold">{name || 'Untitled Widget'}</h3>
                    <p className="text-xs text-gray-500 font-mono">{description || 'No description'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                  <div>
                    <p className="text-[10px] text-gray-600 font-mono uppercase">Data Source</p>
                    <p className="text-sm text-cyan-400 font-mono">{selectedSource?.name || dataSource}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 font-mono uppercase">Visualization</p>
                    <p className="text-sm text-cyan-400 font-mono">{selectedViz?.name || visualization}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 font-mono uppercase">Color</p>
                    <p className="text-sm font-mono capitalize" style={{ color: glowColor === 'cyan' ? '#22d3ee' : glowColor === 'magenta' ? '#d946ef' : glowColor === 'green' ? '#4ade80' : glowColor === 'purple' ? '#a78bfa' : '#fb923c' }}>{glowColor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 font-mono uppercase">Refresh</p>
                    <p className="text-sm text-cyan-400 font-mono">{REFRESH_OPTIONS.find(o => o.value === refreshInterval)?.label}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800 bg-gray-950/50">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 font-mono text-sm transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 0 ? 'Back' : 'Cancel'}
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 font-mono text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-500/50 text-white hover:from-cyan-500/40 hover:to-purple-500/40 font-mono text-sm font-medium transition-all shadow-[0_0_20px_rgba(0,255,255,0.15)]"
            >
              <Sparkles className="w-4 h-4" />
              Create Widget
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomWidgetWizard;
