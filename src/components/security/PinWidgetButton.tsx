import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PinWidgetButtonProps {
  widgetType: string;
  title: string;
  sourceWorkspace?: string;
  widgetConfig?: Record<string, any>;
  className?: string;
}

const PinWidgetButton: React.FC<PinWidgetButtonProps> = ({
  widgetType,
  title,
  sourceWorkspace = 'security',
  widgetConfig = {},
  className = '',
}) => {
  const { user } = useAuth();
  const [isPinning, setIsPinning] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isPinning) return;
    const userId = (user as any).id || (user as any).email;
    if (!userId) return;

    setIsPinning(true);
    try {
      const { data, error } = await supabase.functions.invoke('qcore-security', {
        body: {
          action: 'pin_widget',
          user_id: userId,
          widget_type: widgetType,
          title: title,
          source_workspace: sourceWorkspace,
          widget_config: widgetConfig,
        },
      });
      if (!error && data?.success) {
        setIsPinned(true);
        toast.success(`"${title}" pinned to your dashboard`);
        setTimeout(() => setIsPinned(false), 3000);
      } else {
        toast.error('Failed to pin widget');
      }
    } catch {
      toast.error('Failed to pin widget');
    }
    setIsPinning(false);
  };

  return (
    <button
      onClick={handlePin}
      disabled={isPinning || isPinned}
      title={isPinned ? 'Pinned to dashboard' : `Pin "${title}" to your dashboard`}
      className={`group relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
        isPinned
          ? 'bg-green-500/20 border-green-500/50 text-green-400'
          : isPinning
          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse'
          : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/10'
      } ${className}`}
    >
      {isPinning ? (
        <div className="w-3.5 h-3.5 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
      ) : isPinned ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="group-hover:drop-shadow-[0_0_4px_rgba(255,153,0,0.6)]">
          <path d="M16 2L14.5 3.5L18.5 7.5L20 6C20 6 21 5 20 4L18 2C17 1 16 2 16 2Z" />
          <path d="M12.5 5.5L5 13L5 17L9 17L16.5 9.5L12.5 5.5Z" />
          <path d="M2 22L7 17" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )}
      {/* Tooltip */}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-gray-700 rounded text-[9px] font-mono text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {isPinned ? 'Pinned!' : 'Pin to Dashboard'}
      </span>
    </button>
  );
};

export default PinWidgetButton;
