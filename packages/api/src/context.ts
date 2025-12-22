import { auth } from '@seawatts/auth/server';
import { db } from '@seawatts/db/client';
import { headers } from 'next/headers';

export const createTRPCContext = async () => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;

  try {
    const headersList = await headers();
    session = await auth.api.getSession({
      headers: headersList,
    });
  } catch (error) {
    console.error('Error getting session', error);
  }

  const userId = session?.user?.id ?? null;
  const orgId = session?.session?.activeOrganizationId ?? null;

  return {
    // Auth object for compatibility with existing routers
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
