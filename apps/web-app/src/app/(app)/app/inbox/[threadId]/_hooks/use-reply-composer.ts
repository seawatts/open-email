'use client';

import { api } from '@seawatts/api/react';
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
  const utils = api.useUtils();

  const [editedBody, setEditedBody] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const sendReply = api.email.sendReply.useMutation({
    onSuccess: () => {
      utils.email.threads.byId.invalidate({ id: threadId });
      setEditedBody('');
      setSelectedDraftId(null);
    },
  });

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
    // State
    editedBody,
    selectedDraftId,
    isSending: sendReply.isPending,

    // Actions
    setEditedBody,
    handleSendReply,
    selectDraft,
    clearDraft,
    setDraftFromAgent,
  };
}

