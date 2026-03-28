'use client';

import { Button } from '@seawatts/ui/button';
import { Text } from '@seawatts/ui/custom/typography';
import { cn } from '@seawatts/ui/lib/utils';
import { Textarea } from '@seawatts/ui/textarea';
import { format } from 'date-fns';
import { Send, Sparkles, X } from 'lucide-react';
import { forwardRef } from 'react';

interface ReplyComposerProps {
  editedBody: string;
  streamingDraft: string;
  selectedDraftId: string | null;
  isProcessing: boolean;
  isSending: boolean;
  onBodyChange: (value: string) => void;
  onSelectDraft: (draftId: string, body: string) => void;
  onSendReply: () => void;
  onClear: () => void;
  onGenerateDraft?: () => void;
  recipientName?: string;
}

export const ReplyComposer = forwardRef<
  HTMLTextAreaElement,
  ReplyComposerProps
>(function ReplyComposer(
  {
    editedBody,
    streamingDraft,
    selectedDraftId,
    isProcessing,
    isSending,
    onBodyChange,
    onSelectDraft,
    onSendReply,
    onClear,
    onGenerateDraft,
    recipientName,
  },
  ref,
) {
  const hasContent = editedBody || streamingDraft;
  const isAutoDraft = Boolean(selectedDraftId || streamingDraft);
  const dateLabel = format(new Date(), 'HH:mm');

  return (
    <div className="grid gap-4 px-4 pb-20">
      {/* Auto Draft / Compose Area */}
      {(hasContent || isProcessing) && (
        <div className="grid gap-2">
          {isAutoDraft && (
            <Text className="text-xs text-message-draft">
              Auto Draft to {recipientName ?? 'recipient'} · {dateLabel}
            </Text>
          )}

          <div
            className={cn(
              'rounded-xl border-2 p-4 transition-colors',
              isAutoDraft
                ? 'border-message-draft bg-message-draft/5'
                : 'border-border bg-card',
            )}
          >
            <Textarea
              className={cn(
                'min-h-[100px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0',
                isAutoDraft && 'text-foreground/90',
              )}
              disabled={isProcessing}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder={
                isProcessing
                  ? 'AI is drafting a reply...'
                  : 'Write your reply...'
              }
              ref={ref}
              value={editedBody || streamingDraft}
            />

            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
              <div className="flex items-center gap-2">
                {hasContent && (
                  <Button
                    className="size-8"
                    disabled={isProcessing}
                    onClick={onClear}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <Button
                className="gap-2"
                disabled={isSending || !hasContent || isProcessing}
                onClick={onSendReply}
                size="sm"
              >
                <Send className="size-4" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate AI Draft button when empty */}
      {!hasContent && !isProcessing && onGenerateDraft && (
        <Button
          className="w-full gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-transparent py-6 text-muted-foreground hover:border-message-draft hover:bg-message-draft/5 hover:text-message-draft"
          onClick={onGenerateDraft}
          variant="ghost"
        >
          <Sparkles className="size-4" />
          Generate AI Draft
        </Button>
      )}
    </div>
  );
});
