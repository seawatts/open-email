import { createId } from '@seawatts/id';
import { boolean, json, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';

import { schema } from './common';
import { emailRuleTypeEnum } from './enums';
import type { RuleActionsJson, RuleConditionsJson } from './types';
import { Users } from './users';

// ============================================================================
// EMAIL RULES TABLE - User-defined automation rules
// ============================================================================

export const EmailRules = schema.table('emailRules', {
  actions: json('actions').$type<RuleActionsJson>().default({}).notNull(),
  conditions: json('conditions')
    .$type<RuleConditionsJson>()
    .default({})
    .notNull(),
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'rule' }))
    .notNull()
    .primaryKey(),
  isActive: boolean('isActive').default(true).notNull(),
  ruleType: emailRuleTypeEnum('ruleType').notNull(),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
  userId: varchar('userId')
    .references(() => Users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
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
