/**
 * Search Agent Router
 *
 * tRPC router that exposes the search agent as an API endpoint.
 * Connects the AI search agent to the database search service.
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';

import type {
  SearchAgentEvent,
  SearchToolExecutor,
  EmailSearchResult,
} from '@seawatts/ai/tanstack-ai';
import { searchAgent } from '@seawatts/ai/tanstack-ai';

import {
  listEmailsByCategory,
  searchEmails,
} from '../../services/email-search';
import { getThreadWithMessages } from '../../services/email-thread';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { parseDateRange } from '../../utils';
import type { BundleType } from '../../utils';

/**
 * Create a SearchToolExecutor that connects to our database.
 * The gmailAccountId is baked in so all searches are scoped to the right account.
 */
function createSearchExecutor(gmailAccountId: string): SearchToolExecutor {
  return {
    async searchEmails(params) {
      const result = await searchEmails({
        query: params.query,
        filters: {
          gmailAccountId,
          bundleTypes: params.filters?.bundleTypes as BundleType[] | undefined,
          dateRange: parseDateRange(params.filters?.dateRange),
          senders: params.filters?.senders,
          hasAttachments: params.filters?.hasAttachments,
          unreadOnly: params.filters?.unreadOnly,
        },
        limit: params.limit,
      });

      // Results already in correct format from service
      return {
        results: result.results,
        totalCount: result.totalCount,
      };
    },

    async getEmailThread(params) {
      const result = await getThreadWithMessages(params.threadId, {
        includeKeywords: true,
        includeMessages: true,
      });

      if (!result) {
        return null;
      }

      return {
        threadId: result.thread.id,
        subject: result.thread.subject,
        messages: result.messages.map((m) => ({
          id: m.id,
          from: m.fromEmail,
          to: m.toEmails,
          date: m.internalDate,
          body: m.bodyPreview || '',
          snippet: m.snippet || '',
        })),
        keywords: result.keywords.map((k) => ({
          keyword: k.keyword,
          keywordType: k.keywordType,
        })),
      };
    },

    async listEmailsByCategory(params) {
      const result = await listEmailsByCategory({
        category: params.category,
        gmailAccountId,
        dateRange: parseDateRange(params.dateRange),
        limit: params.limit,
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
   * Stream search agent responses
   * Uses tRPC subscriptions for real-time streaming
   */
  askStream: protectedProcedure
    .input(
      z.object({
        query: z
          .string()
          .min(1)
          .describe('Natural language question about emails'),
        gmailAccountId: z.string().describe('Gmail account to search'),
        maxIterations: z.number().min(1).max(10).default(5).optional(),
        maxToolCalls: z.number().min(1).max(30).default(15).optional(),
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

  /**
   * Non-streaming version - runs agent and returns final result
   */
  ask: protectedProcedure
    .input(
      z.object({
        query: z
          .string()
          .min(1)
          .describe('Natural language question about emails'),
        gmailAccountId: z.string().describe('Gmail account to search'),
        maxIterations: z.number().min(1).max(10).default(5).optional(),
        maxToolCalls: z.number().min(1).max(30).default(15).optional(),
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
        sources,
        totalToolCalls,
        iterations,
        thinking: thinkingLog.join('\n'),
      };
    }),
});
