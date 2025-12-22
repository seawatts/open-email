import { z } from 'zod';

import { schema } from './common';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = schema.enum('userRole', [
  'admin',
  'owner',
  'member',
]);
export const localConnectionStatusEnum = schema.enum('localConnectionStatus', [
  'connected',
  'disconnected',
]);
export const stripeSubscriptionStatusEnum = schema.enum(
  'stripeSubscriptionStatus',
  [
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'paused',
    'trialing',
    'unpaid',
  ],
);
export const apiKeyUsageTypeEnum = schema.enum('apiKeyUsageType', [
  'mcp-server',
]);
export const invitationStatusEnum = schema.enum('invitationStatus', [
  'pending',
  'accepted',
  'rejected',
  'canceled',
]);

// Email Agent Enums
export const emailCategoryEnum = schema.enum('emailCategory', [
  'urgent',
  'needs_reply',
  'awaiting_other',
  'fyi',
  'spam_like',
]);

export const suggestedActionEnum = schema.enum('suggestedAction', [
  'reply',
  'follow_up',
  'archive',
  'label',
  'ignore',
]);

export const emailActionTypeEnum = schema.enum('emailActionType', [
  'send',
  'archive',
  'label',
  'snooze',
  'delete',
  'smart_action',
]);

export const emailActionStatusEnum = schema.enum('emailActionStatus', [
  'pending',
  'approved',
  'rejected',
  'executed',
  'failed',
]);

export const agentModeEnum = schema.enum('agentMode', ['approval', 'auto']);

export const emailRuleTypeEnum = schema.enum('emailRuleType', [
  'auto_archive',
  'auto_label',
  'always_ask',
  'tone',
]);

// Inbox-style bundle types for grouping emails
export const bundleTypeEnum = schema.enum('bundleType', [
  'travel',
  'purchases',
  'finance',
  'social',
  'promos',
  'updates',
  'forums',
  'personal',
]);

// Highlight types for extracted key information
export const highlightTypeEnum = schema.enum('highlightType', [
  'flight',
  'hotel',
  'package_tracking',
  'payment',
  'event',
  'reservation',
  'action_item',
]);

// Keyword types for email search indexing
export const keywordTypeEnum = schema.enum('keywordType', [
  'person',
  'company',
  'location',
  'topic',
  'temporal',
  'action',
  'attachment',
  'financial',
  'product',
]);

// Memory types for categorizing user facts
export const memoryTypeEnum = schema.enum('memoryType', [
  'fact',
  'preference',
  'writing_style',
  'signature',
  'relationship',
]);

// ============================================================================
// ZOD TYPES FROM ENUMS
// ============================================================================

export const UserRoleType = z.enum(userRoleEnum.enumValues).enum;
export const LocalConnectionStatusType = z.enum(
  localConnectionStatusEnum.enumValues,
).enum;
export const StripeSubscriptionStatusType = z.enum(
  stripeSubscriptionStatusEnum.enumValues,
).enum;
export const ApiKeyUsageTypeType = z.enum(apiKeyUsageTypeEnum.enumValues).enum;
export const InvitationStatusType = z.enum(
  invitationStatusEnum.enumValues,
).enum;

// Email Agent Zod Types
export const EmailCategoryType = z.enum(emailCategoryEnum.enumValues).enum;
export const SuggestedActionType = z.enum(suggestedActionEnum.enumValues).enum;
export const EmailActionTypeType = z.enum(emailActionTypeEnum.enumValues).enum;
export const EmailActionStatusType = z.enum(
  emailActionStatusEnum.enumValues,
).enum;
export const AgentModeType = z.enum(agentModeEnum.enumValues).enum;
export const EmailRuleTypeType = z.enum(emailRuleTypeEnum.enumValues).enum;
export const BundleTypeType = z.enum(bundleTypeEnum.enumValues).enum;
export const HighlightTypeType = z.enum(highlightTypeEnum.enumValues).enum;
export const KeywordTypeType = z.enum(keywordTypeEnum.enumValues).enum;
export const MemoryTypeType = z.enum(memoryTypeEnum.enumValues).enum;
