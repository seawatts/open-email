import { EmailMessages } from '@seawatts/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const contentRouter = createTRPCRouter({
  getAttachments: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .query(async ({ ctx, input }) => {
      const message = await ctx.db.query.EmailMessages.findFirst({
        columns: { attachmentMeta: true },
        where: eq(EmailMessages.id, input.messageId),
      });

      if (!message?.attachmentMeta) {
        return [];
      }

      return message.attachmentMeta.map((att) => ({
        filename: att.filename,
        id: att.id ?? null,
        mimeType: att.mimeType,
        size: att.size,
        url: null as string | null,
      }));
    }),

  getBody: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        preferHtml: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const message = await ctx.db.query.EmailMessages.findFirst({
        columns: {
          bodyHtml: true,
          bodyPreview: true,
          bodyText: true,
        },
        where: eq(EmailMessages.id, input.messageId),
      });

      if (!message) {
        return { content: null, contentType: null };
      }

      if (input.preferHtml && message.bodyHtml) {
        return { content: message.bodyHtml, contentType: 'text/html' as const };
      }

      if (message.bodyText) {
        return {
          content: message.bodyText,
          contentType: 'text/plain' as const,
        };
      }

      if (message.bodyHtml) {
        return { content: message.bodyHtml, contentType: 'text/html' as const };
      }

      return {
        content: message.bodyPreview,
        contentType: 'text/plain' as const,
      };
    }),
});
