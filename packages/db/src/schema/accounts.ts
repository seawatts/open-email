import { createId } from '@seawatts/id';
import { text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { schema } from './common';
import { Users } from './users';

// ============================================================================
// ACCOUNTS TABLE - Better Auth OAuth providers
// ============================================================================

export const Accounts = schema.table('account', {
  accessToken: text('accessToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  accountId: text('accountId').notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'acc' }))
    .notNull()
    .primaryKey(),
  idToken: text('idToken'),
  // Gmail sync state fields
  lastHistoryId: text('lastHistoryId'),
  lastSyncAt: timestamp('lastSyncAt', {
    mode: 'date',
    withTimezone: true,
  }),
  password: text('password'),
  providerId: text('providerId').notNull(),
  refreshToken: text('refreshToken'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  scope: text('scope'),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
  // Gmail Pub/Sub watch fields
  watchExpiration: timestamp('watchExpiration', {
    mode: 'date',
    withTimezone: true,
  }),
  watchHistoryId: text('watchHistoryId'),
});

export type AccountType = typeof Accounts.$inferSelect;

// ============================================================================
// VERIFICATIONS TABLE - Better Auth email verification
// ============================================================================

export const Verifications = schema.table('verification', {
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
    .$defaultFn(() => createId({ prefix: 'ver' }))
    .notNull()
    .primaryKey(),
  identifier: text('identifier').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  value: text('value').notNull(),
});

export type VerificationType = typeof Verifications.$inferSelect;
