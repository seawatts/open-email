import { createId } from '@seawatts/id';
import { relations } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

// Custom type for PostgreSQL tsvector (full-text search)
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

// Helper function to get user ID from JWT (Supabase only)
// const requestingUserId = () => sql`requesting_user_id()`;

// Helper function to get org ID from JWT (Supabase only)
// const requestingOrgId = () => sql`requesting_org_id()`;

export const userRoleEnum = pgEnum('userRole', ['admin', 'superAdmin', 'user']);
export const localConnectionStatusEnum = pgEnum('localConnectionStatus', [
  'connected',
  'disconnected',
]);
export const stripeSubscriptionStatusEnum = pgEnum('stripeSubscriptionStatus', [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
]);

export const apiKeyUsageTypeEnum = pgEnum('apiKeyUsageType', ['mcp-server']);

// Email Agent Enums
export const emailCategoryEnum = pgEnum('emailCategory', [
  'urgent',
  'needs_reply',
  'awaiting_other',
  'fyi',
  'spam_like',
]);

export const suggestedActionEnum = pgEnum('suggestedAction', [
  'reply',
  'follow_up',
  'archive',
  'label',
  'ignore',
]);

export const emailActionTypeEnum = pgEnum('emailActionType', [
  'send',
  'archive',
  'label',
  'snooze',
  'delete',
  'smart_action',
]);

export const emailActionStatusEnum = pgEnum('emailActionStatus', [
  'pending',
  'approved',
  'rejected',
  'executed',
  'failed',
]);

export const agentModeEnum = pgEnum('agentMode', ['approval', 'auto']);

export const emailRuleTypeEnum = pgEnum('emailRuleType', [
  'auto_archive',
  'auto_label',
  'always_ask',
  'tone',
]);

// Inbox-style bundle types for grouping emails
export const bundleTypeEnum = pgEnum('bundleType', [
  'travel', // Flights, hotels, car rentals, trip confirmations
  'purchases', // Order confirmations, shipping updates, receipts
  'finance', // Bank statements, bills, invoices, payments
  'social', // Social network notifications
  'promos', // Marketing, deals, newsletters
  'updates', // Automated updates, notifications, alerts
  'forums', // Mailing lists, group discussions
  'personal', // Personal correspondence (default)
]);

// Highlight types for extracted key information
export const highlightTypeEnum = pgEnum('highlightType', [
  'flight', // Flight number, departure/arrival times, airports
  'hotel', // Check-in/out dates, hotel name, confirmation
  'package_tracking', // Tracking number, carrier, delivery date
  'payment', // Amount, due date, payee
  'event', // Event name, date/time, location
  'reservation', // Restaurant, appointment, booking reference
  'action_item', // Specific task or request extracted
]);

// Keyword types for email search indexing
export const keywordTypeEnum = pgEnum('keywordType', [
  'person', // Names of people
  'company', // Company/organization names
  'location', // Cities, countries, addresses
  'topic', // Themes like 'trip', 'meeting', 'invoice'
  'temporal', // Date references ('next week', 'Dec 20')
  'action', // Action items ('review', 'approve', 'sign')
  'attachment', // Attachment names/types
  'financial', // Amounts, currencies
  'product', // Product names, order numbers
]);

export const UserRoleType = z.enum(userRoleEnum.enumValues).enum;
export const LocalConnectionStatusType = z.enum(
  localConnectionStatusEnum.enumValues,
).enum;
export const StripeSubscriptionStatusType = z.enum(
  stripeSubscriptionStatusEnum.enumValues,
).enum;
export const ApiKeyUsageTypeType = z.enum(apiKeyUsageTypeEnum.enumValues).enum;

// Email Agent Zod Types
export const EmailCategoryType = z.enum(emailCategoryEnum.enumValues).enum;
export const SuggestedActionType = z.enum(suggestedActionEnum.enumValues).enum;
export const EmailActionTypeType = z.enum(emailActionTypeEnum.enumValues).enum;
export const EmailActionStatusType = z.enum(
  emailActionStatusEnum.enumValues,
).enum;
export const AgentModeType = z.enum(agentModeEnum.enumValues).enum;
export const EmailRuleTypeType = z.enum(emailRuleTypeEnum.enumValues).enum;
export const BundleTypeType = z.enum(bundleTypeEnum.enumValues).enum;
export const HighlightTypeType = z.enum(highlightTypeEnum.enumValues).enum;
export const KeywordTypeType = z.enum(keywordTypeEnum.enumValues).enum;

