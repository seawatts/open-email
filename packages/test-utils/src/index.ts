// TODO: Update test utils for Better-Auth
// import { createClerkClient } from '@clerk/backend';
import { db } from '@seawatts/db/client';
import { ApiKeys, AuthCodes, Orgs, Users } from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import { eq } from 'drizzle-orm';
// import { env } from './env';

// TODO: These test utilities need to be rewritten for Better-Auth
// For now, they're disabled until the migration is complete

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  clerkId: string;
}

export interface TestOrg {
  id: string;
  name: string;
  clerkOrgId: string;
  ownerId: string;
}

export interface TestApiKey {
  id: string;
  key: string;
  name: string;
  orgId: string;
  userId: string;
}

export interface TestAuthCode {
  id: string;
  userId: string;
  orgId: string;
  expiresAt: Date;
  sessionId: string;
}

export interface TestSetup {
  user: TestUser;
  org: TestOrg;
  apiKey: TestApiKey;
  authCode?: TestAuthCode;
  cleanup: () => Promise<void>;
}

// const clerkClient = createClerkClient({
//   publishableKey: env.CLERK_PUBLISHABLE_KEY,
//   secretKey: env.CLERK_SECRET_KEY,
// });

/**
 * Creates a test user in Clerk and the database
 */
export async function createTestUser(
  email = `test-${Date.now()}@example.com`,
  firstName = 'Test',
  lastName = 'User',
): Promise<TestUser> {
  throw new Error(
    'Test utilities need to be rewritten for Better-Auth - Clerk removed',
  );
}

/**
 * Creates a test organization in Clerk and the database
 */
export async function createTestOrg(
  ownerId: string,
  name = `Test Organization ${Date.now()}`,
): Promise<TestOrg> {
  throw new Error(
    'Test utilities need to be rewritten for Better-Auth - Clerk removed',
  );
}

/**
 * Creates a test auth code in the database with a real Clerk session
 */
export async function createTestAuthCode(
  userId: string,
  orgId: string,
  expiresInMinutes = 30,
): Promise<TestAuthCode> {
  throw new Error(
    'Test utilities need to be rewritten for Better-Auth - Clerk removed',
  );
}

/**
 * Creates a test API key in the database
 */
export async function createTestApiKey(
  orgId: string,
  userId: string,
  name = 'Test API Key',
): Promise<TestApiKey> {
  const [apiKey] = await db
    .insert(ApiKeys)
    .values({
      name,
      orgId,
      userId,
    })
    .returning();

  if (!apiKey) {
    throw new Error('Failed to create API key in database');
  }

  return {
    id: apiKey.id,
    key: apiKey.key,
    name: apiKey.name,
    orgId: apiKey.orgId,
    userId: apiKey.userId,
  };
}

/**
 * Creates a complete test setup with user, org, API key, webhook, and optional auth code
 */
export async function createTestSetup(
  options: {
    userEmail?: string;
    userName?: { firstName?: string; lastName?: string };
    orgName?: string;
    apiKeyName?: string;
    createAuthCode?: boolean;
    authCodeExpiresInMinutes?: number;
  } = {},
): Promise<TestSetup> {
  throw new Error(
    'Test utilities need to be rewritten for Better-Auth - Clerk removed',
  );
}

/**
 * Utility to create an expired auth code for testing
 */
export async function createExpiredAuthCode(
  userId: string,
  orgId: string,
): Promise<TestAuthCode> {
  throw new Error(
    'Test utilities need to be rewritten for Better-Auth - Clerk removed',
  );
}

/**
 * Utility to create a used auth code for testing
 */
export async function createUsedAuthCode(
  userId: string,
  orgId: string,
): Promise<TestAuthCode> {
  throw new Error(
    'Test utilities need to be rewritten for Better-Auth - Clerk removed',
  );
}
