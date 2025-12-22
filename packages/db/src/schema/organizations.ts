import { createId } from '@seawatts/id';
import { json, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { schema } from './common';
import {
  invitationStatusEnum,
  stripeSubscriptionStatusEnum,
  userRoleEnum,
} from './enums';
import { Users } from './users';

// ============================================================================
// ORGANIZATIONS TABLE - Better Auth organization plugin compatible
// ============================================================================

export const Orgs = schema.table('organization', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'org' }))
    .notNull()
    .primaryKey(),
  logo: text('logo'),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  // Stripe fields
  stripeCustomerId: text('stripeCustomerId'),
  stripeSubscriptionId: text('stripeSubscriptionId'),
  stripeSubscriptionStatus: stripeSubscriptionStatusEnum(
    'stripeSubscriptionStatus',
  ),
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    withTimezone: true,
  }).$onUpdateFn(() => new Date()),
});

export type OrgType = typeof Orgs.$inferSelect;

export const updateOrgSchema = createInsertSchema(Orgs).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

// ============================================================================
// ORGANIZATION MEMBERS TABLE - Better Auth organization plugin compatible
// ============================================================================

export const OrgMembers = schema.table(
  'member',
  {
    createdAt: timestamp('createdAt', {
      mode: 'date',
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    id: varchar('id', { length: 128 })
      .$defaultFn(() => createId({ prefix: 'member' }))
      .notNull()
      .primaryKey(),
    organizationId: varchar('organizationId', { length: 128 })
      .references(() => Orgs.id, { onDelete: 'cascade' })
      .notNull(),
    role: userRoleEnum('role').default('member').notNull(),
    userId: varchar('userId', { length: 128 })
      .references(() => Users.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.organizationId)],
);

export type OrgMembersType = typeof OrgMembers.$inferSelect & {
  user?: typeof Users.$inferSelect;
  organization?: OrgType;
};

// ============================================================================
// INVITATIONS TABLE - Better Auth organization plugin
// ============================================================================

export const Invitations = schema.table('invitation', {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  email: text('email').notNull(),
  expiresAt: timestamp('expiresAt', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  id: varchar('id', { length: 128 })
    .$defaultFn(() => createId({ prefix: 'inv' }))
    .notNull()
    .primaryKey(),
  inviterId: varchar('inviterId', { length: 128 })
    .references(() => Users.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: varchar('organizationId', { length: 128 })
    .references(() => Orgs.id, { onDelete: 'cascade' })
    .notNull(),
  role: userRoleEnum('role').default('member').notNull(),
  status: invitationStatusEnum('status').default('pending').notNull(),
});

export type InvitationType = typeof Invitations.$inferSelect;
