/**
 * Attachment Extraction Service
 *
 * Uses OpenAI GPT-4o Vision to extract text and keywords from
 * image and PDF attachments.
 */

import OpenAI from 'openai';

import type { AttachmentExtractionResult, ExtractedKeyword } from './types';

// ============================================================================
// OpenAI Client
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI();
  }
  return openaiClient;
}

// ============================================================================
// Supported MIME Types
// ============================================================================

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const SUPPORTED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  // PDFs need to be converted to images first
]);

export function isSupportedAttachmentType(mimeType: string): boolean {
  return (
    SUPPORTED_IMAGE_TYPES.has(mimeType) ||
    SUPPORTED_DOCUMENT_TYPES.has(mimeType)
  );
}

// ============================================================================
// Extraction Prompt
// ============================================================================

const ATTACHMENT_EXTRACTION_PROMPT = `Analyze this document/image and extract all text and key information.

Focus on extracting:
1. **All visible text** - OCR any text you can see
2. **Dates** - Any date references (receipts, invoices, tickets)
3. **Amounts** - Financial figures, quantities, prices
4. **Names** - People, companies, products mentioned
5. **Addresses** - Physical locations, shipping addresses
6. **Reference Numbers** - Order IDs, tracking numbers, confirmation codes, flight numbers
7. **Contact Info** - Phone numbers, emails, websites

Format your response as JSON with:
{
  "extractedText": "Full text extracted from the document",
  "keywords": [
    {
      "keyword": "normalized keyword",
      "keywordType": "person|company|location|topic|temporal|action|financial|product",
      "originalText": "text as it appears",
      "confidence": 0.0-1.0
    }
  ]
}

If you cannot read the document or it's not a supported format, return:
{
  "extractedText": "",
  "keywords": [],
  "error": "Description of the issue"
}`;

// ============================================================================
// Main Extraction Function
// ============================================================================

export async function extractFromAttachment(
  attachmentId: string,
  filename: string,
  mimeType: string,
  base64Data: string,
): Promise<AttachmentExtractionResult> {
  const openai = getOpenAIClient();

  // For PDFs, we'd need to convert to images first
  // For now, we only support direct image processing
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    console.warn(
      `Unsupported attachment type for direct processing: ${mimeType}`,
    );
    return {
      attachmentId,
      extractedText: '',
      filename,
      keywords: [],
    };
  }

  try {
    const response = await openai.chat.completions.create({
      max_tokens: 2000,
      messages: [
        {
          content: [
            { text: ATTACHMENT_EXTRACTION_PROMPT, type: 'text' },
            {
              image_url: {
                detail: 'high',
                url: `data:${mimeType};base64,${base64Data}`,
              },
              type: 'image_url',
            },
          ],
          role: 'user',
        },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        attachmentId,
        extractedText: '',
        filename,
        keywords: [],
      };
    }

    const parsed = JSON.parse(content) as {
      extractedText: string;
      keywords: ExtractedKeyword[];
      error?: string;
    };

    if (parsed.error) {
      console.warn(`Attachment extraction warning: ${parsed.error}`);
    }

    return {
      attachmentId,
      extractedText: parsed.extractedText || '',
      filename,
      keywords: parsed.keywords || [],
    };
  } catch (error) {
    console.error('Failed to extract from attachment:', error);
    return {
      attachmentId,
      extractedText: '',
      filename,
      keywords: [],
    };
  }
}

// ============================================================================
// Batch Processing
// ============================================================================

export async function extractFromAttachments(
  attachments: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    base64Data: string;
  }>,
): Promise<AttachmentExtractionResult[]> {
  // Filter to only supported types
  const supported = attachments.filter((a) =>
    isSupportedAttachmentType(a.mimeType),
  );

  // Process in parallel with a concurrency limit
  const BATCH_SIZE = 3;
  const results: AttachmentExtractionResult[] = [];

  for (let i = 0; i < supported.length; i += BATCH_SIZE) {
    const batch = supported.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((a) =>
        extractFromAttachment(
          a.attachmentId,
          a.filename,
          a.mimeType,
          a.base64Data,
        ),
      ),
    );
    results.push(...batchResults);
  }

  return results;
}
