import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  EditIcon,
  EyeOffIcon,
  Share2Icon,
  DownloadIcon,
  UploadIcon,
  BellIcon,
  SettingsIcon,
  LinkIcon,
  WorkflowIcon,
  StarIcon,
  TrashIcon,
  AlertTriangleIcon,
} from '@/components/icons/Icons';

interface MiniAppContextMenuProps {
  appId: string;
  appName: string;
  position: { x: number; y: number };
  isVisible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onWorkflows: () => void;
  onHide: () => void;
  onIntegrations: () => void;
  onShare: () => void;
  onImport: () => void;
  onExport: () => void;
  onNotifications: () => void;
  // ⚡ DELETED onAdvanced
  onFavorite?: () => void;
  onDelete?: (appId: string, appName: string) => void;
  isFavorited?: boolean;
  wsColor?: { primary: string; rgb: string };
  isAdmin: boolean;
}

const MiniAppContextMenu: React.FC<MiniAppContextMenuProps> = ({
  appId, appName, position, isVisible, onClose,
  onEdit, onWorkflows, onHide, onIntegrations, onShare,
  onImport, onExport, onNotifications,
  onFavorite, onDelete, isFavorited, // ⚡ DELETED onAdvanced
  wsColor = { primary: '#06b6d4', rgb: '6, 182, 212' }, 
  isAdmin,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // ⚡ Added loading state

  useEffect(() => {
    if (isVisible && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = position.x;
      let y = position.y;
      if (x + rect.width > vw - 10) x = vw - rect.width - 10;
      if (y + rect.height > vh - 10) y = vh - rect.height - 10;
      if (x < 10) x = 10;
      if (y < 10) y = 10;
      setAdjustedPos({ x, y });
    }
  }, [isVisible, position]);

  useEffect(() => {
    if (!isVisible) return;
    const handleClick = (e: MouseEvent) => {
      // Prevent closing if we are actively deleting
      if (isDeleting) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDeleteConfirm(false);
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (isDeleting) return;
      if (e.key === 'Escape') {
        setShowDeleteConfirm(false);
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isVisible, onClose, isDeleting]);

  if (!isVisible) return null;

  // ⚡ BULLETPROOF DELETE FUNCTION
  const handleDelete = async () => {
    if (!isAdmin) return;
    
    // Guardrail: Ensure we actually have an ID to target
    if (!appId) {
      alert("System Error: App ID is missing. Please refresh the dashboard to sync records.");
      return;
    }

    setIsDeleting(true);

    try {
      // 1. Delete from the database FIRST
      const { error } = await supabase
        .schema('app_private')
        .from('mini_apps')
        .delete()
        .eq('id', appId);

      if (error) throw error;

      // 2. Fire the UI cleanup callback ONLY after DB success
      if (onDelete) {
        onDelete(appId, appName);
      }

      // 3. Finally, close the menus
      setShowDeleteConfirm(false);
      onClose();

    } catch (err: any) {
      console.error('Error deleting MiniApp:', err);
      alert(`Failed to delete MiniApp: ${err.message}`);
      setIsDeleting(false); // Reset so user can try again or cancel
    }
  };

  const menuItems = [
    ...(onFavorite ? [{ icon: StarIcon, label: isFavorited ? 'Unfavorite' : 'Favorite', action: onFavorite, color: isFavorited ? 'text-yellow-400' : '', adminOnly: false }] : []),
    { icon: EditIcon, label: 'Edit', action: onEdit, color: '', adminOnly: true },
    { icon: WorkflowIcon, label: 'Workflows', action: onWorkflows, color: '', adminOnly: true },
    { icon: EyeOffIcon, label: 'Hide', action: onHide, color: '', adminOnly: true },
    { icon: LinkIcon, label: 'Integrations', action: onIntegrations, color: '', adminOnly: true },
    { divider: true },
    { icon: Share2Icon, label: 'Share', action: onShare, color: '', adminOnly: false },
    { icon: UploadIcon, label: 'Import', action: onImport, color: '', adminOnly: true },
    { icon: DownloadIcon, label: 'Export', action: onExport, color: '', adminOnly: false },
    { divider: true },
    { icon: BellIcon, label: 'Notifications', action: onNotifications, color: '', adminOnly: false },
    // ⚡ DELETED SettingsIcon/Advanced entry here
    // Delete option - admin only, always last
    ...(onDelete && isAdmin ? [
      { divider: true },
      { icon: TrashIcon, label: 'Delete', action: () => setShowDeleteConfirm(true), color: 'text-red-400', adminOnly: true, isDanger: true },
    ] : []),
  ];

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-[9999] bg-black/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          left: adjustedPos.x,
          top: adjustedPos.y,
          border: `1px solid rgba(${wsColor.rgb}, 0.4)`,
          boxShadow: `0 0 30px rgba(${wsColor.rgb}, 0.15), 0 20px 60px rgba(0,0,0,0.8)`,
          minWidth: '200px',
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b" style={{ borderColor: `rgba(${wsColor.rgb}, 0.2)`, background: `linear-gradient(to right, rgba(${wsColor.rgb}, 0.08), transparent)` }}>
          <p className="text-xs font-mono font-medium" style={{ color: wsColor.primary }}>{appName}</p>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          {menuItems.map((item, index) => {
            if ('divider' in item && item.divider) {
              return <div key={`div-${index}`} className="my-1 border-t" style={{ borderColor: `rgba(${wsColor.rgb}, 0.15)` }} />;
            }
            const menuItem = item as { icon: React.FC<any>; label: string; action: () => void; color: string; adminOnly: boolean; isDanger?: boolean };
            if (menuItem.adminOnly && !isAdmin) return null;
            const Icon = menuItem.icon;
            return (
              <button
                key={menuItem.label}
                onClick={() => {
                  menuItem.action();
                  if (!menuItem.isDanger) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-mono text-gray-300 transition-all"
                onMouseEnter={e => {
                  if (menuItem.isDanger) {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#f87171';
                  } else {
                    e.currentTarget.style.backgroundColor = `rgba(${wsColor.rgb}, 0.1)`;
                    e.currentTarget.style.color = wsColor.primary;
                  }
                }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}
              >
                <Icon size={15} className={menuItem.color || ''} />
                <span>{menuItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
          <div
            className="relative bg-black/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full mx-4 border"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.15), 0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <AlertTriangleIcon size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Delete MiniApp</h3>
                <p className="text-xs text-gray-500 font-mono">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 mb-5">
              <p className="text-sm text-gray-300 font-mono">
                Are you sure you want to permanently delete <span className="font-bold text-red-400">"{appName}"</span>?
              </p>
              <p className="text-xs text-gray-500 font-mono mt-2">
                This will delete the MiniApp schema, all associated records, version history, and workflows. This cannot be reversed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-900 font-mono text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex-1 py-2.5 border font-mono text-sm font-medium transition-all rounded-lg flex items-center justify-center gap-2 ${
                  isDeleting 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500/50 cursor-not-allowed' 
                    : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-500/50 border-t-red-500 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MiniAppContextMenu;