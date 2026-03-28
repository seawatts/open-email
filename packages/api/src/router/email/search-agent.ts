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

import { searchEmails } from '../../services/email-search';
import { getThreadWithMessages } from '../../services/email-thread';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { parseDateRange } from '../../utils';

/**
 * Create a SearchToolExecutor that connects to our database.
 * The accountId is baked in so all searches are scoped to the right account.
 */
function createSearchExecutor(accountId: string): SearchToolExecutor {
  return {
    async getEmailThread(params) {
      const result = await getThreadWithMessages(params.threadId, {
        includeMessages: true,
      });

      if (!result) {
        return null;
      }

      return {
        messages: result.messages.map((m) => ({
          body: m.bodyPreview || '',
          date: m.internalDate,
          from: m.fromEmail,
          id: m.id,
          to: m.toEmails,
        })),
        subject: result.thread.subject,
        threadId: result.thread.id,
      };
    },

    async searchEmails(params) {
      const result = await searchEmails({
        filters: {
          accountId,
          dateRange: parseDateRange(params.filters?.dateRange),
          hasAttachments: params.filters?.hasAttachments,
          senders: params.filters?.senders,
          unreadOnly: params.filters?.unreadOnly,
        },
        limit: params.limit,
        query: params.query,
      });

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
        accountId: z.string().describe('Account to search'),
        maxIterations: z.number().min(1).max(10).default(5).optional(),
        maxToolCalls: z.number().min(1).max(30).default(15).optional(),
        query: z
          .string()
          .min(1)
          .describe('Natural language question about emails'),
      }),
    )
    .mutation(async ({ input }) => {
      const executor = createSearchExecutor(input.accountId);

      let finalAnswer = '';
      let sources: EmailSearchResult[] = [];
      let totalToolCalls = 0;
      let iterations = 0;
      const thinkingLog: string[] = [];

      for await (const event of searchAgent(input.query, executor, {
        accountId: input.accountId,
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
        accountId: z.string().describe('Account to search'),
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
        const executor = createSearchExecutor(input.accountId);

        const runAgent = async () => {
          try {
            for await (const event of searchAgent(input.query, executor, {
              accountId: input.accountId,
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
