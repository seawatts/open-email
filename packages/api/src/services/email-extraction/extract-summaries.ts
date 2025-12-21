/**
 * Email Summary Extraction Service
 *
 * Generates AI summaries for email threads and individual messages.
 * These summaries enable fast search and context building without reading full content.
 */

import { chat, toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

import { getDefaultAdapter, getModel } from '@seawatts/ai';
import type { EmailMessageType, EmailThreadType } from '@seawatts/db/schema';

// ============================================================================
// Types
// ============================================================================

export interface ThreadSummaryInput {
  thread: EmailThreadType;
  messages: EmailMessageType[];
}

export interface MessageSummaryInput {
  message: EmailMessageType;
  threadSubject: string;
}

export interface ThreadSummaryResult {
  threadId: string;
  summary: string;
  processingTimeMs: number;
}

export interface MessageSummaryResult {
  messageId: string;
  summary: string;
  processingTimeMs: number;
}

// ============================================================================
// Prompts
// ============================================================================

const THREAD_SUMMARY_SYSTEM_PROMPT = `You are an expert at creating concise, searchable email summaries.

Your task is to create a brief 1-2 sentence summary of an email thread that captures:
1. The main topic or purpose of the conversation
2. Key participants or entities involved
3. Any important outcomes, decisions, or action items
4. Relevant dates, amounts, or specifics

RULES:
- Keep summaries under 200 characters when possible
- Focus on what makes this thread searchable and memorable
- Use clear, descriptive language
- Include specific details (names, dates, amounts) when relevant
- Do not use vague descriptions like "discussed various topics"

EXAMPLES:
Good: "Flight confirmation from United: SFO to JFK on Dec 20, 2025. Confirmation #ABC123."
Good: "John requesting approval for $5,000 marketing budget for Q1 campaign."
Bad: "Email about a trip" (too vague)
Bad: "Discussion about work matters" (not searchable)`;

const MESSAGE_SUMMARY_SYSTEM_PROMPT = `You are an expert at creating concise email message summaries.

Your task is to summarize a single email message in 1-2 sentences, capturing:
1. The main point or action of this specific message
2. Any key information introduced in this message
3. Who wrote it and what they're communicating

RULES:
- Keep summaries under 150 characters when possible
- Focus on this message's unique contribution to the thread
- Include specific details when relevant
- Be concise but informative`;

// ============================================================================
// Tool Definitions
// ============================================================================

const generateThreadSummaryTool = toolDefinition({
  description: 'Generate a concise, searchable summary for an email thread',
  inputSchema: z.object({
    summary: z
      .string()
      .max(300)
      .describe('A 1-2 sentence summary of the email thread'),
  }),
  name: 'generate_thread_summary' as const,
});

const generateMessageSummaryTool = toolDefinition({
  description: 'Generate a concise summary for an individual email message',
  inputSchema: z.object({
    summary: z
      .string()
      .max(200)
      .describe('A 1-2 sentence summary of the email message'),
  }),
  name: 'generate_message_summary' as const,
});

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate an AI summary for an email thread.
 * Returns a concise, searchable summary capturing the thread's essence.
 */
export async function generateThreadSummary(
  input: ThreadSummaryInput,
): Promise<ThreadSummaryResult> {
  const startTime = performance.now();
  const { thread, messages } = input;

  // Build context from thread and messages
  const context = buildThreadContext(thread, messages);

  // Generate summary using AI
  const summary = await extractThreadSummaryWithAI(context);

  return {
    processingTimeMs: performance.now() - startTime,
    summary,
    threadId: thread.id,
  };
}

/**
 * Generate an AI summary for an individual email message.
 * Returns a concise summary of what this message contributes.
 */
export async function generateMessageSummary(
  input: MessageSummaryInput,
): Promise<MessageSummaryResult> {
  const startTime = performance.now();
  const { message, threadSubject } = input;

  // Build context for the message
  const context = buildMessageContext(message, threadSubject);

  // Generate summary using AI
  const summary = await extractMessageSummaryWithAI(context);

  return {
    messageId: message.id,
    processingTimeMs: performance.now() - startTime,
    summary,
  };
}

/**
 * Generate summaries for all messages in a thread.
 * Useful for batch processing during sync.
 */
export async function generateAllMessageSummaries(
  thread: EmailThreadType,
  messages: EmailMessageType[],
): Promise<MessageSummaryResult[]> {
  // Process messages in parallel for efficiency
  const results = await Promise.all(
    messages.map((message) =>
      generateMessageSummary({
        message,
        threadSubject: thread.subject,
      }),
    ),
  );

  return results;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildThreadContext(
  thread: EmailThreadType,
  messages: EmailMessageType[],
): string {
  const parts: string[] = [];

  parts.push(`Subject: ${thread.subject}`);
  parts.push(`Participants: ${thread.participantEmails.join(', ')}`);
  parts.push(`Message count: ${thread.messageCount}`);

  if (thread.bundleType) {
    parts.push(`Category: ${thread.bundleType}`);
  }

  parts.push('\n--- Messages ---\n');

  // Include message snippets, ordered by date
  const sortedMessages = [...messages].sort(
    (a, b) => a.internalDate.getTime() - b.internalDate.getTime(),
  );

  for (const msg of sortedMessages) {
    const sender = msg.fromName ?? msg.fromEmail;
    const date = msg.internalDate.toISOString().split('T')[0];
    const content = msg.bodyPreview ?? msg.snippet ?? '';

    parts.push(`[${date}] ${sender}:`);
    // Limit content to avoid token overflow
    parts.push(content.slice(0, 500) + (content.length > 500 ? '...' : ''));
    parts.push('');
  }

  return parts.join('\n');
}

function buildMessageContext(
  message: EmailMessageType,
  threadSubject: string,
): string {
  const parts: string[] = [];

  parts.push(`Thread Subject: ${threadSubject}`);
  parts.push(`Message Subject: ${message.subject}`);
  parts.push(`From: ${message.fromName ?? message.fromEmail}`);
  parts.push(`To: ${message.toEmails.join(', ')}`);
  parts.push(`Date: ${message.internalDate.toISOString()}`);

  if (message.hasAttachments && message.attachmentMeta) {
    const attachments = message.attachmentMeta as Array<{ filename: string }>;
    parts.push(`Attachments: ${attachments.map((a) => a.filename).join(', ')}`);
  }

  parts.push('\nContent:');
  const content = message.bodyPreview ?? message.snippet ?? '';
  // Limit content to avoid token overflow
  parts.push(content.slice(0, 1000) + (content.length > 1000 ? '...' : ''));

  return parts.join('\n');
}

async function extractThreadSummaryWithAI(context: string): Promise<string> {
  const adapter = getDefaultAdapter();

  const prompt = `Analyze this email thread and generate a concise, searchable summary using the generate_thread_summary tool.

${context}`;

  try {
    const stream = chat({
      adapter,
      messages: [{ content: prompt, role: 'user' }],
      model: getModel('classification'),
      systemPrompts: [THREAD_SUMMARY_SYSTEM_PROMPT],
      tools: [generateThreadSummaryTool],
    });

    let summary = '';

    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        const toolCall = chunk.toolCall;
        if (toolCall.function.name === 'generate_thread_summary') {
          try {
            const result = JSON.parse(toolCall.function.arguments) as {
              summary: string;
            };
            summary = result.summary;
          } catch {
            // Arguments may still be streaming
          }
        }
      }
    }

    return summary || 'No summary generated';
  } catch (error) {
    console.error('Failed to generate thread summary:', error);
    // Fallback: Use snippet as summary
    return 'Summary generation failed';
  }
}

async function extractMessageSummaryWithAI(context: string): Promise<string> {
  const adapter = getDefaultAdapter();

  const prompt = `Analyze this email message and generate a concise summary using the generate_message_summary tool.

${context}`;

  try {
    const stream = chat({
      adapter,
      messages: [{ content: prompt, role: 'user' }],
      model: getModel('classification'),
      systemPrompts: [MESSAGE_SUMMARY_SYSTEM_PROMPT],
      tools: [generateMessageSummaryTool],
    });

    let summary = '';

    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        const toolCall = chunk.toolCall;
        if (toolCall.function.name === 'generate_message_summary') {
          try {
            const result = JSON.parse(toolCall.function.arguments) as {
              summary: string;
            };
            summary = result.summary;
          } catch {
            // Arguments may still be streaming
          }
        }
      }
    }

    return summary || 'No summary generated';
  } catch (error) {
    console.error('Failed to generate message summary:', error);
    return 'Summary generation failed';
  }
}
