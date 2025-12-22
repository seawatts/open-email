/**
 * Email Search Agent - AI SDK v6 Implementation
 *
 * A plan-and-execute agent that can:
 * 1. Take a natural language query
 * 2. Plan and execute multiple search tool calls
 * 3. Loop iteratively to refine searches until enough context is gathered
 * 4. Synthesize an answer from the retrieved emails
 *
 * Uses AI SDK v6's generateText with tools.
 */

import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

import { getDefaultProvider, getModel } from './adapters';

// ============================================================================
// Types
// ============================================================================

export interface SearchAgentConfig {
  /** Account ID to search within */
  accountId: string;
  /** Maximum number of agent iterations (default: 5) */
  maxIterations?: number;
  /** Maximum total tool calls across all iterations (default: 15) */
  maxToolCalls?: number;
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
  bundleType: string | null;
  relevanceScore: number;
  matchingKeywords: Array<{ keyword: string; keywordType: string }>;
}

export interface EmailThreadContent {
  threadId: string;
  subject: string;
  messages: Array<{
    id: string;
    from: string;
    to: string[];
    date: Date;
    body: string;
    snippet: string;
  }>;
  keywords: Array<{ keyword: string; keywordType: string }>;
}

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  params: Record<string, unknown>;
  result: unknown;
  error?: string;
}

export type SearchAgentEvent =
  | { type: 'thinking'; content: string }
  | { type: 'planning'; plan: string; iteration: number }
  | {
      type: 'tool_calls_start';
      calls: Array<{ toolName: string; params: Record<string, unknown> }>;
    }
  | { type: 'tool_call_result'; result: ToolCallResult }
  | { type: 'tool_calls_complete'; results: ToolCallResult[]; iteration: number }
  | { type: 'refining'; reason: string; iteration: number }
  | { type: 'synthesizing'; context: string }
  | { type: 'answer_chunk'; delta: string }
  | {
      type: 'complete';
      answer: string;
      sources: EmailSearchResult[];
      totalToolCalls: number;
      iterations: number;
    }
  | { type: 'error'; error: string };

// ============================================================================
// Tool Execution Interface
// ============================================================================

/**
 * Interface for executing search tools.
 * Inject this to connect the agent to your actual search service.
 */
export interface SearchToolExecutor {
  searchEmails: (params: {
    query: string;
    filters?: {
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
      dateRange?: { start?: string; end?: string };
      senders?: string[];
      hasAttachments?: boolean;
      unreadOnly?: boolean;
    };
    limit?: number;
  }) => Promise<{
    results: EmailSearchResult[];
    totalCount: number;
  }>;
  getEmailThread: (params: { threadId: string }) => Promise<EmailThreadContent | null>;
  listEmailsByCategory: (params: {
    category:
      | 'travel'
      | 'purchases'
      | 'finance'
      | 'social'
      | 'promos'
      | 'updates'
      | 'forums'
      | 'personal';
    dateRange?: { start?: string; end?: string };
    limit?: number;
  }) => Promise<{
    results: EmailSearchResult[];
    totalCount: number;
  }>;
}

/**
 * Factory to create a SearchToolExecutor with accountId baked in
 */
export type CreateSearchExecutor = (accountId: string) => SearchToolExecutor;

// ============================================================================
// System Prompts
// ============================================================================

const SEARCH_SYSTEM_PROMPT = `You are an intelligent email search assistant. Your job is to help users find information in their emails by planning and executing searches.

CAPABILITIES:
- search_emails: Search by keywords, names, topics, dates. Supports filters for category, date range, senders, attachments.
- get_email_thread: Get full content of a specific thread after finding it via search.
- list_emails_by_category: Browse emails by category (travel, purchases, finance, etc.)

STRATEGY:
1. Analyze the user's question to identify what they're looking for
2. Plan search queries - you can make MULTIPLE searches if needed
3. Start broad, then refine if needed
4. Once you find relevant threads, use get_email_thread to get full content
5. Keep iterating until you have enough information to answer

ITERATION:
- If your first search doesn't find what you need, try different keywords
- Consider synonyms, related terms, sender names, or category browsing

WHEN TO STOP:
- You have enough context to fully answer the user's question
- You've tried multiple approaches and the information doesn't exist

When you have enough information, provide a clear, helpful answer with specific details from the emails (dates, times, confirmation numbers, etc.).`;

const SYNTHESIS_PROMPT = `Based on the email search results, provide a clear, helpful answer to the user's question.

Guidelines:
- Be concise but complete
- Include specific details from the emails (dates, times, confirmation numbers, etc.)
- If you found multiple relevant emails, summarize the key information from each
- If you couldn't find the information, say so clearly and suggest what the user might try
- Cite which emails your information comes from`;

