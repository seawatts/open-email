import { auth } from '@seawatts/auth/server';
import { db } from '@seawatts/db/client';
import { headers } from 'next/headers';

export const createTRPCContext = async () => {
  let authResult: {
    getToken: (() => string | null) | null;
    orgId: string | null;
    session: unknown;
    sessionClaims: unknown;
    sessionId: string | null;
    userId: string | null;
  } | null = null;

  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (session?.user) {
      authResult = {
        getToken: null, // Will be populated if needed
        orgId: session.session?.activeOrganizationId || null,
        session: session.session || null,
        sessionClaims: session.user || null,
        sessionId: session.session?.id || null,
        userId: session.user.id || null,
      };
    }
  } catch (error) {
    console.error('Error authenticating', error);
  }

  return {
    auth: authResult,
    db,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
