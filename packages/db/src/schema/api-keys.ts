import { createId } from '@seawatts/id';
import { boolean, json, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';

import { schema } from './common';
import { apiKeyUsageTypeEnum } from './enums';
import { Orgs } from './organizations';
import { Users } from './users';

// ============================================================================
// AUTH CODES TABLE (for CLI authentication)
// ============================================================================

export const AuthCodes = schema.table('authCodes', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  })
    .$defaultFn(() => new Date(Date.now() + 1000 * 60 * 30)) // 30 minutes
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ac' }))
    .notNull()
    .primaryKey(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: text('sessionId').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  usedAt: timestamp('usedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type AuthCodeType = typeof AuthCodes.$inferSelect;

// ============================================================================
// API KEYS TABLE
// ============================================================================

export const ApiKeys = schema.table('apiKeys', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'ak' }))
    .notNull()
    .primaryKey(),
  isActive: boolean('isActive').notNull().default(true),
  key: text('key')
    .notNull()
    .unique()
    .$defaultFn(() => createId({ prefix: 'usk', prefixSeparator: '-live-' })),
  lastUsedAt: timestamp('lastUsedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  name: text('name').notNull(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type ApiKeyType = typeof ApiKeys.$inferSelect;

export const CreateApiKeySchema = createInsertSchema(ApiKeys).omit({
  createdAt: true,
  id: true,
  lastUsedAt: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});

export const UpdateApiKeySchema = createUpdateSchema(ApiKeys).omit({
  createdAt: true,
  id: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});

// ============================================================================
// API KEY USAGE TABLE
// ============================================================================

export const ApiKeyUsage = schema.table('apiKeyUsage', {
  apiKeyId: varchar('apiKeyId', { length: 128 })
    .references(() => ApiKeys.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'aku' }))
    .notNull()
    .primaryKey(),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  type: apiKeyUsageTypeEnum('type').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
});

export type ApiKeyUsageType = typeof ApiKeyUsage.$inferSelect;

export const CreateApiKeyUsageSchema = createInsertSchema(ApiKeyUsage).omit({
  createdAt: true,
  id: true,
  organizationId: true,
  updatedAt: true,
  userId: true,
});
