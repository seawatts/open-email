/**
 * Email Search Types
 *
 * Types for email search queries and results.
 */

import type { KeywordType } from '../email-extraction/types';

// Search filter options
export interface EmailSearchFilters {
  // Date range filter
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  // Filter by sender emails or domains
  senders?: string[];
  // Filter by bundle type
  bundleTypes?: Array<
    | 'travel'
    | 'purchases'
    | 'finance'
    | 'social'
    | 'promos'
    | 'updates'
    | 'forums'
    | 'personal'
  >;
  // Filter by keyword types
  keywordTypes?: KeywordType[];
  // Only emails with attachments
  hasAttachments?: boolean;
  // Only unread emails
  unreadOnly?: boolean;
  // Account ID filter (better-auth Google account)
  accountId?: string;
}

// Search query parameters
export interface EmailSearchParams {
  // Natural language or keyword query
  query: string;
  // Optional filters
  filters?: EmailSearchFilters;
  // Maximum number of results
  limit?: number;
  // Offset for pagination
  offset?: number;
}

// Individual search result
export interface EmailSearchResult {
  threadId: string;
  subject: string;
  snippet: string | null;
  fromEmail: string;
  fromName: string | null;
  lastMessageAt: Date;
  messageCount: number;
  isRead: boolean;
  bundleType: string | null;
  // Relevance score from FTS
  relevanceScore: number;
  // Matching keywords
  matchingKeywords: Array<{
    keyword: string;
    keywordType: KeywordType;
  }>;
}

// Search response with metadata
export interface EmailSearchResponse {
  results: EmailSearchResult[];
  totalCount: number;
  query: string;
  processingTimeMs: number;
}

// Category listing params
export interface EmailCategoryParams {
  category:
    | 'travel'
    | 'purchases'
    | 'finance'
    | 'social'
    | 'promos'
    | 'updates'
    | 'forums'
    | 'personal';
  accountId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  offset?: number;
}
