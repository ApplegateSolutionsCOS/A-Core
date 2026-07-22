import React, { useState, useEffect, useRef, useMemo } from 'react';

// ============================================
// SHARED TYPES AND UTILITIES
// ============================================

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  data: DataPoint[];
  title?: string;
  width?: number;
  height?: number;
  animate?: boolean;
  glowColor?: string;
}

const DEFAULT_COLORS = [
  '#00FFFF', '#FF00FF', '#00FF88', '#FF8800', '#8844FF',
  '#FF4488', '#44FF88', '#88FFFF', '#FFFF00', '#FF0088'
];

const getColor = (index: number, customColor?: string): string => {
  return customColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
};

// ============================================
// DONUT CHART
// ============================================

export const DonutChart: React.FC<ChartProps> = ({
  data,
  title,
  width = 200,
  height = 200,
  animate = true,
  glowColor = '#00FFFF'
}) => {
  const [animationProgress, setAnimationProgress] = useState(animate ? 0 : 1);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  
  useEffect(() => {
    if (!animate) return;
    let start: number | null = null;
    const duration = 1000;
    
    const animateChart = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setAnimationProgress(progress);
      if (progress < 1) requestAnimationFrame(animateChart);
    };
    
    requestAnimationFrame(animateChart);
  }, [animate, data]);

  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 10;
  const innerRadius = outerRadius * 0.6;

  let currentAngle = -90;
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? item.value / total : 0;
    const angle = percentage * 360 * animationProgress;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    
    const x1 = centerX + outerRadius * Math.cos(startRad);
    const y1 = centerY + outerRadius * Math.sin(startRad);
    const x2 = centerX + outerRadius * Math.cos(endRad);
    const y2 = centerY + outerRadius * Math.sin(endRad);
    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    const color = getColor(index, item.color);
    
    return (
      <path
        key={index}
        d={`M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`}
        fill={color}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1"
        style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
      />
    );
  });

  return (
    <div className="relative">
      {title && <h4 className="text-xs text-gray-400 font-mono mb-2 text-center">{title}</h4>}
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <filter id="donut-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#donut-glow)">{segments}</g>
        <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" className="fill-white font-mono text-lg font-bold">
          {total.toLocaleString()}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {data.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(i, item.color) }} />
            <span className="text-[10px] text-gray-400 font-mono">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// PIE GRAPH
// ============================================

