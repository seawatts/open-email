import { faker } from '@faker-js/faker';
import * as schema from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export class TestFactories {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  // ============================================================================
  // Email Keywords factory
  // ============================================================================

  async createEmailKeyword(
    threadId: string,
    overrides?: Partial<schema.EmailKeywordType>,
  ): Promise<schema.EmailKeywordType> {
    const keywordTypes = schema.keywordTypeEnum.enumValues;
    const keyword = {
      confidence: 0.9,
      createdAt: new Date(),
      id: createId({ prefix: 'kw' }),
      keyword: faker.word.noun(),
      keywordType: faker.helpers.arrayElement(keywordTypes),
      metadata: {},
      originalText: faker.lorem.sentence(),
      threadId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.EmailKeywords)
      .values(keyword)
      .returning();
    if (!created) {
      throw new Error('Failed to create email keyword');
    }
    return created;
  }

  /**
   * Create multiple keywords for a thread
   */
  async createEmailKeywords(
    threadId: string,
    keywords: Array<{
      keyword: string;
      keywordType: schema.EmailKeywordType['keywordType'];
      originalText?: string;
      confidence?: number;
    }>,
  ): Promise<schema.EmailKeywordType[]> {
    const created: schema.EmailKeywordType[] = [];
    for (const kw of keywords) {
      const result = await this.createEmailKeyword(threadId, kw);
      created.push(result);
    }
    return created;
  }

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

  async createEmailHighlight(
    threadId: string,
    overrides?: Partial<schema.EmailHighlightType>,
  ): Promise<schema.EmailHighlightType> {
    const highlight = {
      createdAt: new Date(),
      data: {
        carrier: 'UPS',
        trackingNumber: faker.string.alphanumeric(18),
        type: 'package_tracking' as const,
      },
      highlightType: 'package_tracking' as const,
      id: createId({ prefix: 'highlight' }),
      threadId,
      title: 'Package from Amazon',
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.EmailHighlights)
      .values(highlight)
      .returning();
    if (!created) {
      throw new Error('Failed to create email highlight');
    }
    return created;
  }

  async createAgentDecision(
    threadId: string,
    overrides?: Partial<schema.AgentDecisionType>,
  ): Promise<schema.AgentDecisionType> {
    const decision = {
      category: 'fyi' as const,
      completionTokens: 100,
      confidence: 0.85,
      createdAt: new Date(),
      draftReplies: [],
      id: createId({ prefix: 'decision' }),
      modelUsed: 'gpt-4o-mini',
      promptTokens: 200,
      rawOutput: JSON.stringify({ test: true }),
      reasons: ['Test reason'],
      smartActions: [],
      suggestedAction: 'archive' as const,
      suggestedLabels: [],
      summary: 'Test summary',
      threadId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.AgentDecisions)
      .values(decision)
      .returning();
    if (!created) {
      throw new Error('Failed to create agent decision');
    }
    return created;
  }

  async createUserEmailSettings(
    userId: string,
    overrides?: Partial<schema.UserEmailSettingsType>,
  ): Promise<schema.UserEmailSettingsType> {
    const settings = {
      agentMode: 'approval' as const,
      autoActionsAllowed: ['archive', 'label'],
      requireApprovalDomains: [],
      toneProfile: {
        customInstructions: 'Be professional and friendly',
        style: 'friendly' as const,
      },
      userId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.UserEmailSettings)
      .values(settings)
      .returning();
    if (!created) {
      throw new Error('Failed to create user email settings');
    }
    return created;
  }

  /**
   * Create a complete email setup for testing
   */
  async createEmailSetup(options?: {
    bundleType?: schema.EmailThreadType['bundleType'];
    messageCount?: number;
    threadCount?: number;
  }) {
    const user = await this.createUser();
    const gmailAccount = await this.createGmailAccount(user.id);
    await this.createUserEmailSettings(user.id);

    const threads: schema.EmailThreadType[] = [];
    const messages: schema.EmailMessageType[] = [];

    const threadCount = options?.threadCount ?? 1;
    const messageCount = options?.messageCount ?? 1;

    for (let t = 0; t < threadCount; t++) {
      const thread = await this.createEmailThread(gmailAccount.id, {
        bundleType: options?.bundleType ?? 'personal',
      });
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

  /**
   * Create sample emails for different bundle types
   */
  async createBundleTypeEmails(_userId: string, gmailAccountId: string) {
    const bundleTypes: schema.EmailThreadType['bundleType'][] = [
      'travel',
      'purchases',
      'finance',
      'social',
      'promos',
      'updates',
      'forums',
      'personal',
    ];

    const threads: schema.EmailThreadType[] = [];

    for (const bundleType of bundleTypes) {
      const thread = await this.createEmailThread(gmailAccountId, {
        bundleType,
        subject: `Test ${bundleType} email`,
      });
      threads.push(thread);

      await this.createEmailMessage(thread.id, {
        bodyPreview: `This is a ${bundleType} type email for testing`,
        subject: thread.subject,
      });
    }

    return threads;
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
    // Create user
    const user = await this.createUser(overrides?.user);

    // Create org
    const org = await this.createOrg(overrides?.org);

    // Add user as org owner
    await this.createOrgMember(user.id, org.id, 'owner');

    return { org, user };
  }

  // ============================================================================
  // User Memory and Profile factories
  // ============================================================================

  async createUserMemory(
    userId: string,
    overrides?: Partial<schema.UserMemoryType>,
  ): Promise<schema.UserMemoryType> {
    const memoryTypes = schema.memoryTypeEnum.enumValues;
    const memory = {
      confidence: 0.9,
      content: faker.lorem.sentence(),
      memoryType: faker.helpers.arrayElement(memoryTypes),
      source: 'email_analysis',
      userId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.UserMemory)
      .values(memory)
      .returning();
    if (!created) {
      throw new Error('Failed to create user memory');
    }
    return created;
  }

  async createUserMemories(
    userId: string,
    memories: Array<{
      content: string;
      memoryType: schema.UserMemoryType['memoryType'];
      confidence?: number;
      source?: string;
    }>,
  ): Promise<schema.UserMemoryType[]> {
    const created: schema.UserMemoryType[] = [];
    for (const mem of memories) {
      const result = await this.createUserMemory(userId, mem);
      created.push(result);
    }
    return created;
  }

  async createUserWritingProfile(
    userId: string,
    overrides?: Partial<schema.UserWritingProfileType>,
  ): Promise<schema.UserWritingProfileType> {
    const profile = {
      analyzedMessageCount: 10,
      averageMessageLength: 250,
      commonPhrases: [
        'Thanks for reaching out',
        'Let me know if you have questions',
      ],
      defaultFormalityLevel: 0.6,
      detectedSignature: 'Best regards,\nTest User',
      lastAnalyzedAt: new Date(),
      preferredGreeting: 'Hi',
      preferredSignoff: 'Best',
      userId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.UserWritingProfile)
      .values(profile)
      .returning();
    if (!created) {
      throw new Error('Failed to create user writing profile');
    }
    return created;
  }

  async createUserContactStyle(
    userId: string,
    overrides?: Partial<schema.UserContactStyleType>,
  ): Promise<schema.UserContactStyleType> {
    const style = {
      commonPhrases: ['Looking forward to your response'],
      contactDomain: faker.internet.domainName(),
      contactEmail: faker.internet.email(),
      formalityLevel: 0.7,
      lastMessageAt: new Date(),
      messageCount: 5,
      typicalGreeting: 'Dear',
      typicalSignoff: 'Best regards',
      userId,
      ...overrides,
    };

    const [created] = await this.db
      .insert(schema.UserContactStyle)
      .values(style)
      .returning();
    if (!created) {
      throw new Error('Failed to create user contact style');
    }
    return created;
  }

  /**
   * Create a complete user profile setup for testing
   */
  async createUserProfileSetup(userId: string) {
    const writingProfile = await this.createUserWritingProfile(userId);

    const memories = await this.createUserMemories(userId, [
      { content: 'Works at Acme Corp', memoryType: 'fact' },
      { content: 'Prefers morning meetings', memoryType: 'preference' },
      { content: 'Uses formal greetings', memoryType: 'writing_style' },
    ]);

    const contactStyles = [
      await this.createUserContactStyle(userId, {
        contactDomain: 'work.com',
        formalityLevel: 0.8,
        typicalGreeting: 'Dear',
      }),
      await this.createUserContactStyle(userId, {
        contactDomain: 'friend.com',
        formalityLevel: 0.3,
        typicalGreeting: 'Hey',
      }),
    ];

    return {
      contactStyles,
      memories,
      writingProfile,
    };
  }
}
