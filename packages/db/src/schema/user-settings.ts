import { createId } from '@seawatts/id';
import {
  index,
  integer,
  json,
  real,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';

import { schema } from './common';
import { agentModeEnum, memoryTypeEnum } from './enums';
import type { ToneProfileJson, VocabularyProfileJson } from './types';
import { Users } from './users';

// ============================================================================
// USER EMAIL SETTINGS TABLE - Agent preferences
// ============================================================================

export const UserEmailSettings = schema.table('userEmailSettings', {
  agentMode: agentModeEnum('agentMode').default('approval').notNull(),
  autoActionsAllowed: json('autoActionsAllowed')
    .$type<string[]>()
    .default([])
    .notNull(),
  requireApprovalDomains: json('requireApprovalDomains')
    .$type<string[]>()
    .default([])
    .notNull(),
  toneProfile: json('toneProfile').$type<ToneProfileJson>(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull()
    .primaryKey(),
});

export type UserEmailSettingsType = typeof UserEmailSettings.$inferSelect;

export const CreateUserEmailSettingsSchema = createInsertSchema(
  UserEmailSettings,
).omit({
  updatedAt: true,
});

export const UpdateUserEmailSettingsSchema = createUpdateSchema(
  UserEmailSettings,
).omit({
  updatedAt: true,
  userId: true,
});

// ============================================================================
// USER MEMORY TABLE - ChatGPT-style long-term facts
// ============================================================================

export const UserMemory = schema.table(
  'userMemory',
  {
    // How confident we are in this fact (0-1)
    confidence: real('confidence').default(1.0),
    // The actual fact/pattern content
    content: text('content').notNull(),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'mem' }))
      .notNull()
      .primaryKey(),
    // Type of memory for categorization
    memoryType: memoryTypeEnum('memoryType').notNull(),
    // Optional metadata (type-specific data)
    metadata: json('metadata').$type<Record<string, unknown>>(),
    // Where this fact was extracted from (thread ID, message ID, etc.)
    source: text('source'),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
    // Reference to user
    userId: varchar('userId')
      .references(() => Users.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (table) => [
    // Index for fast user lookups
    index('idx_user_memory_user').on(table.userId),
    // Index for type-based filtering
    index('idx_user_memory_type').on(table.userId, table.memoryType),
  ],
);

export type UserMemoryType = typeof UserMemory.$inferSelect;

export const CreateUserMemorySchema = createInsertSchema(UserMemory).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const UpdateUserMemorySchema = createUpdateSchema(UserMemory).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  userId: true,
});

// ============================================================================
// USER WRITING PROFILE TABLE - Global writing style defaults
// ============================================================================

export const UserWritingProfile = schema.table('userWritingProfile', {
  // Analyzed message count for statistics
  analyzedMessageCount: integer('analyzedMessageCount').default(0),
  // Average message length in characters
  averageMessageLength: integer('averageMessageLength'),
  // Common phrases the user frequently uses
  commonPhrases: json('commonPhrases').$type<string[]>(),
  // Global default formality (0 = casual, 1 = formal)
  defaultFormalityLevel: real('defaultFormalityLevel'),
  // Detected email signature
  detectedSignature: text('detectedSignature'),
  // When the profile was last analyzed
  lastAnalyzedAt: timestamp('lastAnalyzedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  // Preferred greeting (e.g., "Hi", "Hey", "Dear")
  preferredGreeting: text('preferredGreeting'),
  // Preferred sign-off (e.g., "Best", "Thanks", "Cheers")
  preferredSignoff: text('preferredSignoff'),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  // Primary key is user ID (one profile per user)
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull()
    .primaryKey(),
  // Vocabulary analysis
  vocabularyProfile: json('vocabularyProfile').$type<VocabularyProfileJson>(),
});

export type UserWritingProfileType = typeof UserWritingProfile.$inferSelect;

export const CreateUserWritingProfileSchema = createInsertSchema(
  UserWritingProfile,
).omit({
  updatedAt: true,
});

export const UpdateUserWritingProfileSchema = createUpdateSchema(
  UserWritingProfile,
).omit({
  updatedAt: true,
  userId: true,
});

// ============================================================================
// USER CONTACT STYLE TABLE - Per-recipient formality (contextual writing style)
// ============================================================================

export const UserContactStyle = schema.table(
  'userContactStyle',
  {
    // Common phrases used with this contact
    commonPhrases: json('commonPhrases').$type<string[]>(),
    // Entire domain (e.g., company.com)
    contactDomain: text('contactDomain'),
    // Specific person email (e.g., john@company.com)
    contactEmail: text('contactEmail'),
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    // Formality level for this contact (0 = casual, 1 = formal)
    formalityLevel: real('formalityLevel'),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'style' }))
      .notNull()
      .primaryKey(),
    // When the user last messaged this contact
    lastMessageAt: timestamp('lastMessageAt', {
      mode: 'date',
      withTimezone: true,
    }),
    // Number of messages sent to this contact
    messageCount: integer('messageCount').default(0),
    // Typical greeting used with this contact
    typicalGreeting: text('typicalGreeting'),
    // Typical sign-off used with this contact
    typicalSignoff: text('typicalSignoff'),
    updatedAt: timestamp('updatedAt', {
      mode: 'date',
      withTimezone: true,
    }).$onUpdateFn(() => new Date()),
    // Reference to user
    userId: varchar('userId')
      .references(() => Users.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (table) => [
    // Index for fast email lookup
    index('idx_contact_style_email').on(table.userId, table.contactEmail),
    // Index for fast domain lookup
    index('idx_contact_style_domain').on(table.userId, table.contactDomain),
  ],
);

export type UserContactStyleType = typeof UserContactStyle.$inferSelect;

export const CreateUserContactStyleSchema = createInsertSchema(
  UserContactStyle,
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const UpdateUserContactStyleSchema = createUpdateSchema(
  UserContactStyle,
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
  userId: true,
});
