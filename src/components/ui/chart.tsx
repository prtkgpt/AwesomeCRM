'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// Simple Bar Chart
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function BarChart({ data, height = 200, showValues = true, showLabels = true, className }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((item, idx) => {
          const barHeight = (item.value / maxValue) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              {showValues && (
                <span className="text-xs text-gray-600 dark:text-gray-400">{item.value}</span>
              )}
              <div
                className={cn('w-full rounded-t transition-all duration-300', item.color || 'bg-blue-600')}
                style={{ height: `${barHeight}%`, minHeight: item.value > 0 ? '4px' : '0' }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex gap-2 mt-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex-1 text-center text-xs text-gray-500 truncate">
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Line Chart
interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  showDots?: boolean;
  showArea?: boolean;
  color?: string;
  className?: string;
}

export function LineChart({
  data,
  height = 200,
  showDots = true,
  showArea = false,
  color = '#3b82f6',
  className,
}: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = useMemo(() => {
    const width = 100;
    const padding = 5;
    const usableWidth = width - padding * 2;
    const usableHeight = height - 40;

    return data.map((d, i) => ({
      x: padding + (i / (data.length - 1 || 1)) * usableWidth,
      y: usableHeight - ((d.value - minValue) / range) * usableHeight + 20,
      value: d.value,
      label: d.label,
    }));
  }, [data, height, range, minValue]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${height - 20} L ${points[0]?.x || 0} ${height - 20} Z`;

  return (
    <div className={cn('w-full', className)}>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {showArea && (
          <path d={areaD} fill={color} fillOpacity={0.1} />
        )}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {showDots && points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// Donut Chart
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  className?: string;
}

export function DonutChart({ data, size = 200, strokeWidth = 30, showLegend = true, className }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let currentOffset = 0;
  const segments = data.map((d) => {
    const percentage = d.value / total;
    const dashArray = percentage * circumference;
    const segment = {
      ...d,
      percentage,
      dashArray,
      dashOffset: -currentOffset,
    };
    currentOffset += dashArray;
    return segment;
  });

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashArray} ${circumference}`}
              strokeDashoffset={seg.dashOffset}
              className="transition-all duration-300"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
          <span className="text-sm text-gray-500">Total</span>
        </div>
      </div>
      {showLegend && (
        <div className="flex flex-col gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{d.label}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, changeLabel, icon, className }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={cn('text-sm mt-2', isPositive && 'text-green-600', isNegative && 'text-red-600', !isPositive && !isNegative && 'text-gray-500')}>
              {isPositive && '+'}
              {change}%{changeLabel && ` ${changeLabel}`}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
