import { faker } from '@faker-js/faker';
import * as schema from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export class TestFactories {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  // ============================================================================
  // Email-related factories
  // ============================================================================

  async createAccount(
    userId: string,
    overrides?: Partial<schema.AccountType>,
  ): Promise<schema.AccountType> {
    const email = faker.internet.email();
    const account = {
      accessToken: faker.string.alphanumeric(64),
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      accountId: email, // Google uses email as accountId
      createdAt: new Date(),
      id: createId({ prefix: 'acct' }),
      lastHistoryId: faker.string.numeric(10),
      lastSyncAt: new Date(),
      providerId: 'google',
      refreshToken: faker.string.alphanumeric(64),
      userId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.Accounts)
      .values(account)
      .returning();
    if (!created) {
      throw new Error('Failed to create account');
    }
    return created;
  }

  // Alias for backward compatibility in tests
  async createGmailAccount(
    userId: string,
    overrides?: Partial<schema.AccountType>,
  ): Promise<schema.AccountType> {
    return this.createAccount(userId, overrides);
  }

  async createEmailThread(
    accountId: string,
    overrides?: Partial<schema.EmailThreadType>,
  ): Promise<schema.EmailThreadType> {
    const thread = {
      accountId,
      bundleType: 'personal' as const,
      createdAt: new Date(),
      gmailThreadId: faker.string.alphanumeric(16),
      id: createId({ prefix: 'thread' }),
      isPinned: false,
      isRead: false,
      labels: ['INBOX'],
      lastMessageAt: new Date(),
      messageCount: 1,
      participantEmails: [faker.internet.email()],
      snippet: faker.lorem.sentence(),
      subject: faker.lorem.sentence(),
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.EmailThreads)
      .values(thread)
      .returning();
    if (!created) {
      throw new Error('Failed to create email thread');
    }
    return created;
  }

  async createEmailMessage(
    threadId: string,
    overrides?: Partial<schema.EmailMessageType>,
  ): Promise<schema.EmailMessageType> {
    const message = {
      bodyPreview: faker.lorem.paragraph(),
      ccEmails: [],
      createdAt: new Date(),
      fromEmail: faker.internet.email(),
      fromName: faker.person.fullName(),
      gmailMessageId: faker.string.alphanumeric(16),
      hasAttachments: false,
      id: createId({ prefix: 'msg' }),
      internalDate: new Date(),
      snippet: faker.lorem.sentence(),
      subject: faker.lorem.sentence(),
      threadId,
      toEmails: [faker.internet.email()],
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.EmailMessages)
      .values(message)
      .returning();
    if (!created) {
      throw new Error('Failed to create email message');
    }
    return created;
  }

  /**
   * Create a complete email setup for testing
   */
  async createEmailSetup(options?: {
    messageCount?: number;
    threadCount?: number;
  }) {
    const user = await this.createUser();
    const gmailAccount = await this.createGmailAccount(user.id);

    const threads: schema.EmailThreadType[] = [];
    const messages: schema.EmailMessageType[] = [];

    const threadCount = options?.threadCount ?? 1;
    const messageCount = options?.messageCount ?? 1;

    for (let t = 0; t < threadCount; t++) {
      const thread = await this.createEmailThread(gmailAccount.id);
      threads.push(thread);

      for (let m = 0; m < messageCount; m++) {
        const message = await this.createEmailMessage(thread.id, {
          subject: thread.subject,
        });
        messages.push(message);
      }
    }

    return {
      gmailAccount,
      messages,
      threads,
      user,
    };
  }

  async createUser(
    overrides?: Partial<schema.UserType>,
  ): Promise<schema.UserType> {
    const user = {
      createdAt: new Date(),
      email: faker.internet.email(),
      emailVerified: true,
      id: createId({ prefix: 'user' }),
      image: faker.image.avatar(),
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.Users)
      .values(user)
      .returning();
    if (!created) {
      throw new Error('Failed to create user');
    }
    return created;
  }

  async createOrg(
    overrides?: Partial<schema.OrgType>,
  ): Promise<schema.OrgType> {
    const name = overrides?.name ?? faker.company.name();
    const org = {
      createdAt: new Date(),
      id: createId({ prefix: 'org' }),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      stripeCustomerId: faker.string.alphanumeric(20),
      stripeSubscriptionId: faker.string.alphanumeric(20),
      stripeSubscriptionStatus: 'active' as const,
      ...overrides,
    };

    const [created] = await this.db.insert(schema.Orgs).values(org).returning();
    if (!created) {
      throw new Error('Failed to create org');
    }
    return created;
  }

  async createOrgMember(
    userId: string,
    organizationId: string,
    role: 'member' | 'admin' | 'owner' = 'member',
  ): Promise<schema.OrgMembersType> {
    const member = {
      createdAt: new Date(),
      id: createId({ prefix: 'member' }),
      organizationId,
      role,
      userId,
    };

    const [created] = await this.db
      .insert(schema.OrgMembers)
      .values(member)
      .returning();
    if (!created) {
      throw new Error('Failed to create org member');
    }
    return created;
  }

  async createApiKey(
    userId: string,
    organizationId: string,
    overrides?: Partial<schema.ApiKeyType>,
  ): Promise<schema.ApiKeyType> {
    const apiKey = {
      createdAt: new Date(),
      id: createId({ prefix: 'ak' }),
      isActive: true,
      key: faker.string.alphanumeric(64),
      name: faker.lorem.words(2),
      organizationId,
      userId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.ApiKeys)
      .values(apiKey)
      .returning();
    if (!created) {
      throw new Error('Failed to create API key');
    }
    return created;
  }

  async createCompleteSetup(overrides?: {
    user?: Partial<schema.UserType>;
    org?: Partial<schema.OrgType>;
  }) {
    const user = await this.createUser(overrides?.user);
    const org = await this.createOrg(overrides?.org);
    await this.createOrgMember(user.id, org.id, 'owner');

    return { org, user };
  }
}