// ============================================================================
// Tool Schemas
// ============================================================================

const bundleTypeEnum = z.enum([
  'travel',
  'purchases',
  'finance',
  'social',
  'promos',
  'updates',
  'forums',
  'personal',
]);

const searchEmailsSchema = z.object({
  query: z.string().describe('Search query - keywords, names, topics'),
  filters: z
    .object({
      bundleTypes: z
        .array(bundleTypeEnum)
        .optional()
        .describe('Filter by email categories'),
      dateRange: z
        .object({
          start: z.string().optional().describe('Start date ISO string'),
          end: z.string().optional().describe('End date ISO string'),
        })
        .optional()
        .describe('Date range filter'),
      senders: z.array(z.string()).optional().describe('Filter by sender emails'),
      hasAttachments: z
        .boolean()
        .optional()
        .describe('Filter by attachment presence'),
      unreadOnly: z.boolean().optional().describe('Only return unread emails'),
    })
    .optional()
    .describe('Optional search filters'),
  limit: z.number().optional().default(10).describe('Max results to return'),
});

const getEmailThreadSchema = z.object({
  threadId: z.string().describe('The thread ID to retrieve'),
});

const listEmailsByCategorySchema = z.object({
  category: bundleTypeEnum.describe('The category to browse'),
  dateRange: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional()
    .describe('Optional date range filter'),
  limit: z.number().optional().default(10).describe('Max results to return'),
});

// Tool definitions (schema only - we execute manually)
const searchTools = {
  search_emails: tool({
    description:
      'Search emails by keywords, entities, or text. Use this for finding specific emails.',
    inputSchema: searchEmailsSchema,
  }),
  get_email_thread: tool({
    description:
      'Get full content of a specific email thread. Use after finding a relevant thread via search.',
    inputSchema: getEmailThreadSchema,
  }),
  list_emails_by_category: tool({
    description:
      'Browse emails by category. Use when user asks about a type of email (travel, purchases, etc).',
    inputSchema: listEmailsByCategorySchema,
  }),
};

// ============================================================================
// Search Agent
// ============================================================================

/**
 * Run the search agent with streaming events
 */
