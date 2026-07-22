import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon: string;
  wsColor: { primary: string; rgb: string };
}

// Pre-compute the list of valid Lucide components
const LUCIDE_ICON_NAMES = Object.keys(LucideIcons).filter((name) => {
  // Ensure it's a valid React component (starts with an uppercase letter)
  // ⚡ FIX: Actively strip out the "Icon" suffix and "Lucide" prefix aliases to prevent duplicates
  return /^[A-Z]/.test(name) && 
         !name.endsWith('Icon') && 
         !name.startsWith('Lucide') && 
         name !== 'IconNode' && 
         name !== 'LucideProps' &&
         name !== 'Icon';
});

export const ALL_ICONS = LUCIDE_ICON_NAMES;

// Define custom categories with keyword matching
const ICON_CATEGORIES = [
  { id: 'all', label: 'All Icons', keywords: [] },
  { id: 'ui', label: 'Interface & UI', keywords: ['user', 'home', 'settings', 'menu', 'search', 'bell', 'globe', 'link', 'layout', 'grid', 'list', 'panel', 'window', 'mouse', 'cursor'] },
  { id: 'files', label: 'Files & Folders', keywords: ['file', 'folder', 'doc', 'archive', 'paper', 'clipboard', 'save', 'download', 'upload', 'book', 'copy'] },
  { id: 'data', label: 'Data & Charts', keywords: ['chart', 'graph', 'pie', 'bar', 'trending', 'data', 'database', 'server', 'hard-drive', 'activity', 'stats'] },
  { id: 'comm', label: 'Communication', keywords: ['mail', 'message', 'phone', 'chat', 'send', 'inbox', 'video', 'mic', 'contact', 'share', 'rss'] },
  { id: 'arrows', label: 'Arrows', keywords: ['arrow', 'chevron', 'move', 'pointer', 'play', 'rewind', 'forward', 'undo', 'redo', 'refresh'] },
  { id: 'commerce', label: 'Commerce', keywords: ['shopping', 'cart', 'bag', 'credit', 'card', 'dollar', 'coin', 'bank', 'tag', 'store'] },
  { id: 'shapes', label: 'Shapes & Symbols', keywords: ['circle', 'square', 'triangle', 'box', 'hexagon', 'star', 'heart', 'cloud', 'moon', 'sun', 'shield', 'check', 'x'] }
];

const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen, onClose, onSelect, currentIcon, wsColor
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(150); // Lazy load threshold
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveCategory('all');
      setVisibleCount(150);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Handle filtering by both Category and Search Query
  const filteredIcons = useMemo(() => {
    let filtered = LUCIDE_ICON_NAMES;

    // 1. Filter by Category Keywords
    if (activeCategory !== 'all') {
      const category = ICON_CATEGORIES.find(c => c.id === activeCategory);
      if (category && category.keywords.length > 0) {
        filtered = filtered.filter(name => {
          const lowerName = name.toLowerCase();
          return category.keywords.some(kw => lowerName.includes(kw));
        });
      }
    }

    // 2. Filter by Search Input
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(name => name.toLowerCase().includes(q));
    }

    return filtered;
  }, [search, activeCategory]);

  // Only render up to the visible count to prevent browser freezing
  const displayedIcons = filteredIcons.slice(0, visibleCount);

  // Infinite Scroll Handler
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If scrolled within 200px of bottom edge, load 100 more icons
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      if (visibleCount < filteredIcons.length) {
        setVisibleCount(prev => prev + 100);
      }
    }
  };

  // Reset scroll and pagination when changing categories
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setVisibleCount(150);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative bg-black rounded-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ border: `1px solid rgba(${wsColor.rgb}, 0.3)`, boxShadow: `0 0 40px rgba(${wsColor.rgb}, 0.2)` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.08), transparent)` }}>
          <div>
            <h3 className="text-lg font-mono font-bold text-white">Select Icon</h3>
            <p className="text-xs text-gray-500 font-mono">Choose from {LUCIDE_ICON_NAMES.length.toLocaleString()} icons</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-colors">
            <LucideIcons.X size={20} />
          </button>
        </div>

        {/* Search & Tabs Container */}
        <div className="p-4 border-b border-gray-800 bg-gray-950 space-y-4">
          
          {/* Search Bar */}
          <div className="relative">
            <LucideIcons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(150); // Reset pagination on new search
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              placeholder="Search icons by name..."
              className="w-full bg-black border rounded-lg pl-10 pr-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
              style={{ borderColor: `rgba(${wsColor.rgb}, 0.3)` }}
              onFocus={e => { e.currentTarget.style.borderColor = wsColor.primary; e.currentTarget.style.boxShadow = `0 0 10px rgba(${wsColor.rgb}, 0.1)`; }}
              onBlur={e => { e.currentTarget.style.borderColor = `rgba(${wsColor.rgb}, 0.3)`; e.currentTarget.style.boxShadow = 'none'; }}
              autoFocus
            />
            {search && (
              <button onClick={() => { setSearch(''); setVisibleCount(150); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white rounded">
                <LucideIcons.X size={14} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto darkwave-scrollbar pb-1">
            {ICON_CATEGORIES.map(category => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className="px-4 py-1.5 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-all border"
                  style={{
                    backgroundColor: isActive ? `rgba(${wsColor.rgb}, 0.15)` : 'rgba(17,24,39,0.5)',
                    borderColor: isActive ? `rgba(${wsColor.rgb}, 0.5)` : 'rgba(75,85,99,0.3)',
                    color: isActive ? wsColor.primary : '#9ca3af',
                    boxShadow: isActive ? `0 0 10px rgba(${wsColor.rgb}, 0.1)` : 'none'
                  }}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Icon Grid */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 darkwave-scrollbar bg-black"
        >
          {filteredIcons.length === 0 ? (
            <div className="text-center py-12">
              <LucideIcons.SearchX size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-mono">No icons match your current filters</p>
              <button 
                onClick={() => { setSearch(''); handleCategoryChange('all'); }}
                className="mt-4 px-4 py-2 text-xs font-mono rounded-lg transition-colors hover:bg-gray-900 border border-gray-800 text-gray-400"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {displayedIcons.map(iconName => {
                const IconComponent = (LucideIcons as any)[iconName];
                const isSelected = currentIcon === iconName;
                
                return (
                  <button
                    key={iconName}
                    onClick={() => onSelect(iconName)}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all hover:scale-110 group"
                    style={{
                      borderColor: isSelected ? wsColor.primary : 'rgba(75,85,99,0.3)',
                      backgroundColor: isSelected ? `rgba(${wsColor.rgb}, 0.15)` : 'transparent',
                      boxShadow: isSelected ? `0 0 15px rgba(${wsColor.rgb}, 0.2)` : 'none'
                    }}
                    title={iconName}
                  >
                    <IconComponent 
                      size={24} 
                      className="transition-colors group-hover:opacity-100"
                      style={{ color: isSelected ? wsColor.primary : '#6b7280' }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-gray-950/50 flex justify-between items-center text-xs font-mono text-gray-500">
          <span>Showing {displayedIcons.length} of {filteredIcons.length}</span>
          <span className="flex items-center gap-1.5">
            Powered by Lucide <LucideIcons.Feather size={12} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default IconPickerModal;