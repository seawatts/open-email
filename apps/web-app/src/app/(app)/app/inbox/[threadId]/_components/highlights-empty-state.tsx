'use client';

import { Button } from '@seawatts/ui/button';
import { Lightbulb, Sparkles } from 'lucide-react';

interface HighlightsEmptyStateProps {
  isProcessing: boolean;
  onExtract: () => void;
}

export function HighlightsEmptyState({
  isProcessing,
  onExtract,
}: HighlightsEmptyStateProps) {
  return (
    <div className="grid place-items-center gap-3 py-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted">
        <Lightbulb className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No highlights yet</p>
        <p className="text-sm text-muted-foreground">
          Process this email to extract key information
        </p>
      </div>
      <Button
        disabled={isProcessing}
        onClick={onExtract}
        size="sm"
        variant="outline"
      >
        <Sparkles className="mr-1 size-4" />
        Extract Highlights
      </Button>
    </div>
  );
}
