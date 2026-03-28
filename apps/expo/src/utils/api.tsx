import { createNativeClient, type NativeApiClient } from '@seawatts/api/native';
import type { AppRouter } from '@seawatts/api/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createTRPCContext,
  createTRPCOptionsProxy,
} from '@trpc/tanstack-react-query';
import { useState } from 'react';

import { authClient } from './auth';
import { getApiBaseUrl } from './base-url';

const {
  TRPCProvider: TRPCProviderContext,
  useTRPC,
  useTRPCClient,
} = createTRPCContext<AppRouter>();

export const queryClient = new QueryClient();

export const api: NativeApiClient<AppRouter> = createNativeClient<AppRouter>({
  baseUrl: getApiBaseUrl(),
  cookieGetter: () => authClient.getCookie() ?? undefined,
  sourceHeader: 'expo',
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: api,
  queryClient,
});

export function TRPCProvider(props: { children: React.ReactNode }) {
  const [trpcClient] = useState(() =>
    createNativeClient<AppRouter>({
      baseUrl: getApiBaseUrl(),
      cookieGetter: () => authClient.getCookie() ?? undefined,
      sourceHeader: 'expo',
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProviderContext queryClient={queryClient} trpcClient={trpcClient}>
        {props.children}
      </TRPCProviderContext>
    </QueryClientProvider>
  );
}

export { useTRPC, useTRPCClient };
