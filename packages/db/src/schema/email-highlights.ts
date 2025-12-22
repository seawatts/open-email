import { createId } from '@seawatts/id';
import { json, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { schema } from './common';
import { EmailMessages } from './email-messages';
import { EmailThreads } from './email-threads';
import { highlightTypeEnum } from './enums';
import type { HighlightDataJson } from './types';

// ============================================================================
// EMAIL HIGHLIGHTS TABLE - Extracted key information (Inbox-style)
// ============================================================================

export const EmailHighlights = schema.table('emailHighlights', {
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
