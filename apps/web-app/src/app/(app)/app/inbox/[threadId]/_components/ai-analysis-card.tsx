'use client';

import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { cn } from '@seawatts/ui/lib/utils';
import { RefreshCw, Sparkles, Zap } from 'lucide-react';

import { CategoryBadge } from '../../_components/category-badge';
import type { EmailCategory, ThreadDecision } from './types';

interface AIAnalysisCardProps {
  decision: ThreadDecision | null;
  isProcessing: boolean;
  isRetriaging: boolean;
  onRetriage: () => void;
  onSmartProcess: () => void;
}

export function AIAnalysisCard({
  decision,
  isProcessing,
  isRetriaging,
  onRetriage,
  onSmartProcess,
}: AIAnalysisCardProps) {
  const isLoading = isProcessing || isRetriaging;

  if (!decision) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Agent Analysis</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            This thread hasn&apos;t been analyzed yet.
          </p>
          <Button
            className="w-full"
            disabled={isLoading}
            onClick={onRetriage}
            size="sm"
            variant="outline"
          >
            <Sparkles className="mr-2 size-4" />
            Analyze with AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="grid grid-cols-[1fr_auto] items-center">
          <CardTitle className="text-base">AI Analysis</CardTitle>
          <div className="grid grid-cols-2 gap-1">
            <Button
              disabled={isLoading}
              onClick={onSmartProcess}
              size="sm"
              title="Smart Process (auto-execute safe actions)"
              variant="ghost"
            >
              <Zap className={cn('size-4', isLoading && 'animate-pulse')} />
            </Button>
            <Button
              disabled={isLoading}
              onClick={onRetriage}
              size="sm"
              title="Re-analyze"
              variant="ghost"
            >
              <RefreshCw
                className={cn('size-4', isLoading && 'animate-spin')}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div>
          <CategoryBadge
            category={decision.category as EmailCategory}
            confidence={decision.confidence}
            size="md"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            SUGGESTED ACTION
          </p>
          <p className="capitalize">
            {decision.suggestedAction.replace('_', ' ')}
          </p>
        </div>

        {decision.summary && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              SUMMARY
            </p>
            <p className="text-sm">{decision.summary}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            REASONS
          </p>
          <ul className="grid list-inside list-disc gap-1 text-sm">
            {decision.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
