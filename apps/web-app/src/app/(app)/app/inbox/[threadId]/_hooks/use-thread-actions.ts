'use client';

import { useTRPC } from '@seawatts/api/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [optimisticallyApprovedIds, setOptimisticallyApprovedIds] = useState<
    Set<string>
  >(new Set());

  const createAction = useMutation(
    trpc.email.actions.create.mutationOptions({
      onMutate: (variables) => {
        if (
          variables.actionType === 'archive' ||
          variables.actionType === 'snooze'
        ) {
          setOptimisticActionComplete(variables.actionType);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries(
          trpc.email.threads.byId.queryFilter({ id: threadId }),
        );
        queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
      },
    }),
  );

  const approveAction = useMutation(
    trpc.email.actions.approve.mutationOptions({
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
        queryClient.invalidateQueries(
          trpc.email.threads.byId.queryFilter({ id: threadId }),
        );
      },
    }),
  );

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
