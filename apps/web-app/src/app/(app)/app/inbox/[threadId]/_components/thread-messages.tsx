'use client';

import type { AppRouter } from '@seawatts/api';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@seawatts/ui/collapsible';
import { Text } from '@seawatts/ui/custom/typography';
import { cn } from '@seawatts/ui/lib/utils';
import type { inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { EmailRenderer } from './email-renderer';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Thread = NonNullable<RouterOutputs['email']['threads']['byId']>;
export type ThreadMessage = Thread['messages'][number];

interface ThreadMessagesProps {
  /** Account ID for CID image proxying */
  accountId?: string;
  /** Account email to identify sent messages */
  accountEmail: string;
  /** Messages to display */
  messages: ThreadMessage[];
}

interface MessageBubbleProps {
  accountId?: string;
  isFromCurrentUser: boolean;
  message: ThreadMessage;
  recipientName?: string;
}

function formatMessageDate(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  const diffInDays = Math.floor(
    (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays === 0) {
    return format(messageDate, 'HH:mm');
  }
  if (diffInDays < 7) {
    return format(messageDate, 'EEE HH:mm');
  }
  return format(messageDate, 'MMM d HH:mm');
}

function MessageBubble({
  accountId,
  isFromCurrentUser,
  message,
  recipientName,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const senderLabel = isFromCurrentUser
    ? 'Me'
    : (message.fromName ?? message.fromEmail.split('@')[0]);
  const recipientLabel =
    recipientName ?? message.toEmails?.[0]?.split('@')[0] ?? '';
  const dateLabel = formatMessageDate(new Date(message.internalDate));

  return (
    <div className="px-4">
      {/* Compact header: "Me to Kanishk · Thu 22:18" */}
      <Text className="mb-2 text-xs text-muted-foreground">
        {senderLabel}
        {recipientLabel && ` to ${recipientLabel}`}
        {' · '}
        {dateLabel}
      </Text>

      <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
        <div
          className={cn(
            'rounded-xl px-4 py-3 transition-colors',
            isFromCurrentUser
              ? 'bg-message-sent text-message-sent-foreground'
              : 'bg-message-received text-message-received-foreground',
          )}
        >
          {/* Collapsed preview */}
          {!isExpanded && (
            <CollapsibleTrigger asChild>
              <button className="w-full text-left" type="button">
                <div className="flex items-center gap-2">
                  <Text className="flex-1 truncate text-sm opacity-90">
                    {message.bodyPreview?.slice(0, 120)}
                  </Text>
                  <ChevronDown className="size-4 shrink-0 opacity-60" />
                </div>
              </button>
            </CollapsibleTrigger>
          )}

          {/* Expanded content */}
          <CollapsibleContent>
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer">
                <EmailRenderer
                  accountId={accountId}
                  fallbackText={message.bodyPreview}
                  maxHeight={600}
                  messageId={message.id}
                />
              </div>
            </CollapsibleTrigger>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

export function ThreadMessages({
  accountId,
  accountEmail,
  messages,
}: ThreadMessagesProps) {
  // Sort messages by date (oldest first)
  const sortedMessages = [...messages].sort(
    (a, b) =>
      new Date(a.internalDate).getTime() - new Date(b.internalDate).getTime(),
  );

  // Get the first recipient for context
  const firstRecipient = sortedMessages[0]?.toEmails?.[0];
  const recipientName = firstRecipient?.split('@')[0];

  return (
    <div className="grid gap-6 py-4">
      {sortedMessages.map((message) => {
        const isFromCurrentUser = message.fromEmail === accountEmail;
        return (
          <MessageBubble
            accountId={accountId}
            isFromCurrentUser={isFromCurrentUser}
            key={message.id}
            message={message}
            recipientName={isFromCurrentUser ? recipientName : undefined}
          />
        );
      })}
    </div>
  );
}
