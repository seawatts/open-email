import 'server-only';

import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { headers } from 'next/headers';
import { cache } from 'react';
import { createTRPCContext } from '../context';
import { appRouter } from '../root';
import { createQueryClient } from './query-client';

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set('x-trpc-source', 'rsc');

  return createTRPCContext();
});

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(createQueryClient);

/**
 * tRPC proxy for server components using the new tRPC v11 pattern.
 * Use this to prefetch queries in React Server Components.
 *
 * @example
 * ```tsx
 * import { getQueryClient, trpc } from '@seawatts/api/server';
 * import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
 *
 * export default async function Page() {
 *   const queryClient = getQueryClient();
 *   void queryClient.prefetchQuery(trpc.greeting.queryOptions({ name: 'World' }));
 *
 *   return (
 *     <HydrationBoundary state={dehydrate(queryClient)}>
 *       <ClientComponent />
 *     </HydrationBoundary>
 *   );
 * }
 * ```
 */
export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  queryClient: getQueryClient,
  router: appRouter,
});

/**
 * @deprecated Use `trpc` from this module instead. This is kept for backward compatibility.
 * The new pattern uses `createTRPCOptionsProxy` which provides better type safety.
 */
export const getApi = cache(async () => {
  const queryClient = getQueryClient();
  return {
    queryClient,
    // For backward compatibility, provide a similar interface
    // but recommend using trpc directly
    trpc: trpc,
  };
});
