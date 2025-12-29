/**
 * Email Keyword Extraction Service
 *
 * Extracts searchable keywords and entities from email content using AI.
 * This enables fast, structured search queries without relying on RAG.
 */

import { getDefaultAdapter, getModel } from '@seawatts/ai';
import { chat, toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

import type {
  ExtractedKeyword,
  ExtractionInput,
  ExtractionResult,
  KeywordType,
} from './types';

// ============================================================================
// Extraction Prompts
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are an intelligent email analysis assistant specialized in extracting searchable entities and keywords from emails.

Your job is to identify and extract the following types of information:

1. **People (person)**: Names of individuals mentioned in the email
2. **Companies (company)**: Organization names, brands, businesses
3. **Locations (location)**: Cities, countries, addresses, venues, airports
4. **Topics (topic)**: Main themes and subjects (e.g., "trip", "meeting", "invoice", "project", "birthday")
5. **Temporal (temporal)**: Date and time references (both absolute like "Dec 20" and relative like "next week")
6. **Actions (action)**: Requested actions or tasks (e.g., "review", "approve", "sign", "schedule")
7. **Financial (financial)**: Monetary amounts, currencies, payment references
8. **Products (product)**: Product names, order numbers, tracking numbers, SKUs

EXTRACTION RULES:
- Extract keywords that would help someone search for this email later
- Normalize keywords to lowercase for consistency
- Preserve original text for context
- Assign confidence scores (0.0-1.0) based on how clearly the entity is mentioned
- Include relevant metadata when available (dates, amounts, locations)
- Focus on the most important/searchable entities, not every noun
- For temporal references, try to resolve relative dates if the email date is provided

IMPORTANT:
- Only extract information that is explicitly present in the email
- Do not infer or guess missing information
- Prioritize quality over quantity - extract the most useful search terms`;

// ============================================================================
// Tool Definition
// ============================================================================

const extractKeywordsTool = toolDefinition({
  description: 'Extract searchable keywords and entities from email content',
  inputSchema: z.object({
    keywords: z.array(
      z.object({
        confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
        keyword: z.string().describe('The normalized keyword (lowercase)'),
        keywordType: z
          .enum([
            'person',
            'company',
            'location',
            'topic',
            'temporal',
            'action',
            'attachment',
            'financial',
            'product',
          ])
          .describe('Type of keyword'),
        metadata: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Type-specific metadata'),
        originalText: z
          .string()
          .optional()
          .describe('Original text as it appeared'),
      }),
    ),
  }),
  name: 'extract_keywords' as const,
});

// ============================================================================
// Main Extraction Function
// ============================================================================

export async function extractKeywordsFromEmail(
  input: ExtractionInput,
): Promise<ExtractionResult> {
  const startTime = performance.now();

  // Build the email context for extraction
  const emailContext = buildEmailContext(input);

  // Extract keywords from sender info (high confidence, no AI needed)
  const senderKeywords = extractSenderKeywords(input);

  // Extract keywords from attachments (file names, types)
  const attachmentKeywords = extractAttachmentKeywords(input);

  // Use AI to extract semantic keywords from content
  const aiKeywords = await extractWithAI(emailContext, input.internalDate);

  // Combine and deduplicate keywords
  const allKeywords = deduplicateKeywords([
    ...senderKeywords,
    ...attachmentKeywords,
    ...aiKeywords,
  ]);

  // Build combined search text
  const searchText = buildSearchText(input, allKeywords);

  const processingTimeMs = performance.now() - startTime;

  return {
    keywords: allKeywords,
    messageId: input.messageId,
    processingTimeMs,
    searchText,
    threadId: input.threadId,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildEmailContext(input: ExtractionInput): string {
  const parts: string[] = [];

  parts.push(`Subject: ${input.subject}`);
  parts.push(`From: ${input.fromName ?? input.fromEmail}`);
  parts.push(`To: ${input.toEmails.join(', ')}`);

  if (input.ccEmails.length > 0) {
    parts.push(`CC: ${input.ccEmails.join(', ')}`);
  }

  parts.push(`Date: ${input.internalDate.toISOString()}`);

  if (input.bundleType) {
    parts.push(`Category: ${input.bundleType}`);
  }

  if (input.bodyPreview) {
    parts.push(`\nContent:\n${input.bodyPreview}`);
  } else if (input.snippet) {
    parts.push(`\nSnippet:\n${input.snippet}`);
  }

  if (input.attachments && input.attachments.length > 0) {
    parts.push(
      `\nAttachments:\n${input.attachments.map((a) => `- ${a.filename} (${a.mimeType})`).join('\n')}`,
    );
  }

  return parts.join('\n');
}

function extractSenderKeywords(input: ExtractionInput): ExtractedKeyword[] {
  const keywords: ExtractedKeyword[] = [];

  // Extract sender name as a person
  if (input.fromName) {
    keywords.push({
      confidence: 1.0,
      keyword: input.fromName.toLowerCase(),
      keywordType: 'person',
      originalText: input.fromName,
    });
  }

  // Extract sender domain as potential company
  const domain = input.fromEmail.split('@')[1];
  if (domain && !isCommonEmailDomain(domain)) {
    const companyName = domain.split('.')[0];
    if (companyName) {
      keywords.push({
        confidence: 0.8,
        keyword: companyName.toLowerCase(),
        keywordType: 'company',
        metadata: { domain },
        originalText: domain,
      });
    }
  }

  return keywords;
}

function extractAttachmentKeywords(input: ExtractionInput): ExtractedKeyword[] {
  if (!input.attachments || input.attachments.length === 0) {
    return [];
  }

  return input.attachments.map((attachment) => ({
    confidence: 1.0,
    keyword: attachment.filename.toLowerCase(),
    keywordType: 'attachment' as KeywordType,
    metadata: {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
    },
    originalText: attachment.filename,
  }));
}

async function extractWithAI(
  emailContext: string,
  emailDate: Date,
): Promise<ExtractedKeyword[]> {
  const adapter = getDefaultAdapter();

  const prompt = `Analyze this email and extract searchable keywords using the extract_keywords tool.

Email date: ${emailDate.toISOString()}

${emailContext}

Extract all relevant people, companies, locations, topics, temporal references, actions, financial info, and products.`;

  try {
    const stream = chat({
      adapter,
      messages: [{ content: prompt, role: 'user' }],
      model: getModel('classification'),
      systemPrompts: [EXTRACTION_SYSTEM_PROMPT],
      tools: [extractKeywordsTool],
    });

    let keywords: ExtractedKeyword[] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        const toolCall = chunk.toolCall;
        if (toolCall.function.name === 'extract_keywords') {
          try {
            const result = JSON.parse(toolCall.function.arguments) as {
              keywords: ExtractedKeyword[];
            };
            keywords = result.keywords;
          } catch {
            // Arguments may still be streaming
          }
        }
      }
    }

    return keywords;
  } catch (error) {
    console.error('Failed to extract keywords with AI:', error);
    return [];
  }
}

function deduplicateKeywords(keywords: ExtractedKeyword[]): ExtractedKeyword[] {
  const seen = new Map<string, ExtractedKeyword>();

  for (const kw of keywords) {
    const key = `${kw.keywordType}:${kw.keyword}`;
    const existing = seen.get(key);

    if (!existing || kw.confidence > existing.confidence) {
      seen.set(key, kw);
    }
  }

  return Array.from(seen.values());
}

function buildSearchText(
  input: ExtractionInput,
  keywords: ExtractedKeyword[],
): string {
  const parts: string[] = [];

  // Add subject
  parts.push(input.subject);

  // Add snippet/preview
  if (input.bodyPreview) {
    parts.push(input.bodyPreview);
  } else if (input.snippet) {
    parts.push(input.snippet);
  }

  // Add participant emails
  parts.push(input.fromEmail);
  parts.push(...input.toEmails);

  // Add extracted keywords
  for (const kw of keywords) {
    parts.push(kw.keyword);
    if (kw.originalText && kw.originalText !== kw.keyword) {
      parts.push(kw.originalText);
    }
  }

  return parts.join(' ');
}

function isCommonEmailDomain(domain: string): boolean {
  const commonDomains = new Set([
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'me.com',
    'aol.com',
    'protonmail.com',
    'proton.me',
    'live.com',
    'msn.com',
  ]);

  return commonDomains.has(domain.toLowerCase());
}
