/**
 * Extract on Sync
 *
 * Integrates AI extraction into the Gmail sync flow:
 * - Keywords extraction for search
 * - Thread/message summaries for context
 * - User profile analysis for writing style
 */

import { eq } from '@seawatts/db';
import { db } from '@seawatts/db/client';
import {
  EmailKeywords,
  EmailMessages,
  EmailThreads,
  UserContactStyle,
  UserMemory,
} from '@seawatts/db/schema';
import { debug } from '@seawatts/logger';

import {
  analyzeNewSentMessage,
  extractKeywordsFromEmail,
  generateMessageSummary,
  generateThreadSummary,
  type ExtractionInput,
  type ExtractionResult,
  type ExtractedFact,
} from '../email-extraction';
import { getThreadWithMessages, getThreadMessages } from '../email-thread';
import {
  getErrorMessage,
  normalizeMessage,
  normalizeThread,
} from '../../utils';

const log = debug('seawatts:gmail:extract');

/**
 * Extract keywords for a thread and store them in the database
 */
export async function extractAndStoreKeywords(
  threadId: string,
): Promise<ExtractionResult | null> {
  try {
    const data = await getThreadWithMessages(threadId);

    if (!data) {
      log('Thread not found for extraction: %s', threadId);
      return null;
    }

    if (data.messages.length === 0) {
      log('No messages found for thread: %s', threadId);
      return null;
    }

    // Use the latest message for extraction (most relevant context)
    const latestMessage = data.messages.at(-1);
    if (!latestMessage) return null;

    const normalized = normalizeMessage(latestMessage);

    // Build extraction input
    const input: ExtractionInput = {
      attachments: normalized.attachmentMeta.map((a, i) => ({
        attachmentId: `${latestMessage.id}_${i}`,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
      })),
      bodyPreview: latestMessage.bodyPreview,
      bundleType: data.thread.bundleType ?? undefined,
      ccEmails: normalized.ccEmails,
      fromEmail: latestMessage.fromEmail,
      fromName: latestMessage.fromName,
      internalDate: latestMessage.internalDate,
      messageId: latestMessage.id,
      snippet: latestMessage.snippet,
      subject: latestMessage.subject,
      threadId: data.thread.id,
      toEmails: latestMessage.toEmails,
    };

    // Extract keywords
    log('Extracting keywords for thread: %s', threadId);
    const result = await extractKeywordsFromEmail(input);

    // Delete existing keywords for this thread
    await db.delete(EmailKeywords).where(eq(EmailKeywords.threadId, threadId));

    // Insert new keywords
    if (result.keywords.length > 0) {
      const keywordRecords = result.keywords.map((kw) => ({
        confidence: kw.confidence,
        keyword: kw.keyword,
        keywordType: kw.keywordType,
        messageId: result.messageId,
        metadata: kw.metadata,
        originalText: kw.originalText,
        threadId: result.threadId,
      }));

      await db.insert(EmailKeywords).values(keywordRecords);
    }

    log(
      'Extracted %d keywords for thread %s in %dms',
      result.keywords.length,
      threadId,
      result.processingTimeMs,
    );

    return result;
  } catch (error) {
    log(
      'Failed to extract keywords for thread %s: %s',
      threadId,
      getErrorMessage(error),
    );
    return null;
  }
}

/**
 * Extract keywords for multiple threads in batch
 */
export async function extractKeywordsForThreads(
  threadIds: string[],
): Promise<Map<string, ExtractionResult>> {
  const results = new Map<string, ExtractionResult>();

  // Process threads in batches to avoid overwhelming the AI API
  const BATCH_SIZE = 5;

  for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
    const batch = threadIds.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((threadId) => extractAndStoreKeywords(threadId)),
    );

    for (let j = 0; j < batch.length; j++) {
      const threadId = batch[j];
      const result = batchResults[j];
      if (threadId && result) {
        results.set(threadId, result);
      }
    }
  }

  return results;
}

/**
 * Update search vector for a thread
 * This is normally handled by the database trigger, but can be called manually
 */
export async function updateSearchVector(threadId: string): Promise<void> {
  // The trigger handles this automatically, but we can force an update
  // by touching the thread record
  await db
    .update(EmailThreads)
    .set({ updatedAt: new Date() })
    .where(eq(EmailThreads.id, threadId));
}

// ============================================================================
// Summary Extraction
// ============================================================================

/**
 * Generate and store AI summary for a thread
 */
export async function extractAndStoreSummary(
  threadId: string,
): Promise<string | null> {
  try {
    const data = await getThreadWithMessages(threadId);

    if (!data) {
      log('Thread not found for summary: %s', threadId);
      return null;
    }

    if (data.messages.length === 0) {
      log('No messages found for thread summary: %s', threadId);
      return null;
    }

    const normalizedThread = normalizeThread(data.thread);

    // Generate thread summary
    log('Generating summary for thread: %s', threadId);
    const result = await generateThreadSummary({
      messages: data.messages.map((m) => normalizeMessage(m)),
      thread: normalizedThread,
    });

    // Update thread with summary
    await db
      .update(EmailThreads)
      .set({
        aiSummary: result.summary,
        aiSummaryUpdatedAt: new Date(),
      })
      .where(eq(EmailThreads.id, threadId));

    log(
      'Generated summary for thread %s in %dms',
      threadId,
      result.processingTimeMs,
    );

    // Also generate summaries for individual messages
    for (const message of data.messages) {
      if (!message.aiSummary) {
        try {
          const msgResult = await generateMessageSummary({
            message: normalizeMessage(message),
            threadSubject: data.thread.subject,
          });

          await db
            .update(EmailMessages)
            .set({ aiSummary: msgResult.summary })
            .where(eq(EmailMessages.id, message.id));
        } catch (error) {
          log(
            'Failed to generate summary for message %s: %s',
            message.id,
            getErrorMessage(error),
          );
        }
      }
    }

    return result.summary;
  } catch (error) {
    log(
      'Failed to generate summary for thread %s: %s',
      threadId,
      getErrorMessage(error),
    );
    return null;
  }
}

