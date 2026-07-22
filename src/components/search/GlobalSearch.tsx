import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import {
  SearchIcon,
  CloseIcon,
  ShieldIcon,
  CalculatorIcon,
  UsersIcon,
  HomeIcon,
  DatabaseIcon,
  BuildIcon,
  FileIcon,
  TaskIcon,
  CalendarIcon,
} from '@/components/icons/Icons';
import { WORKSPACE_DEFINITIONS, WorkspaceSlug } from '@/types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToWorkspace: (slug: string) => void;
  onNavigateToMiniApp: (wsSlug: string, appName: string) => void;
  currentWorkspace?: string;
}

interface SearchResult {
  id: string;
  type: 'workspace' | 'miniapp' | 'task' | 'event';
  title: string;
  subtitle: string;
  workspace?: string;
  wsSlug?: string;
  appName?: string;
}

const wsIconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  admin: ShieldIcon, accounting: CalculatorIcon, personnel: UsersIcon,
  main: HomeIcon, data: DatabaseIcon, security: BuildIcon,
};

// Build searchable index from workspace definitions
const buildSearchIndex = (): SearchResult[] => {
  const results: SearchResult[] = [];

  // Add workspaces
  Object.entries(WORKSPACE_DEFINITIONS).forEach(([slug, ws]) => {
    results.push({
      id: `ws-${slug}`,
      type: 'workspace',
      title: ws.name,
      subtitle: `${ws.miniApps.length} MiniApps`,
      wsSlug: slug,
    });

    // Add miniapps
    ws.miniApps.forEach(appName => {
      results.push({
        id: `app-${slug}-${appName}`,
        type: 'miniapp',
        title: appName,
        subtitle: `${ws.name} workspace`,
        workspace: ws.name,
        wsSlug: slug,
        appName,
      });
    });
  });

  // Add mock tasks
  const tasks = [
    { title: 'Review Q4 budget report', ws: 'accounting' },
    { title: 'Update employee handbook', ws: 'personnel' },
    { title: 'Client meeting preparation', ws: 'main' },
    { title: 'Security audit review', ws: 'security' },
    { title: 'Approve new proposals', ws: 'admin' },
    { title: 'Data migration planning', ws: 'data' },
  ];
  tasks.forEach((t, i) => {
    results.push({
      id: `task-${i}`,
      type: 'task',
      title: t.title,
      subtitle: `Task in ${WORKSPACE_DEFINITIONS[t.ws as WorkspaceSlug]?.name || t.ws}`,
      wsSlug: t.ws,
    });
  });

  // Add mock events
  const events = [
    { title: 'Team Standup', ws: 'admin' },
    { title: 'Budget Review Meeting', ws: 'accounting' },
    { title: 'New Hire Orientation', ws: 'personnel' },
    { title: 'Client Demo', ws: 'main' },
    { title: 'Sprint Planning', ws: 'admin' },
  ];
  events.forEach((e, i) => {
    results.push({
      id: `event-${i}`,
      type: 'event',
      title: e.title,
      subtitle: `Event in ${WORKSPACE_DEFINITIONS[e.ws as WorkspaceSlug]?.name || e.ws}`,
      wsSlug: e.ws,
    });
  });

  return results;
};

const ALL_RESULTS = buildSearchIndex();

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen, onClose, onNavigateToWorkspace, onNavigateToMiniApp, currentWorkspace
}) => {
  const { getColor } = useWorkspaceColor();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const wsColor = currentWorkspace ? getColor(currentWorkspace) : null;
  const accentColor = wsColor?.primary || '#00ffff';
  const accentRgb = wsColor?.rgb || '0,255,255';

  // Filter results
  const filteredResults = query.trim()
    ? ALL_RESULTS.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_RESULTS.slice(0, 12);

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  filteredResults.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  const flatResults = filteredResults;

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(flatResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flatResults]);

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'workspace' && result.wsSlug) {
      onNavigateToWorkspace(result.wsSlug);
    } else if (result.type === 'miniapp' && result.wsSlug && result.appName) {
      onNavigateToMiniApp(result.wsSlug, result.appName);
    } else if (result.wsSlug) {
      onNavigateToWorkspace(result.wsSlug);
    }
    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'workspace': return HomeIcon;
      case 'miniapp': return FileIcon;
      case 'task': return TaskIcon;
      case 'event': return CalendarIcon;
      default: return SearchIcon;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'workspace': return 'Workspaces';
      case 'miniapp': return 'MiniApps';
      case 'task': return 'Tasks';
      case 'event': return 'Events';
      default: return type;
    }
  };

  // Global Cmd+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This is handled by parent - just prevent default
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-xl mx-4 bg-black rounded-2xl overflow-hidden"
        style={{
          border: `1px solid rgba(${accentRgb}, 0.3)`,
          boxShadow: `0 0 60px rgba(${accentRgb}, 0.15), 0 25px 50px rgba(0,0,0,0.5)`,
        }}>
        
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: `rgba(${accentRgb}, 0.2)` }}>
          <SearchIcon size={20} style={{ color: accentColor, filter: `drop-shadow(0 0 4px ${accentColor})` }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="flex-1 bg-transparent text-white text-sm font-mono placeholder-gray-500 focus:outline-none"
            placeholder="Search workspaces, apps, tasks, events..."
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-[10px] text-gray-500 font-mono">ESC</kbd>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto darkwave-scrollbar">
          {Object.entries(grouped).length === 0 ? (
            <div className="py-12 text-center">
              <SearchIcon size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 font-mono text-sm">No results found</p>
              <p className="text-gray-600 font-mono text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, results]) => {
              const TypeIcon = getTypeIcon(type);
              return (
                <div key={type}>
                  <div className="px-4 py-2 flex items-center gap-2 bg-gray-950/50 sticky top-0 z-10">
                    <TypeIcon size={12} style={{ color: accentColor }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: accentColor }}>
                      {getTypeLabel(type)}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">({results.length})</span>
                  </div>
                  {results.map(result => {
                    const idx = flatIndex++;
                    const isSelected = idx === selectedIndex;
                    const wsC = result.wsSlug ? getColor(result.wsSlug) : null;
                    const WsIcon = result.wsSlug ? (wsIconMap[result.wsSlug] || HomeIcon) : HomeIcon;

                    return (
                      <button
                        key={result.id}
                        data-index={idx}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                          isSelected ? 'bg-gray-900' : 'hover:bg-gray-950'
                        }`}
                        style={isSelected ? {
                          background: `linear-gradient(to right, rgba(${accentRgb}, 0.1), transparent)`,
                          borderLeft: `2px solid ${accentColor}`,
                        } : {}}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: wsC ? `linear-gradient(135deg, rgba(${wsC.rgb}, 0.15), rgba(0,0,0,0.9))` : 'rgba(31,41,55,1)',
                            border: wsC ? `1px solid rgba(${wsC.rgb}, 0.3)` : '1px solid rgba(75,85,99,0.5)',
                          }}>
                          <WsIcon size={14} style={{ color: wsC?.primary || '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-mono truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {result.title}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{result.subtitle}</p>
                        </div>
                        {isSelected && (
                          <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-500 font-mono flex-shrink-0">
                            Enter
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: `rgba(${accentRgb}, 0.15)` }}>
          <div className="flex items-center gap-3 text-[10px] text-gray-600 font-mono">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-900 border border-gray-800 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-900 border border-gray-800 rounded">Enter</kbd> Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-900 border border-gray-800 rounded">Esc</kbd> Close
            </span>
          </div>
          <span className="text-[10px] text-gray-600 font-mono">{flatResults.length} results</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
