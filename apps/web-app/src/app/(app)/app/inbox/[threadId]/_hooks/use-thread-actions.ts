'use client';

import { api } from '@seawatts/api/react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface UseThreadActionsProps {
  threadId: string;
}

export function useThreadActions({ threadId }: UseThreadActionsProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const [optimisticActionComplete, setOptimisticActionComplete] = useState<
    string | null
  >(null);
  const [optimisticallyApprovedIds, setOptimisticallyApprovedIds] = useState<
    Set<string>
  >(new Set());

  const createAction = api.email.actions.create.useMutation({
    onMutate: (variables) => {
      if (
        variables.actionType === 'archive' ||
        variables.actionType === 'snooze'
      ) {
        setOptimisticActionComplete(variables.actionType);
      }
    },
    onSettled: () => {
      utils.email.threads.byId.invalidate({ id: threadId });
      utils.email.threads.list.invalidate();
    },
  });

  const approveAction = api.email.actions.approve.useMutation({
    onError: (_err, variables) => {
      setOptimisticallyApprovedIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.actionId);
        return next;
      });
    },
    onMutate: (variables) => {
      setOptimisticallyApprovedIds((prev) =>
        new Set(prev).add(variables.actionId),
      );
    },
    onSettled: () => {
      utils.email.threads.byId.invalidate({ id: threadId });
    },
  });

  const handleAction = useCallback(
    (
      actionType: 'archive' | 'label' | 'snooze' | 'delete',
      payload?: Record<string, unknown>,
    ) => {
      createAction.mutate({
        actionType,
        payload,
        threadId,
      });
    },
    [createAction, threadId],
  );

  const handleApproveAction = useCallback(
    (actionId: string, approved: boolean) => {
      approveAction.mutate({ actionId, approved });
    },
    [approveAction],
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
    // Actions
    handleAction,
    handleApproveAction,
    handleArchive,
    handleArchiveAndNavigate,
    handleDelete,
    handleDeleteAndNavigate,
    handleSnooze,
    handleSnoozeAndNavigate,
    handleStar,
    isApprovingAction: approveAction.isPending,
    isCreatingAction: createAction.isPending,
    // State
    optimisticActionComplete,
    optimisticallyApprovedIds,
  };
}
