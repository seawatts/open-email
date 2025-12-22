import { db } from '@seawatts/db/client';
import { AuthCodes, Orgs, Users } from '@seawatts/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, gte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { upsertOrg } from '../services';
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

      try {
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

        // Use the upsertOrg utility function
        await upsertOrg({
          name: `org-${authCode.organizationId}`,
          orgId: authCode.organizationId,
          userId: authCode.userId,
        });

        const response = {
          authToken: authCode.sessionId, // Use session ID as token
          orgId: authCode.organizationId,
          sessionId: authCode.sessionId,
          user: {
            email: user.email,
            fullName: user.name || '',
            id: authCode.userId,
          },
        };
        return response;
      } catch (error) {
        // Handle API errors with detailed metadata
        if (error instanceof Error) {
          // Add context about what operation failed
          const errorContext = {
            authCode: code,
            operation: 'auth_code_exchange',
            orgId: authCode.organizationId,
            originalError: error,
            sessionId: authCode.sessionId,
            sessionTemplate: input.sessionTemplate,
            userId: authCode.userId,
          };

          console.error(
            'An error occurred during auth code exchange:',
            errorContext,
          );

          // Check for specific error patterns
          if (
            error.message.includes('not found') ||
            error.message.includes('404')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'NOT_FOUND',
              message: 'User, session, or organization not found',
            });
          }

          if (
            error.message.includes('unauthorized') ||
            error.message.includes('401')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'UNAUTHORIZED',
              message: 'Unauthorized access',
            });
          }

          if (
            error.message.includes('forbidden') ||
            error.message.includes('403')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'FORBIDDEN',
              message: 'Access forbidden',
            });
          }

          throw new TRPCError({
            cause: error,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to retrieve user or organization data',
          });
        }
        throw new TRPCError({
          cause: new Error(
            `Unknown error during auth code exchange for code: ${code}, userId: ${authCode.userId}, orgId: ${authCode.organizationId}`,
          ),
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'An unexpected error occurred while processing authentication',
        });
      }
    }),
  verifySessionToken: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sessionTemplate: z.enum(['cli', 'supabase']).default('cli'),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        // Get user from context (already authenticated via Better Auth)
        const userId = ctx.auth.userId;
        const orgId = ctx.auth.orgId;

        if (!userId) {
          throw new TRPCError({
            cause: new Error('User not authenticated'),
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
        const org = await db.query.Orgs.findFirst({
          where: eq(Orgs.id, orgId),
        });

        // Use the upsertOrg utility function
        await upsertOrg({
          name: org?.name || `org-${orgId}`,
          orgId,
          userId,
        });

        return {
          authToken: input.sessionId,
          orgId,
          orgName: org?.name || '',
          user: {
            email: user.email,
            fullName: user.name || '',
            id: userId,
          },
        };
      } catch (error) {
        // Handle API errors with detailed metadata
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPC errors as-is
        }
        if (error instanceof Error) {
          // Add context about what operation failed
          const errorContext = {
            operation: 'session_verification',
            originalError: error,
            sessionId: input.sessionId,
            sessionTemplate: input.sessionTemplate,
            userId: ctx.auth.userId,
          };

          console.error(
            'An error occurred during session verification:',
            errorContext,
          );

          // Check for specific error patterns
          if (
            error.message.includes('not found') ||
            error.message.includes('404')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'NOT_FOUND',
              message: 'User, session, or organization not found',
            });
          }

          if (
            error.message.includes('unauthorized') ||
            error.message.includes('401')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'UNAUTHORIZED',
              message: 'Unauthorized access',
            });
          }

          if (
            error.message.includes('forbidden') ||
            error.message.includes('403')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'FORBIDDEN',
              message: 'Access forbidden',
            });
          }

          throw new TRPCError({
            cause: error,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify session or retrieve user data',
          });
        }
        throw new TRPCError({
          cause: new Error(
            `Unknown error during session verification for sessionId: ${input.sessionId}, userId: ${ctx.auth.userId}`,
          ),
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while verifying session',
        });
      }
    }),
};
