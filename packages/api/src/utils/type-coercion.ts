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
  extends Omit<EmailMessageType, 'attachmentMeta' | 'ccEmails' | 'createdAt'> {
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
    attachmentMeta: (msg.attachmentMeta ?? []) as AttachmentMeta[],
    ccEmails: msg.ccEmails ?? [],
    createdAt: msg.createdAt ?? new Date(),
  };
}

/**
 * Normalized thread with properly typed fields
 */
export interface NormalizedThread
  extends Omit<
    EmailThreadType,
    'aiSummary' | 'searchVector' | 'createdAt' | 'updatedAt'
  > {
  aiSummary: string | null;
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
    createdAt: thread.createdAt ?? new Date(),
    searchVector: (thread.searchVector as string) ?? null,
    updatedAt: thread.updatedAt ?? null,
  };
}
