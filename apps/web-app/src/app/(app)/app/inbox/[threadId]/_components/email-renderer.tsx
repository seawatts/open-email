'use client';

import { useTRPC } from '@seawatts/api/react';
import { Button } from '@seawatts/ui/button';
import { Text } from '@seawatts/ui/custom/typography';
import { cn } from '@seawatts/ui/lib/utils';
import { Skeleton } from '@seawatts/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'isomorphic-dompurify';
import { Download, FileIcon, ImageIcon, Paperclip } from 'lucide-react';
import { useMemo, useState } from 'react';

interface EmailRendererProps {
  /** Account ID for CID image proxying */
  accountId?: string;
  /** CSS class name */
  className?: string;
  /** Fallback plain text content */
  fallbackText?: string | null;
  /** Message ID to fetch content for */
  messageId: string;
  /** Maximum height before showing expand button */
  maxHeight?: number;
}

/**
 * Renders email HTML content safely with DOMPurify sanitization
 * and image proxying for privacy protection.
 */
export function EmailRenderer({
  accountId,
  className,
  fallbackText,
  maxHeight = 500,
  messageId,
}: EmailRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const trpc = useTRPC();

  // Fetch email body content
  const { data: bodyData, isLoading: isLoadingBody } = useQuery(
    trpc.email.content.getBody.queryOptions({
      messageId,
      preferHtml: true,
    }),
  );

  // Fetch attachments
  const { data: attachments, isLoading: isLoadingAttachments } = useQuery(
    trpc.email.content.getAttachments.queryOptions({
      messageId,
    }),
  );

  // Sanitize and process HTML content
  const sanitizedHtml = useMemo(() => {
    if (!bodyData?.content || bodyData.contentType !== 'text/html') {
      return null;
    }

    // Configure DOMPurify
    const config = {
      ADD_ATTR: ['target', 'rel'],
      ADD_TAGS: ['style'],
      ALLOW_DATA_ATTR: false,
      FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
      RETURN_TRUSTED_TYPE: false,
    };

    // Sanitize HTML (returns string when RETURN_TRUSTED_TYPE is false)
    let html = DOMPurify.sanitize(bodyData.content, config) as string;

    // Rewrite external image URLs to use proxy
    html = rewriteImageUrls(html, accountId, messageId);

    // Rewrite links to open in new tab
    html = rewriteLinks(html);

    // Add email-specific styles
    html = wrapWithStyles(html);

    return html;
  }, [bodyData, accountId, messageId]);

  // Show loading state
  if (isLoadingBody) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  // Show plain text fallback if no HTML
  if (!sanitizedHtml) {
    return (
      <div className={cn('space-y-4', className)}>
        <Text className="whitespace-pre-wrap text-sm">
          {bodyData?.content || fallbackText || 'No content available'}
        </Text>
        {attachments && attachments.length > 0 && (
          <AttachmentList
            attachments={attachments}
            isLoading={isLoadingAttachments}
          />
        )}
      </div>
    );
  }

  // Render HTML content
  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'email-content relative overflow-hidden rounded-md border bg-background p-4',
          !isExpanded && maxHeight && `max-h-[${maxHeight}px]`,
        )}
        style={!isExpanded ? { maxHeight } : undefined}
      >
        <div
          className="email-body"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />

        {/* Expand overlay */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 flex h-24 items-end justify-center bg-gradient-to-t from-background to-transparent pb-4">
            <Button
              onClick={() => setIsExpanded(true)}
              size="sm"
              variant="secondary"
            >
              Show more
            </Button>
          </div>
        )}
      </div>

      {isExpanded && (
        <Button
          className="w-full"
          onClick={() => setIsExpanded(false)}
          size="sm"
          variant="ghost"
        >
          Show less
        </Button>
      )}

      {attachments && attachments.length > 0 && (
        <AttachmentList
          attachments={attachments}
          isLoading={isLoadingAttachments}
        />
      )}
    </div>
  );
}

/**
 * Attachment list component
 */
interface AttachmentListProps {
  attachments: Array<{
    filename: string;
    id: string | null;
    mimeType: string;
    size: number;
    url: string | null;
  }>;
  isLoading: boolean;
}

