'use client';

import { api } from '@seawatts/api/react';
import { Button } from '@seawatts/ui/button';
import { Skeleton } from '@seawatts/ui/skeleton';
import { RefreshCw } from 'lucide-react';

import { EmailList } from './_components/email-list';
import { GmailConnect } from './_components/gmail-connect';

export default function InboxPage() {
  const utils = api.useUtils();

  const { data: accounts, isLoading: accountsLoading } =
    api.email.gmail.accounts.useQuery();

  const syncMutation = api.email.gmail.sync.useMutation({
    onSuccess: () => {
      utils.email.threads.list.invalidate();
    },
  });

  if (accountsLoading) {
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

  // No Gmail account connected
  if (!accounts || accounts.length === 0) {
    return <GmailConnect />;
  }

  const primaryAccount = accounts[0];

  const handleSync = () => {
    if (primaryAccount) {
      syncMutation.mutate({
        fullSync: false,
        gmailAccountId: primaryAccount.id,
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {primaryAccount?.email}
            {primaryAccount?.lastSyncAt && (
              <span className="ml-2">
                · Last synced{' '}
                {new Date(primaryAccount.lastSyncAt).toLocaleTimeString()}
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
        {primaryAccount && <EmailList gmailAccountId={primaryAccount.id} />}
      </div>
    </div>
  );
}
