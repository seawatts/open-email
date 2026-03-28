/**
 * Email Search Types
 *
 * Types for email search queries and results.
 */

export interface EmailSearchFilters {
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  senders?: string[];
  hasAttachments?: boolean;
  unreadOnly?: boolean;
  accountId?: string;
}

export interface EmailSearchParams {
  query: string;
  filters?: EmailSearchFilters;
  limit?: number;
  offset?: number;
}

export interface EmailSearchResult {
  threadId: string;
  subject: string;
  snippet: string | null;
  fromEmail: string;
  fromName: string | null;
  lastMessageAt: Date;
  messageCount: number;
  isRead: boolean;
  relevanceScore: number;
}

export interface EmailSearchResponse {
  results: EmailSearchResult[];
  totalCount: number;
  query: string;
  processingTimeMs: number;
}
