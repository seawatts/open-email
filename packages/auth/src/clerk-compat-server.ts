/**
 * Server-side Clerk compatibility layer for Better-Auth migration
 */

import { headers } from 'next/headers';
import { signCustomJwt } from './jwt-signer';
import { auth as betterAuthInstance } from './server';

// Get auth from request headers (Better-Auth equivalent of Clerk's auth())
export async function auth() {
  const headersList = await headers();
  const session = await betterAuthInstance.api.getSession({
    headers: headersList,
  });

  const userId = session?.user?.id || null;
  const sessionId = session?.session?.id || null;
  const orgId = session?.session?.activeOrganizationId || null;

  return {
    getToken: () => {
      if (!userId || !sessionId) return null;
      return signCustomJwt({
        orgId,
        sessionId,
        template: 'supabase',
        userId,
      });
    },
    orgId,
    session: session?.session || null,
    sessionClaims: session?.user || null,
    sessionId,
    userId,
  };
}
