import { createId } from '@seawatts/id';
import {
  index,
  json,
  real,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { schema } from './common';
import { EmailMessages } from './email-messages';
import { EmailThreads } from './email-threads';
import { keywordTypeEnum } from './enums';
import type { KeywordMetadataJson } from './types';

// ============================================================================
// EMAIL KEYWORDS TABLE - Searchable entities extracted from emails
// ============================================================================

export const EmailKeywords = schema.table(
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
