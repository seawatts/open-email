'use client';

import { useTRPC } from '@seawatts/api/react';
import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import { Checkbox } from '@seawatts/ui/checkbox';
import { cn } from '@seawatts/ui/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@seawatts/ui/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import type { QuickReplyOption } from '@seawatts/db/schema';
import { Archive, CheckCircle, Star, StarOff } from 'lucide-react';

import { AI_ACTION_BADGE_CONFIG } from '../_lib/ai-action-config';

interface ThreadData {
  aiAction?: string | null;
  aiConfidence?: number | null;
  aiQuickReplies?: QuickReplyOption[] | null;
  aiSummary?: string | null;
  id: string;
  isRead: boolean;
  isStarred?: boolean;
  labels: string[];
  lastMessageAt: Date;
  latestMessage?: {
    fromEmail: string;
    fromName: string | null;
  } | null;
  messageCount: number;
  participantEmails: string[];
  subject: string;
}

interface EmailRowProps {
  isFocused: boolean;
  isSelected: boolean;
  onAction?: (action: string) => void;
  onFocus: () => void;
  onOpen: () => void;
  onQuickApprove: () => void;
  onQuickArchive: () => void;
  onQuickReply?: (replyBody: string) => void;
  onSelect: () => void;
  thread: ThreadData;
}

export function EmailRow({
  isFocused,
  isSelected,
  onAction,
  onFocus,
  onOpen,
  onQuickApprove,
  onQuickArchive,
  onQuickReply,
  onSelect,
  thread,
}: EmailRowProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const starMutation = useMutation(
    trpc.email.threads.star.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
      },
    }),
  );

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    starMutation.mutate({
      starred: !thread.isStarred,
      threadId: thread.id,
    });
  };

  const aiActionBadgeConfig =
    thread.aiAction != null
      ? AI_ACTION_BADGE_CONFIG[thread.aiAction]
      : undefined;

  return (
    <div
      className={cn(
        'group flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors cursor-pointer',
        isSelected && 'bg-primary/5',
        isFocused && 'ring-2 ring-inset ring-primary/50',
        !thread.isRead && 'bg-muted/30',
        thread.isStarred && 'border-l-2 border-l-amber-400',
        'hover:bg-muted/50',
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={onFocus}
      role="button"
      tabIndex={0}
    >
      {/* Checkbox */}
      <span
        className="shrink-0 pt-1"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
          }
        }}
      >
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect()} />
      </span>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {/* Starred indicator */}
          {thread.isStarred && (
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          )}

          {/* Sender */}
          <span
            className={cn(
              'truncate text-sm',
              !thread.isRead && 'font-semibold',
            )}
          >
            {thread.latestMessage?.fromName ??
              thread.latestMessage?.fromEmail ??
              thread.participantEmails[0] ??
              'Unknown'}
          </span>

          {/* AI action badge */}
          {aiActionBadgeConfig && (
            <Badge
              className={cn(
                'text-xs px-2 py-0.5 font-medium',
                aiActionBadgeConfig.className,
              )}
              variant="secondary"
            >
              {aiActionBadgeConfig.label}
            </Badge>
          )}

          {/* Timestamp */}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(thread.lastMessageAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Subject */}
        <p className={cn('truncate text-sm', !thread.isRead && 'font-medium')}>
          {thread.subject}
        </p>

        {/* AI Summary */}
        {thread.aiSummary && (
          <p className="truncate text-xs text-muted-foreground">
            {thread.aiSummary}
          </p>
        )}

        {/* Quick reply chips */}
        {thread.aiQuickReplies && thread.aiQuickReplies.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            {thread.aiQuickReplies.map((reply) => (
              <button
                className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                key={reply.label}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickReply?.(reply.body);
                }}
                type="button"
              >
                {reply.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center gap-1">
          {/* Star button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleStar} size="sm" variant="ghost">
                {thread.isStarred ? (
                  <StarOff className="h-4 w-4" />
                ) : (
                  <Star className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {thread.isStarred ? 'Unstar' : 'Star'}
            </TooltipContent>
          </Tooltip>

          {thread.aiAction && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onQuickApprove();
              }}
              size="sm"
              variant="ghost"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Button>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onQuickArchive();
            }}
            size="sm"
            variant="ghost"
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
