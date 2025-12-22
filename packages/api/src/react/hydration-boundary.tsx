import {
  dehydrate,
  HydrationBoundary as ReactQueryHydrationBoundary,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { getQueryClient } from './server';

/**
 * HydrationBoundary for tRPC queries prefetched in server components.
 * Use this to hydrate query data from server to client.
 *
 * @example
 * ```tsx
 * import { getQueryClient, trpc } from '@seawatts/api/server';
 * import { HydrationBoundary } from '@seawatts/api/react';
 *
 * export default async function Page() {
 *   const queryClient = getQueryClient();
 *   void queryClient.prefetchQuery(trpc.greeting.queryOptions({ name: 'World' }));
 *
 *   return (
 *     <HydrationBoundary>
 *       <ClientComponent />
 *     </HydrationBoundary>
 *   );
 * }
 * ```
 */
export async function HydrationBoundary(props: PropsWithChildren) {
  const queryClient = getQueryClient();
  const dehydratedState = dehydrate(queryClient);

  return (
    <ReactQueryHydrationBoundary state={dehydratedState}>
      {props.children}
    </ReactQueryHydrationBoundary>
  );
}
