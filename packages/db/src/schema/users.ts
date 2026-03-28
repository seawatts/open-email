import { createId } from '@seawatts/id';
import { boolean, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { schema } from './common';

// ============================================================================
// USERS TABLE - Better Auth compatible
// ============================================================================

export const Users = schema.table('user', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'user' }))
    .notNull()
    .primaryKey(),
  image: text('image'),
  lastLoginMethod: text('lastLoginMethod'),
  name: text('name').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export type UserType = typeof Users.$inferSelect;

export const CreateUserSchema = createInsertSchema(Users).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
