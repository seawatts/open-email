/**
 * Email Storage Service
 *
 * Handles uploading/downloading email attachments to/from Supabase Storage.
 * Email bodies are stored directly in the database.
 */

import {
  getEmailAttachmentPath,
  MAX_FILE_SIZES,
  SIGNED_URL_EXPIRY_SECONDS,
  STORAGE_BUCKETS,
} from '@seawatts/db/supabase/storage';
import { createId } from '@seawatts/id';
import { debug } from '@seawatts/logger';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const log = debug('seawatts:storage:email');

/**
 * Get Supabase client with service role key for storage operations
 */
function getStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  // Prefer service role key for backend operations, fall back to anon key
  const key = serviceRoleKey || anonKey;
  if (!key) {
    throw new Error(
      'Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set',
    );
  }

  return createSupabaseClient(supabaseUrl, key);
}

export interface UploadAttachmentResult {
  id: string;
  storagePath: string;
}

/**
 * Upload an email attachment to Supabase Storage
 */
export async function uploadAttachment(
  accountId: string,
  messageId: string,
  attachment: {
    content: Buffer;
    filename: string;
    mimeType: string;
  },
): Promise<UploadAttachmentResult | null> {
  const client = getStorageClient();

  // Check file size
  if (attachment.content.length > MAX_FILE_SIZES.ATTACHMENT) {
    log(
      'Attachment %s too large (%d bytes), skipping',
      attachment.filename,
      attachment.content.length,
    );
    return null;
  }

  const attachmentId = createId({ prefix: 'att' });
  const storagePath = getEmailAttachmentPath(
    accountId,
    messageId,
    attachmentId,
    attachment.filename,
  );

  const { error } = await client.storage
    .from(STORAGE_BUCKETS.EMAIL_ATTACHMENTS)
    .upload(storagePath, attachment.content, {
      contentType: attachment.mimeType,
      upsert: true,
    });

  if (error) {
    log(
      'Failed to upload attachment %s for %s: %s',
      attachment.filename,
      messageId,
      error.message,
    );
    return null;
  }

  return {
    id: attachmentId,
    storagePath,
  };
}

/**
 * Get a signed URL for downloading an attachment
 */
export async function getAttachmentUrl(
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
): Promise<string | null> {
  const client = getStorageClient();

  const { data, error } = await client.storage
    .from(STORAGE_BUCKETS.EMAIL_ATTACHMENTS)
    .createSignedUrl(path, expiresIn);

  if (error) {
    log('Failed to get signed URL for attachment %s: %s', path, error.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Download attachment content from storage
 */
export async function downloadAttachment(path: string): Promise<Buffer | null> {
  const client = getStorageClient();

  const { data, error } = await client.storage
    .from(STORAGE_BUCKETS.EMAIL_ATTACHMENTS)
    .download(path);

  if (error) {
    log('Failed to download attachment %s: %s', path, error.message);
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

/**
 * Delete attachment storage content for an email message
 */
export async function deleteEmailContent(
  accountId: string,
  messageId: string,
): Promise<void> {
  const client = getStorageClient();
  const basePath = `${accountId}/${messageId}`;

  const { data: attachmentList, error: listError } = await client.storage
    .from(STORAGE_BUCKETS.EMAIL_ATTACHMENTS)
    .list(basePath);

  if (listError) {
    log('Failed to list attachments for %s: %s', messageId, listError.message);
    return;
  }

  if (attachmentList && attachmentList.length > 0) {
    const attachmentPaths = attachmentList.map(
      (file) => `${basePath}/${file.name}`,
    );
    const { error: attachError } = await client.storage
      .from(STORAGE_BUCKETS.EMAIL_ATTACHMENTS)
      .remove(attachmentPaths);

    if (attachError) {
      log(
        'Failed to delete attachments for %s: %s',
        messageId,
        attachError.message,
      );
    }
  }

  log('Deleted attachment storage for message %s', messageId);
}

/**
 * Check if storage buckets exist (for health checks)
 */
export async function checkStorageHealth(): Promise<{
  attachmentsBucket: boolean;
}> {
  const client = getStorageClient();

  const attachmentsResult = await client.storage
    .from(STORAGE_BUCKETS.EMAIL_ATTACHMENTS)
    .list('', { limit: 1 });

  return {
    attachmentsBucket: !attachmentsResult.error,
  };
}