// ============================================================================
// User Profile Extraction
// ============================================================================

/**
 * Analyze a user's sent message and update their contact style
 */
export async function extractUserStyleFromMessage(
  userId: string,
  messageId: string,
): Promise<void> {
  try {
    // Get the message (should be marked as isFromUser)
    const message = await db.query.EmailMessages.findFirst({
      where: eq(EmailMessages.id, messageId),
    });

    if (!message || !message.isFromUser) {
      return;
    }

    const normalized = normalizeMessage(message);
    const recipientEmails = [...message.toEmails, ...normalized.ccEmails];
    if (recipientEmails.length === 0) {
      return;
    }

    log('Analyzing sent message %s for user %s', messageId, userId);

    // Analyze the message for writing style
    const styleUpdate = await analyzeNewSentMessage(
      normalized,
      recipientEmails,
    );

    if (!styleUpdate || !styleUpdate.contactDomain) {
      return;
    }

    // Check if we already have a style for this domain
    const existingStyle = await db.query.UserContactStyle.findFirst({
      where: eq(UserContactStyle.contactDomain, styleUpdate.contactDomain),
    });

    if (existingStyle) {
      // Update existing style with averaged values
      const newMessageCount = (existingStyle.messageCount ?? 0) + 1;
      const existingFormality = existingStyle.formalityLevel ?? 0.5;
      const newFormality = styleUpdate.formalityLevel ?? 0.5;

      // Weighted average of formality (more weight to existing)
      const avgFormality =
        (existingFormality * (existingStyle.messageCount ?? 1) + newFormality) /
        newMessageCount;

      await db
        .update(UserContactStyle)
        .set({
          formalityLevel: avgFormality,
          lastMessageAt: new Date(),
          messageCount: newMessageCount,
          typicalGreeting:
            styleUpdate.typicalGreeting ?? existingStyle.typicalGreeting,
          typicalSignoff:
            styleUpdate.typicalSignoff ?? existingStyle.typicalSignoff,
        })
        .where(eq(UserContactStyle.id, existingStyle.id));

      log(
        'Updated contact style for domain %s (formality: %.2f)',
        styleUpdate.contactDomain,
        avgFormality,
      );
    } else {
      // Create new contact style
      await db.insert(UserContactStyle).values({
        commonPhrases: styleUpdate.commonPhrases,
        contactDomain: styleUpdate.contactDomain,
        contactEmail: styleUpdate.contactEmail,
        formalityLevel: styleUpdate.formalityLevel,
        lastMessageAt: new Date(),
        messageCount: 1,
        typicalGreeting: styleUpdate.typicalGreeting,
        typicalSignoff: styleUpdate.typicalSignoff,
        userId,
      });

      log('Created contact style for domain %s', styleUpdate.contactDomain);
    }
  } catch (error) {
    log(
      'Failed to extract user style from message %s: %s',
      messageId,
      getErrorMessage(error),
    );
  }
}

/**
 * Store extracted facts about the user in UserMemory
 */
export async function storeUserFacts(
  userId: string,
  facts: ExtractedFact[],
): Promise<void> {
  if (facts.length === 0) return;

  try {
    const factRecords = facts.map((fact) => ({
      confidence: fact.confidence,
      content: fact.content,
      memoryType: fact.factType,
      source: fact.source,
      userId,
    }));

    await db.insert(UserMemory).values(factRecords);

    log('Stored %d facts for user %s', facts.length, userId);
  } catch (error) {
    log(
      'Failed to store facts for user %s: %s',
      userId,
      getErrorMessage(error),
    );
  }
}

/**
 * Comprehensive extraction for a synced thread
 * Runs keywords, summaries, and user profile extraction
 */
export async function extractAllForThread(
  threadId: string,
  userId: string,
  options: {
    extractKeywords?: boolean;
    extractSummary?: boolean;
    extractUserProfile?: boolean;
  } = {},
): Promise<{
  keywords: ExtractionResult | null;
  summary: string | null;
  userProfileUpdated: boolean;
}> {
  const {
    extractKeywords = true,
    extractSummary = true,
    extractUserProfile = true,
  } = options;

  const result = {
    keywords: null as ExtractionResult | null,
    summary: null as string | null,
    userProfileUpdated: false,
  };

  // Extract keywords
  if (extractKeywords) {
    result.keywords = await extractAndStoreKeywords(threadId);
  }

  // Generate summary
  if (extractSummary) {
    result.summary = await extractAndStoreSummary(threadId);
  }

  // Analyze user's sent messages for style
  if (extractUserProfile) {
    const messages = await getThreadMessages(threadId, true);

    for (const message of messages) {
      await extractUserStyleFromMessage(userId, message.id);
      result.userProfileUpdated = true;
    }
  }

  return result;
}
