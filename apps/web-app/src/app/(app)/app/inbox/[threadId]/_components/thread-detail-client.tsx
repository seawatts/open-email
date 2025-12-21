'use client';

import { api } from '@seawatts/api/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { KeyboardShortcutsDialog } from '../../_components/keyboard-shortcuts-dialog';
import { useKeyboardShortcuts } from '../../_components/use-keyboard-shortcuts';
import {
  useAgentProcessing,
  useReplyComposer,
  useThreadActions,
} from '../_hooks';
import { AgentPanel } from './agent-panel';
import { ThreadHeader } from './thread-header';
import { ThreadMessages } from './thread-messages';
import { ThreadNotFound } from './thread-not-found';
import type { FormattedHighlight, Thread } from './types';

interface ThreadDetailClientProps {
  threadId: string;
}

function formatHighlights(
  highlights:
    | { id: string; highlightType: string; data: unknown }[]
    | undefined,
): FormattedHighlight[] | undefined {
  if (!highlights) return undefined;

  return highlights.map((h) => ({
    actionLabel: (h.data as Record<string, unknown>)?.actionLabel as
      | string
      | undefined,
    actionUrl: (h.data as Record<string, unknown>)?.actionUrl as
      | string
      | undefined,
    data: h.data as { type: string; [key: string]: unknown },
    id: h.id,
    subtitle: (h.data as Record<string, unknown>)?.subtitle as
      | string
      | undefined,
    title:
      ((h.data as Record<string, unknown>)?.title as string) ?? h.highlightType,
  }));
}

export function ThreadDetailClient({ threadId }: ThreadDetailClientProps) {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState('agent');
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  // Fetch thread data
  const { data: thread } = api.email.threads.byId.useQuery({ id: threadId });
  const { data: highlights } = api.email.highlights.byThread.useQuery({
    threadId,
  });

  // Custom hooks for actions and processing
  const threadActions = useThreadActions({ threadId });

  const replyComposer = useReplyComposer({
    lastMessageFromEmail: thread?.messages.at(-1)?.fromEmail ?? '',
    threadId,
    threadSubject: thread?.subject ?? '',
  });

  const agentProcessing = useAgentProcessing({
    onDraftComplete: replyComposer.setDraftFromAgent,
    threadId,
  });

  // Compute derived data
  const latestDecision = thread?.decisions[0] ?? null;
  const pendingActions = (thread?.actions ?? []).filter(
    (a) =>
      a.status === 'pending' &&
      !threadActions.optimisticallyApprovedIds.has(a.id),
  );
  const formattedHighlights = formatHighlights(highlights);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      // Navigation
      {
        category: 'navigation',
        description: 'Go back to inbox',
        handler: () => router.push('/app/inbox'),
        key: 'Escape',
      },
      {
        category: 'navigation',
        description: 'Go to inbox',
        handler: () => router.push('/app/inbox'),
        key: 'u',
      },

      // Actions
      {
        category: 'actions',
        description: 'Archive',
        handler: () => threadActions.handleArchiveAndNavigate(),
        key: 'e',
      },
      {
        category: 'actions',
        description: 'Delete',
        handler: () => threadActions.handleDeleteAndNavigate(),
        key: '#',
        shift: true,
      },
      {
        category: 'actions',
        description: 'Snooze',
        handler: () => threadActions.handleSnoozeAndNavigate(),
        key: 'h',
      },
      {
        category: 'actions',
        description: 'Star',
        handler: () => threadActions.handleStar(),
        key: 's',
      },
      {
        category: 'actions',
        description: 'Mark as done',
        handler: () => threadActions.handleArchiveAndNavigate(),
        key: 'd',
      },

      // Compose
      {
        category: 'compose',
        description: 'Reply',
        handler: () => setActiveTab('reply'),
        key: 'r',
      },
      {
        category: 'compose',
        description: 'Send reply',
        handler: () => {
          if (replyComposer.editedBody) {
            replyComposer.handleSendReply();
          }
        },
        key: 'Enter',
        meta: true,
      },

      // View
      {
        category: 'view',
        description: 'Show shortcuts',
        handler: () => setShowShortcutsDialog(true),
        key: '?',
        shift: true,
      },
      {
        category: 'view',
        description: 'Toggle AI panel',
        handler: () => setActiveTab((t) => (t === 'agent' ? 'reply' : 'agent')),
        key: 'Tab',
      },
      {
        category: 'view',
        description: 'Refresh / Re-analyze',
        handler: agentProcessing.handleRetriage,
        key: 'r',
        shift: true,
      },

      // AI Actions
      {
        category: 'actions',
        description: 'Smart process (AI)',
        handler: agentProcessing.handleSmartProcess,
        key: 'p',
      },
    ],
    { enabled: !showShortcutsDialog && !agentProcessing.isProcessing },
  );

  if (!thread) {
    return <ThreadNotFound />;
  }

  const handleClearDraft = () => {
    replyComposer.clearDraft();
    agentProcessing.resetDraft();
  };

  return (
    <div className="grid">
      <ThreadHeader
        participantEmails={thread.participantEmails}
        subject={thread.subject}
      />

      <div className="grid gap-6 p-4 lg:grid-cols-[1fr_auto]">
        <ThreadMessages
          accountEmail={thread.accountEmail}
          messages={thread.messages}
        />

        <AgentPanel
          // Agent state
          agentEvents={agentProcessing.agentEvents}
          isProcessing={agentProcessing.isProcessing}
          isRetriaging={agentProcessing.isRetriaging}
          streamingDraft={agentProcessing.streamingDraft}
          thinkingContent={agentProcessing.thinkingContent}
          // Thread data
          decision={latestDecision}
          highlights={formattedHighlights}
          pendingActions={pendingActions}
          // Reply state
          editedBody={replyComposer.editedBody}
          isSending={replyComposer.isSending}
          selectedDraftId={replyComposer.selectedDraftId}
          // Tab state
          activeTab={activeTab}
          onTabChange={setActiveTab}
          // Agent actions
          onRetriage={agentProcessing.handleRetriage}
          onSmartProcess={agentProcessing.handleSmartProcess}
          // Thread actions
          onApproveAction={threadActions.handleApproveAction}
          onArchive={threadActions.handleArchive}
          onSnooze={threadActions.handleSnooze}
          onStar={threadActions.handleStar}
          // Reply actions
          onBodyChange={replyComposer.setEditedBody}
          onClearDraft={handleClearDraft}
          onSelectDraft={replyComposer.selectDraft}
          onSendReply={replyComposer.handleSendReply}
        />
      </div>

      <KeyboardShortcutsDialog
        onOpenChange={setShowShortcutsDialog}
        open={showShortcutsDialog}
      />
    </div>
  );
}

