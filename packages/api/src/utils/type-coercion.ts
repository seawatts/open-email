/**
 * Type Coercion Utilities
 *
 * Helpers for normalizing database records to expected types.
 */

import type { EmailMessageType, EmailThreadType } from '@seawatts/db/schema';

/**
 * Attachment metadata structure from database
 */
export interface AttachmentMeta {
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Normalized message with guaranteed non-null arrays
 */
export interface NormalizedMessage
  extends Omit<
    EmailMessageType,
    'attachmentMeta' | 'ccEmails' | 'aiSummary' | 'createdAt'
  > {
  aiSummary: string | null;
  attachmentMeta: AttachmentMeta[];
  ccEmails: string[];
  createdAt: Date;
}

/**
 * Normalize a message record to ensure all optional arrays have defaults.
 * Used when passing messages to AI extraction functions.
 */
export function normalizeMessage(msg: EmailMessageType): NormalizedMessage {
  return {
    ...msg,
    aiSummary: msg.aiSummary ?? null,
    attachmentMeta: (msg.attachmentMeta ?? []) as AttachmentMeta[],
    ccEmails: msg.ccEmails ?? [],
    createdAt: msg.createdAt ?? new Date(),
  };
}

/**
 * Bundle type union for type safety
 */
export type BundleType =
  | 'travel'
  | 'purchases'
  | 'finance'
  | 'social'
  | 'promos'
  | 'updates'
  | 'forums'
  | 'personal';

/**
 * Normalized thread with properly typed bundle
 */
export interface NormalizedThread
  extends Omit<
    EmailThreadType,
    | 'bundleType'
    | 'aiSummary'
    | 'aiSummaryUpdatedAt'
    | 'searchVector'
    | 'createdAt'
    | 'updatedAt'
  > {
  aiSummary: string | null;
  aiSummaryUpdatedAt: Date | null;
  bundleType: BundleType | null;
  createdAt: Date;
  searchVector: string | null;
  updatedAt: Date | null;
}

/**
 * Normalize a thread record for AI processing.
 */
export function normalizeThread(thread: EmailThreadType): NormalizedThread {
  return {
    ...thread,
    aiSummary: thread.aiSummary ?? null,
    aiSummaryUpdatedAt: thread.aiSummaryUpdatedAt ?? null,
    bundleType: thread.bundleType as BundleType | null,
    createdAt: thread.createdAt ?? new Date(),
    searchVector: (thread.searchVector as string) ?? null,
    updatedAt: thread.updatedAt ?? null,
  };
}
