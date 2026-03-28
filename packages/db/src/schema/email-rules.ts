import { createId } from '@seawatts/id';
import {
  boolean,
  integer,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';

import { schema } from './common';
import { Users } from './users';

// ============================================================================
// EMAIL RULES TABLE - Plain-English rules evaluated by AI
// ============================================================================

export const EmailRules = schema.table('emailRules', {
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'rule' }))
    .notNull()
    .primaryKey(),
  userId: varchar('userId')
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
  prompt: text('prompt').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  matchCount: integer('matchCount').default(0).notNull(),
  lastMatchedAt: timestamp('lastMatchedAt', {
    mode: 'date',
    withTimezone: true,
  }),
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
