// ============================================================================
// SCHEMA INDEX - Re-exports all schema definitions
// ============================================================================

export type { AccountType, VerificationType } from './accounts';
// Accounts & Verifications
export { Accounts, Verifications } from './accounts';
export type { AgentDecisionType, EmailActionType } from './agent-decisions';
// Agent Decisions & Email Actions
export {
  AgentDecisions,
  CreateAgentDecisionSchema,
  CreateEmailActionSchema,
  EmailActions,
} from './agent-decisions';
export type { ApiKeyType, ApiKeyUsageType, AuthCodeType } from './api-keys';
// API Keys & Auth Codes
export {
  ApiKeys,
  ApiKeyUsage,
  AuthCodes,
  CreateApiKeySchema,
  CreateApiKeyUsageSchema,
  UpdateApiKeySchema,
} from './api-keys';
// Schema definition
// Common utilities
export { schema, tsvector } from './common';
export type { EmailHighlightType } from './email-highlights';
// Email Highlights
export {
  CreateEmailHighlightSchema,
  EmailHighlights,
} from './email-highlights';
export type { EmailKeywordType } from './email-keywords';
// Email Keywords
export { CreateEmailKeywordSchema, EmailKeywords } from './email-keywords';
export type { EmailMessageType } from './email-messages';
// Email Messages
export { CreateEmailMessageSchema, EmailMessages } from './email-messages';
export type { EmailRuleType } from './email-rules';
// Email Rules
export {
  CreateEmailRuleSchema,
  EmailRules,
  UpdateEmailRuleSchema,
} from './email-rules';
export type { EmailThreadType } from './email-threads';
// Email Threads
export { CreateEmailThreadSchema, EmailThreads } from './email-threads';
// Enums and Zod types
export {
  // Zod types
  AgentModeType,
  ApiKeyUsageTypeType,
  // Enums
  agentModeEnum,
  apiKeyUsageTypeEnum,
  BundleTypeType,
  bundleTypeEnum,
  EmailActionStatusType,
  EmailActionTypeType,
  EmailCategoryType,
  EmailRuleTypeType,
  emailActionStatusEnum,
  emailActionTypeEnum,
  emailCategoryEnum,
  emailRuleTypeEnum,
  HighlightTypeType,
  highlightTypeEnum,
  InvitationStatusType,
  invitationStatusEnum,
  KeywordTypeType,
  keywordTypeEnum,
  LocalConnectionStatusType,
  localConnectionStatusEnum,
  MemoryTypeType,
  memoryTypeEnum,
  StripeSubscriptionStatusType,
  SuggestedActionType,
  stripeSubscriptionStatusEnum,
  suggestedActionEnum,
  UserRoleType,
  userRoleEnum,
} from './enums';
export type { InvitationType, OrgMembersType, OrgType } from './organizations';
// Organizations
export {
  Invitations,
  OrgMembers,
  Orgs,
  updateOrgSchema,
} from './organizations';
// All Relations
export {
  AccountsRelations,
  AgentDecisionsRelations,
  ApiKeysRelations,
  ApiKeyUsageRelations,
  AuthCodesRelations,
  EmailActionsRelations,
  EmailHighlightsRelations,
  EmailKeywordsRelations,
  EmailMessagesRelations,
  EmailRulesRelations,
  EmailThreadsRelations,
  InvitationsRelations,
  OrgMembersRelations,
  OrgsRelations,
  SessionsRelations,
  ShortUrlsRelations,
  UserContactStyleRelations,
  UserEmailSettingsRelations,
  UserMemoryRelations,
  UsersRelations,
  UserWritingProfileRelations,
} from './relations';
export type { SessionType } from './sessions';
// Sessions
export { Sessions } from './sessions';
export type { ShortUrlType } from './short-urls';
// Short URLs
export {
  CreateShortUrlSchema,
  ShortUrls,
  UpdateShortUrlSchema,
} from './short-urls';
// JSON Types
export type {
  DraftReplyJson,
  HighlightDataActionItem,
  HighlightDataEvent,
  HighlightDataFlight,
  HighlightDataHotel,
  HighlightDataJson,
  HighlightDataPackageTracking,
  HighlightDataPayment,
  HighlightDataReservation,
  KeywordMetadataAttachment,
  KeywordMetadataFinancial,
  KeywordMetadataJson,
  KeywordMetadataLocation,
  KeywordMetadataTemporal,
  RuleActionsJson,
  RuleConditionsJson,
  SmartActionJson,
  ToneProfileJson,
  VocabularyProfileJson,
} from './types';
export type {
  UserContactStyleType,
  UserEmailSettingsType,
  UserMemoryType,
  UserWritingProfileType,
} from './user-settings';

// User Settings (Email Settings, Memory, Writing Profile, Contact Style)
export {
  CreateUserContactStyleSchema,
  CreateUserEmailSettingsSchema,
  CreateUserMemorySchema,
  CreateUserWritingProfileSchema,
  UpdateUserContactStyleSchema,
  UpdateUserEmailSettingsSchema,
  UpdateUserMemorySchema,
  UpdateUserWritingProfileSchema,
  UserContactStyle,
  UserEmailSettings,
  UserMemory,
  UserWritingProfile,
} from './user-settings';
export type { UserType } from './users';
// Users
export { CreateUserSchema, Users } from './users';
