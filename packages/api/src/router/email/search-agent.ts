/**
 * Search Agent Router
 *
 * tRPC router that exposes the search agent as an API endpoint.
 * Connects the AI search agent to the database search service.
 */

import type {
  EmailSearchResult,
  SearchAgentEvent,
  SearchToolExecutor,
} from '@seawatts/ai/tanstack-ai';
import { searchAgent } from '@seawatts/ai/tanstack-ai';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import {
  listEmailsByCategory,
  searchEmails,
} from '../../services/email-search';
import { getThreadWithMessages } from '../../services/email-thread';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import type { BundleType } from '../../utils';
import { parseDateRange } from '../../utils';

/**
 * Create a SearchToolExecutor that connects to our database.
 * The gmailAccountId is baked in so all searches are scoped to the right account.
 */
function createSearchExecutor(gmailAccountId: string): SearchToolExecutor {
  return {
    async getEmailThread(params) {
      const result = await getThreadWithMessages(params.threadId, {
        includeKeywords: true,
        includeMessages: true,
      });

      if (!result) {
        return null;
      }

      return {
        keywords: result.keywords.map((k) => ({
          keyword: k.keyword,
          keywordType: k.keywordType,
        })),
        messages: result.messages.map((m) => ({
          body: m.bodyPreview || '',
          date: m.internalDate,
          from: m.fromEmail,
          id: m.id,
          snippet: m.snippet || '',
          to: m.toEmails,
        })),
        subject: result.thread.subject,
        threadId: result.thread.id,
      };
    },

    async listEmailsByCategory(params) {
      const result = await listEmailsByCategory({
        category: params.category,
        dateRange: parseDateRange(params.dateRange),
        gmailAccountId,
        limit: params.limit,
      });

      // Results already in correct format from service
      return {
        results: result.results,
        totalCount: result.totalCount,
      };
    },
    async searchEmails(params) {
      const result = await searchEmails({
        filters: {
          bundleTypes: params.filters?.bundleTypes as BundleType[] | undefined,
          dateRange: parseDateRange(params.filters?.dateRange),
          gmailAccountId,
          hasAttachments: params.filters?.hasAttachments,
          senders: params.filters?.senders,
          unreadOnly: params.filters?.unreadOnly,
        },
        limit: params.limit,
        query: params.query,
      });

      // Results already in correct format from service
      return {
        results: result.results,
        totalCount: result.totalCount,
      };
    },
  };
}

export const searchAgentRouter = createTRPCRouter({
  /**
   * Non-streaming version - runs agent and returns final result
   */
  ask: protectedProcedure
    .input(
      z.object({
        gmailAccountId: z.string().describe('Gmail account to search'),
        maxIterations: z.number().min(1).max(10).default(5).optional(),
        maxToolCalls: z.number().min(1).max(30).default(15).optional(),
        query: z
          .string()
          .min(1)
          .describe('Natural language question about emails'),
      }),
    )
    .mutation(async ({ input }) => {
      // Create executor with gmailAccountId baked in
      const executor = createSearchExecutor(input.gmailAccountId);

      let finalAnswer = '';
      let sources: EmailSearchResult[] = [];
      let totalToolCalls = 0;
      let iterations = 0;
      const thinkingLog: string[] = [];

      for await (const event of searchAgent(input.query, executor, {
        gmailAccountId: input.gmailAccountId,
        maxIterations: input.maxIterations,
        maxToolCalls: input.maxToolCalls,
      })) {
        if (event.type === 'thinking') {
          thinkingLog.push(event.content);
        }
        if (event.type === 'answer_chunk') {
          finalAnswer += event.delta;
        }
        if (event.type === 'complete') {
          finalAnswer = event.answer;
          sources = event.sources;
          totalToolCalls = event.totalToolCalls;
          iterations = event.iterations;
        }
        if (event.type === 'error') {
          throw new Error(event.error);
        }
      }

      return {
        answer: finalAnswer,
        iterations,
        sources,
        thinking: thinkingLog.join('\n'),
        totalToolCalls,
      };
    }),
  /**
   * Stream search agent responses
   * Uses tRPC subscriptions for real-time streaming
   */
  askStream: protectedProcedure
    .input(
      z.object({
        gmailAccountId: z.string().describe('Gmail account to search'),
        maxIterations: z.number().min(1).max(10).default(5).optional(),
        maxToolCalls: z.number().min(1).max(30).default(15).optional(),
        query: z
          .string()
          .min(1)
          .describe('Natural language question about emails'),
      }),
    )
    .subscription(({ input }) => {
      return observable<SearchAgentEvent>((emit) => {
        // Create executor with gmailAccountId baked in
        const executor = createSearchExecutor(input.gmailAccountId);

        const runAgent = async () => {
          try {
            for await (const event of searchAgent(input.query, executor, {
              gmailAccountId: input.gmailAccountId,
              maxIterations: input.maxIterations,
              maxToolCalls: input.maxToolCalls,
            })) {
              emit.next(event);
            }
            emit.complete();
          } catch (error) {
            emit.error(
              error instanceof Error ? error : new Error('Search agent failed'),
            );
          }
        };

        runAgent();

        return () => {
          // Cleanup if needed
        };
      });
    }),
});
