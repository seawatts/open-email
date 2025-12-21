import type { gmail_v1 } from 'googleapis';

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
 * Extract attachment metadata from message payload
 */
export function extractAttachmentMeta(
  payload: gmail_v1.Schema$MessagePart | undefined,
): { filename: string; mimeType: string; size: number }[] {
  const attachments: { filename: string; mimeType: string; size: number }[] =
    [];

  if (!payload) return attachments;

  function traverse(part: gmail_v1.Schema$MessagePart): void {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
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
