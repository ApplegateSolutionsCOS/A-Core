/**
 * SyncJobsMonitor - Shows sync job history, success/failure rates, and Sync Now button.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import {
  ActivityIcon,
  CheckIcon,
  CloseIcon,
} from '@/components/icons/Icons';

const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const PlayIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const ClockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

interface SyncJob {
  id: string;
  organization_id: string;
  integration_id: string;
  integration_name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  records_synced: number;
  records_failed: number;
  errors: any[];
  retry_count: number;
  max_retries: number;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  triggered_by: string;
  sync_direction: string;
  created_at: string;
}

interface SyncJobsMonitorProps {
  integrationFilter?: string;
  connectedIntegrationIds?: string[];
}

const SyncJobsMonitor: React.FC<SyncJobsMonitorProps> = ({ integrationFilter, connectedIntegrationIds = [] }) => {
  const { organization } = useAuth();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [filterIntegration, setFilterIntegration] = useState<string>(integrationFilter || 'all');

  const loadJobs = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const params: any = {
        action: 'get_sync_jobs',
        organizationId: organization.id,
        limit: 100,
      };
      if (filterIntegration && filterIntegration !== 'all') {
        params.integrationId = filterIntegration;
      }
      const result = await invokeEdgeFunction('save-integration-credentials', params);
      if (result.data?.jobs) {
        setJobs(result.data.jobs);
      }
    } catch (err) {
      console.error('[SyncJobsMonitor] Error loading jobs:', err);
    }
    setIsLoading(false);
  }, [organization?.id, filterIntegration]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const handleSyncNow = async (integrationId: string, integrationName?: string) => {
    if (!organization?.id) return;
    setSyncingIds(prev => new Set([...prev, integrationId]));
    try {
      const result = await invokeEdgeFunction('save-integration-credentials', {
        action: 'sync_now',
        organizationId: organization.id,
        integrationId,
        integrationName: integrationName || integrationId,
        triggeredBy: 'manual',
      });
      if (result.data?.job) {
        // Prepend the new job to the list
        const newJob: SyncJob = {
          id: result.data.job.id,
          organization_id: organization.id,
          integration_id: integrationId,
          integration_name: integrationName || integrationId,
          status: result.data.job.status,
          records_synced: result.data.job.records_synced,
          records_failed: result.data.job.records_failed || 0,
          errors: [],
          retry_count: 0,
          max_retries: 3,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: result.data.job.duration_ms,
          triggered_by: 'manual',
          sync_direction: 'Bidirectional',
          created_at: new Date().toISOString(),
        };
        setJobs(prev => [newJob, ...prev]);
      }
    } catch (err) {
      console.error('[SyncJobsMonitor] Sync error:', err);
    }
    setSyncingIds(prev => {
      const next = new Set(prev);
      next.delete(integrationId);
      return next;
    });
  };

  // Stats
  const totalJobs = jobs.length;
  const successJobs = jobs.filter(j => j.status === 'success').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;
  const runningJobs = jobs.filter(j => j.status === 'running').length;
  const successRate = totalJobs > 0 ? Math.round((successJobs / totalJobs) * 100) : 0;
  const totalRecords = jobs.reduce((sum, j) => sum + (j.records_synced || 0), 0);

  // Unique integration IDs from jobs
  const uniqueIntegrations = Array.from(new Set(jobs.map(j => j.integration_id)));

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
      success: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'SUCCESS' },
      failed: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'FAILED' },
      running: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'RUNNING' },
      pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'PENDING' },
      cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', label: 'CANCELLED' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${s.bg} ${s.text} ${s.border}`}>
        {s.label}
      </span>
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-black to-cyan-950/20 p-4 overflow-hidden">
        <div className="absolute inset-0 hex-pattern opacity-10" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/50 flex items-center justify-center">
              <ActivityIcon size={20} className="text-cyan-400" />
            </div>
            <div>
              <h4 className="text-white font-mono font-bold text-sm">Sync Jobs Monitor</h4>
              <p className="text-gray-500 font-mono text-[10px]">Background sync engine status</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center px-3">
              <p className="text-lg font-mono font-bold text-cyan-400">{totalJobs}</p>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Total</p>
            </div>
            <div className="text-center px-3">
              <p className="text-lg font-mono font-bold text-green-400">{successJobs}</p>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Success</p>
            </div>
            <div className="text-center px-3">
              <p className="text-lg font-mono font-bold text-red-400">{failedJobs}</p>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Failed</p>
            </div>
            {runningJobs > 0 && (
              <div className="text-center px-3">
                <p className="text-lg font-mono font-bold text-yellow-400">{runningJobs}</p>
                <p className="text-[10px] font-mono text-gray-500 uppercase">Running</p>
              </div>
            )}
            <div className="text-center px-3">
              <p className="text-lg font-mono font-bold text-white">{successRate}%</p>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Success Rate</p>
            </div>
            <div className="text-center px-3">
              <p className="text-lg font-mono font-bold text-cyan-400">{totalRecords.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-gray-500 uppercase">Records</p>
            </div>
          </div>

          <button
            onClick={loadJobs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-xs"
          >
            <RefreshIcon size={14} />
            Refresh
          </button>
        </div>

        {/* Success rate bar */}
        {totalJobs > 0 && (
          <div className="relative z-10 mt-3 h-2 bg-gray-900 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${successRate}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
              style={{ width: `${100 - successRate}%` }}
            />
          </div>
        )}
      </div>

      {/* Quick Sync Buttons for connected integrations */}
      {connectedIntegrationIds.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-black/80 p-4">
          <h5 className="text-white font-mono font-bold text-sm mb-3 flex items-center gap-2">
            <PlayIcon size={14} className="text-cyan-400" />
            Quick Sync
          </h5>
          <div className="flex flex-wrap gap-2">
            {connectedIntegrationIds.map(id => (
              <button
                key={id}
                onClick={() => handleSyncNow(id, id)}
                disabled={syncingIds.has(id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-mono text-xs disabled:opacity-50"
              >
                {syncingIds.has(id) ? (
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PlayIcon size={12} />
                )}
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterIntegration}
          onChange={e => setFilterIntegration(e.target.value)}
          className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Integrations</option>
          {uniqueIntegrations.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
        <span className="text-gray-500 font-mono text-xs">{jobs.length} jobs</span>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-gray-800 bg-black/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                {['Integration', 'Status', 'Records', 'Failed', 'Duration', 'Triggered By', 'Started', 'Actions'].map(col => (
                  <th key={col} className="text-left p-3 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500 font-mono text-sm">Loading sync jobs...</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <ClockIcon size={32} className="text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 font-mono text-sm">No sync jobs recorded yet</p>
                    <p className="text-gray-600 font-mono text-xs mt-1">Click "Sync Now" on a connected integration to start</p>
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="p-3">
                      <span className="text-white font-mono text-sm">{job.integration_name || job.integration_id}</span>
                    </td>
                    <td className="p-3">{getStatusBadge(job.status)}</td>
                    <td className="p-3">
                      <span className="text-green-400 font-mono text-sm font-bold">{job.records_synced || 0}</span>
                    </td>
                    <td className="p-3">
                      <span className={`font-mono text-sm font-bold ${(job.records_failed || 0) > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                        {job.records_failed || 0}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-400 font-mono text-xs">{formatDuration(job.duration_ms)}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                        job.triggered_by === 'manual' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'
                      }`}>
                        {job.triggered_by || 'manual'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-500 font-mono text-[10px]">{formatTime(job.started_at)}</span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleSyncNow(job.integration_id, job.integration_name)}
                        disabled={syncingIds.has(job.integration_id)}
                        className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-500/20 transition-all font-mono text-[10px] disabled:opacity-50"
                      >
                        {syncingIds.has(job.integration_id) ? (
                          <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <PlayIcon size={10} />
                        )}
                        Retry
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SyncJobsMonitor;
