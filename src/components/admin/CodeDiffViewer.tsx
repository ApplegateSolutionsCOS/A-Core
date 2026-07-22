import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SearchIcon,
  CloseIcon,
  RefreshIcon,
  DownloadIcon,
  HistoryIcon,
} from '@/components/icons/Icons';

// Icons
const GitBranchIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);

const FileCodeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);

const UploadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const DiffIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="3" width="8" height="18" rx="1" /><rect x="14" y="3" width="8" height="18" rx="1" /><line x1="6" y1="8" x2="6" y2="8.01" /><line x1="18" y1="8" x2="18" y2="8.01" />
  </svg>
);

interface CodeVersion {
  id: string;
  component_path: string;
  component_name: string;
  version_hash: string;
  version_number: number;
  snapshot_type: string;
  metadata: any;
  created_by: string;
  created_at: string;
  source_code?: string;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  leftLineNum: number | null;
  rightLineNum: number | null;
  leftContent: string;
  rightContent: string;
}

// Simple diff algorithm
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  
  // Build LCS table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const diffOps: Array<{ type: 'same' | 'add' | 'remove'; oldIdx: number; newIdx: number }> = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diffOps.unshift({ type: 'same', oldIdx: i - 1, newIdx: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffOps.unshift({ type: 'add', oldIdx: -1, newIdx: j - 1 });
      j--;
    } else {
      diffOps.unshift({ type: 'remove', oldIdx: i - 1, newIdx: -1 });
      i--;
    }
  }

  let leftNum = 0, rightNum = 0;
  for (const op of diffOps) {
    if (op.type === 'same') {
      leftNum++; rightNum++;
      result.push({
        type: 'unchanged',
        leftLineNum: leftNum,
        rightLineNum: rightNum,
        leftContent: oldLines[op.oldIdx],
        rightContent: newLines[op.newIdx],
      });
    } else if (op.type === 'remove') {
      leftNum++;
      result.push({
        type: 'removed',
        leftLineNum: leftNum,
        rightLineNum: null,
        leftContent: oldLines[op.oldIdx],
        rightContent: '',
      });
    } else if (op.type === 'add') {
      rightNum++;
      result.push({
        type: 'added',
        leftLineNum: null,
        rightLineNum: rightNum,
        leftContent: '',
        rightContent: newLines[op.newIdx],
      });
    }
  }

  return result;
}

// Syntax highlighting (basic TSX)
function highlightSyntax(line: string): React.ReactNode {
  if (!line) return <span>&nbsp;</span>;
  
  // Simple token-based highlighting
  const tokens: Array<{ text: string; className: string }> = [];
  let remaining = line;
  
  const patterns: Array<[RegExp, string]> = [
    [/^(\s*\/\/.*)/, 'text-gray-500 italic'],                    // comments
    [/^(\s*import\b)/, 'text-fuchsia-400 font-bold'],            // import
    [/^(\s*export\b)/, 'text-fuchsia-400 font-bold'],            // export
    [/^(\s*from\b)/, 'text-fuchsia-400'],                        // from
    [/^(\s*const\b|\s*let\b|\s*var\b)/, 'text-cyan-400'],        // declarations
    [/^(\s*function\b|\s*return\b|\s*if\b|\s*else\b|\s*for\b|\s*while\b)/, 'text-purple-400'], // keywords
    [/^(\s*interface\b|\s*type\b|\s*enum\b)/, 'text-yellow-400'], // types
    [/^('.*?'|".*?"|`.*?`)/, 'text-green-400'],                  // strings
    [/^(\d+)/, 'text-orange-400'],                                // numbers
    [/^(<\/?[a-zA-Z][a-zA-Z0-9.]*)/,'text-cyan-300'],            // JSX tags
    [/^(className|onClick|onChange|onSubmit|useState|useEffect|useCallback|useMemo|useRef)/, 'text-yellow-300'], // React
  ];

  // For simplicity, just do keyword highlighting on the whole line
  let highlighted = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply highlights
  highlighted = highlighted
    .replace(/(\/\/.*$)/gm, '<span class="text-gray-500 italic">$1</span>')
    .replace(/\b(import|export|from|default|as)\b/g, '<span class="text-fuchsia-400">$1</span>')
    .replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|new|typeof|instanceof|void|null|undefined|true|false|async|await|try|catch|throw|finally)\b/g, '<span class="text-purple-400">$1</span>')
    .replace(/\b(interface|type|enum|extends|implements)\b/g, '<span class="text-yellow-400">$1</span>')
    .replace(/\b(React|useState|useEffect|useCallback|useMemo|useRef|useContext)\b/g, '<span class="text-yellow-300">$1</span>')
    .replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g, '<span class="text-green-400">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="text-orange-400">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

