import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

// ============================================================================
// Email Search Tools (Agent Tools for Context Retrieval)
// ============================================================================

export const searchEmailsParams = z.object({
  filters: z
    .object({
      bundleTypes: z
        .array(
          z.enum([
            'travel',
            'purchases',
            'finance',
            'social',
            'promos',
            'updates',
            'forums',
            'personal',
          ]),
        )
        .optional()
        .describe('Filter by email category'),
      dateRange: z
        .object({
          end: z.string().datetime().optional().describe('End date ISO'),
          start: z.string().datetime().optional().describe('Start date ISO'),
        })
        .optional()
        .describe('Date range filter'),
      hasAttachments: z
        .boolean()
        .optional()
        .describe('Only emails with attachments'),
      senders: z
        .array(z.string())
        .optional()
        .describe('Filter by sender emails or domains'),
      unreadOnly: z
        .boolean()
        .optional()
        .describe('Only unread emails'),
    })
    .optional()
    .describe('Optional search filters'),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe('Maximum number of results'),
  query: z.string().describe('Search query - keywords, names, topics, etc.'),
});

export const searchEmailsTool = toolDefinition({
  description: `Search emails by keywords, entities, or text. Use this to find relevant emails before answering questions or taking actions.

Examples of what you can search for:
- People: "emails from John" or "John Smith"
- Topics: "NY trip" or "project proposal"
- Companies: "Amazon order" or "Delta flight"
- Time periods: Use dateRange filter for "last week" or specific dates
- Categories: Use bundleTypes filter for "travel", "purchases", "finance", etc.

Returns matching thread IDs with snippets and relevance scores. Use get_email_thread to get full content of specific threads.`,
  inputSchema: searchEmailsParams,
  name: 'search_emails' as const,
});

export const getEmailThreadParams = z.object({
  includeAttachments: z
    .boolean()
    .default(false)
    .describe('Whether to include attachment metadata'),
  threadId: z.string().describe('The thread ID to retrieve'),
});

export const getEmailThreadTool = toolDefinition({
  description: `Get the full content of an email thread. Use this after search_emails to get detailed content of specific threads that seem relevant.

Returns:
- All messages in the thread with full content
- Sender and recipient information
- Timestamps
- Attachment information (if requested)
- Extracted keywords and highlights`,
  inputSchema: getEmailThreadParams,
  name: 'get_email_thread' as const,
});

// ============================================================================
// Tool Collections
// ============================================================================

export const emailSearchTools = [searchEmailsTool, getEmailThreadTool];

// ============================================================================
// Tool Name Constants
// ============================================================================

export const TOOL_NAMES = {
  GET_EMAIL_THREAD: 'get_email_thread',
  SEARCH_EMAILS: 'search_emails',
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];
