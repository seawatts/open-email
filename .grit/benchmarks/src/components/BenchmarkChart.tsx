import { formatMedianLatency } from '@openrouter-monorepo/db/featured-models';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BenchmarkData } from '../types';
import { CATEGORY_COLORS } from '../utils';

interface BenchmarkChartProps {
  data: BenchmarkData;
  showBaseline: boolean;
  showAllTogether: boolean;
  showRelative: boolean;
  sortBy: 'slowest' | 'fastest' | 'alphabetical' | 'category';
  selectedCategories: Set<string>;
  onRuleClick?: (ruleName: string) => void;
}

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  rule?: BenchmarkData['rules'][number];
}

// Interpolate color from red (worst) to green (best)
// position: 0 = worst (red), 1 = best (green)
function interpolateColor(position: number): string {
  // Clamp position between 0 and 1
  const t = Math.max(0, Math.min(1, position));

  // Red to Green gradient
  // Red: rgb(239, 68, 68) = #ef4444
  // Green: rgb(34, 197, 94) = #22c55e
  const red = Math.round(239 - (239 - 34) * t);
  const green = Math.round(68 + (197 - 68) * t);
  const blue = Math.round(68 + (94 - 68) * t);

  return `rgb(${red}, ${green}, ${blue})`;
}

export function BenchmarkChart({
  data,
  showBaseline,
  showAllTogether,
  showRelative,
  sortBy,
  selectedCategories,
  onRuleClick,
}: BenchmarkChartProps) {
  const chartData = useMemo(() => {
    // Filter and sort rules
    const filteredRules = data.rules.filter((r) =>
      selectedCategories.has(r.category),
    );

    const sortedRules = [...filteredRules].sort((a, b) => {
      switch (sortBy) {
        case 'slowest':
          return b.mean - a.mean;
        case 'fastest':
          return a.mean - b.mean;
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category) || b.mean - a.mean;
        default:
          return 0;
      }
    });

    const baselineValue = data.baseline?.mean ?? 0;
    const result: ChartDataPoint[] = [];

    // Calculate performance-based colors for rules only (exclude baseline and allTogether)
    // We need to determine the min and max values for the gradient
    const ruleValues = sortedRules.map((rule) =>
      showRelative ? rule.mean - baselineValue : rule.mean,
    );
    const minValue = Math.min(...ruleValues, 0);
    const maxValue = Math.max(...ruleValues, 0);
    const valueRange = maxValue - minValue;

    if (showBaseline) {
      const baselineColor = CATEGORY_COLORS.baseline;
      if (baselineColor) {
        result.push({
          color: baselineColor,
          name: 'Baseline (no rules)',
          value: showRelative ? 0 : baselineValue,
        });
      }
    }

    sortedRules.forEach((rule) => {
      const ruleValue = showRelative ? rule.mean - baselineValue : rule.mean;
      // Calculate position: 0 = worst (highest value = red), 1 = best (lowest value = green)
      // For relative mode, negative values are better, so we invert
      const position =
        valueRange > 0 ? (maxValue - ruleValue) / valueRange : 0.5; // Default to middle if all values are the same
      const color = interpolateColor(position);

      result.push({
        color,
        name: rule.name,
        rule,
        value: ruleValue,
      });
    });

    if (showAllTogether && data.allTogether && data.allTogether.mean > 0) {
      const combinedColor = CATEGORY_COLORS.combined;
      if (combinedColor) {
        result.push({
          color: combinedColor,
          name: 'All rules together',
          value: showRelative
            ? data.allTogether.mean - baselineValue
            : data.allTogether.mean,
        });
      }
    }

    return result;
  }, [
    data,
    showBaseline,
    showAllTogether,
    showRelative,
    sortBy,
    selectedCategories,
  ]);

  return (
    <div className="relative h-[600px] rounded-lg border bg-card shadow-sm">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{
            bottom: 8,
            left: 8,
            right: 30,
            top: 8,
          }}
        >
          <XAxis
            label={{
              offset: -5,
              position: 'insideBottom',
              value: showRelative ? 'Time above baseline (ms)' : 'Time (ms)',
            }}
            tickFormatter={(value: number) => formatMedianLatency(value)}
            type="number"
          />
          <YAxis
            dataKey="name"
            tick={{
              fontSize: 12,
            }}
            type="category"
            width={200}
          />
          <Tooltip
            content={({
              active,
              payload,
            }: {
              active?: boolean;
              payload?: Array<{
                payload?: ChartDataPoint;
              }>;
            }) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }
              const dataPoint = payload[0]?.payload as
                | ChartDataPoint
                | undefined;
              if (!dataPoint) {
                return null;
              }

              if (dataPoint.rule) {
                return (
                  <div className="rounded-md border bg-background p-3 shadow-md">
                    <p className="mb-2 font-semibold">{dataPoint.name}</p>
                    <div className="space-y-1 text-sm">
                      <div>
                        Mean: {formatMedianLatency(dataPoint.rule.mean)}
                      </div>
                      <div>
                        Median: {formatMedianLatency(dataPoint.rule.median)}
                      </div>
                      <div>P95: {formatMedianLatency(dataPoint.rule.p95)}</div>
                      <div>Min: {formatMedianLatency(dataPoint.rule.min)}</div>
                      <div>Max: {formatMedianLatency(dataPoint.rule.max)}</div>
                      <div>
                        Stddev: {formatMedianLatency(dataPoint.rule.stddev)}
                      </div>
                      <div>Category: {dataPoint.rule.category}</div>
                      <div>Severity: {dataPoint.rule.severity}</div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="rounded-md border bg-background p-3 shadow-md">
                  <p className="font-semibold">{dataPoint.name}</p>
                  <p className="text-sm">
                    {formatMedianLatency(dataPoint.value)}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="value"
            onClick={(data: { payload?: ChartDataPoint }) => {
              if (data.payload?.rule && onRuleClick) {
                onRuleClick(data.payload.rule.name);
              }
            }}
            radius={[0, 4, 4, 0]}
            style={{
              cursor: onRuleClick ? 'pointer' : 'default',
            }}
          >
            {chartData.map((entry, index) => (
              <Cell fill={entry.color} key={`cell-${index}`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
