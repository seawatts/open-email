/**
 * Email Image Proxy
 *
 * Proxies external images through the server for privacy protection.
 * Also serves CID (inline) images from Supabase Storage.
 *
 * Features:
 * - Blocks tracking pixels (1x1 images)
 * - Validates content types
 * - Size limits
 * - Caching headers
 */

import { db } from '@seawatts/db/client';
import type { EmailAttachmentMeta } from '@seawatts/db/schema';
import { EmailMessages } from '@seawatts/db/schema';
import { STORAGE_BUCKETS } from '@seawatts/db/supabase/storage';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

import { env } from '~/env';

// Maximum image size (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Allowed image content types
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

// Cache duration (1 hour)
const CACHE_MAX_AGE = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  const cid = searchParams.get('cid');
  const messageId = searchParams.get('messageId');
  const accountId = searchParams.get('accountId');

  // Handle CID images (inline images from storage)
  if (cid && messageId && accountId) {
    return handleCidImage(accountId, messageId, cid);
  }

  // Handle external image proxy
  if (url) {
    return handleExternalImage(url);
  }

  return NextResponse.json(
    {
      error:
        'Missing required parameters. Provide either "url" or "cid" with "messageId" and "accountId"',
    },
    { status: 400 },
  );
}

/**
 * Get Supabase client for storage operations
 */
function getStorageClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Prefer service role key for backend operations, fall back to anon key
  const key = serviceRoleKey || anonKey;

  return createClient(supabaseUrl, key);
}

/**
 * Handle CID images from Supabase Storage
 */
async function handleCidImage(
  _accountId: string,
  messageId: string,
  cid: string,
): Promise<NextResponse> {
  try {
    console.log(`[CID Image] Looking up: cid=${cid}, messageId=${messageId}`);

    // 1. Query the database for the message (messageId is our internal ID, not gmailMessageId)
    const message = await db.query.EmailMessages.findFirst({
      where: eq(EmailMessages.id, messageId),
    });

    if (!message) {
      console.log(`[CID Image] Message not found: ${messageId}`);
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // 2. Find the attachment with matching CID
    const attachments = (message.attachmentMeta as EmailAttachmentMeta[]) || [];

    // CID can be with or without angle brackets
    const cleanCid = cid.replace(/^<|>$/g, '');

    const attachment = attachments.find((att) => {
      const attCid = att.cid?.replace(/^<|>$/g, '');
      return attCid === cleanCid;
    });

    if (!attachment) {
      console.log(`[CID Image] Attachment not found for CID: ${cid}`);
      console.log(
        '[CID Image] Available CIDs:',
        attachments.map((a) => a.cid),
      );
      return NextResponse.json(
        { error: 'Attachment not found for CID' },
        { status: 404 },
      );
    }

    if (!attachment.storagePath) {
      console.log(
        `[CID Image] No storage path for attachment: ${attachment.filename}`,
      );
      return NextResponse.json(
        { error: 'Attachment not stored' },
        { status: 404 },
      );
    }

    // 3. Generate a signed URL instead of downloading
    const client = getStorageClient();
    const { data, error } = await client.storage
      .from(STORAGE_BUCKETS.EMAIL_ATTACHMENTS)
      .createSignedUrl(attachment.storagePath, CACHE_MAX_AGE);

    if (error || !data?.signedUrl) {
      console.error('[CID Image] Signed URL error:', error);
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 },
      );
    }

    console.log(
      `[CID Image] Redirecting to signed URL for: ${attachment.filename}`,
    );

    // Redirect to the signed URL - browser fetches directly from Supabase
    return NextResponse.redirect(data.signedUrl, {
      status: 302, // Temporary redirect (URL expires)
    });
  } catch (error) {
    console.error('Error fetching CID image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CID image' },
      { status: 500 },
    );
  }
}

/**
 * Proxy external images
 */
async function handleExternalImage(imageUrl: string): Promise<NextResponse> {
  try {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Invalid protocol. Only HTTP/HTTPS allowed' },
        { status: 400 },
      );
    }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(imageUrl, {
      headers: {
        // Don't send referer to protect privacy
        Referer: '',
        // Identify as a browser
        'User-Agent': 'Mozilla/5.0 (compatible; EmailImageProxy/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status },
      );
    }

    // Check content type
    const contentType = response.headers.get('content-type')?.split(';')[0];
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Only images allowed' },
        { status: 415 },
      );
    }

    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    // Read the image data
    const imageBuffer = await response.arrayBuffer();

    // Check actual size
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    // Block tracking pixels (1x1 images)
    if (isTrackingPixel(imageBuffer, contentType)) {
      // Return a transparent 1x1 pixel instead
      return new NextResponse(TRANSPARENT_PIXEL, {
        headers: {
          'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
          'Content-Type': 'image/gif',
          'X-Tracking-Blocked': 'true',
        },
      });
    }

    // Return the proxied image
    return new NextResponse(imageBuffer, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }

    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 },
    );
  }
}

/**
 * Check if an image is likely a tracking pixel
 */
function isTrackingPixel(buffer: ArrayBuffer, contentType: string): boolean {
  const bytes = new Uint8Array(buffer);

  // Very small images are likely tracking pixels
  if (bytes.length < 100) {
    return true;
  }

  // Check for 1x1 GIF
  // GIF header: GIF89a or GIF87a
  if (
    contentType === 'image/gif' &&
    bytes.length < 100 &&
    bytes[0] === 0x47 && // G
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 // F
  ) {
    // Width is at bytes 6-7 (little endian), height at 8-9
    const width = (bytes[6] ?? 0) | ((bytes[7] ?? 0) << 8);
    const height = (bytes[8] ?? 0) | ((bytes[9] ?? 0) << 8);
    if (width === 1 && height === 1) {
      return true;
    }
  }

  // Check for 1x1 PNG
  // PNG header: 89 50 4E 47 0D 0A 1A 0A
  if (
    contentType === 'image/png' &&
    bytes.length < 200 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 && // P
    bytes[2] === 0x4e && // N
    bytes[3] === 0x47 // G
  ) {
    // IHDR chunk starts at byte 8, width at 16-19, height at 20-23 (big endian)
    const width =
      ((bytes[16] ?? 0) << 24) |
      ((bytes[17] ?? 0) << 16) |
      ((bytes[18] ?? 0) << 8) |
      (bytes[19] ?? 0);
    const height =
      ((bytes[20] ?? 0) << 24) |
      ((bytes[21] ?? 0) << 16) |
      ((bytes[22] ?? 0) << 8) |
      (bytes[23] ?? 0);
    if (width === 1 && height === 1) {
      return true;
    }
  }

  return false;
}

// Transparent 1x1 GIF pixel
const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);