const CodeDiffViewer: React.FC = () => {
  const [components, setComponents] = useState<Array<{ path: string; name: string }>>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [versions, setVersions] = useState<CodeVersion[]>([]);
  const [leftVersion, setLeftVersion] = useState<CodeVersion | null>(null);
  const [rightVersion, setRightVersion] = useState<CodeVersion | null>(null);
  const [leftVersionId, setLeftVersionId] = useState<string>('');
  const [rightVersionId, setRightVersionId] = useState<string>('');
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');

  // Snapshot modal
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotPath, setSnapshotPath] = useState('');
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotCode, setSnapshotCode] = useState('');
  const [snapshotType, setSnapshotType] = useState<'deploy' | 'edit' | 'auto'>('deploy');

  // Load components list
  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      const { data } = await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'list_components' },
      });
      if (data?.success) {
        setComponents(data.components || []);
      }
    } catch {}
  };

  // Load versions when component selected
  useEffect(() => {
    if (selectedComponent) {
      loadVersions(selectedComponent);
    }
  }, [selectedComponent]);

  const loadVersions = async (path: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('persist-runtime-logs', {
        body: { action: 'get_versions', component_path: path },
      });
      if (data?.success) {
        setVersions(data.versions || []);
        // Auto-select latest two versions
        if (data.versions && data.versions.length >= 2) {
          setLeftVersionId(data.versions[1].id);
          setRightVersionId(data.versions[0].id);
        } else if (data.versions && data.versions.length === 1) {
          setRightVersionId(data.versions[0].id);
          setLeftVersionId('');
        }
      }
    } catch {}
    setLoading(false);
  };

  // Load version details and compute diff
  useEffect(() => {
    if (leftVersionId && rightVersionId) {
      loadAndDiff();
    }
  }, [leftVersionId, rightVersionId]);

  const loadAndDiff = async () => {
    setLoading(true);
    try {
      const [leftRes, rightRes] = await Promise.all([
        supabase.functions.invoke('persist-runtime-logs', {
          body: { action: 'get_version_detail', id: leftVersionId },
        }),
        supabase.functions.invoke('persist-runtime-logs', {
          body: { action: 'get_version_detail', id: rightVersionId },
        }),
      ]);

      const left = leftRes.data?.version;
      const right = rightRes.data?.version;

      if (left) setLeftVersion(left);
      if (right) setRightVersion(right);

      if (left?.source_code && right?.source_code) {
        const diff = computeDiff(left.source_code, right.source_code);
        setDiffLines(diff);
      }
    } catch {}
    setLoading(false);
  };

  // Save a new snapshot
  const handleSaveSnapshot = async () => {
    if (!snapshotPath || !snapshotName || !snapshotCode) return;
    setSnapshotLoading(true);
    try {
      await supabase.functions.invoke('persist-runtime-logs', {
        body: {
          action: 'save_version',
          component_path: snapshotPath,
          component_name: snapshotName,
          source_code: snapshotCode,
          snapshot_type: snapshotType,
          created_by: 'admin',
        },
      });
      setShowSnapshotModal(false);
      setSnapshotPath('');
      setSnapshotName('');
      setSnapshotCode('');
      loadComponents();
      if (selectedComponent === snapshotPath) {
        loadVersions(snapshotPath);
      }
    } catch {}
    setSnapshotLoading(false);
  };

  // Diff stats
  const diffStats = useMemo(() => {
    let added = 0, removed = 0, unchanged = 0;
    diffLines.forEach(l => {
      if (l.type === 'added') added++;
      else if (l.type === 'removed') removed++;
      else unchanged++;
    });
    return { added, removed, unchanged, total: diffLines.length };
  }, [diffLines]);

  const displayDiff = showOnlyChanges
    ? diffLines.filter(l => l.type !== 'unchanged')
    : diffLines;

  const filteredComponents = components.filter(c =>
    !searchFilter || c.path.toLowerCase().includes(searchFilter.toLowerCase()) || c.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative rounded-xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-950/20 to-purple-950/20 p-5 overflow-hidden">
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-fuchsia-500/20 rounded-lg blur-lg animate-pulse" />
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/50 flex items-center justify-center">
                  <DiffIcon size={22} className="text-fuchsia-400 drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Code Diff Viewer</h3>
                <p className="text-xs font-mono text-gray-400">
                  Compare deployed code versions side-by-side with syntax highlighting
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSnapshotModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 border border-fuchsia-500/50 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/20 transition-all font-mono text-sm"
            >
              <UploadIcon size={14} />
              Snapshot Code
            </button>
          </div>
        </div>
      </div>

      {/* Component Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Component List */}
        <div className="lg:col-span-1 rounded-xl border border-gray-800 bg-black/60 overflow-hidden">
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter components..."
                className="w-full bg-black border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-[11px] text-white font-mono placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto darkwave-scrollbar">
            {filteredComponents.length === 0 ? (
              <div className="p-4 text-center">
                <FileCodeIcon size={24} className="mx-auto mb-2 text-gray-700" />
                <p className="text-[11px] font-mono text-gray-600">No components tracked yet</p>
                <p className="text-[10px] font-mono text-gray-700 mt-1">Use "Snapshot Code" to add versions</p>
              </div>
            ) : (
              filteredComponents.map((comp) => (
                <button
                  key={comp.path}
                  onClick={() => setSelectedComponent(comp.path)}
                  className={`w-full text-left px-3 py-2 border-b border-gray-900/50 hover:bg-fuchsia-500/5 transition-all ${
                    selectedComponent === comp.path ? 'bg-fuchsia-500/10 border-l-2 border-l-fuchsia-500' : ''
                  }`}
                >
                  <p className="text-[11px] font-mono text-white truncate">{comp.name}</p>
                  <p className="text-[9px] font-mono text-gray-600 truncate">{comp.path}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Version Selector & Diff */}
        <div className="lg:col-span-3 space-y-3">
          {selectedComponent && versions.length > 0 && (
            <>
              {/* Version Selectors */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Left (Old)</label>
                  <select
                    value={leftVersionId}
                    onChange={(e) => setLeftVersionId(e.target.value)}
                    className="w-full bg-black border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300 font-mono focus:outline-none focus:border-red-500/50"
                  >
                    <option value="">Select version...</option>
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>
                        v{v.version_number} — {v.snapshot_type} — {new Date(v.created_at).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <GitBranchIcon size={20} className="text-gray-600" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Right (New)</label>
                  <select
                    value={rightVersionId}
                    onChange={(e) => setRightVersionId(e.target.value)}
                    className="w-full bg-black border border-green-500/30 rounded-lg px-3 py-2 text-sm text-green-300 font-mono focus:outline-none focus:border-green-500/50"
                  >
                    <option value="">Select version...</option>
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>
                        v{v.version_number} — {v.snapshot_type} — {new Date(v.created_at).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Diff Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-green-400">+{diffStats.added} added</span>
                  <span className="text-red-400">-{diffStats.removed} removed</span>
                  <span className="text-gray-500">{diffStats.unchanged} unchanged</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyChanges}
                      onChange={(e) => setShowOnlyChanges(e.target.checked)}
                      className="rounded border-gray-700 bg-gray-900 text-fuchsia-500"
                    />
                    Changes only
                  </label>
                  <div className="flex items-center border border-gray-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setDiffViewMode('side-by-side')}
                      className={`px-3 py-1.5 text-[10px] font-mono ${diffViewMode === 'side-by-side' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-500'}`}
                    >
                      Side-by-Side
                    </button>
                    <button
                      onClick={() => setDiffViewMode('unified')}
                      className={`px-3 py-1.5 text-[10px] font-mono ${diffViewMode === 'unified' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-500'}`}
                    >
                      Unified
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Diff Display */}
          {loading ? (
            <div className="flex items-center justify-center py-16 rounded-xl border border-gray-800 bg-[#0a0a0f]">
              <div className="flex items-center gap-3 text-fuchsia-400 font-mono text-sm">
                <div className="w-4 h-4 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                Loading versions...
              </div>
            </div>
          ) : !selectedComponent ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-800 bg-[#0a0a0f]">
              <DiffIcon size={40} className="mb-3 text-gray-700" />
              <p className="font-mono text-sm text-gray-500">Select a component to view diffs</p>
              <p className="font-mono text-xs text-gray-700 mt-1">Or snapshot code to start tracking versions</p>
            </div>
          ) : diffLines.length === 0 && leftVersionId && rightVersionId ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-800 bg-[#0a0a0f]">
              <p className="font-mono text-sm text-green-400">No differences found</p>
              <p className="font-mono text-xs text-gray-600 mt-1">Both versions are identical</p>
            </div>
          ) : diffLines.length > 0 ? (
            <div className="rounded-xl border border-gray-800 bg-[#0a0a0f] overflow-hidden">
              {/* Diff Header */}
              <div className="flex items-center border-b border-gray-800 text-[10px] font-mono">
                {diffViewMode === 'side-by-side' ? (
                  <>
                    <div className="flex-1 px-3 py-2 bg-red-500/5 text-red-400 border-r border-gray-800">
                      {leftVersion ? `v${leftVersion.version_number} — ${leftVersion.snapshot_type} — ${new Date(leftVersion.created_at).toLocaleString()}` : 'Old Version'}
                    </div>
                    <div className="flex-1 px-3 py-2 bg-green-500/5 text-green-400">
                      {rightVersion ? `v${rightVersion.version_number} — ${rightVersion.snapshot_type} — ${new Date(rightVersion.created_at).toLocaleString()}` : 'New Version'}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 px-3 py-2 text-gray-400">
                    Unified Diff: {leftVersion ? `v${leftVersion.version_number}` : '?'} → {rightVersion ? `v${rightVersion.version_number}` : '?'}
                  </div>
                )}
              </div>

              {/* Diff Lines */}
              <div className="overflow-auto darkwave-scrollbar" style={{ maxHeight: '60vh' }}>
                {diffViewMode === 'side-by-side' ? (
                  <table className="w-full border-collapse">
                    <tbody>
                      {displayDiff.map((line, idx) => (
                        <tr key={idx} className={`${
                          line.type === 'added' ? 'bg-green-500/5' :
                          line.type === 'removed' ? 'bg-red-500/5' :
                          'hover:bg-gray-900/30'
                        }`}>
                          {/* Left side */}
                          <td className="w-10 text-right px-2 py-0 text-[10px] font-mono text-gray-700 select-none border-r border-gray-900/50 align-top">
                            {line.leftLineNum || ''}
                          </td>
                          <td className={`px-2 py-0 text-[11px] font-mono border-r border-gray-800 align-top whitespace-pre ${
                            line.type === 'removed' ? 'bg-red-500/10 text-red-300' : 'text-gray-300'
                          }`}>
                            {line.type === 'removed' && <span className="text-red-500 mr-1 select-none">-</span>}
                            {line.leftContent ? highlightSyntax(line.leftContent) : <span>&nbsp;</span>}
                          </td>
                          {/* Right side */}
                          <td className="w-10 text-right px-2 py-0 text-[10px] font-mono text-gray-700 select-none border-r border-gray-900/50 align-top">
                            {line.rightLineNum || ''}
                          </td>
                          <td className={`px-2 py-0 text-[11px] font-mono align-top whitespace-pre ${
                            line.type === 'added' ? 'bg-green-500/10 text-green-300' : 'text-gray-300'
                          }`}>
                            {line.type === 'added' && <span className="text-green-500 mr-1 select-none">+</span>}
                            {line.rightContent ? highlightSyntax(line.rightContent) : <span>&nbsp;</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // Unified view
                  <div className="font-mono text-[11px]">
                    {displayDiff.map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex px-2 py-0 ${
                          line.type === 'added' ? 'bg-green-500/10' :
                          line.type === 'removed' ? 'bg-red-500/10' :
                          'hover:bg-gray-900/30'
                        }`}
                      >
                        <span className="w-10 text-right pr-2 text-gray-700 select-none flex-shrink-0">
                          {line.leftLineNum || ''}
                        </span>
                        <span className="w-10 text-right pr-2 text-gray-700 select-none flex-shrink-0">
                          {line.rightLineNum || ''}
                        </span>
                        <span className={`w-4 flex-shrink-0 text-center ${
                          line.type === 'added' ? 'text-green-500' :
                          line.type === 'removed' ? 'text-red-500' : 'text-gray-800'
                        }`}>
                          {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                        </span>
                        <span className={`flex-1 whitespace-pre ${
                          line.type === 'added' ? 'text-green-300' :
                          line.type === 'removed' ? 'text-red-300' : 'text-gray-300'
                        }`}>
                          {highlightSyntax(line.type === 'removed' ? line.leftContent : line.rightContent)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : versions.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-800 bg-[#0a0a0f]">
              <HistoryIcon size={32} className="mb-3 text-gray-700" />
              <p className="font-mono text-sm text-gray-500">Select two versions to compare</p>
              <p className="font-mono text-xs text-gray-700 mt-1">{versions.length} version(s) available</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Snapshot Modal */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSnapshotModal(false)} />
          <div className="relative bg-black border border-fuchsia-500/50 rounded-xl p-6 w-full max-w-2xl mx-4 shadow-[0_0_40px_rgba(255,0,255,0.2)] max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-950/20 to-transparent rounded-xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold text-white flex items-center gap-3">
                  <UploadIcon size={20} className="text-fuchsia-400" />
                  Snapshot Component Code
                </h3>
                <button onClick={() => setShowSnapshotModal(false)} className="text-gray-500 hover:text-white">
                  <CloseIcon size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-1">Component Path</label>
                    <input
                      type="text"
                      value={snapshotPath}
                      onChange={(e) => setSnapshotPath(e.target.value)}
                      placeholder="src/components/MyComponent.tsx"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-1">Component Name</label>
                    <input
                      type="text"
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                      placeholder="MyComponent"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-1">Snapshot Type</label>
                  <select
                    value={snapshotType}
                    onChange={(e) => setSnapshotType(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-fuchsia-500/50"
                  >
                    <option value="deploy">Deploy (Production)</option>
                    <option value="edit">Edit (Work in Progress)</option>
                    <option value="auto">Auto (System Snapshot)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-1">Source Code</label>
                  <textarea
                    value={snapshotCode}
                    onChange={(e) => setSnapshotCode(e.target.value)}
                    placeholder="Paste the component source code here..."
                    rows={16}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-green-400 font-mono text-[11px] focus:outline-none focus:border-fuchsia-500/50 resize-y"
                    spellCheck={false}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSnapshotModal(false)}
                    className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSnapshot}
                    disabled={snapshotLoading || !snapshotPath || !snapshotName || !snapshotCode}
                    className="flex-1 py-3 bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/30 transition-all disabled:opacity-50 font-mono"
                  >
                    {snapshotLoading ? 'Saving...' : 'Save Snapshot'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeDiffViewer;
