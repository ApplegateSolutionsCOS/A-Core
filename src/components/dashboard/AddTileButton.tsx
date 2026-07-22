import React from 'react';
import { PlusIcon } from '@/components/icons/Icons';

interface AddTileButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

const AddTileButton: React.FC<AddTileButtonProps> = ({ 
  onClick, 
  label = 'Add Tile',
  className = '' 
}) => {
  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <button
        onClick={onClick}
        className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-dashed border-gray-700/60 bg-gray-950/30 text-gray-400 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all duration-300"
      >
        {/* Animated glow ring on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5" />
        
        <div className="relative w-10 h-10 rounded-xl border-2 border-dashed border-gray-700 group-hover:border-cyan-500/50 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
          <PlusIcon size={22} className="group-hover:text-cyan-400 transition-colors" />
        </div>
        <div className="relative text-left">
          <span className="font-mono text-sm font-medium block">{label}</span>
          <span className="font-mono text-[10px] text-gray-600 group-hover:text-cyan-500/60 transition-colors">
            Click to add a new widget
          </span>
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-transparent group-hover:border-cyan-500/40 rounded-tl-2xl transition-all duration-300" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-transparent group-hover:border-cyan-500/40 rounded-tr-2xl transition-all duration-300" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-transparent group-hover:border-cyan-500/40 rounded-bl-2xl transition-all duration-300" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-transparent group-hover:border-cyan-500/40 rounded-br-2xl transition-all duration-300" />
      </button>
    </div>
  );
};

export default AddTileButton;
