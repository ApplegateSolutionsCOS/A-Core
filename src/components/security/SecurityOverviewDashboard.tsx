import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PinWidgetButton from './PinWidgetButton';

interface OverviewData {
  threatsBlocked: number;
  threatsToday: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  blocklistSize: number;
  recentBlocklistAdditions: number;
  activeWebhooks: number;
  webhookSuccessRate: number;
  rateLimitViolations: number;
  suspiciousRequests: number;
  totalAccessLogs: number;
  activeAutoRules: number;
  autoRuleTriggers: number;
  teamMemberCount: number;
  healthScore: number;
  threatTrend: number[];
  accessTrend: number[];
}

const Sparkline: React.FC<{ data: number[]; color: string; height?: number; width?: number }> = ({ data, color, height = 24, width = 80 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ');
  const areaPoints = points + ` ${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} className="inline-block">
      <polygon points={areaPoints} fill={color + '15'} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const SecurityOverviewDashboard: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const { data: resp, error } = await supabase.functions.invoke('qcore-security', {
        body: { action: 'overview_stats' }
      });
      if (!error && resp?.success) setData(resp.overview);
    } catch (e) { console.error('Overview fetch error:', e); }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { const iv = setInterval(fetchOverview, 60000); return () => clearInterval(iv); }, [fetchOverview]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
          <span className="text-orange-400 font-mono text-sm animate-pulse">Loading security overview...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const healthColor = data.healthScore >= 80 ? '#22c55e' : data.healthScore >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="rounded-xl border border-orange-500/40 bg-black/80 p-6" style={{ boxShadow: '0 0 30px rgba(255,153,0,0.1)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-mono font-bold text-lg">Security Overview</h3>
          <p className="text-orange-400/60 font-mono text-xs">Real-Time Aggregated Security Metrics</p>
        </div>
        <PinWidgetButton widgetType="security_overview" title="Security Overview" />
        {/* Health Score Ring */}

        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(100,100,100,0.15)" strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={healthColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${data.healthScore * 1.38} 138`} className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-bold" style={{ color: healthColor }}>{data.healthScore}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Threats This Week', value: data.threatsBlocked, today: data.threatsToday, color: '#ef4444', spark: data.threatTrend },
          { label: 'Critical Alerts', value: data.criticalAlerts, sub: `${data.highAlerts} high, ${data.mediumAlerts} med`, color: '#ff4444' },
          { label: 'Blocklist Size', value: data.blocklistSize, sub: `+${data.recentBlocklistAdditions} this week`, color: '#f97316' },
          { label: 'Active Webhooks', value: data.activeWebhooks, sub: `${data.webhookSuccessRate}% delivery rate`, color: '#3b82f6' },
          { label: 'Suspicious Requests', value: data.suspiciousRequests, sub: `of ${data.totalAccessLogs} total`, color: '#eab308', spark: data.accessTrend },
          { label: 'Rate Limit Violations', value: data.rateLimitViolations, color: '#a855f7' },
          { label: 'Auto-Response Rules', value: data.activeAutoRules, sub: `${data.autoRuleTriggers} triggered`, color: '#06b6d4' },
          { label: 'Team Members', value: data.teamMemberCount, color: '#22c55e' },
          { label: 'Access Logs (7d)', value: data.totalAccessLogs, color: '#6366f1', spark: data.accessTrend },
          { label: 'Health Score', value: data.healthScore + '/100', color: healthColor },
        ].map((metric, i) => (
          <div key={i} className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-gray-700 transition-all group">
            <div className="flex items-start justify-between mb-1">
              <p className="text-gray-500 text-[10px] font-mono uppercase leading-tight">{metric.label}</p>
              {metric.spark && <Sparkline data={metric.spark} color={metric.color} height={20} width={50} />}
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: metric.color }}>{metric.value}</p>
            {metric.today !== undefined && <p className="text-gray-600 text-[10px] font-mono">{metric.today} today</p>}
            {metric.sub && <p className="text-gray-600 text-[10px] font-mono">{metric.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityOverviewDashboard;
