import { getApi, HydrationBoundary } from '@seawatts/api/server';
import { Suspense } from 'react';

import { ThreadDetailClient, ThreadLoading } from './_components';

interface ThreadDetailPageProps {
  params: Promise<{ threadId: string }>;
}

async function ThreadDetailPrefetcher({ threadId }: { threadId: string }) {
  const api = await getApi();

  // Prefetch thread and highlights data in parallel
  await Promise.all([
    api.email.threads.byId.prefetch({ id: threadId }),
    api.email.highlights.byThread.prefetch({ threadId }),
  ]);

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
