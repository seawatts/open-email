import { z } from 'zod';

import { sendReply } from '../../services/gmail/actions';
import { protectedProcedure } from '../../trpc';

export const sendReplyProcedure = protectedProcedure
  .input(
    z.object({
      accountId: z.string(),
      body: z.string(),
      cc: z.array(z.string().email()).optional(),
      gmailThreadId: z.string(),
      subject: z.string(),
      to: z.array(z.string().email()),
    }),
  )
  .mutation(async ({ input }) => {
    await sendReply(input.accountId, input.gmailThreadId, {
      body: input.body,
      cc: input.cc,
      subject: input.subject,
      to: input.to,
    });
    return { success: true };
  });
