import { getQueryClient, HydrationBoundary, trpc } from '@seawatts/api/server';
import { Suspense } from 'react';

import { ThreadDetailClient, ThreadLoading } from './_components';

interface ThreadDetailPageProps {
  params: Promise<{ threadId: string }>;
}

async function ThreadDetailPrefetcher({ threadId }: { threadId: string }) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(
    trpc.email.threads.byId.queryOptions({ id: threadId }),
  );

  return (
    <HydrationBoundary>
      <ThreadDetailClient threadId={threadId} />
    </HydrationBoundary>
  );
}

export default async function ThreadDetailPage({
  params,
}: ThreadDetailPageProps) {
  const { threadId } = await params;

  return (
    <Suspense fallback={<ThreadLoading />}>
      <ThreadDetailPrefetcher threadId={threadId} />
    </Suspense>
  );
}
