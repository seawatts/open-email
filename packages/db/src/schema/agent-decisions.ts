import { createId } from '@seawatts/id';
import {
  integer,
  json,
  real,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { schema } from './common';
import { EmailThreads } from './email-threads';
import {
  emailActionStatusEnum,
  emailActionTypeEnum,
  emailCategoryEnum,
  suggestedActionEnum,
} from './enums';
import type { DraftReplyJson, SmartActionJson } from './types';
import { Users } from './users';

// ============================================================================
// AGENT DECISIONS TABLE - AI triage results
// ============================================================================

export const AgentDecisions = schema.table('agentDecisions', {
  category: emailCategoryEnum('category').notNull(),
  completionTokens: integer('completionTokens').default(0),
  confidence: real('confidence').notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  draftReplies: json('draftReplies').$type<DraftReplyJson[]>().default([]),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'decision' }))
    .notNull()
    .primaryKey(),
  modelUsed: text('modelUsed').notNull(),
  promptTokens: integer('promptTokens').default(0),
  rawOutput: text('rawOutput'),
  reasons: json('reasons').$type<string[]>().default([]).notNull(),
  smartActions: json('smartActions').$type<SmartActionJson[]>().default([]),
  suggestedAction: suggestedActionEnum('suggestedAction').notNull(),
  suggestedLabels: json('suggestedLabels').$type<string[]>().default([]),
  summary: text('summary'),
  threadId: varchar('threadId')
    .references(() => EmailThreads.id, {
      onDelete: 'cascade',
    })
    .notNull(),
});

export type AgentDecisionType = typeof AgentDecisions.$inferSelect;

export const CreateAgentDecisionSchema = createInsertSchema(
  AgentDecisions,
).omit({
  createdAt: true,
  id: true,
});

// ============================================================================
// EMAIL ACTIONS TABLE - Pending/executed actions
// ============================================================================

export const EmailActions = schema.table('emailActions', {
  actionType: emailActionTypeEnum('actionType').notNull(),
  agentDecisionId: varchar('agentDecisionId').references(
    () => AgentDecisions.id,
  ),
  approvedAt: timestamp('approvedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  approvedBy: varchar('approvedBy').references(() => Users.id),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  error: text('error'),
  executedAt: timestamp('executedAt', {
    mode: 'date',
    withTimezone: true,
  }),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'action' }))
    .notNull()
    .primaryKey(),
  payload: json('payload').$type<Record<string, unknown>>().default({}),
  status: emailActionStatusEnum('status').default('pending').notNull(),
  threadId: varchar('threadId')
    .references(() => EmailThreads.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export type EmailActionType = typeof EmailActions.$inferSelect;

export const CreateEmailActionSchema = createInsertSchema(EmailActions).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
