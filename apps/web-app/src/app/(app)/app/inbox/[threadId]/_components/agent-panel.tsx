'use client';

import { Badge } from '@seawatts/ui/badge';
import { ScrollArea } from '@seawatts/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@seawatts/ui/tabs';
import { Brain, Lightbulb, MessageSquare } from 'lucide-react';
import { useRef } from 'react';

import { HighlightList } from '../../_components/highlight-card';
import {
  type SmartAction,
  SmartActionsPanel,
} from '../../_components/smart-actions-panel';
import { AgentProcessingCard } from './agent-processing-card';
import { AIAnalysisCard } from './ai-analysis-card';
import { HighlightsEmptyState } from './highlights-empty-state';
import { PendingActionsCard } from './pending-actions-card';
import { QuickActionsCard } from './quick-actions-card';
import { ReplyComposer } from './reply-composer';
import type {
  AgentEvent,
  EmailCategory,
  FormattedHighlight,
  ThreadAction,
  ThreadDecision,
} from './types';

interface AgentPanelProps {
  // Agent state
  isProcessing: boolean;
  isRetriaging: boolean;
  agentEvents: AgentEvent[];
  streamingDraft: string;
  thinkingContent: string;

  // Thread data
  decision: ThreadDecision | null;
  pendingActions: ThreadAction[];
  highlights: FormattedHighlight[] | undefined;

  // Reply state
  editedBody: string;
  selectedDraftId: string | null;
  isSending: boolean;

  // Tab state
  activeTab: string;
  onTabChange: (tab: string) => void;

  // Agent actions
  onRetriage: () => void;
  onSmartProcess: () => void;

  // Thread actions
  onArchive: () => void;
  onStar: () => void;
  onSnooze: () => void;
  onApproveAction: (actionId: string, approved: boolean) => void;

  // Reply actions
  onBodyChange: (value: string) => void;
  onSelectDraft: (draftId: string, body: string) => void;
  onSendReply: () => void;
  onClearDraft: () => void;
}

function generateSmartActions(
  decision: ThreadDecision | null,
): SmartAction[] {
  if (!decision) return [];

  const actions: SmartAction[] = [];

  if (decision.suggestedAction === 'reply') {
    actions.push({
      confidence: decision.confidence,
      description: 'Generate an AI-assisted reply based on the email content',
      id: 'smart-reply',
      label: 'Draft Reply',
      type: 'reply' as const,
    });
  }

  if (
    decision.suggestedAction === 'archive' ||
    decision.category === 'fyi'
  ) {
    actions.push({
      confidence: decision.confidence,
      description: 'Archive this email to clean up your inbox',
      id: 'smart-archive',
      label: 'Archive',
      type: 'archive' as const,
    });
  }

  if (decision.category === 'awaiting_other') {
    actions.push({
      confidence: 0.8,
      description: "Snooze and get reminded when there's activity",
      estimatedTime: 'Instant',
      id: 'smart-snooze',
      label: 'Snooze until reply',
      type: 'schedule' as const,
    });
  }

  return actions;
}

export function AgentPanel({
  isProcessing,
  isRetriaging,
  agentEvents,
  streamingDraft,
  thinkingContent,
  decision,
  pendingActions,
  highlights,
  editedBody,
  selectedDraftId,
  isSending,
  activeTab,
  onTabChange,
  onRetriage,
  onSmartProcess,
  onArchive,
  onStar,
  onSnooze,
  onApproveAction,
  onBodyChange,
  onSelectDraft,
  onSendReply,
  onClearDraft,
}: AgentPanelProps) {
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const smartActions = generateSmartActions(decision);

  const handleSmartAction = async (action: SmartAction) => {
    switch (action.type) {
      case 'reply':
        onSmartProcess();
        break;
      case 'archive':
        onArchive();
        break;
      case 'schedule':
        onSnooze();
        break;
    }
  };

  return (
    <div className="w-full lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-96 lg:overflow-hidden">
      <Tabs className="h-full" onValueChange={onTabChange} value={activeTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger className="gap-1" value="agent">
            <Brain className="size-3" />
            Agent
          </TabsTrigger>
          <TabsTrigger className="gap-1" value="highlights">
            <Lightbulb className="size-3" />
            Highlights
            {highlights && highlights.length > 0 && (
              <Badge className="ml-1 size-5 p-0" variant="secondary">
                {highlights.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger className="gap-1" value="reply">
            <MessageSquare className="size-3" />
            Reply
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100%-3rem)]">
          {/* Agent Tab */}
          <TabsContent className="mt-4 grid gap-4" value="agent">
            {isProcessing && (
              <AgentProcessingCard
                agentEvents={agentEvents}
                streamingDraft={streamingDraft}
                thinkingContent={thinkingContent}
              />
            )}

            <AIAnalysisCard
              decision={decision}
              isProcessing={isProcessing}
              isRetriaging={isRetriaging}
              onRetriage={onRetriage}
              onSmartProcess={onSmartProcess}
            />

            {smartActions.length > 0 && (
              <SmartActionsPanel
                actions={smartActions}
                isLoading={isProcessing}
                onActionExecuted={handleSmartAction}
                title="AI Suggested Actions"
              />
            )}

            <QuickActionsCard
              onArchive={onArchive}
              onSnooze={onSnooze}
              onStar={onStar}
            />

            <PendingActionsCard
              actions={pendingActions}
              onApprove={onApproveAction}
            />
          </TabsContent>

          {/* Highlights Tab */}
          <TabsContent className="mt-4 grid gap-4" value="highlights">
            {highlights && highlights.length > 0 ? (
              <HighlightList
                highlights={
                  highlights as Parameters<typeof HighlightList>[0]['highlights']
                }
              />
            ) : (
              <HighlightsEmptyState
                isProcessing={isProcessing}
                onExtract={onSmartProcess}
              />
            )}
          </TabsContent>

          {/* Reply Tab */}
          <TabsContent className="mt-4" value="reply">
            <ReplyComposer
              decision={decision}
              editedBody={editedBody}
              isProcessing={isProcessing}
              isSending={isSending}
              onBodyChange={onBodyChange}
              onClear={onClearDraft}
              onGenerateDraft={onSmartProcess}
              onSelectDraft={onSelectDraft}
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

