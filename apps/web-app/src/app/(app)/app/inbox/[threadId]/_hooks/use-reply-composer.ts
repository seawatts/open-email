'use client';

import { useTRPC } from '@seawatts/api/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

interface UseReplyComposerProps {
  threadId: string;
  threadSubject: string;
  lastMessageFromEmail: string;
}

export function useReplyComposer({
  threadId,
  threadSubject,
  lastMessageFromEmail,
}: UseReplyComposerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [editedBody, setEditedBody] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const sendReply = useMutation(
    trpc.email.sendReply.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.email.threads.byId.queryFilter({ id: threadId }),
        );
        setEditedBody('');
        setSelectedDraftId(null);
      },
    }),
  );

  const handleSendReply = useCallback(async () => {
    if (!editedBody) return;

    await sendReply.mutateAsync({
      body: editedBody,
      subject: `Re: ${threadSubject}`,
      threadId,
      to: [lastMessageFromEmail],
    });
  }, [editedBody, lastMessageFromEmail, sendReply, threadId, threadSubject]);

  const selectDraft = useCallback((draftId: string, body: string) => {
    setSelectedDraftId(draftId);
    setEditedBody(body);
  }, []);

  const clearDraft = useCallback(() => {
    setSelectedDraftId(null);
    setEditedBody('');
  }, []);

  const setDraftFromAgent = useCallback(
    (draft: { draftId: string; body: string }) => {
      setEditedBody(draft.body);
      setSelectedDraftId(draft.draftId);
    },
    [],
  );

  return {
    clearDraft,
    // State
    editedBody,
    handleSendReply,
    isSending: sendReply.isPending,
    selectDraft,
    selectedDraftId,
    setDraftFromAgent,

    // Actions
    setEditedBody,
  };
}
