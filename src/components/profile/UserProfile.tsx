import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/dbProxy';
import { supabase } from '@/lib/supabase';

import { useWorkspaceColor } from '@/contexts/WorkspaceColorContext';
import {
  CloseIcon,
  UserIcon,
  MailIcon,
  CalendarIcon,
  ShieldIcon,
  EditIcon,
  SaveIcon,
  ActivityIcon,
} from '@/components/icons/Icons';
import { OrganizationUser, PlatformUser, WORKSPACE_DEFINITIONS } from '@/types';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace?: string;
}

interface ProfileData {
  display_name: string;
  avatar_url: string;
  bio: string;
  phone: string;
  timezone: string;
}

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
];

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose, currentWorkspace }) => {
  const { user, userType, organization, isPlatformOwner, isPlatformUser, isOrganizationAdmin } = useAuth();
  const { getColor } = useWorkspaceColor();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    avatar_url: '',
    bio: '',
    phone: '',
    timezone: 'UTC',
  });
  const [editProfile, setEditProfile] = useState<ProfileData>({ ...profile });

  const wsColor = currentWorkspace ? getColor(currentWorkspace) : null;
  const accentColor = wsColor?.primary || '#00ffff';
  const accentRgb = wsColor?.rgb || '0,255,255';

  const getUserName = () => {
    if (!user) return 'User';
    return (user as OrganizationUser | PlatformUser).full_name || 'User';
  };

  const getUserEmail = () => {
    if (!user) return '';
    return (user as OrganizationUser | PlatformUser).email || '';
  };

  const getUserRole = () => {
    if (isPlatformOwner()) return 'Platform Owner';
    if (isPlatformUser()) {
      const pu = user as PlatformUser;
      return pu.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    const ou = user as OrganizationUser;
    return ou?.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User';
  };

  const getUserCreatedAt = () => {
    if (!user) return '';
    return (user as any).created_at || '';
  };

  const getUserId = () => {
    if (!user) return '';
    return (user as any).id || (user as any).email || '';
  };

  // Load profile from DB
  const loadProfile = useCallback(async () => {
    const uid = getUserId();
    if (!uid) return;
    try {
      const { data, error } = await db
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)
        .single();


      if (!error && data) {
        const p = {
          display_name: data.display_name || getUserName(),
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          phone: data.phone || '',
          timezone: data.timezone || 'UTC',
        };
        setProfile(p);
        setEditProfile(p);
      } else {
        const p = {
          display_name: getUserName(),
          avatar_url: '',
          bio: '',
          phone: '',
          timezone: 'UTC',
        };
        setProfile(p);
        setEditProfile(p);
      }
    } catch {
      const p = {
        display_name: getUserName(),
        avatar_url: '',
        bio: '',
        phone: '',
        timezone: 'UTC',
      };
      setProfile(p);
      setEditProfile(p);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) loadProfile();
  }, [isOpen, loadProfile]);

  const handleSave = async () => {
    const uid = getUserId();
    if (!uid) return;

    setIsSaving(true);
    try {
      const { error } = await db.from('user_profiles').upsert({
        user_id: uid,
        display_name: editProfile.display_name,
        avatar_url: editProfile.avatar_url,
        bio: editProfile.bio,
        phone: editProfile.phone,
        timezone: editProfile.timezone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) {
        // Try insert
        await db.from('user_profiles').insert({
          user_id: uid,
          display_name: editProfile.display_name,
          avatar_url: editProfile.avatar_url,
          bio: editProfile.bio,
          phone: editProfile.phone,
          timezone: editProfile.timezone,
        });
      }


      setProfile({ ...editProfile });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Recent activity mock data
  const recentActivity = [
    { workspace: 'admin', action: 'Updated record in Contacts', time: '2 hours ago' },
    { workspace: 'accounting', action: 'Created new payment entry', time: '5 hours ago' },
    { workspace: 'main', action: 'Completed task "Review proposal"', time: '1 day ago' },
    { workspace: 'personnel', action: 'Added new member document', time: '2 days ago' },
    { workspace: 'data', action: 'Modified specifications', time: '3 days ago' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-black rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          border: `1px solid rgba(${accentRgb}, 0.3)`,
          boxShadow: `0 0 40px rgba(${accentRgb}, 0.15)`,
        }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b"
          style={{
            borderColor: `rgba(${accentRgb}, 0.2)`,
            background: `linear-gradient(to right, black, rgba(${accentRgb}, 0.05), black)`,
          }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl border-2 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, rgba(${accentRgb}, 0.3), rgba(0,0,0,0.8))`,
                  borderColor: `rgba(${accentRgb}, 0.5)`,
                  boxShadow: `0 0 20px rgba(${accentRgb}, 0.3)`,
                }}>
                <span style={{ color: accentColor }}>
                  <UserIcon size={28} />
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black shadow-[0_0_8px_rgba(0,255,0,0.6)]" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-white">{profile.display_name || getUserName()}</h2>
              <p className="text-xs font-mono" style={{ color: accentColor }}>{getUserRole()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => { setEditProfile({ ...profile }); setIsEditing(true); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-mono transition-all"
                style={{ borderColor: `rgba(${accentRgb}, 0.3)`, color: accentColor }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = `rgba(${accentRgb}, 0.1)`; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
              >
                <EditIcon size={14} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm font-mono hover:bg-gray-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono text-white transition-all"
                  style={{ background: `rgba(${accentRgb}, 0.2)`, border: `1px solid rgba(${accentRgb}, 0.5)` }}
                >
                  <SaveIcon size={14} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Save success message */}
        {saveSuccess && (
          <div className="mx-5 mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20,6 9,17 4,12" /></svg>
            <span className="text-green-400 text-sm font-mono">Profile updated successfully</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 darkwave-scrollbar space-y-6">
          {/* Profile Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Display Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editProfile.display_name}
                  onChange={e => setEditProfile({ ...editProfile, display_name: e.target.value })}
                  className="w-full bg-gray-950 border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none"
                  style={{ borderColor: `rgba(${accentRgb}, 0.3)` }}
                  onFocus={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb}, 0.6)`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb}, 0.3)`; }}
                />
              ) : (
                <p className="text-white font-mono text-sm py-2">{profile.display_name || getUserName()}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1 flex items-center gap-1">
                <MailIcon size={12} /> Email
              </label>
              <p className="text-gray-400 font-mono text-sm py-2">{getUserEmail()}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1 flex items-center gap-1">
                <ShieldIcon size={12} /> Role
              </label>
              <div className="flex items-center gap-2 py-2">
                <span className="px-2 py-1 rounded-lg text-xs font-mono" style={{
                  background: `rgba(${accentRgb}, 0.1)`,
                  border: `1px solid rgba(${accentRgb}, 0.3)`,
                  color: accentColor,
                }}>
                  {getUserRole()}
                </span>
              </div>
            </div>

            {/* Organization */}
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Organization</label>
              <p className="text-white font-mono text-sm py-2">{organization?.name || 'Applegate CORE'}</p>
            </div>

            {/* Account Created */}
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1 flex items-center gap-1">
                <CalendarIcon size={12} /> Account Created
              </label>
              <p className="text-gray-400 font-mono text-sm py-2">
                {getUserCreatedAt() ? new Date(getUserCreatedAt()).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }) : 'N/A'}
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Timezone</label>
              {isEditing ? (
                <select
                  value={editProfile.timezone}
                  onChange={e => setEditProfile({ ...editProfile, timezone: e.target.value })}
                  className="w-full bg-gray-950 border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none"
                  style={{ borderColor: `rgba(${accentRgb}, 0.3)` }}
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              ) : (
                <p className="text-gray-400 font-mono text-sm py-2">{profile.timezone}</p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs text-gray-500 font-mono mb-1">Bio</label>
            {isEditing ? (
              <textarea
                value={editProfile.bio}
                onChange={e => setEditProfile({ ...editProfile, bio: e.target.value })}
                className="w-full bg-gray-950 border rounded-lg px-3 py-2 text-white text-sm font-mono h-20 resize-none focus:outline-none"
                style={{ borderColor: `rgba(${accentRgb}, 0.3)` }}
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-gray-400 font-mono text-sm py-2">{profile.bio || 'No bio set'}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs text-gray-500 font-mono mb-1">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                value={editProfile.phone}
                onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })}
                className="w-full bg-gray-950 border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none"
                style={{ borderColor: `rgba(${accentRgb}, 0.3)` }}
                placeholder="+1 (555) 123-4567"
              />
            ) : (
              <p className="text-gray-400 font-mono text-sm py-2">{profile.phone || 'Not set'}</p>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-sm font-mono font-medium text-white flex items-center gap-2 mb-3">
              <ActivityIcon size={16} style={{ color: accentColor }} />
              Recent Activity
            </h3>
            <div className="space-y-2">
              {recentActivity.map((activity, i) => {
                const wsC = getColor(activity.workspace);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800/50">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, rgba(${wsC.rgb}, 0.15), rgba(0,0,0,0.9))`,
                        border: `1px solid rgba(${wsC.rgb}, 0.3)`,
                      }}>
                      <span className="text-[10px] font-mono font-bold" style={{ color: wsC.primary }}>
                        {activity.workspace.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 font-mono truncate">{activity.action}</p>
                      <p className="text-[10px] text-gray-600 font-mono">
                        {WORKSPACE_DEFINITIONS[activity.workspace as keyof typeof WORKSPACE_DEFINITIONS]?.name || activity.workspace}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800 bg-gray-950/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 font-mono">
              User ID: {getUserId().substring(0, 8)}...
            </p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-900 border rounded-lg text-gray-300 text-sm font-mono transition-all"
              style={{ borderColor: `rgba(${accentRgb}, 0.3)` }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
