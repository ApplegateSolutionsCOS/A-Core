import React, { useMemo } from 'react';

interface ActivityHeatmapProps {
  activities: any[];
  weeks?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activities, weeks = 16 }) => {
  const heatmapData = useMemo(() => {
    const today = new Date();
    const totalDays = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);
    startDate.setHours(0, 0, 0, 0);

    // Count activities per day
    const countMap: Record<string, number> = {};
    activities.forEach(act => {
      if (!act.created_at) return;
      const d = new Date(act.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      countMap[key] = (countMap[key] || 0) + 1;
    });

    // Build grid
    const grid: { date: Date; count: number; key: string }[][] = [];
    let currentWeek: { date: Date; count: number; key: string }[] = [];
    const cursor = new Date(startDate);

    // Pad first week
    const startDay = cursor.getDay();
    for (let i = 0; i < startDay; i++) {
      currentWeek.push({ date: new Date(0), count: -1, key: `pad-${i}` });
    }

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(cursor);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      currentWeek.push({ date: d, count: countMap[key] || 0, key });
      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), count: -1, key: `pad-end-${currentWeek.length}` });
      }
      grid.push(currentWeek);
    }

    // Find max for color scaling
    const maxCount = Math.max(1, ...Object.values(countMap));

    return { grid, maxCount, countMap };
  }, [activities, weeks]);

  const getColor = (count: number, max: number): string => {
    if (count < 0) return 'transparent';
    if (count === 0) return 'rgba(255,255,255,0.04)';
    const intensity = Math.min(1, count / max);
    if (intensity < 0.25) return 'rgba(0,255,255,0.15)';
    if (intensity < 0.5) return 'rgba(0,255,255,0.3)';
    if (intensity < 0.75) return 'rgba(0,255,255,0.5)';
    return 'rgba(0,255,255,0.75)';
  };

  const getGlow = (count: number, max: number): string => {
    if (count <= 0) return 'none';
    const intensity = Math.min(1, count / max);
    if (intensity < 0.5) return 'none';
    return `0 0 ${4 + intensity * 8}px rgba(0,255,255,${0.2 + intensity * 0.3})`;
  };

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    heatmapData.grid.forEach((week, wi) => {
      const firstValid = week.find(d => d.count >= 0);
      if (firstValid && firstValid.date.getMonth() !== lastMonth) {
        lastMonth = firstValid.date.getMonth();
        labels.push({ label: MONTHS[lastMonth], col: wi });
      }
    });
    return labels;
  }, [heatmapData.grid]);

  return (
    <div className="w-full">
      {/* Month labels */}
      <div className="flex ml-8 mb-1 gap-0" style={{ position: 'relative' }}>
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="text-[10px] font-mono text-gray-500 absolute"
            style={{ left: `${m.col * 16}px` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div className="flex gap-0 mt-4">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] mr-1 flex-shrink-0">
          {DAYS.map((d, i) => (
            <div key={d} className="h-[12px] flex items-center">
              {i % 2 === 1 && (
                <span className="text-[9px] font-mono text-gray-600 w-6 text-right pr-1">{d}</span>
              )}
              {i % 2 === 0 && <span className="w-6" />}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[2px] overflow-x-auto">
          {heatmapData.grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => (
                <div
                  key={day.key}
                  className="w-[12px] h-[12px] rounded-[2px] transition-all hover:scale-150 hover:z-10 relative group"
                  style={{
                    backgroundColor: getColor(day.count, heatmapData.maxCount),
                    boxShadow: getGlow(day.count, heatmapData.maxCount),
                  }}
                  title={day.count >= 0 ? `${day.key}: ${day.count} activities` : ''}
                >
                  {day.count > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black border border-cyan-500/30 rounded text-[9px] font-mono text-cyan-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {day.key}: {day.count}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 ml-8">
        <span className="text-[9px] font-mono text-gray-600">Less</span>
        {[0, 0.15, 0.3, 0.5, 0.75].map((v, i) => (
          <div
            key={i}
            className="w-[12px] h-[12px] rounded-[2px]"
            style={{
              backgroundColor: v === 0 ? 'rgba(255,255,255,0.04)' : `rgba(0,255,255,${v})`,
            }}
          />
        ))}
        <span className="text-[9px] font-mono text-gray-600">More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
