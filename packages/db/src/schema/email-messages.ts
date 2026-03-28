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
    attachmentMeta: json('attachmentMeta')
      .$type<EmailAttachmentMeta[]>()
      .default([]),
    attachmentText: text('attachmentText'),
    bodyHtml: text('bodyHtml'),
    bodyPreview: text('bodyPreview'),
    bodyText: text('bodyText'),
    ccEmails: json('ccEmails').$type<string[]>().default([]),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    // Sender / recipients
    fromEmail: text('fromEmail').notNull(),
    fromName: text('fromName'),
    gmailMessageId: text('gmailMessageId').unique().notNull(),

    // Attachments
    hasAttachments: boolean('hasAttachments').default(false).notNull(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'msg' }))
      .notNull()
      .primaryKey(),
    inReplyTo: text('inReplyTo'),

    // Timestamps
    internalDate: timestamp('internalDate', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    isFromUser: boolean('isFromUser').default(false).notNull(),

    // Threading headers
    messageIdHeader: text('messageIdHeader'),

    // Content
    subject: text('subject').notNull(),
    threadId: varchar('threadId')
      .references(() => EmailThreads.id, { onDelete: 'cascade' })
      .notNull(),
    toEmails: json('toEmails').$type<string[]>().default([]).notNull(),
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
