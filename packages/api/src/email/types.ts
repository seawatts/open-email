import { z } from 'zod';

// ============================================================================
// Core Email Types
// ============================================================================

export type SuggestedAction = 'reply' | 'archive' | 'snooze';

export const suggestedActionSchema = z.enum(['reply', 'archive', 'snooze']);

// ============================================================================
// API Input Schemas
// ============================================================================

export const syncRequestSchema = z.object({
  fullSync: z.boolean().default(false),
  gmailAccountId: z.string().optional(),
});

// ============================================================================
// Gmail OAuth Types
// ============================================================================

export interface GmailTokens {
  accessToken: string;
  email: string;
  expiry: Date;
  name: string | null;
  refreshToken: string;
}

export interface SyncResult {
  errors: string[];
  messagesProcessed: number;
  newHistoryId: string | null;
  threadsProcessed: number;
}
