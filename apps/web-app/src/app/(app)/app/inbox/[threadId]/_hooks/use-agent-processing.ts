'use client';

import { api } from '@seawatts/api/react';
import { useCallback, useState } from 'react';

import type { AgentEvent } from '../_components/types';

interface UseAgentProcessingProps {
  threadId: string;
  onDraftComplete?: (draft: { draftId: string; body: string }) => void;
}

export function useAgentProcessing({
  threadId,
  onDraftComplete,
}: UseAgentProcessingProps) {
  const utils = api.useUtils();

  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [streamingDraft, setStreamingDraft] = useState('');
  const [thinkingContent, setThinkingContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      setAgentEvents((prev) => [...prev, event]);

      switch (event.type) {
        case 'thinking':
          setThinkingContent((prev) => prev + (event.content ?? ''));
          break;
        case 'draft_chunk':
          setStreamingDraft((prev) => prev + (event.content ?? ''));
          break;
        case 'draft_complete':
          if (event.draft && onDraftComplete) {
            onDraftComplete({
              draftId: event.draft.draftId,
              body: event.draft.body,
            });
          }
          break;
      }
    },
    [onDraftComplete],
  );

  const agentMutation = api.email.agent.processThread.useMutation({
    onError: () => {
      setIsProcessing(false);
    },
    onMutate: () => {
      setIsProcessing(true);
      setAgentEvents([]);
      setStreamingDraft('');
      setThinkingContent('');
    },
    onSuccess: (data) => {
      for (const event of data.events) {
        handleAgentEvent(event as AgentEvent);
      }
      utils.email.threads.byId.invalidate({ id: threadId });
      setIsProcessing(false);
    },
  });

  const handleRetriage = useCallback(() => {
    agentMutation.mutate({ autoExecute: false, threadId });
  }, [agentMutation, threadId]);

  const handleSmartProcess = useCallback(() => {
    agentMutation.mutate({ autoExecute: true, threadId });
  }, [agentMutation, threadId]);

  const resetDraft = useCallback(() => {
    setStreamingDraft('');
  }, []);

  return {
    // State
    agentEvents,
    streamingDraft,
    thinkingContent,
    isProcessing,
    isRetriaging: agentMutation.isPending,

    // Actions
    handleRetriage,
    handleSmartProcess,
    resetDraft,
  };
}

