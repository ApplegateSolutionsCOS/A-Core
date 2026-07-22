import React, { ReactNode, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import AddTileButton from '@/components/dashboard/AddTileButton';
import WidgetLibraryPanel from '@/components/dashboard/WidgetLibraryPanel';
import LayoutTemplatesModal from '@/components/dashboard/LayoutTemplatesModal';
import type { CatalogWidget, LayoutTemplate } from '@/lib/widgetCatalog';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  glowColor?: 'cyan' | 'magenta' | 'green' | 'purple' | 'orange';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = 'neutral',
  onClick,
  glowColor = 'cyan'
}) => {
  const glowClasses = {
    cyan: 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-black hover:border-cyan-500/50',
    magenta: 'border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/30 to-black hover:border-fuchsia-500/50',
    green: 'border-green-500/30 bg-gradient-to-br from-green-950/30 to-black hover:border-green-500/50',
    purple: 'border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-black hover:border-purple-500/50',
    orange: 'border-orange-500/30 bg-gradient-to-br from-orange-950/30 to-black hover:border-orange-500/50',
  };

  const iconClasses = {
    cyan: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40',
    magenta: 'text-fuchsia-400 bg-fuchsia-500/20 border-fuchsia-500/40',
    green: 'text-green-400 bg-green-500/20 border-green-500/40',
    purple: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
    orange: 'text-orange-400 bg-orange-500/20 border-orange-500/40',
  };

  const textClasses = {
    cyan: 'text-cyan-400',
    magenta: 'text-fuchsia-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
  };

  const trendColors = {
    up: 'text-green-400 bg-green-500/10 border-green-500/30',
    down: 'text-red-400 bg-red-500/10 border-red-500/30',
    neutral: 'text-gray-400 bg-gray-500/10 border-gray-500/30'
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div 
      className={`relative rounded-xl border p-5 transition-all ${glowClasses[glowColor]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br" />
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 font-mono uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold mt-1 font-mono ${textClasses[glowColor]}`}>{value}</p>
          {change !== undefined && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono mt-2 border ${trendColors[trend]}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{change > 0 ? '+' : ''}{change}%</span>
              {changeLabel && <span className="text-gray-500 ml-1">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${iconClasses[glowColor]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface QuickActionProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'warning' | 'danger';
}

export const QuickAction: React.FC<QuickActionProps> = ({
  title,
  description,
  icon,
  onClick,
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'hover:bg-gray-900/50 border-gray-800 hover:border-cyan-500/30',
    primary: 'hover:bg-cyan-500/10 border-cyan-500/30 bg-cyan-500/5',
    warning: 'hover:bg-orange-500/10 border-orange-500/30 bg-orange-500/5',
    danger: 'hover:bg-red-500/10 border-red-500/30 bg-red-500/5'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left bg-black/50 ${variantStyles[variant]}`}
    >
      <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-white font-mono">{title}</p>
        <p className="text-sm text-gray-500 font-mono">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-600" />
    </button>
  );
};

interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
  icon: ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info';
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  title,
  description,
  time,
  icon,
  status = 'info'
}) => {
  const statusColors = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800 last:border-0">
      <div className={`p-2 rounded-lg border ${statusColors[status]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate font-mono">{title}</p>
        <p className="text-sm text-gray-500 truncate font-mono">{description}</p>
      </div>
      <span className="text-xs text-gray-600 whitespace-nowrap font-mono">{time}</span>
    </div>
  );
};

interface TeamMemberProps {
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  onClick?: () => void;
}

export const TeamMember: React.FC<TeamMemberProps> = ({
  name,
  role,
  avatar,
  status,
  onClick
}) => {
  const statusColors = {
    online: 'bg-green-400 shadow-[0_0_6px_rgba(0,255,0,0.5)]',
    away: 'bg-orange-400 shadow-[0_0_6px_rgba(255,153,0,0.5)]',
    offline: 'bg-gray-600'
  };

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full rounded-lg object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${statusColors[status]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate font-mono">{name}</p>
        <p className="text-xs text-gray-500 truncate font-mono">{role}</p>
      </div>
    </div>
  );
};

interface DashboardShellProps {
  title: string;
  subtitle: string;
  roleBadge: string;
  roleColor?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  isGodMode?: boolean;
  onAddTile?: (widget: CatalogWidget) => void;
  onApplyLayout?: (template: LayoutTemplate) => void;
  tileCount?: number;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  subtitle,
  roleBadge,
  roleColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  children,
  headerActions,
  isGodMode = false,
  onAddTile,
  onApplyLayout,
  tileCount = 0,
}) => {
  // Determine if this is God Mode based on roleBadge
  const isGodModeActive = isGodMode || roleBadge === 'God Mode';

  // Internal state for Widget Library and Layout Templates
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showLayoutTemplates, setShowLayoutTemplates] = useState(false);
  const [addedWidgetIds, setAddedWidgetIds] = useState<string[]>([]);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const handleAddWidget = useCallback((widget: CatalogWidget) => {
    setAddedWidgetIds(prev => [...prev, widget.id]);
    if (onAddTile) {
      onAddTile(widget);
    } else {
      // Default feedback when no handler is provided
      setAddFeedback(widget.name);
      setTimeout(() => setAddFeedback(null), 2000);
    }
  }, [onAddTile]);

  const handleApplyLayout = useCallback((template: LayoutTemplate) => {
    if (onApplyLayout) {
      onApplyLayout(template);
    }
  }, [onApplyLayout]);
  
  return (
    <div className="min-h-screen bg-black">
      {/* Background patterns */}
      <div className="fixed inset-0 alien-grid pointer-events-none" />
      <div className="fixed inset-0 hex-pattern pointer-events-none opacity-20" />
      
      {/* Header - Fixed to stay on top when scrolling */}
      <div className="bg-black/95 backdrop-blur-lg border-b border-cyan-500/20 fixed top-16 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  {/* Title with blue/green scheme for God Mode */}
                  <h1 className={`text-xl font-bold font-mono ${isGodModeActive ? 'bg-gradient-to-r from-cyan-400 via-green-400 to-cyan-400 bg-clip-text text-transparent' : 'text-white'}`}>
                    {title}
                  </h1>
                  {/* God Mode tag with glowing white on black */}
                  {isGodModeActive ? (
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black border border-white/50 text-white shadow-[0_0_10px_rgba(255,255,255,0.5),0_0_20px_rgba(255,255,255,0.3)]">
                      {roleBadge}
                    </span>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-mono border ${roleColor}`}>{roleBadge}</span>
                  )}
                </div>
                <p className={`text-sm font-mono ${isGodModeActive ? 'text-green-400/70' : 'text-gray-500'}`}>{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Layout Templates button */}
              <button
                onClick={() => setShowLayoutTemplates(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/40 font-mono text-xs transition-all"
                title="Layout Templates"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <span className="hidden sm:inline">Layouts</span>
              </button>
              {/* Only show headerActions if not God Mode (removed duplicate buttons) */}
              {!isGodModeActive && headerActions && (
                <>
                  {headerActions}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content - Add padding for fixed header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 pb-24 pt-24">
        {children}

        {/* Add Tile Button at the bottom of all content */}
        <AddTileButton
          onClick={() => setShowWidgetLibrary(true)}
          label="Add Widget"
          className="mt-8"
        />
      </div>

      {/* Widget added feedback toast */}
      {addFeedback && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/40 shadow-[0_0_30px_rgba(0,255,0,0.15)] backdrop-blur-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
              <polyline points="20,6 9,17 4,12" />
            </svg>
            <span className="text-green-400 font-mono text-sm font-medium">
              {addFeedback} added to dashboard
            </span>
          </div>
        </div>
      )}

      {/* Widget Library Panel (slide-over) */}
      <WidgetLibraryPanel
        isOpen={showWidgetLibrary}
        onClose={() => setShowWidgetLibrary(false)}
        onAddWidget={handleAddWidget}
        addedWidgetIds={addedWidgetIds}
      />

      {/* Layout Templates Modal */}
      <LayoutTemplatesModal
        isOpen={showLayoutTemplates}
        onClose={() => setShowLayoutTemplates(false)}
        onApplyTemplate={handleApplyLayout}
        currentTileCount={tileCount}
      />
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold text-white font-mono">{title}</h2>
    {action}
  </div>
);

export default DashboardShell;
