'use client';

import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { cn } from '@seawatts/ui/lib/utils';
import {
  AlertTriangle,
  CheckCheck,
  Hourglass,
  Info,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

type EmailCategory =
  | 'urgent'
  | 'needs_reply'
  | 'awaiting_other'
  | 'fyi'
  | 'spam_like';

interface ThreadWithDecision {
  id: string;
  latestDecision?: {
    category: EmailCategory;
    confidence: number;
  } | null;
}

interface AITriageSummaryProps {
  threads: ThreadWithDecision[];
  onApproveCategory: (category: string) => void;
  className?: string;
  isLoading?: boolean;
}

const categoryConfig = [
  {
    action: 'Handle now',
    bg: 'bg-red-100 dark:bg-red-900/20',
    color: 'text-red-600 dark:text-red-400',
    icon: AlertTriangle,
    key: 'urgent',
    label: 'Urgent',
  },
  {
    action: 'Review drafts',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    color: 'text-blue-600 dark:text-blue-400',
    icon: MessageSquare,
    key: 'needs_reply',
    label: 'Needs Reply',
  },
  {
    action: 'Auto-snooze',
    bg: 'bg-amber-100 dark:bg-amber-900/20',
    color: 'text-amber-600 dark:text-amber-400',
    icon: Hourglass,
    key: 'awaiting_other',
    label: 'Waiting',
  },
  {
    action: 'Archive all',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    color: 'text-slate-600 dark:text-slate-400',
    icon: Info,
    key: 'fyi',
    label: 'FYI',
  },
  {
    action: 'Delete all',
    bg: 'bg-rose-100 dark:bg-rose-900/20',
    color: 'text-rose-600 dark:text-rose-400',
    icon: ShieldAlert,
    key: 'spam_like',
    label: 'Spam',
  },
] as const;

export function AITriageSummary({
  threads,
  onApproveCategory,
  className,
  isLoading,
}: AITriageSummaryProps) {
  const categories = {
    awaiting_other: threads.filter(
      (t) => t.latestDecision?.category === 'awaiting_other',
    ),
    fyi: threads.filter((t) => t.latestDecision?.category === 'fyi'),
    needs_reply: threads.filter(
      (t) => t.latestDecision?.category === 'needs_reply',
    ),
    spam_like: threads.filter(
      (t) => t.latestDecision?.category === 'spam_like',
    ),
    urgent: threads.filter((t) => t.latestDecision?.category === 'urgent'),
  };

  // Count threads that have been triaged
  const triagedCount = threads.filter((t) => t.latestDecision).length;
  const totalCount = threads.length;

  // Don't show if no threads or all untriaged
  if (totalCount === 0 || triagedCount === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Triage Summary
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {triagedCount}/{totalCount} analyzed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {categoryConfig.map((config) => {
            const count =
              categories[config.key as keyof typeof categories].length;
            if (count === 0) return null;

            const Icon = config.icon;

            return (
              <div
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg p-3 transition-all hover:scale-[1.02]',
                  config.bg,
                )}
                key={config.key}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className="text-2xl font-bold tabular-nums">
                    {count}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {config.label}
                </span>
                <Button
                  className={cn('h-7 w-full text-xs', config.color)}
                  disabled={isLoading}
                  onClick={() => onApproveCategory(config.key)}
                  size="sm"
                  variant="ghost"
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  {config.action}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
