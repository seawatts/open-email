import { createId } from '@seawatts/id';
import {
  boolean,
  index,
  integer,
  json,
  real,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { Accounts } from './accounts';
import { schema, tsvector } from './common';
import { gmailCategoryEnum, suggestedActionEnum } from './enums';

// ============================================================================
// QUICK REPLY TYPE
// ============================================================================

export interface QuickReplyOption {
  label: string;
  body: string;
}

// ============================================================================
// EMAIL THREADS TABLE - Primary entity with triage results flattened in
// ============================================================================

export const EmailThreads = schema.table(
  'emailThreads',
  {
    accountId: varchar('accountId')
      .references(() => Accounts.id, { onDelete: 'cascade' })
      .notNull(),
    aiAction: suggestedActionEnum('aiAction'),
    aiConfidence: real('aiConfidence'),
    aiModelUsed: text('aiModelUsed'),
    aiQuickReplies: json('aiQuickReplies')
      .$type<QuickReplyOption[]>()
      .default([]),

    // AI triage (flattened -- no separate table)
    aiSummary: text('aiSummary'),
    aiTriagedAt: timestamp('aiTriagedAt', {
      mode: 'date',
      withTimezone: true,
    }),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    gmailCategory: gmailCategoryEnum('gmailCategory').default('primary'),
    gmailThreadId: text('gmailThreadId').notNull(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'thread' }))
      .notNull()
      .primaryKey(),
    isRead: boolean('isRead').default(false).notNull(),
    isSpam: boolean('isSpam').default(false).notNull(),
    isStarred: boolean('isStarred').default(false).notNull(),
    isTrash: boolean('isTrash').default(false).notNull(),
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

    // Search
    searchVector: tsvector('searchVector'),
    snippet: text('snippet'),
    snoozedUntil: timestamp('snoozedUntil', {
      mode: 'date',
      withTimezone: true,
    }),

    // Status
    status: text('status').default('untriaged').notNull(),

    // Gmail metadata
    subject: text('subject').notNull(),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique().on(table.accountId, table.gmailThreadId),
    index('idx_email_threads_search').using('gin', table.searchVector),
    index('idx_email_threads_status').on(table.status),
  ],
);

export type EmailThreadType = typeof EmailThreads.$inferSelect;

export const CreateEmailThreadSchema = createInsertSchema(EmailThreads).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