export const PieGraph: React.FC<ChartProps> = ({
  data,
  title,
  width = 200,
  height = 200,
  animate = true
}) => {
  const [animationProgress, setAnimationProgress] = useState(animate ? 0 : 1);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  
  useEffect(() => {
    if (!animate) return;
    let start: number | null = null;
    const animateChart = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 1000, 1);
      setAnimationProgress(progress);
      if (progress < 1) requestAnimationFrame(animateChart);
    };
    requestAnimationFrame(animateChart);
  }, [animate, data]);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 15;

  let currentAngle = -90;
  const slices = data.map((item, index) => {
    const percentage = total > 0 ? item.value / total : 0;
    const angle = percentage * 360 * animationProgress;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    const color = getColor(index, item.color);
    
    return (
      <path
        key={index}
        d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={color}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="2"
        className="hover:opacity-80 transition-opacity cursor-pointer"
        style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
      />
    );
  });

  return (
    <div className="relative">
      {title && <h4 className="text-xs text-gray-400 font-mono mb-2 text-center">{title}</h4>}
      <svg width={width} height={height} className="mx-auto">{slices}</svg>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {data.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(i, item.color) }} />
            <span className="text-[10px] text-gray-400 font-mono">{item.label}: {Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// BAR CHART
// ============================================

export const BarChart: React.FC<ChartProps & { horizontal?: boolean }> = ({
  data,
  title,
  width = 300,
  height = 200,
  animate = true,
  horizontal = false
}) => {
  const [animationProgress, setAnimationProgress] = useState(animate ? 0 : 1);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  
  useEffect(() => {
    if (!animate) return;
    let start: number | null = null;
    const animateChart = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 800, 1);
      setAnimationProgress(progress);
      if (progress < 1) requestAnimationFrame(animateChart);
    };
    requestAnimationFrame(animateChart);
  }, [animate, data]);

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barGap = 8;
  const barWidth = horizontal 
    ? (chartHeight - barGap * (data.length - 1)) / data.length
    : (chartWidth - barGap * (data.length - 1)) / data.length;

  return (
    <div className="relative">
      {title && <h4 className="text-xs text-gray-400 font-mono mb-2 text-center">{title}</h4>}
      <svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <g key={i}>
            {horizontal ? (
              <>
                <line x1={padding + tick * chartWidth} y1={padding} x2={padding + tick * chartWidth} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeDasharray="2,2" />
                <text x={padding + tick * chartWidth} y={height - padding + 15} textAnchor="middle" className="fill-gray-500 text-[9px] font-mono">
                  {Math.round(maxValue * tick)}
                </text>
              </>
            ) : (
              <>
                <line x1={padding} y1={height - padding - tick * chartHeight} x2={width - padding} y2={height - padding - tick * chartHeight} stroke="rgba(255,255,255,0.1)" strokeDasharray="2,2" />
                <text x={padding - 5} y={height - padding - tick * chartHeight + 3} textAnchor="end" className="fill-gray-500 text-[9px] font-mono">
                  {Math.round(maxValue * tick)}
                </text>
              </>
            )}
          </g>
        ))}
        
        {/* Bars */}
        {data.map((item, index) => {
          const color = getColor(index, item.color);
          const barLength = (item.value / maxValue) * (horizontal ? chartWidth : chartHeight) * animationProgress;
          
          if (horizontal) {
            const y = padding + index * (barWidth + barGap);
            return (
              <g key={index}>
                <rect x={padding} y={y} width={barLength} height={barWidth} fill={color} rx="4"
                  style={{ filter: `drop-shadow(0 0 8px ${color}40)` }} />
                <text x={padding - 5} y={y + barWidth / 2 + 3} textAnchor="end" className="fill-gray-400 text-[9px] font-mono">
                  {item.label.slice(0, 8)}
                </text>
              </g>
            );
          } else {
            const x = padding + index * (barWidth + barGap);
            return (
              <g key={index}>
                <rect x={x} y={height - padding - barLength} width={barWidth} height={barLength} fill={color} rx="4"
                  style={{ filter: `drop-shadow(0 0 8px ${color}40)` }} />
                <text x={x + barWidth / 2} y={height - padding + 12} textAnchor="middle" className="fill-gray-400 text-[8px] font-mono" transform={`rotate(-45, ${x + barWidth / 2}, ${height - padding + 12})`}>
                  {item.label.slice(0, 6)}
                </text>
              </g>
            );
          }
        })}
      </svg>
    </div>
  );
};

// ============================================
// LINE GRAPH
// ============================================

interface LineDataPoint extends DataPoint {
  timestamp?: number;
}

