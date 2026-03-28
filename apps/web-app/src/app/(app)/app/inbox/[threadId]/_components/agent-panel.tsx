'use client';

import type { QuickReplyOption } from '@seawatts/db/schema';
import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { cn } from '@seawatts/ui/lib/utils';
import { ScrollArea } from '@seawatts/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@seawatts/ui/tabs';
import { Brain, MessageSquare, RefreshCw } from 'lucide-react';
import { useRef } from 'react';

import { AI_ACTION_BADGE_CONFIG } from '../../_lib/ai-action-config';
import { ReplyComposer } from './reply-composer';

interface AgentPanelProps {
  activeTab: string;
  aiAction?: string | null;
  aiConfidence?: number | null;
  aiQuickReplies?: QuickReplyOption[] | null;
  aiSummary?: string | null;
  editedBody: string;
  isProcessing: boolean;
  isRetriaging: boolean;
  isSending: boolean;
  onBodyChange: (value: string) => void;
  onClearDraft: () => void;
  onQuickReply?: (body: string) => void;
  onRetriage: () => void;
  onSendReply: () => void;
  onSmartProcess: () => void;
  onTabChange: (tab: string) => void;
  selectedDraftId: string | null;
  streamingDraft: string;
  onArchive?: () => void;
  onSnooze?: () => void;
  onStar?: () => void;
}

export function AgentPanel({
  activeTab,
  aiAction,
  aiConfidence,
  aiQuickReplies,
  aiSummary,
  editedBody,
  isProcessing,
  isRetriaging,
  isSending,
  onBodyChange,
  onClearDraft,
  onQuickReply,
  onRetriage,
  onSendReply,
  onSmartProcess,
  onTabChange,
  selectedDraftId,
  streamingDraft,
}: AgentPanelProps) {
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = isProcessing || isRetriaging;

  return (
    <div className="w-full lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-96 lg:overflow-hidden">
      <Tabs className="h-full" onValueChange={onTabChange} value={activeTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger className="gap-1" value="agent">
            <Brain className="size-3" />
            Agent
          </TabsTrigger>
          <TabsTrigger className="gap-1" value="reply">
            <MessageSquare className="size-3" />
            Reply
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100%-3rem)]">
          {/* Agent Tab — simplified to summary, action, quick replies, confidence */}
          <TabsContent className="mt-4 grid gap-4 px-4" value="agent">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">AI Triage</CardTitle>
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
              </CardHeader>
              <CardContent className="grid gap-3">
                {/* AI Action badge */}
                {aiAction && AI_ACTION_BADGE_CONFIG[aiAction] && (
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        'text-sm px-3 py-1 font-medium',
                        AI_ACTION_BADGE_CONFIG[aiAction].className,
                      )}
                      variant="secondary"
                    >
                      {AI_ACTION_BADGE_CONFIG[aiAction].label}
                    </Badge>
                    {aiConfidence != null && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(aiConfidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                )}

                {/* AI Summary */}
                {aiSummary && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      SUMMARY
                    </p>
                    <p className="text-sm">{aiSummary}</p>
                  </div>
                )}

                {/* Quick Reply Options */}
                {aiQuickReplies && aiQuickReplies.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      QUICK REPLIES
                    </p>
                    <div className="grid gap-1.5">
                      {aiQuickReplies.map((reply, idx) => (
                        <button
                          className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          key={reply.label}
                          onClick={() => onQuickReply?.(reply.body)}
                          type="button"
                        >
                          <span className="mr-1.5 text-xs text-muted-foreground">
                            {idx + 1}.
                          </span>
                          {reply.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!aiAction && !aiSummary && (
                  <div className="text-center">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Not analyzed yet
                    </p>
                    <Button
                      disabled={isLoading}
                      onClick={onSmartProcess}
                      size="sm"
                      variant="outline"
                    >
                      Analyze with AI
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reply Tab */}
          <TabsContent className="mt-4" value="reply">
            <ReplyComposer
              editedBody={editedBody}
              isProcessing={isProcessing}
              isSending={isSending}
              onBodyChange={onBodyChange}
              onClear={onClearDraft}
              onGenerateDraft={onSmartProcess}
              onSendReply={onSendReply}
              ref={replyTextareaRef}
              selectedDraftId={selectedDraftId}
              streamingDraft={streamingDraft}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
