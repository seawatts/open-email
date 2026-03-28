import { json, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { schema } from './common';
import { Users } from './users';

// ============================================================================
// USER PREFERENCES TYPE
// ============================================================================

export interface UserPreferencesJson {
  agentMode?: 'approval' | 'autopilot';
  autoArchiveConfidence?: number;
}

// ============================================================================
// USER PROFILE TABLE - One row per user, replaces userEmailSettings,
// userMemory, userWritingProfile, and userContactStyle
// ============================================================================

export const UserProfile = schema.table('userProfile', {
  memory: text('memory').default('').notNull(),
  preferences: json('preferences')
    .$type<UserPreferencesJson>()
    .default({})
    .notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull()
    .primaryKey(),
});

export type UserProfileType = typeof UserProfile.$inferSelect;