export const LineGraph: React.FC<ChartProps & { showArea?: boolean; data: LineDataPoint[] }> = ({
  data,
  title,
  width = 300,
  height = 200,
  animate = true,
  showArea = true,
  glowColor = '#00FFFF'
}) => {
  const [animationProgress, setAnimationProgress] = useState(animate ? 0 : 1);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const minValue = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);
  
  useEffect(() => {
    if (!animate) return;
    let start: number | null = null;
    const animateChart = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 1200, 1);
      setAnimationProgress(progress);
      if (progress < 1) requestAnimationFrame(animateChart);
    };
    requestAnimationFrame(animateChart);
  }, [animate, data]);

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const range = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
    const y = height - padding - ((item.value - minValue) / range) * chartHeight;
    return { x, y, ...item };
  });

  const visiblePoints = points.slice(0, Math.ceil(points.length * animationProgress));
  const linePath = visiblePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = visiblePoints.length > 0 
    ? `${linePath} L ${visiblePoints[visiblePoints.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`
    : '';

  return (
    <div className="relative">
      {title && <h4 className="text-xs text-gray-400 font-mono mb-2 text-center">{title}</h4>}
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </linearGradient>
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <g key={i}>
            <line x1={padding} y1={height - padding - tick * chartHeight} x2={width - padding} y2={height - padding - tick * chartHeight} stroke="rgba(255,255,255,0.1)" strokeDasharray="2,2" />
            <text x={padding - 5} y={height - padding - tick * chartHeight + 3} textAnchor="end" className="fill-gray-500 text-[9px] font-mono">
              {Math.round(minValue + range * tick)}
            </text>
          </g>
        ))}
        
        {/* Area fill */}
        {showArea && areaPath && <path d={areaPath} fill="url(#line-gradient)" />}
        
        {/* Line */}
        <path d={linePath} fill="none" stroke={glowColor} strokeWidth="2" filter="url(#line-glow)" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Points */}
        {visiblePoints.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="4" fill="black" stroke={glowColor} strokeWidth="2" />
            {index % Math.ceil(data.length / 5) === 0 && (
              <text x={point.x} y={height - padding + 12} textAnchor="middle" className="fill-gray-500 text-[8px] font-mono">
                {point.label.slice(0, 5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

// ============================================
// GANTT CHART
// ============================================

interface GanttTask {
  id: string;
  name: string;
  start: number; // 0-100 percentage
  duration: number; // percentage
  color?: string;
  progress?: number; // 0-100
}

export const GanttChart: React.FC<{ tasks: GanttTask[]; title?: string; width?: number; height?: number }> = ({
  tasks,
  title,
  width = 400,
  height = 200
}) => {
  const padding = { left: 100, right: 20, top: 30, bottom: 20 };
  const chartWidth = width - padding.left - padding.right;
  const rowHeight = Math.min(30, (height - padding.top - padding.bottom) / tasks.length);

  return (
    <div className="relative">
      {title && <h4 className="text-xs text-gray-400 font-mono mb-2 text-center">{title}</h4>}
      <svg width={width} height={height}>
        {/* Timeline header */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={padding.left + (tick / 100) * chartWidth} y1={padding.top - 10} x2={padding.left + (tick / 100) * chartWidth} y2={height - padding.bottom} stroke="rgba(255,255,255,0.1)" strokeDasharray="2,2" />
            <text x={padding.left + (tick / 100) * chartWidth} y={padding.top - 15} textAnchor="middle" className="fill-gray-500 text-[9px] font-mono">
              {tick}%
            </text>
          </g>
        ))}
        
        {/* Tasks */}
        {tasks.map((task, index) => {
          const y = padding.top + index * rowHeight;
          const x = padding.left + (task.start / 100) * chartWidth;
          const barWidth = (task.duration / 100) * chartWidth;
          const color = getColor(index, task.color);
          
          return (
            <g key={task.id}>
              {/* Task name */}
              <text x={padding.left - 5} y={y + rowHeight / 2 + 3} textAnchor="end" className="fill-gray-400 text-[10px] font-mono">
                {task.name.slice(0, 12)}
              </text>
              
              {/* Task bar background */}
              <rect x={x} y={y + 4} width={barWidth} height={rowHeight - 8} fill={`${color}30`} rx="4" stroke={color} strokeWidth="1" />
              
              {/* Progress fill */}
              {task.progress !== undefined && (
                <rect x={x} y={y + 4} width={barWidth * (task.progress / 100)} height={rowHeight - 8} fill={color} rx="4" style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================
// WAVE CHART (Real-time streaming data)
// ============================================

export const WaveChart: React.FC<{
  data: number[];
  title?: string;
  width?: number;
  height?: number;
  glowColor?: string;
  maxPoints?: number;
}> = ({
  data,
  title,
  width = 300,
  height = 150,
  glowColor = '#00FFFF',
  maxPoints = 50
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dataRef = useRef<number[]>(data);
  
  useEffect(() => {
    dataRef.current = data.slice(-maxPoints);
  }, [data, maxPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const points = dataRef.current;
      if (points.length < 2) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      
      const maxVal = Math.max(...points, 1);
      const minVal = Math.min(...points, 0);
      const range = maxVal - minVal || 1;
      
      const padding = 10;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }
      
      // Draw wave with animation offset
      ctx.beginPath();
      points.forEach((value, index) => {
        const x = padding + (index / (points.length - 1)) * chartWidth;
        const normalizedValue = (value - minVal) / range;
        const waveOffset = Math.sin((index + offset) * 0.1) * 2;
        const y = height - padding - normalizedValue * chartHeight + waveOffset;
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      
      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Area fill
      const lastX = padding + chartWidth;
      const lastY = height - padding - ((points[points.length - 1] - minVal) / range) * chartHeight;
      ctx.lineTo(lastX, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `${glowColor}30`);
      gradient.addColorStop(1, `${glowColor}00`);
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 0;
      ctx.fill();
      
      offset += 0.5;
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, glowColor]);

  return (
    <div className="relative">
      {title && <h4 className="text-xs text-gray-400 font-mono mb-2 text-center">{title}</h4>}
      <canvas ref={canvasRef} width={width} height={height} className="rounded-lg" />
    </div>
  );
};

export default {
  DonutChart,
  PieGraph,
  BarChart,
  LineGraph,
  GanttChart,
  WaveChart
};
