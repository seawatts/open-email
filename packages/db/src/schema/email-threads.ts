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
    gmailThreadId: text('gmailThreadId').notNull(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'thread' }))
      .notNull()
      .primaryKey(),

    // Gmail metadata
    subject: text('subject').notNull(),
    snippet: text('snippet'),
    labels: json('labels').$type<string[]>().default([]).notNull(),
    participantEmails: json('participantEmails')
      .$type<string[]>()
      .default([])
      .notNull(),
    messageCount: integer('messageCount').default(1).notNull(),
    isRead: boolean('isRead').default(false).notNull(),
    isStarred: boolean('isStarred').default(false).notNull(),
    isSpam: boolean('isSpam').default(false).notNull(),
    isTrash: boolean('isTrash').default(false).notNull(),
    gmailCategory: gmailCategoryEnum('gmailCategory').default('primary'),
    lastMessageAt: timestamp('lastMessageAt', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),

    // AI triage (flattened -- no separate table)
    aiSummary: text('aiSummary'),
    aiAction: suggestedActionEnum('aiAction'),
    aiConfidence: real('aiConfidence'),
    aiQuickReplies: json('aiQuickReplies')
      .$type<QuickReplyOption[]>()
      .default([]),
    aiTriagedAt: timestamp('aiTriagedAt', {
      mode: 'date',
      withTimezone: true,
    }),
    aiModelUsed: text('aiModelUsed'),

    // Status
    status: text('status').default('untriaged').notNull(),
    snoozedUntil: timestamp('snoozedUntil', {
      mode: 'date',
      withTimezone: true,
    }),

    // Search
    searchVector: tsvector('searchVector'),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
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
