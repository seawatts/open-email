import { auth } from '@seawatts/auth/server';
import { db } from '@seawatts/db/client';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { headers } from 'next/headers';

export const createTRPCContext = async (opts?: FetchCreateContextFnOptions) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;

  try {
    let headersList = opts?.req?.headers ?? (await headers());
    // better-auth getSession() looks for cookie name "better-auth.session_token", but Expo
    // sends "__Secure-better-auth.session_token". Normalize so getSession finds it.
    const rawCookie =
      headersList.get?.('cookie') ?? headersList.get?.('Cookie') ?? '';
    const hadSecurePrefix = rawCookie.includes('__Secure-better-auth.');
    if (rawCookie && hadSecurePrefix) {
      const normalizedCookie = rawCookie.replace(
        /__Secure-better-auth\./g,
        'better-auth.',
      );
      const normalized = new Headers(headersList);
      normalized.set('Cookie', normalizedCookie);
      headersList = normalized;
    }
    session = await auth.api.getSession({
      headers: headersList,
    });
    // Fallback: getSession() can return null despite valid cookies (e.g. cookie cache parsing).
    if (!session && opts?.req) {
      const cookieVal =
        headersList.get?.('cookie') ?? headersList.get?.('Cookie') ?? '';
      if (cookieVal) {
        try {
          const host =
            opts.req.headers.get('host') ?? new URL(opts.req.url).host;
          const protocol =
            opts.req.headers.get('x-forwarded-proto') ??
            (opts.req.url.startsWith('https') ? 'https' : 'http');
          const origin = `${protocol}://${host}`;
          const fallbackUrl = `${origin}/api/auth/get-session`;
          const res = await fetch(fallbackUrl, {
            headers: {
              cookie: cookieVal,
              host: host,
            },
          });
          const body = await res.text();
          type GetSessionBody = {
            session?: unknown;
            user?: unknown;
            data?: { session?: unknown; user?: unknown };
          };
          let parsed: GetSessionBody | null = null;
          try {
            parsed = body ? (JSON.parse(body) as GetSessionBody) : null;
          } catch (_) {}
          if (res.ok && parsed) {
            const p = parsed;
            const sessionData: { session?: unknown; user?: unknown } | null =
              p && 'session' in p && p.session && 'user' in p && p.user
                ? (p as { session: unknown; user: unknown })
                : p && 'data' in p && p.data && typeof p.data === 'object'
                  ? (p.data as { session?: unknown; user?: unknown })
                  : null;
            if (sessionData?.session && sessionData?.user) {
              session = {
                session: sessionData.session,
                user: sessionData.user,
              } as Awaited<ReturnType<typeof auth.api.getSession>>;
            }
          }
        } catch (_) {}
      }
    }
  } catch (error) {
    console.error('Error getting session', error);
  }

  const userId = session?.user?.id ?? null;
  const orgId = session?.session?.activeOrganizationId ?? null;

  return {
    auth: {
      orgId,
      userId,
    },
    db,
    organizationId: orgId,
    session,
    user: session?.user ?? null,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
