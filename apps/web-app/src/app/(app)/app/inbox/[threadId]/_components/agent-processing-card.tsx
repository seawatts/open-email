'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { Brain, Loader2 } from 'lucide-react';

import type { AgentEvent } from './types';

interface AgentProcessingCardProps {
  thinkingContent: string;
  streamingDraft: string;
  agentEvents: AgentEvent[];
}

export function AgentProcessingCard({
  thinkingContent,
  streamingDraft,
  agentEvents,
}: AgentProcessingCardProps) {
  const processedEventsCount = agentEvents.filter(
    (e) => e.type !== 'thinking' && e.type !== 'draft_chunk',
  ).length;

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="grid grid-cols-[auto_1fr] items-center gap-2 text-base">
          <Brain className="size-4 animate-pulse text-primary" />
          Agent Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Analyzing email thread...
        </div>

        {thinkingContent && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              THINKING
            </p>
            <p className="line-clamp-4 text-xs italic text-muted-foreground">
              {thinkingContent}
            </p>
          </div>
        )}

        {streamingDraft && (
          <div className="rounded-md border border-primary/30 bg-background p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              DRAFTING REPLY
            </p>
            <p className="text-sm">{streamingDraft}</p>
            <span className="inline-block size-4 w-1 animate-pulse bg-primary" />
          </div>
        )}

        {processedEventsCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {processedEventsCount} actions processed
          </div>
        )}
      </CardContent>
    </Card>
  );
}
