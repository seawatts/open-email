import { relations } from 'drizzle-orm';

// Import all tables
import { Accounts } from './accounts';
import { AgentDecisions, EmailActions } from './agent-decisions';
import { ApiKeys, ApiKeyUsage, AuthCodes } from './api-keys';
import { EmailHighlights } from './email-highlights';
import { EmailKeywords } from './email-keywords';
import { EmailMessages } from './email-messages';
import { EmailRules } from './email-rules';
import { EmailThreads } from './email-threads';
import { Invitations, OrgMembers, Orgs } from './organizations';
import { Sessions } from './sessions';
import { ShortUrls } from './short-urls';
import {
  UserContactStyle,
  UserEmailSettings,
  UserMemory,
  UserWritingProfile,
} from './user-settings';
import { Users } from './users';

// ============================================================================
// USER RELATIONS
// ============================================================================

export const UsersRelations = relations(Users, ({ one, many }) => ({
  accounts: many(Accounts),
  apiKeys: many(ApiKeys),
  apiKeyUsage: many(ApiKeyUsage),
  authCodes: many(AuthCodes),
  contactStyles: many(UserContactStyle),
  emailRules: many(EmailRules),
  emailSettings: one(UserEmailSettings),
  memories: many(UserMemory),
  orgMembers: many(OrgMembers),
  sessions: many(Sessions),
  writingProfile: one(UserWritingProfile),
}));

// ============================================================================
// SESSION RELATIONS
// ============================================================================

