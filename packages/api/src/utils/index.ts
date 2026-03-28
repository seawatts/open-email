/**
 * Shared Utilities
 *
 * Common helpers used across API services and routers.
 */

export { parseDateRange, parseGmailDate } from './date-utils';
export { getErrorMessage } from './error-utils';
export {
  type AttachmentMeta,
  type NormalizedMessage,
  type NormalizedThread,
  normalizeMessage,
  normalizeThread,
} from './type-coercion';
