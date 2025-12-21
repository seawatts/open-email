'use client';

import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { Textarea } from '@seawatts/ui/textarea';
import { cn } from '@seawatts/ui/lib/utils';
import { Send, Sparkles } from 'lucide-react';
import { forwardRef } from 'react';

import type { ThreadDecision } from './types';

interface ReplyComposerProps {
  editedBody: string;
  streamingDraft: string;
  selectedDraftId: string | null;
  decision: ThreadDecision | null;
  isProcessing: boolean;
  isSending: boolean;
  onBodyChange: (value: string) => void;
  onSelectDraft: (draftId: string, body: string) => void;
  onSendReply: () => void;
  onClear: () => void;
  onGenerateDraft: () => void;
}

export const ReplyComposer = forwardRef<HTMLTextAreaElement, ReplyComposerProps>(
  function ReplyComposer(
    {
      editedBody,
      streamingDraft,
      selectedDraftId,
      decision,
      isProcessing,
      isSending,
      onBodyChange,
      onSelectDraft,
      onSendReply,
      onClear,
      onGenerateDraft,
    },
    ref,
  ) {
    const hasDraftReplies =
      decision?.draftReplies && decision.draftReplies.length > 0;
    const hasContent = editedBody || streamingDraft;

    return (
      <div className="grid gap-4">
        {/* Draft Replies */}
        {hasDraftReplies && decision?.draftReplies && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="grid grid-cols-[auto_1fr] items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" />
                Suggested Replies
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {decision.draftReplies.map((draft) => (
                <button
                  className={cn(
                    'w-full rounded-md border p-3 text-left text-sm transition-colors',
                    selectedDraftId === draft.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  )}
                  key={draft.id}
                  onClick={() => onSelectDraft(draft.id, draft.body)}
                  type="button"
                >
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {draft.tone}
                  </p>
                  <p className="line-clamp-3">{draft.body}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Compose Reply */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="grid grid-cols-[auto_1fr] items-center gap-2 text-base">
              Compose Reply
              {selectedDraftId && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  AI Draft
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              className="min-h-[120px]"
              disabled={isProcessing}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder={
                isProcessing
                  ? 'AI is drafting a reply...'
                  : 'Write your reply... (⌘+Enter to send)'
              }
              ref={ref}
              value={editedBody || streamingDraft}
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button
                disabled={isSending || !hasContent || isProcessing}
                onClick={onSendReply}
              >
                <Send className="mr-1 size-4" />
                {isSending ? 'Sending...' : 'Send Reply'}
              </Button>
              {hasContent && (
                <Button disabled={isProcessing} onClick={onClear} variant="outline">
                  Clear
                </Button>
              )}
            </div>
            {!hasContent && (
              <Button
                className="w-full"
                disabled={isProcessing}
                onClick={onGenerateDraft}
                variant="ghost"
              >
                <Sparkles className="mr-1 size-4" />
                Generate AI Draft
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
);

