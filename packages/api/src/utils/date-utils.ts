/**
 * Date Utilities
 *
 * Shared date parsing and conversion helpers.
 */

/**
 * Parse a date range with optional string dates to Date objects.
 * Used by routers to convert API input to service parameters.
 */
export function parseDateRange(range?: {
  start?: string;
  end?: string;
}): { start?: Date; end?: Date } | undefined {
  if (!range) return undefined;

  return {
    end: range.end ? new Date(range.end) : undefined,
    start: range.start ? new Date(range.start) : undefined,
  };
}

/**
 * Parse Gmail internal date string to Date object.
 * Gmail API returns dates as milliseconds since epoch in string format.
 */
export function parseGmailDate(internalDate?: string | null): Date {
  return new Date(Number.parseInt(internalDate ?? '0', 10));
}