export async function* searchAgent(
  query: string,
  executor: SearchToolExecutor,
  config: SearchAgentConfig,
): AsyncGenerator<SearchAgentEvent> {
  const { accountId, maxIterations = 5, maxToolCalls = 15 } = config;

  const provider = getDefaultProvider();

  // Track results across iterations
  const allResults: EmailSearchResult[] = [];
  const retrievedThreads: Map<string, EmailThreadContent> = new Map();
  let totalToolCalls = 0;
  let iteration = 0;

  // Build conversation context
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  messages.push({
    role: 'user',
    content: `User question: ${query}\n\nGmail Account ID: ${accountId}`,
  });

  try {
    // Main agent loop
    while (iteration < maxIterations && totalToolCalls < maxToolCalls) {
      iteration++;

      yield {
        type: 'planning',
        plan: `Iteration ${iteration}: Analyzing and planning searches...`,
        iteration,
      };

      // Generate with tools (tools have inputSchema only, we execute manually)
      const result = await generateText({
        model: provider(getModel('reasoning')),
        system: SEARCH_SYSTEM_PROMPT,
        messages,
        tools: searchTools,
        toolChoice: 'auto',
      });

      // Check if we got tool calls
      const toolCalls = result.toolCalls;

      // If no tool calls, agent is done thinking - break to synthesize
      if (!toolCalls || toolCalls.length === 0) {
        // Add assistant response to messages for final synthesis
        if (result.text) {
          yield { type: 'thinking', content: result.text };
          messages.push({ role: 'assistant', content: result.text });
        }
        break;
      }

      // Emit tool calls start
      yield {
        type: 'tool_calls_start',
        calls: toolCalls.map((tc) => ({
          toolName: tc.toolName,
          params: tc.input as Record<string, unknown>,
        })),
      };

      // Execute tools manually
      const results: ToolCallResult[] = [];

      for (const tc of toolCalls) {
        let toolResult: unknown = null;
        let error: string | undefined;

        try {
          if (tc.toolName === 'search_emails') {
            const params = tc.input as z.infer<typeof searchEmailsSchema>;
            toolResult = await executor.searchEmails(params);
          } else if (tc.toolName === 'get_email_thread') {
            const params = tc.input as z.infer<typeof getEmailThreadSchema>;
            toolResult = await executor.getEmailThread(params);
          } else if (tc.toolName === 'list_emails_by_category') {
            const params = tc.input as z.infer<typeof listEmailsByCategorySchema>;
            toolResult = await executor.listEmailsByCategory(params);
          }
        } catch (e) {
          error = e instanceof Error ? e.message : 'Tool execution failed';
        }

        const callResult: ToolCallResult = {
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          params: tc.input as Record<string, unknown>,
          result: toolResult,
          error,
        };
        results.push(callResult);

        yield { type: 'tool_call_result', result: callResult };

        // Track search results
        if (tc.toolName === 'search_emails' || tc.toolName === 'list_emails_by_category') {
          const searchResult = toolResult as {
            results: EmailSearchResult[];
          } | null;
          if (searchResult?.results) {
            for (const r of searchResult.results) {
              if (!allResults.find((ar) => ar.threadId === r.threadId)) {
                allResults.push(r);
              }
            }
          }
        }

        if (tc.toolName === 'get_email_thread') {
          const threadContent = toolResult as EmailThreadContent | null;
          if (threadContent) {
            retrievedThreads.set(threadContent.threadId, threadContent);
          }
        }
      }

      totalToolCalls += results.length;

      yield { type: 'tool_calls_complete', results, iteration };

      // Add context to messages for next iteration
      const toolSummary = results
        .map((r) => {
          if (r.error) {
            return `[${r.toolName}] Error: ${r.error}`;
          }
          if (r.toolName === 'search_emails' || r.toolName === 'list_emails_by_category') {
            const data = r.result as { results: EmailSearchResult[]; totalCount: number } | null;
            return `[${r.toolName}] Found ${data?.totalCount ?? 0} emails: ${data?.results
              .slice(0, 3)
              .map((e) => `"${e.subject}"`)
              .join(', ')}${(data?.totalCount ?? 0) > 3 ? '...' : ''}`;
          }
          if (r.toolName === 'get_email_thread') {
            const thread = r.result as EmailThreadContent | null;
            return thread
              ? `[get_email_thread] Retrieved "${thread.subject}" with ${thread.messages.length} messages`
              : `[get_email_thread] Thread not found`;
          }
          return `[${r.toolName}] Completed`;
        })
        .join('\n');

      messages.push({
        role: 'assistant',
        content: `I executed the following tool calls:\n${toolSummary}\n\nLet me analyze the results and decide if I need more information.`,
      });

      // Check if we have enough to answer
      if (allResults.length > 0 || retrievedThreads.size > 0) {
        // Add a message prompting for final answer if we have results
        messages.push({
          role: 'user',
          content: `Based on the search results, can you now answer my original question? If you have enough information, please provide the answer. If you need more searches, continue searching.`,
        });
      }
    }

    // Synthesize final answer
    yield {
      type: 'synthesizing',
      context: `Found ${allResults.length} relevant emails, retrieved ${retrievedThreads.size} full threads`,
    };

    // Build context for synthesis
    const searchContext =
      allResults.length > 0
        ? `Found emails:\n${allResults
            .map(
              (r) =>
                `- "${r.subject}" from ${r.fromName || r.fromEmail} (${r.bundleType || 'uncategorized'})`,
            )
            .join('\n')}`
        : 'No emails found matching the query.';

    const threadContext =
      retrievedThreads.size > 0
        ? `\n\nFull thread content:\n${Array.from(retrievedThreads.values())
            .map(
              (t) =>
                `--- ${t.subject} ---\n${t.messages
                  .map((m) => `From: ${m.from}\nDate: ${m.date}\n${m.body}`)
                  .join('\n\n')}`,
            )
            .join('\n\n')}`
        : '';

    // Stream the final answer
    const { textStream } = streamText({
      model: provider(getModel('reasoning')),
      system: SYNTHESIS_PROMPT,
      prompt: `Original question: ${query}\n\n${searchContext}${threadContext}\n\nProvide a helpful answer based on the email search results above.`,
    });

    let answer = '';
    for await (const delta of textStream) {
      answer += delta;
      yield { type: 'answer_chunk', delta };
    }

    yield {
      type: 'complete',
      answer,
      sources: allResults,
      totalToolCalls,
      iterations: iteration,
    };
  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Non-streaming version for simpler use cases
 */
export async function runSearchAgent(
  query: string,
  executor: SearchToolExecutor,
  config: SearchAgentConfig,
): Promise<{
  answer: string;
  sources: EmailSearchResult[];
  totalToolCalls: number;
  iterations: number;
}> {
  let result = {
    answer: '',
    sources: [] as EmailSearchResult[],
    totalToolCalls: 0,
    iterations: 0,
  };

  for await (const event of searchAgent(query, executor, config)) {
    if (event.type === 'answer_chunk') {
      result.answer += event.delta;
    }
    if (event.type === 'complete') {
      result = {
        answer: event.answer,
        sources: event.sources,
        totalToolCalls: event.totalToolCalls,
        iterations: event.iterations,
      };
    }
  }

  return result;
}
