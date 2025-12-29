import { signCustomJwt } from '@seawatts/auth/jwt-signer';
import { db } from '@seawatts/db/client';
import { AuthCodes, Orgs, Users } from '@seawatts/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, gte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../trpc';

export const authRouter = {
  exchangeAuthCode: publicProcedure
    .input(
      z.object({
        code: z.string(),
        sessionTemplate: z.enum(['cli', 'supabase']).default('cli'),
      }),
    )
    .mutation(async ({ input }) => {
      const { code } = input;

      const authCode = await db.transaction(async (tx) => {
        const foundCode = await tx.query.AuthCodes.findFirst({
          where: and(
            eq(AuthCodes.id, code),
            isNull(AuthCodes.usedAt),
            gte(AuthCodes.expiresAt, new Date()),
          ),
        });

        if (!foundCode) {
          return null;
        }

        await tx
          .update(AuthCodes)
          .set({
            usedAt: new Date(),
          })
          .where(eq(AuthCodes.id, code));

        return foundCode;
      });

      if (!authCode) {
        throw new TRPCError({
          cause: new Error(`Auth code validation failed for code: ${code}`),
          code: 'BAD_REQUEST',
          message: 'Invalid or expired authentication code',
        });
      }

      // Get user from database
      const user = await db.query.Users.findFirst({
        where: eq(Users.id, authCode.userId),
      });

      if (!user) {
        throw new TRPCError({
          cause: new Error(`User not found for userId: ${authCode.userId}`),
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Get organization from database
      const organization = await db.query.Orgs.findFirst({
        where: eq(Orgs.id, authCode.orgId),
      });

      if (!organization) {
        throw new TRPCError({
          cause: new Error(
            `Organization not found for orgId: ${authCode.orgId}`,
          ),
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      // Sign JWT using our custom signer
      const sessionToken = signCustomJwt({
        orgId: authCode.orgId,
        sessionId: authCode.sessionId,
        template: input.sessionTemplate,
        userId: authCode.userId,
      });

      return {
        authToken: sessionToken,
        orgId: authCode.orgId,
        sessionId: authCode.sessionId,
        user: {
          email: user.email,
          fullName:
            user.name ??
            (user.firstName || user.lastName
              ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
              : null),
          id: authCode.userId,
        },
      };
    }),

  verifySessionToken: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sessionTemplate: z.enum(['cli', 'supabase']).default('cli'),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.auth.userId;
      const orgId = ctx.auth.orgId;

      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      // Get user from database
      const user = await db.query.Users.findFirst({
        where: eq(Users.id, userId),
      });

      if (!user) {
        throw new TRPCError({
          cause: new Error(`User not found for userId: ${userId}`),
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (!orgId) {
        throw new TRPCError({
          cause: new Error(
            `No active organization for session: ${input.sessionId}, userId: ${userId}`,
          ),
          code: 'BAD_REQUEST',
          message: 'No active organization found for this session',
        });
      }

      // Get organization from database
      const organization = await db.query.Orgs.findFirst({
        where: eq(Orgs.id, orgId),
      });

      if (!organization) {
        throw new TRPCError({
          cause: new Error(`Organization not found for orgId: ${orgId}`),
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      // Sign a fresh JWT token for realtime connections
      const sessionToken = signCustomJwt({
        orgId,
        sessionId: input.sessionId,
        template: input.sessionTemplate,
        userId,
      });

      return {
        authToken: sessionToken,
        orgId,
        orgName: organization.name,
        user: {
          email: user.email,
          fullName:
            user.name ??
            (user.firstName || user.lastName
              ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
              : null),
          id: userId,
        },
      };
    }),
};
