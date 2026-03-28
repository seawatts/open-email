import type { gmail_v1 } from 'googleapis';
import { type Attachment, simpleParser } from 'mailparser';

// ============================================================================
// MAILPARSER-BASED PARSING (for raw email content)
// ============================================================================

/**
 * Parsed email content from mailparser
 */
export interface ParsedEmailContent {
  /** Parsed attachments with content buffers */
  attachments: ParsedAttachment[];
  /** Email headers for threading */
  headers: {
    inReplyTo?: string;
    messageId?: string;
    references?: string[];
  };
  /** Full HTML body */
  html: string | null;
  /** Full plain text body */
  text: string | null;
}

/**
 * Parsed attachment with content
 */
export interface ParsedAttachment {
  /** Content ID for inline images (without cid: prefix) */
  cid?: string;
  /** Binary content of the attachment */
  content: Buffer;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Parse raw email content using mailparser
 *
 * @param rawEmail - Base64url encoded raw email from Gmail API
 */
export async function parseRawEmail(
  rawEmail: string,
): Promise<ParsedEmailContent> {
  // Gmail API returns base64url encoded content
  const emailBuffer = Buffer.from(rawEmail, 'base64url');
  const parsed = await simpleParser(emailBuffer);

  return {
    attachments: parseAttachments(parsed.attachments),
    headers: {
      inReplyTo: normalizeMessageId(parsed.inReplyTo),
      messageId: normalizeMessageId(parsed.messageId),
      references: parseReferences(parsed.references),
    },
    html: parsed.html || null,
    text: parsed.text || null,
  };
}

/**
 * Parse raw email from a buffer
 */
export async function parseEmailBuffer(
  emailBuffer: Buffer,
): Promise<ParsedEmailContent> {
  const parsed = await simpleParser(emailBuffer);

  return {
    attachments: parseAttachments(parsed.attachments),
    headers: {
      inReplyTo: normalizeMessageId(parsed.inReplyTo),
      messageId: normalizeMessageId(parsed.messageId),
      references: parseReferences(parsed.references),
    },
    html: parsed.html || null,
    text: parsed.text || null,
  };
}

/**
 * Parse attachments from mailparser output
 */
function parseAttachments(attachments: Attachment[]): ParsedAttachment[] {
  return attachments.map((att) => ({
    cid: att.cid || undefined,
    content: att.content,
    filename: att.filename || 'attachment',
    mimeType: att.contentType || 'application/octet-stream',
    size: att.size,
  }));
}

/**
 * Normalize a Message-ID header value
 */
function normalizeMessageId(
  messageId: string | string[] | undefined,
): string | undefined {
  if (!messageId) return undefined;
  // If it's an array, take the first one
  const id = Array.isArray(messageId) ? messageId[0] : messageId;
  // Remove angle brackets if present
  return id?.replace(/^<|>$/g, '');
}

/**
 * Parse References header into array of message IDs
 */
function parseReferences(
  references: string | string[] | undefined,
): string[] | undefined {
  if (!references) return undefined;

  if (Array.isArray(references)) {
    return references.map((ref) => ref.replace(/^<|>$/g, ''));
  }

  // Split by whitespace or comma and clean up
  return references
    .split(/[\s,]+/)
    .map((ref) => ref.trim().replace(/^<|>$/g, ''))
    .filter(Boolean);
}

// ============================================================================
// GMAIL API HELPERS (for structured API responses)
// ============================================================================

/**
 * Parse email address from header value
 * Handles formats like: "Name <email@example.com>" or just "email@example.com"
 */
export function parseEmailAddress(
  headerValue: string,
): { email: string; name: string | null }[] {
  if (!headerValue) return [];

  // Split by comma for multiple recipients
  const addresses = headerValue.split(',').map((addr) => addr.trim());

  return addresses
    .map((addr) => {
      // Match "Name <email>" format
      const match = addr.match(/^(?:"?([^"]*)"?\s)?<?([^<>]+@[^<>]+)>?$/);
      if (match) {
        return {
          email: match[2]?.trim().toLowerCase() ?? '',
          name: match[1]?.trim() || null,
        };
      }
      // Just an email address
      if (addr.includes('@')) {
        return { email: addr.toLowerCase(), name: null };
      }
      return null;
    })
    .filter((addr): addr is { email: string; name: string | null } =>
      Boolean(addr?.email),
    );
}

/**
 * Extract plain text from email payload
 */
export function extractPlainText(
  payload: gmail_v1.Schema$MessagePart | undefined,
): string | null {
  if (!payload) return null;

  // If it's a simple text/plain part
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // If it has parts, search through them
  if (payload.parts) {
    for (const part of payload.parts) {
      // First try text/plain
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      // Recursively check nested parts
      const text = extractPlainText(part);
      if (text) return text;
    }
  }

  // Fallback: try to get HTML and strip tags (basic)
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    const html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    return stripHtmlTags(html);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        return stripHtmlTags(html);
      }
    }
  }

  return null;
}

