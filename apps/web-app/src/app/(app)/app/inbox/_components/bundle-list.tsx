'use client';

import { BUNDLE_CONFIG, type BundleType } from '@seawatts/api/email/types';
import { api } from '@seawatts/api/react';
import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { cn } from '@seawatts/ui/lib/utils';
import { ScrollArea, ScrollBar } from '@seawatts/ui/scroll-area';
import { Skeleton } from '@seawatts/ui/skeleton';
import {
  Bell,
  Calendar,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Landmark,
  Package,
  Plane,
  Share2,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { EmailRow } from './email-row';
import { SwipeableEmailRow } from './swipeable-email-row';

// Icon mapping for bundle types
const BUNDLE_ICONS = {
  finance: Landmark,
  forums: Users,
  personal: User,
  promos: Tag,
  purchases: ShoppingBag,
  social: Share2,
  travel: Plane,
  updates: Bell,
} satisfies Record<BundleType, React.ComponentType<{ className?: string }>>;

// Color classes for bundles
const BUNDLE_COLORS: Record<BundleType, string> = {
  finance:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  forums:
    'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  personal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  promos: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  purchases:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  social:
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  travel: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  updates:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const BUNDLE_ORDER: BundleType[] = [
  'travel',
  'purchases',
  'finance',
  'updates',
  'social',
  'promos',
  'forums',
  'personal',
];

interface BundleListProps {
  gmailAccountId: string;
}

// Highlight type icons for bundle previews
const HIGHLIGHT_ICONS = {
  event: Calendar,
  flight: Plane,
  hotel: Plane,
  package_tracking: Package,
  payment: CreditCard,
} as const;

interface BundleCardProps {
  bundleType: BundleType;
  gmailAccountId: string;
  isExpanded: boolean;
  onToggle: () => void;
  totalCount: number;
  unreadCount: number;
}

function BundleCard({
  bundleType,
  gmailAccountId,
  isExpanded,
  onToggle,
  totalCount,
  unreadCount,
}: BundleCardProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const Icon = BUNDLE_ICONS[bundleType];
  const config = BUNDLE_CONFIG[bundleType];
  const colorClass = BUNDLE_COLORS[bundleType];

  // Track optimistically removed threads for instant UI
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<
    Set<string>
  >(new Set());

  const { data: threads, isLoading } = api.email.threads.byBundle.useQuery(
    {
      bundleType,
      gmailAccountId,
      limit: isExpanded ? 10 : 3,
    },
    {
      enabled: totalCount > 0,
    },
  );

  // Filter out optimistically removed threads
  const visibleThreads = useMemo(
    () => threads?.filter((t) => !optimisticallyRemovedIds.has(t.id)) ?? [],
    [threads, optimisticallyRemovedIds],
  );

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
      // Refetch to ensure consistency
      utils.email.threads.byBundle.invalidate();
      utils.email.threads.bundleCounts.invalidate();
    },
  });

  // Optimistic archive all
  const handleArchiveAll = useCallback(() => {
    if (!visibleThreads.length) return;

    // Optimistically remove all visible threads
    setOptimisticallyRemovedIds((prev) => {
      const next = new Set(prev);
      for (const thread of visibleThreads) {
        next.add(thread.id);
      }
      return next;
    });

    // Fire mutations in background
    for (const thread of visibleThreads) {
      createAction.mutate({
        actionType: 'archive',
        threadId: thread.id,
      });
    }
  }, [visibleThreads, createAction]);

  // Optimistic swipe archive
  const handleSwipeArchive = useCallback(
    (threadId: string) => {
      // Optimistically remove from UI
      setOptimisticallyRemovedIds((prev) => new Set(prev).add(threadId));

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

      // Fire mutation in background
      createAction.mutate({
        actionType: 'snooze',
        threadId,
      });
    },
    [createAction],
  );

  // Adjust counts based on optimistic removals
  const adjustedTotalCount = totalCount - optimisticallyRemovedIds.size;

  if (adjustedTotalCount <= 0 && totalCount > 0) {
    // All threads optimistically removed - hide the card
    return null;
  }

  if (totalCount === 0) {
    return null;
  }

  // Extract highlights from visible threads for preview (when collapsed)
  const previewHighlights =
    !isExpanded && visibleThreads.length > 0
      ? visibleThreads
          .flatMap((t) => {
            // Check for highlights in thread decisions or extract from bundle type
            const bundleHighlights: Array<{ type: string; title: string }> = [];
            if (bundleType === 'travel') {
              bundleHighlights.push({
                title: t.subject,
                type: 'flight',
              });
            } else if (bundleType === 'purchases') {
              bundleHighlights.push({
                title: t.subject,
                type: 'package_tracking',
              });
            } else if (bundleType === 'finance') {
              bundleHighlights.push({
                title: t.subject,
                type: 'payment',
              });
            }
            return bundleHighlights;
          })
          .slice(0, 3)
      : [];

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-md',
        isExpanded && 'ring-1 ring-primary/20',
      )}
    >
      <CardHeader className="cursor-pointer p-4" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-transform',
                colorClass,
                isExpanded && 'scale-110',
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                {config.label}
                {unreadCount > 0 && (
                  <Badge className="rounded-full" variant="default">
                    {unreadCount} new
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {adjustedTotalCount} email{adjustedTotalCount !== 1 ? 's' : ''}
            </span>
            <Button size="sm" variant="ghost">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsed preview with highlights */}
        {!isExpanded && previewHighlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previewHighlights.map((highlight, i) => {
              const HighlightIcon =
                HIGHLIGHT_ICONS[
                  highlight.type as keyof typeof HIGHLIGHT_ICONS
                ] ?? Sparkles;
              return (
                <Badge className="gap-1 text-xs" key={i} variant="secondary">
                  <HighlightIcon className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">
                    {highlight.title}
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {/* Batch action bar */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {visibleThreads.length} shown
            </span>
            <Button
              className="h-7 gap-1 text-xs"
              disabled={visibleThreads.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                handleArchiveAll();
              }}
              size="sm"
              variant="ghost"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all done
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton className="h-16 w-full" key={i} />
              ))}
            </div>
          ) : visibleThreads.length > 0 ? (
            <div className="divide-y divide-border">
              {visibleThreads.map((thread) => (
                <SwipeableEmailRow
                  key={thread.id}
                  leftAction="snooze"
                  onSwipeLeft={() => handleSwipeSnooze(thread.id)}
                  onSwipeRight={() => handleSwipeArchive(thread.id)}
                  rightAction="archive"
                >
                  <EmailRow
                    isFocused={false}
                    isSelected={false}
                    onFocus={() => {}}
                    onOpen={() => router.push(`/app/inbox/${thread.id}`)}
                    onQuickApprove={() => {}}
                    onQuickArchive={() => handleSwipeArchive(thread.id)}
                    onSelect={() => {}}
                    showBundleIcon={false}
                    thread={{
                      ...thread,
                      latestDecision: null,
                      latestMessage: null,
                    }}
                  />
                </SwipeableEmailRow>
              ))}
              {adjustedTotalCount > visibleThreads.length && (
                <div className="p-4 text-center">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/app/inbox?bundle=${bundleType}`);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    View all {adjustedTotalCount} emails in {config.label}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No emails in this bundle
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function BundleList({ gmailAccountId }: BundleListProps) {
  const [expandedBundle, setExpandedBundle] = useState<BundleType | null>(null);

  const { data: bundleCounts, isLoading } =
    api.email.threads.bundleCounts.useQuery({
      gmailAccountId,
    });

  const toggleBundle = (bundleType: BundleType) => {
    setExpandedBundle(expandedBundle === bundleType ? null : bundleType);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {/* Bundle tabs skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton className="h-10 w-24 shrink-0" key={i} />
          ))}
        </div>
        {/* Bundle cards skeleton */}
        {[1, 2, 3].map((i) => (
          <Skeleton className="h-32 w-full" key={i} />
        ))}
      </div>
    );
  }

  if (!bundleCounts) {
    return null;
  }

  // Filter bundles that have emails
  const activeBundles = BUNDLE_ORDER.filter(
    (bundle) => (bundleCounts[bundle]?.total ?? 0) > 0,
  );

  if (activeBundles.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 p-8">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="font-medium">No Bundled Emails</h3>
          <p className="text-sm text-muted-foreground">
            Emails will be automatically grouped into bundles as they arrive
          </p>
        </div>
      </div>
    );
  }

  // Calculate total unread
  const totalUnread = Object.values(bundleCounts).reduce(
    (sum, counts) => sum + (counts?.unread ?? 0),
    0,
  );

  return (
    <div className="flex h-full flex-col">
      {/* Bundle quick tabs */}
      <ScrollArea className="border-b border-border">
        <div className="flex gap-2 p-4">
          {activeBundles.map((bundleType) => {
            const config = BUNDLE_CONFIG[bundleType];
            const Icon = BUNDLE_ICONS[bundleType];
            const counts = bundleCounts[bundleType];
            const colorClass = BUNDLE_COLORS[bundleType];

            return (
              <Button
                className="gap-2 shrink-0"
                key={bundleType}
                onClick={() => toggleBundle(bundleType)}
                size="sm"
                variant={expandedBundle === bundleType ? 'secondary' : 'ghost'}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded ${colorClass}`}
                >
                  <Icon className="h-3 w-3" />
                </div>
                {config.label}
                {(counts?.unread ?? 0) > 0 && (
                  <Badge
                    className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
                    variant="default"
                  >
                    {counts?.unread}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Summary stats */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
        <span className="text-muted-foreground">
          {activeBundles.length} active bundles
        </span>
        {totalUnread > 0 && (
          <Badge variant="secondary">{totalUnread} unread</Badge>
        )}
      </div>

      {/* Bundle cards */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {activeBundles.map((bundleType) => {
            const counts = bundleCounts[bundleType] ?? { total: 0, unread: 0 };

            return (
              <BundleCard
                bundleType={bundleType}
                gmailAccountId={gmailAccountId}
                isExpanded={expandedBundle === bundleType}
                key={bundleType}
                onToggle={() => toggleBundle(bundleType)}
                totalCount={counts.total}
                unreadCount={counts.unread}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
