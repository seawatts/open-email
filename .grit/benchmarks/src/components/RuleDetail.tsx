import type { BenchmarkResult } from '../types';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { formatMedianLatency } from '@openrouter-monorepo/db/featured-models';
import { isErr, wrap } from '@openrouter-monorepo/type-utils/result-monad';
import { z } from '@openrouter-monorepo/type-utils/zod';
import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BenchmarkDataSchema } from '../types';
import { CATEGORY_COLORS } from '../utils';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { ThemeToggle } from './ThemeToggle';

interface RuleDetailProps {
  ruleName: string;
  onBack: () => void;
}

const HistoricalDataPointSchema = z.object({
  timestamp: z.string(),
  displayDate: z.string(),
  mean: z.number(),
  median: z.number(),
  p95: z.number(),
  min: z.number(),
  max: z.number(),
  samples: z.array(z.number()),
  commit: z.string(),
});

type HistoricalDataPoint = z.infer<typeof HistoricalDataPointSchema>;

function isHistoricalDataPoint(value: unknown): value is HistoricalDataPoint {
  return HistoricalDataPointSchema.safeParse(value).success;
}

export function RuleDetail({ ruleName, onBack }: RuleDetailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [ruleInfo, setRuleInfo] = useState<BenchmarkResult | null>(null);

  useEffect(() => {
    async function loadHistoricalData() {
      setLoading(true);
      setError(null);

      const filesResult = await wrap(async () => {
        const response = await fetch('/api/results');
        if (!response.ok) {
          throw new Error('Failed to fetch available files');
        }
        return response.json() as Promise<string[]>;
      });

      if (isErr(filesResult)) {
        setError('Failed to load available result files');
        setLoading(false);
        return;
      }

      const files = filesResult.data;
      const dataPoints: HistoricalDataPoint[] = [];
      let latestRuleInfo: BenchmarkResult | null = null;

      for (const file of files) {
        const fetchResult = await wrap(async () => {
          const response = await fetch(`./results/${file}`);
          if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
          }
          return response.json() as Promise<unknown>;
        });

        if (isErr(fetchResult)) {
          continue;
        }

        const parseResult = BenchmarkDataSchema.safeParse(fetchResult.data);
        if (!parseResult.success) {
          continue;
        }

        const benchmarkData = parseResult.data;
        const rule = benchmarkData.rules.find((r) => r.name === ruleName);

        if (rule) {
          if (!latestRuleInfo) {
            latestRuleInfo = rule;
          }

          const date = new Date(benchmarkData.timestamp);
          dataPoints.push({
            timestamp: benchmarkData.timestamp,
            displayDate: date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            mean: rule.mean,
            median: rule.median,
            p95: rule.p95,
            min: rule.min,
            max: rule.max,
            samples: rule.samples,
            commit: benchmarkData.environment.commit.slice(0, 7),
          });
        }
      }

      dataPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setHistoricalData(dataPoints);
      setRuleInfo(latestRuleInfo);
      setLoading(false);
    }

    void loadHistoricalData();
  }, [
    ruleName,
  ]);

  const stats = useMemo(() => {
    if (historicalData.length === 0) {
      return null;
    }

    const means = historicalData.map((d) => d.mean);
    const avgMean = means.reduce((a, b) => a + b, 0) / means.length;
    const minMean = Math.min(...means);
    const maxMean = Math.max(...means);

    return {
      avgMean,
      minMean,
      maxMean,
      runCount: historicalData.length,
    };
  }, [
    historicalData,
  ]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  const categoryColor = ruleInfo?.category
    ? (CATEGORY_COLORS[ruleInfo.category] ?? CATEGORY_COLORS.correctness)
    : CATEGORY_COLORS.correctness;

  return (
    <div className='main-content-container-lg flex flex-col gap-4'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex flex-col gap-2'>
          <button
            type='button'
            onClick={onBack}
            className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
          >
            <ArrowLeftIcon className='h-4 w-4' />
            Back to overview
          </button>
          <h1>{ruleName}</h1>
          {ruleInfo && <p className='text-muted-foreground'>{ruleInfo.description}</p>}
        </div>
        <ThemeToggle />
      </div>

      {ruleInfo && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <div
            className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 bg-card p-4 shadow-sm'
            style={{
              borderLeftColor: categoryColor,
            }}
          >
            <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Category
            </h3>
            <div className='text-2xl font-semibold text-foreground'>{ruleInfo.category}</div>
          </div>
          <div className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 border-l-green-500 bg-card p-4 shadow-sm'>
            <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Severity
            </h3>
            <div className='text-2xl font-semibold text-foreground'>{ruleInfo.severity}</div>
          </div>
          <div className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 border-l-green-500 bg-card p-4 shadow-sm'>
            <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Total Runs
            </h3>
            <div className='text-2xl font-semibold text-foreground'>{stats?.runCount ?? 0}</div>
          </div>
          <div className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 border-l-green-500 bg-card p-4 shadow-sm'>
            <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Avg Mean Time
            </h3>
            <div className='text-2xl font-semibold text-foreground'>
              {stats ? formatMedianLatency(stats.avgMean) : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {historicalData.length === 0 ? (
        <div className='rounded-lg border bg-card p-8 text-center'>
          <p className='text-muted-foreground'>No historical data found for this rule.</p>
        </div>
      ) : (
        <>
          <div className='rounded-lg border bg-card p-4 shadow-sm'>
            <h2 className='mb-4 text-lg font-semibold'>Performance Over Time</h2>
            <div className='h-[400px]'>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <LineChart
                  data={historicalData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    className='stroke-muted'
                  />
                  <XAxis
                    dataKey='displayDate'
                    tick={{
                      fontSize: 12,
                    }}
                    className='text-muted-foreground'
                  />
                  <YAxis
                    tickFormatter={(value: number) => formatMedianLatency(value)}
                    tick={{
                      fontSize: 12,
                    }}
                    className='text-muted-foreground'
                  />
                  <Tooltip
                    content={({
                      active,
                      payload,
                    }: {
                      active?: boolean;
                      payload?: Array<{
                        payload?: unknown;
                      }>;
                    }) => {
                      if (!active || !payload || payload.length === 0) {
                        return null;
                      }
                      const rawPayload = payload[0]?.payload;
                      if (!isHistoricalDataPoint(rawPayload)) {
                        return null;
                      }
                      const data = rawPayload;
                      return (
                        <div className='rounded-md border bg-background p-3 shadow-md'>
                          <p className='mb-2 font-semibold'>{data.displayDate}</p>
                          <div className='space-y-1 text-sm'>
                            <div>Mean: {formatMedianLatency(data.mean)}</div>
                            <div>Median: {formatMedianLatency(data.median)}</div>
                            <div>P95: {formatMedianLatency(data.p95)}</div>
                            <div>Min: {formatMedianLatency(data.min)}</div>
                            <div>Max: {formatMedianLatency(data.max)}</div>
                            <div>Commit: {data.commit}</div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='mean'
                    name='Mean'
                    stroke={categoryColor}
                    strokeWidth={2}
                    dot={{
                      fill: categoryColor,
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                  <Line
                    type='monotone'
                    dataKey='median'
                    name='Median'
                    stroke='#22c55e'
                    strokeWidth={2}
                    dot={{
                      fill: '#22c55e',
                      strokeWidth: 2,
                    }}
                  />
                  <Line
                    type='monotone'
                    dataKey='p95'
                    name='P95'
                    stroke='#f59e0b'
                    strokeWidth={2}
                    dot={{
                      fill: '#f59e0b',
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='rounded-lg border bg-card p-4 shadow-sm'>
            <h2 className='mb-4 text-lg font-semibold'>Run History</h2>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b'>
                    <th className='px-4 py-2 text-left font-medium text-muted-foreground'>Date</th>
                    <th className='px-4 py-2 text-right font-medium text-muted-foreground'>Mean</th>
                    <th className='px-4 py-2 text-right font-medium text-muted-foreground'>
                      Median
                    </th>
                    <th className='px-4 py-2 text-right font-medium text-muted-foreground'>P95</th>
                    <th className='px-4 py-2 text-right font-medium text-muted-foreground'>Min</th>
                    <th className='px-4 py-2 text-right font-medium text-muted-foreground'>Max</th>
                    <th className='px-4 py-2 text-left font-medium text-muted-foreground'>
                      Commit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...historicalData,
                  ]
                    .reverse()
                    .map((dataPoint) => (
                      <tr
                        key={dataPoint.timestamp}
                        className='border-b last:border-b-0 hover:bg-muted/50'
                      >
                        <td className='px-4 py-2'>{dataPoint.displayDate}</td>
                        <td className='px-4 py-2 text-right font-mono'>
                          {formatMedianLatency(dataPoint.mean)}
                        </td>
                        <td className='px-4 py-2 text-right font-mono'>
                          {formatMedianLatency(dataPoint.median)}
                        </td>
                        <td className='px-4 py-2 text-right font-mono'>
                          {formatMedianLatency(dataPoint.p95)}
                        </td>
                        <td className='px-4 py-2 text-right font-mono'>
                          {formatMedianLatency(dataPoint.min)}
                        </td>
                        <td className='px-4 py-2 text-right font-mono'>
                          {formatMedianLatency(dataPoint.max)}
                        </td>
                        <td className='px-4 py-2 font-mono text-muted-foreground'>
                          {dataPoint.commit}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
