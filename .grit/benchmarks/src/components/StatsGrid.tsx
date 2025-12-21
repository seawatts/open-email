import type { BenchmarkData, BenchmarkResult } from '../types';

import { formatMedianLatency } from '@openrouter-monorepo/db/featured-models';

interface StatsGridProps {
  data: BenchmarkData;
  slowestRule: BenchmarkResult | null;
}

export function StatsGrid({ data, slowestRule }: StatsGridProps) {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <div className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 border-l-green-500 bg-card p-4 shadow-sm'>
        <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Baseline
        </h3>
        <div className='break-words text-2xl font-semibold text-foreground'>
          {data.baseline && data.baseline.mean > 0 ? (
            formatMedianLatency(Math.round(data.baseline.mean))
          ) : (
            <span className='text-sm font-normal text-muted-foreground'>Not measured</span>
          )}
        </div>
      </div>
      <div className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 border-l-green-500 bg-card p-4 shadow-sm'>
        <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Slowest Rule
        </h3>
        <div className='flex flex-col gap-2'>
          {slowestRule ? (
            <>
              <div className='break-words text-sm font-medium text-muted-foreground'>
                {slowestRule.name}
              </div>
              <div className='break-words text-2xl font-semibold text-foreground'>
                {formatMedianLatency(slowestRule.mean)}
              </div>
            </>
          ) : (
            <span className='text-sm font-normal text-muted-foreground'>No rules</span>
          )}
        </div>
      </div>
      <div className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 border-l-green-500 bg-card p-4 shadow-sm'>
        <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          All Together
        </h3>
        <div className='break-words text-2xl font-semibold text-foreground'>
          {data.allTogether && data.allTogether.mean > 0 ? (
            formatMedianLatency(data.allTogether.mean)
          ) : (
            <span className='text-sm font-normal text-muted-foreground'>Not measured</span>
          )}
        </div>
      </div>
      <div className='flex min-h-[100px] flex-col justify-between overflow-hidden rounded-lg border border-l-4 border-l-green-500 bg-card p-4 shadow-sm'>
        <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Files Checked
        </h3>
        <div className='text-2xl font-semibold text-foreground'>
          {data.filesChecked?.toLocaleString() ?? 0}
        </div>
      </div>
    </div>
  );
}
