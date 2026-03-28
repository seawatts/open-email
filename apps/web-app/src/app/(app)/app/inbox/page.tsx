'use client';

import { useTRPC } from '@seawatts/api/react';
import { Button } from '@seawatts/ui/button';
import { Skeleton } from '@seawatts/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { EmailList } from './_components/email-list';
import { GmailSetup } from './_components/gmail-setup';

export default function InboxPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Get the user's Google account from better-auth
  const { data: account, isLoading: accountLoading } = useQuery(
    trpc.email.gmail.account.queryOptions(),
  );

  const syncMutation = useMutation(
    trpc.email.gmail.sync.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.email.threads.list.queryFilter());
      },
    }),
  );

  // Setup Gmail watch for push notifications when account is available
  const setupWatchMutation = useMutation(
    trpc.email.gmail.setupWatch.mutationOptions(),
  );

  const hasAttemptedWatch = useRef(false);

  useEffect(() => {
    if (account && !account.watchExpiration && !hasAttemptedWatch.current) {
      hasAttemptedWatch.current = true;
      setupWatchMutation.mutate();
    }
  }, [account, setupWatchMutation]);

  if (accountLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }

  // No Google account connected - user needs to sign in with Google
  if (!account) {
    return <GmailSetup />;
  }

  const handleSync = () => {
    syncMutation.mutate({
      fullSync: false,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {account.email}
            {account.lastSyncAt && (
              <span className="ml-2">
                · Last synced{' '}
                {new Date(account.lastSyncAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <Button
          disabled={syncMutation.isPending}
          onClick={handleSync}
          size="sm"
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
          />
          {syncMutation.isPending ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-hidden">
        <EmailList accountId={account.id} />
      </div>
    </div>
  );
}
