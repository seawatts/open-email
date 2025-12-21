/**
 * Email Search Agent
 *
 * A plan-and-execute agent that can:
 * 1. Take a natural language query
 * 2. Plan and execute multiple search tool calls (in parallel when possible)
 * 3. Loop iteratively to refine searches until enough context is gathered
 * 4. Synthesize an answer from the retrieved emails
 *
 * Similar to how Cursor's agent works with multiple tool call iterations.
 */

import { chat, toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

import { getDefaultAdapter, getModel } from './adapters';
import {
  emailSearchTools,
  getEmailThreadParams,
  listEmailsByCategoryParams,
  searchEmailsParams,
  TOOL_NAMES,
} from './tools';

// ============================================================================
// Types
// ============================================================================

export interface SearchAgentConfig {
  /** Gmail account ID to search within */
  gmailAccountId: string;
  /** Maximum number of agent iterations (default: 5) */
  maxIterations?: number;
  /** Maximum total tool calls across all iterations (default: 15) */
  maxToolCalls?: number;
  /** Whether to include full thread content in final answer (default: true) */
  includeFullContent?: boolean;
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
  | { type: 'tool_calls_start'; calls: Array<{ toolName: string; params: Record<string, unknown> }> }
  | { type: 'tool_call_result'; result: ToolCallResult }
  | { type: 'tool_calls_complete'; results: ToolCallResult[]; iteration: number }
  | { type: 'refining'; reason: string; iteration: number }
  | { type: 'synthesizing'; context: string }
  | { type: 'answer_chunk'; delta: string }
  | { type: 'complete'; answer: string; sources: EmailSearchResult[]; totalToolCalls: number; iterations: number }
  | { type: 'error'; error: string };

// ============================================================================
// Tool Execution Interface
// ============================================================================

/**
 * Interface for executing search tools.
 * Inject this to connect the agent to your actual search service.
 * The executor is pre-configured with gmailAccountId so individual
 * tool calls don't need to pass it.
 */
export interface SearchToolExecutor {
  searchEmails: (params: z.infer<typeof searchEmailsParams>) => Promise<{
    results: EmailSearchResult[];
    totalCount: number;
  }>;
  getEmailThread: (params: z.infer<typeof getEmailThreadParams>) => Promise<EmailThreadContent | null>;
  listEmailsByCategory: (params: z.infer<typeof listEmailsByCategoryParams>) => Promise<{
    results: EmailSearchResult[];
    totalCount: number;
  }>;
}

/**
 * Factory to create a SearchToolExecutor with gmailAccountId baked in
 */
export type CreateSearchExecutor = (gmailAccountId: string) => SearchToolExecutor;

// ============================================================================
// System Prompts
// ============================================================================

const SEARCH_PLANNING_PROMPT = `You are an intelligent email search assistant. Your job is to help users find information in their emails by planning and executing searches.

CAPABILITIES:
- search_emails: Search by keywords, names, topics, dates. Supports filters for category, date range, senders, attachments.
- get_email_thread: Get full content of a specific thread after finding it via search.
- list_emails_by_category: Browse emails by category (travel, purchases, finance, etc.)

STRATEGY:
1. Analyze the user's question to identify what they're looking for
2. Plan search queries - you can make MULTIPLE searches in PARALLEL if needed
3. Start broad, then refine if needed
4. Once you find relevant threads, use get_email_thread to get full content
5. Keep iterating until you have enough information to answer

PARALLEL EXECUTION:
- You can call multiple tools at once in a single response
- Use this for efficiency: e.g., search for "flight" AND "hotel" simultaneously
- Also use it to get full content of multiple threads at once

ITERATION:
- If your first search doesn't find what you need, try different keywords
- Consider synonyms, related terms, sender names, or category browsing
- Maximum of 5 iterations - be efficient

WHEN TO STOP:
- You have enough context to fully answer the user's question
- You've tried multiple approaches and the information doesn't exist
- You've reached the iteration limit

Always explain your reasoning before making tool calls.`;

const SYNTHESIS_PROMPT = `Based on the email context you've gathered, provide a clear, helpful answer to the user's question.

Guidelines:
- Be concise but complete
- Include specific details from the emails (dates, times, confirmation numbers, etc.)
- If you found multiple relevant emails, summarize the key information from each
- If you couldn't find the information, say so clearly and suggest what the user might try
- Cite which emails your information comes from`;

// ============================================================================
// Internal Tool Definitions for Agent
// ============================================================================

const agentSearchTool = toolDefinition({
  description: 'Search emails by keywords, entities, or text with optional filters',
  inputSchema: searchEmailsParams,
  name: TOOL_NAMES.SEARCH_EMAILS as 'search_emails',
});

const agentGetThreadTool = toolDefinition({
  description: 'Get full content of a specific email thread',
  inputSchema: getEmailThreadParams,
  name: TOOL_NAMES.GET_EMAIL_THREAD as 'get_email_thread',
});

const agentListCategoryTool = toolDefinition({
  description: 'List recent emails by category/bundle type',
  inputSchema: listEmailsByCategoryParams,
  name: TOOL_NAMES.LIST_EMAILS_BY_CATEGORY as 'list_emails_by_category',
});

const agentTools = [agentSearchTool, agentGetThreadTool, agentListCategoryTool];

// ============================================================================
// Main Search Agent
// ============================================================================

/**
 * Execute the search agent loop
 *
 * @param query - User's natural language question
 * @param executor - Tool executor that connects to your search service
 * @param config - Agent configuration
 * @yields SearchAgentEvent - Streaming events for UI updates
 */
export async function* searchAgent(
  query: string,
  executor: SearchToolExecutor,
  config: SearchAgentConfig,
): AsyncGenerator<SearchAgentEvent> {
  const {
    gmailAccountId,
    maxIterations = 5,
    maxToolCalls = 15,
    includeFullContent = true,
  } = config;

  const adapter = getDefaultAdapter();

  // Track state across iterations
  let totalToolCalls = 0;
  let iteration = 0;
  const allResults: EmailSearchResult[] = [];
  const retrievedThreads: Map<string, EmailThreadContent> = new Map();

  // Use simple text messages for conversation history
  // TanStack AI handles tool calling internally per-turn, we just need to
  // communicate context across iterations as regular messages
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Initial user message
  conversationHistory.push({
    role: 'user',
    content: `User question: ${query}\n\nGmail Account ID to search: ${gmailAccountId}`,
  });

  try {
    // Main agent loop
    while (iteration < maxIterations && totalToolCalls < maxToolCalls) {
      iteration++;

      yield { type: 'planning', plan: `Iteration ${iteration}: Analyzing and planning searches...`, iteration };

      // Get agent's response with potential tool calls
      const stream = chat({
        adapter,
        messages: conversationHistory,
        model: getModel('reasoning'),
        systemPrompts: [SEARCH_PLANNING_PROMPT],
        tools: agentTools,
      });

      const pendingToolCalls: Array<{
        id: string;
        name: string;
        arguments: string;
      }> = [];
      let assistantContent = '';
      let hasToolCalls = false;

      // Collect the response
      let toolCallIndex = 0;
      for await (const chunk of stream) {
        if (chunk.type === 'thinking' || chunk.type === 'content') {
          const text = chunk.type === 'thinking' ? chunk.content : chunk.delta;
          assistantContent += text;
          yield { type: 'thinking', content: text };
        }

        if (chunk.type === 'tool_call') {
          hasToolCalls = true;
          // Generate ID if TanStack AI doesn't provide one (OpenAI requires non-empty)
          const toolCallId =
            chunk.toolCall.id && chunk.toolCall.id.length > 0
              ? chunk.toolCall.id
              : `call_${iteration}_${toolCallIndex++}_${Date.now()}`;
          pendingToolCalls.push({
            id: toolCallId,
            name: chunk.toolCall.function.name,
            arguments: chunk.toolCall.function.arguments,
          });
        }
      }

      // If no tool calls, agent is done - add content and break to synthesize
      if (!hasToolCalls || pendingToolCalls.length === 0) {
        if (assistantContent) {
          conversationHistory.push({ role: 'assistant', content: assistantContent });
        }
        break;
      }

      // Add assistant thinking to history
      if (assistantContent) {
        conversationHistory.push({ role: 'assistant', content: assistantContent });
      }

      // Check tool call limit
      if (totalToolCalls + pendingToolCalls.length > maxToolCalls) {
        yield {
          type: 'refining',
          reason: `Approaching tool call limit (${totalToolCalls}/${maxToolCalls}). Synthesizing with current context.`,
          iteration,
        };
        break;
      }

      // Emit tool calls start event
      yield {
        type: 'tool_calls_start',
        calls: pendingToolCalls.map((tc) => ({
          toolName: tc.name,
          params: JSON.parse(tc.arguments) as Record<string, unknown>,
        })),
      };

      // Execute tool calls in PARALLEL
      const toolResults = await executeToolCallsInParallel(
        pendingToolCalls,
        executor,
        gmailAccountId,
      );

      totalToolCalls += toolResults.length;

      // Process results and update state
      for (const result of toolResults) {
        yield { type: 'tool_call_result', result };

        // Track results for final answer
        if (result.toolName === TOOL_NAMES.SEARCH_EMAILS || result.toolName === TOOL_NAMES.LIST_EMAILS_BY_CATEGORY) {
          const searchResult = result.result as { results: EmailSearchResult[] } | undefined;
          if (searchResult?.results) {
            for (const r of searchResult.results) {
              if (!allResults.find((ar) => ar.threadId === r.threadId)) {
                allResults.push(r);
              }
            }
          }
        }

        if (result.toolName === TOOL_NAMES.GET_EMAIL_THREAD) {
          const threadContent = result.result as EmailThreadContent | null;
          if (threadContent) {
            retrievedThreads.set(threadContent.threadId, threadContent);
          }
        }

        // Add tool result summary to conversation as user message for next iteration
        // (TanStack AI doesn't support tool role, so we summarize as text)
      }

      yield { type: 'tool_calls_complete', results: toolResults, iteration };

      // Check if we should continue
      // Add context about what we've found so far
      const contextSummary = buildContextSummary(allResults, retrievedThreads);
      conversationHistory.push({
        role: 'user',
        content: `Tool results received. Current context:\n${contextSummary}\n\nDo you have enough information to answer the user's question? If yes, provide the answer. If not, make additional tool calls to gather more context.`,
      });
    }

    // Synthesize final answer
    yield { type: 'synthesizing', context: `Found ${allResults.length} relevant emails, retrieved ${retrievedThreads.size} full threads` };

    const answer = await synthesizeAnswer(
      query,
      allResults,
      retrievedThreads,
      adapter,
    );

    // Stream the answer
    let fullAnswer = '';
    for await (const chunk of answer) {
      fullAnswer += chunk;
      yield { type: 'answer_chunk', delta: chunk };
    }

    yield {
      type: 'complete',
      answer: fullAnswer,
      sources: allResults,
      totalToolCalls,
      iterations: iteration,
    };
  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in search agent',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute multiple tool calls in parallel
 */
async function executeToolCallsInParallel(
  toolCalls: Array<{ id: string; name: string; arguments: string }>,
  executor: SearchToolExecutor,
  gmailAccountId: string,
): Promise<ToolCallResult[]> {
  const promises = toolCalls.map(async (tc): Promise<ToolCallResult> => {
    try {
      const params = JSON.parse(tc.arguments) as Record<string, unknown>;

      // Execute search with gmailAccountId injected by executor
      if (tc.name === TOOL_NAMES.SEARCH_EMAILS) {
        const searchParams = params as z.infer<typeof searchEmailsParams>;
        // Pass gmailAccountId separately - executor will handle it
        const result = await executor.searchEmails({
          ...searchParams,
          // Executor knows to use gmailAccountId from config
        });
        return { toolCallId: tc.id, toolName: tc.name, params, result };
      }

      if (tc.name === TOOL_NAMES.GET_EMAIL_THREAD) {
        const threadParams = params as z.infer<typeof getEmailThreadParams>;
        const result = await executor.getEmailThread(threadParams);
        return { toolCallId: tc.id, toolName: tc.name, params, result };
      }

      if (tc.name === TOOL_NAMES.LIST_EMAILS_BY_CATEGORY) {
        const categoryParams = params as z.infer<typeof listEmailsByCategoryParams>;
        const result = await executor.listEmailsByCategory(categoryParams);
        return { toolCallId: tc.id, toolName: tc.name, params, result };
      }

      return {
        toolCallId: tc.id,
        toolName: tc.name,
        params,
        result: null,
        error: `Unknown tool: ${tc.name}`,
      };
    } catch (error) {
      return {
        toolCallId: tc.id,
        toolName: tc.name,
        params: JSON.parse(tc.arguments) as Record<string, unknown>,
        result: null,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  });

  return Promise.all(promises);
}

/**
 * Build a summary of the current context for the agent
 */
function buildContextSummary(
  results: EmailSearchResult[],
  threads: Map<string, EmailThreadContent>,
): string {
  const lines: string[] = [];

  lines.push(`Found ${results.length} relevant email threads.`);

  if (results.length > 0) {
    lines.push('\nTop results:');
    for (const r of results.slice(0, 5)) {
      lines.push(`- "${r.subject}" from ${r.fromEmail} (${r.bundleType || 'uncategorized'})`);
      if (r.matchingKeywords.length > 0) {
        lines.push(`  Keywords: ${r.matchingKeywords.map((k) => k.keyword).join(', ')}`);
      }
    }
  }

  if (threads.size > 0) {
    lines.push(`\nRetrieved full content for ${threads.size} threads.`);
  }

  return lines.join('\n');
}

/**
 * Synthesize final answer from gathered context
 */
async function* synthesizeAnswer(
  query: string,
  results: EmailSearchResult[],
  threads: Map<string, EmailThreadContent>,
  adapter: ReturnType<typeof getDefaultAdapter>,
): AsyncGenerator<string> {
  // Build context from threads
  const contextParts: string[] = [];

  for (const [threadId, thread] of threads) {
    const result = results.find((r) => r.threadId === threadId);
    contextParts.push(`
--- Email Thread: "${thread.subject}" ---
From: ${thread.messages[0]?.from || 'Unknown'}
Date: ${thread.messages[0]?.date || 'Unknown'}
${thread.messages.map((m) => `
[${m.date}] ${m.from}:
${m.body.slice(0, 500)}${m.body.length > 500 ? '...' : ''}
`).join('\n')}
Keywords: ${thread.keywords.map((k) => k.keyword).join(', ')}
---`);
  }

  // If we have results but no full threads, include snippets
  if (threads.size === 0 && results.length > 0) {
    for (const r of results.slice(0, 10)) {
      contextParts.push(`
--- Email: "${r.subject}" ---
From: ${r.fromEmail} (${r.fromName || ''})
Date: ${r.lastMessageAt}
Category: ${r.bundleType || 'uncategorized'}
Snippet: ${r.snippet}
Keywords: ${r.matchingKeywords.map((k) => k.keyword).join(', ')}
---`);
    }
  }

  const synthesisPrompt = `User question: ${query}

Email context found:
${contextParts.join('\n\n')}

${contextParts.length === 0 ? 'No relevant emails were found.' : ''}

Please provide a helpful answer based on the email context above.`;

  const stream = chat({
    adapter,
    messages: [{ content: synthesisPrompt, role: 'user' }],
    model: getModel('reasoning'),
    systemPrompts: [SYNTHESIS_PROMPT],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content') {
      yield chunk.delta;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Run search agent and collect all events into a single result
 */
export async function runSearchAgent(
  query: string,
  executor: SearchToolExecutor,
  config: SearchAgentConfig,
): Promise<{
  answer: string;
  sources: EmailSearchResult[];
  events: SearchAgentEvent[];
  totalToolCalls: number;
  iterations: number;
}> {
  const events: SearchAgentEvent[] = [];
  let finalAnswer = '';
  let sources: EmailSearchResult[] = [];
  let totalToolCalls = 0;
  let iterations = 0;

  for await (const event of searchAgent(query, executor, config)) {
    events.push(event);

    if (event.type === 'complete') {
      finalAnswer = event.answer;
      sources = event.sources;
      totalToolCalls = event.totalToolCalls;
      iterations = event.iterations;
    }

    if (event.type === 'answer_chunk') {
      finalAnswer += event.delta;
    }
  }

  return { answer: finalAnswer, sources, events, totalToolCalls, iterations };
}

