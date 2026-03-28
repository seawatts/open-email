/**
 * React Native / Expo safe exports
 *
 * This file exports only client-side utilities that don't depend on
 * Node.js-specific modules (like postgres, fs, os, etc.)
 *
 * Use this entry point for mobile apps:
 * import { createNativeClient } from '@seawatts/api/native';
 */

import {
  createTRPCClient,
  httpLink,
  loggerLink,
  type TRPCClient,
} from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import SuperJSON from 'superjson';

export interface NativeClientConfig {
  baseUrl: string;
  sourceHeader?: string;
  authToken?: string;
  /** Static session cookie value */
  sessionCookie?: string;
  /** Dynamic cookie getter - called on each request (useful for Expo/mobile) */
  cookieGetter?: () => string | undefined;
}

export type NativeApiClient<TRouter extends AnyRouter> = TRPCClient<TRouter>;

/**
 * Create a tRPC client for React Native / Expo apps
 *
 * Follows the Better Auth + tRPC pattern for Expo:
 * https://github.com/better-auth/better-auth/discussions/4684
 *
 * - Cookie: pass authClient.getCookie() via cookieGetter and set the Cookie header.
 * - Fetch: use credentials: 'omit' so the manually set Cookie isn't overridden (Expo).
 *
 * Server-side: tRPC createContext should call auth.api.getSession({ headers: req.headers }).
 */
export function createNativeClient<TRouter extends AnyRouter>(
  config: NativeClientConfig,
): TRPCClient<TRouter> {
  return createTRPCClient<TRouter>({
    links: [
      loggerLink({
        enabled: (op) =>
          process.env.NODE_ENV === 'development' &&
          op.direction === 'down' &&
          op.result instanceof Error,
      }),
      httpLink<TRouter>({
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, credentials: 'omit' }),
        headers() {
          const headers = new Headers();
          headers.set('x-trpc-source', config.sourceHeader ?? 'expo');

          if (config.authToken) {
            headers.set('Authorization', `Bearer ${config.authToken}`);
          }

          const dynamicCookie = config.cookieGetter?.();
          if (dynamicCookie) {
            headers.set('Cookie', dynamicCookie);
          } else if (config.sessionCookie) {
            headers.set('Cookie', `__session=${config.sessionCookie}`);
          }

          return headers;
        },
        transformer: SuperJSON,
        url: `${config.baseUrl}/api/trpc`,
      } as unknown as Parameters<typeof httpLink<TRouter>>[0]),
    ],
  });
}
