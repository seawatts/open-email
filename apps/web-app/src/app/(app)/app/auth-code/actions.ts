'use server';

import { auth } from '@seawatts/auth/server';
import { db } from '@seawatts/db/client';
import { AuthCodes } from '@seawatts/db/schema';
import { headers } from 'next/headers';
import { createSafeActionClient } from 'next-safe-action';

// Create the action client
const action = createSafeActionClient();

export const createAuthCode = action.action(async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user?.id) {
    throw new Error('User not found');
  }

  const userId = session.user.id;
  const orgId = session.session?.activeOrganizationId;
  const sessionId = session.session?.id;

  if (!orgId) {
    throw new Error('Organization not found');
  }

  if (!sessionId) {
    throw new Error('Session not found');
  }

  // First check for an existing unused and non-expired auth code
  const existingAuthCode = await db.query.AuthCodes.findFirst({
    where: (authCode, { and, eq, isNull, gt }) =>
      and(
        eq(authCode.userId, userId),
        eq(authCode.orgId, orgId),
        isNull(authCode.usedAt),
        gt(authCode.expiresAt, new Date()),
      ),
  });

  if (existingAuthCode) {
    return {
      authCode: existingAuthCode,
      isNew: false,
    };
  }

  console.log('creating auth code', orgId, userId, sessionId);
  // If no valid auth code exists, create a new one
  const [authCode] = await db
    .insert(AuthCodes)
    .values({
      orgId,
      sessionId,
      userId,
    })
    .returning();

  if (!authCode) {
    throw new Error('Failed to create auth code');
  }

  return {
    authCode,
    isNew: true,
  };
});
