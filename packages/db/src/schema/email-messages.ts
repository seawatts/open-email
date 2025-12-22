import { createId } from '@seawatts/id';
import { boolean, json, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { schema } from './common';
import { EmailThreads } from './email-threads';

// ============================================================================
// EMAIL MESSAGES TABLE - Individual messages in threads
// ============================================================================

export const EmailMessages = schema.table('emailMessages', {
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
