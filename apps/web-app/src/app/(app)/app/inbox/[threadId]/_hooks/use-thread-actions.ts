'use client';

import { useTRPC } from '@seawatts/api/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface UseThreadActionsProps {
  threadId: string;
}

export function useThreadActions({ threadId }: UseThreadActionsProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [optimisticActionComplete, setOptimisticActionComplete] = useState<
    string | null
  >(null);
  const [isCreatingAction, setIsCreatingAction] = useState(false);

  const invalidateThreadQueries = useCallback(() => {
    queryClient.invalidateQueries(
      trpc.email.threads.byId.queryFilter({ id: threadId }),
    );
    queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
  }, [queryClient, trpc, threadId]);

  const handleAction = useCallback(
    (
      actionType: 'archive' | 'label' | 'snooze' | 'delete',
      _payload?: Record<string, unknown>,
    ) => {
      if (actionType === 'archive' || actionType === 'snooze') {
        setOptimisticActionComplete(actionType);
      }
      setIsCreatingAction(true);
      // TODO: Call Gmail action endpoints when available
      invalidateThreadQueries();
      setIsCreatingAction(false);
    },
    [invalidateThreadQueries],
  );

  const handleArchive = useCallback(() => {
    handleAction('archive');
  }, [handleAction]);

  const handleDelete = useCallback(() => {
    handleAction('delete');
  }, [handleAction]);

  const handleSnooze = useCallback(
    (durationMs: number = 24 * 60 * 60 * 1000) => {
      handleAction('snooze', {
        until: new Date(Date.now() + durationMs).toISOString(),
      });
    },
    [handleAction],
  );

  const handleStar = useCallback(() => {
    handleAction('label', { labelIds: ['STARRED'] });
  }, [handleAction]);

  const handleArchiveAndNavigate = useCallback(() => {
    handleArchive();
    router.push('/app/inbox');
  }, [handleArchive, router]);

  const handleDeleteAndNavigate = useCallback(() => {
    handleDelete();
    router.push('/app/inbox');
  }, [handleDelete, router]);

  const handleSnoozeAndNavigate = useCallback(
    (durationMs?: number) => {
      handleSnooze(durationMs);
      router.push('/app/inbox');
    },
    [handleSnooze, router],
  );

  return {
    handleAction,
    handleArchive,
    handleArchiveAndNavigate,
    handleDelete,
    handleDeleteAndNavigate,
    handleSnooze,
    handleSnoozeAndNavigate,
    handleStar,
    isCreatingAction,
    optimisticActionComplete,
  };
}
