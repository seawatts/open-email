import { schema } from './common';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = schema.enum('userRole', [
  'admin',
  'owner',
  'member',
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
export const suggestedActionEnum = schema.enum('suggestedAction', [
  'reply',
  'archive',
  'snooze',
]);

// Gmail category classification (from Gmail labelIds)
export const gmailCategoryEnum = schema.enum('gmailCategory', [
  'primary', // CATEGORY_PERSONAL or INBOX without category
  'social', // CATEGORY_SOCIAL
  'promotions', // CATEGORY_PROMOTIONS
  'updates', // CATEGORY_UPDATES
  'forums', // CATEGORY_FORUMS
]);

// ============================================================================
// ZOD TYPES FROM ENUMS
// ============================================================================

