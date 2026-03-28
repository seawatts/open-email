'use client';

import { useTRPC } from '@seawatts/api/react';
import { Badge } from '@seawatts/ui/badge';
import { cn } from '@seawatts/ui/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@seawatts/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AI_ACTION_BADGE_CONFIG } from '../../_lib/ai-action-config';
import { KeyboardShortcutsDialog } from '../../_components/keyboard-shortcuts-dialog';
import { useKeyboardShortcuts } from '../../_components/use-keyboard-shortcuts';
import { useReplyComposer, useThreadActions } from '../_hooks';
import { AgentPanel } from './agent-panel';
import { BottomActionBar } from './bottom-action-bar';
import { ReplyComposer } from './reply-composer';
import { ThreadHeader } from './thread-header';
import { ThreadMessages } from './thread-messages';
import { ThreadNotFound } from './thread-not-found';

interface ThreadDetailClientProps {
  threadId: string;
}

export function ThreadDetailClient({ threadId }: ThreadDetailClientProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeTab, setActiveTab] = useState('agent');
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showReplySheet, setShowReplySheet] = useState(false);

  const { data: thread } = useQuery(
    trpc.email.threads.byId.queryOptions({ id: threadId }),
  );

  const threadActions = useThreadActions({ threadId });

  const replyComposer = useReplyComposer({
    accountId: thread?.accountId ?? '',
    gmailThreadId: thread?.gmailThreadId ?? '',
    lastMessageFromEmail: thread?.messages.at(-1)?.fromEmail ?? '',
    threadId,
    threadSubject: thread?.subject ?? '',
  });

  // Pre-fill reply composer with first AI quick reply (once)
  const didPrefillRef = useRef(false);
  useEffect(() => {
    if (
      !didPrefillRef.current &&
      thread?.aiQuickReplies?.[0]?.body &&
      !replyComposer.editedBody
    ) {
      didPrefillRef.current = true;
      replyComposer.setEditedBody(thread.aiQuickReplies[0].body);
    }
  }, [thread?.aiQuickReplies, replyComposer]);

  const handleQuickReplyChip = (body: string) => {
    replyComposer.setEditedBody(body);
    setShowReplySheet(true);
    setTimeout(() => replyTextareaRef.current?.focus(), 100);
  };

  const firstMessage = thread?.messages[0];
  const senderEmail = firstMessage?.fromEmail;
  const senderName = firstMessage?.fromName ?? undefined;
  const recipientName = firstMessage?.toEmails?.[0]?.split('@')[0];

  useKeyboardShortcuts(
    [
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
      {
        category: 'compose',
        description: 'Reply',
        handler: () => {
          setShowReplySheet(true);
          setTimeout(() => replyTextareaRef.current?.focus(), 100);
        },
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
      {
        category: 'view',
        description: 'Show shortcuts',
        handler: () => setShowShortcutsDialog(true),
        key: '?',
        shift: true,
      },
      {
        category: 'actions',
        description: 'Accept AI suggestion',
        handler: () => {
          const action = thread?.aiAction;
          if (!action) return;
          switch (action) {
            case 'archive':
              threadActions.handleArchiveAndNavigate();
              break;
            case 'snooze':
              threadActions.handleSnoozeAndNavigate();
              break;
            case 'reply': {
              const firstReply = thread?.aiQuickReplies?.[0];
              if (firstReply) {
                replyComposer.setEditedBody(firstReply.body);
                setShowReplySheet(true);
                setTimeout(() => replyTextareaRef.current?.focus(), 100);
              } else {
                setShowReplySheet(true);
                setTimeout(() => replyTextareaRef.current?.focus(), 100);
              }
              break;
            }
          }
        },
        key: 'Tab',
      },
    ],
    { enabled: !showShortcutsDialog },
  );

  if (!thread) {
    return <ThreadNotFound />;
  }

  const handleClearDraft = () => {
    replyComposer.clearDraft();
  };

  const handleReply = () => {
    setShowReplySheet(true);
    setTimeout(() => replyTextareaRef.current?.focus(), 100);
  };

  const handleReplyAll = () => {
    setShowReplySheet(true);
    setTimeout(() => replyTextareaRef.current?.focus(), 100);
  };

  const agentPanelProps = {
    activeTab,
    aiAction: thread.aiAction,
    aiConfidence: thread.aiConfidence,
    aiQuickReplies: thread.aiQuickReplies,
    aiSummary: thread.aiSummary,
    editedBody: replyComposer.editedBody,
    isProcessing: false,
    isRetriaging: false,
    isSending: replyComposer.isSending,
    onArchive: threadActions.handleArchive,
    onBodyChange: replyComposer.setEditedBody,
    onClearDraft: handleClearDraft,
    onQuickReply: handleQuickReplyChip,
    onRetriage: () => {},
    onSendReply: replyComposer.handleSendReply,
    onSmartProcess: () => {},
    onSnooze: threadActions.handleSnooze,
    onStar: threadActions.handleStar,
    onTabChange: setActiveTab,
    selectedDraftId: replyComposer.selectedDraftId,
    streamingDraft: '',
  };

  const aiActionBadgeConfig =
    thread.aiAction != null
      ? AI_ACTION_BADGE_CONFIG[thread.aiAction]
      : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <ThreadHeader
        participantEmails={thread.participantEmails}
        senderEmail={senderEmail}
        senderName={senderName}
        subject={thread.subject}
      />

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Triage summary + action badge */}
        {(thread.aiSummary || thread.aiAction) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2">
            {aiActionBadgeConfig && (
              <Badge
                className={cn(
                  'text-xs px-2 py-0.5 font-medium',
                  aiActionBadgeConfig.className,
                )}
                variant="secondary"
              >
                AI: {aiActionBadgeConfig.label}
              </Badge>
            )}
            {thread.aiSummary && (
              <span className="text-sm text-muted-foreground">
                {thread.aiSummary}
              </span>
            )}
          </div>
        )}

        {/* Quick reply chips above composer */}
        {thread.aiQuickReplies && thread.aiQuickReplies.length > 0 && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <span className="text-xs text-muted-foreground">Quick replies:</span>
            {thread.aiQuickReplies.map((reply) => (
              <button
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                key={reply.label}
                onClick={() => handleQuickReplyChip(reply.body)}
                type="button"
              >
                {reply.label}
              </button>
            ))}
          </div>
        )}

        <ThreadMessages
          accountEmail={thread.accountEmail}
          accountId={thread.accountId}
          messages={thread.messages}
        />

        {replyComposer.editedBody && (
          <div className="mt-4 border-t border-border pt-4">
            <ReplyComposer
              editedBody={replyComposer.editedBody}
              isProcessing={false}
              isSending={replyComposer.isSending}
              onBodyChange={replyComposer.setEditedBody}
              onClear={handleClearDraft}
              onSendReply={replyComposer.handleSendReply}
              recipientName={recipientName}
              ref={replyTextareaRef}
              selectedDraftId={replyComposer.selectedDraftId}
              streamingDraft=""
            />
          </div>
        )}
      </div>

      {/* Desktop: Side panel for AI agent */}
      <div className="fixed right-0 top-0 hidden h-screen w-80 border-l border-border bg-background lg:block">
        <AgentPanel {...agentPanelProps} />
      </div>

      {/* Mobile: Bottom action bar */}
      <BottomActionBar
        isStarred={thread.isStarred}
        onDone={threadActions.handleArchiveAndNavigate}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onSnooze={threadActions.handleSnoozeAndNavigate}
        onStar={threadActions.handleStar}
      />

      {/* Mobile: Reply sheet */}
      <Sheet onOpenChange={setShowReplySheet} open={showReplySheet}>
        <SheetTrigger asChild>
          <button className="sr-only" type="button">
            Open reply
          </button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg" side="bottom">
          <div className="py-4">
            <ReplyComposer
              editedBody={replyComposer.editedBody}
              isProcessing={false}
              isSending={replyComposer.isSending}
              onBodyChange={replyComposer.setEditedBody}
              onClear={handleClearDraft}
              onSendReply={() => {
                replyComposer.handleSendReply();
                setShowReplySheet(false);
              }}
              recipientName={recipientName}
              ref={replyTextareaRef}
              selectedDraftId={replyComposer.selectedDraftId}
              streamingDraft=""
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile: AI panel button */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-20 right-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
            type="button"
          >
            <Sparkles className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent
          className="w-full overflow-y-auto sm:max-w-md"
          side="right"
        >
          <AgentPanel {...agentPanelProps} />
        </SheetContent>
      </Sheet>

      <KeyboardShortcutsDialog
        onOpenChange={setShowShortcutsDialog}
        open={showShortcutsDialog}
      />
    </div>
  );
}
