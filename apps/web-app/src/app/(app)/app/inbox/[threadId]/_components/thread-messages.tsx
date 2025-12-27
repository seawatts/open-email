import { cn } from '@seawatts/ui/lib/utils';
import { format } from 'date-fns';

import type { ThreadMessage } from './types';

interface ThreadMessagesProps {
  messages: ThreadMessage[];
  accountEmail: string;
}

function MessageItem({
  message,
  isFromCurrentUser,
}: {
  message: ThreadMessage;
  isFromCurrentUser: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        isFromCurrentUser && 'ml-8 border-primary/30',
      )}
    >
      <div className="mb-2 grid grid-cols-[1fr] items-start gap-2">
        <div>
          <p className="font-medium">{message.fromName ?? message.fromEmail}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(message.internalDate), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm">
        {message.bodyPreview ?? message.snippet}
      </p>
    </div>
  );
}

export function ThreadMessages({
  messages,
  accountEmail,
}: ThreadMessagesProps) {
  return (
    <div className="grid gap-4">
      {messages.map((message) => (
        <MessageItem
          isFromCurrentUser={message.fromEmail === accountEmail}
          key={message.id}
          message={message}
        />
      ))}
    </div>
  );
}
