import React, { useMemo } from 'react';

// ═══════════════ FEATURE USAGE BAR CHART ═══════════════
interface FeatureBarChartProps {
  activities: any[];
}

export const FeatureBarChart: React.FC<FeatureBarChartProps> = ({ activities }) => {
  const featureData = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach(act => {
      const key = act.entity_type || 'other';
      counts[key] = (counts[key] || 0) + 1;
    });
    // Also count by action type
    const actionCounts: Record<string, number> = {};
    activities.forEach(act => {
      const key = act.action_type || 'other';
      actionCounts[key] = (actionCounts[key] || 0) + 1;
    });
    // Combine entity_type and action_type for richer data
    const combined: { label: string; count: number; color: string }[] = [];
    const entityColors: Record<string, string> = {
      miniapp: '#00ffff',
      record: '#88ffbb',
      field: '#ffaa77',
      workspace: '#cc88ff',
      other: '#888888',
    };
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => {
        combined.push({
          label: key.charAt(0).toUpperCase() + key.slice(1),
          count,
          color: entityColors[key] || '#66ddff',
        });
      });
    return combined;
  }, [activities]);

  const maxCount = Math.max(1, ...featureData.map(d => d.count));

  if (featureData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 font-mono text-xs">
        No feature usage data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {featureData.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 w-20 text-right truncate">{item.label}</span>
          <div className="flex-1 h-6 bg-gray-900/50 rounded-md overflow-hidden relative">
            <div
              className="h-full rounded-md transition-all duration-700 ease-out relative"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                background: `linear-gradient(90deg, ${item.color}20, ${item.color}60)`,
                boxShadow: `0 0 12px ${item.color}30`,
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div
                className="absolute right-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
              />
            </div>
          </div>
          <span className="text-xs font-mono font-bold w-10 text-right" style={{ color: item.color }}>
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════ WORKSPACE DISTRIBUTION ═══════════════
interface WorkspaceDistributionProps {
  activities: any[];
}

const WS_COLORS: Record<string, string> = {
  admin: '#ef4444',
  accounting: '#22c55e',
  personnel: '#d946ef',
  main: '#00ffff',
  data: '#a855f7',
  security: '#ff9900',
};

export const WorkspaceDistribution: React.FC<WorkspaceDistributionProps> = ({ activities }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach(act => {
      const ws = act.workspace_slug || 'unknown';
      counts[ws] = (counts[ws] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([ws, count]) => ({
        workspace: ws,
        count,
        color: WS_COLORS[ws] || '#666666',
        percentage: Math.round((count / activities.length) * 100),
      }));
  }, [activities]);

  const total = activities.length || 1;

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 font-mono text-xs">
        No workspace data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Donut-style ring */}
      <div className="flex items-center justify-center gap-6">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {(() => {
              let offset = 0;
              return data.map((item, i) => {
                const pct = (item.count / total) * 100;
                const circumference = 2 * Math.PI * 40;
                const dashLength = (pct / 100) * circumference;
                const dashGap = circumference - dashLength;
                const el = (
                  <circle
                    key={item.workspace}
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="8"
                    strokeDasharray={`${dashLength} ${dashGap}`}
                    strokeDashoffset={-offset * (circumference / 100)}
                    strokeLinecap="round"
                    opacity="0.8"
                    style={{ filter: `drop-shadow(0 0 4px ${item.color}60)` }}
                  />
                );
                offset += pct;
                return el;
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-white">{total}</div>
              <div className="text-[9px] font-mono text-gray-500 uppercase">Total</div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {data.map(item => (
            <div key={item.workspace} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}60` }} />
              <span className="text-xs font-mono text-gray-300 capitalize">{item.workspace}</span>
              <span className="text-xs font-mono font-bold" style={{ color: item.color }}>{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════ SESSION STATS ═══════════════
interface SessionStatsProps {
  activities: any[];
}

export const SessionStats: React.FC<SessionStatsProps> = ({ activities }) => {
  const stats = useMemo(() => {
    if (activities.length === 0) return { totalActions: 0, uniqueUsers: 0, avgPerDay: 0, peakHour: 'N/A', mostActiveUser: 'N/A', topAction: 'N/A' };

    const users = new Set<string>();
    const hourCounts: Record<number, number> = {};
    const userCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};

    activities.forEach(act => {
      users.add(act.user_id || 'unknown');
      const userName = act.user_name || 'Unknown';
      userCounts[userName] = (userCounts[userName] || 0) + 1;
      const actionType = act.action_type || 'other';
      actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;

      if (act.created_at) {
        const d = new Date(act.created_at);
        const hour = d.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        const dayKey = d.toISOString().split('T')[0];
        dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
      }
    });

    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const mostActiveUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];
    const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
    const dayCount = Object.keys(dayCounts).length || 1;

    return {
      totalActions: activities.length,
      uniqueUsers: users.size,
      avgPerDay: Math.round(activities.length / dayCount),
      peakHour: peakHour ? `${peakHour[0].padStart(2, '0')}:00` : 'N/A',
      mostActiveUser: mostActiveUser ? mostActiveUser[0] : 'N/A',
      topAction: topAction ? topAction[0] : 'N/A',
    };
  }, [activities]);

  const statCards = [
    { label: 'Total Actions', value: stats.totalActions.toLocaleString(), color: '#00ffff', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Unique Users', value: stats.uniqueUsers.toString(), color: '#88ffbb', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { label: 'Avg / Day', value: stats.avgPerDay.toString(), color: '#ffaa77', icon: 'M12 20V10M18 20V4M6 20v-4' },
    { label: 'Peak Hour', value: stats.peakHour, color: '#cc88ff', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2' },
    { label: 'Top User', value: stats.mostActiveUser, color: '#ff99aa', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    { label: 'Top Action', value: stats.topAction.charAt(0).toUpperCase() + stats.topAction.slice(1), color: '#66ddff', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {statCards.map(card => (
        <div
          key={card.label}
          className="p-3 rounded-xl border transition-all hover:scale-[1.02]"
          style={{
            background: `${card.color}08`,
            borderColor: `${card.color}25`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
              <path d={card.icon} />
            </svg>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{card.label}</span>
          </div>
          <div className="text-lg font-mono font-bold truncate" style={{ color: card.color, textShadow: `0 0 10px ${card.color}40` }}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════ HOURLY ACTIVITY CHART ═══════════════
interface HourlyChartProps {
  activities: any[];
}

export const HourlyActivityChart: React.FC<HourlyChartProps> = ({ activities }) => {
  const hourData = useMemo(() => {
    const counts = new Array(24).fill(0);
    activities.forEach(act => {
      if (act.created_at) {
        const h = new Date(act.created_at).getHours();
        counts[h]++;
      }
    });
    return counts;
  }, [activities]);

  const maxH = Math.max(1, ...hourData);

  return (
    <div className="w-full">
      <div className="flex items-end gap-[2px] h-20">
        {hourData.map((count, h) => {
          const pct = (count / maxH) * 100;
          const isNow = new Date().getHours() === h;
          return (
            <div key={h} className="flex-1 flex flex-col items-center group relative">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(2, pct)}%`,
                  backgroundColor: isNow ? 'rgba(0,255,255,0.8)' : `rgba(0,255,255,${0.15 + (pct / 100) * 0.5})`,
                  boxShadow: isNow ? '0 0 8px rgba(0,255,255,0.5)' : count > 0 ? `0 0 4px rgba(0,255,255,${pct / 300})` : 'none',
                }}
              />
              {count > 0 && (
                <div className="absolute bottom-full mb-1 px-1.5 py-0.5 bg-black border border-cyan-500/30 rounded text-[8px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {h}:00 — {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px] mt-1">
        {hourData.map((_, h) => (
          <div key={h} className="flex-1 text-center">
            {h % 6 === 0 && <span className="text-[8px] font-mono text-gray-600">{h}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
