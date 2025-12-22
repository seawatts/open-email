import { createId } from '@seawatts/id';
import {
  boolean,
  index,
  integer,
  json,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { Accounts } from './accounts';
import { schema, tsvector } from './common';
import { bundleTypeEnum } from './enums';

// ============================================================================
// EMAIL THREADS TABLE - Thread metadata
// ============================================================================

export const EmailThreads = schema.table(
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
    // References the better-auth account table (Google OAuth account)
    accountId: varchar('accountId')
      .references(() => Accounts.id, {
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
    unique().on(table.accountId, table.gmailThreadId),
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
