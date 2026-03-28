import { z } from 'zod';

// ============================================================================
// Quick Triage Schemas (single-call gpt-4o-mini)
// ============================================================================

export const quickReplyOptionSchema = z.object({
  body: z
    .string()
    .describe('Full reply draft matching the user writing style'),
  label: z.string().max(30).describe('Short button label, e.g. "Sounds good"'),
});

export const quickTriageSchema = z.object({
  action: z
    .enum(['reply', 'archive', 'snooze'])
    .describe(
      'The single best action: REPLY if response needed, ARCHIVE if done/informational/no action needed, SNOOZE if not urgent and should revisit later',
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the chosen action (0-1)'),
  quickReplies: z
    .array(quickReplyOptionSchema)
    .max(3)
    .describe(
      'For REPLY actions: 0-3 quick reply options. First entry is the primary draft.',
    ),
  summary: z
    .string()
    .max(100)
    .describe(
      'One-line summary of the email thread, including attachment context if relevant',
    ),
});

export type QuickTriageResult = z.infer<typeof quickTriageSchema>;
export type QuickReplyOption = z.infer<typeof quickReplyOptionSchema>;