function AttachmentList({ attachments, isLoading }: AttachmentListProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Paperclip className="size-4" />
        <span>
          {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment, index) => (
          <AttachmentItem
            attachment={attachment}
            key={attachment.id || `attachment-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual attachment item
 */
function AttachmentItem({
  attachment,
}: {
  attachment: {
    filename: string;
    mimeType: string;
    size: number;
    url: string | null;
  };
}) {
  const isImage = attachment.mimeType.startsWith('image/');
  const Icon = isImage ? ImageIcon : FileIcon;

  return (
    <a
      className={cn(
        'flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm transition-colors',
        attachment.url
          ? 'hover:bg-muted cursor-pointer'
          : 'opacity-50 cursor-not-allowed',
      )}
      download={attachment.filename}
      href={attachment.url || undefined}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="max-w-[150px] truncate">{attachment.filename}</span>
      <span className="text-xs text-muted-foreground">
        {formatFileSize(attachment.size)}
      </span>
      {attachment.url && <Download className="size-3 text-muted-foreground" />}
    </a>
  );
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * Rewrite image URLs to use the proxy
 */
function rewriteImageUrls(
  html: string,
  accountId?: string,
  messageId?: string,
): string {
  // Match src attributes in img tags
  return html.replace(
    /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      // Handle CID images (inline images)
      if (src.startsWith('cid:')) {
        const cid = src.substring(4);
        if (accountId && messageId) {
          const proxyUrl = `/api/email-image?cid=${encodeURIComponent(cid)}&messageId=${encodeURIComponent(messageId)}&accountId=${encodeURIComponent(accountId)}`;
          return `<img${before} src="${proxyUrl}"${after}>`;
        }
        // Can't proxy CID without account/message info
        return match;
      }

      // Handle data URIs (keep as-is, they're already embedded)
      if (src.startsWith('data:')) {
        return match;
      }

      // Proxy external images
      if (src.startsWith('http://') || src.startsWith('https://')) {
        const proxyUrl = `/api/email-image?url=${encodeURIComponent(src)}`;
        return `<img${before} src="${proxyUrl}"${after}>`;
      }

      // Keep other URLs as-is (relative URLs, etc.)
      return match;
    },
  );
}

/**
 * Rewrite links to open in new tab and add security attributes
 */
function rewriteLinks(html: string): string {
  return html.replace(
    /<a([^>]*)\shref=["']([^"']+)["']([^>]*)>/gi,
    (match, before, href, after) => {
      // Skip anchor links and javascript
      if (href.startsWith('#') || href.startsWith('javascript:')) {
        return match;
      }

      // Add target and rel attributes
      const hasTarget = /target=/i.test(match);
      const hasRel = /rel=/i.test(match);

      let newTag = `<a${before} href="${href}"${after}`;

      if (!hasTarget) {
        newTag = newTag.replace(/<a/, '<a target="_blank"');
      }

      if (!hasRel) {
        newTag = newTag.replace(/<a/, '<a rel="noopener noreferrer"');
      }

      return `${newTag}>`;
    },
  );
}

/**
 * Wrap HTML with email-specific styles
 */
function wrapWithStyles(html: string): string {
  const styles = `
    <style>
      .email-body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: inherit;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      .email-body img {
        max-width: 100%;
        height: auto;
      }
      .email-body a {
        color: hsl(var(--primary));
        text-decoration: underline;
      }
      .email-body a:hover {
        text-decoration: none;
      }
      .email-body table {
        border-collapse: collapse;
        max-width: 100%;
      }
      .email-body blockquote {
        border-left: 3px solid hsl(var(--border));
        margin: 0.5em 0;
        padding-left: 1em;
        color: hsl(var(--muted-foreground));
      }
      .email-body pre {
        background: hsl(var(--muted));
        padding: 0.5em;
        border-radius: 4px;
        overflow-x: auto;
      }
      .email-body code {
        background: hsl(var(--muted));
        padding: 0.1em 0.3em;
        border-radius: 3px;
        font-size: 0.9em;
      }
      /* Override email-specific styles that might conflict */
      .email-body * {
        max-width: 100% !important;
        box-sizing: border-box;
      }
      .email-body body, .email-body html {
        margin: 0;
        padding: 0;
        background: transparent !important;
      }
    </style>
  `;

  return styles + html;
}
