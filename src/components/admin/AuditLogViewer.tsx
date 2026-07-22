import React, { useState, useEffect } from 'react';
import { db } from '@/lib/dbProxy';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/contexts/AuthContext';
import {
  SearchIcon,
  FilterIcon,
  RefreshIcon,
  HistoryIcon,
  UserIcon,
  LockIcon,
  CreditCardIcon,
  SettingsIcon,
  DatabaseIcon,
  ShieldIcon,
  ChevronDownIcon,
  CalendarIcon,
  DownloadIcon
} from '@/components/icons/Icons';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  user_type: 'platform_user' | 'organization_user';
  organization_id: string | null;
  action_type: string;
  action_category: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogViewerProps {
  organizationId?: string;
  isPlatformOwner?: boolean;
}

const ACTION_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'data', label: 'Data Changes' },
  { value: 'permissions', label: 'Permissions' },
  { value: 'billing', label: 'Billing' },
  { value: 'users', label: 'Users' },
  { value: 'organization', label: 'Organization' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'miniapp', label: 'MiniApps' },
  { value: 'settings', label: 'Settings' },
  { value: 'security', label: 'Security' },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'authentication': return LockIcon;
    case 'data': return DatabaseIcon;
    case 'permissions': return ShieldIcon;
    case 'billing': return CreditCardIcon;
    case 'users': return UserIcon;
    case 'settings': return SettingsIcon;
    case 'security': return LockIcon;
    default: return HistoryIcon;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'authentication': return 'text-blue-400 bg-blue-500/20';
    case 'data': return 'text-green-400 bg-green-500/20';
    case 'permissions': return 'text-purple-400 bg-purple-500/20';
    case 'billing': return 'text-yellow-400 bg-yellow-500/20';
    case 'users': return 'text-orange-400 bg-orange-500/20';
    case 'organization': return 'text-cyan-400 bg-cyan-500/20';
    case 'workspace': return 'text-teal-400 bg-teal-500/20';
    case 'miniapp': return 'text-pink-400 bg-pink-500/20';
    case 'settings': return 'text-slate-400 bg-slate-500/20';
    case 'security': return 'text-red-400 bg-red-500/20';
    default: return 'text-slate-400 bg-slate-500/20';
  }
};

const formatActionType = (actionType: string) => {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ organizationId, isPlatformOwner = false }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
  }, [organizationId, categoryFilter, dateFrom, dateTo, userFilter, page]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = db
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (organizationId && !isPlatformOwner) {
        query = query.eq('organization_id', organizationId);
      }

      if (categoryFilter) {
        query = query.eq('action_category', categoryFilter);
      }

      if (dateFrom) {
        query = query.gte('timestamp', new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        query = query.lte('timestamp', new Date(dateTo + 'T23:59:59').toISOString());
      }

      if (userFilter) {
        query = query.ilike('user_email', `%${userFilter}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (page === 0) {
        setLogs(data || []);
      } else {
        setLogs(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data?.length || 0) === pageSize);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
    setIsLoading(false);
  };

  const handleRefresh = () => {
    setPage(0);
    fetchLogs();
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Category', 'Action', 'Resource', 'Details', 'IP Address'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.user_email,
        log.action_category,
        log.action_type,
        log.resource_name || '',
        JSON.stringify(log.details).replace(/,/g, ';'),
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.action_type.toLowerCase().includes(searchLower) ||
      log.resource_name?.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.details).toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
            <HistoryIcon size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Audit Logs</h3>
            <p className="text-xs text-slate-400">
              {isPlatformOwner ? 'All platform activity' : 'Organization activity'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors text-sm"
          >
            <DownloadIcon size={16} />
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors text-sm"
          >
            <RefreshIcon size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="relative">
          <FilterIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 appearance-none"
          >
            {ACTION_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <ChevronDownIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by user..."
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(0); }}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="relative">
          <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
            placeholder="From date"
          />
        </div>

        <div className="relative">
          <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {isLoading && page === 0 ? (
          <div className="p-8 text-center">
            <RefreshIcon size={24} className="text-slate-400 mx-auto mb-2 animate-spin" />
            <p className="text-slate-400">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <HistoryIcon size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No audit logs found</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredLogs.map((log) => {
              const CategoryIcon = getCategoryIcon(log.action_category);
              const categoryColors = getCategoryColor(log.action_category);
              const isExpanded = expandedLog === log.id;

              return (
                <div
                  key={log.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Category Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryColors.split(' ')[1]}`}>
                        <CategoryIcon size={18} className={categoryColors.split(' ')[0]} />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-white font-medium">
                            {formatActionType(log.action_type)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${categoryColors}`}>
                            {log.action_category}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <UserIcon size={12} />
                            {log.user_email || 'System'}
                          </span>
                          {log.resource_name && (
                            <span className="truncate">
                              Resource: {log.resource_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-right">
                        <p className="text-sm text-slate-300">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Expand Icon */}
                      <ChevronDownIcon
                        size={18}
                        className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="ml-14 p-4 bg-slate-900/50 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs mb-1">User Type</p>
                            <p className="text-slate-300">{log.user_type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">IP Address</p>
                            <p className="text-slate-300 font-mono">{log.ip_address || 'N/A'}</p>
                          </div>
                          {log.resource_type && (
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Resource Type</p>
                              <p className="text-slate-300">{log.resource_type}</p>
                            </div>
                          )}
                          {log.resource_id && (
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Resource ID</p>
                              <p className="text-slate-300 font-mono text-xs">{log.resource_id}</p>
                            </div>
                          )}
                        </div>
                        {Object.keys(log.details || {}).length > 0 && (
                          <div>
                            <p className="text-slate-500 text-xs mb-2">Details</p>
                            <pre className="bg-slate-800 rounded p-3 text-xs text-slate-300 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.user_agent && (
                          <div>
                            <p className="text-slate-500 text-xs mb-1">User Agent</p>
                            <p className="text-slate-400 text-xs truncate">{log.user_agent}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && filteredLogs.length > 0 && (
          <div className="p-4 text-center border-t border-slate-700/50">
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <p>Showing {filteredLogs.length} log entries</p>
        <p>Last refreshed: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default AuditLogViewer;