export const SessionsRelations = relations(Sessions, ({ one }) => ({
  activeOrganization: one(Orgs, {
    fields: [Sessions.activeOrganizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [Sessions.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// ACCOUNT RELATIONS
// ============================================================================

export const AccountsRelations = relations(Accounts, ({ one, many }) => ({
  emailThreads: many(EmailThreads),
  user: one(Users, {
    fields: [Accounts.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// ORGANIZATION RELATIONS
// ============================================================================

export const OrgsRelations = relations(Orgs, ({ many }) => ({
  apiKeys: many(ApiKeys),
  apiKeyUsage: many(ApiKeyUsage),
  authCodes: many(AuthCodes),
  invitations: many(Invitations),
  members: many(OrgMembers),
  sessions: many(Sessions),
}));

export const OrgMembersRelations = relations(OrgMembers, ({ one }) => ({
  organization: one(Orgs, {
    fields: [OrgMembers.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [OrgMembers.userId],
    references: [Users.id],
  }),
}));

export const InvitationsRelations = relations(Invitations, ({ one }) => ({
  inviter: one(Users, {
    fields: [Invitations.inviterId],
    references: [Users.id],
  }),
  organization: one(Orgs, {
    fields: [Invitations.organizationId],
    references: [Orgs.id],
  }),
}));

// ============================================================================
// AUTH CODE RELATIONS
// ============================================================================

export const AuthCodesRelations = relations(AuthCodes, ({ one }) => ({
  organization: one(Orgs, {
    fields: [AuthCodes.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [AuthCodes.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// API KEY RELATIONS
// ============================================================================

export const ApiKeysRelations = relations(ApiKeys, ({ one, many }) => ({
  organization: one(Orgs, {
    fields: [ApiKeys.organizationId],
    references: [Orgs.id],
  }),
  usage: many(ApiKeyUsage),
  user: one(Users, {
    fields: [ApiKeys.userId],
    references: [Users.id],
  }),
}));

export const ApiKeyUsageRelations = relations(ApiKeyUsage, ({ one }) => ({
  apiKey: one(ApiKeys, {
    fields: [ApiKeyUsage.apiKeyId],
    references: [ApiKeys.id],
  }),
  organization: one(Orgs, {
    fields: [ApiKeyUsage.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [ApiKeyUsage.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// SHORT URL RELATIONS
// ============================================================================

export const ShortUrlsRelations = relations(ShortUrls, ({ one }) => ({
  organization: one(Orgs, {
    fields: [ShortUrls.organizationId],
    references: [Orgs.id],
  }),
  user: one(Users, {
    fields: [ShortUrls.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// EMAIL THREAD RELATIONS
// ============================================================================

export const EmailThreadsRelations = relations(
  EmailThreads,
  ({ one, many }) => ({
    account: one(Accounts, {
      fields: [EmailThreads.accountId],
      references: [Accounts.id],
    }),
    agentDecisions: many(AgentDecisions),
    emailActions: many(EmailActions),
    emailHighlights: many(EmailHighlights),
    emailKeywords: many(EmailKeywords),
    emailMessages: many(EmailMessages),
  }),
);

// ============================================================================
// EMAIL MESSAGE RELATIONS
// ============================================================================

export const EmailMessagesRelations = relations(
  EmailMessages,
  ({ one, many }) => ({
    keywords: many(EmailKeywords),
    thread: one(EmailThreads, {
      fields: [EmailMessages.threadId],
      references: [EmailThreads.id],
    }),
  }),
);

// ============================================================================
// EMAIL HIGHLIGHT RELATIONS
// ============================================================================

export const EmailHighlightsRelations = relations(
  EmailHighlights,
  ({ one }) => ({
    message: one(EmailMessages, {
      fields: [EmailHighlights.messageId],
      references: [EmailMessages.id],
    }),
    thread: one(EmailThreads, {
      fields: [EmailHighlights.threadId],
      references: [EmailThreads.id],
    }),
  }),
);

// ============================================================================
// EMAIL KEYWORD RELATIONS
// ============================================================================

export const EmailKeywordsRelations = relations(EmailKeywords, ({ one }) => ({
  message: one(EmailMessages, {
    fields: [EmailKeywords.messageId],
    references: [EmailMessages.id],
  }),
  thread: one(EmailThreads, {
    fields: [EmailKeywords.threadId],
    references: [EmailThreads.id],
  }),
}));

// ============================================================================
// AGENT DECISION RELATIONS
// ============================================================================

export const AgentDecisionsRelations = relations(AgentDecisions, ({ one }) => ({
  thread: one(EmailThreads, {
    fields: [AgentDecisions.threadId],
    references: [EmailThreads.id],
  }),
}));

// ============================================================================
// EMAIL ACTION RELATIONS
// ============================================================================

export const EmailActionsRelations = relations(EmailActions, ({ one }) => ({
  agentDecision: one(AgentDecisions, {
    fields: [EmailActions.agentDecisionId],
    references: [AgentDecisions.id],
  }),
  approvedByUser: one(Users, {
    fields: [EmailActions.approvedBy],
    references: [Users.id],
  }),
  thread: one(EmailThreads, {
    fields: [EmailActions.threadId],
    references: [EmailThreads.id],
  }),
}));

// ============================================================================
// EMAIL RULE RELATIONS
// ============================================================================

export const EmailRulesRelations = relations(EmailRules, ({ one }) => ({
  user: one(Users, {
    fields: [EmailRules.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// USER EMAIL SETTINGS RELATIONS
// ============================================================================

export const UserEmailSettingsRelations = relations(
  UserEmailSettings,
  ({ one }) => ({
    user: one(Users, {
      fields: [UserEmailSettings.userId],
      references: [Users.id],
    }),
  }),
);

// ============================================================================
// USER MEMORY RELATIONS
// ============================================================================

export const UserMemoryRelations = relations(UserMemory, ({ one }) => ({
  user: one(Users, {
    fields: [UserMemory.userId],
    references: [Users.id],
  }),
}));

// ============================================================================
// USER WRITING PROFILE RELATIONS
// ============================================================================

export const UserWritingProfileRelations = relations(
  UserWritingProfile,
  ({ one }) => ({
    user: one(Users, {
      fields: [UserWritingProfile.userId],
      references: [Users.id],
    }),
  }),
);

// ============================================================================
// USER CONTACT STYLE RELATIONS
// ============================================================================

export const UserContactStyleRelations = relations(
  UserContactStyle,
  ({ one }) => ({
    user: one(Users, {
      fields: [UserContactStyle.userId],
      references: [Users.id],
    }),
  }),
);
