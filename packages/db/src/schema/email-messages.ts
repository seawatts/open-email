import { createId } from '@seawatts/id';
import {
  boolean,
  index,
  json,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { schema } from './common';
import { EmailThreads } from './email-threads';

// ============================================================================
// ATTACHMENT METADATA TYPE
// ============================================================================

export interface EmailAttachmentMeta {
  cid?: string;
  filename: string;
  id?: string;
  mimeType: string;
  size: number;
  storagePath?: string;
}

// ============================================================================
// EMAIL MESSAGES TABLE - Messages for thread rendering
// ============================================================================

export const EmailMessages = schema.table(
  'emailMessages',
  {
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'msg' }))
      .notNull()
      .primaryKey(),
    threadId: varchar('threadId')
      .references(() => EmailThreads.id, { onDelete: 'cascade' })
      .notNull(),
    gmailMessageId: text('gmailMessageId').unique().notNull(),

    // Sender / recipients
    fromEmail: text('fromEmail').notNull(),
    fromName: text('fromName'),
    toEmails: json('toEmails').$type<string[]>().default([]).notNull(),
    ccEmails: json('ccEmails').$type<string[]>().default([]),
    isFromUser: boolean('isFromUser').default(false).notNull(),

    // Content
    subject: text('subject').notNull(),
    bodyPreview: text('bodyPreview'),
    bodyHtml: text('bodyHtml'),
    bodyText: text('bodyText'),

    // Threading headers
    messageIdHeader: text('messageIdHeader'),
    inReplyTo: text('inReplyTo'),

    // Attachments
    hasAttachments: boolean('hasAttachments').default(false).notNull(),
    attachmentMeta: json('attachmentMeta')
      .$type<EmailAttachmentMeta[]>()
      .default([]),
    attachmentText: text('attachmentText'),

    // Timestamps
    internalDate: timestamp('internalDate', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_email_messages_from_email').on(table.fromEmail),
    index('idx_email_messages_internal_date').on(table.internalDate),
    index('idx_email_messages_is_from_user').on(table.isFromUser),
  ],
);

export type EmailMessageType = typeof EmailMessages.$inferSelect;

export const CreateEmailMessageSchema = createInsertSchema(EmailMessages).omit({
  createdAt: true,
  id: true,
});
