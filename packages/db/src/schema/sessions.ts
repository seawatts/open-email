import { createId } from '@seawatts/id';
import { text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { schema } from './common';
import { Orgs } from './organizations';
import { Users } from './users';

// ============================================================================
// SESSIONS TABLE - Better Auth required
// ============================================================================

export const Sessions = schema.table('session', {
  // Organization context - Better Auth organization plugin
  activeOrganizationId: varchar('activeOrganizationId', {
    length: 128,
  }).references(() => Orgs.id, { onDelete: 'set null' }),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'sess' }))
    .notNull()
    .primaryKey(),
  ipAddress: text('ipAddress'),
  token: text('token').notNull().unique(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userAgent: text('userAgent'),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type SessionType = typeof Sessions.$inferSelect;