/**
 * Basic HTML tag stripper
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const match = email.match(/@([^@]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

/**
 * Redact PII from text
 * Replaces phone numbers, credit cards, SSNs, etc.
 */
export function redactPII(text: string): string {
  if (!text) return text;

  return (
    text
      // Phone numbers (various formats)
      .replace(
        /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
        '[PHONE]',
      )
      // Credit card numbers (basic patterns)
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      // SSN
      .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[SSN]')
      // IP addresses
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
  );
}

/**
 * Extract attachment metadata from message payload, including CID for inline images
 */
export function extractAttachmentMeta(
  payload: gmail_v1.Schema$MessagePart | undefined,
): { cid?: string; filename: string; mimeType: string; size: number }[] {
  const attachments: {
    cid?: string;
    filename: string;
    mimeType: string;
    size: number;
  }[] = [];

  if (!payload) return attachments;

  function traverse(part: gmail_v1.Schema$MessagePart): void {
    if (part.filename && part.body?.attachmentId) {
      // Extract Content-ID header for inline images
      const contentIdHeader = part.headers?.find(
        (h) => h.name?.toLowerCase() === 'content-id',
      );
      // CID typically looks like <image001.png@01D12345.67890ABC>
      // Remove angle brackets if present
      const cid = contentIdHeader?.value?.replace(/^<|>$/g, '');

      attachments.push({
        cid,
        filename: part.filename,
        mimeType: part.mimeType ?? 'application/octet-stream',
        size: part.body.size ?? 0,
      });
    }
    if (part.parts) {
      for (const subpart of part.parts) {
        traverse(subpart);
      }
    }
  }

  traverse(payload);
  return attachments;
}

/**
 * Get header value from message headers
 */
export function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  if (!headers) return '';
  const header = headers.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? '';
}

/**
 * Extract HTML content from Gmail API message payload
 */
export function extractHtmlContent(
  payload: gmail_v1.Schema$MessagePart | undefined,
): string | null {
  if (!payload) return null;

  // If it's a simple text/html part
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // If it has parts, search through them
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      // Recursively check nested multipart structures
      if (part.mimeType?.startsWith('multipart/')) {
        const html = extractHtmlContent(part);
        if (html) return html;
      }
    }
  }

  return null;
}

/**
 * Extract both HTML and plain text from Gmail API message payload
 */
export function extractEmailBodies(
  payload: gmail_v1.Schema$MessagePart | undefined,
): { html: string | null; text: string | null } {
  return {
    html: extractHtmlContent(payload),
    text: extractPlainText(payload),
  };
}

/**
 * Create a body preview from text content (truncated for list views)
 */
export function createBodyPreview(
  text: string | null,
  maxLength = 500,
): string | null {
  if (!text) return null;

  // Clean up whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (cleaned.length <= maxLength) return cleaned;

  // Truncate at word boundary
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return lastSpace > maxLength * 0.8
    ? `${truncated.slice(0, lastSpace)}...`
    : `${truncated}...`;
}
