/**
 * Email Extraction Types
 *
 * Types for keyword extraction and entity recognition from emails.
 */

import type {
  KeywordMetadataAttachment,
  KeywordMetadataFinancial,
  KeywordMetadataLocation,
  KeywordMetadataTemporal,
} from '@seawatts/db/schema';

// Keyword type values matching the database enum
export type KeywordType =
  | 'person'
  | 'company'
  | 'location'
  | 'topic'
  | 'temporal'
  | 'action'
  | 'attachment'
  | 'financial'
  | 'product';

// Extracted keyword with metadata
export interface ExtractedKeyword {
  keyword: string;
  keywordType: KeywordType;
  originalText?: string;
  confidence: number;
  metadata?:
    | KeywordMetadataTemporal
    | KeywordMetadataFinancial
    | KeywordMetadataLocation
    | KeywordMetadataAttachment
    | Record<string, unknown>;
}

// Input for extraction
export interface ExtractionInput {
  threadId: string;
  messageId?: string;
  subject: string;
  bodyPreview: string | null;
  snippet: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  attachments?: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
  bundleType?: string;
  internalDate: Date;
}

// Result of extraction
export interface ExtractionResult {
  threadId: string;
  messageId?: string;
  keywords: ExtractedKeyword[];
  searchText: string; // Combined text for full-text search
  processingTimeMs: number;
}

// Attachment extraction result
export interface AttachmentExtractionResult {
  attachmentId: string;
  filename: string;
  extractedText: string;
  keywords: ExtractedKeyword[];
}
