// ============================================================================
// SCHEMA INDEX - Re-exports all schema definitions
// ============================================================================

// Accounts & Verifications
export type { AccountType, VerificationType } from './accounts';
export { Accounts, Verifications } from './accounts';

// API Keys & Auth Codes
export type { ApiKeyType, ApiKeyUsageType, AuthCodeType } from './api-keys';
export {
  ApiKeys,
  ApiKeyUsage,
  AuthCodes,
  CreateApiKeySchema,
  CreateApiKeyUsageSchema,
  UpdateApiKeySchema,
} from './api-keys';

// Common utilities
export { schema, tsvector } from './common';

// Email Messages
export type { EmailAttachmentMeta, EmailMessageType } from './email-messages';
export { CreateEmailMessageSchema, EmailMessages } from './email-messages';

// Email Rules
export type { EmailRuleType } from './email-rules';
export {
  CreateEmailRuleSchema,
  EmailRules,
  UpdateEmailRuleSchema,
} from './email-rules';

// Email Threads
export type { EmailThreadType, QuickReplyOption } from './email-threads';
export { CreateEmailThreadSchema, EmailThreads } from './email-threads';

// Enums
export {
  apiKeyUsageTypeEnum,
  gmailCategoryEnum,
  invitationStatusEnum,
  stripeSubscriptionStatusEnum,
  suggestedActionEnum,
  userRoleEnum,
} from './enums';

// Organizations
export type { InvitationType, OrgMembersType, OrgType } from './organizations';
export {
  Invitations,
  OrgMembers,
  Orgs,
  updateOrgSchema,
} from './organizations';

// All Relations
export {
  AccountsRelations,
  ApiKeysRelations,
  ApiKeyUsageRelations,
  AuthCodesRelations,
  EmailMessagesRelations,
  EmailRulesRelations,
  EmailThreadsRelations,
  InvitationsRelations,
  OrgMembersRelations,
  OrgsRelations,
  SessionsRelations,
  ShortUrlsRelations,
  UserProfileRelations,
  UsersRelations,
} from './relations';

// Sessions
export type { SessionType } from './sessions';
export { Sessions } from './sessions';

// Short URLs
export type { ShortUrlType } from './short-urls';
export {
  CreateShortUrlSchema,
  ShortUrls,
  UpdateShortUrlSchema,
} from './short-urls';

// User Profile
export type { UserPreferencesJson, UserProfileType } from './user-profile';
export { UserProfile } from './user-profile';

// Users
export type { UserType } from './users';
export { CreateUserSchema, Users } from './users';
