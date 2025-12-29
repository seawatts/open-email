/**
 * User Profile Extraction Service
 *
 * Analyzes user's sent emails to extract:
 * - Writing style (formality, tone, common phrases)
 * - Facts about the user (name, company, role)
 * - Per-contact communication patterns
 * - Email signature detection
 */

import { getDefaultAdapter, getModel } from '@seawatts/ai';
import type {
  EmailMessageType,
  VocabularyProfileJson,
} from '@seawatts/db/schema';
import { chat, toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface UserSentMessage {
  message: EmailMessageType;
  recipientEmails: string[];
  recipientDomains: string[];
}

export interface ExtractedWritingStyle {
  formalityLevel: number; // 0 = casual, 1 = formal
  greeting?: string;
  signoff?: string;
  commonPhrases: string[];
  vocabularyProfile: VocabularyProfileJson;
  detectedSignature?: string;
}

export interface ExtractedFact {
  content: string;
  factType:
    | 'fact'
    | 'preference'
    | 'writing_style'
    | 'signature'
    | 'relationship';
  confidence: number;
  source?: string;
}

export interface ContactStyleUpdate {
  contactEmail?: string;
  contactDomain?: string;
  formalityLevel: number;
  typicalGreeting?: string;
  typicalSignoff?: string;
  commonPhrases: string[];
}

export interface ProfileExtractionResult {
  globalStyle: ExtractedWritingStyle;
  contactStyles: ContactStyleUpdate[];
  facts: ExtractedFact[];
  processingTimeMs: number;
}

// ============================================================================
// Prompts
// ============================================================================

const WRITING_STYLE_SYSTEM_PROMPT = `You are an expert at analyzing writing style and communication patterns.

Analyze the user's sent email(s) to understand how they communicate. Focus on:

1. **Formality Level** (0.0 to 1.0):
   - 0.0: Very casual ("hey", "what's up", "lol", emojis)
   - 0.3: Casual professional ("Hi", "Thanks!", contractions)
   - 0.5: Neutral professional ("Hello", "Thank you")
   - 0.7: Formal ("Dear", "Best regards", full sentences)
   - 1.0: Very formal ("Dear Sir/Madam", no contractions, formal titles)

2. **Greetings**: How do they start emails? (Hi, Hey, Hello, Dear, no greeting)

3. **Sign-offs**: How do they end? (Thanks, Best, Cheers, Regards, no sign-off)

4. **Common Phrases**: Recurring phrases or expressions they use

5. **Vocabulary Profile**:
   - Technical level (0-1): How technical is their language?
   - Emoji usage (0-1): How often do they use emojis?
   - Contraction usage (0-1): Do they use contractions?

6. **Signature**: Their email signature if detected

Be precise and base analysis only on the actual content provided.`;

const FACT_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting facts about a person from their emails.

Analyze the user's sent emails to identify facts about them:

1. **Personal Facts**: Name, title, company, role
2. **Preferences**: Communication preferences, work style
3. **Relationships**: How they relate to contacts (colleague, friend, client)

RULES:
- Only extract facts that are clearly evident from the emails
- Do not guess or infer information that isn't explicitly stated
- Assign confidence scores based on how clearly the fact is stated
- Include the source (which email part revealed this fact)`;

// ============================================================================
// Tool Definitions
// ============================================================================

const extractWritingStyleTool = toolDefinition({
  description: 'Extract writing style analysis from user emails',
  inputSchema: z.object({
    commonPhrases: z.array(z.string()).describe('Frequently used phrases'),
    detectedSignature: z
      .string()
      .optional()
      .describe('Email signature if found'),
    formalityLevel: z.number().min(0).max(1).describe('Overall formality 0-1'),
    greeting: z.string().optional().describe('Typical greeting used'),
    signoff: z.string().optional().describe('Typical sign-off used'),
    vocabularyProfile: z.object({
      contractionUsage: z.number().min(0).max(1),
      emojiUsage: z.number().min(0).max(1),
      technicalLevel: z.number().min(0).max(1),
    }),
  }),
  name: 'extract_writing_style' as const,
});

const extractContactStyleTool = toolDefinition({
  description: 'Extract writing style specific to a recipient',
  inputSchema: z.object({
    commonPhrases: z.array(z.string()),
    contactDomain: z.string().optional(),
    contactEmail: z.string().optional(),
    formalityLevel: z.number().min(0).max(1),
    typicalGreeting: z.string().optional(),
    typicalSignoff: z.string().optional(),
  }),
  name: 'extract_contact_style' as const,
});

const extractFactsTool = toolDefinition({
  description: 'Extract facts about the user from their emails',
  inputSchema: z.object({
    facts: z.array(
      z.object({
        confidence: z.number().min(0).max(1),
        content: z.string().describe('The fact statement'),
        factType: z.enum([
          'fact',
          'preference',
          'writing_style',
          'signature',
          'relationship',
        ]),
        source: z.string().optional().describe('Where this fact was found'),
      }),
    ),
  }),
  name: 'extract_facts' as const,
});

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze user's sent messages to extract their writing style and facts.
 * This is the main entry point for profile extraction.
 */
export async function extractUserProfile(
  userEmail: string,
  sentMessages: UserSentMessage[],
): Promise<ProfileExtractionResult> {
  const startTime = performance.now();

  if (sentMessages.length === 0) {
    return {
      contactStyles: [],
      facts: [],
      globalStyle: {
        commonPhrases: [],
        formalityLevel: 0.5,
        vocabularyProfile: {
          contractionUsage: 0.5,
          emojiUsage: 0.1,
          technicalLevel: 0.5,
        },
      },
      processingTimeMs: 0,
    };
  }

  // Build context from all sent messages
  const globalContext = buildGlobalContext(sentMessages);

  // Extract global writing style
  const globalStyle = await extractWritingStyleWithAI(globalContext);

  // Group messages by recipient domain for contact-specific analysis
  const messagesByDomain = groupMessagesByDomain(sentMessages);

  // Extract per-contact styles (limit to most frequent contacts)
  const contactStyles: ContactStyleUpdate[] = [];
  const topDomains = Object.entries(messagesByDomain)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10); // Limit to top 10 domains

  for (const [domain, messages] of topDomains) {
    if (messages.length >= 2) {
      // Only analyze if we have enough data
      const contactStyle = await extractContactStyleWithAI(domain, messages);
      if (contactStyle) {
        contactStyles.push(contactStyle);
      }
    }
  }

  // Extract facts about the user
  const facts = await extractFactsWithAI(globalContext, userEmail);

  return {
    contactStyles,
    facts,
    globalStyle,
    processingTimeMs: performance.now() - startTime,
  };
}

/**
 * Analyze a single sent message for quick style updates.
 * Used during incremental sync to update contact styles.
 */
export async function analyzeNewSentMessage(
  message: EmailMessageType,
  recipientEmails: string[],
): Promise<ContactStyleUpdate | null> {
  if (!message.bodyPreview && !message.snippet) {
    return null;
  }

  const context = buildSingleMessageContext(message, recipientEmails);

  // Extract style for the primary recipient's domain
  const primaryEmail = recipientEmails[0];
  if (!primaryEmail) return null;

  const domain = primaryEmail.split('@')[1];
  if (!domain) return null;

  return extractContactStyleWithAI(domain, [
    { message, recipientDomains: [domain], recipientEmails },
  ]);
}

/**
 * Detect email signature from sent messages.
 * Looks for repeated patterns at the end of emails.
 */
export function detectSignature(messages: EmailMessageType[]): string | null {
  if (messages.length < 3) return null;

  // Get the last ~200 chars of each message
  const endings = messages
    .map((m) => m.bodyPreview ?? m.snippet ?? '')
    .filter((content) => content.length > 50)
    .map((content) => content.slice(-200).trim());

  if (endings.length < 3) return null;

  // Find common suffix patterns
  const commonSuffix = findCommonSuffix(endings);

  if (commonSuffix.length > 20 && commonSuffix.length < 500) {
    return commonSuffix.trim();
  }

  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildGlobalContext(sentMessages: UserSentMessage[]): string {
  const parts: string[] = [];
  parts.push(`Analyzing ${sentMessages.length} sent email(s):\n`);

  // Sample up to 10 messages for analysis
  const sampled = sentMessages.slice(0, 10);

  for (const { message, recipientEmails } of sampled) {
    parts.push('---');
    parts.push(`To: ${recipientEmails.join(', ')}`);
    parts.push(`Subject: ${message.subject}`);
    parts.push(`Date: ${message.internalDate.toISOString().split('T')[0]}`);
    parts.push('');
    const content = message.bodyPreview ?? message.snippet ?? '';
    parts.push(content.slice(0, 800) + (content.length > 800 ? '...' : ''));
    parts.push('');
  }

  return parts.join('\n');
}

function buildSingleMessageContext(
  message: EmailMessageType,
  recipientEmails: string[],
): string {
  const parts: string[] = [];
  parts.push(`To: ${recipientEmails.join(', ')}`);
  parts.push(`Subject: ${message.subject}`);
  parts.push(`Date: ${message.internalDate.toISOString()}`);
  parts.push('');
  const content = message.bodyPreview ?? message.snippet ?? '';
  parts.push(content);

  return parts.join('\n');
}

function groupMessagesByDomain(
  sentMessages: UserSentMessage[],
): Record<string, UserSentMessage[]> {
  const byDomain: Record<string, UserSentMessage[]> = {};

  for (const sent of sentMessages) {
    for (const domain of sent.recipientDomains) {
      if (!byDomain[domain]) {
        byDomain[domain] = [];
      }
      byDomain[domain].push(sent);
    }
  }

  return byDomain;
}

async function extractWritingStyleWithAI(
  context: string,
): Promise<ExtractedWritingStyle> {
  const adapter = getDefaultAdapter();

  const prompt = `Analyze these sent emails and extract the user's writing style using the extract_writing_style tool.

${context}`;

  try {
    const stream = chat({
      adapter,
      messages: [{ content: prompt, role: 'user' }],
      model: getModel('classification'),
      systemPrompts: [WRITING_STYLE_SYSTEM_PROMPT],
      tools: [extractWritingStyleTool],
    });

    let result: ExtractedWritingStyle = {
      commonPhrases: [],
      formalityLevel: 0.5,
      vocabularyProfile: {
        contractionUsage: 0.5,
        emojiUsage: 0.1,
        technicalLevel: 0.5,
      },
    };

    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        const toolCall = chunk.toolCall;
        if (toolCall.function.name === 'extract_writing_style') {
          try {
            result = JSON.parse(
              toolCall.function.arguments,
            ) as ExtractedWritingStyle;
          } catch {
            // Arguments may still be streaming
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to extract writing style:', error);
    return {
      commonPhrases: [],
      formalityLevel: 0.5,
      vocabularyProfile: {
        contractionUsage: 0.5,
        emojiUsage: 0.1,
        technicalLevel: 0.5,
      },
    };
  }
}

async function extractContactStyleWithAI(
  domain: string,
  messages: UserSentMessage[],
): Promise<ContactStyleUpdate | null> {
  const adapter = getDefaultAdapter();

  const context = buildGlobalContext(messages);
  const prompt = `Analyze these emails sent to ${domain} and extract the writing style using the extract_contact_style tool.

${context}`;

  try {
    const stream = chat({
      adapter,
      messages: [{ content: prompt, role: 'user' }],
      model: getModel('classification'),
      systemPrompts: [WRITING_STYLE_SYSTEM_PROMPT],
      tools: [extractContactStyleTool],
    });

    let result: ContactStyleUpdate | null = null;

    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        const toolCall = chunk.toolCall;
        if (toolCall.function.name === 'extract_contact_style') {
          try {
            const parsed = JSON.parse(
              toolCall.function.arguments,
            ) as ContactStyleUpdate;
            result = {
              ...parsed,
              contactDomain: domain,
            };
          } catch {
            // Arguments may still be streaming
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`Failed to extract contact style for ${domain}:`, error);
    return null;
  }
}

async function extractFactsWithAI(
  context: string,
  userEmail: string,
): Promise<ExtractedFact[]> {
  const adapter = getDefaultAdapter();

  const prompt = `Analyze these emails from ${userEmail} and extract any facts about the user using the extract_facts tool.

${context}`;

  try {
    const stream = chat({
      adapter,
      messages: [{ content: prompt, role: 'user' }],
      model: getModel('classification'),
      systemPrompts: [FACT_EXTRACTION_SYSTEM_PROMPT],
      tools: [extractFactsTool],
    });

    let facts: ExtractedFact[] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        const toolCall = chunk.toolCall;
        if (toolCall.function.name === 'extract_facts') {
          try {
            const result = JSON.parse(toolCall.function.arguments) as {
              facts: ExtractedFact[];
            };
            facts = result.facts;
          } catch {
            // Arguments may still be streaming
          }
        }
      }
    }

    return facts;
  } catch (error) {
    console.error('Failed to extract facts:', error);
    return [];
  }
}

function findCommonSuffix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0] ?? '';

  let suffix = strings[0] ?? '';

  for (let i = 1; i < strings.length; i++) {
    const current = strings[i] ?? '';
    let j = 0;

    while (
      j < suffix.length &&
      j < current.length &&
      suffix.at(1 + j) === current.at(1 + j)
    ) {
      j++;
    }

    suffix = suffix.slice(-j);
    if (suffix.length === 0) break;
  }

  return suffix;
}
