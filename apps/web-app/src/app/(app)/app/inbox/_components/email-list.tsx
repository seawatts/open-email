'use client';

import { api } from '@seawatts/api/react';
import { Button } from '@seawatts/ui/button';
import { Input } from '@seawatts/ui/input';
import { Skeleton } from '@seawatts/ui/skeleton';
import {
  Archive,
  CheckCircle2,
  Clock,
  Inbox,
  Keyboard,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import { AITriageSummary } from './ai-triage-summary';
import { EmailRow } from './email-row';
import { InboxZeroProgress } from './inbox-zero-progress';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import { SwipeableEmailRow } from './swipeable-email-row';
import { useKeyboardShortcuts, useKeySequence } from './use-keyboard-shortcuts';

type EmailCategory =
  | 'urgent'
  | 'needs_reply'
  | 'awaiting_other'
  | 'fyi'
  | 'spam_like';

type FilterMode = 'all' | 'action_needed' | 'waiting' | 'done';

interface EmailListProps {
  gmailAccountId: string;
}

export function EmailList({ gmailAccountId }: EmailListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<FilterMode>('action_needed');
  const [searchQuery, setSearchQuery] = useState('');
  // Track optimistically removed threads for instant UI feedback
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<
    Set<string>
  >(new Set());
  const [isPending, startTransition] = useTransition();

  // Keyboard shortcuts state
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [undoStack, setUndoStack] = useState<
    Array<{ threadId: string; action: string }>
  >([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();

  const { data: threads, isLoading } = api.email.threads.list.useQuery({
    gmailAccountId,
    limit: 50,
  });

  // Optimistic mutation for creating actions
  const createAction = api.email.actions.create.useMutation({
    onError: (_err, variables) => {
      // Rollback: remove from optimistically removed set
      setOptimisticallyRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.threadId);
        return next;
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      utils.email.threads.list.invalidate();
    },
  });

  // Filter threads (excluding optimistically removed ones)
  const filteredThreads = useMemo(() => {
    if (!threads) return [];

    // First, exclude optimistically removed threads
    let filtered = threads.filter((t) => !optimisticallyRemovedIds.has(t.id));

    // Apply filter mode
    switch (filterMode) {
      case 'action_needed':
        filtered = filtered.filter(
          (t) =>
            t.latestDecision?.category === 'urgent' ||
            t.latestDecision?.category === 'needs_reply',
        );
        break;
      case 'waiting':
        filtered = filtered.filter(
          (t) => t.latestDecision?.category === 'awaiting_other',
        );
        break;
      case 'done':
        filtered = filtered.filter(
          (t) =>
            t.latestDecision?.category === 'fyi' ||
            t.latestDecision?.category === 'spam_like',
        );
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.subject.toLowerCase().includes(query) ||
          t.snippet?.toLowerCase().includes(query) ||
          t.participantEmails.some((e) => e.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [threads, filterMode, searchQuery, optimisticallyRemovedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredThreads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredThreads.map((t) => t.id)));
    }
  }, [selectedIds.size, filteredThreads]);

  // Optimistic archive - instantly removes from UI
  const handleArchive = useCallback(() => {
    // Optimistically remove all selected threads
    setOptimisticallyRemovedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.add(id);
      }
      return next;
    });
    setProcessedCount((c) => c + selectedIds.size);
    setSelectedIds(new Set());

    // Fire mutations in background (don't await)
    startTransition(() => {
      for (const threadId of selectedIds) {
        createAction.mutate({
          actionType: 'archive',
          threadId,
        });
      }
    });
  }, [selectedIds, createAction]);

  // Optimistic quick archive
  const handleQuickArchive = useCallback(
    (threadId: string) => {
      // Optimistically remove from UI
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);

      // Fire mutation in background
      createAction.mutate({
        actionType: 'archive',
        threadId,
      });
    },
    [createAction],
  );

  // Optimistic quick approve
  const handleQuickApprove = useCallback(
    (threadId: string) => {
      // Optimistically remove from UI
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);

      // Fire mutation in background
      createAction.mutate({
        actionType: 'archive',
        threadId,
      });
    },
    [createAction],
  );

  // Counts exclude optimistically removed threads
  const counts = useMemo(() => {
    if (!threads) return { actionNeeded: 0, all: 0, done: 0, waiting: 0 };

    const visibleThreads = threads.filter(
      (t) => !optimisticallyRemovedIds.has(t.id),
    );

    return {
      actionNeeded: visibleThreads.filter(
        (t) =>
          t.latestDecision?.category === 'urgent' ||
          t.latestDecision?.category === 'needs_reply',
      ).length,
      all: visibleThreads.length,
      done: visibleThreads.filter(
        (t) =>
          t.latestDecision?.category === 'fyi' ||
          t.latestDecision?.category === 'spam_like',
      ).length,
      waiting: visibleThreads.filter(
        (t) => t.latestDecision?.category === 'awaiting_other',
      ).length,
    };
  }, [threads, optimisticallyRemovedIds]);

  const [processedCount, setProcessedCount] = useState(0);

  // Optimistic batch approve category
  const handleApproveCategory = useCallback(
    (category: string) => {
      if (!threads) return;

      const categoryThreads = threads.filter(
        (t) =>
          t.latestDecision?.category === category &&
          !optimisticallyRemovedIds.has(t.id),
      );

      if (categoryThreads.length === 0) return;

      // Optimistically remove all threads in this category
      setOptimisticallyRemovedIds((prev) => {
        const next = new Set(prev);
        for (const thread of categoryThreads) {
          next.add(thread.id);
        }
        return next;
      });
      setProcessedCount((c) => c + categoryThreads.length);

      // Fire mutations in background
      startTransition(() => {
        for (const thread of categoryThreads) {
          createAction.mutate({
            actionType: 'archive',
            threadId: thread.id,
          });
        }
      });
    },
    [threads, createAction, optimisticallyRemovedIds],
  );

  // Optimistic swipe archive
  const handleSwipeArchive = useCallback(
    (threadId: string) => {
      // Optimistically remove from UI
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);

      // Fire mutation in background
      createAction.mutate({
        actionType: 'archive',
        threadId,
      });
    },
    [createAction],
  );

  // Optimistic swipe snooze
  const handleSwipeSnooze = useCallback(
    (threadId: string) => {
      // Optimistically remove from UI
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);

      // Fire mutation in background
      createAction.mutate({
        actionType: 'snooze',
        threadId,
      });
    },
    [createAction],
  );

  // Get the focused thread
  const focusedThread = filteredThreads[focusedIndex];

  // Keyboard action handlers
  const handleKeyboardArchive = useCallback(() => {
    if (selectedIds.size > 0) {
      // Archive selected
      handleArchive();
    } else if (focusedThread) {
      // Archive focused
      handleQuickArchive(focusedThread.id);
      // Add to undo stack
      setUndoStack((prev) => [
        ...prev,
        { action: 'archive', threadId: focusedThread.id },
      ]);
    }
  }, [selectedIds, focusedThread, handleArchive, handleQuickArchive]);

  const handleKeyboardSnooze = useCallback(() => {
    if (focusedThread) {
      handleSwipeSnooze(focusedThread.id);
      setUndoStack((prev) => [
        ...prev,
        { action: 'snooze', threadId: focusedThread.id },
      ]);
    }
  }, [focusedThread, handleSwipeSnooze]);

  const handleKeyboardDelete = useCallback(() => {
    if (focusedThread) {
      setOptimisticallyRemovedIds((prev) =>
        new Set(prev).add(focusedThread.id),
      );
      createAction.mutate({
        actionType: 'delete',
        threadId: focusedThread.id,
      });
    }
  }, [focusedThread, createAction]);

  const handleKeyboardStar = useCallback(() => {
    if (focusedThread) {
      createAction.mutate({
        actionType: 'label',
        payload: { labelIds: ['STARRED'] },
        threadId: focusedThread.id,
      });
    }
  }, [focusedThread, createAction]);

  const handleKeyboardSelect = useCallback(() => {
    if (focusedThread) {
      toggleSelect(focusedThread.id);
    }
  }, [focusedThread, toggleSelect]);

  const handleUndo = useCallback(() => {
    const lastAction = undoStack.at(-1);
    if (!lastAction) return;

    // Remove from optimistically removed (restore to UI)
    setOptimisticallyRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(lastAction.threadId);
      return next;
    });
    setUndoStack((prev) => prev.slice(0, -1));

    // Note: In a real implementation, you'd also call an API to undo the action
  }, [undoStack]);

  // Navigation keyboard shortcuts
  useKeyboardShortcuts(
    [
      // Navigation
      {
        category: 'navigation',
        description: 'Move down',
        handler: () =>
          setFocusedIndex((i) => Math.min(i + 1, filteredThreads.length - 1)),
        key: 'j',
      },
      {
        category: 'navigation',
        description: 'Move up',
        handler: () => setFocusedIndex((i) => Math.max(i - 1, 0)),
        key: 'k',
      },
      {
        category: 'navigation',
        description: 'Open email',
        handler: () => {
          if (focusedThread) {
            router.push(`/app/inbox/${focusedThread.id}`);
          }
        },
        key: 'Enter',
      },
      {
        category: 'navigation',
        description: 'Jump to first',
        handler: () => setFocusedIndex(0),
        key: 'g',
        shift: true,
      },
      {
        category: 'navigation',
        description: 'Jump to last',
        handler: () => setFocusedIndex(filteredThreads.length - 1),
        key: 'g',
        shift: true,
      },

      // Actions
      {
        category: 'actions',
        description: 'Archive',
        handler: handleKeyboardArchive,
        key: 'e',
      },
      {
        category: 'actions',
        description: 'Delete',
        handler: handleKeyboardDelete,
        key: '#',
        shift: true,
      },
      {
        category: 'actions',
        description: 'Snooze',
        handler: handleKeyboardSnooze,
        key: 'h',
      },
      {
        category: 'actions',
        description: 'Star',
        handler: handleKeyboardStar,
        key: 's',
      },
      {
        category: 'actions',
        description: 'Mark as done',
        handler: handleKeyboardArchive,
        key: 'd',
      },
      {
        category: 'actions',
        description: 'Undo',
        handler: handleUndo,
        key: 'z',
      },

      // Selection
      {
        category: 'selection',
        description: 'Select/deselect',
        handler: handleKeyboardSelect,
        key: 'x',
      },
      {
        category: 'selection',
        description: 'Select all',
        handler: selectAll,
        key: 'a',
        meta: true,
      },
      {
        category: 'selection',
        description: 'Deselect all',
        handler: () => setSelectedIds(new Set()),
        key: 'Escape',
      },

      // View
      {
        category: 'view',
        description: 'Search',
        handler: () => searchInputRef.current?.focus(),
        key: '/',
      },
      {
        category: 'view',
        description: 'Show shortcuts',
        handler: () => setShowShortcutsDialog(true),
        key: '?',
        shift: true,
      },
      {
        category: 'view',
        description: 'Refresh',
        handler: () => utils.email.threads.list.invalidate(),
        key: 'r',
        shift: true,
      },

      // Compose
      {
        category: 'compose',
        description: 'Reply',
        handler: () => {
          if (focusedThread) {
            router.push(`/app/inbox/${focusedThread.id}?compose=reply`);
          }
        },
        key: 'r',
      },
    ],
    { enabled: !showShortcutsDialog },
  );

  // Key sequences (e.g., "g i" for go to inbox)
  useKeySequence(
    [
      {
        handler: () => {
          setFilterMode('all');
          setFocusedIndex(0);
        },
        keys: ['g', 'i'],
      },
      {
        handler: () => setFocusedIndex(0),
        keys: ['g', 'g'],
      },
    ],
    { enabled: !showShortcutsDialog },
  );

  // Scroll focused item into view
  useEffect(() => {
    const focusedElement = document.querySelector(
      `[data-thread-index="${focusedIndex}"]`,
    );
    focusedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedIndex]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton className="h-20 w-full" key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <InboxZeroProgress
            processed={processedCount}
            total={threads?.length ?? 0}
          />

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails... (/)"
                ref={searchInputRef}
                type="text"
                value={searchQuery}
              />
            </div>
            <Button
              className="hidden sm:flex"
              onClick={() => setShowShortcutsDialog(true)}
              size="icon"
              title="Keyboard shortcuts (?)"
              variant="ghost"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI Triage Summary */}
        {threads && threads.length > 0 && (
          <AITriageSummary
            className="mb-4"
            isLoading={createAction.isPending}
            onApproveCategory={handleApproveCategory}
            threads={threads}
          />
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            onClick={() => setFilterMode('all')}
            size="sm"
            variant={filterMode === 'all' ? 'secondary' : 'ghost'}
          >
            <Inbox className="h-4 w-4" />
            All
            <span className="text-xs text-muted-foreground">{counts.all}</span>
          </Button>
          <Button
            className="gap-2"
            onClick={() => setFilterMode('action_needed')}
            size="sm"
            variant={filterMode === 'action_needed' ? 'secondary' : 'ghost'}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Action Needed
            <span className="text-xs text-muted-foreground">
              {counts.actionNeeded}
            </span>
          </Button>
          <Button
            className="gap-2"
            onClick={() => setFilterMode('waiting')}
            size="sm"
            variant={filterMode === 'waiting' ? 'secondary' : 'ghost'}
          >
            <Clock className="h-4 w-4 text-yellow-600" />
            Waiting
            <span className="text-xs text-muted-foreground">
              {counts.waiting}
            </span>
          </Button>
          <div className="ml-auto">
            <Button onClick={selectAll} size="sm" variant="ghost">
              {selectedIds.size === filteredThreads.length &&
              filteredThreads.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            className="gap-1"
            onClick={handleArchive}
            size="sm"
            variant="outline"
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          <Button className="gap-1" size="sm" variant="outline">
            <Tag className="h-4 w-4" />
            Label
          </Button>
          <Button className="gap-1" size="sm" variant="outline">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      )}

      {/* Email list */}
      <div className="flex-1 overflow-auto">
        {filteredThreads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">You&apos;re all caught up!</h3>
              <p className="text-sm text-muted-foreground">
                {filterMode === 'all'
                  ? 'No emails in your inbox'
                  : `No emails in ${filterMode.replace('_', ' ')} category`}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Swipe hint */}
            <div className="flex items-center justify-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-4 rounded bg-emerald-500" />
                Swipe right to archive
              </span>
              <span className="flex items-center gap-1">
                Swipe left to snooze
                <span className="inline-block h-1 w-4 rounded bg-amber-500" />
              </span>
            </div>
            {filteredThreads.map((thread, index) => (
              <div data-thread-index={index} key={thread.id}>
                <SwipeableEmailRow
                  leftAction="snooze"
                  onSwipeLeft={() => handleSwipeSnooze(thread.id)}
                  onSwipeRight={() => handleSwipeArchive(thread.id)}
                  rightAction="archive"
                >
                  <EmailRow
                    isFocused={index === focusedIndex}
                    isSelected={selectedIds.has(thread.id)}
                    onFocus={() => setFocusedIndex(index)}
                    onOpen={() => router.push(`/app/inbox/${thread.id}`)}
                    onQuickApprove={() => handleQuickApprove(thread.id)}
                    onQuickArchive={() => handleQuickArchive(thread.id)}
                    onSelect={() => toggleSelect(thread.id)}
                    thread={thread}
                  />
                </SwipeableEmailRow>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts dialog */}
      <KeyboardShortcutsDialog
        onOpenChange={setShowShortcutsDialog}
        open={showShortcutsDialog}
      />
    </div>
  );
}
