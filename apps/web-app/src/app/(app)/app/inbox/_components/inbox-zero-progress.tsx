'use client';

import { cn } from '@seawatts/ui/lib/utils';
import { Sparkles, Trophy, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InboxZeroProgressProps {
  total: number;
  processed: number;
  className?: string;
}

export function InboxZeroProgress({
  total,
  processed,
  className,
}: InboxZeroProgressProps) {
  const [animatedProcessed, setAnimatedProcessed] = useState(processed);
  const percentage =
    total > 0 ? Math.round((animatedProcessed / total) * 100) : 100;
  const remaining = total - animatedProcessed;
  const isComplete = remaining === 0 && total > 0;

  useEffect(() => {
    setAnimatedProcessed(processed);
  }, [processed]);

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Progress ring */}
      <div className="relative h-14 w-14 flex-shrink-0">
        <svg className="h-14 w-14 -rotate-90 transform" viewBox="0 0 56 56">
          <circle
            className="text-secondary"
            cx="28"
            cy="28"
            fill="none"
            r="24"
            stroke="currentColor"
            strokeWidth="4"
          />
          <circle
            className={cn(
              'transition-all duration-500 ease-out',
              isComplete ? 'text-primary' : 'text-primary/80',
            )}
            cx="28"
            cy="28"
            fill="none"
            r="24"
            stroke="currentColor"
            strokeDasharray={150.8}
            strokeDashoffset={150.8 - (150.8 * percentage) / 100}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <Trophy className="h-5 w-5 text-primary" />
          ) : (
            <span className="text-sm font-bold tabular-nums">
              {percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <>
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Inbox Zero!</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="font-medium">
                <span className="text-foreground">{remaining}</span>
                <span className="text-muted-foreground"> to go</span>
              </span>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {animatedProcessed} of {total} processed
        </span>
      </div>
    </div>
  );
}
