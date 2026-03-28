'use client';

import { useTRPC } from '@seawatts/api/react';
import { Button } from '@seawatts/ui/button';
import { Input } from '@seawatts/ui/input';
import { Skeleton } from '@seawatts/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Undo2,
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

import { EmailRow } from './email-row';
import { InboxZeroProgress } from './inbox-zero-progress';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import { SwipeableEmailRow } from './swipeable-email-row';
import { useKeyboardShortcuts, useKeySequence } from './use-keyboard-shortcuts';

type FilterMode = 'all' | 'action_needed' | 'waiting' | 'done';

interface EmailListProps {
  accountId: string;
}

export function EmailList({ accountId }: EmailListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<FilterMode>('action_needed');
  const [searchQuery, setSearchQuery] = useState('');
  // Track optimistically removed threads for instant UI feedback
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<
    Set<string>
  >(new Set());
  const [, startTransition] = useTransition();

  // Keyboard shortcuts state
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [undoStack, setUndoStack] = useState<
    Array<{ threadId: string; action: string; timestamp: number }>
  >([]);
  const [undoToast, setUndoToast] = useState<{
    action: string;
    threadId: string;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: threads, isLoading } = useQuery(
    trpc.email.threads.list.queryOptions({
      accountId,
      limit: 50,
    }),
  );

  const invalidateThreadList = useCallback(() => {
    queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
  }, [queryClient, trpc]);

  // Filter threads (excluding optimistically removed ones)
  const filteredThreads = useMemo(() => {
    if (!threads) return [];

    // First, exclude optimistically removed threads
    let filtered = threads.filter((t) => !optimisticallyRemovedIds.has(t.id));

    // Apply filter mode based on aiAction (suggestedActionEnum)
    switch (filterMode) {
      case 'action_needed':
        filtered = filtered.filter((t) => t.aiAction === 'reply');
        break;
      case 'waiting':
        filtered = filtered.filter((t) => t.aiAction === 'snooze');
        break;
      case 'done':
        filtered = filtered.filter((t) => t.aiAction === 'archive');
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
    setOptimisticallyRemovedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.add(id);
      }
      return next;
    });
    setProcessedCount((c) => c + selectedIds.size);
    setSelectedIds(new Set());
    // TODO: Call Gmail action endpoints when available
    startTransition(() => {
      invalidateThreadList();
    });
  }, [selectedIds, invalidateThreadList]);

  const handleQuickArchive = useCallback(
    (threadId: string) => {
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);
      invalidateThreadList();
    },
    [invalidateThreadList],
  );

  const handleQuickApprove = useCallback(
    (threadId: string) => {
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);
      invalidateThreadList();
    },
    [invalidateThreadList],
  );

  // Counts exclude optimistically removed threads
  const counts = useMemo(() => {
    if (!threads) return { actionNeeded: 0, all: 0, done: 0, waiting: 0 };

    const visibleThreads = threads.filter(
      (t) => !optimisticallyRemovedIds.has(t.id),
    );

    return {
      actionNeeded: visibleThreads.filter((t) => t.aiAction === 'reply')
        .length,
      all: visibleThreads.length,
      done: visibleThreads.filter((t) => t.aiAction === 'archive').length,
      waiting: visibleThreads.filter((t) => t.aiAction === 'snooze').length,
    };
  }, [threads, optimisticallyRemovedIds]);

  const [processedCount, setProcessedCount] = useState(0);

  const handleSwipeArchive = useCallback(
    (threadId: string) => {
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);
      invalidateThreadList();
    },
    [invalidateThreadList],
  );

  const handleSwipeSnooze = useCallback(
    (threadId: string) => {
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);
      invalidateThreadList();
    },
    [invalidateThreadList],
  );

  // Get the focused thread
  const focusedThread = filteredThreads[focusedIndex];

  // Auto-advance: clamp focus after removing a thread
  const autoAdvance = useCallback(
    (removedIndex: number) => {
      setFocusedIndex((current) => {
        if (current > removedIndex) return current - 1;
        if (current === removedIndex && current >= filteredThreads.length - 1) {
          return Math.max(0, filteredThreads.length - 2);
        }
        return current;
      });
    },
    [filteredThreads.length],
  );

  // Shared helper: optimistically remove + push undo + show undo toast
  const removeWithUndo = useCallback(
    (threadId: string, action: string) => {
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));
      setProcessedCount((c) => c + 1);
      setUndoStack((prev) => [
        ...prev,
        { action, threadId, timestamp: Date.now() },
      ]);
      setUndoToast({ action, threadId });

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 5000);

      const idx = filteredThreads.findIndex((t) => t.id === threadId);
      if (idx >= 0) autoAdvance(idx);
      invalidateThreadList();
    },
    [filteredThreads, autoAdvance, invalidateThreadList],
  );

  // Quick reply mutation
  const quickReplyMutation = useMutation(
    trpc.email.threads.quickReply.mutationOptions({
      onSettled: () => invalidateThreadList(),
    }),
  );

  const handleQuickReply = useCallback(
    (threadId: string, replyBody: string) => {
      const thread = filteredThreads.find((t) => t.id === threadId);
      if (!thread) return;

      removeWithUndo(threadId, 'quick_reply');
      quickReplyMutation.mutate({
        accountId,
        gmailThreadId: thread.gmailThreadId,
        replyText: replyBody,
        subject: thread.subject,
        threadId,
        to: thread.participantEmails,
      });
    },
    [filteredThreads, removeWithUndo, quickReplyMutation, accountId],
  );

  // Keyboard action handlers
  const handleKeyboardArchive = useCallback(() => {
    if (selectedIds.size > 0) {
      handleArchive();
    } else if (focusedThread) {
      removeWithUndo(focusedThread.id, 'archive');
    }
  }, [selectedIds, focusedThread, handleArchive, removeWithUndo]);

  const handleKeyboardSnooze = useCallback(() => {
    if (focusedThread) {
      removeWithUndo(focusedThread.id, 'snooze');
    }
  }, [focusedThread, removeWithUndo]);

  const handleKeyboardDelete = useCallback(() => {
    if (focusedThread) {
      removeWithUndo(focusedThread.id, 'delete');
    }
  }, [focusedThread, removeWithUndo]);

  // Tab: execute AI suggestion on focused thread
  const handleExecuteAISuggestion = useCallback(() => {
    if (!focusedThread) return;
    const action = focusedThread.aiAction;
    if (!action) return;

    switch (action) {
      case 'archive':
        removeWithUndo(focusedThread.id, action);
        break;
      case 'reply': {
        const firstReply = focusedThread.aiQuickReplies?.[0];
        if (firstReply) {
          handleQuickReply(focusedThread.id, firstReply.body);
        } else {
          router.push(`/app/inbox/${focusedThread.id}?compose=reply`);
        }
        break;
      }
      case 'snooze':
        removeWithUndo(focusedThread.id, 'snooze');
        break;
    }
  }, [focusedThread, removeWithUndo, handleQuickReply, router]);

  // 1/2/3: send Nth quick reply on focused thread
  const handleQuickReplyByIndex = useCallback(
    (index: number) => {
      if (!focusedThread) return;
      const replies = focusedThread.aiQuickReplies;
      const reply = replies?.[index];
      if (reply) {
        handleQuickReply(focusedThread.id, reply.body);
      }
    },
    [focusedThread, handleQuickReply],
  );

  const starMutation = useMutation(
    trpc.email.threads.star.mutationOptions({
      onSettled: () => {
        invalidateThreadList();
      },
    }),
  );

  const handleKeyboardStar = useCallback(() => {
    if (focusedThread) {
      starMutation.mutate({
        starred: !focusedThread.isStarred,
        threadId: focusedThread.id,
      });
    }
  }, [focusedThread, starMutation]);

  const handleKeyboardSelect = useCallback(() => {
    if (focusedThread) {
      toggleSelect(focusedThread.id);
    }
  }, [focusedThread, toggleSelect]);

  const handleUndo = useCallback(() => {
    const now = Date.now();
    // Only allow undo within 5s window
    const validEntry = [...undoStack]
      .reverse()
      .find((entry) => now - entry.timestamp < 5000);
    if (!validEntry) return;

    setOptimisticallyRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(validEntry.threadId);
      return next;
    });
    setUndoStack((prev) => prev.filter((e) => e !== validEntry));
    setUndoToast(null);
    setProcessedCount((c) => Math.max(0, c - 1));
  }, [undoStack]);

  // Prefetch next 3 threads' data on j/k movement
  const prefetchNearbyThreads = useCallback(
    (newIndex: number) => {
      for (let i = 1; i <= 3; i++) {
        const thread = filteredThreads[newIndex + i];
        if (thread) {
          queryClient.prefetchQuery(
            trpc.email.threads.byId.queryOptions({ id: thread.id }),
          );
        }
      }
    },
    [filteredThreads, queryClient, trpc],
  );

  // Clear undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Navigation keyboard shortcuts
  useKeyboardShortcuts(
    [
      // Navigation
      {
        category: 'navigation',
        description: 'Move down',
        handler: () => {
          setFocusedIndex((i) => {
            const next = Math.min(i + 1, filteredThreads.length - 1);
            prefetchNearbyThreads(next);
            return next;
          });
        },
        key: 'j',
      },
      {
        category: 'navigation',
        description: 'Move up',
        handler: () => {
          setFocusedIndex((i) => {
            const next = Math.max(i - 1, 0);
            prefetchNearbyThreads(next);
            return next;
          });
        },
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
      {
        category: 'actions',
        description: 'Execute AI suggestion',
        handler: handleExecuteAISuggestion,
        key: 'Tab',
      },
      {
        category: 'actions',
        description: 'Quick reply #1',
        handler: () => handleQuickReplyByIndex(0),
        key: '1',
      },
      {
        category: 'actions',
        description: 'Quick reply #2',
        handler: () => handleQuickReplyByIndex(1),
        key: '2',
      },
      {
        category: 'actions',
        description: 'Quick reply #3',
        handler: () => handleQuickReplyByIndex(2),
        key: '3',
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
        handler: () =>
          queryClient.invalidateQueries(trpc.email.threads.list.queryFilter()),
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

      {/* Progress indicator */}
      {filteredThreads.length > 0 && (
        <div className="flex items-center justify-center gap-2 border-b border-border bg-muted/20 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium">{filteredThreads.length}</span>
          <span>emails to go</span>
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
                    onAction={(action) => removeWithUndo(thread.id, action)}
                    onFocus={() => setFocusedIndex(index)}
                    onOpen={() => router.push(`/app/inbox/${thread.id}`)}
                    onQuickApprove={() => handleQuickApprove(thread.id)}
                    onQuickArchive={() => handleQuickArchive(thread.id)}
                    onQuickReply={(body) =>
                      handleQuickReply(thread.id, body)
                    }
                    onSelect={() => toggleSelect(thread.id)}
                    thread={thread}
                  />
                </SwipeableEmailRow>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
          <Undo2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {undoToast.action === 'quick_reply' ? 'Reply sent' : `Email ${undoToast.action}d`}
          </span>
          <Button onClick={handleUndo} size="sm" variant="outline">
            Undo
          </Button>
        </div>
      )}

      {/* Keyboard shortcuts dialog */}
      <KeyboardShortcutsDialog
        onOpenChange={setShowShortcutsDialog}
        open={showShortcutsDialog}
      />
    </div>
  );
}
