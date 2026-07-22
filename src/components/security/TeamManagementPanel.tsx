import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  user_email: string;
  user_name: string;
  role: string;
  status: string;
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  last_active_at: string | null;
  permissions: any;
  created_at: string;
}

interface AuditEntry {
  id: string;
  actor_email: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  action_detail: string;
  target_type: string;
  target_id: string;
  ip_address: string;
  metadata: any;
  created_at: string;
}

// Inline SVG Icons
const UsersIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const UserPlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
);
const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const ClockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const MailIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const ROLES = [
  { value: 'owner', label: 'Owner', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30', desc: 'Full access to all security features, team management, and configuration' },
  { value: 'admin', label: 'Admin', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30', desc: 'Full access except team management. Can modify blocklists, rules, and email configs' },
  { value: 'analyst', label: 'Analyst', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/30', desc: 'Can view dashboards, block IPs, run scans, and generate reports' },
  { value: 'viewer', label: 'Viewer', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/30', desc: 'Read-only access to dashboards, reports, and logs' },
];

const ROLE_PERMISSIONS: Record<string, { tabs: string[]; actions: string[] }> = {
  owner: { tabs: ['dashboard', 'scanner', 'network', 'alerts', 'compliance', 'reports', 'users'], actions: ['view', 'scan', 'block', 'config', 'report', 'team', 'audit'] },
  admin: { tabs: ['dashboard', 'scanner', 'network', 'alerts', 'compliance', 'reports', 'users'], actions: ['view', 'scan', 'block', 'config', 'report', 'audit'] },
  analyst: { tabs: ['dashboard', 'scanner', 'network', 'alerts', 'reports'], actions: ['view', 'scan', 'block', 'report'] },
  viewer: { tabs: ['dashboard', 'network', 'reports'], actions: ['view'] },
};

const TeamManagementPanel: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'roles' | 'audit'>('members');
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('auto-response', { body: { action: 'get_team' } });
      if (data?.members) setMembers(data.members);
    } catch (e) {}
  }, []);

  const fetchAuditTrail = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('auto-response', { body: { action: 'get_audit_trail', limit: 100 } });
      if (data?.trail) setAuditTrail(data.trail);
    } catch (e) {}
  }, []);

  useEffect(() => {
    Promise.all([fetchMembers(), fetchAuditTrail()]).then(() => setIsLoading(false));
  }, [fetchMembers, fetchAuditTrail]);

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error('Email is required'); return; }
    setIsInviting(true);
    try {
      const { data } = await supabase.functions.invoke('auto-response', {
        body: { action: 'invite_member', email: inviteEmail, name: inviteName, role: inviteRole, invited_by: 'admin' }
      });
      if (data?.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setShowInviteForm(false);
        setInviteEmail(''); setInviteName(''); setInviteRole('viewer');
        fetchMembers();
        fetchAuditTrail();
      } else {
        toast.error(data?.error || 'Failed to invite');
      }
    } catch (e: any) { toast.error(e.message || 'Error'); }
    setIsInviting(false);
  };

  const handleUpdateRole = async (member: TeamMember, newRole: string) => {
    await supabase.functions.invoke('auto-response', {
      body: { action: 'update_member', id: member.id, role: newRole, actor_email: 'admin' }
    });
    toast.success(`Updated ${member.user_email} to ${newRole}`);
    fetchMembers();
    fetchAuditTrail();
  };

  const handleRemoveMember = async (member: TeamMember) => {
    await supabase.functions.invoke('auto-response', {
      body: { action: 'remove_member', id: member.id, actor_email: 'admin' }
    });
    toast.success(`Removed ${member.user_email}`);
    fetchMembers();
    fetchAuditTrail();
  };

  const handleAcceptMember = async (member: TeamMember) => {
    await supabase.functions.invoke('auto-response', {
      body: { action: 'update_member', id: member.id, status: 'active', actor_email: 'admin' }
    });
    toast.success(`Activated ${member.user_email}`);
    fetchMembers();
  };

  const getRoleBadge = (role: string) => {
    const r = ROLES.find(r => r.value === role) || ROLES[3];
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${r.bgColor} ${r.color}`}>{r.label.toUpperCase()}</span>;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      active: { cls: 'bg-green-500/10 text-green-400 border-green-500/30', label: 'ACTIVE' },
      pending: { cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'PENDING' },
      suspended: { cls: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'SUSPENDED' },
    };
    const s = map[status] || { cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30', label: status?.toUpperCase() || 'UNKNOWN' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${s.cls}`}>{s.label}</span>;
  };

  const timeAgo = (ts: string) => {
    if (!ts) return 'never';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return Math.floor(diff / 1000) + 's ago';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  };

  const getActionIcon = (type: string) => {
    const map: Record<string, { color: string; label: string }> = {
      invite_member: { color: 'text-green-400', label: 'INVITE' },
      update_member: { color: 'text-blue-400', label: 'UPDATE' },
      remove_member: { color: 'text-red-400', label: 'REMOVE' },
      block_ip: { color: 'text-red-400', label: 'BLOCK' },
      config_change: { color: 'text-yellow-400', label: 'CONFIG' },
      report_generated: { color: 'text-purple-400', label: 'REPORT' },
      login: { color: 'text-cyan-400', label: 'LOGIN' },
    };
    const a = map[type] || { color: 'text-gray-400', label: type?.toUpperCase() || 'ACTION' };
    return <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${a.color}`}>{a.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UsersIcon size={22} className="text-cyan-400" />
            <div>
              <h3 className="text-white font-mono font-bold text-lg">Security Team Management</h3>
              <p className="text-gray-500 font-mono text-xs">Role-based access controls, invitations, and audit trail</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-mono text-xs">{members.length} members</span>
            <button onClick={() => { fetchMembers(); fetchAuditTrail(); }} className="p-2 text-gray-500 hover:text-cyan-400">
              <RefreshIcon size={14} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'members' as const, label: `Team Members (${members.length})`, icon: <UsersIcon size={14} /> },
            { id: 'roles' as const, label: 'Role Permissions', icon: <ShieldIcon size={14} /> },
            { id: 'audit' as const, label: `Audit Trail (${auditTrail.length})`, icon: <ClockIcon size={14} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveSubTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${activeSubTab === t.id ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400' : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Tab */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 font-mono text-sm">
              <UserPlusIcon size={14} /> Invite Member
            </button>
          </div>

          {showInviteForm && (
            <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-mono font-bold">Invite Team Member</h4>
                <button onClick={() => setShowInviteForm(false)} className="text-gray-500 hover:text-white"><XIcon size={16} /></button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Email Address</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Display Name</label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Doe"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-gray-400 font-mono text-xs uppercase block mb-1">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} - {r.desc.slice(0, 50)}...</option>)}
                  </select>
                </div>
              </div>
              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-gray-400 font-mono text-xs">
                  <MailIcon size={12} className="inline mr-1 text-cyan-400" />
                  An invitation email will be sent via SendGrid with a link to accept the invitation.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleInvite} disabled={isInviting}
                  className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 font-mono text-sm font-bold disabled:opacity-50">
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button onClick={() => setShowInviteForm(false)} className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg hover:text-white font-mono text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
            {members.length === 0 ? (
              <div className="p-12 text-center">
                <UsersIcon size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 font-mono text-sm">No team members yet</p>
                <p className="text-gray-700 font-mono text-xs mt-1">Invite members to collaborate on security operations</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {members.map(member => (
                  <div key={member.id} className="p-4 hover:bg-cyan-500/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-mono font-bold ${
                          member.role === 'owner' ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400' :
                          member.role === 'admin' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
                          member.role === 'analyst' ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400' :
                          'bg-gray-800 border border-gray-700 text-gray-400'
                        }`}>
                          {(member.user_name || member.user_email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-mono text-sm">{member.user_name || member.user_email}</p>
                            {getRoleBadge(member.role)}
                            {getStatusBadge(member.status)}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-gray-500 font-mono text-xs">{member.user_email}</span>
                            <span className="text-gray-600 font-mono text-[10px]">Invited {timeAgo(member.invited_at)}</span>
                            {member.last_active_at && <span className="text-green-400/50 font-mono text-[10px]">Active {timeAgo(member.last_active_at)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.status === 'pending' && (
                          <button onClick={() => handleAcceptMember(member)} className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-[10px] font-mono font-bold hover:bg-green-500/20">
                            ACTIVATE
                          </button>
                        )}
                        <select value={member.role} onChange={e => handleUpdateRole(member, e.target.value)}
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none">
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button onClick={() => handleRemoveMember(member)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          {ROLES.map(role => {
            const perms = ROLE_PERMISSIONS[role.value];
            return (
              <div key={role.value} className={`rounded-xl border bg-black/80 p-5 ${role.bgColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  <ShieldIcon size={18} className={role.color} />
                  <div>
                    <h4 className={`font-mono font-bold ${role.color}`}>{role.label}</h4>
                    <p className="text-gray-500 font-mono text-xs">{role.desc}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 font-mono text-[10px] uppercase mb-2">Accessible Tabs</p>
                    <div className="flex flex-wrap gap-1">
                      {['dashboard', 'scanner', 'network', 'alerts', 'compliance', 'reports', 'users'].map(tab => (
                        <span key={tab} className={`px-2 py-0.5 rounded text-[10px] font-mono ${perms?.tabs.includes(tab) ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-900 text-gray-700 border border-gray-800 line-through'}`}>
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 font-mono text-[10px] uppercase mb-2">Allowed Actions</p>
                    <div className="flex flex-wrap gap-1">
                      {['view', 'scan', 'block', 'config', 'report', 'team', 'audit'].map(action => (
                        <span key={action} className={`px-2 py-0.5 rounded text-[10px] font-mono ${perms?.actions.includes(action) ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-gray-900 text-gray-700 border border-gray-800 line-through'}`}>
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeSubTab === 'audit' && (
        <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">{auditTrail.length} audit entries</span>
            <button onClick={fetchAuditTrail} className="text-gray-500 hover:text-cyan-400"><RefreshIcon size={14} /></button>
          </div>
          {auditTrail.length === 0 ? (
            <div className="p-12 text-center">
              <ClockIcon size={32} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 font-mono text-sm">No audit entries yet</p>
              <p className="text-gray-700 font-mono text-xs mt-1">Actions performed by team members will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
              {auditTrail.map(entry => (
                <div key={entry.id} className="p-3 hover:bg-gray-900/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-mono text-gray-400">
                        {(entry.actor_email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-mono text-sm">{entry.actor_email || 'System'}</span>
                          {getActionIcon(entry.action_type)}
                        </div>
                        <p className="text-gray-500 font-mono text-xs mt-0.5">{entry.action_detail || entry.action_type}</p>
                        {entry.target_id && <p className="text-gray-600 font-mono text-[10px]">Target: {entry.target_id}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600 font-mono text-[10px] block">{timeAgo(entry.created_at)}</span>
                      {entry.ip_address && <span className="text-gray-700 font-mono text-[10px]">{entry.ip_address}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamManagementPanel;