export const Users = pgTable('user', {
  avatarUrl: text('avatarUrl'),
  // DEPRECATED: Legacy Clerk field - remove after full Better-Auth migration
  clerkId: text('clerkId').unique(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  firstName: text('firstName'),
  id: varchar('id', { length: 128 }).notNull().primaryKey(),
  image: text('image'), // Better-Auth compatible
  lastLoggedInAt: timestamp('lastLoggedInAt', {
    mode: 'date',
    withTimezone: true,
  }),
  lastName: text('lastName'),
  name: text('name'), // Better-Auth compatible
  online: boolean('online').default(false).notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export const UsersRelations = relations(Users, ({ one, many }) => ({
  apiKeys: many(ApiKeys),
  apiKeyUsage: many(ApiKeyUsage),
  authCodes: many(AuthCodes),
  contactStyles: many(UserContactStyle),
  emailRules: many(EmailRules),
  emailSettings: one(UserEmailSettings),
  gmailAccounts: many(GmailAccounts),
  memories: many(UserMemory),
  orgMembers: many(OrgMembers),
  writingProfile: one(UserWritingProfile),
}));

export type UserType = typeof Users.$inferSelect;

export const CreateUserSchema = createInsertSchema(Users).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

// Better-Auth Tables
export const Accounts = pgTable('account', {
  accessToken: text('accessToken'),
  accountId: text('accountId').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', withTimezone: true }),
  id: varchar('id', { length: 128 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId({ prefix: 'acc' })),
  idToken: text('idToken'),
  password: text('password'),
  providerId: text('providerId').notNull(),
  refreshToken: text('refreshToken'),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .notNull()
    .references(() => Users.id, { onDelete: 'cascade' }),
});

export const Sessions = pgTable('session', {
  activeOrganizationId: varchar('activeOrganizationId', {
    length: 128,
  }).references(() => Orgs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId({ prefix: 'session' })),
  ipAddress: text('ipAddress'),
  token: text('token').notNull().unique(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userAgent: text('userAgent'),
  userId: varchar('userId', { length: 128 })
    .notNull()
    .references(() => Users.id, { onDelete: 'cascade' }),
});

export const Verifications = pgTable('verification', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  }).defaultNow(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId({ prefix: 'ver' })),
  identifier: text('identifier').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  value: text('value').notNull(),
});

export const Invitations = pgTable('invitation', {
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  email: text('email').notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId({ prefix: 'inv' })),
  inviterId: varchar('inviterId', { length: 128 }).references(() => Users.id, {
    onDelete: 'set null',
  }),
  organizationId: varchar('organizationId', { length: 128 })
    .notNull()
    .references(() => Orgs.id, { onDelete: 'cascade' }),
  role: text('role'),
  status: text('status').notNull().default('pending'),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export const Orgs = pgTable('orgs', {
  // DEPRECATED: Legacy Clerk field - remove after full Better-Auth migration
  clerkOrgId: text('clerkOrgId').unique(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  }).defaultNow(),
  createdByUserId: varchar('createdByUserId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'org' }))
    .notNull()
    .primaryKey(),
  name: text('name').notNull().unique(),
  // Stripe fields
  stripeCustomerId: text('stripeCustomerId'),
  stripeSubscriptionId: text('stripeSubscriptionId'),
  stripeSubscriptionStatus: stripeSubscriptionStatusEnum(
    'stripeSubscriptionStatus',
  ),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export type OrgType = typeof Orgs.$inferSelect;

export const updateOrgSchema = createInsertSchema(Orgs).omit({
  createdAt: true,
  createdByUserId: true,
  id: true,
  updatedAt: true,
});

export const OrgsRelations = relations(Orgs, ({ one, many }) => ({
  apiKeys: many(ApiKeys),
  apiKeyUsage: many(ApiKeyUsage),
  authCodes: many(AuthCodes),
  createdByUser: one(Users, {
    fields: [Orgs.createdByUserId],
    references: [Users.id],
  }),
  orgMembers: many(OrgMembers),
}));

// Company Members Table
export const OrgMembers = pgTable(
  'orgMembers',
  {
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    }).defaultNow(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'member' }))
      .notNull()
      .primaryKey(),
    orgId: varchar('orgId')
      .references(() => Orgs.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    role: userRoleEnum('role').default('user').notNull(),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
    userId: varchar('userId')
      .references(() => Users.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (table) => [
    // Add unique constraint for userId and orgId combination using the simpler syntax
    unique().on(table.userId, table.orgId),
  ],
);

export type OrgMembersType = typeof OrgMembers.$inferSelect & {
  user?: UserType;
  org?: OrgType;
};

export const OrgMembersRelations = relations(OrgMembers, ({ one }) => ({
  org: one(Orgs, {
    fields: [OrgMembers.orgId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [OrgMembers.userId],
    references: [Users.id],
  }),
}));

export const AuthCodes = pgTable('authCodes', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  })
    .$defaultFn(() => new Date(Date.now() + 1000 * 60 * 30)) // 30 minutes
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ac' }))
    .notNull()
    .primaryKey(),
  orgId: varchar('orgId')
    .references(() => Orgs.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  sessionId: text('sessionId').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  usedAt: timestamp('usedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export type AuthCodeType = typeof AuthCodes.$inferSelect;

export const AuthCodesRelations = relations(AuthCodes, ({ one }) => ({
  org: one(Orgs, {
    fields: [AuthCodes.orgId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [AuthCodes.userId],
    references: [Users.id],
  }),
}));

// API Keys Table
export const ApiKeys = pgTable('apiKeys', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ak' }))
    .notNull()
    .primaryKey(),
  isActive: boolean('isActive').notNull().default(true),
  key: text('key')
    .notNull()
    .unique()
    .$defaultFn(() => createId({ prefix: 'usk', prefixSeparator: '-live-' })),
  lastUsedAt: timestamp('lastUsedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  name: text('name').notNull(),
  orgId: varchar('orgId')
    .references(() => Orgs.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export type ApiKeyType = typeof ApiKeys.$inferSelect;

export const CreateApiKeySchema = createInsertSchema(ApiKeys).omit({
  createdAt: true,
  id: true,
  lastUsedAt: true,
  orgId: true,
  updatedAt: true,
  userId: true,
});

export const UpdateApiKeySchema = createUpdateSchema(ApiKeys).omit({
  createdAt: true,
  id: true,
  orgId: true,
  updatedAt: true,
  userId: true,
});

export const ApiKeysRelations = relations(ApiKeys, ({ one, many }) => ({
  org: one(Orgs, {
    fields: [ApiKeys.orgId],
    references: [Orgs.id],
  }),
  usage: many(ApiKeyUsage),
  user: one(Users, {
    fields: [ApiKeys.userId],
    references: [Users.id],
  }),
}));

// API Key Usage Table
export const ApiKeyUsage = pgTable('apiKeyUsage', {
  apiKeyId: varchar('apiKeyId', { length: 128 })
    .references(() => ApiKeys.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'aku' }))
    .notNull()
    .primaryKey(),
  // Generic metadata for different usage types
  metadata: json('metadata').$type<Record<string, unknown>>(),
  orgId: varchar('orgId')
    .references(() => Orgs.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  type: apiKeyUsageTypeEnum('type').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export type ApiKeyUsageType = typeof ApiKeyUsage.$inferSelect;

export const CreateApiKeyUsageSchema = createInsertSchema(ApiKeyUsage).omit({
  createdAt: true,
  id: true,
  orgId: true,
  updatedAt: true,
  userId: true,
});

export const ApiKeyUsageRelations = relations(ApiKeyUsage, ({ one }) => ({
  apiKey: one(ApiKeys, {
    fields: [ApiKeyUsage.apiKeyId],
    references: [ApiKeys.id],
  }),
  org: one(Orgs, {
    fields: [ApiKeyUsage.orgId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [ApiKeyUsage.userId],
    references: [Users.id],
  }),
}));

export const ShortUrls = pgTable('shortUrls', {
  code: varchar('code', { length: 128 }).notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  }).defaultNow(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'shortUrl' }))
    .notNull()
    .primaryKey(),
  isActive: boolean('isActive').notNull().default(true),
  orgId: varchar('orgId')
    .references(() => Orgs.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  redirectUrl: text('redirectUrl').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export type ShortUrlType = typeof ShortUrls.$inferSelect;

export const CreateShortUrlSchema = createInsertSchema(ShortUrls).omit({
  createdAt: true,
  id: true,
  orgId: true,
  updatedAt: true,
  userId: true,
});

export const UpdateShortUrlSchema = createUpdateSchema(ShortUrls).omit({
  createdAt: true,
  id: true,
  orgId: true,
  updatedAt: true,
  userId: true,
});

export const ShortUrlsRelations = relations(ShortUrls, ({ one }) => ({
  org: one(Orgs, {
    fields: [ShortUrls.orgId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [ShortUrls.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// Email Agent Tables
// ============================================================================

// Gmail Accounts - OAuth tokens and sync state
export const GmailAccounts = pgTable(
  'gmailAccounts',
  {
    accessToken: text('accessToken').notNull(), // encrypted
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    email: text('email').notNull(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'gmail' }))
      .notNull()
      .primaryKey(),
    lastHistoryId: text('lastHistoryId'),
    lastSyncAt: timestamp('lastSyncAt', {
      mode: 'date',
      withTimezone: true,
    }),
    refreshToken: text('refreshToken').notNull(), // encrypted
    tokenExpiry: timestamp('tokenExpiry', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
    userId: varchar('userId')
      .references(() => Users.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.email)],
);

export type GmailAccountType = typeof GmailAccounts.$inferSelect;

export const CreateGmailAccountSchema = createInsertSchema(GmailAccounts).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const GmailAccountsRelations = relations(
  GmailAccounts,
  ({ one, many }) => ({
    emailThreads: many(EmailThreads),
    user: one(Users, {
      fields: [GmailAccounts.userId],
      references: [Users.id],
    }),
  }),
);

// Email Threads - Thread metadata
export const EmailThreads = pgTable(
  'emailThreads',
  {
    // AI-generated summary for quick search and context
    aiSummary: text('aiSummary'),
    aiSummaryUpdatedAt: timestamp('aiSummaryUpdatedAt', {
      mode: 'date',
      withTimezone: true,
    }),
    // Inbox-style bundle type for grouping
    bundleType: bundleTypeEnum('bundleType').default('personal'),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    gmailAccountId: varchar('gmailAccountId')
      .references(() => GmailAccounts.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    gmailThreadId: text('gmailThreadId').notNull(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'thread' }))
      .notNull()
      .primaryKey(),
    // Inbox-style pinning
    isPinned: boolean('isPinned').default(false).notNull(),
    isRead: boolean('isRead').default(false).notNull(),
    labels: json('labels').$type<string[]>().default([]).notNull(),
    lastMessageAt: timestamp('lastMessageAt', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    messageCount: integer('messageCount').default(1).notNull(),
    participantEmails: json('participantEmails')
      .$type<string[]>()
      .default([])
      .notNull(),
    // Full-text search vector for fast text search
    searchVector: tsvector('searchVector'),
    snippet: text('snippet'),
    subject: text('subject').notNull(),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique().on(table.gmailAccountId, table.gmailThreadId),
    // GIN index for full-text search
    index('idx_email_threads_search').using('gin', table.searchVector),
  ],
);

export type EmailThreadType = typeof EmailThreads.$inferSelect;

export const CreateEmailThreadSchema = createInsertSchema(EmailThreads).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const EmailThreadsRelations = relations(
  EmailThreads,
  ({ one, many }) => ({
    agentDecisions: many(AgentDecisions),
    emailActions: many(EmailActions),
    emailHighlights: many(EmailHighlights),
    emailKeywords: many(EmailKeywords),
    emailMessages: many(EmailMessages),
    gmailAccount: one(GmailAccounts, {
      fields: [EmailThreads.gmailAccountId],
      references: [GmailAccounts.id],
    }),
  }),
);

// Email Messages - Individual messages in threads
export const EmailMessages = pgTable('emailMessages', {
  // AI summary of individual message
  aiSummary: text('aiSummary'),
  attachmentMeta: json('attachmentMeta')
    .$type<{ filename: string; mimeType: string; size: number }[]>()
    .default([]),
  bodyPreview: text('bodyPreview'),
  ccEmails: json('ccEmails').$type<string[]>().default([]),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  fromEmail: text('fromEmail').notNull(),
  fromName: text('fromName'),
  gmailMessageId: text('gmailMessageId').unique().notNull(),
  hasAttachments: boolean('hasAttachments').default(false).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'msg' }))
    .notNull()
    .primaryKey(),
  internalDate: timestamp('internalDate', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  // Flag if this message is from the user (for writing style extraction)
  isFromUser: boolean('isFromUser').default(false).notNull(),
  snippet: text('snippet'),
  subject: text('subject').notNull(),
  threadId: varchar('threadId')
    .references(() => EmailThreads.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  toEmails: json('toEmails').$type<string[]>().default([]).notNull(),
});

export type EmailMessageType = typeof EmailMessages.$inferSelect;

export const CreateEmailMessageSchema = createInsertSchema(EmailMessages).omit({
  createdAt: true,
  id: true,
});

export const EmailMessagesRelations = relations(
  EmailMessages,
  ({ one, many }) => ({
    keywords: many(EmailKeywords),
    thread: one(EmailThreads, {
      fields: [EmailMessages.threadId],
      references: [EmailThreads.id],
    }),
  }),
);

// ============================================================================
// Email Highlights - Extracted key information (Inbox-style)
// ============================================================================

// Highlight data types for JSON storage
export type HighlightDataFlight = {
  airline: string;
  arrival: string;
  arrivalTime: string;
  departure: string;
  departureTime: string;
  flightNumber: string;
  type: 'flight';
};

export type HighlightDataHotel = {
  checkIn: string;
  checkOut: string;
  confirmationNumber?: string;
  hotelName: string;
  type: 'hotel';
};

export type HighlightDataPackageTracking = {
  carrier: string;
  estimatedDelivery?: string;
  status?: string;
  trackingNumber: string;
  type: 'package_tracking';
};

export type HighlightDataPayment = {
  amount: string;
  currency: string;
  dueDate?: string;
  payee?: string;
  type: 'payment';
};

export type HighlightDataEvent = {
  dateTime: string;
  eventName: string;
  location?: string;
  type: 'event';
};

export type HighlightDataReservation = {
  confirmationNumber?: string;
  dateTime: string;
  partySize?: number;
  type: 'reservation';
  venue: string;
};

export type HighlightDataActionItem = {
  assignedBy?: string;
  deadline?: string;
  task: string;
  type: 'action_item';
};

export type HighlightDataJson =
  | HighlightDataFlight
  | HighlightDataHotel
  | HighlightDataPackageTracking
  | HighlightDataPayment
  | HighlightDataEvent
  | HighlightDataReservation
  | HighlightDataActionItem;

export const EmailHighlights = pgTable('emailHighlights', {
  // Action
  actionLabel: text('actionLabel'), // e.g., "Track Package"
  actionUrl: text('actionUrl'), // Link to track/view
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  // Structured data based on type
  data: json('data').$type<HighlightDataJson>().notNull(),

  // Type
  highlightType: highlightTypeEnum('highlightType').notNull(),

  // Display
  icon: text('icon'), // Lucide icon name
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'highlight' }))
    .notNull()
    .primaryKey(),

  // References
  messageId: varchar('messageId').references(() => EmailMessages.id, {
    onDelete: 'cascade',
  }),

  subtitle: text('subtitle'), // e.g., "Dec 20, 2025 at 2:30 PM"
  threadId: varchar('threadId')
    .references(() => EmailThreads.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  title: text('title').notNull(), // e.g., "Flight to NYC"
});

export type EmailHighlightType = typeof EmailHighlights.$inferSelect;

export const CreateEmailHighlightSchema = createInsertSchema(
  EmailHighlights,
).omit({
  createdAt: true,
  id: true,
});

export const EmailHighlightsRelations = relations(
  EmailHighlights,
  ({ one }) => ({
    message: one(EmailMessages, {
      fields: [EmailHighlights.messageId],
      references: [EmailMessages.id],
    }),
    thread: one(EmailThreads, {
      fields: [EmailHighlights.threadId],
      references: [EmailThreads.id],
    }),
  }),
);

// ============================================================================
// Email Keywords - Searchable entities extracted from emails
// ============================================================================

// Metadata types for keyword-specific data
export type KeywordMetadataTemporal = {
  resolvedDate?: string; // ISO date string
  isRelative: boolean; // "next week" vs "Dec 20"
  originalText: string;
};

export type KeywordMetadataFinancial = {
  amount: number;
  currency: string;
  originalText: string;
};

export type KeywordMetadataLocation = {
  city?: string;
  country?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
};

export type KeywordMetadataAttachment = {
  filename: string;
  mimeType: string;
  extractedText?: string; // OCR text from image/PDF
};

export type KeywordMetadataJson =
  | KeywordMetadataTemporal
  | KeywordMetadataFinancial
  | KeywordMetadataLocation
  | KeywordMetadataAttachment
  | Record<string, unknown>;

export const EmailKeywords = pgTable(
  'emailKeywords',
  {
    // Confidence score from AI extraction (0-1)
    confidence: real('confidence').default(1.0),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'kw' }))
      .notNull()
      .primaryKey(),
    // Normalized keyword (lowercase, trimmed)
    keyword: text('keyword').notNull(),
    // Type of keyword for filtering
    keywordType: keywordTypeEnum('keywordType').notNull(),
    // Optional reference to specific message
    messageId: varchar('messageId').references(() => EmailMessages.id, {
      onDelete: 'cascade',
    }),
    // Type-specific metadata (dates, amounts, coordinates, etc.)
    metadata: json('metadata').$type<KeywordMetadataJson>(),
    // Original text as it appeared in the email
    originalText: text('originalText'),
    // Reference to thread (required)
    threadId: varchar('threadId')
      .references(() => EmailThreads.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (table) => [
    // Index for fast keyword lookups
    index('idx_email_keywords_keyword').on(table.keyword),
    // Index for type-based filtering
    index('idx_email_keywords_type').on(table.keywordType),
    // Composite index for thread + type queries
    index('idx_email_keywords_thread_type').on(
      table.threadId,
      table.keywordType,
    ),
  ],
);

export type EmailKeywordType = typeof EmailKeywords.$inferSelect;

export const CreateEmailKeywordSchema = createInsertSchema(EmailKeywords).omit({
  createdAt: true,
  id: true,
});

export const EmailKeywordsRelations = relations(EmailKeywords, ({ one }) => ({
  message: one(EmailMessages, {
    fields: [EmailKeywords.messageId],
    references: [EmailMessages.id],
  }),
  thread: one(EmailThreads, {
    fields: [EmailKeywords.threadId],
    references: [EmailThreads.id],
  }),
}));

// Draft Reply type for JSON storage
export type DraftReplyJson = {
  id: string;
  subject: string;
  body: string;
  tone: string;
};

// Smart Action type for JSON storage
export type SmartActionJson = {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  url?: string;
  payload?: Record<string, unknown>;
  confirmRequired?: boolean;
  estimatedTime?: string;
};

// Agent Decisions - AI triage results
export const AgentDecisions = pgTable('agentDecisions', {
  category: emailCategoryEnum('category').notNull(),
  completionTokens: integer('completionTokens').default(0),
  confidence: real('confidence').notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  draftReplies: json('draftReplies').$type<DraftReplyJson[]>().default([]),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'decision' }))
    .notNull()
    .primaryKey(),
  modelUsed: text('modelUsed').notNull(),
  promptTokens: integer('promptTokens').default(0),
  rawOutput: text('rawOutput'),
  reasons: json('reasons').$type<string[]>().default([]).notNull(),
  smartActions: json('smartActions').$type<SmartActionJson[]>().default([]),
  suggestedAction: suggestedActionEnum('suggestedAction').notNull(),
  suggestedLabels: json('suggestedLabels').$type<string[]>().default([]),
  summary: text('summary'),
  threadId: varchar('threadId')
    .references(() => EmailThreads.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export type AgentDecisionType = typeof AgentDecisions.$inferSelect;

export const CreateAgentDecisionSchema = createInsertSchema(
  AgentDecisions,
).omit({
  createdAt: true,
  id: true,
});

export const AgentDecisionsRelations = relations(AgentDecisions, ({ one }) => ({
  thread: one(EmailThreads, {
    fields: [AgentDecisions.threadId],
    references: [EmailThreads.id],
  }),
}));

// Email Actions - Pending/executed actions
export const EmailActions = pgTable('emailActions', {
  actionType: emailActionTypeEnum('actionType').notNull(),
  agentDecisionId: varchar('agentDecisionId').references(
    () => AgentDecisions.id,
  ),
  approvedAt: timestamp('approvedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  approvedBy: varchar('approvedBy').references(() => Users.id),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  error: text('error'),
  executedAt: timestamp('executedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'action' }))
    .notNull()
    .primaryKey(),
  payload: json('payload').$type<Record<string, unknown>>().default({}),
  status: emailActionStatusEnum('status').default('pending').notNull(),
  threadId: varchar('threadId')
    .references(() => EmailThreads.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export type EmailActionType = typeof EmailActions.$inferSelect;

export const CreateEmailActionSchema = createInsertSchema(EmailActions).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const EmailActionsRelations = relations(EmailActions, ({ one }) => ({
  agentDecision: one(AgentDecisions, {
    fields: [EmailActions.agentDecisionId],
    references: [AgentDecisions.id],
  }),
  approvedByUser: one(Users, {
    fields: [EmailActions.approvedBy],
    references: [Users.id],
  }),
  thread: one(EmailThreads, {
    fields: [EmailActions.threadId],
    references: [EmailThreads.id],
  }),
}));

// Rule Conditions type for JSON storage
export type RuleConditionsJson = {
  senderEmails?: string[];
  senderDomains?: string[];
  subjectContains?: string[];
  labelIds?: string[];
};

// Rule Actions type for JSON storage
export type RuleActionsJson = {
  labelId?: string;
  archive?: boolean;
  requireApproval?: boolean;
  toneProfile?: {
    style: 'short' | 'direct' | 'friendly' | 'formal' | 'casual';
    maxLength?: number;
    customInstructions?: string;
  };
};

// Email Rules - User-defined automation rules
export const EmailRules = pgTable('emailRules', {
  actions: json('actions').$type<RuleActionsJson>().default({}).notNull(),
  conditions: json('conditions')
    .$type<RuleConditionsJson>()
    .default({})
    .notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'rule' }))
    .notNull()
    .primaryKey(),
  isActive: boolean('isActive').default(true).notNull(),
  ruleType: emailRuleTypeEnum('ruleType').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export type EmailRuleType = typeof EmailRules.$inferSelect;

export const CreateEmailRuleSchema = createInsertSchema(EmailRules).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const UpdateEmailRuleSchema = createUpdateSchema(EmailRules).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  userId: true,
});

export const EmailRulesRelations = relations(EmailRules, ({ one }) => ({
  user: one(Users, {
    fields: [EmailRules.userId],
    references: [Users.id],
  }),
}));

// User Email Settings - Agent preferences
export type ToneProfileJson = {
  style: 'short' | 'direct' | 'friendly' | 'formal' | 'casual';
  maxLength?: number;
  customInstructions?: string;
};

export const UserEmailSettings = pgTable('userEmailSettings', {
  agentMode: agentModeEnum('agentMode').default('approval').notNull(),
  autoActionsAllowed: json('autoActionsAllowed')
    .$type<string[]>()
    .default([])
    .notNull(),
  requireApprovalDomains: json('requireApprovalDomains')
    .$type<string[]>()
    .default([])
    .notNull(),
  toneProfile: json('toneProfile').$type<ToneProfileJson>(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull()
    .primaryKey(),
});

export type UserEmailSettingsType = typeof UserEmailSettings.$inferSelect;

export const CreateUserEmailSettingsSchema = createInsertSchema(
  UserEmailSettings,
).omit({
  updatedAt: true,
});

export const UpdateUserEmailSettingsSchema = createUpdateSchema(
  UserEmailSettings,
).omit({
  updatedAt: true,
  userId: true,
});

export const UserEmailSettingsRelations = relations(
  UserEmailSettings,
  ({ one }) => ({
    user: one(Users, {
      fields: [UserEmailSettings.userId],
      references: [Users.id],
    }),
  }),
);

// ============================================================================
// User Memory - ChatGPT-style long-term facts (adapted from ChatGPT memory)
// ============================================================================

// Memory types for categorizing user facts
export const memoryTypeEnum = pgEnum('memoryType', [
  'fact', // Explicit fact (name, company, role)
  'preference', // Communication preferences
  'writing_style', // Writing patterns
  'signature', // Email signature patterns
  'relationship', // Relationships with contacts
]);

export const MemoryTypeType = z.enum(memoryTypeEnum.enumValues).enum;

// UserMemory - Stores explicit long-term facts about the user
export const UserMemory = pgTable(
  'userMemory',
  {
    // How confident we are in this fact (0-1)
    confidence: real('confidence').default(1.0),
    // The actual fact/pattern content
    content: text('content').notNull(),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'mem' }))
      .notNull()
      .primaryKey(),
    // Type of memory for categorization
    memoryType: memoryTypeEnum('memoryType').notNull(),
    // Optional metadata (type-specific data)
    metadata: json('metadata').$type<Record<string, unknown>>(),
    // Where this fact was extracted from (thread ID, message ID, etc.)
    source: text('source'),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
    // Reference to user
    userId: varchar('userId')
      .references(() => Users.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (table) => [
    // Index for fast user lookups
    index('idx_user_memory_user').on(table.userId),
    // Index for type-based filtering
    index('idx_user_memory_type').on(table.userId, table.memoryType),
  ],
);

export type UserMemoryType = typeof UserMemory.$inferSelect;

export const CreateUserMemorySchema = createInsertSchema(UserMemory).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const UpdateUserMemorySchema = createUpdateSchema(UserMemory).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  userId: true,
});

export const UserMemoryRelations = relations(UserMemory, ({ one }) => ({
  user: one(Users, {
    fields: [UserMemory.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// User Writing Profile - Global writing style defaults
// ============================================================================

// Vocabulary profile for detailed style analysis
export type VocabularyProfileJson = {
  technicalLevel: number; // 0 = simple, 1 = highly technical
  emojiUsage: number; // 0 = never, 1 = frequent
  contractionUsage: number; // 0 = never, 1 = always
};

// UserWritingProfile - Aggregated global writing style
export const UserWritingProfile = pgTable('userWritingProfile', {
  // Analyzed message count for statistics
  analyzedMessageCount: integer('analyzedMessageCount').default(0),
  // Average message length in characters
  averageMessageLength: integer('averageMessageLength'),
  // Common phrases the user frequently uses
  commonPhrases: json('commonPhrases').$type<string[]>(),
  // Global default formality (0 = casual, 1 = formal)
  defaultFormalityLevel: real('defaultFormalityLevel'),
  // Detected email signature
  detectedSignature: text('detectedSignature'),
  // When the profile was last analyzed
  lastAnalyzedAt: timestamp('lastAnalyzedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  // Preferred greeting (e.g., "Hi", "Hey", "Dear")
  preferredGreeting: text('preferredGreeting'),
  // Preferred sign-off (e.g., "Best", "Thanks", "Cheers")
  preferredSignoff: text('preferredSignoff'),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  // Primary key is user ID (one profile per user)
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull()
    .primaryKey(),
  // Vocabulary analysis
  vocabularyProfile: json('vocabularyProfile').$type<VocabularyProfileJson>(),
});

export type UserWritingProfileType = typeof UserWritingProfile.$inferSelect;

export const CreateUserWritingProfileSchema = createInsertSchema(
  UserWritingProfile,
).omit({
  updatedAt: true,
});

export const UpdateUserWritingProfileSchema = createUpdateSchema(
  UserWritingProfile,
).omit({
  updatedAt: true,
  userId: true,
});

export const UserWritingProfileRelations = relations(
  UserWritingProfile,
  ({ one }) => ({
    user: one(Users, {
      fields: [UserWritingProfile.userId],
      references: [Users.id],
    }),
  }),
);

// ============================================================================
// User Contact Style - Per-recipient formality (contextual writing style)
// ============================================================================

// UserContactStyle - Tracks how the user writes to specific contacts/domains
export const UserContactStyle = pgTable(
  'userContactStyle',
  {
    // Common phrases used with this contact
    commonPhrases: json('commonPhrases').$type<string[]>(),
    // Entire domain (e.g., company.com)
    contactDomain: text('contactDomain'),
    // Specific person email (e.g., john@company.com)
    contactEmail: text('contactEmail'),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    // Formality level for this contact (0 = casual, 1 = formal)
    formalityLevel: real('formalityLevel'),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'style' }))
      .notNull()
      .primaryKey(),
    // When the user last messaged this contact
    lastMessageAt: timestamp('lastMessageAt', {
      mode: 'date',
      withTimezone: true,
    }),
    // Number of messages sent to this contact
    messageCount: integer('messageCount').default(0),
    // Typical greeting used with this contact
    typicalGreeting: text('typicalGreeting'),
    // Typical sign-off used with this contact
    typicalSignoff: text('typicalSignoff'),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
    // Reference to user
    userId: varchar('userId')
      .references(() => Users.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (table) => [
    // Index for fast email lookup
    index('idx_contact_style_email').on(table.userId, table.contactEmail),
    // Index for fast domain lookup
    index('idx_contact_style_domain').on(table.userId, table.contactDomain),
  ],
);

export type UserContactStyleType = typeof UserContactStyle.$inferSelect;

export const CreateUserContactStyleSchema = createInsertSchema(
  UserContactStyle,
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const UpdateUserContactStyleSchema = createUpdateSchema(
  UserContactStyle,
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  userId: true,
});

export const UserContactStyleRelations = relations(
  UserContactStyle,
  ({ one }) => ({
    user: one(Users, {
      fields: [UserContactStyle.userId],
      references: [Users.id],
    }),
  }),
);
