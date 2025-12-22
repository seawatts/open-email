'use client';

import {
  BUNDLE_CONFIG,
  type BundleType,
  type HighlightData,
  type HighlightType,
} from '@seawatts/api/email/types';
import { useTRPC } from '@seawatts/api/react';
import { Button } from '@seawatts/ui/button';
import { Checkbox } from '@seawatts/ui/checkbox';
import { cn } from '@seawatts/ui/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@seawatts/ui/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Archive,
  Bell,
  CheckCircle,
  Landmark,
  Pin,
  PinOff,
  Plane,
  Share2,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  Users,
} from 'lucide-react';

import { CategoryBadge } from './category-badge';
import { HighlightChips } from './highlight-chip';

type EmailCategory =
  | 'urgent'
  | 'needs_reply'
  | 'awaiting_other'
  | 'fyi'
  | 'spam_like';

// Icon mapping for bundle types
const BUNDLE_ICONS: Record<
  BundleType,
  React.ComponentType<{ className?: string }>
> = {
  finance: Landmark,
  forums: Users,
  personal: User,
  promos: Tag,
  purchases: ShoppingBag,
  social: Share2,
  travel: Plane,
  updates: Bell,
};

interface ThreadHighlight {
  actionLabel?: string | null;
  actionUrl?: string | null;
  data: HighlightData | Record<string, unknown>;
  highlightType: HighlightType;
  id: string;
  subtitle?: string | null;
  title: string;
}

interface ThreadWithDecision {
  bundleType?: BundleType | null;
  emailHighlights?: ThreadHighlight[];
  id: string;
  isPinned?: boolean;
  isRead: boolean;
  labels: string[];
  lastMessageAt: Date;
  latestDecision: {
    category: EmailCategory;
    confidence: number;
    suggestedAction: string;
    summary: string | null;
  } | null;
  latestMessage?: {
    fromEmail: string;
    fromName: string | null;
  } | null;
  messageCount: number;
  participantEmails: string[];
  pendingActions?: { id: string }[];
  snippet: string | null;
  subject: string;
}

interface EmailRowProps {
  isFocused: boolean;
  isSelected: boolean;
  onFocus: () => void;
  onOpen: () => void;
  onQuickApprove: () => void;
  onQuickArchive: () => void;
  onSelect: () => void;
  showBundleIcon?: boolean;
  thread: ThreadWithDecision;
}

export function EmailRow({
  isFocused,
  isSelected,
  onFocus,
  onOpen,
  onQuickApprove,
  onQuickArchive,
  onSelect,
  showBundleIcon = true,
  thread,
}: EmailRowProps) {
  const decision = thread.latestDecision;
  const hasPendingActions = (thread.pendingActions?.length ?? 0) > 0;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const pinMutation = useMutation(
    trpc.email.threads.pin.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
      },
    }),
  );

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    pinMutation.mutate({
      pinned: !thread.isPinned,
      threadId: thread.id,
    });
  };

  // Get bundle icon if available
  const BundleIcon = thread.bundleType ? BUNDLE_ICONS[thread.bundleType] : null;
  const bundleConfig = thread.bundleType
    ? BUNDLE_CONFIG[thread.bundleType]
    : null;

  return (
    <button
      className={cn(
        'group flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors cursor-pointer',
        isSelected && 'bg-primary/5',
        isFocused && 'ring-2 ring-inset ring-primary/50',
        !thread.isRead && 'bg-muted/30',
        thread.isPinned && 'border-l-2 border-l-primary',
        'hover:bg-muted/50',
      )}
      onClick={onOpen}
      onMouseEnter={onFocus}
      type="button"
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

      {/* Bundle type icon */}
      {showBundleIcon && BundleIcon && bundleConfig && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="shrink-0 pt-1">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                <BundleIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{bundleConfig.label}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {/* Pinned indicator */}
          {thread.isPinned && (
            <Pin className="h-3 w-3 fill-primary text-primary" />
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

          {/* Category badge */}
          {decision && (
            <CategoryBadge
              category={decision.category}
              confidence={decision.confidence}
              size="sm"
            />
          )}

          {/* Pending action indicator */}
          {hasPendingActions && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              <Sparkles className="h-3 w-3" />
              Action pending
            </span>
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

        {/* Snippet / AI Summary */}
        <p className="truncate text-xs text-muted-foreground">
          {decision?.summary ?? thread.snippet ?? ''}
        </p>

        {/* Highlights */}
        {thread.emailHighlights && thread.emailHighlights.length > 0 && (
          <div className="mt-2">
            <HighlightChips
              highlights={thread.emailHighlights}
              maxDisplay={2}
            />
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center gap-1">
          {/* Pin button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handlePin} size="sm" variant="ghost">
                {thread.isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {thread.isPinned ? 'Unpin' : 'Pin to top'}
            </TooltipContent>
          </Tooltip>

          {decision?.suggestedAction && (
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
    </button>
  );
}
