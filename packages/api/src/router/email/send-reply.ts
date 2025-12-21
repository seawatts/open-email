/**
 * Send Reply Procedure
 * Handles sending email replies
 */

import { EmailActions } from '@seawatts/db/schema';

import { sendReplySchema } from '../../email/types';
import { protectedProcedure } from '../../trpc';

export const sendReplyProcedure = protectedProcedure
  .input(sendReplySchema)
  .mutation(async ({ ctx, input }) => {
    // Create a send action
    const [action] = await ctx.db
      .insert(EmailActions)
      .values({
        actionType: 'send',
        payload: {
          body: input.body,
          cc: input.cc,
          subject: input.subject,
          to: input.to,
        },
        status: 'pending',
        threadId: input.threadId,
      })
      .returning();

    return action;
  });
