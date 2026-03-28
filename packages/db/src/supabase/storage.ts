/**
 * Supabase Storage utilities for email content
 *
 * Storage structure:
 * - email-bodies/{accountId}/{messageId}/body.html
 * - email-bodies/{accountId}/{messageId}/body.txt
 * - email-attachments/{accountId}/{messageId}/{attachmentId}_{filename}
 */

export const STORAGE_BUCKETS = {
  EMAIL_ATTACHMENTS: 'email-attachments',
  EMAIL_BODIES: 'email-bodies',
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Get the storage path for an email body file
 */
export function getEmailBodyPath(
  accountId: string,
  messageId: string,
  type: 'html' | 'text',
): string {
  const extension = type === 'html' ? 'html' : 'txt';
  return `${accountId}/${messageId}/body.${extension}`;
}

/**
 * Get the storage path for an email attachment
 */
export function getEmailAttachmentPath(
  accountId: string,
  messageId: string,
  attachmentId: string,
  filename: string,
): string {
  // Sanitize filename to prevent path traversal
  const safeFilename = filename.replace(/[/\\]/g, '_');
  return `${accountId}/${messageId}/${attachmentId}_${safeFilename}`;
}

/**
 * Parse a storage path to extract components
 */
export function parseEmailBodyPath(path: string): {
  accountId: string;
  messageId: string;
  type: 'html' | 'text';
} | null {
  const match = path.match(/^([^/]+)\/([^/]+)\/body\.(html|txt)$/);
  if (!match) return null;

  return {
    accountId: match[1]!,
    messageId: match[2]!,
    type: match[3] === 'html' ? 'html' : 'text',
  };
}

/**
 * Parse an attachment storage path to extract components
 */
export function parseEmailAttachmentPath(path: string): {
  accountId: string;
  attachmentId: string;
  filename: string;
  messageId: string;
} | null {
  const match = path.match(/^([^/]+)\/([^/]+)\/([^_]+)_(.+)$/);
  if (!match) return null;

  return {
    accountId: match[1]!,
    attachmentId: match[3]!,
    filename: match[4]!,
    messageId: match[2]!,
  };
}

/**
 * Content types for email storage
 * Note: Must match exactly with allowed_mime_types in config.toml
 */
export const STORAGE_CONTENT_TYPES = {
  HTML: 'text/html',
  TEXT: 'text/plain',
} as const;

/**
 * Default signed URL expiry time (1 hour in seconds)
 */
export const SIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Maximum file sizes for storage
 */
export const MAX_FILE_SIZES = {
  ATTACHMENT: 25 * 1024 * 1024, // 25MB per attachment
  EMAIL_BODY: 5 * 1024 * 1024, // 5MB per email body
} as const;
