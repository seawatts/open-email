import { db } from '@seawatts/db/client';
import {
  Accounts,
  ApiKeys,
  AuthCodes,
  OrgMembers,
  Orgs,
  Sessions,
  Users,
} from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import { eq } from 'drizzle-orm';

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface TestOrg {
  id: string;
  name: string;
  slug: string | null;
}

export interface TestApiKey {
  id: string;
  key: string;
  name: string;
  organizationId: string;
  userId: string;
}

export interface TestAuthCode {
  id: string;
  userId: string;
  organizationId: string;
  expiresAt: Date;
  sessionId: string;
}

export interface TestSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface TestSetup {
  user: TestUser;
  org: TestOrg;
  session: TestSession;
  apiKey: TestApiKey;
  authCode?: TestAuthCode;
  cleanup: () => Promise<void>;
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(
  email = `test-${Date.now()}@example.com`,
  name = 'Test User',
): Promise<TestUser> {
  try {
    const [dbUser] = await db
      .insert(Users)
      .values({
        email,
        emailVerified: true,
        id: createId({ prefix: 'user' }),
        name,
      })
      .returning();

    if (!dbUser) {
      throw new Error('Failed to create user in database');
    }

    return {
      email: dbUser.email,
      id: dbUser.id,
      name: dbUser.name,
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Creates a test session for a user
 */
export async function createTestSession(
  userId: string,
  organizationId?: string,
  expiresInMinutes = 60,
): Promise<TestSession> {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const token = createId({ prefix: 'tok' });

  const [session] = await db
    .insert(Sessions)
    .values({
      activeOrganizationId: organizationId,
      expiresAt,
      id: createId({ prefix: 'sess' }),
      token,
      userId,
    })
    .returning();

  if (!session) {
    throw new Error('Failed to create session in database');
  }

  return {
    expiresAt: session.expiresAt,
    id: session.id,
    token: session.token,
    userId: session.userId,
  };
}

/**
 * Creates a test organization in the database
 */
export async function createTestOrg(
  name = `Test Organization ${Date.now()}`,
): Promise<TestOrg> {
  const slug = name.toLowerCase().replace(/\s+/g, '-');

  const [dbOrg] = await db
    .insert(Orgs)
    .values({
      id: createId({ prefix: 'org' }),
      name,
      slug,
    })
    .returning();

  if (!dbOrg) {
    throw new Error('Failed to create organization in database');
  }

  return {
    id: dbOrg.id,
    name: dbOrg.name,
    slug: dbOrg.slug,
  };
}

/**
 * Adds a user as a member of an organization
 */
export async function addOrgMember(
  userId: string,
  organizationId: string,
  role: 'admin' | 'owner' | 'member' = 'member',
) {
  const [member] = await db
    .insert(OrgMembers)
    .values({
      id: createId({ prefix: 'member' }),
      organizationId,
      role,
      userId,
    })
    .returning();

  if (!member) {
    throw new Error('Failed to add member to organization');
  }

  return member;
}

/**
 * Creates a test auth code in the database
 */
export async function createTestAuthCode(
  userId: string,
  organizationId: string,
  sessionId: string,
  expiresInMinutes = 30,
): Promise<TestAuthCode> {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const [authCode] = await db
    .insert(AuthCodes)
    .values({
      expiresAt,
      id: createId({ prefix: 'ac' }),
      organizationId,
      sessionId,
      userId,
    })
    .returning();

  if (!authCode) {
    throw new Error('Failed to create auth code in database');
  }

  return {
    expiresAt: authCode.expiresAt,
    id: authCode.id,
    organizationId: authCode.organizationId,
    sessionId: authCode.sessionId,
    userId: authCode.userId,
  };
}

/**
 * Creates a test API key in the database
 */
export async function createTestApiKey(
  organizationId: string,
  userId: string,
  name = 'Test API Key',
): Promise<TestApiKey> {
  const [apiKey] = await db
    .insert(ApiKeys)
    .values({
      id: createId({ prefix: 'ak' }),
      name,
      organizationId,
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
    organizationId: apiKey.organizationId,
    userId: apiKey.userId,
  };
}

/**
 * Creates a complete test setup with user, org, session, API key, and optional auth code
 */
export async function createTestSetup(
  options: {
    userEmail?: string;
    userName?: string;
    orgName?: string;
    apiKeyName?: string;
    createAuthCode?: boolean;
    authCodeExpiresInMinutes?: number;
  } = {},
): Promise<TestSetup> {
  const {
    userEmail,
    userName,
    orgName,
    apiKeyName = 'Test API Key',
    createAuthCode = false,
    authCodeExpiresInMinutes = 30,
  } = options;

  // Create test user
  const user = await createTestUser(userEmail, userName);

  // Create test organization
  const org = await createTestOrg(orgName);

  // Add user as owner of the organization
  await addOrgMember(user.id, org.id, 'owner');

  // Create test session
  const session = await createTestSession(user.id, org.id);

  // Create test API key
  const apiKey = await createTestApiKey(org.id, user.id, apiKeyName);

  let authCode: TestAuthCode | undefined;

  if (createAuthCode) {
    authCode = await createTestAuthCode(
      user.id,
      org.id,
      session.id,
      authCodeExpiresInMinutes,
    );
  }

  // Create cleanup function
  const cleanup = async () => {
    try {
      // Clean up auth code if it exists
      if (authCode) {
        await db.delete(AuthCodes).where(eq(AuthCodes.id, authCode.id));
      }

      // Clean up API key from database
      await db.delete(ApiKeys).where(eq(ApiKeys.id, apiKey.id));

      // Clean up session from database
      await db.delete(Sessions).where(eq(Sessions.id, session.id));

      // Clean up org members
      await db.delete(OrgMembers).where(eq(OrgMembers.organizationId, org.id));

      // Clean up organization from database
      await db.delete(Orgs).where(eq(Orgs.id, org.id));

      // Clean up accounts from database
      await db.delete(Accounts).where(eq(Accounts.userId, user.id));

      // Clean up user from database
      await db.delete(Users).where(eq(Users.id, user.id));
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  };

  return {
    apiKey,
    authCode,
    cleanup,
    org,
    session,
    user,
  };
}

/**
 * Utility to create an expired auth code for testing
 */
export async function createExpiredAuthCode(
  userId: string,
  organizationId: string,
  sessionId: string,
): Promise<TestAuthCode> {
  const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

  const [authCode] = await db
    .insert(AuthCodes)
    .values({
      expiresAt,
      id: createId({ prefix: 'ac' }),
      organizationId,
      sessionId,
      userId,
    })
    .returning();

  if (!authCode) {
    throw new Error('Failed to create expired auth code in database');
  }

  return {
    expiresAt: authCode.expiresAt,
    id: authCode.id,
    organizationId: authCode.organizationId,
    sessionId: authCode.sessionId,
    userId: authCode.userId,
  };
}

/**
 * Utility to create a used auth code for testing
 */
export async function createUsedAuthCode(
  userId: string,
  organizationId: string,
  sessionId: string,
): Promise<TestAuthCode> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  const [authCode] = await db
    .insert(AuthCodes)
    .values({
      expiresAt,
      id: createId({ prefix: 'ac' }),
      organizationId,
      sessionId,
      usedAt: new Date(), // Mark as used
      userId,
    })
    .returning();

  if (!authCode) {
    throw new Error('Failed to create used auth code in database');
  }

  return {
    expiresAt: authCode.expiresAt,
    id: authCode.id,
    organizationId: authCode.organizationId,
    sessionId: authCode.sessionId,
    userId: authCode.userId,
  };
}
